import { describe, expect, test } from 'vitest';
import { taskDraftError } from '../../../../shared/automation/task';
import { nextOccurrence, validateSchedule } from '../../../automations/core/schedule';
import { resolveWallTime } from '../../../automations/core/schedule/zoned-occurrences';
import { nearestSeriesTasks, projectRecurrences } from './recurrence';
import { taskReminder } from './task-reminders';
import type { CalendarTask } from './types';
const engine = { next: nextOccurrence, validate: validateSchedule, wallTime: resolveWallTime };
const seed: CalendarTask = {
	id: 'seed',
	path: 'Tasks.md',
	line: 0,
	originalLine: '- [ ] Review',
	text: 'Review',
	checked: false,
	due: '2026-10-21',
	time: '10:00',
	reminder: '2026-10-21 09:30',
	mtime: 0,
	ctime: 0,
	recurrence: { start: Date.parse('2026-10-21T10:00:00Z'), expression: '0 10 * * *', timezone: 'UTC' },
};
test('date and time stay optional, but reminders never exceed the task deadline', () => {
	expect(taskDraftError({ text: 'Unscheduled' })).toBeUndefined();
	expect(taskDraftError({ text: 'Review', time: '12:00' })).toBe('time');
	expect(taskDraftError({ text: 'Review', date: '2026-10-21', reminder: '2026-10-21 23:59' })).toBeUndefined();
	expect(taskDraftError({ text: 'Review', date: '2026-10-21', time: '12:00', reminder: '2026-10-21 12:01' })).toBe(
		'reminder',
	);
	expect(taskDraftError({ text: 'Review', date: '2026-10-21', reminder: '2026-10-22 00:00' })).toBe('reminder');
	expect(taskDraftError({ text: 'Review', date: '2026-02-31' })).toBe('date');
});
test('calendar projections are stable and completed or removed occurrences do not regenerate', () => {
	const upcoming = projectRecurrences([seed], engine, '2026-10-21', '2026-10-24');
	expect(upcoming.map((task) => [task.due, task.time, task.reminder])).toEqual(
		['22', '23', '24'].map((day) => [`2026-10-${day}`, '10:00', `2026-10-${day} 09:30`]),
	);
	expect(upcoming.every((task) => task.virtual && task.seriesId === 'seed')).toBe(true);
	expect(projectRecurrences([seed], engine, '2026-10-21', '2026-10-24').map((task) => task.id)).toEqual(
		upcoming.map((task) => task.id),
	);
	expect(
		projectRecurrences(
			[seed, { ...upcoming[0]!, checked: true }, { ...upcoming[1]!, cancelled: true }],
			engine,
			'2026-10-21',
			'2026-10-24',
		),
	).toHaveLength(1);
	expect(nearestSeriesTasks([seed, ...upcoming], '2026-10-23').map((task) => task.due)).toEqual([
		'2026-10-21',
		'2026-10-22',
		'2026-10-23',
	]);
});
test('editing the first instance does not rewrite the recurring template', () => {
	const changed = {
		...seed,
		text: 'Just this occurrence',
		due: '2026-10-25',
		seriesTemplate: { text: seed.text, date: seed.due, time: seed.time, reminder: seed.reminder },
	};
	expect(projectRecurrences([changed], engine, '2026-10-21', '2026-10-22')[0]).toMatchObject({
		text: 'Review',
		due: '2026-10-22',
		reminder: '2026-10-22 09:30',
	});
});
describe('cadence boundaries', () => {
	test('the 31st skips months without that day and obeys end date', () => {
		const monthly = {
			...seed,
			due: '2026-01-31',
			reminder: undefined,
			recurrence: {
				...seed.recurrence!,
				start: Date.parse('2026-01-31T10:00:00Z'),
				expression: '0 10 31 * *',
				end: '2026-04-30',
			},
		};
		expect(projectRecurrences([monthly], engine, '2026-01-31', '2026-12-31').map((task) => task.due)).toEqual([
			'2026-03-31',
		]);
	});
	test('the saved timezone retains wall-clock task and reminder time across DST', () => {
		const zoned = {
			...seed,
			due: '2026-03-07',
			reminder: '2026-03-07 09:30',
			recurrence: {
				...seed.recurrence!,
				timezone: 'America/New_York',
				start: Date.parse('2026-03-07T15:00:00Z'),
			},
		};
		expect(
			projectRecurrences([zoned], engine, '2026-03-07', '2026-03-09').map((task) => [task.time, task.reminder]),
		).toEqual([
			['10:00', '2026-03-08 09:30'],
			['10:00', '2026-03-09 09:30'],
		]);
	});
});
test('completed, deleted, virtual and expired tasks cannot send notifications', () => {
	const task = { ...seed, recurrence: undefined, timezone: 'UTC' };
	const now = Date.parse('2026-10-21T09:30:00Z');
	expect(taskReminder(task, 'device', engine, now)?.schedule).toEqual({ kind: 'once', at: now });
	for (const state of [{ checked: true }, { cancelled: true }, { virtual: true }, { reminder: '2026-10-22 08:00' }])
		expect(taskReminder({ ...task, ...state }, 'device', engine, now)).toBeUndefined();
	expect(taskReminder(task, 'device', engine, Date.parse('2026-10-21T10:01:00Z'))).toBeUndefined();
});

test('invalid edited recurrence metadata cannot break other calendar tasks or send a reminder', () => {
	const invalid = {
		...seed,
		recurrence: { ...seed.recurrence!, timezone: 'invalid/timezone' },
		timezone: 'invalid/timezone',
	};
	expect(projectRecurrences([invalid], engine, '2026-10-21', '2026-10-24')).toEqual([]);
	expect(taskReminder(invalid, 'device', engine)).toBeUndefined();
	expect(nearestSeriesTasks([invalid], '2026-10-23', Date.parse('2026-10-23T12:00:00Z'))).toHaveLength(1);
});

test('copied series ids are scoped to their own files', () => {
	const occurrence = projectRecurrences([seed], engine, '2026-10-21', '2026-10-22')[0]!;
	const copy = { ...seed, path: 'Copy.md' };
	const result = projectRecurrences([seed, occurrence, copy], engine, '2026-10-21', '2026-10-22');
	expect(result).toHaveLength(1);
	expect(result[0]!.path).toBe('Copy.md');
});
