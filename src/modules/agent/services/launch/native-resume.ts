import { t } from '../../../../shared/i18n';
import { terminationConfirmed } from '../../../../shared/native/termination';
import { AGENT_CATALOG, getAgent } from '../../core/launch/catalog';
import type { AgentId } from '../../core/launch/types';
import type {
	ManagedRuntimeRef,
	ManagedRuntimeSummary,
	ManagedSessionSummary,
} from '../../core/workspace/managed-runtime';
import {
	registerLocalInstance,
	type NativeOccupancy,
	type OccupancyLease,
} from '../../platform/desktop/native-reference/occupancy';
import {
	NativeReferenceError,
	accountNameOf,
	nativeReferenceOf,
	occupancyIdentity,
	type NativeReference,
	type OccupancyIdentity,
} from '../../platform/desktop/native-reference/reference';
import type { NativeSessionSummary } from '../../platform/desktop/server/agent-data-client';
import type { SpaceService } from '../spaces/space-service';
import type { SessionRecord } from '../spaces/records';
import { SpaceError } from '../../core/space/errors';
import { spaceErrorMessage } from '../spaces/messages';
import { ManagedLaunchError } from './managed-errors';
import { nativeOccupancyDigest } from '../../platform/desktop/native-reference/reference';

export type NativeResumeCode =
	| 'INVALID_ARGUMENT'
	| 'TARGET_NOT_FOUND'
	| 'OWNER_CONFLICT'
	| 'SOURCE_UNAVAILABLE'
	| 'DIRECTORY_NOT_AUTHORIZED'
	| 'CAPABILITY_UNAVAILABLE'
	| 'EFFECT_UNKNOWN';

/** An explicit, localized refusal. A refusal never creates a Session or a process. */
export class NativeResumeError extends Error {
	constructor(
		readonly code: NativeResumeCode,
		readonly reason: string,
		readonly details: Readonly<Record<string, string | number>> = {},
	) {
		super(t(`agent.historyResume.error.${reason}`, details));
		this.name = 'NativeResumeError';
	}
}

export interface ResumeRequest {
	readonly spaceId: string;
	readonly row: NativeSessionSummary;
	/** Show the resulting terminal. Control callers run in the background. */
	readonly foreground?: boolean;
}
export interface ImportRequest {
	readonly spaceId: string;
	readonly row: NativeSessionSummary;
	readonly title?: string;
}
export interface ImportResult {
	readonly spaceId: string;
	readonly sessionId: string;
	/** False when the full native reference was already imported: the same record is returned. */
	readonly created: boolean;
}
export interface ResumeResult {
	readonly mode: 'attached' | 'resumed' | 'cancelled';
	readonly spaceId: string;
	readonly sessionId: string;
	readonly runtimeId?: string;
	/** The runtime generation that preceded a resume, if the Session ran before. */
	readonly previousRuntimeId?: string;
}
export interface OpenResult {
	readonly spaceId: string;
	readonly sessionId: string;
	readonly state: 'live' | 'ended' | 'unconfirmed';
	readonly runtimeId?: string;
	readonly attached: boolean;
	readonly sourceRef?: string;
}

export interface NativeResumePorts {
	readonly deviceId: string;
	readonly instanceId: string;
	readonly vaultId: string;
	readonly spaces: Pick<
		SpaceService,
		'store' | 'resolve' | 'historySpaceFor' | 'importHistorySession' | 'resolveSpaceCwd'
	>;
	readonly occupancy: NativeOccupancy;
	managed(target: { spaceId: string; sessionId: string }): ManagedSessionSummary | undefined;
	subscribeManaged(listener: () => void): () => void;
	/** Attach the display of a running runtime. Never spawns. */
	attach(target: { spaceId: string; sessionId: string; runtimeId: string }, focus: boolean): Promise<void>;
	samePath(left: string, right: string): Promise<boolean>;
	/** Canonical real spelling of a provider-store path; the identity of what is physically occupied. */
	canonicalPath(file: string): Promise<string>;
	/** Provider enablement, program, account/device reference and transcript. Throws when any fails. */
	verify(row: NativeSessionSummary): Promise<void>;
	/**
	 * Start the exact provider resume as a new runtime generation of an EXISTING Session. `reserved` must be
	 * called as soon as the generation is reserved. Resolves undefined when the user declined a confirmation.
	 */
	launch(
		request: { spaceId: string; session: SessionRecord; row: NativeSessionSummary; foreground: boolean },
		reserved: (runtimeId: string) => void,
	): Promise<{ runtimeId: string } | undefined>;
}

/** A runtime counts as gone only on evidence, never on a missing signal. */
export function runtimeEnded(runtime: ManagedRuntimeSummary): boolean {
	if (runtime.phase === 'launch-pending' || runtime.phase === 'connected') return false;
	if (runtime.termination) return terminationConfirmed(runtime.termination);
	return runtime.phase === 'exited' && runtime.exit?.confirmed === true;
}
export function supportsNativeResume(agentId: string): agentId is AgentId {
	return AGENT_CATALOG.some((agent) => agent.id === agentId);
}

interface Tracked {
	readonly lease: OccupancyLease;
	readonly target: { spaceId: string; sessionId: string };
	runtimeId: string;
	/** A new generation of the same Session is about to take this lease over; do not release it meanwhile. */
	continuing?: boolean;
}
/** A held machine-wide claim on one conversation. */
export interface SpawnGuard {
	/** Release explicitly. Only call this once the runtime has verifiably ended or never started. */
	release(): Promise<void>;
}
export interface GuardRequest {
	readonly provider: string;
	readonly nativeSessionId: string;
	readonly transcriptPath: string;
	readonly spaceId: string;
	readonly sessionId: string;
	/** The reserved generation. When given, the lease follows it and is released on its verified exit. */
	readonly runtime?: ManagedRuntimeRef;
}

function occupiedError(
	acquired: Extract<Awaited<ReturnType<NativeOccupancy['acquire']>>, { kind: 'conflict' }>,
	sessionId: string,
): NativeResumeError {
	if (acquired.self && acquired.owner?.sessionId === sessionId)
		return new NativeResumeError('OWNER_CONFLICT', 'resume-in-progress');
	return new NativeResumeError(
		'OWNER_CONFLICT',
		acquired.self
			? 'occupied-here'
			: acquired.reason === 'unreadable'
				? 'occupied-unreadable'
				: acquired.reason === 'unverified-owner'
					? 'occupied-unverified'
					: acquired.reason === 'reclaim-busy'
						? 'occupied-busy'
						: 'occupied',
		acquired.owner
			? {
					spaceId: acquired.owner.spaceId,
					sessionId: acquired.owner.sessionId,
					instanceId: acquired.owner.instanceId,
				}
			: {},
	);
}
/** Name the real reason a pre-spawn verification failed instead of one catch-all. */
function verifyFailure(cause: unknown): NativeResumeError {
	if (cause instanceof NativeResumeError) return cause;
	if (cause instanceof ManagedLaunchError) {
		if (cause.reason === 'provider-disabled')
			return new NativeResumeError('CAPABILITY_UNAVAILABLE', 'provider-disabled');
		return new NativeResumeError(
			'SOURCE_UNAVAILABLE',
			cause.reason === 'program-missing' ? 'program-missing' : 'verify-failed',
		);
	}
	const code = (cause as NodeJS.ErrnoException | undefined)?.code;
	if (code === 'ENOENT' || code === 'ENOTDIR')
		return new NativeResumeError('SOURCE_UNAVAILABLE', 'transcript-missing');
	const message = cause instanceof Error ? cause.message : '';
	if (message === t('agent.accountScopeMismatch'))
		return new NativeResumeError('SOURCE_UNAVAILABLE', 'account-mismatch');
	if (message === t('agent.sessionMissing')) return new NativeResumeError('SOURCE_UNAVAILABLE', 'transcript-missing');
	if (message === t('agent.vaultMissing')) return new NativeResumeError('SOURCE_UNAVAILABLE', 'vault-missing');
	return new NativeResumeError('SOURCE_UNAVAILABLE', 'verify-failed');
}

/**
 * Import and continue native conversations. One service path serves the GUI and the control/CLI operations.
 * Preview is not here on purpose: it reads and never creates a Session.
 */
export class NativeResumeService {
	private readonly tracked = new Map<string, Tracked>();
	private unsubscribe?: () => void;
	private unregister?: () => void;
	private disposed = false;
	private readonly releasing = new Set<Promise<void>>();
	/** Claims handed to a caller that releases them itself (automation): they keep this instance registered. */
	private readonly outstanding = new Set<OccupancyLease>();
	constructor(private readonly ports: NativeResumePorts) {
		this.unregister = registerLocalInstance(ports.instanceId);
	}

	private reference(row: NativeSessionSummary): NativeReference {
		try {
			return nativeReferenceOf(row, this.ports.deviceId);
		} catch (error) {
			if (error instanceof NativeReferenceError)
				throw new NativeResumeError('SOURCE_UNAVAILABLE', 'source-incomplete');
			throw error;
		}
	}
	private async identity(
		provider: string,
		nativeSessionId: string,
		transcriptPath: string,
	): Promise<OccupancyIdentity> {
		if (!transcriptPath) throw new NativeResumeError('SOURCE_UNAVAILABLE', 'source-incomplete');
		return occupancyIdentity({ provider, nativeSessionId }, await this.ports.canonicalPath(transcriptPath));
	}
	/** Sessions that provably carry this native conversation, in any Space. */
	private async matching(ref: NativeReference, row: NativeSessionSummary): Promise<SessionRecord[]> {
		const account = accountNameOf(ref.accountKey);
		const matches: SessionRecord[] = [];
		for (const record of Object.values(this.ports.spaces.store.getState().records.sessions)) {
			if (record.agentId !== ref.provider || record.nativeSessionId !== ref.nativeSessionId) continue;
			if ((record.accountId ?? '') !== account) continue;
			const evidence = record.nativeImport;
			if (evidence) {
				if (
					evidence.sourceRef === ref.sourceRef &&
					evidence.accountKey === ref.accountKey &&
					evidence.deviceId === ref.deviceId
				)
					matches.push(record);
			} else if (record.transcriptPath && (await this.ports.samePath(record.transcriptPath, row.transcriptPath)))
				matches.push(record);
		}
		return matches;
	}

	/** The Space must authorize exactly the conversation's working directory. */
	private async checkDirectory(spaceId: string, row: NativeSessionSummary): Promise<void> {
		const cwd = await this.ports.spaces.resolveSpaceCwd(spaceId);
		if (!row.cwd || !(await this.ports.samePath(cwd, row.cwd)))
			throw new NativeResumeError('DIRECTORY_NOT_AUTHORIZED', 'cwd-not-authorized');
	}
	/**
	 * Every pre-spawn condition that needs neither a record nor a process, in order: source, provider
	 * capability, account/device + transcript + program, then the Space's directory. Run it BEFORE anything is
	 * persisted so a refused continue leaves no import behind.
	 */
	async preflight(request: { spaceId: string; row: NativeSessionSummary }): Promise<void> {
		const { row } = request;
		const ref = this.reference(row);
		const space = this.ports.spaces.resolve({ spaceId: request.spaceId });
		if (row.sourceStatus && row.sourceStatus !== 'available')
			throw new NativeResumeError('SOURCE_UNAVAILABLE', 'source-unavailable', { status: row.sourceStatus });
		if (!supportsNativeResume(ref.provider))
			throw new NativeResumeError('CAPABILITY_UNAVAILABLE', 'provider-unsupported');
		try {
			await this.ports.verify(row);
		} catch (cause) {
			throw verifyFailure(cause);
		}
		await this.checkDirectory(space.id, row);
	}

	/**
	 * Explicitly bind one unassigned native source to a Space. Idempotent for the same full reference. A Space
	 * whose directory is not the conversation's working directory is refused: a binding cannot be undone.
	 */
	async importSource(request: ImportRequest): Promise<ImportResult> {
		const ref = this.reference(request.row);
		if (!supportsNativeResume(ref.provider))
			throw new NativeResumeError('CAPABILITY_UNAVAILABLE', 'provider-unsupported');
		if (ref.accountKey.length > 4096 || ref.deviceId.length > 4096)
			throw new NativeResumeError('INVALID_ARGUMENT', 'evidence-too-long');
		const space = this.ports.spaces.resolve({ spaceId: request.spaceId });
		const matches = await this.matching(ref, request.row);
		// Re-importing into the Space that already owns the reference needs no directory test.
		if (!matches.some((record) => record.spaceId === space.id)) await this.checkDirectory(space.id, request.row);
		const title = (request.title ?? request.row.title).trim().slice(0, 200) || getAgent(ref.provider).title;
		const { session, created } = await this.ports.spaces.importHistorySession({
			spaceId: space.id,
			sourceRef: ref.sourceRef,
			accountKey: ref.accountKey,
			deviceId: ref.deviceId,
			agentId: ref.provider,
			accountId: accountNameOf(ref.accountKey),
			nativeSessionId: ref.nativeSessionId,
			transcriptPath: request.row.transcriptPath || undefined,
			title,
			adopt: matches.map((record) => record.id),
		});
		return { spaceId: session.spaceId, sessionId: session.id, created };
	}

	private liveness(target: { spaceId: string; sessionId: string }): 'live' | 'unconfirmed' | 'ended' {
		const runtime = this.ports.managed(target)?.runtime;
		if (!runtime) return 'ended';
		if (runtime.phase === 'launch-pending' || runtime.phase === 'connected') return 'live';
		return runtimeEnded(runtime) ? 'ended' : 'unconfirmed';
	}

	/** Open the history of one Session: a running one is located and attached, an ended one is only described. */
	async open(request: { sessionId: string; spaceId?: string; foreground?: boolean }): Promise<OpenResult> {
		const record = this.ports.spaces.store.getState().records.sessions[request.sessionId];
		if (!record) throw new NativeResumeError('TARGET_NOT_FOUND', 'session-missing');
		if (request.spaceId && record.spaceId !== request.spaceId)
			throw new NativeResumeError('TARGET_NOT_FOUND', 'session-missing');
		const target = { spaceId: record.spaceId, sessionId: record.id };
		const state = this.liveness(target);
		const runtime = this.ports.managed(target)?.runtime;
		let attached = false;
		if (state === 'live' && runtime) {
			await this.ports.attach({ ...target, runtimeId: runtime.runtimeId }, request.foreground ?? false);
			attached = true;
		}
		return {
			...target,
			state,
			...(state === 'live' && runtime ? { runtimeId: runtime.runtimeId } : {}),
			attached,
			...(record.nativeImport ? { sourceRef: record.nativeImport.sourceRef } : {}),
		};
	}

	/**
	 * Take the machine-wide claim on one conversation. When the same Session's earlier generation already ended
	 * and still holds its claim, the claim continues to the new generation without ever being released.
	 */
	private async take(
		identity: OccupancyIdentity,
		owner: { spaceId: string; sessionId: string },
	): Promise<{ lease: OccupancyLease; reused?: Tracked }> {
		for (const entry of this.tracked.values()) {
			if (entry.lease.digest !== nativeOccupancyDigest(identity)) continue;
			if (
				entry.target.spaceId === owner.spaceId &&
				entry.target.sessionId === owner.sessionId &&
				this.finished(entry)
			) {
				entry.continuing = true;
				return { lease: entry.lease, reused: entry };
			}
			throw new NativeResumeError(
				'OWNER_CONFLICT',
				entry.target.sessionId === owner.sessionId ? 'resume-in-progress' : 'occupied-here',
				{ spaceId: entry.target.spaceId, sessionId: entry.target.sessionId, instanceId: this.ports.instanceId },
			);
		}
		const acquired = await this.ports.occupancy.acquire(identity, {
			instanceId: this.ports.instanceId,
			vaultId: this.ports.vaultId,
			spaceId: owner.spaceId,
			sessionId: owner.sessionId,
		});
		if (acquired.kind === 'conflict') throw occupiedError(acquired, owner.sessionId);
		return { lease: acquired.lease };
	}
	private finished(entry: Tracked): boolean {
		const runtime = this.ports.managed(entry.target)?.runtime;
		return !runtime || runtime.runtimeId !== entry.runtimeId || runtimeEnded(runtime);
	}

	/**
	 * Continue an imported/owned native conversation. A running runtime is attached, never duplicated; an
	 * ended one is resumed with the provider's exact resume argv as a new generation of the SAME Session.
	 * Every refusal is explicit and creates neither a Session nor a process. There is no implicit fork.
	 */
	async resumeSource(request: ResumeRequest): Promise<ResumeResult> {
		if (this.disposed) throw new NativeResumeError('CAPABILITY_UNAVAILABLE', 'module-closing');
		const { row } = request;
		const ref = this.reference(row);
		const space = this.ports.spaces.resolve({ spaceId: request.spaceId });
		const owner = this.ports.spaces.historySpaceFor(ref.sourceRef);
		if (!owner) throw new NativeResumeError('SOURCE_UNAVAILABLE', 'not-imported');
		if (owner !== space.id) throw new NativeResumeError('TARGET_NOT_FOUND', 'not-in-space');
		const matches = await this.matching(ref, row);
		const session = matches.find((record) => record.spaceId === space.id);
		if (!session) throw new NativeResumeError('SOURCE_UNAVAILABLE', 'not-imported');
		if (matches.some((record) => record.spaceId !== space.id))
			throw new NativeResumeError('OWNER_CONFLICT', 'owned-elsewhere');
		if (session.archived) throw new NativeResumeError('SOURCE_UNAVAILABLE', 'session-archived');
		const target = { spaceId: space.id, sessionId: session.id };
		const foreground = request.foreground ?? false;

		const state = this.liveness(target);
		const running = this.ports.managed(target)?.runtime;
		if (state === 'live' && running) {
			await this.ports.attach({ ...target, runtimeId: running.runtimeId }, foreground);
			return { mode: 'attached', ...target, runtimeId: running.runtimeId };
		}
		if (state === 'unconfirmed') throw new NativeResumeError('SOURCE_UNAVAILABLE', 'runtime-unconfirmed');

		await this.preflight({ spaceId: space.id, row });
		const identity = await this.identity(ref.provider, ref.nativeSessionId, row.transcriptPath);
		const { lease, reused } = await this.take(identity, target);
		let reservedId: string | undefined;
		try {
			const started = await this.ports.launch({ spaceId: space.id, session, row, foreground }, (runtimeId) => {
				reservedId = runtimeId;
				this.track({ lease, target, runtimeId });
			});
			if (reservedId) await lease.bind(reservedId).catch(() => {});
			this.sweep();
			if (!started) return { mode: 'cancelled', ...target };
			return {
				mode: 'resumed',
				...target,
				runtimeId: started.runtimeId,
				...(session.lastAttempt ? { previousRuntimeId: session.lastAttempt.runtimeId } : {}),
			};
		} catch (error) {
			// Before a generation is reserved nothing can be running. Afterwards the lock stays until exit is verified.
			if (reservedId) this.sweep();
			else if (reused) {
				reused.continuing = false;
				this.sweep();
			} else await lease.release();
			// The previous run never reported how it ended: say what to check instead of a generic failure.
			if (error instanceof SpaceError && error.reason === 'attempt-unconfirmed')
				throw new NativeResumeError('EFFECT_UNKNOWN', 'attempt-unconfirmed');
			throw error;
		}
	}

	/**
	 * Claim a conversation before ANY other HUHU path spawns a native resume (tab restore, automation). Throws a
	 * NativeResumeError when another runtime, here or in another instance or Vault, holds it.
	 */
	async guard(request: GuardRequest): Promise<SpawnGuard> {
		if (this.disposed) throw new NativeResumeError('CAPABILITY_UNAVAILABLE', 'module-closing');
		const identity = await this.identity(request.provider, request.nativeSessionId, request.transcriptPath);
		const target = { spaceId: request.spaceId, sessionId: request.sessionId };
		const { lease, reused } = await this.take(identity, target);
		if (request.runtime) {
			await lease.bind(request.runtime.runtimeId).catch(() => {});
			this.track({ lease, target, runtimeId: request.runtime.runtimeId });
			return { release: async () => this.sweep() };
		}
		if (reused) this.tracked.delete(lease.digest);
		this.outstanding.add(lease);
		return {
			release: async () => {
				try {
					await lease.release();
				} finally {
					this.outstanding.delete(lease);
					this.settleRegistration();
				}
			},
		};
	}

	private track(entry: Omit<Tracked, 'continuing'>): void {
		this.tracked.set(entry.lease.digest, { ...entry });
		// Even after shutdown the claim is dropped only on a later confirmed exit, never on a guess.
		this.unsubscribe ??= this.ports.subscribeManaged(() => this.sweep());
		if (this.disposed) this.sweep();
	}
	/**
	 * Release a lock only when its runtime has verifiably ended. A later generation of the same Session keeps
	 * the claim (it continues under the same lease) instead of being treated as the old one's end.
	 */
	private sweep(): void {
		for (const [digest, entry] of [...this.tracked]) {
			if (entry.continuing) continue;
			const runtime = this.ports.managed(entry.target)?.runtime;
			if (runtime && runtime.runtimeId !== entry.runtimeId) {
				entry.runtimeId = runtime.runtimeId;
				void entry.lease.bind(runtime.runtimeId).catch(() => {});
				continue;
			}
			if (runtime && !runtimeEnded(runtime)) continue;
			this.tracked.delete(digest);
			const release = entry.lease.release().catch(() => {});
			this.releasing.add(release);
			void release.finally(() => {
				this.releasing.delete(release);
				this.settleRegistration();
			});
		}
		if (!this.tracked.size) {
			this.unsubscribe?.();
			this.unsubscribe = undefined;
			this.settleRegistration();
		}
	}
	/** This instance stops being "alive in this process" only after every claim is actually released. */
	private settleRegistration(): void {
		if (!this.disposed || this.tracked.size || this.releasing.size || this.outstanding.size) return;
		this.unregister?.();
		this.unregister = undefined;
	}
	/**
	 * Call only after the helper and managed runtimes have finished stopping. Leases of runtimes whose end is
	 * confirmed are released; the rest are kept (the owning process' liveness reclaims them later).
	 */
	async dispose(): Promise<void> {
		this.disposed = true;
		// Claims that are not yet confirmed ended keep a post-dispose watch: a late confirmed exit releases them
		// and only then unregisters this instance. The watch ends as soon as nothing is left.
		this.sweep();
		await Promise.allSettled([...this.releasing]);
	}
}

/** Text for a failed import/continue, whichever owner refused it. */
export function historyActionMessage(error: unknown): string {
	if (error instanceof ManagedLaunchError) return t(error.failure.messageKey);
	if (error instanceof SpaceError) return spaceErrorMessage(error);
	return error instanceof Error ? error.message : String(error);
}
