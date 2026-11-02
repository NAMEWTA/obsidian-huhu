// Reuses T19's real TaskService/Repository/IndexedDB/component composition.
import { ComponentGallery } from '../../src/ui/react/gallery';
import { mountTasks, editTask } from '../../src/modules/task/ui/runtime';
import { createTaskService } from '../../src/modules/task/services/service';
import { createTaskRepository } from '../../src/modules/task/platform/repository';
import { registerMessages, setLanguage } from '../../src/shared/i18n';
import { messages as taskMessages } from '../../src/modules/task/i18n';
import { messages as uiMessages } from '../../src/shared/i18n/lazy/ui';
(window as any).adapterGraph=ComponentGallery; // Adapter graph coverage only; never rendered.
registerMessages(taskMessages);registerMessages(uiMessages);setLanguage('en');
Object.defineProperty(document.body,'createDiv',{value:(options:any)=>{const element=document.createElement('div');element.className=options?.cls??'';document.body.append(element);return element;}});
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function until(check:()=>unknown){const end=performance.now()+15000;while(!check()){if(performance.now()>end)throw Error('Projection deadline');await frame();}}
function button(root:ParentNode,label:string){const found=[...root.querySelectorAll('button')].find(node=>node.textContent?.trim()===label);if(!found)throw Error(`Missing control: ${label}`);return found;}
function input(node:HTMLInputElement,value:string){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}
const opening=indexedDB.open('huhu-perf-fiction',1);opening.onupgradeneeded=()=>opening.result.createObjectStore('bytes');
const db=await new Promise<IDBDatabase>((resolve,reject)=>{opening.onsuccess=()=>resolve(opening.result);opening.onerror=()=>reject(opening.error);});
const read=()=>new Promise<string|null>((resolve,reject)=>{const request=db.transaction('bytes').objectStore('bytes').get('tasks');request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);});
const write=(raw:string)=>new Promise<void>((resolve,reject)=>{const tx=db.transaction('bytes','readwrite');tx.objectStore('bytes').put(raw,'tasks');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
const main=document.createElement('main');main.style.cssText='height:460px;overflow:auto';document.body.append(main);
(window as any).perfProbe={partial:[],async sample(data:any,fault?:string){
 const rows:any[]=[],longtasks:any[]=[];(window as any).perfProbe.partial=rows;
 const supportsLong=PerformanceObserver.supportedEntryTypes.includes('longtask');
 const observer=supportsLong?new PerformanceObserver(list=>longtasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration})))):undefined;
 observer?.observe({type:'longtask',buffered:false});
 await write(JSON.stringify(data.tasks));
 const tasks=createTaskService({deviceId:'fixture',now:()=>data.now+1000,repository:createTaskRepository({read,process:async change=>{const next=change(await read());await write(next);return next;}})});
 await tasks.load();
 const abort=new AbortController(),resources:any={search:async()=>[],resolve:async(resource:any)=>({resource,status:'available',label:'Fixture'}),open:async()=>{}};
 let closed=0;
 const views:any={open:async()=>{},mount:()=>()=>{},edit:(request:any)=>editTask({...request,draft:request.id?undefined:{title:'Perf created task',timezone:'UTC'}},tasks,resources,abort.signal).then(()=>{closed++;})};
 let dispose=()=>{};
 const measure=async(scenario:string,kind:string,startMarker:string,endMarker:string,fn:()=>Promise<void>)=>{const start=performance.now();await fn();const end=performance.now();rows.push({scenario,measurement_kind:kind,start_marker:startMarker,end_marker:endMarker,start,end,value:end-start,unit:'ms',status:'ok'});};
 const titles=()=>[...main.querySelectorAll('li')].map(x=>x.querySelector('button[data-slot=button]')?.textContent?.trim());
 const expected=(text='')=>tasks.query({filter:'all',text,limit:50}).items.map(x=>x.title);
 try{
  await measure('page.tasks','fixture_interactive','mountTasks call','enabled control and matching domain projection; next rAF',async()=>{dispose=mountTasks(main,tasks,resources,views);await until(()=>main.querySelector('input[aria-label="Search tasks"]')&&!(main.querySelector('input[aria-label="Search tasks"]') as HTMLInputElement).disabled&&JSON.stringify(titles())===JSON.stringify(expected()));await frame();});
  const search=main.querySelector('input[aria-label="Search tasks"]') as HTMLInputElement,needle=`Task ${String(data.count-1).padStart(5,'0')}`;
  await measure('input.tasks','input_to_frame','input event dispatch','expected filtered projection; next rAF',async()=>{input(search,needle);if(fault==='input')await new Promise(()=>{});await until(()=>JSON.stringify(titles())===JSON.stringify(expected(needle))&&titles().length===1);await frame();});
  input(search,'');await until(()=>JSON.stringify(titles())===JSON.stringify(expected()));
  button(main,'New task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));
  await measure('submit.task','task_projection','actual Save button click','commit + dialog closed + matching page; next rAF',async()=>{button(document.querySelector('[role=dialog]')!,'Save').click();await until(()=>closed===1&&tasks.query({filter:'all',text:'Perf created task'}).total===1&&JSON.stringify(titles())===JSON.stringify(expected()));await frame();});
  await measure('scroll.tasks','scroll_to_frame','scrollTop change + scroll event','scroll position verified; next rAF',async()=>{main.scrollTop=100;main.dispatchEvent(new Event('scroll'));await frame();if(main.scrollTop!==100)throw Error('Scroll did not occur');});
  await frame();longtasks.push(...(observer?.takeRecords()??[]).map(x=>({start:x.startTime,duration:x.duration})));
  const memory=(performance as any).memory;
  return {rows,heap:memory?{status:'available',value:memory.usedJSHeapSize,unit:'bytes',scope:'Chromium usedJSHeapSize, no forced GC'}:{status:'unavailable',reason:'performance.memory unsupported'},longtasks:supportsLong?{status:'available',entries:longtasks,unit:'ms'}:{status:'unavailable',reason:'PerformanceObserver longtask unsupported'},projection:{count:tasks.query({filter:'all'}).total,rows:titles().length}};
 }finally{observer?.disconnect();abort.abort();dispose();await tasks.dispose();main.replaceChildren();}
}};
