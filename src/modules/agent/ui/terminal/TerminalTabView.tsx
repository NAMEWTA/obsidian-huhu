import { openTerminalUrl } from '../../core/terminal/links';
// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/terminal-pane/TerminalContextMenu.tsx, TerminalProcessExitOverlay.tsx
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useCallback, Fragment } from 'react';
import { RotateCw, X } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels';
import type { TerminalTabData } from '../../core/workspace/model';
import { projectPaneIdentities, type PaneIdentity } from '../../core/workspace/pane-identity';
import type { LayoutNode } from '../../core/terminal/layout';
import { Button } from '../../../../ui/components/button';
import { TerminalSearch } from './TerminalSearch';
import { StatusDot } from '../../../../ui/components/huhu/StatusDot';
import { sessionState } from '../../services/terminal/status';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '../../../../ui/components/dialog';
import { Input } from '../../../../ui/components/input';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '../../../../ui/components/context-menu';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import type { ActivityMark, ManagedRuntimeRef, ManagedSeenRequest } from '../../core/workspace/managed-runtime';
import type { ScreenMark } from '../../core/terminal/frames-screen';
import { useT } from '../../../../ui/react/hooks';
import { TerminalView } from './terminal-view';
import { HiddenRendererRetention } from './hidden-renderer-retention';
import { useWorkspaceUI } from '../workspace/workspace-context';
import { openPath } from '../../platform/desktop/files';
import { useAgentSettings } from '../settings/settings-context';
import { pickMaterial } from './material-picker';
import { LifecycleFeedback, ManagedLifecycleStatus, useLifecycleAction } from '../sidebar/managed-lifecycle';
import { SpaceError } from '../../core/space/errors';
import { spaceErrorMessage } from '../create/space-errors';

interface PresentedActivity {
	target: ManagedRuntimeRef;
	at: ActivityMark;
	mode: 'runtime' | 'restored-hint';
}

export function TerminalHost({
	tab,
	sessionId,
	active,
	focused,
	retention,
	paneId,
}: {
	tab: TerminalTabData;
	sessionId: string;
	active: boolean;
	focused: boolean;
	retention: HiddenRendererRetention;
	paneId?: string;
}) {
	const { controller, confirm, chrome } = useWorkspaceUI(),
		workspace = controller.workspace,
		t = useT(),
		doc = useOwnerDocument(),
		pageVisible = useVisible();
	const settings = useAgentSettings(controller.settings);
	const session = controller.sessions.get(sessionId),
		ref = useRef<HTMLDivElement>(null),
		view = useRef<TerminalView | undefined>(undefined),
		paneRef = useRef<HTMLDivElement>(null),
		activityFlags = useRef({ active, focused, pageVisible }),
		activityUpdate = useRef<((value: PresentedActivity | undefined) => void) | undefined>(undefined),
		activityRetry = useRef<(() => void) | undefined>(undefined),
		activityReceipt = useRef<
			| ((current: TerminalView, receipt: Readonly<{ at: ActivityMark; installed: ScreenMark }>) => void)
			| undefined
		>(undefined);
	const [, refreshFocusPresentation] = useState({});
	const focusPresentation = workspace.getFocusPresentation();
	const committedFocusCapture = useRef(focusPresentation);
	useLayoutEffect(() => {
		committedFocusCapture.current = focusPresentation;
	}, [focusPresentation]);
	const focusBinding = useRef<{ view: TerminalView; off: () => void } | undefined>(undefined);
	const [seenError, setSeenError] = useState<
		Readonly<{ target: ManagedRuntimeRef; at: ActivityMark; message: string }> | undefined
	>(undefined);
	const [search, setSearch] = useState(false),
		[rename, setRename] = useState(false),
		[draft, setDraft] = useState(''),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(''),
		[contextMenuVisible, setContextMenuVisible] = useState(false);
	const [wasActive, setWasActive] = useState(active);
	if (wasActive !== active) {
		setWasActive(active);
		if (!active) {
			setSearch(false);
			setRename(false);
			setContextMenuVisible(false);
		}
	}
	const info = tab.panes[sessionId] ?? tab.resume;
	const managed = useSyncExternalStore(workspace.subscribeManaged, workspace.getManagedSnapshot).sessions.find(
		(item) =>
			item.runtime?.runtimeId === sessionId ||
			(!session &&
				(!item.runtime || !controller.sessions.get(item.runtime.runtimeId)) &&
				item.spaceId === info?.spaceId &&
				item.sessionId === info?.persistentSessionId),
	);
	const lifecycle = useLifecycleAction(workspace, confirm);
	const runtime = managed?.runtime,
		pending = runtime?.phase === 'launch-pending' || session?.connection === 'starting';
	const live = !!session?.running && !pending;
	const recoveryBlocked =
		!!managed &&
		(managed.archived ||
			managed.restore?.canRequestContinue === false ||
			managed.runtime?.stop?.phase === 'stop-requested' ||
			(managed.runtime?.phase === 'disconnected' && managed.restore?.canRequestContinue !== true));
	const primaryRestart = !!managed && (managed.kind === 'shell' || !info?.nativeSessionId);
	const closeLabel = t(live ? 'agent.managed.closeView' : 'agent.closePane');
	const phaseKey = runtime?.phase
		? (`agent.managed.${runtime.phase === 'launch-pending' ? 'starting' : runtime.phase}` as const)
		: undefined;
	useLayoutEffect(() => {
		if (!session || !ref.current || pending) return;
		const current = new TerminalView(ref.current, session, {
			app: controller.app,
			settings: () => controller.settings.get(),
			retention,
			vaultPath: () => controller.vaultPath(),
			focused: () => workspace.focusSession(sessionId),
			presented: (current, receipt) => activityReceipt.current?.(current, receipt),
			openLink: (url, event) =>
				openTerminalUrl(url, event, controller.browserHost(), () => {
					ref.current?.win.open(url);
				}),
		});
		view.current = current;
		const host = ref.current,
			find = () => setSearch(true);
		host.addEventListener('huhu-terminal-find', find);
		const off = controller.settings.subscribe(() => current.applySettings());
		const cssEvent = controller.app.workspace.on('css-change', () => current.applySettings());
		const win = doc.defaultView as (Window & { MutationObserver: typeof MutationObserver }) | null;
		const themeObserver = win ? new win.MutationObserver(() => current.applySettings()) : undefined;
		themeObserver?.observe(doc.body, { attributes: true, attributeFilter: ['class', 'style'] });
		return () => {
			host.removeEventListener('huhu-terminal-find', find);
			off();
			controller.app.workspace.offref(cssEvent);
			themeObserver?.disconnect();
			if (focusBinding.current?.view === current) {
				focusBinding.current.off();
				focusBinding.current = undefined;
			}
			current.dispose();
			if (view.current === current) view.current = undefined;
		};
	}, [session, sessionId, controller, workspace, doc, retention, pending]);
	const focusContext = chrome?.context;
	const focusCurrentView = useCallback(
		(current: TerminalView): boolean => {
			const context = focusContext;
			return (
				view.current === current &&
				!!ref.current?.contains(current.el) &&
				current.hasRenderer &&
				current.el.ownerDocument === doc &&
				current.el.isConnected &&
				(!context ||
					(context.contentEl.ownerDocument === doc &&
						context.contentEl.contains(current.el) &&
						context.leaf.view.containerEl.ownerDocument === doc &&
						context.leaf.view.containerEl.contains(current.el) &&
						controller.app.workspace.getMostRecentLeaf() === context.leaf))
			);
		},
		[focusContext, controller, doc],
	);
	useEffect(() => {
		const current = view.current;
		if (!current) return;
		current.setVisible(active);
		// Constructor-only, never shown and rejected mounts carry no screen reservation.
		// Subscribe only after mount succeeds; the owning layout cleanup removes it before dispose.
		if (current.hasRenderer && focusBinding.current?.view !== current) {
			const update = () => {
				if (focusBinding.current?.view === current) refreshFocusPresentation({});
			};
			const off = workspace.subscribeFocusPresentation(update);
			focusBinding.current = { view: current, off };
			// Close the render→subscribe gap, without scheduling a render when the snapshot is unchanged.
			if (workspace.getFocusPresentation() !== committedFocusCapture.current) update();
		}
	}, [active, session, sessionId, doc, pending, controller, workspace, retention]);
	useEffect(() => {
		const current = view.current;
		if (!current) return;
		if (!active || !focused) {
			current.setFocused(false);
			return;
		}
		// Phase changes can update the subscription but confer no ordinary focus. A genuine
		// later navigation generation is required before a terminal request permits normal focus.
		if (
			focusPresentation.request &&
			focusPresentation.navigationGeneration <= focusPresentation.request.navigationGeneration
		)
			return;
		current.presentFocus(
			(textarea, focus) =>
				focusCurrentView(current) &&
				workspace.presentManagedFocus(focusPresentation, sessionId, textarea, focus, 'normal'),
		);
	}, [
		active,
		focused,
		session,
		doc,
		pending,
		controller,
		workspace,
		retention,
		focusPresentation,
		sessionId,
		focusCurrentView,
	]);
	useEffect(() => {
		const current = view.current,
			request = focusPresentation.request;
		if (
			!current ||
			!active ||
			!focused ||
			request?.phase !== 'committed' ||
			request.target.runtimeId !== sessionId ||
			request.tabId !== tab.id ||
			!focusCurrentView(current)
		)
			return;
		current.presentFocus(
			(textarea, focus) =>
				focusCurrentView(current) &&
				workspace.presentManagedFocus(focusPresentation, sessionId, textarea, focus, 'committed'),
		);
	}, [
		active,
		focused,
		session,
		doc,
		pending,
		controller,
		workspace,
		retention,
		focusPresentation,
		sessionId,
		tab.id,
		focusCurrentView,
	]);
	useLayoutEffect(() => {
		const context = chrome?.context,
			root = paneRef.current,
			win = doc.defaultView;
		if (!context || !root || !win) return;
		let alive = true,
			intersecting = false,
			windowFocused = doc.hasFocus(),
			frame: number | undefined;
		let committed: PresentedActivity | undefined,
			pendingSeen: PresentedActivity | undefined,
			failed: PresentedActivity | undefined,
			lastSubmitted: ActivityMark | undefined;
		let inFlight: { value: PresentedActivity; abort: AbortController } | undefined;
		const sameTarget = (a: ManagedRuntimeRef, b: ManagedRuntimeRef) =>
			a.spaceId === b.spaceId && a.sessionId === b.sessionId && a.runtimeId === b.runtimeId;
		const eligible = (value: PresentedActivity): boolean => {
			const flags = activityFlags.current,
				rect = root.getBoundingClientRect();
			const currentTab = workspace.store.getState().tabs[tab.id];
			const current = workspace
				.getManagedSnapshot()
				.sessions.find(
					(item) => item.spaceId === value.target.spaceId && item.sessionId === value.target.sessionId,
				);
			return (
				alive &&
				flags.active &&
				flags.focused &&
				flags.pageVisible &&
				intersecting &&
				windowFocused &&
				doc.visibilityState === 'visible' &&
				doc.hasFocus() &&
				root.ownerDocument === doc &&
				root.isConnected &&
				!root.closest('[hidden], [inert]') &&
				rect.width > 0 &&
				rect.height > 0 &&
				context.contentEl.ownerDocument === doc &&
				context.contentEl.contains(root) &&
				context.leaf.view.containerEl.ownerDocument === doc &&
				context.leaf.view.containerEl.contains(root) &&
				controller.app.workspace.getMostRecentLeaf() === context.leaf &&
				workspace.active?.id === tab.id &&
				currentTab?.kind === 'terminal' &&
				currentTab.focusedSessionId === sessionId &&
				currentTab.sessionIds.includes(sessionId) &&
				currentTab.panes[sessionId]?.spaceId === value.target.spaceId &&
				currentTab.panes[sessionId]?.persistentSessionId === value.target.sessionId &&
				!!current &&
				(value.mode === 'runtime'
					? current.runtime?.runtimeId === value.target.runtimeId && sessionId === value.target.runtimeId
					: current.completionHint?.runtimeId === value.target.runtimeId &&
						(!current.runtime || current.runtime.runtimeId === value.target.runtimeId))
			);
		};
		const submit = (value: PresentedActivity) => {
			if (!eligible(value)) return;
			if (
				lastSubmitted?.runtimeId === value.at.runtimeId &&
				lastSubmitted.activitySequence >= value.at.activitySequence
			)
				return;
			if (inFlight) {
				if (
					!pendingSeen ||
					pendingSeen.at.runtimeId !== value.at.runtimeId ||
					pendingSeen.at.activitySequence < value.at.activitySequence
				)
					pendingSeen = value;
				return;
			}
			const operation = { value, abort: new AbortController() };
			inFlight = operation;
			lastSubmitted = value.at;
			const request: ManagedSeenRequest = {
				target: value.target,
				at: value.at,
				view: { tabId: tab.id, paneSessionId: sessionId },
			};
			void workspace
				.markManagedSeen(request, { signal: operation.abort.signal })
				.then((result) => {
					if (!alive) return;
					if (result.status === 'failed') {
						failed = value;
						setSeenError((previous) =>
							previous &&
							sameTarget(previous.target, value.target) &&
							previous.at.activitySequence > value.at.activitySequence
								? previous
								: { target: value.target, at: value.at, message: t(result.error.messageKey) },
						);
					} else if (result.persisted) {
						if (
							failed &&
							sameTarget(failed.target, value.target) &&
							failed.at.activitySequence <= value.at.activitySequence
						)
							failed = undefined;
						setSeenError((previous) =>
							previous &&
							sameTarget(previous.target, value.target) &&
							previous.at.activitySequence <= value.at.activitySequence
								? undefined
								: previous,
						);
					}
				})
				.catch(() => {
					if (alive) {
						failed = value;
						setSeenError({ target: value.target, at: value.at, message: t('agent.managed.unavailable') });
					}
				})
				.finally(() => {
					if (inFlight === operation) inFlight = undefined;
					const next = pendingSeen;
					pendingSeen = undefined;
					if (alive && next) submit(next);
				});
		};
		const cancelFrame = () => {
			if (frame !== undefined) win.cancelAnimationFrame(frame);
			frame = undefined;
		};
		const refresh = () => {
			cancelFrame();
			if (!committed || !eligible(committed)) {
				view.current?.presentActivity(undefined);
				pendingSeen = undefined;
				if (inFlight && !eligible(inFlight.value)) inFlight.abort.abort();
				return;
			}
			const captured = committed;
			if (captured.mode === 'runtime') view.current?.presentActivity(captured.at);
			else
				frame = win.requestAnimationFrame(() => {
					frame = undefined;
					const hint = root.querySelector<HTMLElement>('[data-completion-hint]');
					if (hint?.dataset.completionHint === captured.at.runtimeId && eligible(captured)) submit(captured);
				});
		};
		const update = (value: PresentedActivity | undefined) => {
			committed = value;
			refresh();
		};
		const receipt = (current: TerminalView, rendered: Readonly<{ at: ActivityMark; installed: ScreenMark }>) => {
			if (
				view.current !== current ||
				!committed ||
				committed.mode !== 'runtime' ||
				rendered.at.runtimeId !== committed.target.runtimeId ||
				rendered.installed.runtimeId !== rendered.at.runtimeId
			)
				return;
			submit({ target: { ...committed.target }, at: { ...rendered.at }, mode: 'runtime' });
		};
		const retry = () => {
			const value = committed ?? failed;
			if (!value || !eligible(value)) return;
			lastSubmitted = undefined;
			committed = value;
			view.current?.presentActivity(undefined);
			refresh();
		};
		activityUpdate.current = update;
		activityReceipt.current = receipt;
		activityRetry.current = retry;
		const focus = () => {
			windowFocused = doc.hasFocus();
			refresh();
		};
		const blur = () => {
			windowFocused = false;
			cancelFrame();
			view.current?.presentActivity(undefined);
			pendingSeen = undefined;
			inFlight?.abort.abort();
		};
		doc.addEventListener('visibilitychange', refresh);
		win.addEventListener('focus', focus);
		win.addEventListener('blur', blur);
		const leafEvent = controller.app.workspace.on('active-leaf-change', refresh);
		const Observer = (win as Window & { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver;
		const observer = Observer
			? new Observer((entries) => {
					for (const entry of entries)
						if (entry.target === root) intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
					refresh();
				})
			: undefined;
		observer?.observe(root);
		return () => {
			alive = false;
			cancelFrame();
			inFlight?.abort.abort();
			pendingSeen = committed = undefined;
			view.current?.presentActivity(undefined);
			observer?.disconnect();
			doc.removeEventListener('visibilitychange', refresh);
			win.removeEventListener('focus', focus);
			win.removeEventListener('blur', blur);
			controller.app.workspace.offref(leafEvent);
			if (activityUpdate.current === update)
				activityUpdate.current = activityReceipt.current = activityRetry.current = undefined;
		};
	}, [chrome?.context, controller, doc, workspace, tab.id, sessionId, session, t]);
	useLayoutEffect(() => {
		activityFlags.current = { active, focused, pageVisible };
		const detail = managed?.runtime?.activityDetail,
			hint = managed?.completionHint;
		const at =
			session && detail?.unreadCompletion
				? detail.at
				: !session &&
					  hint &&
					  hint.activitySequence > hint.seenThrough &&
					  (!runtime || runtime.runtimeId === hint.runtimeId)
					? hint
					: undefined;
		activityUpdate.current?.(
			managed && at
				? {
						target: { spaceId: managed.spaceId, sessionId: managed.sessionId, runtimeId: at.runtimeId },
						at: { runtimeId: at.runtimeId, activitySequence: at.activitySequence },
						mode: session ? 'runtime' : 'restored-hint',
					}
				: undefined,
		);
	});

	const restore = async (restart = false) => {
		if (busy || pending || recoveryBlocked) return;
		setBusy(true);
		setError('');
		try {
			await workspace.restore(tab.id, sessionId, restart);
		} catch (error) {
			setError(
				managed
					? error instanceof SpaceError
						? spaceErrorMessage(error)
						: t('agent.managed.unavailable')
					: error instanceof Error
						? error.message
						: String(error),
			);
		} finally {
			setBusy(false);
		}
	};
	const closePane = () => {
		void workspace.closePane(sessionId, confirm).catch((error) => workspace.report(error));
	};
	const showSearch = () => setSearch(true);
	const run = (action: () => unknown) => {
		void Promise.resolve()
			.then(action)
			.catch((error) => workspace.report(error));
	};
	return (
		<div
			ref={paneRef}
			data-terminal-pane={sessionId}
			data-pane-id={paneId}
			data-session-id={info?.persistentSessionId}
			className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
			onPointerDown={() => workspace.focusSession(sessionId)}
		>
			<div
				data-pane-header=""
				className={`huhu-agent-pane-header flex min-h-[34px] min-w-0 shrink-0 items-center gap-2 px-2 text-xs ${focused ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
			>
				<button
					type="button"
					data-pane-title=""
					className="min-w-0 flex-1 truncate text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					title={`${info?.customTitle || session?.title || tab.title}\n${info?.spaceId ?? ''}\n${info?.persistentSessionId ?? sessionId}\n${sessionId}\n${paneId ?? info?.paneId ?? ''}`}
					onClick={() => workspace.focusSession(sessionId)}
				>
					{info?.customTitle || session?.title || tab.title}
				</button>
				{focused && active && (
					<span className="huhu-agent-pane-focus shrink-0 text-[11px]">
						{t('agent.workspace.selectedPane')}
					</span>
				)}
				{(session ? session.agentId : info?.agentId) && (
					<StatusDot state={session ? sessionState(session) : 'unknown'} />
				)}
				<Button
					variant="ghost"
					size="icon-xs"
					className="huhu-agent-pane-close size-8"
					data-pane-close=""
					aria-label={closeLabel}
					title={live ? t('agent.managed.closeViewHint') : undefined}
					onClick={closePane}
				>
					<X className="size-3" />
				</Button>
			</div>
			{live && active && focused && (
				<p className="m-0 shrink-0 px-2 py-1 text-xs text-muted-foreground">
					{t('agent.managed.closeViewHint')}
				</p>
			)}
			{managed && (
				<div className="shrink-0 space-y-1 px-2 py-1">
					{runtime?.activityDetail?.unreadCompletion && (
						<p className="m-0 text-xs" data-activity-completion={runtime.runtimeId}>
							{t('agent.activityEvidence.unreadCompletion')}
						</p>
					)}
					{!session && managed.completionHint && (
						<p
							className="m-0 break-words text-xs text-muted-foreground"
							data-completion-hint={managed.completionHint.runtimeId}
						>
							{t('agent.activityEvidence.previousCompletion')} · {managed.completionHint.runtimeId} ·{' '}
							{managed.completionHint.activitySequence > managed.completionHint.seenThrough
								? t('agent.activityEvidence.unreadCompletion')
								: t('agent.activityEvidence.seen')}
						</p>
					)}
					{seenError &&
						(runtime?.runtimeId ?? managed.completionHint?.runtimeId) === seenError.target.runtimeId && (
							<div role="alert" className="space-y-1 text-xs text-destructive">
								<p className="m-0 break-words">
									{t('agent.activityEvidence.seenFailed')} {seenError.message} ·{' '}
									{seenError.at.runtimeId} · {seenError.at.activitySequence}
								</p>
								<Button variant="ghost" size="sm" onClick={() => activityRetry.current?.()}>
									{t('ui.retry')}
								</Button>
							</div>
						)}
					<ManagedLifecycleStatus session={managed} />
					{runtime?.error && (
						<p role="alert" className="m-0 break-words text-xs text-destructive">
							{t(runtime.error.messageKey)}
						</p>
					)}
					{runtime && (runtime.stop || runtime.phase === 'disconnected' || runtime.termination) && (
						<Button
							variant="ghost"
							size="sm"
							className="pointer-coarse:min-h-11"
							aria-disabled={lifecycle.busy || undefined}
							onClick={() => {
								void lifecycle.check({
									spaceId: managed.spaceId,
									sessionId: managed.sessionId,
									runtimeId: runtime.runtimeId,
								});
							}}
						>
							{t('agent.managed.checkStop')}
						</Button>
					)}
					<LifecycleFeedback action={lifecycle} />
				</div>
			)}
			{pending && session && (
				<p role="status" className="m-0 shrink-0 px-2 py-1 text-xs text-muted-foreground">
					{t('agent.managed.starting')}
				</p>
			)}
			{session ? (
				<ContextMenu onOpenChange={setContextMenuVisible}>
					<ContextMenuTrigger asChild>
						<div
							ref={ref}
							data-terminal-host={sessionId}
							onContextMenuCapture={(event) => {
								// Native xterm/host handlers can consume the inner event before Radix.
								// Route it once through the React trigger, retaining this document and point.
								setContextMenuVisible(true);
								if (event.target === event.currentTarget) return;
								event.preventDefault();
								event.stopPropagation();
								const trigger = event.currentTarget,
									clientX = event.clientX,
									clientY = event.clientY;
								const win = doc.defaultView as Window & { MouseEvent: typeof MouseEvent };
								// Wait for native right-click focus handling to finish before Radix takes focus.
								win.requestAnimationFrame(() => {
									if (trigger.isConnected && trigger.checkVisibility())
										trigger.dispatchEvent(
											new win.MouseEvent('contextmenu', {
												bubbles: true,
												cancelable: true,
												clientX,
												clientY,
											}),
										);
								});
							}}
							className="relative min-h-0 w-full flex-1"
							onKeyDownCapture={(event) => {
								if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
									event.preventDefault();
									event.stopPropagation();
									showSearch();
								}
							}}
						/>
					</ContextMenuTrigger>
					{active && contextMenuVisible && (
						<ContextMenuContent>
							<ContextMenuItem onSelect={() => run(() => view.current?.copy())}>
								{t('agent.copy')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => run(() => view.current?.copy(true))}>
								{t('agent.copyPlain')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => run(() => view.current?.paste())}>
								{t('agent.paste')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => view.current?.selectAll()}>
								{t('agent.selectAll')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => view.current?.selectLine()}>
								{t('agent.selectLine')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={showSearch}>{t('agent.search')}</ContextMenuItem>
							<ContextMenuSub>
								<ContextMenuSubTrigger disabled={!settings.quickCommands.length}>
									{t('agent.quick.insert')}
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									{settings.quickCommands.map((command) => (
										<ContextMenuItem
											key={command.id}
											onSelect={() => {
												session.paste(command.content);
											}}
										>
											{command.name}
										</ContextMenuItem>
									))}
								</ContextMenuSubContent>
							</ContextMenuSub>
							<ContextMenuSeparator />
							<ContextMenuItem onSelect={() => view.current?.clear()}>{t('agent.clear')}</ContextMenuItem>
							<ContextMenuItem onSelect={() => view.current?.clearScrollback()}>
								{t('agent.clearScrollback')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => view.current?.reset()}>
								{t('agent.resetTerminal')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => run(() => view.current?.copyContext())}>
								{t('agent.copyContext')}
							</ContextMenuItem>
							{(['previous', 'next', 'failed'] as const).map((kind) => (
								<ContextMenuItem key={kind} onSelect={() => view.current?.jump(kind)}>
									{t(`agent.prompt${kind[0]!.toUpperCase()}${kind.slice(1)}`)}
								</ContextMenuItem>
							))}
							{([1, -1, 0] as const).map((step) => (
								<ContextMenuItem key={step} onSelect={() => view.current?.zoom(step)}>
									{t(
										step === 1
											? 'agent.fontLarger'
											: step === -1
												? 'agent.fontSmaller'
												: 'agent.fontReset',
									)}
								</ContextMenuItem>
							))}
							<ContextMenuSeparator />
							{session.agentId && (
								<ContextMenuItem onSelect={() => pickMaterial(controller, sessionId)}>
									{t('agent.attach')}
								</ContextMenuItem>
							)}
							<ContextMenuItem
								onSelect={() =>
									run(() =>
										doc.defaultView?.navigator.clipboard.writeText(
											session.nativeSessionId ?? sessionId,
										),
									)
								}
							>
								{t('agent.copyId')}
							</ContextMenuItem>
							<ContextMenuItem
								onSelect={() => run(() => doc.defaultView?.navigator.clipboard.writeText(session.cwd))}
							>
								{t('agent.copyPath')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={() => run(() => openPath(session.cwd))}>
								{t('agent.reveal')}
							</ContextMenuItem>
							<ContextMenuItem
								onSelect={() => {
									setDraft(info?.customTitle || session.title);
									setRename(true);
								}}
							>
								{t('agent.paneTitle')}
							</ContextMenuItem>
							{(['row', 'column'] as const).map((direction) => (
								<ContextMenuItem
									key={direction}
									disabled={tab.sessionIds.length >= 4}
									onSelect={() => run(() => workspace.splitPane(sessionId, direction))}
								>
									{t(direction === 'row' ? 'agent.splitRight' : 'agent.splitDown')}
								</ContextMenuItem>
							))}
							<ContextMenuSeparator />
							<ContextMenuItem
								disabled={tab.sessionIds.length < 2}
								onSelect={() => workspace.equalizePanes(tab.id)}
							>
								{t('agent.equalizePanes')}
							</ContextMenuItem>
							<ContextMenuItem onSelect={closePane}>{closeLabel}</ContextMenuItem>
						</ContextMenuContent>
					)}
				</ContextMenu>
			) : (
				<EmptyState
					className="flex-1"
					title={
						managed?.viewState === 'restored'
							? t('agent.managed.restored')
							: phaseKey
								? t(phaseKey)
								: t('agent.workspace.ended')
					}
					description={
						<>
							{tab.customTitle || tab.title}
							<br />
							{info?.cwd}
						</>
					}
					action={
						<div className="flex gap-2">
							<Button
								disabled={busy || pending || recoveryBlocked}
								onClick={() => {
									void restore(primaryRestart);
								}}
							>
								<RotateCw className="size-4" />
								{t(
									managed
										? info?.nativeSessionId
											? 'agent.managed.continue'
											: 'agent.managed.restart'
										: info?.nativeSessionId
											? 'agent.workspace.restore'
											: 'agent.workspace.restart',
								)}
							</Button>
							<Button variant="ghost" onClick={closePane}>
								{closeLabel}
							</Button>
						</div>
					}
				/>
			)}
			{search && active && (
				<TerminalSearch
					find={(query, direction, options) => view.current?.find(query, direction, options) ?? false}
					close={() => {
						setSearch(false);
						view.current?.clearSearch();
						view.current?.focus();
					}}
				/>
			)}
			<Dialog open={rename && active} onOpenChange={setRename}>
				<DialogContent>
					<DialogTitle>{t('agent.paneTitle')}</DialogTitle>
					<Input
						autoFocus
						aria-label={t('agent.renameLabel')}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
								workspace.renamePane(tab.id, sessionId, draft);
								setRename(false);
							}
						}}
					/>
					<DialogFooter>
						<Button
							onClick={() => {
								workspace.renamePane(tab.id, sessionId, draft);
								setRename(false);
							}}
						>
							{t('common.save')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{session && !session.running && !pending && (
				<div className="pointer-events-none absolute inset-0 z-[var(--layer-popover)] flex items-end justify-center p-4">
					<div
						role="status"
						className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs"
					>
						<div className="space-y-1">
							<div className="text-sm font-medium text-foreground">
								{phaseKey && runtime?.phase !== 'exited'
									? t(phaseKey)
									: t('agent.workspace.exited', {
											title: session.title,
											code: session.exitCode ?? '—',
										})}
							</div>
							{runtime?.error ? (
								<div className="text-xs text-muted-foreground">{t(runtime.error.messageKey)}</div>
							) : (
								session.error && (
									<div className="text-xs text-muted-foreground">
										{managed ? t('agent.managed.launchFailed') : session.error}
									</div>
								)
							)}
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="ghost" size="sm" onClick={closePane}>
								<X />
								{t('agent.closePane')}
							</Button>
							<Button
								size="sm"
								disabled={busy || recoveryBlocked}
								onClick={() => {
									void restore(true);
								}}
							>
								<RotateCw />
								{t(managed ? 'agent.managed.restart' : 'agent.workspace.restart')}
							</Button>
						</div>
					</div>
				</div>
			)}
			{error && (
				<p
					role="alert"
					className="absolute bottom-2 left-2 rounded border bg-card p-2 text-xs text-destructive"
				>
					{error}
				</p>
			)}
		</div>
	);
}
function PaneTree({
	node,
	path,
	tab,
	active,
	retention,
	narrow,
	identities,
}: {
	node: LayoutNode;
	path: ('first' | 'second')[];
	tab: TerminalTabData;
	active: boolean;
	retention: HiddenRendererRetention;
	narrow: boolean;
	identities: readonly PaneIdentity[];
}) {
	const { controller } = useWorkspaceUI(),
		panel = useRef<ImperativePanelGroupHandle>(null);
	const resizing = useRef(false);
	useLayoutEffect(() => {
		resizing.current = false;
	}, [narrow]);
	useLayoutEffect(() => {
		if (
			node.kind === 'split' &&
			panel.current &&
			Math.abs(panel.current.getLayout()[0]! / 100 - node.ratio) > 0.001
		)
			panel.current.setLayout([node.ratio * 100, (1 - node.ratio) * 100]);
	}, [node, narrow]);
	if (node.kind === 'pane')
		return (
			<TerminalHost
				tab={tab}
				sessionId={node.session}
				active={active}
				focused={tab.focusedSessionId === node.session && controller.workspace.active?.id === tab.id}
				retention={retention}
				paneId={
					identities.find(
						(identity) => identity.tabId === tab.id && identity.leafKey === node.session && !identity.issue,
					)?.paneId
				}
			/>
		);
	return (
		<PanelGroup
			ref={panel}
			direction={!narrow && node.direction === 'row' ? 'horizontal' : 'vertical'}
			onLayout={(sizes) => {
				if (resizing.current && Math.abs(sizes[0]! / 100 - node.ratio) > 0.001)
					controller.workspace.resizePane(tab.id, path, sizes[0]! / 100);
			}}
		>
			{(['first', 'second'] as const).map((part, i) => (
				<Fragment key={part}>
					{i > 0 && (
						<PanelResizeHandle
							className="huhu-agent-resize w-px bg-border data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full hover:bg-ring"
							onDragging={(value) => {
								resizing.current = value;
							}}
							onKeyDownCapture={(event) => {
								if (
									!event.nativeEvent.isComposing &&
									['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
										event.key,
									)
								)
									resizing.current = true;
							}}
							onKeyUp={() => {
								resizing.current = false;
							}}
							onBlur={() => {
								resizing.current = false;
							}}
							onDoubleClick={() => controller.workspace.resizePane(tab.id, path, 0.5)}
						/>
					)}
					<Panel minSize={15} defaultSize={(i ? 1 - node.ratio : node.ratio) * 100}>
						<PaneTree
							node={node[part]}
							path={[...path, part]}
							tab={tab}
							active={active}
							retention={retention}
							narrow={narrow}
							identities={identities}
						/>
					</Panel>
				</Fragment>
			))}
		</PanelGroup>
	);
}
export function TerminalTabView({
	tab,
	active,
	retention,
}: {
	tab: TerminalTabData;
	active: boolean;
	retention: HiddenRendererRetention;
}) {
	const { controller } = useWorkspaceUI(),
		workspace = controller.workspace;
	const [projection, setProjection] = useState<{
		tab: TerminalTabData;
		scope?: string;
		rows: readonly PaneIdentity[];
	}>();
	const scope = controller.spaces?.store.getState().records.selectedSpaceId;
	const identities = projection?.tab === tab && projection.scope === scope ? projection.rows : [];
	useEffect(() => {
		let live = true;
		if (!workspace.persistence.readLayout) return;
		const read = (spaceId?: string) => workspace.persistence.readLayout!(spaceId);
		void read(scope)
			.then(async (snapshot) => {
				if (!live || controller.spaces?.store.getState().records.selectedSpaceId !== scope) return;
				const current = await read(scope);
				if (
					!live ||
					current.revision !== snapshot.revision ||
					snapshot.spaceId !== scope ||
					current.spaceId !== scope ||
					controller.spaces?.store.getState().records.selectedSpaceId !== scope
				)
					return;
				setProjection({
					tab,
					scope,
					rows: projectPaneIdentities(
						snapshot.view,
						scope ? { kind: 'space', spaceId: scope } : { kind: 'shared' },
						snapshot.baseline,
					),
				});
			})
			.catch((error) => {
				if (live) workspace.report(error);
			});
		return () => {
			live = false;
		};
	}, [workspace, controller, tab, scope]);
	const root = useRef<HTMLDivElement>(null),
		[narrow, setNarrow] = useState(false);
	useLayoutEffect(() => {
		const el = root.current;
		if (!el) return;
		const update = () => {
			const width = el.getBoundingClientRect().width;
			if (width > 0) setNarrow(width < 600);
		};
		const observer = new (
			el.ownerDocument.defaultView as Window & { ResizeObserver: typeof ResizeObserver }
		).ResizeObserver(update);
		observer.observe(el);
		update();
		return () => observer.disconnect();
	}, []);
	return (
		<div ref={root} className="h-full min-h-0 min-w-0" data-terminal-layout="">
			<PaneTree
				node={tab.paneLayout}
				path={[]}
				tab={tab}
				active={active}
				retention={retention}
				narrow={narrow}
				identities={identities}
			/>
		</div>
	);
}
