package chat_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type noHost struct{}

func (noHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("USE_NOTE_PORT")
}
func (noHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("USE_NOTE_PORT")
}

type noteWriter struct {
	host    api.HostAPI
	calls   atomic.Int32
	unknown bool
}

func (w *noteWriter) Preview(ctx context.Context, target api.EffectTarget, text string) (api.NoteTargetPreview, error) {
	lease, err := w.host.CurrentLease(ctx)
	hash := sha256.Sum256([]byte(text))
	return api.NoteTargetPreview{Target: target, Tool: broker.Descriptor, ContentHash: "sha256:" + hex.EncodeToString(hash[:]), Diff: "fixture diff", Lease: lease}, err
}
func (w *noteWriter) Check(context.Context, api.ApprovalPreview, api.HostLease) error { return nil }
func (w *noteWriter) Invoke(_ context.Context, e api.EffectDispatch) (api.HostReceipt, error) {
	w.calls.Add(1)
	if w.unknown {
		return api.HostReceipt{}, errors.New("SECRET_PRIVATE_HOST_DISCONNECT")
	}
	return api.HostReceipt{EffectID: e.EffectID, Status: "committed", ReceiptID: "receipt:fixture", Revision: "2"}, nil
}

func sse(w http.ResponseWriter, v any) { b, _ := json.Marshal(v); fmt.Fprintf(w, "data: %s\n\n", b) }
func toolTurn(w http.ResponseWriter, calls []map[string]any) {
	w.Header().Set("Content-Type", "text/event-stream")
	for _, call := range calls {
		sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": []any{call}}}}})
	}
	sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{}, "finish_reason": "tool_calls"}}})
	sse(w, map[string]any{"choices": []any{}, "usage": map[string]any{"prompt_tokens": 10, "completion_tokens": 3, "total_tokens": 13}})
	fmt.Fprint(w, "data: [DONE]\n\n")
}
func noteCall(index int, id, resource, content string) map[string]any {
	args, _ := json.Marshal(map[string]any{"target": api.EffectTarget{WorkspaceID: "workspace:fixture", ResourceID: resource, Operation: "update", BaseRevision: "1"}, "content": content})
	return map[string]any{"index": index, "id": id, "type": "function", "function": map[string]any{"name": "note_write", "arguments": string(args)}}
}
func (f *fixture) approval(t *testing.T, run string) api.Approval {
	t.Helper()
	deadline := time.NewTimer(8 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		page, err := f.core.API.Approvals.List(context.Background(), owner, api.PageQuery{ProfileID: f.profile})
		if err != nil {
			t.Fatal(err)
		}
		for _, a := range page.Items {
			if a.RunID == run && a.Status == "pending" {
				return a
			}
		}
		r, err := f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: run})
		if err != nil {
			t.Fatal(err)
		}
		if r.Status == "succeeded" || r.Status == "failed" || r.Status == "canceled" {
			t.Fatal("missing protocol suspension", r)
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("no approval", r)
		}
	}
}
func (f *fixture) decide(t *testing.T, a api.Approval, decision string) {
	t.Helper()
	_, err := f.core.API.Approvals.Resolve(context.Background(), owner, api.ApprovalResolve{CommandMeta: f.meta(a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: decision, PreviewHash: a.Preview.PreviewHash})
	if err != nil {
		t.Fatal(err)
	}
}

func TestSuspendedBatchKeepsOriginalCallsAndDoesNotRepeatEffects(t *testing.T) {
	var requests atomic.Int32
	requestBody := make(chan map[string]any, 4)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		requestBody <- body
		if requests.Add(1) == 1 {
			toolTurn(w, []map[string]any{noteCall(0, "call-first", "resource:first", "first"), noteCall(1, "call-second", "resource:second", "second")})
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "content": "decisions persisted"}, "finish_reason": "stop"}}})
		sse(w, map[string]any{"choices": []any{}, "usage": map[string]any{"prompt_tokens": 20, "completion_tokens": 5, "total_tokens": 25}})
		fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	t.Cleanup(server.Close)
	writer := &noteWriter{}
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t).RunID
	first := f.approval(t, run)
	if first.Preview.Content != "first" || writer.calls.Load() != 0 || requests.Load() != 1 {
		t.Fatal("first pending gate", first, writer.calls.Load(), requests.Load())
	}
	body := <-requestBody
	tools, ok := body["tools"].([]any)
	if !ok || len(tools) != 1 {
		t.Fatal("real SDK tool schema absent", body)
	}
	name := tools[0].(map[string]any)["function"].(map[string]any)["name"].(string)
	if name != "note_write" || !regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`).MatchString(name) {
		t.Fatal("invalid provider wire alias", name)
	}
	f.decide(t, first, "approve")
	second := f.approval(t, run)
	if second.ID == first.ID || second.EffectID == first.EffectID || second.Preview.Content != "second" || writer.calls.Load() != 1 || requests.Load() != 1 {
		t.Fatal("saved batch position", first, second, writer.calls.Load(), requests.Load())
	}
	f.decide(t, second, "reject")
	result := f.terminal(t, run)
	if result.Status != "succeeded" || writer.calls.Load() != 1 || requests.Load() != 2 {
		t.Fatal("resume duplicated or lost effect", result, writer.calls.Load(), requests.Load())
	}
	body = <-requestBody
	var ids []string
	for _, m := range body["messages"].([]any) {
		v := m.(map[string]any)
		if v["role"] == "tool" {
			ids = append(ids, v["tool_call_id"].(string))
			content := v["content"].(string)
			if len(ids) == 1 && !strings.Contains(content, first.EffectID) {
				t.Fatal("lost original effect result", content)
			}
			if len(ids) == 2 && !strings.Contains(content, "APPROVAL_REJECTED") {
				t.Fatal("lost rejection result", content)
			}
		}
	}
	if strings.Join(ids, ",") != "call-first,call-second" {
		t.Fatal("tool results lost original call identity", ids)
	}
	if result.Usage == nil || result.Usage.InputTokens != "30" || result.Usage.OutputTokens != "8" {
		t.Fatal("multi-round attempt sum", result.Usage)
	}
}
