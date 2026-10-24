import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { DashboardRenderContext } from '../renderer/render-context';
import { CalendarTile, type CalendarTileProps } from './CalendarTile';

beforeEach(() => setLanguage('en'));
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});
const task = (text: string, over: Partial<VaultTask> = {}): VaultTask =>
	({
		path: 'Plan.md',
		line: 1,
		originalLine: `- [ ] ${text}`,
		checked: false,
		text,
		due: '2026-10-12',
		mtime: 1,
		ctime: 1,
		file: { basename: 'Plan', path: 'Plan.md' },
		...over,
	}) as VaultTask;
function room(width: number, height: number) {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		const body = this.hasAttribute('data-calendar-tile');
		return {
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: body ? width : 0,
			bottom: body ? height : 0,
			width: body ? width : 0,
			height: body ? height : 0,
			toJSON() {},
		} as DOMRect;
	});
}
function scene(over: Partial<CalendarTileProps> = {}) {
	const { app } = memoryVault({}, window);
	const calls = {
		select: vi.fn(),
		daily: vi.fn(),
		toggle: vi.fn(async () => {}),
		add: vi.fn(async () => {}),
		day: vi.fn(),
		hover: vi.fn(),
		leave: vi.fn(),
		shift: vi.fn(),
		anchor: vi.fn(),
		today: vi.fn(),
		full: vi.fn(),
		load: vi.fn(),
	};
	const props: CalendarTileProps = {
		app,
		context: new DashboardRenderContext(document.createElement('div')),
		byDay: new Map(),
		date: new Date(2026, 9, 1),
		loaded: true,
		error: false,
		started: true,
		selected: '2026-10-12',
		onShift: calls.shift,
		onToday: calls.today,
		onLoad: calls.load,
		onFull: calls.full,
		onDay: calls.day,
		onSelect: calls.select,
		onOpenDaily: calls.daily,
		onToggle: calls.toggle,
		onAdd: calls.add,
		onHover: calls.hover,
		onLeave: calls.leave,
		onAnchor: calls.anchor,
		...over,
	};
	const view = render(
		<TestProviders>
			<CalendarTile {...props} />
		</TestProviders>,
	);
	return { calls, ...view };
}

test('month rows follow the month and weekday setting; every date supports agenda and preview', () => {
	const { calls } = scene({
		byDay: new Map([
			['2026-10-12', [task('Open one')]],
			['2026-10-13', [task('Done', { checked: true })]],
		]),
	});
	const cells = document.querySelectorAll('[data-calendar-month] [data-date]');
	expect(cells).toHaveLength(35);
	expect(cells[0]!.getAttribute('data-date')).toBe('2026-09-28');
	const open = document.querySelector<HTMLElement>('[data-date="2026-10-12"]')!;
	expect(open.getAttribute('aria-label')).toContain('1 unfinished tasks');
	expect(document.querySelector('[data-date="2026-10-13"]')!.getAttribute('aria-label')).toContain(
		'All 1 tasks completed',
	);
	fireEvent.click(open);
	expect(calls.select).toHaveBeenCalledWith('2026-10-12');
	expect(calls.day).toHaveBeenCalledWith('2026-10-12');
	fireEvent.mouseEnter(document.querySelector('[data-date="2026-10-14"]')!);
	expect(calls.hover).toHaveBeenCalledWith('2026-10-14', expect.any(HTMLElement));
	fireEvent.doubleClick(open);
	expect(calls.daily).not.toHaveBeenCalled();
});

test.each([
	[280, 160, false, true],
	[480, 160, true, true],
	[480, 320, true, false],
	[800, 320, true, false],
 [800, 300, true, false],
] as const)(
	'size %s by %s keeps an explicit selected date and suitable month window',
	(width, height, month, short) => {
		room(width, height);
		scene({
			byDay: new Map([
				['2026-10-12', [task('Selected task')]],
				['2026-10-14', [task('Different day')]],
			]),
		});
		expect(!!document.querySelector('[data-calendar-panel="month"]')).toBe(month);
		expect(!!document.querySelector('[data-calendar-panel="today"]')).toBe(short);
		if (short && month) expect(document.querySelectorAll('[data-calendar-month] [data-date]')).toHaveLength(7);
		if (short) {
			expect(screen.getByText('Selected task')).toBeTruthy();
			expect(screen.queryByText('Different day')).toBeNull();
		}
		expect(!!document.querySelector('[data-calendar-panel="day"]')).toBe(width >= 640 && height >= 256);
	},
);

test('S mode has arbitrary date navigation and distinguishes failure, loading, empty and filtered empty', () => {
	room(280, 160);
	const { calls } = scene({ status: 'error', loaded: false });
	expect(screen.getByRole('alert').textContent).toContain(t('calendarUnified.failed'));
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.retry') }));
	expect(calls.load).toHaveBeenCalledOnce();
	const picker = screen.getByLabelText(t('calendarUnified.chooseMonth'));
	fireEvent.change(picker, { target: { value: '2027-02-03' } });
	expect(calls.select).toHaveBeenCalledWith('2027-02-03');
	expect(calls.day).toHaveBeenCalledWith('2027-02-03');
	cleanup();
	scene({ status: 'loading', loaded: false });
	expect(screen.getByRole('status').textContent).toContain(t('calendarUnified.loading'));
	cleanup();
	scene({ status: 'ready', filtered: false });
	expect(screen.getByText(t('calendarUnified.empty'))).toBeTruthy();
	cleanup();
	scene({ status: 'ready', filtered: true });
	expect(screen.getByText(t('calendarUnified.filteredEmpty'))).toBeTruthy();
});

test('wide mode selects without opening another dialog; copied task ids still target the correct source', async () => {
	room(800, 320);
	const first = task('First copy', { id: 'copied', path: 'One.md' }),
		second = task('Second copy', { id: 'copied', path: 'Two.md' });
	const { calls } = scene({ byDay: new Map([['2026-10-12', [first, second]]]) });
	fireEvent.click(document.querySelector('[data-calendar-month] [data-date="2026-10-13"]')!);
	expect(calls.select).toHaveBeenCalledWith('2026-10-13');
	expect(calls.day).not.toHaveBeenCalled();
	const panel = document.querySelector<HTMLElement>('[data-calendar-panel="day"]')!;
	fireEvent.click(within(panel).getByRole('checkbox', { name: 'Second copy' }));
	await vi.waitFor(() => expect(calls.toggle).toHaveBeenCalledWith(second, true));
	fireEvent.change(within(panel).getByLabelText(t('calendarUnified.taskTitle')), { target: { value: 'Call' } });
	fireEvent.click(within(panel).getByRole('button', { name: t('calendarUnified.taskTime') }));
	fireEvent.change(panel.querySelector('input[type=time]')!, { target: { value: '14:20' } });
	fireEvent.click(within(panel).getByRole('button', { name: t('calendarUnified.add') }));
	await vi.waitFor(() => expect(calls.add).toHaveBeenCalledWith('2026-10-12', 'Call', '14:20'));
});

test('phone manual load performs no date interaction until explicitly requested', () => {
	const { calls } = scene({ started: false, loaded: false });
	expect(document.querySelector('[data-date]')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: t('calendar.refresh') }));
	expect(calls.load).toHaveBeenCalledOnce();
});
