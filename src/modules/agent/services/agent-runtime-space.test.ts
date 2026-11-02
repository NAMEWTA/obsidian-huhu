import { createRequire } from 'node:module';
import { realpath } from 'node:fs/promises';
import type { App } from 'obsidian';
import { expect, test, vi } from 'vitest';
import { AutomationError } from '../../../shared/automation/errors';
import { SpaceError } from '../core/space/errors';
import {
	resolveRequestedCwd,
	spaceBoundCwd,
	spaceFailure,
	TerminalAutomationRuntime,
	type AutomationRuntimeHost,
	type BusinessAdmission,
} from './agent-runtime';
import { initializeTestDevice } from '../../../../test/fixtures/vault-storage';

test('a narrower directory must lie inside the Space; the whole-vault default means the Space directory; nothing else moves', () => {
	const posix = 'linux' as const;
	expect(spaceBoundCwd('/space', '', '/vault', posix)).toBe('/space');
	expect(spaceBoundCwd('/vault/app', '/vault/app/src', '/vault', posix)).toBe('/vault/app/src');
	expect(spaceBoundCwd('/vault/app', '/vault', '/vault', posix)).toBe('/vault/app');
	expect(spaceBoundCwd('/vault/app', '/vault/other', '/vault', posix)).toBeUndefined();
	// A sibling that merely shares a prefix is not inside the Space.
	expect(spaceBoundCwd('/vault/app', '/vault/application', '/vault', posix)).toBeUndefined();
});

test('only an unavailable Space is a configuration problem; a failed record write is its own failure', () => {
	for (const code of [
		'TARGET_NOT_FOUND',
		'DIRECTORY_NOT_AUTHORIZED',
		'SOURCE_UNAVAILABLE',
		'TARGET_REQUIRED',
	] as const)
		expect(spaceFailure(new SpaceError(code, 'x'))).toMatchObject({ code: 'spaceUnavailable' });
	for (const code of ['PERSISTENCE_FAILED', 'OWNER_CONFLICT', 'SCOPE_MISMATCH'] as const)
		expect(spaceFailure(new SpaceError(code, 'x'))).toMatchObject({ code: 'spaceSaveFailed' });
	const other = new Error('other');
	expect(spaceFailure(other)).toBe(other);
});

async function configured() {
	const { mkdtemp, mkdir, rm } = await import('node:fs/promises');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const { DEFAULT_AGENT_SETTINGS, normalizeAgentSettings } = await import('../core/launch/defaults');
	const root = await mkdtemp(join(tmpdir(), 'huhu-t14-space-'));
	await mkdir(join(root, 'inside', 'deeper'), { recursive: true });
	await mkdir(join(root, 'other'), { recursive: true });
	const previousWindow = Reflect.get(globalThis, 'window');
	vi.stubGlobal('window', { require: createRequire(import.meta.url) });
	const files = new Map<string, string>();
	const adapter = {
		exists: async (path: string) => files.has(path),
		read: async (path: string) => files.get(path) ?? '',
		write: async (path: string, text: string) => void files.set(path, text),
		mkdir: async () => {},
		getBasePath: () => root,
	};
	const app = {
		vault: { adapter },
		workspace: { containerEl: { win: {} } },
		loadLocalStorage: () => '00000000-0000-0000-0000-000000000000',
	} as unknown as App;
	await initializeTestDevice(app);
	const abandon = vi.fn(),
		created = vi.fn();
	const admission: BusinessAdmission = {
		cwd: root,
		runtime: { spaceId: 'space-a', sessionId: 'session-1', runtimeId: 'runtime-1' },
		beforeSpawn: async () => {},
		created,
		abandon,
	};
	const session = {
		id: 'runtime-1',
		connection: 'connected',
		running: true,
		observe: vi.fn(() => () => {}),
		setActivity: vi.fn(),
		invalidateActivity: vi.fn(),
		end: vi.fn(),
	};
	const cwd = vi.fn(async (_spaceId: string) => root);
	const admit = vi.fn(async (_request: unknown, _signal?: AbortSignal) => admission);
	const create = vi.fn(async (request: { prepare?: (value: unknown) => void }) => {
		request.prepare?.(session);
		return session;
	});
	const runtime = new TerminalAutomationRuntime({
		app,
		spaces: { cwd, admit },
		create,
		remove: vi.fn(),
		open: vi.fn(),
		history: () => ({}) as never,
		agentSettings: () =>
			normalizeAgentSettings({
				globalPermissionMode: 'manual',
				yoloAcknowledged: true,
				yoloAcknowledgedAgents: ['codex'],
				agents: {
					...DEFAULT_AGENT_SETTINGS.agents,
					codex: { ...DEFAULT_AGENT_SETTINGS.agents.codex, enabled: true, cliPath: process.execPath },
				},
			}),
	} as unknown as AutomationRuntimeHost);
	Reflect.set(runtime, 'hooks', {
		prepare: async () => ({ env: {}, close: async () => {} }),
		dispose: async () => {},
	});
	const action = (extra: Record<string, unknown> = {}) => ({
		kind: 'agent' as const,
		agentId: 'codex',
		cwd: '',
		prompt: 'go',
		sessionMode: 'fresh' as const,
		...extra,
	});
	return {
		root,
		session,
		runtime,
		cwd,
		admit,
		create,
		abandon,
		created,
		action,
		execution: { id: 'run-1', title: 'Run', kind: 'automation' as const },
		async close() {
			await runtime.dispose();
			vi.stubGlobal('window', previousWindow);
			await rm(root, { recursive: true, force: true });
		},
	};
}

test('no Space: the run is refused before the Space service, the session record or any process is touched', async () => {
	const f = await configured();
	try {
		await expect(f.runtime.execute(f.action(), f.execution)).rejects.toMatchObject({ code: 'spaceRequired' });
		expect(f.cwd).not.toHaveBeenCalled();
		expect(f.admit).not.toHaveBeenCalled();
		expect(f.create).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});

test('a deleted, archived or unauthorized Space is refused with a configuration error and nothing starts', async () => {
	const f = await configured();
	try {
		f.cwd.mockRejectedValueOnce(new SpaceError('TARGET_NOT_FOUND', 'archived-space'));
		await expect(f.runtime.execute(f.action({ spaceId: 'gone' }), f.execution)).rejects.toMatchObject({
			code: 'spaceUnavailable',
		});
		f.cwd.mockRejectedValueOnce(new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-revoked'));
		await expect(f.runtime.execute(f.action({ spaceId: 'revoked' }), f.execution)).rejects.toMatchObject({
			code: 'spaceUnavailable',
		});
		expect(f.admit).not.toHaveBeenCalled();
		expect(f.create).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});

test('a directory outside the Space is refused, never moved; the vault-root default and inner folders are honoured', async () => {
	const f = await configured();
	try {
		f.cwd.mockResolvedValue(`${f.root}/inside`);
		await expect(
			f.runtime.execute(f.action({ spaceId: 'space-a', cwd: `${f.root}/other` }), f.execution),
		).rejects.toMatchObject({ code: 'cwdInvalid' });
		expect(f.admit).not.toHaveBeenCalled();
		await f.runtime.execute(f.action({ spaceId: 'space-a', cwd: f.root }), { ...f.execution, id: 'run-2' });
		await f.runtime.execute(f.action({ spaceId: 'space-a', cwd: `${f.root}/inside/deeper` }), {
			...f.execution,
			id: 'run-3',
		});
		expect(f.create.mock.calls.map((call) => (call[0] as unknown as { cwd: string }).cwd)).toEqual([
			`${f.root}/inside`,
			await realpath(`${f.root}/inside/deeper`),
		]);
	} finally {
		await f.close();
	}
});

test('the Session is committed in its Space before the spawn, with the reserved runtime handed to the launcher', async () => {
	const f = await configured();
	try {
		await f.runtime.execute(f.action({ spaceId: 'space-a' }), f.execution);
		expect(f.admit).toHaveBeenCalledTimes(1);
		expect(f.admit.mock.calls[0]?.[0]).toMatchObject({ spaceId: 'space-a', kind: 'agent', agentId: 'codex' });
		expect(f.admit.mock.invocationCallOrder[0]!).toBeLessThan(f.create.mock.invocationCallOrder[0]!);
		const request = f.create.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
		expect(request.runtime).toEqual({ spaceId: 'space-a', sessionId: 'session-1', runtimeId: 'runtime-1' });
		expect(typeof request.beforeSpawn).toBe('function');
		expect(request.cwd).toBe(f.root);
		expect(f.created).toHaveBeenCalledTimes(1);
		expect(f.abandon).not.toHaveBeenCalled();
		// Status comes from the automation hooks; the managed snapshot says so instead of staying open and source-less.
		expect(f.session.invalidateActivity).toHaveBeenCalledWith('unsupported');
	} finally {
		await f.close();
	}
});

test('a failed Session record write starts nothing and says so; a failed spawn marks the reserved runtime', async () => {
	const f = await configured();
	try {
		f.admit.mockRejectedValueOnce(new SpaceError('PERSISTENCE_FAILED', 'commit-failed'));
		await expect(f.runtime.execute(f.action({ spaceId: 'space-a' }), f.execution)).rejects.toMatchObject({
			code: 'spaceSaveFailed',
		});
		expect(f.create).not.toHaveBeenCalled();
		const failure = new AutomationError('cliMissing');
		f.create.mockRejectedValueOnce(failure);
		await expect(f.runtime.execute(f.action({ spaceId: 'space-a' }), { ...f.execution, id: 'run-3' })).rejects.toBe(
			failure,
		);
		expect(f.abandon).toHaveBeenCalledWith(failure);
	} finally {
		await f.close();
	}
});

test('a saved script is bound the same way: no Space is refused, a bound one is admitted as a shell Session first', async () => {
	const f = await configured();
	try {
		Reflect.set(Reflect.get(f.runtime, 'host') as object, 'shell', () => ({ file: process.execPath, args: [] }));
		const script = (extra: Record<string, unknown> = {}) => ({
			kind: 'script' as const,
			script: 'echo ok',
			cwd: '',
			shell: 'bash' as const,
			...extra,
		});
		const run = { id: 'run-s', title: 'Script', trigger: 'scheduled' } as never;
		await expect(f.runtime.startScript(script(), run)).rejects.toMatchObject({ code: 'spaceRequired' });
		expect(f.admit).not.toHaveBeenCalled();
		await f.runtime.startScript(script({ spaceId: 'space-a' }), run);
		expect(f.admit.mock.calls[0]?.[0]).toMatchObject({ spaceId: 'space-a', kind: 'shell' });
		expect((f.create.mock.calls[0]?.[0] as unknown as Record<string, unknown>).runtime).toMatchObject({
			runtimeId: 'runtime-1',
		});
	} finally {
		await f.close();
	}
});

test('a saved directory resolves against the vault and folds dot segments; the Space check then decides', () => {
	expect(resolveRequestedCwd('/vault', 'src/app')).toBe('/vault/src/app');
	expect(resolveRequestedCwd('/vault', './a/../b')).toBe('/vault/b');
	expect(resolveRequestedCwd('/vault', '../outside')).toBe('/outside');
	expect(resolveRequestedCwd('/vault', '/abs/dir')).toBe('/abs/dir');
	expect(resolveRequestedCwd('/vault', 'C:\\work')).toBe('C:\\work');
	expect(resolveRequestedCwd(undefined, 'rel')).toBe('rel');
});

test('a business runtime reports its managed activity as unavailable with a reason, so wait does not hang on no source', async () => {
	const { TerminalSession } = await import('./terminal/session');
	const session = new TerminalSession({
		id: 'runtime-x',
		sid: 1,
		kind: 'agent',
		agentId: 'codex',
		title: 'Run',
		cwd: '/x',
		cols: 80,
		rows: 24,
		scrollback: 10,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	session.invalidateActivity('unsupported');
	const snapshot = session.getActivitySnapshot();
	expect(snapshot.source.health).toBe('unavailable');
	expect(snapshot.source).toMatchObject({ reason: 'unsupported' });
	expect(snapshot.state).toBe('unknown');
	session.dispose();
});

test('Windows vault roots resolve with backslashes: a UNC share and a drive, for `.`, a folder and `..`', () => {
	const unc = '\\\\server\\share\\vault';
	expect(resolveRequestedCwd(unc, '.')).toBe(unc);
	expect(resolveRequestedCwd(unc, 'inner')).toBe(`${unc}\\inner`);
	expect(resolveRequestedCwd(unc, 'a/b\\c')).toBe(`${unc}\\a\\b\\c`);
	// The share root keeps its trailing backslash, the canonical spelling of a root.
	expect(resolveRequestedCwd(unc, '..')).toBe('\\\\server\\share\\');
	expect(resolveRequestedCwd(unc, '../../..')).toBe('\\\\server\\share\\');
	expect(resolveRequestedCwd('C:\\Users\\me\\vault', '.')).toBe('C:\\Users\\me\\vault');
	expect(resolveRequestedCwd('C:\\Users\\me\\vault', 'inner')).toBe('C:\\Users\\me\\vault\\inner');
	expect(resolveRequestedCwd('C:/Users/me/vault', 'inner')).toBe('C:\\Users\\me\\vault\\inner');
	expect(resolveRequestedCwd('D:\\', 'x')).toBe('D:\\x');
	// An absolute saved folder is never rewritten.
	expect(resolveRequestedCwd(unc, '\\\\other\\share\\x')).toBe('\\\\other\\share\\x');
});
