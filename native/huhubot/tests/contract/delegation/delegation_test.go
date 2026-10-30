package delegation_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("delegation-test", "owner", true)

func open(t *testing.T, opts bootstrap.Options) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, opts)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Errorf("Close: %v", e)
		}
	})
	return c, root, locator
}
func meta(t *testing.T, c *bootstrap.Core, key, revision string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: revision}
}
func TestPublicCollaborationConsumersAreAssembled(t *testing.T) {
	c, _, _ := open(t, bootstrap.Options{ExecutorPaused: true})
	if c.API.Collaboration == nil || c.API.Messages == nil {
		t.Fatal("public collaboration/message consumers are not assembled")
	}
	p, e := c.API.Collaboration.Discover(ctx, owner, api.DiscoverQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 1}})
	if e != nil {
		t.Fatal(e)
	}
	if len(p.Items) != 1 || p.Items[0].ID == "" || p.Items[0].Revision == "" {
		t.Fatalf("default public directory: %#v", p)
	}
}

type engineFunc func(context.Context, api.EngineInput) (api.EngineResult, error)

func (f engineFunc) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i)
}
func (f engineFunc) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i.Input)
}
func agent(t *testing.T, c *bootstrap.Core, name string, targets []string) api.Agent {
	t.Helper()
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("create:"), ""), Draft: api.AgentDraft{Name: name, Description: "directory summary", Persona: "PRIVATE_PERSONA_" + name, AllowedTools: []string{"agents.discover", "agents.delegate", "agents.message", "tasks.reply", "tasks.get", "tasks.list", "tasks.cancel", "agents.proposeCreate"}, AllowedCollaborationTargets: targets, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
	if e != nil {
		t.Fatal(e)
	}
	return a
}
func session(t *testing.T, c *bootstrap.Core, a api.Agent) api.Session {
	t.Helper()
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, api.NewID("session:"), ""), Kind: "direct", Title: "isolated", MemberIDs: []string{a.ID}})
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
func wait(t *testing.T, c *bootstrap.Core, id, status string) api.Run {
	t.Helper()
	return waitWithin(t, c, id, status, 8*time.Second)
}
func waitWithin(t *testing.T, c *bootstrap.Core, id, status string, budget time.Duration) api.Run {
	t.Helper()
	deadline := time.Now().Add(budget)
	for {
		r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: id})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == status {
			return r
		}
		if time.Now().After(deadline) {
			t.Fatalf("wait %s: %#v", status, r)
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func database(t *testing.T, locator string) *sql.DB {
	t.Helper()
	d, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
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

func TestExistingAndTemporaryUseSameExecutorWithIndependentThreadsAndCredentialGuard(t *testing.T) {
	var bID string
	receipts := make(chan []api.Delegation, 1)
	tempEntered := make(chan struct{}, 1)
	releaseTemp := make(chan struct{})
	errc := make(chan error, 8)
	ref := api.NewID("credential:")
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		switch i.Intent {
		case "B private":
			return api.EngineResult{Status: "finished", Text: "B_PRIVATE_TRANSCRIPT"}, nil
		case "root":
			p, e := i.Tools.Invoke(c, api.ToolCall{ID: "discover", Name: "agents.discover", Discover: &api.DiscoverQuery{}})
			if e != nil {
				return api.EngineResult{}, e
			}
			if p.Directory == nil || len(p.Directory.Items) != 1 || p.Directory.Items[0].ID != bID {
				return api.EngineResult{}, fmt.Errorf("directory: %#v", p)
			}
			call := api.ToolCall{ID: "same-logical-tool", Name: "agents.delegate", Delegate: &api.DelegateCommand{RunID: "forged", Target: api.DelegationTarget{Kind: "existing", AgentID: bID}, Task: "child", Constraints: []string{}, Context: api.ContextEnvelope{MessageIDs: []string{}, SourceRefs: []api.SourceSnapshot{}, Excerpts: []api.ContextExcerpt{}}}}
			one, e := i.Tools.Invoke(c, call)
			if e != nil {
				return api.EngineResult{}, e
			}
			two, e := i.Tools.Invoke(c, call)
			if e != nil {
				return api.EngineResult{}, e
			}
			if one.Delegation.ChildRunID != two.Delegation.ChildRunID {
				return api.EngineResult{}, fmt.Errorf("duplicate child")
			}
			changed := *call.Delegate
			changed.Task = "different business intent"
			call.Delegate = &changed
			if _, e = i.Tools.Invoke(c, call); !reason(e, "IDEMPOTENCY_INPUT_MISMATCH") {
				return api.EngineResult{}, fmt.Errorf("changed replay: %v", e)
			}
			temp, e := i.Tools.Invoke(c, api.ToolCall{ID: "temporary", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "temporary", Draft: &api.AgentDraft{Name: "ephemeral", Persona: "temporary persona", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ModelID: "another", ProviderID: "another-provider", Protocol: "openai-responses", Endpoint: "http://127.0.0.1:2", CredentialRef: ref, Capabilities: []string{"text"}}}}, Task: "temporary child", Constraints: []string{}, Context: api.ContextEnvelope{MessageIDs: []string{}, SourceRefs: []api.SourceSnapshot{}, Excerpts: []api.ContextExcerpt{}}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			receipts <- []api.Delegation{*one.Delegation, *temp.Delegation}
			return api.EngineResult{Status: "finished", Text: "parent output"}, nil
		case "child":
			for _, m := range i.History {
				if strings.Contains(m.Text, "B_PRIVATE") {
					return api.EngineResult{}, fmt.Errorf("private history leaked")
				}
			}
			return api.EngineResult{Status: "finished", Text: "child output"}, nil
		case "temporary child":
			tempEntered <- struct{}{}
			select {
			case <-releaseTemp:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
			return api.EngineResult{Status: "finished", Text: "temporary output"}, nil
		}
		err := fmt.Errorf("unexpected intent %q", i.Intent)
		errc <- err
		return api.EngineResult{}, err
	})
	c, _, locator := open(t, bootstrap.Options{Engine: eng})
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(releaseTemp) })
	if c.API.Collaboration == nil {
		t.Fatal("collaboration not assembled")
	}
	b := agent(t, c, "B", nil)
	bID = b.ID
	a := agent(t, c, "A", []string{b.ID})
	if _, e := c.Credentials.Register(ctx, meta(t, c, "cred", "").ProfileID, ref, "session-memory", []byte("controlled-not-real-key")); e != nil {
		t.Fatal(e)
	}
	private := start(t, c, session(t, c, b), "B private")
	wait(t, c, private.RunID, "succeeded")
	r := start(t, c, session(t, c, a), "root")
	var children []api.Delegation
	select {
	case children = <-receipts:
	case <-time.After(5 * time.Second):
		t.Fatal("root did not create children")
	}
	select {
	case <-tempEntered:
	case <-time.After(5 * time.Second):
		t.Fatal("temporary did not run")
	}
	wait(t, c, r.RunID, "waiting_children")
	d := database(t, locator)
	if count(t, d, "SELECT count(*) FROM agents") != 3 {
		t.Fatal("temporary added durable agent")
	}
	if count(t, d, "SELECT count(*) FROM conversation_sessions") != 2 {
		t.Fatal("child added fake private session")
	}
	if _, e := c.Credentials.Delete(ctx, meta(t, c, "delete", "").ProfileID, ref); !reason(e, "CREDENTIAL_IN_USE") {
		t.Fatalf("temporary credential guard: %v", e)
	}
	releaseOnce.Do(func() { close(releaseTemp) })
	wait(t, c, r.RunID, "succeeded")
	for _, child := range children {
		v, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: child.ID})
		if e != nil || v.Status != "succeeded" || v.Result == nil {
			t.Fatalf("durable task: %#v %v", v, e)
		}
	}
	if _, e := c.Credentials.Delete(ctx, meta(t, c, "delete-after", "").ProfileID, ref); e != nil {
		t.Fatalf("released temp pin: %v", e)
	}
	select {
	case e := <-errc:
		t.Fatal(e)
	default:
	}
}
