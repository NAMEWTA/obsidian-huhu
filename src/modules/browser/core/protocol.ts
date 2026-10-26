import * as z from 'zod/mini';
import { AgentBrowserError } from './contracts';
export const PROTOCOL_VERSION = 2 as const;
const string = (maximum:number, minimum=0)=>z.string().check(z.minLength(minimum),z.maxLength(maximum));
const integer = (minimum:number,maximum:number)=>z.int().check(z.gte(minimum),z.lte(maximum));
const id=z.string().check(z.regex(/^[a-zA-Z0-9_.:-]{1,160}$/));
const requestId=z.string().check(z.regex(/^[a-zA-Z0-9_.:-]{1,96}$/));
const text=string(65_536),ref=string(256),finite=z.number();
/** Mini keeps unused validators/locales outside the lazy browser bundle. These exact schemas also generate tools. */
export const commandSchema=z.union([
 z.strictObject({kind:z.literal('navigate'),url:string(8192)}),
 z.strictObject({kind:z.enum(['back','forward','reload','stop','snapshot','text','screenshot'])}),
 z.strictObject({kind:z.literal('click'),observationId:id,ref}),
 z.strictObject({kind:z.enum(['fill','type']),observationId:id,ref,text}),
 z.strictObject({kind:z.literal('select'),observationId:id,ref,values:z.array(string(4096)).check(z.minLength(1),z.maxLength(64))}),
 z.strictObject({kind:z.literal('wait'),condition:z.union([z.strictObject({kind:z.literal('url'),url:string(8192)}),z.strictObject({kind:z.literal('text'),text:string(4096,1)}),z.strictObject({kind:z.literal('load')})]),timeoutMs:integer(1,15000)}),
 z.strictObject({kind:z.literal('press'),key:string(80,1),modifiers:z.optional(integer(0,15))}),
 z.strictObject({kind:z.literal('scroll'),x:finite,y:finite,deltaX:finite,deltaY:finite}),
 z.strictObject({kind:z.literal('upload'),observationId:id,ref,fileIds:z.array(id).check(z.minLength(1),z.maxLength(8))}),
]);
const runScope={runId:id,capability:string(256,32)};
const pageScope={...runScope,pageId:id};
const schemas={
 'status':z.strictObject({}),
 'space.create':z.strictObject({requestId,label:z.optional(string(120)),ephemeral:z.optional(z.boolean()),url:z.optional(string(8192))}),
 'run.start':z.strictObject({spaceId:id}),
 'run.stop':z.strictObject(runScope),
 'run.heartbeat':z.strictObject(runScope),
 'page.list':z.strictObject(runScope),
 'page.open':z.strictObject({...runScope,requestId,url:z.optional(string(8192))}),
 'page.close':z.strictObject({...pageScope,requestId}),
 'observe':z.strictObject(pageScope),
 'operation.prepare':z.strictObject({...pageScope,requestId,command:commandSchema}),
 'operation.execute':z.strictObject({...runScope,operationId:id,command:commandSchema}),
 'operation.get':z.strictObject({...runScope,operationId:id}),
 'batch':z.strictObject({...pageScope,requestId,commands:z.array(commandSchema).check(z.minLength(1),z.maxLength(32))}),
 'file.list':z.strictObject(runScope),
 'download.list':z.strictObject(runScope),
 'events.poll':z.strictObject({...runScope,afterSequence:z.optional(z.int().check(z.gte(0)))}),
 'health':z.strictObject(runScope),
} as const;
export type BrowserMethod=keyof typeof schemas;
export type MethodParams<M extends BrowserMethod>=z.infer<(typeof schemas)[M]>;
export const methodNames=Object.keys(schemas) as BrowserMethod[];
export const envelopeSchema=z.strictObject({protocolVersion:z.literal(PROTOCOL_VERSION),requestId:id,bootId:id,method:z.enum(methodNames as [BrowserMethod,...BrowserMethod[]]),params:z.unknown(),deadlineAtMs:z.number()});
export function parseMethod<M extends BrowserMethod>(method:M,params:unknown):MethodParams<M>{
 const result=schemas[method].safeParse(params);if(!result.success)throw new AgentBrowserError('invalid_request');return result.data as MethodParams<M>;
}
export function protocolTools(){return methodNames.map(name=>({name:`browser_${name.replaceAll('.','_')}`,method:name,inputSchema:z.toJSONSchema(schemas[name]),exposure:'agent' as const}));}
export function validatePageUrl(input:string):string {
 if(input==='about:blank')return input;
 try{const u=new URL(input);if((u.protocol==='http:'||u.protocol==='https:')&&!u.username&&!u.password&&input.length<=8192)return u.href;}catch{/* Invalid and non-web URLs share a stable public error. */}
 throw new AgentBrowserError('unsupported_url');
}
