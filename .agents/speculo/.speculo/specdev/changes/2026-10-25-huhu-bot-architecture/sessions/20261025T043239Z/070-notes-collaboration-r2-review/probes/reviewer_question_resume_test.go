package delegation_test

import (
 "context"
 "fmt"
 "strings"
 "sync"
 "sync/atomic"
 "testing"
 "time"

 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestReviewerDeniedQueuedQuestionFeedsActualCheckpointResume(t *testing.T){
 entered:=make(chan struct{},4); rootEntered:=make(chan struct{}); question:=make(chan api.AgentMessage,1)
 release:=make(chan struct{});var once sync.Once;defer once.Do(func(){close(release)})
 resumed:=make(chan api.ToolResult,1);var questionCalls,resumes atomic.Int32
 eng:=resumable{run:func(c context.Context,i api.EngineInput)(api.EngineResult,error){
  switch i.Intent{
  case "root-cp":
   close(rootEntered);var q api.AgentMessage;select{case q=<-question:case <-c.Done():return api.EngineResult{},c.Err()}
   cp,e:=i.Checkpoints.Publish(c,strings.NewReader("reviewer-question-checkpoint"));if e!=nil{return api.EngineResult{},e}
   return api.EngineResult{Status:"suspended",Suspension:&api.EngineSuspension{Kind:"question",WaitForIDs:[]string{q.ID},Checkpoint:cp}},nil
  case "hold":entered<-struct{}{};select{case <-release:case <-c.Done():};return api.EngineResult{Status:"finished",Text:"held"},nil
  case "question":questionCalls.Add(1);return api.EngineResult{Status:"finished",Text:"forbidden answer"},nil
  };return api.EngineResult{},fmt.Errorf("unexpected intent %s",i.Intent)
 },resume:func(c context.Context,i api.EngineResumeInput)(api.EngineResult,error){
  resumes.Add(1);resumed<-i.Decision;return api.EngineResult{Status:"finished",Text:"parent observed failed question"},nil
 }}
 c,_,loc:=open(t,bootstrap.Options{Engine:eng});source,_:=attach(t,c);b:=agent(t,c,"B",nil);a:=agent(t,c,"A",[]string{b.ID});ga:=grant(t,c,source,recipient(a));gb:=grant(t,c,source,recipient(b));sess:=session(t,c,a)
 root,e:=c.API.Conversation.StartRun(ctx,owner,api.RunStart{CommandMeta:meta(t,c,"root-cp",sess.Revision),SessionID:sess.ID,Intent:"root-cp",SourceRefs:[]api.SourceSnapshot{source},GrantIDs:[]string{ga.ID}});if e!=nil{t.Fatal(e)}
 select{case <-rootEntered:case <-time.After(3*time.Second):t.Fatal("root did not enter")}
 for n:=0;n<4;n++{_,e=c.API.Collaboration.Delegate(ctx,owner,api.DelegateCommand{CommandMeta:meta(t,c,fmt.Sprint("held",n),""),RunID:root.RunID,Target:api.DelegationTarget{Kind:"existing",AgentID:b.ID},Task:"hold",Constraints:[]string{}});if e!=nil{t.Fatal(e)}}
 for n:=0;n<4;n++{select{case <-entered:case <-time.After(3*time.Second):t.Fatal("child not running")}}
 q,e:=c.API.Messages.Send(ctx,owner,api.MessageCommand{CommandMeta:meta(t,c,"question",""),RunID:root.RunID,TargetAgentID:b.ID,Kind:"question",Text:"question",SourceRefs:[]api.SourceSnapshot{source}});if e!=nil{t.Fatal(e)}
 question<-q
 wait(t,c,root.RunID,"waiting_children")
 _,e=c.API.Grants.Revoke(ctx,owner,api.GrantRevoke{CommandMeta:meta(t,c,"revoke",gb.Revision),ID:gb.ID});if e!=nil{t.Fatal(e)}
 once.Do(func(){close(release)})
 select{case decision:=<-resumed:
  if len(decision.Children)!=1 || decision.Children[0].Text!="" || decision.Children[0].Status!="failed" || decision.Children[0].Reason!="QUESTION_UNANSWERED"{t.Fatalf("wrong actual CP outcome: %#v",decision)}
  t.Logf("actual Resume consumed body-free failure: %s/%s",decision.Children[0].Status,decision.Children[0].Reason)
 case <-time.After(5*time.Second):t.Fatal("question failure never resumed original CP")}
 final:=wait(t,c,root.RunID,"succeeded");d:=database(t,loc)
 if final.Reason!="CHILD_PARTIAL_FAILURE" || questionCalls.Load()!=0 || resumes.Load()!=1 || count(t,d,"SELECT COALESCE(sum(child_slot),0) FROM execution_runs")!=0 || count(t,d,"SELECT count(*) FROM collaboration_wait_edges")!=0{t.Fatalf("false success/replay/resource retention: reason=%s question=%d resumes=%d",final.Reason,questionCalls.Load(),resumes.Load())}
 var status,reason,body string
 if e=d.QueryRow("SELECT r.status,r.reason,o.text FROM collaboration_delegations d JOIN execution_runs r ON r.run_id=d.child_run_id JOIN collaboration_result_deliveries o ON o.child_run_id=r.run_id WHERE d.delegation_id=?",q.DelegationID).Scan(&status,&reason,&body);e!=nil{t.Fatal(e)}
 if status!="failed"||reason!="GRANT_REVOKED"||body!=""{t.Fatalf("wrong durable child outcome: %s %s %q",status,reason,body)}
 t.Log("question Engine=0; Resume=1; original GRANT_REVOKED durable; parent partial; slots and wait edges=0")
}
