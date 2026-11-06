import { useDensityRowHeight } from '../../../ui/react/use-density';
import type { CSSProperties } from 'react';
import { selectedText } from './diff/selection';
import { useDiffPreferences } from './diff/use-diff-preferences';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { Loader2, Copy } from 'lucide-react';
import type { FileDiffMetadata, SelectedLineRange } from '@pierre/diffs';
import { DIFF_UNSAFE_CSS } from './diff/theme';
import { FileDiff } from '@pierre/diffs/react';
import { t } from '../../../shared/i18n';
import { Button } from '../../../ui/components/button';
import { useOwnerDocument, useVisible } from '../../../ui/react/contexts';
import type { ResolvedComparison, ResolvedEndpoint } from '../core/history';
import { HunkRestoreControls, type HunkRestoreAction } from './HunkRestoreControls';
import type { HunkDiff } from '../core/hunk-restore';
import { hunkProof } from './diff/hunk-proof';
import { isCancelled, type DiffLayout, type DiffPreferences } from './diff/preferences';
import { parseComparison, RENDER_THRESHOLD } from './diff/parse';
import { endpointFile } from './diff/endpoint';
import { DiffOwner } from './diff/owner-pool';
import { bindGutterKeyboard, unbindGutterKeyboard } from './diff/keyboard';

import { DiffToolbar } from './diff/DiffToolbar';
import { GitHunkControls, type GitHunkActions } from './diff/GitHunkControls';

export interface DiffSurfaceProps {
	openWorktree?: (path: string, repositoryId: string) => Promise<void>;
	gitHunks?: GitHunkActions;
	comparison: ResolvedComparison;
	initialLayout?: DiffLayout;
	onLayoutChange?: (layout: DiffLayout) => void;
	onClose?: () => void;
	createWorker?: () => Worker;
	preferences?: DiffPreferences;
	onPreferencesChange?: (preferences: DiffPreferences) => void;
	hunkRestore?: HunkRestoreAction;
}

/** Every Git and note-history entry uses the same complete metadata, owner pool and selection surface. */
export function DiffSurface({
	comparison,
	initialLayout,
	onLayoutChange,
	onClose,
	createWorker,
	preferences,
	onPreferencesChange,
	hunkRestore,
	gitHunks,
	openWorktree,
}: DiffSurfaceProps) {
	const document = useOwnerDocument();
	const visible = useVisible();
	const [local, setLocal] = useDiffPreferences();
	const p = preferences ?? local;
	const update = (patch: Partial<DiffPreferences>) => {
		const next = { ...p, ...patch };
		if (onPreferencesChange) onPreferencesChange(next);
		else setLocal(next);
	};
	const layout = p.layout ?? initialLayout ?? 'side-by-side';
	const [narrow, setNarrow] = useState(false);
	const [state, setState] = useState<{
		id: string;
		metadata?: FileDiffMetadata;
		display?: FileDiffMetadata;
		proof?: HunkDiff;
		error?: unknown;
	}>();
	const [cancelled, setCancelled] = useState<string>();
	const [forced, setForced] = useState<string>();
	const [retry, setRetry] = useState(0);
	const [copyError, setCopyError] = useState('');
	const [selection, setSelection] = useState<SelectedLineRange | null>(null);
	const [index, setIndex] = useState(-1);
	const surface = useRef<HTMLElement>(null);
	const rowHeight = useDensityRowHeight(surface);
	const abort = useRef<AbortController | undefined>(undefined);
	const worker = useEffectEvent(() => createWorker!());
	const hasWorker = !!createWorker;
	const id = `${comparison.id}:${p.swapped}:${retry}`;
	const [selectedIdentity, setSelectedIdentity] = useState(id);
	if (selectedIdentity !== id) {
		setSelectedIdentity(id);
		setSelection(null);
		setCopyError('');
		setIndex(-1);
	}
	const result = state?.id === id ? state : undefined;
	const metadata = result?.metadata;
	const painted = result?.display;
	const source = comparison.left.status === 'text' ? comparison.left.snapshot.text : '';
	const target = comparison.right.status === 'text' ? comparison.right.snapshot.text : '';
	const needsProof = !!(hunkRestore || gitHunks);
	const tooLarge = source.length + target.length > RENDER_THRESHOLD && forced !== comparison.id;
	const displayLayout = narrow ? 'stacked' : layout;
	useEffect(() => {
		const node = surface.current,
			owner = node?.ownerDocument.defaultView;
		if (!node || !owner) return;
		const measure = () => setNarrow((node.closest('[data-huhu-leaf]')?.clientWidth ?? node.clientWidth) < 600);
		const observer = new owner.ResizeObserver(measure);
		observer.observe(node);
		measure();
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (!visible || !comparison.canCompare || tooLarge || cancelled === id) return;
		const controller = new AbortController();
		abort.current = controller;
		const oldFile = endpointFile(comparison.left),
			newFile = endpointFile(comparison.right);
		if (!oldFile && !newFile) return;
		void parseComparison(oldFile, newFile, controller.signal, hasWorker ? () => worker() : undefined).then(
			async (next) => {
				try {
					const display = p.swapped
						? await parseComparison(
								newFile,
								oldFile,
								controller.signal,
								hasWorker ? () => worker() : undefined,
							)
						: next;
					let proof: HunkDiff | undefined;
					if (needsProof) {
						try {
							proof = hunkProof(source, target, next);
						} catch {
							/* Unprovable hunks remain read only. */
						}
					}
					if (!controller.signal.aborted) setState({ id, metadata: next, display, proof });
				} catch (error) {
					if (!controller.signal.aborted && !isCancelled(error)) setState({ id, error });
				}
			},
			(error) => {
				if (!controller.signal.aborted && !isCancelled(error)) setState({ id, error });
			},
		);
		return () => controller.abort();
	}, [comparison, id, visible, tooLarge, cancelled, hasWorker, p.swapped, needsProof, source, target]);
	const proof = result?.proof;
	const displayed = p.swapped ? { left: comparison.right, right: comparison.left } : comparison;
	const move = (direction: number) => {
		if (!metadata?.hunks.length) return;
		const next = (index + direction + metadata.hunks.length) % metadata.hunks.length;
		setIndex(next);
		const header = surface.current?.querySelector<HTMLElement>(`[data-huhu-hunk-header="${next}"]`);
		if (header) {
			header.tabIndex = -1;
			header.focus();
			header.scrollIntoView({ block: 'nearest' });
		}
	};
	const copy = async (position: boolean) => {
		if (!selection) return;
		const endpoint = selection.side === 'deletions' ? displayed.left : displayed.right;
		if (endpoint.status !== 'text') return;
		const from = Math.min(selection.start, selection.end),
			to = Math.max(selection.start, selection.end);
		const text = selectedText(endpoint.snapshot.text, selection);
		if (text === null) return;
		const value = position ? `${endpoint.path}:${from}${to === from ? '' : `-${to}`}` : text;
		try {
			await document.defaultView?.navigator.clipboard.writeText(value);
			setCopyError('');
		} catch {
			setCopyError(t('versioning.diff.copyFailed'));
		}
	};
	return (
		<section
			ref={surface}
			style={{ '--diffs-line-height': `${rowHeight}px` } as CSSProperties}
			className="huhu-versioning-diff flex h-full min-h-0 min-w-0 flex-col"
			aria-label={t('versioning.diff.title')}
			data-narrow={narrow}
			onKeyDown={(event) => {
				if (event.nativeEvent.isComposing) return;
				if (event.key === 'F7') {
					event.preventDefault();
					move(event.shiftKey ? -1 : 1);
				}
				if (event.key === 'Escape' && onClose) {
					event.preventDefault();
					onClose();
				}
			}}
		>
			<DiffToolbar
				preferences={p}
				update={(patch) => {
					update(patch);
					if (patch.layout) onLayoutChange?.(patch.layout);
				}}
				layout={displayLayout}
				narrow={narrow}
				count={metadata?.hunks.length ?? 0}
				onMove={move}
				onClose={onClose}
			/>
			<div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border text-xs">
				<EndpointHeading endpoint={displayed.left} label={endpointLabel(displayed.left)} side="left" />
				<EndpointHeading endpoint={displayed.right} label={endpointLabel(displayed.right)} side="right" />
			</div>
			{copyError && (
				<p role="alert" className="p-2 text-xs">
					{copyError}
				</p>
			)}
			{selection && (
				<div className="flex flex-wrap gap-1 border-b border-border p-1">
					<Button
						size="sm"
						disabled={!!selection.endSide && selection.endSide !== selection.side}
						onClick={() => void copy(false)}
					>
						<Copy />
						{t('versioning.diff.copyLines')}
					</Button>
					<Button
						size="sm"
						variant="secondary"
						disabled={!!selection.endSide && selection.endSide !== selection.side}
						onClick={() => void copy(true)}
					>
						{t('versioning.diff.copyLocation')}
					</Button>
					{selection.endSide && selection.endSide !== selection.side && (
						<span role="status">{t('versioning.diff.crossSide')}</span>
					)}
				</div>
			)}
			{hunkRestore && (
				<HunkRestoreControls
					identity={comparison.id}
					source={source}
					target={target}
					diff={proof}
					action={hunkRestore}
					reveal={(hunk) => {
						const i = proof?.chunks.findIndex((item) => item.fromA === hunk.fromA) ?? -1;
						setIndex(i);
					}}
				/>
			)}
			{!comparison.canCompare ? (
				<div role="status" className="flex-1 overflow-auto p-4">
					<EndpointProblem endpoint={comparison.left} openWorktree={openWorktree} />
					<EndpointProblem endpoint={comparison.right} openWorktree={openWorktree} />
				</div>
			) : tooLarge ? (
				<DiffMessage
					message={t('versioning.diff.displayLimit')}
					action={
						<Button size="sm" onClick={() => setForced(comparison.id)}>
							{t('versioning.diff.forceRender')}
						</Button>
					}
				/>
			) : cancelled === id ? (
				<DiffMessage
					message={t('versioning.diff.cancelled')}
					action={
						<Button size="sm" onClick={() => setRetry(retry + 1)}>
							{t('versioning.retry')}
						</Button>
					}
				/>
			) : result?.error ? (
				<DiffMessage
					message={diffError(result.error)}
					action={
						<Button size="sm" onClick={() => setRetry(retry + 1)}>
							{t('versioning.retry')}
						</Button>
					}
				/>
			) : comparison.identical ? (
				<DiffMessage message={t('versioning.diff.identical')} />
			) : !metadata ? (
				<DiffMessage
					busy
					message={t('versioning.diff.computing')}
					action={
						<Button
							size="sm"
							onClick={() => {
								abort.current?.abort();
								setCancelled(id);
							}}
						>
							{t('versioning.cancel')}
						</Button>
					}
				/>
			) : (
				<div
					className="min-h-0 min-w-0 flex-1 overflow-auto"
					data-layout={displayLayout}
					data-comparison-id={comparison.id}
				>
					<DiffOwner>
						<FileDiff<number>
							fileDiff={painted ?? metadata}
							lineAnnotations={(painted ?? metadata).hunks.map((hunk, index) => ({
								side: hunk.additionLines ? 'additions' : 'deletions',
								lineNumber: Math.max(1, hunk.additionLines ? hunk.additionStart : hunk.deletionStart),
								metadata: index,
							}))}
							renderAnnotation={(annotation) => (
								<div
									data-huhu-hunk-header={annotation.metadata}
									tabIndex={-1}
									className="border-y border-border bg-muted px-3 py-2 text-xs focus:outline-2 focus:outline-offset-[-2px] focus:outline-[var(--hu-focus)]"
								>
									<span role="heading" aria-level={3}>
										{(painted ?? metadata).hunks[annotation.metadata]?.hunkSpecs}
									</span>
									{gitHunks && proof && (
										<GitHunkControls
											comparison={comparison}
											metadata={metadata}
											actions={gitHunks}
											proof={proof}
											hunkIndex={annotation.metadata}
										/>
									)}
								</div>
							)}
							options={{
								unsafeCSS: DIFF_UNSAFE_CSS,
								theme: 'huhu',
								preferredHighlighter: 'shiki-js',
								diffStyle: displayLayout === 'side-by-side' ? 'split' : 'unified',
								overflow: (p.wrap ?? true) ? 'wrap' : 'scroll',
								lineDiffType: (p.wordDiff ?? true) ? 'word' : 'none',
								expandUnchanged: !(p.collapse ?? true),
								enableLineSelection: true,
								onLineSelected: setSelection,
								onPostRender: (node, instance, phase) => {
									if (phase !== 'unmount') bindGutterKeyboard(node, instance, () => selection);
									else unbindGutterKeyboard(node);
								},
							}}
						/>
					</DiffOwner>
				</div>
			)}
			{metadata && !metadata.hunks.length && !comparison.identical && (
				<p role="status" className="border-t px-3 py-2 text-xs text-muted-foreground">
					{t('versioning.diff.metadataOnly')}
				</p>
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

export function EndpointProblem({
	endpoint,
	openWorktree,
}: {
	endpoint: ResolvedEndpoint;
	openWorktree?: (path: string, repositoryId: string) => Promise<void>;
}) {
	const [error, setError] = useState('');
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
			{openWorktree &&
				endpoint.ref.kind === 'worktree' &&
				(endpoint.status === 'too-large' ||
					(endpoint.status === 'binary' &&
						(endpoint.reason === 'nul' || endpoint.reason === 'encoding'))) && (
					<Button
						size="sm"
						variant="secondary"
						onClick={() =>
							void openWorktree(endpoint.path, endpoint.repositoryId).catch((error) =>
								setError(error instanceof Error ? error.message : String(error)),
							)
						}
					>
						{t('versioning.diff.openSystem')}
					</Button>
				)}
			{error && <p role="alert">{t(error)}</p>}
		</div>
	);
}

function diffError(error: unknown): string {
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
