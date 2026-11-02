package assistant_test

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func schemaOne(t *testing.T) (string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	dir := filepath.Join(root, "old")
	if e := os.MkdirAll(dir, 0700); e != nil {
		t.Fatal(e)
	}
	path := filepath.Join(dir, "profile.sqlite3")
	db, e := sql.Open("sqlite3", path)
	if e != nil {
		t.Fatal(e)
	}
	_, e = db.Exec(migrations.Core + "; INSERT INTO profile_metadata VALUES(1,'profile:0123456789abcdef0123456789abcdef',7,11,'2026-10-25T00:00:00Z'); PRAGMA application_id=1213548629; PRAGMA user_version=1")
	if e != nil {
		t.Fatal(e)
	}
	if e = db.Close(); e != nil {
		t.Fatal(e)
	}
	if e = os.Chmod(path, 0600); e != nil {
		t.Fatal(e)
	}
	return root, dir
}
func TestSchemaOneBackupAtomicUpgradeAndFailureRecovery(t *testing.T) {
	for _, broken := range []bool{false, true} {
		t.Run(map[bool]string{false: "upgrade", true: "rollback"}[broken], func(t *testing.T) {
			root, dir := schemaOne(t)
			original := migrations.Ordered[1].SQL
			if broken {
				migrations.Ordered[1].SQL = "CREATE TABLE accidental_partial(value TEXT); INVALID SQL"
			}
			t.Cleanup(func() { migrations.Ordered[1].SQL = original })
			c, e := bootstrap.Open(ctx, root, dir)
			if broken {
				var f *api.Fault
				if !errors.As(e, &f) || f.Reason != "PROFILE_MIGRATION_FAILED" {
					t.Fatalf("migration not rejected %v", e)
				}
			} else {
				if e != nil {
					t.Fatal(e)
				}
				s, e := c.API.Service.Status(ctx, owner)
				if e != nil || s.Profile.ProfileID != "profile:0123456789abcdef0123456789abcdef" || s.Profile.CommandEpoch != "7" || s.Profile.Revision != "11" {
					t.Fatal("identity changed", s, e)
				}
				_ = c.Close()
			}
			backups, e := filepath.Glob(filepath.Join(dir, ".migration-v1-*", "profile.sqlite3"))
			if e != nil || len(backups) != 1 {
				t.Fatal("consistent backup missing", backups, e)
			}
			backup, e := sql.Open("sqlite3", backups[0])
			if e != nil {
				t.Fatal(e)
			}
			var version int
			var id, epoch, revision string
			if e = backup.QueryRow("PRAGMA user_version").Scan(&version); e != nil || version != 1 {
				t.Fatal("backup version", version, e)
			}
			if e = backup.QueryRow("SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM profile_metadata").Scan(&id, &epoch, &revision); e != nil || epoch != "7" || revision != "11" {
				t.Fatal("backup content", e)
			}
			_ = backup.Close()
			if broken {
				db, e := sql.Open("sqlite3", filepath.Join(dir, "profile.sqlite3"))
				if e != nil {
					t.Fatal(e)
				}
				var partial int
				if e = db.QueryRow("PRAGMA user_version").Scan(&version); e != nil || version != 1 {
					t.Fatal("failed migration changed version", version, e)
				}
				if e = db.QueryRow("SELECT count(*) FROM sqlite_schema WHERE name='accidental_partial'").Scan(&partial); e != nil || partial != 0 {
					t.Fatal("partial migration survived", e)
				}
				_ = db.Close()
				migrations.Ordered[1].SQL = original
				c, e = bootstrap.Open(ctx, root, dir)
				if e != nil {
					t.Fatal("failed profile cannot recover", e)
				}
				_ = c.Close()
			}
		})
	}
}
