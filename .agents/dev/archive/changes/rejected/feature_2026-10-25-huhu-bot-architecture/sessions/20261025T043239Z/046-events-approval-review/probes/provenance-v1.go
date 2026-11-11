package events_test
import("testing";"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api")
func TestReviewSnapshotPreservesMessageProvenance(t *testing.T){
 f,_:=historyRuns(t)
 history,e:=f.c.API.Conversation.History(ctx,owner,api.HistoryQuery{PageQuery:api.PageQuery{ProfileID:f.profile,Limit:100},SessionID:f.session.ID});if e!=nil{t.Fatal(e)}
 for i:=len(history.Items)-1;i>=0;i--{
  m:=history.Items[i];if m.Role!="user"||len(m.SourceRefs)!=0{continue}
  var run,stored string;if e=f.db.QueryRow("SELECT run_id,source_json FROM conversation_messages WHERE message_id=?",m.ID).Scan(&run,&stored);e!=nil{t.Fatal(e)}
  snapshot,e:=f.c.API.Events.Snapshot(ctx,owner,api.IDQuery{ProfileID:f.profile,ID:run});if e!=nil{t.Fatal(e)}
  for _,actual:=range snapshot.Snapshot.Messages{if actual.ID==m.ID{
   t.Logf("same persisted user message id=%s role=%s storedSources=%s historySources=%d snapshotSources=%d snapshotSource=%+v",m.ID,m.Role,stored,len(m.SourceRefs),len(actual.SourceRefs),actual.SourceRefs)
   if len(actual.SourceRefs)!=0{t.Error("snapshot changed exact persisted message provenance")};return
  }}
  t.Fatal("snapshot omitted user message")
 }
 t.Fatal("no eligible inherited Run user message")
}
