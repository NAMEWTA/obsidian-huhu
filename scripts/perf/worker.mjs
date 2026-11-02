import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { connect } from '../obsidian-acceptance/cdp.mjs';
import { generateFixture } from './fixture.mjs';
const options=JSON.parse(process.argv[2]);
let chrome,cdp,work,closePromise;
const result={mode:options.mode,pid:process.pid,samples:[],errors:[],cleanup:{joined:false}};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function deadline(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Timeout: ${label}`)),ms);})]);}finally{clearTimeout(timer);}}
async function waitFor(fn,label){const end=Date.now()+options.timeout;while(Date.now()<end){if(await fn())return;await delay(20);}throw Error(`Timeout: ${label}`);}
try{
 work=await fs.mkdtemp(path.join(options.work,'owned-'));
 const {sampleNode}=await import(pathToFileURL(options.nodeBundle).href);
 const executable=options.chrome;
 chrome=spawn(executable,['--headless=new','--allow-file-access-from-files','--remote-debugging-port=0',`--user-data-dir=${path.join(work,'profile')}`,'about:blank'],{stdio:'ignore'});
 let spawnError;chrome.on('error',error=>{spawnError=error;});
 closePromise=once(chrome,'close');closePromise.catch(()=>{});result.cleanup.chromePid=chrome.pid??null;
 await waitFor(async()=>{if(spawnError)throw spawnError;try{const port=(await fs.readFile(path.join(work,'profile/DevToolsActivePort'),'utf8')).split('\n')[0];process.env.HUHU_CDP_URL=`http://127.0.0.1:${port}`;cdp=await connect('about:blank');return true;}catch{return false;}},'Chrome startup');
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');
 cdp.on('Runtime.exceptionThrown',error=>result.errors.push({stage:'browser-runtime',error}));
 await cdp.send('Page.navigate',{url:pathToFileURL(options.html).href});
 await waitFor(()=>cdp.evaluate('!!window.perfProbe'),'fixture module ready');
 const start=options.mode==='warm'?-1:0;
 for(let round=start;round<options.runs;round++){
  const fixture=generateFixture(options.fixture,options.seed),sample={round:round+options.offset,startedAt:new Date().toISOString(),fixtureDigest:fixture.digest,fixtureBytes:fixture.byteLength,counts:fixture.counts,status:'running'};
  try{
   sample.node=await deadline(sampleNode(fixture.data),options.timeout,'node sample');
   sample.browser=await deadline(cdp.evaluate(`perfProbe.sample(${JSON.stringify({tasks:fixture.data.tasks,count:fixture.data.count,now:fixture.data.now})},${JSON.stringify(options.fault)})`),options.timeout,'browser sample');
   if(result.errors.length)throw Error('Browser runtime errors');
   sample.status='ok';
  }catch(error){sample.status='failed';sample.error=String(error);try{sample.partial=await deadline(cdp.evaluate('perfProbe.partial'),1000,'partial sample');}catch{};result.errors.push({stage:'sample',round,error:String(error)});}
  sample.finishedAt=new Date().toISOString();
  if(round>=0)result.samples.push(sample);else result.warmup={status:sample.status,fixtureDigest:sample.fixtureDigest};
  // Never count a failed warmup or continue into a timed-out fixture.
  if(sample.status!=='ok')break;
 }
}catch(error){result.errors.push({stage:'worker',error:String(error)});}
finally{
 if(chrome?.pid&&chrome.exitCode===null){
  const terminate=setTimeout(()=>chrome.kill('SIGTERM'),2000),kill=setTimeout(()=>chrome.kill('SIGKILL'),5000);
  try{if(cdp)await Promise.race([cdp.send('Browser.close'),closePromise]);else chrome.kill('SIGTERM');await closePromise;result.cleanup.joined=true;}catch(error){result.errors.push({stage:'browser-close',error:String(error)});chrome.kill('SIGKILL');await closePromise.catch(()=>{});result.cleanup.joined=true;}finally{clearTimeout(terminate);clearTimeout(kill);}
 }else {if(chrome?.pid)await closePromise.catch(()=>{});result.cleanup.joined=true;}
 result.cleanup.chromeExitCode=chrome?.exitCode??null;result.cleanup.chromeSignal=chrome?.signalCode??null;
 cdp?.close();
 try{if(work)await fs.rm(work,{recursive:true,force:true,maxRetries:5,retryDelay:100});result.cleanup.removed=true;}catch(error){result.errors.push({stage:'cleanup',error:String(error)});result.cleanup.removed=false;}
 await fs.writeFile(options.result,JSON.stringify(result,null,2)+'\n');
 process.exitCode=result.errors.length?1:0;
}
