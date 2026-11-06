import { useState } from 'react';
import * as Menu from 'radix-ui/dropdown-menu';
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
			{
				id: 'docs/sub',
				label: 'Sub',
				children: [{ id: 'docs/sub/z.pdf', label: 'Zeta.pdf', iconColor: 'var(--color-red)' }],
			},
		],
	},
	{ id: 'empty', label: 'Empty', children: [] },
	{ id: 'readme', label: 'Readme.txt' },
];

const rows = () => screen.getAllByRole('treeitem');
const labels = () => rows().map((row) => row.getAttribute('aria-label'));
/** Headless Tree moves DOM focus on the next task, so assertions wait for it. */
const focusOn = (name: string) =>
	waitFor(() => expect(document.activeElement).toBe(screen.getByRole('treeitem', { name })));

afterEach(() => vi.restoreAllMocks());

test('renders an ARIA tree, expands only by chevron, and exposes level and state', async () => {
	const user = userEvent.setup();
	render(<Tree nodes={nodes} ariaLabel="Files" />);
	expect(screen.getByRole('tree', { name: 'Files' })).toBeTruthy();
	expect(labels()).toEqual(['Docs', 'Empty', 'Readme.txt']);
	const docs = screen.getByRole('treeitem', { name: 'Docs' });
	expect(docs.getAttribute('aria-expanded')).toBe('false');
	expect(docs.getAttribute('aria-level')).toBe('1');
	expect(within(docs).getByText('2')).toBeTruthy();
	expect(screen.getByRole('treeitem', { name: 'Readme.txt' }).hasAttribute('aria-expanded')).toBe(false);
	await user.click(docs.querySelector('svg')!);
	expect(labels()).toEqual(['Docs', 'Alpha.md', 'Sub', 'Empty', 'Readme.txt']);
	expect(docs.getAttribute('aria-expanded')).toBe('true');
	expect(screen.getByRole('treeitem', { name: 'Alpha.md' }).getAttribute('aria-level')).toBe('2');
	await user.click(screen.getByRole('treeitem', { name: 'Sub' }).querySelector('svg')!);
	expect(screen.getByRole('treeitem', { name: 'Zeta.pdf' }).getAttribute('aria-level')).toBe('3');
	await user.click(docs.querySelector('svg')!);
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

test('folder name selects without expanding and the tree has one Tab stop', async () => {
	const user = userEvent.setup();
	const onSelect = vi.fn();
	render(
		<>
			<Tree nodes={nodes} ariaLabel="Files" onSelect={onSelect} />
			<button>After tree</button>
		</>,
	);
	await user.click(screen.getByText('Docs'));
	expect(screen.getByRole('treeitem', { name: 'Docs' }).getAttribute('aria-expanded')).toBe('false');
	expect(onSelect).toHaveBeenCalledWith('docs', expect.objectContaining({ label: 'Docs' }));
	await user.tab();
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After tree' }));
});

test('controlled expansion reports changes and follows the parent', async () => {
	const user = userEvent.setup();
	const onExpandedChange = vi.fn();
	const view = render(<Tree nodes={nodes} ariaLabel="Files" expandedIds={[]} onExpandedChange={onExpandedChange} />);
	await user.click(screen.getByRole('treeitem', { name: 'Docs' }).querySelector('svg')!);
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
	render(
		<Tree
			nodes={[
				{ id: 'p', label: 'Ada', avatar: 'A' },
				{ id: 'f', label: 'Doc', iconColor: 'var(--color-red)' },
			]}
			ariaLabel="People"
		/>,
	);
	expect(within(screen.getByRole('treeitem', { name: 'Ada' })).getByText('A')).toBeTruthy();
	const doc = screen.getByRole('treeitem', { name: 'Doc' });
	expect(doc.querySelector<SVGElement>('svg')?.style.color).toBe('var(--color-red)');
});

test('long lists render a window of rows and keep keyboard navigation working', async () => {
	// happy-dom has no layout; give the scroll container a height so the virtualizer can measure it.
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 240,
		bottom: 280,
		width: 240,
		height: 280,
		toJSON: () => ({}),
	});
	const many: TreeNode[] = Array.from({ length: 1000 }, (_, index) => ({
		id: `n${index}`,
		label: `Name ${String(index).padStart(4, '0')}`,
	}));
	render(<Tree nodes={many} ariaLabel="Many" virtualizeAfter={50} />);
	const visible = rows();
	expect(visible.length).toBeGreaterThan(0);
	expect(visible.length).toBeLessThan(100);
	expect(visible[0]?.getAttribute('aria-posinset')).toBe('1');
	expect(visible[0]?.getAttribute('aria-setsize')).toBe('1000');
	await userEvent.setup().tab();
	await userEvent.setup().keyboard('{ArrowDown}');
	await focusOn('Name 0001');
});

test('density changes update virtual total and physical row height together', async () => {
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240);
	const many = Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
	const view = render(
		<div className="huhu-ui" data-density="compact">
			<Tree nodes={many} ariaLabel="Density" virtualizeAfter={50} />
		</div>,
	);
	const tree = screen.getByRole('tree');
	expect(tree.style.height).toBe('32008px');
	expect(rows()[0]?.style.height).toBe('32px');
	view.container.firstElementChild!.setAttribute('data-density', 'comfortable');
	await waitFor(() => expect(tree.style.height).toBe('36008px'));
	expect(rows()[0]?.style.height).toBe('36px');
});

test('clearing search restores manual expansion and highlights matching labels', () => {
	const view = render(<Tree nodes={nodes} ariaLabel="Files" search="zeta" />);
	expect(screen.getByText('Zeta', { selector: 'mark' })).toBeTruthy();
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" search="" />);
	expect(labels()).toEqual(['Docs', 'Empty', 'Readme.txt']);
});

test('coarse pointer changes and document adoption rebind density to the owning window', async () => {
	const originalMedia = window.matchMedia('(pointer: coarse)');
	let coarse = false;
	const listeners = new Set<() => void>();
	vi.spyOn(window, 'matchMedia').mockReturnValue({
		...originalMedia,
		get matches() {
			return coarse;
		},
		addEventListener: (_type: string, listener: unknown) => listeners.add(listener as () => void),
		removeEventListener: (_type: string, listener: unknown) => listeners.delete(listener as () => void),
	} as MediaQueryList);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(280);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
	const many = [...nodes, ...Array.from({ length: 1000 }, (_, i) => ({ id: `extra${i}`, label: `Extra ${i}` }))];
	const view = render(
		<div className="huhu-ui" data-density="compact">
			<Tree nodes={many} ariaLabel="Moving" virtualizeAfter={50} />
		</div>,
	);
	const tree = screen.getByRole('tree');
	expect(tree.style.height).toBe('32104px');
	const row = screen.getByRole('treeitem', { name: 'Docs' });
	expect(row.style.height).toBe('32px');
	act(() => {
		coarse = true;
		listeners.forEach((listener) => listener());
	});
	expect(row.style.height).toBe('44px');
	expect(row.querySelector<HTMLElement>('[data-slot=tree-toggle]')?.style.width).toBe('var(--hu-hit)');
	expect(tree.style.height).toBe('44140px');
	const frame = document.createElement('iframe');
	document.body.append(frame);
	const destination = frame.contentDocument!;
	vi.spyOn(destination.defaultView!, 'matchMedia').mockReturnValue({
		...originalMedia,
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	} as unknown as MediaQueryList);
	destination.body.append(view.container);
	view.container.firstElementChild!.setAttribute('data-density', 'comfortable');
	await waitFor(() => expect(row.style.height).toBe('36px'));
	expect(tree.style.height).toBe('36116px');
	expect(listeners.size).toBe(0);
	document.body.append(view.container);
	frame.remove();
});

test('row action buttons do not add Tab stops; F2 enters actions and Escape returns to the row', async () => {
	const user = userEvent.setup();
	const action = vi.fn();
	render(
		<>
			<Tree
				nodes={[
					{
						id: 'a',
						label: 'Alpha',
						actions: (
							<>
								<button onClick={action}>Edit Alpha</button>
								<button>More Alpha</button>
							</>
						),
					},
					{ id: 'b', label: 'Beta', actions: <button>Edit Beta</button> },
				]}
				ariaLabel="Actions"
			/>
			<button>After</button>
		</>,
	);
	await user.tab();
	await focusOn('Alpha');
	await user.keyboard('{F2}{Enter}');
	expect(action).toHaveBeenCalledTimes(1);
	await user.keyboard('{ArrowRight}');
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More Alpha' }));
	await user.keyboard('{ArrowLeft}');
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Alpha' }));
	await user.keyboard('{Escape}');
	await focusOn('Alpha');
	await user.tab();
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
});

test('search interaction cannot persist forced ancestors into manual expansion', async () => {
	const user = userEvent.setup();
	const view = render(<Tree nodes={nodes} ariaLabel="Files" search="zeta" />);
	const sub = screen.getByRole('treeitem', { name: 'Sub' });
	await user.click(sub.querySelector('svg')!);
	view.rerender(<Tree nodes={nodes} ariaLabel="Files" search="" />);
	expect(screen.getByRole('treeitem', { name: 'Docs' }).getAttribute('aria-expanded')).toBe('false');
});
test('row action receives its own keyboard events', async () => {
	const user = userEvent.setup();
	const handler = vi.fn();
	render(
		<Tree
			ariaLabel="Actions"
			nodes={[{ id: 'a', label: 'Alpha', actions: <button onKeyDown={handler}>Do action</button> }]}
		/>,
	);
	await user.tab();
	await user.keyboard('{F2}x');
	expect(handler).toHaveBeenCalled();
});
test('real Radix row action trigger opens by ArrowDown after F2', async () => {
	const user = userEvent.setup();
	render(
		<Tree
			ariaLabel="Actions"
			nodes={[
				{
					id: 'a',
					label: 'Alpha',
					actions: (
						<Menu.Root>
							<Menu.Trigger>More</Menu.Trigger>
							<Menu.Content>
								<Menu.Item>Rename</Menu.Item>
							</Menu.Content>
						</Menu.Root>
					),
				},
			]}
		/>,
	);
	await user.tab();
	await user.keyboard('{F2}');
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More' }));
	await user.keyboard('{ArrowDown}');
	expect(screen.getByRole('menu')).toBeTruthy();
});
test('live node data and child additions update through real sync data loader', () => {
	const view = render(<Tree ariaLabel="Live" nodes={[{ id: 'a', label: 'Old' }]} />);
	view.rerender(
		<Tree
			ariaLabel="Live"
			nodes={[
				{ id: 'a', label: 'New' },
				{ id: 'b', label: 'Added' },
			]}
		/>,
	);
	expect(screen.getByRole('treeitem', { name: 'New' })).toBeTruthy();
	expect(screen.getByRole('treeitem', { name: 'Added' })).toBeTruthy();
	expect(screen.queryByRole('treeitem', { name: 'Old' })).toBeNull();
});

test('controlled search expansion saves only manual deltas and preserves previously opened folders', async () => {
	const user = userEvent.setup();
	const changed = vi.fn();
	function Host({ search }: { search: string }) {
		const [expanded, setExpanded] = useState(['docs']);
		return (
			<Tree
				nodes={nodes}
				ariaLabel="Controlled search"
				search={search}
				expandedIds={expanded}
				onExpandedChange={(next) => {
					changed(next);
					setExpanded(next);
				}}
			/>
		);
	}
	const view = render(<Host search="zeta" />);
	await user.click(screen.getByRole('treeitem', { name: 'Sub' }).querySelector('svg')!);
	expect(changed).toHaveBeenLastCalledWith(['docs']);
	view.rerender(<Host search="" />);
	expect(screen.getByRole('treeitem', { name: 'Docs' }).getAttribute('aria-expanded')).toBe('true');
	expect(screen.getByRole('treeitem', { name: 'Sub' }).getAttribute('aria-expanded')).toBe('false');
});

test('action inputs retain arrows and genuine Radix menu accepts ArrowDown and Enter without moving the tree', async () => {
	const user = userEvent.setup();
	const select = vi.fn();
	const rename = vi.fn();
	render(
		<Tree
			ariaLabel="Menu actions"
			onSelect={select}
			nodes={[
				{
					id: 'a',
					label: 'Alpha',
					actions: (
						<>
							<input aria-label="Rename input" defaultValue="Alpha" />
							<Menu.Root>
								<Menu.Trigger>More</Menu.Trigger>
								<Menu.Content>
									<Menu.Item onSelect={rename}>Rename</Menu.Item>
								</Menu.Content>
							</Menu.Root>
						</>
					),
				},
				{ id: 'b', label: 'Beta' },
			]}
		/>,
	);
	await user.tab();
	await user.keyboard('{F2}{ArrowLeft}');
	expect(document.activeElement).toBe(screen.getByRole('textbox'));
	await user.keyboard('{Escape}{F2}');
	// Move to the menu trigger by programmatic focus, as pointer and assistive tech also do.
	screen.getByRole('button', { name: 'More' }).focus();
	await user.keyboard('{ArrowDown}');
	expect(screen.getByRole('menu')).toBeTruthy();
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Rename' })));
	await user.keyboard('{Enter}');
	expect(rename).toHaveBeenCalledTimes(1);
	expect(select).not.toHaveBeenCalled();
	await user.keyboard('{Escape}');
	await focusOn('Alpha');
	await user.keyboard('{ArrowDown}');
	await focusOn('Beta');
});

test.each([
	{ controlled: false, initial: [] },
	{ controlled: false, initial: ['docs'] },
	{ controlled: true, initial: [] },
	{ controlled: true, initial: ['docs'] },
])('search interaction preserves manual state ($controlled, $initial)', async ({ controlled, initial }) => {
	const user = userEvent.setup();
	const changed = vi.fn();
	function Host({ search }: { search: string }) {
		const [expanded, setExpanded] = useState(initial);
		return (
			<Tree
				nodes={nodes}
				ariaLabel="Manual state"
				search={search}
				defaultExpandedIds={initial}
				expandedIds={controlled ? expanded : undefined}
				onExpandedChange={(next) => {
					changed(next);
					setExpanded(next);
				}}
			/>
		);
	}
	const view = render(<Host search="zeta" />);
	await user.click(screen.getByRole('treeitem', { name: 'Sub' }).querySelector('svg')!);
	expect(changed).toHaveBeenLastCalledWith(initial);
	view.rerender(<Host search="" />);
	expect(screen.getByRole('treeitem', { name: 'Docs' }).getAttribute('aria-expanded')).toBe(
		initial.length ? 'true' : 'false',
	);
	if (initial.length)
		expect(screen.getByRole('treeitem', { name: 'Sub' }).getAttribute('aria-expanded')).toBe('false');
});
