import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { TestProviders } from '../../../ui/react/test-providers';
import { registerMessages, t } from '../../../shared/i18n';
import { diffMessages } from '../i18n';
import type { ResolvedComparison, ResolvedEndpoint, TextSnapshot } from '../core/history';
import { AsyncDiffSurface, DiffSurface } from './DiffSurface';

registerMessages(diffMessages);
// The package's Node condition selects an inert server build; exercise the installed browser implementation in happy-dom.
vi.mock('react-resizable-panels', () => vi.importActual('../../../../node_modules/react-resizable-panels/dist/react-resizable-panels.browser.development.js'));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

test('three layouts render real read-only CM views, with two independent source panes when stacked', async () => {
	const destroy = vi.spyOn(EditorView.prototype, 'destroy');
	const view = render(
		<TestProviders>
			<DiffSurface comparison={comparison()} />
		</TestProviders>,
	);
	await waitFor(() => expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(2));
	expect(view.container.querySelector('.cm-mergeView')).toBeTruthy();
	expect(view.container.querySelectorAll('[contenteditable="true"]')).toHaveLength(0);
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.stacked') }));
	await waitFor(() => expect(view.container.querySelectorAll('.huhu-versioning-stacked-pane')).toHaveLength(2));
	expect(view.container.querySelector('.cm-mergeView')).toBeNull();
	const panes = view.container.querySelectorAll('.huhu-versioning-stacked-pane');
	expect(panes[0]?.querySelector('.cm-content')?.textContent).toContain('旧内容');
	expect(panes[0]?.querySelector('.cm-content')?.textContent).not.toContain('新内容');
	expect(panes[1]?.querySelector('.cm-content')?.textContent).toContain('新内容');
	expect(panes[1]?.querySelector('.cm-content')?.textContent).not.toContain('旧内容');
	expect(view.container.querySelector('.huhu-versioning-removed-text')).toBeTruthy();
	expect(view.container.querySelector('.huhu-versioning-added-text')).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.next') }));
	expect(screen.getByText(t('versioning.diff.changeCount', { current: 1, count: 1 }))).toBeTruthy();
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.unified') }));
	await waitFor(() => expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(1));
	expect(view.container.querySelector('.cm-deletedChunk')).toBeTruthy();
	expect(view.container.querySelector('.cm-chunkButtons')).toBeNull();
	view.unmount();
	expect(destroy).toHaveBeenCalledTimes(5);
});

test('auto layout uses stacked panes in a narrow comparison and never overrides a manual choice on resize', async () => {
	let width = 390, measure = () => {};
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
	vi.stubGlobal('ResizeObserver', class implements ResizeObserver {
		constructor(private readonly callback: ResizeObserverCallback) {}
		observe(element: Element) {
			if (element.classList.contains('huhu-versioning-diff')) measure = () => this.callback([], this);
		}
		unobserve() {}
		disconnect() {}
	});
	const view = render(<TestProviders><DiffSurface comparison={comparison()} /></TestProviders>);
	await act(async () => measure());
	await waitFor(() => expect(view.container.querySelector('[data-layout="stacked"]')).toBeTruthy());
	width = 1200;
	await act(async () => measure());
	await waitFor(() => expect(view.container.querySelector('[data-layout="side-by-side"]')).toBeTruthy());
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.unified') }));
	width = 390;
	await act(async () => measure());
	await waitFor(() => expect(view.container.querySelector('[data-layout="unified"]')).toBeTruthy());
});

test.each(['side-by-side', 'stacked', 'unified'] as const)('swapping twice in %s restores fixed endpoints without changing the comparison', async layout => {
	const left = '# 旧版\n', right = '# 新版\n';
	const source = comparison('swap', left, right), baseline = structuredClone(source);
	const view = render(<TestProviders><DiffSurface comparison={source} initialLayout={layout} /></TestProviders>);
	const docs = () => [...view.container.querySelectorAll('.cm-editor')].map(element => EditorView.findFromDOM(element as HTMLElement)!.state.doc.toString());
	await waitFor(() => expect(docs()).toEqual(layout === 'unified' ? [right] : [left, right]));
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.swap') }));
	await waitFor(() => expect(docs()).toEqual(layout === 'unified' ? [left] : [right, left]));
	expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('bbb');
	expect(view.container.querySelector('[data-endpoint="right"]')?.textContent).toContain('aaa');
	fireEvent.click(screen.getByRole('button', { name: t('versioning.diff.swap') }));
	await waitFor(() => expect(docs()).toEqual(layout === 'unified' ? [right] : [left, right]));
	expect(source).toEqual(baseline);
});

test.each(['side-by-side', 'stacked'] as const)('%s scroll sync maps real editor line blocks, can be disabled and releases pending work on close', async layout => {
	const view = render(<TestProviders><DiffSurface initialLayout={layout}
		comparison={comparison('scroll', 'one\ntwo\nthree\nfour\nfive\n', 'one\nadded-a\nadded-b\ntwo\nthree\nfour\nfive\n')} /></TestProviders>);
	await waitFor(() => expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(2));
	const [a, b] = [...view.container.querySelectorAll('.cm-editor')].map(element => EditorView.findFromDOM(element as HTMLElement)!);
	const hostA = layout === 'side-by-side' ? a!.dom.parentElement! : a!.scrollDOM;
	const hostB = layout === 'side-by-side' ? b!.dom.parentElement! : b!.scrollDOM;
	const toggle = screen.getByRole('button', { name: t('versioning.diff.syncScroll') });
	expect(toggle.getAttribute('aria-pressed')).toBe('true');
	fireEvent.click(toggle);
	const source = a!.lineBlockAt(a!.state.doc.line(4).from), target = b!.lineBlockAt(b!.state.doc.line(6).from);
	hostA.scrollTop = source.top + source.height / 2;
	fireEvent.scroll(hostA);
	const frame = () => new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
	await act(async () => { await frame(); await frame(); });
	expect(hostB.scrollTop).toBe(0);
	fireEvent.click(toggle);
	fireEvent.scroll(hostA);
	await waitFor(() => expect(hostB.scrollTop).toBeCloseTo(target.top + target.height / 2));
	await act(async () => { await frame(); await frame(); });
	const backSource = b!.lineBlockAt(b!.state.doc.line(7).from), backTarget = a!.lineBlockAt(a!.state.doc.line(5).from);
	hostB.scrollTop = backSource.top;
	fireEvent.scroll(hostB);
	await waitFor(() => expect(hostA.scrollTop).toBeCloseTo(backTarget.top));
	await act(async () => { await frame(); await frame(); });
	const oldTarget = hostB.scrollTop;
	hostA.scrollTop = 1;
	fireEvent.scroll(hostA);
	view.unmount();
	await frame();
	expect(hostB.scrollTop).toBe(oldTarget);
});

test('stacked panes have a bounded keyboard separator and retain their ratio across layouts', async () => {
	const view = render(<TestProviders><DiffSurface comparison={comparison()} initialLayout="stacked" /></TestProviders>);
	await waitFor(() => expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(2));
	let handle = screen.getByRole('separator', { name: t('versioning.diff.resizeStacked') });
	expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
	await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('50'));
	fireEvent.keyDown(handle, { key: 'ArrowDown' });
	await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('55'));
	fireEvent.keyDown(handle, { key: 'End' });
	await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('80'));
	fireEvent.keyDown(handle, { key: 'Home' });
	await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('20'));
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.unified') }));
	expect(screen.queryByRole('separator')).toBeNull();
	fireEvent.click(screen.getByRole('radio', { name: t('versioning.diff.stacked') }));
	handle = await screen.findByRole('separator', { name: t('versioning.diff.resizeStacked') });
	await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('20'));
	expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(2);
	view.unmount();
	expect(screen.queryByRole('separator')).toBeNull();
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
	expect(view.container.querySelector('.cm-editor')).toBeNull();
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
	expect(view.container.querySelector('.cm-editor')).toBeNull();
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
	expect(view.container.querySelector('.cm-editor')).toBeNull();
	view.rerender(
		<TestProviders>
			<DiffSurface comparison={comparison('eol', 'a\r\n', 'a\n')} />
		</TestProviders>,
	);
	await screen.findByText(t('versioning.diff.metadataOnly'));
	expect(view.container.textContent).toContain('CRLF');
	expect(view.container.textContent).toContain('LF');
});

test('folded unchanged ranges use keyboard reachable buttons in both independent panes', async () => {
	const common = Array.from({ length: 60 }, (_, index) => `line ${index}`).join('\n');
	const view = render(
		<TestProviders>
			<DiffSurface comparison={comparison('folds', `old\n${common}`, `new\n${common}`)} initialLayout="stacked" />
		</TestProviders>,
	);
	await waitFor(() => expect(view.container.querySelectorAll('.huhu-versioning-fold button')).toHaveLength(2));
	const first = view.container.querySelector<HTMLButtonElement>('.huhu-versioning-fold button')!;
	expect(first.type).toBe('button');
	fireEvent.click(first);
	await waitFor(() => expect(view.container.querySelectorAll('.huhu-versioning-fold')).toHaveLength(0));
});
