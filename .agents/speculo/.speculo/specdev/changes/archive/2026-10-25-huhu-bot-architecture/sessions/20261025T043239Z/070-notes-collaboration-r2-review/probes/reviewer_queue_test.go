package delegation_test

import (
 "context"
 "fmt"
 "sync"
 "testing"
 "time"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestReviewerQueuedQuestionRevocationDoesNotBlockUnrelatedRoot(t *testing.T) {
 for _, revoke := range []bool{false,true} { t.Run(fmt.Sprint("revoke=",revoke),func(t *testing.T){
  entered:=make(chan struct{},4); rootEntered:=make(chan struct{}); unblock:=make(chan struct{}); endRoot:=make(chan struct{}); healthy:=make(chan struct{},1)
  var once, rootOnce sync.Once
  defer once.Do(func(){close(unblock)}); defer rootOnce.Do(func(){close(endRoot)})
  eng:=engineFunc(func(c context.Context,i api.EngineInput)(api.EngineResult,error){
   switch i.Intent {
   case "root": close(rootEntered); select {case <-endRoot:case <-c.Done():}; return api.EngineResult{Status:"finished",Text:"root complete"},nil
   case "hold": entered<-struct{}{}; select{case <-unblock:case <-c.Done():}; return api.EngineResult{Status:"finished",Text:"held child complete"},nil
   case "question": return api.EngineResult{Status:"finished",Text:"answer"},nil
   case "unrelated": healthy<-struct{}{}; return api.EngineResult{Status:"finished",Text:"independent complete"},nil
   };return api.EngineResult{},fmt.Errorf("unexpected %q",i.Intent)
  })
  c,_,loc:=open(t,bootstrap.Options{Engine:eng}); source,_:=attach(t,c); b:=agent(t,c,"B",nil); a:=agent(t,c,"A",[]string{b.ID}); ga:=grant(t,c,source,recipient(a)); gb:=grant(t,c,source,recipient(b)); sess:=session(t,c,a)
  root,e:=c.API.Conversation.StartRun(ctx,owner,api.RunStart{CommandMeta:meta(t,c,"start-source",sess.Revision),SessionID:sess.ID,Intent:"root",SourceRefs:[]api.SourceSnapshot{source},GrantIDs:[]string{ga.ID}});if e!=nil{t.Fatal(e)}
  select{case <-rootEntered:case <-time.After(3*time.Second):t.Fatal("root not running")}
  for n:=0;n<4;n++ {_,e=c.API.Collaboration.Delegate(ctx,owner,api.DelegateCommand{CommandMeta:meta(t,c,fmt.Sprint("hold",n),""),RunID:root.RunID,Target:api.DelegationTarget{Kind:"existing",AgentID:b.ID},Task:"hold",Constraints:[]string{}});if e!=nil{t.Fatal(e)}}
  for n:=0;n<4;n++ {select{case <-entered:case <-time.After(3*time.Second):t.Fatal("four slots not occupied")}}
  q,e:=c.API.Messages.Send(ctx,owner,api.MessageCommand{CommandMeta:meta(t,c,"queued-question",""),RunID:root.RunID,TargetAgentID:b.ID,Kind:"question",Text:"question",SourceRefs:[]api.SourceSnapshot{source}});if e!=nil{t.Fatal(e)}
  d:=database(t,loc);var qrun string;if e=d.QueryRow("SELECT child_run_id FROM collaboration_delegations WHERE delegation_id=?",q.DelegationID).Scan(&qrun);e!=nil{t.Fatal(e)}
  if n:=count(t,d,"SELECT count(*) FROM execution_runs WHERE run_id=? AND status='accepted' AND child_slot=0",qrun);n!=1{t.Fatal("question not queued")}
  if revoke {_,e=c.API.Grants.Revoke(ctx,owner,api.GrantRevoke{CommandMeta:meta(t,c,"revoke-B",gb.Revision),ID:gb.ID});if e!=nil{t.Fatal(e)}}
  once.Do(func(){close(unblock)})
  deadline:=time.Now().Add(3*time.Second)
  for count(t,d,"SELECT COALESCE(sum(child_slot),0) FROM execution_runs")!=0 {if time.Now().After(deadline){t.Fatal("producers not ended")};time.Sleep(5*time.Millisecond)}
  time.Sleep(120*time.Millisecond)
  independent:=start(t,c,session(t,c,a),"unrelated")
  select{case <-healthy:t.Log("independent Engine entered")
  case <-time.After(1200*time.Millisecond):
   var qs,hs string;var slots int
   _=d.QueryRow("SELECT status,child_slot FROM execution_runs WHERE run_id=?",qrun).Scan(&qs,&slots)
   _=d.QueryRow("SELECT status FROM execution_runs WHERE run_id=?",independent.RunID).Scan(&hs)
   t.Errorf("unrelated root starved after queued question grant revoke: question=%s slot=%d independent=%s",qs,slots,hs)
   t.Logf("durable: ended held children=%d questionMessages=%d qPreparingEvents=%d totalSlots=%d",count(t,d,"SELECT count(*) FROM execution_runs WHERE intent='hold' AND status='failed' AND child_slot=0"),count(t,d,"SELECT count(*) FROM collaboration_messages WHERE kind='question' AND status='delivered'"),count(t,d,"SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='preparing'",qrun),count(t,d,"SELECT COALESCE(sum(child_slot),0) FROM execution_runs"))
   var revision string; if e=d.QueryRow("SELECT CAST(revision AS TEXT) FROM collaboration_delegations WHERE delegation_id=?",q.DelegationID).Scan(&revision);e!=nil{t.Fatal(e)}
   _,e=c.API.Collaboration.CancelTask(ctx,owner,api.TaskCancel{CommandMeta:meta(t,c,"remove-poison",revision),ID:q.DelegationID,Scope:"subtree"});if e!=nil{t.Fatal(e)}
   select{case <-healthy:t.Log("after public CancelTask: unrelated Engine entered without restart");case <-time.After(time.Second):t.Fatal("cancel did not recover unrelated work")}

  }
  rootOnce.Do(func(){close(endRoot)})
 }) }
}
