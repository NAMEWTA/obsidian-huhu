package collaborationpolicy_test

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestSettlementFailureRollsBackBalancesAndCanRetryOnlyAccounting(t *testing.T) {
	failed := make(chan error, 1)
	release := make(chan struct{})
	done := make(chan error, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "main", InputEstimate: "1", OutputBound: "9"})
		if e != nil {
			return api.EngineResult{}, e
		}
		if e = i.Attempts.Dispatch(c, r, func(context.Context) error { return nil }); e != nil {
			return api.EngineResult{}, e
		}
		if _, e = i.Attempts.Settle(c, r, api.AttemptObservation{Knowledge: "known", InputTokens: "9007199254740991", OutputTokens: "9007199254740991", ProducerEnded: true}); !isReason(e, "INVALID_MODEL_USAGE") {
			return api.EngineResult{}, api.Invalid("EXTREME_USAGE_NOT_REJECTED")
		}
		observation := api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "2", ProducerEnded: true}
		_, e = i.Attempts.Settle(c, r, observation)
		failed <- e
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		_, e = i.Attempts.Settle(c, r, observation)
		done <- e
		if e != nil {
			return api.EngineResult{}, e
		}
		return api.EngineResult{Status: "finished", Text: "done"}, nil
	})
	c, _, loc := open(t, eng)
	a := agent(t, c)
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "10", MaintenanceTokenLimit: "0"})
	d, e := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	defer d.Close()
	if _, e = d.Exec("CREATE TRIGGER fail_settle BEFORE UPDATE OF settlement_hash ON model_attempts BEGIN SELECT RAISE(ABORT,'controlled settlement fault'); END"); e != nil {
		t.Fatal(e)
	}
	r := run(t, c, a, "fault")
	select {
	case e = <-failed:
		if e == nil {
			t.Fatal("settlement fault ignored")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("no settlement")
	}
	var charged, reserved int
	if e = d.QueryRow("SELECT charged_tokens,reserved_tokens FROM model_budget_accounts WHERE purpose='profile'").Scan(&charged, &reserved); e != nil {
		t.Fatal(e)
	}
	if charged != 0 || reserved != 10 {
		t.Fatalf("half-settled ledger %d/%d", charged, reserved)
	}
	if _, e = d.Exec("DROP TRIGGER fail_settle"); e != nil {
		t.Fatal(e)
	}
	close(release)
	select {
	case e = <-done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("retry accounting not done")
	}
	wait(t, c, r.RunID, "succeeded")
	if e = d.QueryRow("SELECT charged_tokens,reserved_tokens FROM model_budget_accounts WHERE purpose='profile'").Scan(&charged, &reserved); e != nil || charged != 3 || reserved != 0 {
		t.Fatalf("settlement not atomic %d/%d %v", charged, reserved, e)
	}
}
