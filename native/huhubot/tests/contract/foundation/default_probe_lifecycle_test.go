package foundation_test

import (
	"context"
	"errors"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type heldMetadataProbe struct {
	entered chan struct{}
	release chan struct{}
	secret  []byte
	started atomic.Bool
}

func (p *heldMetadataProbe) Probe(_ context.Context, _ api.ModelBindingDraft, secret []byte) ([]string, error) {
	if !p.started.CompareAndSwap(false, true) {
		return nil, api.Denied("UNEXPECTED_SECOND_PROBE")
	}
	p.secret = secret
	close(p.entered)
	<-p.release // deliberate boundary control: cancel is not actual return
	return []string{}, nil
}

func TestCoreCloseWaitsForActualProbeReturnBeforeProviderAndProfileCleanup(t *testing.T) {
	ctx := context.Background()
	root := privateRoot(t)
	loc := filepath.Join(root, "probe-drain")
	probe := &heldMetadataProbe{entered: make(chan struct{}), release: make(chan struct{})}
	core, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{Probe: probe})
	if e != nil {
		t.Fatal(e)
	}
	var once sync.Once
	release := func() { once.Do(func() { close(probe.release) }) }
	t.Cleanup(func() {
		release()
		_ = core.RequestStop()
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if e := core.WaitClosed(bounded); e != nil {
			t.Error(e)
		}
	})
	id := api.NewConnectionIdentity("probe-close", "owner", true)
	status, e := core.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	const ref = "credential:22222222222222222222222222222222"
	if _, e = core.Credentials.Register(ctx, status.Profile.ProfileID, ref, "session-memory", []byte("synthetic-held-probe-key")); e != nil {
		t.Fatal(e)
	}
	command := api.ModelTest{ProfileID: status.Profile.ProfileID, Model: api.ModelBindingDraft{Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/unused", ProviderID: "controlled", ModelID: "held", CredentialRef: ref, Capabilities: []string{}}}
	captured := core.API.Assistant
	callDone := make(chan error, 1)
	go func() { _, e := captured.TestModel(ctx, id, command); callDone <- e }()
	callWaited := false
	t.Cleanup(func() {
		release()
		if !callWaited {
			select {
			case <-callDone:
			case <-time.After(3 * time.Second):
				t.Error("actual Probe goroutine did not join during failed-case cleanup")
			}
		}
	})
	select {
	case <-probe.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("private Resolve did not enter the controlled Probe")
	}
	started := time.Now()
	e = core.Close()
	var fault *api.Fault
	if !errors.As(e, &fault) || fault.Reason != "EXECUTOR_STOP_TIMEOUT" || time.Since(started) < 3*time.Second {
		t.Fatal("Close treated cancellation as actual Probe return", e)
	}
	select {
	case <-core.Done():
		t.Fatal("Profile cleanup completed while actual Probe call remained")
	default:
	}
	_, e = captured.TestModel(context.Background(), id, command)
	if !errors.As(e, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("captured Background Probe bypassed synchronous stop", e)
	}
	credential, e := core.Credentials.Status(ctx, status.Profile.ProfileID, ref)
	if e != nil || credential.State != "available" {
		t.Fatal("provider or its Profile catalog closed before actual Probe return", e)
	}
	other, e := bootstrap.Open(ctx, root, loc)
	if e == nil {
		_ = other.Close()
		t.Fatal("another writer acquired a live Probe Profile")
	}
	if !errors.As(e, &fault) || fault.Kind != "INSTANCE_CONFLICT" {
		t.Fatal("wrong pending Profile result", e)
	}
	release()
	select {
	case <-callDone:
		callWaited = true
	case <-time.After(3 * time.Second):
		t.Fatal("controlled Probe did not actually return")
	}
	for _, b := range probe.secret {
		if b != 0 {
			t.Fatal("ProbeDone preceded clearing its private resolved copy")
		}
	}
	bounded, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if e = core.WaitClosed(bounded); e != nil {
		t.Fatal(e)
	}
	_, e = captured.TestModel(context.Background(), id, command)
	if !errors.As(e, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("late captured Probe touched a closed repository/provider", e)
	}
	reopened, e := bootstrap.Open(ctx, root, loc)
	if e != nil {
		t.Fatal(e)
	}
	if e = reopened.Close(); e != nil {
		t.Fatal(e)
	}
	<-reopened.Done()
}
