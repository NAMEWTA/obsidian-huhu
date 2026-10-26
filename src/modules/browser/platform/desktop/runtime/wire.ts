import type{BrowserCommand,BrowserObservation,ControlLease,JsonValue,RuntimeEvent,RuntimeIdentityState,RuntimePage}from'../../../core/contracts';
export interface WorkerInit{type:'init';spaceId:string;runtimeId:string;port:number;token:string;downloadPath:string;provisioning:ControlLease;}
export type WorkerRequest={id:number}&(
 {type:'control';epoch:number;lease?:ControlLease}|
 {type:'create';pageId:string;url:string;authority:ControlLease}|
 {type:'close';pageId:string;authority:ControlLease}|
 {type:'execute';pageId:string;command:BrowserCommand;authority:ControlLease;uploadPaths?:string[]}|
 {type:'observe';pageId:string;authority:ControlLease}|
 {type:'watch';pageId:string;enabled:boolean}|
 {type:'readIdentity';authority:ControlLease}|
 {type:'writeIdentity';seed:RuntimeIdentityState;authority:ControlLease}|
 {type:'cancelDownload';downloadId:string}|{type:'frameAck';pageId:string}|{type:'stop'});
export type WorkerResult=JsonValue|BrowserObservation|RuntimePage|RuntimeIdentityState|undefined;
export type WorkerResponse={type:'ready';version:string}|{type:'result';id:number;value?:WorkerResult;error?:string}|{type:'event';event:RuntimeEvent};
