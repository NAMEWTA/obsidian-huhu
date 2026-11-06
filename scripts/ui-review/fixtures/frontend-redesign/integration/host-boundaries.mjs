// Real Linux Safe/clipboard ownership, only inside a caller-owned isolated Xvfb display.
// HUHU_ISOLATED_XVFB=1 xvfb-run -a ... node <this file> <NEW root>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from '../../../../obsidian-acceptance/fresh-vault.mjs';
import { connect } from '../../../../obsidian-acceptance/cdp.mjs';
assert.equal(process.env.HUHU_ISOLATED_XVFB,'1','Caller must launch this probe under its own new Xvfb, never a user desktop');
assert.match(process.env.DISPLAY??'',/^:\d+(?:\.\d+)?$/,'isolated local Xvfb DISPLAY required');
const root=process.argv[2], nonce='huhu_fake_'+randomUUID(), password='Fixture Master 7! '+randomUUID();
const runtime=await launchFreshVault({root,port:9391,files:{'.huhu/dashboards/dashboard.md':'---\nwidgets: []\n---\n'},settings:{version:1,namespaces:{app:{language:'en',introSeen:true,modules:{home:true,safe:true,task:true,agent:false,archives:false,automations:false,notifications:false,icons:false,comments:false,navigator:false,versioning:false}},home:{widgetWeatherEnabled:false},safe:{lockOnSwitch:true,lockOnClose:true}}}});
let c=runtime.connection,pop;
const rows=[];
const check=(name,ok,detail)=>{rows.push({name,passed:!!ok,detail});assert.ok(ok,name);};
const until=async(expression,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await c.evaluate(expression).catch(()=>false))return;await delay(100);}throw Error('Timed out: '+expression);};
const button=label=>`[...document.querySelectorAll('.huhu-ui button')].find(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&(e.textContent.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)}))`;
const click=async(expression)=>{await until(`!!(${expression})`);await c.evaluate(`(()=>{const e=${expression};e.scrollIntoView({block:'center'});return true})()`);await delay(200);const r=await c.evaluate(`(()=>{const e=${expression},r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`);assert.ok(r.hit,'action must be hit-testable');for(const type of ['mouseMoved','mousePressed','mouseReleased'])await c.send('Input.dispatchMouseEvent',{type,x:r.x,y:r.y,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});};
const fill=async(selector,value)=>{await until(`!!document.querySelector(${JSON.stringify(selector)})`);await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),w=e.ownerDocument.defaultView;Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new w.Event('input',{bubbles:true}));return true})()`);};
const clipboard=()=>c.evaluate(`require('@electron/remote').clipboard.readText()`);
const locked=`!!document.querySelector('input[id$="-master"]')&&!document.querySelector('[data-safe-workspace]')`;
const unlock=async()=>{await until(locked);await fill('input[id$="-master"]',password);await click(button('Unlock'));await until(`!!document.querySelector('[data-safe-workspace]')`);};
const detail=async()=>{await click(`document.querySelector('[data-safe-entry]')`);await until(`!!document.querySelector('[data-safe-detail]')`);};
const copy=async()=>{await click(button('Copy password'));await until(`require('@electron/remote').clipboard.readText()===${JSON.stringify(nonce)}`);};
try {
 await c.evaluate(`app.workspace.leftSplit?.collapse();app.workspace.rightSplit?.collapse();app.plugins.plugins.huhu.openWorkbench({feature:'safe'});true`);
 await until(`!!document.querySelector('input[id$="-confirm"]')`);
 await fill('input[id$="-master"]',password);await fill('input[id$="-confirm"]',password);await click(button('Create safe'));
 await until(`!!document.querySelector('[data-safe-workspace]')`);
 await click(button('Add entry'));await until(`!!document.querySelector('[role=dialog] input[aria-label="Title"]')`);
 await fill('[role=dialog] input[aria-label="Title"]','Disposable acceptance record');
 await fill('[role=dialog] input[aria-label="Username 1"]','fixture');await fill('[role=dialog] input[aria-label="Password 1"]',nonce);

 await click(button('Cancel'));await until(`!!document.querySelector('[role=alertdialog]')`);
 check('main-nested-dialog-owner',await c.evaluate(`[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].every(e=>e.ownerDocument===document&&!!e.closest('.huhu-ui'))&&document.querySelectorAll('[role=dialog],[role=alertdialog]').length===2`));
 await click(button('Keep editing'));await until(`!document.querySelector('[role=alertdialog]')`);
 await click(button('Save'));await until(`!document.querySelector('[role=dialog]')&&!!document.querySelector('[data-safe-entry]')`);await detail();
 // Never read an existing selection: overwrite this isolated display with our nonce before the first read.
 await copy();check('native-clipboard-roundtrip',await clipboard()===nonce);
 const copiedAt=Date.now();await delay(15000);await copy();
 const secondCopiedAt=Date.now();
 // Old owner's original 30s timer must not clear the replacement copy.
 await delay(Math.max(0,copiedAt+31000-Date.now()));check('recopy-replaces-old-clear-owner',await clipboard()===nonce,{copiedAt,secondCopiedAt,elapsedSinceSecondCopyMs:Date.now()-secondCopiedAt});
 // Probe at 29s, before the real 30s deadline. A missed pre-deadline probe fails rather than retries.
 await delay(Math.max(0,secondCopiedAt+29000-Date.now()));
 const beforeClearAt=Date.now(),beforeClearValue=await clipboard();
 check('second-copy-survives-before-thirty-seconds',beforeClearValue===nonce&&beforeClearAt-secondCopiedAt>=29000&&Date.now()-secondCopiedAt<30000,{secondCopiedAt,beforeClearAt,elapsedMs:Date.now()-secondCopiedAt});
 // Allow at most 500ms for copy-completion observation and 2s for native timer/CDP polling dispatch.
 // These bounds measure the second copy, not the first copy's unrelated deadline.
 await until(`require('@electron/remote').clipboard.readText()===''`,Math.max(0,secondCopiedAt+32000-Date.now()));
 const clearedAt=Date.now(),elapsedMs=clearedAt-secondCopiedAt;
 check('real-production-thirty-second-clear',elapsedMs>=29500&&elapsedMs<=32000,{copiedAt,secondCopiedAt,beforeClearAt,clearedAt,elapsedMs});
 await copy();await c.evaluate(`app.commands.executeCommandById('huhu:safe-lock');true`);await until(locked);await until(`require('@electron/remote').clipboard.readText()===''`);check('lock-clears-native-copy',true);
 await unlock();await detail();await copy();
 await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'dashboard'});true`);await until(`!!document.querySelector('[data-rail-button][data-feature=dashboard][aria-current=page]')`);await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'safe'});true`);await until(locked);check('hidden-page-locks-and-clears',await clipboard()==='');
 await unlock();await detail();await copy();
 const ids=new Set((await(await fetch(process.env.HUHU_CDP_URL+'/json')).json()).map(t=>t.id));
 await c.evaluate(`window.safeLeaf=app.workspace.getLeavesOfType('huhu-workbench-view').find(l=>l.view.containerEl.ownerDocument===document);app.workspace.moveLeafToPopout(safeLeaf,{width:1000,height:800});true`);
 await until(`safeLeaf.view.containerEl.ownerDocument!==document`);
 const target=(await(await fetch(process.env.HUHU_CDP_URL+'/json')).json()).find(t=>t.type==='page'&&!ids.has(t.id));assert.ok(target);pop=await connect(target.url,target.id);c=pop;
 await until(locked);check('migration-locks-native-owner',await clipboard()==='');await unlock();
 await click(button('Add entry'));await fill('[role=dialog] input[aria-label="Title"]','Discard this fixture');await click(button('Cancel'));await until(`!!document.querySelector('[role=alertdialog]')`);
 check('popout-nested-modal-owner',await c.evaluate(`[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].every(e=>e.ownerDocument===document&&!!e.closest('.huhu-ui'))&&document.querySelectorAll('[role=dialog],[role=alertdialog]').length===2`));
 await click(button('Discard changes'));await until(`!document.querySelector('[role=dialog]')`);await detail();await copy();
 check('popout-feedback-owner',await c.evaluate(`[...document.querySelectorAll('.huhu-ui [role=status]')].some(e=>e.textContent.includes('Password copied.')&&e.ownerDocument===document&&!!e.closest('.huhu-ui'))`));
 await c.evaluate(`app.workspace.getLeavesOfType('huhu-workbench-view').filter(l=>l.view.containerEl.ownerDocument===document).forEach(l=>l.detach());true`);
 c=runtime.connection;await until(`require('@electron/remote').clipboard.readText()===''`);check('closing-popout-clears-copy',true);pop.close();pop=undefined;
 await runtime.restart();c=runtime.connection;await c.evaluate(`app.plugins.plugins.huhu.openWorkbench({feature:'safe'});true`);await until(locked);await unlock();await detail();check('restart-restores-encrypted-record-locked',true);
 await c.evaluate(`app.commands.executeCommandById('huhu:safe-lock');true`);await until(locked);
 check('no-main-native-errors',(await c.evaluate('huhuAcceptanceErrors')).length===0);
 await runtime.shot('safe-restored');
} catch(error) { await runtime.shot('failure').catch(()=>{});await fs.writeFile(path.join(runtime.evidence,'failure-state.json'),JSON.stringify(await c.evaluate(`({body:document.body.innerText,errors:window.huhuAcceptanceErrors})`).catch(()=>null),null,2));rows.push({name:'failure',passed:false,error:String(error.stack??error)});throw error; }
finally { await fs.writeFile(path.join(runtime.evidence,'host-boundaries.json'),JSON.stringify({rows,passed:rows.every(r=>r.passed),display:process.env.DISPLAY,nonceIsSynthetic:true,uncovered:['native file picker','Windows','macOS']},null,2));pop?.close();await runtime.stop(); }
