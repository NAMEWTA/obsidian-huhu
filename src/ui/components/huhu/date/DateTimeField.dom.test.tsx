import { useState } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../react/test-providers';
import { DateTimeField } from './DateTimeField';
import { isTimeZone, validateDate, validateTime, type DateTimeValue } from './date-value';
import { setLanguage } from '../../../../shared/i18n';

beforeEach(() => setLanguage('en'));

const initial: DateTimeValue = { date: '2026-11-06', time: '12:30', timeZone: 'UTC' };

test('raw date/time/zone drafts reach the parent before a successful value can be committed', async () => {
	const draft = vi.fn(),
		change = vi.fn();
	render(
		<TestProviders>
			<DateTimeField
				label="Reminder"
				value={initial}
				initialTimeZone="UTC"
				onChange={change}
				validateValue={() => null}
				onDraftChange={draft}
			/>
		</TestProviders>,
	);
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith(initial));
	fireEvent.change(screen.getByLabelText('Time (HH:mm)'), { target: { value: '25:' } });
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith({ ...initial, time: '25:' }));
	fireEvent.change(screen.getByLabelText('Time zone (IANA)'), { target: { value: 'Invalid/' } });
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith({ ...initial, time: '25:', timeZone: 'Invalid/' }));
	fireEvent.change(screen.getByLabelText('Reminder'), { target: { value: '2026-02-31' } });
	await waitFor(() =>
		expect(draft).toHaveBeenLastCalledWith({ date: '2026-02-31', time: '25:', timeZone: 'Invalid/' }),
	);
	expect(change).not.toHaveBeenCalled();
});

test('an unrelated save cannot persist the old valid instant while a local time draft is incomplete', async () => {
	const save = vi.fn();
	function Form() {
		const [raw, setRaw] = useState(initial),
			[title, setTitle] = useState('Original');
		const valid = !!raw.date && !validateDate(raw.date) && validateTime(raw.time) && isTimeZone(raw.timeZone);
		return (
			<>
				<input aria-label="Title" value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
				<DateTimeField
					label="Reminder"
					value={initial}
					initialTimeZone="UTC"
					onChange={() => {}}
					validateValue={() => null}
					onDraftChange={(next) => setRaw(next)}
				/>
				<button disabled={!valid} onClick={() => save({ title, reminder: initial })}>
					Save record
				</button>
			</>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.clear(screen.getByLabelText('Time (HH:mm)'));
	await user.type(screen.getByLabelText('Time (HH:mm)'), '12:');
	await user.type(screen.getByLabelText('Title'), ' edited');
	const button = screen.getByRole('button', { name: 'Save record' }) as HTMLButtonElement;
	expect(button.disabled).toBe(true);
	await user.click(button);
	expect(save).not.toHaveBeenCalled();
	await user.type(screen.getByLabelText('Time (HH:mm)'), '30');
	await waitFor(() => expect(button.disabled).toBe(false));
	await user.click(button);
	expect(save).toHaveBeenCalledExactlyOnceWith({ title: 'Original edited', reminder: initial });
});

test('IME drafts, controlled reset and clear publish raw state without duplicate committed values', async () => {
	const draft = vi.fn(),
		change = vi.fn();
	const field = (value: DateTimeValue | null) => (
		<TestProviders>
			<DateTimeField
				label="Reminder"
				value={value}
				initialTimeZone="UTC"
				validateValue={() => null}
				onChange={change}
				onDraftChange={draft}
			/>
		</TestProviders>
	);
	const view = render(field(initial));
	const time = screen.getByLabelText('Time (HH:mm)');
	fireEvent.compositionStart(time);
	fireEvent.change(time, { target: { value: '未完成' } });
	fireEvent.keyDown(time, { key: 'Enter', isComposing: true });
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith({ ...initial, time: '未完成' }));
	expect(change).not.toHaveBeenCalled();
	fireEvent.compositionEnd(time);
	const reset = { date: '2026-12-07', time: '09:00', timeZone: 'Asia/Shanghai' };
	view.rerender(field(reset));
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith(reset));
	await userEvent.setup().click(screen.getByRole('button', { name: 'Clear date' }));
	await waitFor(() => expect(draft).toHaveBeenLastCalledWith({ date: '', time: '', timeZone: 'Asia/Shanghai' }));
	expect(change).toHaveBeenCalledExactlyOnceWith(null);
	const count = draft.mock.calls.length;
	view.unmount();
	await Promise.resolve();
	expect(draft).toHaveBeenCalledTimes(count);
});


test.each([
 { ...initial, time: '09:00' },
 { ...initial, timeZone: 'Asia/Shanghai' },
])('same-date controlled reset synchronizes raw drafts without replacing the focused date input: %j', async (reset) => {
 const draft = vi.fn(), change = vi.fn();
 const field = (value: DateTimeValue) => <TestProviders><DateTimeField label="Reminder" value={value} initialTimeZone="UTC" validateValue={() => null} onChange={change} onDraftChange={draft} /></TestProviders>;
 const view = render(field(initial));
 const input = screen.getByLabelText('Reminder') as HTMLInputElement;
 input.focus();
 fireEvent.compositionStart(input);
 fireEvent.change(input, { target: { value: '2026-02-31' } });
 expect(draft).toHaveBeenLastCalledWith({ ...initial, date: '2026-02-31' });
 view.rerender(field(reset));
 await waitFor(() => expect(draft).toHaveBeenLastCalledWith(reset));
 expect(screen.getByLabelText('Reminder')).toBe(input);
 expect(document.activeElement).toBe(input);
 expect(input.value).toBe(reset.date);
 fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
 expect(change).not.toHaveBeenCalled();
 fireEvent.compositionEnd(input);
 fireEvent.change(input, { target: { value: '2026-11-07' } });
 fireEvent.keyDown(input, { key: 'Enter' });
 expect(change).toHaveBeenLastCalledWith({ ...reset, date: '2026-11-07' });
});
