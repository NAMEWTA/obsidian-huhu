// Reproducible shared contract snapshots. Uses the repository-pinned TypeScript compiler.
import ts from 'typescript';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const input=path.join(root,'src/modules/huhubot/api.ts');
const program=ts.createProgram([input],{target:ts.ScriptTarget.ES2021,strict:true,skipLibCheck:true,moduleResolution:ts.ModuleResolutionKind.NodeNext,module:ts.ModuleKind.NodeNext});
const checker=program.getTypeChecker();
const source=program.getSourceFile(input);
const decl=source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='BotMethodMap');
if(!decl)throw new Error('BotMethodMap missing');
const implemented=new Set(['protocol.hello','service.health','service.status','service.diagnostics','service.shutdown','profile.status','host.attach','host.detach','agents.create','agents.list','agents.get','agents.update','agents.disable','agents.deletePreview','agents.delete','models.list','models.test','models.bind','sessions.create','sessions.list','sessions.get','sessions.history','sessions.archive','sessions.updateMembers','sessions.setCoordinator','sessions.deletePreview','sessions.delete','profile.deletePreview','profile.delete','portable.stage','portable.export','portable.importPreview','portable.import','runs.start','runs.get','runs.recovery','runs.resume','grants.create','grants.list','grants.revoke','runs.subscribe','runs.cancel','approvals.list','approvals.get','approvals.resolve','effects.get','effects.reconcile','collaboration.configurationHash','collaboration.budget','collaboration.configureBudget','collaboration.discover','collaboration.delegate','collaboration.message','collaboration.reply','collaboration.get','collaboration.list','collaboration.cancel','collaboration.proposeCreate','collaboration.proposals','collaboration.confirmProposal','collaboration.rejectProposal','memory.list','memory.get','memory.pin','memory.correct','memory.forget','memory.setAutoMaintenance','memory.proposeGlobal','memory.resolveGlobal']);
const decimalNames=/^(.*Revision|.*Epoch|revision|seq|afterSeq|throughSeq|incarnation|nextSeq|recoveryGeneration|generation|headSeq|snapshotSeq|inputTokens|outputTokens|rootTokenLimit|profileTokenLimit|maintenanceTokenLimit|reservedTokens|chargedTokens|size)$/;
function schema(type,name='',depth=0){
 if(depth>40)throw new Error('recursive wire DTO');
 if(type.flags&ts.TypeFlags.StringLiteral)return {type:'string',const:type.value};
 if(type.flags&ts.TypeFlags.NumberLiteral)return {type:'number',const:type.value};
 if(type.flags&ts.TypeFlags.BooleanLiteral)return {type:'boolean',const:type.intrinsicName==='true'};
 if(type.flags&ts.TypeFlags.StringLike){if(name==='treeRevision')return {type:'string',pattern:'^sha256:[0-9a-f]{64}$'};if(decimalNames.test(name))return {type:'string',pattern:'^(0|[1-9][0-9]*)$'};if(/At$/.test(name))return {type:'string',format:'date-time',pattern:'Z$'};return {type:'string'};}
 if(type.flags&ts.TypeFlags.NumberLike)return {type:'number'};
 if(type.flags&ts.TypeFlags.Boolean)return {type:'boolean'};
 if(type.isUnion()){
  const variants=type.types.filter(t=>!(t.flags&(ts.TypeFlags.Undefined|ts.TypeFlags.Never))).map(t=>schema(t,name,depth+1));
  if(variants.length===1)return variants[0];
  if(variants.length&&variants.every(t=>t.type==='string'&&'const'in t))return {type:'string',enum:variants.map(t=>t.const)};
  if(variants.length===2&&variants.every(t=>t.type==='boolean'))return {type:'boolean'};
  return {oneOf:variants};
 }
 if(checker.isArrayType(type)||checker.isTupleType(type)){const arg=checker.getTypeArguments(type)[0];return {type:'array',items:schema(arg,'',depth+1)};}
 if(type.flags&ts.TypeFlags.Object||type.isIntersection()){
  const properties={},required=[];
  for(const prop of checker.getPropertiesOfType(type)){
   const location=prop.valueDeclaration??prop.declarations?.[0]??decl;
   const name=prop.getName();properties[name]=schema(checker.getTypeOfSymbolAtLocation(prop,location),name,depth+1);
   if(!(prop.flags&ts.SymbolFlags.Optional))required.push(name);
  }
  return {type:'object',properties,required,additionalProperties:false};
 }
 if(type.flags&ts.TypeFlags.Null)return {type:'null'};
 throw new Error(`unsupported ${checker.typeToString(type)}`);
}
const methods={};
const definitions={};
for(const prop of checker.getPropertiesOfType(checker.getTypeAtLocation(decl))){
 const name=prop.getName();const type=checker.getTypeOfSymbolAtLocation(prop,prop.valueDeclaration);
 const params=checker.getPropertyOfType(type,'params'),result=checker.getPropertyOfType(type,'result');
 const p=schema(checker.getTypeOfSymbolAtLocation(params,params.valueDeclaration));
 const r=schema(checker.getTypeOfSymbolAtLocation(result,result.valueDeclaration));
 definitions[name+'.params']=p;definitions[name+'.result']=r;
 methods[name]={direction:['host.invoke','host.queryReceipt','host.read','host.search','host.prepareWrite','host.checkWrite'].includes(name)?'server-to-client':'client-to-server',implemented:implemented.has(name),params:{$ref:'#/$defs/'+name+'.params'},result:{$ref:'#/$defs/'+name+'.result'}};
}
const errorKinds=checker.getTypeAtLocation(source.statements.find(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='BotErrorKind'));
definitions.ErrorKind=schema(errorKinds);
// These wire limits are measured and frozen as a single frame budget (including kind).
const limits={maxFrameBytes:1048576,maxBatchItems:8,maxIdentifierBytes:128,jsonKind:1};
const id={type:'string',pattern:'^[cs]:[\\s\\S]+$',maxLength:128};
const cursorRecovery=schema(checker.getTypeAtLocation(source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='EventCursorRecovery')));
definitions.EventCursorRecovery=cursorRecovery;
definitions.HapCancelNotification=schema(checker.getTypeAtLocation(source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='HapCancelNotification')));
Object.assign(definitions.HapCancelNotification.properties.params.properties.requestId,{pattern:'^s:[\\s\\S]+$',maxLength:128,minLength:3});
const error={type:'object',properties:{code:{type:'integer'},message:{type:'string'},data:{type:'object',properties:{kind:schema(errorKinds),reason:{type:'string',minLength:1},retryable:{type:'boolean'},correlationId:{type:'string',minLength:1},details:cursorRecovery},allOf:[{if:{required:['details']},then:{properties:{kind:{const:'CURSOR_EXPIRED'}}}}],required:['kind','reason','retryable','correlationId'],additionalProperties:false}},required:['code','message','data'],additionalProperties:false};
definitions.BotErrorData=error.properties.data;
error.properties.data={$ref:'#/$defs/BotErrorData'};
const request={type:'object',properties:{jsonrpc:{const:'2.0'},id,method:{type:'string',minLength:1,maxLength:128},params:{type:'object'}},required:['jsonrpc','method'],additionalProperties:false};
const response={type:'object',properties:{jsonrpc:{const:'2.0'},id,result:{},error},required:['jsonrpc','id'],oneOf:[{required:['result'],not:{required:['error']}},{required:['error'],not:{required:['result']}}],additionalProperties:false};
const protocolError={type:'object',properties:{jsonrpc:{const:'2.0'},id:{type:'null'},error},required:['jsonrpc','id','error'],additionalProperties:false};
const item={oneOf:[request,response,protocolError]};
for (const name of ['protocol.hello.result','service.status.result','profile.status.result','service.diagnostics.result']) {
 definitions[name].properties.schemaVersion={type:'integer',const:1};
}
definitions['protocol.hello.result'].properties.limits.properties.maxFrameBytes={type:'integer',const:limits.maxFrameBytes};
definitions['protocol.hello.result'].properties.limits.properties.maxBatchItems={type:'integer',const:limits.maxBatchItems};
for(const key of ['name','version'])Object.assign(definitions['protocol.hello.params'].properties.client.properties[key],{minLength:1,maxLength:128});
Object.assign(definitions['host.attach.params'].properties.workspaceId,{minLength:1,maxLength:128});
Object.assign(definitions['host.attach.params'].properties.capabilities,{minItems:1,maxItems:32,uniqueItems:true});
Object.assign(definitions['host.attach.params'].properties.capabilities.items,{minLength:1,maxLength:128});
Object.assign(definitions['host.detach.params'].properties.leaseId,{minLength:1});
Object.assign(definitions['portable.stage.params'].properties.dataBase64,{maxLength:349528,pattern:'^[A-Za-z0-9+/]*={0,2}$'});
function bound(spec,name=''){
 if(spec.oneOf)for(const item of spec.oneOf)bound(item,name);
 if(spec.type==='object'){
  for(const [key,value]of Object.entries(spec.properties))bound(value,key);
  if(spec.properties.kind?.enum?.includes('none')&&spec.properties.afterSeq){spec.allOf=[{if:{properties:{kind:{const:'range'}}},then:{required:['afterSeq','throughSeq']}},{if:{properties:{kind:{const:'none'}}},then:{not:{anyOf:[{required:['afterSeq']},{required:['throughSeq']}]}}}];}
  if(spec.properties.kind?.enum?.includes('selection')&&spec.properties.scopeResourceIds)spec.allOf=[{if:{properties:{kind:{const:'selection'}}},then:{required:['range']}}];
 }
 if(spec.type==='array'){bound(spec.items);if(name==='memberIds')Object.assign(spec,{minItems:1,maxItems:100,uniqueItems:true});if(name==='targetAgentIds')Object.assign(spec,{maxItems:32,uniqueItems:true});if(name==='groupMembers')spec.maxItems=100;if(name==='affectedRunIds')Object.assign(spec,{maxItems:33,uniqueItems:true});if(name==='members'&&spec.items.properties?.incarnation)Object.assign(spec,{maxItems:100,uniqueItems:true});if(['sources','scopes','sourceRefs','sourceScopes','recipients','scopeResourceIds'].includes(name))spec.maxItems=32;}
 // A captured document is at most 1 MiB UTF-8. Its UTF-16 offsets can
 // therefore reach 1 MiB independently of the much smaller read byte budget.
 const policyMax={maxDepth:3,maxChildren:32,rootChildren:4,profileChildren:8,maxWakes:8};
 if(spec.type==='number'&&name in policyMax){spec.type='integer';spec.minimum=0;spec.maximum=policyMax[name];}
 if(spec.type==='number'&&['start','end'].includes(name)){spec.type='integer';spec.minimum=name==='start'?0:1;spec.maximum=1048576;}
 if(spec.type==='number'&&['maxBytes','limit'].includes(name)){spec.type='integer';spec.minimum=1;spec.maximum=name==='limit'?100:131072;}
 if(spec.type==='string'&&(name==='hash'||name.endsWith('Hash')||name==='fingerprint'))spec.pattern='^sha256:[0-9a-f]{64}$';
}
for(const definition of Object.values(definitions))bound(definition);
// Memory is a newly specified reserved contract. Do not change any old method's
// bounds. UTF-8 and aggregate sizes are independently checked at typed consumers.
function memoryBound(s,name=''){
 if(s.oneOf)for(const v of s.oneOf)memoryBound(v,name);
 if(s.type==='object'){
  for(const [k,v]of Object.entries(s.properties))memoryBound(v,k);
  if(s.properties.eligible)s.allOf=[{if:{properties:{eligible:{const:false}}},then:{required:['reason']}}];
  if(s.properties.state?.enum?.includes('pending')&&s.properties.runId&&s.properties.entries){s.properties.entries.maxItems=0;s.required.push('reason');}
  if(s.properties.partCount){
   if(s.properties.text)Object.assign(s.properties.text,{minLength:0,maxLength:4096});
   s.allOf=[{if:{properties:{kind:{const:'attachment'}}},then:{properties:{representation:{const:'metadata'}},not:{required:['text']}},else:{required:['text','contentHash','displaySlice','partCount']}}];
   s.allOf.push({if:{properties:{representation:{const:'intent_alias'}}},then:{properties:{text:{const:''}}},else:{properties:{text:{minLength:1}}}});
  }
  if(s.properties.state?.const==='redacted')s.required.push('reason');
 }
 if(s.type==='array'){
  memoryBound(s.items);
  const sizes={items:50,entries:50,derived:128,sources:128,sourceRefs:32,sourceScopes:32,sourceSpans:2};
  if(name in sizes)s.maxItems=sizes[name];
 }
 if(s.type==='string'){
  if(['revision','expectedRevision','candidateRevision','targetRevision','runRevision','commandEpoch'].includes(name))Object.assign(s,{pattern:'^[1-9][0-9]*$',maxLength:19});
  if(name==='text')Object.assign(s,{minLength:1,maxLength:65536});
  if(name==='query')s.maxLength=1024;
  if(name==='cursor'||name==='nextCursor')Object.assign(s,{minLength:1,maxLength:2048});
  if(name==='commandId'||name==='idempotencyKey')Object.assign(s,{minLength:1,maxLength:128});
  if(name==='id'||name.endsWith('Id'))Object.assign(s,{minLength:1,maxLength:512});
 }
 if(s.type==='number'||s.type==='integer'){
  s.type='integer';s.minimum=0;
  if(name==='limit'){s.minimum=1;s.maximum=50;}
  if(name==='selected')s.maximum=128;if(name==='excerpted')s.maximum=32;
  if(name==='omittedAuthorized')s.maximum=60;
  if(['start','end'].includes(name))s.maximum=393216;
  if(name==='partCount'){s.minimum=1;s.maximum=128;}
  if(name==='partIndex')s.maximum=127;
 }
}
for(const [name,definition]of Object.entries(definitions))if(name.startsWith('memory.'))memoryBound(definition);
definitions['memory.list.params'].allOf=[{if:{properties:{kind:{const:'context'}}},then:{required:['scope'],properties:{scope:{properties:{kind:{enum:['session','work_thread']}}},namespace:{properties:{kind:{enum:['agent','temporary']}}}},not:{required:['query']}}}];

Object.assign(definitions['runs.subscribe.params'].properties.limit,{type:'integer',minimum:1,maximum:128});
Object.assign(definitions['runs.subscribe.params'].properties.maxBytes,{type:'integer',minimum:1024,maximum:524288});
Object.assign(definitions['runs.subscribe.params'].properties.waitMillis,{type:'integer',minimum:0,maximum:1000});
for(const method of ['host.read','host.search']){
 Object.assign(definitions[method+'.params'].properties.maxBytes,{minimum:1,maximum:65536});
 if(method==='host.search'){Object.assign(definitions[method+'.params'].properties.limit,{minimum:1,maximum:20});Object.assign(definitions[method+'.params'].properties.query,{minLength:1,maxLength:256});}
}
definitions['host.search.params'].anyOf=[{properties:{sources:{minItems:1}}},{properties:{scopes:{minItems:1}}}];
// Optional application test seams do not weaken the actual Host boundary.
for(const method of ['host.invoke','host.checkWrite','host.queryReceipt']){
 const preview=definitions[method+'.params'].properties.preview;
 if(!preview.required.includes('binding'))preview.required.push('binding');
}
for(const method of ['host.invoke','host.queryReceipt']){
 const receipt=definitions[method+'.result'];if(!receipt.required.includes('fingerprint'))receipt.required.push('fingerprint');
}
for(const name of ['host.prepareWrite.params','host.invoke.params'])Object.assign(definitions[name].properties.content,{maxLength:65536});
const output={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://huhu.local/contracts/hap/v0.1/schema.json',title:'HAP v0.1',description:'u32 BE length includes the u8 JSON kind=1; identifiers are capped in UTF-8 bytes by codecs.',oneOf:[item,{type:'array',minItems:1,maxItems:8,items:item}],$defs:definitions};
bound(cursorRecovery);
const schemaText=JSON.stringify(output,null,2)+'\n';
writeFileSync(path.join(dir,'schema.json'),schemaText);
// Go's embed input is a byte-for-byte generated copy of the same public contract.
writeFileSync(path.join(root,'native/huhubot/internal/protocol/hap/schema_generated.json'),schemaText);
writeFileSync(path.join(dir,'methods.json'),JSON.stringify({protocolVersion:'0.1',schemaVersion:1,limits,methods},null,2)+'\n');
// Explicit Go DTOs for the complete version contract, separate from application commands.
function goType(s){
 if(s.oneOf){
  if(s.oneOf.every(v=>v.type==='object')){const props={},counts={};for(const v of s.oneOf){Object.assign(props,v.properties);for(const key of v.required)counts[key]=(counts[key]??0)+1;}return goType({type:'object',properties:props,required:Object.keys(counts).filter(k=>counts[k]===s.oneOf.length)});}
  if(s.oneOf.every(v=>v.type==='string'))return 'string';
  throw new Error('Go union requires explicit object variants');
 }
 if(s.type==='string')return 'string';if(s.type==='number'||s.type==='integer')return 'float64';if(s.type==='boolean')return 'bool';
 if(s.type==='array')return '[]'+goType(s.items);
 if(s.type==='object'){const fields=Object.entries(s.properties).map(([key,val])=>{const optional=!s.required.includes(key);const typ=goType(val);return `${key[0].toUpperCase()+key.slice(1)} ${optional&&!typ.startsWith('[]')?'*':''}${typ} \`json:"${key}${optional?',omitempty':''}"\``;});return 'struct {\n'+fields.join('\n')+'\n}';}
 throw new Error('Go type missing');
}
let go='// Code generated by contracts/hap/v0.1/generate.mjs; DO NOT EDIT.\npackage hap\n\n';
for(const [name,m]of Object.entries(methods)){
 const prefix=name.split('.').map(p=>p[0].toUpperCase()+p.slice(1)).join('');
 for(const kind of ['params','result'])go+=`type Contract${prefix}${kind[0].toUpperCase()+kind.slice(1)} ${goType(definitions[name+'.'+kind])}\n\n`;
}
const goOutput=path.join(root,'native/huhubot/internal/protocol/hap/methods_generated.go');
writeFileSync(goOutput,go);execFileSync('gofmt',['-w',goOutput]);

const memoryNS={kind:'agent',id:'agent:fixture'}, memoryScope={kind:'profile'};
const memoryBody={text:'fixture',hash:'sha256:'+'0'.repeat(64),provenance:'user',creatorKind:'user',sourceRefs:[],sourceScopes:[],derived:[]};
const globalPreviewBody={...memoryBody,hash:'sha256:f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d'};
const memoryItem={id:'memory:fixture',revision:'1',namespace:memoryNS,scope:memoryScope,state:'active',pinned:false,revisionId:'revision:fixture',body:memoryBody};
const memorySettings={namespace:memoryNS,revision:'1',enabled:true,eligible:false,reason:'BUDGET_NOT_CONFIGURED'};
const memoryCommand={commandId:'command:fixture',idempotencyKey:'key:fixture',profileId:'profile:fixture',commandEpoch:'1',expectedRevision:'1',namespace:memoryNS};
const memorySamples={
 'memory.list.params':{profileId:'profile:fixture',namespace:memoryNS,kind:'item',limit:20},
 'memory.list.result':{namespaceRevision:'1',items:[{kind:'item',item:memoryItem}]},
 'memory.get.params':{profileId:'profile:fixture',namespace:memoryNS,kind:'item',id:'memory:fixture'},
 'memory.get.result':{kind:'item',item:memoryItem},
 'memory.pin.params':{...memoryCommand,id:'memory:fixture',pinned:true},'memory.pin.result':memoryItem,
 'memory.correct.params':{...memoryCommand,action:'add',scope:memoryScope,text:'fixture'},'memory.correct.result':memoryItem,
 'memory.forget.params':{...memoryCommand,id:'memory:fixture'},'memory.forget.result':{id:'memory:fixture',revision:'2',namespace:memoryNS,scope:memoryScope,state:'forgotten',pinned:false},
 'memory.setAutoMaintenance.params':{...memoryCommand,enabled:true},'memory.setAutoMaintenance.result':memorySettings,
 'memory.proposeGlobal.params':{commandId:'command:fixture',idempotencyKey:'key:fixture',profileId:'profile:fixture',commandEpoch:'1',expectedRevision:'1',scope:memoryScope,sources:[],operation:'create',text:'fixture'},
 'memory.proposeGlobal.result':{id:'proposal:fixture',revision:'1',operation:'create',scope:memoryScope,body:globalPreviewBody,previewHash:'sha256:'+'0'.repeat(64),expiresAt:'2026-10-25T00:00:00Z',state:'pending'},
 'memory.resolveGlobal.params':{commandId:'command:fixture',idempotencyKey:'key:fixture',profileId:'profile:fixture',commandEpoch:'1',expectedRevision:'1',id:'proposal:fixture',decision:'approve',previewHash:'sha256:'+'0'.repeat(64)},
 'memory.resolveGlobal.result':{commandId:'command:fixture',receiptId:'receipt:fixture',revision:'1'},
};

// Golden byte fixtures are consumed by both production codecs' tests.
const valid=[{name:'hello',payload:{jsonrpc:'2.0',id:'c:hello',method:'protocol.hello',params:{protocolVersion:'0.1',client:{name:'fixture',version:'1'}}}},{name:'response',payload:{jsonrpc:'2.0',id:'s:receipt',result:{effectId:'effect:fixture',status:'committed'}}},{name:'batch',payload:[{jsonrpc:'2.0',id:'c:1',method:'service.health'},{jsonrpc:'2.0',id:'c:2',method:'profile.status'}]}];
valid.push({name:'cursor-expired',payload:{jsonrpc:'2.0',id:'c:tail',error:{code:-32000,message:'Request rejected',data:{kind:'CURSOR_EXPIRED',reason:'EVENT_CURSOR_EXPIRED',retryable:false,correlationId:'correlation:fixture',details:sample(cursorRecovery)}}}});
for(const f of valid){const p=Buffer.from(JSON.stringify(f.payload));const b=Buffer.alloc(p.length+5);b.writeUInt32BE(p.length+1);b[4]=1;p.copy(b,5);f.frameHex=b.toString('hex');}
const encode=(text,kind=1)=>{const p=Buffer.isBuffer(text)?text:Buffer.from(text);const b=Buffer.alloc(p.length+5);b.writeUInt32BE(p.length+1);b[4]=kind;p.copy(b,5);return b.toString('hex');};
const invalid=[
 {name:'zero',frameHex:'00000000',reason:'FRAME_EMPTY'},
 {name:'half-prefix',frameHex:'0000',reason:'TRUNCATED_FRAME'},
 {name:'half-body',frameHex:'00000008017b',reason:'TRUNCATED_FRAME'},
 {name:'oversize',frameHex:'00100001',reason:'FRAME_TOO_LARGE'},
 {name:'kind',frameHex:encode('{}',2),reason:'UNKNOWN_KIND'},
 {name:'utf8',frameHex:encode(Buffer.from([255])),reason:'INVALID_UTF8'},
 {name:'json',frameHex:encode('{'),reason:'INVALID_JSON'},
 {name:'empty-batch',frameHex:encode('[]'),reason:'BATCH_LIMIT'},
 {name:'batch-nine',frameHex:encode(JSON.stringify(Array.from({length:9},()=>valid[0].payload))),reason:'BATCH_LIMIT'},
 {name:'numeric-id',frameHex:encode('{"jsonrpc":"2.0","id":1,"method":"service.health"}'),reason:'INVALID_ENVELOPE'},
 {name:'params-array',frameHex:encode('{"jsonrpc":"2.0","id":"c:x","method":"service.health","params":[]}'),reason:'INVALID_PARAMS'},
 {name:'unknown-envelope-field',frameHex:encode('{"jsonrpc":"2.0","id":"c:x","method":"service.health","owner":true}'),reason:'INVALID_ENVELOPE'},
];
mkdirSync(path.join(dir,'fixtures'),{recursive:true});writeFileSync(path.join(dir,'fixtures/golden.json'),JSON.stringify({protocolVersion:'0.1',limits,valid,invalid},null,2)+'\n');
// Shared method-level validation corpus. Positive cases cover every DTO; the
// negative cases preserve reviewer inputs and reject before a trusted consumer.
function sample(s){
 for(const [name,value]of Object.entries(memorySamples))if(s===definitions[name])return structuredClone(value);
 if('const'in s)return s.const;if(s.enum)return s.enum[0];if(s.oneOf)return sample(s.oneOf[0]);
 if(s.type==='object'){const out=Object.fromEntries(Object.entries(s.properties).filter(([k])=>k!=='contextUsage'||s.required.includes(k)).map(([k,v])=>[k,sample(v)]));if(s.properties.kind?.enum?.includes('none')&&s.properties.afterSeq){out.kind='range';out.afterSeq='0';out.throughSeq='1';}return out;}
 if(s.type==='array')return Array.from({length:Math.max(s.minItems??0,1)},()=>sample(s.items));
 if(s.type==='string')return s.format==='date-time'?'2026-10-25T00:00:00Z':s.pattern?.startsWith('^sha256:')?'sha256:'+'0'.repeat(64):s.pattern?'1':'fixture';
 if(s.type==='number'||s.type==='integer')return s.minimum??1;if(s.type==='boolean')return true;throw new Error('sample missing');
}
const cases=[];
for(const method of Object.keys(methods))for(const part of ['params','result'])cases.push({name:method+'.'+part+'.valid',method,part,value:sample(definitions[method+'.'+part]),valid:true});
function negative(name,method,part,change){const value=sample(definitions[method+'.'+part]);change(value);cases.push({name,method,part,value,valid:false});}
negative('hello-uppercase-keys','protocol.hello','params',v=>{v.ProtocolVersion=v.protocolVersion;delete v.protocolVersion;v.Client={Name:'case-probe',Version:'1'};delete v.client;});
negative('hello-missing-name','protocol.hello','params',v=>delete v.client.name);
negative('hello-nested-unknown','protocol.hello','params',v=>v.client.owner=true);
negative('hello-invalid-protocol-enum','protocol.hello','params',v=>v.protocolVersion='99');
negative('hello-limits-drift','protocol.hello','result',v=>v.limits.maxFrameBytes=64);
for(const method of ['protocol.hello','service.status','profile.status','service.diagnostics'])negative(method+'-schema-99',method,'result',v=>v.schemaVersion=99);
negative('status-review-result','service.status','result',v=>{v.schemaVersion=99;v.state='not-ready';v.profile={revision:9007199254740992};});
negative('status-number-revision','service.status','result',v=>v.profile.revision=42);
negative('status-malformed-decimal','service.status','result',v=>v.profile.commandEpoch='01');
negative('status-invalid-date','service.status','result',v=>v.profile.createdAt='2026-02-30T00:00:00Z');
negative('status-not-utc','service.status','result',v=>v.profile.createdAt='2026-10-25T08:00:00+08:00');
negative('status-unknown-profile-key','service.status','result',v=>v.profile.owner=true);
negative('status-missing-profile-field','service.status','result',v=>delete v.profile.profileId);
negative('health-wrong-enum','service.health','result',v=>v.status='failed');
negative('service-unknown-param','service.health','params',v=>v.owner=true);
negative('shutdown-not-true','service.shutdown','result',v=>v.accepted=false);
negative('attach-invalid-date','host.attach','result',v=>v.expiresAt='2026-02-30T00:00:00Z');
negative('attach-not-utc','host.attach','result',v=>v.expiresAt='2026-10-25T01:00:00+01:00');
negative('attach-empty-capabilities','host.attach','params',v=>v.capabilities=[]);
negative('attach-unknown-param','host.attach','params',v=>v.owner=true);
negative('detach-missing-lease','host.detach','params',v=>delete v.leaseId);
negative('invoke-binding-required','host.invoke','params',v=>delete v.preview.binding);
negative('invoke-receipt-fingerprint-required','host.invoke','result',v=>delete v.fingerprint);
negative('invoke-review-input','host.invoke','params',v=>{v.expectedRevision=42;v.resource.revision=42;v.content={unexpected:true};v.unknown='extra';});
negative('invoke-number-resource-revision','host.invoke','params',v=>v.resource.revision=42);
negative('invoke-number-expected-revision','host.invoke','params',v=>v.expectedRevision=42);
negative('invoke-object-content','host.invoke','params',v=>v.content={unexpected:true});
negative('invoke-unknown-param','host.invoke','params',v=>v.unknown='extra');
negative('invoke-missing-effect','host.invoke','params',v=>delete v.effectId);
negative('invoke-receipt-enum','host.invoke','result',v=>v.status='saved');
negative('invoke-receipt-number-revision','host.invoke','result',v=>v.revision=42);
negative('receipt-query-unknown','host.queryReceipt','params',v=>v.owner=true);
negative('receipt-query-missing-effect','host.queryReceipt','params',v=>delete v.effectId);
negative('receipt-result-unknown','host.queryReceipt','result',v=>v.secret='forbidden-field');
negative('agent-persona-number','agents.get','result',v=>v.personaRevision=42);
negative('run-host-epoch-number','runs.start','params',v=>v.hostLeaseEpoch=42);
negative('agent-draft-server-revision','agents.create','params',v=>v.draft.model.revision='1');
negative('agent-draft-secret','agents.create','params',v=>v.draft.model.apiKey='forbidden-secret');
negative('agent-update-cas-required','agents.update','params',v=>delete v.expectedRevision);
negative('agent-disable-cas-required','agents.disable','params',v=>delete v.expectedRevision);
negative('agent-delete-id-required','agents.delete','params',v=>delete v.id);
negative('agent-delete-cas-required','agents.delete','params',v=>delete v.expectedRevision);
negative('model-bind-cas-required','models.bind','params',v=>delete v.expectedRevision);
negative('agent-status-state-enum','agents.get','result',v=>v.model.credentialStatus.state='connected');
negative('agent-default-marker-required','agents.get','result',v=>delete v.isDefault);
negative('group-members-cas-required','sessions.updateMembers','params',v=>delete v.expectedRevision);
negative('group-history-scope-required','sessions.updateMembers','params',v=>delete v.historyScope);
negative('group-history-range-bounds-required','sessions.updateMembers','params',v=>{v.historyScope={kind:'range'};});
negative('group-history-none-no-range','sessions.updateMembers','params',v=>{v.historyScope={kind:'none',afterSeq:'0'};});
negative('group-coordinator-cas-required','sessions.setCoordinator','params',v=>delete v.expectedRevision);
negative('group-target-duplicates','runs.start','params',v=>{v.targetAgentIds=['agent:b','agent:b'];});
negative('group-target-limit','runs.start','params',v=>{v.targetAgentIds=Array.from({length:33},(_,i)=>'agent:'+i);});
negative('group-incarnation-decimal','runs.get','result',v=>{v.group.members[0].incarnation='01';});
negative('group-proof-member-limit','runs.get','result',v=>{v.group.members=Array.from({length:101},(_,i)=>({agentId:'agent:'+i,incarnation:'1',historyRevision:'1'}));});
negative('group-proof-duplicate','runs.get','result',v=>{v.group.members=[v.group.members[0],v.group.members[0]];});
{const value=sample(definitions['runs.get.result']);value.group.members=Array.from({length:100},(_,i)=>({agentId:'agent:'+i,incarnation:'1',historyRevision:'1'}));cases.push({name:'group-proof-fanout-100',method:'runs.get',part:'result',value,valid:true});}
negative('search-no-explicit-scope','host.search','params',v=>{v.sources=[];v.scopes=[]});
// Source ranges retain original-document UTF-16 coordinates, not excerpt bytes.
const coordinateLocations=[
 ['runs.start','params',['sourceRefs',0]],
 ['host.read','params',['source']],
 ['host.read','result',['source']],
 ['host.search','params',['sources',0]],
 ['host.search','result',['matches',0,'source']],
 ['host.search','result',['matches',0,'range']],
];
for(const [method,part,location] of coordinateLocations){
 for(const [label,start,end,valid] of [
  ['original-edge',131071,131072,true],
  ['adjacent-edge',131072,131073,true],
  ['capture-maximum',1048575,1048576,true],
  ['above-capture-end',1048576,1048577,false],
  ['above-capture-start',1048577,1048576,false],
  ['fractional-start',0.5,1,false],
  ['fractional-end',0,1.5,false],
  ['negative-start',-1,1,false],
 ]){
  const value=sample(definitions[method+'.'+part]);
  let target=value;for(const key of location)target=target[key];
  if(location.at(-1)==='range')Object.assign(target,{start,end});
  else {target.kind='selection';target.range={start,end};}
  cases.push({name:method+'.'+part+'.'+location.join('-')+'.coordinate-'+label,method,part,value,valid});
 }
}
for(const method of ['host.read','host.search']){
 for(const [maxBytes,valid] of [[65536,true],[65537,false]]){
  const value=sample(definitions[method+'.params']);value.maxBytes=maxBytes;
  cases.push({name:method+'.read-byte-budget-'+maxBytes,method,part:'params',value,valid});
 }
}
negative('root-limits-incomplete','runs.get','result',v=>delete v.limits.maxWakes);
negative('root-limits-fractional','runs.get','result',v=>v.limits.rootChildren=1.5);
negative('root-limits-over-spec','runs.get','result',v=>v.limits.profileChildren=9);
negative('tail-limit-over','runs.subscribe','params',v=>v.limit=129);
negative('tail-page-over','runs.subscribe','params',v=>v.maxBytes=524289);
negative('tail-wait-over','runs.subscribe','params',v=>v.waitMillis=1001);
negative('tail-fractional-wait','runs.subscribe','params',v=>v.waitMillis=0.5);
negative('recovery-cas-required','runs.resume','params',v=>delete v.expectedRevision);
negative('recovery-generation-decimal','runs.resume','params',v=>v.recoveryGeneration='01');
negative('recovery-status-generation-number','runs.recovery','result',v=>v.generation=1);
negative('recovery-status-invalid-state','runs.recovery','result',v=>v.state='auto_running');
negative('recovery-tree-watermark-not-decimal','runs.recovery','result',v=>v.treeRevision='123');
negative('recovery-time-offset','runs.recovery','result',v=>v.checkedAt='2026-10-25T12:00:00+00:00');
negative('recovery-time-invalid-date','runs.recovery','result',v=>v.checkedAt='2026-02-30T12:00:00Z');
negative('recovery-affected-run-limit','runs.recovery','result',v=>v.affectedRunIds=Array.from({length:34},(_,i)=>'run:'+i));
negative('approval-cas-required','approvals.resolve','params',v=>delete v.expectedRevision);
negative('approval-effect-required','approvals.resolve','params',v=>delete v.effectId);
negative('approval-invalid-decision','approvals.resolve','params',v=>v.decision='execute');
negative('tail-snapshot-seq-number','runs.subscribe','result',v=>v.headSeq=9007199254740992);
const noCredential=sample(definitions['agents.create.params']);delete noCredential.draft.model.credentialRef;
cases.push({name:'agent-draft-without-credential',method:'agents.create',part:'params',value:noCredential,valid:true});

for(const [name,method,part,change]of [
 ['namespace-kind','memory.list','params',v=>v.namespace.kind='sponsor'],
 ['namespace-unknown','memory.list','params',v=>v.namespace.actor='agent:other'],
 ['old-owner','memory.list','params',v=>v.ownerId='agent:other'],
 ['scope-profile-id','memory.correct','params',v=>v.scope.id='forbidden'],
 ['cas-zero','memory.pin','params',v=>v.expectedRevision='0'],
 ['cas-missing','memory.forget','params',v=>delete v.expectedRevision],
 ['correct-add-id','memory.correct','params',v=>v.id='memory:other'],
 ['correct-model-proof','memory.correct','params',v=>v.sourceRefs=[]],
 ['get-noncontext-cursor','memory.get','params',v=>v.cursor='forbidden'],
 ['get-noncontext-limit','memory.get','params',v=>v.limit=20],
 ['get-settings-id','memory.get','params',v=>{v.kind='settings'}],
 ['null-derived','memory.get','result',v=>v.item.body.derived=null],
 ['forgotten-body','memory.forget','result',v=>v.body=memoryBody],
 ['forgotten-revision-id','memory.forget','result',v=>v.revisionId='old:body'],
 ['multiple-pointers','memory.get','result',v=>v.job={id:'forbidden'}],
 ['active-no-body','memory.pin','result',v=>delete v.body],
 ['untyped-private-scope','memory.get','result',v=>v.item.scope='private'],
 ['limit-over','memory.list','params',v=>v.limit=51],
 ['null-items','memory.list','result',v=>v.items=null],
 ['unsupported-body-field','memory.pin','result',v=>v.body.secret='forbidden'],
])negative('memory-'+name,method,part,change);
const contextGet={profileId:'profile:fixture',namespace:memoryNS,kind:'context',id:'run:fixture',limit:20};
cases.push({name:'memory-context-get',method:'memory.get',part:'params',value:contextGet,valid:true});
const contextPending={kind:'context',context:{runId:'run:fixture',runRevision:'1',namespace:memoryNS,scope:{kind:'work_thread',id:'thread:fixture'},state:'pending',reason:'CONTEXT_NOT_PREPARED',entries:[]}};
cases.push({name:'memory-context-pending',method:'memory.get',part:'result',value:contextPending,valid:true});
const contextInvalid=structuredClone(contextPending);contextInvalid.context.entries=[{}];
cases.push({name:'memory-context-pending-not-history',method:'memory.get',part:'result',value:contextInvalid,valid:false});


const redactedContext={kind:'context',context:{runId:'run:fixture',runRevision:'1',manifestRevision:'1',namespace:memoryNS,scope:{kind:'work_thread',id:'thread:fixture'},state:'redacted',entries:[{id:'entry:1',kind:'recent',representation:'excerpt',state:'redacted',reason:'MEMORY_FORGOTTEN',revision:'1',scope:memoryScope}]}};
cases.push({name:'memory-context-redacted-stub',method:'memory.get',part:'result',value:redactedContext,valid:true});
const staleContext=structuredClone(redactedContext);staleContext.context.entries[0].text='forbidden';
cases.push({name:'memory-context-redacted-stale-body',method:'memory.get',part:'result',value:staleContext,valid:false});
const noContextScope={profileId:'profile:fixture',namespace:memoryNS,kind:'context'};
cases.push({name:'memory-context-list-scope-required',method:'memory.list',part:'params',value:noContextScope,valid:false});

const emptyAlias={kind:'context',context:{runId:'run:fixture',runRevision:'1',manifestRevision:'1',namespace:memoryNS,scope:{kind:'work_thread',id:'thread:fixture'},state:'sealed',entries:[{id:'entry:alias',kind:'inbox',representation:'intent_alias',state:'readable',revision:'1',scope:{kind:'work_thread',id:'thread:fixture'},creatorKind:'user',preparationKind:'selected',text:'',contentHash:'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',source:{kind:'message',id:'message:fixture',revision:'1',hash:'sha256:'+'1'.repeat(64),namespace:'agent:fixture',workThreadId:'thread:fixture'},displaySlice:{start:0,end:0},partCount:1}]}};
cases.push({name:'memory-context-empty-intent-alias',method:'memory.get',part:'result',value:emptyAlias,valid:true});
for(const [name,change]of [
 ['nonempty-intent-alias',v=>{v.context.entries[0].text='duplicate';v.context.entries[0].displaySlice.end=9}],
 ['empty-nonalias',v=>v.context.entries[0].representation='full'],
 ['alias-text-required',v=>delete v.context.entries[0].text],
 ['alias-null-text',v=>v.context.entries[0].text=null],
 ['alias-part-count',v=>v.context.entries[0].partCount=0],
 ['alias-content-hash',v=>v.context.entries[0].contentHash='invalid'],
 ['alias-namespace',v=>v.context.namespace.kind='sponsor'],
 ['alias-redacted-body',v=>{v.context.entries[0].state='redacted';v.context.entries[0].reason='REVOKED'}],
]){const value=structuredClone(emptyAlias);change(value);cases.push({name:'memory-context-'+name,method:'memory.get',part:'result',value,valid:false});}
negative('memory-private-body-empty','memory.get','result',v=>v.item.body.text='');
negative('memory-request-text-empty','memory.correct','params',v=>v.text='');

writeFileSync(path.join(dir,'fixtures/methods.json'),JSON.stringify({protocolVersion:'0.1',cases},null,2)+'\n');
console.log(`Generated ${Object.keys(methods).length} explicit methods, shared frames and ${cases.length} method DTO cases`);
