package privatememory_test

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func memoryDurableState(t *testing.T, db *sql.DB) map[string]string {
	t.Helper()
	queries := map[string]string{
		"catalog":       "SELECT COALESCE(sum(catalog_revision),0) FROM memory_namespaces",
		"suppression":   "SELECT COALESCE(sum(suppression_revision),0) FROM memory_namespaces",
		"usage_clock":   "SELECT revision FROM assistant_usage_clock WHERE singleton=1",
		"profile":       "SELECT revision FROM profile_metadata WHERE singleton=1",
		"job_revision":  "SELECT COALESCE(sum(revision),0) FROM memory_jobs",
		"job_committed": "SELECT count(*) FROM memory_jobs WHERE commit_state!='pending'",
	}
	for _, table := range []string{"memory_namespaces", "memory_items", "memory_revisions", "memory_revision_bodies", "memory_index", "memory_candidates", "memory_candidate_bodies", "memory_dependencies", "memory_suppressions", "memory_completion_outbox", "memory_jobs", "model_attempts", "command_receipts"} {
		queries[table] = "SELECT count(*) FROM " + table
	}
	out := map[string]string{}
	for key, query := range queries {
		var value string
		if err := db.QueryRowContext(context.Background(), query).Scan(&value); err != nil {
			t.Fatal(query, err)
		}
		out[key] = value
	}
	return out
}

func installDeferredMemoryFault(t *testing.T, db *sql.DB, trigger string) {
	t.Helper()
	// These two fixture-only tables make the final COMMIT fail. No production
	// migration is replaced, and all earlier statements can complete normally.
	mustMemorySQL(t, db, "CREATE TABLE fixture_memory_parent(id INTEGER PRIMARY KEY)")
	mustMemorySQL(t, db, "CREATE TABLE fixture_memory_commit_guard(id INTEGER PRIMARY KEY, missing_parent INTEGER REFERENCES fixture_memory_parent(id) DEFERRABLE INITIALLY DEFERRED)")
	mustMemorySQL(t, db, trigger)
}

func TestPrivateMemoryStatementAndCommitFaultsRollbackReceiptAndAllWrites(t *testing.T) {
	for _, phase := range []string{"statement", "commit"} {
		t.Run(phase, func(t *testing.T) {
			f := newMemoryFixture(t, nil, true)
			ns := namespaceFor(f.agent("atomic management", false))
			db := f.database()
			before := memoryDurableState(t, db)
			command := api.MemoryCorrect{CommandMeta: f.meta("atomic-memory-intent", "1"), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "must be durably all or nothing"}
			if phase == "statement" {
				mustMemorySQL(t, db, "CREATE TRIGGER fixture_memory_fault BEFORE INSERT ON command_receipts WHEN NEW.method='memory.correct' BEGIN SELECT RAISE(ABORT,'controlled memory receipt statement'); END")
			} else {
				installDeferredMemoryFault(t, db, "CREATE TRIGGER fixture_memory_fault AFTER INSERT ON command_receipts WHEN NEW.method='memory.correct' BEGIN INSERT INTO fixture_memory_commit_guard VALUES(1,999); END")
			}
			_, err := f.core.API.Memory.Correct(context.Background(), owner, command)
			if err == nil || phase == "statement" && !strings.Contains(err.Error(), "controlled memory receipt statement") || phase == "commit" && !strings.Contains(strings.ToLower(err.Error()), "foreign key") {
				t.Fatal("expected actual SQL failure at selected phase", phase, err)
			}
			if after := memoryDurableState(t, db); !reflect.DeepEqual(before, after) {
				t.Fatal("failed mutation left a revision/body/index/receipt/catalog write", before, after)
			}
			if phase == "commit" && sqlCount(t, db, "SELECT count(*) FROM fixture_memory_commit_guard") != 0 {
				t.Fatal("deferred commit failure did not roll back the fault row")
			}
			mustMemorySQL(t, db, "DROP TRIGGER fixture_memory_fault")
			one, err := f.core.API.Memory.Correct(context.Background(), owner, command)
			if err != nil || one.Body == nil || one.Body.Text != command.Text {
				t.Fatal("same original command could not commit after removal of SQL fault", one, err)
			}
			command.CommandID = "transport-retry-after-real-commit"
			two, err := f.core.API.Memory.Correct(context.Background(), owner, command)
			if err != nil || !reflect.DeepEqual(one, two) || sqlCount(t, db, "SELECT count(*) FROM memory_revisions") != 1 || sqlCount(t, db, "SELECT count(*) FROM command_receipts WHERE method='memory.correct'") != 1 {
				t.Fatal("successful retry did not retain one durable revision and receipt", one, two, err)
			}
		})
	}
}

func TestMaintenanceStatementAndCommitFaultsRollbackTheWholeCandidateBatch(t *testing.T) {
	for _, phase := range []string{"statement", "commit"} {
		t.Run(phase, func(t *testing.T) {
			f, a, entered, _ := maintenanceFixture(t)
			source := f.start(f.session(a), "one real source for SQL batch faults")
			f.wait(source.RunID, "succeeded")
			f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100"})
			call := nextMaintenance(t, entered)
			adapters := openMemoryAdapters(t, f)
			db := adapters.base.Database()
			execution := adapters.execution(t, call.input)
			result := candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "first atomic candidate", Provenance: "inference"}, api.MemoryCandidateDraft{Operation: "create", Text: "second atomic candidate", Provenance: "inference"})
			before := memoryDurableState(t, db)
			if phase == "statement" {
				mustMemorySQL(t, db, "CREATE TRIGGER fixture_memory_fault BEFORE INSERT ON memory_revision_bodies WHEN NEW.text='second atomic candidate' BEGIN SELECT RAISE(ABORT,'controlled second candidate statement'); END")
			} else {
				installDeferredMemoryFault(t, db, "CREATE TRIGGER fixture_memory_fault AFTER UPDATE OF commit_state ON memory_jobs WHEN NEW.commit_state='committed' BEGIN INSERT INTO fixture_memory_commit_guard VALUES(1,999); END")
			}
			var hookReturned bool
			err := adapters.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
				out, hookErr := adapters.memory.CommitInTx(context.Background(), tx, execution, *result.MemoryCandidates)
				var bodies int
				if err := tx.QueryRow("SELECT count(*) FROM memory_revision_bodies").Scan(&bodies); err != nil {
					return err
				}
				if phase == "statement" {
					if hookErr == nil || !strings.Contains(hookErr.Error(), "controlled second candidate statement") || bodies != 1 {
						return fmt.Errorf("fixture did not reach second write after first body: bodies=%d error=%v", bodies, hookErr)
					}
				} else {
					if hookErr != nil || bodies != 2 || len(out.AppliedRevisionIDs) != 2 {
						return fmt.Errorf("hook did not succeed before deferred commit: bodies=%d out=%+v error=%v", bodies, out, hookErr)
					}
					hookReturned = true
				}
				return hookErr
			})
			if err == nil || phase == "statement" && !strings.Contains(err.Error(), "controlled second candidate statement") || phase == "commit" && (!hookReturned || !strings.Contains(strings.ToLower(err.Error()), "foreign key")) {
				t.Fatal("selected SQL fault was not observed", phase, hookReturned, err)
			}
			if after := memoryDurableState(t, db); !reflect.DeepEqual(before, after) {
				t.Fatal("failed batch left an earlier item/index/closure/job outcome", before, after)
			}
			mustMemorySQL(t, db, "DROP TRIGGER fixture_memory_fault")
			// The controlled call above only attempted failing transactions. The
			// original Executor now finalizes the same claim and actual result.
			call.result <- result
			f.wait(call.input.RunID, "succeeded")
			page := f.page(namespaceFor(a), "item")
			if len(page.Items) != 2 || sqlCount(t, db, "SELECT count(*) FROM memory_revisions WHERE job_id=?", call.input.Memory.JobID) != 2 || sqlCount(t, db, "SELECT count(*) FROM memory_index") != 2 || sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE job_id=? AND commit_state='committed'", call.input.Memory.JobID) != 1 {
				t.Fatal("original Executor did not atomically commit exactly the same two-item batch", page)
			}
		})
	}
}
