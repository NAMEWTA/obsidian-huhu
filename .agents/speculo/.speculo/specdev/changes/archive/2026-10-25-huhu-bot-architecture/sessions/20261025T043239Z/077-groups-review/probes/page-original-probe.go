package groups_test

import (
 "context"
 "encoding/json"
 "fmt"
 "strings"
 "sync"
 "sync/atomic"
 "testing"
 "time"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)
func TestReviewerListPageDoesNotConsumeOmittedResult(t *testing.T){
 for _,remove:=range []bool{false,true}{t.Run(fmt.Sprintf("remove_omitted=%v",remove),func(t *testing.T){
 var targets []string
 created:=make(chan []api.Delegation,1);allowRead:=make(chan struct{});listed:=make(chan api.DelegationPage,1);release:=make(chan struct{})
 var onceRead,onceRelease sync.Once;var calls atomic.Int32
 eng:=engineFunc(func(c context.Context,i api.EngineInput)(api.EngineResult,error){
  if strings.HasPrefix(i.Intent,"large child "){return api.EngineResult{Status:"finished",Text:strings.Repeat("x",131072)},nil}
  ds:=[]api.Delegation{}
  for n,id:=range targets{v,e:=i.Tools.Invoke(c,api.ToolCall{ID:fmt.Sprint("large-",n),Name:"agents.delegate",Delegate:&api.DelegateCommand{Target:api.DelegationTarget{Kind:"existing",AgentID:id},Task:fmt.Sprint("large child ",n),Constraints:[]string{}}});if e!=nil{return api.EngineResult{},e};ds=append(ds,*v.Delegation)}
  created<-ds;<-allowRead
  v,e:=i.Tools.Invoke(c,api.ToolCall{ID:"page",Name:"tasks.list",TaskList:&api.DelegationQuery{PageQuery:api.PageQuery{Limit:100}}});if e!=nil{return api.EngineResult{},e}
  res,e:=i.Attempts.Reserve(c,api.AttemptRequest{LogicalCallID:"after-page",InputEstimate:"1",OutputBound:"2"});if e!=nil{return api.EngineResult{},e}
  listed<-*v.Tasks;<-release
  e=i.Attempts.Dispatch(context.Background(),res,func(context.Context)error{calls.Add(1);return nil})
  if e!=nil{e=i.Attempts.AbortUnsent(context.Background(),res)}else{_,e=i.Attempts.Settle(context.Background(),res,api.AttemptObservation{Knowledge:"known",InputTokens:"1",OutputTokens:"1",ProducerEnded:true})}
  return api.EngineResult{Status:"finished",Text:"only returned page consumed"},e
 })
 c,loc:=open(t,bootstrap.Options{Engine:eng,Budget:api.BudgetPolicy{RootTokenLimit:"100",ProfileTokenLimit:"1000",MaintenanceTokenLimit:"0"}})
 t.Cleanup(func(){onceRead.Do(func(){close(allowRead)});onceRelease.Do(func(){close(release)})})
 a:=agent(t,c,"A",false);b:=agent(t,c,"B",true);members:=[]api.Agent{b};for n:=0;n<4;n++{m:=agent(t,c,fmt.Sprint("C",n),true);members=append(members,m);targets=append(targets,m.ID)}
 b=allow(t,c,b,[]string{"agents.delegate","tasks.list"},targets);members[0]=b;s:=group(t,c,a,members...);root:=send(t,c,s,"list parent",b.ID);db:=database(t,loc)
 var ds []api.Delegation;select{case ds=<-created:case <-time.After(5*time.Second):t.Fatal("admission timeout")}
 for _,d:=range ds{until:=time.Now().Add(5*time.Second);for{v,e:=c.API.Collaboration.GetTask(ctx,owner,api.IDQuery{ProfileID:meta(t,c,"q","").ProfileID,ID:d.ID});if e!=nil{t.Fatal(e)};if v.Result!=nil{if len(v.Result.Text)!=131072{t.Fatal("wrong result size")};break};if time.Now().After(until){t.Fatal("result timeout")};time.Sleep(time.Millisecond)}}
 parent:=ds[0].ParentRunID;before:=count(t,db,"SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?",parent);if before!=1{t.Fatal("user query consumed")}
 onceRead.Do(func(){close(allowRead)});var page api.DelegationPage;select{case page=<-listed:case <-time.After(5*time.Second):t.Fatal("list timeout")}
 seen:=map[string]bool{};for _,d:=range page.Items{if d.Result!=nil&&d.Result.Text!=""{seen[d.ExecutorAgentID]=true}}
 var raw string;if e:=db.QueryRow("SELECT group_binding_json FROM execution_runs WHERE run_id=?",parent).Scan(&raw);e!=nil{t.Fatal(e)};var proof api.GroupBinding;if e:=json.Unmarshal([]byte(raw),&proof);e!=nil{t.Fatal(e)}
 var omitted string;for _,m:=range proof.Members{if m.AgentID!=b.ID&&!seen[m.AgentID]{omitted=m.AgentID}}
 encoded,_:=json.Marshal(page);t.Logf("returned private contributors=%v pageBytes=%d nextCursor=%t; persisted proof=%s; omitted-but-bound=%s",seen,len(encoded),page.NextCursor!="",raw,omitted)
 if len(seen)!=3||page.NextCursor==""{t.Fatal("page did not exercise byte truncation")};if omitted==""{t.Log("no phantom contributor, correct page qualification")}
 if remove&&omitted!=""{ids:=[]string{a.ID,b.ID};for _,id:=range targets{if id!=omitted{ids=append(ids,id)}};update(t,c,getSession(t,c,s.ID),ids,api.GroupHistoryScope{Kind:"none"})}
 onceRelease.Do(func(){close(release)});term:=wait(t,c,root.RunID);if e:=c.Close();e!=nil{t.Fatal(e)}
 t.Logf("actualDispatch=%d terminal=%s slots=%d pins=%d",calls.Load(),term.Status,count(t,db,"SELECT count(*) FROM execution_runs WHERE child_slot<>0"),count(t,db,"SELECT count(*) FROM task_config_pins"))
 if calls.Load()!=1{t.Errorf("removing an undisclosed, never-consumed page member canceled the consumer; Dispatch=%d want=1",calls.Load())}
 })}
}
