import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { ContentFiles, contentFiles } from '../../../../host/obsidian/storage/content-files';
import { extractCoverValue, resolveLibraryCover } from './library-presentation';

test('cover rewriting preserves a quoted HTML destination and leaves ordinary title strings alone', async () => {
	for (const reference of ['pic.png', "<img src='pic&apos;s.png'>"]) {
		const vault = memoryVault({ '.huhu/dashboards/Old/Note.md': '---\ntitle: "pic.png"\naliases: ["pic.png"]\ntags: ["pic.png"]\nunknown: "pic.png"\ncover: '+JSON.stringify(reference)+'\n---\n', '.huhu/dashboards/Old/pic.png': 'image', ".huhu/dashboards/Old/pic's.png": 'image' });
		const files = contentFiles(vault.app); await files.refresh();
		await files.rename(files.getFileByPath('.huhu/dashboards/Old/Note.md')!, '.huhu/dashboards/New/Note.md'); await files.prepareMetadata();
		const file = files.getFileByPath('.huhu/dashboards/New/Note.md')!, metadata = files.getMetadata(file)!.frontmatter!;
		expect(metadata).toMatchObject({ title: 'pic.png', aliases: ['pic.png'], tags: ['pic.png'], unknown: 'pic.png' });
		const url = await resolveLibraryCover(extractCoverValue(metadata)!.value, file, vault.app); expect(url).toMatch(/^blob:/);
		try { expect(await (await fetch(url)).text()).toBe('image'); } finally { URL.revokeObjectURL(url); }
	}
});

test('shared YAML anchors keep ordinary values while each cover use follows its original image', async () => {
	for (const source of ['asset: &img pic.png\ncover: *img\ntitle: *img\nunknown: *img', 'cover: &img pic.png\ntitle: *img\nunknown: *img', 'asset: &img [pic.png]\ncover: *img\ntitle: *img', 'cover: &img [pic.png]\ntitle: *img']) {
		const vault = memoryVault({ '.huhu/dashboards/Old/Note.md': '---\n'+source+'\n---\n', '.huhu/dashboards/Old/pic.png': 'original', '.huhu/dashboards/New/pic.png': 'different' });
		const files = contentFiles(vault.app); await files.prepareMetadata();
		const title = files.getMetadata(files.getFileByPath('.huhu/dashboards/Old/Note.md')!)!.frontmatter!.title;
		await files.rename(files.getFileByPath('.huhu/dashboards/Old/Note.md')!, '.huhu/dashboards/New/Note.md');
		const reopened = new ContentFiles(vault.app); await reopened.prepareMetadata();
		const file = reopened.getFileByPath('.huhu/dashboards/New/Note.md')!, metadata = reopened.getMetadata(file)!.frontmatter!;
		expect(metadata.title).toEqual(title); if ('unknown' in metadata) expect(metadata.unknown).toBe('pic.png');
		const url = await resolveLibraryCover(extractCoverValue(metadata)!.value, file, vault.app); expect(url).toMatch(/^blob:/);
		try { expect(await (await fetch(url)).text()).toBe('original'); } finally { URL.revokeObjectURL(url); }
	}
});
