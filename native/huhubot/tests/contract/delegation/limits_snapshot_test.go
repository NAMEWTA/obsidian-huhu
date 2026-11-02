package delegation_test

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestAcceptedRootKeepsPublicLimitSnapshotAcrossOptionsChange(t *testing.T) {
	old := api.ExecutionLimits{MaxDepth: 1, MaxChildren: 4, RootChildren: 1, ProfileChildren: 2, MaxWakes: 1}
	newer := api.ExecutionLimits{MaxDepth: 2, MaxChildren: 8, RootChildren: 2, ProfileChildren: 4, MaxWakes: 2}
	c, root, loc := open(t, bootstrap.Options{ExecutorPaused: true, ExecutionLimits: old})
	b := agent(t, c, "B", nil)
	b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	a := agent(t, c, "A", []string{b.ID})
	r := start(t, c, session(t, c, a), "old root")
	profile := meta(t, c, "q", "").ProfileID
	before, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: profile, RunID: r.RunID})
	if e != nil || before.Limits != old {
		t.Fatalf("admission did not persist limits %#v %v", before, e)
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	checked := make(chan error, 1)
	depthCheck := make(chan error, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "new root" {
			return api.EngineResult{Status: "finished", Text: "new"}, nil
		}
		if i.Intent == "old root" {
			for n := 0; n < 2; n++ {
				_, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: b.ID}, Task: fmt.Sprint("child-", n), Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
			}
			for n := 0; n < 2; n++ {
				_, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint("q", n), Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: b.ID, Kind: "question", Text: "question", SourceRefs: []api.SourceSnapshot{}}})
				if n == 1 {
					if !reason(e, "MESSAGE_WAKE_LIMIT") {
						checked <- fmt.Errorf("new wake limit replaced root snapshot: %v", e)
					} else {
						checked <- nil
					}
				} else if e != nil {
					return api.EngineResult{}, e
				}
			}
			return api.EngineResult{Status: "finished", Text: "old"}, nil
		}
		if i.Intent == "child-0" {
			_, e := i.Tools.Invoke(c, api.ToolCall{ID: "depth", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: b.ID}, Task: "must not wake", Constraints: []string{}}})
			if !reason(e, "DELEGATION_DEPTH_LIMIT") {
				depthCheck <- fmt.Errorf("new depth replaced snapshot: %v", e)
			} else {
				depthCheck <- nil
			}
		}
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "child"}, nil
	})
	reopened, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{ExecutionLimits: newer, Engine: eng})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	for _, done := range []chan error{checked, depthCheck} {
		select {
		case e := <-done:
			if e != nil {
				t.Fatal(e)
			}
		case <-time.After(5 * time.Second):
			t.Fatal("snapshot consumer not reached")
		}
	}
	db := database(t, loc)
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE root_run_id=? AND child_slot=1", r.RunID) != 1 {
		t.Fatal("new root concurrency replaced fixed limit")
	}
	public, e := reopened.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: profile, ID: r.RunID})
	if e != nil {
		t.Fatal(e)
	}
	encoded, _ := json.Marshal(public)
	var projection struct {
		Limits *api.ExecutionLimits `json:"limits"`
	}
	if json.Unmarshal(encoded, &projection) != nil || projection.Limits == nil || *projection.Limits != old {
		t.Fatalf("Run omitted/misrepresented snapshot %s", encoded)
	}
	oldBudget, e := reopened.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: profile, RunID: r.RunID})
	if e != nil || oldBudget.Limits != old {
		t.Fatalf("budget query drift %#v %v", oldBudget, e)
	}
	n := start(t, reopened, session(t, reopened, a), "new root")
	newBudget, e := reopened.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: profile, RunID: n.RunID})
	if e != nil || newBudget.Limits != newer {
		t.Fatalf("new admission snapshot %#v %v", newBudget, e)
	}
	once.Do(func() { close(release) })
	wait(t, reopened, r.RunID, "succeeded")
	wait(t, reopened, n.RunID, "succeeded")
}
