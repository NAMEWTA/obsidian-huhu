import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {HostReadService} from '/home/wta/orca/workspaces/obsidian-huhu/bot/src/modules/huhubot/services/host-read/host-read.ts';
import {HapConnection} from '/home/wta/orca/workspaces/obsidian-huhu/bot/src/modules/huhubot/core/protocol/connection.ts';
import {EventClient} from '/home/wta/orca/workspaces/obsidian-huhu/bot/src/modules/huhubot/services/events/event-client.ts';
const child=spawn(process.argv[2],['-test.run=^TestReviewEventsRunner$'],{stdio:['pipe','pipe','pipe'],env:{...process.env,REVIEW_PROFILES:process.argv[3]}});
let stderr='',forced=false;child.stderr.on('data',x=>stderr+=x);
const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
const timers={after(ms,fn){const timer=setTimeout(fn,ms);return()=>clearTimeout(timer)}};
const transport={send(bytes){return new Promise((resolve,reject)=>child.stdin.write(bytes,e=>e?reject(e):resolve()))},onData(fn){child.stdout.on('data',fn);return()=>child.stdout.off('data',fn)},onClose(fn){const close=()=>fn(new Error('closed'));child.on('exit',close);return()=>child.off('exit',close)},close(){child.stdin.end()}};
const connection=new HapConnection(transport,timers);let bot,events,hostService;
const check=(ok,message)=>{if(!ok)throw new Error(message)};
let serial=0;
(async()=>{try{
 bot=await connection.connect({name:'actual-events',version:'1'});events=new EventClient(bot,timers,{poll:false});
 const p=bot.hello.profile;const meta=(key,rev)=>({commandId:key,idempotencyKey:key,profileId:p.profileId,commandEpoch:p.commandEpoch,...(rev?{expectedRevision:rev}:{})});
 const agents=await bot.agents.list({profileId:p.profileId});
 const start=async intent=>{const key='session-'+(++serial);const session=await bot.sessions.create({...meta(key),kind:'direct',title:key,memberIds:[agents.items[0].id]});return bot.runs.start({...meta('run-'+serial,session.revision),sessionId:session.id,intent,sourceRefs:[]})};
 const wait=async(id,states=['succeeded','failed','canceled'])=>{const until=Date.now()+5000;while(Date.now()<until){const run=await bot.runs.get({profileId:p.profileId,id});if(states.includes(run.status))return run;await new Promise(resolve=>setTimeout(resolve,5))}throw new Error('run did not reach '+states)};

 const result=[];
 for(const size of [65000,65536]){
  const r=await start(String(size));const durable=await wait(r.runId);
  const stream=events.attach(r.runId);const attempts=[];for(let i=0;i<3;i++){await stream.refresh();const v=stream.getSnapshot();attempts.push({state:v.state,error:v.error,seq:v.projection.seq,status:v.projection.status,textBytes:v.projection.pendingText.length})}
  const view=stream.getSnapshot();
  const large=await bot.runs.subscribe({profileId:p.profileId,runId:r.runId,afterSeq:'0',limit:64,maxBytes:524288});
  result.push({attempts,size,durable:durable.status,state:view.state,error:view.error,projectionStatus:view.projection.status,seq:view.projection.seq,textBytes:view.projection.pendingText.length,largePageEvents:large.events.length,largeHead:large.headSeq});stream.dispose();
 }
 console.log(JSON.stringify(result));check(result.every(v=>v.state==='ready'&&v.projectionStatus==='succeeded'&&v.textBytes===v.size),'accepted maximum Engine event stalls actual EventClient');
}finally{events?.dispose();hostService?.dispose();bot?.close();transport.close();const kill=setTimeout(()=>{forced=true;child.kill('SIGKILL')},3000);const result=await exited;clearTimeout(kill);check(!forced&&result.code===0&&!stderr,'child did not Wait cleanly '+JSON.stringify(result)+' '+stderr)}})().catch(error=>{console.error(error.message);process.exitCode=1});