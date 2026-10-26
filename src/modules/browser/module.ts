import { Notice } from 'obsidian';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { BROWSER_WORKSPACE, BROWSER_OPEN, BROWSER_MATERIAL_CONSUMERS, type BrowserOpener } from './api';
import { AgentBrowserError } from './core/contracts';
import { composeBrowserWorkspace } from './services/create-workspace';
import { observeNoteLinks } from './platform/note-links';
import { browserSettings } from './settings';
import { registerMessages, t } from '../../shared/i18n';
import { messages as shared } from '../../shared/i18n/lazy/browser';
import { messages } from './i18n';
registerMessages(shared);
registerMessages(messages);

/** Browser is independently activated. Agent is an optional material consumer and viewer client. */
export default function createBrowserModule(context:ModuleContext):ModuleInstance{
 const settings=context.settings.bind('browser',browserSettings);
 let application:ReturnType<typeof composeBrowserWorkspace>|undefined;
 const workspace=()=>{if(!application)throw new AgentBrowserError('browser_disabled');return application.workspace;};
 const open:BrowserOpener={
  async open(request){
   const api=workspace(),url=api.resolveInput(request.url??'about:blank');if(!url)throw new AgentBrowserError('unsupported_url');
   let space=request.spaceId?api.getState().spaces.find(s=>s.id===request.spaceId):undefined;
   if(request.spaceId&&!space)throw new AgentBrowserError('space_not_found');
   if(!space&&request.reuse!==false)space=api.getState().spaces.find(s=>s.kind==='personal'&&s.status==='ready');
   const created=!space;
   if(!space)space=await api.createSpace({kind:'personal',label:request.title??t('browser.v2.personal'),ephemeral:api.getState().persistence!=='secure',url});
   else if(space.status==='stopped'||space.status==='faulted'){await api.startSpace(space.id);space=api.getState().spaces.find(s=>s.id===space!.id)!;}
   const page=(created||request.reuse!==false?space.pages.find(p=>p.url===url&&p.status==='open'):undefined)??await api.openPage({spaceId:space.id,url});
   await context.shell.open({feature:'browser',resourceId:space.id,focusId:page.id});return page.id;
  },
  async show(request){try{await open.open(request);}catch{new Notice(t('browser.v2.error'));}},
 };
 return{
  retainOnDisposeFailure:true,
  get services(){return application?[[BROWSER_WORKSPACE,application.workspace] as const,[BROWSER_OPEN,open] as const]:[];},
  pages:{browser:async()=>(await import('./ui/workbench-page')).createBrowserPage(workspace())},
  settingsPage:async()=>(await import('./ui/settings-page')).browserSettingsPage(workspace(),()=>context.shell.open({feature:'browser'})),
  async activate(signal){
   if(!context.env.desktop)return;signal.throwIfAborted();
   const ports=await(await import('./platform/desktop/composition')).createDesktopBrowserPorts({app:context.app,allowEphemeralFiles:scope=>application?.workspace.getState().spaces.some(s=>s.id===scope.spaceId&&s.retention==='ephemeral')===true,cancelDownload:async(_spaceId,id)=>{await application?.workspace.cancelDownload(id);}});
   application=composeBrowserWorkspace(ports,{renderViewer:async(api,scope)=>(await import('./ui/workbench-page')).renderBrowserViewer(api,scope),materials:async()=>(await context.contributions.collect(BROWSER_MATERIAL_CONSUMERS,{activate:false})).map(item=>item.value)});
   await application.initialize();signal.throwIfAborted();
   context.lifetime.register(observeNoteLinks(context.app.workspace,()=>settings.get().interceptNoteLinks,url=>{void open.show({url});}));
  },
  async dispose(){await application?.dispose();application=undefined;},
 };
}
