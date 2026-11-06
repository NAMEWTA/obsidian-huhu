import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
const exec=promisify(execFile);
const helper=path.join(import.meta.dirname,'ready-documents.ts');
async function browserScenario(code,{slowMain=false,slowFrame=false}={}) {
 const compiled=await build({stdin:{contents:`import {readyDocuments} from ${JSON.stringify(helper)};${code}`,resolveDir:import.meta.dirname,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser'});
 const script=compiled.outputFiles[0].text;
 let mainResponse,frameResponse,frameStartedResponse;const observed=[];
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  if(req.url==='/') {
   mainResponse=res;res.write('<!doctype html><head><script src="/entry.js"></script></head>');
   if(!slowMain)res.end('<body></body>');
  }else if(req.url==='/entry.js') {res.setHeader('Content-Type','text/javascript');res.end(script);}
  else if(req.url==='/release-main'){observed.push('main-released');mainResponse.end('<body><iframe></iframe><script>globalThis.beginFrame?.()</script></body>');res.end('ok');}
  else if(req.url==='/frame-block.js') {observed.push('iframe-parser-blocked');frameResponse=res;frameStartedResponse?.end('started');if(!slowFrame)res.end('');}
  else if(req.url==='/frame-started'){frameStartedResponse=res;if(frameResponse)res.end('started');}
  else if(req.url==='/release-frame'){observed.push('frame-released');frameResponse.end('');res.end('ok');}
  else res.end('');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const directory=await mkdtemp(path.join(os.tmpdir(),'huhu-readiness-chrome-'));
 try {
  const address=server.address();
  const result=await exec(process.env.HUHU_CHROME_EXECUTABLE??'google-chrome',['--headless=new','--virtual-time-budget=5000',`--user-data-dir=${directory}`,'--dump-dom',`http://127.0.0.1:${address.port}/`],{timeout:20000,maxBuffer:1024*1024});
  const encoded=/<pre id="result">([^<]+)<\/pre>/.exec(result.stdout)?.[1];
  assert.ok(encoded,`browser did not report a result: ${result.stdout}`);
  return {result:JSON.parse(encoded.replaceAll('&quot;','"').replaceAll('&amp;','&')),observed};
 }finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await rm(directory,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
}
const report=`function report(value){const pre=document.createElement('pre');pre.id='result';pre.textContent=JSON.stringify(value);document.body.append(pre);}`;
test('real parser-blocked iframe reproduces the old null body mount before final srcdoc readiness',async()=>{
 const {result}=await browserScenario(`${report}
 window.legacyMount=()=>{const doc=document.querySelector('iframe').contentDocument;let error;try{doc.body.append(doc.createElement('main'));}catch(e){error=String(e);}report({url:doc.URL,body:doc.body===null,error});};
 document.addEventListener('DOMContentLoaded',()=>{const frame=document.createElement('iframe');document.body.append(frame);frame.srcdoc='<head><script>parent.legacyMount()<\\/script></head><body></body>';});`);
 assert.equal(result.url,'about:srcdoc');assert.equal(result.body,true);assert.match(result.error,/null.*append/);
});
test('delayed main and parser-blocked srcdoc mount the final documents once, never the initial about:blank document',async()=>{
 const {result,observed}=await browserScenario(`${report}
 let done=false;let pendingAtMain=false;let emptyDuringParse=false;let initial;
 const task=readyDocuments(document).then(docs=>{done=true;for(const doc of Object.values(docs)){const mount=doc.createElement('main');mount.dataset.mounted='true';doc.body.append(mount);}report({mainReady:docs.main.readyState,secondReady:docs.second.readyState,url:docs.second.URL,initialReplaced:docs.second!==initial,counts:Object.values(docs).map(doc=>doc.querySelectorAll('[data-mounted]').length),pendingAtMain,emptyDuringParse});});
 document.addEventListener('DOMContentLoaded',()=>{pendingAtMain=!done;});
 window.beginFrame=()=>{const frame=document.querySelector('iframe');initial=frame.contentDocument;frame.srcdoc='<head><script src="/frame-block.js"><\\/script></head><body></body>';fetch('/frame-started').then(()=>{emptyDuringParse=frame.contentDocument.body===null;fetch('/release-frame');});};
 fetch('/release-main');
 `,{slowMain:true,slowFrame:true});
 assert.equal(result.url,'about:srcdoc');assert.equal(result.secondReady,'complete');assert.equal(result.initialReplaced,true);assert.deepEqual(result.counts,[1,1]);assert.equal(result.pendingAtMain,true);assert.equal(result.emptyDuringParse,true);assert.ok(observed.includes('main-released'));
});
test('a srcdoc readiness deadline rejects instead of accepting an initial complete about:blank document',async()=>{
 const {result}=await browserScenario(`${report}
 document.addEventListener('DOMContentLoaded',()=>{const frame=document.createElement('iframe');document.body.append(frame);readyDocuments(document,20).then(()=>report({resolved:true}),error=>report({error:String(error),url:frame.contentDocument.URL}));});`);
 assert.equal(result.url,'about:blank');assert.match(result.error,/Timed out: fixture srcdoc document/);
});
test('a main parser readiness deadline rejects and releases its listener before later DOM completion',async()=>{
 const {result}=await browserScenario(`${report}
 readyDocuments(document,20).then(()=>{throw Error('Unexpected readiness');},error=>{document.addEventListener('DOMContentLoaded',()=>report({error:String(error)}));fetch('/release-main');});`,{slowMain:true});
 assert.match(result.error,/Timed out: fixture main document/);
});
test('already complete main and srcdoc documents are checked after registering the load listener',async()=>{
 const {result}=await browserScenario(`${report}
 document.addEventListener('DOMContentLoaded',()=>{const frame=document.createElement('iframe');frame.srcdoc='<body>Final document</body>';frame.addEventListener('load',async()=>{const final=frame.contentDocument;const docs=await readyDocuments(document);report({same:docs.second===final,url:docs.second.URL,body:docs.second.body.textContent});},{once:true});document.body.append(frame);});`);
 assert.equal(result.same,true);assert.equal(result.url,'about:srcdoc');assert.equal(result.body,'Final document');
});
