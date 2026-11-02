package delegation_test

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type resumable struct {
	run    func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
}

func (f resumable) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f.run(c, i)
}
func (f resumable) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f.resume(c, i)
}

func TestExplicitCheckpointWaitResumesSameExecutorForChildrenAndAnsweredQuestions(t *testing.T) {
	for _, kind := range []string{"children", "question"} {
		t.Run(kind, func(t *testing.T) {
			var target string
			childEntered := make(chan struct{})
			release := make(chan struct{})
			resumed := make(chan error, 1)
			var releaseOnce sync.Once
			defer releaseOnce.Do(func() { close(release) })
			var runs, resumes atomic.Int32
			eng := resumable{}
			eng.run = func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				runs.Add(1)
				if i.Intent == "wait parent" {
					var key string
					if kind == "children" {
						d, e := i.Tools.Invoke(c, api.ToolCall{ID: "delegate", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "wait child", Constraints: []string{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						key = d.Delegation.ChildRunID
					} else {
						d, e := i.Tools.Invoke(c, api.ToolCall{ID: "question", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "question", Text: "wait child", SourceRefs: []api.SourceSnapshot{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						key = d.Message.QuestionID
					}
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("actual-complete-checkpoint"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: kind, WaitForIDs: []string{key}, Checkpoint: cp}}, nil
				}
				if kind == "question" {
					q := i.Messages[0]
					if _, e := i.Tools.Invoke(c, api.ToolCall{ID: "answer", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: q.FromAgentID, Kind: "reply", QuestionID: q.QuestionID, DelegationID: q.DelegationID, Text: "durable answer"}}); e != nil {
						return api.EngineResult{}, e
					}
				}
				close(childEntered)
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				return api.EngineResult{Status: "finished", Text: "durable child result"}, nil
			}
			eng.resume = func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				resumes.Add(1)
				check := func() error {
					r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
					if e != nil {
						return e
					}
					b, e := io.ReadAll(r)
					ce := r.Close()
					if e != nil {
						return e
					}
					if ce != nil {
						return ce
					}
					if string(b) != "actual-complete-checkpoint" {
						return fmt.Errorf("checkpoint mismatch")
					}
					if len(i.Decision.Children) != 1 || i.Decision.Children[0].Status != "succeeded" {
						return fmt.Errorf("real wait outcomes %#v", i.Decision.Children)
					}
					expected := "durable child result"
					if kind == "question" {
						expected = "durable answer"
					}
					if i.Decision.Children[0].Text != expected {
						return fmt.Errorf("wrong result %#v", i.Decision)
					}
					return nil
				}()
				resumed <- check
				if check != nil {
					return api.EngineResult{}, check
				}
				return api.EngineResult{Status: "finished", Text: "resumed parent"}, nil
			}
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			a := agent(t, c, "A", []string{b.ID})
			r := start(t, c, session(t, c, a), "wait parent")
			select {
			case <-childEntered:
			case <-time.After(5 * time.Second):
				t.Fatal("child not entered")
			}
			if kind == "children" {
				wait(t, c, r.RunID, "waiting_children")
				releaseOnce.Do(func() { close(release) })
			}
			select {
			case e := <-resumed:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("checkpoint did not resume")
			}
			if kind == "question" {
				if count(t, database(t, loc), "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status='running'", r.RunID) != 1 {
					t.Fatal("question waited for task completion instead of answer")
				}
				releaseOnce.Do(func() { close(release) })
			}
			wait(t, c, r.RunID, "succeeded")
			if runs.Load() != 2 || resumes.Load() != 1 {
				t.Fatalf("second engine/replay run=%d resume=%d", runs.Load(), resumes.Load())
			}
			d := database(t, loc)
			if count(t, d, "SELECT count(*) FROM collaboration_parent_results WHERE state='claimed'") != 1 || count(t, d, "SELECT count(*) FROM collaboration_wait_edges") != 0 {
				t.Fatal("wait not durably consumed once")
			}
		})
	}
}

func TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots(t *testing.T) {
	for _, schedule := range []string{"batch-admission", "four-leaves-before-last-parents"} {
		t.Run(schedule, func(t *testing.T) {
			var target string
			var db *sql.DB
			firstFourLeaves := make(chan struct{})
			parentsAdmitted := make(chan struct{})
			release := make(chan struct{})
			engineErrors := make(chan error, 32)
			var once sync.Once
			defer once.Do(func() { close(release) })
			var calls, resumes, leaves, active, maximum atomic.Int32

			// Observe the original production permit at every real child entry,
			// including Resume. A waiting or queued task is not an active Engine.
			enter := func(c context.Context, runID string) (func(), error) {
				n := active.Add(1)
				leave := func() { active.Add(-1) }
				for {
					old := maximum.Load()
					if n <= old || maximum.CompareAndSwap(old, n) {
						break
					}
				}
				var status string
				var slot, rootSlots, profileSlots int
				e := db.QueryRowContext(c, "SELECT r.status,r.child_slot,(SELECT COALESCE(sum(child_slot),0) FROM execution_runs WHERE root_run_id=r.root_run_id),(SELECT COALESCE(sum(child_slot),0) FROM execution_runs) FROM execution_runs r WHERE r.run_id=?", runID).Scan(&status, &slot, &rootSlots, &profileSlots)
				if e == nil && (status != "running" || slot != 1 || rootSlots > 4 || profileSlots > 8 || n > 4) {
					e = fmt.Errorf("actual child permit: status=%s slot=%d root=%d profile=%d active=%d", status, slot, rootSlots, profileSlots, n)
				}
				if e != nil {
					engineErrors <- e
				}
				return leave, e
			}
			eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				calls.Add(1)
				if i.Intent == "root" {
					for n := 0; n < 6; n++ {
						_, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "parent-child", Constraints: []string{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						if schedule == "four-leaves-before-last-parents" && n == 3 {
							// This is 070's legal failing interleaving. Only the
							// fixture's admission is gated; the scheduler is unchanged.
							select {
							case <-firstFourLeaves:
							case <-c.Done():
								return api.EngineResult{}, c.Err()
							}
						}
					}
					close(parentsAdmitted)
					return api.EngineResult{Status: "finished", Text: "root"}, nil
				}
				leave, e := enter(c, i.RunID)
				defer leave()
				if e != nil {
					return api.EngineResult{}, e
				}
				if i.Intent == "parent-child" {
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "nested", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "leaf", Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("reviewer-wrong-checkpoint"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
				}
				if i.Intent != "leaf" {
					return api.EngineResult{}, fmt.Errorf("unexpected child intent %q", i.Intent)
				}
				if leaves.Add(1) == 4 {
					close(firstFourLeaves)
				}
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				return api.EngineResult{Status: "finished", Text: "leaf"}, nil
			}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				resumes.Add(1)
				leave, e := enter(c, i.Input.RunID)
				defer leave()
				if e != nil {
					return api.EngineResult{}, e
				}
				r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
				if e != nil {
					return api.EngineResult{}, e
				}
				body, readErr := io.ReadAll(r)
				closeErr := r.Close()
				if readErr != nil {
					return api.EngineResult{}, readErr
				}
				if closeErr != nil {
					return api.EngineResult{}, closeErr
				}
				if string(body) != "child-state" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Status != "succeeded" || i.Decision.Children[0].Text != "leaf" {
					t.Logf("REVIEWER negative actual checkpoint body=%q", body)
					return api.EngineResult{}, fmt.Errorf("wrong checkpoint/resumption %#v", i.Decision)
				}
				var related int
				if e := db.QueryRowContext(c, "SELECT count(*) FROM execution_runs WHERE run_id=? AND parent_run_id=? AND status='succeeded'", i.Decision.Children[0].RunID, i.Input.RunID).Scan(&related); e != nil {
					return api.EngineResult{}, e
				}
				if related != 1 {
					return api.EngineResult{}, fmt.Errorf("resume consumed another parent's result")
				}
				return api.EngineResult{Status: "finished", Text: "joined"}, nil
			}}
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			db = database(t, loc)
			b := agent(t, c, "B", nil)
			target = b.ID
			b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
			if e != nil {
				t.Fatal(e)
			}
			a := agent(t, c, "A", []string{b.ID})
			r := start(t, c, session(t, c, a), "root")
			deadline := time.NewTimer(5 * time.Second)
			defer deadline.Stop()
			await := func(signal <-chan struct{}, description string) {
				t.Helper()
				select {
				case <-signal:
				case e := <-engineErrors:
					t.Fatal(e)
				case <-deadline.C:
					t.Fatalf("no actual %s within original 5s prefix budget", description)
				}
			}
			await(firstFourLeaves, "four-leaf Engine handshake")
			await(parentsAdmitted, "six-parent admission handshake")
			tick := time.NewTicker(5 * time.Millisecond)
			defer tick.Stop()
			for count(t, db, "SELECT count(*) FROM execution_runs WHERE run_id=? AND status='waiting_children'", r.RunID) != 1 {
				select {
				case <-tick.C:
				case e := <-engineErrors:
					t.Fatal(e)
				case <-deadline.C:
					t.Fatal("root did not publish its durable wait within original 5s prefix budget")
				}
			}
			root, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "limits", "").ProfileID, ID: r.RunID})
			if e != nil || root.Limits == nil || root.Limits.RootChildren != 4 || root.Limits.ProfileChildren != 8 {
				t.Fatalf("original limits changed: %#v %v", root.Limits, e)
			}
			waiting := count(t, db, "SELECT count(*) FROM execution_runs WHERE intent='parent-child' AND status='waiting_children'")
			queued := count(t, db, "SELECT count(*) FROM execution_runs WHERE intent='parent-child' AND status='accepted'")
			if waiting+queued != 6 || waiting < 4 || count(t, db, "SELECT count(*) FROM execution_runs WHERE intent='leaf' AND status='running' AND child_slot=1") != 4 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot=1") != 4 {
				t.Fatalf("invalid stable prefix waiting=%d queued=%d", waiting, queued)
			}
			if schedule == "four-leaves-before-last-parents" && (waiting != 4 || queued != 2 || calls.Load() != 9 || resumes.Load() != 0) {
				t.Fatalf("070 forced interleaving not established: waiting=%d queued=%d calls=%d resume=%d", waiting, queued, calls.Load(), resumes.Load())
			}
			if count(t, db, "SELECT count(*) FROM execution_runs WHERE status IN('waiting_children','accepted') AND child_slot<>0") != 0 {
				t.Fatal("stopped waiting or queued producer kept an active slot")
			}
			if count(t, db, "SELECT count(*) FROM execution_runs r WHERE r.intent='parent-child' AND NOT EXISTS(SELECT 1 FROM task_config_pins p WHERE p.run_id=r.run_id AND p.snapshot_id=r.task_config_id)") != 0 {
				t.Fatal("waiting/queued task released its live configuration pin")
			}
			t.Logf("actual prefix: leaf running/slot1=4 parent waiting/slot0=%d parent queued/slot0=%d root waiting/slot0=1", waiting, queued)
			once.Do(func() { close(release) })
			wait(t, c, r.RunID, "succeeded")
			if calls.Load() != 13 || resumes.Load() != 6 || leaves.Load() != 6 || active.Load() != 0 || maximum.Load() != 4 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM execution_runs WHERE status='succeeded'") != 13 {
				t.Fatalf("resume/reclaim lifecycle calls=%d resume=%d leaves=%d active=%d max=%d", calls.Load(), resumes.Load(), leaves.Load(), active.Load(), maximum.Load())
			}
			if count(t, db, "SELECT count(*) FROM task_config_pins") != 0 || count(t, db, "SELECT count(*) FROM config_snapshot_pins") != 0 || count(t, db, "SELECT count(*) FROM collaboration_wait_edges") != 0 {
				t.Fatal("terminal tasks leaked a pin or wait edge")
			}
			history, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "history", "").ProfileID, Limit: 10}, SessionID: root.SessionID})
			if e != nil {
				t.Fatal(e)
			}
			joined := false
			for _, message := range history.Items {
				if message.Role == "assistant" && !message.Partial && strings.Count(message.Text, "\n\njoined") == 6 {
					joined = true
				}
			}
			if !joined {
				t.Fatal("actual root result omitted resumed child results")
			}
			for len(engineErrors) != 0 {
				t.Error(<-engineErrors)
			}
			t.Logf("after actual release: root=succeeded calls=%d resumes=%d leaves=%d slots=0 max-active-child=%d", calls.Load(), resumes.Load(), leaves.Load(), maximum.Load())
		})
	}
}
