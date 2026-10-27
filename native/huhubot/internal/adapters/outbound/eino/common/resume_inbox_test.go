package common_test

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
	"sync"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/anthropic"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// These SDK consumers use trusted-value fixtures at the Engine port. The
// separate public Core/SQLite consumers prove the database authority path.
type resumeProtocol struct{ name string }

func (p resumeProtocol) driver(t *testing.T) common.ProtocolDriver {
	t.Helper()
	if p.name == common.ChatProtocol {
		return chat.NewDriver()
	}
	var driver common.ProtocolDriver
	var err error
	if p.name == common.ResponsesProtocol {
		driver, err = responses.NewDriver()
	} else {
		driver, err = anthropic.NewDriver()
	}
	if err != nil {
		t.Fatal(err)
	}
	return driver
}

func resumeEvent(w http.ResponseWriter, kind string, sequence int, fields map[string]any) {
	fields["type"] = kind
	if strings.HasPrefix(kind, "response.") {
		fields["sequence_number"] = sequence
	}
	b, _ := json.Marshal(fields)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", kind, b)
}

func (p resumeProtocol) tool(w http.ResponseWriter, id, name, args string) {
	w.Header().Set("Content-Type", "text/event-stream")
	if p.name == common.ChatProtocol {
		b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": []any{map[string]any{"index": 0, "id": id, "type": "function", "function": map[string]any{"name": name, "arguments": args}}}}}}})
		fmt.Fprintf(w, "data: %s\n\ndata: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\ndata: [DONE]\n\n", b)
		return
	}
	if p.name == common.ResponsesProtocol {
		response := func(status string, output []any) map[string]any {
			return map[string]any{"id": "resp_" + id, "object": "response", "model": "context-model", "status": status, "output": output}
		}
		added := map[string]any{"type": "function_call", "id": "fc_" + id, "call_id": id, "name": name, "arguments": "", "status": "in_progress"}
		item := map[string]any{"type": "function_call", "id": "fc_" + id, "call_id": id, "name": name, "arguments": args, "status": "completed"}
		resumeEvent(w, "response.created", 0, map[string]any{"response": response("in_progress", []any{})})
		resumeEvent(w, "response.output_item.added", 1, map[string]any{"output_index": 0, "item": added})
		resumeEvent(w, "response.function_call_arguments.delta", 2, map[string]any{"output_index": 0, "item_id": "fc_" + id, "delta": args})
		resumeEvent(w, "response.function_call_arguments.done", 3, map[string]any{"output_index": 0, "item_id": "fc_" + id, "name": name, "arguments": args})
		resumeEvent(w, "response.output_item.done", 4, map[string]any{"output_index": 0, "item": item})
		end := response("completed", []any{item})
		end["usage"] = map[string]any{"input_tokens": 9, "output_tokens": 4, "total_tokens": 13}
		resumeEvent(w, "response.completed", 5, map[string]any{"response": end})
		return
	}
	resumeEvent(w, "message_start", 0, map[string]any{"message": map[string]any{"id": "msg_" + id, "type": "message", "role": "assistant", "model": "context-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 9, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}}})
	resumeEvent(w, "content_block_start", 0, map[string]any{"index": 0, "content_block": map[string]any{"type": "tool_use", "id": id, "name": name, "input": map[string]any{}}})
	resumeEvent(w, "content_block_delta", 0, map[string]any{"index": 0, "delta": map[string]any{"type": "input_json_delta", "partial_json": args}})
	resumeEvent(w, "content_block_stop", 0, map[string]any{"index": 0})
	resumeEvent(w, "message_delta", 0, map[string]any{"delta": map[string]any{"stop_reason": "tool_use", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
	resumeEvent(w, "message_stop", 0, map[string]any{})
}

func (p resumeProtocol) text(w http.ResponseWriter, text string) {
	if p.name == common.ChatProtocol {
		writeContextText(w, text, true)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	if p.name == common.AnthropicProtocol {
		resumeEvent(w, "message_start", 0, map[string]any{"message": map[string]any{"id": "msg_done", "type": "message", "role": "assistant", "model": "context-model", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": map[string]any{"input_tokens": 9, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}}})
		resumeEvent(w, "content_block_start", 0, map[string]any{"index": 0, "content_block": map[string]any{"type": "text", "text": ""}})
		resumeEvent(w, "content_block_delta", 0, map[string]any{"index": 0, "delta": map[string]any{"type": "text_delta", "text": text}})
		resumeEvent(w, "content_block_stop", 0, map[string]any{"index": 0})
		resumeEvent(w, "message_delta", 0, map[string]any{"delta": map[string]any{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": map[string]any{"output_tokens": 4}})
		resumeEvent(w, "message_stop", 0, map[string]any{})
		return
	}
	response := func(status string, output []any) map[string]any {
		return map[string]any{"id": "resp_done", "object": "response", "model": "context-model", "status": status, "output": output}
	}
	part := map[string]any{"type": "output_text", "text": text, "annotations": []any{}, "logprobs": []any{}}
	item := map[string]any{"id": "msg_done", "type": "message", "role": "assistant", "status": "completed", "content": []any{part}}
	resumeEvent(w, "response.created", 0, map[string]any{"response": response("in_progress", []any{})})
	resumeEvent(w, "response.output_item.added", 1, map[string]any{"output_index": 0, "item": map[string]any{"id": "msg_done", "type": "message", "role": "assistant", "status": "in_progress", "content": []any{}}})
	resumeEvent(w, "response.content_part.added", 2, map[string]any{"output_index": 0, "item_id": "msg_done", "content_index": 0, "part": map[string]any{"type": "output_text", "text": "", "annotations": []any{}, "logprobs": []any{}}})
	resumeEvent(w, "response.output_text.delta", 3, map[string]any{"output_index": 0, "item_id": "msg_done", "content_index": 0, "delta": text, "logprobs": []any{}})
	resumeEvent(w, "response.output_text.done", 4, map[string]any{"output_index": 0, "item_id": "msg_done", "content_index": 0, "text": text, "logprobs": []any{}})
	resumeEvent(w, "response.content_part.done", 5, map[string]any{"output_index": 0, "item_id": "msg_done", "content_index": 0, "part": part})
	resumeEvent(w, "response.output_item.done", 6, map[string]any{"output_index": 0, "item": item})
	end := response("completed", []any{item})
	end["usage"] = map[string]any{"input_tokens": 9, "output_tokens": 4, "total_tokens": 13}
	resumeEvent(w, "response.completed", 7, map[string]any{"response": end})
}

type resumeCheckpoint struct {
	mu       sync.Mutex
	metadata api.CheckpointMetadata
	data     map[string][]byte
	next     int
}

func (c *resumeCheckpoint) Metadata() api.CheckpointMetadata { return c.metadata }
func (c *resumeCheckpoint) Publish(_ context.Context, r io.Reader) (api.CheckpointArtifact, error) {
	b, err := io.ReadAll(r)
	if err != nil {
		return api.CheckpointArtifact{}, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.next++
	ref := fmt.Sprint("checkpoint:resume:", c.next)
	c.data[ref] = append([]byte(nil), b...)
	return api.CheckpointArtifact{Ref: ref, RunID: "run:context", Metadata: c.metadata, Digest: inputHash(string(b)), Size: int64(len(b))}, nil
}
func (c *resumeCheckpoint) Open(_ context.Context, a api.CheckpointArtifact) (io.ReadCloser, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return io.NopCloser(bytes.NewReader(append([]byte(nil), c.data[a.Ref]...))), nil
}

func resumeItem(id, text string, in api.EngineInput) api.ResumeInboxItem {
	return api.ResumeInboxItem{Message: api.AgentMessage{ID: id, ToAgentID: in.Agent.ID, Text: text, CreatedAt: "2026-10-27T00:00:00Z", Kind: "notify", Status: "delivered", WorkThreadID: in.Lineage.WorkThreadID}, Ref: api.DerivedInput{Kind: "message", ID: id, Revision: "1", Hash: inputHash(text), Namespace: in.Lineage.WorkThreadID, WorkThreadID: in.Lineage.WorkThreadID}}
}

func resumeToolContents(p resumeProtocol, body map[string]any) []string {
	var out []string
	key := "messages"
	if p.name == common.ResponsesProtocol {
		key = "input"
	}
	for _, raw := range body[key].([]any) {
		m := raw.(map[string]any)
		if p.name == common.ChatProtocol && m["role"] == "tool" {
			out = append(out, m["content"].(string))
		} else if p.name == common.ResponsesProtocol && m["type"] == "function_call_output" {
			out = append(out, m["output"].(string))
		} else if p.name == common.AnthropicProtocol {
			for _, rawBlock := range m["content"].([]any) {
				block := rawBlock.(map[string]any)
				if block["type"] == "tool_result" {
					out = append(out, block["content"].(string))
				}
			}
		}
	}
	return out
}

func resumeMessageCounts(t *testing.T, results []string) map[string]int {
	t.Helper()
	counts := map[string]int{}
	for _, text := range results {
		var result struct {
			Inbox *api.ResumeInbox `json:"resumeInbox"`
		}
		if err := json.Unmarshal([]byte(text), &result); err != nil {
			t.Fatal("actual SDK tool result is not JSON", err)
		}
		if result.Inbox != nil {
			for _, item := range result.Inbox.Messages {
				counts[item.Message.ID]++
			}
		}
	}
	return counts
}

func TestResumeInboxReachesAllSDKsOnceAcrossTwoWaits(t *testing.T) {
	for _, name := range []string{common.ChatProtocol, common.ResponsesProtocol, common.AnthropicProtocol} {
		t.Run(name, func(t *testing.T) {
			p := resumeProtocol{name}
			var requests, resolutions, invokes atomic.Int32
			captured := make(chan map[string]any, 3)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]any
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				captured <- body
				n := requests.Add(1)
				if n < 3 {
					p.tool(w, fmt.Sprint("call_", n), "note_write", `{"target":{"workspaceId":"workspace:resume","resourceId":"resource:resume","operation":"update","baseRevision":"1"},"content":"body"}`)
				} else {
					p.text(w, "resumed twice")
				}
			}))
			t.Cleanup(server.Close)
			d := p.driver(t)
			e := contextEngineWithDriver(t, d, &resolutions)
			in := directContextInput(server.URL+"/v1", &contextAttempts{})
			in.Agent.Model.Protocol, in.Agent.AllowedTools = p.name, []string{"note.write"}
			in.Config.Agent = in.Agent
			initial := resumeItem("message:initial", "INITIAL_INBOX", in)
			metadata := initial.Message
			metadata.Text = ""
			in.ShortTerm = &api.ShortTermInput{Version: "1", Namespace: api.ContextNamespace{SubjectKind: "agent", SubjectID: in.Agent.ID, SessionID: in.SessionID, WorkThreadID: in.Lineage.WorkThreadID}, IntentHash: inputHash(in.Intent), Entries: []api.ShortTermEntry{{ID: "entry:initial", OriginKind: "thread_message", Ref: initial.Ref, Use: "inbox", Role: "data", Representation: "full", Message: &metadata, Spans: []api.ContextTextSpan{{Start: 0, End: len(initial.Message.Text)}}, Text: initial.Message.Text, TextHash: initial.Ref.Hash}}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 1}}
			var err error
			in.ShortTerm.BindingDigest, err = api.CanonicalShortTermBinding(*in.ShortTerm)
			if err != nil {
				t.Fatal("initial sealed fixture", err)
			}
			cp := &resumeCheckpoint{metadata: api.CheckpointMetadata{EngineVersion: d.Identity().EngineVersion, FormatVersion: "1"}, data: map[string][]byte{}}
			in.Checkpoints = cp
			in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				i := invokes.Add(1)
				return api.ToolResult{Status: "approval_required", EffectID: fmt.Sprint("effect:", i), SuspensionToken: fmt.Sprint("suspend:", i)}, nil
			})
			first, err := e.Run(context.Background(), in, nil)
			if err != nil || first.Status != "suspended" || first.Suspension == nil {
				t.Fatal("real SDK first pending CP failed", first, err)
			}
			<-captured
			original := append([]byte(nil), cp.data[first.CheckpointRef]...)
			one := resumeItem("message:one", "SAME_SUPPLEMENT_正文", in)
			packet := &api.ResumeInbox{Messages: []api.ResumeInboxItem{initial, one}}
			if err := api.ValidateResumeInbox(packet); err != nil {
				t.Fatal("trusted decision fixture invalid", err)
			}
			second, err := e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: first.CheckpointRef, Checkpoint: first.Suspension.Checkpoint, Decision: api.ToolResult{Status: "denied", EffectID: "effect:1", Reason: "APPROVAL_REJECTED", ResumeInbox: packet}}, nil)
			if err != nil || second.Status != "suspended" || second.Suspension == nil {
				t.Fatal("real SDK next pending CP failed", second, err)
			}
			firstResults := strings.Join(resumeToolContents(p, <-captured), "\n")
			if strings.Count(firstResults, one.Message.Text) != 1 || strings.Contains(firstResults, initial.Message.Text) {
				t.Fatal("actual SDK omitted trusted supplement or repeated sealed inbox", firstResults)
			}
			two := resumeItem("message:two", one.Message.Text, in)
			packet = &api.ResumeInbox{Messages: []api.ResumeInboxItem{initial, one, two}}
			third, err := e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: second.CheckpointRef, Checkpoint: second.Suspension.Checkpoint, Decision: api.ToolResult{Status: "denied", EffectID: "effect:2", Reason: "APPROVAL_REJECTED", ResumeInbox: packet}}, nil)
			if err != nil || third.Status != "finished" || third.Text != "resumed twice" {
				t.Fatal("second trusted decision did not finish", third, err)
			}
			results := resumeToolContents(p, <-captured)
			allResults := strings.Join(results, "\n")
			counts := resumeMessageCounts(t, results)
			if strings.Count(allResults, one.Message.Text) != 2 || counts[one.Message.ID] != 1 || counts[two.Message.ID] != 1 || strings.Contains(allResults, initial.Message.Text) {
				t.Fatal("two waits repeated an identity or dropped a distinct same-text message", allResults)
			}
			if !reflect.DeepEqual(original, cp.data[first.CheckpointRef]) || requests.Load() != 3 || invokes.Load() != 2 {
				t.Fatal("resume changed old artifact, tool position or physical request count", requests.Load(), invokes.Load())
			}
			var oldState, newState struct {
				Initial  int
				Messages []json.RawMessage
			}
			if json.Unmarshal(original, &oldState) != nil || json.Unmarshal(cp.data[second.CheckpointRef], &newState) != nil || oldState.Initial != newState.Initial || !reflect.DeepEqual(oldState.Messages[:oldState.Initial], newState.Messages[:newState.Initial]) {
				t.Fatal("resume altered immutable initial prefix")
			}
		})
	}
}

func TestResumeInboxQuestionReceiptsDoNotSuppressSameTextAncestors(t *testing.T) {
	for _, name := range []string{common.ChatProtocol, common.ResponsesProtocol, common.AnthropicProtocol} {
		t.Run(name, func(t *testing.T) {
			p := resumeProtocol{name}
			var requests, resolutions, invokes atomic.Int32
			captured := make(chan map[string]any, 3)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]any
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				captured <- body
				switch requests.Add(1) {
				case 1:
					p.tool(w, "question_call", "agents_message", `{"targetAgentId":"agent:answerer","kind":"question","text":"question","sourceRefs":[]}`)
				case 2:
					p.tool(w, "note_call", "note_write", `{"target":{"workspaceId":"workspace:resume","resourceId":"resource:resume","operation":"update","baseRevision":"1"},"content":"body"}`)
				default:
					p.text(w, "answer delivered once")
				}
			}))
			t.Cleanup(server.Close)
			d := p.driver(t)
			e := contextEngineWithDriver(t, d, &resolutions)
			in := directContextInput(server.URL+"/v1", &contextAttempts{})
			in.Agent.Model.Protocol, in.Agent.AllowedTools = p.name, []string{"agents.message", "note.write"}
			in.Config.Agent = in.Agent
			cp := &resumeCheckpoint{metadata: api.CheckpointMetadata{EngineVersion: d.Identity().EngineVersion, FormatVersion: "1"}, data: map[string][]byte{}}
			in.Checkpoints = cp
			in.Tools = contextInvoke(func(_ context.Context, call api.ToolCall) (api.ToolResult, error) {
				invokes.Add(1)
				if call.Name == "agents.message" {
					return api.ToolResult{Status: "delivered", Message: &api.AgentMessage{ID: "question:one", Kind: "question"}}, nil
				}
				return api.ToolResult{Status: "approval_required", EffectID: "effect:next", SuspensionToken: "suspend:next"}, nil
			})
			first, err := e.Run(context.Background(), in, nil)
			if err != nil || first.Suspension == nil || first.Suspension.Kind != "question" {
				t.Fatal(first, err)
			}
			<-captured
			original := append([]byte(nil), cp.data[first.CheckpointRef]...)
			answer := resumeItem("message:answer", "ANSWER_SAME_BODY", in)
			answer.Message.Kind, answer.Message.Status, answer.Message.QuestionID = "reply", "answered", "question:one"
			ancestor := resumeItem("message:ancestor", answer.Message.Text, in)
			metadataRef := answer.Ref
			metadataRef.Revision = "7" // mutable SQL status revision, not body revision 1
			child := api.TaskOutcome{RunID: "run:answer-sender", Status: "succeeded", Text: answer.Message.Text, Derived: []api.DerivedInput{ancestor.Ref, metadataRef}}
			packet := &api.ResumeInbox{Messages: []api.ResumeInboxItem{ancestor}, AnswerReceipts: []api.AnswerReceipt{{QuestionID: "question:one", Ref: answer.Ref}}}
			decision := api.ToolResult{Status: "completed", Children: []api.TaskOutcome{child}, ResumeInbox: packet}
			before, _ := json.Marshal(decision)
			next, err := e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: first.CheckpointRef, Checkpoint: first.Suspension.Checkpoint, Decision: decision}, nil)
			if err != nil || next.Suspension == nil {
				t.Fatal("question receipt did not resume", next, err)
			}
			after, _ := json.Marshal(decision)
			if !bytes.Equal(before, after) {
				t.Fatal("consumer mutated durable decision")
			}
			results := resumeToolContents(p, <-captured)
			counts := resumeMessageCounts(t, results)
			if strings.Count(strings.Join(results, "\n"), answer.Message.Text) != 2 || counts[ancestor.Message.ID] != 1 || counts[answer.Message.ID] != 0 {
				t.Fatal("answer repeated or same-text ancestor incorrectly suppressed", results)
			}
			var rendered struct {
				Inbox *api.ResumeInbox `json:"resumeInbox"`
			}
			if json.Unmarshal([]byte(results[0]), &rendered) != nil || rendered.Inbox == nil || len(rendered.Inbox.AnswerReceipts) != 1 || rendered.Inbox.AnswerReceipts[0].Ref != answer.Ref {
				t.Fatal("answer self body receipt missing", results)
			}
			another := resumeItem("message:another", answer.Message.Text, in)
			done, err := e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: next.CheckpointRef, Checkpoint: next.Suspension.Checkpoint, Decision: api.ToolResult{Status: "denied", EffectID: "effect:next", Reason: "APPROVAL_REJECTED", ResumeInbox: &api.ResumeInbox{Messages: []api.ResumeInboxItem{answer, ancestor, another}}}}, nil)
			if err != nil || done.Status != "finished" {
				t.Fatal(done, err)
			}
			results = resumeToolContents(p, <-captured)
			counts = resumeMessageCounts(t, results)
			if strings.Count(strings.Join(results, "\n"), answer.Message.Text) != 3 || counts[ancestor.Message.ID] != 1 || counts[another.Message.ID] != 1 || counts[answer.Message.ID] != 0 {
				t.Fatal("persisted answer receipt did not dedup the next wait", results)
			}
			if !bytes.Equal(original, cp.data[first.CheckpointRef]) || requests.Load() != 3 || invokes.Load() != 2 {
				t.Fatal("old artifact/effect position changed")
			}
		})
	}
}

func TestResumeInboxInvalidPacketPrecedesHTTP(t *testing.T) {
	for _, name := range []string{common.ChatProtocol, common.ResponsesProtocol, common.AnthropicProtocol} {
		t.Run(name, func(t *testing.T) {
			p := resumeProtocol{name}
			var requests, resolutions, invokes atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				p.tool(w, "pending_call", "note_write", `{"target":{"workspaceId":"workspace:resume","resourceId":"resource:resume","operation":"update","baseRevision":"1"},"content":"body"}`)
			}))
			t.Cleanup(server.Close)
			d := p.driver(t)
			e := contextEngineWithDriver(t, d, &resolutions)
			in := directContextInput(server.URL+"/v1", &contextAttempts{})
			in.Agent.Model.Protocol, in.Agent.AllowedTools = p.name, []string{"note.write"}
			in.Config.Agent = in.Agent
			cp := &resumeCheckpoint{metadata: api.CheckpointMetadata{EngineVersion: d.Identity().EngineVersion, FormatVersion: "1"}, data: map[string][]byte{}}
			in.Checkpoints = cp
			in.Tools = contextInvoke(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				invokes.Add(1)
				return api.ToolResult{Status: "approval_required", EffectID: "effect:pending", SuspensionToken: "suspend:pending"}, nil
			})
			first, err := e.Run(context.Background(), in, nil)
			if err != nil || first.Suspension == nil {
				t.Fatal(first, err)
			}
			item := resumeItem("message:valid", "PRIVATE_PACKET_NEGATIVE", in)
			cases := []struct {
				name   string
				packet *api.ResumeInbox
				reason string
			}{}
			add := func(name string, packet *api.ResumeInbox) {
				cases = append(cases, struct {
					name   string
					packet *api.ResumeInbox
					reason string
				}{name, packet, "TOOL_RESULT_INVALID"})
			}
			bad := item
			bad.Ref.Hash = inputHash("different")
			add("body-hash", &api.ResumeInbox{Messages: []api.ResumeInboxItem{bad}})
			bad = item
			bad.Message.Text = string([]byte{0xff})
			bad.Ref.Hash = inputHash(bad.Message.Text)
			add("utf8", &api.ResumeInbox{Messages: []api.ResumeInboxItem{bad}})
			bad = item
			bad.Ref.WorkThreadID = "thread:other"
			add("thread", &api.ResumeInbox{Messages: []api.ResumeInboxItem{bad}})
			add("duplicate-id", &api.ResumeInbox{Messages: []api.ResumeInboxItem{item, item}})
			add("empty", &api.ResumeInbox{})
			add("question-receipt-at-approval", &api.ResumeInbox{AnswerReceipts: []api.AnswerReceipt{{QuestionID: "question:wrong", Ref: item.Ref}}})
			large := &api.ResumeInbox{}
			for i := 0; i < 4; i++ {
				large.Messages = append(large.Messages, resumeItem(fmt.Sprint("message:large:", i), strings.Repeat("x", 65536), in))
			}
			if err := api.ValidateResumeInbox(large); err != nil {
				t.Fatal("API candidate fits its pre-dedup bound", err)
			}
			cases = append(cases, struct {
				name   string
				packet *api.ResumeInbox
				reason string
			}{"final-tool-result-bound", large, "TOOL_RESULT_LIMIT"})
			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					beforeHTTP, beforeResolve, beforeInvoke := requests.Load(), resolutions.Load(), invokes.Load()
					result, err := e.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: first.CheckpointRef, Checkpoint: first.Suspension.Checkpoint, Decision: api.ToolResult{Status: "denied", EffectID: "effect:pending", ResumeInbox: tc.packet}}, nil)
					if err != nil || result.Status != "failed" || result.Reason != tc.reason || strings.Contains(result.Text, "PRIVATE_PACKET") {
						t.Fatal("invalid packet was not a body-free failure", result, err)
					}
					if requests.Load() != beforeHTTP || resolutions.Load() != beforeResolve || invokes.Load() != beforeInvoke {
						t.Fatal("invalid packet reached resolve/HTTP/tool")
					}
				})
			}
		})
	}
}

func TestResumeInboxMarkerRejectsJSONAliasesNullsAndMalformedUnicode(t *testing.T) {
	in := directContextInput("http://localhost/v1", &contextAttempts{})
	packet := &api.ResumeInbox{Messages: []api.ResumeInboxItem{resumeItem("message:strict", "valid 中文", in)}}
	good, _ := json.Marshal(packet)
	if common.ValidateResumeInboxJSON(good) != nil {
		t.Fatal("valid strict marker rejected")
	}
	cases := [][]byte{
		[]byte(`null`), []byte(`{}`), []byte(`{"messages":null}`),
		bytes.Replace(good, []byte(`"messages"`), []byte(`"Messages"`), 1),
		bytes.Replace(good, []byte(`"message":`), []byte(`"unknown":0,"message":`), 1),
		bytes.Replace(good, []byte(`"id":"message:strict"`), []byte(`"id":"message:strict","id":"message:strict"`), 1),
		bytes.Replace(good, []byte(`valid 中文`), []byte(`valid \ud800`), 1),
		bytes.Replace(good, []byte(`valid 中文`), []byte{0xff}, 1),
	}
	for i, raw := range cases {
		if common.ValidateResumeInboxJSON(raw) == nil {
			t.Fatal("invalid persisted marker accepted", i)
		}
	}
}
