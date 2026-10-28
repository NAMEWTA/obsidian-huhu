import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import { t } from '../../../shared/i18n';
import { ReactSurface } from '../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { useOwnerDocument, useVisible } from '../../../ui/react/contexts';
import { useT } from '../../../ui/react/hooks';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '../../../ui/components/alert-dialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/components/dialog';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { TerminalControlPanel } from './control/TerminalControlPanel';
import type { AgentController } from '../services/controller';
import { type WorkspaceCommand } from '../core/workspace/shortcuts';
import { AgentSidebar } from './sidebar/AgentSidebar';
import { WorkspaceLayout } from './workspace/WorkspaceLayout';
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar';
import { WorkspaceTools, type WorkspaceTool } from './workspace/WorkspaceTools';
import { WorkspaceUIContext } from './workspace/workspace-context';
import { bindWorkspaceKeyboard } from './workspace/keyboard-scope';
import { createWorkspaceView, type WorkspaceViewStore } from '../services/workspace-view';
import type { ConfirmFn } from '../services/workspace-service';
import { SessionHistoryPanel, HISTORY_DRAG } from './history/SessionHistoryPanel';
import { JumpPalette } from './jump/JumpPalette';
import { VisibilityContext } from '../../../ui/react/contexts';
export function AgentWorkspace({
	controller,
	context,
	view: suppliedView,
}: {
	controller: AgentController;
	context: NativeSurfaceContext;
	view?: WorkspaceViewStore;
}) {
	const t = useT(),
		workspace = controller.workspace,
		state = useStore(workspace.store),
		visible = useVisible(),
		doc = useOwnerDocument();
	const [localView] = useState(() => createWorkspaceView());
	const viewStore = suppliedView ?? localView,
		page = useStore(viewStore);
	const select = (id: string) => workspace.activate(id);
	const root = useRef<HTMLDivElement>(null);
	const [narrowControl, setNarrowControl] = useState(false);
	const [inboxUnread, setInboxUnread] = useState<number | undefined>();
	const controlReturn = useRef<{ origin: HTMLElement; target: string; blurred: boolean } | undefined>(undefined);
	useEffect(() => {
		const element = root.current;
		if (!element) return;
		const update = () => {
			const width = element.getBoundingClientRect().width;
			if (width > 0) setNarrowControl(width < 600);
		};
		const Observer = (doc.defaultView as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
		const observer = new Observer((entries) => {
			const width = entries[0]?.contentRect.width ?? 0;
			if (width > 0) setNarrowControl(width < 600);
			else update();
		});
		observer.observe(element);
		update();
		return () => observer.disconnect();
	}, [doc]);
	const [menu, setMenu] = useState<string>(),
		[confirmation, setConfirmation] = useState<{
			message: string;
			title?: string;
			action?: string;
			resolve: (yes: boolean) => void;
		}>();
	const confirmationRef = useRef(confirmation);
	const returnFocus = useRef<{ origin: HTMLElement; target: string; blurred: boolean } | undefined>(undefined);
	const focusTarget = () => {
		const current = workspace.store.getState();
		return JSON.stringify([
			controller.spaces?.store.getState().records.selectedSpaceId,
			current.activeGroupId,
			current.groups.map((group) => {
				const tab = current.tabs[group.activeTabId ?? ''];
				return [group.id, group.activeTabId, tab?.kind === 'terminal' ? tab.focusedSessionId : undefined];
			}),
		]);
	};
	useEffect(() => {
		const win = doc.defaultView;
		const blur = () => {
			if (returnFocus.current) returnFocus.current.blurred = true;
			if (controlReturn.current) controlReturn.current.blurred = true;
		};
		win?.addEventListener('blur', blur);
		return () => win?.removeEventListener('blur', blur);
	}, [doc]);
	const [wasVisible, setWasVisible] = useState(visible);
	if (wasVisible !== visible) {
		setWasVisible(visible);
		if (!visible) {
			setMenu(undefined);
			setConfirmation(undefined);
		}
	}
	const alive = useRef(true),
		interactive = useRef(visible);
	const owner = useRef({}),
		closeQueue = useRef(Promise.resolve());
	const visibleIds = visible ? state.groups.flatMap((g) => (g.activeTabId ? [g.activeTabId] : [])).join(',') : '';
	useEffect(() => {
		const key = owner.current;
		workspace.setVisible(key, visibleIds ? visibleIds.split(',') : []);
		return () => workspace.setVisible(key, []);
	}, [workspace, visibleIds]);
	useEffect(
		() =>
			workspace.onMenu(() => {
				if (visible) setMenu(workspace.store.getState().activeGroupId ?? 'empty');
			}),
		[workspace, visible],
	);
	useEffect(() => {
		interactive.current = visible;
		if (!visible) viewStore.setState({ jump: false });
		if (!visible) {
			confirmationRef.current?.resolve(false);
			confirmationRef.current = undefined;
			returnFocus.current = undefined;
			controlReturn.current = undefined;
		}
	}, [visible, viewStore]);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			confirmationRef.current?.resolve(false);
		};
	}, []);
	const confirm: ConfirmFn = (message, options) =>
		new Promise<boolean>((resolve) => {
			if (!alive.current || !interactive.current) {
				resolve(false);
				return;
			}
			confirmationRef.current?.resolve(false);
			const active = doc.activeElement as HTMLElement | null;
			const menu = active?.closest('[role=menu]');
			const trigger = menu?.id
				? [...doc.querySelectorAll<HTMLElement>('[aria-controls]')].find(
						(element) => element.getAttribute('aria-controls') === menu.id,
					)
				: undefined;
			const origin = trigger ?? active;
			returnFocus.current =
				origin && typeof origin.focus === 'function'
					? { origin, target: focusTarget(), blurred: false }
					: undefined;
			const next = { message, ...options, resolve };
			confirmationRef.current = next;
			setConfirmation(next);
		});
	const close = (id: string) => {
		closeQueue.current = closeQueue.current
			.then(() => workspace.close(id, confirm))
			.catch((error) => workspace.report(error));
	};
	const finish = (yes: boolean) => {
		confirmationRef.current?.resolve(yes);
		confirmationRef.current = undefined;
		setConfirmation(undefined);
	};
	const command = (action: WorkspaceCommand) => {
		const tab = workspace.active;
		if (action === 'jump') {
			viewStore.setState({ jump: true });
			void controller.historyStore.refresh(false);
		} else if (action === 'newMenu') setMenu(workspace.store.getState().activeGroupId ?? 'empty');
		else if (action === 'newTerminal') void workspace.newTerminal().catch((error) => workspace.report(error));
		else if (action === 'newAgent') {
			const agent = controller.agents.list()[0];
			if (agent) void workspace.newAgent(agent.id).catch((error) => workspace.report(error));
		} else if (action === 'newBrowser') {
			try {
				workspace.newBrowser();
			} catch (error) {
				workspace.report(error);
			}
		} else if (action === 'close' && tab && !tab.pinned) close(tab.id);
		else if (action === 'reopen') workspace.reopen();
		else if (action === 'next' || action === 'previous') workspace.next(action === 'next' ? 1 : -1);
		else if (action === 'recent') workspace.recent();
		else if (tab && (action === 'splitRight' || action === 'splitDown')) {
			const group = workspace.group(tab.id);
			if (group)
				workspace.move(tab.id, { split: action === 'splitRight' ? 'right' : 'down', ofGroupId: group.id });
		}
	};
	const commandRef = useRef(command);
	useLayoutEffect(() => {
		commandRef.current = command;
	});
	useEffect(() => {
		if (!visible || !root.current) return;
		return bindWorkspaceKeyboard(controller.app, root.current, (action) => commandRef.current(action));
	}, [controller, visible, doc]);
	return (
		<WorkspaceUIContext value={{ controller, confirm, close, chrome: { context, menu, setMenu, view: viewStore } }}>
			<div
				className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background"
				data-agent-workspace=""
				ref={root}
			>
				<WorkspaceToolbar inboxUnread={inboxUnread} onOpenTool={(tool) => viewStore.setState({ control: true, history: false, agentTool: tool })} />
				<div className="@container relative flex min-h-0 flex-1">
					<div
						className="relative min-w-0 flex-1"
						onDragOver={(e) => {
							if (e.dataTransfer.types.includes(HISTORY_DRAG)) e.preventDefault();
						}}
						onDrop={(e) => {
							const key = e.dataTransfer.getData(HISTORY_DRAG);
							if (!key) return;
							e.preventDefault();
							const row = controller.historyStore.store.getState().rows.find((r) => r.key === key);
							if (!row) return;
							const element = (e.target as HTMLElement).closest<HTMLElement>('[data-group-id]');
							const group = element?.dataset.groupId;
							const rect = element?.getBoundingClientRect();
							const split =
								rect && e.clientX > rect.right - rect.width * 0.3
									? 'right'
									: rect && e.clientY > rect.bottom - rect.height * 0.3
										? 'down'
										: undefined;
							void controller.resumeAt(row, group, split).catch((error) => workspace.report(error));
						}}
					>
						<div className="absolute inset-0">
							<VisibilityContext value={visible}>
								<WorkspaceLayout />
							</VisibilityContext>
						</div>
					</div>
					{page.history && (
						<>
							<div
								role="separator"
								aria-label={t('agent.historyUI.resize')}
								aria-orientation="vertical"
								aria-valuenow={page.historyWidth}
								tabIndex={0}
								className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-ring @max-[34rem]:hidden"
								onKeyDown={(e) => {
									if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
										e.preventDefault();
										viewStore.setState({
											historyWidth:
												e.key === 'Home'
													? 240
													: e.key === 'End'
														? 480
														: Math.max(
																240,
																Math.min(
																	480,
																	page.historyWidth +
																		(e.key === 'ArrowLeft' ? 8 : -8),
																),
															),
										});
									}
								}}
								onPointerDown={(e) => {
									e.currentTarget.setPointerCapture(e.pointerId);
								}}
								onPointerMove={(e) => {
									if (e.currentTarget.hasPointerCapture(e.pointerId)) {
										const box = root.current?.getBoundingClientRect();
										if (box)
											viewStore.setState({
												historyWidth: Math.max(240, Math.min(480, box.right - e.clientX)),
											});
									}
								}}
							/>
							{/* Beside the workspace while there is room; over it (never squeezing the tabs to nothing) in a narrow pane. */}
							<div
								className="min-h-0 shrink-0 @max-[34rem]:absolute @max-[34rem]:inset-y-0 @max-[34rem]:right-0 @max-[34rem]:z-10 @max-[34rem]:border-l @max-[34rem]:border-border @max-[34rem]:shadow-lg"
								style={{ width: page.historyWidth, maxWidth: '100%' }}
							>
								<SessionHistoryPanel
									controller={controller}
									close={() => viewStore.setState({ history: false })}
								/>
							</div>
						</>
					)}
					{page.control &&
						!page.history &&
						visible &&
						(narrowControl ? (
							<Dialog
								open
								onOpenChange={(open) => {
									if (!open) viewStore.setState({ control: false });
								}}
							>
								<DialogContent
									showCloseButton={false}
									className="h-[min(90dvh,800px)] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden p-0"
									data-agent-control-dialog=""
									onOpenAutoFocus={() => {
										const origin = doc.activeElement;
										if (
											origin instanceof
											(doc.defaultView as Window & { HTMLElement: typeof HTMLElement })
												.HTMLElement
										)
											controlReturn.current = { origin, target: focusTarget(), blurred: false };
									}}
									onCloseAutoFocus={(event) => {
										event.preventDefault();
										const captured = controlReturn.current;
										controlReturn.current = undefined;
										if (
											!captured ||
											captured.blurred ||
											!alive.current ||
											!interactive.current ||
											!doc.hasFocus() ||
											captured.target !== focusTarget() ||
											!captured.origin.isConnected ||
											doc.querySelector('[role=alertdialog][data-state=open]')
										)
											return;
										captured.origin.focus();
									}}
								>
									<DialogTitle className="sr-only">{page.agentTool === 'inbox' ? t('agent.inbox.title') : t('agent.coordination.title')}</DialogTitle>
									<DialogDescription className="sr-only">
										{t('agent.coordination.doneMeaning')}
									</DialogDescription>
									{page.agentTool === 'control' ? <TerminalControlPanel
										controller={controller}
										confirm={confirm}
										compact
										close={() => viewStore.setState({ control: false })}
									/> : <WorkspaceTools
										controller={controller}
										confirm={confirm}
										compact
										selected={page.agentTool}
										onSelectedChange={(tool: WorkspaceTool) => viewStore.setState({ control: true, history: false, agentTool: tool })}
										onUnreadCount={setInboxUnread}
										close={() => viewStore.setState({ control: false })}
									/>}
								</DialogContent>
							</Dialog>
						) : (
							<aside className="min-h-0 w-[312px] max-w-full shrink-0 border-l border-border">
								<WorkspaceTools
									controller={controller}
									confirm={confirm}
									selected={page.agentTool}
									onSelectedChange={(tool: WorkspaceTool) => viewStore.setState({ control: true, history: false, agentTool: tool })}
									onUnreadCount={setInboxUnread}
									close={() => viewStore.setState({ control: false })}
								/>
							</aside>
						))}
				</div>
				{page.jump && visible && (
					<JumpPalette
						controller={controller}
						close={() => viewStore.setState({ jump: false })}
						select={select}
					/>
				)}
			</div>
			{visible &&
				context.navigationEl &&
				createPortal(<AgentSidebar togglePanel={context.togglePanel} />, context.navigationEl)}
			<AlertDialog
				open={!!confirmation && visible}
				onOpenChange={(open) => {
					if (!open) finish(false);
				}}
			>
				<AlertDialogContent
					className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						const captured = returnFocus.current;
						returnFocus.current = undefined;
						if (
							!captured ||
							captured.blurred ||
							!alive.current ||
							!interactive.current ||
							!doc.hasFocus() ||
							captured.target !== focusTarget()
						)
							return;
						const { origin } = captured,
							active = doc.activeElement;
						if (
							origin.ownerDocument !== doc ||
							!origin.isConnected ||
							origin.closest('[hidden],[inert]') ||
							!origin.checkVisibility()
						)
							return;
						if (doc.querySelector('[role=alertdialog][data-state=open]')) return;
						if (active !== doc.body && active !== origin && !active?.closest('[role=alertdialog]')) return;
						origin.focus();
					}}
				>
					<AlertDialogTitle>{confirmation?.title ?? t('agent.confirmTitle')}</AlertDialogTitle>
					<AlertDialogDescription className="whitespace-pre-line break-words">
						{confirmation?.message}
					</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => finish(false)}>{t('common.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => finish(true)}
						>
							{confirmation?.action ?? t('agent.end')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</WorkspaceUIContext>
	);
}
export class AgentWorkspacePage extends ReactSurface {
	readonly view = createWorkspaceView();
	constructor(
		context: NativeSurfaceContext,
		private controller?: AgentController,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-agent-page';
	}
	getDisplayText(): string {
		return t('workbench.agent');
	}
	getIcon(): string {
		return 'bot';
	}
	protected renderContent() {
		return this.controller ? (
			<AgentWorkspace controller={this.controller} context={this.context} view={this.view} />
		) : (
			<EmptyState title={t('agent.workspace.desktopOnly')} />
		);
	}
	/**
	 * Board and usage are tabs: showing them opens the tab or activates the one that is already
	 * open. Everything else (a session, the history panel, the jump palette) leaves the open tabs alone.
	 */
	show(target: WorkbenchTarget): void {
		const workspace = this.controller?.workspace;
		const section = target.section;
		this.view.setState({
			...(section === 'history' ? { history: true, control: false } : {}),
			...(section === 'control' ? { control: true, history: false } : {}),
			...(section === 'jump' ? { jump: true } : {}),
		});
		if (workspace) {
			if (section === 'board') workspace.openPage('board');
			else if (section === 'usage') workspace.openPage('usage', { resourceId: target.resourceId });
		}
		if (target.resourceId && this.controller && section !== 'usage') {
			if (this.controller.workspace.store.getState().tabs[target.resourceId])
				this.controller.workspace.activate(target.resourceId);
			else this.controller.show(target.resourceId);
		}
	}
	/** Always the workspace itself: which tab is open is the workspace's own state, saved with it. */
	getTarget(): WorkbenchTarget {
		return { feature: 'terminal', section: 'running' };
	}
}
export const createAgentPage =
	(controller: () => AgentController | undefined): PageCreate =>
	async (context, target, state, signal) => {
		const current = controller();
		await current?.workspace.persistence.ready;
		signal.throwIfAborted();
		const page = new AgentWorkspacePage(context, current);
		page.view.setState(createWorkspaceView(state).getState());
		page.show(target);
		const off = page.view.subscribe(() => context.changed?.());
		signal.addEventListener('abort', off, { once: true });
		return {
			surface: page,
			getState: () => ({
				agentControl: page.view.getState().control,
				agentHistory: page.view.getState().history,
				agentHistoryWidth: page.view.getState().historyWidth,
				agentTool: page.view.getState().agentTool,
			}),
			getTarget: () => page.getTarget(),
			navigate: async (next) => page.show(next),
		};
	};
