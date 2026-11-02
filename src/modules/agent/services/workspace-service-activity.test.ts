import { expect, test, vi } from 'vitest';
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

test('T06 pending is Vault-wide, split focus is exact, seen N preserves N+1 and background has no fake presentation', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'one', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		const created = await f.workspace.createManaged({ spaceId: space.id, kind: 'agent', agentId: 'pi' });
		if (created.status !== 'created') throw new Error('create failed');
		const ref = {
			spaceId: space.id,
			sessionId: created.session.sessionId,
			runtimeId: created.session.runtime.runtimeId,
		};
		const session = f.sessions.get(ref.runtimeId)!;
		const source = session.bindActivityRuntime().bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'instance' },
		})!;
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		const at = session.getActivitySnapshot().at;
		expect(f.workspace.getManaged(ref)?.runtime?.activityDetail?.unreadCompletion).toBe(true);
		expect(f.workspace.getManaged(ref)?.viewState).toBe('background');
		expect(
			await f.workspace.markManagedSeen({
				target: ref,
				at,
				view: { tabId: 'missing', paneSessionId: ref.runtimeId },
			}),
		).toMatchObject({ status: 'rejected', reason: 'not-presented' });
		const attach = await f.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId, focus: true });
		if (attach.status !== 'attached') throw new Error('attach failed');
		const owner = {};
		f.workspace.setVisible(owner, [attach.tabId]);
		source.observe({
			deliveryId: '2',
			sourceSequence: 2,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		expect(
			await f.workspace.markManagedSeen({
				target: ref,
				at,
				view: { tabId: attach.tabId, paneSessionId: ref.runtimeId },
			}),
		).toMatchObject({ status: 'updated', persisted: true });
		expect(session.getActivitySnapshot().unreadCompletion).toBe(true);
		await f.workspace.splitPane(ref.runtimeId, 'row');
		const active = f.workspace.active;
		if (active?.kind !== 'terminal') throw new Error('split failed');
		expect(active.focusedSessionId).not.toBe(ref.runtimeId);
		expect(await f.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId, focus: true })).toMatchObject({
			status: 'attached',
			focused: true,
			tabId: attach.tabId,
		});
		expect(f.workspace.active).toMatchObject({ focusedSessionId: ref.runtimeId });
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		await f.close();
	}
});

test('T06 concurrent attach shares only pane creation, preserving each callers foreground intent', async () => {
	const f = await fixture();
	let release!: () => void;
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }),
			b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		const result = await f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
		if (result.status !== 'created') throw new Error('create failed');
		await f.spaces.flush();
		let entered!: () => void;
		const gate = new Promise<void>((r) => (release = r)),
			started = new Promise<void>((r) => (entered = r));
		const write = f.storage.write;
		let once = true;
		f.storage.write = async (p, text) => {
			if (once) {
				once = false;
				entered();
				await gate;
			}
			await write(p, text);
		};
		let valid = true;
		f.launch.foreground = () => ({ valid: () => valid, dispose() {} });
		const background = f.workspace.attachManaged(result.session, {
			expectedRuntimeId: result.session.runtime.runtimeId,
			focus: false,
		});
		await started;
		const foreground = f.workspace.attachManaged(result.session, {
			expectedRuntimeId: result.session.runtime.runtimeId,
			focus: true,
		});
		valid = false;
		release();
		const rows = await Promise.all([background, foreground]);
		expect(rows.every((row) => row.status === 'attached' && !row.focused)).toBe(true);
		expect(rows[0]).toHaveProperty('tabId', (rows[1] as { tabId: string }).tabId);
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		release?.();
		await f.close();
	}
});

test.each(['none', 'synchronous', 'microtask'] as const)(
	'T06 cross-Space attach selects the exact existing split despite an unchanged focus echo (%s)',
	async (consumer) => {
		const f = await fixture();
		let off: (() => void) | undefined;
		try {
			const a = await f.spaces.create({ name: 'A', relativePath: '' }),
				b = await f.spaces.create({ name: 'B', relativePath: '' });
			await f.workspace.selectSpace(b.id);
			const created = await f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
			if (created.status !== 'created') throw new Error('create failed');
			const ref = {
				spaceId: b.id,
				sessionId: created.session.sessionId,
				runtimeId: created.session.runtime.runtimeId,
			};
			const attached = await f.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId });
			if (attached.status !== 'attached') throw new Error('attach failed');
			await f.workspace.splitPane(ref.runtimeId, 'row');
			const split = f.workspace.active;
			if (split?.kind !== 'terminal') throw new Error('no split');
			const companion = split.focusedSessionId;
			expect(companion).not.toBe(ref.runtimeId);
			await f.workspace.selectSpace(a.id);
			const select = vi.spyOn(f.spaces, 'select');
			const echoes: { selected: string | undefined; id: string; sameState: boolean }[] = [];
			let armed = consumer !== 'none';
			off = f.workspace.store.subscribe(() => {
				if (!armed || f.spaces.store.getState().records.selectedSpaceId !== b.id) return;
				const tab = f.workspace.active;
				if (tab?.kind !== 'terminal' || tab.focusedSessionId !== companion) return;
				armed = false;
				const echo = () => {
					const before = f.workspace.store.getState();
					f.workspace.focusSession(companion);
					echoes.push({
						selected: f.spaces.store.getState().records.selectedSpaceId,
						id: companion,
						sameState: before === f.workspace.store.getState(),
					});
				};
				if (consumer === 'microtask') queueMicrotask(echo);
				else echo();
			});
			const result = await f.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId, focus: true });
			expect(select).toHaveBeenCalledExactlyOnceWith(b.id);
			expect(echoes).toEqual(consumer === 'none' ? [] : [{ selected: b.id, id: companion, sameState: true }]);
			expect(result).toMatchObject({ status: 'attached', tabId: attached.tabId, focused: true });
			expect(f.workspace.active).toMatchObject({ id: attached.tabId, focusedSessionId: ref.runtimeId });
			expect(f.spawn).toHaveBeenCalledTimes(2);
		} finally {
			off?.();
			await f.close();
		}
	},
);

test.each(['different-pane', 'activate-tab', 'select-space', 'expired-intent', 'background'] as const)(
	'T06 cross-Space attach preserves a real later navigation or caller restriction (%s)',
	async (action) => {
		const f = await fixture();
		let off: (() => void) | undefined, selection: Promise<void> | undefined;
		try {
			const a = await f.spaces.create({ name: 'A', relativePath: '' }),
				b = await f.spaces.create({ name: 'B', relativePath: '' });
			await f.workspace.selectSpace(b.id);
			const created = await f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
			if (created.status !== 'created') throw new Error('create failed');
			const ref = {
				spaceId: b.id,
				sessionId: created.session.sessionId,
				runtimeId: created.session.runtime.runtimeId,
			};
			await f.workspace.attachManaged(ref);
			await f.workspace.splitPane(ref.runtimeId, 'row');
			const split = f.workspace.active;
			if (split?.kind !== 'terminal') throw new Error('no split');
			const companion = split.focusedSessionId;
			const otherTab = action === 'activate-tab' ? f.workspace.openPage('board') : undefined;
			if (otherTab) f.workspace.focusSession(companion);
			await f.workspace.selectSpace(a.id);
			const before = f.workspace.store.getState();
			let valid = true,
				changes = 0;
			const foreground = vi.fn(() => ({ valid: () => valid, dispose() {} }));
			f.launch.foreground = foreground;
			let armed = true;
			off = f.workspace.store.subscribe(() => {
				if (!armed || f.spaces.store.getState().records.selectedSpaceId !== b.id) return;
				armed = false;
				changes++;
				if (action === 'different-pane') f.workspace.focusSession(ref.runtimeId);
				else if (action === 'activate-tab') f.workspace.activate(otherTab!);
				else if (action === 'select-space') selection = f.workspace.selectSpace(a.id);
				else if (action === 'expired-intent') {
					valid = false;
					f.workspace.focusSession(companion);
				}
			});
			const focus = vi.spyOn(f.workspace, 'focusSession');
			const result = await f.workspace.attachManaged(ref, {
				expectedRuntimeId: ref.runtimeId,
				focus: action !== 'background',
			});
			await selection;
			expect(result).toMatchObject({ status: 'attached', focused: false });
			expect(changes).toBe(action === 'background' ? 0 : 1);
			if (action === 'background') {
				expect(foreground).not.toHaveBeenCalled();
				expect(focus).not.toHaveBeenCalled();
				expect(f.workspace.store.getState()).toBe(before);
			} else if (action === 'different-pane') {
				expect(f.workspace.active).toMatchObject({ focusedSessionId: ref.runtimeId });
				expect(focus).toHaveBeenCalledExactlyOnceWith(ref.runtimeId);
			} else if (action === 'expired-intent') {
				expect(f.workspace.active).toMatchObject({ focusedSessionId: companion });
				expect(focus).toHaveBeenCalledExactlyOnceWith(companion);
			} else if (action === 'activate-tab') {
				expect(f.workspace.active?.id).toBe(otherTab);
				expect(focus).not.toHaveBeenCalled();
			} else expect(focus).not.toHaveBeenCalled();
			expect(f.spaces.store.getState().records.selectedSpaceId).toBe(
				action === 'select-space' || action === 'background' ? a.id : b.id,
			);
			expect(f.spawn).toHaveBeenCalledTimes(2);
		} finally {
			off?.();
			await selection;
			await f.close();
		}
	},
);

test('T06 concurrent foreground callers share a Pane but retain independent live display intent', async () => {
	const f = await fixture();
	let release!: () => void;
	const write = f.storage.write;
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }),
			b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		const created = await f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
		if (created.status !== 'created') throw new Error('create failed');
		await f.spaces.flush();
		let entered!: () => void;
		const started = new Promise<void>((resolve) => (entered = resolve)),
			gate = new Promise<void>((resolve) => (release = resolve));
		let armed = true;
		f.storage.write = async (path, value) => {
			if (armed) {
				armed = false;
				entered();
				await gate;
			}
			await write(path, value);
		};
		const validity = [true, true],
			disposed = [vi.fn(), vi.fn()];
		let next = 0;
		f.launch.foreground = () => {
			const index = next++;
			return { valid: () => validity[index] === true, dispose: disposed[index]! };
		};
		const first = f.workspace.attachManaged(created.session);
		await started;
		const second = f.workspace.attachManaged(created.session);
		validity[0] = false;
		release();
		const results = await Promise.all([first, second]);
		expect(results[0]).toMatchObject({ status: 'attached', focused: false });
		expect(results[1]).toMatchObject({ status: 'attached', focused: true });
		expect(results[0]).toHaveProperty('tabId', (results[1] as { tabId: string }).tabId);
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(b.id);
		expect(f.workspace.active).toMatchObject({ focusedSessionId: created.session.runtime.runtimeId });
		expect(disposed[0]).toHaveBeenCalledOnce();
		expect(disposed[1]).not.toHaveBeenCalled();
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('committed');
		await f.workspace.dispose();
		expect(disposed[1]).toHaveBeenCalledOnce();
		expect(f.spawn).toHaveBeenCalledOnce();
	} finally {
		release?.();
		f.storage.write = write;
		await f.close();
	}
});

test('T06 persisted previous completion can be seen only after readonly presentation, with zero native acquisition', async () => {
	const f = await fixture();
	try {
		const space = await f.spaces.create({ name: 'restored', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		const admission = await f.spaces.prepareSession(space.id, { kind: 'agent', agentId: 'pi', title: 'old' });
		const ref = { spaceId: space.id, sessionId: admission.record.id, runtimeId: admission.runtimeId };
		await f.spaces.observeActivityHint(ref, {
			runtimeId: ref.runtimeId,
			activitySequence: 7,
			observedAt: 1,
			seenThrough: 0,
		});
		const opened = await f.workspace.openManagedRecord(ref);
		if (opened.status !== 'opened') throw new Error('open failed');
		const tab = f.workspace.active;
		if (tab?.kind !== 'terminal') throw new Error('no placeholder');
		expect(f.spawn).not.toHaveBeenCalled();
		f.workspace.setVisible({}, [tab.id]);
		expect(
			await f.workspace.markManagedSeen({
				target: ref,
				at: { runtimeId: ref.runtimeId, activitySequence: 7 },
				view: { tabId: tab.id, paneSessionId: tab.focusedSessionId },
			}),
		).toMatchObject({ status: 'updated', mode: 'restored-hint', persisted: true });
		expect(f.spaces.store.getState().records.sessions[ref.sessionId]?.completionHint?.seenThrough).toBe(7);
		expect(f.spawn).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});

test.each(['synchronous', 'asynchronous'] as const)(
	'T06 public remove retains a confirmed terminal runtime for readonly original-hint presentation (%s exit)',
	async (delivery) => {
		const f = await fixture({ deferStop: delivery === 'asynchronous' });
		try {
			const space = await f.spaces.create({ name: delivery, relativePath: '' });
			await f.workspace.selectSpace(space.id);
			const created = await f.workspace.createManaged({ spaceId: space.id, kind: 'agent', agentId: 'pi' });
			if (created.status !== 'created') throw new Error('create failed');
			const ref = {
				spaceId: space.id,
				sessionId: created.session.sessionId,
				runtimeId: created.session.runtime.runtimeId,
			};
			const session = f.sessions.get(ref.runtimeId)!;
			const source = session.bindActivityRuntime().bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'original-instance' },
			})!;
			source.observe({
				deliveryId: 'original-completion',
				sourceSequence: 1,
				event: 'agent_settled',
				state: 'done',
				completion: 'turn-finished',
			});
			const at = session.getActivitySnapshot().at;
			await f.spaces.flush();
			expect(f.spaces.store.getState().records.sessions[ref.sessionId]?.completionHint).toMatchObject({
				runtimeId: at.runtimeId,
				activitySequence: at.activitySequence,
				seenThrough: 0,
			});

			f.sessions.remove(ref.runtimeId);
			expect(f.requestStop).toHaveBeenCalledOnce();
			if (delivery === 'asynchronous') {
				expect(f.sessions.get(ref.runtimeId)).toBe(session);
				await Promise.resolve();
				const tail = new TextEncoder().encode('final parsed output\r\n');
				f.output(session.sid, tail);
				f.exit(session.sid);
				expect(f.sessions.get(ref.runtimeId)).toBe(session);
				await session.whenParsed();
				expect(f.acknowledge.mock.calls.reduce((sum, call) => sum + Number(call[1]), 0)).toBe(tail.length);
			}
			await vi.waitFor(() => expect(f.sessions.get(ref.runtimeId)).toBeUndefined());
			expect(f.sessions.managedRef(ref.runtimeId)).toEqual(ref);
			expect(f.sessions.managedSummary(ref)?.phase).toBe('exited');
			expect(f.workspace.getManaged(ref)?.runtime).toMatchObject({
				runtimeId: ref.runtimeId,
				phase: 'exited',
				inputReady: false,
				termination: { root: { state: 'exited', code: 0 }, cleanup: { state: 'confirmed' } },
			});
			const opened = await f.workspace.openManagedRecord(ref);
			expect(opened.status).toBe('opened');
			const tab = f.workspace.active;
			if (tab?.kind !== 'terminal') throw new Error('no readonly placeholder');
			expect(tab.focusedSessionId).toBe(ref.runtimeId);
			expect(tab.panes[ref.runtimeId]).toMatchObject({
				spaceId: ref.spaceId,
				persistentSessionId: ref.sessionId,
			});
			expect(f.sessions.get(ref.runtimeId)).toBeUndefined();
			f.workspace.setVisible({}, [tab.id]);
			expect(
				await f.workspace.markManagedSeen({
					target: ref,
					at,
					view: { tabId: tab.id, paneSessionId: ref.runtimeId },
				}),
			).toMatchObject({ status: 'updated', mode: 'restored-hint', persisted: true });
			expect(f.spaces.store.getState().records.sessions[ref.sessionId]?.completionHint).toMatchObject({
				runtimeId: at.runtimeId,
				activitySequence: at.activitySequence,
				seenThrough: at.activitySequence,
			});
			expect(f.spawn).toHaveBeenCalledOnce();
		} finally {
			await f.close();
		}
	},
);

test('T06 verified pending admission is queryable across Spaces before environment awaits finish', async () => {
	const f = await fixture();
	let release!: (value: Record<string, string>) => void;
	try {
		const a = await f.spaces.create({ name: 'A', relativePath: '' }),
			b = await f.spaces.create({ name: 'B', relativePath: '' });
		await f.workspace.selectSpace(a.id);
		const gate = new Promise<Record<string, string>>((r) => (release = r));
		f.environment.mockImplementation(() => gate);
		const creating = f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
		await vi.waitFor(() => expect(f.workspace.listManaged(b.id)[0]?.runtime?.phase).toBe('launch-pending'));
		expect(f.workspace.active).toBeUndefined();
		expect(f.spawn).not.toHaveBeenCalled();
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id);
		release({});
		expect(await creating).toHaveProperty('status', 'created');
	} finally {
		release?.({});
		await f.close();
	}
});

test('T06 hint save failure stays visible without failing the live process or retrying on unrelated output', async () => {
	const f = await fixture();
	const write = f.storage.write;
	try {
		const space = await f.spaces.create({ name: 'failure', relativePath: '' }),
			created = await f.workspace.createManaged({ spaceId: space.id, kind: 'agent', agentId: 'pi' });
		if (created.status !== 'created') throw new Error('create');
		const ref = {
				spaceId: space.id,
				sessionId: created.session.sessionId,
				runtimeId: created.session.runtime.runtimeId,
			},
			session = f.sessions.get(ref.runtimeId)!;
		const source = session.bindActivityRuntime().bindSource({
			provider: 'pi',
			kind: 'native-hook',
			adapterRevision: '1',
			lifetime: { kind: 'registration', sourceInstance: 'p' },
		})!;
		const writes = vi.fn(async () => {
			throw new Error('disk full');
		});
		f.storage.write = writes;
		source.observe({
			deliveryId: '1',
			sourceSequence: 1,
			event: 'agent_settled',
			state: 'done',
			completion: 'turn-finished',
		});
		await vi.waitFor(() => expect(f.workspace.getManaged(ref)?.runtime?.error?.code).toBe('PERSISTENCE_FAILED'));
		const count = writes.mock.calls.length;
		session.rename('still alive');
		await Promise.resolve();
		await Promise.resolve();
		expect(writes).toHaveBeenCalledTimes(count);
		expect(session.connection).toBe('connected');
		expect(source.active()).toBe(true);
		f.storage.write = write;
		const snapshot = session.getActivitySnapshot();
		await f.spaces.observeActivityHint(ref, { ...snapshot.completion!, seenThrough: 0 });
		expect(f.workspace.getManaged(ref)?.runtime?.error).toBeUndefined();
	} finally {
		f.storage.write = write;
		await f.close();
	}
});
