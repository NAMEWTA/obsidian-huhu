package assistant_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type protocolProbe struct{ calls atomic.Int32 }

func (*protocolProbe) SupportsProtocol(protocol string) bool {
	return protocol == "openai-chat-completions"
}
func (p *protocolProbe) Probe(context.Context, api.ModelBindingDraft, []byte) ([]string, error) {
	p.calls.Add(1)
	return []string{}, nil
}

func openProbePolicy(t *testing.T, p api.ModelProbePort) *bootstrap.Core {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Probe: p})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
		<-c.Done()
	})
	return c
}

func probePolicyModel(t *testing.T, c *bootstrap.Core) (string, api.ModelBindingDraft) {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	ref := "credential:abcdef0123456789abcdef0123456789"
	if _, e = c.Credentials.Register(ctx, s.Profile.ProfileID, ref, "session-memory", []byte("PROBE_POLICY_FAKE_PRIVATE_KEY")); e != nil {
		t.Fatal(e)
	}
	return s.Profile.ProfileID, api.ModelBindingDraft{Protocol: "openai-chat-completions", ProviderID: "controlled", ModelID: "metadata-model", Endpoint: "http://127.0.0.1:1/v1", CredentialRef: ref, Capabilities: []string{"text", "tools"}}
}

func TestModelListingRequiresDeclaredProtocolAndDoesNotRunProbe(t *testing.T) {
	p := &protocolProbe{}
	c := openProbePolicy(t, p)
	profile, m := probePolicyModel(t, c)
	for _, protocol := range []string{"openai-chat-completions", "openai-responses", "anthropic-messages"} {
		m.Protocol = protocol
		if _, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "agent-"+protocol, ""), Draft: api.AgentDraft{Name: protocol, Persona: "NOT_SENT_BY_METADATA", Model: &m}}); e != nil {
			t.Fatal(e)
		}
	}
	models, e := c.API.Assistant.ListModels(ctx, owner, api.PageQuery{ProfileID: profile})
	if e != nil || len(models.Items) != 3 {
		t.Fatalf("models: %#v %v", models, e)
	}
	for _, model := range models.Items {
		if want := model.Protocol == "openai-chat-completions"; model.Available != want {
			t.Errorf("protocol %s available=%v; want explicit support %v", model.Protocol, model.Available, want)
		}
	}
	if p.calls.Load() != 0 {
		t.Fatal("listing contacted a model")
	}
	m.Protocol = "openai-responses"
	m.CredentialRef = "credential:11111111111111111111111111111111"
	_, e = c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: profile, Model: m})
	fault(t, e, "ADAPTER_NOT_ASSEMBLED")
	if p.calls.Load() != 0 {
		t.Fatal("unsupported protocol reached the Probe")
	}
}

func TestUndeclaredProbePreservesExplicitTestingButDoesNotAdvertiseProtocols(t *testing.T) {
	p := &probe{}
	c := openProbePolicy(t, p)
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	ref := "credential:abcdef0123456789abcdef0123456789"
	if _, e = c.Credentials.Register(ctx, s.Profile.ProfileID, ref, "session-memory", []byte(sentinel)); e != nil {
		t.Fatal(e)
	}
	m := api.ModelBindingDraft{Protocol: "openai-responses", ProviderID: "fixture", ModelID: "metadata-model", Endpoint: "https://fixture.invalid/v1", CredentialRef: ref}
	if _, e = c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "legacy-probe-agent", ""), Draft: api.AgentDraft{Name: "legacy explicit probe", Persona: "test", Model: &m}}); e != nil {
		t.Fatal(e)
	}
	listed, e := c.API.Assistant.ListModels(ctx, owner, api.PageQuery{ProfileID: s.Profile.ProfileID})
	if e != nil || len(listed.Items) != 1 || listed.Items[0].Available || p.called {
		t.Fatalf("undeclared list falsely claims protocol: %#v %v", listed, e)
	}
	tested, e := c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: s.Profile.ProfileID, Model: m})
	if e != nil || !tested.Available || !p.called {
		t.Fatalf("explicit injected Probe compatibility: %#v %v", tested, e)
	}
}

type heldProbe struct {
	entered, canceled, release chan struct{}
	once                       sync.Once
	calls                      atomic.Int32
	key                        []byte
}

func (*heldProbe) SupportsProtocol(protocol string) bool {
	return protocol == "openai-chat-completions"
}
func (p *heldProbe) Probe(c context.Context, _ api.ModelBindingDraft, key []byte) ([]string, error) {
	p.calls.Add(1)
	p.key = key
	close(p.entered)
	<-c.Done()
	close(p.canceled)
	<-p.release
	return nil, c.Err()
}

func TestStopProbesCancelsCapturedCallAndWaitsForActualReturnAndSecretClear(t *testing.T) {
	p := &heldProbe{entered: make(chan struct{}), canceled: make(chan struct{}), release: make(chan struct{})}
	c := openProbePolicy(t, p)
	t.Cleanup(func() { p.once.Do(func() { close(p.release) }) })
	profile, m := probePolicyModel(t, c)
	service := c.API.Assistant
	control, ok := service.(interface {
		StopProbes()
		ProbeDone() <-chan struct{}
	})
	if !ok {
		t.Fatal("assistant Probe lifecycle not assembled")
	}
	returned := make(chan error, 1)
	finished := make(chan struct{})
	go func() {
		defer close(finished)
		_, e := service.TestModel(context.Background(), owner, api.ModelTest{ProfileID: profile, Model: m})
		returned <- e
	}()
	t.Cleanup(func() {
		control.StopProbes()
		p.once.Do(func() { close(p.release) })
		select {
		case <-finished:
		case <-time.After(3 * time.Second):
			t.Error("Probe test goroutine did not finish cleanup")
		}
	})
	select {
	case <-p.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("actual Probe was not entered")
	}
	control.StopProbes()
	select {
	case <-p.canceled:
	case <-time.After(3 * time.Second):
		t.Fatal("captured Background call was not canceled")
	}
	select {
	case <-control.ProbeDone():
		t.Fatal("ProbeDone preceded actual Probe return")
	default:
	}
	_, e := service.TestModel(context.Background(), owner, api.ModelTest{ProfileID: "unrelated-profile", Model: m})
	fault(t, e, "SERVICE_STOPPING")
	if p.calls.Load() != 1 {
		t.Fatal("stopped captured service admitted a second Probe")
	}
	p.once.Do(func() { close(p.release) })
	select {
	case e := <-returned:
		fault(t, e, "MODEL_PROBE_FAILED")
	case <-time.After(3 * time.Second):
		t.Fatal("released Probe did not return")
	}
	select {
	case <-control.ProbeDone():
	case <-time.After(3 * time.Second):
		t.Fatal("actual Probe return did not drain")
	}
	if len(p.key) == 0 || !bytes.Equal(p.key, make([]byte, len(p.key))) {
		t.Fatal("ProbeDone preceded clearing caller-owned secret")
	}
	control.StopProbes()
}
