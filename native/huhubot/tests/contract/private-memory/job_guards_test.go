package privatememory_test

import (
	"context"
	"database/sql"
	"reflect"
	"strconv"
	"testing"
	"time"

	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestForgottenStableOriginRejectsOldGenerationAndARealNewJob(t *testing.T) {
	f, agent, entered, _ := maintenanceFixture(t)
	ns := namespaceFor(agent)
	originalSession := f.session(agent)
	firstSource := f.start(originalSession, "original stable message before any memory")
	f.wait(firstSource.RunID, "succeeded")
	secondSource := f.start(f.session(agent), "independent second job before target exists")
	f.wait(secondSource.RunID, "succeeded")
	f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100"})
	first := nextMaintenance(t, entered)
	first.result <- candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "automatic fact to forget", Provenance: "inference"})
	f.wait(first.input.RunID, "succeeded")
	page := f.page(ns, "item")
	if len(page.Items) != 1 || page.Items[0].Item == nil {
		t.Fatal("first real job did not create an item", page)
	}
	item := *page.Items[0].Item
	second := nextMaintenance(t, entered)
	if len(second.input.Memory.Targets) != 1 || second.input.Memory.Targets[0].RevisionID != item.RevisionID {
		t.Fatal("second actual claim did not consume the soon-forgotten head", second.input.Memory)
	}
	db := f.database()
	var firstJobSource string
	if err := db.QueryRow("SELECT source_run_id FROM memory_jobs WHERE job_id=?", first.input.Memory.JobID).Scan(&firstJobSource); err != nil || firstJobSource != firstSource.RunID {
		t.Fatal("fixture source order did not identify the original stable message", firstJobSource, err)
	}
	if _, err := f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(item.Revision), Namespace: ns, ID: item.ID}); err != nil {
		t.Fatal(err)
	}
	var generation, state string
	if err := db.QueryRow("SELECT CAST(generation AS TEXT),commit_state FROM memory_jobs WHERE job_id=?", second.input.Memory.JobID).Scan(&generation, &state); err != nil {
		t.Fatal(err)
	}
	oldGeneration, _ := strconv.Atoi(second.input.Memory.JobGeneration)
	newGeneration, err := strconv.Atoi(generation)
	if err != nil || newGeneration <= oldGeneration || state != "discarded" {
		t.Fatal("forget did not invalidate the actual in-flight job generation", second.input.Memory.JobGeneration, generation, state, err)
	}
	second.result <- candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "late callback with a different text/hash", Provenance: "inference"})
	f.wait(second.input.RunID, "failed")
	if sqlCount(t, db, "SELECT count(*) FROM memory_candidates WHERE job_id=?", second.input.Memory.JobID) != 0 || sqlCount(t, db, "SELECT count(*) FROM memory_revisions WHERE job_id=?", second.input.Memory.JobID) != 0 {
		t.Fatal("old generation escaped through a new item or candidate")
	}
	// This is a new public StartRun after forget. It can still read the actual
	// source message as history, but that retained stable ancestor must prevent
	// automatic resurrection through a new completion, body hash and job ID.
	newSource := f.start(originalSession, "new output and hash still derived from the same old message")
	f.wait(newSource.RunID, "succeeded")
	var jobID, sourceHash, newJobGeneration string
	var bound sql.NullString
	if err := db.QueryRow("SELECT j.job_id,CAST(j.generation AS TEXT),j.run_id,o.source_hash FROM memory_jobs j JOIN memory_completion_outbox o ON o.completion_id=j.completion_id WHERE j.source_run_id=?", newSource.RunID).Scan(&jobID, &newJobGeneration, &bound, &sourceHash); err != nil {
		t.Fatal(err)
	}
	stable := first.input.Memory.Entries[0].Ref
	if jobID == first.input.Memory.JobID || jobID == second.input.Memory.JobID || newJobGeneration != "1" || bound.Valid || sourceHash == stable.Hash {
		t.Fatal("new completion fixture did not exercise a fresh unbound job/hash", jobID, newJobGeneration, bound, sourceHash)
	}
	if sqlCount(t, db, "SELECT count(*) FROM memory_dependencies WHERE owner_kind='job' AND owner_id=? AND ancestor_kind=? AND ancestor_id=? AND relation!='audit'", jobID, stable.Kind, stable.ID) != 1 {
		t.Fatal("real new output did not preserve the old stable source ancestry")
	}
	a := openMemoryAdapters(t, f)
	var admission executionstore.MaintenanceAdmission
	err = a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
		var err error
		admission, err = a.memory.ReadAdmissionInTx(context.Background(), tx, owner, jobID)
		return err
	})
	if !memoryReason(err, "MEMORY_FORGOTTEN") || admission.JobID != "" || len(admission.Input.Entries) != 0 {
		t.Fatal("new job bypassed stable-origin suppression", admission, err)
	}
	if sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE job_id=? AND run_id IS NOT NULL", jobID) != 0 || sqlCount(t, db, "SELECT count(*) FROM memory_items WHERE state='active'") != 0 || sqlCount(t, db, "SELECT count(*) FROM model_attempts") != 0 {
		t.Fatal("suppressed new job admitted a Run, revived a body or fabricated a request")
	}
}

func TestUnboundMemoryAdmissionRechecksCurrentEligibilityWithoutCreatingRuns(t *testing.T) {
	f, agent, _, _ := maintenanceFixture(t)
	receipt := f.start(f.session(agent), "one accepted completion without maintenance budget")
	f.wait(receipt.RunID, "succeeded")
	// Stop the only Executor before reconfiguring an eligible budget, so this
	// is an exact read-only adapter consumer, without racing a scheduler. The
	// original Provider is gone; the positive path uses persisted credential
	// metadata only and does NOT claim credential recovery or model dispatch.
	if err := f.core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	if err := f.core.WaitClosed(ctx); err != nil {
		t.Fatal(err)
	}
	a := openMemoryAdapters(t, f)
	db := a.base.Database()
	var jobID string
	if err := db.QueryRow("SELECT job_id FROM memory_jobs WHERE source_run_id=? AND run_id IS NULL", receipt.RunID).Scan(&jobID); err != nil {
		t.Fatal(err)
	}
	configure := func(policy api.BudgetPolicy) {
		t.Helper()
		old, err := a.policy.Budget(context.Background(), owner, api.BudgetQuery{ProfileID: f.profile})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := a.policy.ConfigureBudget(context.Background(), owner, api.BudgetConfigure{CommandMeta: f.next(old.Revision), Policy: policy}); err != nil {
			t.Fatal(err)
		}
	}
	check := func(want string) {
		t.Helper()
		before := memoryDurableState(t, db)
		accounts := sqlCount(t, db, "SELECT count(*) FROM model_budget_accounts")
		var admission executionstore.MaintenanceAdmission
		err := a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
			var err error
			admission, err = a.memory.ReadAdmissionInTx(context.Background(), tx, owner, jobID)
			return err
		})
		if want != "" {
			if !memoryReason(err, want) || admission.JobID != "" || len(admission.Input.Entries) != 0 {
				t.Fatal("unbound job used a stale eligibility reason or released input", want, admission, err)
			}
		} else if err != nil || admission.JobID != jobID || admission.Input.Mode != "maintenance" || len(admission.Input.Entries) != 1 || admission.Access.TaskID != "" {
			t.Fatal("current read-only admission did not produce the same unbound source", admission, err)
		}
		if after := memoryDurableState(t, db); !reflect.DeepEqual(before, after) || sqlCount(t, db, "SELECT count(*) FROM model_budget_accounts") != accounts || sqlCount(t, db, "SELECT count(*) FROM execution_runs") != 1 || sqlCount(t, db, "SELECT count(*) FROM model_attempts") != 0 {
			t.Fatal("eligibility read materialized work, accounting or a receipt", before, after)
		}
	}
	check("BUDGET_NOT_CONFIGURED")
	policy := api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100", Paused: true}
	configure(policy)
	check("BUDGET_PAUSED")
	policy.Paused, policy.ProfileTokenLimit = false, "0"
	configure(policy)
	check("PROFILE_BUDGET_NOT_CONFIGURED")
	policy.ProfileTokenLimit = "1000"
	configure(policy)
	check("")
	for _, enabled := range []bool{false, true} {
		settings, err := a.memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: namespaceFor(agent), Kind: "settings"})
		if err != nil || settings.Settings == nil {
			t.Fatal(settings, err)
		}
		if _, err := a.memory.SetAutoMaintenance(context.Background(), owner, api.MemorySetAuto{CommandMeta: f.next(settings.Settings.Revision), Namespace: namespaceFor(agent), Enabled: enabled}); err != nil {
			t.Fatal(err)
		}
		if enabled {
			check("")
		} else {
			check("MEMORY_AUTO_DISABLED")
		}
	}
}
