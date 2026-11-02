package anthropic_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func pollAnthropic(t *testing.T, description string, ready func() bool) {
	t.Helper()
	deadline := time.NewTimer(5 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for !ready() {
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal(description)
		}
	}
}

func functionTurn(name, arguments, callID, messageID string) wireEvents {
	stream := wireEvents{}
	start := textEvents().events[0]
	start["message"].(map[string]any)["id"] = messageID
	stream.events = append(stream.events, start)
	stream.add("content_block_start", map[string]any{"index": 0, "content_block": map[string]any{"type": "tool_use", "id": callID, "name": name, "input": map[string]any{}}})
	stream.add("content_block_delta", map[string]any{"index": 0, "delta": map[string]any{"type": "input_json_delta", "partial_json": arguments}})
	stream.add("content_block_stop", map[string]any{"index": 0})
	stream.add("message_delta", map[string]any{"delta": map[string]any{"stop_reason": "tool_use", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
	stream.add("message_stop", map[string]any{})
	return stream
}

func textBeforeToolTurn() wireEvents {
	arguments, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:anthropic", ResourceID: "resource:late", Operation: "update", BaseRevision: "1"}, "content": "late write"})
	stream := functionTurn("note_write", string(arguments), "toolu_late", "msg_late")
	for _, event := range stream.events {
		if _, ok := event["index"]; ok {
			event["index"] = 1
		}
	}
	text := textEvents()
	// A complete text block precedes a valid tool block. The prefix ends
	// during text, so its late remainder would succeed without cancellation.
	stream.events = append(append(append([]map[string]any{}, stream.events[:1]...), text.events[1:4]...), stream.events[1:]...)
	return stream
}

type sourceHost struct {
	fixtureHost
	text  string
	reads atomic.Int32
}

func (h *sourceHost) Read(_ context.Context, request api.HostReadRequest) (api.HostReadResult, error) {
	h.reads.Add(1)
	return api.HostReadResult{Source: request.Source, Text: h.text, Format: "text/markdown"}, nil
}
func (*sourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{}, api.Denied("NOT_USED")
}

type afterTool struct {
	api.ToolInvoker
	entered chan struct{}
	release <-chan struct{}
	once    *sync.Once
}

func (b afterTool) Invoke(ctx context.Context, call api.ToolCall) (api.ToolResult, error) {
	result, err := b.ToolInvoker.Invoke(ctx, call)
	b.once.Do(func() { close(b.entered) })
	select {
	case <-b.release:
	case <-ctx.Done():
		return api.ToolResult{}, ctx.Err()
	}
	return result, err
}

func TestRevokedSourceCannotEnterNextAnthropicRequest(t *testing.T) {
	const privateText = "synthetic-source-body-for-anthropic"
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		body, err := io.ReadAll(r.Body)
		if err != nil || !strings.Contains(string(body), privateText) {
			t.Error("first actual request did not carry authorized source", err)
		}
		stream := functionTurn("agents_discover", "{}", "call_discover", "resp_discover")
		stream.write(w)
	}))
	t.Cleanup(server.Close)
	f, engine, _ := capturedAnthropicFixture(t, server.URL, []string{"agents.discover"}, nil)
	host := &sourceHost{text: privateText}
	lease, err := f.core.API.Host.Attach(context.Background(), anthropicOwner, api.HostAttachCommand{WorkspaceID: "workspace:source", Capabilities: []string{"note.read"}}, host)
	if err != nil {
		t.Fatal(err)
	}
	agent, err := f.core.API.Assistant.Get(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil {
		t.Fatal(err)
	}
	recipient := api.GrantRecipient{AgentID: agent.ID, ModelBindingRevision: agent.ModelBindingRevision, ProviderID: agent.Model.ProviderID, ModelID: agent.Model.ModelID, Protocol: agent.Model.Protocol, Endpoint: agent.Model.Endpoint}
	digest := sha256.Sum256([]byte(privateText))
	source := api.SourceSnapshot{ResourceID: "source:one", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:anthropic", OriginViewID: "view:anthropic", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(digest[:]), ScopeResourceIDs: []string{}}
	grant, err := f.core.API.Grants.Create(context.Background(), anthropicOwner, api.GrantCreate{CommandMeta: f.meta(""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{"read", "send"}})
	if err != nil {
		t.Fatal(err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	var once, enteredOnce sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	engine.prepare = func(in api.EngineInput) api.EngineInput {
		in.Tools = afterTool{ToolInvoker: in.Tools, entered: entered, release: release, once: &enteredOnce}
		return in
	}
	session, err := f.core.API.Conversation.GetSession(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: f.session})
	if err != nil {
		t.Fatal(err)
	}
	run, err := f.core.API.Conversation.StartRun(context.Background(), anthropicOwner, api.RunStart{CommandMeta: f.meta(session.Revision), SessionID: f.session, Intent: "use authorized source once", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if err != nil {
		t.Fatal(err)
	}
	waitSignal(t, entered)
	if _, err := f.core.API.Grants.Revoke(context.Background(), anthropicOwner, api.GrantRevoke{CommandMeta: f.meta(grant.Revision), ID: grant.ID}); err != nil {
		t.Fatal(err)
	}
	unblock()
	if _, err := f.core.API.Conversation.GetRun(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: run.RunID}); err == nil {
		t.Fatal("revoked source remained publicly readable")
	}
	db := anthropicDB(t, f)
	pollAnthropic(t, "revoked execution did not finish", func() bool {
		var status, reason string
		if err := db.QueryRow("SELECT status,reason FROM execution_runs WHERE run_id=?", run.RunID).Scan(&status, &reason); err != nil {
			t.Fatal(err)
		}
		if status == "failed" {
			if reason != "ACCESS_REVOKED" {
				t.Fatal("revoked result was not redacted", reason)
			}
			return true
		}
		return false
	})
	var attempts int
	if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", run.RunID).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if requests.Load() != 1 || attempts != 1 || host.reads.Load() == 0 {
		t.Fatal("old source escaped into next native replay request", requests.Load(), attempts, host.reads.Load())
	}
}

func TestCanceledAnthropicStreamRejectsLateToolsAndNextRunWorks(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requests.Add(1) > 1 {
			w.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(w, successfulTextStream)
			return
		}
		stream := textBeforeToolTurn()
		prefix := wireEvents{events: stream.events[:3]}
		prefix.write(w)
		w.(http.Flusher).Flush()
		close(entered)
		<-release
		// These are the valid remainder of the same response, not malformed
		// late tool frames that would fail even without durable cancellation.
		remainder := wireEvents{events: stream.events[3:]}
		remainder.write(w)
	}))
	t.Cleanup(server.Close)
	writer := &fixtureWriter{}
	f := newAnthropicFixture(t, server.URL, bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t)
	waitSignal(t, entered)
	db := anthropicDB(t, f)
	pollAnthropic(t, "stream did not persist partial text before cancellation", func() bool {
		var count int
		if err := db.QueryRow("SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='text.delta'", run).Scan(&count); err != nil {
			t.Fatal(err)
		}
		return count > 0
	})
	current, err := f.core.API.Conversation.GetRun(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: run})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.core.API.Approvals.Cancel(context.Background(), anthropicOwner, api.RunCancel{CommandMeta: f.meta(current.Revision), ID: run}); err != nil {
		t.Fatal(err)
	}
	unblock()
	terminal := f.terminal(t, run)
	if terminal.Status != "canceled" || requests.Load() != 1 || writer.writes.Load() != 0 {
		t.Fatal("late completed batch escaped cancellation", terminal, requests.Load(), writer.writes.Load())
	}
	pollAnthropic(t, "canceled producer did not settle", func() bool {
		var state, knowledge string
		var ended, reserved, charged int
		if err := db.QueryRow("SELECT state,knowledge,producer_ended,reserved_tokens,charged_tokens FROM model_attempts WHERE run_id=?", run).Scan(&state, &knowledge, &ended, &reserved, &charged); err != nil {
			t.Fatal(err)
		}
		if state != "settled" {
			return false
		}
		if ended != 1 || knowledge != "unknown" || charged != reserved || charged == 0 {
			t.Fatal("in-flight cancellation refunded unknown work", state, knowledge, ended, reserved, charged)
		}
		return true
	})
	var approvals int
	if err := db.QueryRow("SELECT count(*) FROM access_approvals WHERE run_id=?", run).Scan(&approvals); err != nil || approvals != 0 {
		t.Fatal("late approval admitted", approvals, err)
	}
	next := f.terminal(t, f.start(t))
	if next.Status != "succeeded" || requests.Load() != 2 || writer.writes.Load() != 0 {
		encoded, _ := json.Marshal(next)
		t.Fatal("cancel leaked into next run", string(encoded), requests.Load(), writer.writes.Load())
	}
}
