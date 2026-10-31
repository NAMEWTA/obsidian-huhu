package lead_migration_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	blob "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/effects"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	_ "github.com/ncruces/go-sqlite3/driver"
)

var leadContext = context.Background()

type oldFixture struct {
	ProfileID string                 `json:"profileId"`
	RunID     string                 `json:"runId"`
	RunStatus string                 `json:"runStatusBeforeClose"`
	Artifact  api.CheckpointArtifact `json:"artifact"`
	Files     map[string]string      `json:"files"`
}

func digest(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func mustRead(t *testing.T, path string) []byte {
	t.Helper()
	b, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	return b
}
func cloneFixture(t *testing.T, mode string) (string, string, oldFixture) {
	t.Helper()
	from := os.Getenv("LEAD_V5_FIXTURES")
	if from == "" {
		t.Fatal("LEAD_V5_FIXTURES is required")
	}
	var f oldFixture
	if e := json.Unmarshal(mustRead(t, filepath.Join(from, mode, "fixture.json")), &f); e != nil {
		t.Fatal(e)
	}
	root := filepath.Join(t.TempDir(), "profiles")
	locator := filepath.Join(root, "one")
	if e := os.MkdirAll(locator, 0700); e != nil {
		t.Fatal(e)
	}
	for name, want := range f.Files {
		if name != "profile.sqlite3" && !strings.HasPrefix(name, "checkpoints/") {
			t.Fatal("unexpected fixture path", name)
		}
		b := mustRead(t, filepath.Join(from, mode, "one", name))
		if digest(b) != want {
			t.Fatal("old fixture drift", name)
		}
		to := filepath.Join(locator, name)
		if e := os.MkdirAll(filepath.Dir(to), 0700); e != nil {
			t.Fatal(e)
		}
		if e := os.WriteFile(to, b, 0600); e != nil {
			t.Fatal(e)
		}
	}
	return root, locator, f
}
func queryVersion(t *testing.T, path string) int {
	t.Helper()
	u := url.URL{Scheme: "file", Path: path}
	q := u.Query()
	q.Set("mode", "ro")
	q.Set("immutable", "1")
	u.RawQuery = q.Encode()
	db, e := sql.Open("sqlite3", u.String())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	var n int
	if e = db.QueryRow("PRAGMA user_version").Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func backupFiles(t *testing.T, locator string) []string {
	t.Helper()
	matches, e := filepath.Glob(filepath.Join(locator, ".migration-v5-*", "manifest.json"))
	if e != nil {
		t.Fatal(e)
	}
	out := []string{}
	for _, p := range matches {
		info, e := os.Stat(p)
		if e != nil {
			t.Fatal(e)
		}
		if info.Mode().IsRegular() {
			out = append(out, p)
		}
	}
	return out
}
func expectBackupFailure(t *testing.T, err error, locator string) {
	t.Helper()
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Reason != "PROFILE_BACKUP_FAILED" {
		t.Fatalf("expected fail-closed backup error, got %v", err)
	}
	if queryVersion(t, filepath.Join(locator, "profile.sqlite3")) != 5 {
		t.Fatal("failed backup still migrated")
	}
	if len(backupFiles(t, locator)) != 0 {
		t.Fatal("failed backup published a completed manifest")
	}
}

func TestLeadRealVersionFiveUpgradeKeepsFullIndependentCheckpointSet(t *testing.T) {
	for _, mode := range []string{"waiting", "terminal"} {
		t.Run(mode, func(t *testing.T) {
			root, locator, f := cloneFixture(t, mode)
			lowerCurrent := api.ExecutionLimits{MaxDepth: 1, MaxChildren: 2, RootChildren: 1, ProfileChildren: 2, MaxWakes: 1}
			core, e := bootstrap.OpenWithOptions(leadContext, root, locator, bootstrap.Options{ExecutorPaused: true, ExecutionLimits: lowerCurrent})
			if e != nil {
				t.Fatal(e)
			}
			legacyRun, e := core.API.Conversation.GetRun(leadContext, api.NewConnectionIdentity("lead-upgrade", "owner", false), api.IDQuery{ProfileID: f.ProfileID, ID: f.RunID})
			fixedCompatibility := api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 4, ProfileChildren: 8, MaxWakes: 8}
			if e != nil || legacyRun.Limits == nil || *legacyRun.Limits != fixedCompatibility {
				_ = core.Close()
				t.Fatalf("v5 root must gain the fixed migration compatibility policy, not current Options: %#v %v", legacyRun, e)
			}
			if e = core.Close(); e != nil {
				t.Fatal(e)
			}
			if got := queryVersion(t, filepath.Join(locator, "profile.sqlite3")); got != migrations.CurrentVersion || got <= 5 {
				t.Fatalf("schema=%d current=%d", got, migrations.CurrentVersion)
			}
			manifests := backupFiles(t, locator)
			if len(manifests) != 1 {
				t.Fatalf("manifests %v", manifests)
			}
			var m base.BackupManifest
			if e = json.Unmarshal(mustRead(t, manifests[0]), &m); e != nil {
				t.Fatal(e)
			}
			dir := filepath.Dir(manifests[0])
			if m.Format != "huhu-migration-recovery-v1" || m.SchemaVersion != 5 || m.ProfileID != f.ProfileID || m.CommandEpoch == "" || m.ApplicationID != migrations.ApplicationID || len(m.Blobs) != 1 {
				t.Fatalf("incomplete manifest %#v", m)
			}
			dbBytes := mustRead(t, filepath.Join(dir, m.Database.Path))
			if int64(len(dbBytes)) != m.Database.Size || "sha256:"+digest(dbBytes) != m.Database.SHA256 {
				t.Fatal("database manifest checksum")
			}
			if queryVersion(t, filepath.Join(dir, m.Database.Path)) != 5 {
				t.Fatal("recovery copy has wrong schema")
			}
			b := m.Blobs[0]
			if b.Artifact != f.Artifact || !strings.HasPrefix(b.Path, "checkpoints/") {
				t.Fatalf("checkpoint identity %#v", b)
			}
			encoded := mustRead(t, filepath.Join(dir, b.Path))
			if int64(len(encoded)) != b.Size || "sha256:"+digest(encoded) != b.SHA256 || digest(encoded) != f.Files[b.Path] {
				t.Fatal("not the original complete HUHUCP1 envelope")
			}
			live, liveErr := os.Stat(filepath.Join(locator, b.Path))
			saved, e := os.Stat(filepath.Join(dir, b.Path))
			if e != nil {
				t.Fatal(e)
			}
			if liveErr == nil && os.SameFile(live, saved) {
				t.Fatal("backup is a live hardlink")
			}
			if e = os.Remove(filepath.Join(locator, b.Path)); e != nil && !os.IsNotExist(e) {
				t.Fatal(e)
			}
			if digest(mustRead(t, filepath.Join(dir, b.Path))) != f.Files[b.Path] {
				t.Fatal("live removal destroyed backup")
			}
			// Restore the actual DB and encoded checkpoint into another isolated Profile.
			restoreRoot := filepath.Join(t.TempDir(), "restored-profiles")
			restore := filepath.Join(restoreRoot, "one")
			if e = os.MkdirAll(filepath.Join(restore, "checkpoints"), 0700); e != nil {
				t.Fatal(e)
			}
			if e = os.WriteFile(filepath.Join(restore, "profile.sqlite3"), dbBytes, 0600); e != nil {
				t.Fatal(e)
			}
			if e = os.WriteFile(filepath.Join(restore, b.Path), encoded, 0600); e != nil {
				t.Fatal(e)
			}
			store, e := blob.New(restore)
			if e != nil {
				t.Fatal(e)
			}
			r, e := store.Open(leadContext, b.Artifact)
			if e != nil {
				t.Fatal(e)
			}
			body, e := io.ReadAll(r)
			ce := r.Close()
			if e != nil || ce != nil || int64(len(body)) != b.Artifact.Size {
				t.Fatalf("restore CP read %v %v", e, ce)
			}
			restored, e := bootstrap.OpenWithOptions(leadContext, restoreRoot, restore, bootstrap.Options{ExecutorPaused: true})
			if e != nil {
				t.Fatal(e)
			}
			status, e := restored.API.Service.Status(leadContext, api.NewConnectionIdentity("lead-restore", "owner", false))
			closeErr := restored.Close()
			if e != nil || closeErr != nil || status.Profile.ProfileID != f.ProfileID {
				t.Fatalf("restore identity %v %v %#v", e, closeErr, status.Profile)
			}
			t.Logf("mode=%s schema=5->%d originalEnvelope=%s size=%d independent restore passed", mode, migrations.CurrentVersion, b.SHA256, b.Size)
		})
	}
}

func TestLeadMissingOrCorruptCheckpointStopsBeforeMigration(t *testing.T) {
	for _, mode := range []string{"waiting", "terminal"} {
		for _, damage := range []string{"missing", "corrupt"} {
			t.Run(mode+"/"+damage, func(t *testing.T) {
				root, locator, f := cloneFixture(t, mode)
				name := "checkpoints/" + strings.TrimPrefix(f.Artifact.Ref, "cp:") + ".cp"
				path := filepath.Join(locator, name)
				if damage == "missing" {
					if e := os.Remove(path); e != nil {
						t.Fatal(e)
					}
				} else {
					b := mustRead(t, path)
					b[len(b)-1] ^= 1
					if e := os.WriteFile(path, b, 0600); e != nil {
						t.Fatal(e)
					}
				}
				core, e := bootstrap.OpenWithOptions(leadContext, root, locator, bootstrap.Options{ExecutorPaused: true})
				if core != nil {
					_ = core.Close()
				}
				expectBackupFailure(t, e, locator)
			})
		}
	}
}

func TestLeadManifestPublicationFailureAndDBOnlyFallbackAreFailClosed(t *testing.T) {
	for _, mode := range []string{"manifest-failure", "missing-completer"} {
		t.Run(mode, func(t *testing.T) {
			root, locator, _ := cloneFixture(t, "terminal")
			h, e := profile.Acquire(root, locator)
			if e != nil {
				t.Fatal(e)
			}
			var complete base.CompleteBackup
			if mode == "manifest-failure" {
				complete = func(ctx context.Context, db *sql.DB, dir string) ([]base.BackupBlob, error) {
					store, e := blob.New(locator)
					if e != nil {
						return nil, e
					}
					items, e := effects.CompleteMigrationBackup(ctx, db, store, dir)
					if e != nil {
						return nil, e
					}
					if e = os.Mkdir(filepath.Join(dir, "manifest.json"), 0700); e != nil {
						return nil, e
					}
					return items, nil
				}
			}
			s, e := base.OpenWithBackup(leadContext, h, complete)
			if s != nil {
				_ = s.Close()
			}
			if ce := h.Close(); ce != nil {
				t.Fatal(ce)
			}
			expectBackupFailure(t, e, locator)
		})
	}
}
