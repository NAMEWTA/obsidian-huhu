package delegation_test

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestPublicChildCancellationProducesStructuredOutcomeForAggregationAndCheckpointResume(t *testing.T) {
	for _, phase := range []string{"queued", "waiting", "running"} {
		for _, resume := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s-cp-%t", phase, resume), func(t *testing.T) {
				var target string
				created := make(chan []api.Delegation, 1)
				releaseC := make(chan struct{})
				var once sync.Once
				defer once.Do(func() { close(releaseC) })
				bEntered, leafEntered := make(chan struct{}), make(chan struct{})
				var calls, resumes atomic.Int32
				eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
					calls.Add(1)
					if i.Intent == "root" {
						ds := []api.Delegation{}
						for _, name := range []string{"C", "B"} {
							v, e := i.Tools.Invoke(c, api.ToolCall{ID: name, Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: name, Constraints: []string{}}})
							if e != nil {
								return api.EngineResult{}, e
							}
							ds = append(ds, *v.Delegation)
						}
						created <- ds
						if resume {
							cp, e := i.Checkpoints.Publish(c, strings.NewReader("parent-checkpoint"))
							if e != nil {
								return api.EngineResult{}, e
							}
							return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{ds[0].ChildRunID, ds[1].ChildRunID}, Checkpoint: cp}}, nil
						}
						return api.EngineResult{Status: "finished", Text: "parent"}, nil
					}
					if i.Intent == "C" {
						select {
						case <-releaseC:
						case <-c.Done():
							return api.EngineResult{}, c.Err()
						}
						return api.EngineResult{Status: "finished", Text: "sibling-body"}, nil
					}
					if i.Intent == "B" {
						close(bEntered)
					}
					if i.Intent == "leaf" {
						close(leafEntered)
					}
					if i.Intent == "B" && phase == "waiting" {
						v, e := i.Tools.Invoke(c, api.ToolCall{ID: "leaf", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "leaf", Constraints: []string{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						cp, e := i.Checkpoints.Publish(c, strings.NewReader("b-checkpoint"))
						if e != nil {
							return api.EngineResult{}, e
						}
						return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
					}
					<-c.Done()
					return api.EngineResult{}, c.Err()
				}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
					resumes.Add(1)
					if i.Input.Intent != "root" {
						return api.EngineResult{}, fmt.Errorf("canceled child resumed")
					}
					if len(i.Decision.Children) != 2 {
						return api.EngineResult{}, fmt.Errorf("missing cancellation outcome %#v", i.Decision.Children)
					}
					canceled, success := 0, 0
					for _, v := range i.Decision.Children {
						if v.Status == "canceled" && v.Text == "" && len(v.Derived) == 0 {
							canceled++
						}
						if v.Status == "succeeded" && v.Text == "sibling-body" {
							success++
						}
					}
					if canceled != 1 || success != 1 {
						return api.EngineResult{}, fmt.Errorf("incorrect outcomes %#v", i.Decision.Children)
					}
					// Application result projection must retain actual child partial facts even
					// when a model returns a plain 'finished' result after seeing the outcomes.
					return api.EngineResult{Status: "finished", Text: "parent resumed sibling-body"}, nil
				}}
				cap := 2
				if phase == "queued" {
					cap = 1
				}
				c, _, loc := open(t, bootstrap.Options{Engine: eng, ExecutionLimits: api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: cap, ProfileChildren: 8, MaxWakes: 8}})
				b := agent(t, c, "B", nil)
				target = b.ID
				b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
				if e != nil {
					t.Fatal(e)
				}
				a := agent(t, c, "A", []string{b.ID})
				s := session(t, c, a)
				root := start(t, c, s, "root")
				var ds []api.Delegation
				select {
				case ds = <-created:
				case <-time.After(5 * time.Second):
					t.Fatal("children not admitted")
				}
				wait(t, c, root.RunID, "waiting_children")
				wanted := map[string]string{"queued": "accepted", "waiting": "waiting_children", "running": "running"}[phase]
				wait(t, c, ds[1].ChildRunID, wanted)
				wait(t, c, ds[0].ChildRunID, "running")
				if phase != "queued" {
					signal := bEntered
					if phase == "waiting" {
						signal = leafEntered
					}
					select {
					case <-signal:
					case <-time.After(5 * time.Second):
						t.Fatal("actual canceled producer not entered")
					}
				}

				cancel := api.TaskCancel{CommandMeta: meta(t, c, "cancel-b", ds[1].Revision), ID: ds[1].ID}
				if _, e = c.API.Collaboration.CancelTask(ctx, owner, cancel); e != nil {
					t.Fatal(e)
				}
				cancel.CommandID = "transport-retry"
				if _, e = c.API.Collaboration.CancelTask(ctx, owner, cancel); e != nil {
					t.Fatal(e)
				}
				task, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: cancel.ProfileID, ID: ds[1].ID})
				if e != nil || task.Result == nil || task.Result.Status != "canceled" || task.Result.Text != "" || len(task.Result.Derived) != 0 {
					t.Fatalf("canceled Run lacks body-free durable outcome %#v %v", task, e)
				}
				db := database(t, loc)
				if count(t, db, "SELECT count(*) FROM collaboration_result_deliveries WHERE child_run_id=?", ds[1].ChildRunID) != 1 {
					t.Fatal("cancellation result was duplicated or omitted")
				}
				if count(t, db, "SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='delegation.completed' AND json_extract(body_json,'$.childRunId')=?", root.RunID, ds[1].ChildRunID) != 1 {
					t.Fatal("duplicate parent cancellation event")
				}
				once.Do(func() { close(releaseC) })
				final := wait(t, c, root.RunID, "succeeded")
				if final.Reason != "CHILD_PARTIAL_FAILURE" {
					t.Fatalf("canceled child silently became complete success %#v", final)
				}
				h, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: cancel.ProfileID, Limit: 100}, SessionID: s.ID})
				if e != nil {
					t.Fatal(e)
				}
				found := false
				for _, m := range h.Items {
					if m.Role == "assistant" {
						found = m.Partial && strings.Contains(m.Text, "sibling-body")
					}
				}
				if !found {
					t.Fatal("parent lost partial sibling result")
				}
				expectedCalls := map[string]int32{"queued": 2, "running": 3, "waiting": 4}[phase]
				if calls.Load() != expectedCalls || resumes.Load() != map[bool]int32{false: 0, true: 1}[resume] {
					t.Fatalf("extra model work Run=%d Resume=%d", calls.Load(), resumes.Load())
				}
			})
		}
	}
}

func TestNestedCanceledChildPartialFactSurvivesSucceededIntermediateTask(t *testing.T) {
	var target string
	created := make(chan api.Delegation, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" || i.Intent == "B" {
			targets := []string{"B"}
			if i.Intent == "B" {
				targets = []string{"D", "E"}
			}
			for _, name := range targets {
				v, e := i.Tools.Invoke(c, api.ToolCall{ID: name, Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: name, Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
				if name == "D" {
					created <- *v.Delegation
				}
			}
			return api.EngineResult{Status: "finished", Text: i.Intent}, nil
		}
		if i.Intent == "D" {
			<-c.Done()
			return api.EngineResult{}, c.Err()
		}
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "E-success"}, nil
	})
	c, _, _ := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	a := agent(t, c, "A", []string{b.ID})
	s := session(t, c, a)
	root := start(t, c, s, "root")
	var d api.Delegation
	select {
	case d = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("no D")
	}
	wait(t, c, d.ChildRunID, "running")
	if _, e = c.API.Collaboration.CancelTask(ctx, owner, api.TaskCancel{CommandMeta: meta(t, c, "cancel-D", d.Revision), ID: d.ID}); e != nil {
		t.Fatal(e)
	}
	once.Do(func() { close(release) })
	final := wait(t, c, root.RunID, "succeeded")
	if final.Reason != "CHILD_PARTIAL_FAILURE" {
		t.Fatalf("ancestor lost succeeded+partial B %#v", final)
	}
	list, e := c.API.Collaboration.ListTasks(ctx, owner, api.DelegationQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 100}, RunID: root.RunID})
	if e != nil {
		t.Fatal(e)
	}
	found := false
	for _, v := range list.Items {
		if v.ParentRunID == root.RunID {
			found = v.Status == "succeeded" && v.Result != nil && v.Result.Partial && strings.Contains(v.Result.Text, "E-success")
		}
	}
	if !found {
		t.Fatal("intermediate partial not durable/queryable")
	}
}

func TestCanceledChildOutcomePreservesActualUnsettledUsageAndProducerSlot(t *testing.T) {
	var target string
	created := make(chan api.Delegation, 1)
	release := make(chan struct{})
	var once sync.Once
	var wg sync.WaitGroup
	defer func() { once.Do(func() { close(release) }); wg.Wait() }()
	type pending struct {
		port api.ModelAttempts
		r    api.AttemptReservation
		done chan error
	}
	started := make(chan pending, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" {
			for _, name := range []string{"B", "C"} {
				v, e := i.Tools.Invoke(c, api.ToolCall{ID: name, Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: name, Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
				if name == "B" {
					created <- *v.Delegation
				}
			}
			return api.EngineResult{Status: "finished", Text: "parent"}, nil
		}
		if i.Intent == "C" {
			return api.EngineResult{Status: "finished", Text: "sibling"}, nil
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "child", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		done := make(chan error, 1)
		entered := make(chan struct{})
		wg.Add(1)
		go func() {
			defer wg.Done()
			done <- i.Attempts.Dispatch(context.Background(), r, func(context.Context) error { close(entered); <-release; return nil })
		}()
		<-entered
		started <- pending{i.Attempts, r, done}
		<-c.Done()
		return api.EngineResult{}, c.Err()
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	a := agent(t, c, "A", []string{b.ID})
	if _, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"}}); e != nil {
		t.Fatal(e)
	}
	root := start(t, c, session(t, c, a), "root")
	var d api.Delegation
	var p pending
	select {
	case d = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("not created")
	}
	select {
	case p = <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("not dispatched")
	}
	if _, e := c.API.Collaboration.CancelTask(ctx, owner, api.TaskCancel{CommandMeta: meta(t, c, "cancel", d.Revision), ID: d.ID}); e != nil {
		t.Fatal(e)
	}
	task, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: d.ID})
	if e != nil || task.Result == nil || task.Result.Status != "canceled" || task.Result.Usage == nil || task.Result.Usage.Knowledge != "unknown" || task.Result.Text != "" {
		t.Fatalf("canceled usage lost %#v %v", task, e)
	}
	db := database(t, loc)
	if count(t, db, "SELECT child_slot FROM execution_runs WHERE run_id=?", d.ChildRunID) != 1 {
		t.Fatal("cancel released live producer slot")
	}
	final := wait(t, c, root.RunID, "failed")
	if final.Reason != "DESCENDANT_MODEL_PRODUCER_UNSETTLED" {
		t.Fatalf("parent ignored live canceled producer %#v", final)
	}
	once.Do(func() { close(release) })
	select {
	case e := <-p.done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("producer not waited")
	}
	if _, e = p.port.Settle(ctx, p.r, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
		t.Fatal(e)
	}
	if count(t, db, "SELECT child_slot FROM execution_runs WHERE run_id=?", d.ChildRunID) != 0 {
		t.Fatal("ended producer slot leaked")
	}
	wait(t, c, root.RunID, "failed")
}

func TestCanceledChildLateKnownUsageIsReflectedInPublicRun(t *testing.T) {
	var target string
	created := make(chan api.Delegation, 1)
	release := make(chan struct{})
	var once sync.Once
	var wg sync.WaitGroup
	defer func() { once.Do(func() { close(release) }); wg.Wait() }()
	type pending struct {
		port api.ModelAttempts
		r    api.AttemptReservation
		done chan error
	}
	started := make(chan pending, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" {
			for _, name := range []string{"B", "C"} {
				v, e := i.Tools.Invoke(c, api.ToolCall{ID: name, Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: name, Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
				if name == "B" {
					created <- *v.Delegation
				}
			}
			return api.EngineResult{Status: "finished", Text: "parent"}, nil
		}
		if i.Intent == "C" {
			return api.EngineResult{Status: "finished", Text: "sibling"}, nil
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "child", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		done := make(chan error, 1)
		entered := make(chan struct{})
		wg.Add(1)
		go func() {
			defer wg.Done()
			done <- i.Attempts.Dispatch(context.Background(), r, func(context.Context) error { close(entered); <-release; return nil })
		}()
		<-entered
		started <- pending{i.Attempts, r, done}
		<-c.Done()
		return api.EngineResult{}, c.Err()
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	a := agent(t, c, "A", []string{b.ID})
	if _, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"}}); e != nil {
		t.Fatal(e)
	}
	root := start(t, c, session(t, c, a), "root")
	var d api.Delegation
	var p pending
	select {
	case d = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("not created")
	}
	select {
	case p = <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("not dispatched")
	}
	if _, e := c.API.Collaboration.CancelTask(ctx, owner, api.TaskCancel{CommandMeta: meta(t, c, "cancel", d.Revision), ID: d.ID}); e != nil {
		t.Fatal(e)
	}
	task, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: d.ID})
	if e != nil || task.Result == nil || task.Result.Status != "canceled" || task.Result.Usage == nil || task.Result.Usage.Knowledge != "unknown" || task.Result.Text != "" {
		t.Fatalf("canceled usage lost %#v %v", task, e)
	}
	db := database(t, loc)
	if count(t, db, "SELECT child_slot FROM execution_runs WHERE run_id=?", d.ChildRunID) != 1 {
		t.Fatal("cancel released live producer slot")
	}
	final := wait(t, c, root.RunID, "failed")
	if final.Reason != "DESCENDANT_MODEL_PRODUCER_UNSETTLED" {
		t.Fatalf("parent ignored live canceled producer %#v", final)
	}
	once.Do(func() { close(release) })
	select {
	case e := <-p.done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("producer not waited")
	}
	if _, e = p.port.Settle(ctx, p.r, api.AttemptObservation{Knowledge: "known", InputTokens: "5", OutputTokens: "2", ProducerEnded: true}); e != nil {
		t.Fatal(e)
	}
	if count(t, db, "SELECT child_slot FROM execution_runs WHERE run_id=?", d.ChildRunID) != 0 {
		t.Fatal("ended producer slot leaked")
	}
	late, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: d.ChildRunID})
	if e != nil {
		t.Fatal(e)
	}
	if late.Usage == nil || late.Usage.Knowledge != "known" || late.Usage.InputTokens != "5" || late.Usage.OutputTokens != "2" {
		t.Fatalf("late actual settled usage is not reflected by public Run; usage=%#v", late.Usage)
	}
	wait(t, c, root.RunID, "failed")
}
