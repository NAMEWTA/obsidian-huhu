/** Host composition adapted from scripts/fixtures/dev-overhaul-startup/activation.test.ts.
 * Production factories/activate and query code are intact; vault and Obsidian are fixtures. */
import { performance } from 'node:perf_hooks';
import { memoryVault } from '../fixtures/memory-vault';
import { initializeDevice } from '../../src/host/obsidian/storage/device-id';
import createNotifications from '../../src/modules/notifications/module';
import createTasks from '../../src/modules/task/module';
import { TASKS } from '../../src/modules/task/api';
import { TASK_STORE_PATH, VERSIONING_RECOVERY_ROOT } from '../../src/shared/storage/vault-layout';
import { createTaskResources } from '../../src/modules/task/platform/resources';
import { filterHighlightRows } from '../../src/modules/comments/core/catalog';
import { ArchiveIndex } from '../../src/modules/archives/core/generic/index';
import { presetRevisions } from '../../src/modules/archives/core/schema/presets';
import { LocalHistoryStore } from '../../src/modules/versioning/services/local-history-store';
import type { ModuleContext, ModuleInstance } from '../../src/app/contracts/module';

export async function sampleNode(data: any) {
 const initial={...data.notes,...data.archives,[TASK_STORE_PATH]:JSON.stringify(data.tasks),[`${VERSIONING_RECOVERY_ROOT}/fixture/history/index.json`]:JSON.stringify(data.history)};
 for(const [hash,text] of Object.entries(data.objects)) initial[`${VERSIONING_RECOVERY_ROOT}/fixture/objects/${hash}.txt`]=text;
 const fixture=memoryVault(initial),app=fixture.app,cleanup:Array<()=>void>=[],instances:ModuleInstance[]=[],rows:any[]=[];
 Object.assign(app,{loadLocalStorage:()=>null,saveLocalStorage:()=>{}});
 Object.assign(app.vault,{getName:()=> 'fictional-perf',getAllLoadedFiles:()=>app.vault.getFiles()});
 Object.assign(app.workspace.containerEl,{ownerDocument:{defaultView:null}});
 await initializeDevice(app,{machineIdentity:async()=> 'fictional-perf',label:'Fixture',chooseDevice:async()=>({label:'Fixture'})});
 const context={app,env:{desktop:false,mobile:false,phone:false},services:{peek:()=>undefined,watch:()=>()=>{}},contributions:{collect:async()=>[],watch:()=>()=>{}},lifetime:{register:(fn:()=>void)=>cleanup.push(fn)},shell:{open:async()=>{}},commands:{add(){}},settings:{bind:(_name:string,schema:any)=>({get:()=>schema.defaults()})}} as unknown as ModuleContext;
 const measure=async(scenario:string,kind:string,startMarker:string,endMarker:string,operation:()=>unknown)=>{
  const start=performance.now(),result:any=await operation(),end=performance.now();
  rows.push({scenario,measurement_kind:kind,start_marker:startMarker,end_marker:endMarker,start,end,value:end-start,unit:'ms',status:'ok',observed:typeof result==='number'?result:undefined});return result;
 };
 try {
  for(const [id,factory] of [['notifications',createNotifications],['task',createTasks]] as const){
   const instance=await factory(context);instances.push(instance);
   await measure(`activate.${id}`,'fixture_activate','activate call','activate resolved',()=>instance.activate?.(new AbortController().signal));
  }
  const tasks=instances[1]!.services!.find(([key])=>key===TASKS)![1] as any;
  await measure('query.tasks','query','TaskService.query call','query returned',()=>{const p=tasks.query({filter:'all',text:'Task',limit:50});if(p.total!==data.count)throw Error('Task fixture not consumed');return p.total;});
  const resources=createTaskResources(app,()=>undefined,()=>undefined,()=>true);
  await measure('query.notes','query','TaskResources.search call','search returned',async()=>{const found=await resources.search(`Note-${String(data.count-1).padStart(5,'0')}`,'file');if(found.length!==1)throw Error('Note query did not read fixture');return found.length;});
  await measure('query.comments','query','filterHighlightRows call','filter returned',()=>{const found=filterHighlightRows(data.comments,{search:'Observation',color:'all',status:'all',showArchived:false});if(found.length!==data.count)throw Error('Comment query mismatch');return found.length;});
  const index=new ArchiveIndex('huhu/Archives',await presetRevisions());
  for(const [path,raw] of Object.entries(data.archives)) index.apply(await index.parse(path,raw as string));
  index.loading=false;
  await measure('query.archives','query','ArchiveIndex.query call','query returned',()=>{const result=index.query({search:'Person',limit:100});if(result.total!==Object.keys(data.archives).length)throw Error(`Archive fixture mismatch ${result.total}`);return result.total;});
  const history=new LocalHistoryStore(fixture.adapter,'fixture');await history.load();
  await measure('query.history','query','LocalHistoryStore.list call','list and readSnapshot returned',async()=>{const list=await history.list(`Notes/Note-${String(data.count-1).padStart(5,'0')}.md`);if(list.length!==2)throw Error('History not consumed');await history.readSnapshot(list[0]!.id);return list.length;});
  return {rows,reads:fixture.reads,heap:{status:'available',value:process.memoryUsage().heapUsed,unit:'bytes',scope:'Node used heap after queries; not retained heap'},consumers:{notes:data.count,comments:data.comments.length,archives:index.query({limit:1}).total,tasks:tasks.query({filter:'all'}).total,history:Object.keys(data.history.entries).length}};
 }finally{for(const instance of instances.reverse())await instance.dispose('unload');for(const fn of cleanup.reverse())fn();}
}
