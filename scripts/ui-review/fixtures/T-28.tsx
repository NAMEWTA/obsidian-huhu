/** The real task page (independent and board-embedded), editor dialog and Through date. Only the task repository and resource edges are supplied here. */
import { createRoot, type Root } from 'react-dom/client';
import { setLanguage, t } from '../../../src/shared/i18n';
import { ContainerProviders } from '../../../src/ui/react/providers';
import { createTaskRepository } from '../../../src/modules/task/platform/repository';
import { createTaskService } from '../../../src/modules/task/services/service';
import { wallTime } from '../../../src/modules/task/core/time';
import type { TaskResources, TaskService, TaskSnapshot, TaskViews } from '../../../src/modules/task/api';
import { TaskPage } from '../../../src/modules/task/ui/TaskPage';
import { TaskWorkbench } from '../../../src/modules/task/ui/workbench-page';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { editTask } from '../../../src/modules/task/ui/runtime';

// cmdk brings its own Radix copy, as in the production bundle; the owner-document adapter expects both.
import '../../../src/ui/components/command';
import '../../../src/ui/components/dropdown-menu';
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

const longTitle = 'Prepare the quarterly planning review for every regional office and circulate it 为每个区域办公室准备季度规划评审并分发给所有相关同事确认';
type Mode = 'ready' | 'loading' | 'error';

async function mountTasks(doc: Document) {
	let raw: string | null = null;
	const now = wallTime('2026-11-04', '10:00', 'Asia/Singapore');
	const base = createTaskService({
		deviceId: 'ui-review',
		now: () => now,
		remindersAvailable: () => true,
		repository: createTaskRepository({ read: async () => raw, process: async (change) => { raw = change(raw); return raw; } }),
	});
	await base.load();
	const base_ = { timezone: 'Asia/Singapore', description: '', relations: [] as never[] };
	for (const [id, title, date, extra] of [
		['long', longTitle, '2026-12-31', { relations: [{ kind: 'file' as const, path: 'Projects/Planning/Regional-offices/Quarterly-review-notes-with-a-very-long-file-name.md' }] }],
		['late', 'Overdue report', '2026-10-01', {}],
		['soon', 'Sign off', '2026-11-05', {}],
		['done', 'Finished report', '2026-10-20', {}],
	] as const)
		await base.execute({ kind: 'create', commandId: id, draft: { ...base_, ...extra, title, due: { date, time: '09:30' } } });
	await base.execute({ kind: 'complete', commandId: 'complete-done', id: 'task:done', expectedRevision: 1 });

	const control = { mode: 'ready' as Mode, fail: false, executes: 0, refreshes: 0 };
	const listeners = new Set<() => void>();
	let cached: { key: string; value: TaskSnapshot } | undefined;
	const snapshot = (): TaskSnapshot => {
		const inner = base.snapshot();
		const key = `${control.mode}`;
		if (cached && cached.key === key && cached.inner === inner) return cached.value;
		const value: TaskSnapshot = control.mode === 'ready' ? inner : { ...inner, status: control.mode, ...(control.mode === 'error' ? { error: { code: 'write-failed' as const, message: 'offline' } } : {}) };
		cached = { key, value, inner } as never;
		return value;
	};
	const notify = () => { for (const fn of listeners) fn(); };
	const baseUnsubscribe = base.subscribe(notify);
	const tasks: TaskService = {
		...base,
		snapshot,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		refresh: async () => { control.refreshes++; control.mode = 'ready'; notify(); return snapshot(); },
		execute: async (command, signal) => {
			control.executes++;
			if (control.fail) throw new Error('write failed');
			return base.execute(command, signal);
		},
	};
	const resources: TaskResources = {
		search: async () => [],
		resolve: async (resource) => ({ resource, label: resource.kind === 'archive' ? resource.id : resource.path, status: resource.kind === 'file' ? 'available' : 'missing' }),
		open: async () => {},
	};
	const abort = new AbortController();
	const views: TaskViews = {
		edit: (request) => editTask(request, tasks, resources, abort.signal),
		open: async () => {},
		mount: () => () => {},
	};
	const make = (name: string, compact: boolean) => {
		const container = doc.createElement('section');
		container.dataset.review = name;
		container.classList.add('huhu-ui');
		container.style.cssText = `height:${compact ? 520 : 1000}px;margin-bottom:16px;border:1px solid var(--background-modifier-border)`;
		doc.body.append(container);
		const root: Root = createRoot(container);
		const draw = () => root.render(<ContainerProviders container={container}>{compact ? <DesignScope className="h-full min-h-0"><TaskPage tasks={tasks} views={views} resources={resources} compact /></DesignScope> : <TaskWorkbench tasks={tasks} views={views} resources={resources} />}</ContainerProviders>);
		draw();
		return { container, root, draw };
	};
	const page = make('task-page', false), widget = make('task-widget', true);
	return { tasks, control, notify, page, widget, count: () => base.query({ filter: 'all' }).total, dispose: () => { page.root.unmount(); widget.root.unmount(); abort.abort(); baseUnsubscribe(); void base.dispose(); } };
}

void (async () => {
	const mounts = { main: await mountTasks(docs.main), other: await mountTasks(docs.other) };
	Object.assign(window, {
		uiReview: {
			docs, mounts, longTitle, t,
			configure(language: 'en' | 'zh', theme: string) {
				setLanguage(language);
				for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
				// The shell redraws a page when the language changes.
				for (const mount of Object.values(mounts)) { mount.page.draw(); mount.widget.draw(); }
			},
			unmount() { for (const mount of Object.values(mounts)) mount.dispose(); },
		},
	});
})();
