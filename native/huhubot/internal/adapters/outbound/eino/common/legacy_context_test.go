package common_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type contextTransport func(*http.Request) (*http.Response, error)

func (f contextTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func legacyContextFixture(t *testing.T, name string) []byte {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err = os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			data, err := os.ReadFile(filepath.Join(dir, "tests", "contract", "engine", "chat", "testdata", "chat-v1", name))
			if err != nil {
				t.Fatal(err)
			}
			return data
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("module root not found for immutable legacy fixture")
		}
		dir = parent
	}
}

// Reuses the pre-context producer's actual bytes; this test never regenerates
// or writes those samples. No bootstrap dependency enters this component test.
func TestNilContextKeepsFrozenChatBytesInspectionAndResume(t *testing.T) {
	payload := legacyContextFixture(t, "checkpoint.json")
	if inputHash(string(payload)) != "sha256:7536db3ef21941d7cef85597e850ef1ed96441fc43fe11c504f49803c5e3b631" {
		t.Fatal("frozen old producer checkpoint changed")
	}
	var sample struct {
		Input      api.EngineInput
		Resume     api.EngineResumeInput
		Inspection api.CheckpointInspection
		Artifact   api.CheckpointArtifact
	}
	if err := json.Unmarshal(legacyContextFixture(t, "trusted-inputs.json"), &sample); err != nil {
		t.Fatal(err)
	}
	if sample.Input.Memory != nil || sample.Input.ShortTerm != nil || sample.Inspection.Memory != nil || sample.Inspection.ShortTerm != nil {
		t.Fatal("legacy sample no longer represents nil context")
	}
	var old struct {
		Batch []struct {
			ID, Wire, Arguments string
			Result              *api.ToolResult
		}
		Pending struct{ EffectID, Token string }
	}
	if err := json.Unmarshal(payload, &old); err != nil || len(old.Batch) != 2 || old.Batch[0].Result == nil {
		t.Fatal("invalid frozen program position", err)
	}
	var requests, resolutions, invokes atomic.Int32
	driver := chatdriver.NewDriverWithTransport(contextTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.String() != sample.Input.Agent.Model.Endpoint+"/chat/completions" {
			t.Error("legacy destination changed", r.URL)
		}
		w := httptest.NewRecorder()
		if requests.Add(1) == 1 {
			w.Header().Set("Content-Type", "text/event-stream")
			for i, c := range old.Batch {
				chunk := map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": []any{map[string]any{"index": i, "id": c.ID, "type": "function", "function": map[string]any{"name": c.Wire, "arguments": c.Arguments}}}}}}}
				encoded, _ := json.Marshal(chunk)
				fmt.Fprintf(w, "data: %s\n\n", encoded)
			}
			fmt.Fprint(w, "data: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: {\"choices\":[],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":3,\"total_tokens\":13}}\n\ndata: [DONE]\n\n")
		} else {
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			ids := []string{}
			for _, raw := range body["messages"].([]any) {
				m := raw.(map[string]any)
				if m["role"] == "tool" {
					ids = append(ids, m["tool_call_id"].(string))
				}
			}
			if strings.Join(ids, ",") != "legacy-first,legacy-second" {
				t.Error("old results lost their exact call order", ids)
			}
			writeContextText(w, "old position continued", true)
		}
		return w.Result(), nil
	}))
	e := contextEngineWithDriver(t, driver, &resolutions)
	q := sample.Inspection
	q.Reader = bytes.NewReader(payload)
	if err := e.InspectCheckpoint(context.Background(), q); err != nil || requests.Load() != 0 || resolutions.Load() != 0 {
		t.Fatal("nil-context legacy inspection changed", err, requests.Load(), resolutions.Load())
	}
	cp := &contextCheckpoint{data: payload, artifact: sample.Artifact}
	in := sample.Input
	in.Attempts, in.Checkpoints = &contextAttempts{}, cp
	in.Tools = contextInvoke(func(_ context.Context, call api.ToolCall) (api.ToolResult, error) {
		invokes.Add(1)
		if call.ID == old.Batch[0].ID {
			return *old.Batch[0].Result, nil
		}
		return api.ToolResult{Status: "approval_required", EffectID: old.Pending.EffectID, SuspensionToken: old.Pending.Token}, nil
	})
	result, err := e.Run(context.Background(), in, nil)
	if err != nil || result.Status != "suspended" || !bytes.Equal(cp.data, payload) {
		t.Fatal("nil context changed old Chat DTO/encoding/digest", result, err, len(cp.data), len(payload))
	}
	resume := sample.Resume
	resume.Input.Checkpoints, resume.Input.Attempts = cp, &contextAttempts{}
	resume.Input.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
		invokes.Add(1)
		return api.ToolResult{}, api.Denied("UNEXPECTED_CALL")
	})
	result, err = e.Resume(context.Background(), resume, nil)
	if err != nil || result.Status != "finished" || result.Text != "old position continued" || result.MemoryCandidates != nil || requests.Load() != 2 || resolutions.Load() != 2 || invokes.Load() != 2 {
		t.Fatal("nil-context original Resume position changed", result, err, requests.Load(), resolutions.Load(), invokes.Load())
	}
}
