package approval_test

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type inspectableEngine struct {
	engine
	inspections atomic.Int32
	inspect     func(context.Context, api.CheckpointInspection) error
}

func (e *inspectableEngine) InspectCheckpoint(c context.Context, q api.CheckpointInspection) error {
	e.inspections.Add(1)
	if e.inspect != nil {
		return e.inspect(c, q)
	}
	body, err := io.ReadAll(q.Reader)
	if err != nil {
		return err
	}
	if string(body) != "private-engine-state" {
		return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "CHECKPOINT_INCOMPATIBLE"}
	}
	return nil
}

func TestRecoveryAfterActualEngineResumeKeepsDecisionAndNeverReplaysCommittedEffect(t *testing.T) {
	entered := make(chan api.EngineResumeInput, 1)
	original := &inspectableEngine{engine: engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: func(c context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		entered <- in
		<-c.Done()
		return api.EngineResult{}, c.Err()
	}}}
	f := open(t, original, time.Minute)
	accepted, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	if e = decide(t, f, a, "approve"); e != nil {
		t.Fatal(e)
	}
	var before api.EngineResumeInput
	select {
	case before = <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("no actual Resume")
	}
	if before.Decision.Status != "completed" || f.writer.count() != 1 {
		t.Fatal("initial committed continuation", before.Decision, f.writer.count())
	}
	if e = f.core.Close(); e != nil {
		t.Fatal(e)
	}
	var runs, resumes atomic.Int32
	successor := &inspectableEngine{engine: engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		runs.Add(1)
		return api.EngineResult{}, api.Invalid("UNEXPECTED_RUN")
	}, resume: func(c context.Context, in api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
		resumes.Add(1)
		if in.Checkpoint != before.Checkpoint || in.Decision.EffectID != before.Decision.EffectID || in.Decision.Status != "completed" {
			return api.EngineResult{}, api.Invalid("RECOVERY_DECISION_CHANGED")
		}
		r, e := in.Input.Checkpoints.Open(c, in.Checkpoint)
		if e != nil {
			return api.EngineResult{}, e
		}
		body, e := io.ReadAll(r)
		_ = r.Close()
		if e != nil || string(body) != "private-engine-state" {
			return api.EngineResult{}, api.Invalid("RECOVERY_PAYLOAD_CHANGED")
		}
		return api.EngineResult{Status: "finished", Text: "resumed original run"}, nil
	}}}
	next, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{Engine: successor, NoteWriter: f.writer})
	if e != nil {
		t.Fatal(e)
	}
	defer next.Close()
	f.writer.host = next.API.Host
	// Startup has performed real private payload inspection, but never Run/Resume.
	if successor.inspections.Load() == 0 || runs.Load() != 0 || resumes.Load() != 0 || f.writer.count() != 1 {
		t.Fatal("startup executed instead of inspecting")
	}
	q := api.IDQuery{ProfileID: f.command.ProfileID, ID: accepted.RunID}
	eligibility, e := next.API.Recovery.Get(ctx, owner, q)
	if e != nil || eligibility.State != "ready" {
		t.Fatal(eligibility, e)
	}
	run, e := next.API.Conversation.GetRun(ctx, owner, q)
	if e != nil || run.Recovery == nil || run.Recovery.Revision != eligibility.Revision {
		t.Fatal("Run qualification projection", run, e)
	}
	command := api.RunResume{CommandMeta: api.CommandMeta{ProfileID: f.command.ProfileID, CommandEpoch: f.command.CommandEpoch, CommandID: "explicit-resume", IdempotencyKey: "explicit-resume", ExpectedRevision: eligibility.Revision}, ID: accepted.RunID, RecoveryGeneration: eligibility.Generation}
	receipt, e := next.API.Recovery.Resume(ctx, owner, command)
	if e != nil || receipt.RunID != accepted.RunID {
		t.Fatal(receipt, e)
	}
	replay, e := next.API.Recovery.Resume(ctx, owner, command)
	if e != nil || replay.ReceiptID != receipt.ReceiptID {
		t.Fatal("resume receipt replay", replay, e)
	}
	f.core = next
	waitRun(t, f, accepted.RunID, "succeeded")
	if resumes.Load() != 1 || runs.Load() != 0 || f.writer.count() != 1 {
		t.Fatal("duplicate producer/effect", resumes.Load(), runs.Load(), f.writer.count())
	}
	d := db(t, f)
	if n := count(t, d, "SELECT count(*) FROM conversation_messages WHERE role='assistant' AND run_id=?", accepted.RunID); n != 1 {
		t.Fatal("result redelivered", n)
	}
	var actual string
	if e = d.QueryRow("SELECT claim_token FROM execution_runs WHERE run_id=?", accepted.RunID).Scan(&actual); e != nil || actual == before.Checkpoint.AttemptID {
		t.Fatal("reused execution claim", actual, e)
	}
}

func TestRecoveryInspectionBlocksMissingCorruptIncompatibleAndUnassembledCheckpoints(t *testing.T) {
	for _, kind := range []string{"missing", "corrupt", "version", "semantic", "unassembled"} {
		t.Run(kind, func(t *testing.T) {
			entered := make(chan api.EngineResumeInput, 1)
			eng := &inspectableEngine{engine: engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				return suspend(c, in)
			}, resume: func(c context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				entered <- in
				<-c.Done()
				return api.EngineResult{}, c.Err()
			}}}
			f := open(t, eng, time.Minute)
			accepted, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			a := waitApproval(t, f)
			if e = decide(t, f, a, "reject"); e != nil {
				t.Fatal(e)
			}
			var old api.EngineResumeInput
			select {
			case old = <-entered:
			case <-time.After(3 * time.Second):
				t.Fatal("no actual Resume")
			}
			if e = f.core.Close(); e != nil {
				t.Fatal(e)
			}
			path := filepath.Join(f.locator, "checkpoints", strings.TrimPrefix(old.Checkpoint.Ref, "cp:")+".cp")
			switch kind {
			case "missing":
				if e = os.Remove(path); e != nil {
					t.Fatal(e)
				}
			case "corrupt":
				body, e := os.ReadFile(path)
				if e != nil {
					t.Fatal(e)
				}
				body[len(body)-1] ^= 1
				if e = os.WriteFile(path, body, 0600); e != nil {
					t.Fatal(e)
				}
			}
			var calls atomic.Int32
			nextEngine := &inspectableEngine{engine: engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				calls.Add(1)
				return api.EngineResult{}, api.Invalid("UNEXPECTED_MODEL")
			}, resume: func(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				calls.Add(1)
				return api.EngineResult{}, api.Invalid("UNEXPECTED_MODEL")
			}}}
			options := bootstrap.Options{Engine: nextEngine, NoteWriter: f.writer}
			want := "CHECKPOINT_INVALID"
			if kind == "version" {
				options.EngineVersion = "different-engine-version"
				want = "CHECKPOINT_INCOMPATIBLE"
			}
			if kind == "semantic" {
				nextEngine.inspect = func(c context.Context, q api.CheckpointInspection) error {
					_, _ = io.ReadAll(q.Reader)
					return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "CHECKPOINT_INCOMPATIBLE"}
				}
				want = "CHECKPOINT_INCOMPATIBLE"
			}
			if kind == "unassembled" {
				options.Engine = nextEngine.engine
				want = "CHECKPOINT_INSPECTION_NOT_ASSEMBLED"
			}
			c, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, options)
			if e != nil {
				t.Fatal(e)
			}
			defer c.Close()
			q := api.IDQuery{ProfileID: f.command.ProfileID, ID: accepted.RunID}
			status, e := c.API.Recovery.Get(ctx, owner, q)
			if e != nil || status.State != "blocked" || status.Reason != want {
				t.Fatal(status, e)
			}
			_, e = c.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: api.CommandMeta{ProfileID: f.command.ProfileID, CommandEpoch: f.command.CommandEpoch, CommandID: "blocked-resume", IdempotencyKey: "blocked-resume", ExpectedRevision: status.Revision}, ID: accepted.RunID, RecoveryGeneration: status.Generation})
			if e == nil || calls.Load() != 0 || f.writer.count() != 0 {
				t.Fatal("blocked checkpoint entered execution", e, calls.Load(), f.writer.count())
			}
		})
	}
}

func TestResumePositionWriteFailureReusesCompletedApprovalDecision(t *testing.T) {
	var firstResume atomic.Int32
	eng := &inspectableEngine{engine: engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: func(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		firstResume.Add(1)
		return api.EngineResult{Status: "finished"}, nil
	}}}
	f := open(t, eng, time.Minute)
	accepted, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	d := db(t, f)
	if _, e = d.Exec("CREATE TRIGGER reject_resume_position BEFORE UPDATE OF execution_position_json ON execution_runs WHEN json_extract(NEW.execution_position_json,'$.Phase')='resume' BEGIN SELECT RAISE(ABORT,'fixture_position_failure'); END"); e != nil {
		t.Fatal(e)
	}
	if e = decide(t, f, a, "approve"); e != nil {
		t.Fatal(e)
	}
	until := time.Now().Add(3 * time.Second)
	for count(t, d, "SELECT count(*) FROM execution_continuations WHERE run_id=? AND state='completed'", accepted.RunID) != 1 {
		if time.Now().After(until) {
			t.Fatal("continuation did not complete")
		}
		time.Sleep(time.Millisecond)
	}
	if e = f.core.Close(); e != nil {
		t.Fatal(e)
	}
	if firstResume.Load() != 0 || f.writer.count() != 1 {
		t.Fatal("failed position write entered Resume", firstResume.Load(), f.writer.count())
	}
	var phase string
	if e = d.QueryRow("SELECT json_extract(execution_position_json,'$.Phase') FROM execution_runs WHERE run_id=?", accepted.RunID).Scan(&phase); e != nil || phase != "continuation" {
		t.Fatal("position failure did not preserve prior phase", phase, e)
	}
	if _, e = d.Exec("DROP TRIGGER reject_resume_position"); e != nil {
		t.Fatal(e)
	}
	var successorResume atomic.Int32
	nextEngine := &inspectableEngine{engine: engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		return api.EngineResult{}, api.Invalid("UNEXPECTED_RUN")
	}, resume: func(_ context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		successorResume.Add(1)
		if in.Decision.Status != "completed" || in.Decision.EffectID != a.EffectID {
			return api.EngineResult{}, api.Invalid("DECISION_CHANGED")
		}
		return api.EngineResult{Status: "finished", Text: "original decision resumed"}, nil
	}}}
	next, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{Engine: nextEngine, NoteWriter: f.writer})
	if e != nil {
		t.Fatal(e)
	}
	defer next.Close()
	f.core = next
	f.writer.host = next.API.Host
	status, e := next.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: accepted.RunID})
	if e != nil || status.State != "ready" {
		t.Fatal(status, e)
	}
	_, e = next.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: api.CommandMeta{ProfileID: f.command.ProfileID, CommandEpoch: f.command.CommandEpoch, CommandID: "resume-after-position-failure", IdempotencyKey: "resume-after-position-failure", ExpectedRevision: status.Revision}, ID: accepted.RunID, RecoveryGeneration: status.Generation})
	if e != nil {
		t.Fatal(e)
	}
	waitRun(t, f, accepted.RunID, "succeeded")
	if successorResume.Load() != 1 || f.writer.count() != 1 {
		t.Fatal("decision/effect duplicated", successorResume.Load(), f.writer.count())
	}
}

func TestStoppingHostProducerPersistsUnknownBeforeProfileRelease(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: finished}, time.Minute)
	f.writer.invokeEntered = make(chan struct{})
	f.writer.invokeRelease = make(chan struct{})
	f.writer.unknown = true
	released := false
	defer func() {
		if !released {
			close(f.writer.invokeRelease)
		}
		_ = f.core.RequestStop()
		_ = f.core.WaitClosed(ctx)
	}()
	accepted, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	if e = decide(t, f, a, "approve"); e != nil {
		t.Fatal(e)
	}
	select {
	case <-f.writer.invokeEntered:
	case <-time.After(3 * time.Second):
		t.Fatal("Host producer not entered")
	}
	e = f.core.Close()
	var fault *api.Fault
	if !errors.As(e, &fault) || fault.Reason != "EXECUTOR_STOP_TIMEOUT" {
		t.Fatal("Host producer released before actual end", e)
	}
	close(f.writer.invokeRelease)
	released = true
	bounded, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if e = f.core.WaitClosed(bounded); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	effect, e := c.API.Effects.Get(ctx, owner, api.EffectQuery{ProfileID: f.command.ProfileID, ID: a.EffectID})
	if e != nil || effect.Status != "unknown_outcome" {
		t.Fatal("actual stopped Host producer lost unknown outcome", effect, e)
	}
	run, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: accepted.RunID})
	if e != nil || !run.EffectsUnresolved {
		t.Fatal("Run omitted unresolved outcome", run, e)
	}
	if f.writer.count() != 1 {
		t.Fatal("replayed Host write", f.writer.count())
	}
}
