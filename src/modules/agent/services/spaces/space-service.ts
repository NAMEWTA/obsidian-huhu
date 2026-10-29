import type { ControlScope } from '../../core/control/context';
import { lifecycleClock } from '../terminal/clock';
import type { TerminationEvidence } from '../../../../shared/native/host';
import { parseTerminationEvidence, terminationConfirmed } from '../../../../shared/native/termination';
import type {
	ActivityCompletionHint,
	ArchivePlan,
	ArchiveScope,
	ManagedRuntimeRef,
} from '../../core/workspace/managed-runtime';
import { createStore } from 'zustand/vanilla';
import { JsonStore } from '../../../../shared/json-store';
import type { TextStorage } from '../../../../shared/storage/ports';
import { reissueIfStalled } from '../../../../shared/storage/stall-guard';
import { agentWorkbenchPath } from '../../../../shared/storage/vault-layout';
import type { AgentId } from '../../core/launch/types';
import { SpaceError } from '../../core/space/errors';
import type { DirectoryGrant, ExternalDirectoryChoice, SpaceRecord, VaultBinding } from '../../core/space/model';
import type { DirectoryPort, SpaceChooser, WriterLease, WriterOwnerPort } from '../../core/space/ports';
import { emptyWorkspace, type WorkspaceState } from '../../core/workspace/model';
import {
	emptyRecords,
	isNeverStartedImport,
	isWorkbenchRecords,
	validActivityHint,
	type SessionRecord,
	type WorkbenchRecords,
} from './records';
import {
	INBOX_LIMITS,
	inboxCapacityBytes,
	emptyInbox,
	validateInboxDocument,
	validateInboxMessage,
	validateMessageId,
	validateInboxSource,
	validateVaultFileReference,
	inboxSummary,
	type InboxDocument,
	type InboxMessage,
	type InboxMessageSummary,
	type InboxRecipient,
	type InboxSource,
	type VaultFileReference,
} from '../../core/inbox/model';
import { mergeLayoutEdits } from './layout-merge';

export interface SessionAdmission {
	readonly record: SessionRecord;
	readonly runtimeId: string;
	readonly cwd: string;
	readonly beforeSpawn: () => Promise<void>;
}
export interface ArchivePermit {
	readonly id: string;
	readonly plan: ArchivePlan;
}
export interface InboxSendInput {
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly source: InboxSource;
	readonly body: string;
	readonly references?: readonly VaultFileReference[];
}
export interface InboxListInput {
	readonly spaceId?: string;
	readonly sessionId: string;
	readonly afterSequence?: number;
	readonly limit?: number;
	readonly highWaterSequence?: number;
	readonly generation?: number;
}
export interface InboxListResult {
	readonly rows: readonly InboxMessageSummary[];
	readonly nextSequence?: number;
	readonly highWaterSequence: number;
	readonly generation: number;
	readonly freshness: 'fresh';
}
export interface InboxPrimaryView {
	readonly freshness: 'fresh' | 'unknown';
	readonly records?: WorkbenchRecords;
	readonly reason?: string;
}
interface SpaceState {
	records: WorkbenchRecords;
	loading: boolean;
	error?: unknown;
}
interface Options {
	storage: TextStorage;
	directories: DirectoryPort;
	owners: WriterOwnerPort;
	instanceId: string;
	selectSpace?: SpaceChooser;
	report(error: unknown): void;
}
interface InboxFence {
	readonly recipient: InboxRecipient;
	readonly highWaterSequence: number;
	readonly generation: number;
	readonly fingerprint: string;
	readonly expires: number;
}
const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const INBOX_FENCE_LIMIT = 16;
const INBOX_FENCE_TTL_MS = 10_000;

/** One business writer queue owns every v2 write, including JsonStore recovery and readback. */
/** Mirrors the record codec: a durable owner key is bounded and the table is capped. */
const HISTORY_SOURCE_REF_LIMIT = 4096;
const HISTORY_EVIDENCE_LIMIT = 4096;
const HISTORY_OWNER_LIMIT = 10000;
export class SpaceService {
	readonly store = createStore<SpaceState>(() => ({
		records: emptyRecords({
			vaultId: 'loading',
			deviceId: 'loading',
			rootPath: '',
			root: { canonicalPath: '', dev: '0', ino: '0' },
		}),
		loading: true,
	}));
	readonly ready: Promise<void>;
	private vault!: VaultBinding;
	private disk?: JsonStore<WorkbenchRecords>;
	private lease?: WriterLease;
	private tail: Promise<void> = Promise.resolve();
	private readonly hintClock = lifecycleClock();
	private hintDirty = new Map<string, { target: ManagedRuntimeRef; hint: ActivityCompletionHint }>();
	private hintFlight?: { target: ManagedRuntimeRef; hint: ActivityCompletionHint };
	private hintPump?: Promise<void>;
	private hintErrors = new Map<string, { runtimeId: string; hint: ActivityCompletionHint; error: Error }>();
	private hintOverflow?: Error;
	private hintWaiters = new Set<{
		target: ManagedRuntimeRef;
		hint: ActivityCompletionHint;
		finish(error?: Error): void;
	}>();
	private closing = false;
	private lost = false;
	private activePermit = false;
	private pendingWriteGuard?: () => void;
	private primaryWriteStarted?: () => void;
	private failure?: Error;
	private disposing?: Promise<void>;
	private loaded = false;
	private launchClosed = false;
	private recoveryHeld = false;
	private hintsPaused = false;
	private admittedAttempts = new Set<string>();
	private archiveGates = new Map<string, ArchivePermit>();
	private pendingChoices = new Map<string, ExternalDirectoryChoice>();
	private primaryState: 'initial-empty' | 'present' | 'missing-unknown' = 'initial-empty';
	private inboxFences = new Map<string, InboxFence>();
	private inboxLatestFences = new Map<string, InboxFence>();
	constructor(private options: Options) {
		this.ready = this.load();
		// Consumers may inspect the error state without awaiting initialization.
		void this.ready.catch(() => {});
	}
	get path(): string {
		return agentWorkbenchPath(this.vault.deviceId);
	}
	get canWrite(): boolean {
		return this.loaded && !this.store.getState().loading && !this.closing && !this.lost;
	}
	/** Agent UI injects the chooser after activation; the app-owned writer remains alive without it. */
	setSpaceChooser(selectSpace?: SpaceChooser): void {
		this.options.selectSpace = selectSpace;
	}
	/** Unsupported versions and foreign envelopes are refusals, never recoverable corruption. */
	private decodeStored(text: string): WorkbenchRecords | undefined {
		let decoded: unknown;
		try {
			decoded = JSON.parse(text);
		} catch {
			return undefined;
		}
		if (!object(decoded) || decoded.version !== 2)
			throw new SpaceError('PERSISTENCE_FAILED', 'unsupported-version');
		this.assertScope(decoded);
		// An inbox field is an opt-in versioned subdocument. Once present, malformed
		// inbox data must not silently fall back to an older backup as an empty inbox.
		if (decoded.inbox !== undefined && !validateInboxDocument(decoded.inbox, { vaultId: this.vault.vaultId }))
			throw new SpaceError('PERSISTENCE_FAILED', 'inbox-invalid');
		return isWorkbenchRecords(decoded) ? decoded : undefined;
	}
	/** Read the stored records exactly as start-up does (primary, then a valid backup); throws instead of defaulting damaged data. */
	private async readPersisted(): Promise<WorkbenchRecords> {
		const storage = this.options.storage;
		let records = emptyRecords(this.vault);
		const hasPrimary = await storage.exists(this.path);
		if (hasPrimary) {
			this.primaryState = 'present';
			const current = await storage.read(this.path);
			let decoded = this.decodeStored(current);
			if (!decoded) {
				if (!(await storage.exists(this.path + '.backup')))
					throw new SpaceError('PERSISTENCE_FAILED', 'load-failed');
				decoded = this.decodeStored(await storage.read(this.path + '.backup'));
			}
			if (!decoded) throw new SpaceError('PERSISTENCE_FAILED', 'load-failed');
			records = decoded;
		} else if (await storage.exists(this.path + '.backup')) {
			this.primaryState = 'missing-unknown';
			const decoded = this.decodeStored(await storage.read(this.path + '.backup'));
			if (!decoded) throw new SpaceError('PERSISTENCE_FAILED', 'load-failed');
			records = decoded;
		} else this.primaryState = 'initial-empty';
		this.assertScope(records);
		return records;
	}
	private async load(): Promise<void> {
		try {
			this.vault = await this.options.directories.inspectVault();
			const records = await this.readPersisted();
			this.loaded = true;
			this.store.setState({ records, loading: false });
		} catch (cause) {
			const error =
				cause instanceof SpaceError ? cause : new SpaceError('PERSISTENCE_FAILED', 'load-failed', {}, cause);
			this.failure = error;
			this.store.setState({ loading: false, error });
			throw error;
		}
	}
	private assertScope(records: unknown): void {
		if (!object(records) || records.vaultId !== this.vault.vaultId)
			throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
		if (records.deviceId !== this.vault.deviceId) throw new SpaceError('SCOPE_MISMATCH', 'device-changed');
		const root = records.physicalRoot;
		if (
			!object(root) ||
			root.dev !== this.vault.root.dev ||
			root.ino !== this.vault.root.ino ||
			root.canonicalPath !== this.vault.root.canonicalPath
		)
			throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
	}
	private assertAdmission(): void {
		if (this.closing || this.lost)
			throw new SpaceError('OWNER_CONFLICT', this.lost ? 'listener-lost' : 'lease-closed');
	}
	private async assertPermit(): Promise<void> {
		if (!this.activePermit || this.lost || !this.lease || this.lease.lost.aborted)
			throw new SpaceError('OWNER_CONFLICT', 'listener-lost');
		await this.lease.assertHeld();
		if (this.lost || this.lease.lost.aborted) throw new SpaceError('OWNER_CONFLICT', 'listener-lost');
	}
	private guardedStorage(): TextStorage {
		const storage = this.options.storage;
		const read = async (p: string) => {
			await this.assertPermit();
			const value = await storage.read(p);
			await this.assertPermit();
			if (p === this.path || p === this.path + '.backup') this.decodeStored(value);
			return value;
		};
		// JsonStore may overwrite a backup without reading its previous bytes. Check both inputs
		// before every effect as well as on every read, including its internal recovery/readback.
		const beforeWrite = async () => {
			for (const p of [this.path, this.path + '.backup']) {
				await this.assertPermit();
				const exists = await reissueIfStalled('space-exists', () => storage.exists(p));
				await this.assertPermit();
				if (exists) await reissueIfStalled('space-read', () => read(p));
			}
			await this.assertPermit();
		};
		return {
			exists: async (p) => {
				await this.assertPermit();
				const value = await storage.exists(p);
				await this.assertPermit();
				return value;
			},
			read,
			write: async (p, text) => {
				await beforeWrite();
				this.pendingWriteGuard?.();
				if (p === this.path) this.primaryWriteStarted?.();
				await storage.write(p, text);
				await this.assertPermit();
			},
			mkdir: async (p) => {
				await beforeWrite();
				await storage.mkdir(p);
				await this.assertPermit();
			},
		};
	}
	private async ensureWriter(): Promise<void> {
		if (!this.lease) {
			this.lease = await this.options.owners.acquire(this.vault, this.options.instanceId);
			this.lease.lost.addEventListener(
				'abort',
				() => {
					this.lost = true;
					this.failure = new SpaceError('OWNER_CONFLICT', 'listener-lost');
					this.store.setState({ error: this.failure });
				},
				{ once: true },
			);
			if (this.lease.lost.aborted) this.lost = true;
		}
		this.activePermit = true;
		await this.assertPermit();
		if (!this.disk) {
			const candidate = new JsonStore(this.guardedStorage(), this.path, isWorkbenchRecords);
			const loaded = await candidate.load(emptyRecords(this.vault));
			this.assertScope(loaded);
			await this.assertPermit();
			this.disk = candidate;
		}
	}
	private mutate<T>(
		edit: (records: WorkbenchRecords) => T | Promise<T>,
		beforeCommit?: () => void,
		onPrimaryWrite?: () => void,
		acceptedHint = false,
	): Promise<T> {
		try {
			if (acceptedHint) {
				if (this.lost) throw new SpaceError('OWNER_CONFLICT', 'listener-lost');
			} else {
				this.assertAdmission();
				// A recovery operation owns the file: BUSY, never accepted-then-lost.
				if (this.recoveryHeld) throw new SpaceError('SOURCE_UNAVAILABLE', 'recovery-busy');
			}
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
		}
		const operation = this.tail.then(async () => {
			await this.ready;
			if (this.lost) throw new SpaceError('OWNER_CONFLICT', 'listener-lost');
			this.activePermit = true;
			try {
				await this.ensureWriter();
				await this.assertPermit();
				const base = this.store.getState().records;
				const next = structuredClone(base);
				const result = await edit(next);
				await this.assertPermit();
				beforeCommit?.();
				this.pendingWriteGuard = beforeCommit;
				this.primaryWriteStarted = onPrimaryWrite;
				const committed = await this.disk!.commit({ base, value: next });
				this.assertScope(committed);
				await this.assertPermit();
				this.failure = undefined;
				this.store.setState({ records: committed, error: undefined });
				this.primaryState = 'present';
				return result;
			} finally {
				this.activePermit = false;
				this.pendingWriteGuard = undefined;
				this.primaryWriteStarted = undefined;
			}
		});
		const exposed = operation.catch((cause: unknown) => {
			const error =
				cause instanceof SpaceError ? cause : new SpaceError('PERSISTENCE_FAILED', 'commit-failed', {}, cause);
			if (
				['SOURCE_UNAVAILABLE', 'EFFECT_UNKNOWN', 'STALE_RUNTIME', 'WAIT_TIMEOUT', 'WAIT_CANCELLED'].includes(
					error.code,
				)
			)
				throw error;
			this.failure = error;
			this.store.setState({ error });
			this.options.report(error);
			throw error;
		});
		this.tail = exposed.then(
			() => {},
			() => {},
		);
		return exposed;
	}
	/** Read scope without joining the disk queue or acquiring a writer. */
	async getControlScope(): Promise<Readonly<ControlScope>> {
		await this.ready;
		const scope = Object.freeze({
			vaultId: this.vault.vaultId,
			deviceId: this.vault.deviceId,
			instanceId: this.options.instanceId,
			rootPath: this.vault.rootPath,
			physicalRoot: Object.freeze({ ...this.vault.root }),
		});
		await this.assertControlScope(scope);
		return scope;
	}
	async assertControlScope(expected: Readonly<ControlScope>): Promise<void> {
		const captured = { ...expected, physicalRoot: { ...expected.physicalRoot } };
		await this.ready;
		this.assertAdmission();
		const check = () => {
			if (
				captured.vaultId !== this.vault.vaultId ||
				captured.deviceId !== this.vault.deviceId ||
				captured.instanceId !== this.options.instanceId ||
				captured.rootPath !== this.vault.rootPath ||
				captured.physicalRoot.canonicalPath !== this.vault.root.canonicalPath ||
				captured.physicalRoot.dev !== this.vault.root.dev ||
				captured.physicalRoot.ino !== this.vault.root.ino
			)
				throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
		};
		check();
		await this.options.directories.assertVault(this.vault);
		this.assertAdmission();
		if (this.lease) await this.lease.assertHeld();
		this.assertAdmission();
		check();
	}
	/** Reuse an existing directory authorization; this never opens a chooser or mints a grant. */
	async createFromGrant(input: { name: string; grantId: string }): Promise<SpaceRecord> {
		const name = this.name(input.name),
			grantId = input.grantId;
		await this.ready;
		this.assertAdmission();
		const validGrant = (records: WorkbenchRecords) => {
			const grant = records.grants[grantId];
			if (
				!grant ||
				grant.revokedAt !== undefined ||
				grant.deviceId !== this.vault.deviceId ||
				grant.vaultRoot.canonicalPath !== this.vault.root.canonicalPath ||
				grant.vaultRoot.dev !== this.vault.root.dev ||
				grant.vaultRoot.ino !== this.vault.root.ino
			)
				throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-missing');
			return grant;
		};
		validGrant(this.store.getState().records);
		return this.mutate(async (records) => {
			const grant = validGrant(records);
			const now = Date.now();
			const space: SpaceRecord = {
				id: crypto.randomUUID(),
				name,
				directory: { kind: 'external', grantId },
				archived: false,
				createdAt: now,
				updatedAt: now,
			};
			await this.options.directories.resolveDirectory(this.vault, space.directory, grant);
			records.spaces[space.id] = space;
			records.layouts[space.id] = emptyWorkspace();
			return space;
		});
	}
	/** Session title belongs to the business record, independently of Pane and Tab names. */
	async renameSession(target: { spaceId: string; sessionId: string }, value: string): Promise<SessionRecord> {
		const captured = { ...target },
			title = this.name(value);
		await this.ready;
		const find = (records: WorkbenchRecords) => {
			const record = records.sessions[captured.sessionId];
			if (!record) throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
			if (record.spaceId !== captured.spaceId) throw new SpaceError('SCOPE_MISMATCH', 'vault-changed');
			return record;
		};
		find(this.store.getState().records);
		return this.mutate((records) => {
			const record = { ...find(records), title };
			records.sessions[record.id] = record;
			return record;
		});
	}
	list(): SpaceRecord[] {
		return Object.values(this.store.getState().records.spaces).filter((s) => !s.archived);
	}
	/** Return only an explicitly persisted history source owner. */
	historySpaceFor(sourceRef: string): string | undefined {
		if (!sourceRef) return undefined;
		const spaceId = this.store.getState().records.historyOwners?.[sourceRef];
		return spaceId && this.store.getState().records.spaces[spaceId] ? spaceId : undefined;
	}
	/** Why one history binding cannot be recorded; archived Spaces keep attributing their own history. */
	private historyBindingProblem(
		records: WorkbenchRecords,
		sourceRef: string,
		spaceId: string,
		pending: number,
	): { code: 'INVALID_ARGUMENT' | 'TARGET_NOT_FOUND' | 'OWNER_CONFLICT'; reason: string } | undefined {
		if (!sourceRef.trim() || sourceRef.length > HISTORY_SOURCE_REF_LIMIT)
			return { code: 'INVALID_ARGUMENT', reason: 'history-source-invalid' };
		if (!Object.hasOwn(records.spaces, spaceId)) return { code: 'TARGET_NOT_FOUND', reason: 'missing-space' };
		const owner = records.historyOwners?.[sourceRef];
		if (owner === spaceId) return undefined;
		if (owner && records.spaces[owner]) return { code: 'OWNER_CONFLICT', reason: 'history-source-owned' };
		if (!owner && Object.keys(records.historyOwners ?? {}).length + pending >= HISTORY_OWNER_LIMIT)
			return { code: 'INVALID_ARGUMENT', reason: 'history-owner-capacity' };
		return undefined;
	}
	/** Persist the sourceRef→Space relationship after matching a durable session identity. */
	bindHistorySource(sourceRef: string, spaceId: string): Promise<void> {
		// Validate before queuing so a rejected request never marks the persistence layer as failed.
		const problem = this.historyBindingProblem(this.store.getState().records, sourceRef, spaceId, 0);
		if (problem) return Promise.reject(new SpaceError(problem.code, problem.reason));
		return this.bindHistorySources([{ sourceRef, spaceId }]).then((result) => {
			if (result.skipped[0]) throw new SpaceError('OWNER_CONFLICT', result.skipped[0].reason);
		});
	}
	/**
	 * Bind many rows in one durable write. Invalid, conflicting or over-capacity rows are skipped and reported;
	 * a bad row never fails the others (or the history refresh that asked for the binding).
	 */
	async bindHistorySources(
		entries: ReadonlyArray<{ sourceRef: string; spaceId: string }>,
	): Promise<{ bound: number; skipped: Array<{ sourceRef: string; reason: string }> }> {
		const skipped: Array<{ sourceRef: string; reason: string }> = [];
		const accepted = new Map<string, string>();
		const check = (records: WorkbenchRecords) => {
			skipped.length = 0;
			accepted.clear();
			for (const { sourceRef, spaceId } of entries) {
				const problem = this.historyBindingProblem(records, sourceRef, spaceId, accepted.size);
				if (problem) skipped.push({ sourceRef: sourceRef.slice(0, 128), reason: problem.reason });
				else if (records.historyOwners?.[sourceRef] !== spaceId) accepted.set(sourceRef, spaceId);
			}
		};
		check(this.store.getState().records);
		if (!accepted.size) return { bound: 0, skipped: [...skipped] };
		await this.mutate((records) => {
			check(records);
			for (const [sourceRef, spaceId] of accepted) (records.historyOwners ??= {})[sourceRef] = spaceId;
		});
		return { bound: accepted.size, skipped: [...skipped] };
	}
	/**
	 * Explicitly bind one native history source to a Space and make sure a Session exists for it.
	 * Exact de-duplication: the same full native reference is the same Session; a different Space already owning
	 * it is an OWNER_CONFLICT. `adopt` names Sessions the caller proved identical (same provider, account and
	 * native id, and the same transcript after path normalisation); the first one in this Space receives the
	 * evidence instead of a duplicate being created.
	 */
	async importHistorySession(input: {
		spaceId: string;
		sourceRef: string;
		accountKey: string;
		deviceId: string;
		agentId: AgentId;
		accountId: string;
		nativeSessionId: string;
		transcriptPath?: string;
		title: string;
		adopt?: readonly string[];
	}): Promise<{ session: SessionRecord; created: boolean }> {
		await this.ready;
		const captured = { ...input, adopt: [...(input.adopt ?? [])] };
		const same = (record: SessionRecord) =>
			record.nativeImport?.sourceRef === captured.sourceRef &&
			record.nativeImport.accountKey === captured.accountKey &&
			record.nativeImport.deviceId === captured.deviceId &&
			record.agentId === captured.agentId &&
			record.nativeSessionId === captured.nativeSessionId;
		// Refusals are decided on the current records BEFORE the writer queue, so a legitimate refusal
		// (unknown Space, owner conflict) never marks the persistence layer as failed.
		const decide = (records: WorkbenchRecords) => {
			// The record codec bounds these; reject an over-long value here, not inside the writer queue.
			if (
				!captured.accountKey ||
				captured.accountKey.length > HISTORY_EVIDENCE_LIMIT ||
				!captured.deviceId ||
				captured.deviceId.length > HISTORY_EVIDENCE_LIMIT
			)
				throw new SpaceError('INVALID_ARGUMENT', 'history-evidence-invalid');
			const space = this.resolve({ spaceId: captured.spaceId });
			const problem = this.historyBindingProblem(records, captured.sourceRef, space.id, 0);
			if (problem) throw new SpaceError(problem.code, problem.reason);
			const matches = Object.values(records.sessions).filter(
				(record) => same(record) || captured.adopt.includes(record.id),
			);
			if (matches.some((record) => record.spaceId !== space.id))
				throw new SpaceError('OWNER_CONFLICT', 'native-reference-owned');
			if (matches[0]?.archived) throw new SpaceError('SOURCE_UNAVAILABLE', 'archived-session');
			return { space, found: matches[0] };
		};
		this.assertAdmission();
		decide(this.store.getState().records);
		return this.mutate((records) => {
			this.assertAdmission();
			const { space, found } = decide(records);
			const bind = () => {
				(records.historyOwners ??= {})[captured.sourceRef] = space.id;
			};
			if (found) {
				bind();
				if (found.nativeImport) return { session: found, created: false };
				const adopted: SessionRecord = {
					...found,
					nativeImport: {
						sourceRef: captured.sourceRef,
						accountKey: captured.accountKey,
						deviceId: captured.deviceId,
						importedAt: Date.now(),
					},
				};
				records.sessions[adopted.id] = adopted;
				return { session: adopted, created: false };
			}
			const session: SessionRecord = {
				id: crypto.randomUUID(),
				spaceId: space.id,
				kind: 'agent',
				title: captured.title,
				agentId: captured.agentId,
				accountId: captured.accountId,
				nativeSessionId: captured.nativeSessionId,
				transcriptPath: captured.transcriptPath,
				createdAt: Date.now(),
				nativeImport: {
					sourceRef: captured.sourceRef,
					accountKey: captured.accountKey,
					deviceId: captured.deviceId,
					importedAt: Date.now(),
					neverStarted: true,
				},
			};
			records.sessions[session.id] = session;
			bind();
			return { session, created: true };
		});
	}
	/** The working directory a Space currently authorizes. Read-only: no record changes and nothing starts. */
	async resolveSpaceCwd(spaceId: string): Promise<string> {
		await this.ready;
		this.assertAdmission();
		const space = this.resolve({ spaceId });
		return (await this.options.directories.resolveDirectory(this.vault, space.directory, this.grant(space))).cwd;
	}
	resolve(target?: { spaceId?: string; name?: string }): SpaceRecord {
		if (!target?.spaceId && !target?.name) throw new SpaceError('TARGET_REQUIRED', 'space-required');
		const records = this.store.getState().records;
		const matches = target.spaceId
			? Object.hasOwn(records.spaces, target.spaceId)
				? [records.spaces[target.spaceId]!]
				: []
			: this.list().filter((s) => s.name === target.name);
		if (matches.length > 1) throw new SpaceError('TARGET_AMBIGUOUS', 'ambiguous-name');
		if (!matches[0]) throw new SpaceError('TARGET_NOT_FOUND', 'missing-space');
		if (matches[0].archived) throw new SpaceError('TARGET_NOT_FOUND', 'archived-space');
		return matches[0];
	}
	async requireSpace(
		spaceId?: string,
		options: { interactive?: boolean; signal?: AbortSignal } = {},
	): Promise<SpaceRecord | undefined> {
		await this.ready;
		this.assertAdmission();
		options.signal?.throwIfAborted();
		if (spaceId) return this.resolve({ spaceId });
		if (!options.interactive || !this.options.selectSpace)
			throw new SpaceError('TARGET_REQUIRED', 'space-required');
		const id = await this.options.selectSpace({
			choices: this.list().map((s) => ({
				id: s.id,
				name: s.name,
				directoryLabel:
					s.directory.kind === 'vault'
						? s.directory.target.canonicalPath
						: (this.store.getState().records.grants[s.directory.grantId]?.selectedPath ?? ''),
			})),
			signal: options.signal,
		});
		if (!id || options.signal?.aborted) return undefined;
		this.assertAdmission();
		return this.resolve({ spaceId: id });
	}
	async chooseExternal(signal?: AbortSignal): Promise<{ receipt: string; label: string } | undefined> {
		await this.ready;
		this.assertAdmission();
		if (signal?.aborted) return undefined;
		const choice = await this.options.directories.chooseExternalDirectory(this.vault, signal);
		if (!choice || signal?.aborted || this.closing || this.lost) return undefined;
		const receipt = crypto.randomUUID();
		this.pendingChoices.set(receipt, choice);
		return { receipt, label: choice.selectedPath };
	}
	discardChoice(receipt: string): void {
		this.pendingChoices.delete(receipt);
	}
	async create(input: { name: string; relativePath?: string; externalReceipt?: string }): Promise<SpaceRecord> {
		this.assertAdmission();
		const name = this.name(input.name);
		await this.ready;
		const choice = input.externalReceipt ? this.pendingChoices.get(input.externalReceipt) : undefined;
		if (input.externalReceipt && !choice) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-missing');
		if (input.externalReceipt) this.pendingChoices.delete(input.externalReceipt);
		if (input.externalReceipt && input.relativePath !== undefined)
			throw new SpaceError('INVALID_ARGUMENT', 'invalid-relative-path');
		const directory = choice
			? undefined
			: await this.options.directories.bindVaultDirectory(this.vault, input.relativePath ?? '');
		return this.mutate(async (records) => {
			const now = Date.now();
			let grant: DirectoryGrant | undefined;
			if (choice) {
				grant = { ...choice, id: crypto.randomUUID(), createdAt: now };
				records.grants[grant.id] = grant;
			}
			const space: SpaceRecord = {
				id: crypto.randomUUID(),
				name,
				directory: directory ?? { kind: 'external', grantId: grant!.id },
				archived: false,
				createdAt: now,
				updatedAt: now,
			};
			await this.options.directories.resolveDirectory(this.vault, space.directory, grant);
			records.spaces[space.id] = space;
			records.layouts[space.id] = emptyWorkspace();
			return space;
		});
	}
	private name(value: string): string {
		const name = value.trim();
		if (!name || name.length > 200 || Array.from(name).some((char) => char.charCodeAt(0) < 32))
			throw new SpaceError('INVALID_ARGUMENT', 'invalid-name');
		return name;
	}
	rename(spaceId: string, value: string): Promise<void> {
		return this.mutate((records) => {
			const space = this.resolve({ spaceId });
			records.spaces[spaceId] = { ...space, name: this.name(value), updatedAt: Date.now() };
		});
	}
	select(spaceId: string): Promise<void> {
		return this.mutate((records) => {
			this.resolve({ spaceId });
			records.selectedSpaceId = spaceId;
		});
	}
	revokeGrant(grantId: string): Promise<void> {
		return this.mutate((records) => {
			const grant = records.grants[grantId];
			if (!grant) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'grant-missing');
			records.grants[grantId] = { ...grant, revokedAt: Date.now() };
		});
	}
	saveLayout(spaceId: string | undefined, edit: { base: WorkspaceState; value: WorkspaceState }): Promise<void> {
		const captured = structuredClone(edit);
		return this.mutate((records) => {
			if (spaceId) this.resolve({ spaceId });
			const remote = spaceId ? (records.layouts[spaceId] ?? emptyWorkspace()) : records.sharedLayout;
			const next = mergeLayoutEdits(captured.base, captured.value, remote);
			if (spaceId) records.layouts[spaceId] = next;
			else records.sharedLayout = next;
		});
	}
	updateLayout(spaceId: string, transform: (layout: WorkspaceState) => WorkspaceState): Promise<void> {
		return this.mutate((records) => {
			this.resolve({ spaceId });
			records.layouts[spaceId] = transform(records.layouts[spaceId] ?? emptyWorkspace());
		});
	}
	async prepareSession(
		spaceId: string,
		input: Omit<SessionRecord, 'id' | 'spaceId' | 'createdAt'>,
		existingSessionId?: string,
	): Promise<SessionAdmission> {
		await this.ready;
		this.assertLaunchAdmission(spaceId, existingSessionId);
		const space = this.resolve({ spaceId });
		const initial = await this.options.directories.resolveDirectory(this.vault, space.directory, this.grant(space));
		const record = await this.mutate((records) => {
			this.assertLaunchAdmission(spaceId, existingSessionId);
			this.resolve({ spaceId });
			const lastAttempt = {
				runtimeId: `terminal-${crypto.randomUUID()}`,
				acceptedAt: Date.now(),
				state: 'unconfirmed' as const,
			};
			this.admittedAttempts.add(lastAttempt.runtimeId);
			if (existingSessionId) {
				const existing = records.sessions[existingSessionId];
				if (!existing || existing.spaceId !== spaceId)
					throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
				if (existing.archived) throw new SpaceError('SOURCE_UNAVAILABLE', 'archived-session');
				// An explicitly imported native conversation has no earlier attempt; its first continue is a new generation.
				if (existing.lastAttempt ? existing.lastAttempt.state === 'unconfirmed' : !isNeverStartedImport(existing))
					throw new SpaceError('EFFECT_UNKNOWN', 'attempt-unconfirmed');
				return (records.sessions[existingSessionId] = {
					...existing,
					nativeImport: existing.nativeImport ? { ...existing.nativeImport, neverStarted: undefined } : undefined,
					nativeSessionId: input.nativeSessionId,
					transcriptPath: input.transcriptPath,
					lastAttempt,
				});
			}
			const session: SessionRecord = {
				id: crypto.randomUUID(),
				spaceId,
				kind: input.kind,
				title: input.title,
				agentId: input.agentId,
				accountId: input.accountId,
				shell: input.shell,
				nativeSessionId: input.nativeSessionId,
				transcriptPath: input.transcriptPath,
				createdAt: Date.now(),
				lastAttempt,
			};
			records.sessions[session.id] = session;
			return session;
		});
		return {
			record,
			runtimeId: record.lastAttempt!.runtimeId,
			cwd: initial.cwd,
			beforeSpawn: async () => {
				this.assertAdmission();
				this.assertLaunchAdmission(spaceId, record.id);
				if (!this.lease || this.lease.lost.aborted) throw new SpaceError('OWNER_CONFLICT', 'listener-lost');
				await this.lease.assertHeld();
				const current = this.resolve({ spaceId });
				const grant = this.grant(current);
				const resolved = await this.options.directories.resolveDirectory(this.vault, current.directory, grant);
				this.assertAdmission();
				await this.lease.assertHeld();
				this.assertAdmission();
				const final = this.resolve({ spaceId });
				const finalGrant = this.grant(final);
				const saved = this.store.getState().records.sessions[record.id];
				if (!saved || saved.spaceId !== spaceId) throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
				this.assertLaunchAdmission(spaceId, record.id);
				if (saved.lastAttempt?.runtimeId !== record.lastAttempt?.runtimeId)
					throw new SpaceError('STALE_RUNTIME', 'runtime-changed');
				if (saved.lastAttempt?.state !== 'unconfirmed')
					throw new SpaceError('SOURCE_UNAVAILABLE', 'attempt-cancelled');
				if (
					JSON.stringify(final.directory) !== JSON.stringify(current.directory) ||
					JSON.stringify(finalGrant) !== JSON.stringify(grant) ||
					finalGrant?.revokedAt !== undefined
				)
					throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
				if (resolved.cwd !== initial.cwd) throw new SpaceError('DIRECTORY_NOT_AUTHORIZED', 'directory-changed');
			},
		};
	}
	private enqueueInbox<T>(run: () => Promise<T>): Promise<T> {
		const operation = this.tail.then(run);
		this.tail = operation.then(
			() => {},
			() => {},
		);
		return operation.catch((cause: unknown) => {
			const error =
				cause instanceof SpaceError
					? cause
					: new SpaceError('PERSISTENCE_FAILED', 'inbox-commit-failed', {}, cause);
			if (
				[
					'TARGET_NOT_FOUND',
					'SCOPE_MISMATCH',
					'SOURCE_UNAVAILABLE',
					'EFFECT_UNKNOWN',
					'STALE_RUNTIME',
					'WAIT_CANCELLED',
					'WAIT_TIMEOUT',
					'INVALID_ARGUMENT',
				].includes(error.code)
			)
				throw error;
			this.failure = error;
			this.store.setState({ error });
			this.options.report(error);
			throw error;
		});
	}
	/** Read the primary bytes after all earlier owner work settles. This path never loads JsonStore or writes recovery files. */
	private async readPrimaryRecords(): Promise<WorkbenchRecords> {
		await this.ready;
		this.assertAdmission();
		if (!(await this.options.storage.exists(this.path))) {
			if (this.primaryState === 'initial-empty') return emptyRecords(this.vault);
			throw new SpaceError('EFFECT_UNKNOWN', 'primary-missing');
		}
		const text = await this.options.storage.read(this.path);
		const decoded = this.decodeStored(text);
		if (!decoded) throw new SpaceError('PERSISTENCE_FAILED', 'primary-invalid');
		return decoded;
	}
	async freshInboxPrimary(): Promise<InboxPrimaryView> {
		return this.enqueueInbox(async () => {
			try {
				return { freshness: 'fresh', records: structuredClone(await this.readPrimaryRecords()) };
			} catch (cause) {
				if (
					cause instanceof SpaceError &&
					['SCOPE_MISMATCH', 'OWNER_CONFLICT', 'SOURCE_UNAVAILABLE'].includes(cause.code)
				)
					throw cause;
				return { freshness: 'unknown', reason: cause instanceof Error ? cause.message : String(cause) };
			}
		});
	}
	private async commitInbox(base: WorkbenchRecords, next: WorkbenchRecords): Promise<WorkbenchRecords> {
		this.assertAdmission();
		this.activePermit = true;
		try {
			await this.ensureWriter();
			await this.assertPermit();
			const committed = await this.disk!.commit({ base, value: next });
			this.assertScope(committed);
			await this.assertPermit();
			this.failure = undefined;
			this.store.setState({ records: committed, error: undefined });
			this.primaryState = 'present';
			return committed;
		} finally {
			this.activePermit = false;
			this.pendingWriteGuard = undefined;
			this.primaryWriteStarted = undefined;
		}
	}
	private inboxDocument(records: WorkbenchRecords): InboxDocument {
		return records.inbox && validateInboxDocument(records.inbox, { vaultId: this.vault.vaultId })
			? records.inbox
			: emptyInbox();
	}
	private inboxTarget(records: WorkbenchRecords, recipient: InboxRecipient, allowArchived = false): SessionRecord {
		if (!recipient || typeof recipient.spaceId !== 'string' || typeof recipient.sessionId !== 'string')
			throw new SpaceError('TARGET_REQUIRED', 'session-required');
		const space = records.spaces[recipient.spaceId];
		const session = records.sessions[recipient.sessionId];
		if (!space || !session || session.spaceId !== recipient.spaceId)
			throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
		if (!allowArchived && (space.archived || session.archived))
			throw new SpaceError('SOURCE_UNAVAILABLE', 'archived-session');
		return session;
	}
	private inboxFenceKey(recipient: InboxRecipient, highWaterSequence: number, generation: number): string {
		return `${recipient.spaceId}\u0000${recipient.sessionId}\u0000${highWaterSequence}\u0000${generation}`;
	}
	private inboxFingerprint(messages: readonly InboxMessage[], highWaterSequence: number): string {
		const source = JSON.stringify(
			messages
				.filter((message) => message.sendSequence <= highWaterSequence)
				.sort((a, b) => a.sendSequence - b.sendSequence)
				.map((message) => ({
					messageId: message.messageId,
					recipient: message.recipient,
					source: message.source,
					body: message.body,
					references: message.references,
					sendSequence: message.sendSequence,
					createdAt: message.createdAt,
				})),
		);
		let first = 2166136261;
		let second = 16777619;
		for (let index = 0; index < source.length; index += 1) {
			const code = source.charCodeAt(index);
			first = Math.imul(first ^ code, 16777619);
			second = Math.imul(second ^ (code + index), 2246822519);
		}
		return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
	}
	private cleanupInboxFences(now = Date.now()): void {
		for (const [key, fence] of this.inboxFences) if (fence.expires <= now) this.inboxFences.delete(key);
		for (const [key, fence] of this.inboxLatestFences) {
			if (
				fence.expires <= now ||
				!this.inboxFences.has(this.inboxFenceKey(fence.recipient, fence.highWaterSequence, fence.generation))
			)
				this.inboxLatestFences.delete(key);
		}
		const trim = <T>(map: Map<string, T & { expires: number }>) => {
			while (map.size > INBOX_FENCE_LIMIT) {
				const oldest = [...map.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
				if (!oldest) break;
				map.delete(oldest[0]);
			}
		};
		trim(this.inboxFences);
		trim(this.inboxLatestFences);
	}
	async sendInbox(input: InboxSendInput, options: { signal?: AbortSignal } = {}): Promise<InboxMessage> {
		if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-send-cancelled');
		await this.ready;
		if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-send-cancelled');
		if (
			!validateMessageId(input.messageId) ||
			!validateInboxSource(input.source) ||
			!validateInboxMessage(
				{
					messageId: input.messageId,
					recipient: input.recipient,
					source: input.source,
					body: input.body,
					references: input.references ?? [],
					sendSequence: 1,
					createdAt: 0,
				},
				{ vaultId: this.vault.vaultId },
			) ||
			(input.references ?? []).some((reference) => !validateVaultFileReference(reference, this.vault.vaultId))
		)
			throw new SpaceError('INVALID_ARGUMENT', 'inbox-message-invalid');
		const captured = structuredClone({
			...input,
			recipient: { ...input.recipient },
			references: [...(input.references ?? [])],
		});
		return this.enqueueInbox(async () => {
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-send-cancelled');
			const base = await this.readPrimaryRecords();
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-send-cancelled');
			this.inboxTarget(base, captured.recipient);
			for (const gate of this.archiveGates.values())
				if (
					gate.plan.scope.spaceId === captured.recipient.spaceId &&
					(gate.plan.scope.kind === 'space' || gate.plan.scope.sessionId === captured.recipient.sessionId)
				)
					throw new SpaceError('SOURCE_UNAVAILABLE', 'archive-in-progress');
			const document = this.inboxDocument(base);
			if (document.messages.some((message) => message.messageId === captured.messageId))
				throw new SpaceError('INVALID_ARGUMENT', 'message-id-exists', { messageId: captured.messageId });
			const sequence = document.nextSequence;
			if (!Number.isSafeInteger(sequence) || sequence <= 0)
				throw new SpaceError('INVALID_ARGUMENT', 'inbox-sequence-exhausted');
			const message: InboxMessage = {
				messageId: captured.messageId,
				recipient: captured.recipient,
				source: captured.source,
				body: captured.body,
				references: captured.references,
				sendSequence: sequence,
				createdAt: Date.now(),
			};
			const nextDocument: InboxDocument = {
				version: 1,
				messages: [...document.messages, message],
				nextSequence: sequence + 1,
			};
			if (
				nextDocument.messages.length > INBOX_LIMITS.maxMessages ||
				inboxCapacityBytes(nextDocument) > INBOX_LIMITS.documentBytes
			)
				throw new SpaceError('INVALID_ARGUMENT', 'inbox-capacity');
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-send-cancelled');
			const next = structuredClone(base);
			next.inbox = nextDocument;
			await this.commitInbox(base, next);
			return structuredClone(message);
		});
	}
	async listInbox(input: InboxListInput): Promise<InboxListResult> {
		if (!input?.sessionId) throw new SpaceError('TARGET_REQUIRED', 'session-required');
		const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
		return this.enqueueInbox(async () => {
			this.cleanupInboxFences();
			const records = await this.readPrimaryRecords();
			const recipient = {
				spaceId: input.spaceId ?? records.sessions[input.sessionId]?.spaceId ?? '',
				sessionId: input.sessionId,
			};
			this.inboxTarget(records, recipient, true);
			if (input.spaceId && records.sessions[input.sessionId]?.spaceId !== input.spaceId)
				throw new SpaceError('SCOPE_MISMATCH', 'session-space-mismatch');
			const messages = this.inboxDocument(records)
				.messages.filter(
					(message) =>
						message.recipient.sessionId === input.sessionId &&
						(!input.spaceId || message.recipient.spaceId === input.spaceId),
				)
				.sort((a, b) => a.sendSequence - b.sendSequence);
			const latestKey = `${recipient.spaceId}\u0000${recipient.sessionId}`;
			let fence: InboxFence;
			if (input.highWaterSequence !== undefined || input.generation !== undefined) {
				if (
					!Number.isSafeInteger(input.highWaterSequence) ||
					input.highWaterSequence! < 0 ||
					!Number.isSafeInteger(input.generation) ||
					input.generation! < 1
				)
					throw new SpaceError('INVALID_ARGUMENT', 'inbox-fence-invalid');
				const key = this.inboxFenceKey(recipient, input.highWaterSequence!, input.generation!);
				fence = this.inboxFences.get(key)!;
				if (
					!fence ||
					fence.recipient.spaceId !== recipient.spaceId ||
					fence.recipient.sessionId !== recipient.sessionId ||
					this.inboxFingerprint(messages, fence.highWaterSequence) !== fence.fingerprint
				)
					throw new SpaceError('STALE_RUNTIME', 'inbox-page-stale');
			} else {
				const highWaterSequence = messages.at(-1)?.sendSequence ?? 0;
				const previous = this.inboxLatestFences.get(latestKey);
				const previousFingerprint = previous
					? this.inboxFingerprint(messages, previous.highWaterSequence)
					: undefined;
				const generation =
					previous && previousFingerprint === previous.fingerprint
						? previous.generation
						: (previous?.generation ?? 0) + 1;
				fence = {
					recipient: { ...recipient },
					highWaterSequence,
					generation,
					fingerprint: this.inboxFingerprint(messages, highWaterSequence),
					expires: Date.now() + INBOX_FENCE_TTL_MS,
				};
				this.inboxLatestFences.set(latestKey, fence);
				this.inboxFences.set(this.inboxFenceKey(recipient, highWaterSequence, generation), fence);
				this.cleanupInboxFences();
			}
			const highWaterSequence = fence.highWaterSequence;
			const after = input.afterSequence ?? 0;
			const page = messages
				.filter(
					(message) =>
						(input.afterSequence === undefined
							? message.sendSequence > after
							: message.sendSequence >= after) && message.sendSequence <= highWaterSequence,
				)
				.slice(0, limit);
			const lastReturned = page.at(-1)?.sendSequence;
			return {
				rows: structuredClone(page.map(inboxSummary)),
				highWaterSequence,
				nextSequence:
					lastReturned === undefined
						? undefined
						: messages.find(
								(message) =>
									message.sendSequence > lastReturned && message.sendSequence <= highWaterSequence,
							)?.sendSequence,
				generation: fence.generation,
				freshness: 'fresh',
			};
		});
	}
	async readInbox(messageId: string, target?: InboxRecipient): Promise<InboxMessage> {
		if (!validateMessageId(messageId)) throw new SpaceError('INVALID_ARGUMENT', 'message-id-invalid');
		return this.enqueueInbox(async () => {
			const records = await this.readPrimaryRecords();
			const message = this.inboxDocument(records).messages.find((row) => row.messageId === messageId);
			if (!message) throw new SpaceError('TARGET_NOT_FOUND', 'missing-message');
			if (
				target &&
				(target.spaceId !== message.recipient.spaceId || target.sessionId !== message.recipient.sessionId)
			)
				throw new SpaceError('SCOPE_MISMATCH', 'message-recipient-mismatch');
			return structuredClone(message);
		});
	}
	async ackInbox(
		messageId: string,
		target?: InboxRecipient,
		options: { signal?: AbortSignal } = {},
	): Promise<{ message: InboxMessage; status: 'ack-saved' | 'already-acked'; effect: 'completed' | 'none' }> {
		if (!validateMessageId(messageId)) throw new SpaceError('INVALID_ARGUMENT', 'message-id-invalid');
		if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-ack-cancelled');
		return this.enqueueInbox(async () => {
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-ack-cancelled');
			const base = await this.readPrimaryRecords();
			if (options.signal?.aborted) throw new SpaceError('WAIT_CANCELLED', 'inbox-ack-cancelled');
			const document = this.inboxDocument(base);
			const index = document.messages.findIndex((row) => row.messageId === messageId);
			if (index < 0) throw new SpaceError('TARGET_NOT_FOUND', 'missing-message');
			const current = document.messages[index]!;
			if (
				target &&
				(target.spaceId !== current.recipient.spaceId || target.sessionId !== current.recipient.sessionId)
			)
				throw new SpaceError('SCOPE_MISMATCH', 'message-recipient-mismatch');
			if (current.ack) return { message: structuredClone(current), status: 'already-acked', effect: 'none' };
			const acked: InboxMessage = { ...current, ack: { ackedAt: Date.now() } };
			const next = structuredClone(base);
			next.inbox = {
				...document,
				messages: document.messages.map((row, rowIndex) => (rowIndex === index ? acked : row)),
			};
			await this.commitInbox(base, next);
			return { message: structuredClone(acked), status: 'ack-saved', effect: 'completed' };
		});
	}
	sendMessage(input: InboxSendInput, options: { signal?: AbortSignal } = {}) {
		return this.sendInbox(input, options);
	}
	listMessages(input: InboxListInput) {
		return this.listInbox(input);
	}
	readMessage(messageId: string, target?: InboxRecipient) {
		return this.readInbox(messageId, target);
	}
	ackMessage(messageId: string, target?: InboxRecipient, options: { signal?: AbortSignal } = {}) {
		return this.ackInbox(messageId, target, options);
	}
	/** Queue inspection shares ordering with commits, but acquires no writer and performs no write. */
	private inspect<T>(read: (records: WorkbenchRecords) => T): Promise<T> {
		const operation = this.tail.then(async () => {
			await this.ready;
			this.assertAdmission();
			return read(this.store.getState().records);
		});
		this.tail = operation.then(
			() => {},
			() => {},
		);
		return operation;
	}
	private archivePlan(records: WorkbenchRecords, scope: ArchiveScope): ArchivePlan {
		if (!records.spaces[scope.spaceId]) throw new SpaceError('TARGET_NOT_FOUND', 'missing-space');
		if (scope.kind === 'session' && records.sessions[scope.sessionId]?.spaceId !== scope.spaceId)
			throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
		const members = Object.values(records.sessions)
			.filter(
				(record) =>
					record.spaceId === scope.spaceId && (scope.kind === 'space' || record.id === scope.sessionId),
			)
			.map((record) => ({
				spaceId: record.spaceId,
				sessionId: record.id,
				runtimeId: record.lastAttempt?.runtimeId,
			}))
			.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
		return structuredClone({ scope, members, fingerprint: JSON.stringify({ scope, members }) });
	}
	admittedThisActivation(runtimeId: string): boolean {
		return this.admittedAttempts.has(runtimeId);
	}
	inspectArchive(scope: ArchiveScope): Promise<ArchivePlan> {
		const captured = structuredClone(scope);
		return this.inspect((records) => this.archivePlan(records, captured));
	}
	acquireArchive(plan: ArchivePlan, beforeAcquire?: () => void): Promise<ArchivePermit> {
		const captured = structuredClone(plan);
		return this.inspect((records) => {
			beforeAcquire?.();
			const current = this.archivePlan(records, captured.scope);
			if (current.fingerprint !== captured.fingerprint)
				throw new SpaceError('STALE_RUNTIME', 'archive-scope-changed');
			for (const gate of this.archiveGates.values())
				if (
					gate.plan.scope.spaceId === captured.scope.spaceId &&
					(gate.plan.scope.kind === 'space' ||
						captured.scope.kind === 'space' ||
						gate.plan.scope.sessionId === captured.scope.sessionId)
				)
					throw new SpaceError('SOURCE_UNAVAILABLE', 'archive-in-progress');
			const permit = { id: crypto.randomUUID(), plan: current };
			this.archiveGates.set(permit.id, structuredClone(permit));
			return permit;
		});
	}
	releaseArchive(permit: ArchivePermit): void {
		this.archiveGates.delete(permit.id);
	}
	checkpointAttempt(
		target: ManagedRuntimeRef,
		termination: TerminationEvidence,
		stopRequestedAt?: number,
		resume?: Pick<SessionRecord, 'nativeSessionId' | 'transcriptPath'>,
	): Promise<void> {
		const ref = { ...target },
			source = resume ? { ...resume } : undefined;
		const captured = parseTerminationEvidence(termination);
		if (!captured) return Promise.reject(new SpaceError('INVALID_ARGUMENT', 'invalid-termination'));
		return this.mutate((records) => {
			const record = records.sessions[ref.sessionId];
			if (!record || record.spaceId !== ref.spaceId) throw new SpaceError('TARGET_NOT_FOUND', 'missing-session');
			if (record.lastAttempt?.runtimeId !== ref.runtimeId)
				throw new SpaceError('STALE_RUNTIME', 'runtime-changed');
			const state = terminationConfirmed(captured)
				? captured.root.state === 'not-started'
					? 'not-started'
					: 'settled'
				: 'unconfirmed';
			records.sessions[record.id] = {
				...record,
				...(source?.nativeSessionId ? { nativeSessionId: source.nativeSessionId } : {}),
				...(source?.transcriptPath ? { transcriptPath: source.transcriptPath } : {}),
				lastAttempt: {
					...record.lastAttempt,
					state,
					termination: captured,
					...(stopRequestedAt === undefined ? {} : { stopRequestedAt }),
				},
			};
		});
	}
	commitArchive(input: ArchivePermit, beforeCommit?: () => void, onPrimaryWrite?: () => void): Promise<void> {
		const permit = structuredClone(input);
		return this.mutate(
			(records) => {
				beforeCommit?.();
				const held = this.archiveGates.get(permit.id);
				if (
					!held ||
					held.plan.fingerprint !== permit.plan.fingerprint ||
					this.archivePlan(records, held.plan.scope).fingerprint !== held.plan.fingerprint
				)
					throw new SpaceError('STALE_RUNTIME', 'archive-scope-changed');
				for (const member of held.plan.members) {
					const record = records.sessions[member.sessionId]!;
					// A pre-marker legacy record has no proof of the old process outcome.
					if (record.lastAttempt ? !record.lastAttempt.termination || !terminationConfirmed(record.lastAttempt.termination) : !isNeverStartedImport(record))
						throw new SpaceError('EFFECT_UNKNOWN', 'attempt-unconfirmed');
				}
				if (held.plan.scope.kind === 'session') {
					const id = held.plan.scope.sessionId;
					records.sessions[id] = { ...records.sessions[id]!, archived: true };
				}
				if (held.plan.scope.kind === 'space') {
					const space = records.spaces[held.plan.scope.spaceId]!;
					records.spaces[space.id] = { ...space, archived: true, updatedAt: Date.now() };
					if (records.selectedSpaceId === space.id) records.selectedSpaceId = undefined;
				}
			},
			beforeCommit,
			onPrimaryWrite,
		);
	}

	/** One in-flight disk operation plus one latest value per target, never one Promise per event. */
	stageActivityHint(target: ManagedRuntimeRef, hint: ActivityCompletionHint): boolean {
		if (this.closing || this.lost || !validActivityHint(hint) || hint.runtimeId !== target.runtimeId) return false;
		const record = this.store.getState().records.sessions[target.sessionId];
		if (!record || record.spaceId !== target.spaceId || record.lastAttempt?.runtimeId !== target.runtimeId)
			return false;
		const key = target.sessionId;
		const old =
			this.hintDirty.get(key)?.hint ??
			(this.hintFlight?.target.sessionId === key ? this.hintFlight.hint : record.completionHint);
		const latest = old?.runtimeId === hint.runtimeId && old.activitySequence > hint.activitySequence ? old : hint;
		const value = Object.freeze({
			...latest,
			seenThrough: Math.max(
				hint.seenThrough,
				old?.runtimeId === hint.runtimeId ? Math.min(old.seenThrough, latest.activitySequence) : 0,
			),
		});
		const failed = this.hintErrors.get(key);
		if (failed?.runtimeId === target.runtimeId && this.hintCovers(failed.hint, value)) return false;
		if (
			this.hintCovers(record.completionHint, value) ||
			this.hintCovers(this.hintDirty.get(key)?.hint, value) ||
			(this.hintFlight?.target.sessionId === key && this.hintCovers(this.hintFlight.hint, value))
		)
			return true;
		if (
			!this.hintDirty.has(key) &&
			this.hintFlight?.target.sessionId !== key &&
			this.hintDirty.size + (this.hintFlight ? 1 : 0) >= 32
		)
			return false;
		this.hintDirty.set(key, { target: Object.freeze({ ...target }), hint: value });
		this.pumpActivityHints();
		return true;
	}
	activityHintUsage(): Readonly<{ inFlight: number; dirtyTargets: number; waiters: number }> {
		return { inFlight: this.hintFlight ? 1 : 0, dirtyTargets: this.hintDirty.size, waiters: this.hintWaiters.size };
	}
	activityHintError(target: ManagedRuntimeRef): Error | undefined {
		const failure = this.hintErrors.get(target.sessionId);
		return failure?.runtimeId === target.runtimeId ? failure.error : undefined;
	}
	observeActivityHint(
		target: ManagedRuntimeRef,
		hint: ActivityCompletionHint,
		options: { timeoutMs?: number; signal?: AbortSignal } = {},
	): Promise<void> {
		if (options.signal?.aborted) return Promise.reject(new SpaceError('WAIT_CANCELLED', 'activity-wait-cancelled'));
		if (this.hintWaiters.size >= 32)
			return Promise.reject(new SpaceError('SOURCE_UNAVAILABLE', 'activity-capacity'));
		if (this.hintErrors.get(target.sessionId)?.runtimeId === target.runtimeId)
			this.hintErrors.delete(target.sessionId);
		if (!this.stageActivityHint(target, hint))
			return Promise.reject(new SpaceError('SOURCE_UNAVAILABLE', 'activity-capacity'));
		if (this.hintCovers(this.store.getState().records.sessions[target.sessionId]?.completionHint, hint))
			return Promise.resolve();
		return new Promise((resolve, reject) => {
			let timer: unknown;
			const finish = (error?: Error) => {
				this.hintWaiters.delete(waiter);
				if (timer !== undefined) this.hintClock.clearTimeout(timer);
				options.signal?.removeEventListener('abort', abort);
				if (error) reject(error);
				else resolve();
			};
			const abort = () => finish(new SpaceError('WAIT_CANCELLED', 'activity-wait-cancelled'));
			const waiter = { target: { ...target }, hint: { ...hint }, finish };
			this.hintWaiters.add(waiter);
			options.signal?.addEventListener('abort', abort, { once: true });
			timer = this.hintClock.setTimeout(
				() => finish(new SpaceError('WAIT_TIMEOUT', 'activity-wait-timeout')),
				Math.max(0, Math.min(10000, options.timeoutMs ?? 10000)),
			);
			if (options.signal?.aborted) abort();
		});
	}
	private hintCovers(saved: ActivityCompletionHint | undefined, wanted: ActivityCompletionHint): boolean {
		return (
			saved?.runtimeId === wanted.runtimeId &&
			saved.activitySequence >= wanted.activitySequence &&
			saved.seenThrough >= wanted.seenThrough
		);
	}
	private pumpActivityHints(): void {
		if (this.hintPump || this.hintsPaused) return;
		const run = async () => {
			while (this.hintDirty.size && !this.hintsPaused) {
				const [key, value] = this.hintDirty.entries().next().value!;
				this.hintDirty.delete(key);
				this.hintFlight = value;
				let failure: Error | undefined;
				try {
					await this.mutate(
						(records) => {
							const record = records.sessions[value.target.sessionId];
							if (
								!record ||
								record.spaceId !== value.target.spaceId ||
								record.lastAttempt?.runtimeId !== value.target.runtimeId
							)
								throw new SpaceError('STALE_RUNTIME', 'activity-runtime-changed');
							const previous = record.completionHint;
							if (
								previous?.runtimeId === value.hint.runtimeId &&
								previous.activitySequence > value.hint.activitySequence
							)
								return;
							records.sessions[record.id] = {
								...record,
								completionHint: {
									...value.hint,
									seenThrough: Math.max(
										value.hint.seenThrough,
										previous?.runtimeId === value.hint.runtimeId
											? Math.min(previous.seenThrough, value.hint.activitySequence)
											: 0,
									),
								},
							};
						},
						undefined,
						undefined,
						true,
					);
					this.hintErrors.delete(key);
				} catch (error) {
					failure = error instanceof Error ? error : new Error(String(error));
					if (this.hintErrors.size < 32 || this.hintErrors.has(key))
						this.hintErrors.set(key, {
							runtimeId: value.target.runtimeId,
							hint: value.hint,
							error: failure,
						});
					else this.hintOverflow ??= new SpaceError('PERSISTENCE_FAILED', 'activity-error-capacity');
					this.store.setState({ error: failure });
				} finally {
					this.hintFlight = undefined;
				}
				for (const waiter of [...this.hintWaiters])
					if (waiter.target.sessionId === key) {
						if (failure) waiter.finish(failure);
						else if (
							this.hintCovers(this.store.getState().records.sessions[key]?.completionHint, waiter.hint)
						)
							waiter.finish();
						else if (
							this.store.getState().records.sessions[key]?.lastAttempt?.runtimeId !==
							waiter.target.runtimeId
						)
							waiter.finish(new SpaceError('STALE_RUNTIME', 'activity-runtime-changed'));
					}
			}
		};
		this.hintPump = run().finally(() => {
			this.hintPump = undefined;
			if (this.hintDirty.size && !this.hintsPaused) this.pumpActivityHints();
		});
	}

	quiesceLaunches(): void {
		this.launchClosed = true;
	}
	private assertLaunchAdmission(spaceId: string, sessionId?: string): void {
		this.assertAdmission();
		if (this.launchClosed) throw new SpaceError('SOURCE_UNAVAILABLE', 'module-closing');
		for (const { plan } of this.archiveGates.values())
			if (plan.scope.spaceId === spaceId && (plan.scope.kind === 'space' || plan.scope.sessionId === sessionId))
				throw new SpaceError('SOURCE_UNAVAILABLE', 'archive-in-progress');
	}
	private grant(space: SpaceRecord): DirectoryGrant | undefined {
		return space.directory.kind === 'external'
			? this.store.getState().records.grants[space.directory.grantId]
			: undefined;
	}
	async flush(): Promise<void> {
		do {
			await this.hintPump;
			await this.tail;
		} while (this.hintPump || (this.hintDirty.size && !this.hintsPaused));
		if (this.failure) throw this.failure;
		if (this.hintOverflow) throw this.hintOverflow;
		if (this.hintErrors.size) throw this.hintErrors.values().next().value!.error;
	}
	/** Recovery protocol: from now on every new write fails with BUSY (`recovery-busy`) and accepted hints wait. */
	quiesceWrites(): void {
		this.recoveryHeld = true;
	}
	resumeWrites(): void {
		this.recoveryHeld = false;
		this.hintsPaused = false;
		if (this.hintDirty.size) this.pumpActivityHints();
	}
	/** Strict drain: every write admitted before the hold has settled and none failed; later activity hints stay staged. */
	async drainWrites(): Promise<void> {
		await this.ready;
		await this.flush();
		this.hintsPaused = true;
		await this.hintPump;
		await this.tail;
		if (this.failure) throw this.failure;
		if (this.hintErrors.size) throw this.hintErrors.values().next().value!.error;
	}
	/**
	 * Adopt restored bytes: re-read the records, drop the JsonStore so the next commit builds a fresh baseline from disk,
	 * and forget staged hints/errors that referred to the replaced records. Call only after `drainWrites`.
	 */
	async reloadFromDisk(): Promise<void> {
		await this.ready;
		const records = await this.readPersisted();
		this.disk = undefined;
		this.hintDirty.clear();
		this.hintErrors.clear();
		this.hintOverflow = undefined;
		this.failure = undefined;
		this.store.setState({ records, error: undefined, loading: false });
	}
	dispose(): Promise<void> {
		if (this.disposing) return this.disposing;
		this.closing = true;
		this.pendingChoices.clear();
		this.inboxFences.clear();
		this.inboxLatestFences.clear();
		this.disposing = (async () => {
			try {
				await this.ready;
				await this.flush();
			} finally {
				await this.lease?.close();
			}
		})();
		return this.disposing;
	}
}
