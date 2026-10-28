import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowLeftRight, ChevronsDownUp, Link, Loader2, WrapText, X } from 'lucide-react';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { SegmentedControl } from '../../../ui/components/huhu/SettingsFormControls';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../../ui/components/resizable';
import { useVisible } from '../../../ui/react/contexts';
import type { ResolvedComparison, ResolvedEndpoint } from '../core/history';
import { createDiffEditors, type DiffEditors } from './diff-editors';
import { HunkRestoreControls, type HunkRestoreAction } from './HunkRestoreControls';
import { restoreHunks, type HunkDiff } from '../core/hunk-restore';
import { computeDiff, DEFAULT_DIFF_PREFERENCES, DiffLimitError, isCancelled, mapDiffAnchor, type DiffLayout, type DiffModel, type DiffPreferences } from './diff-model';

export interface DiffSurfaceProps {
	comparison: ResolvedComparison;
	initialLayout?: DiffLayout;
	onLayoutChange?: (layout: DiffLayout) => void;
	onClose?: () => void;
	createWorker?: () => Worker;
	preferences?: DiffPreferences;
	onPreferencesChange?: (preferences: DiffPreferences) => void;
	hunkRestore?: HunkRestoreAction;
}

type ComputationState = { id: string; model: DiffModel; hunkValid?: boolean } | { id: string; error: unknown };

/** A read-only source comparison shared by the Git workbench and note revision review. */
export function DiffSurface({ comparison, initialLayout, onLayoutChange, onClose, createWorker, preferences, onPreferencesChange, hunkRestore }: DiffSurfaceProps) {
	const visible = useVisible();
	const [localPreferences, setLocalPreferences] = useState(DEFAULT_DIFF_PREFERENCES);
	const presentation = preferences ?? localPreferences;
	const updatePreferences = (patch: Partial<DiffPreferences>) => {
		const next = { ...presentation, ...patch };
		setLocalPreferences(next);
		onPreferencesChange?.(next);
	};
	const { swapped } = presentation;
	const displayed = swapped ? { ...comparison, left: comparison.right, right: comparison.left } : comparison;
	const [layout, setLayout] = useState<DiffLayout>(initialLayout ?? 'side-by-side');
	const [wrap, setWrap] = useState(true);
	const [collapse, setCollapse] = useState(true);
	const [state, setState] = useState<ComputationState | null>(null);
	const [hunkProof, setHunkProof] = useState<{ id: string; diff: HunkDiff }>();
	const [navigation, setNavigation] = useState({ id: '', index: -1 });
	const [cancelledId, setCancelledId] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);
	const controller = useRef<AbortController | null>(null);
	const mount = useRef<HTMLDivElement>(null);
	const stackedA = useRef<HTMLDivElement>(null), stackedB = useRef<HTMLDivElement>(null);
	const surface = useRef<HTMLElement>(null);
	const manualLayout = useRef(initialLayout !== undefined);
	const editors = useRef<DiffEditors | null>(null);
	const rememberedAnchor = useRef<{ id: string; position: number } | null>(null);
	const requestId = `${comparison.id}:${swapped ? 'reverse' : 'forward'}:${retry}`;
	const leftText = displayed.left.status === 'text' ? displayed.left.snapshot.text : '';
	const rightText = displayed.right.status === 'text' ? displayed.right.snapshot.text : '';
	const result = state?.id === requestId ? state : null;
	const model = result && 'model' in result ? result.model : null;
	const sourceText = comparison.left.status === 'text' ? comparison.left.snapshot.text : '';
	const targetText = comparison.right.status === 'text' ? comparison.right.snapshot.text : '';
	const hasHunkRestore = !!hunkRestore;
	const canonicalDiff = result && 'model' in result && result.hunkValid && hunkProof?.id === comparison.id ? hunkProof.diff : undefined;
	const currentChunk = navigation.id === requestId ? navigation.index : -1;
	const leftLabel = endpointLabel(displayed.left);
	const rightLabel = endpointLabel(displayed.right);
	const cancelled = cancelledId === requestId;
	const makeWorker = useEffectEvent(() => createWorker!());
	const scrollPreference = useEffectEvent(() => presentation.syncScroll);
	const hasWorker = !!createWorker;
	useEffect(() => {
		const element = surface.current;
		const ownerWindow = element?.ownerDocument.defaultView;
		if (!element || !ownerWindow) return;
		const measure = () => {
			if (!manualLayout.current && element.clientWidth > 0)
				setLayout(element.clientWidth < 736 ? 'stacked' : 'side-by-side');
		};
		const observer = new ownerWindow.ResizeObserver(measure);
		observer.observe(element);
		const frame = ownerWindow.requestAnimationFrame(measure);
		return () => {
			observer.disconnect();
			ownerWindow.cancelAnimationFrame(frame);
		};
	}, []);

	useEffect(() => {
		if (!visible || !comparison.canCompare || cancelled) return;
		const abort = new AbortController();
		controller.current = abort;
		void computeDiff(
			{ id: requestId, left: leftText, right: rightText },
			abort.signal,
			hasWorker ? () => makeWorker() : undefined,
		).then(
			(next) => {
				if (abort.signal.aborted) return;
				let hunkValid = false;
				if (hasHunkRestore) {
					const diff = swapped ? { left: next.right, right: next.left, precise: next.precise,
						chunks: next.chunks.map(chunk => ({ fromA: chunk.fromB, toA: chunk.toB, fromB: chunk.fromA, toB: chunk.toA, precise: chunk.precise })) } : next;
					try {
						restoreHunks(sourceText, targetText, diff);
						// Keep canonical selections stable even if reverse diffing groups ambiguous lines differently.
						setHunkProof(previous => previous?.id === comparison.id ? previous : { id: comparison.id, diff });
						hunkValid = true;
					} catch { /* Viewing remains available when selective recovery cannot be proven. */ }
				}
				setState({ id: requestId, model: next, hunkValid });
			},
			(error: unknown) => {
				if (!abort.signal.aborted && !isCancelled(error)) setState({ id: requestId, error });
			},
		);
		return () => {
			abort.abort();
			if (controller.current === abort) controller.current = null;
		};
	}, [requestId, leftText, rightText, comparison.canCompare, comparison.id, visible, hasWorker, cancelled, hasHunkRestore, swapped, sourceText, targetText]);

	useEffect(() => {
		if (!mount.current || !model || !visible || cancelled) return;
		const adapter = createDiffEditors(mount.current, { model, layout, wrap, collapse, leftLabel, rightLabel, syncScroll: scrollPreference(),
			stackedParents: layout === 'stacked' && stackedA.current && stackedB.current ? [stackedA.current, stackedB.current] : undefined });
		editors.current = adapter;
		const remembered = rememberedAnchor.current;
		if (remembered?.id === comparison.id) adapter.revealAnchor(swapped
			? mapDiffAnchor(model.chunks, remembered.position, 'a', model.right.length) : remembered.position);
		return () => {
			rememberedAnchor.current = { id: comparison.id, position: swapped
				? mapDiffAnchor(model.chunks, adapter.anchor(), 'b', model.left.length) : adapter.anchor() };
			adapter.destroy();
			if (editors.current === adapter) editors.current = null;
		};
	}, [model, layout, wrap, collapse, leftLabel, rightLabel, visible, comparison.id, cancelled, swapped]);
	useEffect(() => { editors.current?.setSyncScroll(presentation.syncScroll); }, [presentation.syncScroll]);

	const move = (direction: -1 | 1) => {
		if (!model?.chunks.length) return;
		const next =
			currentChunk < 0
				? direction === 1
					? 0
					: model.chunks.length - 1
				: (currentChunk + direction + model.chunks.length) % model.chunks.length;
		setNavigation({ id: requestId, index: next });
		editors.current?.reveal(next);
	};
	const keyboard = (event: KeyboardEvent) => {
		if (event.nativeEvent.isComposing) return;
		if (event.key === 'F7') {
			event.preventDefault();
			move(event.shiftKey ? -1 : 1);
		}
		if (event.key === 'Escape' && onClose) {
			event.preventDefault();
			onClose();
		}
	};
	const tryAgain = () => {
		setRetry((value) => value + 1);
	};
	return (
		<section
			ref={surface}
			className="huhu-versioning-diff flex h-full min-h-0 min-w-0 flex-col"
			aria-label={t('versioning.diff.title')}
			onKeyDown={keyboard}
		>
			<div
				className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1"
				role="toolbar"
				aria-label={t('versioning.diff.controls')}
			>
				<SegmentedControl<DiffLayout>
					size="sm"
					ariaLabel={t('versioning.diff.layout')}
					value={layout}
					onChange={(next) => {
						manualLayout.current = true;
						setLayout(next);
						onLayoutChange?.(next);
					}}
					options={[
						{ value: 'side-by-side', label: t('versioning.diff.sideBySide') },
						{ value: 'stacked', label: t('versioning.diff.stacked') },
						{ value: 'unified', label: t('versioning.diff.unified') },
					]}
				/>
				<span className="ml-auto flex items-center gap-0.5">
					<ActionButton size="icon-sm" label={t('versioning.diff.swap')} aria-pressed={swapped}
						onClick={() => updatePreferences({ swapped: !swapped })}>
						<ArrowLeftRight />
					</ActionButton>
					<ActionButton size="icon-sm" label={t('versioning.diff.syncScroll')} aria-pressed={presentation.syncScroll}
						disabled={layout === 'unified'} onClick={() => updatePreferences({ syncScroll: !presentation.syncScroll })}>
						<Link />
					</ActionButton>
					<ActionButton
						size="icon-sm"
						label={t('versioning.diff.wrap')}
						aria-pressed={wrap}
						onClick={() => setWrap((value) => !value)}
					>
						<WrapText />
					</ActionButton>
					<ActionButton
						size="icon-sm"
						label={t('versioning.diff.collapse')}
						aria-pressed={collapse}
						onClick={() => setCollapse((value) => !value)}
					>
						<ChevronsDownUp />
					</ActionButton>
					<ActionButton
						size="icon-sm"
						label={t('versioning.diff.previous')}
						disabled={!model?.chunks.length}
						onClick={() => move(-1)}
					>
						<ArrowUp />
					</ActionButton>
					<ActionButton
						size="icon-sm"
						label={t('versioning.diff.next')}
						disabled={!model?.chunks.length}
						onClick={() => move(1)}
					>
						<ArrowDown />
					</ActionButton>
					{onClose && (
						<ActionButton size="icon-sm" label={t('versioning.diff.close')} onClick={onClose}>
							<X />
						</ActionButton>
					)}
				</span>
			</div>
			<div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border bg-muted/20 text-xs">
				<EndpointHeading endpoint={displayed.left} label={leftLabel} side="left" />
				<EndpointHeading endpoint={displayed.right} label={rightLabel} side="right" />
			</div>
			{hunkRestore && <HunkRestoreControls identity={comparison.id} source={sourceText} target={targetText} diff={canonicalDiff} action={hunkRestore}
				reveal={hunk => {
					const position = swapped ? hunk.fromA : hunk.fromB;
					const index = model?.chunks.findIndex(chunk => position >= chunk.fromB && position <= chunk.toB) ?? -1;
					setNavigation({ id: requestId, index }); editors.current?.revealAnchor(position);
				}} />}
			{!comparison.canCompare ? (
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4" role="status">
					<EndpointProblem endpoint={displayed.left} />
					<EndpointProblem endpoint={displayed.right} />
				</div>
			) : cancelled ? (
				<DiffMessage
					message={t('versioning.diff.cancelled')}
					action={
						<Button size="sm" onClick={tryAgain}>
							{t('versioning.retry')}
						</Button>
					}
				/>
			) : result && 'error' in result ? (
				<DiffMessage
					message={diffError(result.error)}
					action={
						<Button size="sm" onClick={tryAgain}>
							{t('versioning.retry')}
						</Button>
					}
				/>
			) : !model ? (
				<DiffMessage
					busy
					message={t('versioning.diff.computing')}
					action={
						<Button
							size="sm"
							onClick={() => {
								controller.current?.abort();
								setCancelledId(requestId);
							}}
						>
							{t('versioning.cancel')}
						</Button>
					}
				/>
			) : (
				<>
					<div
						ref={mount}
						className="huhu-versioning-editors min-h-0 min-w-0 flex-1"
						data-layout={layout}
						data-direction={swapped ? 'reverse' : 'forward'}
						data-comparison-id={comparison.id}
					>
						{layout === 'stacked' && <ResizablePanelGroup direction="vertical" keyboardResizeBy={5}
							onLayout={sizes => {
								const ratio = Math.max(20, Math.min(80, sizes[0] ?? 50));
								if (ratio !== presentation.stackedRatio) updatePreferences({ stackedRatio: ratio });
								for (const view of editors.current?.views ?? []) view.requestMeasure();
							}}>
							<ResizablePanel defaultSize={presentation.stackedRatio} minSize={20} maxSize={80}>
								<div ref={stackedA} className="h-full min-h-0" />
							</ResizablePanel>
							<ResizableHandle withHandle aria-orientation="horizontal" aria-label={t('versioning.diff.resizeStacked')} />
							<ResizablePanel defaultSize={100 - presentation.stackedRatio} minSize={20} maxSize={80}>
								<div ref={stackedB} className="h-full min-h-0" />
							</ResizablePanel>
						</ResizablePanelGroup>}
					</div>
					<div
						className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-1 text-xs text-muted-foreground"
						role="status"
						aria-live="polite"
					>
						<span>
							{comparison.identical
								? t('versioning.diff.identical')
								: !model.chunks.length
									? t('versioning.diff.metadataOnly')
									: currentChunk < 0
										? t('versioning.diff.totalChanges', { count: model.chunks.length })
										: t('versioning.diff.changeCount', {
												current: currentChunk + 1,
												count: model.chunks.length,
											})}
						</span>
						{!model.precise && <span>{t('versioning.diff.approximate')}</span>}
						<span className="ml-auto">{t('versioning.diff.readOnly')}</span>
					</div>
				</>
			)}
		</section>
	);
}

function EndpointHeading({
	endpoint,
	label,
	side,
}: {
	endpoint: ResolvedEndpoint;
	label: string;
	side: 'left' | 'right';
}) {
	return (
		<div className="min-w-0 px-3 py-2" data-endpoint={side}>
			<div className="truncate font-medium" title={label}>
				{label}
			</div>
			<div className="truncate text-muted-foreground" title={endpoint.path}>
				{endpoint.path}
			</div>
			<div className="mt-0.5 truncate text-muted-foreground">{endpointMetadata(endpoint)}</div>
		</div>
	);
}

export function endpointLabel(endpoint: ResolvedEndpoint): string {
	switch (endpoint.ref.kind) {
		case 'commit':
			return t('versioning.diff.commitLabel', { oid: (endpoint.commitOid ?? endpoint.ref.commit).slice(0, 8) });
		case 'tree':
			return t('versioning.diff.treeLabel', { oid: endpoint.ref.tree.slice(0, 8) });
		case 'index':
			return t('versioning.diff.index');
		case 'worktree':
			return t('versioning.diff.worktree');
		case 'editor-buffer':
			return t('versioning.diff.currentSnapshot');
		case 'local-snapshot':
			return t('versioning.diff.checkpoint');
		case 'empty':
			return t('versioning.diff.empty');
	}
}

function endpointMetadata(endpoint: ResolvedEndpoint): string {
	if (endpoint.status === 'missing') return t('versioning.diff.missing');
	if (endpoint.status !== 'text') return t(`versioning.diff.status.${endpoint.status}`);
	const snapshot = endpoint.snapshot;
	return [
		t('versioning.diff.utf8'),
		snapshot.eol.toUpperCase(),
		snapshot.hasBom ? t('versioning.diff.bom') : '',
		!snapshot.endsWithNewline ? t('versioning.diff.noFinalNewline') : '',
	]
		.filter(Boolean)
		.join(' · ');
}

function EndpointProblem({ endpoint }: { endpoint: ResolvedEndpoint }) {
	let message: string;
	switch (endpoint.status) {
		case 'binary':
			message = t('versioning.diff.binary', { bytes: endpoint.byteLength });
			break;
		case 'too-large':
			message = t('versioning.diff.tooLarge', { bytes: endpoint.byteLength, limit: endpoint.limit });
			break;
		case 'error':
			message = t('versioning.diff.endpointError', { code: endpoint.code, message: endpoint.message });
			break;
		default:
			return null;
	}
	return (
		<div className="space-y-1 break-words text-sm">
			<strong>{endpointLabel(endpoint)}</strong>
			<p className="text-muted-foreground">{message}</p>
		</div>
	);
}

function diffError(error: unknown): string {
	if (error instanceof DiffLimitError)
		return t(
			error.reason === 'worker-required' ? 'versioning.diff.workerRequired' : 'versioning.diff.displayLimit',
		);
	return t('versioning.diff.failed', { message: error instanceof Error ? error.message : String(error) });
}

export function DiffMessage({ message, busy, action }: { message: string; busy?: boolean; action?: ReactNode }) {
	return (
		<div
			className="flex min-h-40 min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground"
			role="status"
			aria-live="polite"
			aria-busy={busy}
		>
			{busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
			<p className="max-w-lg break-words">{message}</p>
			{action}
		</div>
	);
}

interface AsyncDiffSurfaceProps extends Omit<DiffSurfaceProps, 'comparison'> {
	identity: string;
	load: (signal: AbortSignal) => Promise<ResolvedComparison>;
}

type LoadState =
	{ id: string; comparison: ResolvedComparison } | { id: string; error: unknown } | { id: string; cancelled: true };

/** Identity-keyed loading never leaves the previous file visible under a new selection. */
export function AsyncDiffSurface({ identity, load, ...props }: AsyncDiffSurfaceProps) {
	const visible = useVisible();
	const [state, setState] = useState<LoadState | null>(null);
	const [attempt, setAttempt] = useState(0);
	const controller = useRef<AbortController | null>(null);
	const id = `${identity}:${attempt}`;
	const current = state?.id === id ? state : null;
	const loadLatest = useEffectEvent(load);
	useEffect(() => {
		if (!visible) return;
		const abort = new AbortController();
		controller.current = abort;
		void loadLatest(abort.signal).then(
			(comparison) => {
				if (!abort.signal.aborted) setState({ id, comparison });
			},
			(error: unknown) => {
				if (!abort.signal.aborted && !isCancelled(error)) setState({ id, error });
			},
		);
		return () => {
			abort.abort();
			if (controller.current === abort) controller.current = null;
		};
	}, [id, visible]);
	if (current && 'comparison' in current) return <DiffSurface {...props} comparison={current.comparison} />;
	if (current && ('error' in current || 'cancelled' in current))
		return (
			<DiffMessage
				message={'cancelled' in current ? t('versioning.diff.cancelled') : diffError(current.error)}
				action={
					<Button size="sm" onClick={() => setAttempt((value) => value + 1)}>
						{t('versioning.retry')}
					</Button>
				}
			/>
		);
	return (
		<DiffMessage
			busy
			message={t('versioning.diff.loading')}
			action={
				<Button
					size="sm"
					onClick={() => {
						controller.current?.abort();
						setState({ id, cancelled: true });
					}}
				>
					{t('versioning.cancel')}
				</Button>
			}
		/>
	);
}
