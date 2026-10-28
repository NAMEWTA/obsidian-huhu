import { MarkdownView, TFile, TFolder, type App, type WorkspaceLeaf } from 'obsidian';
import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { ObsidianSources } from './sources';

const lease = { leaseId: 'lease:one', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'workspace:one',
	capabilities: ['note.read', 'note.search'], expiresAt: '2099-01-01T00:00:00Z' };
function fixture() {
	const files = ['one.md', 'two.md', 'private.md'].map((path) => Object.assign(Object.create(TFile.prototype) as TFile,
		{ path, basename: path.slice(0, -3), extension: 'md', stat: { mtime: 1, size: 10, ctime: 1 } }));
	const contents = new Map(files.map((file, index) => [file, `note-${index + 1} sentinel`]));
	const read = vi.fn(async (file: TFile) => contents.get(file)!);
	const app = { vault: { read, getAbstractFileByPath: (path: string) => files.find((file) => file.path === path),
		getMarkdownFiles: () => files, getRoot: () => Object.assign(Object.create(TFolder.prototype), { path: '/', children: files }) },
		workspace: { getActiveViewOfType: vi.fn(() => { throw new Error('Must not inspect active view'); }) } } as unknown as App;
	const leaf = {} as WorkspaceLeaf;
	let editorValue = 'unsaved first selection';
	const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { app, file: files[0], leaf,
		editor: { getValue: () => editorValue, listSelections: () => [{ anchor: { line: 0, ch: 8 }, head: { line: 0, ch: 13 } }],
			posToOffset: (position: { line: number; ch: number }) => editorValue.split('\n').slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.ch } });
	Object.assign(leaf, { view });
	const sources = new ObsidianSources(app, { workspaceId: lease.workspaceId, originClientId: 'client:one',
		timers: { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } } });
	sources.setLease(lease);
	return { sources, app, files, contents, read, leaf, view, setEditor: (text: string) => { editorValue = text; } };
}

it('preserves captured content through renewal of the same live Host lease', async () => {
	const current = fixture();
	try {
		const source = await current.sources.captureSelection(current.view);
		current.sources.setLease({ ...lease, expiresAt: '2099-01-01T00:05:00Z' });
		await expect(current.sources.readSnapshot(source, new AbortController().signal)).resolves.toMatchObject({ text: 'first', source });
		current.sources.setLease({ ...lease, leaseId: 'lease:other' });
		await expect(current.sources.readSnapshot(source, new AbortController().signal)).rejects.toThrow('SOURCE_SNAPSHOT_INVALID');
	} finally { current.sources.dispose(); }
});

it('pins an explicit unsaved selection before async work and ignores later focus/content changes', async () => {
	const current = fixture();
	try {
		const capturing = current.sources.captureSelection(current.view);
		current.setEditor('different current content');
		const source = await capturing;
		expect(source).toMatchObject({ kind: 'selection', range: { start: 8, end: 13 }, workspaceId: lease.workspaceId,
			hostLeaseId: lease.leaseId, hostLeaseEpoch: '1', scopeResourceIds: [], hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) });
		await expect(current.sources.readSnapshot(source, new AbortController().signal)).resolves.toMatchObject({ text: 'first' });
		expect(current.read).not.toHaveBeenCalled();
		expect(current.app.workspace.getActiveViewOfType).not.toHaveBeenCalled();
	} finally { current.sources.dispose(); }
});

it('keeps UTF-16 original offsets for Chinese, emoji and newlines while search budgets count UTF-8 bytes', async () => {
	const current = fixture();
	try {
		current.setEditor('甲😀\n乙😀尾');
		Object.assign(current.view.editor, { listSelections: () => [{ anchor: { line: 0, ch: 1 }, head: { line: 1, ch: 3 } }] });
		const source = await current.sources.captureSelection(current.view);
		expect(source.range).toEqual({ start: 1, end: 7 });
		expect(source.hash).toBe(`sha256:${createHash('sha256').update('😀\n乙😀').digest('hex')}`);
		await expect(current.sources.readSnapshot(source, new AbortController().signal)).resolves.toMatchObject({ text: '😀\n乙😀' });
		const request = { leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch, workspaceId: lease.workspaceId,
			sources: [source], scopes: [], query: '乙😀', limit: 1, maxBytes: 7 };
		const result = await current.sources.searchSnapshots(request, new AbortController().signal);
		expect(result.matches).toMatchObject([{ text: '乙😀', range: { start: 4, end: 7 } }]);
		expect(new TextEncoder().encode(result.matches[0]!.text)).toHaveLength(7);
		current.setEditor('changed');
		const openFile = vi.fn(async () => undefined);
		Object.assign(current.app.workspace, { getLeaf: () => ({ openFile }) });
		await expect(current.sources.openSource(source)).resolves.toEqual({ source, changed: true });
		expect(openFile).toHaveBeenCalledWith(current.files[0]);
	} finally { current.sources.dispose(); }
});

it('refuses a programmatic selection that splits an emoji surrogate pair', async () => {
	const current = fixture();
	try {
		current.setEditor('甲😀\n乙😀尾');
		Object.assign(current.view.editor, { listSelections: () => [{ anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 3 } }] });
		await expect(current.sources.captureSelection(current.view)).rejects.toThrow('SOURCE_SELECTION_REQUIRED');
		expect(current.read).not.toHaveBeenCalled();
	} finally { current.sources.dispose(); }
});

it('rejects a scoped file moved during the Vault read before caching or returning its body', async () => {
	const current = fixture();
	let complete: ((text: string) => void) | undefined;
	try {
		const scope = await current.sources.captureVault(current.leaf);
		current.read.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
		const pending = current.sources.searchSnapshots({ leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
			workspaceId: lease.workspaceId, sources: [], scopes: [scope], query: 'sentinel', limit: 1, maxBytes: 128 }, new AbortController().signal);
		await vi.waitFor(() => expect(current.read).toHaveBeenCalledTimes(1));
		Object.assign(current.files[0]!, { path: 'moved-outside.md' });
		complete?.('new private sentinel');
		await expect(pending).rejects.toThrow('SOURCE_CHANGED');
	} finally { complete?.('finished'); current.sources.dispose(); }
});

function replaceFile(current: ReturnType<typeof fixture>, original: TFile): void {
	const replacement = Object.assign(Object.create(TFile.prototype) as TFile, { path: original.path, basename: original.basename,
		extension: original.extension, stat: { ...original.stat } });
	const lookup = current.app.vault.getAbstractFileByPath.bind(current.app.vault);
	Object.assign(current.app.vault, { getAbstractFileByPath: (path: string) => path === original.path ? replacement : lookup(path) });
}

it('resolves only a captured opaque source revision for trusted note-write preparation', async () => {
	const current = fixture();
	try {
		const source = await current.sources.captureSelection(current.view);
		const target = current.sources.resolveWriteTarget(source.resourceId, source.revision);
		expect(target.file).toBe(current.files[0]);
		expect(target.path).toBe('one.md');
		expect(target.fullHash).toBe(`sha256:${createHash('sha256').update('unsaved first selection').digest('hex')}`);
		expect(target.source).toEqual(source);
		expect(() => current.sources.resolveWriteTarget('one.md', source.revision)).toThrow('NOTE_TARGET_INVALID');
		expect(() => current.sources.resolveWriteTarget(source.resourceId, '999')).toThrow('SOURCE_CHANGED');
		current.sources.setLease(undefined);
		expect(() => current.sources.resolveWriteTarget(source.resourceId, source.revision)).toThrow('SOURCE_LEASE_UNAVAILABLE');
	} finally { current.sources.dispose(); }
});

it.each(['replace', 'rename'] as const)('never rebinds a write target after captured file %s', async (change) => {
	const current = fixture();
	try {
		const source = await current.sources.captureSelection(current.view);
		if (change === 'replace') replaceFile(current, current.files[0]!);
		else Object.assign(current.files[0]!, { path: 'renamed.md' });
		await expect(current.sources.readSnapshot(source, new AbortController().signal)).resolves.toMatchObject({ text: 'first' });
		expect(() => current.sources.resolveWriteTarget(source.resourceId, source.revision)).toThrow('SOURCE_CHANGED');
	} finally { current.sources.dispose(); }
});

function pauseHash(text: string) {
	let began!: () => void, release!: () => void;
	const started = new Promise<void>((resolve) => { began = resolve; });
	const blocked = new Promise<void>((resolve) => { release = resolve; });
	const digest = crypto.subtle.digest.bind(crypto.subtle);
	const spy = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (algorithm, data) => {
		if (new TextDecoder().decode(data) === text) { began(); await blocked; }
		return digest(algorithm, data);
	});
	return { started, release, restore: () => spy.mockRestore() };
}

it('rejects same-path, unchanged-stat replacement before the background Vault read starts', async () => {
	const current = fixture();
	try {
		const pending = current.sources.captureNote(current.files[1]!, current.leaf);
		replaceFile(current, current.files[1]!);
		await expect(pending).rejects.toThrow('SOURCE_CHANGED');
		expect(current.read).not.toHaveBeenCalled();
	} finally { current.sources.dispose(); }
});

it.each([false, true])('keeps the selected background file identity across Vault.read (replacement=%s)', async (replacement) => {
	const current = fixture();
	let began!: () => void, release!: (text: string) => void;
	const started = new Promise<void>((resolve) => { began = resolve; });
	current.read.mockImplementation(() => { began(); return new Promise((resolve) => { release = resolve; }); });
	try {
		const pending = current.sources.captureNote(current.files[1]!, current.leaf);
		await started;
		if (replacement) replaceFile(current, current.files[1]!);
		release(replacement ? 'REPLACEMENT_PRIVATE_BODY' : 'ORIGINAL_ALLOWED_BODY');
		if (replacement) await expect(pending).rejects.toThrow('SOURCE_CHANGED');
		else await expect(current.sources.readSnapshot(await pending, new AbortController().signal)).resolves.toMatchObject({ text: 'ORIGINAL_ALLOWED_BODY' });
		expect(current.files[1]).toMatchObject({ path: 'two.md', stat: { mtime: 1, size: 10 } });
		expect(current.read).toHaveBeenCalledTimes(1);
	} finally { release?.('cleanup'); current.sources.dispose(); }
});

it.each(['note', 'scope'] as const)('refuses %s cache publication when its file is replaced during async hashing', async (kind) => {
	const current = fixture();
	const text = 'allowed sentinel';
	try {
		const scope = kind === 'scope' ? await current.sources.captureVault(current.leaf) : undefined;
		current.read.mockResolvedValue(text);
		const hash = pauseHash(text);
		try {
			const pending = scope ? current.sources.searchSnapshots({ leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId,
				leaseEpoch: lease.leaseEpoch, workspaceId: lease.workspaceId, sources: [], scopes: [scope], query: 'sentinel', limit: 1, maxBytes: 128 },
				new AbortController().signal) : current.sources.captureNote(current.files[1]!, current.leaf);
			await hash.started;
			replaceFile(current, current.files[kind === 'scope' ? 0 : 1]!);
			hash.release();
			await expect(pending).rejects.toThrow('SOURCE_CHANGED');
		} finally { hash.release(); hash.restore(); }
		if (scope) Object.assign(current.view, { file: current.files[1] });
		// A rejected publication must not consume any of the 128 source/scope slots.
		for (let index = scope ? 1 : 0; index < 128; index++) await current.sources.captureSelection(current.view);
		await expect(current.sources.captureSelection(current.view)).rejects.toThrow('SOURCE_CACHE_LIMIT');
	} finally { current.sources.dispose(); }
});

it('pins a whole unsaved editor note despite later editor, leaf and registry changes', async () => {
	const current = fixture();
	try {
		const pending = current.sources.captureNote(current.files[0]!, current.leaf);
		current.setEditor('different current content');
		Object.assign(current.leaf, { view: { app: current.app } });
		replaceFile(current, current.files[0]!);
		await expect(current.sources.readSnapshot(await pending, new AbortController().signal)).resolves.toMatchObject({ text: 'unsaved first selection' });
		expect(current.read).not.toHaveBeenCalled();
	} finally { current.sources.dispose(); }
});

it('keeps the real uncancelable Vault read quota until completion after lease loss', async () => {
	const current = fixture();
	const complete: Array<() => void> = [];
	try {
		current.read.mockImplementation(() => new Promise((resolve) => { complete.push(() => resolve('finished sentinel')); }));
		const pending = Array.from({ length: 8 }, () => current.sources.captureNote(current.files[1]!, current.leaf).catch((error: unknown) => error));
		await vi.waitFor(() => expect(current.read).toHaveBeenCalledTimes(8));
		current.sources.setLease(undefined);
		expect((await Promise.all(pending)).every((result) => result instanceof Error)).toBe(true);
		current.sources.setLease(lease);
		await expect(current.sources.captureNote(current.files[1]!, current.leaf)).rejects.toThrow('SOURCE_TASK_LIMIT');
		expect(current.read).toHaveBeenCalledTimes(8);
	} finally { for (const release of complete) release(); current.sources.dispose(); }
});

it('suppresses raw Vault failure text at the capture API', async () => {
	const current = fixture();
	try {
		current.read.mockRejectedValue(new Error('private body from underlying Vault failure'));
		await expect(current.sources.captureNote(current.files[1]!, current.leaf)).rejects.toThrow('SOURCE_READ_FAILED');
	} finally { current.sources.dispose(); }
});

it('registers explicit folder membership without reading bodies and searches only that frozen set', async () => {
	const current = fixture();
	const folder = Object.assign(Object.create(TFolder.prototype) as TFolder, { path: 'selected-folder', children: current.files.slice(0, 2) });
	const lookup = current.app.vault.getAbstractFileByPath;
	Object.assign(current.app.vault, { getAbstractFileByPath: (path: string) => path === folder.path ? folder : lookup(path) });
	try {
		const scope = await current.sources.captureFolder(folder, current.leaf);
		expect(current.read).not.toHaveBeenCalled();
		folder.children.push(current.files[2]!);
		const request = { leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch, workspaceId: lease.workspaceId,
			sources: [], scopes: [scope], query: 'sentinel', limit: 1, maxBytes: 128 };
		const first = await current.sources.searchSnapshots(request, new AbortController().signal);
		expect(first.matches[0]!.source.scopeResourceIds).toEqual([scope.resourceId]);
		expect(first.nextCursor).toBeDefined();
		await current.sources.searchSnapshots({ ...request, cursor: first.nextCursor }, new AbortController().signal);
		expect(current.read.mock.calls.map(([file]) => file.path)).toEqual(['one.md', 'two.md']);
		await expect(current.sources.searchSnapshots({ ...request, scopes: [{ ...scope, resourceId: '/vault' }] }, new AbortController().signal)).rejects.toThrow('SOURCE_SCOPE_INVALID');
		expect(current.read).toHaveBeenCalledTimes(2);
	} finally { current.sources.dispose(); }
});

it('reads only explicitly captured files and rejects invented resources, changed metadata and stale leases', async () => {
	const current = fixture();
	try {
		const one = await current.sources.captureNote(current.files[0]!, current.leaf);
		const two = await current.sources.captureNote(current.files[1]!, current.leaf);
		await current.sources.readSnapshot(one, new AbortController().signal);
		await current.sources.readSnapshot(two, new AbortController().signal);
		expect(current.read.mock.calls.map(([file]) => file.path)).toEqual(['two.md']);
		await expect(current.sources.readSnapshot({ ...two, resourceId: '/etc/passwd' }, new AbortController().signal)).rejects.toThrow('SOURCE');
		await expect(current.sources.readSnapshot({ ...two, hash: `sha256:${'0'.repeat(64)}` }, new AbortController().signal)).rejects.toThrow('SOURCE');
		current.sources.setLease({ ...lease, leaseId: 'lease:replacement', leaseEpoch: '2' });
		await expect(current.sources.readSnapshot(one, new AbortController().signal)).rejects.toThrow('SOURCE');
		expect(current.read.mock.calls.every(([file]) => file.path !== 'private.md')).toBe(true);
	} finally { current.sources.dispose(); }
});
