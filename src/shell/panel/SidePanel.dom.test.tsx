import { createRef } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../ui/react/test-providers';
import type { PanelModel } from '../../app/contracts/workbench';
import { SidePanel } from './SidePanel';
import { setLanguage } from '../../shared/i18n';

beforeEach(() => setLanguage('en'));

test('paged tree keeps real counts, loads further records and honors value-only search results', async () => {
	const load = vi.fn(async ({ limits, search }: { limits: Readonly<Record<string, number>>; search: string }) => {
		const loaded = search ? 1 : Math.min(limits.group ?? 1, 3);
		return {
			nodes: [
				{
					id: 'group',
					label: 'Entries',
					children: Array.from({ length: loaded }, (_, index) => ({
						id: `record-${index}`,
						label: search ? 'Body match without the query in its title' : `Record ${index}`,
					})),
				},
			],
			pages: [{ id: 'group', label: 'Entries', loaded, total: search ? 1 : 3 }],
		};
	});
	render(
		<TestProviders>
			<SidePanel
				title="Archives"
				current={{ feature: 'contacts' }}
				customRef={null}
				onNavigate={() => {}}
				report={vi.fn()}
				model={{
					searchable: true,
					sections: [],
					tree: {
						label: 'Archive tree',
						nodes: [],
						defaultExpandedIds: ['group'],
						data: { load, pageSize: 1 },
					},
				}}
			/>
		</TestProviders>,
	);
	await screen.findByText('Entries: 1 of 3 loaded');
	expect(screen.getByRole('treeitem', { name: /Record 0/ })).toBeTruthy();
	await userEvent.setup().click(screen.getByRole('button', { name: 'Load more Entries' }));
	await screen.findByText('Entries: 2 of 3 loaded');
	expect(screen.getByRole('treeitem', { name: /Record 1/ })).toBeTruthy();
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'secret' } });
	await screen.findByText('Entries: 1 of 1 loaded');
	expect(screen.getByRole('treeitem', { name: /Body match without/ })).toBeTruthy();
	expect(load).toHaveBeenLastCalledWith({ search: 'secret', limits: {} });
});

test('tree requests ignore obsolete results and retry a failed page without losing loaded rows', async () => {
	let release!: (value: { nodes: []; pages: [] }) => void;
	let failMore = true;
	const slow = new Promise<{ nodes: []; pages: [] }>((resolve) => {
		release = resolve;
	});
	const load = vi.fn(async ({ search, limits }: { search: string; limits: Readonly<Record<string, number>> }) => {
		if (search === 'slow') return slow;
		if ((limits.group ?? 1) > 1 && failMore) {
			failMore = false;
			throw new Error('Read failed');
		}
		const loaded = Math.min(limits.group ?? 1, 2);
		return {
			nodes: [{ id: 'group', label: 'Entries', children: [{ id: 'current', label: search || 'Current' }] }],
			pages: [{ id: 'group', label: 'Entries', loaded, total: 2 }],
		};
	});
	const report = vi.fn();
	render(
		<TestProviders>
			<SidePanel
				title="Archives"
				current={{ feature: 'contacts' }}
				customRef={null}
				onNavigate={() => {}}
				report={report}
				model={{
					searchable: true,
					sections: [],
					tree: {
						label: 'Archive tree',
						nodes: [],
						defaultExpandedIds: ['group'],
						data: { load, pageSize: 1 },
					},
				}}
			/>
		</TestProviders>,
	);
	await screen.findByText('Entries: 1 of 2 loaded');
	await userEvent.setup().click(screen.getByRole('button', { name: 'Load more Entries' }));
	await screen.findByRole('alert');
	expect(screen.getByRole('treeitem', { name: /Current/ })).toBeTruthy();
	await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
	await screen.findByText('Entries: 2 of 2 loaded');
	expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'Read failed' }));
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'slow' } });
	await waitFor(() => expect(load).toHaveBeenCalledWith({ search: 'slow', limits: {} }));
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'latest' } });
	await screen.findByRole('treeitem', { name: /latest/ });
	await act(async () => release({ nodes: [], pages: [] }));
	expect(screen.getByRole('treeitem', { name: /latest/ })).toBeTruthy();
});

test('manual expansion is isolated per leaf and search restores the collapsed choice', async () => {
	const model: PanelModel = {
		searchable: true,
		sections: [],
		tree: {
			label: 'Archive tree',
			nodes: [{ id: 'group', label: 'Entries', children: [{ id: 'record', label: 'Needle record' }] }],
			defaultExpandedIds: ['group'],
		},
	};
	const leaf = () => (
		<TestProviders>
			<SidePanel
				title="Archives"
				model={model}
				current={{ feature: 'contacts' }}
				customRef={null}
				onNavigate={() => {}}
				report={vi.fn()}
			/>
		</TestProviders>
	);
	const first = render(leaf()),
		second = render(leaf());
	const group = within(first.container).getByRole('treeitem', { name: /^Entries/ });
	fireEvent.click(group.querySelector('[data-slot="tree-toggle"]')!);
	await waitFor(() => expect(group.getAttribute('aria-expanded')).toBe('false'));
	expect(
		within(second.container)
			.getByRole('treeitem', { name: /^Entries/ })
			.getAttribute('aria-expanded'),
	).toBe('true');
	fireEvent.change(within(first.container).getByRole('textbox'), { target: { value: 'Needle' } });
	await waitFor(() => expect(group.getAttribute('aria-expanded')).toBe('true'));
	fireEvent.change(within(first.container).getByRole('textbox'), { target: { value: '' } });
	await waitFor(() => expect(group.getAttribute('aria-expanded')).toBe('false'));
});

test('search preserves other manual branches while deleted branches are pruned before reuse', async () => {
	const first = { id: 'first', label: 'First', children: [{ id: 'one', label: 'One' }] };
	const second = { id: 'second', label: 'Second', children: [{ id: 'two', label: 'Two' }] };
	let removed = false;
	const model = (): PanelModel => ({
		searchable: true,
		sections: [],
		tree: {
			label: 'Archive tree',
			nodes: [],
			defaultExpandedIds: ['first', 'second'],
			data: {
				async load({ search }) {
					return { nodes: removed || search ? [first] : [first, second], pages: [] };
				},
			},
		},
	});
	const panel = () => (
		<TestProviders>
			<SidePanel
				title="Archives"
				model={model()}
				current={{ feature: 'contacts' }}
				customRef={null}
				onNavigate={() => {}}
				report={vi.fn()}
			/>
		</TestProviders>
	);
	const view = render(panel());
	const group = await screen.findByRole('treeitem', { name: /^First/ });
	fireEvent.click(group.querySelector('[data-slot="tree-toggle"]')!);
	fireEvent.click(group.querySelector('[data-slot="tree-toggle"]')!);
	fireEvent.change(screen.getByRole('textbox'), { target: { value: 'One' } });
	await waitFor(() => expect(screen.queryByRole('treeitem', { name: /^Second/ })).toBeNull());
	fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
	await waitFor(() =>
		expect(screen.getByRole('treeitem', { name: /^Second/ }).getAttribute('aria-expanded')).toBe('true'),
	);
	removed = true;
	view.rerender(panel());
	await waitFor(() => expect(screen.queryByRole('treeitem', { name: /^Second/ })).toBeNull());
	removed = false;
	view.rerender(panel());
	await waitFor(() =>
		expect(screen.getByRole('treeitem', { name: /^Second/ }).getAttribute('aria-expanded')).toBe('false'),
	);
});

test('a panel that matches the query itself lists its results with a second line and navigates on click', async () => {
	const query = vi.fn(async (text: string) => [
		{
			id: 'a',
			label: `Hit for ${text}`,
			detail: 'Agents › Usage · Quota',
			target: { feature: 'settings' as const, section: 'terminal', focusId: 'k' },
		},
	]);
	const model: PanelModel = {
		searchable: true,
		search: { placeholder: 'Search settings…', query },
		sections: [{ id: 's', items: [{ id: 'general', label: 'General' }] }],
	};
	const onNavigate = vi.fn();
	render(
		<TestProviders>
			<SidePanel
				title="Settings"
				model={model}
				current={{ feature: 'settings' }}
				customRef={createRef()}
				onNavigate={onNavigate}
				report={vi.fn()}
			/>
		</TestProviders>,
	);
	expect(screen.getByText('General')).toBeTruthy();
	await userEvent.setup().type(screen.getByRole('textbox', { name: 'Search settings…' }), 'usage');
	const result = await screen.findByRole('button', { name: /Hit for usage/ });
	expect(result.textContent).toContain('Agents › Usage · Quota');
	// The category list gives way to the results.
	expect(screen.queryByText('General')).toBeNull();
	await userEvent.setup().click(result);
	await waitFor(() =>
		expect(onNavigate).toHaveBeenCalledWith({ feature: 'settings', section: 'terminal', focusId: 'k' }),
	);
});

test('primary action stays busy, blocks duplicate activation and recovers after rejection', async () => {
	let rejectAction: (error: Error) => void = () => {};
	const run = vi.fn(
		() =>
			new Promise<void>((_resolve, reject) => {
				rejectAction = reject;
			}),
	);
	const report = vi.fn();
	render(
		<TestProviders>
			<SidePanel
				title="Content"
				model={{ sections: [], primary: { label: 'Create note', icon: 'plus', run } }}
				current={{ feature: 'content' }}
				customRef={createRef()}
				onNavigate={() => {}}
				report={report}
			/>
		</TestProviders>,
	);
	const button = screen.getByRole('button', { name: 'Create note' }) as HTMLButtonElement;
	const user = userEvent.setup();
	await user.click(button);
	expect(button.disabled).toBe(true);
	expect(button.getAttribute('aria-busy')).toBe('true');
	await user.click(button);
	expect(run).toHaveBeenCalledOnce();
	const error = new Error('vault failed');
	rejectAction(error);
	await waitFor(() => expect(report).toHaveBeenCalledWith(error));
	await waitFor(() => expect(button.disabled).toBe(false));
	await user.click(button);
	expect(run).toHaveBeenCalledTimes(2);
	rejectAction(error);
	await waitFor(() => expect(button.disabled).toBe(false));
});

test('a late asynchronous row cannot override a newer navigation', async () => {
	let resolve!: () => void;
	const first = new Promise<void>((done) => {
		resolve = done;
	});
	const navigate = vi.fn();
	render(
		<TestProviders>
			<SidePanel
				title="Rows"
				model={{
					sections: [
						{
							id: 's',
							items: [
								{ id: 'a', label: 'Slow row', select: () => first, target: { feature: 'content' } },
								{ id: 'b', label: 'New row', target: { feature: 'settings' } },
							],
						},
					],
				}}
				current={{ feature: 'content' }}
				customRef={createRef()}
				onNavigate={navigate}
				report={vi.fn()}
			/>
		</TestProviders>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Slow row' }));
	await user.click(screen.getByRole('button', { name: 'New row' }));
	await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith({ feature: 'settings' }));
	await act(async () => resolve());
	expect(navigate).toHaveBeenCalledTimes(1);
});

test('row menu reports a synchronous action failure and keeps the action receiver', async () => {
	const report = vi.fn();
	const item = {
		title: 'Delete row',
		run() {
			throw new Error(this.title);
		},
	};
	render(
		<TestProviders>
			<SidePanel
				title="Content"
				model={{ sections: [{ id: 's', items: [{ id: 'row', label: 'Row', menu: () => [item] }] }] }}
				current={{ feature: 'content' }}
				customRef={null}
				onNavigate={() => {}}
				report={report}
			/>
		</TestProviders>,
	);
	const user = userEvent.setup();
	const more = screen
		.getAllByRole('button')
		.find((button) => button.querySelector('svg') && button !== screen.getByRole('button', { name: 'Row' }));
	expect(more).toBeTruthy();
	await user.click(more!);
	await user.click(await screen.findByRole('menuitem', { name: 'Delete row' }));
	await waitFor(() =>
		expect(report).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: 'Delete row' })),
	);
});
