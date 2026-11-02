package foundation_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestDefaultAnthropicCheckpointUsesRegistryIdentityAfterInterruptedResumeReopen(t *testing.T) {
	testDefaultProtocolCheckpointRecovery(t, "anthropic-messages", "huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1", writeDefaultAnthropicNoteCall)
}

func writeDefaultAnthropicNoteCall(w http.ResponseWriter) {
	arguments, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:one", ResourceID: "note:one", Operation: "update", BaseRevision: "1"}, "content": "proposed default Anthropic content"})
	events := []struct {
		name string
		data map[string]any
	}{
		{"message_start", map[string]any{"message": map[string]any{"id": "msg_recovery", "type": "message", "role": "assistant", "model": "fixture-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 10, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}}}},
		{"content_block_start", map[string]any{"index": 0, "content_block": map[string]any{"type": "tool_use", "id": "call_recovery", "name": "note_write", "input": map[string]any{}}}},
		{"content_block_delta", map[string]any{"index": 0, "delta": map[string]any{"type": "input_json_delta", "partial_json": string(arguments)}}},
		{"content_block_stop", map[string]any{"index": 0}},
		{"message_delta", map[string]any{"delta": map[string]any{"stop_reason": "tool_use", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 2}}},
		{"message_stop", map[string]any{}},
	}
	w.Header().Set("Content-Type", "text/event-stream")
	for _, event := range events {
		event.data["type"] = event.name
		encoded, err := json.Marshal(event.data)
		if err != nil {
			panic(err)
		}
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.name, encoded)
	}
}

// The default Registry routes a real SDK metadata GET. Its actual call must end
// before Core releases the Provider/database/Profile; cancellation alone is not
// claimed as producer completion. No Engine/Probe/transport is injected here.
func TestDefaultAnthropicProbeStopJoinsActualCallBeforeProfileCleanup(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("default-anthropic-probe", "owner", true)
	const secret = "synthetic-private-anthropic-probe-key"
	const ref = "credential:44444444444444444444444444444444"
	var gets, posts atomic.Int32
	entered, returned := make(chan struct{}), make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	releaseHTTP := func() { releaseOnce.Do(func() { close(release) }) }
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			posts.Add(1)
			t.Error("metadata Probe issued a generation request")
			w.WriteHeader(400)
			return
		}
		if gets.Add(1) != 1 {
			t.Error("duplicate metadata Probe")
			w.WriteHeader(400)
			return
		}
		if r.URL.Path != "/v1/models/fixture-model" || r.Header.Get("X-Api-Key") != secret || r.Header.Get("Anthropic-Version") != "2023-06-01" {
			t.Error("default Probe destination/private credential mismatch")
		}
		close(entered)
		defer close(returned)
		select {
		case <-r.Context().Done():
		case <-release:
		}
	}))
	t.Cleanup(server.Close)
	root := privateRoot(t)
	locator := filepath.Join(root, "anthropic-probe")
	core, err := bootstrap.Open(ctx, root, locator)
	if err != nil {
		t.Fatal(err)
	}
	stop := func(c *bootstrap.Core) {
		t.Helper()
		if err := c.RequestStop(); err != nil {
			t.Error(err)
		}
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := c.WaitClosed(bounded); err != nil {
			t.Error("actual Core cleanup did not join", err)
		}
	}
	t.Cleanup(func() { releaseHTTP(); stop(core) })
	status, err := core.API.Service.Status(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := core.Credentials.Register(ctx, status.Profile.ProfileID, ref, "session-memory", []byte(secret)); err != nil {
		t.Fatal(err)
	}
	draft := api.ModelBindingDraft{ProviderID: "loopback", Protocol: "anthropic-messages", Endpoint: server.URL, ModelID: "fixture-model", CredentialRef: ref}
	meta := api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: "anthropic-probe-agent", IdempotencyKey: "anthropic-probe-agent"}
	if _, err := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta, Draft: api.AgentDraft{Name: "Anthropic metadata", Model: &draft}}); err != nil {
		t.Fatal(err)
	}
	listed, err := core.API.Assistant.ListModels(ctx, owner, api.PageQuery{ProfileID: status.Profile.ProfileID})
	if err != nil || len(listed.Items) != 1 || listed.Items[0].Protocol != "anthropic-messages" || !listed.Items[0].Available {
		t.Fatal("default selector did not advertise the actual registered/credentialed protocol", listed, err)
	}
	captured := core.API.Assistant
	query := api.ModelTest{ProfileID: status.Profile.ProfileID, Model: draft}
	result := make(chan error, 1)
	go func() { _, err := captured.TestModel(ctx, owner, query); result <- err }()
	waited := false
	t.Cleanup(func() {
		releaseHTTP()
		if !waited {
			select {
			case <-result:
			case <-time.After(5 * time.Second):
				t.Error("actual TestModel did not return during failed-case cleanup")
			}
		}
	})
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("default Anthropic metadata SDK was not entered")
	}
	if err := core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	_, err = captured.TestModel(context.Background(), owner, query)
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("captured Probe bypassed synchronous stop", err)
	}
	if err := core.Close(); err != nil {
		t.Fatal("normal cancellation did not drain the default Registry", err)
	}
	<-core.Done()
	select {
	case err := <-result:
		waited = true
		if err == nil {
			t.Fatal("canceled actual Probe reported success")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Core cleanup preceded actual TestModel return")
	}
	select {
	case <-returned:
	case <-time.After(3 * time.Second):
		t.Fatal("provider handler did not observe cancellation")
	}
	if gets.Load() != 1 || posts.Load() != 0 {
		t.Fatal("Probe/shutdown sent additional HTTP", gets.Load(), posts.Load())
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
	for _, query := range []string{"SELECT count(*) FROM execution_runs", "SELECT count(*) FROM model_attempts"} {
		var n int
		if err := db.QueryRow(query).Scan(&n); err != nil || n != 0 {
			t.Fatal("metadata Probe created model accounting or Run", query, n, err)
		}
	}
	reopened, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal("normal Done retained the Profile lock", err)
	}
	t.Cleanup(func() { stop(reopened) })
	_, err = reopened.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: status.Profile.ProfileID, Model: draft})
	if !errors.As(err, &fault) || fault.Reason != "CREDENTIAL_MISSING" {
		t.Fatal("reopen fabricated availability of the old session-memory credential", err)
	}
	_, err = captured.TestModel(context.Background(), owner, query)
	if !errors.As(err, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("old captured service accessed closed provider/DB", err)
	}
	if gets.Load() != 1 || posts.Load() != 0 {
		t.Fatal("reopen with missing credential reached the SDK")
	}
	t.Log("default third selector + real SDK metadata GET; Stop gate/actual call return/Close/Done/Profile reopen; old session secret remains missing, Run0/attempt0/POST0")
}
