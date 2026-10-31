package anthropic_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	driver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/anthropic"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type checkpointOutcomeEngine struct {
	*common.Engine
	outcomes chan error
}

func (e *checkpointOutcomeEngine) Run(ctx context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	out, err := e.Engine.Run(ctx, in, sink)
	e.outcomes <- err
	return out, err
}

func TestAnthropicOpaqueCheckpointBoundIncludesEncodingExpansion(t *testing.T) {
	for _, count := range []int{40000, 90000} {
		t.Run(fmt.Sprint(count), func(t *testing.T) {
			blocks := mixedBlocks()
			blocks[0]["signature"] = strings.Repeat("\\", count)
			blocks[4]["data"] = strings.Repeat("\\", count)
			stream := mixedTurn(blocks)
			for _, event := range stream.events {
				raw, _ := json.Marshal(event)
				if len(raw) >= common.MaxLineBytes-100 || len(raw) >= common.MaxEventBytes-100 {
					t.Fatal("fixture must exercise encoded CP, not raw line/event boundary", len(raw))
				}
			}
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1); stream.write(w) }))
			t.Cleanup(server.Close)
			writer := &fixtureWriter{}
			engine, registry := newAnthropicEngine(t, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
				return []byte("synthetic-anthropic-key"), api.CredentialStatus{State: "available"}, nil
			})
			observed := &checkpointOutcomeEngine{Engine: engine, outcomes: make(chan error, 1)}
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{Engine: observed, EngineVersion: driver.EngineVersion, Probe: registry, NoteWriter: writer}, []string{"note.write"})
			run := f.start(t)
			if count == 40000 {
				_ = f.approval(t, run)
				if err := <-observed.outcomes; err != nil {
					t.Fatal("bounded CP engine failed", err)
				}
				artifact, payload := checkpointPayload(t, f, run)
				if artifact.Size != int64(len(payload)) || len(payload) <= 500000 || len(payload) > common.MaxCheckpointBytes {
					t.Fatal("positive encoded CP boundary not exercised", artifact.Size, len(payload))
				}
				current, err := f.core.API.Conversation.GetRun(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: run})
				if err != nil {
					t.Fatal(err)
				}
				if _, err := f.core.API.Approvals.Cancel(context.Background(), anthropicOwner, api.RunCancel{CommandMeta: f.meta(current.Revision), ID: run}); err != nil {
					t.Fatal(err)
				}
				_ = f.terminal(t, run)
			} else {
				terminal := f.terminal(t, run)
				fault, ok := (<-observed.outcomes).(*api.Fault)
				if !ok || fault.Reason != "CHECKPOINT_SIZE_LIMIT" {
					t.Fatal("CP overflow hidden by another boundary", fault)
				}
				// The explicit wrapper observes the real Engine error only.
				// Executor intentionally projects it to a fixed public reason.
				if terminal.Status != "failed" || terminal.Reason != "MODEL_EXECUTION_FAILED" || terminal.Usage == nil || terminal.Usage.Knowledge != "known" {
					t.Fatal("encoded bound lost safe failure/accounting", terminal, terminal.Usage)
				}
				var checkpoints, approvals int
				if err := anthropicDB(t, f).QueryRow("SELECT (SELECT count(*) FROM execution_checkpoints WHERE run_id=?),(SELECT count(*) FROM access_approvals WHERE run_id=?)", run, run).Scan(&checkpoints, &approvals); err != nil || checkpoints != 0 || approvals != 0 {
					t.Fatal("oversize CP admitted a suspended effect", checkpoints, approvals, err)
				}
			}
			if requests.Load() != 1 || writer.writes.Load() != 0 {
				t.Fatal("encoded bound retried or wrote effect", requests.Load(), writer.writes.Load())
			}
		})
	}
}

func TestDefaultAnthropicProbeUsesMatchingMetadataOnly(t *testing.T) {
	var requests, redirects atomic.Int32
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirects.Add(1); w.WriteHeader(http.StatusOK) }))
	t.Cleanup(other.Close)
	metadata := func(id string) map[string]any {
		supported := map[string]any{"supported": true}
		return map[string]any{"id": id, "type": "model", "display_name": "Synthetic fixture", "created_at": "2026-01-01T00:00:00Z", "max_input_tokens": 200000, "max_tokens": 8192, "capabilities": map[string]any{
			"batch": supported, "citations": supported, "code_execution": supported, "image_input": supported, "pdf_input": supported, "structured_outputs": supported,
			"context_management": map[string]any{"supported": true, "clear_thinking_20251015": supported, "clear_tool_uses_20250919": supported, "compact_20260112": supported},
			"effort":             map[string]any{"supported": true, "low": supported, "medium": supported, "high": supported, "xhigh": supported, "max": supported},
			"thinking":           map[string]any{"supported": true, "types": map[string]any{"adaptive": supported, "enabled": supported}},
		}}
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		body, err := io.ReadAll(r.Body)
		if err != nil || len(body) != 0 || r.Method != "GET" || r.Header.Get("X-Api-Key") != "synthetic-anthropic-key" || r.Header.Get("Anthropic-Version") != "2023-06-01" {
			t.Error("probe generated or sent conversation", r.Method, len(body), err)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/models/fixture-model":
			_ = json.NewEncoder(w).Encode(metadata("fixture-model"))
		case "/v1/models/wrong-id":
			_ = json.NewEncoder(w).Encode(metadata("another-model"))
		case "/v1/models/redirect-model":
			w.Header().Set("Location", other.URL+"/v1/models/fixture-model")
			w.WriteHeader(http.StatusFound)
		default:
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"type":"error","error":{"type":"not_found_error","message":"SYNTHETIC_PRIVATE_PROBE_ERROR"}}`)
		}
	}))
	t.Cleanup(server.Close)
	f := newAnthropicFixture(t, server.URL, bootstrap.Options{}, nil)
	agent, err := f.core.API.Assistant.Get(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"fixture-model", "wrong-id", "missing-model", "redirect-model", "../model", "..", "model?x=1", "model#x", "%2fmodel", "model\\child", "model\nchild", ""} {
		t.Run(id, func(t *testing.T) {
			model := agent.Model.ModelBindingDraft
			model.ModelID = id
			before := requests.Load()
			result, err := f.core.API.Assistant.TestModel(context.Background(), anthropicOwner, api.ModelTest{ProfileID: f.profile, Model: model})
			if id == "fixture-model" {
				if err != nil || !result.Available || result.Capabilities == nil || len(result.Capabilities) != 0 {
					t.Fatal("metadata claimed HUHU capabilities", result, err)
				}
			} else if err == nil || strings.Contains(err.Error(), "SYNTHETIC_PRIVATE") {
				t.Fatal("wrong metadata accepted or error disclosed", result, err)
			}
			want := int32(0)
			if id == "fixture-model" || id == "wrong-id" || id == "missing-model" || id == "redirect-model" {
				want = 1
			}
			if requests.Load()-before != want || redirects.Load() != 0 {
				t.Fatal("Probe changed destination/retried/generated", id, requests.Load()-before, want, redirects.Load())
			}
		})
	}
	var attempts, runs int
	if err := anthropicDB(t, f).QueryRow("SELECT (SELECT count(*) FROM model_attempts),(SELECT count(*) FROM execution_runs)").Scan(&attempts, &runs); err != nil || attempts != 0 || runs != 0 {
		t.Fatal("metadata entered generation ledger", attempts, runs, err)
	}
}

func TestEmptyToolObjectRemainsPresentWithoutJSONDelta(t *testing.T) {
	for _, mode := range []string{"no_delta", "empty_delta", "more_text_blocks_than_tool_limit"} {
		t.Run(mode, func(t *testing.T) {
			stream := functionTurn("agents_discover", "{}", "toolu_empty", "msg_empty")
			toolIndex := 0
			if mode == "no_delta" {
				stream.events = append(stream.events[:2], stream.events[3:]...)
			} else {
				stream.events[2]["delta"].(map[string]any)["partial_json"] = ""
			}
			if mode == "more_text_blocks_than_tool_limit" {
				toolIndex = 33
				extra := wireEvents{}
				for i := 0; i < 33; i++ {
					extra.add("content_block_start", map[string]any{"index": i, "content_block": map[string]any{"type": "text", "text": ""}})
					extra.add("content_block_stop", map[string]any{"index": i})
				}
				for _, event := range stream.events {
					if _, ok := event["index"]; ok {
						event["index"] = toolIndex
					}
				}
				stream.events = append(append(append([]map[string]any{}, stream.events[:1]...), extra.events...), stream.events[1:]...)
			}
			var requests atomic.Int32
			bodies := make(chan map[string]json.RawMessage, 3)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]json.RawMessage
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				bodies <- body
				if requests.Add(1) == 1 {
					stream.write(w)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				fmt.Fprint(w, successfulTextStream)
			}))
			t.Cleanup(server.Close)
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{}, []string{"agents.discover"})
			run := f.terminal(t, f.start(t))
			if run.Status != "succeeded" || requests.Load() != 2 {
				t.Fatal("legal empty object not executed once", run, requests.Load())
			}
			<-bodies
			body := <-bodies
			var messages []map[string]json.RawMessage
			if json.Unmarshal(body["messages"], &messages) != nil || len(messages) != 4 {
				t.Fatal("missing local replay", string(body["messages"]))
			}
			anthropicInitialPrefix(t, messages, "one intention")
			var blocks []map[string]json.RawMessage
			if json.Unmarshal(messages[2]["content"], &blocks) != nil || len(blocks) != toolIndex+1 || string(blocks[toolIndex]["input"]) != "{}" {
				t.Fatal("empty input presence or block index changed", string(messages[2]["content"]))
			}
			var outputs []map[string]any
			if json.Unmarshal(messages[3]["content"], &outputs) != nil || len(outputs) != 1 || outputs[0]["tool_use_id"] != "toolu_empty" || outputs[0]["is_error"] != false {
				t.Fatal("empty-object tool result identity lost", string(messages[3]["content"]))
			}
		})
	}
}

type failingSinkEngine struct {
	*common.Engine
	panicSink bool
}

func (e *failingSinkEngine) Run(ctx context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.Engine.Run(ctx, in, func(event api.EngineEvent) error {
		if event.Type == "text.delta" {
			if e.panicSink {
				panic("SYNTHETIC_PRIVATE_SINK_PANIC")
			}
			return api.Denied("SYNTHETIC_PRIVATE_SINK_ERROR")
		}
		return sink(event)
	})
}

func TestAnthropicTextCallbackFailureEndsActualProducer(t *testing.T) {
	for _, panics := range []bool{false, true} {
		t.Run(fmt.Sprint(panics), func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				fmt.Fprint(w, successfulTextStream)
			}))
			t.Cleanup(server.Close)
			engine, registry := newAnthropicEngine(t, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
				return []byte("synthetic-anthropic-key"), api.CredentialStatus{State: "available"}, nil
			})
			observed := &failingSinkEngine{Engine: engine, panicSink: panics}
			f := newAnthropicFixture(t, server.URL, bootstrap.Options{Engine: observed, EngineVersion: driver.EngineVersion, Probe: registry}, nil)
			run := f.terminal(t, f.start(t))
			if run.Status != "failed" || run.Usage == nil || run.Usage.Knowledge != "unknown" || strings.Contains(run.Reason, "SYNTHETIC_PRIVATE") || requests.Load() != 1 {
				t.Fatal("callback fault escaped safe drain", run, run.Usage, requests.Load())
			}
			var state string
			var ended int
			if err := anthropicDB(t, f).QueryRow("SELECT state,producer_ended FROM model_attempts WHERE run_id=?", run.ID).Scan(&state, &ended); err != nil || state != "settled" || ended != 1 {
				t.Fatal("callback producer remained live", state, ended, err)
			}
			closeCore(t, f.core)
		})
	}
}

func TestAnthropicExhaustedBudgetHasNoActualHTTPRequest(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, successfulTextStream)
	}))
	t.Cleanup(server.Close)
	f := newAnthropicFixture(t, server.URL, bootstrap.Options{Budget: api.BudgetPolicy{RootTokenLimit: "1", ProfileTokenLimit: "1"}}, nil)
	run := f.terminal(t, f.start(t))
	var attempts int
	if err := anthropicDB(t, f).QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", run.ID).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if run.Status != "failed" || run.Reason != "MODEL_BUDGET_EXHAUSTED" || requests.Load() != 0 || attempts != 0 {
		t.Fatal("SDK bypassed actual budget admission", run, requests.Load(), attempts)
	}
}
