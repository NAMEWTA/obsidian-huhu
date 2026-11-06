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
import { DesignScope } from '../../../ui/react/design-scope';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '../../../ui/components/alert-dialog';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { DetailPane } from '../../../ui/components/huhu/DetailPane';
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
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';
import { SessionInformation, WaitingAnswerBanner } from './workspace/SessionInformation';
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
	const [sessionInfo, setSessionInfo] = useState(false);
	const toolOpen = page.control || page.history;
	const [lastToolOpen, setLastToolOpen] = useState(toolOpen);
	if (lastToolOpen !== toolOpen) { setLastToolOpen(toolOpen); if (toolOpen) setSessionInfo(false); }
	const leaf = useLeafMetrics(context.contentEl);
	const [inboxUnread, setInboxUnread] = useState<number | undefined>();

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
		} else if (action === 'close' && tab && !tab.pinned) close(tab.id);
		else if (action === 'reopen') workspace.reopen();
		else if (action === 'next' || action === 'previous') workspace.next(action === 'next' ? 1 : -1);
		else if (action === 'recent') workspace.recent();
		else if (action === 'splitRight' || action === 'splitDown') {
			const group = tab ? workspace.group(tab.id) : undefined;
			workspace.moveFromUI(tab?.id ?? '', { split: action === 'splitRight' ? 'right' : 'down', ofGroupId: group?.id ?? '' });
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
				className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--hu-canvas)]"
				data-agent-workspace=""
				ref={node => { root.current = node; leaf.ref(node); }}
			>
				<DesignScope className="flex min-h-0 min-w-0 flex-1 flex-col">
				<WorkspaceToolbar inboxUnread={inboxUnread} sessionInfo={sessionInfo} onSessionInfo={() => { viewStore.setState({ history: false, control: false }); setSessionInfo(value => !value); }} />
				{visible && <WaitingAnswerBanner />}
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
					<DetailPane open={page.history && visible} onOpenChange={history => viewStore.setState({ history })} leafWidth={leaf.width} title={t('agent.historyUI.title')}>
						<SessionHistoryPanel controller={controller} close={() => viewStore.setState({ history: false })} narrow={leaf.width < 600} />
					</DetailPane>
					<DetailPane open={page.control && !page.history && visible} onOpenChange={control => viewStore.setState({ control })} leafWidth={leaf.width} title={t(page.agentTool === 'inbox' ? 'agent.inbox.title' : 'agent.coordination.title')}>
						<WorkspaceTools controller={controller} confirm={confirm} compact={leaf.width < 600} selected={page.agentTool}
							onSelectedChange={(tool: WorkspaceTool) => viewStore.setState({ control: true, history: false, agentTool: tool })}
							onUnreadCount={setInboxUnread} close={() => viewStore.setState({ control: false })} />
					</DetailPane>
					<SessionInformation open={sessionInfo && visible} onOpenChange={setSessionInfo} leafWidth={leaf.width} />
				</div>
				{page.jump && visible && (
					<JumpPalette
						controller={controller}
						close={() => viewStore.setState({ jump: false })}
						select={select}
					/>
				)}
				</DesignScope>
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
							className="bg-[var(--hu-danger)] text-[var(--hu-danger-fg)] hover:bg-[var(--hu-danger)]/90"
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
export function AgentUnavailable() {
	const t = useT();
	return <EmptyState title={t('agent.workspace.desktopOnly')} />;
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
			<AgentUnavailable />
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
