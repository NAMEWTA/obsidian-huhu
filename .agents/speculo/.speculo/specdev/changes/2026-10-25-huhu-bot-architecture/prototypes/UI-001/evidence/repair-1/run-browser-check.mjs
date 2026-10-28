#!/usr/bin/env node
// Local, dependency-free browser verification. Does not edit the approved package.
// Run from the repository root: node <this file>
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(evidenceRoot, "../..");
const projectRoot = resolve(packageRoot, '../../../../../../../..');
const runtimeRoot = resolve(evidenceRoot, '.browser-runtime');
const shotsRoot = resolve(evidenceRoot, 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const observations = [], cases = [], errors = [], requests = [], findings = [];
let socket, chrome, xvfb, server, entry, viewport, currentStep = 'startup';
const pending = new Map(); let sequence = 0;
const action = name => `[data-action="${name}"]`;
const hash = b => createHash('sha256').update(b).digest('hex');
const guarded = ['design-system.md','bindings.json','../../DESIGN.md','final/index.html','final/app.js','final/styles.css'];
const before = Object.fromEntries(await Promise.all(guarded.map(async p => [p,hash(await readFile(resolve(packageRoot,p)))])));
await mkdir(shotsRoot, { recursive:true });
await mkdir(runtimeRoot, { recursive:true });
const log = (kind, detail) => { observations.push({at:new Date().toISOString(),step:currentStep,kind,...detail}); };
function note(id, passed, actual, expected) {
  const item={id,passed,actual,expected}; log('assertion',item);
  if(!passed) findings.push({...item,step:currentStep});
  return passed;
}
function command(method, params={}) {
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},15000);
    pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v);},reject:e=>{clearTimeout(timeout);reject(e);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);
  return result.result.value;
}
async function waitFor(expression, timeout=5000) {
  const start=Date.now();
  while(Date.now()-start<timeout){if(await evaluate(expression))return;await sleep(40);}
  throw new Error(`wait failed: ${expression}`);
}
async function key(key, modifiers=0) {
  const codes={Tab:9,Enter:13,Escape:27,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40,Home:36,End:35};
  await command('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:codes[key],modifiers,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:codes[key],modifiers});
  await sleep(35);
}
async function click(selector, index=0) {
  const point=await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]'))[${index}];if(!e)throw Error('Missing visible '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  log('click',{selector,index}); await sleep(70);
}
async function fill(selector,text){
  await click(selector);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await command('Input.insertText',{text});
  log('input',{selector,text,method:'CDP Ctrl+A / Input.insertText'});
}
async function select(selector,value){
  const index=await evaluate(`[...document.querySelector(${JSON.stringify(selector)}).options].findIndex(o=>o.value===${JSON.stringify(value)})`);
  if(index<0)throw new Error('Option missing: '+value);
  await click(selector);await key('Home');for(let i=0;i<index;i++)await key('ArrowDown');await key('Enter');
  log('select',{selector,value,method:'native popup click / Home / ArrowDown / Enter'});await sleep(60);
}
async function visibleText(selector='body'){return evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText||''`);}
async function includes(text,selector='body'){return (await visibleText(selector)).includes(text);}
async function nav(name){
  const isVisible=await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(action(name))})].find(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]'));return Boolean(e);})()`);
  if(!isVisible)await click('#menu-toggle');
  await click(action(name));
}
async function reset(width=1440,height=960,locator='final/index.html',touch=false){
  entry=locator;viewport={width,height};
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await command('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:touch?1:1});
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'},{name:'prefers-reduced-motion',value:'reduce'}]});
  await command('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/${locator}`});
  await waitFor('document.readyState==="complete" && document.querySelector("#draft")');
  await evaluate('document.fonts.ready.then(()=>true)');
  await sleep(140);log('navigate',{entry,width,height,touch});
}
async function screenshot(id,states){
  currentStep=id;
  const layout=await evaluate(`(()=>{const root=document.documentElement,ws=document.querySelector('#workspace'),leaf=document.querySelector('#leaf');return {width:innerWidth,height:innerHeight,documentWidth:root.scrollWidth,documentHeight:root.scrollHeight,leaf:leaf.dataset.size,workspaceWidth:ws.clientWidth,workspaceScrollWidth:ws.scrollWidth,title:document.querySelector('#page-title').textContent,modal:document.querySelector('#modal').open?document.querySelector('#modal-title').textContent:null};})()`);
  const noOverflow=note('horizontal-overflow',layout.documentWidth<=layout.width+1&&layout.workspaceScrollWidth<=layout.workspaceWidth+1,layout,'document and workspace have no horizontal overflow');
  const focusBefore=await evaluate('document.activeElement?.outerHTML?.slice(0,200)');
  // Start from a documented in-page focus target. A Tab leaving the last page
  // control for browser chrome is normal browser navigation, not a UI failure.
  await evaluate(`(()=>{const root=document.querySelector('#modal').open?document.querySelector('#modal'):document;const e=[...root.querySelectorAll('button,input,select,textarea')].find(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]')&&!e.disabled);e?.focus();})()`);
  await key('Tab');
  const focus=await evaluate(`(()=>{const e=document.activeElement,s=getComputedStyle(e);return {tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,80),outline:s.outlineStyle,outlineWidth:s.outlineWidth,focusVisible:e.matches(':focus-visible'),inDialog:e.closest('#modal')!==null};})()`);
  const keyboard=note('keyboard-tab',!['BODY','HTML'].includes(focus.tag),focus,'Tab reaches an interactive control');
  const focused=note('visible-focus',focus.focusVisible&&focus.outline!=='none'&&parseFloat(focus.outlineWidth)>0,focus,'keyboard focus is visible');
  const filename=`evidence/repair-1/screenshots/${id}.png`;
  const capture=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(resolve(packageRoot,filename),Buffer.from(capture.data,'base64'));
  const item={id,entry,width:layout.width,height:layout.height,screenshot:filename,checks:{rendered:layout.workspaceWidth>0,no_overflow:noOverflow,keyboard,focus:focused,long_text:false,zoom:false,reduced_motion:false,states:true},states};
  cases.push(item);log('screenshot',{...layout,path:filename,focusBefore,focus});
  console.log(JSON.stringify({screenshot:id,states,overflow:!noOverflow}));
}
async function scenario(value){await select('#scenario',value);}
async function keyboardDialog(){
  await click(action('approval'));const trigger=await evaluate('document.querySelector("#modal").open');
  let trapped=true;const path=[];
  for(let i=0;i<12;i++){await key('Tab',i>6?8:0);const f=await evaluate('({tag:document.activeElement.tagName,action:document.activeElement.dataset.action,inDialog:document.activeElement.closest("#modal")!==null,documentFocus:document.hasFocus()})');path.push(f);trapped&&=f.inDialog||f.tag==='BODY';}
  note('dialog-focus-trap',trigger&&trapped,path,'Tab and Shift+Tab never focus background page controls; BODY is recorded as the native boundary, not an interactive control');
  await evaluate('document.querySelector("#modal button").focus()');
  await key('Escape');
  const result=await evaluate('({open:document.querySelector("#modal").open,action:document.activeElement.dataset.action})');
  note('dialog-escape-focus-return',!result.open&&result.action==='approval',result,'Escape closes and returns focus to the approval trigger');
}
async function dirtyFormMatrix(){
  for(const mode of ['new-bot','edit-bot'])for(const dismissal of ['escape','cancel','close']){
    const id=`dirty-${mode}-${dismissal}`;currentStep=id;
    await reset();await click('[data-action="select"][data-id="reviewer"]');
    if(mode==='edit-bot')await click(action('details'));
    await click(action(mode));
    note(`${id}-initial-focus`,await evaluate('document.activeElement.id==="bot-name"'),await evaluate('({id:document.activeElement.id,action:document.activeElement.dataset.action})'),'primary input receives initial focus');
    const initial=await evaluate('document.querySelector("#bot-name").value');
    await fill('#bot-name',`待保存-${mode}-${dismissal}`);
    await fill('#bot-description','保留当前职责输入，只有明确放弃才能丢弃。');
    async function dismiss(){
      if(dismissal==='escape')await key('Escape');
      else if(dismissal==='cancel')await click('#modal-actions [data-action="close-modal"]');
      else await click('#modal .modal-header [data-action="close-modal"]');
    }
    await dismiss();
    const warning=await evaluate('({open:document.querySelector("#modal").open,warning:!!document.querySelector("#unsaved-warning"),name:document.querySelector("#bot-name")?.value,focus:document.activeElement.dataset.action})');
    const blocked=note(`${id}-guard`,warning.open&&warning.warning&&warning.name===`待保存-${mode}-${dismissal}`&&warning.focus==='continue-editing',warning,'dirty close prompts without discarding and focuses continue editing');
    await screenshot(id+'-warning',['BOT-AGENT:'+ (mode==='new-bot'?'creating':'editing')]);
    if(!blocked)throw new Error(id+' lost dirty form or did not present expected decision');
    await click(action('continue-editing'));
    const continued=await evaluate('({name:document.querySelector("#bot-name").value,description:document.querySelector("#bot-description").value,warning:!!document.querySelector("#unsaved-warning"),focus:document.activeElement.id})');
    note(`${id}-continue`,continued.name===`待保存-${mode}-${dismissal}`&&continued.description==='保留当前职责输入，只有明确放弃才能丢弃。'&&!continued.warning&&continued.focus==='bot-name',continued,'continue editing preserves both fields and focuses name');
    await dismiss();await click(action('discard-editing'));
    const discarded=await evaluate('({open:document.querySelector("#modal").open,focus:document.activeElement.dataset.action})');
    note(`${id}-discard`,!discarded.open&&discarded.focus===mode,discarded,'explicit discard closes and restores the original trigger');
    await click(action(mode));
    note(`${id}-reopen`,await evaluate('document.querySelector("#bot-name").value')===initial,await evaluate('document.querySelector("#bot-name").value'),'explicitly discarded values did not commit');
    await key('Escape');
    note(`${id}-clean-close`,await evaluate('!document.querySelector("#modal").open'),await evaluate('document.querySelector("#modal").open'),'clean form closes without an unnecessary dirty warning');
    await click(action(mode));await fill('#bot-name',`已保存-${dismissal}`);await fill('#bot-description','确认保存的职责描述。');
    await dismiss();await click(action('continue-editing'));await click(action('save-bot'));
    note(`${id}-save`,await includes(`已保存-${dismissal}`,'#page-body')&&!await evaluate('document.querySelector("#modal").open'),await visibleText('#page-body'),'save still commits after continue editing');
  }
}
async function measureTouch(id){
  currentStep=id;
  const result=await evaluate(`(()=>{const root=document.querySelector('#modal').open?document.querySelector('#modal'):document.querySelector('#leaf');const items=[...root.querySelectorAll('button,input,select,textarea')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]')).map(e=>{const target=e.type==='checkbox'&&e.closest('label')?e.closest('label'):e;const r=target.getBoundingClientRect();return {action:e.dataset.action||e.id,name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,35),width:r.width,height:r.height,measuredTarget:target===e?'control':'associated label'};});return {coarse:matchMedia('(pointer:coarse)').matches,items,undersized:items.filter(r=>r.width<43.9||r.height<43.9)};})()`);
  note(id,result.coarse&&result.undersized.length===0,result,'all visible product touch targets are at least 44px in both axes; checkbox uses its clickable associated label');
  return result;
}

try {
  const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2'};
  server=createServer(async(req,res)=>{try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const file=resolve(packageRoot,'.'+pathname);
    if(!file.startsWith(packageRoot+'/')||!/^\/(final|comparison)\//.test(pathname)){res.writeHead(403);res.end();return;}
    const body=await readFile(file);res.writeHead(200,{'content-type':type[extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const display=':97';
  xvfb=spawn('Xvfb',[display,'-screen','0','1920x1200x24','-nolisten','tcp'],{stdio:'ignore'});
  await sleep(300);
  chrome=spawn('google-chrome',['--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${runtimeRoot}`,'--window-size=1440,1040','about:blank'],{env:{...process.env,DISPLAY:display},stdio:['ignore','pipe','pipe']});
  let chromeLog='';chrome.stderr.on('data',d=>chromeLog+=d);chrome.stdout.on('data',d=>chromeLog+=d);
  let port;
  for(let i=0;i<100;i++){try{port=Number((await readFile(resolve(runtimeRoot,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await sleep(100);}}
  if(!port)throw new Error('Chrome did not expose CDP');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){errors.push(m.params);log('runtime-exception',m.params);}else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'){errors.push(m.params.entry);}else if(m.method==='Network.requestWillBeSent')requests.push({url:m.params.request.url,type:m.params.type});});
  for(const domain of ['Page','Runtime','Log','Network'])await command(`${domain}.enable`);
  const version=await command('Browser.getVersion');
  log('environment',{browser:version,node:process.version,platform:process.platform,display:'Xvfb 1920x1200x24',tool:'Google Chrome CDP via Node built-in WebSocket',screenshots:'actual browser Page.captureScreenshot; no image synthesis'});

  for(const width of [1440,390]){
    await reset(width,width===1440?960:844,'comparison/variants/candidate-a.html');
    await keyboardDialog();await screenshot(`candidate-${width}`,['BOT-CHAT:normal','BOT-TASKS:approval']);
  }
  await reset();await keyboardDialog();await screenshot('chat-desktop',['BOT-CHAT:normal']);
  currentStep='sidebar-keyboard-resize';await click('#resize-handle');
  for(const [k,expected] of [['ArrowRight','288'],['ArrowLeft','280'],['Home','220'],['End','500']]){await key(k);note(k,(await evaluate('document.querySelector("#resize-handle").getAttribute("aria-valuenow")'))===expected,await evaluate('document.querySelector("#resize-handle").getAttribute("aria-valuenow")'),expected);}
  await reset();await fill('#search','NO-MATCH-20261025');note('search-empty',await includes('没有匹配结果'),await visibleText('#directory'),'no matching result while create stays reachable');await fill('#search','');
  await fill('#draft','忙时请保留这份草稿');await click(action('send'));note('busy-draft-preserved',(await evaluate('document.querySelector("#draft").value'))==='忙时请保留这份草稿',await visibleText('#toast'),'draft retained and busy hint');
  for(const value of ['empty','loading','error','offline','permission','recovery','long']){
    await scenario(value);await screenshot(`chat-${value}`,['BOT-CHAT:'+value]);
    if(value==='error'){await click(action('retry'));note('retry-keeps-draft',(await evaluate('document.querySelector("#draft").value'))==='忙时请保留这份草稿',await evaluate('document.querySelector("#draft").value'),'draft survives error/retry');}
    if(value==='offline'){note('offline-blocks-send',await evaluate('document.querySelector("#draft").disabled && document.querySelector("[data-action=send]").disabled'),await evaluate('document.querySelector("#draft").disabled'),'saved content and disabled composer');await click(action('reconnect'));}
    if(value==='recovery'){note('recovery-explicit',await evaluate('document.querySelector("#draft").disabled')&&await includes('继续会产生后续模型调用'),await visibleText('.notice'),'continuation requires click');await click(action('resume'));}
  }
  await reset();await nav('tasks');await screenshot('tasks-approval',['BOT-TASKS:approval']);
  await click('[data-action="task-detail"][data-task="temp"]');note('temporary-identity',await includes('不加入 Bot 目录','#modal')&&await includes('不含其他 Bot 私聊','#modal'),await visibleText('#modal'),'temporary child has explicit caller/context boundary');await screenshot('tasks-temporary',['BOT-TASKS:temporary']);
  await click(action('cancel-child'));note('cancel-child',await includes('已停止。'),await visibleText('#page-body'),'child stop preserves parent task');
  await click('[data-action="task-detail"][data-task="write"]');await click(action('approval'));await screenshot('approval-diff',['BOT-TASKS:approval']);
  await click(action('reject'));await screenshot('tasks-canceled',['BOT-TASKS:canceled']);
  await reset();await click(action('approval'));await click(action('approve'));await screenshot('tasks-running',['BOT-TASKS:running']);await waitFor('document.querySelector("#page-body").textContent.includes("已保存")');await nav('tasks');await screenshot('tasks-completed',['BOT-TASKS:completed']);
  await scenario('unknown');await nav('tasks');await screenshot('tasks-unknown',['BOT-TASKS:unknown']);

  await reset();await click('[data-action="select"][data-id="reviewer"]');await click(action('details'));await screenshot('agent-normal',['BOT-AGENT:normal']);
  await click(action('edit-bot'));await screenshot('agent-editing',['BOT-AGENT:editing']);await fill('#bot-name','审校助手修订');await fill('#bot-description','核对事实、来源以及长中文描述');await click(action('save-bot'));note('bot-revision',await includes('修订 2'),await visibleText('#page-body'),'editing increments the same bot revision');
  await click(action('disable-bot'));await screenshot('agent-disabled',['BOT-AGENT:disabled']);await click(action('disable-bot'));
  await click(action('new-bot'));note('bot-initial-focus',await evaluate('document.activeElement.id==="bot-name"'),await evaluate('({id:document.activeElement.id,action:document.activeElement.dataset.action})'),'opening a form focuses its primary input');await click(action('save-bot'));note('bot-required',await includes('请填写名称和职责描述','#modal'),await visibleText('#form-error'),'required-name and description error');await screenshot('agent-creating',['BOT-AGENT:creating']);await fill('#bot-name','浏览器验证助手');await fill('#bot-description','仅用于离线浏览器演示');await click(action('save-bot'));note('bot-created',await includes('浏览器验证助手','#directory'),await visibleText('#directory'),'explicit submit adds persistent identity');
  await click(action('new-group'));await screenshot('group-create',['BOT-CHAT:empty']);await fill('#group-name','浏览器验证群');await click(action('save-group'));note('group-created',await includes('浏览器验证群','#page-title'),await visibleText('#page-title'),'group uses existing members');

  await reset();await nav('memory');await screenshot('memory-private',['BOT-MEMORY:private']);await click(action('toggle-memory'));await select('#memory-owner','writer');note('memory-owner-isolation',(await visibleText(action('toggle-memory'))).includes('已开启'),await visibleText(action('toggle-memory')),'writer unaffected when coordinator paused');await select('#memory-owner','coordinator');note('memory-owner-retained',(await visibleText(action('toggle-memory'))).includes('已暂停'),await visibleText(action('toggle-memory')),'coordinator remains paused');
  await click(action('memory-source'));note('memory-source',await includes('条目修订 1','#modal'),await visibleText('#modal'),'source/revision shown');await key('Escape');
  await click(action('correct-memory'));await fill('#memory-text','先列可信来源，再说明不确定项。');await click(action('save-memory'));note('memory-corrected',await includes('先列可信来源')&&await includes('修订 2'),await visibleText('#page-body'),'new content/revision visible');
  await click(action('forget-memory'));await screenshot('memory-forget-confirm',['BOT-MEMORY:private']);await click(action('confirm-forget'));await screenshot('memory-forgotten',['BOT-MEMORY:forgotten']);
  await click('[data-action="memory-scope"][data-scope="global"]');await screenshot('memory-global-pending',['BOT-MEMORY:global','BOT-MEMORY:pending']);await click(action('dismiss-proposal'));note('global-rejected',!await evaluate('!!document.querySelector(".proposal")')&&!await includes('来源：协调员提案'),await visibleText('#page-body'),'reject removes proposal without creating shared entry');
  await reset();await nav('memory');await click('[data-action="memory-scope"][data-scope="global"]');await click(action('global-proposal'));await screenshot('memory-global-confirm',['BOT-MEMORY:pending']);await click(action('approve-global'));note('global-confirmed',await includes('来源：协调员提案')&&!await evaluate('!!document.querySelector(".proposal")'),await visibleText('#page-body'),'only explicit approval creates shared entry');
  await click('[data-action="memory-scope"][data-scope="short"]');await screenshot('memory-short',['BOT-MEMORY:short']);

  await reset();await click(action('access'));await screenshot('access-attached',['BOT-ACCESS:attached']);await click(action('grant'));note('grant-default',await evaluate('document.querySelector("#grant-scope").value==="项目文件夹"&&!document.querySelector("#grant-recipient").checked'),await evaluate('({scope:document.querySelector("#grant-scope").value,recipient:document.querySelector("#grant-recipient").checked})'),'no default full-vault or recipient grant');await click(action('save-grant'));note('grant-requires-recipient',await includes('请明确是否授权这些接收方','#modal'),await visibleText('#form-error'),'recipient approval required');await screenshot('access-grant',['BOT-ACCESS:grant']);await click('#grant-recipient');await click(action('save-grant'));await click(action('revoke'));await screenshot('access-denied',['BOT-ACCESS:denied']);

  await reset();await scenario('unknown');await nav('data');await click(action('delete-session'));await screenshot('data-preflight',['BOT-DATA:preflight']);note('data-preflight-scope',await includes('Vault 中已交付的笔记保留','#modal')&&await includes('保留效果 ID','#modal'),await visibleText('#modal'),'body deletion distinguishes retained effect and delivered files');await click(action('confirm-delete-session'));await screenshot('data-retained',['BOT-DATA:retained']);await click(action('delete-profile'));note('profile-unknown-gate',await includes('完整清除尚不可用','#modal'),await visibleText('#modal'),'unresolved effect blocks profile purge');await click(action('reconcile'));await click(action('mock-reconcile'));note('reconcile-no-retry',await includes('未重复写入','#toast'),await visibleText('#toast'),'postcondition reconciliation distinguished from original receipt');await click(action('delete-profile'));await click(action('confirm-purge'));note('purge-typed-confirm',await includes('请输入「清除」','#form-error'),await visibleText('#form-error'),'typed confirmation required');await fill('#purge-confirm','清除');await click(action('confirm-purge'));await screenshot('data-purged',['BOT-DATA:purged']);note('purge-directory-cleared',await evaluate('document.querySelectorAll("#directory .directory-row").length===0'),await visibleText('#directory'),'previous profile directory gone');

  await reset();await click('[data-action="select"][data-id="reviewer"]');await fill('#draft','输入法测试');
  currentStep='ime-and-enter';await evaluate(`document.querySelector('#draft').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,isComposing:true}))`);note('ime-composing-not-sent',(await evaluate('document.querySelector("#draft").value'))==='输入法测试',await evaluate('document.querySelector("#draft").value'),'synthetic composing Enter keeps draft (not a system IME test)');await key('Enter',8);note('shift-enter-newline',(await evaluate('document.querySelector("#draft").value')).includes('\n'),await evaluate('document.querySelector("#draft").value'),'Shift+Enter inserts newline');await key('Enter');note('enter-send',await evaluate('document.querySelector("#draft").value===""'),await visibleText('#page-body'),'Enter sends when idle');await sleep(650);
  await click(action('attachments'));await click('input[name="attachment"][value="路线图.md"]');await click(action('save-attachments'));note('attachment-selection',await includes('路线图.md','.composer'),await visibleText('.composer'),'explicit attachment chip visible');await click(action('mention'));await click('input[name="mention"][value="reviewer"]');await click(action('save-mentions'));note('mention-target',await includes('@审校助手','.composer'),await visibleText('.composer'),'selected recipient token visible');
  await dirtyFormMatrix();

  for(const width of [800,390]){
    await reset(width,width===800?960:844);await screenshot(`chat-${width}`,['BOT-CHAT:normal']);await click('#menu-toggle');currentStep=`navigation-${width}`;note('drawer-inert',await evaluate('document.querySelector("#workspace").inert'),await evaluate('document.querySelector("#nav-zone").getAttribute("aria-modal")'),'drawer is modal and main inert');await screenshot(`navigation-${width}`,['BOT-CHAT:normal']);await key('Escape');note('drawer-focus-return',await evaluate('document.activeElement.id==="menu-toggle"&&!document.querySelector("#workspace").inert'),await evaluate('document.activeElement.id'),'escape returns focus and restores main');
    await nav('tasks');await screenshot(`tasks-${width}`,['BOT-TASKS:approval']);await nav('memory');await screenshot(`memory-${width}`,['BOT-MEMORY:private']);await nav('settings');await screenshot(`agent-${width}`,['BOT-AGENT:normal']);await nav('chat');await click(action('access'));await screenshot(`access-${width}`,['BOT-ACCESS:attached']);await nav('data');await screenshot(`data-${width}`,['BOT-DATA:preflight']);await scenario('long');await screenshot(`long-${width}`,['BOT-CHAT:long']);await click(action('theme'));await screenshot(`dark-${width}`,['BOT-CHAT:long']);
  }
  for(const width of [1440,390]){
    await reset(width,width===1440?960:844);if(width<960)await click('#menu-toggle');await click('[data-action="select"][data-id="reviewer"]');await fill('#draft','长中文核查内容'.repeat(24)+' UnbrokenEnglishIdentifier'.repeat(12));await key('Enter');await sleep(680);await screenshot(`long-message-${width}`,['BOT-CHAT:long']);
  }
  await reset(390,844,'final/index.html',true);await measureTouch('touch-chat-44px');await screenshot('touch-emulated',['BOT-CHAT:normal']);
  await click('#menu-toggle');await measureTouch('touch-navigation-44px');await screenshot('touch-navigation',['BOT-CHAT:normal']);await key('Escape');
  await click(action('approval'));await measureTouch('touch-approval-44px');await screenshot('touch-approval',['BOT-TASKS:approval']);await key('Escape');
  for(const [page,state] of [['tasks','BOT-TASKS:approval'],['memory','BOT-MEMORY:private'],['settings','BOT-AGENT:normal'],['data','BOT-DATA:preflight']]){await nav(page);await measureTouch(`touch-${page}-44px`);await screenshot(`touch-${page}`,[state]);}
  await nav('chat');await click(action('access'));await measureTouch('touch-access-44px');await screenshot('touch-access',['BOT-ACCESS:attached']);
  await nav('settings');await click(action('edit-bot'));await measureTouch('touch-form-44px');await screenshot('touch-form',['BOT-AGENT:editing']);await key('Escape');
  await nav('chat');
  currentStep='reduced-motion';const reduced=await evaluate(`({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,sidebarTransition:getComputedStyle(document.querySelector('.sidebar')).transitionDuration,scroll:getComputedStyle(document.querySelector('.messages')).scrollBehavior})`);const reducedOk=note('reduced-motion',reduced.matches&&reduced.sidebarTransition==='0s'&&reduced.scroll==='auto',reduced,'reduced motion removes sidebar movement/transition and smooth scroll');

  // Native Chrome zoom shortcut through XTest; this is browser zoom, not CSS zoom or pinch emulation.
  await reset();await scenario('long');await command('Emulation.clearDeviceMetricsOverride');
  const beforeZoom=await evaluate('({innerWidth,innerHeight,dpr:devicePixelRatio,outerWidth,outerHeight})');
  const nativeKeys=`import ctypes,ctypes.util,time\nx=ctypes.CDLL(ctypes.util.find_library('X11'));t=ctypes.CDLL(ctypes.util.find_library('Xtst'));x.XOpenDisplay.restype=ctypes.c_void_p;x.XOpenDisplay.argtypes=[ctypes.c_char_p];d=x.XOpenDisplay(None);x.XKeysymToKeycode.argtypes=[ctypes.c_void_p,ctypes.c_ulong];x.XKeysymToKeycode.restype=ctypes.c_uint;t.XTestFakeKeyEvent.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_int,ctypes.c_ulong];x.XFlush.argtypes=[ctypes.c_void_p]\nctrl=x.XKeysymToKeycode(d,0xffe3);plus=x.XKeysymToKeycode(d,0x003d)\nfor _ in range(5):\n t.XTestFakeKeyEvent(d,ctrl,1,0);t.XTestFakeKeyEvent(d,plus,1,0);t.XTestFakeKeyEvent(d,plus,0,0);t.XTestFakeKeyEvent(d,ctrl,0,0);x.XFlush(d);time.sleep(.2)\n`;
  execFileSync('python3',['-c',nativeKeys],{env:{...process.env,DISPLAY:display}});await sleep(300);
  const afterZoom=await evaluate('({innerWidth,innerHeight,dpr:devicePixelRatio,outerWidth,outerHeight})');
  const zoomOk=note('native-browser-200pct',Math.abs(afterZoom.dpr/beforeZoom.dpr-2)<0.05,{before:beforeZoom,after:afterZoom},'native Chrome zoom doubles devicePixelRatio and halves CSS viewport');
  await screenshot('native-200pct',['BOT-CHAT:long']);
  const longOk=cases.filter(c=>c.states.includes('BOT-CHAT:long')).every(c=>c.checks.no_overflow);
  for(const c of cases){c.checks.long_text=longOk;c.checks.zoom=zoomOk;c.checks.reduced_motion=reducedOk;}
  // Preserve failed checks honestly. The positive-only schema intentionally must
  // not validate a package with unresolved focus contract failures.
  if(findings.some(f=>f.id==='bot-initial-focus'))cases.find(c=>c.id==='agent-creating').checks.focus=false;
  if(findings.some(f=>f.id==='touch-navigation-44px'))cases.find(c=>c.id==='touch-navigation').checks.states=false;

  const after=Object.fromEntries(await Promise.all(guarded.map(async p=>[p,hash(await readFile(resolve(packageRoot,p)))])));
  note('approved-bytes-unchanged',JSON.stringify(before)===JSON.stringify(after),{before,after},'all approved source/design/binding bytes unchanged');
  const {prototypeDigest}=await import(pathToFileURL(resolve(projectRoot,'.agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs')).href);
  const actualDigest=await prototypeDigest(resolve(packageRoot,'design-system.md'));
  const browser={schema_version:1,artifact:'prototype-browser-evidence',prototype_digest:actualDigest,generated_at:new Date().toISOString(),provider:`${version.product}; Linux Xvfb; Chrome CDP / Node ${process.version}; native browser zoom through XTest`,inspected_files:['final/index.html','comparison/variants/candidate-a.html'],cases,console_errors:errors,offline:requests.every(r=>r.url.startsWith(`http://127.0.0.1:${server.address().port}/`)||r.url.startsWith('data:')),design_review:'evidence/repair-1/design-review.md',technical_review:'evidence/repair-1/technical-review.md',rechecked:findings.length===0};
  await writeFile(resolve(evidenceRoot,'browser.json'),JSON.stringify(browser,null,2)+'\n');
  await writeFile(resolve(evidenceRoot,'observations.json'),JSON.stringify({version,observations,findings,requests,errors,sourceHashes:{before,after},limitations:['No physical touchscreen','No system IME exercised; composing event test only','No Obsidian multi-window lifecycle or production backend test','Formal package state and bindings are lead-owned and unmodified']},null,2)+'\n');
  await writeFile(resolve(evidenceRoot,'chrome.log'),chromeLog);
  console.log(JSON.stringify({cases:cases.length,findings:findings.length,errors:errors.length,sourceUnchanged:JSON.stringify(before)===JSON.stringify(after)}));
} catch(error){
  log('fatal',{message:error.stack});
  await writeFile(resolve(evidenceRoot,'interrupted-observations.json'),JSON.stringify({observations,findings,errors,cases,fatal:error.stack},null,2)+'\n');
  console.error(error.stack);process.exitCode=1;
} finally {
  if(socket){try{await command('Browser.close');}catch{}socket.close();}
  chrome?.kill('SIGTERM');xvfb?.kill('SIGTERM');server?.close();
  await sleep(250);await rm(runtimeRoot,{recursive:true,force:true});
}
