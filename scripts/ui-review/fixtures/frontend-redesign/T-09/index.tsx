import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createStore } from 'zustand/vanilla';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { DesignScope } from '../../../../../src/ui/react/design-scope';
import { AgentUnavailable, AgentWorkspace } from '../../../../../src/modules/agent/ui/AgentWorkspacePage';
import { agentSettingsPage } from '../../../../../src/modules/agent/ui/settings-page';
import { TerminalSession } from '../../../../../src/modules/agent/services/terminal/session';
import { WorkspaceService } from '../../../../../src/modules/agent/services/workspace-service';
import { createWorkspaceView } from '../../../../../src/modules/agent/services/workspace-view';
import { normalizeTerminalSettings } from '../../../../../src/modules/agent/core/terminal/settings';
import { emptyWorkspace, type TerminalTabData } from '../../../../../src/modules/agent/core/workspace/model';
import type { AgentController } from '../../../../../src/modules/agent/services/controller';
import type { TerminalSessions } from '../../../../../src/modules/agent/services/terminal/sessions';
import type { NativeSurfaceContext } from '../../../../../src/ui/native-surface';
import { CURRENT_NATIVE } from '../../../../../test/fixtures/native/current';
import { installFixtureTheme } from '../shared/fixture-theme';
import { registerMessages, setLanguage, t } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/modules/agent/i18n';
import { InboxPresentation } from '../../../../../src/modules/agent/services/inbox/presentation';
registerMessages(messages);
const states = ['terminal', 'split', 'waiting', 'info', 'new', 'unavailable', 'empty', 'history', 'inbox', 'control', 'usage', 'settings', 'terminal-settings', 'accounts', 'quick', 'skills', 'backup'];
const unavailable = async () => { throw Error('Fixture has no external process or filesystem write port'); };
async function bootstrap() {
 const docs = await readyDocuments(document);
 const fixtureTheme = await installFixtureTheme(docs);
 const owners: Record<string, ReturnType<typeof mount>> = {};
 function mount(doc: Document) {
  const win = doc.defaultView!;
  Object.defineProperty(win.HTMLElement.prototype, 'win', { configurable: true, get(this: HTMLElement) { return this.ownerDocument.defaultView; } });
  for (const [method, add] of [['addClass', true], ['removeClass', false]] as const) Object.defineProperty(win.HTMLElement.prototype, method, { configurable: true, value(this: HTMLElement, ...names: string[]) { for (const name of names) this.classList.toggle(name, add); } });
  Object.defineProperty(win.HTMLElement.prototype, 'toggleClass', { configurable: true, value(this: HTMLElement, name: string, force: boolean) { this.classList.toggle(name, force); } });
  Object.defineProperty(win.HTMLElement.prototype, 'createDiv', { configurable: true, value(this: HTMLElement, options: { cls?: string } = {}) { const child = this.ownerDocument.createElement('div'); child.className = options.cls ?? ''; this.append(child); return child; } });
  const host = doc.createElement('main'); host.className = 'huhu-ui'; host.dataset.huhuLeaf = ''; host.style.cssText = 'display:flex;height:100vh;min-width:0'; doc.body.append(host);
  const nav = doc.createElement('aside'); nav.style.cssText = 'width:var(--hu-panel-w,272px);flex-shrink:0;border-right:1px solid var(--hu-line);';
  const content = doc.createElement('div'); content.style.cssText = 'flex:1;min-width:0;height:100%'; host.append(nav, content);
  const root = createRoot(content);
  const leaf = { view: { containerEl: host } };
  const context = { contentEl: host, navigationEl: nav, leaf, togglePanel() { nav.style.display = nav.style.display === 'none' ? '' : 'none'; } } as unknown as NativeSurfaceContext;
  const settingsStore = createStore(() => normalizeTerminalSettings({ renderer: 'dom', fontSize: 13, lineHeight: 21 / 13 }));
  const settings = { get: settingsStore.getState, subscribe: settingsStore.subscribe, update: async (fn: (draft: ReturnType<typeof settingsStore.getState>) => void) => { const next = structuredClone(settingsStore.getState()); fn(next); settingsStore.setState(next, true); } };
  const map = new Map<string, TerminalSession>(); const listeners = new Set<() => void>();
  const sessions = { get: (id: string) => map.get(id), subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); }, managedRef: () => undefined, focus() {}, remove(id: string) { map.get(id)?.dispose(); map.delete(id); } } as unknown as TerminalSessions;
  const persistence = { store: createStore(emptyWorkspace), ready: Promise.resolve(), flush: async () => {}, dispose: async () => {} };
  const workspace = new WorkspaceService(persistence, sessions, { shell: unavailable, agent: unavailable, resume: unavailable, account: () => '', report: (error: unknown) => { diagnostics.push(String(error)); } });
  const view = createWorkspaceView({ agentControl: false });
  const records = { selectedSpaceId: 'fixture-space', spaces: { 'fixture-space': { id: 'fixture-space', name: 'obsidian-huhu', archived: false } }, sessions: { one: { id: 'one', spaceId: 'fixture-space', title: 'Design tokens', kind: 'agent', agentId: 'codex', archived: false } }, historyOwners: {} };
  const spacesStore = createStore(() => ({ records, loading: false, error: '' }));
  const historyStore = { store: createStore(() => ({ rows: [{ key: 'fixture-history', agentId: 'codex', sessionId: 'fixture-session', title: 'Historical review', cwd: '/fixture-vault', accountKey: '{}', transcriptPath: '/fixture-vault/history', modifiedAtMs: Date.now(), inVault: true, sourceStatus: 'available', usage: { input: 400, output: 80, cacheRead: 0, cacheWrite: 0, cost: null, known: true }, metadata: {}, messageCount: 2, firstPrompt: 'Review the interface', turns: [], previewState: 'loaded' }], terminalRows: [], loading: false, error: '', warnings: [] })), refresh: async () => {}, preview: async () => {}, annotate: unavailable };
  const usageStore = { store: createStore(() => ({ providers: [], refreshing: false })), observeWindow: () => () => {}, refresh: async () => {} };
  const presentation = new InboxPresentation();
  const toolsState = createStore(() => ({ tools: {} }));
  const controller = { workspace, sessions, settings, spaces: { store: spacesStore, list: () => Object.values(records.spaces), canWrite: false }, historyStore, usageStore,
   stats: { store: createStore(() => ({ agentsLaunched: 2, agentWorkMs: 3600000, firstEventAt: null })) },
   agents: { store: createStore(() => ({ detected: {}, refreshing: false, error: '' })), list: () => [], refresh: async () => {}, setEnabled: unavailable },
   tools: { store: toolsState, get: () => ({ phase: 'idle', paths: [], files: [] }), hasPackage: () => false },
   inbox: { presentation, listMessages: async () => ({ rows: [], generation: 1, highWaterSequence: 0 }), readMessage: unavailable, ackMessage: unavailable, sendMessage: unavailable },
   app: { workspace: { on: () => ({}), offref() {}, getMostRecentLeaf: () => leaf, activeLeaf: leaf }, keymap: { pushScope() {}, popScope() {} } },
   vaultPath: () => '/fixture-vault', agentTitle: (id: string) => id, spaceChoices: () => [], runtime: { listAgents: () => [] }, shells: () => [], open: unavailable, show() {}, terminalControl: unavailable,
  } as unknown as AgentController;
  const skills = { state: createStore(() => ({ records: [], roots: [], unavailable: [], pending: [], loading: false, loaded: true, error: '' })), refresh: async () => {}, open: unavailable, toggle: unavailable, update: unavailable };
  const Settings = agentSettingsPage(() => controller, undefined, true, () => skills as unknown as import('../../../../../src/modules/agent/services/skill-manager').SkillManager);
  let mode = 'terminal', visible = true; const diagnostics: string[] = [];
  function addSession(id: string, title: string, waiting = false): TerminalTabData {
   const session = new TerminalSession({ id, sid: map.size + 1, kind: 'agent', title, cwd: '/fixture-vault', agentId: 'codex', cols: 80, rows: 24, scrollback: 100, platform: 'linux', colors: () => ({ foreground: '#2A2620', background: '#F5F2EB', cursor: '#2A2620' }) });
   session.attach({ ...CURRENT_NATIVE, input() { throw Error('Fixture input unavailable'); }, resize() {}, acknowledge() {}, end() {} }, 1);
   session.receive(new TextEncoder().encode('› Review the interface\r\n\x1b[32m✓ Existing terminal screen retained\x1b[0m\r\n中文输入与 resize fixture\r\n'));
   if(waiting) session.setActivity('waiting');
   map.set(id, session);
   return { id: `tab-${id}`, kind: 'terminal', title, agentId: 'codex', createdAt: 1, updatedAt: 1, sessionIds: [id], focusedSessionId: id, paneLayout: { kind: 'pane', session: id }, panes: { [id]: { cwd: '/fixture-vault', spaceId: 'fixture-space', persistentSessionId: id } }, state: waiting ? 'waiting' : 'idle', unread: waiting };
  }
  function populate(waiting = false, split = false) {
   for (const session of map.values()) session.dispose(); map.clear();
   const first = addSession('one', 'Design tokens', waiting), second = addSession('two', 'Review tree');
   if (split) { first.sessionIds.push('two'); first.panes.two = second.panes.two!; first.paneLayout = { kind: 'split', direction: 'row', ratio: 0.5, first: first.paneLayout, second: second.paneLayout }; }
   workspace.store.setState({ version: 1, tabs: split ? { [first.id]: first } : { [first.id]: first, [second.id]: second }, groups: [{ id: 'group-one', tabIds: split ? [first.id] : [first.id, second.id], recentTabIds: [], activeTabId: first.id }], activeGroupId: 'group-one', layout: { kind: 'group', groupId: 'group-one' }, closedTabs: [] }, true);
  }
  function render() {
   const inSettings = ['settings', 'terminal-settings', 'accounts', 'quick', 'skills', 'backup'].includes(mode);
   nav.style.display = inSettings || host.clientWidth < 600 ? 'none' : '';
   flushSync(() => root.render(<HuhuProviders ownerDocument={doc} visible={visible}><DesignScope className="h-full min-w-0"><div data-review-state={mode} className="h-full min-w-0">{mode === 'unavailable' ? <AgentUnavailable /> : inSettings ? <div className="h-full overflow-auto p-5"><Settings resourceId={mode === 'settings' ? 'agents' : mode === 'terminal-settings' ? 'terminal' : mode} /></div> : <AgentWorkspace controller={controller} view={view} context={context} />}</div></DesignScope></HuhuProviders>));
  }
  populate(); render();
  return { host, root, controller, workspace, view, map, diagnostics, render,
   show(state: string) { mode = state; view.setState({ control: false, history: false }); if (state === 'empty') workspace.store.setState(emptyWorkspace(), true); else if (['terminal', 'split', 'waiting'].includes(state)) populate(state === 'waiting', state === 'split'); else if (state === 'history') view.setState({ history: true }); else if (state === 'inbox' || state === 'control') view.setState({ control: true, agentTool: state }); else if (state === 'usage') workspace.openPage('usage'); render(); },
   hide(value: boolean) { visible = !value; render(); },
   async dispose() { flushSync(() => root.unmount()); for (const session of map.values()) session.dispose(); map.clear(); presentation.dispose(); await workspace.dispose(); host.remove(); },
  };
 }
 for (const [name, doc] of Object.entries(docs)) owners[name] = mount(doc);
 Object.assign(globalThis, { uiReview: { docs, owners, states, text: t,
  show(name: string, state: string) { owners[name]!.show(state); },
  async configure(sample: Record<string, unknown>) { setLanguage(sample.language === 'zh' ? 'zh' : 'en'); await fixtureTheme.configure(sample); for(const owner of Object.values(owners)) owner.render(); },
  async dispose() { await Promise.all(Object.values(owners).map(owner => owner.dispose())); await fixtureTheme.dispose(); },
 } });
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
