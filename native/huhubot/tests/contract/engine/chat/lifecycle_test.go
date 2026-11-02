package chat_test

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type heldClose struct {
	io.ReadCloser
	entered chan struct{}
	release <-chan struct{}
	once    sync.Once
}

func (b *heldClose) Close() error {
	err := b.ReadCloser.Close()
	b.once.Do(func() { close(b.entered) })
	<-b.release
	return err
}

func literalResolver(context.Context, string) ([]byte, api.CredentialStatus, error) {
	return []byte("synthetic-key"), api.CredentialStatus{State: "available"}, nil
}

func waitSignal(t *testing.T, ch <-chan struct{}) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(5 * time.Second):
		t.Fatal("producer barrier not reached")
	}
}

func TestFinalSDKProducerAckWaitsForBodyCloseAndSettlement(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		textTurn(w, "body already read", "stop", map[string]any{"prompt_tokens": 7, "completion_tokens": 2, "total_tokens": 9}, true)
	}))
	t.Cleanup(server.Close)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	releaseBody := func() { once.Do(func() { close(release) }) }
	defer releaseBody()
	transport := http.DefaultTransport.(*http.Transport).Clone()
	defer transport.CloseIdleConnections()
	driver := chatdriver.NewDriverWithTransport(transportFunc(func(r *http.Request) (*http.Response, error) {
		response, err := transport.RoundTrip(r)
		if response != nil && response.Body != nil {
			response.Body = &heldClose{ReadCloser: response.Body, entered: entered, release: release}
		}
		return response, err
	}))
	engine := common.NewEngine(singleRegistry(t, driver), literalResolver)
	defer func() {
		releaseBody()
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	}()
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{Engine: engine, EngineVersion: common.EngineVersion, Probe: driver}, nil)
	run := f.start(t).RunID
	waitSignal(t, entered)
	db := fixtureDB(t, f)
	var state string
	var producer int
	if err := db.QueryRow("SELECT state,producer_ended FROM model_attempts WHERE run_id=?", run).Scan(&state, &producer); err != nil {
		t.Fatal(err)
	}
	if state != "dispatched" || producer != 0 {
		t.Fatal("network EOF was mistaken for final producer ACK", state, producer)
	}
	engine.Stop()
	select {
	case <-engine.Done():
		t.Fatal("Done before SDK final defer returned")
	default:
	}
	closed := make(chan error, 1)
	go func() { closed <- f.core.Close() }()
	// These are explicit blocked cleanup observations, not a scheduling sleep:
	// SDK is held inside its real body.Close, after HTTP bytes were consumed.
	select {
	case err := <-closed:
		t.Fatal("Core released live producer", err)
	case <-time.After(30 * time.Millisecond):
	}
	select {
	case <-f.core.Done():
		t.Fatal("Core.Done released Profile/provider early")
	default:
	}
	releaseBody()
	waitSignal(t, engine.Done())
	select {
	case err := <-closed:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Core did not join released producer")
	}
	if err := engine.Close(); err != nil {
		t.Fatal(err)
	}
	// Reopen only after every producer and Core cleanup returned. The actual
	// dispatched request must have reached durable settlement despite Stop.
	var charged int
	if err := db.QueryRow("SELECT state,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run).Scan(&state, &producer, &charged); err != nil {
		t.Fatal(err)
	}
	if state != "settled" || producer != 1 || charged != 9 {
		t.Fatal(state, producer, charged)
	}
}
