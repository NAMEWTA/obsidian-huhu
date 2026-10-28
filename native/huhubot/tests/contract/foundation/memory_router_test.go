package foundation_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"

	entrance "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func memoryDigest(v string) string {
	h := sha256.Sum256([]byte(v))
	return "sha256:" + hex.EncodeToString(h[:])
}

type contractMemory struct {
	calls    int
	identity api.RequestIdentity
	invalid  bool
	text     string
	context  bool
	redacted bool
}

func (m *contractMemory) touch(id api.RequestIdentity) { m.calls++; m.identity = id }
func (m *contractMemory) item(n api.MemoryNamespace) api.MemoryItem {
	text := m.text
	if text == "" {
		text = "原文 é 👩‍💻"
	}
	return api.MemoryItem{ID: "item:1", Revision: "1", RevisionID: "revision:1", Namespace: n, Scope: api.MemoryScope{Kind: "profile"}, State: "active", Body: &api.MemoryBody{Text: text, Hash: memoryDigest(text), Provenance: "user", CreatorKind: "user", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}, Derived: []api.DerivedInput{}}}
}
func (m *contractMemory) List(_ context.Context, id api.RequestIdentity, q api.MemoryQuery) (api.MemoryPage, error) {
	m.touch(id)
	i := m.item(q.Namespace)
	return api.MemoryPage{NamespaceRevision: "1", Items: []api.MemoryObject{{Kind: "item", Item: &i}}}, nil
}
func (m *contractMemory) Get(_ context.Context, id api.RequestIdentity, q api.MemoryGet) (api.MemoryObject, error) {
	m.touch(id)
	i := m.item(q.Namespace)
	if m.invalid {
		i.State = "forgotten"
		return api.MemoryObject{Kind: "item", Item: &i}, nil
	}
	if q.Kind == "context" {
		text := "这是实际输入片段"
		e := api.ExecutionContextEntryView{ID: "entry:1", Kind: "recent", Representation: "full", State: "readable", Text: &text, Revision: "1", CreatorKind: "user", PreparationKind: "selected", Scope: api.MemoryScope{Kind: "work_thread", ID: "thread:1"}, ContentHash: memoryDigest(text), DisplaySlice: &api.ContextTextSpan{Start: 0, End: len(text)}, PartCount: 1}
		state := "sealed"
		if m.redacted {
			state = "redacted"
			e = api.ExecutionContextEntryView{ID: "entry:1", Kind: "recent", Representation: "full", State: "redacted", Reason: "MEMORY_FORGOTTEN", Revision: "1", Scope: e.Scope}
		}
		return api.MemoryObject{Kind: "context", Context: &api.ExecutionContextView{RunID: q.ID, RunRevision: "1", ManifestRevision: "1", State: state, Namespace: q.Namespace, Scope: e.Scope, Entries: []api.ExecutionContextEntryView{e}}}, nil
	}
	return api.MemoryObject{Kind: "item", Item: &i}, nil
}
func (m *contractMemory) Pin(_ context.Context, id api.RequestIdentity, q api.MemoryPin) (api.MemoryItem, error) {
	m.touch(id)
	i := m.item(q.Namespace)
	i.Pinned = q.Pinned
	return i, nil
}
func (m *contractMemory) Correct(_ context.Context, id api.RequestIdentity, q api.MemoryCorrect) (api.MemoryItem, error) {
	m.touch(id)
	m.text = q.Text
	return m.item(q.Namespace), nil
}
func (m *contractMemory) Forget(_ context.Context, id api.RequestIdentity, q api.MemoryForget) (api.MemoryItem, error) {
	m.touch(id)
	return api.MemoryItem{ID: q.ID, Revision: "2", Namespace: q.Namespace, Scope: api.MemoryScope{Kind: "profile"}, State: "forgotten"}, nil
}
func (m *contractMemory) SetAutoMaintenance(_ context.Context, id api.RequestIdentity, q api.MemorySetAuto) (api.MemorySettings, error) {
	m.touch(id)
	return api.MemorySettings{Namespace: q.Namespace, Revision: "2", Enabled: q.Enabled, Eligible: false, Reason: "BUDGET_NOT_CONFIGURED"}, nil
}

func memoryRouter(t *testing.T, m *contractMemory) (*entrance.Router, string) {
	t.Helper()
	root := privateRoot(t)
	core, e := bootstrap.OpenWithOptions(context.Background(), root, filepath.Join(root, "one"), bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := core.Close(); e != nil {
			t.Error(e)
		}
		<-core.Done()
	})
	if m != nil {
		core.API.Memory = m
	} else {
		core.API.Memory = nil
	}
	id := api.NewConnectionIdentity("memory:connection", "user", false)
	r := entrance.New(core.API, id)
	out := r.Dispatch(context.Background(), wire.Envelope{ID: memoryStringPtr("c:hello"), Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"contract","version":"1"}}`)}, nil)
	if out.Error != nil {
		t.Fatal(out.Error)
	}
	status, e := core.API.Service.Status(context.Background(), id)
	if e != nil {
		t.Fatal(e)
	}
	encoded, _ := json.Marshal(out.Result)
	var h wire.HelloResult
	_ = json.Unmarshal(encoded, &h)
	count := 0
	for _, s := range h.Capabilities {
		if strings.HasPrefix(s, "memory.") {
			count++
			if strings.Contains(s, "Global") {
				t.Fatal("unassembled global advertised", s)
			}
		}
	}
	if m == nil && count != 0 || m != nil && count != 6 {
		t.Fatal("untruthful memory capabilities", h.Capabilities)
	}
	return r, status.Profile.ProfileID
}
func memoryCall(r *entrance.Router, method string, v any) entrance.Response {
	b, _ := json.Marshal(v)
	return r.Dispatch(context.Background(), wire.Envelope{ID: memoryStringPtr("c:memory"), Method: method, Params: b}, nil)
}
func TestMemoryFacadeContractRoutesIdentityAndHonorsAbsentConsumer(t *testing.T) {
	r, p := memoryRouter(t, nil)
	if v := memoryCall(r, "memory.list", map[string]any{"profileId": p, "namespace": map[string]string{"kind": "agent", "id": "agent:a"}, "kind": "item"}); v.Error == nil || v.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
		t.Fatal("absent consumer fabricated memory", v)
	}
	m := &contractMemory{}
	r, p = memoryRouter(t, m)
	ns := map[string]string{"kind": "agent", "id": "agent:a"}
	cmd := func() map[string]any {
		return map[string]any{"profileId": p, "namespace": ns, "commandId": "cmd:1", "idempotencyKey": "key:1", "commandEpoch": "1", "expectedRevision": "1"}
	}
	values := map[string]map[string]any{"memory.list": {"profileId": p, "namespace": ns, "kind": "item"}, "memory.get": {"profileId": p, "namespace": ns, "kind": "item", "id": "item:1"}}
	values["memory.pin"] = cmd()
	values["memory.pin"]["id"] = "item:1"
	values["memory.pin"]["pinned"] = true
	values["memory.correct"] = cmd()
	values["memory.correct"]["action"] = "add"
	values["memory.correct"]["scope"] = map[string]string{"kind": "profile"}
	values["memory.correct"]["text"] = "新事实是用户输入"
	values["memory.forget"] = cmd()
	values["memory.forget"]["id"] = "item:1"
	values["memory.setAutoMaintenance"] = cmd()
	values["memory.setAutoMaintenance"]["enabled"] = false
	for method, v := range values {
		t.Run(method, func(t *testing.T) {
			got := memoryCall(r, method, v)
			if got.Error != nil {
				t.Fatal(got.Error)
			}
			if m.identity.ConnectionID() != "memory:connection" || m.identity.PrincipalID() != "user" {
				t.Fatal("wire forged identity", m.identity)
			}
		})
	}
	if m.calls != 6 {
		t.Fatal("routing did not use six actual fake consumers", m.calls)
	}
	for _, method := range []string{"memory.proposeGlobal", "memory.resolveGlobal"} {
		got := memoryCall(r, method, map[string]any{})
		if got.Error == nil || got.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
			t.Fatal(got)
		}
	}
	got := memoryCall(r, "memory.get", map[string]any{"profileId": p, "namespace": ns, "kind": "context", "id": "run:1", "limit": 20})
	if got.Error != nil || len(got.DeliverySubjects) != 1 || got.DeliverySubjects[0].Kind != "context_entry" {
		t.Fatal("actual context route/subject", got)
	}
	m.redacted = true
	got = memoryCall(r, "memory.get", map[string]any{"profileId": p, "namespace": ns, "kind": "context", "id": "run:1"})
	if got.Error != nil || len(got.DeliverySubjects) != 0 {
		t.Fatal("redacted context leaked subject/body", got)
	}
	m.invalid = true
	got = memoryCall(r, "memory.get", map[string]any{"profileId": p, "namespace": ns, "kind": "item", "id": "item:1"})
	if got.Error == nil || got.Error.Data.Reason != "INVALID_APPLICATION_RESULT" || got.Result != nil {
		t.Fatal("invalid fake result crossed output boundary", got)
	}
}
func TestMemoryIndependentUTF8AndStrictRequestsBeforeFake(t *testing.T) {
	m := &contractMemory{}
	r, p := memoryRouter(t, m)
	base := map[string]any{"profileId": p, "namespace": map[string]string{"kind": "agent", "id": "agent:a"}, "commandId": "cmd:1", "idempotencyKey": "key:1", "commandEpoch": "1", "expectedRevision": "1", "action": "add", "scope": map[string]string{"kind": "profile"}, "text": "好"}
	for _, text := range []string{strings.Repeat("中", 21846), strings.Repeat("<", 65536), strings.Repeat("e\u0301", 21846)} {
		base["text"] = text
		before := m.calls
		got := memoryCall(r, "memory.correct", base)
		if got.Error == nil || m.calls != before {
			t.Fatal("byte/aggregate overflow reached fake", len(text), got.Error)
		}
	}
	base["text"] = strings.Repeat("中", 21845) + "a"
	got := memoryCall(r, "memory.correct", base)
	if got.Error != nil {
		t.Fatal("valid exact UTF8 byte boundary rejected", got.Error)
	}
	base["text"] = "好"
	base["actor"] = "agent:other"
	before := m.calls
	got = memoryCall(r, "memory.correct", base)
	if got.Error == nil || m.calls != before {
		t.Fatal("extra authority reached fake")
	}
	delete(base, "actor")
	b, _ := json.Marshal(base)
	b = []byte(strings.Replace(string(b), "好", `\ud800`, 1))
	got = r.Dispatch(context.Background(), wire.Envelope{ID: memoryStringPtr("c:surrogate"), Method: "memory.correct", Params: b}, nil)
	if got.Error == nil || m.calls != before {
		t.Fatal("lone surrogate reached fake", got)
	}
}

func memoryStringPtr(s string) *string { return &s }

func TestMemoryJSONBudgetUsesDecodedGoEncodingNotWhitespace(t *testing.T) {
	m := &contractMemory{}
	r, p := memoryRouter(t, m)
	q := map[string]any{"profileId": p, "namespace": map[string]string{"kind": "agent", "id": "agent:a"}, "commandId": "cmd:1", "idempotencyKey": "key:1", "commandEpoch": "1", "expectedRevision": "1", "action": "add", "scope": map[string]string{"kind": "profile"}, "text": "相同值"}
	raw, _ := json.Marshal(q)
	raw = append([]byte(strings.Repeat(" ", api.MemoryObjectBytes)), raw...)
	got := r.Dispatch(context.Background(), wire.Envelope{ID: memoryStringPtr("c:padded"), Method: "memory.correct", Params: raw}, nil)
	if got.Error != nil || m.calls != 1 {
		t.Fatal("insignificant JSON space changed semantic byte budget", got.Error, m.calls)
	}
}
