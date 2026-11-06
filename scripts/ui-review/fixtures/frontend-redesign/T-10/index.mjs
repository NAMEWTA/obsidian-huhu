import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = { sonner: { 'sonner/dist/index.mjs': 1 }, radix: Object.fromEntries(Object.keys(modalTransforms).map(key => [key, 1])) };
export const startup = 'globalThis.uiReviewStartup';
export const ready = '!!globalThis.uiReview&&Object.values(uiReview.entries).every(e=>e.host.querySelector("[data-diary-reader]"))';
export const configure = sample => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;height:100%;overflow:hidden}';
const tick = cdp => cdp.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
async function show(cdp,name,width){await cdp.evaluate(`(()=>{const f=document.querySelector('iframe');f.style.cssText='position:fixed;top:0;border:0;height:100vh;z-index:100;left:${name==='second'?'0':'-3000px'};width:${width}px'})()`);await tick(cdp);}
async function key(cdp,key,code,modifiers=0){for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key,code:key.length===1?`Key${key.toUpperCase()}`:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers});}
async function click(cdp,name,selector){const point=await cdp.evaluate(`(()=>{const e=uiReview.docs.${name}.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});await tick(cdp);}
async function label(cdp,name,text){const selector=await cdp.evaluate(`(()=>{const b=[...uiReview.docs.${name}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing label '+${JSON.stringify(text)});b.dataset.reviewAction='target';return '[data-review-action=target]'})()`);await click(cdp,name,selector);await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-review-action=target]')?.removeAttribute('data-review-action')`);}
async function enter(cdp,name,selector,text){await click(cdp,name,selector);await key(cdp,'a',65,2);await cdp.send('Input.insertText',{text});await key(cdp,'Tab',9);}
export async function verify({cdp,sample}){
 for(const name of ['main','second']){
  await show(cdp,name,sample.cssWidth);
  const proof=await cdp.evaluate(`(()=>{const d=uiReview.docs.${name},p=uiReview.entries.${name}.host;return{overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,book:!!p.querySelector('[data-diary-book]'),nativeDate:!!p.querySelector('input[type=date]'),nested:p.querySelectorAll('button button').length,missing:/navigator\\.diary\\.|editor\\.comments\\./.test(p.innerText),pages:p.querySelectorAll('[data-diary-page]').length}})()`);
  assert.equal(proof.overflow,false);assert.equal(proof.book,true);assert.equal(proof.nativeDate,false);assert.equal(proof.nested,0);assert.equal(proof.missing,false);assert.ok(proof.pages<=2);sample.assertions.push({name,proof});
 }
}
export async function exercise({cdp,result,waitFor,capture}){
 result.exercise=[];
 await cdp.evaluate("uiReview.configure({language:'en',theme:'paper',accent:'teal',source:'huhu',density:'compact',uiSize:'14',motion:'reduce'})");
 for(const width of [1440,390]){
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  for(const name of ['main','second']){
   await show(cdp,name,width);
   const doc=`uiReview.docs.${name}`,entry=`uiReview.entries.${name}`;
   for(const scene of ['diary','empty-date','navigator','calendar','comments','host','navigator-settings','comments-settings']){
    await cdp.evaluate(`${entry}.scene(${JSON.stringify(scene)})`);await tick(cdp);
    await waitFor(()=>cdp.evaluate(`${entry}.host.childElementCount>0`),scene);
    assert.equal(await cdp.evaluate(`${doc}.documentElement.scrollWidth>${doc}.documentElement.clientWidth+1`),false,`${name} ${width} ${scene}`);
    assert.equal(await cdp.evaluate(`${entry}.host.querySelectorAll('input[type=date],input[type=datetime-local],button button').length`),0);
    await capture(`t10-${name}-${width}-${scene}`);
   }
   await cdp.evaluate(`${entry}.scene('diary')`);await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-diary-reader] [role=combobox]')`),'period selector');
   for(const [index,period] of ['day','week','month','quarter','year'].entries()){
    await click(cdp,name,'[data-diary-reader] [role=combobox]');await key(cdp,'Home',36);await waitFor(()=>cdp.evaluate(`${doc}.activeElement===${doc}.querySelectorAll('[role=option]')[0]`),'period first option focused');for(let at=0;at<index;at++){await key(cdp,'ArrowDown',40);await waitFor(()=>cdp.evaluate(`${doc}.activeElement===${doc}.querySelectorAll('[role=option]')[${at+1}]`),'period next option focused');}await key(cdp,'Enter',13);
    await waitFor(()=>cdp.evaluate(`[...${doc}.querySelectorAll('[data-diary-page] footer')].some(e=>e.textContent.includes('/${period}/'))`),'actual '+period+' periodic page');
    await capture(`t10-${name}-${width}-period-${period}`);
   }
   await cdp.evaluate(`${entry}.scene('empty-date')`);await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-diary-reader]')`),'empty reader');
   const before=await cdp.evaluate(`${entry}.io.open.length`);
   await label(cdp,name,'Search / Write');await label(cdp,name,'Write a note');
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-diary-tools] textarea')`),'writing');
   await enter(cdp,name,'[data-diary-tools] textarea','Draft remains until explicitly saved.');
   await label(cdp,name,'Back to book');
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[role=alertdialog]')`),'unsaved guard');
   await label(cdp,name,'Keep writing');
   assert.equal(await cdp.evaluate(`${doc}.querySelector('[data-diary-tools] textarea').value`),'Draft remains until explicitly saved.');
   assert.equal(await cdp.evaluate(`${entry}.io.open.length`),before,'browsing and draft do not create a file');
   await capture(`t10-${name}-${width}-writing`);
   await cdp.evaluate(`${entry}.io.failWrite=true;${entry}.holdWrite()`);await label(cdp,name,'Save');
   await waitFor(()=>cdp.evaluate(`[...${doc}.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('Saving.'))`),'actual saving');await capture(`t10-${name}-${width}-saving`);
   await cdp.evaluate(`${entry}.io.releaseWrite?.()`);await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-diary-tools] [role=alert]')`),'actual write failure retains draft');
   assert.equal(await cdp.evaluate(`${doc}.querySelector('[data-diary-tools] textarea').value`),'Draft remains until explicitly saved.');await capture(`t10-${name}-${width}-save-failed`);
   await cdp.evaluate(`${entry}.io.failWrite=false`);await label(cdp,name,'Reload original snapshot');await tick(cdp);await label(cdp,name,'Save');
   await waitFor(()=>cdp.evaluate(`[...${doc}.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('Appended to periodic note'))`),'verified write');await capture(`t10-${name}-${width}-saved`);

   await cdp.evaluate(`${entry}.holdRead();${entry}.scene('diary')`);
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[aria-busy=true]')`),'first loading');await capture(`t10-${name}-${width}-loading`);
   await label(cdp,name,'Cancel loading');await capture(`t10-${name}-${width}-paused`);await cdp.evaluate(`${entry}.io.releaseRead?.()`);
   await cdp.evaluate(`${entry}.io.failRead=true;${entry}.scene('diary')`);
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[role=alert]')`),'reader error');
   await capture(`t10-${name}-${width}-error`);await cdp.evaluate(`${entry}.io.failRead=false`);
   await cdp.evaluate(`${entry}.scene('comments')`);await waitFor(()=>cdp.evaluate(`${doc}.querySelectorAll('[data-thread-id]').length===2`),'threads with orphan');
   await enter(cdp,name,'input[aria-label="Search highlights and notes"]','definitely-no-match-824');
   await capture(`t10-${name}-${width}-no-results`);
   await enter(cdp,name,'input[aria-label="Search highlights and notes"]','');
   await cdp.evaluate(`${entry}.comments.status(${entry}.first.id,false)`);await tick(cdp);
   const repliesBefore=await cdp.evaluate(`${entry}.store.threadsFor('Journal/day/2026-11-04.md')[0].messages.length`);
   await label(cdp,name,'Reply…');await enter(cdp,name,'textarea','Reply from trusted keyboard');await click(cdp,name,'textarea');await key(cdp,'Enter',13,2);
   await waitFor(()=>cdp.evaluate(`${entry}.store.threadsFor('Journal/day/2026-11-04.md')[0].messages.length===${repliesBefore+1}`),'reply persisted in memory sidecar');
   await capture(`t10-${name}-${width}-reply`);
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await tick(cdp);
   const hitSelector='[data-thread-id] button[aria-label="Delete"]';
   const hit=await cdp.evaluate(`(()=>{const b=${doc}.querySelector(${JSON.stringify(hitSelector)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()`);
   assert.ok(hit.width>=44&&hit.height>=44,JSON.stringify(hit));
   for(const [dx,dy] of [[0,0],[-21.5,0],[21.5,0],[0,-21.5],[0,21.5]]){
    const point={x:hit.x+dx,y:hit.y+dy};
    assert.equal(await cdp.evaluate(`${doc}.elementFromPoint(${point.x},${point.y})?.closest('button')===${doc}.querySelector(${JSON.stringify(hitSelector)})`),true,'independent coarse action');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[role=alertdialog]')`),'trusted touch opens deletion confirmation');
    await key(cdp,'Escape',27);await waitFor(()=>cdp.evaluate(`!${doc}.querySelector('[role=alertdialog]')`),'confirmation cancels');
   }
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await tick(cdp);
   await click(cdp,name,'[data-thread-id] button[aria-label="Delete"]');
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[role=alertdialog]')`),'delete confirmation');
   await capture(`t10-${name}-${width}-delete-confirm`);await key(cdp,'Escape',27);
   await click(cdp,name,'[data-thread-id] button[aria-label="Resolve"]');
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-status=resolved]')`),'resolved state');
   await capture(`t10-${name}-${width}-resolved`);
   await cdp.evaluate(`${entry}.channel.open({path:'Journal/day/2026-11-04.md',ownerDocument:${doc},rect:()=>new DOMRect(40,40,40,20),mode:'threads',threadIds:[${entry}.orphan.id],pinned:true});${entry}.scene('overlay')`);
   await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[data-comments-overlay]')`),'window-owned overlay');
   await capture(`t10-${name}-${width}-overlay-orphan`);await cdp.evaluate(`${entry}.channel.close(false)`);

   await cdp.evaluate(`${entry}.scene('host')`);await waitFor(()=>cdp.evaluate(`!!${doc}.querySelector('[role=tab]')`),'editor host');
   await click(cdp,name,'[role=tab][data-state=inactive]');await tick(cdp);await capture(`t10-${name}-${width}-history-unavailable`);
   await click(cdp,name,'[role=tab][data-state=inactive]');
   assert.equal(await cdp.evaluate(`${doc}.querySelectorAll('[data-thread-id]').length`),2,'hidden comment contribution retained');
   result.exercise.push({name,width,states:['diary','empty-date','writing','saving','save-failed','saved','unsaved-guard','error','navigator','calendar','comments','reply','delete-confirm','resolved','orphan','overlay-orphan','editor-host','history-unavailable','navigator-settings','comments-settings'],boundary:'Memory vault and sidecar ports; native editor/popout/Git owned by host acceptance'});
  }
 }
}
