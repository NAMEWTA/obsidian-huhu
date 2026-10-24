// Acceptance: board, usage, automations and the automation editor are stable tabs of the agent workspace.
// Fresh disposable vault; HOME, CLI homes and XDG dirs are pointed into the fixture root.
// Run from the repo root after `pnpm run build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_TABS_FIXTURE=/tmp/huhu-tabs-01 [HUHU_TABS_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2] \
//   [HUHU_TABS_PORT=19601] xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/agent-page-tabs.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.env.HUHU_TABS_FIXTURE;
assert.ok(root && root.startsWith('/tmp/huhu-tabs-'), 'HUHU_TABS_FIXTURE must be /tmp/huhu-tabs-<name> and must not exist');
const minimalDir = process.env.HUHU_TABS_MINIMAL_DIR;
const home = path.join(root, 'home');
// Every CLI and XDG location lives inside the fixture; nothing of the real home is read or written.
Object.assign(process.env, {
	CODEX_HOME: path.join(home, '.codex'),
	CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
	GROK_HOME: path.join(home, '.grok'),
	GEMINI_CLI_HOME: path.join(home, '.gemini'),
	XDG_DATA_HOME: path.join(home, '.local/share'),
	XDG_CACHE_HOME: path.join(home, '.cache'),
	XDG_STATE_HOME: path.join(home, '.local/state'),
});
const files = {};
if (minimalDir) {
	for (const file of ['theme.css', 'manifest.json'])
		files[`.obsidian/themes/Minimal/${file}`] = await fs.readFile(path.join(minimalDir, file), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal' });
}
const modules = { home: false, agent: true, automations: true, notifications: true, archives: false, comments: false, browser: false, icons: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root,
	port: Number(process.env.HUHU_TABS_PORT || 19601),
	files: { 'Welcome.md': '# Tabs fixture\n', ...files },
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules } } },
});
let c = runtime.connection;
const results = [];
const check = (name, detail) => results.push({ name, detail });
const until = async (expression, name, timeout = 20000) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error(`Timeout: ${name}\n${await c.evaluate('document.body.innerText.slice(0,600)').catch(() => '')}`);
};
const center = (selector, text) =>
	c.evaluate(`(() => { const all = [...document.querySelectorAll(${JSON.stringify(selector)})]; const e = ${text ? `all.find(e => e.textContent.trim() === ${JSON.stringify(text)}) ?? all.find(e => e.textContent.includes(${JSON.stringify(text)}))` : 'all[0]'}; if (!e) throw Error('Missing ${selector.replaceAll("'", '')} ${text ?? ''}'); e.scrollIntoView({block:'nearest'}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
async function mouse(point, button = 'left', clicks = 1) {
	await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
	if (clicks) {
		await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button, clickCount: clicks, ...point });
		await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button, clickCount: clicks, ...point });
	}
	await delay(350);
}
const click = async (selector, text) => mouse(await center(selector, text));
const visibleTabCenter = (id) =>
	c.evaluate(`(() => { const e = document.querySelector('[role=tab][data-tab-id="${id}"]'); e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const a = e.getBoundingClientRect(), b = e.closest('[role=tablist]').getBoundingClientRect(); const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right); return { x: (left + right) / 2, y: a.top + a.height / 2 }; })()`);
const hover = async (selector, text) => mouse(await center(selector, text), 'left', 0);
async function key(name, modifiers = 0) {
	const code = { Enter: 13, Escape: 27 }[name];
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, modifiers });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, modifiers });
	await delay(300);
}
const shot = async (name) => {
	await delay(250);
	await runtime.shot(name);
};
const tabs = () =>
	c.evaluate(`[...document.querySelectorAll('[role=tablist] [role=tab]')].map(e => ({ id: e.dataset.tabId, title: e.textContent.trim(), active: e.getAttribute('aria-selected') === 'true' }))`);
const workspace = () => c.evaluate(`(() => {
	const surface = app.workspace.getLeavesOfType('huhu-workbench-view')[0].view.getNativeSurfaces().find(s => s.getViewType() === 'huhu-agent-page');
	return surface.controller.workspace.store.getState();
})()`);
const openWorkbench = (target) => c.evaluate(`app.plugins.plugins.huhu.openWorkbench(${JSON.stringify(target)}).then(() => true)`);
const setTheme = async (dark) => {
	await c.evaluate(`app.vault.setConfig('theme', ${JSON.stringify(dark ? 'obsidian' : 'moonstone')}); app.updateTheme(); true`);
	await until(`document.body.classList.contains(${JSON.stringify(dark ? 'theme-dark' : 'theme-light')})`, 'theme');
	await delay(400);
};
const setWidth = async (width) => {
	await c.evaluate(`require('@electron/remote').getCurrentWindow().setSize(${width}, 900); true`);
	await delay(700);
};
const overflow = () =>
	c.evaluate(`(() => { const root = document.querySelector('[data-agent-workspace]'); const bad = [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).slice(0, 5).map(e => e.className.toString().slice(0, 60)); return { bad, scroll: document.documentElement.scrollWidth > innerWidth + 1 }; })()`);
const suffix = minimalDir ? 'minimal' : 'default';
const errorsNow = () => c.evaluate('window.huhuAcceptanceErrors ?? []');

try {
	await setWidth(1440);
	await setTheme(false);
	await openWorkbench({ feature: 'terminal' });
	await until(`!!document.querySelector('[data-page-entry="board"]')`, 'agent sidebar');
	// Deterministic usage history: the native scan needs real CLI logs, which a disposable home has none of.
	await c.evaluate(`(() => {
		const surface = app.workspace.getLeavesOfType('huhu-workbench-view')[0].view.getNativeSurfaces().find(s => s.getViewType() === 'huhu-agent-page');
		const store = surface.controller.historyStore;
		store.refresh = async () => {};
		const day = 86400000, now = Date.now();
		const rows = [];
		for (let i = 0; i < 170; i++) {
			if ((i * 7) % 5 === 0) continue;
			const tokens = Math.round(2000 + Math.abs(Math.sin(i * 1.7)) * 400000 * (i % 9 === 0 ? 6 : 1));
			rows.push({ key: 'k' + i, sessionId: 's' + i, accountKey: '{}', agentId: i % 3 ? 'claude-code' : 'codex', cwd: '/vault', transcriptPath: '/vault/x', modifiedAtMs: now - i * day - 3600000, title: 'Session ' + i, inVault: true, model: 'sonnet', createdAt: null, firstPrompt: 'p', turns: [], messageCount: 4, metadata: {}, usage: { input: tokens, output: Math.round(tokens / 8), cacheRead: 0, cacheWrite: 0, cost: null, known: true } });
		}
		store.store.setState({ rows, loading: false, error: '', warnings: [] });
		return rows.length;
	})()`);

	// 1. The three sidebar entries become tabs and stay.
	assert.deepEqual(await tabs(), [], 'the empty workspace has no tabs');
	for (const page of ['board', 'automations', 'usage']) await click(`[data-page-entry="${page}"]`);
	let list = await tabs();
	assert.deepEqual(list.map((t) => t.id), ['tab-page-board', 'tab-page-automations', 'tab-page-usage'], JSON.stringify(list));
	assert.deepEqual(list.map((t) => t.title), ['Agent dashboard', 'Automations', 'Usage statistics']);
	assert.equal(list.at(-1).active, true);
	check('sidebar-opens-three-tabs', list);
	await shot(`${suffix}-01-three-tabs`);
	for (const page of ['board', 'board', 'usage', 'automations', 'usage', 'board']) await click(`[data-page-entry="${page}"]`);
	list = await tabs();
	assert.equal(list.length, 3, 'repeat clicks only activate');
	assert.equal(list.find((t) => t.active)?.id, 'tab-page-board');
	assert.equal(await c.evaluate(`!!document.querySelector('[role=dialog],[role=alertdialog]')`), false, 'no dialog opens');
	check('repeat-click-only-activates', list);
	assert.equal(await c.evaluate(`document.querySelector('[data-page-entry="board"]').getAttribute('aria-current')`), 'page');

	// 2. Automations: empty list -> template -> editor tab (not a dialog).
	await click(`[data-page-entry="automations"]`);
	await until(`!!document.querySelector('[data-automation-page]')`, 'automations list');
	await shot(`${suffix}-02-automations-list-empty`);
	await click('button', 'Drink water');
	await until(`!!document.querySelector('[data-automation-editor]')`, 'editor tab');
	list = await tabs();
	assert.equal(list.length, 4);
	assert.ok(list.at(-1).id.startsWith('tab-automation-new-') && list.at(-1).active, JSON.stringify(list));
	assert.equal(await c.evaluate(`!!document.querySelector('[role=dialog]')`), false, 'the editor is a tab, not a dialog');
	assert.equal(await c.evaluate(`document.querySelector('input[aria-label="Name"]').value`), 'Drink water');
	check('editor-opens-as-tab', list);
	await shot(`${suffix}-03-editor-tab-new`);
	const editorBox = await c.evaluate(`(() => { const e = document.querySelector('[data-automation-editor]'); const r = e.getBoundingClientRect(); const foot = [...e.querySelectorAll('button')].find(b => b.textContent === 'Create').getBoundingClientRect(); const host = e.closest('[data-tab-content]').getBoundingClientRect(); return { within: r.bottom <= host.bottom + 1 && r.right <= host.right + 1, footerInside: foot.bottom <= host.bottom + 1 && foot.top >= host.top }; })()`);
	assert.ok(editorBox.within && editorBox.footerInside, JSON.stringify(editorBox));
	// Save keeps the tab and renames it.
	await click('button', 'Create');
	await until(`[...document.querySelectorAll('[role=tab]')].some(t => t.textContent.trim() === 'Drink water')`, 'tab renamed after save');
	list = await tabs();
	assert.equal(list.length, 4, 'saving does not open another tab');
	assert.equal(await c.evaluate(`!!document.querySelector('[data-automation-editor]')`), true, 'the editor stays open');
	const saved = await c.evaluate(`document.querySelector('[data-automation-editor]').textContent.includes('Saved.')`);
	assert.ok(saved, 'saved notice shows');
	check('save-keeps-and-renames-tab', list);
	await shot(`${suffix}-04-editor-tab-saved`);

	// 3. Unsaved edits: closing asks inside the page.
	await c.evaluate(`(() => { const i = document.querySelector('input[aria-label="Name"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Drink more water'); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
	await delay(300);
	await click('[role=tab][aria-selected=true] button[aria-label="Close tab"]');
	await until(`!!document.querySelector('[role=alertdialog]')`, 'discard confirmation');
	assert.ok((await c.evaluate(`document.querySelector('[role=alertdialog]').textContent`)).includes('unsaved'), 'confirmation names the unsaved changes');
	await shot(`${suffix}-05-discard-confirmation`);
	await click('[role=alertdialog] button', 'Cancel');
	assert.equal((await tabs()).length, 4, 'cancel keeps the tab');
	await click('[role=tab][aria-selected=true] button[aria-label="Close tab"]');
	await until(`!!document.querySelector('[role=alertdialog]')`, 'discard confirmation again');
	await click('[role=alertdialog] button', 'Discard');
	await until(`document.querySelectorAll('[role=tab]').length === 3`, 'editor closed after discard');
	check('unsaved-close-asks-in-page', await tabs());

	// 4. The saved automation: list row, Edit reuses one tab per automation.
	await click(`[data-page-entry="automations"]`);
	await until(`!!document.querySelector('[data-automation-row-id]')`, 'saved row');
	const id = await c.evaluate(`document.querySelector('[data-automation-row-id]').dataset.automationRowId`);
	await shot(`${suffix}-06-automations-list`);
	for (let i = 0; i < 2; i++) {
		await click(`[data-page-entry="automations"]`);
		await click('button[aria-label^="Actions for"]');
		await click('[role=menuitem]', 'Edit');
		await until(`!!document.querySelector('[data-automation-editor] input[aria-label="Name"]')`, 'editor for the saved automation');
	}
	list = await tabs();
	assert.equal(list.filter((t) => t.id === `tab-automation-${id}`).length, 1, JSON.stringify(list));
	assert.equal(list.length, 4, 'one editor tab per automation');
	check('edit-reuses-the-editor-tab', list);
	assert.equal(await c.evaluate(`document.querySelector('[data-automation-editor] button')?.textContent !== undefined`), true);

	// 5. Deep links keep working: the feature opens the workspace and activates the tab.
	await openWorkbench({ feature: 'automations', section: 'runs' });
	await until(`document.querySelector('[role=tab][aria-selected=true]')?.dataset.tabId === 'tab-page-automations'`, 'deep link activates automations tab');
	await openWorkbench({ feature: 'automations', section: 'tasks', focusId: 'edit', resourceId: id });
	await until(`document.querySelector('[role=tab][aria-selected=true]')?.dataset.tabId === 'tab-automation-${id}'`, 'edit deep link reuses the editor tab');
	await openWorkbench({ feature: 'automations', section: 'tasks', focusId: 'edit' });
	await until(`document.querySelector('[role=tab][aria-selected=true]')?.dataset.tabId.startsWith('tab-automation-new-')`, 'new editor deep link');
	assert.equal(await c.evaluate(`app.workspace.getLeavesOfType('huhu-workbench-view').length`), 1);
	assert.equal(await c.evaluate(`app.workspace.getLeavesOfType('huhu-workbench-view')[0].view.getState().target.feature`), 'terminal');
	check('deep-links-open-tabs', await tabs());
	await click('[role=tab][aria-selected=true] button[aria-label="Close tab"]'); // a pristine new editor closes without asking
	await until(`document.querySelectorAll('[role=tab]').length === 4`, 'pristine editor closed');
	assert.equal(await c.evaluate(`!!document.querySelector('[role=alertdialog]')`), false);

	// 6. Heatmap.
	await click(`[data-page-entry="usage"]`);
	await until(`document.querySelectorAll('[data-usage-heatmap] rect[data-date]').length === 182`, 'heatmap');
	const heat = await c.evaluate(`(() => { const h = document.querySelector('[data-usage-heatmap]'); const rects = [...h.querySelectorAll('rect[data-date]')]; const box = h.getBoundingClientRect(); const page = document.querySelector('[data-usage-stats]').getBoundingClientRect(); const fills = [...new Set(rects.map(r => r.getAttribute('fill')))]; return { blocks: rects.length, levels: [...new Set(rects.map(r => r.dataset.level))].sort(), fills: fills.length, text: h.textContent, fits: box.right <= page.right + 1, svgSize: [rects[0].getBoundingClientRect().width, rects[0].getBoundingClientRect().height] }; })()`);
	assert.equal(heat.blocks, 182);
	assert.deepEqual(heat.levels, ['0', '1', '2', '3', '4']);
	assert.ok(heat.fits, JSON.stringify(heat));
	assert.ok(/Less/.test(heat.text) && /More/.test(heat.text) && /tokens in the last 26 weeks/.test(heat.text), heat.text);
	check('heatmap-structure', heat);
	await c.evaluate(`document.querySelector('[data-usage-heatmap]').scrollIntoView({block:'center'}); true`);
	await shot(`${suffix}-07-usage-heatmap-light`);
	const last = await center('[data-usage-heatmap] rect[data-level="4"]');
	await mouse({ x: last.x - 20, y: last.y - 40 }, 'left', 0);
	await mouse(last, 'left', 0);
	await until(`!!document.querySelector('[role=tooltip]')`, 'heatmap tooltip', 4000);
	const tip = await c.evaluate(`(() => { const t = document.querySelector('[role=tooltip]'); return { text: t.textContent, portal: !!t.closest('.huhu-portal-root') }; })()`);
	assert.ok(/\d{4}-\d{2}-\d{2}: [\d.]+[KM]? tokens/.test(tip.text) && tip.portal, JSON.stringify(tip));
	check('heatmap-tooltip', tip);
	await shot(`${suffix}-08-usage-heatmap-tooltip`);
	await setTheme(true);
	await c.evaluate(`document.querySelector('[data-usage-heatmap]').scrollIntoView({block:'center'}); true`);
	await shot(`${suffix}-09-usage-heatmap-dark`);
	check('heatmap-dark-scheme', await c.evaluate(`document.querySelector('[data-usage-heatmap] rect[data-date]').style.stroke`));
	await setTheme(false);

	// 7. Narrow window: nothing overflows, the heatmap scrolls inside its card, the editor stacks.
	await setWidth(900);
	await click('[role=tab][data-tab-id="tab-page-usage"]');
	await c.evaluate(`document.querySelector('[data-usage-heatmap]').scrollIntoView({block:'center'}); true`);
	const narrow = await overflow();
	assert.deepEqual(narrow, { bad: [], scroll: false }, JSON.stringify(narrow));
	await shot(`${suffix}-10-usage-900`);
	await click('[role=tab]', list.find((t) => t.id.startsWith('tab-automation-'))?.title);
	await until(`!!document.querySelector('[data-automation-editor]')`, 'editor at 900');
	assert.deepEqual(await overflow(), { bad: [], scroll: false });
	await shot(`${suffix}-11-editor-900`);
	await setWidth(1440);

	// 8. Drag to split: a page tab splits like any other tab.
	const board = await center('[role=tab][data-tab-id="tab-page-board"]');
	const area = await c.evaluate(`(() => { const r = document.querySelector('[data-agent-workspace] [data-group-id]').getBoundingClientRect(); return { x: r.right - 30, y: r.top + r.height / 2 }; })()`);
	await mouse(board, 'left', 0);
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...board });
	for (let i = 1; i <= 12; i++) await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1, x: board.x + ((area.x - board.x) * i) / 12, y: board.y + ((area.y - board.y) * i) / 12 });
	await delay(300);
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...area });
	await delay(600);
	const split = await workspace();
	check('split-by-drag', { groups: split.groups.map((g) => g.tabIds) });
	assert.equal(split.groups.length, 2, JSON.stringify(split.groups));
	await shot(`${suffix}-12-split`);

	// 9. Restart: tabs, order, routes and the active tab come back.
	const before = await workspace();
	const active = await c.evaluate(`document.querySelector('[role=tab][aria-selected=true]').dataset.tabId`);
	await delay(1500); // the workspace writes with a 500 ms debounce
	await runtime.restart();
	c = runtime.connection;
	await openWorkbench({ feature: 'terminal' });
	await until(`!!document.querySelector('[data-page-entry="board"]')`, 'agent page after restart');
	const after = await workspace();
	assert.deepEqual(after.groups.map((g) => g.tabIds), before.groups.map((g) => g.tabIds), 'tabs and groups restored');
	assert.equal(after.tabs[`tab-automation-${id}`].resourceId, id);
	assert.equal(after.tabs['tab-page-automations'].page, 'automations');
	check('restart-restores-tabs', { groups: after.groups.map((g) => g.tabIds), active });
	await until(`[...document.querySelectorAll('[role=tab]')].length >= 4`, 'tab strip after restart');
	await shot(`${suffix}-13-after-restart`);
	// Hidden restored tabs mount only when shown.
	// A split group's strip is narrow: click the part of the tab that is actually visible.
	const target = await visibleTabCenter('tab-page-automations');
	await mouse(target);
	await until(`!!document.querySelector('[data-automation-page]')`, 'automations tab after restart');
	await mouse(await visibleTabCenter(`tab-automation-${id}`));
	await until(`document.querySelector('[data-automation-editor] input[aria-label="Name"]')?.value === 'Drink water'`, 'editor restored with its automation');
	check('restored-editor-loads-its-automation', true);

	// 10. Disabling the automations module: the tabs explain, re-enabling brings the panel back.
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('automations', false)`);
	await until(`document.body.innerText.includes('Automations are turned off')`, 'module off hint');
	await shot(`${suffix}-14-module-off`);
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('automations', true)`);
	await until(`!!document.querySelector('[data-automation-editor]')`, 'panel back after enabling');
	const errors = (await errorsNow()).filter((e) => !/ResizeObserver loop/.test(e));
	assert.deepEqual(errors, [], errors.join('\n'));
	check('no-console-errors', errors);
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'results.json'), JSON.stringify(results, null, 2));

	await runtime.stop();
}
console.log(JSON.stringify({ passed: results.length, evidence: runtime.evidence }, null, 2));
