package foundation_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// This uses the default production Engine/Inspector and real Broker/Blob/UoW.
// Only the remote provider and the already-rejected Host boundary are controlled.
func TestDefaultResponsesCheckpointUsesRegistryIdentityAfterInterruptedResumeReopen(t *testing.T) {
	testDefaultProtocolCheckpointRecovery(t, "openai-responses", "huhu-openai-go-3.44.0-responses-bridge-v1", writeDefaultResponsesNoteCall)
}

func testDefaultProtocolCheckpointRecovery(t *testing.T, protocol, version string, firstReply func(http.ResponseWriter)) {
	t.Helper()
	ctx := context.Background()
	owner := api.NewConnectionIdentity("default-responses-recovery", "owner", true)
	const key = "synthetic-default-recovery-key"
	const ref = "credential:33333333333333333333333333333333"
	const intent = "original accepted 请求 <>& {\"literal\":1}\nline\u2028end"
	var posts atomic.Int32
	resumeEntered := make(chan struct{})
	resumeReturned := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	releaseHTTP := func() { releaseOnce.Do(func() { close(release) }) }
	postPath := "/v1/responses"
	if protocol == "anthropic-messages" {
		postPath = "/v1/messages"
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorized := r.Header.Get("Authorization") == "Bearer "+key
		if protocol == "anthropic-messages" {
			authorized = r.Header.Get("X-Api-Key") == key && r.Header.Get("Anthropic-Version") == "2023-06-01"
		}
		if r.Method != "POST" || r.URL.Path != postPath || !authorized {
			t.Error("default Registry selected the wrong endpoint or credential", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		var request struct {
			Input    []json.RawMessage `json:"input"`
			Messages []json.RawMessage `json:"messages"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Error(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		switch posts.Add(1) {
		case 1:
			firstReply(w)
		case 2:
			decisionPresent := len(request.Input) == 5 && bytes.Contains(request.Input[1], []byte(strings.TrimSpace(api.ShortTermMarker))) && bytes.Contains(request.Input[2], []byte("original accepted")) && bytes.Contains(request.Input[4], []byte("APPROVAL_REJECTED")) && bytes.Contains(request.Input[4], []byte(`"call_id":"call_recovery"`))
			if protocol == "anthropic-messages" {
				decisionPresent = len(request.Messages) == 4 && bytes.Contains(request.Messages[0], []byte(strings.TrimSpace(api.ShortTermMarker))) && bytes.Contains(request.Messages[1], []byte("original accepted")) && bytes.Contains(request.Messages[3], []byte("APPROVAL_REJECTED")) && bytes.Contains(request.Messages[3], []byte(`"tool_use_id":"call_recovery"`))
			}
			if !decisionPresent {
				t.Error("real Resume lost the original provider call or user decision")
			}
			close(resumeEntered)
			defer close(resumeReturned)
			// This is a real in-flight HTTP request. Cancellation must end it;
			// the fallback is used only by failed-case cleanup.
			select {
			case <-r.Context().Done():
			case <-release:
			}
		default:
			t.Error("qualification or shutdown sent a new model request")
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	t.Cleanup(server.Close)
	root := privateRoot(t)
	locator := filepath.Join(root, "responses-recovery")
	stop := func(core *bootstrap.Core) {
		t.Helper()
		if err := core.RequestStop(); err != nil {
			t.Error(err)
		}
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := core.WaitClosed(bounded); err != nil {
			t.Error(err)
		}
	}
	writer := &recoveryIntentWriter{}
	core, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{NoteWriter: writer, Budget: api.BudgetPolicy{RootTokenLimit: "100000", ProfileTokenLimit: "1000000"}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { releaseHTTP(); stop(core) })
	writer.host = core.API.Host
	if _, err := core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.write"}}, recoveryIntentRemote{calls: &writer.calls}); err != nil {
		t.Fatal(err)
	}
	status, err := core.API.Service.Status(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	meta := func(command, revision string) api.CommandMeta {
		return api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: command, IdempotencyKey: command, ExpectedRevision: revision}
	}
	if _, err := core.Credentials.Register(ctx, status.Profile.ProfileID, ref, "session-memory", []byte(key)); err != nil {
		t.Fatal(err)
	}
	modelEndpoint := server.URL + "/v1"
	if protocol == "anthropic-messages" {
		modelEndpoint = server.URL
	}
	agentName := "default Responses recovery"
	if protocol == "anthropic-messages" {
		agentName = "default Anthropic recovery"
	}
	agent, err := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta("default-recovery-agent", ""), Draft: api.AgentDraft{
		Name: agentName, Persona: "literal persona {\"source\":\"unchanged\"}", AllowedTools: []string{"note.write"},
		Model: &api.ModelBindingDraft{Protocol: protocol, ProviderID: "loopback", Endpoint: modelEndpoint, ModelID: "fixture-model", CredentialRef: ref},
	}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("default-recovery-session", ""), Kind: "direct", MemberIDs: []string{agent.ID}, WorkspaceID: "workspace:one"})
	if err != nil {
		t.Fatal(err)
	}
	receipt, err := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("default-recovery-run", session.Revision), SessionID: session.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	var approval api.Approval
	deadline := time.NewTimer(8 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for approval.ID == "" {
		page, err := core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: status.Profile.ProfileID})
		if err != nil {
			t.Fatal(err)
		}
		for _, item := range page.Items {
			if item.RunID == receipt.RunID && item.Status == "pending" {
				approval = item
			}
		}
		if approval.ID != "" {
			break
		}
		run, err := core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: receipt.RunID})
		if err != nil {
			t.Fatal(err)
		}
		if run.Status == "failed" || run.Status == "succeeded" || run.Status == "canceled" {
			t.Fatal("default production CP was not published", run.Status, run.Reason)
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("no real default protocol approval")
		}
	}
	if posts.Load() != 1 || writer.calls.Load() != 0 {
		t.Fatal("approval executed a second request or Host write")
	}
	if _, err := core.API.Approvals.Resolve(ctx, owner, api.ApprovalResolve{CommandMeta: meta("default-recovery-reject", approval.Revision), ID: approval.ID, EffectID: approval.EffectID, Decision: "reject", PreviewHash: approval.Preview.PreviewHash}); err != nil {
		t.Fatal(err)
	}
	select {
	case <-resumeEntered:
	case <-time.After(8 * time.Second):
		t.Fatal("actual default Engine.Resume did not issue its second HTTP")
	}
	stop(core)
	select {
	case <-resumeReturned:
	case <-time.After(3 * time.Second):
		t.Fatal("Core.Done preceded actual provider handler completion")
	}
	if posts.Load() != 2 || writer.calls.Load() != 0 {
		t.Fatal("shutdown changed actual work counts")
	}

	db, err := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	var artifact api.CheckpointArtifact
	var encoded, savedPosition string
	if err := db.QueryRow("SELECT artifact_json FROM execution_checkpoints WHERE run_id=?", receipt.RunID).Scan(&encoded); err != nil || json.Unmarshal([]byte(encoded), &artifact) != nil {
		t.Fatal("missing complete checkpoint metadata", err)
	}
	if artifact.RunID != receipt.RunID || artifact.Metadata.EngineVersion != version || artifact.Metadata.FormatVersion != "1" || !strings.HasPrefix(artifact.Metadata.DefinitionDigest, "sha256:") {
		t.Fatal("Broker did not use pinned protocol identity", artifact.Metadata)
	}
	if err := db.QueryRow("SELECT execution_position_json FROM execution_runs WHERE run_id=?", receipt.RunID).Scan(&savedPosition); err != nil {
		t.Fatal(err)
	}
	var position api.ExecutionPosition
	if json.Unmarshal([]byte(savedPosition), &position) != nil || position.Phase != "resume" || position.Continuation == nil || position.Continuation.Checkpoint != artifact || position.Decision == nil || position.Decision.Status != "denied" || position.Decision.Reason != "APPROVAL_REJECTED" {
		t.Fatal("actual Resume position was not persisted", savedPosition)
	}
	cpPath := filepath.Join(locator, "checkpoints", strings.TrimPrefix(artifact.Ref, "cp:")+".cp")
	complete, err := os.ReadFile(cpPath)
	if err != nil || len(complete) < 12 || string(complete[:8]) != "HUHUCP1\n" {
		t.Fatal("missing complete original Blob envelope", err)
	}
	header := int(binary.BigEndian.Uint32(complete[8:12]))
	if header <= 0 || header > len(complete)-12 {
		t.Fatal("invalid original Blob header size")
	}
	payload := complete[12+header:]
	var state struct{ Format, Engine, Protocol, RunID, SessionID, ProtocolState string }
	if json.Unmarshal(payload, &state) != nil || state.Format != "huhu-model-state-v2" || state.Engine != version || state.Protocol != protocol || state.RunID != receipt.RunID || state.SessionID != session.ID || state.ProtocolState == "" {
		t.Fatal("SDK state and Broker envelope use different protocol identities", state)
	}
	digest := sha256.Sum256(payload)
	if artifact.Size != int64(len(payload)) || artifact.Digest != "sha256:"+hex.EncodeToString(digest[:]) {
		t.Fatal("original payload digest does not match the Artifact")
	}
	var attempts, known, unknown, ended, charged int
	readAttempts := func() {
		t.Helper()
		if err := db.QueryRow("SELECT count(*),sum(CASE WHEN knowledge='known' THEN 1 ELSE 0 END),sum(CASE WHEN knowledge='unknown' THEN 1 ELSE 0 END),sum(producer_ended),sum(charged_tokens) FROM model_attempts WHERE run_id=?", receipt.RunID).Scan(&attempts, &known, &unknown, &ended, &charged); err != nil {
			t.Fatal(err)
		}
	}
	readAttempts()
	if attempts != 2 || known != 1 || unknown != 1 || ended != 2 || charged <= 12 {
		t.Fatal("actual request settlement was lost", attempts, known, unknown, ended, charged)
	}
	chargedBefore := charged

	// There is no injected Engine/Inspector or new Host on reopen. The default
	// registry must qualify its own actual Responses CP without provider I/O.
	reopened, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { stop(reopened) })
	missing, err := reopened.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: receipt.RunID})
	if err != nil || missing.State != "blocked" || missing.Reason != "CREDENTIAL_MISSING" {
		t.Fatal("reopen bypassed missing session-memory credential", missing, err)
	}
	_, err = reopened.Credentials.Register(ctx, status.Profile.ProfileID, ref, "session-memory", []byte(key))
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Reason != "CREDENTIAL_REF_REUSED" {
		t.Fatal("fixture reused an already-reserved credential identity", err)
	}
	// Pure-Inspector positive control only: in this disposable paused Profile,
	// simulate the current metadata gate. No secret is restored to the provider,
	// and no production Run/config/position/CP/attempt row is fabricated.
	changed, err := db.Exec("UPDATE credential_metadata SET state='available' WHERE credential_ref=? AND profile_id=?", ref, status.Profile.ProfileID)
	if err != nil {
		t.Fatal(err)
	}
	if n, err := changed.RowsAffected(); err != nil || n != 1 {
		t.Fatal("missing controlled current-credential row", n, err)
	}
	qualification, err := reopened.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: receipt.RunID})
	if err != nil || qualification.State != "ready" || qualification.RunID != receipt.RunID || qualification.RootRunID != receipt.RunID {
		t.Fatal("same Registry could not inspect its original CP", qualification, err)
	}
	current, err := reopened.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: receipt.RunID})
	if err != nil || current.ID != receipt.RunID || current.AgentID != agent.ID || current.Status != "interrupted" {
		t.Fatal("qualification replaced or resumed the original Run", current, err)
	}
	var afterPosition, afterArtifact string
	if err := db.QueryRow("SELECT execution_position_json FROM execution_runs WHERE run_id=?", receipt.RunID).Scan(&afterPosition); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow("SELECT artifact_json FROM execution_checkpoints WHERE run_id=?", receipt.RunID).Scan(&afterArtifact); err != nil {
		t.Fatal(err)
	}
	if savedPosition != afterPosition || encoded != afterArtifact {
		t.Fatal("pure inspection rewrote the original position or artifact")
	}
	after, err := os.ReadFile(cpPath)
	if err != nil || !bytes.Equal(complete, after) {
		t.Fatal("qualification modified the complete immutable Blob", err)
	}
	readAttempts()
	if attempts != 2 || known != 1 || unknown != 1 || ended != 2 || charged != chargedBefore {
		t.Fatal("qualification reset usage or settled twice", attempts, known, unknown, ended, charged)
	}
	for query, want := range map[string]int{"SELECT count(*) FROM execution_runs": 1, "SELECT count(*) FROM execution_checkpoints": 1, "SELECT count(*) FROM execution_continuations WHERE state='completed'": 1} {
		var actual int
		if err := db.QueryRow(query).Scan(&actual); err != nil || actual != want {
			t.Fatal("qualification executed work", query, actual, err)
		}
	}
	if posts.Load() != 2 || writer.calls.Load() != 0 {
		t.Fatal("pure metadata recovery performed model or Host I/O")
	}
	if !reflect.DeepEqual(position.Decision, &api.ToolResult{Status: "denied", EffectID: approval.EffectID, Reason: "APPROVAL_REJECTED"}) {
		t.Fatal("recovery changed the user rejection decision", position.Decision)
	}
	t.Log("default Registry: real protocol CP/Resume interruption; reopen correctly blocked/CREDENTIAL_MISSING and old ref cannot Register again; simulated current credential metadata gives pure-Inspector ready with same Run/Artifact/decision/unknown charge, HTTP2/Host0, no restored secret")
}

func writeDefaultResponsesNoteCall(w http.ResponseWriter) {
	arguments, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:one", ResourceID: "note:one", Operation: "update", BaseRevision: "1"}, "content": "proposed default Responses content"})
	item := map[string]any{"id": "fc_recovery", "type": "function_call", "call_id": "call_recovery", "name": "note_write", "arguments": string(arguments), "status": "completed"}
	response := func(status string, output []any) map[string]any {
		return map[string]any{"id": "resp_recovery", "object": "response", "model": "fixture-model", "status": status, "output": output}
	}
	completed := response("completed", []any{item})
	completed["usage"] = map[string]any{"input_tokens": 10, "output_tokens": 2, "total_tokens": 12}
	events := []struct {
		name string
		data map[string]any
	}{
		{"response.created", map[string]any{"response": response("in_progress", []any{})}},
		{"response.in_progress", map[string]any{"response": response("in_progress", []any{})}},
		{"response.output_item.added", map[string]any{"output_index": 0, "item": map[string]any{"id": "fc_recovery", "type": "function_call", "call_id": "call_recovery", "name": "note_write", "arguments": "", "status": "in_progress"}}},
		{"response.function_call_arguments.delta", map[string]any{"output_index": 0, "item_id": "fc_recovery", "delta": string(arguments)}},
		{"response.function_call_arguments.done", map[string]any{"output_index": 0, "item_id": "fc_recovery", "name": "note_write", "arguments": string(arguments)}},
		{"response.output_item.done", map[string]any{"output_index": 0, "item": item}},
		{"response.completed", map[string]any{"response": completed}},
	}
	for sequence, event := range events {
		event.data["type"], event.data["sequence_number"] = event.name, sequence
		encoded, err := json.Marshal(event.data)
		if err != nil {
			panic(err)
		}
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.name, encoded)
	}
}
