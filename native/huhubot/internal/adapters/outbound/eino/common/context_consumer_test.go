package common_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// These are direct consumers of the application Engine port and the real Chat
// SDK. They deliberately do not import bootstrap, SQLite or the in-progress
// memory Store. Attempts records actual admission/producer observations, without
// claiming to prove database account selection or source authorization.
type contextAttempts struct {
	mu           sync.Mutex
	requests     []api.AttemptRequest
	observations []api.AttemptObservation
	dispatched   int
}

func (a *contextAttempts) Reserve(_ context.Context, q api.AttemptRequest) (api.AttemptReservation, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.requests = append(a.requests, q)
	return api.AttemptReservation{ID: fmt.Sprint("attempt:", len(a.requests)), RunID: "run:context"}, nil
}
func (a *contextAttempts) Dispatch(ctx context.Context, _ api.AttemptReservation, send func(context.Context) error) error {
	a.mu.Lock()
	a.dispatched++
	a.mu.Unlock()
	return send(ctx)
}
func (a *contextAttempts) Settle(_ context.Context, r api.AttemptReservation, o api.AttemptObservation) (api.AttemptReceipt, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.observations = append(a.observations, o)
	return api.AttemptReceipt{ID: r.ID, State: "settled"}, nil
}
func (*contextAttempts) AbortUnsent(context.Context, api.AttemptReservation) error { return nil }

func inputHash(text string) string {
	h := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(h[:])
}

func directContextInput(endpoint string, attempts api.ModelAttempts) api.EngineInput {
	agent := api.Agent{ID: "agent:context", Persona: "Literal persona.", Model: &api.ModelBinding{ModelBindingDraft: api.ModelBindingDraft{ProviderID: "fixture", Protocol: common.ChatProtocol, Endpoint: endpoint, ModelID: "context-model", CredentialRef: "credential:context"}}}
	return api.EngineInput{RunID: "run:context", SessionID: "session:context", Intent: "Current intention 一次。", Agent: agent, Config: api.TaskConfigSnapshot{ID: "config:context", Kind: "agent", SubjectID: agent.ID, Agent: agent}, Lineage: api.ExecutionLineage{ConfigSnapshotID: "config:context", SubjectKind: "agent", SubjectID: agent.ID, WorkThreadID: "thread:context"}, Attempts: attempts}
}

func sealedContextInput(t *testing.T, in api.EngineInput) api.EngineInput {
	t.Helper()
	const recent = "Earlier user data."
	const recalled = "记忆：偏好简短回答。"
	ref := func(id, text string) api.DerivedInput {
		return api.DerivedInput{Kind: "message", ID: id, Revision: "1", Hash: inputHash(text), Namespace: in.Agent.ID, WorkThreadID: in.Lineage.WorkThreadID}
	}
	st := &api.ShortTermInput{Version: "1", Namespace: api.ContextNamespace{SubjectKind: in.Config.Kind, SubjectID: in.Agent.ID, SessionID: in.SessionID, WorkThreadID: in.Lineage.WorkThreadID}, IntentHash: inputHash(in.Intent), Entries: []api.ShortTermEntry{
		{ID: "entry:recent", OriginKind: "conversation_message", Ref: ref("message:recent", recent), Use: "recent", Role: "user", Representation: "full", Spans: []api.ContextTextSpan{{Start: 0, End: len(recent)}}, Text: recent, TextHash: inputHash(recent)},
		{ID: "entry:alias", OriginKind: "thread_message", Ref: ref("message:intent", in.Intent), Use: "inbox", Role: "data", Representation: "intent_alias", Message: &api.AgentMessage{ID: "message:intent", WorkThreadID: in.Lineage.WorkThreadID}, Spans: []api.ContextTextSpan{}, TextHash: inputHash("")},
	}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 2}}
	memoryRef := ref("revision:memory", recalled)
	memoryRef.Kind = "memory_revision"
	m := &api.ExecutionMemoryInput{Version: "1", Mode: "recall", Namespace: api.MemoryNamespace{Kind: in.Config.Kind, ID: in.Agent.ID}, Entries: []api.MemoryInputEntry{{Ref: memoryRef, Role: "memory", Text: recalled}}}
	var err error
	st.BindingDigest, err = api.CanonicalShortTermBinding(*st)
	if err != nil {
		t.Fatal("short-term fixture is invalid", err)
	}
	m.BindingDigest, err = api.CanonicalMemoryInputBinding(*m)
	if err != nil {
		t.Fatal("recall fixture is invalid", err)
	}
	in.ShortTerm, in.Memory = st, m
	in.Context.Sources = []api.PreparedSource{{Text: "Explicit source."}}
	return in
}

func contextEngine(t *testing.T, resolutions *atomic.Int32) *common.Engine {
	t.Helper()
	return contextEngineWithDriver(t, chatdriver.NewDriver(), resolutions)
}

func contextEngineWithDriver(t *testing.T, driver common.ProtocolDriver, resolutions *atomic.Int32) *common.Engine {
	t.Helper()
	registry, err := common.NewRegistry(driver)
	if err != nil {
		t.Fatal(err)
	}
	e := common.NewEngine(registry, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
		resolutions.Add(1)
		return []byte("synthetic-key"), api.CredentialStatus{State: "available"}, nil
	})
	t.Cleanup(func() {
		e.Stop()
		select {
		case <-e.Done():
		case <-time.After(5 * time.Second):
			t.Error("Engine/real SDK producer did not actually drain")
			return
		}
		if err := e.Close(); err != nil {
			t.Error("close after true Done", err)
		}
	})
	return e
}

func TestEngineSealedContextAndRecallReachRealSDK(t *testing.T) {
	var requests, resolutions atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		captured <- body
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"id\":\"context\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"context accepted\"},\"finish_reason\":null}]}\n\n")
		fmt.Fprint(w, "data: {\"id\":\"context\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n")
		fmt.Fprint(w, "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\ndata: [DONE]\n\n")
	}))
	t.Cleanup(server.Close)
	attempts := &contextAttempts{}
	in := sealedContextInput(t, directContextInput(server.URL+"/v1", attempts))
	e := contextEngine(t, &resolutions)
	result, err := e.Run(context.Background(), in, nil)
	if err != nil || result.Status != "finished" || result.Text != "context accepted" || requests.Load() != 1 || resolutions.Load() != 1 {
		t.Fatal("real Engine/SDK path failed before context observation", result, err, requests.Load(), resolutions.Load())
	}
	attempts.mu.Lock()
	if len(attempts.requests) != 1 || attempts.dispatched != 1 || len(attempts.observations) != 1 || !attempts.observations[0].ProducerEnded || attempts.observations[0].Knowledge != "known" {
		t.Error("actual SDK attempt did not settle after producer end", attempts.requests, attempts.dispatched, attempts.observations)
	}
	attempts.mu.Unlock()
	body := <-captured
	msgs, ok := body["messages"].([]any)
	if !ok || len(msgs) != 5 {
		t.Fatalf("sealed short-term and recall missing from actual SDK request: messages=%v", body["messages"])
	}
	wantST, err := api.RenderShortTermInput(*in.ShortTerm)
	if err != nil {
		t.Fatal(err)
	}
	contents := make([]string, len(msgs))
	for i, raw := range msgs {
		m := raw.(map[string]any)
		contents[i], _ = m["content"].(string)
		role := "user"
		if i == 0 {
			role = "system"
		}
		if m["role"] != role {
			t.Fatal("data block changed authority", i, m["role"])
		}
	}
	if contents[0] != in.Agent.Persona || contents[1] != "Attached source:\nExplicit source." || contents[2] != wantST || !strings.HasPrefix(contents[3], "HUHU authorized memory input v1\n") || contents[4] != in.Intent {
		t.Fatal("sealed Persona/source/short-term/memory/Intent order", contents)
	}
	var memory struct {
		BindingDigest string `json:"bindingDigest"`
		Entries       []struct {
			Role string `json:"role"`
			Text string `json:"text"`
		} `json:"entries"`
	}
	if err = json.Unmarshal([]byte(strings.TrimPrefix(contents[3], "HUHU authorized memory input v1\n")), &memory); err != nil || memory.BindingDigest != in.Memory.BindingDigest || len(memory.Entries) != 1 || memory.Entries[0].Role != "memory" || memory.Entries[0].Text != in.Memory.Entries[0].Text {
		t.Fatal("sealed memory binding/data projection", memory, err)
	}
	if joined := strings.Join(contents, "\n"); strings.Count(joined, in.Intent) != 1 || strings.Count(joined, in.Memory.Entries[0].Text) != 1 {
		t.Fatal("alias or memory body repeated", contents)
	}
}
