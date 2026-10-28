import { createStore } from 'zustand/vanilla';
import { JsonStore } from '../../../shared/json-store';
import type { TextStorage } from '../../../shared/storage/ports';
import { emptyWorkspace, type WorkspaceState } from '../core/workspace/model';
import { normalizeWorkspace } from '../core/workspace/ops';
import { materializePaneIdentities, paneLeafCount, assertPaneCapacity, PaneCommandError } from '../core/workspace/pane-identity';
import type { SpaceService } from './spaces/space-service';
import { mergeLayoutEdits } from './spaces/layout-merge';
import { SpaceError } from '../core/space/errors';
import { t } from '../../../shared/i18n';

export interface WorkspaceLayoutSnapshot {
	readonly spaceId?: string;
	readonly view: WorkspaceState;
	readonly baseline: WorkspaceState;
	readonly revision: number;
	readonly cached: boolean;
	readonly dirty: boolean;
	readonly pending: boolean;
	readonly conflict?: Error;
}
export interface WorkspaceLayoutEditContext {
	readonly signal?: AbortSignal;
	/** Original absolute performance.now() deadline; admission queues never reset it. */
	readonly deadline?: number;
	/** Synchronous final admission: original Pane, Session/runtime and scope still match. */
	readonly validate?: () => void;
}
export interface WorkspaceLayoutEditResult {
	readonly effect: 'none' | 'partial' | 'unknown' | 'completed';
	readonly layoutPublished: boolean;
	readonly persisted: boolean;
	readonly revision: number;
	readonly error?: unknown;
}
export type WorkspaceStore = ReturnType<typeof createWorkspaceStore> & {
	/** Pure snapshot; an uncached Space is never adopted into the draft map. */
	readLayout?(spaceId?: string): Promise<WorkspaceLayoutSnapshot>;
	/** Same pure projection after readiness, allowing exact capture before an admission await. */
	readLayoutNow?(spaceId?: string): WorkspaceLayoutSnapshot;
	editLayout?(spaceId: string | undefined, transform: (view: WorkspaceState) => WorkspaceState, context?: WorkspaceLayoutEditContext): Promise<WorkspaceLayoutEditResult>;
	/** Existing synchronous GUI admission; save remains owned/debounced by this store. */
	updateLayout?(transform: (view: WorkspaceState) => WorkspaceState): void;
	/** Read-only early admission; actual candidate publication always rechecks in this owner. */
	assertPaneCapacity?(additional: number): void;
	/** Recovery protocol: refuse every layout edit (BUSY) from now on; nothing is accepted-then-lost. */
	holdEdits?(): void;
	resumeEdits?(): void;
	/** Strict drain of queued edits and dirty drafts; rejects when any save failed or a conflict is open. */
	drainEdits?(): Promise<void>;
	/** After the Space records were reloaded from disk: drop every cached draft/baseline and re-derive from them. */
	reloadFromSpaces?(): void;
};
/** The v1 `workspace.json` writer was retired by the legacy import; writing it again would fork the layout. */
export class LegacyWriterRefused extends Error {
	constructor(readonly marker: string) {
		super('legacy-writer-refused');
		this.name = 'LegacyWriterRefused';
	}
}
export function createWorkspaceStore(
	adapter: TextStorage,
	device: string,
	clock: Pick<Window, 'setTimeout' | 'clearTimeout'>,
	report: (error: unknown) => void,
) {
	const store = createStore<WorkspaceState>(() => emptyWorkspace());
	const disk = new JsonStore<WorkspaceState>(
		adapter,
		`.huhu/terminal-agent/${device}/workspace.json`,
		(v): v is WorkspaceState => !!v && typeof v === 'object' && (v as { version?: unknown }).version === 1,
	);
	let timer: number | undefined,
		disposed = false,
		loaded = false,
		dirty = false,
		refused = false;
	let baseline = emptyWorkspace(),
		pending = Promise.resolve();
	const marker = `.huhu/terminal-agent/${device}/legacy-import.json`;
	const flush = (): Promise<void> => {
		if (timer !== undefined) clock.clearTimeout(timer);
		timer = undefined;
		pending = pending.then(async () => {
			if (!loaded || !dirty) return;
			dirty = false;
			const snapshot = store.getState();
			try {
				// Cutover may happen while this writer is open: re-check before every write, fail visibly, write nothing.
				if (refused || (await adapter.exists(marker))) {
					refused = true;
					throw new LegacyWriterRefused(marker);
				}
				const merged = await disk.commit({ base: baseline, value: snapshot });
				baseline = merged;
				// Reconcile external changes only when no newer local edit would be lost.
				if (store.getState() === snapshot && JSON.stringify(merged) !== JSON.stringify(snapshot))
					store.setState(merged, true);
			} catch (error) {
				dirty = true;
				report(error);
			}
		});
		return pending;
	};
	const ready = adapter
		.exists(marker)
		.then((cutover) => {
			if (!cutover) return disk.load(emptyWorkspace());
			refused = true;
			throw new LegacyWriterRefused(marker);
		})
		.then((value) => {
			baseline = value;
			if (disposed) return;
			store.setState(normalizeWorkspace(value), true);
			loaded = true;
		})
		.catch(report);
	const unsubscribe = store.subscribe(() => {
		if (!loaded || disposed) return;
		dirty = true;
		if (timer !== undefined) clock.clearTimeout(timer);
		timer = clock.setTimeout(() => {
			timer = undefined;
			void flush();
		}, 500);
	});
	return {
		store,
		ready,
		flush,
		async dispose() {
			disposed = true;
			unsubscribe();
			await ready;
			await flush();
		},
	};
}

/** New workbench layouts never flow through the retained v1 writer. */
export function createSpaceWorkspaceStore(
	spaces: SpaceService,
	clock: Pick<Window, 'setTimeout' | 'clearTimeout'>,
	report: (error: unknown) => void,
): WorkspaceStore {
	const store = createStore<WorkspaceState>(() => emptyWorkspace());
	type Draft = {
		base: WorkspaceState;
		view: WorkspaceState;
		dirty: boolean;
		pending?: Promise<void>;
		conflict?: Error;
		remote?: WorkspaceState;
	};
	const drafts = new Map<string | undefined, Draft>();
	const edits = new Map<string | undefined, Promise<void>>();
	let selected: string | undefined, loaded = false, applying = false, disposed = false, held = false;
	const busy = () => new SpaceError('SOURCE_UNAVAILABLE', 'recovery-busy');
	let revision = 0;
	let timer: number | undefined;
	const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
	const identityScope = (key: string | undefined) => key === undefined
		? { kind: 'shared' as const } : { kind: 'space' as const, spaceId: key };
	const persisted = (key: string | undefined) => {
		const records = spaces.store.getState().records;
		return key ? records.layouts[key] ?? emptyWorkspace() : records.sharedLayout;
	};
	const checkPaneCapacity = (additional: number, candidate?: { key: string | undefined; view: WorkspaceState }) => {
		if (disposed || !loaded) throw new SpaceError('CAPABILITY_UNAVAILABLE', 'layout-not-ready');
		try {
			const records = spaces.store.getState().records, owners = Object.values(records.spaces);
			if (owners.length > 1000) throw new Error('Pane Space scan capacity');
			const views = function* () {
				for (const key of [undefined, ...owners.filter(space => !space.archived).map(space => space.id)])
					yield candidate && candidate.key === key ? candidate.view : drafts.get(key)?.view ?? normalizeWorkspace(persisted(key));
			};
			assertPaneCapacity(views(), additional);
		} catch (cause) {
			const error = new PaneCommandError('CAPACITY_EXCEEDED', 'pane-scan-capacity', { cause });
			error.message = t('agent.control.capacity');
			throw error;
		}
	};
	const admitLayout = (key: string | undefined, before: WorkspaceState, candidate: WorkspaceState) => {
		// No added leaves means no new capacity admission: keep close/reduction and old-graph recovery available.
		if (paneLeafCount(candidate) > paneLeafCount(before)) checkPaneCapacity(0, { key, view: candidate });
	};
	const apply = (key: string | undefined, draft: Draft) => {
		if (disposed || selected !== key || equal(store.getState(), draft.view)) return;
		applying = true;
		try { store.setState(draft.view, true); } finally { applying = false; }
	};
	const failure = (cause: unknown) => cause instanceof SpaceError ? cause : new SpaceError('PERSISTENCE_FAILED', 'commit-failed', {}, cause);
	const reconcile = (key: string | undefined, draft: Draft, remote: WorkspaceState) => {
		if (equal(remote, draft.base)) return;
		// 在途通知可能是自己的提交回执，必须等提交结算后以 submitted value 区分更晚的本地编辑。
		if (draft.pending) { draft.remote = remote; return; }
		try {
			const next = mergeLayoutEdits(draft.base, draft.view, remote);
			if (!equal(next, draft.view)) revision++;
			draft.view = next;
			draft.base = remote;
			draft.remote = undefined;
			draft.conflict = undefined;
			apply(key, draft);
		} catch (cause) {
			draft.remote = remote;
			draft.conflict = failure(cause);
			report(draft.conflict);
		}
	};
	const save = (key: string | undefined, draft: Draft, confirmed?: () => void): Promise<void> => {
		if (draft.pending) return draft.pending;
		if (draft.remote) reconcile(key, draft, draft.remote);
		if (draft.conflict) return Promise.reject(draft.conflict);
		if (!draft.dirty) return Promise.resolve();
		const edit = structuredClone({ base: draft.base, value: draft.view });
		draft.dirty = false;
		const operation = spaces.saveLayout(key, edit).then(() => {
			confirmed?.();
			const remote = persisted(key);
			const next = mergeLayoutEdits(edit.value, draft.view, remote, true);
			if (!equal(next, draft.view)) revision++;
			draft.view = next;
			draft.base = remote;
			draft.remote = undefined;
			draft.conflict = undefined;
		}).catch((cause: unknown) => {
			draft.dirty = true;
			const remote = persisted(key);
			try {
				const next = mergeLayoutEdits(edit.base, draft.view, remote);
				if (!equal(next, draft.view)) revision++;
				draft.view = next;
				draft.base = remote;
			} catch (conflict) {
				draft.remote = remote;
				draft.conflict = failure(conflict);
			}
			throw draft.conflict ?? failure(cause);
		}).finally(() => {
			draft.pending = undefined;
			if (draft.remote) reconcile(key, draft, draft.remote);
			apply(key, draft);
		});
		draft.pending = operation;
		void operation.catch(report);
		return operation;
	};
	const flush = async (): Promise<void> => {
		if (timer !== undefined) clock.clearTimeout(timer);
		timer = undefined;
		while (loaded) {
			const work = [...drafts].filter(([, draft]) => draft.dirty || !!draft.pending || !!draft.conflict);
			if (!work.length) return;
			await Promise.all(work.map(([key, draft]) => save(key, draft)));
		}
	};
	const adopt = () => {
		const next = spaces.store.getState().records.selectedSpaceId;
		if (!loaded || selected !== next) revision++;
		if (loaded && selected !== next) {
			const previous = drafts.get(selected);
			if (previous?.dirty) void save(selected, previous).catch(report);
		}
		for (const [key, draft] of drafts) reconcile(key, draft, persisted(key));
		selected = next;
		let draft = drafts.get(selected);
		if (!draft) {
			const base = persisted(selected);
			// 仅首次恢复这个 Space 时规范化磁盘布局；同 ID 通知不能重置运行中的派生状态。
			draft = { base, view: normalizeWorkspace(base), dirty: false };
			drafts.set(selected, draft);
		}
		loaded = true;
		apply(selected, draft);
	};
	const ready = spaces.ready.then(() => { if (!disposed) adopt(); });
	void ready.catch(report);
	const offSpaces = spaces.store.subscribe(() => { if (loaded && !disposed) adopt(); });
	const off = store.subscribe(() => {
		if (!loaded || applying || disposed) return;
		const draft = drafts.get(selected)!;
		if (equal(draft.view, store.getState())) return;
		if (held) {
			// A direct edit during recovery is undone and reported; it never becomes a stale draft.
			apply(selected, { ...draft, view: draft.view });
			report(busy());
			return;
		}
		revision++;
		draft.view = store.getState();
		draft.dirty = true;
		if (timer !== undefined) clock.clearTimeout(timer);
		timer = clock.setTimeout(() => { timer = undefined; void flush().catch(report); }, 500);
	});
	const readLayoutNow = (spaceId?: string): WorkspaceLayoutSnapshot => {
		if (disposed || !loaded) throw new SpaceError('CAPABILITY_UNAVAILABLE', 'layout-not-ready');
		const draft = drafts.get(spaceId), base = draft?.base ?? persisted(spaceId);
		return {
			spaceId, revision, cached: !!draft, dirty: draft?.dirty ?? false,
			pending: !!draft?.pending, conflict: draft?.conflict,
			baseline: structuredClone(base), view: structuredClone(draft?.view ?? normalizeWorkspace(base)),
		};
	};
	const editLayout = (
		key: string | undefined,
		transform: (view: WorkspaceState) => WorkspaceState,
		context: WorkspaceLayoutEditContext = {},
	): Promise<WorkspaceLayoutEditResult> => {
		const captured = { ...context };
		const state = { layoutPublished: false, persisted: false, saving: false };
		const result = (effect: WorkspaceLayoutEditResult['effect'], error?: unknown): WorkspaceLayoutEditResult =>
			({ effect, layoutPublished: state.layoutPublished, persisted: state.persisted, revision, ...(error === undefined ? {} : { error }) });
		const interrupted = () => captured.signal?.aborted
			? new SpaceError('WAIT_CANCELLED', 'layout-cancelled', {}, captured.signal.reason)
			: captured.deadline !== undefined && performance.now() >= captured.deadline
				? new SpaceError('WAIT_TIMEOUT', 'layout-timeout') : undefined;
		const check = (admission = true) => {
			const error = interrupted();
			if (error) throw error;
			if (disposed) throw new SpaceError('CAPABILITY_UNAVAILABLE', 'module-off');
			if (held) throw busy();
			if (captured.deadline !== undefined && !Number.isFinite(captured.deadline))
				throw new SpaceError('INVALID_ARGUMENT', 'invalid-deadline');
			if (admission) captured.validate?.();
		};
		const work = (edits.get(key) ?? Promise.resolve()).then(async () => {
			try {
				await ready;
				check();
				let draft = drafts.get(key);
				if (draft?.pending) { try { await draft.pending; } catch { /* The original draft retains its failed save and conflict. */ } }
				check();
				if (!draft) {
					const base = persisted(key);
					draft = { base, view: normalizeWorkspace(base), dirty: false };
					drafts.set(key, draft);
				}
				if (draft.remote) reconcile(key, draft, draft.remote);
				if (draft.conflict) throw draft.conflict;
				check();
				const before = materializePaneIdentities(draft.view, identityScope(key), draft.base);
				const transformed = transform(structuredClone(before));
				check();
				if (equal(transformed, before)) return result('none');
				const candidate = materializePaneIdentities(transformed, identityScope(key), draft.base, undefined, before);
				admitLayout(key, draft.view, candidate);
				if (!equal(candidate, draft.view)) {
					draft.view = candidate;
					draft.dirty = true;
					revision++;
					state.layoutPublished = true;
					apply(key, draft);
				}
				check(false);
				if (!draft.dirty) return result('none');
				state.saving = true;
				await save(key, draft, () => { state.persisted = true; });
				return result('completed');
			} catch (error) {
				return result(state.persisted ? 'partial' : state.saving ? 'unknown' : state.layoutPublished ? 'partial' : 'none', error);
			}
		});
		const tail = work.then(() => {});
		edits.set(key, tail);
		void tail.finally(() => { if (edits.get(key) === tail) edits.delete(key); });
		return new Promise(resolve => {
			let finished = false, timer: number | undefined;
			const finish = (value: WorkspaceLayoutEditResult) => {
				if (finished) return;
				finished = true;
				captured.signal?.removeEventListener('abort', stop);
				if (timer !== undefined) clock.clearTimeout(timer);
				resolve(value);
			};
			const stop = () => {
				const error = interrupted();
				if (error) finish(result(state.persisted ? 'partial' : state.saving ? 'unknown' : state.layoutPublished ? 'partial' : 'none', error));
			};
			captured.signal?.addEventListener('abort', stop, { once: true });
			if (captured.deadline !== undefined && Number.isFinite(captured.deadline))
				timer = clock.setTimeout(stop, Math.max(0, captured.deadline - performance.now()));
			void work.then(finish);
			stop();
		});
	};
	return {
		store, ready, flush, editLayout, readLayoutNow, assertPaneCapacity: checkPaneCapacity,
		updateLayout(transform) {
			if (disposed || !loaded) return;
			if (held) return void report(busy());
			const draft = drafts.get(selected)!;
			const before = materializePaneIdentities(draft.view, identityScope(selected), draft.base);
			const transformed = transform(before);
			if (equal(transformed, before)) return;
			const candidate = materializePaneIdentities(transformed, identityScope(selected), draft.base, undefined, before);
			admitLayout(selected, draft.view, candidate);
			store.setState(candidate, true);
		},
		async readLayout(spaceId) {
			await ready;
			return readLayoutNow(spaceId);
		},
		holdEdits() {
			held = true;
		},
		resumeEdits() {
			held = false;
		},
		async drainEdits() {
			await ready;
			do await Promise.all([...edits.values()]);
			while (edits.size);
			await flush();
		},
		reloadFromSpaces() {
			if (timer !== undefined) clock.clearTimeout(timer);
			timer = undefined;
			drafts.clear();
			revision++;
			if (loaded && !disposed) adopt();
		},
		async dispose() {
			disposed = true;
			off();
			offSpaces();
			try { await ready; await Promise.all([...edits.values()]); await flush(); } finally { await spaces.dispose(); }
		},
	};
}
