/** Rendering and navigation contracts; no Plugin, Vault, PTY or service locator. */
import type { ModuleId } from './module';
import type { TreeNode } from '../../ui/components/tree';

export const WORKBENCH_FEATURES = [
	'dashboard',
	'task',
	'terminal',
	'contacts',
	'automations',
	'notifications',
	'icons',
	'sync',
	'safe',
	'content',
	'settings',
] as const;
export type WorkbenchFeature = (typeof WORKBENCH_FEATURES)[number];

/** The module that owns each workbench feature (`settings` belongs to the app). */
export const FEATURE_MODULES: Readonly<Record<WorkbenchFeature, ModuleId | 'app'>> = {
	dashboard: 'home',
	task: 'task',
	terminal: 'agent',
	contacts: 'archives',
	automations: 'automations',
	notifications: 'notifications',
	icons: 'icons',
	sync: 'sync',
	safe: 'safe',
	settings: 'app',
	content: 'app',
};

export interface WorkbenchTarget {
	feature: WorkbenchFeature;
	section?: string;
	resourceId?: string;
	focusId?: string;
}

/** One compatibility mapping for old icon pages, used by live routes and workspace restoration. */
export function iconSettingsTarget(
	target: Pick<WorkbenchTarget, 'section' | 'resourceId' | 'focusId'>,
): WorkbenchTarget {
	const page = target.section ?? target.resourceId,
		focusId = target.focusId;
	return {
		feature: 'settings',
		section: 'iconic',
		...(page && page.length <= 64 && /^iconic-[a-z-]+$/.test(page) ? { resourceId: page } : {}),
		...(focusId && focusId.length <= 256 && ![...focusId].some((character) => character.charCodeAt(0) < 32)
			? { focusId }
			: {}),
	};
}
export interface FeatureAvailability {
	enabled: boolean;
	supported: boolean;
	ready: boolean;
	reason?: string;
}
export interface NavigationItem {
	id: string;
	labelKey: string;
	/** Literal user-defined name; never interpreted as a translation key. */
	label?: string;
	icon: string;
	target?: WorkbenchTarget;
	children?: readonly NavigationItem[];
	badge?: number;
	aliases?: readonly string[];
}

/** A page the workbench keeps (or restores) with its bounded state. */
export interface SavedPage {
	target: WorkbenchTarget;
	state: Record<string, unknown>;
}

/** One row in the side panel (column 2). */
export interface PanelItem {
	id: string;
	label: string;
	icon?: string;
	meta?: string;
	/** Second line under the label (a search result's category and description). */
	detail?: string;
	badge?: number;
	/** Navigates the page; omitted for rows that only run `select`. */
	target?: WorkbenchTarget;
	/** Runs instead of (or before) navigating, e.g. switching the active board. */
	select?: () => void | Promise<void>;
	/** Row menu entries (shown on hover as "⋯" and on right click). */
	menu?: () => ReadonlyArray<{ title: string; icon?: string; danger?: boolean; run: () => void | Promise<void> }>;
	active?: boolean;
}
export interface PanelSection {
	id: string;
	title?: string;
	items: readonly PanelItem[];
	emptyText?: string;
}
/** A nested list in the side panel (folders, or groups of records), rendered as a tree. */
export interface PanelTree {
	/** Accessible name of the tree. */
	label: string;
	nodes: readonly TreeNode[];
	/** The highlighted row; the page decides what is current. */
	selectedId?: string;
	/** Folders open on first render. */
	defaultExpandedIds?: readonly string[];
	/** What a click on a folder row does: flip it (default), or only open it. */
	folderClick?: 'toggle' | 'expand';
	/** Text shown when no row is left (nothing exists, or the search matches nothing). */
	emptyText?: string;
	/** Where a clicked row goes; rows without one only expand or collapse. */
	target?: (id: string) => WorkbenchTarget | undefined;
	/** Runs before navigating, like `PanelItem.select`. */
	select?: (id: string) => void | Promise<void>;
}
export interface PanelModel {
	/** The main action of the module, shown at the top of the panel ("New session", "New board"). */
	primary?: { label: string; icon: string; run: () => void | Promise<void> };
	/** Show a search field that filters every section by label (and the tree's rows). */
	searchable?: boolean;
	/**
	 * The page matches the query itself (settings search covers every setting of every category). While the search
	 * field has text its rows replace the sections; without this the field only filters the sections by label.
	 */
	search?: { placeholder?: string; query(text: string): Promise<readonly PanelItem[]> };
	sections: readonly PanelSection[];
	/** Rendered below the sections; pages that only need a tree leave `sections` empty. */
	tree?: PanelTree;
}
export interface WorkbenchStatus {
	id: string;
	kind: 'error' | 'running' | 'unread' | 'info';
	label: string;
	target: WorkbenchTarget;
}

export type PageChrome = 'standard' | 'none';
export interface StatusSegment {
	id: string;
	icon: string;
	label: string;
	tone?: 'neutral' | 'running' | 'attention' | 'error';
	count?: number;
	target?: WorkbenchTarget;
	order: number;
}
export interface StatusBarPreferences {
	/** Per-item visibility keyed by item group (`usage`, `sync`, …); a missing key means shown. */
	segments: Record<string, boolean>;
	usageMode: 'verbose' | 'compact';
	usageDisplay: 'used' | 'remaining';
}
/** Transport-only quota model; shell never imports a module implementation. */
export interface UsageProvider {
	provider?: string;
	rateStatus?: 'idle' | 'fetching' | 'ok' | 'error' | 'unavailable';
	planType?: string;
	updatedAt?: number;
	error?: string;
	accountId?: string;
	accounts?: readonly { id: string; name: string; selected: boolean }[];
	id: string;
	name: string;
	account?: string;
	status?: string;
	statusLabel?: string;
	stale?: boolean;
	failed?: boolean;
	windows: readonly { key?: string; windowMinutes?: number; label: string; usedPercent: number; resetsAt?: number }[];
}
export interface UsageSnapshot {
	lastRefreshAt?: number;
	providers: readonly UsageProvider[];
	refreshing: boolean;
	workspace?: {
		root: string;
		total: number;
		sessions: number;
		knownSessions: number;
		error?: string;
		providers: readonly {
			id: string;
			name: string;
			total: number;
			input: number;
			output: number;
			sessions: number;
			knownSessions: number;
		}[];
	};
}
export interface AgentUsage {
	selectAccount?(provider: string, accountId: string): Promise<void>;
	snapshot(): UsageSnapshot;
	subscribe(listener: () => void): () => void;
	refresh(): Promise<void>;
	setDisplay(display: StatusBarPreferences['usageDisplay']): void;
	/** Refresh on focus of this window while the caller shows usage there. Returns the release function. */
	observeWindow?(win: Window): () => void;
}
/** What the Obsidian status bar usage entry needs from the host; the React view is mounted from `shell`. */
export interface UsageStatusProps {
	usage: AgentUsage;
	preferences: StatusBarPreferences;
	/** Changes when the language does, so labels rendered with `t()` refresh. */
	revision: number;
	onPreferences: (next: StatusBarPreferences) => void;
	navigate: (target: WorkbenchTarget) => void;
	report: (error: unknown) => void;
}
export interface UsageStatusHandle {
	update(props: UsageStatusProps): void;
	dispose(): void;
}
