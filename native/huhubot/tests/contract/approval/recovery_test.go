package approval_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestDecisionCASPrincipalAndExactPreview(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: finished}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	command := api.ApprovalResolve{CommandMeta: meta(t, f.core, "decision", a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: "approve", PreviewHash: a.Preview.PreviewHash}
	other := api.NewConnectionIdentity("other", "intruder", false)
	_, e = f.core.API.Approvals.Resolve(ctx, other, command)
	expect(t, e, "APPROVAL_PRINCIPAL_MISMATCH")
	bad := command
	bad.PreviewHash = "sha256:" + strings.Repeat("0", 64)
	_, e = f.core.API.Approvals.Resolve(ctx, owner, bad)
	expect(t, e, "APPROVAL_PREVIEW_CHANGED")
	bad = command
	bad.EffectID = "effect:other"
	_, e = f.core.API.Approvals.Resolve(ctx, owner, bad)
	expect(t, e, "APPROVAL_PREVIEW_CHANGED")
	bad = command
	bad.ExpectedRevision = "99"
	_, e = f.core.API.Approvals.Resolve(ctx, owner, bad)
	expect(t, e, "APPROVAL_REVISION_CONFLICT")
	start := make(chan struct{})
	results := make(chan error, 2)
	for _, decision := range []string{"approve", "reject"} {
		q := command
		q.Decision = decision
		q.IdempotencyKey = "race-" + decision
		go func() { <-start; _, e := f.core.API.Approvals.Resolve(ctx, owner, q); results <- e }()
	}
	close(start)
	successes := 0
	for i := 0; i < 2; i++ {
		if e := <-results; e == nil {
			successes++
		} else {
			expect(t, e, "APPROVAL_REVISION_CONFLICT")
		}
	}
	if successes != 1 {
		t.Fatal("CAS admitted multiple decisions", successes)
	}
	waitRun(t, f, r.RunID, "succeeded")
	if n := count(t, db(t, f), "SELECT count(*) FROM execution_continuations"); n != 1 {
		t.Fatal("duplicate continuation", n)
	}
}

func TestGrantRevokedBetweenApprovalAndDispatchCausesZeroHostCalls(t *testing.T) {
	var resumed atomic.Int32
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: func(c context.Context, in api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
		resumed.Add(1)
		return finished(c, in, s)
	}}, time.Minute)
	lease, e := f.core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read", "note.write"}}, host{})
	if e != nil {
		t.Fatal(e)
	}
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://model.invalid", Capabilities: []string{"text"}}
	a, e := f.core.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, f.core, "model", f.agent.Revision), AgentID: f.agent.ID, Model: model})
	if e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256([]byte("SOURCE"))
	source := api.SourceSnapshot{ResourceID: "source:one", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}
	g, e := f.core.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, f.core, "grant", ""), WorkspaceID: lease.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}}, Operations: []string{"read", "send"}})
	if e != nil {
		t.Fatal(e)
	}
	f.command.SourceRefs = []api.SourceSnapshot{source}
	f.command.GrantIDs = []string{g.ID}
	f.writer.checkEntered = make(chan struct{}, 1)
	f.writer.checkRelease = make(chan struct{})
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	approval := waitApproval(t, f)
	if e = decide(t, f, approval, "approve"); e != nil {
		t.Fatal(e)
	}
	select {
	case <-f.writer.checkEntered:
	case <-time.After(time.Second):
		t.Fatal("no trusted target check")
	}
	_, e = f.core.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, f.core, "revoke", g.Revision), ID: g.ID})
	if e != nil {
		t.Fatal(e)
	}
	close(f.writer.checkRelease)
	// The public Run reader correctly hides revoked provenance; inspect only the
	// durable non-body state to verify cleanup after the final dispatch check.
	d := db(t, f)
	until := time.Now().Add(time.Second)
	for count(t, d, "SELECT count(*) FROM execution_runs WHERE run_id=? AND status='failed'", r.RunID) != 1 {
		if time.Now().After(until) {
			t.Fatal("revoked continuation did not finalize")
		}
		time.Sleep(time.Millisecond)
	}
	if f.writer.count() != 0 || resumed.Load() != 0 {
		t.Fatal("revoked body dispatched", f.writer.count(), resumed.Load())
	}
}

func TestCancelDuringDispatchDoesNotHideLateKnownReceipt(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: finished}, time.Minute)
	f.writer.invokeEntered = make(chan struct{})
	f.writer.invokeRelease = make(chan struct{})
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	if e = decide(t, f, a, "approve"); e != nil {
		t.Fatal(e)
	}
	select {
	case <-f.writer.invokeEntered:
	case <-time.After(time.Second):
		t.Fatal("no dispatch")
	}
	cancelRun(t, f, r.RunID)
	state := waitRun(t, f, r.RunID, "canceled")
	if !state.EffectsUnresolved {
		t.Fatal("cancel claimed no effect before receipt")
	}
	close(f.writer.invokeRelease)
	if e = f.core.Close(); e != nil {
		t.Fatal(e)
	}
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM execution_effects WHERE state='committed'") != 1 {
		t.Fatal("late known receipt discarded")
	}
	if count(t, d, "SELECT count(*) FROM execution_runs WHERE status='canceled' AND effects_unresolved=0") != 1 || count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 0 || count(t, d, "SELECT count(*) FROM conversation_messages WHERE role='assistant'") != 0 {
		t.Fatal("late receipt reopened canceled Run")
	}
}

func TestUnknownHostOutcomeKeepsEffectAndBlocksSuccess(t *testing.T) {
	f := open(t, engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, in)
	}, resume: finished}, time.Minute)
	f.writer.unknown = true
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	if e = decide(t, f, a, "approve"); e != nil {
		t.Fatal(e)
	}
	state := waitRun(t, f, r.RunID, "failed")
	if !state.EffectsUnresolved || state.Reason != "EFFECTS_UNRESOLVED" || f.writer.count() != 1 {
		t.Fatal(state, f.writer.count())
	}
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM execution_effects WHERE state='unknown_outcome'") != 1 {
		t.Fatal("unknown outcome disappeared")
	}
	_, e = f.core.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta(t, f.core, "delete", f.agent.Revision), ID: f.agent.ID})
	if e == nil {
		t.Fatal("unknown effect Bot deleted")
	}
}

func TestWaitingRestartAndPersistedRejectedContinuation(t *testing.T) {
	var runCalls, resumeCalls atomic.Int32
	e := engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		runCalls.Add(1)
		return suspend(c, in)
	}, resume: func(c context.Context, in api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
		resumeCalls.Add(1)
		return finished(c, in, s)
	}}
	f := open(t, e, time.Minute)
	r, err := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if err != nil {
		t.Fatal(err)
	}
	a := waitApproval(t, f)
	if err = f.core.Close(); err != nil {
		t.Fatal(err)
	}
	paused, err := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{Engine: e, ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	f.core = paused
	waitRun(t, f, r.RunID, "waiting_approval")
	if runCalls.Load() != 1 || resumeCalls.Load() != 0 {
		t.Fatal("waiting Run restarted without decision")
	}
	if err = decide(t, f, a, "reject"); err != nil {
		t.Fatal(err)
	}
	if count(t, db(t, f), "SELECT count(*) FROM execution_continuations WHERE state='pending'") != 1 {
		t.Fatal("decision lost before wake")
	}
	if err = paused.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{Engine: e})
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	f.core = reopened
	waitRun(t, f, r.RunID, "succeeded")
	if runCalls.Load() != 1 || resumeCalls.Load() != 1 {
		t.Fatal("continuation lost/duplicated", runCalls.Load(), resumeCalls.Load())
	}
	if count(t, db(t, f), "SELECT count(*) FROM config_snapshot_pins") != 0 {
		t.Fatal("continuation pin leaked")
	}
}

func TestCorruptedCheckpointBlocksResumeAndKeepsPin(t *testing.T) {
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
	files, _ := filepath.Glob(filepath.Join(f.locator, "checkpoints", "*.cp"))
	if len(files) != 1 {
		t.Fatal(files)
	}
	if e = os.WriteFile(files[0], []byte("corrupt"), 0600); e != nil {
		t.Fatal(e)
	}
	if e = decide(t, f, a, "reject"); e != nil {
		t.Fatal(e)
	}
	state := waitRun(t, f, r.RunID, "blocked")
	if state.Reason != "CHECKPOINT_INVALID" || resumes.Load() != 0 || f.writer.count() != 0 {
		t.Fatal(state)
	}
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 1 || count(t, d, "SELECT count(*) FROM conversation_sessions WHERE active_run_id IS NOT NULL") != 1 {
		t.Fatal("blocked Run released recoverable configuration")
	}
}

// The child exits in two real filesystem/SQLite windows without defers/Close.
func TestApprovalCheckpointCrashChild(t *testing.T) {
	root := os.Getenv("HUHU_APPROVAL_CRASH_ROOT")
	if root == "" {
		t.Skip("subprocess only")
	}
	stage := os.Getenv("HUHU_APPROVAL_CRASH_STAGE")
	var f *fixture
	eng := engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		if stage == "incomplete-bytes" {
			if _, e := in.Tools.Invoke(c, api.ToolCall{ID: "call:first", Name: "note.write", Target: target(), Content: "new"}); e != nil {
				return api.EngineResult{}, e
			}
			data, _ := json.Marshal(map[string]string{"runId": in.RunID})
			if e := os.WriteFile(filepath.Join(root, "proof.json"), data, 0600); e != nil {
				panic(e)
			}
			_, e := in.Checkpoints.Publish(c, &crashReader{})
			return api.EngineResult{}, e
		}
		r, e := suspend(c, in)
		if e != nil {
			return r, e
		}
		if stage == "file-before-db" {
			data, _ := json.Marshal(map[string]string{"runId": in.RunID})
			if e = os.WriteFile(filepath.Join(root, "proof.json"), data, 0600); e != nil {
				panic(e)
			}
			os.Exit(71)
		}
		return r, nil
	}, resume: finished}
	w := &writer{revision: "1"}
	c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: eng, NoteWriter: w})
	if e != nil {
		t.Fatal(e)
	}
	w.host = c.API.Host
	_, e = c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.write"}}, host{})
	if e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "agent", ""), Draft: api.AgentDraft{Name: "writer", Persona: "fixture", AllowedTools: []string{"note.write"}}})
	if e != nil {
		t.Fatal(e)
	}
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "session", ""), Kind: "direct", MemberIDs: []string{a.ID}, WorkspaceID: "workspace:one"})
	if e != nil {
		t.Fatal(e)
	}
	command := api.RunStart{CommandMeta: meta(t, c, "run", s.Revision), SessionID: s.ID, Intent: "write", SourceRefs: []api.SourceSnapshot{}}
	f = &fixture{core: c, root: root, locator: filepath.Join(root, "one"), writer: w, command: command}
	r, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	approval := waitApproval(t, f)
	waitRun(t, f, r.RunID, "waiting_approval")
	data, _ := json.Marshal(map[string]string{"runId": r.RunID, "approvalId": approval.ID})
	if e = os.WriteFile(filepath.Join(root, "proof.json"), data, 0600); e != nil {
		t.Fatal(e)
	}
	os.Exit(72)
}

type crashReader struct{ returned bool }

func (r *crashReader) Read(p []byte) (int, error) {
	if r.returned {
		os.Exit(70)
	}
	r.returned = true
	return copy(p, "incomplete checkpoint"), nil
}

var _ io.Reader = (*crashReader)(nil)

func TestActualProcessCheckpointCrashWindows(t *testing.T) {
	for _, stage := range []string{"incomplete-bytes", "file-before-db", "waiting-after-db"} {
		t.Run(stage, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "profiles")
			if e := os.Mkdir(root, 0700); e != nil {
				t.Fatal(e)
			}
			childCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()
			cmd := exec.CommandContext(childCtx, os.Args[0], "-test.run=^TestApprovalCheckpointCrashChild$", "-test.count=1")
			cmd.Env = append(os.Environ(), "HUHU_APPROVAL_CRASH_ROOT="+root, "HUHU_APPROVAL_CRASH_STAGE="+stage)
			output, e := cmd.CombinedOutput()
			var exit *exec.ExitError
			want := 71
			if stage == "incomplete-bytes" {
				want = 70
			}
			if stage == "waiting-after-db" {
				want = 72
			}
			if !errors.As(e, &exit) || exit.ExitCode() != want || childCtx.Err() != nil {
				t.Fatalf("child Wait %v timeout=%v output=%s", e, childCtx.Err(), output)
			}
			data, e := os.ReadFile(filepath.Join(root, "proof.json"))
			if e != nil {
				t.Fatal(e)
			}
			var proof map[string]string
			if e = json.Unmarshal(data, &proof); e != nil {
				t.Fatal(e)
			}
			var charges atomic.Int32
			eng := engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				charges.Add(1)
				return api.EngineResult{Status: "finished"}, nil
			}, resume: func(c context.Context, in api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
				charges.Add(1)
				return finished(c, in, s)
			}}
			c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: eng, ExecutorPaused: true})
			if e != nil {
				t.Fatal(e)
			}
			defer c.Close()
			status, e := c.API.Service.Status(ctx, owner)
			if e != nil {
				t.Fatal(e)
			}
			f := &fixture{core: c, root: root, locator: filepath.Join(root, "one"), command: api.RunStart{CommandMeta: api.CommandMeta{ProfileID: status.Profile.ProfileID}}}
			state := "interrupted"
			if stage == "waiting-after-db" {
				state = "waiting_approval"
			}
			waitRun(t, f, proof["runId"], state)
			d := db(t, f)
			pending := 0
			if stage == "waiting-after-db" {
				pending = 1
			}
			if count(t, d, "SELECT count(*) FROM access_approvals") != pending || count(t, d, "SELECT count(*) FROM execution_checkpoints") != pending || count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 1 {
				t.Fatal("crash exposed partial pending or lost pin")
			}
			files, _ := filepath.Glob(filepath.Join(root, "one", "checkpoints", "*.cp"))
			if len(files) != pending {
				t.Fatal("startup GC removed referenced/retained orphan", files)
			}
			if charges.Load() != 0 {
				t.Fatal("reopen autocharged model")
			}
			t.Logf("actual child exit%d reaped; reopened %s, published=%d, retained pin=1, model calls=0", want, state, pending)
		})
	}
}
