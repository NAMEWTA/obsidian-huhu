package migration_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	_ "github.com/ncruces/go-sqlite3/driver"
)

var ctx = context.Background()

func makeProfile(t *testing.T, mode string) (string, string, []byte) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	dir := filepath.Join(root, "one")
	if err := os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	dbPath := filepath.Join(dir, profile.DatabaseName)
	var data []byte
	switch mode {
	case "v1":
		db, err := sql.Open("sqlite3", dbPath)
		if err != nil {
			t.Fatal(err)
		}
		_, err = db.Exec(migrations.Core + "; INSERT INTO profile_metadata VALUES(1,'profile:migration-test',7,11,'2026-10-25T00:00:00Z'); PRAGMA application_id=1213548629; PRAGMA user_version=1")
		if err != nil {
			db.Close()
			t.Fatal(err)
		}
		if err = db.Close(); err != nil {
			t.Fatal(err)
		}
	case "future":
		db, err := sql.Open("sqlite3", dbPath)
		if err != nil {
			t.Fatal(err)
		}
		_, err = db.Exec(migrations.Core + "; INSERT INTO profile_metadata VALUES(1,'profile:migration-test',7,11,'2026-10-25T00:00:00Z'); PRAGMA application_id=1213548629; PRAGMA user_version=999")
		if err != nil {
			db.Close()
			t.Fatal(err)
		}
		if err = db.Close(); err != nil {
			t.Fatal(err)
		}
	case "bad-app":
		db, err := sql.Open("sqlite3", dbPath)
		if err != nil {
			t.Fatal(err)
		}
		_, err = db.Exec(migrations.Core + "; INSERT INTO profile_metadata VALUES(1,'profile:migration-test',7,11,'2026-10-25T00:00:00Z'); PRAGMA application_id=305419896; PRAGMA user_version=1")
		if err != nil {
			db.Close()
			t.Fatal(err)
		}
		if err = db.Close(); err != nil {
			t.Fatal(err)
		}
	case "corrupt":
		if err := os.WriteFile(dbPath, []byte("not a sqlite database"), 0600); err != nil {
			t.Fatal(err)
		}
	case "empty":
		f, err := os.OpenFile(dbPath, os.O_CREATE|os.O_WRONLY, 0600)
		if err != nil {
			t.Fatal(err)
		}
		if err = f.Close(); err != nil {
			t.Fatal(err)
		}
	default:
		t.Fatalf("unknown fixture %q", mode)
	}
	if err := os.Chmod(dbPath, 0600); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	return root, dir, data
}

func faultReason(err error) string {
	var f *api.Fault
	if errors.As(err, &f) {
		return f.Reason
	}
	return ""
}

func TestSchemaUpgradePublishesRecoverableDatabaseSnapshot(t *testing.T) {
	root, dir, before := makeProfile(t, "v1")
	h, err := profile.Acquire(root, dir)
	if err != nil {
		t.Fatal(err)
	}
	s, err := base.Open(ctx, h)
	if err != nil {
		h.Close()
		t.Fatal(err)
	}
	if err = s.Close(); err != nil {
		t.Fatal(err)
	}
	if err = h.Close(); err != nil {
		t.Fatal(err)
	}

	manifestPaths, err := filepath.Glob(filepath.Join(dir, ".migration-v1-*", "manifest.json"))
	if err != nil || len(manifestPaths) != 1 {
		t.Fatalf("expected one published recovery manifest, paths=%v err=%v", manifestPaths, err)
	}
	manifestBytes, err := os.ReadFile(manifestPaths[0])
	if err != nil {
		t.Fatal(err)
	}
	var manifest base.BackupManifest
	if err = json.Unmarshal(manifestBytes, &manifest); err != nil {
		t.Fatal(err)
	}
	if manifest.Format != "huhu-migration-recovery-v1" || manifest.SchemaVersion != 1 || manifest.ApplicationID != migrations.ApplicationID || manifest.ProfileID != "profile:migration-test" || manifest.CommandEpoch != "7" {
		t.Fatalf("manifest metadata drifted: %#v", manifest)
	}
	backupPath := filepath.Join(filepath.Dir(manifestPaths[0]), manifest.Database.Path)
	backupBytes, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatal(err)
	}
	hash := sha256.Sum256(backupBytes)
	if manifest.Database.Size != int64(len(backupBytes)) || manifest.Database.SHA256 != "sha256:"+hex.EncodeToString(hash[:]) {
		t.Fatalf("backup hash mismatch: %#v", manifest.Database)
	}
	backupDB, err := sql.Open("sqlite3", backupPath)
	if err != nil {
		t.Fatal(err)
	}
	defer backupDB.Close()
	var version int
	if err = backupDB.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version != 1 {
		t.Fatalf("backup schema version=%d err=%v", version, err)
	}
	if len(before) == 0 || len(backupBytes) == 0 {
		t.Fatal("recovery copy is empty")
	}
	current, err := sql.Open("sqlite3", filepath.Join(dir, profile.DatabaseName))
	if err != nil {
		t.Fatal(err)
	}
	defer current.Close()
	if err = current.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version != migrations.CurrentVersion {
		t.Fatalf("live schema version=%d err=%v", version, err)
	}
	var profileID, epoch, revision string
	if err = backupDB.QueryRow("SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&profileID, &epoch, &revision); err != nil || profileID != "profile:migration-test" || epoch != "7" || revision != "11" {
		t.Fatalf("backup metadata drifted: id=%q epoch=%q revision=%q err=%v", profileID, epoch, revision, err)
	}
}

func TestIncompatibleOrInvalidProfileIsRejectedWithoutInitialization(t *testing.T) {
	for _, mode := range []string{"future", "bad-app", "corrupt", "empty"} {
		t.Run(mode, func(t *testing.T) {
			root, dir, before := makeProfile(t, mode)
			h, err := profile.Acquire(root, dir)
			if err != nil {
				t.Fatal(err)
			}
			s, err := base.Open(ctx, h)
			if s != nil {
				s.Close()
			}
			h.Close()
			want := "PROFILE_DB_CORRUPT"
			if mode == "empty" {
				want = "PROFILE_DB_EMPTY"
			}
			if mode == "future" || mode == "bad-app" {
				want = "PROFILE_SCHEMA_INCOMPATIBLE"
			}
			if got := faultReason(err); got != want {
				t.Fatalf("reason=%q want=%q err=%v", got, want, err)
			}
			after, readErr := os.ReadFile(filepath.Join(dir, profile.DatabaseName))
			if readErr != nil {
				t.Fatal(readErr)
			}
			if !equalBytes(before, after) {
				t.Fatal("rejected profile was overwritten or initialized")
			}
		})
	}
}

func equalBytes(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
