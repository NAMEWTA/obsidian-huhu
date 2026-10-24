import { strict as assert } from 'node:assert';
import { memoryVault } from './fixtures/memory-vault';
import { createCalendarService } from '../src/modules/home/services/calendar-service';
import type { CalendarCreateResult } from '../src/modules/home/api';
import type { NavigatorPeriodic } from '../src/modules/navigator/api';
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardSettings } from '../src/modules/home/core/board/types';

function receipt(result: CalendarCreateResult) { if ('code' in result) throw new Error(result.code); return result.receipt; }
async function main(): Promise<void> {
	const date = '2026-10-18', path = 'Notes/Journal/日记/2026/10/2026-10-18.md';
	const vault = memoryVault({ 'Today.md': '# Leave today alone', 'Tasks.md': '---\ntags: tasks\n---\nExisting\n' });
	let settings: DashboardSettings = { ...DEFAULT_DASHBOARD_SETTINGS, calendarTaskTarget: { kind: 'file' as const, path: 'Tasks' } };
	const journal: NavigatorPeriodic = {
		root: () => 'Notes/Journal', template: () => undefined, weekStart: () => 1, display: () => ({ weeks: 6, weekNumbers: true, images: false }),
		inspect: (period) => ({ period, date, path, title: date, status: vault.contents.has(path) ? 'existing' : 'missing', active: false }),
		subscribe: () => () => {}, active: () => undefined,
		preview: async (period, day) => journal.inspect(period, day),
		prepare: async () => ({ status: 'ready', path, content: '# Template\n' }),
		ensure: async () => undefined, open: async () => false,
	};
	const service = createCalendarService({ app: vault.app, settings: () => settings, journal: () => journal });
	try {
		const first = receipt(await service.createTask({ date, text: 'Pinned task', effectKey: 'pinned:1' }));
		assert.equal(first.path, 'Tasks.md'); assert.equal(first.line, 3);
		const [one, two] = await Promise.all([service.createTask({ date, text: 'Concurrent A' }), service.createTask({ date, text: 'Concurrent B' })]);
		assert.equal(receipt(one).path, 'Tasks.md'); assert.equal(receipt(two).path, 'Tasks.md');
		assert.ok(vault.contents.get('Tasks.md')!.includes('Concurrent A')); assert.ok(vault.contents.get('Tasks.md')!.includes('Concurrent B'));
		assert.equal((await service.createTask({ date, text: 'Pinned task', effectKey: 'pinned:1' })).status, 'already-exists');
		settings = { ...settings, calendarTaskTarget: undefined };
		const daily = receipt(await service.createTask({ date, text: 'Selected day', time: '14:30' }));
		assert.equal(daily.path, path); assert.ok(vault.contents.get(path)!.includes('# Template'));
		assert.ok(daily.originalLine.includes('[due:: 2026-10-18 14:30]')); assert.ok(!daily.originalLine.includes('⏰'));
		assert.equal(vault.contents.get('Today.md'), '# Leave today alone');
		const snapshot = await service.refresh({ filter: 'all' }); assert.equal(snapshot.byDay.get(date)?.length, 4);
		assert.equal((await service.createTask({ date, text: 'First\n- [ ] Injected' })).status, 'failed');
		console.log('verify-calendar-task-insert: atomic writer, selected date, metadata retry and shared query OK');
	} finally { service.dispose(); }
}
void main();
