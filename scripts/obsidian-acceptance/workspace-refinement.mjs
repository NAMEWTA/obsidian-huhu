// Real Obsidian regression: repository ownership, calendar actions, clock/weather migration and analytics surfaces.
// Uses a NEW disposable vault/profile. No user repositories, accounts or weather credentials are accessed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
const root = process.argv[2];
for (const key of ['CLAUDE_CONFIG_DIR','CODEX_HOME','GROK_HOME','GEMINI_CLI_HOME','PI_CODING_AGENT_DIR','PI_CODING_AGENT_SESSION_DIR','OPENCODE_CONFIG_DIR','XDG_DATA_HOME']) delete process.env[key];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = iso(new Date()), yesterday = iso(new Date(Date.now()-86400000)), tomorrow = iso(new Date(Date.now()+86400000));
const meta = id => ` <!-- huhu-task:${encodeURIComponent(JSON.stringify({id})).replace(/-/g,'%2D')} -->`;
const widgets = ['calendar','clock','weather','pomodoro','expense'].map(kind => ({memberId:kind,provider:'home',kind,instanceId:'default',...(kind==='weather'?{weather:{cityName:'南沙',latitude:22.8,longitude:113.5,timezone:'Asia/Shanghai'}}:{})}));
const board = `---\nwidgetMigration: 1\nwidgets: ${JSON.stringify(widgets)}\ngrid: ${JSON.stringify({v:2,lg:[{i:'widget:calendar',x:0,y:0,w:12,h:4},{i:'widget:clock',x:0,y:4,w:6,h:2},{i:'widget:weather',x:6,y:4,w:6,h:2},{i:'widget:pomodoro',x:0,y:6,w:6,h:2},{i:'widget:expense',x:6,y:6,w:6,h:2}]})}\ncolumns: []\n---\n`;
const weather = {temperature:25,weatherCode:2,windSpeed:18,humidity:62,feelsLike:27,dailyMax:[28,27,26,27,28,29,28],dailyMin:[22,21,21,20,21,22,22],dailyCodes:[2,3,61,2,1,0,2],dailyDates:Array.from({length:7},(_,i)=>iso(new Date(Date.now()+i*86400000))),fetchedAt:Date.now(),timezone:'Asia/Shanghai',source:'Open-Meteo',hourly:Array.from({length:24},(_,i)=>({time:`${today}T${String(i).padStart(2,'0')}:00`,temperature:25,weatherCode:2,precipitation:20}))};
const records = Array.from({length:10},(_,i)=>({id:`r${i}`,type:i%3?'expense':'income',amount:12.5+i,date:iso(new Date(Date.now()-(i%5)*86400000)),category:i%3?'food':'salary',note:`Record ${i}`,createdAt:Date.now()-i*1000}));
const runtime = await launchFreshVault({root,port:9461,settings:{version:1,namespaces:{app:{language:'en',introSeen:true,modules:{home:true,navigator:true,sync:true,agent:true,browser:false,archives:false,automations:false,notifications:false,icons:false,comments:false}},home:{dashboardFile:'.huhu/dashboards/Probe',workspaceFiles:['.huhu/dashboards/Probe'],calendarTaskFilter:'all'},navigator:{calendarOpen:true},agent:{statusHooks:false}}},files:{
 '.huhu/dashboards/Probe.md':board,
 'Tasks.md':`- [ ] Today open [due:: ${today} 09:30]${meta('today')}\n- [x] Completed today [due:: ${today}] [completion:: ${today} 10:00]${meta('done')}\n- [ ] Earlier unfinished [due:: ${yesterday}]${meta('earlier')}\n- [ ] Future task [due:: ${tomorrow}]${meta('future')}\n- [ ] Undated task${meta('undated')}\n`,
 '.huhu/cache/weather/22.8000,113.5000.json':JSON.stringify(weather),
 'huhu/记账/expense.json':JSON.stringify({version:1,records}),
 'huhu/番茄钟/pomodoro.json':JSON.stringify({version:2,currentActivity:'Writing',tags:[{name:'Writing',pinned:false}],sessions:[{date:today,completed:2,records:[{timestamp:new Date().toISOString(),activity:'Writing',duration:25,interruptions:1},{timestamp:new Date(Date.now()-3600000).toISOString(),activity:'Review',duration:15,breakMinutes:5}]}]}),
}});
const c = runtime.connection, checks=[];
const check=(name,passed,detail)=>{checks.push({name,passed:!!passed,detail});console.log(passed?'PASS':'FAIL',name);assert.ok(passed,name);};
const until=async(expression,label=expression)=>{const end=Date.now()+25000;while(Date.now()<end){if(await c.evaluate(expression).catch(()=>false))return;await delay(100);}throw Error(`Timeout: ${label}`);};
const size=async width=>{await c.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await delay(400);};
const store=`(()=>{const grid=document.querySelector('.huhu-widget-grid');const key=Object.keys(grid).find(k=>k.startsWith('__reactFiber$'));let f=grid[key];while(f){if(f.memoizedProps?.store?.switch)return f.memoizedProps.store;f=f.return}})()`;
const click=async selector=>{await until(`!!document.querySelector(${JSON.stringify(selector)})`,selector);await c.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);};
const close=async()=>{await c.evaluate(`document.querySelector('[role=dialog] [aria-label="Close"], [role=dialog] [data-slot=dialog-close]')?.click()`);await until(`!document.querySelector('[role=dialog]')`);};
try {
 await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:'.huhu/dashboards/Probe'})`);
 await size(1500);await until(`!!document.querySelector('[data-clock-weather]')`);await delay(500);
 check('weather-merged-with-clock',await c.evaluate(`(()=>{const d=${store}.state.getState().data;return d.widgets.filter(m=>m.kind==='clock').length===1&&!d.widgets.some(m=>m.kind==='weather')&&d.widgets.find(m=>m.kind==='clock').weather.cityName==='南沙'})()`));
 check('calendar-today-and-earlier-tasks',await c.evaluate(`(()=>{const el=document.querySelector('[data-calendar-agenda]');return el&&el.innerText.includes('Completed today')&&el.innerText.includes('Earlier unfinished')&&!el.innerText.includes('Future task')&&!el.innerText.includes('Undated task')&&!el.innerText.includes('Tasks.md')})()`));
 check('calendar-footer-removed',await c.evaluate(`!document.querySelector('[data-period-actions]')`));
 await click('[data-calendar-agenda] [role=checkbox][aria-label="Today open"]');await until(`document.querySelector('[data-calendar-agenda] [role=checkbox][aria-label="Today open"]')?.getAttribute('aria-checked')==='true'`);
 check('completion-written',(await fs.readFile(path.join(runtime.vault,'Tasks.md'),'utf8')).split('\n').find(line=>line.includes('Today open')).includes('[completion::'));
 await until(`document.querySelector('[data-calendar-agenda] [role=checkbox][aria-label="Today open"]')?.disabled===false`);
 await click('[data-calendar-agenda] [role=checkbox][aria-label="Today open"]');await until(`document.querySelector('[data-calendar-agenda] [role=checkbox][aria-label="Today open"]')?.getAttribute('aria-checked')==='false'`);
 check('completion-cleared-on-undo',!(await fs.readFile(path.join(runtime.vault,'Tasks.md'),'utf8')).split('\n').find(line=>line.includes('Today open')).includes('[completion::'));

 const before=await c.evaluate(`app.workspace.getLeavesOfType('markdown').length`);
 await c.evaluate(`document.querySelector('[data-calendar-agenda] button').click()`);
 await until(`app.workspace.getLeavesOfType('markdown').length>${before}`,'diary new tab');
 check('diary-created-in-new-tab',(await fs.stat(path.join(runtime.vault,`huhu/日志/日记/${today.slice(0,4)}/${today.slice(5,7)}/${today}.md`))).isFile());
 await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard',resourceId:'.huhu/dashboards/Probe'})`);await until(`!!document.querySelector('[data-clock-weather]')`);
 for(const mode of ['light','dark']){await c.evaluate(`document.body.classList.toggle('theme-dark',${mode==='dark'});document.body.classList.toggle('theme-light',${mode==='light'})`);for(const width of [1500,800,420]){await size(width);await runtime.shot(`board-${mode}-${width}`);check(`board-overflow-${mode}-${width}`,await c.evaluate(`(()=>{const e=document.querySelector('.huhu-widget-grid');return e.scrollWidth-e.clientWidth<3})()`));}}
 await size(1200);
 for(const [label,name] of [['Focus Statistics','pomodoro'],['Expense Statistics','expense']]){
  await c.evaluate(`document.querySelector('[aria-label="${label}"]').click()`);await until(`!!document.querySelector('[role=dialog] [data-analytics]')`);await delay(700);
  check(`${name}-shared-range-and-charts`,await c.evaluate(`document.querySelectorAll('[role=dialog] [data-analytics-range]').length===1&&document.querySelectorAll('[role=dialog] canvas').length===2`));
  for(const mode of ['light','dark']){await c.evaluate(`document.body.classList.toggle('theme-dark',${mode==='dark'});document.body.classList.toggle('theme-light',${mode==='light'})`);for(const width of [1200,420]){await size(width);await runtime.shot(`${name}-analytics-${mode}-${width}`);check(`${name}-dialog-overflow-${mode}-${width}`,await c.evaluate(`(()=>{const e=document.querySelector('[role=dialog]');return e.scrollWidth-e.clientWidth<3&&e.getBoundingClientRect().height<=innerHeight*.91})()`));}}

  await close();await size(1200);
 }
 await c.evaluate(`document.querySelector('[data-clock-weather] button').click()`);await until(`document.querySelector('[role=dialog]')?.innerText.includes('Next 24 hours')`);await runtime.shot('weather-details');await close();
 execFileSync('git',['init','-q',root]);await fs.writeFile(path.join(root,'outside-secret.md'),'must not appear');
 await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'sync',section:'changes'})`);
 await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).some(s=>s.getViewType()==='huhu-sync-page')`);
 await c.evaluate(`window.ss=app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).find(s=>s.getViewType()==='huhu-sync-page').host.service();ss.connect()`);
 check('parent-repository-rejected',await c.evaluate(`ss.snapshot.phase==='no-repo'&&!!ss.snapshot.place.parentRoot&&!ss.snapshot.status`));await runtime.shot('git-parent-rejected');
 await c.evaluate(`ss.init()`);check('initialization-owned-by-current-vault',await c.evaluate(`ss.snapshot.phase==='ready'&&ss.snapshot.place.root===${JSON.stringify(runtime.vault)}`));
 await c.evaluate(`ss.refresh()`);check('sibling-files-absent',await c.evaluate(`!JSON.stringify(ss.snapshot.status).includes('outside-secret')`));
 const ignores=await fs.readFile(path.join(runtime.vault,'.gitignore'),'utf8');check('managed-ignore-present',ignores.includes('.DS_Store')&&ignores.includes('.obsidian/plugins/huhu/'));await runtime.shot('git-owned-repository');
 await fs.mkdir(path.join(root,'home/.codex/sessions/2026/10/24'),{recursive:true});await fs.mkdir(path.join(runtime.vault,'sub'));await fs.mkdir(path.join(root,'vault-sibling'));await fs.symlink(path.join(root,'vault-sibling'),path.join(runtime.vault,'outside-link'));
 for(const [id,cwd] of [['inside',runtime.vault],['sub',path.join(runtime.vault,'sub')],['sibling',path.join(root,'vault-sibling')],['escaped',path.join(runtime.vault,'outside-link')]]){const text=[{type:'session_meta',payload:{id,cwd}},{type:'event_msg',payload:{type:'user_message',message:`Fixture ${id}`}},{type:'event_msg',payload:{type:'token_count',info:{total_token_usage:{input_tokens:id==='inside'||id==='sub'?123:900000,output_tokens:10,cached_input_tokens:0}}}}].map(JSON.stringify).join('\n')+'\n';await fs.writeFile(path.join(root,`home/.codex/sessions/2026/10/24/${id}.jsonl`),text);}
 await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'terminal',section:'running'})`);await until(`app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).some(s=>s.getViewType()==='huhu-agent-page'&&s.controller)`);await c.evaluate(`window.ac=app.workspace.getLeavesOfType('huhu-workbench-view').flatMap(l=>l.view.getNativeSurfaces()).find(s=>s.getViewType()==='huhu-agent-page').controller;ac.workspaceUsage.refresh()`);
 const scoped=await c.evaluate(`({rows:ac.workspaceHistoryStore.store.getState().rows.map(r=>({id:r.sessionId,cwd:r.cwd})),usage:ac.workspaceUsage.snapshot().workspace,error:ac.workspaceHistoryStore.store.getState().error})`);
 check('workspace-native-history-isolation',scoped.rows.length===2&&scoped.rows.every(r=>['inside','sub'].includes(r.id)),scoped);check('workspace-native-token-total',scoped.usage.total===266,scoped.usage);await runtime.shot('workspace-usage');
 const errors=await c.evaluate(`window.huhuAcceptanceErrors`);check('no-host-errors',!errors.length,errors);
 await fs.writeFile(path.join(runtime.evidence,'result.json'),JSON.stringify({buildHash:createHash('sha256').update(await fs.readFile(path.join(runtime.vault,'.obsidian/plugins/huhu/main.js'))).digest('hex'),checks},null,2));
} catch(error){await runtime.shot('failure').catch(()=>{});await fs.writeFile(path.join(runtime.evidence,'result.json'),JSON.stringify({checks,error:String(error),errors:await c.evaluate('window.huhuAcceptanceErrors').catch(()=>[])},null,2));throw error;}
finally{await runtime.stop();}
