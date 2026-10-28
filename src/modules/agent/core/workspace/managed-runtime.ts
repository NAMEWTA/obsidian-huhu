import type { TerminationEvidence } from '../../../../shared/native/host';
import type { AgentId } from '../launch/types';
import type { ShellChoice } from '../terminal/settings';
import type { SpaceErrorCode } from '../space/errors';
import type { AgentState } from './model';

export interface ManagedSessionTarget {
	readonly spaceId: string;
	readonly sessionId: string;
}
export interface ManagedRuntimeRef extends ManagedSessionTarget {
	readonly runtimeId: string;
}
export type ManagedPhase = 'launch-pending' | 'connected' | 'failed' | 'cancelled' | 'disconnected' | 'exited';
export type ManagedEffect = 'none' | 'partial' | 'completed' | 'unknown';
export type ManagedErrorCode =
	| SpaceErrorCode
	| 'STALE_RUNTIME'
	| 'MODULE_INACTIVE'
	| 'WAIT_TIMEOUT'
	| 'WAIT_CANCELLED'
	| 'CONNECTION_UNAVAILABLE'
	| 'SOURCE_UNAVAILABLE'
	| 'AGENT_BLOCKED'
	| 'EFFECT_UNKNOWN';
export type ManagedErrorKey =
	| `agent.managed.${
			| 'invalidInput'
			| 'permissionRequired'
			| 'programMissing'
			| 'accountUnavailable'
			| 'unavailable'
			| 'moduleInactive'
			| 'targetMissing'
			| 'staleRuntime'
			| 'effectUnknown'
			| 'launchFailed'
			| 'waitTimeout'
			| 'waitCancelled'}`
	| `agent.spaces.error.${'required' | 'ambiguous' | 'missing' | 'scope' | 'owner' | 'directory' | 'save'}`;
export interface ManagedFailure {
	readonly code: ManagedErrorCode;
	readonly reason: string; // A 固定的有限原因，不解析人类文案判断重试
	readonly messageKey: ManagedErrorKey; // §5 的错误键联合，含列明的已有 Space 键
	readonly nextAction:
		| 'correct-input'
		| 'choose-space'
		| 'configure-program'
		| 'configure-account'
		| 'confirm-permissions'
		| 'open-terminal'
		| 'inspect-runtime'
		| 'retry-explicitly';
	readonly details: Readonly<Record<string, string | number | boolean>>;
}
export interface ManagedRuntimeSummary {
	readonly runtimeId: string;
	readonly stop?: ManagedStopState;
	readonly termination?: TerminationEvidence;
	readonly phase: ManagedPhase;
	readonly activityDetail?: RuntimeActivitySnapshot;
	readonly activity: AgentState; // 现有 core/workspace/model 的类型
	readonly inputReady: boolean; // 保留现有 agent 输入证据；不是模型任务成功或通用 TUI 就绪
	readonly pid?: number; // 诊断值，可缺失，不能作为身份/存活证明
	readonly exit?: { readonly code: number | null; readonly signal: string | null; readonly confirmed: boolean };
	readonly error?: ManagedFailure;
}
export interface ManagedSessionSummary extends ManagedSessionTarget {
	readonly kind: 'shell' | 'agent';
	readonly title: string;
	readonly createdAt: number;
	readonly agentId?: AgentId;
	readonly accountId?: string;
	readonly runtime?: ManagedRuntimeSummary;
	readonly completionHint?: ActivityCompletionHint;
	readonly archived?: boolean;
	readonly restore?: { readonly state: 'ended' | 'unconfirmed'; readonly canRequestContinue: boolean };
	readonly viewState: 'background' | 'attached' | 'detached' | 'restored';
}
export interface ManagedSnapshot {
	readonly revision: number;
	readonly sessions: readonly ManagedSessionSummary[];
}
export type ManagedCreateRequest = {
	readonly spaceId: string;
	readonly title?: string;
	readonly foreground?: boolean;
	readonly groupId?: string;
} & (
	| { readonly kind: 'shell'; readonly shell?: ShellChoice }
	| { readonly kind: 'agent'; readonly agentId: AgentId; readonly accountId?: string }
);
export type ManagedInteractiveCreateRequest = {
	readonly spaceId?: string;
	readonly title?: string;
	readonly foreground?: boolean;
	readonly groupId?: string;
} & (
	| { readonly kind: 'shell'; readonly shell?: ShellChoice }
	| { readonly kind: 'agent'; readonly agentId: AgentId; readonly accountId?: string }
);
export type ManagedCreateResult =
	| {
			readonly status: 'created';
			readonly effect: 'completed';
			readonly session: ManagedSessionSummary & { readonly runtime: ManagedRuntimeSummary };
	  }
	| {
			readonly status: 'cancelled';
			readonly effect: 'none' | 'partial';
			readonly reason: 'space-selection' | 'permission-confirmation';
			readonly session?: ManagedSessionSummary;
	  }
	| {
			readonly status: 'failed';
			readonly effect: 'none' | 'partial' | 'unknown';
			readonly error: ManagedFailure;
			readonly session?: ManagedSessionSummary;
	  };
export type ManagedAttachResult =
	| {
			readonly status: 'attached';
			readonly target: ManagedRuntimeRef;
			readonly tabId: string;
			readonly focused: boolean;
	  }
	| { readonly status: 'pending'; readonly target: ManagedRuntimeRef }
	| { readonly status: 'not-running'; readonly target: ManagedSessionTarget }
	| { readonly status: 'failed'; readonly target: ManagedSessionTarget; readonly error: ManagedFailure };

export interface ManagedStopState {
	readonly requestId: string;
	readonly requestedAt: number;
	readonly force: boolean;
	readonly phase: 'stop-requested' | 'settled';
	readonly outcome?: 'confirmed' | 'partial' | 'unknown';
}
export interface ManagedStopOptions {
	readonly force?: boolean;
	readonly timeoutMs?: number;
	readonly signal?: AbortSignal;
}
export interface StopResult {
	readonly target: ManagedRuntimeRef;
	readonly status: 'stopped' | 'pending' | 'failed';
	readonly effect: ManagedEffect;
	readonly termination: TerminationEvidence;
	readonly persisted: boolean;
	readonly error?: ManagedFailure;
}
export type ArchiveScope =
	| { readonly kind: 'session'; readonly spaceId: string; readonly sessionId: string }
	| { readonly kind: 'space'; readonly spaceId: string };
export interface ArchiveMember extends ManagedSessionTarget {
	readonly runtimeId?: string;
}
export interface ArchivePlan {
	readonly scope: ArchiveScope;
	readonly members: readonly ArchiveMember[];
	readonly fingerprint: string;
}
export interface ArchiveRow {
	readonly target: ArchiveMember;
	readonly status: 'not-running' | 'stopped' | 'incomplete' | 'failed';
	readonly effect: ManagedEffect;
	readonly termination?: TerminationEvidence;
	readonly persisted: boolean;
	readonly error?: ManagedFailure;
}
export interface ArchiveResult {
	readonly scope: ArchiveScope;
	readonly status: 'archived' | 'incomplete' | 'failed';
	readonly effect: ManagedEffect;
	readonly rows: readonly ArchiveRow[];
	readonly error?: ManagedFailure;
}

export interface ActivityMark {
	readonly runtimeId: string;
	readonly activitySequence: number;
}
export type ActivityReason =
	| 'not-observed'
	| 'disabled'
	| 'unsupported'
	| 'legacy-unattributed'
	| 'hook-error'
	| 'source-mismatch'
	| 'program-changed'
	| 'expired'
	| 'capacity'
	| 'invalid-observation'
	| 'sequence-gap'
	| 'stop-requested'
	| 'runtime-ended'
	| 'transport-lost'
	| 'closed';
export type ActivitySupport = 'observed' | 'unknown' | 'unavailable';
export type ActivityBlockReason = 'permission' | 'question' | 'login' | 'other';
export type ActivityBlocking =
	| Readonly<{ state: 'blocked'; reason: ActivityBlockReason }>
	| Readonly<{ state: 'clear' }>
	| Readonly<{ state: 'unknown' }>;
export type ActivityBlockingObservation =
	| Readonly<{ state: 'blocked'; reason: ActivityBlockReason; blockId: string }>
	| Readonly<{ state: 'clear'; blockId: string }>;
export interface ActivitySourceMeta {
	readonly provider: AgentId;
	readonly kind: 'native-hook';
	readonly adapterRevision: string;
	readonly observedVersion?: string;
	readonly lifetime: Readonly<{ kind: 'registration'; sourceInstance: string }> | Readonly<{ kind: 'unproven' }>;
}
export interface ActivityFact {
	readonly state: AgentState;
	readonly observedAt: number;
	readonly eventAt?: number;
	readonly event: string;
	readonly blocking: ActivityBlocking;
}
export interface ActivityCapabilities {
	readonly activity: ActivitySupport;
	readonly blocking: ActivitySupport;
	readonly foreground: 'unknown';
}
export interface ActivitySourceSnapshot {
	readonly bindingId: string; // opaque host id, never token/path
	readonly programEpoch: string; // host generation, never PID/nativeSessionId
	readonly meta: ActivitySourceMeta;
	readonly health: 'current' | 'unknown' | 'unavailable';
	readonly reason?: ActivityReason;
	readonly capabilities: ActivityCapabilities;
	readonly lastFact?: ActivityFact;
}
export interface ActivityCompletion extends ActivityMark {
	readonly observedAt: number;
}
export interface ActivityCompletionHint extends ActivityCompletion {
	readonly seenThrough: number;
}
export interface RuntimeActivitySnapshot {
	readonly at: ActivityMark;
	readonly revision: number; // includes seen-only changes
	readonly state: AgentState;
	readonly observedAt: number;
	readonly source: Readonly<{
		health: 'current' | 'unknown' | 'unavailable';
		reason?: ActivityReason;
		bindingId?: string; // only unambiguous eligible source
		capabilities: ActivityCapabilities;
	}>;
	readonly sources: readonly ActivitySourceSnapshot[]; // bounded, not a history log
	readonly lastFact?: ActivityFact; // only attributable single-source display
	readonly blocking: ActivityBlocking;
	readonly promptEvidence: Readonly<{ foreground: 'unknown'; inputReady: boolean }>;
	readonly completion?: ActivityCompletion;
	readonly seenThrough: number;
	readonly unreadCompletion: boolean;
}
export interface ActivityObservation {
	readonly deliveryId: string;
	readonly sourceSequence?: number;
	readonly event: string;
	readonly eventAt?: number;
	readonly state?: AgentState;
	readonly blocking?: ActivityBlockingObservation;
	readonly completion?: 'turn-finished';
	readonly capabilities?: Readonly<{
		activity?: ActivitySupport;
		blocking?: ActivitySupport;
	}>;
	readonly title?: string;
	readonly resume?: Readonly<{ nativeSessionId?: string; transcriptPath?: string }>;
}
export type ActivityAdoption =
	| Readonly<{ status: 'accepted' | 'duplicate'; at: ActivityMark }>
	| Readonly<{ status: 'rejected'; reason: ActivityReason }>;
export interface ActivitySourceBinding {
	readonly bindingId: string;
	readonly programEpoch: string;
	active(): boolean;
	observe(value: ActivityObservation): ActivityAdoption;
	/** Bounded contiguous delivery; empty+true declares a temporary source gap. */
	observeOrdered(values: readonly ActivityObservation[], gapPending: boolean): ActivityAdoption;
	invalidate(reason: ActivityReason): void;
	close(): void; // synchronous evidence revocation only
}
export interface RuntimeActivityBinding {
	readonly runtimeId: string;
	active(): boolean;
	bindSource(meta: ActivitySourceMeta): ActivitySourceBinding | undefined;
	invalidate(reason: ActivityReason): void;
	close(): void; // revokes children synchronously
}
export interface ActivityJoin {
	readonly snapshot: RuntimeActivitySnapshot;
	dispose(): void;
}
export type ActivitySeenUpdate =
	| Readonly<{ status: 'updated' | 'unchanged'; at: ActivityMark; seenThrough: number }>
	| Readonly<{ status: 'rejected'; reason: 'stale-runtime' | 'invalid-mark' }>;
export interface SessionActivityPort {
	getActivitySnapshot(): RuntimeActivitySnapshot;
	observeActivity(changed: (value: RuntimeActivitySnapshot) => void): ActivityJoin;
	bindActivityRuntime(): RuntimeActivityBinding; // internal orchestration, same owner
	invalidateActivity(reason: ActivityReason): void;
	markActivitySeen(at: ActivityMark): ActivitySeenUpdate;
}
export interface RuntimeHooksRequest {
	readonly target: ManagedRuntimeRef;
	readonly initialProvider?: AgentId; // launch candidate, not evidence
	readonly env: Readonly<Record<string, string>>;
	readonly signal?: AbortSignal;
}
export interface PreparedRuntimeHooks {
	readonly env: Readonly<Record<string, string>>;
	close(): Promise<void>;
}
export interface RuntimeHooksPort {
	prepareRuntimeHooks(request: RuntimeHooksRequest, binding: RuntimeActivityBinding): Promise<PreparedRuntimeHooks>;
}
export interface ManagedSeenRequest {
	readonly target: ManagedRuntimeRef;
	readonly at: ActivityMark;
	readonly view: Readonly<{ tabId: string; paneSessionId: string }>;
}
export interface ManagedSeenOptions {
	readonly timeoutMs?: number;
	readonly signal?: AbortSignal;
}
export type ManagedSeenResult =
	| Readonly<{
			status: 'updated' | 'unchanged';
			target: ManagedRuntimeRef;
			at: ActivityMark;
			seenThrough: number;
			mode: 'runtime' | 'restored-hint';
			persisted: true;
	  }>
	| Readonly<{
			status: 'rejected';
			target: ManagedRuntimeRef;
			persisted: false;
			reason: 'stale-runtime' | 'invalid-mark' | 'not-presented' | 'missing-record';
	  }>
	| Readonly<{
			status: 'failed';
			target: ManagedRuntimeRef;
			at: ActivityMark;
			seenThrough?: number;
			persisted: false;
			effect: 'none' | 'partial' | 'unknown';
			error: ManagedFailure;
	  }>;
export interface ManagedActivityClient {
	getManagedSnapshot(): ManagedSnapshot;
	subscribeManaged(changed: () => void): () => void;
	attachManaged(
		target: ManagedSessionTarget,
		options: Readonly<{ expectedRuntimeId: string; focus: boolean; groupId?: string }>,
	): Promise<ManagedAttachResult>;
	markManagedSeen(request: ManagedSeenRequest, options?: ManagedSeenOptions): Promise<ManagedSeenResult>;
}

export const ACTIVITY_LIMITS = Object.freeze({
	summaryBytes: 8192,
	sources: 8,
	listeners: 32,
	freshnessMs: 30_000,
	reorder: 8,
});
const activityStates = new Set([
	'working',
	'waiting',
	'permission',
	'done',
	'idle',
	'failed',
	'interrupted',
	'unknown',
]);
const providers = new Set(['claude-code', 'codex', 'gemini', 'grok', 'pi', 'opencode']);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Count JSON UTF-8 before allocating an encoded summary. Inputs have a fixed shape and finite depth. */
function summaryBytes(value: unknown, json: boolean, depth = 0): number {
	if (depth > 5) return Infinity;
	if (typeof value === 'string') {
		if (value.length > 8192) return Infinity;
		let bytes = json ? 2 : 0;
		for (let i = 0; i < value.length; i++) {
			const c = value.charCodeAt(i);
			if (json && (c === 34 || c === 92)) bytes += 2;
			else if (json && c < 32) bytes += [8, 9, 10, 12, 13].includes(c) ? 2 : 6;
			else if (c < 128) bytes++;
			else if (c < 2048) bytes += 2;
			else if (
				c >= 0xd800 &&
				c <= 0xdbff &&
				i + 1 < value.length &&
				value.charCodeAt(i + 1) >= 0xdc00 &&
				value.charCodeAt(i + 1) <= 0xdfff
			) {
				bytes += 4;
				i++;
			} else bytes += json && c >= 0xd800 && c <= 0xdfff ? 6 : 3;
			if (bytes > 8192) return Infinity;
		}
		return bytes;
	}
	if (typeof value === 'number') return Number.isFinite(value) ? String(value).length : Infinity;
	if (record(value)) {
		const entries = Object.entries(value).filter(([, v]) => v !== undefined);
		if (entries.length > 16) return Infinity;
		let bytes = 2;
		for (const [key, v] of entries)
			bytes += summaryBytes(key, true, depth + 1) + 1 + summaryBytes(v, true, depth + 1) + 1;
		return bytes - (entries.length ? 1 : 0);
	}
	return Infinity;
}
const boundedText = (v: unknown, max: number): v is string =>
	typeof v === 'string' && v.length > 0 && summaryBytes(v, false) <= max;
const only = (v: Record<string, unknown>, names: readonly string[]) =>
	Object.keys(v).every((key) => names.includes(key));
/** Strict allowlist validation; full answers never enter this bounded activity channel. */
export function activitySummaryAllowed(
	meta: ActivitySourceMeta,
	value: ActivityObservation,
	identity?: Readonly<{ runtimeId: string; bindingId: string; programEpoch: string }>,
): boolean {
	if (
		!record(meta) ||
		!record(value) ||
		!only(meta, ['provider', 'kind', 'adapterRevision', 'observedVersion', 'lifetime']) ||
		!providers.has(meta.provider) ||
		meta.kind !== 'native-hook' ||
		!boundedText(meta.adapterRevision, 128) ||
		(meta.observedVersion !== undefined && !boundedText(meta.observedVersion, 128)) ||
		!record(meta.lifetime)
	)
		return false;
	const life = meta.lifetime;
	if (
		life.kind === 'registration'
			? !only(life, ['kind', 'sourceInstance']) || !boundedText(life.sourceInstance, 128)
			: life.kind !== 'unproven' || !only(life, ['kind'])
	)
		return false;
	if (
		!only(value, [
			'deliveryId',
			'sourceSequence',
			'event',
			'eventAt',
			'state',
			'blocking',
			'completion',
			'capabilities',
			'title',
			'resume',
		]) ||
		!boundedText(value.deliveryId, 256) ||
		!boundedText(value.event, 128) ||
		(value.sourceSequence !== undefined &&
			(!Number.isSafeInteger(value.sourceSequence) || value.sourceSequence <= 0)) ||
		(value.eventAt !== undefined && (!Number.isFinite(value.eventAt) || value.eventAt < 0)) ||
		(value.state !== undefined && !activityStates.has(value.state)) ||
		(value.completion !== undefined && value.completion !== 'turn-finished') ||
		(value.title !== undefined && !boundedText(value.title, 512))
	)
		return false;
	if (value.blocking !== undefined) {
		const b = value.blocking;
		if (
			!record(b) ||
			!boundedText(b.blockId, 256) ||
			(b.state === 'clear'
				? !only(b, ['state', 'blockId'])
				: b.state !== 'blocked' ||
					!only(b, ['state', 'blockId', 'reason']) ||
					!['permission', 'question', 'login', 'other'].includes(b.reason))
		)
			return false;
	}
	if (
		value.capabilities !== undefined &&
		(!record(value.capabilities) ||
			!only(value.capabilities, ['activity', 'blocking']) ||
			Object.values(value.capabilities).some((v) => !['observed', 'unknown', 'unavailable'].includes(v)))
	)
		return false;
	if (
		value.resume !== undefined &&
		(!record(value.resume) ||
			!only(value.resume, ['nativeSessionId', 'transcriptPath']) ||
			(value.resume.nativeSessionId !== undefined && !boundedText(value.resume.nativeSessionId, 1024)) ||
			(value.resume.transcriptPath !== undefined && !boundedText(value.resume.transcriptPath, 4096)))
	)
		return false;
	if (
		identity &&
		(!record(identity) ||
			!only(identity, ['runtimeId', 'bindingId', 'programEpoch']) ||
			!boundedText(identity.runtimeId, 256) ||
			!boundedText(identity.bindingId, 256) ||
			!boundedText(identity.programEpoch, 256))
	)
		return false;
	return summaryBytes({ ...identity, meta, observation: value }, true) <= ACTIVITY_LIMITS.summaryBytes;
}
