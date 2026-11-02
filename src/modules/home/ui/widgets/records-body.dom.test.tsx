import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { ExpenseApplication } from '../../core/expense/application';
import type { ExpenseService } from '../../platform/expense/expense-service';
import type { TextStorage } from '../../../../shared/storage/ports';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { isRecentUserDocument } from '../../core/board/recent-doc-policy';
import { RecentWidget } from '../canvas/RecentWidget';
import { QuickNotesWidget } from '../quickbar/QuickNotesWidget';
import { ExpenseWidget } from './ExpenseWidget';
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
const memory: TextStorage = {
	exists: async () => false,
	read: async () => '',
	write: async () => {},
	mkdir: async () => {},
};
function expenseStore() {
	setLanguage('en');
	vi.useFakeTimers({ now: new Date('2026-10-14T12:00:00'), toFake: ['Date'] });
	const service = new ExpenseApplication(memory, 'data', () => '$') as ExpenseService;
	service.addRecord({ type: 'expense', amount: 10, category: 'food', date: '2026-10-14', note: '' });
	service.addRecord({ type: 'expense', amount: 30, category: 'transport', date: '2026-10-02', note: '' });
	service.addRecord({ type: 'income', amount: 500, category: 'salary', date: '2026-10-14', note: '' });
	const store = {
		state: createStore(() => ({ widgetRevision: 0 })),
		widgets: { expense: service },
	} as unknown as BoardStore;
	return { store, service };
}
test('the expense widget shows the month first, then the entry form and the category bars as the tile grows', () => {
	const { store, service } = expenseStore();
	const { container } = render(
		<TestProviders>
			<ExpenseWidget store={store} />
		</TestProviders>,
	);
	// no title of its own: the card around it draws it
	expect(container.querySelector('h3')).toBeNull();
	expect(screen.getByTestId('expense-month').textContent).toBe('$40.00');
	// small tile: the summary alone, the form is hidden until the tile is 20rem wide
	const form = container.querySelector('[data-expense-form]') as HTMLElement;
	expect(form.className).toContain('hidden');
	expect(form.className).toContain('@xs:flex');
	const breakdown = container.querySelector('[data-expense-breakdown]') as HTMLElement;
	expect(breakdown.className).toContain('@3xl:flex');
	expect(breakdown.textContent).toContain(t('expense.cat.transport'));
	// both text fields are one 36px row high and fill their row
	for (const input of within(form).getAllByRole('textbox')) expect(input.className).toContain('h-9');
	const amount = within(form).getByLabelText(t('expense.colAmount'));
	fireEvent.change(amount, { target: { value: '7.5' } });
	fireEvent.keyDown(amount, { key: 'Enter' });
	expect(service.getTodayTotals().expense).toBe(17.5);
	expect((amount as HTMLInputElement).value).toBe('');
});
function boardStore(files: unknown[], settings = {}) {
	setLanguage('en');
	return {
		state: createStore(() => ({
			files,
			path: 'Board',
			settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), recentDocCount: 5, ...settings },
		})),
		openFile: vi.fn(async () => {}),
		isRecentDocument: (path: string) => isRecentUserDocument(path, {}),
	} as unknown as BoardStore;
}
test('recent notes are 36px rows with a default file icon, and an empty list says so', () => {
	const files = ['Notes/A.md', 'Notes/B.pdf'].map((path) => ({
		path,
		basename: path
			.split('/')
			.pop()!
			.replace(/\.\w+$/, ''),
		extension: path.split('.').pop()!,
		stat: { mtime: Date.now() },
	}));
	const store = boardStore(files);
	const view = render(
		<TestProviders>
			<RecentWidget store={store} />
		</TestProviders>,
	);
	const list = view.container.querySelector('[data-recent]') as HTMLElement;
	expect(list.className).toContain('overflow-y-auto');
	const rows = within(list).getAllByRole('button');
	expect(rows.length).toBeGreaterThan(0);
	for (const row of rows) {
		expect(row.className).toContain('h-9');
		expect(row.querySelector('span[aria-hidden="true"]')).toBeTruthy();
	}
	fireEvent.click(rows[0]!);
	expect(store.openFile).toHaveBeenCalled();
	view.unmount();
	const empty = render(
		<TestProviders>
			<RecentWidget store={boardStore([])} />
		</TestProviders>,
	);
	expect(empty.container.querySelector('[data-slot="empty-state"]')?.textContent).toContain(t('recent.empty'));
	expect(empty.container.querySelector('[data-recent]')).toBeNull();
});
test('quick notes is a list of buttons, each making a note in its own folder and opening it; with none it offers to add one', () => {
	const newNote = vi.fn(async () => 'Journal/x.md');
	const store = {
		...boardStore([], {
			quickNotePresets: [
				{
					id: 'a',
					icon: 'file-plus',
					label: 'Journal',
					folder: 'Journal',
					templatePath: 'T.md',
					filename: 'YYYY-MM-DD',
				},
				{ id: 'b', icon: 'file-plus', label: 'Idea', folder: 'Ideas', templatePath: '', filename: '' },
			],
		}),
		newNote,
	} as unknown as BoardStore;
	const view = render(
		<TestProviders>
			<QuickNotesWidget store={store} />
		</TestProviders>,
	);
	const root = view.container.querySelector('[data-quick-notes]') as HTMLElement;
	const buttons = root.querySelector('[data-quick-buttons]') as HTMLElement;
	expect(buttons.className).toContain('flex-wrap');
	expect(
		within(buttons)
			.getAllByRole('button')
			.map((b) => b.textContent),
	).toEqual(['Journal', 'Idea']);
	expect(root.querySelector('[data-capture]')).toBeNull();
	fireEvent.click(within(buttons).getByRole('button', { name: 'Journal' }));
	expect(newNote).toHaveBeenCalledWith('Journal', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'T.md');
	fireEvent.click(within(buttons).getByRole('button', { name: 'Idea' }));
	expect(newNote).toHaveBeenLastCalledWith('Ideas', expect.stringMatching(/^\d{4}-\d{2}-\d{2}-\d{4}$/), '');
	view.unmount();
	const empty = render(
		<TestProviders>
			<QuickNotesWidget store={boardStore([], { quickNotePresets: [] })} />
		</TestProviders>,
	);
	expect(empty.container.querySelector('[data-slot="empty-state"]')?.textContent).toContain(t('quickNote.empty'));
	expect(within(empty.container).getByRole('button', { name: t('quickNote.addButton') })).toBeTruthy();
});
