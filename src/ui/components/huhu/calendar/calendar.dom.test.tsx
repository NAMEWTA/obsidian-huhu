import { afterEach, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { CalendarMonth, calendarRows, calendarIso, type CalendarMonthProps } from './CalendarMonth';
import { CalendarAgenda } from './CalendarAgenda';
import { useCalendarPreview, type CalendarPreviewContent } from './CalendarPreview';

setLanguage('en');
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});
function month(overrides: Partial<CalendarMonthProps> = {}) {
	const select = vi.fn(),
		note = vi.fn();
	function Controlled() {
		const [anchor, setAnchor] = useState(new Date(2026, 9, 1));
		const [selected, setSelected] = useState('2026-10-12');
		return (
			<CalendarMonth
				anchor={anchor}
				selected={selected}
				weekStart={1}
				day={(iso) => ({ note: iso === '2026-10-12' ? 'existing' : 'missing', tasks: 0, openTasks: 0 })}
				onAnchor={setAnchor}
				onSelect={(iso) => {
					select(iso);
					setSelected(iso);
				}}
				onToday={() => setAnchor(new Date())}
				onNote={note}
				{...overrides}
			/>
		);
	}
	return {
		...render(
			<TestProviders>
				<Controlled />
			</TestProviders>,
		),
		select,
		note,
	};
}

test('compact windows are 1–5 weeks; full months span exactly 4–6 weeks including year boundaries', () => {
	for (let weeks = 1; weeks <= 5; weeks++) expect(calendarRows(new Date(2026, 11, 30), 0, weeks)).toHaveLength(weeks);
	expect(calendarRows(new Date(2026, 1, 1), 0)).toHaveLength(4);
	expect(calendarRows(new Date(2026, 7, 1), 1)).toHaveLength(6);
	expect(
		calendarIso(
			calendarRows(new Date(2026, 11, 30), 0, 2)
				.at(-1)!
				.at(-1)!,
		),
	).toBe('2027-01-09');
});

test('month title opens a 12 month year picker and never creates a periodic note', () => {
	const f = month();
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.chooseMonth') }));
	const panel = document.querySelector('[data-calendar-year-panel]')!;
	expect(within(panel as HTMLElement).getAllByRole('button')).toHaveLength(12);
	fireEvent.click(within(panel as HTMLElement).getByRole('button', { name: 'Feb' }));
	expect(document.querySelector('[data-calendar-month]')!.getAttribute('data-calendar-month')).toBe('2026-2');
	expect(f.note).not.toHaveBeenCalled();
});

test('period menus distinguish an unavailable journal service from a disabled period', () => {
	month({
		periods: [
			{ period: 'quarter', status: 'unavailable' },
			{ period: 'year', status: 'disabled' },
		],
	});
	fireEvent.pointerDown(screen.getByRole('button', { name: t('calendarUnified.periodNotes') }), { button: 0 });
	expect(
		screen.getByRole('menuitem', { name: t('calendarUnified.periodicUnavailable') }).getAttribute('aria-disabled'),
	).toBe('true');
	expect(screen.getByRole('menuitem', { name: t('calendarUnified.disabled') }).getAttribute('aria-disabled')).toBe(
		'true',
	);
});

test('keyboard arrows rove focus without selecting or writing; selected dates and explicit context actions stay distinct', async () => {
	const f = month();
	const first = document.querySelector<HTMLElement>('[data-date="2026-10-12"]')!;
	first.focus();
	fireEvent.keyDown(first, { key: 'ArrowRight' });
	await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-date')).toBe('2026-10-13'));
	expect(document.querySelector('[data-date="2026-10-13"]')!.getAttribute('tabindex')).toBe('0');
	expect(f.select).not.toHaveBeenCalled();
	expect(f.note).not.toHaveBeenCalled();
	fireEvent.click(document.activeElement!);
	expect(f.select).toHaveBeenCalledWith('2026-10-13');
	expect(f.note).not.toHaveBeenCalled();
	fireEvent.contextMenu(document.querySelector('[data-date="2026-10-13"]')!);
	fireEvent.click(screen.getByRole('menuitem', { name: t('calendarUnified.createNote') }));
	expect(f.note).toHaveBeenCalledWith('day', '2026-10-13', 'create');
});

test.each([
	[1, '2026-10-08'],
	[3, '2026-10-22'],
	[5, '2026-11-05'],
	[6, '2026-11-01'],
] as const)('PageDown follows the %s-week navigation step without selecting a date', async (weeks, next) => {
	const f = month({ weeks });
	const day = document.querySelector<HTMLElement>('[data-date="2026-10-01"]')!;
	day.focus();
	fireEvent.keyDown(day, { key: 'PageDown' });
	await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-date')).toBe(next));
	fireEvent.keyDown(document.activeElement!, { key: 'PageUp' });
	await vi.waitFor(() => expect(document.activeElement?.getAttribute('data-date')).toBe('2026-10-01'));
	expect(f.select).not.toHaveBeenCalled();
	expect(f.note).not.toHaveBeenCalled();
});

test('modifier navigation only opens an existing note; missing days only select an agenda', () => {
	const f = month();
	fireEvent.click(document.querySelector('[data-date="2026-10-12"]')!, { ctrlKey: true });
	expect(f.note).toHaveBeenCalledWith('day', '2026-10-12', 'tab');
	fireEvent.click(document.querySelector('[data-date="2026-10-13"]')!, { metaKey: true });
	expect(f.note).toHaveBeenCalledTimes(1);
	expect(f.select).toHaveBeenCalledWith('2026-10-13');
});

test('agenda rejects failed writes visibly, preserves typed input, and admits a single in-flight operation per source', async () => {
	let fail!: (error: Error) => void;
	const toggle = vi.fn(
		() =>
			new Promise<void>((_resolve, reject) => {
				fail = reject;
			}),
	);
	const add = vi.fn(async () => {
		throw new Error('disk full');
	});
	render(
		<TestProviders>
			<CalendarAgenda
				date="2026-10-23"
				status="ready"
				tasks={[{ id: 'a:1:id', text: 'Original', checked: false, source: 'a.md' }]}
				onAdd={add}
				onToggle={toggle}
			/>
		</TestProviders>,
	);
	const box = screen.getByRole('checkbox');
	fireEvent.click(box);
	fireEvent.click(box);
	expect(toggle).toHaveBeenCalledTimes(1);
	await act(async () => {
		fail(new Error('source changed'));
	});
	expect(screen.getByRole('alert').textContent).toBe(t('calendarUnified.error.write-failed'));
	const input = screen.getByLabelText(t('calendarUnified.taskTitle')) as HTMLInputElement;
	fireEvent.change(input, { target: { value: 'Keep this text' } });
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.add') }));
	await vi.waitFor(() => expect(add).toHaveBeenCalledOnce());
	await vi.waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
	expect(input.value).toBe('Keep this text');
});

test('agenda keeps IME confirmation from submitting a task before composition finishes', async () => {
	const add = vi.fn(async () => true);
	render(
		<TestProviders>
			<CalendarAgenda date="2026-10-23" status="ready" tasks={[]} onAdd={add} />
		</TestProviders>,
	);
	const input = screen.getByLabelText(t('calendarUnified.taskTitle'));
	fireEvent.change(input, { target: { value: '中文待办' } });
	const composing = new KeyboardEvent('keydown', {
		key: 'Enter',
		isComposing: true,
		bubbles: true,
		cancelable: true,
	});
	fireEvent(input, composing);
	expect(composing.defaultPrevented).toBe(true);
	expect(add).not.toHaveBeenCalled();
	fireEvent.submit(input.closest('form')!);
	await vi.waitFor(() => expect(add).toHaveBeenCalledWith('中文待办', ''));
});

function Hover({ load, reset = '' }: { load: (date: string) => Promise<CalendarPreviewContent>; reset?: string }) {
	const preview = useCalendarPreview(load, reset);
	return (
		<>
			<button
				onMouseEnter={(event) => preview.hover('2026-10-23', event.currentTarget)}
				onMouseLeave={preview.close}
			>
				First
			</button>
			<button onMouseEnter={(event) => preview.hover('2026-10-24', event.currentTarget)}>Second</button>
			{preview.content}
		</>
	);
}
const preview = (date: string): CalendarPreviewContent => ({
	date,
	noteExists: true,
	title: `Note ${date}`,
	summary: 'Summary',
	tasks: [],
});

test('hover previews ignore stale responses and Escape/scroll close both visible and pending requests', async () => {
	vi.useFakeTimers();
	const pending = new Map<string, (value: CalendarPreviewContent) => void>();
	const load = vi.fn(
		(date: string) =>
			new Promise<CalendarPreviewContent>((resolve) => {
				pending.set(date, resolve);
			}),
	);
	render(
		<TestProviders>
			<Hover load={load} />
		</TestProviders>,
	);
	fireEvent.mouseEnter(screen.getByText('First'));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(350);
	});
	fireEvent.mouseEnter(screen.getByText('Second'));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(350);
	});
	await act(async () => {
		pending.get('2026-10-24')!(preview('2026-10-24'));
		pending.get('2026-10-23')!(preview('2026-10-23'));
	});
	expect(screen.getByRole('tooltip').textContent).toContain('2026-10-24');
	fireEvent.keyDown(window, { key: 'Escape' });
	expect(screen.queryByRole('tooltip')).toBeNull();
	fireEvent.mouseEnter(screen.getByText('First'));
	fireEvent.scroll(window);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(400);
	});
	expect(load).toHaveBeenCalledTimes(2);
});

test('preview requests are cancelled by a different calendar scope or component disposal', async () => {
	vi.useFakeTimers();
	const load = vi.fn(async (date: string) => preview(date));
	const view = render(
		<TestProviders>
			<Hover load={load} reset="old" />
		</TestProviders>,
	);
	fireEvent.mouseEnter(screen.getByText('First'));
	view.rerender(
		<TestProviders>
			<Hover load={load} reset="new" />
		</TestProviders>,
	);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(400);
	});
	expect(load).not.toHaveBeenCalled();
	fireEvent.mouseEnter(screen.getByText('First'));
	view.unmount();
	await act(async () => {
		await vi.advanceTimersByTimeAsync(400);
	});
	expect(load).not.toHaveBeenCalled();
});

test('agenda shows selected completed tasks and dated earlier unfinished groups, with a direct diary action', () => {
	const onNote = vi.fn();
	const view = render(
		<TestProviders>
			<CalendarAgenda
				date="2026-10-24"
				status="ready"
				tasks={[{ id: 'done', text: 'Done today', checked: true, source: 'secret.md' }]}
				earlierTasks={[
					{ id: 'old', text: 'Earlier unfinished', checked: false, source: 'secret.md', date: '2026-10-22' },
				]}
				onNote={onNote}
			/>
		</TestProviders>,
	);
	expect(screen.getByRole('checkbox', { name: 'Done today' }).getAttribute('aria-checked')).toBe('true');
	expect(screen.getByRole('checkbox', { name: 'Earlier unfinished' })).toBeTruthy();
	expect(view.container.textContent).toContain('2026-10-22');
	expect(view.container.textContent).not.toContain('secret.md');
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.period.day') }));
	expect(onNote).toHaveBeenCalledWith('diary');
	expect(screen.queryByRole('menu')).toBeNull();
});
