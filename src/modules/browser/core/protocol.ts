import { z } from 'zod';
import { AgentBrowserError } from './contracts';
export const PROTOCOL_VERSION = 2 as const;
const id=z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/);
const text=z.string().max(65_536), ref=z.string().max(256), finite=z.number().finite();
/** The same schemas validate RPC and generate the CLI/MCP descriptions. UI-only variants are excluded. */
export const commandSchema=z.union([
 z.object({kind:z.literal('navigate'),url:z.string().max(8192)}).strict(),
 z.object({kind:z.enum(['back','forward','reload','stop','snapshot','text','screenshot'])}).strict(),
 z.object({kind:z.literal('click'),observationId:id,ref}).strict(),
 z.object({kind:z.literal('fill'),observationId:id,ref,text}).strict(),
 z.object({kind:z.literal('press'),key:z.string().min(1).max(80),modifiers:z.number().int().min(0).max(15).optional()}).strict(),
 z.object({kind:z.literal('scroll'),x:finite,y:finite,deltaX:finite,deltaY:finite}).strict(),
 z.object({kind:z.literal('upload'),observationId:id,ref,fileIds:z.array(id).min(1).max(8)}).strict(),
]);
const runScope={runId:id,capability:z.string().min(32).max(256)};
const pageScope={...runScope,pageId:id};
const schemas={
 'status':z.object({}).strict(),
 'space.create':z.object({requestId:id,label:z.string().max(120).optional(),ephemeral:z.boolean().optional(),url:z.string().max(8192).optional()}).strict(),
 'run.start':z.object({spaceId:id}).strict(),
 'run.stop':z.object(runScope).strict(),
 'run.heartbeat':z.object(runScope).strict(),
 'page.list':z.object(runScope).strict(),
 'page.open':z.object({...runScope,requestId:id,url:z.string().max(8192).optional()}).strict(),
 'page.close':z.object({...pageScope,requestId:id}).strict(),
 'observe':z.object(pageScope).strict(),
 'operation.prepare':z.object({...pageScope,requestId:id,command:commandSchema}).strict(),
 'operation.execute':z.object({...runScope,operationId:id,command:commandSchema}).strict(),
 'operation.get':z.object({...runScope,operationId:id}).strict(),
 'batch':z.object({...pageScope,requestId:id,commands:z.array(commandSchema).min(1).max(32)}).strict(),
 'file.list':z.object(runScope).strict(),
 'download.list':z.object(runScope).strict(),
 'events.poll':z.object({...runScope,afterSequence:z.number().int().nonnegative().optional()}).strict(),
 'health':z.object(runScope).strict(),
} as const;
export type BrowserMethod=keyof typeof schemas;
export type MethodParams<M extends BrowserMethod>=z.infer<(typeof schemas)[M]>;
export const methodNames=Object.keys(schemas) as BrowserMethod[];
export const envelopeSchema=z.object({protocolVersion:z.literal(PROTOCOL_VERSION),requestId:id,method:z.enum(methodNames as [BrowserMethod,...BrowserMethod[]]),params:z.unknown(),deadlineAtMs:z.number().finite()}).strict();
export function parseMethod<M extends BrowserMethod>(method:M,params:unknown):MethodParams<M>{
 const result=schemas[method].safeParse(params);if(!result.success)throw new AgentBrowserError('invalid_request');return result.data as MethodParams<M>;
}
export function protocolTools(){return methodNames.map(name=>({name:`browser_${name.replaceAll('.','_')}`,method:name,inputSchema:z.toJSONSchema(schemas[name]),exposure:'agent' as const}));}
export function validatePageUrl(input:string):string {
 if(input==='about:blank')return input;
 try{const u=new URL(input);if((u.protocol==='http:'||u.protocol==='https:')&&!u.username&&!u.password&&input.length<=8192)return u.href;}catch{/* Invalid and non-web URLs share a stable public error. */}
 throw new AgentBrowserError('unsupported_url');
}
