package chat_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func callDelta(w http.ResponseWriter, calls ...map[string]any) {
	sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": calls}}}})
}
func finishTools(w http.ResponseWriter) {
	sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{}, "finish_reason": "tool_calls"}}})
	sse(w, map[string]any{"choices": []any{}, "usage": map[string]any{"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7}})
	fmt.Fprint(w, "data: [DONE]\n\n")
}

func TestInterleavedEmptyObjectToolsKeepOriginalIdentityAndPrivacy(t *testing.T) {
	var requests atomic.Int32
	bodyCh := make(chan map[string]any, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		bodyCh <- body
		if requests.Add(1) == 1 {
			w.Header().Set("Content-Type", "text/event-stream")
			callDelta(w, map[string]any{"index": 1, "id": "list-original", "type": "function", "function": map[string]any{"name": "tasks_list", "arguments": "{"}})
			callDelta(w, map[string]any{"index": 0, "id": "discover-original", "type": "function", "function": map[string]any{"name": "agents_discover", "arguments": "{"}})
			callDelta(w, map[string]any{"index": 1, "function": map[string]any{"arguments": "}"}})
			callDelta(w, map[string]any{"index": 0, "function": map[string]any{"arguments": "}"}})
			finishTools(w)
			return
		}
		textTurn(w, "read tools finished", "stop", nil, true)
	}))
	t.Cleanup(server.Close)
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{}, []string{"agents.discover", "tasks.list"})
	if _, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.meta(""), Draft: api.AgentDraft{Name: "another identity", Description: "public summary", Persona: "SECRET_PRIVATE_OTHER_PERSONA"}}); err != nil {
		t.Fatal(err)
	}
	run := f.terminal(t, f.start(t).RunID)
	if run.Status != "succeeded" || requests.Load() != 2 {
		t.Fatal(run, requests.Load())
	}
	<-bodyCh
	body := <-bodyCh
	data, _ := json.Marshal(body)
	if strings.Contains(string(data), "SECRET_PRIVATE_OTHER_PERSONA") {
		t.Fatal("directory leaked another persona", string(data))
	}
	var ids []string
	for _, v := range body["messages"].([]any) {
		m := v.(map[string]any)
		if m["role"] == "tool" {
			ids = append(ids, m["tool_call_id"].(string))
			if !strings.Contains(m["content"].(string), `"status":"completed"`) {
				t.Fatal("empty-object schema was not honored", m)
			}
		}
	}
	if strings.Join(ids, ",") != "discover-original,list-original" {
		t.Fatal("interleaved indexes lost original identity", ids)
	}
	var attempts, ended int
	if err := fixtureDB(t, f).QueryRow("SELECT count(*),sum(producer_ended) FROM model_attempts WHERE run_id=?", run.ID).Scan(&attempts, &ended); err != nil {
		t.Fatal(err)
	}
	if attempts != 2 || ended != 2 {
		t.Fatal("per-HTTP attempts missing", attempts, ended)
	}
}

func TestDelegatedChildrenResumeTheirOriginalToolCalls(t *testing.T) {
	var requests, parentTurns atomic.Int32
	parentBody := make(chan map[string]any, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		messages := body["messages"].([]any)
		persona := messages[0].(map[string]any)["content"]
		if persona == "child literal persona" {
			encoded, _ := json.Marshal(body)
			if !strings.Contains(string(encoded), "literal child constraint") || !strings.Contains(string(encoded), "short answer") {
				t.Error("accepted task requirements disappeared before real SDK", string(encoded))
			}
			textTurn(w, "durable child answer", "stop", map[string]any{"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}, true)
			return
		}
		parentBody <- body
		if parentTurns.Add(1) == 1 {
			draft := api.AgentDraft{Name: "temporary worker", Description: "one task", Persona: "child literal persona", Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: "ENDPOINT", ModelID: "fixture-model", CredentialRef: "credential:11111111111111111111111111111111", Capabilities: []string{}}}
			// The provider's model-facing endpoint is filled from the explicit
			// configured destination, not any environment or hidden fallback.
			draft.Model.Endpoint = "http://" + r.Host + "/v1"
			calls := []map[string]any{}
			for i := 0; i < 2; i++ {
				args, _ := json.Marshal(map[string]any{"target": api.DelegationTarget{Kind: "temporary", Draft: &draft}, "task": fmt.Sprint("child task ", i), "constraints": []string{"literal child constraint"}, "expectedOutput": "short answer", "context": api.ContextEnvelope{MessageIDs: []string{}, SourceRefs: []api.SourceSnapshot{}, Excerpts: []api.ContextExcerpt{}}})
				calls = append(calls, map[string]any{"index": i, "id": fmt.Sprint("delegate-original-", i), "type": "function", "function": map[string]any{"name": "agents_delegate", "arguments": string(args)}})
			}
			toolTurn(w, calls)
			return
		}
		textTurn(w, "combined children", "stop", map[string]any{"prompt_tokens": 8, "completion_tokens": 2, "total_tokens": 10}, true)
	}))
	t.Cleanup(server.Close)
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{}, []string{"agents.delegate"})
	run := f.terminal(t, f.start(t).RunID)
	if run.Status != "succeeded" || requests.Load() != 4 || parentTurns.Load() != 2 {
		t.Fatal(run, requests.Load(), parentTurns.Load())
	}
	<-parentBody
	body := <-parentBody
	var ids []string
	for _, v := range body["messages"].([]any) {
		m := v.(map[string]any)
		if m["role"] == "tool" {
			ids = append(ids, m["tool_call_id"].(string))
			if !strings.Contains(m["content"].(string), "durable child answer") {
				t.Fatal("lost durable child outcome", m)
			}
		}
	}
	if strings.Join(ids, ",") != "delegate-original-0,delegate-original-1" {
		t.Fatal("children lost original call order", ids)
	}
	var children, deliveries int
	db := fixtureDB(t, f)
	if err := db.QueryRow("SELECT count(*) FROM execution_runs WHERE parent_run_id=?", run.ID).Scan(&children); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow("SELECT count(*) FROM collaboration_result_deliveries WHERE parent_run_id=?", run.ID).Scan(&deliveries); err != nil {
		t.Fatal(err)
	}
	if children != 2 || deliveries != 2 {
		t.Fatal("children replayed or disappeared", children, deliveries)
	}
}
