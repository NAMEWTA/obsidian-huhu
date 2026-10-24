// Acceptance: the one card frame of every tile and the time/tool widgets inside it (D2a).
//  - every tile has exactly one title (the card's), a drag handle, and the same 12px padding; no view repeats its title;
//  - each time/tool widget is put on a board at every size tier it allows and must not spill sideways, leave its tile or
//    show a second scroll bar inside a scrolling body;
//  - tiles of one row share top and bottom edges;
//  - the calendar shows the selected day at S, a one-week window at M, the full month at L/XL; the day agenda dialog is
//    wide, its title field spans the dialog, and adding / ticking / deleting a task works.
// HOME / CLI homes / XDG dirs point into the fixture (fresh-vault.mjs). Run from the repo root after `pnpm build`:
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian HUHU_D2A_MINIMAL_DIR=~/refs/obsidian-minimal-9.0.2 \
//   xvfb-run -a node scripts/obsidian-acceptance/home-d2a.mjs /dev/shm/huhu-d2a/run-01
// HUHU_D2A_PLUGIN=<dir with main.js, styles.css, manifest.json> runs a private copy of the build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
import { png } from './home-d2b-fixture.mjs';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => {
	const d = new Date();
	d.setDate(d.getDate() + n);
	return d;
};
const TODAY = iso(new Date());

const TIER = { S: [3, 2], M: [6, 2], L: [6, 4], XL: [12, 4] };
/** Tiers each widget of this task allows (core/board/widget-table.ts). */
const WIDGET_TIERS = {
	clock: ['S', 'M'],
	calendar: ['S', 'M', 'L', 'XL'],
	lunar: ['S', 'M', 'L'],
	'year-progress': ['S', 'M', 'L'],
	'countdown:c1': ['S', 'M', 'L'],
	'anniversary:a1': ['S', 'M', 'L'],
	pomodoro: ['S', 'M', 'L'],
	habit: ['M', 'L', 'XL'],
	weather: ['S', 'M', 'L'],
	usage: ['S', 'M', 'L', 'XL'],
	shortcuts: ['M', 'L', 'XL'],
	'quick-actions': ['M', 'L', 'XL'],
	'nav-recent': ['S', 'M', 'L'],
	'nav-shortcuts': ['S', 'M', 'L'],
};
const member = (key) => {
	const [kind, id = 'default'] = key.split(':');
	return { memberId: `home:${kind}:${id}`, provider: 'home', kind, instanceId: id };
};
const presentation = (key) => {
	const [kind, id] = key.split(':');
	if (id) return `${kind}-${id}`;
	return { 'year-progress': 'yearProgress', 'quick-actions': 'quickActions' }[kind] ?? kind;
};
/** Shelf-pack tiles into 12 columns. */
const pack = (tiles) => {
	const items = [];
	let x = 0,
		y = 0,
		rowH = 0;
	for (const [i, w, h] of tiles) {
		if (x + w > 12) {
			x = 0;
			y += rowH;
			rowH = 0;
		}
		items.push({ i, x, y, w, h });
		x += w;
		rowH = Math.max(rowH, h);
	}
	return items;
};
const widgetBoard = (tier) => {
	const keys = Object.entries(WIDGET_TIERS).filter(([, tiers]) => tiers.includes(tier)).map(([key]) => key);
	const [w, h] = TIER[tier];
	return `---\ndashboard: true\nwidgets: ${JSON.stringify(keys.map(member))}\ngrid: ${JSON.stringify({ v: 2, lg: pack(keys.map((key) => [`widget:${presentation(key)}`, w, h])) })}\ncolumns: []\n---\n`;
};
/** A board with sections and a single card, to see their frame: titles, actions in the bar, the menu. */
const framesBoard = () => `---
dashboard: true
widgets: []
grid: ${JSON.stringify({ v: 2, lg: pack([['section:Memo', 6, 4], ['section:Todo', 6, 4], ['section:Sticky', 6, 2], ['card:solo', 6, 2]]) })}
columns:
  - name: "Memo"
    color: "#6366f1"
    type: memo
  - name: "Todo"
    color: "#6366f1"
    type: todo
  - name: "Sticky"
    color: "#6366f1"
    type: sticky
---

## Memo

### Welcome
id: memo-1
type: generic
A short memo.

### Another memo with a rather long title that has to truncate
id: memo-2
type: generic
Second body.

## Todo

### Tasks
id: todo-1
type: task
- [ ] First task
- [x] Done task

## Sticky

### Pinned
id: sticky-1
type: generic
Sticky body.

### Solo card
id: solo
type: generic
A card that is a tile of its own.
`;
/** The calendar section (full month and week grids) beside the calendar widget at L. */
const calendarBoard = () => `---
dashboard: true
widgets: ${JSON.stringify([member('calendar')])}
grid: ${JSON.stringify({ v: 2, lg: pack([['section:Calendar', 12, 4], ['widget:calendar', 6, 4]]) })}
columns:
  - name: "Calendar"
    color: "#6366f1"
    type: calendar
---

## Calendar
`;
/** Widgets with a picture behind them (the user's background settings): the picture fills the whole card. */
const backgroundsBoard = () => {
	const keys = ['music', 'pomodoro', 'year-progress', 'quick-actions'];
	const sizes = { music: [6, 2], pomodoro: [3, 2], 'year-progress': [3, 2], 'quick-actions': [6, 2] };
	return `---\ndashboard: true\nwidgets: ${JSON.stringify(keys.map(member))}\ngrid: ${JSON.stringify({ v: 2, lg: pack(keys.map((key) => [`widget:${presentation(key)}`, ...sizes[key]])) })}\ncolumns: []\n---\n`;
};
const tasksFile = () =>
	[
		'# Plan',
		`- [ ] Ship the board redesign 📅 ${TODAY}`,
		`- [ ] Review pull request ⏰ ${TODAY} 15:30`,
		`- [x] Water the plants 📅 ${TODAY}`,
		`- [ ] Dentist ⏰ ${iso(inDays(1))} 09:00`,
		`- [ ] Pay rent 📅 ${iso(inDays(3))}`,
		`- [ ] Quarterly planning with a very long title that has to truncate inside the agenda row ⏰ ${iso(inDays(5))} 10:00`,
		`- [ ] Book flights 📅 ${iso(inDays(-2))}`,
		`- [ ] Call mum 📅 ${iso(inDays(9))}`,
	].join('\n') + '\n';

const TIERS = ['S', 'M', 'L', 'XL'];
const board = (name) => `.huhu/dashboards/D2a-${name}`;
const boards = [
	...TIERS.filter((tier) => Object.values(WIDGET_TIERS).some((tiers) => tiers.includes(tier))).map((tier) => ['widgets-' + tier, widgetBoard(tier)]),
	['frames', framesBoard()],
	['backgrounds', backgroundsBoard()],
	['calendar-section', calendarBoard()],
	// no file: the board HUHU creates for a new vault (the default, symmetric one)
	['default', null],
];
const only = process.env.HUHU_D2A_ONLY?.split(',');
const selected = boards.filter(([name]) => !only || only.includes(name));
const modules = { home: true, agent: false, browser: false, archives: false, automations: false, notifications: false, icons: false, comments: false, navigator: false, sync: false };
const runtime = await launchFreshVault({
	root: process.argv[2],
	port: Number(process.env.HUHU_D2A_PORT || 9361),
	pluginSource: process.env.HUHU_D2A_PLUGIN || process.cwd(),
	files: {
		'Plan.md': tasksFile(),
		'Media/bg-dark.png': png(320, 200, 3),
		'Media/bg-light.png': png(320, 200, 11),
		...Object.fromEntries(boards.filter(([, text]) => text !== null).map(([name, text]) => [board(name) + '.md', text])),
	},
	settings: {
		version: 1,
		namespaces: {
			app: { language: process.env.HUHU_D2A_LANG || 'en', introSeen: true, modules, palette: process.env.HUHU_D2A_PALETTE || 'orca' },
			home: {
				calendarTaskTarget: { kind: 'file', path: 'Plan.md' },
				dashboardFile: board(selected[0][0]),
				workspaces: { files: selected.map(([name]) => board(name)), names: selected.map(() => ''), active: 0 },
				musicBackground: { image: 'Media/bg-dark.png', opacity: 100, dim: 45, blur: 0, foreground: 'light' },
				pomodoroBackground: { image: 'Media/bg-dark.png', opacity: 100, dim: 35, blur: 6, foreground: 'light' },
				yearProgressBackground: { image: 'Media/bg-light.png', opacity: 100, dim: 0, blur: 0, foreground: 'dark' },
				quickActionsBackground: { image: 'Media/bg-light.png', opacity: 90, dim: 20, blur: 0 },
				countdowns: [{ id: 'c1', label: 'Launch day', targetDate: `${iso(inDays(47))}T09:00`, displayMode: 'days', reminderDays: 0 }],
				anniversaries: [{ id: 'a1', label: 'First commit', startDate: '2024-03-01', precision: 'ymd', calendar: 'solar', annualReminder: true }],
				shortcutButtons: [
					{ id: 's1', label: 'Open plan', icon: 'file-text', type: 'file', target: 'Plan.md' },
					{ id: 's2', label: 'Command palette', icon: 'command', type: 'command', target: 'command-palette:open' },
					{ id: 's3', label: 'Daily note with a long label', icon: 'calendar', type: 'command', target: 'daily-notes' },
				],
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
const open = async (name) => {
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:${JSON.stringify(board(name))}})`);
	await until(`!!document.querySelector('[data-tile]')`, 'tiles');
	await delay(1200);
};
const store = `(()=>{const grid=document.querySelector('.huhu-widget-grid');const key=Object.keys(grid).find(k=>k.startsWith('__reactFiber$'));let f=grid[key],s;while(f&&!s){s=f.memoizedProps?.store?.switch?f.memoizedProps.store:undefined;f=f.return}return s})()`;
const seed = () =>
	c.evaluate(`(async()=>{const s=${store};if(!s)return 'no store';const out=[];
		const h=s.widgets.habit;if(h&&h.getHabits().length===0){for(const n of ['Read 20 pages','Stretch','Write a journal entry with a long name that truncates','Walk']){h.addHabit(n)}const hs=h.getHabits();h.toggle(hs[0].id);h.toggle(hs[1].id);
			for(let i=1;i<40;i++){const d=new Date();d.setDate(d.getDate()-i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(i%3)h.markDoneMany(hs.slice(0,1+(i%4)).map(x=>x.id),key)}out.push('habit')}
		const weather={temperature:21.4,feelsLike:20,humidity:56,windSpeed:12,weatherCode:2,dailyDates:[0,1,2,3,4].map(i=>{const d=new Date();d.setDate(d.getDate()+i);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}),dailyCodes:[2,61,3,0,95],dailyMax:[24,19,22,26,21],dailyMin:[15,13,14,16,14]};const snapshot=s.state.getState();const weatherByInstance=Object.fromEntries((snapshot.data?.widgets??[]).filter(m=>m.provider==='home'&&m.kind==='weather').map(m=>{const loc=m.weather??{latitude:snapshot.settings.widgetWeatherLat,longitude:snapshot.settings.widgetWeatherLon};return [m.instanceId,{locationKey:loc.latitude+','+loc.longitude,status:'ready',data:weather,error:''}]}));s.state.setState({weatherByInstance});out.push('weather');
		return out.join(',')})()`);

/** Everything a tile must honour: one title, nothing sideways, controls inside, one scroller, equal padding. */
const PROBE = `Array.from(document.querySelectorAll('.huhu-widget-grid [data-tile]'),(tile)=>{
	const r=tile.getBoundingClientRect();
	const body=tile.querySelector('.huhu-widget-body');
	const card=tile.querySelector('[data-slot=card]');
	const header=tile.querySelector('[data-slot=widget-header]');
	const scroller=(n)=>{const o=getComputedStyle(n);return /(auto|scroll)/.test(o.overflowY)&&n.scrollHeight>n.clientHeight+2};
	const inner=body?[...body.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().height>0&&scroller(n)):[];
	const inScroller=(e)=>{for(let n=e.parentElement;n&&n!==tile;n=n.parentElement)if(/(auto|scroll)/.test(getComputedStyle(n).overflowY))return true;return false};
	const outside=[...tile.querySelectorAll('button,input,select,textarea,[role=button],[role=combobox]')].filter(e=>{const b=e.getBoundingClientRect();if(!b.width||!b.height)return false;
		if(e.closest('[data-slot=widget-header]')&&getComputedStyle(header).position==='absolute')return false;
		const side=b.right>r.right+1||b.left<r.left-1;const vertical=(b.bottom>r.bottom+1||b.top<r.top-1);return side||(vertical&&!inScroller(e))}).map(e=>(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,30));
	const clip=(e)=>e.scrollWidth>e.clientWidth+1;
	const bodyRect=body?body.getBoundingClientRect():null;
	const emptyClipped=bodyRect?[...tile.querySelectorAll('[data-slot=empty-state] svg,[data-slot=empty-state] h3')].filter(e=>{const b=e.getBoundingClientRect();return b.height>0&&(b.top<bodyRect.top-1||b.bottom>bodyRect.bottom+1||(e.tagName.toLowerCase()==='svg'&&b.height<14))}).length:0;
	const headerRect=header?header.getBoundingClientRect():null;
	const bodyStyle=body?getComputedStyle(body):null;
	return {id:tile.dataset.tile,w:Math.round(r.width),h:Math.round(r.height),x:r.x,y:r.y,bottom:r.bottom,
		titles:tile.querySelectorAll('[data-slot=widget-title]').length,
		extraHeadings:[...tile.querySelectorAll('.huhu-widget-body h1,.huhu-widget-body h2,.huhu-widget-body h3')].filter(e=>e.getBoundingClientRect().width>0&&!e.closest('[data-slot=empty-state]')).map(e=>e.textContent.trim().slice(0,30)),
		title:tile.querySelector('[data-slot=widget-title]')?.textContent??'',
		handle:!!tile.querySelector('.huhu-widget-handle'),
		headerH:headerRect?Math.round(headerRect.height):0,
		padding:bodyStyle?[bodyStyle.paddingLeft,bodyStyle.paddingRight,bodyStyle.paddingBottom]:null,
		radius:card?getComputedStyle(card).borderRadius:'',
		emptyClipped,bodyOver:body?body.scrollWidth-body.clientWidth:0,bodyScroll:body?body.scrollHeight>body.clientHeight+2:false,innerScrollers:inner.length,outside,
		clippedText:[...tile.querySelectorAll('button,[role=button]')].filter(e=>(e.textContent||'').trim()&&getComputedStyle(e).overflow==='visible'&&clip(e)).map(e=>(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30)),
		text:(tile.innerText||'').replace(/\\s+/g,' ').trim().slice(0,200)}})`;

const near = (a, b) => Math.abs(a - b) < 0.8;
const sameRows = (probe) => {
	const byTop = new Map();
	for (const t of probe) byTop.set(Math.round(t.y), [...(byTop.get(Math.round(t.y)) ?? []), t]);
	return [...byTop.values()].every((group) => group.every((t) => near(t.bottom, group[0].bottom)));
};
const setTheme = async (css, base) => {
	await c.evaluate(`app.customCss.setTheme(${JSON.stringify(css)});app.vault.setConfig('theme','${base}');app.updateTheme();true`);
	await delay(600);
};
const report = [];
const click = (expression) => c.evaluate(`(()=>{const e=${expression};if(!e)return false;e.click();return true})()`);

try {
	await c.evaluate('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
	await viewport(1440, 1000);
	await open(selected[0][0]);
	await until(`!!(${store})`, 'store');
	await seed().then((v) => console.log('seeded', v));
	const minimalDir = process.env.HUHU_D2A_MINIMAL_DIR;
	if (minimalDir) {
		const themeDir = path.join(runtime.vault, '.obsidian/themes/Minimal');
		await fs.mkdir(themeDir, { recursive: true });
		for (const file of ['theme.css', 'manifest.json']) await fs.copyFile(path.join(minimalDir, file), path.join(themeDir, file));
	}
	const themes = process.env.HUHU_D2A_THEMES
		? process.env.HUHU_D2A_THEMES.split(',').map((t) => t.split(':'))
		: [['', 'moonstone', 'default-light'], ...(process.env.HUHU_D2A_FULL ? [['', 'obsidian', 'default-dark']] : []), ...(minimalDir && process.env.HUHU_D2A_FULL ? [['Minimal', 'moonstone', 'minimal-light'], ['Minimal', 'obsidian', 'minimal-dark']] : [])];
	for (const [css, base, label] of themes) {
		await setTheme(css, base);
		for (const [name] of selected) {
			await open(name);
			await seed();
			const height = await c.evaluate(`Math.ceil(document.querySelector('.huhu-widget-grid').getBoundingClientRect().bottom+document.querySelector('.dashboard-scroll-region').scrollTop+60)`);
			await viewport(1440, Math.min(Math.max(height, 900), 7000));
			await delay(900);
			const probe = await c.evaluate(PROBE);
			report.push({ theme: label, board: name, probe });
			await runtime.shot(`${label}-${name}`);
			const tag = `${label}-${name}`;
			check(`${tag}-one-title-per-card`, probe.every((t) => t.titles === 1), probe.filter((t) => t.titles !== 1).map((t) => ({ id: t.id, titles: t.titles })));
			check(`${tag}-no-repeated-title-in-body`, probe.every((t) => t.extraHeadings.length === 0), probe.filter((t) => t.extraHeadings.length).map((t) => ({ id: t.id, h: t.extraHeadings })));
			check(`${tag}-every-card-has-handle-and-40px-bar`, probe.every((t) => t.handle && t.headerH === 40), probe.filter((t) => !t.handle || t.headerH !== 40).map((t) => ({ id: t.id, h: t.headerH })));
			check(`${tag}-card-radius-and-padding-equal`, new Set(probe.map((t) => t.radius)).size === 1 && new Set(probe.filter((t) => t.padding).map((t) => t.padding.join())).size <= 2, probe.map((t) => [t.id, t.radius, t.padding]));
			check(`${tag}-no-sideways-scroll`, probe.every((t) => t.bodyOver <= 1), probe.filter((t) => t.bodyOver > 1).map((t) => ({ id: t.id, over: t.bodyOver })));
			check(`${tag}-controls-inside-tiles`, probe.every((t) => t.outside.length === 0), probe.filter((t) => t.outside.length));
			check(`${tag}-no-double-scrollbar`, probe.every((t) => !(t.bodyScroll && t.innerScrollers > 0)), probe.filter((t) => t.bodyScroll && t.innerScrollers > 0).map((t) => ({ id: t.id, inner: t.innerScrollers })));
			check(`${tag}-empty-states-not-clipped`, probe.every((t) => t.emptyClipped === 0), probe.filter((t) => t.emptyClipped).map((t) => t.id));
			check(`${tag}-no-clipped-button-text`, probe.every((t) => t.clippedText.length === 0), probe.filter((t) => t.clippedText.length));
			check(`${tag}-same-row-aligned`, sameRows(probe), probe.map((t) => [t.id, t.y, t.bottom]));
			if (name === 'default') {
				// the default board again at the narrower window: six columns, same cards, same rules
				await viewport(900, 1000);
				await delay(900);
				const narrowHeight = await c.evaluate(`Math.ceil(document.querySelector('.huhu-widget-grid').getBoundingClientRect().bottom+document.querySelector('.dashboard-scroll-region').scrollTop+60)`);
				await viewport(900, Math.min(Math.max(narrowHeight, 900), 7000));
				await delay(900);
				const narrow = await c.evaluate(PROBE);
				report.push({ theme: label, board: 'default-900', probe: narrow });
				await runtime.shot(`${label}-default-900`);
				check(`${tag}-900-one-title-per-card`, narrow.every((t) => t.titles === 1), narrow.filter((t) => t.titles !== 1).map((t) => ({ id: t.id, titles: t.titles })));
				check(`${tag}-900-no-sideways-scroll-or-escaping-controls`, narrow.every((t) => t.bodyOver <= 1 && t.outside.length === 0), narrow.filter((t) => t.bodyOver > 1 || t.outside.length));
				check(`${tag}-900-no-double-scrollbar`, narrow.every((t) => !(t.bodyScroll && t.innerScrollers > 0)), narrow.filter((t) => t.bodyScroll && t.innerScrollers > 0).map((t) => t.id));
			}
			await viewport(1440, 1000);
		}
	}
	await fs.writeFile(path.join(runtime.evidence, 'probe.json'), JSON.stringify(report, null, 2));
	// the dialog and menu steps below read English labels; another language only runs the board probes
	if ((process.env.HUHU_D2A_LANG || 'en') !== 'en') {
		await fs.writeFile(path.join(runtime.evidence, 'review.json'), JSON.stringify({ rows, report }, null, 2));
		await runtime.stop();
		const failedHere = rows.filter((r) => !r.passed);
		console.log(`${rows.length - failedHere.length}/${rows.length} passed (board probes only); evidence in ${runtime.evidence}`);
		process.exit(failedHere.length ? 1 : 0);
	}

	// ---- calendar arrangement per tier, the day agenda dialog ----
	await setTheme('', 'moonstone');
	await viewport(1440, 1000);
	const arrangement = {};
	for (const tier of ['S', 'M', 'L', 'XL']) {
		await open('widgets-' + tier);
		arrangement[tier] = await c.evaluate(`(()=>{const t=document.querySelector('[data-tile="widget:calendar"]');const vis=(sel)=>[...t.querySelectorAll(sel)].some(e=>e.getBoundingClientRect().width>0);
			return {today:[...t.querySelectorAll('[data-calendar-panel=today]')].filter(e=>e.getBoundingClientRect().width>0).length,month:vis('[data-calendar-panel=month]'),nav:vis('[aria-label="Previous period"]'),cells:[...t.querySelectorAll('[data-calendar-month] [data-date]')].filter(e=>e.getBoundingClientRect().width>0).length,nextTask:/Ship the board|Review pull/.test(t.innerText)}})()`);
	}
	check('calendar-S-selected-day-only', arrangement.S.today === 1 && !arrangement.S.month && arrangement.S.nextTask, arrangement.S);
	check('calendar-M-selected-day-beside-one-week', arrangement.M.today === 1 && arrangement.M.month && arrangement.M.nav && arrangement.M.cells === 7, arrangement.M);
	check('calendar-L-full-month-with-nav', arrangement.L.today === 0 && arrangement.L.month && arrangement.L.nav && arrangement.L.cells >= 28, arrangement.L);
	check('calendar-XL-full-month-with-nav', arrangement.XL.today === 0 && arrangement.XL.month && arrangement.XL.nav, arrangement.XL);

	await open('widgets-L');
	const todayCell = `document.querySelector('[data-tile="widget:calendar"] [data-day="${TODAY}"]')`;
	assert.ok(await click(todayCell), 'today cell');
	await until(`!!document.querySelector('[data-day-agenda]')`, 'agenda dialog');
	await delay(500);
	const dialog = await c.evaluate(`(()=>{const d=document.querySelector('[data-slot=dialog-content]');const r=d.getBoundingClientRect();const title=d.querySelector('input[type=text]');const tr=title.getBoundingClientRect();const time=d.querySelector('input[type=time]').getBoundingClientRect();const add=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()==='Add').getBoundingClientRect();
		const sw=d.querySelector('[role=switch]').getBoundingClientRect();
		return {width:r.width,titleWidth:tr.width,titleHeight:tr.height,timeWidth:time.width,timeHeight:time.height,addHeight:add.height,addRight:add.right,dialogRight:r.right,titleFocused:document.activeElement===title,heading:d.querySelector('[data-day-agenda] [data-agenda-title]').textContent,rows:d.querySelectorAll('[data-day-agenda] [data-agenda-list] li').length,padRight:parseFloat(getComputedStyle(d).paddingRight),swH:sw.height}})()`);
	check('agenda-dialog-at-least-440-wide', dialog.width >= 440, dialog);
	check('agenda-title-field-spans-dialog', dialog.titleWidth >= dialog.width - 2 * dialog.padRight - 2 && dialog.titleHeight === 36, dialog);
	check('agenda-controls-36px-and-add-right-aligned', dialog.timeHeight === 36 && dialog.addHeight === 36 && Math.abs(dialog.addRight - (dialog.dialogRight - dialog.padRight)) < 2, dialog);
	check('agenda-title-focused-and-heading-has-day', dialog.titleFocused && /·\s*Agenda$/.test(dialog.heading), dialog);
	await runtime.shot('agenda-dialog');
	// type, Enter adds (all day), then a timed task, then tick and delete
	const type = async (text) => {
		await c.evaluate(`(()=>{const i=document.querySelector('[data-day-agenda] input[type=text]');i.focus();const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,${JSON.stringify(text)});i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
		await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
		await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
		// the note is written first (the daily note may have to be created), then the list shows the row
		await until(`[...document.querySelectorAll('[data-day-agenda] [data-agenda-list] li')].some(l=>l.innerText.includes(${JSON.stringify(text)}))`, 'agenda row ' + text);
	};
	const before = dialog.rows;
	await type('Acceptance task one');
	check('agenda-enter-adds-all-day-task', await c.evaluate(`document.querySelectorAll('[data-day-agenda] [data-agenda-list] li').length`) === before + 1, { before });
	const note = await fs.readFile(path.join(runtime.vault, 'Plan.md'), 'utf8').catch(() => '');
	const dailyHas = await c.evaluate(`app.vault.getFiles().some(f=>f.path.endsWith('${TODAY}.md'))`);
	check('agenda-task-written-to-a-note', dailyHas || note.includes('Acceptance task one'), { dailyHas });
	await c.evaluate(`(()=>{document.querySelector('[data-day-agenda] [role=switch]').click();return true})()`);
	await delay(300);
	const timeEnabled = await c.evaluate(`!document.querySelector('[data-day-agenda] input[type=time]').disabled`);
	check('agenda-all-day-switch-enables-time', timeEnabled, {});
	await c.evaluate(`(()=>{const i=document.querySelector('[data-day-agenda] input[type=time]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'17:45');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
	await type('Acceptance task two');
	const listText = await c.evaluate(`document.querySelector('[data-day-agenda] [data-agenda-list]').innerText`);
	check('agenda-timed-task-shows-time-badge', /17:45\s*Acceptance task two/.test(listText) && /Acceptance task one/.test(listText) && !/\d:\d+\s*Acceptance task one/.test(listText), { listText });
	await runtime.shot('agenda-dialog-after-add');
	const rowsBefore = await c.evaluate(`document.querySelectorAll('[data-day-agenda] [data-agenda-list] li').length`);
	await c.evaluate(`(()=>{const li=[...document.querySelectorAll('[data-day-agenda] [data-agenda-list] li')].find(l=>l.innerText.includes('Acceptance task one'));li.querySelector('[role=checkbox]').click();return true})()`);
	await delay(800);
	check('agenda-tick-struck-through', await c.evaluate(`[...document.querySelectorAll('[data-day-agenda] [data-agenda-list] li')].find(l=>l.innerText.includes('Acceptance task one')).querySelector('.line-through')!==null`), {});
	await c.evaluate(`(()=>{const li=[...document.querySelectorAll('[data-day-agenda] [data-agenda-list] li')].find(l=>l.innerText.includes('Acceptance task one'));li.querySelector('button[aria-label=Delete]').click();return true})()`);
	await delay(900);
	check('agenda-delete-removes-row', await c.evaluate(`document.querySelectorAll('[data-day-agenda] [data-agenda-list] li').length`) === rowsBefore - 1, { rowsBefore });
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await delay(400);

	// ---- the full-screen calendar (month and week) and the calendar section ----
	await open('widgets-L');
	assert.ok(await click(`document.querySelector('[data-tile="widget:calendar"] button[aria-label="Open full calendar"]')`), 'full calendar button');
	await until(`!!document.querySelector('[data-calendar-nav]')`, 'full calendar');
	await delay(900);
	const full = await c.evaluate(`(()=>{const d=document.querySelector('[data-slot=dialog-content]');const nav=d.querySelector('[data-calendar-nav]');const r=d.getBoundingClientRect();const kids=[...nav.querySelectorAll('button,[role=radio],[role=combobox]')].map(e=>e.getBoundingClientRect());return {width:r.width,over:nav.scrollWidth-nav.clientWidth,count:kids.length,inside:kids.every(k=>k.right<=r.right+1&&k.left>=r.left-1),cells:d.querySelectorAll('.dashboard-calendar-cell').length}})()`);
	// (the pseudo-element hit area of compact buttons may stick out a few pixels, so the controls themselves are measured)
	check('fullscreen-calendar-nav-fits-and-month-grid', full.inside && full.count >= 6 && [28, 35, 42].includes(full.cells), full);
	await runtime.shot('calendar-fullscreen');
	await c.evaluate(`(()=>{document.querySelector('[data-calendar-nav] [aria-label="Week"]').click();return true})()`);
	await delay(700);
	await runtime.shot('calendar-fullscreen-week');
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await delay(400);
	await open('calendar-section');
	await delay(1200);
	await runtime.shot('calendar-section');
	const sec = await c.evaluate(`(()=>{const t=document.querySelector('[data-tile="section:Calendar"]');const nav=t.querySelector('[data-calendar-nav]');return {nav:!!nav,over:nav?nav.scrollWidth-nav.clientWidth:0,bodyOver:t.querySelector('.huhu-widget-body').scrollWidth-t.querySelector('.huhu-widget-body').clientWidth,titles:t.querySelectorAll('[data-slot=widget-title]').length}})()`);
	check('calendar-section-nav-fits', sec.nav && sec.over <= 1 && sec.bodyOver <= 1 && sec.titles === 1, sec);

	// ---- the card menu and the title bar of a section ----
	await open('frames');
	await c.evaluate(`document.querySelector('[data-tile="section:Todo"] button[aria-label^="More actions"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));true`);
	await delay(500);
	await runtime.shot('section-menu');
	const menuText = await c.evaluate(`document.querySelector('[role=menu]')?.innerText ?? ''`);
	check('section-menu-has-own-and-frame-entries', /Archive/.test(menuText) && /Rename/.test(menuText) && /Remove/.test(menuText) && /Size/.test(menuText), { menuText });
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await delay(300);
	const bar = await c.evaluate(`[...document.querySelectorAll('[data-tile] [data-slot=widget-actions]')].map(a=>({tile:a.closest('[data-tile]').dataset.tile,buttons:a.querySelectorAll('button').length}))`);
	check('section-title-bars-show-at-most-two-buttons', bar.every((b) => b.buttons <= 2), bar);
	await runtime.shot('frames-bar');

	// ---- a picture behind a widget fills the whole card: no inset plate, no ring, readable title ----
	await open('backgrounds');
	await delay(1500);
	await runtime.shot('backgrounds');
	const bgs = await c.evaluate(`Array.from(document.querySelectorAll('[data-tile]'),(tile)=>{const card=tile.querySelector('[data-slot=card]');const r=card.getBoundingClientRect();const layer=card.querySelector('.dashboard-widget-bg');const lr=layer?layer.getBoundingClientRect():null;
		const title=tile.querySelector('[data-slot=widget-title]');const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d');cx.fillStyle=getComputedStyle(title).color;cx.fillRect(0,0,1,1);const rgb=[...cx.getImageData(0,0,1,1).data];const lum=(0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2])/255;
		return {id:tile.dataset.tile,hasBg:card.classList.contains('dashboard-sidebar-widget--has-bg'),layer:!!layer,covers:!!lr&&Math.abs(lr.width-r.width)<3&&Math.abs(lr.height-r.height)<3&&Math.abs(lr.left-r.left)<3&&Math.abs(lr.top-r.top)<3,plate:!!card.querySelector('.dashboard-widget-frame'),lum:Math.round(lum*100)/100,radius:getComputedStyle(card).borderRadius,rounded:layer?getComputedStyle(layer).overflow:''}})`);
	const byId = Object.fromEntries(bgs.map((b) => [b.id, b]));
	check('backgrounds-cards-have-a-picture-across-the-whole-card', bgs.length === 4 && bgs.every((b) => b.hasBg && b.layer && b.covers), bgs);
	check('backgrounds-no-inset-glass-plate', bgs.every((b) => !b.plate), bgs);
	check('backgrounds-title-follows-the-chosen-foreground', byId['widget:music'].lum > 0.7 && byId['widget:pomodoro'].lum > 0.7 && byId['widget:yearProgress'].lum < 0.3, bgs.map((b) => [b.id, b.lum]));

	const errors = await c.evaluate(`window.huhuAcceptanceErrors ?? []`);
	check('no-console-errors', errors.length === 0, errors.slice(0, 3));
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'review.json'), JSON.stringify({ rows, report }, null, 2));
	await runtime.stop();
}
const failed = rows.filter((r) => !r.passed);
console.log(`${rows.length - failed.length}/${rows.length} passed; evidence in ${runtime.evidence}`);
if (failed.length) process.exit(1);
