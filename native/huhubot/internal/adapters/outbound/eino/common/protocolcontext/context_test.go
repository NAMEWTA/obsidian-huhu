package protocolcontext_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/anthropic"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// No Core, Store, TestMain, init hook or embedded source is involved. SDKs,
// actual HTTP bodies and the common loop remain production implementations.
type protocol struct{ name string }

func (p protocol) driver(t *testing.T, transport http.RoundTripper) common.ProtocolDriver {
	t.Helper()
	if p.name == common.ChatProtocol {
		if transport == nil {
			return chat.NewDriver()
		}
		return chat.NewDriverWithTransport(transport)
	}
	var d common.ProtocolDriver
	var err error
	if p.name == common.ResponsesProtocol {
		if transport == nil {
			d, err = responses.NewDriver()
		} else {
			d, err = responses.NewDriverWithTransport(transport)
		}
	} else {
		if transport == nil {
			d, err = anthropic.NewDriver()
		} else {
			d, err = anthropic.NewDriverWithTransport(transport)
		}
	}
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func hash(text string) string {
	h := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(h[:])
}

type attempts struct {
	mu           sync.Mutex
	requests     []api.AttemptRequest
	observations []api.AttemptObservation
}

func (a *attempts) Reserve(_ context.Context, q api.AttemptRequest) (api.AttemptReservation, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.requests = append(a.requests, q)
	return api.AttemptReservation{ID: fmt.Sprint("attempt:", len(a.requests)), RunID: "run:protocol"}, nil
}
func (*attempts) Dispatch(ctx context.Context, _ api.AttemptReservation, f func(context.Context) error) error {
	return f(ctx)
}
func (a *attempts) Settle(_ context.Context, _ api.AttemptReservation, o api.AttemptObservation) (api.AttemptReceipt, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.observations = append(a.observations, o)
	return api.AttemptReceipt{State: "settled"}, nil
}
func (*attempts) AbortUnsent(context.Context, api.AttemptReservation) error { return nil }

func input(t *testing.T, p protocol, endpoint string, sealed, maintenance bool) api.EngineInput {
	t.Helper()
	agent := api.Agent{ID: "agent:protocol", Persona: "Fixed persona.", AllowedTools: []string{"note.write"}, Model: &api.ModelBinding{ModelBindingDraft: api.ModelBindingDraft{Protocol: p.name, ProviderID: "fixture", ModelID: "fixture-model", CredentialRef: "credential:protocol", Endpoint: endpoint}}}
	in := api.EngineInput{RunID: "run:protocol", SessionID: "session:protocol", Intent: "Accepted intention.", Agent: agent, Config: api.TaskConfigSnapshot{ID: "config:protocol", Kind: "agent", SubjectID: agent.ID, Agent: agent}, Lineage: api.ExecutionLineage{ConfigSnapshotID: "config:protocol", SubjectKind: "agent", SubjectID: agent.ID, WorkThreadID: "thread:protocol"}, Attempts: &attempts{}}
	if !sealed {
		return in
	}
	in.ShortTerm = &api.ShortTermInput{Version: "1", Namespace: api.ContextNamespace{SubjectKind: "agent", SubjectID: agent.ID, SessionID: in.SessionID, WorkThreadID: in.Lineage.WorkThreadID}, IntentHash: hash(in.Intent), Entries: []api.ShortTermEntry{}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1"}}
	in.Memory = &api.ExecutionMemoryInput{Version: "1", Mode: "recall", Namespace: api.MemoryNamespace{Kind: "agent", ID: agent.ID}, Entries: []api.MemoryInputEntry{{Ref: api.DerivedInput{Kind: "memory_revision", ID: "revision:protocol", Revision: "1", Hash: hash("已选择的记忆。"), Namespace: agent.ID, WorkThreadID: in.Lineage.WorkThreadID}, Role: "memory", Text: "已选择的记忆。"}}}
	if maintenance {
		in.ShortTerm = nil
		in.Memory.Mode, in.Memory.JobID, in.Memory.JobGeneration, in.Memory.SettingsRevision = "maintenance", "job:protocol", "1", "2"
	}
	var err error
	if in.ShortTerm != nil {
		in.ShortTerm.BindingDigest, err = api.CanonicalShortTermBinding(*in.ShortTerm)
		if err != nil {
			t.Fatal(err)
		}
	}
	in.Memory.BindingDigest, err = api.CanonicalMemoryInputBinding(*in.Memory)
	if err != nil {
		t.Fatal(err)
	}
	return in
}

func engine(t *testing.T, driver common.ProtocolDriver, resolutions *atomic.Int32) *common.Engine {
	t.Helper()
	r, err := common.NewRegistry(driver)
	if err != nil {
		t.Fatal(err)
	}
	e := common.NewEngine(r, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
		resolutions.Add(1)
		return []byte("synthetic-key"), api.CredentialStatus{State: "available"}, nil
	})
	t.Cleanup(func() {
		e.Stop()
		select {
		case <-e.Done():
		case <-time.After(5 * time.Second):
			t.Error("SDK/HTTP/settlement did not actually join")
			return
		}
		if err := e.Close(); err != nil {
			t.Error(err)
		}
	})
	return e
}

func event(w http.ResponseWriter, kind string, sequence int, fields map[string]any) {
	fields["type"] = kind
	if strings.HasPrefix(kind, "response.") {
		fields["sequence_number"] = sequence
	}
	b, _ := json.Marshal(fields)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", kind, b)
}

func (p protocol) text(w http.ResponseWriter, text string) {
	w.Header().Set("Content-Type", "text/event-stream")
	if p.name == common.ChatProtocol {
		b, _ := json.Marshal(text)
		fmt.Fprintf(w, "data: {\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":%s}}]}\n\ndata: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\ndata: [DONE]\n\n", b)
		return
	}
	if p.name == common.AnthropicProtocol {
		event(w, "message_start", 0, map[string]any{"message": map[string]any{"id": "msg_context", "type": "message", "role": "assistant", "model": "fixture-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 9, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}}})
		event(w, "content_block_start", 0, map[string]any{"index": 0, "content_block": map[string]any{"type": "text", "text": ""}})
		event(w, "content_block_delta", 0, map[string]any{"index": 0, "delta": map[string]any{"type": "text_delta", "text": text}})
		event(w, "content_block_stop", 0, map[string]any{"index": 0})
		event(w, "message_delta", 0, map[string]any{"delta": map[string]any{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
		event(w, "message_stop", 0, map[string]any{})
		return
	}
	response := func(status string, output []any) map[string]any {
		return map[string]any{"id": "resp_context", "object": "response", "created_at": 1, "model": "fixture-model", "status": status, "output": output}
	}
	part := map[string]any{"type": "output_text", "text": text, "annotations": []any{}, "logprobs": []any{}}
	item := map[string]any{"id": "msg_context", "type": "message", "role": "assistant", "status": "completed", "content": []any{part}}
	event(w, "response.created", 0, map[string]any{"response": response("in_progress", []any{})})
	event(w, "response.in_progress", 1, map[string]any{"response": response("in_progress", []any{})})
	event(w, "response.output_item.added", 2, map[string]any{"output_index": 0, "item": map[string]any{"id": "msg_context", "type": "message", "role": "assistant", "status": "in_progress", "content": []any{}}})
	event(w, "response.content_part.added", 3, map[string]any{"output_index": 0, "item_id": "msg_context", "content_index": 0, "part": map[string]any{"type": "output_text", "text": "", "annotations": []any{}, "logprobs": []any{}}})
	event(w, "response.output_text.delta", 4, map[string]any{"output_index": 0, "item_id": "msg_context", "content_index": 0, "delta": text, "logprobs": []any{}})
	event(w, "response.output_text.done", 5, map[string]any{"output_index": 0, "item_id": "msg_context", "content_index": 0, "text": text, "logprobs": []any{}})
	event(w, "response.content_part.done", 6, map[string]any{"output_index": 0, "item_id": "msg_context", "content_index": 0, "part": part})
	event(w, "response.output_item.done", 7, map[string]any{"output_index": 0, "item": item})
	end := response("completed", []any{item})
	end["usage"] = map[string]any{"input_tokens": 9, "output_tokens": 4, "total_tokens": 13}
	event(w, "response.completed", 8, map[string]any{"response": end})
}

func (p protocol) contents(t *testing.T, body map[string]any) []string {
	t.Helper()
	if p.name == common.ChatProtocol || p.name == common.ResponsesProtocol {
		key := "messages"
		if p.name == common.ResponsesProtocol {
			key = "input"
		}
		var result []string
		for _, raw := range body[key].([]any) {
			m := raw.(map[string]any)
			result = append(result, m["content"].(string))
		}
		return result
	}
	var result []string
	for _, raw := range body["system"].([]any) {
		result = append(result, raw.(map[string]any)["text"].(string))
	}
	for _, raw := range body["messages"].([]any) {
		for _, block := range raw.(map[string]any)["content"].([]any) {
			result = append(result, block.(map[string]any)["text"].(string))
		}
	}
	return result
}

func TestAllProtocolsConsumeSealedContextAndPrivateMaintenance(t *testing.T) {
	for _, name := range []string{common.ChatProtocol, common.ResponsesProtocol, common.AnthropicProtocol} {
		for _, mode := range []string{"ordinary", "maintenance", "invalid_maintenance"} {
			t.Run(name+"/"+mode, func(t *testing.T) {
				p := protocol{name}
				var requests, resolutions, deltas atomic.Int32
				captured := make(chan map[string]any, 1)
				output := "ordinary text"
				if mode == "maintenance" {
					output = `{"items":[{"operation":"create","text":"协议共用中文记忆。","provenance":"observation"}]}`
				}
				if mode == "invalid_maintenance" {
					output = `{"items":[{"operation":"create","text":"PRIVATE_BODY","provenance":"user"}]}`
				}
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					requests.Add(1)
					var body map[string]any
					if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
						t.Error(err)
					}
					captured <- body
					p.text(w, output)
				}))
				t.Cleanup(server.Close)
				in := input(t, p, server.URL+"/v1", true, mode != "ordinary")
				result, err := engine(t, p.driver(t, nil), &resolutions).Run(context.Background(), in, func(api.EngineEvent) error { deltas.Add(1); return nil })
				if err != nil || requests.Load() != 1 || resolutions.Load() != 1 {
					t.Fatal("real SDK failed", result, err, requests.Load(), resolutions.Load())
				}
				body := <-captured
				contents := p.contents(t, body)
				if mode == "ordinary" {
					st, err := api.RenderShortTermInput(*in.ShortTerm)
					if err != nil || result.Status != "finished" || result.Text != output || result.MemoryCandidates != nil || len(contents) != 4 || contents[0] != in.Agent.Persona || contents[1] != st || !strings.HasPrefix(contents[2], "HUHU authorized memory input v1\n") || contents[3] != in.Intent {
						t.Fatal("ordinary projection", result, err, contents)
					}
				} else {
					if result.Text != "" || result.Partial || deltas.Load() != 0 || len(contents) != 4 || !strings.HasPrefix(contents[1], "HUHU memory maintenance instruction v1\n") {
						t.Fatal("maintenance leaked", result, contents, deltas.Load())
					}
					if tools, ok := body["tools"]; ok && tools != nil && len(tools.([]any)) != 0 {
						t.Fatal("maintenance tools", tools)
					}
					if mode == "maintenance" && (result.Status != "finished" || result.MemoryCandidates == nil || len(result.MemoryCandidates.Items) != 1) {
						t.Fatal("valid candidates rejected", result)
					}
					if mode == "invalid_maintenance" && (result.Status != "failed" || result.Reason != "MEMORY_CANDIDATE_INVALID" || result.MemoryCandidates != nil) {
						t.Fatal("invalid candidates accepted", result)
					}
				}
				a := in.Attempts.(*attempts)
				a.mu.Lock()
				defer a.mu.Unlock()
				if len(a.observations) != 1 || !a.observations[0].ProducerEnded || a.observations[0].Knowledge != "known" || len(a.requests) != 1 || a.requests[0].Purpose != "" || a.requests[0].AccountID != "" {
					t.Fatal("SDK producer/account responsibility", a.requests, a.observations)
				}
			})
		}
	}
}

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type invoke func(context.Context, api.ToolCall) (api.ToolResult, error)

func (f invoke) Invoke(ctx context.Context, c api.ToolCall) (api.ToolResult, error) { return f(ctx, c) }

type checkpoint struct {
	data     []byte
	artifact api.CheckpointArtifact
}

func (c *checkpoint) Metadata() api.CheckpointMetadata { return c.artifact.Metadata }
func (c *checkpoint) Publish(_ context.Context, r io.Reader) (api.CheckpointArtifact, error) {
	b, e := io.ReadAll(r)
	c.data = b
	return c.artifact, e
}
func (c *checkpoint) Open(context.Context, api.CheckpointArtifact) (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(c.data)), nil
}

func (p protocol) tool(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	args := `{"target":{"workspaceId":"workspace:protocol","resourceId":"resource:protocol","operation":"update","baseRevision":"1"},"content":"body"}`
	if p.name == common.ResponsesProtocol {
		response := func(status string, output []any) map[string]any {
			return map[string]any{"id": "resp_tool", "object": "response", "model": "fixture-model", "status": status, "output": output}
		}
		added := map[string]any{"type": "function_call", "id": "fc_item", "call_id": "call_protocol", "name": "note_write", "arguments": "", "status": "in_progress"}
		item := map[string]any{"type": "function_call", "id": "fc_item", "call_id": "call_protocol", "name": "note_write", "arguments": args, "status": "completed"}
		event(w, "response.created", 0, map[string]any{"response": response("in_progress", []any{})})
		event(w, "response.output_item.added", 1, map[string]any{"output_index": 0, "item": added})
		event(w, "response.function_call_arguments.delta", 2, map[string]any{"output_index": 0, "item_id": "fc_item", "delta": args})
		event(w, "response.function_call_arguments.done", 3, map[string]any{"output_index": 0, "item_id": "fc_item", "name": "note_write", "arguments": args})
		event(w, "response.output_item.done", 4, map[string]any{"output_index": 0, "item": item})
		end := response("completed", []any{item})
		end["usage"] = map[string]any{"input_tokens": 9, "output_tokens": 4, "total_tokens": 13}
		event(w, "response.completed", 5, map[string]any{"response": end})
		return
	}
	event(w, "message_start", 0, map[string]any{"message": map[string]any{"id": "msg_tool", "type": "message", "role": "assistant", "model": "fixture-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 9, "output_tokens": 0}}})
	event(w, "content_block_start", 0, map[string]any{"index": 0, "content_block": map[string]any{"type": "tool_use", "id": "call_protocol", "name": "note_write", "input": map[string]any{}}})
	event(w, "content_block_delta", 0, map[string]any{"index": 0, "delta": map[string]any{"type": "input_json_delta", "partial_json": args}})
	event(w, "content_block_stop", 0, map[string]any{"index": 0})
	event(w, "message_delta", 0, map[string]any{"delta": map[string]any{"stop_reason": "tool_use", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
	event(w, "message_stop", 0, map[string]any{})
}

func TestNonChatNilAndSealedCheckpointInspectionAndResume(t *testing.T) {
	for _, name := range []string{common.ResponsesProtocol, common.AnthropicProtocol} {
		for _, sealed := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/sealed=%t", name, sealed), func(t *testing.T) {
				p := protocol{name}
				var requests, resolutions, invokes atomic.Int32
				// A deterministic controlled HTTP transport makes the old/new CP
				// byte comparison independent of ephemeral localhost endpoint IDs.
				d := p.driver(t, transport(func(r *http.Request) (*http.Response, error) {
					w := httptest.NewRecorder()
					if requests.Add(1) == 1 {
						p.tool(w)
					} else {
						p.text(w, "resumed")
					}
					return w.Result(), nil
				}))
				in := input(t, p, "http://fixture.invalid/v1", sealed, false)
				cp := &checkpoint{artifact: api.CheckpointArtifact{Ref: "checkpoint:protocol", RunID: in.RunID, Metadata: api.CheckpointMetadata{EngineVersion: d.Identity().EngineVersion, FormatVersion: "1"}}}
				in.Checkpoints = cp
				in.Tools = invoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
					invokes.Add(1)
					return api.ToolResult{Status: "approval_required", EffectID: "effect:protocol", SuspensionToken: "suspend:protocol"}, nil
				})
				e := engine(t, d, &resolutions)
				result, err := e.Run(context.Background(), in, nil)
				if err != nil || result.Status != "suspended" || result.Suspension == nil {
					t.Fatal("real SDK CP failed", result, err)
				}
				if !sealed {
					if dir := os.Getenv("HUHU_CONTEXT_CP_CAPTURE_DIR"); dir != "" {
						if err := os.MkdirAll(dir, 0700); err != nil {
							t.Fatal(err)
						}
						f, err := os.OpenFile(filepath.Join(dir, p.name+".json"), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
						if err != nil {
							t.Fatal("refuse to overwrite CP capture", err)
						}
						_, we := f.Write(cp.data)
						ce := f.Close()
						if we != nil || ce != nil {
							t.Fatal(we, ce)
						}
					}
					if dir := os.Getenv("HUHU_CONTEXT_CP_BASELINE_DIR"); dir != "" {
						old, err := os.ReadFile(filepath.Join(dir, p.name+".json"))
						if err != nil || !bytes.Equal(old, cp.data) {
							t.Fatal("nil nonChat encoding changed", p.name, err, len(old), len(cp.data))
						}
					}
				}
				q := api.CheckpointInspection{Run: api.Run{ID: in.RunID, SessionID: in.SessionID}, Config: in.Config, Intent: in.Intent, Memory: in.Memory, ShortTerm: in.ShortTerm, Checkpoint: cp.artifact, Reader: bytes.NewReader(cp.data), Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: "effect:protocol"}}}
				if err = e.InspectCheckpoint(context.Background(), q); err != nil {
					t.Fatal("valid CP inspection", err)
				}
				if sealed {
					changed := *in.Memory
					changed.Entries = append([]api.MemoryInputEntry(nil), changed.Entries...)
					changed.Entries[0].Role = "assistant"
					changed.BindingDigest, err = api.CanonicalMemoryInputBinding(changed)
					if err != nil {
						t.Fatal(err)
					}
					bad := q
					bad.Memory = &changed
					bad.Reader = bytes.NewReader(cp.data)
					if err = e.InspectCheckpoint(context.Background(), bad); err == nil || requests.Load() != 1 || resolutions.Load() != 1 {
						t.Fatal("changed trusted input accepted", err)
					}
				}
				before := append([]byte(nil), cp.data...)
				result, err = e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: cp.artifact.Ref, Checkpoint: cp.artifact, Decision: api.ToolResult{Status: "denied", EffectID: "effect:protocol", Reason: "APPROVAL_REJECTED"}}, nil)
				if err != nil || result.Status != "finished" || result.Text != "resumed" || result.MemoryCandidates != nil || requests.Load() != 2 || invokes.Load() != 1 || !reflect.DeepEqual(before, cp.data) {
					t.Fatal("original CP did not resume exactly once", result, err, requests.Load(), invokes.Load())
				}
			})
		}
	}
}
