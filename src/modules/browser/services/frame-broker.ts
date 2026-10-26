import { AgentBrowserError, type BrowserFrame, type FrameSubscription } from '../core/contracts';
interface Viewer { scope: { spaceId:string;pageId:string;viewerId:string }; receive:(frame:BrowserFrame)=>void; inflight?:BrowserFrame; latest?:BrowserFrame; displayed?:BrowserFrame; }
/** One producer per Page, one in-flight and one replaceable frame per observer. */
export class FrameBroker {
 private viewers = new Map<string,Viewer>();
 private frozen = new Map<string,BrowserFrame|undefined>();
 private counts=new Map<string,{received:number;replaced:number}>();
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
  const counts=this.counts.get(frame.spaceId)??{received:0,replaced:0};this.counts.set(frame.spaceId,counts);counts.received++;
  for(const viewer of this.viewers.values()){
   if(viewer.scope.spaceId!==frame.spaceId||viewer.scope.pageId!==frame.pageId)continue;
   if(viewer.inflight){if(viewer.latest)counts.replaced++;viewer.latest=frame;}else this.deliver(viewer,frame);
  }
 }
 frame(viewerId:string,frameId:string):BrowserFrame|undefined {
  const viewer=this.viewers.get(viewerId);if(!viewer||this.frozen.has(this.key(viewer.scope.spaceId,viewer.scope.pageId)))return;
  return viewer.displayed?.frameId===frameId?viewer.displayed:undefined;
 }
 invalidate(spaceId:string,pageId?:string):void{
  for(const viewer of this.viewers.values())if(viewer.scope.spaceId===spaceId&&(!pageId||viewer.scope.pageId===pageId)){viewer.inflight=undefined;viewer.latest=undefined;viewer.displayed=undefined;}
 }
 reset(spaceId:string,pageId?:string):void{this.invalidate(spaceId,pageId);for(const key of this.frozen.keys())if(pageId?key===this.key(spaceId,pageId):key.startsWith(`${spaceId}:`))this.frozen.delete(key);}
 async restart(spaceId:string):Promise<void>{const pages=new Set([...this.viewers.values()].filter(v=>v.scope.spaceId===spaceId).map(v=>v.scope.pageId));await Promise.all([...pages].map(pageId=>this.watch(spaceId,pageId,true)));}
 barrier(spaceId:string,pageId:string,blocked:boolean,minimumVersion=0){const key=this.key(spaceId,pageId);if(blocked){this.invalidate(spaceId,pageId);this.frozen.set(key,undefined);}else{const frame=this.frozen.get(key);this.frozen.delete(key);if(frame&&frame.viewportVersion>=minimumVersion)this.publish(frame);}}
 has(viewerId:string,spaceId:string){return this.viewers.get(viewerId)?.scope.spaceId===spaceId;}
 stats(spaceId:string){const views=[...this.viewers.values()].filter(v=>v.scope.spaceId===spaceId),counts=this.counts.get(spaceId);return{viewers:views.length,framesReceived:counts?.received??0,framesReplaced:counts?.replaced??0,queuedFrameBytes:views.reduce((n,v)=>n+(v.inflight?.data.byteLength??0)+(v.latest?.data.byteLength??0),0)};}
 dispose(){for(const v of this.viewers.values())void this.watch(v.scope.spaceId,v.scope.pageId,false).catch(()=>undefined);this.viewers.clear();this.frozen.clear();this.counts.clear();}
}
