import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { GitCommitHorizontal, History, MoreHorizontal, Pin, PinOff, RefreshCw } from 'lucide-react';
import type { EditorDocumentContext } from '../../../../app/contracts/editor-context';
import type { FileHistoryEntry, HistoryCursor } from '../../core/history';
import type { NoteHistoryHost } from '../../services/history-host';
export type { NoteHistoryHost } from '../../services/history-host';
import { Button } from '../../../../ui/components/button';
import { ActionButton } from '../../../../ui/components/huhu/ActionButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { DesignScope } from '../../../../ui/react/design-scope';
import { Input } from '../../../../ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { useVisible } from '../../../../ui/react/contexts';
import { useLanguage, useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { ChoiceList } from '../VersioningNavigator';

interface HistoryListState {
	identity: string;
	phase: 'loading' | 'ready' | 'error';
	entries: readonly FileHistoryEntry[];
	cursor?: HistoryCursor;
	error?: string;
}

/** One content region: every state, overlay and notice below belongs to this scope. */
export function NoteHistoryPanel({ host }: { host: NoteHistoryHost }) {
	return (
		<DesignScope className="flex h-full min-h-0 flex-col" data-note-history>
			<NoteHistoryContent host={host} />
		</DesignScope>
	);
}

function NoteHistoryContent({ host }: { host: NoteHistoryHost }) {
	const titleId = useId(), visible = useVisible();
	const t = useT(),
		locale = useLanguage(),
		win = useOwnerWindow();
	const [pinned, setPinned] = useState<EditorDocumentContext>();
	const document = useSyncExternalStore(
		useCallback((listener) => host.documents.subscribe(listener), [host]),
		() => (pinned ? host.documents.get(pinned.id) : host.documents.current(win)),
	);
	const snapshot = useSyncExternalStore(
		useCallback((listener) => host.sync.subscribe(listener), [host]),
		() => host.sync.snapshot,
	);
	const [receiptRevision, setReceiptRevision] = useState(0);
	const automatic = useSyncExternalStore(
		useCallback((listener) => host.automaticHistory?.subscribe(listener) ?? (() => {}), [host]),
		() => host.automaticHistory?.snapshot,
	);
	const [, setReviewRevision] = useState(0);
	useEffect(() => host.restores.subscribe(() => setReceiptRevision((value) => value + 1)), [host]);
	useEffect(() => host.reviews.subscribe(() => setReviewRevision((value) => value + 1)), [host]);
	const documentId = document?.id,
		documentPath = document?.path;
	const [preferredSource, setSource] = useState('git'),
		[reference, setReference] = useState('HEAD'),
		[draftReference, setDraftReference] = useState('');
	const source =
		preferredSource === 'git' && !host.sync.ready && host.queries.localHistory ? 'local' : preferredSource;
	const [refresh, setRefresh] = useState(0),
		[actionError, setActionError] = useState('');
	const identity = JSON.stringify([
		document?.id,
		snapshot.place?.root,
		snapshot.status?.head,
		source,
		reference,
		refresh,
		source === 'checkpoints' ? receiptRevision : 0,
		source !== 'git' ? automatic?.revision : 0,
	]);
	const currentIdentity = useRef(identity),
		selection = useRef({ value: 0 });
	const request = useRef<AbortController | null>(null);
	const [list, setList] = useState<HistoryListState>({ identity: '', phase: 'loading', entries: [] });
	const path = document ? (source === 'git' ? snapshot.place?.toRepo(document.path) : document.path) : null;

	const [endpointA, setEndpointA] = useState<{ document: string; entry: FileHistoryEntry }>();
	const endpointDocument = JSON.stringify([documentId, documentPath]);
	const chooseEndpoint = (entry: FileHistoryEntry, side: 'a' | 'b') => {
		if (!documentId) return;
		const token = ++selection.current.value;
		setActionError('');
		void (async () => {
			const revision = entry.id.startsWith('current-editor:') ? entry : await materialize(entry);
			if (selection.current.value !== token || !host.documents.get(documentId)) return;
			if (side === 'a') {
				setEndpointA({ document: endpointDocument, entry: revision });
				await host.reviews.openVersion(documentId, revision);
			} else {
				const baseline =
					endpointA?.document === endpointDocument
						? endpointA.entry
						: host.reviews.forDocument(documentId)?.selected;
				if (!baseline) return;
				await host.reviews.openVersion(documentId, baseline);
				if (selection.current.value !== token) return;
				const review = host.reviews.forDocument(documentId);
				if (review) await host.reviews.compareWith(review.id, revision);
			}
		})().catch((error) => {
			if (selection.current.value === token)
				setActionError(t(error instanceof Error ? error.message : 'history.error'));
		});
	};
	const chooseCurrent = (side: 'a' | 'b', capturedAt: number) => {
		if (!documentId || !documentPath) return;
		const existing = host.reviews.forDocument(documentId);
		const captured = existing
			? { context: existing.source, text: existing.buffer.text }
			: host.documents.capture(documentId);
		const id = `current-editor:${documentId}:${captured.context.generation}`;
		chooseEndpoint(
			{
				id,
				commitOid: '',
				parents: [],
				author: '',
				time: (existing?.bufferCapturedAt ?? capturedAt) / 1000,
				subject: t('versioning.diff.currentSnapshot'),
				pathAtRevision: documentPath,
				status: 'M',
				ref: { kind: 'local-snapshot', path: documentPath, snapshotId: id, text: captured.text },
			},
			side,
		);
	};
	const materialize = async (entry: FileHistoryEntry): Promise<FileHistoryEntry> =>
		entry.ref.kind !== 'local-snapshot'
			? entry
			: {
					...entry,
					ref: {
						...entry.ref,
						text:
							source === 'local'
								? await host.queries.readLocalSnapshot!(entry.ref.snapshotId)
								: await host.restores.readSnapshot(entry.ref.snapshotId),
					},
				};
	useEffect(() => {
		currentIdentity.current = identity;
		const selectedRequest = selection.current;
		return () => {
			currentIdentity.current = '';
			selectedRequest.value++;
			request.current?.abort();
		};
	}, [identity]);
	const openEntry = (entry: FileHistoryEntry, mode: 'current' | 'change' | 'pair' = 'current') => {
		if (!documentId) return;
		const token = ++selection.current.value;
		const selectedReview = host.reviews.forDocument(documentId);
		setActionError('');
		void (async () => {
			const revision = await materialize(entry);
			if (
				selection.current.value !== token ||
				currentIdentity.current !== identity ||
				!host.documents.get(documentId)
			)
				return;
			if (mode === 'pair') {
				if (selectedReview && host.reviews.forDocument(documentId) === selectedReview)
					await host.reviews.compareWith(selectedReview.id, revision);
			} else await host.reviews.openVersion(documentId, revision, mode);
		})().catch((error: unknown) => {
			if (selection.current.value === token && currentIdentity.current === identity)
				setActionError(t(error instanceof Error ? error.message : 'history.error'));
		});
	};

	useEffect(() => {
		request.current?.abort();
		if (!visible || !documentId || !documentPath || (source === 'git' && !host.sync.ready) || path == null) return;
		const controller = new AbortController();
		request.current = controller;
		const load = async () => {
			if (source === 'local') {
				const entries = (await host.queries.localHistory?.(documentPath, controller.signal)) ?? [];
				if (!controller.signal.aborted) setList({ identity, phase: 'ready', entries });
			} else if (source === 'checkpoints') {
				await host.restores.initialize();
				const entries: FileHistoryEntry[] = [];
				for (const receipt of host.restores
					.receipts()
					.filter((item) => item.path === documentPath && item.objectsReleasedAt === undefined)) {
					if (!receipt.beforeObject) continue;
					if (controller.signal.aborted) return;
					// The checkpoint body is loaded only on selection, never for every visible metadata row.
					entries.push({
						id: receipt.id,
						commitOid: '',
						parents: [],
						author: '',
						time: receipt.createdAt / 1000,
						subject: `${t('history.checkpoint')} · ${receipt.sourceLabel}`,
						pathAtRevision: path,
						status: 'M',
						ref: { kind: 'local-snapshot', path, text: '', snapshotId: receipt.beforeObject },
					});
				}
				if (!controller.signal.aborted) setList({ identity, phase: 'ready', entries });
			} else {
				const page = await host.queries.fileHistory(path, {
					ref: reference,
					limit: 50,
					signal: controller.signal,
				});
				if (!controller.signal.aborted)
					setList({ identity, phase: 'ready', entries: page.entries, cursor: page.nextCursor });
			}
		};
		void load().catch((error: unknown) => {
			if (!controller.signal.aborted)
				setList({
					identity,
					phase: 'error',
					entries: [],
					error: error instanceof Error ? error.message : t('history.error'),
				});
		});
		return () => controller.abort();
	}, [host, identity, documentId, documentPath, path, source, reference, t, visible]);

	const loadMore = () => {
		if (!list.cursor || path == null || list.identity !== identity) return;
		const controller = new AbortController();
		request.current?.abort();
		request.current = controller;
		const captured = list;
		setList({ ...captured, phase: 'loading' });
		void host.queries.fileHistory(path, { cursor: captured.cursor, limit: 50, signal: controller.signal }).then(
			(page) => {
				if (!controller.signal.aborted && currentIdentity.current === identity)
					setList({
						identity,
						phase: 'ready',
						entries: [...captured.entries, ...page.entries],
						cursor: page.nextCursor,
					});
			},
			(error: unknown) => {
				if (!controller.signal.aborted && currentIdentity.current === identity)
					setList({
						...captured,
						phase: 'error',
						error: error instanceof Error ? error.message : t('history.error'),
					});
			},
		);
	};
	const entries = list.identity === identity ? list.entries : [];
	const selected = document ? host.reviews.forDocument(document.id)?.selected.id : undefined;
	const date = (time: number) =>
		new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(time * 1000);

	if (!document)
		return (
			<div className="space-y-3 p-4 text-sm text-muted-foreground">
				<p>{t(pinned ? 'history.sourceClosed' : 'history.noNote')}</p>
				{pinned && (
					<Button variant="secondary" onClick={() => setPinned(undefined)}>
						{t('history.unpin')}
					</Button>
				)}
			</div>
		);
	if (!host.sync.ready && source === 'git')
		return (
			<div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
				<p>{t('history.noRepository')}</p>
				<Button variant="secondary" onClick={() => host.openSettings()}>
					{t('history.settings')}
				</Button>
			</div>
		);
	if (path == null) return <p className="p-4 text-sm text-muted-foreground">{t('versioning.outside-repository')}</p>;
	return (
		<section
			className="flex min-h-0 flex-1 flex-col text-sm"
			aria-labelledby={titleId}
			aria-busy={list.identity !== identity || list.phase === 'loading' || undefined}
		>
			<h2 id={titleId} className="sr-only">
				{t('history.title')}
			</h2>
			<header className="flex shrink-0 items-center gap-1 px-3 py-2">
				<History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="min-w-0 flex-1 truncate font-medium">{document.path.split('/').at(-1)}</span>
					</TooltipTrigger>
					<TooltipContent className="break-all">{document.path}</TooltipContent>
				</Tooltip>
				<ActionButton
					className="size-8"
					label={t(pinned ? 'history.unpin' : 'history.pin')}
					onClick={() => setPinned(pinned ? undefined : document)}
				>
					{pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
				</ActionButton>
				<ActionButton
					className="size-8"
					label={t('history.refresh')}
					onClick={() => setRefresh((value) => value + 1)}
				>
					<RefreshCw className="size-4" />
				</ActionButton>
			</header>
			<div className="flex shrink-0 flex-col gap-2 border-b px-3 pb-3">
				<Select value={source} onValueChange={setSource}>
					<SelectTrigger className="w-full" aria-label={t('history.source')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="git" disabled={!host.sync.ready}>
							{t('history.git')}
						</SelectItem>
						{host.queries.localHistory && <SelectItem value="local">{t('history.local')}</SelectItem>}
						<SelectItem value="checkpoints">{t('history.checkpoints')}</SelectItem>
					</SelectContent>
				</Select>
				{source === 'git' && (
					<form
						className="flex min-w-0 gap-1"
						onSubmit={(event) => {
							event.preventDefault();
							setReference(draftReference.trim() || 'HEAD');
						}}
					>
						<Input
							value={draftReference}
							onChange={(event) => setDraftReference(event.target.value)}
							placeholder={t('history.currentBranch')}
							aria-label={t('history.ref')}
						/>
						<Button type="submit" variant="ghost" size="icon-md" aria-label={t('history.loadRef')}>
							<GitCommitHorizontal className="size-4" />
						</Button>
					</form>
				)}
			</div>
			{automatic && (
				<div
					className="space-y-1 border-b px-3 py-2 text-xs"
					role={automatic.phase === 'error' ? 'alert' : 'status'}
				>
					<p>{t(automatic.enabled ? 'history.localEnabled' : 'history.localDisabled')}</p>
					{automatic.phase === 'error' && (
						<p className="text-destructive">{t(automatic.error ?? 'versioning.localHistory.failed')}</p>
					)}
					<Button variant="ghost" size="sm" onClick={() => host.openSettings()}>
						{t('history.settings')}
					</Button>
				</div>
			)}
			{actionError && (
				<p role="alert" className="m-0 px-3 py-2 text-xs text-destructive">
					{actionError}
				</p>
			)}
			<div className="flex flex-wrap items-center gap-1 border-y px-2 py-1 text-xs">
				<span className="min-w-0 flex-1 truncate">{t('versioning.diff.currentSnapshot')}</span>
				<Button
					size="sm"
					variant="ghost"
					aria-label={t('versioning.compare.currentA')}
					aria-pressed={
						endpointA?.document === endpointDocument && endpointA.entry.id.startsWith('current-editor:')
					}
					onClick={(event) => chooseCurrent('a', win.performance.timeOrigin + event.timeStamp)}
				>
					A
				</Button>
				<Button
					size="sm"
					variant="ghost"
					aria-label={t('versioning.compare.currentB')}
					aria-pressed={
						host.reviews.forDocument(document.id)?.mode === 'pair' &&
						!!host.reviews.forDocument(document.id)?.selected.id.startsWith('current-editor:')
					}
					disabled={!endpointA && !host.reviews.forDocument(document.id)}
					onClick={(event) => chooseCurrent('b', win.performance.timeOrigin + event.timeStamp)}
				>
					B
				</Button>
			</div>
			<ChoiceList
				key={identity}
				items={entries}
				rowHeight={56}
				itemKey={(entry) => entry.id}
				selected={selected ?? null}
				label={t('history.title')}
				itemLabel={(entry) =>
					`${entry.subject || t(source === 'local' ? 'history.local' : 'history.checkpoint')} · ${date(entry.time)} · ${entry.pathAtRevision}`
				}
				onSelect={(entry) => openEntry(entry)}
				renderItem={(entry) => (
					<span className="flex min-w-0 flex-1 flex-col gap-1">
						<span className="truncate text-[13px]">
							{source === 'checkpoints'
								? t('history.checkpoint')
								: entry.subject ||
									(source === 'local' ? t('history.local') : entry.commitOid.slice(0, 8))}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{date(entry.time)}
							{entry.author ? ` · ${entry.author}` : ''}
							{entry.status === 'D' ? ` · ${t('history.deleted')}` : ''}
						</span>
					</span>
				)}
				actions={(entry) => (
					<>
						<Button
							size="sm"
							variant="ghost"
							aria-label={t('versioning.compare.setA', { oid: entry.subject || date(entry.time) })}
							aria-pressed={endpointA?.document === endpointDocument && endpointA.entry.id === entry.id}
							onClick={() => chooseEndpoint(entry, 'a')}
						>
							A
						</Button>
						<Button
							size="sm"
							variant="ghost"
							aria-label={t('versioning.compare.setB', { oid: entry.subject || date(entry.time) })}
							aria-pressed={
								host.reviews.forDocument(document.id)?.mode === 'pair' &&
								host.reviews.forDocument(document.id)?.selected.id === entry.id
							}
							disabled={!endpointA && !host.reviews.forDocument(document.id)}
							onClick={() => chooseEndpoint(entry, 'b')}
						>
							B
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-md"
									className="mr-1 size-8 shrink-0"
									aria-label={t('history.versionActions')}
								>
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem onSelect={() => openEntry(entry)}>
									{t('history.compare')}
								</DropdownMenuItem>
								{source === 'git' && (
									<DropdownMenuItem onSelect={() => openEntry(entry, 'change')}>
										{t('history.change')}
									</DropdownMenuItem>
								)}
								{host.reviews.forDocument(document.id) && (
									<DropdownMenuItem onSelect={() => openEntry(entry, 'pair')}>
										{t('history.pair')}
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				)}
			/>
			<div className="shrink-0">
				{(list.identity !== identity || list.phase === 'loading') && (
					<p role="status" className="px-3 py-4 text-xs text-muted-foreground">
						{t('history.loading')}
					</p>
				)}
				{list.identity === identity && list.phase === 'ready' && !entries.length && (
					<p className="px-3 py-4 text-sm text-muted-foreground">
						{t(
							source === 'git'
								? 'history.empty'
								: source === 'local'
									? 'history.emptyLocal'
									: 'history.emptyCheckpoints',
						)}
					</p>
				)}
				{list.identity === identity && list.phase === 'error' && (
					<div role="alert" className="flex flex-col gap-2 p-3">
						<p className="text-sm text-destructive">{t('history.error')}</p>
						<p className="break-words text-xs text-muted-foreground">{list.error}</p>
						<Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
							{t('history.retry')}
						</Button>
					</div>
				)}
				{list.cursor && list.phase === 'ready' && (
					<Button className="m-2" variant="ghost" onClick={loadMore}>
						{t('history.loadMore')}
					</Button>
				)}
			</div>
		</section>
	);
}
