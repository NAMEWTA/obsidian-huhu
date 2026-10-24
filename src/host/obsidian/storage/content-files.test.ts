import { afterEach, expect, test, vi } from 'vitest';
import { MarkdownView, type WorkspaceLeaf } from 'obsidian';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { readMarkdownDocument, readYaml } from '../../../shared/storage/markdown-document';
import { ContentFiles, contentFiles } from './content-files';
import { useStorageTimers, type StorageTimers } from '../../../shared/storage/timers';

test('malformed frontmatter does not hide other searchable documents and remains editable', async () => {
	const vault = memoryVault({ '.huhu/dashboards/bad.md': '---\na: [\n---\n# Keep me', '.huhu/dashboards/good.md': '---\ntag: useful\n---\n#body-tag' });
	const files = contentFiles(vault.app); await files.prepareMetadata();
	expect(files.getMetadata(files.getFileByPath('.huhu/dashboards/good.md')!)?.frontmatter).toEqual({ tag: 'useful' });
	expect(files.getMetadata(files.getFileByPath('.huhu/dashboards/bad.md')!)?.frontmatter).toBeUndefined();
	expect(await files.read('.huhu/dashboards/bad.md')).toContain('a: [');
	await expect(files.processFrontMatter(files.getFileByPath('.huhu/dashboards/bad.md')!, properties => { properties.tag = 'x'; })).rejects.toThrow();
});

test('managed folders and binary attachments stay indexed and deletion retains a recoverable copy', async () => {
	const vault = memoryVault(), files = contentFiles(vault.app);
	await files.mkdir('.huhu/dashboards/档案/人/附件');
	await files.create('.huhu/dashboards/档案/人/基本信息.md', 'record');
	await files.createBinary('.huhu/dashboards/档案/人/附件/image.png', new TextEncoder().encode('image bytes').buffer as ArrayBuffer);
	expect(files.getAbstractFileByPath('.huhu/dashboards/档案/人/附件')).toBeTruthy();
	expect(files.listFolder('.huhu/dashboards/档案/人').filter(item => !item.folder).map(item => item.path).sort()).toEqual(['.huhu/dashboards/档案/人/基本信息.md', '.huhu/dashboards/档案/人/附件/image.png']);
	await expect(files.createBinary('.huhu/dashboards/档案/人/附件/image.png', new ArrayBuffer(0))).rejects.toThrow();
	const draft = files.claimDraft('.huhu/dashboards/档案/人/基本信息.md', () => 'unsaved');
	await expect(files.trashFolder('.huhu/dashboards/档案/人')).rejects.toThrow('Unsaved editor');
	draft.release();
	await files.trashFolder('.huhu/dashboards/档案/人');
	expect(files.getFileByPath('.huhu/dashboards/档案/人/基本信息.md')).toBeNull();
	expect([...vault.contents].some(([path, text]) => path.startsWith('.huhu/recovery/trash/') && path.endsWith('/基本信息.md') && text === 'record')).toBe(true);
});

test('legacy and relative links resolve to managed files and retain heading targets when opened', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Records/A.md': '# Section', '.huhu/dashboards/Records/B.md': '[[A#Section]]' });
	const files = contentFiles(vault.app); await files.refresh();
	expect(files.resolveLink('Records/A')?.path).toBe('.huhu/dashboards/Records/A.md');
	expect(files.resolveLink('A#Section', '.huhu/dashboards/Records/B.md')?.path).toBe('.huhu/dashboards/Records/A.md');
	const opened: unknown[] = [];
	files.bindOpen(async (path, _owner, fragment) => { opened.push({ path, fragment }); });
	await files.open('Records/A#Section');
	expect(opened).toEqual([{ path: '.huhu/dashboards/Records/A.md', fragment: '#Section' }]);
});

test('literal percent names open unchanged while encoded links still resolve', async () => {
	const vault = memoryVault({ '.huhu/dashboards/100%.md': 'percent', '.huhu/dashboards/A%20B.md': 'literal', '.huhu/dashboards/A B.md': 'space' });
	const files = contentFiles(vault.app); await files.refresh();
	const opened: string[] = []; files.bindOpen(async path => { opened.push(path); });
	await files.open('.huhu/dashboards/100%.md'); await files.open('.huhu/dashboards/A%20B.md');
	expect(opened).toEqual(['.huhu/dashboards/100%.md', '.huhu/dashboards/A%20B.md']);
	expect(files.resolveLink('A%2520B')?.path).toBe('.huhu/dashboards/A%20B.md');
});

test('a competing creation is never overwritten by a new managed document', async () => {
	const vault = memoryVault(), files = contentFiles(vault.app), exists = vault.adapter.exists;
	const path = '.huhu/dashboards/new.md'; let raced = false;
	vault.adapter.exists = async name => {
		const found = await exists(name);
		if (name === path && !found && !raced) { raced = true; await vault.adapter.write(path, 'external bytes'); }
		return found;
	};
	await expect(files.create(path, 'local export')).rejects.toThrow();
	expect(vault.contents.get(path)).toBe('external bytes');
});

test('refresh waits for a rename and never emits a false deletion to consumers', async () => {
	const vault = memoryVault({ '.huhu/dashboards/A.md': 'a' }), files = contentFiles(vault.app);
	await files.refresh();
	const events: string[] = []; const off = files.subscribe(event => events.push(event.kind));
	const rename = vault.adapter.rename;
	let entered!: () => void, release!: () => void;
	const started = new Promise<void>(resolve => { entered = resolve; });
	const waiting = new Promise<void>(resolve => { release = resolve; });
	vault.adapter.rename = async (from, to) => { await rename(from, to); entered(); await waiting; };
	const move = files.rename(files.getFileByPath('.huhu/dashboards/A.md')!, '.huhu/dashboards/B.md');
	await started; const scan = files.refresh();
	await Promise.resolve(); release(); await Promise.all([move, scan]);
	expect(events).not.toContain('delete'); expect(events).toContain('rename'); off();
});

test('moving content preserves incoming and relative outgoing links across restart', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Projects/Sub/Note.md': '![picture](../assets/image.png)', 'Projects/assets/image.png': 'image' });
	let files = contentFiles(vault.app); await files.refresh();
	expect(files.resolveLink('../assets/image.png', '.huhu/dashboards/Projects/Sub/Note.md')?.path).toBe('Projects/assets/image.png');
	await files.rename(files.getFileByPath('.huhu/dashboards/Projects/Sub/Note.md')!, '.huhu/dashboards/Moved/Note.md');
	files = new ContentFiles(vault.app); await files.refresh();
	expect(files.resolveLink('Projects/Sub/Note')?.path).toBe('.huhu/dashboards/Moved/Note.md');
	const moved = await files.read('.huhu/dashboards/Moved/Note.md');
	expect(moved).toBe('![picture](</Projects/assets/image.png>)');
	expect(files.resolveLink('/Projects/assets/image.png', '.huhu/dashboards/Moved/Note.md')?.path).toBe('Projects/assets/image.png');
});

test('relative links prefer the source directory and renamed links survive path reuse', async () => {
	const vault = memoryVault({ '.huhu/dashboards/A/Note.md': '![old](pic.png)', '.huhu/dashboards/A/pic.png': 'old', '.huhu/dashboards/B/pic.png': 'new', 'Note.md': 'ordinary root', 'pic.png': 'root image' });
	let files = contentFiles(vault.app); await files.refresh();
	expect(files.resolveLink('pic.png', '.huhu/dashboards/A/Note.md')?.path).toBe('.huhu/dashboards/A/pic.png');
	await files.rename(files.getFileByPath('.huhu/dashboards/A/Note.md')!, '.huhu/dashboards/B/Note.md');
	await files.process('.huhu/dashboards/B/Note.md', text => text + '\n![new](./pic.png)');
	expect(files.resolveLink('./pic.png', '.huhu/dashboards/B/Note.md')?.path).toBe('.huhu/dashboards/B/pic.png');
	expect(await files.read('.huhu/dashboards/B/Note.md')).toContain('/.huhu/dashboards/A/pic.png');
	await files.rename(files.getFileByPath('.huhu/dashboards/B/Note.md')!, '.huhu/dashboards/C/Note.md');
	await files.create('.huhu/dashboards/B/Note.md', 'new file');
	files = new ContentFiles(vault.app); await files.refresh();
	expect(files.resolveLink('A/Note')?.path).toBe('.huhu/dashboards/C/Note.md');
	expect(files.resolveLink('pic.png', '.huhu/dashboards/B/Note.md')?.path).toBe('.huhu/dashboards/B/pic.png');
});

test('a failed rename cannot lend its source directory to an unrelated new destination', async () => {
	const vault = memoryVault({ '.huhu/dashboards/A/Note.md': '![old](pic.png)', '.huhu/dashboards/A/pic.png': 'old', '.huhu/dashboards/B/pic.png': 'new' });
	const files = contentFiles(vault.app); await files.refresh();
	vault.adapter.rename = async () => { throw new Error('rename denied'); };
	await expect(files.rename(files.getFileByPath('.huhu/dashboards/A/Note.md')!, '.huhu/dashboards/B/Note.md')).rejects.toThrow('rename denied');
	await files.create('.huhu/dashboards/B/Note.md', 'new file');
	expect(files.resolveLink('pic.png', '.huhu/dashboards/B/Note.md')?.path).toBe('.huhu/dashboards/B/pic.png');
});

test('relative literal percent names take precedence over URL decoding', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Folder/A%20B.md': 'literal', '.huhu/dashboards/Folder/A B.md': 'space' });
	const files = contentFiles(vault.app); await files.refresh();
	for (const link of ['A%20B', 'A%20B.md', 'A%2520B']) expect(files.resolveLink(link, '.huhu/dashboards/Folder/Ref.md')?.path).toBe('.huhu/dashboards/Folder/A%20B.md');
});

test('existing incoming references keep their target when the old path is reused', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Old/B.md': '# Target', '.huhu/dashboards/A.md': '[[Old/B#Target|label]]', 'Ordinary.md': '[target](Old/B.md#Target)\n`[[Old/B]]`\n```md\n[[Old/B]]\n```' });
	let files = contentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/Old/B.md')!, '.huhu/dashboards/New/B.md');
	await files.create('.huhu/dashboards/Old/B.md', 'unrelated new content');
	files = new ContentFiles(vault.app); await files.refresh();
	expect(await files.read('.huhu/dashboards/A.md')).toBe('[[/.huhu/dashboards/New/B.md#Target|label]]');
	expect(await files.read('Ordinary.md')).toBe('[target](</.huhu/dashboards/New/B.md#Target>)\n`[[Old/B]]`\n```md\n[[Old/B]]\n```');
	expect(files.resolveLink('/.huhu/dashboards/New/B.md#Target', '.huhu/dashboards/A.md')?.path).toBe('.huhu/dashboards/New/B.md');
	expect(files.getFileByPath('.huhu/dashboards/Old/B.md')?.path).toBe('.huhu/dashboards/Old/B.md');
});

test('failed moves restore reference edits and retain a replayable receipt until rollback succeeds', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Old/B.md': '![old](image.png)', '.huhu/dashboards/Old/image.png': 'image', 'Ref.md': '[[Old/B]]' });
	const files = contentFiles(vault.app); await files.refresh();
	const rename = vault.adapter.rename;
	vault.adapter.rename = async () => { throw new Error('move denied'); };
	await expect(files.rename(files.getFileByPath('.huhu/dashboards/Old/B.md')!, '.huhu/dashboards/New/B.md')).rejects.toThrow('move denied');
	expect(vault.contents.get('Ref.md')).toBe('[[Old/B]]');
	expect(vault.contents.get('.huhu/dashboards/Old/B.md')).toBe('![old](image.png)');
	vault.adapter.rename = rename;
	await files.rename(files.getFileByPath('.huhu/dashboards/Old/B.md')!, '.huhu/dashboards/New/B.md');
	expect(vault.contents.get('Ref.md')).toBe('[[/.huhu/dashboards/New/B.md]]');
});

test('a destination arriving during rename is retained alongside the moved source and receipt', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Old.md': 'local original' }), files = contentFiles(vault.app);
	await files.refresh(); const rename = vault.adapter.rename;
	vault.adapter.rename = async (from, to) => { await vault.adapter.write('.huhu/dashboards/New.md', 'external destination'); await rename(from, to); };
	await expect(files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md')).rejects.toThrow('move-target-changed');
	expect(vault.contents.get('.huhu/dashboards/New.md')).toBe('external destination');
	expect([...vault.contents].some(([path, text]) => path.startsWith('.huhu/recovery/renames/') && text === 'local original')).toBe(true);
	expect(JSON.parse(vault.contents.get('.huhu/content-moves/manifest.json')!).pending).toBeTruthy();
});

test.each([
	{ yaml: 'cover: "[[image.png]]" # Keep', expected: { cover: '[[/.huhu/dashboards/image.png]]' } },
	{ yaml: 'asset: &img image.png\ncover: *img\ntitle: *img', expected: { asset: 'image.png', cover: '/.huhu/dashboards/image.png', title: 'image.png' } },
	{ yaml: 'cover: &img image.png\ntitle: *img', expected: { cover: '/.huhu/dashboards/image.png', title: 'image.png' } },
	{ yaml: 'asset: &img [image.png]\ncover: *img\ntitle: *img', expected: { asset: ['image.png'], cover: ['/.huhu/dashboards/image.png'], title: ['image.png'] } },
	{ yaml: 'cover: &img [image.png]\ntitle: *img', expected: { cover: ['/.huhu/dashboards/image.png'], title: ['image.png'] } },
])('every interrupted rename persistence step recovers references without losing content (%#)', async ({ yaml, expected }) => {
	const initial = { '.huhu/dashboards/Old.md': '---\n'+yaml+'\n---\n# Original\n![image](image.png)', '.huhu/dashboards/image.png': 'image', 'Ref.md': '---\nrelated: "[[Old]]"\n---\n[[Old]]' };
	const run = async (failAt = 0, after = false) => {
		const vault = memoryVault(initial); let files = new ContentFiles(vault.app); await files.refresh();
		let calls = 0;
		for (const method of ['write', 'rename', 'copy'] as const) {
			const original = vault.adapter[method];
			vault.adapter[method] = async (first: string, second: string) => {
				const fail = ++calls === failAt;
				if (fail && !after) throw new Error('injected move failure');
				await original(first, second);
				if (fail && after) throw new Error('injected move failure');
			};
		}
		try { await files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md'); } catch { /* Restart is the recovery boundary under test. */ }
		const count = calls;
		files = new ContentFiles(vault.app); await files.refresh();
		const destination = vault.contents.has('.huhu/dashboards/New.md') ? '.huhu/dashboards/New.md' : '.huhu/dashboards/Old.md';
		if (destination.endsWith('/New.md')) {
			const result = readMarkdownDocument(vault.contents.get(destination)!);
			expect(result.body).toBe('# Original\n![image](</.huhu/dashboards/image.png>)');
			expect(readYaml(result.yaml).toJSON()).toEqual(expected);
		} else expect(vault.contents.get(destination)).toBe(initial['.huhu/dashboards/Old.md']);
		const reference = vault.contents.get('Ref.md')!.split('\n').at(-1)!.slice(2, -2);
		expect(files.resolveLink(reference, 'Ref.md')?.path).toBe(destination);
		const related = String(readYaml(readMarkdownDocument(vault.contents.get('Ref.md')!).yaml).get('related')).slice(2, -2);
		expect(files.resolveLink(related, 'Ref.md')?.path).toBe(destination);
		expect(JSON.parse(vault.contents.get('.huhu/content-moves/manifest.json') ?? '{"pending":null}').pending).toBeFalsy();
		return count;
	};
	const count = await run();
	for (let point = 1; point <= count; point++) for (const after of [false, true]) await run(point, after);
});

test('moving links preserves their parsed targets, syntax and code examples', async () => {
	const code = '    [[Old/Note]]\n\n> ```md\n> [[Old/Note]]\n> ```\n\n- example\n\n      [[Old/Note]]\n\n``a ` [[Old/Note]]``\n\\[[Old/Note]]';
	const vault = memoryVault({ '.huhu/dashboards/Old/Note.md': '[[A B]]\n[[A%20B]]\n[space](A%20B.md)\n[literal](A%2520B.md)\n![picture](image(1).png)', '.huhu/dashboards/Old/A B.md': 'space', '.huhu/dashboards/Old/A%20B.md': 'literal', '.huhu/dashboards/Old/image(1).png': 'old picture', '.huhu/dashboards/New/image(1).png': 'new picture', '.huhu/dashboards/Ref.md': '[note](Old/Note.md)', 'Ordinary.md': code + '\n\n[[Old/Note]]' });
	let files = new ContentFiles(vault.app); await files.prepareMetadata();
	const outgoing = files.resolvedLinks()['.huhu/dashboards/Old/Note.md'];
	expect(outgoing).toEqual({ '.huhu/dashboards/Old/A B.md': 2, '.huhu/dashboards/Old/A%20B.md': 2, '.huhu/dashboards/Old/image(1).png': 1 });
	await files.rename(files.getFileByPath('.huhu/dashboards/Old/Note.md')!, '.huhu/dashboards/New/Note.md');
	files = new ContentFiles(vault.app); await files.prepareMetadata();
	expect(files.resolvedLinks()['.huhu/dashboards/New/Note.md']).toEqual(outgoing);
	expect(files.resolvedLinks()['.huhu/dashboards/Ref.md']).toEqual({ '.huhu/dashboards/New/Note.md': 1 });
	expect(vault.contents.get('Ordinary.md')).toBe(code + '\n\n[[/.huhu/dashboards/New/Note.md]]');
	expect(await files.read('.huhu/dashboards/New/Note.md')).toContain('[[/.huhu/dashboards/Old/A B.md]]');
});

test('clean native editors can follow transaction writes and rollbacks while true dirty editors block them', async () => {
	for (const rollback of [false, true]) {
		const vault = memoryVault({ '.huhu/dashboards/Old.md': 'original', 'Ref.md': '[[Old]]' });
		const files = new ContentFiles(vault.app); await files.refresh();
		const leaf = {} as WorkspaceLeaf;
		const view = Object.assign(new MarkdownView(leaf), { file: vault.file('Ref.md'), editor: { getValue: () => vault.contents.get('Ref.md')! } });
		leaf.view = view; vault.app.workspace.getLeavesOfType = () => [leaf];
		if (rollback) vault.adapter.rename = async () => { throw new Error('move denied'); };
		const moving = files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md');
		if (rollback) await expect(moving).rejects.toThrow('move denied'); else await moving;
		await files.refresh();
		expect(vault.contents.get('Ref.md')).toBe(rollback ? '[[Old]]' : '[[/.huhu/dashboards/New.md]]');
	}
});

test('completed moves emit one rename even when target publication or receipt completion reports failure', async () => {
	for (const failure of ['copy', 'finish']) {
		const vault = memoryVault({ '.huhu/dashboards/Old.md': 'original', 'Ref.md': '[[Old]]' });
		const files = new ContentFiles(vault.app); await files.refresh();
		const events: string[] = []; files.subscribe(event => { if (event.path.startsWith('.huhu/dashboards/')) events.push(event.kind); });
		let failed = false;
		const copy = vault.adapter.copy, write = vault.adapter.write;
		vault.adapter.copy = async (from, to) => { await copy(from, to); if (failure === 'copy' && !failed && to === '.huhu/dashboards/New.md') { failed = true; throw new Error('copy completed'); } };
		vault.adapter.write = async (path, text) => { if (failure === 'finish' && !failed && path === '.huhu/content-moves/manifest.json' && text.includes('"entries"') && !text.includes('"pending"')) { failed = true; throw new Error('finish denied'); } await write(path, text); };
		try { await files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md'); } catch { /* The recovered identity must still reach consumers. */ }
		await files.refresh();
		expect(failed).toBe(true);
		expect(events).not.toContain('delete'); expect(events).not.toContain('create'); expect(events.filter(event => event === 'rename')).toHaveLength(1);
	}
});

test('native reference filenames outside the portable owned namespace remain usable', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Old.md': 'target', 'Why?.md': '[[Old]]' }), files = new ContentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md');
	await new ContentFiles(vault.app).refresh();
	expect(vault.contents.get('Why?.md')).toBe('[[/.huhu/dashboards/New.md]]');
});

test('property links preserve YAML comments, aliases, scalar values and CRLF while following moves', async () => {
	const raw = '---\r\n# Header\r\ncover: >- # block comment\r\n  [[image.png]]\r\nrelated: &ref "[[../Peer]]"\r\ncopy: *ref\r\nexamples: "`[[image.png]]`"\r\nnumber: 2026\r\n---\r\nBody';
	const vault = memoryVault({ '.huhu/dashboards/Old/Note.md': raw, '.huhu/dashboards/Old/image.png': 'image', '.huhu/dashboards/Peer.md': 'peer' }), files = new ContentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/Old/Note.md')!, '.huhu/dashboards/New/Note.md');
	await files.prepareMetadata(); const result = await files.read('.huhu/dashboards/New/Note.md');
	expect(result).toContain('# Header\r\n'); expect(result).toContain('# block comment\r\n');
	expect(result).toContain('related: &ref "[[/.huhu/dashboards/Peer.md]]"\r\ncopy: *ref');
	expect(result).toContain('examples: "`[[image.png]]`"\r\nnumber: 2026');
	expect(files.getMetadata(files.getFileByPath('.huhu/dashboards/New/Note.md')!)!.frontmatter).toMatchObject({ cover: '[[/.huhu/dashboards/Old/image.png]]', copy: '[[/.huhu/dashboards/Peer.md]]', number: 2026 });
});

test('moving an HTML block preserves every actual image and ignores text inside unrelated attributes', async () => {
	const html = '<div title="<img src=ignore.png>">\n<img src="a.png">\n<img alt="src=fake.png" src=\'b.png\'>\n<img src=c.png>\n<!-- <img src="a.png"> -->\n<script>const example = \'<img src="a.png">\';</script>\n</div>';
	const vault = memoryVault({ '.huhu/dashboards/Old/Note.md': html, ...Object.fromEntries(['a','b','c'].flatMap(name => [['.huhu/dashboards/Old/'+name+'.png', 'original'], ['.huhu/dashboards/New/'+name+'.png', 'different']])) });
	const files = new ContentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/Old/Note.md')!, '.huhu/dashboards/New/Note.md');
	const text = await files.read('.huhu/dashboards/New/Note.md');
	expect(text).toContain('<img src="/.huhu/dashboards/Old/a.png">');
	expect(text).toContain("<img alt=\"src=fake.png\" src='/.huhu/dashboards/Old/b.png'>");
	expect(text).toContain('<img src="/.huhu/dashboards/Old/c.png">');
	expect(text).toContain('<div title="<img src=ignore.png>">');
	expect(text).toContain('<!-- <img src="a.png"> -->');
	expect(text).toContain('<script>const example = \'<img src="a.png">\';</script>');
});

test('raw HTML text across inline parser nodes remains literal when an attachment moves', async () => {
	const raw = ['textarea','script','style','title','xmp','iframe','noembed','noframes'].map(tag => `Example: <${tag}><img src="Old.png">[[Old.png]]</${tag}>`).join('\n\n');
	const vault = memoryVault({ '.huhu/dashboards/Old.png': 'image', 'Ref.md': raw+'\n\n<img src="Old.png">' });
	const files = new ContentFiles(vault.app); await files.refresh();
	await files.rename(files.getFileByPath('.huhu/dashboards/Old.png')!, '.huhu/dashboards/New.png');
	expect(vault.contents.get('Ref.md')).toBe(raw+'\n\n<img src="/.huhu/dashboards/New.png">');
});

test('cyclic YAML stays editable and does not block library metadata or unrelated moves', async () => {
	for (const yaml of ['list: &self [*self]', 'loop: &self {self: *self}']) {
		const prefix = '---\n'+yaml+'\n---\n';
		const vault = memoryVault({ '.huhu/dashboards/Old.md': prefix+'Body', '.huhu/dashboards/Good.md': '---\ntitle: Good\n---\n# Good', 'Ref.md': prefix+'[[Old]]' });
		const files = new ContentFiles(vault.app); await files.prepareMetadata();
		expect(files.getMetadata(files.getFileByPath('.huhu/dashboards/Good.md')!)!.frontmatter).toEqual({ title: 'Good' });
		expect(await files.read('.huhu/dashboards/Old.md')).toBe(prefix+'Body');
		await files.rename(files.getFileByPath('.huhu/dashboards/Old.md')!, '.huhu/dashboards/New.md');
		expect(await files.read('.huhu/dashboards/New.md')).toBe(prefix+'Body');
		expect(vault.contents.get('Ref.md')).toBe(prefix+'[[/.huhu/dashboards/New.md]]');
		await new ContentFiles(vault.app).prepareMetadata();
	}
});

afterEach(() => { vi.useRealTimers(); useStorageTimers(undefined); vi.restoreAllMocks(); });

test('a dropped adapter request during a scan cannot block the mutation queue forever', async () => {
	vi.useFakeTimers();
	useStorageTimers(globalThis as unknown as StorageTimers);
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	const vault = memoryVault({ '.huhu/dashboards/A.md': 'a' }), files = contentFiles(vault.app), stat = vault.adapter.stat;
	let dropped = 0;
	// The platform answers the first stat of the scan never; later requests are answered normally.
	vault.adapter.stat = async path => (dropped++ === 0 ? new Promise<never>(() => undefined) : stat(path));
	let created = false;
	const refresh = files.refresh();
	const queued = files.create('.huhu/dashboards/B.md', 'b').then(() => { created = true; });
	await vi.advanceTimersByTimeAsync(10000);
	await refresh; await queued;
	expect(created).toBe(true);
	expect(files.getFileByPath('.huhu/dashboards/A.md')).toBeTruthy();
	expect(vault.contents.get('.huhu/dashboards/B.md')).toBe('b');
});

test('backslash paths share the managed index, IO spelling, drafts and mutation queue', async () => {
	const vault = memoryVault(),
		files = contentFiles(vault.app);
	const incoming = '.huhu\\dashboards\\团队 (100%).md',
		canonical = '.huhu/dashboards/团队 (100%).md';
	const write = vi.spyOn(vault.adapter, 'write');
	await files.create(incoming, 'original');
	expect(files.getFileByPath(incoming)).toBe(files.getFileByPath(canonical));
	const draft = files.claimDraft(incoming, () => 'unsaved');
	await expect(files.process(canonical, (text) => text + '-blocked')).rejects.toThrow('Unsaved editor');
	draft.release();
	await Promise.all([
		files.process(incoming, (text) => text + '-one'),
		files.process(canonical, (text) => text + '-two'),
	]);
	expect(await files.read(incoming)).toBe('original-one-two');
	expect(await files.resourceUrl(incoming)).toBe('app://vault/' + canonical);
	await files.rename(files.getFileByPath(incoming)!, '.huhu\\dashboards\\子目录\\Moved.md');
	expect(files.getFileByPath(incoming)).toBeNull();
	const moved = files.getFileByPath('.huhu\\dashboards\\子目录\\Moved.md')!;
	expect(new TextDecoder().decode(await files.readBinary(moved))).toBe('original-one-two');
	expect(write.mock.calls.every(([path]) => !path.includes('\\'))).toBe(true);
	await files.trashFolder('.huhu\\dashboards\\子目录');
	expect(files.getFileByPath(moved.path)).toBeNull();
});

test('adapter listing separators normalize before indexing and IO', async () => {
	const vault = memoryVault({ '.huhu/dashboards/Sub/笔记.md': 'kept' }),
		list = vault.adapter.list;
	vi.spyOn(vault.adapter, 'list').mockImplementation(async (path) => {
		const entries = await list(path);
		return {
			files: entries.files.flatMap((p) => [p, p.replaceAll('/', '\\')]),
			folders: entries.folders.map((p) => p.replaceAll('/', '\\')),
		};
	});
	const stat = vi.spyOn(vault.adapter, 'stat'),
		files = contentFiles(vault.app);
	await files.refresh();
	expect(files.allManaged().map((file) => file.path)).toEqual(['.huhu/dashboards/Sub/笔记.md']);
	expect(stat.mock.calls.every(([path]) => !path.includes('\\'))).toBe(true);
	expect(await files.read('.huhu\\dashboards\\Sub\\笔记.md')).toBe('kept');
});

test.each([
	'.huhu\\dashboards\\..\\config\\settings.json',
	'.huhu/config/settings.json',
	'./.huhu/dashboards/a.md',
	'C:\\vault\\note.md',
])('invalid inputs cannot create visible notes or change private files: %s', async (input) => {
	const vault = memoryVault({ '.huhu/config/settings.json': 'kept' }),
		files = contentFiles(vault.app);
	const write = vi.spyOn(vault.adapter, 'write');
	await expect(files.process(input, () => 'bad')).rejects.toThrow();
	await expect(files.create(input, 'bad')).rejects.toThrow();
	expect(write).not.toHaveBeenCalled();
	expect([...vault.contents]).toEqual([['.huhu/config/settings.json', 'kept']]);
});
