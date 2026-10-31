package groups_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("groups-contract", "owner", true)

type engineFunc func(context.Context, api.EngineInput) (api.EngineResult, error)

func (f engineFunc) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i)
}
func (f engineFunc) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i.Input)
}
func open(t *testing.T, options bootstrap.Options) (*bootstrap.Core, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	loc := filepath.Join(root, "one")
	c, e := bootstrap.OpenWithOptions(ctx, root, loc, options)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Errorf("Close: %v", e)
		}
	})
	return c, loc
}
func meta(t *testing.T, c *bootstrap.Core, key, rev string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: rev}
}
func agent(t *testing.T, c *bootstrap.Core, name string, model bool) api.Agent {
	t.Helper()
	draft := api.AgentDraft{Name: name, Persona: "private-" + name, AllowedTools: []string{}, AllowedCollaborationTargets: []string{}}
	if model {
		draft.Model = &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}
	}
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("agent:"), ""), Draft: draft})
	if e != nil {
		t.Fatal(e)
	}
	return a
}
func group(t *testing.T, c *bootstrap.Core, a api.Agent, members ...api.Agent) api.Session {
	t.Helper()
	ids := []string{a.ID}
	for _, m := range members {
		ids = append(ids, m.ID)
	}
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, api.NewID("session:"), ""), Kind: "group", Title: "public group", MemberIDs: ids, CoordinatorID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func wait(t *testing.T, c *bootstrap.Core, run string) api.Run {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "read", "").ProfileID, ID: run})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == "succeeded" || r.Status == "failed" || r.Status == "canceled" {
			return r
		}
		if time.Now().After(deadline) {
			t.Fatalf("Run did not end: %#v", r)
		}
		time.Sleep(3 * time.Millisecond)
	}
}
func database(t *testing.T, loc string) *sql.DB {
	t.Helper()
	d, e := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { d.Close() })
	return d
}
func count(t *testing.T, d *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if e := d.QueryRow(q, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func reason(e error, r string) bool { var f *api.Fault; return errors.As(e, &f) && f.Reason == r }

func TestPublicGroupsAreAssembledAndExplicitTargetsBypassCoordinatorModel(t *testing.T) {
	var mu sync.Mutex
	calls := map[string]int{}
	eng := engineFunc(func(_ context.Context, i api.EngineInput) (api.EngineResult, error) {
		mu.Lock()
		calls[i.Agent.ID]++
		mu.Unlock()
		if i.Delegation == nil || i.Delegation.Task != "one visible intent" || i.Lineage.Group == nil {
			return api.EngineResult{}, fmt.Errorf("actual member input missing durable admission: %#v", i.Delegation)
		}
		return api.EngineResult{Status: "finished", Text: "public-" + i.Agent.Name}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	if c.API.Groups == nil {
		t.Fatal("public group consumer is not assembled")
	}
	a := agent(t, c, "A-no-model", false)
	b := agent(t, c, "B", true)
	d := agent(t, c, "C", true)
	s := group(t, c, a, b, d)
	receipt, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "send", s.Revision), SessionID: s.ID, Intent: "one visible intent", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{b.ID, d.ID}})
	if e != nil {
		t.Fatal(e)
	}
	r := wait(t, c, receipt.RunID)
	if r.Status != "succeeded" {
		t.Fatalf("root: %#v", r)
	}
	mu.Lock()
	defer mu.Unlock()
	if calls[a.ID] != 0 || calls[b.ID] != 1 || calls[d.ID] != 1 {
		t.Fatalf("actual model calls=%v", calls)
	}
	db := database(t, loc)
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE root_run_id=?", r.ID) != 3 || count(t, db, "SELECT count(*) FROM group_publications WHERE session_id=? AND message_id IS NOT NULL", s.ID) != 2 {
		t.Fatal("one root/two real child Runs and publications required")
	}
	if count(t, db, "SELECT count(*) FROM task_config_pins") != 0 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 {
		t.Fatal("terminal pins/slots retained")
	}
}
