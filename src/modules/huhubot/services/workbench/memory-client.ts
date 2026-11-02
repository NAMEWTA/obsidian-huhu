import { createStore } from 'zustand/vanilla';
import type {
	BotClient,
	ExecutionContextView,
	MemoryNamespace,
	MemoryObject,
	MemoryPage,
	MemoryQuery,
	MemoryScope,
} from '../../api';
import { BotRpcError } from '../../core/protocol/connection';
type Kind = MemoryQuery['kind'];
export type ContextScope = Extract<MemoryScope, { id: string }>;
interface MemoryView {
	page?: MemoryPage;
	loading: boolean;
	error: boolean;
	cursors: Partial<Record<Kind, string>>;
	contextLoading: Record<string, boolean>;
	contextLoaded: Record<string, boolean>;
}
const objectKey = (object: MemoryObject) =>
	object.kind === 'item'
		? `item:${object.item.id}`
		: object.kind === 'proposal'
			? `proposal:${object.proposal.id}`
			: object.kind === 'candidate'
				? `candidate:${object.candidate.id}`
				: object.kind === 'job'
					? `job:${object.job.id}`
					: object.kind === 'context'
						? `context:${object.context.runId}`
						: object.kind;
/** Each query generation belongs to one explicit namespace. A late response cannot cross scopes. */
export class MemoryClient {
	readonly store = createStore<MemoryView>(() => ({
		loading: true,
		error: false,
		cursors: {},
		contextLoading: {},
		contextLoaded: {},
	}));
	private reader?: AbortController;
	private disposed = false;
	private namespace?: string;
	private contextScope?: string;
	private generation = 0;
	private contextReaders = new Map<string, AbortController>();
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly onDenied?: () => void,
	) {}
	accept(object: MemoryObject): void {
		if (!this.disposed)
			this.store.setState((state) => ({
				page: state.page && {
					...state.page,
					items: [
						...new Map([...state.page.items, object].map((value) => [objectKey(value), value])).values(),
					],
				},
			}));
	}
	async load(namespace: MemoryNamespace, more?: Kind, scope?: ContextScope, runId?: string): Promise<void> {
		const client = this.client();
		if (!client || client.state === 'closed' || this.disposed) {
			this.store.setState({ loading: false, error: true });
			return;
		}
		const key = JSON.stringify([namespace.kind, namespace.id]);
		const contextScope = namespace.kind !== 'global' && scope?.id ? scope : undefined;
		if (more === 'context' && !contextScope) return;
		const scopeKey = JSON.stringify([contextScope, runId]);
		this.generation++;
		this.abortContextReads();
		if (this.namespace !== key || this.contextScope !== scopeKey) {
			this.namespace = key;
			this.contextScope = scopeKey;
			this.store.setState({ page: undefined, cursors: {}, contextLoaded: {} });
		}
		this.reader?.abort();
		const reader = new AbortController();
		this.reader = reader;
		this.store.setState({ loading: true, error: false });
		const kinds: Kind[] = more
			? [more]
			: namespace.kind === 'global'
				? ['item', 'proposal']
				: ['item', 'candidate', 'job', ...(contextScope && !runId ? ['context' as const] : [])];
		try {
			const [pages, inspected] = await Promise.all([
				Promise.all(
					kinds.map((kind) =>
						client.memory.list(
							{
								profileId: client.hello.profile.profileId,
								namespace,
								kind,
								limit: 50,
								...(kind === 'context' ? { scope: contextScope } : {}),
								...(more && this.store.getState().cursors[kind]
									? { cursor: this.store.getState().cursors[kind] }
									: {}),
							},
							{ signal: reader.signal },
						),
					),
				),
				!more && runId && namespace.kind !== 'global'
					? client.memory.get(
							{
								profileId: client.hello.profile.profileId,
								namespace,
								kind: 'context',
								id: runId,
								limit: 50,
							},
							{ signal: reader.signal },
						)
					: undefined,
			]);
			if (reader.signal.aborted || this.disposed) return;
			if (inspected) {
				if (
					inspected.kind !== 'context' ||
					inspected.context.runId !== runId ||
					inspected.context.namespace.kind !== namespace.kind ||
					inspected.context.namespace.id !== namespace.id
				)
					throw new Error('CONTEXT_CHANGED');
				if (
					inspected.context.state === 'redacted' ||
					inspected.context.entries.some((entry) => entry.state === 'redacted')
				) {
					this.clear();
					this.onDenied?.();
					return;
				}
			}
			const previous = this.store.getState();
			const contextLoaded = more ? { ...previous.contextLoaded } : {};
			if (inspected) contextLoaded[inspected.context.runId] = true;
			const fresh = [...pages.flatMap((page) => page.items), ...(inspected ? [inspected] : [])].map((object) => {
				if (more && object.kind === 'context' && previous.contextLoaded[object.context.runId]) {
					const existing = previous.page?.items.find(
						(value) => value.kind === 'context' && value.context.runId === object.context.runId,
					);
					if (existing?.kind === 'context' && sameContext(existing.context, object.context, false))
						return existing;
					delete contextLoaded[object.context.runId];
				}
				return object;
			});
			const items = [
				...new Map(
					[...(more ? (this.store.getState().page?.items ?? []) : []), ...fresh].map((value) => [
						objectKey(value),
						value,
					]),
				).values(),
			];
			const page = pages[0]!;
			this.store.setState((state) => ({
				page: { ...page, settings: page.settings ?? (more ? state.page?.settings : undefined), items },
				loading: false,
				error: false,
				cursors: {
					...(more ? state.cursors : {}),
					...Object.fromEntries(kinds.map((kind, index) => [kind, pages[index]?.nextCursor])),
				},
				contextLoaded,
			}));
		} catch (error) {
			if (!reader.signal.aborted && !this.disposed) this.store.setState({ loading: false, error: true });
			if (
				error instanceof BotRpcError &&
				error.data.kind === 'CAPABILITY_DENIED' &&
				!reader.signal.aborted &&
				!this.disposed
			) {
				this.clear();
				this.onDenied?.();
			}
		}
	}
	private abortContextReads(): void {
		for (const reader of this.contextReaders.values()) reader.abort();
		this.contextReaders.clear();
		this.store.setState({ contextLoading: {} });
	}
	async loadContext(runId: string): Promise<void> {
		await this.readContext(runId);
	}
	async loadContextMore(runId: string, cursor: string): Promise<void> {
		await this.readContext(runId, cursor);
	}
	private async readContext(runId: string, cursor?: string): Promise<void> {
		const client = this.client(),
			state = this.store.getState();
		const object = state.page?.items.find((value) => value.kind === 'context' && value.context.runId === runId);
		if (
			!client ||
			this.disposed ||
			object?.kind !== 'context' ||
			(cursor !== undefined && object.context.nextCursor !== cursor) ||
			state.contextLoading[runId] ||
			JSON.stringify([object.context.namespace.kind, object.context.namespace.id]) !== this.namespace
		)
			return;
		const previous = object.context,
			namespaceKey = this.namespace,
			namespaceRevision = state.page!.namespaceRevision,
			generation = this.generation;
		const reader = new AbortController();
		this.contextReaders.set(runId, reader);
		this.store.setState((state) => ({ contextLoading: { ...state.contextLoading, [runId]: true }, error: false }));
		try {
			const value = await client.memory.get(
				{
					profileId: client.hello.profile.profileId,
					namespace: previous.namespace,
					kind: 'context',
					id: runId,
					limit: 50,
					...(cursor !== undefined ? { cursor } : {}),
				},
				{ signal: reader.signal },
			);
			if (
				reader.signal.aborted ||
				this.disposed ||
				generation !== this.generation ||
				namespaceKey !== this.namespace ||
				this.store.getState().page?.namespaceRevision !== namespaceRevision
			)
				return;
			if (
				value.kind === 'context' &&
				(value.context.state === 'redacted' ||
					value.context.entries.some((entry) => entry.state === 'redacted'))
			) {
				this.clear();
				this.onDenied?.();
				return;
			}
			if (
				value.kind !== 'context' ||
				!(cursor !== undefined ? sameContext(previous, value.context) : sameRun(previous, value.context)) ||
				(cursor !== undefined && value.context.nextCursor === cursor)
			) {
				this.store.setState({ error: true });
				return;
			}
			const context = {
				...value.context,
				entries: [
					...new Map(
						[...(cursor !== undefined ? previous.entries : []), ...value.context.entries].map((entry) => [
							`${entry.id}:${'partIndex' in entry ? (entry.partIndex ?? 0) : 0}`,
							entry,
						]),
					).values(),
				],
			};
			this.accept({ kind: 'context', context });
			this.store.setState((state) => ({ contextLoaded: { ...state.contextLoaded, [runId]: true } }));
		} catch (error) {
			if (!reader.signal.aborted && !this.disposed && generation === this.generation) {
				this.store.setState({ error: true });
				if (error instanceof BotRpcError && error.data.kind === 'CAPABILITY_DENIED') {
					this.clear();
					this.onDenied?.();
				}
			}
		} finally {
			if (this.contextReaders.get(runId) === reader) {
				this.contextReaders.delete(runId);
				this.store.setState((state) => ({ contextLoading: { ...state.contextLoading, [runId]: false } }));
			}
		}
	}
	clear(): void {
		this.generation++;
		this.abortContextReads();
		this.reader?.abort();
		this.store.setState({ page: undefined, loading: false, error: true, cursors: {}, contextLoaded: {} });
	}
	dispose(): void {
		this.disposed = true;
		this.generation++;
		this.abortContextReads();
		this.reader?.abort();
	}
}

function sameContext(left: ExecutionContextView, right: ExecutionContextView, compareScope = true): boolean {
	return (
		sameRun(left, right) &&
		left.runRevision === right.runRevision &&
		left.state === right.state &&
		(!compareScope || (left.scope.kind === right.scope.kind && left.scope.id === right.scope.id)) &&
		('manifestRevision' in left ? left.manifestRevision : undefined) ===
			('manifestRevision' in right ? right.manifestRevision : undefined)
	);
}

function sameRun(left: ExecutionContextView, right: ExecutionContextView): boolean {
	// A list scope is an authorized filter. The first get supplies the Run's canonical
	// session/work-thread scope and current sealed revision; subsequent parts lock it.
	return (
		left.runId === right.runId &&
		left.namespace.kind === right.namespace.kind &&
		left.namespace.id === right.namespace.id
	);
}
