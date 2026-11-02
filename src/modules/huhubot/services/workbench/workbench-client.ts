import { createStore } from 'zustand/vanilla';
import type {
	Agent,
	BotClient,
	BotMethodMap,
	CommandMeta,
	CredentialStatus,
	DeletionPreview,
	Delegation,
	EffectTarget,
	GrantRecipient,
	MemoryNamespace,
	Run,
	RunReceipt,
	Session,
	SourceScope,
	SourceSnapshot,
	VisibleMessage,
} from '../../api';
import { BotRpcError, type ProtocolTimers } from '../../core/protocol/connection';
import { resolveMentionTargets, type MentionDraft } from '../../core/mentions/mentions';
import { emptyProjection, sequence, type EventProjection } from '../../core/events/reducer';
import { EventClient, type EventSubscription } from '../events/event-client';
import { CommandAttempt, isDefiniteRejection } from './command-attempt';

export interface CredentialEditor {
	set: (
		secret: string,
		mode: 'protected' | 'session-memory',
	) => Promise<{ credentialRef: string; status: CredentialStatus }>;
}
export interface BotWorkbenchHost {
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
	openSettings?: () => void;
	openTarget?: (section: string, resourceId?: string) => void;
	captureSource?: () => Promise<SourceSnapshot | undefined>;
	captureScope?: (kind: 'folder' | 'vault') => Promise<SourceScope | undefined>;
	openSource?: (source: SourceSnapshot) => void;
	runContext?: () => Pick<
		Start,
		'workspaceId' | 'originClientId' | 'originViewId' | 'hostConnectionId' | 'hostLeaseEpoch'
	>;
	writeTarget?: (path: string, sessionId: string) => Promise<EffectTarget | undefined>;
}
export interface ChatThread {
	draft: MentionDraft;
	sources: SourceSnapshot[];
	scopes: SourceScope[];
	writeTarget?: { target: EffectTarget; path: string };
	messages: VisibleMessage[];
	historyLoading: boolean;
	historyLoaded: boolean;
	historyCursor?: string;
	sending: boolean;
	uncertain: boolean;
	error?: string;
	runIds: string[];
	latestRunId?: string;
	projections: Record<string, EventProjection>;
}
export interface WorkbenchView {
	agents: Agent[];
	sessions: Session[];
	agentCursor?: string;
	sessionCursor?: string;
	loading: boolean;
	loaded: boolean;
	online: boolean;
	permissionRevision: number;
	error?: string;
	threads: Record<string, ChatThread>;
	contextThreads: { namespace: MemoryNamespace; workThreadId: string; runId: string }[];
}
export const EMPTY_THREAD: ChatThread = {
	draft: { text: '', mentions: [] },
	sources: [],
	scopes: [],
	messages: [],
	historyLoading: false,
	historyLoaded: false,
	sending: false,
	uncertain: false,
	runIds: [],
	projections: {},
};
const terminal = new Set<Run['status']>(['succeeded', 'failed', 'canceled', 'blocked', 'interrupted']);
function membershipKey(session: Session): string {
	return JSON.stringify([
		session.kind,
		[...session.memberIds].sort(),
		[...(session.groupMembers ?? [])]
			.sort((a, b) => a.agentId.localeCompare(b.agentId))
			.map((member) => [member.agentId, member.incarnation, member.historyRevision]),
	]);
}
export const runIsActive = (status?: string) => !!status && !['succeeded', 'failed', 'canceled'].includes(status);
const reason = (error: unknown) =>
	error instanceof BotRpcError ? error.data.kind : error instanceof Error ? error.message : 'HOST_UNAVAILABLE';
export function commandMeta(client: BotClient): CommandMeta {
	const id = crypto.randomUUID();
	return {
		commandId: id,
		idempotencyKey: id,
		profileId: client.hello.profile.profileId,
		commandEpoch: client.hello.profile.commandEpoch,
	};
}
type Start = BotMethodMap['runs.start']['params'];
interface PreparedStart {
	command: Start;
	version: number;
}

/** One module owns drafts and event projections. Views subscribe; closing a view never cancels a Run.
 * Retry uses the original immutable command, including after an uncertain transport outcome.
 */
export class WorkbenchClient {
	readonly store = createStore<WorkbenchView>(() => ({
		agents: [],
		sessions: [],
		loading: false,
		loaded: false,
		online: false,
		permissionRevision: 0,
		threads: {},
		contextThreads: [],
	}));
	private bot?: BotClient;
	private events?: EventClient;
	private unbind?: () => void;
	private disposed = false;
	private readonly prepared = new Map<string, PreparedStart>();
	private readonly versions = new Map<string, number>();
	private readonly preparing = new Set<string>();
	private readonly pendingStarts = new Map<string, Promise<RunReceipt>>();
	private readonly pendingCancels = new Map<string, Promise<void>>();
	private readonly cancelCommands = new Map<string, BotMethodMap['runs.cancel']['params']>();
	private readonly pendingSessions = new Map<string, Promise<Session>>();
	private readonly sessionAttempts = new Map<
		string,
		CommandAttempt<BotMethodMap['sessions.create']['params'], Session>
	>();
	private readonly history = new Map<string, AbortController>();
	private readonly streams = new Map<
		string,
		{ subscription: EventSubscription; unsubscribe(): void; sessionId: string; seq?: string; terminal: boolean }
	>();
	private directoryRequest?: AbortController;
	constructor(
		private readonly host: Pick<BotWorkbenchHost, 'client' | 'report' | 'runContext'>,
		private readonly timers: ProtocolTimers,
	) {}
	getSnapshot = (): WorkbenchView => this.store.getState();
	subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);
	acceptAgent(agent: Agent): void {
		if (!this.disposed)
			this.store.setState((state) => ({
				agents: [...new Map([...state.agents, agent].map((item) => [item.id, item])).values()],
			}));
	}
	removeAgent(id: string): void {
		this.sessionAttempts.delete(id);
		if (!this.disposed) {
			this.store.setState((state) => ({ agents: state.agents.filter((agent) => agent.id !== id) }));
			this.permissionsChanged();
		}
	}
	acceptDelegations(children: readonly Delegation[]): void {
		if (this.disposed) return;
		const incoming = children
			.filter((child) => child.workThreadId && child.executorAgentId && child.childRunId)
			.map((child) => ({
				namespace: {
					kind: child.targetAgentId ? ('agent' as const) : ('temporary' as const),
					id: child.executorAgentId,
				},
				workThreadId: child.workThreadId,
				runId: child.childRunId,
			}));
		if (!incoming.length) return;
		this.store.setState((state) => ({
			contextThreads: [
				...new Map(
					[
						...state.contextThreads.filter(
							(thread) => !incoming.some((next) => next.runId === thread.runId),
						),
						...incoming,
					].map((thread) => [thread.runId, thread]),
				).values(),
			].slice(-512),
		}));
	}
	acceptSession(session: Session): void {
		if (!this.disposed) {
			const previous = this.getSnapshot().sessions.find((value) => value.id === session.id);
			if (previous && membershipKey(previous) !== membershipKey(session)) this.permissionsChanged();
			this.store.setState((state) => ({
				sessions: [...new Map([...state.sessions, session].map((item) => [item.id, item])).values()],
			}));
			this.events?.sessionChanged(session);
		}
	}
	private thread(id: string): ChatThread {
		return this.store.getState().threads[id] ?? EMPTY_THREAD;
	}
	private update(id: string, patch: Partial<ChatThread>): void {
		if (this.disposed) return;
		this.store.setState((state) => ({
			threads: { ...state.threads, [id]: { ...(state.threads[id] ?? EMPTY_THREAD), ...patch } },
		}));
	}
	private client(): BotClient {
		const bot = this.host.client();
		if (this.disposed || !bot || bot.state === 'closed') throw new Error('HOST_UNAVAILABLE');
		if (this.bot !== bot) {
			this.unbind?.();
			this.events?.dispose();
			for (const stream of this.streams.values()) stream.unsubscribe();
			this.streams.clear();
			this.bot = bot;
			this.events = new EventClient(bot, this.timers);
			this.unbind = bot.onClose(() => {
				if (this.bot !== bot || this.disposed) return;
				this.permissionsChanged();
				this.store.setState({ online: false });
				for (const [id, thread] of Object.entries(this.getSnapshot().threads))
					this.update(id, {
						messages: [],
						historyLoaded: false,
						projections: {},
						error: 'HOST_UNAVAILABLE',
						sending: false,
						uncertain: this.prepared.has(id) || thread.uncertain,
					});
			});
		}
		this.store.setState({ online: true });
		return bot;
	}
	async refreshDirectory(more = false): Promise<void> {
		const bot = this.client();
		this.directoryRequest?.abort();
		const controller = new AbortController();
		this.directoryRequest = controller;
		const prior = this.getSnapshot();
		this.store.setState({ loading: true, error: undefined });
		try {
			const [agents, sessions] = await Promise.all([
				more && !prior.agentCursor
					? Promise.resolve({ items: [] as Agent[], nextCursor: undefined })
					: bot.agents.list(
							{
								profileId: bot.hello.profile.profileId,
								limit: 100,
								...(more && prior.agentCursor ? { cursor: prior.agentCursor } : {}),
							},
							{ signal: controller.signal },
						),
				more && !prior.sessionCursor
					? Promise.resolve({ items: [] as Session[], nextCursor: undefined })
					: bot.sessions.list(
							{
								profileId: bot.hello.profile.profileId,
								limit: 100,
								...(more && prior.sessionCursor ? { cursor: prior.sessionCursor } : {}),
							},
							{ signal: controller.signal },
						),
			]);
			if (controller.signal.aborted || this.disposed || this.bot !== bot) return;
			const merge = <T extends { id: string }>(previous: T[], next: T[]) => [
				...new Map([...previous, ...next].map((item) => [item.id, item])).values(),
			];
			if (
				prior.sessions.some((previous) => {
					const next = sessions.items.find((value) => value.id === previous.id);
					return next ? membershipKey(previous) !== membershipKey(next) : !more && previous.kind === 'group';
				})
			)
				this.permissionsChanged();
			for (const session of sessions.items) this.events?.sessionChanged(session);
			this.store.setState({
				agents: more ? merge(prior.agents, agents.items) : agents.items,
				sessions: more ? merge(prior.sessions, sessions.items) : sessions.items,
				agentCursor: agents.nextCursor,
				sessionCursor: sessions.nextCursor,
				loading: false,
				loaded: true,
				online: true,
			});
		} catch (error) {
			if (!controller.signal.aborted && !this.disposed) {
				this.store.setState({ loading: false, loaded: true, error: reason(error) });
				this.host.report?.(error);
			}
		}
	}
	setDraft(sessionId: string, draft: MentionDraft): void {
		this.versions.set(sessionId, (this.versions.get(sessionId) ?? 0) + 1);
		this.update(sessionId, { draft: structuredClone(draft) });
	}
	setText(sessionId: string, text: string): void {
		const draft = this.thread(sessionId).draft;
		this.setDraft(sessionId, { text, mentions: text ? draft.mentions : [] });
	}
	attach(sessionId: string, source: SourceSnapshot | SourceScope): void {
		this.versions.set(sessionId, (this.versions.get(sessionId) ?? 0) + 1);
		const thread = this.thread(sessionId);
		if (thread.sources.length + thread.scopes.length >= 32) throw new Error('RESOURCE_LIMIT');
		const key = source.resourceId;
		if ('scopeResourceIds' in source)
			this.update(sessionId, { sources: [...thread.sources.filter((item) => item.resourceId !== key), source] });
		else this.update(sessionId, { scopes: [...thread.scopes.filter((item) => item.resourceId !== key), source] });
	}
	removeAttachment(sessionId: string, resourceId: string): void {
		this.versions.set(sessionId, (this.versions.get(sessionId) ?? 0) + 1);
		const thread = this.thread(sessionId);
		this.update(sessionId, {
			sources: thread.sources.filter((item) => item.resourceId !== resourceId),
			scopes: thread.scopes.filter((item) => item.resourceId !== resourceId),
		});
	}
	setWriteTarget(sessionId: string, value: ChatThread['writeTarget']): void {
		this.versions.set(sessionId, (this.versions.get(sessionId) ?? 0) + 1);
		this.update(sessionId, { writeTarget: value });
	}
	async chooseAgent(agent: Agent): Promise<Session> {
		const existing = this.getSnapshot().sessions.find(
			(session) =>
				!session.archived &&
				session.kind === 'direct' &&
				session.memberIds.length === 1 &&
				session.memberIds[0] === agent.id,
		);
		if (existing) {
			this.sessionAttempts.delete(agent.id);
			return existing;
		}
		const pending = this.pendingSessions.get(agent.id);
		if (pending) return pending;
		const bot = this.client();
		const attempt =
			this.sessionAttempts.get(agent.id) ??
			new CommandAttempt<BotMethodMap['sessions.create']['params'], Session>();
		this.sessionAttempts.set(agent.id, attempt);
		const operation = attempt
			.send(
				() => {
					const origin = this.host.runContext?.();
					return {
						...commandMeta(bot),
						kind: 'direct',
						title: agent.name,
						memberIds: [agent.id],
						...(origin?.workspaceId ? { workspaceId: origin.workspaceId } : {}),
					};
				},
				(command) => bot.sessions.create(command),
			)
			.then((session) => {
				this.sessionAttempts.delete(agent.id);
				if (!this.disposed)
					this.store.setState((state) => ({
						sessions: [session, ...state.sessions.filter((item) => item.id !== session.id)],
					}));
				return session;
			})
			.catch((error: unknown) => {
				if (!attempt.uncertain) this.sessionAttempts.delete(agent.id);
				throw error;
			})
			.finally(() => this.pendingSessions.delete(agent.id));
		this.pendingSessions.set(agent.id, operation);
		return operation;
	}
	async refreshHistory(sessionId: string, more = false): Promise<void> {
		const bot = this.client(),
			prior = this.thread(sessionId);
		if (more && (!prior.historyCursor || prior.historyLoading)) return;
		this.history.get(sessionId)?.abort();
		const controller = new AbortController();
		this.history.set(sessionId, controller);
		this.update(sessionId, { historyLoading: true, error: undefined });
		try {
			const page = await bot.sessions.history(
				{
					profileId: bot.hello.profile.profileId,
					sessionId,
					limit: 100,
					...(more && prior.historyCursor ? { cursor: prior.historyCursor } : {}),
				},
				{ signal: controller.signal },
			);
			if (controller.signal.aborted || this.disposed || this.bot !== bot) return;
			const messages = [
				...new Map(
					[...(more ? prior.messages : []), ...page.items].map((message) => [message.id, message]),
				).values(),
			];
			messages.sort((left, right) =>
				left.seq && right.seq
					? sequence(left.seq) < sequence(right.seq)
						? -1
						: sequence(left.seq) > sequence(right.seq)
							? 1
							: 0
					: left.createdAt.localeCompare(right.createdAt),
			);
			const runIds = [
				...new Set([
					...this.thread(sessionId).runIds,
					...page.items.flatMap((message) => (message.runId ? [message.runId] : [])),
				]),
			];
			this.update(sessionId, {
				messages,
				historyCursor: page.nextCursor,
				historyLoading: false,
				historyLoaded: true,
				runIds,
				latestRunId:
					this.thread(sessionId).latestRunId ??
					[...messages].reverse().find((message) => message.role === 'user' && message.runId)?.runId,
			});
			for (const id of runIds.slice(-8)) void this.watchRun(sessionId, id);
		} catch (error) {
			if (!controller.signal.aborted && !this.disposed) {
				this.update(sessionId, {
					historyLoading: false,
					error: reason(error),
					...(error instanceof BotRpcError && error.data.kind === 'CAPABILITY_DENIED'
						? { messages: [], projections: {} }
						: {}),
				});
				this.host.report?.(error);
			}
		}
	}
	async send(sessionId: string): Promise<RunReceipt> {
		if (this.pendingStarts.has(sessionId) || this.preparing.has(sessionId)) throw new Error('SESSION_BUSY');
		this.preparing.add(sessionId);
		try {
			return await this.prepareSend(sessionId);
		} catch (error) {
			this.update(sessionId, { sending: false, error: reason(error) });
			throw error;
		} finally {
			this.preparing.delete(sessionId);
		}
	}
	private async prepareSend(sessionId: string): Promise<RunReceipt> {
		const bot = this.client(),
			thread = this.thread(sessionId),
			version = this.versions.get(sessionId) ?? 0;
		if (thread.uncertain && this.prepared.has(sessionId)) throw new Error('REQUEST_OUTCOME_UNCERTAIN');
		this.update(sessionId, { sending: true, error: undefined });
		let session = this.getSnapshot().sessions.find((item) => item.id === sessionId);
		if (typeof bot.sessions.get === 'function')
			session = await bot.sessions.get({ profileId: bot.hello.profile.profileId, id: sessionId });
		if (!session || !thread.draft.text.trim()) throw new Error('INVALID_ARGUMENT');
		const resolution = resolveMentionTargets(thread.draft, session, this.getSnapshot().agents);
		if (!resolution.valid) {
			this.update(sessionId, { error: resolution.reason });
			throw new Error(resolution.reason);
		}
		const recipients = resolution.targetAgentIds.length
			? resolution.targetAgentIds
			: session.kind === 'group'
				? [session.coordinatorId!]
				: session.memberIds;
		const grantIds: string[] = [];
		for (const source of [...thread.sources, ...thread.scopes]) {
			const targets: GrantRecipient[] = recipients.map((id) => {
				const agent = this.getSnapshot().agents.find((item) => item.id === id),
					model = agent?.model;
				if (!agent || !model) throw new Error('MODEL_UNAVAILABLE');
				return {
					agentId: id,
					modelBindingRevision: agent.modelBindingRevision,
					providerId: model.providerId,
					modelId: model.modelId,
					protocol: model.protocol,
					endpoint: model.endpoint,
				};
			});
			const grant = await bot.grants.create({
				...commandMeta(bot),
				workspaceId: source.workspaceId,
				scope: source.kind === 'note' || source.kind === 'selection' ? 'source' : source.kind,
				resourceId: source.resourceId,
				recipients: targets,
				operations:
					source.kind === 'note' || source.kind === 'selection'
						? ['read', 'send', ...(session.kind === 'group' ? ['deliver' as const] : [])]
						: ['read', 'search', 'send', ...(session.kind === 'group' ? ['deliver' as const] : [])],
				sessionId,
			});
			grantIds.push(grant.id);
		}
		const binding = thread.sources[0] ?? thread.scopes[0];
		const intent =
			thread.draft.text.trim() +
			(thread.writeTarget
				? `\n\nUser-selected note creation target (a proposal still requires approval):\n${JSON.stringify(thread.writeTarget.target)}`
				: '');
		const command: Start = {
			...commandMeta(bot),
			...this.host.runContext?.(),
			sessionId,
			expectedRevision: session.revision,
			intent,
			sourceRefs: structuredClone(thread.sources),
			...(thread.scopes.length ? { sourceScopes: structuredClone(thread.scopes) } : {}),
			...(grantIds.length ? { grantIds } : {}),
			targetAgentIds: session.kind === 'group' ? resolution.targetAgentIds : session.memberIds,
			...(binding
				? {
						workspaceId: binding.workspaceId,
						originClientId: binding.originClientId,
						originViewId: binding.originViewId,
						hostConnectionId: binding.hostConnectionId,
						hostLeaseEpoch: binding.hostLeaseEpoch,
					}
				: {}),
		};
		const prepared = { command, version };
		this.prepared.set(sessionId, prepared);
		return this.dispatch(sessionId, prepared);
	}
	retrySend(sessionId: string): Promise<RunReceipt> {
		const pending = this.pendingStarts.get(sessionId);
		if (pending) return pending;
		const prepared = this.prepared.get(sessionId);
		if (!prepared) return Promise.reject(new Error('NO_PENDING_REQUEST'));
		return this.dispatch(sessionId, prepared);
	}
	private dispatch(sessionId: string, prepared: PreparedStart): Promise<RunReceipt> {
		const bot = this.client();
		this.update(sessionId, { sending: true, error: undefined });
		const operation = bot.runs
			.start(structuredClone(prepared.command))
			.then((receipt) => {
				if (this.disposed) return receipt;
				const thread = this.thread(sessionId);
				this.prepared.delete(sessionId);
				this.update(sessionId, {
					sending: false,
					uncertain: false,
					...(prepared.version === (this.versions.get(sessionId) ?? 0)
						? { draft: { text: '', mentions: [] }, sources: [], scopes: [], writeTarget: undefined }
						: {}),
					latestRunId: receipt.runId,
					projections: {
						...thread.projections,
						[receipt.runId]: { ...emptyProjection(receipt.runId), status: receipt.status },
					},
					runIds: [...new Set([...thread.runIds, receipt.runId, ...(receipt.targetRunIds ?? [])])],
				});
				void this.watchRun(sessionId, receipt.runId);
				for (const id of receipt.targetRunIds ?? []) void this.watchRun(sessionId, id);
				void this.refreshHistory(sessionId).catch((error) => this.host.report?.(error));
				return receipt;
			})
			.catch((error: unknown) => {
				this.update(sessionId, {
					sending: false,
					uncertain: !isDefiniteRejection(error),
					error: reason(error),
				});
				this.host.report?.(error);
				throw error;
			})
			.finally(() => this.pendingStarts.delete(sessionId));
		this.pendingStarts.set(sessionId, operation);
		return operation;
	}
	cancelRun(sessionId: string): Promise<void> {
		const runId = this.thread(sessionId).latestRunId;
		if (!runId) return Promise.resolve();
		const pending = this.pendingCancels.get(runId);
		if (pending) return pending;
		const operation = (async () => {
			const bot = this.client();
			let command = this.cancelCommands.get(runId);
			if (!command) {
				const run = await bot.runs.get({ profileId: bot.hello.profile.profileId, id: runId });
				command = { ...commandMeta(bot), id: run.id, expectedRevision: run.revision };
				this.cancelCommands.set(runId, command);
			}
			const receipt = await bot.runs.cancel(command);
			this.cancelCommands.delete(runId);
			const thread = this.thread(sessionId),
				projection = thread.projections[runId] ?? emptyProjection(runId);
			this.update(sessionId, {
				projections: { ...thread.projections, [runId]: { ...projection, status: receipt.status } },
			});
			await this.refreshRun(sessionId, runId);
		})().finally(() => this.pendingCancels.delete(runId));
		this.pendingCancels.set(runId, operation);
		return operation;
	}
	async refreshRun(sessionId: string, runId: string): Promise<void> {
		const stream = this.streams.get(runId);
		if (stream) {
			stream.unsubscribe();
			stream.subscription.dispose();
			this.streams.delete(runId);
		}
		await this.watchRun(sessionId, runId);
	}
	async observeRun(sessionId: string, runId: string): Promise<void> {
		const thread = this.thread(sessionId);
		if (!thread.runIds.includes(runId)) this.update(sessionId, { runIds: [...thread.runIds, runId] });
		await this.watchRun(sessionId, runId);
	}
	private async watchRun(sessionId: string, runId: string): Promise<void> {
		if (this.disposed || this.streams.has(runId)) return;
		const bot = this.bot;
		if (!bot || typeof bot.runs.get !== 'function' || !this.events) return;
		try {
			const run = await bot.runs.get({ profileId: bot.hello.profile.profileId, id: runId });
			if (this.disposed || this.bot !== bot || this.streams.has(runId)) return;
			if (this.streams.size >= 16) {
				// Keep late facts observable while a task is in the bounded working set.
				// A completed task can yield its slot to a newly opened task.
				const cold = [...this.streams].find(([, stream]) => stream.terminal);
				if (!cold) return;
				cold[1].unsubscribe();
				cold[1].subscription.dispose();
				this.streams.delete(cold[0]);
			}
			const subscription = this.events.attach(runId, run.group, run.revision);
			const entry = {
				subscription,
				unsubscribe: () => {},
				sessionId,
				seq: undefined as string | undefined,
				terminal: terminal.has(run.status),
			};
			const update = () => {
				if (this.disposed) return;
				const view = subscription.getSnapshot(),
					projection = {
						...view.projection,
						status: view.projection.status ?? run.status,
						usage: view.projection.usage ?? run.usage,
						reason: view.projection.reason ?? run.reason,
						run: {
							...run,
							status: (view.projection.status as Run['status'] | undefined) ?? run.status,
							usage: view.projection.usage ?? run.usage,
							reason: view.projection.reason ?? run.reason,
						},
					};
				this.update(sessionId, {
					projections: { ...this.thread(sessionId).projections, [runId]: projection },
					...(view.error
						? {
								error: view.error.reason,
								...(view.error.kind === 'CAPABILITY_DENIED'
									? { messages: [], historyLoaded: false, sources: [], scopes: [] }
									: {}),
							}
						: {}),
				});
				if (
					projection.seq !== entry.seq &&
					(projection.facts.some(
						(fact) =>
							sequence(fact.seq) > sequence(entry.seq ?? '0') &&
							['delegation.completed', 'message.committed'].includes(fact.type),
					) ||
						['delegation.completed', 'succeeded', 'failed', 'canceled', 'message.committed'].includes(
							projection.lastEventType ?? '',
						))
				)
					void this.refreshHistory(sessionId);
				entry.seq = projection.seq;
				if (projection.status && terminal.has(projection.status as Run['status']) && !entry.terminal) {
					entry.terminal = true;
					void this.refreshHistory(sessionId);
				}
			};
			this.streams.set(runId, entry);
			entry.unsubscribe = subscription.subscribe(update);
			update();
		} catch (error) {
			if (!this.disposed) this.host.report?.(error);
		}
	}
	permissionsChanged(): void {
		this.store.setState((state) => ({ permissionRevision: state.permissionRevision + 1, contextThreads: [] }));
		this.events?.accessChanged();
		for (const id of Object.keys(this.getSnapshot().threads)) {
			this.history.get(id)?.abort();
			this.update(id, { messages: [], projections: {}, historyLoaded: false, sources: [], scopes: [] });
		}
	}
	resetProfile(): void {
		this.unbind?.();
		this.unbind = undefined;
		this.bot = undefined;
		for (const controller of this.history.values()) controller.abort();
		for (const stream of this.streams.values()) {
			stream.unsubscribe();
			stream.subscription.dispose();
		}
		this.streams.clear();
		this.events?.dispose();
		this.events = undefined;
		this.prepared.clear();
		this.sessionAttempts.clear();
		this.cancelCommands.clear();
		this.store.setState((state) => ({
			agents: [],
			sessions: [],
			threads: {},
			contextThreads: [],
			agentCursor: undefined,
			sessionCursor: undefined,
			loading: false,
			loaded: false,
			online: false,
			permissionRevision: state.permissionRevision + 1,
		}));
	}
	async deletionPreview(id: string): Promise<DeletionPreview> {
		const bot = this.client();
		return bot.sessions.deletePreview({ profileId: bot.hello.profile.profileId, id });
	}
	async deleteSession(id: string, preview: DeletionPreview, retainMemoryIds: string[] = []): Promise<void> {
		const bot = this.client(),
			session = this.getSnapshot().sessions.find((item) => item.id === id);
		if (!session) throw new Error('SESSION_NOT_FOUND');
		const command = {
			...commandMeta(bot),
			id,
			expectedRevision: preview.revision,
			previewToken: preview.token,
			retainMemoryIds,
		};
		this.permissionsChanged();
		try {
			await bot.sessions.delete(command);
		} finally {
			this.permissionsChanged();
			try {
				await bot.service.status({});
			} catch (error) {
				this.host.report?.(error);
			}
		}
		this.history.get(id)?.abort();
		for (const [runId, stream] of this.streams)
			if (stream.sessionId === id) {
				stream.unsubscribe();
				stream.subscription.dispose();
				this.streams.delete(runId);
			}
		this.store.setState((state) => ({
			sessions: state.sessions.filter((item) => item.id !== id),
			threads: Object.fromEntries(Object.entries(state.threads).filter(([key]) => key !== id)),
		}));
		this.prepared.delete(id);
	}
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.unbind?.();
		this.directoryRequest?.abort();
		for (const controller of this.history.values()) controller.abort();
		for (const entry of this.streams.values()) {
			entry.unsubscribe();
			entry.subscription.dispose();
		}
		this.streams.clear();
		this.events?.dispose();
		this.prepared.clear();
		this.sessionAttempts.clear();
	}
}
