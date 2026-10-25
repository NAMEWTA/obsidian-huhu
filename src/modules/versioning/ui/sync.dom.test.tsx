import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, t } from '../../../shared/i18n';
import { SyncPage } from './sync-presentation';
import { FileNavigator } from './VersioningNavigator';
import { parseStatus } from '../core/status';
import { EMPTY_DEVICE_STATE } from '../core/ports';
import type { RunReport, SyncService, SyncSnapshot } from '../services/sync-service';
import type {
	ComparisonRequest,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionRef,
	VersioningQueries,
} from '../core/history';
import { diffMessages } from '../i18n';
import { askText, confirmAction } from './dialogs';

registerMessages(diffMessages);
afterEach(() => vi.restoreAllMocks());
const hash = (prefix: string) => prefix.padEnd(40, '0');
const commits = [
	{
		hash: hash('c3'),
		parents: [hash('c2'), hash('f1')],
		short: 'c300000',
		author: 'Ann',
		time: 1_700_000_300,
		subject: 'Merge feature',
	},
	{
		hash: hash('f1'),
		parents: [hash('c1')],
		short: 'f100000',
		author: 'Bob',
		time: 1_700_000_200,
		subject: 'Feature work',
	},
	{ hash: hash('c1'), parents: [], short: 'c100000', author: 'Ann', time: 1_700_000_000, subject: 'Initial' },
];
const graphQueries = () => ({
	graphLog: vi.fn(async () => commits),
	refs: vi.fn(async () => [
		{ name: 'refs/heads/main', hash: commits[0]!.hash },
		{ name: 'refs/heads/feature', hash: commits[1]!.hash },
		{ name: 'refs/tags/v1', hash: commits[2]!.hash },
	]),
});
const mockLayout = () => {
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(520);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(900);
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(520);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(900);
};
function baseSnapshot(status = `# branch.oid ${hash('c3')}\0# branch.head main\0`): SyncSnapshot {
	return {
		phase: 'ready',
		gitVersion: 'test',
		operation: null,
		locked: false,
		remotes: ['origin'],
		identity: { name: 'Test', email: 'test@example.com' },
		device: { ...EMPTY_DEVICE_STATE },
		status: parseStatus(status),
	};
}
function endpoint(ref: RevisionRef, text: string): ResolvedEndpoint {
	return {
		repositoryId: 'repo',
		id: `${ref.kind}:${ref.path}`,
		path: ref.path,
		ref,
		label: ref.kind,
		status: 'text',
		snapshot: {
			text,
			hash: text,
			byteLength: text.length,
			encoding: 'utf-8',
			eol: 'lf',
			hasBom: false,
			endsWithNewline: true,
		},
	};
}
function resolved(request: ComparisonRequest): ResolvedComparison {
	return {
		id: `${request.intent}:${request.left.kind}:${request.right.path}`,
		repositoryId: 'repo',
		intent: request.intent,
		left: endpoint(request.left, 'old\n'),
		right: endpoint(request.right, 'new\n'),
		capturedAt: 1,
		identical: false,
		canCompare: true,
	};
}
function queries() {
	return {
		compare: vi.fn(async (request: ComparisonRequest, _signal?: AbortSignal) => resolved(request)),
		changedFiles: vi.fn(async (_left: string | null, _right: string, _signal?: AbortSignal) => [
			{ path: 'notes/a.md', status: 'M' },
			{ path: 'notes/b.md', status: 'A' },
		]),
		commitComparison: vi.fn(async (commit: string, path: string, parent?: string, _signal?: AbortSignal) =>
			resolved({
				intent: 'commit',
				left: parent ? { kind: 'commit', commit: parent, path } : { kind: 'empty', path },
				right: { kind: 'commit', commit, path },
			}),
		),
	} as unknown as VersioningQueries;
}
function propsFor(snapshot: SyncSnapshot, service: SyncService, versioning = queries()) {
	return {
		app: {} as never,
		snapshot,
		service,
		message: '',
		setMessage: vi.fn(),
		host: {
			service: () => service,
			queries: () => versioning,
			repoFolder: () => '',
			openSettings: vi.fn(),
			report: vi.fn(),
		},
	};
}

test('commit composer preserves failed text and IME submit, and exists only in changes mode', async () => {
	mockLayout();
	const snapshot = baseSnapshot(
		`# branch.head main\u0000? New.md\u00001 A. N... 100644 100644 100644 aaa bbb staged.md\u0000`,
	);
	const commitAndSync = vi.fn(async () => {
		throw new Error('offline');
	});
	const commit = vi.fn(async (): Promise<RunReport> => ({
		action: 'commit',
		ok: true,
		at: 1,
		auto: false,
		steps: [{ step: 'commit', state: 'done' }],
	}));
	const service = { commitAndSync, commit, ...graphQueries() } as unknown as SyncService;
	const props = { ...propsFor(snapshot, service), message: 'Draft' };
	const view = render(
		<TestProviders>
			<SyncPage {...props} />
		</TestProviders>,
	);
	const input = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: t('sync.message') });
	fireEvent.compositionStart(input);
	fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true, isComposing: true });
	expect(commitAndSync).not.toHaveBeenCalled();
	fireEvent.compositionEnd(input);
	fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
	await waitFor(() => expect(props.host.report).toHaveBeenCalled());
	expect(input.value).toBe('Draft');
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: t('sync.moreCommit') }));
	await user.click(screen.getByRole('menuitem', { name: t('sync.commitStaged') }));
	expect(commit).toHaveBeenCalledWith('staged', { message: 'Draft' });
	await waitFor(() => expect(input.value).toBe(''));
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.mode.history') }));
	expect(screen.queryByRole('textbox', { name: t('sync.message') })).toBeNull();
	view.rerender(
		<TestProviders>
			<SyncPage
				{...props}
				openChanges={1}
				requestedMode="changes"
				snapshot={{ ...snapshot, operation: 'merge' }}
			/>
		</TestProviders>,
	);
	expect(screen.getByRole<HTMLButtonElement>('button', { name: t('sync.commitAndSync') }).disabled).toBe(true);
});

test('unstaged, staged and untracked comparisons have explicit distinct bases and one selected file', async () => {
	mockLayout();
	const snapshot = baseSnapshot(
		`# branch.oid ${hash('c3')}\u0000# branch.head main\u00001 MM N... 100644 100644 100644 aaa bbb notes/a.md\u0000? notes/new.md\u0000`,
	);
	const service = { ...graphQueries() } as unknown as SyncService;
	const versioning = queries();
	const props = propsFor(snapshot, service, versioning);
	const view = render(
		<TestProviders>
			<SyncPage {...props} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'notes/a.md' }));
	await waitFor(() =>
		expect(versioning.compare).toHaveBeenCalledWith(
			expect.objectContaining({
				intent: 'unstaged',
				left: { kind: 'index', path: 'notes/a.md' },
				right: { kind: 'worktree', path: 'notes/a.md' },
			}),
			expect.any(AbortSignal),
		),
	);
	await waitFor(() => expect(view.container.querySelectorAll('[data-comparison-id]')).toHaveLength(1));
	expect(view.container.querySelector('[data-versioning-navigation] .cm-editor')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'notes/new.md' }));
	await waitFor(() =>
		expect(versioning.compare).toHaveBeenLastCalledWith(
			expect.objectContaining({
				left: { kind: 'empty', path: 'notes/new.md' },
				right: { kind: 'worktree', path: 'notes/new.md' },
			}),
			expect.any(AbortSignal),
		),
	);
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.changes.staged', { count: 1 }) }));
	fireEvent.click(screen.getByRole('button', { name: 'notes/a.md' }));
	await waitFor(() =>
		expect(versioning.compare).toHaveBeenLastCalledWith(
			expect.objectContaining({
				intent: 'staged',
				left: { kind: 'commit', commit: hash('c3'), path: 'notes/a.md' },
				right: { kind: 'index', path: 'notes/a.md' },
			}),
			expect.any(AbortSignal),
		),
	);
	expect(
		view.container.querySelectorAll('[data-versioning-navigation] button[aria-pressed="true"][data-choice-key]'),
	).toHaveLength(1);
	view.rerender(
		<TestProviders>
			<SyncPage {...props} snapshot={baseSnapshot()} />
		</TestProviders>,
	);
	expect(view.container.querySelector('.cm-editor')).toBeNull();
});

test('history keeps commit and file navigation separate, uses the selected merge parent, and browses without checkout', async () => {
	mockLayout();
	const operations = { ...graphQueries(), checkout: vi.fn() };
	const service = operations as unknown as SyncService;
	const versioning = queries();
	const props = propsFor(baseSnapshot(), service, versioning);
	const view = render(
		<TestProviders>
			<SyncPage {...props} requestedMode="history" />
		</TestProviders>,
	);
	const merge = await screen.findByRole('button', { name: /Merge feature/ });
	fireEvent.click(merge);
	await waitFor(() =>
		expect(versioning.changedFiles).toHaveBeenCalledWith(hash('c2'), hash('c3'), expect.any(AbortSignal)),
	);
	const file = await screen.findByRole('button', { name: 'notes/a.md' });
	fireEvent.click(file);
	await waitFor(() =>
		expect(versioning.commitComparison).toHaveBeenCalledWith(
			hash('c3'),
			'notes/a.md',
			hash('c2'),
			expect.any(AbortSignal),
		),
	);
	expect(merge.closest('li')?.style.height).toBe('32px');
	expect(merge.closest('li')?.querySelector('.cm-editor')).toBeNull();
	expect(view.container.querySelector('[data-versioning-navigation] .cm-editor')).toBeNull();
	const user = userEvent.setup();
	await user.click(screen.getByRole('combobox', { name: t('versioning.history.parent') }));
	await user.click(
		screen.getByRole('option', {
			name: t('versioning.history.parentItem', { number: 2, oid: hash('f1').slice(0, 8) }),
		}),
	);
	await waitFor(() =>
		expect(versioning.changedFiles).toHaveBeenLastCalledWith(hash('f1'), hash('c3'), expect.any(AbortSignal)),
	);
	expect(view.container.querySelector('.cm-editor')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: /Initial/ }));
	await waitFor(() =>
		expect(versioning.changedFiles).toHaveBeenLastCalledWith(null, hash('c1'), expect.any(AbortSignal)),
	);
	expect(operations.checkout).not.toHaveBeenCalled();
});

test('file navigation windows long lists, keeps fixed targets, groups folders and supports arrow keys', async () => {
	mockLayout();
	const select = vi.fn();
	const files = Array.from({ length: 500 }, (_, index) => ({
		key: `file-${index}`,
		path: `notes/group-${index % 5}/file-${index}.md`,
		status: 'M',
	}));
	const view = render(
		<TestProviders>
			<FileNavigator files={files} selected={null} onSelect={select} label="Files" />
		</TestProviders>,
	);
	const list = screen.getByRole('list', { name: 'Files' });
	expect(list.querySelectorAll('li').length).toBeLessThan(100);
	expect(list.querySelector('li')?.style.height).toBe('32px');
	const first = within(list).getAllByRole('button')[0]!;
	fireEvent.keyDown(first, { key: 'ArrowDown' });
	expect(select).toHaveBeenLastCalledWith(files[1]);
	fireEvent.click(screen.getByRole('button', { name: t('versioning.files.tree') }));
	expect(await screen.findByRole('button', { name: 'notes/group-0' })).toBeTruthy();
	expect(view.container.querySelector('.cm-editor')).toBeNull();
});

test('persisted restore hold remains visible with a deliberate acknowledgement action', async () => {
	const acknowledgeRestore = vi.fn(async () => {});
	const service = { ...graphQueries(), acknowledgeRestore } as unknown as SyncService;
	const snapshot = { ...baseSnapshot(), device: { ...EMPTY_DEVICE_STATE, restoreHold: 'restored-123' } };
	render(
		<TestProviders>
			<SyncPage {...propsFor(snapshot, service)} />
		</TestProviders>,
	);
	expect(screen.getByText(t('versioning.restoreHold'))).toBeTruthy();
	expect(acknowledgeRestore).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: t('versioning.acknowledgeRestore') }));
	await waitFor(() => expect(acknowledgeRestore).toHaveBeenCalledOnce());
});

test('resolved Git failure reports and newer drafts are preserved by the commit composer', async () => {
	const pending: Array<(report: RunReport) => void> = [];
	const commit = vi.fn(() => new Promise<RunReport>((resolve) => pending.push(resolve)));
	const service = { ...graphQueries(), commit } as unknown as SyncService;
	const props = { ...propsFor(baseSnapshot('# branch.head main\0? new.md\0'), service), message: 'Original draft' };
	render(
		<TestProviders>
			<SyncPage {...props} />
		</TestProviders>,
	);
	const input = screen.getByRole<HTMLTextAreaElement>('textbox', { name: t('sync.message') });
	fireEvent.click(screen.getByRole('button', { name: t('sync.commit') }));
	await act(async () =>
		pending[0]!({ action: 'commit', ok: false, at: 1, auto: false, steps: [{ step: 'commit', state: 'failed' }] }),
	);
	expect(input.value).toBe('Original draft');
	fireEvent.click(screen.getByRole('button', { name: t('sync.commit') }));
	fireEvent.change(input, { target: { value: 'Next draft' } });
	await act(async () =>
		pending[1]!({ action: 'commit', ok: true, at: 2, auto: false, steps: [{ step: 'commit', state: 'done' }] }),
	);
	expect(input.value).toBe('Next draft');
	fireEvent.click(screen.getByRole('button', { name: t('sync.commit') }));
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.mode.history') }));
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.mode.changes') }));
	fireEvent.change(screen.getByRole('textbox', { name: t('sync.message') }), { target: { value: 'Reopened draft' } });
	await act(async () =>
		pending[2]!({ action: 'commit', ok: true, at: 3, auto: false, steps: [{ step: 'commit', state: 'done' }] }),
	);
	expect(props.setMessage).toHaveBeenLastCalledWith('Reopened draft');
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
