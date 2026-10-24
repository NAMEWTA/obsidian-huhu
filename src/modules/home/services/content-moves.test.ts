import { expect, test } from 'vitest';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { BoardRegistry, type BoardRegistryHost } from './board-registry';

test('the board registry follows completed moves during recovery and after a missed event at restart', async () => {
	for (const failure of ['copy', 'finish']) {
		const vault = memoryVault({ '.huhu/dashboards/Old.md': 'board', 'Ref.md': '[[Old]]' }), files = contentFiles(vault.app); await files.refresh();
		let state: ReturnType<BoardRegistryHost['read']> = { dashboardFile: '.huhu/dashboards/Old', workspaceFiles: ['.huhu/dashboards/Old'], workspaceNames: ['My board'] };
		const host: BoardRegistryHost = { app: vault.app, read: () => state, write: async next => { state = next; }, repointAll: async () => {}, refreshAll: () => {} };
		const registry = new BoardRegistry(host); registry.watch(() => {});
		let failed = false; const copy = vault.adapter.copy, write = vault.adapter.write;
		vault.adapter.copy = async (from, to) => { await copy(from, to); if (failure === 'copy' && !failed && to === '.huhu/dashboards/New.md') { failed = true; throw new Error('copy completed'); } };
		vault.adapter.write = async (path, text) => { if (failure === 'finish' && !failed && path === '.huhu/content-moves/manifest.json' && !text.includes('"pending"')) { failed = true; throw new Error('finish denied'); } await write(path, text); };
		try { await files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md'); } catch { /* Commit can precede a failed acknowledgement. */ }
		await files.refresh(); await registry.prune();
		expect(state).toEqual({ dashboardFile: '.huhu/dashboards/New', workspaceFiles: ['.huhu/dashboards/New'], workspaceNames: ['My board'] });
		const restart = memoryVault(Object.fromEntries(vault.contents)); await contentFiles(restart.app).refresh();
		state = { dashboardFile: '.huhu/dashboards/Old', workspaceFiles: ['.huhu/dashboards/Old'], workspaceNames: ['My board'] };
		const reopened = new BoardRegistry({ ...host, app: restart.app }); await reopened.recoverMoves(); reopened.watch(() => {}); await reopened.prune();
		expect(state.dashboardFile).toBe('.huhu/dashboards/New');
	}
});

test('external reuse of an old path retires its move identity before a later deletion', async () => {
	const vault = memoryVault({ '.huhu/dashboards/A.md': 'original' }), files = contentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/A.md')!, '.huhu/dashboards/B.md');
	await vault.adapter.write('.huhu/dashboards/A.md', 'different identity'); await files.refresh();
	let state: ReturnType<BoardRegistryHost['read']> = { dashboardFile: '.huhu/dashboards/A', workspaceFiles: ['.huhu/dashboards/A', '.huhu/dashboards/B'], workspaceNames: ['New identity', 'Original'] };
	const registry = new BoardRegistry({ app: vault.app, read: () => state, write: async next => { state = next; }, repointAll: async () => {}, refreshAll: () => {} }); registry.watch(() => {});
	const events: string[] = []; files.subscribe(event => events.push(event.kind));
	await vault.adapter.remove('.huhu/dashboards/A.md'); await files.refresh(); await registry.prune();
	expect(events).toContain('delete'); expect(events).not.toContain('rename');
	expect(state.workspaceNames).toEqual(['Original']);
	expect(files.resolveLink('A')).toBeNull();
});
