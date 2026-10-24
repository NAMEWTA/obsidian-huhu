import { describe, expect, test } from 'vitest';
import { DEFAULT_LOCK_POLICY, DEFAULT_LOCK_SETTINGS, MAX_IDLE_MINUTES, idleMinutes, lockPolicyOf, sameLockPolicy } from './policy';

describe('lock policy', () => {
	test('defaults to 20 minutes, no lock on switching and none on closing the page', () => {
		expect(DEFAULT_LOCK_SETTINGS).toEqual({ idlePreset: '20', idleCustomMinutes: 30, lockOnSwitch: false, lockOnClose: false });
		expect(DEFAULT_LOCK_POLICY).toEqual({ idleMs: 20 * 60 * 1000, lockOnSwitch: false, lockOnClose: false });
	});

	test.each([
		['5', 5], ['20', 20], ['60', 60], ['never', null],
	] as const)('preset %s', (idlePreset, minutes) => {
		expect(idleMinutes({ idlePreset, idleCustomMinutes: 99 })).toBe(minutes);
		expect(lockPolicyOf({ ...DEFAULT_LOCK_SETTINGS, idlePreset }).idleMs).toBe(minutes === null ? null : minutes * 60_000);
	});

	test('a custom time is used as minutes and is kept inside one minute to one week', () => {
		expect(idleMinutes({ idlePreset: 'custom', idleCustomMinutes: 45 })).toBe(45);
		expect(idleMinutes({ idlePreset: 'custom', idleCustomMinutes: 0 })).toBe(1);
		expect(idleMinutes({ idlePreset: 'custom', idleCustomMinutes: 10 ** 9 })).toBe(MAX_IDLE_MINUTES);
		expect(idleMinutes({ idlePreset: 'custom', idleCustomMinutes: Number.NaN })).toBe(20);
	});

	test('switching and closing are independent switches', () => {
		const policy = lockPolicyOf({ ...DEFAULT_LOCK_SETTINGS, lockOnSwitch: true });
		expect(policy).toMatchObject({ lockOnSwitch: true, lockOnClose: false });
		expect(sameLockPolicy(policy, DEFAULT_LOCK_POLICY)).toBe(false);
		expect(sameLockPolicy(policy, lockPolicyOf({ ...DEFAULT_LOCK_SETTINGS, lockOnSwitch: true }))).toBe(true);
	});
});
