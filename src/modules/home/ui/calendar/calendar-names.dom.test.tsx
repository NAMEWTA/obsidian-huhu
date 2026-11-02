import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { CalendarModalPanel } from './CalendarModalPanel';
import { MonthGrid, WeekTimeGrid } from './CalendarGrids';
import { CalendarPanel } from './CalendarPanel';
import { DashboardRenderContext } from '../renderer/render-context';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { periodicDayState } from './use-calendar';
import type { NavigatorPeriodic } from '../../../navigator/api';
import { homeServices } from '../../services/instances';
import { scanFileTasks } from '../../platform/calendar/alltasks-scan';
import { taskMetaSuffix } from '../../../../shared/automation/metadata';
import { startOfWeek } from '../../../../shared/periodic-paths';
import { calendarIso } from '../../../../ui/components/huhu/calendar/CalendarMonth';
import { taskDomainFixture } from '../../../../../scripts/fixtures/task-domain';
afterEach(cleanup);
test.each(['widget', 'fullscreen'])('%s calendar month navigation has accessible names', (kind) => {
	setLanguage('en');
	const { app } = memoryVault({}, window),
		root = document.createElement('div'),
		context = new DashboardRenderContext(root);
	render(
		<TestProviders>
			{kind === 'widget' ? (
				<CalendarPanel
					root={root}
					context={context}
					app={app}
					settings={DEFAULT_DASHBOARD_SETTINGS}
					widget
					openDay={vi.fn()}
				/>
			) : (
				<CalendarModalPanel
					app={app}
					context={context}
					actions={{ onToggle: vi.fn() }}
					byDay={new Map()}
					initialView="month"
					openDay={vi.fn()}
				/>
			)}
		</TestProviders>,
	);
	expect(
		screen.getByRole('button', {
			name: t(kind === 'widget' ? 'calendarUnified.previous' : 'calendar.previousMonth'),
		}),
	).toBeTruthy();
	expect(
		screen.getByRole('button', { name: t(kind === 'widget' ? 'calendarUnified.next' : 'calendar.nextMonth') }),
	).toBeTruthy();
	if (kind === 'widget') {
		// the tile has no week view: it is a month, today's agenda, and two buttons for the card's title bar
		expect(screen.getAllByRole('button', { name: t('calendar.today') }).length).toBeGreaterThan(0);
		expect(screen.getByRole('button', { name: t('calendar.fullscreen') })).toBeTruthy();
		expect(screen.queryByRole('button', { name: t('calendar.switchToWeek') })).toBeNull();
		return;
	}
	fireEvent.click(screen.getByRole('radio', { name: t('calendar.viewWeek') }));
	expect(screen.getByRole('button', { name: t('calendar.previousWeek') })).toBeTruthy();
	expect(screen.getByRole('button', { name: t('calendar.nextWeek') })).toBeTruthy();
});

// Migrated day-number regressions: actual month/week React grids, including keyboard routes.

test('month numbers route boundary dates and keyboard activation while compact cells own the action', () => {
	const { app } = memoryVault(),
		context = new DashboardRenderContext(document.createElement('div')),
		open = vi.fn();
	const scene = (compact: boolean, dotMode = false) => (
		<TestProviders>
			<MonthGrid
				year={2026}
				month={7}
				byDay={new Map()}
				context={context}
				opts={{ app, compact, dotMode, onDayNumClick: open, onDayClick: open }}
			/>
		</TestProviders>
	);
	const view = render(scene(false)),
		nums = view.container.querySelectorAll('.dashboard-calendar-cell-num');
	expect(nums).toHaveLength(42);
	for (const n of nums) expect(n.getAttribute('aria-label')).toBeTruthy();
	fireEvent.click(nums[0]!);
	fireEvent.click(nums[41]!);
	fireEvent.keyDown(nums[5]!, { key: 'Enter' });
	fireEvent.keyDown(nums[6]!, { key: ' ' });
	expect(open.mock.calls.map((c) => c[0])).toEqual(['2026-07-27', '2026-09-06', '2026-08-01', '2026-08-02']);
	for (const dots of [false, true]) {
		view.rerender(scene(true, dots));
		expect(view.container.querySelector('.dashboard-calendar-cell-num[role="button"]')).toBeNull();
	}
	fireEvent.click(view.container.querySelector('.dashboard-calendar-cell')!);
	expect(open.mock.calls.at(-1)?.[0]).toBe('2026-07-27');
});
test('week headers cover Monday through Sunday and become inert without an action', () => {
	const { app } = memoryVault(),
		context = new DashboardRenderContext(document.createElement('div')),
		open = vi.fn();
	const scene = (enabled: boolean) => (
		<TestProviders>
			<WeekTimeGrid
				weekStart={new Date(2026, 7, 24)}
				byDay={new Map()}
				context={context}
				opts={{ app, compact: false, onDayNumClick: enabled ? open : undefined }}
			/>
		</TestProviders>
	);
	const view = render(scene(true)),
		headers = view.container.querySelectorAll('.dashboard-calgrid-dayhead');
	expect(headers).toHaveLength(7);
	for (const head of headers) fireEvent.click(head);
	expect(open.mock.calls.map((c) => c[0])).toEqual([
		'2026-08-24',
		'2026-08-25',
		'2026-08-26',
		'2026-08-27',
		'2026-08-28',
		'2026-08-29',
		'2026-08-30',
	]);
	view.rerender(scene(false));
	expect(view.container.querySelector('.dashboard-calgrid-dayhead[role="button"]')).toBeNull();
});

test.each(['month', 'week'])('%s modifiers open existing notes but only select missing dates', (kind) => {
	const { app } = memoryVault({}, window),
		context = new DashboardRenderContext(document.createElement('div'));
	const select = vi.fn(),
		note = vi.fn();
	const opts = {
		app,
		compact: false,
		onDayNumClick: select,
		onPeriodNote: note,
		dayState: (iso: string) => ({
			status: iso === '2026-08-24' ? ('existing' as const) : ('missing' as const),
			active: false,
		}),
	};
	const view = render(
		<TestProviders>
			{kind === 'month' ? (
				<MonthGrid year={2026} month={7} byDay={new Map()} opts={opts} context={context} />
			) : (
				<WeekTimeGrid weekStart={new Date(2026, 7, 24)} byDay={new Map()} opts={opts} context={context} />
			)}
		</TestProviders>,
	);
	const button = (iso: string) =>
		view.container.querySelector(
			`[data-date="${iso}"]${kind === 'month' ? ' button.dashboard-calendar-cell-num' : ''}`,
		)!;
	fireEvent.click(button('2026-08-24'), { ctrlKey: true });
	fireEvent(button('2026-08-24'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
	fireEvent.click(button('2026-08-25'), { metaKey: true });
	expect(note.mock.calls).toEqual([
		['2026-08-24', 'tab'],
		['2026-08-24', 'tab'],
	]);
	expect(select.mock.calls).toEqual([['2026-08-25']]);
});

test('the home adapter highlights every date of the active weekly note without changing selection', () => {
	const periodic = {
		inspect: () => ({ status: 'missing', active: false }),
		weekStart: () => 0,
		active: () => ({ period: 'week', date: '2026-08-23' }),
	} as unknown as NavigatorPeriodic;
	expect(periodicDayState(periodic, '2026-08-23')?.active).toBe(true);
	expect(periodicDayState(periodic, '2026-08-29')?.active).toBe(true);
	expect(periodicDayState(periodic, '2026-08-30')?.active).toBe(false);
});

test('the full calendar month picker navigates the visible week and retains its position across view switches', () => {
	setLanguage('en');
	const { app } = memoryVault({}, window),
		context = new DashboardRenderContext(document.createElement('div'));
	const openDay = vi.fn();
	const view = render(
		<TestProviders>
			<CalendarModalPanel
				app={app}
				context={context}
				actions={{ onToggle: vi.fn() }}
				byDay={new Map()}
				initialView="week"
				initialPosition={{ anchor: new Date(2026, 7, 26), selected: '2026-08-26' }}
				openDay={openDay}
			/>
		</TestProviders>,
	);
	const firstDay = () => view.container.querySelector('.dashboard-calgrid-dayhead')?.getAttribute('data-date');
	expect(firstDay()).toBe('2026-08-24');
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.chooseMonth') }));
	fireEvent.click(screen.getAllByRole('button', { name: t('calendarUnified.chooseMonth') }).at(-1)!);
	fireEvent.click(screen.getByRole('button', { name: 'Nov' }));
	expect(firstDay()).toBe('2026-10-26');
	// Browsing does not select a new day or create/open a note.
	expect(openDay).not.toHaveBeenCalled();
	fireEvent.keyDown(document.body, { key: 'Escape' });
	fireEvent.click(screen.getByRole('radio', { name: t('calendar.viewMonth') }));
	expect(view.container.querySelector('[data-date="2026-11-01"]')).toBeTruthy();
	expect(view.container.querySelector('[data-date="2026-08-26"]')).toBeNull();
	fireEvent.click(screen.getByRole('radio', { name: t('calendar.viewWeek') }));
	expect(firstDay()).toBe('2026-10-26');
});

test('the full calendar derives its week from the current week-start setting without changing selection', () => {
	const before = { periodic: homeServices.periodic, watchPeriodic: homeServices.watchPeriodic };
	let weekStart: 0 | 1 | 6 = 1;
	let changed: (() => void) | undefined;
	const periodic = {
		weekStart: () => weekStart,
		inspect: () => ({ status: 'missing', active: false }),
		active: () => undefined,
	} as unknown as NavigatorPeriodic;
	homeServices.periodic = () => periodic;
	homeServices.watchPeriodic = (listener) => {
		changed = listener;
		return () => {};
	};
	try {
		const { app } = memoryVault({}, window),
			context = new DashboardRenderContext(document.createElement('div'));
		const openDay = vi.fn();
		const view = render(
			<TestProviders>
				<CalendarModalPanel
					app={app}
					context={context}
					actions={{ onToggle: vi.fn() }}
					byDay={new Map()}
					initialView="week"
					initialPosition={{ anchor: new Date(2026, 7, 30), selected: '2026-08-30' }}
					openDay={openDay}
				/>
			</TestProviders>,
		);
		const firstDay = () => view.container.querySelector('.dashboard-calgrid-dayhead')?.getAttribute('data-date');
		expect(firstDay()).toBe('2026-08-24');
		act(() => {
			weekStart = 0;
			changed?.();
		});
		expect(firstDay()).toBe('2026-08-30');
		act(() => {
			weekStart = 6;
			changed?.();
		});
		expect(firstDay()).toBe('2026-08-29');
		expect(openDay).not.toHaveBeenCalled();
	} finally {
		cleanup();
		Object.assign(homeServices, before);
	}
});

test('the board month/week switch keeps the browsed date instead of returning to the selected day', async () => {
	const now = new Date(),
		browsed = new Date(now.getFullYear(), now.getMonth() + 2, 1);
	const { app } = memoryVault({}, window),
		root = document.createElement('div'),
		context = new DashboardRenderContext(root);
	const previous = homeServices.calendar,
		domain = await taskDomainFixture(app),
		calendar = domain.calendar;
	homeServices.calendar = calendar;
	try {
		await calendar.refresh();
		const view = render(
			<TestProviders>
				<CalendarPanel
					root={root}
					context={context}
					app={app}
					settings={DEFAULT_DASHBOARD_SETTINGS}
					openDay={vi.fn()}
				/>
			</TestProviders>,
		);
		fireEvent.click(screen.getByRole('button', { name: t('calendar.nextMonth') }));
		fireEvent.click(screen.getByRole('button', { name: t('calendar.nextMonth') }));
		fireEvent.click(screen.getByRole('radio', { name: t('calendar.viewWeek') }));
		expect(view.container.querySelector('.dashboard-calgrid-dayhead')?.getAttribute('data-date')).toBe(
			calendarIso(startOfWeek(browsed, 1)),
		);
	} finally {
		cleanup();
		await domain.dispose();
		homeServices.calendar = previous;
	}
});

test.each(['board', 'fullscreen'] as const)(
	'%s month/week switch follows the date whose agenda was just opened',
	async (kind) => {
		vi.useFakeTimers({ now: new Date(2026, 7, 3, 12), toFake: ['Date'] });
		const { app } = memoryVault({}, window),
			root = document.createElement('div'),
			context = new DashboardRenderContext(root),
			openDay = vi.fn();
		const previous = homeServices.calendar,
			domain = await taskDomainFixture(app),
			calendar = domain.calendar;
		homeServices.calendar = calendar;
		try {
			await calendar.refresh();
			const view = render(
				<TestProviders>
					{kind === 'board' ? (
						<CalendarPanel
							root={root}
							context={context}
							app={app}
							settings={DEFAULT_DASHBOARD_SETTINGS}
							openDay={openDay}
						/>
					) : (
						<CalendarModalPanel
							app={app}
							context={context}
							actions={{ onToggle: vi.fn() }}
							byDay={new Map()}
							initialView="month"
							initialPosition={{ anchor: new Date(2026, 7, 1), selected: '2026-08-01' }}
							openDay={openDay}
						/>
					)}
				</TestProviders>,
			);
			fireEvent.click(
				view.container.querySelector('[data-date="2026-08-26"] button.dashboard-calendar-cell-num')!,
			);
			expect(openDay).toHaveBeenCalledWith(
				'2026-08-26',
				[],
				false,
				...(kind === 'board' ? [expect.any(Function)] : []),
			);
			fireEvent.click(screen.getByRole('radio', { name: t('calendar.viewWeek') }));
			expect(view.container.querySelector('.dashboard-calgrid-dayhead')?.getAttribute('data-date')).toBe(
				'2026-08-24',
			);
			expect(view.container.querySelector('[data-date="2026-08-26"][data-selected]')).toBeTruthy();
		} finally {
			cleanup();
			await domain.dispose();
			homeServices.calendar = previous;
			vi.useRealTimers();
		}
	},
);

test.each(['month', 'week', 'timed-week'])('%s source clicks retain the original task identity', (kind) => {
	const f = memoryVault({
		'Tasks.md': `- [ ] Source task [due:: 2026-08-26${kind === 'timed-week' ? ' 14:30' : ''}]${taskMetaSuffix({ id: 'source-id' })}\n`,
	});
	const task = scanFileTasks(f.file('Tasks.md'), f.contents.get('Tasks.md')!)[0]!;
	const byDay = new Map([['2026-08-26', [task]]]),
		context = new DashboardRenderContext(document.createElement('div')),
		open = vi.fn();
	const opts = { app: f.app, compact: false, onOpenNote: open };
	const view = render(
		<TestProviders>
			{kind === 'month' ? (
				<MonthGrid year={2026} month={7} byDay={byDay} context={context} opts={opts} />
			) : (
				<WeekTimeGrid weekStart={new Date(2026, 7, 24)} byDay={byDay} context={context} opts={opts} />
			)}
		</TestProviders>,
	);
	fireEvent.click(
		view.container.querySelector(
			kind === 'month'
				? '.dashboard-calendar-event'
				: kind === 'week'
					? '.dashboard-calgrid-allday-chip'
					: '.dashboard-calgrid-event',
		)!,
	);
	expect(open).toHaveBeenCalledWith(task.file, task.line, task);
});

test.each(['month', 'week', 'timed-week'] as const)(
	'%s exposes a keyboard source action separately from completion controls',
	async (kind) => {
		const f = memoryVault({
			'Tasks.md': `- [ ] Source task [due:: 2026-08-26${kind === 'timed-week' ? ' 14:30' : ''}]${taskMetaSuffix({ id: 'source-id' })}\n`,
		});
		const task = scanFileTasks(f.file('Tasks.md'), f.contents.get('Tasks.md')!)[0]!;
		const byDay = new Map([['2026-08-26', [task]]]),
			context = new DashboardRenderContext(document.createElement('div')),
			open = vi.fn(),
			toggle = vi.fn();
		const opts = { app: f.app, compact: false, onOpenNote: open, onToggle: toggle };
		const view = render(
			<TestProviders>
				{kind === 'month' ? (
					<MonthGrid year={2026} month={7} byDay={byDay} context={context} opts={opts} />
				) : (
					<WeekTimeGrid weekStart={new Date(2026, 7, 24)} byDay={byDay} context={context} opts={opts} />
				)}
			</TestProviders>,
		);
		const source = screen.getByRole('button', { name: `${t('calendarUnified.source')} · ${task.text}` });
		source.focus();
		await userEvent.keyboard('{Enter} ');
		expect(open.mock.calls).toEqual([
			[task.file, task.line, task],
			[task.file, task.line, task],
		]);
		expect(toggle).not.toHaveBeenCalled();
		expect(source.querySelector('button,a,[role="checkbox"],[role="link"]')).toBeNull();
		if (kind !== 'week') {
			fireEvent.click(screen.getByRole('checkbox', { name: task.text }));
			expect(toggle).toHaveBeenCalledExactlyOnceWith(task, true);
			expect(open).toHaveBeenCalledTimes(2);
		}
		expect(view.container.querySelector('button button')).toBeNull();
	},
);

test.each(['month', 'timed-week'] as const)(
	'%s retains inline links as separate targets beside the source action',
	async (kind) => {
		const f = memoryVault(
			{
				'Tasks.md': `- [ ] Read [reference](https://example.test) [due:: 2026-08-26${kind === 'timed-week' ? ' 14:30' : ''}]\n`,
			},
			window,
		);
		const task = scanFileTasks(f.file('Tasks.md'), f.contents.get('Tasks.md')!)[0]!,
			byDay = new Map([['2026-08-26', [task]]]),
			context = new DashboardRenderContext(document.createElement('div')),
			open = vi.fn();
		const external = vi.spyOn(window, 'open').mockImplementation(() => null),
			opts = { app: f.app, compact: false, onOpenNote: open };
		try {
			render(
				<TestProviders>
					{kind === 'month' ? (
						<MonthGrid year={2026} month={7} byDay={byDay} context={context} opts={opts} />
					) : (
						<WeekTimeGrid weekStart={new Date(2026, 7, 24)} byDay={byDay} context={context} opts={opts} />
					)}
				</TestProviders>,
			);
			const link = screen.getByRole('link', { name: 'reference' });
			expect(link.closest('button')).toBeNull();
			await userEvent.click(link);
			expect(external).toHaveBeenCalledExactlyOnceWith('https://example.test', '_blank');
			expect(open).not.toHaveBeenCalled();
		} finally {
			external.mockRestore();
		}
	},
);

test.each(['month', 'week'] as const)(
	'%s date actions expose selected, today, current-note and task states to assistive technology',
	(kind) => {
		vi.useFakeTimers({ now: new Date(2026, 7, 26, 12), toFake: ['Date'] });
		try {
			const f = memoryVault({
					'Tasks.md':
						'- [ ] Open task [start:: 2026-08-25] [end:: 2026-08-27] [due:: 2026-08-26]\n- [x] Done task [due:: 2026-08-27]\n',
				}),
				context = new DashboardRenderContext(document.createElement('div'));
			const [open, done] = scanFileTasks(f.file('Tasks.md'), f.contents.get('Tasks.md')!);
			const byDay = new Map([
				['2026-08-26', [open!]],
				['2026-08-27', [done!]],
			]);
			const opts = {
				app: f.app,
				compact: false,
				selected: '2026-08-26',
				onDayNumClick: vi.fn(),
				dayState: (iso: string) => ({
					status: iso === '2026-08-26' ? ('existing' as const) : ('missing' as const),
					active: iso === '2026-08-26',
				}),
			};
			const view = render(
				<TestProviders>
					{kind === 'month' ? (
						<MonthGrid year={2026} month={7} byDay={byDay} context={context} opts={opts} />
					) : (
						<WeekTimeGrid weekStart={new Date(2026, 7, 24)} byDay={byDay} context={context} opts={opts} />
					)}
				</TestProviders>,
			);
			const action = (iso: string) =>
				view.container.querySelector(
					kind === 'month' ? `[data-date="${iso}"] .dashboard-calendar-cell-num` : `[data-date="${iso}"]`,
				)!;
			const selected = action('2026-08-26');
			expect(selected.getAttribute('aria-current')).toBe('date');
			expect(selected.getAttribute('aria-pressed')).toBe('true');
			for (const label of [
				t('calendarUnified.today'),
				t('calendarUnified.currentNote'),
				t('calendarUnified.hasNote'),
				t('calendarUnified.openTasks', { count: 1 }),
			])
				expect(selected.getAttribute('aria-label')).toContain(label);
			expect(action('2026-08-27').getAttribute('aria-pressed')).toBe('false');
			expect(action('2026-08-27').getAttribute('aria-label')).toContain(
				t('calendarUnified.doneTasks', { count: 1 }),
			);
		} finally {
			vi.useRealTimers();
		}
	},
);
