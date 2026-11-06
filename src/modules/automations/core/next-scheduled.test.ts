import { expect, test } from 'vitest';
import { AutomationService } from './service';
import { nextOccurrence } from './schedule';
import type { AutomationDefinition, AutomationSourcePort } from '../../../shared/automation/types';

function definition(patch: Partial<AutomationDefinition> = {}): AutomationDefinition {
	return {
		id: 'test',
		name: 'Test',
		enabled: true,
		deviceId: 'local',
		revision: 1,
		schedule: { kind: 'once', at: 2000 },
		action: { kind: 'notify', body: '' },
		channels: [],
		notifyOn: 'never',
		graceMinutes: 1,
		createdAt: 0,
		updatedAt: 0,
		...patch,
	};
}
function fixture() {
	const files = new Map<string, string>();
	let rows: AutomationDefinition[] = [];
	const source: AutomationSourcePort = {
		list: async () => rows,
		save: async () => undefined,
		remove: async () => undefined,
		open: async () => undefined,
		createTask: async () => undefined,
	};
	const service = new AutomationService(
		{
			exists: async (path) => files.has(path),
			read: async (path) => files.get(path)!,
			write: async (path, text) => {
				files.set(path, text);
			},
			mkdir: async () => undefined,
		},
		'runtime.json',
		'local',
		source,
		() => undefined,
		async () => undefined,
	);
	return {
		service,
		setRows: (next: AutomationDefinition[]) => {
			rows = next;
		},
	};
}

test('only local enabled future triggers contribute and reading never mutates scheduler state', async () => {
	const { service, setRows } = fixture();
	expect(service.nextScheduled(1000)).toBeUndefined();
	setRows([
		definition({ id: 'disabled', enabled: false, schedule: { kind: 'once', at: 1001 } }),
		definition({ id: 'remote', deviceId: 'remote', schedule: { kind: 'once', at: 1002 } }),
		definition({ id: 'manual', schedule: { kind: 'manual' } }),
		definition({ id: 'past', schedule: { kind: 'once', at: 999 } }),
		definition({ id: 'now', schedule: { kind: 'once', at: 1000 } }),
		definition(),
	]);
	await service.load();
	const state = structuredClone(service.state);
	expect(service.nextScheduled(1000)).toEqual({ name: 'Test', at: 2000 });
	expect(service.state).toEqual(state);
	expect(service.nextScheduled(2000)).toBeNull();
	setRows([]);
	await service.refresh();
	expect(service.nextScheduled(1000)).toBeNull();
});

test('real recurring scheduler preserves UTC and the default New York fold occurrence', async () => {
	const { service, setRows } = fixture();
	const schedule = {
		kind: 'recurring' as const,
		expression: '30 1 * * *',
		start: Date.parse('2026-01-01T00:00:00Z'),
		timezone: 'America/New_York',
	};
	const now = Date.parse('2026-11-01T05:30:00Z');
	setRows([definition({ schedule, name: 'Fold' })]);
	await service.load();
	expect(nextOccurrence(schedule, now)).toBe(Date.parse('2026-11-01T06:30:00Z'));
	expect(service.nextScheduled(now)).toEqual({ name: 'Fold', at: Date.parse('2026-11-01T06:30:00Z') });
	setRows([definition({ schedule: { ...schedule, timezone: 'UTC' }, name: 'UTC' })]);
	await service.refresh();
	expect(service.nextScheduled(now)).toEqual({ name: 'UTC', at: Date.parse('2026-11-02T01:30:00Z') });
});

test('execution gate, load error, recovery hold and shutdown report unavailable', async () => {
	const { service, setRows } = fixture();
	setRows([definition()]);
	await service.load();
	await service.setExecutionEnabled(false);
	expect(service.nextScheduled(1000)).toBeUndefined();
	await service.setExecutionEnabled(true);
	expect(service.nextScheduled(1000)).toEqual({ name: 'Test', at: 2000 });
	service.loadError = 'unreadable';
	expect(service.nextScheduled(1000)).toBeUndefined();
	service.loadError = '';
	service.quiesceWrites();
	expect(service.nextScheduled(1000)).toBeUndefined();
	service.resumeWrites();
	expect(service.nextScheduled(1000)).toEqual({ name: 'Test', at: 2000 });
	await service.shutdown();
	expect(service.nextScheduled(1000)).toBeUndefined();
});

test('failed definition load is unavailable and successful retry restores projection', async () => {
	const { service, setRows } = fixture();
	const list = service.sources.list;
	service.sources.list = async () => {
		throw new Error('read failure');
	};
	await expect(service.load()).rejects.toThrow('read failure');
	expect(service.nextScheduled(1000)).toBeUndefined();
	service.sources.list = list;
	setRows([definition()]);
	await service.load();
	expect(service.nextScheduled(1000)).toEqual({ name: 'Test', at: 2000 });
});

test('a later read failure hides stale definitions and notifies existing subscribers', async () => {
	const { service, setRows } = fixture();
	setRows([definition()]);
	await service.load();
	let notifications = 0;
	const unsubscribe = service.subscribe(() => {
		notifications++;
	});
	const list = service.sources.list;
	service.sources.list = async () => {
		throw new Error('later failure');
	};
	await expect(service.refresh()).rejects.toThrow('later failure');
	expect(service.nextScheduled(1000)).toBeUndefined();
	expect(notifications).toBe(1);
	service.sources.list = list;
	await service.refresh();
	expect(service.nextScheduled(1000)).toEqual({ name: 'Test', at: 2000 });
	expect(notifications).toBe(2);
	unsubscribe();
});
