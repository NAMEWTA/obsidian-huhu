import { createStore } from 'zustand/vanilla';
import { t } from '../../../shared/i18n';
import { transcriptDetails, type HistoryDetails } from '../core/history/details';
import { sameHistorySource, HistorySourceChangedError } from '../platform/history/source-identity';
import type { NativeHistory, HistoryMetadata } from '../platform/history/service';
import type { HistoryFence, NativeSessionSummary } from '../platform/desktop/server/agent-data-client';
export type HistoryRow = NativeSessionSummary &
	HistoryDetails & {
		kind?: 'agent' | 'shell';
		metadata: HistoryMetadata;
		inVault: boolean;
		/** Legacy consumers may construct a row before the first lazy-preview state is assigned. */
		previewState?: 'idle' | 'loading' | 'ready' | 'unavailable';
		readError?: string;
		/** The returned body is an incomplete prefix, so its last turn is not the latest native turn. */
		previewPartial?: boolean;
	};
export interface TerminalHistoryMetadata {
	readonly sessionId: string;
	readonly spaceId: string;
	readonly title: string;
	readonly cwd: string;
	readonly createdAt: number;
	readonly archived?: boolean;
}
export class HistoryStore {
	readonly store = createStore<{ rows: HistoryRow[]; terminalRows: HistoryRow[]; loading: boolean; error: string; warnings: string[] }>(() => ({
		rows: [],
		terminalRows: [],
		loading: false,
		error: '',
		warnings: [],
	}));
	private pending?: Promise<void>;
	private abort = new AbortController();
	private generation = 0;
	private previewing = new Map<string, Promise<void>>();
	constructor(
		private history: () => NativeHistory,
		readonly vault: () => string,
		private readonly scope: 'vault' = 'vault',
		private readonly bindOwner?: (
			rows: readonly NativeSessionSummary[],
		) => Promise<string[] | void> | string[] | void,
		private readonly terminals: () => readonly TerminalHistoryMetadata[] = () => [],
	) {}
	private terminalRows(): HistoryRow[] {
		return this.terminals().map((session) => ({
			key: `shell:${session.sessionId}`, kind: 'shell', agentId: 'shell', accountKey: '', sessionId: session.sessionId,
			spaceId: session.spaceId, title: session.title, cwd: session.cwd, transcriptPath: '', modifiedAtMs: session.createdAt,
			usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false },
			...transcriptDetails(''), createdAt: session.createdAt, metadata: { archived: session.archived }, inVault: true, previewState: 'unavailable',
		}));
	}
	refresh(scan = true): Promise<void> {
		if (this.abort.signal.aborted) return Promise.resolve();
		this.store.setState({ terminalRows: this.terminalRows() });
		if (this.pending) return this.pending;
		this.store.setState({ loading: true, error: '' });
		const generation = ++this.generation;
		this.pending = (async () => {
			try {
				const history = this.history(),
					signal = this.abort.signal;
				const warnings = scan || !history.hasScanned || history.stale ? await history.scan(signal) : [];
				const rows: NativeSessionSummary[] = [];
				let fence: HistoryFence | undefined;
				for (let offset = 0; ;) {
					const page = await history.query('', offset, signal, 'all', this.scope, fence);
					fence ??= { revision: page.revision };
					rows.push(...page.rows);
					if (!page.rows.length || rows.length >= page.total) break;
					offset += page.rows.length;
				}
				// The vault projection is native-admitted (vault cwd or HUHU-owned); every listed row belongs to it.
				const previous = new Map(this.store.getState().rows.map((row) => [row.key, row]));
				// Listing is metadata-only. A row already previewed keeps its state while its source is unchanged.
				const enriched: HistoryRow[] = rows.map((row): HistoryRow => {
					const kept = previous.get(row.key);
					if (kept && !sameHistorySource(kept, row)) return {
						...kept, sourceStatus: 'changed', sourceReason: t('agent.historyUI.source.changed'),
						previewState: 'unavailable', readError: t('agent.historyUI.source.changed'),
						firstPrompt: '', turns: [], previewPartial: undefined,
					};
					const reuse =
						kept &&
						kept.previewState !== 'idle' &&
						kept.previewState !== 'loading' &&
						kept.modifiedAtMs === row.modifiedAtMs &&
						kept.sourceStatus === row.sourceStatus;
					return {
						...row,
						...(reuse
							? {
									model: kept.model,
									createdAt: kept.createdAt,
									firstPrompt: kept.firstPrompt,
									turns: kept.turns,
									messageCount: kept.messageCount,
									previewPartial: kept.previewPartial,
								}
							: {
									...transcriptDetails(''),
									model: row.model || null,
									createdAt: row.createdAtMs || null,
									messageCount: row.messageCount ?? 0,
								}),
						inVault: true,
						metadata: history.meta(row.key),
						previewState: reuse ? kept.previewState : 'idle',
						...(reuse && kept.readError ? { readError: kept.readError } : {}),
					};
				});
				// Binding is best effort: a row that cannot be attributed stays unassigned, the refresh still succeeds.
				try {
					const skipped = (await this.bindOwner?.(rows)) ?? [];
					if (skipped.length)
						warnings.push(...[...new Set(skipped)].map((reason) => `history-owner:${reason}`));
				} catch (error) {
					warnings.push(`history-owner:${error instanceof Error ? error.message : String(error)}`);
				}
				if (!signal.aborted && generation === this.generation)
					this.store.setState({ rows: enriched, error: '', warnings });
			} catch (error) {
				if (!this.abort.signal.aborted && generation === this.generation)
					this.store.setState({ error: String(error) });
			} finally {
				if (!this.abort.signal.aborted && generation === this.generation)
					this.store.setState({ loading: false });
				this.pending = undefined;
			}
		})();
		return this.pending;
	}
	/** Read one admitted transcript for a user-requested, read-only preview. */
	preview(key: string): Promise<void> {
		if (this.abort.signal.aborted) return Promise.resolve();
		const existing = this.previewing.get(key);
		if (existing) return existing;
		const row = this.store.getState().rows.find((item) => item.key === key);
		if (!row || row.kind === 'shell' || row.previewState === 'ready') return Promise.resolve();
		// A metadata-only row (source missing/changed/denied) has no body to read; keep its annotations and show the status.
		if (row.sourceStatus && row.sourceStatus !== 'available') {
			const readError = t(`agent.historyUI.source.${row.sourceStatus}`);
			this.store.setState((state) => ({
				rows: state.rows.map((item) =>
					item.key === key ? { ...item, previewState: 'unavailable' as const, readError } : item,
				),
			}));
			return Promise.resolve();
		}
		this.store.setState((state) => ({
			rows: state.rows.map((item) => (item.key === key ? { ...item, previewState: 'loading' as const } : item)),
		}));
		const generation = this.generation;
		const pending = (async () => {
			try {
				const history = this.history();
				const full = await history.read(row, this.abort.signal);
				if (!sameHistorySource(row, full)) throw new HistorySourceChangedError();
				// The helper re-verifies the source at read time; a non-available result carries no body to show.
				if (full.sourceStatus && full.sourceStatus !== 'available') {
					if (generation === this.generation && !this.abort.signal.aborted)
						this.store.setState((state) => ({
							rows: state.rows.map((item) =>
								item.key === key
									? {
											...item,
											sourceStatus: full.sourceStatus,
											sourceReason: full.sourceReason,
											previewState: 'unavailable' as const,
											readError: t(`agent.historyUI.source.${full.sourceStatus!}`),
										}
									: item,
							),
						}));
					return;
				}
				// Details come from the verified native text, never from a second read of the file.
				const details = transcriptDetails(full.text);
				if (generation === this.generation && !this.abort.signal.aborted)
					this.store.setState((state) => ({
						rows: state.rows.map((item) =>
							item.key === key
								? {
										...item,
										...details,
										// The Markdown body carries neither model nor creation time, and a truncated
										// body undercounts messages: keep the scan-time native values in those cases.
										model: details.model ?? item.model,
										createdAt: details.createdAt ?? item.createdAt,
										messageCount: full.usage?.partial ? item.messageCount : details.messageCount,
										previewState: 'ready' as const,
										previewPartial: !!full.usage?.partial,
										readError: undefined,
									}
								: item,
						),
					}));
			} catch (error) {
				if (!this.abort.signal.aborted && generation === this.generation)
					this.store.setState((state) => ({
						rows: state.rows.map((item) =>
							item.key === key
								? { ...item, previewState: 'unavailable' as const, readError: String(error), ...(error instanceof HistorySourceChangedError ? { sourceStatus: 'changed' as const, sourceReason: error.message, firstPrompt: '', turns: [], previewPartial: undefined } : {}) }
								: item,
						),
					}));
			} finally {
				this.previewing.delete(key);
			}
		})();
		this.previewing.set(key, pending);
		return pending;
	}
	async annotate(key: string, patch: HistoryMetadata) {
		await this.history().update(key, patch);
		this.store.setState((s) => ({
			rows: s.rows.map((row) => (row.key === key ? { ...row, metadata: { ...row.metadata, ...patch } } : row)),
		}));
	}
	dispose() {
		this.generation++;
		this.previewing.clear();
		this.abort.abort();
	}
}
