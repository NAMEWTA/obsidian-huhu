import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AgentBrowserError } from '../../core/contracts';
import { envelopeSchema } from '../../core/protocol';
import type { BrowserConnectionScope, BrowserRpcConnection, BrowserRpcServer, RpcHandler } from '../../core/rpc';
import { atomicPrivateFile, privateDirectory } from './persistence/private-files';

export function createBrowserRpcServer(options:{directory:string;assertOwner:()=>Promise<void>;handler:RpcHandler;register:(id:string,scope:BrowserConnectionScope)=>void}):BrowserRpcServer{
 const bootId=randomUUID(),tokens=new Map<string,{token:string;file:string}>();let server:Server|undefined,endpoint='',closed=false,pending:Promise<void>|undefined,active=0;
 const secretEqual=(a:string,b:string)=>{const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
 const reply=(res:ServerResponse,status:number,value:unknown)=>{if(res.destroyed||res.writableEnded)return;const data=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);};
 const handle=async(req:IncomingMessage,res:ServerResponse)=>{
  if(closed||req.method!=='POST'||req.url!=='/rpc'||req.headers.origin||req.headers.host!==new URL(endpoint).host||!String(req.headers['content-type']).startsWith('application/json')){reply(res,403,{error:{code:'transport_rejected'}});return;}
  if(active>=32){reply(res,429,{error:{code:'request_quota'}});return;}
  const authorization=req.headers.authorization??'',token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  const match=[...tokens].find(([,credential])=>secretEqual(credential.token,token));if(!match){reply(res,401,{error:{code:'connection_invalid'}});return;}
  active++;
  try{
   await options.assertOwner();const chunks:Buffer[]=[];let size=0;
   for await(const chunk of req){const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=data.length;if(size>512*1024)throw new AgentBrowserError('request_too_large');chunks.push(data);}
   let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AgentBrowserError('invalid_request');}
   const parsed=envelopeSchema.safeParse(value);if(!parsed.success)throw new AgentBrowserError('invalid_request');
   const envelope=parsed.data;if(envelope.bootId!==bootId)throw new AgentBrowserError('boot_changed');
   const remaining=envelope.deadlineAtMs-Date.now();if(remaining<=0||remaining>60_000)throw new AgentBrowserError('deadline_invalid');
   let timeout:ReturnType<typeof setTimeout>|undefined;
   try{
    const result=await Promise.race([options.handler(envelope.method,envelope.params,match[0]),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new AgentBrowserError('outcome_unknown')),remaining);})]);
    const body={protocolVersion:2,requestId:envelope.requestId,result:result??null};if(Buffer.byteLength(JSON.stringify(body))>12*1024*1024)throw new AgentBrowserError('response_too_large');reply(res,200,body);
   }finally{if(timeout)clearTimeout(timeout);}
  }catch(error){reply(res,400,{error:{code:error instanceof AgentBrowserError?error.code:'operation_failed'}});}
  finally{active--;}
 };
 const start=async()=>{
  await options.assertOwner();await privateDirectory(options.directory);
  if(closed)throw new AgentBrowserError('workspace_closing');
  server=createServer((req,res)=>{void handle(req,res);});server.requestTimeout=10_000;server.headersTimeout=5000;
  await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen({host:'127.0.0.1',port:0,exclusive:true},resolve);});
  const address=server.address();if(!address||typeof address==='string')throw new AgentBrowserError('bridge_unavailable');endpoint=`http://127.0.0.1:${address.port}/rpc`;server.unref();
 };
 return{
  async create(scope){if(closed)throw new AgentBrowserError('workspace_closing');if(tokens.size>=32)throw new AgentBrowserError('connection_quota');pending??=start();await pending;
   const id=randomUUID(),token=randomBytes(32).toString('base64url'),file=path.join(options.directory,`${id}.json`);
   const descriptor:BrowserRpcConnection={protocolVersion:2,bootId,endpoint,token,spaceId:scope.spaceId,runId:scope.grant.run.id,capability:scope.grant.capability};
   await atomicPrivateFile(file,JSON.stringify(descriptor),true);tokens.set(id,{token,file});options.register(id,scope);return JSON.stringify(descriptor);
  },
  async dispose(){closed=true;for(const c of tokens.values())await fs.rm(c.file,{force:true});tokens.clear();(server as (Server & {closeAllConnections?():void}) | undefined)?.closeAllConnections?.();if(server?.listening)await new Promise<void>(resolve=>server!.close(()=>resolve()));},
 };
}
