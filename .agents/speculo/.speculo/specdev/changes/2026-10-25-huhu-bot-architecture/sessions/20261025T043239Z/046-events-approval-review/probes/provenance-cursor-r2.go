package events_test
import("testing";"errors";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api")
func TestReviewSnapshotPreservesMessageProvenance(t *testing.T){
 f:=openWithOptions(t,bootstrap.Options{Engine:&eventEngine{release:make(chan struct{})}})
 _=f.sourceRun(t,"");f.waitTerminal(t,f.run.RunID)
 session,e:=f.c.API.Conversation.GetSession(ctx,owner,api.IDQuery{ProfileID:f.profile,ID:f.session.ID});if e!=nil{t.Fatal(e)}
 r,e:=f.c.API.Conversation.StartRun(ctx,owner,api.RunStart{CommandMeta:f.meta("review-compact",session.Revision),SessionID:session.ID,Intent:"compact",SourceRefs:[]api.SourceSnapshot{}});if e!=nil{t.Fatal(e)};f.waitTerminal(t,r.RunID)
 history,e:=f.c.API.Conversation.History(ctx,owner,api.HistoryQuery{PageQuery:api.PageQuery{ProfileID:f.profile,Limit:100},SessionID:f.session.ID});if e!=nil{t.Fatal(e)}
 for i:=len(history.Items)-1;i>=0;i--{
  m:=history.Items[i];if m.Role!="user"||len(m.SourceRefs)!=0{continue}
  var run,stored string;if e=f.db.QueryRow("SELECT run_id,source_json FROM conversation_messages WHERE message_id=?",m.ID).Scan(&run,&stored);e!=nil{t.Fatal(e)}
  _,e=f.c.API.Events.Tail(ctx,owner,api.EventTailQuery{ProfileID:f.profile,RunID:run,AfterSeq:"0"});var fault *api.Fault
  if !errors.As(e,&fault)||fault.Kind!="CURSOR_EXPIRED"{t.Fatalf("wanted actual expired cursor, got %v",e)}
  snapshot:=fault.Details;if snapshot==nil{t.Fatalf("missing typed snapshot %T",fault.Details)}
  t.Logf("actual Tail expired cursor snapshotSeq=%s Run=%s (270 emitted text events)",snapshot.SnapshotSeq,snapshot.Snapshot.Run.Status)
  for _,actual:=range snapshot.Snapshot.Messages{if actual.ID==m.ID{
   t.Logf("same persisted user message id=%s role=%s storedSources=%s historySources=%d snapshotSources=%d snapshotSource=%+v",m.ID,m.Role,stored,len(m.SourceRefs),len(actual.SourceRefs),actual.SourceRefs)
   if len(actual.SourceRefs)!=0{t.Error("snapshot changed exact persisted message provenance")};return
  }}
  t.Fatal("snapshot omitted user message")
 }
 t.Fatal("no eligible inherited Run user message")
}
