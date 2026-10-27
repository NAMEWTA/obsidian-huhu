package foundation_test

import (
	"encoding/json"
	"fmt"
	"io"
	"testing"
)

func TestDefaultResponsesCLIEngineUsesPrivateCredentialAndPersistsActualAttempt(t *testing.T) {
	testDefaultProtocolCLI(t, "openai-responses")
}

func writeDefaultResponsesText(w io.Writer, text string) {
	part := map[string]any{"type": "output_text", "text": text, "annotations": []any{}, "logprobs": []any{}}
	item := map[string]any{"id": "msg_default", "type": "message", "role": "assistant", "status": "completed", "content": []any{part}}
	response := func(status string, output []any) map[string]any {
		return map[string]any{"id": "resp_default", "object": "response", "created_at": 1, "model": "fixture-model", "status": status, "output": output}
	}
	completed := response("completed", []any{item})
	completed["usage"] = map[string]any{"input_tokens": 10, "output_tokens": 2, "total_tokens": 12, "input_tokens_details": map[string]any{"cached_tokens": 0}, "output_tokens_details": map[string]any{"reasoning_tokens": 0}}
	events := []struct {
		name string
		data map[string]any
	}{
		{"response.created", map[string]any{"response": response("in_progress", []any{})}},
		{"response.in_progress", map[string]any{"response": response("in_progress", []any{})}},
		{"response.output_item.added", map[string]any{"output_index": 0, "item": map[string]any{"id": "msg_default", "type": "message", "role": "assistant", "status": "in_progress", "content": []any{}}}},
		{"response.content_part.added", map[string]any{"item_id": "msg_default", "output_index": 0, "content_index": 0, "part": map[string]any{"type": "output_text", "text": "", "annotations": []any{}, "logprobs": []any{}}}},
		{"response.output_text.delta", map[string]any{"item_id": "msg_default", "output_index": 0, "content_index": 0, "delta": text, "logprobs": []any{}}},
		{"response.output_text.done", map[string]any{"item_id": "msg_default", "output_index": 0, "content_index": 0, "text": text, "logprobs": []any{}}},
		{"response.content_part.done", map[string]any{"item_id": "msg_default", "output_index": 0, "content_index": 0, "part": part}},
		{"response.output_item.done", map[string]any{"output_index": 0, "item": item}},
		{"response.completed", map[string]any{"response": completed}},
	}
	for n, event := range events {
		event.data["type"], event.data["sequence_number"] = event.name, n
		encoded, err := json.Marshal(event.data)
		if err != nil {
			panic(err)
		}
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.name, encoded)
	}
}
