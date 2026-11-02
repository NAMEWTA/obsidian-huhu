package access_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type captureEngine struct{ core *bootstrap.Core }

func (engine *captureEngine) Run(callCtx context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	want := 2
	if in.Intent == "new-endpoint" {
		want = 0
	}
	if in.Intent == "remove-one" {
		want = 1
	}
	if len(in.Context.Sources) != want {
		return api.EngineResult{}, fmt.Errorf("prepared source count %d", len(in.Context.Sources))
	}
	for _, source := range in.Context.Sources {
		if source.Source.ResourceID == "source:third" || source.Text == "PRIVATE_THIRD" {
			return api.EngineResult{}, fmt.Errorf("unattached source reached model")
		}
	}
	if want == 2 && (in.Context.Sources[0].Text != "PRIVATE_ONE" || in.Context.Sources[1].Text != "😀\n乙😀") {
		return api.EngineResult{}, fmt.Errorf("wrong explicit source snapshot")
	}
	if want == 0 && len(in.History) != 0 {
		return api.EngineResult{Status: "failed", Reason: "PRIVATE_HISTORY_OUTBOUND"}, nil
	}
	if want == 1 && (in.Context.Sources[0].Text != "😀\n乙😀" || len(in.History) != 0) {
		return api.EngineResult{}, fmt.Errorf("removed source survived in context/history")
	}

	if want == 1 {
		identity := api.NewConnectionIdentity("stdio", "user", true)
		status, e := engine.core.API.Service.Status(callCtx, identity)
		if e != nil {
			return api.EngineResult{}, e
		}
		page, e := engine.core.API.Grants.List(callCtx, identity, api.PageQuery{ProfileID: status.Profile.ProfileID})
		if e != nil {
			return api.EngineResult{}, e
		}
		grantIDs := []string{}
		for _, g := range page.Items {
			if g.State == "active" {
				grantIDs = append(grantIDs, g.ID)
			}
		}
		model := in.Agent.Model
		recipient := api.GrantRecipient{AgentID: in.Agent.ID, ModelBindingRevision: in.Agent.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
		sources := []api.SourceSnapshot{}
		for _, source := range in.Context.Sources {
			sources = append(sources, source.Source)
		}
		input := api.RunAccessInput{ProfileID: status.Profile.ProfileID, SessionID: in.SessionID, TaskID: in.RunID, Recipient: recipient, Sources: sources, GrantIDs: grantIDs}
		result, e := engine.core.API.Context.Search(callCtx, identity, input, "乙😀", 10)
		if e == nil && len(result.Matches) == 2 && result.NextCursor != "" {
			_, bad := engine.core.API.Context.Search(callCtx, identity, input, "changed-query", 10, result.NextCursor)
			var rejected *api.Fault
			if !errors.As(bad, &rejected) || rejected.Reason != "SOURCE_CURSOR_INVALID" {
				return api.EngineResult{Status: "failed", Reason: "SEARCH_QUERY_CURSOR_NOT_BOUND"}, nil
			}
			altered := input
			altered.Sources = append([]api.SourceSnapshot{}, input.Sources...)
			span := *altered.Sources[0].Range
			span.Start++
			span.End++
			altered.Sources[0].Range = &span
			_, bad = engine.core.API.Context.Search(callCtx, identity, altered, "乙😀", 10, result.NextCursor)
			if !errors.As(bad, &rejected) || rejected.Reason != "SOURCE_CURSOR_INVALID" {
				return api.EngineResult{Status: "failed", Reason: "SEARCH_SCOPE_CURSOR_NOT_BOUND"}, nil
			}
			next, nextErr := engine.core.API.Context.Search(callCtx, identity, input, "乙😀", 10, result.NextCursor)
			if nextErr != nil || len(next.Matches) != 1 || next.NextCursor != "" {
				return api.EngineResult{Status: "failed", Reason: "SEARCH_NEXT_PAGE_INVALID"}, nil
			}
		} else if e == nil {
			return api.EngineResult{Status: "failed", Reason: "SEARCH_CURSOR_MISSING"}, nil
		}
		if e != nil || len(result.Matches) != 2 {
			var fault *api.Fault
			if errors.As(e, &fault) {
				return api.EngineResult{Status: "failed", Reason: "SEARCH_" + fault.Reason}, nil
			}
			return api.EngineResult{Status: "failed", Reason: "SEARCH_INVALID_RESULT"}, nil
		}
	}
	return api.EngineResult{Status: "finished", Text: "DERIVED_PRIVATE_RESULT", Usage: api.RunUsage{InputTokens: "1", OutputTokens: "1"}}, nil
}
func (c *captureEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("resume not expected")
}
func TestAccessHostRunnerProcess(t *testing.T) {
	index := -1
	for i, arg := range os.Args {
		if arg == "--access-host-runner" {
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
	runCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	engine := &captureEngine{}
	core, e := bootstrap.OpenWithOptions(runCtx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine})
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
	engine.core = core
	server := stdio.New(os.Stdin, os.Stdout, core.API, api.NewConnectionIdentity("stdio", "user", true))
	e = server.Run(runCtx)
	server.Close()
	closeErr := core.Close()
	if e != nil || closeErr != nil {
		fmt.Fprintln(os.Stderr, e, closeErr)
		os.Exit(1)
	}
	os.Exit(0)
}

const tsHostFixture = `
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {HapConnection,BotRpcError} from '__REPO__/src/modules/huhubot/core/protocol/connection.ts';
import {HostReadService} from '__REPO__/src/modules/huhubot/services/host-read/host-read.ts';
const child=spawn(process.argv[2],['-test.run=^TestAccessHostRunnerProcess$','--','--access-host-runner',process.argv[3]],{stdio:['pipe','pipe','pipe']});
let stderr='',forced=false;child.stderr.on('data',x=>stderr+=x);
const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
const timers={after(ms,fn){const t=setTimeout(fn,ms);return()=>clearTimeout(t)}};
const transport={send(bytes){return new Promise((resolve,reject)=>child.stdin.write(bytes,e=>e?reject(e):resolve()))},onData(fn){child.stdout.on('data',fn);return()=>child.stdout.off('data',fn)},onClose(fn){const close=()=>fn(new Error('closed'));child.on('exit',close);return()=>child.off('exit',close)},close(){child.stdin.end()}};
const connection=new HapConnection(transport,timers);
const registry=new Map(),counts=new Map(),cursors=new Map();let currentLease;
const sources={setLease(lease){currentLease=lease},async readSnapshot(source,signal){const entry=registry.get(source.resourceId);if(signal.aborted||!entry||JSON.stringify(entry.source)!==JSON.stringify(source))throw new Error('INVALID_SOURCE_REGISTRY');counts.set(source.resourceId,(counts.get(source.resourceId)||0)+1);return structuredClone(entry)},async searchSnapshots(request,signal){if(signal.aborted)throw new Error('ABORTED');const fingerprint=JSON.stringify({...request,cursor:undefined});if(request.cursor&&cursors.get(request.cursor)!==fingerprint)throw new BotRpcError(-32000,{kind:'CAPABILITY_DENIED',reason:'SOURCE_CURSOR_INVALID',retryable:false,correlationId:'fixture'});const source=request.sources[0],entry=registry.get(source.resourceId);check(JSON.stringify(entry.source)===JSON.stringify(source),'forged search snapshot');const start=(source.range?.start||0)+entry.text.indexOf(request.query),match={source,text:request.query,range:{start,end:start+request.query.length}};if(request.cursor){cursors.delete(request.cursor);return {matches:[match],truncated:false}}cursors.set('cursor:page2',fingerprint);return {matches:[match,match],truncated:true,nextCursor:'cursor:page2'}}};
const service=new HostReadService(sources,timers);
let client;
function check(value,message){if(!value)throw new Error(message)}
async function denied(promise,reason){try{await promise;throw new Error('expected rejection')}catch(e){check(String(e.message).includes(reason),'wrong rejection '+e.message)}}
async function waitRun(profile,id){const until=Date.now()+5000;while(Date.now()<until){const run=await client.runs.get({profileId:profile,id});if(['succeeded','failed','canceled'].includes(run.status))return run;await new Promise(resolve=>setTimeout(resolve,10))}throw new Error('run did not finish')}
(async()=>{
 try{
  client=await connection.connect({name:'actual-ts-host-fixture',version:'1'});
  client.setHost({invoke:async()=>{throw new Error('read only')},queryReceipt:async()=>{throw new Error('read only')},read:service.read,search:service.search,leaseChanged:lease=>service.setLease(lease)});
  const lease=await client.host.attach({workspaceId:'workspace:one',capabilities:['note.read','note.search']});
  const p=client.hello.profile;const meta=(key,revision)=>({commandId:key,idempotencyKey:key,profileId:p.profileId,commandEpoch:p.commandEpoch,...(revision?{expectedRevision:revision}:{})});
  const model={providerId:'fixture',modelId:'model',protocol:'openai-responses',endpoint:'https://model.invalid/v1',capabilities:['text']};
  const agent=await client.agents.create({...meta('agent'),draft:{name:'Access',description:'',persona:'',model}});
  const session=await client.sessions.create({...meta('session'),kind:'direct',title:'Access',memberIds:[agent.id],workspaceId:'workspace:one'});
  const recipient={agentId:agent.id,modelBindingRevision:agent.modelBindingRevision,providerId:model.providerId,modelId:model.modelId,protocol:model.protocol,endpoint:model.endpoint};
  function capture(id,text){const source={resourceId:id,kind:'note',workspaceId:lease.workspaceId,originClientId:'client:explicit',originViewId:'view:explicit',hostConnectionId:lease.hostConnectionId,hostLeaseId:lease.leaseId,hostLeaseEpoch:lease.leaseEpoch,revision:'1',hash:'sha256:'+createHash('sha256').update(text).digest('hex'),scopeResourceIds:[]};registry.set(id,{source,text});return source}
  const one=capture('source:one','PRIVATE_ONE'),two=capture('source:two','😀\n乙😀'),third=capture('source:third','PRIVATE_THIRD');two.kind='selection';two.range={start:1,end:7};
  const grant=async(source,key)=>client.grants.create({...meta(key),workspaceId:lease.workspaceId,scope:'source',resourceId:source.resourceId,recipients:[recipient],operations:['read','send','search'],sessionId:session.id});
  const g1=await grant(one,'grant-one'),g2=await grant(two,'grant-two');
  const start=await client.runs.start({...meta('run-one','1'),sessionId:session.id,intent:'two-explicit',sourceRefs:[one,two],grantIds:[g1.id,g2.id]});
  const finished=await waitRun(p.profileId,start.runId);check(finished.status==='succeeded','two-source Engine failed '+JSON.stringify(finished));
  check(counts.get(one.resourceId)===1&&counts.get(two.resourceId)===1&&!counts.has(third.resourceId),'unattached Host read');
  const before=await client.sessions.history({profileId:p.profileId,sessionId:session.id});check(before.items.length===2,'missing actual result/history');
  await client.grants.revoke({...meta('revoke-one','1'),id:g1.id});
  const revoked=await client.sessions.history({profileId:p.profileId,sessionId:session.id});check(revoked.items.length===0,'revoked source/derived text survived');
  const sessionAfterFirst=await client.sessions.get({profileId:p.profileId,id:session.id});
  const next=await client.runs.start({...meta('run-two',sessionAfterFirst.revision),sessionId:session.id,intent:'remove-one',sourceRefs:[two],grantIds:[g2.id]});
  const nextFinished=await waitRun(p.profileId,next.runId);check(nextFinished.status==='succeeded','removed source/verified-search failed '+JSON.stringify(nextFinished));
  const sessionAfterSecond=await client.sessions.get({profileId:p.profileId,id:session.id});
  await denied(client.runs.start({...meta('run-third',sessionAfterSecond.revision),sessionId:session.id,intent:'forged-third',sourceRefs:[third],grantIds:[g2.id]}),'SOURCE_NOT_GRANTED');
  check(counts.get(one.resourceId)===1&&counts.get(two.resourceId)===4&&!counts.has(third.resourceId),'third or removed source read');
  const changed=await client.models.bind({...meta('new-model','1'),agentId:agent.id,model:{...model,endpoint:'https://different.invalid/v1'}});
  const beforeEndpoint=await client.sessions.history({profileId:p.profileId,sessionId:session.id});check(beforeEndpoint.items.length===2,'readable history incorrectly hidden by model change');
  const endpointSession=await client.sessions.get({profileId:p.profileId,id:session.id});
  const endpointRun=await client.runs.start({...meta('new-endpoint',endpointSession.revision),sessionId:session.id,intent:'new-endpoint',sourceRefs:[]});
  const endpointFinished=await waitRun(p.profileId,endpointRun.runId);check(endpointFinished.status==='succeeded','new-endpoint Engine failed '+JSON.stringify(endpointFinished));
  await client.agents.disable({...meta('disable',changed.revision),id:agent.id});
  const disabled=await client.sessions.history({profileId:p.profileId,sessionId:session.id});check(disabled.items.length===4&&disabled.items.filter(m=>m.sourceRefs.length>0).length===2,'disabled Bot hid authorized history');
  console.log(JSON.stringify({twoExplicit:true,thirdReads:counts.get(third.resourceId)||0,oneReads:counts.get(one.resourceId),twoReads:counts.get(two.resourceId),revokedHistory:revoked.items.length,disabledHistory:disabled.items.length,removedSource:true,endpointHistoryFiltered:true,unicodeSelection:true,applicationCursorPages:true}));
 }finally{
  service.dispose();client?.close();transport.close();const kill=setTimeout(()=>{forced=true;child.kill('SIGKILL')},3000);const result=await exited;clearTimeout(kill);check(!forced&&result.code===0&&!stderr,'Go host fixture failed cleanup '+stderr);
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
`

func TestActualGoTSHostPermissionsAndEngineContext(t *testing.T) {
	for _, name := range []string{"node", "pnpm"} {
		if _, e := exec.LookPath(name); e != nil {
			t.Fatalf("actual TS Host contract requires %s", name)
		}
	}
	repo, e := filepath.Abs(filepath.Join("..", "..", "..", "..", ".."))
	if e != nil {
		t.Fatal(e)
	}
	root := t.TempDir()
	source := filepath.Join(root, "host.ts")
	bundle := filepath.Join(root, "host.cjs")
	profiles := filepath.Join(root, "profiles")
	if e = os.Mkdir(profiles, 0700); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(source, []byte(strings.ReplaceAll(tsHostFixture, "__REPO__", filepath.ToSlash(repo))), 0600); e != nil {
		t.Fatal(e)
	}
	buildCtx, buildCancel := context.WithTimeout(ctx, time.Minute)
	defer buildCancel()
	build := exec.CommandContext(buildCtx, "pnpm", "exec", "esbuild", source, "--bundle", "--platform=node", "--format=cjs", "--outfile="+bundle)
	build.Dir = repo
	if out, e := build.CombinedOutput(); e != nil {
		t.Fatalf("TS actual product services bundle: %v %s", e, out)
	}
	runCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	cmd := exec.CommandContext(runCtx, "node", bundle, os.Args[0], profiles)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if e = cmd.Run(); e != nil {
		t.Fatalf("actual Go/TS Host/Engine contract: %v\n%s\n%s", e, out.String(), stderr.String())
	}
	if stderr.Len() != 0 || cmd.ProcessState == nil {
		t.Fatal("client not reaped cleanly", stderr.String())
	}
	var observed struct {
		TwoExplicit, RemovedSource, EndpointHistoryFiltered, UnicodeSelection, ApplicationCursorPages bool
		ThirdReads, OneReads, TwoReads, RevokedHistory, DisabledHistory                               int
	}
	if json.Unmarshal(out.Bytes(), &observed) != nil || !observed.TwoExplicit || !observed.RemovedSource || !observed.EndpointHistoryFiltered || !observed.UnicodeSelection || !observed.ApplicationCursorPages || observed.ThirdReads != 0 || observed.OneReads != 1 || observed.TwoReads != 4 || observed.RevokedHistory != 0 || observed.DisabledHistory != 4 {
		t.Fatalf("bad actual observations %s", out.String())
	}
	t.Logf("actual production bootstrap/stdio ↔ TS HapConnection/HostReadService: %s; both processes Wait/exit; no real model/Vault/keyring", strings.TrimSpace(out.String()))
}
