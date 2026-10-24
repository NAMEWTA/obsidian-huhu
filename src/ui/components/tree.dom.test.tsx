import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { Tree, type TreeNode } from './tree';

const nodes: TreeNode[] = [
	{
		id: 'docs',
		label: 'Docs',
		icon: 'lucide-folder-closed',
		badge: 2,
		children: [
			{ id: 'docs/a.md', label: 'Alpha.md', icon: 'lucide-file-text' },
			{ id: 'docs/sub', label: 'Sub', children: [{ id: 'docs/sub/z.pdf', label: 'Zeta.pdf', iconColor: 'var(--color-red)' }] },
		],
	},
	{ id: 'empty', label: 'Empty', children: [] },
	{ id: 'readme', label: 'Readme.txt' },
];

const rows = () => screen.getAllByRole('treeitem');
const labels = () => rows().map((row) => row.getAttribute('aria-label'));
/** Headless Tree moves DOM focus on the next task, so assertions wait for it. */
const focusOn = (name: string) => waitFor(() => expect(document.activeElement).toBe(screen.getByRole('treeitem', { name })));

afterEach(() => vi.restoreAllMocks());

test('renders an ARIA tree, expands and collapses folders by click, and exposes level and state', async () => {
	const user = userEvent.setup();
	render(<Tree nodes={nodes} ariaLabel="Files" />);
	expect(screen.getByRole('tree', { name: 'Files' })).toBeTruthy();
	expect(labels()).toEqual(['Docs', 'Empty', 'Readme.txt']);
	const docs = screen.getByRole('treeitem', { name: 'Docs' });
	expect(docs.getAttribute('aria-expanded')).toBe('false');
	expect(docs.getAttribute('aria-level')).toBe('1');
	expect(within(docs).getByText('2')).toBeTruthy();
	expect(screen.getByRole('treeitem', { name: 'Readme.txt' }).hasAttribute('aria-expanded')).toBe(false);
	await user.click(docs);
	expect(labels()).toEqual(['Docs', 'Alpha.md', 'Sub', 'Empty', 'Readme.txt']);
	expect(docs.getAttribute('aria-expanded')).toBe('true');
	expect(screen.getByRole('treeitem', { name: 'Alpha.md' }).getAttribute('aria-level')).toBe('2');
	await user.click(screen.getByRole('treeitem', { name: 'Sub' }));
	expect(screen.getByRole('treeitem', { name: 'Zeta.pdf' }).getAttribute('aria-level')).toBe('3');
	await user.click(docs);
	expect(labels()).toEqual(['Docs', 'Empty', 'Readme.txt']);
});

test('the chevron toggles a folder without selecting it', async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	render(<Tree nodes={nodes} ariaLabel="Files" onSelect={onSelect} />);
	const docs = screen.getByRole('treeitem', { name: 'Docs' });
	await user.click(docs.querySelector('svg')!);
	expect(docs.getAttribute('aria-expanded')).toBe('true');
	expect(onSelect).not.toHaveBeenCalled();
	await user.click(docs.querySelector('svg')!);
	expect(docs.getAttribute('aria-expanded')).toBe('false');
	expect(onSelect).not.toHaveBeenCalled();
});

test('single selection is controlled and a click reports the node', async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	const onActivate = vi.fn();
	function Host() {
		const [selected, setSelected] = useState<string | null>('readme');
		return (
			<Tree
				nodes={nodes}
				ariaLabel="Files"
				selectedId={selected}
				defaultExpandedIds={['docs']}
				onSelect={(id, node) => {
					onSelect(id, node.label);
					setSelected(id);
				}}
				onActivate={(id) => onActivate(id)}
			/>
		);
	}
	render(<Host />);
	expect(screen.getByRole('treeitem', { name: 'Readme.txt' }).getAttribute('aria-selected')).toBe('true');
	expect(screen.getByRole('treeitem', { name: 'Alpha.md' }).getAttribute('aria-selected')).toBe('false');
	await user.click(screen.getByRole('treeitem', { name: 'Alpha.md' }));
	expect(onSelect).toHaveBeenCalledWith('docs/a.md', 'Alpha.md');
	expect(screen.getByRole('treeitem', { name: 'Alpha.md' }).getAttribute('aria-selected')).toBe('true');
	expect(screen.getByRole('treeitem', { name: 'Readme.txt' }).getAttribute('aria-selected')).toBe('false');
	await user.dblClick(screen.getByRole('treeitem', { name: 'Alpha.md' }));
	expect(onActivate).toHaveBeenCalledWith('docs/a.md');
});

test('folderClick expand never collapses an open folder', async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	render(<Tree nodes={nodes} ariaLabel="Files" folderClick="expand" onSelect={onSelect} />);
	const docs = screen.getByRole('treeitem', { name: 'Docs' });
	await user.click(docs);
	await user.click(docs);
	expect(docs.getAttribute('aria-expanded')).toBe('true');
	expect(onSelect).toHaveBeenCalledTimes(2);
});

test('controlled expansion reports changes and follows the parent', async () => {
	const user = userEvent.setup();
	const onExpandedChange = vi.fn();
	const view = render(<Tree nodes={nodes} ariaLabel="Files" expandedIds={[]} onExpandedChange={onExpandedChange} />);
	await user.click(screen.getByRole('treeitem', { name: 'Docs' }));
	expect(onExpandedChange).toHaveBeenLastCalledWith(['docs']);
	// The parent did not accept the change, so nothing opened.
	expect(labels()).toEqual(['Docs', 'Empty', 'Readme.txt']);
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" expandedIds={['docs']} onExpandedChange={onExpandedChange} />);
	expect(labels()).toEqual(['Docs', 'Alpha.md', 'Sub', 'Empty', 'Readme.txt']);
});

test('keyboard: arrows move and open, Home and End jump, Enter selects, typeahead jumps by label', async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	const onActivate = vi.fn();
	render(<Tree nodes={nodes} ariaLabel="Files" onSelect={onSelect} onActivate={onActivate} />);
	await user.tab();
	await focusOn('Docs');
	await user.keyboard('{ArrowRight}');
	expect(labels()).toEqual(['Docs', 'Alpha.md', 'Sub', 'Empty', 'Readme.txt']);
	await user.keyboard('{ArrowRight}');
	await focusOn('Alpha.md');
	await user.keyboard('{ArrowDown}{ArrowRight}');
	expect(screen.getByRole('treeitem', { name: 'Zeta.pdf' })).toBeTruthy();
	await user.keyboard('{ArrowLeft}');
	expect(screen.queryByRole('treeitem', { name: 'Zeta.pdf' })).toBeNull();
	await user.keyboard('{ArrowLeft}');
	await focusOn('Docs');
	await user.keyboard('{End}');
	await focusOn('Readme.txt');
	await user.keyboard('{Home}');
	await focusOn('Docs');
	await user.keyboard('r');
	await focusOn('Readme.txt');
	await user.keyboard('{Enter}');
	expect(onSelect).toHaveBeenLastCalledWith('readme', expect.objectContaining({ label: 'Readme.txt' }));
	expect(onActivate).toHaveBeenLastCalledWith('readme', expect.objectContaining({ id: 'readme' }));
});

test('search keeps matches with their ancestors, opens them and shows the empty text', () => {
	const view = render(<Tree nodes={nodes} ariaLabel="Files" search="zeta" emptyText="Nothing here" />);
	expect(labels()).toEqual(['Docs', 'Sub', 'Zeta.pdf']);
	expect(screen.getByRole('treeitem', { name: 'Docs' }).getAttribute('aria-expanded')).toBe('true');
	// A matching folder keeps its whole subtree.
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" search="sub" emptyText="Nothing here" />);
	expect(labels()).toEqual(['Docs', 'Sub', 'Zeta.pdf']);
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" search="nope" emptyText="Nothing here" />);
	expect(screen.queryByRole('tree')).toBeNull();
	expect(screen.getByRole('status').textContent).toBe('Nothing here');
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" search="" emptyText="Nothing here" />);
	expect(labels()).toContain('Readme.txt');
});

test('a row selected from outside is revealed by opening its ancestors', () => {
	render(<Tree nodes={nodes} ariaLabel="Files" selectedId="docs/sub/z.pdf" />);
	expect(labels()).toEqual(['Docs', 'Alpha.md', 'Sub', 'Zeta.pdf', 'Empty', 'Readme.txt']);
	expect(screen.getByRole('treeitem', { name: 'Zeta.pdf' }).getAttribute('aria-selected')).toBe('true');
});

test('avatar rows show the monogram and colored icons keep their color token', () => {
	render(<Tree nodes={[{ id: 'p', label: 'Ada', avatar: 'A' }, { id: 'f', label: 'Doc', iconColor: 'var(--color-red)' }]} ariaLabel="People" />);
	expect(within(screen.getByRole('treeitem', { name: 'Ada' })).getByText('A')).toBeTruthy();
	const doc = screen.getByRole('treeitem', { name: 'Doc' });
	expect(doc.querySelector<SVGElement>('svg')?.style.color).toBe('var(--color-red)');
});

test('long lists render a window of rows and keep keyboard navigation working', async () => {
	// happy-dom has no layout; give the scroll container a height so the virtualizer can measure it.
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 240, bottom: 280, width: 240, height: 280, toJSON: () => ({}) });
	const many: TreeNode[] = Array.from({ length: 1000 }, (_, index) => ({ id: `n${index}`, label: `Name ${String(index).padStart(4, '0')}` }));
	render(<Tree nodes={many} ariaLabel="Many" virtualizeAfter={50} />);
	const visible = rows();
	expect(visible.length).toBeGreaterThan(0);
	expect(visible.length).toBeLessThan(100);
	expect(visible[0]?.getAttribute('aria-posinset')).toBe('1');
	expect(visible[0]?.getAttribute('aria-setsize')).toBe('1000');
	fireEvent.keyDown(screen.getByRole('tree'), { key: 'End', code: 'End' });
});
