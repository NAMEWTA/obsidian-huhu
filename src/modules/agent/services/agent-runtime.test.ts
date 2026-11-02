import { createRequire } from 'node:module';
import type { App } from 'obsidian';
import { expect, test, vi } from 'vitest';
import type { AgentSessionRef } from '../../../shared/automation/types';
import { TerminalAutomationRuntime, type AutomationRuntimeHost } from './agent-runtime';
import { initializeTestDevice } from '../../../../test/fixtures/vault-storage';

const file = '.huhu/terminal-agent/00000000-0000-0000-0000-000000000000/automation-sessions.json';
const row = (id: string, at: number): AgentSessionRef => ({
	agentId: 'codex',
	sessionId: id,
	cwd: '/vault',
	title: 'Prompt',
	accountKey: '{}',
	modifiedAtMs: at,
});
async function fixture() {
	const files = new Map<string, string>();
	const adapter = {
		exists: async (path: string) => files.has(path),
		read: async (path: string) => {
			const text = files.get(path);
			if (text === undefined) throw new Error('missing');
			return text;
		},
		write: async (path: string, text: string) => {
			files.set(path, text);
		},
		mkdir: async () => {},
	};
	const app = {
		vault: { adapter },
		workspace: { containerEl: { win: {} } },
		loadLocalStorage: () => '00000000-0000-0000-0000-000000000000',
	} as unknown as App;
	await initializeTestDevice(app);
	const create = () => new TerminalAutomationRuntime({ app } as AutomationRuntimeHost);
	return { files, adapter, create };
}
const loaded = (runtime: TerminalAutomationRuntime): Promise<void> => Reflect.get(runtime, 'loaded') as Promise<void>;
const persist = (runtime: TerminalAutomationRuntime): Promise<void> =>
	Reflect.apply(Reflect.get(runtime, 'persistRegistry') as () => Promise<void>, runtime, []);
function receive(runtime: TerminalAutomationRuntime, id: string, at: number) {
	const slot = { since: 0, action: { agentId: 'codex', cwd: '/vault', prompt: 'Prompt' }, accountKey: '{}' };
	Reflect.apply(Reflect.get(runtime, 'receive') as (...args: unknown[]) => void, runtime, [
		slot,
		{ event: 'SessionStart', at, data: { session_id: id } },
	]);
}

test('independent external and local sessions merge across successive hook events', async () => {
	const f = await fixture(),
		runtime = f.create();
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		await loaded(runtime);
		f.files.set(file, JSON.stringify([row('external', 1)]));
		receive(runtime, 'local', 2);
		await persist(runtime);
		receive(runtime, 'local', 3);
		await persist(runtime);
		expect(
			JSON.parse(f.files.get(file)!).sort((a: AgentSessionRef, b: AgentSessionRef) =>
				a.sessionId.localeCompare(b.sessionId),
			),
		).toEqual([row('external', 1), row('local', 3)]);
	} finally {
		await runtime.dispose();
		errors.mockRestore();
	}
});

test('immediate reopening observes every write admitted before disposal', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	let release!: () => void, entered!: () => void;
	const gate = new Promise<void>((resolve) => {
			release = resolve;
		}),
		blocked = new Promise<void>((resolve) => {
			entered = resolve;
		});
	const write = f.adapter.write;
	let block = true;
	f.adapter.write = async (path, text) => {
		if (block && path === file) {
			block = false;
			entered();
			await gate;
		}
		await write(path, text);
	};
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		receive(runtime, 'first', 1);
		await blocked;
		receive(runtime, 'first', 2);
		const closing = runtime.dispose();
		const reopened = f.create();
		release();
		await closing;
		await loaded(reopened);
		expect(Reflect.get(reopened, 'registry')).toEqual([row('first', 2)]);
		receive(reopened, 'second', 3);
		await persist(reopened);
		expect(JSON.parse(f.files.get(file)!)).toEqual([row('first', 2), row('second', 3)]);
		await reopened.dispose();
	} finally {
		release();
		await persist(runtime);
		errors.mockRestore();
	}
});

test('dispose is an idempotent receipt for the in-flight registry write and rejects final persistence failure', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	let release!: () => void, entered!: () => void;
	const gate = new Promise<void>((resolve) => {
			release = resolve;
		}),
		blocked = new Promise<void>((resolve) => {
			entered = resolve;
		});
	const write = f.adapter.write;
	let first = true;
	f.adapter.write = async (path, text) => {
		if (first && path === file) {
			first = false;
			entered();
			await gate;
		}
		await write(path, text);
	};
	try {
		receive(runtime, 'pending', 1);
		await blocked;
		const closing = runtime.dispose();
		expect(closing).toBeInstanceOf(Promise);
		expect(runtime.dispose()).toBe(closing);
		let settled = false;
		void closing.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);
		release();
		await closing;
		expect(JSON.parse(f.files.get(file)!)).toEqual([row('pending', 1)]);
	} finally {
		release();
		await persist(runtime);
	}
	const failing = f.create();
	await loaded(failing);
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	f.adapter.write = async () => {
		throw new Error('fixture registry full');
	};
	try {
		receive(failing, 'unsaved', 2);
		await expect(failing.dispose()).rejects.toThrow('fixture registry full');
	} finally {
		f.adapter.write = write;
		errors.mockRestore();
	}
});

test('reused automation submits prompt and Enter as one admitted operation and releases busy on rejection', async () => {
	const { mkdtemp, rm } = await import('node:fs/promises');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const { TerminalSession } = await import('./terminal/session');
	const { DEFAULT_AGENT_SETTINGS, normalizeAgentSettings } = await import('../core/launch/defaults');
	const { accountEnv } = await import('../platform/desktop/agents/accounts');
	const { getAgent } = await import('../core/launch/catalog');
	const { NATIVE_INPUT_LIMITS } = await import('../../../shared/native/input');
	const root = await mkdtemp(join(tmpdir(), 'huhu-t05-prompt-'));
	const previousWindow = Reflect.get(globalThis, 'window');
	vi.stubGlobal('window', { require: createRequire(import.meta.url) });
	const f = await fixture(),
		runtime = f.create();
	const terminal = new TerminalSession({
		id: 'reuse-live',
		sid: 1,
		kind: 'agent',
		agentId: 'codex',
		title: 'reuse',
		cwd: root,
		cols: 80,
		rows: 24,
		scrollback: 100,
		platform: process.platform,
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const writes: Array<string | Uint8Array> = [];
	let accept = false;
	terminal.attach(
		{
			inputAdmission: 1,
			inputLimits: NATIVE_INPUT_LIMITS,
			input: () => {
				throw new Error('legacy input');
			},
			resize: () => undefined,
			acknowledge: () => undefined,
			end: () => undefined,
			submitInput: (_sid, data) => {
				writes.push(data);
				const op = writes.length;
				const queued = accept
					? { op, state: 'queued' as const }
					: { op, state: 'none' as const, reason: 'capacity' as const };
				const finished = accept
					? { op, state: 'written' as const }
					: { op, state: 'none' as const, reason: 'capacity' as const };
				return {
					op,
					queued: Promise.resolve(queued),
					finished: Promise.resolve(finished),
					cancel: () => undefined,
				};
			},
		},
		1234,
	);
	try {
		await loaded(runtime);
		const host = Reflect.get(runtime, 'host') as AutomationRuntimeHost;
		Object.assign(host.app.vault.adapter, { getBasePath: () => root });
		host.agentSettings = () =>
			normalizeAgentSettings({
				globalPermissionMode: 'manual',
				yoloAcknowledged: true,
				yoloAcknowledgedAgents: ['codex'],
				agents: {
					...DEFAULT_AGENT_SETTINGS.agents,
					codex: { ...DEFAULT_AGENT_SETTINGS.agents.codex, enabled: true, cliPath: process.execPath },
				},
			});
		host.create = async () => {
			throw new Error('Reused process must not spawn');
		};
		host.spaces = {
			cwd: async () => root,
			admit: async () => {
				throw new Error('A reused process is already admitted in its Space');
			},
		};
		host.remove = () => undefined;
		const env = await accountEnv(getAgent('codex'), '', root, '00000000-0000-0000-0000-000000000000');
		const action = {
			kind: 'agent' as const,
			agentId: 'codex',
			cwd: root,
			spaceId: 'space-a',
			prompt: 'whole prompt',
			sessionMode: 'reuse' as const,
		};
		const slot = {
			terminal,
			action,
			accountKey: JSON.stringify(env),
			busy: false,
			started: false,
			since: 0,
			output: '',
		};
		(Reflect.get(runtime, 'live') as Map<string, typeof slot>).set(terminal.id, slot);
		await expect(
			runtime.execute(action, { id: 'first', title: 'fixture', kind: 'prompt' }, terminal.id),
		).rejects.toMatchObject({ code: 'agentUnavailable', params: { effect: 'none', reason: 'capacity' } });
		expect(writes).toEqual(['whole prompt\r']);
		expect(slot.busy).toBe(false);
		accept = true;
		const handle = await runtime.execute(action, { id: 'second', title: 'fixture', kind: 'prompt' }, terminal.id);
		expect(writes).toEqual(['whole prompt\r', 'whole prompt\r']);
		expect(handle.terminalId).toBe(terminal.id);
		await runtime.dispose();
		expect((await handle.completion).status).toBe('interrupted');
	} finally {
		await runtime.dispose();
		terminal.dispose();
		vi.stubGlobal('window', previousWindow);
		await rm(root, { recursive: true, force: true });
	}
});

test('T06 dispose starts hook cleanup before stalled registry and preserves asynchronous cleanup rejection', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	let release!: () => void, entered!: () => void;
	const gate = new Promise<void>((r) => (release = r)),
		started = new Promise<void>((r) => (entered = r));
	const write = f.adapter.write;
	let block = true;
	f.adapter.write = async (path, text) => {
		if (block && path === file) {
			block = false;
			entered();
			await gate;
		}
		await write(path, text);
	};
	const hooks = Reflect.get(runtime, 'hooks') as { dispose: () => void | Promise<void> };
	const cleanupError = new Error('scope-cleanup-failed');
	const dispose = vi.spyOn(hooks, 'dispose').mockImplementation(async () => {
		throw cleanupError;
	});
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		receive(runtime, 'pending', 1);
		await started;
		const closing = runtime.dispose();
		expect(dispose).toHaveBeenCalledOnce();
		expect(runtime.dispose()).toBe(closing);
		const observed = closing.catch((e) => e);
		release();
		expect(await observed).toBeInstanceOf(AggregateError);
		expect(((await observed) as AggregateError).errors).toContain(cleanupError);
	} finally {
		release();
		dispose.mockRestore();
		errors.mockRestore();
	}
});

test('T06 dispose collects the exact live scope Promise once and preserves late close failure', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	let reject!: (error: Error) => void;
	const gate = new Promise<void>((_r, no) => (reject = no)),
		close = vi.fn(() => gate);
	(Reflect.get(runtime, 'live') as Map<string, { hookClose: () => Promise<void> }>).set('one', { hookClose: close });
	const closing = runtime.dispose();
	let settled = false;
	const result = closing.then(
		() => {
			settled = true;
			return undefined;
		},
		(e) => {
			settled = true;
			return e as AggregateError;
		},
	);
	expect(close).toHaveBeenCalledOnce();
	expect(runtime.dispose()).toBe(closing);
	await Promise.resolve();
	expect(settled).toBe(false);
	const failure = new Error('late-scope-close');
	reject(failure);
	expect((await result)?.errors).toContain(failure);
	expect(close).toHaveBeenCalledOnce();
});

test('a specific-session automation resume claims the native conversation first and is busy when it is held', async () => {
	const { claimNativeConversation } = await import('./agent-runtime');
	const action = {
		kind: 'agent',
		agentId: 'codex',
		cwd: '/vault',
		prompt: 'p',
		sessionMode: 'specific',
		session: {
			agentId: 'codex',
			sessionId: 'native-1',
			cwd: '/vault',
			title: 't',
			accountKey: '{}',
			modifiedAtMs: 1,
			transcriptPath: '/log/a.jsonl',
		},
	} as unknown as Parameters<typeof claimNativeConversation>[2];
	const release = vi.fn(async () => {});
	const nativeLease = vi.fn(async () => ({ release }));
	const lease = await claimNativeConversation({ nativeLease }, 'codex', action, 'run-1', '/restored/a.jsonl');
	expect(nativeLease).toHaveBeenCalledWith({
		agentId: 'codex',
		nativeSessionId: 'native-1',
		transcriptPath: '/restored/a.jsonl',
		owner: 'automation-run-1',
	});
	expect(lease).toBeDefined();
	// Held by another instance or Vault: busy, and nothing is forked.
	const held = vi.fn(async () => {
		throw new Error('occupied');
	});
	await expect(claimNativeConversation({ nativeLease: held }, 'codex', action, 'run-2')).rejects.toMatchObject({
		code: 'busy',
	});
	// Fresh and reuse modes need no claim; a missing transcript is refused, not guessed.
	expect(
		await claimNativeConversation(
			{ nativeLease },
			'codex',
			{ ...action, sessionMode: 'fresh' } as typeof action,
			'run-3',
		),
	).toBeUndefined();
	await expect(
		claimNativeConversation(
			{ nativeLease },
			'codex',
			{ ...action, session: { ...action.session!, transcriptPath: undefined } } as typeof action,
			'run-4',
		),
	).rejects.toMatchObject({ code: 'sessionMissing' });
});

test('NL3/NL5: an older definition without a stored transcript resolves it from the projection or fails explicitly', async () => {
	const { claimNativeConversation } = await import('./agent-runtime');
	const base = {
		kind: 'agent',
		agentId: 'codex',
		cwd: '/vault',
		prompt: 'p',
		sessionMode: 'specific',
		session: {
			agentId: 'codex',
			sessionId: 'native-1',
			cwd: '/vault',
			title: 't',
			accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
			modifiedAtMs: 1,
		},
	} as unknown as Parameters<typeof claimNativeConversation>[2];
	const nativeLease = vi.fn(async () => ({ release: async () => {} }));
	const transcriptFor = vi.fn(async () => '/projection/a.jsonl');
	await claimNativeConversation({ nativeLease, transcriptFor }, 'codex', base, 'run-1');
	expect(transcriptFor).toHaveBeenCalledWith({
		agentId: 'codex',
		nativeSessionId: 'native-1',
		accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
	});
	expect(nativeLease).toHaveBeenCalledWith(expect.objectContaining({ transcriptPath: '/projection/a.jsonl' }));
	// Not found in the projection (or the lookup fails): explicit sessionMissing, nothing claimed.
	nativeLease.mockClear();
	for (const lookup of [
		async () => undefined,
		async () => {
			throw new Error('index down');
		},
	])
		await expect(
			claimNativeConversation({ nativeLease, transcriptFor: lookup }, 'codex', base, 'run-2'),
		).rejects.toMatchObject({ code: 'sessionMissing' });
	expect(nativeLease).not.toHaveBeenCalled();
});

test('recovery: a closed registry keeps references pending, strict drain persists them, reload adopts restored bytes', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	runtime.quiesceRegistry();
	receive(runtime, 'held', 1);
	await Promise.resolve();
	// Closed: the reference is kept in memory and nothing was written behind the recovery operation's back.
	expect(f.files.has(file)).toBe(false);
	await runtime.drainRegistry();
	expect(JSON.parse(f.files.get(file)!)).toEqual([row('held', 1)]);
	// The file is replaced by a restore; the in-memory registry and JsonStore baseline must follow it.
	f.files.set(file, JSON.stringify([row('restored', 5)]));
	await runtime.reloadRegistry();
	expect(Reflect.get(runtime, 'registry')).toEqual([row('restored', 5)]);
	runtime.resumeRegistry();
	receive(runtime, 'after', 6);
	await persist(runtime);
	expect(JSON.parse(f.files.get(file)!)).toEqual([row('restored', 5), row('after', 6)]);
	await runtime.dispose();
});

test('recovery: strict registry drain rejects when the write fails', async () => {
	const f = await fixture(),
		runtime = f.create();
	await loaded(runtime);
	const write = f.adapter.write;
	f.adapter.write = async (path, text) => {
		if (path === file) throw new Error('ENOSPC');
		await write(path, text);
	};
	runtime.quiesceRegistry();
	receive(runtime, 'one', 1);
	await expect(runtime.drainRegistry()).rejects.toThrow(/ENOSPC/);
	f.adapter.write = write;
	await runtime.drainRegistry();
	expect(JSON.parse(f.files.get(file)!)).toEqual([row('one', 1)]);
	await runtime.dispose();
});
