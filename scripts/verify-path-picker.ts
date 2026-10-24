import { strict as assert } from 'node:assert';
import { ensureVaultFolder, fuzzyPathMatch, normalizeVaultPath, vaultPathItems } from '../src/shared/vault-path';

// The vault path picker is the shared PathPicker / VaultPathField (src/ui/components/huhu). The old modal picker of the
// board is gone; what is left to check here is the logic those components stand on: vault-relative normalisation,
// fuzzy matching of folders and files, the entry list and the creation of a typed folder.

assert.deepEqual(normalizeVaultPath(' /Projects/Alpha/ '), { ok: true, path: 'Projects/Alpha' }, 'slashes trimmed');
assert.equal(normalizeVaultPath('../x').ok, false, '.. refused');
assert.equal(normalizeVaultPath('.huhu/content').ok, false, 'hidden folders refused');

assert.ok(fuzzyPathMatch('rdmp', 'Projects/Roadmap'), 'letters in order match');
assert.equal(fuzzyPathMatch('zzz', 'Projects/Roadmap'), null, 'no match');

const entry = (path: string, folder: boolean) => ({ path, ...(folder ? { children: [] } : {}) });
const vault = {
	getAllLoadedFiles: () => [entry('/', true), entry('Notes', true), entry('Notes/A.md', false), entry('Projects', true)],
};
assert.deepEqual(vaultPathItems(vault as never, 'folder').map((item) => item.path), ['Notes', 'Projects'], 'folders listed, root left out');
assert.deepEqual(vaultPathItems(vault as never, 'file').map((item) => item.path), ['Notes/A.md'], 'files listed');

void (async () => {
const made: string[] = [];
const writable = {
	getAbstractFileByPath: (path: string) => (made.includes(path) ? { path, children: [] } : null),
	adapter: { exists: async () => false },
	createFolder: async (path: string) => {
		made.push(path);
	},
	getAllLoadedFiles: () => [],
};
assert.equal(await ensureVaultFolder(writable as never, 'Projects/Gamma'), 'Projects/Gamma');
assert.deepEqual(made, ['Projects', 'Projects/Gamma'], 'each missing level is created in order');

	console.log('path picker logic: PASS');
})();
