import { Notice, Platform } from 'obsidian';
import * as nodePath from 'node:path';
import { AutomationError } from '../../../../../shared/automation/errors';
import type { AgentId } from '../../../core/launch/types';
import { piEditorArgumentGate } from './pi-editor-gate';
import { EVENT_PAYLOAD_SCRIPT, MAX_HOOK_INPUT_BYTES } from './event-payload';
import { getAgent } from '../../../core/launch/catalog';
import { resolveAccountEnv, runtimeHookRoot } from '../agents/accounts';
import { accountPaths, isSystemAccount } from '../agents/system-homes';
import { installSystemHooks, type SystemHookResult } from './system-hooks';
import { stripOwnedRows } from './hook-entries';
import { privatePathHasSymlink } from '../../../../../host/desktop/private-mode';
import { t } from '../../../../../shared/i18n/index';
import { HOOK_PUBLISHER_SCRIPT, hookSpool, type HookSpoolScope, type SpoolEvent } from './hook-spool';
import { writeHookSettings } from './settings-write';
import {
	ACTIVITY_LIMITS,
	activitySummaryAllowed,
	type RuntimeHooksRequest,
	type RuntimeActivityBinding,
	type PreparedRuntimeHooks,
	type ActivitySourceMeta,
	type ActivitySourceBinding,
	type ActivityObservation,
} from '../../../core/workspace/managed-runtime';

const installations = new Map<string, Promise<void>>();

/** Pi arguments only (exclude the Node/CLI entry). This checks enrollment, never adds user flags. */
export function piEditorArgumentsSupported(args: readonly string[], extension: string, cwd: string): boolean {
 return piEditorArgumentGate(args, extension, cwd, nodePath);
}

/** Host's captured+merged spawn environment only. Reads one bounded existing file; checks budget between I/O steps. */
export async function installedPiEditorExtension(
	env: Readonly<Record<string, string>>,
	options: Readonly<{ signal?: AbortSignal; deadline: number }>,
): Promise<string | undefined> {
	const end = Math.min(options.deadline, performance.now() + 2000);
	const current = () => !options.signal?.aborted && Number.isFinite(end) && performance.now() < end;
	if (!current()) return;
	const dir = Object.getOwnPropertyDescriptor(env, 'PI_CODING_AGENT_DIR');
	const home = Object.getOwnPropertyDescriptor(env, 'HOME');
	if (dir && (!('value' in dir) || typeof dir.value !== 'string')) return;
	if (home && (!('value' in home) || typeof home.value !== 'string')) return;
	const explicit: unknown = dir?.value, capturedHome: unknown = home?.value;
	const directory = typeof explicit === 'string' && explicit ? explicit :
		typeof capturedHome === 'string' && capturedHome ? nodePath.join(capturedHome, '.pi', 'agent') : undefined;
	if (typeof directory !== 'string' || directory.length > 4096 || directory.includes('\0') || !nodePath.isAbsolute(directory)) return;
	const target = nodePath.join(directory, 'extensions', 'huhu-status.ts');
	try {
		const { PI_EXTENSION } = await import('./native-extensions');
		await checkOwnedPath(target);
		if (!current()) return;
		const fs = await import('node:fs/promises');
		const before = await fs.lstat(target);
		if (!current() || !before.isFile() || before.isSymbolicLink()) return;
		const canonical = await fs.realpath(target);
		if (!current()) return;
		const handle = await fs.open(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
		try {
			const expected = Buffer.byteLength(PI_EXTENSION), info = await handle.stat();
			if (!current() || !info.isFile() || info.size !== expected || info.dev !== before.dev || info.ino !== before.ino) return;
			const body = Buffer.allocUnsafe(expected + 1);
			let size = 0;
			while (size <= expected) {
				const read = await handle.read(body, size, body.length - size, null);
				if (!read.bytesRead) break;
				size += read.bytesRead;
				if (!current()) return;
			}
			const after = await fs.lstat(target);
			if (current() && after.isFile() && !after.isSymbolicLink() && after.dev === info.dev && after.ino === info.ino &&
				size === expected && body.toString('utf8', 0, size) === PI_EXTENSION) return canonical;
		} finally { await handle.close(); }
	} catch { return; }
	return undefined;
}

async function checkOwnedPath(file: string): Promise<void> {
	if (await privatePathHasSymlink(file)) throw new Error('private-storage.symlink');
}

async function nodeModules() {
	if (!Platform.isDesktop) throw new AutomationError('agentUnavailable');
	return Promise.resolve([
		window.require('node:fs/promises') as typeof import('node:fs/promises'),
		window.require('node:os') as typeof import('node:os'),
		window.require('node:path') as typeof import('node:path'),
		window.require('node:process') as typeof import('node:process'),
	] as const);
}
export interface NativeHookEvent {
	event: string;
	at: number;
	data: Record<string, unknown>;
}
const SCRIPT_NAME = 'huhu-automation-hook.cjs';
// Generated for this account; it has no effect without this terminal's event token.
export const HOOK_SCRIPT = `const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = process.env.HUHU_HOOK_DIR, token = process.env.HUHU_HOOK_TOKEN;
if (!dir || !token) process.exit(0);
${EVENT_PAYLOAD_SCRIPT}
${HOOK_PUBLISHER_SCRIPT}
let ticket, release, chunks = [], bytes = 0, oversized = false, done = false, retry;
try { ticket = hookIngress(); } catch (error) { hookFault(error.message); }
function finish() { done = true; if (retry) clearTimeout(retry); chunks = []; if (ticket) { try { ticket.release(); } catch (error) { hookFault(error.message); } } }
const timeout = setTimeout(() => {
 if (release) { try { hookPublish('HookError', { huhu_answer_error: 'hookInputTimeout' }); } catch (error) { hookFault(error.message); } }
 else hookFault('hookCollectorTimeout');
 finish(); process.stdout.write('{}'); process.exit(0);
}, 3000);
function collect() {
 if (done) return;
 if (ticket) {
  try { if (!ticket.collect()) { retry = setTimeout(collect, 5); return; } release = true; }
  catch (error) { hookFault(error.message); finish(); }
 }
 process.stdin.setEncoding('utf8');
 process.stdin.on('data', data => {
  if (!release) return;
  bytes += Buffer.byteLength(data, 'utf8');
  if (bytes > ${MAX_HOOK_INPUT_BYTES}) { oversized = true; chunks = []; }
  else if (!oversized) chunks.push(data);
 });
 process.stdin.on('end', () => {
  if (release) {
   try {
    if (oversized) hookPublish('HookError', { huhu_answer_error: 'hookInputTooLarge' });
    else { const input = chunks.join(''); chunks = []; hookPublish(process.argv[2], eventData(JSON.parse(input || '{}')), undefined, process.argv[3]); }
   } catch (error) {
    if (error instanceof SyntaxError) { try { hookPublish('HookError', { huhu_answer_error: 'hookInputInvalid' }); } catch (failure) { hookFault(failure.message); } }
    else hookFault(error.message);
   }
  }
  clearTimeout(timeout); finish();
  // Supplies no approval or continuation decision.
  process.stdout.write('{}');
 });
}
collect();

`;

function quote(value: string): string {
	return `'${value.replace(/'/g, `'"'"'`)}'`;
}
function command(
	script: string,
	event: string,
	runtime: { platform: string; execPath: string },
	provider?: AgentId,
): string {
	return runtime.platform === 'win32'
		? `set "ELECTRON_RUN_AS_NODE=1" && "${runtime.execPath}" "${script}" ${event}${provider ? ' ' + provider : ''}`
		: `ELECTRON_RUN_AS_NODE=1 ${quote(runtime.execPath)} ${quote(script)} ${event}${provider ? ' ' + provider : ''}`;
}
export function mergeNativeHooks(
	value: unknown,
	script: string,
	events: string[],
	runtime = { platform: 'linux', execPath: 'node' },
	/** Replace only entries of this script; a real provider file can carry entries of other vaults. */
	own?: string,
	provider?: AgentId,
): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AutomationError('hookSettingsInvalid');
	const settings = value as Record<string, unknown>;
	if (
		settings.hooks !== undefined &&
		(!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks))
	)
		throw new AutomationError('hookSettingsInvalid');
	const hooks = { ...(settings.hooks as Record<string, unknown> | undefined) };
	for (const event of events) {
		const previous = hooks[event] ?? [];
		if (!Array.isArray(previous)) throw new AutomationError('hookSettingsInvalid');
		// Only our own command entries are replaced; a group shared with user commands keeps them.
		const { rows } = stripOwnedRows(previous as unknown[], (entry) => entry.includes(own ?? SCRIPT_NAME));
		hooks[event] = [
			...rows,
			{
				hooks: [
					{
						type: 'command',
						command: command(script, event, runtime, provider),
						timeout: events.includes('BeforeAgent') ? 5000 : 5,
					},
				],
			},
		];
	}
	return { ...settings, hooks };
}

/** Per-terminal event spool. Native events, never output silence, finish a turn. */
export class AutomationHooks {
	private disposed = false;
	private slots = new Set<HookSpoolScope>();
	private preparing = new Set<Promise<{ env: Record<string, string>; close(): Promise<void> }>>();
	private closing?: Promise<void>;
	private runtimes = new Map<string, { binding: RuntimeActivityBinding; pending: Promise<PreparedRuntimeHooks> }>();
	/** `strict`: a system configuration HUHU cannot update is an error (automations need the events); otherwise it is a notice. */
	constructor(
		private win: Window,
		private scope: () => { vault: string; device: string },
		private options: { strict?: boolean } = {},
	) {}
	prepare(
		agent: AgentId,
		env: Record<string, string>,
		receive: (event: NativeHookEvent) => void,
	): Promise<{ env: Record<string, string>; close(): Promise<void> }> {
		if (this.disposed || this.preparing.size >= 32) return Promise.reject(new AutomationError('agentUnavailable'));
		const pending = this.prepareSlot(agent, env, (row) =>
			receive({ event: row.event, at: row.at, data: row.data }),
		);
		this.preparing.add(pending);
		void pending.then(
			() => this.preparing.delete(pending),
			() => this.preparing.delete(pending),
		);
		return pending;
	}
	private async prepareSlot(
		agent: AgentId | undefined,
		env: Readonly<Record<string, string>>,
		receive: (event: SpoolEvent) => void,
		signal?: AbortSignal,
		revoke: () => void = () => {},
		valid: () => boolean = () => true,
		allocated: () => void = () => {},
		finalized: () => void = () => {},
	): Promise<{ env: Record<string, string>; close(): Promise<void> }> {
		const check = () => {
			if (this.disposed || signal?.aborted || !valid()) throw new AutomationError('agentUnavailable');
		};
		check();
		const [, , , nodeProcess] = await nodeModules();
		check();
		const scope = this.scope(),
			root = await runtimeHookRoot(scope.vault, scope.device);
		check();
		const pool = await hookSpool(this.win, root);
		check();
		let captured: HookSpoolScope | undefined;
		const slot = await pool.prepare(
			receive,
			(reason) =>
				receive({
					event: 'HookError',
					at: Date.now(),
					data: { huhu_answer_error: reason },
					delivery: crypto.randomUUID(),
				}),
			() => {
				if (captured) this.slots.delete(captured);
				finalized();
			},
		);
		allocated();
		let closed: Promise<void> | undefined;
		const close = () => {
			if (closed) return closed;
			let resolve!: () => void, reject!: (error: unknown) => void;
			closed = new Promise<void>((yes, no) => {
				resolve = yes;
				reject = no;
			});
			// Reentrancy and a consumer failure cannot skip the physical scope's cleanup.
			let failure: unknown;
			try {
				revoke();
			} catch (error) {
				failure = error;
			}
			signal?.removeEventListener('abort', abort);
			let physical: Promise<void>;
			try {
				physical = slot.close();
			} catch (error) {
				physical = Promise.reject(
					error instanceof Error ? error : new Error('Hook cleanup failed', { cause: error }),
				);
			}
			void physical.then(
				() => {
					if (captured) this.slots.delete(captured);
					if (failure) reject(failure);
					else resolve();
				},
				(error) =>
					reject(
						failure ? new AggregateError([failure, error], 'Hook revocation and cleanup failed') : error,
					),
			);
			// Observe immediately, including a close started while another preparation is pending.
			void closed.then(
				() => {},
				() => {},
			);
			return closed;
		};
		captured = { env: slot.env, close };
		this.slots.add(captured);
		const abort = () => {
			void close().catch(console.error);
		};
		signal?.addEventListener('abort', abort, { once: true });
		try {
			check();
			if (agent) {
				const owned = await resolveAccountEnv(getAgent(agent), env, scope.vault, scope.device);
				check();
				if (Object.entries(owned).some(([key, value]) => env[key] !== value))
					throw new Error(t('agent.accountScopeMismatch'));
				const key = owned.HUHU_ACCOUNT_ROOT!;
				const installation = (installations.get(key) ?? Promise.resolve())
					.catch(() => {})
					.then(() => {
						check();
						return this.install(agent, owned);
					});
				installations.set(key, installation);
				try {
					await installation;
				} finally {
					if (installations.get(key) === installation) installations.delete(key);
				}
			}
			check();
			return { env: { ...slot.env, HUHU_HOOK_NODE: nodeProcess.execPath }, close };
		} catch (error) {
			try {
				await close();
			} catch (cleanup) {
				throw new AggregateError([error, cleanup], 'Hook preparation and cleanup failed');
			}
			throw error;
		}
	}

	prepareRuntimeHooks(request: RuntimeHooksRequest, binding: RuntimeActivityBinding): Promise<PreparedRuntimeHooks> {
		if (
			this.disposed ||
			request.signal?.aborted ||
			!binding.active() ||
			binding.runtimeId !== request.target.runtimeId
		)
			return Promise.reject(new AutomationError('agentUnavailable'));
		const existing = this.runtimes.get(binding.runtimeId);
		if (existing)
			return existing.binding === binding
				? existing.pending
				: Promise.reject(new AutomationError('agentUnavailable'));
		if (this.preparing.size >= 32 || this.runtimes.size >= 32)
			return Promise.reject(new AutomationError('agentUnavailable'));
		const consumer = hookActivityConsumer(binding);
		let allocated = false,
			revocationFailure: Error | undefined;
		const revoke = () => {
			request.signal?.removeEventListener('abort', abort);
			if (revocationFailure) throw revocationFailure;
			consumer.close();
		};
		const abort = () => {
			try {
				revoke();
			} catch (error) {
				revocationFailure =
					error instanceof Error ? error : new Error('Hook revocation failed', { cause: error });
			}
		};
		request.signal?.addEventListener('abort', abort, { once: true });
		const finalized = () => {
			allocated = false;
			consumer.settle();
			request.signal?.removeEventListener('abort', abort);
			if (this.runtimes.get(binding.runtimeId)?.pending === pending) this.runtimes.delete(binding.runtimeId);
		};
		const pending = this.prepareSlot(
			request.initialProvider,
			request.env,
			(row) => consumer.receive(row),
			request.signal,
			revoke,
			() => binding.active(),
			() => {
				allocated = true;
			},
			finalized,
		).catch((error) => {
			try {
				revoke();
			} catch (cleanup) {
				throw new AggregateError([error, cleanup], 'Hook preparation and revocation failed');
			}
			throw error;
		});
		this.runtimes.set(binding.runtimeId, { binding, pending });
		this.preparing.add(pending);
		void pending.then(
			() => {
				this.preparing.delete(pending);
			},
			() => {
				this.preparing.delete(pending);
				if (!allocated && this.runtimes.get(binding.runtimeId)?.pending === pending)
					this.runtimes.delete(binding.runtimeId);
			},
		);
		return pending;
	}

	private async install(agent: AgentId, account: Record<string, string>): Promise<void> {
		const [fs, , path, process] = await nodeModules();
		// The system account writes into the user's real provider configuration; a managed one stays inside the vault.
		const system = isSystemAccount(account),
			env: Record<string, string> = { ...account, ...accountPaths(account) };
		if (system) {
			const [, os] = await nodeModules();
			const result: SystemHookResult = await installSystemHooks(
				agent,
				accountPaths(account),
				{ home: os.homedir(), platform: process.platform },
				HOOK_SCRIPT,
			);
			if (!result.skipped.length) return;
			// A file HUHU must not touch (a link, invalid JSON, a user's own extension) stays as it is; say so once.
			const message = t('agent.hooks.systemSkipped', {
				files: result.skipped.map((row) => `${row.file} (${row.reason})`).join(', '),
			});
			if (this.options.strict) throw new Error(message);
			new Notice(message, 10000);
			return;
		}
		if (agent === 'pi' || agent === 'opencode') {
			const target = path.join(
				agent === 'pi'
					? path.join(env.PI_CODING_AGENT_DIR!, 'extensions')
					: path.join(env.OPENCODE_CONFIG_DIR!, 'plugins'),
				agent === 'pi' ? 'huhu-status.ts' : 'huhu-status.mjs',
			);
			const { OPENCODE_EXTENSION, PI_EXTENSION } = await import('./native-extensions');
			await checkOwnedPath(target);
			await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
			await fs.writeFile(target, agent === 'pi' ? PI_EXTENSION : OPENCODE_EXTENSION, { mode: 0o600 });
			return;
		}
		const providers: Record<Exclude<AgentId, 'pi' | 'opencode'>, { file: string; events: string[] }> = {
			'claude-code': {
				file: path.join(env.CLAUDE_CONFIG_DIR!, 'settings.json'),
				events: ['SessionStart', 'UserPromptSubmit', 'PermissionRequest', 'PreToolUse', 'Stop', 'StopFailure'],
			},
			codex: {
				file: path.join(env.CODEX_HOME!, 'hooks.json'),
				events: ['SessionStart', 'UserPromptSubmit', 'PermissionRequest', 'PreToolUse', 'Stop', 'Interrupt'],
			},
			gemini: {
				file: path.join(env.GEMINI_CLI_HOME!, '.gemini', 'settings.json'),
				events: ['SessionStart', 'BeforeAgent', 'BeforeTool', 'Notification', 'AfterAgent'],
			},
			grok: {
				file: path.join(env.GROK_HOME!, 'hooks', 'huhu-status.json'),
				events: ['SessionStart', 'UserPromptSubmit', 'Stop', 'StopFailure', 'StopCancelled'],
			},
		};
		const provider = providers[agent];
		const script = path.join(env.HUHU_ACCOUNT_ROOT!, 'runtime', SCRIPT_NAME);
		await checkOwnedPath(script);
		await fs.mkdir(path.dirname(script), { recursive: true, mode: 0o700 });
		await fs.writeFile(script, HOOK_SCRIPT, { mode: 0o600 });
		const merge = (raw: string | undefined) =>
			JSON.stringify(
				mergeNativeHooks(
					raw === undefined ? {} : (JSON.parse(raw) as unknown),
					script,
					provider.events,
					process,
					undefined,
					agent,
				),
				null,
				2,
			) + '\n';
		await checkOwnedPath(provider.file);
		await writeHookSettings(fs, provider.file, merge, checkOwnedPath);
	}
	dispose(): Promise<void> {
		if (this.closing) return this.closing;
		this.disposed = true;
		const revoked = Promise.allSettled(
			[...this.slots].map((slot) => {
				try {
					return slot.close();
				} catch (error) {
					return Promise.reject(
						error instanceof Error ? error : new Error('Hook cleanup failed', { cause: error }),
					);
				}
			}),
		);
		this.closing = (async () => {
			// In-flight preparations observe disposed after each await and collect their own scope.
			await Promise.allSettled([...this.preparing]);
			const results = [
				...(await revoked),
				...(await Promise.allSettled([...this.slots].map((slot) => slot.close()))),
			];
			const errors: unknown[] = [];
			for (const result of results) if (result.status === 'rejected') errors.push(result.reason as unknown);
			if (errors.length) throw new AggregateError(errors, 'Hook cleanup incomplete');
			this.slots.clear();
		})();
		return this.closing;
	}
}

const providers = new Set<AgentId>(['claude-code', 'codex', 'gemini', 'grok', 'pi', 'opencode']);
interface SourceConsumer {
	meta: ActivitySourceMeta;
	binding: ActivitySourceBinding;
	high: number;
	reorder: Map<number, ActivityObservation>;
	invalid: boolean;
	rootId?: string;
}
export function hookActivityConsumer(runtime: RuntimeActivityBinding): {
	receive(row: SpoolEvent): void;
	close(): void;
	settle(): void;
} {
	const sources = new Map<string, SourceConsumer>(),
		deliveries = new Set<string>();
	let active = true,
		capacity = false;
	const invalidate = (reason: 'hook-error' | 'capacity' | 'source-mismatch') => {
		for (const source of sources.values()) {
			source.invalid = true;
			source.binding.invalidate(reason);
		}
		runtime.invalidate(reason);
	};
	const apply = (source: SourceConsumer, observation: ActivityObservation) => {
		const adopted = source.binding.observe(observation);
		if (adopted.status === 'rejected') {
			source.invalid = true;
			source.binding.invalidate(adopted.reason);
		}
		if (observation.event === 'session_shutdown' || observation.event === 'adapter_closed') {
			source.invalid = true;
			source.binding.close();
		}
	};
	const applyOrdered = (source: SourceConsumer, values: readonly ActivityObservation[], gapPending: boolean) => {
		const adopted = source.binding.observeOrdered(values, gapPending);
		if (adopted.status === 'rejected') {
			source.invalid = true;
			source.reorder.clear();
			source.binding.invalidate(adopted.reason);
			return;
		}
		if (values.some((value) => value.event === 'session_shutdown' || value.event === 'adapter_closed')) {
			source.invalid = true;
			source.binding.close();
		}
	};
	return {
		settle() {
			if (!active) {
				deliveries.clear();
				sources.clear();
			}
		},
		close() {
			if (!active) return;
			active = false;
			for (const source of sources.values()) {
				source.invalid = true;
				source.reorder.clear();
				source.binding.close();
			}
			runtime.close();
		},
		receive(row) {
			if (!active || !runtime.active()) return;
			if (row.event === 'HookError' && !row.source) {
				invalidate('hook-error');
				return;
			}
			const raw = row.source,
				provider = raw?.provider ?? row.provider;
			if (!provider || !providers.has(provider as AgentId)) {
				invalidate('source-mismatch');
				return;
			}
			const registered = !!raw && (provider === 'pi' || provider === 'opencode');
			if (
				raw !== undefined &&
				(!raw ||
					typeof raw !== 'object' ||
					Array.isArray(raw) ||
					!registered ||
					typeof raw.provider !== 'string' ||
					typeof raw.instance !== 'string' ||
					!/^[\da-f-]{36}$/.test(raw.instance) ||
					!Number.isSafeInteger(raw.sequence) ||
					raw.sequence <= 0 ||
					typeof raw.event !== 'string' ||
					(raw.blockId !== undefined && typeof raw.blockId !== 'string'))
			) {
				invalidate('source-mismatch');
				return;
			}
			const key = registered ? provider + ':' + raw.instance : provider + ':unproven';
			let source = sources.get(key);
			if (!source) {
				if (sources.size >= 8) {
					capacity = true;
					invalidate('capacity');
					return;
				}
				const meta: ActivitySourceMeta = {
					provider: provider as AgentId,
					kind: 'native-hook',
					adapterRevision: registered ? 'huhu-native-v1' : 'huhu-command-v1',
					lifetime: registered
						? { kind: 'registration', sourceInstance: raw.instance }
						: { kind: 'unproven' },
				};
				const binding = runtime.bindSource(meta);
				if (!binding) {
					invalidate('capacity');
					return;
				}
				source = { meta, binding, high: 0, reorder: new Map(), invalid: false };
				sources.set(key, source);
			}
			if (capacity || source.invalid || !source.binding.active()) return;
			const observation: ActivityObservation = {
				deliveryId: row.delivery,
				event: registered ? raw.event : row.event,
				eventAt: row.at,
				...(registered ? { sourceSequence: raw.sequence } : {}),
				...activityFields(row, registered),
			};
			if (
				!activitySummaryAllowed(source.meta, observation, {
					runtimeId: runtime.runtimeId,
					bindingId: source.binding.bindingId,
					programEpoch: source.binding.programEpoch,
				})
			) {
				source.invalid = true;
				source.binding.invalidate('capacity');
				return;
			}
			if (registered) {
				const sequence = raw.sequence;
				if (sequence <= source.high || source.reorder.has(sequence)) return;
				if (sequence > source.high + ACTIVITY_LIMITS.reorder) {
					source.invalid = true;
					source.binding.invalidate('sequence-gap');
					return;
				}
				const rootId = observation.resume?.nativeSessionId;
				if (provider === 'opencode' && rootId !== undefined) {
					if (source.rootId !== undefined && source.rootId !== rootId) {
						invalidate('source-mismatch');
						return;
					}
					source.rootId = rootId;
				}
				source.reorder.set(sequence, observation);
				const last = source.high + source.reorder.size;
				for (let next = source.high + 1; next <= last; next++) {
					if (source.reorder.has(next)) continue;
					applyOrdered(source, [], true);
					return;
				}
				const batch: ActivityObservation[] = [];
				for (let next = source.high + 1; next <= last; next++) batch.push(source.reorder.get(next)!);
				source.high = last;
				source.reorder.clear();
				applyOrdered(source, batch, false);
			} else {
				if (deliveries.has(row.delivery)) return;
				if (deliveries.size >= 4096) {
					capacity = true;
					invalidate('capacity');
					return;
				}
				deliveries.add(row.delivery);
				apply(source, observation);
			}
		},
	};
}
function activityFields(row: SpoolEvent, registered: boolean): Partial<ActivityObservation> {
	const fields: Partial<ActivityObservation> & {
		state?: ActivityObservation['state'];
		blocking?: ActivityObservation['blocking'];
		completion?: 'turn-finished';
		resume?: ActivityObservation['resume'];
	} = {};
	const event = row.event;
	if (['UserPromptSubmit', 'BeforeAgent', 'PreToolUse'].includes(event)) fields.state = 'working';
	else if (registered && row.source?.provider === 'pi' && event === 'SessionStart' && row.source.event === 'session_start') fields.state = 'idle';
	else if (event === 'PermissionRequest' || event === 'Notification')
		fields.state = event === 'PermissionRequest' ? 'permission' : 'waiting';
	else if (event === 'Stop') fields.state = 'done';
	else if (event === 'StopFailure' || event === 'HookError') fields.state = 'failed';
	else if (event === 'Interrupt' || event === 'StopCancelled') fields.state = 'interrupted';
	else fields.state = 'unknown';
	if (registered && row.source?.blockId) {
		if (row.source.event === 'ui_prompt_end') fields.blocking = { state: 'clear', blockId: row.source.blockId };
		else if (event === 'PermissionRequest')
			fields.blocking = {
				state: 'blocked',
				reason: row.source.event === 'question.asked' ? 'question' : 'permission',
				blockId: row.source.blockId,
			};
	} else if (!registered && (event === 'PermissionRequest' || event === 'Notification'))
		fields.blocking = { state: 'blocked', reason: 'other', blockId: row.delivery };
	if (
		registered &&
		event === 'Stop' &&
		!row.data.huhu_answer_error &&
		((row.source?.provider === 'pi' && row.source.event === 'agent_settled') ||
			(row.source?.provider === 'opencode' && row.source.event === 'Stop'))
	)
		fields.completion = 'turn-finished';
	const nativeSessionId = row.data.session_id ?? row.data.sessionId,
		transcriptPath = row.data.transcript_path;
	if (typeof nativeSessionId === 'string' || typeof transcriptPath === 'string')
		fields.resume = {
			...(typeof nativeSessionId === 'string' ? { nativeSessionId } : {}),
			...(typeof transcriptPath === 'string' ? { transcriptPath } : {}),
		};
	return fields;
}
