// Acceptance: the two persistence roots. User content goes to the visible `huhu/` folder (no spaces in generated
// names), only boards and automation definitions are hidden documents in `.huhu/`, and `.huhu/content/` is never made.
// HOME / XDG dirs point into the fixture (fresh-vault.mjs), so the real home configuration is never touched.
//   pnpm run build
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian [HUHU_THEME=minimal HUHU_MINIMAL_THEME=<dir>] [HUHU_MODE=dark] [HUHU_SHOTS=<dir>] \
//     xvfb-run -a node scripts/obsidian-acceptance/storage-layout.mjs /dev/shm/<new-dir>
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
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const files = {};
if (minimal) {
	const theme = process.env.HUHU_MINIMAL_THEME;
	assert.ok(theme && path.isAbsolute(theme), 'HUHU_MINIMAL_THEME must point to the Minimal theme directory (theme.css, manifest.json)');
	files['.obsidian/themes/Minimal/theme.css'] = await fs.readFile(path.join(theme, 'theme.css'), 'utf8');
	files['.obsidian/themes/Minimal/manifest.json'] = await fs.readFile(path.join(theme, 'manifest.json'), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal', theme: dark ? 'obsidian' : 'moonstone' });
} else files['.obsidian/appearance.json'] = JSON.stringify({ theme: dark ? 'obsidian' : 'moonstone' });
files['普通笔记.md'] = '# 普通笔记\n';
const modules = { home: true, agent: false, browser: false, archives: true, automations: true, notifications: true, icons: false, comments: false, navigator: true, sync: false };
const runtime = await launchFreshVault({
	root,
	files,
	port: Number(process.env.HUHU_STORAGE_PORT || 9413),
	settings: { version: 1, namespaces: { app: { language: 'zh', introSeen: true, modules }, home: {} } },
});
const c = runtime.connection;
const rows = [];
const check = (name, ok, detail) => {
	rows.push({ name, ok: !!ok, detail });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ' ' + JSON.stringify(detail)}`);
	assert.ok(ok, name + (detail === undefined ? '' : ' ' + JSON.stringify(detail)));
};
const until = async (expression, what = expression, tries = 200) => {
	for (let i = 0; i < tries; i++) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${what}`);
};
const shot = (name) => runtime.shot(`${label}-${name}`);
const walk = async (dir, base = dir) => {
	const out = [];
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		if (['.obsidian', '.git'].includes(entry.name)) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...await walk(full, base));
		else out.push(path.relative(base, full));
	}
	return out;
};
/** Vault files that matter: HUHU's visible root and the hidden documents, not browser/config runtime data. */
const layout = async () => (await walk(runtime.vault)).filter((file) => file.startsWith('huhu/') || file.startsWith('.huhu/dashboards/') || file.startsWith('.huhu/automation/definitions/') || file.startsWith('.huhu/content'));
const read = (file) => fs.readFile(path.join(runtime.vault, file), 'utf8');
const exists = (file) => fs.stat(path.join(runtime.vault, file)).then(() => true, () => false);
const click = (selector, text) => c.evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>${text === undefined ? 'true' : `(e.getAttribute('aria-label')||e.textContent).includes(${JSON.stringify(text)})`}&&e.getClientRects().length);if(!el)return false;el.scrollIntoView({block:'center'});el.click();return true})()`);
/** Real mouse press: Radix menus open on pointerdown, which element.click() does not send. */
const press = async (selector, text) => {
	const at = await c.evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>(e.getAttribute('aria-label')||e.textContent).includes(${JSON.stringify(text)})&&e.getClientRects().length);if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
	if (!at) return false;
	for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 });
	return true;
};
const key = async (name, code, vk) => {
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: vk });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: vk });
};
/** Opening a note puts it in a new tab; come back to the board. */
const board = async () => { await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`); await delay(900); };
const typeInto = async (selector, text) => {
	await c.evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length);el.scrollIntoView({block:'center'});el.focus();return true})()`);
	await c.send('Input.insertText', { text });
};

try {
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1500, deviceScaleFactor: 1, mobile: false });
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);
	await until(`!!document.querySelector('[data-expense]')||document.body.innerText.includes('看板')`, 'dashboard rendered');
	await delay(2500);

	// 1. A fresh vault: the board is a hidden document in .huhu/dashboards/, nothing is made under .huhu/content/.
	check('board-is-in-dashboards', await exists('.huhu/dashboards/dashboard.md'));
	check('no-content-folder', !(await exists('.huhu/content')));
	check('no-visible-huhu-folder-yet', !(await exists('huhu')));
	// Put an expense widget and the retired quick-capture widget on the board (the same file the board writes): the expense
	// shows, the retired widget is replaced by the inbox that is already there and leaves the file.
	await c.evaluate(`app.vault.adapter.process('.huhu/dashboards/dashboard.md', t=>t.replace('widgets: [','widgets: [{"memberId":"home:expense:default","provider":"home","kind":"expense","instanceId":"default"},{"memberId":"home:quickCapture:default","provider":"home","kind":"quickCapture","instanceId":"default"},').replace('"lg":[','"lg":[{"i":"widget:expense","x":0,"y":12,"w":6,"h":4},{"i":"widget:quickCapture","x":6,"y":12,"w":6,"h":2},'))`);
	await until(`!!document.querySelector('[data-expense]')&&!!document.querySelector('[data-capture-composer]')`, 'expense widget and the inbox capture strip rendered');
	await until(`app.vault.adapter.read('.huhu/dashboards/dashboard.md').then(t=>!t.includes('quickCapture'))`, 'retired capture widget left the board file');
	check('retired-capture-widget-gone', !(await read('.huhu/dashboards/dashboard.md')).includes('quickCapture') && await c.evaluate(`document.querySelectorAll('[data-capture-composer]').length===1`));
	await delay(800);
	await shot('1-board');

	// 2. Inbox: "新增条目" opens a field at the top of the list; Enter makes one flat file with a dash-joined name and the default properties.
	check('inbox-button', await click('button', '新增条目'));
	await until(`!!document.querySelector('[data-inbox-new] input')`, 'new item field');
	await typeInto('[data-inbox-new] input', '买 牛奶');
	await key('Enter', 'Enter', 13);
	await until(`app.vault.getFiles().some(f=>f.path.startsWith('huhu/收件箱/'))`, 'inbox file created');
	const inbox = (await layout()).filter((file) => file.startsWith('huhu/收件箱/'));
	check('inbox-flat-dated-no-space', inbox.length === 1 && /^huhu\/收件箱\/\d{4}-\d{2}-\d{2}-\d{4}-买-牛奶\.md$/.test(inbox[0]), inbox);
	check('inbox-default-properties', (await read(inbox[0])) === '---\n状态: 在用\ntags:\n  - \n---\n', await read(inbox[0]));

	await board();
	// 3. Flash notes: two captures of the day land in one file next to the inbox items, `- HH:mm text` each.
	for (const text of ['第一条闪念', '第二条闪念']) {
		await typeInto('[data-capture-composer] textarea', text);
		await key('Enter', 'Enter', 13);
		await until(`app.vault.getFiles().some(f=>f.path.endsWith('-闪念.md'))&&!document.querySelector('[data-capture-composer] textarea').value`, 'capture submitted: ' + text);
		await delay(300);
	}
	const capturePath = `huhu/收件箱/${iso}-闪念.md`;
	await until(`!!app.vault.getAbstractFileByPath(${JSON.stringify(capturePath)})`, 'capture day file');
	const day = await read(capturePath);
	check('capture-one-file-two-lines', /^---\n状态: 在用\ntags:\n {2}- \n---\n- \d{2}:\d{2} 第一条闪念\n- \d{2}:\d{2} 第二条闪念\n$/.test(day), day);
	check('capture-folder-gone', !(await exists('huhu/闪念')));

	// 4. Expense: one record under huhu/记账/.
	await typeInto('[data-expense-form] input[inputmode="decimal"]', '12.5');
	await key('Enter', 'Enter', 13);
	await until(`app.vault.getFiles().some(f=>f.path.startsWith('huhu/记账/'))`, 'expense record created');
	await delay(800);

	// 5. Calendar: opening today's journal note creates it under huhu/日志/.
	await board();
	check('calendar-today-cell', await click('[aria-label]', `${now.getMonth() + 1}月${now.getDate()}日`));
	await delay(700);
	await typeInto('[role=dialog] input', '日历里的任务');
	await delay(300);
	check('add-day-task', await click('[role=dialog] button', '添加'));
	const dailyPath = `huhu/日志/日记/${now.getFullYear()}/${pad(now.getMonth() + 1)}/${iso}.md`;
	await until(`!!app.vault.getAbstractFileByPath(${JSON.stringify(dailyPath)})`, 'daily note created');
	check('daily-note-in-journal-root', true, dailyPath);
	await click('[role=dialog] button', '关闭');

	// 6. Task archive: complete a card and archive it into huhu/待办/已完成.md (the default path is valid).
	await board();
	const tasks = await c.evaluate(`[...document.querySelectorAll('input[type=checkbox],[role=checkbox]')].length`);
	check('todo-has-checkable-cards', tasks > 0, tasks);
	await c.evaluate(`(()=>{const box=[...document.querySelectorAll('[role=checkbox],input[type=checkbox]')].find(e=>e.getClientRects().length);box.scrollIntoView({block:'center'});box.click();return true})()`);
	await delay(1200);
	check('archive-menu-open', await press('button', '待办的更多操作'));
	await delay(500);
	check('archive-menu-item', await press('[role=menuitem]', '归档'), await c.evaluate(`[...document.querySelectorAll('[role=menuitem],[role=menu]')].map(e=>e.textContent)`));
	await delay(500);
	check('archive-confirm', await click('[role=alertdialog] button,[role=dialog] button', '归档已完成待办'));
	await until(`!!app.vault.getAbstractFileByPath('huhu/待办/已完成.md')`, 'archive file created').catch(async () => { await shot('6-archive-failed'); throw new Error('archive file not created ' + JSON.stringify({ errors: await c.evaluate('window.huhuAcceptanceErrors'), toast: await c.evaluate(`[...document.querySelectorAll('.notice,[data-sonner-toast]')].map(e=>e.textContent)`), files: await layout() })); });
	check('archive-default-path', (await read('huhu/待办/已完成.md')).includes('尝试添加一张新卡片'));
	await shot('2-board-with-records');

	// 7. HUHU files page: lists huhu/ and creates a note there.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'content'});true`);
	await until(`document.body.innerText.includes('新建笔记')`, 'HUHU files panel with new-note action');
	await delay(800);
	const tree = await c.evaluate(`document.body.innerText`);
	check('files-tree-shows-huhu-folders', ['收件箱', '记账', '日志', '待办'].every((name) => tree.includes(name)), tree.slice(0, 400));
	check('files-tree-hides-hidden-docs', !tree.includes('dashboard'));
	check('files-overview-lists-files', await c.evaluate(`!!document.querySelector('[data-content-overview]')&&!document.querySelector('textarea')`));
	check('files-new-note-button', await click('button', '新建笔记'));
	await until(`app.vault.getFiles().some(f=>f.path.startsWith('huhu/笔记/'))`, 'new note created in huhu/笔记');
	await until(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path.startsWith('huhu/笔记/'))`, 'new note opened in a native markdown tab');
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'content'});true`);
	await until(`!!document.querySelector('[data-content-overview]')`, 'overview back');
	await delay(800);
	check('overview-row-opens-native-tab', await click('[data-content-overview] button', '收件箱') || await click('[data-content-overview] button', '新条目'));
	await until(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path.startsWith('huhu/收件箱/'))`, 'inbox note opened natively');
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'content'});true`);
	await delay(1000);
	await shot('3-huhu-files');

	// 8. Archives: a person is a folder under huhu/档案/个人档案/<name>/ with spaces turned into dashes.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'contacts'});true`);
	await until(`[...document.querySelectorAll('button')].some(b=>(b.getAttribute('aria-label')||b.textContent).includes('新增'))`, 'archive page with add button');
	await delay(500);
	await click('button', '新增');
	await until(`!!document.querySelector('input[name=name],input[aria-label*="姓名"],input[placeholder*="姓名"]')`, 'person form').catch(async () => { await shot('8-archive-form'); throw new Error('person form not found'); });
	await typeInto('input[name=name],input[aria-label*="姓名"],input[placeholder*="姓名"]', '王 小明');
	await delay(300);
	check('archive-save', await click('button', '保存'));
	await until(`app.vault.getFiles().some(f=>f.path.startsWith('huhu/档案/个人档案/'))`, 'person file created').catch(async () => { await shot('8-archive-failed'); throw new Error('person not created'); });
	await delay(800);
	await shot('4-archives');

	// 9. The vault: everything HUHU made is under huhu/ without a space; .huhu/content/ never appeared.
	const all = await layout();
	console.log(all.join('\n'));
	check('no-content-folder-after-use', !all.some((file) => file.startsWith('.huhu/content')) && !(await exists('.huhu/content')));
	check('huhu-files-have-no-space', all.filter((file) => file.startsWith('huhu/')).every((file) => !file.includes(' ')), all);
	for (const prefix of ['huhu/收件箱/', 'huhu/记账/', 'huhu/日志/日记/', 'huhu/待办/', 'huhu/笔记/', 'huhu/档案/个人档案/王-小明/']) check('has-' + prefix, all.some((file) => file.startsWith(prefix)), all.filter((file) => file.startsWith(prefix)));
	check('ordinary-note-untouched', (await read('普通笔记.md')) === '# 普通笔记\n');

	// 10. Native file list: reveal huhu/ in Obsidian's own explorer.
	await c.evaluate(`app.commands.executeCommandById('file-explorer:open');true`);
	await delay(800);
	await c.evaluate(`(async()=>{const leaf=app.workspace.getLeavesOfType('file-explorer')[0];if(!leaf)return;app.workspace.revealLeaf(leaf);const view=leaf.view;for(const p of ['huhu','huhu/收件箱','huhu/记账','huhu/日志','huhu/待办','huhu/笔记','huhu/档案']){const f=app.vault.getAbstractFileByPath(p);if(f&&view.fileItems?.[p]?.setCollapsed)view.fileItems[p].setCollapsed(false)}return true})()`);
	await delay(800);
	await shot('5-native-file-explorer');

	// 11. The board layout (with the added widgets) survives a restart.
	const boardText = await read('.huhu/dashboards/dashboard.md');
	await runtime.restart();
	await runtime.connection.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1500, deviceScaleFactor: 1, mobile: false });
	await runtime.connection.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);
	await delay(3500);
	const after = await runtime.connection.evaluate(`({expense:!!document.querySelector('[data-expense]'),capture:!!document.querySelector('[data-capture-composer]'),inbox:document.body.innerText.includes('收件箱')})`);
	check('layout-survives-restart', after.expense && after.capture && after.inbox, after);
	check('board-file-kept', (await read('.huhu/dashboards/dashboard.md')).includes('home:expense:default') && boardText.includes('home:expense:default'));
	check('still-no-content-folder', !(await exists('.huhu/content')));
	await runtime.shot(`${label}-6-after-restart`);
	const errors = await runtime.connection.evaluate(`window.huhuAcceptanceErrors||[]`);
	check('no-console-errors', errors.length === 0, errors.slice(0, 3));
} catch (error) {
	await shot('failure').catch(() => undefined);
	throw error;
} finally {
	await fs.writeFile(path.join(runtime.evidence, `${label}-results.json`), JSON.stringify(rows, null, 2)).catch(() => undefined);
	await runtime.stop();
}
