import { expect, test, vi } from 'vitest';
import { openCalendarSource } from './action-host';
import type { TaskViews } from '../../task/api';
const delivery = {
	effectKey: 'stable',
	date: '2026-09-30',
	timezone: 'UTC',
	receipt: { commandId: 'create', taskId: 'task:created', taskRevision: 1, committedAt: 1 },
};
const views = (): TaskViews => ({ edit: async () => {}, mount: () => () => {}, open: vi.fn(async () => {}) });
test('task delivery opens a stable task ID, independent of board and note paths', async () => {
	const ui = views();
	await openCalendarSource(ui, delivery);
	expect(ui.open).toHaveBeenCalledWith('task:created', undefined);
});
test('disabled task domain or absent receipt is explicit, never opens arbitrary files', async () => {
	await expect(openCalendarSource(undefined, delivery)).rejects.toMatchObject({ code: 'calendarUnavailable' });
	await expect(openCalendarSource(views(), { ...delivery, receipt: undefined })).rejects.toMatchObject({
		code: 'calendarSourceChanged',
	});
});
test('closed windows reject navigation', async () => {
	const ui = views();
	await expect(openCalendarSource(ui, delivery, { closed: true } as Window)).rejects.toMatchObject({
		code: 'cancelled',
	});
	expect(ui.open).not.toHaveBeenCalled();
});
