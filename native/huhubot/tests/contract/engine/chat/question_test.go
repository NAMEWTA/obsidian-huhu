package chat_test

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestQuestionBatchResumesOriginalCallsWithExplicitReplyIdentity(t *testing.T) {
	var requests, parentTurns atomic.Int32
	var target atomic.Value
	parentBodies := make(chan map[string]any, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		messages := body["messages"].([]any)
		isChild := messages[0].(map[string]any)["content"] == "question worker"
		if isChild {
			toolResult := false
			var incoming api.AgentMessage
			var texts strings.Builder
			inboxCount := 0
			shortIntentHash := ""
			intent := messages[len(messages)-1].(map[string]any)["content"].(string)
			for _, v := range messages {
				m := v.(map[string]any)
				if m["role"] == "tool" {
					toolResult = true
				}
				content, _ := m["content"].(string)
				texts.WriteString(content)
				if strings.HasPrefix(content, api.ShortTermMarker) {
					var block api.ShortTermInput
					if err := json.Unmarshal([]byte(strings.TrimPrefix(content, api.ShortTermMarker)), &block); err != nil {
						t.Error("invalid current short-term inbox", err)
					} else if digest, err := api.CanonicalShortTermBinding(block); err != nil || digest != block.BindingDigest {
						t.Error("short-term inbox binding changed", err, digest, block.BindingDigest)
					} else {
						shortIntentHash = block.IntentHash
						for _, entry := range block.Entries {
							if entry.Use == "inbox" {
								inboxCount++
								if entry.Message != nil && entry.OriginKind == "thread_message" && entry.Ref.ID == entry.Message.ID && entry.Message.Text == "" && (entry.Representation == "full" || entry.Representation == "intent_alias" && entry.Ref.Hash == block.IntentHash && entry.Text == "") {
									incoming = *entry.Message
									incoming.Text = entry.Text
									if entry.Representation == "intent_alias" {
										incoming.Text = intent
									}
								}
							}
						}
					}
				}
			}
			if toolResult {
				textTurn(w, "child complete", "stop", nil, true)
				return
			}
			if shortIntentHash != fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(intent))) {
				t.Error("first child turn lost accepted IntentHash", shortIntentHash, intent)
			}
			if inboxCount != 1 || incoming.QuestionID == "" || incoming.DelegationID == "" || incoming.FromAgentID == "" {
				t.Error("accepted question reply identity missing", body)
				textTurn(w, "missing identity", "stop", nil, true)
				return
			}
			if strings.Count(texts.String(), intent) != 1 {
				t.Error("question intention duplicated", texts.String())
			}
			args, _ := json.Marshal(map[string]any{"targetAgentId": incoming.FromAgentID, "kind": "reply", "text": "answer to " + intent, "sourceRefs": []api.SourceSnapshot{}, "delegationId": incoming.DelegationID, "questionId": incoming.QuestionID})
			toolTurn(w, []map[string]any{{"index": 0, "id": "reply-original", "type": "function", "function": map[string]any{"name": "agents_message", "arguments": string(args)}}})
			return
		}
		parentBodies <- body
		if parentTurns.Add(1) == 1 {
			calls := []map[string]any{}
			for i := 0; i < 2; i++ {
				args, _ := json.Marshal(map[string]any{"targetAgentId": target.Load().(string), "kind": "question", "text": fmt.Sprint("question-", i), "sourceRefs": []api.SourceSnapshot{}})
				calls = append(calls, map[string]any{"index": i, "id": fmt.Sprint("question-call-", i), "type": "function", "function": map[string]any{"name": "agents_message", "arguments": string(args)}})
			}
			toolTurn(w, calls)
			return
		}
		textTurn(w, "questions answered", "stop", nil, true)
	}))
	t.Cleanup(server.Close)
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{}, []string{"agents.message"})
	child, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.meta(""), Draft: api.AgentDraft{Name: "question worker", Persona: "question worker", Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: server.URL + "/v1", ModelID: "fixture-model", CredentialRef: "credential:11111111111111111111111111111111"}, AllowedTools: []string{"agents.message"}, AllowedCollaborationTargets: []string{f.agent}}})
	if err != nil {
		t.Fatal(err)
	}
	target.Store(child.ID)
	a, err := f.core.API.Assistant.Get(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Assistant.Update(context.Background(), owner, api.AgentUpdate{CommandMeta: f.meta(a.Revision), ID: a.ID, Draft: api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, Model: &a.Model.ModelBindingDraft, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: []string{child.ID}}}); err != nil {
		t.Fatal(err)
	}
	run := f.terminal(t, f.start(t).RunID)
	if run.Status != "succeeded" || requests.Load() != 6 || parentTurns.Load() != 2 {
		t.Fatal(run, requests.Load(), parentTurns.Load())
	}
	<-parentBodies
	body := <-parentBodies
	count := 0
	for _, v := range body["messages"].([]any) {
		m := v.(map[string]any)
		if m["role"] == "tool" {
			id := fmt.Sprint("question-call-", count)
			if m["tool_call_id"] != id || !strings.Contains(m["content"].(string), fmt.Sprint("answer to question-", count)) {
				t.Fatal("question result was not mapped by original wait order", m)
			}
			count++
		}
	}
	if count != 2 {
		t.Fatal("lost question result", count)
	}
}
