import { useState } from 'react';
import type { App } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { ExpenseApplication } from '../../core/expense/application';
import type { ExpenseService } from '../../platform/expense/expense-service';
import { ExpenseEntryPanel } from './ExpenseEntryPanel';
import { ExpenseStatsPanel } from './ExpenseStatsPanel';
import { RecordDialog } from '../dialogs/RecordDialog';
import type { TextStorage } from '../../../../shared/storage/ports';
const data = new Map<string, string>();
const memory: TextStorage = {
	exists: async (path) => data.has(path),
	read: async (path) => data.get(path) ?? '',
	write: async (path, value) => {
		data.set(path, value);
	},
	mkdir: async () => {},
};
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
function service() {
	data.clear();
	setLanguage('en');
	vi.useFakeTimers({ now: new Date('2026-10-14T12:00:00'), toFake: ['Date'] });
	return new ExpenseApplication(memory, 'data', () => '$') as ExpenseService;
}
test('backfill rejects future dates and saves a full entry only on confirmation', () => {
	const s = service(),
		save = vi.fn(() => true),
		close = vi.fn();
	render(
		<TestProviders>
			<ExpenseEntryPanel service={s} onSave={save} close={close} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText(t('expense.dateLabel')), { target: { value: '2026-10-15' } });
	fireEvent.change(screen.getByLabelText(t('expense.colAmount')), { target: { value: '12.50' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save).not.toHaveBeenCalled();
	expect(screen.getByRole('alert').textContent).toBe(t('expense.futureDate'));
	fireEvent.change(screen.getByLabelText(t('expense.dateLabel')), { target: { value: '2026-10-13' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save).toHaveBeenCalledExactlyOnceWith({
		type: 'expense',
		amount: 12.5,
		category: 'food',
		date: '2026-10-13',
		note: '',
	});
	expect(close).toHaveBeenCalledTimes(1);
});
test('statistics delete keeps the record on cancel and deletes only after confirmation', async () => {
	const s = service();
	s.addRecord({ type: 'expense', amount: 10, category: 'food', date: '2026-10-14' });
	await s.flush();
	render(
		<TestProviders>
			<ExpenseStatsPanel service={s} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('expense.deleteRecord') }));
	await screen.findByRole('alertdialog');
	await waitFor(() => expect(document.activeElement?.textContent).toBe(t('common.cancel')));
	fireEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
	expect(s.getRecords()).toHaveLength(1);
	fireEvent.click(screen.getByRole('button', { name: t('expense.deleteRecord') }));
	fireEvent.click(screen.getByRole('button', { name: t('common.confirm') }));
	expect(s.getRecords()).toHaveLength(0);
	await s.flush();
});

function StatisticsFixture() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button onClick={() => setOpen(true)}>Open statistics</button>
			{open && (
				<RecordDialog
					title="Statistics"
					classes="dashboard-pomodoro-stats-modal"
					onClose={() => setOpen(false)}
				>
					<button onClick={() => setOpen(false)}>Close statistics</button>
				</RecordDialog>
			)}
		</>
	);
}
test('Escape returns focus to the statistics opener', async () => {
	render(
		<TestProviders>
			<StatisticsFixture />
		</TestProviders>,
	);
	const opener = screen.getByRole('button', { name: 'Open statistics' });
	opener.focus();
	fireEvent.click(opener);
	const dialog = await screen.findByRole('dialog');
	fireEvent.keyDown(dialog, { key: 'Escape' });
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	expect(document.activeElement).toBe(opener);
});

test('analysis keeps metrics, chart data, rows and export on the same month/type/category filter', async () => {
	const s = service();
	s.addRecord({ type: 'expense', amount: 0.1, category: 'food', date: '2026-10-14', note: 'Food current' });
	s.addRecord({ type: 'expense', amount: 0.2, category: 'transport', date: '2026-10-14', note: 'Travel current' });
	s.addRecord({ type: 'income', amount: 1, category: 'salary', date: '2026-10-14', note: 'Income current' });
	s.addRecord({ type: 'expense', amount: 50, category: 'food', date: '2026-09-14', note: 'Previous month' });
	const existingPath = 'huhu/exports/expense-export-2026-10-14.csv';
	const files = new Map([[existingPath, 'Existing export must survive']]);
	const folders = new Set<string>();
	const exists = (path: string) => files.has(path) || folders.has(path);
	const create = vi.fn(async (path: string, body: string) => {
		if (exists(path)) throw new Error('File already exists');
		files.set(path, body);
		return { path };
	});
	const app = {
		vault: {
			adapter: {
				exists: async (path: string) => exists(path),
				mkdir: async (path: string) => {
					folders.add(path);
				},
			},
			getAbstractFileByPath: (path: string) => (exists(path) ? { path } : null),
			create,
		},
	} as unknown as App;
	Object.assign(s, { getApp: () => app });
	render(
		<TestProviders>
			<ExpenseStatsPanel service={s} />
		</TestProviders>,
	);
	const detail = () => screen.getAllByRole('table').at(-1)!;
	expect(within(detail()).getAllByRole('row')).toHaveLength(4);
	expect(within(detail()).queryByText('Previous month')).toBeNull();
	expect(screen.getByRole('button', { name: /Expense.*\$0.3/ })).toBeTruthy();
	await choose(t('analytics.allTypes'), t('expense.expenseLabel'));
	await choose(t('analytics.allCategories'), t('expense.cat.food'));
	expect(within(detail()).getAllByRole('row')).toHaveLength(2);
	fireEvent.click(screen.getByRole('button', { name: t('analytics.export') }));
	await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
	const exportPath = 'huhu/exports/expense-export-2026-10-14-2.csv';
	expect(create.mock.calls[0]?.[0]).toBe(exportPath);
	expect(folders).toEqual(new Set(['huhu', 'huhu/exports']));
	expect(files.get(existingPath)).toBe('Existing export must survive');
	expect(files.size).toBe(2);
	const csv = files.get(exportPath)!;
	expect(csv).toContain('Food current');
	expect(csv).not.toContain('Travel current');
	expect(csv).not.toContain('Previous month');
	expect(csv).not.toContain('Income current');
	fireEvent.click(screen.getByRole('button', { name: t('analytics.previous') }));
	expect(within(detail()).getByText('Previous month')).toBeTruthy();
	expect(within(detail()).queryByText('Food current')).toBeNull();
	await s.flush();
});

test('statistics tell empty, filtered-out and zero-net ranges apart and state the unit', async () => {
	const summary = () => document.querySelector('[data-expense-summary]')!.textContent;
	const s = service();
	render(
		<TestProviders>
			<ExpenseStatsPanel service={s} />
		</TestProviders>,
	);
	expect(screen.getByText(/No records in/)).toBeTruthy();
	expect(summary()).toContain('Amounts in $');
	expect(screen.queryByRole('table')).toBeNull();
	cleanup();
	const z = service();
	z.addRecord({ type: 'expense', amount: 1, category: 'food', date: '2026-10-14' });
	render(
		<TestProviders>
			<ExpenseStatsPanel service={z} />
		</TestProviders>,
	);
	expect(summary()).toContain('records: 1');
	expect(summary()).toContain('net $-1');
	await choose(t('analytics.allTypes'), t('expense.incomeLabel'));
	expect(screen.getByText(/match the current filters/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: t('expense.stats.clearFilters') }));
	expect(summary()).toContain('records: 1');
});

async function choose(label: string, option: string) {
	fireEvent.pointerDown(screen.getByRole('combobox', { name: label }), {
		button: 0,
		ctrlKey: false,
		pointerType: 'mouse',
	});
	fireEvent.click(await screen.findByRole('option', { name: option }));
}
