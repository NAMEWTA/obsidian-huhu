// Package httpcall owns bounded HTTP admission, raw bodies and local settlement.
// Protocol parsing and the SDK-specific proof of producer completion stay with
// the driver. This package has no SDK or common adapter dependency.
package httpcall

import (
	"context"
	"crypto/tls"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Limits struct {
	RequestBytes, ResponseBytes, LineBytes, EventBytes int
	RequestTimeout, IdleTimeout, CleanupTimeout        time.Duration
}

// SSEEvent contains the original event label and joined data lines. Data is
// borrowed for the synchronous callback; retained protocol state must copy it.
type SSEEvent struct {
	Event string
	Data  []byte
}

type RequestSpec struct {
	URL           string
	Attempts      api.ModelAttempts
	LogicalCallID string
	OutputBound   int
	ValidateBody  func([]byte) error
	ObserveEvent  func(SSEEvent) error
}

type Runtime struct {
	limits    Limits
	transport http.RoundTripper
	mu        sync.Mutex
	stopping  bool
	next      uint64
	active    map[uint64]*callState
	wg        sync.WaitGroup
	done      chan struct{}
	pending   map[uint64]*callState
	worker    bool
	wake      chan struct{}
}

func fault(reason string) error { return &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: reason} }

func NewRuntime(limits Limits) (*Runtime, error) {
	return NewRuntimeWithTransport(limits, &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12}, MaxIdleConns: 16, MaxIdleConnsPerHost: 4, IdleConnTimeout: 30 * time.Second})
}

func NewRuntimeWithTransport(limits Limits, transport http.RoundTripper) (*Runtime, error) {
	if transport == nil || limits.RequestBytes < 1 || limits.RequestBytes > 1<<20 || limits.ResponseBytes < 1 || limits.ResponseBytes > 4<<20 || limits.LineBytes < 1 || limits.LineBytes > 256<<10 || limits.EventBytes < 1 || limits.EventBytes > 512<<10 || limits.RequestTimeout <= 0 || limits.RequestTimeout > 45*time.Second || limits.IdleTimeout <= 0 || limits.IdleTimeout > 15*time.Second || limits.CleanupTimeout <= 0 || limits.CleanupTimeout > 3*time.Second {
		return nil, fault("MODEL_CONFIG_INVALID")
	}
	return &Runtime{limits: limits, transport: transport, active: map[uint64]*callState{}, done: make(chan struct{}), pending: map[uint64]*callState{}, wake: make(chan struct{}, 1)}, nil
}

type callState struct {
	runtime      *Runtime
	id           uint64
	ctx          context.Context
	cancel       context.CancelFunc
	spec         RequestSpec
	probe        bool
	limits       Limits
	mu           sync.Mutex
	sent         bool
	dispatched   bool
	reservation  api.AttemptReservation
	admissionErr error
	body         *observedBody
	watchDone    chan struct{}
	status       int
	finishOnce   sync.Once
	finished     chan struct{}
	finishErr    error
	observation  api.AttemptObservation
	released     sync.Once
}

type Call struct{ state *callState }
type ProbeCall struct{ state *callState }

func validURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && u.Host != "" && (u.Scheme == "https" || u.Scheme == "http") && u.User == nil && u.Fragment == "" && u.RawQuery == ""
}

func (r *Runtime) begin(parent context.Context, spec RequestSpec, probe bool) (*callState, error) {
	if !validURL(spec.URL) || (!probe && (spec.Attempts == nil || spec.LogicalCallID == "" || spec.OutputBound != 4096 || spec.ValidateBody == nil || spec.ObserveEvent == nil)) {
		return nil, fault("MODEL_CONFIG_INVALID")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.stopping {
		return nil, api.Denied("SERVICE_STOPPING")
	}
	limits := r.limits
	if probe {
		limits.RequestTimeout, limits.ResponseBytes = 10*time.Second, 64<<10
	}
	ctx, cancel := context.WithTimeout(parent, limits.RequestTimeout)
	r.next++
	s := &callState{runtime: r, id: r.next, ctx: ctx, cancel: cancel, spec: spec, probe: probe, limits: limits, finished: make(chan struct{})}
	r.active[s.id] = s
	r.wg.Add(1)
	return s, nil
}
func (r *Runtime) BeginGeneration(ctx context.Context, spec RequestSpec) (*Call, error) {
	s, err := r.begin(ctx, spec, false)
	if err != nil {
		return nil, err
	}
	return &Call{state: s}, nil
}
func (r *Runtime) BeginProbe(ctx context.Context, target string) (*ProbeCall, error) {
	s, err := r.begin(ctx, RequestSpec{URL: target}, true)
	if err != nil {
		return nil, err
	}
	return &ProbeCall{state: s}, nil
}
func (c *Call) Context() context.Context      { return c.state.ctx }
func (c *ProbeCall) Context() context.Context { return c.state.ctx }
func (c *Call) Cancel()                       { c.state.cancel() }
func (c *ProbeCall) Cancel()                  { c.state.cancel() }
func (c *Call) Client() *http.Client          { return c.state.client() }
func (c *ProbeCall) Client() *http.Client     { return c.state.client() }
func (c *Call) AdmissionError() error {
	c.state.mu.Lock()
	defer c.state.mu.Unlock()
	return c.state.admissionErr
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }
func (s *callState) client() *http.Client {
	return &http.Client{Transport: roundTripFunc(s.send), CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

func (r *Runtime) Stop() {
	r.mu.Lock()
	if r.stopping {
		r.mu.Unlock()
		return
	}
	r.stopping = true
	active := make([]*callState, 0, len(r.active))
	for _, s := range r.active {
		active = append(active, s)
	}
	r.mu.Unlock()
	for _, s := range active {
		s.cancel()
	}
	go func() { r.wg.Wait(); close(r.done) }()
}
func (r *Runtime) Done() <-chan struct{} { return r.done }
func (r *Runtime) Close() error {
	select {
	case <-r.done:
	default:
		return fault("MODEL_PRODUCER_NOT_ENDED")
	}
	if closer, ok := r.transport.(interface{ CloseIdleConnections() }); ok {
		closer.CloseIdleConnections()
	}
	return nil
}
func (r *Runtime) PendingSettlements() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.pending)
}
func (s *callState) release() {
	s.released.Do(func() {
		s.cancel()
		s.runtime.mu.Lock()
		delete(s.runtime.active, s.id)
		delete(s.runtime.pending, s.id)
		s.runtime.mu.Unlock()
		s.runtime.wg.Done()
	})
}

func (c *Call) Finish(endSDK func() error, observation func() api.AttemptObservation) error {
	return c.state.finish(endSDK, observation)
}
func (c *ProbeCall) Finish(endSDK func() error) error {
	return c.state.finish(endSDK, nil)
}
func (s *callState) finish(endSDK func() error, observation func() api.AttemptObservation) error {
	// Invalid callers cannot consume the sole cleanup owner or manufacture a
	// producer-ended observation. A later valid owner must still be able to join.
	if endSDK == nil {
		return fault("MODEL_CONFIG_INVALID")
	}
	s.finishOnce.Do(func() {
		s.cancel()
		go s.cleanup(endSDK, observation)
	})
	timer := time.NewTimer(s.limits.CleanupTimeout)
	defer timer.Stop()
	select {
	case <-s.finished:
		return s.finishErr
	case <-timer.C:
		return fault("MODEL_STREAM_FAILED")
	}
}

// An endSDK panic is a failure, but never skips original body closure/join.
func endSafely(endSDK func() error) (err error) {
	defer func() {
		if recover() != nil {
			err = fault("MODEL_STREAM_FAILED")
		}
	}()
	if endSDK == nil {
		return fault("MODEL_STREAM_FAILED")
	}
	if endSDK() != nil {
		return fault("MODEL_STREAM_FAILED")
	}
	return nil
}
func observationSafely(observe func() api.AttemptObservation) (o api.AttemptObservation) {
	o.Knowledge = "unknown"
	defer func() {
		if recover() != nil {
			o = api.AttemptObservation{Knowledge: "unknown"}
		}
	}()
	if observe != nil {
		return observe()
	}
	return o
}
func (s *callState) cleanup(endSDK func() error, observe func() api.AttemptObservation) {
	err := endSafely(endSDK)
	s.mu.Lock()
	body, watchDone, status := s.body, s.watchDone, s.status
	s.mu.Unlock()
	if body != nil {
		if closeErr := body.Close(); closeErr != nil && err == nil {
			err = fault("MODEL_STREAM_FAILED")
		}
		<-body.closed
		<-watchDone
		if body.readErr != nil && body.readErr != io.EOF {
			err = fault("MODEL_STREAM_FAILED")
		}
		if body.problem != "" {
			err = fault(body.problem)
		}
	}
	o := observationSafely(observe)
	if err != nil || body == nil || status < 200 || status >= 300 {
		o = api.AttemptObservation{Knowledge: "unknown"}
	}
	o.ProducerEnded = true
	s.observation = o
	settleErr := s.commit()
	if settleErr != nil {
		s.runtime.retain(s)
		if err == nil {
			err = fault("MODEL_SETTLEMENT_FAILED")
		}
	}
	s.finishErr = err
	close(s.finished)
	// This is the cleanup task's final acknowledgment. A retry worker also
	// waits for finished before releasing its retained Call lifetime.
	if settleErr == nil {
		s.release()
	}
}
