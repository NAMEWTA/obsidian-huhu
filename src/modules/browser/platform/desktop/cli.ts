import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import type { BrowserRpcConnection } from '../../core/rpc';
import { methodNames, parseMethod, protocolTools, type BrowserMethod } from '../../core/protocol';

async function readConnection(file:string):Promise<BrowserRpcConnection>{
 const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024||process.platform!=='win32'&&(stat.mode&0o077)!==0)throw new Error('connection_file_invalid');
 const data=JSON.parse(await fs.readFile(file,'utf8')) as BrowserRpcConnection,url=new URL(data.endpoint);
 if(data.protocolVersion!==2||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/rpc'||url.username||url.password||!data.bootId||typeof data.token!=='string'||data.token.length<32)throw new Error('connection_file_invalid');return data;
}
async function rpc(connection:BrowserRpcConnection,method:BrowserMethod,input:unknown){
 const original=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
 const scoped=['status','space.create','run.start'].includes(method)?original:{runId:connection.runId,capability:connection.capability,...original};
 const params=parseMethod(method,scoped),deadlineAtMs=Date.now()+30_000;
 const response=await window.fetch(connection.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${connection.token}`},body:JSON.stringify({protocolVersion:2,bootId:connection.bootId,requestId:randomUUID(),method,params,deadlineAtMs}),signal:AbortSignal.timeout(31_000)});
 const text=await response.text();if(text.length>12*1024*1024)throw new Error('response_too_large');const body=JSON.parse(text) as {result?:unknown;error?:{code?:string}};
 if(!response.ok||body.error)throw new Error(body.error?.code??'request_failed');return body.result;
}
async function mcp(connection:BrowserRpcConnection){
 const grants=new Map([[connection.runId,connection.capability]]);
 const tools=protocolTools(),lines=createInterface({input:process.stdin,crlfDelay:Infinity});let busy=false;
 const send=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
 for await(const line of lines){
  if(line.length>512*1024){send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'request_too_large'}});continue;}
  let message:{id?:string|number;method?:string;params?:{name?:string;arguments?:unknown}};
  try{const parsed:unknown=JSON.parse(line);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid_json');message=parsed;}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'invalid_json'}});continue;}
  if(message.id===undefined)continue;
  if(message.method==='initialize'){send({jsonrpc:'2.0',id:message.id,result:{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'huhu-browser',version:'2'}}});continue;}
  if(message.method==='tools/list'){send({jsonrpc:'2.0',id:message.id,result:{tools:tools.map(t=>({name:t.name,description:`HUHU ${t.method}`,inputSchema:{...t.inputSchema,properties:Object.fromEntries(Object.entries(t.inputSchema.properties??{}).filter(([key])=>key!=='capability')),required:(t.inputSchema.required??[]).filter(key=>key!=='capability'&&key!=='runId')}}))}});continue;}
  if(message.method==='ping'){send({jsonrpc:'2.0',id:message.id,result:{}});continue;}
  const tool=message.method==='tools/call'?tools.find(t=>t.name===message.params?.name):undefined;
  if(!tool||busy){send({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'method_unavailable'}});continue;}
  busy=true;
  try{const input=message.params?.arguments&&typeof message.params.arguments==='object'&&!Array.isArray(message.params.arguments)?message.params.arguments as Record<string,unknown>:{};const runId=typeof input.runId==='string'?input.runId:connection.runId;const capability=grants.get(runId);if(!capability)throw new Error('capability_scope_mismatch');const scoped=['status','space.create','run.start'].includes(tool.method)?input:{...input,runId,capability};const result=await rpc(connection,tool.method,scoped);if((tool.method==='run.start'||tool.method==='space.create')&&result&&typeof result==='object'&&'capability'in result&&'run'in result){const grant=result as {capability?:string;run:{id:string}};if(grant.capability)grants.set(grant.run.id,grant.capability);delete grant.capability;}send({jsonrpc:'2.0',id:message.id,result:{content:[{type:'text',text:JSON.stringify(result??null)}]}});}
  catch(error){send({jsonrpc:'2.0',id:message.id,result:{isError:true,content:[{type:'text',text:error instanceof Error&&/^[a-z_]{1,80}$/.test(error.message)?error.message:'request_failed'}]}});}
  finally{busy=false;}
 }
}
async function main(){
 const args=process.argv.slice(2),flag=args.indexOf('--connection'),file=args[flag+1];
 if(args[0]==='schema'){process.stdout.write(JSON.stringify(protocolTools(),null,2)+'\n');return;}
 if(flag<0||!file)throw new Error('connection_required');args.splice(flag,2);const connection=await readConnection(file);
 if(args[0]==='mcp'){await mcp(connection);return;}
 if(args[0]!=='call'||!methodNames.includes(args[1] as BrowserMethod))throw new Error('method_required');
 const result=await rpc(connection,args[1] as BrowserMethod,JSON.parse(args[2]??'{}'));process.stdout.write(JSON.stringify(result??null,null,2)+'\n');
}
void main().catch(error=>{process.stderr.write((error instanceof Error&&/^[a-z_]{1,80}$/.test(error.message)?error.message:'request_failed')+'\n');process.exitCode=1;});
