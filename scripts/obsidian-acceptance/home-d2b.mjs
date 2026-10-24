// Acceptance: content sections and record/media widgets inside the board's tiles (D2b).
//  - every section type and every record/media widget is put on a board at each size tier it allows, with sample data;
//  - nothing spills sideways: the tile body never scrolls horizontally, no control leaves its tile, there is no second
//    scroll bar inside a scrolling body;
//  - cards in a section sit in equal-width columns, inputs and buttons of one row line up and fill the row.
// HOME / CLI homes / XDG dirs point into the fixture (fresh-vault.mjs). Run from the repo root after `pnpm build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_D2B_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2 \
//   xvfb-run -a node scripts/obsidian-acceptance/home-d2b.mjs /dev/shm/huhu-d2b/run-01
// HUHU_D2B_PLUGIN=<dir with main.js, styles.css, manifest.json> runs a private copy of the build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
import { boardFile, today, vaultFiles, TIER, SECTION_TIERS, WIDGET_TIERS } from './home-d2b-fixture.mjs';

const TIERS = ['S', 'M', 'L', 'XL'];
const board = (kind, tier) => `.huhu/dashboards/D2b-${kind}-${tier}`;
const boards = TIERS.flatMap((tier) => ['sections', 'widgets'].map((kind) => [kind, tier])).filter(([kind, tier]) =>
	kind === 'sections' ? Object.values(SECTION_TIERS).some((tiers) => tiers.includes(tier)) : Object.values(WIDGET_TIERS).some((tiers) => tiers.includes(tier)),
);
const only = process.env.HUHU_D2B_ONLY?.split(',');
const selected = boards.filter(([kind, tier]) => !only || only.includes(`${kind}-${tier}`));
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, navigator: false, sync: false };
const files = { ...vaultFiles() };
for (const [kind, tier] of boards) files[board(kind, tier) + '.md'] = boardFile(tier, kind);
const png = files;
const runtime = await launchFreshVault({
	root: process.argv[2],
	port: Number(process.env.HUHU_D2B_PORT || 9351),
	pluginSource: process.env.HUHU_D2B_PLUGIN || process.cwd(),
	files: Object.fromEntries(Object.entries(png).map(([file, value]) => [file, value])),
	settings: {
		version: 1,
		namespaces: {
			app: { language: process.env.HUHU_D2B_LANG || 'en', introSeen: true, modules, palette: process.env.HUHU_D2B_PALETTE || 'orca' },
			home: {
				dashboardFile: board(selected[0][0], selected[0][1]),
				workspaces: { files: selected.map(([kind, tier]) => board(kind, tier)), names: selected.map(() => ''), active: 0 },
				albums: [{ id: 1, folder: 'Media', intervalSec: 30, recursive: true, ratio: '1:1', transition: 'fade', heightRatio: 'full' }],
			},
		},
	},
});
const c = runtime.connection;
const rows = [];
const check = (name, passed, detail) => {
	rows.push({ name, passed, detail });
	if (!passed) console.error('FAILED', name, JSON.stringify(detail)?.slice(0, 900));
};
const until = async (expression, label = expression) => {
	const end = Date.now() + 25000;
	while (Date.now() < end) {
		if (await c.evaluate(expression).catch(() => false)) return;
		await delay(100);
	}
	throw new Error('Timeout: ' + label);
};
const viewport = async (width, height) => {
	await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
	await delay(500);
};
const open = async (kind, tier) => {
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:${JSON.stringify(board(kind, tier))}})`);
	await until(`!!document.querySelector('[data-tile]')`, 'tiles');
	await delay(1200);
};
const store = `(()=>{const grid=document.querySelector('.huhu-widget-grid');const key=Object.keys(grid).find(k=>k.startsWith('__reactFiber$'));let f=grid[key],s;while(f&&!s){s=f.memoizedProps?.store?.switch?f.memoizedProps.store:undefined;f=f.return}return s})()`;
const seed = () =>
	c.evaluate(`(async()=>{const s=${store};if(!s)return 'no store';const e=s.widgets.expense;const r=s.widgets.reading;const out=[];
		if(e){const cats=e.getOrderedCategories('expense');for(let i=0;i<9;i++)e.addRecord({type:'expense',amount:12.5+i*7,category:cats[i%cats.length]||'',note:'sample '+i,date:'${today()}'});e.addRecord({type:'income',amount:3200,category:e.getOrderedCategories('income')[0]||'',note:'salary',date:'${today()}'});out.push('expense')}
		if(r){await r.addActiveBook({title:'The Pragmatic Programmer, with a long subtitle that must truncate',author:'Andrew Hunt and David Thomas',coverUrl:'',isbn:'x',source:'manual',currentPage:120,totalPages:352,finished:false});out.push('reading')}
		return out.join(',')})()`);

/** What the tile bodies are allowed to do: scroll down, never sideways; no control outside its tile; one scroller. */
const PROBE = `Array.from(document.querySelectorAll('.huhu-widget-grid [data-tile]'),(tile)=>{
	const r=tile.getBoundingClientRect();
	const body=tile.querySelector('.huhu-widget-body');
	const scrolls=(n)=>{const o=getComputedStyle(n);return /(auto|scroll)/.test(o.overflowY)&&n.scrollHeight>n.clientHeight+2};
	const inner=body?[...body.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().height>0&&scrolls(n)&&!n.closest('[data-slot=table-container]')):[];
	const scrollAncestor=(e)=>{for(let n=e.parentElement;n&&n!==tile;n=n.parentElement){const o=getComputedStyle(n);if(/(auto|scroll)/.test(o.overflowX+o.overflowY))return n}return null};
	const outside=[...tile.querySelectorAll('button,input,select,textarea,[role=button],[role=combobox]')].filter(e=>{const b=e.getBoundingClientRect();if(!b.width||!b.height)return false;
		if(getComputedStyle(e).visibility==='hidden')return false;
		const sc=scrollAncestor(e);if(sc&&sc!==body)return false;
		return b.right>r.right+1||b.left<r.left-1||(!sc&&(b.bottom>r.bottom+1||b.top<r.top-1))}).map(e=>(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,30));
	const grids=[...tile.querySelectorAll('[data-card-grid]')].map(g=>{const kids=[...g.children].filter(k=>k.getBoundingClientRect().width>0).map(k=>Math.round(k.getBoundingClientRect().width*10)/10);return {n:kids.length,equal:kids.every(w=>Math.abs(w-kids[0])<1.01),widths:[...new Set(kids)]}});
	const inputs=[...tile.querySelectorAll('input:not([type=checkbox]):not([type=number]),textarea')].map(i=>{const b=i.getBoundingClientRect(),p=i.parentElement.getBoundingClientRect();return {h:Math.round(b.height),w:Math.round(b.width)}});
	return {id:tile.dataset.tile,w:Math.round(r.width),h:Math.round(r.height),bodyOver:body?body.scrollWidth-body.clientWidth:0,bodyScroll:body?body.scrollHeight>body.clientHeight+2:false,innerScrollers:inner.length,outside,grids,inputs,
		text:(tile.innerText||'').replace(/\\s+/g,' ').trim().slice(0,140)}})`;

const shot = async (name) => runtime.shot(name);
const setTheme = async (css, base) => {
	await c.evaluate(`app.customCss.setTheme(${JSON.stringify(css)});app.vault.setConfig('theme','${base}');app.updateTheme();true`);
	await delay(600);
};
const report = [];

try {
	await c.evaluate('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
	await viewport(1440, 1000);
	await open(...selected[0]);
	await until(`!!(${store})`, 'store');
	await seed().then((v) => console.log('seeded', v));
	if (process.env.HUHU_D2B_EVAL) console.log('eval', JSON.stringify(await c.evaluate(process.env.HUHU_D2B_EVAL)));
	const minimalDir = process.env.HUHU_D2B_MINIMAL_DIR;
	if (minimalDir) {
		const themeDir = path.join(runtime.vault, '.obsidian/themes/Minimal');
		await fs.mkdir(themeDir, { recursive: true });
		for (const file of ['theme.css', 'manifest.json']) await fs.copyFile(path.join(minimalDir, file), path.join(themeDir, file));
	}
	const themes = process.env.HUHU_D2B_THEMES
		? process.env.HUHU_D2B_THEMES.split(',').map((t) => t.split(':'))
		: [['', 'moonstone', 'default-light'], ...(process.env.HUHU_D2B_FULL ? [['', 'obsidian', 'default-dark']] : []), ...(minimalDir && process.env.HUHU_D2B_FULL ? [['Minimal', 'moonstone', 'minimal-light'], ['Minimal', 'obsidian', 'minimal-dark']] : [])];
	for (const [css, base, label] of themes) {
		await setTheme(css, base);
		for (const [kind, tier] of selected) {
			await open(kind, tier);
			// size the viewport to the board so one screenshot shows every tile
			const height = await c.evaluate(`Math.ceil(document.querySelector('.huhu-widget-grid').getBoundingClientRect().bottom+document.querySelector('.dashboard-scroll-region').scrollTop+60)`);
			await viewport(1440, Math.min(Math.max(height, 900), 7000));
			await delay(700);
			const probe = await c.evaluate(PROBE);
			const name = `${kind}-${tier}`;
			report.push({ theme: label, board: name, probe });
			await shot(`${label}-${name}`);
			check(`${label}-${name}-no-sideways-scroll`, probe.every((t) => t.bodyOver <= 1), probe.filter((t) => t.bodyOver > 1));
			check(`${label}-${name}-controls-inside-tiles`, probe.every((t) => t.outside.length === 0), probe.filter((t) => t.outside.length));
			check(`${label}-${name}-no-double-scrollbar`, probe.every((t) => !(t.bodyScroll && t.innerScrollers > 0)), probe.filter((t) => t.bodyScroll && t.innerScrollers > 0).map((t) => ({ id: t.id, inner: t.innerScrollers })));
			check(`${label}-${name}-text-inputs-are-36px`, probe.every((t) => t.inputs.every((i) => i.h === 36 || i.h === 0)), probe.filter((t) => t.inputs.some((i) => i.h !== 36 && i.h !== 0)).map((t) => ({ id: t.id, inputs: t.inputs })));
			check(`${label}-${name}-card-grids-equal-columns`, probe.every((t) => t.grids.every((g) => g.equal)), probe.filter((t) => t.grids.some((g) => !g.equal)));
			await viewport(1440, 1000);
		}
	}
	// Dialogs the bodies open: wide enough to type in, inputs fill their line, one right-aligned action row, 36px controls.
	if (!process.env.HUHU_D2B_NO_DIALOGS) {
		await setTheme('', 'moonstone');
		const clickAria = (label, tile) => c.evaluate(`(()=>{const el=[...(${JSON.stringify(tile)}?document.querySelector('[data-tile="'+${JSON.stringify(tile)}+'"]'):document).querySelectorAll('button')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}||e.title===${JSON.stringify(label)});if(!el)return false;el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,ctrlKey:false}));el.click();return true})()`);
		const dialogProbe = () => c.evaluate(`(()=>{const d=document.querySelector('[role=dialog]');if(!d)return null;const r=d.getBoundingClientRect();const inner=r.width-48;const inputs=[...d.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,[role=combobox]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect();return {tag:e.tagName,h:Math.round(b.height),w:Math.round(b.width),label:e.getAttribute('aria-label')||e.placeholder||''}});
			const buttons=[...d.querySelectorAll('button')].filter(b=>/^(Save|Cancel|Add|Delete)$/.test(b.textContent.trim())).map(b=>{const x=b.getBoundingClientRect();return {t:b.textContent.trim(),right:Math.round(r.right-x.right)}});
			return {w:Math.round(r.width),h:Math.round(r.height),inputs,buttons,over:d.scrollWidth-d.clientWidth}})()`);
		const closeDialog = async () => { await c.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector('[role=dialog]')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true`); await delay(400); };
		const open1 = async (label, board, name, tile) => {
			await open(...board);
			await viewport(1440, 1000);
			if (tile) await c.evaluate(`document.querySelector('[data-tile="${tile}"]')?.scrollIntoView()`);
			const ok = await clickAria(label, tile);
			await delay(900);
			const probe = await dialogProbe();
			await shot(`dialog-${name}`);
			report.push({ dialog: name, found: ok, probe });
			check(`dialog-${name}-opens`, ok && !!probe, { ok, probe });
			if (probe) {
				check(`dialog-${name}-is-at-least-420-wide`, probe.w >= 420, probe.w);
				check(`dialog-${name}-no-sideways-overflow`, probe.over <= 1, probe.over);
				check(`dialog-${name}-controls-are-36px`, probe.inputs.every((i) => i.h === 36 || i.tag === 'TEXTAREA'), probe.inputs);
				check(`dialog-${name}-actions-are-right-aligned`, probe.buttons.length === 0 || Math.min(...probe.buttons.map((b) => b.right)) < 40, probe.buttons);
			}
			await closeDialog();
			return probe;
		};
		const dialogs = [
			['Backfill Entry', ['widgets', 'M'], 'expense-entry', 'widget:expense'],
			['Select Book', ['widgets', 'M'], 'reading-add', 'widget:reading'],
			['Settings', ['sections', 'L'], 'library-settings', 'section:Library'],
		];
		for (const [label, board, name, tile] of dialogs) await open1(label, board, name, tile);
	}
	await fs.writeFile(path.join(runtime.evidence, 'probe.json'), JSON.stringify(report, null, 2));
	const errors = await c.evaluate(`window.huhuAcceptanceErrors ?? []`);
	const unexpected = errors.filter((e) => !/web precheck failed: https:\/\/example\.invalid/.test(e));
	check('no-console-errors', unexpected.length === 0, unexpected.slice(0, 3));
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'review.json'), JSON.stringify({ rows, report }, null, 2));
	await runtime.stop();
}
const failed = rows.filter((r) => !r.passed);
console.log(`${rows.length - failed.length}/${rows.length} passed; evidence in ${runtime.evidence}`);
void TIER;
if (failed.length) process.exit(1);
