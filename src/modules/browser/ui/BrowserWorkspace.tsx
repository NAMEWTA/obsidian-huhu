import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Download, Folder, Globe, KeyRound, MoreHorizontal, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import type {
	BrowserWorkspace as BrowserWorkspaceApi,
	BrowserSpace,
	BrowserFile,
	IdentitySummary,
	HumanPageRequest,
} from '../api';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { Label } from '../../../ui/components/label';
import { Checkbox } from '../../../ui/components/checkbox';
import { Switch } from '../../../ui/components/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/components/tabs';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '../../../ui/components/dialog';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '../../../ui/components/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../../ui/components/dropdown-menu';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { useT } from '../../../ui/react/hooks';
import { cn } from '../../../ui/lib/utils';
import { BrowserActionError, actionError } from './BrowserActionError';
import { SpaceViewer } from './SpaceViewer';
import { IdentityImportActions, type IdentityImportActionsHandle } from './IdentityImportActions';

export interface BrowserWorkspaceSelection {
	spaceId?: string;
	pageId?: string;
}
export function BrowserWorkspace({
	api,
	selection,
	onSelect,
	navigationRevision,
}: {
	api: BrowserWorkspaceApi;
	selection: BrowserWorkspaceSelection;
	onSelect: (selection: BrowserWorkspaceSelection) => void;
	navigationRevision?: number;
}) {
	const t = useT();
	const state = useSyncExternalStore(
		useCallback((listener) => api.subscribe(listener), [api]),
		useCallback(() => api.getState(), [api]),
	);
	const space = state.spaces.find((item) => item.id === selection.spaceId);
	const page =
		space?.pages.find((item) => item.id === selection.pageId) ??
		space?.pages.find((item) => item.status !== 'closed');
	const [section, setSection] = useState('spaces'),
		[pending, setPending] = useState(false),
		[error, setError] = useState('');
	const [creating, setCreating] = useState(false),
		[kind, setKind] = useState<'personal' | 'task'>('personal');
	const [label, setLabel] = useState(''),
		[seed, setSeed] = useState('empty'),
		[temporary, setTemporary] = useState(false);
	const [rename, setRename] = useState<BrowserSpace>(),
		[renameLabel, setRenameLabel] = useState('');
	const [remove, setRemove] = useState<BrowserSpace>();
	const [identities, setIdentities] = useState<IdentitySummary[]>([]),
		[identityName, setIdentityName] = useState('');
	const [persist, setPersist] = useState(state.persistence === 'secure'),
		[revision, setRevision] = useState(0);
	const [saveFrom, setSaveFrom] = useState<HumanPageRequest>();
	const [sourceOpen, setSourceOpen] = useState(false),
		[sourceId, setSourceId] = useState(''),
		[profileId, setProfileId] = useState('');
	const [sources, setSources] = useState<Awaited<ReturnType<BrowserWorkspaceApi['listIdentitySources']>>>([]);
	const [files, setFiles] = useState<{
		spaceId: string;
		items: Array<Pick<BrowserFile, 'id' | 'name' | 'size' | 'kind' | 'state'> & { downloadId?: string; cleanupPending?: boolean }>;
	}>();
	const importing = useRef<IdentityImportActionsHandle>(null),
		busy = useRef(false);
	const sourceAbort = useRef<AbortController | undefined>(undefined),
		createAbort = useRef<AbortController | undefined>(undefined),
		manualAbort = useRef<AbortController | undefined>(undefined),
		creationBaseline = useRef(new Set<string>());
	const [cancellingCreate, setCancellingCreate] = useState(false),
		[identityOutcome, setIdentityOutcome] = useState(''),
		[identityCount, setIdentityCount] = useState(0),
		[cancellingSave, setCancellingSave] = useState(false);
	useEffect(
		() => () => {
			sourceAbort.current?.abort();
			createAbort.current?.abort();
			manualAbort.current?.abort();
		},
		[api],
	);
	const creatingIdentity = pending
		? state.spaces.find((item) => !creationBaseline.current.has(item.id) && item.identityVersionId === seed)
				?.identityImport
		: undefined;
	const report = useCallback((reason: unknown) => setError(actionError(reason)), []);
	const run = useCallback(
		async (work: () => Promise<unknown>) => {
			if (busy.current) return;
			busy.current = true;
			setPending(true);
			setError('');
			try {
				await work();
			} catch (reason) {
				report(reason);
			} finally {
				busy.current = false;
				setPending(false);
			}
		},
		[report],
	);
	useEffect(() => setSection('spaces'), [navigationRevision]);
	useEffect(() => {
		if (section !== 'identities' && !creating) return;
		let live = true;
		void Promise.resolve()
			.then(() => api.listIdentities())
			.then(
				(items) => {
					if (live) setIdentities(items);
				},
				(reason) => {
					if (live) report(reason);
				},
			);
		return () => {
			live = false;
		};
	}, [api, section, creating, revision, report]);
	useEffect(() => {
		if (section !== 'files' || !selection.spaceId) return;
		let live = true;
		const id = selection.spaceId;
		void Promise.resolve()
			.then(() => api.listFiles(id))
			.then(
				(items) => {
					if (live)
						setFiles({
							spaceId: id,
							items: [
								...items.map(file => ({ ...file, cleanupPending: api.listDownloads(id).some(download => download.fileId === file.id && download.cleanup === 'pending') })),
								...api
									.listDownloads(id)
									.filter((item) => item.state !== 'completed' && item.state !== 'canceled')
									.map((item) => ({
										id: item.id,
										downloadId: item.id,
										name: item.name,
										size: item.receivedBytes,
										kind: 'download' as const,
										state:
											item.state === 'in-progress' ? ('pending' as const) : ('failed' as const),
									})),
							],
						});
				},
				(reason) => {
					if (live) report(reason);
				},
			);
		return () => {
			live = false;
		};
	}, [api, section, selection.spaceId, state, revision, report]);
	const selectSpace = (id: string) =>
		onSelect({
			spaceId: id,
			pageId: state.spaces.find((item) => item.id === id)?.pages.find((item) => item.status !== 'closed')?.id,
		});
	const refreshed = () => setRevision((value) => value + 1);
	const create = async () => {
		const controller = new AbortController();
		createAbort.current = controller;
		creationBaseline.current = new Set(state.spaces.map((item) => item.id));
		setCancellingCreate(false);
		setIdentityOutcome('');
		try {
			if (state.persistence === 'unavailable' && temporary) await api.consentEphemeral();
			const created = await api.createSpace({
				kind,
				label: label.trim(),
				...(seed !== 'empty' ? { identityVersionId: seed } : {}),
				ephemeral: temporary,
				signal: controller.signal,
			});
			if (controller.signal.aborted) setIdentityOutcome('browser.v2.spaceCreatedAfterCancel');
			setCreating(false);
			setSection('spaces');
			onSelect({ spaceId: created.id, pageId: created.pages[0]?.id });
		} catch (reason) {
			if (
				controller.signal.aborted &&
				reason instanceof Error &&
				['cancelled', 'start_cancelled'].includes(reason.message)
			) {
				setCreating(false);
				setIdentityOutcome('browser.v2.identityCancelled');
			} else throw reason;
		} finally {
			if (createAbort.current === controller) createAbort.current = undefined;
			setCancellingCreate(false);
		}
	};
	const startImport = async () => {
		const items = await api.listIdentitySources();
		setSources(items);
		setSourceId('');
		setProfileId('');
		setSourceOpen(true);
	};
	const saveManualIdentity = async () => {
		if (!saveFrom) return;
		const controller = new AbortController();
		manualAbort.current = controller;
		setCancellingSave(false);
		setIdentityOutcome('');
		try {
			const receipt = await api.saveIdentity({
				...saveFrom,
				label: identityName.trim(),
				persist: persist && state.persistence === 'secure',
				signal: controller.signal,
			});
			setSaveFrom(undefined);
			setIdentityCount(receipt.cookieCount);
			setIdentityOutcome(
				controller.signal.aborted ? 'browser.v2.identitySavedAfterCancel' : 'browser.v2.identitySaved',
			);
			refreshed();
		} catch (reason) {
			if (controller.signal.aborted && reason instanceof Error && reason.message === 'cancelled') {
				setSaveFrom(undefined);
				setIdentityCount(0);
				setIdentityOutcome('browser.v2.identityCancelled');
			} else throw reason;
		} finally {
			if (manualAbort.current === controller) manualAbort.current = undefined;
			setCancellingSave(false);
		}
	};
	const cancelManualSave = () => {
		if (manualAbort.current) {
			manualAbort.current.abort();
			setCancellingSave(true);
		} else if (!pending) setSaveFrom(undefined);
	};
	const prepareSource = async () => {
		const controller = new AbortController();
		sourceAbort.current = controller;
		try {
			const preview = await api.prepareBrowserIdentityImport({
				sourceId,
				profileId,
				label: identityName.trim(),
				signal: controller.signal,
			});
			if (controller.signal.aborted) {
				api.discardIdentityImport(preview.planId);
				return;
			}
			setSourceOpen(false);
			if (importing.current) importing.current.review(preview, persist && state.persistence === 'secure');
			else api.discardIdentityImport(preview.planId);
		} catch (reason) {
			if (!controller.signal.aborted) throw reason;
		} finally {
			if (sourceAbort.current === controller) sourceAbort.current = undefined;
		}
	};
	const spaceActions = (current: BrowserSpace) => (
		<>
			<Button
				size="sm"
				variant="outline"
				disabled={
					pending || state.readOnly || (['stopped', 'faulted'].includes(current.status) && state.availability.state !== 'ready')
				}
				onClick={() =>
					void run(() =>
						['stopped', 'faulted'].includes(current.status) ? api.startSpace(current.id) : api.stopSpace(current.id),
					)
				}
			>
				{t(['stopped', 'faulted'].includes(current.status) ? 'browser.v2.start' : 'browser.v2.stop')}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="icon-sm" variant="ghost" aria-label={t('browser.v2.workspace')}>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem
						disabled={state.readOnly}
						onSelect={() => {
							setRename(current);
							setRenameLabel(current.label);
						}}
					>
						{t('browser.v2.rename')}
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={state.readOnly || current.control.mode !== 'human' || !page}
						onSelect={() => {
							const lease = current.control.lease;
							if (!lease || !page) return;
							setSaveFrom({
								spaceId: current.id,
								pageId: page.id,
								viewerId: lease.viewerId ?? lease.controllerId,
								leaseId: lease.leaseId,
								epoch: lease.epoch,
							});
							setIdentityName(current.label);
						}}
					>
						{t('browser.v2.identityExport')}
					</DropdownMenuItem>
					{current.status === 'cleanup_pending' && (
						<DropdownMenuItem onSelect={() => void run(() => api.retryCleanup(current.id))}>
							{t('browser.v2.retryCleanup')}
						</DropdownMenuItem>
					)}
					<DropdownMenuItem disabled={state.readOnly} onSelect={() => setRemove(current)}>
						<Trash2 />
						{t('browser.v2.delete')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
	return (
		<div className="huhu-browser-workspace flex h-full min-h-0 min-w-0 flex-col">
			<header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
				<div className="min-w-0 flex-1">
					<h2 className="text-sm font-semibold">{t('browser.v2.workspace')}</h2>
					<p className="text-xs text-muted-foreground">{t('browser.v2.description')}</p>
				</div>
				<Button
					size="sm"
					disabled={pending || state.readOnly || !state.ready || state.availability.state !== 'ready'}
					onClick={() => {
						setLabel('');
						setSeed('empty');
						setTemporary(false);
						setCreating(true);
					}}
				>
					<Plus />
					{t('browser.v2.newSpace')}
				</Button>
			</header>
			{state.persistence === 'unavailable' && (
				<p className="border-b border-border bg-muted/30 px-3 py-2 text-sm">
					{t('browser.v2.ephemeralExplanation')}
				</p>
			)}
			{state.readOnly && (
				<p role="alert" className="px-3 py-2 text-sm text-destructive">
					{t('browser.v2.readOnly')}
				</p>
			)}
			{state.availability.state !== 'ready' && (
				<div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
					<p className="min-w-0 flex-1 text-sm">{t('browser.v2.unavailable')}</p>
					<Button
						size="sm"
						disabled={pending || state.readOnly}
						onClick={() => void run(() => api.installRuntimeBundle())}
					>
						{t('browser.v2.installRuntime')}
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={pending}
						onClick={() => void run(() => api.refreshRuntime())}
					>
						{t('browser.v2.refreshRuntime')}
					</Button>
				</div>
			)}
			{state.cleanupPending > 0 && (
				<div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
					<p className="text-sm">{t('browser.v2.cleanupPending', { count: state.cleanupPending })}</p>
					<Button
						size="sm"
						variant="outline"
						disabled={pending}
						onClick={() => void run(() => api.retryPendingCleanup())}
					>
						{t('browser.v2.retryCleanup')}
					</Button>
				</div>
			)}
			<BrowserActionError code={error || state.error} />
			{identityOutcome && (
				<p role="status" className="px-3 py-2 text-sm">
					{t(identityOutcome, { count: identityCount })}
				</p>
			)}
			{state.identityRefreshPending && (
				<div className="flex flex-wrap items-center gap-2 px-3 py-2">
					<p role="alert" className="text-sm text-muted-foreground">
						{t('browser.v2.identityListPending')}
					</p>
					<Button
						variant="outline"
						disabled={pending}
						onClick={() =>
							void run(async () => {
								await api.refreshIdentities();
								refreshed();
							})
						}
					>
						{t('browser.v2.reloadIdentities')}
					</Button>
				</div>
			)}
			{space?.identityImport && (
				<p role="status" className="px-3 py-2 text-sm text-muted-foreground">
					{space.identityImport.importedCount !== undefined
						? t('browser.v2.identityVerified', {
								count: space.identityImport.importedCount,
								expired: space.identityImport.naturallyExpired ?? 0,
							})
						: t(`browser.v2.identityPhase.${space.identityImport.phase}`)}
				</p>
			)}
			<Tabs value={section} onValueChange={setSection} className="shrink-0 border-b border-border px-3 py-1">
				<TabsList className="max-w-full bg-transparent">
					<TabsTrigger value="spaces">
						<Globe />
						{t('browser.v2.spaces')}
					</TabsTrigger>
					<TabsTrigger value="identities">
						<KeyRound />
						{t('browser.v2.identities')}
					</TabsTrigger>
					<TabsTrigger value="files">
						<Folder />
						{t('browser.v2.files')}
					</TabsTrigger>
				</TabsList>
			</Tabs>
			{section === 'identities' ? (
				<div className="min-h-0 space-y-4 overflow-auto p-4">
					<div className="flex flex-wrap items-end gap-3">
						<label className="min-w-0 flex-1 space-y-1 text-sm">
							<span>{t('browser.v2.identityName')}</span>
							<Input
								value={identityName}
								maxLength={120}
								onChange={(event) => setIdentityName(event.target.value)}
							/>
						</label>
						<label className="flex min-h-9 items-center gap-2 text-sm">
							<Switch
								checked={persist && state.persistence === 'secure'}
								disabled={state.persistence !== 'secure'}
								onCheckedChange={setPersist}
							/>
							{t('browser.v2.persistIdentity')}
						</label>
					</div>
					<div className="flex flex-wrap gap-2">
						<IdentityImportActions
							ref={importing}
							api={api}
							label={identityName}
							persist={persist && state.persistence === 'secure'}
							disabled={pending || state.readOnly}
							report={report}
							onImported={refreshed}
						/>
						<Button
							variant="outline"
							disabled={pending || state.readOnly || !identityName.trim()}
							onClick={() => void run(startImport)}
						>
							<KeyRound />
							{t('browser.v2.sourceIdentity')}
						</Button>
					</div>
					{identities.length ? (
						<ul className="space-y-2">
							{identities.map((identity) => (
								<li
									key={identity.id}
									className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
								>
									<KeyRound className="size-4 shrink-0" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{identity.label}</p>
										<p className="text-xs text-muted-foreground">
											{t('browser.v2.identityCount', { count: identity.cookieCount })} ·{' '}
											{t(
												identity.persistent
													? 'browser.v2.persistIdentity'
													: 'browser.v2.sessionOnly',
											)}
										</p>
									</div>
									<Button
										size="icon-sm"
										variant="ghost"
										aria-label={t('browser.v2.deleteIdentity')}
										disabled={pending || state.readOnly}
										onClick={() =>
											void run(async () => {
												await api.removeIdentity(identity.id);
												refreshed();
											})
										}
									>
										<Trash2 />
									</Button>
								</li>
							))}
						</ul>
					) : (
						<EmptyState icon={<KeyRound />} title={t('browser.v2.noIdentities')} />
					)}
				</div>
			) : (
				<div className="huhu-browser-workspace-body flex min-h-0 min-w-0 flex-1">
					<aside
						className="huhu-browser-space-list w-56 shrink-0 space-y-1 overflow-auto border-r border-border p-2"
						aria-label={t('browser.v2.spaces')}
					>
						{state.spaces.map((item) => (
							<Button
								key={item.id}
								className={cn(
									'h-auto min-h-12 w-full justify-start px-2 py-2 text-left',
									item.id === space?.id && 'bg-accent',
								)}
								variant="ghost"
								aria-current={item.id === space?.id ? 'page' : undefined}
								onClick={() => selectSpace(item.id)}
							>
								<Globe className="shrink-0" />
								<span className="min-w-0 flex-1">
									<span className="block truncate" title={item.label}>
										{item.label}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{t(item.kind === 'personal' ? 'browser.v2.personal' : 'browser.v2.task')} ·{' '}
										{t(`browser.v2.${item.status}`)}
									</span>
								</span>
							</Button>
						))}
					</aside>
					<section className="flex min-h-0 min-w-0 flex-1 flex-col">
						{space ? (
							<>
								<header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
									<div className="min-w-0 flex-1">
										<h3 className="truncate text-sm font-semibold" title={space.label}>
											{space.label}
										</h3>
										<p className="text-xs text-muted-foreground">
											{t(space.kind === 'personal' ? 'browser.v2.personal' : 'browser.v2.task')} ·{' '}
											{t(`browser.v2.${space.status}`)}
										</p>
									</div>
									{spaceActions(space)}
								</header>
								{section === 'files' ? (
									<div className="min-h-0 space-y-3 overflow-auto p-3">
										<p className="text-xs text-muted-foreground">{t('browser.v2.fileScope')}</p>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												disabled={
													pending ||
													state.readOnly ||
													space.status !== 'ready' ||
													!['agent', 'human'].includes(space.control.mode)
												}
												onClick={() =>
													void run(async () => {
														await api.chooseUpload(
															space.id,
															space.control.mode === 'agent' ? 'agent' : 'human',
														);
														refreshed();
													})
												}
											>
												<Upload />
												{t(
													space.control.mode === 'agent'
														? 'browser.v2.chooseAgentUpload'
														: 'browser.v2.chooseUpload',
												)}
											</Button>
											<Button
												size="icon-sm"
												variant="outline"
												aria-label={t('browser.v2.refreshRuntime')}
												onClick={refreshed}
											>
												<RefreshCw />
											</Button>
										</div>
										{files?.spaceId === space.id && files.items.length ? (
											<ul className="space-y-2">
												{files.items.map((file) => (
													<li
														key={file.id}
														className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
													>
														<Download className="size-4 shrink-0" />
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm" title={file.name}>
																{file.name}
															</p>
															<p className="text-xs text-muted-foreground">
																{new Intl.NumberFormat().format(file.size)} B ·{' '}
																{t(
																	file.state === 'ready'
																		? 'browser.v2.fileReady'
																		: `browser.v2.${file.state}`,
																)}
															</p>
														</div>
														{file.cleanupPending && <Button size="sm" variant="outline" disabled={pending || state.readOnly} onClick={() => void run(async () => { await api.retryCleanup(space.id); refreshed(); })}>{t('browser.v2.downloadCleanupPending')}</Button>}
														{file.kind === 'download' && file.state === 'pending' ? (
															<Button
																size="sm"
																variant="outline"
																disabled={pending}
																onClick={() =>
																	void run(async () => {
																		await api.cancelDownload(
																			file.downloadId ?? file.id,
																		);
																		refreshed();
																	})
																}
															>
																{t('browser.v2.cancelDownload')}
															</Button>
														) : (
															<Button
																size="sm"
																variant="outline"
																disabled={pending || file.state !== 'ready'}
																onClick={() => void run(() => api.exportFile(file.id))}
															>
																{t('browser.v2.exportFile')}
															</Button>
														)}
														<Button
															size="icon-sm"
															variant="ghost"
															aria-label={t('browser.v2.removeFile')}
															disabled={pending || !!file.downloadId}
															onClick={() =>
																void run(async () => {
																	await api.removeFile(file.id);
																	refreshed();
																})
															}
														>
															<Trash2 />
														</Button>
													</li>
												))}
											</ul>
										) : (
											<EmptyState icon={<Folder />} title={t('browser.v2.noFiles')} />
										)}
									</div>
								) : (
									<>
										<div
											className="flex min-h-10 items-center gap-1 overflow-x-auto border-b border-border px-2"
											role="tablist"
											aria-label={t('browser.v2.selectPage')}
										>
											{space.pages
												.filter((item) => item.status !== 'closed')
												.map((item) => (
													<div
														key={item.id}
														className="flex min-w-24 max-w-60 shrink-0 items-center"
													>
														<Button
															size="sm"
															variant={item.id === page?.id ? 'secondary' : 'ghost'}
															role="tab"
															aria-selected={item.id === page?.id}
															title={item.title || item.url}
															onClick={() =>
																onSelect({ spaceId: space.id, pageId: item.id })
															}
														>
															{item.title || item.url}
														</Button>
														{item.status === 'failed' && (
															<Button size="icon-sm" variant="ghost" aria-label={t('browser.v2.retryPage')}
																disabled={pending || state.readOnly || space.status !== 'ready' || ['agent', 'quiescing', 'blocked'].includes(space.control.mode)}
																onClick={() => void run(async () => { await api.retryPage({ spaceId: space.id, pageId: item.id }); })}>
																<RefreshCw />
															</Button>
														)}
														<Button
															size="icon-sm"
															variant="ghost"
															aria-label={t('browser.v2.closePage')}
															disabled={
																pending ||
																state.readOnly ||
																['agent', 'quiescing', 'blocked'].includes(
																	space.control.mode,
																)
															}
															onClick={() =>
																void run(async () => {
																	await api.closePage({
																		spaceId: space.id,
																		pageId: item.id,
																	});
																	const current = api
																		.getState()
																		.spaces.find((value) => value.id === space.id);
																	if (selection.pageId === item.id)
																		onSelect({
																			spaceId: space.id,
																			pageId: current?.pages.find(
																				(value) => value.status !== 'closed',
																			)?.id,
																		});
																})
															}
														>
															<X />
														</Button>
													</div>
												))}
											<Button
												size="icon-sm"
												variant="ghost"
												aria-label={t('browser.v2.newPage')}
												disabled={
													pending ||
													state.readOnly ||
													space.status !== 'ready' ||
													['agent', 'quiescing', 'blocked'].includes(space.control.mode)
												}
												onClick={() =>
													void run(async () => {
														const created = await api.openPage({
															spaceId: space.id,
															url: 'about:blank',
														});
														onSelect({ spaceId: space.id, pageId: created.id });
													})
												}
											>
												<Plus />
											</Button>
										</div>
										{page?.status === 'failed' && <p role="alert" className="px-3 py-2 text-sm text-destructive">{t('browser.v2.pageRestoreFailed')}</p>}
										{page ? (
											<SpaceViewer
												key={`${space.id}:${page.id}`}
												api={api}
												spaceId={space.id}
												pageId={page.id}
											/>
										) : (
											<EmptyState title={t('browser.v2.selectPage')} />
										)}
									</>
								)}
							</>
						) : (
							<EmptyState
								className="flex-1"
								icon={<Globe />}
								title={t(state.spaces.length ? 'browser.v2.selectSpace' : 'browser.v2.emptySpaces')}
							/>
						)}
					</section>
				</div>
			)}
			<Dialog
				open={creating}
				onOpenChange={(open) => {
					if (!open && createAbort.current) {
						createAbort.current.abort();
						setCancellingCreate(true);
					} else if (!pending) setCreating(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.newSpace')}</DialogTitle>
						<DialogDescription>{t('browser.v2.description')}</DialogDescription>
					</DialogHeader>
					<Label>
						{t('browser.v2.name')}
						<Input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} />
					</Label>
					<Select value={kind} onValueChange={(value) => setKind(value === 'task' ? 'task' : 'personal')}>
						<SelectTrigger aria-label={t('browser.v2.kind')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="personal">{t('browser.v2.personal')}</SelectItem>
							<SelectItem value="task">{t('browser.v2.task')}</SelectItem>
						</SelectContent>
					</Select>
					<Select value={seed} onValueChange={setSeed}>
						<SelectTrigger aria-label={t('browser.v2.seed')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="empty">{t('browser.v2.emptyIdentity')}</SelectItem>
							{identities.map((item) => (
								<SelectItem value={item.id} key={item.id}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{state.persistence === 'unavailable' && (
						<label className="flex items-start gap-2 text-sm">
							<Checkbox checked={temporary} onCheckedChange={(value) => setTemporary(value === true)} />
							<span>{t('browser.v2.ephemeralConsent')}</span>
						</label>
					)}
					<DialogFooter>
						{pending && (
							<p role="status" className="text-sm">
								{t(
									cancellingCreate
										? 'browser.v2.identityCancelling'
										: creatingIdentity
											? `browser.v2.identityPhase.${creatingIdentity.phase}`
											: 'browser.v2.identityCreating',
								)}
							</p>
						)}
						<Button
							variant="outline"
							disabled={cancellingCreate}
							onClick={() => {
								if (createAbort.current) {
									createAbort.current.abort();
									setCancellingCreate(true);
								} else setCreating(false);
							}}
						>
							{t('browser.v2.cancel')}
						</Button>
						<Button
							disabled={pending || !label.trim() || (state.persistence === 'unavailable' && !temporary)}
							onClick={() => void run(create)}
						>
							{t('browser.v2.create')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={!!rename}
				onOpenChange={(open) => {
					if (!open && !pending) setRename(undefined);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.rename')}</DialogTitle>
						<DialogDescription>{t('browser.v2.name')}</DialogDescription>
					</DialogHeader>
					<Input
						aria-label={t('browser.v2.name')}
						value={renameLabel}
						maxLength={120}
						onChange={(event) => setRenameLabel(event.target.value)}
					/>
					<DialogFooter>
						<Button variant="outline" disabled={pending} onClick={() => setRename(undefined)}>
							{t('browser.v2.cancel')}
						</Button>
						<Button
							disabled={pending || !renameLabel.trim()}
							onClick={() =>
								void run(async () => {
									if (rename) await api.renameSpace(rename.id, renameLabel.trim());
									setRename(undefined);
								})
							}
						>
							{t('browser.v2.save')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AlertDialog
				open={!!remove}
				onOpenChange={(open) => {
					if (!open && !pending) setRemove(undefined);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('browser.v2.deleteTitle')}</AlertDialogTitle>
						<AlertDialogDescription>{t('browser.v2.deleteDescription')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={pending}>{t('browser.v2.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={pending}
							onClick={() =>
								void run(async () => {
									if (!remove) return;
									const id = remove.id;
									await api.removeSpace(id);
									setRemove(undefined);
									if (selection.spaceId === id) onSelect({});
								})
							}
						>
							{t('browser.v2.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Dialog
				open={sourceOpen}
				onOpenChange={(open) => {
					if (!open) sourceAbort.current?.abort();
					if (!pending || sourceAbort.current) setSourceOpen(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.sourceIdentity')}</DialogTitle>
						<DialogDescription>{t('browser.v2.sourceConsent')}</DialogDescription>
					</DialogHeader>
					<Select
						value={sourceId}
						onValueChange={(value) => {
							setSourceId(value);
							setProfileId('');
						}}
					>
						<SelectTrigger aria-label={t('browser.v2.source')}>
							<SelectValue placeholder={t('browser.v2.source')} />
						</SelectTrigger>
						<SelectContent>
							{sources.map((item) => (
								<SelectItem value={item.id} key={item.id}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={profileId} onValueChange={setProfileId}>
						<SelectTrigger aria-label={t('browser.v2.sourceProfile')}>
							<SelectValue placeholder={t('browser.v2.sourceProfile')} />
						</SelectTrigger>
						<SelectContent>
							{sources
								.find((item) => item.id === sourceId)
								?.profiles.map((item) => (
									<SelectItem value={item.id} key={item.id}>
										{item.label}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<DialogFooter>
						{pending && (
							<p role="status" className="text-sm">
								{t('browser.v2.identityReading')}
							</p>
						)}
						<Button
							variant="outline"
							onClick={() => {
								sourceAbort.current?.abort();
								setSourceOpen(false);
							}}
						>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || !sourceId || !profileId} onClick={() => void run(prepareSource)}>
							{t('browser.v2.reviewImport')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={!!saveFrom}
				onOpenChange={(open) => {
					if (!open) cancelManualSave();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.identityExport')}</DialogTitle>
						<DialogDescription>{t('browser.v2.reviewHelp')}</DialogDescription>
					</DialogHeader>
					<Label>
						{t('browser.v2.identityName')}
						<Input
							value={identityName}
							maxLength={120}
							disabled={pending}
							onChange={(event) => setIdentityName(event.target.value)}
						/>
					</Label>
					<label className="flex items-center gap-2 text-sm">
						<Switch
							checked={persist && state.persistence === 'secure'}
							disabled={pending || state.persistence !== 'secure'}
							onCheckedChange={setPersist}
						/>
						{t('browser.v2.persistIdentity')}
					</label>
					<DialogFooter>
						{pending && (
							<p role="status" className="text-sm">
								{t(cancellingSave ? 'browser.v2.identityCancelling' : 'browser.v2.identitySaving')}
							</p>
						)}
						<Button variant="outline" disabled={cancellingSave} onClick={cancelManualSave}>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || !identityName.trim()} onClick={() => void run(saveManualIdentity)}>
							{t('browser.v2.save')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
