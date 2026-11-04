import { expect, test } from 'vitest';
import { SyncEngine } from './sync';
import { parse, serialize } from '../../core/board/parser/index';
import { generateDefaultMarkdown } from '../../core/board/parser/default-document';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';

test('replaceData adopts the new board data and writes it to disk', async () => {
	(globalThis as { window?: unknown }).window ??= globalThis;
	const boardPath = '.huhu/dashboards/Board.md';
	const fixture = memoryVault({ [boardPath]: serialize(parse(generateDefaultMarkdown())) });
	const engine = new SyncEngine(fixture.app, { dashboardFile: '.huhu/dashboards/Board' } as never);
	await engine.init();
	await engine.replaceData({
		...engine.getData(),
		quickActions: [{ name: 'Adopted', icon: 'file-text', type: 'file', target: 'x.md' }],
	} as never);
	await engine.writeQueue;
	expect(engine.getData().quickActions[0]?.name).toBe('Adopted');
	expect(parse(await fixture.app.vault.adapter.read(boardPath)).quickActions[0]?.name).toBe('Adopted');
	await engine.close?.();
});
