package recovery_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("recovery-test", "owner", true)

type engine struct {
	run     func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume  func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
	inspect func(context.Context, api.CheckpointInspection) error
}

func (e engine) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	if e.run == nil {
		return api.EngineResult{}, fmt.Errorf("unexpected Engine.Run")
	}
	return e.run(c, i)
}
func (e engine) Resume(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	if e.resume == nil {
		return api.EngineResult{}, fmt.Errorf("unexpected Engine.Resume")
	}
	return e.resume(c, i)
}
func (e engine) InspectCheckpoint(c context.Context, i api.CheckpointInspection) error {
	if e.inspect == nil {
		return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "CONTROLLED_INSPECTOR_UNAVAILABLE"}
	}
	return e.inspect(c, i)
}

func copyTree(t *testing.T, source, destination string) {
	t.Helper()
	e := filepath.WalkDir(source, func(p string, d os.DirEntry, e error) error {
		if e != nil {
			return e
		}
		rel, e := filepath.Rel(source, p)
		if e != nil {
			return e
		}
		target := filepath.Join(destination, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0700)
		}
		if strings.HasSuffix(p, ".sqlite3-wal") || strings.HasSuffix(p, ".sqlite3-shm") {
			return fmt.Errorf("unexpected writable SQLite auxiliary file in immutable fixture: %s", p)
		}
		b, e := os.ReadFile(p)
		if e != nil {
			return e
		}
		return os.WriteFile(target, b, 0600)
	})
	if e != nil {
		t.Fatal(e)
	}
}
func fixture(t *testing.T, name string) (string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	copyTree(t, filepath.Join("testdata", "schema8", name), root)
	return root, filepath.Join(root, "one")
}
func open(t *testing.T, root, locator string, o bootstrap.Options) *bootstrap.Core {
	t.Helper()
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, o)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
	})
	return c
}
func fresh(t *testing.T, o bootstrap.Options) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	loc := filepath.Join(root, "one")
	return open(t, root, loc, o), root, loc
}
func meta(t *testing.T, c *bootstrap.Core, key, revision string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: revision}
}
func get(t *testing.T, c *bootstrap.Core, run string) api.Run {
	t.Helper()
	r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "query", "").ProfileID, ID: run})
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func wait(t *testing.T, c *bootstrap.Core, run, status string) api.Run {
	t.Helper()
	deadline := time.Now().Add(6 * time.Second)
	for {
		r := get(t, c, run)
		if r.Status == status {
			return r
		}
		if time.Now().After(deadline) {
			t.Fatalf("wait %s: %#v", status, r)
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func db(t *testing.T, loc string) *sql.DB {
	t.Helper()
	d, e := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { d.Close() })
	return d
}
func count(t *testing.T, d *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if e := d.QueryRow(q, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func reason(e error, want string) bool { var f *api.Fault; return errors.As(e, &f) && f.Reason == want }
func inspect(t *testing.T, c *bootstrap.Core, run string) api.RecoveryStatus {
	t.Helper()
	if c.API.Recovery == nil {
		t.Fatal("recovery not assembled")
	}
	s, e := c.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "inspect", "").ProfileID, ID: run})
	if e != nil {
		t.Fatal(e)
	}
	return s
}

func TestSchema8ActualInFlightResumeKeepsClaimedChildrenAndUsageUntilExplicitWholeTreeResume(t *testing.T) {
	root, loc := fixture(t, "inflight")
	var old struct {
		RootRunID, ModelRunID string
		ResumeDecision        api.ToolResult
		Checkpoint            api.CheckpointArtifact
	}
	b, e := os.ReadFile("testdata/schema8/inflight-resume-entered.json")
	if e != nil {
		t.Fatal(e)
	}
	if e = json.Unmarshal(b, &old); e != nil {
		t.Fatal(e)
	}
	var runs, resumes, inspections atomic.Int32
	done := make(chan error, 1)
	eng := engine{run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
		runs.Add(1)
		return api.EngineResult{}, fmt.Errorf("must not restart a Run")
	}, inspect: func(c context.Context, i api.CheckpointInspection) error {
		inspections.Add(1)
		if i.Memory != nil || i.ShortTerm != nil {
			return fmt.Errorf("legacy checkpoint acquired synthetic context")
		}
		body, e := io.ReadAll(i.Reader)
		if e != nil {
			return e
		}
		if len(body) != 64 || i.Run.ID != old.ModelRunID || i.Checkpoint != old.Checkpoint {
			return fmt.Errorf("wrong complete checkpoint inspection: %s", body)
		}
		return nil
	}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
		resumes.Add(1)
		if i.Input.Memory != nil || i.Input.ShortTerm != nil {
			return api.EngineResult{}, fmt.Errorf("legacy Resume acquired new-policy input")
		}
		var e error
		if i.Input.RunID != old.ModelRunID || !reflect.DeepEqual(i.Decision, old.ResumeDecision) {
			e = fmt.Errorf("original Resume decision/identity changed: %#v", i.Decision)
		}
		done <- e
		return api.EngineResult{Status: "finished", Text: "RECOVERED_ORIGINAL_MEMBER"}, e
	}}
	c := open(t, root, loc, bootstrap.Options{Engine: eng})
	s := inspect(t, c, old.ModelRunID)
	if s.State != "ready" || s.RootRunID != old.RootRunID || len(s.AffectedRunIDs) != 2 || !strings.HasPrefix(s.TreeRevision, "sha256:") {
		t.Fatalf("whole-tree qualification: %#v", s)
	}
	if runs.Load() != 0 || resumes.Load() != 0 || inspections.Load() == 0 {
		t.Fatal("inspection executed a model or skipped payload")
	}
	d := db(t, loc)
	if count(t, d, "SELECT count(*) FROM collaboration_parent_results WHERE run_id=? AND state='claimed'", old.ModelRunID) != 1 || count(t, d, "SELECT count(*) FROM collaboration_result_deliveries") != 1 {
		t.Fatal("startup replayed consumed child results")
	}
	if count(t, d, "SELECT count(*) FROM model_attempts WHERE state='settled' AND knowledge='unknown' AND charged_tokens=7 AND producer_ended=1") != 1 {
		t.Fatal("interrupted real dispatched usage was cleared or refunded")
	}
	command := api.RunResume{CommandMeta: meta(t, c, "resume-original", s.Revision), ID: old.ModelRunID, RecoveryGeneration: s.Generation}
	receipt, e := c.API.Recovery.Resume(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	command.CommandID = "transport-retry"
	replay, e := c.API.Recovery.Resume(ctx, owner, command)
	if e != nil || !reflect.DeepEqual(receipt, replay) {
		t.Fatalf("same original command replay: %#v %v", replay, e)
	}
	select {
	case e := <-done:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("original Resume never executed")
	}
	wait(t, c, old.RootRunID, "succeeded")
	if runs.Load() != 0 || resumes.Load() != 1 || count(t, d, "SELECT count(*) FROM execution_runs") != 3 || count(t, d, "SELECT count(*) FROM collaboration_result_deliveries") != 2 || count(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, d, "SELECT count(*) FROM task_config_pins") != 0 {
		t.Fatal("recovery duplicated work, result or failed terminal cleanup")
	}
	if count(t, d, "SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='delegation.completed'", old.ModelRunID) != 1 {
		t.Fatal("already consumed child result was redelivered")
	}
	t.Logf("same root=%s/member=%s; inspected=%d Run0 Resume1; original claimed result/unknown charge7 preserved", old.RootRunID, old.ModelRunID, inspections.Load())
}
