package access_test

import (
 "database/sql"
 "errors"
 "testing"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
 grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// Independent adapter differential: after 32 successful uses of an identical
// Grant, a different 33rd request must not inherit the cached policy verdict.
// This isolates the newly reused representation; the original events probe
// independently exercises actual public Runs/History/HAP delivery.
func TestReviewBatchPolicyNeverReusesVerdict(t *testing.T) {
 f:=open(t)
 source:=f.source("source:review-policy", "PRIVATE_REVIEW_POLICY")
 grant:=f.grant(t,source,"review-policy-grant")
 valid:=f.input([]api.SourceSnapshot{source},grant)
 db,e:=base.Open(ctx,&profile.Handle{DatabasePath:f.database})
 if e!=nil {t.Fatal(e)}
 t.Cleanup(func(){if e:=db.Close();e!=nil {t.Error(e)}})
 checks:=grantsstore.New(db)
 code:=func(e error)string{if e==nil{return ""};var f *api.Fault;if !errors.As(e,&f){return e.Error()};return f.Kind+":"+f.Reason}
 for _,test:=range []struct{name,want string;change func(*api.RunAccessInput)}{
  {"scope", "CAPABILITY_DENIED:SOURCE_NOT_GRANTED",func(in *api.RunAccessInput){in.Sources[0].ResourceID="source:different"}},
  {"workspace", "CAPABILITY_DENIED:WORKSPACE_MISMATCH",func(in *api.RunAccessInput){in.Sources[0].WorkspaceID="workspace:different"}},
  {"session", "CAPABILITY_DENIED:SESSION_SCOPE_MISMATCH",func(in *api.RunAccessInput){in.SessionID="session:different"}},
  {"task", "CAPABILITY_DENIED:TASK_SCOPE_MISMATCH",func(in *api.RunAccessInput){in.TaskID="task:different"}},
 } {
  t.Run(test.name,func(t *testing.T){
   bad:=valid;bad.Sources=append([]api.SourceSnapshot(nil),valid.Sources...);test.change(&bad)
   if e:=db.WithinTx(ctx,func(tx *sql.Tx)error{
    if _,e:=tx.ExecContext(ctx,"UPDATE access_grants SET task_id=? WHERE grant_id=?",valid.TaskID,grant.ID);e!=nil{return e}
    if _,e:=checks.ReadDeadlineInTx(ctx,tx,owner,valid);e!=nil{return e}
    _,single:=checks.ReadDeadlineInTx(ctx,tx,owner,bad)
    inputs:=make([]api.RunAccessInput,32);for i:=range inputs {inputs[i]=valid};inputs=append(inputs,bad)
    _,batch:=checks.ReadDeadlineBatchInTx(ctx,tx,owner,f.profile,inputs)
    if code(single)!=test.want||code(batch)!=test.want {t.Fatalf("cached verdict: single=%v batch=%v want=%s",single,batch,test.want)}
    t.Logf("32 same-Grant authorized requests then changed %s: single=%s batch=%s",test.name,code(single),code(batch))
    return nil
   });e!=nil{t.Fatal(e)}
  })
 }
 if e:=db.WithinTx(ctx,func(tx *sql.Tx)error{
  if _,e:=checks.ReadDeadlineBatchInTx(ctx,tx,owner,f.profile,[]api.RunAccessInput{valid,valid});e!=nil{return e}
  if _,e:=tx.ExecContext(ctx,"UPDATE access_grants SET state='revoked' WHERE grant_id=?",grant.ID);e!=nil{return e}
  _,e:=checks.ReadDeadlineBatchInTx(ctx,tx,owner,f.profile,[]api.RunAccessInput{valid,valid})
  if code(e)!="CAPABILITY_DENIED:GRANT_REVOKED" {t.Fatalf("facts survived next call in same transaction: %v",e)}
  t.Log("separate batch call after explicit same-Tx revoke rereads current rows and denies")
  return nil
 });e!=nil{t.Fatal(e)}
}
