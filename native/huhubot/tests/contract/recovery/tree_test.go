package recovery_test

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

func agent(t *testing.T, c *bootstrap.Core, name string, targets []string) api.Agent {
	t.Helper()
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("agent:"), ""), Draft: api.AgentDraft{Name: name, Persona: "controlled persona", AllowedTools: []string{"agents.delegate", "agents.message", "tasks.reply", "tasks.get", "tasks.list", "tasks.cancel"}, AllowedCollaborationTargets: targets, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
	if e != nil {
		t.Fatal(e)
	}
	return a
}
func session(t *testing.T, c *bootstrap.Core, a api.Agent) api.Session {
	t.Helper()
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, api.NewID("session:"), ""), Kind: "direct", Title: "recovery isolation", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func start(t *testing.T, c *bootstrap.Core, s api.Session, text string) api.RunReceipt {
	t.Helper()
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, api.NewID("start:"), s.Revision), SessionID: s.ID, Intent: text, SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	return r
}

func TestInterruptedChildClosesWaitingParentAndUnclaimedSiblingButFreshAcceptedTreeStillScans(t *testing.T) {
	var target string
	children := make(chan []api.Delegation, 1)
	held := make(chan struct{}, 1)
	first := engine{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		switch i.Intent {
		case "tree-root":
			all := []api.Delegation{}
			for _, name := range []string{"held-child", "queued-child"} {
				v, e := i.Tools.Invoke(c, api.ToolCall{ID: name, Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: name, Constraints: []string{}}})
				if e != nil {
					return api.EngineResult{}, e
				}
				all = append(all, *v.Delegation)
			}
			children <- all
			return api.EngineResult{Status: "finished", Text: "ORIGINAL_PARENT"}, nil
		case "held-child":
			held <- struct{}{}
			<-c.Done()
			return api.EngineResult{}, c.Err()
		default:
			return api.EngineResult{}, fmt.Errorf("queued sibling ran before actual slot was free")
		}
	}}
	c, root, loc := fresh(t, bootstrap.Options{Engine: first, ExecutionLimits: api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 1, ProfileChildren: 8, MaxWakes: 8}})
	b := agent(t, c, "worker", nil)
	target = b.ID
	a := agent(t, c, "parent", []string{b.ID})
	r := start(t, c, session(t, c, a), "tree-root")
	var ds []api.Delegation
	select {
	case ds = <-children:
	case <-time.After(5 * time.Second):
		t.Fatal("children not admitted")
	}
	select {
	case <-held:
	case <-time.After(5 * time.Second):
		t.Fatal("held child not running")
	}
	wait(t, c, r.RunID, "waiting_children")
	if get(t, c, ds[1].ChildRunID).Status != "accepted" {
		t.Fatal("queued work consumed active child slot")
	}
	if e := c.Close(); e != nil {
		t.Fatal(e)
	}
	paused := open(t, root, loc, bootstrap.Options{ExecutorPaused: true})
	qualification := inspect(t, paused, ds[1].ChildRunID)
	if qualification.RootRunID != r.RunID || qualification.State != "blocked" || len(qualification.AffectedRunIDs) != 3 {
		t.Fatalf("whole affected set: %#v", qualification)
	}
	for _, id := range []string{r.RunID, ds[0].ChildRunID, ds[1].ChildRunID} {
		found := false
		for _, x := range qualification.AffectedRunIDs {
			found = found || id == x
		}
		if !found {
			t.Fatal("displayed child scope omitted an affected participant")
		}
	}
	freshRun := start(t, paused, session(t, paused, b), "fresh-independent")
	if e := paused.Close(); e != nil {
		t.Fatal(e)
	}
	var freshCalls, queuedCalls, parentCalls atomic.Int32
	next := engine{run: func(_ context.Context, i api.EngineInput) (api.EngineResult, error) {
		switch i.Intent {
		case "fresh-independent":
			freshCalls.Add(1)
			return api.EngineResult{Status: "finished", Text: "FRESH"}, nil
		case "queued-child":
			queuedCalls.Add(1)
			return api.EngineResult{Status: "finished", Text: "QUEUED_CHILD_RESULT"}, nil
		default:
			parentCalls.Add(1)
			return api.EngineResult{}, fmt.Errorf("interrupted tree bypassed user recovery")
		}
	}}
	final := open(t, root, loc, bootstrap.Options{Engine: next})
	wait(t, final, freshRun.RunID, "succeeded")
	if freshCalls.Load() != 1 || queuedCalls.Load() != 0 || parentCalls.Load() != 0 || get(t, final, ds[1].ChildRunID).Status != "accepted" || get(t, final, r.RunID).Status != "waiting_children" {
		t.Fatal("tree gate leaked or blocked an independent accepted tree")
	}
	if _, e := final.API.Collaboration.CancelTask(ctx, owner, api.TaskCancel{CommandMeta: meta(t, final, "cancel-unrecoverable-child", ds[0].Revision), ID: ds[0].ID}); e != nil {
		t.Fatal(e)
	}
	ready := inspect(t, final, r.RunID)
	if ready.State != "ready" {
		t.Fatalf("body-free canceled interruption should not require a fake CP: %#v", ready)
	}
	if _, e := final.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: meta(t, final, "recover-parent-and-queued", ready.Revision), ID: r.RunID, RecoveryGeneration: ready.Generation}); e != nil {
		t.Fatal(e)
	}
	wait(t, final, r.RunID, "succeeded")
	d := db(t, loc)
	if queuedCalls.Load() != 1 || parentCalls.Load() != 0 || count(t, d, "SELECT count(*) FROM execution_runs WHERE root_run_id=?", r.RunID) != 3 || count(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, d, "SELECT count(*) FROM task_config_pins") != 0 {
		t.Fatal("application parent completion reran a model or leaked slots/pins")
	}
	history, e := final.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: readyProfile(t, final), Limit: 100}, SessionID: get(t, final, r.RunID).SessionID})
	if e != nil {
		t.Fatal(e)
	}
	found := false
	for _, m := range history.Items {
		if m.Role == "assistant" {
			found = m.Partial && strings.Contains(m.Text, "ORIGINAL_PARENT") && strings.Contains(m.Text, "QUEUED_CHILD_RESULT")
		}
	}
	if !found {
		t.Fatal("parent lost original result or structured canceled-child partial fact")
	}
	t.Log("root waiting+interrupted child+accepted sibling fenced; fresh accepted tree executes; explicit whole-tree release preserves original parent result and canceled partial")
}

func readyProfile(t *testing.T, c *bootstrap.Core) string { return meta(t, c, "profile", "").ProfileID }
