import type { BrowserWorkspaceService } from './workspace';
import { AgentBrowserError, type BrowserCommand, type RunGrant } from '../core/contracts';
import { parseMethod, protocolTools, type BrowserMethod } from '../core/protocol';

export interface ConnectionGrant {
 spaceId:string; runId:string; capability:string; allowTaskCreation:boolean;
 created:boolean; creation?:{requestId:string;result:Promise<unknown>}; runs:Map<string,RunGrant>;
}
/** Per-connection authority. A copied descriptor cannot restore a paused or human-controlled Run. */
export class BrowserProtocolService {
 constructor(private readonly workspace:BrowserWorkspaceService){}
 private current(grant:ConnectionGrant){this.workspace.health(grant.runId,grant.capability);}
 private own(grant:ConnectionGrant,runId:string,capability:string){
  this.current(grant);const own=runId===grant.runId?grant.capability:grant.runs.get(runId)?.capability;
  if(!own||own!==capability)throw new AgentBrowserError('capability_scope_mismatch');
 }
 async call(method:BrowserMethod,params:unknown,grant:ConnectionGrant):Promise<unknown>{
  if(method==='operation.get'){
   const p=parseMethod(method,params);const own=p.runId===grant.runId?grant.capability:grant.runs.get(p.runId)?.capability;
   if(own!==p.capability)throw new AgentBrowserError('capability_scope_mismatch');
   const result=await this.workspace.operation(p.runId,p.capability,p.operationId);try{this.current(grant);}catch{if(result)delete result.result;}return result;
  }
  this.current(grant);
  switch(method){
   case 'status':parseMethod(method,params);return{protocolVersion:2,availability:this.workspace.getState().availability,spaceId:grant.spaceId,tools:protocolTools()};
   case 'space.create':{
    const p=parseMethod(method,params);if(grant.creation){if(grant.creation.requestId!==p.requestId)throw new AgentBrowserError('workspace_create_grant_required');return grant.creation.result;}if(!grant.allowTaskCreation||grant.created)throw new AgentBrowserError('workspace_create_grant_required');
    grant.created=true;
    const creation=(async()=>{const space=await this.workspace.createSpace({kind:'task',label:p.label,ephemeral:p.ephemeral,url:p.url},`connection:${grant.runId}:${p.requestId}`);
    try{this.current(grant);const run=await this.workspace.resumeAgent(space.id);this.current(grant);grant.runs.set(run.run.id,run);return{spaceId:space.id,...run};}
    catch(error){await this.workspace.stopSpace(space.id);throw error;}})();grant.creation={requestId:p.requestId,result:creation};return creation;
   }
   case 'run.start':{const p=parseMethod(method,params);const allowed=p.spaceId===grant.spaceId||[...grant.runs.values()].some(g=>g.run.spaceId===p.spaceId);if(!allowed)throw new AgentBrowserError('space_forbidden');return this.workspace.startRun(p.spaceId,p.spaceId);}
   case 'run.stop':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);await this.workspace.stopRun(p.runId,p.capability);return{stopped:true};}
   case 'run.heartbeat':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return{expiresAt:await this.workspace.heartbeat(p.runId,p.capability)};}
   case 'page.list':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.pageList(p.runId,p.capability);}
   case 'page.open':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.pageOpen(p.runId,p.capability,p.requestId,p.url);}
   case 'page.close':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.pageClose(p.runId,p.capability,p.requestId,p.pageId);}
   case 'observe':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.observe(p.runId,p.capability,p.pageId);}
   case 'operation.prepare':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.prepare(p.runId,p.capability,p.pageId,p.requestId,p.command as BrowserCommand);}
   case 'operation.execute':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.execute(p.runId,p.capability,p.operationId,p.command as BrowserCommand);}
   case 'file.list':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.fileList(p.runId,p.capability);}
   case 'download.list':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.downloadList(p.runId,p.capability);}
   case 'health':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.health(p.runId,p.capability);}
   case 'events.poll':{const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);return this.workspace.events(p.runId,p.capability,p.afterSequence);}
   case 'batch':{
    const p=parseMethod(method,params);this.own(grant,p.runId,p.capability);const results=[];let bytes=0;
    for(const [index,command]of p.commands.entries()){
     this.own(grant,p.runId,p.capability);
     const ticket=await this.workspace.prepare(p.runId,p.capability,p.pageId,`${p.requestId}:${index}`,command as BrowserCommand);
     const result=await this.workspace.execute(p.runId,p.capability,ticket.id,command as BrowserCommand);
     bytes+=JSON.stringify(result).length;if(bytes>8*1024*1024){const metadata={...result};delete metadata.result;results.push(metadata);return{results,truncated:true,completedCount:results.filter(r=>r.state==='completed').length};}
     results.push(result);if(result.state!=='completed')return{results,failedIndex:index,completedCount:index};
    }
    return{results,completedCount:results.length};
   }
  }
 }
}
