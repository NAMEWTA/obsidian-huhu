import { afterEach, expect, test, vi } from 'vitest';
import { TFile } from 'obsidian';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import type { NavigatorPeriodic } from '../../navigator/api';
import type { DashboardSettings } from '../core/board/types';
import { createCalendarService, type OwnedCalendarService } from './calendar-service';
import { readTaskMeta, taskMetaSuffix } from '../../../shared/automation/metadata';
import { scanFileTasks } from '../platform/calendar/alltasks-scan';
import { openNoteAt } from '../../../host/obsidian/open-note';

vi.mock('../../../host/obsidian/open-note', () => ({ openNoteAt: vi.fn(async () => {}) }));

const services: OwnedCalendarService[] = [];
afterEach(() => {
	services.splice(0).forEach((service) => service.dispose());
});
function scene(
	initial: Record<string, string> = {},
	target: DashboardSettings['calendarTaskTarget'] | null = { kind: 'file', path: 'Tasks.md' },
) {
	const vault = memoryVault(initial);
	const settings: Pick<
		DashboardSettings,
		| 'dashboardFile'
		| 'calendarExcludeFolders'
		| 'calendarTaskFilter'
		| 'calendarTaskTarget'
		| 'calendarTaskInsertPosition'
	> = {
		dashboardFile: '.huhu/dashboards/Board',
		calendarExcludeFolders: [],
		calendarTaskFilter: 'all',
		calendarTaskTarget: target ?? undefined,
		calendarTaskInsertPosition: 'start',
	};
	let journal: NavigatorPeriodic | undefined;
	const calendar = createCalendarService({
		app: vault.app,
		settings: () => settings,
		journal: () => journal,
		writeFilter: async (filter) => {
			settings.calendarTaskFilter = filter;
		},
	});
	services.push(calendar);
	const setJournal = (overrides: Partial<NavigatorPeriodic> = {}) => {
		const path = 'Journal/2026-10-23.md';
		journal = {
			root: () => 'Journal',
			template: () => 'Template.md',
			weekStart: () => 0,
			display: () => ({ weeks: 3, weekNumbers: true, images: true }),
			inspect: (period) => ({
				period,
				date: '2026-10-23',
				path,
				title: 'Journal',
				status: vault.contents.has(path) ? 'existing' : 'missing',
				active: false,
			}),
			subscribe: () => () => {},
			preview: async (period, date) => journal!.inspect(period, date),
			prepare: vi.fn(async () => ({
				status: 'ready' as const,
				path,
				content: '---\ntitle: Journal\n---\n# Selected day\n',
			})),
			open: async () => true,
			active: () => undefined,
			ensure: async () => undefined,
			...overrides,
		};
		return journal;
	};
	return {
		...vault,
		settings,
		calendar,
		setJournal,
		removeJournal: () => {
			journal = undefined;
		},
	};
}
const input = { date: '2026-10-23', text: 'Review' };

test.each([
	'Review [due:: 2026-10-24]',
	'Review [DUE:: 2026-10-24 09:00 ]',
	'Review [start:: 2026-10-24 08:00]',
	'Review [end:: 2026-10-25 17:00]',
	'Review [scheduled:: 2026-10-24]',
	'Review [COMPLETION:: 2026-10-24 15:00]',
	'Review 📅2026-10-24',
	'Review 🛫 2026-10-24',
	'Review 🛬2026-10-25',
	'Review ⏳2026-10-24',
	'Review ✅ 2026-10-24',
	'Review ⏰ 2026-10-24',
	'Review ⏰2026-10-24 09:00',
	'Review ⏰ 2026-10-24 09:00 <!--collapsed-->',
	'Review [due:: 2026-02-31]',
])('date-protocol task text is rejected without touching files: %s', async (text) => {
	const f = scene({ 'Existing.md': '# Keep me\n' });
	// This is a field the actual source scanner interprets, not a keyword or generic date-text ban.
	const parsed = scanFileTasks(f.file('Existing.md'), `- [ ] ${text}`)[0]!;
	expect(
		[parsed.due, parsed.start, parsed.end, parsed.scheduled, parsed.completion, parsed.reminder].some(Boolean),
	).toBe(true);
	const frozen = await f.calendar.resolveTarget(input);
	if (frozen.status !== 'ready') throw new Error('Expected valid target');
	const before = [...f.contents];
	expect(await f.calendar.resolveTarget({ ...input, text })).toMatchObject({
		status: 'failed',
		code: 'invalid-input',
	});
	expect(await f.calendar.createTask({ ...input, text })).toMatchObject({ status: 'failed', code: 'invalid-input' });
	expect(await f.calendar.createTask({ ...input, text, target: frozen.target })).toMatchObject({
		status: 'failed',
		code: 'invalid-input',
	});
	expect([...f.contents]).toEqual(before);
	expect(f.writes).toBe(0);
});

test.each([
	'Review 2026-10-24 at 09:00; due tomorrow',
	'Update due / scheduled / completion wording',
	'Explain [due:: tomorrow] and [scheduled:: later]',
	'📅 calendar; 🛫 travel; 🛬 land; ⏳ wait; ✅ review; ⏰ alarm',
	'Discuss ⏰ 2026-10-24 reminder syntax',
	'Read **notes** and [reference](Notes/2026-10-24.md)',
])('ordinary title text is preserved with the explicit task date and times: %s', async (text) => {
	const f = scene();
	expect(await f.calendar.createTask({ ...input, text, time: '14:30', reminder: '2026-10-23 13:45' })).toMatchObject({
		status: 'created',
	});
	const task = (await f.calendar.refresh()).tasks[0]!;
	expect(task).toMatchObject({ text, due: input.date, time: '14:30', reminder: '2026-10-23 13:45' });
	expect(f.contents.get(task.path)).toContain(`- [ ] ${text} [due:: 2026-10-23 14:30]`);
});

test('a serialized daily target freezes both explicit no-template and the resolved template path', async () => {
	for (const original of [undefined, 'Templates/Original.md']) {
		const f = scene({}, null);
		f.setJournal({ template: () => original });
		const request = { ...input, effectKey: `frozen-template:${original ?? 'none'}` };
		const resolved = await f.calendar.resolveTarget(request);
		if (resolved.status !== 'ready') throw new Error('Expected target');
		const prepare = vi.fn<NavigatorPeriodic['prepare']>(async (_period, _date, options) => ({
			status: 'ready',
			path: options!.path!,
			content: '',
		}));
		f.setJournal({ template: () => 'Changed.md', prepare });
		expect(
			await f.calendar.createTask({ ...request, target: JSON.parse(JSON.stringify(resolved.target)) }),
		).toMatchObject({ status: 'created' });
		expect(prepare).toHaveBeenCalledWith(
			'day',
			expect.any(Date),
			expect.objectContaining({ resolvedTemplate: original ?? null }),
		);
	}
});

test('a task-file target freezes an extensionless template reference to its actual source before settings change', async () => {
	const f = scene(
		{ 'Templates/Original.md': '# Original', 'Changed.md': '# Changed' },
		{ kind: 'task', path: 'Tasks', template: 'Templates/Original' },
	);
	const request = { ...input, effectKey: 'frozen-task-template' };
	const resolved = await f.calendar.resolveTarget(request);
	if (resolved.status !== 'ready') throw new Error('Expected target');
	expect(resolved.target.template).toBe('Templates/Original.md');
	f.settings.calendarTaskTarget = { kind: 'task', path: 'Other', template: 'Changed.md' };
	const result = await f.calendar.createTask({ ...request, target: JSON.parse(JSON.stringify(resolved.target)) });
	expect(result.status).toBe('created');
	expect(f.contents.get(resolved.target.path)).toContain('# Original');
});

test('concurrent manual and repeated automation writes are atomic below frontmatter and index only one effect', async () => {
	const f = scene({ 'Tasks.md': '---\ntags: [work]\n---\nBody\n' });
	const scheduled = { ...input, effectKey: 'weekly:1', runId: 'run' };
	const a = await f.calendar.resolveTarget(scheduled),
		b = await f.calendar.resolveTarget(scheduled);
	expect(a.status).toBe('ready');
	expect(b).toEqual(a);
	if (a.status !== 'ready') throw new Error(a.code);
	const result = await Promise.all([
		f.calendar.createTask({ ...scheduled, target: a.target }),
		f.calendar.createTask({ ...scheduled, target: a.target }),
		f.calendar.createTask({ ...input, text: 'Manual' }),
	]);
	expect(result.every((value) => 'receipt' in value)).toBe(true);
	const tasks = (await f.calendar.refresh()).tasks;
	expect(tasks).toHaveLength(2);
	expect(tasks.map((task) => task.text).sort()).toEqual(['Manual', 'Review']);
	expect(f.contents.get('Tasks.md')).toMatch(/^---\ntags: \[work\]\n---\n- \[ \] /);
	const raw = f.contents
		.get('Tasks.md')!
		.split('\n')
		.find((line) => line.includes('Review'))!;
	expect(readTaskMeta(raw)).toMatchObject({ effectKey: 'weekly:1', runId: 'run' });
	expect((await f.calendar.createTask({ ...scheduled, target: a.target })).status).toBe('already-exists');
});

test.each(['file', 'folder', 'task'] as const)(
	'%s destination works with navigator off and does not require an open board',
	async (kind) => {
		const f = scene({}, { kind, path: kind === 'file' ? 'Inbox.md' : 'Inbox' });
		const request = { ...input, effectKey: 'one-occurrence' };
		const target = await f.calendar.resolveTarget(request);
		if (target.status !== 'ready') throw new Error(target.code);
		const result = await f.calendar.createTask({ ...request, target: target.target });
		expect(result.status).toBe('created');
		expect((await f.calendar.createTask({ ...request, target: target.target })).status).toBe('already-exists');
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
		expect(f.contents.size).toBe(1);
		if (kind === 'folder') expect(target.target.path).toBe('Inbox/2026-10-23.md');
	},
);

test('scope source exclusions and task display filters have different effects', async () => {
	const f = scene({
		'Board.md': `- [X] Complete [due:: 2026-10-22]${taskMetaSuffix({ id: 'complete' })}\n`,
		'Tasks.md': '- [ ] Existing [due:: 2026-10-23]\n',
	});
	expect((await f.calendar.createTask(input)).status).toBe('created');
	f.settings.calendarTaskTarget = { kind: 'file', path: 'Excluded/Tasks.md' };
	f.settings.calendarExcludeFolders = ['Excluded'];
	expect(await f.calendar.resolveTarget(input)).toMatchObject({ status: 'unavailable', code: 'source-excluded' });
	f.settings.calendarTaskTarget = { kind: 'file', path: 'Board.md' };
	await f.calendar.setFilter('open');
	const snapshot = await f.calendar.refresh();
	expect(snapshot.byDay.get('2026-10-22')).toBeUndefined();
	expect(f.calendar.snapshot({ filter: 'all' }).byDay.get('2026-10-22')).toHaveLength(1);
	expect(f.calendar.snapshot({ filter: 'all' }).byDay.get('2026-10-24')).toBeUndefined();
	expect(f.calendar.defaultScope()).toEqual({ boardPath: '.huhu/dashboards/Board', filter: 'open' });
});

test('task time and reminder keep their separate dates, labels and index entries', async () => {
	const f = scene();
	expect((await f.calendar.createTask({ ...input, time: '10:30', reminder: '2026-10-22 18:15' })).status).toBe(
		'created',
	);
	const state = await f.calendar.refresh(),
		task = state.tasks[0]!;
	expect(task).toMatchObject({ due: '2026-10-23', time: '10:30', reminder: '2026-10-22 18:15' });
	expect(f.calendar.dayTime(task, '2026-10-23')).toBe('10:30');
	expect(f.calendar.dayTime(task, '2026-10-22')).toBe('18:15');
	expect([...state.byDay.keys()].sort()).toEqual(['2026-10-23']);
	await f.calendar.createTask({ ...input, text: 'No implicit reminder', time: '11:00' });
	expect(
		(await f.calendar.refresh()).tasks.find((task) => task.text === 'No implicit reminder')?.reminder,
	).toBeUndefined();
});

test('default notes are prepared once per missing note and disabled periodic capabilities do not silently append', async () => {
	const f = scene({}, null);
	expect(await f.calendar.createTask(input)).toMatchObject({ code: 'periodic-unavailable' });
	const journal = f.setJournal();
	const scheduled = { ...input, effectKey: 'journal' };
	const target = await f.calendar.resolveTarget(scheduled);
	if (target.status !== 'ready') throw new Error(target.code);
	expect((await f.calendar.createTask({ ...scheduled, target: target.target })).status).toBe('created');
	expect(journal.prepare).toHaveBeenCalledWith(
		'day',
		new Date(2026, 9, 23),
		expect.objectContaining({ interactive: false, path: 'Journal/2026-10-23.md' }),
	);
	f.removeJournal();
	expect(await f.calendar.createTask({ ...scheduled, target: target.target })).toMatchObject({
		status: 'already-exists',
	});
	const manualTarget = { ...target.target, id: 'new', effectKey: undefined };
	expect(await f.calendar.createTask({ ...input, target: manualTarget })).toMatchObject({
		code: 'periodic-unavailable',
	});
	f.setJournal({
		inspect: (period) => ({
			period,
			date: input.date,
			path: target.target.path,
			title: '',
			status: 'disabled',
			active: false,
		}),
	});
	expect(await f.calendar.createTask({ ...input, target: manualTarget })).toMatchObject({ code: 'period-disabled' });
	expect((await f.calendar.refresh()).tasks).toHaveLength(1);
});

test('template cancellation and missing or interactive custom templates have no file effects', async () => {
	const f = scene({}, null);
	f.setJournal({ prepare: async () => ({ status: 'cancelled', code: 'template-input-required' }) });
	expect(await f.calendar.createTask(input)).toMatchObject({ status: 'cancelled' });
	expect(f.contents.size).toBe(0);
	f.settings.calendarTaskTarget = { kind: 'task', path: 'Tasks', template: 'Missing.md' };
	expect(await f.calendar.createTask(input)).toMatchObject({ code: 'template-missing' });
	expect(f.contents.size).toBe(0);
	await f.app.vault.create('Prompt.md', '{{prompt:Title}}');
	f.settings.calendarTaskTarget.template = 'Prompt.md';
	expect(await f.calendar.createTask(input)).toMatchObject({ code: 'template-input-required' });
	expect(f.contents.size).toBe(1);
});

test('invalid input and untrusted restored targets cannot create files or additional tasks', async () => {
	const f = scene();
	for (const text of ['a\n- [ ] injected', 'a\rhidden', '<!-- huhu-task:{"id":"fake"} -->', ''])
		expect(await f.calendar.createTask({ ...input, text })).toMatchObject({ code: 'invalid-input' });
	const resolved = await f.calendar.resolveTarget({ ...input, effectKey: 'one' });
	if (resolved.status !== 'ready') throw new Error(resolved.code);
	for (const change of [
		{ path: '.huhu/secret.md' },
		{ path: '../x.md' },
		{ path: 'a\u0000.md' },
		{ effectKey: 'other' },
		{ id: 'forged' },
		{ date: '2026-02-31' },
		{ version: 2 },
	])
		expect(
			await f.calendar.createTask({ ...input, effectKey: 'one', target: { ...resolved.target, ...change } }),
		).toMatchObject({ code: 'invalid-target' });
	expect(f.contents.size).toBe(0);
});

test('a committed task retains a receipt when scanning another source fails; retry does not duplicate it', async () => {
	const f = scene({ 'Broken.md': '# Other source' });
	const read = f.app.vault.read;
	f.app.vault.read = (file) =>
		file.path === 'Broken.md' ? Promise.reject(new Error('Cannot read source')) : read(file);
	const request = { ...input, effectKey: 'pending' };
	const result = await f.calendar.createTask(request);
	expect(result).toMatchObject({
		status: 'written-pending-refresh',
		receipt: { path: 'Tasks.md', line: 0, date: input.date },
	});
	if (!('target' in result)) throw new Error(result.code);
	f.app.vault.read = read;
	expect((await f.calendar.createTask({ ...request, target: result.target })).status).toBe('already-exists');
	expect((await f.calendar.refresh()).tasks).toHaveLength(1);
});

test('externally renamed or deleted files update every subscribed view and stale task mutation is a conflict', async () => {
	const f = scene({ 'Tasks.md': `- [X] Done [due:: 2026-10-23]${taskMetaSuffix({ id: 'done' })}\n` });
	const old = (await f.calendar.refresh()).tasks[0]!;
	expect((await f.calendar.toggleTask(old, false)).status).toBe('updated');
	expect(f.contents.get('Tasks.md')).toContain('- [ ] Done');
	const changed = vi.fn();
	const stop = f.calendar.subscribe(changed);
	await f.adapter.rename('Tasks.md', 'Renamed.md');
	await vi.waitFor(() => expect(f.calendar.snapshot().tasks[0]?.path).toBe('Renamed.md'));
	expect(changed).toHaveBeenCalled();
	expect(await f.calendar.removeTask(old)).toMatchObject({ code: 'source-missing' });
	await f.adapter.remove('Renamed.md');
	await vi.waitFor(() => expect(f.calendar.snapshot().tasks).toHaveLength(0));
	stop();
});

test.each(['* [ ]', '- [>]'])(
	'editing the visible task syntax to %s preserves the durable effect marker on retry',
	async (prefix) => {
		const f = scene();
		const request = { ...input, effectKey: 'format-edit' };
		const result = await f.calendar.createTask(request);
		if (!('target' in result)) throw new Error(result.code);
		await f.adapter.write(result.target.path, f.contents.get(result.target.path)!.replace('- [ ]', prefix));
		const edited = f.contents.get(result.target.path)!;
		const retry = await f.calendar.createTask({ ...request, target: result.target });
		expect(retry.status).toMatch(/already-exists|written-pending-refresh/);
		expect(f.contents.get(result.target.path)).toBe(edited);
		expect(edited.match(/huhu-task:/g)).toHaveLength(1);
		if ('receipt' in retry) expect(retry.receipt.originalLine.startsWith(prefix)).toBe(true);
	},
);

test('an empty task template normalizes before its target snapshot is serialized and restored', async () => {
	const f = scene({}, { kind: 'task', path: 'Tasks', template: '' });
	const request = { ...input, effectKey: 'empty-template' };
	const resolved = await f.calendar.resolveTarget(request);
	if (resolved.status !== 'ready') throw new Error(resolved.code);
	expect(resolved.target.template).toBeUndefined();
	expect(
		(await f.calendar.createTask({ ...request, target: JSON.parse(JSON.stringify(resolved.target)) })).status,
	).toBe('created');
});

test.each(['file', 'folder', 'task'] as const)(
	'an explicitly chosen %s with an empty path never falls back to a daily note',
	async (kind) => {
		const f = scene({}, { kind, path: '   ' });
		f.setJournal();
		expect(await f.calendar.resolveTarget(input)).toMatchObject({ code: 'invalid-target' });
		expect(await f.calendar.createTask(input)).toMatchObject({ code: 'invalid-target' });
		expect(f.contents.size).toBe(0);
	},
);

test('top insertion preserves BOM, CRLF and YAML delimiters; malformed task templates do not create files', async () => {
	const front = '\uFEFF---\r\ntitle: Existing\r\n---\r\n';
	const f = scene({ 'Tasks.md': front + 'Body\r\n', 'Bad.md': '---\ntitle: [broken\n---\nContent' });
	expect((await f.calendar.createTask(input)).status).toBe('created');
	expect(f.contents.get('Tasks.md')).toMatch(/^\uFEFF---\r\ntitle: Existing\r\n---\r\n- \[ \] Review/);
	expect(f.contents.get('Tasks.md')!.endsWith('Body\r\n')).toBe(true);
	f.settings.calendarTaskTarget = { kind: 'task', path: 'New', template: 'Bad.md' };
	expect(await f.calendar.createTask(input)).toMatchObject({ code: 'template-invalid' });
	expect(f.contents.size).toBe(2);
});

test.each(['Body\n', 'Body\r\n', ''])(
	'top insertion keeps a BOM at the start without frontmatter: %j',
	async (body) => {
		const f = scene({ 'Tasks.md': `\uFEFF${body}` });
		expect((await f.calendar.createTask(input)).status).toBe('created');
		const raw = f.contents.get('Tasks.md')!;
		expect(raw).toMatch(/^\uFEFF- \[ \] Review/);
		expect(raw.indexOf('\uFEFF', 1)).toBe(-1);
		expect(raw.endsWith(body)).toBe(true);
		if (body.includes('\r\n')) expect(raw.replaceAll('\r\n', '')).not.toContain('\n');
		expect((await f.calendar.refresh()).tasks).toHaveLength(1);
	},
);

test('a reminder on the same date does not move the task into the reminder time slot', async () => {
	const f = scene();
	await f.calendar.createTask({ ...input, time: '14:30', reminder: input.date + ' 13:45' });
	const task = (await f.calendar.refresh()).tasks[0]!;
	expect(task.reminder).toBe('2026-10-23 13:45');
	expect(f.calendar.dayTime(task, input.date)).toBe('14:30');
});

test('source navigation relocates an identified task after insertion and rejects removed or duplicated identities', async () => {
	vi.mocked(openNoteAt).mockClear();
	const f = scene();
	await f.calendar.createTask({ ...input, effectKey: 'first' });
	const task = (await f.calendar.refresh()).tasks[0]!;
	await f.calendar.createTask({ ...input, text: 'Later task' });
	const owner = {} as Window;
	await f.calendar.openSource(task, owner);
	expect(openNoteAt).toHaveBeenLastCalledWith(f.app, f.file('Tasks.md'), { owner, line: 1 });
	await f.adapter.write('Tasks.md', `${task.originalLine}\n${task.originalLine}\n`);
	await expect(f.calendar.openSource(task, owner)).rejects.toThrow('calendar.source-missing');
	await f.adapter.write('Tasks.md', '# Deleted task\n');
	await expect(f.calendar.openSource(task, owner)).rejects.toThrow('calendar.source-missing');
	expect(openNoteAt).toHaveBeenCalledTimes(1);
});

test('source navigation relocates an older task without metadata only when its original line is unique', async () => {
	vi.mocked(openNoteAt).mockClear();
	const raw = '- [ ] Older task [due:: 2026-10-23]';
	const f = scene({ 'Tasks.md': `${raw}\n` });
	const task = scanFileTasks(f.file('Tasks.md'), `${raw}\n`)[0]!;
	await f.adapter.write('Tasks.md', `New heading\n${raw}\n`);
	await f.calendar.openSource(task);
	expect(openNoteAt).toHaveBeenLastCalledWith(f.app, f.file('Tasks.md'), { owner: undefined, line: 1 });
	await f.adapter.write('Tasks.md', `New heading\n${raw}\n${raw}\n`);
	await expect(f.calendar.openSource(task)).rejects.toThrow('calendar.source-missing');
	expect(openNoteAt).toHaveBeenCalledTimes(1);
});

test('source navigation rereads when another task is inserted during the source read', async () => {
	vi.mocked(openNoteAt).mockClear();
	const f = scene();
	await f.calendar.createTask(input);
	const task = (await f.calendar.refresh()).tasks[0]!;
	const read = f.app.vault.read.bind(f.app.vault);
	let first = true;
	vi.spyOn(f.app.vault, 'read').mockImplementation(async (file) => {
		const content = await read(file);
		if (first) {
			first = false;
			await f.adapter.write(file.path, `- [ ] Concurrent task [due:: 2026-10-23]\n${content}`);
		}
		return content;
	});
	await f.calendar.openSource(task);
	expect(openNoteAt).toHaveBeenLastCalledWith(f.app, f.file('Tasks.md'), { owner: undefined, line: 1 });
});

test('source navigation does not fall back to the main window when its owner closes during the read', async () => {
	vi.mocked(openNoteAt).mockClear();
	const f = scene();
	await f.calendar.createTask(input);
	const task = (await f.calendar.refresh()).tasks[0]!;
	const state = { closed: false },
		owner = state as unknown as Window;
	const read = f.app.vault.read.bind(f.app.vault);
	vi.spyOn(f.app.vault, 'read').mockImplementation(async (file) => {
		const content = await read(file);
		state.closed = true;
		return content;
	});
	await expect(f.calendar.openSource(task, owner)).rejects.toThrow('calendar.source-missing');
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('source navigation rejects a replacement file at the same path even when its stats match', async () => {
	vi.mocked(openNoteAt).mockClear();
	const f = scene();
	await f.calendar.createTask(input);
	const task = (await f.calendar.refresh()).tasks[0]!;
	const file = f.file(task.path),
		replacement = Object.assign(new TFile(), file, { stat: { ...file.stat } });
	const read = f.app.vault.read.bind(f.app.vault),
		getFile = f.app.vault.getFileByPath.bind(f.app.vault);
	let replaced = false;
	vi.spyOn(f.app.vault, 'getFileByPath').mockImplementation((path) =>
		replaced && path === task.path ? replacement : getFile(path),
	);
	vi.spyOn(f.app.vault, 'read').mockImplementation(async (source) => {
		const content = await read(source);
		replaced = true;
		return content;
	});
	await expect(f.calendar.openSource(task)).rejects.toThrow('calendar.source-missing');
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('unscheduled tasks persist without date syntax and handwritten checkboxes are excluded', async () => {
	const f = scene({ 'Tasks.md': '- [ ] Handwritten [due:: 2026-10-23]\n' });
	expect(await f.calendar.createTask({ text: 'Unscheduled', date: '' })).toMatchObject({ status: 'created' });
	const state = await f.calendar.refresh({ filter: 'all' });
	expect(state.tasks.map((task) => task.text)).toEqual(['Unscheduled']);
	expect(state.tasks[0]?.path).toBe('huhu/待办/待办.md');
	expect(state.byDay.size).toBe(0);
	expect(f.contents.get('huhu/待办/待办.md')).not.toContain('[due::');
});

test('rescheduling edits the original line and rejects stale edits and late reminders', async () => {
	const f = scene();
	await f.calendar.createTask(input);
	const task = (await f.calendar.refresh()).tasks[0]!;
	expect(
		await f.calendar.updateTask(task, {
			text: 'Changed',
			date: '2026-10-24',
			time: '10:00',
			reminder: '2026-10-24 11:00',
		}),
	).toMatchObject({ code: 'invalid-input' });
	expect(
		await f.calendar.updateTask(task, {
			text: 'Changed',
			date: '2026-10-24',
			time: '10:00',
			reminder: '2026-10-24 09:00',
		}),
	).toMatchObject({ status: 'updated' });
	expect((await f.calendar.refresh()).tasks[0]).toMatchObject({
		path: task.path,
		id: task.id,
		text: 'Changed',
		time: '10:00',
	});
	expect(await f.calendar.updateTask(task, { text: 'Stale' })).toMatchObject({ code: 'conflict' });
});

test('undoing completion restores a future reminder but drops an expired one', async () => {
	vi.useFakeTimers({ now: new Date(2026, 9, 23, 9, 0).getTime(), toFake: ['Date'] });
	try {
		const f = scene();
		await f.calendar.createTask({
			text: 'Review',
			date: '2026-10-23',
			time: '12:00',
			reminder: '2026-10-23 10:00',
		});
		let task = (await f.calendar.refresh()).tasks[0]!;
		await f.calendar.toggleTask(task, true);
		task = (await f.calendar.refresh()).tasks[0]!;
		await f.calendar.toggleTask(task, false);
		expect((await f.calendar.refresh()).tasks[0]!.reminder).toBe('2026-10-23 10:00');
		task = (await f.calendar.refresh()).tasks[0]!;
		await f.calendar.toggleTask(task, true);
		vi.setSystemTime(new Date(2026, 9, 23, 11, 0));
		task = (await f.calendar.refresh()).tasks[0]!;
		await f.calendar.toggleTask(task, false);
		expect((await f.calendar.refresh()).tasks[0]).toMatchObject({ checked: false, time: '12:00' });
		expect((await f.calendar.refresh()).tasks[0]!.reminder).toBeUndefined();
	} finally {
		vi.useRealTimers();
	}
});

test('fixed recurrence recovers missed instances once and never grows future instances on each refresh', async () => {
	const { nextOccurrence, validateSchedule } = await import('../../automations/core/schedule');
	const { resolveWallTime } = await import('../../automations/core/schedule/zoned-occurrences');
	const f = memoryVault();
	vi.useFakeTimers({ now: Date.parse('2026-10-23T12:00:00Z'), toFake: ['Date'] });
	const settings = {
		dashboardFile: '.huhu/dashboards/Board',
		calendarExcludeFolders: [],
		calendarTaskFilter: 'all' as const,
		calendarTaskInsertPosition: 'end' as const,
		calendarTaskTarget: { kind: 'file' as const, path: 'Tasks.md' },
	};
	const calendar = createCalendarService({
		app: f.app,
		settings: () => settings,
		journal: () => undefined,
		schedule: () => ({ next: nextOccurrence, validate: validateSchedule, wallTime: resolveWallTime }),
	});
	services.push(calendar);
	try {
		await calendar.createTask({
			text: 'Daily',
			date: '2026-10-21',
			time: '10:00',
			recurrence: { start: Date.parse('2026-10-21T10:00:00Z'), expression: '0 10 * * *', timezone: 'UTC' },
		});
		await calendar.reconcile();
		const once = f.contents.get('Tasks.md');
		expect(
			scanFileTasks(f.file('Tasks.md'), once!)
				.map((task) => task.due)
				.sort(),
		).toEqual(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);
		await calendar.reconcile();
		expect(f.contents.get('Tasks.md')).toBe(once);
		const next = calendar.snapshot({ filter: 'all' }).tasks.find((task) => task.due === '2026-10-24')!;
		await calendar.removeTask(next);
		await calendar.reconcile();
		expect(calendar.snapshot({ filter: 'all' }).tasks.some((task) => task.due === '2026-10-24')).toBe(false);
		const old = calendar.snapshot({ filter: 'all' }).tasks.find((task) => task.due === '2026-10-22')!;
		await calendar.toggleTask(old, true);
		await calendar.reconcile();
		expect(calendar.snapshot({ filter: 'all' }).tasks.find((task) => task.id === old.id)?.checked).toBe(true);
		const seed = calendar.snapshot({ filter: 'all' }).tasks.find((task) => task.recurrence)!;
		expect(
			await calendar.updateTask(
				seed,
				{
					text: 'New cadence',
					date: '2026-10-21',
					time: '11:00',
					recurrence: {
						...seed.recurrence!,
						start: Date.parse('2026-10-21T11:00:00Z'),
						expression: '0 11 * * *',
					},
				},
				true,
			),
		).toMatchObject({ status: 'updated' });
		await calendar.reconcile();
		const active = calendar.snapshot({ filter: 'all' }).tasks.filter((task) => !task.checked);
		expect(active.filter((task) => task.due === '2026-10-23')).toHaveLength(1);
		expect(active.filter((task) => task.due === '2026-10-23')[0]).toMatchObject({
			text: 'New cadence',
			time: '11:00',
		});
	} finally {
		vi.useRealTimers();
	}
});
