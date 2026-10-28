package chat_test

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
	"time"

	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	collabstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/collaboration"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	usagestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistantapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	delegateapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
)

func TestClaimCursorRollbackAndCanceledWaiter(t *testing.T) {
	for _, window := range []string{"commit", "waiting-for-claim"} {
		t.Run(window, func(t *testing.T) {
			f := newClaimFailureFixture(t)
			if window == "commit" {
				if _, e := f.db.Database().ExecContext(ctx, "CREATE TABLE claim_fault_parent(id TEXT PRIMARY KEY); CREATE TABLE claim_fault_child(id INTEGER PRIMARY KEY,parent_id TEXT REFERENCES claim_fault_parent(id) DEFERRABLE INITIALLY DEFERRED)"); e != nil {
					t.Fatal(e)
				}
				f.inbox.commitFK = true
				f.inbox.read = func(context.Context, *sql.Tx) error { return api.Denied("GRANT_REVOKED") }
				if work, e := f.runs.Claim(ctx); e == nil || work != nil {
					t.Fatal("deferred Commit failure returned work", work, e)
				}
				f.inbox.commitFK = false
			} else {
				entered, release := make(chan struct{}), make(chan struct{})
				failure := errors.New("injected inbox read failure after Claim barrier")
				f.inbox.read = func(context.Context, *sql.Tx) error {
					close(entered)
					<-release
					return failure
				}
				var once sync.Once
				unblock := func() { once.Do(func() { close(release) }) }
				done := make(chan error, 1)
				go func() {
					work, e := f.runs.Claim(ctx)
					if work != nil {
						e = errors.New("failed inbox read returned executable work")
					}
					done <- e
				}()
				waited := false
				t.Cleanup(func() {
					unblock()
					if !waited {
						<-done
					}
				})
				select {
				case <-entered:
				case <-time.After(3 * time.Second):
					t.Fatal("first Claim did not enter the real transaction")
				}
				canceled, cancel := context.WithCancel(ctx)
				cancel()
				if work, e := f.runs.Claim(canceled); work != nil || !errors.Is(e, context.Canceled) {
					t.Fatal("canceled Claim waiter did not leave without work", work, e)
				}
				unblock()
				e := <-done
				waited = true
				if !errors.Is(e, failure) {
					t.Fatal("original transaction error changed", e)
				}
			}
			f.assertUncommitted(t)
			f.inbox.read = func(context.Context, *sql.Tx) error { return nil }
			first, e := f.runs.Claim(ctx)
			if e != nil || first == nil || first.Run.ID != f.bad.RunID {
				t.Fatal("rollback advanced the cursor past the original first Run", first, e)
			}
			second, e := f.runs.Claim(ctx)
			if e != nil || second == nil || second.Run.ID != f.healthy.RunID || first.ClaimToken == second.ClaimToken {
				t.Fatal("next original Run was skipped or shared a claim", second, e)
			}
			if next, e := f.runs.Claim(ctx); e != nil || next != nil {
				t.Fatal("claimed Runs became executable twice", next, e)
			}
		})
	}
}

// The seam stops the actual policy only after its real parent result and slot
// have been selected in the caller's transaction. It never fabricates a false
// Claim result or changes persisted Run status to manufacture the interleaving.
type stopAfterParent struct {
	*faultyClaimInbox
	selected      bool
	selectedSlot  int
	selectedState string
}

func (s *stopAfterParent) ReadyParentInTx(c context.Context, tx *sql.Tx, after executionstore.ParentCursor) (executionstore.ParentReady, error) {
	ready, e := s.Store.ReadyParentInTx(c, tx, after)
	id := ready.RunID
	if e == nil && id != "" {
		e = tx.QueryRowContext(c, "SELECT r.child_slot,p.state FROM execution_runs r JOIN collaboration_parent_results p ON p.run_id=r.run_id WHERE r.run_id=?", id).Scan(&s.selectedSlot, &s.selectedState)
		if e != nil {
			return executionstore.ParentReady{}, e
		}
		s.selected = true
		s.Store.StopAdmission()
	}
	return ready, e
}

func TestClaimStopAfterParentSelectionRollsBackConsumption(t *testing.T) {
	f := newClaimFailureFixture(t)
	f.inbox.read = func(context.Context, *sql.Tx) error { return nil }
	// Clear the fixture's two publicly admitted roots through their real Claim
	// and finalization paths before preparing the independent parent tree.
	for range 2 {
		w, e := f.runs.Claim(ctx)
		if e != nil || w == nil {
			t.Fatal(w, e)
		}
		if e = f.runs.Finalize(ctx, *w, api.EngineResult{Status: "finished"}); e != nil {
			t.Fatal(e)
		}
	}
	configs := assistantstore.New(f.db)
	access := grantsstore.New(f.db)
	assistants, e := assistantapp.New(ctx, configs, assistantapp.Options{Usage: f.runs})
	if e != nil {
		t.Fatal(e)
	}
	metadata, e := f.db.ReadMetadata(ctx)
	if e != nil {
		t.Fatal(e)
	}
	command := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: f.profile, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: revision}
	}
	worker, e := assistants.Create(ctx, owner, api.AgentCreate{CommandMeta: command("stop-worker", ""), Draft: api.AgentDraft{Name: "worker"}})
	if e != nil {
		t.Fatal(e)
	}
	parent, e := assistants.Create(ctx, owner, api.AgentCreate{CommandMeta: command("stop-parent", ""), Draft: api.AgentDraft{Name: "parent", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{worker.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	coordinator, e := assistants.Create(ctx, owner, api.AgentCreate{CommandMeta: command("stop-coordinator", ""), Draft: api.AgentDraft{Name: "coordinator", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{parent.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	session, e := f.conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: command("stop-session", ""), Kind: "direct", MemberIDs: []string{coordinator.ID}})
	if e != nil {
		t.Fatal(e)
	}
	receipt, e := f.conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: command("stop-run", session.Revision), SessionID: session.ID, Intent: "parent", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	w, e := f.runs.Claim(ctx)
	if e != nil || w == nil || w.Run.ID != receipt.RunID {
		t.Fatal(w, e)
	}
	if e = f.runs.MarkRunning(ctx, *w); e != nil {
		t.Fatal(e)
	}
	delegates := delegateapp.New(collabstore.New(f.db, configs, f.runs, access, f.inbox.Store))
	middle, e := delegates.Delegate(ctx, owner, api.DelegateCommand{CommandMeta: command("stop-middle", ""), RunID: receipt.RunID, Target: api.DelegationTarget{Kind: "existing", AgentID: parent.ID}, Task: "middle", Constraints: []string{}})
	if e != nil {
		t.Fatal(e)
	}
	if e = f.runs.Finalize(ctx, *w, api.EngineResult{Status: "finished", Text: "coordinator-body"}); e != nil {
		t.Fatal(e)
	}
	w, e = f.runs.Claim(ctx)
	if e != nil || w == nil || w.Run.ID != middle.ChildRunID {
		t.Fatal(w, e)
	}
	if e = f.runs.MarkRunning(ctx, *w); e != nil {
		t.Fatal(e)
	}
	child, e := delegates.Delegate(ctx, owner, api.DelegateCommand{CommandMeta: command("stop-delegate", ""), RunID: middle.ChildRunID, Target: api.DelegationTarget{Kind: "existing", AgentID: worker.ID}, Task: "child", Constraints: []string{}})
	if e != nil {
		t.Fatal(e)
	}
	if e = f.runs.Finalize(ctx, *w, api.EngineResult{Status: "finished", Text: "parent-body"}); e != nil {
		t.Fatal(e)
	}
	leaf, e := f.runs.Claim(ctx)
	if e != nil || leaf == nil || leaf.Run.ID != child.ChildRunID {
		t.Fatal(leaf, e)
	}
	if e = f.runs.Finalize(ctx, *leaf, api.EngineResult{Status: "finished", Text: "child-body"}); e != nil {
		t.Fatal(e)
	}
	stopping := &stopAfterParent{faultyClaimInbox: f.inbox}
	f.runs.SetTreeControl(stopping)
	work, claimErr := f.runs.Claim(ctx)
	if !stopping.selected || stopping.selectedSlot != 1 || stopping.selectedState != "claimed" || work != nil || claimErr == nil {
		t.Errorf("actual StopAdmission after parent consumption did not roll back Claim: selected=%v slot=%d result=%s work=%v err=%v", stopping.selected, stopping.selectedSlot, stopping.selectedState, work, claimErr)
	}
	var state string
	if e = f.db.Database().QueryRowContext(ctx, "SELECT state FROM collaboration_parent_results WHERE run_id=?", middle.ChildRunID).Scan(&state); e != nil || state != "waiting" {
		t.Error("stopped Claim consumed the original durable parent result", state, e)
	}
	run, e := f.conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: middle.ChildRunID})
	if e != nil || run.Status != "waiting_children" || f.count(t, "SELECT COALESCE(sum(child_slot),0) FROM execution_runs") != 0 {
		t.Fatal("stopped Claim changed Run stage or retained a selected slot", run, e)
	}
	if t.Failed() {
		return
	}
	// Recreate only the stopped policy instance, as bootstrap does on reopen;
	// no old Run/result/claim/CP/receipt is rewritten to make it ready.
	reopened := usagestore.New(f.db, access, api.ExecutionLimits{}, api.BudgetPolicy{})
	reopened.SetTerminalCleanup(f.runs.ReleaseTerminalPinsInTx)
	f.runs.SetTreeControl(reopened)
	retry, e := f.runs.Claim(ctx)
	if e != nil || retry == nil || retry.Run.ID != middle.ChildRunID || retry.CompletedResult == nil || retry.CompletedResult.Text != "parent-body\n\nchild-body" {
		t.Fatal("original parent result was not available exactly once after policy reopen", retry, e)
	}
	if e = f.runs.Finalize(ctx, *retry, *retry.CompletedResult); e != nil {
		t.Fatal(e)
	}
	bounded, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	for {
		completedRoot, e := f.runs.Claim(bounded)
		if e != nil {
			t.Fatal("original coordinator claim failed", e)
		}
		if completedRoot != nil {
			if completedRoot.Run.ID != receipt.RunID || completedRoot.CompletedResult == nil {
				t.Fatal("original coordinator did not collect the same completed child", completedRoot)
			}
			if e = f.runs.Finalize(ctx, *completedRoot, *completedRoot.CompletedResult); e != nil {
				t.Fatal(e)
			}
			break
		}
		// A bounded page may first reach its end and rewind before revisiting
		// the older coordinator which became ready when B just completed.
		select {
		case <-bounded.Done():
			t.Fatal("original coordinator did not become claimable", bounded.Err())
		case <-ticker.C:
		}
	}
	if next, e := f.runs.Claim(ctx); e != nil || next != nil {
		t.Fatal("original parent result was delivered more than once", next, e)
	}
}
