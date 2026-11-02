import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { EditorContextAccess, EditorDocumentContext } from '../../../../app/contracts/editor-context';
import { setLanguage } from '../../../../shared/i18n';
import type { TextStorage } from '../../../../shared/storage/ports';
import { HuhuProviders } from '../../../../ui/react/providers';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { EMPTY_DEVICE_STATE } from '../../core/ports';
import { HistoryQueryService } from '../../services/history-query';
import { LocalHistoryStore } from '../../services/local-history-store';
import { NoteReviewService } from '../../services/note-review';
import type { RestoreService } from '../../services/restore-service';
import type { SyncService } from '../../services/sync-service';
import type { PrepareRestore, RestorePlan } from '../../core/restore';
import { NoteHistoryPanel } from './NoteHistoryPanel';
import { NoteReviewPage } from './NoteReviewPage';

vi.mock('react-resizable-panels', () => vi.importActual('../../../../../node_modules/react-resizable-panels/dist/react-resizable-panels.browser.development.js'));

test('without Git the real local query and history panel open an immutable comparison with the unsaved source', async () => {
	setLanguage('en');
	const files = new Map<string, string>(), directories = new Set<string>();
	const storage: TextStorage = { exists: async path => files.has(path) || directories.has(path), read: async path => files.get(path)!,
		write: async (path, text) => { files.set(path, text); }, mkdir: async path => { directories.add(path); } };
	const history = new LocalHistoryStore(storage, 'device-1', () => 1000);
	await history.capture('note.md', 'historical unsaved text\r\n', 'interval');
	const baseline = [...files];
	const queries = new HistoryQueryService(async () => { throw new Error('Git must not be queried'); }, () => history);
	const source: EditorDocumentContext = { id: 'note', path: 'note.md', leafId: 'leaf', ownerWindow: window, generation: 1 };
	let buffer = 'current unsaved text';
	const capture = vi.fn(() => ({ context: source, text: buffer }));
	const documents: EditorContextAccess = { current: () => source, get: () => source, capture,
		resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {}, subscribe: () => () => {} };
	let opened = '';
	const reviews = new NoteReviewService({ documents, queries, toRepo: () => null, open: async id => { opened = id; } });
	const restores = { subscribe: () => () => {}, receipts: () => [], readSnapshot: async () => { throw new Error('Automatic history is not a restore checkpoint'); } } as unknown as RestoreService;
	const sync = { ready: false, snapshot: { phase: 'no-git', device: { ...EMPTY_DEVICE_STATE } }, subscribe: () => () => {} } as unknown as SyncService;
	const host = { documents, queries, reviews, restores, sync, openSettings() {} };
	const view = render(<HuhuProviders ownerDocument={document}><NoteHistoryPanel host={host} /></HuhuProviders>);
	try {
		fireEvent.click(await screen.findByRole('button', { name: /Local history ·/ }));
		await waitFor(() => expect(reviews.get(opened)?.phase).toBe('ready'));
		const comparison = reviews.get(opened)!.comparison!;
		expect(comparison.left.status === 'text' && comparison.left.snapshot.text).toBe('historical unsaved text\r\n');
		expect(comparison.right.status === 'text' && comparison.right.snapshot.text).toBe('current unsaved text');
		view.rerender(<HuhuProviders ownerDocument={document}>
			<NoteReviewPage id={opened} host={host} context={{} as NativeSurfaceContext} onLayoutChange={() => {}} />
		</HuhuProviders>);
		await waitFor(() => expect(view.container.querySelector('[data-layout] .cm-editor')).toBeTruthy());
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restore to current note' }).disabled).toBe(true);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restore as a new note' }).disabled).toBe(true);
		const sourceReads = capture.mock.calls.length;
		fireEvent.click(screen.getByRole('button', { name: 'Swap displayed versions' }));
		await waitFor(() => expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('Current note'));
		expect(capture).toHaveBeenCalledTimes(sourceReads);
		fireEvent.click(screen.getByRole('button', { name: 'Synchronize comparison scrolling' }));
		fireEvent.click(screen.getByRole('radio', { name: 'Stacked' }));
		await waitFor(() => expect(view.container.querySelector('[data-layout="stacked"]')).toBeTruthy());
		fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize stacked comparison panes' }), { key: 'ArrowDown' });
		await waitFor(() => expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('55'));
		expect(capture).toHaveBeenCalledTimes(sourceReads);
		buffer = 'newer unsaved text';
		const selected = reviews.get(opened)!.selected;
		let selecting!: Promise<void>;
		act(() => { selecting = reviews.openVersion(source.id, { ...selected, id: 'another',
			ref: { kind: 'local-snapshot', path: source.path, text: 'another historical version', snapshotId: 'another' } }); });
		expect(view.container.querySelector('.cm-editor')).toBeNull();
		await act(async () => selecting);
		await waitFor(() => expect(view.container.querySelector('[data-layout="stacked"]')).toBeTruthy());
		expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('Current note');
		expect(screen.getByRole('button', { name: 'Synchronize comparison scrolling' }).getAttribute('aria-pressed')).toBe('false');
		await waitFor(() => expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('55'));
		expect(reviews.get(opened)?.buffer.text).toBe('current unsaved text');
		fireEvent.click(screen.getByRole('button', { name: 'Refresh current version' }));
		await waitFor(() => expect(reviews.get(opened)?.buffer.text).toBe('newer unsaved text'));
		expect(reviews.get(opened)?.buffer.text).toBe('newer unsaved text');
		expect([...files]).toEqual(baseline);
	} finally { view.unmount(); reviews.dispose(); }
});

test('reversing the real note comparison never reverses restore or copy source, authorized target or source leaf', async () => {
	setLanguage('en');
	const source: EditorDocumentContext = { id: 'source', path: 'current-name.md', leafId: 'original-leaf', ownerWindow: window, generation: 1 };
	let currentSource = source, buffer = 'Unsaved B';
	const listeners = new Set<() => void>();
	const capture = vi.fn(() => ({ context: currentSource, text: buffer }));
	const documents: EditorContextAccess = { current: () => currentSource, get: () => currentSource, capture,
		resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {},
		subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
	const queries = new HistoryQueryService(async () => { throw new Error('Inline snapshots must remain fixed'); });
	const reviews = new NoteReviewService({ documents, queries, toRepo: path => path, open: async () => {} });
	const prepare = vi.fn(async (request: PrepareRestore): Promise<RestorePlan> => ({ id: 'plan', path: request.mode === 'create-copy' ? 'copy.md' : request.targetPath,
		sourceId: request.source.id, sourceLabel: request.source.label ?? '', mode: request.mode,
		beforeText: request.mode === 'create-copy' ? null : 'Unsaved B', afterText: request.source.text, dirty: true, createdAt: 1 }));
	const cancel = vi.fn(), apply = vi.fn();
	const restores = { prepare, cancel, apply, receipts: () => [] } as unknown as RestoreService;
	const sync = { ready: true, snapshot: { phase: 'ready', device: { ...EMPTY_DEVICE_STATE } }, subscribe: () => () => {} } as unknown as SyncService;
	await reviews.openVersion(source.id, { id: 'old', commitOid: '', parents: [], author: '', time: 1, subject: 'Selected old version',
		pathAtRevision: 'old-name.md', status: 'M', ref: { kind: 'local-snapshot', path: 'old-name.md', snapshotId: 'old', text: 'Historical A' } });
	const id = reviews.forDocument(source.id)!.id;
	const view = render(<HuhuProviders ownerDocument={document}><NoteReviewPage id={id}
		host={{ documents, queries, reviews, restores, sync, openSettings() {} }} context={{} as NativeSurfaceContext} onLayoutChange={() => {}} /></HuhuProviders>);
	try {
		await waitFor(() => expect(view.container.querySelectorAll('.cm-editor')).toHaveLength(2));
		const reads = capture.mock.calls.length;
		fireEvent.click(screen.getByRole('button', { name: 'Swap displayed versions' }));
		await waitFor(() => expect(view.container.querySelector('[data-endpoint="left"]')?.textContent).toContain('Current note'));
		expect(capture).toHaveBeenCalledTimes(reads);
		expect(screen.getByText('Selected history for restore: Selected old version')).toBeTruthy();
		for (const [label, mode] of [['Restore to current note', 'replace-current'], ['Restore as a new note', 'create-copy']] as const) {
			fireEvent.click(screen.getByRole('button', { name: label }));
			await screen.findByRole('alertdialog');
			expect(prepare).toHaveBeenLastCalledWith({ source: { id: reviews.get(id)!.comparison!.left.id, text: 'Historical A', label: 'Selected old version' },
				targetPath: 'current-name.md', originLeafId: 'original-leaf', mode });
			fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
			await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		}
		act(() => {
			buffer = 'Edited after swapping'; currentSource = { ...source, generation: 2 };
			for (const listener of listeners) listener();
		});
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restore to current note' }).disabled).toBe(true);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restore as a new note' }).disabled).toBe(false);
		expect(reviews.get(id)!.buffer.text).toBe('Unsaved B');
		expect(apply).not.toHaveBeenCalled();
	} finally { view.unmount(); reviews.dispose(); }
});
