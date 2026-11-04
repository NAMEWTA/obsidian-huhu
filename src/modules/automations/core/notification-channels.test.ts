import { expect, test } from 'vitest';
import { isDefinition } from '../../../shared/automation/metadata';
import type { AutomationDefinition } from '../../../shared/automation/types';

test('automation definitions preserve extensible channel IDs without depending on a notification enum', () => {
	const definition: AutomationDefinition = {
		id: 'test', name: 'Reminder', enabled: true, deviceId: 'device', revision: 1,
		schedule: { kind: 'manual' }, action: { kind: 'notify', body: 'Reminder' },
		channels: ['contributed.test'], notifyOn: 'always', graceMinutes: 0, createdAt: 1, updatedAt: 1,
	};
	expect(isDefinition(definition)).toBe(true);
	expect(isDefinition({ ...definition, channels: [''] })).toBe(false);
	expect(isDefinition({ ...definition, channels: [42] })).toBe(false);
});
