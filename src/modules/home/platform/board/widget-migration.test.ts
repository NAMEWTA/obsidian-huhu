import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { taskMetaSuffix } from '../../../../shared/automation/metadata';
import { parse } from '../../core/board/parser/parse';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types';
import { consolidateBoardWidgets } from './widget-migration';

const path = '.huhu/dashboards/Board.md';
const meta = taskMetaSuffix({ id: 'kept-task', deviceId: 'original-device' });
const source = `---
columns: [{name: Memo, type: memo}]
widgets: [{memberId: shortcuts, provider: home, kind: shortcuts, instanceId: default}]
grid: {v: 2, lg: [{i: 'widget:shortcuts', x: 3, y: 4, w: 6, h: 2}]}
---
## Memo
### Keep everything
id: original
type: generic
custom-property: keep
Body with [[./Related#Section|label]] and ![cover](./cover.png).
- [ ] Parent${meta}
  - [x] Child
`;
const settings = () => ({
	...structuredClone(DEFAULT_DASHBOARD_SETTINGS),
	shortcutButtons: [{ id: 'open', label: 'Open', type: 'file' as const, target: 'Related.md', icon: 'file-text' }],
});

test('migration keeps metadata and nested content, resolves links, preserves tile geometry and is replayable', async () => {
	const vault = memoryVault({
		[path]: source,
		'.huhu/dashboards/Related.md': '# Section',
		'.huhu/dashboards/cover.png': 'image',
	});
	await contentFiles(vault.app).refresh();
	const data = parse(source),
		config = settings();
	const migrated = await consolidateBoardWidgets(vault.app, path, data, config);
	const notes = [...vault.contents.entries()].filter(([name]) => name.startsWith('huhu/收件箱/'));
	expect(notes).toHaveLength(1);
	expect(notes[0]![1]).toContain('custom-property: keep');
	expect(notes[0]![1]).toContain(`- [ ] Parent${meta}\n  - [x] Child`);
	expect(notes[0]![1]).toContain('[[/.huhu/dashboards/Related.md#Section|label]]');
	expect(notes[0]![1]).toContain('/.huhu/dashboards/cover.png');
	expect(migrated.columns[0]!.cards).toEqual([]);
	expect(migrated.grid!.lg[0]).toMatchObject({ x: 3, y: 4, w: 6, h: 2 });
	expect(migrated.widgets?.map((widget) => widget.kind)).toEqual(['quick-actions']);
	expect(migrated.quickActions[0]).toMatchObject({ name: 'Open', target: 'Related.md' });
	config.shortcutButtons[0]!.label = 'Changed globally';
	expect(migrated.quickActions[0]!.name).toBe('Open');
	await consolidateBoardWidgets(vault.app, path, data, settings());
	expect([...vault.contents.keys()].filter((name) => name.startsWith('huhu/收件箱/'))).toHaveLength(1);
	expect(vault.contents.get(path)).toBe(source);
	expect(data.columns[0]!.cards).toHaveLength(1);
	expect(await consolidateBoardWidgets(vault.app, path, migrated, config)).toBe(migrated);
});

test('a changed migration destination refuses retirement without overwriting either source', async () => {
	const vault = memoryVault({ [path]: source });
	await contentFiles(vault.app).refresh();
	const data = parse(source);
	await consolidateBoardWidgets(vault.app, path, data, settings());
	const target = [...vault.contents.keys()].find((name) => name.startsWith('huhu/收件箱/'))!;
	await vault.adapter.write(target, 'User edited this note');
	await expect(consolidateBoardWidgets(vault.app, path, data, settings())).rejects.toThrow();
	expect(vault.contents.get(path)).toBe(source);
	expect(vault.contents.get(target)).toBe('User edited this note');
	expect(data.columns[0]!.cards).toHaveLength(1);
});

test('web shortcuts retain the original card text in the inbox', async () => {
	const raw = '## Links\n### Website\nid: site\ntype: web\nlink: https://example.com\nExtra notes\n';
	const vault = memoryVault({ [path]: raw });
	await contentFiles(vault.app).refresh();
	const migrated = await consolidateBoardWidgets(vault.app, path, parse(raw), settings());
	expect(migrated.quickActions[0]).toMatchObject({ type: 'url', target: 'https://example.com' });
	expect(
		[...vault.contents.values()].some((text) => text.includes('huhu-migration:') && text.includes('Extra notes')),
	).toBe(true);
});
