import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { App, WorkspaceLeaf } from 'obsidian';
import type { EditorContextAccess, EditorDocumentContext } from '../../../../app/contracts/editor-context';
import { setLanguage } from '../../../../shared/i18n';
import { HuhuProviders } from '../../../../ui/react/providers';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import type {
	ComparisonRequest,
	FileHistoryEntry,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionRef,
	VersioningQueries,
} from '../../core/history';
import { EMPTY_DEVICE_STATE } from '../../core/ports';
import type { PrepareRestore, RestorePlan, RestoreReceipt } from '../../core/restore';
import type { NoteHistoryHost } from '../../services/history-host';
import { NoteReviewService } from '../../services/note-review';
import type { RestoreService } from '../../services/restore-service';
import type { SyncService, SyncSnapshot } from '../../services/sync-service';
import { NoteReviewPage } from './NoteReviewPage';

// Diff rendering is tested separately. These tests exercise the real review session, source capture,
// action buttons, asynchronous restore preparation and dialog lifetime without a CodeMirror layout.
vi.mock('../DiffSurface', () => ({
	DiffSurface: ({ comparison }: { comparison: ResolvedComparison }) => (
		<div aria-label="Comparison preview">
			<pre data-testid="left-source">
				{comparison.left.status === 'text' ? comparison.left.snapshot.text : comparison.left.status}
			</pre>
			<pre data-testid="right-source">
				{comparison.right.status === 'text' ? comparison.right.snapshot.text : comparison.right.status}
			</pre>
		</div>
	),
}));

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function revision(commit: string): FileHistoryEntry {
	return {
		id: commit,
		commitOid: commit,
		parents: [],
		author: 'Author',
		time: 1,
		subject: `Version ${commit}`,
		pathAtRevision: 'previous-name.md',
		status: 'M',
		ref: { kind: 'commit', commit, path: 'previous-name.md' },
	};
}

function endpoint(ref: RevisionRef): ResolvedEndpoint {
	const text = 'text' in ref ? ref.text : ref.kind === 'commit' ? `Historical ${ref.commit}` : '';
	return {
		id: JSON.stringify(ref),
		ref,
		path: ref.path,
		repositoryId: 'repo',
		label: ref.kind,
		status: 'text',
		snapshot: {
			text,
			hash: text,
			byteLength: new TextEncoder().encode(text).byteLength,
			encoding: 'utf-8',
			eol: 'none',
			hasBom: false,
			endsWithNewline: false,
		},
	};
}

const services: NoteReviewService[] = [];
afterEach(() => {
	for (const service of services.splice(0)) service.dispose();
});

async function fixture() {
	setLanguage('en');
	let source: EditorDocumentContext = {
		id: 'document-1',
		path: 'note.md',
		leafId: 'source-leaf',
		ownerWindow: window,
		generation: 0,
	};
	let buffer = 'Unsaved current B';
	const documentListeners = new Set<() => void>(),
		syncListeners = new Set<() => void>();
	const returnTo = vi.fn(async (_id: string) => {});
	const documents: EditorContextAccess = {
		current: () => source,
		get: (id) => (id === source.id ? source : undefined),
		capture: (id) => {
			if (id !== source.id) throw new Error('versioning.source-closed');
			return { context: source, text: buffer };
		},
		resolveLeaf: () => undefined,
		resolveView: () => undefined,
		returnTo,
		subscribe: (listener) => {
			documentListeners.add(listener);
			return () => {
				documentListeners.delete(listener);
			};
		},
	};
	const compare = vi.fn(async (request: ComparisonRequest): Promise<ResolvedComparison> => ({
		id: JSON.stringify(request),
		repositoryId: 'repo',
		intent: request.intent,
		left: endpoint(request.left),
		right: endpoint(request.right),
		capturedAt: 1,
		identical: false,
		canCompare: true,
	}));
	const queries: VersioningQueries = {
		compare,
		resolve: async (ref) => endpoint(ref),
		resolveCommit: async (ref) => ref,
		changedFiles: async () => [],
		fileHistory: async (path) => ({
			path,
			entries: [],
			tip: null,
			complete: true,
			lineage: 'git-rename-detection',
		}),
		commitComparison: async (commit, path, parent) =>
			compare({
				intent: 'commit',
				left: { kind: 'commit', commit: parent ?? 'parent', path },
				right: { kind: 'commit', commit, path },
			}),
	};
	const reviews = new NoteReviewService({ documents, queries, toRepo: (path) => path, open: async () => {} });
	services.push(reviews);
	const plans = new Map<string, RestorePlan>();
	let nextPlan = 0;
	const planFor = (request: PrepareRestore, id = `plan-${++nextPlan}`): RestorePlan => ({
		id,
		path: request.mode === 'create-copy' ? 'new-copy.md' : request.targetPath,
		sourceId: request.source.id,
		sourceLabel: request.source.label ?? request.source.id,
		mode: request.mode,
		beforeText: request.mode === 'create-copy' ? null : buffer,
		afterText: request.source.text,
		dirty: true,
		createdAt: 1,
	});
	const prepare = vi.fn(async (request: PrepareRestore) => {
		const plan = planFor(request);
		plans.set(plan.id, plan);
		return plan;
	});
	const cancel = vi.fn((id: string) => {
		plans.delete(id);
	});
	const apply = vi.fn(async (id: string): Promise<RestoreReceipt> => {
		const plan = plans.get(id);
		if (!plan) throw new Error('versioning.restore.plan-missing');
		plans.delete(id);
		return {
			...plan,
			stage: 'verified',
			updatedAt: 2,
			beforeObject: 'before-object',
			beforeDiskObject: 'disk-object',
			afterObject: 'after-object',
			repositoryBaseline: 'unchanged',
		};
	});
	const undo = vi.fn(async (_id: string): Promise<RestoreReceipt> => {
		throw new Error('unused undo');
	});
	const restores = { prepare, cancel, apply, undo, subscribe: () => () => {}, receipts: () => [] } satisfies Pick<
		RestoreService,
		'prepare' | 'cancel' | 'apply' | 'undo' | 'subscribe' | 'receipts'
	>;
	const snapshot: SyncSnapshot = {
		phase: 'ready',
		gitVersion: '2.51',
		operation: null,
		locked: false,
		remotes: [],
		identity: { name: '', email: '' },
		device: { ...EMPTY_DEVICE_STATE },
	};
	const sync = {
		ready: true,
		snapshot,
		subscribe: (listener: () => void) => {
			syncListeners.add(listener);
			return () => {
				syncListeners.delete(listener);
			};
		},
		acknowledgeRestore: vi.fn(async () => {}),
	} satisfies Pick<SyncService, 'snapshot' | 'ready' | 'subscribe' | 'acknowledgeRestore'>;
	const host: NoteHistoryHost = {
		documents,
		queries,
		reviews,
		restores: restores as unknown as RestoreService,
		sync: sync as unknown as SyncService,
		openSettings: () => {},
	};
	const close = vi.fn(),
		element = document.createElement('div');
	const context: NativeSurfaceContext = {
		app: {} as App,
		leaf: {} as WorkspaceLeaf,
		contentEl: element,
		containerEl: element,
		close,
	};
	await reviews.openVersion(source.id, revision('A'));
	const id = reviews.forDocument(source.id)!.id;
	const view = render(
		<HuhuProviders ownerDocument={document}>
			<NoteReviewPage id={id} host={host} context={context} onLayoutChange={() => {}} />
		</HuhuProviders>,
	);
	await screen.findByLabelText('Comparison preview');
	return {
		view,
		reviews,
		host,
		id,
		prepare,
		cancel,
		apply,
		planFor,
		returnTo,
		close,
		documentListeners,
		syncListeners,
		select: (commit: string) => reviews.openVersion(source.id, revision(commit)),
		edit(text: string) {
			buffer = text;
			source = { ...source, generation: source.generation + 1 };
			for (const listener of documentListeners) listener();
		},
	};
}

test('keeps unsaved B in the visible comparison until Refresh current version is explicitly selected', async () => {
	const f = await fixture();
	expect(screen.getByTestId('right-source').textContent).toBe('Unsaved current B');
	act(() => f.edit('Newer unsaved text'));
	await screen.findByText('The source note has changed since this snapshot.');
	expect((screen.getByRole('button', { name: 'Restore to current note' }) as HTMLButtonElement).disabled).toBe(true);
	await act(() => f.select('B'));
	expect(screen.getByTestId('left-source').textContent).toBe('Historical B');
	expect(screen.getByTestId('right-source').textContent).toBe('Unsaved current B');
	fireEvent.click(screen.getByRole('button', { name: 'Refresh current version' }));
	await waitFor(() => expect(screen.getByTestId('right-source').textContent).toBe('Newer unsaved text'));
	expect(screen.queryByText('The source note has changed since this snapshot.')).toBeNull();
	expect((screen.getByRole('button', { name: 'Restore to current note' }) as HTMLButtonElement).disabled).toBe(false);
	fireEvent.click(screen.getByRole('button', { name: 'Return to editing' }));
	expect(f.returnTo).toHaveBeenCalledExactlyOnceWith('document-1');
	expect(f.apply).not.toHaveBeenCalled();
	f.view.unmount();
});

test('requires an explicit confirmation and restores the full historical text to the captured source leaf', async () => {
	const f = await fixture();
	fireEvent.click(screen.getByRole('button', { name: 'Restore to current note' }));
	const dialog = await screen.findByRole('alertdialog', { name: 'Restore this version?' });
	expect(within(dialog).getAllByRole('listitem').map(item => item.textContent)).toEqual([
		'Save the recovery checkpoint, including the current content and disk state.',
		'Recheck the note, open editors and Git state; refuse the write if they changed.',
		'Apply the selected version, verify the saved content and record a receipt.',
	]);
	expect(f.prepare).toHaveBeenCalledExactlyOnceWith({
		source: { id: f.reviews.get(f.id)!.comparison!.left.id, text: 'Historical A', label: 'Version A' },
		targetPath: 'note.md',
		originLeafId: 'source-leaf',
		mode: 'replace-current',
	});
	expect(f.apply).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
	await waitFor(() => expect(f.apply).toHaveBeenCalledExactlyOnceWith('plan-1'));
	await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
	f.view.unmount();
});

test('discards an offered plan when apply fails before admitting a write', async () => {
	const f = await fixture();
	f.apply.mockRejectedValueOnce(new Error('repository changed'));
	fireEvent.click(screen.getByRole('button', { name: 'Restore to current note' }));
	await screen.findByRole('alertdialog');
	fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
	await screen.findByRole('alert');
	expect(f.cancel).toHaveBeenCalledWith('plan-1');
	expect(screen.queryByRole('alertdialog')).toBeNull();
	expect(screen.getByTestId('right-source').textContent).toBe('Unsaved current B');
	f.view.unmount();
});

test('cancels a delayed prepare when another history version is selected before it resolves', async () => {
	const f = await fixture(),
		pending = deferred<RestorePlan>();
	f.prepare.mockImplementationOnce(() => pending.promise);
	fireEvent.click(screen.getByRole('button', { name: 'Restore to current note' }));
	expect(f.prepare).toHaveBeenCalledOnce();
	const stale = f.planFor(f.prepare.mock.calls[0]![0], 'stale-plan');
	await act(() => f.select('B'));
	await act(async () => {
		pending.resolve(stale);
		await pending.promise;
	});
	await waitFor(() => expect(f.cancel).toHaveBeenCalledWith('stale-plan'));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	expect(screen.getByTestId('left-source').textContent).toBe('Historical B');
	expect(f.apply).not.toHaveBeenCalled();
	f.view.unmount();
});

test('cancels an offered plan as soon as the selected comparison changes', async () => {
	const f = await fixture();
	fireEvent.click(screen.getByRole('button', { name: 'Restore to current note' }));
	await screen.findByRole('alertdialog');
	await act(() => f.select('B'));
	await waitFor(() => expect(f.cancel).toHaveBeenCalledWith('plan-1'));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	expect(f.apply).not.toHaveBeenCalled();
	f.view.unmount();
});

test.each(['pending', 'offered'] as const)(
	'cancels an unsubmitted %s plan on unmount and releases page subscriptions',
	async (phase) => {
		const f = await fixture(),
			pending = deferred<RestorePlan>();
		if (phase === 'pending') f.prepare.mockImplementationOnce(() => pending.promise);
		fireEvent.click(screen.getByRole('button', { name: 'Restore to current note' }));
		const plan = phase === 'pending' ? f.planFor(f.prepare.mock.calls[0]![0], 'pending-plan') : undefined;
		if (phase === 'offered') await screen.findByRole('alertdialog');
		f.view.unmount();
		if (plan)
			await act(async () => {
				pending.resolve(plan);
				await pending.promise;
			});
		await waitFor(() => expect(f.cancel).toHaveBeenCalledWith(plan?.id ?? 'plan-1'));
		expect(f.apply).not.toHaveBeenCalled();
		expect(f.documentListeners.size).toBe(0);
		expect(f.syncListeners.size).toBe(0);
		expect(document.querySelector('.huhu-portal-root')).toBeNull();
	},
);

test('closing a session removes its preview and exposes the expired-session close action', async () => {
	const f = await fixture();
	act(() => f.reviews.close(f.id));
	await screen.findByText('This comparison session has ended. Open a note and select a version from History.');
	expect(screen.queryByLabelText('Comparison preview')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Close this page' }));
	expect(f.close).toHaveBeenCalledOnce();
	f.view.unmount();
});
