export type SpaceErrorCode = 'INVALID_ARGUMENT' | 'DIRECTORY_NOT_AUTHORIZED'
	| 'SCOPE_MISMATCH' | 'OWNER_CONFLICT' | 'CAPABILITY_UNAVAILABLE'
	| 'TARGET_REQUIRED' | 'TARGET_AMBIGUOUS' | 'TARGET_NOT_FOUND' | 'PERSISTENCE_FAILED'
	| 'WAIT_TIMEOUT' | 'WAIT_CANCELLED'
	| 'SOURCE_UNAVAILABLE' | 'EFFECT_UNKNOWN' | 'STALE_RUNTIME';

export class SpaceError extends Error {
	readonly code: SpaceErrorCode;
	readonly reason: string;
	readonly details: Readonly<Record<string, string | number | boolean>>;

	constructor(code: SpaceErrorCode, reason: string, details: Readonly<Record<string, string | number | boolean>> = {}, cause?: unknown) {
		super(`${code}:${reason}`, { cause });
		this.name = 'SpaceError';
		this.code = code;
		this.reason = reason;
		this.details = details;
	}
}
