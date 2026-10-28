import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Copy, History, MoreHorizontal, RefreshCw, RotateCcw } from 'lucide-react';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import type { RestorePlan, RestoreReceipt } from '../../core/restore';
import type { HunkDiff } from '../../core/hunk-restore';
import type { NoteHistoryHost } from './NoteHistoryPanel';
import { Button } from '../../../../ui/components/button';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from '../../../../ui/components/alert-dialog';
import { useT } from '../../../../ui/react/hooks';
import { DiffSurface } from '../DiffSurface';
import { DEFAULT_DIFF_PREFERENCES, type DiffLayout } from '../diff-model';

export interface NoteReviewPageProps {
	id: string;
	host: NoteHistoryHost;
	context: NativeSurfaceContext;
	layout?: DiffLayout;
	onLayoutChange: (layout: DiffLayout) => void;
	createWorker?: () => Worker;
}

export function NoteReviewPage({ id, host, context, layout, onLayoutChange, createWorker }: NoteReviewPageProps) {
	const t = useT();
	const session = useSyncExternalStore(
		useCallback((listener) => host.reviews.subscribe(listener), [host]),
		() => host.reviews.get(id),
	);
	const sync = useSyncExternalStore(
		useCallback((listener) => host.sync.subscribe(listener), [host]),
		() => host.sync.snapshot,
	);
	const sourceContext = useSyncExternalStore(
		useCallback(listener => host.documents.subscribe(listener), [host]),
		() => session ? host.documents.get(session.source.id) : undefined,
	);
	const [preferredLayout, setPreferredLayout] = useState(layout);
	const [preferences, setPreferences] = useState(DEFAULT_DIFF_PREFERENCES);
	const [plan, setPlan] = useState<RestorePlan>();
	const [shownReceipt, setReceipt] = useState<RestoreReceipt>();
	useSyncExternalStore(useCallback(listener => host.automaticHistory?.subscribe(listener) ?? (() => {}), [host]), () => host.automaticHistory?.snapshot);
	const receipt = shownReceipt && (host.restores.receipts().find(item => item.id === shownReceipt.id) ?? shownReceipt);
	const [busy, setBusy] = useState(false),
		[error, setError] = useState('');
	const alive = useRef(false),
		generation = useRef({ value: 0 });
	const offered = useRef<RestorePlan | undefined>(undefined);
	const operation = useRef<'prepare' | 'write' | null>(null);
	const changed = useMemo(() => !session || !sourceContext || host.reviews.isCurrentChanged(session.id), [host, session, sourceContext]);
	const comparison = session?.comparison;
	const candidate = session?.mode === 'current' ? comparison?.left : comparison?.right;
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	useEffect(() => {
		generation.current.value++;
		setPlan(undefined);
		if (operation.current !== 'write') {
			operation.current = null;
			setBusy(false);
		}
		const currentGeneration = generation.current;
		return () => {
			currentGeneration.value++;
			// cancel only removes unsubmitted plans; an admitted write finishes its journal independently.
			if (offered.current) host.restores.cancel(offered.current.id);
			offered.current = undefined;
		};
	}, [host, id, comparison?.id]);
	const errorText = (value: unknown) => {
		const message = value instanceof Error ? value.message : 'review.restoreError';
		const separator = message.indexOf(': ');
		return message.startsWith('versioning.') && separator > 0
			? `${t(message.slice(0, separator))} · ${message.slice(separator + 2)}`
			: t(message);
	};
	const prepare = async (mode: 'replace-current' | 'create-copy', hunks?: { diff: HunkDiff; selected: readonly string[] }) => {
		if (!session || candidate?.status !== 'text' || operation.current) return;
		operation.current = 'prepare';
		const token = generation.current.value;
		setBusy(true);
		setError('');
		try {
			if (hunks && (mode !== 'replace-current' || session.mode !== 'current' || !session.restoreTarget
				|| sourceContext?.id !== session.source.id || sourceContext.generation !== session.source.generation)) throw new Error('versioning.restore.changed');
			if (mode === 'replace-current' && host.reviews.isCurrentChanged(id))
				throw new Error('versioning.restore.changed');
			const next = await host.restores.prepare({
				source: {
					id: candidate.id,
					text: candidate.snapshot.text,
					label: session.selected.subject || candidate.label,
				},
				targetPath: session.source.path,
				originLeafId: session.source.leafId,
				mode,
				...(hunks ? { hunks: { ...hunks, target: session.restoreTarget!, origin: session.source } } : {}),
			});
			if (
				!alive.current ||
				generation.current.value !== token ||
				host.reviews.get(id)?.comparison?.id !== comparison?.id
			) {
				host.restores.cancel(next.id);
				return;
			}
			if (mode === 'replace-current' && next.beforeText !== session.buffer.text) {
				host.restores.cancel(next.id);
				throw new Error('versioning.restore.changed');
			}
			offered.current = next;
			setPlan(next);
		} catch (failure) {
			if (alive.current && generation.current.value === token) setError(errorText(failure));
		} finally {
			if (alive.current && generation.current.value === token) {
				operation.current = null;
				setBusy(false);
			}
		}
	};
	const cancel = () => {
		if (operation.current) return;
		if (offered.current) host.restores.cancel(offered.current.id);
		offered.current = undefined;
		setPlan(undefined);
	};
	const apply = async () => {
		if (!plan || operation.current || offered.current?.id !== plan.id) return;
		if (host.reviews.get(id)?.comparison?.id !== comparison?.id) {
			cancel();
			return;
		}
		operation.current = 'write';
		setBusy(true);
		setError('');
		try {
			const result = await host.restores.apply(plan.id);
			if (alive.current) setReceipt(result);
		} catch (failure) {
			if (alive.current) setError(errorText(failure));
		} finally {
			host.restores.cancel(plan.id);
			offered.current = undefined;
			operation.current = null;
			if (alive.current) {
				setPlan(undefined);
				setBusy(false);
			}
		}
	};
	const undo = async () => {
		if (!receipt || operation.current) return;
		operation.current = 'write';
		setBusy(true);
		setError('');
		try {
			const result = await host.restores.undo(receipt.id);
			if (alive.current) setReceipt(result);
		} catch (failure) {
			if (alive.current) setError(errorText(failure));
		} finally {
			operation.current = null;
			if (alive.current) setBusy(false);
		}
	};
	const run = (work: () => Promise<unknown>) => {
		setError('');
		void work().catch((failure: unknown) => {
			if (alive.current) setError(errorText(failure));
		});
	};

	if (!session)
		return (
			<div className="flex h-full flex-col items-start justify-center gap-3 p-6 text-sm text-muted-foreground">
				<History className="size-6" />
				<p>{t('review.expired')}</p>
				<Button
					variant="outline"
					onClick={() => {
						void context.close();
					}}
				>
					{t('workbench.closePage')}
				</Button>
			</div>
		);
	return (
		<section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label={t('review.title')}>
			<header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
				<Button variant="ghost" size="sm" onClick={() => run(() => host.documents.returnTo(session.source.id))}>
					<ArrowLeft className="size-4" />
					{t('review.return')}
				</Button>
				<span className="min-w-0 flex-1 truncate text-sm font-medium" title={session.source.path}>
					{session.source.path.split('/').at(-1)}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={busy || !host.sync.ready || candidate?.status !== 'text'}
					onClick={() => {
						void prepare('create-copy');
					}}
				>
					<Copy className="size-4" />
					{t('review.copy')}
				</Button>
				<Button
					size="sm"
					disabled={busy || !host.sync.ready || changed || candidate?.status !== 'text'}
					onClick={() => {
						void prepare('replace-current');
					}}
				>
					<RotateCcw className="size-4" />
					{t('review.restore')}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					aria-label={t('workbench.more')}
					onClick={(event) => context.openPageMenu?.(event.nativeEvent)}
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</header>
			<p className="shrink-0 border-b px-3 py-2 text-xs text-muted-foreground">{t('history.bufferCaptured', { time: new Date(session.bufferCapturedAt).toLocaleString() })}</p>
			{candidate?.status === 'text' && <p className="shrink-0 border-b px-3 py-2 text-xs text-muted-foreground">{t('review.restoreSource', { source: session.selected.subject || candidate.label })}</p>}
			{!host.sync.ready && <p role="status" className="shrink-0 px-3 py-2 text-xs text-muted-foreground">{t('history.localReadOnly')}</p>}
			{changed && (
				<div
					className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs"
					role="status"
				>
					<span className="min-w-0 flex-1">{t('review.changed')}</span>
					<Button
						variant="ghost"
						size="sm"
						disabled={busy}
						onClick={() => run(() => host.reviews.refreshCurrent(id))}
					>
						<RefreshCw className="size-4" />
						{t('review.refreshCurrent')}
					</Button>
				</div>
			)}
			{sync.device.restoreHold && (
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs" role="status">
					<span className="min-w-0 flex-1">{t('review.syncHold')}</span>
					<Button
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => run(() => host.sync.acknowledgeRestore())}
					>
						{t('review.acknowledge')}
					</Button>
				</div>
			)}
			{receipt && (
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs" role="status">
					<span className="min-w-0 flex-1">
						{t(receipt.undoOf ? 'review.undoDone' : 'review.restored')} · {receipt.path}
						{receipt.selectedHunks && <span> · {t('review.hunks.receipt', { count: receipt.selectedHunks.length })}</span>}
					</span>
					{receipt.objectsReleasedAt !== undefined && <span>{t('review.checkpointReleased')}</span>}
					{!receipt.undoOf && !receipt.undoneBy && receipt.objectsReleasedAt === undefined && (
						<Button
							variant="outline"
							size="sm"
							disabled={busy}
							onClick={() => {
								void undo();
							}}
						>
							{t('review.undo')}
						</Button>
					)}
				</div>
			)}
			{error && (
				<p role="alert" className="m-0 shrink-0 break-words border-b px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			)}
			{busy && (
				<p role="status" className="m-0 shrink-0 px-3 py-2 text-xs text-muted-foreground">
					{t(plan ? 'review.restoring' : 'review.prepare')}
				</p>
			)}
			<div className="min-h-0 flex-1 overflow-hidden">
				{session.phase === 'loading' && (
					<p role="status" className="p-4 text-sm text-muted-foreground">
						{t('review.loading')}
					</p>
				)}
				{session.phase === 'error' && (
					<div role="alert" className="flex flex-col items-start gap-3 p-4">
						<p className="text-sm text-destructive">{t('review.error')}</p>
						<p className="break-words text-xs text-muted-foreground">{session.error}</p>
						<Button variant="outline" onClick={() => run(() => host.reviews.retry(id))}>
							{t('history.retry')}
						</Button>
					</div>
				)}
				{session.phase === 'ready' && comparison && (
					<DiffSurface
						comparison={comparison}
						initialLayout={preferredLayout}
						preferences={preferences}
						onPreferencesChange={setPreferences}
						hunkRestore={{ busy, reason: !host.sync.ready ? 'history.localReadOnly' : session.mode !== 'current' ? 'review.hunks.currentOnly'
							: changed || sourceContext?.generation !== session.source.generation || !session.restoreTarget ? 'review.hunks.refresh' : undefined,
							prepare: draft => { void prepare('replace-current', draft); } }}
						onLayoutChange={(next) => {
							setPreferredLayout(next);
							onLayoutChange(next);
						}}
						createWorker={createWorker}
					/>
				)}
			</div>
			<AlertDialog
				open={!!plan}
				onOpenChange={(open) => {
					if (!open) cancel();
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t(plan?.selectedHunks ? 'review.hunks.title' : plan?.mode === 'create-copy' ? 'review.copyTitle' : 'review.restoreTitle')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(plan?.mode === 'create-copy' ? 'review.copyDescription' : 'review.restoreDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<dl className="m-0 grid gap-2 text-sm">
						<dt className="text-muted-foreground">{t('review.target')}</dt>
						<dd className="m-0 break-all font-medium">{plan?.path}</dd>
						<dt className="text-muted-foreground">{t('review.source')}</dt>
						<dd className="m-0 break-words">{plan?.sourceLabel}</dd>
					</dl>
					<ol className="m-0 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
						<li>{t('review.checkpointStep')}</li>
						<li>{t('review.revalidateStep')}</li>
						<li>{t('review.verifyStep')}</li>
					</ol>
					{plan?.dirty && <p className="m-0 text-sm text-muted-foreground">{t('review.dirty')}</p>}
					{plan?.selectedHunks && <p className="m-0 text-sm">{t('review.hunks.confirm', { count: plan.selectedHunks.length })}</p>}
					<p className="m-0 text-xs text-muted-foreground">{t('review.syncWillHold')}</p>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy} onClick={cancel}>
							{t('review.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={busy}
							onClick={(event) => {
								event.preventDefault();
								void apply();
							}}
						>
							{t(busy ? 'review.restoring' : 'review.confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
