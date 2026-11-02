import { t } from '../../../../shared/i18n';
import { SpaceError } from '../../core/space/errors';

export function spaceErrorMessage(error: unknown): string {
	if (!(error instanceof SpaceError)) return t('agent.spaces.error.save');
	switch (error.code) {
		case 'EFFECT_UNKNOWN': return t('agent.managed.effectUnknown');
		case 'STALE_RUNTIME': return t('agent.managed.staleRuntime');
		case 'SOURCE_UNAVAILABLE': return t('agent.managed.unavailable');
		case 'WAIT_CANCELLED': return t('agent.managed.waitCancelled');
		case 'WAIT_TIMEOUT': return t('agent.managed.waitTimeout');
		case 'INVALID_ARGUMENT': return t('agent.spaces.error.input');
		case 'OWNER_CONFLICT': return t('agent.spaces.error.owner');
		case 'DIRECTORY_NOT_AUTHORIZED': return t('agent.spaces.error.directory');
		case 'SCOPE_MISMATCH': return t('agent.spaces.error.scope');
		case 'CAPABILITY_UNAVAILABLE': return t('agent.spaces.error.capability');
		case 'TARGET_REQUIRED': return t('agent.spaces.error.required');
		case 'TARGET_AMBIGUOUS': return t('agent.spaces.error.ambiguous');
		case 'TARGET_NOT_FOUND': return t('agent.spaces.error.missing');
		default: return t('agent.spaces.error.save');
	}
}
