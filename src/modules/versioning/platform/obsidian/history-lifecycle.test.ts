import { MarkdownView, TFile, type App, type Component, type WorkspaceLeaf } from 'obsidian';
import { afterEach, expect, test, vi } from 'vitest';
import { SettingsStore } from '../../../../shared/settings/store';
import type { TextStorage } from '../../../../shared/storage/ports';
import { syncSettings } from '../../settings';
import { AutomaticHistory } from '../../services/automatic-history';
import { LocalHistoryStore } from '../../services/local-history-store';
import { createHistoryCapture } from './history-capture';

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>(done => { resolve = done; });
	return { promise, resolve };
}
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

async function fixture() {
	const files = new Map<string, string>(), directories = new Set<string>();
	let blockWrite: ((path: string) => Promise<void>) | undefined;
	const storage: TextStorage = { exists: async path => files.has(path) || directories.has(path), read: async path => files.get(path)!,
		write: async (path, text) => { await blockWrite?.(path); files.set(path, text); }, mkdir: async path => { directories.add(path); } };
	const settingsStore = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, {
		timers: { set: (run, ms) => setTimeout(run, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) },
	});
	const settings = settingsStore.bind('versioning', syncSettings);
	await settings.update(value => { value.localHistoryEnabled = true; }, { persist: 'immediate' });
	let text = 'original';
	const file = Object.assign(new TFile(), { path: 'old.md' });
	const view = Object.assign(new MarkdownView({} as WorkspaceLeaf), { file, editor: { getValue: () => text } });
	const leaf = { view } as unknown as WorkspaceLeaf; Object.assign(view, { leaf });
	const other = Object.assign(new MarkdownView({} as WorkspaceLeaf), { file: Object.assign(new TFile(), { path: 'other.md' }), editor: { getValue: () => 'other' } });
	const otherLeaf = { view: other } as unknown as WorkspaceLeaf; Object.assign(other, { leaf: otherLeaf });
	let active = view;
	const events = new Map<string, (...args: unknown[]) => void>();
	const app = { vault: { configDir: '.obsidian', on: (name: string, listener: (...args: unknown[]) => void) => { events.set(name, listener); } },
		workspace: { getActiveViewOfType: () => active, getLeavesOfType: () => [leaf, otherLeaf],
			on: (name: string, listener: (...args: unknown[]) => void) => { events.set(name, listener); } } } as unknown as App;
	const history = new LocalHistoryStore(storage, 'device-1');
	const protection = vi.fn(async (_signal?: AbortSignal) => {});
	const captures = createHistoryCapture(app, () => settings.get().localHistoryEnabled);
	const automatic = new AutomaticHistory({ settings, history, capture: captures.capture, assertProtection: protection,
		timers: { setTimeout: () => 1, clearTimeout() {} } as unknown as Window });
	const errors: unknown[] = [];
	captures.attach({ register() {}, registerEvent() {} } as unknown as Component, automatic, error => errors.push(error));
	automatic.start();
	cleanups.push(() => automatic.stop());
	return { files, history, automatic, protection, errors,
		block: (next?: (path: string) => Promise<void>) => { blockWrite = next; },
		edit(next: string) { text = next; events.get('editor-change')?.(view.editor, view); },
		rename(path: string) { const old = file.path; file.path = path; events.get('rename')?.(file, old); },
		remove() { events.get('delete')?.(file); },
		recreate(next: string) { text = next; view.file = Object.assign(new TFile(), { path: 'old.md' }); events.get('file-open')?.(view.file); },
		switch() { active = other; events.get('active-leaf-change')?.(otherLeaf); },
		async settle() { await Promise.resolve(); await automatic.sample('important', []); expect(errors).toEqual([]); },
	};
}

test('host rename preserves the legitimate lineage without allowing outgoing capture to recreate the old path', async () => {
	const f = await fixture(); await f.automatic.sample('interval');
	const original = (await f.history.list('old.md'))[0]!;
	f.rename('new.md'); await vi.waitFor(async () => expect(await f.history.list('old.md')).toEqual([]));
	f.switch(); await f.settle();
	expect(await f.history.list('old.md')).toEqual([]);
	expect((await f.history.list('new.md')).map(entry => entry.documentId)).toContain(original.documentId);
});

test.each(['.private/old.md', '.obsidian/old.md', null])('retiring %s during queued preflight prevents hidden or deleted content from rebuilding a visible identity', async target => {
	const f = await fixture();
	const gate = deferred(), started = deferred();
	f.protection.mockImplementationOnce(async () => { started.resolve(); await gate.promise; });
	const pending = f.automatic.sample('interval'); await started.promise;
	if (target) f.rename(target); else f.remove();
	f.switch(); gate.resolve(); await pending; await f.settle();
	expect(await f.history.list('old.md')).toEqual([]);
	if (!target) {
		f.recreate('recreated'); await f.automatic.sample('important');
		const entries = await f.history.list('old.md');
		expect(await Promise.all(entries.map(entry => f.history.readSnapshot(entry.id)))).toEqual(['recreated']);
	}
});

test.each(['object', 'index'])('a rename while the %s write is in flight cannot publish an old-path snapshot after identity retirement', async stage => {
	const f = await fixture(); await f.automatic.sample('interval');
	const original = (await f.history.list('old.md'))[0]!;
	const gate = deferred(), started = deferred();
	f.edit('changed before moving');
	f.block(async path => { if (stage === 'object' ? path.includes('/objects/') : path.endsWith('/history/index.json')) { started.resolve(); await gate.promise; } });
	const pending = f.automatic.sample('interval'); await started.promise;
	f.rename('.private/old.md'); f.switch(); gate.resolve(); await pending; f.block(); await f.settle();
	expect(await f.history.list('old.md')).toEqual([]);
	expect(await f.history.readSnapshot(original.id)).toBe('original');
});
