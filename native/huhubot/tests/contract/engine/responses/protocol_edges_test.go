package responses_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	driver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func reasoningDeltas(stream wireEvents, incomplete bool) wireEvents {
	extra := wireEvents{}
	for index, text := range []string{"", "摘要🙂"} {
		fields := func() map[string]any {
			return map[string]any{"output_index": 0, "item_id": "rs_opaque", "summary_index": index}
		}
		e := fields()
		e["part"] = map[string]any{"type": "summary_text", "text": ""}
		extra.add("response.reasoning_summary_part.added", e)
		runes := []rune(text)
		for _, delta := range []string{string(runes[:len(runes)/2]), string(runes[len(runes)/2:])} {
			e = fields()
			e["delta"] = delta
			extra.add("response.reasoning_summary_text.delta", e)
		}
		if !incomplete || index == 0 {
			e = fields()
			e["text"] = text
			extra.add("response.reasoning_summary_text.done", e)
		}
		e = fields()
		e["part"] = map[string]any{"type": "summary_text", "text": text}
		if incomplete && index == 1 {
			e["status"] = "incomplete"
		}
		extra.add("response.reasoning_summary_part.done", e)
	}
	for _, delta := range []string{"synthetic private ", "reasoning"} {
		extra.add("response.reasoning_text.delta", map[string]any{"output_index": 0, "item_id": "rs_opaque", "content_index": 0, "delta": delta})
	}
	extra.add("response.reasoning_text.done", map[string]any{"output_index": 0, "item_id": "rs_opaque", "content_index": 0, "text": "synthetic private reasoning"})
	events := append(append(append([]map[string]any{}, stream.events[:6]...), extra.events...), stream.events[6:]...)
	for i, event := range events {
		event["sequence_number"] = i
	}
	return wireEvents{events: events}
}

func TestKnownPhaseAndReasoningDeltasKeepNativeReplayAndTerminalMeaning(t *testing.T) {
	for _, mode := range []string{"phase_absent", "phase_null", "phase_final_answer", "summary_incomplete_terminal", "summary_incomplete_completed_terminal"} {
		t.Run(mode, func(t *testing.T) {
			items := mixedItems()
			var message map[string]any
			_ = json.Unmarshal(items[2], &message)
			switch mode {
			case "phase_absent":
				delete(message, "phase")
			case "phase_null":
				message["phase"] = nil
			case "phase_final_answer":
				message["phase"] = "final_answer"
			}
			items[2], _ = json.Marshal(message)
			if mode == "summary_incomplete_terminal" {
				var reasoning map[string]any
				_ = json.Unmarshal(items[0], &reasoning)
				reasoning["status"] = "incomplete"
				items[0], _ = json.Marshal(reasoning)
			}
			stream := reasoningDeltas(mixedTurn(items), strings.HasPrefix(mode, "summary_incomplete"))
			if mode == "summary_incomplete_terminal" {
				stream.events[len(stream.events)-1]["type"] = "response.incomplete"
				responseObject(&stream)["status"] = "incomplete"
				responseObject(&stream)["incomplete_details"] = map[string]any{"reason": "max_output_tokens"}
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
			writer := &fixtureWriter{}
			f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			run := f.start(t)
			if strings.HasPrefix(mode, "summary_incomplete") {
				terminal := f.terminal(t, run)
				if terminal.Status != "failed" || requests.Load() != 1 || writer.writes.Load() != 0 {
					t.Fatal("incomplete summary became completed tools", terminal, requests.Load(), writer.writes.Load())
				}
				if mode == "summary_incomplete_terminal" && (terminal.Reason != "MODEL_OUTPUT_TRUNCATED" || terminal.Usage == nil || terminal.Usage.Knowledge != "known" || terminal.Usage.InputTokens != "10" || terminal.Usage.OutputTokens != "3") {
					t.Fatal("known interrupted summary lost actual terminal billing", terminal, terminal.Usage)
				}
				var checkpoints, approvals int
				if err := responseDB(t, f).QueryRow("SELECT (SELECT count(*) FROM execution_checkpoints WHERE run_id=?),(SELECT count(*) FROM access_approvals WHERE run_id=?)", run, run).Scan(&checkpoints, &approvals); err != nil || checkpoints != 0 || approvals != 0 {
					t.Fatal("incomplete summary reached a checkpoint/effect gate", checkpoints, approvals, err)
				}
				return
			}
			f.decide(t, f.approval(t, run), "reject")
			f.decide(t, f.approval(t, run), "reject")
			terminal := f.terminal(t, run)
			if terminal.Status != "succeeded" || requests.Load() != 2 || writer.writes.Load() != 0 {
				t.Fatal(terminal, requests.Load(), writer.writes.Load())
			}
			<-bodies
			var input []json.RawMessage
			if err := json.Unmarshal((<-bodies)["input"], &input); err != nil || len(input) != 9 {
				t.Fatal("known shape lost complete replay", len(input), err)
			}
			responsesInitialPrefix(t, input, "one intention")
			for i, raw := range items {
				var original, replay any
				_ = json.Unmarshal(raw, &original)
				_ = json.Unmarshal(input[i+3], &replay)
				if !reflect.DeepEqual(original, replay) {
					t.Fatal("native field presence/deltas changed final item", i, string(input[i+3]))
				}
			}
			history, err := f.core.API.Conversation.History(context.Background(), responsesOwner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile}, SessionID: f.session})
			if err != nil {
				t.Fatal(err)
			}
			public, _ := json.Marshal(history)
			if bytes.Contains(public, []byte("synthetic private reasoning")) || bytes.Contains(public, []byte("摘要")) || bytes.Contains(public, []byte("opaque+")) {
				t.Fatal("private reasoning delta entered public history")
			}
		})
	}
}

type checkpointOutcomeEngine struct {
	*common.Engine
	outcomes chan error
}

func (e *checkpointOutcomeEngine) Run(ctx context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	out, err := e.Engine.Run(ctx, in, sink)
	e.outcomes <- err
	return out, err
}

func TestResponsesOpaqueCheckpointBoundIncludesEncodingExpansion(t *testing.T) {
	for _, count := range []int{40000, 90000} {
		t.Run(fmt.Sprint(count), func(t *testing.T) {
			items := mixedItems()
			for _, index := range []int{0, 4} {
				item := map[string]any{"id": fmt.Sprint("reasoning_", index), "type": "reasoning", "summary": []any{}, "encrypted_content": strings.Repeat("\\", count), "status": "completed"}
				raw, _ := json.Marshal(item)
				if index == 0 {
					items[0] = raw
				} else {
					items = append(items, raw)
				}
			}
			stream := mixedTurn(items)
			last := stream.events[len(stream.events)-1]
			stream.events = stream.events[:len(stream.events)-1]
			stream.add("response.output_item.done", map[string]any{"output_index": 4, "item": items[4]})
			last["sequence_number"] = len(stream.events)
			stream.events = append(stream.events, last)
			var wire strings.Builder
			for _, event := range stream.events {
				raw, _ := json.Marshal(event)
				if len(raw) >= common.MaxEventBytes-100 {
					t.Fatal("fixture must exercise CP bound, not raw event bound", len(raw))
				}
				// LF between array objects is legal JSON whitespace. Multiple SSE
				// data lines keep each actual line below the separate raw limit.
				data := strings.ReplaceAll(string(raw), "},{", "},\ndata: {")
				for _, line := range strings.Split(data, "\n") {
					if len(line) >= common.MaxLineBytes-100 {
						t.Fatal("fixture exceeded line boundary", len(line))
					}
				}
				fmt.Fprintf(&wire, "event: %s\ndata: %s\n\n", event["type"], data)
			}
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				fmt.Fprint(w, wire.String())
			}))
			t.Cleanup(server.Close)
			writer := &fixtureWriter{}
			engine, registry := newResponseEngine(t, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
				return []byte("synthetic-responses-key"), api.CredentialStatus{State: "available"}, nil
			})
			observed := &checkpointOutcomeEngine{Engine: engine, outcomes: make(chan error, 1)}
			f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{Engine: observed, EngineVersion: driver.EngineVersion, Probe: registry, NoteWriter: writer}, []string{"note.write"})
			run := f.start(t)
			if count == 40000 {
				_ = f.approval(t, run)
				if err := <-observed.outcomes; err != nil {
					t.Fatal("bounded CP engine failed", err)
				}
				artifact, payload := checkpointPayload(t, f, run)
				if artifact.Size != int64(len(payload)) || len(payload) <= 500000 || len(payload) > common.MaxCheckpointBytes {
					t.Fatal("positive encoded CP boundary was not real", artifact.Size, len(payload))
				}
				current, err := f.core.API.Conversation.GetRun(context.Background(), responsesOwner, api.IDQuery{ProfileID: f.profile, ID: run})
				if err != nil {
					t.Fatal(err)
				}
				if _, err := f.core.API.Approvals.Cancel(context.Background(), responsesOwner, api.RunCancel{CommandMeta: f.meta(current.Revision), ID: run}); err != nil {
					t.Fatal(err)
				}
				_ = f.terminal(t, run)
			} else {
				terminal := f.terminal(t, run)
				fault, ok := (<-observed.outcomes).(*api.Fault)
				if !ok || fault.Reason != "CHECKPOINT_SIZE_LIMIT" {
					t.Fatal("encoded CP overflow was hidden by another boundary", fault)
				}
				// Executor intentionally projects returned Engine errors to its
				// fixed public reason; the wrapper only observes the real cause.
				if terminal.Status != "failed" || terminal.Reason != "MODEL_EXECUTION_FAILED" || terminal.Usage == nil || terminal.Usage.Knowledge != "known" {
					t.Fatal("encoded CP limit lost safe public failure/accounting", terminal)
				}
				var checkpoints, approvals int
				if err := responseDB(t, f).QueryRow("SELECT (SELECT count(*) FROM execution_checkpoints WHERE run_id=?),(SELECT count(*) FROM access_approvals WHERE run_id=?)", run, run).Scan(&checkpoints, &approvals); err != nil || checkpoints != 0 || approvals != 0 {
					t.Fatal("oversize state became suspended", checkpoints, approvals, err)
				}
			}
			if requests.Load() != 1 || writer.writes.Load() != 0 {
				t.Fatal("size boundary admitted effects/retried", requests.Load(), writer.writes.Load())
			}
		})
	}
}

func TestDefaultResponsesProbeUsesMatchingMetadataOnly(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		body, err := io.ReadAll(r.Body)
		if err != nil || len(body) != 0 || r.Method != "GET" || r.Header.Get("Authorization") != "Bearer synthetic-responses-key" {
			t.Error("probe generated or included conversation", r.Method, string(body), err)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/models/fixture-model":
			fmt.Fprint(w, `{"id":"fixture-model","object":"model","owned_by":"fixture","capabilities":["tools"],"supports_tools":true}`)
		case "/v1/models/wrong-id":
			fmt.Fprint(w, `{"id":"another-model","object":"model"}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"error":{"message":"SYNTHETIC_PRIVATE_PROBE_ERROR"}}`)
		}
	}))
	t.Cleanup(server.Close)
	f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{}, nil)
	agent, err := f.core.API.Assistant.Get(context.Background(), responsesOwner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"fixture-model", "wrong-id", "missing-model", "../model", "..", "model?x=1", "model#x", "%2fmodel"} {
		t.Run(id, func(t *testing.T) {
			model := agent.Model.ModelBindingDraft
			model.ModelID = id
			before := requests.Load()
			result, err := f.core.API.Assistant.TestModel(context.Background(), responsesOwner, api.ModelTest{ProfileID: f.profile, Model: model})
			if id == "fixture-model" {
				if err != nil || !result.Available || result.Capabilities == nil || len(result.Capabilities) != 0 {
					t.Fatal("metadata was treated as generation capability proof", result, err)
				}
			} else if err == nil || strings.Contains(err.Error(), "SYNTHETIC_PRIVATE") {
				t.Fatal("wrong metadata/error was accepted or disclosed", result, err)
			}
			want := int32(0)
			if id == "fixture-model" || id == "wrong-id" || id == "missing-model" {
				want = 1
			}
			if requests.Load()-before != want {
				t.Fatal("probe retried/generated or accepted unsafe path", id, requests.Load()-before, want)
			}
		})
	}
	var attempts, runs int
	if err := responseDB(t, f).QueryRow("SELECT (SELECT count(*) FROM model_attempts),(SELECT count(*) FROM execution_runs)").Scan(&attempts, &runs); err != nil || attempts != 0 || runs != 0 {
		t.Fatal("metadata request entered model generation budget", attempts, runs, err)
	}
}
