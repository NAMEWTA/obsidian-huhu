import { useImeTextFieldProps } from '../../../../ui/react/ime';
import { useDensityRowHeight } from '../../../../ui/react/use-density';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CodeView, type CodeViewHandle } from '@pierre/diffs/react';
import type { CodeViewItem, CodeViewLineSelection, CodeViewScrollTarget } from '@pierre/diffs';
import type {
	RepositoryEndpoint,
	RevisionFileChange,
	RevisionRef,
	VersioningQueries,
	ResolvedEndpoint,
} from '../../core/history';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import { ActionButton } from '../../../../ui/components/huhu/ActionButton';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { DiffMessage, EndpointProblem } from '../DiffSurface';
import { endpointFile } from './endpoint';
import { parseComparison, RENDER_THRESHOLD } from './parse';
import { DIFF_UNSAFE_CSS } from './theme';
import { DiffOwner } from './owner-pool';
import { DiffToolbar } from './DiffToolbar';
import { bindGutterKeyboard, unbindGutterKeyboard } from './keyboard';
import { selectedText } from './selection';
import { isCancelled, type DiffPreferences } from './preferences';

const refFor = (endpoint: RepositoryEndpoint, path: string): RevisionRef =>
	endpoint.kind === 'commit' ? { ...endpoint, path } : { kind: endpoint.kind, path };
/** CodeView owns multi-file virtualization/collapse; bodies and parsing belong to a cancellable generation. */
export function MultiDiffView({
	queries,
	a,
	b,
	files,
	identity,
	createWorker,
	preferences,
	onPreferencesChange,
	openWorktree,
}: {
	openWorktree?: (path: string, repositoryId: string) => Promise<void>;
	queries: VersioningQueries;
	a: RepositoryEndpoint;
	b: RepositoryEndpoint;
	files: readonly RevisionFileChange[];
	identity: string;
	createWorker?: () => Worker;
	preferences: DiffPreferences;
	onPreferencesChange: (preferences: DiffPreferences) => void;
}) {
	const document = useOwnerDocument();
	const visible = useVisible();
	const root = useRef<HTMLDivElement | null>(null);
	const scrollContainer = useRef<HTMLDivElement | null>(null);
	const rowHeight = useDensityRowHeight(root);
	const active = useRef({ id: '', visible: false });
	const [state, setState] = useState<{
		id: string;
		items?: CodeViewItem<number>[];
		problems?: ResolvedEndpoint[];
		error?: string;
	}>();
	const [force, setForce] = useState(''),
		[cancelled, setCancelled] = useState(''),
		[retry, setRetry] = useState(0);
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const [selection, setSelection] = useState<CodeViewLineSelection | null>(null),
		[copyError, setCopyError] = useState('');
	const [narrow, setNarrow] = useState(false);
	const abort = useRef<AbortController | undefined>(undefined),
		viewer = useRef<CodeViewHandle<number, undefined>>(null);
	const version = useRef(0),
		navigation = useRef(-1),
		focusFrame = useRef(0);
	const pendingFocus = useRef<{
		id: string;
		hunk: number;
		comparison: string;
		owner: Document;
		source: Element | null;
		scroll?: CodeViewScrollTarget;
	} | undefined>(undefined);
	const worker = useEffectEvent(() => createWorker!());
	const id = `${identity}:${retry}:${force}:${preferences.swapped}`;
	const keyboard = useImeTextFieldProps<HTMLDivElement>({
		onKeyDown: (event) => {
			const owner = document.defaultView;
			if (
				event.key !== 'F7' || event.defaultPrevented || !owner ||
				event.nativeEvent.composedPath().some((node) =>
					node instanceof owner.HTMLElement &&
					(node.isContentEditable || node.matches('input,textarea,select')),
				)
			) return;
			event.preventDefault();
			event.stopPropagation();
			move(event.shiftKey ? -1 : 1);
		},
	});
	useLayoutEffect(() => {
		active.current = { id, visible };
		return () => {
			active.current.visible = false;
		};
	}, [id, visible]);
	const [selectionIdentity, setSelectionIdentity] = useState(id);
	if (selectionIdentity !== id) {
		setSelectionIdentity(id);
		setSelection(null);
		setCopyError('');
	}
	const hasWorker = !!createWorker;
	const mount = useCallback(
		(node: HTMLDivElement | null) => {
			root.current = node;
			const owner = node?.ownerDocument.defaultView;
			if (!visible || !node || !owner) return;
			const measure = () => setNarrow((node.closest('[data-huhu-leaf]')?.clientWidth ?? node.clientWidth) < 600);
			const observer = new owner.ResizeObserver(measure);
			observer.observe(node);
			measure();
			return () => observer.disconnect();
		},
		[visible],
	);
	const focusHeader = useCallback(() => {
		const owner = document.defaultView;
		if (!owner || !pendingFocus.current) return;
		owner.cancelAnimationFrame(focusFrame.current);
		focusFrame.current = owner.requestAnimationFrame(() => {
			const target = pendingFocus.current;
			if (
				!target ||
				target.comparison !== id ||
				target.owner !== document ||
				active.current.id !== id ||
				!active.current.visible ||
				!root.current?.isConnected ||
				root.current.ownerDocument !== document
			)
				return;
			const node = [...root.current.querySelectorAll<HTMLElement>('[data-huhu-hunk-header]')].find(
				(node) =>
					node.dataset.huhuHunkFile === target.id && Number(node.dataset.huhuHunkHeader) === target.hunk,
			);
			if (node) {
				pendingFocus.current = undefined;
				node.focus({ preventScroll: true });
			}
		});
	}, [document, id]);
	useEffect(() => {
		if (!visible) return;
		const cancel = (event: FocusEvent) => {
			const target = pendingFocus.current;
			if (!target || event.target === target.source) return;
			// CodeView focuses its public container when it recycles the old focused header.
			if (event.target === scrollContainer.current && !target.source?.isConnected) return;
			pendingFocus.current = undefined;
		};
		const owner = document.defaultView;
		const cancelRequest = () => {
			pendingFocus.current = undefined;
		};
		document.addEventListener('focusin', cancel);
		document.addEventListener('pointerdown', cancelRequest, true);
		owner?.addEventListener('blur', cancelRequest);
		return () => {
			document.removeEventListener('focusin', cancel);
			document.removeEventListener('pointerdown', cancelRequest, true);
			owner?.removeEventListener('blur', cancelRequest);
			pendingFocus.current = undefined;
		};
	}, [document, visible, id]);
	useLayoutEffect(() => {
		const target = pendingFocus.current;
		if (
			!target?.scroll || target.comparison !== id || target.owner !== document ||
			!active.current.visible || active.current.id !== id || collapsed.has(target.id)
		) return;
		const scroll = target.scroll;
		target.scroll = undefined;
		viewer.current?.scrollTo(scroll);
		focusHeader();
	}, [collapsed, document, focusHeader, id]);
	useEffect(
		() => () => {
			document.defaultView?.cancelAnimationFrame(focusFrame.current);
		},
		[document, visible, id],
	);
	useEffect(() => {
		if (!visible || cancelled === id) return;
		const controller = new AbortController();
		abort.current = controller;
		const currentVersion = ++version.current;
		navigation.current = -1;
		pendingFocus.current = undefined;
		void (async () => {
			const items: CodeViewItem<number>[] = [],
				problems: ResolvedEndpoint[] = [];
			for (const file of files) {
				if (controller.signal.aborted) return;
				const comparison = await queries.compare(
					{ intent: 'revisions', left: refFor(a, file.from ?? file.path), right: refFor(b, file.path) },
					controller.signal,
				);
				if (controller.signal.aborted) return;
				if (!comparison.canCompare) {
					problems.push(comparison.left, comparison.right);
					continue;
				}
				const oldFile = endpointFile(comparison.left),
					newFile = endpointFile(comparison.right);
				if (!oldFile && !newFile) continue;
				if (
					(oldFile?.contents.length ?? 0) + (newFile?.contents.length ?? 0) > RENDER_THRESHOLD &&
					force !== identity
				)
					throw new Error('versioning.diff.displayLimit');
				const fileDiff = await parseComparison(
					oldFile,
					newFile,
					controller.signal,
					hasWorker ? () => worker() : undefined,
				);
				if (controller.signal.aborted) return;
				items.push({
					type: 'diff',
					id: file.path,
					version: currentVersion,
					fileDiff,
					annotations: fileDiff.hunks.map((hunk, index) => ({
						side: hunk.additionLines ? 'additions' : 'deletions',
						lineNumber: Math.max(1, hunk.additionLines ? hunk.additionStart : hunk.deletionStart),
						metadata: index,
					})),
				});
			}
			if (!controller.signal.aborted) setState({ id, items, problems });
		})().catch((error) => {
			if (!controller.signal.aborted && !isCancelled(error))
				setState({ id, error: error instanceof Error ? error.message : String(error) });
		});
		return () => controller.abort();
	}, [queries, identity, a, b, files, id, cancelled, hasWorker, force, visible]);
	if (!files.length) return <DiffMessage message={t('versioning.diff.identical')} />;
	if (cancelled === id)
		return (
			<DiffMessage
				message={t('versioning.diff.cancelled')}
				action={
					<Button size="sm" onClick={() => setRetry(retry + 1)}>
						{t('versioning.retry')}
					</Button>
				}
			/>
		);
	const current = state?.id === id ? state : undefined;
	if (current?.error)
		return (
			<DiffMessage
				message={t(current.error)}
				action={
					<Button
						size="sm"
						onClick={() =>
							current.error === 'versioning.diff.displayLimit' ? setForce(identity) : setRetry(retry + 1)
						}
					>
						{t(
							current.error === 'versioning.diff.displayLimit'
								? 'versioning.diff.forceRender'
								: 'versioning.retry',
						)}
					</Button>
				}
			/>
		);
	if (!current?.items)
		return (
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
		);
	const items = current.items.map((item) => ({ ...item, collapsed: collapsed.has(item.id) }));
	const hunks = items.flatMap((item) =>
		item.type === 'diff' ? item.fileDiff.hunks.map((hunk, index) => ({ id: item.id, hunk, index })) : [],
	);
	const move = (direction: -1 | 1) => {
		if (!hunks.length) return;
		navigation.current = (navigation.current + direction + hunks.length) % hunks.length;
		const target = hunks[navigation.current]!;
		const scroll: CodeViewScrollTarget = {
			type: 'line',
			id: target.id,
			lineNumber: Math.max(1, target.hunk.additionStart || target.hunk.deletionStart),
			side: target.hunk.additionStart ? 'additions' : 'deletions',
			align: 'start',
			behavior: 'instant',
		};
		pendingFocus.current = {
			id: target.id,
			hunk: target.index,
			comparison: id,
			owner: document,
			source: document.activeElement,
		};
		// A no-op collapse update would let CodeView restore its pre-navigation scroll anchor.
		if (collapsed.has(target.id)) {
			pendingFocus.current.scroll = scroll;
			setCollapsed((previous) => {
				const next = new Set(previous);
				next.delete(target.id);
				return next;
			});
			return;
		}
		viewer.current?.scrollTo(scroll);
		focusHeader();
	};
	const copy = async (location: boolean) => {
		const item = items.find((item) => item.id === selection?.id);
		if (!selection || item?.type !== 'diff') return;
		const range = selection.range,
			text = selectedText(
				(range.side === 'deletions' ? item.fileDiff.deletionLines : item.fileDiff.additionLines).join(''),
				range,
			);
		if (text === null) return;
		try {
			await document.defaultView?.navigator.clipboard.writeText(
				location ? `${item.id}:${Math.min(range.start, range.end)}-${Math.max(range.start, range.end)}` : text,
			);
			setCopyError('');
		} catch {
			setCopyError(t('versioning.diff.copyFailed'));
		}
	};
	const crossSide = !!selection?.range.endSide && selection.range.endSide !== selection.range.side;
	return (
		<div
			ref={mount}
			style={{ '--diffs-line-height': `${rowHeight}px` } as CSSProperties}
			className="huhu-versioning-diff flex min-h-0 min-w-0 flex-1 flex-col"
			data-narrow={narrow}
			{...keyboard}
		>
			<DiffToolbar
				preferences={preferences}
				update={(patch) => onPreferencesChange({ ...preferences, ...patch })}
				layout={narrow ? 'stacked' : (preferences.layout ?? 'side-by-side')}
				narrow={narrow}
				count={hunks.length}
				onMove={move}
			/>
			{selection && (
				<div className="flex flex-wrap gap-1 border-b p-1">
					<Button size="sm" disabled={crossSide} onClick={() => void copy(false)}>
						{t('versioning.diff.copyLines')}
					</Button>
					<Button size="sm" variant="secondary" disabled={crossSide} onClick={() => void copy(true)}>
						{t('versioning.diff.copyLocation')}
					</Button>
					{crossSide && <span role="status">{t('versioning.diff.crossSide')}</span>}
				</div>
			)}
			{copyError && <p role="alert">{copyError}</p>}
			{current.problems?.map((endpoint) => (
				<EndpointProblem key={endpoint.id} endpoint={endpoint} openWorktree={openWorktree} />
			))}
			<DiffOwner>
				<CodeView<number>
					ref={viewer}
					containerRef={scrollContainer}
					items={items}
					className="min-h-0 flex-1"
					onSelectedLinesChange={setSelection}
					renderHeaderPrefix={(item) => (
						<ActionButton
							size="icon-sm"
							label={t(
								collapsed.has(item.id) ? 'versioning.diff.expandFile' : 'versioning.diff.collapseFile',
								{ path: item.id },
							)}
							onClick={() =>
								setCollapsed((previous) => {
									const next = new Set(previous);
									if (next.has(item.id)) next.delete(item.id);
									else next.add(item.id);
									return next;
								})
							}
						>
							{collapsed.has(item.id) ? <ChevronRight /> : <ChevronDown />}
						</ActionButton>
					)}
					renderAnnotation={(annotation, _file, item) => (
						<div
							ref={(node) => {
								if (
									node && pendingFocus.current?.id === item.id &&
									pendingFocus.current.hunk === annotation.metadata
								)
									focusHeader();
							}}
							tabIndex={-1}
							data-huhu-hunk-header={annotation.metadata}
							data-huhu-hunk-file={item.id}
							className="border-y border-border bg-muted px-3 py-2 text-xs focus:outline-2 focus:outline-offset-[-2px] focus:outline-[var(--hu-focus)]"
						>
							<span role="heading" aria-level={3}>
								{item.type === 'diff' ? item.fileDiff.hunks[annotation.metadata]?.hunkSpecs : ''}
							</span>
						</div>
					)}
					options={{
						unsafeCSS: DIFF_UNSAFE_CSS,
						itemMetrics: {
							lineHeight: rowHeight,
							diffHeaderHeight: rowHeight + 24,
							hunkSeparatorHeight: rowHeight,
							spacing: 8,
						},
						theme: 'huhu',
						preferredHighlighter: 'shiki-js',
						diffStyle: narrow || preferences.layout === 'stacked' ? 'unified' : 'split',
						overflow: (preferences.wrap ?? true) ? 'wrap' : 'scroll',
						lineDiffType: (preferences.wordDiff ?? true) ? 'word' : 'none',
						expandUnchanged: !(preferences.collapse ?? true),
						enableLineSelection: true,
						onPostRender: (node, _instance, phase, context) => {
							if (phase === 'unmount') {
								unbindGutterKeyboard(node);
								return;
							}
							if (context.type === 'diff') {
								bindGutterKeyboard(node, context.instance, () =>
									selection?.id === context.item.id ? selection.range : null,
								);
								focusHeader();
							}
						},
					}}
				/>
			</DiffOwner>
		</div>
	);
}
