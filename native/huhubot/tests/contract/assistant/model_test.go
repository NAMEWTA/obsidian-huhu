package assistant_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

const sentinel = "T02_SECRET_SENTINEL_4fb2a903_NEVER_PERSIST"

type probe struct {
	called bool
	got    api.ModelBindingDraft
}

func (p *probe) Probe(_ context.Context, m api.ModelBindingDraft, key []byte) ([]string, error) {
	p.called = true
	p.got = m
	if string(key) != sentinel {
		return nil, api.Invalid("BAD_PRIVATE_KEY")
	}
	return []string{"text"}, nil
}
func TestDraftModelAvailabilitySharedCredentialAndSessionReopen(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	dir := filepath.Join(root, "one")
	p := &probe{}
	c, e := bootstrap.OpenWithOptions(ctx, root, dir, bootstrap.Options{Probe: p})
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	ref := "credential:0123456789abcdef0123456789abcdef"
	st, e := c.Credentials.Register(ctx, s.Profile.ProfileID, ref, "session-memory", []byte(sentinel))
	if e != nil || st.State != "available" {
		t.Fatalf("register %#v %v", st, e)
	}
	m := api.ModelBindingDraft{ModelID: "fixture-model", ProviderID: "fixture", Endpoint: "https://fixture.invalid/v1", Protocol: "openai-responses", Capabilities: []string{"text"}, CredentialRef: ref}
	draft := api.AgentDraft{Name: "draft", Persona: "safe"}
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "draft", ""), Draft: draft})
	if e != nil || a.Model != nil {
		t.Fatal("unconfigured draft", a, e)
	}
	a, e = c.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, c, "bind", a.Revision), AgentID: a.ID, Model: m})
	if e != nil || a.Model == nil || a.Model.CredentialStatus.State != "available" {
		t.Fatal("bind", a, e)
	}
	old, e := c.API.Assistant.AcquireSnapshot(ctx, owner, s.Profile.ProfileID, a.ID)
	if e != nil {
		t.Fatal(e)
	}
	draft.Model = &m
	other, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "shared", ""), Draft: draft})
	if e != nil || other.Model == nil {
		t.Fatal("shared ref", e)
	}
	_, e = c.Credentials.Delete(ctx, s.Profile.ProfileID, ref)
	fault(t, e, "CREDENTIAL_IN_USE")
	tested, e := c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: s.Profile.ProfileID, Model: m})
	if e != nil || !tested.Available || !p.called || p.got.Endpoint != m.Endpoint || p.got.Protocol != m.Protocol || p.got.ModelID != m.ModelID {
		t.Fatal("minimal explicit probe", tested, e)
	}
	missing := m
	missing.CredentialRef = ""
	_, e = c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: s.Profile.ProfileID, Model: missing})
	fault(t, e, "CREDENTIAL_MISSING")
	missing.CredentialRef = "credential:11111111111111111111111111111111"
	_, e = c.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, c, "unknown", a.Revision), AgentID: a.ID, Model: missing})
	fault(t, e, "CREDENTIAL_MISSING")
	if e = c.API.Assistant.ReleaseSnapshot(ctx, old.Token); e != nil {
		t.Fatal(e)
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	c2, e := bootstrap.Open(ctx, root, dir)
	if e != nil {
		t.Fatal(e)
	}
	defer c2.Close()
	got, e := c2.API.Assistant.Get(ctx, owner, api.IDQuery{ProfileID: s.Profile.ProfileID, ID: a.ID})
	if e != nil || got.Model == nil || got.Model.CredentialStatus.Mode != "session-memory" || got.Model.CredentialStatus.State != "missing" {
		t.Fatal("session key survived reopen", got, e)
	}
	_, e = c2.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: s.Profile.ProfileID, Model: m})
	fault(t, e, "CREDENTIAL_MISSING")
	_, e = c2.Credentials.Register(ctx, s.Profile.ProfileID, ref, "session-memory", []byte("replacement"))
	fault(t, e, "CREDENTIAL_REF_REUSED")
	for _, f := range []string{"profile.sqlite3", "profile.sqlite3-wal", "profile.sqlite3-shm"} {
		b, e := os.ReadFile(filepath.Join(dir, f))
		if os.IsNotExist(e) {
			continue
		}
		if e != nil {
			t.Fatal(e)
		}
		if bytes.Contains(b, []byte(sentinel)) {
			t.Fatal("private key persisted", f)
		}
	}
}
