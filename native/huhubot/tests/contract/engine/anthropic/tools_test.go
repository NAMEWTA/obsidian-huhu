package anthropic_test

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

type wireEvents struct{ events []map[string]any }

func (w *wireEvents) add(kind string, fields map[string]any) {
	fields["type"] = kind
	w.events = append(w.events, fields)
}
func (w *wireEvents) write(writer http.ResponseWriter) {
	writer.Header().Set("Content-Type", "text/event-stream")
	for _, event := range w.events {
		data, _ := json.Marshal(event)
		fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", event["type"], data)
	}
}

func mixedBlocks() []map[string]any {
	args := func(resource, content string) map[string]any {
		return map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:anthropic", ResourceID: resource, Operation: "update", BaseRevision: "1"}, "content": content}
	}
	return []map[string]any{
		{"type": "thinking", "thinking": "synthetic private thinking 思考🙂", "signature": "opaque-signature+/==\\u4e2d"},
		{"type": "tool_use", "id": "toolu_first", "name": "note_write", "input": args("resource:first", "第一段🙂"), "caller": map[string]any{"type": "direct"}},
		{"type": "text", "text": "EchoEcho", "citations": []any{}},
		{"type": "tool_use", "id": "toolu_second", "name": "note_write", "input": args("resource:second", "第二段")},
		{"type": "redacted_thinking", "data": "opaque-redacted+/==\\u4e2d"},
		{"type": "thinking", "thinking": "", "signature": "empty-thinking-signature+/=="},
	}
}

func mixedTurn(blocks []map[string]any) wireEvents {
	w := wireEvents{}
	w.add("message_start", map[string]any{"message": map[string]any{
		"id": "msg_mixed", "type": "message", "role": "assistant", "model": "fixture-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil,
		"usage": map[string]any{"input_tokens": 6, "cache_creation_input_tokens": 2, "cache_read_input_tokens": 2, "output_tokens": 0, "cache_creation": map[string]any{"ephemeral_5m_input_tokens": 2, "ephemeral_1h_input_tokens": 0}},
	}})
	for i, block := range blocks {
		start := map[string]any{}
		for key, value := range block {
			start[key] = value
		}
		switch block["type"] {
		case "text":
			start["text"] = ""
		case "tool_use":
			start["input"] = map[string]any{}
		case "thinking":
			start["thinking"] = ""
			delete(start, "signature")
		}
		w.add("content_block_start", map[string]any{"index": i, "content_block": start})
	}
	for step := 0; step < 2; step++ {
		for _, index := range []int{3, 1} {
			raw, _ := json.Marshal(blocks[index]["input"])
			runes := []rune(string(raw))
			split := len(runes) / 2
			delta := runes[:split]
			if step == 1 {
				delta = runes[split:]
			}
			w.add("content_block_delta", map[string]any{"index": index, "delta": map[string]any{"type": "input_json_delta", "partial_json": string(delta)}})
		}
		w.add("content_block_delta", map[string]any{"index": 2, "delta": map[string]any{"type": "text_delta", "text": "Echo"}})
	}
	w.add("content_block_delta", map[string]any{"index": 0, "delta": map[string]any{"type": "thinking_delta", "thinking": blocks[0]["thinking"]}})
	for _, index := range []int{5, 0} {
		signature := blocks[index]["signature"].(string)
		split := len(signature) / 2
		for _, part := range []string{signature[:split], signature[split:]} {
			w.add("content_block_delta", map[string]any{"index": index, "delta": map[string]any{"type": "signature_delta", "signature": part}})
		}
	}
	for _, index := range []int{3, 4, 2, 5, 0, 1} {
		w.add("content_block_stop", map[string]any{"index": index})
	}
	w.add("message_delta", map[string]any{"delta": map[string]any{"stop_reason": nil, "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 1}})
	w.add("message_delta", map[string]any{"delta": map[string]any{"stop_reason": "tool_use", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 3, "output_tokens_details": map[string]any{"thinking_tokens": 2}}})
	w.add("message_stop", map[string]any{})
	return w
}

func TestMixedBlocksKeepThinkingAndOriginalToolDecisions(t *testing.T) {
	for key, value := range map[string]string{
		"ANTHROPIC_BASE_URL": "http://127.0.0.1:1/poison", "ANTHROPIC_API_KEY": "poison-key", "ANTHROPIC_AUTH_TOKEN": "poison-bearer",
		"ANTHROPIC_PROFILE": "nonexistent-poison-profile", "ANTHROPIC_CUSTOM_HEADERS": "X-Poison: yes\nAuthorization: Bearer poison-header",
		"HTTP_PROXY": "http://127.0.0.1:1", "HTTPS_PROXY": "http://127.0.0.1:1",
	} {
		t.Setenv(key, value)
	}
	blocks := mixedBlocks()
	firstStream := mixedTurn(blocks)
	var requests atomic.Int32
	bodies := make(chan map[string]json.RawMessage, 3)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/messages" || r.Header.Get("X-Api-Key") != "synthetic-anthropic-key" || r.Header.Get("Authorization") != "" || r.Header.Get("X-Poison") != "" {
			t.Error("SDK inherited environment or changed destination", r.Method, r.URL.Path)
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
	f := newAnthropicFixture(t, server.URL, bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t)
	first := f.approval(t, run)
	if first.Preview.Content != "第一段🙂" || writer.writes.Load() != 0 || requests.Load() != 1 {
		t.Fatal("first effect must remain gated", first, writer.writes.Load(), requests.Load())
	}
	body := <-bodies
	var tools []map[string]json.RawMessage
	if json.Unmarshal(body["tools"], &tools) != nil || len(tools) != 1 || string(tools[0]["name"]) != `"note_write"` || len(tools[0]["input_schema"]) == 0 {
		t.Fatal("Anthropic tool schema missing", string(body["tools"]))
	}
	var toolSchema map[string]json.RawMessage
	if json.Unmarshal(tools[0]["input_schema"], &toolSchema) != nil || string(toolSchema["additionalProperties"]) != "false" {
		t.Fatal("tool schema constraints lost", string(tools[0]["input_schema"]))
	}
	f.decide(t, first, "approve")
	second := f.approval(t, run)
	if second.ID == first.ID || second.EffectID == first.EffectID || second.Preview.Content != "第二段" || writer.writes.Load() != 1 || requests.Load() != 1 {
		t.Fatal("saved original batch position lost", second, writer.writes.Load(), requests.Load())
	}
	f.decide(t, second, "reject")
	result := f.terminal(t, run)
	if result.Status != "succeeded" || writer.writes.Load() != 1 || requests.Load() != 2 {
		t.Fatal("decisions must resume original batch once", result, writer.writes.Load(), requests.Load())
	}
	body = <-bodies
	var messages []map[string]json.RawMessage
	if json.Unmarshal(body["messages"], &messages) != nil || len(messages) != 4 || string(messages[2]["role"]) != `"assistant"` || string(messages[3]["role"]) != `"user"` {
		t.Fatal("local complete messages/results missing", string(body["messages"]))
	}
	anthropicInitialPrefix(t, messages, "one intention")
	var replay []json.RawMessage
	if json.Unmarshal(messages[2]["content"], &replay) != nil || len(replay) != len(blocks) {
		t.Fatal("complete ordered blocks missing", string(messages[2]["content"]))
	}
	for i, block := range blocks {
		raw, _ := json.Marshal(block)
		var want, got any
		_ = json.Unmarshal(raw, &want)
		_ = json.Unmarshal(replay[i], &got)
		if !reflect.DeepEqual(want, got) {
			t.Fatalf("block %d changed: %s != %s", i, raw, replay[i])
		}
	}
	var outputs []map[string]any
	if json.Unmarshal(messages[3]["content"], &outputs) != nil || len(outputs) != 2 {
		t.Fatal("tool results missing", string(messages[3]["content"]))
	}
	for i, id := range []string{"toolu_first", "toolu_second"} {
		output := outputs[i]
		text, _ := output["content"].(string)
		if output["type"] != "tool_result" || output["tool_use_id"] != id || output["is_error"] != (i == 1) || len(output) != 4 || strings.Contains(text, "suspensionToken") || strings.Contains(text, "preview") || strings.Contains(text, "Token") {
			t.Fatal("result identity/error/control data wrong", output)
		}
		if i == 0 && !strings.Contains(text, first.EffectID) || i == 1 && !strings.Contains(text, "APPROVAL_REJECTED") {
			t.Fatal("decision result missing", output)
		}
	}
	if result.Usage == nil || result.Usage.Knowledge != "known" || result.Usage.InputTokens != "19" || result.Usage.OutputTokens != "7" {
		t.Fatal("cumulative/cache usage counted incorrectly", result.Usage)
	}
	history, err := f.core.API.Conversation.History(context.Background(), anthropicOwner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile}, SessionID: f.session})
	if err != nil || len(history.Items) != 2 || history.Items[1].Text != "EchoEchodurable anthropic answer" {
		t.Fatal("visible text or repeated delta lost", history, err)
	}
	public, _ := json.Marshal(history)
	for _, private := range [][]byte{[]byte("opaque-signature"), []byte("opaque-redacted"), []byte("private thinking"), []byte("empty-thinking-signature")} {
		if bytes.Contains(public, private) {
			t.Fatal("private blocks leaked to history")
		}
	}
}
