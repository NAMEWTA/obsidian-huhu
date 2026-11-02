package approval_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	blob "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	base "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	effects "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/effects"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// A deliberately older marker fails on existing tables, after a complete
// recovery set must have been published. Its CP remains readable after live GC.
func TestMigrationRecoverySetPreservesWholeCheckpointBeforeFailure(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, i)
	}}, time.Minute)
	if _, e := f.core.API.Conversation.StartRun(ctx, owner, f.command); e != nil {
		t.Fatal(e)
	}
	_ = waitApproval(t, f)
	if e := f.core.Close(); e != nil {
		t.Fatal(e)
	}
	d := db(t, f)
	var artifactJSON string
	if e := d.QueryRow("SELECT artifact_json FROM execution_checkpoints").Scan(&artifactJSON); e != nil {
		t.Fatal(e)
	}
	var a api.CheckpointArtifact
	if e := json.Unmarshal([]byte(artifactJSON), &a); e != nil {
		t.Fatal(e)
	}
	source := filepath.Join(f.locator, "checkpoints", strings.TrimPrefix(a.Ref, "cp:")+".cp")
	original, e := os.ReadFile(source)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = d.Exec("PRAGMA user_version=4"); e != nil {
		t.Fatal(e)
	}
	if e = d.Close(); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{ExecutorPaused: true})
	if e == nil {
		_ = c.Close()
		t.Fatal("fixture expected duplicate-table migration failure")
	}
	dirs, e := filepath.Glob(filepath.Join(f.locator, ".migration-v4-*"))
	if e != nil || len(dirs) != 1 {
		t.Fatalf("backup dirs %v %v", dirs, e)
	}
	manifest, e := os.ReadFile(filepath.Join(dirs[0], "manifest.json"))
	if e != nil {
		t.Fatalf("complete recovery manifest missing: %v", e)
	}
	var m struct {
		ProfileID    string `json:"profileId"`
		CommandEpoch string `json:"commandEpoch"`
		Blobs        []struct {
			Path     string                 `json:"path"`
			SHA256   string                 `json:"sha256"`
			Artifact api.CheckpointArtifact `json:"artifact"`
		} `json:"blobs"`
	}
	if e = json.Unmarshal(manifest, &m); e != nil || m.ProfileID != f.command.ProfileID || m.CommandEpoch != f.command.CommandEpoch || len(m.Blobs) != 1 {
		t.Fatalf("manifest %s %v", manifest, e)
	}
	saved, e := os.ReadFile(filepath.Join(dirs[0], m.Blobs[0].Path))
	if e != nil || string(saved) != string(original) || !strings.HasPrefix(string(saved), "HUHUCP1\n") {
		t.Fatalf("not full envelope %v", e)
	}
	h := sha256.Sum256(saved)
	if m.Blobs[0].SHA256 != "sha256:"+hex.EncodeToString(h[:]) {
		t.Fatal("whole-file hash mismatch")
	}
	live, e := blob.New(f.locator)
	if e != nil {
		t.Fatal(e)
	}
	if n, e := live.Collect(ctx, func(context.Context, string) (bool, error) { return false, nil }); e != nil || n != 1 {
		t.Fatalf("collect %d %v", n, e)
	}
	backup, e := blob.New(dirs[0])
	if e != nil {
		t.Fatal(e)
	}
	if e = backup.Verify(ctx, a); e != nil {
		t.Fatalf("recovery copy not independently readable after live GC: %v", e)
	}
}

func TestMigrationRecoverySetFailsClosedBeforeSchemaMutation(t *testing.T) {
	for _, mode := range []string{"missing", "corrupt", "manifest-publication", "no-completer"} {
		t.Run(mode, func(t *testing.T) {
			f := open(t, engine{run: func(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				return suspend(c, i)
			}}, time.Minute)
			if _, e := f.core.API.Conversation.StartRun(ctx, owner, f.command); e != nil {
				t.Fatal(e)
			}
			_ = waitApproval(t, f)
			if e := f.core.Close(); e != nil {
				t.Fatal(e)
			}
			d := db(t, f)
			var ref string
			if e := d.QueryRow("SELECT ref FROM execution_checkpoints").Scan(&ref); e != nil {
				t.Fatal(e)
			}
			if _, e := d.Exec("PRAGMA user_version=4"); e != nil {
				t.Fatal(e)
			}
			if e := d.Close(); e != nil {
				t.Fatal(e)
			}
			path := filepath.Join(f.locator, "checkpoints", strings.TrimPrefix(ref, "cp:")+".cp")
			if mode == "missing" {
				if e := os.Remove(path); e != nil {
					t.Fatal(e)
				}
			}
			if mode == "corrupt" {
				if e := os.WriteFile(path, []byte("HUHUCP1\ncorrupt"), 0600); e != nil {
					t.Fatal(e)
				}
			}
			before, e := os.ReadFile(filepath.Join(f.locator, profile.DatabaseName))
			if e != nil {
				t.Fatal(e)
			}
			handle, e := profile.Acquire(f.root, f.locator)
			if e != nil {
				t.Fatal(e)
			}
			defer handle.Close()
			var complete base.CompleteBackup
			if mode != "no-completer" {
				complete = func(c context.Context, snapshot *sql.DB, dir string) ([]base.BackupBlob, error) {
					source, e := blob.ReadOnlySource(f.locator)
					if e != nil {
						return nil, e
					}
					files, e := effects.CompleteMigrationBackup(c, snapshot, source, dir)
					if e != nil {
						return nil, e
					}
					if mode == "manifest-publication" {
						e = os.Mkdir(filepath.Join(dir, "manifest.json"), 0700)
					}
					return files, e
				}
			}
			store, e := base.OpenWithBackup(ctx, handle, complete)
			if store != nil {
				_ = store.Close()
				t.Fatal("migration accepted incomplete recovery set")
			}
			var fault *api.Fault
			if !errors.As(e, &fault) || fault.Reason != "PROFILE_BACKUP_FAILED" {
				t.Fatalf("wrong rejection %v", e)
			}
			after, e := os.ReadFile(filepath.Join(f.locator, profile.DatabaseName))
			if e != nil {
				t.Fatal(e)
			}
			if string(before) != string(after) {
				t.Fatal("failed backup mutated original database")
			}
			manifests, _ := filepath.Glob(filepath.Join(f.locator, ".migration-v4-*", "manifest.json"))
			for _, path := range manifests {
				info, e := os.Stat(path)
				if e != nil {
					t.Fatal(e)
				}
				if info.Mode().IsRegular() {
					t.Fatal("failed recovery set was published")
				}
			}
		})
	}
}
