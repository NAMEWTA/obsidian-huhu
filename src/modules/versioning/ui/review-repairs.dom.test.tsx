import { diffPreferenceStore, DEFAULT_DIFF_PREFERENCES } from './diff/preferences';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, t } from '../../../shared/i18n';
import { SyncPage } from './sync-presentation';
import { parseStatus } from '../core/status';
import { EMPTY_DEVICE_STATE } from '../core/ports';
import type { SyncService, SyncSnapshot } from '../services/sync-service';
import type {
	ComparisonRequest,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionRef,
	VersioningQueries,
} from '../core/history';
import { diffMessages } from '../i18n';
import * as dialogs from './dialogs';

registerMessages(diffMessages);
afterEach(() => {
	vi.restoreAllMocks();
	diffPreferenceStore.set(DEFAULT_DIFF_PREFERENCES);
});
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

vi.mock('./diff/owner-pool', () => ({
	DiffOwner: ({ children }: { children: import('react').ReactNode }) => children,
}));
test('selecting A and B preserves source graph, button focus and pressed state', async () => {
	mockLayout();
	const service = graphQueries() as unknown as SyncService;
	const q = queries();
	q.resolveCommit = vi.fn(async (ref) => ref);
	q.compareFiles = vi.fn(async () => []);
	const view = render(
		<TestProviders>
			<SyncPage {...propsFor(baseSnapshot(), service, q)} requestedMode="history" />
		</TestProviders>,
	);
	const first = await screen.findByRole('button', { name: t('versioning.compare.setA', { oid: commits[0]!.short }) });
	first.focus();
	expect(document.activeElement).toBe(first);
	expect(first.getAttribute('aria-pressed')).toBe('true');
	fireEvent.click(first);
	await waitFor(() =>
		expect(view.container.querySelector('[data-versioning-workbench]')?.getAttribute('data-mode')).toBe('compare'),
	);
	expect(first.isConnected).toBe(true);
	expect(document.activeElement).toBe(first);
	expect(screen.queryByRole('button', { name: /Merge feature/ })).toBeTruthy();
	const second = screen.getByRole('button', { name: t('versioning.compare.setB', { oid: commits[1]!.short }) });
	second.focus();
	fireEvent.click(second);
	expect(second.isConnected).toBe(true);
	expect(document.activeElement).toBe(second);
	expect(second.getAttribute('aria-pressed')).toBe('true');
	fireEvent.click(second);
	expect(second.getAttribute('aria-pressed')).toBe('true');
});
import { parseDiffFromFile } from '@pierre/diffs';
import { GitHunkControls } from './diff/GitHunkControls';
import { hunkProof } from './diff/hunk-proof';
import { MultiDiffView } from './diff/MultiDiffView';
import { VisibilityContext } from '../../../ui/react/contexts';
test.each(['new', 'deleted'])('%s text-file hunk exposes checkpoint restore', async (kind) => {
	const left =
		kind === 'new'
			? {
					...endpoint({ kind: 'empty', path: 'note.md' }, ''),
					status: 'missing' as const,
					reason: 'empty' as const,
				}
			: endpoint({ kind: 'index', path: 'note.md' }, 'old\n');
	const right =
		kind === 'deleted'
			? {
					...endpoint({ kind: 'worktree', path: 'note.md' }, ''),
					status: 'missing' as const,
					reason: 'not-present' as const,
				}
			: endpoint({ kind: 'worktree', path: 'note.md' }, 'new\n');
	const source = kind === 'new' ? '' : 'old\n',
		target = kind === 'deleted' ? '' : 'new\n';
	const metadata = parseDiffFromFile(
		kind === 'new' ? null : { name: 'note.md', contents: source },
		kind === 'deleted' ? null : { name: 'note.md', contents: target },
		{ context: 2 },
		true,
	);
	const c = {
		id: kind,
		repositoryId: 'repo',
		intent: 'unstaged' as const,
		left,
		right,
		capturedAt: 1,
		identical: false,
		canCompare: true,
	} as ResolvedComparison;
	const currentIndex = kind === 'new' ? { ...left, id: 'index:note.md' } : left;
	const prepare = vi.fn(async () => ({ id: 'plan', beforeText: kind === 'deleted' ? null : target }));
	const apply = vi.fn(async () => ({ id: 'receipt' }));
	vi.spyOn(dialogs, 'confirmAction').mockResolvedValue(true);
	render(
		<TestProviders>
			<GitHunkControls
				comparison={c}
				metadata={metadata}
				proof={hunkProof(source, target, metadata)}
				hunkIndex={0}
				actions={{
					app: {} as never,
					service: { snapshot: { place: { toVault: (path: string) => path } } } as never,
					queries: {
						resolve: async (ref: RevisionRef) => (ref.kind === 'index' ? currentIndex : right),
					} as never,
					restores: { prepare, apply, cancel: vi.fn() } as never,
					direction: 'stage',
					head: 'head',
				}}
			/>
		</TestProviders>,
	);
	expect(screen.getByRole('button', { name: t('versioning.hunk.stage') })).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: t('versioning.hunk.restore') }));
	await waitFor(() => expect(apply).toHaveBeenCalledWith('plan'));
	expect(prepare).toHaveBeenCalledWith(
		expect.objectContaining({
			gitHunks: expect.objectContaining({
				indexId: currentIndex.id,
				indexText: kind === 'new' ? null : source,
				worktreeText: kind === 'deleted' ? null : target,
			}),
		}),
	);
});
test('hidden MultiDiffView does not begin domain reads', async () => {
	const compare = vi.fn(() => new Promise<ResolvedComparison>(() => {}));
	const q = { compare } as unknown as VersioningQueries;
	const view = render(
		<TestProviders>
			<VisibilityContext value={false}>
				<MultiDiffView
					queries={q}
					a={{ kind: 'commit', commit: 'a' }}
					b={{ kind: 'commit', commit: 'b' }}
					files={[{ path: 'note.md', status: 'M' }]}
					identity="hidden"
					preferences={DEFAULT_DIFF_PREFERENCES}
					onPreferencesChange={() => {}}
				/>
			</VisibilityContext>
		</TestProviders>,
	);
	await act(async () => {});
	expect(compare).not.toHaveBeenCalled();
	view.unmount();
});
test('next-hunk remains within its own comparison root', async () => {
	mockLayout();
	const q = {
		compare: vi.fn(async (request: ComparisonRequest) => resolved(request)),
	} as unknown as VersioningQueries;
	const files = [{ path: 'same.md', status: 'M' }];
	const a = { kind: 'commit' as const, commit: 'a' },
		b = { kind: 'commit' as const, commit: 'b' };
	const view = render(
		<TestProviders>
			<div data-leaf="one">
				<MultiDiffView
					queries={q}
					a={a}
					b={b}
					files={files}
					identity="one"
					preferences={DEFAULT_DIFF_PREFERENCES}
					onPreferencesChange={() => {}}
				/>
			</div>
			<div data-leaf="two">
				<MultiDiffView
					queries={q}
					a={a}
					b={b}
					files={files}
					identity="two"
					preferences={DEFAULT_DIFF_PREFERENCES}
					onPreferencesChange={() => {}}
				/>
			</div>
		</TestProviders>,
	);
	const first = view.container.querySelector<HTMLElement>('[data-leaf=one]')!,
		second = view.container.querySelector<HTMLElement>('[data-leaf=two]')!;
	await waitFor(() => expect(first.querySelector('[data-huhu-hunk-header]')).toBeTruthy());
	await waitFor(() => expect(second.querySelector('[data-huhu-hunk-header]')).toBeTruthy());
	fireEvent.click(within(second).getByRole('button', { name: t('versioning.diff.next') }));
	await waitFor(() => expect(second.contains(document.activeElement)).toBe(true));
	expect(first.contains(document.activeElement)).toBe(false);
});
import * as parsing from './diff/parse';
test('both swap entrances update effective endpoint roles and query direction', async () => {
	mockLayout();
	const q = queries();
	q.resolveCommit = vi.fn(async (ref) => ref);
	q.compareFiles = vi.fn(async () => [{ path: 'notes/a.md', status: 'M', additions: 1, deletions: 1 }]);
	const parse = vi.spyOn(parsing, 'parseComparison');
	const service = graphQueries() as unknown as SyncService;
	render(
		<TestProviders>
			<SyncPage {...propsFor(baseSnapshot(), service, q)} requestedMode="compare" />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getAllByRole('button', { name: t('versioning.diff.swap') })).toHaveLength(2));
	await waitFor(() => expect(parse).toHaveBeenCalled());
	const base = screen.getByRole<HTMLInputElement>('textbox', { name: t('versioning.compare.base') }),
		target = screen.getByRole<HTMLInputElement>('textbox', { name: t('versioning.compare.target') });
	const values = [base.value, target.value];
	fireEvent.click(screen.getAllByRole('button', { name: t('versioning.diff.swap') })[1]!);
	await waitFor(() => expect([base.value, target.value]).toEqual([values[1], values[0]]));
	await waitFor(() =>
		expect(q.compareFiles).toHaveBeenLastCalledWith(
			{ kind: 'worktree' },
			{ kind: 'commit', commit: values[0] },
			expect.any(AbortSignal),
		),
	);
	fireEvent.click(screen.getAllByRole('button', { name: t('versioning.diff.swap') })[0]!);
	await waitFor(() => expect([base.value, target.value]).toEqual(values));
});

test('hiding aborts the active generation before the next file and resumes without replacing a ready viewer', async () => {
	mockLayout();
	let finish!: (comparison: ResolvedComparison) => void;
	const compare = vi.fn((request: ComparisonRequest, _signal?: AbortSignal) =>
		compare.mock.calls.length === 1
			? new Promise<ResolvedComparison>((resolve) => {
					finish = resolve;
				})
			: Promise.resolve(resolved(request)),
	);
	const q = { compare } as unknown as VersioningQueries;
	const a = { kind: 'commit' as const, commit: 'a' },
		b = { kind: 'commit' as const, commit: 'b' },
		files = [
			{ path: 'one.md', status: 'M' },
			{ path: 'two.md', status: 'M' },
		];
	const content = (visible: boolean) => (
		<TestProviders>
			<VisibilityContext value={visible}>
				<MultiDiffView
					queries={q}
					a={a}
					b={b}
					files={files}
					identity="visibility"
					preferences={DEFAULT_DIFF_PREFERENCES}
					onPreferencesChange={() => {}}
				/>
			</VisibilityContext>
		</TestProviders>
	);
	const view = render(content(true));
	await waitFor(() => expect(compare).toHaveBeenCalledOnce());
	const signal = compare.mock.calls[0]![1] as AbortSignal;
	view.rerender(content(false));
	expect(signal.aborted).toBe(true);
	await act(async () =>
		finish(resolved({ intent: 'revisions', left: { ...a, path: 'one.md' }, right: { ...b, path: 'one.md' } })),
	);
	expect(compare).toHaveBeenCalledOnce();
	view.rerender(content(true));
	await waitFor(() => expect(view.container.querySelector('.huhu-versioning-diff')).toBeTruthy());
	const viewer = view.container.querySelector('.huhu-versioning-diff');
	view.rerender(content(false));
	expect(view.container.querySelector('.huhu-versioning-diff')).toBe(viewer);
	view.rerender(content(true));
	expect(view.container.querySelector('.huhu-versioning-diff')).toBe(viewer);
	view.unmount();
	expect(compare.mock.calls.at(-1)?.[1]?.aborted).toBe(true);
});

import { CompareEndpoints } from './diff/CompareEndpoints';
test('endpoint role capsules show real totals and clear them during loading and unknown binary statistics', () => {
	const view = render(
		<TestProviders>
			<CompareEndpoints
				a="old"
				b="new"
				files={[
					{ path: 'a.md', status: 'M', additions: 3, deletions: 2 },
					{ path: 'b.md', status: 'A', additions: 5, deletions: 0 },
				]}
				onChange={() => {}}
			/>
		</TestProviders>,
	);
	expect(screen.getByRole('status').textContent).toContain(
		t('versioning.compare.summary', { files: 2, additions: 8, deletions: 2 }),
	);
	expect(view.container.querySelector('[data-variant=error]')?.textContent).toContain('A');
	expect(view.container.querySelector('[data-variant=success]')?.textContent).toContain('B');
	view.rerender(
		<TestProviders>
			<CompareEndpoints a="next" b="new" onChange={() => {}} />
		</TestProviders>,
	);
	expect(screen.getByRole('status').textContent).toBe(t('versioning.files.loading'));
	view.rerender(
		<TestProviders>
			<CompareEndpoints
				a="next"
				b="new"
				files={[{ path: 'binary.png', status: 'M', additions: null, deletions: null }]}
				onChange={() => {}}
			/>
		</TestProviders>,
	);
	expect(screen.getByRole('status').textContent).toContain(
		t('versioning.compare.summary', { files: 1, additions: '?', deletions: '?' }),
	);
	expect(screen.getByRole('status').textContent).toContain(t('versioning.compare.unknownStats'));
});

test('a saved reversed preference enters a renamed worktree comparison with consistent roles, paths and totals', async () => {
	mockLayout();
	diffPreferenceStore.set({ ...DEFAULT_DIFF_PREFERENCES, swapped: true });
	const q = queries();
	q.resolveCommit = vi.fn(async (ref) => ref);
	q.compareFiles = vi.fn(async () => [{ path: 'old.md', from: 'new.md', status: 'R', additions: 2, deletions: 1 }]);
	const compare = vi.spyOn(q, 'compare');
	render(
		<TestProviders>
			<SyncPage
				{...propsFor(baseSnapshot(), graphQueries() as unknown as SyncService, q)}
				requestedMode="compare"
			/>
		</TestProviders>,
	);
	await waitFor(() => expect(compare).toHaveBeenCalled());
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: t('versioning.compare.base') }).value).toBe(
		'WORKTREE',
	);
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: t('versioning.compare.target') }).value).toBe(
		hash('c3'),
	);
	expect(compare).toHaveBeenLastCalledWith(
		expect.objectContaining({
			left: { kind: 'worktree', path: 'new.md' },
			right: { kind: 'commit', commit: hash('c3'), path: 'old.md' },
		}),
		expect.any(AbortSignal),
	);
	expect(
		screen
			.getAllByRole('status')
			.some((node) =>
				node.textContent?.includes(t('versioning.compare.summary', { files: 1, additions: 2, deletions: 1 })),
			),
	).toBe(true);
});
