import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { TestProviders } from '../../../ui/react/test-providers';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { CalendarPanel as NavigatorCalendar } from './Calendar';
import { NavigatorContext } from './hooks';
import type { NavigatorEnv } from './env';
import { navigatorSchema } from '../settings';
import type { NavigatorPeriodic, PeriodicNotePreview } from '../api';
import { CalendarPanel as HomeCalendar } from '../../home/ui/calendar/CalendarPanel';
import { CalendarModalPanel } from '../../home/ui/calendar/CalendarModalPanel';
import { DashboardRenderContext } from '../../home/ui/renderer/render-context';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../home/core/board/types/model';
import { taskDomainFixture } from '../../../../scripts/fixtures/task-domain';
import { TASK_STORE_PATH } from '../../../shared/storage/vault-layout';
import { homeServices } from '../../home/services/instances';
import { calendarIso } from '../../../ui/components/huhu/calendar/CalendarMonth';
import { t } from '../../../shared/i18n';
import { taskMetaSuffix } from '../../../shared/automation/metadata';

// These imports point to public APIs across module boundaries in production; this fixture assembles the actual two adapters.
afterEach(cleanup);
test('navigator, board and full calendar share source updates and filters while keeping independent date navigation', async () => {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() === 1 ? 2 : tomorrow.getDate() - 1);
	const iso = calendarIso(tomorrow);
	const f = memoryVault(
		{
			'Board.md': '# Board',
			'Other.md': `- [ ] From another note [due:: ${iso} 14:30]${taskMetaSuffix({ id: 'managed-task' })}\n`,
		},
		window,
	);
	const settings = {
		...DEFAULT_DASHBOARD_SETTINGS,
		dashboardFile: '.huhu/dashboards/Board',
	};
	const periodic: NavigatorPeriodic = {
		root: () => 'Journal',
		template: () => undefined,
		weekStart: () => 0,
		display: () => ({ weeks: 6, weekNumbers: true, images: false }),
		inspect: (period, date) => ({
			period,
			date: calendarIso(date),
			path: `Journal/${calendarIso(date)}.md`,
			title: calendarIso(date),
			status: 'missing',
			active: false,
		}),
		preview: async (period, date) => periodic.inspect(period, date),
		prepare: async (_period, date) => ({ status: 'ready', path: `Journal/${calendarIso(date)}.md`, content: '' }),
		open: vi.fn(async () => true),
		ensure: async () => undefined,
		subscribe: () => () => {},
		active: () => undefined,
	};
	const domain = await taskDomainFixture(f.app),
		calendar = domain.calendar;
	await calendar.createTask({ date: iso, text: 'From another note', time: '14:30' });

	const old = { calendar: homeServices.calendar, periodic: homeServices.periodic, watch: homeServices.watchPeriodic };
	homeServices.calendar = calendar;
	homeServices.periodic = () => periodic;
	homeServices.watchPeriodic = () => () => {};
	const navSettings = navigatorSchema.defaults();
	const env = {
		app: f.app,
		service: {
			settings: { get: () => navSettings, subscribe: () => () => {} },
			index: { version: 1, subscribe: () => () => {}, get: () => undefined },
		},
		periodic,
		previews: { version: 1, subscribe: () => () => {}, get: () => undefined, request: () => {} },
		calendar: () => calendar,
		watchCalendar: (listener: () => void) => calendar.subscribe(listener),
		report: vi.fn(),
		imageUrl: () => '',
		canSplit: true,
	} as unknown as NavigatorEnv;
	const root = document.createElement('div'),
		context = new DashboardRenderContext(root),
		openDay = vi.fn();
	try {
		await calendar.refresh(calendar.defaultScope());
		const view = render(
			<TestProviders>
				<NavigatorContext.Provider value={env}>
					<NavigatorCalendar />
				</NavigatorContext.Provider>
				<div data-test-board>
					<HomeCalendar
						app={f.app}
						root={root}
						context={context}
						settings={settings}
						widget
						openDay={openDay}
					/>
				</div>
				<div data-test-full>
					<CalendarModalPanel
						app={f.app}
						context={context}
						actions={{
							onToggle: async (task, checked) => {
								await calendar.toggleTask(task, checked);
							},
						}}
						byDay={new Map()}
						initialView="month"
						initialPosition={{ anchor: tomorrow, selected: iso }}
						boardPath=".huhu/dashboards/Board"
						openDay={vi.fn()}
					/>
				</div>
			</TestProviders>,
		);
		const nav = view.container.querySelector<HTMLElement>('[data-navigator-calendar]')!,
			board = view.container.querySelector<HTMLElement>('[data-test-board]')!,
			full = view.container.querySelector<HTMLElement>('[data-test-full]')!;
		fireEvent.click(nav.querySelector(`[data-date="${iso}"]`)!);
		const dialog = document.querySelector<HTMLElement>('[role=dialog]')!;
		await vi.waitFor(() => expect(within(dialog).getByText('From another note')).toBeTruthy());
		expect(nav.querySelector('[data-calendar-agenda]')).toBeNull();
		expect(dialog.textContent).not.toContain('Other.md');
		fireEvent.click(board.querySelector(`[data-date="${iso}"]`)!);
		expect(openDay).toHaveBeenCalledWith(
			iso,
			[expect.objectContaining({ path: TASK_STORE_PATH, text: 'From another note' })],
			false,
			expect.any(Function),
		);
		expect(full.textContent).toContain('From another note');
		expect(periodic.open).not.toHaveBeenCalled();
		expect(f.contents.size).toBe(3);
		fireEvent.click(within(dialog).getByRole('checkbox', { name: 'From another note' }));
		await vi.waitFor(() =>
			expect(
				within(full)
					.getAllByRole('checkbox', { name: 'From another note', hidden: true })
					.every((el) => el.getAttribute('aria-checked') === 'true'),
			).toBe(true),
		);
		await act(async () => {
			await calendar.setFilter('open');
		});
		await vi.waitFor(() => expect(within(dialog).queryByText('From another note')).toBeNull());
		expect(within(dialog).getByText(t('calendarUnified.filteredEmpty'))).toBeTruthy();
		expect(full.textContent).not.toContain('From another note');
		fireEvent.click(dialog.querySelector('[data-slot=dialog-close]')!);
		fireEvent.click(within(board).getByLabelText(t('calendarUnified.next')));
		expect(nav.querySelector(`[data-date="${iso}"][data-selected]`)).toBeTruthy();
		view.unmount();
	} finally {
		await domain.dispose();
		homeServices.calendar = old.calendar;
		homeServices.periodic = old.periodic;
		homeServices.watchPeriodic = old.watch;
	}
});

test.each(['periodic', 'index', 'preview'] as const)(
	'navigator refreshes diary availability on %s changes without bringing back a summary block',
	async (change) => {
		const iso = calendarIso(new Date()),
			f = memoryVault({}, window),
			settings = navigatorSchema.defaults();
		const listeners = {
			periodic: new Set<() => void>(),
			index: new Set<() => void>(),
			preview: new Set<() => void>(),
		};
		const subscribe = (kind: keyof typeof listeners) => (listener: () => void) => {
			listeners[kind].add(listener);
			return () => {
				listeners[kind].delete(listener);
			};
		};
		const info: PeriodicNotePreview = {
			period: 'day',
			date: iso,
			path: 'Journal/Day.md',
			title: 'Day',
			status: 'existing',
			active: false,
			summary: 'Old diary summary',
		};
		const preview = vi.fn(async () => info);
		const periodic = {
			inspect: () => ({ ...info, summary: undefined }),
			preview,
			subscribe: subscribe('periodic'),
			active: () => undefined,
			weekStart: () => 1,
		} as unknown as NavigatorPeriodic;
		const env = {
			app: f.app,
			service: {
				settings: { get: () => settings, subscribe: () => () => {} },
				index: { version: 1, subscribe: subscribe('index'), get: () => undefined },
			},
			periodic,
			previews: { version: 1, subscribe: subscribe('preview'), get: () => undefined, request: () => {} },
			report: vi.fn(),
			imageUrl: () => '',
			canSplit: true,
		} as unknown as NavigatorEnv;
		render(
			<TestProviders>
				<NavigatorContext.Provider value={env}>
					<NavigatorCalendar />
				</NavigatorContext.Provider>
			</TestProviders>,
		);
		fireEvent.click(document.querySelector(`[data-navigator-calendar] [data-date="${iso}"]`)!);
		await vi.waitFor(() => expect(preview).toHaveBeenCalled());
		expect(document.querySelector('[data-calendar-note-summary]')).toBeNull();
		let resolve!: (value: PeriodicNotePreview) => void;
		preview.mockImplementationOnce(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		act(() => {
			if (change === 'index') Object.assign(env.service.index, { version: 2 });
			if (change === 'preview') Object.assign(env.previews, { version: 2 });
			for (const listener of [...listeners[change]]) listener();
		});
		expect(document.querySelector('[data-calendar-note-summary]')).toBeNull();
		await act(async () => {
			resolve({ ...info, summary: 'Updated diary summary' });
		});
		expect(document.querySelector('[data-calendar-note-summary]')).toBeNull();
		expect(preview).toHaveBeenCalledTimes(2);
		expect(
			document.querySelector('[role=dialog] [data-calendar-agenda]')?.getAttribute('data-calendar-agenda'),
		).toBe(iso);
	},
);
