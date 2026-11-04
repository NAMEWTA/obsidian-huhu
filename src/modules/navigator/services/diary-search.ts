import { observeDiaryChanges } from './diary-observer';
import { createStore } from 'zustand/vanilla';
import type { NavigatorPeriodicService } from '../api';
import { diaryDate } from './diary-writing';

export interface DiarySearchEntry { date: string; path: string; text: string }
export interface DiarySearchState { status: 'partial' | 'indexing' | 'complete'; query: string; from: string; to: string; scanned: number; total: number; failed: number; hits: DiarySearchEntry[] }
export function createDiarySearch(source: { periodic: Pick<NavigatorPeriodicService, 'list' | 'inspect' | 'subscribe'>; read(path: string): Promise<string> }, subscribeFiles?: (listener: () => void) => () => void) {
	const store = createStore<DiarySearchState>(() => ({ status: 'partial', query: '', from: '', to: '', scanned: 0, total: 0, failed: 0, hits: [] }));
	let generation = 0, dataRevision = 0;
	const matches = (text: string, query: string) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
	const cancel = () => { generation++; store.setState({ status: 'partial' }); };
	const invalidate = () => { dataRevision++; cancel(); store.setState({ hits: [], scanned: 0, total: 0 }); };
	const detach = observeDiaryChanges(source.periodic, subscribeFiles, invalidate);
	return {
		store,
		revision: () => dataRevision,
		loaded(query: string, loaded: readonly DiarySearchEntry[], expectedRevision = dataRevision) {
			const entries = expectedRevision === dataRevision ? loaded : [];
			cancel();
			const dates = entries.map(entry => entry.date).sort();
			store.setState({ status: 'partial', query, from: dates[0] ?? '', to: dates.at(-1) ?? '', scanned: entries.length, total: entries.length, failed: 0, hits: entries.filter(entry => query.trim() && matches(entry.text, query)) });
		},
		async scan(query: string, from: string, to: string) {
			cancel(); const token = generation;
			store.setState({ status: 'indexing', query, from, to, scanned: 0, total: 0, failed: 0, hits: [] });
			try {
				if (diaryDate(from) > diaryDate(to)) throw new RangeError('Reversed diary range');
				const available = source.periodic.inspect('day', diaryDate(to));
				if (available.status === 'disabled' || available.status === 'unavailable') throw new Error('Unavailable diary');
				const entries = await source.periodic.list('day', diaryDate(from), diaryDate(to));
				if (token !== generation) return;
				store.setState({ total: entries.length });
				for (const entry of entries) {
					if (token !== generation) return;
					try {
						const text = await source.read(entry.path);
						if (token !== generation) return;
						const current = source.periodic.inspect('day', diaryDate(entry.date));
						if (current.path !== entry.path || current.status !== 'existing') throw new Error('Diary identity changed');
						store.setState(state => ({ scanned: state.scanned + 1, hits: matches(text, query) ? [...state.hits, { date: entry.date, path: entry.path, text: text.slice(0, 160) }] : state.hits }));
					} catch { if (token === generation) store.setState(state => ({ failed: state.failed + 1 })); }
				}
				if (token === generation) store.setState(state => ({ status: state.failed ? 'partial' : 'complete' }));
			} catch { if (token === generation) store.setState({ status: 'partial', failed: 1 }); }
		},
		cancel,
		dispose() { cancel(); detach(); },
	};
}
export type DiarySearch = ReturnType<typeof createDiarySearch>;
