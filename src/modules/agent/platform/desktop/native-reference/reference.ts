import { createHash } from 'node:crypto';

/**
 * The full identity of one native conversation on this machine. A bare native session id is never an identity:
 * two accounts (or providers, or devices) may contain the same id for unrelated conversations.
 */
export interface NativeReference {
	readonly provider: string;
	/** The provider account namespace exactly as the history index recorded it. */
	readonly accountKey: string;
	readonly deviceId: string;
	readonly nativeSessionId: string;
	/** Stable transcript/source locator from the history index. */
	readonly sourceRef: string;
}

export interface NativeReferenceSource {
	readonly agentId: string;
	readonly accountKey: string;
	readonly sessionId: string;
	readonly sourceRef?: string;
}

export class NativeReferenceError extends Error {
	constructor(readonly reason: 'source-ref-missing' | 'identity-incomplete') {
		super(`native-reference:${reason}`);
		this.name = 'NativeReferenceError';
	}
}

/** Resolve the complete identity before anything else; an incomplete row is reported, never guessed. */
export function nativeReferenceOf(row: NativeReferenceSource, deviceId: string): NativeReference {
	if (!row.agentId || !row.sessionId || !row.accountKey || !deviceId)
		throw new NativeReferenceError('identity-incomplete');
	if (!row.sourceRef) throw new NativeReferenceError('source-ref-missing');
	return Object.freeze({
		provider: row.agentId,
		accountKey: row.accountKey,
		deviceId,
		nativeSessionId: row.sessionId,
		sourceRef: row.sourceRef,
	});
}

/** Exact de-duplication key for imports: every component participates. */
export function nativeReferenceKey(ref: NativeReference): string {
	return JSON.stringify([ref.provider, ref.accountKey, ref.deviceId, ref.nativeSessionId, ref.sourceRef]);
}

/**
 * What is physically occupied: one conversation inside one provider store. It is built from the canonical real
 * path of the transcript (so it is the same from every Vault and every account spelling that reaches the same
 * files) plus the native id. It must never contain the Vault device id or a Vault-local account root.
 */
export interface OccupancyIdentity {
	readonly provider: string;
	/** Canonical (real) path of the transcript or database in the provider store. */
	readonly storePath: string;
	readonly nativeSessionId: string;
}
export function occupancyIdentity(
	source: { provider: string; nativeSessionId: string },
	storePath: string,
): OccupancyIdentity {
	if (!storePath) throw new NativeReferenceError('identity-incomplete');
	return Object.freeze({ provider: source.provider, storePath, nativeSessionId: source.nativeSessionId });
}
export function nativeOccupancyKey(identity: OccupancyIdentity): string {
	return JSON.stringify([identity.provider, identity.storePath, identity.nativeSessionId]);
}
export function nativeOccupancyDigest(identity: OccupancyIdentity): string {
	return createHash('sha256').update(nativeOccupancyKey(identity)).digest('hex');
}

/** The account name inside a recorded account namespace; the system account has none. */
export function accountNameOf(accountKey: string): string {
	try {
		const env: unknown = JSON.parse(accountKey);
		const name = env && typeof env === 'object' ? (env as Record<string, unknown>).HUHU_ACCOUNT_NAME : undefined;
		return typeof name === 'string' ? name : '';
	} catch {
		return '';
	}
}
