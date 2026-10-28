package anthropic_test

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func anthropicShortTerm(t *testing.T, message any, intent string) api.ShortTermInput {
	t.Helper()
	encoded, err := json.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct {
		Role    string
		Content []struct{ Type, Text string }
	}
	if err = json.Unmarshal(encoded, &envelope); err != nil || envelope.Role != "user" || len(envelope.Content) != 1 || envelope.Content[0].Type != "text" || !strings.HasPrefix(envelope.Content[0].Text, api.ShortTermMarker) {
		t.Fatal("missing actual short-term Anthropic message", string(encoded), err)
	}
	var block api.ShortTermInput
	if err = json.Unmarshal([]byte(strings.TrimPrefix(envelope.Content[0].Text, api.ShortTermMarker)), &block); err != nil {
		t.Fatal("invalid short-term Anthropic message", err)
	}
	digest, err := api.CanonicalShortTermBinding(block)
	if err != nil || block.BindingDigest != digest || block.IntentHash != fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(intent))) {
		t.Fatal("short-term binding or accepted intent changed", block, err)
	}
	return block
}

func anthropicInitialPrefix(t *testing.T, messages []map[string]json.RawMessage, intent string) {
	t.Helper()
	if len(messages) < 2 {
		t.Fatal("missing complete initial Anthropic messages", len(messages))
	}
	if block := anthropicShortTerm(t, messages[0], intent); len(block.Entries) != 0 {
		t.Fatal("first Run invented prior short-term history", block)
	}
	var accepted struct {
		Role    string
		Content []struct{ Type, Text string }
	}
	encoded, err := json.Marshal(messages[1])
	if err != nil || json.Unmarshal(encoded, &accepted) != nil || accepted.Role != "user" || len(accepted.Content) != 1 || accepted.Content[0].Type != "text" || accepted.Content[0].Text != intent {
		t.Fatal("accepted Anthropic intent changed", string(encoded), err)
	}
}

func TestDefaultAnthropicPersistsTextAndSettledUsage(t *testing.T) {
	var requests atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if r.Method != http.MethodPost || r.URL.Path != "/v1/messages" || r.Header.Get("X-Api-Key") != "synthetic-anthropic-key" || r.Header.Get("Anthropic-Version") != "2023-06-01" {
			t.Errorf("unexpected explicit Anthropic destination or credential: %s %s", r.Method, r.URL.Path)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error("decode request", err)
		}
		select {
		case captured <- body:
		default:
			t.Error("unexpected additional model request")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		if _, err := fmt.Fprint(w, successfulTextStream); err != nil {
			t.Error("write response", err)
		}
	}))
	t.Cleanup(server.Close)

	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	core, err := bootstrap.OpenWithOptions(context.Background(), root, filepath.Join(root, "one"), bootstrap.Options{
		Budget: api.BudgetPolicy{RootTokenLimit: "1000000", ProfileTokenLimit: "10000000"},
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := core.RequestStop(); err != nil {
			t.Error("request core stop", err)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := core.WaitClosed(ctx); err != nil {
			t.Error("core did not actually drain", err)
		}
	})
	owner := api.NewConnectionIdentity("anthropic-protocol", "owner", true)
	status, err := core.API.Service.Status(context.Background(), owner)
	if err != nil {
		t.Fatal(err)
	}
	profile, epoch := status.Profile.ProfileID, status.Profile.CommandEpoch
	sequence := 0
	meta := func(revision string) api.CommandMeta {
		sequence++
		key := fmt.Sprintf("anthropic:%d", sequence)
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: profile, CommandEpoch: epoch, ExpectedRevision: revision}
	}
	ref := "credential:11111111111111111111111111111111"
	if _, err := core.Credentials.Register(context.Background(), profile, ref, "session-memory", []byte("synthetic-anthropic-key")); err != nil {
		t.Fatal(err)
	}
	agent, err := core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: meta(""), Draft: api.AgentDraft{
		Name: "Anthropic", Persona: `Keep literal {"sample":{"x":1}}.`,
		Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "anthropic-messages", Endpoint: server.URL, ModelID: "fixture-model", CredentialRef: ref},
	}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{
		CommandMeta: meta(""), Kind: "direct", Title: "Anthropic", MemberIDs: []string{agent.ID},
	})
	if err != nil {
		t.Fatal(err)
	}
	receipt, err := core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{
		CommandMeta: meta(session.Revision), SessionID: session.ID, Intent: "one intention", SourceRefs: []api.SourceSnapshot{},
	})
	if err != nil {
		t.Fatal(err)
	}
	run := waitForTerminal(t, core, owner, profile, receipt.RunID)
	if run.Status != "succeeded" {
		t.Fatalf("default Anthropic must finish successfully: %#v; physical HTTP=%d", run, requests.Load())
	}
	if requests.Load() != 1 {
		t.Fatal("unexpected physical HTTP count", requests.Load())
	}
	body := <-captured
	if body["model"] != "fixture-model" || body["stream"] != true || body["max_tokens"] != float64(4096) {
		t.Fatal("explicit bounded Anthropic stream missing", body)
	}
	for _, key := range []string{"previous_response_id", "conversation", "cache_control", "thinking", "context_management", "container"} {
		if _, ok := body[key]; ok {
			t.Fatal("unconfigured remote capability present", key)
		}
	}
	system, ok := body["system"].([]any)
	if !ok || len(system) != 1 {
		t.Fatal("literal system persona missing", body)
	}
	persona, ok := system[0].(map[string]any)
	if !ok || persona["type"] != "text" || persona["text"] != `Keep literal {"sample":{"x":1}}.` {
		t.Fatal("literal persona changed", system)
	}
	messages, ok := body["messages"].([]any)
	if !ok || len(messages) != 2 {
		t.Fatal("complete local initial messages missing", body)
	}
	if block := anthropicShortTerm(t, messages[0], "one intention"); len(block.Entries) != 0 {
		t.Fatal("first Run invented prior short-term history", block)
	}
	intent, ok := messages[1].(map[string]any)
	if !ok || intent["role"] != "user" {
		t.Fatal("accepted intent role changed", messages)
	}
	content, ok := intent["content"].([]any)
	if !ok || len(content) != 1 {
		t.Fatal("accepted intent content missing", intent)
	}
	text, ok := content[0].(map[string]any)
	if !ok || text["type"] != "text" || text["text"] != "one intention" {
		t.Fatal("accepted intent changed", content)
	}
	history, err := core.API.Conversation.History(context.Background(), owner, api.HistoryQuery{
		PageQuery: api.PageQuery{ProfileID: profile}, SessionID: session.ID,
	})
	if err != nil || len(history.Items) != 2 || history.Items[0].Text != "one intention" || history.Items[1].Text != "durable anthropic answer" {
		t.Fatal("durable messages", history, err)
	}
	if run.Usage == nil || run.Usage.Knowledge != "known" || run.Usage.InputTokens != "9" || run.Usage.OutputTokens != "4" {
		t.Fatal("settled usage", run.Usage)
	}
}

func waitForTerminal(t *testing.T, core *bootstrap.Core, owner api.RequestIdentity, profile, runID string) api.Run {
	t.Helper()
	timeout := time.NewTimer(8 * time.Second)
	defer timeout.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		run, err := core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: profile, ID: runID})
		if err != nil {
			t.Fatal(err)
		}
		if run.Status == "succeeded" || run.Status == "failed" || run.Status == "canceled" {
			return run
		}
		select {
		case <-tick.C:
		case <-timeout.C:
			t.Fatal("run did not terminate", run)
		}
	}
}

const successfulTextStream = `event: message_start
data: {"type":"message_start","message":{"id":"msg_fixture","type":"message","role":"assistant","model":"fixture-model","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":9,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"durable anthropic answer"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":4}}

event: message_stop
data: {"type":"message_stop"}

`
