package groups_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type groupWireEngine struct {
	db    *sql.DB
	mu    sync.Mutex
	calls map[string]int
	queue string
}

func (e *groupWireEngine) Run(c context.Context, i api.EngineInput, emit func(api.EngineEvent) error) (api.EngineResult, error) {
	e.mu.Lock()
	e.calls[i.Intent+":"+i.Agent.Name]++
	if strings.Contains(i.Intent, "queued-fence") {
		e.queue = i.RunID
	}
	e.mu.Unlock()
	if strings.Contains(i.Intent, "queued-fence") {
		if x := emit(api.EngineEvent{Type: "text.delta", Text: "UNPUBLISHED_WIRE_BODY"}); x != nil {
			return api.EngineResult{}, x
		}
		<-c.Done()
		return api.EngineResult{}, c.Err()
	}
	if i.Intent == "@B @C" && i.Agent.Name == "B" {
		until := time.Now().Add(3 * time.Second)
		for {
			var n int
			x := e.db.QueryRowContext(c, "SELECT count(*) FROM group_publications p JOIN execution_runs r ON r.run_id=p.child_run_id JOIN task_config_snapshots t ON t.snapshot_id=r.task_config_id WHERE p.session_id=? AND json_extract(t.config_json,'$.agent.name')='C' AND p.message_id IS NOT NULL", i.SessionID).Scan(&n)
			if x != nil {
				return api.EngineResult{}, x
			}
			if n > 0 {
				break
			}
			if time.Now().After(until) {
				return api.EngineResult{}, fmt.Errorf("C publication not observed")
			}
			select {
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			case <-time.After(time.Millisecond):
			}
		}
	}
	text := "PUBLIC-" + i.Agent.Name
	if len(i.Context.Sources) > 0 {
		if len(i.Context.Sources) != 1 || i.Context.Sources[0].Text != "甲😀\n真实Host资料" {
			return api.EngineResult{}, fmt.Errorf("wire Host source mismatch")
		}
		text = "SOURCE_DERIVED_WIRE"
	}
	if x := emit(api.EngineEvent{Type: "text.delta", Text: text}); x != nil {
		return api.EngineResult{}, x
	}
	return api.EngineResult{Status: "finished", Text: text}, nil
}
func (e *groupWireEngine) Resume(c context.Context, i api.EngineResumeInput, f func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.Run(c, i.Input, f)
}

type groupQueuedFence struct {
	api.EventsAPI
	engine *groupWireEngine
	root   string
	once   sync.Once
}

func (f *groupQueuedFence) WithDelivery(c context.Context, id api.RequestIdentity, subjects []api.DeliverySubject, fn func(context.Context) error) error {
	f.engine.mu.Lock()
	run := f.engine.queue
	f.engine.mu.Unlock()
	for _, s := range subjects {
		if run != "" && s.Kind == "run" && s.ID == run {
			var waitErr error
			f.once.Do(func() {
				// Test-only queue barrier before the real production permit. No SQL or
				// permission lock is held. The ordinary updateMembers request commits removal.
				waitErr = os.WriteFile(filepath.Join(f.root, "queued-ready"), []byte("ready"), 0600)
				if waitErr != nil {
					return
				}
				until := time.Now().Add(4 * time.Second)
				for {
					var active int
					waitErr = f.engine.db.QueryRowContext(c, "SELECT m.active FROM execution_runs r JOIN conversation_members m ON m.session_id=r.session_id AND m.agent_id=r.agent_id WHERE r.run_id=?", run).Scan(&active)
					if waitErr != nil || active == 0 {
						return
					}
					if time.Now().After(until) {
						waitErr = fmt.Errorf("ordinary membership removal did not commit")
						return
					}
					select {
					case <-c.Done():
						waitErr = c.Err()
						return
					case <-time.After(time.Millisecond):
					}
				}
			})
			if waitErr != nil {
				return waitErr
			}
			break
		}
	}
	return f.EventsAPI.WithDelivery(c, id, subjects, fn)
}
func TestGroupsRunnerProcess(t *testing.T) {
	index := -1
	for i, a := range os.Args {
		if a == "--groups-runner" {
			index = i
		}
	}
	if index < 0 {
		return
	}
	if index+1 >= len(os.Args) {
		os.Exit(2)
	}
	root := os.Args[index+1]
	runCtx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	engine := &groupWireEngine{calls: map[string]int{}}
	core, e := bootstrap.OpenWithOptions(runCtx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine, Budget: api.BudgetPolicy{RootTokenLimit: "10000", ProfileTokenLimit: "100000", MaintenanceTokenLimit: "0"}})
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		cancel()
		os.Exit(1)
	}
	engine.db, e = sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		core.Close()
		cancel()
		os.Exit(1)
	}
	core.API.Events = &groupQueuedFence{EventsAPI: core.API.Events, engine: engine, root: root}
	server := stdio.New(os.Stdin, os.Stdout, core.API, api.NewConnectionIdentity("stdio", "user", true))
	e = server.Run(runCtx)
	server.Close()
	ce := core.Close()
	de := engine.db.Close()
	cancel()
	engine.mu.Lock()
	raw, je := json.Marshal(engine.calls)
	engine.mu.Unlock()
	we := os.WriteFile(filepath.Join(root, "observations.json"), raw, 0600)
	if e != nil || ce != nil || de != nil || je != nil || we != nil {
		fmt.Fprintln(os.Stderr, e, ce, de, je, we)
		os.Exit(1)
	}
	os.Exit(0)
}

const actualGroupFixture = `
import {spawn} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HapConnection} from '__REPO__/src/modules/huhubot/core/protocol/connection.ts';
import {GroupClient} from '__REPO__/src/modules/huhubot/services/groups/group-client.ts';
import {HostReadService} from '__REPO__/src/modules/huhubot/services/host-read/host-read.ts';
import {selectMention} from '__REPO__/src/modules/huhubot/core/mentions/mentions.ts';
const check=(x,m)=>{if(!x)throw new Error(m)},delay=ms=>new Promise(r=>setTimeout(r,ms));
const timers={after(ms,fn){const x=setTimeout(fn,ms);return()=>clearTimeout(x)}};
async function launch(){const child=spawn(process.argv[2],['-test.run=^TestGroupsRunnerProcess$','--','--groups-runner',process.argv[3]],{stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',x=>stderr+=x);const exit=new Promise(r=>child.once('exit',(code,signal)=>r({code,signal})));const transport={send(b){return new Promise((r,j)=>child.stdin.write(b,e=>e?j(e):r()))},onData(fn){child.stdout.on('data',fn);return()=>child.stdout.off('data',fn)},onClose(fn){const f=()=>fn(new Error('closed'));child.on('exit',f);return()=>child.off('exit',f)},close(){child.stdin.end()}};const connection=new HapConnection(transport,timers);const bot=await connection.connect({name:'actual-groups',version:'1'});return{bot,async close(){bot.close();transport.close();let forced=false;const kill=setTimeout(()=>{forced=true;child.kill('SIGKILL')},3000);const result=await exit;clearTimeout(kill);check(!forced&&result.code===0&&!stderr,'Runner cleanup '+JSON.stringify(result)+' '+stderr)}}}
let live,client,host;
(async()=>{try{
 live=await launch();let bot=live.bot;const p=bot.hello.profile;let serial=0;
 const meta=(key,rev)=>({commandId:key,idempotencyKey:key,profileId:p.profileId,commandEpoch:p.commandEpoch,...(rev?{expectedRevision:rev}:{})});
 const model={modelId:'controlled',providerId:'fixture',protocol:'openai-responses',endpoint:'https://fixture.invalid/v1',capabilities:['text']};
 const make=async(name,configured)=>bot.agents.create({...meta('agent-'+name),draft:{name,description:'',persona:'',...(configured?{model}:{})}});
 const a=await make('A',false),b=await make('B',true),c=await make('C',true),agents=[a,b,c];
 const session=await bot.sessions.create({...meta('group'),kind:'group',title:'actual group',memberIds:agents.map(a=>a.id),coordinatorId:a.id});client=new GroupClient(bot,session,agents,timers,{poll:false});
 const wait=async id=>{const end=Date.now()+5000;while(Date.now()<end){const r=await bot.runs.get({profileId:p.profileId,id});if(['succeeded','failed','canceled'].includes(r.status))return r;await delay(3)}throw new Error('Run did not end '+id)};
 function mentions(...selected){let d={text:'',mentions:[]};for(const agent of selected){if(d.text)d={...d,text:d.text+' '};d=selectMention(d,d.text.length,d.text.length,agent)}return d}
 client.setDraft({text:'default only A',mentions:[]});const normal=await client.send(meta('default'),{sourceRefs:[]});await wait(normal.runId);check(normal.targetRunIds.length===1,'default target cardinality');await client.refreshSession();
 client.setDraft(mentions(b,c));const batch=await client.send(meta('batch'),{sourceRefs:[]});await wait(batch.runId);check(batch.targetRunIds.length===2,'explicit whole target set');const repeated=await client.retrySend();check(repeated.runId===batch.runId&&JSON.stringify(repeated.targetRunIds)===JSON.stringify(batch.targetRunIds),'same command replay created work');await client.refreshSession();
 await client.refreshHistory();let messages=client.getSnapshot().history.transcript.messages;const pubB=messages.find(m=>m.text==='PUBLIC-B'),pubC=messages.find(m=>m.text==='PUBLIC-C');check(pubB&&pubC&&BigInt(pubC.seq)<BigInt(pubB.seq),'public sequence did not follow actual C-before-B commit '+JSON.stringify(messages));
 const runB=await bot.runs.get({profileId:p.profileId,id:pubB.runId}),runC=await bot.runs.get({profileId:p.profileId,id:pubC.runId});const streamB=client.watchRun(runB),streamC=client.watchRun(runC);await streamB.refresh();await streamC.refresh();check(streamB.getSnapshot().projection.pendingText==='PUBLIC-B'&&streamC.getSnapshot().projection.pendingText==='PUBLIC-C','real group event bodies absent');
 const registry=new Map();host=new HostReadService({setLease(){},async readSnapshot(source,signal){const row=registry.get(source.resourceId);check(row&&!signal.aborted&&JSON.stringify(row.source)===JSON.stringify(source),'unexpected Host source');return structuredClone(row)},async searchSnapshots(){throw new Error('unused')}},timers);bot.setHost({invoke:async()=>{throw new Error('read only')},queryReceipt:async()=>{throw new Error('read only')},read:host.read,search:host.search,leaseChanged:host.setLease});const lease=await bot.host.attach({workspaceId:'workspace:groups-wire',capabilities:['note.read','note.search']});
 const text='甲😀\n真实Host资料',source={resourceId:'source:groups-wire',kind:'note',workspaceId:lease.workspaceId,originClientId:'client:groups-wire',originViewId:'view:captured-wire',hostConnectionId:lease.hostConnectionId,hostLeaseId:lease.leaseId,hostLeaseEpoch:lease.leaseEpoch,revision:'1',hash:'sha256:'+createHash('sha256').update(text).digest('hex'),scopeResourceIds:[]};registry.set(source.resourceId,{source,text});
 const recipient=a=>({agentId:a.id,modelBindingRevision:a.modelBindingRevision,providerId:model.providerId,modelId:model.modelId,protocol:model.protocol,endpoint:model.endpoint});
 const grant=async(key,agent)=>bot.grants.create({...meta(key),workspaceId:lease.workspaceId,scope:'source',resourceId:source.resourceId,operations:['read','send','deliver','delegate'],recipients:[recipient(agent)]});const gb=await grant('grant-b',b);
 const draft=mentions(b,c);client.setDraft(draft);let rejected=false;try{await client.send(meta('missing-c'),{sourceRefs:[source],grantIds:[gb.id]})}catch{rejected=true}check(rejected&&JSON.stringify(client.getSnapshot().draft)===JSON.stringify(draft),'whole-batch rejection lost full draft/tokens');await client.refreshHistory();check(client.getSnapshot().history.transcript.messages.length===messages.length,'failed batch left public messages');
 const gc=await grant('grant-c',c);client.setDraft(mentions(b,c));const sourced=await client.send(meta('sourced'),{sourceRefs:[source],grantIds:[gb.id,gc.id]});await wait(sourced.runId);await client.refreshSession();await client.refreshHistory();messages=client.getSnapshot().history.transcript.messages;check(messages.filter(m=>m.text==='SOURCE_DERIVED_WIRE').length===2&&messages.some(m=>m.role==='user'&&m.attachments?.sourceRefs[0]?.originViewId==='view:captured-wire'),'actual source/attachment metadata not consumed');
 await bot.grants.revoke({...meta('revoke-b',gb.revision),id:gb.id});await bot.grants.revoke({...meta('revoke-c',gc.revision),id:gc.id});await client.refreshHistory();check(!client.getSnapshot().history.transcript.messages.some(m=>m.text==='SOURCE_DERIVED_WIRE')&&client.getSnapshot().history.transcript.messages.some(m=>m.role==='user'&&m.text==='@B @C'&&!m.attachments),'source revoke did not filter body/labels independently of user text');
 client.setDraft({...mentions(b),text:'@B queued-fence'});const queued=await client.send(meta('queued'),{sourceRefs:[]});await client.refreshSession();const qr=await bot.runs.get({profileId:p.profileId,id:queued.targetRunIds[0]});const qs=client.watchRun(qr);const reading=(async()=>{const until=Date.now()+3000;while(!existsSync(process.argv[3]+'/queued-ready')&&Date.now()<until){await qs.refresh();await delay(2)}})();const end=Date.now()+3000;while(!existsSync(process.argv[3]+'/queued-ready')&&Date.now()<end)await delay(2);check(existsSync(process.argv[3]+'/queued-ready'),'physical output queue barrier not reached');
 const removal=client.updateMembers({...meta('remove-b'),memberIds:[a.id,c.id],historyScope:{kind:'none'}});await Promise.all([reading,removal]);check(qs.getSnapshot().projection.pendingText===''&&streamB.getSnapshot().projection.pendingText===''&&streamC.getSnapshot().projection.pendingText==='','membership change kept unpublished Run cache');await streamC.refresh();check(streamC.getSnapshot().projection.pendingText==='PUBLIC-C','still-legal published C stream denied');
 await wait(queued.runId);await client.refreshSession();await client.updateMembers({...meta('rejoin-b'),memberIds:[a.id,b.id,c.id],historyScope:{kind:'none'}});check(client.getSnapshot().session.groupMembers.find(m=>m.agentId===b.id).incarnation==='2','rejoin incarnation not advanced');await streamB.refresh();check(streamB.getSnapshot().projection.pendingText==='','old B cache revived on rejoin');await client.refreshHistory();check(client.getSnapshot().history.transcript.messages.some(m=>m.id===pubB.id),'legal public B history hidden by removal');
 const before=client.getSnapshot().history.transcript.messages.map(m=>[m.id,m.seq]);client.dispose();client=undefined;host.dispose();host=undefined;await live.close();const counts=JSON.parse(readFileSync(process.argv[3]+'/observations.json','utf8'));check(counts['default only A:A']===1&&counts['@B @C:B']===2&&counts['@B @C:C']===2&&!counts['@B @C:A']&&counts['@B queued-fence:B']===1,'actual invocation set/replay '+JSON.stringify(counts));
 live=await launch();bot=live.bot;const reopened=await bot.sessions.get({profileId:p.profileId,id:session.id});client=new GroupClient(bot,reopened,agents,timers,{poll:false});await client.refreshHistory();check(JSON.stringify(client.getSnapshot().history.transcript.messages.map(m=>[m.id,m.seq]))===JSON.stringify(before),'reopen changed public stable IDs/seq');
 console.log(JSON.stringify({defaultOnlyA:true,explicitOnlyBC:true,wholeBatchAtomic:true,fullDraftRetained:true,sameReceipt:true,publicSequence:true,actualHostRead:true,sourceRevoke:true,queuedPhysicalFence:true,allRunCachesInvalidated:true,legalOtherMember:true,rejoinOldWorkDenied:true,publicHistoryRetained:true,reopenStable:true}));
}finally{client?.dispose();host?.dispose();await live?.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
`

func TestActualGroupClientConsumesAtomicGoGroupsAndPhysicalRemovalFence(t *testing.T) {
	repo, e := filepath.Abs(filepath.Join("..", "..", "..", "..", ".."))
	if e != nil {
		t.Fatal(e)
	}
	root := t.TempDir()
	profiles := filepath.Join(root, "profiles")
	if e = os.Mkdir(profiles, 0700); e != nil {
		t.Fatal(e)
	}
	source, bundle := filepath.Join(root, "groups.ts"), filepath.Join(root, "groups.cjs")
	if e = os.WriteFile(source, []byte(strings.ReplaceAll(actualGroupFixture, "__REPO__", filepath.ToSlash(repo))), 0600); e != nil {
		t.Fatal(e)
	}
	buildCtx, bc := context.WithTimeout(ctx, time.Minute)
	defer bc()
	build := exec.CommandContext(buildCtx, "pnpm", "exec", "esbuild", source, "--bundle", "--platform=node", "--format=cjs", "--outfile="+bundle)
	build.Dir = repo
	if out, e := build.CombinedOutput(); e != nil {
		t.Fatalf("production GroupClient bundle %v %s", e, out)
	}
	runCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	cmd := exec.CommandContext(runCtx, "node", bundle, os.Args[0], profiles)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if e = cmd.Run(); e != nil {
		t.Fatalf("actual TS↔Go groups %v\n%s\n%s", e, out.String(), stderr.String())
	}
	var observed map[string]bool
	if stderr.Len() > 0 || cmd.ProcessState == nil || json.Unmarshal(out.Bytes(), &observed) != nil || len(observed) != 14 {
		t.Fatalf("invalid output/Wait %s %s", out.String(), stderr.String())
	}
	for k, v := range observed {
		if !v {
			t.Fatal(k)
		}
	}
	t.Logf("production GroupClient/mentions/EventClient/HapConnection ↔ Go stdio/Facade/SQLite/same Executor; controlled Engine and pre-permit queue barrier only; 2 Runner processes and Node Wait: %s", strings.TrimSpace(out.String()))
}
