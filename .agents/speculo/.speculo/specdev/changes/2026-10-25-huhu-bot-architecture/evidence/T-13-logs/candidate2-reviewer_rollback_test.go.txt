package groups_test
import (
 "context"
 "fmt"
 "strings"
 "sync"
 "testing"
 "time"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)
func TestReviewerPrivateUnionSQLFailureRollsBackWholeRead(t *testing.T){
 var targets []string
 made:=make(chan []api.Delegation,1);start:=make(chan struct{});observed:=make(chan error,1);release:=make(chan struct{});var startOnce,releaseOnce sync.Once
 engine:=engineFunc(func(c context.Context,i api.EngineInput)(api.EngineResult,error){
  if strings.HasPrefix(i.Intent,"rollback-child"){return api.EngineResult{Status:"finished",Text:i.Intent},nil}
  ds:=[]api.Delegation{};for n,target:=range targets{r,e:=i.Tools.Invoke(c,api.ToolCall{ID:fmt.Sprint("delegate",n),Name:"agents.delegate",Delegate:&api.DelegateCommand{Target:api.DelegationTarget{Kind:"existing",AgentID:target},Task:fmt.Sprint("rollback-child",n),Constraints:[]string{}}});if e!=nil{return api.EngineResult{},e};ds=append(ds,*r.Delegation)}
  made<-ds;<-start
  _,e:=i.Tools.Invoke(c,api.ToolCall{ID:"read",Name:"tasks.list",TaskList:&api.DelegationQuery{PageQuery:api.PageQuery{Limit:100}}});observed<-e;<-release
  return api.EngineResult{Status:"finished",Text:"handled infrastructure failure without using result"},nil
 })
 c,loc:=open(t,bootstrap.Options{Engine:engine});t.Cleanup(func(){startOnce.Do(func(){close(start)});releaseOnce.Do(func(){close(release)})})
 a:=agent(t,c,"A",false);b:=agent(t,c,"B",true);cc:=agent(t,c,"C",true);d:=agent(t,c,"D",true);targets=[]string{cc.ID,d.ID};b=allow(t,c,b,[]string{"agents.delegate","tasks.list"},targets);s:=group(t,c,a,b,cc,d);root:=send(t,c,s,"rollback-parent",b.ID);db:=database(t,loc)
 var ds []api.Delegation;select{case ds=<-made:case <-time.After(5*time.Second):t.Fatal("admission timeout")}
 for _,child:=range ds{until:=time.Now().Add(5*time.Second);for{v,e:=c.API.Collaboration.GetTask(ctx,owner,api.IDQuery{ProfileID:meta(t,c,"q","").ProfileID,ID:child.ID});if e!=nil{t.Fatal(e)};if v.Result!=nil{break};if time.Now().After(until){t.Fatal("result timeout")};time.Sleep(time.Millisecond)}}
 parent:=ds[0].ParentRunID;var before,after string
 query:="SELECT group_binding_json||'|'||derived_json||'|'||effective_source_json||'|'||effective_grants_json||'|'||revision FROM execution_runs WHERE run_id=?"
 if e:=db.QueryRow(query,parent).Scan(&before);e!=nil{t.Fatal(e)}
 // SQLite ABORT on the second contributor update: the first update must also roll back.
 if _,e:=db.Exec("CREATE TRIGGER reviewer_union_abort BEFORE UPDATE OF group_binding_json ON execution_runs WHEN NEW.run_id='"+parent+"' AND json_array_length(NEW.group_binding_json,'$.members')=3 BEGIN SELECT RAISE(ABORT,'reviewer_second_union_sql_failure'); END");e!=nil{t.Fatal(e)}
 startOnce.Do(func(){close(start)});var err error;select{case err=<-observed:case <-time.After(5*time.Second):t.Fatal("read did not return")}
 if err==nil||!strings.Contains(err.Error(),"reviewer_second_union_sql_failure"){t.Fatalf("SQL failure swallowed: %v",err)}
 if e:=db.QueryRow(query,parent).Scan(&after);e!=nil{t.Fatal(e)};if before!=after{t.Fatalf("partial qualification committed\nbefore=%s\nafter=%s",before,after)}
 if _,e:=db.Exec("DROP TRIGGER reviewer_union_abort");e!=nil{t.Fatal(e)}
 releaseOnce.Do(func(){close(release)});wait(t,c,root.RunID);if e:=c.Close();e!=nil{t.Fatal(e)}
 if count(t,db,"SELECT count(*) FROM execution_runs WHERE child_slot<>0")!=0||count(t,db,"SELECT count(*) FROM task_config_pins")!=0{t.Fatal("cleanup failed")}
 t.Logf("actual SQL failure=%v; same full persisted proof/derived/source/grants/revision, first contributor rolled back; slots=0 pins=0",err)
}
