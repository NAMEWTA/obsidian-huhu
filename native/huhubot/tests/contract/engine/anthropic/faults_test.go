package anthropic_test

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func anthropicDB(t *testing.T, f *anthropicFixture) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", "file:"+filepath.Join(f.locator, "profile.sqlite3")+"?mode=ro")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	return db
}

func textEvents() wireEvents {
	w := wireEvents{}
	for _, line := range strings.Split(successfulTextStream, "\n") {
		if strings.HasPrefix(line, "data: ") {
			var event map[string]any
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &event); err != nil {
				panic(err)
			}
			w.events = append(w.events, event)
		}
	}
	return w
}
func startUsage(w *wireEvents) map[string]any {
	return w.events[0]["message"].(map[string]any)["usage"].(map[string]any)
}
func finalDelta(w *wireEvents) map[string]any {
	for i := len(w.events) - 1; i >= 0; i-- {
		if w.events[i]["type"] == "message_delta" {
			return w.events[i]
		}
	}
	panic("fixture has no message_delta")
}
func wireString(w wireEvents) string {
	var out strings.Builder
	for _, event := range w.events {
		b, _ := json.Marshal(event)
		fmt.Fprintf(&out, "event: %s\ndata: %s\n\n", event["type"], b)
	}
	return out.String()
}

func TestTerminalAndUsagePresenceSettleEachActualRequestOnce(t *testing.T) {
	for _, tc := range []struct {
		name, status, knowledge, reason, input, output string
		change                                         func(*wireEvents)
		wire                                           func(string) string
	}{
		{name: "start_usage_missing", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { delete(w.events[0]["message"].(map[string]any), "usage") }},
		{name: "start_usage_null", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { w.events[0]["message"].(map[string]any)["usage"] = nil }},
		{name: "start_usage_empty", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { w.events[0]["message"].(map[string]any)["usage"] = map[string]any{} }},
		{name: "cache_component_missing", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { delete(startUsage(w), "cache_read_input_tokens") }},
		{name: "cache_component_null", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { startUsage(w)["cache_read_input_tokens"] = nil }},
		{name: "delta_usage_missing", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { delete(finalDelta(w), "usage") }},
		{name: "delta_usage_null", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { finalDelta(w)["usage"] = nil }},
		{name: "delta_output_absent", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { finalDelta(w)["usage"] = map[string]any{"input_tokens": 9} }},
		{name: "explicit_all_zero", status: "succeeded", knowledge: "known", input: "0", output: "0", change: func(w *wireEvents) {
			startUsage(w)["input_tokens"] = 0
			finalDelta(w)["usage"].(map[string]any)["output_tokens"] = 0
		}},
		{name: "input_negative", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { startUsage(w)["input_tokens"] = -1 }},
		{name: "input_fraction", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { startUsage(w)["input_tokens"] = 1.5 }},
		{name: "input_unsafe_integer", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { startUsage(w)["input_tokens"] = json.Number("9007199254740992") }},
		{name: "cache_sum_unsafe", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) {
			startUsage(w)["input_tokens"] = json.Number("9007199254740991")
			startUsage(w)["cache_read_input_tokens"] = 1
		}},
		{name: "cumulative_output_not_sum", status: "succeeded", knowledge: "known", change: func(w *wireEvents) { startUsage(w)["output_tokens"] = 2 }},
		{name: "cache_and_thinking_breakdowns_not_added", status: "succeeded", knowledge: "known", input: "14", output: "4", change: func(w *wireEvents) {
			startUsage(w)["cache_creation_input_tokens"] = 2
			startUsage(w)["cache_read_input_tokens"] = 3
			startUsage(w)["cache_creation"] = map[string]any{"ephemeral_5m_input_tokens": 2, "ephemeral_1h_input_tokens": 0}
			finalDelta(w)["usage"].(map[string]any)["output_tokens_details"] = map[string]any{"thinking_tokens": 3}
		}},
		{name: "delta_input_snapshot_replaces_start", status: "succeeded", knowledge: "known", input: "11", output: "4", change: func(w *wireEvents) { finalDelta(w)["usage"].(map[string]any)["input_tokens"] = 11 }},
		{name: "stop_sequence_no_tools", status: "succeeded", knowledge: "known", change: func(w *wireEvents) {
			d := finalDelta(w)["delta"].(map[string]any)
			d["stop_reason"] = "stop_sequence"
			d["stop_sequence"] = "<END>"
		}},
		{name: "stop_sequence_missing", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) {
			d := finalDelta(w)["delta"].(map[string]any)
			d["stop_reason"] = "stop_sequence"
			delete(d, "stop_sequence")
		}},
		{name: "stop_sequence_null", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "stop_sequence" }},
		{name: "max_tokens", status: "failed", knowledge: "known", reason: "MODEL_OUTPUT_TRUNCATED", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "max_tokens" }},
		{name: "refusal", status: "failed", knowledge: "known", reason: "MODEL_REFUSED", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "refusal" }},
		{name: "refusal_with_details", status: "failed", knowledge: "known", reason: "MODEL_REFUSED", change: func(w *wireEvents) {
			d := finalDelta(w)["delta"].(map[string]any)
			d["stop_reason"] = "refusal"
			d["stop_details"] = map[string]any{"type": "refusal", "category": "reasoning_extraction", "explanation": nil}
		}},
		{name: "pause_turn_no_autocontinue", status: "failed", knowledge: "known", reason: "MODEL_FINISH_UNKNOWN", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "pause_turn" }},
		{name: "unknown_stop_reason", status: "failed", knowledge: "known", reason: "MODEL_FINISH_UNKNOWN", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "future_execute" }},
		{name: "eof_without_message_stop", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INCOMPLETE", change: func(w *wireEvents) { w.events = w.events[:len(w.events)-1] }},
		{name: "tool_use_reason_without_calls", status: "failed", knowledge: "known", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) { finalDelta(w)["delta"].(map[string]any)["stop_reason"] = "tool_use" }},
		{name: "provider_error_before_message", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_FAILED", change: func(w *wireEvents) {
			w.events = nil
			w.add("error", map[string]any{"error": map[string]any{"type": "overloaded_error", "message": "SYNTHETIC_PRIVATE_PROVIDER_ERROR"}})
		}},
		{name: "provider_error_after_usage", status: "failed", knowledge: "known", reason: "MODEL_STREAM_FAILED", change: func(w *wireEvents) {
			w.events = w.events[:len(w.events)-1]
			w.add("error", map[string]any{"error": map[string]any{"type": "api_error", "message": "SYNTHETIC_PRIVATE_PROVIDER_ERROR"}})
		}},
		{name: "malformed_error_missing_message", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) {
			w.events = nil
			w.add("error", map[string]any{"error": map[string]any{"type": "api_error"}})
		}},
		{name: "malformed_error_null", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) { w.events = nil; w.add("error", map[string]any{"error": nil}) }},
		{name: "unknown_sse_event", status: "failed", knowledge: "unknown", wire: func(s string) string { return "event: agent.started\ndata: {\"type\":\"agent.started\"}\n\n" + s }},
		{name: "late_semantic_event", status: "failed", knowledge: "unknown", wire: func(s string) string {
			return s + "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":1,\"content_block\":{\"type\":\"text\",\"text\":\"late\"}}\n\n"
		}},
		{name: "invalid_original_utf8_after_usage", status: "failed", knowledge: "unknown", wire: func(s string) string { return s + "data: " + string([]byte{0xff}) + "\n\n" }},
		{name: "conflicting_event_label", status: "failed", knowledge: "unknown", wire: func(s string) string {
			return strings.Replace(s, "event: content_block_delta", "event: content_block_stop", 1)
		}},
		{name: "benign_ping", status: "succeeded", knowledge: "known", wire: func(s string) string { return "event: ping\ndata: {\"type\":\"ping\"}\n\n" + s }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			stream := textEvents()
			if tc.change != nil {
				tc.change(&stream)
			}
			raw := wireString(stream)
			if tc.wire != nil {
				raw = tc.wire(raw)
			}
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				fmt.Fprint(w, raw)
			}))
			t.Cleanup(server.Close)
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{}, nil)
			run := f.terminal(t, f.start(t))
			if run.Status != tc.status || tc.reason != "" && run.Reason != tc.reason || run.Usage == nil || run.Usage.Knowledge != tc.knowledge || requests.Load() != 1 {
				t.Fatal("terminal and billing must be independent", run, run.Usage, requests.Load())
			}
			if strings.Contains(run.Reason, "SYNTHETIC_PRIVATE") {
				t.Fatal("provider error detail leaked", run)
			}
			if tc.knowledge == "known" {
				input, output := tc.input, tc.output
				if input == "" {
					input = "9"
				}
				if output == "" {
					output = "4"
				}
				if run.Usage.InputTokens != input || run.Usage.OutputTokens != output {
					t.Fatal("usage presence/snapshot lost", run.Usage)
				}
			}
			var count, ended int
			var state string
			var charged int64
			if err := anthropicDB(t, f).QueryRow("SELECT count(*),state,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&count, &state, &ended, &charged); err != nil {
				t.Fatal(err)
			}
			if count != 1 || state != "settled" || ended != 1 || tc.input == "0" && tc.output == "0" && charged != 0 || tc.knowledge == "unknown" && charged <= 0 {
				t.Fatal("actual attempt not durably settled", count, state, ended, charged)
			}
		})
	}
}

func TestInvalidCompleteToolBatchNeverPublishesFirstApproval(t *testing.T) {
	for _, mode := range []string{"second_unknown_tool", "second_invalid_schema", "duplicate_tool_id", "program_caller", "caller_null", "unknown_hosted_block", "unknown_tool_property", "missing_input", "duplicate_start", "duplicate_stop", "delta_after_stop", "negative_index", "jump_index", "wrong_delta_kind", "half_json_input", "partial_tool_max_tokens", "duplicate_json_key", "end_turn_with_calls", "stop_sequence_with_calls", "duplicate_message_stop", "empty_thinking_missing_signature"} {
		t.Run(mode, func(t *testing.T) {
			blocks := mixedBlocks()
			switch mode {
			case "second_unknown_tool":
				blocks[3]["name"] = "not_registered"
			case "second_invalid_schema":
				blocks[3]["input"] = map[string]any{"content": "unauthorized", "target": map[string]any{"workspaceId": "workspace:anthropic"}}
			case "duplicate_tool_id":
				blocks[3]["id"] = "toolu_first"
			case "program_caller":
				blocks[3]["caller"] = map[string]any{"type": "code_execution_20250825", "tool_id": "server_hidden"}
			case "caller_null":
				blocks[3]["caller"] = nil
			case "unknown_hosted_block":
				blocks[3]["type"] = "server_tool_use"
			case "unknown_tool_property":
				blocks[3]["server_execution"] = true
			}
			stream := mixedTurn(blocks)
			for _, event := range stream.events {
				if event["type"] == "content_block_start" && event["index"] == 3 {
					if mode == "missing_input" {
						delete(event["content_block"].(map[string]any), "input")
					}
					if mode == "jump_index" {
						event["index"] = 9
					}
				}
				if event["type"] == "content_block_delta" && event["index"] == 3 {
					d := event["delta"].(map[string]any)
					if mode == "negative_index" {
						event["index"] = -1
					}
					if mode == "wrong_delta_kind" {
						event["delta"] = map[string]any{"type": "thinking_delta", "thinking": "wrong block"}
					}
					if mode == "half_json_input" || mode == "partial_tool_max_tokens" {
						d["partial_json"] = "{"
					}
					if mode == "duplicate_json_key" {
						d["partial_json"] = ""
					}
				}
			}
			if mode == "duplicate_json_key" {
				for _, event := range stream.events {
					if event["type"] == "content_block_delta" && event["index"] == 3 {
						event["delta"].(map[string]any)["partial_json"] = `{"x":1,"x":2}`
						break
					}
				}
			}
			if mode == "duplicate_start" {
				stream.events = append(stream.events[:2], append([]map[string]any{stream.events[1]}, stream.events[2:]...)...)
			}
			if mode == "duplicate_stop" || mode == "delta_after_stop" {
				for i, event := range stream.events {
					if event["type"] == "content_block_stop" && event["index"] == 3 {
						extra := event
						if mode == "delta_after_stop" {
							extra = map[string]any{"type": "content_block_delta", "index": 3, "delta": map[string]any{"type": "input_json_delta", "partial_json": " "}}
						}
						stream.events = append(stream.events[:i+1], append([]map[string]any{extra}, stream.events[i+1:]...)...)
						break
					}
				}
			}
			if mode == "end_turn_with_calls" {
				finalDelta(&stream)["delta"].(map[string]any)["stop_reason"] = "end_turn"
			}
			if mode == "stop_sequence_with_calls" {
				d := finalDelta(&stream)["delta"].(map[string]any)
				d["stop_reason"] = "stop_sequence"
				d["stop_sequence"] = "<END>"
			}
			if mode == "partial_tool_max_tokens" {
				finalDelta(&stream)["delta"].(map[string]any)["stop_reason"] = "max_tokens"
			}
			if mode == "duplicate_message_stop" {
				stream.events = append(stream.events, stream.events[len(stream.events)-1])
			}
			if mode == "empty_thinking_missing_signature" {
				filtered := stream.events[:0]
				for _, event := range stream.events {
					if event["type"] == "content_block_delta" && event["index"] == 5 {
						continue
					}
					filtered = append(filtered, event)
				}
				stream.events = filtered
			}
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1); stream.write(w) }))
			t.Cleanup(server.Close)
			writer := &fixtureWriter{}
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.terminal(t, f.start(t))
			var approvals, checkpoints int
			if err := anthropicDB(t, f).QueryRow("SELECT (SELECT count(*) FROM access_approvals WHERE run_id=?),(SELECT count(*) FROM execution_checkpoints WHERE run_id=?)", run.ID, run.ID).Scan(&approvals, &checkpoints); err != nil {
				t.Fatal(err)
			}
			if run.Status != "failed" || requests.Load() != 1 || writer.writes.Load() != 0 || approvals != 0 || checkpoints != 0 {
				t.Fatal("invalid second tool admitted first effect", run, requests.Load(), writer.writes.Load(), approvals, checkpoints)
			}
			if mode == "partial_tool_max_tokens" && (run.Reason != "MODEL_OUTPUT_TRUNCATED" || run.Usage == nil || run.Usage.Knowledge != "known") {
				t.Fatal("partial argument failure discarded complete billed usage", run, run.Usage)
			}
		})
	}
}

func TestHTTPFailuresNeverRetryOrFollowRedirect(t *testing.T) {
	for _, status := range []int{302, 307, 429, 500} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var requests, redirects atomic.Int32
			other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirects.Add(1); fmt.Fprint(w, successfulTextStream) }))
			t.Cleanup(other.Close)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Retry-After", "0")
				w.Header().Set("x-should-retry", "true")
				w.Header().Set("Location", other.URL+"/v1/messages")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"type":"error","error":{"type":"api_error","message":"SYNTHETIC_PRIVATE_ERROR"}}`)
			}))
			t.Cleanup(server.Close)
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{}, nil)
			run := f.terminal(t, f.start(t))
			if run.Status != "failed" || requests.Load() != 1 || redirects.Load() != 0 || run.Usage == nil || run.Usage.Knowledge != "unknown" || strings.Contains(run.Reason, "SYNTHETIC_PRIVATE") {
				t.Fatal(run, run.Usage, requests.Load(), redirects.Load())
			}
		})
	}
}
