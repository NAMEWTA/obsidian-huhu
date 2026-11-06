import { MultiDiffView } from '../../../../../src/modules/versioning/ui/diff/MultiDiffView';
import { VisibilityContext } from '../../../../../src/ui/react/contexts';
import { useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { App } from 'obsidian';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { setLanguage, t } from '../../../../../src/shared/i18n';
import { installFixtureTheme } from '../shared/fixture-theme';
import type { SettingsHandle } from '../../../../../src/shared/settings/store';
import type { EditorContextAccess, EditorDocumentContext } from '../../../../../src/app/contracts/editor-context';
import type { NativeSurfaceContext } from '../../../../../src/ui/native-surface';
import { DiffSurface, AsyncDiffSurface } from '../../../../../src/modules/versioning/ui/DiffSurface';
import { ConflictDiffView } from '../../../../../src/modules/versioning/ui/diff/ConflictDiffView';
import { createDiffWorker } from '../../../../../src/modules/versioning/ui/diff/workers';
import { SyncPage } from '../../../../../src/modules/versioning/ui/sync-presentation';
import { NoteHistoryPanel } from '../../../../../src/modules/versioning/ui/history/NoteHistoryPanel';
import { NoteReviewPage } from '../../../../../src/modules/versioning/ui/history/NoteReviewPage';
import { syncSettingsPage } from '../../../../../src/modules/versioning/ui/settings-page';
import { syncSettings, type SyncSettings } from '../../../../../src/modules/versioning/settings';
import type { SyncService, SyncSnapshot } from '../../../../../src/modules/versioning/services/sync-service';
import type { RestoreService } from '../../../../../src/modules/versioning/services/restore-service';
import { NoteReviewService } from '../../../../../src/modules/versioning/services/note-review';
import type { NoteHistoryHost } from '../../../../../src/modules/versioning/services/history-host';
import type {
	ComparisonRequest,
	FileHistoryEntry,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionRef,
	VersioningQueries,
} from '../../../../../src/modules/versioning/core/history';
import { EMPTY_DEVICE_STATE } from '../../../../../src/modules/versioning/core/ports';
import { parseStatus } from '../../../../../src/modules/versioning/core/status';
import {
	diffPreferenceStore,
	type DiffPreferences,
	DEFAULT_DIFF_PREFERENCES,
} from '../../../../../src/modules/versioning/ui/diff/preferences';

const HEAD = 'a'.repeat(40),
	PARENT = 'b'.repeat(40),
	ROOT = 'c'.repeat(40);
const oldText =
	'# Project\n\nold one 😀\n' + Array.from({ length: 12 }, (_, i) => `unchanged ${i}\n`).join('') + 'old end\n';
const newText = oldText.replace('old one', 'new one').replace('old end', 'new end');
const markerText = 'intro\n<<<<<<< HEAD\ncurrent choice\n=======\nincoming choice\n>>>>>>> incoming\ntail\n';
const states = [
	'diff',
	'changes',
	'history',
	'compare',
	'conflict',
	'missing',
	'empty',
	'binary',
	'reader-limit',
	'render-limit',
	'loading',
	'error',
	'identical',
	'note-history',
	'note-review',
	'settings',
	'no-git',
	'no-repo',
	'clone',
	'remote-author',
	'paused',
	'restore-hold',
	'auth',
	'locked',
] as const;
type ViewState = (typeof states)[number] | 'target-long';
type Instrumentation = {
	created: number;
	terminated: number;
	live: Set<Worker>;
	urls: Set<string>;
	documentListeners: Map<string, Set<EventListenerOrEventListenerObject>>;
};
type FixtureOwner = {
	visible?: boolean;
	root: Root;
	host: HTMLElement;
	doc: Document;
	mode: ViewState;
	revision: number;
	events: unknown[];
	instrument: Instrumentation;
	service: SyncService;
	queries: VersioningQueries;
	historyHost: NoteHistoryHost;
	app: App;
	settings: SettingsHandle<SyncSettings>;
	settingsPage: ReturnType<typeof syncSettingsPage>;
	syncSnapshot: SyncSnapshot;
	source: EditorDocumentContext;
	sourceText: string;
	documentListeners: Set<() => void>;
	reviewId: string;
};
const TARGET_FILES = [{ path: 'long-a.md', status: 'M' }, { path: 'long-b.md', status: 'M' }] as const;
function TargetLong({ owner }: { owner: FixtureOwner }) {
	const [preferences, setPreferences] = useState<DiffPreferences>({ ...DEFAULT_DIFF_PREFERENCES, collapse: false });
	const queries = useMemo(() => {
		const old = Array.from({ length: 2000 }, (_, index) => `line ${index + 1} old\n`).join('');
		const newer = old.replace('line 10 old', 'line 10 new').replace('line 1900 old', 'line 1900 new');
		const baseline = compare({ intent: 'unstaged', left: { kind: 'index', path: 'long-a.md' }, right: { kind: 'worktree', path: 'long-a.md' } });
		return { ...owner.queries, compare: async (request: ComparisonRequest) => ({
			...baseline, left: endpoint(request.left, old), right: endpoint(request.right, newer), identical: false,
		}) };
	}, [owner.queries]);
	return (
		<MultiDiffView
			queries={queries}
			a={{ kind: 'index' }}
			b={{ kind: 'worktree' }}
			files={TARGET_FILES}
			identity={`target-long-${owner.revision}`}
			createWorker={() => createDiffWorker(owner.doc.defaultView!)}
			preferences={preferences}
			onPreferencesChange={setPreferences}
		/>
	);
}
const owners: Record<string, FixtureOwner> = {};
function snapshot(text: string) {
	return {
		text,
		hash: text,
		byteLength: new TextEncoder().encode(text).length,
		encoding: 'utf-8' as const,
		eol: 'lf' as const,
		hasBom: text.startsWith('\uFEFF'),
		endsWithNewline: text.endsWith('\n'),
	};
}
function endpoint(ref: RevisionRef, text?: string): ResolvedEndpoint {
	const body = text ?? ('text' in ref ? ref.text : ref.kind === 'worktree' ? newText : oldText);
	const base = {
		repositoryId: 'fixture-repository',
		ref,
		path: ref.path,
		label: ref.kind,
		id: JSON.stringify([ref, body]),
		...(ref.kind === 'commit' ? { commitOid: ref.commit } : {}),
		...(ref.kind === 'index' ? { blobOid: 'd'.repeat(40) } : {}),
	};
	return ref.kind === 'empty'
		? { ...base, status: 'missing', reason: 'empty' }
		: { ...base, status: 'text', snapshot: snapshot(body) };
}
function compare(request: ComparisonRequest): ResolvedComparison {
	const left = endpoint(request.left),
		right = endpoint(request.right);
	return {
		repositoryId: 'fixture-repository',
		id: JSON.stringify([left.id, right.id]),
		intent: request.intent,
		left,
		right,
		capturedAt: 1770000000000,
		identical: left.status === 'text' && right.status === 'text' && left.snapshot.hash === right.snapshot.hash,
		canCompare: true,
	};
}
function currentSnapshot(mode: ViewState): SyncSnapshot {
	const status = parseStatus(
		`# branch.oid ${HEAD}\0# branch.head main\0# branch.upstream origin/main\0` +
			'1 MM N... 100644 100644 100644 aaa bbb notes/project.md\0' +
			'1 .M N... 100644 100644 100644 aaa bbb notes/second.md\0' +
			'? notes/new.md\0' +
			'u UU N... 100644 100644 100644 100644 aaa bbb ccc notes/conflict.md\0',
	);
	if (mode !== 'conflict') status.conflicted = [];
	return {
		phase: mode === 'no-git' ? 'no-git' : ['no-repo', 'clone'].includes(mode) ? 'no-repo' : 'ready',
		gitVersion: 'git 2.50',
		operation: mode === 'conflict' ? 'merge' : null,
		locked: mode === 'locked',
		status,
		remotes: mode === 'remote-author' ? [] : ['origin'],
		identity:
			mode === 'remote-author' ? { name: '', email: '' } : { name: 'HUHU author', email: 'author@example.test' },
		place: { cwd: '/fixture', root: '/fixture', toRepo: (path) => path, toVault: (path) => path },
		device: {
			...EMPTY_DEVICE_STATE,
			...(mode === 'paused' ? { paused: 'manual' as const } : {}),
			...(mode === 'restore-hold' ? { restoreHold: 'fixture-receipt' } : {}),
		},
		...(mode === 'auth' ? { error: { kind: 'auth' as const, detail: 'Authentication rejected' } } : {}),
	};
}
function instrument(doc: Document): Instrumentation {
	const owner = doc.defaultView as Window & { Worker: typeof Worker; URL: typeof URL };
	const result: Instrumentation = {
		created: 0,
		terminated: 0,
		live: new Set(),
		urls: new Set(),
		documentListeners: new Map(),
	};
	const OriginalWorker = owner.Worker;
	owner.Worker = class extends OriginalWorker {
		constructor(url: string | URL, options?: WorkerOptions) {
			super(url, options);
			result.created++;
			result.live.add(this);
		}
		terminate() {
			if (result.live.delete(this)) result.terminated++;
			super.terminate();
		}
	};
	const create = owner.URL.createObjectURL.bind(owner.URL),
		revoke = owner.URL.revokeObjectURL.bind(owner.URL);
	owner.URL.createObjectURL = (blob) => {
		const url = create(blob);
		result.urls.add(url);
		return url;
	};
	owner.URL.revokeObjectURL = (url) => {
		result.urls.delete(url);
		revoke(url);
	};
	const add = doc.addEventListener.bind(doc),
		remove = doc.removeEventListener.bind(doc);
	doc.addEventListener = ((
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	) => {
		if (['pointermove', 'pointerup', 'pointercancel'].includes(type)) {
			const set = result.documentListeners.get(type) ?? new Set();
			set.add(listener);
			result.documentListeners.set(type, set);
		}
		add(type, listener, options);
	}) as typeof doc.addEventListener;
	doc.removeEventListener = ((
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	) => {
		result.documentListeners.get(type)?.delete(listener);
		remove(type, listener, options);
	}) as typeof doc.removeEventListener;
	return result;
}
function View({ owner }: { owner: FixtureOwner }) {
	const [message, setMessage] = useState('');
	const mode = owner.mode,
		service = owner.service,
		queries = owner.queries;
	const baseline = compare({
		intent: 'unstaged',
		left: { kind: 'index', path: 'notes/project.md' },
		right: { kind: 'worktree', path: 'notes/project.md' },
	});
	let comparison = baseline;
	if (mode === 'missing')
		comparison = { ...baseline, id: 'missing', left: endpoint({ kind: 'empty', path: 'notes/new.md' }) };
	if (mode === 'empty')
		comparison = { ...baseline, id: 'empty', left: endpoint({ kind: 'index', path: 'notes/project.md' }, '') };
	if (mode === 'identical') comparison = { ...baseline, id: 'identical', right: baseline.left, identical: true };
	if (mode === 'binary')
		comparison = {
			...baseline,
			id: 'binary',
			canCompare: false,
			right: { ...baseline.right, status: 'binary', reason: 'nul', byteLength: 4096 },
		};
	if (mode === 'reader-limit')
		comparison = {
			...baseline,
			id: 'reader-limit',
			canCompare: false,
			right: { ...baseline.right, status: 'too-large', byteLength: 2 * 1024 * 1024 + 1, limit: 2 * 1024 * 1024 },
		};
	if (mode === 'render-limit')
		comparison = {
			...baseline,
			id: 'render-limit',
			left: endpoint(baseline.left.ref, 'old line\n'.repeat(60000)),
			right: endpoint(baseline.right.ref, 'new line\n'.repeat(60000)),
		};
	const worker = () => createDiffWorker(owner.doc.defaultView!);
	if (mode === 'target-long') return <TargetLong owner={owner} />;

	if (['diff', 'missing', 'empty', 'identical', 'binary', 'reader-limit', 'render-limit'].includes(mode))
		return (
			<DiffSurface
				comparison={comparison}
				createWorker={worker}
				openWorktree={(path, repositoryId) => service.openWorktreeInSystem(path, repositoryId)}
			/>
		);
	if (mode === 'loading' || mode === 'error')
		return (
			<AsyncDiffSurface
				identity={mode}
				load={
					mode === 'loading'
						? () => new Promise(() => {})
						: () => Promise.reject(new Error('Fixture read failed'))
				}
				createWorker={worker}
			/>
		);
	if (mode === 'conflict')
		return (
			<ConflictDiffView
				app={owner.app}
				path="notes/conflict.md"
				revision={owner.revision}
				queries={queries}
				service={service}
				restores={owner.historyHost.restores}
			/>
		);
	if (mode === 'note-history') return <NoteHistoryPanel host={owner.historyHost} />;
	if (mode === 'note-review')
		return (
			<NoteReviewPage
				id={owner.reviewId}
				host={owner.historyHost}
				context={{} as NativeSurfaceContext}
				onLayoutChange={() => {}}
				createWorker={worker}
			/>
		);
	if (mode === 'settings') {
		const Settings = owner.settingsPage;
		return (
			<div className="min-h-0 flex-1 overflow-auto">
				<Settings />
			</div>
		);
	}
	return (
		<SyncPage
			app={owner.app}
			service={service}
			snapshot={service.snapshot}
			requestedMode={mode === 'history' ? 'history' : mode === 'compare' ? 'compare' : 'changes'}
			openChanges={owner.revision}
			message={message}
			setMessage={setMessage}
			host={{
				service: () => service,
				queries: () => queries,
				restores: () => owner.historyHost.restores,
				createWorker: () => worker(),
				repoFolder: () => '',
				openSettings: () => {
					owner.mode = 'settings';
					renderOwner(owner);
				},
				report: (error) => owner.events.push({ error: String(error) }),
			}}
		/>
	);
}
function renderOwner(owner: FixtureOwner) {
	owner.root.render(
		<HuhuProviders ownerDocument={owner.doc}>
			<div hidden={owner.visible === false} data-review="versioning" data-state={owner.mode} className="h-full min-h-0 min-w-0">
				<VisibilityContext.Provider value={owner.visible !== false}><View key={owner.mode === 'target-long' ? owner.mode : `${owner.mode}:${owner.revision}`} owner={owner} /></VisibilityContext.Provider>
			</div>
		</HuhuProviders>,
	);
}
async function bootstrap() {
	const docs = await readyDocuments(document);
 const fixtureTheme=await installFixtureTheme(docs);
	for (const [name, doc] of Object.entries(docs)) {
		const host = doc.createElement('main');
		host.className = 'huhu-ui';
		host.dataset.huhuLeaf = 't16-review';
		host.style.cssText = 'height:800px;display:flex;flex-direction:column;min-width:0';
		doc.body.append(host);
		Object.defineProperty(doc.body, 'createDiv', {
			configurable: true,
			value: (options?: { cls?: string }) => {
				const node = doc.createElement('div');
				node.className = options?.cls ?? '';
				doc.body.append(node);
				return node;
			},
		});
		const owner = {} as FixtureOwner;
		owners[name] = owner;
		owner.doc = doc;
		owner.host = host;
		owner.mode = 'diff';
		owner.syncSnapshot = currentSnapshot('diff');
		owner.revision = 0;
		owner.events = [];
		owner.instrument = instrument(doc);
		owner.root = createRoot(host);
		owner.sourceText = newText;
		owner.documentListeners = new Set();
		owner.source = {
			id: `source-${name}`,
			path: 'notes/project.md',
			leafId: `note-leaf-${name}`,
			ownerWindow: doc.defaultView!,
			generation: 1,
		};
		owner.app = {
			workspace: { containerEl: host, getLeaf: () => ({ openFile: async () => {} }) },
			vault: {
				getAbstractFileByPath: () => null,
				getAllLoadedFiles: () => [],
				getRoot: () => ({ children: [] }),
				configDir: '.obsidian',
				on: () => ({}),
				offref: () => {},
			},
		} as unknown as App;
		const service = {
			get snapshot() {
				return owner.syncSnapshot;
			},
			get ready() {
				return !['no-git', 'no-repo', 'clone'].includes(owner.mode);
			},
			subscribe: () => () => {},
			refresh: async () => {},
			graphRefs: async () => [
				{ hash: HEAD, name: 'refs/heads/main', kind: 'branch' },
				{ hash: PARENT, name: 'refs/heads/incoming', kind: 'branch' },
			],
			graphPage: async () => ({ commits: [], more: false }),
			graphLog: async () => [
				{
					hash: HEAD,
					short: HEAD.slice(0, 8),
					parents: [PARENT, ROOT],
					author: 'HUHU author',
					time: 1770000000,
					subject: 'Merge incoming changes',
				},
				{
					hash: PARENT,
					short: PARENT.slice(0, 8),
					parents: [ROOT],
					author: 'Contributor',
					time: 1769900000,
					subject: 'Refine document',
				},
				{
					hash: ROOT,
					short: ROOT.slice(0, 8),
					parents: [],
					author: 'HUHU author',
					time: 1769800000,
					subject: 'Initial note',
				},
			],
			refs: async () => [{ hash: HEAD, name: 'refs/heads/main', kind: 'branch' }],
			log: async () => [],
			head: async () => HEAD,
			openWorktreeInSystem: async (path: string) => {
				owner.events.push({ openWorktree: path });
			},
			applyIndexHunks: async (request: unknown) => {
				owner.events.push({ hunk: request });
			},
			conflictAdmission: async (path: string) => ({
				path,
				targetPath: path,
				repositoryId: 'fixture-repository',
				worktreeId: endpoint({ kind: 'worktree', path }, markerText).id,
			}),
			commit: async () => ({ steps: [], ok: false }),
			commitAndSync: async () => ({ steps: [], ok: false }),
			stage: async () => {},
			unstage: async () => {},
			setPaused: async () => {},
			acknowledgeRestore: async () => {},
			pull: async () => {},
			push: async () => {},
			sync: async () => {},
			setIdentity: async () => {},
			addRemote: async () => {},
			init: async () => {},
			clone: async () => {},
			markResolved: async () => {},
			discard: async () => {},
			graph: async () => [],
		} as unknown as SyncService;
		owner.service = service;
		const entries: FileHistoryEntry[] = [
			{
				id: 'sample-a',
				commitOid: '',
				parents: [],
				author: '',
				time: 1770000000,
				subject: 'Local sample A',
				pathAtRevision: owner.source.path,
				status: 'M',
				ref: { kind: 'local-snapshot', path: owner.source.path, snapshotId: 'sample-a', text: oldText },
			},
			{
				id: 'sample-b',
				commitOid: '',
				parents: [],
				author: '',
				time: 1770000300,
				subject: 'Manual checkpoint B',
				pathAtRevision: owner.source.path,
				status: 'M',
				ref: { kind: 'local-snapshot', path: owner.source.path, snapshotId: 'sample-b', text: newText },
			},
		];
		const queries: VersioningQueries = {
			localHistory: async () => entries,
			readLocalSnapshot: async (id) => (id === 'sample-a' ? oldText : newText),
			fileHistory: async () => ({
				entries,
				path: owner.source.path,
				tip: HEAD,
				complete: true,
				lineage: 'git-rename-detection',
			}),
			resolveCommit: async (ref) => (ref === 'HEAD' ? HEAD : ref),
			resolve: async (ref) => endpoint(ref, ref.path.includes('conflict') ? markerText : undefined),
			compare: async (request) => compare(request),
			commitComparison: async (commit, path, parent) =>
				compare({
					intent: 'commit',
					left: parent ? { kind: 'commit', commit: parent, path } : { kind: 'empty', path },
					right: { kind: 'commit', commit, path },
				}),
			changedFiles: async () => [{ path: 'notes/project.md', status: 'M', additions: 2, deletions: 2 }],
			compareFiles: async (left, right) =>
				left.kind === 'commit' && right.kind === 'commit' && left.commit === right.commit
					? []
					: [
							{ path: 'notes/project.md', status: 'M', additions: 2, deletions: 2 },
							{
								path: 'notes/renamed.md',
								from: 'notes/old-name.md',
								status: 'R080',
								additions: 1,
								deletions: 1,
							},
						],
		};
		owner.queries = queries;
		const documents: EditorContextAccess = {
			current: () => owner.source,
			get: (id) => (id === owner.source.id ? owner.source : undefined),
			capture: () => ({ context: owner.source, text: owner.sourceText }),
			subscribe: (listener) => {
				owner.documentListeners.add(listener);
				return () => {
					owner.documentListeners.delete(listener);
				};
			},
			resolveLeaf: () => undefined,
			resolveView: () => undefined,
			returnTo: async () => {},
		};
		const reviews = new NoteReviewService({
			documents,
			queries,
			toRepo: (path) => path,
			open: async (id) => {
				owner.reviewId = id;
			},
		});
		const restores = {
			subscribe: () => () => {},
			receipts: () => [],
			readSnapshot: async () => oldText,
			prepare: async (request: {
				source: { id: string; text: string };
				targetPath: string;
				mode: 'replace-current' | 'create-copy';
			}) => ({
				id: 'fixture-plan',
				path: request.targetPath,
				sourceId: request.source.id,
				sourceLabel: 'Fixture source',
				mode: request.mode,
				beforeText: markerText,
				afterText: request.source.text,
				dirty: false,
				createdAt: 1,
			}),
			cancel: () => {},
			apply: async () => {
				throw new Error('Fixture does not perform vault writes');
			},
			undo: async () => {
				throw new Error('Fixture does not perform vault writes');
			},
		} as unknown as RestoreService;
		owner.historyHost = {
			documents,
			reviews,
			queries,
			restores,
			sync: service,
			openSettings: () => {
				owner.mode = 'settings';
				renderOwner(owner);
			},
		};
		await reviews.openVersion(owner.source.id, entries[0]!);
		let settingsValue = syncSettings.defaults();
		const listeners = new Set<() => void>();
		owner.settings = {
			get: () => settingsValue,
			subscribe: (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
			update: async (update) => {
				const next = { ...settingsValue };
				update(next);
				settingsValue = next;
				for (const listener of listeners) listener();
			},
		} as SettingsHandle<SyncSettings>;
		owner.settingsPage = syncSettingsPage(owner.settings, () => service, owner.app);
		renderOwner(owner);
	}
	Object.assign(globalThis, {
		uiReview: {
			docs,
			owners,
			states,
			async show(name: string, mode: ViewState) {
				const owner = owners[name]!;
				owner.mode = mode;
				owner.visible = true;
				owner.syncSnapshot = currentSnapshot(mode);
				owner.revision++;
				diffPreferenceStore.set(DEFAULT_DIFF_PREFERENCES);
				renderOwner(owner);
				await new Promise((resolve) =>
					owner.doc.defaultView!.requestAnimationFrame(() =>
						owner.doc.defaultView!.requestAnimationFrame(resolve),
					),
				);
				if (mode === 'clone') owner.doc.querySelector('details')?.setAttribute('open', '');
			},
			setVisible(name: string, visible: boolean) { owners[name]!.visible = visible; renderOwner(owners[name]!); },
			revise(name: string) { owners[name]!.revision++; renderOwner(owners[name]!); },
			edit(name: string, text: string) {
				const owner = owners[name]!;
				owner.sourceText = text;
				owner.source = { ...owner.source, generation: owner.source.generation + 1 };
				for (const listener of owner.documentListeners) listener();
			},
			resources() {
				return Object.fromEntries(
					Object.entries(owners).map(([name, owner]) => [
						name,
						{
							created: owner.instrument.created,
							terminated: owner.instrument.terminated,
							live: owner.instrument.live.size,
							urls: owner.instrument.urls.size,
							listeners: Object.fromEntries(
								[...owner.instrument.documentListeners].map(([type, set]) => [type, set.size]),
							),
						},
					]),
				);
			},
			async dispose() {
				for (const owner of Object.values(owners)) {
					owner.root.unmount();
					owner.historyHost.reviews.dispose();
					owner.host.remove();
				}
 await fixtureTheme.dispose();
			},
			async configure(sample: Record<string, unknown>) {
 setLanguage(sample.language === 'zh' ? 'zh' : 'en');
 const frame=docs.main.querySelector('iframe');if(frame)frame.style.width=`${sample.cssWidth}px`;
 await fixtureTheme.configure(sample);
 for(const owner of Object.values(owners)){owner.doc.documentElement.lang=String(sample.language);owner.host.style.width='100%';}
 },
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
