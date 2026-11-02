package responses_test

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

func responsesShortTerm(t *testing.T, message any, intent string) api.ShortTermInput {
	t.Helper()
	encoded, err := json.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct{ Role, Content string }
	if err = json.Unmarshal(encoded, &envelope); err != nil || envelope.Role != "user" || !strings.HasPrefix(envelope.Content, api.ShortTermMarker) {
		t.Fatal("missing actual short-term Responses item", string(encoded), err)
	}
	var block api.ShortTermInput
	if err = json.Unmarshal([]byte(strings.TrimPrefix(envelope.Content, api.ShortTermMarker)), &block); err != nil {
		t.Fatal("invalid short-term Responses item", err)
	}
	digest, err := api.CanonicalShortTermBinding(block)
	if err != nil || block.BindingDigest != digest || block.IntentHash != fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(intent))) {
		t.Fatal("short-term binding or accepted intent changed", block, err)
	}
	return block
}

func responsesInitialPrefix(t *testing.T, input []json.RawMessage, intent string) {
	t.Helper()
	if len(input) < 3 {
		t.Fatal("missing complete initial Responses prefix", len(input))
	}
	var persona, accepted struct{ Role, Content string }
	if json.Unmarshal(input[0], &persona) != nil || json.Unmarshal(input[2], &accepted) != nil || persona.Role != "system" || persona.Content != `Keep literal {"sample":{"x":1}}.` || accepted.Role != "user" || accepted.Content != intent {
		t.Fatal("initial persona or accepted intention changed", string(input[0]), string(input[2]))
	}
	if block := responsesShortTerm(t, input[1], intent); len(block.Entries) != 0 {
		t.Fatal("first Run invented prior short-term history", block)
	}
}

func TestDefaultResponsesPersistsTextAndSettledUsage(t *testing.T) {
	var requests atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if r.Method != http.MethodPost || r.URL.Path != "/v1/responses" || r.Header.Get("Authorization") != "Bearer synthetic-responses-key" {
			t.Errorf("unexpected explicit Responses destination or credential: %s %s", r.Method, r.URL.Path)
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
	owner := api.NewConnectionIdentity("responses-protocol", "owner", true)
	status, err := core.API.Service.Status(context.Background(), owner)
	if err != nil {
		t.Fatal(err)
	}
	profile, epoch := status.Profile.ProfileID, status.Profile.CommandEpoch
	sequence := 0
	meta := func(revision string) api.CommandMeta {
		sequence++
		key := fmt.Sprintf("responses:%d", sequence)
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: profile, CommandEpoch: epoch, ExpectedRevision: revision}
	}
	ref := "credential:11111111111111111111111111111111"
	if _, err := core.Credentials.Register(context.Background(), profile, ref, "session-memory", []byte("synthetic-responses-key")); err != nil {
		t.Fatal(err)
	}
	agent, err := core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: meta(""), Draft: api.AgentDraft{
		Name: "Responses", Persona: `Keep literal {"sample":{"x":1}}.`,
		Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "openai-responses", Endpoint: server.URL + "/v1", ModelID: "fixture-model", CredentialRef: ref},
	}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{
		CommandMeta: meta(""), Kind: "direct", Title: "Responses", MemberIDs: []string{agent.ID},
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
		t.Fatalf("default Responses must finish successfully: %#v; physical HTTP=%d", run, requests.Load())
	}
	if requests.Load() != 1 {
		t.Fatal("unexpected physical HTTP count", requests.Load())
	}
	body := <-captured
	if body["model"] != "fixture-model" || body["stream"] != true || body["max_output_tokens"] != float64(4096) || body["store"] != false || body["background"] != false {
		t.Fatal("explicit bounded stateless streaming request missing", body)
	}
	include, ok := body["include"].([]any)
	if !ok || len(include) != 1 || include[0] != "reasoning.encrypted_content" || body["truncation"] != "disabled" {
		t.Fatal("stateless reasoning replay or truncation policy missing", body)
	}
	for _, key := range []string{"previous_response_id", "conversation"} {
		if _, ok := body[key]; ok {
			t.Fatal("remote history authority present", key)
		}
	}
	input, ok := body["input"].([]any)
	if !ok || len(input) != 3 {
		t.Fatal("complete local initial input missing", body)
	}
	persona, personaOK := input[0].(map[string]any)
	intent, intentOK := input[2].(map[string]any)
	if !personaOK || !intentOK || persona["role"] != "system" || persona["content"] != `Keep literal {"sample":{"x":1}}.` || intent["role"] != "user" || intent["content"] != "one intention" {
		t.Fatal("literal persona or accepted intention changed", input)
	}
	if block := responsesShortTerm(t, input[1], "one intention"); len(block.Entries) != 0 {
		t.Fatal("first Run invented prior short-term history", block)
	}
	history, err := core.API.Conversation.History(context.Background(), owner, api.HistoryQuery{
		PageQuery: api.PageQuery{ProfileID: profile}, SessionID: session.ID,
	})
	if err != nil || len(history.Items) != 2 || history.Items[0].Text != "one intention" || history.Items[1].Text != "durable responses answer" {
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

const successfulTextStream = `event: response.created
data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_fixture","object":"response","created_at":1,"model":"fixture-model","status":"in_progress","output":[]}}

event: response.in_progress
data: {"type":"response.in_progress","sequence_number":1,"response":{"id":"resp_fixture","object":"response","created_at":1,"model":"fixture-model","status":"in_progress","output":[]}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":2,"output_index":0,"item":{"id":"msg_fixture","type":"message","role":"assistant","status":"in_progress","content":[]}}

event: response.content_part.added
data: {"type":"response.content_part.added","sequence_number":3,"item_id":"msg_fixture","output_index":0,"content_index":0,"part":{"type":"output_text","text":"","annotations":[],"logprobs":[]}}

event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":4,"item_id":"msg_fixture","output_index":0,"content_index":0,"delta":"durable responses answer","logprobs":[]}

event: response.output_text.done
data: {"type":"response.output_text.done","sequence_number":5,"item_id":"msg_fixture","output_index":0,"content_index":0,"text":"durable responses answer","logprobs":[]}

event: response.content_part.done
data: {"type":"response.content_part.done","sequence_number":6,"item_id":"msg_fixture","output_index":0,"content_index":0,"part":{"type":"output_text","text":"durable responses answer","annotations":[],"logprobs":[]}}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":7,"output_index":0,"item":{"id":"msg_fixture","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"durable responses answer","annotations":[],"logprobs":[]}]}}

event: response.completed
data: {"type":"response.completed","sequence_number":8,"response":{"id":"resp_fixture","object":"response","created_at":1,"model":"fixture-model","status":"completed","output":[{"id":"msg_fixture","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"durable responses answer","annotations":[],"logprobs":[]}]}],"usage":{"input_tokens":9,"output_tokens":4,"total_tokens":13,"input_tokens_details":{"cached_tokens":0},"output_tokens_details":{"reasoning_tokens":0}}}}

`
