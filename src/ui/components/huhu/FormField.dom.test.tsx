import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { FormField } from './FormField';
import { Input } from '../input';
import { Checkbox } from '../checkbox';
import { SegmentedControl, SettingsSwitch } from './SettingsFormControls';

test('field label, description and validation error identify the input', async () => {
	const user = userEvent.setup();
	render(
		<FormField label="Name" description="Use a unique name" error="Already exists">
			<Input />
		</FormField>,
	);
	const field = screen.getByRole('textbox');
	expect(screen.getByLabelText('Name')).toBe(field);
	expect(field.getAttribute('aria-invalid')).toBe('true');
	const description = field
		.getAttribute('aria-describedby')!
		.split(' ')
		.map((id) => field.ownerDocument.getElementById(id)?.textContent)
		.join(' ');
	expect(description).toContain('Use a unique name');
	expect(description).toContain('Already exists');
	await user.click(screen.getByText('Name'));
	expect(field.ownerDocument.activeElement).toBe(field);
});

test('segmented single selection has one tab stop and arrow keys skip disabled choices', async () => {
	const user = userEvent.setup();
	const change = vi.fn();
	render(
		<SegmentedControl
			value="a"
			onChange={change}
			ariaLabel="View"
			options={[
				{ value: 'a', label: 'List' },
				{ value: 'b', label: 'Board', disabled: true },
				{ value: 'c', label: 'Calendar' },
			]}
		/>,
	);
	const list = screen.getByRole('radio', { name: 'List' });
	const board = screen.getByRole('radio', { name: 'Board' });
	const calendar = screen.getByRole('radio', { name: 'Calendar' });
	expect(board.tabIndex).toBe(-1);
	expect(calendar.tabIndex).toBe(-1);
	await user.tab();
	expect(list.ownerDocument.activeElement).toBe(list);
	expect(list.tabIndex).toBe(0);
	await user.keyboard('{ArrowRight}');
	await waitFor(() => expect(change).toHaveBeenCalledWith('c'));
	expect(calendar.ownerDocument.activeElement).toBe(calendar);
});

test('busy switch stays at its real value and blocks a repeated toggle', async () => {
	const user = userEvent.setup();
	const change = vi.fn();
	render(<SettingsSwitch checked onChange={change} ariaLabel="Enabled" busy />);
	const control = screen.getByRole('switch', { name: 'Enabled' });
	expect(control.getAttribute('aria-checked')).toBe('true');
	expect(control.getAttribute('aria-busy')).toBe('true');
	expect((control as HTMLButtonElement).disabled).toBe(true);
	await user.click(control);
	expect(change).not.toHaveBeenCalled();
});

test('mixed checkboxes preserve the mixed ARIA value and pending changes stay disabled', async () => {
	const user = userEvent.setup();
	const change = vi.fn();
	render(<Checkbox aria-label="Select tasks" checked="indeterminate" busy onCheckedChange={change} />);
	const checkbox = screen.getByRole('checkbox', { name: 'Select tasks' });
	expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
	expect(checkbox.getAttribute('aria-busy')).toBe('true');
	expect((checkbox as HTMLButtonElement).disabled).toBe(true);
	await user.click(checkbox);
	expect(change).not.toHaveBeenCalled();
});

test('clicking a segmented choice requests a single change', async () => {
	const user = userEvent.setup();
	const change = vi.fn();
	render(
		<SegmentedControl
			value="a"
			onChange={change}
			ariaLabel="View"
			options={[
				{ value: 'a', label: 'List' },
				{ value: 'b', label: 'Calendar' },
			]}
		/>,
	);
	await user.click(screen.getByRole('radio', { name: 'Calendar' }));
	expect(change).toHaveBeenCalledExactlyOnceWith('b');
});

test('segmented values preserve empty strings and distinguish numeric from string values', async () => {
	const user = userEvent.setup();
	const change = vi.fn();
	render(
		<SegmentedControl<string | number>
			value=""
			onChange={change}
			ariaLabel="Choice"
			options={[
				{ value: '', label: 'Automatic' },
				{ value: 1, label: 'Numeric' },
				{ value: '1', label: 'Text' },
			]}
		/>,
	);
	expect(screen.getByRole('radio', { name: 'Automatic' }).getAttribute('aria-checked')).toBe('true');
	await user.click(screen.getByRole('radio', { name: 'Text' }));
	expect(change).toHaveBeenCalledExactlyOnceWith('1');
});

test('wrapped short choices keep one pointer change and skip disabled choices with the keyboard', async () => {
	const user = userEvent.setup();
	const changed = vi.fn();
	function WrappedChoices() {
		const [value, setValue] = useState('year');
		return (
			<SegmentedControl
				wrap
				value={value}
				ariaLabel="日期"
				options={[
					{ value: 'year', label: '年' },
					{ value: 'month', label: '月' },
					{ value: 'day', label: '日', disabled: true },
				]}
				onChange={(next) => {
					setValue(next);
					changed(next);
				}}
			/>
		);
	}
	render(<WrappedChoices />);
	await user.click(screen.getByRole('radio', { name: '月' }));
	expect(changed).toHaveBeenCalledExactlyOnceWith('month');
	expect(screen.getByRole('radio', { name: '月' }).getAttribute('aria-checked')).toBe('true');
	await user.keyboard('{ArrowRight}');
	await waitFor(() => expect(screen.getByRole('radio', { name: '年' }).getAttribute('aria-checked')).toBe('true'));
	expect(screen.getByRole('radio', { name: '年' }).ownerDocument.activeElement).toBe(
		screen.getByRole('radio', { name: '年' }),
	);
	expect(changed.mock.calls.map(([value]) => value)).toEqual(['month', 'year']);
	expect((screen.getByRole('radio', { name: '日' }) as HTMLButtonElement).disabled).toBe(true);
});
