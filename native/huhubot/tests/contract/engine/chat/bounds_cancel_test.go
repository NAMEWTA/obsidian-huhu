package chat_test

import (
	"compress/gzip"
	"context"
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
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestDecodedStreamAndToolBoundsFailWithoutEffects(t *testing.T) {
	for _, mode := range []string{"line", "event", "gzip_total", "text", "arguments", "batch", "turns"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				n := requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				switch mode {
				case "line":
					fmt.Fprintf(w, "data: %s\n\n", strings.Repeat("x", common.MaxLineBytes))
				case "event":
					fmt.Fprint(w, strings.Repeat(":"+strings.Repeat("p", 150000)+"\n", 4))
				case "gzip_total":
					w.Header().Set("Content-Encoding", "gzip")
					z := gzip.NewWriter(w)
					for i := 0; i < 30; i++ {
						fmt.Fprintf(z, ":%s\n\n", strings.Repeat("p", 150000))
					}
					if err := z.Close(); err != nil {
						t.Error(err)
					}
				case "text":
					for i := 0; i < 3; i++ {
						sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"content": strings.Repeat("x", 60000)}}}})
					}
					textTurn(w, "", "stop", nil, true)
				case "arguments":
					toolTurn(w, []map[string]any{noteCall(0, "too-large", "resource:one", strings.Repeat("x", common.MaxArgumentBytes))})
				case "batch":
					calls := []map[string]any{}
					for i := 0; i < common.MaxToolCalls+1; i++ {
						calls = append(calls, noteCall(i, fmt.Sprint("call-", i), fmt.Sprint("resource:", i), "x"))
					}
					toolTurn(w, calls)
				case "turns":
					toolTurn(w, []map[string]any{{"index": 0, "id": fmt.Sprint("read-", n), "type": "function", "function": map[string]any{"name": "tasks_list", "arguments": "{}"}}})
				}
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write", "tasks.list"})
			run := f.terminal(t, f.start(t).RunID)
			if run.Status != "failed" || writer.calls.Load() != 0 {
				t.Fatal(run, writer.calls.Load())
			}
			want := int32(1)
			if mode == "turns" {
				want = common.MaxTurns
			}
			if requests.Load() != want {
				t.Fatal("bound made extra HTTP", requests.Load(), want)
			}
			var effects, pending int
			db := fixtureDB(t, f)
			if err := db.QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=?", run.ID).Scan(&effects); err != nil {
				t.Fatal(err)
			}
			if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=? AND (state<>'settled' OR producer_ended<>1)", run.ID).Scan(&pending); err != nil {
				t.Fatal(err)
			}
			if effects != 0 || pending != 0 {
				t.Fatal(effects, pending)
			}
		})
	}
}

func cancelRun(t *testing.T, f *fixture, run string) {
	t.Helper()
	r, err := f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: run})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Approvals.Cancel(context.Background(), owner, api.RunCancel{CommandMeta: f.meta(r.Revision), ID: run}); err != nil {
		t.Fatal(err)
	}
}

func TestDispatchedCancellationBeforeNetworkKeepsUnknownCharge(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1) }))
	t.Cleanup(server.Close)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	releaseTransport := func() { once.Do(func() { close(release) }) }
	defer releaseTransport()
	transport := http.DefaultTransport.(*http.Transport).Clone()
	defer transport.CloseIdleConnections()
	driver := chatdriver.NewDriverWithTransport(transportFunc(func(r *http.Request) (*http.Response, error) {
		close(entered)
		<-release
		return transport.RoundTrip(r)
	}))
	engine := common.NewEngine(singleRegistry(t, driver), literalResolver)
	t.Cleanup(func() {
		releaseTransport()
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	})
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{Engine: engine, EngineVersion: common.EngineVersion, Probe: driver}, nil)
	run := f.start(t).RunID
	waitSignal(t, entered)
	cancelRun(t, f, run)
	releaseTransport()
	r := f.terminal(t, run)
	engine.Stop()
	waitSignal(t, engine.Done())
	var state, knowledge string
	var charged, reserved, ended int
	if err := fixtureDB(t, f).QueryRow("SELECT state,knowledge,reserved_tokens,charged_tokens,producer_ended FROM model_attempts WHERE run_id=?", run).Scan(&state, &knowledge, &reserved, &charged, &ended); err != nil {
		t.Fatal(err)
	}
	if r.Status != "canceled" || requests.Load() != 0 || state != "settled" || knowledge != "unknown" || reserved != charged || ended != 1 {
		t.Fatal(r, requests.Load(), state, knowledge, reserved, charged, ended)
	}
}

func TestCanceledStreamRejectsLateToolsAndNextRunStillWorks(t *testing.T) {
	seen := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requests.Add(1) > 1 {
			textTurn(w, "next run works", "stop", nil, true)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		sse(w, map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "content": "early partial"}}}})
		w.(http.Flusher).Flush()
		close(seen)
		<-release
		toolTurn(w, []map[string]any{noteCall(0, "late-effect", "resource:late", "never")})
	}))
	t.Cleanup(server.Close)
	writer := &noteWriter{}
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t).RunID
	waitSignal(t, seen)
	cancelRun(t, f, run)
	unblock()
	r := f.terminal(t, run)
	if r.Status != "canceled" || writer.calls.Load() != 0 || requests.Load() != 1 {
		t.Fatal(r, writer.calls.Load(), requests.Load())
	}
	next := f.terminal(t, f.start(t).RunID)
	if next.Status != "succeeded" || requests.Load() != 2 {
		t.Fatal(next, requests.Load())
	}
	deadline := time.NewTimer(3 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	db := fixtureDB(t, f)
	for {
		var n int
		if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=? AND state='settled' AND producer_ended=1", run).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n == 1 {
			break
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("canceled producer did not actually settle")
		}
	}
}
