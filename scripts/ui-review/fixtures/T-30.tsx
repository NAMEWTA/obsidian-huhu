/** Real Home tiles for expense, usage, recent notes, navigator lists, skills and quick actions, plus the expense statistics panel. Only service edges are supplied here. */
import { createRoot, type Root } from 'react-dom/client';
import { createStore } from 'zustand/vanilla';
import { setLanguage, t } from '../../../src/shared/i18n';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { DashboardPage } from '../../../src/modules/home/ui/DashboardPage';
import { ExpenseStatsPanel } from '../../../src/modules/home/ui/expense/ExpenseStatsPanel';
import { ExpenseApplication } from '../../../src/modules/home/core/expense/application';
import { DEFAULT_DASHBOARD_SETTINGS, PRESET_ACTIONS } from '../../../src/modules/home/core/board/types/model';
import type { BoardStore } from '../../../src/modules/home/services/board-store';
import type { ExpenseService } from '../../../src/modules/home/platform/expense/expense-service';
import type { NativeSurfaceContext } from '../../../src/ui/native-surface';

// cmdk brings its own Radix copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };

function extensions(doc: Document) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	const define = (name: string, descriptor: PropertyDescriptor) => {
		if (!Object.getOwnPropertyDescriptor(proto, name)) Object.defineProperty(proto, name, { configurable: true, ...descriptor });
	};
	define('win', { get(this: HTMLElement) { return this.ownerDocument.defaultView; } });
	define('doc', { get(this: HTMLElement) { return this.ownerDocument; } });
	define('addClass', { value(this: HTMLElement, ...names: string[]) { this.classList.add(...names); } });
	define('removeClass', { value(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); } });
	define('empty', { value(this: HTMLElement) { this.replaceChildren(); } });
	define('onWindowMigrated', { value: () => () => {} });
	define('createEl', { value(this: HTMLElement, tag: string, options?: { cls?: string; text?: string }) {
		const el = this.ownerDocument.createElement(tag);
		if (options?.cls) el.className = options.cls;
		if (options?.text) el.textContent = options.text;
		this.append(el);
		return el;
	} });
	define('createDiv', { value(this: HTMLElement, options?: { cls?: string; text?: string }) { return this.createEl('div', options); } });
}
for (const doc of Object.values(docs)) extensions(doc);

const longName = 'Quarterly-planning-and-retrospective-notes-for-the-regional-operations-team 季度规划与复盘笔记（区域运营团队）';
const memory = () => {
	const data = new Map<string, string>();
	return { exists: async (p: string) => data.has(p), read: async (p: string) => data.get(p) ?? '', write: async (p: string, v: string) => { data.set(p, v); }, mkdir: async () => {} };
};
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function expenseService(filled: boolean) {
	const service = new ExpenseApplication(memory() as never, 'data', () => '$') as unknown as ExpenseService;
	if (filled) {
		const today = new Date().getDate();
		for (let i = 0; i < Math.min(today, 12); i++) {
			service.addRecord({ type: 'expense', amount: 8.5 + i * 3.25, category: ['food', 'transport', 'shopping'][i % 3]!, date: day(i), note: i === 0 ? longName : `Entry ${i}` });
			if (i % 4 === 0) service.addRecord({ type: 'income', amount: 120 + i, category: 'salary', date: day(i), note: '' });
		}
	}
	return service;
}

const providers = [
	{ id: 'claude', name: 'Claude', account: 'work@example.com', windows: [{ key: '5h', label: '5h', usedPercent: 42, resetsAt: Date.now() + 90 * 60_000 }, { key: '7d', label: '7d', usedPercent: 63, resetsAt: Date.now() + 3 * 86_400_000 }] },
	{ id: 'codex', name: 'Codex with a very long account label that must wrap', windows: [{ key: '5h', label: '5h', usedPercent: 0 }] },
	{ id: 'gemini', name: 'Gemini', windows: [], status: 'error', statusLabel: 'Sign-in expired', failed: true },
];
const mountState = {
	usage: { providers, refreshing: false } as { providers: typeof providers; refreshing: boolean },
	nav: { recent: [{ path: 'Projects/' + longName + '.md', title: longName }, { path: 'Inbox/Short.md', title: 'Short' }], shortcuts: [] as never[] },
};

const tiles = [
	{ id: 'expense', kind: 'expense', label: 'Expense' },
	{ id: 'usage', kind: 'usage', label: 'Usage' },
	{ id: 'recent', kind: 'recent', label: 'Recent notes' },
	{ id: 'navrecent', kind: 'nav-recent', label: 'Navigator recent' },
	{ id: 'navshort', kind: 'nav-shortcuts', label: 'Navigator shortcuts (empty)' },
	{ id: 'skills', kind: 'skills', label: 'Skills' },
	{ id: 'actions', kind: 'quick-actions', label: 'Quick actions' },
];

function mountAll(doc: Document) {
	const calls = { actions: [] as string[], opened: [] as string[], saved: 0, failSettings: false, failAction: false };
	const usageListeners = new Set<() => void>();
	const usage = { snapshot: () => mountState.usage, subscribe: (l: () => void) => { usageListeners.add(l); return () => usageListeners.delete(l); }, refresh: async () => {}, setDisplay: () => {} };
	const expense = expenseService(true);
	const navListeners = new Set<() => void>();
	const nav = { snapshot: () => mountState.nav, subscribe: (l: () => void) => { navListeners.add(l); return () => navListeners.delete(l); }, open: (target: { key: string }) => { calls.opened.push(target.key); } };
	const settings = structuredClone(DEFAULT_DASHBOARD_SETTINGS);
	settings.workspaces = { files: ['.huhu/dashboards/A'], names: ['Work'], active: 0 };
	settings.recentDocCount = 6;
	settings.skillWidgetButtons = [
		{ id: 's1', label: 'Review a change', icon: 'git-pull-request', agentId: 'claude', skillName: 'review', promptTemplate: '', directSend: false, destination: { kind: 'fresh', cwd: '' } },
		{ id: 's2', label: longName, icon: 'sparkles', agentId: 'codex', skillName: 'plan', promptTemplate: '', directSend: false, destination: { kind: 'fresh', cwd: '' } },
	];
	const files = [
		{ path: 'Notes/' + longName + '.md', basename: longName, stat: { mtime: Date.now() - 3600_000 } },
		{ path: 'Notes/Daily.md', basename: 'Daily', stat: { mtime: Date.now() - 86_400_000 } },
	];
	const widgets = tiles.map((tile) => ({ memberId: `home:${tile.kind}:${tile.id}`, provider: 'home', kind: tile.kind, instanceId: tile.id, label: tile.label }));
	const quickActions = [
		{ name: 'Open the weekly review', icon: 'file-text', type: 'file', target: 'Reviews/Weekly.md' },
		{ name: longName, icon: 'link', type: 'url', target: 'https://example.com' },
	];
	const state = createStore(() => ({
		path: '.huhu/dashboards/A', settings, data: { quickActions, quickActionOrder: [], hiddenPresets: PRESETS_HIDDEN, columns: [], widgets } as never, widgetRevision: 0, generation: 0,
		files, dialog: null as 'section' | null, switching: false, switchError: '', weatherByInstance: {}, save: { status: 'saved' },
	}));
	const store = {
		view: () => store, state, image: async () => '', setDialog() {}, setVisible() {},
		widgets: { expense, usage: () => usage, watchUsage: (l: () => void) => { usageListeners.add(l); return () => usageListeners.delete(l); }, navigatorLists: () => nav, watchNavigatorLists: (l: () => void) => { navListeners.add(l); return () => navListeners.delete(l); }, quickCommands: () => undefined, agents: () => [] },
		host: { app: { vault: { adapter: {} } }, openSettings() {}, switchWorkspace: async () => {}, createWorkspace: async () => {}, renameWorkspace: async () => {}, settings },
		sync: { setBoardGrid: async () => {}, setBoardMembers: async () => {}, addToCanvas: async () => {}, replaceData: async () => {}, deleteColumn: async () => {}, deleteCard: async () => {}, reorderQuickActions: async () => {} },
		weather: async () => {}, cancelWeather() {}, edit: async () => {}, cities: async () => [], switch: async () => {},
		isRecentDocument: () => true,
		openFile: async (path: string) => { calls.opened.push(path); },
		action: async (action: { name: string }) => { calls.actions.push(action.name); if (calls.failAction) throw new Error('The target note no longer exists'); },
		settings: async (change: (s: typeof settings) => void) => { if (calls.failSettings) throw new Error('disk'); change(settings); calls.saved++; },
		commands: () => [],
	} as unknown as BoardStore;
	const container = doc.createElement('section');
	container.dataset.review = 'home';
	container.classList.add('huhu-ui');
	const statsBox = doc.createElement('section');
	statsBox.dataset.review = 'stats';
	statsBox.classList.add('huhu-ui');
	const emptyBox = doc.createElement('section');
	emptyBox.dataset.review = 'stats-empty';
	emptyBox.classList.add('huhu-ui');
	doc.body.append(container, statsBox, emptyBox);
	const context = { togglePanel() {}, openPageMenu() {}, changed() {} } as unknown as NativeSurfaceContext;
	const roots: Root[] = [createRoot(container), createRoot(statsBox), createRoot(emptyBox)];
	roots[0]!.render(<ContainerProviders container={container}><DashboardPage store={store} context={context} /></ContainerProviders>);
	roots[1]!.render(<ContainerProviders container={statsBox}><DesignScope><div style={{ height: 980 }}><ExpenseStatsPanel service={expense} /></div></DesignScope></ContainerProviders>);
	roots[2]!.render(<ContainerProviders container={emptyBox}><DesignScope><div style={{ height: 420 }}><ExpenseStatsPanel service={expenseService(false)} /></div></DesignScope></ContainerProviders>);
	return { container, state, calls, usageListeners, navListeners, dispose: () => roots.forEach((root) => root.unmount()) };
}
const PRESETS_HIDDEN = PRESET_ACTIONS.map((action) => `p:${action.target}`);

Object.assign(window, {
	uiReview: {
		docs,
		tiles: tiles.map((tile) => ({ id: tile.id, label: tile.label })),
		mounts: { main: mountAll(docs.main), other: mountAll(docs.other) },
		setUsage(next: typeof mountState.usage) { mountState.usage = next; for (const mount of Object.values((window as unknown as { uiReview: { mounts: Record<string, { usageListeners: Set<() => void> }> } }).uiReview.mounts)) for (const l of [...mount.usageListeners]) l(); },
		usageFixtures: { providers },
		t,
		configure(language: 'en' | 'zh', theme: string) {
			setLanguage(language);
			for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
		},
		unmount() { for (const mount of Object.values((window as unknown as { uiReview: { mounts: unknown } }).uiReview.mounts as Record<string, { dispose(): void }>)) mount.dispose(); },
	},
});
