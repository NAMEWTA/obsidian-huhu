import { MarkdownView, TFile, TFolder, type App, type EventRef, type WorkspaceLeaf } from 'obsidian';
import { expect, it, vi } from 'vitest';
import type { ApprovalPreview, EffectTarget, HostInvoke, HostLease } from '../../../api';
import { ObsidianSources } from '../sources/sources';
import { ReceiptAuthority } from './receipt-authority';
import { HostReceiptStore, type ReceiptStorage } from './receipt-store';
import { digest, utf8 } from './primitives';
import { noteFingerprint } from './fingerprint';
import { NOTE_WRITE_TOOL, ObsidianNoteEffects } from './note-effects';
import { storageWriteQueue } from '../../../../../shared/storage/write-queue';

export const lease: HostLease = { leaseId: 'lease:one', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'workspace:one',
	capabilities: ['note.write', 'note.read', 'note.search'], expiresAt: '2099-01-01T00:00:00Z' };
const authority = (value = lease) => ({ profileId: 'profile:one', commandEpoch: '1', workspaceId: value.workspaceId,
	leaseId: value.leaseId, hostConnectionId: value.hostConnectionId, leaseEpoch: value.leaseEpoch });
const signal = () => new AbortController().signal;

export async function fixture(initial = '甲😀\noriginal\n尾') {
	const files = new Map<string, TFile | TFolder>(), contents = new Map<TFile, string>(), editors = new Map<MarkdownView, string>();
	const root = Object.assign(Object.create(TFolder.prototype) as TFolder, { path: '/', children: [] as TFile[] });
	const folder = Object.assign(Object.create(TFolder.prototype) as TFolder, { path: 'notes', children: [] as TFile[] }); files.set(folder.path, folder);
	const newFile = (path: string, text: string): TFile => {
		const file = Object.assign(Object.create(TFile.prototype) as TFile, { path, name: path.split('/').at(-1), basename: path.split('/').at(-1)!.slice(0, -3),
			extension: 'md', stat: { ctime: 1, mtime: 1, size: utf8.encode(text).length } });
		files.set(path, file); contents.set(file, text);
		const parent = path.startsWith('notes/') ? folder : root; parent.children = [...parent.children, file]; return file;
	};
	const file = newFile('notes/one.md', initial), other = newFile('two.md', 'UNRELATED');
	let beforeProcess: (() => void | Promise<void>) | undefined, afterWrite: (() => void | Promise<void>) | undefined, beforeCreate: (() => void | Promise<void>) | undefined;
	let mutations = 0;
	const read = vi.fn(async (file: TFile) => contents.get(file)!);
	const process = vi.fn(async (file: TFile, change: (text: string) => string) => {
		await beforeProcess?.();
		const text = change(contents.get(file)!);
		expect(typeof text).toBe('string'); // The production Vault.process callback must be synchronous.
		contents.set(file, text); mutations++;
		await afterWrite?.(); return text;
	});
	const create = vi.fn(async (path: string, text: string) => {
		await beforeCreate?.();
		if (files.has(path)) throw new Error('existing target');
		const created = newFile(path, text); mutations++; await afterWrite?.(); return created;
	});
	const events = new Map<string, Set<(file: TFile | TFolder, oldPath?: string) => void>>();
	const leaves: WorkspaceLeaf[] = [];
	const app = { vault: { configDir: '.obsidian', read, process, create, getRoot: () => root, getAbstractFileByPath: (path: string) => files.get(path),
		on: (name: string, callback: (file: TFile | TFolder, oldPath?: string) => void) => { const set = events.get(name) ?? new Set(); set.add(callback); events.set(name, set); return { name, callback }; },
		offref: (ref: { name: string; callback: (file: TFile | TFolder, oldPath?: string) => void }) => events.get(ref.name)?.delete(ref.callback) },
		workspace: { iterateAllLeaves: (run: (leaf: WorkspaceLeaf) => void) => { for (const leaf of leaves) run(leaf); },
			getActiveViewOfType: () => { throw new Error('must use explicit target, never current focus'); } } } as unknown as App;
	const addView = (target: TFile) => {
		const leaf = {} as WorkspaceLeaf;
		const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { app, leaf, file: target, editor: {
			getValue: () => editors.get(view) ?? contents.get(target)!, listSelections: () => [{ anchor: { line: 0, ch: 1 }, head: { line: 0, ch: 3 } }],
			posToOffset: (value: { ch: number }) => value.ch } });
		Object.assign(leaf, { view, isDeferred: false, getViewState: () => ({ type: 'markdown', state: { file: target.path } }) }); leaves.push(leaf);
		return { leaf, view };
	};
	const { leaf, view } = addView(file);
	const timers = { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
	const sources = new ObsidianSources(app, { workspaceId: lease.workspaceId, originClientId: 'client:one', timers }); sources.setLease(lease);
	const local = new Map<string, unknown>(), stored = new Map<string, string>();
	const storage: ReceiptStorage = { exists: async path => stored.has(path), read: async path => { const text = stored.get(path); if (text === undefined) throw new Error('missing'); return text; },
		write: vi.fn(async (path, text) => { stored.set(path, text); }), mkdir: async () => {}, size: async path => { const text = stored.get(path); return text === undefined ? undefined : utf8.encode(text).length; } };
	const deviceKey = (await digest('device:one')).slice(7), profileKey = (await digest('profile:one')).slice(7);
	const keyStorage = { owner: app, load: (key: string) => local.get(key), save: (key: string, value: unknown) => { local.set(key, structuredClone(value)); } };
	const store = () => new HostReceiptStore(storage, new ReceiptAuthority(keyStorage, deviceKey, profileKey), { profileId: 'profile:one', deviceId: 'device:one', deviceKey, profileKey });
	const lifetime = { registerEvent: (_ref: EventRef) => {} };
	const open = () => new ObsidianNoteEffects(app, sources, store(), { ...authority(), deviceId: 'device:one', lifetime });
	const adapter = open(); adapter.setLease(lease);
	const prepare = async (content: string, target?: EffectTarget, owner = adapter) => {
		const source = target ? undefined : await sources.captureNote(file, leaf);
		const result = await owner.prepareWrite({ ...authority(), target: target ?? { workspaceId: lease.workspaceId, resourceId: source!.resourceId, operation: 'update', baseRevision: source!.revision },
			tool: { ...NOTE_WRITE_TOOL }, content }, signal());
		const preview: ApprovalPreview = { target: result.target, tool: result.tool, binding: result.binding, content, diff: result.diff, sourceRefs: source ? [source] : [],
			parametersHash: await digest('parameters'), previewHash: await digest('preview') };
		return preview;
	};
	const invoke = async (preview: ApprovalPreview, effectId = 'effect:one', owner = adapter, activeSignal = signal()) => {
		const request: HostInvoke = { ...authority(), capability: 'note.write', effectId, resource: { resourceId: preview.target.resourceId, revision: preview.target.baseRevision },
			expectedRevision: preview.target.baseRevision, content: preview.content, preview, runId: 'run:one', approvalId: 'approval:one', approvalRevision: '1',
			expiresAt: '2099-01-01T00:00:00Z', fingerprint: '' };
		request.fingerprint = await noteFingerprint(request);
		return { request, result: owner.invoke(request, activeSignal) };
	};
	const query = (request: HostInvoke, owner = adapter, currentLease = lease) => owner.queryReceipt({ ...authority(currentLease), effectId: request.effectId,
		fingerprint: request.fingerprint, preview: request.preview }, signal());
	return { app, adapter, open, sources, file, other, folder, root, files, contents, stored, local, storage, read, process, create, leaves, editors, leaf, view, addView,
		prepare, invoke, query, mutations: () => mutations, emit: (name: string, file: TFile | TFolder, path?: string) => { for (const callback of events.get(name) ?? []) callback(file, path); },
		beforeProcess: (run?: () => void | Promise<void>) => { beforeProcess = run; }, afterWrite: (run?: () => void | Promise<void>) => { afterWrite = run; }, beforeCreate: (run?: () => void | Promise<void>) => { beforeCreate = run; },
		dispose: () => { adapter.dispose(); sources.dispose(); } };
}

it('uses actual single-note Vault.process, persists completion, and does not replay duplicates or change another note', async () => {
	const f = await fixture();
	try {
		const preview = await f.prepare('new 中文😀\nbody');
		await expect(f.adapter.checkWrite({ ...authority(), preview }, signal())).resolves.toEqual({ valid: true });
		const { request, result } = await f.invoke(preview);
		await expect(result).resolves.toMatchObject({ effectId: 'effect:one', fingerprint: request.fingerprint, status: 'committed', receiptId: expect.any(String) });
		expect(f.contents.get(f.file)).toBe(preview.content); expect(f.contents.get(f.other)).toBe('UNRELATED');
		await expect(f.adapter.invoke(request, signal())).resolves.toMatchObject({ status: 'committed' }); expect(f.mutations()).toBe(1);
		const changed = { ...request, approvalRevision: '2' }; changed.fingerprint = await noteFingerprint(changed);
		await expect(f.adapter.invoke(changed, signal())).rejects.toThrow('EFFECT_FINGERPRINT_MISMATCH');
		f.contents.set(f.file, 'later user change');
		await expect(f.query(request)).resolves.toMatchObject({ status: 'committed' }); expect(f.process).toHaveBeenCalledTimes(1);
	} finally { f.dispose(); }
});

it('allows receipt-only reconciliation of historical bindings after a command epoch change', async () => {
	const f = await fixture();
	try {
		const preview = await f.prepare('committed before deletion');
		const { request, result } = await f.invoke(preview);
		await expect(result).resolves.toMatchObject({ status: 'committed' });
		f.adapter.setCommandEpoch('2');
		await expect(f.adapter.queryReceipt({ ...authority(), commandEpoch: '2', effectId: request.effectId, fingerprint: request.fingerprint, preview }, signal())).resolves.toMatchObject({ status: 'committed' });
		await expect(f.adapter.invoke({ ...request, commandEpoch: '2' }, signal())).rejects.toThrow();
		expect(f.mutations()).toBe(1);
	} finally { f.dispose(); }
});

it('creates only the explicit canonical candidate and never creates folders, overwrites, or renames on conflict', async () => {
	const f = await fixture();
	try {
		const target = f.adapter.captureCreate(f.folder, 'New note.md', f.leaf);
		const preview = await f.prepare('created exactly', target);
		expect(preview.diff).toContain('notes/New-note.md');
		const { result } = await f.invoke(preview); await expect(result).resolves.toMatchObject({ status: 'committed' });
		expect(f.create).toHaveBeenCalledWith('notes/New-note.md', 'created exactly'); expect(f.mutations()).toBe(1); expect(f.process).not.toHaveBeenCalled();
		expect(() => f.adapter.captureCreate(f.folder, 'New note.md', f.leaf)).toThrow('NOTE_TARGET_EXISTS');
		for (const path of ['../escape.md', '/absolute.md', 'C:\\outside.md', '.git/config.md']) expect(() => f.adapter.captureCreate(f.folder, path, f.leaf)).toThrow('NOTE_TARGET_INVALID');
	} finally { f.dispose(); }
});

it('concurrent identical effects share one real mutation and two intents on one file still honor the original CAS', async () => {
	const f = await fixture();
	try {
		const first = await f.prepare('first'), second = await f.prepare('second');
		const one = await f.invoke(first), duplicate = f.adapter.invoke(one.request, signal());
		const two = await f.invoke(second, 'effect:two');
		await expect(one.result).resolves.toMatchObject({ status: 'committed' }); await expect(duplicate).resolves.toMatchObject({ status: 'committed' });
		await expect(two.result).rejects.toThrow('SOURCE_CHANGED'); expect(f.contents.get(f.file)).toBe('first'); expect(f.mutations()).toBe(1);
	} finally { f.dispose(); }
});

it('uses the complete captured selection baseline and rejects unsaved editors in any leaf', async () => {
	const f = await fixture('甲😀 same-size baseline');
	try {
		const selection = await f.sources.captureSelection(f.view);
		f.contents.set(f.file, '甲😀 same-size BASELINE');
		await expect(f.prepare('new', { workspaceId: lease.workspaceId, resourceId: selection.resourceId, operation: 'update', baseRevision: selection.revision })).rejects.toThrow('SOURCE_CHANGED');
		const second = f.addView(f.file); f.editors.set(second.view, 'UNSAVED SECOND WINDOW');
		await expect(f.prepare('new')).rejects.toThrow('UNSAVED_EDITOR_CHANGES'); expect(f.mutations()).toBe(0);
		f.editors.delete(second.view); f.editors.set(f.view, 'UNSAVED SOURCE SNAPSHOT');
		const source = await f.sources.captureNote(f.file, f.leaf);
		await expect(f.sources.readSnapshot(source, signal())).resolves.toMatchObject({ text: 'UNSAVED SOURCE SNAPSHOT' });
		await expect(f.prepare('new', { workspaceId: lease.workspaceId, resourceId: source.resourceId, operation: 'update', baseRevision: source.revision })).rejects.toThrow('UNSAVED_EDITOR_CHANGES');
	} finally { f.dispose(); }
});

it.each(['source', 'editor', 'replacement', 'lease', 'abort'] as const)('rechecks %s inside the synchronous Vault.process callback before any write', async change => {
	const f = await fixture(), controller = new AbortController();
	try {
		const preview = await f.prepare('approved replacement');
		f.beforeProcess(() => {
			if (change === 'source') f.contents.set(f.file, 'new external source');
			if (change === 'editor') f.editors.set(f.addView(f.file).view, 'new unsaved input');
			if (change === 'replacement') f.files.set(f.file.path, Object.assign(Object.create(TFile.prototype) as TFile, { ...f.file }));
			if (change === 'lease') f.adapter.setLease(undefined);
			if (change === 'abort') controller.abort();
		});
		const call = await f.invoke(preview, 'effect:one', f.adapter, controller.signal);
		const reason = change === 'source' || change === 'replacement' ? 'SOURCE_CHANGED' : change === 'editor' ? 'UNSAVED_EDITOR_CHANGES' : change === 'lease' ? 'HOST_OFFLINE' : 'HOST_REQUEST_ABORTED';
		await expect(call.result).rejects.toThrow(reason); expect(f.mutations()).toBe(0); expect(f.contents.get(f.file)).not.toBe(preview.content);
		if (change !== 'lease') await expect(f.query(call.request)).resolves.toMatchObject({ status: 'failed_no_effect', reason });
	} finally { f.dispose(); }
});

it('invalidates the original target during a prepare read/hash even if a rename is immediately reversed', async () => {
	const f = await fixture(); let release!: () => void;
	try {
		const source = await f.sources.captureNote(f.file, f.leaf);
		let entered!: () => void; const began = new Promise<void>(resolve => { entered = resolve; }); const blocked = new Promise<void>(resolve => { release = resolve; });
		f.read.mockImplementation(async file => { entered(); await blocked; return f.contents.get(file)!; });
		const preparing = f.prepare('new', { workspaceId: lease.workspaceId, resourceId: source.resourceId, operation: 'update', baseRevision: source.revision });
		await began; f.emit('rename', f.file, f.file.path); release();
		await expect(preparing).rejects.toThrow('SOURCE_CHANGED'); expect(f.mutations()).toBe(0);
	} finally { release?.(); f.dispose(); }
});

it('rejects a file version change while the replacement hash is being prepared', async () => {
	const f = await fixture(), content = 'replacement hash yield';
	const original = crypto.subtle.digest.bind(crypto.subtle);
	const hashing = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (algorithm, input) => {
		const result = await original(algorithm, input);
		const bytes = ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : new Uint8Array(input);
		if (new TextDecoder().decode(bytes) === content) f.file.stat.mtime++;
		return result;
	});
	try {
		await expect(f.prepare(content)).rejects.toMatchObject({ data: { kind: 'SOURCE_CHANGED', reason: 'SOURCE_CHANGED' } });
		expect(f.mutations()).toBe(0); expect(f.stored.size).toBe(0);
	} finally { hashing.mockRestore(); f.dispose(); }
});

it('refuses a create race without overwriting the competing file or inventing another filename', async () => {
	const f = await fixture();
	try {
		const target = f.adapter.captureCreate(f.folder, 'race.md', f.leaf), preview = await f.prepare('approved', target);
		f.beforeCreate(() => { f.files.set('notes/race.md', Object.assign(Object.create(TFile.prototype) as TFile, { path: 'notes/race.md', extension: 'md', stat: { size: 10 } })); });
		const call = await f.invoke(preview); await expect(call.result).resolves.toMatchObject({ status: 'unknown_outcome' });
		expect(f.mutations()).toBe(0); expect(f.create).toHaveBeenCalledTimes(1); expect(f.files.size).toBe(4);
	} finally { f.dispose(); }
});

it('stops before mutation on received receipt failure and preserves unknown without replay', async () => {
	const f = await fixture();
	try {
		const preview = await f.prepare('approved');
		vi.spyOn(f.storage, 'write').mockImplementation(async (path, text) => { if (!path.endsWith('/index.json')) throw new Error('secret disk detail'); f.stored.set(path, text); });
		const call = await f.invoke(preview); await expect(call.result).rejects.toThrow('RECEIPT_WRITE_FAILED');
		await expect(f.adapter.invoke(call.request, signal())).resolves.toMatchObject({ status: 'unknown_outcome' });
		expect(f.mutations()).toBe(0); expect(f.process).not.toHaveBeenCalled();
	} finally { f.dispose(); }
});

it('reconciles actual write success after completed receipt loss and reopening but never claims original commitment', async () => {
	const f = await fixture(); let reopened: ObsidianNoteEffects | undefined;
	try {
		const preview = await f.prepare('approved');
		vi.spyOn(f.storage, 'write').mockImplementation(async (path, text) => { if (text.includes('"phase":"completed"')) throw new Error('completion disk failed'); f.stored.set(path, text); });
		const call = await f.invoke(preview); await expect(call.result).resolves.toMatchObject({ status: 'unknown_outcome' }); expect(f.mutations()).toBe(1);
		f.adapter.dispose(); reopened = f.open(); const next = { ...lease, leaseId: 'lease:two', hostConnectionId: 'connection:two', leaseEpoch: '2' }; reopened.setLease(next);
		await expect(f.query(call.request, reopened, next)).resolves.toMatchObject({ status: 'reconciled' });
		f.contents.set(f.file, 'original restored after possible write');
		await expect(f.query(call.request, reopened, next)).resolves.toMatchObject({ status: 'unknown_outcome' }); expect(f.process).toHaveBeenCalledTimes(1);
	} finally { reopened?.dispose(); f.dispose(); }
});

it('preserves completed evidence after a dropped response/late Vault promise and allows only read-only new-lease lookup', async () => {
	const f = await fixture(); let release!: () => void, reopened: ObsidianNoteEffects | undefined;
	try {
		const preview = await f.prepare('approved'), controller = new AbortController();
		const blocked = new Promise<void>(resolve => { release = resolve; }); f.afterWrite(() => blocked);
		const call = await f.invoke(preview, 'effect:one', f.adapter, controller.signal);
		await vi.waitFor(() => expect(f.mutations()).toBe(1)); controller.abort(); f.adapter.setLease(undefined); release();
		await expect(call.result).resolves.toMatchObject({ status: 'committed' });
		reopened = f.open(); const next = { ...lease, leaseId: 'lease:two', hostConnectionId: 'connection:two', leaseEpoch: '2' }; reopened.setLease(next);
		f.contents.set(f.file, 'user edited later'); await expect(f.query(call.request, reopened, next)).resolves.toMatchObject({ status: 'committed' });
		await expect(reopened.invoke(call.request, signal())).rejects.toThrow('HOST_LEASE_MISMATCH'); expect(f.process).toHaveBeenCalledTimes(1);
	} finally { release?.(); reopened?.dispose(); f.dispose(); }
});

it('does not read an unauthenticated persisted locator, trust tampered completion, or create a missing query key', async () => {
	const f = await fixture(); let reopened: ObsidianNoteEffects | undefined;
	try {
		const call = await f.invoke(await f.prepare('approved')); await call.result;
		const receiptPath = [...f.stored.keys()].find(path => !path.endsWith('index.json'))!;
		const receipt = JSON.parse(f.stored.get(receiptPath)!) as { data: { locator: { path: string } } }; receipt.data.locator.path = 'two.md'; f.stored.set(receiptPath, JSON.stringify(receipt));
		f.adapter.dispose(); reopened = f.open(); reopened.setLease(lease); const before = f.read.mock.calls.length;
		await expect(f.query(call.request, reopened)).resolves.toMatchObject({ status: 'unknown_outcome' }); expect(f.read).toHaveBeenCalledTimes(before);
		f.local.clear(); await expect(f.query(call.request, reopened)).resolves.toMatchObject({ status: 'unknown_outcome' }); expect(f.local.size).toBe(0); expect(f.mutations()).toBe(1);
	} finally { reopened?.dispose(); f.dispose(); }
});

it('loads a relevant deferred editor for preparation and rejects an unsafe deferred view at the CAS boundary', async () => {
	const f = await fixture();
	try {
		const preview = await f.prepare('approved');
		const deferred = { view: { app: f.app }, isDeferred: true, getViewState: () => ({ type: 'markdown', state: { file: f.file.path } }),
			loadIfDeferred: vi.fn(async () => {}) } as unknown as WorkspaceLeaf;
		f.beforeProcess(() => { f.leaves.push(deferred); });
		const call = await f.invoke(preview); await expect(call.result).rejects.toThrow('UNSAVED_EDITOR_CHANGES'); expect(f.mutations()).toBe(0);
		f.beforeProcess(); await expect(f.prepare('new')).rejects.toThrow('UNSAVED_EDITOR_CHANGES'); expect(deferred.loadIfDeferred).toHaveBeenCalledTimes(1);
	} finally { f.dispose(); }
});

it('enforces UTF-8 content/preview budgets and rejects plain paths and altered fingerprints', async () => {
	const f = await fixture();
	try {
		await expect(f.prepare('😀'.repeat(16_385))).rejects.toThrow('NOTE_SIZE_LIMIT');
		await expect(f.prepare('new', { workspaceId: lease.workspaceId, resourceId: f.file.path, operation: 'update', baseRevision: '1' })).rejects.toThrow('NOTE_TARGET_INVALID');
		const call = await f.invoke(await f.prepare('approved')); await call.result;
		await expect(f.adapter.invoke({ ...call.request, fingerprint: `sha256:${'0'.repeat(64)}` }, signal())).rejects.toThrow('EFFECT_FINGERPRINT_MISMATCH');
		expect(f.mutations()).toBe(1);
	} finally { f.dispose(); }
});

it('counts JSON escaping in the bounded preview independently of the allowed plaintext byte budget', async () => {
	const f = await fixture();
	try {
		const source = await f.sources.captureNote(f.file, f.leaf);
		await expect(f.prepare('\u0000'.repeat(50_000), { workspaceId: lease.workspaceId, resourceId: source.resourceId, operation: 'update', baseRevision: source.revision })).rejects.toMatchObject({ data: { kind: 'RESOURCE_LIMIT', reason: 'NOTE_SIZE_LIMIT' } });
		expect(f.mutations()).toBe(0); expect(f.stored.size).toBe(0);
	} finally { f.dispose(); }
});

it('retains the actual target queue across an adapter disposal/reopen while an old Vault promise is still alive', async () => {
	const f = await fixture(); let release!: () => void, reopened: ObsidianNoteEffects | undefined;
	const queue = storageWriteQueue(f.app), original = queue.run.bind(queue);
	let queued!: () => void; const queueEntered = new Promise<void>(resolve => { queued = resolve; });
	const spy = vi.spyOn(queue, 'run').mockImplementation((key, work, label) => { const promise = original(key, work, label); if (key.startsWith('huhubot-note-target:') && reopened) queued(); return promise; });
	try {
		const blocked = new Promise<void>(resolve => { release = resolve; }); f.afterWrite(() => blocked);
		const first = await f.invoke(await f.prepare('first approved'));
		await vi.waitFor(() => expect(f.mutations()).toBe(1)); f.adapter.dispose();
		const next = { ...lease, leaseId: 'lease:two', hostConnectionId: 'connection:two', leaseEpoch: '2' };
		f.sources.setLease(next); reopened = f.open(); reopened.setLease(next);
		const source = await f.sources.captureNote(f.file, f.leaf);
		const prepared = await reopened.prepareWrite({ ...authority(next), target: { workspaceId: next.workspaceId, resourceId: source.resourceId, operation: 'update', baseRevision: source.revision }, tool: { ...NOTE_WRITE_TOOL }, content: 'second approved' }, signal());
		const preview: ApprovalPreview = { target: prepared.target, tool: prepared.tool, binding: prepared.binding, diff: prepared.diff, content: 'second approved', sourceRefs: [source],
			parametersHash: await digest('second params'), previewHash: await digest('second preview') };
		const request: HostInvoke = { ...first.request, ...authority(next), effectId: 'effect:two', preview, content: preview.content, resource: { resourceId: source.resourceId }, expectedRevision: source.revision };
		request.fingerprint = await noteFingerprint(request);
		const second = reopened.invoke(request, signal());
		await queueEntered; expect(f.process).toHaveBeenCalledTimes(1); expect(f.mutations()).toBe(1);
		release(); await expect(first.result).resolves.toMatchObject({ status: 'committed' }); await expect(second).resolves.toMatchObject({ status: 'committed' });
		expect(f.contents.get(f.file)).toBe('second approved'); expect(f.process).toHaveBeenCalledTimes(2); await queue.settled();
	} finally { release?.(); spy.mockRestore(); reopened?.dispose(); f.dispose(); }
});
