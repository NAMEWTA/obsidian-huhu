import type { AgentDispatchRequest } from '../../../agent/api';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { DEFAULT_DASHBOARD_SETTINGS, type SkillShortcut } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { FileSearchWidget } from './InputWidgets';
import { SkillWidget } from './SkillWidget';
import { normalizeDashboardSettings } from '../../core/board/settings';
vi.mock('sonner', () => ({ toast: vi.fn(), Toaster: () => null }));
afterEach(cleanup);
function fixture() {
	setLanguage('en');
	const skill: SkillShortcut = {
		id: 'review',
		label: 'Review',
		icon: 'sparkles',
		agentId: 'codex',
		skillName: 'review',
		promptTemplate: '{{input}}',
		directSend: false,
		destination: { kind: 'fresh', cwd: '' },
	};
	const state = createStore(() => ({
		settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), skillWidgetButtons: [skill] },
		path: 'Board',
		data: { skills: [] },
	}));
	const dispatch = vi.fn(async (_request: AgentDispatchRequest) => ({
			invocationId: 'test',
			delivery: 'pasted' as const,
		})),
		openFile = vi.fn(async () => {}),
		save = vi.fn(async () => {});
	const files = ['One', 'Two'].map((name) => ({
		path: `Notes/${name}.md`,
		basename: name,
		extension: 'md',
		stat: { mtime: 0 },
	}));
	const store = {
		state,
		openFile,
		settings: save,
		searchFiles: () => files,
		recentFiles: () => files,
		widgets: { acquireDispatch: async () => ({ dispatch }), agents: () => [{ id: 'codex', title: 'Codex' }] },
	} as unknown as BoardStore;
	return { store, openFile, dispatch, save, skill };
}
test('file search floats results, cancels with Escape and opens the keyboard-selected file', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<FileSearchWidget store={f.store} />
		</TestProviders>,
	);
	const floating = () => document.querySelector('.huhu-portal-root [data-file-results]');
	const input = screen.getByRole('textbox');
	fireEvent.change(input, { target: { value: 'Notes' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	await waitFor(() => expect(floating()?.textContent).toContain('One'));
	fireEvent.keyDown(input, { key: 'Escape' });
	await waitFor(() => expect(floating()).toBeNull());
	expect(f.openFile).not.toHaveBeenCalled();
	fireEvent.keyDown(input, { key: 'Enter' });
	await waitFor(() => expect(floating()?.textContent).toContain('One'));
	fireEvent.keyDown(input, { key: 'ArrowDown' });
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(f.openFile).toHaveBeenCalledExactlyOnceWith('Notes/Two.md', true);
});
test('file search is one 36px row: input fills the line beside the recent and search buttons', () => {
	const f = fixture();
	const { container } = render(
		<TestProviders>
			<FileSearchWidget store={f.store} />
		</TestProviders>,
	);
	const row = container.querySelector('[data-input-widget="search"] > div')!;
	expect(row.className).toContain('flex');
	const input = within(row as HTMLElement).getByRole('textbox');
	expect(input.className).toContain('h-9');
	expect(input.parentElement!.className).toContain('flex-1');
	expect(within(row as HTMLElement).getAllByRole('button')).toHaveLength(2);
});
test('standalone skills preview edited text and keep their configuration separate from board chips', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<SkillWidget store={f.store} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Review' }));
	const prompt = await screen.findByLabelText(t('home.dashboard.prompt'));
	fireEvent.change(prompt, { target: { value: 'Reviewed draft' } });
	fireEvent.click(screen.getByText(t('common.save')));
	await waitFor(() => expect(f.dispatch).toHaveBeenCalledTimes(1));
	expect(f.dispatch.mock.calls[0]?.[0]).toMatchObject({
		finalPrompt: 'Reviewed draft',
		files: [],
		source: { kind: 'widget', path: 'Board.md', id: 'skills' },
	});
	fireEvent.click(screen.getByLabelText(t('skillsWidget.configure')));
	await screen.findByLabelText(t('home.dashboard.name'));
	fireEvent.click(screen.getByText(t('common.cancel')));
	expect(f.save).not.toHaveBeenCalled();
	const normalized = normalizeDashboardSettings({ skillWidgetButtons: [f.skill] });
	expect(normalized.skillWidgetButtons).toEqual([f.skill]);
});

test('skill buttons sit in an equal-width grid and an empty widget says so', () => {
	const f = fixture();
	const view = render(
		<TestProviders>
			<SkillWidget store={f.store} />
		</TestProviders>,
	);
	const grid = view.container.querySelector('[data-skill-grid]')!;
	expect(grid.className).toContain('grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]');
	expect(within(grid as HTMLElement).getAllByRole('button')).toHaveLength(1);
	expect(view.container.querySelector('[data-slot="empty-state"]')).toBeNull();
	view.unmount();
	f.store.state.setState({ settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), skillWidgetButtons: [] } });
	const empty = render(
		<TestProviders>
			<SkillWidget store={f.store} />
		</TestProviders>,
	);
	expect(empty.container.querySelector('[data-slot="empty-state"]')).toBeTruthy();
	expect(empty.container.querySelector('[data-skill-grid]')).toBeNull();
});
