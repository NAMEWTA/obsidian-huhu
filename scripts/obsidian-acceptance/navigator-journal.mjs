// Acceptance: the notes navigator belongs to its module switch (no rail entry), and periodic notes live in the
// fixed journal folders shared by the navigator calendar and the dashboard calendar.
// HOME / XDG dirs point into the fixture (fresh-vault.mjs), so the real home configuration is never touched.
//   pnpm run build
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian [HUHU_THEME=minimal HUHU_MINIMAL_THEME=<dir>] [HUHU_MODE=dark] [HUHU_SHOTS=<dir>] \
//     xvfb-run -a node scripts/obsidian-acceptance/navigator-journal.mjs /tmp/<new-dir>
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
const todayPath = `huhu/日志/日记/${now.getFullYear()}/${pad(now.getMonth() + 1)}/${iso}.md`;

const files = { 'Notes/Inbox.md': '# Inbox\nA note.\n', 'Work/Plan.md': '# Plan\n' };
if (minimal) {
	const theme = process.env.HUHU_MINIMAL_THEME;
	assert.ok(theme && path.isAbsolute(theme), 'HUHU_MINIMAL_THEME must point to the Minimal theme directory (theme.css, manifest.json)');
	files['.obsidian/themes/Minimal/theme.css'] = await fs.readFile(path.join(theme, 'theme.css'), 'utf8');
	files['.obsidian/themes/Minimal/manifest.json'] = await fs.readFile(path.join(theme, 'manifest.json'), 'utf8');
	files['.obsidian/appearance.json'] = JSON.stringify({ cssTheme: 'Minimal', theme: dark ? 'obsidian' : 'moonstone' });
} else {
	files['.obsidian/appearance.json'] = JSON.stringify({ theme: dark ? 'obsidian' : 'moonstone' });
}
// The board the calendar test uses: one calendar widget at the L size (its day cells open the agenda).
files['.huhu/dashboards/dashboard.md'] = '---\ndashboard: true\nwidgets: [{"memberId":"calendar","provider":"home","kind":"calendar","instanceId":"default"}]\ngrid: {"v":2,"lg":[{"i":"widget:calendar","x":0,"y":0,"w":6,"h":4}]}\ncolumns: []\n---\n';
const modules = { home: true, agent: false, browser: false, archives: true, automations: true, notifications: true, icons: true, comments: false, navigator: true, sync: false };
const runtime = await launchFreshVault({
	root,
	files,
	port: Number(process.env.HUHU_NAV_PORT || 9291),
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules }, navigator: { calendarOpen: true } } },
});
const c = runtime.connection;
const rows = [];
const check = (name, ok, detail) => {
	rows.push({ name, ok: !!ok, detail });
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
const leaves = () => c.evaluate(`app.workspace.getLeavesOfType('huhu-navigator-view').map(l=>({left:l.getRoot()===app.workspace.leftSplit,type:l.view.getViewType()}))`);
const exists = (file) => fs.stat(path.join(runtime.vault, file)).then(() => true, () => false);
const shot = async (name) => runtime.shot(`${label}-${name}`);
const clickElement = async (expression) => {
	const point = await c.evaluate(`(async()=>{const el=${expression};if(!el)throw Error('Missing calendar action');el.scrollIntoView({block:'nearest',behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;if(!el.contains(el.ownerDocument.elementFromPoint(x,y)))throw Error('Calendar action is covered: '+el.getAttribute('aria-label'));return {x,y}})()`);
	await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
	await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
};
const createDiary = async () => {
	await clickElement(`document.querySelector('[role=dialog] button[aria-label="Daily · Day and note actions"]')`);
	await until(`[...document.querySelectorAll('[role=menuitem]')].some(e=>e.textContent.trim()==='Create note')`, 'explicit create note action');
	await clickElement(`[...document.querySelectorAll('[role=menuitem]')].find(e=>e.textContent.trim()==='Create note')`);
};
const closeDayDialog = async () => {
	if (!await c.evaluate(`!!document.querySelector('[role=dialog] [data-calendar-agenda]')`)) return;
	await clickElement(`document.querySelector('[role=dialog] [data-slot=dialog-close]')`);
	await until(`!document.querySelector('[role=dialog] [data-calendar-agenda]')`, 'day agenda closed');
};

const homeBefore = await fs.stat(path.join(process.env.HOME ?? '/root', '.codex')).then((s) => s.mtimeMs, () => null);

try {
	await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
	// 1. The module is on at load: the left sidebar has exactly one navigator leaf (placed by the module, not by a one-time flag).
	await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'navigator leaf placed at load');
	let found = await leaves();
	check('leaf-placed-on-load-in-left-sidebar', found.length === 1 && found[0].left, found);
	check('no-panelAutoPlaced-setting', await c.evaluate(`!('panelAutoPlaced' in app.plugins.plugins.huhu.settingsNamespace('navigator').get())`));

	// 2. The icon rail has no Notes entry.
	await c.evaluate(`app.workspace.leftSplit.expand();app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);
	await until(`!!document.querySelector('nav[data-shell-region="rail"] [data-rail-button]')`, 'rail rendered');
	await delay(600);
	const rail = await c.evaluate(`[...document.querySelectorAll('nav[data-shell-region="rail"] [data-rail-button]')].map(el=>({id:el.dataset.feature,label:el.getAttribute('aria-label')}))`);
	check('rail-has-no-notes-entry', rail.length > 0 && !rail.some((item) => item.id === 'navigator' || /^(Notes|笔记)$/.test(item.label ?? '')), rail);
	await shot('1-rail-and-sidebar');

	// 3. Settings: the switch says it shows the navigator in the left sidebar.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbenchSettings('general');true`);
	await until(`document.body.innerText.includes("Show the notes navigator in Obsidian")`, 'module switch description');
	await c.evaluate(`(()=>{const el=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.includes('Show the notes navigator in Obsidian')).pop();el?.scrollIntoView({block:'center'});return !!el})()`);
	await delay(400);
	check('switch-description-mentions-left-sidebar', await c.evaluate(`document.body.innerText.includes("removes it from the sidebar")`));
	await shot('2-settings-module-switch');

	// 4. Switching the module off removes the leaf; on puts it back.
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('navigator', false)`);
	await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===0`, 'leaf removed');
	check('switch-off-removes-leaf', (await leaves()).length === 0);
	await delay(300);
	await shot('3-switched-off');
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('navigator', true)`);
	await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'leaf restored');
	found = await leaves();
	check('switch-on-places-leaf-in-left-sidebar', found.length === 1 && found[0].left, found);
	// A second switch-on pass (another module toggled) does not add a second leaf.
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('notifications', false).then(()=>app.plugins.plugins.huhu.setModuleEnabled('notifications', true))`);
	await delay(500);
	check('no-duplicate-leaf', (await leaves()).length === 1);
	// A leaf the user closed stays closed while HUHU runs.
	await c.evaluate(`app.workspace.detachLeavesOfType('huhu-navigator-view');true`);
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('notifications', false).then(()=>app.plugins.plugins.huhu.setModuleEnabled('notifications', true))`);
	await delay(600);
	check('closed-leaf-not-forced-back-at-runtime', (await leaves()).length === 0);
	await c.evaluate(`app.plugins.plugins.huhu.setModuleEnabled('navigator', false).then(()=>app.plugins.plugins.huhu.setModuleEnabled('navigator', true))`);
	await until(`app.workspace.getLeavesOfType('huhu-navigator-view').length===1`, 'leaf back after the module was switched on again');

	// 5. Selecting today opens its agenda without creating a note; creation uses the explicit period menu.
	await c.evaluate(`app.workspace.leftSplit.expand();app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
	await until(`!!document.querySelector('[data-navigator-calendar] [data-date="${iso}"]')`, 'calendar shows today');
	await shot('4-navigator-calendar');
	await c.evaluate(`document.querySelector('[data-navigator-calendar] [data-date="${iso}"]').click();true`);
	await until(`!!document.querySelector('[role=dialog] [data-calendar-agenda="${iso}"]')`, 'selected day agenda');
	check('navigator-date-selection-does-not-create', !(await exists(todayPath)), todayPath);
	await createDiary();
	await until(`!!app.vault.getFileByPath(${JSON.stringify(todayPath)})`, 'explicitly created daily note');
	check('navigator-explicit-action-creates-journal-note', await exists(todayPath), todayPath);
	check('old-style-location-unused', !(await exists(`${iso}.md`)) && !(await exists(`Daily/${iso}.md`)));
	await delay(500);
	await shot('5-daily-note-opened');
	await closeDayDialog();
	const tree = async () => {
		const out = [];
		const walk = async (dir) => {
			for (const entry of await fs.readdir(path.join(runtime.vault, dir), { withFileTypes: true })) {
				const rel = dir ? `${dir}/${entry.name}` : entry.name;
				if (rel.startsWith('.obsidian') || rel.startsWith('.huhu')) continue;
				out.push(rel + (entry.isDirectory() ? '/' : ''));
				if (entry.isDirectory()) await walk(rel);
			}
		};
		await walk('');
		return out.sort();
	};
	const afterNavigator = await tree();
	console.log(JSON.stringify(afterNavigator));
	// Month/year selection only changes the browsing position. Existing weekly/monthly services remain available,
	// while the calendar itself exposes only the diary.
	check('calendar-exposes-only-diary', await c.evaluate(`!document.querySelector('[data-navigator-calendar] button[aria-label="Weekly · Day and note actions"], [data-navigator-calendar] button[aria-label="Monthly · Day and note actions"]')`));
	const weekNumbers = await c.evaluate(`document.querySelectorAll('[data-navigator-calendar] [role=rowheader]').length`);
	check('week-number-labels-present', weekNumbers > 0, weekNumbers);
	await clickElement(`document.querySelector('[data-navigator-calendar] button[aria-label="Choose month and year"]')`);
	await until(`document.querySelectorAll('[data-calendar-year-panel] button').length===12`, 'twelve month year picker');
	check('year-panel-has-twelve-months', true);
	await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
	await until(`!document.querySelector('[data-calendar-year-panel]')`, 'year picker fully closed before the next action');
	await c.evaluate(`app.plugins.plugins.huhu.services.peek({owner:'navigator',id:'periodic'}).open('month',new Date(${now.getFullYear()},${now.getMonth()},${now.getDate()}),{create:true})`);
	await until(`!!app.vault.getFileByPath(${JSON.stringify(`huhu/日志/月记/${now.getFullYear()}/${now.getFullYear()}-${pad(now.getMonth() + 1)}.md`)})`, 'monthly note created');
	check('monthly-note-in-journal-folder', true, (await tree()).filter((entry) => entry.startsWith('huhu/日志/月记')));
	await c.evaluate(`app.plugins.plugins.huhu.services.peek({owner:'navigator',id:'periodic'}).open('week',new Date(${now.getFullYear()},${now.getMonth()},${now.getDate()}),{create:true})`);
	await until(`app.vault.getAllLoadedFiles().some(f=>/^huhu\\/日志\\/周记\\/\\d{4}\\/\\d{4}-W\\d{2}\\.md$/.test(f.path))`, 'weekly note created');
	check('weekly-note-in-journal-folder', true, (await tree()).filter((entry) => entry.startsWith('huhu/日志/周记')));

	// 6. Settings: the journal folder and the fixed structure are shown; there are no folder or pattern fields.
	await c.evaluate(`app.plugins.plugins.huhu.openWorkbenchSettings('navigator');true`);
	await until(`document.body.innerText.includes('Journal folder')`, 'navigator settings open');
	await c.evaluate(`document.querySelector('[data-period-rule="day"]')?.scrollIntoView({block:'start'});true`);
	await delay(400);
	const settingsText = await c.evaluate(`document.querySelector('[data-period-rule="day"]').textContent`);
	check('settings-show-fixed-day-path', settingsText.includes('Saved as huhu/日志/日记/YYYY/MM/YYYY-MM-DD.md'), settingsText);
	check('settings-have-no-folder-or-pattern-fields', await c.evaluate(`!document.body.innerText.includes('file name pattern') && !document.body.innerText.includes('Daily note source')`));
	await shot('6-settings-journal');

	// 7. Dashboard calendar: a task for today and for tomorrow lands in the same journal files; a day template set in the
	// navigator settings starts the new note (the board inserts new tasks at the top by default).
	await fs.mkdir(path.join(runtime.vault, 'Templates'), { recursive: true });
	await fs.writeFile(path.join(runtime.vault, 'Templates/Daily.md'), '# Daily {{date}}\n\n## Tasks\n');
	await c.evaluate(`app.plugins.plugins.huhu.settingsNamespace('navigator').update(d=>{d.templateFolder='Templates';d.periods.day.template='Daily'})`);
	await c.evaluate(`app.workspace.leftSplit.collapse();app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);
	await until(`!!document.querySelector('[data-calendar-tile] [data-date="${iso}"]')`, 'dashboard calendar');
	await delay(500);
	const addTask = async (cell, text) => {
		await c.evaluate(`(${cell}).click();true`);
		await until(`!!document.querySelector('[data-calendar-agenda] [data-task-composer] input')`, 'day agenda');
		await c.evaluate(`(()=>{const input=document.querySelector('[data-calendar-agenda] [data-task-composer] input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(input,${JSON.stringify(text)});input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
		await delay(200);
		await c.evaluate(`document.querySelector('[data-calendar-agenda] [data-task-composer] button[type=submit]').click();true`);
		await until(`[...document.querySelectorAll('[data-calendar-agenda] ul')].some(el=>el.textContent.includes(${JSON.stringify(text)})) && document.querySelector('[data-calendar-agenda] [data-task-composer] input').value===''`, 'created task shown in the live agenda');
	};
	await addTask(`document.querySelector('[data-calendar-tile] [data-date="${iso}"]')`, 'Dashboard task for today');
	await until(`app.vault.getFileByPath(${JSON.stringify(todayPath)}) && true`, 'today note exists');
	for (let i = 0; i < 100; i++) {
		if ((await fs.readFile(path.join(runtime.vault, todayPath), 'utf8')).includes('Dashboard task for today')) break;
		await delay(100);
	}
	const todayText = await fs.readFile(path.join(runtime.vault, todayPath), 'utf8');
	check('dashboard-task-written-to-the-navigator-day-note', todayText.includes('- [ ] Dashboard task for today'), todayText);
	await shot('7-dashboard-day-agenda');
	await closeDayDialog();
	const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	const tomorrowIso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
	const tomorrowPath = `huhu/日志/日记/${tomorrow.getFullYear()}/${pad(tomorrow.getMonth() + 1)}/${tomorrowIso}.md`;
	if (tomorrow.getMonth() === now.getMonth()) {
		await addTask(`document.querySelector('[data-calendar-tile] [data-date="${tomorrowIso}"]')`, 'Dashboard task for tomorrow');
		for (let i = 0; i < 100; i++) {
			if (await exists(tomorrowPath)) { const text = await fs.readFile(path.join(runtime.vault, tomorrowPath), 'utf8'); if (text.includes('Dashboard task for tomorrow')) break; }
			await delay(100);
		}
		const tomorrowText = await fs.readFile(path.join(runtime.vault, tomorrowPath), 'utf8');
		check('dashboard-new-day-note-uses-navigator-template', tomorrowText.includes(`# Daily ${tomorrowIso}\n\n## Tasks\n`) && tomorrowText.includes('- [ ] Dashboard task for tomorrow'), tomorrowText);
		await closeDayDialog();
		// the navigator calendar opens exactly this file
		await c.evaluate(`app.workspace.leftSplit.expand();app.workspace.revealLeaf(app.workspace.getLeavesOfType('huhu-navigator-view')[0]);true`);
		await until(`!!document.querySelector('[data-navigator-calendar] [data-date="${tomorrowIso}"][data-has-note="true"]')`, 'navigator calendar marks the dashboard-created day');
		check('navigator-calendar-marks-the-dashboard-created-note', true);
		await shot('8-navigator-sees-dashboard-note');
	}
	const finalTree = await tree();
	check('only-journal-notes-created-outside-fixtures', finalTree.filter((entry) => entry.endsWith('.md') && !entry.startsWith('huhu/日志/') && !['Notes/Inbox.md', 'Work/Plan.md', 'Templates/Daily.md'].includes(entry)).length === 0, finalTree);

	const homeAfter = await fs.stat(path.join(process.env.HOME ?? '/root', '.codex')).then((s) => s.mtimeMs, () => null);
	check('real-home-codex-untouched', homeBefore === homeAfter);
	await fs.writeFile(path.join(runtime.evidence, `${label}-result.json`), JSON.stringify({ iso, todayPath, rail, rows, tree: await tree() }, null, 2));
	if (process.env.HUHU_SHOTS) {
		await fs.mkdir(process.env.HUHU_SHOTS, { recursive: true });
		for (const file of await fs.readdir(runtime.evidence)) if (file.endsWith('.png') || file.endsWith('.json')) await fs.copyFile(path.join(runtime.evidence, file), path.join(process.env.HUHU_SHOTS, file));
	}
	console.log(JSON.stringify({ passed: true, evidence: runtime.evidence }));
} catch (error) {
	await shot('failure').catch(() => {});
	const state = await c.evaluate(`({calendar:document.querySelector('[data-navigator-calendar]')?.outerHTML,overlays:[...document.querySelectorAll('[role=menu],[role=dialog]')].map(el=>el.outerHTML)})`).catch(() => undefined);
	await fs.writeFile(path.join(runtime.evidence, `${label}-failure.json`), JSON.stringify({ rows, error: String(error), state }, null, 2));
	throw error;
} finally {
	await runtime.stop();
}
