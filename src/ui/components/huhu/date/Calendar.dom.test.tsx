import { expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render } from '@testing-library/react';
import { TestProviders } from '../../../react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { Calendar } from './Calendar';

test('actual DayPicker honors Saturday week start, locale updates and inclusive disabled bounds', () => {
	setLanguage('en');
	const { container } = render(
		<TestProviders>
			<Calendar
				value="2026-11-20"
				onChange={() => undefined}
				weekStartsOn={6}
				min="2026-11-20"
				max="2026-11-22"
				today="2026-11-05"
			/>
		</TestProviders>,
	);
	expect(container.querySelector('th')?.textContent).toBe('Sa');
	expect((container.querySelector('[data-day="2026-11-19"] button') as HTMLButtonElement).disabled).toBe(true);
	expect((container.querySelector('[data-day="2026-11-20"] button') as HTMLButtonElement).disabled).toBe(false);
	expect((container.querySelector('[data-day="2026-11-22"] button') as HTMLButtonElement).disabled).toBe(false);
	expect((container.querySelector('[data-day="2026-11-23"] button') as HTMLButtonElement).disabled).toBe(true);
	act(() => setLanguage('zh'));
	expect(container.querySelector('th')?.textContent).toBe('六');
});

test('required calendar keeps a selected day when that day is activated again', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	const { container } = render(
		<TestProviders>
			<Calendar required value="2026-11-20" onChange={change} today="2026-11-05" />
		</TestProviders>,
	);
	await user.click(container.querySelector('[data-day="2026-11-20"] button')!);
	expect(change).toHaveBeenCalledWith('2026-11-20');
});
