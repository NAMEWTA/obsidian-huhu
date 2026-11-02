package collaborationpolicy_test

import (
	"context"
	"database/sql"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestMaintenanceEligibilityIsReadOnlyAndUsesCurrentProfileHeadroom(t *testing.T) {
	c, _, locator := open(t, nil)
	profileID := meta(t, c, "memory-budget-profile", "").ProfileID
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(locator, "profile.sqlite3")})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	checks.SetMemory(memorystore.New(db, nil, checks, nil))
	policy := usage.New(db, checks, api.ExecutionLimits{}, api.BudgetPolicy{})
	check := func(want string) {
		t.Helper()
		if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
			var before, after int
			if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM model_budget_accounts").Scan(&before); e != nil {
				return e
			}
			reason, e := policy.MaintenanceEligibilityInTx(ctx, tx, profileID)
			if e != nil || reason != want {
				t.Fatalf("eligibility want %q got %q: %v", want, reason, e)
			}
			if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM model_budget_accounts").Scan(&after); e != nil {
				return e
			}
			if before != after {
				t.Fatal("eligibility created an account")
			}
			return nil
		}); e != nil {
			t.Fatal(e)
		}
	}
	check("BUDGET_NOT_CONFIGURED")
	configured := api.BudgetPolicy{RootTokenLimit: "10", ProfileTokenLimit: "100", MaintenanceTokenLimit: "20"}
	configure(t, c, configured)
	check("")
	paused := configured
	paused.Paused = true
	configure(t, c, paused)
	check("BUDGET_PAUSED")
	missingProfile := configured
	missingProfile.ProfileTokenLimit = "0"
	configure(t, c, missingProfile)
	check("PROFILE_BUDGET_NOT_CONFIGURED")
	configure(t, c, configured)
	// Existing T12 account rows are controlled facts here. This does not assert
	// that a T14 job or real maintenance HTTP has been assembled or dispatched.
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := tx.ExecContext(ctx, "INSERT INTO model_budget_accounts(account_id,profile_id,root_run_id,purpose,configured,paused,token_limit,request_limit,reserved_tokens,charged_tokens) VALUES(?,?,'','maintenance',1,0,20,100,7,13)", "maintenance:"+profileID, profileID)
		return e
	}); e != nil {
		t.Fatal(e)
	}
	check("MODEL_BUDGET_EXHAUSTED")
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := tx.ExecContext(ctx, "UPDATE model_budget_accounts SET reserved_tokens=6 WHERE account_id=?", "maintenance:"+profileID)
		return e
	}); e != nil {
		t.Fatal(e)
	}
	check("")
}

func TestMemoryAttemptBindingReadsRealClaimAndDoesNotHideMissingSchema(t *testing.T) {
	entered := make(chan api.EngineInput, 1)
	release := make(chan struct{})
	var once sync.Once
	engine := engineFunc(func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		entered <- in
		select {
		case <-release:
		case <-c.Done():
		}
		return api.EngineResult{Status: "finished", Text: "controlled result"}, nil
	})
	c, _, locator := open(t, engine)
	t.Cleanup(func() { once.Do(func() { close(release) }) })
	a := agent(t, c)
	run := run(t, c, a, "binding component")
	var input api.EngineInput
	select {
	case input = <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("actual Engine did not claim the Run")
	}
	profileID := meta(t, c, "binding-profile", "").ProfileID
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(locator, "profile.sqlite3")})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	checks.SetMemory(memorystore.New(db, nil, checks, nil))
	policy := usage.New(db, checks, api.ExecutionLimits{}, api.BudgetPolicy{})
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		r, access, e := execution.ReadInTx(ctx, tx, owner, api.IDQuery{ProfileID: profileID, ID: run.RunID})
		if e != nil {
			return e
		}
		var claim string
		if e := tx.QueryRowContext(ctx, "SELECT claim_token FROM execution_runs WHERE run_id=?", run.RunID).Scan(&claim); e != nil {
			return e
		}
		x := api.ToolExecution{Identity: owner, Run: r, Access: access, ClaimToken: claim, Agent: input.Agent, Config: input.Config, Lineage: input.Lineage}
		// 014 is now assembled. Temporarily hide its real job table inside a
		// savepoint, then restore it; absence must still fail closed.
		if _, e := tx.ExecContext(ctx, "SAVEPOINT missing_memory_schema"); e != nil {
			return e
		}
		if _, e := tx.ExecContext(ctx, "ALTER TABLE memory_jobs RENAME TO missing_memory_jobs_component"); e != nil {
			return e
		}
		_, missingErr := policy.ReadAttemptBindingInTx(ctx, tx, x)
		if _, e := tx.ExecContext(ctx, "ROLLBACK TO missing_memory_schema"); e != nil {
			return e
		}
		if _, e := tx.ExecContext(ctx, "RELEASE missing_memory_schema"); e != nil {
			return e
		}
		if missingErr == nil || !strings.Contains(missingErr.Error(), "memory_jobs") {
			t.Fatal("missing Memory schema became a normal successful binding", missingErr)
		}
		stale := x
		stale.ClaimToken = "stale-claim"
		if _, e := policy.ReadAttemptBindingInTx(ctx, tx, stale); !isReason(e, "MODEL_ATTEMPT_NOT_ACTIVE") {
			t.Fatal("job lookup bypassed actual claim", e)
		}
		binding, e := policy.ReadAttemptBindingInTx(ctx, tx, x)
		if e != nil || binding.Purpose != "main" || binding.AccountID != "root:"+r.RootRunID || binding.JobID != "" {
			t.Fatalf("ordinary actual Run binding changed: %#v %v", binding, e)
		}
		// Controlled invalid relations exercise the real 014 constraints. They
		// are negative corruption inputs, never a maintenance positive fixture.
		if _, e = tx.ExecContext(ctx, "INSERT INTO memory_namespaces(namespace_id,profile_id,principal_id,kind,subject_id,enabled) VALUES('ns-component',?,'owner','agent',?,1) ON CONFLICT(profile_id,principal_id,kind,subject_id) DO NOTHING", profileID, a.ID); e != nil {
			return e
		}
		var namespace string
		if e = tx.QueryRowContext(ctx, "SELECT namespace_id FROM memory_namespaces WHERE profile_id=? AND principal_id='owner' AND kind='agent' AND subject_id=?", profileID, a.ID).Scan(&namespace); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO memory_completion_outbox(completion_id,namespace_id,source_run_id,source_kind,source_id,source_revision,source_hash,source_namespace,source_work_thread_id,scope_kind,scope_id,rule_version,created_at) VALUES('completion-component',?,?,'message','controlled-not-a-completion','1','sha256:controlled',?,?,'session',?,'component-only','2026-10-26T00:00:00Z')", namespace, r.ID, r.SessionID, r.SessionID, r.SessionID); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO memory_jobs(job_id,namespace_id,completion_id,source_run_id,generation,settings_revision,run_id,task_config_id,admission,commit_state,created_at) VALUES('job-component',?,'completion-component',?,1,1,?,'not-a-real-task-pin','bound','pending','2026-10-26T00:00:00Z')", namespace, r.ID, r.ID); e != nil {
			return e
		}
		if _, e := policy.ReadAttemptBindingInTx(ctx, tx, x); !isReason(e, "MEMORY_STATE_INVALID") {
			t.Fatal("ordinary Run borrowed maintenance without independent config pin", e)
		}
		if _, e = tx.ExecContext(ctx, "PRAGMA defer_foreign_keys=ON"); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE memory_jobs SET namespace_id='missing-namespace' WHERE job_id='job-component'"); e != nil {
			return e
		}
		if _, e := policy.ReadAttemptBindingInTx(ctx, tx, x); !isReason(e, "MEMORY_STATE_INVALID") {
			t.Fatal("missing namespace relationship was not a typed state failure", e)
		}
		if _, e = tx.ExecContext(ctx, "DELETE FROM memory_jobs WHERE job_id='job-component'"); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "DELETE FROM memory_completion_outbox WHERE completion_id='completion-component'"); e != nil {
			return e
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	once.Do(func() { close(release) })
	wait(t, c, run.RunID, "succeeded")
}
