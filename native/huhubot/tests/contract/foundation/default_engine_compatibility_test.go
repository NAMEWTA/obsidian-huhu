package foundation_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type legacyFixtureInspector struct{ inspected atomic.Int32 }

func (*legacyFixtureInspector) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("legacy fixture must not execute a new Run")
}
func (*legacyFixtureInspector) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("qualification must not execute Resume")
}
func (e *legacyFixtureInspector) InspectCheckpoint(_ context.Context, q api.CheckpointInspection) error {
	payload, err := io.ReadAll(q.Reader)
	if err != nil || len(payload) != 64 || q.Checkpoint.Metadata.EngineVersion != "huhu-engine-v1" {
		return fmt.Errorf("invalid controlled legacy checkpoint")
	}
	e.inspected.Add(1)
	return nil
}

func legacyFixtureHashes(t *testing.T, root string) map[string]string {
	t.Helper()
	out := map[string]string{}
	if err := filepath.WalkDir(root, func(path string, d os.DirEntry, e error) error {
		if e != nil || d.IsDir() {
			return e
		}
		data, e := os.ReadFile(path)
		if e != nil {
			return e
		}
		rel, e := filepath.Rel(root, path)
		if e != nil {
			return e
		}
		h := sha256.Sum256(data)
		out[rel] = hex.EncodeToString(h[:])
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	return out
}

// The input was produced by a real schema8 interrupted Resume and contains a
// complete HUHUCP1 artifact. Its old test-engine payload is not the new Chat CP.
func TestDefaultProductionEngineRejectsLegacyFakePayloadWhileExplicitInspectorRemainsUsable(t *testing.T) {
	source := filepath.Join("..", "recovery", "testdata", "schema8", "inflight", "one")
	before := legacyFixtureHashes(t, source)
	t.Cleanup(func() {
		if !reflect.DeepEqual(before, legacyFixtureHashes(t, source)) {
			t.Error("read-only historical fixture changed")
		}
	})
	var old struct{ ModelRunID string }
	data, e := os.ReadFile(filepath.Join("..", "recovery", "testdata", "schema8", "inflight-resume-entered.json"))
	if e != nil || json.Unmarshal(data, &old) != nil || old.ModelRunID == "" {
		t.Fatal("missing original interrupted identity", e)
	}
	for _, explicit := range []bool{false, true} {
		t.Run(fmt.Sprintf("explicit_legacy_inspector_%t", explicit), func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "profiles")
			loc := filepath.Join(root, "one")
			for name := range before {
				bytes, e := os.ReadFile(filepath.Join(source, name))
				if e != nil {
					t.Fatal(e)
				}
				path := filepath.Join(loc, name)
				if e = os.MkdirAll(filepath.Dir(path), 0700); e != nil {
					t.Fatal(e)
				}
				if e = os.WriteFile(path, bytes, 0600); e != nil {
					t.Fatal(e)
				}
			}
			checkpointBefore := legacyFixtureHashes(t, filepath.Join(loc, "checkpoints"))
			options := bootstrap.Options{ExecutorPaused: true}
			inspector := &legacyFixtureInspector{}
			if explicit {
				options.Engine = inspector
			}
			core, e := bootstrap.OpenWithOptions(context.Background(), root, loc, options)
			if e != nil {
				t.Fatal(e)
			}
			t.Cleanup(func() {
				_ = core.RequestStop()
				bounded, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if e := core.WaitClosed(bounded); e != nil {
					t.Error(e)
				}
			})
			id := api.NewConnectionIdentity("default-compatibility", "owner", true)
			status, e := core.API.Service.Status(context.Background(), id)
			if e != nil {
				t.Fatal(e)
			}
			recovery, e := core.API.Recovery.Get(context.Background(), id, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: old.ModelRunID})
			if e != nil {
				t.Fatal(e)
			}
			if explicit {
				if recovery.State != "ready" || inspector.inspected.Load() == 0 {
					t.Fatal("explicit controlled legacy inspector lost its original compatibility", recovery)
				}
			} else if recovery.State != "blocked" || recovery.Reason != "CHECKPOINT_INCOMPATIBLE" {
				t.Fatal("production Chat accepted an old fake checkpoint", recovery)
			}
			db, e := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			var runs, attempts, oldCharge int
			if e = db.QueryRow("SELECT count(*) FROM execution_runs").Scan(&runs); e != nil || runs != 3 {
				t.Fatal("qualification created work", runs, e)
			}
			if e = db.QueryRow("SELECT count(*),COALESCE(sum(charged_tokens),0) FROM model_attempts").Scan(&attempts, &oldCharge); e != nil || attempts != 1 || oldCharge != 7 {
				t.Fatal("qualification dispatched or cleared original unknown usage", attempts, oldCharge, e)
			}
			if !reflect.DeepEqual(checkpointBefore, legacyFixtureHashes(t, filepath.Join(loc, "checkpoints"))) {
				t.Fatal("qualification modified the original complete artifact")
			}
		})
	}
}
