import { expect, test } from 'vitest';
import { buildContentTree, contentPanel, contentTree, folderOverview, huhuVaultSnapshot, searchContent, type ContentTreeFile } from './content-tree';

const file = (path: string): ContentTreeFile => {
	const name = path.split('/').at(-1)!;
	const dot = name.lastIndexOf('.');
	return { path, name, basename: dot > 0 ? name.slice(0, dot) : name, extension: dot > 0 ? name.slice(dot + 1) : '' };
};
const root = 'huhu';
const files = [
	file(`${root}/dashboard.md`),
	file(`${root}/HUHU/习惯/2026-01.md`),
	file(`${root}/HUHU/自动化/周报-1/操作.md`),
	file(`${root}/档案/个人档案/张三/基本信息.md`),
	file(`${root}/档案/个人档案/张三/简历.pdf`),
	file(`${root}/档案/企业档案/示例/基本信息.md`),
	file(`${root}/附件/photo.png`),
	file('outside/ignored.md'),
];
const directories = [root, `${root}/HUHU`, `${root}/HUHU/习惯`, `${root}/HUHU/自动化`, `${root}/HUHU/自动化/周报-1`, `${root}/档案`, `${root}/档案/个人档案`, `${root}/档案/个人档案/张三`, `${root}/档案/企业档案`, `${root}/档案/企业档案/示例`, `${root}/附件`, `${root}/空目录`];

test('builds a folder-first tree under the visible huhu/ root with full-path ids', () => {
	const tree = buildContentTree(files, directories);
	// Folder order follows the runtime locale's collation; files come after every folder.
	const labels = tree.nodes.map((node) => node.label);
	expect(labels.slice(0, 4).sort()).toEqual(['HUHU', '附件', '档案', '空目录'].sort());
	expect(labels[4]).toBe('dashboard');
	expect(tree.nodes[0]!.id).toBe(`${root}/${labels[0]}`);
	expect(tree.defaultExpandedIds).toEqual(tree.nodes.slice(0, 4).map((node) => node.id));
	const archives = tree.nodes.find((node) => node.label === '档案')!;
	expect(archives.children!.map((node) => node.label)).toEqual(['个人档案', '企业档案']);
	const person = archives.children![0]!.children![0]!;
	expect(person.label).toBe('张三');
	// Markdown shows without its extension; other files keep it.
	expect(person.children!.map((node) => node.label)).toEqual(['基本信息', '简历.pdf']);
	expect(tree.nodes.find((node) => node.label === '空目录')!.children).toEqual([]);
	// Files outside the content root never appear.
	expect(JSON.stringify(tree.nodes)).not.toContain('ignored');
	expect([...tree.fileIds]).toContain(`${root}/dashboard.md`);
	expect(tree.fileIds.has(`${root}/HUHU`)).toBe(false);
});

test('nodes carry default type icons, open-folder icons and special folder icons', () => {
	const tree = buildContentTree(files, directories);
	const byLabel = (label: string) => JSON.stringify(tree.nodes).includes(label);
	expect(byLabel('lucide-contact-round')).toBe(true);
	const archives = tree.nodes.find((node) => node.label === '档案')!;
	expect(archives.icon).toBe('lucide-contact-round');
	expect(archives.children![0]!.icon).toBe('lucide-user');
	expect(archives.children![1]!.icon).toBe('lucide-building-2');
	const plain = tree.nodes.find((node) => node.label === 'HUHU')!;
	expect(plain.icon).toBe('lucide-folder-closed');
	expect(plain.iconOpen).toBe('lucide-folder-open');
	const dashboard = tree.nodes.find((node) => node.label === 'dashboard')!;
	expect(dashboard.icon).toBe('lucide-file-text');
	const pdf = archives.children![0]!.children![0]!.children!.find((node) => node.label === '简历.pdf')!;
	expect(pdf).toMatchObject({ icon: 'lucide-file-text', iconColor: 'var(--color-red)' });
});

test('numbered names sort naturally and the same files return the cached tree', () => {
	const many = [file(`${root}/a10.md`), file(`${root}/a2.md`), file(`${root}/a1.md`)];
	expect(buildContentTree(many).nodes.map((node) => node.label)).toEqual(['a1', 'a2', 'a10']);
	expect(contentTree(many, [])).toBe(contentTree(many, []));
	expect(contentTree(many, [])).not.toBe(contentTree(files, directories));
});

test('the side panel is a searchable tree: a file row opens natively, a folder row opens its overview', async () => {
	const opened: string[] = [];
	const panel = contentPanel(files, directories, `${root}/HUHU`, undefined, (path) => { opened.push(path); });
	expect(panel.searchable).toBe(true);
	expect(panel.tree?.selectedId).toBe(`${root}/HUHU`);
	expect(panel.tree?.target?.(`${root}/dashboard.md`)).toBeUndefined();
	await panel.tree?.select?.(`${root}/dashboard.md`);
	await panel.tree?.select?.(`${root}/HUHU`);
	expect(opened).toEqual([`${root}/dashboard.md`]);
	expect(panel.tree?.target?.(`${root}/HUHU`)).toEqual({ feature: 'content', resourceId: `${root}/HUHU` });
});

test('a folder overview lists its files, most recently modified first, with the folder they are in', () => {
	const stamped = (path: string, mtime: number): ContentTreeFile => ({ ...file(path), stat: { mtime } });
	const list = [stamped(`${root}/a/old.md`, 1), stamped(`${root}/a/b/new.md`, 9), stamped(`${root}/c/other.pdf`, 5), stamped('outside/x.md', 99)];
	const all = folderOverview(list, root);
	expect(all.total).toBe(3);
	expect(all.rows.map((row) => [row.label, row.folder])).toEqual([['new', 'a/b'], ['other.pdf', 'c'], ['old', 'a']]);
	expect(all.rows[0]!.icon).toBe('lucide-file-text');
	const inA = folderOverview(list, `${root}/a`);
	expect(inA.rows.map((row) => row.label)).toEqual(['new', 'old']);
	expect(folderOverview(list, root, 1)).toMatchObject({ total: 3, rows: [{ label: 'new' }] });
});

test('search finds file names, folder names and text inside Markdown, with a snippet for body hits', async () => {
	const bodies = { read: async (path: string) => (path.endsWith('dashboard.md') ? 'Intro line.\nThe quarterly needle sits here and goes on.' : 'nothing') };
	const hits = await searchContent(files, directories, 'needle', bodies);
	expect(hits.map((hit) => hit.id)).toEqual([`${root}/dashboard.md`]);
	expect(hits[0]!.detail).toContain('quarterly needle sits');
	const byName = await searchContent(files, directories, '简历', bodies);
	expect(byName.map((hit) => hit.id)).toEqual([`${root}/档案/个人档案/张三/简历.pdf`]);
	const folder = await searchContent(files, directories, '空目录', bodies);
	expect(folder.map((hit) => hit.id)).toEqual([`${root}/空目录`]);
	expect(await searchContent(files, directories, '  ', bodies)).toEqual([]);
	// The panel wires it in only when it may read file bodies.
	expect(contentPanel(files, directories).search).toBeUndefined();
	expect(contentPanel(files, directories, undefined, bodies).search).toBeDefined();
});

test('the tree reads the visible huhu/ root of the vault: its files and folders, nothing else', () => {
	const entries = [
		{ path: 'huhu', children: [] },
		{ path: 'huhu/闪念', children: [] },
		{ path: 'huhu/闪念/2026/10', children: [] },
		{ path: 'other', children: [] },
		{ path: 'huhu/a.md' },
	];
	const vaultFiles = [file('huhu/闪念/2026/10/2026-10-21.md'), file('huhu/a.md'), file('other/x.md'), file('.huhu/dashboards/dashboard.md')];
	const { files: listed, directories: folders } = huhuVaultSnapshot({ getFiles: () => vaultFiles, getAllLoadedFiles: () => entries });
	expect(listed.map((item) => item.path)).toEqual(['huhu/闪念/2026/10/2026-10-21.md', 'huhu/a.md']);
	expect(folders).toEqual(['huhu/闪念', 'huhu/闪念/2026/10']);
	const tree = buildContentTree(listed, folders);
	expect(tree.fileIds.has('huhu/a.md')).toBe(true);
	expect(JSON.stringify(tree.nodes)).not.toContain('dashboard');
});
