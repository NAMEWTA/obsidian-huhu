package recovery_test

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestActualDetachedHTTPProducerKeepsProfileAndSlotUntilRealResponseAndSettlement(t *testing.T) {
	entered := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	var producers sync.WaitGroup
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(entered)
		<-release
		io.WriteString(w, "actual held response")
	}))
	defer func() { once.Do(func() { close(release) }); server.Close(); producers.Wait() }()
	type pending struct {
		port        api.ModelAttempts
		reservation api.AttemptReservation
		done        chan error
	}
	attempt := make(chan pending, 1)
	var target string
	eng := engine{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "parent" {
			_, e := i.Tools.Invoke(c, api.ToolCall{ID: "child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "detached-http", Constraints: []string{}}})
			return api.EngineResult{Status: "finished", Text: "parent result"}, e
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "actual-http", Purpose: "child", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		done := make(chan error, 1)
		producers.Add(1)
		go func() {
			defer producers.Done()
			done <- i.Attempts.Dispatch(context.Background(), r, func(context.Context) error {
				response, e := server.Client().Get(server.URL)
				if e != nil {
					return e
				}
				_, e = io.Copy(io.Discard, response.Body)
				ce := response.Body.Close()
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
		attempt <- pending{i.Attempts, r, done}
		return api.EngineResult{Status: "finished", Text: "must not report success while producer lives"}, nil
	}}
	c, root, loc := fresh(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "http child", nil)
	target = b.ID
	a := agent(t, c, "parent", []string{b.ID})
	if _, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"}}); e != nil {
		t.Fatal(e)
	}
	r := start(t, c, session(t, c, a), "parent")
	var p pending
	select {
	case p = <-attempt:
	case <-time.After(5 * time.Second):
		t.Fatal("HTTP not dispatched")
	}
	wait(t, c, r.RunID, "failed")
	d := db(t, loc)
	if count(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot=1") != 1 || count(t, d, "SELECT count(*) FROM task_config_pins") != 1 {
		t.Fatal("Engine exit released live HTTP producer qualification")
	}
	if e := c.Close(); !reason(e, "EXECUTOR_STOP_TIMEOUT") {
		t.Fatalf("Close while HTTP is physically blocked: %v", e)
	}
	other, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{ExecutorPaused: true})
	if other != nil {
		other.Close()
	}
	var fault *api.Fault
	if !errors.As(e, &fault) || fault.Kind != "INSTANCE_CONFLICT" {
		t.Fatalf("Profile lock released before producer ended: %v", e)
	}
	if count(t, d, "SELECT count(*) FROM model_attempts WHERE state='dispatched' AND producer_ended=0") != 1 || count(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot=1") != 1 {
		t.Fatal("close inferred a dead producer or refunded it")
	}
	if _, e = p.port.Reserve(context.Background(), api.AttemptRequest{LogicalCallID: "late", Purpose: "child", InputEstimate: "1", OutputBound: "1"}); !reason(e, "SERVICE_STOPPING") {
		t.Fatalf("closed process admitted new model request: %v", e)
	}
	once.Do(func() { close(release) })
	select {
	case e = <-p.done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("actual response not Waited")
	}
	if _, e = p.port.Settle(context.Background(), p.reservation, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
		t.Fatal(e)
	}
	deadline, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if e = c.WaitClosed(deadline); e != nil {
		t.Fatal(e)
	}
	final := open(t, root, loc, bootstrap.Options{ExecutorPaused: true})
	_ = final
	if count(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, d, "SELECT count(*) FROM task_config_pins") != 0 || count(t, d, "SELECT count(*) FROM model_attempts WHERE state='settled' AND charged_tokens=10 AND knowledge='unknown' AND producer_ended=1") != 1 {
		t.Fatal("actual producer settlement lost original unknown cost or retained resources")
	}
	t.Log("real local HTTP blocked after Engine exit: 3s Close timeout, Profile still locked/DB open/child slot1; actual response+late Settle unknown10, WaitClosed then same Profile reopens")
}

func TestReadyRecoveryDoesNotPreauthorizeFutureDispatchAfterBudgetPauseOrDownsize(t *testing.T) {
	for _, which := range []string{"pause", "downsize"} {
		t.Run(which, func(t *testing.T) {
			root, loc := fixture(t, "inflight")
			_, run := oldIDs(t)
			reserved := make(chan struct{}, 1)
			release := make(chan struct{})
			var once sync.Once
			defer once.Do(func() { close(release) })
			result := make(chan error, 1)
			var callbacks atomic.Int32
			eng := engine{inspect: validOldCheckpoint, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				r, e := i.Input.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "resumed-new-attempt", Purpose: "child", InputEstimate: "1", OutputBound: "1"})
				if e != nil {
					result <- e
					return api.EngineResult{}, e
				}
				reserved <- struct{}{}
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				e = i.Input.Attempts.Dispatch(context.Background(), r, func(context.Context) error { callbacks.Add(1); return nil })
				if e == nil {
					result <- fmt.Errorf("new dispatch bypassed current budget")
					return api.EngineResult{}, fmt.Errorf("unexpected dispatch")
				}
				if x := i.Input.Attempts.AbortUnsent(ctx, r); x != nil {
					result <- x
					return api.EngineResult{}, x
				}
				result <- e
				return api.EngineResult{Status: "failed", Reason: "CURRENT_BUDGET_DENIED"}, nil
			}}
			c := open(t, root, loc, bootstrap.Options{Engine: eng})
			// The schema8 constructor used explicit process Options. Configure the
			// reopened public policy before testing a later user pause/downsize.
			if _, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "initial-current-budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}}); e != nil {
				t.Fatal(e)
			}
			s := inspect(t, c, run)
			if s.State != "ready" {
				t.Fatal(s)
			}
			if _, e := c.API.Recovery.Resume(ctx, owner, resumeCommand(t, c, s, "resume-budget")); e != nil {
				t.Fatal(e)
			}
			select {
			case <-reserved:
			case e := <-result:
				t.Fatalf("initial reservation failed: %v", e)
			case <-time.After(5 * time.Second):
				t.Fatal("Resume did not reserve")
			}
			policy, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: readyProfile(t, c)})
			if e != nil {
				t.Fatal(e)
			}
			if which == "pause" {
				policy.Policy.Paused = true
			} else {
				policy.Policy.ProfileTokenLimit = "7"
			}
			if _, e = c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "current-budget", policy.Revision), Policy: policy.Policy}); e != nil {
				t.Fatal(e)
			}
			once.Do(func() { close(release) })
			select {
			case e = <-result:
				if which == "pause" && !reason(e, "BUDGET_PAUSED") || which == "downsize" && !reason(e, "MODEL_BUDGET_EXHAUSTED") {
					t.Fatalf("current budget error: %v", e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("Dispatch did not recheck")
			}
			wait(t, c, run, "failed")
			d := db(t, loc)
			if callbacks.Load() != 0 || count(t, d, "SELECT count(*) FROM model_attempts WHERE settlement_hash='process-interrupted' AND charged_tokens=7") != 1 || count(t, d, "SELECT count(*) FROM model_attempts WHERE logical_call_id='resumed-new-attempt' AND state='aborted'") != 1 {
				t.Fatal("ready bypassed Dispatch fence or cleared original usage")
			}
		})
	}
}
