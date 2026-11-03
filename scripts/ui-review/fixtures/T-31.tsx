/** Real automations and notifications pages. Only the Obsidian lifecycle, storage and service I/O are supplied here. */
import { Component, type App, type WorkspaceLeaf } from 'obsidian';
import { setLanguage, t, registerMessages } from '../../../src/shared/i18n';
import { messages as automationShared } from '../../../src/shared/i18n/lazy/automation';
import { messages as automationMessages } from '../../../src/modules/automations/i18n';
import { messages as notificationMessages } from '../../../src/modules/notifications/i18n';
import type { AutomationDefinition, AutomationRun } from '../../../src/shared/automation/types';
import type { AutomationsApi } from '../../../src/modules/automations/core/api';
import { createAutomationViewStore } from '../../../src/modules/automations/services/view-store';
import type { AutomationViewHost } from '../../../src/modules/automations/ui/panel-contract';
import { createAutomationsPage } from '../../../src/modules/automations/ui/workbench-page';
import { NotificationService } from '../../../src/modules/notifications/core/service';
import { createInboxPage } from '../../../src/modules/notifications/ui/workbench-page';
import type { NotificationTargetName } from '../../../src/modules/notifications/api';
import type { NativeSurface, NativeSurfaceContext } from '../../../src/ui/native-surface';
import '../../../src/ui/components/command';

registerMessages(automationShared);
registerMessages(automationMessages);
registerMessages(notificationMessages);
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
const cleanups = new WeakMap<object, (() => void)[]>();
Object.assign(Component.prototype, {
	register(this: object, fn: () => void) { const list = cleanups.get(this) ?? []; list.push(fn); cleanups.set(this, list); },
	load() {},
	unload(this: object) { for (const fn of cleanups.get(this) ?? []) fn(); cleanups.delete(this); },
});
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
const copied: string[] = [];
for (const doc of Object.values(docs)) {
	extensions(doc);
	Object.defineProperty(doc.defaultView!.navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied.push(text); }, readText: async () => '' } });
}

const longName = 'Summarize-the-quarterly-engineering-review-and-publish-the-follow-up-notes-to-the-team-wiki-before-Friday-standup-then-archive-the-raw-meeting-recordings-and-update-the-onboarding-checklist-for-every-new-hire-joining-next-month';
const definition = (id: string, name: string, enabled = true): AutomationDefinition => ({
	id, name, enabled, deviceId: 'device', revision: 1, schedule: { kind: 'manual' }, action: { kind: 'notify', body: `Body of ${name}` },
	channels: ['in-app'], notifyOn: 'always', graceMinutes: 720, createdAt: 0, updatedAt: 0,
});
const baseDefinitions = () => [
	definition('auto-digest', 'Daily digest'),
	definition('auto-long', longName),
	definition('auto-backup', 'Weekly backup', false),
	definition('auto-zh', '每周复盘并把结论同步到团队知识库'),
];
const run = (id: string, automation: AutomationDefinition, status: AutomationRun['status'], at: number, message = ''): AutomationRun => ({
	id, automationId: automation.id, revision: 1, title: automation.name, definition: automation, status, trigger: 'manual', scheduledFor: at, startedAt: at, message,
});
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => { resolve = done; });
	return { promise, resolve };
}

type Mode = 'ready' | 'fail' | 'pending';
function mountAutomations(doc: Document) {
	const control = { saveMode: 'ready' as Mode, refreshMode: 'ready' as Mode, saves: 0, release: undefined as undefined | (() => void), runs: [] as string[] };
	const listeners = new Set<() => void>();
	const defs = baseDefinitions();
	const runs = [run('run-ok', defs[0]!, 'succeeded', 1760000000000), run('run-bad', defs[1]!, 'failed', 1760000100000, 'The target folder was not writable')];
	const state = { definitions: defs as AutomationDefinition[], runs: runs as AutomationRun[], loadError: '', executionEnabled: true };
	const emit = () => { for (const fn of listeners) fn(); };
	const service = {
		get executionEnabled() { return state.executionEnabled; }, deviceId: 'device', get loadError() { return state.loadError; },
		get definitions() { return state.definitions; }, get state() { return { runs: state.runs, cursors: {} }; },
		sources: { list: async () => [], save: async () => {}, remove: async () => {}, open: async () => {}, createTask: async () => {} },
		agent: () => undefined,
		subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); },
		save: async (next: AutomationDefinition) => {
			control.saves++;
			if (control.saveMode === 'fail') throw new Error('Could not save: the definitions file is locked');
			state.definitions = state.definitions.map((d) => (d.id === next.id ? next : d));
			emit();
		},
		remove: async () => {}, clearHistory: async () => {}, tick: async () => {},
		run: async (d: AutomationDefinition) => { control.runs.push(d.id); return undefined; },
		stop: async () => {},
	} as unknown as AutomationsApi;
	const view = createAutomationViewStore(service);
	const host: AutomationViewHost = {
		service, store: view.store, inbox() {},
		retry: async () => { state.loadError = ''; emit(); },
		refresh: async () => {
			if (control.refreshMode === 'pending') { const wait = deferred(); control.release = wait.resolve; await wait.promise; }
			if (control.refreshMode === 'fail') throw new Error('Refresh failed: the vault is offline');
		},
		cwd: '/vault', paths: () => [{ path: '/', kind: 'folder' }], commands: () => [],
	};
	const container = doc.createElement('section');
	container.dataset.review = 'automations';
	container.style.cssText = 'height:1000px;margin-bottom:16px;border:1px solid var(--background-modifier-border);display:flex';
	const contentEl = doc.createElement('div');
	contentEl.style.cssText = 'flex:1;min-width:0;min-height:0;height:100%;overflow:hidden';
	container.append(contentEl);
	doc.body.append(container);
	const context = { app: {} as App, leaf: {} as WorkspaceLeaf, contentEl, containerEl: contentEl, close() {}, openPageMenu() {}, togglePanel() {}, changed() {} } as NativeSurfaceContext;
	const ready = (async () => {
		const page = await createAutomationsPage(() => host, () => new Error('off'))(context, { feature: 'automations' }, {}, new AbortController().signal);
		await page.surface.onOpen();
		return page;
	})();
	return {
		container, control, state, emit, ready,
		async navigate(section: string, resourceId?: string) { const page = await ready; await page.navigate?.({ feature: 'automations', section, resourceId }, new AbortController().signal); },
		async dispose() { const page = await ready; await (page.surface as NativeSurface).onClose(); view.dispose(); container.remove(); },
	};
}

class MemoryStorage {
	files = new Map<string, string>();
	async exists(path: string) { return this.files.has(path); }
	async read(path: string) { return this.files.get(path)!; }
	async write(path: string, content: string) { this.files.set(path, content); }
	async mkdir() {}
}
function mountInbox(doc: Document) {
	const control = { failWrites: false, names: new Map<string, NotificationTargetName>([
		['auto-long', { state: 'current', name: 'Quarterly review notes (renamed)' }],
	]) };
	const delivery = { available: () => true, send: () => {}, dispose: () => {} };
	const failing = { open: async () => {} };
	void failing;
	const inbox = new NotificationService(new MemoryStorage() as never, 'inbox.json', async () => {}, delivery, async () => true, async (record) => (record.target ? (control.names.get(record.target.automationId) ?? { state: 'deleted' }) : undefined));
	const original = inbox.markRead.bind(inbox);
	inbox.markRead = (id?: string) => (control.failWrites ? Promise.reject(new Error('The inbox file is locked by another window')) : original(id));
	const container = doc.createElement('section');
	container.dataset.review = 'inbox';
	container.style.cssText = 'height:640px;margin-bottom:16px;border:1px solid var(--background-modifier-border);display:flex';
	const contentEl = doc.createElement('div');
	contentEl.style.cssText = 'flex:1;min-width:0;min-height:0;height:100%;overflow:hidden';
	container.append(contentEl);
	doc.body.append(container);
	const context = { app: {} as App, leaf: {} as WorkspaceLeaf, contentEl, containerEl: contentEl, close() {}, changed() {} } as NativeSurfaceContext;
	const ready = (async () => {
		await inbox.load();
		await inbox.send({ id: 'n1', title: `Finished: ${longName}`, body: 'Succeeded', presentation: { kind: 'automation-run', status: 'succeeded', message: '' } as never, target: { runId: 'run-ok-0001', automationId: 'auto-long' }, channels: ['in-app'] });
		await inbox.send({ id: 'n2', title: 'Failed: Daily digest', body: 'Failed', presentation: { kind: 'automation-run', status: 'failed', message: 'The target folder was not writable' } as never, target: { runId: 'run-bad-0002', automationId: 'auto-gone' }, channels: ['in-app'] });
		await inbox.send({ id: 'n3', title: 'Reminder: 每周复盘并把结论同步到团队知识库', body: 'Time to review', channels: ['in-app'] });
		const page = await createInboxPage(inbox, () => {})(context, { feature: 'notifications', section: 'all' }, {}, new AbortController().signal);
		await page.surface.onOpen();
		return page;
	})();
	return {
		container, control, inbox, ready,
		async filter(section: string) { const page = await ready; await page.navigate?.({ feature: 'notifications', section }, new AbortController().signal); },
		async dispose() { const page = await ready; await (page.surface as NativeSurface).onClose(); container.remove(); },
	};
}

void (async () => {
	const mounts = { main: { auto: mountAutomations(docs.main), inbox: mountInbox(docs.main) }, other: { auto: mountAutomations(docs.other), inbox: mountInbox(docs.other) } };
	await Promise.all(Object.values(mounts).flatMap((m) => [m.auto.ready, m.inbox.ready]));
	Object.assign(window, {
		uiReview: {
			docs, mounts, longName, copied, t,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
			},
			async unmount() { for (const m of Object.values(mounts)) { await m.auto.dispose(); await m.inbox.dispose(); } },
		},
	});
})();
