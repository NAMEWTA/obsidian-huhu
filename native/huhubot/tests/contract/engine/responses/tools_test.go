package responses_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// Every item is a literal final provider shape. In particular item IDs and
// function call IDs differ, and reasoning is not reconstructed from text.
func mixedItems() []json.RawMessage {
	first, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:responses", ResourceID: "resource:first", Operation: "update", BaseRevision: "1"}, "content": "第一段🙂"})
	second, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:responses", ResourceID: "resource:second", Operation: "update", BaseRevision: "1"}, "content": "第二段"})
	call := func(id, callID, args string, caller any) json.RawMessage {
		b, _ := json.Marshal(map[string]any{"type": "function_call", "id": id, "call_id": callID, "name": "note_write", "arguments": args, "status": "completed", "caller": caller})
		return b
	}
	return []json.RawMessage{
		json.RawMessage(`{"id":"rs_opaque","type":"reasoning","summary":[{"type":"summary_text","text":""},{"type":"summary_text","text":"摘要🙂"}],"content":[{"type":"reasoning_text","text":"synthetic private reasoning"}],"encrypted_content":"opaque+/==\\u4e2d","status":"completed"}`),
		call("fc_item_first", "call_first", string(first), map[string]any{"type": "direct"}),
		json.RawMessage(`{"id":"msg_mixed","type":"message","role":"assistant","status":"completed","phase":"commentary","content":[{"type":"output_text","text":"EchoEcho","annotations":[],"logprobs":[]}]}`),
		call("fc_item_second", "call_second", string(second), nil),
	}
}

type wireEvents struct{ events []map[string]any }

func (w *wireEvents) add(kind string, fields map[string]any) {
	fields["type"] = kind
	fields["sequence_number"] = len(w.events)
	w.events = append(w.events, fields)
}
func (w *wireEvents) write(writer http.ResponseWriter) {
	writer.Header().Set("Content-Type", "text/event-stream")
	for _, e := range w.events {
		b, _ := json.Marshal(e)
		fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", e["type"], b)
	}
}
func mixedTurn(items []json.RawMessage) wireEvents {
	w := wireEvents{}
	response := func(status string, output []json.RawMessage) map[string]any {
		return map[string]any{"id": "resp_mixed", "object": "response", "model": "fixture-model", "status": status, "output": output}
	}
	w.add("response.created", map[string]any{"response": response("in_progress", []json.RawMessage{})})
	w.add("response.in_progress", map[string]any{"response": response("in_progress", []json.RawMessage{})})
	decoded := make([]map[string]any, len(items))
	for i, raw := range items {
		var m map[string]any
		_ = json.Unmarshal(raw, &m)
		decoded[i] = m
		added := map[string]any{}
		for k, v := range m {
			added[k] = v
		}
		added["status"] = "in_progress"
		switch m["type"] {
		case "reasoning":
			added["summary"] = []any{}
			delete(added, "content")
			added["encrypted_content"] = nil
		case "function_call":
			added["arguments"] = ""
		case "message":
			added["content"] = []any{}
		}
		w.add("response.output_item.added", map[string]any{"output_index": i, "item": added})
	}
	w.add("response.content_part.added", map[string]any{"output_index": 2, "item_id": "msg_mixed", "content_index": 0, "part": map[string]any{"type": "output_text", "text": "", "annotations": []any{}, "logprobs": []any{}}})
	first, second := []rune(decoded[1]["arguments"].(string)), []rune(decoded[3]["arguments"].(string))
	for step := 0; step < 2; step++ {
		for _, index := range []int{3, 1} {
			args := first
			if index == 3 {
				args = second
			}
			split := len(args) / 2
			delta := args[:split]
			if step == 1 {
				delta = args[split:]
			}
			w.add("response.function_call_arguments.delta", map[string]any{"output_index": index, "item_id": decoded[index]["id"], "delta": string(delta)})
		}
		w.add("response.output_text.delta", map[string]any{"output_index": 2, "item_id": "msg_mixed", "content_index": 0, "delta": "Echo", "logprobs": []any{}})
	}
	for _, index := range []int{3, 1} {
		w.add("response.function_call_arguments.done", map[string]any{"output_index": index, "item_id": decoded[index]["id"], "name": decoded[index]["name"], "arguments": decoded[index]["arguments"]})
	}
	w.add("response.output_text.done", map[string]any{"output_index": 2, "item_id": "msg_mixed", "content_index": 0, "text": "EchoEcho", "logprobs": []any{}})
	w.add("response.content_part.done", map[string]any{"output_index": 2, "item_id": "msg_mixed", "content_index": 0, "part": decoded[2]["content"].([]any)[0]})
	for _, index := range []int{3, 0, 2, 1} {
		w.add("response.output_item.done", map[string]any{"output_index": index, "item": items[index]})
	}
	end := response("completed", items)
	end["usage"] = map[string]any{"input_tokens": 10, "output_tokens": 3, "total_tokens": 13}
	w.add("response.completed", map[string]any{"response": end})
	return w
}

func TestMixedItemsKeepOpaqueStateAndOriginalToolDecisions(t *testing.T) {
	for key, value := range map[string]string{"OPENAI_BASE_URL": "http://127.0.0.1:1/poison", "OPENAI_API_KEY": "poison-key", "OPENAI_ORG_ID": "poison-org", "OPENAI_PROJECT_ID": "poison-project", "OPENAI_CUSTOM_HEADERS": "X-Poison: yes\nAuthorization: Bearer poison-header", "HTTP_PROXY": "http://127.0.0.1:1", "HTTPS_PROXY": "http://127.0.0.1:1"} {
		t.Setenv(key, value)
	}
	items := mixedItems()
	firstStream := mixedTurn(items)
	var requests atomic.Int32
	bodies := make(chan map[string]json.RawMessage, 3)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/responses" || r.Header.Get("Authorization") != "Bearer synthetic-responses-key" || r.Header.Get("OpenAI-Organization") != "" || r.Header.Get("OpenAI-Project") != "" || r.Header.Get("X-Poison") != "" {
			t.Error("SDK inherited ambient configuration or changed destination", r.Method, r.URL.Path, r.Header)
		}
		var body map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		bodies <- body
		if requests.Add(1) == 1 {
			firstStream.write(w)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, successfulTextStream)
	}))
	t.Cleanup(server.Close)
	writer := &fixtureWriter{}
	f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t)
	first := f.approval(t, run)
	if first.Preview.Content != "第一段🙂" || writer.writes.Load() != 0 || requests.Load() != 1 {
		t.Fatal("first effect must remain gated", first, writer.writes.Load(), requests.Load())
	}
	body := <-bodies
	var tools []map[string]json.RawMessage
	if json.Unmarshal(body["tools"], &tools) != nil || len(tools) != 1 || string(tools[0]["type"]) != `"function"` || string(tools[0]["name"]) != `"note_write"` || len(tools[0]["parameters"]) == 0 || string(tools[0]["strict"]) != "false" {
		t.Fatal("flat Responses function schema", string(body["tools"]))
	}
	f.decide(t, first, "approve")
	second := f.approval(t, run)
	if second.ID == first.ID || second.EffectID == first.EffectID || second.Preview.Content != "第二段" || writer.writes.Load() != 1 || requests.Load() != 1 {
		t.Fatal("full batch and saved call position lost", second, writer.writes.Load(), requests.Load())
	}
	f.decide(t, second, "reject")
	result := f.terminal(t, run)
	if result.Status != "succeeded" || writer.writes.Load() != 1 || requests.Load() != 2 {
		t.Fatal("decisions must resume the original batch once", result, writer.writes.Load(), requests.Load())
	}
	body = <-bodies
	var input []json.RawMessage
	if err := json.Unmarshal(body["input"], &input); err != nil || len(input) != 9 {
		t.Fatal("full local history and results missing", len(input), err)
	}
	responsesInitialPrefix(t, input, "one intention")
	for i, item := range items {
		var a, b any
		_ = json.Unmarshal(item, &a)
		_ = json.Unmarshal(input[i+3], &b)
		if !reflect.DeepEqual(a, b) {
			t.Fatalf("raw item %d changed: %s != %s", i, item, input[i+3])
		}
	}
	for i, id := range []string{"call_first", "call_second"} {
		var output map[string]any
		_ = json.Unmarshal(input[7+i], &output)
		text, _ := output["output"].(string)
		if output["type"] != "function_call_output" || output["call_id"] != id || len(output) != 3 || strings.Contains(text, "suspensionToken") || strings.Contains(text, "preview") || strings.Contains(text, "Token") {
			t.Fatal("result identity or control data leaked", output)
		}
		if i == 0 && !strings.Contains(text, first.EffectID) || i == 1 && !strings.Contains(text, "APPROVAL_REJECTED") {
			t.Fatal("decision result missing", output)
		}
	}
	if result.Usage == nil || result.Usage.Knowledge != "known" || result.Usage.InputTokens != "19" || result.Usage.OutputTokens != "7" {
		t.Fatal("one settlement per actual request", result.Usage)
	}
	history, err := f.core.API.Conversation.History(context.Background(), responsesOwner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile}, SessionID: f.session})
	if err != nil || len(history.Items) != 2 || history.Items[1].Text != "EchoEchodurable responses answer" {
		t.Fatal("literal repeated deltas or final text lost", history, err)
	}
	public, _ := json.Marshal(history)
	for _, private := range [][]byte{[]byte("opaque+/"), []byte("synthetic private reasoning"), []byte("摘要")} {
		if bytes.Contains(public, private) {
			t.Fatal("private reasoning leaked to history")
		}
	}
}
