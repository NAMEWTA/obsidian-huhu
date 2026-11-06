import { diffPreferenceStore, DEFAULT_DIFF_PREFERENCES } from './diff/preferences';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, t } from '../../../shared/i18n';
import { diffMessages } from '../i18n';
import type { ResolvedComparison, ResolvedEndpoint, TextSnapshot } from '../core/history';
import { AsyncDiffSurface, DiffSurface } from './DiffSurface';

registerMessages(diffMessages);
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function snapshot(text: string): TextSnapshot {
	return {
		text,
		hash: text,
		byteLength: text.length,
		encoding: 'utf-8',
		eol: text.includes('\r\n') ? 'crlf' : 'lf',
		hasBom: text.startsWith('\uFEFF'),
		endsWithNewline: text.endsWith('\n'),
	};
}
function endpoint(id: string, text: string): ResolvedEndpoint {
	return {
		repositoryId: 'repo',
		id,
		path: 'notes/project.md',
		label: id,
		ref: { kind: 'commit', commit: id.padEnd(40, '0'), path: 'notes/project.md' },
		status: 'text',
		snapshot: snapshot(text),
	};
}
function comparison(id = 'one', left = '# 项目\n目标：旧内容\n', right = '# 项目\n目标：新内容\n'): ResolvedComparison {
	return {
		id,
		repositoryId: 'repo',
		intent: 'commit',
		capturedAt: 1,
		left: endpoint('aaa', left),
		right: endpoint('bbb', right),
		identical: left === right,
		canCompare: true,
	};
}

vi.mock('./diff/owner-pool', () => ({
	DiffOwner: ({ children }: { children: import('react').ReactNode }) => children,
}));

test('the production library renders read-only metadata and shares layout, word and wrap controls', async () => {
	const view = render(
		<TestProviders>
			<DiffSurface comparison={comparison()} />
		</TestProviders>,
	);
	await waitFor(() =>
		expect(view.container.querySelector('diffs-container')?.shadowRoot?.textContent).toContain('旧内容'),
	);
	expect(view.container.querySelector('[contenteditable="true"]')).toBeNull();
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.stacked') }));
	await waitFor(() => expect(view.container.querySelector('[data-layout="stacked"]')).toBeTruthy());
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.wrap') }));
	expect(screen.getByRole('button', { name: t('versioning.diff.wrap') }).getAttribute('aria-pressed')).toBe('false');
	view.unmount();
	expect(view.container.querySelector('diffs-container')).toBeNull();
});
test('a narrow leaf forces stacked presentation and disables split', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390);
	const view = render(
		<TestProviders>
			<DiffSurface comparison={comparison()} />
		</TestProviders>,
	);
	await waitFor(() => expect(view.container.querySelector('[data-layout="stacked"]')).toBeTruthy());
	expect(screen.getByRole<HTMLButtonElement>('radio', { name: t('versioning.diff.sideBySide') }).disabled).toBe(true);
});
test('swapping changes the actual metadata sides and restores the immutable comparison', async () => {
	const source = comparison('swap', 'old unique\n', 'new unique\n'),
		baseline = structuredClone(source);
	const view = render(
		<TestProviders>
			<DiffSurface comparison={source} />
		</TestProviders>,
	);
	const text = () => view.container.querySelector('diffs-container')?.shadowRoot?.textContent;
	await waitFor(() => expect(text()).toContain('old unique'));
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.swap') }));
	await waitFor(() => expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('bbb'));
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.swap') }));
	await waitFor(() => expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('aaa'));
	expect(source).toEqual(baseline);
});

test('switching a file immediately clears the old diff and stale responses cannot replace the selection', async () => {
	const pending: Array<{ signal: AbortSignal; resolve: (value: ResolvedComparison) => void }> = [];
	const load = vi.fn(
		(signal: AbortSignal) => new Promise<ResolvedComparison>((resolve) => pending.push({ signal, resolve })),
	);
	const view = render(
		<TestProviders>
			<AsyncDiffSurface identity="a" load={load} />
		</TestProviders>,
	);
	await act(async () => {
		pending[0]!.resolve(comparison('a'));
	});
	await waitFor(() => expect(view.container.querySelector('[data-comparison-id="a"]')).toBeTruthy());
	view.rerender(
		<TestProviders>
			<AsyncDiffSurface identity="b" load={load} />
		</TestProviders>,
	);
	expect(view.container.querySelector('diffs-container')).toBeNull();
	expect(pending[0]!.signal.aborted).toBe(true);
	view.rerender(
		<TestProviders>
			<AsyncDiffSurface identity="c" load={load} />
		</TestProviders>,
	);
	expect(pending[1]!.signal.aborted).toBe(true);
	await act(async () => {
		pending[1]!.resolve(comparison('b'));
		pending[2]!.resolve(comparison('c'));
	});
	await waitFor(() => expect(view.container.querySelector('[data-comparison-id="c"]')).toBeTruthy());
	expect(view.container.querySelector('[data-comparison-id="b"]')).toBeNull();
});

test('cancel clears a pending comparison, aborts its read and retry creates a fresh request', async () => {
	const signals: AbortSignal[] = [];
	const load = vi.fn((signal: AbortSignal) => {
		signals.push(signal);
		return new Promise<ResolvedComparison>(() => {});
	});
	const view = render(
		<TestProviders>
			<AsyncDiffSurface identity="one" load={load} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('versioning.cancel') }));
	expect(signals[0]?.aborted).toBe(true);
	expect(screen.getByText(t('versioning.diff.cancelled'))).toBeTruthy();
	expect(view.container.querySelector('diffs-container')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: t('versioning.retry') }));
	expect(load).toHaveBeenCalledTimes(2);
	view.unmount();
	expect(signals[1]?.aborted).toBe(true);
});

test('non-text endpoint is explicit and display-normalized equality retains source metadata differences', async () => {
	const source = comparison('binary');
	const binary: ResolvedComparison = {
		...source,
		canCompare: false,
		left: { ...source.left, status: 'binary', byteLength: 10, reason: 'nul' },
	};
	const view = render(
		<TestProviders>
			<DiffSurface comparison={binary} />
		</TestProviders>,
	);
	expect(screen.getByText(t('versioning.diff.binary', { bytes: 10 }))).toBeTruthy();
	expect(view.container.querySelector('diffs-container')).toBeNull();
	view.rerender(
		<TestProviders>
			<DiffSurface comparison={comparison('eol', 'a\r\n', 'a\n')} />
		</TestProviders>,
	);
	await screen.findByText(t('versioning.diff.metadataOnly'));
	expect(view.container.textContent).toContain('CRLF');
	expect(view.container.textContent).toContain('LF');
});

afterEach(() => diffPreferenceStore.set(DEFAULT_DIFF_PREFERENCES));

test('a displayed Git hunk sends its canonical candidate and immutable source proofs; failure retains the diff', async () => {
	const middle = Array.from({ length: 10 }, (_, i) => `keep ${i}\n`).join('');
	const fixed = comparison('git-hunks', `old first\n${middle}old last\n`, `new first\n${middle}new last\n`);
	const source = {
		...fixed,
		intent: 'unstaged' as const,
		left: { ...fixed.left, ref: { kind: 'index' as const, path: fixed.left.path } },
		right: { ...fixed.right, ref: { kind: 'worktree' as const, path: fixed.right.path } },
	};
	const applyIndexHunks = vi.fn(async () => {
		throw new Error('source changed');
	});
	const service = { applyIndexHunks } as unknown as import('../services/sync-service').SyncService;
	const queries = {
		resolve: async (ref: { kind: string }) => (ref.kind === 'index' ? source.left : source.right),
	} as unknown as import('../core/history').VersioningQueries;
	const view = render(
		<TestProviders>
			<DiffSurface
				comparison={source}
				gitHunks={{ app: {} as never, service, queries, direction: 'stage', head: 'head' }}
			/>
		</TestProviders>,
	);
	const buttons = await screen.findAllByRole('button', { name: t('versioning.hunk.stage') });
	expect(buttons).toHaveLength(2);
	fireEvent.click(buttons[0]!);
	await screen.findByRole('alert');
	expect(applyIndexHunks).toHaveBeenCalledWith(
		expect.objectContaining({
			repositoryId: 'repo',
			path: source.right.path,
			direction: 'stage',
			indexId: source.left.id,
			worktreeId: source.right.id,
			comparison: source,
			selected: [expect.any(String)],
			candidate: `new first\n${middle}old last\n`,
		}),
	);
	expect(source.right.status === 'text' && source.right.snapshot.text).toBe(`new first\n${middle}new last\n`);
	expect(view.container.querySelector('diffs-container')?.shadowRoot?.textContent).toContain('new last');
	expect(screen.getAllByRole<HTMLButtonElement>('button', { name: t('versioning.hunk.stage') })[0]!.disabled).toBe(
		false,
	);
});
