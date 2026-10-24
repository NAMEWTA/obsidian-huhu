// Actual host acceptance: no preseeded HUHU directory/settings, canonical IO, concurrent leaves and restart.
// HUHU_OBSIDIAN_EXECUTABLE=<absolute Obsidian executable> node .../vault-paths.mjs <NEW absolute directory>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const root = process.argv[2], rows = [];
assert.ok(root && path.isAbsolute(root), 'pass a NEW absolute directory');
let runtime, c;
const huhu = 'app.plugins.plugins.huhu', board = '.huhu/dashboards/dashboard.md';
const check = (name, passed, detail) => { rows.push({ name, passed: !!passed, detail }); assert.ok(passed, name); console.log('PASS', name); };
const until = async expression => {
 const end = Date.now() + 30000;
 while (Date.now() < end) { if (await c.evaluate(expression).catch(() => false)) return; await delay(100); }
 throw Error('Timed out: ' + expression);
};
const open = async phase => {
 await c.evaluate(`${huhu}.openWorkbench({feature:'dashboard'})`);
 await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).some(s=>s.getViewType()==='huhu-dashboard-view') || !!document.querySelector('[data-tile-id]')`);
 await until(`!!document.querySelector('[data-calendar-tile]') && ![...document.querySelectorAll('[data-calendar-tile] [role=status]')].some(e=>/Loading calendar|正在加载日历/.test(e.textContent))`);
 check('calendar-load-completed-' + phase, true);
};
try {
 runtime = await launchFreshVault({ root, port: 9481 }); c = runtime.connection;
 const initial = JSON.parse(await fs.readFile(path.join(runtime.evidence, 'initial-vault-state.json'), 'utf8'));
 check('no-huhu-data-or-settings-before-first-launch', !initial.settingsSeeded && !initial.huhuExistedBeforeLaunch, initial);
 await c.evaluate(`${huhu}.appSettings.update(s=>{s.introSeen=true});document.querySelector('.modal-close-button')?.click();true`);
 await open('first-launch');
 const settings = await c.evaluate(`JSON.parse(JSON.stringify(${huhu}.settingsNamespace('home').get().workspaces))`);
 check('default-reference-is-canonical', settings.files[settings.active] === '.huhu/dashboards/dashboard', settings);
 check('default-board-created', (await fs.readFile(path.join(runtime.vault, board), 'utf8')).length > 0);
 const aliases = await c.evaluate(`(()=>{const f=${huhu}.managedContent;return [f.getFileByPath(${JSON.stringify(board)})?.path,f.getFileByPath(${JSON.stringify(board.replaceAll('/', '\\'))})?.path]})()`);
 check('both-separators-resolve-to-one-managed-document', aliases.every(value => value === board), aliases);
 await c.evaluate(`Promise.all([${huhu}.openWorkbench({feature:'dashboard'}),${huhu}.openWorkbench({feature:'dashboard'})])`);
 const listing = await fs.readdir(path.join(runtime.vault, '.huhu/dashboards'));
 check('first-open-does-not-duplicate-board', listing.filter(name => name.endsWith('.md')).join() === 'dashboard.md', listing);
 const probe = '.huhu/dashboards/团队 (100%).md', windowsProbe = probe.replaceAll('/', '\\');
 const io = await c.evaluate(`(async()=>{const f=${huhu}.managedContent,p=${JSON.stringify(windowsProbe)};const created=await f.create(p,'# Path probe\\n');await f.process(p,text=>text+'updated');const text=await f.read(p);const canonical=created.path;await f.trash(created);return {canonical,text,removed:!f.getFileByPath(p)}})()`);
 check('native-managed-write-normalizes-windows-separators', io.canonical === probe && io.text.endsWith('updated'), io);
 check('native-managed-trash-retains-canonical-index', io.removed, io);
 await runtime.shot('fresh-home');
 // A board write through its public surface, then a new native leaf and restart.
 const surface = `app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).find(s=>s.sync&&s.plugin?.settings?.dashboardFile=== '.huhu/dashboards/dashboard')`;
 await c.evaluate(`window.pathBoard=${surface};pathBoard.sync.addColumn('Path acceptance marker', 'notes')`);
 await until(`pathBoard.sync.getSaveState().status==='saved'`);
 const saved = await fs.readFile(path.join(runtime.vault, board), 'utf8');
 check('board-save-reaches-canonical-file', saved.includes('Path acceptance marker'));
 await c.evaluate(`${huhu}.workbench.openFocus({feature:'dashboard'}, {}, 'tab')`);
 check('new-leaf-preserves-board', (await fs.readFile(path.join(runtime.vault, board), 'utf8')) === saved);
 await runtime.restart(); c = runtime.connection;
 await open('restart');
 check('restart-preserves-exact-board-bytes', (await fs.readFile(path.join(runtime.vault, board), 'utf8')) === saved);
 const refs = await c.evaluate(`${huhu}.settingsNamespace('home').get().workspaces.files`);
 check('saved-references-have-no-native-separators-or-extension', refs.every(ref => ref.startsWith('.huhu/dashboards/') && !ref.includes('\\') && !ref.endsWith('.md')), refs);
 const alerts = await c.evaluate(`[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent).filter(Boolean)`);
 check('home-has-no-error-alert', alerts.length === 0, alerts);
 const errors = await c.evaluate('window.huhuAcceptanceErrors??[]');
 check('no-host-errors', errors.length === 0, errors);
 await runtime.shot('reopened-home');
} finally {
 if (runtime) {
  const hash = createHash('sha256').update(await fs.readFile(path.join(runtime.vault, '.obsidian/plugins/huhu/main.js'))).digest('hex');
  await fs.writeFile(path.join(runtime.evidence, 'result.json'), JSON.stringify({ platform: process.platform, buildHash: hash, checks: rows }, null, 2));
  await runtime.stop();
 }
}
