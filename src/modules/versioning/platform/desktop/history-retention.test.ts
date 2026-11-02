import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { nativeVaultStorage } from '../../../../host/desktop/vault-storage';
import type { TextStorage } from '../../../../shared/storage/ports';
import type { RestoreReceipt } from '../../core/restore';
import type { LocalHistoryEntry } from '../../core/local-history';
import { CheckpointStore } from '../../services/checkpoint-store';
import { LocalHistoryStore } from '../../services/local-history-store';
import { HistoryRetention } from '../../services/history-retention';
import { createRecoveryFiles } from './recovery-files';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const rootPath = '.huhu/recovery/versioning/device-1';
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'huhu-history-gc-')); roots.push(root);
	const native = nativeVaultStorage(root);
	let hook: ((path: string, text: string) => Promise<void>) | undefined;
	const storage: TextStorage = { ...native, async write(path, text) { await native.write(path, text); await hook?.(path, text); } };
	let now = 1_000_000_000_000;
	let quotaBytes = 1024 * 1024;
	const checkpoints = new CheckpointStore(storage, 'device-1');
	const history = new LocalHistoryStore(storage, 'device-1', () => now, checkpoints);
	const files = createRecoveryFiles(root, 'device-1');
	const retention = new HistoryRetention(storage, 'device-1', history, files, () => ({ days: 30, quotaBytes }), () => now);
	const receipt = async (id: string, stage: RestoreReceipt['stage'], text: string, extra: Partial<RestoreReceipt> = {}) => {
		const hash = await checkpoints.putObject(text);
		const value: RestoreReceipt = { id, stage, path: 'note.md', sourceId: 'source', sourceLabel: '', mode: 'replace-current',
			createdAt: now, updatedAt: now, beforeObject: hash, beforeDiskObject: hash, afterObject: hash, actualDiskObject: hash,
			repositoryBaseline: 'baseline', ...extra };
		await checkpoints.putReceipt(value); return value;
	};
	return { root, native, storage, checkpoints, history, files, retention, receipt,
		advance: (days: number) => { now += days * 86_400_000; }, quota: (bytes: number) => { quotaBytes = bytes; }, now: () => now,
		hook: (next?: typeof hook) => { hook = next; }, object: (hash: string) => `${rootPath}/objects/${hash}.txt`,
		capture: (name: string, text: string) => history.capture(name, text, 'important', undefined, (allocation, scope) => retention.admit(allocation, scope)),
	};
}

async function shrinkingBackupFixture() {
	const f = fixture(), quota = 1024 * 1024;
	const first = await f.history.capture('same.md', 'A', 'interval');
	const entries: Record<string, LocalHistoryEntry> = {};
	for (let i = 0; i < 1800; i++) {
		const id = crypto.randomUUID();
		entries[id] = { ...first!, id, createdAt: f.now() - 1800 + i };
	}
	const index = { version: 1, paths: { 'same.md': first!.documentId }, entries };
	const primary = JSON.stringify(index);
	const backupWithPath = (name: string) => JSON.stringify({ ...index, paths: { ...index.paths, [name]: crypto.randomUUID() } });
	const extra = quota + 203 - (2 * Buffer.byteLength(primary) + 1);
	const name = `retired/n${'p'.repeat(extra - (Buffer.byteLength(backupWithPath('retired/n.md')) - Buffer.byteLength(primary)))}.md`;
	const indexPath = `${rootPath}/history/index.json`;
	await f.native.write(indexPath, primary);
	await f.native.write(`${indexPath}.backup`, backupWithPath(name));
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBe(quota + 203);
	return { ...f, indexPath, entries, index };
}

test('expiry releases terminal bodies, preserves shared live hashes and uncertain or undoable receipts across restart', async () => {
	const f = fixture();
	const shared = await f.history.capture('old.md', 'shared', 'interval');
	const undoable = await f.receipt('undoable', 'verified', 'shared');
	const pending = await f.receipt('pending', 'needs-review', 'uncertain', { acknowledgedAt: f.now() });
	const aborted = await f.receipt('aborted', 'aborted', 'aborted contents');
	const undone = await f.receipt('undone', 'verified', 'undone contents', { undoneBy: 'later-undo' });
	f.advance(31); await f.capture('recent.md', 'recent');
	expect(await f.history.list('old.md')).toEqual([]);
	for (const receipt of [undoable, pending]) expect(await f.storage.exists(f.object(receipt.beforeObject!))).toBe(true);
	for (const receipt of [aborted, undone]) expect(await f.storage.exists(f.object(receipt.beforeObject!))).toBe(false);
	expect(await f.history.objects.readObject(shared!.hash)).toBe('shared');
	const restarted = new CheckpointStore(f.storage, 'device-1'); await restarted.load();
	expect(restarted.receipts().find(receipt => receipt.id === 'aborted')).toMatchObject({ objectsReleasedAt: f.now(), stage: 'aborted', beforeObject: aborted.beforeObject });
	expect(restarted.receipts().find(receipt => receipt.id === 'pending')?.objectsReleasedAt).toBeUndefined();
	const restartedHistory = new LocalHistoryStore(f.storage, 'device-1');
	expect(await restartedHistory.list('old.md')).toEqual([]);
	expect(await restartedHistory.list('recent.md')).toHaveLength(1);
});

test('the actual quota evicts oldest unique unprotected data before admission and pauses when only protected data remains', async () => {
	const f = fixture(); f.quota(100_000);
	const oldest = await f.capture('old.md', 'a'.repeat(60_000));
	f.advance(1); await f.capture('new.md', 'b'.repeat(60_000));
	expect(await f.storage.exists(f.object(oldest!.hash))).toBe(false);
	const latest = (await f.history.list('new.md'))[0]!;
	await f.receipt('protected', 'verified', 'b'.repeat(60_000));
	await expect(f.capture('blocked.md', 'c'.repeat(60_000))).rejects.toThrow('versioning.localHistory.quota');
	expect(await f.history.list('blocked.md')).toEqual([]);
	expect(await f.storage.exists(f.object(latest.hash))).toBe(true);
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeLessThan(100_000);
});

test('a legal 1 MiB quota retains recent shared-body history when index metadata dominates storage', async () => {
	const f = fixture(), quota = 1024 * 1024;
	const first = await f.history.capture('note.md', 'A', 'interval');
	const second = await f.history.capture('note.md', 'B', 'interval');
	const indexPath = `${rootPath}/history/index.json`;
	const paths: Record<string, string> = { 'note.md': first!.documentId, 'retired.md': crypto.randomUUID() };
	const entries: Record<string, LocalHistoryEntry> = {};
	for (let i = 0; i < 2500; i++) {
		const id = crypto.randomUUID();
		entries[id] = { ...(i % 2 ? second! : first!), id, createdAt: f.now() - 2500 + i };
	}
	const ordered = Object.values(entries);
	for (const file of [indexPath, `${indexPath}.backup`])
		await f.native.write(file, JSON.stringify({ version: 1, paths, entries }));
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeGreaterThan(quota);
	await f.retention.collect();
	const retained = await f.history.list('note.md');
	expect(retained.length).toBeGreaterThanOrEqual(1000);
	expect(retained[0]!.id).toBe(ordered.at(-1)!.id);
	expect(retained.some(entry => entry.id === ordered[0]!.id)).toBe(false);
	expect(await f.history.readSnapshot(retained[0]!.id)).toBe('B');
	for (const file of [indexPath, `${indexPath}.backup`])
		expect(JSON.parse(await f.native.read(file)).paths).toEqual(paths);
	await f.capture('新分配.md', 'new body'.repeat(10_000));
	expect((await f.history.list('note.md')).length).toBeGreaterThanOrEqual(1000);
	expect(await f.history.readSnapshot((await f.history.list('新分配.md'))[0]!.id)).toBe('new body'.repeat(10_000));
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeLessThanOrEqual(quota);
});

test('admission budgets primary-to-backup growth and successive new Unicode path mappings', async () => {
	const f = fixture(), quota = 1024 * 1024;
	const first = await f.history.capture('note.md', 'shared', 'interval');
	const indexPath = `${rootPath}/history/index.json`;
	const entries: Record<string, LocalHistoryEntry> = {};
	for (let i = 0; i < 1900; i++) {
		const id = crypto.randomUUID();
		entries[id] = { ...first!, id, createdAt: f.now() - 1900 + i };
	}
	await f.native.write(indexPath, JSON.stringify({ version: 1, paths: { 'note.md': first!.documentId }, entries }));
	await f.native.write(`${indexPath}.backup`, JSON.stringify({ version: 1, paths: {}, entries: {} }));
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeLessThan(quota);
	for (const length of [1000, 2000, 3000]) {
		const name = `${'新'.repeat(length)}.md`, text = `body-${length}`.repeat(5000);
		await f.capture(name, text);
		expect(await f.history.readSnapshot((await f.history.list(name))[0]!.id)).toBe(text);
		expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeLessThanOrEqual(quota);
	}
	const retained = await f.history.list('note.md');
	expect(retained.length).toBeGreaterThanOrEqual(1000);
	expect(retained.length).toBeLessThan(1900);
	expect(retained[0]!.id).toBe(Object.values(entries).at(-1)!.id);
});

test.each(['new', 'duplicate'] as const)('a smaller primary admits %s content only after verified backup compaction', async kind => {
	const f = await shrinkingBackupFixture();
	let metadataWrites = 0;
	f.hook(async path => { if (path === f.indexPath || path === `${f.indexPath}.backup`) metadataWrites++; });
	const result = await f.capture(kind === 'new' ? 'new.md' : 'same.md', kind === 'new' ? 'X' : 'A');
	if (kind === 'new') expect(result).toMatchObject({ path: 'new.md' });
	else {
		expect(result).toBeUndefined();
		for (const file of [f.indexPath, `${f.indexPath}.backup`])
			expect(JSON.parse(await f.native.read(file))).toEqual(f.index);
	}
	expect(metadataWrites).toBeGreaterThanOrEqual(4);
	expect((await f.history.list('same.md')).map(entry => entry.id).sort()).toEqual(Object.keys(f.entries).sort());
	for (const file of [f.indexPath, `${f.indexPath}.backup`])
		expect(Object.keys(JSON.parse(await f.native.read(file)).paths).every(name => !name.startsWith('retired/'))).toBe(true);
	expect((await f.files.inventory()).reduce((sum, file) => sum + file.byteLength, 0)).toBeLessThanOrEqual(1024 * 1024);
});

test('failed backup compaction cannot admit a duplicate using an unrealized size reduction', async () => {
	const f = await shrinkingBackupFixture();
	f.hook(async path => { if (path === `${f.indexPath}.backup`) throw new Error('compaction failed'); });
	await expect(f.capture('same.md', 'A')).rejects.toThrow('compaction failed');
	expect(JSON.parse(await f.native.read(f.indexPath))).toEqual(f.index);
});

test('a newly published external reference after planning stops deletion and keeps the referenced object', async () => {
	const f = fixture(); const entry = await f.history.capture('old.md', 'old body', 'interval'); f.advance(31);
	let injected = false;
	f.hook(async (path, text) => {
		if (!injected && path.endsWith('/retention.json') && JSON.parse(text).stage === 'planned') {
			injected = true;
			const indexPath = `${rootPath}/history/index.json`, index = JSON.parse(await f.native.read(indexPath));
			index.entries[entry!.id].createdAt = f.now(); await f.native.write(indexPath, JSON.stringify(index));
		}
	});
	await expect(f.retention.collect()).rejects.toThrow('versioning.localHistory.retentionChanged');
	expect(await f.storage.exists(f.object(entry!.hash))).toBe(true);
});

test('an unpublished restore object cannot be swept between creation and its durable recovery reference', async () => {
	const f = fixture(), ready = deferred(), release = deferred();
	let hash = '';
	const publishing = f.checkpoints.transaction(async scope => {
		hash = await scope.putObject('unpublished restore'); ready.resolve(); await release.promise;
		await scope.putReceipt({ id: 'in-flight', stage: 'applying', path: 'note.md', sourceId: 'source', sourceLabel: '', mode: 'replace-current',
			createdAt: f.now(), updatedAt: f.now(), beforeObject: hash, beforeDiskObject: hash, afterObject: hash, repositoryBaseline: 'baseline' });
	});
	await ready.promise; let collected = false;
	const collecting = f.retention.collect().then(() => { collected = true; });
	await Promise.resolve(); expect(collected).toBe(false);
	release.resolve(); await Promise.all([publishing, collecting]);
	expect(await f.checkpoints.readObject(hash)).toBe('unpublished restore');
});

test('an interrupted sweep is reconciled from fresh inventory after restart, without restoring expired backup references', async () => {
	const f = fixture(); const entry = await f.history.capture('old.md', 'expired', 'interval'); f.advance(31);
	const files = { ...f.files, async remove(file: Parameters<typeof f.files.remove>[0]) { await f.files.remove(file); throw new Error('interrupted after delete'); } };
	const interrupted = new HistoryRetention(f.storage, 'device-1', f.history, files, () => ({ days: 30, quotaBytes: 1024 * 1024 }), f.now);
	await expect(interrupted.collect()).rejects.toThrow('interrupted after delete');
	expect(await f.storage.exists(f.object(entry!.hash))).toBe(false);
	const history = new LocalHistoryStore(f.storage, 'device-1');
	const restarted = new HistoryRetention(f.storage, 'device-1', history, f.files, () => ({ days: 30, quotaBytes: 1024 * 1024 }), f.now);
	await restarted.collect(); expect(await history.list('old.md')).toEqual([]);
	expect(JSON.parse(await f.storage.read(`${rootPath}/retention.json`)).stage).toBe('complete');
});

test('a damaged backup prevents collection instead of being treated as an empty reference set', async () => {
	const f = fixture(); const entry = await f.history.capture('old.md', 'keep', 'interval'); f.advance(31);
	await f.storage.write(`${rootPath}/history/index.json.backup`, '{broken');
	await expect(f.retention.collect()).rejects.toThrow('versioning.localHistory.retentionCorrupt');
	expect(await f.checkpoints.readObject(entry!.hash)).toBe('keep');
});

test('a modified candidate fails hash verification and is never removed as if it were the planned object', async () => {
	const f = fixture(); const entry = await f.history.capture('old.md', 'original body', 'interval'); f.advance(31);
	let tampered = false;
	f.hook(async (path, text) => {
		if (!tampered && path.endsWith('/retention.json') && JSON.parse(text).stage === 'planned') {
			tampered = true; await f.native.write(f.object(entry!.hash), 'external replacement');
		}
	});
	await expect(f.retention.collect()).rejects.toThrow('checkpoint-corrupt');
	expect(await f.native.read(f.object(entry!.hash))).toBe('external replacement');
});
