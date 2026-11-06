import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setLanguage } from '../../../../shared/i18n';
import type { AnalyticsPeriod } from '../../../../shared/analytics/range';
import { TestProviders } from '../../../react/test-providers';
import { AnalyticsRangeControl, inAnalyticsRange, useAnalyticsRange } from './Analytics';

beforeEach(() => {
	setLanguage('en');
	vi.useFakeTimers({ now: new Date(2026, 10, 6, 12), toFake: ['Date'] });
});
function Harness({ initial = 'custom' }: { initial?: AnalyticsPeriod }) {
	const state = useAnalyticsRange(initial, '2020-01-01');
	return (
		<TestProviders>
			<AnalyticsRangeControl state={state} />
			<output data-testid="committed">{JSON.stringify({ custom: state.custom, range: state.range })}</output>
		</TestProviders>
	);
}
const committed = () => JSON.parse(screen.getByTestId('committed').textContent!);
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

test('custom analytics uses the public range field without native date inputs', () => {
	const { container } = render(<Harness />);
	expect(container.querySelectorAll('input[type="date"],input[type="datetime-local"]')).toHaveLength(0);
	expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy();
});

test.each([
	['2026-02-30', '2026-11-12'],
	['2026-11-12', '2026-11-10'],
	['', '2026-11-12'],
	['2026-11-10', ''],
	['', ''],
])('invalid, reversed or required-empty custom draft %s/%s cannot commit and Cancel resets', async (from, to) => {
	const user = userEvent.setup();
	render(<Harness />);
	const before = committed();
	await user.click(screen.getByRole('button', { name: 'Custom' }));
	edit('Start date', from);
	edit('End date', to);
	expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
	fireEvent.keyDown(screen.getByLabelText('End date'), { key: 'Enter' });
	expect(committed()).toEqual(before);
	await user.click(screen.getByRole('button', { name: 'Cancel' }));
	expect(committed()).toEqual(before);
	await user.click(screen.getByRole('button', { name: 'Custom' }));
	expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe(before.custom.start);
	expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe(before.custom.end);
});

test('complete range commits atomically and retains inclusive filtering and previous-span semantics', async () => {
	const user = userEvent.setup();
	render(<Harness />);
	const before = committed();
	await user.click(screen.getByRole('button', { name: 'Custom' }));
	edit('Start date', '2026-11-10');
	edit('End date', '2026-11-12');
	expect(committed()).toEqual(before);
	await user.click(screen.getByRole('button', { name: 'Apply' }));
	expect(committed()).toEqual({
		custom: { start: '2026-11-10', end: '2026-11-12' },
		range: {
			start: '2026-11-10',
			end: '2026-11-12',
			previousStart: '2026-11-07',
			previousEnd: '2026-11-09',
		},
	});
	expect(
		['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'].filter((date) =>
			inAnalyticsRange(date, committed().range),
		),
	).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
});

test('clear cannot turn a required custom analytics range into an unbounded filter', async () => {
	const user = userEvent.setup();
	render(<Harness />);
	const before = committed();
	await user.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(committed()).toEqual(before);
	await user.click(screen.getByRole('button', { name: 'Custom' }));
	expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe(before.custom.start);
});

test('month previous/next and week/all period selection retain the original hook behavior', async () => {
	const user = userEvent.setup();
	render(<Harness initial="month" />);
	expect(committed().range).toEqual({
		start: '2026-11-01',
		end: '2026-11-30',
		previousStart: '2026-10-01',
		previousEnd: '2026-10-31',
	});
	await user.click(screen.getByRole('button', { name: 'Previous period' }));
	expect(committed().range.start).toBe('2026-10-01');
	await user.click(screen.getByRole('button', { name: 'Next period' }));
	expect(committed().range.start).toBe('2026-11-01');
	await user.click(screen.getByRole('combobox', { name: 'Date range' }));
	await user.click(screen.getByRole('option', { name: /^Week$/ }));
	expect(committed().range.start).toBe('2026-10-26');
	expect(committed().range.end).toBe('2026-11-01');
	await user.click(screen.getByRole('combobox', { name: 'Date range' }));
	await user.click(screen.getByRole('option', { name: 'All time' }));
	expect(committed().range.start).toBe('2020-01-01');
	expect(committed().range.end).toBe('2026-11-01');
	expect(screen.queryByRole('button', { name: 'Previous period' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Next period' })).toBeNull();
});
