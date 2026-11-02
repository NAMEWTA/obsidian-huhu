import { describe, it, expect } from 'vitest';
import { createTaskService } from './service';
import { createTaskRepository } from '../platform/repository';
import { createTaskTools } from './tools';
import { createTaskCalendar } from './calendar';
import { reminderDefinition } from '../contrib/automation-source';
import { wallTime, zonedStamp } from '../core/time';
import { emptyTaskState, TaskError, type TaskDraft, type TaskSchedule } from '../core/model';
import type { TaskViews } from '../api';
import { decodeTaskState } from '../core/validation';
const base = (extra: Partial<TaskDraft> = {}): TaskDraft => ({
	title: 'Submit report',
	description: '',
	timezone: 'Asia/Singapore',
	relations: [],
	...extra,
});
const at = (date: string, time = '00:00', zone = 'Asia/Singapore') => wallTime(date, time, zone);
function storage(initial: string | null = null) {
	let raw = initial,
		writes = 0,
		tail = Promise.resolve();
	return {
		get raw() {
			return raw;
		},
		get writes() {
			return writes;
		},
		set(value: string | null) {
			raw = value;
		},
		read: async () => raw,
		process(change: (value: string | null) => string) {
			const next = tail.then(() => {
				const value = change(raw);
				if (value !== raw) {
					raw = value;
					writes++;
				}
				return raw;
			});
			tail = next.then(
				() => undefined,
				() => undefined,
			);
			return next;
		},
	};
}
const daily: TaskSchedule = {
	validate() {},
	next: (rule, _zone, after) =>
		rule.start + Math.max(1, Math.floor((after - rule.start) / 86_400_000) + 1) * 86_400_000,
};
async function fixture(now = at('2026-09-20', '10:00'), schedule?: TaskSchedule) {
	const disk = storage();
	let clock = now;
	const tasks = createTaskService({
		repository: createTaskRepository(disk),
		deviceId: 'test-device',
		now: () => clock,
		schedule: () => schedule,
		remindersAvailable: () => true,
	});
	await tasks.load();
	return {
		tasks,
		disk,
		setNow(value: number) {
			clock = value;
			tasks.tick();
		},
	};
}
describe('task application: one atomic command path', () => {
	it('separates creation, deadline and reminder; file creation time is never used', async () => {
		const { tasks } = await fixture();
		const result = await tasks.execute({
			kind: 'create',
			commandId: 'separate',
			draft: base({ due: { date: '2026-09-30' }, reminderAt: at('2026-09-25', '09:00') }),
		});
		expect(result.ok).toBe(true);
		const task = tasks.get('task:separate')!;
		expect(task.createdAt).toBe(at('2026-09-20', '10:00'));
		expect(task.due?.date).toBe('2026-09-30');
		expect(task.reminderAt).toBe(at('2026-09-25', '09:00'));
	});
	it('carries overdue work daily without rewriting the original due date or store', async () => {
		const { tasks, disk, setNow } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'carry', draft: base({ due: { date: '2026-09-20' } }) });
		const before = disk.raw,
			writes = disk.writes;
		setNow(at('2026-09-21', '09:00'));
		expect(tasks.get('task:carry')).toMatchObject({
			overdue: true,
			overdueDays: 1,
			effectiveDate: '2026-09-21',
			due: { date: '2026-09-20' },
		});
		setNow(at('2026-09-25'));
		expect(tasks.get('task:carry')?.overdueDays).toBe(5);
		expect(disk.raw).toBe(before);
		expect(disk.writes).toBe(writes);
	});
	it('all includes completed; incomplete includes overdue; no due is never overdue', async () => {
		const { tasks } = await fixture();
		for (const id of ['late', 'done', 'none'])
			await tasks.execute({
				kind: 'create',
				commandId: id,
				draft: base(id === 'none' ? {} : { due: { date: '2026-09-19' } }),
			});
		await tasks.execute({ kind: 'complete', commandId: 'complete', id: 'task:done', expectedRevision: 1 });
		expect(tasks.query({ filter: 'all' }).total).toBe(3);
		expect(tasks.query({ filter: 'open' }).total).toBe(2);
		expect(tasks.query({ filter: 'overdue' }).items.map((task) => task.id)).toEqual(['task:late']);
		expect(tasks.query({ filter: 'completed' }).total).toBe(1);
	});
	it('persists idempotency receipts across service restart, and rejects payload reuse', async () => {
		const { tasks, disk } = await fixture();
		const command = { kind: 'create' as const, commandId: 'retry', draft: base() };
		const first = await tasks.execute(command);
		const writes = disk.writes;
		const restarted = createTaskService({ repository: createTaskRepository(disk), deviceId: 'different-device' });
		await restarted.load();
		const replay = await restarted.execute(command);
		expect(replay).toMatchObject({ ok: true, replayed: true });
		if (first.ok && replay.ok) expect(replay.receipt).toEqual(first.receipt);
		expect(disk.writes).toBe(writes);
		expect(await restarted.execute({ ...command, draft: base({ title: 'Different' }) })).toMatchObject({
			ok: false,
			error: { code: 'idempotency-conflict' },
		});
	});
	it('rejects stale writes across two service instances sharing an atomic store', async () => {
		const { tasks, disk } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'shared', draft: base() });
		const other = createTaskService({ repository: createTaskRepository(disk), deviceId: 'other' });
		await other.load();
		const results = await Promise.all([
			tasks.execute({ kind: 'complete', commandId: 'first', id: 'task:shared', expectedRevision: 1 }),
			other.execute({
				kind: 'update',
				commandId: 'second',
				id: 'task:shared',
				expectedRevision: 1,
				fields: base({ title: 'Concurrent' }),
			}),
		]);
		expect(results.filter((result) => result.ok)).toHaveLength(1);
		expect(results.filter((result) => !result.ok && result.error.code === 'conflict')).toHaveLength(1);
	});
	it('completion stops reminders; reopening does not replay past reminders', async () => {
		const { tasks, setNow } = await fixture(at('2026-09-20', '08:00'));
		await tasks.execute({
			kind: 'create',
			commandId: 'reminder',
			draft: base({ due: { date: '2026-09-30' }, reminderAt: at('2026-09-25', '09:00') }),
		});
		expect(reminderDefinition(tasks.get('task:reminder')!, at('2026-09-20'))?.source?.kind).toBe('task');
		await tasks.execute({ kind: 'complete', commandId: 'done', id: 'task:reminder', expectedRevision: 1 });
		expect(reminderDefinition(tasks.get('task:reminder')!, at('2026-09-20'))).toBeUndefined();
		setNow(at('2026-09-26'));
		await tasks.execute({ kind: 'reopen', commandId: 'again', id: 'task:reminder', expectedRevision: 2 });
		expect(tasks.get('task:reminder')?.reminderAt).toBeUndefined();
		expect(tasks.get('task:reminder')?.createdAt).toBe(at('2026-09-20', '08:00'));
	});
	it('reminder identity does not change due to daily carry or editing the title', async () => {
		const { tasks } = await fixture();
		const draft = base({ due: { date: '2026-09-30' }, reminderAt: at('2026-09-25', '09:00') });
		await tasks.execute({ kind: 'create', commandId: 'r', draft });
		const old = reminderDefinition(tasks.get('task:r')!, at('2026-09-24'));
		await tasks.execute({
			kind: 'update',
			commandId: 'title',
			id: 'task:r',
			expectedRevision: 1,
			fields: { ...draft, title: 'New title' },
		});
		const next = reminderDefinition(tasks.get('task:r')!, at('2026-09-24'));
		expect(next?.id).toBe(old?.id);
		expect(next?.revision).toBe(old?.revision);
		expect(reminderDefinition(tasks.get('task:r')!, at('2026-10-01'))).toBeUndefined();
	});
	it('links multiple resources without changing where the task is stored; renames keep archive IDs', async () => {
		const { tasks } = await fixture();
		await tasks.execute({
			kind: 'create',
			commandId: 'refs',
			draft: base({
				relations: [
					{ kind: 'file', path: 'Project/a.md' },
					{ kind: 'folder', path: 'Project' },
					{ kind: 'archive', id: 'company-42' },
				],
			}),
		});
		expect(tasks.query({ related: { kind: 'folder', path: 'Project' }, recursive: true }).total).toBe(1);
		await tasks.renameResource('Project', 'Work');
		expect(tasks.get('task:refs')?.relations).toEqual([
			{ kind: 'file', path: 'Work/a.md' },
			{ kind: 'folder', path: 'Work' },
			{ kind: 'archive', id: 'company-42' },
		]);
		expect(tasks.query({ related: { kind: 'archive', id: 'company-42' } }).total).toBe(1);
	});
	it.each(['../secret.md', '/absolute.md', '.huhu/safe/vault.enc', 'a/../../x', 'C:\\secret'])(
		'rejects unsafe relation path %s',
		async (path) => {
			const { tasks } = await fixture();
			expect(
				await tasks.execute({
					kind: 'create',
					commandId: 'bad',
					draft: base({ relations: [{ kind: 'file', path }] }),
				}),
			).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
		},
	);
	it('fails closed on corruption, missing store, and unknown versions', async () => {
		const { tasks, disk } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'ok', draft: base() });
		disk.set('{damaged');
		await tasks.refresh();
		expect(tasks.snapshot().status).toBe('error');
		expect(await tasks.execute({ kind: 'create', commandId: 'no', draft: base() })).toMatchObject({
			ok: false,
			error: { code: 'corrupt-store' },
		});
		expect(disk.raw).toBe('{damaged');
		disk.set(null);
		expect(await tasks.execute({ kind: 'create', commandId: 'none', draft: base() })).toMatchObject({
			ok: false,
			error: { code: 'missing-store' },
		});
		expect(() => decodeTaskState(JSON.stringify({ ...emptyTaskState(), version: 2 }))).toThrow(TaskError);
	});
	it('rejects commands after dispose and aborted writes without modifying bytes', async () => {
		const { tasks, disk } = await fixture();
		const controller = new AbortController();
		controller.abort();
		expect(
			await tasks.execute({ kind: 'create', commandId: 'aborted', draft: base() }, controller.signal),
		).toMatchObject({ ok: false, error: { code: 'cancelled' } });
		await tasks.dispose();
		expect(await tasks.execute({ kind: 'create', commandId: 'closed', draft: base() })).toMatchObject({
			ok: false,
			error: { code: 'unavailable' },
		});
		expect(disk.raw).toBeNull();
	});
});
describe('task time semantics', () => {
	it('date-only expires after the local day, precise times after the chosen minute', async () => {
		const { tasks, setNow } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'day', draft: base({ due: { date: '2026-09-20' } }) });
		setNow(at('2026-09-20', '23:59') + 59_999);
		expect(tasks.get('task:day')?.overdue).toBe(false);
		setNow(at('2026-09-21'));
		expect(tasks.get('task:day')?.overdue).toBe(true);
	});
	it('rejects nonexistent local DST time; disambiguates fold to the earlier instant', () => {
		expect(() => wallTime('2026-03-08', '02:30', 'America/New_York')).toThrow();
		expect(new Date(wallTime('2026-11-01', '01:30', 'America/New_York')).toISOString()).toBe(
			'2026-11-01T05:30:00.000Z',
		);
		expect(zonedStamp(at('2026-09-20', '10:00'), 'UTC')).toBe('2026-09-20 02:00');
	});
	it('a future manual handling day does not erase overdue responsibility', async () => {
		const { tasks } = await fixture();
		await tasks.execute({
			kind: 'create',
			commandId: 'plan',
			draft: base({ due: { date: '2026-09-19' }, planDate: '2026-09-25' }),
		});
		expect(tasks.get('task:plan')).toMatchObject({ overdue: true, effectiveDate: '2026-09-25' });
	});
});
describe('recurrence ownership', () => {
	it('creates missed occurrences and one future instance idempotently; previews never write', async () => {
		const { tasks, disk, setNow } = await fixture(at('2026-09-20'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'series',
			draft: base({
				due: { date: '2026-09-20' },
				recurrence: { expression: '0 0 * * *', start: at('2026-09-20') },
			}),
		});
		const before = disk.raw;
		expect(tasks.preview('2026-09-21', '2026-09-25').length).toBeGreaterThan(0);
		expect(disk.raw).toBe(before);
		setNow(at('2026-09-22', '12:00'));
		await tasks.reconcile();
		const count = tasks.query({ filter: 'all' }).total;
		expect(count).toBe(4);
		await tasks.reconcile();
		expect(tasks.query({ filter: 'all' }).total).toBe(count);
		expect(tasks.query({ filter: 'overdue' }).total).toBe(2);
	});
	it('stops a series atomically without reviving cancelled instances or losing completed history', async () => {
		const { tasks, setNow } = await fixture(at('2026-09-20'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'series',
			draft: base({
				due: { date: '2026-09-20' },
				recurrence: { expression: '0 0 * * *', start: at('2026-09-20') },
			}),
		});
		await tasks.execute({ kind: 'complete', commandId: 'complete', id: 'task:series', expectedRevision: 1 });
		setNow(at('2026-09-22'));
		await tasks.reconcile();
		const id = 'series:task:series';
		const result = await tasks.execute({
			kind: 'cancel-series',
			commandId: 'stop',
			id,
			expectedRevision: 1,
			from: at('2026-09-21'),
		});
		expect(result.ok).toBe(true);
		await tasks.reconcile();
		expect(tasks.query({ filter: 'open' }).total).toBe(0);
		expect(tasks.query({ filter: 'completed' }).total).toBe(1);
		expect(tasks.query({ filter: 'all', includeCancelled: true }).total).toBeGreaterThan(1);
	});
});
describe('versioned agent tools', () => {
	it('requires trusted grants, rejects unknown fields, and uses the same command reducer', async () => {
		const { tasks } = await fixture(),
			tools = createTaskTools(tasks);
		expect(
			await tools.call('task.create', { commandId: 'tool', draft: base() }, { grants: ['task:read'] }),
		).toMatchObject({ ok: false, error: { code: 'forbidden' } });
		expect(
			await tools.call(
				'task.create',
				{ commandId: 'tool', draft: base(), grants: ['task:write'] },
				{ grants: ['task:write'] },
			),
		).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
		expect(
			await tools.call('task.create', { commandId: 'tool', draft: base() }, { grants: ['task:write'] }),
		).toMatchObject({ ok: true });
		expect(await tools.call('task.get', { id: 'task:tool' }, { grants: ['task:read'] })).toMatchObject({
			ok: true,
			data: { id: 'task:tool', revision: 1 },
		});
		expect(await tools.call('task.list', { limit: 501 }, { grants: ['task:read'] })).toMatchObject({
			ok: false,
			error: { code: 'invalid-input' },
		});
		expect(tools.list()).toHaveLength(15);
		expect(tools.list().every((tool) => tool.outputSchema && tool.inputSchema)).toBe(true);
	});
	it('does not expose internal state through returned objects', async () => {
		const { tasks } = await fixture();
		await tasks.execute({ kind: 'create', commandId: 'copy', draft: base() });
		tasks.get('task:copy')!.title = 'mutated';
		expect(tasks.get('task:copy')!.title).toBe('Submit report');
	});
});
describe('calendar is a task projection', () => {
	it('keeps reminder, due and current carry days as distinct anchors', async () => {
		const { tasks, setNow } = await fixture();
		const views: TaskViews = { edit: async () => {}, open: async () => {}, mount: () => () => {} };
		const calendar = createTaskCalendar(tasks, views);
		await tasks.execute({
			kind: 'create',
			commandId: 'calendar',
			draft: base({ due: { date: '2026-09-30' }, reminderAt: at('2026-09-25', '09:00') }),
		});
		expect(calendar.snapshot().byDay.has('2026-09-25')).toBe(true);
		expect(calendar.snapshot().byDay.has('2026-09-30')).toBe(true);
		setNow(at('2026-10-02'));
		expect(calendar.snapshot().byDay.has('2026-10-02')).toBe(true);
		expect(calendar.snapshot().tasks[0]?.due).toBe('2026-09-30');
		expect(calendar.snapshot()).toBe(calendar.snapshot());
		calendar.dispose();
	});
});

describe('future occurrence operations and bounded recovery', () => {
	it('materializes a preview once, validates series revision and preserves nearer recovery', async () => {
		const { tasks, disk, setNow } = await fixture(at('2026-09-20', '10:00'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'series-preview',
			draft: base({
				due: { date: '2026-09-20', time: '09:00' },
				recurrence: { expression: '0 9 * * *', start: at('2026-09-20', '09:00') },
			}),
		});
		const projected = tasks.preview('2026-09-25', '2026-09-25')[0]!;
		expect(projected).toMatchObject({ virtual: true, createdAt: 0, seriesRevision: 1 });
		const command = {
			kind: 'materialize' as const,
			commandId: 'pin-preview',
			id: projected.seriesId!,
			expectedRevision: 1,
			at: projected.occurrenceAt!,
		};
		const first = await tasks.execute(command);
		expect(first.ok).toBe(true);
		expect(tasks.get(projected.id)?.createdAt).toBe(at('2026-09-20', '10:00'));
		expect(await tasks.execute(command)).toMatchObject({ ok: true, replayed: true });
		expect(
			await tasks.execute({ ...command, commandId: 'bad-preview', at: projected.occurrenceAt! + 10 }),
		).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
		const before = disk.raw;
		expect(await tasks.execute({ ...command, commandId: 'old-template', expectedRevision: 2 })).toMatchObject({
			ok: false,
			error: { code: 'conflict' },
		});
		expect(disk.raw).toBe(before);
		setNow(at('2026-09-22', '10:00'));
		await tasks.reconcile();
		const dates = tasks.query({ filter: 'all' }).items.map((item) => item.due?.date);
		expect(dates).toEqual(expect.arrayContaining(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-25']));
	});
	it('calendar completing a future preview commits the exact occurrence, not the series', async () => {
		const { tasks } = await fixture(at('2026-09-20', '10:00'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'calendar-preview',
			draft: base({
				due: { date: '2026-09-20', time: '09:00' },
				recurrence: { expression: '0 9 * * *', start: at('2026-09-20', '09:00') },
			}),
		});
		const calendar = createTaskCalendar(tasks, {
			edit: async () => {},
			open: async () => {},
			mount: () => () => {},
		});
		const preview = calendar.snapshot({ from: '2026-09-25', to: '2026-09-25' }).tasks.find((item) => item.virtual)!;
		expect(await calendar.toggleTask(preview, true)).toEqual({ status: 'updated' });
		expect(tasks.get(preview.id!)?.status).toBe('completed');
		expect(tasks.get('task:calendar-preview')?.status).toBe('open');
		calendar.dispose();
	});
	it('a long reminder lead does not hide subsequent occurrences behind the nearest future task', async () => {
		const { tasks } = await fixture(at('2026-09-20', '10:00'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'lead',
			draft: base({
				due: { date: '2026-09-21', time: '09:00' },
				reminderAt: at('2026-09-18', '09:00'),
				recurrence: { expression: '0 9 * * *', start: at('2026-09-21', '09:00') },
			}),
		});
		await tasks.reconcile();
		expect(tasks.query({ filter: 'all' }).items.map((task) => task.due?.date)).toEqual([
			'2026-09-21',
			'2026-09-22',
			'2026-09-23',
		]);
	});
	it('a recovery pass is bounded and resumes from its durable cursor', async () => {
		const { tasks, setNow } = await fixture(at('2026-01-01'), daily);
		await tasks.execute({
			kind: 'create',
			commandId: 'bounded',
			draft: base({
				due: { date: '2026-01-01' },
				recurrence: { expression: '0 0 * * *', start: at('2026-01-01') },
			}),
		});
		setNow(at('2027-01-01'));
		await tasks.reconcile();
		expect(tasks.query({ filter: 'all' }).total).toBe(201);
		expect(tasks.snapshot().catchupPending).toBe(true);
		await tasks.reconcile();
		expect(tasks.query({ filter: 'all' }).total).toBe(367);
		expect(tasks.snapshot().catchupPending).toBe(false);
	});
	it('rejects malformed repository dictionaries and invalid preview intervals without writing', async () => {
		for (const value of [2, 'wrong', [], null])
			expect(() => decodeTaskState(JSON.stringify({ ...emptyTaskState(), tasks: value }))).toThrow(TaskError);
		expect(() => decodeTaskState(JSON.stringify({ ...emptyTaskState(), events: [{}] }))).toThrow(TaskError);
		const { tasks, disk } = await fixture();
		expect(() => tasks.preview('not-a-date', '2026-09-20')).toThrow(TaskError);
		expect(disk.raw).toBeNull();
	});
	it('series replacement is atomic: a rejected replacement cannot cancel existing tasks', async () => {
		const { tasks, disk } = await fixture(at('2026-09-20'), daily);
		const created = await tasks.execute({
			kind: 'create',
			commandId: 'atomic-series',
			draft: base({
				due: { date: '2026-09-20' },
				recurrence: { expression: '0 0 * * *', start: at('2026-09-20') },
			}),
		});
		if (!created.ok) throw Error('create failed');
		const before = disk.raw;
		const result = await tasks.execute({
			kind: 'update-series',
			commandId: 'bad-series-replacement',
			id: created.receipt.seriesId!,
			expectedRevision: 1,
			from: at('2026-09-20'),
			draft: base({ title: '' }),
		});
		expect(result.ok).toBe(false);
		expect(disk.raw).toBe(before);
		expect(tasks.get('task:atomic-series')?.status).toBe('open');
	});
});
