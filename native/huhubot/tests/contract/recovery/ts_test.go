package recovery_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type wireEngine struct{ runs, resumes atomic.Int32 }

func (e *wireEngine) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	e.runs.Add(1)
	return api.EngineResult{}, fmt.Errorf("unexpected new Engine.Run")
}
func (e *wireEngine) Resume(_ context.Context, i api.EngineResumeInput, emit func(api.EngineEvent) error) (api.EngineResult, error) {
	e.resumes.Add(1)
	if i.Decision.Status != "completed" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "LEAD_V8_DURABLE_CHILD_RESULT" {
		return api.EngineResult{}, fmt.Errorf("lost original consumed decision")
	}
	if e := emit(api.EngineEvent{Type: "text.delta", Text: "WIRE_RECOVERED_ORIGINAL"}); e != nil {
		return api.EngineResult{}, e
	}
	return api.EngineResult{Status: "finished", Text: "WIRE_RECOVERED_ORIGINAL"}, nil
}
func (e *wireEngine) InspectCheckpoint(c context.Context, i api.CheckpointInspection) error {
	return validOldCheckpoint(c, i)
}

func TestRecoveryRunnerProcess(t *testing.T) {
	index := -1
	for i, a := range os.Args {
		if a == "--recovery-runner" {
			index = i
			break
		}
	}
	if index < 0 {
		return
	}
	if len(os.Args) < index+3 {
		os.Exit(2)
	}
	root, label := os.Args[index+1], os.Args[index+2]
	runCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	engine := &wireEngine{}
	core, e := bootstrap.OpenWithOptions(runCtx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine})
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		cancel()
		os.Exit(1)
	}
	server := stdio.New(os.Stdin, os.Stdout, core.API, api.NewConnectionIdentity("stdio-recovery", "owner", true))
	e = server.Run(runCtx)
	server.Close()
	ce := core.Close()
	cancel()
	b, je := json.Marshal(map[string]int32{"runs": engine.runs.Load(), "resumes": engine.resumes.Load()})
	we := os.WriteFile(filepath.Join(root, "observations-"+label+".json"), b, 0600)
	if e != nil || ce != nil || je != nil || we != nil {
		fmt.Fprintln(os.Stderr, e, ce, je, we)
		os.Exit(1)
	}
	os.Exit(0)
}

const actualRecoveryFixture = `
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {HapConnection} from '__REPO__/src/modules/huhubot/core/protocol/connection.ts';
import {HapDecoder,encodeHapFrame} from '__REPO__/src/modules/huhubot/core/protocol/codec.ts';
import {EventClient} from '__REPO__/src/modules/huhubot/services/events/event-client.ts';
import {RecoveryClient} from '__REPO__/src/modules/huhubot/services/recovery/recovery-client.ts';
const check=(x,m)=>{if(!x)throw new Error(m)},delay=ms=>new Promise(r=>setTimeout(r,ms));
const timers={after(ms,fn){const t=setTimeout(fn,ms);return()=>clearTimeout(t)}};
const old=JSON.parse(readFileSync(process.argv[4],'utf8')),observations={};
async function launch(root,label,drop=false,sent=[]){
 const child=spawn(process.argv[2],['-test.run=^TestRecoveryRunnerProcess$','--','--recovery-runner',root,label],{stdio:['pipe','pipe','pipe']});let stderr='',dropId='',dropped=false,wire='',held,deliver;child.stderr.on('data',b=>stderr+=b);const exited=new Promise(r=>child.once('exit',(code,signal)=>r({code,signal})));const outgoing=new HapDecoder(),incoming=new HapDecoder();
 const transport={send(b){for(const payload of outgoing.push(b))for(const m of Array.isArray(payload)?payload:[payload])if(m.method==='runs.resume'){sent.push(structuredClone(m.params));if(drop&&!dropped&&!dropId)dropId=m.id}return new Promise((r,j)=>child.stdin.write(b,e=>e?j(e):r()))},onData(fn){deliver=fn;const f=b=>{for(const payload of incoming.push(b)){wire+=JSON.stringify(payload);if(!Array.isArray(payload)&&payload.id===dropId){if(drop==='hold')held=payload;else dropped=true;continue}fn(encodeHapFrame(payload))}};child.stdout.on('data',f);return()=>child.stdout.off('data',f)},onClose(fn){const f=()=>fn(new Error('actual EOF'));child.on('exit',f);return()=>child.off('exit',f)},close(){child.stdin.end()}};
 const connection=new HapConnection(transport,timers);const bot=await connection.connect({name:'actual-recovery',version:'1'});
 return{bot,sent,wasDropped:()=>dropped,releaseReceipt(){check(held&&deliver,'actual receipt barrier not reached');deliver(encodeHapFrame(held));held=undefined},async close(){bot.close();transport.close();let forced=false;const t=setTimeout(()=>{forced=true;child.kill('SIGKILL')},4000);const x=await exited;clearTimeout(t);check(!forced&&x.code===0&&!stderr,'actual Runner cleanup '+JSON.stringify(x)+' '+stderr);check(!wire.includes('lead-v8-complete-cp'),'private CP payload crossed HAP')}}
}
async function wait(bot,id){const end=Date.now()+5000;while(Date.now()<end){const r=await bot.runs.get({profileId:bot.hello.profile.profileId,id});if(['succeeded','failed','canceled'].includes(r.status))return r;await delay(3)}throw new Error('Run did not end '+id)}
let live,events,recovery;
(async()=>{try{
 for(const mode of ['normal','uncertain','member-window']){
  const root=process.argv[3]+'/'+mode,sent=[];live=await launch(root,'first',mode==='member-window'?'hold':mode==='uncertain',sent);let bot=live.bot;events=new EventClient(bot,timers,{poll:false});const current=await bot.runs.get({profileId:bot.hello.profile.profileId,id:old.modelRunId});const stream=events.attach(current.id,current.group,current.revision);await stream.refresh();
  const child=old.resumeDecision.Children[0].runId,other=await bot.runs.get({profileId:bot.hello.profile.profileId,id:child});const sibling=events.attach(child,other.group,other.revision);await sibling.refresh();const beforeSibling=sibling.getSnapshot().projection;
  recovery=new RecoveryClient(bot,old.modelRunId,events);const status=await recovery.inspect();check(status.state==='ready'&&status.rootRunId===old.rootRunId&&status.affectedRunIds.length===2&&status.affectedRunIds.includes(old.modelRunId)&&status.affectedRunIds.includes(old.rootRunId),'real affected tree/CAS qualification');
  const command={profileId:bot.hello.profile.profileId,commandEpoch:bot.hello.profile.commandEpoch,commandId:'wire-'+mode,idempotencyKey:'wire-'+mode,expectedRevision:status.revision,id:old.modelRunId,recoveryGeneration:status.generation};
  const first=recovery.resume(command,{timeoutMs:mode==='uncertain'?250:3000}),second=recovery.resume(command);void first.catch(()=>{});void second.catch(()=>{});check(first===second,'double click did not share one pending command');
  if(mode==='normal'){const receipt=await first;check((await second).receiptId===receipt.receiptId&&receipt.runId===old.modelRunId&&recovery.getSnapshot().command.state==='accepted','same original receipt');await wait(bot,old.rootRunId);await stream.refresh();check(stream.getSnapshot().projection.pendingText==='WIRE_RECOVERED_ORIGINAL'&&stream.getSnapshot().projection.status==='succeeded','accepted recovery did not reanchor actual target');check(sibling.getSnapshot().projection===beforeSibling,'target reanchor changed sibling projection');check(sent.length===1,'double click made extra RPC');observations.sameRun=true;observations.wholeTreeScope=true;observations.doubleClick=true;observations.targetReanchor=true;observations.siblingUntouched=true}
  else if(mode==='uncertain'){
   const results=await Promise.allSettled([first,second]);check(results.every(r=>r.status==='rejected')&&live.wasDropped()&&recovery.getSnapshot().command.state==='uncertain','lost real reply was reported as success/rejection');await wait(bot,old.rootRunId);const original=JSON.stringify(recovery.getSnapshot().command.params);events.setClient(undefined);await live.close();live=undefined;live=await launch(root,'second',false,sent);bot=live.bot;events.setClient(bot);recovery.setClient(bot);check(sent.length===1,'reconnect automatically replayed command');const receipt=await recovery.retry();check(receipt.runId===old.modelRunId&&receipt.commandId===command.commandId&&recovery.getSnapshot().command.state==='accepted'&&JSON.stringify(recovery.getSnapshot().command.params)===original&&sent.length===2&&JSON.stringify(sent[0])===JSON.stringify(sent[1]),'explicit retry did not restore exact original command receipt');observations.actualReplyLost=true;observations.explicitOriginalRetry=true;observations.reconnectNoReplay=true
  }else{
   await wait(bot,old.rootRunId);await stream.refresh();check(stream.getSnapshot().projection.pendingText==='WIRE_RECOVERED_ORIGINAL','actual body not cached before membership change');const session=await bot.sessions.get({profileId:bot.hello.profile.profileId,id:current.sessionId});await bot.sessions.updateMembers({profileId:bot.hello.profile.profileId,commandEpoch:bot.hello.profile.commandEpoch,commandId:'remove-before-reanchor',idempotencyKey:'remove-before-reanchor',expectedRevision:session.revision,id:session.id,memberIds:session.memberIds.filter(id=>id!==current.agentId),historyScope:{kind:'none'}});live.releaseReceipt();const receipt=await first;check((await second).receiptId===receipt.receiptId&&recovery.getSnapshot().command.state==='accepted'&&stream.getSnapshot().projection.pendingText===''&&stream.getSnapshot().projection.access==='denied','accepted receipt did not reanchor current Group or was falsely made uncertain');const history=await bot.sessions.history({profileId:bot.hello.profile.profileId,sessionId:session.id,limit:100});check(history.items.some(m=>m.text==='WIRE_RECOVERED_ORIGINAL'),'group removal erased legally published transcript');observations.groupRevokedReanchor=true;observations.publishedHistoryRetained=true
  }
  const budget=await bot.collaboration.budget({profileId:bot.hello.profile.profileId,runId:old.modelRunId});check(budget.chargedTokens==='7'&&budget.reservedTokens==='0'&&budget.knowledge==='unknown','recovery cleared old unknown usage');observations.originalUnknownUsage=true;
  recovery.dispose();await recovery.drained();recovery=undefined;events.dispose();events=undefined;await live.close();live=undefined;
  const one=JSON.parse(readFileSync(root+'/observations-first.json','utf8'));check(one.runs===0&&one.resumes===1,'inspection/replay called wrong model entry');if(mode==='uncertain'){const two=JSON.parse(readFileSync(root+'/observations-second.json','utf8'));check(two.runs===0&&two.resumes===0,'retry reopened completed model')}
 }
 observations.allProcessesWait=true;console.log(JSON.stringify(observations));
}finally{recovery?.dispose();if(recovery)await recovery.drained();events?.dispose();await live?.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
`

func TestActualRecoveryClientUsesOriginalRunCASAndExplicitUncertainRetryAcrossProcesses(t *testing.T) {
	repo, e := filepath.Abs(filepath.Join("..", "..", "..", "..", ".."))
	if e != nil {
		t.Fatal(e)
	}
	root := t.TempDir()
	for _, name := range []string{"normal", "uncertain", "member-window"} {
		copyTree(t, filepath.Join("testdata", "schema8", "inflight"), filepath.Join(root, name))
	}
	source, bundle := filepath.Join(root, "recovery.ts"), filepath.Join(root, "recovery.cjs")
	if e = os.WriteFile(source, []byte(strings.ReplaceAll(actualRecoveryFixture, "__REPO__", filepath.ToSlash(repo))), 0600); e != nil {
		t.Fatal(e)
	}
	buildCtx, bc := context.WithTimeout(ctx, time.Minute)
	defer bc()
	build := exec.CommandContext(buildCtx, "pnpm", "exec", "esbuild", source, "--bundle", "--platform=node", "--format=cjs", "--outfile="+bundle)
	build.Dir = repo
	if out, e := build.CombinedOutput(); e != nil {
		t.Fatalf("production RecoveryClient bundle: %v %s", e, out)
	}
	runCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(runCtx, "node", bundle, os.Args[0], root, filepath.Join(repo, "native/huhubot/tests/contract/recovery/testdata/schema8/inflight-resume-entered.json"))
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if e = cmd.Run(); e != nil {
		t.Fatalf("actual TS↔Go recovery %v\n%s\n%s", e, out.String(), stderr.String())
	}
	var observed map[string]bool
	if stderr.Len() != 0 || cmd.ProcessState == nil || json.Unmarshal(out.Bytes(), &observed) != nil || len(observed) != 12 {
		t.Fatalf("invalid actual output/Wait %s %s", out.String(), stderr.String())
	}
	for key, value := range observed {
		if !value {
			t.Fatal(key)
		}
	}
	t.Logf("production RecoveryClient/EventClient/HapConnection ↔ actual Go stdio/Facade/SQLite/original Executor; one actual committed reply lost/another held across membership removal, 4 Runner processes+Node Wait: %s", strings.TrimSpace(out.String()))
}
