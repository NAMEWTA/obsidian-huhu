import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import type { DashboardCard, DashboardColumn } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { SectionCards } from '../sections/SectionCards';
import { ProjectCard } from './ProjectCard';
import { TaskList } from './TaskList';
afterEach(cleanup);
// Obsidian's markdown renderer is not part of this test: a task's text is shown as it is.
vi.mock('./MemoBody', async () => {
	const { createElement } = await import('react');
	return {
		MarkdownBody: ({ text }: { text: string }) => createElement('span', null, text),
		MemoBody: () => null,
	};
});

const task = (text: string, checked = false) => ({ text, checked, children: [], collapsed: false, id: text });
const card = (id: string, type: DashboardCard['type'], extra: Partial<DashboardCard> = {}): DashboardCard =>
	({
		id,
		title: `Card ${id}`,
		type,
		column: 'Todo',
		body: '',
		tasks: [],
		docs: [],
		url: '',
		wikiLink: '',
		progress: -1,
		streak: 0,
		dueDate: '',
		blockquote: '',
		color: '',
		coverImage: '',
		...extra,
	}) as DashboardCard;
function store(files: unknown[] = []) {
	setLanguage('en');
	const sync = { toggleTask: vi.fn(async () => {}), addTask: vi.fn(async () => {}), addDocToCard: vi.fn(async () => {}) };
	return {
		state: createStore(() => ({ files, path: 'Board', data: { columns: [] }, settings: {} })),
		sync,
		host: { app: { vault: { getFiles: () => files, getAllLoadedFiles: () => [], on: () => ({}), offref: () => {} } } },
		memoDrafts: new Map(),
		memoDraftKey: (id: string) => id,
		image: async () => '',
		newNote: vi.fn(async () => 'x.md'),
		openFile: vi.fn(async () => {}),
	} as unknown as BoardStore & { sync: typeof sync };
}

test('section cards are equal-width columns of the tile and never scroll sideways', () => {
	const s = store();
	const column = {
		name: 'Todo',
		color: '',
		sectionType: 'todo',
		cards: [card('a', 'task'), card('b', 'task'), card('c', 'task')],
	} as DashboardColumn;
	const { container } = render(
		<TestProviders>
			<SectionCards store={s} column={column} projects={false} />
		</TestProviders>,
	);
	const grid = container.querySelector('[data-card-grid]') as HTMLElement;
	expect(grid.className).toContain('grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]');
	expect(grid.className).not.toContain('overflow-x');
	expect(grid.className).toContain('overflow-y-auto');
	expect(grid.children).toHaveLength(3);
	for (const child of grid.children) {
		expect(child.className).toContain('min-w-0');
		expect(child.className).not.toMatch(/\bw-\[\d+px\]/);
		expect(child.className).not.toContain('shrink-0');
	}
});
test('a section without cards shows an empty state instead of a blank tile', () => {
	const column = { name: 'Memo', color: '', sectionType: 'memo', cards: [] } as unknown as DashboardColumn;
	const { container } = render(
		<TestProviders>
			<SectionCards store={store()} column={column} projects={false} />
		</TestProviders>,
	);
	expect(container.querySelector('[data-card-grid]')).toBeNull();
	const empty = container.querySelector('[data-slot="empty-state"]')!;
	expect(empty.textContent).toContain(t('home.dashboard.noCards'));
});
test('a task list is a checkbox per task, a 36px add field and a progress bar', () => {
	const s = store();
	const c = card('t', 'task', { tasks: [task('First'), task('Second', true), task('Third')] as DashboardCard['tasks'] });
	const { container } = render(
		<TestProviders>
			<TaskList store={s} card={c} />
		</TestProviders>,
	);
	expect(screen.getAllByRole('checkbox')).toHaveLength(3);
	const input = screen.getByLabelText(t('home.dashboard.addTask'));
	expect(input.className).toContain('h-9');
	expect(input.className).not.toMatch(/(^| )h-7( |$)/);
	const bar = screen.getByRole('progressbar');
	expect(bar.getAttribute('aria-valuenow')).toBe('33');
	expect(container.textContent).toContain('33%');
	fireEvent.change(input, { target: { value: 'Fourth' } });
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(s.sync.addTask).toHaveBeenCalledWith('t', 'Fourth');
});
const vaultFile = (path: string, mtime = 0) => ({
	path,
	basename: path.split('/').pop()!.replace(/\.\w+$/, ''),
	extension: path.split('.').pop()!,
	stat: { mtime },
});
test('a project is a vault folder: its notes newest first with their file icon, the note finder and the new-note button on one aligned row', () => {
	const files = [
		vaultFile('Projects/Alpha/Old.md', 1),
		vaultFile('Projects/Alpha/Sub/Newest.md', 9),
		vaultFile('Projects/Beta/Other.md', 5),
	].sort((a, b) => b.stat.mtime - a.stat.mtime);
	const s = store(files);
	const c = card('p', 'project', { folder: 'Projects/Alpha', progress: 40 });
	const { container } = render(
		<TestProviders>
			<ProjectCard store={s} card={c} />
		</TestProviders>,
	);
	const list = container.querySelector('[data-project-recent]') as HTMLElement;
	expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(['Newest', 'Old']);
	expect(within(list).queryByRole('button', { name: 'Other' })).toBeNull();
	expect(list.querySelector('span[aria-hidden="true"]')).toBeTruthy();
	fireEvent.click(within(list).getByRole('button', { name: 'Old' }));
	expect(s.openFile).toHaveBeenCalledWith('Projects/Alpha/Old.md', true);
	const finder = screen.getByLabelText(t('home.dashboard.findNote'));
	const row = finder.parentElement as HTMLElement;
	expect(row.className).toContain('flex');
	expect(finder.className).toContain('flex-1');
	expect(within(row).getByRole('button', { name: t('home.dashboard.newNote') })).toBeTruthy();
	expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
});
test('the new-note button makes the note in the project folder; the finder only looks inside it and pins the pick', () => {
	const files = [vaultFile('Projects/Alpha/Roadmap.md', 3), vaultFile('Projects/Beta/Road.md', 2)];
	const s = store(files);
	const c = card('p', 'project', { folder: 'Projects/Alpha' });
	render(
		<TestProviders>
			<ProjectCard store={s} card={c} />
		</TestProviders>,
	);
	const finder = screen.getByLabelText(t('home.dashboard.findNote'));
	fireEvent.change(finder, { target: { value: 'rdmp' } });
	const matches = document.querySelector('[data-project-matches]') as HTMLElement;
	expect(within(matches).getAllByRole('button').map((b) => b.title)).toEqual(['Projects/Alpha/Roadmap.md']);
	fireEvent.click(within(matches).getByRole('button'));
	expect(s.sync.addDocToCard).toHaveBeenCalledWith('p', 'Projects/Alpha/Roadmap.md');
	fireEvent.change(finder, { target: { value: 'Plan' } });
	fireEvent.click(screen.getByRole('button', { name: t('home.dashboard.newNote') }));
	expect(s.newNote).toHaveBeenCalledWith('Projects/Alpha', 'Plan', '');
});
test('a project without a folder asks for one', () => {
	render(
		<TestProviders>
			<ProjectCard store={store()} card={card('p', 'project')} />
		</TestProviders>,
	);
	expect(screen.getByText(t('home.project.chooseFolder'))).toBeTruthy();
	expect(screen.getByRole('combobox', { name: t('home.project.folder') })).toBeTruthy();
});
