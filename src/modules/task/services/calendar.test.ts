import { expect, test } from 'vitest';
import { createTaskCalendar } from './calendar';
import { createTaskService } from './service';
import { createTaskRepository } from '../platform/repository';

async function fixture() {
	let raw: string | null = null,
		writes = 0;
	const repository = createTaskRepository({
		read: async () => raw,
		async process(change) {
			const next = change(raw);
			if (raw !== next) {
				raw = next;
				writes++;
			}
			return raw;
		},
	});
	const tasks = createTaskService({
		repository,
		deviceId: 'calendar-strict-test',
		now: () => Date.UTC(2026, 0, 1),
		remindersAvailable: () => true,
	});
	await tasks.load();
	const calendar = createTaskCalendar(tasks, { edit: async () => undefined, open: async () => {}, mount: () => () => {} });
	return { tasks, calendar, writes: () => writes };
}

test.each([
	['2026-03-08', '02:30', 'nonexistent-time'],
	['2026-11-01', '01:30', 'ambiguous-time'],
])('strict calendar creation rejects %s %s before any domain write', async (date, time, reason) => {
	const previous = process.env.TZ;
	process.env.TZ = 'America/New_York';
	try {
		const { tasks, calendar, writes } = await fixture();
		const before = writes();
		for (const fields of [
			{ date, time },
			{ date, reminder: `${date} ${time}` },
		]) {
			const result = await calendar.createTask({ text: 'Do not create', strictTime: true, ...fields });
			expect(result).toMatchObject({ status: 'failed', code: 'invalid-input', timeReason: reason });
			expect(writes()).toBe(before);
			expect(tasks.query({ filter: 'all' }).items).toHaveLength(0);
		}
		calendar.dispose();
		tasks.dispose();
	} finally {
		if (previous === undefined) delete process.env.TZ;
		else process.env.TZ = previous;
	}
});

test.each([
	['UTC', '2026-06-01T12:00:00.000Z'],
	['Asia/Shanghai', '2026-06-01T04:00:00.000Z'],
])('strict calendar creation preserves real %s instants and date-only precision', async (zone, instant) => {
	const previous = process.env.TZ;
	process.env.TZ = zone;
	try {
		const { tasks, calendar } = await fixture();
		const result = await calendar.createTask({
			text: 'Valid',
			date: '2026-06-01',
			time: '12:30',
			reminder: '2026-06-01 12:00',
			strictTime: true,
		});
		expect(result.status).toBe('created');
		const task = tasks.query({ filter: 'all' }).items[0]!;
		expect(task.timezone).toBe(zone);
		expect(task.due).toEqual({ date: '2026-06-01', time: '12:30' });
		expect(new Date(task.reminderAt!).toISOString()).toBe(instant);
		expect((await calendar.createTask({ text: 'Day only', date: '2026-06-02', strictTime: true })).status).toBe(
			'created',
		);
		expect(tasks.query({ filter: 'all' }).items.find((item) => item.title === 'Day only')?.due).toEqual({
			date: '2026-06-02',
		});
		calendar.dispose();
		tasks.dispose();
	} finally {
		if (previous === undefined) delete process.env.TZ;
		else process.env.TZ = previous;
	}
});

test('existing internal calendar callers retain the earlier-fold default', async () => {
	const previous = process.env.TZ;
	process.env.TZ = 'America/New_York';
	try {
		const { tasks, calendar } = await fixture();
		expect(
			(await calendar.createTask({ text: 'Default', date: '2026-11-01', reminder: '2026-11-01 01:30' })).status,
		).toBe('created');
		expect(new Date(tasks.query({ filter: 'all' }).items[0]!.reminderAt!).toISOString()).toBe(
			'2026-11-01T05:30:00.000Z',
		);
		calendar.dispose();
		tasks.dispose();
	} finally {
		if (previous === undefined) delete process.env.TZ;
		else process.env.TZ = previous;
	}
});
