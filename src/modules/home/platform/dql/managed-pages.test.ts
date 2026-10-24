import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { buildPages } from './page-builder';
import { makeLink } from '../../core/dql/values';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';

test('DQL includes managed properties, tasks and links to an ordinary note', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Projects/One.md': '---\nproject: Alpha\n---\n- [ ] Review\n[[Other.md]]', 'Other.md': 'Ordinary note' });
	const pages = await buildPages(vault.app), managed = pages.find(page => page.file.path.startsWith('.huhu/'))!;
	expect(managed.fields.project).toBe('Alpha');
	expect(managed.fields['file.tasks']).toHaveLength(1);
	expect(managed.fields['file.outlinks']).toHaveLength(1);
	expect(pages.find(page => page.file.path === 'Other.md')!.fields['file.inlinks']).toHaveLength(1);
});

test('DQL preserves Markdown URL identities and already-resolved native paths', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Folder/A B.md': 'space', '.huhu/dashboards/Folder/A%20B.md': 'literal', '.huhu/dashboards/Folder/Note.md': '[space](A%20B.md)', 'A.md': 'root', 'Folder/A.md': 'relative', 'Folder/Native.md': 'link chosen by Obsidian' });
	vault.app.metadataCache.resolvedLinks = { 'Folder/Native.md': { 'A.md': 1 } };
	let pages = await buildPages(vault.app);
	expect(pages.find(page => page.file.path === '.huhu/dashboards/Folder/Note.md')?.fields['file.outlinks']).toEqual([makeLink('.huhu/dashboards/Folder/A B.md')]);
	expect(pages.find(page => page.file.path === 'Folder/Native.md')?.fields['file.outlinks']).toEqual([makeLink('A.md')]);
	const files = contentFiles(vault.app);
	await files.rename(files.getFileByPath('.huhu/dashboards/Folder/Note.md')!, '.huhu/dashboards/Moved.md');
	pages = await buildPages(vault.app);
	expect(pages.find(page => page.file.path === '.huhu/dashboards/Moved.md')?.fields['file.outlinks']).toEqual([makeLink('.huhu/dashboards/Folder/A B.md')]);
	expect(pages.find(page => page.file.path === '.huhu/dashboards/Folder/A B.md')?.fields['file.inlinks']).toEqual([makeLink('.huhu/dashboards/Moved.md')]);
});

test('DQL keeps normal pages queryable beside cyclic YAML aliases', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Array.md': '---\nlist: &self [*self]\n---\n[[Good]]', '.huhu/dashboards/Object.md': '---\nloop: &self {self: *self}\n---\n', '.huhu/dashboards/Good.md': '---\ncategory: normal\n---\n' });
	for (const name of ['Good','Moved']) {
		if (name === 'Moved') { const files = contentFiles(vault.app); await files.rename(files.getFileByPath('.huhu/dashboards/Good.md')!, '.huhu/dashboards/Moved.md'); }
		const pages = await buildPages(vault.app);
		expect(pages.filter(page => page.fields.category === 'normal').map(page => page.file.path)).toEqual(['.huhu/dashboards/'+name+'.md']);
		expect(pages.find(page => page.file.path === '.huhu/dashboards/Array.md')!.fields['file.outlinks']).toEqual([makeLink('.huhu/dashboards/'+name+'.md')]);
	}
});
