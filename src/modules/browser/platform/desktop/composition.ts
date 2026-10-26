import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { App } from 'obsidian';
import { BROWSER_ROOT } from '../../../../shared/storage/vault-layout';
import { vaultIdentity } from '../../../../host/obsidian/storage/device-id';
import { absoluteHuhuPath } from '../../../../host/desktop/huhu-paths';
import { desktopRemote } from '../../../../host/desktop/electron-main';
import { createSecretProtector } from '../../../../host/desktop/secret-protector';
import { AgentBrowserError, type BrowserRuntime } from '../../core/contracts';
import type { IdentitySource } from '../../core/identity';
import type { BrowserFileScope } from '../../core/files';
import { createBrowserPersistence } from './persistence/browser-persistence';
import { createDesktopRuntimeFactoryForWindow } from './runtime/adapter';
import { createDesktopCredentialStore } from './identity/credential-store';
import { DesktopIdentitySourceReader } from './identity/source-reader';
import { DesktopBrowserFileService } from './files/file-service';
import { DesktopImportCleanupJobs } from './cleanup-jobs';
import { detectBrowsers } from './cookies/detect';
import type { DetectedBrowser } from '../../core/cookies';
import { createBrowserRpcServer } from './rpc-server';
import type { BrowserConnectionScope, RpcHandler } from '../../core/rpc';

interface DesktopDialog {
 showOpenDialog(options:{properties:string[]}):Promise<{canceled:boolean;filePaths:string[]}>;
 showSaveDialog(options:{defaultPath:string}):Promise<{canceled:boolean;filePath?:string}>;
}
export async function createDesktopBrowserPorts(options:{app:App;allowEphemeralFiles:(scope:BrowserFileScope)=>boolean;cancelDownload:(spaceId:string,id:string)=>Promise<void>}){
 const {app}=options,win=app.workspace.containerEl.ownerDocument.defaultView;if(!win)throw new AgentBrowserError('owner_window_missing');
 const adapter=app.vault.adapter as {getBasePath?:()=>string};if(!adapter.getBasePath)throw new AgentBrowserError('desktop_vault_required');
 const identity=vaultIdentity(app),root=await absoluteHuhuPath(adapter.getBasePath(),`${BROWSER_ROOT}/${identity.deviceId}/v2`);
 const protector=createSecretProtector(win),persistence=createBrowserPersistence({root,protector});await persistence.initialize();
 const electron=desktopRemote(win).require('electron') as {dialog:DesktopDialog};
 const pick=async(directory=false)=>{const result=await electron.dialog.showOpenDialog({properties:[directory?'openDirectory':'openFile']});return result.canceled?undefined:result.filePaths[0];};
 const runtimeFactory=createDesktopRuntimeFactoryForWindow({dataRoot:root,win,chooseBundle:()=>pick(true)});
 const credentials=createDesktopCredentialStore({directory:path.join(root,'identities'),vaultId:identity.vaultId,deviceId:identity.deviceId,protector,assertOwner:()=>persistence.assertOwner()});
 let cleanup:DesktopImportCleanupJobs|undefined,files:DesktopBrowserFileService|undefined,activeImports=0,recoveryPending=false,detected:DetectedBrowser[]=[];
 const assertOwner=()=>persistence.assertOwner();
 try{
  if(!persistence.readOnly){
   cleanup=await DesktopImportCleanupJobs.open({root,assertOwner,reclaim:id=>runtimeFactory.reclaim(id)});
   await cleanup.retry();
   try{await runtimeFactory.recoverEphemeral();}catch{recoveryPending=true;}
   files=new DesktopBrowserFileService({directory:path.join(root,'files'),downloadDirectory:id=>path.join(root,'downloads',id),metadataProtector:protector,metadataScope:`${identity.vaultId}:${identity.deviceId}`,assertOwner,allowEphemeralFiles:options.allowEphemeralFiles,cancelDownload:options.cancelDownload});await files.ready;
  }
 }catch(error){await runtimeFactory.dispose();await persistence.dispose();throw error;}
 const source=new DesktopIdentitySourceReader({temporaryDirectory:path.join(root,'import-staging'),readerExecutable:()=>runtimeFactory.readerExecutable(),recordCleanupFailure:async file=>{await cleanup?.record(file,'source');}});
 const fileService=()=>{if(!files)throw new AgentBrowserError('workspace_owned_elsewhere');return files;};
 const track=async<T>(work:()=>Promise<T>)=>{activeImports++;try{return await work();}finally{activeImports--;}};
 return{
  root,persistence,runtimeFactory,credentials,
  async listSources():Promise<IdentitySource[]>{await assertOwner();detected=await detectBrowsers();return detected.map((browser,index)=>({id:`source-${index}`,label:browser.label,profiles:browser.profiles.map((profile,i)=>({id:`profile-${i}`,label:profile.name}))}));},
  async sourceText(label:string){return track(async()=>{await assertOwner();const selected=await pick();if(!selected)return undefined;return{label,text:await source.captureFileText(source.issueFileGrant(selected).id)};});},
  async sourceSeed(request:{sourceId:string;profileId?:string}){return track(async()=>{
   await assertOwner();const match=/^source-(\d+)$/.exec(request.sourceId),browser=match?detected[Number(match[1])]:undefined;
   const profileMatch=/^profile-(\d+)$/.exec(request.profileId??'profile-0'),profile=profileMatch?browser?.profiles[Number(profileMatch[1])]:undefined;
   if(!browser||!profile)throw new AgentBrowserError('source_grant_invalid');return source.capture(source.issueBrowserGrant(browser,profile.directory).id);
  });},
  async staging():Promise<{runtime:BrowserRuntime;cleanup:()=>Promise<void>}>{
   await assertOwner();if(!cleanup)throw new AgentBrowserError('workspace_owned_elsewhere');const id=randomUUID(),location=path.join(root,'import-staging',id);await cleanup.record(location,'runtime');activeImports++;
   let runtime:BrowserRuntime|undefined,done=false,tracked=true;
   const finish=async()=>{if(done)return;try{await runtime?.stop();await runtimeFactory.reclaim(id);await runtimeFactory.removeProfile(id);await assertOwner();try{await fs.rmdir(location);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}await cleanup!.complete(id);done=true;}finally{if(tracked){tracked=false;activeImports--;}}};
   try{runtime=await runtimeFactory.start({spaceId:id,runtimeId:randomUUID(),ephemeral:true,purpose:'staging'});return{runtime,cleanup:finish};}
   catch(error){try{await finish();}catch{throw new AgentBrowserError('cleanup_pending');}throw error;}
  },
  cleanupPending:()=>(cleanup?.count??0)+(recoveryPending?1:0),
  async retryCleanup(){await assertOwner();if(activeImports)throw new AgentBrowserError('import_in_progress');await cleanup?.retry();try{await runtimeFactory.recoverEphemeral();recoveryPending=false;}catch{recoveryPending=true;throw new AgentBrowserError('cleanup_pending');}},
  fileService,
  async chooseUpload(scope:BrowserFileScope){await assertOwner();const selected=await pick();if(!selected)return undefined;return(await fileService().grantUpload(selected,scope)).file;},
  async exportFile(spaceId:string,fileId:string){await assertOwner();const file=fileService().listSpaceFiles(spaceId).find(f=>f.id===fileId);if(!file)throw new AgentBrowserError('file_not_found');const destination=await electron.dialog.showSaveDialog({defaultPath:file.name});if(!destination.canceled&&destination.filePath)await fileService().exportForUser(spaceId,fileId,destination.filePath);},
  rpc(handler:RpcHandler,register:(id:string,scope:BrowserConnectionScope)=>void){return createBrowserRpcServer({directory:path.join(root,'connections'),assertOwner,handler,register});},
  async disposeSources(){await source.dispose();await cleanup?.dispose();},
 };
}
export type DesktopBrowserPorts=Awaited<ReturnType<typeof createDesktopBrowserPorts>>;
