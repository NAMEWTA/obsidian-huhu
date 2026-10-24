// Acceptance: notes navigator deep folder counts, top-level folder colors (navigator and Obsidian file list), new note
// naming and default properties, pasted/dropped attachments next to the note, and clicks opening notes in tabs.
// HOME / XDG dirs point into the fixture (fresh-vault.mjs), so the real home configuration is never touched.
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian [HUHU_THEME=minimal HUHU_MINIMAL_THEME=<dir>] [HUHU_MODE=dark] [HUHU_SHOTS=<dir>] \
//     xvfb-run -a node scripts/obsidian-acceptance/navigator-notes.mjs /dev/shm/<new-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root, 'Pass a new directory for the disposable vault');
const minimal = process.env.HUHU_THEME === 'minimal';
const dark = process.env.HUHU_MODE === 'dark';
const label = `${minimal ? 'minimal' : 'default'}-${dark ? 'dark' : 'light'}`;
const shots = process.env.HUHU_SHOTS;
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
// A 2x2 PNG.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYEJRAAAFAkB/6BUpvQAAAAASUVORK5CYII=';

const files = {
	'00_Inbox/idea.md': '# Idea\n',
	'10_档案/个人档案/p1.md': '# p1\n',
	'10_档案/个人档案/p2.md': '# p2\n',
	'10_档案/企业档案/c1.md': '# c1\n',
	'10_档案/x.md': '# x\n',
	'20_Work/Alpha/Deep/Deeper/d1.md': '# d1\n',
	'20_Work/Alpha/a1.md': '# a1\n',
	'20_Work/Alpha/photo.png': 'not really a png',
	'30_Library/readme.md': '# readme\n',
	'40_Misc/m1.md': '# m1\n',
	'50_Archive/old/o1.md': '# o1\n',
	'root.md': '# root\n',
};
for (let i = 1; i <= 150; i++) files[`20_Work/Bulk/n${String(i).padStart(3, '0')}.md`] = `# n${i}\n`;
const noteFiles = Object.keys(files).filter((file) => file.endsWith('.md'));
const expectedTotal = (folder) => noteFiles.filter((file) => (folder === '/' ? true : file.startsWith(`${folder}/`))).length;

if (minimal) {
	const theme = process.env.HUHU_MINIMAL_THEME;
	assert.ok(theme && path.isAbsolute(theme), 'HUHU_MINIMAL_THEME must point to the Minimal theme directory (theme.css, manifest.json)');
	files['.obsidian/themes/Minimal/theme.css'] = await fs.readFile(path.join(theme, 'theme.css'), 'utf8');
	files['.obsidian/themes/Minimal/manifest.json'] = await fs.readFile(path.join(theme, 'manifest.json'), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal', theme: dark ? 'obsidian' : 'moonstone' });
} else {
	files['.obsidian/appearance.json'] = JSON.stringify({ theme: dark ? 'obsidian' : 'moonstone' });
}
const modules = { home: false, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: true, comments: false, navigator: true, sync: false };
const runtime = await launchFreshVault({
	root,
	files,
	port: Number(process.env.HUHU_NOTES_PORT || 9311),
	settings: { version: 1, namespaces: { app: { language: 'zh', introSeen: true, modules }, navigator: { expandedFolders: ['10_档案', '20_Work', '20_Work/Alpha'] } } },
});
const c = runtime.connection;
const check = (name, ok, detail) => {
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ' ' + JSON.stringify(detail)}`);
	assert.ok(ok, name + (detail === undefined ? '' : ' ' + JSON.stringify(detail)));
};
const until = async (expression, what = expression) => {
	for (let i = 0; i < 200; i++) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${what}`);
};
const exists = (file) => fs.stat(path.join(runtime.vault, file)).then(() => true, () => false);
const shot = async (name, clip) => {
	if (!shots) return;
	await fs.mkdir(shots, { recursive: true });
	const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 72, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
	await fs.writeFile(path.join(shots, `${label}-${name}.jpg`), Buffer.from(data, 'base64'));
};
const sidebarClip = async () => c.evaluate(`(()=>{const r=document.querySelector('.mod-left-split').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
const homeBefore = await fs.stat(path.join(process.env.HOME ?? '/root', '.codex')).then((s) => s.mtimeMs, () => null);

try {
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
	await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'navigator leaf placed');
	await c.evaluate(`app.workspace.leftSplit.expand();app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
	await until(`document.querySelectorAll('[data-nav-kind=folder]').length>5`, 'folder rows rendered');
	// Widen the sidebar so the whole tree reads well.
	await c.evaluate(`app.workspace.leftSplit.setSize?.(360);true`).catch(() => undefined);
	await delay(1500);

	// 1. Counts: every folder row shows the number of notes in its whole subtree.
	const rows = await c.evaluate(`[...document.querySelectorAll('[data-nav-kind=folder]')].map(r=>({key:r.dataset.navKey.slice(7),label:r.querySelector('span.truncate')?.textContent,count:Number(r.querySelector('span.tabular-nums')?.textContent||0)}))`);
	console.log(JSON.stringify(rows));
	for (const row of rows) check(`count ${row.key}`, row.count === expectedTotal(row.key), { row, expected: expectedTotal(row.key) });
	check('counts include the deepest level', rows.some((row) => row.key === '20_Work/Alpha') && rows.find((row) => row.key === '20_Work/Alpha').count === 2, rows.find((row) => row.key === '20_Work/Alpha'));
	await shot('1-counts', await sidebarClip());

	// A new deep file raises every ancestor without a reload.
	await c.evaluate(`app.vault.create('20_Work/Alpha/Deep/Deeper/d2.md','# d2').then(()=>true)`);
	await until(`[...document.querySelectorAll('[data-nav-kind=folder]')].find(r=>r.dataset.navKey==='folder:20_Work')?.querySelector('span.tabular-nums')?.textContent==='${expectedTotal('20_Work') + 1}'`, 'ancestor counts follow a created file');
	const afterCreate = await c.evaluate(`[...document.querySelectorAll('[data-nav-kind=folder]')].map(r=>[r.dataset.navKey.slice(7),Number(r.querySelector('span.tabular-nums')?.textContent||0)])`);
	check('root count follows create', afterCreate.find(([key]) => key === '/')?.[1] === expectedTotal('/') + 1, afterCreate);
	await c.evaluate(`app.vault.delete(app.vault.getFileByPath('20_Work/Alpha/Deep/Deeper/d2.md'))`);
	await until(`[...document.querySelectorAll('[data-nav-kind=folder]')].find(r=>r.dataset.navKey==='folder:20_Work')?.querySelector('span.tabular-nums')?.textContent==='${expectedTotal('20_Work')}'`, 'ancestor counts follow a deletion');

	// 2. Folder colors: top-level folders differ, nested folders inherit.
	const navColors = await c.evaluate(`[...document.querySelectorAll('[data-nav-kind=folder]')].map(r=>{const icon=[...r.querySelectorAll('span.inline-flex')].find(s=>!s.hasAttribute('aria-hidden'));return {key:r.dataset.navKey.slice(7),color:icon?getComputedStyle(icon).color:null}})`);
	console.log(JSON.stringify(navColors));
	const topKeys = ['00_Inbox', '10_档案', '20_Work', '30_Library', '40_Misc', '50_Archive'];
	const top = topKeys.map((key) => navColors.find((row) => row.key === key)?.color);
	check('top-level folders have distinct colors', new Set(top).size === topKeys.length && top.every(Boolean), top);
	const colorOf = (key) => navColors.find((row) => row.key === key)?.color;
	check('subfolders inherit the top-level color', colorOf('20_Work/Alpha') === colorOf('20_Work') && colorOf('10_档案') === colorOf('10_档案') && colorOf('20_Work/Alpha') !== colorOf('10_档案'), navColors.filter((row) => row.key.startsWith('20_Work')));
	await shot('2-nav-colors', await sidebarClip());

	// The Obsidian file list shows the same colors.
	await c.evaluate(`(async()=>{const leaf=app.workspace.getLeavesOfType('file-explorer')[0]??app.workspace.getLeftLeaf(false);await leaf.setViewState({type:'file-explorer'});app.workspace.revealLeaf(leaf);return true})()`);
	await until(`document.querySelectorAll('.nav-folder-title').length>5`, 'file explorer rendered');
	await c.evaluate(`(async()=>{for(const p of ['20_Work','20_Work/Alpha','10_档案']){const el=document.querySelector('.nav-folder-title[data-path="'+p+'"]');if(el&&el.closest('.nav-folder')?.classList.contains('is-collapsed'))el.click();await new Promise(r=>setTimeout(r,200))}return true})()`);
	await delay(800);
	const explorer = await c.evaluate(`[...document.querySelectorAll('.nav-folder-title')].map(t=>{const svg=t.querySelector('.iconic-sidekick .svg-icon');return {key:t.dataset.path,color:svg?getComputedStyle(svg).color:null}}).filter(r=>r.key)`);
	console.log(JSON.stringify(explorer));
	const exColor = (key) => explorer.find((row) => row.key === key)?.color;
	check('file list: top-level folders have distinct colors', new Set(topKeys.map(exColor)).size === topKeys.length && topKeys.every(exColor), topKeys.map(exColor));
	check('file list: same colors as the navigator', topKeys.every((key) => exColor(key) === colorOf(key)), topKeys.map((key) => [exColor(key), colorOf(key)]));
	check('file list: nested folders inherit', exColor('20_Work/Alpha') === exColor('20_Work'), [exColor('20_Work/Alpha'), exColor('20_Work')]);
	await shot('3-file-list-colors', await sidebarClip());

	// A top-level folder created later shifts the colors after it.
	await c.evaluate(`app.vault.createFolder('05_New').then(()=>true)`);
	await delay(800);
	const shifted = await c.evaluate(`[...document.querySelectorAll('.nav-folder-title')].map(t=>{const svg=t.querySelector('.iconic-sidekick .svg-icon');return [t.dataset.path,svg?getComputedStyle(svg).color:null]})`);
	check('new top-level folder recolors the folders after it', JSON.stringify(shifted.find(([key]) => key === '10_档案')) !== JSON.stringify(['10_档案', exColor('10_档案')]), shifted.filter(([key]) => /^\d\d_/.test(key)));
	await c.evaluate(`app.fileManager.trashFile(app.vault.getFolderByPath('05_New'))`);
	await delay(600);

	// 3. Clicks open notes in tabs.
	await c.evaluate(`app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
	await delay(400);
	const clickFolder = (key) => c.evaluate(`document.querySelector('[data-nav-key="folder:${key}"]').click();true`);
	const clickNote = (notePath, alt = false) => c.evaluate(`(()=>{const el=document.querySelector('[data-note-path="${notePath}"]');el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,altKey:${alt}}));return true})()`);
	const tabs = () => c.evaluate(`app.workspace.getLeavesOfType('markdown').map(l=>l.view.file?.path)`);
	const active = () => c.evaluate(`app.workspace.getActiveFile()?.path`);
	await clickFolder('10_档案');
	await until(`!!document.querySelector('[data-note-path="10_档案/x.md"]')`, 'list shows x.md');
	const before = (await tabs()).length;
	await clickNote('10_档案/x.md');
	await until(`app.workspace.getActiveFile()?.path==='10_档案/x.md'`, 'x.md opened');
	check('click opens a new tab', (await tabs()).length === before + 1, await tabs());
	await clickFolder('00_Inbox');
	await until(`!!document.querySelector('[data-note-path="00_Inbox/idea.md"]')`, 'list shows idea.md');
	await clickNote('00_Inbox/idea.md');
	await until(`app.workspace.getActiveFile()?.path==='00_Inbox/idea.md'`, 'idea.md opened');
	check('second click opens another tab', (await tabs()).length === before + 2, await tabs());
	await clickFolder('10_档案');
	await until(`!!document.querySelector('[data-note-path="10_档案/x.md"]')`, 'list shows x.md again');
	await clickNote('10_档案/x.md');
	await until(`app.workspace.getActiveFile()?.path==='10_档案/x.md'`, 'x.md activated');
	check('clicking an open note activates its tab, no new tab', (await tabs()).length === before + 2, await tabs());
	await clickFolder('00_Inbox');
	await until(`!!document.querySelector('[data-note-path="00_Inbox/idea.md"]')`);
	await clickNote('00_Inbox/idea.md', true);
	await until(`app.workspace.getActiveFile()?.path==='00_Inbox/idea.md'`);
	check('Alt+click replaces the current tab instead of opening another one', (await tabs()).length === before + 2, await tabs());
	await clickFolder('10_档案/个人档案');
	await until(`!!document.querySelector('[data-note-path="10_档案/个人档案/p1.md"]')`);
	await clickNote('10_档案/个人档案/p1.md', true);
	await until(`app.workspace.getActiveFile()?.path==='10_档案/个人档案/p1.md'`);
	check('Alt+click on a closed note replaces the current tab', (await tabs()).length === before + 2, await tabs());

	// 4. Attachments: paste and drop an image into the note.
	await c.evaluate(`app.workspace.openLinkText('10_档案/x.md','',false);true`);
	await until(`app.workspace.getActiveFile()?.path==='10_档案/x.md'&&!!app.workspace.activeEditor?.editor`, 'x.md editor');
	// Obsidian cancels the default of every paste it handles itself, so what matters is the state our handler left:
	// a listener registered later sees defaultPrevented right after the plugin's own handler ran.
	await c.evaluate(`window.__claimed={};app.workspace.on('editor-paste',(e)=>{window.__claimed.paste=e.defaultPrevented});app.workspace.on('editor-drop',(e)=>{window.__claimed.drop=e.defaultPrevented});true`);
	const paste = (kind) => c.evaluate(`(async()=>{window.__claimed={};const bytes=Uint8Array.from(atob('${PNG}'),ch=>ch.charCodeAt(0));const file=new File([bytes],'image.png',{type:'image/png'});const dt=new DataTransfer();${kind === 'text' ? "dt.setData('text/plain','just text');" : 'dt.items.add(file);'}const target=document.querySelector('.workspace-leaf.mod-active .cm-content');target.focus();const ev=${kind === 'drop' ? "new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:300,clientY:200})" : "new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})"};target.dispatchEvent(ev);return window.__claimed['${kind === 'drop' ? 'drop' : 'paste'}']})()`);
	check('plain text paste is left to Obsidian', (await paste('text')) === false);
	check('image paste is claimed', (await paste('image')) === true);
	await until(`app.workspace.activeEditor.editor.getValue().includes('![[')`, 'link inserted');
	const assets = await fs.readdir(path.join(runtime.vault, '10_档案', 'assets')).catch(() => []);
	console.log(JSON.stringify(assets));
	check('pasted file lives in assets next to the note', assets.length === 1 && new RegExp(`^${iso}-\\d{6}-[0-9a-f]{4}\\.png$`).test(assets[0]), assets);
	const value = await c.evaluate(`app.workspace.activeEditor.editor.getValue()`);
	check('the link points at it', value.includes(`![[${assets[0]}]]`), value);
	check('the saved bytes are the image', (await fs.readFile(path.join(runtime.vault, '10_档案', 'assets', assets[0]))).toString('base64') === PNG);
	check('image paste is claimed (drop)', (await paste('drop')) === true);
	await until(`(app.workspace.activeEditor.editor.getValue().match(/!\\[\\[/g)||[]).length===2`, 'second link inserted');
	const assets2 = await fs.readdir(path.join(runtime.vault, '10_档案', 'assets'));
	check('dropped file gets its own name', assets2.length === 2 && new Set(assets2).size === 2, assets2);
	check('nothing landed in the vault root or an attachments folder', !(await exists('assets')) && !(await exists('image.png')));
	await delay(300);
	await shot('4-pasted-attachment');

	// 5. New note: dated name and default properties, F2 selects only the Name.
	await clickFolder('00_Inbox');
	await until(`!!document.querySelector('[data-navigator-pane=list]')`);
	await c.evaluate(`[...document.querySelectorAll('[data-navigator-pane=list] button')].find(b=>b.getAttribute('aria-label')==='新建笔记')?.click();true`);
	const created = `00_Inbox/${iso}-未命名.md`;
	await until(`!!app.vault.getFileByPath(${JSON.stringify(created)})`, 'new note created');
	const content = await fs.readFile(path.join(runtime.vault, created), 'utf8');
	check('new note is named YYYY-MM-DD-未命名', await exists(created), created);
	check('new note starts with the default properties', content === '---\n状态: 在用\ntags:\n  - \n  - \n---\n', content);
	await c.evaluate(`[...document.querySelectorAll('[data-navigator-pane=list] button')].find(b=>b.getAttribute('aria-label')==='新建笔记')?.click();true`);
	await until(`!!app.vault.getFileByPath(${JSON.stringify(`00_Inbox/${iso}-未命名 2.md`)})`, 'second note gets a number');
	check('a second new note gets a number', await exists(`00_Inbox/${iso}-未命名 2.md`));
	await c.evaluate(`(()=>{const list=document.querySelector('[data-navigator-pane=list] [role=listbox]');list.focus();return true})()`);
	await c.evaluate(`document.querySelector('[data-navigator-pane=list] [role=listbox]').dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true,cancelable:true}));true`);
	await until(`!!document.querySelector('[data-navigator-pane=list] input')`, 'rename editor open');
	const selection = await c.evaluate(`(()=>{const i=document.querySelector('[data-navigator-pane=list] input');return {value:i.value,start:i.selectionStart,end:i.selectionEnd}})()`);
	check('F2 selects only the Name part', selection.value.startsWith(`${iso}-`) && selection.start === iso.length + 1 && selection.end === selection.value.length, selection);
	await shot('5-new-note-rename', await sidebarClip());
	await c.evaluate(`document.querySelector('[data-navigator-pane=list] input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));true`);

	// 6. Settings pages show the new rows.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbenchSettings('navigator');true`);
	await until(`document.body.innerText.includes('附件文件夹名称')`, 'navigator settings rendered');
	await c.evaluate(`[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent==='新笔记的默认属性').pop()?.scrollIntoView({block:'center'});true`);
	await delay(500);
	check('settings show open-in, default properties, attachments', await c.evaluate(`['点击笔记时打开于','新笔记的默认属性','附件保存在笔记同级目录','附件文件夹名称'].every((text)=>document.body.innerText.includes(text))`));
	await shot('6-settings-behaviour');
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'icons'});true`);
	await until(`!!document.querySelector('[data-shell-region]')&&document.body.innerText.includes('侧边栏和标签页标题')`, 'icons page rendered');
	await c.evaluate(`[...document.querySelectorAll('button,[role=tab],a,div')].filter(e=>e.children.length<=2&&e.textContent.trim()==='侧边栏和标签页标题').pop()?.click();true`);
	await until(`document.body.innerText.includes('按一级文件夹着色')`, 'icons settings rendered');
	await delay(400);
	await shot('7-settings-icons');

	const errors = await c.evaluate(`window.huhuAcceptanceErrors`);
	check('no console errors', errors.length === 0, errors.slice(0, 3));
	const homeAfter = await fs.stat(path.join(process.env.HOME ?? '/root', '.codex')).then((s) => s.mtimeMs, () => null);
	check('real home untouched', homeBefore === homeAfter);
	console.log('DONE ' + label);
} finally {
	await runtime.stop();
}
