import { createStore } from 'zustand/vanilla';
import type {
	Agent,
	ArtifactRef,
	BotClient,
	BotMethodMap,
	ServiceStatus,
	DeletionPreview,
	MemoryItem,
	MemoryNamespace,
	PortablePreview,
	Session,
} from '../../api';
import { commandMeta, type WorkbenchClient } from './workbench-client';
import { isDefiniteRejection } from './command-attempt';
import { BotRpcError } from '../../core/protocol/connection';
interface DataView {
	agents: Agent[];
	sessions: Session[];
	memories: MemoryItem[];
	preview?: DeletionPreview;
	cleanup?: ServiceStatus['cleanup'];
	sessionCleanup?: Array<{ id: string; preview: DeletionPreview }>;
	artifact?: ArtifactRef;
	importPreview?: PortablePreview;
	importUncertain?: boolean;
	busy?: string;
	error?: string;
	receipt?: string;
	agentCursor?: string;
	sessionCursor?: string;
	memoryCursor?: string;
	memoryNamespace?: MemoryNamespace;
}
/** Only explicit selection crosses portable.export; package contents never enter a component or settings. */
export class DataClient {
	readonly store = createStore<DataView>(() => ({ agents: [], sessions: [], memories: [] }));
	private reader?: AbortController;
	private disposed = false;
	private generation = 0;
	private unsubscribe?: () => void;
	private bound?: BotClient;
	private closeBinding?: () => void;
	private importCommand?: BotMethodMap['portable.import']['params'];
	private deletionCommand?: BotMethodMap['profile.delete']['params'];
	private readonly sessionCommands = new Map<string, BotMethodMap['sessions.delete']['params']>();
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly workspace?: WorkbenchClient,
	) {
		let revision = workspace?.getSnapshot().permissionRevision;
		this.unsubscribe = workspace?.subscribe(() => {
			const next = workspace.getSnapshot().permissionRevision;
			if (next === revision) return;
			revision = next;
			this.invalidate('DATA_READ_FAILED');
		});
	}
	private invalidate(error: string): void {
		this.generation++;
		this.reader?.abort();
		const busy = this.store.getState().busy;
		this.store.setState({
			agents: [],
			sessions: [],
			memories: [],
			artifact: undefined,
			importPreview: undefined,
			preview: undefined,
			error,
			busy: busy === 'preview' || busy === 'directory' || busy === 'memories' ? undefined : busy,
		});
	}
	private bind(): BotClient | undefined {
		const client = this.client();
		if (this.disposed) return undefined;
		if (!client || client.state === 'closed') {
			this.invalidate('HOST_UNAVAILABLE');
			return undefined;
		}
		if (client !== this.bound) {
			this.closeBinding?.();
			if (this.bound && this.bound.hello.profile.profileId !== client.hello.profile.profileId) {
				this.importCommand = undefined;
				this.deletionCommand = undefined;
				this.sessionCommands.clear();
				this.store.setState({
					importUncertain: false,
					cleanup: undefined,
					sessionCleanup: undefined,
					receipt: undefined,
				});
			}
			if (this.bound) this.invalidate('DATA_READ_FAILED');
			this.bound = client;
			this.closeBinding = client.onClose(() => {
				if (this.bound !== client || this.disposed) return;
				this.invalidate('HOST_UNAVAILABLE');
				this.workspace?.permissionsChanged();
			});
		}
		return client;
	}
	async initialize(): Promise<void> {
		const client = this.bind();
		if (!client) {
			this.store.setState({ error: 'HOST_UNAVAILABLE' });
			return;
		}
		this.reader?.abort();
		const reader = new AbortController();
		this.reader = reader;
		this.store.setState({ busy: 'preview', error: undefined });
		try {
			const status = await client.service.status({}, { signal: reader.signal });
			if (reader.signal.aborted || this.disposed) return;
			if (status.cleanup?.profile || status.cleanup?.sessionIds.length) {
				const preview = status.cleanup.profile
					? await client.profile.deletePreview(
							{ profileId: client.hello.profile.profileId },
							{ signal: reader.signal },
						)
					: undefined;
				const sessionCleanup = await Promise.all(
					status.cleanup.sessionIds.map(async (id) => ({
						id,
						preview: await client.sessions.deletePreview(
							{ profileId: client.hello.profile.profileId, id },
							{ signal: reader.signal },
						),
					})),
				);
				if (!reader.signal.aborted && !this.disposed)
					this.store.setState({
						cleanup: status.cleanup,
						preview,
						sessionCleanup,
						agents: [],
						sessions: [],
						memories: [],
						artifact: undefined,
						importPreview: undefined,
						busy: undefined,
						agentCursor: undefined,
						sessionCursor: undefined,
						memoryCursor: undefined,
					});
				return;
			}
			const [agents, sessions, preview] = await Promise.all([
				client.agents.list(
					{ profileId: client.hello.profile.profileId, limit: 100 },
					{ signal: reader.signal },
				),
				client.sessions.list(
					{ profileId: client.hello.profile.profileId, limit: 100 },
					{ signal: reader.signal },
				),
				client.profile.deletePreview({ profileId: client.hello.profile.profileId }, { signal: reader.signal }),
			]);
			const memoryNamespace: MemoryNamespace = { kind: 'global', id: client.hello.profile.profileId };
			const memoryPage = await client.memory.list(
				{ profileId: client.hello.profile.profileId, namespace: memoryNamespace, kind: 'item', limit: 50 },
				{ signal: reader.signal },
			);
			if (!reader.signal.aborted && !this.disposed)
				this.store.setState({
					agents: agents.items,
					sessions: sessions.items,
					memories: memoryPage.items.flatMap((object) => (object.kind === 'item' ? [object.item] : [])),
					preview,
					cleanup: undefined,
					sessionCleanup: undefined,
					busy: undefined,
					agentCursor: agents.nextCursor,
					sessionCursor: sessions.nextCursor,
					memoryNamespace,
					memoryCursor: memoryPage.nextCursor,
				});
		} catch {
			if (!reader.signal.aborted && !this.disposed)
				this.store.setState({ busy: undefined, error: 'DATA_READ_FAILED' });
		}
	}
	async loadMore(kind: 'agents' | 'sessions'): Promise<void> {
		const cursor = kind === 'agents' ? this.store.getState().agentCursor : this.store.getState().sessionCursor;
		if (!cursor) return;
		await this.run('directory', async (client) => {
			const generation = this.generation;
			if (kind === 'agents') {
				const page = await client.agents.list({
					profileId: client.hello.profile.profileId,
					limit: 100,
					cursor,
				});
				if (!this.disposed && generation === this.generation)
					this.store.setState((state) => ({
						agents: [
							...new Map([...state.agents, ...page.items].map((agent) => [agent.id, agent])).values(),
						],
						agentCursor: page.nextCursor,
					}));
			} else {
				const page = await client.sessions.list({
					profileId: client.hello.profile.profileId,
					limit: 100,
					cursor,
				});
				if (!this.disposed && generation === this.generation)
					this.store.setState((state) => ({
						sessions: [
							...new Map(
								[...state.sessions, ...page.items].map((session) => [session.id, session]),
							).values(),
						],
						sessionCursor: page.nextCursor,
					}));
			}
		});
	}
	async loadMemories(namespace: MemoryNamespace, more = false): Promise<void> {
		const current = this.store.getState();
		await this.run('memories', async (client) => {
			const generation = this.generation;
			const page = await client.memory.list({
				profileId: client.hello.profile.profileId,
				namespace,
				kind: 'item',
				limit: 50,
				...(more && current.memoryCursor ? { cursor: current.memoryCursor } : {}),
			});
			if (!this.disposed && generation === this.generation)
				this.store.setState({
					memories: [
						...new Map(
							[
								...(more ? current.memories : []),
								...page.items.flatMap((object) => (object.kind === 'item' ? [object.item] : [])),
							].map((memory) => [memory.id, memory]),
						).values(),
					],
					memoryNamespace: namespace,
					memoryCursor: page.nextCursor,
				});
		});
	}
	async run<T>(action: string, execute: (client: BotClient) => Promise<T>): Promise<T | undefined> {
		const client = this.bind();
		if (!client || this.disposed || this.store.getState().busy) return undefined;
		if (
			(this.store.getState().cleanup?.profile || this.store.getState().cleanup?.sessionIds.length) &&
			action !== 'delete' &&
			action !== 'sessionCleanup'
		)
			return undefined;
		this.store.setState({ busy: action, error: undefined });
		try {
			return await execute(client);
		} catch (error) {
			if (action === 'import' && !this.disposed)
				this.store.setState({ importUncertain: !isDefiniteRejection(error) });
			if (isDefiniteRejection(error)) {
				if (action === 'import') this.importCommand = undefined;
				if (action === 'delete') this.deletionCommand = undefined;
			}
			if (!this.disposed)
				this.store.setState({
					error:
						action === 'importPreview' &&
						error instanceof BotRpcError &&
						error.data.reason === 'PORTABLE_PREVIEW_TOO_LARGE'
							? 'IMPORT_PREVIEW_TOO_LARGE'
							: action,
				});
			return undefined;
		} finally {
			if (!this.disposed) this.store.setState({ busy: undefined });
		}
	}
	async deleteProfile(): Promise<boolean> {
		const preview = this.store.getState().preview;
		if (!preview) return false;
		const deleted = await this.run('delete', async (client) => {
			this.deletionCommand ??= { ...commandMeta(client), previewToken: preview.token };
			this.workspace?.permissionsChanged();
			let committed = false;
			try {
				const receipt = await client.profile.delete(this.deletionCommand);
				committed = true;
				this.deletionCommand = undefined;
				if (!this.disposed)
					this.store.setState({
						receipt: receipt.receiptId,
						preview: undefined,
						agents: [],
						sessions: [],
						memories: [],
					});
				try {
					await client.service.status({});
				} catch {
					/* The deletion receipt already committed. */
				}
				return true;
			} finally {
				this.workspace?.permissionsChanged();
				if (!committed && client.state !== 'closed' && !this.disposed) await this.initialize();
			}
		});
		return deleted ?? false;
	}
	async retrySessionCleanup(id: string): Promise<boolean> {
		const preview = this.store.getState().sessionCleanup?.find((job) => job.id === id)?.preview;
		if (!preview) return false;
		const done = await this.run('sessionCleanup', async (client) => {
			let command = this.sessionCommands.get(id);
			if (!command) {
				command = {
					...commandMeta(client),
					id,
					expectedRevision: preview.revision,
					previewToken: preview.token,
				};
				this.sessionCommands.set(id, command);
			}
			const receipt = await client.sessions.delete(command);
			this.sessionCommands.delete(id);
			if (!this.disposed) this.store.setState({ receipt: receipt.receiptId });
			return true;
		});
		if (done) await this.initialize();
		return done ?? false;
	}
	setArtifact(artifact: ArtifactRef): void {
		if (this.importCommand) return;
		this.importCommand = undefined;
		if (!this.disposed) this.store.setState({ artifact, importPreview: undefined });
	}
	async previewImport(artifact: ArtifactRef): Promise<void> {
		if (this.importCommand) return;
		await this.run('importPreview', async (client) => {
			const preview = await client.portable.importPreview({
				profileId: client.hello.profile.profileId,
				artifact,
			});
			if (!this.disposed) this.store.setState({ artifact, importPreview: preview });
		});
	}
	async import(resolutions: Array<{ id: string; action: 'keep' | 'replace' | 'copy' }>): Promise<boolean> {
		const preview = this.store.getState().importPreview;
		if (!preview && !this.importCommand) return false;
		const imported = await this.run('import', async (client) => {
			this.importCommand ??= {
				...commandMeta(client),
				previewToken: preview!.token,
				resolutions: structuredClone(resolutions),
			};
			const receipt = await client.portable.import(this.importCommand);
			this.importCommand = undefined;
			if (!this.disposed)
				this.store.setState({ receipt: receipt.receiptId, importPreview: undefined, importUncertain: false });
			return true;
		});
		return imported ?? false;
	}
	abandonImport(): void {
		if (this.store.getState().busy) return;
		this.importCommand = undefined;
		this.store.setState({ importPreview: undefined, importUncertain: false, error: undefined });
	}
	dispose(): void {
		this.disposed = true;
		this.reader?.abort();
		this.unsubscribe?.();
		this.closeBinding?.();
	}
}
