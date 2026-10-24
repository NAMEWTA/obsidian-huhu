import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { BoardTitle } from './BoardTitle';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);

function scene(names: string[] = ['Work', ''], path = 'a') {
	const settings = { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), workspaces: { files: ['a', 'b'], names, active: 0 } };
	const host = {
		settings: { dashboardFile: 'b' },
		createWorkspace: vi.fn(async () => {}),
		renameWorkspace: vi.fn(async () => {}),
		switchWorkspace: vi.fn(async () => {}),
	};
	const store = {
		state: createStore(() => ({ path, settings })),
		host,
		switch: vi.fn(async () => {}),
	} as unknown as BoardStore;
	render(
		<TestProviders>
			<WorkspaceSwitcher store={store} />
			<BoardTitle store={store} />
		</TestProviders>,
	);
	return { host, store };
}

test('the switcher and the header show the names of the boards, not their numbers', () => {
	scene();
	const switcher = document.querySelector<HTMLElement>('.dashboard-workspace-switcher')!;
	expect(within(switcher).getAllByRole('button').map((b) => b.textContent)).toEqual(['Work', 'Board 2', '']);
	expect(within(switcher).getByRole('button', { name: 'Work' }).getAttribute('aria-current')).toBe('page');
	expect(document.querySelector('[data-board-title]')!.textContent).toBe('Work');
	// a long name is cut in the pill and kept whole in its title
	cleanup();
	const long = 'A board named with far too many words to fit in the pill';
	scene([long, '']);
	expect(within(document.querySelector<HTMLElement>('.dashboard-workspace-switcher')!).getByRole('button', { name: long }).getAttribute('title')).toBe(long);
});

test('a new board is made with the name that was typed, and the dialog closes after it', async () => {
	const { host, store } = scene();
	fireEvent.click(screen.getByRole('button', { name: t('workbench.newBoard') }));
	const dialog = await screen.findByRole('dialog');
	fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '  Reading list ' } });
	fireEvent.click(within(dialog).getByRole('button', { name: t('common.save') }));
	await waitFor(() => expect(host.createWorkspace).toHaveBeenCalledWith('Reading list'));
	await waitFor(() => expect(store.switch).toHaveBeenCalledWith('b'));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('clicking the name renames the board: Enter saves, Esc keeps the old name', async () => {
	const { host } = scene();
	fireEvent.click(document.querySelector('[data-board-title]')!);
	const input = document.querySelector<HTMLInputElement>('[data-board-title-input]')!;
	expect(input.value).toBe('Work');
	fireEvent.change(input, { target: { value: 'Studio' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	await waitFor(() => expect(host.renameWorkspace).toHaveBeenCalledWith('a', 'Studio'));
	await waitFor(() => expect(document.querySelector('[data-board-title-input]')).toBeNull());
	fireEvent.click(document.querySelector('[data-board-title]')!);
	const again = document.querySelector<HTMLInputElement>('[data-board-title-input]')!;
	fireEvent.change(again, { target: { value: 'Nope' } });
	fireEvent.keyDown(again, { key: 'Escape' });
	expect(document.querySelector('[data-board-title]')).not.toBeNull();
	expect(host.renameWorkspace).toHaveBeenCalledTimes(1);
});
