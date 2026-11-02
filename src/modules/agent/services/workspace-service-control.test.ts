// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest';
import { captureForegroundIntent } from './launch/foreground-intent';
import { SpaceService } from './spaces/space-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { TerminalSessions } from './terminal/sessions';
import { NativeHost } from '../../../host/desktop/native/host';
import type { NativeEvents } from '../../../shared/native/host';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { WorkspaceService, type WorkspaceLaunchPort } from './workspace-service';
import type { TextStorage } from '../../../shared/storage/ports';

async function fixture(options: { deferStop?: boolean } = {}) {
	const files = new Map<string, string>();
	const storage: TextStorage = {
		exists: async (p) => files.has(p),
		read: async (p) => files.get(p)!,
		write: async (p, s) => {
			files.set(p, s);
		},
		mkdir: async () => {},
	};
	const root = { canonicalPath: '/fixture', dev: '1', ino: '2' },
		vault = { vaultId: 'v', deviceId: 'd', rootPath: '/fixture', root };
	const spaces = new SpaceService({
		storage,
		instanceId: 'activity',
		report: vi.fn(),
		directories: {
			inspectVault: async () => vault,
			assertVault: async () => {},
			bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }),
			chooseExternalDirectory: async () => undefined,
			resolveDirectory: async () => ({ cwd: '/fixture' }),
		},
		owners: {
			acquire: async () => ({
				instanceId: 'activity',
				port: 12345,
				lost: new AbortController().signal,
				assertHeld: async () => {},
				close: async () => {},
			}),
		},
	});
	let events!: NativeEvents,
		sequence = 0;
	const spawn = vi.fn(async () => 42);
	const exit = (sid: number) => {
		events.termination?.(sid, {
			version: 1,
			sequence: ++sequence,
			evidence: {
				root: { state: 'exited', code: 0, signal: null },
				cleanup: {
					state: 'confirmed',
					scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
					remainingKnown: 0,
				},
				output: 'drained',
			},
		});
		events.exit(sid, 0, null);
	};
	const requestStop = vi.fn((sid: number) => {
		if (!options.deferStop) exit(sid);
	});
	const acknowledge = vi.fn();
	const native = new NativeHost(async (e) => {
		events = e;
		return {
			alive: true,
			version: 'fixture',
			terminalTermination: 1,
			requestStop,
			spawnSession: spawn,
			input() {},
			resize() {},
			acknowledge,
			end: exit,
			history: async <T>() => [] as T,
			request: async <T>() => ({}) as T,
			dispose: async () => {
				e.closed('closed');
			},
		};
	});
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({
		native,
		environment,
		platform: process.platform,
		settings: () => normalizeTerminalSettings({ scrollback: 100 }),
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	const launch: WorkspaceLaunchPort = {
		shell: (o) =>
			sessions.create({
				kind: 'shell',
				title: 'shell',
				file: 'sh',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		agent: (agentId, o) =>
			sessions.create({
				kind: 'agent',
				agentId,
				title: 'agent',
				file: 'agent',
				args: [],
				cwd: o.cwd!,
				runtime: o.runtime,
				beforeSpawn: o.beforeSpawn,
			}),
		resume: async () => undefined,
		account: () => '',
		report: vi.fn(),
	};
	const clock = {
		setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number,
		clearTimeout: (id: number) => clearTimeout(id),
	};
	const workspace = new WorkspaceService(
		createSpaceWorkspaceStore(spaces, clock, vi.fn()),
		sessions,
		launch,
		() => undefined,
		spaces,
	);
	await workspace.persistence.ready;
	return {
		environment,
		workspace,
		spaces,
		sessions,
		spawn,
		launch,
		storage,
		exit,
		requestStop,
		acknowledge,
		output(sid: number, bytes: Uint8Array) {
			events.output(sid, bytes);
		},
		async close() {
			await workspace.dispose();
			await sessions.dispose();
			await native.dispose();
		},
	};
}

test('persisted pending Session rename survives the original create tail rather than replaying its old request title', async () => {
	const f = await fixture();
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	f.spawn.mockImplementation(async () => {
		await gate;
		return 42;
	});
	let creating: ReturnType<WorkspaceService['createManaged']> | undefined;
	try {
		const space = await f.spaces.create({ name: 'A' });
		creating = f.workspace.createManaged({ kind: 'shell', spaceId: space.id, title: 'Old' });
		await vi.waitFor(() => expect(f.spawn).toHaveBeenCalledOnce());
		const target = f.workspace.getManagedSnapshot().sessions[0]!;
		await f.spaces.renameSession(target, 'New');
		f.sessions.get(target.runtime!.runtimeId)!.rename('New');
		release();
		const result = await creating;
		expect(result).toMatchObject({ status: 'created', session: { title: 'New' } });
		expect(f.spaces.store.getState().records.sessions[target.sessionId]!.title).toBe('New');
	} finally {
		release();
		await creating;
		await f.close();
	}
});

test('capture owns the original foreground across scope await and disposed observers cannot cancel an admitted reserve', async () => {
	const f = await fixture();
	const container = document.createElement('div'),
		anchor = document.createElement('button');
	container.append(anchor);
	document.body.append(container);
	anchor.focus();
	const foreground = vi.fn(() =>
		captureForegroundIntent({ document, window, container, isCurrent: () => true, onTargetChange: () => () => {} }),
	);
	f.launch.foreground = foreground;
	f.launch.show = vi.fn(async () => {});
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	try {
		const space = await f.spaces.create({ name: 'A' }),
			scope = await f.spaces.getControlScope();
		const request = { kind: 'shell' as const, spaceId: space.id, title: 'Captured', foreground: true };
		const captured = f.workspace.captureManagedCreate(request);
		request.title = 'Changed';
		const pending = (async () => {
			await gate;
			await f.spaces.assertControlScope(scope);
			return captured.execute(() => {
				captured.dispose();
				throw new Error('progress closed');
			});
		})();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
		release();
		const result = await pending;
		expect(result).toMatchObject({ status: 'created', session: { title: 'Captured' } });
		expect(foreground).toHaveBeenCalledTimes(1);
		expect(f.launch.show).not.toHaveBeenCalled();
		expect(captured.observationError?.message).toBe('progress closed');
		expect(Object.values(f.workspace.store.getState().tabs)).toHaveLength(0);
		expect(f.spawn).toHaveBeenCalledOnce();
		await expect(captured.execute()).resolves.toMatchObject({ status: 'failed', effect: 'none' });
	} finally {
		release();
		container.remove();
		await f.close();
	}
});

test('managed rename saves first, rejects save failure without model change, and preserves independent Pane and Tab names', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'A' });
		await f.workspace.selectSpace(space.id);
		const created = await f.workspace.createManaged({ kind: 'shell', spaceId: space.id, title: 'Old' });
		if (created.status !== 'created') throw new Error('create failed');
		const ref = {
			spaceId: space.id,
			sessionId: created.session.sessionId,
			runtimeId: created.session.runtime.runtimeId,
		};
		const attached = await f.workspace.attachManaged(ref, { focus: false });
		if (attached.status !== 'attached') throw new Error('attach failed');
		f.workspace.renamePane(attached.tabId, ref.runtimeId, 'Pane custom');
		f.workspace.rename(attached.tabId, 'Tab custom');
		await f.workspace.persistence.flush();
		await f.workspace.renameManaged(ref, 'Saved');
		expect(f.sessions.get(ref.runtimeId)!.title).toBe('Saved');
		const tab = f.workspace.store.getState().tabs[attached.tabId]!;
		expect(tab.customTitle).toBe('Tab custom');
		if (tab.kind !== 'terminal') throw new Error('missing tab');
		expect(tab.panes[ref.runtimeId]!.customTitle).toBe('Pane custom');
		const write = f.storage.write;
		f.storage.write = async () => {
			throw new Error('disk full');
		};
		await expect(f.workspace.renameManaged(ref, 'Failed')).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
		expect(f.sessions.get(ref.runtimeId)!.title).toBe('Saved');
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]!.title).toBe('Saved');
		f.storage.write = write;
		await f.spaces.renameSession(ref, 'Recovered');
	} finally {
		await f.close();
	}
});

test('onReserved publishes the precise committed target before preparation and pending rename updates the same eventual model', async () => {
	const f = await fixture();
	let release!: (env: Record<string, string>) => void;
	const gate = new Promise<Record<string, string>>((r) => {
		release = r;
	});
	f.environment.mockImplementation(() => gate);
	let pending: ReturnType<WorkspaceService['createManaged']> | undefined;
	try {
		const space = await f.spaces.create({ name: 'A' });
		const capture = f.workspace.captureManagedCreate({ kind: 'shell', spaceId: space.id, title: 'Old' });
		let reserved: Parameters<NonNullable<Parameters<typeof capture.execute>[0]>>[0] | undefined;
		pending = capture.execute((ref) => {
			reserved = ref;
			expect(Object.isFrozen(ref)).toBe(true);
			expect(f.environment).not.toHaveBeenCalled();
			expect(f.spawn).not.toHaveBeenCalled();
			expect(f.spaces.store.getState().records.sessions[ref.sessionId]!.lastAttempt!.runtimeId).toBe(
				ref.runtimeId,
			);
			expect(f.workspace.getManaged(ref)!.runtime!.phase).toBe('launch-pending');
		});
		await vi.waitFor(() => expect(f.environment).toHaveBeenCalledOnce());
		expect(reserved).toBeDefined();
		expect(f.sessions.get(reserved!.runtimeId)).toBeUndefined();
		await f.workspace.renameManaged(reserved!, 'Pending renamed');
		capture.dispose();
		release({});
		expect(await pending).toMatchObject({
			status: 'created',
			session: {
				sessionId: reserved!.sessionId,
				title: 'Pending renamed',
				runtime: { runtimeId: reserved!.runtimeId },
			},
		});
		expect(capture.observationError).toBeUndefined();
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		release({});
		await pending;
		await f.close();
	}
});

test('unused capture disposal and missing Space execute have zero admission and never choose or infer a target', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'Only' });
		await f.workspace.selectSpace(space.id);
		const capture = f.workspace.captureManagedCreate({ kind: 'shell', spaceId: space.id, foreground: true });
		capture.dispose();
		expect(await capture.execute()).toMatchObject({ status: 'failed', effect: 'none' });
		expect(await f.workspace.createManaged({ kind: 'shell', spaceId: '' })).toMatchObject({
			status: 'failed',
			effect: 'none',
			error: { code: 'TARGET_REQUIRED' },
		});
		expect(Object.keys(f.spaces.store.getState().records.sessions)).toHaveLength(0);
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.environment).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});
