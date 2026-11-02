import {ComponentGallery} from '@repo/src/ui/react/gallery';
(window as any).adapterGraph=ComponentGallery; // Preserve production adapter entry coverage, not rendered.
import {createRoot} from 'react-dom/client';
import {TasksWidget} from '@repo/src/modules/home/ui/tasks/TasksWidget';
import {homeServices} from '@repo/src/modules/home/services/instances';
import {mountTasks,editTask} from '@repo/src/modules/task/ui/runtime';
import {createTaskService} from '@repo/src/modules/task/services/service';
import {createTaskRepository} from '@repo/src/modules/task/platform/repository';
import {emptyTaskState} from '@repo/src/modules/task/core/model';
import {setLanguage} from '@repo/src/shared/i18n';
import {registerMessages} from '@repo/src/shared/i18n/runtime';
import {messages as taskMessages} from '@repo/src/modules/task/i18n';
import {messages as uiMessages} from '@repo/src/shared/i18n/lazy/ui';
registerMessages(taskMessages);registerMessages(uiMessages);setLanguage('en');
Object.defineProperty(document.body,'createDiv',{value:(options:any)=>{const e=document.createElement('div');e.className=options?.cls??'';document.body.append(e);return e;}});
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));
async function until(check:()=>unknown){const end=performance.now()+10000;while(!check()){if(performance.now()>end)throw Error('fixture observation budget exceeded');await frame();}}
function button(root:ParentNode,label:string){const node=[...root.querySelectorAll('button')].find(x=>x.textContent?.trim()===label);if(!node)throw Error('fixture missing button '+label);return node;}
const assert=(condition:unknown,label:string)=>{if(!condition)throw Error('contract: '+label);};
const open=indexedDB.open('task-diagnostic',1);open.onupgradeneeded=()=>open.result.createObjectStore('bytes');
const db=await new Promise<IDBDatabase>((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
const read=()=>new Promise<string|null>((resolve,reject)=>{const request=db.transaction('bytes').objectStore('bytes').get('tasks');request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);});
const write=(raw:string)=>new Promise<void>((resolve,reject)=>{const tx=db.transaction('bytes','readwrite');tx.objectStore('bytes').put(raw,'tasks');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
const main=document.createElement('main');document.body.append(main);
(window as any).taskProbe={async run(mode:string,count:number){
 const now=Date.parse('2026-10-31T10:00:00Z'),state=emptyTaskState();for(let i=0;i<count;i++)state.tasks['seed-'+i]={id:'seed-'+i,revision:1,status:'open',title:'Seed '+i,description:'',timezone:'UTC',due:{date:'2026-11-01'},relations:[],createdAt:now,updatedAt:now,deviceId:'fixture'};await write(JSON.stringify(state));
 const stages:any[]=[];let fail=false,trace=false,closed=0;const controller=new AbortController();
 const tasks=createTaskService({deviceId:'fixture',now:()=>now,repository:createTaskRepository({read,process:async change=>{const next=change(await read());if(trace)record('transform');if(fail){record('storage-failure');throw Error('fixture write failure');}await write(next);if(trace)record('storage-commit');return next;}})});await tasks.load();
 let filter: 'open'|'all'|'completed'=mode==='home'?'open':'all';const view=()=>{const domain=main.querySelector('[data-task-domain]');return {revision:tasks.snapshot().revision,counts:tasks.query({filter}).counts,items:tasks.query({filter,limit:mode==='home'?20:50}).items.map(x=>x.title),rows:[...main.querySelectorAll('li')].map(x=>x.querySelector('button[data-slot=button]')?.textContent?.trim()),header:domain?.querySelector('header')?.textContent,filters:domain?.querySelector('[role=group]')?.textContent,dialog:!!document.querySelector('[role=dialog]')};};
 function record(event:string){stages.push({event,ms:performance.now(),...view()});}
 const resources:any={search:async()=>[],resolve:async(resource:any)=>({resource,status:'available',label:'Fixture'}),open:async()=>{}};
 const views:any={open:async()=>{},mount:(host:HTMLElement,options:any)=>mountTasks(host,tasks,resources,views,options?.compact),edit:(request:any)=>editTask({...request,draft:request.id?undefined:{title:'New diagnostic task',timezone:'UTC',due:{date:'2026-10-31'}},onSaved:()=>record('save-success')},tasks,resources,controller.signal).then(()=>{closed++;record('editor-close');})};
 (window as any).probeCurrent={stages,read:()=>({view:view(),html:document.body.innerText,inputs:[...document.querySelectorAll('input')].map(x=>({value:x.value,type:x.type}))})};
 const unsubscribe=tasks.subscribe(()=>{if(trace)record('publish');});let dispose:()=>void;
 if(mode==='home'){homeServices.taskViews=views;const root=createRoot(main);root.render(<TasksWidget store={{} as any}/>);dispose=()=>root.unmount();}else dispose=mountTasks(main,tasks,resources,views);
 try{await until(()=>main.querySelector('[data-task-domain]'));if(mode==='page'){button(main,'All '+count).click();await frame();}await frame();record('initial');trace=true;
 const check=async(label:string)=>{await frame();record(label);const current=view();assert(JSON.stringify(current.rows)===JSON.stringify(current.items),label+' rows equal domain page');assert(new Set(current.rows).size===current.rows.length,label+' no duplicate rows');assert(mode==='home'?current.header?.includes((filter==='completed'?'Completed ':'Incomplete ')+current.counts[filter]):current.filters?.includes('All '+current.counts.all),label+' counts equal domain');};
 button(main,'New task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));record('save-click');button(document.querySelector('[role=dialog]')!,'Save').click();await until(()=>closed===1);await check('create-next-frame');
 const created=tasks.query({filter:'all'}).items.find(x=>x.title==='New diagnostic task')!;assert(!!created,'new task committed');
 button(main,'New diagnostic task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));const input=document.querySelector('[role=dialog] input') as HTMLInputElement;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Edited diagnostic task');input.dispatchEvent(new Event('input',{bubbles:true}));await frame();button(document.querySelector('[role=dialog]')!,'Save').click();await until(()=>closed===2);await check('edit-next-frame');
 button(main,'New task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));fail=true;button(document.querySelector('[role=dialog]')!,'Save').click();await until(()=>document.querySelector('[role=dialog] [role=alert]'));record('failed-save-visible');assert((document.querySelector('[role=dialog] input') as HTMLInputElement).value==='New diagnostic task','failed save retains input');assert(closed===2,'failed save does not close');fail=false;button(document.querySelector('[role=dialog]')!,'Close').click();await until(()=>closed===3);button(main,'Retry loading').click();await until(()=>tasks.snapshot().status==='ready');await frame();
 const toggle=main.querySelector('[aria-label="Complete: Edited diagnostic task"]') as HTMLElement;assert(!!toggle,'complete UI exists');toggle.click();await until(()=>tasks.query({filter:'completed'}).counts.completed===1);await check('complete-next-frame');
 if(mode==='home'){const trigger=main.querySelector('[role=combobox]')!;trigger.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));await until(()=>document.querySelector('[role=option]'));const option=[...document.querySelectorAll('[role=option]')].find(x=>x.textContent?.includes('Completed 1')) as HTMLElement;assert(!!option,'completed option exists');option.click();}else button(main,'Completed 1').click();filter='completed';await check('completed-filter-next-frame');
 button(main,'Edited diagnostic task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));button(document.querySelector('[role=dialog]')!,'Cancel task').click();await frame();button(document.querySelector('[role=dialog]')!,'Confirm cancellation').click();await until(()=>closed===4);await check('cancel-next-frame');assert(tasks.query({filter:'all',includeCancelled:true}).items.some(x=>x.id===created.id&&x.status==='cancelled'),'cancel keeps audit task');

 return {mode,count,stages,status:'no-red',storage:'real IndexedDB transactions; production TaskRepository/TaskService',bytes:(await read())!.length};
 }catch(error){(window as any).probeFailure={stages,view:view(),text:document.body.innerText};throw error;}finally{controller.abort();unsubscribe();dispose();await tasks.dispose();delete homeServices.taskViews;main.replaceChildren();}
}};
