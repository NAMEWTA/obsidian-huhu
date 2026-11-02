package delegation_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestTerminalRunRetainsCredentialPinUntilActualHTTPProducerSettlement(t *testing.T) {
	entered := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	var producers sync.WaitGroup
	defer once.Do(func() { close(release) })
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(entered)
		<-release
		io.WriteString(w, "actual response")
	}))
	defer func() { once.Do(func() { close(release) }); server.Close(); producers.Wait() }()
	type pending struct {
		port api.ModelAttempts
		r    api.AttemptReservation
		done <-chan error
	}
	attempts := make(chan pending, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "actual-http", Purpose: "main", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		done := make(chan error, 1)
		producers.Add(1)
		go func() {
			defer producers.Done()
			done <- i.Attempts.Dispatch(context.Background(), r, func(context.Context) error {
				resp, e := server.Client().Get(server.URL)
				if e != nil {
					return e
				}
				_, e = io.Copy(io.Discard, resp.Body)
				ce := resp.Body.Close()
				if e != nil {
					return e
				}
				return ce
			})
		}()
		select {
		case <-entered:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		attempts <- pending{i.Attempts, r, done}
		// A defective/future adapter returning while its producer still runs cannot
		// turn that request into success or release the configuration reference.
		return api.EngineResult{Status: "finished", Text: "not a completed producer"}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	profile := meta(t, c, "q", "").ProfileID
	ref := "credential:12345678901234567890123456789012"
	if _, e := c.Credentials.Register(ctx, profile, ref, "session-memory", []byte("controlled-session-only")); e != nil {
		t.Fatal(e)
	}
	a := agent(t, c, "A", nil)
	model := a.Model.ModelBindingDraft
	model.CredentialRef = ref
	a, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "bind", a.Revision), ID: a.ID, Draft: api.AgentDraft{Name: a.Name, Persona: a.Persona, Description: a.Description, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: a.AllowedCollaborationTargets, Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"}})
	if e != nil {
		t.Fatal(e)
	}
	r := start(t, c, session(t, c, a), "late producer")
	var p pending
	select {
	case p = <-attempts:
	case <-time.After(5 * time.Second):
		t.Fatal("producer not dispatched")
	}
	blocked := wait(t, c, r.RunID, "failed")
	if blocked.Reason != "MODEL_PRODUCER_UNSETTLED" {
		t.Fatalf("false success %#v", blocked)
	}
	model.CredentialRef = ""
	_, e = c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "unbind", a.Revision), ID: a.ID, Draft: api.AgentDraft{Name: a.Name, Persona: a.Persona, Description: a.Description, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: a.AllowedCollaborationTargets, Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = c.Credentials.Delete(ctx, profile, ref); !reason(e, "CREDENTIAL_IN_USE") {
		t.Fatalf("inflight pin released: %v", e)
	}
	once.Do(func() { close(release) })
	select {
	case e = <-p.done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("HTTP producer not waited")
	}
	if _, e = p.port.Settle(ctx, p.r, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
		t.Fatal(e)
	}
	if _, e = c.Credentials.Delete(ctx, profile, ref); e != nil {
		t.Fatalf("late terminal cleanup not run: %v", e)
	}
	final := wait(t, c, r.RunID, "failed")
	if final.Status != "failed" {
		t.Fatal("late producer reopened run")
	}
	d := database(t, loc)
	if count(t, d, "SELECT count(*) FROM config_snapshot_pins WHERE token=(SELECT pin_token FROM execution_runs WHERE run_id=?)", r.RunID) != 0 {
		t.Fatal("late pin leaked")
	}
	var charge int
	if e = d.QueryRow("SELECT charged_tokens FROM model_budget_accounts WHERE account_id=?", "root:"+r.RunID).Scan(&charge); e != nil || charge != 10 {
		t.Fatal(fmt.Sprintf("cancellation zeroed charge %d %v", charge, e))
	}
}

func TestParentCannotSucceedWhileDescendantHTTPProducerIsUnsettled(t *testing.T) {
	var target string
	entered := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	var wg sync.WaitGroup
	defer func() { once.Do(func() { close(release) }); wg.Wait() }()
	type pending struct {
		port api.ModelAttempts
		r    api.AttemptReservation
		done chan error
	}
	attempt := make(chan pending, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" {
			_, e := i.Tools.Invoke(c, api.ToolCall{ID: "child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "child", Constraints: []string{}}})
			return api.EngineResult{Status: "finished", Text: "root result"}, e
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "child", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		done := make(chan error, 1)
		wg.Add(1)
		go func() {
			defer wg.Done()
			done <- i.Attempts.Dispatch(context.Background(), r, func(context.Context) error { close(entered); <-release; return nil })
		}()
		<-entered
		attempt <- pending{i.Attempts, r, done}
		return api.EngineResult{Status: "finished", Text: "not actually complete"}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	a := agent(t, c, "A", []string{b.ID})
	if _, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"}}); e != nil {
		t.Fatal(e)
	}
	r := start(t, c, session(t, c, a), "root")
	var p pending
	select {
	case p = <-attempt:
	case <-time.After(5 * time.Second):
		t.Fatal("child producer did not start")
	}
	final := wait(t, c, r.RunID, "failed")
	if final.Reason != "DESCENDANT_MODEL_PRODUCER_UNSETTLED" {
		t.Fatalf("parent false completion %#v", final)
	}
	once.Do(func() { close(release) })
	select {
	case e := <-p.done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("producer did not return")
	}
	if _, e := p.port.Settle(ctx, p.r, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
		t.Fatal(e)
	}
	wait(t, c, r.RunID, "failed")
	if count(t, database(t, loc), "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 {
		t.Fatal("late settlement leaked child scheduler slot")
	}
}
