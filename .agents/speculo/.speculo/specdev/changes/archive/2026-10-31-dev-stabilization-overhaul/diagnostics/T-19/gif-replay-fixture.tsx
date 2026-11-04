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
 const now=Date.parse('2026-10-30T15:35:00Z'),state=emptyTaskState();
 const seeds=[['Renew domain name','2026-10-29'],['Review pull request #42','2026-10-28'],['Draft landing page copy','2026-10-31'],['Plan November budget','2026-11-01'],['Record product screenshots','2026-11-03'],['Unscheduled fictitious task',null],['Send weekly update','2026-10-27']] as const;
 for(let i=0;i<seeds.length;i++){const [title,date]=seeds[i]!;state.tasks['seed-'+i]={id:'seed-'+i,revision:1,status:i===6?'completed':'open',title,description:'',timezone:'Asia/Singapore',...(date?{due:{date}}:{}),...(i===6?{completedAt:now-60000}:{}),relations:[],createdAt:now-60000,updatedAt:now-60000,deviceId:'fixture'};}
 await write(JSON.stringify(state));
 const stages:any[]=[];let fail=false,trace=false,closed=0;const controller=new AbortController();
 const tasks=createTaskService({deviceId:'fixture',now:()=>now,repository:createTaskRepository({read,process:async change=>{const next=change(await read());if(trace)record('transform');if(fail){record('storage-failure');throw Error('fixture write failure');}await write(next);if(trace)record('storage-commit');return next;}})});await tasks.load();
 let filter: 'open'|'all'|'completed'='open';const view=()=>{const domain=main.querySelector('[data-task-domain]');return {revision:tasks.snapshot().revision,counts:tasks.query({filter}).counts,items:tasks.query({filter,limit:mode==='home'?20:50}).items.map(x=>x.title),rows:[...main.querySelectorAll('li')].map(x=>x.querySelector('button[data-slot=button]')?.textContent?.trim()),header:domain?.querySelector('header')?.textContent,filters:domain?.querySelector('[role=group]')?.textContent,dialog:!!document.querySelector('[role=dialog]')};};
 function record(event:string){stages.push({event,ms:performance.now(),...view()});}
 const resources:any={search:async()=>[],resolve:async(resource:any)=>({resource,status:'available',label:'Fixture'}),open:async()=>{}};
 const views:any={open:async()=>{},mount:(host:HTMLElement,options:any)=>mountTasks(host,tasks,resources,views,options?.compact),edit:(request:any)=>editTask({...request,draft:request.id?undefined:{title:'Write the README',timezone:'Asia/Singapore',due:{date:'2026-11-02'}},onSaved:()=>record('save-success')},tasks,resources,controller.signal).then(()=>{closed++;record('editor-close');})};
 (window as any).probeCurrent={stages,read:()=>({view:view(),html:document.body.innerText,inputs:[...document.querySelectorAll('input')].map(x=>({value:x.value,type:x.type}))})};
 const unsubscribe=tasks.subscribe(()=>{if(trace)record('publish');});let dispose:()=>void;
 if(mode==='home'){homeServices.taskViews=views;const root=createRoot(main);root.render(<TasksWidget store={{} as any}/>);dispose=()=>root.unmount();}else dispose=mountTasks(main,tasks,resources,views);
 try{await until(()=>main.querySelector('[data-task-domain]'));if(mode==='page'){button(main,'Incomplete 6').click();await frame();}await frame();record('initial');assert(tasks.query({filter}).counts.all===7&&tasks.query({filter}).counts.completed===1&&tasks.query({filter}).counts.overdue===2,'GIF counts 7/6/1/2');trace=true;
 const check=async(label:string)=>{await frame();record(label);const current=view();assert(JSON.stringify(current.rows)===JSON.stringify(current.items),label+' rows equal domain page');assert(new Set(current.rows).size===current.rows.length,label+' no duplicate rows');assert(mode==='home'?current.header?.includes((filter==='completed'?'Completed ':'Incomplete ')+current.counts[filter]):current.filters?.includes('All '+current.counts.all),label+' counts equal domain');};
 button(main,'New task').click();await until(()=>document.querySelector('[role=dialog] button[type=submit]'));record('save-click');button(document.querySelector('[role=dialog]')!,'Save').click();await until(()=>closed===1);await check('create-next-frame');
 assert(tasks.query({filter:'all'}).items.some(x=>x.title==='Write the README'),'new due task committed');
 assert(tasks.query({filter}).counts.all===8&&tasks.query({filter}).counts.open===7,'GIF resulting counts 8/7');
 return {mode,count,stages,status:'no-red',storage:'real IndexedDB transactions; production TaskRepository/TaskService',bytes:(await read())!.length};
 }catch(error){(window as any).probeFailure={stages,view:view(),text:document.body.innerText};throw error;}finally{controller.abort();unsubscribe();dispose();await tasks.dispose();delete homeServices.taskViews;main.replaceChildren();}
}};
