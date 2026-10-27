package approval_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	blobstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func finished(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{Status: "finished", Text: "continued"}, nil
}
func decide(t *testing.T, f *fixture, a api.Approval, decision string) error {
	t.Helper()
	_, e := f.core.API.Approvals.Resolve(ctx, owner, api.ApprovalResolve{CommandMeta: meta(t, f.core, "decision-"+decision, a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: decision, PreviewHash: a.Preview.PreviewHash})
	return e
}
func cancelRun(t *testing.T, f *fixture, runID string) {
	t.Helper()
	r, e := f.core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: runID})
	if e != nil {
		t.Fatal(e)
	}
	command := api.RunCancel{CommandMeta: meta(t, f.core, "cancel", r.Revision), ID: runID}
	first, e := f.core.API.Approvals.Cancel(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	command.CommandID = "cancel-next-attempt"
	again, e := f.core.API.Approvals.Cancel(ctx, owner, command)
	if e != nil || again.ReceiptID != first.ReceiptID {
		t.Fatal("cancel intent replay", again, e)
	}
}

func TestWholeRunGateClosesForParallelAndSequentialTools(t *testing.T) {
	for _, parallel := range []bool{false, true} {
		t.Run(map[bool]string{false: "sequential", true: "parallel"}[parallel], func(t *testing.T) {
			results := make(chan api.ToolResult, 2)
			f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				invoke := func(id string) {
					r, e := in.Tools.Invoke(c, api.ToolCall{ID: id, Name: "note.write", Target: target(), Content: "new"})
					if e != nil {
						results <- api.ToolResult{Status: "error", Reason: e.Error()}
						return
					}
					results <- r
				}
				if parallel {
					var wg sync.WaitGroup
					for _, id := range []string{"first", "second"} {
						wg.Add(1)
						go func(id string) { defer wg.Done(); invoke(id) }(id)
					}
					wg.Wait()
				} else {
					invoke("first")
					invoke("second")
				}
				var token string
				accepted, denied := 0, 0
				for i := 0; i < 2; i++ {
					r := <-results
					if r.Status == "approval_required" {
						accepted++
						token = r.SuspensionToken
					}
					if r.Status == "denied" && r.Reason == "EFFECT_ADMISSION_CLOSED" {
						denied++
					}
				}
				if accepted != 1 || denied != 1 {
					return api.EngineResult{}, api.Invalid("FIXTURE_GATE_OPEN")
				}
				a, e := in.Checkpoints.Publish(c, bytes.NewBufferString("two-tools"))
				if e != nil {
					return api.EngineResult{}, e
				}
				return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: token, Checkpoint: a}}, nil
			}, resume: finished}, time.Minute)
			r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			waitRun(t, f, r.RunID, "waiting_approval")
			a := waitApproval(t, f)
			if count(t, db(t, f), "SELECT count(*) FROM execution_effects") != 1 || f.writer.count() != 0 {
				t.Fatal("multiple pending effects or early dispatch")
			}
			if e = decide(t, f, a, "reject"); e != nil {
				t.Fatal(e)
			}
			waitRun(t, f, r.RunID, "succeeded")
		})
	}
}

func TestCheckpointPublicationRollsBackEveryDatabaseBoundary(t *testing.T) {
	triggers := map[string]string{
		"checkpoint": "CREATE TRIGGER fail_publish BEFORE INSERT ON execution_checkpoints BEGIN SELECT RAISE(ABORT,'publication checkpoint fault'); END",
		"approval":   "CREATE TRIGGER fail_publish BEFORE INSERT ON access_approvals BEGIN SELECT RAISE(ABORT,'publication approval fault'); END",
		"effect":     "CREATE TRIGGER fail_publish BEFORE UPDATE OF state ON execution_effects WHEN NEW.state='awaiting_approval' BEGIN SELECT RAISE(ABORT,'publication effect fault'); END",
		"run":        "CREATE TRIGGER fail_publish BEFORE UPDATE OF status ON execution_runs WHEN NEW.status='waiting_approval' BEGIN SELECT RAISE(ABORT,'publication run fault'); END",
		"event":      "CREATE TRIGGER fail_publish BEFORE INSERT ON execution_events WHEN NEW.event_type='waiting_approval' BEGIN SELECT RAISE(ABORT,'publication event fault'); END",
	}
	for name, trigger := range triggers {
		t.Run(name, func(t *testing.T) {
			ready, release := make(chan struct{}), make(chan struct{})
			f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				r, e := suspend(c, in)
				close(ready)
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				return r, e
			}, resume: finished}, time.Minute)
			r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			select {
			case <-ready:
			case <-time.After(time.Second):
				t.Fatal("engine did not publish file")
			}
			d := db(t, f)
			if _, e = d.Exec(trigger); e != nil {
				t.Fatal(e)
			}
			close(release)
			run := waitRun(t, f, r.RunID, "failed")
			if run.Reason != "CHECKPOINT_PUBLICATION_FAILED" {
				t.Fatal(run)
			}
			for _, table := range []string{"access_approvals", "execution_checkpoints", "execution_continuations"} {
				if count(t, d, "SELECT count(*) FROM "+table) != 0 {
					t.Fatal("partial publication", table)
				}
			}
			if count(t, d, "SELECT count(*) FROM execution_events WHERE event_type IN ('waiting_approval','approval.pending')") != 0 || count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 0 || f.writer.count() != 0 {
				t.Fatal("partial pending or unreleased terminal")
			}
			if e = f.core.Close(); e != nil {
				t.Fatal(e)
			}
			files, e := filepath.Glob(filepath.Join(f.locator, "checkpoints", "*.cp"))
			if e != nil || len(files) != 0 {
				t.Fatal("unreferenced checkpoint GC", files, e)
			}
		})
	}
}

func TestUnverifiedEngineSuspensionNeverPublishesApproval(t *testing.T) {
	for _, mode := range []string{"bare-ref", "digest", "metadata", "ownership"} {
		t.Run(mode, func(t *testing.T) {
			f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				if mode == "bare-ref" {
					return api.EngineResult{Status: "suspended", CheckpointRef: "cp:unverified"}, nil
				}
				r, e := suspend(c, in)
				if e != nil {
					return r, e
				}
				switch mode {
				case "digest":
					r.Suspension.Checkpoint.Digest = "sha256:" + strings.Repeat("0", 64)
				case "metadata":
					r.Suspension.Checkpoint.Metadata.EngineVersion = "other"
				case "ownership":
					r.Suspension.Checkpoint.AttemptID = "other"
				}
				return r, nil
			}, resume: finished}, time.Minute)
			r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			waitRun(t, f, r.RunID, "failed")
			d := db(t, f)
			if count(t, d, "SELECT count(*) FROM access_approvals") != 0 || count(t, d, "SELECT count(*) FROM execution_checkpoints") != 0 || f.writer.count() != 0 {
				t.Fatal("unverified suspension published")
			}
		})
	}
}

func TestApprovedContinuationChecksTargetAndLeaseAgain(t *testing.T) {
	for _, change := range []string{"target", "capability", "expiry", "cancel"} {
		t.Run(change, func(t *testing.T) {
			var resumes atomic.Int32
			f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				return suspend(c, in)
			}, resume: func(c context.Context, in api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
				resumes.Add(1)
				return finished(c, in, s)
			}}, time.Minute)
			f.writer.checkEntered = make(chan struct{}, 1)
			f.writer.checkRelease = make(chan struct{})
			r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			a := waitApproval(t, f)
			if e = decide(t, f, a, "approve"); e != nil {
				t.Fatal(e)
			}
			select {
			case <-f.writer.checkEntered:
			case <-time.After(time.Second):
				t.Fatal("no trusted target recheck")
			}
			switch change {
			case "target":
				f.writer.mu.Lock()
				f.writer.revision = "3"
				f.writer.mu.Unlock()
			case "capability":
				_, e = f.core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read"}}, host{})
				if e != nil {
					t.Fatal(e)
				}
			case "expiry":
				if _, e = db(t, f).Exec("UPDATE access_approvals SET expires_at=?", time.Now().Add(-time.Second).UTC().Format(time.RFC3339Nano)); e != nil {
					t.Fatal(e)
				}
			case "cancel":
				cancelRun(t, f, r.RunID)
			}
			close(f.writer.checkRelease)
			status := "succeeded"
			if change == "cancel" {
				status = "canceled"
			}
			waitRun(t, f, r.RunID, status)
			if e = f.core.Close(); e != nil {
				t.Fatal(e)
			}
			if f.writer.count() != 0 {
				t.Fatal("stale approval dispatched")
			}
			if change == "cancel" && resumes.Load() != 0 {
				t.Fatal("canceled Run resumed")
			}
		})
	}
}

func TestWaitingCancelIsDurableAndDoesNotResume(t *testing.T) {
	var resumes atomic.Int32
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: func(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		resumes.Add(1)
		return api.EngineResult{Status: "finished"}, nil
	}}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	cancelRun(t, f, r.RunID)
	if e = decide(t, f, a, "approve"); e == nil {
		t.Fatal("late approval won over cancel")
	}
	if e = f.core.Close(); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{Engine: engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		resumes.Add(100)
		return api.EngineResult{}, nil
	}, resume: finished}})
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	f.core = c
	waitRun(t, f, r.RunID, "canceled")
	if resumes.Load() != 0 || f.writer.count() != 0 || count(t, db(t, f), "SELECT count(*) FROM config_snapshot_pins") != 0 {
		t.Fatal("cancel resurrected work or retained pin")
	}
}

func TestCheckpointIntegrityAndInFlightGC(t *testing.T) {
	root := t.TempDir()
	s, e := blobstore.New(root)
	if e != nil {
		t.Fatal(e)
	}
	metadata := api.CheckpointMetadata{EngineVersion: "engine-v1", FormatVersion: "1", DefinitionDigest: "sha256:" + strings.Repeat("a", 64)}
	a, release, e := s.Publish(ctx, "run:one", "attempt:one", metadata, bytes.NewBufferString("checkpoint bytes"))
	if e != nil {
		t.Fatal(e)
	}
	path := filepath.Join(root, "checkpoints", strings.TrimPrefix(a.Ref, "cp:")+".cp")
	if n, e := s.Collect(ctx, func(context.Context, string) (bool, error) {
		t.Error("in-flight file consulted stale DB view")
		return false, nil
	}); e != nil || n != 0 {
		t.Fatal(n, e)
	}
	release()
	if n, e := s.Collect(ctx, func(context.Context, string) (bool, error) { return true, nil }); e != nil || n != 0 {
		t.Fatal(n, e)
	}
	r, e := s.Open(ctx, a)
	if e != nil {
		t.Fatal(e)
	}
	if n, e := s.Collect(ctx, func(context.Context, string) (bool, error) { return false, nil }); e != nil || n != 0 {
		t.Fatal("reader lease", n, e)
	}
	b, e := io.ReadAll(r)
	if e != nil || string(b) != "checkpoint bytes" {
		t.Fatal(string(b), e)
	}
	_ = r.Close()
	encoded, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	encoded[len(encoded)-1] ^= 1
	if e = os.WriteFile(path, encoded, 0600); e != nil {
		t.Fatal(e)
	}
	if e = s.Verify(ctx, a); e == nil {
		t.Fatal("corrupt checkpoint accepted")
	}
	if n, e := s.Collect(ctx, func(context.Context, string) (bool, error) { return false, errors.New("DB failed") }); e == nil || n != 0 {
		t.Fatal("GC deleted on unknown reference status", n, e)
	}
	if _, e = os.Stat(path); e != nil {
		t.Fatal(e)
	}
	if n, e := s.Collect(ctx, func(context.Context, string) (bool, error) { return false, nil }); e != nil || n != 1 {
		t.Fatal(n, e)
	}
	for _, input := range []io.Reader{bytes.NewReader(nil), strings.NewReader(strings.Repeat("x", blobstore.MaxCheckpointBytes+1)), io.MultiReader(strings.NewReader("partial"), errorReader{})} {
		if _, release, e = s.Publish(ctx, "run:one", "attempt:one", metadata, input); e == nil {
			release()
			t.Fatal("invalid/incomplete CP published")
		}
	}
	if _, _, e = s.Publish(ctx, "run:one", "attempt:one", metadata, nil); e == nil {
		t.Fatal("nil CP published")
	}
	if files, _ := filepath.Glob(filepath.Join(root, "checkpoints", "*")); len(files) != 0 {
		t.Fatal("partial files leaked", files)
	}
}

type errorReader struct{}

func (errorReader) Read([]byte) (int, error) { return 0, errors.New("reader interrupted") }

func TestEngineCannotForgeRunOrBrokerFacts(t *testing.T) {
	streamed, release := make(chan struct{}), make(chan struct{})
	f := open(t, engine{run: func(c context.Context, _ api.EngineInput, emit func(api.EngineEvent) error) (api.EngineResult, error) {
		for _, typ := range []string{"waiting_approval", "canceled", "succeeded", "approval.pending", "effect.committed", "run.canceled"} {
			var fault *api.Fault
			if e := emit(api.EngineEvent{Type: typ, Text: "forged"}); !errors.As(e, &fault) || fault.Reason != "RESERVED_ENGINE_EVENT" {
				return api.EngineResult{}, api.Invalid("FIXTURE_FORGED_EVENT_ACCEPTED")
			}
		}
		for _, alias := range []string{"text", "delta", "token", "text.delta", "chunk", "text-delta"} {
			if e := emit(api.EngineEvent{Type: alias, Text: alias + ":"}); e != nil {
				return api.EngineResult{}, e
			}
		}
		close(streamed)
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "honest stream"}, nil
	}, resume: finished}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-streamed:
	case <-time.After(time.Second):
		t.Fatal("no text events")
	}
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM execution_events WHERE body_json LIKE '%forged%'") != 0 || count(t, d, "SELECT count(*) FROM execution_events WHERE event_type='text.delta'") != 2 {
		t.Fatal("engine forged transactional lifecycle")
	}
	page, e := f.core.API.Events.Tail(ctx, owner, api.EventTailQuery{ProfileID: f.command.ProfileID, RunID: r.RunID, Limit: 128})
	if e != nil {
		t.Fatal(e)
	}
	stream := ""
	for _, event := range page.Events {
		if event.Text != "" {
			stream += event.Text
		}
		if event.Type == "text-delta" {
			t.Fatal("noncanonical text alias crossed wire")
		}
	}
	if stream != "text:delta:token:text.delta:chunk:text-delta:" {
		t.Fatal("accepted text aliases lost", stream)
	}
	snapshot, e := f.core.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: r.RunID})
	if e != nil || snapshot.Snapshot.PendingText != stream {
		t.Fatal("active snapshot lost accepted text aliases", snapshot, e)
	}
	close(release)
	waitRun(t, f, r.RunID, "succeeded")
}

func TestCheckpointFilesystemFailureLeavesNoPending(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		close(entered)
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return suspend(c, in)
	}, resume: finished}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("engine not entered")
	}
	path := filepath.Join(f.locator, "checkpoints")
	if e = os.Rename(path, path+"-old"); e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(path, []byte("not a directory"), 0600); e != nil {
		t.Fatal(e)
	}
	close(release)
	waitRun(t, f, r.RunID, "failed")
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM access_approvals") != 0 || count(t, d, "SELECT count(*) FROM execution_checkpoints") != 0 || f.writer.count() != 0 {
		t.Fatal("filesystem failure published pending")
	}
	if e = os.Remove(path); e != nil {
		t.Fatal(e)
	}
	if e = os.Rename(path+"-old", path); e != nil {
		t.Fatal(e)
	}
}

func TestTrustedPreviewMustBelongToCurrentHostWorkspace(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		foreign := target()
		foreign.WorkspaceID = "workspace:other"
		result, e := in.Tools.Invoke(c, api.ToolCall{ID: "call:foreign", Name: "note.write", Target: foreign, Content: "new"})
		if e != nil {
			return api.EngineResult{}, e
		}
		a, e := in.Checkpoints.Publish(c, bytes.NewBufferString("foreign workspace CP"))
		if e != nil {
			return api.EngineResult{}, e
		}
		return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: result.SuspensionToken, Checkpoint: a}}, nil
	}, resume: finished}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	until := time.Now().Add(time.Second)
	for {
		state, e := f.core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: r.RunID})
		if e != nil {
			t.Fatal(e)
		}
		if state.Status == "waiting_approval" {
			t.Fatal("foreign target paired with current Host lease published approval")
		}
		if state.Status == "failed" {
			break
		}
		if time.Now().After(until) {
			t.Fatal("inconsistent preview did not finish", state)
		}
		time.Sleep(time.Millisecond)
	}
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM access_approvals") != 0 || count(t, d, "SELECT count(*) FROM execution_effects") != 0 || count(t, d, "SELECT count(*) FROM execution_checkpoints") != 0 || f.writer.count() != 0 {
		t.Fatal("inconsistent preview acquired effect authority")
	}
}
