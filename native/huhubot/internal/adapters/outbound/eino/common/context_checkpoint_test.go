package common_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func cloneContextInput(t *testing.T, in api.EngineInput) api.EngineInput {
	t.Helper()
	if in.ShortTerm != nil {
		var st api.ShortTermInput
		data, err := json.Marshal(in.ShortTerm)
		if err != nil || json.Unmarshal(data, &st) != nil {
			t.Fatal("clone sealed fixture", err)
		}
		in.ShortTerm = &st
	}
	if in.Memory != nil {
		var m api.ExecutionMemoryInput
		data, err := json.Marshal(in.Memory)
		if err != nil || json.Unmarshal(data, &m) != nil {
			t.Fatal("clone sealed fixture", err)
		}
		in.Memory = &m
	}
	return in
}

func rebindContext(t *testing.T, in *api.EngineInput) {
	t.Helper()
	var err error
	if in.Memory != nil {
		in.Memory.BindingDigest, err = api.CanonicalMemoryInputBinding(*in.Memory)
		if err != nil {
			t.Fatal("invalid mutation fixture", err)
		}
	}
	if in.ShortTerm != nil {
		in.ShortTerm.BindingDigest, err = api.CanonicalShortTermBinding(*in.ShortTerm)
		if err != nil {
			t.Fatal("invalid mutation fixture", err)
		}
	}
}

func TestInvalidSealedInputPrecedesCredentialAndHTTP(t *testing.T) {
	var requests, resolutions atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		writeContextText(w, "unexpected", true)
	}))
	t.Cleanup(server.Close)
	e := contextEngine(t, &resolutions)
	base := sealedContextInput(t, directContextInput(server.URL+"/v1", &contextAttempts{}))
	cases := map[string]func(*api.EngineInput){
		"memory_unsealed":  func(in *api.EngineInput) { in.Memory.BindingDigest = "" },
		"memory_body":      func(in *api.EngineInput) { in.Memory.Entries[0].Text += "changed" },
		"memory_hash":      func(in *api.EngineInput) { in.Memory.Entries[0].Ref.Hash = inputHash("other") },
		"memory_namespace": func(in *api.EngineInput) { in.Memory.Namespace.ID = "agent:foreign"; rebindContext(t, in) },
		"memory_mode":      func(in *api.EngineInput) { in.Memory.Mode = "maintenance" },
		"memory_over_decoded_bytes": func(in *api.EngineInput) {
			in.Memory.Entries[0].Text = strings.Repeat("汉", 43691)
			in.Memory.Entries[0].Ref.Hash = inputHash(in.Memory.Entries[0].Text)
		},
		"short_term_unsealed": func(in *api.EngineInput) { in.ShortTerm.BindingDigest = "" },
		"short_term_intent": func(in *api.EngineInput) {
			in.ShortTerm.IntentHash = inputHash("other")
			in.ShortTerm.Entries = in.ShortTerm.Entries[:1]
			in.ShortTerm.Usage.Selected = 1
			rebindContext(t, in)
		},
		"short_term_subject": func(in *api.EngineInput) { in.ShortTerm.Namespace.SubjectID = "agent:foreign"; rebindContext(t, in) },
		"short_term_kind":    func(in *api.EngineInput) { in.ShortTerm.Namespace.SubjectKind = "temporary"; rebindContext(t, in) },
		"short_term_session": func(in *api.EngineInput) { in.ShortTerm.Namespace.SessionID = "session:foreign"; rebindContext(t, in) },
		"short_term_thread": func(in *api.EngineInput) {
			in.ShortTerm.Namespace.WorkThreadID = "thread:foreign"
			rebindContext(t, in)
		},
		"short_term_hash":  func(in *api.EngineInput) { in.ShortTerm.Entries[0].TextHash = inputHash("other") },
		"short_term_spans": func(in *api.EngineInput) { in.ShortTerm.Entries[0].Spans[0].End-- },
		"short_term_body":  func(in *api.EngineInput) { in.ShortTerm.Entries[0].Text += "other" },
		"alias_body":       func(in *api.EngineInput) { in.ShortTerm.Entries[1].Text = in.Intent },
		"duplicate_history": func(in *api.EngineInput) {
			in.History = []api.VisibleMessage{{Role: "user", Text: "duplicate history"}}
		},
		"duplicate_inbox":        func(in *api.EngineInput) { in.Messages = []api.AgentMessage{{ID: "message:accepted", Text: in.Intent}} },
		"maintenance_short_term": func(in *api.EngineInput) { *in = maintenanceInput(t, *in); in.ShortTerm = base.ShortTerm },
		"maintenance_history": func(in *api.EngineInput) {
			*in = maintenanceInput(t, *in)
			in.History = []api.VisibleMessage{{Role: "user", Text: "private history"}}
		},
		"maintenance_sources": func(in *api.EngineInput) {
			*in = maintenanceInput(t, *in)
			in.Context.Sources = []api.PreparedSource{{Text: "extra Host body"}}
		},
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			in := cloneContextInput(t, base)
			attempts := &contextAttempts{}
			in.Attempts = attempts
			mutate(&in)
			result, err := e.Run(context.Background(), in, nil)
			fault, ok := err.(*api.Fault)
			if !ok || (fault.Reason != "MEMORY_INPUT_INVALID" && fault.Reason != "CONTEXT_INPUT_STATE_INVALID") || result.Text != "" || result.Partial || result.MemoryCandidates != nil || resolutions.Load() != 0 || requests.Load() != 0 {
				t.Fatal("invalid sealed input reached a credential/HTTP or leaked body", result, err, resolutions.Load(), requests.Load())
			}
			attempts.mu.Lock()
			defer attempts.mu.Unlock()
			if len(attempts.requests) != 0 {
				t.Fatal("invalid input reserved an attempt", attempts.requests)
			}
		})
	}
}

type contextCheckpoint struct {
	data     []byte
	artifact api.CheckpointArtifact
	opens    atomic.Int32
}

func (c *contextCheckpoint) Metadata() api.CheckpointMetadata { return c.artifact.Metadata }
func (c *contextCheckpoint) Publish(_ context.Context, reader io.Reader) (api.CheckpointArtifact, error) {
	data, err := io.ReadAll(reader)
	c.data = append([]byte(nil), data...)
	c.artifact.Digest, c.artifact.Size = inputHash(string(data)), int64(len(data))
	return c.artifact, err
}
func (c *contextCheckpoint) Open(context.Context, api.CheckpointArtifact) (io.ReadCloser, error) {
	c.opens.Add(1)
	return io.NopCloser(bytes.NewReader(c.data)), nil
}

func writeContextTool(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	args := `{"target":{"workspaceId":"workspace:context","resourceId":"resource:one","operation":"update","baseRevision":"1"},"content":"body"}`
	chunk := map[string]any{"id": "checkpoint", "choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": []any{map[string]any{"index": 0, "id": "call:context", "type": "function", "function": map[string]any{"name": "note_write", "arguments": args}}}}, "finish_reason": nil}}}
	encoded, _ := json.Marshal(chunk)
	fmt.Fprintf(w, "data: %s\n\n", encoded)
	fmt.Fprint(w, "data: {\"id\":\"checkpoint\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: [DONE]\n\n")
}

func TestSealedContextCheckpointBindsTrustedInputBeforeResumeIO(t *testing.T) {
	var requests, resolutions, invokes atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if requests.Add(1) == 1 {
			writeContextTool(w)
			return
		}
		writeContextText(w, "continued", true)
	}))
	t.Cleanup(server.Close)
	e := contextEngine(t, &resolutions)
	in := sealedContextInput(t, directContextInput(server.URL+"/v1", &contextAttempts{}))
	in.Agent.AllowedTools = []string{"note.write"}
	in.Config.Agent = in.Agent
	full := strings.Repeat("x", 2000)
	excerpt := strings.Repeat("x", 8) + api.ShortTermOmission + strings.Repeat("x", 8)
	working := api.ShortTermEntry{ID: "entry:working", OriginKind: "thread_message", Ref: api.DerivedInput{Kind: "message", ID: "message:working", Revision: "1", Hash: inputHash(full), Namespace: in.Agent.ID, WorkThreadID: in.Lineage.WorkThreadID}, Use: "working_summary", Role: "data", Representation: "excerpt", Spans: []api.ContextTextSpan{{Start: 0, End: 8}, {Start: 1992, End: 2000}}, Text: excerpt, TextHash: inputHash(excerpt)}
	if err := api.ValidateShortTermOriginal(working, full, in.Intent); err != nil {
		t.Fatal("fixture original/source hash is invalid", err)
	}
	in.ShortTerm.Entries = append(in.ShortTerm.Entries, working)
	in.ShortTerm.Usage.Selected, in.ShortTerm.Usage.Excerpted = 3, 1
	rebindContext(t, &in)
	cp := &contextCheckpoint{artifact: api.CheckpointArtifact{Ref: "checkpoint:context", RunID: in.RunID, Metadata: api.CheckpointMetadata{EngineVersion: common.EngineVersion, FormatVersion: "1"}}}
	in.Checkpoints = cp
	in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
		invokes.Add(1)
		return api.ToolResult{Status: "approval_required", EffectID: "effect:context", SuspensionToken: "suspension:context"}, nil
	})
	result, err := e.Run(context.Background(), in, nil)
	if err != nil || result.Status != "suspended" || result.Suspension == nil || requests.Load() != 1 || invokes.Load() != 1 {
		t.Fatal("real SDK failed to produce a bound approval CP", result, err, requests.Load(), invokes.Load())
	}
	q := api.CheckpointInspection{Run: api.Run{ID: in.RunID, SessionID: in.SessionID}, Config: in.Config, Intent: in.Intent, Memory: in.Memory, ShortTerm: in.ShortTerm, Checkpoint: cp.artifact, Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: "effect:context"}}}
	q.Reader = bytes.NewReader(cp.data)
	if err = e.InspectCheckpoint(context.Background(), q); err != nil {
		t.Fatal("actual sealed CP rejected", err)
	}
	decision := api.ToolResult{Status: "denied", EffectID: "effect:context", Reason: "APPROVAL_REJECTED"}
	mutations := map[string]func(*api.EngineInput){
		"memory_namespace": func(v *api.EngineInput) { v.Memory.Namespace.ID = "agent:foreign" },
		"memory_ref":       func(v *api.EngineInput) { v.Memory.Entries[0].Ref.ID = "revision:other" },
		"memory_role":      func(v *api.EngineInput) { v.Memory.Entries[0].Role = "assistant" },
		"memory_text": func(v *api.EngineInput) {
			v.Memory.Entries[0].Text = "different readable body"
			v.Memory.Entries[0].Ref.Hash = inputHash(v.Memory.Entries[0].Text)
		},
		"short_term_ref": func(v *api.EngineInput) { v.ShortTerm.Entries[0].Ref.ID = "message:other" },
		"short_term_text": func(v *api.EngineInput) {
			entry := &v.ShortTerm.Entries[0]
			entry.Text = "Different earlier data."
			entry.TextHash = inputHash(entry.Text)
			entry.Ref.Hash = entry.TextHash
			entry.Spans[0].End = len(entry.Text)
		},
		"short_term_span": func(v *api.EngineInput) {
			v.ShortTerm.Entries[2].Spans[1].Start++
			v.ShortTerm.Entries[2].Spans[1].End++
		},
		"short_term_source_hash": func(v *api.EngineInput) { v.ShortTerm.Entries[2].Ref.Hash = inputHash("different full original") },
		"short_term_namespace":   func(v *api.EngineInput) { v.ShortTerm.Namespace.WorkThreadID = "thread:other" },
		"short_term_usage":       func(v *api.EngineInput) { v.ShortTerm.Usage.OmittedAuthorized++ },
		"mode_and_job": func(v *api.EngineInput) {
			v.ShortTerm = nil
			v.Memory.Mode = "maintenance"
			v.Memory.JobID = "job:other"
			v.Memory.JobGeneration = "4"
			v.Memory.SettingsRevision = "5"
		},
	}
	for name, mutate := range mutations {
		t.Run(name, func(t *testing.T) {
			changed := cloneContextInput(t, in)
			mutate(&changed)
			rebindContext(t, &changed) // a valid self-hash is insufficient authority
			inspect := q
			inspect.Memory, inspect.ShortTerm, inspect.Reader = changed.Memory, changed.ShortTerm, bytes.NewReader(cp.data)
			if err := e.InspectCheckpoint(context.Background(), inspect); err == nil {
				t.Fatal("CP accepted a different trusted manifest")
			}
			resumed, err := e.Resume(context.Background(), api.EngineResumeInput{Input: changed, CheckpointRef: cp.artifact.Ref, Checkpoint: cp.artifact, Decision: decision}, nil)
			if err == nil || resumed.Text != "" || resumed.MemoryCandidates != nil || resolutions.Load() != 1 || requests.Load() != 1 || invokes.Load() != 1 {
				t.Fatal("invalid CP reached Resolve/HTTP/tool", resumed, err, resolutions.Load(), requests.Load(), invokes.Load())
			}
		})
	}
	for _, field := range []string{"memory", "short_term", "order", "digest"} {
		t.Run("artifact_"+field, func(t *testing.T) {
			var state map[string]any
			if err := json.Unmarshal(cp.data, &state); err != nil {
				t.Fatal(err)
			}
			msgs := state["Messages"].([]any)
			initial := int(state["Initial"].(float64))
			switch field {
			case "memory":
				msgs[initial-2].(map[string]any)["content"] = "substituted memory"
			case "short_term":
				msgs[initial-3].(map[string]any)["content"] = "substituted short-term"
			case "order":
				msgs[initial-2], msgs[initial-3] = msgs[initial-3], msgs[initial-2]
			case "digest":
				content := msgs[initial-2].(map[string]any)["content"].(string)
				msgs[initial-2].(map[string]any)["content"] = strings.Replace(content, in.Memory.BindingDigest, inputHash("other binding"), 1)
			}
			data, _ := json.Marshal(state)
			bad := &contextCheckpoint{data: data, artifact: cp.artifact}
			inspect := q
			inspect.Reader = bytes.NewReader(data)
			if err := e.InspectCheckpoint(context.Background(), inspect); err == nil {
				t.Fatal("rewritten canonical block accepted")
			}
			changed := in
			changed.Checkpoints = bad
			if _, err := e.Resume(context.Background(), api.EngineResumeInput{Input: changed, CheckpointRef: cp.artifact.Ref, Checkpoint: cp.artifact, Decision: decision}, nil); err == nil || resolutions.Load() != 1 || requests.Load() != 1 || invokes.Load() != 1 {
				t.Fatal("rewritten CP reached effect/HTTP", err, resolutions.Load(), requests.Load(), invokes.Load())
			}
		})
	}
	result, err = e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: cp.artifact.Ref, Checkpoint: cp.artifact, Decision: decision}, nil)
	if err != nil || result.Status != "finished" || result.Text != "continued" || result.MemoryCandidates != nil || requests.Load() != 2 || resolutions.Load() != 2 || invokes.Load() != 1 {
		t.Fatal("original sealed input did not resume exactly once", result, err, requests.Load(), resolutions.Load(), invokes.Load())
	}
}
