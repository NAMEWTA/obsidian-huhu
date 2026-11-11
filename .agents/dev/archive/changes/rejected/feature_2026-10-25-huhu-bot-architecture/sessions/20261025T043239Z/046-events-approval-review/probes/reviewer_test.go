package events_test
import("context";"encoding/json";"testing";"fmt";wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap";"time";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap")
type reviewEngine struct{}
func(reviewEngine) Run(context.Context,api.EngineInput,func(api.EngineEvent)error)(api.EngineResult,error){return api.EngineResult{Status:"finished",Text:"ok"},nil}
func(reviewEngine) Resume(context.Context,api.EngineResumeInput,func(api.EngineEvent)error)(api.EngineResult,error){panic("unexpected resume")}
func TestReviewSourceBearingMaximumDelivery(t *testing.T){
 f:=openWithOptions(t,bootstrap.Options{Engine:reviewEngine{}})
 grant:=f.sourceRun(t,"");f.waitTerminal(t,f.run.RunID)
 var raw string;if e:=f.db.QueryRow("SELECT source_json FROM conversation_messages WHERE run_id=? AND role='user'",f.run.RunID).Scan(&raw);e!=nil{t.Fatal(e)}
 var sources []api.SourceSnapshot;if e:=json.Unmarshal([]byte(raw),&sources);e!=nil{t.Fatal(e)}
 extra:=sources[0];extra.ResourceID="source:second"
 second,e:=f.c.API.Grants.Create(ctx,owner,api.GrantCreate{CommandMeta:f.meta("review-second-grant",""),WorkspaceID:grant.WorkspaceID,Scope:"source",ResourceID:extra.ResourceID,Recipients:grant.Recipients,Operations:[]string{"read","send"}});if e!=nil{t.Fatal(e)}
 sources=append(sources,extra)
 for i:=1;i<50;i++{
  session,e:=f.c.API.Conversation.GetSession(ctx,owner,api.IDQuery{ProfileID:f.profile,ID:f.session.ID});if e!=nil{t.Fatal(e)}
  key:=api.NewID("review:")
  r,e:=f.c.API.Conversation.StartRun(ctx,owner,api.RunStart{CommandMeta:f.meta(key,session.Revision),SessionID:session.ID,Intent:"request",SourceRefs:sources,GrantIDs:[]string{grant.ID,second.ID}});if e!=nil{t.Fatal(e)};f.waitTerminal(t,r.RunID)
 }
 page,e:=f.c.API.Conversation.History(ctx,owner,api.HistoryQuery{PageQuery:api.PageQuery{ProfileID:f.profile,Limit:100},SessionID:f.session.ID});if e!=nil{t.Fatal(e)}
 subjects:=page.DeliverySubjects
 rawPage,_:=json.Marshal(page);t.Logf("actual public History page items=%d bytes=%d next=%s",len(page.Items),len(rawPage),page.NextCursor)
 for _,m:=range page.Items{if len(m.SourceRefs)<1{t.Fatal("missing source")}}

 if len(subjects)!=100{t.Fatal(len(subjects))}
 for _,n:=range []int{2,20,100}{
  started:=time.Now();called:=false
  e:=f.c.API.Events.WithDelivery(ctx,owner,subjects[:n],func(p context.Context)error{called=true;return p.Err()})
  t.Logf("subjects=%d current source+Grant elapsed=%s writer=%v error=%v",n,time.Since(started),called,e)
  if e!=nil||!called{t.Errorf("authorized history delivery rejected: %d %v",n,e)}
 }

 client,_:=pendingServer(t,f)
 if r:=receive(t,client);r.Error!=nil{t.Fatal(r.Error)}
 q:=api.HistoryQuery{PageQuery:api.PageQuery{ProfileID:f.profile,Limit:100},SessionID:f.session.ID}
 send(t,client,"c:review-history","sessions.history",q)
 r:=receive(t,client)
 var remote api.MessagePage;_ = json.Unmarshal(r.Result,&remote)
 t.Logf("actual HAP History items=%d error=%+v",len(remote.Items),r.Error)
 if r.Error!=nil||len(remote.Items)!=100{t.Error("actual legal History page not delivered")}
 for _,n:=range []int{1,2}{_ = fmt.Sprint(n)};_ = wire.MaxFrameBytes
}
