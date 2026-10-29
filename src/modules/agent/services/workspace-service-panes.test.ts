import { expect, test, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { NativeHost } from '../../../host/desktop/native/host';
import type { NativeEvents } from '../../../shared/native/host';
import type { TextStorage } from '../../../shared/storage/ports';
import { normalizeTerminalSettings } from '../core/terminal/settings';
import { emptyWorkspace, type TerminalTabData } from '../core/workspace/model';
import type { LayoutNode } from '../core/terminal/layout';
import { SpaceService } from './spaces/space-service';
import { TerminalSessions } from './terminal/sessions';
import { createSpaceWorkspaceStore } from './workspace-store';
import { WorkspaceService, type WorkspaceLaunchPort } from './workspace-service';

async function fixture() {
	const files = new Map<string, string>();
	const storage: TextStorage = { exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, value) => { files.set(path, value); }, mkdir: async () => {} };
	const root = { canonicalPath: '/fixture', dev: '1', ino: '2' }, vault = { vaultId: 'v', deviceId: 'd', rootPath: '/fixture', root };
	const spaces = new SpaceService({ storage, instanceId: 'pane-tests', report: vi.fn(),
		directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_vault, relativePath) => ({ kind: 'vault', relativePath, target: root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/fixture' }) },
		owners: { acquire: async () => ({ instanceId: 'pane-tests', port: 12345, lost: new AbortController().signal, assertHeld: async () => {}, close: async () => {} }) } });
	let events!: NativeEvents, sequence = 0;
	const exit = (sid: number) => {
		events.termination?.(sid, { version: 1, sequence: ++sequence, evidence: { root: { state: 'exited', code: 0, signal: null }, cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 }, output: 'drained' } });
		events.exit(sid, 0, null);
	};
	const spawn = vi.fn(async () => 42), stop = vi.fn(exit), input = vi.fn();
	const native = new NativeHost(async e => {
		events = e;
		return { alive: true, version: 'fixture', terminalTermination: 1, spawnSession: spawn, requestStop: stop, input, resize() {}, acknowledge() {}, end: exit, history: async <T>() => [] as T, request: async <T>() => ({}) as T, dispose: async () => { e.closed('closed'); } };
	});
	const environment = vi.fn(async () => ({}));
	const sessions = new TerminalSessions({ native, environment, settings: () => normalizeTerminalSettings({}), platform: 'linux', colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }) });
	const launch: WorkspaceLaunchPort = {
		shell: options => sessions.create({ kind: 'shell', title: 'fixture', file: 'sh', args: [], cwd: options.cwd!, runtime: options.runtime, beforeSpawn: options.beforeSpawn }),
		agent: async () => undefined, resume: async () => undefined, account: () => '', report: vi.fn(),
	};
	const clock = { setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number, clearTimeout: (id: number) => clearTimeout(id) };
	const workspace = new WorkspaceService(createSpaceWorkspaceStore(spaces, clock, vi.fn()), sessions, launch, undefined, spaces);
	await workspace.persistence.ready;
	const space = await spaces.create({ name: 'A', relativePath: '' }); await workspace.selectSpace(space.id);
	const create = async (title: string, spaceId = space.id) => {
		const result = await workspace.createManaged({ kind: 'shell', spaceId, title, foreground: false });
		if (result.status !== 'created') throw new Error('Fixture Session was not created');
		return result.session;
	};
	return { files, storage, spaces, workspace, sessions, native, space, create, spawn, stop, input, launch, environment,
		async dispose() { try { await workspace.dispose(); } finally { await sessions.dispose(); await native.dispose(); } },
	};
}

test('concurrent attach is one original runtime display and list is a zero-effect query', async () => {
	const f = await fixture();
	try {
		const session = await f.create('A');
		const target = { spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.runtime.runtimeId };
		const results = await Promise.all([f.workspace.panes.attach(target, { deadline: performance.now() + 1000 }), f.workspace.panes.attach(target)]);
		expect(results.map(result => result.effect).sort()).toEqual(['completed', 'none']);
		expect(results[0]?.pane?.paneId).toBe(results[1]?.pane?.paneId);
		const writes = vi.spyOn(f.storage, 'write'), random = vi.spyOn(crypto, 'randomUUID');
		const first = await f.workspace.panes.list(), second = await f.workspace.panes.list();
		expect(first).toEqual(second); expect(first.panes).toHaveLength(1);
		expect(first.panes[0]).toMatchObject({ sessionId: target.sessionId, runtimeId: target.runtimeId });
		expect(writes).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
		expect(f.spawn).toHaveBeenCalledTimes(1); expect(f.stop).not.toHaveBeenCalled(); expect(f.input).not.toHaveBeenCalled();
	} finally { await f.dispose(); }
});

test('split inserts the explicit third Session, nearest second ratio is inverted, and close only detaches', async () => {
	const f = await fixture();
	try {
		const a = await f.create('A'), b = await f.create('B'), c = await f.create('C');
		const attached = await f.workspace.panes.attach(a);
		if (!attached.pane?.paneId) throw new Error('Missing original Pane');
		const ab = await f.workspace.panes.split({ paneId: attached.pane.paneId }, b, 'row');
		if (!ab.insertedPane?.paneId) throw new Error('Missing B Pane');
		const bc = await f.workspace.panes.split({ paneId: ab.insertedPane.paneId }, c, 'column');
		expect(bc).toMatchObject({ effect: 'completed', pane: { sessionId: b.sessionId }, insertedPane: { sessionId: c.sessionId, runtimeId: c.runtime.runtimeId } });
		const paneId = bc.insertedPane!.paneId!;
		const resized = await f.workspace.panes.resize({ paneId }, 0.2);
		expect(resized.effect).toBe('completed');
		const tab = f.workspace.store.getState().tabs[attached.pane.tabId] as TerminalTabData;
		expect(tab.paneLayout).toMatchObject({ kind: 'split', ratio: 0.5, second: { kind: 'split', direction: 'column', ratio: 0.8 } });
		expect(tab.focusedSessionId).toBe(a.runtime.runtimeId);
		expect((await f.workspace.panes.resize({ paneId }, 0.1)).effect).toBe('none');
		expect((await f.workspace.panes.close({ paneId })).effect).toBe('completed');
		expect(() => f.workspace.panes.capture({ paneId })).toThrow('missing-pane');
		expect(f.sessions.get(c.runtime.runtimeId)?.running).toBe(true);
		expect(f.stop).not.toHaveBeenCalled(); expect(f.spawn).toHaveBeenCalledTimes(3); expect(f.input).not.toHaveBeenCalled();
		const again = await f.workspace.panes.attach(c);
		expect(again.pane?.paneId).not.toBe(paneId);
	} finally { await f.dispose(); }
});

test('reopening a closed display cannot resurrect its old Pane identity', async () => {
	const f = await fixture();
	try {
		const session = await f.create('A'), attached = await f.workspace.panes.attach(session);
		const paneId = attached.pane!.paneId!;
		await f.workspace.panes.close({ paneId });
		f.workspace.reopen(attached.pane!.tabId);
		const reopened = (await f.workspace.panes.list()).panes[0]!;
		expect(reopened.paneId).not.toBe(paneId);
		expect(reopened).toMatchObject({ sessionId: session.sessionId, runtimeId: session.runtime.runtimeId });
		expect(f.spawn).toHaveBeenCalledTimes(1); expect(f.stop).not.toHaveBeenCalled();
	} finally { await f.dispose(); }
});

test('a retained stopped Session capture never follows a newer pending runtime', async () => {
	const f = await fixture();
	try {
		const session = await f.create('A');
		await f.workspace.stopManaged({ spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.runtime.runtimeId });
		const captured = f.workspace.panes.captureSession(session);
		const admission = await f.spaces.prepareSession(session.spaceId, { kind: 'shell', title: 'A' }, session.sessionId);
		const pending = f.sessions.reserveManaged(admission.record);
		expect(pending.runtimeId).not.toBe(captured.observedRuntimeId);
		const result = await f.workspace.panes.attach(captured);
		expect(result).toMatchObject({ effect: 'none', error: { code: 'STALE_RUNTIME' } });
		expect((await f.workspace.panes.attach(session)).error).toMatchObject({ code: 'CAPABILITY_UNAVAILABLE', reason: 'launch-pending' });
		expect(f.spawn).toHaveBeenCalledTimes(1);
	} finally { await f.dispose(); }
});

test('a stopped Session attaches only a saved reference without starting or focusing a model', async () => {
	const f = await fixture();
	try {
		const session = await f.create('A');
		await f.workspace.stopManaged({ spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.runtime.runtimeId });
		f.stop.mockClear();
		const result = await f.workspace.panes.attach(session);
		expect(result).toMatchObject({ effect: 'completed', persisted: true, pane: { sessionId: session.sessionId, state: 'exited', focused: false } });
		expect(f.spawn).toHaveBeenCalledTimes(1); expect(f.stop).not.toHaveBeenCalled(); expect(f.input).not.toHaveBeenCalled();
		const tab = f.workspace.store.getState().tabs[result.pane!.tabId] as TerminalTabData;
		expect(tab.resume).toMatchObject({ persistentSessionId: session.sessionId });
	} finally { await f.dispose(); }
});

test('split rejects another Space, an existing display and a fifth leaf without changing source ownership', async () => {
	const f = await fixture();
	try {
		const a = await f.create('A'), b = await f.create('B'), c = await f.create('C'), d = await f.create('D'), e = await f.create('E');
		const otherSpace = await f.spaces.create({ name: 'same cwd B', relativePath: '' });
		const foreign = await f.create('foreign', otherSpace.id);
		const attached = await f.workspace.panes.attach(a), target = { paneId: attached.pane!.paneId! };
		expect((await f.workspace.panes.split(target, foreign, 'row')).error).toMatchObject({ code: 'SCOPE_MISMATCH' });
		expect((await f.workspace.panes.split(target, a, 'row')).error).toMatchObject({ code: 'INVALID_ARGUMENT' });
		for (const session of [b, c, d]) expect((await f.workspace.panes.split(target, session, 'row')).effect).toBe('completed');
		expect(await f.workspace.panes.split(target, e, 'row')).toMatchObject({ effect: 'none', error: { code: 'CAPACITY_EXCEEDED' } });
		expect((await f.workspace.panes.list(f.space.id)).panes).toHaveLength(4);
		expect((await f.workspace.panes.list(otherSpace.id)).panes).toHaveLength(0);
		expect(f.spawn).toHaveBeenCalledTimes(6); expect(f.stop).not.toHaveBeenCalled();
	} finally { await f.dispose(); }
});

test('cross-Space duplicate Pane IDs remain ambiguous even with an explicit Space hint', async () => {
	const f = await fixture();
	try {
		const a = await f.create('A'), spaceB = await f.spaces.create({ name: 'B', relativePath: '' }), b = await f.create('B', spaceB.id);
		const first = await f.workspace.panes.attach(a), second = await f.workspace.panes.attach(b);
		await f.workspace.selectSpace(spaceB.id);
		f.workspace.persistence.updateLayout!(view => {
			const tab = view.tabs[second.pane!.tabId] as TerminalTabData, key = second.pane!.leafKey;
			return { ...view, tabs: { ...view.tabs, [tab.id]: { ...tab, panes: { ...tab.panes, [key]: { ...tab.panes[key]!, paneId: first.pane!.paneId } } } } };
		});
		await f.workspace.persistence.flush();
		expect((await f.workspace.panes.list(f.space.id)).panes[0]?.issue).toBe('duplicate-id');
		expect(await f.workspace.panes.close({ paneId: first.pane!.paneId!, spaceId: f.space.id })).toMatchObject({ effect: 'none', error: { code: 'TARGET_AMBIGUOUS' } });
		expect(f.sessions.get(a.runtime.runtimeId)?.running).toBe(true);
		expect(f.sessions.get(b.runtime.runtimeId)?.running).toBe(true);
	} finally { await f.dispose(); }
});

test('explicit GUI restart replaces the runtime while preserving display identity and revoking old captures', async () => {
	const f = await fixture();
	try {
		const session = await f.create('A'), attached = await f.workspace.panes.attach(session);
		const original = f.workspace.panes.capture({ paneId: attached.pane!.paneId! });
		await f.workspace.stopManaged({ spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.runtime.runtimeId });
		await f.workspace.restore(original.tabId, original.leafKey, true);
		const current = (await f.workspace.panes.list()).panes[0]!;
		expect(current.paneId).toBe(original.paneId); expect(current.runtimeId).not.toBe(original.runtimeId);
		expect(current.sessionId).toBe(original.sessionId);
		expect(await f.workspace.panes.close(original)).toMatchObject({ effect: 'none', error: { code: 'STALE_RUNTIME' } });
		expect(f.sessions.get(current.runtimeId!)?.running).toBe(true);
		expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally { await f.dispose(); }
});


test.each(['attach', 'foreground-create', 'pane-default'] as const)('review F1 explicit nonactive GUI group survives %s', async operation => {
	const f = await fixture();
	try {
		const a = await f.create('left'), b = await f.create('right');
		const left = await f.workspace.attachManaged(a, { focus: false }), right = await f.workspace.attachManaged(b, { focus: false });
		if (left.status !== 'attached' || right.status !== 'attached') throw new Error('Fixture attach failed');
		const leftGroup = f.workspace.store.getState().groups[0]!.id;
		f.workspace.move(right.tabId, { split: 'right', ofGroupId: leftGroup });
		f.workspace.activate(left.tabId);
		const rightGroup = f.workspace.store.getState().groups.find(group => group.id !== leftGroup)!.id;
		const before = structuredClone(f.workspace.store.getState());
		let runtime: string;
		if (operation !== 'foreground-create') {
			const c = await f.create('C'); runtime = c.runtime.runtimeId;
			if (operation === 'attach') expect(await f.workspace.attachManaged(c, { groupId: rightGroup, focus: false })).toMatchObject({ status: 'attached', focused: false });
			else expect(await f.workspace.panes.attach(c)).toMatchObject({ effect: 'completed' });
		} else {
			const result = await f.workspace.createManaged({ kind: 'shell', title: 'C', spaceId: f.space.id, groupId: rightGroup, foreground: true });
			if (result.status !== 'created') throw new Error('Fixture create failed');
			runtime = result.session.runtime.runtimeId;
		}
		const state = f.workspace.store.getState(), tab = Object.values(state.tabs).find(tab => tab.kind === 'terminal' && tab.sessionIds.includes(runtime))!;
		expect(state.groups.find(group => group.tabIds.includes(tab.id))?.id).toBe(operation === 'pane-default' ? leftGroup : rightGroup);
		expect(state.activeGroupId).toBe(operation === 'foreground-create' ? rightGroup : leftGroup);
		if (operation !== 'foreground-create') expect(state.groups.map(group => group.activeTabId)).toEqual(before.groups.map(group => group.activeTabId));
		expect(Object.values(state.tabs).filter(tab => tab.kind === 'terminal' && tab.sessionIds.includes(runtime))).toHaveLength(1);
		expect(f.spawn).toHaveBeenCalledTimes(3); expect(f.input).not.toHaveBeenCalled();
	} finally { await f.dispose(); }
});

async function seedLegacyLeaves(f: Awaited<ReturnType<typeof fixture>>, count: number) {
	for (let offset = 0, index = 0; offset < count; index++) {
		const space = await f.spaces.create({ name: `old-${index}` });
		const size = Math.min(800, count - offset), tabs: Record<string, TerminalTabData> = {};
		for (let start = 0; start < size; start += 4) {
			const keys = Array.from({ length: Math.min(4, size - start) }, (_, i) => `legacy-${offset + start + i}`);
			const tree = (ids: string[]): LayoutNode => ids.length === 1 ? { kind: 'pane', session: ids[0]! }
				: { kind: 'split', direction: 'row', ratio: 0.5, first: tree(ids.slice(0, Math.ceil(ids.length / 2))), second: tree(ids.slice(Math.ceil(ids.length / 2))) };
			const id = `tab-${index}-${start}`;
			tabs[id] = { kind: 'terminal', id, title: id, createdAt: 1, updatedAt: 1, state: 'unknown', unread: false,
				sessionIds: keys, focusedSessionId: keys[0]!, paneLayout: tree(keys), panes: Object.fromEntries(keys.map(key => [key, { cwd: '/fixture', paneId: `id-${key}` }])) };
		}
		const ids = Object.keys(tabs), groupId = `g-${index}`;
		await f.spaces.saveLayout(space.id, { base: emptyWorkspace(), value: { ...emptyWorkspace(), tabs, groups: [{ id: groupId, tabIds: ids, activeTabId: ids[0], recentTabIds: [] }], activeGroupId: groupId, layout: { kind: 'group', groupId } } });
		offset += size;
	}
}
function saveCapacityFact(name: string, stage: string, f: Awaited<ReturnType<typeof fixture>>) {
	const primary = f.files.get(f.spaces.path)!;
	const folder = process.env.HUHU_PANE_CAPTURE_FILE?.replace(/\/[^/]*$/, '');
	if (folder) writeFileSync(`${folder}/${name}-${stage}-primary.json`, primary);
	const records = JSON.parse(primary) as { layouts: Record<string, { tabs: Record<string, TerminalTabData> }> };
	return Object.values(records.layouts).reduce((sum, view) => sum + Object.values(view.tabs).reduce((total, tab) => total + (tab.sessionIds?.length ?? 0), 0), 0);
}

test.each([4095, 4096])('review F2 attach admits only the remaining global slot at %i', async count => {
	const f = await fixture();
	try {
		const source = await f.create('source'), next = await f.create('next'), extra = await f.create('extra');
		const attached = await f.workspace.panes.attach(source);
		await seedLegacyLeaves(f, count - 1);
		expect(saveCapacityFact(`attach-${count}`, 'before', f)).toBe(count);
		const writes = vi.spyOn(f.storage, 'write');
		const result = await f.workspace.panes.attach(next);
		if (count === 4095) {
			expect(result).toMatchObject({ effect: 'completed', persisted: true });
			expect(saveCapacityFact(`attach-${count}`, 'last-legal', f)).toBe(4096);
			writes.mockClear();
		} else expect(result).toMatchObject({ effect: 'none', layoutPublished: false, persisted: false, error: { code: 'CAPACITY_EXCEEDED' } });
		const rejected = await f.workspace.panes.attach(extra);
		expect(rejected).toMatchObject({ effect: 'none', layoutPublished: false, persisted: false, error: { code: 'CAPACITY_EXCEEDED' } });
		expect(saveCapacityFact(`attach-${count}`, 'after-reject', f)).toBe(4096);
		expect(await f.workspace.panes.attach(source)).toMatchObject({ effect: 'none', pane: { paneId: attached.pane!.paneId } });
		expect(writes).not.toHaveBeenCalled();
		expect((await f.workspace.panes.list(f.space.id)).panes).toHaveLength(count === 4095 ? 2 : 1);
		expect(f.workspace.panes.capture({ paneId: attached.pane!.paneId! }).runtimeId).toBe(source.runtime.runtimeId);
		expect(await f.workspace.panes.close({ paneId: attached.pane!.paneId! })).toMatchObject({ effect: 'completed' });
		expect(saveCapacityFact(`attach-${count}`, 'after-close', f)).toBe(4095);
		expect(f.spawn).toHaveBeenCalledTimes(3); expect(f.stop).not.toHaveBeenCalled();
	} finally { await f.dispose(); }
});

test('review F2 split checks its global candidate before saving leaf 4097', async () => {
	const f = await fixture();
	try {
		const source = await f.create('source'), next = await f.create('next'), extra = await f.create('extra');
		const attached = await f.workspace.panes.attach(source), target = { paneId: attached.pane!.paneId! };
		await seedLegacyLeaves(f, 4094);
		expect(saveCapacityFact('split', 'before', f)).toBe(4095);
		const accepted = await f.workspace.panes.split(target, next, 'row');
		expect(accepted).toMatchObject({ effect: 'completed', persisted: true, insertedPane: { sessionId: next.sessionId } });
		expect(saveCapacityFact('split', 'last-legal', f)).toBe(4096);
		const writes = vi.spyOn(f.storage, 'write');
		expect(await f.workspace.panes.split(target, extra, 'column')).toMatchObject({ effect: 'none', layoutPublished: false, persisted: false, error: { code: 'CAPACITY_EXCEEDED' } });
		expect(saveCapacityFact('split', 'after-reject', f)).toBe(4096); expect(writes).not.toHaveBeenCalled();
		expect((await f.workspace.panes.list()).panes).toHaveLength(2);
		expect(f.workspace.panes.capture(target).sessionId).toBe(source.sessionId);
		expect(await f.workspace.panes.close({ paneId: accepted.insertedPane!.paneId! })).toMatchObject({ effect: 'completed' });
		expect(saveCapacityFact('split', 'after-close', f)).toBe(4095);
	} finally { await f.dispose(); }
});

test.each(['same-space', 'cross-space'] as const)('review F2 %s attachments compete for one slot against published drafts before either save settles', async mode => {
	const f = await fixture();
	let release = () => {}, first: ReturnType<typeof f.workspace.panes.attach> | undefined, second: typeof first;
	try {
		const other = mode === 'cross-space' ? await f.spaces.create({ name: 'B' }) : f.space;
		const a = await f.create('A'), b = await f.create('B', other.id);
		await seedLegacyLeaves(f, 4095);
		expect(saveCapacityFact(mode, 'before', f)).toBe(4095);
		const primary = f.files.get(f.spaces.path), write = f.storage.write;
		let enter!: () => void, once = true;
		const entered = new Promise<void>(resolve => { enter = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
		vi.spyOn(f.storage, 'write').mockImplementation(async (path, text) => {
			if (once && path === f.spaces.path) { once = false; enter(); await gate; }
			await write(path, text);
		});
		first = f.workspace.panes.attach(a); second = f.workspace.panes.attach(b);
		await entered;
		const drafts = [...new Set([f.space.id, other.id])].map(id => f.workspace.persistence.readLayoutNow!(id));
		expect(drafts.reduce((sum, draft) => sum + Object.values(draft.view.tabs).filter(tab => tab.kind === 'terminal').length, 0)).toBe(1);
		expect(f.files.get(f.spaces.path)).toBe(primary);
		release();
		const results = await Promise.all([first, second]);
		expect(results.map(result => result.effect).sort()).toEqual(['completed', 'none']);
		expect(results.find(result => result.effect === 'none')?.error).toMatchObject({ code: 'CAPACITY_EXCEEDED' });
		expect(saveCapacityFact(mode, 'after', f)).toBe(4096);
		const listings = await Promise.all([...new Set([f.space.id, other.id])].map(id => f.workspace.panes.list(id)));
		expect(listings.reduce((sum, listing) => sum + listing.panes.length, 0)).toBe(1);
		expect(f.spawn).toHaveBeenCalledTimes(2); expect(f.stop).not.toHaveBeenCalled();
	} finally { release(); await Promise.allSettled([first, second]); await f.dispose(); }
});

test('review F1 queued attachment rejects a removed explicit group instead of falling back to the active group', async () => {
	const f = await fixture();
	let release = () => {}, pending: Promise<unknown> | undefined, attaching: Promise<unknown> | undefined;
	try {
		const a = await f.create('left'), b = await f.create('right'), c = await f.create('C');
		const left = await f.workspace.attachManaged(a, { focus: false }), right = await f.workspace.attachManaged(b, { focus: false });
		if (left.status !== 'attached' || right.status !== 'attached') throw new Error('Fixture attach failed');
		const leftGroup = f.workspace.store.getState().groups[0]!.id;
		f.workspace.move(right.tabId, { split: 'right', ofGroupId: leftGroup }); f.workspace.activate(left.tabId);
		await f.workspace.persistence.flush();
		const rightGroup = f.workspace.store.getState().groups.find(group => group.id !== leftGroup)!.id;
		let enter!: () => void, once = true;
		const entered = new Promise<void>(resolve => { enter = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
		const write = f.storage.write;
		vi.spyOn(f.storage, 'write').mockImplementation(async (path, text) => {
			if (once && path === f.spaces.path) { once = false; enter(); await gate; }
			await write(path, text);
		});
		pending = f.workspace.persistence.editLayout!(f.space.id, view => ({ ...view, tabs: { ...view.tabs, [left.tabId]: { ...view.tabs[left.tabId]!, customTitle: 'in flight' } } }));
		await entered;
		attaching = f.workspace.attachManaged(c, { groupId: rightGroup, focus: false });
		await f.workspace.close(right.tabId, async () => true);
		release(); await pending;
		expect(await attaching).toMatchObject({ status: 'failed', error: { code: 'TARGET_NOT_FOUND', reason: 'missing-group' } });
		expect(f.workspace.store.getState().activeGroupId).toBe(leftGroup);
		expect((await f.workspace.panes.list()).panes.some(pane => pane.sessionId === c.sessionId)).toBe(false);
		expect(f.sessions.get(c.runtime.runtimeId)?.running).toBe(true); expect(f.spawn).toHaveBeenCalledTimes(3);
	} finally { release(); await Promise.allSettled([pending, attaching]); await f.dispose(); }
});


test('GUI capacity full split refuses before Session preparation or spawn and preserves its original view', async () => {
	const f = await fixture();
	try {
		const source = await f.create('source'); await f.workspace.panes.attach(source);
		await seedLegacyLeaves(f, 4095);
		const primary = f.files.get(f.spaces.path), view = structuredClone(f.workspace.store.getState()), recordIds = Object.keys(f.spaces.store.getState().records.sessions);
		const writes = vi.spyOn(f.storage, 'write');
		const presentation = f.workspace.getFocusPresentation();
		await expect(f.workspace.splitPane(source.runtime.runtimeId, 'row')).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDED' });
		expect(f.spawn).toHaveBeenCalledTimes(1); expect(Object.keys(f.spaces.store.getState().records.sessions)).toEqual(recordIds);
		expect(f.workspace.store.getState()).toEqual(view); expect(f.files.get(f.spaces.path)).toBe(primary); expect(writes).not.toHaveBeenCalled();
		expect(f.workspace.getFocusPresentation()).toBe(presentation);
	} finally { await f.dispose(); }
});

test('GUI capacity last split slot is legal and reopen retains its closed record until capacity is freed', async () => {
	const f = await fixture();
	try {
		const source = await f.create('source'), attached = await f.workspace.panes.attach(source);
		await seedLegacyLeaves(f, 4094);
		await f.workspace.splitPane(source.runtime.runtimeId, 'row'); await f.workspace.persistence.flush();
		expect(saveCapacityFact('gui-last-split', 'accepted', f)).toBe(4096);
		expect(f.spawn).toHaveBeenCalledTimes(2);
		await f.workspace.close(attached.pane!.tabId, async () => true); await f.workspace.persistence.flush();
		const replacement = await f.create('replacement'); await f.workspace.panes.attach(replacement);
		const another = await f.create('another'); await f.workspace.panes.attach(another);
		const primary = f.files.get(f.spaces.path), view = structuredClone(f.workspace.store.getState());
		expect(() => f.workspace.reopen(attached.pane!.tabId)).not.toThrow();
		expect(f.launch.report).toHaveBeenCalledWith(expect.objectContaining({ code: 'CAPACITY_EXCEEDED' }));
		expect(f.workspace.store.getState()).toEqual(view); expect(f.files.get(f.spaces.path)).toBe(primary);
		await f.workspace.panes.close({ paneId: (await f.workspace.panes.list()).panes.find(pane => pane.sessionId === replacement.sessionId)!.paneId! });
		await f.workspace.panes.close({ paneId: (await f.workspace.panes.list()).panes.find(pane => pane.sessionId === another.sessionId)!.paneId! });
		f.workspace.reopen(attached.pane!.tabId); await f.workspace.persistence.flush();
		expect(saveCapacityFact('gui-reopen', 'after-free', f)).toBe(4096);
		expect(f.workspace.store.getState().closedTabs.some(tab => tab.id === attached.pane!.tabId)).toBe(false);
		expect(f.spawn).toHaveBeenCalledTimes(4);
	} finally { await f.dispose(); }
});

test.each(['current', 'other-space'] as const)('GUI capacity direct attach checks %s owner without losing duplicate attach', async location => {
	const f = await fixture();
	try {
		const space = location === 'current' ? f.space : await f.spaces.create({ name: 'B' });
		const source = await f.create('source', space.id), extra = await f.create('extra', space.id);
		const existing = await f.workspace.panes.attach(source); await seedLegacyLeaves(f, 4095);
		const primary = f.files.get(f.spaces.path), writes = vi.spyOn(f.storage, 'write');
		expect(f.workspace.attach(f.sessions.get(source.runtime.runtimeId)!, undefined, undefined, false)).toBe(existing.pane!.tabId);
		expect(f.workspace.attach(f.sessions.get(extra.runtime.runtimeId)!, undefined, undefined, false)).toBeUndefined();
		expect(f.launch.report).toHaveBeenCalledWith(expect.objectContaining({ code: 'CAPACITY_EXCEEDED' }));
		expect(f.files.get(f.spaces.path)).toBe(primary); expect(writes).not.toHaveBeenCalled();
		expect((await f.workspace.panes.list(space.id)).panes).toHaveLength(1);
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.space.id); expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally { await f.dispose(); }
});

test('GUI capacity late split launch retains its new runtime when another Space consumes the last slot', async () => {
	const f = await fixture();
	let release = () => {}, pending: Promise<void> | undefined;
	try {
		const other = await f.spaces.create({ name: 'B' }), source = await f.create('source'), background = await f.create('background', other.id);
		await f.workspace.panes.attach(source); await seedLegacyLeaves(f, 4094);
		let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
		f.environment.mockImplementationOnce(async () => { enter(); await gate; return {}; });
		const records = Object.keys(f.spaces.store.getState().records.sessions);
		pending = f.workspace.splitPane(source.runtime.runtimeId, 'row'); const rejected = expect(pending).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDED' });
		await entered; expect((await f.workspace.panes.attach(background)).effect).toBe('completed');
		release(); await rejected;
		const added = Object.values(f.spaces.store.getState().records.sessions).find(record => !records.includes(record.id))!;
		expect(added).toBeDefined(); expect(f.sessions.get(added.lastAttempt!.runtimeId)?.running).toBe(true);
		expect(saveCapacityFact('gui-late-split', 'after', f)).toBe(4096);
		expect((await f.workspace.panes.list(f.space.id)).panes).toHaveLength(1);
		expect(f.spawn).toHaveBeenCalledTimes(3); expect(f.stop).not.toHaveBeenCalled();
	} finally { release(); await Promise.allSettled([pending]); await f.dispose(); }
});

test('GUI capacity reductions and metadata edits can recover an old over-limit graph', async () => {
	const f = await fixture();
	try {
		const source = await f.create('source'), attached = await f.workspace.panes.attach(source);
		await seedLegacyLeaves(f, 4096); expect(saveCapacityFact('old-over-limit', 'before', f)).toBe(4097);
		expect(() => f.workspace.rename(attached.pane!.tabId, 'Still editable')).not.toThrow();
		await f.workspace.close(attached.pane!.tabId, async () => true); await f.workspace.persistence.flush();
		expect(saveCapacityFact('old-over-limit', 'after-close', f)).toBe(4096);
		expect((await f.workspace.panes.list()).panes).toHaveLength(0); expect(f.sessions.get(source.runtime.runtimeId)?.running).toBe(true);
	} finally { await f.dispose(); }
});


test('GUI capacity restored-record opening reports availability without adding a view or starting a runtime', async () => {
	const f = await fixture();
	try {
		const shown = await f.create('shown'), stopped = await f.create('stopped');
		await f.workspace.panes.attach(shown);
		await f.workspace.stopManaged({ spaceId: stopped.spaceId, sessionId: stopped.sessionId, runtimeId: stopped.runtime.runtimeId });
		await seedLegacyLeaves(f, 4095);
		const primary = f.files.get(f.spaces.path), writes = vi.spyOn(f.storage, 'write');
		expect(await f.workspace.openManagedRecord(stopped)).toMatchObject({ status: 'failed', error: { code: 'CAPABILITY_UNAVAILABLE', reason: 'pane-capacity', nextAction: 'inspect-runtime' } });
		expect(f.files.get(f.spaces.path)).toBe(primary); expect(writes).not.toHaveBeenCalled(); expect(f.spawn).toHaveBeenCalledTimes(2);
	} finally { await f.dispose(); }
});
