import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setLanguage } from '../../../../shared/i18n';
import { TestProviders } from '../../../react/test-providers';
import { MonthField } from './MonthField';

beforeEach(() => setLanguage('en'));

test('month input retains precision, rejects day values and forwards invalid raw drafts', async () => {
	const change = vi.fn(),
		draft = vi.fn(),
		user = userEvent.setup();
	render(
		<TestProviders>
			<MonthField label="Acquired" value="2026-11" onChange={change} onDraftChange={draft} />
		</TestProviders>,
	);
	const input = screen.getByLabelText('Acquired');
	await user.clear(input);
	await user.type(input, '2026-11-06{Enter}');
	expect(change).not.toHaveBeenCalled();
	expect(draft).toHaveBeenLastCalledWith('2026-11-06');
	expect(input.getAttribute('aria-invalid')).toBe('true');
	await user.clear(input);
	await user.type(input, '2027-02{Enter}');
	expect(change).toHaveBeenCalledExactlyOnceWith('2027-02');
});

test('month picker commits a month only, respects bounds and supports clear plus controlled reset', async () => {
	const change = vi.fn(),
		draft = vi.fn(),
		user = userEvent.setup();
	const field = (value: string | null) => (
		<TestProviders>
			<MonthField
				label="Acquired"
				value={value}
				min="2026-03"
				max="2026-10"
				onChange={change}
				onDraftChange={draft}
			/>
		</TestProviders>
	);
	const view = render(field('2026-06'));
	await user.click(screen.getByRole('button', { name: 'Choose month' }));
	expect((screen.getByRole('button', { name: 'February' }) as HTMLButtonElement).disabled).toBe(true);
	await user.click(screen.getByRole('button', { name: 'September' }));
	expect(change).toHaveBeenCalledExactlyOnceWith('2026-09');
	expect(draft).toHaveBeenLastCalledWith('2026-09');
	view.rerender(field('2026-04'));
	expect((screen.getByLabelText('Acquired') as HTMLInputElement).value).toBe('2026-04');
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(change).toHaveBeenLastCalledWith(null);
	expect(draft).toHaveBeenLastCalledWith('');
});

test('IME Enter does not commit and read-only month fields cannot open or change', async () => {
	const change = vi.fn(),
		user = userEvent.setup();
	const view = render(
		<TestProviders>
			<MonthField label="Acquired" value={null} onChange={change} />
		</TestProviders>,
	);
	const input = screen.getByLabelText('Acquired');
	fireEvent.change(input, { target: { value: '2026-05' } });
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(change).not.toHaveBeenCalled();
	fireEvent.compositionEnd(input);
	await user.keyboard('{Enter}');
	// The preceding synthetic key does not move focus; commit through the actual input.
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(change).toHaveBeenCalledWith('2026-05');
	view.rerender(
		<TestProviders>
			<MonthField label="Acquired" value="2026-06" onChange={change} readOnly />
		</TestProviders>,
	);
	change.mockClear();
	await user.type(screen.getByLabelText('Acquired'), '2027-01');
	await user.click(screen.getByRole('button', { name: 'Choose month' }));
	expect(change).not.toHaveBeenCalled();
	await waitFor(() => expect(screen.queryByRole('button', { name: 'January' })).toBeNull());
});
