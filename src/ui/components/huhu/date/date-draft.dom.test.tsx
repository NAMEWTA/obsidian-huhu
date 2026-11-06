import { useState } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { setLanguage } from '../../../../shared/i18n';
import { TestProviders } from '../../../react/test-providers';
import { DateField } from './DateField';

beforeEach(() => setLanguage('en'));
test('parent raw draft survives unmount, ignores semantic changes, and commits only its valid text', () => {
	const change = vi.fn();
	const view = (raw: string, value: string | null = '2026-11-20') => (
		<TestProviders>
			<DateField label="Date" value={value} draftValue={raw} onDraftChange={() => undefined} onChange={change} />
		</TestProviders>
	);
	const first = render(view('2026-02-31'));
	fireEvent.blur(screen.getByLabelText('Date'));
	expect(change).not.toHaveBeenCalled();
	first.unmount();
	const second = render(view('2026-02-31'));
	const input = screen.getByLabelText('Date') as HTMLInputElement;
	expect(input.value).toBe('2026-02-31');
	expect(input.getAttribute('aria-invalid')).toBe('true');
	second.rerender(view('2026-02-31', '2026-12-01'));
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(change).not.toHaveBeenCalled();
	expect(input.value).toBe('2026-02-31');
	input.focus();
	second.rerender(view('2026-12-02', '2026-12-01'));
	expect(screen.getByLabelText('Date')).toBe(input);
	expect(document.activeElement).toBe(input);
	expect(input.value).toBe('2026-12-02');
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(change).not.toHaveBeenCalled();
	fireEvent.compositionEnd(input);
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(change).toHaveBeenCalledExactlyOnceWith('2026-12-02');
	second.rerender(view('', null));
	expect(input.value).toBe('');
});

test('controlled draft publishes typing and clear without replacing the input', () => {
	const change = vi.fn(),
		draft = vi.fn();
	function Harness() {
		const [raw, setRaw] = useState('2026-11-20');
		return (
			<TestProviders>
				<DateField
					label="Date"
					required
					value="2026-11-20"
					draftValue={raw}
					onDraftChange={(text) => {
						setRaw(text);
						draft(text);
					}}
					onChange={change}
				/>
			</TestProviders>
		);
	}
	render(<Harness />);
	const input = screen.getByLabelText('Date') as HTMLInputElement;
	input.focus();
	fireEvent.change(input, { target: { value: 'bad' } });
	expect(draft).toHaveBeenLastCalledWith('bad');
	expect(input.value).toBe('bad');
	expect(document.activeElement).toBe(input);
	fireEvent.blur(input);
	expect(change).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(draft).toHaveBeenLastCalledWith('');
	expect(change).toHaveBeenCalledExactlyOnceWith(null);
	expect(input.value).toBe('');
	expect(input.getAttribute('aria-invalid')).toBe('true');
});
