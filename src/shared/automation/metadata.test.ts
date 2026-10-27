import { describe, expect, it } from 'vitest';
import { isDefinition, readTaskMeta, taskMetaSuffix } from './metadata';

const definition = (channels: unknown[]) => ({
	id: 'a',
	name: 'Test',
	enabled: true,
	deviceId: 'device',
	revision: 1,
	schedule: { kind: 'once', at: 1000 },
	action: { kind: 'notify', body: 'hello' },
	channels,
	notifyOn: 'always',
	graceMinutes: 720,
	createdAt: 0,
	updatedAt: 0,
});

describe('automation definitions', () => {
	it('accept the in-app and system channels', () => {
		const value = definition(['in-app', 'system']);
		expect(isDefinition(value)).toBe(true);
		expect(value.channels).toEqual(['in-app', 'system']);
	});

	it('reject unknown channels', () => {
		expect(isDefinition(definition(['in-app', 'pager']))).toBe(false);
		expect(isDefinition(definition(['email']))).toBe(false);
	});
	it('accepts only task-domain actions and rejects removed destination fields and invalid times', () => {
		const accepts = (action: unknown) => isDefinition({ ...definition(['in-app']), action });
		expect(accepts({ kind: 'create-task', text: 'Old', timezone: 'UTC' })).toBe(true);
		expect(accepts({ kind: 'create-task', text: 'All day', timezone: 'UTC' })).toBe(true);
		expect(accepts({ kind: 'create-task', text: 'Timed', time: '23:59', timezone: 'UTC' })).toBe(true);
		for (const patch of [{ target: 'unknown' }, { cardId: 'card' }, { time: '24:00' }, { reminderTime: '9:00' }])
			expect(accepts({ kind: 'create-task', text: 'Invalid', ...patch, timezone: 'UTC' })).toBe(false);
	});
	it('adds an optional effect identity without changing old marker bytes', () => {
		const old = { id: 'old-task', runId: 'run' };
		const expected = ` <!-- huhu-task:${encodeURIComponent(JSON.stringify(old)).replace(/-/g, '%2D')} -->`;
		expect(taskMetaSuffix(old)).toBe(expected);
		expect(readTaskMeta(`- [ ] Task${taskMetaSuffix({ ...old, effectKey: 'calendar:week-1' })}`)).toMatchObject({
			...old,
			effectKey: 'calendar:week-1',
		});
	});
});
