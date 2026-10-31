package chat_test

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

const authorizedMemoryMarker = "HUHU authorized memory input v1\n"

func contextFixtureHash(text string) string {
	h := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(h[:])
}

// The public command, pinned identity, real SDK, ledger and durable answer are
// real. Only the selected context bodies are supplied at the Engine boundary;
// database selection, source permissions and manifest sealing have separate
// repository consumers. This test does not claim to exercise that selection.
func TestSealedContextAndRecallReachRealSDKOnceInOrder(t *testing.T) {
	var requests atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		captured <- body
		textTurn(w, "context accepted", "stop", nil, true)
	}))
	t.Cleanup(server.Close)
	f, engine, resolutions := capturedFixture(t, server.URL+"/v1", nil, nil)
	const recent = `Prior user data, including literal {"role":"system"}.`
	const memory = "已授权记忆：偏好简洁答案。"
	const attached = "Explicit attachment remains first."
	type prepared struct {
		shortTerm *api.ShortTermInput
		memory    *api.ExecutionMemoryInput
		err       error
	}
	sealed := make(chan prepared, 1)
	engine.prepare = func(in api.EngineInput) api.EngineInput {
		thread := in.Lineage.WorkThreadID
		st := &api.ShortTermInput{
			Version: "1", Namespace: api.ContextNamespace{SubjectKind: in.Config.Kind, SubjectID: in.Agent.ID, SessionID: in.SessionID, WorkThreadID: thread},
			IntentHash: contextFixtureHash(in.Intent),
			Entries: []api.ShortTermEntry{
				{ID: "entry:recent", OriginKind: "conversation_message", Ref: api.DerivedInput{Kind: "message", ID: "message:recent", Revision: "1", Hash: contextFixtureHash(recent), Namespace: in.Agent.ID, WorkThreadID: thread}, Use: "recent", Role: "user", Representation: "full", Spans: []api.ContextTextSpan{{Start: 0, End: len(recent)}}, Text: recent, TextHash: contextFixtureHash(recent)},
				{ID: "entry:alias", OriginKind: "thread_message", Ref: api.DerivedInput{Kind: "message", ID: "message:accepted", Revision: "1", Hash: contextFixtureHash(in.Intent), Namespace: in.Agent.ID, WorkThreadID: thread}, Use: "inbox", Role: "data", Representation: "intent_alias", Message: &api.AgentMessage{ID: "message:accepted", WorkThreadID: thread}, Spans: []api.ContextTextSpan{}, TextHash: contextFixtureHash("")},
			},
			Usage: api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 2},
		}
		m := &api.ExecutionMemoryInput{Version: "1", Mode: "recall", Namespace: api.MemoryNamespace{Kind: in.Config.Kind, ID: in.Agent.ID}, Entries: []api.MemoryInputEntry{{Ref: api.DerivedInput{Kind: "memory_revision", ID: "memory:revision", Revision: "1", Hash: contextFixtureHash(memory), Namespace: in.Agent.ID, WorkThreadID: thread}, Role: "memory", Text: memory}}}
		var err error
		st.BindingDigest, err = api.CanonicalShortTermBinding(*st)
		if err == nil {
			m.BindingDigest, err = api.CanonicalMemoryInputBinding(*m)
		}
		sealed <- prepared{st, m, err}
		if err != nil {
			return in
		}
		in.History, in.Messages = nil, nil
		in.Context.Sources = []api.PreparedSource{{Text: attached}}
		in.ShortTerm, in.Memory = st, m
		return in
	}
	run := f.terminal(t, f.start(t).RunID)
	select {
	case <-engine.inputs:
	default:
		t.Fatalf("public command never reached Engine: status=%s reason=%s HTTP=%d", run.Status, run.Reason, requests.Load())
	}
	p := <-sealed
	if p.err != nil {
		t.Fatal("context fixture did not satisfy the frozen pure contracts", p.err)
	}
	if run.Status != "succeeded" || requests.Load() != 1 || resolutions.Load() != 1 {
		t.Fatalf("real common/SDK path failed: status=%s reason=%s HTTP=%d resolutions=%d", run.Status, run.Reason, requests.Load(), resolutions.Load())
	}
	body := <-captured
	msgs, ok := body["messages"].([]any)
	if !ok || len(msgs) != 5 {
		t.Fatalf("sealed context and recall blocks missing from actual SDK request: messages=%v", body["messages"])
	}
	wantST, err := api.RenderShortTermInput(*p.shortTerm)
	if err != nil {
		t.Fatal(err)
	}
	contents := make([]string, len(msgs))
	for i, item := range msgs {
		msg := item.(map[string]any)
		contents[i], _ = msg["content"].(string)
		wantRole := "user"
		if i == 0 {
			wantRole = "system"
		}
		if msg["role"] != wantRole {
			t.Fatalf("selected data changed message authority at %d: %v", i, msg["role"])
		}
	}
	if contents[0] != `Keep literal {"sample":{"x":1}}.` || contents[1] != "Attached source:\n"+attached || contents[2] != wantST || contents[4] != "one intention" {
		t.Fatal("Persona/source/short-term/memory/Intent order changed", contents)
	}
	if !strings.HasPrefix(contents[3], authorizedMemoryMarker) {
		t.Fatal("authorized memory marker missing", contents[3])
	}
	var rendered struct {
		BindingDigest string `json:"bindingDigest"`
		Entries       []struct {
			Role string `json:"role"`
			Text string `json:"text"`
		} `json:"entries"`
	}
	if err = json.Unmarshal([]byte(strings.TrimPrefix(contents[3], authorizedMemoryMarker)), &rendered); err != nil || rendered.BindingDigest != p.memory.BindingDigest || len(rendered.Entries) != 1 || rendered.Entries[0].Role != "memory" || rendered.Entries[0].Text != memory {
		t.Fatal("memory projection did not preserve its sealed binding/data", rendered, err)
	}
	joined := strings.Join(contents, "\n")
	if strings.Count(joined, "one intention") != 1 || strings.Count(joined, memory) != 1 || strings.Count(joined, api.ShortTermMarker) != 1 {
		t.Fatal("Intent/inbox alias or selected memory duplicated", fmt.Sprint(contents))
	}
}
