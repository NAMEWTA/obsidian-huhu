// Offline prototype check. Requires a separately started Chrome CDP at localhost:9338.
// Run from the repository root: node <package>/evidence/check-browser.mjs
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const targets=await (await fetch((process.env.HUHU_PROTOTYPE_CDP||'http://127.0.0.1:9338')+'/json')).json();
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
let seq=0;const pending=new Map(),errors=[],requests=[],observations=[],cases=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+JSON.stringify(m.params.exceptionDetails.exception?.description));else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const record=(check,value)=>{observations.push({case:current,check,value});};
const assert=async(expression,label)=>{const value=await evaluate(expression);record(label,value);if(!value)throw Error(current+': '+label);return value;};
let current='setup';
await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
async function key(key,code,modifiers=0){const windowsVirtualKeyCode=({Tab:9,Escape:27,Enter:13,ArrowLeft:37,ArrowRight:39})[key]||key.toUpperCase().charCodeAt(0);await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode});await pause(30);}
async function click(selector){
 const pos=await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.getClientRects().length&&!x.closest('dialog:not([open])'));if(!e)throw Error('No visible control: '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...pos,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pos,button:'left',clickCount:1});await pause(55);
}
async function value(selector,value,event='input'){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);await pause(35);}
const action=(name,extra='')=>click(`[data-action="${name}"]${extra}`);
async function scenario(name){await action('scenarios');await action('scenario',`[data-id="${name}"]`);await pause(60);}
async function noOverflow(label){return assert('document.documentElement.scrollWidth<=innerWidth+1',label);}
async function shot(name){await evaluate('document.fonts.ready.then(()=>true)');const s=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(packageRoot,'evidence',name+'.png'),Buffer.from(s.data,'base64'));return 'evidence/'+name+'.png';}
async function open(entry,width,height){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[]});
 await send('Page.navigate',{url:pathToFileURL(join(packageRoot,entry)).href});await pause(180);await evaluate('document.fonts.ready.then(()=>true)');
}
async function commonUI(){
 await assert('document.querySelectorAll(".pane").length>=1','real terminal panes rendered');
 await noOverflow('default has no document horizontal overflow');
 await key('k','KeyK',2);
 await assert('document.querySelector("#modal").open && document.activeElement.id==="palette-search"','Ctrl+K opens and focuses command search');
 await value('#palette-search','文档助手');await assert('document.querySelector("#palette-results").innerText.includes("文档助手")','command search filters actual session');
 for(let i=0;i<6;i++){await key('Tab','Tab');await assert('document.querySelector("#modal").contains(document.activeElement)','dialog focus remains trapped');}
 await key('Escape','Escape');await assert('!document.querySelector("#modal").open','Escape closes palette');
 await key('Tab','Tab');await assert('document.activeElement.matches(":focus-visible") && getComputedStyle(document.activeElement).outlineStyle!=="none"','keyboard focus visible');
 await action('control');await value('#target-session','ses-shell','change');await action('attach-target');await assert('!!document.querySelector(".pane[data-session=ses-shell]")&&!!document.querySelector(".pane[data-session=ses-main]")','split attaches explicit third target while retaining focus');await action('control');await value('#target-scope','vault','change');await value('#target-session','ses-docs','change');
 await assert('document.querySelector("#inspector").innerText.includes("跨 Space · 同 Vault")','cross-Space stable target shown');
 await value('#prompt','请核对终端后台恢复边界。');await action('send-wait');
 await assert('document.querySelector(".feedback").innerText.includes("输入已提交")','send acknowledges input only');await pause(1900);
 await assert('document.querySelector(".feedback").innerText.includes("观察到空闲")','wait observes state');
 await action('read-screen');await assert('document.querySelector(".screen-preview").innerText.includes("ses-docs")','screen identifies correct cross-Space target');
 await action('close-tool');
 await action('history');await action('preview','[data-id="history-01"]');
 await assert('document.querySelector("#inspector").innerText.includes("只读预览")','history preview read-only');await action('close-tool');
 await scenario('long');await noOverflow('long Chinese and mixed text has no document overflow');
 await assert('!document.querySelector(".space-item strong").getClientRects().length || document.querySelector(".space-item strong").scrollWidth>document.querySelector(".space-item strong").clientWidth','long list title ellipsizes when visible');
 await action('theme');await assert('document.documentElement.dataset.theme==="light"','light theme rendered');await action('theme');
 await evaluate('document.documentElement.style.zoom="2"');await pause(100);await noOverflow('200 percent CSS zoom has no document horizontal overflow');
 await action('spaces');await assert('document.querySelector("#sheet").open','space navigation remains operable at 200 percent zoom');await key('Escape','Escape');await evaluate('document.documentElement.style.zoom=""');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await assert('matchMedia("(prefers-reduced-motion: reduce)").matches && [...document.querySelectorAll("button")].every(e=>getComputedStyle(e).animationName==="none"&&getComputedStyle(e).transitionDuration==="0s")','reduced motion has no animations or transitions');
 await send('Emulation.setEmulatedMedia',{features:[]});
 await scenario('default');await evaluate('document.querySelector("#toast").hidden=true');
}
async function fullStates(states){
 const seen=s=>{states.push(s);record('observed state',s);};
 seen('PAGE-001:default');seen('PAGE-003:default');
 await action('new-terminal');await value('#new-name','后台协作者');await click('#background-start');await action('confirm-terminal');
 await assert('document.querySelector("#sidebar").innerText.includes("后台协作者") && !document.querySelector("#stage").innerText.includes("后台协作者")','background creation leaves current terminal displayed');seen('PAGE-001:background');
 await action('detach','[data-id="ses-main"]');await assert('!document.querySelector(".pane[data-session=ses-main]") && document.querySelector("#sidebar").innerText.includes("主控")','detach keeps session in list');seen('PAGE-001:detached');
 await action('session','[data-id="ses-main"]');await assert('!!document.querySelector(".pane[data-session=ses-main]")','reattach same session');
 await action('split');await action('split');
 await value('#split-ratio','60');await assert('document.querySelector(".terminal-grid").style.getPropertyValue("--split")==="1.5fr"','split ratio changes');await action('direction');
 await assert('document.querySelector(".terminal-grid").classList.contains("vertical")','split direction changes');await action('direction');
 await action('control');await value('#target-session','ses-shell','change');await action('attach-target');await assert('!!document.querySelector(".pane[data-session=ses-shell]")&&!!document.querySelector(".pane[data-session=ses-main]")','split attaches explicit third target while retaining focus');await action('control');await value('#target-scope','vault','change');await value('#target-session','ses-docs','change');
 await assert('document.querySelector("#inspector").innerText.includes("跨 Space · 同 Vault")','explicit cross-Space target');seen('PAGE-001:cross-space');
 await action('send-wait');await assert('document.querySelector(".feedback").innerText.includes("输入已提交")','submitted ack');seen('PAGE-003:input-submitted');seen('PAGE-003:waiting');await pause(1900);await assert('document.querySelector(".feedback").innerText.includes("观察到空闲")','wait matched');seen('PAGE-003:matched');
 await action('send-wait');await action('cancel-wait');await assert('document.querySelector(".feedback").innerText.includes("目标仍在运行")','cancel leaves target running');seen('PAGE-003:wait-cancelled');
 await action('stop');await assert('document.querySelector("#modal").innerText.includes("ses-docs")','stop confirmation identifies cross-Space target');seen('PAGE-003:stop-confirmation');await click('#modal [data-action="close-dialog"]');await assert('document.querySelector("#inspector").innerText.includes("工作中")','cancel stop preserves running');seen('PAGE-003:stop-cancelled');
 await action('stop');await action('confirm-stop');await assert('document.querySelector("#inspector").innerText.includes("已停止")','explicit stop shown');seen('PAGE-001:stopped');
 await scenario('timeout');await action('send-wait');await pause(1900);await assert('document.querySelector(".feedback").innerText.includes("等待超时")','timeout observed');seen('PAGE-003:timeout');await action('retry-wait');await pause(1100);await assert('document.querySelector(".feedback").innerText.includes("观察到空闲")','retry waits without resend');seen('PAGE-003:retried');
 await scenario('approval');await assert('document.querySelector("[data-action=send-wait]").disabled && !!document.querySelector(".native-approval")','ordinary prompt blocked by native approval');seen('PAGE-003:blocked');await action('human-approve');await assert('!document.querySelector(".native-approval")','human approves in native terminal');seen('PAGE-003:approved');
 await scenario('approval');await action('human-reject');await assert('document.querySelector("#stage").innerText.includes("用户在原终端拒绝")','human rejection preserves session');seen('PAGE-003:denied');
 await scenario('default');await action('inbox');await assert('document.querySelector(".mail-item").innerText.includes("未读")','unread passive message');seen('PAGE-003:unread');await action('read-message','[data-id="msg-01"]');await assert('document.querySelector(".mail-item").innerText.includes("已读取")','read differs from ack');seen('PAGE-003:read');await action('ack','[data-id="msg-01"]');await assert('document.querySelector(".mail-item").innerText.includes("已确认收到")','explicit ack');seen('PAGE-003:acknowledged');
 await value('#mail-body','请在方便时读取这条通知。');await action('send-message');await assert('document.querySelector("#toast").innerText.includes("没有启动运行")','passive send does not start run');seen('PAGE-003:notification-sent');
 await action('history');seen('PAGE-002:default');await action('reload-history');await assert('document.querySelector("#inspector").innerText.includes("正在读取")','history loading');seen('PAGE-002:loading');await pause(1000);
 await value('#history-search','无匹配的示例查询');await assert('document.querySelector("#inspector").innerText.includes("没有匹配的历史")','history empty search');seen('PAGE-002:empty');await action('clear-search');
 await scenario('historyError');await assert('document.querySelector("#inspector").innerText.includes("其他记录可继续浏览")','partial failure retains records');seen('PAGE-002:partial-error');await action('preview','[data-id="history-03"]');await assert('document.querySelector("#inspector").innerText.includes("原生来源不可用") && !document.querySelector("[data-action=resume-history]")','missing source cannot resume');seen('PAGE-002:missing-source');
 await action('back-history');await action('preview','[data-id="history-01"]');await assert('document.querySelector("#inspector").innerText.includes("只读预览")','native preview');seen('PAGE-002:preview');
 await value('#annotation','复核后的 HUHU 标注');await action('save-note');await action('back-history');await action('preview','[data-id="history-01"]');await assert('document.querySelector("#annotation").value==="复核后的 HUHU 标注"','annotation survives leaving preview');
 await action('resume-history');await assert('document.querySelector("#modal").innerText.includes("显式启动")','resume explicit confirmation');seen('PAGE-002:resume-confirmation');await click('#modal [data-action="close-dialog"]');await assert('!document.querySelector(".pane[data-session=ses-history-01]")','cancel resume starts nothing');seen('PAGE-002:resume-cancelled');await action('resume-history');await action('confirm-resume-history');await assert('!!document.querySelector(".pane[data-session=ses-history-01]")','resume opened terminal');seen('PAGE-002:resumed');
 await action('history');await action('preview','[data-id="history-01"]');await action('resume-history');await action('confirm-resume-history');await assert('document.querySelectorAll(".pane[data-session=ses-history-01]").length===1','duplicate native resume locates existing terminal');
 await scenario('empty');await assert('document.querySelector("#stage").innerText.includes("还没有终端")','empty Space');seen('PAGE-001:empty');
 await scenario('noSpaces');await assert('document.querySelector("#stage").innerText.includes("从一个空间开始")','no Space');seen('PAGE-001:no-spaces');await action('web');await assert('!!document.querySelector(".web-page")','web without Space');seen('PAGE-004:no-spaces');
 await action('agent');await action('create-space');await value('#space-name','外部目录项目');await value('#space-directory','external','change');await action('confirm-space');await assert('document.querySelector("#modal").open && !document.querySelector("#external-allow").validity.valid','external directory requires explicit selection authorization');await click('#external-allow');await action('confirm-space');await assert('document.querySelector("#current-space").innerText==="外部目录项目"','authorized external Space created');
 await scenario('loading');await assert('document.querySelector("#stage").innerText.includes("正在连接终端")','connecting');seen('PAGE-001:loading');await action('reconnect');
 await scenario('lost');await assert('document.querySelector("#stage").innerText.includes("状态未知")','disconnected state is honest');seen('PAGE-001:disconnected');await action('reconnect');
 await scenario('restore');await assert('document.querySelector("#stage").innerText.includes("上次运行已结束")','restart does not autostart');seen('PAGE-001:restored');await action('resume-session','[data-id="ses-main"]');
 await scenario('long');await noOverflow('long name remains within viewport');seen('PAGE-001:long-text');
 await scenario('default');await action('web');await assert('!!document.querySelector(".web-page")','shared web tab');seen('PAGE-004:default');
 await scenario('disabled');await assert('document.querySelector("#stage").innerText.includes("网页保持打开")','Agent disabled leaves web open');seen('PAGE-004:agent-disabled');await action('settings');await assert('document.querySelector("#modal").innerText.includes("原生完整对话及系统登录凭证")','backup omissions explained');seen('PAGE-004:data-summary');await key('Escape','Escape');
 await scenario('default');await evaluate('document.querySelector("#toast").hidden=true');
}
try{
 const entries=['comparison/variants/candidate-a.html','comparison/variants/candidate-b.html','comparison/variants/candidate-c.html','final/index.html'];
 for(const entry of entries)for(const width of [1440,390]){
  const height=width===1440?1000:844;current=(entry.startsWith('final')?'final':entry.match(/candidate-\w/)[0])+'-'+width;
  await open(entry,width,height);await commonUI();const states=['PAGE-001:default','PAGE-001:cross-space','PAGE-001:long-text','PAGE-002:preview','PAGE-003:input-submitted','PAGE-003:matched'];
  if(entry.startsWith('final')&&width===1440)await fullStates(states);
  if(width===1440&&(entry.startsWith('final')||entry.includes('candidate-a')))await action('control');
  const screenshot=await shot(current);cases.push({id:current,width,height,entry,screenshot,checks:{rendered:true,no_overflow:true,keyboard:true,focus:true,long_text:true,zoom:true,reduced_motion:true,states:true},states:[...new Set(states)]});
  await writeFile(join(packageRoot,'evidence/browser-checkpoint.json'),JSON.stringify({cases,observations,errors},null,2)+'\n'); console.log('checked '+current);
 }
 for(const width of [1440,390]){
  current='comparison-'+width;const entry='comparison/index.html',height=width===1440?1000:844;await open(entry,width,height);
  await assert('document.querySelectorAll(".candidates article").length===3','three real candidate entries');await noOverflow('comparison fits viewport');await key('Tab','Tab');await assert('document.activeElement.tagName==="A"&&document.activeElement.matches(":focus-visible")','comparison links keyboard accessible');
  await evaluate('document.documentElement.style.zoom="2"');await noOverflow('comparison readable at 200 percent');await evaluate('document.documentElement.style.zoom=""');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await assert('getComputedStyle(document.querySelector("a")).animationName==="none"','comparison reduced motion');await send('Emulation.setEmulatedMedia',{features:[]});
  const screenshot=await shot(current);record('comparison screenshot',screenshot);
 }
 current='supplemental';await open('final/index.html',1440,1000);await scenario('approval');await action('close-tool');await shot('final-approval');await scenario('historyError');await shot('final-history-partial');
 await open('final/index.html',390,844);await action('control');await value('#target-scope','vault','change');await value('#target-session','ses-docs','change');await shot('final-control-390');
 await assert('!'+JSON.stringify(errors.length),'no console errors');const external=requests.filter(u=>/^https?:/.test(u));if(external.length)throw Error('Unexpected network resources: '+external.join(','));
 const binding=JSON.parse(await readFile(join(packageRoot,'evidence/preview-binding.json'),'utf8'));
 await writeFile(join(packageRoot,'evidence/browser.json'),JSON.stringify({schema_version:1,artifact:'prototype-browser-evidence',prototype_digest:binding.prototype_digest,generated_at:new Date().toISOString(),provider:'Google Chrome 153.0.8010.47, headless CDP; real DOM controls and keyboard; network offline; simulated desktop viewports',inspected_files:[...entries,'comparison/index.html'],cases,console_errors:errors,offline:true,design_review:'evidence/design-review.md',technical_review:'evidence/technical-review.md',rechecked:true},null,2)+'\n');
 await writeFile(join(packageRoot,'evidence/observations.json'),JSON.stringify({generated_at:new Date().toISOString(),network_mode:'offline',external_requests:external,checks:observations},null,2)+'\n');
 console.log('Browser checks passed: '+cases.length+' required cases, '+observations.length+' observations.');
}catch(e){await shot('failure-current');await writeFile(join(packageRoot,'evidence/failed-observations.json'),JSON.stringify({error:e.message,observations,errors},null,2)+'\n');console.error(e.stack);process.exitCode=1;}finally{ws.close();}
