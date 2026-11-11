package groups_test

import (
 "context"
 "encoding/json"
 "fmt"
 "sync"
 "sync/atomic"
 "testing"
 "time"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// Independent closure: a running B consumes two private contributors using its
// original bound ToolExecution, then delegates to a non-member temporary child.
// Removing either newly consumed contributor must fence this next generation.
func TestReviewerTwoContributorsThenTemporaryDescendant(t *testing.T) {
 for _, tool := range []string{"tasks.get","tasks.list"} {
  for _, removed := range []string{"none","C","D"} {
   t.Run(tool+"/remove="+removed,func(t *testing.T){
    var cID,dID string
    created:=make(chan []api.Delegation,1); allowRead:=make(chan struct{}); ready:=make(chan api.EngineInput,1); release:=make(chan struct{})
    var allowOnce,releaseOnce sync.Once
    // Register before Core.Close so blocked engines are released first during cleanup.
    var callbacks atomic.Int32
    eng:=engineFunc(func(c context.Context,i api.EngineInput)(api.EngineResult,error){
     if i.Intent=="C private" || i.Intent=="D private" { return api.EngineResult{Status:"finished",Text:i.Intent},nil }
     if i.Intent=="temporary after private union" {
      r,e:=i.Attempts.Reserve(c,api.AttemptRequest{LogicalCallID:"union-dispatch",InputEstimate:"1",OutputBound:"2"}); if e!=nil{return api.EngineResult{},e}
      ready<-i; <-release
      e=i.Attempts.Dispatch(context.Background(),r,func(context.Context)error{callbacks.Add(1);return nil})
      if e!=nil {e=i.Attempts.AbortUnsent(context.Background(),r)} else {_,e=i.Attempts.Settle(context.Background(),r,api.AttemptObservation{Knowledge:"known",InputTokens:"1",OutputTokens:"1",ProducerEnded:true})}
      return api.EngineResult{Status:"finished",Text:"C private + D private"},e
     }
     ids:=[]api.Delegation{}
     for n,target:=range []string{cID,dID} {
      task:=[]string{"C private","D private"}[n]
      v,e:=i.Tools.Invoke(c,api.ToolCall{ID:fmt.Sprintf("make-%d",n),Name:"agents.delegate",Delegate:&api.DelegateCommand{Target:api.DelegationTarget{Kind:"existing",AgentID:target},Task:task,Constraints:[]string{}}}); if e!=nil{return api.EngineResult{},e}; ids=append(ids,*v.Delegation)
     }
     created<-ids; <-allowRead
     if tool=="tasks.get" {
      for n,d:=range ids {v,e:=i.Tools.Invoke(c,api.ToolCall{ID:fmt.Sprintf("read-%d",n),Name:tool,TaskQuery:&api.IDQuery{ID:d.ID}}); if e!=nil{return api.EngineResult{},e}; if v.Delegation.Result==nil || v.Delegation.Result.Text!=[]string{"C private","D private"}[n] {return api.EngineResult{},fmt.Errorf("private body missing: %#v",v)}}
     } else {
      v,e:=i.Tools.Invoke(c,api.ToolCall{ID:"read-both",Name:tool,TaskList:&api.DelegationQuery{PageQuery:api.PageQuery{Limit:100}}}); if e!=nil{return api.EngineResult{},e}; found:=0; for _,d:=range v.Tasks.Items{if d.Result!=nil&&(d.Result.Text=="C private"||d.Result.Text=="D private"){found++}}; if found!=2{return api.EngineResult{},fmt.Errorf("list private count %d",found)}
     }
     // i.Tools is deliberately the original pre-consumption binding.
     draft:=api.AgentDraft{Name:"union descendant",Persona:"separate",AllowedTools:[]string{},AllowedCollaborationTargets:[]string{},Model:&api.ModelBindingDraft{ModelID:"controlled",ProviderID:"fixture",Protocol:"openai-chat-completions",Endpoint:"http://127.0.0.1:1",Capabilities:[]string{"text"}}}
     _,e:=i.Tools.Invoke(c,api.ToolCall{ID:"after-union",Name:"agents.delegate",Delegate:&api.DelegateCommand{Target:api.DelegationTarget{Kind:"temporary",Draft:&draft},Task:"temporary after private union",Constraints:[]string{}}})
     return api.EngineResult{Status:"finished",Text:"B consumed C+D"},e
    })
    c,loc:=open(t,bootstrap.Options{Engine:eng,Budget:api.BudgetPolicy{RootTokenLimit:"100",ProfileTokenLimit:"1000",MaintenanceTokenLimit:"0"}})
    t.Cleanup(func(){allowOnce.Do(func(){close(allowRead)});releaseOnce.Do(func(){close(release)})})
    a:=agent(t,c,"A",false); b:=agent(t,c,"B",true); cc:=agent(t,c,"C",true); d:=agent(t,c,"D",true); cID,dID=cc.ID,d.ID
    b=allow(t,c,b,[]string{"agents.delegate",tool},[]string{cc.ID,d.ID}); s:=group(t,c,a,b,cc,d); root:=send(t,c,s,"B union parent",b.ID); db:=database(t,loc)
    var children []api.Delegation
    select{case children=<-created:case <-time.After(5*time.Second):t.Fatal("private children not admitted")}
    for _,child:=range children {
     until:=time.Now().Add(5*time.Second)
     for { v,e:=c.API.Collaboration.GetTask(ctx,owner,api.IDQuery{ProfileID:meta(t,c,"q","").ProfileID,ID:child.ID});if e!=nil{t.Fatal(e)};if v.Result!=nil{break};if time.Now().After(until){t.Fatal("private result not ready")};time.Sleep(time.Millisecond) }
    }
    parent:=children[0].ParentRunID
    before:=count(t,db,"SELECT revision FROM execution_runs WHERE run_id=?",parent)
    if n:=count(t,db,"SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?",parent);n!=1{t.Fatalf("user reads consumed provenance %d",n)}
    allowOnce.Do(func(){close(allowRead)})
    var leaf api.EngineInput
    select{case leaf=<-ready:case <-time.After(5*time.Second):t.Fatal("post-consumption descendant not started")}
    for _,run:=range []string{parent,leaf.RunID}{
     var raw string;if e:=db.QueryRow("SELECT group_binding_json FROM execution_runs WHERE run_id=?",run).Scan(&raw);e!=nil{t.Fatal(e)}
     var proof api.GroupBinding;if e:=json.Unmarshal([]byte(raw),&proof);e!=nil{t.Fatal(e)};if len(proof.Members)!=3{t.Fatalf("lost union: %s",raw)}
     for _,id:=range []string{b.ID,cc.ID,d.ID}{found:=false;for _,m:=range proof.Members{if m.AgentID==id&&m.Incarnation=="1"&&m.HistoryRevision=="1"{found=true}};if !found{t.Fatalf("tuple absent %s",raw)}}
     t.Logf("run=%s complete proof=%s",run,raw)
    }
    after:=count(t,db,"SELECT revision FROM execution_runs WHERE run_id=?",parent);if after<=before{t.Fatalf("revision not advanced %d->%d",before,after)}
    if len(leaf.Lineage.Group.Members)!=3{t.Fatal("actual Engine input omitted inherited contributor")}
    if removed!="none"{members:=[]string{a.ID,b.ID,cc.ID,d.ID};if removed=="C"{members=[]string{a.ID,b.ID,d.ID}}else{members=[]string{a.ID,b.ID,cc.ID}};update(t,c,getSession(t,c,s.ID),members,api.GroupHistoryScope{Kind:"none"})}
    releaseOnce.Do(func(){close(release)}); terminal:=wait(t,c,root.RunID); if e:=c.Close();e!=nil{t.Fatal(e)}
    want:=int32(1);if removed!="none"{want=0};if callbacks.Load()!=want{t.Fatalf("Dispatch callbacks=%d want=%d",callbacks.Load(),want)}
    if n:=count(t,db,"SELECT count(*) FROM execution_runs WHERE child_slot<>0");n!=0{t.Fatalf("slots=%d",n)};if n:=count(t,db,"SELECT count(*) FROM task_config_pins");n!=0{t.Fatalf("pins=%d",n)}
    if removed!="none"&&count(t,db,"SELECT count(*) FROM conversation_messages WHERE session_id=? AND role='assistant'",s.ID)!=0{t.Fatal("revoked union published")}
    t.Logf("revision %d->%d; actual dispatch=%d root=%s slots=0 pins=0; independent two-contributor closure",before,after,callbacks.Load(),terminal.Status)
   })
  }
 }
}
