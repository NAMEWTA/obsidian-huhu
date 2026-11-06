import { act, render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../../../shared/i18n';
import { DateField, DateRangeField, DateTimeField } from './index';
import { TestProviders } from '../../../react/test-providers';
beforeEach(() => setLanguage('en'));
test.each(['Start date', 'End date'])('range %s IME acceptance Enter cannot apply the range', async (label) => {
	const changed = vi.fn();
	render(
		<TestProviders>
			<DateRangeField label="Range" value={{ from: '2026-11-10', to: '2026-11-20' }} onChange={changed} />
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Range' }));
	const input = screen.getByLabelText(label);
	fireEvent.compositionStart(input);
	fireEvent.change(input, { target: { value: label === 'Start date' ? '2026-11-11' : '2026-11-21' } });
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(changed).not.toHaveBeenCalled();
	expect(screen.getByLabelText(label)).toBe(input);
});
test('ordinary noncomposing range Enter still applies exactly once', async () => {
	const changed = vi.fn();
	render(
		<TestProviders>
			<DateRangeField label="Range" value={{ from: '2026-11-10', to: '2026-11-20' }} onChange={changed} />
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Range' }));
	const input = screen.getByLabelText('Start date');
	fireEvent.change(input, { target: { value: '2026-11-11' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(changed).toHaveBeenCalledExactlyOnceWith({ from: '2026-11-11', to: '2026-11-20' });
});
test.each(['Escape', 'outside', 'Cancel'])('%s dismissing range discards draft error as Cancel does', async (how) => {
	const changed = vi.fn();
	render(
		<TestProviders>
			<button>Outside</button>
			<DateRangeField label="Range" value={{ from: '2026-11-10', to: '2026-11-20' }} onChange={changed} />
		</TestProviders>,
	);
	const user = userEvent.setup();
	const trigger = screen.getByRole('button', { name: 'Range' });
	await user.click(trigger);
	fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-01' } });
	expect(screen.getByRole('alert').textContent).toMatch(/must not precede/);
	if (how === 'Escape') await user.keyboard('{Escape}');
	else await user.click(screen.getByRole('button', { name: how === 'outside' ? 'Outside' : 'Cancel' }));
	expect(screen.queryByLabelText('End date')).toBeNull();
	expect(changed).not.toHaveBeenCalled();
	expect(trigger.textContent).toContain('2026-11-20');
	expect(screen.queryByRole('alert')).toBeNull();
	expect(trigger.getAttribute('aria-invalid')).toBe('false');
});
test('DateField popup exposes approved Today and Clear footer actions', async () => {
	render(
		<TestProviders>
			<DateField label="Date" value="2026-11-20" today="2026-11-05" onChange={() => {}} />
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	const popup = document.querySelector<HTMLElement>('[data-slot="popover-content"]')!;
	expect(within(popup).queryByRole('button', { name: 'Today' })).toBeTruthy();
	expect(within(popup).queryByRole('button', { name: 'Clear date' })).toBeTruthy();
});

test('range dismiss preserves real external error and the latest controlled replacement', async () => {
	const changed = vi.fn(),
		user = userEvent.setup();
	const view = (from: string, to: string) => (
		<TestProviders>
			<DateRangeField label="Range" error="Caller error" value={{ from, to }} onChange={changed} />
		</TestProviders>
	);
	const { rerender } = render(view('2026-11-10', '2026-11-20'));
	await user.click(screen.getByRole('button', { name: 'Range' }));
	fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-01' } });
	rerender(view('2026-12-01', '2026-12-10'));
	await user.keyboard('{Escape}');
	expect(screen.getByRole('alert').textContent).toBe('Caller error');
	expect(screen.getByRole('button', { name: 'Range' }).textContent).toContain('2026-12-10');
	expect(changed).not.toHaveBeenCalled();
});
test('DateField Today uses bounds and Clear shares required-null behavior', async () => {
	const user = userEvent.setup(),
		changed = vi.fn();
	const { rerender } = render(
		<TestProviders>
			<DateField label="Date" value="2026-11-20" today="2026-11-05" min="2026-11-10" onChange={changed} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	let popup = document.querySelector<HTMLElement>('[data-slot=popover-content]')!;
	expect((within(popup).getByRole('button', { name: 'Today' }) as HTMLButtonElement).disabled).toBe(true);
	await user.keyboard('{Escape}');
	rerender(
		<TestProviders>
			<DateField label="Date" value="2026-11-20" today="2026-11-05" required onChange={changed} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	popup = document.querySelector<HTMLElement>('[data-slot=popover-content]')!;
	await user.click(within(popup).getByRole('button', { name: 'Today' }));
	expect(changed).toHaveBeenLastCalledWith('2026-11-05');
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	popup = document.querySelector<HTMLElement>('[data-slot=popover-content]')!;
	await user.click(within(popup).getByRole('button', { name: 'Clear date' }));
	expect(changed).toHaveBeenLastCalledWith(null);
	expect(screen.getByRole('alert').textContent).toMatch(/required/);
});
test('clearable false removes both partial-date clear actions', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<DateField label="Date" value="2026-11-20" today="2026-11-05" clearable={false} onChange={() => {}} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	expect(screen.queryByRole('button', { name: 'Clear date' })).toBeNull();
	expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy();
});

test('DateTime Today retains caller zone and exposes only its whole-value clear', async () => {
	const user = userEvent.setup(),
		changed = vi.fn(),
		validate = vi.fn(() => null);
	render(
		<TestProviders>
			<DateTimeField
				label="Date"
				value={{ date: '2026-11-20', time: '09:30', timeZone: 'America/New_York' }}
				initialTimeZone="Asia/Shanghai"
				today="2026-11-05"
				validateValue={validate}
				onChange={changed}
			/>
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	const popup = document.querySelector<HTMLElement>('[data-slot=popover-content]')!;
	expect(within(popup).queryByRole('button', { name: 'Clear date' })).toBeNull();
	expect(screen.getAllByRole('button', { name: 'Clear date' })).toHaveLength(1);
	await user.click(within(popup).getByRole('button', { name: 'Today' }));
	expect(changed).toHaveBeenCalledExactlyOnceWith({
		date: '2026-11-05',
		time: '09:30',
		timeZone: 'America/New_York',
	});
	expect(validate).toHaveBeenCalledWith({ date: '2026-11-05', time: '09:30', timeZone: 'America/New_York' });
});
test('approved DateField footer labels follow the real language store', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<DateField label="Date" value="2026-11-20" today="2026-11-05" onChange={() => {}} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open calendar' }));
	act(() => setLanguage('zh'));
	const popup = document.querySelector<HTMLElement>('[data-slot=popover-content]')!;
	expect(within(popup).getByRole('button', { name: '今天' })).toBeTruthy();
	expect(within(popup).getByRole('button', { name: '清除日期' })).toBeTruthy();
});
