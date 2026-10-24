// Workbench probe in real Obsidian: the shell (rail, panel, page), every rail page, the settings categories, module
// switches and the route restored after a restart. Runs only in a NEW disposable vault (fresh-vault.mjs).
//   HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian xvfb-run -a node scripts/obsidian-acceptance/workbench-probe.mjs <new absolute directory>
// Terminal sessions, Git sync and the board are covered by their own scripts and by component tests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root && path.isAbsolute(root), 'pass a NEW absolute directory');
const MODULES = ['home', 'agent', 'browser', 'archives', 'automations', 'notifications', 'icons', 'comments', 'navigator', 'sync'];
const runtime = await launchFreshVault({
	root, port: 9301,
	files: { 'Welcome.md': '# Workbench probe\n', 'huhu/笔记/Probe.md': '# Original content\n' },
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules: Object.fromEntries(MODULES.map((id) => [id, true])) }, home: { widgetMusicEnabled: false, widgetWeatherEnabled: false } } },
});
let c = runtime.connection;
const rows = [];
const check = (name, passed, detail) => { rows.push({ name, passed: !!passed, detail }); console.log(passed ? 'PASS' : 'FAIL', name, passed ? '' : JSON.stringify(detail)?.slice(0, 300)); assert.ok(passed, name); };
const until = async (expression, label, ms = 15000) => {
	const end = Date.now() + ms;
	while (Date.now() < end) { if (await c.evaluate(expression).catch(() => false)) return; await delay(80); }
	throw new Error('Timed out: ' + label);
};
const size = async (width) => { await c.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }); await delay(350); };
const huhu = 'app.plugins.plugins.huhu';
const shell = `(()=>{const e=[...document.querySelectorAll('.huhu-shell')].find(e=>e.getBoundingClientRect().width>0);return e})()`;
const rail = () => c.evaluate(`[...document.querySelectorAll('[data-rail-button]')].map(b=>({id:b.dataset.feature,active:b.getAttribute('aria-current')==='page',expanded:b.getAttribute('aria-expanded')}))`);
const active = async () => (await rail()).find((item) => item.active)?.id;
const page = `(${shell})?.querySelector('[data-shell-region="page"]')`;
const overflow = () => c.evaluate(`(()=>{const p=${page};return p?{over:p.scrollWidth-p.clientWidth,text:p.innerText.trim().length,alerts:[...p.querySelectorAll('[role="alert"]')].map(e=>e.innerText.slice(0,120))}:null})()`);
const clickRail = async (id) => {
	await until(`!!document.querySelector('[data-rail-button][data-feature="${id}"]')`, 'rail button ' + id);
	await c.evaluate(`document.querySelector('[data-rail-button][data-feature="${id}"]').click();true`);
};
try {
	await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();${huhu}.openWorkbench();true`);
	await size(1500);
	await until(`!!${shell}`, 'workbench shell');
	check('wide-layout-has-rail-and-page', await c.evaluate(`(${shell}).dataset.layout==='wide'&&document.querySelectorAll('[data-rail-button]').length>0&&!!${page}`));
	check('home-is-the-initial-page', (await active()) === 'dashboard', await rail());

	// Every rail entry opens its page: it becomes current, shows something, does not scroll sideways and reports no error.
	const features = (await rail()).map((item) => item.id);
	for (const id of features) {
		await clickRail(id);
		await until(`document.querySelector('[data-rail-button][data-feature="${id}"]')?.getAttribute('aria-current')==='page'`, 'rail ' + id);
		await delay(500);
		const state = await overflow();
		check('rail-page-' + id, state && state.text > 0 && state.over <= 1 && state.alerts.length === 0, state);
		await runtime.shot('rail-' + id);
	}

	check('configuration-and-content-have-no-primary-rail', !(await rail()).some(item => item.id === 'icons' || item.id === 'content'), await rail());
	await c.evaluate(`${huhu}.openWorkbench({feature:'icons',section:'iconic-editor'})`);
	await until(`!![...document.querySelectorAll('[role=tab]')].find(e=>e.textContent.trim()==='Editor'&&e.getAttribute('aria-selected')==='true')`, 'old icon link opens settings tab');
	check('old-icon-route-opens-settings', (await active()) === 'settings', await rail());
	await c.evaluate(`${huhu}.openWorkbench({feature:'settings',section:'general'})`);
	await until(`!![...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Browse content')`, 'secondary content entry');
	await c.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Browse content').click();true`);
	await until(`!!(${shell}).querySelector('[role=treeitem]')`, 'secondary HUHU content browser');
	check('content-entry-retains-search-and-new-note', await c.evaluate(`!!(${shell}).querySelector('input')&&[...(${shell}).querySelectorAll('button')].some(e=>e.textContent.trim()==='New note')`));
	await c.evaluate(`${huhu}.openWorkbench({feature:'content',resourceId:'huhu/笔记/Probe.md'})`);
	await until(`app.workspace.getMostRecentLeaf()?.view?.file?.path==='huhu/笔记/Probe.md'`, 'old content file link opens original note');
	check('content-original-path-retained', (await c.evaluate(`app.vault.getFileByPath('huhu/笔记/Probe.md')?.path`)) === 'huhu/笔记/Probe.md');
	await c.evaluate(`${huhu}.openWorkbench({feature:'dashboard'})`);

	// Clicking the current rail icon folds the side panel, clicking it again opens it (the board has no panel).
	await clickRail('contacts'); await delay(500);
	const expanded = () => c.evaluate(`document.querySelector('[data-rail-button][data-feature="contacts"]').getAttribute('aria-expanded')`);
	const hasPanel = () => c.evaluate(`!!(${shell}).querySelector('[data-shell-region="panel"]')`);
	const opened = { expanded: await expanded(), panel: await hasPanel() };
	await clickRail('contacts'); await delay(400);
	const folded = { expanded: await expanded(), panel: await hasPanel() };
	await clickRail('contacts'); await delay(400);
	const reopened = { expanded: await expanded(), panel: await hasPanel() };
	check('active-rail-icon-toggles-the-panel', opened.expanded === 'true' && opened.panel && folded.expanded === 'false' && !folded.panel && reopened.expanded === 'true' && reopened.panel, { opened, folded, reopened });

	// Layout kinds follow the workbench width and nothing overflows.
	for (const [width, layout] of [[1500, 'wide'], [900, 'medium'], [500, 'narrow']]) {
		await size(width);
		for (const id of ['dashboard', 'contacts', 'content']) {
			await c.evaluate(`${huhu}.openWorkbench({feature:'${id}'});true`); await delay(600);
			const state = await c.evaluate(`({layout:(${shell}).dataset.layout,over:${page}.scrollWidth-${page}.clientWidth,body:document.documentElement.scrollWidth-document.documentElement.clientWidth})`);
			check(`layout-${width}-${id}`, state.layout === layout && state.over <= 1 && state.body <= 1, state);
		}
		await runtime.shot('layout-' + width);
	}
	await size(1500);

	// Settings: every category of the products that are on renders and reports no error.
	const categories = ['general', 'appearance', 'dashboard', 'browser', 'editor', 'navigator', 'terminal', 'iconic', 'contacts', 'automation', 'sync', 'about'];
	for (const section of categories) {
		await c.evaluate(`${huhu}.openWorkbench({feature:'settings',section:'${section}'});true`);
		await delay(700);
		await until(`!document.querySelector('[data-settings-pending]')`, 'settings ' + section, 20000);
		const state = await overflow();
		check('settings-' + section, state && state.text > 0 && state.over <= 1 && state.alerts.length === 0, state);
	}
	await runtime.shot('settings');

	// Module switches add and remove rail entries, and the entry comes back with the module.
	for (const [id, feature] of [['archives', 'contacts'], ['sync', 'sync'], ['notifications', 'notifications']]) {
		await c.evaluate(`${huhu}.openWorkbench({feature:'dashboard'});${huhu}.setModuleEnabled('${id}',false)`);
		await until(`!document.querySelector('[data-rail-button][data-feature="${feature}"]')`, id + ' off');
		await c.evaluate(`${huhu}.setModuleEnabled('${id}',true)`);
		await until(`!!document.querySelector('[data-rail-button][data-feature="${feature}"]')`, id + ' on', 20000);
		check('module-switch-' + id, true);
	}

	// Restart: the workbench comes back on the page it was left on.
	await c.evaluate(`(async()=>{await ${huhu}.openWorkbench({feature:'contacts'});app.workspace.requestSaveLayout()})()`);
	await delay(1800);
	check('no-native-errors-before-restart', (await c.evaluate('huhuAcceptanceErrors.length')) === 0, await c.evaluate('huhuAcceptanceErrors'));
	await runtime.restart(); c = runtime.connection;
	await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();true`);
	// Obsidian can restore the native note tab as active and leave HUHU deferred.
	// Reveal the saved leaf without navigating, so this still verifies its persisted route.
	await c.evaluate(`(async()=>{const leaf=app.workspace.getLeavesOfType('huhu-workbench-view')[0];if(!leaf)throw Error('Saved workbench leaf is missing');await leaf.loadIfDeferred();await app.workspace.revealLeaf(leaf)})()`);
	await until(`!!${shell}`, 'shell after restart', 30000);
	await until(`document.querySelector('[data-rail-button][aria-current="page"]')?.dataset.feature==='contacts'`, 'route restored', 20000);
	check('restart-restores-the-page', true);
	await runtime.shot('restored');
	check('no-native-errors-after-restart', (await c.evaluate('huhuAcceptanceErrors.length')) === 0, await c.evaluate('huhuAcceptanceErrors'));
	await fs.writeFile(path.join(runtime.evidence, 'result.json'), JSON.stringify({ rows }, null, 2));
	console.log(JSON.stringify({ passed: true, evidence: runtime.evidence, checks: rows.length }));
} catch (error) {
	await runtime.shot('failure').catch(() => {});
	await fs.writeFile(path.join(runtime.evidence, 'partial.json'), JSON.stringify({ rows, error: String(error), nativeErrors: await c.evaluate('window.huhuAcceptanceErrors').catch(String), body: await c.evaluate('document.body.innerText.slice(0,3000)').catch(String) }, null, 2));
	throw error;
} finally {
	await runtime.stop();
}
