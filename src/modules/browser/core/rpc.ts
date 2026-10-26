import type { BrowserMethod } from './protocol';
import type { RunGrant } from './contracts';
export interface BrowserConnectionScope { spaceId:string;grant:RunGrant;allowTaskCreation:boolean; }
export interface BrowserRpcConnection {
 protocolVersion:2;bootId:string;endpoint:string;token:string;
 spaceId:string;runId:string;capability:string;
}
export interface BrowserRpcServer {
 /** Absolute path to a private descriptor; bearer values never enter UI state or command arguments. */
 create(scope:BrowserConnectionScope):Promise<string>;
 dispose():Promise<void>;
}
export type RpcHandler=(method:BrowserMethod,params:unknown,connectionId:string)=>Promise<unknown>;
export type RpcResponseGuard=(method:BrowserMethod,params:unknown,connectionId:string,result:unknown)=>unknown;
