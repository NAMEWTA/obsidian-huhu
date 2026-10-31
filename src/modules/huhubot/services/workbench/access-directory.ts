import { createStore } from 'zustand/vanilla';
import type { Agent, BotClient, Grant } from '../../api';
type Kind = 'agents' | 'grants';
interface AccessView {
	agents: Agent[];
	grants: Grant[];
	agentCursor?: string;
	grantCursor?: string;
	loading: boolean;
	loaded: boolean;
	moreLoading: Partial<Record<Kind, boolean>>;
	error: boolean;
}
const merge = <T extends { id: string }>(previous: T[], next: T[]) => [
	...new Map([...previous, ...next].map((value) => [value.id, value])).values(),
];
/** Permission and Bot cursors are independent; late pages cannot revive a closed connection. */
export class AccessDirectory {
	readonly store = createStore<AccessView>(() => ({
		agents: [],
		grants: [],
		loading: true,
		loaded: false,
		moreLoading: {},
		error: false,
	}));
	private requests = new Map<string, AbortController>();
	private generation = 0;
	private disposed = false;
	private bound?: BotClient;
	private closeBinding?: () => void;
	constructor(private readonly client: () => BotClient | undefined) {}
	private bind(): BotClient | undefined {
		const client = this.client();
		if (this.disposed || !client || client.state === 'closed') {
			this.clear();
			return undefined;
		}
		if (client !== this.bound) {
			this.closeBinding?.();
			this.clear();
			this.bound = client;
			if (typeof client.onClose === 'function') this.closeBinding = client.onClose(() => this.clear());
		}
		return client;
	}
	clear(): void {
		this.generation++;
		for (const request of this.requests.values()) request.abort();
		this.requests.clear();
		if (!this.disposed)
			this.store.setState({
				agents: [],
				grants: [],
				agentCursor: undefined,
				grantCursor: undefined,
				loading: false,
				loaded: true,
				moreLoading: {},
				error: true,
			});
	}
	accept(grant: Grant): void {
		if (!this.disposed) this.store.setState((state) => ({ grants: merge(state.grants, [grant]) }));
	}
	revoked(id: string): void {
		if (!this.disposed)
			this.store.setState((state) => ({
				grants: state.grants.map((grant) =>
					grant.id === id ? { ...grant, state: 'revoked' as const } : grant,
				),
			}));
	}
	async load(): Promise<void> {
		const client = this.bind();
		if (!client) return;
		this.generation++;
		for (const request of this.requests.values()) request.abort();
		this.requests.clear();
		const generation = this.generation,
			reader = new AbortController();
		this.requests.set('all', reader);
		this.store.setState({ loading: true, error: false, moreLoading: {} });
		try {
			const [grants, agents] = await Promise.all([
				client.grants.list(
					{ profileId: client.hello.profile.profileId, limit: 100 },
					{ signal: reader.signal },
				),
				client.agents.list(
					{ profileId: client.hello.profile.profileId, limit: 100 },
					{ signal: reader.signal },
				),
			]);
			if (!this.valid(reader, generation)) return;
			this.store.setState({
				grants: grants.items,
				agents: agents.items,
				grantCursor: grants.nextCursor,
				agentCursor: agents.nextCursor,
				loading: false,
				loaded: true,
			});
		} catch {
			if (this.valid(reader, generation)) this.store.setState({ loading: false, loaded: true, error: true });
		} finally {
			if (this.requests.get('all') === reader) this.requests.delete('all');
		}
	}
	async loadMore(kind: Kind): Promise<void> {
		const client = this.bind(),
			state = this.store.getState(),
			cursor = kind === 'agents' ? state.agentCursor : state.grantCursor;
		if (!client || !cursor || state.moreLoading[kind] || state.loading) return;
		const reader = new AbortController(),
			generation = this.generation;
		this.requests.set(kind, reader);
		this.store.setState((state) => ({ moreLoading: { ...state.moreLoading, [kind]: true }, error: false }));
		try {
			const query = { profileId: client.hello.profile.profileId, limit: 100, cursor };
			if (kind === 'agents') {
				const page = await client.agents.list(query, { signal: reader.signal });
				if (this.valid(reader, generation))
					this.store.setState((state) => ({
						agents: merge(state.agents, page.items),
						agentCursor: page.nextCursor,
					}));
			} else {
				const page = await client.grants.list(query, { signal: reader.signal });
				if (this.valid(reader, generation))
					this.store.setState((state) => ({
						grants: merge(state.grants, page.items),
						grantCursor: page.nextCursor,
					}));
			}
		} catch {
			if (this.valid(reader, generation)) this.store.setState({ error: true });
		} finally {
			if (this.requests.get(kind) === reader) {
				this.requests.delete(kind);
				if (!this.disposed)
					this.store.setState((state) => ({ moreLoading: { ...state.moreLoading, [kind]: false } }));
			}
		}
	}
	private valid(reader: AbortController, generation: number): boolean {
		return (
			!this.disposed && !reader.signal.aborted && generation === this.generation && this.bound?.state !== 'closed'
		);
	}
	dispose(): void {
		this.disposed = true;
		this.generation++;
		for (const request of this.requests.values()) request.abort();
		this.requests.clear();
		this.closeBinding?.();
	}
}
