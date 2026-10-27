package foundation_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// Build the old schema from its unchanged migration bytes, rather than setting
// user_version backwards on a current database with an already rebuilt graph.
func groupV7Fixture(t *testing.T) (string, string) {
	t.Helper()
	root := privateRoot(t)
	dir := filepath.Join(root, "one")
	h, e := profile.Acquire(root, dir)
	if e != nil {
		t.Fatal(e)
	}
	db, e := sql.Open("sqlite3", h.DatabasePath)
	if e != nil {
		t.Fatal(e)
	}
	db.SetMaxOpenConns(1)
	tx, e := db.BeginTx(context.Background(), nil)
	if e != nil {
		t.Fatal(e)
	}
	for _, m := range migrations.Ordered[:7] {
		if _, e = tx.Exec(m.SQL); e != nil {
			t.Fatal(e)
		}
		if m.Version == 1 {
			if _, e = tx.Exec("INSERT INTO profile_metadata VALUES(1,'profile:v7',1,9,'2026-10-25T00:00:00Z')"); e != nil {
				t.Fatal(e)
			}
		}
	}
	_, e = tx.Exec(`INSERT INTO conversation_sessions(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,message_seq) VALUES('session:v7','profile:v7','owner','direct','preserved','vault',3,0,1);
 INSERT INTO conversation_members VALUES('session:v7','agent:v7');
 INSERT INTO execution_runs(run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at,root_run_id,work_thread_id,budget_root_run_id) VALUES('run:v7','session:v7','owner','message:v7','{}','agent:v7',1,0,'succeeded',2,'old intent','[]','[]','[]','[]','[]','[]','','old-claim','','','',1,'2026-10-25T00:00:00Z','run:v7','session:v7','run:v7');
 INSERT INTO execution_events VALUES('run:v7',1,'accepted','2026-10-25T00:00:00Z','{}');
 INSERT INTO conversation_messages VALUES('message:v7','run:v7','session:v7',1,'user','old intent','2026-10-25T00:00:00Z','','[]',0,'');
 INSERT INTO collaboration_threads VALUES('thread:v7','run:v7','session:v7','owner','agent:v7','2026-10-25T00:00:00Z');`)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = tx.Exec(fmt.Sprintf("PRAGMA application_id=%d; PRAGMA user_version=7", migrations.ApplicationID)); e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
	if e = db.Close(); e != nil {
		t.Fatal(e)
	}
	if e = h.Close(); e != nil {
		t.Fatal(e)
	}
	return root, dir
}
func groupMigrationOpen(t *testing.T, root, dir string) (*base.Store, error) {
	t.Helper()
	h, e := profile.Acquire(root, dir)
	if e != nil {
		return nil, e
	}
	t.Cleanup(func() { _ = h.Close() })
	return base.OpenWithBackup(context.Background(), h, func(context.Context, *sql.DB, string) ([]base.BackupBlob, error) { return []base.BackupBlob{}, nil })
}
func TestGroupMigrationRebuildPreservesGraphAndRestoresForeignKeys(t *testing.T) {
	root, dir := groupV7Fixture(t)
	s, e := groupMigrationOpen(t, root, dir)
	if e != nil {
		t.Fatal(e)
	}
	defer s.Close()
	db := s.Database()
	var enabled, version int
	if e = db.QueryRow("PRAGMA foreign_keys").Scan(&enabled); e != nil || enabled != 1 {
		t.Fatalf("foreign keys %d %v", enabled, e)
	}
	if e = db.QueryRow("PRAGMA user_version").Scan(&version); e != nil || version != 11 {
		t.Fatalf("version %d %v", version, e)
	}
	for table, want := range map[string]int{"conversation_sessions": 1, "conversation_members": 1, "conversation_messages": 1, "execution_runs": 1, "execution_events": 1, "collaboration_threads": 1} {
		var n int
		if e = db.QueryRow("SELECT count(*) FROM " + table).Scan(&n); e != nil || n != want {
			t.Fatalf("lost %s: %d %v", table, n, e)
		}
	}
	var text, kind string
	if e = db.QueryRow("SELECT s.kind,m.text FROM conversation_sessions s JOIN conversation_messages m ON m.session_id=s.session_id").Scan(&kind, &text); e != nil || kind != "direct" || text != "old intent" {
		t.Fatalf("old data %q %q %v", kind, text, e)
	}
	if _, e = db.Exec("INSERT INTO conversation_members(session_id,agent_id) VALUES('missing','orphan')"); e == nil {
		t.Fatal("normal Store returned with foreign keys disabled")
	}
	rows, e := db.Query("PRAGMA foreign_key_check")
	if e != nil {
		t.Fatal(e)
	}
	if rows.Next() {
		t.Fatal("broken foreign-key graph")
	}
	if e = rows.Close(); e != nil {
		t.Fatal(e)
	}
}
func TestGroupMigrationFailureRollsBackWholeRebuild(t *testing.T) {
	for _, mode := range []string{"statement", "foreign-key"} {
		t.Run(mode, func(t *testing.T) {
			root, dir := groupV7Fixture(t)
			original := migrations.Ordered[7]
			t.Cleanup(func() { migrations.Ordered[7] = original })
			suffix := "; SELECT no_such_migration_function();"
			expected := "PROFILE_MIGRATION_FAILED"
			if mode == "foreign-key" {
				suffix = "; INSERT INTO conversation_members(session_id,agent_id) VALUES('missing','orphan');"
				expected = "PROFILE_MIGRATION_FOREIGN_KEY_FAILED"
			}
			migrations.Ordered[7].SQL = original.SQL + suffix
			s, e := groupMigrationOpen(t, root, dir)
			migrations.Ordered[7] = original
			if s != nil {
				_ = s.Close()
				t.Fatal("failed migration returned usable Store")
			}
			var f *api.Fault
			if !errors.As(e, &f) || f.Reason != expected {
				t.Fatalf("failure: %v", e)
			}
			db, e := sql.Open("sqlite3", filepath.Join(dir, profile.DatabaseName))
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			var version, n int
			if e = db.QueryRow("PRAGMA user_version").Scan(&version); e != nil || version != 7 {
				t.Fatalf("version changed %d %v", version, e)
			}
			if e = db.QueryRow("SELECT count(*) FROM conversation_messages WHERE text='old intent'").Scan(&n); e != nil || n != 1 {
				t.Fatal("lost pre-migration data", e)
			}
			if e = db.QueryRow("SELECT count(*) FROM pragma_table_info('execution_runs') WHERE name='execution_role'").Scan(&n); e != nil || n != 0 {
				t.Fatal("partial schema committed", e)
			}
			if e = db.QueryRow("SELECT count(*) FROM sqlite_schema WHERE name IN('conversation_sessions_v8','conversation_members_v8','group_publications')").Scan(&n); e != nil || n != 0 {
				t.Fatal("partial tables committed", e)
			}
		})
	}
}
