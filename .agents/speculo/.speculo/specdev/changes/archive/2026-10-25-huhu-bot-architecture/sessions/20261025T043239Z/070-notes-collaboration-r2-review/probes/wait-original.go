package delegation_test

import (
	"context"
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
	var target string
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var calls, resumes atomic.Int32
	eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		calls.Add(1)
		if i.Intent == "root" {
			for n := 0; n < 6; n++ {
				_, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "parent-child", Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
			}
			return api.EngineResult{Status: "finished", Text: "root"}, nil
		}
		if i.Intent == "parent-child" {
			v, e := i.Tools.Invoke(c, api.ToolCall{ID: "nested", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "leaf", Constraints: []string{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			cp, e := i.Checkpoints.Publish(c, strings.NewReader("child-state"))
			if e != nil {
				return api.EngineResult{}, e
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
		}
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "leaf"}, nil
	}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
		resumes.Add(1)
		if len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "leaf" {
			return api.EngineResult{}, fmt.Errorf("wrong resumption %#v", i.Decision)
		}
		return api.EngineResult{Status: "finished", Text: "joined"}, nil
	}}
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	a := agent(t, c, "A", []string{b.ID})
	r := start(t, c, session(t, c, a), "root")
	db := database(t, loc)
	deadline := time.Now().Add(5 * time.Second)
	for count(t, db, "SELECT count(*) FROM execution_runs WHERE status='waiting_children'") != 7 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot=1") != 4 {
		if time.Now().After(deadline) {
			t.Fatal("waiting children retained slots or queued leaves deadlocked")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE status='waiting_children' AND child_slot<>0") != 0 {
		t.Fatal("stopped producer kept active slot")
	}
	once.Do(func() { close(release) })
	wait(t, c, r.RunID, "succeeded")
	if calls.Load() != 13 || resumes.Load() != 6 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 {
		t.Fatalf("resume/reclaim lifecycle calls=%d resume=%d", calls.Load(), resumes.Load())
	}
}
