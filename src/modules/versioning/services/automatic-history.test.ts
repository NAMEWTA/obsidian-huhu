import { afterEach, expect, test, vi } from 'vitest';
import { SettingsStore } from '../../../shared/settings/store';
import type { TextStorage } from '../../../shared/storage/ports';
import { syncSettings } from '../settings';
import { AutomaticHistory } from './automatic-history';
import { LocalHistoryStore } from './local-history-store';
import { HistoryQueryService } from './history-query';

function fixture() {
	const files = new Map<string, string>();
	const directories = new Set<string>();
	const storage: TextStorage = {
		exists: async path => files.has(path) || directories.has(path),
		read: async path => { if (!files.has(path)) throw new Error('missing file'); return files.get(path)!; },
		write: async (path, text) => { files.set(path, text); }, mkdir: async path => { directories.add(path); },
	};
	const timers = new Map<number, { run: () => void; ms: number }>();
	let next = 0, now = 1000;
	const clock = { setTimeout: (run: () => void, ms: number) => { const id = ++next; timers.set(id, { run, ms }); return id; }, clearTimeout: (id?: number) => { if (id !== undefined) timers.delete(id); } } as unknown as Window;
	const settingsStore = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, {
		timers: { set: (run, ms) => setTimeout(run, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) },
	});
	const settings = settingsStore.bind('versioning', syncSettings);
	let text = 'unsaved first\r\n';
	const capture = vi.fn(() => [{ path: 'note.md', text, sourceId: 'leaf-1' }]);
	const history = new LocalHistoryStore(storage, 'device-1', () => ++now);
	const protection = vi.fn(async (_signal: AbortSignal) => {});
	const automatic = new AutomaticHistory({ settings, history, capture, assertProtection: protection, timers: clock });
	const update = (enabled: boolean) => settings.update(value => { value.localHistoryEnabled = enabled; }, { persist: 'immediate' });
	const queries = new HistoryQueryService(async () => { throw new Error('Git unavailable'); }, () => history);
	return { files, storage, history, settings, automatic, capture, protection, timers, update, queries, text: (next: string) => { text = next; } };
}
const running: AutomaticHistory[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(service => service.stop())); });

test('defaults are device opt-in with five minutes, thirty days and one GiB; disabled never reads buffers or writes', async () => {
	const f = fixture(); running.push(f.automatic);
	expect(f.settings.get()).toMatchObject({ localHistoryEnabled: false, localHistoryIntervalMinutes: 5, localHistoryRetentionDays: 30, localHistoryQuotaMiB: 1024 });
	f.automatic.start();
	await f.automatic.sample('important');
	expect(f.capture).not.toHaveBeenCalled();
	expect(f.protection).not.toHaveBeenCalled();
	expect(f.timers.size).toBe(0);
	expect(f.files.size).toBe(0);
});

test('opted-in interval and event samples preserve unsaved bytes, deduplicate, query and compare without Git', async () => {
	const f = fixture(); running.push(f.automatic); f.automatic.start(); await f.update(true);
	expect([...f.timers.values()].map(timer => timer.ms)).toEqual([300_000]);
	const timer = [...f.timers.entries()][0]!; f.timers.delete(timer[0]); timer[1].run();
	await f.automatic.sample('switch');
	let entries = await f.queries.localHistory('note.md');
	expect(entries).toHaveLength(1);
	expect(await f.queries.readLocalSnapshot(entries[0]!.id)).toBe('unsaved first\r\n');
	f.text('unsaved second'); await f.automatic.sample('important');
	entries = await f.queries.localHistory('note.md'); expect(entries).toHaveLength(2);
	const selected = entries[0]!;
	const comparison = await f.queries.compare({ intent: 'history-current',
		left: { kind: 'local-snapshot', path: 'note.md', snapshotId: selected.id, text: await f.queries.readLocalSnapshot(selected.id) },
		right: { kind: 'editor-buffer', path: 'note.md', text: 'current unsaved', generation: 3 } });
	expect(comparison.left.status === 'text' && comparison.left.snapshot.text).toBe('unsaved second');
	expect(comparison.right.status === 'text' && comparison.right.snapshot.text).toBe('current unsaved');
	expect(comparison.canCompare).toBe(true);
	expect([...f.files.keys()].every(path => path.startsWith('.huhu/recovery/versioning/device-1/'))).toBe(true);
	const restarted = new LocalHistoryStore(f.storage, 'device-1');
	expect(await restarted.list('note.md')).toHaveLength(2);
	expect(await restarted.readSnapshot(selected.id)).toBe('unsaved second');
	await f.update(false); await f.automatic.sample('important');
	expect(f.timers.size).toBe(0);
	expect(await restarted.list('note.md')).toHaveLength(2);
});

test('protection failure is visible, stores nothing, and stopping cancels an in-flight preflight', async () => {
	const f = fixture(); running.push(f.automatic); f.automatic.start(); await f.update(true);
	f.protection.mockRejectedValueOnce(new Error('versioning.localHistory.protection'));
	await f.automatic.sample('interval');
	expect(f.automatic.snapshot).toMatchObject({ phase: 'error', error: 'versioning.localHistory.protection' });
	expect(f.files.size).toBe(0);
	let admitted = false;
	f.protection.mockImplementationOnce(signal => new Promise<void>((_resolve, reject) => {
		admitted = true;
		signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
	}));
	const sampling = f.automatic.sample('important');
	await vi.waitFor(() => expect(admitted).toBe(true));
	await Promise.all([sampling, f.automatic.stop()]);
	expect(f.files.size).toBe(0); expect(f.timers.size).toBe(0);
	expect(f.automatic.snapshot.phase).toBe('off');
});

test('explicit rename preserves local identity, deletion starts a fresh lineage, and tampered bodies fail readback', async () => {
	const f = fixture();
	const first = await f.history.capture('old.md', 'before', 'important');
	await f.history.rename('old.md', 'new.md');
	expect((await f.history.list('new.md'))[0]?.id).toBe(first?.id);
	expect(await f.history.list('old.md')).toEqual([]);
	await f.history.rename('new.md', null);
	const fresh = await f.history.capture('new.md', 'after', 'switch');
	expect(fresh?.documentId).not.toBe(first?.documentId);
	expect(await f.history.list('new.md')).toHaveLength(1);
	f.files.set(`.huhu/recovery/versioning/device-1/objects/${fresh!.hash}.txt`, 'tampered');
	await expect(f.history.readSnapshot(fresh!.id)).rejects.toThrow('checkpoint-corrupt');
});

test('buffer read failures stay visible, and settings changes cannot hide an unresolved capture error', async () => {
	const f = fixture(); running.push(f.automatic); f.automatic.start(); await f.update(true);
	f.capture.mockImplementationOnce(() => { throw new Error('editor unavailable'); });
	await f.automatic.sample('switch');
	expect(f.automatic.snapshot).toMatchObject({ phase: 'error', error: 'editor unavailable' });
	await f.settings.update(value => { value.localHistoryIntervalMinutes = 2; }, { persist: 'immediate' });
	expect(f.automatic.snapshot.phase).toBe('error');
	expect([...f.timers.values()].map(timer => timer.ms)).toEqual([120_000]);
	await f.automatic.sample('important');
	expect(f.automatic.snapshot.phase).toBe('ready');
});

test('browsing a damaged local index uses its validated backup without any repair writes', async () => {
	const f = fixture();
	const first = await f.history.capture('note.md', 'first', 'important');
	await f.history.capture('note.md', 'second', 'interval');
	f.files.set('.huhu/recovery/versioning/device-1/history/index.json', '{corrupt');
	const baseline = [...f.files];
	const restarted = new LocalHistoryStore(f.storage, 'device-1');
	expect((await restarted.list('note.md')).map(entry => entry.id)).toEqual([first!.id]);
	expect(await restarted.readSnapshot(first!.id)).toBe('first');
	expect([...f.files]).toEqual(baseline);
});

test('empty interval and event samples preserve a corrupt-index error until a real successful capture verifies recovery', async () => {
	const f = fixture(); running.push(f.automatic);
	const indexPath = '.huhu/recovery/versioning/device-1/history/index.json';
	f.files.set(indexPath, '{corrupt'); f.automatic.start(); await f.update(true);
	await f.automatic.sample('interval');
	expect(f.automatic.snapshot).toMatchObject({ phase: 'error', error: 'versioning.localHistory.corrupt' });
	await f.automatic.sample('interval', []); await f.automatic.sample('important', []);
	expect(f.automatic.snapshot).toMatchObject({ phase: 'error', error: 'versioning.localHistory.corrupt' });
	expect(f.files.get(indexPath)).toBe('{corrupt');
	f.files.set(indexPath, JSON.stringify({ version: 1, paths: {}, entries: {} }));
	await f.automatic.sample('important');
	expect(f.automatic.snapshot).toMatchObject({ phase: 'ready', error: undefined });
	expect(await f.history.list('note.md')).toHaveLength(1);
});
