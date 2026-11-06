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
const MODULES = ['home', 'task', 'safe', 'agent', 'archives', 'automations', 'notifications', 'icons', 'comments', 'navigator', 'versioning'];
const runtime = await launchFreshVault({
	root, port: 9301,
	files: { '.huhu/dashboards/dashboard.md':'---\nwidgets: []\n---\n', 'Welcome.md': '# Workbench probe\n', 'huhu/笔记/Probe.md': '# Original content\n' },
	settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules: Object.fromEntries(MODULES.map((id) => [id, true])) }, home: { widgetWeatherEnabled: false } } },
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
// Match the actual mounted production surface, rather than the active rail or stale prior text.
const surfaceTypes = { dashboard:'huhu-dashboard-view', task:'huhu-task-surface', terminal:'huhu-agent-page', contacts:'huhu-archives-page', automations:'huhu-automations', notifications:'huhu-notification-surface', safe:'huhu-safe-surface', health:'huhu-health-surface', navigator:'huhu-diary-surface', versioning:'huhu-sync-page', settings:'huhu-settings' };
const ready = (id) => `(()=>{const p=${page};return !!p&&app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces?.()??[]).some(s=>s.getViewType()===${JSON.stringify(surfaceTypes[id])}&&p.contains(s.contentEl)&&s.contentEl.getBoundingClientRect().width>0&&s.contentEl.querySelector('.huhu-ui')&&s.contentEl.textContent.trim().length>0)})()`;
// Canonical capture shares the original route-ready budget. Observe finite transitions
// and their actual removal, then require consecutive stable layout frames; never disable motion.
const captureTrace = [];
const stableShot = async (name, deadline) => {
	const samples = [];
	let previous, stableFrames = 0;
	while (Date.now() < deadline) {
		const sample = await c.evaluate(`(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));const shell=${shell},page=${page};const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};const closing=[...document.querySelectorAll('.huhu-ui [data-slot="sheet-content"][data-state="closed"],.huhu-ui [data-slot="sheet-overlay"][data-state="closed"]')].map(e=>({slot:e.dataset.slot,text:e.textContent.trim().slice(0,80),rect:rect(e)}));const animations=document.getAnimations().filter(a=>{const target=a.effect?.target,timing=a.effect?.getComputedTiming();return target instanceof Element&&!!target.closest('.workspace,.huhu-ui')&&timing&&Number.isFinite(timing.endTime)&&['running','pending'].includes(a.playState)}).map(a=>({name:a.animationName??a.transitionProperty??a.id,state:a.playState,endTime:a.effect.getComputedTiming().endTime,currentTime:a.currentTime,target:a.effect.target.getAttribute('data-slot')??a.effect.target.className}));return {at:performance.now(),surface:app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces?.()??[]).filter(s=>page?.contains(s.contentEl)&&s.contentEl.getBoundingClientRect().width>0&&s.contentEl.getBoundingClientRect().height>0).map(s=>({type:s.getViewType(),rect:rect(s.contentEl)})),shell:rect(shell),page:rect(page),scrollX,documentLeft:document.scrollingElement?.scrollLeft,viewport:innerWidth,closing,animations}})()`);
		samples.push(sample);
		if (Date.now() >= deadline) break;
		const key = JSON.stringify({surface:sample.surface,shell:sample.shell,page:sample.page,scrollX:sample.scrollX,documentLeft:sample.documentLeft});
		stableFrames = sample.closing.length === 0 && sample.animations.length === 0 && key === previous ? stableFrames + 1 : 0;
		previous = sample.closing.length === 0 && sample.animations.length === 0 ? key : undefined;
		if (stableFrames >= 2) {
			captureTrace.push({ name, samples });
			await fs.writeFile(path.join(runtime.evidence, 'capture-stability.json'), JSON.stringify(captureTrace, null, 2));
			assert.ok(sample.scrollX === 0 && sample.documentLeft === 0, 'stable canonical document must not be horizontally shifted: ' + name);
			if (name.startsWith('production-') && !name.endsWith('-notes')) assert.ok(sample.page && sample.page.x >= -1 && sample.page.right <= sample.viewport + 1, 'stable canonical page must fit viewport: ' + name);
			if (Date.now() >= deadline) { captureTrace.pop(); break; }
			await runtime.shot(name);
			return;
		}
	}
	captureTrace.push({ name, timedOut: true, samples });
	await fs.writeFile(path.join(runtime.evidence, 'capture-stability.json'), JSON.stringify(captureTrace, null, 2));
	throw new Error('Timed out in original ready budget: stable capture ' + name);
};
const clickRail = async (id) => {
	await until(`!!document.querySelector('[data-rail-button][data-feature="${id}"]')`, 'rail button ' + id);
	await c.evaluate(`document.querySelector('[data-rail-button][data-feature="${id}"]').click();true`);
};
try {
	await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();${huhu}.openWorkbench();true`);
	await size(1440);
	await until(`!!${shell}`, 'workbench shell');
	check('wide-layout-has-rail-and-page', await c.evaluate(`(${shell}).dataset.layout==='wide'&&document.querySelectorAll('[data-rail-button]').length>0&&!!${page}`));
	check('home-is-the-initial-page', (await active()) === 'dashboard', await rail());
	// Real fine/hover environment and CDP touch must be observed, never inferred from a case name.
	for (const coarse of [false,true]) {
		await c.send('Emulation.setTouchEmulationEnabled',{enabled:coarse,maxTouchPoints:1});
		const pointer=await c.evaluate(`({fine:matchMedia('(pointer:fine)').matches,coarse:matchMedia('(pointer:coarse)').matches,hover:matchMedia('(hover:hover)').matches,none:matchMedia('(pointer:none)').matches})`);
		check('actual-pointer-'+(coarse?'coarse':'fine'),coarse?pointer.coarse:pointer.fine&&pointer.hover,pointer);
		const min=coarse?44:32;
		const targets=await c.evaluate(`(()=>{return [...document.querySelectorAll('[data-rail-button]')].map(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {id:e.dataset.feature,width:r.width,height:r.height,hitWidth:Math.max(r.width,parseFloat(getComputedStyle(e,'::before').width)||0),hitHeight:Math.max(r.height,parseFloat(getComputedStyle(e,'::before').height)||0),hit:e.contains(document.elementFromPoint(x,y)),edges:[[-${min}/2+1,0],[${min}/2-1,0],[0,-${min}/2+1],[0,${min}/2-1]].map(([dx,dy])=>e.contains(document.elementFromPoint(x+dx,y+dy)))}})})()`);
		check('real-hit-'+min,targets.length>0&&targets.every(e=>e.hitWidth>=min&&e.hitHeight>=min&&e.hit&&e.edges.every(Boolean)),targets);
		await c.evaluate(`document.querySelector('[data-rail-button][aria-current=page]').focus();true`);await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
		const focus=await c.evaluate(`(()=>{const e=document.activeElement,cs=getComputedStyle(e);return {tag:e.tagName,label:e.getAttribute('aria-label'),rail:e.hasAttribute('data-rail-button'),visible:e.matches(':focus-visible'),outline:cs.outlineStyle,width:cs.outlineWidth,shadow:cs.boxShadow}})()`);
		check('visible-keyboard-focus-'+min,focus.rail&&focus.visible&&(focus.outline!=='none'&&focus.width!=='0px'||focus.shadow!=='none'),focus);
	}
	await c.send('Emulation.setTouchEmulationEnabled',{enabled:false});


	const features = (await rail()).map((item) => item.id);
	assert.equal(features.length, 11, 'the eleven real rail pages plus native notes form twelve surfaces');
	for (const preset of ['paper', 'ink']) for (const width of [1440, 390]) {
		await c.evaluate(`${huhu}.theme.update(d=>{d.preset='${preset}'},{persist:'immediate'})`);
		await size(width);
		for (const id of features) {
			assert.ok(surfaceTypes[id], 'unmapped production rail ' + id);
			const captureDeadline = Date.now() + 15000;
			await c.evaluate(`${huhu}.openWorkbench({feature:'${id}'});true`);
			await until(ready(id), 'mounted production surface ' + id, Math.max(0, captureDeadline - Date.now()));
			const state = await overflow();
			check(`production-${preset}-${width}-${id}`, state && state.text > 0 && state.over <= 1 && state.alerts.length === 0, state);
			await stableShot(`production-${preset}-${width}-${id}`, captureDeadline);
		}
		const noteCaptureDeadline = Date.now() + 15000;
		await c.evaluate(`(async()=>{window.probeNote=app.workspace.getLeaf('tab');await probeNote.openFile(app.vault.getFileByPath('huhu/笔记/Probe.md'));await app.workspace.revealLeaf(probeNote)})()`);
		await until(`probeNote.view.file?.path==='huhu/笔记/Probe.md'&&!!probeNote.view.containerEl.querySelector('.markdown-source-view .cm-content')&&!!document.querySelector('[data-navigator-root]')`, 'real notes navigator and native editor', Math.max(0, noteCaptureDeadline - Date.now()));
		check(`production-${preset}-${width}-notes`, await c.evaluate(`probeNote.view.containerEl.scrollWidth<=probeNote.view.containerEl.clientWidth+1`));
		await stableShot(`production-${preset}-${width}-notes`, noteCaptureDeadline);
		await c.evaluate(`probeNote.detach();${huhu}.openWorkbench({feature:'dashboard'});true`);
	}
	await size(1440);
	check('configuration-and-content-have-no-primary-rail', !(await rail()).some(item => item.id === 'icons' || item.id === 'content'), await rail());
	await c.evaluate(`${huhu}.openWorkbench({feature:'settings',section:'iconic',resourceId:'iconic-editor'})`);
	await until(`!![...document.querySelectorAll('[role=tab]')].find(e=>e.textContent.trim()==='Editor'&&e.getAttribute('aria-selected')==='true')`, 'icon settings resource opens settings tab');
	check('icon-settings-resource-opens-settings', (await active()) === 'settings', await rail());
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
	for (const [width, layout] of [[1440, 'wide'], [900, 'medium'], [390, 'narrow']]) {
		await size(width);
		for (const id of ['dashboard', 'contacts', 'navigator']) {
			await c.evaluate(`${huhu}.openWorkbench({feature:'${id}'});true`); await until(ready(id), 'responsive production '+id);
			const state = await c.evaluate(`({layout:(${shell}).dataset.layout,over:${page}.scrollWidth-${page}.clientWidth,body:document.documentElement.scrollWidth-document.documentElement.clientWidth})`);
			check(`layout-${width}-${id}`, state.layout === layout && state.over <= 1 && state.body <= 1, state);
		}
		await runtime.shot('layout-' + width);
	}
	await size(1440);

	// Settings: every category of the products that are on renders and reports no error.
	const categories = ['general', 'appearance', 'dashboard', 'editor', 'navigator', 'terminal', 'iconic', 'contacts', 'automation', 'versioning', 'about'];
	for (const section of categories) {
		await c.evaluate(`${huhu}.openWorkbench({feature:'settings',section:'${section}'});true`);
		await delay(700);
		await until(`!document.querySelector('[data-settings-pending]')`, 'settings ' + section, 20000);
		const state = await overflow();
		check('settings-' + section, state && state.text > 0 && state.over <= 1 && state.alerts.length === 0, state);
	}
	await runtime.shot('settings');

	// Module switches add and remove rail entries, and the entry comes back with the module.
	for (const [id, feature] of [['archives', 'contacts'], ['versioning', 'versioning'], ['notifications', 'notifications']]) {
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
