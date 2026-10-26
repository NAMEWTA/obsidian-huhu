import { AgentBrowserError, type BrowserFrame, type FrameSubscription } from '../core/contracts';
interface Viewer { scope: { spaceId:string;pageId:string;viewerId:string }; receive:(frame:BrowserFrame)=>void; inflight?:BrowserFrame; latest?:BrowserFrame; displayed?:BrowserFrame; }
/** One producer per Page, one in-flight and one replaceable frame per observer. */
export class FrameBroker {
 private viewers = new Map<string,Viewer>();
 private frozen = new Map<string,BrowserFrame|undefined>();
 private received=0; private replaced=0;
 constructor(private readonly watch:(spaceId:string,pageId:string,enabled:boolean)=>Promise<void>) {}
 private key(spaceId:string,pageId:string){return `${spaceId}:${pageId}`;}
 subscribe(scope:Viewer['scope'],receive:Viewer['receive']):FrameSubscription {
  if(this.viewers.has(scope.viewerId))throw new AgentBrowserError('viewer_id_conflict');
  const first=![...this.viewers.values()].some(v=>v.scope.spaceId===scope.spaceId&&v.scope.pageId===scope.pageId);
  const viewer:Viewer={scope:{...scope},receive};this.viewers.set(scope.viewerId,viewer);
  if(first)void this.watch(scope.spaceId,scope.pageId,true).catch(()=>undefined);
  return {ack:(id)=>{
   if(this.viewers.get(scope.viewerId)!==viewer || viewer.inflight?.frameId!==id)return;
   viewer.displayed=viewer.inflight;viewer.inflight=undefined;
   const next=viewer.latest;viewer.latest=undefined;if(next)this.deliver(viewer,next);
  },dispose:()=>{
   if(this.viewers.get(scope.viewerId)!==viewer)return;this.viewers.delete(scope.viewerId);
   if(![...this.viewers.values()].some(v=>v.scope.spaceId===scope.spaceId&&v.scope.pageId===scope.pageId))void this.watch(scope.spaceId,scope.pageId,false).catch(()=>undefined);
  }};
 }
 private deliver(viewer:Viewer,frame:BrowserFrame){
  viewer.inflight=frame;
  try{viewer.receive(frame);}catch{viewer.inflight=undefined;}
 }
 publish(frame:BrowserFrame):void{
  if(frame.data.byteLength>8*1024*1024)return;
  const key=this.key(frame.spaceId,frame.pageId);if(this.frozen.has(key)){this.frozen.set(key,frame);return;}
  this.received++;
  for(const viewer of this.viewers.values()){
   if(viewer.scope.spaceId!==frame.spaceId||viewer.scope.pageId!==frame.pageId)continue;
   if(viewer.inflight){if(viewer.latest)this.replaced++;viewer.latest=frame;}else this.deliver(viewer,frame);
  }
 }
 frame(viewerId:string,frameId:string):BrowserFrame|undefined {
  const viewer=this.viewers.get(viewerId);if(!viewer||this.frozen.has(this.key(viewer.scope.spaceId,viewer.scope.pageId)))return;
  return viewer.displayed?.frameId===frameId?viewer.displayed:undefined;
 }
 invalidate(spaceId:string,pageId?:string):void{
  for(const viewer of this.viewers.values())if(viewer.scope.spaceId===spaceId&&(!pageId||viewer.scope.pageId===pageId)){viewer.inflight=undefined;viewer.latest=undefined;viewer.displayed=undefined;}
 }
 barrier(spaceId:string,pageId:string,blocked:boolean,minimumVersion=0){const key=this.key(spaceId,pageId);if(blocked){this.invalidate(spaceId,pageId);this.frozen.set(key,undefined);}else{const frame=this.frozen.get(key);this.frozen.delete(key);if(frame&&frame.viewportVersion>=minimumVersion)this.publish(frame);}}
 has(viewerId:string,spaceId:string){return this.viewers.get(viewerId)?.scope.spaceId===spaceId;}
 stats(spaceId:string){const views=[...this.viewers.values()].filter(v=>v.scope.spaceId===spaceId);return{viewers:views.length,framesReceived:this.received,framesReplaced:this.replaced,queuedFrameBytes:views.reduce((n,v)=>n+(v.inflight?.data.byteLength??0)+(v.latest?.data.byteLength??0),0)};}
 dispose(){for(const v of this.viewers.values())void this.watch(v.scope.spaceId,v.scope.pageId,false).catch(()=>undefined);this.viewers.clear();this.frozen.clear();}
}
