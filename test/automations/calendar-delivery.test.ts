import { expect, test, vi } from 'vitest';
import { memoryVault } from '../../scripts/fixtures/memory-vault';
import { AutomationService } from '../../src/modules/automations/core/service';
import { calendarDeliveryForRun } from '../../src/modules/automations/core/calendar-run';
import { deliverCalendarTask } from '../../src/modules/automations/services/calendar-delivery';
import { createCalendarService } from '../../src/modules/home/services/calendar-service';
import type { CalendarService, CalendarTargetSnapshot } from '../../src/modules/home/api';
import type { DashboardSettings } from '../../src/modules/home/core/board/types';
import type { AutomationDefinition, AutomationRun, AutomationSourcePort } from '../../src/shared/automation/types';
import { readTaskMeta } from '../../src/shared/automation/metadata';

const friday = Date.parse('2026-10-23T01:00:00Z');
const runtimePath = '.huhu/automation/device/runtime.json';
function definition(): AutomationDefinition {
	return {
		id: 'weekly-calendar', name: 'Weekly review', enabled: true, deviceId: 'device', revision: 1,
		schedule: { kind: 'recurring', expression: '0 9 * * 5', timezone: 'Asia/Taipei', start: friday },
		action: { kind: 'create-task', target: 'calendar', path: 'Board.md', text: '每周复盘', time: '14:30', reminderTime: '13:45' },
		channels: ['in-app'], notifyOn: 'never', graceMinutes: 2880, createdAt: 0, updatedAt: 0,
	};
}
function fixture() {
	const vault = memoryVault({ 'Board.md': '# Board\n', 'Tasks/original.md': '# Tasks\n' });
	const settings: Pick<DashboardSettings, 'dashboardFile' | 'calendarExcludeFolders' | 'calendarTaskFilter' | 'calendarTaskTarget' | 'calendarTaskInsertPosition'> = {
		dashboardFile: '.huhu/dashboards/Board', calendarExcludeFolders: [], calendarTaskFilter: 'all',
		calendarTaskTarget: { kind: 'file', path: 'Tasks/original.md' }, calendarTaskInsertPosition: 'end',
	};
	const calendar = createCalendarService({ app: vault.app, settings: () => settings, journal: () => undefined });
	const source: AutomationSourcePort = {
		list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {},
		createTask: async (action, _runId, execution) => {
			if (action.target !== 'calendar') throw new Error('Expected calendar');
			return deliverCalendarTask(calendar, action, execution);
		},
	};
	const make = () => new AutomationService(vault.adapter, runtimePath, 'device', source, () => undefined, async () => {});
	return { ...vault, settings, calendar, source, make };
}

test.each([
	'Review [due:: 2026-10-24]', 'Review [scheduled:: 2026-10-24 09:00]',
	'Review [completion:: 2026-10-24]', 'Review ⏰ 2026-10-24 09:00',
	'Review ⏳ 2026-10-24', 'Review ✅2026-10-24',
])('automation rejects conflicting date text without creating or modifying task notes: %s', async (text) => {
	const f = fixture(), service = f.make(), d = definition();
	d.action = { kind: 'create-task', target: 'calendar', path: 'Board.md', text };
	try {
		await service.load();
		const run = await service.run(d, 'scheduled', friday, friday);
		expect(run).toMatchObject({ status: 'failed', errorCode: 'calendarInvalidInput', taskDelivery: { date: '2026-10-23' } });
		expect(run?.taskDelivery?.target).toBeUndefined(); expect(run?.taskDelivery?.receipt).toBeUndefined();
		expect(f.contents.get('Board.md')).toBe('# Board\n');
		expect(f.contents.get('Tasks/original.md')).toBe('# Tasks\n');
		expect([...f.contents.keys()].filter((path) => path.endsWith('.md')).sort()).toEqual(['Board.md', 'Tasks/original.md']);
		expect((await f.calendar.refresh()).tasks).toHaveLength(0);
	} finally { await service.shutdown(); f.calendar.dispose(); }
});

test('automation retains ordinary dates, times, keywords, links and undated markers in its task title', async () => {
	const f = fixture(), service = f.make(), d = definition();
	const text = 'Review due/scheduled wording for 2026-10-24 at 09:00 — [[Reference]] ✅ checked';
	d.action = { kind: 'create-task', target: 'calendar', path: 'Board.md', text, time: '14:30', reminderTime: '13:45' };
	try {
		await service.load();
		expect(await service.run(d, 'scheduled', friday, friday)).toMatchObject({ status: 'succeeded', taskDelivery: { date: '2026-10-23' } });
		expect((await f.calendar.refresh()).tasks).toEqual([expect.objectContaining({ text, due: '2026-10-23', time: '14:30', reminder: '2026-10-23 13:45' })]);
		expect(f.contents.get('Tasks/original.md')).toContain(`- [ ] ${text} [due:: 2026-10-23 14:30]`);
	} finally { await service.shutdown(); f.calendar.dispose(); }
});

test('a delayed Friday occurrence keeps its planned date, while a new week and fresh manual run have separate identities', async () => {
	const f = fixture(), service = f.make(), d = definition();
	try {
		await service.load();
		const first = await service.run(d, 'scheduled', friday, friday + 24 * 60 * 60 * 1000);
		expect(first).toMatchObject({ status: 'succeeded', taskDelivery: { date: '2026-10-23', timezone: 'Asia/Taipei', result: 'created' } });
		expect(f.contents.get('Tasks/original.md')).toContain('[due:: 2026-10-23 14:30] ⏰ 2026-10-23 13:45');
		const tasks = (await f.calendar.refresh()).tasks;
		expect(tasks).toHaveLength(1);
		expect(tasks[0]).toMatchObject({ due: '2026-10-23', time: '14:30', reminder: '2026-10-23 13:45', text: '每周复盘' });
		expect(await service.run(d, 'scheduled', friday, friday + 1)).toBe(first);
		expect(service.state.runs).toHaveLength(1);
		const next = await service.run(d, 'scheduled', friday + 7 * 86400000, friday + 7 * 86400000);
		expect(next?.taskDelivery?.date).toBe('2026-10-30');
		expect(next?.taskDelivery?.effectKey).not.toBe(first?.taskDelivery?.effectKey);
		const manual = await service.run(d, 'manual', friday + 1, friday + 1);
		expect(manual?.taskDelivery?.effectKey).toBe(`calendar:manual:${manual?.id}`);
		expect((await f.calendar.refresh()).tasks).toHaveLength(3);
	} finally { await service.shutdown(); f.calendar.dispose(); }
});

test('receipt persistence failure is recovered without duplicating or moving a task after destination changes', async () => {
	const f = fixture(), d = definition();
	const write = f.adapter.write;
	let failReceipt = true;
	f.adapter.write = async (path, value) => {
		if (path === runtimePath && failReceipt && JSON.parse(value).runs?.some((run: AutomationRun) => run.taskDelivery?.receipt)) {
			failReceipt = false;
			throw new Error('Receipt disk full');
		}
		await write(path, value);
	};
	let service = f.make();
	try {
		await service.load();
		const failed = await service.run(d, 'scheduled', friday, friday);
		expect(failed?.status).toBe('failed');
		expect(failed?.taskDelivery?.target).toMatchObject({ path: 'Tasks/original.md' });
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
		await service.shutdown();
		f.settings.calendarTaskTarget = { kind: 'file', path: 'Tasks/changed.md' };
		service = f.make();
		await service.load();
		const retried = await service.retryRun(service.state.runs[0]!);
		expect(retried).toMatchObject({ status: 'succeeded', retryOf: failed!.id, taskDelivery: { date: '2026-10-23', result: 'already-exists' } });
		expect(retried?.taskDelivery?.effectKey).toBe(failed?.taskDelivery?.effectKey);
		expect(retried?.taskDelivery?.receipt?.path).toBe('Tasks/original.md');
		expect(f.contents.has('Tasks/changed.md')).toBe(false);
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
		expect(service.state.cursors['weekly-calendar:1']).toBe(friday);
	} finally { await service.shutdown(); f.calendar.dispose(); }
});

test('restart after a committed effect and before its receipt exposes an interrupted delivery that retries safely', async () => {
	const f = fixture(), service = f.make(), d = definition();
	let journalBeforeEffect = '';
	const createTask = f.calendar.createTask.bind(f.calendar);
	f.calendar.createTask = async (input) => {
		journalBeforeEffect = f.contents.get(runtimePath)!;
		return createTask(input);
	};
	await service.load();
	const original = await service.run(d, 'scheduled', friday, friday);
	expect(original?.status).toBe('succeeded');
	await service.shutdown();
	// These are the durable bytes at a process crash between the task and receipt commits.
	f.contents.set(runtimePath, journalBeforeEffect);
	const restarted = f.make();
	try {
		await restarted.load();
		const interrupted = restarted.state.runs[0]!;
		expect(interrupted.status).toBe('interrupted');
		expect(interrupted.taskDelivery?.receipt).toBeUndefined();
		const result = await restarted.retryRun(interrupted);
		expect(result?.taskDelivery?.result).toBe('already-exists');
		expect(result?.taskDelivery?.effectKey).toBe(original?.taskDelivery?.effectKey);
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
	} finally { await restarted.shutdown(); f.calendar.dispose(); }
});

test('calendar dates are derived in the stored IANA zone, not from the retry machine or wall clock', () => {
	const d = definition(), scheduledFor = Date.parse('2026-10-22T18:00:00Z');
	expect(calendarDeliveryForRun(d, { id: 'run', trigger: 'scheduled', scheduledFor })?.date).toBe('2026-10-23');
	d.schedule = { ...d.schedule as Extract<AutomationDefinition['schedule'], { kind: 'recurring' }>, timezone: 'America/Los_Angeles' };
	expect(calendarDeliveryForRun(d, { id: 'run', trigger: 'scheduled', scheduledFor })?.date).toBe('2026-10-22');
	d.action = { kind: 'create-task', path: 'Board.md', cardId: 'old', text: 'Legacy' };
	expect(calendarDeliveryForRun(d, { id: 'run', trigger: 'scheduled', scheduledFor })).toBeUndefined();
});

test('target is durable before a write; unavailable services, cancellation and checkpoint errors have no task effect', async () => {
	const f = fixture(), d = definition();
	const run: AutomationRun = { id: 'run', automationId: d.id, revision: 1, title: d.name, definition: d,
		trigger: 'scheduled', scheduledFor: friday, startedAt: friday, status: 'pending', message: '',
		taskDelivery: calendarDeliveryForRun(d, { id: 'run', trigger: 'scheduled', scheduledFor: friday }) };
	const action = d.action as Extract<AutomationDefinition['action'], { target: 'calendar' }>;
	const createTask = vi.spyOn(f.calendar, 'createTask');
	const checkpoint = vi.fn(async () => { throw new Error('No durable checkpoint'); });
	const controller = new AbortController();
	const execution = { run, signal: controller.signal, checkpoint };
	try {
		await expect(deliverCalendarTask(undefined, action, execution)).rejects.toMatchObject({ code: 'calendarUnavailable' });
		await expect(deliverCalendarTask(f.calendar, action, execution)).rejects.toThrow('No durable checkpoint');
		expect(checkpoint).toHaveBeenCalledOnce();
		expect(createTask).not.toHaveBeenCalled();
		controller.abort();
		await expect(deliverCalendarTask(f.calendar, action, execution)).rejects.toMatchObject({ code: 'cancelled' });
		expect(createTask).not.toHaveBeenCalled();
		expect(f.contents.get('Tasks/original.md')).toBe('# Tasks\n');
	} finally { f.calendar.dispose(); }
});

test('written but unrefreshed results keep their receipt and do not become a failed action', async () => {
	const f = fixture(), d = definition();
	const target: CalendarTargetSnapshot = { version: 1, kind: 'file', path: 'Tasks/original.md', date: '2026-10-23', position: 'end', id: 'task' };
	const run: AutomationRun = { id: 'run', automationId: d.id, revision: 1, title: d.name, definition: d,
		trigger: 'scheduled', scheduledFor: friday, startedAt: friday, status: 'pending', message: '',
		taskDelivery: { ...calendarDeliveryForRun(d, { id: 'run', trigger: 'scheduled', scheduledFor: friday })!, target } };
	const resolver = vi.spyOn(f.calendar, 'resolveTarget');
	const calendar: CalendarService = { ...f.calendar, createTask: async () => ({ status: 'written-pending-refresh', target,
		receipt: { id: 'task', path: target.path, line: 1, originalLine: '- [ ] Task', date: target.date } }) };
	const checkpoint = vi.fn(async () => {});
	try {
		const result = await deliverCalendarTask(calendar, d.action as Extract<AutomationDefinition['action'], { target: 'calendar' }>, {
			run, signal: new AbortController().signal, checkpoint,
		});
		expect(result.errorCode).toBe('calendarWrittenPendingRefresh');
		expect(checkpoint).toHaveBeenCalledWith(expect.objectContaining({ result: 'written-pending-refresh', receipt: expect.objectContaining({ path: target.path }) }));
		expect(resolver).not.toHaveBeenCalled();
	} finally { f.calendar.dispose(); }
});

test('task toggles and scanner round trips preserve the delivery marker while hiding it from visible text', async () => {
	const f = fixture(), service = f.make();
	try {
		await service.load();
		const run = await service.run(definition(), 'scheduled', friday, friday);
		const original = (await f.calendar.refresh()).tasks[0]!;
		expect(original.text).not.toContain('huhu-task');
		expect(await f.calendar.toggleTask(original, true)).toMatchObject({ status: 'updated' });
		const line = f.contents.get('Tasks/original.md')!.split('\n').find((row) => row.startsWith('- [x]'))!;
		expect(readTaskMeta(line)).toMatchObject({ id: original.id, effectKey: run?.taskDelivery?.effectKey, runId: run?.id });
		expect((await f.calendar.refresh()).tasks[0]?.checked).toBe(true);
	} finally { await service.shutdown(); f.calendar.dispose(); }
});

test('disabling execution during an in-flight write preserves the committed receipt without reporting success', async () => {
	const f = fixture(), service = f.make();
	let committed!: () => void, release!: () => void;
	const entered = new Promise<void>((resolve) => { committed = resolve; });
	const proceed = new Promise<void>((resolve) => { release = resolve; });
	const write = f.adapter.write;
	f.adapter.write = async (path, value) => {
		await write(path, value);
		if (path === 'Tasks/original.md') { committed(); await proceed; }
	};
	try {
		await service.load();
		const running = service.run(definition(), 'scheduled', friday, friday);
		await entered;
		const disabling = service.setExecutionEnabled(false);
		await vi.waitFor(() => expect(service.state.runs[0]?.status).toBe('cancelled'));
		release();
		const [run] = await Promise.all([running, disabling]);
		expect(run?.status).toBe('cancelled');
		expect(run?.taskDelivery?.receipt?.path).toBe('Tasks/original.md');
		expect(JSON.parse(f.contents.get(runtimePath)!).runs[0]).toMatchObject({ status: 'cancelled', taskDelivery: { receipt: { path: 'Tasks/original.md' } } });
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
	} finally { release(); await service.shutdown(); f.calendar.dispose(); }
});
