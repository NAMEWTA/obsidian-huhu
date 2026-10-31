package groups_test

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type resumeEngine struct {
	run    func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
}

func (e resumeEngine) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, i)
}
func (e resumeEngine) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.resume(c, i)
}
func allow(t *testing.T, c *bootstrap.Core, a api.Agent, tools, targets []string) api.Agent {
	t.Helper()
	d := api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, AllowedTools: tools, AllowedCollaborationTargets: targets}
	if a.Model != nil {
		model := a.Model.ModelBindingDraft
		d.Model = &model
	}
	out, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, api.NewID("allow:"), a.Revision), ID: a.ID, Draft: d})
	if e != nil {
		t.Fatal(e)
	}
	return out
}

func TestPrivateSourceFreeChildContributorIsRevokedAfterActualCheckpointResume(t *testing.T) {
	var cID string
	resumed := make(chan api.EngineResumeInput, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var callbacks atomic.Int32
	eng := resumeEngine{
		run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
			if i.Intent == "private child" {
				return api.EngineResult{Status: "finished", Text: "PRIVATE_C_RESULT"}, nil
			}
			d, e := i.Tools.Invoke(c, api.ToolCall{ID: "private-c", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: cID}, Task: "private child", Constraints: []string{}, Context: api.ContextEnvelope{SourceRefs: []api.SourceSnapshot{}, MessageIDs: []string{}, Excerpts: []api.ContextExcerpt{}}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			cp, e := i.Checkpoints.Publish(c, bytes.NewBufferString("group-complete-checkpoint"))
			if e != nil {
				return api.EngineResult{}, e
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{d.Delegation.ChildRunID}, Checkpoint: cp}}, nil
		},
		resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
			r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
			if e != nil {
				return api.EngineResult{}, e
			}
			body, e := io.ReadAll(r)
			closeErr := r.Close()
			if e != nil || closeErr != nil || string(body) != "group-complete-checkpoint" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "PRIVATE_C_RESULT" {
				return api.EngineResult{}, fmt.Errorf("real CP/result mismatch: %v %v %#v", e, closeErr, i.Decision)
			}
			res, e := i.Input.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "resume-model", InputEstimate: "1", OutputBound: "2"})
			if e != nil {
				return api.EngineResult{}, e
			}
			resumed <- i
			<-release
			e = i.Input.Attempts.Dispatch(context.Background(), res, func(context.Context) error { callbacks.Add(1); return nil })
			if e == nil {
				_, e = i.Input.Attempts.Settle(context.Background(), res, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true})
			} else {
				abortErr := i.Input.Attempts.AbortUnsent(context.Background(), res)
				if abortErr != nil {
					return api.EngineResult{}, abortErr
				}
			}
			return api.EngineResult{Status: "finished", Text: "PRIVATE_C_RESULT"}, nil
		},
	}
	c, loc := open(t, bootstrap.Options{Engine: eng, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}})
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	d := agent(t, c, "C", true)
	cID = d.ID
	b = allow(t, c, b, []string{"agents.delegate"}, []string{d.ID})
	s := group(t, c, a, b, d)
	root := send(t, c, s, "member parent", b.ID)
	var input api.EngineResumeInput
	select {
	case input = <-resumed:
	case <-time.After(3 * time.Second):
		t.Fatal("real CP Resume not reached")
	}
	t.Logf("actual resumed effective membership=%#v", input.Input.Lineage.Group)
	update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
	once.Do(func() { close(release) })
	wait(t, c, root.RunID)
	if callbacks.Load() != 0 {
		t.Errorf("removed private contributor still reached actual Dispatch callback: %d", callbacks.Load())
	}
	db := database(t, loc)
	if count(t, db, "SELECT count(*) FROM conversation_messages WHERE session_id=? AND role='assistant' AND text LIKE '%PRIVATE_C_RESULT%'", s.ID) != 0 {
		t.Error("unpublished removed member body was re-published by its consumer")
	}
	// The run can be terminal before the slot and pin rows are removed.
	// They still have to go. This wait does not accept a leftover row.
	until := time.Now().Add(5 * time.Second)
	for {
		slots := count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0")
		pins := count(t, db, "SELECT count(*) FROM task_config_pins")
		if slots == 0 && pins == 0 {
			break
		}
		if time.Now().After(until) {
			t.Fatalf("stopped producers retained slots/pins slots=%d pins=%d", slots, pins)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestTaskGetAndListConsumePrivateMembershipProofWithoutMutatingUserQueries(t *testing.T) {
	for _, tool := range []string{"tasks.get", "tasks.list"} {
		for _, remove := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/remove=%v", tool, remove), func(t *testing.T) {
				var cID string
				created := make(chan api.Delegation, 1)
				allowGet := make(chan struct{})
				consumed := make(chan string, 1)
				release := make(chan struct{})
				var getOnce, once sync.Once
				defer getOnce.Do(func() { close(allowGet) })
				defer once.Do(func() { close(release) })
				var callbacks atomic.Int32
				eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
					if i.Intent == "getter private child" {
						return api.EngineResult{Status: "finished", Text: "GETTER_PRIVATE_C"}, nil
					}
					result, e := i.Tools.Invoke(c, api.ToolCall{ID: "getter-child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: cID}, Task: "getter private child", Constraints: []string{}, Context: api.ContextEnvelope{SourceRefs: []api.SourceSnapshot{}, MessageIDs: []string{}, Excerpts: []api.ContextExcerpt{}}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					d := *result.Delegation
					created <- d
					select {
					case <-allowGet:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
					call := api.ToolCall{ID: "consume-private", Name: tool}
					if tool == "tasks.get" {
						call.TaskQuery = &api.IDQuery{ID: d.ID}
					} else {
						call.TaskList = &api.DelegationQuery{PageQuery: api.PageQuery{Limit: 100}}
					}
					result, e = i.Tools.Invoke(c, call)
					if e != nil {
						return api.EngineResult{}, e
					}
					found := result.Delegation != nil && result.Delegation.Result != nil && result.Delegation.Result.Text == "GETTER_PRIVATE_C"
					if result.Tasks != nil {
						for _, task := range result.Tasks.Items {
							if task.ID == d.ID && task.Result != nil && task.Result.Text == "GETTER_PRIVATE_C" {
								found = true
							}
						}
					}
					if !found {
						return api.EngineResult{}, fmt.Errorf("actual tool omitted selected private result: %#v", result)
					}
					res, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "after-get", InputEstimate: "1", OutputBound: "2"})
					if e != nil {
						return api.EngineResult{}, e
					}
					consumed <- i.RunID
					<-release
					e = i.Attempts.Dispatch(context.Background(), res, func(context.Context) error { callbacks.Add(1); return nil })
					if e != nil {
						if a := i.Attempts.AbortUnsent(context.Background(), res); a != nil {
							return api.EngineResult{}, a
						}
					} else {
						if _, e = i.Attempts.Settle(context.Background(), res, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true}); e != nil {
							return api.EngineResult{}, e
						}
					}
					return api.EngineResult{Status: "finished", Text: "GETTER_PRIVATE_C"}, nil
				})
				errorsObserved := make(chan error, 1)
				observedEngine := engineFunc(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
					r, e := eng(ctx, in)
					if e != nil {
						select {
						case errorsObserved <- e:
						default:
						}
					}
					return r, e
				})
				c, loc := open(t, bootstrap.Options{Engine: observedEngine, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}})
				a := agent(t, c, "A", false)
				b := agent(t, c, "B", true)
				d := agent(t, c, "C", true)
				cID = d.ID
				b = allow(t, c, b, []string{"agents.delegate", tool}, []string{d.ID})
				s := group(t, c, a, b, d)
				root := send(t, c, s, "getter parent", b.ID)
				db := database(t, loc)
				var child api.Delegation
				select {
				case child = <-created:
				case <-time.After(2 * time.Second):
					t.Fatal("delegate not created")
				}
				deadline := time.Now().Add(2 * time.Second)
				for {
					task, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: child.ID})
					if e != nil {
						t.Fatal(e)
					}
					if task.Result != nil && task.Result.Text == "GETTER_PRIVATE_C" {
						break
					}
					if time.Now().After(deadline) {
						t.Fatal("private child not finished")
					}
					time.Sleep(time.Millisecond)
				}
				if n := count(t, db, "SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?", child.ParentRunID); n != 1 {
					t.Fatalf("user query mutated model qualification: %d", n)
				}
				getOnce.Do(func() { close(allowGet) })
				var consumer string
				select {
				case consumer = <-consumed:
				case failure := <-errorsObserved:
					t.Fatalf("bound consumer failed: %v", failure)
				case <-time.After(2 * time.Second):
					t.Fatal("bound get/list did not consume")
				}
				if n := count(t, db, "SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?", consumer); n != 2 {
					t.Fatalf("private getter did not persist contributor: %d", n)
				}
				if remove {
					update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
				}
				once.Do(func() { close(release) })
				terminal := wait(t, c, root.RunID)
				expected := int32(1)
				if remove {
					expected = 0
				}
				if callbacks.Load() != expected {
					t.Fatalf("actual callbacks=%d expected=%d", callbacks.Load(), expected)
				}
				published := count(t, db, "SELECT count(*) FROM conversation_messages WHERE session_id=? AND role='assistant'", s.ID)
				if remove && published != 0 || !remove && (published != 1 || terminal.Status != "succeeded") {
					t.Fatalf("publication=%d root=%#v", published, terminal)
				}
				if e := c.Close(); e != nil {
					t.Fatal(e)
				}
				if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
					t.Fatal("final producer cleanup incomplete")
				}
			})
		}
	}
}
