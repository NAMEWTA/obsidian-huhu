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

async function fixture(options: { deferStop?: boolean; selectSpace?: () => Promise<string | undefined> } = {}) {
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
		selectSpace: options.selectSpace,
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
				selectSpace: options.selectSpace,
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
			history: async <T,>() => [] as T,
			request: async <T,>() => ({}) as T,
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

test('real foreground survives its own cross-Space presentation and focuses the exact split', async () => {
	const f = await fixture();
	const leaf = document.createElement('section'),
		anchor = document.createElement('button'),
		companionInput = document.createElement('textarea'),
		targetInput = document.createElement('textarea');
	leaf.append(anchor, companionInput, targetInput);
	document.body.append(leaf);
	let off: (() => void) | undefined;
	let offFocus: (() => void) | undefined;
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
		const attached = await f.workspace.attachManaged(ref);
		if (attached.status !== 'attached') throw new Error('attach failed');
		await f.workspace.splitPane(ref.runtimeId, 'row');
		const tab = f.workspace.active;
		if (tab?.kind !== 'terminal') throw new Error('no split');
		const companion = tab.focusedSessionId;
		await f.workspace.selectSpace(a.id);
		let token: ReturnType<typeof captureForegroundIntent> | undefined;
		f.launch.foreground = () =>
			(token = captureForegroundIntent({
				document,
				window,
				container: leaf,
				isCurrent: () => true,
				onTargetChange: () => () => {},
			}));
		companionInput.addEventListener('focus', () => f.workspace.focusSession(companion));
		anchor.focus();
		let once = true;
		off = f.workspace.store.subscribe(() => {
			if (!once || f.spaces.store.getState().records.selectedSpaceId !== b.id) return;
			once = false;
			const snapshot = f.workspace.getFocusPresentation();
			f.workspace.presentManagedFocus(
				snapshot,
				companion,
				companionInput,
				() => companionInput.focus(),
				'normal',
			);
		});
		offFocus = f.workspace.subscribeFocusPresentation(() => {
			const snapshot = f.workspace.getFocusPresentation();
			if (snapshot.request?.phase === 'committed')
				f.workspace.presentManagedFocus(
					snapshot,
					ref.runtimeId,
					targetInput,
					() => targetInput.focus(),
					'committed',
				);
		});
		const result = await f.workspace.attachManaged(ref, { expectedRuntimeId: ref.runtimeId, focus: true });
		expect(once).toBe(false);
		expect(f.sessions.get(ref.runtimeId)?.connection).toBe('connected');
		expect(result).toMatchObject({ status: 'attached', focused: true });
		expect(document.activeElement).toBe(targetInput);
		expect(f.spawn).toHaveBeenCalledTimes(2);
		expect(token?.valid()).toBe(true);
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('consumed');
	} finally {
		offFocus?.();
		off?.();
		leaf.remove();
		await f.close();
	}
});

async function displayFixture(options: Parameters<typeof fixture>[0] = {}) {
	const f = await fixture(options);
	const leaf = document.createElement('section'),
		anchor = document.createElement('button'),
		targetInput = document.createElement('textarea'),
		companionInput = document.createElement('textarea');
	leaf.append(anchor, targetInput, companionInput);
	document.body.append(leaf);
	const a = await f.spaces.create({ name: 'A', relativePath: '' }),
		b = await f.spaces.create({ name: 'B', relativePath: '' });
	await f.workspace.selectSpace(b.id);
	const created = await f.workspace.createManaged({ spaceId: b.id, kind: 'shell' });
	if (created.status !== 'created') throw new Error('create failed');
	const ref = { spaceId: b.id, sessionId: created.session.sessionId, runtimeId: created.session.runtime.runtimeId };
	await f.workspace.attachManaged(ref, { focus: false });
	await f.workspace.splitPane(ref.runtimeId, 'row');
	const tab = f.workspace.active;
	if (tab?.kind !== 'terminal') throw new Error('no split');
	const companion = tab.focusedSessionId;
	await f.workspace.selectSpace(a.id);
	anchor.focus();
	const changes = new Set<() => void>(),
		tokens: ReturnType<typeof captureForegroundIntent>[] = [];
	const foreground = vi.fn(() => {
		const intent = captureForegroundIntent({
			document,
			window,
			container: leaf,
			isCurrent: () => true,
			onTargetChange: (listener) => {
				changes.add(listener);
				return () => {
					changes.delete(listener);
				};
			},
		});
		tokens.push(intent);
		return intent;
	});
	f.launch.foreground = foreground;
	return {
		...f,
		a,
		b,
		ref,
		tabId: tab.id,
		companion,
		leaf,
		anchor,
		targetInput,
		companionInput,
		foreground,
		tokens,
		targetChange() {
			for (const listener of [...changes]) listener();
		},
		async close() {
			leaf.remove();
			await f.close();
			expect(changes.size).toBe(0);
		},
	};
}

test('pane.focus completes only after the real original-leaf commitFocus is consumed', async () => {
	const f = await displayFixture();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	const off = f.workspace.subscribeFocusPresentation(() => {
		const snapshot = f.workspace.getFocusPresentation();
		if (snapshot.request?.phase === 'committed')
			f.workspace.presentManagedFocus(snapshot, f.ref.runtimeId, f.targetInput, () => f.targetInput.focus(), 'committed');
	});
	try {
		const result = await f.workspace.panes.focus({ paneId: pane.paneId! }, { deadline: performance.now() + 1000 });
		expect(result).toMatchObject({ effect: 'completed', focused: true, focusRequestId: expect.any(Number) });
		expect(document.activeElement).toBe(f.targetInput);
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('consumed');
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally { off(); await f.close(); }
});

test.each(['abort', 'observer-throw'] as const)('confirmed pane focus survives synchronous %s before final promise settlement', async mode => {
	const f = await displayFixture(), abort = new AbortController();
	await f.workspace.selectSpace(f.b.id);
	f.workspace.focusSession(f.ref.runtimeId);
	await f.workspace.persistence.flush();
	f.anchor.focus();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	const observerError = new Error('post-consumption observer failed');
	let once = true;
	const off = f.workspace.subscribeFocusPresentation(() => {
		const snapshot = f.workspace.getFocusPresentation();
		if (snapshot.request?.phase === 'committed')
			f.workspace.presentManagedFocus(snapshot, f.ref.runtimeId, f.targetInput, () => f.targetInput.focus(), 'committed');
		else if (snapshot.request?.phase === 'consumed' && once) {
			once = false;
			if (mode === 'abort') abort.abort(new Error('abort after consumed'));
			else throw observerError;
		}
	});
	try {
		const result = await f.workspace.panes.focus({ paneId: pane.paneId! }, { signal: abort.signal, deadline: performance.now() + 1000 });
		expect(document.activeElement).toBe(f.targetInput);
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('consumed');
		expect(result).toMatchObject({ effect: 'completed', focused: true });
		if (mode === 'observer-throw') expect(result.error).toBe(observerError);
	} finally { off(); await f.close(); }
});

test('a committed pane presentation is not focus success and blur revokes its observation', async () => {
	const f = await displayFixture();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	const foreign = document.implementation.createHTMLDocument('foreign');
	const textarea = foreign.createElement('textarea'); foreign.body.append(textarea);
	let entered!: () => void;
	const committed = new Promise<void>(resolve => { entered = resolve; });
	const focus = vi.fn();
	const off = f.workspace.subscribeFocusPresentation(() => {
		const snapshot = f.workspace.getFocusPresentation();
		if (snapshot.request?.phase !== 'committed') return;
		expect(f.workspace.presentManagedFocus(snapshot, f.ref.runtimeId, textarea, focus, 'committed')).toBe(false);
		entered();
	});
	try {
		let finished = false;
		const pending = f.workspace.panes.focus({ paneId: pane.paneId! }, { deadline: performance.now() + 1000 }).finally(() => { finished = true; });
		await committed;
		expect(finished).toBe(false);
		window.dispatchEvent(new Event('blur'));
		expect(await pending).toMatchObject({ effect: 'partial', focused: false });
		expect(focus).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(f.anchor);
	} finally { off(); await f.close(); }
});

test.each([200, 5000])('pane focus uses the original %ims deadline capped by the unchanged 1000ms presentation window', async budget => {
	const f = await displayFixture();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
	let entered!: () => void;
	const committed = new Promise<void>(resolve => { entered = resolve; });
	let captured = f.workspace.getFocusPresentation();
	const off = f.workspace.subscribeFocusPresentation(() => {
		const snapshot = f.workspace.getFocusPresentation();
		if (snapshot.request?.phase === 'committed') { captured = snapshot; entered(); }
	});
	try {
		let finished = false;
		const pending = f.workspace.panes.focus({ paneId: pane.paneId! }, { deadline: performance.now() + budget }).finally(() => { finished = true; });
		await committed;
		await vi.advanceTimersByTimeAsync(Math.min(budget, 1000) - 1);
		expect(finished).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(await pending).toMatchObject({ effect: 'partial', focused: false });
		const focus = vi.fn();
		expect(f.workspace.presentManagedFocus(captured, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(false);
		expect(focus).not.toHaveBeenCalled();
	} finally { off(); vi.useRealTimers(); await f.close(); }
});

test('cancelling a pending Space selection ends observation and its late owned save cannot focus a terminal', async () => {
	const f = await displayFixture(), abort = new AbortController();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	let entered!: () => void, release!: () => void;
	const started = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
	const write = f.storage.write; let armed = true;
	f.storage.write = async (path, text) => {
		if (armed && path === f.spaces.path && JSON.parse(text).selectedSpaceId === f.b.id) { armed = false; entered(); await gate; }
		await write(path, text);
	};
	const focus = vi.fn(() => f.targetInput.focus()), attempts: boolean[] = [];
	const off = f.workspace.store.subscribe(() => {
		if (f.spaces.store.getState().records.selectedSpaceId === f.b.id)
			attempts.push(f.workspace.presentManagedFocus(f.workspace.getFocusPresentation(), f.ref.runtimeId, f.targetInput, focus, 'normal'));
	});
	try {
		const pending = f.workspace.panes.focus({ paneId: pane.paneId! }, { signal: abort.signal, deadline: performance.now() + 1000 });
		await started; abort.abort(new Error('cancel pending selection'));
		expect(await pending).toMatchObject({ effect: 'unknown', persisted: true, focused: false });
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.a.id);
		release(); await f.spaces.flush();
		expect(attempts.length).toBeGreaterThan(0); expect(attempts.every(value => !value)).toBe(true);
		expect(f.workspace.presentManagedFocus(f.workspace.getFocusPresentation(), f.ref.runtimeId, f.targetInput, focus, 'normal')).toBe(false);
		expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(f.anchor);
	} finally { release(); off(); await f.close(); }
});

test('committed presentation verifies exact persistent Pane binding before consuming the token', async () => {
	const f = await displayFixture();
	try {
		await f.workspace.attachManaged(f.ref);
		const snapshot = f.workspace.getFocusPresentation(),
			focus = vi.fn();
		// Corrupt only the layout binding while retaining the same active runtime and navigation tuple.
		f.workspace.store.setState((s) => {
			const tab = s.tabs[f.tabId];
			if (tab?.kind !== 'terminal') throw new Error('missing tab');
			return {
				...s,
				tabs: {
					...s.tabs,
					[tab.id]: {
						...tab,
						panes: { ...tab.panes, [f.ref.runtimeId]: { ...tab.panes[f.ref.runtimeId]!, spaceId: f.a.id } },
					},
				},
			};
		}, true);
		expect(f.workspace.presentManagedFocus(snapshot, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(
			false,
		);
		expect(focus).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});

test.each(['user-navigation', 'token-revoked', 'closing'] as const)(
	'owned Space select cannot begin after its flush loses permission (%s)',
	async (reason) => {
		const f = await displayFixture();
		let release = () => {};
		const flush = f.workspace.persistence.flush.bind(f.workspace.persistence);
		try {
			let entered = () => {};
			const started = new Promise<void>((r) => {
					entered = r;
				}),
				gate = new Promise<void>((r) => {
					release = r;
				});
			let calls = 0;
			vi.spyOn(f.workspace.persistence, 'flush').mockImplementation(async () => {
				if (++calls === 2) {
					entered();
					await gate;
				}
				return flush();
			});
			const select = vi.spyOn(f.spaces, 'select'),
				pending = f.workspace.attachManaged(f.ref);
			await started;
			if (reason === 'user-navigation') f.workspace.openPage('board');
			if (reason === 'token-revoked')
				f.anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
			if (reason === 'closing') f.workspace.quiesce();
			release();
			expect(await pending).toMatchObject({ status: 'attached', focused: false });
			expect(select).not.toHaveBeenCalled();
			expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.a.id);
		} finally {
			release();
			await f.close();
		}
	},
);

test('each already-focused attach publishes its own commit and consumed cleanup cannot refocus', async () => {
	const f = await displayFixture();
	try {
		const first = await f.workspace.attachManaged(f.ref);
		expect(first).toMatchObject({ status: 'attached', focused: true });
		const old = f.workspace.getFocusPresentation(),
			focus = vi.fn(() => f.targetInput.focus());
		expect(f.workspace.presentManagedFocus(old, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(true);
		const consumed = f.workspace.getFocusPresentation();
		expect(consumed.request).toMatchObject({ id: old.request!.id, phase: 'consumed' });
		expect(consumed.navigationGeneration).toBe(old.navigationGeneration);
		expect(f.workspace.presentManagedFocus(consumed, f.ref.runtimeId, f.targetInput, focus, 'normal')).toBe(false);
		expect(f.workspace.presentManagedFocus(old, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(false);
		const state = f.workspace.store.getState();
		f.anchor.focus();
		await f.workspace.attachManaged(f.ref);
		const next = f.workspace.getFocusPresentation();
		expect(next.request).toMatchObject({ id: old.request!.id + 1, phase: 'committed' });
		expect(next.navigationGeneration).toBe(old.navigationGeneration);
		expect(f.workspace.store.getState()).toBe(state);
		expect(f.workspace.presentManagedFocus(next, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(true);
		expect(focus).toHaveBeenCalledTimes(2);
		f.workspace.focusSession(f.companion);
		const navigation = f.workspace.getFocusPresentation();
		expect(navigation.navigationGeneration).toBeGreaterThan(next.navigationGeneration);
		expect(f.workspace.presentManagedFocus(consumed, f.companion, f.companionInput, focus, 'normal')).toBe(false);
		const ordinary = vi.fn(() => f.companionInput.focus());
		expect(f.workspace.presentManagedFocus(navigation, f.companion, f.companionInput, ordinary, 'normal')).toBe(
			true,
		);
		expect(ordinary).toHaveBeenCalledOnce();
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		await f.close();
	}
});

test.each(['pointer', 'key', 'external-focus', 'blur', 'leaf', 'different-leaf'] as const)(
	'real committed token cannot focus after %s',
	async (reason) => {
		const f = await displayFixture(),
			other = document.createElement('textarea');
		document.body.append(other);
		try {
			await f.workspace.attachManaged(f.ref);
			const captured = f.workspace.getFocusPresentation(),
				focus = vi.fn();
			if (reason === 'pointer') f.anchor.dispatchEvent(new Event('pointerdown', { bubbles: true }));
			if (reason === 'key') f.anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
			if (reason === 'external-focus') other.focus();
			if (reason === 'blur') window.dispatchEvent(new Event('blur'));
			if (reason === 'leaf') f.targetChange();
			expect(
				f.workspace.presentManagedFocus(
					captured,
					f.ref.runtimeId,
					reason === 'different-leaf' ? other : f.targetInput,
					focus,
					'committed',
				),
			).toBe(false);
			expect(
				f.workspace.presentManagedFocus(
					f.workspace.getFocusPresentation(),
					f.ref.runtimeId,
					f.targetInput,
					focus,
					'normal',
				),
			).toBe(false);
			expect(focus).not.toHaveBeenCalled();
		} finally {
			other.remove();
			await f.close();
		}
	},
);

test('commit deadline is 1000ms, does not renew, and expiry cleanup does not grant normal focus', async () => {
	const f = await displayFixture();
	try {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		const before = Date.now();
		await f.workspace.attachManaged(f.ref);
		const snapshot = f.workspace.getFocusPresentation(),
			focus = vi.fn();
		expect(Date.now()).toBe(before);
		await vi.advanceTimersByTimeAsync(999);
		expect(f.workspace.getFocusPresentation()).toBe(snapshot);
		// Reading the snapshot does not move the one original deadline.
		await vi.advanceTimersByTimeAsync(1);
		const expired = f.workspace.getFocusPresentation();
		expect(expired.request).toMatchObject({ id: snapshot.request!.id, phase: 'cancelled' });
		expect(expired.navigationGeneration).toBe(snapshot.navigationGeneration);
		expect(f.workspace.presentManagedFocus(snapshot, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(
			false,
		);
		expect(f.workspace.presentManagedFocus(expired, f.ref.runtimeId, f.targetInput, focus, 'normal')).toBe(false);
		expect(focus).not.toHaveBeenCalled();
	} finally {
		vi.useRealTimers();
		await f.close();
	}
});

test('reentrant navigation in the owned Space publication cannot inherit the selecting caller', async () => {
	const f = await displayFixture();
	let off = () => {};
	try {
		let armed = true;
		off = f.workspace.store.subscribe(() => {
			if (!armed || f.spaces.store.getState().records.selectedSpaceId !== f.b.id) return;
			const tab = f.workspace.active;
			if (tab?.kind !== 'terminal' || tab.focusedSessionId !== f.companion) return;
			armed = false;
			f.workspace.focusSession(f.ref.runtimeId);
		});
		const result = await f.workspace.attachManaged(f.ref);
		expect(armed).toBe(false);
		expect(result).toMatchObject({ status: 'attached', focused: false });
		expect(f.workspace.active).toMatchObject({ focusedSessionId: f.ref.runtimeId });
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('cancelled');
		expect(
			f.workspace.presentManagedFocus(
				f.workspace.getFocusPresentation(),
				f.ref.runtimeId,
				f.targetInput,
				vi.fn(),
				'committed',
			),
		).toBe(false);
		expect(document.activeElement).toBe(f.anchor);
	} finally {
		off();
		await f.close();
	}
});

test('background attach never captures an intent or creates a presentation request', async () => {
	const f = await displayFixture();
	try {
		const captured = f.workspace.getFocusPresentation();
		expect(await f.workspace.attachManaged(f.ref, { focus: false })).toMatchObject({
			status: 'attached',
			focused: false,
		});
		expect(f.foreground).not.toHaveBeenCalled();
		expect(f.workspace.getFocusPresentation()).toBe(captured);
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.a.id);
		expect(document.activeElement).toBe(f.anchor);
	} finally {
		await f.close();
	}
});

test('concurrent real tokens retain one latest commit and old caller cleanup cannot release it', async () => {
	const f = await displayFixture();
	let release = () => {};
	try {
		const original = f.storage.write.bind(f.storage);
		let enter = () => {};
		const entered = new Promise<void>((r) => {
				enter = r;
			}),
			gate = new Promise<void>((r) => {
				release = r;
			});
		let armed = true;
		vi.spyOn(f.storage, 'write').mockImplementation(async (path, value) => {
			if (armed && path === f.spaces.path && JSON.parse(value).selectedSpaceId === f.b.id) {
				armed = false;
				enter();
				await gate;
			}
			return original(path, value);
		});
		const first = f.workspace.attachManaged(f.ref);
		await entered;
		const old = f.workspace.getFocusPresentation();
		const second = f.workspace.attachManaged(f.ref);
		const next = f.workspace.getFocusPresentation();
		expect(next.request!.id).toBe(old.request!.id + 1);
		release();
		const results = await Promise.all([first, second]);
		expect(results[0]).toMatchObject({ status: 'attached', focused: false });
		expect(results[1]).toMatchObject({ status: 'attached', focused: true });
		const committed = f.workspace.getFocusPresentation(),
			focus = vi.fn(() => f.targetInput.focus());
		expect(committed.request).toMatchObject({ id: next.request!.id, phase: 'committed' });
		expect(f.workspace.presentManagedFocus(old, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(false);
		expect(f.workspace.presentManagedFocus(committed, f.ref.runtimeId, f.targetInput, focus, 'committed')).toBe(
			true,
		);
		expect(focus).toHaveBeenCalledOnce();
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally {
		release();
		await f.close();
	}
});

test('foreground create and live-record open reuse one original token and preserve show after synchronous consumption', async () => {
	const f = await fixture(),
		leaf = document.createElement('section'),
		anchor = document.createElement('button'),
		input = document.createElement('textarea');
	leaf.append(anchor, input);
	document.body.append(leaf);
	let off = () => {};
	try {
		const space = await f.spaces.create({ name: 'A', relativePath: '' });
		await f.workspace.selectSpace(space.id);
		anchor.focus();
		const foreground = vi.fn(() =>
			captureForegroundIntent({
				document,
				window,
				container: leaf,
				isCurrent: () => true,
				onTargetChange: () => () => {},
			}),
		);
		f.launch.foreground = foreground;
		f.launch.show = vi.fn(async () => {});
		off = f.workspace.subscribeFocusPresentation(() => {
			const captured = f.workspace.getFocusPresentation();
			if (captured.request?.phase === 'committed')
				f.workspace.presentManagedFocus(
					captured,
					captured.request.target.runtimeId,
					input,
					() => input.focus(),
					'committed',
				);
		});
		const created = await f.workspace.createManagedInteractive({
			spaceId: space.id,
			kind: 'shell',
			foreground: true,
		});
		expect(created.status).toBe('created');
		expect(foreground).toHaveBeenCalledOnce();
		expect(f.launch.show).toHaveBeenCalledOnce();
		if (created.status !== 'created') throw new Error('create failed');
		expect(f.workspace.getFocusPresentation().request?.phase).toBe('consumed');
		anchor.focus();
		expect(await f.workspace.openManagedRecord(created.session)).toMatchObject({ status: 'opened' });
		expect(foreground).toHaveBeenCalledTimes(2);
		expect(f.spawn).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(input);
	} finally {
		off();
		leaf.remove();
		await f.close();
	}
});

test('a rejected View in another leaf cannot consume or cancel the correct live View capability', async () => {
	const f = await displayFixture(),
		other = document.createElement('textarea');
	document.body.append(other);
	try {
		await f.workspace.attachManaged(f.ref);
		const captured = f.workspace.getFocusPresentation(),
			wrong = vi.fn(),
			right = vi.fn(() => f.targetInput.focus());
		expect(f.workspace.presentManagedFocus(captured, f.ref.runtimeId, other, wrong, 'committed')).toBe(false);
		expect(wrong).not.toHaveBeenCalled();
		expect(f.workspace.presentManagedFocus(captured, f.ref.runtimeId, f.targetInput, right, 'committed')).toBe(
			true,
		);
		expect(right).toHaveBeenCalledOnce();
	} finally {
		other.remove();
		await f.close();
	}
});

test('GUI Space choice binds pending launch before display selection and consumes the original intent once', async () => {
	let choice: string | undefined;
	const chooser = vi.fn(async () => choice),
		f = await displayFixture({ selectSpace: chooser });
	let off = () => {},
		offFocus = () => {},
		release = () => {};
	try {
		choice = f.b.id;
		let enter = () => {};
		const started = new Promise<void>((r) => {
				enter = r;
			}),
			gate = new Promise<void>((r) => {
				release = r;
			});
		f.environment.mockImplementationOnce(async () => {
			enter();
			await gate;
			return {};
		});
		f.launch.show = vi.fn(async () => {});
		off = f.workspace.store.subscribe(() => {
			if (f.spaces.store.getState().records.selectedSpaceId !== f.b.id) return;
			const tab = f.workspace.active;
			if (tab?.kind !== 'terminal') return;
			const captured = f.workspace.getFocusPresentation();
			f.workspace.presentManagedFocus(
				captured,
				tab.focusedSessionId,
				f.companionInput,
				() => f.companionInput.focus(),
				'normal',
			);
		});
		offFocus = f.workspace.subscribeFocusPresentation(() => {
			const captured = f.workspace.getFocusPresentation();
			if (captured.request?.phase === 'committed')
				f.workspace.presentManagedFocus(
					captured,
					captured.request.target.runtimeId,
					f.targetInput,
					() => f.targetInput.focus(),
					'committed',
				);
		});
		const pending = f.workspace.createManagedInteractive({ kind: 'shell', foreground: true });
		await started;
		const admitted = f.workspace.listManaged(f.b.id).filter((row) => row.runtime?.phase === 'launch-pending');
		expect(admitted).toHaveLength(1);
		expect(admitted[0]?.spaceId).toBe(f.b.id);
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.a.id);
		expect(chooser).toHaveBeenCalledOnce();
		release();
		const created = await pending;
		expect(created.status).toBe('created');
		expect(f.foreground).toHaveBeenCalledOnce();
		expect(f.launch.show).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(f.targetInput);
		expect(f.spawn).toHaveBeenCalledTimes(3);
	} finally {
		release();
		off();
		offFocus();
		await f.close();
	}
});

test('cancelled GUI Space choice has zero admission, helper calls or display request', async () => {
	const chooser = vi.fn(async () => undefined),
		f = await displayFixture({ selectSpace: chooser });
	try {
		const count = f.spawn.mock.calls.length,
			records = Object.keys(f.spaces.store.getState().records.sessions);
		f.environment.mockClear();
		const captured = f.workspace.getFocusPresentation();
		expect(await f.workspace.createManagedInteractive({ kind: 'shell', foreground: true })).toEqual({
			status: 'cancelled',
			effect: 'none',
			reason: 'space-selection',
		});
		expect(chooser).toHaveBeenCalledOnce();
		expect(f.environment).not.toHaveBeenCalled();
		expect(f.foreground).not.toHaveBeenCalled();
		expect(f.spawn).toHaveBeenCalledTimes(count);
		expect(Object.keys(f.spaces.store.getState().records.sessions)).toEqual(records);
		expect(f.workspace.getFocusPresentation()).toBe(captured);
		expect(document.activeElement).toBe(f.anchor);
	} finally {
		await f.close();
	}
});

test('GUI choice remains bound to B when later user navigation cancels its late presentation', async () => {
	let choice: string | undefined;
	const f = await displayFixture({ selectSpace: async () => choice });
	let release = () => {};
	try {
		choice = f.b.id;
		const c = await f.spaces.create({ name: 'C', relativePath: '' });
		let enter = () => {};
		const started = new Promise<void>((r) => {
				enter = r;
			}),
			gate = new Promise<void>((r) => {
				release = r;
			});
		f.environment.mockImplementationOnce(async () => {
			enter();
			await gate;
			return {};
		});
		f.launch.show = vi.fn(async () => {});
		const pending = f.workspace.createManagedInteractive({ kind: 'shell', foreground: true });
		await started;
		const admitted = f.workspace.listManaged(f.b.id).find((row) => row.runtime?.phase === 'launch-pending');
		expect(admitted).toBeDefined();
		await f.workspace.selectSpace(c.id);
		release();
		const result = await pending;
		expect(result).toMatchObject({
			status: 'created',
			session: { spaceId: f.b.id, sessionId: admitted!.sessionId },
		});
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(c.id);
		expect(f.launch.show).not.toHaveBeenCalled();
		expect(f.workspace.getFocusPresentation().request).toBeUndefined();
		expect(f.spawn).toHaveBeenCalledTimes(3);
	} finally {
		release();
		await f.close();
	}
});

test('a cancelled presentation observer failure settles with layout facts and releases its original intent', async () => {
	const f = await displayFixture();
	const pane = (await f.workspace.panes.list(f.b.id)).panes.find(row => row.runtimeId === f.ref.runtimeId)!;
	const observerError = new Error('cancel observer failed');
	const off = f.workspace.subscribeFocusPresentation(() => {
		const phase = f.workspace.getFocusPresentation().request?.phase;
		if (phase === 'committed') window.dispatchEvent(new Event('blur'));
		if (phase === 'cancelled') throw observerError;
	});
	try {
		const result = await f.workspace.panes.focus({ paneId: pane.paneId! }, { deadline: performance.now() + 200 });
		expect(result).toMatchObject({ effect: 'partial', focused: false, layoutPublished: true, persisted: true });
		expect(result.error).toBe(observerError);
		expect(f.tokens.every(token => !token.valid())).toBe(true);
		expect(document.activeElement).toBe(f.anchor);
	} finally { off(); await f.close(); }
});

test.each(['attach-background', 'foreground-create'] as const)('review F1 original foreground permission stays separate from explicit group for %s', async operation => {
	const f = await displayFixture();
	let off = () => {};
	try {
		await f.workspace.selectSpace(f.b.id);
		const other = await f.workspace.createManaged({ spaceId: f.b.id, kind: 'shell', foreground: false });
		if (other.status !== 'created') throw new Error('Fixture create failed');
		const otherView = await f.workspace.attachManaged(other.session, { focus: false });
		if (otherView.status !== 'attached') throw new Error('Fixture attach failed');
		const leftGroup = f.workspace.store.getState().groups[0]!.id;
		f.workspace.move(otherView.tabId, { split: 'right', ofGroupId: leftGroup }); f.workspace.activate(f.tabId);
		const rightGroup = f.workspace.store.getState().groups.find(group => group.id !== leftGroup)!.id;
		f.anchor.focus(); const beforeSpawns = f.spawn.mock.calls.length;
		let runtime: string;
		if (operation === 'attach-background') {
			const created = await f.workspace.createManaged({ spaceId: f.b.id, kind: 'shell', foreground: false });
			if (created.status !== 'created') throw new Error('Fixture create failed');
			runtime = created.session.runtime.runtimeId;
			expect(await f.workspace.attachManaged(created.session, { groupId: rightGroup, focus: false })).toMatchObject({ status: 'attached', focused: false });
			expect(document.activeElement).toBe(f.anchor); expect(f.foreground).not.toHaveBeenCalled();
		} else {
			off = f.workspace.subscribeFocusPresentation(() => {
				const snapshot = f.workspace.getFocusPresentation();
				if (snapshot.request?.phase === 'committed')
					f.workspace.presentManagedFocus(snapshot, snapshot.request.target.runtimeId, f.targetInput, () => f.targetInput.focus(), 'committed');
			});
			const created = await f.workspace.createManagedInteractive({ spaceId: f.b.id, kind: 'shell', groupId: rightGroup, foreground: true });
			if (created.status !== 'created') throw new Error('Fixture create failed');
			runtime = created.session.runtime.runtimeId;
			expect(document.activeElement).toBe(f.targetInput); expect(f.foreground).toHaveBeenCalledOnce();
			expect(f.workspace.getFocusPresentation().request).toMatchObject({ phase: 'consumed', target: { runtimeId: runtime } });
		}
		const state = f.workspace.store.getState(), tabs = Object.values(state.tabs).filter(tab => tab.kind === 'terminal' && tab.sessionIds.includes(runtime));
		expect(tabs).toHaveLength(1);
		expect(state.groups.find(group => group.tabIds.includes(tabs[0]!.id))?.id).toBe(rightGroup);
		expect(state.activeGroupId).toBe(operation === 'attach-background' ? leftGroup : rightGroup);
		expect(f.spawn).toHaveBeenCalledTimes(beforeSpawns + 1);
	} finally { off(); await f.close(); }
});
