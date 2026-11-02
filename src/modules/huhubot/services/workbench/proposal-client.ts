import { createStore } from 'zustand/vanilla';
import type { Agent, AgentProposal, BotClient, BotMethodMap } from '../../api';
import { commandMeta, type WorkbenchClient } from './workbench-client';

interface ProposalView {
	items: AgentProposal[];
	cursor?: string;
	loading: boolean;
	working?: string;
	error: boolean;
}

/** A user retries the original confirmation after a lost reply; confirmations never replay on reconnect. */
export class ProposalClient {
	readonly store = createStore<ProposalView>(() => ({ items: [], loading: false, error: false }));
	private reader?: AbortController;
	private disposed = false;
	private generation = 0;
	private runId?: string;
	private confirmations = new Map<string, BotMethodMap['collaboration.confirmProposal']['params']>();
	private rejections = new Map<string, BotMethodMap['collaboration.confirmProposal']['params']>();
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly workspace?: WorkbenchClient,
	) {}
	async load(runId?: string, more = false): Promise<void> {
		const client = this.client();
		if (!client || this.disposed || this.store.getState().working) return;
		this.reader?.abort();
		const reader = new AbortController();
		this.reader = reader;
		if (this.runId !== runId) {
			this.runId = runId;
			more = false;
			this.store.setState({ items: [], cursor: undefined });
		}
		this.store.setState({ loading: true, error: false });
		try {
			const page = await client.collaboration.proposals(
				{
					profileId: client.hello.profile.profileId,
					limit: 50,
					...(runId ? { runId } : {}),
					...(more && this.store.getState().cursor ? { cursor: this.store.getState().cursor } : {}),
				},
				{ signal: reader.signal },
			);
			if (reader.signal.aborted || this.disposed) return;
			this.store.setState((state) => ({
				items: [
					...new Map(
						[...(more ? state.items : []), ...page.items].map((proposal) => [
							proposal.proposalId,
							proposal,
						]),
					).values(),
				],
				cursor: page.nextCursor,
				loading: false,
			}));
		} catch {
			if (!reader.signal.aborted && !this.disposed) this.store.setState({ loading: false, error: true });
		}
	}
	async confirm(proposal: AgentProposal): Promise<Agent | undefined> {
		const client = this.client();
		const generation = this.generation;
		if (!client || this.disposed || this.store.getState().working) return;
		this.reader?.abort();
		const key = `${proposal.proposalId}:${proposal.revision}:${proposal.previewHash}`;
		let command = this.confirmations.get(key);
		if (!command) {
			command = {
				...commandMeta(client),
				proposalId: proposal.proposalId,
				expectedRevision: proposal.revision,
				previewHash: proposal.previewHash,
			};
			this.confirmations.set(key, command);
		}
		this.store.setState({ working: proposal.proposalId, error: false, loading: false });
		try {
			const agent = await client.collaboration.confirmProposal(command);
			if (this.disposed || generation !== this.generation || client.state === 'closed') return undefined;
			this.confirmations.delete(key);
			this.workspace?.acceptAgent(agent);
			if (!this.disposed)
				this.store.setState((state) => ({
					items: state.items.filter((value) => value.proposalId !== proposal.proposalId),
				}));
			return agent;
		} catch {
			if (!this.disposed && generation === this.generation) this.store.setState({ error: true });
		} finally {
			if (!this.disposed && generation === this.generation) this.store.setState({ working: undefined });
		}
		return undefined;
	}
	async reject(proposal: AgentProposal): Promise<void> {
		const client = this.client();
		const generation = this.generation;
		if (!client || this.disposed || this.store.getState().working) return;
		this.reader?.abort();
		const key = `${proposal.proposalId}:${proposal.revision}:${proposal.previewHash}`;
		let command = this.rejections.get(key);
		if (!command) {
			command = {
				...commandMeta(client),
				proposalId: proposal.proposalId,
				expectedRevision: proposal.revision,
				previewHash: proposal.previewHash,
			};
			this.rejections.set(key, command);
		}
		this.store.setState({ working: proposal.proposalId, error: false, loading: false });
		try {
			await client.collaboration.rejectProposal(command);
			if (this.disposed || generation !== this.generation || client.state === 'closed') return;
			this.rejections.delete(key);
			if (!this.disposed)
				this.store.setState((state) => ({
					items: state.items.filter((value) => value.proposalId !== proposal.proposalId),
				}));
		} catch {
			if (!this.disposed && generation === this.generation) this.store.setState({ error: true });
		} finally {
			if (!this.disposed && generation === this.generation) this.store.setState({ working: undefined });
		}
	}
	clear(): void {
		this.generation++;
		this.reader?.abort();
		this.store.setState({ items: [], cursor: undefined, loading: false, error: false, working: undefined });
	}
	dispose(): void {
		this.generation++;
		this.disposed = true;
		this.reader?.abort();
		this.confirmations.clear();
		this.rejections.clear();
	}
}
