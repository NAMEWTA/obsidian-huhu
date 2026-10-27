import { performance } from 'node:perf_hooks';
const maxFrameBytes=1024*1024;
const template={jsonrpc:'2.0',id:'c:probe',method:'runs.start',params:{body:''}};
const baseline=JSON.stringify(template);
template.params.body='a'.repeat(maxFrameBytes-1-Buffer.byteLength(baseline));
const json=JSON.stringify(template); const payload=Buffer.from(json,'utf8');
const body=Buffer.concat([Buffer.from([1]),payload]);
const frame=Buffer.allocUnsafe(body.length+4);frame.writeUInt32BE(body.length,0);body.copy(frame,4);
const timings=[];for(let i=0;i<101;i++){const start=performance.now();const decoded=JSON.parse(frame.subarray(5).toString('utf8'));if(decoded.id!=='c:probe')throw Error('decode');if(i)timings.push(performance.now()-start);}
timings.sort((a,b)=>a-b);
console.log(JSON.stringify({scope:'size/parse feasibility only; not production codec acceptance',node:process.version,platform:process.platform+'/'+process.arch,maxFrameBytes,frameLengthIncludingPrefix:frame.length,bodyLengthIncludingKind:body.length,jsonPayloadBytes:payload.length,jsonParseP50Ms:timings[50],jsonParseP95Ms:timings[95],samples:timings.length,batch:{maxItemsCandidate:8,totalFrameLimitStillApplies:true}},null,2));
