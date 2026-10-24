import { expect, test, vi } from 'vitest';
import { memoryVault } from '../../../scripts/fixtures/memory-vault';
import { setLanguage } from '../../shared/i18n';
import { createHuhuNote, newNoteFolder, openContentLocation, openInNativeTab, selectedFolder } from './new-note';

test('a new HUHU note goes to the selected folder (or the folder of the selected file), else huhu/笔记, with a dash-joined dated name', async () => {
	setLanguage('zh');
	expect(selectedFolder()).toBe('huhu');
	expect(selectedFolder('huhu/档案')).toBe('huhu/档案');
	expect(selectedFolder('huhu/档案/张三/基本信息.md')).toBe('huhu/档案/张三');
	expect(selectedFolder('.huhu/dashboards/看板.md')).toBe('huhu');
	expect(newNoteFolder()).toBe('huhu/笔记');
	expect(newNoteFolder('huhu/档案/个人档案')).toBe('huhu/档案/个人档案');
	const vault = memoryVault({});
	const first = await createHuhuNote(vault.app);
	const second = await createHuhuNote(vault.app, first.path);
	expect(first.path).toMatch(/^huhu\/笔记\/\d{4}-\d{2}-\d{2}-新笔记\.md$/);
	expect(second.path).toMatch(/^huhu\/笔记\/\d{4}-\d{2}-\d{2}-新笔记-2\.md$/);
	expect([...vault.contents.keys()].some((path) => path.includes(' ') || path.startsWith('.huhu'))).toBe(false);
});

test('a file opens in a new native tab, whatever its type', async () => {
	const vault = memoryVault({ 'huhu/a.md': '', 'huhu/b.pdf': '' });
	const openFile = vi.fn(async () => {});
	const getLeaf = vi.fn(() => ({ openFile }));
	const app = Object.assign(vault.app, { workspace: { getLeaf } });
	await openInNativeTab(app, 'huhu/b.pdf');
	expect(getLeaf).toHaveBeenCalledWith('tab');
	expect(openFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'huhu/b.pdf' }), { active: true });
	await expect(openInNativeTab(app, 'huhu/missing.md')).rejects.toThrow('Missing');
});

test('legacy content links open the original file or folder without exposing private data or creating copies', async () => {
	const vault = memoryVault({ 'huhu/笔记/a.md': '# Heading\nOriginal', '.huhu/safe/vault.enc': 'ciphertext' });
	const openFile = vi.fn(async () => {}), openLinkText = vi.fn(async () => {});
	const app = Object.assign(vault.app, { workspace: { getLeaf: () => ({ openFile }), openLinkText } });
	const before = new Map(vault.contents);
	expect(await openContentLocation(app, 'huhu/笔记/a.md')).toBe('huhu/笔记');
	expect(openFile).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ path: 'huhu/笔记/a.md' }), { active: true });
	expect(await openContentLocation(app, 'huhu/笔记')).toBe('huhu/笔记');
	expect(await openContentLocation(app, '.huhu/safe/vault.enc')).toBe('huhu');
	const cancelled = new AbortController(); cancelled.abort();
	await openContentLocation(app, 'huhu/笔记/a.md', cancelled.signal);
	expect(openFile).toHaveBeenCalledOnce();
	await openContentLocation(app, 'huhu/笔记/a.md', undefined, '#Heading');
	expect(openLinkText).toHaveBeenCalledExactlyOnceWith('huhu/笔记/a.md#Heading', '', true);
	await expect(openContentLocation(app, 'huhu/missing.md')).rejects.toThrow('Missing');
	expect(vault.contents).toEqual(before);
});

test('native file and fragment links activate the originating window before opening', async () => {
	const vault = memoryVault({ 'huhu/a.md': '# Heading' });
	const owner = {} as Window;
	const anchor = { view: { containerEl: { ownerDocument: { defaultView: owner } } } };
	const order: string[] = [];
	const openFile = vi.fn(async () => { order.push('file'); });
	const openLinkText = vi.fn(async () => { order.push('fragment'); });
	const setActiveLeaf = vi.fn(() => { order.push('owner'); });
	const app = Object.assign(vault.app, { workspace: {
		getMostRecentLeaf: () => anchor, setActiveLeaf,
		getLeaf: () => ({ openFile }), openLinkText,
	} });
	await openContentLocation(app, 'huhu/a.md', undefined, undefined, owner);
	await openContentLocation(app, 'huhu/a.md', undefined, '#Heading', owner);
	expect(order).toEqual(['owner', 'file', 'owner', 'fragment']);
	expect(setActiveLeaf).toHaveBeenCalledWith(anchor, { focus: false });
	expect(openLinkText).toHaveBeenCalledWith('huhu/a.md#Heading', '', true);
});
