import { expect, test, vi } from 'vitest';
import type { TextStorage } from '../../../shared/storage/ports';
import { DocumentConflict } from '../../../shared/storage/three-way-merge';
import type { TerminalTabData, WorkspaceState } from '../core/workspace/model';
import { activeTab, activateTab, closeTab, groupOf, openPage, openTab, renameTab, splitGroupWithTab } from '../core/workspace/ops';
import { SpaceService } from './spaces/space-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import { projectPaneIdentities } from '../core/workspace/pane-identity';

const terminal = (id: string): TerminalTabData => ({ id, kind: 'terminal', title: id, sessionIds: [id], focusedSessionId: id, panes: { [id]: { cwd: '/vault' } }, paneLayout: { kind: 'pane', session: id }, state: 'working', unread: true, createdAt: 1, updatedAt: 2 });
const clock = { setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number, clearTimeout: (id: number) => clearTimeout(id) } as Pick<Window, 'setTimeout' | 'clearTimeout'>;
async function fixture(seed = true) {
	const files = new Map<string, string>();
	const storage: TextStorage = { exists: async p => files.has(p), read: async p => files.get(p)!, write: async (p, value) => { files.set(p, value); }, mkdir: async () => {} };
	const root = { canonicalPath: '/vault', dev: '1', ino: '2' }, vault = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root };
	const report = vi.fn();
	const spaces = new SpaceService({ storage, instanceId: 'store', report,
		directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/vault' }) },
		owners: { acquire: async () => ({ instanceId: 'store', port: 123, lost: new AbortController().signal, assertHeld: async () => {}, close: async () => {} }) } });
	const a = await spaces.create({ name: 'A', relativePath: '' }); await spaces.select(a.id);
	const persistence = createSpaceWorkspaceStore(spaces, clock, report); await persistence.ready;
	if (seed) persistence.store.setState(state => {
		const next = openTab(openTab(state, undefined, terminal('keep')), undefined, terminal('close'));
		return { ...next, tabs: { ...next.tabs, keep: { ...next.tabs.keep!, unread: true } as TerminalTabData } };
	}, true);
	await persistence.flush();
	return { spaces, storage, files, report, a, persistence, view: () => persistence.store.getState(), saved: () => spaces.store.getState().records.layouts[a.id]! };
}
function localEdits(state: WorkspaceState): WorkspaceState {
	return openPage(closeTab(renameTab(state, 'keep', 'local title'), 'close'), undefined, { page: 'board', createdAt: 3 })!.state;
}
function expectEdits(layout: WorkspaceState) {
	expect(Object.keys(layout.tabs).sort()).toEqual(['attached', 'keep', 'tab-page-board']);
	expect(layout.tabs.keep).toMatchObject({ customTitle: 'local title', state: 'working', unread: true });
	expect(activeTab(layout)?.id).toBe('tab-page-board');
}

test('layout reads expose the original dirty owner without writing or selecting another Space', async () => {
	const f = await fixture();
	try {
		const b = await f.spaces.create({ name: 'B', relativePath: '' });
		const write = vi.spyOn(f.storage, 'write'), select = vi.spyOn(f.spaces, 'select');
		f.persistence.store.setState(state => renameTab(state, 'keep', 'dirty A'), true);
		const read = Reflect.get(f.persistence, 'readLayout');
		expect(read).toBeTypeOf('function');
		if (!read) throw new Error('Missing original layout read port');
		const first = await read(f.a.id), second = await read(f.a.id), other = await read(b.id);
		expect(first.view.tabs.keep).toMatchObject({ customTitle: 'dirty A' });
		expect(first.dirty).toBe(true);
		expect(second.revision).toBe(first.revision);
		expect(other.cached).toBe(false);
		expect((await read(b.id)).cached).toBe(false);
		expect(write).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
	} finally { await f.persistence.dispose(); }
});

test('cold read and repeated legacy projections acquire no writer, preserve disk and never cache another Space', async () => {
	const f = await fixture();
	const b = await f.spaces.create({ name: 'B', relativePath: '' });
	const root = { canonicalPath: '/vault', dev: '1', ino: '2' }, vault = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root };
	const acquire = vi.fn(async () => { throw new Error('read must not acquire writer'); });
	const reader = new SpaceService({ storage: f.storage, instanceId: 'read-only', report: vi.fn(),
		directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_vault, relativePath) => ({ kind: 'vault', relativePath, target: root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/vault' }) }, owners: { acquire } });
	const owner = createSpaceWorkspaceStore(reader, clock, vi.fn());
	const before = [...f.files], write = vi.spyOn(f.storage, 'write');
	try {
		await owner.ready;
		const first = await owner.readLayout!(f.a.id);
		const rows = projectPaneIdentities(first.view, { kind: 'space', spaceId: f.a.id }, first.baseline);
		expect(rows.every(row => row.paneId?.startsWith('lp1.'))).toBe(true);
		expect((first.view.tabs.keep as TerminalTabData).panes.keep?.paneId).toBeUndefined();
		(first.view.tabs.keep as TerminalTabData).customTitle = 'caller clone mutation';
		expect((await owner.readLayout!(f.a.id)).view.tabs.keep?.customTitle).toBeUndefined();
		for (let i = 0; i < 3; i++) expect((await owner.readLayout!(b.id)).cached).toBe(false);
		expect(acquire).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
		expect([...f.files]).toEqual(before);
		expect(reader.store.getState().records.selectedSpaceId).toBe(f.a.id);
	} finally { await owner.dispose(); await f.persistence.dispose(); }
});

test('a nonselected Space edit preserves its original draft and saves only that owner', async () => {
	const f = await fixture();
	try {
		const b = await f.spaces.create({ name: 'B', relativePath: '' });
		f.persistence.store.setState(state => renameTab(state, 'keep', 'owner A title'), true);
		await f.spaces.select(b.id);
		const edit = Reflect.get(f.persistence, 'editLayout');
		expect(edit).toBeTypeOf('function');
		if (!edit) throw new Error('Missing original layout edit port');
		const select = vi.spyOn(f.spaces, 'select');
		const result = await edit(f.a.id, (state: WorkspaceState) => closeTab(state, 'close'));
		expect(result).toMatchObject({ effect: 'completed', layoutPublished: true, persisted: true });
		expect(f.saved().tabs.keep).toMatchObject({ customTitle: 'owner A title' });
		expect(f.saved().tabs.close).toBeUndefined();
		expect(f.spaces.store.getState().records.selectedSpaceId).toBe(b.id);
		expect(select).not.toHaveBeenCalled();
	} finally { await f.persistence.dispose(); }
});

function barrier() {
	let resolve!: () => void;
	const promise = new Promise<void>(yes => { resolve = yes; });
	return { promise, resolve };
}

test('cancelling while an original GUI save is pending ends observation without releasing it or editing late', async () => {
	const f = await fixture(), entered = barrier(), release = barrier();
	let saving: Promise<void> | undefined;
	try {
		const write = f.storage.write; let once = true;
		f.storage.write = async (path, value) => { if (once && path === f.spaces.path) { once = false; entered.resolve(); await release.promise; } await write(path, value); };
		f.persistence.store.setState(state => renameTab(state, 'keep', 'GUI in flight'), true);
		saving = f.persistence.flush(); await entered.promise;
		const transform = vi.fn((state: WorkspaceState) => closeTab(state, 'close'));
		const abort = new AbortController();
		const editing = f.persistence.editLayout!(f.a.id, transform, { signal: abort.signal });
		abort.abort(new Error('cancel original request'));
		expect(await editing).toMatchObject({ effect: 'none', layoutPublished: false, persisted: false, error: { code: 'WAIT_CANCELLED' } });
		expect(transform).not.toHaveBeenCalled();
		release.resolve(); await saving;
		await f.persistence.flush();
		expect(transform).not.toHaveBeenCalled();
		expect(f.saved().tabs.close).toBeDefined();
	} finally { release.resolve(); await saving; await f.persistence.dispose(); }
});

test('the original monotonic deadline expires in the admission queue without waiting for a pending save', async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	let now = 100;
	const time = vi.spyOn(performance, 'now').mockImplementation(() => now);
	const f = await fixture(), entered = barrier(), release = barrier();
	let saving: Promise<void> | undefined;
	try {
		const write = f.storage.write; let once = true;
		f.storage.write = async (path, value) => { if (once && path === f.spaces.path) { once = false; entered.resolve(); await release.promise; } await write(path, value); };
		f.persistence.store.setState(state => renameTab(state, 'keep', 'pending save'), true);
		saving = f.persistence.flush(); await entered.promise;
		const transform = vi.fn((state: WorkspaceState) => closeTab(state, 'close'));
		const editing = f.persistence.editLayout!(f.a.id, transform, { deadline: 105 });
		now = 106;
		await vi.advanceTimersByTimeAsync(6);
		expect(await editing).toMatchObject({ effect: 'none', layoutPublished: false, error: { code: 'WAIT_TIMEOUT' } });
		expect(transform).not.toHaveBeenCalled();
		release.resolve(); await saving; await f.persistence.flush();
		expect(transform).not.toHaveBeenCalled();
		expect(f.saved().tabs.close).toBeDefined();
	} finally { release.resolve(); await saving; await f.persistence.dispose(); time.mockRestore(); vi.useRealTimers(); }
});

test('a synchronous abort after layout publication reports partial before any save and retains its draft', async () => {
	const f = await fixture(), abort = new AbortController();
	const write = vi.spyOn(f.storage, 'write');
	const off = f.persistence.store.subscribe(state => {
		if (state.tabs.keep?.customTitle === 'published') abort.abort(new Error('presentation cancelled'));
	});
	try {
		const result = await f.persistence.editLayout!(f.a.id, state => renameTab(state, 'keep', 'published'), { signal: abort.signal });
		expect(result).toMatchObject({ effect: 'partial', layoutPublished: true, persisted: false });
		expect(write).not.toHaveBeenCalled();
		expect((await f.persistence.readLayout!(f.a.id)).view.tabs.keep).toMatchObject({ customTitle: 'published' });
	} finally { off(); await f.persistence.dispose(); }
});

test('cancel during an owned save reports unknown while the owner settles it and preserves later GUI edits', async () => {
	const f = await fixture(), entered = barrier(), release = barrier();
	try {
		const write = f.storage.write; let once = true;
		f.storage.write = async (path, value) => { if (once && path === f.spaces.path) { once = false; entered.resolve(); await release.promise; } await write(path, value); };
		const abort = new AbortController();
		const editing = f.persistence.editLayout!(f.a.id, state => renameTab(state, 'keep', 'submitted'), { signal: abort.signal });
		await entered.promise; abort.abort(new Error('stop observing'));
		expect(await editing).toMatchObject({ effect: 'unknown', layoutPublished: true, persisted: false });
		f.persistence.updateLayout!(state => renameTab(state, 'keep', 'later GUI'));
		release.resolve(); await f.persistence.flush();
		expect(f.saved().tabs.keep).toMatchObject({ customTitle: 'later GUI' });
		expect(f.view().tabs.keep).toMatchObject({ customTitle: 'later GUI' });
	} finally { release.resolve(); await f.persistence.dispose(); }
});

test('a presentation observer failure after verified save keeps persisted true and the actual saved layout', async () => {
	const f = await fixture(), observerError = new Error('view could not adopt committed layout');
	const disk = JSON.parse(f.files.get(f.spaces.path)!);
	disk.layouts[f.a.id] = openTab(disk.layouts[f.a.id], undefined, terminal('external'));
	f.files.set(f.spaces.path, JSON.stringify(disk));
	const off = f.persistence.store.subscribe(state => { if (state.tabs.external) throw observerError; });
	try {
		const result = await f.persistence.editLayout!(f.a.id, state => renameTab(state, 'keep', 'saved'));
		expect(result).toMatchObject({ effect: 'partial', layoutPublished: true, persisted: true, error: observerError });
		expect(f.saved().tabs.keep).toMatchObject({ customTitle: 'saved' });
		expect(JSON.parse(f.files.get(f.spaces.path)!).layouts[f.a.id].tabs.keep.customTitle).toBe('saved');
	} finally { off(); await f.persistence.dispose(); }
});

test('same-ID append preserves dirty page/rename/close, focus and runtime state before and after flush', async () => {
	const f = await fixture();
	try {
		f.persistence.store.setState(localEdits, true);
		await f.spaces.updateLayout(f.a.id, state => {
			const next = openTab(state, undefined, terminal('attached'));
			return { ...next, tabs: { ...next.tabs, attached: { ...next.tabs.attached!, unread: true } as TerminalTabData } };
		});
		expectEdits(f.view());
		expect(f.view().tabs.attached).toMatchObject({ state: 'working', unread: true });
		await f.persistence.flush(); expectEdits(f.saved());
		expect(f.saved().tabs.attached).toMatchObject({ state: 'working', unread: true });
	} finally { await f.persistence.dispose(); }
});

for (const first of ['ui-save', 'append'] as const) test(`${first} in-flight coordinates later local edits with the other operation without stale replacement`, async () => {
	const f = await fixture();
	try {
		let entered!: () => void, release!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		const write = f.storage.write; let armed = true;
		f.storage.write = async (p, text) => { if (armed && p === f.spaces.path) { armed = false; entered(); await blocked; } await write(p, text); };
		let append: Promise<void>, saving: Promise<void>;
		if (first === 'ui-save') {
			f.persistence.store.setState(state => renameTab(state, 'keep', 'submitted title'), true);
			saving = f.persistence.flush(); await waiting;
			append = f.spaces.updateLayout(f.a.id, state => openTab(state, undefined, terminal('attached')));
		} else {
			append = f.spaces.updateLayout(f.a.id, state => openTab(state, undefined, terminal('attached'))); await waiting;
			f.persistence.store.setState(state => renameTab(state, 'keep', 'submitted title'), true);
			saving = f.persistence.flush();
		}
		f.persistence.store.setState(localEdits, true);
		release(); await Promise.all([saving, append]); await f.persistence.flush();
		expectEdits(f.view()); expectEdits(f.saved());
	} finally { await f.persistence.dispose(); }
});

test('real conflicting field reports a localized SpaceError wrapper and preserves local and committed remote values', async () => {
	const f = await fixture();
	f.persistence.store.setState(state => renameTab(state, 'keep', 'local conflict'), true);
	await f.spaces.updateLayout(f.a.id, state => renameTab(state, 'keep', 'remote conflict'));
	await expect(f.persistence.flush()).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED', cause: expect.any(DocumentConflict) });
	expect(f.view().tabs.keep).toMatchObject({ customTitle: 'local conflict' });
	expect(f.saved().tabs.keep).toMatchObject({ customTitle: 'remote conflict' });
	expect(f.report).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERSISTENCE_FAILED' }));
	await expect(f.persistence.dispose()).rejects.toBeDefined();
});

test('unchanged-layout rename/error notifications do not normalize runtime state or trigger an echo save', async () => {
	const f = await fixture();
	try {
		const save = vi.spyOn(f.spaces, 'saveLayout');
		await f.spaces.rename(f.a.id, 'A renamed');
		f.spaces.store.setState({ error: new Error('fixture diagnostic') });
		await f.persistence.flush();
		expect(save).not.toHaveBeenCalled();
		expect(f.view().tabs.keep).toMatchObject({ state: 'working', unread: true });
	} finally { await f.persistence.dispose(); }
});

test('independently created first groups retain both local page and attached terminal in a visible group', async () => {
	const f = await fixture(false);
	try {
		f.persistence.store.setState(state => openPage(state, undefined, { page: 'board', createdAt: 3 })!.state, true);
		await f.spaces.updateLayout(f.a.id, state => openTab(state, undefined, terminal('attached')));
		await f.persistence.flush();
		for (const layout of [f.view(), f.saved()]) {
			expect(Object.keys(layout.tabs).sort()).toEqual(['attached', 'tab-page-board']);
			expect(groupOf(layout, 'attached')).toBeDefined();
			expect(groupOf(layout, 'tab-page-board')).toBeDefined();
			expect(activeTab(layout)?.id).toBe('tab-page-board');
		}
	} finally { await f.persistence.dispose(); }
});

test('remote attach retains a later local split, active group and focused pane', async () => {
	const f = await fixture();
	try {
		f.persistence.store.setState(state => {
			const split = splitGroupWithTab(state, 'keep', state.groups[0]!.id, 'right', 'local-split');
			return activateTab(split, 'keep');
		}, true);
		await f.spaces.updateLayout(f.a.id, state => openTab(state, undefined, terminal('attached')));
		await f.persistence.flush();
		for (const layout of [f.view(), f.saved()]) {
			expect(layout.activeGroupId).toBe('local-split');
			expect(activeTab(layout)?.id).toBe('keep');
			expect(layout.tabs.keep).toMatchObject({ state: 'working', focusedSessionId: 'keep', unread: false });
			expect(groupOf(layout, 'attached')).toBeDefined();
			expect(layout.layout).toMatchObject({ kind: 'split' });
		}
	} finally { await f.persistence.dispose(); }
});

test('failed in-flight save preserves later edits and committed append until an explicit retry succeeds', async () => {
	const f = await fixture();
	try {
		let entered!: () => void, release!: () => void;
		const waiting = new Promise<void>(resolve => { entered = resolve; }), blocked = new Promise<void>(resolve => { release = resolve; });
		const write = f.storage.write; let armed = true;
		f.storage.write = async (p, text) => {
			if (armed && p === f.spaces.path) { armed = false; entered(); await blocked; throw new Error('EIO once'); }
			await write(p, text);
		};
		f.persistence.store.setState(state => renameTab(state, 'keep', 'submitted title'), true);
		const saving = f.persistence.flush();
		const rejected = expect(saving).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
		await waiting;
		const append = f.spaces.updateLayout(f.a.id, state => openTab(state, undefined, terminal('attached')));
		f.persistence.store.setState(localEdits, true);
		release(); await rejected; await append;
		expectEdits(f.view());
		expect(f.saved().tabs.keep).not.toHaveProperty('customTitle');
		await f.persistence.flush();
		expectEdits(f.saved());
		await expect(f.spaces.flush()).resolves.toBeUndefined();
	} finally { await f.persistence.dispose(); }
});
