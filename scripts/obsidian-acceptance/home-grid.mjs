// Acceptance: the board is one react-grid-layout grid of fixed-height tiles.
//  - the default board is symmetric: tiles of one row share top and bottom edges, nothing overflows the page;
//  - tiles are dragged and resized with no mode to enter, one write per gesture, and the layout survives a restart;
//  - an old board (banner, immersive tiles, sections and cards) is converted once and keeps all its content;
//  - one column below 600px writes nothing; the six-column layout is stored separately;
//  - dragging also works in a popout window (the grid asks the window that owns it).
// All HOME / CLI homes / XDG dirs point into the fixture (fresh-vault.mjs). Run from the repo root after `pnpm build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_GRID_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2 \
//   xvfb-run -a node scripts/obsidian-acceptance/home-grid.mjs /tmp/huhu-grid-01
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parse as yaml } from 'yaml';
import { launchFreshVault } from './fresh-vault.mjs';

const DEFAULT = '.huhu/dashboards/Default';
const LEGACY = '.huhu/dashboards/Legacy';
const MANY = '.huhu/dashboards/Many';
/** Thirty standalone cards: thirty tiles to drag through. */
const many = `---\nwidgets: []\ngrid: {"v":2,"lg":[]}\ncolumns: [{name: Sticky, type: sticky}]\n---\n\n## Sticky\n\n${Array.from({ length: 30 }, (_, i) => `### Card ${i + 1}\nid: many-${i + 1}\ntype: generic\nBody ${i + 1}\n`).join('\n')}`;
const legacy = `---
custom: keep
layout: immersive
canvas: 1
widgets: [{"memberId":"home:banner:default","provider":"home","kind":"banner","instanceId":"default"},{"memberId":"home:calendar:default","provider":"home","kind":"calendar","instanceId":"default"},{"memberId":"home:pomodoro:default","provider":"home","kind":"pomodoro","instanceId":"default"}]
immersive: [{"id":"widget:banner","w":12,"cap":12,"x":0,"y":0},{"id":"widget:calendar","w":4,"cap":50,"fixed":true,"x":0,"y":12},{"id":"widget:pomodoro","w":3,"cap":24,"fixed":true,"x":4,"y":12},{"id":"section:Notes","w":8,"cap":50,"x":0,"y":62},{"id":"section:Todo","w":4,"cap":50,"x":8,"y":62}]
banner:
  quote: "Keep going"
  author: "Me"
columns:
  - name: "Notes"
    color: "#f59e0b"
    type: memo
  - name: "Todo"
    color: "#6366f1"
    type: todo
---

## Notes

### Grouped memo
id: grouped
type: generic
Visible grouped body.

## Todo

### Tasks
id: tasks
type: task
- [ ] Keep this task
`;
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, sync: false, navigator: false };
const runtime = await launchFreshVault({
	root: process.argv[2],
	port: Number(process.env.HUHU_GRID_PORT || 9281),
	files: { [LEGACY + '.md']: legacy, [MANY + '.md']: many },
	settings: {
		version: 1,
		namespaces: {
			app: { language: 'en', introSeen: true, modules },
			theme: { preset: 'pearl' },
			home: { dashboardFile: DEFAULT, workspaceFiles: [DEFAULT, LEGACY, MANY], workspaceNames: ['', '', ''] },
		},
	},
});
let c = runtime.connection;
const rows = [];
const check = (name, passed, detail) => {
	rows.push({ name, passed, detail });
	if (!passed) console.error('FAILED', name, JSON.stringify(detail)?.slice(0, 700));
};
const until = async (expression, label = expression) => {
	const end = Date.now() + 20000;
	while (Date.now() < end) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(80);
	}
	throw new Error('Timeout: ' + label);
};
const read = (board) => fs.readFile(path.join(runtime.vault, board + '.md'), 'utf8');
const meta = async (board = DEFAULT) => {
	const text = await read(board);
	const front = yaml(text.split('---')[1] ?? '');
	return { text, front, grid: front.grid ?? null, widgets: front.widgets ?? null };
};
const size = async (width, height = 1700) => {
	await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
	await delay(600);
};
const open = async (board = DEFAULT) => {
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:${JSON.stringify(board)}})`);
	await until(`!!document.querySelector('[data-tile]')`, 'tiles');
	await delay(900);
};
const tiles = () =>
	c.evaluate(
		`Array.from(document.querySelectorAll('[data-tile]'),e=>{const r=e.getBoundingClientRect();return {id:e.dataset.tile,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}})`,
	);
const hookWrites = (board) =>
	c.evaluate(
		`(()=>{window.boardWrites=0;window.boardTarget=${JSON.stringify(board)};if(window.boardHooked)return true;window.boardHooked=true;const hit=(f)=>String(f?.path??f).endsWith(window.boardTarget+'.md');for(const [o,k] of [[app.vault,'process'],[app.vault.adapter,'process'],[app.vault.adapter,'write']]){const orig=o[k];if(!orig)continue;o[k]=function(f,...a){if(hit(f))window.boardWrites++;return orig.call(this,f,...a)}}return true})()`,
	);
const writes = () => c.evaluate('window.boardWrites');
const mouse = (type, p) => c.send('Input.dispatchMouseEvent', { type, ...p, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const drag = async (from, to) => {
	await mouse('mousePressed', from);
	await mouse('mouseMoved', { x: from.x + 6, y: from.y + 6 });
	const steps = 6;
	for (let i = 1; i <= steps; i++) await mouse('mouseMoved', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
	await delay(200);
	await mouse('mouseReleased', to);
	await delay(700);
};
const handlePoint = (id) =>
	c.evaluate(
		`(()=>{const t=document.querySelector('[data-tile="${id}"]');t.scrollIntoView({block:'center'});const r=t.querySelector('.huhu-widget-handle').getBoundingClientRect();return {x:r.x+r.width*0.5,y:r.y+r.height/2}})()`,
	);
const resizePoint = (id) =>
	c.evaluate(
		`(()=>{const t=document.querySelector('[data-tile="${id}"]');t.scrollIntoView({block:'center'});t.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const r=t.querySelector('.react-resizable-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
	);
const item = (grid, id, key = 'lg') => grid?.[key]?.find((entry) => entry.i === id);
const near = (a, b) => Math.abs(a - b) < 0.6;
/**
 * Every tile sits on the row grid (top and height are whole 80px rows plus 16px gaps); with `rows`, tiles with the same
 * top must also share the same bottom. Nothing leaves the page.
 */
const alignment = async ({ rows: sameRows = true } = {}) => {
	const all = await tiles();
	const rowsByTop = new Map();
	for (const tile of all) rowsByTop.set(Math.round(tile.y), [...(rowsByTop.get(Math.round(tile.y)) ?? []), tile]);
	const misaligned = [];
	if (sameRows)
		for (const [top, group] of rowsByTop) {
			const first = group[0];
			for (const tile of group) if (!near(tile.y, first.y) || !near(tile.h, first.h) || !near(tile.bottom, first.bottom)) misaligned.push({ top, tile, first });
		}
	const page = await c.evaluate(`(()=>{const r=document.querySelector('.dashboard-scroll-region');const g=document.querySelector('.huhu-widget-grid').getBoundingClientRect();return {scroll:r.scrollWidth,client:r.clientWidth,left:g.left,right:g.right}})()`);
	const outside = all.filter((tile) => tile.x < page.left - 0.6 || tile.right > page.right + 0.6);
	const gridTop = await c.evaluate(`document.querySelector('.huhu-widget-grid').getBoundingClientRect().top`);
	const offGrid = all.filter((tile) => !near((tile.h + 16) % 96, 0) && !near((tile.h + 16) % 96, 96) || (!near((tile.y - gridTop) % 96, 0) && !near((tile.y - gridTop) % 96, 96)));
	if (offGrid.length) misaligned.push(...offGrid.map((tile) => ({ offGrid: tile.id })));
	// content that is wider than its tile must scroll inside it, never push the tile body sideways
	const sideways = await c.evaluate(`Array.from(document.querySelectorAll('[data-tile] .huhu-widget-body'),b=>({id:b.closest('[data-tile]').dataset.tile,over:b.scrollWidth-b.clientWidth})).filter(r=>r.over>1)`);
	return { rowCount: rowsByTop.size, misaligned, outside, pageOverflow: page.scroll > page.client + 1, sideways };
};
const shot = (name) => runtime.shot(name);

try {
	await c.evaluate('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
	await size(1440);
	// 1. The default board: symmetric rows, fixed heights, no mode, no banner.
	await open(DEFAULT);
	await until(`document.querySelectorAll('[data-tile]').length===9`, 'nine default tiles');
	let m = await meta();
	const kinds = m.widgets.map((w) => w.kind);
	check('default-board-members', JSON.stringify(kinds) === JSON.stringify(['calendar', 'clock', 'pomodoro', 'usage', 'weather', 'quick-notes']), kinds);
	check('default-board-has-no-banner-or-edit-mode', !m.text.includes('banner') && !(m.text.includes('immersive')) && (await c.evaluate(`!document.querySelector('.dashboard-banner')&&![...document.querySelectorAll('button')].some(b=>/^(Edit board|Done)$/.test(b.textContent.trim()))`)), m.text.slice(0, 200));
	check('default-grid-is-v2-single-line-json', /^grid: \{"v":2,"lg":\[/m.test(m.text) && m.grid.v === 2 && m.grid.lg.length === 9, m.grid);
	let a = await alignment();
	check('default-rows-share-top-and-bottom-1440', a.rowCount === 4 && a.misaligned.length === 0 && a.outside.length === 0 && !a.pageOverflow, a);
	check('default-tile-bodies-do-not-overflow-sideways', a.sideways.length === 0, a.sideways);
	const all = await tiles();
	const rowHeights = [...new Set(all.map((t) => Math.round(t.h)))].sort();
	check('tile-heights-are-whole-cells', rowHeights.every((h) => [176, 368].includes(h)), rowHeights);
	await shot('01-default-1440-light');
	// 1b. Themes (on the untouched default board): the default theme and Minimal, light and dark.
	const minimalDir = process.env.HUHU_GRID_MINIMAL_DIR;
	if (minimalDir) {
		const themeDir = path.join(runtime.vault, '.obsidian/themes/Minimal');
		await fs.mkdir(themeDir, { recursive: true });
		for (const file of ['theme.css', 'manifest.json']) await fs.copyFile(path.join(minimalDir, file), path.join(themeDir, file));
	}
	for (const [css, base] of [['', 'moonstone'], ['', 'obsidian'], ...(minimalDir ? [['Minimal', 'moonstone'], ['Minimal', 'obsidian']] : [])]) {
		for (const width of [1440, 900]) {
			await c.evaluate(`app.customCss.setTheme(${JSON.stringify(css)});app.vault.setConfig('theme','${base}');app.updateTheme();true`);
			await size(width);
			await delay(700);
			const label = `${css || 'default'}-${base === 'obsidian' ? 'dark' : 'light'}-${width}`;
			a = await alignment();
			check('theme-rows-aligned-' + label, a.misaligned.length === 0 && a.outside.length === 0 && !a.pageOverflow, a);
			await shot('theme-' + label);
		}
	}
	await c.evaluate(`app.customCss.setTheme('');app.vault.setConfig('theme','moonstone');app.updateTheme();true`);
	await size(1440);
	await delay(500);
	// 2. Dragging needs no mode: grab a title bar, drop it elsewhere.
	await hookWrites(DEFAULT);
	const before = m.grid;
	let from = await handlePoint('widget:clock');
	let to = await handlePoint('widget:weather');
	await drag(from, { x: to.x + 40, y: to.y });
	m = await meta();
	check('drag-writes-once', (await writes()) === 1, await writes());
	check('drag-moved-the-clock-and-kept-rows-whole', JSON.stringify(item(m.grid, 'widget:clock')) !== JSON.stringify(item(before, 'widget:clock')) && m.grid.lg.length === 9, { before: item(before, 'widget:clock'), after: item(m.grid, 'widget:clock') });
	a = await alignment();
	check('after-drag-rows-still-aligned', a.misaligned.length === 0 && a.outside.length === 0, a);
	await shot('02-after-drag-1440');
	// pressing in a tile's body never starts a drag
	await hookWrites(DEFAULT);
	const body = await c.evaluate(`(()=>{const t=document.querySelector('[data-tile="widget:calendar"]');const r=t.querySelector('.huhu-widget-body').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.8}})()`);
	await drag(body, { x: body.x + 260, y: body.y + 120 });
	check('body-press-does-not-drag', (await writes()) === 0, await writes());
	// the actions button inside the title bar does not start a drag either
	const actions = await c.evaluate(`(()=>{const b=document.querySelector('[data-tile="widget:calendar"] [aria-label^="More actions"]');const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
	await drag(actions, { x: actions.x - 300, y: actions.y + 200 });
	await c.evaluate(`document.activeElement?.blur?.();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true`);
	check('actions-button-does-not-drag', (await writes()) === 0, await writes());
	// 3. Resizing snaps to cells and stops at the minimum.
	await hookWrites(DEFAULT);
	m = await meta();
	const pomodoro = item(m.grid, 'widget:pomodoro');
	const grid = await c.evaluate(`(()=>{const g=document.querySelector('.huhu-widget-grid').getBoundingClientRect();return {width:g.width}})()`);
	const col = (grid.width - 11 * 16) / 12;
	let handle = await resizePoint('widget:pomodoro');
	await drag(handle, { x: handle.x + col + 16, y: handle.y + 96 });
	let after = item((await meta()).grid, 'widget:pomodoro');
	check('resize-writes-once-and-snaps-to-cells', (await writes()) === 1 && after.w === pomodoro.w + 1 && after.h === pomodoro.h + 1, { pomodoro, after, writes: await writes() });
	await hookWrites(DEFAULT);
	handle = await resizePoint('widget:pomodoro');
	await drag(handle, { x: handle.x - col * 6, y: handle.y - 96 * 4 });
	after = item((await meta()).grid, 'widget:pomodoro');
	check('resize-stops-at-the-minimum-size', after.w === 3 && after.h === 2, after);
	a = await alignment();
	check('after-resize-no-overlap-and-inside', a.outside.length === 0 && !a.pageOverflow, a);
	// 4. The size menu: one write at the tier cells.
	await hookWrites(DEFAULT);
	await c.evaluate(`document.querySelector('[data-tile="widget:weather"] [aria-label^="More actions"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));true`);
	await until(`!!document.querySelector('[role="menuitemcheckbox"]')`, 'size menu');
	await shot('03-tile-menu-1440');
	await c.evaluate(`[...document.querySelectorAll('[role="menuitemcheckbox"]')].find(e=>/Large/.test(e.getAttribute('aria-label')||e.textContent)).click();true`);
	await delay(700);
	after = item((await meta()).grid, 'widget:weather');
	check('tier-menu-writes-once-at-tier-cells', (await writes()) === 1 && after.w === 6 && after.h === 4, { after, writes: await writes() });
	// 5. Remove with undo.
	await hookWrites(DEFAULT);
	await c.evaluate(`document.querySelector('[data-tile="widget:usage"] [aria-label^="More actions"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));true`);
	await until(`!!document.querySelector('[role="menuitem"]')`, 'menu');
	await c.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(e=>/^Remove/.test(e.textContent.trim())).click();true`);
	await delay(700);
	m = await meta();
	check('remove-drops-member-and-tile', !m.widgets.some((w) => w.kind === 'usage') && !item(m.grid, 'widget:usage'), m.widgets.map((w) => w.kind));
	await until(`[...document.querySelectorAll('[data-sonner-toast] button')].some(b=>b.textContent.trim()==='Undo')`, 'undo toast');
	await shot('04-undo-toast-1440');
	await c.evaluate(`[...document.querySelectorAll('[data-sonner-toast] button')].find(b=>b.textContent.trim()==='Undo').click();true`);
	await delay(900);
	m = await meta();
	check('undo-restores-member-and-tile', m.widgets.some((w) => w.kind === 'usage') && !!item(m.grid, 'widget:usage'), m.widgets.map((w) => w.kind));
	// 6. Restart keeps the layout byte for byte and in place.
	const saved = await read(DEFAULT);
	const positions = (await tiles()).map((t) => [t.id, Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h)]);
	await runtime.restart();
	c = runtime.connection;
	await c.evaluate('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
	await size(1440);
	await open(DEFAULT);
	await until(`document.querySelectorAll('[data-tile]').length===9`, 'tiles after restart');
	const reopened = (await tiles()).map((t) => [t.id, Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h)]);
	check('restart-keeps-bytes-and-positions', (await read(DEFAULT)) === saved && JSON.stringify(reopened) === JSON.stringify(positions), { reopened, positions });
	// 7. Six columns (900px): derived from the twelve until arranged there, then stored on its own.
	await size(900);
	await delay(600);
	check('900px-uses-six-columns', (await c.evaluate(`document.querySelector('.huhu-widget-board').dataset.breakpoint`)) === 'md' && !(await meta()).grid.md, await c.evaluate(`document.querySelector('.huhu-widget-board').dataset.breakpoint`));
	a = await alignment();
	check('900px-tiles-inside-and-no-overlap', a.outside.length === 0 && !a.pageOverflow, a);
	await shot('05-default-900-light');
	await hookWrites(DEFAULT);
	const lgBefore = (await meta()).grid.lg;
	from = await handlePoint('widget:clock');
	to = await handlePoint('widget:pomodoro');
	await drag(from, { x: to.x + 30, y: to.y + 10 });
	m = await meta();
	check('900px-drag-stores-the-six-column-layout-only', (await writes()) === 1 && Array.isArray(m.grid.md) && JSON.stringify(m.grid.lg) === JSON.stringify(lgBefore), { writes: await writes(), md: m.grid.md?.length });
	// 8. One column (560px): stacked, never written.
	await size(560);
	await delay(600);
	await hookWrites(DEFAULT);
	const stackedBytes = await read(DEFAULT);
	check('560px-is-one-column', (await c.evaluate(`document.querySelector('.huhu-widget-board').dataset.breakpoint`)) === 'sm', null);
	const narrow = await tiles();
	check('560px-tiles-fill-the-width', narrow.every((t) => near(t.w, narrow[0].w)) && narrow.every((t) => near(t.x, narrow[0].x)), narrow.map((t) => [t.id, t.x, t.w]));
	a = await alignment();
	check('560px-inside-page', a.outside.length === 0 && !a.pageOverflow, a);
	await shot('06-default-560-light');
	from = await handlePoint('widget:clock');
	to = await handlePoint('widget:weather');
	await drag(from, { x: to.x, y: to.y + 40 });
	check('560px-reorder-never-writes', (await writes()) === 0 && (await read(DEFAULT)) === stackedBytes, await writes());
	// 8b. Thirty tiles drag smoothly: every pointer move is handled well inside a frame budget and nothing is written until the drop.
	await size(1440);
	await open(MANY);
	await until(`document.querySelectorAll('[data-tile]').length===30`, 'thirty tiles');
	await delay(500);
	await hookWrites(MANY);
	const first = await handlePoint('card:many-1');
	const last = await c.evaluate(`(()=>{const t=document.querySelector('[data-tile="card:many-30"]');const r=t.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+14}})()`);
	await mouse('mousePressed', first);
	await mouse('mouseMoved', { x: first.x + 8, y: first.y + 8 });
	const latencies = [];
	for (let i = 1; i <= 40; i++) {
		const began = Date.now();
		await mouse('mouseMoved', { x: first.x + ((last.x - first.x) * i) / 40, y: first.y + ((last.y - first.y) * i) / 40 });
		latencies.push(Date.now() - began);
	}
	const duringDrag = await writes();
	await mouse('mouseReleased', last);
	await delay(700);
	const mean = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
	check('thirty-tiles-drag-writes-only-on-drop', duringDrag === 0 && (await writes()) === 1, { duringDrag, afterDrop: await writes() });
	check('thirty-tiles-drag-stays-within-a-frame-budget', mean < 50 && Math.max(...latencies) < 250, { mean: Math.round(mean), max: Math.max(...latencies) });
	await shot('08-thirty-tiles-1440');
	// 9. An old board converts once and keeps all its content.
	await size(1440);
	await open(LEGACY);
	await until(`document.querySelectorAll('[data-tile]').length>=4`, 'legacy tiles');
	await delay(900);
	const old = await meta(LEGACY);
	check('legacy-converted-to-grid', old.grid?.v === 2 && old.grid.lg.length === 4 && !old.text.includes('banner:') && !old.text.includes('immersive:') && !old.text.includes('layout:') && !old.text.includes('canvas:'), old.text.slice(0, 600));
	check('legacy-widgets-lost-only-the-banner', JSON.stringify(old.widgets.map((w) => w.kind)) === JSON.stringify(['calendar', 'pomodoro']), old.widgets);
	check('legacy-content-and-unknown-keys-kept', old.text.includes('Visible grouped body.') && old.text.includes('Keep this task') && old.text.includes('custom: keep') && old.front.columns.length === 2, old.text);
	check('legacy-geometry-converted', item(old.grid, 'widget:calendar').x === 0 && item(old.grid, 'widget:calendar').w === 4 && item(old.grid, 'widget:calendar').h === 5 && item(old.grid, 'widget:pomodoro').x === 4 && item(old.grid, 'section:Notes').w === 8 && item(old.grid, 'section:Todo').w === 4, old.grid);
	// A memo section lists memo files now, so the old inline card body stays in the board file but is not drawn.
	check('legacy-todo-card-is-visible', await c.evaluate(`document.body.innerText.includes('Keep this task')`), null);
	a = await alignment({ rows: false });
	check('legacy-tiles-sit-on-the-row-grid', a.misaligned.length === 0 && a.outside.length === 0, a);
	await shot('07-legacy-converted-1440');
	const legacySaved = await read(LEGACY);
	await runtime.restart();
	c = runtime.connection;
	await c.evaluate('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
	await size(1440);
	await open(LEGACY);
	check('legacy-converts-only-once', (await read(LEGACY)) === legacySaved, null);
	// 10. A popout window drags too (react-draggable listens on the window that owns the tile).
	await open(DEFAULT);
	await until(`document.querySelectorAll('[data-tile]').length===9`, 'tiles for popout');
	const popped = await c.evaluate(`(async()=>{const leaf=app.workspace.getLeavesOfType('huhu-workbench-view').find(l=>l.view?.containerEl?.querySelector('[data-tile]'));if(!leaf)return false;window.popLeaf=leaf;const win=app.workspace.moveLeafToPopout(leaf);await new Promise(r=>setTimeout(r,2500));return !!win&&!!leaf.view.containerEl.ownerDocument.defaultView&&leaf.view.containerEl.ownerDocument!==document})()`);
	check('popout-opened', popped === true, popped);
	if (popped) {
		await hookWrites(DEFAULT);
		await c.evaluate(`(()=>{const leaf=app.workspace.getLeavesOfType('huhu-workbench-view').find(l=>l.view?.containerEl?.ownerDocument!==document);window.popLeaf=leaf;window.popDoc=leaf.view.containerEl.ownerDocument;window.popWin=window.popDoc.defaultView;return true})()`);
		await until(`!!popDoc.querySelector('[data-tile]')`, 'popout tiles').catch(async (error) => {
			console.error(await c.evaluate(`JSON.stringify({text:popDoc.body.innerText.slice(0,300),roots:popDoc.querySelectorAll('.huhu-dashboard-root').length,gw:popDoc.querySelector('.huhu-widget-grid')?.clientWidth,win:[popWin.innerWidth,popWin.innerHeight],vis:popDoc.visibilityState,same:popDoc===document,leaves:app.workspace.getLeavesOfType('huhu-workbench-view').length,tiles:popDoc.querySelectorAll('[data-tile]').length,board:popDoc.querySelectorAll('.huhu-widget-board').length,grid:popDoc.querySelector('.huhu-widget-grid')?.outerHTML.slice(0,300)})`));
			throw error;
		});
		const ptiles = await c.evaluate(`Array.from(popDoc.querySelectorAll('[data-tile]'),e=>e.getBoundingClientRect().width)`);
		check('popout-renders-the-grid-with-a-measured-width', ptiles.length === 9 && ptiles.every((w) => w > 50), ptiles);
		const result = await c.evaluate(`(async()=>{const doc=popDoc,win=popWin;const fire=(el,type,x,y)=>el.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='mouseup'?0:1,view:win}));const tile=doc.querySelector('[data-tile="widget:clock"]');const handle=tile.querySelector('.huhu-widget-handle');const r=handle.getBoundingClientRect();const target=doc.querySelector('[data-tile="widget:weather"]').getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;fire(handle,'mousedown',x,y);for(let i=1;i<=8;i++){fire(doc,'mousemove',x+((target.x+40-x)*i)/8,y+((target.y-y)*i)/8);await new Promise(r=>setTimeout(r,30))}await new Promise(r=>setTimeout(r,200));fire(doc,'mouseup',target.x+40,target.y);await new Promise(r=>setTimeout(r,800));return true})()`);
		check('popout-drag-writes-once', result === true && (await writes()) === 1, await writes());
	}
	const errors = await c.evaluate('window.huhuAcceptanceErrors');
	check('no-runtime-errors', errors.length === 0, errors);
	await fs.writeFile(path.join(runtime.evidence, 'review.json'), JSON.stringify({ rows }, null, 2));
	const failed = rows.filter((r) => !r.passed);
	console.log(JSON.stringify({ evidence: runtime.evidence, checks: rows.length, failed }, null, 2));
	assert.equal(failed.length, 0);
} catch (error) {
	await fs.writeFile(path.join(runtime.evidence, 'partial-review.json'), JSON.stringify(rows, null, 2));
	await shot('failure').catch(() => undefined);
	throw error;
} finally {
	await runtime.stop();
}
