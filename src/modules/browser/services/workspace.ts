import { createStore } from 'zustand/vanilla';
import type { BrowserWorkspace, BrowserAgentAccess, BrowserMaterial, BrowserMaterialConsumer } from '../api';
import {
	AgentBrowserError,
	type BrowserPersistence,
	type BrowserRuntimeFactory,
	type BrowserRuntime,
	type BrowserSpace,
	type BrowserPage,
	type BrowserWorkspaceState,
	type ControlLease,
	type BrowserRun,
	type RunGrant,
	type BrowserCommand,
	type BrowserObservation,
	type SnapshotOptions,
	type HumanPageRequest,
	type HumanInput,
	type BrowserFrame,
	type FrameSubscription,
	type CreateSpaceRequest,
	type RuntimeEvent,
	type JsonValue,
	type OperationRecord,
	type OperationScope,
	type BrowserRunHealth,
	type BrowserRunEvent,
	type BrowserEventType,
	type BrowserEventSnapshot,
	type BrowserHandoffRequest,
} from '../core/contracts';
import type { IdentitySummary, IdentityImportPreview, IdentitySource, IdentityProvisionPhase, IdentitySaveReceipt } from '../core/identity';
import type { IdentityProvisionResult } from './identity-provision';
import type { BrowserFile, BrowserDownload, BrowserFileScope } from '../core/files';
import { normalizeBrowserNavigationUrl } from '../core/url';
import { assertRunAuthority, confirmControlAck, isCurrentLease, validateExecutionRef } from '../core/authority';
import { validatePageUrl, humanInputSchema } from '../core/protocol';
import { OperationLedger, operationErrorCode } from './operation-ledger';
import { FrameBroker } from './frame-broker';
import { RunEvents, type RunEventInput } from './run-events';

const clone = <T>(v: T): T => structuredClone(v);
const uuid = /^[a-zA-Z0-9_-]{8,128}$/;
const agentCommands = new Set([
	'navigate',
	'back',
	'forward',
	'reload',
	'stop',
	'snapshot',
	'text',
	'screenshot',
	'click',
	'fill',
	'type',
	'select',
	'wait',
	'press',
	'scroll',
	'upload',
]);
interface RunEntry {
	freshObservationPage?: string;
	run: BrowserRun;
	capability: string;
}
export interface BrowserWorkspaceExtensions {
	seed?(versionId: string, space: BrowserSpace, runtime: BrowserRuntime, control: { isCancelled(): boolean; progress(phase: IdentityProvisionPhase): void }): Promise<IdentityProvisionResult | void>;
	identities: {
		list(): IdentitySummary[];
		refresh?(): Promise<void>;
		refreshPending?(): boolean;
		prepareText(label: string, text: string): Promise<IdentityImportPreview>;
		prepareFile(label: string, signal?: AbortSignal): Promise<IdentityImportPreview | undefined>;
		prepareSource(request: { sourceId: string; profileId?: string; label: string; signal?: AbortSignal }): Promise<IdentityImportPreview>;
		commit(request: { planId: string; persist: boolean; domains?: string[] }): Promise<IdentitySaveReceipt>;
		discard(planId: string): void;
		sources(): Promise<IdentitySource[]>;
		remove(id: string): Promise<void>;
		save(runtime: BrowserRuntime, label: string, persist: boolean, validate: () => void, signal?: AbortSignal): Promise<IdentitySaveReceipt>;
		dispose(): Promise<void>;
	};
	files: {
		listFiles(scope: BrowserFileScope): BrowserFile[];
		listDownloads(scope: BrowserFileScope): BrowserDownload[];
		listSpaceFiles(spaceId: string): BrowserFile[];
		listSpaceDownloads(spaceId: string): BrowserDownload[];
		chooseUpload(scope: BrowserFileScope): Promise<BrowserFile | undefined>;
		consumeUpload(fileId: string, scope: BrowserFileScope): Promise<{ path: string; expiresAt: number }>;
		exportFile(spaceId: string, fileId: string): Promise<void>;
		removeFile(fileId: string): Promise<void>;
		removeSpace(spaceId: string): Promise<void>;
		retryCleanup?(spaceId: string): Promise<void>;
		dispose(): Promise<void>;
		download(event: Extract<RuntimeEvent, { kind: 'download' }>, scope: BrowserFileScope): Promise<void>;
	};
	renderViewer(scope: { spaceId: string; pageId: string }): Promise<unknown>;
	connection(spaceId: string, grant: RunGrant, allowTaskCreation: boolean): Promise<string>;
	materials(): Promise<readonly BrowserMaterialConsumer[]>;
	cleanupPending?(): number;
	retryCleanup?(): Promise<void>;
	scheduleInterval?(callback: () => void, milliseconds: number): () => void;
}

/** Browser owns process lifetime. Views only subscribe; Agent sessions never own or launch Chromium. */
export class BrowserWorkspaceService implements BrowserWorkspace, BrowserAgentAccess {
	private readonly store = createStore<BrowserWorkspaceState>(() => ({
		ready: false,
		readOnly: false,
		availability: { state: 'missing' },
		persistence: 'unavailable',
		ephemeralConsent: false,
		spaces: [],
		requests: [],
		cleanupPending: 0,
	}));
	private readonly spaces = new Map<string, BrowserSpace>();
	private readonly runtimes = new Map<string, BrowserRuntime>();
	private readonly unlisten = new Map<string, () => void>();
	private readonly runs = new Map<string, RunEntry>();
	private readonly eventsStore: RunEvents;
	private readonly eventStates = new Map<string, { space: string; control: string; cleanup: string; pages: Map<string, string> }>();
	private readonly cleanupStates = new Map<string, 'pending' | 'failed' | 'completed'>();
	private readonly controls = new Map<string, Promise<unknown>>();
	private readonly actions = new Map<string, Promise<unknown>>();
	private readonly intents = new Map<string, number>();
	private readonly pendingHumans = new Map<string, { viewerId: string; intent: number }>();
	private queuedActions = 0;
	private readonly renewals = new Set<string>();
	private readonly starts = new Map<string, Promise<void>>();
	private readonly stops = new Map<string, Promise<void>>();
	private readonly inputSequences = new Map<string, number>();
	private readonly materialObservations = new Map<string, { request: HumanPageRequest; observation: BrowserObservation }>();
	private readonly downloadOwners = new Map<string, BrowserFileScope>();
	private readonly ledger: OperationLedger;
	private ledgerStarted = false;
	private readonly workspaceAuthority: string;
	private ledgerMaintenanceAt = 0;
	private readonly frames: FrameBroker;
	private catalogWrite: Promise<unknown> = Promise.resolve();
	private stopTimer: (() => void) | undefined;
	private closing = false;
	constructor(
		private readonly persistence: BrowserPersistence,
		private readonly factory: BrowserRuntimeFactory,
		private readonly extra: BrowserWorkspaceExtensions,
		private readonly now = () => Date.now(),
	) {
		this.workspaceAuthority = persistence.id();
		this.eventsStore = new RunEvents(() => persistence.id(), now);
		this.ledger = new OperationLedger(persistence, now, scope => this.operationWritable(scope), undefined, (scope, operation, retired) => {
			const entry = scope.principal === 'agent' ? this.runs.get(scope.issuerId) : undefined;
			if (!entry || entry.run.spaceId !== scope.spaceId || entry.run.runtimeId !== scope.runtimeId) return;
			this.eventsStore.append(entry.run.id, { kind: 'operationChanged', spaceId: entry.run.spaceId, runtimeId: entry.run.runtimeId, epoch: scope.epoch, entityId: operation.id, state: retired ? 'removed' : operation.state });
		});
		this.frames = new FrameBroker(async (spaceId, pageId, on) => {
			await this.runtimes.get(spaceId)?.watch(pageId, on);
		});
	}
	getState = (): BrowserWorkspaceState => this.store.getState();
	subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);
	private notify() {
		this.projectEvents();
		this.store.setState({
			spaces: [...this.spaces.values()].map(clone),
			identityRefreshPending: this.extra.identities.refreshPending?.() ?? false,
			cleanupPending:
				[...this.spaces.values()].filter((s) => s.status === 'cleanup_pending' || s.status === 'quarantined')
					.length + [...this.spaces.values()].reduce((count, space) => count + this.extra.files.listSpaceDownloads(space.id).filter(item => item.cleanup === 'pending').length, 0) + (this.extra.cleanupPending?.() ?? 0),
		});
	}
	private emitSpace(spaceId: string, type: BrowserEventType, detail: Partial<RunEventInput> = {}) {
		const space = this.spaces.get(spaceId), live = type === 'pageChanged' || type === 'humanRequest' || type === 'downloadChanged';
		for (const { run } of this.runs.values()) {
			if (run.spaceId !== spaceId || live && (run.state !== 'active' || run.expiresAt <= this.now() || run.runtimeId !== space?.runtimeId)) continue;
			this.eventsStore.append(run.id, { ...detail, kind: detail.kind ?? type, type, spaceId, runtimeId: run.runtimeId, epoch: space?.control.epoch ?? run.epoch });
		}
	}
	private projectEvents() {
		for (const s of this.spaces.values()) {
			const previous = this.eventStates.get(s.id), cleanup = this.cleanupState(s);
			const current = { space: JSON.stringify([s.kind, s.status, s.runtimeId, s.label]), control: JSON.stringify([s.control.mode, s.control.epoch]), cleanup, pages: new Map(s.pages.map(page => [page.id, JSON.stringify(page)])) };
			if (previous?.space !== current.space) this.emitSpace(s.id, 'spaceChanged', { entityId: s.id, state: s.status });
			if (previous?.control !== current.control) this.emitSpace(s.id, 'controlChanged', { entityId: s.id, state: s.control.mode });
			if (previous?.cleanup !== cleanup) this.emitSpace(s.id, 'cleanupChanged', { entityId: s.id, state: cleanup });
			for (const page of s.pages) if (previous?.pages.get(page.id) !== current.pages.get(page.id)) this.emitSpace(s.id, 'pageChanged', { kind: page.status === 'closed' ? 'page-closed' : 'page', entityId: page.id, pageId: page.id, state: page.status });
			for (const pageId of previous?.pages.keys() ?? []) if (!current.pages.has(pageId)) this.emitSpace(s.id, 'pageChanged', { kind: 'page-closed', entityId: pageId, pageId, state: 'removed' });
			this.eventStates.set(s.id, current);
		}
		for (const spaceId of this.eventStates.keys()) if (!this.spaces.has(spaceId)) {
			this.emitSpace(spaceId, 'spaceChanged', { entityId: spaceId, state: 'removed' }); this.emitSpace(spaceId, 'cleanupChanged', { entityId: spaceId, state: this.cleanupStates.get(spaceId) ?? 'completed' });
			this.eventStates.delete(spaceId); if (this.cleanupStates.get(spaceId) !== 'failed') this.cleanupStates.delete(spaceId);
		}
	}
	private cleanupState(s: BrowserSpace): 'pending' | 'failed' | 'completed' {
		return this.cleanupStates.get(s.id) ?? (s.status === 'cleanup_pending' ? 'pending' : s.status === 'quarantined' ? 'failed' : this.extra.files.listSpaceDownloads(s.id).some(item => item.cleanup === 'pending') ? 'pending' : 'completed');
	}
	private async persist() {
		const snapshot = [...this.spaces.values()].map((s) => ({
			...clone(s),
			control: { mode: 'paused' as const, epoch: s.control.epoch },
		}));
		const task = this.catalogWrite.then(() => this.persistence.write('catalog', snapshot));
		this.catalogWrite = task.catch(() => undefined);
		await task;
	}
	async initialize(): Promise<void> {
		await this.persistence.initialize();
		this.store.setState({
			readOnly: this.persistence.readOnly,
			persistence: await this.persistence.security(),
			availability: await this.factory.availability(),
		});
		if (this.persistence.readOnly) {
			this.store.setState({ ready: true, error: 'workspace_owned_elsewhere' });
			return;
		}
		await this.ledger.initialize();
		this.ledgerStarted = true;
		await this.ledger.prune();
		const saved = await this.persistence.read<BrowserSpace[]>('catalog');
		if (
			saved &&
			(!Array.isArray(saved) ||
				saved.length > 200 ||
				saved.some(
					(s) =>
						!s ||
						!uuid.test(s.id) ||
						!['personal', 'task'].includes(s.kind) ||
						!Array.isArray(s.pages) ||
						s.pages.length > 8 ||
						s.pages.some((p) => !uuid.test(p.id) || typeof p.url !== 'string'),
				))
		)
			throw new AgentBrowserError('catalog_corrupt');
		for (const savedSpace of saved ?? []) {
			const s = clone(savedSpace);
			s.control = { mode: 'paused', epoch: (s.control?.epoch ?? 0) + 1 };
			this.spaces.set(s.id, s);
			if (this.persistence.readOnly) {
				s.status = 'stopped';
				delete s.runtimeId;
				continue;
			}
			try {
				await this.factory.reclaim(s.id, s.runtimeId);
				if (s.retention === 'ephemeral' || s.status === 'cleanup_pending') {
					await this.extra.files.removeSpace(s.id);
					await this.factory.removeProfile(s.id);
					this.spaces.delete(s.id);
					continue;
				}
				s.status = 'stopped';
				delete s.runtimeId;
				s.pages = s.pages.map((p) => ({ ...p, status: 'pending', documentId: '' }));
			} catch (error) {
				s.status = 'quarantined';
				s.error = operationErrorCode(error);
			}
		}
		if (!this.persistence.readOnly) await this.persist();
		this.notify();
		this.store.setState({ ready: true });
		this.stopTimer = this.extra.scheduleInterval?.(() => {
			if (this.now() - this.ledgerMaintenanceAt >= 60_000) {
				this.ledgerMaintenanceAt = this.now();
				void this.ledger.prune().catch(error => this.store.setState({ error: operationErrorCode(error) }));
			}
			for (const { run } of this.runs.values())
				if (run.state === 'active' && run.expiresAt <= this.now())
					void this.pause(run.spaceId).catch(() => undefined);
			for (const s of this.spaces.values()) {
				const lease = s.control.lease;
				if (s.control.mode !== 'human' || !lease) continue;
				if (lease.expiresAt <= this.now() || !lease.viewerId || !this.frames.has(lease.viewerId, s.id)) {
					void this.pause(s.id).catch(() => undefined);
					continue;
				}
				if (
					lease.expiresAt - this.now() < 60000 &&
					lease.viewerId &&
					this.frames.has(lease.viewerId, s.id) &&
					!this.renewals.has(s.id)
				) {
					this.renewals.add(s.id);
					const renewed = { ...lease, expiresAt: this.now() + 120000 };
					void this.runtime(s)
						.setControl(renewed, lease.epoch)
						.then(ack => {
							confirmControlAck(ack, renewed.runtimeId, renewed.epoch);
							if (s.control.lease?.leaseId === lease.leaseId) s.control.lease = renewed;
						})
						.catch(() => {
							if (s.control.lease?.leaseId === lease.leaseId)
								void this.pause(s.id).catch(() => undefined);
						})
						.finally(() => this.renewals.delete(s.id));
				}
			}
		}, 1000);
	}
	private assertWritable() {
		if (this.closing) throw new AgentBrowserError('workspace_closing');
		if (this.persistence.readOnly || this.getState().readOnly)
			throw new AgentBrowserError('workspace_owned_elsewhere');
	}
	private operationWritable(scope: OperationScope): boolean {
		if (this.closing || this.persistence.readOnly || this.getState().readOnly) return false;
		if (scope.principal === 'workspace' && !scope.spaceId)
			return scope.issuerId === this.persistence.ownerId && scope.authorityId === this.workspaceAuthority;
		const space = scope.spaceId ? this.spaces.get(scope.spaceId) : undefined, lease = space?.control.lease;
		if (!space || !lease || lease.expiresAt <= this.now() || scope.runtimeId !== space.runtimeId || scope.epoch !== lease.epoch) return false;
		if (scope.principal === 'agent') {
			const run = this.runs.get(scope.issuerId)?.run;
			return !!run && run.state === 'active' && run.expiresAt > this.now() && run.leaseId === lease.leaseId && scope.authorityId === run.leaseId;
		}
		return scope.authorityId === lease.leaseId && (scope.principal === 'human'
			? space.control.mode === 'human' && lease.viewerId === scope.issuerId
			: space.control.mode === 'quiescing' && lease.mode === 'workspace' && scope.issuerId === this.persistence.ownerId);
	}
	private space(id: string) {
		const s = this.spaces.get(id);
		if (!s) throw new AgentBrowserError('space_not_found');
		return s;
	}
	private runtime(space: BrowserSpace) {
		const r = this.runtimes.get(space.id);
		if (!r || space.runtimeId !== r.id || space.status !== 'ready')
			throw new AgentBrowserError('runtime_not_ready');
		return r;
	}
	private page(space: BrowserSpace, id: string) {
		const p = space.pages.find((p) => p.id === id);
		if (!p) throw new AgentBrowserError('page_not_found');
		return p;
	}
	private queue<T>(map: Map<string, Promise<unknown>>, id: string, work: () => Promise<T>): Promise<T> {
		const isAction = map === this.actions;
		if (isAction && this.queuedActions >= 256) return Promise.reject(new AgentBrowserError('action_queue_full'));
		const key = isAction ? `${id}:${this.space(id).control.epoch}` : id;
		if (isAction) this.queuedActions++;
		const previous = map.get(key) ?? Promise.resolve(),
			task = previous.then(work, work);
		map.set(key, task);
		void task
			.finally(() => {
				if (map.get(key) === task) map.delete(key);
				if (isAction) this.queuedActions--;
			})
			.catch(() => undefined);
		return task;
	}
	resolveInput(input: string): string | null {
		const url = normalizeBrowserNavigationUrl(input, 'google');
		if (!url) return null;
		try {
			return validatePageUrl(url);
		} catch {
			return null;
		}
	}
	async consentEphemeral() {
		this.assertWritable();
		this.store.setState({ ephemeralConsent: true });
	}
	async installRuntimeBundle() {
		this.assertWritable();
		if (this.runtimes.size) throw new AgentBrowserError('runtime_in_use');
		await this.factory.installBundle();
		await this.refreshRuntime();
	}
	async refreshRuntime() {
		this.store.setState({ availability: await this.factory.availability() });
	}
	async createSpace(request: CreateSpaceRequest, requestId = this.persistence.id(), timeoutMs?: number): Promise<BrowserSpace> {
		this.assertWritable();
		const { signal, ...portableRequest } = request;
		const writable = () => { this.assertWritable(); if (signal?.aborted) throw new AgentBrowserError('cancelled'); };
		writable();
		if (request.kind !== 'personal' && request.kind !== 'task') throw new AgentBrowserError('invalid_space_kind');
		const ticket = await this.ledger.prepare(
			requestId,
			{ principal: 'workspace', issuerId: this.persistence.ownerId, authorityId: this.workspaceAuthority },
			{ kind: 'space.create', request: portableRequest },
			timeoutMs,
		);
		const result = await this.ledger.execute(
			ticket.id,
			{ kind: 'space.create', request: portableRequest },
			writable,
			async () => {
				if (this.spaces.size >= 200) throw new AgentBrowserError('space_quota');
				if (this.getState().availability.state !== 'ready') throw new AgentBrowserError('runtime_unavailable');
				if (
					this.getState().persistence !== 'secure' &&
					(!request.ephemeral || !this.getState().ephemeralConsent)
				)
					throw new AgentBrowserError('ephemeral_consent_required');
				const at = this.now(),
					id = this.persistence.id();
				const space: BrowserSpace = {
					id,
					label: (request.label ?? '').trim().slice(0, 120) || id.slice(0, 8),
					kind: request.kind,
					retention: request.ephemeral ? 'ephemeral' : 'persistent',
					identityVersionId: request.identityVersionId,
					status: 'provisioning',
					pages: [
						{
							id: this.persistence.id(),
							spaceId: id,
							url: validatePageUrl(request.url ?? 'about:blank'),
							title: '',
							documentId: '',
							status: 'pending',
							zoom: 1,
							viewportVersion: 0,
						},
					],
					control: { mode: 'paused', epoch: 0 },
					createdAt: at,
					updatedAt: at,
				};
				this.spaces.set(id, space);
				await this.persist();
				this.notify();
				try {
					await this.startOwned(space, true, signal);
					return { spaceId: id };
				} catch (error) {
					space.status = 'cleanup_pending';
					space.error = operationErrorCode(error);
					await this.persist();
					this.notify();
					try {
						await this.cleanupSpace(space);
					} catch {
						/* Durable cleanup remains visible. */
					}
					throw error;
				}
			},
		);
		if (
			result.state !== 'completed' ||
			!result.result ||
			typeof result.result !== 'object' ||
			Array.isArray(result.result) ||
			typeof result.result.spaceId !== 'string'
		)
			throw new AgentBrowserError(result.error ?? 'space_create_failed');
		return clone(this.space(result.result.spaceId));
	}
	async renameSpace(id: string, label: string) {
		this.assertWritable();
		const s = this.space(id);
		s.label = label.trim().slice(0, 120) || s.label;
		s.updatedAt = this.now();
		await this.persist();
		this.notify();
	}
	private async startOwned(space: BrowserSpace, fresh = false, signal?: AbortSignal): Promise<void> {
		if (this.stops.has(space.id)) throw new AgentBrowserError('space_stopping');
		if (this.starts.has(space.id)) return this.starts.get(space.id)!;
		const intent = (this.intents.get(space.id) ?? 0) + 1;
		this.intents.set(space.id, intent);
		const cancelled = () => this.closing || this.intents.get(space.id) !== intent || signal?.aborted === true;
		const check = () => { if (cancelled()) throw new AgentBrowserError('start_cancelled'); };
		const task = (async () => {
			this.assertWritable();
			if (new Set([...this.runtimes.keys(), ...this.starts.keys()].filter((id) => id !== space.id)).size >= 3)
				throw new AgentBrowserError('runtime_quota');
			if (!fresh && space.status !== 'stopped' && space.status !== 'faulted')
				throw new AgentBrowserError('space_not_stopped');
			if (this.getState().persistence !== 'secure' && !this.getState().ephemeralConsent)
				throw new AgentBrowserError('ephemeral_consent_required');
			space.status = fresh ? 'provisioning' : 'starting';
			space.runtimeId = this.persistence.id();
			let runtime: BrowserRuntime | undefined;
			let startAttempted = false;
			try {
				await this.persist();
				this.notify();
				await this.factory.reclaim(space.id);
				check();
				startAttempted = true;
				runtime = await this.factory.start({
					spaceId: space.id,
					runtimeId: space.runtimeId,
					ephemeral: space.retention === 'ephemeral',
				});
				this.runtimes.set(space.id, runtime);
				this.unlisten.set(
					space.id,
					runtime.onEvent((event) => this.onRuntime(space.id, event)),
				);
				check();
				let imported: IdentityProvisionResult | void = undefined;
				if (fresh && space.identityVersionId) {
					if (!this.extra.seed) throw new AgentBrowserError('identity_unavailable');
					space.identityImport = { phase: 'source' }; this.notify();
					imported = await this.extra.seed(space.identityVersionId, clone(space), runtime, { isCancelled: cancelled, progress: phase => { if (!cancelled()) { space.identityImport = { phase }; this.notify(); } } });
				}
				check();
				space.status = 'hydrating';
				this.notify();
				for (const page of space.pages) {
					check();
					try {
						Object.assign(page, await runtime.createPage(page.id, page.url), { status: 'open' as const });
					} catch (error) {
						page.status = 'failed';
						page.error = operationErrorCode(error);
						if (page.error === 'browser_page_cleanup_pending') throw error;
					}
					check();
				}
				if (space.pages.length && !space.pages.some((p) => p.status === 'open'))
					throw new AgentBrowserError('page_restore_failed');
				const epoch = space.control.epoch + 1;
				await runtime.setControl(undefined, epoch); check();
				// Ready publication begins here. A late UI cancellation does not undo a
				// completed new Space or claim its already published identity was rolled back.
				space.status = 'ready'; space.control = { mode: 'paused', epoch }; delete space.error;
				if (imported) space.identityImport = { phase: 'verified', ...imported };
				await this.persist();
				this.notify();
				await this.frames.restart(space.id);
			} catch (error) {
				try {
					await runtime?.stop();
					if (!runtime) await this.factory.reclaim(space.id, startAttempted ? space.runtimeId : undefined);
					this.runtimes.delete(space.id);
					this.unlisten.get(space.id)?.();
					this.unlisten.delete(space.id);
					space.status = 'faulted';
					delete space.runtimeId;
					space.control = { mode: 'paused', epoch: space.control.epoch };
				} catch {
					space.status = 'quarantined';
					space.control = { mode: 'blocked', epoch: space.control.epoch };
				}
				space.error = operationErrorCode(error);
				await this.persist();
				this.notify();
				throw error;
			}
		})();
		this.starts.set(space.id, task);
		try {
			await task;
		} finally {
			if (this.starts.get(space.id) === task) this.starts.delete(space.id);
		}
	}
	async startSpace(id: string) {
		this.assertWritable();
		await this.startOwned(this.space(id));
	}
	private revokeRuns(spaceId: string) {
		for (const entry of this.runs.values())
			if (entry.run.spaceId === spaceId && entry.run.state === 'active') {
				entry.run.state = 'revoked';
				this.eventsStore.seal(entry.run.id);
			}
		this.frames.reset(spaceId);
	}
	private newIntent(id: string) {
		const intent = (this.intents.get(id) ?? 0) + 1;
		this.intents.set(id, intent);
		this.revokeRuns(id);
		return intent;
	}
	private async changeControl(
		id: string,
		mode: 'paused' | 'agent' | 'human' | 'workspace',
		controllerId: string,
		viewer?: { viewerId: string; windowId: string },
	): Promise<ControlLease | undefined> {
		this.assertWritable();
		const s = this.space(id),
			runtime = this.runtime(s),
			intent = this.newIntent(id);
		this.pendingHumans.delete(id);
		if (mode === 'human' && viewer) this.pendingHumans.set(id, { viewerId: viewer.viewerId, intent });
		s.control = { mode: 'quiescing', epoch: s.control.epoch };
		this.notify();
		return this.queue(this.controls, id, async () => {
			if (this.intents.get(id) !== intent) throw new AgentBrowserError('control_superseded');
			try {
				const epoch = s.control.epoch + 1;
				s.control = { mode: 'quiescing', epoch };
				const ack = await runtime.setControl(undefined, epoch);
				confirmControlAck(ack, runtime.id, epoch, 'revocation_unconfirmed');
				if (this.intents.get(id) !== intent || this.closing || this.runtimes.get(id) !== runtime)
					throw new AgentBrowserError('control_superseded');
				if (mode === 'human' && (!viewer || !this.frames.has(viewer.viewerId, id)))
					throw new AgentBrowserError('viewer_not_registered');
				if (mode === 'paused') {
					s.control = { mode: 'paused', epoch };
					await this.persist();
					this.notify();
					return undefined;
				}
				const lease: ControlLease = {
					spaceId: id,
					runtimeId: runtime.id,
					epoch: epoch + 1,
					leaseId: this.persistence.id(),
					controllerId,
					mode,
					expiresAt: this.now() + 120_000,
					...viewer,
				};
				confirmControlAck(await runtime.setControl(lease, lease.epoch), runtime.id, lease.epoch);
				if (
					this.intents.get(id) !== intent ||
					this.closing ||
					this.runtimes.get(id) !== runtime ||
					(mode === 'human' && (!viewer || !this.frames.has(viewer.viewerId, id)))
				) {
					confirmControlAck(await runtime.setControl(undefined, lease.epoch + 1), runtime.id, lease.epoch + 1, 'revocation_unconfirmed');
					s.control = { mode: 'paused', epoch: lease.epoch + 1 };
					throw new AgentBrowserError('control_superseded');
				}
				s.control = { mode: mode === 'workspace' ? 'quiescing' : mode, epoch: lease.epoch, lease };
				await this.persist();
				this.notify();
				// Persistence and synchronous subscribers can supersede a completed native grant.
				if (this.intents.get(id) !== intent || this.closing || this.runtimes.get(id) !== runtime || !isCurrentLease(s, lease, this.now()) ||
					(mode === 'human' && (!viewer || !this.frames.has(viewer.viewerId, id))))
					throw new AgentBrowserError('control_superseded');
				return clone(lease);
			} catch (error) {
				if (this.intents.get(id) === intent) {
					s.control = { mode: 'blocked', epoch: s.control.epoch + 1 };
					try {
						confirmControlAck(await runtime.setControl(undefined, s.control.epoch), runtime.id, s.control.epoch, 'revocation_unconfirmed');
					} catch {
						try {
							await runtime.stop();
							s.status = 'stopped';
							this.runtimes.delete(id);
						} catch {
							s.status = 'quarantined';
						}
					}
					this.notify();
				}
				throw error;
			} finally {
				if (this.pendingHumans.get(id)?.intent === intent) this.pendingHumans.delete(id);
			}
		});
	}
	async takeover({ spaceId, viewerId, windowId }: { spaceId: string; viewerId: string; windowId: string }) {
		if (!this.frames.has(viewerId, spaceId)) throw new AgentBrowserError('viewer_not_registered');
		const lease = await this.changeControl(spaceId, 'human', viewerId, { viewerId, windowId });
		if (!lease) throw new AgentBrowserError('control_missing');
		if (!isCurrentLease(this.space(spaceId), lease, this.now())) throw new AgentBrowserError('control_superseded');
		return lease;
	}
	async releaseViewer(spaceId: string, viewerId: string) {
		const space = this.spaces.get(spaceId);
		if (space?.control.lease?.viewerId === viewerId || this.pendingHumans.get(spaceId)?.viewerId === viewerId)
			await this.pause(spaceId);
	}
	async pause(id: string) {
		await this.changeControl(id, 'paused', 'workspace');
	}
	async resumeAgent(id: string): Promise<RunGrant> {
		return this.grantAgent(id);
	}
	/** The caller is the trusted user surface/coordinator, not the source Agent. Expected authority
	 * makes a lost response safe: replaying A's request cannot revoke the successor B. */
	async handoffAgent(request: BrowserHandoffRequest): Promise<RunGrant> {
		const target = validateExecutionRef(request.target), s = this.space(request.spaceId);
		if (s.kind !== 'task') throw new AgentBrowserError('personal_space_forbidden');
		const entry = this.runs.get(request.fromRunId);
		if (!entry || entry.run.spaceId !== s.id || entry.run.runtimeId !== request.runtimeId || entry.run.epoch !== request.expectedEpoch)
			throw new AgentBrowserError('control_superseded');
		this.authorize(entry.run.id, entry.capability);
		if (this.page(s, request.pageId).status !== 'open') throw new AgentBrowserError('page_not_ready');
		return this.grantAgent(s.id, { ...request, target });
	}
	private async grantAgent(id: string, handoff?: BrowserHandoffRequest): Promise<RunGrant> {
		const s = this.space(id);
		if (s.kind !== 'task') throw new AgentBrowserError('personal_space_forbidden');
		const runId = this.persistence.id(),
			lease = await this.changeControl(id, 'agent', runId);
		if (!lease) throw new AgentBrowserError('control_missing');
		if (!isCurrentLease(s, lease, this.now())) throw new AgentBrowserError('control_superseded');
		if (handoff && (lease.runtimeId !== handoff.runtimeId || this.page(s, handoff.pageId).status !== 'open')) {
			await this.pause(id);
			throw new AgentBrowserError('control_superseded');
		}
		const run: BrowserRun = {
			id: runId, spaceId: id, runtimeId: lease.runtimeId, issuerId: id,
			epoch: lease.epoch, leaseId: lease.leaseId, state: 'active', expiresAt: lease.expiresAt,
			...(handoff ? { execution: clone(handoff.target), handoff: { transitionId: this.persistence.id(), fromRunId: handoff.fromRunId, pageId: handoff.pageId } } : {}),
		};
		const capability = this.persistence.id() + this.persistence.id();
		this.runs.set(runId, { run, capability, ...(handoff ? { freshObservationPage: handoff.pageId } : {}) });
		this.eventsStore.open(runId);
		if (handoff) {
			const event = { kind: 'controlChanged' as const, spaceId: id, runtimeId: run.runtimeId, epoch: run.epoch, entityId: run.id, state: 'agent' as const };
			this.eventsStore.append(handoff.fromRunId, event); this.eventsStore.append(runId, event);
		}
		this.notify();
		this.authorize(runId, capability);
		return { run: clone(run), capability };
	}
	private requireFreshObservation(runId: string): void {
		if (this.runs.get(runId)?.freshObservationPage) throw new AgentBrowserError('fresh_observation_required');
	}
	async startRun(spaceId: string, issuerId: string): Promise<RunGrant> {
		const entry = [...this.runs.values()].find(
			(e) => e.run.spaceId === spaceId && e.run.state === 'active' && e.run.issuerId === issuerId,
		);
		if (!entry) throw new AgentBrowserError('user_run_grant_required');
		this.authorize(entry.run.id, entry.capability);
		return { run: clone(entry.run), capability: entry.capability };
	}
	async copyAgentConnection(spaceId: string, options?: { allowTaskCreation?: boolean }) {
		const entry = [...this.runs.values()].find((e) => e.run.spaceId === spaceId && e.run.state === 'active');
		if (!entry) throw new AgentBrowserError('user_run_grant_required');
		return this.extra.connection(spaceId, clone(entry), options?.allowTaskCreation === true);
	}
	private authorize(runId: string, capability: string) {
		this.assertWritable();
		const entry = this.runs.get(runId);
		if (!entry || entry.capability !== capability) throw new AgentBrowserError('capability_invalid');
		const { run } = entry, s = this.space(run.spaceId), lease = assertRunAuthority(s, run, this.now());
		return { s, run, lease, runtime: this.runtime(s) };
	}
	async stopRun(runId: string, capability: string) {
		const { run } = this.authorize(runId, capability);
		await this.pause(run.spaceId);
	}
	async heartbeat(runId: string, capability: string) {
		const { run, lease, runtime, s } = this.authorize(runId, capability);
		const expiresAt = this.now() + 120_000;
		confirmControlAck(await runtime.setControl({ ...lease, expiresAt }, lease.epoch), runtime.id, lease.epoch);
		this.authorize(runId, capability);
		run.expiresAt = expiresAt;
		s.control.lease = { ...lease, expiresAt };
		return expiresAt;
	}
	private human(request: HumanPageRequest) {
		const s = this.space(request.spaceId),
			runtime = this.runtime(s),
			lease = s.control.lease;
		this.page(s, request.pageId);
		if (
			s.control.mode !== 'human' ||
			!lease ||
			lease.expiresAt <= this.now() ||
			lease.leaseId !== request.leaseId ||
			lease.viewerId !== request.viewerId ||
			lease.epoch !== request.epoch ||
			lease.runtimeId !== runtime.id ||
			!this.frames.has(request.viewerId, s.id)
		)
			throw new AgentBrowserError('human_lease_expired');
		return { s, runtime, lease };
	}
	subscribeFrames(
		scope: { spaceId: string; pageId: string; viewerId: string; isAlive?: () => boolean },
		receive: (frame: BrowserFrame) => void,
	): FrameSubscription {
		this.page(this.space(scope.spaceId), scope.pageId);
		return this.frames.subscribe(scope, receive);
	}
	renderViewer(scope: { spaceId: string; pageId: string }) {
		return this.extra.renderViewer(scope);
	}
	private humanScope(request: HumanPageRequest): BrowserFileScope {
		return {
			spaceId: request.spaceId,
			execution: { kind: 'human', viewerId: request.viewerId, epoch: request.epoch },
		};
	}
	private runScope(run: BrowserRun): BrowserFileScope {
		return { spaceId: run.spaceId, execution: { kind: 'agent', runId: run.id } };
	}
	private validateRequest(s: BrowserSpace, request: HumanPageRequest, command: BrowserCommand) {
		if (command.kind !== 'dialog' && command.kind !== 'chooser') return;
		const pending = this.getState().requests.find((r) => r.id === command.requestId);
		if (
			!pending ||
			pending.status !== 'pending' ||
			pending.expiresAt <= this.now() ||
			pending.spaceId !== s.id ||
			pending.pageId !== request.pageId ||
			pending.runtimeId !== s.runtimeId ||
			pending.documentId !== this.page(s, request.pageId).documentId ||
			pending.epoch !== request.epoch ||
			pending.revision !== command.revision ||
			pending.kind !== (command.kind === 'dialog' ? 'dialog' : 'file-chooser')
		)
			throw new AgentBrowserError('request_expired');
	}
	private async uploadPaths(command: BrowserCommand, scope: BrowserFileScope) {
		if (command.kind !== 'upload' && command.kind !== 'chooser') return undefined;
		const paths: string[] = []; let expiresAt = Number.MAX_SAFE_INTEGER;
		for (const id of command.fileIds) { const item = await this.extra.files.consumeUpload(id, scope); paths.push(item.path); expiresAt = Math.min(expiresAt, item.expiresAt); }
		return { paths, expiresAt };
	}
	private uploadAuthority(lease: ControlLease, upload?: { paths: string[]; expiresAt: number }): ControlLease {
		if (!upload) return lease;
		if (upload.expiresAt <= this.now()) throw new AgentBrowserError('file_grant_invalid');
		return { ...lease, expiresAt: Math.min(lease.expiresAt, upload.expiresAt) };
	}
	private uploadRemaining(upload: { expiresAt: number } | undefined, remaining?: () => number): number {
		return Math.min(remaining?.() ?? 60000, upload ? upload.expiresAt - this.now() : 60000);
	}
	async pageAction(request: HumanPageRequest & { command: BrowserCommand }): Promise<JsonValue> {
		this.assertWritable();
		if (request.command.kind === 'input') throw new AgentBrowserError('human_input_requires_frame');
		const { s, lease } = this.human(request);
		this.validateRequest(s, request, request.command);
		if (request.command.kind === 'navigate') validatePageUrl(request.command.url);
		const record = await this.ledger.prepare(
			this.persistence.id(),
			{
				principal: 'human',
				issuerId: request.viewerId,
				authorityId: lease.leaseId,
				spaceId: s.id,
				pageId: request.pageId,
				runtimeId: s.runtimeId,
				epoch: lease.epoch,
			},
			request.command,
		);
		const dispatch = async () => {
			let paths: Awaited<ReturnType<BrowserWorkspaceService['uploadPaths']>>;
			return this.ledger.execute(
				record.id,
				request.command,
				async () => {
					this.human(request);
					this.validateRequest(s, request, request.command);
					paths = await this.uploadPaths(request.command, this.humanScope(request));
				},
				async () => {
					const current = this.human(request),
						geometry = request.command.kind === 'zoom' || request.command.kind === 'viewport';
					if (geometry) this.frames.barrier(s.id, request.pageId, true);
					try {
						const response = await current.runtime.execute(request.pageId, request.command, this.uploadAuthority(current.lease, paths), {
							uploadPaths: paths?.paths,
						});
						this.human(request);
						if (geometry) {
							const p = this.page(s, request.pageId);
							if (
								response &&
								typeof response === 'object' &&
								!Array.isArray(response) &&
								typeof response.viewportVersion === 'number'
							)
								p.viewportVersion = response.viewportVersion;
							this.frames.barrier(s.id, request.pageId, false, p.viewportVersion);
						}
						return response;
					} catch (error) {
						if (geometry) this.frames.invalidate(s.id, request.pageId);
						throw error;
					}
				},
				() => this.uploadRemaining(paths),
			);
		};
		// A click can await the very dialog/chooser this command answers. These
		// replies and stop retain their journal and authority checks, but must not
		// wait behind the page operation they are intended to unblock.
		const urgent = ['dialog', 'chooser', 'stop'].includes(request.command.kind);
		const result = await (urgent ? dispatch() : this.queue(this.actions, s.id, dispatch));
		if (result.state !== 'completed') throw new AgentBrowserError(result.error ?? result.state);
		return result.result ?? null;
	}
	async navigate(request: HumanPageRequest & { url: string }) {
		await this.pageAction({ ...request, command: { kind: 'navigate', url: validatePageUrl(request.url) } });
	}
	async readSelection(request: HumanPageRequest) {
		const { runtime, lease, s } = this.human(request),
			documentId = this.page(s, request.pageId).documentId;
		const result = await runtime.execute(request.pageId, { kind: 'selection' }, lease);
		this.human(request);
		if (this.page(s, request.pageId).documentId !== documentId) throw new AgentBrowserError('observation_stale');
		if (
			!result ||
			typeof result !== 'object' ||
			Array.isArray(result) ||
			typeof result.text !== 'string' ||
			result.text.length > 65_536
		)
			throw new AgentBrowserError('invalid_selection');
		return { text: result.text, truncated: result.truncated === true };
	}
	async humanInput(request: HumanPageRequest & { frameId: string; inputSequence: number; input: HumanInput }) {
		this.assertWritable();
		const parsed = humanInputSchema.safeParse(request.input);
		if (!parsed.success) throw new AgentBrowserError('invalid_input');
		request = { ...request, input: parsed.data };
		const { s, runtime, lease } = this.human(request),
			page = this.page(s, request.pageId),
			frame = this.frames.frame(request.viewerId, request.frameId);
		const coordinates = request.input.kind === 'click' || request.input.kind === 'scroll';
		if (
			!frame ||
			frame.pageId !== page.id ||
			frame.runtimeId !== runtime.id ||
			frame.documentId !== page.documentId ||
			frame.epoch !== lease.epoch ||
			frame.viewportVersion !== page.viewportVersion ||
			(coordinates && frame.inputSequence < (this.inputSequences.get(lease.leaseId) ?? 0))
		)
			throw new AgentBrowserError('frame_stale');
		if (
			!Number.isSafeInteger(request.inputSequence) ||
			request.inputSequence <= (this.inputSequences.get(lease.leaseId) ?? 0)
		)
			throw new AgentBrowserError('input_sequence_stale');
		this.inputSequences.set(lease.leaseId, request.inputSequence);
		await this.queue(this.actions, s.id, async () => {
			let current = this.human(request);
			if (this.now() - frame.capturedAt > 3000) {
				// A static, acknowledged picture can age without a navigation. Validate
				// the current document/layout read-only, with a bounded wait, before the
				// first dispatch. Never retry text after an uncertain dispatch. The service
				// timer belongs to the workspace runtime, not a viewer/popout window.
				let stopDeadline: (() => void) | undefined;
				try {
					const observation = await Promise.race([
						runtime.observe(page.id, current.lease, { mode: 'interactive', maxNodes: 1, maxBytes: 1024 }),
						new Promise<never>((_, reject) => {
							// Reuse the workspace-owned host scheduler; no viewer window timer.
							stopDeadline = this.extra.scheduleInterval?.(() => reject(new AgentBrowserError('frame_stale')), 1500);
							if (!stopDeadline) reject(new AgentBrowserError('frame_stale'));
						}),
					]);
					current = this.human(request);
					if (observation.runtimeId !== frame.runtimeId || observation.documentId !== frame.documentId || observation.viewportVersion !== frame.viewportVersion || observation.epoch !== frame.epoch || observation.pageId !== page.id || observation.spaceId !== s.id) throw new AgentBrowserError('frame_stale');
				} finally { stopDeadline?.(); }
			}
			if (
				this.page(s, request.pageId).documentId !== frame.documentId ||
				this.page(s, request.pageId).viewportVersion !== frame.viewportVersion ||
				(coordinates && !this.frames.frame(request.viewerId, request.frameId))
			)
				throw new AgentBrowserError('frame_stale');
			await runtime.execute(
				page.id,
				{ kind: 'input', input: request.input, inputSequence: request.inputSequence },
				current.lease,
			);
		});
	}
	async observe(runId: string, capability: string, pageId: string, scope?: SnapshotOptions): Promise<BrowserObservation> {
		const { s, runtime, lease } = this.authorize(runId, capability);
		this.page(s, pageId);
		const result = await runtime.observe(pageId, lease, scope);
		this.authorize(runId, capability);
		if (
			result.spaceId !== s.id || result.pageId !== pageId ||
			result.runtimeId !== runtime.id ||
			result.epoch !== lease.epoch ||
			result.viewportVersion !== this.page(s, pageId).viewportVersion ||
			result.documentId !== this.page(s, pageId).documentId
		)
			throw new AgentBrowserError('observation_stale');
		const entry = this.runs.get(runId);
		if (entry?.freshObservationPage === pageId) delete entry.freshObservationPage;
		return result;
	}
	async prepare(runId: string, capability: string, pageId: string, requestId: string, command: BrowserCommand, timeoutMs?: number) {
		const { s, run } = this.authorize(runId, capability);
		this.page(s, pageId);
		if (!agentCommands.has(command.kind)) throw new AgentBrowserError('command_forbidden');
		if (!['snapshot', 'text', 'screenshot', 'wait', 'stop'].includes(command.kind)) this.requireFreshObservation(runId);
		if (command.kind === 'navigate') validatePageUrl(command.url);
		return this.ledger.prepare(
			requestId,
			{ principal: 'agent', issuerId: run.id, authorityId: run.leaseId, spaceId: s.id, pageId, runtimeId: s.runtimeId, epoch: run.epoch },
			command,
			timeoutMs,
		);
	}
	async execute(
		runId: string,
		capability: string,
		operationId: string,
		command: BrowserCommand,
		remainingMs?: () => number,
	): Promise<OperationRecord> {
		const { s, run } = this.authorize(runId, capability),
			record = this.ledger.get(operationId, { principal: 'agent', issuerId: run.id });
		if (!record || record.scope.spaceId !== s.id || !record.scope.pageId)
			throw new AgentBrowserError('operation_not_found');
		if (!agentCommands.has(command.kind)) throw new AgentBrowserError('command_forbidden');
		if (!['snapshot', 'text', 'screenshot', 'wait', 'stop'].includes(command.kind)) this.requireFreshObservation(runId);
		const pageId = record.scope.pageId;
		const dispatch = async () => {
			let paths: Awaited<ReturnType<BrowserWorkspaceService['uploadPaths']>>;
			return this.ledger.execute(
				operationId,
				command,
				async (scope) => {
					const current = this.authorize(runId, capability);
					if (scope.epoch !== current.run.epoch || scope.runtimeId !== current.run.runtimeId)
						throw new AgentBrowserError('operation_scope_expired');
					paths = await this.uploadPaths(command, this.runScope(run));
				},
				async () => {
					const current = this.authorize(runId, capability);
					this.page(s, pageId);
					const value = command.kind === 'snapshot'
						? await this.observe(runId, capability, pageId, command.scope) as unknown as JsonValue
						: await current.runtime.execute(pageId, command, this.uploadAuthority(current.lease, paths), { uploadPaths: paths?.paths });
					this.authorize(runId, capability);
					return value;
				},
				() => this.uploadRemaining(paths, remainingMs),
			);
		};
		return command.kind === 'stop' ? dispatch() : this.queue(this.actions, s.id, dispatch);
	}
	async operation(runId: string, capability: string, operationId: string): Promise<OperationRecord | undefined> {
		const entry = this.runs.get(runId);
		if (!entry || entry.capability !== capability) throw new AgentBrowserError('capability_invalid');
		const record = this.ledger.get(operationId, { principal: 'agent', issuerId: runId });
		try {
			this.authorize(runId, capability);
		} catch {
			if (record) delete record.result;
		}
		return record;
	}
	pageList(runId: string, capability: string) {
		return clone(this.authorize(runId, capability).s.pages);
	}
	fileList(runId: string, capability: string) {
		return this.extra.files.listFiles(this.runScope(this.authorize(runId, capability).run));
	}
	downloadList(runId: string, capability: string) {
		return this.extra.files.listDownloads(this.runScope(this.authorize(runId, capability).run));
	}
	health(runId: string, capability: string): BrowserRunHealth {
		const { run, s } = this.authorize(runId, capability);
		return {
			runId,
			runtimeId: run.runtimeId,
			epoch: run.epoch,
			eventCursor: this.eventsStore.cursor(runId),
			pages: s.pages.length,
			...this.frames.stats(s.id),
			pendingRequests: this.getState().requests.filter((r) => r.spaceId === s.id && r.status === 'pending')
				.length,
		};
	}
	private eventRun(runId: string, capability: string) {
		if (this.closing) throw new AgentBrowserError('module_stopped');
		const entry = this.runs.get(runId);
		if (!entry || entry.capability !== capability) throw new AgentBrowserError('capability_invalid');
		let active = true; try { this.authorize(runId, capability); } catch { active = false; this.eventsStore.seal(runId); }
		return { run: entry.run, active };
	}
	events(runId: string, capability: string, afterSequence = 0, streamId?: string): BrowserRunEvent[] {
		this.eventRun(runId, capability);
		return this.eventsStore.poll(runId, afterSequence, streamId);
	}
	/** Final transport guard reads only authority/stream identity, never live page or file ports. */
	eventIdentity(runId: string, capability: string) {
		const snapshot = this.eventsStore.snapshot(runId, () => {
			const { run, active } = this.eventRun(runId, capability);
			return { runId, spaceId: run.spaceId, runtimeId: run.runtimeId, runEpoch: run.epoch, generation: this.spaces.get(run.spaceId)?.control.epoch ?? run.epoch, active };
		});
		return { ...snapshot.projection, streamId: snapshot.streamId, cursor: snapshot.cursor };
	}
	eventSnapshot(runId: string, capability: string, metadataOnly = false): BrowserEventSnapshot {
		const owner = this.eventRun(runId, capability);
		if (!this.eventsStore.has(runId)) { this.eventsStore.open(runId, true); if (!owner.active) this.eventsStore.seal(runId); }
		const snapshot = this.eventsStore.snapshot(runId, (): Omit<BrowserEventSnapshot, 'streamId' | 'cursor'> => {
			const owner = this.eventRun(runId, capability), { run } = owner, active = owner.active && !metadataOnly, s = this.spaces.get(run.spaceId);
			return {
				runId, spaceId: run.spaceId, runtimeId: run.runtimeId, runEpoch: run.epoch, generation: s?.control.epoch ?? run.epoch, active,
				space: { status: s?.status ?? 'removed', kind: s?.kind ?? 'task' }, control: { mode: s?.control.mode ?? 'paused', epoch: s?.control.epoch ?? run.epoch },
				cleanup: { state: s ? this.cleanupState(s) : this.cleanupStates.get(run.spaceId) ?? 'completed' },
				pages: active ? (s?.pages ?? []).map(page => ({ id: page.id, documentId: page.documentId, status: page.status, viewportVersion: page.viewportVersion })) : [],
				requests: active ? this.getState().requests.filter(request => request.spaceId === run.spaceId && request.runtimeId === run.runtimeId && request.epoch === run.epoch && request.expiresAt > this.now() && request.status === 'pending' && s?.pages.some(page => page.id === request.pageId && page.documentId === request.documentId)).map(request => ({ id: request.id, pageId: request.pageId, kind: request.kind, status: request.status, revision: request.revision, expiresAt: request.expiresAt })) : [],
				downloads: active ? this.extra.files.listDownloads(this.runScope(run)).map(download => ({ id: download.id, pageId: download.pageId, state: download.state, receivedBytes: download.receivedBytes, totalBytes: download.totalBytes })) : [],
				operations: this.ledger.summaries({ principal: 'agent', issuerId: runId }),
			};
		});
		const current = this.eventRun(runId, capability);
		if ((current.active && !metadataOnly) !== snapshot.projection.active || (this.spaces.get(current.run.spaceId)?.control.epoch ?? current.run.epoch) !== snapshot.projection.generation) throw new AgentBrowserError('resync_required');
		return { ...snapshot.projection, streamId: snapshot.streamId, cursor: snapshot.cursor };
	}
	private async managedPage<T extends JsonValue>(
		s: BrowserSpace,
		payload: unknown,
		action: (runtime: BrowserRuntime, lease: ControlLease) => Promise<T>,
	): Promise<T> {
		const lease = await this.changeControl(s.id, 'workspace', 'workspace');
		if (!lease) throw new AgentBrowserError('control_missing');
		const ticket = await this.ledger.prepare(
			this.persistence.id(),
			{
				principal: 'workspace',
				issuerId: this.persistence.ownerId,
				authorityId: lease.leaseId,
				spaceId: s.id,
				runtimeId: s.runtimeId,
				epoch: lease.epoch,
			},
			payload,
		);
		try {
			const result = await this.queue(this.actions, s.id, () =>
				this.ledger.execute(
					ticket.id,
					payload,
					() => {
						if (s.control.lease?.leaseId !== lease.leaseId)
							throw new AgentBrowserError('control_superseded');
					},
					async () => {
						if (s.control.lease?.leaseId !== lease.leaseId)
							throw new AgentBrowserError('control_superseded');
						return action(this.runtime(s), lease);
					},
				),
			);
			if (result.state !== 'completed') throw new AgentBrowserError(result.error ?? result.state);
			return result.result as T;
		} finally {
			if (s.control.lease?.leaseId === lease.leaseId) await this.pause(s.id);
		}
	}
	private pageQuota(s: BrowserSpace) {
		if (
			s.pages.length >= 8 ||
			[...this.spaces.values()].reduce((n, s) => n + (s.status === 'ready' ? s.pages.length : 0), 0) >= 12
		)
			throw new AgentBrowserError('page_quota');
	}
	async openPage({ spaceId, url = 'about:blank' }: { spaceId: string; url?: string }): Promise<BrowserPage> {
		this.assertWritable();
		const s = this.space(spaceId);
		this.pageQuota(s);
		const id = this.persistence.id();
		url = validatePageUrl(url);
		await this.managedPage(s, { kind: 'page.open', id, url }, async (runtime, lease) => {
			this.pageQuota(s);
			const page: BrowserPage = {
				id,
				spaceId,
				url,
				title: '',
				documentId: '',
				status: 'pending',
				zoom: 1,
				viewportVersion: 0,
			};
			s.pages.push(page);
			await this.persist();
			try {
				Object.assign(page, await runtime.createPage(id, url, lease), { status: 'open' });
			} catch (error) {
				page.status = 'failed';
				page.error = operationErrorCode(error);
				throw error;
			} finally {
				await this.persist();
				this.notify();
			}
			return { id };
		});
		return clone(this.page(s, id));
	}
	async closePage({ spaceId, pageId }: { spaceId: string; pageId: string }) {
		this.assertWritable();
		const s = this.space(spaceId);
		this.page(s, pageId);
		await this.managedPage(s, { kind: 'page.close', pageId }, async (runtime, lease) => {
			await runtime.closePage(pageId, lease);
			s.pages = s.pages.filter((p) => p.id !== pageId);
			await this.persist();
			this.notify();
			return null;
		});
	}
	async retryPage({ spaceId, pageId }: { spaceId: string; pageId: string }): Promise<BrowserPage> {
		this.assertWritable();
		const s = this.space(spaceId), page = this.page(s, pageId);
		const check = () => {
			if (s.status !== 'ready' || this.page(s, pageId) !== page || !['failed', 'pending'].includes(page.status))
				throw new AgentBrowserError('page_not_retryable');
		};
		check();
		await this.managedPage(s, { kind: 'page.retry', pageId }, async (runtime, lease) => {
			check();
			page.status = 'pending'; delete page.error;
			await this.persist(); this.notify();
			try {
				if (s.control.lease?.leaseId !== lease.leaseId) throw new AgentBrowserError('control_superseded');
				const restored = await runtime.createPage(pageId, page.url, lease);
				if (this.runtimes.get(spaceId) !== runtime || s.control.lease?.leaseId !== lease.leaseId)
					throw new AgentBrowserError('control_superseded');
				Object.assign(page, restored, { status: 'open' }); delete page.error;
			} catch (error) {
				if (this.runtimes.get(spaceId) === runtime && s.status === 'ready') {
					page.status = 'failed'; page.error = operationErrorCode(error);
				}
				throw error;
			} finally { await this.persist(); this.notify(); }
			return { id: pageId };
		});
		return clone(page);
	}
	async pageOpen(
		runId: string,
		capability: string,
		requestId: string,
		url = 'about:blank',
		timeoutMs?: number,
	): Promise<OperationRecord> {
		const { s, run } = this.authorize(runId, capability);
		this.requireFreshObservation(runId);
		url = validatePageUrl(url);
		const payload = { kind: 'page.open', url },
			record = await this.ledger.prepare(
				requestId,
				{ principal: 'agent', issuerId: run.id, authorityId: run.leaseId, spaceId: s.id, runtimeId: s.runtimeId, epoch: run.epoch },
				payload,
				timeoutMs,
			);
		return this.queue(this.actions, s.id, () =>
			this.ledger.execute(
				record.id,
				payload,
				() => {
					this.authorize(runId, capability);
					this.pageQuota(s);
				},
				async () => {
					const { runtime, lease } = this.authorize(runId, capability),
						id = this.persistence.id();
					const page: BrowserPage = {
						id,
						spaceId: s.id,
						url,
						title: '',
						documentId: '',
						status: 'pending',
						zoom: 1,
						viewportVersion: 0,
					};
					s.pages.push(page);
					await this.persist();
					this.authorize(runId, capability);
					Object.assign(page, await runtime.createPage(id, url, lease), { status: 'open' });
					this.authorize(runId, capability);
					await this.persist();
					this.notify();
					return { id };
				},
			),
		);
	}
	async pageClose(runId: string, capability: string, requestId: string, pageId: string, timeoutMs?: number): Promise<OperationRecord> {
		const { s, run } = this.authorize(runId, capability);
		this.requireFreshObservation(runId);
		const payload = { kind: 'page.close', pageId },
			record = await this.ledger.prepare(
				requestId,
				{
					principal: 'agent',
					issuerId: run.id,
					authorityId: run.leaseId,
					spaceId: s.id,
					pageId,
					runtimeId: s.runtimeId,
					epoch: run.epoch,
				},
				payload,
				timeoutMs,
			);
		return this.queue(this.actions, s.id, () =>
			this.ledger.execute(
				record.id,
				payload,
				() => {
					this.authorize(runId, capability);
					this.page(s, pageId);
				},
				async () => {
					const { runtime, lease } = this.authorize(runId, capability);
					await runtime.closePage(pageId, lease);
					this.authorize(runId, capability);
					s.pages = s.pages.filter((p) => p.id !== pageId);
					await this.persist();
					this.notify();
					return null;
				},
			),
		);
	}
	async stopSpace(id: string) {
		const existing = this.stops.get(id);
		if (existing) return existing;
		const task = this.stopOwned(id);
		this.stops.set(id, task);
		try { await task; } finally { if (this.stops.get(id) === task) this.stops.delete(id); }
	}
	private async stopOwned(id: string) {
		const s = this.space(id);
		this.newIntent(id);
		s.status = 'closing';
		s.control = { mode: 'quiescing', epoch: s.control.epoch + 1 };
		this.notify();
		let failure: unknown;
		try {
			await this.persist();
		} catch (error) {
			failure = error;
		}
		try {
			await this.runtimes.get(id)?.stop();
			await this.starts.get(id)?.catch(() => undefined);
			await this.runtimes.get(id)?.stop();
			await this.factory.reclaim(id, s.runtimeId);
			this.runtimes.delete(id);
			this.unlisten.get(id)?.();
			this.unlisten.delete(id);
			s.status = 'stopped';
			delete s.runtimeId;
			s.control = { mode: 'paused', epoch: s.control.epoch };
			s.pages = s.pages.map((p) => ({ ...p, status: 'pending', documentId: '' }));
		} catch (error) {
			s.status = 'quarantined';
			s.control = { mode: 'blocked', epoch: s.control.epoch };
			s.error = operationErrorCode(error);
			failure = error;
		}
		this.frames.reset(id);
		this.store.setState({ requests: this.getState().requests.filter((r) => r.spaceId !== id) });
		try {
			await this.persist();
		} catch (error) {
			failure ??= error;
		}
		this.notify();
		if (failure) throw failure instanceof Error ? failure : new AgentBrowserError('cleanup_pending');
	}
	private async cleanupSpace(s: BrowserSpace) {
		this.cleanupStates.set(s.id, 'pending'); this.notify();
		try {
			await this.runtimes.get(s.id)?.stop();
			await this.factory.reclaim(s.id, s.runtimeId);
			this.runtimes.delete(s.id);
			this.unlisten.get(s.id)?.();
			this.unlisten.delete(s.id);
			await this.extra.files.removeSpace(s.id);
			await this.factory.removeProfile(s.id);
			this.spaces.delete(s.id);
			await this.persist();
			this.cleanupStates.set(s.id, 'completed'); this.notify();
		} catch (error) { this.cleanupStates.set(s.id, 'failed'); this.notify(); throw error; }
	}
	async removeSpace(id: string) {
		this.assertWritable();
		const s = this.space(id);
		await this.stopSpace(id);
		s.status = 'cleanup_pending';
		await this.persist();
		this.notify();
		await this.cleanupSpace(s);
	}
	async retryCleanup(id: string) {
		this.assertWritable();
		const s = this.space(id);
		try {
			await this.extra.files.retryCleanup?.(id);
			if (s.status === 'cleanup_pending') await this.cleanupSpace(s);
			else if (s.status === 'quarantined') await this.stopSpace(id);
		} finally { this.notify(); }
	}
	async retryPendingCleanup() {
		this.assertWritable();
		try {
			await this.extra.retryCleanup?.();
			for (const s of [...this.spaces.values()]) {
				await this.extra.files.retryCleanup?.(s.id);
				if (s.status === 'cleanup_pending') await this.cleanupSpace(s);
				else if (s.status === 'quarantined') await this.stopSpace(s.id);
			}
		} finally {
			this.notify();
		}
	}
	private onRuntime(spaceId: string, event: RuntimeEvent) {
		const s = this.spaces.get(spaceId);
		if (!s) return;
		const eventRuntime =
			event.kind === 'frame'
				? event.frame.runtimeId
				: event.kind === 'request'
					? event.request.runtimeId
					: event.runtimeId;
		if (eventRuntime !== s.runtimeId) return;
		if (event.kind === 'frame') {
			const p = s.pages.find((p) => p.id === event.frame.pageId);
			if (
				p &&
				p.documentId === event.frame.documentId &&
				s.control.epoch === event.frame.epoch &&
				event.frame.viewportVersion >= p.viewportVersion
			)
				this.frames.publish(event.frame);
			return;
		}
		if (event.kind === 'request') {
			const r = event.request,
				p = s.pages.find((p) => p.id === r.pageId);
			if (!p || r.documentId !== p.documentId || r.epoch !== s.control.epoch || r.expiresAt <= this.now()) return;
			const rows = this.getState().requests.filter((old) => old.id !== r.id && old.expiresAt > this.now());
			rows.push({ ...r, message: r.message.slice(0, 4096) });
			this.store.setState({ requests: rows.slice(-64) });
			this.emitSpace(s.id, 'humanRequest', { entityId: r.id, pageId: r.pageId, state: r.status });
			return;
		}
		if (event.kind === 'request-resolved') {
			const request = this.getState().requests.find(request => request.id === event.requestId && request.spaceId === s.id && request.runtimeId === event.runtimeId);
			this.store.setState({ requests: this.getState().requests.filter((r) => r.id !== event.requestId) });
			if (request && request.epoch === s.control.epoch && s.pages.some(page => page.id === request.pageId && page.documentId === request.documentId)) this.emitSpace(s.id, 'humanRequest', { entityId: request.id, pageId: request.pageId, state: 'resolved' });
			return;
		}
		if (event.kind === 'download') {
			void this.handleDownload(s, event).catch(() => {
				// A failed update/query does not establish the file's business state.
				this.downloadEvent(event);
				this.notify();
				void this.runtimes
					.get(s.id)
					?.cancelDownload(event.id)
					.catch(() => undefined);
			});
			return;
		}
		if (event.kind === 'fault') {
			this.emitSpace(s.id, 'runtimeFault', { entityId: s.id, state: 'quarantined', code: 'runtime_fault' });
			this.newIntent(s.id);
			s.status = 'quarantined';
			s.error = event.code;
			s.control = { mode: 'blocked', epoch: s.control.epoch + 1 };
			this.notify();
			void this.stopSpace(s.id).catch(() => undefined);
			return;
		}
		if (event.kind === 'page') {
			let page = s.pages.find((p) => p.id === event.page.id);
			if (!page) {
				try {
					this.pageQuota(s);
				} catch {
					void this.stopSpace(s.id).catch(() => undefined);
					return;
				}
				page = { ...event.page, spaceId: s.id, status: 'open' };
				s.pages.push(page);
			} else if (page.status === 'open') {
				if (page.documentId !== event.page.documentId) this.frames.invalidate(s.id, page.id);
				Object.assign(page, event.page);
			}
		} else if (event.kind === 'page-closed') {
			const p = s.pages.find((p) => p.id === event.pageId);
			if (p?.status === 'open') {
				p.status = 'closed';
				p.documentId = '';
				this.frames.invalidate(s.id, p.id);
			}
		}
		this.notify();
		void this.persist().catch(() => {
			this.store.setState({ readOnly: true, error: 'catalog_unavailable' });
			void this.stopSpace(s.id).catch(() => undefined);
		});
	}
	private downloadEvent(event: Extract<RuntimeEvent, { kind: 'download' }>, state?: 'progressing' | 'completed' | 'cancelled' | 'failed') {
		const scope = this.downloadOwners.get(`${event.runtimeId}:${event.id}`), entry = scope?.execution.kind === 'agent' ? this.runs.get(scope.execution.runId) : undefined;
		if (!entry || entry.run.state !== 'active' || entry.run.expiresAt <= this.now() || entry.run.runtimeId !== event.runtimeId || entry.run.epoch !== event.epoch) return;
		this.eventsStore.append(entry.run.id, { kind: state ? 'downloadChanged' : 'runtimeFault', spaceId: entry.run.spaceId, runtimeId: event.runtimeId, epoch: event.epoch, entityId: event.id, pageId: event.pageId, ...(state ? { state } : { code: 'runtime_fault' }) });
	}
	private async handleDownload(s: BrowserSpace, event: Extract<RuntimeEvent, { kind: 'download' }>) {
		const key = `${event.runtimeId}:${event.id}`;
		let scope = this.downloadOwners.get(key);
		if (!scope) {
			const lease = s.control.lease;
			if (!lease || lease.epoch !== event.epoch || lease.controllerId !== event.controllerId)
				throw new AgentBrowserError('download_authority_missing');
			if (lease.mode === 'human' && lease.viewerId)
				scope = { spaceId: s.id, execution: { kind: 'human', viewerId: lease.viewerId, epoch: lease.epoch } };
			else if (lease.mode === 'agent') {
				const entry = this.runs.get(lease.controllerId);
				if (entry?.run.state === 'active') scope = this.runScope(entry.run);
			}
			if (!scope) throw new AgentBrowserError('download_authority_missing');
			this.downloadOwners.set(key, scope);
		}
		await this.extra.files.download(event, scope);
		if (this.spaces.get(s.id)?.runtimeId === event.runtimeId) {
			// Native completion only proves transport completion. Local quota/capture can
			// fail normally, and the file service retains the authoritative terminal state.
			const download = this.extra.files.listDownloads(scope).find(item => item.id === event.id && item.pageId === event.pageId);
			if (!download) throw new AgentBrowserError('download_projection_unavailable');
			this.downloadEvent(event, download.state === 'in-progress' ? 'progressing' : download.state === 'canceled' ? 'cancelled' : download.state);
		}
		this.notify();
	}
	listIdentities() {
		return this.extra.identities.list();
	}
	async refreshIdentities() {
		this.assertWritable();
		try { await this.extra.identities.refresh?.(); }
		catch { throw new AgentBrowserError('identity_refresh_unavailable'); }
		finally { this.notify(); }
	}
	async prepareIdentityImport({ label, text, signal }: { label: string; text: string; signal?: AbortSignal }) {
		this.assertWritable();
		if (signal?.aborted) throw new AgentBrowserError('cancelled');
		return this.extra.identities.prepareText(label, text);
	}
	async prepareIdentityFile({ label, signal }: { label: string; signal?: AbortSignal }) {
		this.assertWritable();
		return this.extra.identities.prepareFile(label, signal);
	}
	async prepareBrowserIdentityImport(request: { sourceId: string; profileId?: string; label: string; signal?: AbortSignal }) {
		this.assertWritable();
		return this.extra.identities.prepareSource(request);
	}
	async commitIdentityImport(request: { planId: string; persist: boolean; domains?: string[] }) {
		this.assertWritable();
		if (request.persist && this.getState().persistence !== 'secure')
			throw new AgentBrowserError('secure_storage_unavailable');
		if (!request.persist && !this.getState().ephemeralConsent)
			throw new AgentBrowserError('ephemeral_consent_required');
		const value = await this.extra.identities.commit(request);
		this.notify();
		return value;
	}
	discardIdentityImport(id: string) {
		this.extra.identities.discard(id);
	}
	listIdentitySources() {
		return this.extra.identities.sources();
	}
	async saveIdentity(request: HumanPageRequest & { label: string; persist: boolean; signal?: AbortSignal }) {
		this.assertWritable();
		const { label, persist, signal, ...authority } = request, { runtime } = this.human(authority);
		if (persist && this.getState().persistence !== 'secure')
			throw new AgentBrowserError('secure_storage_unavailable');
		if (!persist && !this.getState().ephemeralConsent)
			throw new AgentBrowserError('ephemeral_consent_required');
		const result = await this.extra.identities.save(runtime, label, persist, () => {
			if (this.human(authority).runtime !== runtime) throw new AgentBrowserError('human_lease_expired');
		}, signal);
		// This is a whitelisted committed summary, not a late webpage read. Losing
		// the source lease after publication cannot revoke the saved identity fact.
		this.notify();
		return result;
	}
	async removeIdentity(id: string) {
		this.assertWritable();
		await this.extra.identities.remove(id);
		this.notify();
	}
	listFiles(id: string) {
		this.space(id);
		return this.extra.files.listSpaceFiles(id);
	}
	listDownloads(id: string) {
		this.space(id);
		return this.extra.files.listSpaceDownloads(id);
	}
	async chooseUpload(spaceId: string, principal: 'human' | 'agent') {
		this.assertWritable();
		const s = this.space(spaceId),
			lease = s.control.lease;
		let scope: BrowserFileScope;
		if (principal === 'human' && s.control.mode === 'human' && lease?.viewerId)
			scope = { spaceId, execution: { kind: 'human', viewerId: lease.viewerId, epoch: lease.epoch } };
		else if (principal === 'agent' && s.control.mode === 'agent' && lease) {
			const entry = this.runs.get(lease.controllerId);
			if (!entry) throw new AgentBrowserError('run_revoked');
			this.authorize(entry.run.id, entry.capability);
			scope = this.runScope(entry.run);
		} else throw new AgentBrowserError('file_authority_required');
		const result = await this.extra.files.chooseUpload(scope);
		if (s.control.lease?.leaseId !== lease?.leaseId || !lease || lease.expiresAt <= this.now()) {
			if (result) await this.extra.files.removeFile(result.id);
			throw new AgentBrowserError('file_scope_expired');
		}
		this.notify();
		return result;
	}
	async exportFile(fileId: string) {
		this.assertWritable();
		for (const s of this.spaces.values())
			if (this.extra.files.listSpaceFiles(s.id).some((f) => f.id === fileId)) {
				await this.extra.files.exportFile(s.id, fileId);
				return;
			}
		throw new AgentBrowserError('file_not_found');
	}
	async removeFile(fileId: string) {
		this.assertWritable();
		await this.extra.files.removeFile(fileId);
		this.notify();
	}
	async cancelDownload(id: string) {
		this.assertWritable();
		for (const s of this.spaces.values())
			if (this.extra.files.listSpaceDownloads(s.id).some((d) => d.id === id)) {
				await this.runtime(s).cancelDownload(id);
				return;
			}
		throw new AgentBrowserError('download_not_found');
	}
	async listMaterialTargets() {
		const targets: Array<{ id: string; label: string }> = [];
		for (const consumer of await this.extra.materials())
			for (const target of await consumer.targets())
				targets.push({ id: `${consumer.id}:${target.id}`, label: target.label });
		return targets;
	}
	async observeMaterial(request: HumanPageRequest): Promise<BrowserObservation> {
		const { runtime, lease, s } = this.human(request), page = this.page(s, request.pageId);
		const observation = await runtime.observe(page.id, lease, { mode: 'visible', maxNodes: 512, maxBytes: 65536 });
		this.human(request);
		if (observation.spaceId !== s.id || observation.pageId !== page.id || observation.runtimeId !== runtime.id || observation.documentId !== this.page(s, page.id).documentId || observation.viewportVersion !== this.page(s, page.id).viewportVersion || observation.epoch !== lease.epoch) throw new AgentBrowserError('observation_stale');
		this.materialObservations.set(observation.id, { request: { ...request }, observation: clone(observation) });
		while (this.materialObservations.size > 8) this.materialObservations.delete(this.materialObservations.keys().next().value!);
		return observation;
	}
	async sendMaterial(request: HumanPageRequest & { targetId: string; observationId: string; ref: string; signal?: AbortSignal }) {
		const { s, runtime, lease } = this.human(request), page = this.page(s, request.pageId), documentId = page.documentId, viewportVersion = page.viewportVersion;
		const selected = this.materialObservations.get(request.observationId), observation = selected?.observation, node = observation?.nodes.find(item => item.ref === request.ref);
		if (!selected || !observation || !node || !node.visible || selected.request.spaceId !== s.id || selected.request.pageId !== page.id || selected.request.viewerId !== request.viewerId || selected.request.leaseId !== lease.leaseId || observation.documentId !== documentId || observation.viewportVersion !== viewportVersion || observation.runtimeId !== runtime.id || observation.epoch !== lease.epoch) throw new AgentBrowserError('observation_stale');
		const abort = new AbortController(), cancel = () => abort.abort();
		const validate = () => {
			if (abort.signal.aborted || request.signal?.aborted || this.closing) throw new AgentBrowserError('cancelled');
			const current = this.human(request), currentPage = this.page(current.s, page.id);
			if (current.runtime !== runtime || currentPage.documentId !== documentId || currentPage.viewportVersion !== viewportVersion) throw new AgentBrowserError('observation_stale');
		};
		const unsubscribe = this.subscribe(() => { try { validate(); } catch { abort.abort(); } });
		request.signal?.addEventListener('abort', cancel, { once: true });
		try {
			validate(); const separator = request.targetId.indexOf(':'), consumerId = request.targetId.slice(0, separator), targetId = request.targetId.slice(separator + 1);
			const consumer = (await this.extra.materials()).find(item => item.id === consumerId); validate();
			if (!consumer || !(await consumer.targets()).some(item => item.id === targetId)) throw new AgentBrowserError('material_target_missing'); validate();
			const capture = await runtime.execute(page.id, { kind: 'material', observationId: request.observationId, ref: request.ref }, lease); validate();
			if (!capture || typeof capture !== 'object' || Array.isArray(capture) || capture.observationId !== observation.id || capture.ref !== node.ref || capture.frameId !== node.frameId || capture.documentId !== documentId || capture.epoch !== lease.epoch || capture.viewportVersion !== viewportVersion) throw new AgentBrowserError('observation_stale');
			const semantic = capture.semantic;
			if (!semantic || typeof semantic !== 'object' || Array.isArray(semantic) || semantic.runtimeId !== runtime.id || semantic.pageId !== page.id || semantic.spaceId !== s.id || semantic.documentId !== documentId || semantic.epoch !== lease.epoch || semantic.viewportVersion !== viewportVersion || !semantic.scope || typeof semantic.scope !== 'object' || Array.isArray(semantic.scope) || semantic.scope.rootRef !== request.ref || semantic.scope.frameId !== node.frameId || !Array.isArray(semantic.nodes) || !semantic.nodes.length || !Array.isArray(semantic.coverage) || !Array.isArray(semantic.frameErrors) || typeof semantic.id !== 'string' || typeof semantic.truncated !== 'boolean' || JSON.stringify(semantic).length > 65536) throw new AgentBrowserError('capture_unavailable');
			const captured = semantic as unknown as BrowserObservation;
			const clip = capture.clip, image = capture.image, styles = capture.styles;
			if (!clip || typeof clip !== 'object' || Array.isArray(clip) || !['x','y','width','height'].every(key => typeof clip[key] === 'number' && Number.isFinite(clip[key])) || Number(clip.x) < 0 || Number(clip.y) < 0 || Number(clip.width) <= 0 || Number(clip.height) <= 0 || !image || typeof image !== 'object' || Array.isArray(image) || image.mime !== 'image/png' || typeof image.data !== 'string' || image.data.length > 12 * 1024 * 1024 || !styles || typeof styles !== 'object' || Array.isArray(styles) || Object.keys(styles).length > 24 || !Object.values(styles).every(value => typeof value === 'string' && value.length <= 256)) throw new AgentBrowserError('capture_unavailable');
			const binary = atob(image.data); if (!binary.length || binary.length > 8 * 1024 * 1024) throw new AgentBrowserError('material_too_large');
			const source: NonNullable<BrowserMaterial['source']> = { capturedAt: new Date(this.now()).toISOString(), url: observation.url, spaceId: s.id, pageId: page.id, runtimeId: runtime.id, documentId, epoch: lease.epoch, viewportVersion, observationId: observation.id, semanticObservationId: captured.id, ref: node.ref, frameId: node.frameId, scope: clone(captured.scope), coverage: clone(captured.coverage), frameErrors: clone(captured.frameErrors), truncated: observation.truncated || captured.truncated, clip: clip as { x: number; y: number; width: number; height: number }, clipped: capture.clipped === true };
			const material: BrowserMaterial = { title: observation.title || observation.url, text: JSON.stringify({ semantic: captured.nodes, styles, source }), source, styles: styles as Record<string,string>, image: { mime: 'image/png', data: Uint8Array.from(binary, char => char.charCodeAt(0)) } };
			try {
				if (!(await this.extra.materials()).includes(consumer)) throw new AgentBrowserError('material_target_missing'); validate();
				await consumer.deliver(targetId, material, { signal: abort.signal, validate });
				// Delivery has committed to the unsent input. Later cancellation/cleanup
				// must not erase this receipt or cause automatic delivery again.
			} finally { material.image?.data.fill(0); }
		} finally { unsubscribe(); request.signal?.removeEventListener('abort', cancel); }
	}

	async dispose(): Promise<void> {
		this.closing = true;
		this.materialObservations.clear();
		this.stopTimer?.();
		this.stopTimer = undefined;
		this.eventsStore.clear();
		const results = await Promise.allSettled(
			[...this.spaces.values()]
				.filter((s) => this.runtimes.has(s.id) || this.starts.has(s.id) || s.status === 'quarantined')
				.map((s) => this.stopSpace(s.id)),
		);
		this.frames.dispose();
		if (results.some((r) => r.status === 'rejected') || this.runtimes.size || this.starts.size)
			throw new AgentBrowserError('cleanup_pending');
		for (const s of [...this.spaces.values()])
			if (s.retention === 'ephemeral') {
				s.status = 'cleanup_pending';
				await this.persist();
				await this.cleanupSpace(s);
			}
		await this.extra.identities.dispose();
		await this.extra.files.dispose();
		await this.factory.dispose();
		try {
			if (this.ledgerStarted && !this.persistence.readOnly) await this.ledger.prune();
		} finally { this.ledgerStarted = false; await this.persistence.dispose(); }
	}
}
