import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { EditorContextAccess, EditorDocumentContext } from '../../../../app/contracts/editor-context';
import { setLanguage } from '../../../../shared/i18n';
import { HuhuProviders } from '../../../../ui/react/providers';
import type { FileHistoryEntry, FileHistoryPage, HistoryOptions, VersioningQueries } from '../../core/history';
import { EMPTY_DEVICE_STATE } from '../../core/ports';
import type { RestoreReceipt } from '../../core/restore';
import type { NoteHistoryHost } from '../../services/history-host';
import type { NoteReviewService } from '../../services/note-review';
import type { RestoreService } from '../../services/restore-service';
import type { SyncService, SyncSnapshot } from '../../services/sync-service';
import { NoteHistoryPanel } from './NoteHistoryPanel';

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

const commit: FileHistoryEntry = {
	id: 'git-version',
	commitOid: 'immutable-tip',
	parents: [],
	author: 'Author',
	time: 1,
	subject: 'Git version',
	pathAtRevision: 'note.md',
	status: 'M',
	ref: { kind: 'commit', commit: 'immutable-tip', path: 'note.md' },
};
function historyPage(more = false): FileHistoryPage {
	return {
		path: 'note.md',
		entries: [commit],
		tip: 'immutable-tip',
		complete: !more,
		lineage: 'git-rename-detection',
		...(more ? { nextCursor: { tip: 'immutable-tip', path: 'note.md', skip: 1 } } : {}),
	};
}
function checkpoint(id: string): RestoreReceipt {
	return {
		id,
		path: 'note.md',
		sourceId: `source-${id}`,
		sourceLabel: `Checkpoint ${id}`,
		mode: 'replace-current',
		stage: 'verified',
		createdAt: 1,
		updatedAt: 2,
		beforeObject: `before-${id}`,
		beforeDiskObject: `disk-${id}`,
		afterObject: `after-${id}`,
		repositoryBaseline: 'baseline',
	};
}

async function fixture(more = false) {
	setLanguage('en');
	let source: EditorDocumentContext = {
		id: 'document-a',
		path: 'note.md',
		leafId: 'leaf-a',
		ownerWindow: window,
		generation: 0,
	};
	const known = new Map([[source.id, source]]);
	const documentListeners = new Set<() => void>(),
		restoreListeners = new Set<() => void>(),
		reviewListeners = new Set<() => void>(),
		syncListeners = new Set<() => void>();
	const documents: EditorContextAccess = {
		current: () => source,
		get: (id) => known.get(id),
		capture: (id) => ({ context: known.get(id)!, text: 'current text' }),
		resolveLeaf: () => undefined,
		resolveView: () => undefined,
		returnTo: async () => {},
		subscribe: (listener) => {
			documentListeners.add(listener);
			return () => {
				documentListeners.delete(listener);
			};
		},
	};
	const fileHistory = vi.fn(async (_path: string, _options?: HistoryOptions) => historyPage(more));
	const unusedQuery = async (): Promise<never> => {
		throw new Error('The history panel should delegate comparison to the review service');
	};
	const queries: VersioningQueries = {
		fileHistory,
		resolveCommit: unusedQuery,
		resolve: unusedQuery,
		compare: unusedQuery,
		commitComparison: unusedQuery,
		changedFiles: unusedQuery,
	};
	const initialize = vi.fn(async () => {}),
		readSnapshot = vi.fn(async (id: string) => `Text of ${id}`);
	const restores = {
		initialize,
		readSnapshot,
		receipts: () => [checkpoint('A'), checkpoint('B')],
		subscribe: (listener: () => void) => {
			restoreListeners.add(listener);
			return () => {
				restoreListeners.delete(listener);
			};
		},
	} satisfies Pick<RestoreService, 'initialize' | 'readSnapshot' | 'receipts' | 'subscribe'>;
	const openVersion = vi.fn(async (_id: string, _entry: FileHistoryEntry, _mode?: 'current' | 'change') => {});
	const reviews = {
		openVersion,
		forDocument: () => undefined,
		compareWith: vi.fn(async () => {}),
		subscribe: (listener: () => void) => {
			reviewListeners.add(listener);
			return () => {
				reviewListeners.delete(listener);
			};
		},
	} satisfies Pick<NoteReviewService, 'openVersion' | 'forDocument' | 'compareWith' | 'subscribe'>;
	const snapshot: SyncSnapshot = {
		phase: 'ready',
		gitVersion: '2.51',
		operation: null,
		locked: false,
		remotes: [],
		identity: { name: '', email: '' },
		device: { ...EMPTY_DEVICE_STATE },
		place: { cwd: '/repo', root: '/repo', toRepo: (path) => path, toVault: (path) => path },
	};
	const sync = {
		snapshot,
		ready: true,
		subscribe: (listener: () => void) => {
			syncListeners.add(listener);
			return () => {
				syncListeners.delete(listener);
			};
		},
	} satisfies Pick<SyncService, 'snapshot' | 'ready' | 'subscribe'>;
	const host: NoteHistoryHost = {
		documents,
		queries,
		restores: restores as unknown as RestoreService,
		reviews: reviews as unknown as NoteReviewService,
		sync: sync as unknown as SyncService,
		openSettings: () => {},
	};
	const view = render(
		<HuhuProviders ownerDocument={document}>
			<NoteHistoryPanel host={host} />
		</HuhuProviders>,
	);
	await screen.findByRole('button', { name: /Git version/ });
	return {
		view,
		fileHistory,
		readSnapshot,
		openVersion,
		initialize,
		listeners: () => documentListeners.size + restoreListeners.size + reviewListeners.size + syncListeners.size,
		changeDocument() {
			source = { ...source, id: 'document-b', leafId: 'leaf-b', path: 'other.md' };
			known.set(source.id, source);
			for (const listener of documentListeners) listener();
		},
	};
}

async function selectSource(name: 'Git commits' | 'Restore checkpoints') {
	fireEvent.keyDown(screen.getByRole('combobox', { name: 'History source' }), { key: 'ArrowDown' });
	fireEvent.click(await screen.findByRole('option', { name }));
}

test.each(['resolve', 'reject'] as const)(
	'opens only the latest checkpoint when an earlier materialization finishes late: %s',
	async (completion) => {
		const f = await fixture(),
			first = deferred<string>(),
			second = deferred<string>();
		await selectSource('Restore checkpoints');
		await screen.findByRole('button', { name: /Checkpoint A/ });
		expect(f.readSnapshot).not.toHaveBeenCalled();
		f.readSnapshot.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
		fireEvent.click(screen.getByRole('button', { name: /Checkpoint A/ }));
		fireEvent.click(screen.getByRole('button', { name: /Checkpoint B/ }));
		await act(async () => {
			second.resolve('Latest selected B');
			await second.promise;
		});
		expect(f.openVersion).toHaveBeenCalledExactlyOnceWith(
			'document-a',
			expect.objectContaining({
				id: 'B',
				ref: { kind: 'local-snapshot', path: 'note.md', snapshotId: 'before-B', text: 'Latest selected B' },
			}),
			'current',
		);
		await act(async () => {
			if (completion === 'resolve') first.resolve('Late A');
			else first.reject(new Error('late read failure'));
			await first.promise.catch(() => {});
		});
		expect(f.openVersion).toHaveBeenCalledOnce();
		expect(screen.queryByRole('alert')).toBeNull();
		f.view.unmount();
	},
);

test.each(['history source', 'document', 'unmount'] as const)(
	'discards a pending checkpoint selection after changing %s',
	async (change) => {
		const f = await fixture(),
			pending = deferred<string>();
		await selectSource('Restore checkpoints');
		f.readSnapshot.mockImplementationOnce(() => pending.promise);
		fireEvent.click(await screen.findByRole('button', { name: /Checkpoint A/ }));
		expect(f.readSnapshot).toHaveBeenCalledExactlyOnceWith('before-A');
		if (change === 'history source') await selectSource('Git commits');
		else if (change === 'document') act(() => f.changeDocument());
		else f.view.unmount();
		await act(async () => {
			pending.resolve('Obsolete selection');
			await pending.promise;
		});
		expect(f.openVersion).not.toHaveBeenCalled();
		if (change !== 'unmount') f.view.unmount();
		expect(f.listeners()).toBe(0);
		expect(document.querySelector('.huhu-portal-root')).toBeNull();
	},
);

test('aborts the active pagination request on unmount and preserves its fixed-tip cursor', async () => {
	const f = await fixture(true),
		pending = deferred<FileHistoryPage>();
	f.fileHistory.mockImplementationOnce(() => pending.promise);
	fireEvent.click(await screen.findByRole('button', { name: 'Load older versions' }));
	expect(f.fileHistory).toHaveBeenCalledTimes(2);
	const options = f.fileHistory.mock.calls[1]![1]!;
	expect(options.cursor).toEqual({ tip: 'immutable-tip', path: 'note.md', skip: 1 });
	expect(options.signal?.aborted).toBe(false);
	f.view.unmount();
	expect(options.signal?.aborted).toBe(true);
	await act(async () => {
		pending.resolve(historyPage());
		await pending.promise;
	});
	expect(f.openVersion).not.toHaveBeenCalled();
	expect(f.listeners()).toBe(0);
	expect(document.querySelector('.huhu-portal-root')).toBeNull();
});

test('keeps a current snapshot-read failure visible without opening an empty comparison', async () => {
	const f = await fixture();
	await selectSource('Restore checkpoints');
	f.readSnapshot.mockRejectedValueOnce(new Error('checkpoint cannot be read'));
	fireEvent.click(await screen.findByRole('button', { name: /Checkpoint A/ }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('checkpoint cannot be read'));
	expect(f.openVersion).not.toHaveBeenCalled();
	f.view.unmount();
});
