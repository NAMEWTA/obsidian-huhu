import type { t as translate } from '../../../shared/i18n';
import type { LockPolicy } from '../core/policy';

/** The rules the session actually follows, one sentence each, for the lock screen and the unlocked footer. */
export function lockRuleLines(t: typeof translate, policy: LockPolicy): string[] {
	return [
		policy.idleMs === null ? t('safe.rule.idleNever') : t('safe.rule.idle', { minutes: Math.round(policy.idleMs / 60_000) }),
		t(policy.lockOnSwitch ? 'safe.rule.switchLocks' : 'safe.rule.switchStays'),
		t(policy.lockOnClose ? 'safe.rule.closeLocks' : 'safe.rule.closeStays'),
		t('safe.rule.quit'),
	];
}
