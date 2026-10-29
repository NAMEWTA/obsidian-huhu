import { captureControlExecutionContext, observeControlPreparation } from './control/terminal-coordination';
import type { ActivityWaitBaseline } from '../core/control/terminal-coordination';
import type { ControlRequest, ControlProgress } from '../../../shared/native/control-wire';
import { BROWSER_HOST } from '../../browser/api';
import { NativeControlError, type NativeCliState, type NativeLease } from '../../../shared/native/host';
import type { ControlEnvironment, RoutedEnvironment } from '../platform/desktop/control/environment';
import type { ControlRouter } from './control/router';
import { Notice, Platform, type App } from 'obsidian';
import { SessionMaterialService } from './session-material';
import type { ModuleContext } from '../../../app/contracts/module';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import { collectReferences } from '../../../host/obsidian/references';
import { t } from '../../../shared/i18n/index';
import { deviceId, vaultIdentity } from '../../../host/obsidian/storage/device-id';
import type { SettingsHandle } from '../../../shared/settings/store';
import { AGENT_CATALOG, getAgent } from '../core/launch/catalog';
import type { AgentId, AgentSettings } from '../core/launch/types';
import { AgentsStore } from './agents-store';
import { AgentTools } from './agent-tools';
import { loginShellPath } from '../platform/desktop/detection/shell-path';
import { launchSettings, usageAgentIds } from '../core/detection/merge';
import { removeStatusHooks } from '../platform/desktop/hooks/remove-status-hooks';
import { NOTIFICATION_INBOX } from '../../notifications/api';
import { UsageStore } from './usage-store';
import { WorkspaceUsageStore } from './workspace-usage-store';
import { StatsService } from './stats-service';
import { HistoryStore } from './history-store';
import { AgentUsageSource } from '../core/launch/usage-source';
import type { VaultSession, VaultSessionAgent } from '../core/history/types';
import type { SplitDirection } from '../core/terminal/layout';
import { captureForegroundIntent, type ForegroundIntent } from './launch/foreground-intent';
import type { ManagedRuntimeRef, RuntimeHooksPort } from '../core/workspace/managed-runtime';
type ManagedFailureInput = ReturnType<typeof normalizeManagedFailure>;
import { WorkspaceService, type WorkspaceLaunchPort } from './workspace-service';
import { createSpaceWorkspaceStore, type WorkspaceStore } from './workspace-store';
import { SpaceService, type SessionAdmission } from './spaces/space-service';
import type { SessionRecord } from './spaces/records';
import { ManagedLaunchError, managedFailure, normalizeManagedFailure } from './launch/managed-errors';
import { createDesktopSpacePorts } from '../platform/desktop/spaces/ports';
import type { SpaceChooser } from '../core/space/ports';
import { SpaceError } from '../core/space/errors';
import { spaceErrorMessage } from './spaces/messages';
import { observeLifecycle, SHUTDOWN_OBSERVE_MS } from './terminal/clock';
import { privateVaultStorage } from '../../../host/obsidian/storage/private-storage';
import type { ResumeInfo } from '../core/workspace/model';
import type { QuickCommand, ShellChoice, TerminalSettings } from '../core/terminal/settings';
import { openPath, revealPath } from '../platform/desktop/files';
import { resumeArgs } from '../platform/desktop/history/scope';
import { launchArgs } from '../core/launch/flags';
import {
	accountEnv,
	absolutePluginDir,
	restoredAccountReference,
	LEGACY_VAULT_ACCOUNT,
} from '../platform/desktop/agents/accounts';
import {
	legacyDefaultAccountsToAdopt,
	markLegacyDefaultAdopted,
	inLegacyDefaultAccount,
} from '../platform/desktop/agents/legacy-default';
import type { SystemHookResult } from '../platform/desktop/hooks/system-hooks';
import { systemAccountLocation, systemAccountPaths } from '../platform/desktop/agents/system-homes';
import { loginShellEnvironment } from '../platform/desktop/detection/shell-path';
import { runtimeProcess } from '../platform/desktop/agents/runtime-process';
import { canonicalVaultCwd, samePath } from '../platform/desktop/history/canonical-cwd';
import { checkAccountTranscript } from '../platform/desktop/agents/transcript';
import { accountArgs } from '../platform/desktop/agents/account-args';
import { formatResumeCommand } from '../platform/desktop/history/resume-command';
import { readUsageSnapshots } from '../platform/desktop/agents/usage';
import { AutomationHooks } from '../platform/desktop/hooks/automation-hooks';
import { terminalEnvironment, userHome } from '../platform/desktop/pty/runtime-environment';
import { availableShells, resolveShell, sessionDirectory, type ShellOption } from '../platform/desktop/pty/shells';
import type { NativeSessionSummary } from '../platform/desktop/server/agent-data-client';
import { NativeHistory } from '../platform/history/service';
import {
	TerminalAutomationRuntime,
	resolveRequestedCwd,
	type BusinessAdmission,
	type BusinessAdmissionRequest,
} from './agent-runtime';
import { AGENT_RUN_CONTEXTS } from '../api';
import { PromptRunner, submitInteractivePrompt } from './prompt-runner';
import { launchAgent, resumeAgent, verifyResume, type LaunchHost, type LaunchRequest } from './launch/launcher';
import { NativeResumeError, NativeResumeService, type ImportResult, type ResumeResult } from './launch/native-resume';
import { NativeOccupancy, canonicalStorePath } from '../platform/desktop/native-reference/occupancy';
import { accountNameOf } from '../platform/desktop/native-reference/reference';
import type { TerminalSession } from './terminal/session';
import { hookActivity, TerminalSessions } from './terminal/sessions';
import { InboxService } from './inbox/service';
import { InboxPresentation } from './inbox/presentation';
import { HistoryCommands } from './control/history';

/** Usage polling interval with backoff after failures (capped at 15 minutes). */
export function usageDelay(refreshSec: number, failures: number): number {
	return Math.min(15 * 60_000, Math.max(15, refreshSec) * 1000 * 2 ** Math.min(failures, 6));
}

/** Text in a CSS color property as `#rrggbb`, or '' when it cannot be resolved. */
function cssColor(element: HTMLElement, property: string): string {
	const value = element.win.getComputedStyle(element).getPropertyValue(property);
	const match = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(value);
	if (!match) return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : '';
	return (
		'#' +
		match
			.slice(1, 4)
			.map((part) => Number(part).toString(16).padStart(2, '0'))
			.join('')
	);
}

/**
 * An automation/prompt run already owns the hook scope that delivers its native answer (the same spool variables
 * as a managed runtime's scope). A second scope for its managed runtime would replace them and lose that answer, so
 * runtimes admitted for business runs get an empty scope; every other runtime keeps the managed hooks.
 */
export function businessAwareHooks(business: ReadonlySet<string>, real: () => RuntimeHooksPort): RuntimeHooksPort {
	return {
		prepareRuntimeHooks: (request, binding) =>
			business.has(request.target.runtimeId)
				? Promise.resolve({ env: {}, close: async () => {} })
				: real().prepareRuntimeHooks(request, binding),
	};
}

export type Placement = { split: { from: string; direction: SplitDirection } } | { tab: true };

/** Dialogs the controller shows; supplied by the module (the UI code loads on first use). */
export interface ControllerDialogs {
	confirm(app: App, message: string): Promise<boolean>;
	selectSpace?: SpaceChooser;
	prepare?(): Promise<void>;
}

/**
 * The agent module's runtime: terminal sessions and their tab layout, launching shells, agents and
 * presets, native history, usage, automation and the commands. One instance per module activation.
 */
export class AgentController {
	readonly sessions: TerminalSessions;
	readonly workspace: WorkspaceService;
	readonly spaces: SpaceService;
	readonly inbox: InboxService;
	readonly usage: AgentUsageSource;
	readonly agents: AgentsStore;
	readonly tools: AgentTools;
	readonly usageStore: UsageStore;
	readonly stats: StatsService;
	readonly historyStore: HistoryStore;
	readonly workspaceHistoryStore: HistoryStore;
	readonly workspaceUsage: WorkspaceUsageStore;
	private workspaceHistory?: NativeHistory;
	readonly runtime: TerminalAutomationRuntime;
	readonly prompts: PromptRunner;
	readonly materials: SessionMaterialService;
	/** First page of this vault's native history, for the side panel and preview lookups. */
	private readonly hooks: AutomationHooks;
	private readonly listeners = new Set<() => void>();
	private shellOptions?: ShellOption[];
	private colors = { foreground: '#d4d4d4', background: '#1e1e1e', cursor: '#d4d4d4' };
	private colorsReadAt = 0;
	private preparing?: Promise<void>;
	private stopped = false;
	/** Runtimes admitted for one-shot business runs while their launch is in flight. */
	private readonly businessRuntimes = new Set<string>();
	private disposing?: Promise<void>;
	private lastActivity = new Map<string, string>();
	private lastHooks = true;
	private controlSetup?: Promise<{ environment: ControlEnvironment; router: ControlRouter }>;
	private controlOwner?: { environment: ControlEnvironment; router: ControlRouter };
	private controlRetiring?: Promise<void>;
	private controlRetirementPending = false;
	private controlRetirementFailure?: unknown;
	private controlRetirementFailureCount = 0;
	private historyCommands?: HistoryCommands;
	private nativeResumeService?: NativeResumeService;
	private readonly instanceId = crypto.randomUUID();
	private readonly claimedNative = new Set<string>();

	constructor(
		private readonly context: ModuleContext,
		readonly settings: SettingsHandle<TerminalSettings>,
		private readonly dialogs: ControllerDialogs,
		sharedWorkspace?: import('../../../app/contracts/shared-workspace').SharedWorkspaceOwner,
	) {
		const app = context.app;
		const win = app.workspace.containerEl.win;
		this.agents = new AgentsStore(settings);
		this.tools = new AgentTools({
			path: async () => (await loginShellPath()) ?? '',
			detected: () => this.agents.store.getState().detected,
			redetect: () => this.agents.refresh(true),
		});
		let inspected = '';
		context.lifetime.register(
			this.agents.store.subscribe((state) => {
				const key = JSON.stringify(state.detected);
				if (state.refreshing || key === inspected) return;
				inspected = key;
				void this.tools.inspect().catch(() => undefined);
			}),
		);
		context.lifetime.register(() => this.tools.dispose());
		context.lifetime.register(
			this.agents.store.subscribe(() => {
				this.syncUsageScope();
				this.changed();
			}),
		);

		this.hooks = new AutomationHooks(win, () => ({ vault: this.vaultPath() ?? '', device: deviceId(app) }));
		this.sessions = new TerminalSessions({
			runtimeHooks: businessAwareHooks(this.businessRuntimes, () => this.hooks),
			clock: {
				setTimeout: (run, delay) => win.setTimeout(run, delay),
				clearTimeout: (token) => win.clearTimeout(token as number),
			},
			native: context.native,
			routeEnvironment: (ref, lease) => this.routeControlEnvironment(ref, lease),
			prepare: () => this.prepare(),
			platform: Platform.isWin ? 'win32' : Platform.isMacOS ? 'darwin' : 'linux',
			environment: async (signal) => {
				const base = await terminalEnvironment();
				// Installing the tool is never waited on beyond a short local check; see CliEnvironment.
				return (await this.cliEnvironment()).apply(base, signal);
			},
			home: userHome,
			settings: () => this.settings.get(),
			colors: () => this.themeColors(),
			agentHooks: (agentId, env, activity) =>
				this.hooks.prepare(agentId, env, (event) => {
					const next = hookActivity(event.event);
					if (next) activity(next, event.data);
				}),
		});
		const identity = vaultIdentity(app);
		const spacePorts = createDesktopSpacePorts({
			vaultRoot: this.vaultPath() ?? '',
			vaultId: identity.vaultId,
			deviceId: identity.deviceId,
			win,
		});
		const shared = sharedWorkspace ?? context.sharedWorkspace;
		if (shared) {
			this.spaces = shared.spaces as SpaceService;
			shared.setSpaceChooser?.(dialogs.selectSpace);
		} else {
			this.spaces = new SpaceService({
				...spacePorts,
				storage: privateVaultStorage(app),
				instanceId: crypto.randomUUID(),
				selectSpace: dialogs.selectSpace,
				report,
			});
		}
		this.inbox = new InboxService({
			spaces: this.spaces,
			presentation: new InboxPresentation(),
			sources: {
				vaultId: identity.vaultId,
				getFileByPath: (path) => app.vault.getFileByPath(path),
				stat: async (file) => {
					const value = file as { stat?: { size?: number; mtime?: number } } | null;
					return value?.stat;
				},
			},
		});
		const workspaceStore =
			(shared?.workspaceStore as WorkspaceStore | undefined) ??
			createSpaceWorkspaceStore(this.spaces, win, report);
		this.workspace = new WorkspaceService(
			workspaceStore,
			this.sessions,
			this.workspaceLaunchPort(),
			() => context.services.peek(BROWSER_HOST),
			this.spaces,
			!!shared,
		);
		context.lifetime.register(context.services.watch(BROWSER_HOST, () => this.changed()));
		context.lifetime.register(this.workspace.store.subscribe(() => this.changed()));
		// A fresh HUHU launch claims its conversation as soon as its native id and transcript are known.
		context.lifetime.register(this.sessions.subscribe(() => this.claimRunningNative()));
		const idleTimer = win.setInterval(() => this.workspace.refreshStates(), 60_000);
		context.lifetime.register(() => win.clearInterval(idleTimer));
		context.lifetime.register(
			this.sessions.subscribe(() => {
				const settings = this.settings.get();
				for (const session of this.sessions.list()) {
					const previous = this.lastActivity.get(session.id);
					this.lastActivity.set(session.id, session.activity);
					if (session.agentId && settings.generatedTitles && session.generatedTitle)
						session.setGeneratedTitle(session.generatedTitle);
					if (
						session.agentId &&
						previous &&
						previous !== session.activity &&
						['done', 'waiting', 'permission'].includes(session.activity) &&
						settings.notifications &&
						!win.document.hasFocus()
					) {
						const inbox = context.services.peek(NOTIFICATION_INBOX);
						if (inbox?.available('system'))
							void inbox
								.send({
									id: `agent:${session.id}:${session.activityAt}`,
									title: session.title,
									body: t(`agent.activity.${session.activity}`),
									channels: ['system'],
								})
								.catch(report);
					}
				}
				this.changed();
			}),
		);
		this.usage = new AgentUsageSource({
			read: () =>
				readUsageSnapshots(this.usageAgents(), {
					settings: this.agentSettings(),
					vault: this.vaultPath() ?? '',
					device: deviceId(app),
				}),
			active: () => true,
			delay: (failures) => usageDelay(this.settings.get().usageRefreshSec, failures),
			now: () => Date.now(),
			schedule: (callback, delay) => win.setTimeout(callback, delay),
			cancel: (timer) => win.clearTimeout(timer),
		});
		this.usage.setPinned(false);
		context.lifetime.register(this.usage.subscribe(() => this.changed()));
		let usageAccounts = JSON.stringify(AGENT_CATALOG.map((a) => this.settings.get().agents.agents[a.id].accountId));
		context.lifetime.register(
			this.settings.subscribe(() => {
				this.usage.setPinned(false);
				this.syncUsageScope();
				const accounts = JSON.stringify(
					AGENT_CATALOG.map((a) => this.settings.get().agents.agents[a.id].accountId),
				);
				this.usage.invalidate(accounts !== usageAccounts);
				usageAccounts = accounts;
				if (this.lastHooks && !this.settings.get().statusHooks) {
					this.sessions.clearStatusHooks();
					// A managed account's hooks live inside the vault and go with the setting. A live automation keeps its own.
					// The system account's entries are shared with every vault and stay until the user removes them explicitly.
					void Promise.all(
						AGENT_CATALOG.filter(
							(agent) =>
								!this.sessions
									.list()
									.some(
										(session) =>
											session.automated && session.running && session.agentId === agent.id,
									),
						).map((agent) => this.removeAgentHooks(agent.id)),
					).catch(report);
				}
				this.lastHooks = this.settings.get().statusHooks;
				for (const session of this.sessions.list()) session.setScrollback(this.settings.get().scrollback);
				this.changed();
			}),
		);
		this.runtime = new TerminalAutomationRuntime({
			app,
			pluginDir: context.manifest.dir ?? '',
			agentSettings: () => this.agentSettings(),
			history: () => this.workspaceHistoryService(),
			spaces: {
				cwd: (spaceId) => this.spaces.resolveSpaceCwd(spaceId),
				admit: (request, signal) => this.admitBusiness(request, signal),
			},
			create: (request) => this.sessions.create(request),
			remove: (id) => this.sessions.remove(id),
			open: async (id) => {
				this.show(id);
				await this.open({ feature: 'terminal', section: 'running', resourceId: id });
			},
			shell: (kind) =>
				resolveShell(
					kind === 'powershell' ? (Platform.isWin ? 'powershell' : 'pwsh') : 'bash',
					this.settings.get(),
				),
			transcriptFor: async (request) => {
				const wanted = accountNameOf(request.accountKey);
				const page = await this.workspaceHistoryService().query(
					request.nativeSessionId,
					0,
					undefined,
					'all',
					'vault',
				);
				return page.rows.find(
					(row) =>
						row.agentId === request.agentId &&
						row.sessionId === request.nativeSessionId &&
						accountNameOf(row.accountKey) === wanted,
				)?.transcriptPath;
			},
			nativeLease: (request) =>
				this.nativeResume().guard({
					provider: request.agentId,
					nativeSessionId: request.nativeSessionId,
					transcriptPath: request.transcriptPath,
					spaceId: request.spaceId ?? '',
					sessionId: request.owner,
				}),
		});
		this.prompts = new PromptRunner(
			this.runtime,
			async () => (await context.contributions.collect(AGENT_RUN_CONTEXTS)).map((item) => item.value),
			win,
		);
		this.materials = new SessionMaterialService(this);
		this.usageStore = new UsageStore(this, win);
		this.stats = new StatsService(privateVaultStorage(app), deviceId(app), win, this.sessions, report, (cwd) =>
			canonicalVaultCwd(this.vaultPath() ?? '', cwd).then(
				() => true,
				() => false,
			),
		);
		// The drawer, board, palette and usage all read the one vault projection; there is no account-wide history store.
		this.workspaceHistoryStore = new HistoryStore(
			() => this.workspaceHistoryService(),
			() => this.vaultPath() ?? '',
			'vault',
			(rows) => this.bindHistoryOwners(rows),
			() => {
				const records = this.spaces.store.getState().records;
				return Object.values(records.sessions).flatMap((session) => {
					if (session.kind !== 'shell') return [];
					const directory = records.spaces[session.spaceId]?.directory;
					const cwd = directory?.kind === 'vault' ? directory.target.canonicalPath : directory ? records.grants[directory.grantId]?.target.canonicalPath ?? '' : '';
					return [{ sessionId: session.id, spaceId: session.spaceId, title: session.title, cwd, createdAt: session.createdAt, archived: session.archived }];
				});
			},
		);
		this.historyStore = this.workspaceHistoryStore;
		this.workspaceUsage = new WorkspaceUsageStore(this.workspaceHistoryStore, this.settings);
	}
	private historyOwnerBinding(session: SessionRecord): import('../platform/history/service').HistoryOwnerBinding | undefined {
		if (!session.agentId || !session.nativeSessionId || !session.transcriptPath) return undefined;
		return {
			agentId: session.agentId,
			sessionId: session.nativeSessionId,
			accountId: session.accountId ?? '',
			deviceId: session.nativeImport?.deviceId ?? deviceId(this.app),
			transcriptPath: session.transcriptPath,
			...(session.nativeImport ? { accountKey: session.nativeImport.accountKey, sourceRef: session.nativeImport.sourceRef } : {}),
		};
	}
	/** Missing transcript/account provenance never expands the Vault projection. */
	private ownedSessions(): import('../platform/history/service').HistoryOwnerBinding[] {
		return Object.values(this.spaces.store.getState().records.sessions).flatMap((session) => {
			const binding = this.historyOwnerBinding(session);
			return binding ? [binding] : [];
		});
	}
	private async bindHistoryOwners(rows: readonly NativeSessionSummary[]): Promise<string[]> {
		const byIdentity = new Map<string, SessionRecord[]>();
		for (const session of Object.values(this.spaces.store.getState().records.sessions)) {
			if (!session.agentId || !session.nativeSessionId) continue;
			const key = JSON.stringify([session.agentId, session.nativeSessionId]);
			byIdentity.set(key, [...(byIdentity.get(key) ?? []), session]);
		}
		const entries: Array<{ sourceRef: string; spaceId: string }> = [];
		const diagnostics: string[] = [];
		const owns = await this.workspaceHistoryService().ownerMatcher();
		for (const row of rows) {
			if (!row.sourceRef || this.spaces.historySpaceFor(row.sourceRef)) continue;
			const owners = new Set<string>();
			for (const session of byIdentity.get(JSON.stringify([row.agentId, row.sessionId])) ?? []) {
				const binding = this.historyOwnerBinding(session);
				if (binding && owns(row, binding)) owners.add(session.spaceId);
			}
			if (owners.size === 1) entries.push({ sourceRef: row.sourceRef, spaceId: [...owners][0]! });
			else if (owners.size > 1) diagnostics.push('history-owner-ambiguous');
		}
		if (entries.length) {
			try {
				const result = await this.spaces.bindHistorySources(entries);
				diagnostics.push(...result.skipped.map((item) => item.reason));
			} catch (error) {
				diagnostics.push(error instanceof Error ? error.message : String(error));
			}
		}
		return diagnostics;
	}

	/** Remove the status-hook entries of every managed account of one agent. */
	private async removeAgentHooks(id: AgentId): Promise<void> {
		const agent = getAgent(id),
			vault = this.vaultPath() ?? '',
			device = deviceId(this.app);
		for (const name of new Set([
			this.settings.get().agents.agents[id].accountId,
			...(this.settings.get().accounts[id] ?? []),
		]))
			if (name !== '') await removeStatusHooks(id, await accountEnv(agent, name, vault, device));
	}

	/**
	 * The user's explicit "remove system status hooks": exactly HUHU's commands in the real provider files, and HUHU's own
	 * unmodified extension files. Returns what was changed and what was left alone (a link, invalid JSON, a user's file).
	 */
	async removeSystemStatusHooks(): Promise<SystemHookResult> {
		const { removeSystemHooks, removeSystemScripts } = await import('../platform/desktop/hooks/system-hooks');
		const env = {
			home: userHome(),
			platform: (Platform.isWin ? 'win32' : Platform.isMacOS ? 'darwin' : 'linux') as NodeJS.Platform,
		};
		const result: SystemHookResult = await removeSystemHooks(systemAccountPaths(), env);
		if (!result.skipped.length) {
			const scripts = await removeSystemScripts(env);
			result.changed.push(...scripts.changed);
			result.skipped.push(...scripts.skipped);
		}
		new Notice(
			result.skipped.length
				? t('agent.hooks.systemSkipped', {
						files: result.skipped.map((row) => `${row.file} (${row.reason})`).join(', '),
					})
				: t('agent.hooks.systemRemoved', { count: result.changed.length }),
			8000,
		);
		return result;
	}

	/** The vault's former default account becomes a named managed account; the empty name now selects the system account. */
	private async adoptLegacyDefaultAccounts(): Promise<void> {
		const vault = this.vaultPath(),
			device = deviceId(this.app);
		if (!vault || !Platform.isDesktop) return;
		const agents = await legacyDefaultAccountsToAdopt(vault, device);
		if (agents.length)
			await this.settings.update((draft) => {
				for (const id of agents) {
					draft.accounts[id] = [...new Set([...(draft.accounts[id] ?? []), LEGACY_VAULT_ACCOUNT])];
					(draft.accountLabels[id] ??= {})[LEGACY_VAULT_ACCOUNT] ??= t('agent.manage.legacyVaultAccount');
				}
			});
		await markLegacyDefaultAdopted(vault, device);
	}

	agentSettings() {
		return launchSettings(this.settings.get(), this.agents.store.getState().detected);
	}

	get app(): App {
		return this.context.app;
	}

	private changed(): void {
		for (const listener of [...this.listeners]) listener();
		this.context.shell.refresh();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	vaultPath(): string | undefined {
		const adapter = this.app.vault.adapter as { getBasePath?: () => string };
		return typeof adapter.getBasePath === 'function' ? adapter.getBasePath() : undefined;
	}

	pluginDir(): string {
		return absolutePluginDir(this.vaultPath() ?? '', this.context.manifest.dir ?? '');
	}

	configureBrowser() {
		return this.context.shell.open({ feature: 'settings', section: 'browser' });
	}
	browserHost() {
		return this.context.services.peek(BROWSER_HOST);
	}
	/** The vault-scoped native history owner, with HUHU-owned sessions admitted regardless of cwd. */
	workspaceHistoryService(): NativeHistory {
		return (this.workspaceHistory ??= new NativeHistory(
			this.app,
			this.sessions,
			() => this.agentSettings(),
			() => this.settings.get().accounts,
			'vault',
			() => this.ownedSessions(),
		));
	}
	private historyControl(): HistoryCommands {
		return (this.historyCommands ??= new HistoryCommands(
			() => this.workspaceHistoryService(),
			{ spaceFor: (row) => (row.sourceRef ? this.spaces.historySpaceFor(row.sourceRef) : undefined) },
			() => this.workspaceHistoryStore.refresh(false),
			() => this.nativeResume(),
		));
	}
	/** The one import/continue path shared by the history drawer and the control/CLI operations. */
	nativeResume(): NativeResumeService {
		return (this.nativeResumeService ??= new NativeResumeService({
			deviceId: deviceId(this.app),
			instanceId: this.instanceId,
			vaultId: vaultIdentity(this.app).vaultId,
			spaces: this.spaces,
			occupancy: new NativeOccupancy(),
			managed: (target) => this.workspace.getManaged(target),
			subscribeManaged: (listener) => this.workspace.subscribeManaged(listener),
			attach: async (target, focus) => {
				const result = await this.workspace.attachManaged(target, {
					expectedRuntimeId: target.runtimeId,
					focus,
				});
				if (result.status === 'failed') throw new ManagedLaunchError(result.error, 'none');
				if (focus && result.status === 'attached')
					await this.context.shell.open({
						feature: 'terminal',
						section: 'running',
						resourceId: target.runtimeId,
					});
			},
			samePath,
			canonicalPath: canonicalStorePath,
			verify: async (row) => {
				const context = await this.resumeContext(row);
				const host = this.captureLaunchHost(async () => {});
				host.path = context.path;
				host.getAgentSettings = () => context.settings;
				host.managed = true;
				await verifyResume(host, context.session);
			},
			launch: (request, reserved) => this.launchExistingResume(request, reserved),
		}));
	}
	/**
	 * Fresh launches (not resumes) only learn their native id and transcript while running. Claim the machine-wide
	 * lock then, with the same lifecycle as a resume. Best effort: a process that already started cannot be
	 * undone, so a refused claim is left alone.
	 */
	private claimRunningNative(): void {
		if (this.stopped) return;
		// Forget sessions that ended, so the set stays bounded and a reused id could be claimed again.
		const live = new Set(
			this.sessions
				.list()
				.filter((session) => session.running)
				.map((session) => session.id),
		);
		for (const id of this.claimedNative) if (!live.has(id)) this.claimedNative.delete(id);
		for (const session of this.sessions.list()) {
			if (
				session.kind !== 'agent' ||
				!session.running ||
				!session.agentId ||
				!session.nativeSessionId ||
				!session.transcriptPath ||
				this.claimedNative.has(session.id)
			)
				continue;
			const ref = this.sessions.managedRef(session.id);
			if (!ref) continue;
			this.claimedNative.add(session.id);
			void this.nativeResume()
				.guard({
					provider: session.agentId,
					nativeSessionId: session.nativeSessionId,
					transcriptPath: session.transcriptPath,
					spaceId: ref.spaceId,
					sessionId: ref.sessionId,
					runtime: ref,
				})
				.catch((error: unknown) => {
					// A refusal (someone else holds it) is final; any other failure is transient and retried.
					if (!(error instanceof NativeResumeError)) this.claimedNative.delete(session.id);
				});
		}
	}
	private vaultSessionOf(row: NativeSessionSummary): VaultSession {
		let env: Record<string, string> = {};
		try {
			const parsed: unknown = JSON.parse(row.accountKey || '{}');
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
				env = Object.fromEntries(
					Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
				);
		} catch {
			env = {};
		}
		return {
			agentId: row.agentId as VaultSessionAgent,
			title: this.workspaceHistoryService().meta(row.key).title || row.title,
			cwd: row.cwd,
			sessionId: row.sessionId,
			transcriptPath: row.transcriptPath || undefined,
			modifiedAtMs: row.modifiedAtMs,
			env,
		};
	}
	private async resumeContext(row: NativeSessionSummary) {
		await this.prepare();
		const session = this.vaultSessionOf(row);
		const settings = launchSettings(structuredClone(this.settings.get()));
		return { session, settings, path: (await loginShellPath()) ?? '' };
	}
	/**
	 * Resume an EXISTING Session as a new runtime generation. The Session record, Space and identity are the
	 * caller's; this never calls requireSpace or creates a record.
	 */
	private async launchExistingResume(
		request: { spaceId: string; session: SessionRecord; row: NativeSessionSummary; foreground: boolean },
		reserved: (runtimeId: string) => void,
	): Promise<{ runtimeId: string } | undefined> {
		const context = await this.resumeContext(request.row);
		const session = context.session;
		const intent: ForegroundIntent = request.foreground
			? this.foregroundIntent()
			: { valid: () => false, dispose: () => {} };
		let runtime: ManagedRuntimeRef | undefined;
		try {
			const admission = await this.spaces.prepareSession(
				request.spaceId,
				{
					kind: 'agent',
					title: request.session.title,
					agentId: request.session.agentId,
					accountId: request.session.accountId ?? '',
					nativeSessionId: session.sessionId,
					transcriptPath: session.transcriptPath,
				},
				request.session.id,
			);
			runtime = this.sessions.reserveManaged(admission.record);
			reserved(runtime.runtimeId);
			let result: TerminalSession | undefined;
			const launchHost = this.captureLaunchHost(async (launch) => {
				result = await this.startAdmitted(launch, { tab: true }, admission, runtime!, intent);
			});
			launchHost.path = context.path;
			launchHost.getAgentSettings = () => context.settings;
			launchHost.interactive = request.foreground;
			launchHost.managed = true;
			launchHost.intent = intent;
			launchHost.validateCwd = async (cwd) => {
				if (!(await samePath(cwd, admission.cwd)))
					throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
				await admission.beforeSpawn();
			};
			await resumeAgent(launchHost, session);
			if (!result) {
				this.sessions.failManaged(runtime, undefined, true);
				return undefined;
			}
			return { runtimeId: runtime.runtimeId };
		} catch (cause) {
			if (runtime && !this.stopped && !this.sessions.get(runtime.runtimeId)?.running)
				this.sessions.failManaged(runtime, normalizeManagedFailure(cause));
			throw cause;
		} finally {
			intent.dispose();
		}
	}

	/** Agents turned on in settings, in catalog order. */
	enabledAgents(): Array<{ id: AgentId; title: string }> {
		const agents = this.agentSettings().agents;
		return AGENT_CATALOG.filter((agent) => agents[agent.id]?.enabled).map((agent) => ({
			id: agent.id,
			title: agent.title,
		}));
	}

	/**
	 * Providers whose usage is read and shown: a CLI was found on this device and its usage analysis is switched on
	 * (Settings > Agents > Usage). Missing or switched-off providers appear nowhere, including the status bar.
	 */
	usageAgents(): AgentId[] {
		return usageAgentIds(this.settings.get(), this.agents.store.getState().detected);
	}

	private usageScope = '';
	/** When the shown providers change (detection finished, a switch flipped), restart the reader for the new set. */
	private syncUsageScope(): void {
		const scope = this.usageAgents().join(',');
		if (scope === this.usageScope) return;
		this.usageScope = scope;
		this.usage.setPinned(false);
		this.usage.invalidate(true);
	}

	usagePinned(): boolean {
		return this.settings.get().agents.showUsageInStatusBar && this.usageAgents().length > 0;
	}

	shells(): ShellOption[] {
		this.shellOptions ??= availableShells();
		return this.shellOptions;
	}

	/** Theme colors for color queries, read from the workspace at most once a second. */
	private themeColors() {
		const settings = this.settings.get();
		const now = Date.now();
		if (now - this.colorsReadAt > 1000) {
			this.colorsReadAt = now;
			const body = this.app.workspace.containerEl.doc.body;
			this.colors = {
				foreground: cssColor(body, 'color') || this.colors.foreground,
				background:
					cssColor(this.app.workspace.containerEl, 'background-color') ||
					cssColor(body, 'background-color') ||
					this.colors.background,
				cursor: cssColor(body, 'caret-color') || cssColor(body, 'color') || this.colors.cursor,
			};
		}
		return {
			foreground: settings.useObsidianTheme
				? this.colors.foreground
				: settings.foreground || this.colors.foreground,
			background: settings.useObsidianTheme
				? this.colors.background
				: settings.background || this.colors.background,
			cursor: this.colors.cursor,
		};
	}

	/** Explicit Agent use prepares accounts and discovery once; activation itself stays passive. */
	async prepare(): Promise<void> {
		if (this.stopped) throw new Error('The terminal module is off');
		this.preparing ??= (async () => {
			await this.dialogs.prepare?.();
			if (this.stopped) throw new Error('The terminal module is off');
			await loginShellEnvironment();
			if (this.stopped) throw new Error('The terminal module is off');
			await this.adoptLegacyDefaultAccounts();
			await this.agents.refresh();
			// Space lists (choices, `has`) must not be read before the store has loaded, or a valid Space looks missing.
			await this.spaces.ready.catch(() => undefined);
			if (this.stopped) throw new Error('The terminal module is off');
		})().catch((error: unknown) => {
			this.preparing = undefined;
			throw error;
		});
		return this.preparing;
	}

	/** User-selected stable target; focus/current Space changes never rewrite this capture. */
	async terminalControl(
		request: Readonly<ControlRequest>,
		options: Readonly<{
			signal: AbortSignal;
			after?: Readonly<ActivityWaitBaseline>;
			progress?: (value: ControlProgress) => void;
		}>,
	) {
		const context = captureControlExecutionContext(options.signal, request.timeoutMs);
		const captured = Object.freeze({
			...request,
			target: Object.freeze({ ...request.target }),
			params: Object.freeze({ ...request.params }),
		});
		const after =
			options.after &&
			Object.freeze({
				...options.after,
				at: Object.freeze({ ...options.after.at }),
				...(options.after.source ? { source: Object.freeze({ ...options.after.source }) } : {}),
			});
		if (captured.target.runtimeId && captured.target.sessionId && captured.target.spaceId)
			this.sessions.checkManaged({
				spaceId: captured.target.spaceId,
				sessionId: captured.target.sessionId,
				runtimeId: captured.target.runtimeId,
			});
		const scope = await observeControlPreparation(context, () => this.spaces.getControlScope());
		const owner = await observeControlPreparation(context, () => this.ensureControl());
		return owner.router.invokeLocal(captured, scope, context, after, options.progress);
	}

	private ensureControl(): Promise<{ environment: ControlEnvironment; router: ControlRouter }> {
		if (this.stopped)
			return Promise.reject(new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none'));
		if (this.controlRetirementPending)
			return Promise.reject(new NativeControlError('BUSY', t('agent.control.unavailable')));
		return (this.controlSetup ??= (async () => {
			const [{ ControlEnvironment: Environment }, { ControlCommands }, { ControlRouter: Router }] =
				await Promise.all([
					import('../platform/desktop/control/environment'),
					import('./control/commands'),
					import('./control/router'),
				]);
			if (this.stopped) throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'), 'none');
			const router = new Router(
				new ControlCommands(this.spaces, this.workspace, this.sessions, this.inbox, this.historyControl()),
			);
			const environment = new Environment({
				native: this.context.native,
				scope: () => this.spaces.getControlScope(),
				capture: (call, scope) => router.capture(call, scope),
				closed: () => this.retireControl(environment),
			});
			return (this.controlOwner = { environment, router });
		})());
	}
	private retireControl(environment: ControlEnvironment): void {
		const owner = this.controlOwner;
		if (this.stopped || !owner || owner.environment !== environment) return;
		// Reserve retirement before invoking any callback: synchronous close may reenter the controller.
		this.controlRetirementPending = true;
		this.controlOwner = undefined;
		this.controlSetup = undefined;
		const settlement = Promise.allSettled([owner.router.close(), owner.environment.close()]).then((results) => {
			const failures = results.flatMap((row) => (row.status === 'rejected' ? [row.reason as unknown] : []));
			if (failures.length) throw new AggregateError(failures, t('agent.managed.shutdownIncomplete'));
		});
		this.controlRetiring = settlement;
		const finished = () => {
			if (this.controlRetiring === settlement) {
				this.controlRetiring = undefined;
				this.controlRetirementPending = false;
			}
		};
		void settlement.then(finished, (error: unknown) => {
			this.controlRetirementFailure ??= error;
			this.controlRetirementFailureCount = Math.min(
				Number.MAX_SAFE_INTEGER,
				this.controlRetirementFailureCount + 1,
			);
			finished();
			report(error);
		});
	}
	private async routeControlEnvironment(ref: ManagedRuntimeRef, lease: NativeLease): Promise<RoutedEnvironment> {
		try {
			return await (await this.ensureControl()).environment.routeEnvironment(ref, lease);
		} catch (cause) {
			if (cause instanceof NativeControlError) {
				const failure = managedFailure(
					cause.code === 'CAPACITY_EXCEEDED'
						? 'INVALID_ARGUMENT'
						: cause.code === 'PROTOCOL_MISMATCH' ||
							  cause.code === 'INPUT_NOT_READY' ||
							  cause.code === 'BUSY' ||
							  cause.code === 'INVALID_IMPORT'
							? 'SOURCE_UNAVAILABLE'
							: cause.code,
					'control-unavailable',
				);
				throw new ManagedLaunchError(
					{ ...failure, details: { ...failure.details, controlCode: cause.code } },
					cause.effect,
				);
			}
			throw cause;
		}
	}
	/** Only a deliberate workbench entry registers the local CLI; settings/activation remain passive. */
	async prepareWorkbench(): Promise<void> {
		await this.prepare();
		await (await this.ensureControl()).environment.prepare();
	}

	private cliProvider?: Promise<import('../platform/desktop/control/cli-environment').CliEnvironment>;
	private cliEnvironment() {
		return (this.cliProvider ??= import('../platform/desktop/control/cli-environment').then(
			({ CliEnvironment, CLI_LAUNCH_WAIT_MS }) => new CliEnvironment(async () => this.context.native.cli?.(), CLI_LAUNCH_WAIT_MS, this.app.workspace.containerEl.win),
		));
	}

	/** State of the `huhu` command-line tool for the settings page; no notice, the page explains it itself. */
	async checkCli(): Promise<NativeCliState> {
		const found = (await this.context.native.cli?.({ notify: false })) ?? {
			state: 'unavailable' as const,
			reason: 'unsupported-host',
			text: '',
		};
		// A host that could not even load reports no text; the page must still answer the click.
		const state = found.text ? found : { ...found, text: t('agent.settings.cliUnavailable') };
		(await this.cliEnvironment()).remember(state);
		return state;
	}

	/** Install or verify the helper and start it; resolves to its version. */
	async checkHelper(): Promise<string> {
		return (await this.sessions.ensureHelper()).version;
	}

	/** Show the agent page (in the main window's workbench by default). */
	async open(target: WorkbenchTarget = { feature: 'terminal', section: 'running' }): Promise<void> {
		await this.prepareWorkbench();
		await this.context.shell.open(target, this.app.workspace.getMostRecentLeaf()?.view.containerEl.win);
	}

	/** Put a session on screen: its tab becomes active (a new tab when it has none). */
	show(id: string): void {
		const ref = this.sessions.managedRef(id);
		if (ref) {
			void this.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId }).then((result) => {
				if (result.status === 'failed') report(t(result.error.messageKey));
			});
			return;
		}
		const session = this.sessions.get(id);
		if (session) {
			this.workspace.attach(session);
			this.workspace.focusSession(id);
		}
	}

	/** Legacy interactive launch; T-14 migrates noninteractive consumers through the strict managed use case. */
	async start(
		request: LaunchRequest & { kind?: 'shell' | 'agent' | 'preset'; input?: string },
		placement: Placement = { tab: true },
	): Promise<TerminalSession | undefined> {
		return this.admitLegacyLaunch(
			{
				kind: request.agentId ? 'agent' : 'shell',
				title: request.title,
				agentId: request.agentId,
				accountId: request.env.HUHU_ACCOUNT_NAME,
			},
			async (admission, runtime, intent) => {
				return this.startAdmitted(request, placement, admission, runtime, intent);
			},
		);
	}
	/**
	 * Admit a one-shot business run (automation agent/script, prompt runner) into its explicit Space: the Session is
	 * saved first, the runtime reserved, and the spawn re-checks the Space. Never chooses a Space and never asks.
	 */
	private async admitBusiness(request: BusinessAdmissionRequest, signal?: AbortSignal): Promise<BusinessAdmission> {
		if (this.stopped) throw new ManagedLaunchError(managedFailure('MODULE_INACTIVE', 'module-off'));
		signal?.throwIfAborted();
		const space = await this.spaces.requireSpace(request.spaceId);
		if (!space) throw new SpaceError('TARGET_REQUIRED', 'space-required');
		const admission = await this.spaces.prepareSession(space.id, {
			kind: request.kind,
			title: request.title,
			agentId: request.agentId,
			accountId: request.accountId,
		});
		const runtime = this.sessions.reserveManaged(admission.record);
		this.businessRuntimes.add(runtime.runtimeId);
		const settle = (error?: ManagedFailureInput, cancelled = false) => {
			this.businessRuntimes.delete(runtime.runtimeId);
			try {
				if (!this.stopped && !this.sessions.get(runtime.runtimeId)?.running)
					this.sessions.failManaged(runtime, error, cancelled);
			} catch {
				/* already settled by the session owner */
			}
		};
		return {
			cwd: admission.cwd,
			runtime,
			beforeSpawn: admission.beforeSpawn,
			created: (session) => {
				this.businessRuntimes.delete(runtime.runtimeId);
				if (session.connection === 'failed') settle(normalizeManagedFailure(session.failureCause));
				else if (session.connection === 'disconnected')
					settle(managedFailure('EFFECT_UNKNOWN', 'spawn-result-lost'));
			},
			abandon: (cause) => (signal?.aborted ? settle(undefined, true) : settle(normalizeManagedFailure(cause))),
		};
	}
	/** Active Spaces for a legacy entry to bind to; read-only. */
	spaceChoices(): Array<{ id: string; name: string; directoryLabel: string }> {
		const records = this.spaces.store.getState().records;
		return this.spaces.list().map((space) => ({
			id: space.id,
			name: space.name,
			directoryLabel:
				space.directory.kind === 'vault'
					? space.directory.target.canonicalPath
					: (records.grants[space.directory.grantId]?.selectedPath ?? ''),
		}));
	}
	private async admitLegacyLaunch(
		input: Omit<SessionRecord, 'id' | 'spaceId' | 'createdAt'>,
		launch: (
			admission: SessionAdmission,
			runtime: ManagedRuntimeRef,
			intent: ForegroundIntent,
		) => Promise<TerminalSession | undefined>,
	): Promise<TerminalSession | undefined> {
		const space = await this.spaces.requireSpace(undefined, { interactive: true });
		if (!space || this.stopped) return undefined;
		const intent = this.foregroundIntent();
		let runtime: ManagedRuntimeRef | undefined;
		try {
			const admission = await this.spaces.prepareSession(space.id, input);
			runtime = this.sessions.reserveManaged(admission.record);
			const session = await launch(admission, runtime, intent);
			if (!session) this.sessions.failManaged(runtime, undefined, true);
			return session;
		} catch (cause) {
			if (runtime && !this.stopped && !this.sessions.get(runtime.runtimeId)?.running)
				this.sessions.failManaged(runtime, normalizeManagedFailure(cause));
			throw cause;
		} finally {
			intent.dispose();
		}
	}
	private async startAdmitted(
		request: LaunchRequest & { kind?: 'shell' | 'agent' | 'preset'; input?: string },
		_placement: Placement,
		admission: SessionAdmission,
		runtime: ManagedRuntimeRef,
		intent: ForegroundIntent,
	): Promise<TerminalSession> {
		const before = this.workspace.store.getState();
		const session = await this.sessions.create({
			...request,
			runtime,
			beforeSpawn: admission.beforeSpawn,
			kind: request.kind ?? (request.agentId ? 'agent' : 'shell'),
			cwd: admission.cwd,
			hooks: !!request.agentId && this.settings.get().statusHooks,
		});
		if (session.connection === 'failed')
			this.sessions.failManaged(runtime, normalizeManagedFailure(session.failureCause));
		else if (session.connection === 'disconnected')
			this.sessions.failManaged(runtime, managedFailure('EFFECT_UNKNOWN', 'spawn-result-lost'));
		if (session.connection === 'connected' && intent.valid() && this.workspace.store.getState() === before) {
			const attached = await this.workspace.attachManaged(runtime, { expectedRuntimeId: runtime.runtimeId });
			if (attached.status === 'attached' && intent.valid())
				await this.context.shell.open({ feature: 'terminal', section: 'running', resourceId: session.id });
		}
		if (request.input && session.connection === 'connected') void this.typeWhenReady(session, request.input);
		return session;
	}

	/** Agents require input readiness; plain shells retain the existing five-second fallback. */
	private async typeWhenReady(session: TerminalSession, text: string): Promise<void> {
		const result = await submitInteractivePrompt(
			session,
			text,
			this.app.workspace.containerEl.win,
			!!session.agentId,
		);
		if (result.status === 'not-ready' && session.running) report(t('agent.quick.notReady'));
		else if (result.status === 'unknown') report(t('agent.screen.inputUnknown'));
		else if (result.status === 'none') report(session.error ?? t('agent.screen.inputClosed'));
	}

	private launchHost(placement: Placement): LaunchHost {
		return {
			app: this.app,
			getVaultPath: () => this.vaultPath(),
			getAgentSettings: () => this.agentSettings(),
			saveAgentSettings: (agents) =>
				this.settings.update((draft) => {
					draft.agents.yoloAcknowledgedAgents = [
						...new Set([
							...(draft.agents.yoloAcknowledgedAgents ?? []),
							...(agents.yoloAcknowledgedAgents ?? []),
						]),
					];
				}),
			start: async (request) => {
				await this.start(request, placement);
			},
		};
	}

	async newShell(choice?: ShellChoice, placement: Placement = { tab: true }): Promise<TerminalSession | undefined> {
		if ('split' in placement) {
			await this.workspace.splitPane(placement.split.from, placement.split.direction);
			return this.target();
		}
		const id = await this.workspace.newTerminal({ shell: choice });
		return id ? this.sessions.get(id) : undefined;
	}

	async newAgent(agentId: AgentId, _placement: Placement = { tab: true }): Promise<void> {
		await this.workspace.newAgent(agentId);
	}

	/**
	 * Run a saved quick command inside a Space. A passed or saved (vault-scope) Space is used exactly; an unavailable
	 * one rejects instead of moving to another Space. With none, the existing Space chooser opens and cancelling
	 * starts nothing and records nothing.
	 */
	async runQuickCommand(command: QuickCommand, groupId?: string, options: { spaceId?: string } = {}): Promise<void> {
		await this.prepare();
		const spaceId = options.spaceId || (command.scope === 'vault' ? command.spaceId : undefined) || undefined;
		// The saved directory keeps its meaning and is checked exactly like an automation's: resolved against the vault,
		// canonicalised (symlinks, case) and compared with the real vault root. Empty or the whole vault means the
		// Space directory, a narrower folder inside the Space is honoured, anything else is refused.
		const vault = this.vaultPath();
		let cwd: string | undefined;
		let cwdScope: { vaultRoot: string; platform: NodeJS.Platform } | undefined;
		if (command.cwd) {
			cwd = resolveRequestedCwd(vault, command.cwd);
			if (vault) {
				try {
					cwd = await canonicalVaultCwd(vault, cwd);
					cwdScope = {
						vaultRoot: await canonicalVaultCwd(vault, vault),
						platform: runtimeProcess().platform,
					};
				} catch (error) {
					// A folder that is gone or cannot be read is its own problem, not an authorization one.
					if (error instanceof Error && typeof (error as { code?: unknown }).code === 'string')
						throw new Error(t('agent.quick.cwdMissing'), { cause: error });
					throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'cwd-outside-space');
				}
			}
		}
		let session: TerminalSession | undefined;
		if (command.type === 'agent') {
			const agentId = command.agentId ?? this.agents.list()[0]?.id;
			if (!agentId) return;
			const id = await this.workspace.newAgent(agentId, { cwd, cwdScope, groupId, spaceId });
			session = id ? this.sessions.get(id) : undefined;
		} else {
			const id = await this.workspace.newTerminal({ cwd, cwdScope, groupId, spaceId });
			session = id ? this.sessions.get(id) : undefined;
		}
		if (!session) return;
		await this.typeWhenReady(session, command.content);
		await this.settings.update((draft) => {
			draft.lastQuickCommand = command.id;
		});
	}

	async addAccount(id: AgentId, name: string) {
		if (!name.trim() || name === LEGACY_VAULT_ACCOUNT) throw new Error(t('agent.accountInvalid'));
		await accountEnv(getAgent(id), name, this.vaultPath() ?? '', deviceId(this.app));
		await this.settings.update((d) => {
			d.accounts[id] = [...new Set([...(d.accounts[id] ?? []), name])];
		});
	}
	/** Where the system account's login lives for this provider, home-relative where possible. */
	systemAccountLocation(id: AgentId): string {
		return systemAccountLocation(id, userHome());
	}
	async selectAccount(id: AgentId, name: string) {
		await this.settings.update((d) => {
			d.agents.agents[id].accountId = name;
		});
		void this.historyStore.refresh();
	}
	async removeAccount(id: AgentId, name: string) {
		if (!(await this.confirm(t('agent.manage.removeAccount', { name })))) return;
		await this.settings.update((d) => {
			d.accounts[id] = (d.accounts[id] ?? []).filter((n) => n !== name);
			if (d.agents.agents[id].accountId === name) d.agents.agents[id].accountId = '';
		});
	}

	async resumeCommand(row: NativeSessionSummary): Promise<string> {
		const id = row.agentId as AgentId,
			settings = this.agentSettings();
		const vault = this.vaultPath() ?? '',
			cwd = await canonicalVaultCwd(vault, row.cwd);
		const saved: unknown = JSON.parse(row.accountKey);
		if (
			!saved ||
			typeof saved !== 'object' ||
			Array.isArray(saved) ||
			Object.values(saved).some((value) => typeof value !== 'string')
		)
			throw new Error(t('agent.accountScopeMismatch'));
		const { env, transcriptPath } = await restoredAccountReference(
			getAgent(id),
			saved as Record<string, string>,
			vault,
			deviceId(this.app),
			row.transcriptPath,
		);
		await checkAccountTranscript(vault, env, transcriptPath);
		return formatResumeCommand(
			{
				file: settings.agents[id].cliPath || getAgent(id).detectCommand,
				args: resumeArgs(
					id,
					id === 'pi' ? transcriptPath! : row.sessionId,
					accountArgs(id, launchArgs(settings, id), env),
				),
				env: { ...settings.agents[id].env, ...env },
				cwd,
			},
			Platform.isWin,
		);
	}
	async openHistoryPath(row: NativeSessionSummary, kind: 'log' | 'reveal' | 'cwd') {
		if (kind === 'reveal') await revealPath(row.transcriptPath);
		else await openPath(kind === 'cwd' ? row.cwd : row.transcriptPath);
	}
	async resumeAt(row: NativeSessionSummary, groupId?: string, split?: 'right' | 'down') {
		const before = new Set(Object.keys(this.workspace.store.getState().tabs));
		await this.resume(row);
		const tab = Object.values(this.workspace.store.getState().tabs).find((tab) => !before.has(tab.id));
		if (tab && groupId)
			this.workspace.move(
				tab.id,
				split ? { split, ofGroupId: groupId } : { groupId, index: Number.MAX_SAFE_INTEGER },
			);
	}

	/**
	 * Continue a native conversation from history (GUI). A row not yet bound to a Space needs an explicit Space
	 * first; cancelling the chooser changes nothing. Returns undefined when the user cancelled.
	 */
	async resume(row: NativeSessionSummary): Promise<ResumeResult | undefined> {
		const service = this.nativeResume();
		let spaceId = row.sourceRef ? this.spaces.historySpaceFor(row.sourceRef) : undefined;
		if (!spaceId) {
			const space = await this.spaces.requireSpace(undefined, { interactive: true });
			if (!space || this.stopped) return undefined;
			// Every pre-spawn check runs against the chosen Space BEFORE anything is persisted: a refused
			// continue must not leave an irreversible import behind.
			await service.preflight({ spaceId: space.id, row });
			await service.importSource({ spaceId: space.id, row });
			spaceId = space.id;
		}
		return service.resumeSource({ spaceId, row, foreground: true });
	}
	/** Explicitly bind an unassigned history row to a Space the user chooses. Undefined when cancelled. */
	async importHistory(row: NativeSessionSummary, spaceId?: string): Promise<ImportResult | undefined> {
		const space = spaceId
			? this.spaces.resolve({ spaceId })
			: await this.spaces.requireSpace(undefined, { interactive: true });
		if (!space || this.stopped) return undefined;
		return this.nativeResume().importSource({ spaceId: space.id, row });
	}

	/** Split a pane with a new session of the default shell. */
	async splitSession(id: string, direction: SplitDirection): Promise<void> {
		await this.workspace.splitPane(id, direction);
	}
	async closeSession(id: string, confirmRunning = true): Promise<void> {
		await this.workspace.closePane(id, (message) =>
			confirmRunning ? this.confirm(message) : Promise.resolve(true),
		);
	}
	async closeTab(tabId: string): Promise<void> {
		await this.workspace.close(tabId, (message) => this.confirm(message));
	}
	private confirm(message: string): Promise<boolean> {
		return this.dialogs.confirm(this.app, message);
	}
	target(): TerminalSession | undefined {
		const tab = this.workspace.active;
		const focused = tab?.kind === 'terminal' ? this.sessions.get(tab.focusedSessionId) : undefined;
		return focused?.running ? focused : this.sessions.focused;
	}

	private foregroundIntent(): ForegroundIntent {
		const leaf = this.app.workspace.getMostRecentLeaf();
		const element = leaf?.view.containerEl ?? this.app.workspace.containerEl;
		return captureForegroundIntent({
			document: element.doc,
			container: element,
			window: element.win,
			isCurrent: () => !this.stopped && this.app.workspace.getMostRecentLeaf() === leaf,
			onTargetChange: (listener) => {
				const ref = this.app.workspace.on('active-leaf-change', listener);
				return () => this.app.workspace.offref(ref);
			},
		});
	}
	private workspaceLaunchPort(): WorkspaceLaunchPort {
		const settings = structuredClone(this.settings.get()),
			agents = launchSettings(settings);
		return {
			capture: () => this.workspaceLaunchPort(),
			foreground: () => this.foregroundIntent(),
			show: (id) =>
				this.context.shell.open(
					{ feature: 'terminal', section: 'running', resourceId: id },
					this.app.workspace.getMostRecentLeaf()?.view.containerEl.win,
				),
			shell: (options) => {
				const shell = resolveShell(options.shell ?? settings.shell, settings);
				return this.sessions.create({
					runtime: options.runtime,
					beforeSpawn: options.beforeSpawn,
					kind: 'shell',
					file: shell.file,
					args: shell.args,
					title: shell.title,
					cwd: options.cwd ?? sessionDirectory(this.vaultPath(), settings.startInVault),
					env: {},
				});
			},
			agent: async (id, options) => {
				await this.prepare();
				let session: TerminalSession | undefined;
				const host = this.captureLaunchHost(async (request) => {
					session = await this.sessions.create({
						...request,
						runtime: options.runtime,
						beforeSpawn: options.beforeSpawn,
						kind: 'agent',
						hooks: settings.statusHooks,
					});
					if (options.prompt && session.connection === 'connected')
						void this.typeWhenReady(session, options.prompt);
				});
				host.path = (await loginShellPath()) ?? '';
				host.getAgentSettings = () => agents;
				host.managed = !!options.runtime;
				host.interactive = options.interactive;
				host.intent = options.intent;
				await launchAgent(host, id, options);
				return session;
			},
			resume: (info, title, beforeSpawn, context) =>
				this.restoreSession(info, title, beforeSpawn, { ...context, agents }),
			account: (id) => agents.agents[id].accountId,
			report,
		};
	}

	private captureLaunchHost(start: (request: LaunchRequest) => Promise<void>): LaunchHost {
		return { ...this.launchHost({ tab: true }), start };
	}
	private async restoreSession(
		info: ResumeInfo,
		title: string,
		beforeSpawn?: () => Promise<void>,
		context?: {
			runtime?: ManagedRuntimeRef;
			interactive?: boolean;
			intent?: ForegroundIntent;
			agents?: AgentSettings;
		},
	): Promise<TerminalSession | undefined> {
		await this.prepare();
		if (!info.agentId || !info.nativeSessionId) throw new Error(t('agent.sessionMissing'));
		const vault = this.vaultPath();
		if (!vault) throw new Error(t('agent.vaultMissing'));
		let accountId = info.accountId ?? '';
		// A session saved while the vault default account existed resumes in that directory.
		if (
			accountId === '' &&
			info.transcriptPath &&
			(await inLegacyDefaultAccount(vault, deviceId(this.app), info.agentId, info.transcriptPath))
		)
			accountId = LEGACY_VAULT_ACCOUNT;
		const env = await accountEnv(getAgent(info.agentId), accountId, vault, deviceId(this.app), false);
		let transcriptPath = info.transcriptPath;
		if (!transcriptPath) {
			const history = this.workspaceHistoryService();
			await history.scan();
			const page = await history.query(info.nativeSessionId, 0, undefined, 'all');
			transcriptPath = page.rows.find(
				(row) => row.sessionId === info.nativeSessionId && row.cwd === info.cwd,
			)?.transcriptPath;
		}
		if (!transcriptPath) throw new Error(t('agent.sessionMissing'));
		// Every HUHU path that resumes a native conversation takes the same machine-wide claim first.
		if (!context?.runtime || !info.spaceId || !info.persistentSessionId)
			throw new ManagedLaunchError(managedFailure('SOURCE_UNAVAILABLE', 'resume-source-unavailable'), 'none');
		// Key on the same transcript spelling the spawn will use (an account may remap it, e.g. a moved vault).
		const claimed = await restoredAccountReference(
			getAgent(info.agentId),
			env,
			vault,
			deviceId(this.app),
			transcriptPath,
		);
		await this.nativeResume().guard({
			provider: info.agentId,
			nativeSessionId: info.nativeSessionId,
			transcriptPath: claimed.transcriptPath ?? transcriptPath,
			spaceId: info.spaceId,
			sessionId: info.persistentSessionId,
			runtime: context.runtime,
		});
		let result: TerminalSession | undefined;
		const host = this.captureLaunchHost(async (request) => {
			result = await this.sessions.create({
				...request,
				runtime: context?.runtime,
				beforeSpawn,
				kind: 'agent',
				hooks: this.settings.get().statusHooks,
			});
		});
		host.path = (await loginShellPath()) ?? '';
		if (context?.agents) host.getAgentSettings = () => context.agents!;
		host.interactive = context?.interactive;
		host.intent = context?.intent;
		host.managed = !!context?.runtime;
		if (beforeSpawn)
			host.validateCwd = async (cwd) => {
				if (cwd !== info.cwd) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
				await beforeSpawn();
			};
		await resumeAgent(host, {
			agentId: info.agentId,
			sessionId: info.nativeSessionId,
			cwd: info.cwd,
			title,
			transcriptPath,
			modifiedAtMs: 0,
			env,
		});
		return result;
	}

	/** Paste into one session and do not press Enter. */
	pasteInto(id: string, text: string): boolean {
		const session = this.sessions.get(id);
		if (!session) return false;
		session.paste(text);
		this.show(id);
		return true;
	}

	/** Paste text into the target session (no Enter). */
	send(text: string): boolean {
		const session = this.target();
		if (!session) {
			new Notice(t('agent.noTerminal'));
			return false;
		}
		session.paste(text);
		this.show(session.id);
		return true;
	}

	/** Palette commands (removed with the module). */
	registerCommands(): void {
		const add = this.context.commands.add.bind(this.context.commands);
		for (const action of [
			'newAgent',
			'newBrowser',
			'newMenu',
			'close',
			'reopen',
			'next',
			'previous',
			'recent',
			'splitRight',
			'splitDown',
		] as const) {
			const nameKey = `agent.workspace.cmd.${action}`;
			add({
				id: `workspace-${action}`,
				name: t(nameKey),
				nameKey,
				callback: () => {
					void (async () => {
						await this.open();
						const tab = this.workspace.active;
						if (action === 'newAgent') {
							const agent = this.agents.list()[0];
							if (agent) await this.workspace.newAgent(agent.id);
						} else if (action === 'newBrowser') this.workspace.newBrowser();
						else if (action === 'newMenu') this.workspace.requestMenu();
						else if (action === 'close' && tab && !tab.pinned) await this.closeTab(tab.id);
						else if (action === 'reopen') this.workspace.reopen();
						else if (action === 'next' || action === 'previous')
							this.workspace.next(action === 'next' ? 1 : -1);
						else if (action === 'recent') this.workspace.recent();
						else if (tab && (action === 'splitRight' || action === 'splitDown')) {
							const group = this.workspace.group(tab.id);
							if (group)
								this.workspace.move(tab.id, {
									split: action === 'splitRight' ? 'right' : 'down',
									ofGroupId: group.id,
								});
						}
					})().catch(report);
				},
			});
		}
		for (const [id, section, nameKey] of [
			['agent-board', 'board', 'agent.workspace.nav.board'],
			['agent-history', 'history', 'agent.history'],
			['agent-jump', 'jump', 'agent.jump.title'],
		] as const)
			add({
				id,
				name: t(nameKey),
				nameKey,
				callback: () => {
					void this.open({ feature: 'terminal', section });
				},
			});
		add({
			id: 'agent-refresh-usage',
			name: t('shell.refreshUsage'),
			nameKey: 'shell.refreshUsage',
			callback: () => {
				void this.usageStore.refresh().catch(report);
			},
		});
		add({
			id: 'terminal-new',
			name: t('agent.cmd.newShell'),
			nameKey: 'agent.cmd.newShell',
			callback: () => {
				void this.newShell().catch(report);
			},
		});
		for (const agent of AGENT_CATALOG) {
			add({
				id: `terminal-new-${agent.id}`,
				name: t('agent.cmd.newAgent', { title: agent.title }),
				checkCallback: (checking) => {
					if (!this.settings.get().enabled[agent.id]) return false;
					if (!checking) void this.newAgent(agent.id).catch(report);
					return true;
				},
			});
		}
		add({
			id: 'terminal-switch',
			name: t('agent.cmd.switch'),
			nameKey: 'agent.cmd.switch',
			callback: () => {
				void this.open().then(() => this.workspace.requestMenu());
			},
		});
		const sendCommand = (
			id: string,
			nameKey: string,
			read: () => string | null | Promise<string | null>,
			missingKey: string,
		) =>
			add({
				id,
				name: t(nameKey),
				nameKey,
				callback: () => {
					void Promise.resolve(read()).then((text) => {
						if (!text) new Notice(t(missingKey));
						else this.send(text);
					});
				},
			});
		sendCommand(
			'terminal-send-selection',
			'agent.cmd.sendSelection',
			() => this.app.workspace.activeEditor?.editor?.getSelection() || null,
			'agent.noSelection',
		);
		sendCommand(
			'terminal-send-note',
			'agent.cmd.sendNote',
			async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return null;
				const editor = this.app.workspace.activeEditor;
				return editor?.file === file && editor.editor
					? editor.editor.getValue()
					: this.app.vault.cachedRead(file);
			},
			'agent.noNote',
		);
		sendCommand(
			'terminal-send-path',
			'agent.cmd.sendPath',
			() => {
				const file = this.app.workspace.getActiveFile();
				const vault = this.vaultPath();
				return file && vault
					? `${vault}${Platform.isWin ? '\\' : '/'}${Platform.isWin ? file.path.replace(/\//g, '\\') : file.path}`
					: null;
			},
			'agent.noNote',
		);
		sendCommand(
			'terminal-insert-reference',
			'agent.cmd.insertReference',
			() => {
				const text = collectReferences(this.app, 'absolute');
				return text ? `${text.split('\n').filter(Boolean).join(' ')} ` : null;
			},
			'agent.noReference',
		);
		add({
			id: 'terminal-usage',
			name: t('agent.cmd.usage'),
			nameKey: 'agent.cmd.usage',
			callback: () => {
				void this.open({ feature: 'terminal', section: 'usage' });
			},
		});
		add({
			id: 'terminal-settings',
			name: t('agent.cmd.settings'),
			nameKey: 'agent.cmd.settings',
			callback: () => {
				void this.context.shell.open({ feature: 'settings', section: 'terminal' });
			},
		});
	}

	/** Statuses for the workbench status bar (interactive sessions only). */
	status(): Array<{ id: string; status: 'running' | 'waiting'; automated: boolean }> {
		const managed = this.workspace.getManagedSnapshot().sessions.flatMap((row) =>
			row.agentId &&
			row.runtime?.phase === 'connected' &&
			['working', 'waiting', 'permission'].includes(row.runtime.activity)
				? [
						{
							id: row.runtime.runtimeId,
							status: row.runtime.activity === 'working' ? ('running' as const) : ('waiting' as const),
							automated: false,
						},
					]
				: [],
		);
		return [
			...managed,
			...Object.values(this.workspace.store.getState().tabs)
				.filter((tab) => tab.kind !== 'terminal' || !tab.sessionIds.some((id) => this.sessions.managedRef(id)))
				.flatMap((tab) =>
					tab.kind === 'terminal' && tab.agentId && ['working', 'waiting', 'permission'].includes(tab.state)
						? [
								{
									id: tab.focusedSessionId,
									status: tab.state === 'working' ? ('running' as const) : ('waiting' as const),
									automated: false,
								},
							]
						: [],
				),
		];
	}

	agentTitle(id: AgentId): string {
		return getAgent(id).title;
	}

	dispose(): Promise<void> {
		if (this.disposing) return this.disposing;
		this.stopped = true;
		const failures: unknown[] = [];
		let observationExpired = false;
		const pending = new Set<string>();
		const settle = (stage: string, cleanup: () => void | Promise<void>): Promise<void> => {
			pending.add(stage);
			let work: Promise<void>;
			try {
				work = Promise.resolve(cleanup());
			} catch (error) {
				work = Promise.reject(
					error instanceof Error ? error : new Error('Lifecycle cleanup failed', { cause: error }),
				);
			}
			return work.then(
				() => {
					pending.delete(stage);
				},
				(error: unknown) => {
					pending.delete(stage);
					if (!failures.includes(error)) failures.push(error);
				},
			);
		};
		const incomplete = () =>
			new AggregateError(
				[...failures, ...[...pending].map((stage) => ({ stage, pending: true, persisted: false }))],
				t('agent.managed.shutdownIncomplete'),
			);
		// Native cleanup must run even if an admitted registry/checkpoint write never settles.
		try {
			this.workspace.quiesce();
		} catch (error) {
			failures.push(error);
		}
		this.listeners.clear();
		const control = this.controlOwner;
		const controlClose = control?.environment.close();
		let managedDone: Promise<void> = Promise.resolve(),
			nativeDone: Promise<void> = Promise.resolve();
		const settlement = Promise.all([
			settle('control-retiring', () => this.controlRetiring),
			settle('control-retirement-errors', () => {
				if (this.controlRetirementFailure)
					throw new AggregateError(
						[this.controlRetirementFailure, { failureCount: this.controlRetirementFailureCount }],
						t('agent.managed.shutdownIncomplete'),
					);
			}),
			settle('control', async () => {
				const owner = control ?? (await this.controlSetup);
				const results = await Promise.allSettled([
					controlClose ?? owner?.environment.close(),
					owner?.router.close(),
				]);
				const errors = results.flatMap((row) => (row.status === 'rejected' ? [row.reason as unknown] : []));
				if (errors.length) throw new AggregateError(errors, t('agent.managed.shutdownIncomplete'));
			}),
			settle('registry', () => this.runtime.dispose()),
			(managedDone = settle('managed', () => this.workspace.drainManaged())),
			settle('layout', () => this.workspace.persistence.flush()),
			(nativeDone = settle('native', () => this.sessions.dispose())),
			settle('agents', () => this.agents.dispose()),
			settle('usage-store', () => this.usageStore.dispose()),
			// `historyStore` aliases `workspaceHistoryStore`; the shared store is disposed once, below.
			settle('history-store', () =>
				this.historyStore === this.workspaceHistoryStore ? undefined : this.historyStore.dispose(),
			),
			settle('workspace-usage', () => this.workspaceUsage.dispose()),
			settle('workspace-history', () => this.workspaceHistoryStore.dispose()),
			settle('stats', () => this.stats.dispose()),
			settle('materials', () => this.materials.dispose()),
			settle('prompts', () => this.prompts.dispose()),
			settle('inbox', () => this.inbox?.dispose()),
			// Machine-wide claims go last: only after the helper and managed runtimes have stopped, and only
			// those whose end is confirmed. A failed shutdown keeps its claims (owner liveness reclaims later).
			settle('native-resume', async () => {
				await Promise.all([managedDone, nativeDone]);
				await this.nativeResumeService?.dispose();
			}),
			settle('hooks', () => this.hooks.dispose()),
			settle('usage', () => this.usage?.dispose()),
			settle('history-service', async () => {}),
			settle('workspace-history-service', async () => {
				await this.workspaceHistory?.dispose();
			}),
		]).then(async () => {
			// Keep the original writer quarantined until every admitted write actually settles.
			await settle('writer', () => this.workspace.dispose());
			if (failures.length) throw incomplete();
		});
		void settlement.catch((error: unknown) => {
			if (observationExpired) report(error);
		});
		this.disposing = observeLifecycle(settlement, Date.now() + SHUTDOWN_OBSERVE_MS, () => {
			observationExpired = true;
			return incomplete();
		});
		return this.disposing;
	}
}

function report(error: unknown): void {
	new Notice(
		error instanceof ManagedLaunchError
			? t(error.failure.messageKey)
			: error instanceof SpaceError
				? spaceErrorMessage(error)
				: error instanceof Error
					? error.message
					: String(error),
	);
}
