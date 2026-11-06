import { useState } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setLanguage } from '../../../../shared/i18n';
import { TestProviders } from '../../../react/test-providers';
import { DateField, DateRangeField, DateTimeField, type DateTimeValue } from './index';

beforeEach(() => setLanguage('en'));

test('invalid date stays as draft, valid Enter commits once and IME Enter does not commit', async () => {
	const change = vi.fn();
	const user = userEvent.setup();
	render(
		<TestProviders>
			<DateField label="Date" value={null} onChange={change} />
		</TestProviders>,
	);
	const input = screen.getByLabelText('Date');
	await user.type(input, '2026-02-31');
	fireEvent.blur(input);
	expect((input as HTMLInputElement).value).toBe('2026-02-31');
	expect(change).not.toHaveBeenCalled();
	expect(input.getAttribute('aria-invalid')).toBe('true');
	expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toMatch(/valid date/);
	await user.clear(input);
	await user.type(input, '2026-11-20');
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(change).not.toHaveBeenCalled();
	fireEvent.compositionEnd(input);
	await user.keyboard('{Enter}');
	expect(change).toHaveBeenCalledExactlyOnceWith('2026-11-20');
});
test('clear commits null even for required date and exposes required error; external label/id stays usable', async () => {
	const user = userEvent.setup(),
		change = vi.fn();
	render(
		<TestProviders>
			<label htmlFor="external">External</label>
			<DateField id="external" required value="2026-11-20" onChange={change} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(change).toHaveBeenCalledExactlyOnceWith(null);
	expect((screen.getByLabelText('External') as HTMLInputElement).value).toBe('');
	expect(screen.getByLabelText('External').getAttribute('aria-invalid')).toBe('true');
});
test('inclusive bounds and disabled/readOnly controls cannot mutate', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	const { rerender } = render(
		<TestProviders>
			<DateField label="Date" value={null} min="2026-11-20" max="2026-11-20" onChange={change} />
		</TestProviders>,
	);
	await user.type(screen.getByLabelText('Date'), '2026-11-19{Enter}');
	expect(change).not.toHaveBeenCalled();
	await user.clear(screen.getByLabelText('Date'));
	await user.type(screen.getByLabelText('Date'), '2026-11-20{Enter}');
	expect(change).toHaveBeenCalledWith('2026-11-20');
	for (const state of [{ disabled: true }, { readOnly: true }]) {
		rerender(
			<TestProviders>
				<DateField label="Date" value="2026-11-20" onChange={change} {...state} />
			</TestProviders>,
		);
		expect((screen.getByRole('button', { name: 'Open calendar' }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole('button', { name: 'Clear date' }) as HTMLButtonElement).disabled).toBe(true);
	}
});
test('range reverse draft disables Apply, Cancel preserves committed values and external changes replace draft', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	const view = (from: string, to: string) => (
		<TestProviders>
			<DateRangeField label="Range" value={{ from, to }} onChange={change} />
		</TestProviders>
	);
	const { rerender } = render(view('2026-11-10', '2026-11-20'));
	await user.click(screen.getByRole('button', { name: 'Range' }));
	const end = screen.getByLabelText('End date');
	await user.clear(end);
	await user.type(end, '2026-11-01');
	expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
	expect(screen.getByRole('alert').textContent).toMatch(/must not precede/);
	await user.click(screen.getByRole('button', { name: 'Cancel' }));
	expect(change).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Range' }));
	rerender(view('2026-12-01', '2026-12-10'));
	expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-12-01');
	expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('2026-12-10');
	await user.click(screen.getByRole('button', { name: 'Apply' }));
	expect(change).toHaveBeenCalledExactlyOnceWith({ from: '2026-12-01', to: '2026-12-10' });
});
test('optional range preserves open endpoint and clear emits both null', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	render(
		<TestProviders>
			<DateRangeField value={{ from: '2026-11-20', to: null }} onChange={change} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: '2026-11-20 – …' }));
	await user.click(screen.getByRole('button', { name: 'Apply' }));
	expect(change).toHaveBeenCalledWith({ from: '2026-11-20', to: null });
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(change).toHaveBeenLastCalledWith({ from: null, to: null });
});
test('DateTime preserves structural zone, rejects syntax then delegates domain code/message and associates all controls', async () => {
	const change = vi.fn(),
		validate = vi.fn((value: DateTimeValue) =>
			value.time === '02:30' ? { code: 'domain-gap', message: 'Caller rejects this local time' } : null,
		),
		user = userEvent.setup();
	function Harness() {
		const [value, setValue] = useState<DateTimeValue | null>({
			date: '2026-03-08',
			time: '01:30',
			timeZone: 'America/New_York',
		});
		return (
			<TestProviders>
				<DateTimeField
					label="Date"
					value={value}
					initialTimeZone="Asia/Shanghai"
					validateValue={validate}
					onChange={(next) => {
						setValue(next);
						change(next);
					}}
				/>
			</TestProviders>
		);
	}
	render(<Harness />);
	const time = screen.getByLabelText('Time (HH:mm)');
	await user.clear(time);
	await user.type(time, '24:00{Enter}');
	expect(change).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toMatch(/valid time/);
	expect(time.getAttribute('aria-describedby')).toBeTruthy();
	await user.clear(time);
	await user.type(time, '02:30{Enter}');
	expect(change).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toContain('Caller rejects');
	expect(document.querySelector('[data-error-code="domain-gap"]')).toBeTruthy();
	await user.clear(time);
	await user.type(time, '03:30{Enter}');
	expect(change).toHaveBeenCalledExactlyOnceWith({ date: '2026-03-08', time: '03:30', timeZone: 'America/New_York' });
});

test('DateTime invalid date draft blocks later time edits instead of restoring an older date', async () => {
	const user = userEvent.setup(),
		change = vi.fn();
	function Harness() {
		const [value, setValue] = useState<DateTimeValue | null>({
			date: '2026-11-20',
			time: '09:30',
			timeZone: 'Asia/Shanghai',
		});
		return (
			<TestProviders>
				<DateTimeField
					label="Date"
					value={value}
					initialTimeZone="Asia/Shanghai"
					validateValue={() => null}
					onChange={(next) => {
						setValue(next);
						change(next);
					}}
				/>
			</TestProviders>
		);
	}
	render(<Harness />);
	const date = screen.getByLabelText('Date');
	await user.clear(date);
	await user.type(date, '2026-02-31');
	const time = screen.getByLabelText('Time (HH:mm)');
	await user.clear(time);
	await user.type(time, '10:00{Enter}');
	expect(change).not.toHaveBeenCalled();
	expect((date as HTMLInputElement).value).toBe('2026-02-31');
});

test('required range needs both endpoints and readOnly range has no editable action', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	const { rerender } = render(
		<TestProviders>
			<DateRangeField value={{ from: '2026-11-20', to: null }} onChange={change} required />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: '2026-11-20 – …' }));
	expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Cancel' }));
	rerender(
		<TestProviders>
			<DateRangeField value={{ from: '2026-11-20', to: null }} onChange={change} readOnly />
		</TestProviders>,
	);
	expect((screen.getByRole('button', { name: '2026-11-20 – …' }) as HTMLButtonElement).disabled).toBe(true);
	expect(change).not.toHaveBeenCalled();
});
test('DateTime invalid zone does not call domain validation, clear yields null, controlled updates replace draft', async () => {
	const user = userEvent.setup(),
		change = vi.fn(),
		validate = vi.fn(() => null);
	const view = (time = '09:30') => (
		<TestProviders>
			<DateTimeField
				label="Date"
				value={{ date: '2026-11-20', time, timeZone: 'Asia/Shanghai' }}
				initialTimeZone="UTC"
				validateValue={validate}
				onChange={change}
			/>
		</TestProviders>
	);
	const { rerender } = render(view());
	const zone = screen.getByLabelText('Time zone (IANA)');
	await user.clear(zone);
	await user.type(zone, 'Invalid/Nowhere{Enter}');
	expect(change).not.toHaveBeenCalled();
	expect(validate).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toMatch(/IANA/);
	rerender(view('10:00'));
	expect((zone as HTMLInputElement).value).toBe('Asia/Shanghai');
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(change).toHaveBeenCalledExactlyOnceWith(null);
	expect((screen.getByLabelText('Time (HH:mm)') as HTMLInputElement).value).toBe('');
});

test('controlled required clear keeps empty-value error after the parent accepts null', async () => {
	const user = userEvent.setup();
	function Harness() {
		const [value, setValue] = useState<string | null>('2026-11-20');
		return (
			<TestProviders>
				<DateField label="Date" required value={value} onChange={setValue} />
			</TestProviders>
		);
	}
	render(<Harness />);
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(screen.getByRole('alert').textContent).toMatch(/required/);
	expect(screen.getByLabelText('Date').getAttribute('aria-invalid')).toBe('true');
});
