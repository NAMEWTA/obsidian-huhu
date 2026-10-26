import type { AgentId } from '../launch/types';
import type { LayoutNode } from '../terminal/layout';
import type { ShellChoice } from '../terminal/settings';

export type AgentState = 'working' | 'waiting' | 'permission' | 'done' | 'idle' | 'failed' | 'interrupted' | 'unknown';
export type TabColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';
export interface ResumeInfo {
	customTitle?: string;
	nativeSessionId?: string;
	cwd: string;
	accountId?: string;
	transcriptPath?: string;
	agentId?: AgentId;
	shell?: ShellChoice;
}
interface TabBase {
	id: string;
	title: string;
	customTitle?: string;
	pinned?: boolean;
	color?: TabColor;
	createdAt: number;
}
export interface TerminalTabData extends TabBase {
	kind: 'terminal';
	agentId?: AgentId;
	sessionIds: string[];
	paneLayout: LayoutNode;
	focusedSessionId: string;
	/** Each pane keeps its own recovery metadata; no environment or credentials are persisted. */
	panes: Record<string, ResumeInfo>;
	resume?: ResumeInfo;
	state: AgentState;
	unread: boolean;
	updatedAt: number;
}
export interface BrowserTabData extends TabBase {
	kind: 'browser';
	/** A presentation reference; the browser module owns the Space and Page lifecycle. */
	spaceId: string;
	pageId: string;
}
/** The pages the workspace can hold as stable tabs next to sessions and browser tabs. */
export const PAGE_KINDS = ['board', 'usage'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
/** A workbench page shown as a tab. Each page is a singleton with a fixed id; opening it again only activates it. */
export interface PageTabData extends TabBase {
	kind: 'page';
	page: PageKind;
	/** `usage`: the provider filter. */
	resourceId?: string;
}
export type WorkspaceTab = TerminalTabData | BrowserTabData | PageTabData;
export interface TabGroup {
	id: string;
	tabIds: string[];
	activeTabId?: string;
	recentTabIds: string[];
}
export type GroupLayoutNode =
	| { kind: 'group'; groupId: string }
	| { kind: 'split'; direction: 'row' | 'column'; sizes: number[]; children: GroupLayoutNode[] };
export interface WorkspaceState {
	version: 1;
	tabs: Record<string, WorkspaceTab>;
	groups: TabGroup[];
	layout?: GroupLayoutNode;
	activeGroupId?: string;
	closedTabs: WorkspaceTab[];
}
export const MAX_GROUPS = 4;
export const emptyWorkspace = (): WorkspaceState => ({ version: 1, tabs: {}, groups: [], closedTabs: [] });
