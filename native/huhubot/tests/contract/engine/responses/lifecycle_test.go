package responses_test

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	driver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
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
	err     error
}

func (b *heldClose) Close() error {
	b.once.Do(func() {
		b.err = b.ReadCloser.Close()
		close(b.entered)
	})
	<-b.release
	return b.err
}

func TestResponsesStopWaitsForActualBodyCloseAndDurableSettlement(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, successfulTextStream)
	}))
	t.Cleanup(server.Close)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	defer transport.CloseIdleConnections()
	d, err := driver.NewDriverWithTransport(transportFunc(func(r *http.Request) (*http.Response, error) {
		response, err := transport.RoundTrip(r)
		if response != nil && response.Body != nil {
			response.Body = &heldClose{ReadCloser: response.Body, entered: entered, release: release}
		}
		return response, err
	}))
	if err != nil {
		t.Fatal(err)
	}
	registry, err := common.NewRegistry(d)
	if err != nil {
		d.Stop()
		waitSignal(t, d.Done())
		_ = d.Close()
		t.Fatal(err)
	}
	engine := common.NewEngine(registry, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
		return []byte("synthetic-responses-key"), api.CredentialStatus{State: "available"}, nil
	})
	t.Cleanup(func() {
		unblock()
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	})
	f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{Engine: engine, EngineVersion: driver.EngineVersion, Probe: registry}, nil)
	run := f.start(t)
	waitSignal(t, entered)
	db := responseDB(t, f)
	var state, knowledge string
	var ended, charged int
	if err := db.QueryRow("SELECT state,producer_ended FROM model_attempts WHERE run_id=?", run).Scan(&state, &ended); err != nil {
		t.Fatal(err)
	}
	if state != "dispatched" || ended != 0 || requests.Load() != 1 {
		t.Fatal("typed completed/EOF was mistaken for producer completion", state, ended, requests.Load())
	}
	engine.Stop()
	if err := f.core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-engine.Done():
		t.Fatal("Engine.Done before real Body.Close returned")
	default:
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	if err := f.core.WaitClosed(ctx); err != context.DeadlineExceeded {
		t.Fatal("Core released its database/profile with a live producer", err)
	}
	unblock()
	waitSignal(t, engine.Done())
	ctx, cancelDone := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelDone()
	if err := f.core.WaitClosed(ctx); err != nil {
		t.Fatal("Core did not actually join", err)
	}
	if err := db.QueryRow("SELECT state,knowledge,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run).Scan(&state, &knowledge, &ended, &charged); err != nil {
		t.Fatal(err)
	}
	if state != "settled" || knowledge != "known" || ended != 1 || charged != 13 || requests.Load() != 1 {
		t.Fatal("real close lost the original terminal observation", state, knowledge, ended, charged, requests.Load())
	}
}

func TestResponsesSettlementFailureRetainsSameActualSQLiteAttemptAcrossStop(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, successfulTextStream)
	}))
	t.Cleanup(server.Close)
	f, engine, _ := capturedResponseFixture(t, server.URL+"/v1", nil, nil)
	db, err := sql.Open("sqlite3", "file:"+filepath.Join(f.locator, "profile.sqlite3")+"?mode=rw")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	if _, err := db.Exec("CREATE TRIGGER responses_reject_settlement BEFORE UPDATE ON model_attempts WHEN NEW.state='settled' BEGIN SELECT RAISE(ABORT,'synthetic settlement failure'); END"); err != nil {
		t.Fatal(err)
	}
	var input api.EngineInput
	var attempt string
	t.Cleanup(func() {
		if _, err := db.Exec("DROP TRIGGER IF EXISTS responses_reject_settlement"); err != nil {
			t.Error(err)
		}
		select {
		case <-engine.Done():
			return
		default:
		}
		// A failing assertion must not strand the temporary Profile behind its
		// intentionally broken SQL. Normal success never enters this fallback.
		if t.Failed() && attempt != "" && input.Attempts != nil {
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			if _, err := input.Attempts.Settle(ctx, api.AttemptReservation{ID: attempt}, api.AttemptObservation{Knowledge: "known", InputTokens: "9", OutputTokens: "4", ProducerEnded: true}); err != nil {
				t.Error("emergency fixture cleanup", err)
			}
		}
	})
	run := f.terminal(t, f.start(t))
	input = <-engine.inputs
	var state, knowledge string
	var ended, reserved, charged int
	if err := db.QueryRow("SELECT attempt_id,state,producer_ended,reserved_tokens,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&attempt, &state, &ended, &reserved, &charged); err != nil {
		t.Fatal(err)
	}
	if run.Status != "failed" || run.Reason != "MODEL_PRODUCER_UNSETTLED" || state != "dispatched" || ended != 0 || reserved <= 0 || charged != 0 || requests.Load() != 1 {
		t.Fatal("SQL failure was reported as a completed producer", run, state, ended, reserved, charged, requests.Load())
	}
	engine.Stop()
	if err := f.core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-engine.Done():
		t.Fatal("Stop dropped local settlement responsibility")
	default:
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	if err := f.core.WaitClosed(ctx); err != context.DeadlineExceeded {
		t.Fatal("Core closed SQLite before pending settlement", err)
	}
	if _, err := db.Exec("DROP TRIGGER responses_reject_settlement"); err != nil {
		t.Fatal(err)
	}
	waitSignal(t, engine.Done())
	ctx, doneCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer doneCancel()
	if err := f.core.WaitClosed(ctx); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRow("SELECT count(*),state,knowledge,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run.ID).Scan(&count, &state, &knowledge, &ended, &charged); err != nil {
		t.Fatal(err)
	}
	if count != 1 || state != "settled" || knowledge != "known" || ended != 1 || charged != 13 || requests.Load() != 1 {
		t.Fatal("local retry lost or duplicated original observation", count, state, knowledge, ended, charged, requests.Load())
	}
}
