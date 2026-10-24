import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { SyncPage } from './sync-presentation';
import { parseStatus } from '../core/status';
import { EMPTY_DEVICE_STATE } from '../core/ports';
import type { SyncService, SyncSnapshot } from '../services/sync-service';
import { askText, confirmAction } from './dialogs';
import { t } from '../../../shared/i18n';

const commits = [
	{ hash: 'c3'.padEnd(40, '0'), parents: ['c2'.padEnd(40, '0'), 'f1'.padEnd(40, '0')], short: 'c300000', author: 'Ann', time: 1_700_000_300, subject: 'Merge feature' },
	{ hash: 'f1'.padEnd(40, '0'), parents: ['c1'.padEnd(40, '0')], short: 'f100000', author: 'Bob', time: 1_700_000_200, subject: 'Feature work' },
	{ hash: 'c2'.padEnd(40, '0'), parents: ['c1'.padEnd(40, '0')], short: 'c200000', author: 'Ann', time: 1_700_000_100, subject: 'Main work' },
	{ hash: 'c1'.padEnd(40, '0'), parents: [], short: 'c100000', author: 'Ann', time: 1_700_000_000, subject: 'Initial' },
];
/** The read-only queries the graph needs; the rest of the service is supplied per test. */
const graphQueries = {
	graphLog: vi.fn(async () => commits),
	refs: vi.fn(async () => [{ name: 'refs/heads/main', hash: commits[0]!.hash }, { name: 'refs/remotes/origin/main', hash: commits[0]!.hash }, { name: 'refs/tags/v1', hash: commits[3]!.hash }]),
	commitDetail: vi.fn(async (hash: string) => ({ hash, author: 'Ann', email: 'ann@example.com', time: 1_700_000_000, parents: [], message: 'Initial\n\nBody text' })),
	commitFiles: vi.fn(async () => [{ status: 'A', path: 'notes/a.md' }]),
};
/** happy-dom has no layout; give scroll containers a size so the virtual list renders rows. */
const mockLayout = () => {
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(520);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(900);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 520, width: 900, height: 520, toJSON: () => ({}) });
};
const uncommittedRow = () => screen.findByRole('row', { name: /^(未提交的更改|Uncommitted changes)/ });

test('sync preserves failed commit messages, suppresses IME submit, and offers staged commit actions', async () => {
	const snapshot: SyncSnapshot = {
		phase: 'ready',
		gitVersion: 'test',
		operation: null,
		locked: false,
		remotes: ['origin'],
		identity: { name: 'Test', email: 'test@example.com' },
		device: { ...EMPTY_DEVICE_STATE },
		status: parseStatus('# branch.head main\0? New.md\0'),
	};
	mockLayout();
	const commitAndSync = vi.fn(async () => {
			throw new Error('offline');
		}),
		commit = vi.fn(async () => {}),
		report = vi.fn(),
		setMessage = vi.fn();
	const service = { commitAndSync, commit, ...graphQueries } as unknown as SyncService;
	const props = {
		app: {} as never,
		snapshot,
		service,
		message: 'Draft',
		setMessage,
		host: { service: () => service, repoFolder: () => '', openSettings: vi.fn(), report },
	};
	const view = render(
			<TestProviders>
				<SyncPage {...props} />
			</TestProviders>,
		),
		user = userEvent.setup();
	await user.click(await uncommittedRow());
	const input = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: t('sync.message') });
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true, isComposing: true });
	expect(commitAndSync).not.toHaveBeenCalled();
	fireEvent.compositionEnd(input);
	fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
	await waitFor(() => expect(report).toHaveBeenCalled());
	expect(input.value).toBe('Draft');
	await user.click(screen.getByRole('button', { name: t('sync.moreCommit') }));
	await user.click(screen.getByRole('menuitem', { name: t('sync.commitStaged') }));
	expect(commit).toHaveBeenCalledWith('staged', { message: 'Draft' });
	await waitFor(() => expect(input.value).toBe(''));
	view.rerender(
		<TestProviders>
			<SyncPage {...props} snapshot={{ ...snapshot, operation: 'merge' }} />
		</TestProviders>,
	);
	expect(screen.getByRole<HTMLButtonElement>('button', { name: t('sync.commitAndSync') }).disabled).toBe(true);
});

test('sync dialogs scope portals, trim prompts, restore focus, and cancel without side effects', async () => {
	const owner = document.createElement('section'),
		button = document.createElement('button');
	owner.append(button);
	document.body.append(owner);
	button.focus();
	const app = { workspace: { containerEl: owner } } as never;
	let result!: Promise<string | null>;
	act(() => {
		result = askText(app, 'Title', 'Name', '  value  ');
	});
	await screen.findByRole('dialog');
	expect(screen.getByRole('dialog').closest('.huhu-portal-root')).toBeTruthy();
	const input = screen.getByRole('textbox', { name: 'Name' });
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(screen.getByRole('dialog')).toBeTruthy();
	fireEvent.compositionEnd(input);
	await userEvent.setup().click(screen.getByRole('button', { name: t('common.confirm') }));
	expect(await result).toBe('value');
	expect(document.activeElement).toBe(button);
	let confirmed!: Promise<boolean>;
	act(() => {
		confirmed = confirmAction(app, { title: 'Discard', message: 'Unsaved draft', action: 'Discard' });
	});
	const dialog = await screen.findByRole('dialog');
	expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
	await userEvent.setup().keyboard('{Escape}');
	expect(await confirmed).toBe(false);
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	act(() => {
		confirmed = confirmAction(app, { title: 'Close owner', message: 'Owned dialog', action: 'Confirm' });
	});
	await screen.findByRole('dialog');
	act(() => owner.remove());
	expect(await confirmed).toBe(false);
	await waitFor(() => expect(document.querySelector('.huhu-portal-root')).toBeNull());
});

test('the change list is a compact tree that switches between flat and folder views and remembers the choice', async () => {
	const saved = new Map<string, unknown>();
	const app = { loadLocalStorage: (key: string) => saved.get(key) ?? null, saveLocalStorage: (key: string, value: unknown) => void saved.set(key, value) } as never;
	const entries = Array.from({ length: 130 }, (_, index) => `1 .M N... 100644 100644 100644 aaa bbb notes/area-${index % 5}/note-${index}.md\0`);
	const snapshot: SyncSnapshot = {
		phase: 'ready',
		gitVersion: 'test',
		operation: null,
		locked: false,
		remotes: ['origin'],
		identity: { name: 'Test', email: 'test@example.com' },
		device: { ...EMPTY_DEVICE_STATE },
		status: parseStatus(`# branch.head main\0${entries.join('')}1 A. N... 100644 100644 100644 aaa bbb staged/new.md\0`),
	};
	const props = {
		app,
		snapshot,
		service: { ...graphQueries } as unknown as SyncService,
		message: '',
		setMessage: vi.fn(),
		host: { service: () => undefined, repoFolder: () => '', openSettings: vi.fn(), report: vi.fn() },
	};
	// happy-dom has no layout; give the scroll container the height the list would have so it can window the rows.
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(520);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 600, bottom: 520, width: 600, height: 520, toJSON: () => ({}) });
	const user = userEvent.setup();
	render(
		<TestProviders>
			<SyncPage {...props} />
		</TestProviders>,
	);
	await user.click(await uncommittedRow());
	const tree = await screen.findByRole('tree', { name: t('sync.groupChanges') });
	// 131 changes are windowed, not all rendered; each row is 28px high with its folder in gray.
	const rendered = tree.querySelectorAll('[data-slot="tree-item"]').length;
	expect(rendered).toBeGreaterThan(10);
	expect(rendered).toBeLessThan(100);
	const first = screen.getAllByRole('treeitem').find((row) => row.getAttribute('aria-label') === 'note-0.md')!;
	expect(first.className).toContain('h-7');
	expect(first.textContent).toContain('notes/area-0');
	expect(first.querySelector('[data-slot="tree-actions"]')).toBeTruthy();
	await user.click(screen.getByRole('radio', { name: t('sync.view.tree') }));
	expect(saved.get('huhu-sync-change-view')).toBe('tree');
	const folder = await screen.findByRole('treeitem', { name: 'notes' });
	expect(folder.textContent).toContain('130');
	vi.restoreAllMocks();
});

test('the graph lists commits with ref badges, opens details on click and filters through the service', async () => {
	mockLayout();
	const snapshot: SyncSnapshot = {
		phase: 'ready',
		gitVersion: 'test',
		operation: null,
		locked: false,
		remotes: ['origin'],
		identity: { name: 'Test', email: 'test@example.com' },
		device: { ...EMPTY_DEVICE_STATE },
		status: parseStatus(`# branch.oid ${commits[0]!.hash}\0# branch.head main\0`),
	};
	const service = { ...graphQueries } as unknown as SyncService;
	const props = { app: {} as never, snapshot, service, message: '', setMessage: vi.fn(), host: { service: () => service, repoFolder: () => '', openSettings: vi.fn(), report: vi.fn() } };
	const user = userEvent.setup();
	render(
		<TestProviders>
			<SyncPage {...props} />
		</TestProviders>,
	);
	const merge = await screen.findByRole('row', { name: /Merge feature/ });
	expect(merge.textContent).toContain('main');
	expect(merge.textContent).toContain('origin');
	expect(screen.getByRole('row', { name: /Initial/ }).textContent).toContain('v1');
	expect(screen.queryByRole('row', { name: /^(未提交的更改|Uncommitted changes)/ })).toBeNull();
	await user.click(screen.getByRole('row', { name: /Initial/ }));
	expect(await screen.findByText(/Body text/)).toBeTruthy();
	expect(await screen.findByText('a.md')).toBeTruthy();
	await user.type(screen.getByRole('textbox', { name: t('sync.searchCommits') }), 'init');
	await waitFor(() => expect(graphQueries.graphLog).toHaveBeenLastCalledWith(0, 100, { branches: 'all', remotes: true, search: 'init' }));
	vi.restoreAllMocks();
});
