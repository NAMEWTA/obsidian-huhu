import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';
import { DomainEvents } from '../../../../shared/events/domain-events';
import { FILE_CHANGES } from '../../../../host/obsidian/file-changes';
import { memoryArchives } from './test-port';
import { EntityCommands } from './entities';
import { PERSON } from '../../core/schema/presets';
import { bindArchiveFileChanges, draftStoreWithInvalidation } from './file-changes';

async function setup() {
	const { files, runtime } = await memoryArchives();
	const person = await new EntityCommands(runtime).create({ operationId: 'person-a', typeId: PERSON.id, values: { name: 'One' } });
	files.runtime = undefined;
	const events = new DomainEvents(), cleanups: Array<() => void> = [];
	bindArchiveFileChanges(runtime, events, { register: cleanup => { cleanups.push(cleanup); } });
	return { files, runtime, person, events, close: () => { for (const cleanup of cleanups) cleanup(); runtime.dispose(); events.dispose(); } };
}

test('folder moves update both index ranges and moving outside archives removes the old entry', async () => {
	const f = await setup();
	try {
		const oldPath = f.person.path, oldFolder = oldPath.slice(0, oldPath.lastIndexOf('/'));
		const newFolder = 'huhu/archives/moved', newPath = `${newFolder}/profile.md`;
		f.files.rename(oldPath, newPath);
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'rename', oldPath: oldFolder, path: newFolder, folder: true }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)?.path).toBe(newPath);
		f.files.rename(newPath, 'outside/profile.md');
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'rename', oldPath: newFolder, path: 'outside', folder: true }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)).toBeUndefined();
	} finally { f.close(); }
});

test('md to txt to md renames remove and restore the same entity without metadata cache reads', async () => {
	const f = await setup();
	try {
		const oldPath = f.person.path, textPath = oldPath.replace('.md', '.txt');
		f.files.rename(oldPath, textPath);
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'rename', oldPath, path: textPath, folder: false }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)).toBeUndefined();
		f.files.rename(textPath, oldPath);
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'rename', oldPath: textPath, path: oldPath, folder: false }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)?.path).toBe(oldPath);
	} finally { f.close(); }
});

test('modify before metadata readiness uses the new raw frontmatter, not stale cached contents', async () => {
	const f = await setup();
	try {
		const { patchProperties } = await import('../../core/generic/markdown');
		const old = f.files.text.get(f.person.path)!;
		f.files.cachedRead = async () => old;
		f.files.seed(f.person.path, patchProperties(old, { name: 'Current raw' }));
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'modify', path: f.person.path, folder: false }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)?.values.name).toBe('Current raw');
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'metadata', path: f.person.path, folder: false }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)?.values.name).toBe('Current raw');
	} finally { f.close(); }
});

test('overflow rescan discovers the final file set', async () => {
	const f = await setup();
	try {
		f.files.rename(f.person.path, 'huhu/archives/final/profile.md');
		f.events.emit(FILE_CHANGES, { changes: [], rescan: true });
		await f.runtime.ensureLoaded();
		expect(f.runtime.index.entity(f.person.id)?.path).toBe('huhu/archives/final/profile.md');
	} finally { f.close(); }
});

test('a read released after disposal cannot mutate the old index or notify a new session', async () => {
	const f = await setup();
	try {
		let release!: (raw: string) => void, started!: () => void;
		const reading = new Promise<void>(resolve => { started = resolve; });
		const original = f.files.read.bind(f.files);
		f.files.read = file => file.path === f.person.path ? new Promise(resolve => { release = resolve; started(); }) : original(file);
		const notifications: string[] = [];
		f.runtime.subscribe(() => { notifications.push('updated'); });
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'modify', path: f.person.path, folder: false }] });
		const pending = f.runtime.flushEvents();
		await reading;
		f.runtime.dispose();
		release(f.files.text.get(f.person.path)!);
		await expect(pending).rejects.toThrow('unavailable');
		expect(notifications).toEqual([]);
	} finally { f.close(); }
});

test('repository publishes invalidation only after a verified local commit', async () => {
	const f = await setup();
	try {
		const paths: string[] = [];
		f.events.on(FILE_CHANGES, batch => { for (const change of batch.changes) if (change.kind === 'invalidate') paths.push(change.path); });
		await f.runtime.writeExact('huhu/archives/plain.md', undefined, '# plain', f.runtime.context());
		expect(paths).toEqual(['huhu/archives/plain.md']);
		await expect(f.runtime.writeExact('huhu/archives/plain.md', 'wrong', 'after', f.runtime.context())).rejects.toThrow('write-conflict');
		expect(paths).toHaveLength(1);
	} finally { f.close(); }
});

test('hidden draft invalidation follows commit, suppresses failure and ignores late commits after abort', async () => {
	const events = new DomainEvents(), batches: unknown[] = [], controller = new AbortController();
	events.on(FILE_CHANGES, batch => { batches.push(batch); });
	let commit!: () => void;
	const store = draftStoreWithInvalidation({
		list: async () => [], write: () => new Promise<void>(resolve => { commit = resolve; }),
		remove: async () => { throw new Error('disk failure'); },
	}, events, controller.signal);
	const pending = store.write('huhu/archives', 'draft', { secret: 'must-not-enter-events' });
	expect(batches).toEqual([]);
	commit(); await pending;
	expect(batches).toEqual([{ rescan: false, changes: [{ kind: 'invalidate', path: '.huhu/archives/drafts', folder: true }] }]);
	await expect(store.remove('huhu/archives', 'draft')).rejects.toThrow('disk failure');
	expect(batches).toHaveLength(1);
	const late = store.write('huhu/archives', 'draft', {});
	controller.abort(); commit(); await late;
	expect(batches).toHaveLength(1);
	events.dispose();
});

test('a rescan retires earlier reads without overwriting the new generation or reporting stale errors', async () => {
	const f = await setup(), errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		const { patchProperties } = await import('../../core/generic/markdown');
		const old = f.files.text.get(f.person.path)!;
		let release!: (raw: string) => void, started!: () => void, intercepted = false;
		const reading = new Promise<void>(resolve => { started = resolve; });
		const original = f.files.read.bind(f.files);
		f.files.read = file => {
			if (file.path === f.person.path && !intercepted) {
				intercepted = true;
				return new Promise(resolve => { release = resolve; started(); });
			}
			return original(file);
		};
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'modify', path: f.person.path, folder: false }] });
		const pending = f.runtime.flushEvents();
		await reading;
		f.files.seed(f.person.path, patchProperties(old, { name: 'New generation' }));
		await f.runtime.rescan();
		release(old);
		await expect(pending).rejects.toThrow('unavailable');
		expect(f.runtime.index.entity(f.person.id)?.values.name).toBe('New generation');
		expect(errors).not.toHaveBeenCalled();
	} finally { errors.mockRestore(); f.close(); }
});

test('Vault directory rename flows through the real adapter and event port into the archive index', async () => {
	const f = await setup();
	const { FileChanges } = await import('../../../../host/obsidian/file-changes');
	const { TFolder } = await import('obsidian');
	const refs = new Set<{ name: string; callback: (...args: unknown[]) => void }>();
	const source = {
		on(name: string, callback: (...args: unknown[]) => void) { const ref = { name, callback }; refs.add(ref); return ref; },
		offref(ref: { name: string; callback: (...args: unknown[]) => void }) { refs.delete(ref); },
	};
	const adapter = new FileChanges({ vault: source, metadataCache: source } as unknown as App, f.events,
		{}, { set: () => 0, clear: () => {}, now: () => 0 });
	try {
		const oldFolder = f.person.path.slice(0, f.person.path.lastIndexOf('/'));
		const path = 'huhu/archives/adapter-move/profile.md';
		f.files.rename(f.person.path, path);
		for (const ref of refs) if (ref.name === 'rename') ref.callback(Object.assign(new TFolder(), { path: 'huhu/archives/adapter-move', children: [] }), oldFolder);
		adapter.flush();
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)?.path).toBe(path);
		adapter.dispose();
		expect(refs.size).toBe(0);
	} finally { adapter.dispose(); f.close(); }
});

test('folder invalidation removes stale entries as well as discovering current files', async () => {
	const f = await setup();
	try {
		const folder = f.person.path.slice(0, f.person.path.lastIndexOf('/'));
		f.files.delete(f.person.path);
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'invalidate', path: folder, folder: true }] });
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)).toBeUndefined();
	} finally { f.close(); }
});

test('directory deletion survives same-path file create/delete coalescing and removes indexed children', async () => {
	const f = await setup();
	const { FileChanges } = await import('../../../../host/obsidian/file-changes');
	const { TFile, TFolder } = await import('obsidian');
	const refs = new Set<{ name: string; callback: (...args: unknown[]) => void }>();
	const source = {
		on(name: string, callback: (...args: unknown[]) => void) { const ref = { name, callback }; refs.add(ref); return ref; },
		offref(ref: { name: string; callback: (...args: unknown[]) => void }) { refs.delete(ref); },
	};
	const adapter = new FileChanges({ vault: source, metadataCache: source } as unknown as App, f.events,
		{}, { set: () => 0, clear: () => {}, now: () => 0 });
	const batches: Array<{ path: string; folder: boolean }> = [];
	f.events.on(FILE_CHANGES, batch => { for (const change of batch.changes) if (change.kind === 'delete') batches.push(change); });
	const emit = (name: string, value: unknown) => { for (const ref of refs) if (ref.name === name) ref.callback(value); };
	try {
		const path = f.person.path.slice(0, f.person.path.lastIndexOf('/'));
		f.files.delete(f.person.path);
		emit('delete', Object.assign(new TFolder(), { path, children: [] }));
		emit('create', Object.assign(new TFile(), { path, extension: '' }));
		emit('delete', Object.assign(new TFile(), { path, extension: '' }));
		adapter.flush();
		await f.runtime.flushEvents();
		expect(f.runtime.index.entity(f.person.id)).toBeUndefined();
		expect(batches.map(change => ({ path: change.path, folder: change.folder }))).toEqual([{ path, folder: true }, { path, folder: false }]);
	} finally { adapter.dispose(); f.close(); }
});

test.each(['huhu/archives/assets', 'outside/assets'])('directory rename invalidates old and new non-Markdown dependencies under %s', async base => {
	const f = await setup();
	try {
		const { DefinitionCommands } = await import('./definitions');
		await new DefinitionCommands(f.runtime).publish({
			operationId: 'asset-type-revision', expectedHeads: [], definition: {
				kind: 'type', id: 'type-asset-reference', label: 'Asset references', icon: 'file',
				folder: 'asset-references', enabled: true, nameFieldId: 'name', fields: [
					{ fieldId: 'name', storageKey: 'name', label: 'Name', kind: 'text', required: true },
					{ fieldId: 'asset', storageKey: 'asset', label: 'Asset', kind: 'file' },
				],
			},
		});
		const oldFolder = `${base}/old`, newFolder = `${base}/new`;
		const oldPath = `${oldFolder}/image.png`, newPath = `${newFolder}/image.png`;
		f.files.seed(oldPath, 'binary-fixture');
		const entities = new EntityCommands(f.runtime);
		const oldRef = await entities.create({ operationId: 'old-asset-ref', typeId: 'type-asset-reference', values: { name: 'Old path', asset: oldPath } });
		const newRef = await entities.create({ operationId: 'new-asset-ref', typeId: 'type-asset-reference', values: { name: 'New path', asset: newPath } });
		await f.runtime.flushEvents();
		const missing = (path: string) => f.runtime.index.entry(path)?.diagnostics.some(diagnostic => diagnostic.code === 'missing-file');
		expect(missing(oldRef.path)).toBe(false);
		expect(missing(newRef.path)).toBe(true);
		f.files.rename(oldPath, newPath);
		f.events.emit(FILE_CHANGES, { rescan: false, changes: [{ kind: 'rename', oldPath: oldFolder, path: newFolder, folder: true }] });
		await f.runtime.flushEvents();
		expect(missing(oldRef.path)).toBe(true);
		expect(missing(newRef.path)).toBe(false);
		expect(f.runtime.index.entry(newPath)).toBeUndefined();
	} finally { f.close(); }
});
