import { expect, test, vi } from 'vitest';
import { createDiarySearch } from './diary-search';
import type { NavigatorPeriodicService, PeriodicNoteListEntry } from '../api';
const entries: PeriodicNoteListEntry[] = ['04', '03'].map(day => ({ period: 'day', date: `2026-11-${day}`, path: `${day}.md`, title: day, active: false, status: 'existing', summaryStatus: 'ready' }));
function fixture(read = vi.fn(async () => 'body')) {
	const source = { periodic: { list: async () => entries, inspect: (_period, date) => entries.find(entry => Number(entry.date.slice(-2)) === date.getDate()) ?? { ...entries[0]!, path: 'missing.md', status: 'missing' }, subscribe: () => () => {} } as Pick<NavigatorPeriodicService, 'list' | 'inspect' | 'subscribe'>, read };
	return { service: createDiarySearch(source), source };
}
test('loaded scope and in-flight scans cannot declare no results; completion requires every body read', async () => {
	let finish!: (text: string) => void;
	const f = fixture(vi.fn(() => new Promise<string>(resolve => { finish = resolve; })));
	try {
		f.service.loaded('absent', [{ ...entries[0]!, text: 'body' }]);
		expect(f.service.store.getState().status).toBe('partial');
		const pending = f.service.scan('absent', '2026-11-03', '2026-11-04');
		await vi.waitFor(() => expect(f.source.read).toHaveBeenCalledOnce());
		expect(f.service.store.getState()).toMatchObject({ status: 'indexing', hits: [] });
		finish('body'); await vi.waitFor(() => expect(f.source.read).toHaveBeenCalledTimes(2));
		finish('body'); await pending;
		expect(f.service.store.getState()).toMatchObject({ status: 'complete', scanned: 2, total: 2, hits: [] });
	} finally { f.service.dispose(); }
});

test('failure or cancellation remains partial and ignores late reads', async () => {
	const f = fixture(vi.fn(async () => { throw new Error('read failed'); }));
	try { await f.service.scan('x', '2026-11-03', '2026-11-04'); expect(f.service.store.getState()).toMatchObject({ status: 'partial', failed: 2 }); } finally { f.service.dispose(); }
	let finish!: (text: string) => void;
	const g = fixture(vi.fn(() => new Promise<string>(resolve => { finish = resolve; })));
	try { const scan = g.service.scan('hit', '2026-11-03', '2026-11-04'); await vi.waitFor(() => expect(g.source.read).toHaveBeenCalledOnce()); g.service.cancel(); finish('hit'); await scan; expect(g.service.store.getState()).toMatchObject({ status: 'partial', hits: [] }); expect(g.source.read).toHaveBeenCalledOnce(); } finally { g.service.dispose(); }
});

test('preview notifications do not invalidate search, while real file changes reject loaded stale text', () => {
	let notify = () => {}, fileChanged = () => {};
	const source = { periodic: { inspect: () => ({ ...entries[0]!, path: 'Root/day.md' }), subscribe: (listener: () => void) => { notify = listener; return () => {}; }, list: async () => entries } as Pick<NavigatorPeriodicService, 'list' | 'inspect' | 'subscribe'>, read: async () => 'body' };
	const service = createDiarySearch(source, listener => { fileChanged = listener; return () => {}; });
	try {
		const revision = service.revision(), loaded = [{ ...entries[0]!, text: 'hit' }];
		service.loaded('hit', loaded, revision); notify();
		expect(service.store.getState().hits).toHaveLength(1); expect(service.revision()).toBe(revision);
		fileChanged(); service.loaded('hit', loaded, revision);
		expect(service.store.getState()).toMatchObject({ status: 'partial', hits: [] });
	} finally { service.dispose(); }
});
