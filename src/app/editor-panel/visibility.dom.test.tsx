import { COMMENTS_PANEL } from '../../modules/comments/api';
import { NOTE_HISTORY_PANEL } from '../../modules/versioning/api';
import { mountEditorPanelHost } from './panel-host';
import { mountNoteHistoryPanel } from '../../modules/versioning/ui/history/history-panel-page';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { EditorContextAccess, EditorDocumentContext } from '../contracts/editor-context';
import { setLanguage } from '../../shared/i18n';
import { HuhuProviders } from '../../ui/react/providers';
import type { FileHistoryEntry, FileHistoryPage, HistoryOptions, VersioningQueries } from '../../modules/versioning/core/history';
import { EMPTY_DEVICE_STATE } from '../../modules/versioning/core/ports';
import type { RestoreReceipt } from '../../modules/versioning/core/restore';
import type { NoteHistoryHost } from '../../modules/versioning/services/history-host';
import type { NoteReviewService } from '../../modules/versioning/services/note-review';
import type { RestoreService } from '../../modules/versioning/services/restore-service';
import type { SyncService, SyncSnapshot } from '../../modules/versioning/services/sync-service';
import { NoteHistoryPanel } from '../../modules/versioning/ui/history/NoteHistoryPanel';

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

async function fixture(more = false, released = false) {
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
		receipts: () => [released ? { ...checkpoint('A'), objectsReleasedAt: 10 } : checkpoint('A'), checkpoint('B')],
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
	return { host, documents,
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


test.each([true, false])('independent history receives explicit host visibility, hidden=%s', async hidden => {
 const f = await fixture();
 const container = document.createElement('div');
 Object.assign(container, { addClass: (...names: string[]) => container.classList.add(...names), removeClass: (...names: string[]) => container.classList.remove(...names) });
 document.body.append(container); let stop = () => {};
 const comments = { mount: (element: HTMLElement) => { element.textContent = 'Comments content'; return { setVisible() {}, dispose() { element.replaceChildren(); } }; } };
 const history = { mount: (element: HTMLElement, _documents: EditorContextAccess, visible: boolean) => {
  Object.assign(element, { addClass: (...names: string[]) => element.classList.add(...names), removeClass: (...names: string[]) => element.classList.remove(...names) });
  return mountNoteHistoryPanel(element, f.host, visible);
 } };
 const services = { peek: (key: unknown) => key === COMMENTS_PANEL ? comments : key === NOTE_HISTORY_PANEL ? history : undefined, watch: () => () => {}, acquire: async () => undefined };
 try {
  await act(async () => { stop = mountEditorPanelHost({ container, services: services as never, documents: f.documents, initialTab: 'history', select() {}, openSettings() {} }); });
  await screen.findByRole('button', { name: /^Git version ·/ });
  if (hidden) fireEvent.mouseDown(screen.getByRole('tab', { name: 'Comments' }), { button: 0, ctrlKey: false });
  f.fileHistory.mockClear();
  await act(async () => { f.changeDocument(); await Promise.resolve(); });
  expect(f.fileHistory.mock.calls.length).toBe(hidden ? 0 : 1);
  if (hidden) {
   fireEvent.mouseDown(screen.getByRole('tab', { name: 'History' }), { button: 0, ctrlKey: false });
   await waitFor(() => expect(f.fileHistory).toHaveBeenCalledWith('other.md', expect.anything()));
  }
 } finally { await act(async () => stop()); container.remove(); }
 expect(f.listeners()).toBe(0);
});

test('a history root initially mounted hidden reads only after visibility is restored', async () => {
 const f = await fixture();
 const container = document.createElement('div'); document.body.append(container);
 Object.assign(container, { addClass: (...names: string[]) => container.classList.add(...names), removeClass: (...names: string[]) => container.classList.remove(...names) });
 let handle!: ReturnType<typeof mountNoteHistoryPanel>;
 try {
  await act(async () => { handle = mountNoteHistoryPanel(container, f.host, false); });
  await act(async () => { f.changeDocument(); await Promise.resolve(); });
  expect(f.fileHistory).not.toHaveBeenCalled();
  await act(async () => handle.setVisible(true));
  await waitFor(() => expect(f.fileHistory).toHaveBeenCalledWith('other.md', expect.anything()));
 } finally { await act(async () => handle?.dispose()); container.remove(); }
 expect(f.listeners()).toBe(0);
});
