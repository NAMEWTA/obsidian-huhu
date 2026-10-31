package recovery_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/effects"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type tableSnapshot struct {
	Columns []string
	Rows    []string
}

func oldRows(t *testing.T, d *sql.DB, columns map[string][]string) map[string]tableSnapshot {
	t.Helper()
	if columns == nil {
		columns = map[string][]string{}
		rows, e := d.Query("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
		if e != nil {
			t.Fatal(e)
		}
		names := []string{}
		for rows.Next() {
			var n string
			if e = rows.Scan(&n); e != nil {
				t.Fatal(e)
			}
			names = append(names, n)
		}
		if e = rows.Err(); e != nil {
			t.Fatal(e)
		}
		rows.Close()
		for _, name := range names {
			r, e := d.Query("SELECT * FROM " + name + " LIMIT 0")
			if e != nil {
				t.Fatal(e)
			}
			columns[name], e = r.Columns()
			r.Close()
			if e != nil {
				t.Fatal(e)
			}
		}
	}
	out := map[string]tableSnapshot{}
	for table, cols := range columns {
		r, e := d.Query("SELECT " + strings.Join(cols, ",") + " FROM " + table)
		if e != nil {
			t.Fatal(e)
		}
		snap := tableSnapshot{Columns: cols, Rows: []string{}}
		for r.Next() {
			v := make([]any, len(cols))
			p := make([]any, len(cols))
			for i := range v {
				p[i] = &v[i]
			}
			if e = r.Scan(p...); e != nil {
				t.Fatal(e)
			}
			b, e := json.Marshal(v)
			if e != nil {
				t.Fatal(e)
			}
			snap.Rows = append(snap.Rows, string(b))
		}
		e = r.Err()
		r.Close()
		if e != nil {
			t.Fatal(e)
		}
		sort.Strings(snap.Rows)
		out[table] = snap
	}
	return out
}
func columns(before map[string]tableSnapshot) map[string][]string {
	out := map[string][]string{}
	for k, v := range before {
		out[k] = v.Columns
	}
	return out
}
func checkpointBytes(t *testing.T, dir string) map[string]string {
	t.Helper()
	out := map[string]string{}
	e := filepath.WalkDir(filepath.Join(dir, "checkpoints"), func(p string, d os.DirEntry, e error) error {
		if os.IsNotExist(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if d.IsDir() {
			return nil
		}
		b, e := os.ReadFile(p)
		if e != nil {
			return e
		}
		sum := sha256.Sum256(b)
		out[filepath.Base(p)] = hex.EncodeToString(sum[:])
		return nil
	})
	if e != nil {
		t.Fatal(e)
	}
	return out
}

func TestRealSchema8CompleteDatabaseAndCheckpointUpgradePreservesEveryOldColumnAndRecoverySet(t *testing.T) {
	for _, name := range []string{"legacy_cp", "groups", "inflight"} {
		t.Run(name, func(t *testing.T) {
			root, loc := fixture(t, name)
			beforeDB := db(t, loc)
			if count(t, beforeDB, "PRAGMA user_version") != 8 {
				t.Fatal("fixture is not actual schema8")
			}
			before := oldRows(t, beforeDB, nil)
			beforeDB.Close()
			cp := checkpointBytes(t, loc)
			h, e := profile.Acquire(root, loc)
			if e != nil {
				t.Fatal(e)
			}
			defer h.Close()
			b, e := base.OpenWithBackup(ctx, h, func(c context.Context, d *sql.DB, dir string) ([]base.BackupBlob, error) {
				source, e := store.ReadOnlySource(h.Directory)
				if e != nil {
					return nil, e
				}
				return effects.CompleteMigrationBackup(c, d, source, dir)
			})
			if e != nil {
				t.Fatal(e)
			}
			defer b.Close()
			after := oldRows(t, b.Database(), columns(before))
			if !reflect.DeepEqual(before, after) {
				t.Fatal("016 rewrote old table facts")
			}
			if got := checkpointBytes(t, loc); !reflect.DeepEqual(cp, got) {
				t.Fatal("016 changed private checkpoint bytes")
			}
			if count(t, b.Database(), "PRAGMA user_version") != migrations.CurrentVersion || count(t, b.Database(), "PRAGMA foreign_keys") != 1 || count(t, b.Database(), "SELECT count(*) FROM execution_recovery_trees") != 0 {
				t.Fatal("migration fabricated runtime recovery or broke schema/FK")
			}
			matches, e := filepath.Glob(filepath.Join(loc, ".migration-v8-*", "manifest.json"))
			if e != nil || len(matches) != 1 {
				t.Fatalf("complete migration manifest: %v %v", matches, e)
			}
			data, e := os.ReadFile(matches[0])
			if e != nil {
				t.Fatal(e)
			}
			var m base.BackupManifest
			if e = json.Unmarshal(data, &m); e != nil {
				t.Fatal(e)
			}
			if m.SchemaVersion != 8 || len(m.Blobs) != len(cp) {
				t.Fatalf("incomplete migration CP set: %#v", m)
			}
			backupDB, e := sql.Open("sqlite3", filepath.Join(filepath.Dir(matches[0]), m.Database.Path))
			if e != nil {
				t.Fatal(e)
			}
			defer backupDB.Close()
			if !reflect.DeepEqual(before, oldRows(t, backupDB, columns(before))) {
				t.Fatal("backup did not retain complete old DB")
			}
			if !reflect.DeepEqual(cp, checkpointBytes(t, filepath.Dir(matches[0]))) {
				t.Fatal("backup cannot independently restore checkpoint bytes")
			}
			t.Logf("real v8 %s: old tables=%d all rows/columns unchanged; CP=%d full independent recovery set", name, len(before), len(cp))
		})
	}
}

func TestIncompleteOldCheckpointBackupCannotPartiallyApply016(t *testing.T) {
	root, loc := fixture(t, "inflight")
	beforeDB := db(t, loc)
	before := oldRows(t, beforeDB, nil)
	beforeDB.Close()
	entries, e := os.ReadDir(filepath.Join(loc, "checkpoints"))
	if e != nil || len(entries) != 1 {
		t.Fatal(e)
	}
	if e = os.Remove(filepath.Join(loc, "checkpoints", entries[0].Name())); e != nil {
		t.Fatal(e)
	}
	h, e := profile.Acquire(root, loc)
	if e != nil {
		t.Fatal(e)
	}
	defer h.Close()
	b, e := base.OpenWithBackup(ctx, h, func(c context.Context, d *sql.DB, dir string) ([]base.BackupBlob, error) {
		source, e := store.ReadOnlySource(h.Directory)
		if e != nil {
			return nil, e
		}
		return effects.CompleteMigrationBackup(c, d, source, dir)
	})
	if b != nil {
		b.Close()
	}
	if !reason(e, "PROFILE_BACKUP_FAILED") {
		t.Fatalf("missing CP backup accepted: %v", e)
	}
	after := db(t, loc)
	if count(t, after, "PRAGMA user_version") != 8 || !reflect.DeepEqual(before, oldRows(t, after, columns(before))) || count(t, after, "SELECT count(*) FROM sqlite_schema WHERE name='execution_recovery_trees'") != 0 {
		t.Fatal("failed full backup partially upgraded schema or facts")
	}
}

func Test016StatementFailureRollsBackPositionColumnAndRetainsCompleteOldRecoverySet(t *testing.T) {
	root, loc := fixture(t, "legacy_cp")
	d := db(t, loc)
	// Fault injection into a disposable real schema8 copy: a conflicting name
	// fails after ALTER TABLE, proving the entire migration is one transaction.
	if _, e := d.Exec("CREATE TABLE execution_recovery_trees(controlled_conflict TEXT)"); e != nil {
		t.Fatal(e)
	}
	before := oldRows(t, d, nil)
	d.Close()
	cp := checkpointBytes(t, loc)
	h, e := profile.Acquire(root, loc)
	if e != nil {
		t.Fatal(e)
	}
	defer h.Close()
	b, e := base.OpenWithBackup(ctx, h, func(c context.Context, d *sql.DB, dir string) ([]base.BackupBlob, error) {
		source, e := store.ReadOnlySource(h.Directory)
		if e != nil {
			return nil, e
		}
		return effects.CompleteMigrationBackup(c, d, source, dir)
	})
	if b != nil {
		b.Close()
	}
	if !reason(e, "PROFILE_MIGRATION_FAILED") {
		t.Fatalf("controlled DDL conflict not preserved: %v", e)
	}
	after := db(t, loc)
	if count(t, after, "PRAGMA user_version") != 8 || !reflect.DeepEqual(before, oldRows(t, after, columns(before))) || !reflect.DeepEqual(cp, checkpointBytes(t, loc)) || count(t, after, "SELECT count(*) FROM pragma_table_info('execution_runs') WHERE name='execution_position_json'") != 0 {
		t.Fatal("failed016 partially committed schema, old rows or CP changes")
	}
	matches, e := filepath.Glob(filepath.Join(loc, ".migration-v8-*", "manifest.json"))
	if e != nil || len(matches) != 1 {
		t.Fatal("failed migration lost complete pre-migration recovery set")
	}
}
