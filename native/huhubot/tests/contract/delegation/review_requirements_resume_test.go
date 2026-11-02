package delegation_test

import (
	"context"
	"fmt"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestMaterializedDelegationKeepsOriginalRequirementsBoundsAcrossCheckpointReopen(t *testing.T) {
	for _, kind := range []string{"existing", "temporary"} {
		t.Run(kind, func(t *testing.T) {
			const rawTaskBytes = 40000
			parentText := strings.Repeat("parent-context ", 4000) // 60,000 UTF8 bytes
			task := strings.Repeat("t", rawTaskBytes)
			constraints := make([]string, 16)
			for i := range constraints {
				constraints[i] = strings.Repeat(fmt.Sprint(i%10), 2048)
			}
			expected := strings.Repeat("o", 8192)
			materialized := task + "\n\n" + parentText
			if len(materialized) > 131072 || len(materialized)+16*2048+len(expected) <= 131072 {
				t.Fatal("fixture does not cross only the old two-stage sum")
			}
			rootEntered := make(chan struct{}, 1)
			rootChild := make(chan api.Delegation, 1)
			leafMade := make(chan api.Delegation, 1)
			leafEntered := make(chan struct{}, 1)
			received := make(chan api.DelegationInput, 1)
			resumed := make(chan error, 1)
			var target string
			var childCalls, childResumes atomic.Int32
			check := func(i api.EngineInput) error {
				if i.Delegation == nil || i.Delegation.DelegationID != i.Lineage.DelegationID || i.Delegation.Task != materialized || i.Intent != materialized || i.Delegation.ExpectedOutput != expected || len(i.Delegation.Constraints) != len(constraints) {
					return fmt.Errorf("accepted task/requirements changed in actual input")
				}
				for j, v := range constraints {
					if i.Delegation.Constraints[j] != v {
						return fmt.Errorf("constraint %d changed", j)
					}
				}
				if len(i.Context.Sources) != 0 || len(i.Lineage.Derived) == 0 {
					return fmt.Errorf("actual selected message lineage disappeared")
				}
				return nil
			}
			eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				switch i.Intent {
				case parentText:
					if i.Delegation != nil {
						return api.EngineResult{}, fmt.Errorf("ordinary root inherited another task's requirements")
					}
					rootEntered <- struct{}{}
					var d api.Delegation
					select {
					case d = <-rootChild:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("root-persistent-wait"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{d.ChildRunID}, Checkpoint: cp}}, nil
				case materialized:
					childCalls.Add(1)
					if e := check(i); e != nil {
						return api.EngineResult{}, e
					}
					received <- *i.Delegation
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "leaf", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "held-leaf", Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					leafMade <- *v.Delegation
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("child-persistent-wait"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
				case "held-leaf":
					leafEntered <- struct{}{}
					<-c.Done()
					return api.EngineResult{}, c.Err()
				}
				return api.EngineResult{}, fmt.Errorf("unexpected intent")
			}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				if i.Input.Intent == materialized {
					childResumes.Add(1)
					e := check(i.Input)
					resumed <- e
					return api.EngineResult{Status: "finished", Text: "actual child resumed"}, e
				}
				if i.Input.Intent != parentText || i.Input.Delegation != nil {
					return api.EngineResult{}, fmt.Errorf("wrong parent continuation")
				}
				return api.EngineResult{Status: "finished", Text: "actual root resumed"}, nil
			}}
			c, root, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			var e error
			b, e = c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
			if e != nil {
				t.Fatal(e)
			}
			target = b.ID
			a := agent(t, c, "A", []string{b.ID})
			s := session(t, c, a)
			r := start(t, c, s, parentText)
			select {
			case <-rootEntered:
			case <-time.After(5 * time.Second):
				t.Fatal("root not entered")
			}
			history, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "h", "").ProfileID, Limit: 10}, SessionID: s.ID})
			if e != nil {
				t.Fatal(e)
			}
			message := ""
			for _, m := range history.Items {
				if m.Role == "user" && m.Text == parentText {
					message = m.ID
				}
			}
			if message == "" {
				t.Fatal("real selected parent message missing")
			}
			destination := api.DelegationTarget{Kind: "existing", AgentID: b.ID}
			if kind == "temporary" {
				destination = api.DelegationTarget{Kind: "temporary", Draft: &api.AgentDraft{Name: "Temp bounded", Persona: "plain", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{b.ID}, Model: &b.Model.ModelBindingDraft}}
			}
			d, e := c.API.Collaboration.Delegate(ctx, owner, api.DelegateCommand{CommandMeta: meta(t, c, "actual requirements", ""), RunID: r.RunID, Target: destination, Task: task, Constraints: constraints, ExpectedOutput: expected, Context: api.ContextEnvelope{MessageIDs: []string{message}}})
			if e != nil {
				t.Fatalf("old lawful context boundary rejected: %v", e)
			}
			rootChild <- d
			select {
			case first := <-received:
				if first.DelegationID != d.ID {
					t.Fatal("requirements loaded from another task")
				}
			case <-time.After(5 * time.Second):
				t.Fatal("child input missing")
			}
			var leaf api.Delegation
			select {
			case leaf = <-leafMade:
			case <-time.After(5 * time.Second):
				t.Fatal("leaf missing")
			}
			select {
			case <-leafEntered:
			case <-time.After(5 * time.Second):
				t.Fatal("actual leaf not entered")
			}
			wait(t, c, r.RunID, "waiting_children")
			wait(t, c, d.ChildRunID, "waiting_children")
			if e = c.Close(); e != nil {
				t.Fatal(e)
			}
			reopened, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{Engine: eng, ExecutorPaused: true})
			if e != nil {
				t.Fatal(e)
			}
			t.Cleanup(func() {
				if e := reopened.Close(); e != nil {
					t.Error(e)
				}
			})
			if _, e = reopened.API.Collaboration.CancelTask(ctx, owner, api.TaskCancel{CommandMeta: meta(t, reopened, "cancel interrupted leaf", leaf.Revision), ID: leaf.ID}); e != nil {
				t.Fatal(e)
			}
			// T16 keeps the whole tree closed after its genuinely running leaf
			// was interrupted. Canceling that leaf records its outcome; only the
			// user's explicit recovery action releases the waiting CP parents.
			qualification, e := reopened.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: meta(t, reopened, "recovery", "").ProfileID, ID: r.RunID})
			if e != nil || qualification.State != "ready" {
				t.Fatalf("explicit tree recovery qualification: %#v %v", qualification, e)
			}
			if _, e = reopened.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: meta(t, reopened, "resume original bounded task tree", qualification.Revision), ID: r.RunID, RecoveryGeneration: qualification.Generation}); e != nil {
				t.Fatal(e)
			}
			if e = reopened.Close(); e != nil {
				t.Fatal(e)
			}
			final, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{Engine: eng})
			if e != nil {
				t.Fatal(e)
			}
			t.Cleanup(func() {
				if e := final.Close(); e != nil {
					t.Error(e)
				}
			})
			select {
			case e := <-resumed:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(8 * time.Second):
				t.Fatal("durable requirements never reached actual CP Resume after reopen")
			}
			wait(t, final, r.RunID, "succeeded")
			if childCalls.Load() != 1 || childResumes.Load() != 1 || count(t, database(t, loc), "SELECT count(*) FROM execution_runs") != 3 {
				t.Fatal("reopen replayed a model or changed the task tree")
			}
		})
	}
}
