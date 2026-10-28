/** One deadline includes graceful termination, force and output drain; force never restarts it. */
export const NATIVE_TERMINATION_TIMEOUT_MS = 8_000;
export const NATIVE_TERMINATION_OBSERVE_MS = 10_000;

export type RootEvidence =
	| { state: 'running' | 'unknown' | 'not-started'; code: null; signal: null }
	| { state: 'exited'; code: number | null; signal: string | null };
export type TerminationReason = 'legacy-helper' | 'wait-failed' | 'scope-unverified' | 'residuals-present'
	| 'signal-failed' | 'deadline' | 'escaped-member' | 'transport-lost';
export interface TerminationEvidence {
	root: RootEvidence;
	cleanup: {
		state: 'pending' | 'confirmed' | 'partial' | 'unknown';
		scope: 'not-started' | 'unix-session' | 'windows-job' | 'root-only';
		reason?: TerminationReason;
		remainingKnown: number | null;
	};
	output: 'drained' | 'truncated' | 'unknown';
}
export interface NativeTerminationNotice {
	version: 1;
	requestId?: string;
	sequence: number;
	evidence: TerminationEvidence;
}
export interface TerminationContext {
	sid: number;
	platform: string;
	lastSequence: number;
	capability?: number | null;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(key => allowed.includes(key));
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const reasons: readonly unknown[] = ['legacy-helper', 'wait-failed', 'scope-unverified', 'residuals-present', 'signal-failed', 'deadline', 'escaped-member', 'transport-lost'];

/** Validate persisted evidence independently of the machine reading its source device's facts. */
export function parseTerminationEvidence(value: unknown): TerminationEvidence | undefined {
	if (!object(value) || !keys(value, ['root', 'cleanup', 'output'])) return;
	const root = value.root, cleanup = value.cleanup;
	if (!object(root) || !keys(root, ['state', 'code', 'signal']) || !object(cleanup) || !keys(cleanup, ['state', 'scope', 'remainingKnown', 'reason'])) return;
	if (typeof root.state !== 'string' || !['running', 'unknown', 'not-started', 'exited'].includes(root.state)) return;
	if (root.state === 'exited') {
		if (root.code !== null && !integer(root.code, 0xffffffff)) return;
		if (root.signal !== null && (typeof root.signal !== 'string' || !root.signal.length || root.signal.length > 80)) return;
	} else if (root.code !== null || root.signal !== null) return;
	if (typeof cleanup.state !== 'string' || !['pending', 'confirmed', 'partial', 'unknown'].includes(cleanup.state) || typeof cleanup.scope !== 'string' || !['not-started', 'unix-session', 'windows-job', 'root-only'].includes(cleanup.scope)) return;
	if (cleanup.remainingKnown !== null && !integer(cleanup.remainingKnown)) return;
	if (cleanup.reason !== undefined && !reasons.includes(cleanup.reason)) return;
	if (typeof value.output !== 'string' || !['drained', 'truncated', 'unknown'].includes(value.output)) return;
	if ((root.state === 'not-started') !== (cleanup.scope === 'not-started')) return;
	if (cleanup.scope === 'not-started' && (cleanup.state !== 'confirmed' || value.output !== 'drained')) return;
	if (cleanup.state === 'confirmed' && (cleanup.scope === 'root-only' || cleanup.remainingKnown !== 0 || cleanup.reason !== undefined || (root.state !== 'exited' && root.state !== 'not-started'))) return;
	return structuredClone(value) as unknown as TerminationEvidence;
}

/** A numeric exit, EOF or missing legacy field cannot prove cleanup of a managed scope. */
export function terminationConfirmed(evidence: TerminationEvidence): boolean {
	return parseTerminationEvidence(evidence)?.cleanup.state === 'confirmed';
}

/** The caller supplies the captured transport's sid/platform and last accepted sequence. */
export function parseTerminationNotice(value: unknown, context: TerminationContext): NativeTerminationNotice | undefined {
	if (context.capability !== 1 || !object(value) || !keys(value, ['type', 'version', 'sid', 'requestId', 'sequence', 'evidence'])) return;
	if (value.type !== 'terminal-termination' || value.version !== 1 || !integer(context.sid, 0xffffffff) || context.sid === 0 || value.sid !== context.sid) return;
	if (!integer(value.sequence) || value.sequence <= context.lastSequence || !integer(context.lastSequence)) return;
	if (value.requestId !== undefined && (typeof value.requestId !== 'string' || !value.requestId.length || value.requestId.length > 128 || Array.from(value.requestId).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return;
	if (!['linux', 'darwin', 'win32'].includes(context.platform)) return;
	const evidence = parseTerminationEvidence(value.evidence);
	if (!evidence || evidence.cleanup.scope === 'unix-session' && context.platform === 'win32' || evidence.cleanup.scope === 'windows-job' && context.platform !== 'win32') return;
	return { version: 1, sequence: value.sequence, ...(value.requestId === undefined ? {} : { requestId: value.requestId }), evidence };
}
