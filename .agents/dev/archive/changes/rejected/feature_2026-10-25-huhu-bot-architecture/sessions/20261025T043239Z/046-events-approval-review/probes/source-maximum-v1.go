package events_test
import("context";"encoding/json";"testing";"time";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap")
type reviewEngine struct{}
func(reviewEngine) Run(context.Context,api.EngineInput,func(api.EngineEvent)error)(api.EngineResult,error){return api.EngineResult{Status:"finished",Text:"ok"},nil}
func(reviewEngine) Resume(context.Context,api.EngineResumeInput,func(api.EngineEvent)error)(api.EngineResult,error){panic("unexpected resume")}
func TestReviewSourceBearingMaximumDelivery(t *testing.T){
 f:=openWithOptions(t,bootstrap.Options{Engine:reviewEngine{}})
 grant:=f.sourceRun(t,"");f.waitTerminal(t,f.run.RunID)
 var raw string;if e:=f.db.QueryRow("SELECT source_json FROM conversation_messages WHERE run_id=? AND role='user'",f.run.RunID).Scan(&raw);e!=nil{t.Fatal(e)}
 var sources []api.SourceSnapshot;if e:=json.Unmarshal([]byte(raw),&sources);e!=nil{t.Fatal(e)}
 subjects:=[]api.DeliverySubject{}
 for i:=0;i<400;i++{
  var session api.Session
  if i==0{session=f.session}else{
   key:=api.NewID("review:");var e error
   session,e=f.c.API.Conversation.CreateSession(ctx,owner,api.SessionCreate{CommandMeta:f.meta(key,""),Kind:"direct",MemberIDs:f.session.MemberIDs,WorkspaceID:f.session.WorkspaceID});if e!=nil{t.Fatal(e)}
   r,e:=f.c.API.Conversation.StartRun(ctx,owner,api.RunStart{CommandMeta:f.meta(key+"run",session.Revision),SessionID:session.ID,Intent:"request",SourceRefs:sources,GrantIDs:[]string{grant.ID}});if e!=nil{t.Fatal(e)};f.waitTerminal(t,r.RunID)
  }
  page,e:=f.c.API.Conversation.History(ctx,owner,api.HistoryQuery{PageQuery:api.PageQuery{ProfileID:f.profile,Limit:100},SessionID:session.ID});if e!=nil{t.Fatal(e)}
  if len(page.Items)!=2 || len(page.DeliverySubjects)!=2 {t.Fatalf("unexpected page %+v",page)}
  for _,m:=range page.Items{if len(m.SourceRefs)!=1{t.Fatal("missing actual source",m)}}
  subjects=append(subjects,page.DeliverySubjects...)
 }
 if len(subjects)!=800{t.Fatal(len(subjects))}
 for _,n:=range []int{100,400,800}{
  started:=time.Now();called:=false
  e:=f.c.API.Events.WithDelivery(ctx,owner,subjects[:n],func(p context.Context)error{called=true;return p.Err()})
  t.Logf("subjects=%d current source+Grant elapsed=%s writer=%v error=%v",n,time.Since(started),called,e)
  if e!=nil||!called{t.Errorf("authorized history delivery rejected: %d %v",n,e)}
 }
}
