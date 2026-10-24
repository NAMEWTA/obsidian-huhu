import { expect, test } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { queryVaultFiles } from '../../services/library-query';

test('a database section without folders lists notes, never HUHU\'s own managed files', async () => {
	const vault = memoryVault({ 'Notes/Visible.md': '# Visible', '.huhu/dashboards/dashboard.md': '---\ncolumns: []\n---\n' });
	await contentFiles(vault.app).prepareMetadata();
	const results = queryVaultFiles(vault.app, { viewMode: 'list', folders: [], filters: [], sortBy: 'name', sortDesc: false });
	expect(results.map(item => item.file.path)).toEqual(['Notes/Visible.md']);
});
