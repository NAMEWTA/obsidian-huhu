// Read-only diagnostic: real task service/repository/query/components, controlled storage commit.
import { useState } from 'react';
import { writeFileSync } from 'node:fs';
import { act,cleanup,fireEvent,render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach,expect,test,vi } from 'vitest';
import { ContainerProviders } from '@repo/src/ui/react/providers';
import { TaskPage } from '@repo/src/modules/task/ui/TaskPage';
import { TaskEditor } from '@repo/src/modules/task/ui/TaskEditor';
import { createTaskService } from '@repo/src/modules/task/services/service';
import { createTaskRepository } from '@repo/src/modules/task/platform/repository';
import { setLanguage } from '@repo/src/shared/i18n';
afterEach(cleanup);
for(const filter of ['open','completed'] as const) test(`save/create and count share committed projection (${filter})`,async()=>{
 setLanguage('en');let raw:string|null=null;const stages:any[]=[];let release!:()=>void,start!:()=>void;const gate=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>start=r);let hold=true;
 const tasks=createTaskService({deviceId:'diagnostic',now:()=>Date.parse('2026-10-31T10:00:00Z'),repository:createTaskRepository({read:async()=>raw,process:async change=>{const next=change(raw);stages.push({event:'transaction-transform'});start();if(hold)await gate;raw=next;stages.push({event:'storage-commit'});return raw;}})});await tasks.load();
 const resources={search:async()=>[],resolve:async resource=>({resource,status:'available',label:'Fixture'}),open:async()=>{}} as any;const views={edit:async()=>{},open:async()=>{},mount:()=>()=>{}};
 const state=()=>({revision:tasks.snapshot().revision,query:tasks.query({filter}),dom:document.querySelector('[data-task-domain]')?.textContent});
 const unsubscribe=tasks.subscribe(()=>stages.push({event:'publish',...state()}));
 const close=vi.fn();function Scene(){const [open,setOpen]=useState(true);return <ContainerProviders container={document.body}><TaskPage tasks={tasks} resources={resources} views={views}/>{open&&<TaskEditor tasks={tasks} resources={resources} initial={{title:'Probe task',due:{date:'2026-11-01'},timezone:'UTC'}} signal={new AbortController().signal} onSaved={()=>stages.push({event:'save-success',...state()})} close={()=>{stages.push({event:'editor-close',...state()});close();setOpen(false)}}/>}</ContainerProviders>}
 render(<Scene/>);const user=userEvent.setup();if(filter==='completed')await user.click(screen.getByRole('button',{name:/^Completed 0$/}));
 await user.click(screen.getByRole('button',{name:'Save'}));await begun;expect(close).not.toHaveBeenCalled();expect(tasks.query().counts.all).toBe(0);
 hold=false;await act(async()=>{release();await gate;await Promise.resolve()});expect(close).toHaveBeenCalledOnce();const page=within(document.querySelector('[data-task-domain]') as HTMLElement);
 expect(page.getByRole('button',{name:/^All 1$/})).toBeTruthy();expect(page.queryByText('Probe task')!==null).toBe(filter==='open');expect(tasks.query({filter}).counts).toEqual({all:1,open:1,completed:0,overdue:0});
 const success=stages.find(x=>x.event==='save-success');expect(success.query.counts.all).toBe(1);expect(stages.findIndex(x=>x.event==='publish')).toBeLessThan(stages.findIndex(x=>x.event==='save-success'));
 for(const kind of ['complete','reopen','cancel'] as const){await act(async()=>{const item=tasks.query({filter:'all',includeCancelled:true}).items[0]!;expect((await tasks.execute({kind,id:item.id,expectedRevision:item.revision,commandId:kind})).ok).toBe(true)});const current=tasks.query({filter:'all'});const domPage=within(document.querySelector('[data-task-domain]') as HTMLElement);expect(domPage.getByRole('button',{name:new RegExp('^All '+current.counts.all+'$')})).toBeTruthy();expect(current.items.length).toBe(current.counts.all);}
 writeFileSync('.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/diagnostics/T-19/'+filter+'.json',JSON.stringify({filter,stages:stages.map(x=>({event:x.event,revision:x.revision,all:x.query?.counts.all,items:x.query?.items.map(y=>y.id),domHasTitle:x.dom?.includes('Probe task')})),result:'consistent in tested seam'},null,2)+'\n');unsubscribe();await tasks.dispose();
});

import { mountTasks, editTask } from '@repo/src/modules/task/ui/runtime';
import { waitFor } from '@testing-library/react';
test('real mounted list and independent editor roots publish before modal close',async()=>{
 setLanguage('en');let raw:string|null=null;let release!:()=>void,start!:()=>void;const gate=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>start=r),stages:any[]=[];
 const tasks=createTaskService({deviceId:'diagnostic',now:()=>Date.parse('2026-10-31T10:00:00Z'),repository:createTaskRepository({read:async()=>raw,process:async change=>{const next=change(raw);start();await gate;raw=next;stages.push({event:'storage-commit'});return raw;}})});await tasks.load();
 const resources={search:async()=>[],resolve:async resource=>({resource,status:'available',label:'Fixture'}),open:async()=>{}} as any;
 const host=document.createElement('div');document.body.append(host);const controller=new AbortController();const record=event=>stages.push({event,all:tasks.query().counts.all,domHasTitle:host.textContent?.includes('Independent root task')});
 const unsubscribe=tasks.subscribe(()=>record('publish'));let finished:Promise<void>|undefined;
 const views={open:async()=>{},mount:()=>()=>{},edit:request=>{finished=editTask({...request,draft:{title:'Independent root task',due:{date:'2026-11-01'},timezone:'UTC'},onSaved:()=>record('save-success')},tasks,resources,controller.signal).then(()=>record('dialog-closed'));return finished;}};
 let dispose!:()=>void;await act(async()=>{dispose=mountTasks(host,tasks,resources,views)});const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'New task'}));await screen.findByRole('button',{name:'Save'});await user.click(screen.getByRole('button',{name:'Save'}));await begun;expect(tasks.query().counts.all).toBe(0);await act(async()=>{release();await gate});await finished;
 await waitFor(()=>expect(within(host).getByRole('button',{name:/^All 1$/})).toBeTruthy());expect(within(host).getByText('Independent root task')).toBeTruthy();expect(stages.find(x=>x.event==='save-success')).toMatchObject({all:1,domHasTitle:true});expect(stages.find(x=>x.event==='dialog-closed')).toMatchObject({all:1,domHasTitle:true});
 writeFileSync('.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/diagnostics/T-19/independent-roots.json',JSON.stringify({stages,result:'consistent in tested runtime seam'},null,2)+'\n');unsubscribe();await act(async()=>dispose());controller.abort();host.remove();await tasks.dispose();
});
