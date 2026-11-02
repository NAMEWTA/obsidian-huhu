import { t } from '../../../shared/i18n';
import { deviceId as getDeviceId } from '../../../host/obsidian/storage/device-id';
import { privateVaultStorage } from '../../../host/obsidian/storage/private-storage';
import { AGENT_CATALOG, getAgent } from '../core/launch/catalog';
import { launchArgs, needsYoloConfirmation } from '../core/launch/flags';
import type { AgentId, AgentSettings } from '../core/launch/types';
import { AutomationHooks, type NativeHookEvent } from '../platform/desktop/hooks/automation-hooks';
import { accountEnv, restoredAccountReference } from '../platform/desktop/agents/accounts';
import { resolveCli } from '../platform/desktop/agents/resolver';
import { runtimeProcess } from '../platform/desktop/agents/runtime-process';
import { canonicalVaultCwd, realPathOr } from '../platform/desktop/history/canonical-cwd';
import { checkAccountTranscript } from '../platform/desktop/agents/transcript';
import { accountArgs } from '../platform/desktop/agents/account-args';
import { isCwdInsideVault } from '../platform/desktop/history/scope';
import { AutomationError } from '../../../shared/automation/errors';
import { validatedExtraArgs } from '../../../shared/automation/extra-args';
import type {
	AgentRunHandle,
	AgentRuntimePort,
	AgentSessionRef,
	AutomationAction,
	AutomationRun,
} from '../../../shared/automation/types';
import { JsonStore } from '../../../shared/json-store';
import { threeWayMerge } from '../../../shared/storage/three-way-merge';
import { storageWriteQueue, type WriteQueue } from '../../../shared/storage/write-queue';
import type { App } from 'obsidian';
import type { NativeHistory } from '../platform/history/service';
import { SpaceError } from '../core/space/errors';
import type { ManagedRuntimeRef } from '../core/workspace/managed-runtime';
import type { ShellCommand } from '../platform/desktop/pty/shells';
import type { TerminalSession } from './terminal/session';
import type { CreateSession } from './terminal/sessions';

/** Shared execution metadata; consumers never construct an AutomationRun. */
export interface AgentExecution {
	id: string;
	title: string;
	kind: 'automation' | 'prompt';
	reveal?: boolean;
	signal?: AbortSignal;
	resolveContext?: (cwd: string) => Promise<Readonly<Record<string, string>>>;
	onTerminal?: (terminalId: string) => void;
	onPrepared?: (identity: { agentId: AgentId; accountIdentity: string }) => void;
	onState?: (status: 'running' | 'needs-attention', terminalId: string) => void;
}

/**
 * A business launch admitted into one explicit Space: the Session is already saved, `runtime` is reserved, and
 * `beforeSpawn` re-checks the Space immediately before the native spawn. Settling it is the caller's duty.
 */
export interface BusinessAdmission {
	/** The Space-authorized directory the run may use. */
	readonly cwd: string;
	readonly runtime: ManagedRuntimeRef;
	readonly beforeSpawn: () => Promise<void>;
	/** Record the outcome of `create`: a failed or lost connection marks the reserved runtime accordingly. */
	created(session: TerminalSession): void;
	/** Nothing (more) started: mark the reserved runtime cancelled or failed. */
	abandon(cause?: unknown): void;
}
export interface BusinessAdmissionRequest {
	spaceId: string;
	kind: 'shell' | 'agent';
	title: string;
	agentId?: AgentId;
	accountId?: string;
}

/** What the automation runtime needs from the agent module. */
export interface AutomationRuntimeHost {
	app: App;
	/**
	 * Space access for business runs. Every run names one Space; a missing, archived, deleted or unauthorized
	 * Space is refused before anything starts. Nothing here ever chooses a Space on the caller's behalf.
	 */
	spaces: {
		/** Read-only: the directory the Space currently authorizes. Rejects with a `SpaceError` when unavailable. */
		cwd(spaceId: string): Promise<string>;
		admit(request: BusinessAdmissionRequest, signal?: AbortSignal): Promise<BusinessAdmission>;
	};
	/** Plugin folder as given in the manifest (vault-relative or absolute). */
	pluginDir: string;
	agentSettings(): AgentSettings;
	history(): NativeHistory;
	create(request: CreateSession): Promise<TerminalSession>;
	remove(id: string): void;
	open(id: string): Promise<void>;
	shell(kind: 'bash' | 'powershell'): ShellCommand;
	/**
	 * Machine-wide claim on one native conversation, taken before a `specific` session resume spawns. Rejects
	 * when another runtime (here, in another instance or in another Vault) holds it. Release only after the
	 * process has verifiably exited or never started.
	 */
	/** The transcript of a native session from the current Vault projection, when a definition never stored one. */
	transcriptFor?(request: {
		agentId: AgentId;
		nativeSessionId: string;
		accountKey: string;
	}): Promise<string | undefined>;
	nativeLease?(request: {
		agentId: AgentId;
		nativeSessionId: string;
		transcriptPath: string;
		owner: string;
		spaceId?: string;
	}): Promise<{ release(): Promise<void> }>;
}

// Orca's native resume capability set, pinned to 27b823f (MIT, Lovecast Inc.).
export const RESUME_FLAGS: Readonly<Record<AgentId, readonly string[]>> = {
	'claude-code': ['--resume'],
	codex: ['resume'],
	gemini: ['--resume'],
	opencode: ['--session'],
	pi: ['--session'],
	grok: ['--resume'],
};
export function automationArgs(agentId: AgentId, prompt: string, base: string[], session?: AgentSessionRef): string[] {
	const agent = getAgent(agentId);
	const args = [...base];
	if (session) {
		// Pi resumes from its transcript file; every other CLI from the session id.
		const locator = agentId === 'pi' ? session.transcriptPath : session.sessionId;
		if (!locator) throw new AutomationError('sessionMissing');
		args.push(...RESUME_FLAGS[agentId], locator);
	}
	if (agent.promptFlag) args.push(agent.promptFlag, prompt);
	else {
		if (agent.promptSeparator) args.push('--');
		args.push(prompt);
	}
	return args;
}
type AgentAction = Extract<AutomationAction, { kind: 'agent' }>;
/**
 * A `specific` session resume takes the same machine-wide claim as every other native resume before it spawns.
 * Another holder (this window, another instance or another Vault) makes the run `busy`; it is never forked.
 */
export async function claimNativeConversation(
	host: Pick<AutomationRuntimeHost, 'nativeLease' | 'transcriptFor'>,
	agentId: AgentId,
	action: AgentAction,
	runId: string,
	restoredTranscript?: string,
): Promise<{ release(): Promise<void> } | undefined> {
	if (action.sessionMode !== 'specific' || !host.nativeLease) return undefined;
	if (!action.session) throw new AutomationError('sessionMissing');
	let transcript = restoredTranscript ?? action.session.transcriptPath;
	// Older definitions saved no transcript: find it in the Vault projection, or fail explicitly.
	if (!transcript && host.transcriptFor)
		transcript = await host
			.transcriptFor({
				agentId,
				nativeSessionId: action.session.sessionId,
				accountKey: action.session.accountKey ?? '{}',
			})
			.catch(() => undefined);
	if (!transcript) throw new AutomationError('sessionMissing');
	try {
		return await host.nativeLease({
			agentId,
			nativeSessionId: action.session.sessionId,
			transcriptPath: transcript,
			owner: `automation-${runId}`,
			spaceId: action.spaceId,
		});
	} catch {
		throw new AutomationError('busy');
	}
}
type RunResult = Awaited<AgentRunHandle['completion']>;
interface LiveSession {
	execution?: AgentExecution;
	listeners?: Set<() => void>;
	terminal?: TerminalSession;
	action: AgentAction;
	accountKey: string;
	busy: boolean;
	started: boolean;
	since: number;
	output: string;
	session?: AgentSessionRef;
	finish?: (result: RunResult) => void;
	hookClose?: () => void | Promise<void>;
}
function accountIdentity(key: string): string {
	const value = JSON.parse(key) as Record<string, string>;
	return JSON.stringify(
		Object.keys(value)
			.sort()
			.map((name) => [name, value[name]]),
	);
}
/** A Space the user must (re)select is a configuration problem; anything else is a failed record write. */
export function spaceFailure(error: unknown): unknown {
	if (!(error instanceof SpaceError)) return error;
	return new AutomationError(
		[
			'TARGET_REQUIRED',
			'TARGET_AMBIGUOUS',
			'TARGET_NOT_FOUND',
			'DIRECTORY_NOT_AUTHORIZED',
			'SOURCE_UNAVAILABLE',
		].includes(error.code)
			? 'spaceUnavailable'
			: 'spaceSaveFailed',
	);
}
/**
 * Where a Space-bound run starts. No directory chosen, or the whole-vault default, means the Space's own
 * directory; a narrower directory must lie inside the Space. Anything else is refused, never moved.
 */
export function spaceBoundCwd(
	spaceCwd: string,
	requested: string,
	vaultRoot: string,
	platform: NodeJS.Platform,
): string | undefined {
	if (!requested) return spaceCwd;
	if (isCwdInsideVault(spaceCwd, requested, platform)) return requested;
	const sameRoot =
		isCwdInsideVault(requested, vaultRoot, platform) && isCwdInsideVault(vaultRoot, requested, platform);
	return sameRoot ? spaceCwd : undefined;
}
/** A Windows vault root: a UNC share (`\\server\share`) or a drive (`C:`). Its separator is always a backslash. */
const WINDOWS_ROOT = /^(?:[\\/]{2}[^\\/]+[\\/][^\\/]+|[A-Za-z]:)(?=[\\/]|$)/;
/** A saved directory: absolute as is, otherwise relative to the vault, with `.` and `..` folded (the Space check decides). */
export function resolveRequestedCwd(vault: string | undefined, cwd: string): string {
	if (!vault || /^(?:[A-Za-z]:)?[\\/]/.test(cwd)) return cwd;
	const windows = WINDOWS_ROOT.exec(vault)?.[0];
	const prefix = windows?.replace(/\//g, '\\') ?? '';
	const out: string[] = [];
	for (const part of `${vault.slice(windows?.length ?? 0)}/${cwd}`.split(/[\\/]/)) {
		if (part === '..') out.pop();
		else if (part !== '.' && part !== '') out.push(part);
	}
	if (windows) return `${prefix}\\${out.join('\\')}`;
	return (/^[\\/]/.test(vault) ? '/' : '') + out.join('/');
}
/** A business run is observed by its automation hooks, never by a managed activity source. */
function markBusinessActivity(session: Pick<TerminalSession, 'invalidateActivity'>): void {
	session.invalidateActivity?.('unsupported');
}
const vaultPath = (app: App): string => (app.vault.adapter as unknown as { getBasePath(): string }).getBasePath();

export class TerminalAutomationRuntime implements AgentRuntimePort {
	private readonly reservations = new Set<string>();
	private disposed = false;
	private disposing?: Promise<void>;
	private hookSettlements = new Set<Promise<void>>();
	private hookPreparing = new Set<Promise<unknown>>();
	private hookFailures: unknown[] = [];
	private closeSlotHooks(slot: LiveSession): void {
		const close = slot.hookClose;
		slot.hookClose = undefined;
		if (!close) return;
		let pending: Promise<void>;
		try {
			pending = Promise.resolve(close());
		} catch (error) {
			pending = Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		const settled = pending
			.catch((error: unknown) => {
				if (this.hookFailures.length < 32) this.hookFailures.push(error);
			})
			.finally(() => this.hookSettlements.delete(settled));
		this.hookSettlements.add(settled);
	}

	private live = new Map<string, LiveSession>();
	private hooks: AutomationHooks;
	private registry: AgentSessionRef[] = [];
	private readonly registryQueue: WriteQueue;
	private readonly registryQueueKey: string;
	private readonly pendingRegistry = new Map<string, AgentSessionRef>();
	private store: JsonStore<AgentSessionRef[]>;
	private readonly openStore: () => JsonStore<AgentSessionRef[]>;
	private registryClosed = false;
	private loaded: Promise<void>;
	constructor(private host: AutomationRuntimeHost) {
		this.hooks = new AutomationHooks(
			host.app.workspace.containerEl.win,
			() => ({ vault: vaultPath(host.app), device: getDeviceId(host.app) }),
			{ strict: true },
		);
		const device = getDeviceId(host.app);
		const storage = privateVaultStorage(host.app);
		const path = `.huhu/terminal-agent/${device}/automation-sessions.json`;
		this.registryQueue = storageWriteQueue(storage);
		this.registryQueueKey = 'automation-registry:' + path;
		this.openStore = () =>
			new JsonStore(
				storage,
				path,
				(v): v is AgentSessionRef[] =>
					Array.isArray(v) &&
					v.every(
						(item: unknown) =>
							!!item && typeof item === 'object' && typeof (item as AgentSessionRef).sessionId === 'string',
					),
				(base, local, remote) => {
					const keyed = (rows: AgentSessionRef[]) =>
						Object.fromEntries(rows.map((row) => [this.registryKey(row), row]));
					return Object.values(threeWayMerge(keyed(base), keyed(local), keyed(remote)));
				},
			);
		this.store = this.openStore();
		this.loaded = this.registryQueue.run(this.registryQueueKey, () =>
			this.store.load([]).then((rows) => {
				this.registry = rows;
			}),
		);
	}
	listAgents() {
		const settings = this.host.agentSettings();
		return AGENT_CATALOG.map((a) => ({
			id: a.id,
			title: a.title,
			enabled: settings.agents[a.id]?.enabled ?? false,
			installed: !!resolveCli(a.detectCommand, settings.agents[a.id]?.cliPath ?? '', ''),
		}));
	}
	async listSessions(cwd: string): Promise<AgentSessionRef[]> {
		await this.loaded;
		const canonical = await canonicalVaultCwd(vaultPath(this.host.app), cwd);
		const history = this.host.history();
		await history.scan();
		const result: AgentSessionRef[] = [];
		for (let offset = 0; ; offset += 100) {
			const page = await history.query('', offset);
			result.push(...page.rows.filter((s) => isCwdInsideVault(canonical, s.cwd, runtimeProcess().platform)));
			if (offset + 100 >= page.total) break;
		}
		return result;
	}

	private receive(slot: LiveSession, event: NativeHookEvent): void {
		if (this.disposed) return;
		if (event.at < slot.since || event.data.agent_id || event.data.subagent_id || event.data.parent_session_id)
			return;
		if (event.event === 'HookError') {
			slot.finish?.({
				status: 'failed',
				message: '',
				errorCode:
					typeof event.data.huhu_answer_error === 'string'
						? event.data.huhu_answer_error
						: 'hookInputInvalid',
			});
			slot.finish = undefined;
			return;
		}
		const id = event.data.session_id ?? event.data.sessionId;
		if (typeof id === 'string' && id) {
			slot.session = {
				agentId: slot.action.agentId,
				sessionId: id,
				cwd: slot.action.cwd,
				title: slot.action.prompt.slice(0, 100),
				modifiedAtMs: event.at,
				accountKey: slot.accountKey,
				transcriptPath: typeof event.data.transcript_path === 'string' ? event.data.transcript_path : undefined,
			};
			if (slot.execution?.kind !== 'prompt') {
				const session = slot.session;
				this.pendingRegistry.set(this.registryKey(session), session);
				// A closed registry keeps the reference pending; `resumeRegistry` persists it.
				if (!this.registryClosed) void this.persistRegistry().catch(console.error);
			}
		}
		if (event.event === 'PermissionRequest' || event.event === 'Notification') {
			slot.terminal?.setActivity('waiting');
			if (slot.terminal) slot.execution?.onState?.('needs-attention', slot.terminal.id);
		}
		if ((event.event === 'PreToolUse' || event.event === 'BeforeTool') && slot.terminal) {
			slot.terminal.setActivity('running');
			slot.execution?.onState?.('running', slot.terminal.id);
		}
		if (event.event === 'UserPromptSubmit' || event.event === 'BeforeAgent') {
			slot.busy = true;
			slot.terminal?.setActivity('running');
			slot.started = true;
			if (slot.terminal) slot.execution?.onState?.('running', slot.terminal.id);
			for (const listener of slot.listeners ?? []) listener();
		}
		if (slot.started && ['Stop', 'AfterAgent', 'StopFailure', 'StopCancelled', 'Interrupt'].includes(event.event)) {
			slot.busy = false;
			slot.terminal?.setActivity('idle');
			slot.started = false;
			const message =
				typeof event.data.last_assistant_message === 'string' ? event.data.last_assistant_message : '';
			const answerError =
				typeof event.data.huhu_answer_error === 'string' && event.data.huhu_answer_error
					? event.data.huhu_answer_error
					: slot.execution?.kind === 'prompt' &&
						  ['Stop', 'AfterAgent'].includes(event.event) &&
						  !message.trim()
						? 'nativeAnswerMissing'
						: undefined;
			slot.finish?.({
				status:
					event.event === 'StopFailure' || answerError
						? 'failed'
						: event.event === 'StopCancelled' || event.event === 'Interrupt'
							? 'cancelled'
							: 'succeeded',
				message,
				errorCode: answerError,
				output: slot.output,
				session: slot.session,
			});
			slot.finish = undefined;
		}
	}
	private async sessionUsage(session: AgentSessionRef) {
		const abort = new AbortController();
		const timeout = this.host.app.workspace.containerEl.win.setTimeout(() => abort.abort(), 10_000);
		try {
			const history = this.host.history();
			await history.scan(abort.signal);
			for (let offset = 0; ; offset += 100) {
				const page = await history.query('', offset, abort.signal);
				const row = page.rows.find(
					(s) =>
						s.agentId === session.agentId &&
						s.sessionId === session.sessionId &&
						s.accountKey === session.accountKey,
				);
				if (row) return row.usage;
				if (offset + 100 >= page.total) return undefined;
			}
		} finally {
			this.host.app.workspace.containerEl.win.clearTimeout(timeout);
		}
	}
	async start(action: AgentAction, run: AutomationRun, previous?: AutomationRun): Promise<AgentRunHandle> {
		return this.execute(
			action,
			{ id: run.id, title: run.title, kind: 'automation', reveal: run.trigger === 'manual' },
			previous?.terminalId,
		);
	}
	async execute(action: AgentAction, execution: AgentExecution, previousTerminal?: string): Promise<AgentRunHandle> {
		await this.loaded;
		execution.signal?.throwIfAborted();
		const id = action.agentId as AgentId;
		const settings = this.host.agentSettings();
		const entry = settings.agents[id];
		if (!entry?.enabled || !AGENT_CATALOG.some((agent) => agent.id === id))
			throw new AutomationError('agentDisabled');
		const agent = getAgent(id);
		const command = resolveCli(agent.detectCommand, entry.cliPath, '');
		if (!command) throw new AutomationError('cliMissing');
		action = { ...action, cwd: await this.boundCwd(action.spaceId, action.cwd) };
		if (needsYoloConfirmation(settings, id)) throw new AutomationError('permissionRequired');
		if (
			action.sessionMode === 'specific' &&
			(!action.session ||
				action.session.agentId !== id ||
				action.session.cwd !== action.cwd ||
				!action.session.sessionId)
		)
			throw new AutomationError('sessionMissing');
		let sessionEnv: Record<string, string> | undefined;
		if (action.sessionMode === 'specific' && action.session?.accountKey) {
			try {
				sessionEnv = JSON.parse(action.session.accountKey) as Record<string, string>;
			} catch {
				throw new AutomationError('sessionMissing');
			}
			if (
				!sessionEnv ||
				typeof sessionEnv !== 'object' ||
				Array.isArray(sessionEnv) ||
				Object.values(sessionEnv).some((value) => typeof value !== 'string')
			)
				throw new AutomationError('sessionMissing');
		}
		const restored = sessionEnv
			? await restoredAccountReference(
					agent,
					sessionEnv,
					vaultPath(this.host.app),
					getDeviceId(this.host.app),
					action.session?.transcriptPath,
				)
			: undefined;
		const env =
			restored?.env ??
			(await accountEnv(agent, entry.accountId, vaultPath(this.host.app), getDeviceId(this.host.app)));
		const accountKey = JSON.stringify(env);
		if (action.sessionMode === 'specific') {
			await checkAccountTranscript(
				vaultPath(this.host.app),
				env,
				restored?.transcriptPath ?? action.session?.transcriptPath,
			);
			if (action.session && restored)
				action = {
					...action,
					session: { ...action.session, accountKey, transcriptPath: restored.transcriptPath },
				};
		}
		if (execution.onPrepared) {
			const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accountIdentity(accountKey)));
			execution.onPrepared({
				agentId: id,
				accountIdentity: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
					'',
				),
			});
		}
		if (action.sessionMode === 'specific') {
			const sessions = await this.listSessions(action.cwd);
			if (
				!sessions.some(
					(session) =>
						session.agentId === id &&
						session.sessionId === action.session?.sessionId &&
						accountIdentity(session.accountKey) === accountIdentity(accountKey) &&
						session.cwd === action.cwd,
				)
			)
				throw new AutomationError('sessionMissing');
		}
		if (
			action.sessionMode === 'specific' &&
			[...this.live.values()].some(
				(v) =>
					v.busy &&
					(v.session || v.action.session)?.sessionId === action.session?.sessionId &&
					v.action.agentId === id &&
					accountIdentity(v.accountKey) === accountIdentity(accountKey),
			)
		)
			throw new AutomationError('busy');
		const reservation =
			action.sessionMode === 'specific'
				? JSON.stringify([id, accountIdentity(accountKey), action.session!.sessionId])
				: null;
		if (this.disposed) throw new AutomationError('busy');
		if (reservation && this.reservations.has(reservation)) throw new AutomationError('busy');
		if (reservation) this.reservations.add(reservation);
		try {
			const prior =
				action.sessionMode === 'reuse' && previousTerminal ? this.live.get(previousTerminal) : undefined;
			const reuse =
				prior &&
				!prior.busy &&
				prior.terminal?.running &&
				prior.action.agentId === id &&
				prior.action.cwd === action.cwd &&
				prior.action.spaceId === action.spaceId &&
				prior.accountKey === accountKey
					? prior
					: undefined;
			if (execution.kind === 'prompt' && previousTerminal && !reuse) throw new AutomationError('sessionMissing');
			const slot: LiveSession = reuse ?? {
				action,
				accountKey,
				busy: true,
				started: false,
				since: Date.now(),
				output: '',
			};
			slot.action = action;
			slot.execution = execution;
			slot.busy = true;
			slot.started = false;
			slot.since = Date.now();
			slot.output = '';
			const completion = new Promise<RunResult>((resolve) => {
				slot.finish = resolve;
			});
			const priorSession = action.sessionMode === 'specific' ? action.session : reuse?.session;
			const baseline = priorSession ? await this.sessionUsage(priorSession).catch(() => undefined) : undefined;
			const measuredCompletion = completion.then(async (result) => {
				if (!result.session) return result;
				try {
					const usage = await this.sessionUsage(result.session);
					if (usage?.known && (!priorSession || baseline?.known))
						result.usage = {
							input: Math.max(0, usage.input - (baseline?.input ?? 0)),
							output: Math.max(0, usage.output - (baseline?.output ?? 0)),
							cacheRead: Math.max(0, usage.cacheRead - (baseline?.cacheRead ?? 0)),
							cacheWrite: Math.max(0, usage.cacheWrite - (baseline?.cacheWrite ?? 0)),
							cost:
								usage.cost === null || (baseline && baseline.cost === null)
									? null
									: Math.max(0, usage.cost - (baseline?.cost ?? 0)),
							known: true,
						};
				} catch {
					/* Unavailable native usage must never change the run result. */
				}
				return result;
			});
			let terminal = slot.terminal;
			if (reuse && terminal) {
				execution.signal?.throwIfAborted();
				execution.onTerminal?.(terminal.id);
				const submission = terminal.submitPaste(action.prompt, { appendEnter: true, signal: execution.signal });
				const queued = await submission.queued;
				if (queued.state !== 'queued') {
					slot.busy = false;
					slot.finish = undefined;
					slot.execution = undefined;
					throw new AutomationError('agentUnavailable', {
						effect: queued.state,
						reason: queued.reason,
						runtimeId: terminal.id,
						op: queued.op,
					});
				}
			} else {
				const args = automationArgs(
					id,
					action.prompt,
					[
						...accountArgs(id, launchArgs(settings, id), env),
						...(action.sessionMode === 'reuse'
							? []
							: validatedExtraArgs(action.agentId, action.extraArgs ?? '')),
					],
					action.sessionMode === 'specific' ? action.session : undefined,
				);
				const argv = [command, ...args];
				const argvSize =
					runtimeProcess().platform === 'win32'
						? argv.reduce((size, arg) => size + arg.length + (arg.match(/[\\"]/g)?.length ?? 0) + 3, 0)
						: new TextEncoder().encode(argv.join('\0')).length;
				if (argvSize > (runtimeProcess().platform === 'win32' ? 30_000 : 100_000))
					throw new AutomationError('promptTooLarge');
				const preparation = this.hooks.prepare(id, env, (event) => this.receive(slot, event));
				this.hookPreparing.add(preparation);
				let hook: Awaited<ReturnType<AutomationHooks['prepare']>>;
				try {
					hook = await preparation;
				} finally {
					this.hookPreparing.delete(preparation);
				}
				slot.hookClose = () => hook.close();
				let lease: { release(): Promise<void> } | undefined;
				let admission: BusinessAdmission | undefined;
				try {
					if (this.disposed) throw new AutomationError('busy');
					execution.signal?.throwIfAborted();
					// Resolve after the canonical cwd and run id exist. Keep grants out of
					// account identity, hook installation and every persisted session.
					const contextEnv = await execution.resolveContext?.(action.cwd);
					execution.signal?.throwIfAborted();
					lease = await claimNativeConversation(
						this.host,
						id,
						action,
						execution.id,
						restored?.transcriptPath,
					);
					// Commit the Session in its Space first; nothing spawns unless that record is saved.
					admission = await this.admit(
						{
							spaceId: action.spaceId!,
							kind: 'agent',
							title: execution.title,
							agentId: id,
							accountId: entry.accountId || undefined,
						},
						execution.signal,
					);
					terminal = await this.host.create({
						runtime: admission.runtime,
						beforeSpawn: admission.beforeSpawn,
						kind: execution.kind === 'automation' ? 'automation' : 'agent',
						title: execution.title,
						file: command,
						args,
						cwd: action.cwd,
						env: {
							...entry.env,
							...contextEnv,
							...env,
							...hook.env,
							...(execution.kind === 'automation' ? { HUHU_AUTOMATION_RUN_ID: execution.id } : {}),
						},
						signal: execution.signal,
						agentId: id,
						automated: true,
						prepare: (session) => {
							// Its status comes from the automation hook path, not a managed activity source: say so explicitly,
							// so the workbench and `wait` report "unavailable" with a reason rather than an open, source-less state.
							markBusinessActivity(session);
							slot.terminal = session;
							this.live.set(session.id, slot);
							execution.onTerminal?.(session.id);
							session.observe((event) => {
								if (event.kind === 'data') {
									slot.output = (slot.output + event.text).slice(-8000);
									return;
								}
								// Only a confirmed exit frees the conversation; a lost transport keeps its claim.
								if (event.kind === 'exit' && session.exitEvidence?.confirmed)
									void lease?.release().catch(() => {});
								slot.busy = false;
								slot.finish?.({
									status:
										event.kind === 'exit'
											? event.code === 0 && execution.kind !== 'prompt'
												? 'succeeded'
												: event.code < 0
													? 'interrupted'
													: 'failed'
											: 'interrupted',
									message: event.kind === 'exit' ? String(event.code) : '',
									errorCode: event.kind === 'exit' ? 'processExit' : 'agentUnavailable',
									errorParams: event.kind === 'exit' ? { code: event.code } : undefined,
									output: slot.output,
									session: slot.session,
								});
								slot.finish = undefined;
								this.closeSlotHooks(slot);
								this.live.delete(session.id);
							});
						},
					});
					admission.created(terminal);
					if (terminal.connection === 'failed') throw new AutomationError('cliMissing');
				} catch (error) {
					admission?.abandon(error);
					this.closeSlotHooks(slot);
					if (slot.terminal) await this.stop(slot.terminal.id);
					// Nothing was spawned, or the process is verifiably gone: give the conversation back.
					if (
						!slot.terminal ||
						slot.terminal.connection === 'exited' ||
						slot.terminal.connection === 'failed'
					)
						await lease?.release().catch(() => {});
					throw error;
				}
			}
			execution.signal?.throwIfAborted();
			if (execution.reveal) void this.open(terminal.id).catch(console.error);
			return {
				terminalId: terminal.id,
				session: slot.session ?? action.session,
				completion: measuredCompletion,
				onRunning: (listener) => {
					slot.listeners ??= new Set();
					slot.listeners.add(listener);
					if (slot.started) listener();
					return () => slot.listeners?.delete(listener);
				},
			};
		} finally {
			if (reservation) this.reservations.delete(reservation);
		}
	}
	private async spaceCwd(spaceId: string): Promise<string> {
		try {
			return await this.host.spaces.cwd(spaceId);
		} catch (error) {
			throw spaceFailure(error);
		}
	}
	/** Space gate shared by agent and script runs: explicit binding, available Space, directory inside it. */
	async boundCwd(spaceId: string | undefined, requested: string): Promise<string> {
		if (!spaceId) throw new AutomationError('spaceRequired');
		const spaceCwd = await this.spaceCwd(spaceId);
		const vault = vaultPath(this.host.app);
		let canonical = '';
		let root = vault;
		if (requested) {
			try {
				canonical = await canonicalVaultCwd(vault, requested);
				root = await canonicalVaultCwd(vault, vault);
			} catch {
				throw new AutomationError('cwdInvalid');
			}
		}
		// The requested directory is compared in its real spelling, so the Space directory must be too (a symlinked
		// or Windows 8.3 short-name temp root would otherwise never contain its own real subdirectories).
		const spaceRoot = canonical ? await realPathOr(spaceCwd) : spaceCwd;
		const cwd = spaceBoundCwd(spaceRoot, canonical, root, runtimeProcess().platform);
		if (!cwd) throw new AutomationError('cwdInvalid');
		return cwd === spaceRoot ? spaceCwd : cwd;
	}
	private async admit(request: BusinessAdmissionRequest, signal?: AbortSignal): Promise<BusinessAdmission> {
		try {
			return await this.host.spaces.admit(request, signal);
		} catch (error) {
			throw spaceFailure(error);
		}
	}
	async stop(id: string): Promise<void> {
		const slot = this.live.get(id);
		slot?.finish?.({ status: 'cancelled', message: '' });
		if (slot) slot.finish = undefined;
		// A dedicated prompt must terminate its process, even when the CLI ignores SIGHUP.
		if (slot?.execution?.kind === 'prompt') slot.terminal?.end(true);
		this.host.remove(id);
		if (slot) this.closeSlotHooks(slot);
		this.live.delete(id);
		return Promise.resolve();
	}
	async startScript(
		action: Extract<AutomationAction, { kind: 'script' }>,
		run: AutomationRun,
	): Promise<AgentRunHandle> {
		if (this.disposed) throw new AutomationError('agentUnavailable');
		let finish!: (result: RunResult) => void;
		const completion = new Promise<RunResult>((resolve) => {
			finish = resolve;
		});
		let output = '';
		const cwd = await this.boundCwd(action.spaceId, action.cwd);
		const shell = this.host.shell(action.shell);
		const admission = await this.admit({ spaceId: action.spaceId!, kind: 'shell', title: run.title });
		const terminal = await this.host
			.create({
				runtime: admission.runtime,
				beforeSpawn: admission.beforeSpawn,
				kind: 'script',
				title: run.title,
				file: shell.file,
				args:
					action.shell === 'powershell'
						? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', action.script]
						: ['-lc', action.script],
				cwd,
				env: { HUHU_AUTOMATION_RUN_ID: run.id },
				automated: true,
				prepare: (session) => {
					markBusinessActivity(session);
					const unsubscribe = session.observe((event) => {
						if (event.kind === 'data') {
							output = (output + event.text).slice(-8000);
							return;
						}
						unsubscribe();
						finish({
							status: event.kind === 'exit' ? (event.code === 0 ? 'succeeded' : 'failed') : 'interrupted',
							message: event.kind === 'exit' ? `Exit ${event.code}` : '',
							output,
						});
					});
				},
			})
			.catch((error: unknown) => {
				admission.abandon(error);
				throw error;
			});
		admission.created(terminal);
		if (terminal.connection === 'failed') {
			this.host.remove(terminal.id);
			throw new AutomationError('agentUnavailable');
		}
		if (this.disposed) {
			this.host.remove(terminal.id);
			throw new AutomationError('agentUnavailable');
		}
		if (run.trigger === 'manual') {
			try {
				await this.open(terminal.id);
			} catch (error) {
				this.host.remove(terminal.id);
				throw error;
			}
		}
		return {
			terminalId: terminal.id,
			completion,
			onRunning: (listener) => {
				listener();
				return () => undefined;
			},
		};
	}
	async open(id: string): Promise<void> {
		await this.host.open(id);
	}
	private registryKey(session: AgentSessionRef): string {
		return JSON.stringify([session.agentId, session.sessionId, session.accountKey]);
	}
	private persistRegistry(): Promise<void> {
		// Admit work immediately on the adapter's shared queue, so reopening cannot load between hook writes.
		return this.registryQueue.run(this.registryQueueKey, async () => {
			await this.loaded;
			if (!this.pendingRegistry.size) return;
			const pending = new Map(this.pendingRegistry);
			const next = [
				...this.registry.filter((session) => !pending.has(this.registryKey(session))),
				...pending.values(),
			];
			this.registry = await this.store.commit({ base: this.registry, value: next });
			for (const [key, session] of pending)
				if (this.pendingRegistry.get(key) === session) this.pendingRegistry.delete(key);
		});
	}
	/** Recovery protocol: hold registry writes in memory (pending references are kept, not dropped). */
	quiesceRegistry(): void {
		this.registryClosed = true;
	}
	resumeRegistry(): void {
		this.registryClosed = false;
		if (this.pendingRegistry.size && !this.disposed) void this.persistRegistry().catch(console.error);
	}
	/** Strict drain of already admitted registry writes; a failed commit rejects. */
	async drainRegistry(): Promise<void> {
		await this.loaded;
		const wasClosed = this.registryClosed;
		this.registryClosed = false;
		try {
			await this.persistRegistry();
			await this.registryQueue.run(this.registryQueueKey, () => this.store.flush());
		} finally {
			this.registryClosed = wasClosed;
		}
	}
	/** Rebuild the registry and its JsonStore baseline from the restored file. */
	async reloadRegistry(): Promise<void> {
		await this.drainRegistry();
		await this.registryQueue.run(this.registryQueueKey, async () => {
			const next = this.openStore();
			this.registry = await next.load([]);
			this.store = next;
		});
	}
	dispose(): Promise<void> {
		if (this.disposing) return this.disposing;
		this.disposed = true;
		for (const slot of this.live.values()) {
			slot.finish?.({ status: 'interrupted', message: '', errorCode: 'agentUnavailable' });
			slot.finish = undefined;
		}
		for (const slot of this.live.values()) this.closeSlotHooks(slot);
		// Start both owners now: registry IO cannot delay scope revocation or cleanup.
		let cleanup: Promise<void>;
		try {
			cleanup = Promise.resolve(this.hooks.dispose());
		} catch (error) {
			cleanup = Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		const registry = this.persistRegistry();
		this.disposing = (async () => {
			const results = await Promise.allSettled([cleanup, registry, ...this.hookPreparing]);
			while (this.hookSettlements.size) await Promise.all([...this.hookSettlements]);
			const failures = [
				...this.hookFailures,
				...results.flatMap((r) => (r.status === 'rejected' ? [r.reason as unknown] : [])),
			];
			if (
				failures.length === 1 &&
				!this.hookFailures.length &&
				results[0]?.status === 'fulfilled' &&
				results[1]?.status === 'rejected'
			)
				throw results[1].reason;
			if (failures.length) throw new AggregateError(failures, t('agent.managed.shutdownIncomplete'));
		})();
		return this.disposing;
	}
}
