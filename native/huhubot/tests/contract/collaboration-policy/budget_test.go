package collaborationpolicy_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("policy-owner", "owner", true)

type engineFunc func(context.Context, api.EngineInput) (api.EngineResult, error)

func (f engineFunc) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i)
}
func (f engineFunc) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(c, i.Input)
}
func open(t *testing.T, e api.Engine) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: e})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Errorf("Close: %v", e)
		}
	})
	return c, root, locator
}
func meta(t *testing.T, c *bootstrap.Core, key, rev string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
}
func agent(t *testing.T, c *bootstrap.Core) api.Agent {
	t.Helper()
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("agent:"), ""), Draft: api.AgentDraft{Name: "budgeted", Persona: "test", Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
	if e != nil {
		t.Fatal(e)
	}
	return a
}
func run(t *testing.T, c *bootstrap.Core, a api.Agent, text string) api.RunReceipt {
	t.Helper()
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, api.NewID("session:"), ""), Kind: "direct", Title: "policy", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, api.NewID("run:"), s.Revision), SessionID: s.ID, Intent: text, SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func wait(t *testing.T, c *bootstrap.Core, id, status string) api.Run {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: id})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == status {
			return r
		}
		if time.Now().After(deadline) {
			t.Fatalf("Run wanted %s: %#v", status, r)
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func isReason(e error, s string) bool { var f *api.Fault; return errors.As(e, &f) && f.Reason == s }
func configure(t *testing.T, c *bootstrap.Core, p api.BudgetPolicy) api.BudgetSettings {
	t.Helper()
	old, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: meta(t, c, "q", "").ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	out, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, api.NewID("budget:"), old.Revision), Policy: p})
	if e != nil {
		t.Fatal(e)
	}
	return out
}

func TestPublicBudgetLastReservationEveryHTTPAttemptAndUnknownSettlement(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1); io.WriteString(w, "controlled reply") }))
	defer server.Close()
	result := make(chan error, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		check := func() error {
			if i.Attempts == nil {
				return fmt.Errorf("attempt port missing")
			}
			for _, q := range []api.AttemptRequest{{LogicalCallID: "borrow-maintenance", Purpose: "maintenance", InputEstimate: "1", OutputBound: "1"}, {LogicalCallID: "borrow-root", Purpose: "main", AccountID: "root:somebody-else", InputEstimate: "1", OutputBound: "1"}} {
				if _, e := i.Attempts.Reserve(c, q); e == nil {
					return fmt.Errorf("borrowed account/purpose")
				}
			}
			start := make(chan struct{})
			type attempt struct {
				r api.AttemptReservation
				e error
			}
			done := make(chan attempt, 2)
			var wg sync.WaitGroup
			for n := 0; n < 2; n++ {
				wg.Add(1)
				go func(n int) {
					defer wg.Done()
					<-start
					r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: fmt.Sprint("race-", n), Purpose: "main", InputEstimate: "10", OutputBound: "70"})
					done <- attempt{r, e}
				}(n)
			}
			close(start)
			wg.Wait()
			close(done)
			var accepted api.AttemptReservation
			admitted := 0
			for v := range done {
				if v.e == nil {
					admitted++
					accepted = v.r
				} else if !isReason(v.e, "MODEL_BUDGET_EXHAUSTED") {
					return v.e
				}
			}
			if admitted != 1 {
				return fmt.Errorf("last allowance admitted %d", admitted)
			}
			dispatch := func(r api.AttemptReservation) error {
				return i.Attempts.Dispatch(c, r, func(c context.Context) error {
					req, e := http.NewRequestWithContext(c, http.MethodPost, server.URL, nil)
					if e != nil {
						return e
					}
					resp, e := server.Client().Do(req)
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
			}
			if e := dispatch(accepted); e != nil {
				return e
			}
			if e := dispatch(accepted); !isReason(e, "ATTEMPT_ALREADY_DISPATCHED") {
				return fmt.Errorf("duplicate actual dispatch: %v", e)
			}
			if _, e := i.Attempts.Settle(c, accepted, api.AttemptObservation{Knowledge: "known", InputTokens: "10", OutputTokens: "10", ProducerEnded: false}); !isReason(e, "MODEL_PRODUCER_NOT_ENDED") {
				return fmt.Errorf("early producer release: %v", e)
			}
			if _, e := i.Attempts.Settle(c, accepted, api.AttemptObservation{Knowledge: "known", InputTokens: "10", OutputTokens: "10", ProducerEnded: true}); e != nil {
				return e
			}
			second, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "tool-followup", Purpose: "summary", InputEstimate: "10", OutputBound: "70"})
			if e != nil {
				return e
			}
			if e = dispatch(second); e != nil {
				return e
			}
			observation := api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}
			one, e := i.Attempts.Settle(c, second, observation)
			if e != nil {
				return e
			}
			two, e := i.Attempts.Settle(c, second, observation)
			if e != nil || one != two {
				return fmt.Errorf("settlement replay %v", e)
			}
			if e = i.Attempts.AbortUnsent(c, second); !isReason(e, "ATTEMPT_ALREADY_DISPATCHED") {
				return fmt.Errorf("refunded dispatched unknown: %v", e)
			}
			if _, e = i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "over-budget", Purpose: "main", InputEstimate: "0", OutputBound: "1"}); !isReason(e, "MODEL_BUDGET_EXHAUSTED") {
				return fmt.Errorf("unknown zeroed: %v", e)
			}
			return nil
		}()
		result <- check
		if check != nil {
			return api.EngineResult{}, check
		}
		return api.EngineResult{Status: "finished", Text: "done"}, nil
	})
	c, root, locator := open(t, eng)
	a := agent(t, c)
	initial, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: meta(t, c, "q", "").ProfileID})
	if e != nil || initial.Policy.RootTokenLimit != "0" {
		t.Fatalf("hidden default: %#v %v", initial, e)
	}
	settings := configure(t, c, api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "100", MaintenanceTokenLimit: "100"})
	if settings.Limits.MaxDepth != 3 || settings.Limits.MaxChildren != 32 || settings.Limits.RootChildren != 4 || settings.Limits.ProfileChildren != 8 || settings.Limits.MaxWakes != 8 {
		t.Fatalf("effective limits %#v", settings.Limits)
	}
	r := run(t, c, a, "budgeted")
	select {
	case e := <-result:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("attempt consumer stuck")
	}
	final := wait(t, c, r.RunID, "succeeded")
	if requests.Load() != 2 {
		t.Fatalf("actual HTTP requests=%d", requests.Load())
	}
	if final.Usage == nil || !final.Usage.Estimated || final.Usage.InputTokens != "" || final.Usage.OutputTokens != "" {
		t.Fatalf("unknown projected as zero/known: %#v", final.Usage)
	}
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	var charged, reserved, attempts int
	if e = db.QueryRow("SELECT charged_tokens,reserved_tokens FROM model_budget_accounts WHERE purpose='profile'").Scan(&charged, &reserved); e != nil {
		t.Fatal(e)
	}
	if e = db.QueryRow("SELECT count(*) FROM model_attempts WHERE state='settled'").Scan(&attempts); e != nil {
		t.Fatal(e)
	}
	if charged != 100 || reserved != 0 || attempts != 2 {
		t.Fatalf("ledger charged=%d reserved=%d attempts=%d", charged, reserved, attempts)
	}
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "1", ProfileTokenLimit: "1", MaintenanceTokenLimit: "0", Paused: true})
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	reopened, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	p, e := reopened.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: meta(t, reopened, "q", "").ProfileID})
	if e != nil || !p.Policy.Paused || p.Policy.ProfileTokenLimit != "1" {
		t.Fatalf("policy did not persist: %#v %v", p, e)
	}
	if e = db.QueryRow("SELECT charged_tokens FROM model_budget_accounts WHERE purpose='profile'").Scan(&charged); e != nil || charged != 100 {
		t.Fatalf("lowering reset usage: %d %v", charged, e)
	}
}
