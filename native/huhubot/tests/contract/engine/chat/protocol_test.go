package chat_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestUnavailableModelFailsBeforeCredentialOrHTTP(t *testing.T) {
	for _, mode := range []string{"empty", "unsupported"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1) }))
			t.Cleanup(server.Close)
			t.Setenv("OPENAI_API_KEY", "SECRET_ENVIRONMENT_KEY")
			t.Setenv("OPENAI_BASE_URL", server.URL+"/environment")
			f, _, resolutions := capturedFixture(t, server.URL+"/v1", nil, nil)
			a, err := f.core.API.Assistant.Get(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
			if err != nil {
				t.Fatal(err)
			}
			draft := api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona}
			want := "MODEL_DRAFT_INCOMPLETE"
			if mode == "unsupported" {
				m := a.Model.ModelBindingDraft
				m.Protocol = "openai-responses"
				draft.Model = &m
				want = "ADAPTER_NOT_ASSEMBLED"
			}
			if _, err = f.core.API.Assistant.Update(context.Background(), owner, api.AgentUpdate{CommandMeta: f.meta(a.Revision), ID: a.ID, Draft: draft}); err != nil {
				t.Fatal(err)
			}
			run := f.terminal(t, f.start(t).RunID)
			if run.Status != "failed" || run.Reason != want || requests.Load() != 0 || resolutions.Load() != 0 {
				t.Fatal(run, requests.Load(), resolutions.Load())
			}
		})
	}
}

func fixtureDB(t *testing.T, f *fixture) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", filepath.Join(f.locator, "profile.sqlite3"))
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
func textTurn(w http.ResponseWriter, text, finish string, usage any, done bool) {
	w.Header().Set("Content-Type", "text/event-stream")
	if text != "" {
		sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "content": text}}}})
	}
	if finish != "" {
		sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{}, "finish_reason": finish}}})
	}
	if usage != nil {
		sse(w, map[string]any{"choices": []any{}, "usage": usage})
	}
	if done {
		fmt.Fprint(w, "data: [DONE]\n\n")
	}
}

func TestUsageKnowledgeAndTerminalAreIndependent(t *testing.T) {
	for _, tc := range []struct {
		name                     string
		usage                    any
		knowledge, input, output string
	}{
		{"known", map[string]any{"prompt_tokens": 9, "completion_tokens": 4, "total_tokens": 13}, "known", "9", "4"},
		{"zero", map[string]any{"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}, "known", "0", "0"},
		{"missing", nil, "unknown", "", ""},
		{"partial", map[string]any{"prompt_tokens": 9}, "unknown", "9", ""},
		{"nulls", map[string]any{"prompt_tokens": nil, "completion_tokens": nil}, "unknown", "", ""},
		{"negative", map[string]any{"prompt_tokens": -1, "completion_tokens": 4}, "unknown", "", "4"},
		{"fractional", map[string]any{"prompt_tokens": 1.5, "completion_tokens": 4}, "unknown", "", "4"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				textTurn(w, "answer", "stop", tc.usage, true)
			}))
			t.Cleanup(server.Close)
			f := newFixture(t, server.URL+"/v1")
			run := f.terminal(t, f.start(t).RunID)
			wantStatus := "succeeded"
			if tc.name == "fractional" {
				wantStatus = "failed"
			} // the real SDK rejects a noninteger usage field.
			if run.Status != wantStatus || requests.Load() != 1 {
				t.Fatal(run, requests.Load())
			}
			var knowledge, input, output string
			var producer int
			if err := fixtureDB(t, f).QueryRow("SELECT knowledge,input_tokens,output_tokens,producer_ended FROM model_attempts WHERE run_id=?", run.ID).Scan(&knowledge, &input, &output, &producer); err != nil {
				t.Fatal(err)
			}
			if knowledge != tc.knowledge || input != tc.input || output != tc.output || producer != 1 {
				t.Fatalf("knowledge=%s input=%q output=%q producer=%d", knowledge, input, output, producer)
			}
		})
	}
}

func TestBrokenOrRejectedStreamsNeverExecuteTools(t *testing.T) {
	for _, tc := range []struct {
		name, reason string
		write        func(http.ResponseWriter)
	}{
		{"missing_done", "MODEL_STREAM_INCOMPLETE", func(w http.ResponseWriter) { textTurn(w, "partial", "stop", nil, false) }},
		{"missing_finish", "MODEL_STREAM_INCOMPLETE", func(w http.ResponseWriter) { textTurn(w, "partial", "", nil, true) }},
		{"empty", "MODEL_STREAM_INCOMPLETE", func(w http.ResponseWriter) {}},
		{"done_only", "MODEL_STREAM_INCOMPLETE", func(w http.ResponseWriter) { fmt.Fprint(w, "data: [DONE]\n\n") }},
		{"half_json", "MODEL_STREAM_INCOMPLETE", func(w http.ResponseWriter) { fmt.Fprint(w, "data: {\"choices\":[") }},
		{"length", "MODEL_OUTPUT_TRUNCATED", func(w http.ResponseWriter) { textTurn(w, "partial", "length", nil, true) }},
		{"filtered", "MODEL_CONTENT_FILTERED", func(w http.ResponseWriter) { textTurn(w, "partial", "content_filter", nil, true) }},
		{"secret_finish", "MODEL_FINISH_UNKNOWN", func(w http.ResponseWriter) { textTurn(w, "partial", "SECRET_PRIVATE_PROVIDER_FINISH", nil, true) }},
		{"refusal", "MODEL_REFUSED", func(w http.ResponseWriter) {
			sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"refusal": "SECRET_PRIVATE_REFUSAL"}, "finish_reason": "stop"}}})
			fmt.Fprint(w, "data: [DONE]\n\n")
		}},
		{"tools_with_stop", "MODEL_STREAM_INVALID", func(w http.ResponseWriter) {
			sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"tool_calls": []any{noteCall(0, "call-forbidden", "resource:one", "body")}}, "finish_reason": "stop"}}})
			fmt.Fprint(w, "data: [DONE]\n\n")
		}},
		{"tool_finish_without_calls", "MODEL_STREAM_INVALID", func(w http.ResponseWriter) { textTurn(w, "", "tool_calls", nil, true) }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				tc.write(w)
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.terminal(t, f.start(t).RunID)
			if run.Status != "failed" || run.Reason != tc.reason || requests.Load() != 1 || writer.calls.Load() != 0 {
				t.Fatal(run, requests.Load(), writer.calls.Load())
			}
			data, _ := json.Marshal(run)
			if strings.Contains(string(data), "SECRET_PRIVATE") {
				t.Fatal("provider secret escaped", string(data))
			}
			var effects, pending int
			db := fixtureDB(t, f)
			if err := db.QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=?", run.ID).Scan(&effects); err != nil {
				t.Fatal(err)
			}
			if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=? AND (state<>'settled' OR producer_ended<>1)", run.ID).Scan(&pending); err != nil {
				t.Fatal(err)
			}
			if effects != 0 || pending != 0 {
				t.Fatal("invalid stream reached effect or unsettled producer", effects, pending)
			}
		})
	}
}

func TestHTTPFailuresAndRedirectsNeverRetryOrLeak(t *testing.T) {
	for _, code := range []int{302, 307, 429, 500} {
		t.Run(fmt.Sprint(code), func(t *testing.T) {
			var original, redirect atomic.Int32
			target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirect.Add(1) }))
			t.Cleanup(target.Close)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				original.Add(1)
				w.Header().Set("Location", target.URL+"/stolen")
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(code)
				fmt.Fprint(w, `{"error":{"message":"SECRET_PRIVATE_HTTP_BODY","type":"fixture"}}`)
			}))
			t.Cleanup(server.Close)
			f := newFixture(t, server.URL+"/v1")
			run := f.terminal(t, f.start(t).RunID)
			if run.Status != "failed" || run.Reason != "MODEL_STREAM_FAILED" || original.Load() != 1 || redirect.Load() != 0 {
				t.Fatal(run, original.Load(), redirect.Load())
			}
			if run.Usage == nil || run.Usage.Knowledge != "unknown" {
				t.Fatal("failed dispatched HTTP became free", run.Usage)
			}
		})
	}
}

func TestEntireToolBatchIsValidatedBeforeAnyEffect(t *testing.T) {
	for _, tc := range []struct {
		name   string
		mutate func(map[string]any)
	}{
		{"unknown", func(c map[string]any) { c["function"].(map[string]any)["name"] = "secret_unknown" }},
		{"canonical_not_wire", func(c map[string]any) { c["function"].(map[string]any)["name"] = "note.write" }},
		{"duplicate_key", func(c map[string]any) {
			c["function"].(map[string]any)["arguments"] = `{"target":{},"content":"one","content":"two"}`
		}},
		{"extra_identity", func(c map[string]any) {
			c["function"].(map[string]any)["arguments"] = `{"target":{},"content":"one","profileId":"forged"}`
		}},
		{"missing_arguments", func(c map[string]any) { c["function"].(map[string]any)["arguments"] = "" }},
		{"empty_note", func(c map[string]any) { c["function"].(map[string]any)["arguments"] = "{}" }},
		{"duplicate_id", func(c map[string]any) { c["id"] = "first-valid" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			second := noteCall(1, "second-invalid", "resource:two", "two")
			tc.mutate(second)
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				toolTurn(w, []map[string]any{noteCall(0, "first-valid", "resource:one", "one"), second})
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.terminal(t, f.start(t).RunID)
			var effects int
			if err := fixtureDB(t, f).QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=?", run.ID).Scan(&effects); err != nil {
				t.Fatal(err)
			}
			if run.Status != "failed" || effects != 0 || writer.calls.Load() != 0 || requests.Load() != 1 {
				t.Fatal(run, effects, writer.calls.Load(), requests.Load())
			}
		})
	}
}
