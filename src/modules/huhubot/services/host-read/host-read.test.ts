import { MarkdownView, TFile, type App, type WorkspaceLeaf } from 'obsidian';
import { expect, it, vi } from 'vitest';
import type { HostReadRequest, SourceSnapshot } from '../../api';
import type { HostSources } from '../../platform/obsidian/sources/port';
import { ObsidianSources } from '../../platform/obsidian/sources/sources';
import { HostReadService } from './host-read';

const lease = { leaseId: 'lease:one', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'workspace:one',
	capabilities: ['note.read', 'note.search'], expiresAt: '2099-01-01T00:00:00Z' };
const source: SourceSnapshot = { resourceId: 'source:one', kind: 'note', revision: '1', hash: `sha256:${'a'.repeat(64)}`, scopeResourceIds: [],
	workspaceId: lease.workspaceId, hostConnectionId: lease.hostConnectionId, hostLeaseId: lease.leaseId, hostLeaseEpoch: lease.leaseEpoch,
	originClientId: 'client:one', originViewId: 'view:one' };
const readRequest: HostReadRequest = { leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
	workspaceId: lease.workspaceId, source, maxBytes: 7 };
function fixture() {
	const readSnapshot = vi.fn(async () => ({ source, text: '甲😀尾' }));
	const sources: HostSources = { setLease: vi.fn(), readSnapshot, searchSnapshots: vi.fn(async () => ({ matches: [], truncated: false })) };
	const timers = new Set<() => void>();
	const host = new HostReadService(sources, { after: (_ms, run) => { timers.add(run); return () => { timers.delete(run); }; } });
	host.setLease(lease);
	return { host, sources, readSnapshot, timers };
}

it('validates request shape, current lease and source identities before any source access', async () => {
	const current = fixture();
	try {
		for (const request of [{ ...readRequest, workspaceId: 'other' }, { ...readRequest, profileId: 'forged' },
			{ ...readRequest, source: { ...source, hostLeaseEpoch: '2' } }, { ...readRequest, maxBytes: 65537 }])
			await expect(current.host.read(request, new AbortController().signal)).rejects.toThrow();
		expect(current.readSnapshot).not.toHaveBeenCalled();
		await expect(current.host.read(readRequest, new AbortController().signal)).resolves.toEqual({ source, text: '甲😀', format: 'text/markdown', truncated: true });
		expect(current.timers.size).toBe(0);
		await expect(current.host.search({ leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
			workspaceId: lease.workspaceId, sources: [], scopes: [], query: 'private', limit: 1, maxBytes: 20 }, new AbortController().signal)).rejects.toThrow('INVALID_HOST_PARAMS');
		expect(current.sources.searchSnapshots).not.toHaveBeenCalled();
	} finally { current.host.dispose(); }
});

it('discards a late body after detach and keeps a hard quota for uncooperative underlying reads', async () => {
	const current = fixture();
	const completions: Array<() => void> = [];
	current.readSnapshot.mockImplementation(() => new Promise((resolve) => { completions.push(() => resolve({ source, text: 'late-body' })); }));
	const pending = Array.from({ length: 8 }, () => current.host.read(readRequest, new AbortController().signal).catch((error: unknown) => error));
	await Promise.resolve(); await Promise.resolve();
	current.host.setLease(undefined);
	const results = await Promise.all(pending);
	expect(results.every((result) => result instanceof Error)).toBe(true);
	current.host.setLease(lease);
	await expect(current.host.read(readRequest, new AbortController().signal)).rejects.toThrow('SOURCE_TASK_LIMIT');
	for (const complete of completions) complete();
	await Promise.resolve(); await Promise.resolve();
	expect(current.timers.size).toBe(0);
	current.host.dispose();
});

function capturedEditor(text: string) {
	const file = Object.assign(Object.create(TFile.prototype) as TFile, { path: 'long.md', basename: 'long', extension: 'md',
		stat: { mtime: 1, size: 1, ctime: 1 } });
	const app = { vault: { configDir: '.obsidian', getAbstractFileByPath: (path: string) => path === file.path ? file : undefined } } as unknown as App;
	const leaf = {} as WorkspaceLeaf;
	const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { app, file, leaf,
		editor: { getValue: () => text, posToOffset: (position: { ch: number }) => position.ch,
			listSelections: () => [{ anchor: { line: 0, ch: text.length - 1 }, head: { line: 0, ch: text.length } }] } });
	Object.assign(leaf, { view });
	const timers = { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
	const sources = new ObsidianSources(app, { workspaceId: lease.workspaceId, originClientId: 'client:one', timers });
	const host = new HostReadService(sources, timers);
	host.setLease(lease);
	return { host, sources, file, leaf, view };
}

it.each([131072, 131073, 1_048_576])('reads and searches a captured one-byte selection at the end of %i UTF-16 units', async (length) => {
	// Source ranges are original UTF-16 coordinates; the selected body and output budgets count UTF-8 bytes.
	const current = capturedEditor(`${'a'.repeat(length - 1)}Z`);
	try {
		const captured = await current.sources.captureSelection(current.view);
		expect(captured.range).toEqual({ start: length - 1, end: length });
		const request = { ...readRequest, source: captured, maxBytes: 1 };
		await expect(current.host.read(request, new AbortController().signal)).resolves.toEqual({ source: captured, text: 'Z', format: 'text/markdown', truncated: false });
		await expect(current.host.search({ leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
			workspaceId: lease.workspaceId, sources: [captured], scopes: [], query: 'Z', limit: 1, maxBytes: 1 }, new AbortController().signal))
			.resolves.toMatchObject({ matches: [{ source: captured, text: 'Z', range: { start: length - 1, end: length } }], truncated: false });
	} finally { current.host.dispose(); current.sources.dispose(); }
});

it('retains the 64-KiB body budget for a captured 1-MiB editor note', async () => {
	const current = capturedEditor('a'.repeat(1_048_576));
	try {
		const captured = await current.sources.captureNote(current.file, current.leaf);
		const request = { ...readRequest, source: captured, maxBytes: 65536 };
		const receipt = await current.host.read(request, new AbortController().signal);
		expect(receipt.text).toHaveLength(65536);
		expect(receipt.truncated).toBe(true);
		await expect(current.host.read({ ...request, maxBytes: 65537 }, new AbortController().signal)).rejects.toThrow('INVALID_HOST_PARAMS');
		await expect(current.host.search({ leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
			workspaceId: lease.workspaceId, sources: [captured], scopes: [], query: 'a', limit: 1, maxBytes: 65537 }, new AbortController().signal))
			.rejects.toThrow('INVALID_HOST_PARAMS');
	} finally { current.host.dispose(); current.sources.dispose(); }
});

it('refuses an unsaved editor snapshot beyond the 1-MiB source limit', async () => {
	const current = capturedEditor(`${'a'.repeat(1_048_576)}Z`);
	try {
		await expect(current.sources.captureSelection(current.view)).rejects.toThrow('SOURCE_CACHE_LIMIT');
	} finally { current.host.dispose(); current.sources.dispose(); }
});
