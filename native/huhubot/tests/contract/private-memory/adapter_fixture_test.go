package privatememory_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	usagestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// The database, migrations, subjects, Runs and jobs are created by the default
// Core. This second adapter connection exposes only the existing Memory hooks
// for controlled transaction faults; it does not run another Executor.
type memoryAdapters struct {
	base   *base.Store
	config *assistantstore.Store
	access *grantsstore.Store
	policy *usagestore.Store
	memory *memorystore.Store
}

func openMemoryAdapters(t *testing.T, f *memoryFixture) *memoryAdapters {
	t.Helper()
	b, err := base.Open(context.Background(), &profile.Handle{DatabasePath: filepath.Join(f.directory, profile.DatabaseName)})
	if err != nil {
		t.Fatal(err)
	}
	a := &memoryAdapters{base: b, config: assistantstore.New(b), access: grantsstore.New(b)}
	a.policy = usagestore.New(b, a.access, api.ExecutionLimits{}, api.BudgetPolicy{})
	a.memory = memorystore.New(b, a.config, a.access, a.policy)
	a.access.SetMemory(a.memory)
	t.Cleanup(func() {
		a.memory.StopAdmission()
		select {
		case <-a.memory.Done():
		case <-time.After(3 * time.Second):
			t.Error("Memory adapter did not join")
		}
		if err := b.Close(); err != nil {
			t.Error(err)
		}
	})
	return a
}

func (a *memoryAdapters) execution(t *testing.T, in api.EngineInput) api.ToolExecution {
	t.Helper()
	e := api.ToolExecution{Identity: owner, Run: api.Run{ID: in.RunID}, Agent: in.Agent, Config: in.Config, Lineage: in.Lineage}
	if err := a.base.Database().QueryRowContext(context.Background(), "SELECT claim_token FROM execution_runs WHERE run_id=? AND status='running'", in.RunID).Scan(&e.ClaimToken); err != nil || e.ClaimToken == "" {
		t.Fatal("missing actual live claim", err)
	}
	return e
}

func mustMemorySQL(t *testing.T, db *sql.DB, statement string, args ...any) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), statement, args...); err != nil {
		t.Fatal(statement, err)
	}
}

func memoryJSON(t *testing.T, value any) string {
	t.Helper()
	b, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func memoryRef(t *testing.T, db *sql.DB, f *memoryFixture, item api.MemoryItem) api.DerivedInput {
	t.Helper()
	var namespace string
	if err := db.QueryRowContext(context.Background(), "SELECT namespace_id FROM memory_items WHERE item_id=?", item.ID).Scan(&namespace); err != nil {
		t.Fatal(err)
	}
	thread := item.Scope.ID
	if thread == "" {
		thread = f.profile
	}
	return api.DerivedInput{Kind: "memory_revision", ID: item.RevisionID, Revision: "1", Hash: item.Body.Hash, Namespace: namespace, WorkThreadID: thread}
}

func setControlledAncestry(t *testing.T, db *sql.DB, item api.MemoryItem, refs []api.DerivedInput) {
	t.Helper()
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec("DELETE FROM memory_dependencies WHERE owner_kind='memory_revision' AND owner_id=? AND relation='origin'", item.RevisionID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec("UPDATE memory_revisions SET derived_json=? WHERE revision_id=?", memoryJSON(t, refs), item.RevisionID); err != nil {
		t.Fatal(err)
	}
	for _, ref := range refs {
		if _, err = tx.Exec("INSERT INTO memory_dependencies(owner_kind,owner_id,ancestor_kind,ancestor_id,ancestor_revision,content_hash,namespace,work_thread_id,relation) VALUES('memory_revision',?,?,?,?,?,?,?,'origin')", item.RevisionID, ref.Kind, ref.ID, ref.Revision, ref.Hash, ref.Namespace, ref.WorkThreadID); err != nil {
			t.Fatal(err)
		}
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
}
