import { createStore } from 'zustand/vanilla';
import type { Approval, BotClient, BotMethodMap } from '../../api';
import { BotRpcError } from '../../core/protocol/connection';
import { commandMeta, type WorkbenchClient } from './workbench-client';

interface ApprovalView {
	items: Approval[];
	current?: Approval;
	selectedId?: string;
	cursor?: string;
	loading: boolean;
	error?: 'offline' | 'failed';
}
/** Cached previews and in-flight replies belong to one current authorization generation. */
export class ApprovalClient {
	readonly store = createStore<ApprovalView>(() => ({ items: [], loading: true }));
	private reader?: AbortController;
	private generation = 0;
	private disposed = false;
	private bound?: BotClient;
	private closeBinding?: () => void;
	private permissionBinding?: () => void;
	private commands = new Map<string, BotMethodMap['approvals.resolve']['params']>();
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly workspace?: WorkbenchClient,
	) {}
	private bind(): BotClient | undefined {
		const client = this.client();
		if (this.disposed || !client || client.state === 'closed') {
			this.invalidate('offline');
			return undefined;
		}
		if (this.bound !== client) {
			this.closeBinding?.();
			this.invalidate();
			this.bound = client;
			this.closeBinding = client.onClose(() => this.invalidate('offline'));
		}
		if (this.workspace && !this.permissionBinding) {
			let revision = this.workspace.getSnapshot().permissionRevision;
			this.permissionBinding = this.workspace.subscribe(() => {
				const next = this.workspace!.getSnapshot().permissionRevision;
				if (next !== revision) {
					revision = next;
					this.invalidate('failed');
				}
			});
		}
		return client;
	}
	invalidate(error?: ApprovalView['error']): void {
		this.generation++;
		this.reader?.abort();
		this.commands.clear();
		if (!this.disposed)
			this.store.setState({
				items: [],
				current: undefined,
				selectedId: undefined,
				cursor: undefined,
				loading: false,
				error,
			});
	}
	select(id: string): void {
		this.store.setState({ selectedId: id });
	}
	async load(cursor?: string): Promise<void> {
		await this.read(undefined, cursor);
	}
	async loadId(id: string): Promise<void> {
		await this.read(id);
	}
	private async read(id?: string, cursor?: string): Promise<void> {
		const client = this.bind();
		if (!client) return;
		this.reader?.abort();
		const reader = new AbortController();
		this.reader = reader;
		const generation = this.generation;
		this.store.setState({ loading: true, error: undefined, ...(id ? { current: undefined } : {}) });
		try {
			if (id) {
				const current = await client.approvals.get(
					{ profileId: client.hello.profile.profileId, id },
					{ signal: reader.signal },
				);
				if (!this.valid(client, reader, generation)) return;
				this.store.setState({ current, loading: false });
			} else {
				const page = await client.approvals.list(
					{ profileId: client.hello.profile.profileId, limit: 100, ...(cursor ? { cursor } : {}) },
					{ signal: reader.signal },
				);
				if (!this.valid(client, reader, generation)) return;
				this.store.setState((state) => ({
					items: [
						...new Map(
							[...(cursor ? state.items : []), ...page.items].map((approval) => [approval.id, approval]),
						).values(),
					],
					selectedId: state.selectedId ?? page.items[0]?.id,
					cursor: page.nextCursor,
					loading: false,
				}));
			}
		} catch {
			if (this.valid(client, reader, generation)) {
				this.store.setState({
					items: [],
					current: undefined,
					cursor: undefined,
					loading: false,
					error: 'failed',
				});
			}
		}
	}
	private valid(client: BotClient, reader: AbortController, generation: number): boolean {
		return (
			!this.disposed &&
			!reader.signal.aborted &&
			generation === this.generation &&
			this.bound === client &&
			client.state !== 'closed'
		);
	}
	async resolve(approval: Approval, decision: 'approve' | 'reject'): Promise<Approval | undefined> {
		const client = this.bind();
		if (!client) return undefined;
		const state = this.store.getState(),
			generation = this.generation;
		if (
			![...state.items, ...(state.current ? [state.current] : [])].some(
				(value) => value.id === approval.id && value.revision === approval.revision,
			)
		)
			return undefined;
		const key = `${approval.id}:${approval.revision}:${decision}:${approval.preview.previewHash}`;
		let command = this.commands.get(key);
		if (!command) {
			command = {
				...commandMeta(client),
				id: approval.id,
				effectId: approval.effectId,
				expectedRevision: approval.revision,
				decision,
				previewHash: approval.preview.previewHash,
			};
			this.commands.set(key, command);
		}
		let next: Approval;
		try {
			next = await client.approvals.resolve(command);
		} catch (error) {
			if (error instanceof BotRpcError && error.data.kind === 'CAPABILITY_DENIED') this.invalidate('failed');
			throw error;
		}
		if (this.disposed || generation !== this.generation || client.state === 'closed') return undefined;
		this.commands.delete(key);
		this.store.setState((state) => ({
			items: state.items.map((value) => (value.id === next.id ? next : value)),
			current: state.current?.id === next.id ? next : state.current,
		}));
		return next;
	}
	dispose(): void {
		this.disposed = true;
		this.generation++;
		this.reader?.abort();
		this.closeBinding?.();
		this.permissionBinding?.();
		this.commands.clear();
	}
}
