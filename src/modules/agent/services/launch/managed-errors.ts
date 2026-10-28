import { SpaceError } from '../../core/space/errors';
import type { ManagedEffect, ManagedErrorCode, ManagedFailure } from '../../core/workspace/managed-runtime';
import { NativeSpawnError } from '../../../../shared/native/host';

export class ManagedLaunchError extends Error {
	get code(): ManagedErrorCode { return this.failure.code; }
	get reason(): string { return this.failure.reason; }
	constructor(readonly failure: ManagedFailure, readonly effect: ManagedEffect = 'partial') {
		super(`${failure.code}:${failure.reason}`);
	}
}

export function managedFailure(code: ManagedErrorCode, reason: string): ManagedFailure {
	const base = { code, reason, details: {} };
	switch (code) {
		case 'INVALID_ARGUMENT': return { ...base, messageKey: 'agent.managed.invalidInput', nextAction: 'correct-input' };
		case 'TARGET_REQUIRED': return { ...base, messageKey: 'agent.spaces.error.required', nextAction: 'choose-space' };
		case 'TARGET_AMBIGUOUS': return { ...base, messageKey: 'agent.spaces.error.ambiguous', nextAction: 'choose-space' };
		case 'TARGET_NOT_FOUND': return { ...base, messageKey: reason === 'missing-session' ? 'agent.managed.targetMissing' : 'agent.spaces.error.missing', nextAction: 'choose-space' };
		case 'SCOPE_MISMATCH': return { ...base, messageKey: 'agent.spaces.error.scope', nextAction: 'inspect-runtime' };
		case 'OWNER_CONFLICT': return { ...base, messageKey: 'agent.spaces.error.owner', nextAction: 'inspect-runtime' };
		case 'DIRECTORY_NOT_AUTHORIZED': return { ...base, messageKey: 'agent.spaces.error.directory', nextAction: 'choose-space' };
		case 'PERSISTENCE_FAILED': return { ...base, messageKey: 'agent.spaces.error.save', nextAction: 'inspect-runtime' };
		case 'STALE_RUNTIME': return { ...base, messageKey: 'agent.managed.staleRuntime', nextAction: 'inspect-runtime' };
		case 'MODULE_INACTIVE': return { ...base, messageKey: 'agent.managed.moduleInactive', nextAction: 'open-terminal' };
		case 'WAIT_TIMEOUT': return { ...base, messageKey: 'agent.managed.waitTimeout', nextAction: 'inspect-runtime' };
		case 'WAIT_CANCELLED': return { ...base, messageKey: 'agent.managed.waitCancelled', nextAction: 'inspect-runtime' };
		case 'SOURCE_UNAVAILABLE': if (['archive-in-progress', 'archived-session', 'attempt-cancelled', 'module-closing', 'resume-source-unavailable', 'attempt-pending'].includes(reason)) return { ...base, messageKey: 'agent.managed.unavailable', nextAction: 'inspect-runtime' };
			return { ...base, messageKey: reason === 'account-unavailable' ? 'agent.managed.accountUnavailable' : 'agent.managed.programMissing', nextAction: reason === 'account-unavailable' ? 'configure-account' : 'configure-program' };
		case 'AGENT_BLOCKED': return { ...base, messageKey: 'agent.managed.permissionRequired', nextAction: 'confirm-permissions' };
		case 'EFFECT_UNKNOWN': return { ...base, messageKey: 'agent.managed.effectUnknown', nextAction: 'inspect-runtime' };
		default: return { ...base, messageKey: 'agent.managed.unavailable', nextAction: 'configure-program' };
	}
}

export function normalizeManagedFailure(cause: unknown): ManagedFailure {
	if (cause instanceof ManagedLaunchError) return cause.failure;
	if (cause instanceof SpaceError) return { ...managedFailure(cause.code, cause.reason), details: cause.details };
	if (cause instanceof Error && cause.name === 'NativeResumeError') {
		// Structural on purpose: native-resume.ts imports this module.
		const refusal = cause as Error & { code: ManagedErrorCode; reason: string };
		return managedFailure(refusal.code, refusal.reason);
	}
	if (cause instanceof NativeSpawnError) {
		const { code, effect } = cause.failure;
		const failure = effect === 'unknown' ? managedFailure('EFFECT_UNKNOWN', 'spawn-result-lost')
			: code === 'pty-unavailable' ? managedFailure('CAPABILITY_UNAVAILABLE', code)
				: managedFailure('SOURCE_UNAVAILABLE', code);
		return { ...failure, messageKey: code === 'directory-unavailable' ? 'agent.managed.launchFailed' : failure.messageKey, details: { nativeCode: code, nativeEffect: effect } };
	}
	return managedFailure('CONNECTION_UNAVAILABLE', 'prepare-failed');
}
