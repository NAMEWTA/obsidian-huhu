package chat_test

import (
 "context"
 "database/sql"
 "errors"
 "testing"

 "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// Adds two adjacent transaction hypotheses to the author's one-item fault seam.
// The Profile, public admissions, Claim, finalization and SQLite transaction are real.
type reviewerClaimReader struct {
 *faultyClaimInbox
 second string
 secondFault bool
 requirementFault error
}
func (r *reviewerClaimReader) MessagesInTx(c context.Context, tx *sql.Tx, run string) ([]api.AgentMessage,error) {
 if run==r.second && r.secondFault {
  var n int
  return nil,tx.QueryRowContext(c,"SELECT value FROM reviewer_missing_after_first_refusal").Scan(&n)
 }
 return r.faultyClaimInbox.MessagesInTx(c,tx,run)
}
func (r *reviewerClaimReader) DelegationInputInTx(c context.Context,tx *sql.Tx,run string)(*api.DelegationInput,error){
 if r.requirementFault!=nil{return nil,r.requirementFault}
 return r.Store.DelegationInputInTx(c,tx,run)
}
func TestReviewerClaimRollbackAfterAnEarlierKnownRefusal(t *testing.T){
 f:=newClaimFailureFixture(t)
 f.inbox.read=func(context.Context,*sql.Tx)error{return api.Denied("GRANT_REVOKED")}
 r:=&reviewerClaimReader{faultyClaimInbox:f.inbox,second:f.healthy.RunID,secondFault:true}
 f.runs.SetTreeControl(r)
 work,err:=f.runs.Claim(ctx)
 if err==nil || work!=nil{t.Fatalf("second SQL failure escaped as executable work: %v %v",work,err)}
 var typed *api.Fault
 if errors.As(err,&typed){t.Fatalf("SQL error was relabeled as business refusal: %v",err)}
 f.assertUncommitted(t)
 t.Logf("second candidate SQL error rolls back earlier refusal, event, release and occupancy: %v",err)
 r.secondFault=false
 work,err=f.runs.Claim(ctx)
 if err!=nil || work==nil || work.Run.ID!=f.healthy.RunID{t.Fatalf("recovery did not progress: %v %v",work,err)}
 if f.count(t,"SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='failed'",f.bad.RunID)!=1{t.Fatal("retried Claim duplicated refusal event")}
 t.Log("after removing exact SQL fault: one failed event, healthy Work returned")
}
func TestReviewerRecognizedReasonOutsideMessageStageStillRollsBack(t *testing.T){
 f:=newClaimFailureFixture(t)
 refusal:=api.Denied("GRANT_REVOKED")
 r:=&reviewerClaimReader{faultyClaimInbox:f.inbox,requirementFault:refusal}
 f.runs.SetTreeControl(r)
 work,err:=f.runs.Claim(ctx)
 if !errors.Is(err,refusal)||work!=nil{t.Fatalf("non-message stage consumed error: %v %v",work,err)}
 f.assertUncommitted(t)
 t.Log("recognized reason from requirement reader preserved original error, nil Work and all accepted state")
}
