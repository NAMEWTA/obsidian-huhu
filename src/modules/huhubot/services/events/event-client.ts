import type { BotClient, BotErrorData, EventPage, GroupBinding, Run, Session } from '../../api';
import { BotRpcError, type ProtocolTimers } from '../../core/protocol/connection';
import { applyEventPage, clearEventBodies, emptyProjection, EventProjectionError, restoreEventSnapshot, sequence, type EventProjection } from '../../core/events/reducer';

const DEFAULT_PAGE_BYTES = 65_536;
const MAX_PAGE_BYTES = 524_288;
function groupKey(group: GroupBinding): string {
	return JSON.stringify([group.sessionId, group.members.map(member => [member.agentId, member.incarnation, member.historyRevision]).sort((a, b) => {
		const left = JSON.stringify(a), right = JSON.stringify(b); return left < right ? -1 : left > right ? 1 : 0;
	})]);
}

export interface EventClientOptions { poll?: boolean }
export interface EventView { projection: EventProjection; state: 'idle' | 'reading' | 'ready' | 'paused' | 'closed'; error?: Pick<BotErrorData, 'kind' | 'reason'> }
export interface EventSubscription {
	getSnapshot(): EventView;
	subscribe(listener: () => void): () => void;
	refresh(): Promise<void>;
	dispose(): void;
}
interface Entry {
	view: EventView;
	listeners: Set<() => void>;
	owners: number;
	generation: number;
	pageBytes: number;
	group?: GroupBinding;
	runRevision?: string;
	session?: Session;
	needsAnchor?: boolean;
	groupDenied?: boolean;
	controller?: AbortController;
	pending?: Promise<void>;
	cancelTimer?: () => void;
}

/** Stable immutable snapshots can be consumed by a page selector without a second projection store. */
function immutable<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		for (const child of Object.values(value)) immutable(child);
		Object.freeze(value);
	}
	return value;
}

/** In-memory event projection shared by page consumers. Only BotClient reads the server; no commands are replayed. */
export class EventClient {
	private readonly entries = new Map<string, Entry>();
	private disposed = false;
	private profileId?: string;
	private unsubscribeClose?: () => void;
	constructor(private bot: BotClient | undefined, private readonly timers: ProtocolTimers, private readonly options: EventClientOptions = {}) { this.profileId = bot?.hello.profile.profileId; this.bindClose(); }

	attach(runId: string, group?: GroupBinding, runRevision?: string): EventSubscription {
		if (this.disposed) throw new EventProjectionError('EVENT_CLIENT_DISPOSED');
		let entry = this.entries.get(runId);
		if (!entry) {
			if (this.entries.size >= 16) throw new EventProjectionError('EVENT_STREAM_LIMIT');
			entry = { view: { projection: emptyProjection(runId), state: 'idle' }, listeners: new Set(), owners: 0, generation: 0, pageBytes: DEFAULT_PAGE_BYTES };
			this.entries.set(runId, entry);
		}
		if (group) {
			const changed = this.bindGroup(entry, group, runRevision);
			if (!this.currentGroup(entry)) entry.groupDenied = true;
			if (changed || entry.groupDenied) this.invalidate(entry, 'paused');
		}
		if (entry.owners >= 16) throw new EventProjectionError('EVENT_OWNER_LIMIT');
		entry.owners++;
		const selected = entry;
		let detached = false;
		const listeners = new Set<() => void>();
		if (this.options.poll !== false && !entry.pending && !entry.cancelTimer) this.schedule(entry, 0);
		return {
			getSnapshot: () => immutable(selected.view),
			subscribe: (listener) => {
				if (detached || this.disposed) return () => undefined;
				if (selected.listeners.size >= 256) throw new EventProjectionError('EVENT_LISTENER_LIMIT');
				const wrapped = () => listener();
				selected.listeners.add(wrapped); listeners.add(wrapped);
				return () => { selected.listeners.delete(wrapped); listeners.delete(wrapped); };
			},
			refresh: () => detached ? Promise.resolve() : this.refresh(selected),
			dispose: () => {
				if (detached) return;
				detached = true;
				for (const listener of listeners) selected.listeners.delete(listener);
				listeners.clear();
				if (--selected.owners === 0) {
					this.invalidate(selected, 'closed');
					this.entries.delete(runId);
				}
			},
		};
	}
	/** Resume reuses a Run identity. Discard its old page before re-reading current server authorization. */
	reanchor(runId: string): Promise<void> {
		const entry = this.entries.get(runId);
		if (this.disposed || !entry || entry.groupDenied || entry.view.state === 'closed') return Promise.resolve();
		entry.needsAnchor = true;
		this.invalidate(entry, 'paused');
		return this.refresh(entry);
	}
	/** Owner reconnects with a new BotClient. Lost authorization or connection never revives an old pending page. */
	setClient(bot: BotClient | undefined): void {
		if (this.disposed) return;
		const profileChanged = bot && this.profileId !== bot.hello.profile.profileId;
		if (bot) this.profileId = bot.hello.profile.profileId;
		this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
		this.bot = bot;
		this.bindClose();
		for (const entry of this.entries.values()) {
			if (profileChanged) entry.view = { projection: emptyProjection(entry.view.projection.runId), state: 'paused' };
			if (entry.group) entry.needsAnchor = true;
			this.invalidate(entry, 'paused');
			if (this.bot && this.options.poll !== false) this.schedule(entry, 0);
		}
	}
	/** Bind to the owning module's Host lease lifecycle; page detach uses its subscription.dispose(). */
	leaseChanged(): void {
		for (const entry of this.entries.values()) this.invalidate(entry, 'paused');
	}
	/** Source grants can change without changing membership or the Host lease. */
	accessChanged(sessionId?: string): void {
		for (const entry of this.entries.values()) if (sessionId === undefined || entry.group?.sessionId === sessionId) this.invalidate(entry, 'paused');
	}
	/** Run proofs only accumulate complete contributor tuples at a strictly newer Run revision. */
	private bindGroup(entry: Entry, group: GroupBinding, revision?: string): boolean {
		if (entry.runRevision && revision && sequence(revision) < sequence(entry.runRevision)) return false;
		if (entry.group && groupKey(entry.group) !== groupKey(group)) {
			const sameTuple = (member: GroupBinding['members'][number]) => group.members.some(next => next.agentId === member.agentId &&
				next.incarnation === member.incarnation && next.historyRevision === member.historyRevision);
			if (!revision || !entry.runRevision || sequence(revision) <= sequence(entry.runRevision) || group.sessionId !== entry.group.sessionId ||
				group.members.length <= entry.group.members.length || !entry.group.members.every(sameTuple)) throw new EventProjectionError('EVENT_GROUP_BINDING_CONFLICT');
			entry.group = structuredClone(group); entry.runRevision = revision;
			return true;
		}
		if (!entry.group) entry.group = structuredClone(group);
		if (revision) entry.runRevision = revision;
		return false;
	}
	private currentGroup(entry: Entry): boolean {
		const group = entry.group, session = entry.session;
		return !group || !session || (session.kind === 'group' && group.sessionId === session.id && group.members.every(member =>
			session.memberIds.includes(member.agentId) && session.groupMembers?.some(current => current.agentId === member.agentId &&
				current.incarnation === member.incarnation && current.historyRevision === member.historyRevision)));
	}
	private anchorRun(entry: Entry, run: Run): void {
		if (run.id !== entry.view.projection.runId || (run.group && run.group.sessionId !== run.sessionId) ||
			(entry.group && (!run.group || run.sessionId !== entry.group.sessionId)) ||
			(entry.runRevision && sequence(run.revision) < sequence(entry.runRevision))) throw new EventProjectionError('EVENT_GROUP_BINDING_CONFLICT');
		const changed = run.group ? this.bindGroup(entry, run.group, run.revision) : false;
		if (!run.group) entry.runRevision = run.revision;
		if (changed) entry.view = { ...entry.view, projection: clearEventBodies(entry.view.projection) };
		if (!this.currentGroup(entry)) { entry.groupDenied = true; throw new BotRpcError(-32000, { kind: 'CAPABILITY_DENIED', reason: 'GROUP_MEMBERSHIP_CHANGED', retryable: false, correlationId: 'events' }); }
		entry.needsAnchor = false;
	}
	/** A membership change can conceal a newly consumed private contributor not yet observed by this client.
	 * Abort every Run page in this Session; re-read current Run proof before rebuilding any body. Public History is separate. */
	sessionChanged(session: Session): void {
		const fingerprint = (value: Session) => JSON.stringify([ [...value.memberIds].sort(), groupKey({ sessionId: value.id, members: value.groupMembers ?? [] }) ]);
		for (const entry of this.entries.values()) {
			if (entry.group?.sessionId !== session.id) continue;
			const changed = entry.session && fingerprint(entry.session) !== fingerprint(session);
			entry.session = structuredClone(session);
			if (entry.groupDenied) continue;
			if (!this.currentGroup(entry)) {
				entry.groupDenied = true; this.invalidate(entry, 'paused', true);
			} else if (changed) {
				entry.needsAnchor = true; this.invalidate(entry, 'paused');
				if (this.bot && this.options.poll !== false) this.schedule(entry, 0);
			}
		}
	}
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
		this.bot = undefined;
		for (const entry of this.entries.values()) {
			this.invalidate(entry, 'closed');
			entry.listeners.clear();
		}
		this.entries.clear();
	}
	private bindClose(): void {
		const bot = this.bot;
		if (!bot) return;
		this.unsubscribeClose = bot.onClose(() => {
			if (this.bot !== bot) return;
			this.bot = undefined;
			this.unsubscribeClose?.(); this.unsubscribeClose = undefined;
			for (const entry of this.entries.values()) this.invalidate(entry, 'paused');
		});
	}
	private notify(entry: Entry): void {
		for (const listener of [...entry.listeners]) {
			try { listener(); } catch { /* A view failure must not retain a response or stop permission checks. */ }
		}
	}
	private invalidate(entry: Entry, state: EventView['state'], denied = false): void {
		entry.generation++;
		entry.pageBytes = DEFAULT_PAGE_BYTES;
		entry.controller?.abort(); entry.controller = undefined;
		entry.cancelTimer?.(); entry.cancelTimer = undefined;
		entry.pending = undefined;
		entry.view = { projection: clearEventBodies(entry.view.projection, denied || entry.groupDenied ? 'denied' : 'unknown'), state,
			...(entry.groupDenied ? { error: { kind: 'CAPABILITY_DENIED' as const, reason: 'GROUP_MEMBERSHIP_CHANGED' } } : {}) };
		this.notify(entry);
	}
	private schedule(entry: Entry, delay: number): void {
		entry.cancelTimer?.();
		entry.cancelTimer = this.timers.after(delay, () => {
			entry.cancelTimer = undefined;
			void this.refresh(entry);
		});
	}
	private refresh(entry: Entry): Promise<void> {
		if (entry.pending) return entry.pending;
		if (this.disposed || !this.bot || entry.groupDenied || entry.view.state === 'closed') return Promise.resolve();
		entry.cancelTimer?.(); entry.cancelTimer = undefined;
		const generation = entry.generation, bot = this.bot;
		const controller = new AbortController(); entry.controller = controller;
		entry.view = { ...entry.view, state: 'reading', error: undefined };
		const current = () => !this.disposed && !controller.signal.aborted && entry.generation === generation && this.bot === bot;
		// At most one response is pending per Run; callbacks receive no response/body queue.
		const operation = Promise.resolve().then(async () => {
			if (!current()) return;
			let immediate = false;
			try {
				if (entry.needsAnchor) {
					const run = await bot.runs.get({ profileId: bot.hello.profile.profileId, id: entry.view.projection.runId }, { signal: controller.signal, timeoutMs: 3000 });
					if (!current()) return;
					this.anchorRun(entry, run);
				}
				const query = { profileId: bot.hello.profile.profileId, runId: entry.view.projection.runId,
					afterSeq: entry.view.projection.seq, limit: 64, maxBytes: entry.pageBytes, waitMillis: this.options.poll === false ? 0 : 1000 };
				const options = { signal: controller.signal, timeoutMs: 3000 };
				let page: EventPage;
				try { page = await bot.runs.subscribe(query, options); }
				catch (error) {
					if (!current()) return;
					if (!(error instanceof BotRpcError) || error.data.kind !== 'RESOURCE_LIMIT' ||
						error.data.reason !== 'EVENT_PAGE_TOO_SMALL' || query.maxBytes >= MAX_PAGE_BYTES) throw error;
					// A legal text event plus JSON/provenance can exceed 64KiB. Retry this exact cursor once, within the existing HAP cap.
					entry.pageBytes = MAX_PAGE_BYTES;
					page = await bot.runs.subscribe({ ...query, maxBytes: MAX_PAGE_BYTES }, options);
				}
				if (!current()) return;
				const update = applyEventPage(entry.view.projection, page);
				if (update.needsBackfill && update.projection.seq === entry.view.projection.seq) throw new EventProjectionError('EVENT_LOG_GAP');
				entry.view = { projection: update.projection, state: 'ready' };
				immediate = page.hasMore || update.needsBackfill;
			} catch (error) {
				if (!current()) return;
				if (error instanceof BotRpcError && error.data.kind === 'CURSOR_EXPIRED' && error.data.details) {
					try {
						this.anchorRun(entry, error.data.details.snapshot.run);
						entry.view = { projection: restoreEventSnapshot(entry.view.projection, error.data.details), state: 'ready' };
						immediate = true;
					} catch (invalid) {
						if (invalid instanceof BotRpcError) this.fail(entry, invalid.data.kind, invalid.data.reason);
						else this.fail(entry, 'CONFLICT', 'EVENT_SNAPSHOT_INVALID');
					}
				} else if (error instanceof BotRpcError && error.data.kind === 'INVALID_ARGUMENT' && error.data.reason === 'EVENT_CURSOR_AHEAD') {
					entry.view = { projection: emptyProjection(entry.view.projection.runId), state: 'ready' };
					immediate = true;
				} else if (error instanceof BotRpcError) this.fail(entry, error.data.kind, error.data.reason);
				else this.fail(entry, error instanceof EventProjectionError ? (error.reason.endsWith('_LIMIT') ? 'RESOURCE_LIMIT' : 'CONFLICT') : 'HOST_UNAVAILABLE',
					error instanceof EventProjectionError ? error.reason : 'EVENT_CONNECTION_UNAVAILABLE');
			} finally {
				if (current()) {
					entry.controller = undefined; entry.pending = undefined;
					this.notify(entry);
					if (this.options.poll !== false && entry.view.state === 'ready') this.schedule(entry, immediate ? 0 : 50);
				}
			}
		});
		entry.pending = operation;
		this.notify(entry);
		return operation;
	}
	private fail(entry: Entry, kind: BotErrorData['kind'], reason: string): void {
		entry.view = { projection: clearEventBodies(entry.view.projection, kind === 'CAPABILITY_DENIED' ? 'denied' : 'unknown'),
			state: 'paused', error: { kind, reason } };
	}
}
