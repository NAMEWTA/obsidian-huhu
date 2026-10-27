package chat_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/httpcall"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/packages/param"
	"github.com/openai/openai-go/v3/packages/ssestream"
	sdk "github.com/openai/openai-go/v3/responses"
)

const helperCompleted = `{"type":"response.completed","response":{"id":"response:helper","status":"completed","model":"fixture-model","output":[],"usage":{"input_tokens":9,"output_tokens":4,"total_tokens":13},"marker":"汉字😀�"}}`

func helperSSE() string { return "event: response.completed\ndata: " + helperCompleted + "\n\n" }
func helperLimits() httpcall.Limits {
	return httpcall.Limits{RequestBytes: common.MaxRequestBytes, ResponseBytes: common.MaxResponseBytes, LineBytes: common.MaxLineBytes, EventBytes: common.MaxEventBytes, RequestTimeout: time.Second, IdleTimeout: 500 * time.Millisecond, CleanupTimeout: 100 * time.Millisecond}
}
func helperRuntime(t *testing.T, limits httpcall.Limits, transport http.RoundTripper) *httpcall.Runtime {
	t.Helper()
	r, err := httpcall.NewRuntimeWithTransport(limits, transport)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		r.Stop()
		waitSignal(t, r.Done())
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	})
	return r
}
func helperCall(t *testing.T, runtime *httpcall.Runtime, target string, attempts *recordingAttempts, observe func(httpcall.SSEEvent) error) *httpcall.Call {
	t.Helper()
	c, err := runtime.BeginGeneration(context.Background(), httpcall.RequestSpec{URL: target, Attempts: attempts, LogicalCallID: "turn:1", OutputBound: 4096, ValidateBody: func(raw []byte) error { return common.StrictJSON(raw, common.MaxRequestBytes) }, ObserveEvent: observe})
	if err != nil {
		t.Fatal(err)
	}
	return c
}
func helperStream(call *httpcall.Call, target string) *ssestream.Stream[sdk.ResponseStreamEventUnion] {
	service := sdk.NewResponseService(option.WithBaseURL(strings.TrimSuffix(target, "responses")), option.WithAPIKey("synthetic-key"), option.WithHTTPClient(call.Client()), option.WithMaxRetries(0))
	params := sdk.ResponseNewParams{Model: "fixture-model", Store: param.NewOpt(false), Background: param.NewOpt(false), MaxOutputTokens: param.NewOpt(int64(4096))}
	params.Input.OfInputItemList = sdk.ResponseInputParam{param.Override[sdk.ResponseInputItemUnionParam](json.RawMessage(`{"role":"user","content":"explicit"}`))}
	return service.NewStreaming(call.Context(), params)
}
func helperKnown() api.AttemptObservation {
	return api.AttemptObservation{Knowledge: "known", InputTokens: "9", OutputTokens: "4"}
}

type oneByteBody struct{ io.ReadCloser }

func (b oneByteBody) Read(p []byte) (int, error) {
	if len(p) > 1 {
		p = p[:1]
	}
	return b.ReadCloser.Read(p)
}

type steppedBody struct {
	chunks [][]byte
	end    error
	closes atomic.Int32
}

func (b *steppedBody) Read(p []byte) (int, error) {
	for len(b.chunks) > 0 {
		if len(b.chunks[0]) == 0 {
			b.chunks = b.chunks[1:]
			continue
		}
		n := copy(p, b.chunks[0])
		b.chunks[0] = b.chunks[0][n:]
		return n, nil
	}
	if b.end != nil {
		return 0, b.end
	}
	return 0, io.EOF
}
func (b *steppedBody) Close() error { b.closes.Add(1); return nil }
func helperResponse(body io.ReadCloser, status int) *http.Response {
	return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": []string{"text/event-stream"}}, Body: body}
}

func TestSharedHTTPActualSDKFinalWireAndSplitUTF8Observer(t *testing.T) {
	var physical atomic.Int32
	wire := make(chan []byte, 1)
	parts := strings.SplitN(helperCompleted, `,"response":`, 2)
	wantData := parts[0] + ",\n\"response\":" + parts[1]
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		physical.Add(1)
		if req.URL.Path != "/v1/responses" || req.Header.Get("Authorization") != "Bearer synthetic-key" {
			t.Error("explicit final destination/credential", req.URL)
		}
		raw, err := io.ReadAll(req.Body)
		if err != nil {
			t.Error(err)
		}
		wire <- raw
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "event: response.completed\ndata: "+parts[0]+",\ndata: \"response\":"+parts[1]+"\n\n")
	}))
	t.Cleanup(server.Close)
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	t.Cleanup(transport.CloseIdleConnections)
	runtime := helperRuntime(t, helperLimits(), transportFunc(func(req *http.Request) (*http.Response, error) {
		res, err := transport.RoundTrip(req)
		if res != nil {
			res.Body = oneByteBody{res.Body}
		}
		return res, err
	}))
	attempts := &recordingAttempts{}
	var observed atomic.Int32
	target := server.URL + "/v1/responses"
	call := helperCall(t, runtime, target, attempts, func(event httpcall.SSEEvent) error {
		if event.Event != "response.completed" || string(event.Data) != wantData {
			t.Error("raw event changed", event.Event, string(event.Data))
		}
		observed.Add(1)
		return nil
	})
	stream := helperStream(call, target)
	var count int
	for stream.Next() {
		count++
	}
	if err := stream.Err(); err != nil {
		t.Fatal("actual SDK decode", err)
	}
	if err := call.Finish(stream.Close, helperKnown); err != nil {
		t.Fatal(err)
	}
	requests, observations, dispatches, _ := attempts.snapshot()
	body := <-wire
	if physical.Load() != 1 || observed.Load() != 1 || count != 1 || len(requests) != 1 || requests[0].InputEstimate != strconv.Itoa(len(body)) || requests[0].OutputBound != "4096" || dispatches != 1 || len(observations) != 1 || observations[0].Knowledge != "known" || !observations[0].ProducerEnded {
		t.Fatal("final wire/known settlement", physical.Load(), observed.Load(), count, requests, observations, dispatches)
	}
}

func TestSharedHTTPRawFailureOverridesEarlierKnownUsage(t *testing.T) {
	for _, kind := range []string{"invalid_utf8", "read_error", "unknown_event", "line", "event", "response"} {
		t.Run(kind, func(t *testing.T) {
			limits := helperLimits()
			limits.LineBytes = 1024
			limits.EventBytes = 512
			body := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
			switch kind {
			case "invalid_utf8":
				body.chunks = append(body.chunks, []byte{'d', 'a', 't', 'a', ':', ' ', 0xff, '\n', '\n'})
			case "read_error":
				body.end = io.ErrUnexpectedEOF
			case "unknown_event":
				body.chunks = append(body.chunks, []byte("event: provider.private\ndata: {}\n\n"))
			case "line":
				body.chunks = append(body.chunks, []byte(strings.Repeat("x", 1025)+"\n"))
			case "event":
				body.chunks = append(body.chunks, []byte("data: "+strings.Repeat("x", 400)+"\ndata: "+strings.Repeat("y", 400)+"\n\n"))
			case "response":
				limits.ResponseBytes = len(helperSSE()) + 8
				body.chunks = append(body.chunks, []byte(strings.Repeat("x", 20)))
			}
			runtime := helperRuntime(t, limits, transportFunc(func(*http.Request) (*http.Response, error) { return helperResponse(body, 200), nil }))
			attempts := &recordingAttempts{}
			var knownSeen atomic.Bool
			target := "http://sdk.fixture.invalid/v1/responses"
			call := helperCall(t, runtime, target, attempts, func(event httpcall.SSEEvent) error {
				if event.Event != "response.completed" {
					return errors.New("SYNTHETIC_PRIVATE_UNKNOWN_EVENT")
				}
				knownSeen.Store(true)
				return nil
			})
			stream := helperStream(call, target)
			for stream.Next() {
			}
			cleanup := call.Finish(stream.Close, helperKnown)
			_, observations, _, _ := attempts.snapshot()
			if !knownSeen.Load() || cleanup == nil || len(observations) != 1 || observations[0].Knowledge != "unknown" || !observations[0].ProducerEnded || body.closes.Load() != 1 {
				t.Fatal("raw failure trusted earlier usage or lost real Close", kind, knownSeen.Load(), cleanup, observations, body.closes.Load())
			}
			if strings.Contains(cleanup.Error(), "SYNTHETIC_PRIVATE") {
				t.Fatal("raw callback error leaked")
			}
		})
	}
}

func TestSharedHTTPNilEndDoesNotConsumeCleanupResponsibility(t *testing.T) {
	body := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
	runtime := helperRuntime(t, helperLimits(), transportFunc(func(*http.Request) (*http.Response, error) { return helperResponse(body, 200), nil }))
	attempts := &recordingAttempts{}
	target := "http://sdk.fixture.invalid/v1/responses"
	call := helperCall(t, runtime, target, attempts, func(httpcall.SSEEvent) error { return nil })
	stream := helperStream(call, target)
	for stream.Next() {
	}
	if err := call.Finish(nil, helperKnown); err == nil {
		t.Error("nil SDK completion proof accepted")
	}
	_, before, _, _ := attempts.snapshot()
	if len(before) != 0 {
		t.Error("nil SDK completion proof settled attempt", before)
	}
	if err := call.Finish(stream.Close, helperKnown); err != nil {
		t.Error("valid owner cannot finish after invalid call", err)
	}
	_, after, _, _ := attempts.snapshot()
	if len(after) != 1 || !after[0].ProducerEnded || body.closes.Load() != 1 {
		t.Error("proper cleanup did not happen exactly once", after, body.closes.Load())
	}
}

func TestSharedHTTPActualSDKHiddenBodyCloseOutlivesStop(t *testing.T) {
	for _, kind := range []string{"canceled_after_do", "error_body_replaced"} {
		t.Run(kind, func(t *testing.T) {
			entered, release := make(chan struct{}), make(chan struct{})
			var released atomic.Bool
			unblock := func() {
				if released.CompareAndSwap(false, true) {
					close(release)
				}
			}
			defer unblock()
			raw := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
			var cancelCall func()
			var physical atomic.Int32
			runtime := helperRuntime(t, helperLimits(), transportFunc(func(*http.Request) (*http.Response, error) {
				physical.Add(1)
				body := &heldClose{ReadCloser: raw, entered: entered, release: release}
				if kind == "canceled_after_do" {
					cancelCall()
					return helperResponse(body, 200), nil
				}
				return &http.Response{StatusCode: 429, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: body}, nil
			}))
			attempts := &recordingAttempts{}
			target := "http://sdk.fixture.invalid/v1/responses"
			call := helperCall(t, runtime, target, attempts, func(httpcall.SSEEvent) error { return nil })
			cancelCall = call.Cancel
			returned := make(chan *ssestream.Stream[sdk.ResponseStreamEventUnion], 1)
			go func() { returned <- helperStream(call, target) }()
			waitSignal(t, entered)
			finished := make(chan error, 1)
			go func() {
				finished <- call.Finish(func() error {
					stream := <-returned
					for stream.Next() {
					}
					if stream.Err() == nil {
						t.Error("SDK should report cancellation/error status")
					}
					return stream.Close()
				}, func() api.AttemptObservation { return api.AttemptObservation{Knowledge: "unknown"} })
			}()
			runtime.Stop()
			select {
			case <-runtime.Done():
				t.Fatal("original body still closing but Runtime.Done closed")
			default:
			}
			_, before, _, _ := attempts.snapshot()
			if len(before) != 0 {
				t.Fatal("settled before original body Close returned", before)
			}
			// Finish must return its bounded cleanup failure while the actual
			// original Close is still held. That return cannot close Done or
			// settle the request; the retained cleanup must finish afterwards.
			select {
			case cleanup := <-finished:
				if cleanup == nil {
					t.Error("held Close did not reach bounded cleanup timeout")
				}
			case <-time.After(5 * time.Second):
				t.Fatal("Finish did not honor its cleanup timeout")
			}
			select {
			case <-runtime.Done():
				t.Fatal("cleanup timeout released the live Close")
			default:
			}
			_, timedOut, _, _ := attempts.snapshot()
			if len(timedOut) != 0 || runtime.Close() == nil {
				t.Fatal("timeout replaced original Close/settlement join", timedOut)
			}
			unblock()
			waitSignal(t, runtime.Done())
			_, after, _, _ := attempts.snapshot()
			if physical.Load() != 1 || raw.closes.Load() != 1 || len(after) != 1 || after[0].Knowledge != "unknown" || !after[0].ProducerEnded {
				t.Fatal("hidden original body not joined", physical.Load(), raw.closes.Load(), after)
			}
		})
	}
}

func TestSharedHTTPLocalSettlementRetryRemainsInDone(t *testing.T) {
	body := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
	var physical atomic.Int32
	runtime := helperRuntime(t, helperLimits(), transportFunc(func(*http.Request) (*http.Response, error) { physical.Add(1); return helperResponse(body, 200), nil }))
	attempts := &recordingAttempts{}
	attempts.failSettle.Store(true)
	defer attempts.failSettle.Store(false)
	target := "http://sdk.fixture.invalid/v1/responses"
	call := helperCall(t, runtime, target, attempts, func(httpcall.SSEEvent) error { return nil })
	stream := helperStream(call, target)
	for stream.Next() {
	}
	if err := call.Finish(stream.Close, helperKnown); err == nil {
		t.Fatal("local Settle failure hidden")
	}
	runtime.Stop()
	select {
	case <-runtime.Done():
		t.Fatal("unsettled original attempt released by Stop")
	default:
	}
	_, before, _, _ := attempts.snapshot()
	if len(before) != 0 || runtime.PendingSettlements() != 1 || physical.Load() != 1 || body.closes.Load() != 1 {
		t.Fatal("retry owns wrong resource", before, runtime.PendingSettlements(), physical.Load(), body.closes.Load())
	}
	attempts.failSettle.Store(false)
	waitSignal(t, runtime.Done())
	_, after, _, _ := attempts.snapshot()
	if len(after) != 1 || !after[0].ProducerEnded || after[0].Knowledge != "known" || physical.Load() != 1 || runtime.PendingSettlements() != 0 {
		t.Fatal("local retry changed HTTP/observation", after, physical.Load())
	}
}

func TestSharedHTTPAdmissionAndHiddenRetryNeverAddARequest(t *testing.T) {
	for _, kind := range []string{"reserve", "dispatch", "retry"} {
		t.Run(kind, func(t *testing.T) {
			var physical atomic.Int32
			body := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
			runtime := helperRuntime(t, helperLimits(), transportFunc(func(*http.Request) (*http.Response, error) { physical.Add(1); return helperResponse(body, 200), nil }))
			attempts := &recordingAttempts{}
			if kind == "reserve" {
				attempts.reserveErr = api.Denied("MODEL_BUDGET_EXHAUSTED")
			}
			if kind == "dispatch" {
				attempts.dispatchErr = api.Denied("SERVICE_STOPPING")
			}
			target := "http://sdk.fixture.invalid/v1/responses"
			call := helperCall(t, runtime, target, attempts, func(httpcall.SSEEvent) error { return nil })
			stream := helperStream(call, target)
			for stream.Next() {
			}
			if kind == "retry" {
				req, err := http.NewRequestWithContext(call.Context(), http.MethodPost, target, strings.NewReader(`{}`))
				if err != nil {
					t.Fatal(err)
				}
				if _, err = call.Client().Do(req); err == nil {
					t.Fatal("hidden second send allowed")
				}
			} else if call.AdmissionError() == nil || stream.Err() == nil {
				t.Fatal("real admission fault lost", call.AdmissionError(), stream.Err())
			}
			_ = call.Finish(stream.Close, func() api.AttemptObservation { return api.AttemptObservation{Knowledge: "unknown"} })
			requests, observations, dispatches, aborts := attempts.snapshot()
			switch kind {
			case "reserve":
				if physical.Load() != 0 || len(requests) != 0 || len(observations) != 0 || dispatches != 0 || aborts != 0 {
					t.Fatal("Reserve denial sent/charged", physical.Load(), requests, observations, dispatches, aborts)
				}
			case "dispatch":
				if physical.Load() != 0 || len(requests) != 1 || len(observations) != 0 || dispatches != 1 || aborts != 1 {
					t.Fatal("Dispatch denial not aborted unsent", physical.Load(), requests, observations, dispatches, aborts)
				}
			case "retry":
				if physical.Load() != 1 || len(requests) != 1 || len(observations) != 1 || dispatches != 1 {
					t.Fatal("hidden retry created request", physical.Load(), requests, observations, dispatches)
				}
			}
		})
	}
}

func TestSharedHTTPProbeGETIsBoundedAndCannotGenerate(t *testing.T) {
	for _, kind := range []string{"normal", "post", "size"} {
		t.Run(kind, func(t *testing.T) {
			var physical atomic.Int32
			data := `{"id":"fixture-model"}`
			if kind == "size" {
				data = strings.Repeat("x", (64<<10)+1)
			}
			body := &steppedBody{chunks: [][]byte{[]byte(data)}}
			runtime := helperRuntime(t, helperLimits(), transportFunc(func(req *http.Request) (*http.Response, error) {
				physical.Add(1)
				if req.Method != http.MethodGet {
					t.Error("Probe sent generation")
				}
				res := helperResponse(body, 200)
				res.Header.Set("Content-Type", "application/json")
				return res, nil
			}))
			target := "http://sdk.fixture.invalid/v1/models/fixture-model"
			call, err := runtime.BeginProbe(context.Background(), target)
			if err != nil {
				t.Fatal(err)
			}
			method := http.MethodGet
			if kind == "post" {
				method = http.MethodPost
			}
			req, err := http.NewRequestWithContext(call.Context(), method, target, nil)
			if err != nil {
				t.Fatal(err)
			}
			res, sendErr := call.Client().Do(req)
			var readErr error
			if res != nil {
				_, readErr = io.ReadAll(res.Body)
			}
			cleanup := call.Finish(func() error {
				if res != nil {
					return res.Body.Close()
				}
				return nil
			})
			switch kind {
			case "post":
				if sendErr == nil || physical.Load() != 0 {
					t.Fatal("Probe bypassed generation ledger", sendErr, physical.Load())
				}
			case "size":
				if readErr == nil || cleanup == nil || physical.Load() != 1 || body.closes.Load() != 1 {
					t.Fatal("Probe body unbounded", readErr, cleanup, physical.Load(), body.closes.Load())
				}
			case "normal":
				if sendErr != nil || readErr != nil || cleanup != nil || physical.Load() != 1 || body.closes.Load() != 1 {
					t.Fatal("metadata GET", sendErr, readErr, cleanup, physical.Load(), body.closes.Load())
				}
			}
		})
	}
}

func TestSharedHTTPPanicPathsStillCloseAndSettleUnknown(t *testing.T) {
	for _, kind := range []string{"observer", "end_sdk"} {
		t.Run(kind, func(t *testing.T) {
			body := &steppedBody{chunks: [][]byte{[]byte(helperSSE())}}
			runtime := helperRuntime(t, helperLimits(), transportFunc(func(*http.Request) (*http.Response, error) { return helperResponse(body, 200), nil }))
			attempts := &recordingAttempts{}
			target := "http://sdk.fixture.invalid/v1/responses"
			call := helperCall(t, runtime, target, attempts, func(httpcall.SSEEvent) error {
				if kind == "observer" {
					panic("SYNTHETIC_PRIVATE_CALLBACK_PANIC")
				}
				return nil
			})
			stream := helperStream(call, target)
			for stream.Next() {
			}
			end := stream.Close
			if kind == "end_sdk" {
				end = func() error { panic("SYNTHETIC_PRIVATE_END_PANIC") }
			}
			err := call.Finish(end, helperKnown)
			_, observations, _, _ := attempts.snapshot()
			if err == nil || strings.Contains(err.Error(), "SYNTHETIC_PRIVATE") || body.closes.Load() != 1 || len(observations) != 1 || observations[0].Knowledge != "unknown" || !observations[0].ProducerEnded {
				t.Fatal("panic path escaped cleanup", err, body.closes.Load(), observations)
			}
		})
	}
}
