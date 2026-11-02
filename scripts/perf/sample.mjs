import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { sonnerStyles } from '../sonner-styles.mjs';
import { radixOwnerDocument } from '../radix-owner-document.mjs';
import { generateFixture, DEFAULT_SEED, hash } from './fixture.mjs';
export function parseOptions(args){
 const values={fixture:'small',runs:5,seed:DEFAULT_SEED,timeout:30000,mode:'both'};
 const seen=new Set();
 for(let i=0;i<args.length;i++){
  const key=args[i]?.replace(/^--/,'');if(!['fixture','runs','seed','out','timeout','fault','mode'].includes(key)||seen.has(key)||args[i+1]===undefined||args[i+1].startsWith('--'))throw Error(`Invalid argument ${args[i]}`);
  seen.add(key);values[key]=['runs','seed','timeout'].includes(key)?Number(args[++i]):args[++i];
 }
 if(!values.out||!['small','large'].includes(values.fixture)||!Number.isSafeInteger(values.runs)||values.runs<1||values.runs>100||!Number.isSafeInteger(values.seed)||values.seed<0||values.seed>0xffffffff||!Number.isSafeInteger(values.timeout)||values.timeout<100||values.timeout>120000||!['cold','warm','both'].includes(values.mode)||(values.fault!==undefined&&values.fault!=='input'))throw Error('Invalid sampling options');
 return values;
}
export function summarize(samples){
 const groups=new Map();
 for(const sample of samples)for(const row of [...(sample.node?.rows??[]),...(sample.browser?.rows??[])]){
  const key=`${sample.mode}:${row.scenario}`;
  if(!groups.has(key))groups.set(key,{mode:sample.mode,scenario:row.scenario,measurement_kind:row.measurement_kind,unit:row.unit,values:[]});
  if(sample.status==='ok'&&row.status==='ok')groups.get(key).values.push(row.value);
 }
 return [...groups.values()].map(group=>{const values=group.values.sort((a,b)=>a-b);return {...group,count:values.length,p50:values.length?values[Math.floor((values.length-1)*.5)]:null,p95:values.length?values[Math.floor((values.length-1)*.95)]:null};});
}
const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
function csv(result){const header=['mode','round','scenario','measurement_kind','start_marker','end_marker','start','end','value','unit','status','error'];return [header.join(','),...result.samples.flatMap(sample=>{
 const rows=[...(sample.node?.rows??[]),...(sample.browser?.rows??[])];
 if(sample.status!=='ok')return [[sample.mode,sample.round,'sample','error','','','','','','',sample.status,sample.error].map(quote).join(',')];
 return rows.map(row=>[sample.mode,sample.round,row.scenario,row.measurement_kind,row.start_marker,row.end_marker,row.start,row.end,row.value,row.unit,row.status,''].map(quote).join(','));
 })].join('\n')+'\n';}
export async function main(args){
 const options=parseOptions(args),root=path.resolve(import.meta.dirname,'../..'),out=path.resolve(options.out);
 await fs.mkdir(out,{recursive:true});
 const fixture=generateFixture(options.fixture,options.seed),result={schema:1,options,startedAt:new Date().toISOString(),status:'running',environment:{os:process.platform,arch:process.arch,node:process.version,cpus:os.cpus().length},fixture:{digest:fixture.digest,counts:fixture.counts,bytes:fixture.byteLength},inputs:[],samples:[],workers:[],errors:[],boundaries:['Obsidian host is fixture; production notifications/task activate calls only','Real TaskService/Repository and Chromium components; real IndexedDB transactions','Archives parsed/indexed by ArchiveIndex; comments catalog and LocalHistoryStore are production queries','No Obsidian or HUHU Browser, no external accounts/network','300ms startup / 250ms interaction are original scenario labels, never CI pass thresholds']};
 let work;
 try{
  const chrome=process.env.HUHU_CHROME_EXECUTABLE||'google-chrome';
  result.environment.chromium=execFileSync(chrome,['--version'],{encoding:'utf8',timeout:10000}).trim();
  work=await fs.mkdtemp(path.join(os.tmpdir(),'huhu-perf-'));
  const nodeBundle=path.join(work,'node-fixture.mjs'),browserBundle=path.join(work,'browser-fixture.js');
  const common={absWorkingDir:root,bundle:true,metafile:true,jsx:'automatic',jsxImportSource:'react',alias:{obsidian:path.join(root,'scripts/obsidian-stub.ts'),electron:path.join(root,'scripts/fixtures/dev-overhaul-startup/electron.mjs')},loader:{'.svg':'text','.md':'text'},define:{'process.env.NODE_ENV':'"production"'}};
  const nodeBuild=await build({...common,entryPoints:['scripts/perf/node-fixture.ts'],outfile:nodeBundle,platform:'node',format:'esm',banner:{js:'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);'}});
  const browserBuild=await build({...common,entryPoints:['scripts/perf/browser-fixture.tsx'],outfile:browserBundle,platform:'browser',format:'esm',plugins:[sonnerStyles,radixOwnerDocument]});
  const inputPaths=[...new Set([...Object.keys(nodeBuild.metafile.inputs),...Object.keys(browserBuild.metafile.inputs),'styles.css','scripts/perf/sample.mjs','scripts/perf/worker.mjs','scripts/perf/fixture.mjs','scripts/obsidian-acceptance/cdp.mjs','scripts/sonner-styles.mjs','scripts/radix-owner-document.mjs'].filter(p=>!p.includes(':')))].sort();
  for(const file of inputPaths)result.inputs.push({path:file,sha256:hash(await fs.readFile(path.resolve(root,file)))});
  result.inputDigest=hash(JSON.stringify(result.inputs));result.compiled={node:hash(await fs.readFile(nodeBundle)),browser:hash(await fs.readFile(browserBundle))};
  await fs.copyFile(path.join(root,'styles.css'),path.join(work,'styles.css'));
  const html=path.join(work,'fixture.html');
  await fs.writeFile(html,'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="styles.css"><style>html,body{margin:0;padding:12px;color:#222;background:white;font:14px Arial}input,button{font:inherit}</style><script type="module" src="browser-fixture.js"></script>');
  // One child per cold round; exactly one warm child with an excluded prewarm.
  const jobs=[];if(options.mode!=='warm')for(let i=0;i<options.runs;i++)jobs.push({mode:'cold',runs:1,offset:i});if(options.mode!=='cold')jobs.push({mode:'warm',runs:options.runs,offset:0});
  for(const [index,job] of jobs.entries()){
   const output=path.join(out,`worker-${String(index).padStart(3,'0')}.json`),config={...options,...job,work,nodeBundle,html,chrome,result:output};
   const child=spawn(process.execPath,[path.join(root,'scripts/perf/worker.mjs'),JSON.stringify(config)],{stdio:['ignore','pipe','pipe']});
   let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{if(log.length<2_000_000)log+=chunk;});
   const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
   await fs.writeFile(path.join(out,`worker-${String(index).padStart(3,'0')}.log`),log);
   let report;try{report=JSON.parse(await fs.readFile(output,'utf8'));}catch(error){report={samples:[],errors:[{error:`Worker report unavailable: ${error}`}],cleanup:{joined:false}};}
   result.workers.push({mode:job.mode,...exit,...report,samples:undefined});
   result.samples.push(...report.samples.map(sample=>({...sample,mode:job.mode,pid:report.pid})));
   if(exit.code!==0||report.errors.length||!report.cleanup.joined){result.errors.push({job:index,exit,errors:report.errors});break;}
  }
  const expected=options.runs*(options.mode==='both'?2:1);
  if(result.samples.length!==expected)result.errors.push({error:`Expected ${expected} measured samples, got ${result.samples.length}`});
  result.summary=summarize(result.samples);
  result.status=result.errors.length?'failed':'passed';
 }catch(error){result.status='failed';result.errors.push({error:String(error),stack:error.stack});}
 finally{
  result.finishedAt=new Date().toISOString();
  if(work)try{await fs.rm(work,{recursive:true,force:true,maxRetries:5,retryDelay:100});result.temporaryFilesRemoved=true;}catch(error){result.status='failed';result.errors.push({error:`Cleanup: ${error}`});}
  result.timeouts=result.errors.filter(error=>JSON.stringify(error).includes('Timeout')).length;
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');await fs.writeFile(path.join(out,'samples.csv'),csv(result));
  console.log(`perf: ${result.status}; ${result.samples.length} samples; ${out}`);
 }
 return result.status==='passed'?0:1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)process.exitCode=await main(process.argv.slice(2));
