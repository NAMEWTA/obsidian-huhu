package chat_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
	"unicode/utf8"

	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type countedTool struct {
	api.ToolInvoker
	calls *atomic.Int32
}

func (t countedTool) Invoke(ctx context.Context, c api.ToolCall) (api.ToolResult, error) {
	t.calls.Add(1)
	return t.ToolInvoker.Invoke(ctx, c)
}

type perByteBody struct {
	io.ReadCloser
	reads *atomic.Int32
}

func (b perByteBody) Read(p []byte) (int, error) {
	if len(p) > 1 {
		p = p[:1]
	}
	n, err := b.ReadCloser.Read(p)
	if n > 0 {
		b.reads.Add(1)
	}
	return n, err
}

func rawToolEvent(t *testing.T, call map[string]any, replacement []byte) []byte {
	t.Helper()
	data, err := json.Marshal(map[string]any{"choices": []any{map[string]any{"index": 0, "delta": map[string]any{"role": "assistant", "tool_calls": []any{call}}}}})
	if err != nil {
		t.Fatal(err)
	}
	data = bytes.Replace(data, []byte("RAW_UTF8_MARKER"), replacement, 1)
	return append(append([]byte("data: "), data...), []byte("\n\n")...)
}

func waitToolOutcome(t *testing.T, f *fixture, id string) api.Run {
	t.Helper()
	deadline := time.NewTimer(5 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		r, err := f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: id})
		if err != nil {
			t.Fatal(err)
		}
		switch r.Status {
		case "waiting_approval", "failed", "succeeded", "canceled":
			return r
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("no bounded tool outcome", r)
		}
	}
}

func TestRawWireUTF8BeforeSDKAndEntireToolBatch(t *testing.T) {
	for _, mode := range []string{"default_valid", "default_invalid", "default_invalid_second", "byte_valid", "byte_invalid_second", "byte_eof_truncated", "byte_eof_valid"} {
		t.Run(mode, func(t *testing.T) {
			valid := mode == "default_valid" || mode == "byte_valid" || mode == "byte_eof_valid"
			var wire bytes.Buffer
			second := strings.Contains(mode, "second") || mode == "byte_eof_truncated"
			if second {
				wire.Write(rawToolEvent(t, noteCall(0, "valid-first", "resource:first", "first is valid"), nil))
			}
			index := 0
			if second {
				index = 1
			}
			call := noteCall(index, "utf8-original", "resource:utf8", "RAW_UTF8_MARKER")
			replacement := []byte("漢字🙂�")
			if !valid {
				replacement = []byte{0xff}
			}
			event := rawToolEvent(t, call, replacement)
			if mode == "byte_eof_truncated" {
				// The last raw line ends inside a rune, not inside a complete ASCII
				// escape. No newline or later byte can complete its UTF-8 suffix.
				event = rawToolEvent(t, call, []byte("RAW_UTF8_MARKER"))
				cut := bytes.Index(event, []byte("RAW_UTF8_MARKER"))
				event = append(event[:cut], 0xe6, 0xbc)
			}
			wire.Write(event)
			if mode != "byte_eof_truncated" {
				wire.WriteString("data: {\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\ndata: [DONE]")
				if mode != "byte_eof_valid" {
					wire.WriteString("\n\n")
				}
			}
			body := append([]byte(nil), wire.Bytes()...)
			if utf8.Valid(body) != valid {
				t.Fatal("incorrect wire premise", mode)
			}
			var requests, reads, invocations atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				w.Header().Set("Content-Type", "text/event-stream")
				if _, err := w.Write(body); err != nil {
					t.Log("canceled invalid response write", err)
				}
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			options := bootstrap.Options{NoteWriter: writer}
			var engine *captureEngine
			if strings.HasPrefix(mode, "byte_") {
				transport := http.DefaultTransport.(*http.Transport).Clone()
				t.Cleanup(transport.CloseIdleConnections)
				driver := chatdriver.NewDriverWithTransport(transportFunc(func(r *http.Request) (*http.Response, error) {
					response, err := transport.RoundTrip(r)
					if response != nil && response.Body != nil {
						response.Body = perByteBody{ReadCloser: response.Body, reads: &reads}
					}
					return response, err
				}))
				engine = &captureEngine{Engine: common.NewEngine(singleRegistry(t, driver), literalResolver), inputs: make(chan api.EngineInput, 1)}
				engine.prepare = func(in api.EngineInput) api.EngineInput {
					in.Tools = countedTool{ToolInvoker: in.Tools, calls: &invocations}
					return in
				}
				t.Cleanup(func() {
					engine.Stop()
					waitSignal(t, engine.Done())
					if err := engine.Close(); err != nil {
						t.Error(err)
					}
				})
				options.Engine, options.EngineVersion, options.Probe = engine, common.EngineVersion, driver
			}
			f := newFixtureWith(t, server.URL+"/v1", options, []string{"note.write"})
			id := f.start(t).RunID
			r := waitToolOutcome(t, f, id)
			db := fixtureDB(t, f)
			var effects, approvals, ended, charged, reserved int
			var state, knowledge string
			if err := db.QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=?", id).Scan(&effects); err != nil {
				t.Fatal(err)
			}
			if err := db.QueryRow("SELECT count(*) FROM access_approvals WHERE run_id=?", id).Scan(&approvals); err != nil {
				t.Fatal(err)
			}
			if err := db.QueryRow("SELECT state,knowledge,producer_ended,charged_tokens,reserved_tokens FROM model_attempts WHERE run_id=?", id).Scan(&state, &knowledge, &ended, &charged, &reserved); err != nil {
				t.Fatal(err)
			}
			if valid {
				if r.Status != "waiting_approval" || effects != 1 || approvals != 1 {
					t.Fatal("valid UTF-8 split rejected", mode, r, effects, approvals)
				}
				a := f.approval(t, id)
				if a.Preview.Content != "漢字🙂�" {
					t.Fatal("UTF-8 content changed", a.Preview.Content)
				}
				if engine != nil && invocations.Load() != 1 {
					t.Fatal("valid batch invocation changed", invocations.Load())
				}
			} else if r.Status != "failed" || r.Reason != "MODEL_STREAM_INVALID" || effects != 0 || approvals != 0 || invocations.Load() != 0 {
				t.Fatal("invalid wire reached batch Invoke", mode, r, effects, approvals, invocations.Load())
			}
			if requests.Load() != 1 || writer.calls.Load() != 0 || state != "settled" || knowledge != "unknown" || ended != 1 || charged != reserved || charged <= 0 {
				t.Fatal("raw error lost actual settlement", mode, requests.Load(), writer.calls.Load(), state, knowledge, ended, charged, reserved)
			}
			if engine != nil && reads.Load() < 3 {
				t.Fatal("per-byte reader was not consumed", reads.Load())
			}
			if strings.Contains(r.Reason, "RAW_UTF8_MARKER") || strings.Contains(r.Reason, "漢") {
				t.Fatal("provider data in error", r.Reason)
			}
			if err := f.core.Close(); err != nil {
				t.Fatal(err)
			}
			waitSignal(t, f.core.Done())
			if engine != nil {
				engine.Stop()
				waitSignal(t, engine.Done())
			}
			t.Logf("mode=%s validWire=%v HTTP=%d readCalls=%d effects=%d approvals=%d invocations=%d settledUnknown=%s producer=%d", mode, valid, requests.Load(), reads.Load(), effects, approvals, invocations.Load(), knowledge, ended)
		})
	}
}
