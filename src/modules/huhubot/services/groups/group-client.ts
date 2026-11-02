import type { Agent, BotClient, BotErrorData, BotMethod, BotMethodMap, CommandMeta, Run, RunReceipt, Session } from '../../api';
import { BotRpcError, type ProtocolTimers } from '../../core/protocol/connection';
import { methodValidation } from '../../core/protocol/method-validation';
import { resolveMentionTargets, type MentionDraft } from '../../core/mentions/mentions';
import { emptyTranscript, mergePublicMessages, TranscriptError, type PublicTranscript } from '../../core/events/transcript';
import { sequence } from '../../core/events/reducer';
import { EventClient, type EventClientOptions, type EventSubscription } from '../events/event-client';

type DirectoryAgent = Pick<Agent, 'id' | 'name' | 'enabled'>;
type Start = BotMethodMap['runs.start']['params'];
export type GroupSendContext = Omit<Start, keyof CommandMeta | 'sessionId' | 'expectedRevision' | 'intent' | 'targetAgentIds'>;
type SafeError = Pick<BotErrorData, 'kind' | 'reason'>;
export interface GroupView {
	session?: Session;
	draft: MentionDraft;
	send: { state: 'editing' | 'sending' | 'accepted' | 'error'; receipt?: RunReceipt; error?: SafeError; invalidAgentIds?: string[] };
	history: { state: 'idle' | 'reading' | 'ready' | 'paused' | 'closed'; transcript: PublicTranscript; nextCursor?: string; error?: SafeError };
}
function local(reason: string, kind: BotErrorData['kind'] = 'INVALID_ARGUMENT'): BotRpcError {
	return new BotRpcError(-32000, { kind, reason, retryable: false, correlationId: 'group-client' });
}
function safe(error: unknown): SafeError {
	return error instanceof BotRpcError ? { kind: error.data.kind, reason: error.data.reason }
		: error instanceof TranscriptError ? { kind: error.reason.endsWith('_LIMIT') ? 'RESOURCE_LIMIT' : 'CONFLICT', reason: error.reason }
			: { kind: 'HOST_UNAVAILABLE', reason: 'GROUP_CONNECTION_UNAVAILABLE' };
}
function immutable<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) immutable(child); Object.freeze(value); }
	return value;
}
function membership(session: Session): string {
	return JSON.stringify((session.groupMembers ?? []).map(item => [item.agentId, item.incarnation, item.historyRevision]).sort((a, b) => a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : 0));
}

/** One Session consumer shared by its views. Commands cross only BotClient; History and Run streams remain distinct. */
export class GroupClient {
	private bot?: BotClient;
	private readonly profileId: string;
	private readonly sessionId: string;
	private agents: readonly DirectoryAgent[];
	private view: GroupView;
	private disposed = false;
	private generation = 0;
	private historyGeneration = 0;
	private draftVersion = 0;
	private loadedHistory = false;
	private prepared?: { command: Start; draftVersion: number };
	private pendingSend?: Promise<RunReceipt>;
	private pendingHistory?: Promise<void>;
	private historyController?: AbortController;
	private readonly controllers = new Set<AbortController>();
	private readonly operations = new Set<Promise<unknown>>();
	private readonly listeners = new Set<() => void>();
	private readonly streams = new Set<EventSubscription>();
	private readonly events: EventClient;
	private unsubscribeClose?: () => void;
	constructor(bot: BotClient, session: Session, agents: readonly DirectoryAgent[], timers: ProtocolTimers, options: EventClientOptions = {}) {
		if (session.kind !== 'group' || !session.groupMembers) throw local('GROUP_SESSION_INVALID');
		this.bot = bot; this.profileId = bot.hello.profile.profileId; this.sessionId = session.id; this.agents = structuredClone(agents);
		this.view = { session: structuredClone(session), draft: { text: '', mentions: [] }, send: { state: 'editing' }, history: { state: 'idle', transcript: emptyTranscript(session.id) } };
		this.events = new EventClient(bot, timers, options); this.bindClose();
	}
	getSnapshot(): GroupView { return immutable(this.view); }
	subscribe(listener: () => void): () => void {
		if (this.disposed) return () => {};
		if (this.listeners.size >= 256) throw local('GROUP_LISTENER_LIMIT', 'RESOURCE_LIMIT');
		this.listeners.add(listener); return () => { this.listeners.delete(listener); };
	}
	private notify(): void { for (const listener of [...this.listeners]) { try { listener(); } catch { /* UI owners cannot retain a response or stop cleanup. */ } } }
	private requireBot(method: BotMethod): BotClient {
		const bot = this.bot;
		if (this.disposed || !bot || bot.state !== 'ready') throw local('GROUP_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
		if (bot.hello.profile.profileId !== this.profileId) throw local('GROUP_PROFILE_CHANGED', 'CAPABILITY_DENIED');
		if (!bot.hello.capabilities.includes(method)) throw local('GROUP_METHOD_UNAVAILABLE', 'CAPABILITY_DENIED');
		return bot;
	}
	private session(): Session { if (!this.view.session) throw local('GROUP_SESSION_UNAVAILABLE'); return this.view.session; }
	private meta(meta: CommandMeta, bot: BotClient): void {
		if (meta.profileId !== this.profileId || meta.commandEpoch !== bot.hello.profile.commandEpoch) throw local('GROUP_COMMAND_CONTEXT_CHANGED', 'CAPABILITY_DENIED');
	}
	private track<T>(operation: Promise<T>): Promise<T> {
		this.operations.add(operation); void operation.then(() => this.operations.delete(operation), () => this.operations.delete(operation)); return operation;
	}
	setDraft(draft: MentionDraft): void {
		if (this.disposed) throw local('GROUP_CLIENT_DISPOSED');
		this.draftVersion++; this.view = { ...this.view, draft: structuredClone(draft), send: this.pendingSend ? this.view.send : { state: 'editing' } }; this.notify();
	}
	setDirectory(agents: readonly DirectoryAgent[]): void { if (this.disposed) throw local('GROUP_CLIENT_DISPOSED'); this.agents = structuredClone(agents); }
	async send(meta: CommandMeta, context: GroupSendContext): Promise<RunReceipt> {
		if (this.pendingSend) throw local('GROUP_SEND_PENDING', 'CONFLICT');
		let session: Session;
		try { const bot = this.requireBot('runs.start'); this.meta(meta, bot); session = this.session(); }
		catch (error) { if (!this.disposed) { this.view = { ...this.view, send: { state: 'error', error: safe(error) } }; this.notify(); } throw error; }
		const resolution = resolveMentionTargets(this.view.draft, session, this.agents);
		if (!resolution.valid) {
			const error = local(resolution.reason); this.view = { ...this.view, send: { state: 'error', error: safe(error), invalidAgentIds: resolution.invalidAgentIds } }; this.notify(); throw error;
		}
		const command: Start = { ...structuredClone(meta), ...structuredClone(context), sessionId: this.sessionId, expectedRevision: session.revision,
			intent: this.view.draft.text, targetAgentIds: resolution.targetAgentIds };
		if (!methodValidation.validate('runs.start', 'params', command)) {
			const error = local('GROUP_COMMAND_INVALID'); this.view = { ...this.view, send: { state: 'error', error: safe(error) } }; this.notify(); throw error;
		}
		this.prepared = { command, draftVersion: this.draftVersion };
		return this.dispatch(this.prepared);
	}
	/** An explicit retry uses the exact original command/IDs, including after an uncertain transport outcome. No automatic replay. */
	retrySend(): Promise<RunReceipt> {
		if (this.pendingSend) return this.pendingSend;
		if (!this.prepared) return Promise.reject(local('GROUP_RETRY_UNAVAILABLE'));
		return this.dispatch(this.prepared);
	}
	private dispatch(prepared: { command: Start; draftVersion: number }): Promise<RunReceipt> {
		let bot: BotClient;
		try { bot = this.requireBot('runs.start'); this.meta(prepared.command, bot); } catch (error) {
			if (!this.disposed) { this.view = { ...this.view, send: { state: 'error', error: safe(error) } }; this.notify(); }
			return Promise.reject(error instanceof Error ? error : local('GROUP_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE'));
		}
		const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
		this.view = { ...this.view, send: { state: 'sending' } };
		const operation = Promise.resolve().then(async () => {
			try {
				const receipt = await bot.runs.start(structuredClone(prepared.command), { signal: controller.signal });
				if (this.disposed || generation !== this.generation || bot !== this.bot) throw local('GROUP_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE');
				let draft = this.view.draft;
				if (this.draftVersion === prepared.draftVersion) { draft = { text: '', mentions: [] }; this.draftVersion++; }
				this.view = { ...this.view, draft, send: { state: 'accepted', receipt: structuredClone(receipt) } }; return receipt;
			} catch (error) {
				if (!this.disposed && generation === this.generation && bot === this.bot) this.view = { ...this.view, send: { state: 'error', error: safe(error) } };
				throw error;
			} finally {
				this.controllers.delete(controller);
				if (generation === this.generation) { this.pendingSend = undefined; this.notify(); }
			}
		});
		this.pendingSend = this.track(operation); this.notify(); return operation;
	}
	private applySession(session: Session): void {
		if (session.id !== this.sessionId || session.kind !== 'group' || !session.groupMembers) throw local('GROUP_SESSION_INVALID');
		if (this.view.session && sequence(session.revision) < sequence(this.view.session.revision)) return;
		if (this.view.session && membership(session) !== membership(this.view.session)) this.invalidateHistory(false);
		this.view = { ...this.view, session: structuredClone(session) }; this.events.sessionChanged(session); this.notify();
	}
	async refreshSession(): Promise<void> {
		const bot = this.requireBot('sessions.get'), generation = this.generation;
		const controller = new AbortController(); this.controllers.add(controller);
		const operation = bot.sessions.get({ profileId: this.profileId, id: this.sessionId }, { signal: controller.signal });
		try { const session = await this.track(operation); if (!this.disposed && generation === this.generation && bot === this.bot) this.applySession(session); }
		finally { this.controllers.delete(controller); }
	}
	async updateMembers(command: Omit<BotMethodMap['sessions.updateMembers']['params'], 'id' | 'expectedRevision'>): Promise<Session> {
		const bot = this.requireBot('sessions.updateMembers'); this.meta(command, bot);
		const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
		try {
			const result = await this.track(bot.sessions.updateMembers({ ...structuredClone(command), id: this.sessionId, expectedRevision: this.session().revision }, { signal: controller.signal }));
			if (!this.disposed && generation === this.generation && bot === this.bot) this.applySession(result); return result;
		} finally { this.controllers.delete(controller); }
	}
	async setCoordinator(command: Omit<BotMethodMap['sessions.setCoordinator']['params'], 'id' | 'expectedRevision'>): Promise<Session> {
		const bot = this.requireBot('sessions.setCoordinator'); this.meta(command, bot);
		const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
		try {
			const result = await this.track(bot.sessions.setCoordinator({ ...structuredClone(command), id: this.sessionId, expectedRevision: this.session().revision }, { signal: controller.signal }));
			if (!this.disposed && generation === this.generation && bot === this.bot) this.applySession(result); return result;
		} finally { this.controllers.delete(controller); }
	}
	watchRun(run: Run): EventSubscription {
		if (this.disposed || run.sessionId !== this.sessionId || run.group?.sessionId !== this.sessionId) throw local('GROUP_RUN_MISMATCH');
		const session = this.session(), stream = this.events.attach(run.id, run.group, run.revision); this.events.sessionChanged(session);
		if (this.disposed) { stream.dispose(); throw local('GROUP_CLIENT_DISPOSED'); }
		this.streams.add(stream);
		let disposed = false;
		return { getSnapshot: () => stream.getSnapshot(), refresh: () => stream.refresh(), subscribe: listener => stream.subscribe(listener), dispose: () => {
			if (disposed) return; disposed = true; this.streams.delete(stream); stream.dispose();
		} };
	}
	refreshHistory(): Promise<void> { return this.readHistory(true); }
	loadMoreHistory(): Promise<void> { return this.readHistory(false); }
	/** Explicit paging window change. The cursor remains server-issued and is never derived from a message ID/seq. */
	resetHistoryWindow(cursor?: string): void {
		if (this.disposed) throw local('GROUP_CLIENT_DISPOSED');
		this.invalidateHistory(true); this.view = { ...this.view, history: { ...this.view.history, nextCursor: cursor } }; this.notify();
	}
	private readHistory(reset: boolean): Promise<void> {
		if (this.pendingHistory && !reset) return this.pendingHistory;
		if (!reset && this.loadedHistory && !this.view.history.nextCursor) return Promise.resolve();
		let bot: BotClient; try { bot = this.requireBot('sessions.history'); } catch (error) { return Promise.reject(error instanceof Error ? error : local('GROUP_CONNECTION_UNAVAILABLE', 'HOST_UNAVAILABLE')); }
		if (reset) this.invalidateHistory(false);
		const generation = this.historyGeneration, clientGeneration = this.generation, controller = new AbortController(); this.historyController = controller;
		const cursor = reset ? undefined : this.view.history.nextCursor;
		this.view = { ...this.view, history: { ...this.view.history, state: 'reading', error: undefined } };
		const current = () => !this.disposed && !controller.signal.aborted && generation === this.historyGeneration && clientGeneration === this.generation && bot === this.bot;
		const operation = Promise.resolve().then(async () => {
			if (!current()) return;
			try {
				const page = await bot.sessions.history({ profileId: this.profileId, sessionId: this.sessionId, limit: 100, ...(cursor ? { cursor } : {}) }, { signal: controller.signal });
				if (!current()) return;
				if (page.nextCursor && page.nextCursor === cursor) throw new TranscriptError('GROUP_HISTORY_INVALID');
				const transcript = mergePublicMessages(reset ? emptyTranscript(this.sessionId) : this.view.history.transcript, page.items);
				this.loadedHistory = true; this.view = { ...this.view, history: { state: 'ready', transcript, nextCursor: page.nextCursor } };
			} catch (error) {
				if (!current()) return;
				const failure = safe(error);
				this.view = { ...this.view, history: { state: 'paused', transcript: failure.kind === 'RESOURCE_LIMIT' ? this.view.history.transcript : emptyTranscript(this.sessionId),
					...(failure.kind === 'RESOURCE_LIMIT' ? { nextCursor: cursor } : {}), error: failure } };
				if (failure.kind === 'CAPABILITY_DENIED') this.events.accessChanged(this.sessionId);
			} finally {
				if (current()) { this.historyController = undefined; this.pendingHistory = undefined; this.notify(); }
			}
		});
		this.pendingHistory = this.track(operation); this.notify(); return operation;
	}
	private invalidateHistory(clear: boolean): void {
		this.historyGeneration++; this.historyController?.abort(); this.historyController = undefined; this.pendingHistory = undefined; this.loadedHistory = false;
		this.view = { ...this.view, history: { state: 'paused', transcript: clear ? emptyTranscript(this.sessionId) : this.view.history.transcript } };
	}
	/** Grant revocation is different from member removal: previously public source-derived bodies are not exempt. */
	permissionsChanged(): void { if (!this.disposed) { this.invalidateHistory(true); this.events.accessChanged(this.sessionId); this.notify(); } }
	setClient(bot: BotClient | undefined): void {
		if (this.disposed) return;
		this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
		this.generation++; for (const controller of this.controllers) controller.abort(); this.pendingSend = undefined;
		this.bot = bot; this.invalidateHistory(true); this.events.setClient(bot);
		if (bot && bot.hello.profile.profileId !== this.profileId) this.view = { ...this.view, session: undefined };
		this.view = { ...this.view, send: { state: 'error', error: { kind: 'HOST_UNAVAILABLE', reason: 'GROUP_CONNECTION_UNAVAILABLE' } } }; this.bindClose(); this.notify();
	}
	private bindClose(): void {
		const bot = this.bot; if (!bot) return;
		this.unsubscribeClose = bot.onClose(() => { if (this.bot === bot) this.setClient(undefined); });
	}
	async drained(): Promise<void> { await Promise.allSettled(this.operations); }
	dispose(): void {
		if (this.disposed) return;
		this.setClient(undefined); this.disposed = true;
		this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
		for (const stream of this.streams) stream.dispose(); this.streams.clear(); this.events.dispose();
		this.view = { ...this.view, history: { state: 'closed', transcript: emptyTranscript(this.sessionId) } }; this.notify(); this.listeners.clear();
	}
}
