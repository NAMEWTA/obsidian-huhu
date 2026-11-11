import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2];
assert.ok(root && path.isAbsolute(root), 'Pass a new absolute fixture root');
const runtime = await launchFreshVault({ root, port: 9381, files: { 'Target.md': '# Linked target\n' }, settings: {
	version: 1, namespaces: { app: { language: 'en', introSeen: true, modules: Object.fromEntries(
		['home', 'task', 'safe', 'agent', 'automations', 'notifications', 'icons', 'comments', 'navigator', 'versioning', 'health'].map(id => [id, false]).concat([['archives', true]])) } },
} });
let c = runtime.connection;
const rows = [];
const check = (name, passed) => { rows.push({ name, passed: !!passed }); console.log(JSON.stringify(rows.at(-1))); assert.ok(passed, name); };
const until = async expression => {
	const end = Date.now() + 20000;
	while (Date.now() < end) { if (await c.evaluate(`!!(${expression})`).catch(() => false)) return; await delay(100); }
	throw new Error('Timed out: ' + expression);
};
const button = label => `[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)})`;
const click = async expression => {
	await until(`(${expression}) && !(${expression}).disabled`);
	await c.evaluate(`(${expression}).scrollIntoView({block:'center'});true`);
	await delay(250);
	const rect = await c.evaluate(`(()=>{const e=${expression};const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
	for (const type of ['mousePressed','mouseReleased']) await c.send('Input.dispatchMouseEvent',{type,...rect,button:'left',clickCount:1});
};
const open = async target => { await c.evaluate(`app.plugins.plugins.huhu.openWorkbench(${JSON.stringify(target)});true`); };
try {
	await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();true`);
	await open({ feature: 'contacts' });
	await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).some(s=>s.getViewType()==='huhu-archives-page')`);
	// Fixture setup uses the production command owner; subsequent checks use rendered controls.
	await c.evaluate(`(async()=>{
		const surface=app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).find(s=>s.getViewType()==='huhu-archives-page');
		const commands=surface.host.application.commands;
		await commands.publishDefinition({operationId:'fixture-definition',expectedHeads:[],definition:{kind:'type',id:'type-probe',label:'Integration records',icon:'folder',folder:'Integration',enabled:true,nameFieldId:'name',fields:[{fieldId:'name',storageKey:'name',label:'Name',kind:'text',required:true},{fieldId:'region',storageKey:'region',label:'Region',kind:'text'},{fieldId:'notes',storageKey:'notes',label:'Notes',kind:'markdown'}]}});
		const receipt=await commands.create({operationId:'probe-record',typeId:'type-probe',values:{name:'Integration record',region:'Visible region',notes:'**Rendered content** and [[Target]]'}});
		window.probeArchivePath=receipt.path;return true;
	})()`);
	await open({ feature: 'contacts', section: 'type-probe' });
	await until(`!!document.querySelector('[data-archive-list] th')`);
	check('default-table-shows-metadata', await c.evaluate(`(()=>{const t=document.querySelector('[data-archive-list]').textContent;return t.includes('Created')&&t.includes('Updated')&&t.includes('Visible region')})()`));
	await click(button('Definition studio'));
	await click(`document.querySelector('[role="combobox"][aria-label="Definition"]')`);
	await click(`[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent.includes('Integration records'))`);
	await until(`[...document.querySelectorAll('h3')].some(e=>e.textContent==='List and card fields')`);
	const field = `[...document.querySelectorAll('section')].find(s=>s.querySelector('h3')?.textContent==='List and card fields')`;
	await click(`[...(${field}).querySelectorAll('label')].find(e=>e.textContent.trim()==='Region').querySelector('[role="checkbox"]')`);
	await click(button('Preview and validate'));
	await click(button('Publish revision'));
	await until(`[...document.querySelectorAll('[role="status"]')].some(e=>/published/i.test(e.textContent))`);
	await open({ feature: 'contacts', section: 'type-probe' });
	await until(`!!document.querySelector('[data-archive-list] th')`);
	check('type-projection-hides-only-display', await c.evaluate(`!document.querySelector('[data-archive-list]').textContent.includes('Visible region') && !!app.vault.getFileByPath(probeArchivePath)`));
	await click(`[...document.querySelectorAll('[role="radio"]')].find(e=>e.textContent.trim()==='Cards')`);
	await until(`!!document.querySelector('[data-archive-list] article')`);
	check('cards-share-projection-and-times', await c.evaluate(`(()=>{const t=document.querySelector('[data-archive-list] article').textContent;return !t.includes('Visible region')&&t.includes('Created')&&t.includes('Updated')})()`));
	await runtime.shot('archive-cards');
	await click(button('Integration record'));
	await until(`!!document.querySelector('.markdown-rendered strong')`);
	check('markdown-uses-native-renderer', await c.evaluate(`document.querySelector('.markdown-rendered strong').textContent==='Rendered content' && !!document.querySelector('.markdown-rendered a.internal-link[data-href="Target"]')`));
	check('hidden-value-remains-in-detail', await c.evaluate(`document.querySelector('[data-shell-region="page"]').textContent.includes('Visible region')`));
	await runtime.shot('archive-detail');
	await click(`document.querySelector('.markdown-rendered a.internal-link[data-href="Target"]')`);
	await until(`app.workspace.getLeavesOfType('markdown').some(l=>l.view.file?.path==='Target.md')`);
	check('internal-link-opens-target', true);
	await c.evaluate(`app.workspace.getLeavesOfType('markdown').forEach(l=>l.detach());app.workspace.leftSplit?.collapse();true`);
	await open({ feature: 'contacts', section: 'type-probe' });
	await until(`!!document.querySelector('[data-archive-list]')`);
	for (const preset of ['paper','ink']) {
		await c.evaluate(`app.plugins.plugins.huhu.theme.update(d=>{d.preset=${JSON.stringify(preset)}},{persist:'immediate'})`);
		await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
		await delay(300);
		check('narrow-'+preset, await c.evaluate(`(()=>{const e=document.querySelector('[data-shell-region="page"]');return e.scrollWidth-e.clientWidth<=1})()`));
		await runtime.shot('archive-'+preset+'-390');
	}
	await runtime.restart(); c=runtime.connection;
	await open({ feature: 'contacts', section: 'type-probe' });
	await until(`!!document.querySelector('[data-archive-list] article')`);
	check('projection-and-layout-survive-restart', await c.evaluate(`!document.querySelector('[data-archive-list] article').textContent.includes('Visible region')`));
	check('no-unhandled-host-errors', await c.evaluate(`huhuAcceptanceErrors.length===0`));
} catch (error) {
	await runtime.shot('failure');
	await fs.writeFile(path.join(runtime.evidence, 'failure.json'), JSON.stringify({ message: String(error), body: await c.evaluate('document.body.innerText') }, null, 2));
	throw error;
} finally {
	await fs.writeFile(path.join(runtime.evidence, 'workbench-integration.json'), JSON.stringify({ rows, errors: await c.evaluate('window.huhuAcceptanceErrors').catch(() => []) }, null, 2));
	await runtime.stop();
}
console.log(JSON.stringify({ passed: true, evidence: runtime.evidence, checks: rows.length }));
