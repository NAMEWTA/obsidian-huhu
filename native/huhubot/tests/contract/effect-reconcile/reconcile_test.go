package effectreconcile_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
	"time"
)

var ctx = context.Background()
var identity = api.NewConnectionIdentity("effect-contract", "owner", true)

type engine struct{}

func (engine) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	result, e := i.Tools.Invoke(c, api.ToolCall{ID: "write:first", Name: "note.write", Target: api.EffectTarget{WorkspaceID: "vault", ResourceID: "opaque-target", Operation: "update", BaseRevision: "1"}, Content: "new exact 😀"})
	if e != nil {
		return api.EngineResult{}, e
	}
	if result.Status != "approval_required" {
		return api.EngineResult{}, api.Invalid("FIXTURE_APPROVAL_REQUIRED")
	}
	a, e := i.Checkpoints.Publish(c, bytes.NewBufferString("engine continuation"))
	if e != nil {
		return api.EngineResult{}, e
	}
	return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: result.SuspensionToken, Checkpoint: a}}, nil
}
func (engine) Resume(_ context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{Status: "finished", Text: i.Decision.Status}, nil
}

type host struct {
	mu              sync.Mutex
	lease           api.HostLease
	fingerprint     string
	effect          string
	writes, queries int
	queryStatus     string
	badFingerprint  bool
	previewMismatch bool
	omitReceipt     bool
}

func hash(v string) string {
	h := sha256.Sum256([]byte(v))
	return "sha256:" + hex.EncodeToString(h[:])
}
func (h *host) PrepareWrite(_ context.Context, q api.HostPrepareWriteRequest) (api.NoteTargetPreview, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	b := &api.NoteWriteBinding{DeviceID: "device", ProfileID: q.ProfileID, CommandEpoch: q.CommandEpoch, WorkspaceID: q.WorkspaceID, OriginClientID: "origin", OriginViewID: "view", LeaseID: q.LeaseID, HostConnectionID: q.HostConnectionID, LeaseEpoch: q.LeaseEpoch, TargetResourceID: q.Target.ResourceID, PreparationID: "prepared:one", BaseHash: hash("old"), ContentHash: hash(q.Content), TargetVersion: "1", CapabilityVersion: "1", ImplementationVersion: "1", PolicyVersion: "1"}
	if h.previewMismatch {
		b.ContentHash = hash("changed")
	}
	return api.NoteTargetPreview{Target: q.Target, Tool: broker.Descriptor, ContentHash: hash(q.Content), Diff: "old -> new", Lease: h.lease, Binding: b}, nil
}
func (h *host) CheckWrite(context.Context, api.HostCheckWriteRequest) (api.HostCheckWriteResult, error) {
	return api.HostCheckWriteResult{Valid: true}, nil
}
func (h *host) Invoke(_ context.Context, q api.HostInvokeCommand) (api.HostReceipt, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if q.Fingerprint != api.EffectFingerprint(q) {
		return api.HostReceipt{}, api.Denied("EFFECT_FINGERPRINT_MISMATCH")
	}
	h.writes++
	h.fingerprint = q.Fingerprint
	h.effect = q.EffectID
	return api.HostReceipt{}, io.ErrUnexpectedEOF
}
func (h *host) QueryReceipt(_ context.Context, q api.HostReceiptQuery) (api.HostReceipt, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.queries++
	if q.Fingerprint != h.fingerprint || q.EffectID != h.effect {
		return api.HostReceipt{}, errors.New("query changed identity")
	}
	fingerprint := q.Fingerprint
	if h.badFingerprint {
		fingerprint = hash("wrong")
	}
	receiptID := "receipt:trusted"
	if h.omitReceipt {
		receiptID = ""
	}
	return api.HostReceipt{EffectID: q.EffectID, Status: h.queryStatus, ReceiptID: receiptID, Revision: "2", Fingerprint: fingerprint}, nil
}
func meta(t *testing.T, c *bootstrap.Core, key, revision string) api.CommandMeta {
	t.Helper()
	status, e := c.API.Service.Status(ctx, identity)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, ExpectedRevision: revision}
}
func await(t *testing.T, predicate func() bool) {
	t.Helper()
	until := time.Now().Add(3 * time.Second)
	for !predicate() {
		if time.Now().After(until) {
			t.Fatal("condition not reached")
		}
		time.Sleep(time.Millisecond)
	}
}
func TestDefaultBridgeReconcilesLostReceiptWithoutReopeningTerminalRun(t *testing.T) {
	for _, outcome := range []string{"committed", "reconciled", "unknown_outcome", "wrong-fingerprint", "unverified-committed", "legacy-zero"} {
		t.Run(outcome, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "profiles")
			if e := os.Mkdir(root, 0700); e != nil {
				t.Fatal(e)
			}
			c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine{}})
			if e != nil {
				t.Fatal(e)
			}
			defer c.Close()
			h := &host{queryStatus: outcome}
			expected := outcome
			if outcome == "legacy-zero" {
				h.queryStatus = "committed"
				expected = "committed"
			}
			if outcome == "wrong-fingerprint" {
				h.queryStatus = "committed"
				h.badFingerprint = true
			}
			if outcome == "unverified-committed" {
				h.queryStatus = "committed"
				h.omitReceipt = true
				expected = "unknown_outcome"
			}
			h.lease, e = c.API.Host.Attach(ctx, identity, api.HostAttachCommand{WorkspaceID: "vault", Capabilities: []string{"note.write"}}, h)
			if e != nil {
				t.Fatal(e)
			}
			a, e := c.API.Assistant.Create(ctx, identity, api.AgentCreate{CommandMeta: meta(t, c, "agent", ""), Draft: api.AgentDraft{Name: "writer", Persona: "literal", AllowedTools: []string{"note.write"}}})
			if e != nil {
				t.Fatal(e)
			}
			session, e := c.API.Conversation.CreateSession(ctx, identity, api.SessionCreate{CommandMeta: meta(t, c, "session", ""), Kind: "direct", MemberIDs: []string{a.ID}})
			if e != nil {
				t.Fatal(e)
			}
			receipt, e := c.API.Conversation.StartRun(ctx, identity, api.RunStart{CommandMeta: meta(t, c, "run", session.Revision), SessionID: session.ID, Intent: "write", SourceRefs: []api.SourceSnapshot{}})
			if e != nil {
				t.Fatal(e)
			}
			var approval api.Approval
			await(t, func() bool {
				p, e := c.API.Approvals.List(ctx, identity, api.PageQuery{ProfileID: receiptProfile(t, c)})
				if e != nil {
					t.Fatal(e)
				}
				if len(p.Items) == 0 {
					return false
				}
				approval = p.Items[0]
				return true
			})
			_, e = c.API.Approvals.Resolve(ctx, identity, api.ApprovalResolve{CommandMeta: meta(t, c, "approve", approval.Revision), ID: approval.ID, EffectID: approval.EffectID, Decision: "approve", PreviewHash: approval.Preview.PreviewHash})
			if e != nil {
				t.Fatal(e)
			}
			var run api.Run
			await(t, func() bool {
				run, e = c.API.Conversation.GetRun(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: receipt.RunID})
				return e == nil && run.Status == "failed"
			})
			if !run.EffectsUnresolved {
				t.Fatal("lost receipt was fabricated as certain")
			}
			if outcome == "legacy-zero" {
				d, openErr := sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
				if openErr != nil {
					t.Fatal(openErr)
				}
				_, writeErr := d.Exec("UPDATE execution_effects SET receipt_json=? WHERE effect_id=?", `{"EffectID":"","Status":"","Revision":"","ReceiptID":""}`, approval.EffectID)
				closeErr := d.Close()
				if writeErr != nil || closeErr != nil {
					t.Fatal(writeErr, closeErr)
				}
			}
			v, e := c.API.Effects.Get(ctx, identity, api.EffectQuery{ProfileID: receiptProfile(t, c), ID: approval.EffectID})
			if e != nil || v.Status != "unknown_outcome" || v.Receipt != nil {
				t.Fatalf("effect %#v %v", v, e)
			}
			command := api.EffectReconcile{CommandMeta: meta(t, c, "reconcile", v.Revision), ID: v.ID}
			result, e := c.API.Effects.Reconcile(ctx, identity, command)
			if outcome == "wrong-fingerprint" {
				var fault *api.Fault
				if !errors.As(e, &fault) || fault.Reason != "NOTE_RECEIPT_INVALID" {
					t.Fatalf("mismatched evidence accepted: %#v %v", result, e)
				}
				unchanged, readErr := c.API.Effects.Get(ctx, identity, api.EffectQuery{ProfileID: receiptProfile(t, c), ID: v.ID})
				if readErr != nil || unchanged.Status != "unknown_outcome" || unchanged.Receipt != nil {
					t.Fatalf("bad evidence changed fact: %#v %v", unchanged, readErr)
				}
				h.mu.Lock()
				writes, queries := h.writes, h.queries
				h.mu.Unlock()
				if writes != 1 || queries != 1 {
					t.Fatalf("bad evidence retried write: %d %d", writes, queries)
				}
				return
			}
			if e != nil || result.Status != expected {
				t.Fatalf("reconcile %#v %v", result, e)
			}
			again, e := c.API.Effects.Reconcile(ctx, identity, command)
			if e != nil || !reflect.DeepEqual(again, result) {
				t.Fatalf("idempotent reconcile %#v %v", again, e)
			}
			after, e := c.API.Conversation.GetRun(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: receipt.RunID})
			if e != nil || after.Status != run.Status {
				t.Fatalf("terminal reopened %#v %v", after, e)
			}
			h.mu.Lock()
			writes, queries := h.writes, h.queries
			h.mu.Unlock()
			if writes != 1 || queries != 1 {
				t.Fatalf("writes=%d queries=%d", writes, queries)
			}
		})
	}
}
func receiptProfile(t *testing.T, c *bootstrap.Core) string { return meta(t, c, "read", "").ProfileID }

func TestGroupMemberRemovalRetainsOwnerEffectReconciliation(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine{}})
	if e != nil {
		t.Fatal(e)
	}
	defer func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
	}()
	h := &host{queryStatus: "reconciled"}
	h.lease, e = c.API.Host.Attach(ctx, identity, api.HostAttachCommand{WorkspaceID: "vault", Capabilities: []string{"note.write"}}, h)
	if e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, identity, api.AgentCreate{CommandMeta: meta(t, c, "coordinator", ""), Draft: api.AgentDraft{Name: "A", Persona: "A", AllowedTools: []string{}}})
	if e != nil {
		t.Fatal(e)
	}
	b, e := c.API.Assistant.Create(ctx, identity, api.AgentCreate{CommandMeta: meta(t, c, "writer", ""), Draft: api.AgentDraft{Name: "B", Persona: "B", AllowedTools: []string{"note.write"}}})
	if e != nil {
		t.Fatal(e)
	}
	s, e := c.API.Conversation.CreateSession(ctx, identity, api.SessionCreate{CommandMeta: meta(t, c, "group", ""), Kind: "group", Title: "effect owner group", CoordinatorID: a.ID, MemberIDs: []string{a.ID, b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	receipt, e := c.API.Conversation.StartRun(ctx, identity, api.RunStart{CommandMeta: meta(t, c, "write", s.Revision), SessionID: s.ID, Intent: "write", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	if len(receipt.TargetRunIDs) != 1 {
		t.Fatalf("targetRuns %#v", receipt)
	}
	childID := receipt.TargetRunIDs[0]
	var approval api.Approval
	await(t, func() bool {
		p, e := c.API.Approvals.List(ctx, identity, api.PageQuery{ProfileID: receiptProfile(t, c)})
		if e != nil {
			t.Fatal(e)
		}
		if len(p.Items) == 0 {
			return false
		}
		approval = p.Items[0]
		return true
	})
	if approval.RunID != childID {
		t.Fatalf("approval wrong Run %#v", approval)
	}
	_, e = c.API.Approvals.Resolve(ctx, identity, api.ApprovalResolve{CommandMeta: meta(t, c, "approve", approval.Revision), ID: approval.ID, EffectID: approval.EffectID, Decision: "approve", PreviewHash: approval.Preview.PreviewHash})
	if e != nil {
		t.Fatal(e)
	}
	await(t, func() bool {
		r, e := c.API.Conversation.GetRun(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: childID})
		return e == nil && r.Status == "failed" && r.EffectsUnresolved
	})
	before, e := c.API.Effects.Get(ctx, identity, api.EffectQuery{ProfileID: receiptProfile(t, c), ID: approval.EffectID})
	if e != nil || before.Status != "unknown_outcome" {
		t.Fatalf("before %#v %v", before, e)
	}
	await(t, func() bool {
		r, e := c.API.Conversation.GetRun(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: receipt.RunID})
		return e == nil && (r.Status == "failed" || r.Status == "succeeded")
	})
	s, e = c.API.Conversation.GetSession(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: s.ID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Groups.UpdateMembers(ctx, identity, api.SessionMembersUpdate{CommandMeta: meta(t, c, "remove", s.Revision), ID: s.ID, MemberIDs: []string{a.ID}, HistoryScope: api.GroupHistoryScope{Kind: "none"}})
	if e != nil {
		t.Fatal(e)
	}
	foreign := api.NewConnectionIdentity("effect-foreign", "another-owner", true)
	for _, scenario := range []string{"principal", "profile"} {
		t.Run("reject-"+scenario, func(t *testing.T) {
			caller := identity
			q := api.EffectQuery{ProfileID: receiptProfile(t, c), ID: approval.EffectID}
			command := api.EffectReconcile{CommandMeta: meta(t, c, "bad-"+scenario, before.Revision), ID: approval.EffectID}
			want := "SESSION_READ_DENIED"
			if scenario == "principal" {
				caller = foreign
			} else {
				q.ProfileID = "profile:another"
				command.ProfileID = q.ProfileID
				want = "PROFILE_MISMATCH"
			}
			_, readErr := c.API.Effects.Get(ctx, caller, q)
			_, checkErr := c.API.Effects.Reconcile(ctx, caller, command)
			for _, err := range []error{readErr, checkErr} {
				var f *api.Fault
				if !errors.As(err, &f) || f.Reason != want {
					t.Errorf("foreign access %v want %s", err, want)
				}
			}
		})
	}
	if _, e = c.API.Approvals.Get(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: approval.ID}); e == nil {
		t.Fatal("removed member approval preview was exposed")
	}
	h.mu.Lock()
	preQueries := h.queries
	h.mu.Unlock()
	if preQueries != 0 {
		t.Fatal("foreign request reached Host")
	}
	h.lease, e = c.API.Host.Attach(ctx, identity, api.HostAttachCommand{WorkspaceID: "vault", Capabilities: []string{"note.write"}}, h)
	if e != nil {
		t.Fatal(e)
	}
	after, getErr := c.API.Effects.Get(ctx, identity, api.EffectQuery{ProfileID: receiptProfile(t, c), ID: approval.EffectID})
	reconciled, reconcileErr := c.API.Effects.Reconcile(ctx, identity, api.EffectReconcile{CommandMeta: meta(t, c, "reconcile", before.Revision), ID: approval.EffectID})
	h.mu.Lock()
	writes, queries := h.writes, h.queries
	h.mu.Unlock()
	t.Logf("actual target Run=%s root=%s unknownBefore=%s after=%#v getError=%v reconciled=%#v reconcileError=%v invokes=%d queries=%d", childID, receipt.RunID, before.Status, after, getErr, reconciled, reconcileErr, writes, queries)
	if getErr != nil || after.Status != "unknown_outcome" {
		t.Errorf("owner body-free effect Get after removal: %#v %v", after, getErr)
	}
	if reconcileErr != nil || reconciled.Status != "reconciled" {
		t.Errorf("owner read-only effect Reconcile after removal: %#v %v", reconciled, reconcileErr)
	}
	if writes != 1 || queries != 1 {
		t.Errorf("expected 1 Invoke / 1 read-only Query, got %d / %d", writes, queries)
	}
	d, e := sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	defer d.Close()
	var state string
	var unresolved int
	if e = d.QueryRow("SELECT status,effects_unresolved FROM execution_runs WHERE run_id=?", childID).Scan(&state, &unresolved); e != nil {
		t.Fatal(e)
	}
	if state != "failed" || reconcileErr == nil && unresolved != 0 {
		t.Fatalf("reconciliation reopened Run or did not save receipt: %s/%d", state, unresolved)
	}
	if reconcileErr == nil {
		again, e := c.API.Effects.Reconcile(ctx, identity, api.EffectReconcile{CommandMeta: meta(t, c, "reconcile", before.Revision), ID: approval.EffectID})
		if e != nil || again.Status != reconciled.Status {
			t.Fatal("receipt replay", again, e)
		}
		h.mu.Lock()
		defer h.mu.Unlock()
		if h.writes != 1 || h.queries != 1 {
			t.Fatal("receipt replay invoked Host")
		}
	}
}
