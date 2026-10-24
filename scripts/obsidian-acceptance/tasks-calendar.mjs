// Real Obsidian acceptance for the unified task list, calendar dialogs and SuliWorld tabs.
// HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian xvfb-run -a node scripts/obsidian-acceptance/tasks-calendar.mjs <new-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const today = new Date().toLocaleDateString('en-CA');
const meta = id => ` <!-- huhu-task:${encodeURIComponent(JSON.stringify({ id }))} -->`;
const board = `---
columns: [{name: 待办, type: todo}, {name: 收件箱, type: memo}]
widgets: [{memberId: calendar, provider: home, kind: calendar, instanceId: default}, {memberId: quick, provider: home, kind: shortcuts, instanceId: default}]
grid: {v: 2, lg: [{i: 'widget:calendar', x: 0, y: 0, w: 8, h: 6}, {i: 'section:待办', x: 8, y: 0, w: 4, h: 6}, {i: 'widget:shortcuts', x: 0, y: 6, w: 8, h: 2}, {i: 'section:收件箱', x: 8, y: 6, w: 4, h: 2}]}
---
## 待办
## 收件箱
### 迁移前的备忘
id: preserved-memo
type: generic
这是需要完整保留的正文。
  - [ ] 备忘中的子项
`;
const runtime = await launchFreshVault({
 root: process.argv[2], port: 9353,
 files: {
  '.huhu/dashboards/Tasks.md': board,
  'huhu/待办/待办.md': `- [ ] 无日期待办${meta('undated')}\n` + Array.from({ length: 18 }, (_, i) => `- [ ] ${i === 0 ? '确认项目方案' : `当天待办 ${i + 1}`} [due:: ${today}${i === 0 ? ' 14:30' : ''}]${meta(`today-${i}`)}\n`).join(''),
  '广东词元交易和服务中心项目实施计划与任务清单.md': '# 长标题笔记\n',
  '参考笔记.md': '# 参考笔记\n- [ ] 普通手写任务不聚合\n',
 },
 settings: { version: 1, namespaces: {
  app: { language: 'zh', introSeen: true, modules: { home: true, navigator: true, automations: true, notifications: true, agent: false, browser: false, icons: false, archives: false, comments: false, sync: false } },
  theme: { preset: 'suliworld', suliworldVariant: 'cream' },
  home: { dashboardFile: '.huhu/dashboards/Tasks', workspaces: { files: ['.huhu/dashboards/Tasks'], names: ['任务'], active: 0 }, shortcutButtons: [{ id: 'reference', label: '参考笔记', icon: 'file-text', type: 'file', target: '参考笔记.md' }] },
  navigator: { calendarOpen: true },
 } },
});
const c = runtime.connection, run = expression => c.evaluate(expression), results = [];
const check = (name, value) => { results.push({ name, value }); assert.ok(value, name); };
const until = async (expression, label) => { for (let i = 0; i < 150; i++) { if (await run(expression).catch(() => false)) return; await delay(100); } throw new Error(`Timeout: ${label}`); };
const viewport = async width => { await c.send('Emulation.setDeviceMetricsOverride', { width, height: 1050, deviceScaleFactor: 1, mobile: false }); await delay(450); };
const escape = async () => { await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }); await delay(200); };
try {
 await run('app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true');
 await viewport(1500);
 await run("app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:'.huhu/dashboards/Tasks'})");
 await until(`document.querySelector('[data-tasks-widget]')?.textContent.includes('无日期待办')`, 'managed tasks');
 check('managed-only', !await run(`document.querySelector('[data-tasks-widget]').textContent.includes('普通手写任务不聚合')`));
 check('no-visible-source-paths', !await run(`document.querySelector('[data-tasks-widget]').textContent.includes('huhu/待办')`));
 check('time-left-of-text', await run(`(()=>{const row=[...document.querySelectorAll('[data-tasks-widget] [data-task-row]')].find(e=>e.textContent.includes('确认项目方案'));return row.textContent.indexOf('14:30')<row.textContent.indexOf('确认项目方案')})()`));
 check('memo-preserved', (await fs.readdir(path.join(runtime.vault, 'huhu/收件箱'))).some(name => name.startsWith('迁移-')));
 check('memo-retired', !(await fs.readFile(path.join(runtime.vault, '.huhu/dashboards/Tasks.md'), 'utf8')).includes('这是需要完整保留的正文'));
 for (const [variant, mode] of [['cream', 'light'], ['forest', 'light'], ['cream', 'dark']]) {
  await run(`app.plugins.plugins.huhu.theme.update(d=>Object.assign(d,{preset:'suliworld',suliworldVariant:${JSON.stringify(variant)}}),{persist:'immediate'});app.changeTheme(${JSON.stringify(mode === 'dark' ? 'obsidian' : 'moonstone')});true`);
  await delay(300);
  for (const width of [1500, 800, 480]) {
   await viewport(width);
   check(`${variant}-${mode}-${width}-no-page-overflow`, await run(`(()=>{const el=document.querySelector('.huhu-widget-grid');return el.scrollWidth<=el.clientWidth+2})()`));
   if (width === 1500) {
    check(`${variant}-${mode}-wide-split`, await run(`!!document.querySelector('[data-calendar-tile][data-wide] [data-calendar-panel=day]')`));
    check(`${variant}-${mode}-anchored-composer`, await run(`(()=>{const panel=document.querySelector('[data-calendar-panel=day]'),form=panel.querySelector('[data-task-composer]');return Math.abs(panel.getBoundingClientRect().bottom-form.getBoundingClientRect().bottom)<5})()`));
   }
   await runtime.shot(`tasks-${variant}-${mode}-${width}`);
  }
 }
 // A short or narrow calendar opens the selected day as a dialog.
 await run(`document.querySelector('[data-calendar-tile] [data-date="${today}"]').click()`);
 await until(`!!document.querySelector('[role=dialog] [data-calendar-agenda]')`, 'narrow calendar dialog');
 check('dialog-only-diary-entrance', !await run(`['周记','月记','季记','年记'].some(word=>document.querySelector('[role=dialog]').textContent.includes(word))`));
 check('narrow-dialog-header-actions-clear-close', await run(`(()=>{const dialog=document.querySelector('[role=dialog]'),close=dialog.querySelector('[data-slot=dialog-close]');return !!close&&[...dialog.querySelectorAll('[data-calendar-agenda]>header button')].every(button=>button.getBoundingClientRect().right<=close.getBoundingClientRect().left)})()`));
 await runtime.shot('tasks-narrow-dialog');
 await run(`document.querySelector('[role=dialog] [data-slot=dialog-close]').click()`);
 await until(`!document.querySelector('[role=dialog] [data-calendar-agenda]')`, 'narrow dialog closes');
 await viewport(1500);
 await run(`document.querySelector('[data-tasks-widget] [data-task-composer] input').focus()`);
 await c.send('Input.insertText', { text: '从看板快速创建' });
 await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
 await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
 await until(`!![...document.querySelectorAll('[data-tasks-widget] [data-task-row]')].find(el=>el.textContent.includes('从看板快速创建'))`, 'new unscheduled task');
 const saved = await fs.readFile(path.join(runtime.vault, 'huhu/待办/待办.md'), 'utf8');
 check('quick-create-without-date', !saved.split('\n').find(line => line.includes('从看板快速创建')).includes('[due::'));
 await run(`(()=>{const cell=[...document.querySelectorAll('[data-quick-action]')].find(e=>e.textContent.includes('参考笔记'));cell.scrollIntoView();cell.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2}));return true})()`);
 await until(`!!document.querySelector('[role=menu]')`, 'quick action context menu');
 check('right-click-keeps-action', await run(`!![...document.querySelectorAll('[data-quick-action]')].find(e=>e.textContent.includes('参考笔记'))`));
 await runtime.shot('quick-actions-menu'); await escape();
 // Native pin and title geometry, including the user-reported long Chinese tab title.
 await run(`(()=>{const leaf=app.workspace.getLeavesOfType('huhu-workbench-view')[0];leaf.setPinned(true);return true})()`);
 const tabs = await run(`Array.from(document.querySelectorAll('.workspace-tab-header.is-active'),el=>({height:el.getBoundingClientRect().height,title:getComputedStyle(el.querySelector('.workspace-tab-header-inner-title')).fontSize,pin:el.querySelector('.workspace-tab-header-status-icon')?getComputedStyle(el.querySelector('.workspace-tab-header-status-icon')).color:null}))`);
 check('native-tabs-compact', tabs.every(tab => tab.height <= 32)); results.push({ name: 'native-tab-details', value: tabs });
 await runtime.shot('pinned-tab');
 await run(`(async()=>{const leaf=app.workspace.getLeaf('tab');await leaf.openFile(app.vault.getFileByPath('广东词元交易和服务中心项目实施计划与任务清单.md'));app.workspace.setActiveLeaf(app.workspace.getLeavesOfType('huhu-workbench-view')[0],{focus:true});return true})()`);
 await runtime.shot('pinned-long-title');
 await run(`app.plugins.plugins.huhu.theme.update(d=>Object.assign(d,{preset:'suliworld',suliworldVariant:'forest'}),{persist:'immediate'});app.changeTheme('moonstone');true`);
 await delay(350);
 // Sidebar hover is a preview; selection opens a modal, leaving the sidebar compact.
 await run(`app.workspace.leftSplit.expand();true`);
 await until(`!!document.querySelector('[data-navigator-calendar] [data-date="${today}"]')`, 'sidebar calendar');
 await run(`document.querySelector('[data-navigator-calendar] [data-date="${today}"]').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`);
 await until(`!!document.querySelector('[data-calendar-preview]')`, 'hover preview');
 check('hover-six-items-and-count', await run(`document.querySelector('[data-calendar-preview]').textContent.includes('12')`));
 await runtime.shot('sidebar-hover');
 await run(`document.querySelector('[data-navigator-calendar] [data-date="${today}"]').click()`);
 await until(`!!document.querySelector('[role=dialog] [data-calendar-agenda]')`, 'sidebar day dialog');
 check('dialog-header-actions-clear-close', await run(`(()=>{const dialog=document.querySelector('[role=dialog]'),close=dialog.querySelector('[data-slot=dialog-close]');const buttons=[...dialog.querySelectorAll('[data-calendar-agenda]>header button')];return !!close&&buttons.every(button=>button.getBoundingClientRect().right<=close.getBoundingClientRect().left)})()`));
 check('no-inline-sidebar-agenda', !await run(`!!document.querySelector('[data-navigator-calendar] [data-calendar-agenda]')`));
 await runtime.shot('sidebar-dialog'); await escape();
 check('no-runtime-errors', (await run('window.huhuAcceptanceErrors')).length === 0);
} catch (error) {
 await runtime.shot('failure');
 await fs.writeFile(path.join(runtime.evidence, 'failure.json'), JSON.stringify(await run(`({errors:window.huhuAcceptanceErrors,active:document.activeElement?.outerHTML,dialogs:[...document.querySelectorAll('[role=dialog]')].map(e=>e.textContent)})`), null, 2));
 throw error;
} finally {
 await fs.writeFile(path.join(runtime.evidence, 'tasks-calendar.json'), JSON.stringify(results, null, 2));
 await runtime.stop();
}
console.log(JSON.stringify({ evidence: runtime.evidence, checks: results.length }));
