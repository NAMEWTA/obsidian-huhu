import { createStore } from 'zustand/vanilla';
import type { Agent, BotClient, BotMethodMap, DeletionPreview, Receipt } from '../../api';
import { CommandAttempt } from './command-attempt';
import { commandMeta } from './workbench-client';
interface DeletionView {
	preview?: DeletionPreview;
	busy?: 'preview' | 'delete';
	error?: 'failed' | 'unknown';
	deleted: boolean;
}
export const agentDeletionBlocked = (preview: DeletionPreview) =>
	preview.categories.some(
		(category) =>
			(['active-runs', 'group-memberships', 'private-memory'].includes(category.kind) && category.count > 0) ||
			category.reason === 'CONTEXT_NOT_ASSEMBLED',
	);
/** Configuration deletion never expands the Runner's dependency checks or purges conversation history. */
export class AgentDeletionClient {
	readonly store = createStore<DeletionView>(() => ({ deleted: false }));
	private reader?: AbortController;
	private generation = 0;
	private disposed = false;
	private closeBinding?: () => void;
	private attempt = new CommandAttempt<BotMethodMap['agents.delete']['params'], Receipt>();
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly agent: Pick<Agent, 'id' | 'enabled' | 'isDefault'>,
	) {}
	async review(): Promise<void> {
		const client = this.client();
		if (!client || this.disposed || this.agent.enabled || this.agent.isDefault || this.attempt.uncertain) return;
		this.reader?.abort();
		const reader = new AbortController(),
			generation = ++this.generation;
		this.reader = reader;
		this.closeBinding?.();
		this.closeBinding = client.onClose?.(() => {
			this.generation++;
			this.reader?.abort();
			if (!this.disposed) this.store.setState({ preview: undefined, busy: undefined, error: 'failed' });
		});
		this.store.setState({ busy: 'preview', error: undefined, preview: undefined });
		try {
			const preview = await client.agents.deletePreview(
				{ profileId: client.hello.profile.profileId, id: this.agent.id },
				{ signal: reader.signal },
			);
			if (!reader.signal.aborted && !this.disposed && generation === this.generation)
				this.store.setState({ preview, busy: undefined });
		} catch {
			if (!reader.signal.aborted && !this.disposed && generation === this.generation)
				this.store.setState({ busy: undefined, error: 'failed' });
		}
	}
	async remove(): Promise<boolean> {
		const client = this.client(),
			state = this.store.getState(),
			preview = state.preview,
			generation = this.generation;
		if (
			!client ||
			this.disposed ||
			client.state === 'closed' ||
			!preview ||
			state.busy ||
			this.agent.enabled ||
			this.agent.isDefault ||
			agentDeletionBlocked(preview)
		)
			return false;
		this.store.setState({ busy: 'delete', error: undefined });
		try {
			await this.attempt.send(
				() => ({
					...commandMeta(client),
					id: this.agent.id,
					previewToken: preview.token,
					expectedRevision: preview.revision,
				}),
				(command) => client.agents.delete(command),
			);
			if (this.disposed || generation !== this.generation) return false;
			this.store.setState({ preview: undefined, busy: undefined, deleted: true });
			return true;
		} catch {
			if (!this.disposed && generation === this.generation)
				this.store.setState({ busy: undefined, error: this.attempt.uncertain ? 'unknown' : 'failed' });
			return false;
		}
	}
	abandon(): void {
		this.attempt.discard();
		this.store.setState({ preview: undefined, error: undefined });
	}
	dispose(): void {
		this.disposed = true;
		this.generation++;
		this.reader?.abort();
		this.closeBinding?.();
	}
}
