import { expect, test } from 'vitest';
import { normalizeDashboardSettings } from './settings';

test('only current settings fields survive normalization, so stale fields such as old integration credentials are never written back', () => {
	const settings = normalizeDashboardSettings({
		backupEnabled: false,
		bgFocal: { x: 0.25, y: 0.75 },
		quickButtonsBgColor: '#123456',
		ticktickCookie: 'secret-cookie',
		wereadApiKey: 'secret-key',
		somethingRemoved: true,
	}) as unknown as Record<string, unknown>;
	expect(settings.backupEnabled).toBe(false);
	expect(settings.bgFocal).toEqual({ x: 0.25, y: 0.75 });
	expect(settings.quickButtonsBgColor).toBe('#123456');
	expect(settings).not.toHaveProperty('ticktickCookie');
	expect(settings).not.toHaveProperty('wereadApiKey');
	expect(settings).not.toHaveProperty('somethingRemoved');
});
