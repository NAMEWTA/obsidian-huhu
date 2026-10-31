package foundation_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type inboxDecisionEngine struct {
	run     func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume  func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
	inspect func(api.CheckpointInspection) error
}

type inboxSourceHost struct{ body string }

func (inboxSourceHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (inboxSourceHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h inboxSourceHost) Read(_ context.Context, q api.HostReadRequest) (api.HostReadResult, error) {
	return api.HostReadResult{Source: q.Source, Text: h.body, Format: "text/markdown"}, nil
}
func (inboxSourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}

func (e inboxDecisionEngine) Run(ctx context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(ctx, in)
}
func (e inboxDecisionEngine) Resume(ctx context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.resume(ctx, in)
}
func (e inboxDecisionEngine) InspectCheckpoint(_ context.Context, q api.CheckpointInspection) error {
	if e.inspect == nil {
		return fmt.Errorf("unexpected checkpoint inspection")
	}
	return e.inspect(q)
}

func TestQualifiedWaitingSupplementIsPersistedBeforeActualResume(t *testing.T) {
	runWaitingSupplement(t, "normal")
}

func TestInvalidWaitingSupplementDoesNotLeaveRunningClaimOrPins(t *testing.T) {
	runWaitingSupplement(t, "invalid")
}

func TestSavedResumeInboxReopensWithoutLaterMessage(t *testing.T) {
	runWaitingSupplement(t, "reopen")
}

func TestRevokedWaitingSupplementFailsBodyFreeWithoutResume(t *testing.T) {
	runWaitingSupplement(t, "revoke")
}

func runWaitingSupplement(t *testing.T, mode string) {
	corrupt := mode == "invalid"
	ctx := context.Background()
	owner := api.NewConnectionIdentity("resume-inbox", "owner", true)
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	locator := filepath.Join(root, "one")
	created := make(chan api.Delegation, 1)
	resumed := make(chan api.EngineResumeInput, 1)
	leafEntered := make(chan struct{})
	leafRelease, resumeRelease := make(chan struct{}), make(chan struct{})
	var leafOnce, leafEnterOnce, resumeOnce sync.Once
	defer func() {
		leafOnce.Do(func() { close(leafRelease) })
		resumeOnce.Do(func() { close(resumeRelease) })
	}()
	var middleID, leafID string
	engine := inboxDecisionEngine{}
	engine.run = func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		switch in.Intent {
		case "root":
			v, err := in.Tools.Invoke(c, api.ToolCall{ID: "middle", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: middleID}, Task: "middle", Constraints: []string{}}})
			if err != nil {
				return api.EngineResult{}, err
			}
			created <- *v.Delegation
			cp, err := in.Checkpoints.Publish(c, bytes.NewBufferString("original-root-checkpoint"))
			if err != nil {
				return api.EngineResult{}, err
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
		case "middle":
			v, err := in.Tools.Invoke(c, api.ToolCall{ID: "leaf", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: leafID}, Task: "leaf", Constraints: []string{}}})
			if err != nil {
				return api.EngineResult{}, err
			}
			cp, err := in.Checkpoints.Publish(c, bytes.NewBufferString("original-middle-checkpoint"))
			if err != nil {
				return api.EngineResult{}, err
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
		case "leaf":
			leafEnterOnce.Do(func() { close(leafEntered) })
			select {
			case <-leafRelease:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
			return api.EngineResult{Status: "finished", Text: "leaf done"}, nil
		default:
			return api.EngineResult{}, fmt.Errorf("unexpected run %q", in.Intent)
		}
	}
	engine.resume = func(c context.Context, in api.EngineResumeInput) (api.EngineResult, error) {
		if in.Input.Intent == "root" {
			return api.EngineResult{Status: "finished", Text: "root done"}, nil
		}
		resumed <- in
		select {
		case <-resumeRelease:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "middle done"}, nil
	}
	core, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: engine})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = core.Close() })
	status, err := core.API.Service.Status(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	meta := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
	}
	var source api.SourceSnapshot
	if mode == "revoke" {
		h := inboxSourceHost{body: "controlled private source"}
		lease, e := core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read", "note.search"}}, h)
		if e != nil {
			t.Fatal(e)
		}
		digest := sha256.Sum256([]byte(h.body))
		source = api.SourceSnapshot{ResourceID: "resource:one", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(digest[:]), ScopeResourceIDs: []string{}}
	}
	create := func(name string, targets []string) api.Agent {
		a, e := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta("agent-"+name, ""), Draft: api.AgentDraft{Name: name, Persona: "persona " + name, AllowedTools: []string{"agents.delegate", "tasks.reply"}, AllowedCollaborationTargets: targets, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
		if e != nil {
			t.Fatal(e)
		}
		return a
	}
	leaf := create("leaf", nil)
	middle := create("middle", []string{leaf.ID})
	entry := create("entry", []string{middle.ID})
	middleID, leafID = middle.ID, leaf.ID
	var entryGrant, middleGrant api.Grant
	if mode == "revoke" {
		grant := func(a api.Agent, key string) api.Grant {
			recipient := api.GrantRecipient{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision, ProviderID: a.Model.ProviderID, ModelID: a.Model.ModelID, Protocol: a.Model.Protocol, Endpoint: a.Model.Endpoint}
			g, e := core.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(key, ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{"read", "send", "delegate", "deliver"}})
			if e != nil {
				t.Fatal(e)
			}
			return g
		}
		entryGrant = grant(entry, "grant-entry")
		middleGrant = grant(middle, "grant-middle")
		grant(leaf, "grant-leaf")
	}
	session, err := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{entry.ID}})
	if err != nil {
		t.Fatal(err)
	}
	refs, grants := []api.SourceSnapshot{}, []string{}
	if mode == "revoke" {
		refs, grants = []api.SourceSnapshot{source}, []string{entryGrant.ID}
	}
	rootRun, err := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("start", session.Revision), SessionID: session.ID, Intent: "root", SourceRefs: refs, GrantIDs: grants})
	if err != nil {
		t.Fatal(err)
	}
	var delegation api.Delegation
	select {
	case delegation = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("root did not delegate")
	}
	// Liveness only. On macos-15-intel the invalid supplement was still
	// waiting_children when 8s expired; the failed-state assertions stay.
	waitRun := func(runID, state string) {
		t.Helper()
		deadline := time.Now().Add(30 * time.Second)
		for {
			r, e := core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: runID})
			if e != nil {
				t.Fatal(e)
			}
			if r.Status == state {
				return
			}
			if time.Now().After(deadline) {
				t.Fatalf("run %s never reached %s: %#v", runID, state, r)
			}
			time.Sleep(5 * time.Millisecond)
		}
	}
	waitRun(delegation.ChildRunID, "waiting_children")
	if corrupt {
		select {
		case <-leafEntered:
		case <-time.After(30 * time.Second):
			t.Fatal("leaf did not enter Engine before invalid waiting supplement")
		}
	}
	db, err := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	message, err := core.API.Messages.Reply(ctx, owner, api.ReplyCommand{CommandMeta: meta("supplement", delegation.Revision), DelegationID: delegation.ID, Text: "actual waiting supplement", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	if corrupt {
		if _, err := db.Exec("UPDATE collaboration_messages SET kind='invalid' WHERE message_id=?", message.ID); err != nil {
			t.Fatal(err)
		}
	}
	if mode == "revoke" {
		if _, err := core.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta("revoke-middle", middleGrant.Revision), ID: middleGrant.ID}); err != nil {
			t.Fatal(err)
		}
	}
	leafOnce.Do(func() { close(leafRelease) })
	if mode == "revoke" {
		var state, reason string
		deadline := time.Now().Add(30 * time.Second)
		for {
			if err := db.QueryRow("SELECT status,reason FROM execution_runs WHERE run_id=?", delegation.ChildRunID).Scan(&state, &reason); err != nil {
				t.Fatal(err)
			}
			if state == "failed" {
				break
			}
			if time.Now().After(deadline) {
				t.Fatalf("revoked middle Run remained %s: %s", state, reason)
			}
			time.Sleep(5 * time.Millisecond)
		}
		var slots, pins int
		if err := db.QueryRow("SELECT count(*) FROM execution_runs WHERE child_slot<>0").Scan(&slots); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow("SELECT count(*) FROM task_config_pins WHERE run_id=?", delegation.ChildRunID).Scan(&pins); err != nil {
			t.Fatal(err)
		}
		if reason != "RECIPIENT_NOT_GRANTED" || slots != 0 || pins != 0 {
			t.Fatalf("revoked current source did not fail body-free: reason=%q slots=%d pins=%d", reason, slots, pins)
		}
		select {
		case in := <-resumed:
			t.Fatalf("revoked supplement reached Resume: %#v", in)
		default:
		}
		return
	}
	if corrupt {
		waitRun(delegation.ChildRunID, "failed")
		var reason, raw string
		var slots, pins int
		if err := db.QueryRow("SELECT reason,execution_position_json FROM execution_runs WHERE run_id=?", delegation.ChildRunID).Scan(&reason, &raw); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow("SELECT count(*) FROM execution_runs WHERE child_slot<>0").Scan(&slots); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow("SELECT count(*) FROM task_config_pins WHERE run_id=?", delegation.ChildRunID).Scan(&pins); err != nil {
			t.Fatal(err)
		}
		if reason != "RESUME_INBOX_INVALID" || slots != 0 || pins != 0 || bytes.Contains([]byte(raw), []byte(message.Text)) {
			t.Fatalf("known invalid resume packet leaked or retained work: reason=%q slots=%d pins=%d position=%q", reason, slots, pins, raw)
		}
		select {
		case in := <-resumed:
			t.Fatalf("invalid packet reached Engine.Resume: %#v", in)
		default:
		}
		return
	}
	var in api.EngineResumeInput
	select {
	case in = <-resumed:
	case <-time.After(30 * time.Second):
		t.Fatal("same middle Run did not resume")
	}
	if in.Input.RunID != delegation.ChildRunID || len(in.Input.Messages) != 0 || in.Input.ShortTerm == nil || in.Input.ShortTerm.BindingDigest == "" || len(in.Decision.Children) != 1 || in.Decision.Children[0].Text != "leaf done" || in.Decision.ResumeInbox == nil || len(in.Decision.ResumeInbox.Messages) != 1 {
		t.Fatalf("trusted continuation changed: %#v", in)
	}
	item := in.Decision.ResumeInbox.Messages[0]
	hash := sha256.Sum256([]byte(message.Text))
	ref := api.DerivedInput{Kind: "message", ID: message.ID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(hash[:]), Namespace: message.WorkThreadID, WorkThreadID: message.WorkThreadID}
	if item.Message != message || item.Ref != ref || api.ValidateResumeInbox(in.Decision.ResumeInbox) != nil {
		t.Fatalf("actual supplement identity changed: %#v", item)
	}
	reader, err := in.Input.Checkpoints.Open(ctx, in.Checkpoint)
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(reader)
	closeErr := reader.Close()
	if err != nil || closeErr != nil || string(body) != "original-middle-checkpoint" {
		t.Fatalf("original checkpoint changed: %q %v %v", body, err, closeErr)
	}
	var raw string
	if err := db.QueryRow("SELECT execution_position_json FROM execution_runs WHERE run_id=?", delegation.ChildRunID).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var position api.ExecutionPosition
	if json.Unmarshal([]byte(raw), &position) != nil || position.Phase != "resume" || position.Decision == nil || position.Decision.ResumeInbox == nil || len(position.Decision.ResumeInbox.Messages) != 1 || position.Decision.ResumeInbox.Messages[0] != item || position.Continuation == nil || position.Continuation.Checkpoint != in.Checkpoint {
		t.Fatalf("Resume was called before durable decision or changed CP: %#v", position)
	}
	if mode == "reopen" {
		task, err := core.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: delegation.ID})
		if err != nil {
			t.Fatal(err)
		}
		later, err := core.API.Messages.Reply(ctx, owner, api.ReplyCommand{CommandMeta: meta("later", task.Revision), DelegationID: task.ID, Text: "later message after saved decision", SourceRefs: []api.SourceSnapshot{}})
		if err != nil {
			t.Fatal(err)
		}
		// The root sends its delegation before it publishes its own checkpoint and
		// suspends. A stop before that suspension lands interrupts the root with no
		// continuation, and the whole tree is then correctly blocked (CHECKPOINT_MISSING,
		// seen on macos-15-intel). This contract is about the middle's saved decision.
		waitRun(rootRun.RunID, "waiting_children")
		if err := core.RequestStop(); err != nil {
			t.Fatal(err)
		}
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := core.WaitClosed(bounded); err != nil {
			t.Fatal(err)
		}
		inspected := make(chan api.CheckpointInspection, 16)
		second := inboxDecisionEngine{
			run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
				return api.EngineResult{}, fmt.Errorf("reopen restarted Run")
			},
			resume: func(context.Context, api.EngineResumeInput) (api.EngineResult, error) {
				return api.EngineResult{}, fmt.Errorf("read-only recovery executed Resume")
			},
			inspect: func(q api.CheckpointInspection) error {
				b, e := io.ReadAll(q.Reader)
				if e != nil || string(b) != "original-middle-checkpoint" {
					return fmt.Errorf("original CP changed on reopen: %q %v", b, e)
				}
				inspected <- q
				return nil
			},
		}
		reopened, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: second, ExecutorPaused: true})
		if err != nil {
			t.Fatal(err)
		}
		defer reopened.Close()
		qualification, err := reopened.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: delegation.ChildRunID})
		if err != nil || qualification.State != "ready" {
			t.Fatalf("saved decision was not recoverable: %#v %v", qualification, err)
		}
		select {
		case q := <-inspected:
			if q.Position.Phase != "resume" || q.Position.Decision == nil || q.Position.Decision.ResumeInbox == nil || len(q.Position.Decision.ResumeInbox.Messages) != 1 || q.Position.Decision.ResumeInbox.Messages[0] != item || q.Position.Decision.ResumeInbox.Messages[0].Message.ID == later.ID || q.Position.Continuation == nil || q.Position.Continuation.Checkpoint != in.Checkpoint {
				t.Fatalf("reopen merged later inbox or changed original decision: %#v", q.Position)
			}
		case <-time.After(time.Second):
			t.Fatal("recovery did not inspect original saved CP")
		}
		return
	}
	resumeOnce.Do(func() { close(resumeRelease) })
	waitRun(delegation.ChildRunID, "succeeded")
}

func TestResumeInboxBodyIdentityKeepsDistinctEqualTextAndRejectsMetadataRevision(t *testing.T) {
	body := "same bytes, different durable messages"
	hash := sha256.Sum256([]byte(body))
	ref := api.DerivedInput{Kind: "message", ID: "agent-message:one", Revision: "1", Hash: "sha256:" + hex.EncodeToString(hash[:]), Namespace: "thread:one", WorkThreadID: "thread:one"}
	item := api.ResumeInboxItem{Message: api.AgentMessage{ID: ref.ID, FromAgentID: "agent:one", ToAgentID: "agent:two", Text: body, CreatedAt: "2026-10-27T00:00:00Z", Kind: "reply", Status: "delivered", WorkThreadID: ref.WorkThreadID}, Ref: ref}
	second := item
	second.Message.ID = "agent-message:two"
	second.Ref.ID = second.Message.ID
	packet := &api.ResumeInbox{Messages: []api.ResumeInboxItem{item, second}}
	if err := api.ValidateResumeInbox(packet); err != nil {
		t.Fatalf("same text under two actual IDs was dropped: %v", err)
	}
	second.Ref.Revision = "2" // SQL status revision is not body revision.
	packet.Messages[1] = second
	if err := api.ValidateResumeInbox(packet); err == nil {
		t.Fatal("mutable row metadata revision was accepted as thread body identity")
	}
	packet.Messages[1] = item
	if err := api.ValidateResumeInbox(packet); err == nil {
		t.Fatal("same message ID was admitted twice")
	}
}
