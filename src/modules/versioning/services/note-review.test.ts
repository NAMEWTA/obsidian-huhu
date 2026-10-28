import { describe, expect, it, vi } from 'vitest';
import type { EditorContextAccess, EditorDocumentContext } from '../../../app/contracts/editor-context';
import type {
	ComparisonRequest,
	FileHistoryEntry,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionRef,
	VersioningQueries,
} from '../core/history';
import { NoteReviewService } from './note-review';
import type { DocumentSnapshot } from '../../../shared/storage/document-mutation';

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

function entry(commit: string, path = 'old-name.md'): FileHistoryEntry {
	return {
		id: commit,
		commitOid: commit,
		parents: [],
		author: 'Author',
		time: 1,
		subject: commit,
		pathAtRevision: path,
		status: 'M',
		ref: { kind: 'commit', commit, path },
	};
}

function endpoint(ref: RevisionRef): ResolvedEndpoint {
	return {
		repositoryId: 'repo',
		ref,
		id: JSON.stringify(ref),
		path: ref.path,
		label: ref.kind,
		status: 'text',
		snapshot: {
			text: 'text' in ref ? ref.text : 'historical text',
			hash: 'hash',
			byteLength: 15,
			encoding: 'utf-8',
			eol: 'none',
			hasBom: false,
			endsWithNewline: false,
		},
	};
}

function comparison(request: ComparisonRequest, id = 'comparison'): ResolvedComparison {
	return {
		id,
		repositoryId: 'repo',
		intent: request.intent,
		left: endpoint(request.left),
		right: endpoint(request.right),
		capturedAt: 1,
		identical: false,
		canCompare: true,
	};
}

function fixture(captureTarget?: (source: EditorDocumentContext, signal: AbortSignal) => Promise<DocumentSnapshot | undefined>) {
	const sources = new Map<string, { context: EditorDocumentContext; text: string }>();
	const capture = vi.fn((id: string) => {
		const source = sources.get(id);
		if (!source) throw new Error('versioning.source-closed');
		return { context: source.context, text: source.text };
	});
	const documents: EditorContextAccess = {
		capture,
		get: (id) => sources.get(id)?.context,
		current: (win) => [...sources.values()].find((source) => source.context.ownerWindow === win)?.context,
		resolveLeaf: () => undefined,
		resolveView: () => undefined,
		returnTo: async () => {},
		subscribe: () => () => {},
	};
	const compare = vi.fn(async (request: ComparisonRequest, _signal?: AbortSignal) => comparison(request));
	const commitComparison = vi.fn(async (commit: string, path: string, parent?: string, _signal?: AbortSignal) =>
		comparison({
			intent: 'commit',
			left: { kind: 'commit', commit: parent ?? 'parent', path },
			right: { kind: 'commit', commit, path },
		}),
	);
	const queries: VersioningQueries = {
		compare,
		commitComparison,
		resolve: async (ref) => endpoint(ref),
		resolveCommit: async (ref) => ref,
		fileHistory: async (path) => ({
			entries: [],
			tip: null,
			path,
			complete: true,
			lineage: 'git-rename-detection',
		}),
		changedFiles: async () => [],
	};
	const open = vi.fn(async (_id: string, _win: Window): Promise<void> => {});
	const toRepo = vi.fn((path: string) => (path.startsWith('vault/') ? path.slice('vault/'.length) : null));
	const service = new NoteReviewService({ documents, queries, toRepo, open, captureTarget });
	return {
		service,
		sources,
		capture,
		compare,
		commitComparison,
		open,
		toRepo,
		add(id: string, text = 'unsaved B', ownerWindow = {} as Window, path = 'vault/current-name.md') {
			const context: EditorDocumentContext = { id, leafId: `leaf-${id}`, path, ownerWindow, generation: 0 };
			sources.set(id, { context, text });
			return context;
		},
		edit(id: string, text: string) {
			const source = sources.get(id)!;
			sources.set(id, { text, context: { ...source.context, generation: source.context.generation + 1 } });
		},
	};
}

describe('NoteReviewService', () => {
	it('a failed or generation-stale target capture disables only new hunk recovery and never refreshes B implicitly', async () => {
		const pending = deferred<DocumentSnapshot>();
		const host = fixture(() => pending.promise), source = host.add('source');
		await host.service.openVersion(source.id, entry('first'));
		host.edit(source.id, 'intervening edit'); host.edit(source.id, 'unsaved B');
		pending.resolve({ path: source.path, documentKey: 'new-file', exists: true, text: 'unsaved B', diskText: 'unsaved B',
			originLeafId: source.leafId, buffers: [{ id: 'editor', text: 'unsaved B', generation: 2 }] });
		await Promise.resolve(); await Promise.resolve();
		expect(host.service.forDocument(source.id)).toMatchObject({ phase: 'ready', targetPhase: 'unavailable', buffer: { generation: 0, text: 'unsaved B' } });
		expect(host.service.forDocument(source.id)?.restoreTarget).toBeUndefined();
		host.service.dispose();
		const failed = fixture(async () => { throw new Error('cannot read writable target'); }), next = failed.add('next');
		await failed.service.openVersion(next.id, entry('first'));
		expect(failed.service.forDocument(next.id)).toMatchObject({ phase: 'ready', targetPhase: 'unavailable' });
		failed.service.dispose();
	});
	it('binds a target baseline to fixed B and ignores a late capture after explicit refresh or close', async () => {
		const captures: Array<{ source: EditorDocumentContext; signal: AbortSignal; pending: ReturnType<typeof deferred<DocumentSnapshot>> }> = [];
		const host = fixture((source, signal) => { const pending = deferred<DocumentSnapshot>(); captures.push({ source, signal, pending }); return pending.promise; });
		const source = host.add('source');
		await host.service.openVersion(source.id, entry('first'));
		expect(captures).toHaveLength(1);
		host.edit(source.id, 'fresh B');
		const id = host.service.forDocument(source.id)!.id;
		await host.service.refreshCurrent(id);
		expect(captures[0]!.signal.aborted).toBe(true);
		const target = (text: string) => ({ path: source.path, documentKey: text, exists: true, text, diskText: text,
			originLeafId: source.leafId, buffers: [{ id: 'editor', text, generation: 1 }] });
		captures[1]!.pending.resolve(target('fresh B'));
		await Promise.resolve(); await Promise.resolve();
		expect(host.service.get(id)?.restoreTarget?.documentKey).toBe('fresh B');
		captures[0]!.pending.resolve(target('unsaved B'));
		await Promise.resolve(); await Promise.resolve();
		expect(host.service.get(id)?.restoreTarget?.documentKey).toBe('fresh B');
		await host.service.openVersion(source.id, entry('next'));
		expect(captures).toHaveLength(2);
		await host.service.refreshCurrent(id);
		host.service.close(id);
		captures[2]!.pending.resolve(target('fresh B'));
		await Promise.resolve(); await Promise.resolve();
		expect(host.service.get(id)).toBeUndefined();
		host.service.dispose();
	});
	it('holds B fixed across history selections and recaptures it only on explicit refresh', async () => {
		const host = fixture(),
			source = host.add('source');
		await host.service.openVersion(source.id, entry('first'));
		const first = host.service.forDocument(source.id)!;
		expect(first.buffer).toEqual({
			kind: 'editor-buffer',
			path: 'current-name.md',
			text: 'unsaved B',
			generation: 0,
		});
		expect(Object.isFrozen(first.buffer)).toBe(true);
		host.edit(source.id, 'newer unsaved B');
		await host.service.openVersion(source.id, entry('second', 'renamed-again.md'));
		const second = host.service.forDocument(source.id)!;
		expect(second.id).toBe(first.id);
		expect(second.buffer).toBe(first.buffer);
		expect(host.capture).toHaveBeenCalledTimes(1);
		expect(host.compare.mock.calls[1]?.[0]).toEqual({
			intent: 'history-current',
			left: entry('second', 'renamed-again.md').ref,
			right: first.buffer,
		});
		expect(host.service.isCurrentChanged(first.id)).toBe(true);
		await host.service.refreshCurrent(first.id);
		const refreshed = host.service.get(first.id)!;
		expect(refreshed.buffer).toMatchObject({ text: 'newer unsaved B', generation: 1, path: 'current-name.md' });
		expect(refreshed.selected.commitOid).toBe('second');
		expect(refreshed.mode).toBe('current');
		expect(host.service.isCurrentChanged(first.id)).toBe(false);
		host.service.dispose();
	});

	it.each(['resolve', 'reject'] as const)(
		'cancels prior selections and ignores a late %s from a provider that disregards abort',
		async (completion) => {
			const host = fixture(),
				source = host.add('source');
			const stale = deferred<ResolvedComparison>(),
				latest = deferred<ResolvedComparison>();
			host.compare.mockImplementationOnce(() => stale.promise).mockImplementationOnce(() => latest.promise);
			const first = host.service.openVersion(source.id, entry('first'));
			const second = host.service.openVersion(source.id, entry('second'));
			expect(host.compare.mock.calls[0]?.[1]?.aborted).toBe(true);
			expect(host.compare.mock.calls[1]?.[1]?.aborted).toBe(false);
			const selected = comparison(host.compare.mock.calls[1]![0], 'latest');
			latest.resolve(selected);
			await second;
			if (completion === 'resolve') stale.resolve(comparison(host.compare.mock.calls[0]![0], 'stale'));
			else stale.reject(new Error('late failure'));
			await first;
			expect(host.service.forDocument(source.id)).toMatchObject({
				selected: { commitOid: 'second' },
				phase: 'ready',
				comparison: selected,
			});
			host.service.dispose();
		},
	);

	it('deduplicates pending view opens for one document and isolates same-path sources in separate windows', async () => {
		const host = fixture(),
			firstWindow = {} as Window,
			secondWindow = {} as Window;
		const first = host.add('first', 'first buffer', firstWindow),
			second = host.add('second', 'second buffer', secondWindow);
		const opening = deferred<void>();
		host.open.mockImplementation(() => opening.promise);
		const pending = [
			host.service.openVersion(first.id, entry('a')),
			host.service.openVersion(first.id, entry('b')),
			host.service.openVersion(second.id, entry('a')),
		];
		const firstSession = host.service.forDocument(first.id)!,
			secondSession = host.service.forDocument(second.id)!;
		expect(firstSession.id).not.toBe(secondSession.id);
		expect(firstSession.buffer.text).toBe('first buffer');
		expect(secondSession.buffer.text).toBe('second buffer');
		expect(host.open).toHaveBeenCalledTimes(2);
		expect(host.open).toHaveBeenCalledWith(firstSession.id, firstWindow);
		expect(host.open).toHaveBeenCalledWith(secondSession.id, secondWindow);
		opening.resolve();
		await Promise.all(pending);
		expect(host.service.forDocument(first.id)?.selected.commitOid).toBe('b');
		expect(host.service.forDocument(second.id)?.selected.commitOid).toBe('a');
		host.service.dispose();
	});

	it('does not cancel or overwrite another source when one source selects a new revision', async () => {
		const host = fixture(),
			first = host.add('first', 'first buffer'),
			second = host.add('second', 'second buffer');
		const pending = [
			deferred<ResolvedComparison>(),
			deferred<ResolvedComparison>(),
			deferred<ResolvedComparison>(),
		] as const;
		for (const read of pending) host.compare.mockImplementationOnce(() => read.promise);
		const oldFirst = host.service.openVersion(first.id, entry('old-first'));
		const other = host.service.openVersion(second.id, entry('other'));
		const newFirst = host.service.openVersion(first.id, entry('new-first'));
		expect(host.compare.mock.calls[0]?.[1]?.aborted).toBe(true);
		expect(host.compare.mock.calls[1]?.[1]?.aborted).toBe(false);
		expect(host.compare.mock.calls[2]?.[1]?.aborted).toBe(false);
		pending[1].resolve(comparison(host.compare.mock.calls[1]![0], 'other-result'));
		pending[2].resolve(comparison(host.compare.mock.calls[2]![0], 'first-result'));
		pending[0].resolve(comparison(host.compare.mock.calls[0]![0], 'stale-result'));
		await Promise.all([oldFirst, other, newFirst]);
		expect(host.service.forDocument(first.id)).toMatchObject({
			phase: 'ready',
			comparison: { id: 'first-result' },
			buffer: { text: 'first buffer' },
		});
		expect(host.service.forDocument(second.id)).toMatchObject({
			phase: 'ready',
			comparison: { id: 'other-result' },
			buffer: { text: 'second buffer' },
		});
		host.service.dispose();
	});

	it('uses commit-parent and two-version comparisons without losing the captured current buffer', async () => {
		const host = fixture(),
			source = host.add('source');
		await host.service.openVersion(source.id, entry('a'), 'change');
		const session = host.service.forDocument(source.id)!;
		expect(host.commitComparison).toHaveBeenCalledExactlyOnceWith(
			'a',
			'old-name.md',
			undefined,
			expect.any(AbortSignal),
		);
		expect(host.compare).not.toHaveBeenCalled();
		await host.service.compareWith(session.id, entry('b', 'another-name.md'));
		expect(host.compare.mock.calls[0]?.[0]).toEqual({
			intent: 'revisions',
			left: entry('a').ref,
			right: entry('b', 'another-name.md').ref,
		});
		expect(host.service.get(session.id)).toMatchObject({
			mode: 'pair',
			baseline: entry('a'),
			selected: entry('b', 'another-name.md'),
			buffer: session.buffer,
		});
		await host.service.refreshCurrent(session.id);
		expect(host.service.get(session.id)).toMatchObject({
			mode: 'current',
			selected: entry('b', 'another-name.md'),
			baseline: undefined,
		});
		expect(host.compare.mock.calls[1]?.[0].right).toMatchObject({ kind: 'editor-buffer', text: 'unsaved B' });
		host.service.dispose();
	});

	it('keeps query failures explicit and retries the same immutable selection', async () => {
		const host = fixture(),
			source = host.add('source');
		host.compare.mockRejectedValueOnce(new Error('object unavailable'));
		await host.service.openVersion(source.id, entry('a'));
		const failed = host.service.forDocument(source.id)!;
		expect(failed).toMatchObject({ phase: 'error', error: 'object unavailable', comparison: undefined });
		host.edit(source.id, 'changed while retrying');
		await host.service.retry(failed.id);
		expect(host.service.get(failed.id)).toMatchObject({ phase: 'ready', error: undefined, buffer: failed.buffer });
		expect(host.compare.mock.calls[1]?.[0]).toEqual(host.compare.mock.calls[0]?.[0]);
		host.service.dispose();
	});

	it.each(['close', 'dispose'] as const)(
		'aborts in-flight reads on %s and cannot resurrect a closed session',
		async (action) => {
			const host = fixture(),
				source = host.add('source'),
				pending = deferred<ResolvedComparison>();
			host.compare.mockImplementationOnce(() => pending.promise);
			const opening = host.service.openVersion(source.id, entry('a'));
			const id = host.service.forDocument(source.id)!.id;
			const listener = vi.fn(),
				unsubscribe = host.service.subscribe(listener);
			if (action === 'close') host.service.close(id);
			else host.service.dispose();
			const beforeCompletion = listener.mock.calls.length;
			expect(host.compare.mock.calls[0]?.[1]?.aborted).toBe(true);
			pending.resolve(comparison(host.compare.mock.calls[0]![0]));
			await opening;
			expect(host.service.get(id)).toBeUndefined();
			expect(host.service.forDocument(source.id)).toBeUndefined();
			expect(listener).toHaveBeenCalledTimes(beforeCompletion);
			unsubscribe();
			host.service.dispose();
			await expect(host.service.openVersion(source.id, entry('b'))).rejects.toThrow('versioning.source-closed');
		},
	);

	it('cleans up the comparison if opening the review view fails', async () => {
		const host = fixture(),
			source = host.add('source'),
			pending = deferred<ResolvedComparison>();
		host.compare.mockImplementationOnce(() => pending.promise);
		host.open.mockRejectedValueOnce(new Error('window closed'));
		await expect(host.service.openVersion(source.id, entry('a'))).rejects.toThrow('window closed');
		expect(host.service.forDocument(source.id)).toBeUndefined();
		expect(host.compare.mock.calls[0]?.[1]?.aborted).toBe(true);
		pending.resolve(comparison(host.compare.mock.calls[0]![0]));
		await Promise.resolve();
		expect(host.service.forDocument(source.id)).toBeUndefined();
		host.service.dispose();
	});

	it('rejects unavailable or outside-repository sources before opening a review', async () => {
		const host = fixture();
		await expect(host.service.openVersion('closed', entry('a'))).rejects.toThrow('versioning.source-closed');
		const outside = host.add('outside', 'text', {} as Window, 'another-vault/a.md');
		await expect(host.service.openVersion(outside.id, entry('a'))).rejects.toThrow('versioning.outside-repository');
		expect(host.compare).not.toHaveBeenCalled();
		expect(host.open).not.toHaveBeenCalled();
		host.service.dispose();
	});
});
