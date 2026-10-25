import { type App, TFile } from 'obsidian';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, CheckCheck, Ellipsis, Minus, PanelLeft, Plus, RefreshCw, Undo2 } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { SegmentedControl } from '../../../ui/components/huhu/SettingsFormControls';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../../ui/components/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { cn } from '../../../ui/lib/utils';
import { useVisible } from '../../../ui/react/contexts';
import type { ComparisonRequest, ResolvedComparison, RevisionFileChange, VersioningQueries } from '../core/history';
import type { GraphCommit } from '../core/repo';
import type { RefEntry } from '../core/refs';
import type { RunReport, SyncService, SyncSnapshot } from '../services/sync-service';
import { hasConflictBlocks } from '../core/conflict-blocks';
import { layoutGraph } from '../core/graph';
import { AsyncDiffSurface, DiffMessage } from './DiffSurface';
import { isCancelled } from './diff-model';
import { ChoiceList, FileNavigator, type NavigationFile } from './VersioningNavigator';
import { confirmAction } from './dialogs';
import { GraphCell, graphWidth } from './GraphCell';

export type WorkbenchMode = 'changes' | 'history' | 'compare';

export interface GitWorkbenchProps {
	app: App;
	service: SyncService;
	queries?: VersioningQueries;
	snapshot: SyncSnapshot;
	message: string;
	setMessage: (message: string) => void;
	report: (error: unknown) => void;
	requestedMode?: WorkbenchMode;
	requestId?: number;
	onModeChange?: (mode: WorkbenchMode) => void;
	createWorker?: () => Worker;
}

interface SharedWorkspaceProps extends GitWorkbenchProps {
	navigationOpen: boolean;
	onFileSelected: () => void;
	statusRevision: number;
}

/** Three browse modes, one stable file selection and one shared diff surface. */
export function GitWorkbench(props: GitWorkbenchProps) {
	const { requestedMode = 'changes', requestId = 0, snapshot } = props;
	const [selection, setSelection] = useState({ requestId, mode: requestedMode });
	const [navigationOpen, setNavigationOpen] = useState(true);
	const [statusVersion, setStatusVersion] = useState({ status: snapshot.status, revision: 0 });
	const root = useRef<HTMLDivElement>(null);
	if (selection.requestId !== requestId) setSelection({ requestId, mode: requestedMode });
	if (statusVersion.status !== snapshot.status)
		setStatusVersion({ status: snapshot.status, revision: statusVersion.revision + 1 });
	const mode = selection.requestId === requestId ? selection.mode : requestedMode;
	const shared: SharedWorkspaceProps = {
		...props,
		navigationOpen,
		statusRevision: statusVersion.revision,
		onFileSelected: () => {
			if ((root.current?.clientWidth ?? 900) < 736) setNavigationOpen(false);
		},
	};
	return (
		<div
			ref={root}
			className="@container flex min-h-0 min-w-0 flex-1 flex-col"
			data-versioning-workbench
			data-mode={mode}
		>
			{snapshot.device.restoreHold && (
				<div
					role="status"
					className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs"
				>
					<span className="min-w-0 flex-1">{t('versioning.restoreHold')}</span>
					<Button
						size="sm"
						variant="outline"
						disabled={!!snapshot.running}
						onClick={() => void props.service.acknowledgeRestore().catch(props.report)}
					>
						{t('versioning.acknowledgeRestore')}
					</Button>
				</div>
			)}
			<div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-border px-2 py-1">
				<ActionButton
					size="icon-sm"
					label={t('versioning.navigation')}
					aria-pressed={navigationOpen}
					onClick={() => setNavigationOpen((value) => !value)}
				>
					<PanelLeft />
				</ActionButton>
				<SegmentedControl<WorkbenchMode>
					size="sm"
					ariaLabel={t('versioning.mode')}
					value={mode}
					onChange={(next) => {
						setSelection({ requestId, mode: next });
						setNavigationOpen(true);
						props.onModeChange?.(next);
					}}
					options={[
						{ value: 'changes', label: t('versioning.mode.changes') },
						{ value: 'history', label: t('versioning.mode.history') },
						{ value: 'compare', label: t('versioning.mode.compare') },
					]}
				/>
				{mode !== 'changes' && (
					<span className="ml-auto text-xs text-muted-foreground">{t('versioning.browseOnly')}</span>
				)}
			</div>
			{mode === 'changes' ? (
				<ChangesWorkspace {...shared} />
			) : mode === 'history' ? (
				<HistoryWorkspace {...shared} />
			) : (
				<CompareWorkspace {...shared} />
			)}
		</div>
	);
}

function WorkspaceFrame({
	navigation,
	files,
	navigationOpen,
	children,
}: {
	navigation: ReactNode;
	files?: ReactNode;
	navigationOpen: boolean;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)]',
				navigationOpen && '@min-[736px]:grid-cols-[280px_minmax(0,1fr)]',
				navigationOpen && files && '@min-[1024px]:grid-cols-[520px_minmax(0,1fr)]',
			)}
		>
			{navigationOpen && (
				<aside
					data-versioning-navigation
					className={cn(
						'grid min-h-0 min-w-0 border-r border-border',
						files
							? 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)] @min-[1024px]:grid-cols-[280px_240px] @min-[1024px]:grid-rows-[minmax(0,1fr)]'
							: 'grid-rows-[minmax(0,1fr)]',
					)}
				>
					<div className="flex min-h-0 min-w-0 flex-col">{navigation}</div>
					{files && (
						<div className="flex min-h-0 min-w-0 flex-col border-t border-border @min-[1024px]:border-t-0 @min-[1024px]:border-l">
							{files}
						</div>
					)}
				</aside>
			)}
			<main
				className={cn('flex min-h-0 min-w-0 flex-col', navigationOpen && 'hidden @min-[736px]:flex')}
				data-versioning-comparison
			>
				{children}
			</main>
		</div>
	);
}

type ChangeGroup = 'unstaged' | 'staged' | 'conflicts';
interface ChangedFile extends NavigationFile {
	group: ChangeGroup;
	untracked?: boolean;
}

function changeFiles(snapshot: SyncSnapshot): ChangedFile[] {
	const status = snapshot.status;
	if (!status) return [];
	return [
		...status.unstaged.map((file): ChangedFile => ({
			key: `unstaged:${file.path}`,
			group: 'unstaged',
			path: file.path,
			from: file.worktree === 'R' || file.worktree === 'C' ? file.from : undefined,
			status: file.worktree,
		})),
		...status.untracked.map((path): ChangedFile => ({
			key: `unstaged:${path}`,
			group: 'unstaged',
			path,
			status: 'A',
			untracked: true,
		})),
		...status.staged.map((file): ChangedFile => ({
			key: `staged:${file.path}`,
			group: 'staged',
			path: file.path,
			from: file.from,
			status: file.index,
		})),
		...status.conflicted.map((file): ChangedFile => ({
			key: `conflicts:${file.path}`,
			group: 'conflicts',
			path: file.path,
			status: 'U',
		})),
	];
}

export function changeComparison(file: ChangedFile, head: string | null): ComparisonRequest {
	if (file.group === 'staged')
		return {
			intent: 'staged',
			left: head
				? { kind: 'commit', commit: head, path: file.from ?? file.path }
				: { kind: 'empty', path: file.path },
			right: { kind: 'index', path: file.path },
		};
	return {
		intent: 'unstaged',
		left: file.untracked ? { kind: 'empty', path: file.path } : { kind: 'index', path: file.from ?? file.path },
		right: { kind: 'worktree', path: file.path },
	};
}

function ChangesWorkspace(props: SharedWorkspaceProps) {
	const { snapshot, service, queries, app, report, statusRevision } = props;
	const [group, setGroup] = useState<ChangeGroup>('unstaged');
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const allFiles = changeFiles(snapshot);
	const files = allFiles.filter((file) => file.group === group);
	const selected = files.find((file) => file.key === selectedKey) ?? null;
	const busy = (!!snapshot.running && snapshot.running !== 'refresh') || snapshot.locked;
	const selectedPath = selected?.path;
	const selectedFrom = selected?.from;
	const untracked = selected?.untracked;
	const head = snapshot.status?.head ?? null;
	const load = (signal: AbortSignal): Promise<ResolvedComparison> => {
		if (!queries || !selectedPath) return Promise.reject(new Error(t('versioning.unavailable')));
		return queries.compare(
			changeComparison({ key: '', group, path: selectedPath, from: selectedFrom, status: '', untracked }, head),
			signal,
		);
	};
	const openFile = async () => {
		if (!selected) return;
		const path = snapshot.place?.toVault(selected.path);
		const file = path ? app.vault.getAbstractFileByPath(path) : null;
		if (file instanceof TFile) await app.workspace.getLeaf('tab').openFile(file);
	};
	const discard = async () => {
		if (!selected) return;
		if (
			!(await confirmAction(app, {
				title: t('sync.discardTitle'),
				message: t(selected.untracked ? 'sync.discardUntracked' : 'sync.discardConfirm', {
					path: selected.path,
				}),
				action: t('sync.discard'),
				danger: true,
			}))
		)
			return;
		if (selected.untracked) {
			const path = snapshot.place?.toVault(selected.path);
			const file = path ? app.vault.getAbstractFileByPath(path) : null;
			if (file instanceof TFile) {
				await app.fileManager.trashFile(file);
				await service.refresh();
			}
		} else await service.discard([selected.path]);
	};
	const resolveConflict = async () => {
		if (!selected) return;
		const path = snapshot.place?.toVault(selected.path);
		const file = path ? app.vault.getAbstractFileByPath(path) : null;
		if (file instanceof TFile && hasConflictBlocks(await app.vault.read(file))) {
			if (
				!(await confirmAction(app, {
					title: t('sync.resolveTitle'),
					message: t('sync.resolveMarkers', { path: selected.path }),
					action: t('sync.markResolved'),
				}))
			)
				return;
		}
		await service.markResolved([selected.path]);
	};
	return (
		<WorkspaceFrame
			navigationOpen={props.navigationOpen}
			navigation={
				<>
					<div className="space-y-2 border-b border-border p-2">
						<SegmentedControl<ChangeGroup>
							size="sm"
							ariaLabel={t('versioning.changes.group')}
							value={group}
							onChange={(next) => {
								setGroup(next);
								setSelectedKey(null);
							}}
							options={[
								{
									value: 'unstaged',
									label: t('versioning.changes.unstaged', {
										count: allFiles.filter((file) => file.group === 'unstaged').length,
									}),
								},
								{
									value: 'staged',
									label: t('versioning.changes.staged', {
										count: allFiles.filter((file) => file.group === 'staged').length,
									}),
								},
								...(allFiles.some((file) => file.group === 'conflicts')
									? [{ value: 'conflicts' as const, label: t('versioning.changes.conflicts') }]
									: []),
							]}
						/>
						<p className="px-1 text-xs text-muted-foreground">
							{t(
								group === 'staged'
									? 'versioning.changes.stagedBase'
									: group === 'unstaged'
										? 'versioning.changes.unstagedBase'
										: 'versioning.changes.conflictBase',
							)}
						</p>
					</div>
					<FileNavigator
						files={files}
						selected={selected?.key ?? null}
						onSelect={(file) => {
							setSelectedKey(file.key);
							props.onFileSelected();
						}}
						label={t('versioning.files.title')}
					/>
					{group !== 'conflicts' && (
						<div className="flex shrink-0 flex-wrap gap-1 border-t border-border p-2">
							<Button
								size="sm"
								variant="ghost"
								disabled={busy || !files.length}
								onClick={() =>
									void (group === 'staged' ? service.unstageAll() : service.stageAll()).catch(report)
								}
							>
								{group === 'staged' ? <Minus /> : <Plus />}
								{t(group === 'staged' ? 'sync.unstageAll' : 'sync.stageAll')}
							</Button>
						</div>
					)}
					<CommitComposer {...props} />
				</>
			}
		>
			{selected && (
				<div
					className="flex min-h-10 shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1"
					role="toolbar"
					aria-label={t('versioning.changes.fileActions')}
				>
					<span className="mr-auto min-w-0 max-w-full truncate px-1 text-xs" title={selected.path}>
						{selected.path}
					</span>
					<Button size="sm" variant="ghost" onClick={() => void openFile().catch(report)}>
						{t('versioning.openNote')}
					</Button>
					{group === 'conflicts' ? (
						<Button size="sm" disabled={busy} onClick={() => void resolveConflict().catch(report)}>
							<Check />
							{t('sync.markResolved')}
						</Button>
					) : (
						<ActionButton
							size="icon-sm"
							disabled={busy}
							label={t(group === 'staged' ? 'sync.unstage' : 'sync.stage')}
							onClick={() =>
								void (
									group === 'staged'
										? service.unstage([selected.path])
										: service.stage([selected.path])
								).catch(report)
							}
						>
							{group === 'staged' ? <Minus /> : <Plus />}
						</ActionButton>
					)}
					{group === 'unstaged' && (
						<ActionButton
							size="icon-sm"
							disabled={busy}
							label={t('sync.discard')}
							onClick={() => void discard().catch(report)}
						>
							<Undo2 />
						</ActionButton>
					)}
				</div>
			)}
			{selected && group === 'conflicts' ? (
				<DiffMessage
					message={t('versioning.changes.conflictHelp')}
					action={
						<Button size="sm" onClick={() => void openFile().catch(report)}>
							{t('versioning.openNote')}
						</Button>
					}
				/>
			) : selected && queries ? (
				<AsyncDiffSurface
					identity={`${selected.key}:${statusRevision}`}
					load={load}
					createWorker={props.createWorker}
				/>
			) : (
				<DiffMessage
					message={t(
						!queries ? 'versioning.unavailable' : allFiles.length ? 'versioning.selectFile' : 'sync.clean',
					)}
				/>
			)}
		</WorkspaceFrame>
	);
}

function CommitComposer({ app, service, snapshot, message, setMessage, report }: GitWorkbenchProps) {
	const [draft, setDraft] = useState(message);
	const latestDraft = useRef(message);
	const mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const busy = (!!snapshot.running && snapshot.running !== 'refresh') || snapshot.locked;
	const blocked = !!snapshot.operation || (snapshot.status?.conflicted.length ?? 0) > 0;
	const pending =
		(snapshot.status?.staged.length ?? 0) +
		(snapshot.status?.unstaged.length ?? 0) +
		(snapshot.status?.untracked.length ?? 0);
	const complete = (promise: Promise<RunReport>) => {
		const submitted = draft;
		void promise
			.then((result) => {
				// Git failures also resolve as reports. Clear only text that was actually committed,
				// and never erase a new draft typed while this action was in flight.
				if (
					!mounted.current ||
					!result.steps.some((step) => step.step === 'commit' && step.state === 'done') ||
					latestDraft.current !== submitted
				)
					return;
				latestDraft.current = '';
				setDraft('');
				setMessage('');
			})
			.catch(report);
	};
	const options = () => ({ message: draft.trim() || undefined });
	const abort = async () => {
		if (
			await confirmAction(app, {
				title: t('sync.abortTitle'),
				message: t('sync.abortConfirm', { operation: t(`sync.operation.${snapshot.operation ?? 'merge'}`) }),
				action: t('sync.abort'),
				danger: true,
			})
		)
			await service.abortOperation();
	};
	return (
		<section className="shrink-0 space-y-2 border-t border-border p-2" aria-label={t('versioning.commit.title')}>
			{blocked && (
				<div className="space-y-1 text-xs text-destructive" role="status">
					<p>
						{snapshot.operation
							? t('sync.operationStopped', { operation: t(`sync.operation.${snapshot.operation}`) })
							: t('sync.conflictsOnly')}
					</p>
					{snapshot.operation && (
						<div className="flex flex-wrap gap-1">
							<Button
								size="sm"
								disabled={busy || !!snapshot.status?.conflicted.length}
								onClick={() => void service.continueOperation().catch(report)}
							>
								{t('sync.continue')}
							</Button>
							<Button
								size="sm"
								variant="ghost"
								disabled={busy}
								onClick={() => void abort().catch(report)}
							>
								{t('sync.abort')}
							</Button>
						</div>
					)}
				</div>
			)}
			<Textarea
				rows={2}
				className="min-h-16 resize-none text-xs md:text-xs"
				value={draft}
				placeholder={t('sync.messagePlaceholder')}
				aria-label={t('sync.message')}
				onChange={(event) => {
					latestDraft.current = event.currentTarget.value;
					setDraft(event.currentTarget.value);
					setMessage(event.currentTarget.value);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
						event.preventDefault();
						if (!busy && !blocked && pending) complete(service.commitAndSync('all', options()));
					}
				}}
			/>
			<div className="flex flex-wrap gap-1">
				<Button
					size="sm"
					disabled={busy || blocked || !pending}
					onClick={() => complete(service.commit('smart', options()))}
				>
					<Check />
					{t('sync.commit')}
				</Button>
				<Button
					size="sm"
					variant="secondary"
					disabled={busy || blocked || !pending}
					onClick={() => complete(service.commitAndSync('all', options()))}
				>
					<RefreshCw />
					{t('sync.commitAndSync')}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={t('sync.moreCommit')}
							disabled={busy || blocked}
						>
							<Ellipsis />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							disabled={!snapshot.status?.staged.length}
							onSelect={() => complete(service.commit('staged', options()))}
						>
							<Check />
							{t('sync.commitStaged')}
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={!pending}
							onSelect={() => complete(service.commit('all', options()))}
						>
							<CheckCheck />
							{t('sync.commitAll')}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							disabled={!snapshot.status?.staged.length}
							onSelect={() => complete(service.commitAndSync('staged', options()))}
						>
							<RefreshCw />
							{t('sync.commitStagedAndSync')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</section>
	);
}

interface HistoryData {
	key: string;
	commits: readonly GraphCommit[];
	refs: readonly RefEntry[];
	more: boolean;
	error?: string;
}
const HISTORY_PAGE = 100;

function useRepositoryHistory(service: SyncService, version: string, ref: string, search: string, active = true) {
	const visible = useVisible();
	const [data, setData] = useState<HistoryData | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);
	const [retry, setRetry] = useState(0);
	const controller = useRef<AbortController | null>(null);
	const query = useMemo(
		() => ({ branches: 'all' as const, remotes: true, ref: ref || undefined, search: search.trim() }),
		[ref, search],
	);
	const key = `${version}:${ref}:${search}:${retry}`;
	useEffect(() => {
		if (!visible || !active) return;
		const abort = new AbortController();
		controller.current = abort;
		void Promise.all([service.graphLog(0, HISTORY_PAGE, query), service.refs()]).then(
			([commits, refs]) => {
				if (!abort.signal.aborted) setData({ key, commits, refs, more: commits.length === HISTORY_PAGE });
			},
			(error: unknown) => {
				if (!abort.signal.aborted)
					setData({
						key,
						commits: [],
						refs: [],
						more: false,
						error: error instanceof Error ? error.message : String(error),
					});
			},
		);
		return () => {
			abort.abort();
			if (controller.current === abort) controller.current = null;
		};
	}, [service, key, query, visible, active]);
	const current = data?.key === key ? data : null;
	const loadMore = () => {
		if (!current || loadingMore) return;
		const abort = controller.current;
		setLoadingMore(true);
		void service
			.graphLog(current.commits.length, HISTORY_PAGE, query)
			.then(
				(page) => {
					if (!abort?.signal.aborted)
						setData((value) =>
							value?.key === key
								? {
										...value,
										commits: [
											...value.commits,
											...page.filter(
												(commit) => !value.commits.some((entry) => entry.hash === commit.hash),
											),
										],
										more: page.length === HISTORY_PAGE,
									}
								: value,
						);
				},
				(error: unknown) => {
					if (!abort?.signal.aborted)
						setData((value) =>
							value?.key === key
								? { ...value, error: error instanceof Error ? error.message : String(error) }
								: value,
						);
				},
			)
			.finally(() => setLoadingMore(false));
	};
	return { data: current, loadingMore, loadMore, retry: () => setRetry((value) => value + 1) };
}

interface RevisionFilesState {
	key: string;
	files?: readonly RevisionFileChange[];
	error?: unknown;
}
function useRevisionFiles(queries: VersioningQueries | undefined, left: string | null, right: string | null) {
	const visible = useVisible();
	const [state, setState] = useState<RevisionFilesState | null>(null);
	const [attempt, setAttempt] = useState(0);
	const key = `${left ?? 'empty'}:${right ?? ''}:${attempt}`;
	useEffect(() => {
		if (!queries || !right || !visible) return;
		const abort = new AbortController();
		void queries.changedFiles(left, right, abort.signal).then(
			(files) => {
				if (!abort.signal.aborted) setState({ key, files });
			},
			(error: unknown) => {
				if (!abort.signal.aborted && !isCancelled(error)) setState({ key, error });
			},
		);
		return () => abort.abort();
	}, [queries, left, right, key, visible]);
	return { state: state?.key === key ? state : null, retry: () => setAttempt((value) => value + 1) };
}

function HistoryWorkspace(props: SharedWorkspaceProps) {
	const { service, queries, snapshot } = props;
	const [branch, setBranch] = useState('');
	const [search, setSearch] = useState('');
	const [selectedCommit, setSelectedCommit] = useState<GraphCommit | null>(null);
	const [selectedParent, setSelectedParent] = useState<string | null>(null);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const version = `${snapshot.status?.head ?? ''}:${snapshot.last?.at ?? ''}`;
	const history = useRepositoryHistory(service, version, branch, search);
	const parent = selectedParent ?? selectedCommit?.parents[0] ?? null;
	const revisionFiles = useRevisionFiles(queries, parent, selectedCommit?.hash ?? null);
	const files = (revisionFiles.state?.files ?? []).map((file) => ({ ...file, key: file.path }));
	const selected = files.find((file) => file.path === selectedPath) ?? null;
	const commitOid = selectedCommit?.hash;
	const load = useCallback(
		(signal: AbortSignal) => {
			if (!queries || !commitOid || !selectedPath) return Promise.reject(new Error(t('versioning.unavailable')));
			return queries.commitComparison(commitOid, selectedPath, parent ?? undefined, signal);
		},
		[queries, commitOid, selectedPath, parent],
	);
	const refs = history.data?.refs ?? [];
	const graph = useMemo(() => layoutGraph(history.data?.commits ?? []), [history.data?.commits]);
	const graphRows = new Map(graph.map((row) => [row.hash, row]));
	const width = graphWidth(Math.min(4, Math.max(1, ...graph.map((row) => row.width))));
	return (
		<WorkspaceFrame
			navigationOpen={props.navigationOpen}
			navigation={
				<>
					<div className="space-y-2 border-b border-border p-2">
						<RefSelect
							label={t('versioning.history.branch')}
							value={branch}
							onChange={(next) => {
								setBranch(next);
								setSelectedCommit(null);
								setSelectedPath(null);
								setSelectedParent(null);
							}}
							refs={refs}
							includeAll
						/>
						<Input
							className="h-8 text-xs md:text-xs"
							value={search}
							placeholder={t('sync.searchCommits')}
							aria-label={t('sync.searchCommits')}
							onChange={(event) => setSearch(event.currentTarget.value)}
						/>
					</div>
					{!history.data ? (
						<DiffMessage busy message={t('versioning.history.loading')} />
					) : history.data.error ? (
						<DiffMessage
							message={history.data.error}
							action={
								<Button size="sm" onClick={history.retry}>
									{t('versioning.retry')}
								</Button>
							}
						/>
					) : (
						<ChoiceList
							items={history.data.commits}
							itemKey={(commit) => commit.hash}
							selected={commitOid ?? null}
							onSelect={(commit) => {
								setSelectedCommit(commit);
								setSelectedParent(null);
								setSelectedPath(null);
							}}
							itemLabel={(commit) => `${commit.subject} · ${commit.short} · ${commit.author}`}
							label={t('versioning.history.commits')}
							renderItem={(commit) => (
								<>
									<GraphCell
										row={graphRows.get(commit.hash)}
										width={width}
										head={commit.hash === snapshot.status?.head}
									/>
									<span className="min-w-0 flex-1 truncate">{commit.subject}</span>
									<span className="shrink-0 font-mono text-xs text-muted-foreground">
										{commit.short}
									</span>
								</>
							)}
						/>
					)}
					{history.data && !history.data.commits.length && !history.data.error && (
						<p className="px-3 py-4 text-xs text-muted-foreground">{t('sync.noCommits')}</p>
					)}
					{history.data?.more && (
						<Button size="sm" variant="ghost" disabled={history.loadingMore} onClick={history.loadMore}>
							{t('versioning.history.loadMore')}
						</Button>
					)}
				</>
			}
			files={
				<>
					{selectedCommit && (
						<div className="shrink-0 space-y-1 border-b border-border p-3 text-xs">
							<p className="line-clamp-2 font-medium" title={selectedCommit.subject}>
								{selectedCommit.subject}
							</p>
							<p className="truncate text-muted-foreground" title={selectedCommit.author}>
								{selectedCommit.author} · {new Date(selectedCommit.time * 1000).toLocaleDateString()}
							</p>
							{selectedCommit.parents.length > 1 ? (
								<Select
									value={parent ?? ''}
									onValueChange={(value) => {
										setSelectedParent(value);
										setSelectedPath(null);
									}}
								>
									<SelectTrigger
										size="sm"
										className="w-full"
										aria-label={t('versioning.history.parent')}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedCommit.parents.map((oid, index) => (
											<SelectItem key={oid} value={oid}>
												{t('versioning.history.parentItem', {
													number: index + 1,
													oid: oid.slice(0, 8),
												})}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<p className="text-muted-foreground">
									{parent
										? t('versioning.history.parentBase', { oid: parent.slice(0, 8) })
										: t('versioning.history.rootBase')}
								</p>
							)}
						</div>
					)}
					{!selectedCommit ? (
						<DiffMessage message={t('versioning.selectCommit')} />
					) : !queries ? (
						<DiffMessage message={t('versioning.unavailable')} />
					) : !revisionFiles.state ? (
						<DiffMessage busy message={t('versioning.files.loading')} />
					) : revisionFiles.state.error ? (
						<DiffMessage
							message={errorMessage(revisionFiles.state.error)}
							action={
								<Button size="sm" onClick={revisionFiles.retry}>
									{t('versioning.retry')}
								</Button>
							}
						/>
					) : (
						<FileNavigator
							files={files}
							selected={selected?.key ?? null}
							onSelect={(file) => {
								setSelectedPath(file.path);
								props.onFileSelected();
							}}
							label={t('versioning.files.title')}
						/>
					)}
				</>
			}
		>
			{selected && queries && commitOid ? (
				<AsyncDiffSurface
					identity={`${commitOid}:${parent ?? 'root'}:${selected.path}`}
					load={load}
					createWorker={props.createWorker}
				/>
			) : (
				<DiffMessage message={t(selectedCommit ? 'versioning.selectFile' : 'versioning.selectCommit')} />
			)}
		</WorkspaceFrame>
	);
}

function CompareWorkspace(props: SharedWorkspaceProps) {
	const { queries, service, snapshot } = props;
	const [left, setLeft] = useState(snapshot.status?.head ?? '');
	const [right, setRight] = useState('');
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const repository = useRepositoryHistory(
		service,
		`${snapshot.status?.head ?? ''}:${snapshot.last?.at ?? ''}`,
		'',
		'',
	);
	const revisionFiles = useRevisionFiles(queries, left || null, left && right ? right : null);
	const files = (revisionFiles.state?.files ?? []).map((file) => ({ ...file, key: file.path }));
	const selected = files.find((file) => file.path === selectedPath) ?? null;
	const from = selected?.from;
	const load = useCallback(
		(signal: AbortSignal) => {
			if (!queries || !left || !right || !selectedPath)
				return Promise.reject(new Error(t('versioning.unavailable')));
			return queries.compare(
				{
					intent: 'branches',
					left: { kind: 'commit', commit: left, path: from ?? selectedPath },
					right: { kind: 'commit', commit: right, path: selectedPath },
				},
				signal,
			);
		},
		[queries, left, right, selectedPath, from],
	);
	const refs = repository.data?.refs ?? [];
	return (
		<WorkspaceFrame
			navigationOpen={props.navigationOpen}
			navigation={
				<>
					<div className="space-y-3 border-b border-border p-3">
						<RefSelect
							label={t('versioning.compare.base')}
							value={left}
							onChange={(value) => {
								setLeft(value);
								setSelectedPath(null);
							}}
							refs={refs}
							head={snapshot.status?.head}
						/>
						<RefSelect
							label={t('versioning.compare.target')}
							value={right}
							onChange={(value) => {
								setRight(value);
								setSelectedPath(null);
							}}
							refs={refs}
							head={snapshot.status?.head}
						/>
						<p className="text-xs text-muted-foreground">{t('versioning.compare.hint')}</p>
					</div>
					{!queries ? (
						<DiffMessage message={t('versioning.unavailable')} />
					) : !left || !right ? (
						<DiffMessage message={t('versioning.compare.choose')} />
					) : !revisionFiles.state ? (
						<DiffMessage busy message={t('versioning.files.loading')} />
					) : revisionFiles.state.error ? (
						<DiffMessage
							message={errorMessage(revisionFiles.state.error)}
							action={
								<Button size="sm" onClick={revisionFiles.retry}>
									{t('versioning.retry')}
								</Button>
							}
						/>
					) : (
						<FileNavigator
							files={files}
							selected={selected?.key ?? null}
							onSelect={(file) => {
								setSelectedPath(file.path);
								props.onFileSelected();
							}}
							label={t('versioning.files.title')}
						/>
					)}
				</>
			}
		>
			{selected && queries ? (
				<AsyncDiffSurface
					identity={`${left}:${right}:${selected.path}`}
					load={load}
					createWorker={props.createWorker}
				/>
			) : (
				<DiffMessage message={t(left && right ? 'versioning.selectFile' : 'versioning.compare.choose')} />
			)}
		</WorkspaceFrame>
	);
}

function RefSelect({
	label,
	value,
	onChange,
	refs,
	includeAll,
	head,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	refs: readonly RefEntry[];
	includeAll?: boolean;
	head?: string | null;
}) {
	// Values are immutable commit OIDs. Several branch labels may point at the same OID.
	const grouped = new Map<string, string[]>();
	for (const ref of refs) {
		const labels = grouped.get(ref.hash) ?? [];
		labels.push(ref.name.replace(/^refs\/(heads|remotes|tags)\//, ''));
		grouped.set(ref.hash, labels);
	}
	if (head && !grouped.has(head)) grouped.set(head, [t('versioning.compare.head')]);
	if (value && !grouped.has(value)) grouped.set(value, [value.slice(0, 8)]);
	return (
		<div className="space-y-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<Select
				value={value || (includeAll ? 'all' : '')}
				onValueChange={(next) => onChange(next === 'all' ? '' : next)}
			>
				<SelectTrigger size="sm" className="w-full" aria-label={label}>
					<SelectValue placeholder={t('versioning.compare.chooseRef')} />
				</SelectTrigger>
				<SelectContent>
					{includeAll && <SelectItem value="all">{t('sync.branches.all')}</SelectItem>}
					{[...grouped].map(([oid, labels]) => (
						<SelectItem key={oid} value={oid}>
							{labels.join(' · ')}{' '}
							<span className="font-mono text-muted-foreground">{oid.slice(0, 8)}</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
