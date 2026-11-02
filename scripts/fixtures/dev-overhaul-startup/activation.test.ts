import { expect, test, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { readdir, stat, rename, rm } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ModuleContext, ModuleInstance } from '../../../src/app/contracts/module';
import { musicVaultFixture } from '../../music-vault-fixture';

// Production factories/runtimes remain intact. Only the Obsidian/Electron host is
// replaced; each sample uses an empty, real temporary vault and its own device.
test('isolated activation intervals for the other startup modules', async () => {
	const rows: Array<Record<string, unknown>> = [];
	for (const id of ['notifications', 'archives', 'automations', 'agent', 'versioning']) {
		const fixture = await musicVaultFixture(), cleanup: Array<() => void> = [];
		const { app } = fixture, root = app.vault.adapter.getBasePath();
		const events = new EventTarget();
		Object.assign(app.workspace.containerEl.win, {
			setInterval, clearInterval, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
		});
		vi.stubGlobal('window', app.workspace.containerEl.win);
		Object.assign(app.vault.adapter, {
			list: async (directory: string) => {
				const entries = await readdir(path.join(root, directory), { withFileTypes: true });
				return { files: entries.filter(x => x.isFile()).map(x => path.posix.join(directory, x.name)), folders: entries.filter(x => x.isDirectory()).map(x => path.posix.join(directory, x.name)) };
			},
			stat: async (file: string) => { try { const s = await stat(path.join(root, file)); return { type: s.isDirectory() ? 'folder' : 'file', ctime: s.ctimeMs, mtime: s.mtimeMs, size: s.size }; } catch { return null; } },
			rename: (from: string, to: string) => rename(path.join(root, from), path.join(root, to)),
			remove: (file: string) => rm(path.join(root, file), { force: true }),
		});
		Object.assign(app.vault, { configDir: '.obsidian', on: () => ({}), offref() {}, getFiles: () => [], getMarkdownFiles: () => [], getAllLoadedFiles: () => [], getAbstractFileByPath: () => null, getFileByPath: () => null });
		const layout: Array<() => void> = [];
		Object.assign(app.workspace, { layoutReady: id === 'versioning', onLayoutReady: (fn: () => void) => id === 'versioning' ? fn() : layout.push(fn), on: () => ({}), offref() {}, getLeavesOfType: () => [], getMostRecentLeaf: () => null, getActiveViewOfType: () => null });
		Object.assign(app, { metadataCache: { on: () => ({}), offref() {}, getFileCache: () => null }, fileManager: {}, commands: {} });
		const context = {
			app, env: { desktop: true, mobile: false, phone: false }, manifest: { dir: root },
			settings: { bind: (_name: string, schema: { defaults(): unknown }) => { let settings = schema.defaults(); return { get: () => settings, update: async (change: (draft: unknown) => void) => { change(settings); }, subscribe: () => () => {} }; } },
			lifetime: { register: (fn: () => void) => cleanup.push(fn), registerEvent() {}, registerDomEvent() {}, registerInterval: (timer: ReturnType<typeof setInterval>) => cleanup.push(() => clearInterval(timer)) },
			services: { peek: () => undefined, watch: () => () => {}, acquire: async () => undefined },
			contributions: { collect: async () => [], watch: () => () => {} },
			shell: { refresh() {}, open: async () => {} }, commands: { add() {} }, editor: { addExtension() {} },
			documents: { subscribe: () => () => {}, subscribeFocus: () => () => {}, list: () => [], current: () => undefined },
		} as unknown as ModuleContext;
		let instance: ModuleInstance | undefined;
		const row: Record<string, unknown> = { module: id, vault: 'fresh empty temporary directory', host: 'Obsidian/Electron fixture', runtime: 'production', layoutReady: id === 'versioning', status: 'unverified' };
		let phase = 'import', start = performance.now();
		try {
			const factory = (await import(`../../../src/modules/${id}/module.ts`)).default as (context: ModuleContext) => ModuleInstance;
			row.importMs = performance.now() - start; phase = 'factory'; start = performance.now();
			instance = await factory(context); row.factoryMs = performance.now() - start;
			phase = 'activate'; start = performance.now();
			await instance.activate?.(new AbortController().signal);
			row.activateMs = performance.now() - start; row.status = 'passed';
		} catch (error) { row.status = 'blocked'; row.phase = phase; row.error = error instanceof Error ? error.message : String(error); }
		finally {
			try { await instance?.dispose('unload'); } catch (error) { row.cleanupError = String(error); row.status = 'blocked'; }
			for (const fn of cleanup.reverse()) fn();
			// Complete delayed layout observers only after revoking their owners.
			for (const fn of layout) fn();
			await new Promise<void>(resolve => setImmediate(resolve));
			await fixture.dispose(); vi.unstubAllGlobals(); rows.push(row);
		}
	}
	mkdirSync('temp/dev-overhaul/startup', { recursive: true });
	writeFileSync('temp/dev-overhaul/startup/activation-results-tools.json', JSON.stringify({ platform: process.platform, node: process.version, scope: 'isolated activate call, not Obsidian startup', rows }, null, 2) + '\n');
	expect(rows.map(row => ({ module: row.module, status: row.status, error: row.error }))).toEqual(['notifications', 'archives', 'automations', 'agent', 'versioning'].map(module => ({ module, status: 'passed', error: undefined })));
});
