package responses_test

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

func responseDB(t *testing.T, f *responseFixture) *sql.DB {
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

func responseObject(w *wireEvents) map[string]any {
	return w.events[len(w.events)-1]["response"].(map[string]any)
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
		name, status, knowledge, reason string
		change                          func(*wireEvents)
		wire                            func(string) string
		zero                            bool
	}{
		{name: "usage_missing", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { delete(responseObject(w), "usage") }},
		{name: "usage_null", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"] = nil }},
		{name: "usage_empty", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"] = map[string]any{} }},
		{name: "usage_partial", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"] = map[string]any{"input_tokens": 0} }},
		{name: "usage_zero", status: "succeeded", knowledge: "known", zero: true, change: func(w *wireEvents) {
			responseObject(w)["usage"] = map[string]any{"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
		}},
		{name: "usage_negative", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"].(map[string]any)["input_tokens"] = -1 }},
		{name: "usage_fraction", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"].(map[string]any)["input_tokens"] = 1.5 }},
		{name: "usage_overflow", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) {
			responseObject(w)["usage"].(map[string]any)["input_tokens"] = json.Number("9223372036854775808")
		}},
		{name: "usage_total_mismatch", status: "succeeded", knowledge: "unknown", change: func(w *wireEvents) { responseObject(w)["usage"].(map[string]any)["total_tokens"] = 999 }},
		{name: "created_zero_is_not_final", status: "succeeded", knowledge: "known", change: func(w *wireEvents) {
			w.events[0]["response"].(map[string]any)["usage"] = map[string]any{"input_tokens": 0, "output_tokens": 0}
		}},
		{name: "provider_failed_known_usage", status: "failed", knowledge: "known", reason: "MODEL_STREAM_FAILED", change: func(w *wireEvents) {
			last := w.events[len(w.events)-1]
			last["type"] = "response.failed"
			r := responseObject(w)
			r["status"] = "failed"
			r["error"] = map[string]any{"code": "server_error", "message": "SYNTHETIC_PRIVATE_PROVIDER_ERROR"}
		}},
		{name: "truncated", status: "failed", knowledge: "known", reason: "MODEL_OUTPUT_TRUNCATED", change: func(w *wireEvents) {
			w.events[len(w.events)-1]["type"] = "response.incomplete"
			r := responseObject(w)
			r["status"] = "incomplete"
			r["incomplete_details"] = map[string]any{"reason": "max_output_tokens"}
		}},
		{name: "filtered", status: "failed", knowledge: "known", reason: "MODEL_CONTENT_FILTERED", change: func(w *wireEvents) {
			w.events[len(w.events)-1]["type"] = "response.incomplete"
			r := responseObject(w)
			r["status"] = "incomplete"
			r["incomplete_details"] = map[string]any{"reason": "content_filter"}
		}},
		{name: "incomplete_item_then_terminal", status: "failed", knowledge: "known", reason: "MODEL_OUTPUT_TRUNCATED", change: func(w *wireEvents) {
			w.events[7]["item"].(map[string]any)["status"] = "incomplete"
			w.events[len(w.events)-1]["type"] = "response.incomplete"
			r := responseObject(w)
			r["status"] = "incomplete"
			r["output"].([]any)[0].(map[string]any)["status"] = "incomplete"
			r["incomplete_details"] = map[string]any{"reason": "max_output_tokens"}
		}},
		{name: "eof_without_terminal", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INCOMPLETE", change: func(w *wireEvents) { w.events = w.events[:len(w.events)-1] }},
		{name: "provider_error_event", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_FAILED", change: func(w *wireEvents) {
			w.events = w.events[:2]
			w.add("error", map[string]any{"code": "server_error", "message": "SYNTHETIC_PRIVATE_PROVIDER_ERROR", "param": ""})
		}},
		{name: "malformed_error_param", status: "failed", knowledge: "unknown", reason: "MODEL_STREAM_INVALID", change: func(w *wireEvents) {
			w.events = w.events[:2]
			w.add("error", map[string]any{"code": "server_error", "message": "SYNTHETIC_PRIVATE_PROVIDER_ERROR", "param": nil})
		}},
		{name: "done_without_terminal", status: "failed", knowledge: "unknown", change: func(w *wireEvents) { w.events = w.events[:len(w.events)-1] }, wire: func(s string) string { return s + "data: [DONE]\n\n" }},
		{name: "missing_sequence", status: "failed", knowledge: "unknown", change: func(w *wireEvents) { delete(w.events[4], "sequence_number") }},
		{name: "repeated_sequence", status: "failed", knowledge: "unknown", change: func(w *wireEvents) { w.events[5]["sequence_number"] = 4 }},
		{name: "unknown_execution_event", status: "failed", knowledge: "unknown", wire: func(s string) string {
			return strings.Replace(s, "event: response.completed", "event: response.program.started\ndata: {\"type\":\"response.program.started\",\"sequence_number\":8}\n\nevent: response.completed", 1)
		}},
		{name: "late_semantic_event", status: "failed", knowledge: "unknown", wire: func(s string) string {
			return s + "event: response.output_item.added\ndata: {\"type\":\"response.output_item.added\",\"sequence_number\":9}\n\n"
		}},
		{name: "bad_original_utf8_after_usage", status: "failed", knowledge: "unknown", wire: func(s string) string { return s + "data: " + string([]byte{0xff}) + "\n\n" }},
		{name: "conflicting_event_label", status: "failed", knowledge: "unknown", wire: func(s string) string {
			return strings.Replace(s, "event: response.output_text.delta", "event: response.function_call_arguments.delta", 1)
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
			f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{}, nil)
			run := f.terminal(t, f.start(t))
			if run.Status != tc.status || tc.reason != "" && run.Reason != tc.reason || run.Usage == nil || run.Usage.Knowledge != tc.knowledge || requests.Load() != 1 {
				t.Fatal("terminal and billing are independent", run, run.Usage, requests.Load())
			}
			if strings.Contains(run.Reason, "SYNTHETIC_PRIVATE") {
				t.Fatal("provider detail leaked", run)
			}
			if tc.knowledge == "known" {
				input, output := "9", "4"
				if tc.zero {
					input, output = "0", "0"
				}
				if run.Usage.InputTokens != input || run.Usage.OutputTokens != output {
					t.Fatal("usage presence lost", run.Usage)
				}
			}
			var count, ended int
			var state string
			var charged int64
			if err := responseDB(t, f).QueryRow("SELECT count(*),state,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&count, &state, &ended, &charged); err != nil {
				t.Fatal(err)
			}
			if count != 1 || state != "settled" || ended != 1 || tc.zero && charged != 0 || tc.knowledge == "unknown" && charged <= 0 {
				t.Fatal("actual attempt not durably settled", count, state, ended, charged)
			}
		})
	}
}

func TestInvalidCompleteToolBatchNeverPublishesFirstApproval(t *testing.T) {
	for _, mode := range []string{"second_unknown_tool", "second_invalid_schema", "duplicate_call_id", "duplicate_item_id", "program_caller", "namespace_null", "namespace_named", "unknown_phase", "unknown_hosted_item", "arguments_done_conflict", "completed_output_conflict", "duplicate_item_done", "duplicate_terminal", "incomplete_item_completed_terminal"} {
		t.Run(mode, func(t *testing.T) {
			items := mixedItems()
			mutate := func(index int, change func(map[string]any)) {
				var item map[string]any
				_ = json.Unmarshal(items[index], &item)
				change(item)
				items[index], _ = json.Marshal(item)
			}
			switch mode {
			case "second_unknown_tool":
				mutate(3, func(m map[string]any) { m["name"] = "not_registered" })
			case "second_invalid_schema":
				mutate(3, func(m map[string]any) {
					m["arguments"] = `{"content":"unauthorized","target":{"workspaceId":"workspace:responses"}}`
				})
			case "duplicate_call_id":
				mutate(3, func(m map[string]any) { m["call_id"] = "call_first" })
			case "duplicate_item_id":
				mutate(3, func(m map[string]any) { m["id"] = "fc_item_first" })
			case "program_caller":
				mutate(3, func(m map[string]any) { m["caller"] = map[string]any{"type": "program", "caller_id": "program_hidden"} })
			case "namespace_null":
				mutate(3, func(m map[string]any) { m["namespace"] = nil })
			case "namespace_named":
				mutate(3, func(m map[string]any) { m["namespace"] = "other_authority" })
			case "unknown_phase":
				mutate(2, func(m map[string]any) { m["phase"] = "execute" })
			case "unknown_hosted_item":
				mutate(3, func(m map[string]any) { m["type"] = "web_search_call" })
			case "incomplete_item_completed_terminal":
				mutate(3, func(m map[string]any) { m["status"] = "incomplete" })
			}
			stream := mixedTurn(items)
			for _, e := range stream.events {
				if mode == "arguments_done_conflict" && e["type"] == "response.function_call_arguments.done" && e["output_index"] == 3 {
					e["arguments"] = "{}"
				}
			}
			if mode == "completed_output_conflict" {
				responseObject(&stream)["output"] = []json.RawMessage{items[0], items[3], items[2], items[1]}
			}
			if mode == "duplicate_item_done" {
				copy := map[string]any{}
				for k, v := range stream.events[len(stream.events)-2] {
					copy[k] = v
				}
				copy["sequence_number"] = len(stream.events) - 1
				last := stream.events[len(stream.events)-1]
				last["sequence_number"] = len(stream.events)
				stream.events = append(stream.events[:len(stream.events)-1], copy, last)
			}
			if mode == "duplicate_terminal" {
				copy := map[string]any{}
				for k, v := range stream.events[len(stream.events)-1] {
					copy[k] = v
				}
				copy["sequence_number"] = len(stream.events)
				stream.events = append(stream.events, copy)
			}
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1); stream.write(w) }))
			t.Cleanup(server.Close)
			writer := &fixtureWriter{}
			f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.terminal(t, f.start(t))
			var approvals, checkpoints int
			if err := responseDB(t, f).QueryRow("SELECT (SELECT count(*) FROM access_approvals WHERE run_id=?),(SELECT count(*) FROM execution_checkpoints WHERE run_id=?)", run.ID, run.ID).Scan(&approvals, &checkpoints); err != nil {
				t.Fatal(err)
			}
			if run.Status != "failed" || requests.Load() != 1 || writer.writes.Load() != 0 || approvals != 0 || checkpoints != 0 {
				t.Fatal("invalid second item admitted first effect", run, requests.Load(), writer.writes.Load(), approvals, checkpoints)
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
				w.Header().Set("Location", other.URL+"/responses")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"error":{"message":"SYNTHETIC_PRIVATE_ERROR","type":"server_error"}}`)
			}))
			t.Cleanup(server.Close)
			f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{}, nil)
			run := f.terminal(t, f.start(t))
			if run.Status != "failed" || requests.Load() != 1 || redirects.Load() != 0 || run.Usage == nil || run.Usage.Knowledge != "unknown" || strings.Contains(run.Reason, "SYNTHETIC_PRIVATE") {
				t.Fatal(run, run.Usage, requests.Load(), redirects.Load())
			}
		})
	}
}
