package foundation_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	brokerapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type recoveryIntentEngine struct {
	run     func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume  func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
	inspect func(api.CheckpointInspection) error
}

func (e recoveryIntentEngine) Run(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, in)
}
func (e recoveryIntentEngine) Resume(c context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.resume(c, in)
}
func (e recoveryIntentEngine) InspectCheckpoint(_ context.Context, q api.CheckpointInspection) error {
	if e.inspect == nil {
		return fmt.Errorf("unexpected recovery before interruption")
	}
	return e.inspect(q)
}

type recoveryIntentWriter struct {
	host  api.HostAPI
	calls atomic.Int32
}

func (w *recoveryIntentWriter) Preview(c context.Context, target api.EffectTarget, content string) (api.NoteTargetPreview, error) {
	lease, e := w.host.CurrentLease(c)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	h := sha256.Sum256([]byte(content))
	return api.NoteTargetPreview{Target: target, Tool: brokerapp.Descriptor, ContentHash: "sha256:" + hex.EncodeToString(h[:]), Diff: "controlled proposal", Lease: lease}, nil
}
func (*recoveryIntentWriter) Check(context.Context, api.ApprovalPreview, api.HostLease) error {
	return nil
}
func (w *recoveryIntentWriter) Invoke(context.Context, api.EffectDispatch) (api.HostReceipt, error) {
	w.calls.Add(1)
	return api.HostReceipt{}, fmt.Errorf("rejected proposal must not invoke Host")
}
func (w *recoveryIntentWriter) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	w.calls.Add(1)
	return api.HostReceipt{}, fmt.Errorf("qualification must not query Host")
}

type recoveryIntentRemote struct{ calls *atomic.Int32 }

func (r recoveryIntentRemote) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	r.calls.Add(1)
	return api.HostReceipt{}, fmt.Errorf("rejected proposal must not invoke remote")
}
func (r recoveryIntentRemote) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	r.calls.Add(1)
	return api.HostReceipt{}, fmt.Errorf("qualification must not query remote")
}

// The payload deliberately carries a different intent. Only the original
// accepted database row can supply the trusted value to the pure Inspector.
func TestRecoveryInspectionKeepsAcceptedIntentThroughRepositoryAndBroker(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("recovery-intent", "owner", true)
	intent := "保留原请求 <>& {\"literal\":1}\nsecond line\u2028end"
	payload := []byte(`{"intent":"checkpoint-only decoy"}`)
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	stop := func(c *bootstrap.Core) {
		t.Helper()
		if e := c.RequestStop(); e != nil {
			t.Error(e)
		}
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if e := c.WaitClosed(bounded); e != nil {
			t.Error(e)
		}
	}
	initial := make(chan api.EngineInput, 1)
	resumed := make(chan api.EngineResumeInput, 1)
	var runs, resumes atomic.Int32
	writer := &recoveryIntentWriter{}
	first := recoveryIntentEngine{run: func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		runs.Add(1)
		initial <- in
		result, e := in.Tools.Invoke(c, api.ToolCall{ID: "call:original", Name: "note.write", Target: api.EffectTarget{WorkspaceID: "workspace:one", ResourceID: "note:one", Operation: "update", BaseRevision: "1"}, Content: "controlled new text"})
		if e != nil {
			return api.EngineResult{}, e
		}
		if result.Status != "approval_required" {
			return api.EngineResult{}, fmt.Errorf("expected real approval: %#v", result)
		}
		artifact, e := in.Checkpoints.Publish(c, bytes.NewReader(payload))
		if e != nil {
			return api.EngineResult{}, e
		}
		return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: result.SuspensionToken, Checkpoint: artifact}}, nil
	}, resume: func(c context.Context, in api.EngineResumeInput) (api.EngineResult, error) {
		resumes.Add(1)
		resumed <- in
		<-c.Done()
		return api.EngineResult{}, c.Err()
	}}
	core, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: first, NoteWriter: writer})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { stop(core) })
	writer.host = core.API.Host
	// Reject uses the real approval pipeline and never invokes this remote.
	if _, e = core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.write"}}, recoveryIntentRemote{&writer.calls}); e != nil {
		t.Fatal(e)
	}
	status, e := core.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	meta := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
	}
	agent, e := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "controlled writer", Persona: "controlled persona", AllowedTools: []string{"note.write"}}})
	if e != nil {
		t.Fatal(e)
	}
	session, e := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}, WorkspaceID: "workspace:one"})
	if e != nil {
		t.Fatal(e)
	}
	receipt, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("original-run", session.Revision), SessionID: session.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	var approval api.Approval
	deadline := time.NewTimer(5 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for approval.ID == "" {
		page, e := core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: status.Profile.ProfileID})
		if e != nil {
			t.Fatal(e)
		}
		if len(page.Items) == 1 {
			approval = page.Items[0]
			break
		}
		select {
		case <-deadline.C:
			t.Fatal("real checkpoint/approval was not published")
		case <-tick.C:
		}
	}
	if _, e = core.API.Approvals.Resolve(ctx, owner, api.ApprovalResolve{CommandMeta: meta("reject", approval.Revision), ID: approval.ID, EffectID: approval.EffectID, Decision: "reject", PreviewHash: approval.Preview.PreviewHash}); e != nil {
		t.Fatal(e)
	}
	var before api.EngineResumeInput
	select {
	case before = <-resumed:
	case <-time.After(5 * time.Second):
		t.Fatal("actual Resume was not entered")
	}
	in := <-initial
	if before.Input.RunID != receipt.RunID || before.Input.Intent != intent || before.Decision.Status != "denied" || before.Decision.Reason != "APPROVAL_REJECTED" {
		t.Fatal("original continuation did not reach real Engine", before)
	}
	stop(core)
	var mu sync.Mutex
	observed := []api.CheckpointInspection{}
	second := recoveryIntentEngine{run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
		runs.Add(1)
		return api.EngineResult{}, fmt.Errorf("qualification restarted Run")
	}, resume: func(context.Context, api.EngineResumeInput) (api.EngineResult, error) {
		resumes.Add(1)
		return api.EngineResult{}, fmt.Errorf("qualification executed Resume")
	}, inspect: func(q api.CheckpointInspection) error {
		body, e := io.ReadAll(q.Reader)
		if e != nil {
			return e
		}
		if !bytes.Equal(body, payload) {
			return fmt.Errorf("complete original payload changed")
		}
		q.Reader = nil
		mu.Lock()
		observed = append(observed, q)
		mu.Unlock()
		return nil
	}}
	reopened, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: second, ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { stop(reopened) })
	qualification, e := reopened.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: receipt.RunID})
	if e != nil || qualification.State != "ready" || qualification.RunID != receipt.RunID {
		t.Fatal("legal original recovery was not ready", qualification, e)
	}
	mu.Lock()
	inspections := append([]api.CheckpointInspection(nil), observed...)
	mu.Unlock()
	if len(inspections) == 0 {
		t.Fatal("Repository/Broker bypassed pure Inspector")
	}
	for _, q := range inspections {
		if q.Intent != intent || q.Run.ID != receipt.RunID || q.Run.SessionID != session.ID || !reflect.DeepEqual(q.Config, in.Config) || q.Position.Phase != "resume" || q.Position.Continuation == nil || q.Position.Continuation.Checkpoint != before.Checkpoint || !reflect.DeepEqual(q.Position.Decision, &before.Decision) || q.Checkpoint != before.Checkpoint {
			t.Fatalf("trusted request/Run/config/position changed: %#v", q)
		}
	}
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	for query, want := range map[string]int{"SELECT count(*) FROM execution_runs": 1, "SELECT count(*) FROM model_attempts": 0, "SELECT count(*) FROM execution_checkpoints": 1, "SELECT count(*) FROM execution_continuations WHERE state='completed'": 1} {
		var n int
		if e = db.QueryRow(query).Scan(&n); e != nil || n != want {
			t.Fatal("qualification altered original facts", query, n, want, e)
		}
	}
	if runs.Load() != 1 || resumes.Load() != 1 || writer.calls.Load() != 0 {
		t.Fatal("inspection executed work", runs.Load(), resumes.Load(), writer.calls.Load())
	}
	t.Logf("accepted Intent retained byte-for-byte through original Run/CP/config/phase; %d pure inspections, Run1 Resume1 attempts0 Host0", len(inspections))
}
