import { useState } from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { HuhuProviders } from '../../../react/providers';
import { DateLib } from '@daypicker/react';
import { ProductCalendar, productIso } from './ProductCalendar';

afterEach(cleanup);
function Probe({ weeks, weekStart }: { weeks: number; weekStart: 0 | 1 | 6 }) {
	const [month, setMonth] = useState(new Date('2027-01-31T12:00:00Z'));
	return (
		<HuhuProviders ownerDocument={document}>
			<ProductCalendar
				month={month}
				onMonthChange={setMonth}
				selected="2027-01-31"
				onSelectDate={() => {}}
				weeks={weeks}
				weekStart={weekStart}
			/>
		</HuhuProviders>
	);
}
for (const weeks of [1, 2, 3, 4, 5])
	for (const weekStart of [0, 1, 6] as const) {
		test(`${weeks} week window start ${weekStart} crosses last-day boundary through library focus`, async () => {
			const v = render(<Probe weeks={weeks} weekStart={weekStart} />),
				lib = new DateLib({ timeZone: 'UTC' });
			const cells = v.container.querySelectorAll<HTMLElement>('[data-day]');
			expect(cells.length).toBe(weeks * 7);
			const last = cells[cells.length - 1]!,
				date = last.dataset.day!,
				expected = productIso(lib.addDays(new Date(`${date}T12:00:00Z`), 1));
			const button = last.querySelector('button')!;
			button.focus();
			await waitFor(() => expect(button.closest('[data-focused]')).not.toBeNull());
			fireEvent.keyDown(button, { key: 'ArrowRight' });
			await waitFor(() =>
				expect(document.activeElement?.closest<HTMLElement>('[data-day]')?.dataset.day).toBe(expected),
			);
		});
		test(`${weeks} week window PageDown is one window with library keyboard`, async () => {
			const v = render(<Probe weeks={weeks} weekStart={weekStart} />),
				lib = new DateLib({ timeZone: 'UTC' });
			const button = v.container.querySelector<HTMLElement>('[data-day="2027-01-31"] button[data-date]')!;
			button.focus();
			await waitFor(() => expect(button.closest('[data-focused]')).not.toBeNull());
			fireEvent.keyDown(button, { key: 'PageDown' });
			const expected = productIso(lib.addDays(new Date('2027-01-31T12:00:00Z'), weeks * 7));
			await waitFor(() =>
				expect(document.activeElement?.closest<HTMLElement>('[data-day]')?.dataset.day).toBe(expected),
			);
			fireEvent.keyDown(document.activeElement!, { key: 'PageUp' });
			await waitFor(() =>
				expect(document.activeElement?.closest<HTMLElement>('[data-day]')?.dataset.day).toBe('2027-01-31'),
			);
		});
	}

test('date and task slots retain independent semantic buttons and callbacks through the hit partition', () => {
	const select = vi.fn(),
		task = vi.fn();
	const view = render(
		<HuhuProviders ownerDocument={document}>
			<ProductCalendar
				month={new Date('2027-01-01T12:00:00Z')}
				onMonthChange={() => {}}
				selected="2027-01-31"
				onSelectDate={select}
				renderDayContent={(iso) =>
					iso === '2027-01-31' ? (
						<button type="button" onClick={task}>
							Task action
						</button>
					) : null
				}
			/>
		</HuhuProviders>,
	);
	expect(view.container.querySelector('button button')).toBeNull();
	const day = view.container.querySelector('button[data-date="2027-01-31"]')!,
		action = [...view.container.querySelectorAll('button')].find((b) => b.textContent === 'Task action')!;
	fireEvent.click(day);
	expect(select).toHaveBeenCalledExactlyOnceWith('2027-01-31');
	fireEvent.click(action);
	expect(task).toHaveBeenCalledOnce();
	expect(select).toHaveBeenCalledTimes(1);
});
