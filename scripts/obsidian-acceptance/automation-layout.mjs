// Acceptance: the standalone automation board, inline editor (every action kind, including open-url) and run history have even padding,
// no overflow and no overlap; an open-url automation is saved, reopened and run in HUHU's browser.
// Fresh disposable vault; HOME, CLI homes and XDG dirs are pointed into the fixture root.
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_AU_ROOT=/dev/shm/au/run1 [HUHU_AU_MINIMAL=~/refs/obsidian-minimal-9.0.2] \
//   [HUHU_AU_MODE=dark] [HUHU_AU_WIDTH=1440] [HUHU_AU_SHOTS=<dir>] [HUHU_AU_PORT=19701] \
//   xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/automation-layout.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_AU_ROOT;
assert.ok(root && path.isAbsolute(root), 'HUHU_AU_ROOT must be an absolute path that does not exist yet');
const minimalDir = process.env.HUHU_AU_MINIMAL;
const dark = process.env.HUHU_AU_MODE === 'dark';
const width = Number(process.env.HUHU_AU_WIDTH || 1440);
const shots = process.env.HUHU_AU_SHOTS;
const label = `${minimalDir ? 'minimal' : 'default'}-${dark ? 'dark' : 'light'}-${width}`;
const home = path.join(root, 'home');
Object.assign(process.env, {
	CODEX_HOME: path.join(home, '.codex'),
	CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
	GROK_HOME: path.join(home, '.grok'),
	GEMINI_CLI_HOME: path.join(home, '.gemini'),
	XDG_DATA_HOME: path.join(home, '.local/share'),
	XDG_CACHE_HOME: path.join(home, '.cache'),
	XDG_STATE_HOME: path.join(home, '.local/state'),
});
const files = { 'Welcome.md': '# Welcome\n' };
files['.huhu/dashboards/dashboard.md'] = `---
dashboard: true
widgets: [{"memberId":"calendar","provider":"home","kind":"calendar","instanceId":"default"}]
grid: {"v":2,"lg":[{"i":"widget:calendar","x":0,"y":0,"w":12,"h":2}]}
columns: []
---
`;
const appearance = { theme: dark ? 'obsidian' : 'moonstone' };
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json'])
		files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	appearance.cssTheme = 'Minimal';
}
files['.obsidian/appearance.json'] = JSON.stringify(appearance);
// A local page for the open-url run; nothing leaves the machine.
const hits = [];
const server = http.createServer((request, response) => {
	hits.push(request.url);
	response.setHeader('content-type', 'text/html');
	response.end('<title>AU page</title><h1>AU page</h1>');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const pageUrl = `http://127.0.0.1:${server.address().port}/au`;
const modules = { home: true, agent: true, automations: true, notifications: true, archives: false, comments: false, browser: true, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_AU_PORT || 19701),
	files,
	settings: { version: 1, namespaces: { app: { language: 'zh', introSeen: true, modules }, home: { calendarTaskTarget: { kind: 'file', path: 'CalendarTasks.md' } } } },
});
const c = runtime.connection;
const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,800)').catch(() => '')}`);
};
const center = (selector, text) =>
	c.evaluate(`(() => { const all = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(e => e.getBoundingClientRect().width > 0); const e = ${text ? `all.find(e => e.textContent.trim() === ${JSON.stringify(text)}) ?? all.find(e => e.textContent.includes(${JSON.stringify(text)}))` : 'all[0]'}; if (!e) throw Error('Missing ' + ${JSON.stringify(selector + ' ' + (text ?? ''))}); e.scrollIntoView({block:'nearest'}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
async function mouse(point, clicks = 1) {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	if (clicks) {
		await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: clicks, ...point });
		await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: clicks, ...point });
	}
	await delay(350);
}
const click = async (selector, text) => mouse(await center(selector, text));
const editor = '[data-automation-editor]';
const setInput = (selector, value) =>
	c.evaluate(`(() => { const i = document.querySelector(${JSON.stringify(selector)}); if (!i) throw Error('Missing ${selector.replaceAll("'", '')}'); const proto = i instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const choose = async (ariaLabel, option) => {
	await click(`${editor} [aria-label="${ariaLabel}"]`);
	await click('[role=option]', option);
};
const shot = async (name) => {
	await delay(300);
	if (!shots) return;
	await fs.mkdir(shots, { recursive: true });
	const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
	await fs.writeFile(path.join(shots, `${label}-${name}.jpg`), Buffer.from(data, 'base64'));
};
const tabs = () =>
	c.evaluate(`[...document.querySelectorAll('[role=tablist] [role=tab]')].map(e => ({ id: e.dataset.tabId, title: e.textContent.trim(), active: e.getAttribute('aria-selected') === 'true' }))`);
// Anything in the page that sticks out of its scroll container or the window, or text overflowing its own box.
const audit = (selector) =>
	c.evaluate(`(() => {
		const root = document.querySelector(${JSON.stringify(selector)});
		const rootBox = root.getBoundingClientRect();
		const bad = [];
		for (const e of root.querySelectorAll('*')) {
			const r = e.getBoundingClientRect();
			if (!r.width || !r.height || e.closest('[aria-hidden=true]')) continue;
			let clipped = false;
			for (let p = e.parentElement; p && p !== root.parentElement; p = p.parentElement) {
				const o = getComputedStyle(p);
				if (/(auto|scroll|hidden)/.test(o.overflowX)) { const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) clipped = !/(auto|scroll)/.test(o.overflowX) || false; break; }
			}
			if (r.right > rootBox.right + 1 || r.left < rootBox.left - 1 || clipped)
				bad.push(e.tagName + '.' + String(e.className).slice(0, 50) + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
		}
		const inputs = [...root.querySelectorAll('input,textarea,button[role=combobox]')].filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return { n: e.getAttribute('aria-label') || e.id, l: Math.round(r.left - rootBox.left), r: Math.round(rootBox.right - r.right) }; });
		return { bad: bad.slice(0, 8), edge: inputs.filter(i => i.l < 12 || i.r < 12), scroll: document.documentElement.scrollWidth > innerWidth + 1 };
	})()`);
const openList = () => c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'automations', section: 'tasks' }).then(() => true)`).then(() => delay(900));
const errorsNow = () => c.evaluate('window.huhuAcceptanceErrors ?? []');
const results = [];
const check = (name, detail) => {
	if (detail && typeof detail === 'object' && 'bad' in detail) {
		assert.deepEqual(detail.bad, [], `${name}: nothing overflows`);
		assert.deepEqual(detail.edge, [], `${name}: form controls have padding`);
		assert.equal(detail.scroll, false, `${name}: no horizontal page scroll`);
	}
	results.push({ name, detail });
	console.log('PASS', name, JSON.stringify(detail ?? ''));
};

try {
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, 900); true`);
	await delay(800);
	await c.evaluate(`app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}); app.updateTheme(); true`);
	await delay(500);
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'terminal' }).then(() => true)`);
	await until(`!!document.querySelector('[data-agent-workspace]')`, 'agent workspace');
	assert.equal(await c.evaluate(`!!document.querySelector('[data-agent-workspace] button[aria-label="自动化看板"]')`), false, 'agent has no automation entry');
	await openList();
	await until(`!!document.querySelector('[data-automation-page]')`, 'automations list');
	assert.equal(await c.evaluate(`!!document.querySelector('[data-automation-page]')?.closest('[data-agent-workspace]')`), false, 'automation board is independent of agent');
	await shot('01-list-empty');
	check('list-empty-audit', await audit('[data-automation-page]'));

	// New automation: every action kind in the editor.
	await c.evaluate(`document.querySelector('[data-automation-page]').querySelector('button')?.blur(); true`);
	await until(`[...document.querySelectorAll('[data-automation-page] button')].some(b => b.textContent.includes('新建自动化') && b.getBoundingClientRect().width > 0)`, 'new button');
	await click('[data-automation-page] button', '新建自动化');
	await until(`!!document.querySelector('${editor}')`, 'editor tab');
	await shot('02a-editor-new-clean');
	assert.equal(await c.evaluate(`!!document.querySelector('${editor} p.text-destructive')`), false, 'a new form shows no red errors');
	await setInput(`${editor} input[placeholder="名称"]`, '每日整理');
	await shot('02-editor-agent');
	check('editor-agent-audit', await audit(editor));
	const kinds = [['终端脚本', 'script'], ['新建待办', 'create-task'], ['提醒', 'notify'], ['Obsidian 命令', 'command'], ['打开笔记', 'file'], ['打开网页', 'url']];
	for (const [text, key] of kinds) {
		await choose('执行动作', text);
		await delay(300);
		await shot(`03-editor-${key}`);
		check(`editor-${key}-audit`, await audit(editor));
	}
	// open-url: empty address is explained, a bad one too, then a good one saves.
	assert.ok(!(await c.evaluate(`document.querySelector('${editor}').innerText`)).includes('补执行宽限'), 'manual-only action hides the grace setting');
	const emptyHint = await c.evaluate(`document.querySelector('${editor}').innerText`);
	assert.ok(!emptyHint.includes('提示词'), 'open-url must not ask for a prompt: ' + emptyHint.slice(0, 300));
	await setInput(`${editor} input[aria-label="网址"]`, pageUrl);
	await shot('04-editor-url-filled');
	await click(`${editor} button`, '创建');
	await until(`!document.querySelector('${editor}') && !!document.querySelector('[data-automation-row-id]')`, 'saved row replaces editor');
	check('open-url-saved', await tabs());

	// Reopen from the list and verify the address is still there.
	await openList();
	await until(`!!document.querySelector('[data-automation-row-id]')`, 'saved row');
	await shot('05-list-with-row');
	check('list-audit', await audit('[data-automation-page]'));
	await click('button[aria-label$="的操作"]');
	await click('[role=menuitem]', '编辑');
	await until(`!!document.querySelector('${editor} input[aria-label="网址"]')`, 'editor reopened');
	assert.equal(await c.evaluate(`document.querySelector('${editor} input[aria-label="网址"]').value`), pageUrl);
	check('open-url-roundtrip', pageUrl);
	// Manual run from the editor opens the page in HUHU's browser.
	await click(`${editor} button`, '保存并运行');
	for (let i = 0; i < 100 && !hits.length; i++) await delay(100);
	assert.ok(hits.length, 'the browser requested the page');
	check('open-url-ran', { hits, tabs: await tabs() });
	await shot('06-after-run');

	// Running from the list row (menu) opens the page again.
	await openList();
	await until(`!!document.querySelector('[data-automation-row-id]')`, 'row for the menu run');
	const before = hits.length;
	await click('button[aria-label$="的操作"]');
	await click('[role=menuitem]', '运行');
	for (let i = 0; i < 100 && hits.length === before; i++) await delay(100);
	assert.ok(hits.length > before, 'running from the list opens the page');
	check('open-url-ran-from-list', hits);

	// Detail and run history.
	await openList();
	if (!(await c.evaluate(`!!document.querySelector('[data-automation-row-id]')`))) await click('[data-automation-page] header button', '自动化看板');
	await until(`!!document.querySelector('[data-automation-row-id]')`, 'row');
	await click('[data-automation-row-id]');
	await delay(500);
	await shot('07-detail-or-list');
	check('detail-audit', await audit('[data-automation-page]'));
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'automations', section: 'runs' }).then(() => true)`);
	await until(`document.querySelector('[data-automation-page]')?.innerText.includes('运行')`, 'runs page');
	await shot('08-runs');
	check('runs-audit', await audit('[data-automation-page]'));
	// A calendar task uses the same composer and saves an independent reminder linked to its note.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({ feature: 'dashboard' }).then(() => true)`);
	await until(`!!document.querySelector('[data-calendar-tile] button[aria-label="查看当日日程"]')`, 'calendar today');
	await click('[data-calendar-tile] button[aria-label="查看当日日程"]');
	await until(`!!document.querySelector('[data-day-agenda] input[type=text]')`, 'calendar add task');
	await setInput('[data-day-agenda] input[type=text]', '日历提醒验收');
	await click('[data-day-agenda] button', '添加');
	await until(`[...document.querySelectorAll('[data-agenda-row] button[aria-label="自动化提醒"]')].some(e=>e.getBoundingClientRect().width>0)`, 'calendar reminder bell');
	await click('[data-agenda-row] button[aria-label="自动化提醒"]');
	await until(`!!document.querySelector('[role=dialog] ${editor}')`, 'calendar automation composer');
	assert.equal(await c.evaluate(`document.querySelector('[role=dialog] input[placeholder="名称"]').value`), '日历提醒验收');
	assert.equal(await c.evaluate(`document.querySelector('[role=dialog] textarea').value`), '日历提醒验收');
	await shot('09-calendar-composer');
	check('calendar-composer-audit', await audit('[role=dialog]:has([data-automation-editor])'));
	await click(`[role=dialog] ${editor} button`, '创建');
	await until(`!document.querySelector('[role=dialog] ${editor}')`, 'calendar reminder saved');
	await openList();
	await until(`[...document.querySelectorAll('[data-automation-row-id]')].some(e=>e.textContent.includes('日历提醒验收'))`, 'calendar reminder on automation board');
	const definitions = await fs.readdir(path.join(runtime.vault, '.huhu/automation/definitions'));
	const reminderFolder = definitions.find(name => name.startsWith('日历提醒验收-'));
	assert.ok(reminderFolder, 'calendar reminder persisted');
	const reminder = await fs.readFile(path.join(runtime.vault, '.huhu/automation/definitions', reminderFolder, '操作.md'), 'utf8');
	const link = /^linkPath: (.+)$/m.exec(reminder)?.[1];
	assert.ok(link, 'reminder links back to the task note');
	const sourcePath = link.startsWith('\"') ? JSON.parse(link) : link;
	assert.match(await fs.readFile(path.join(runtime.vault, sourcePath), 'utf8'), /日历提醒验收/, 'linked note contains the task');
	check('calendar-reminder-saved', reminderFolder);
	assert.deepEqual(await errorsNow(), [], 'no console errors');
	await fs.mkdir(path.join(root, 'evidence'), { recursive: true });
	await fs.writeFile(path.join(root, 'evidence', 'results.json'), JSON.stringify(results, null, 2));
	console.log('ALL PASS', label);
} catch (error) {
	await runtime.shot('failure').catch(() => undefined);
	console.error(await c.evaluate('document.body.innerText.slice(0,1200)').catch(() => ''));
	throw error;
} finally {
	server.close();
	await runtime.stop();
}
