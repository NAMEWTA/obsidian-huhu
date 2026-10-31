// Package chat implements the fixed Chat Completions SDK bridge.
package chat

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	ext "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
	fork "github.com/meguminnnnnnnnn/go-openai"
)

type Driver struct {
	transport   http.RoundTripper
	mu          sync.Mutex
	stopping    bool
	next        uint64
	active      map[uint64]context.CancelFunc
	wg          sync.WaitGroup
	done        chan struct{}
	settlements map[string]*requestState
	settling    bool
	settleWake  chan struct{}
}

func NewDriver() *Driver {
	return NewDriverWithTransport(&http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12}, MaxIdleConns: 16, MaxIdleConnsPerHost: 4, IdleConnTimeout: 30 * time.Second})
}

// NewDriverWithTransport permits isolated HTTP lifecycle tests. The production
// constructor above owns its transport and installs no redirects or retries.
func NewDriverWithTransport(transport http.RoundTripper) *Driver {
	return &Driver{transport: transport, active: map[uint64]context.CancelFunc{}, done: make(chan struct{}), settlements: map[string]*requestState{}, settleWake: make(chan struct{}, 1)}
}
func (*Driver) SupportsProtocol(protocol string) bool { return protocol == common.ChatProtocol }
func (d *Driver) begin(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc, func(), error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.stopping {
		return nil, nil, nil, api.Denied("SERVICE_STOPPING")
	}
	ctx, cancel := context.WithTimeout(parent, timeout)
	d.next++
	id := d.next
	d.active[id] = cancel
	d.wg.Add(1)
	return ctx, cancel, func() { cancel(); d.mu.Lock(); delete(d.active, id); d.mu.Unlock(); d.wg.Done() }, nil
}
func (d *Driver) Stop() {
	d.mu.Lock()
	if d.stopping {
		d.mu.Unlock()
		return
	}
	d.stopping = true
	for _, cancel := range d.active {
		cancel()
	}
	d.mu.Unlock()
	go func() { d.wg.Wait(); close(d.done) }()
}
func (d *Driver) Done() <-chan struct{} { return d.done }
func (d *Driver) Close() error {
	select {
	case <-d.done:
	default:
		return common.Fault("MODEL_PRODUCER_NOT_ENDED")
	}
	if c, ok := d.transport.(interface{ CloseIdleConnections() }); ok {
		c.CloseIdleConnections()
	}
	return nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// No callback handlers or run values cross into this standalone SDK call. The
// lifecycle proof requires the un-copied WithConvert chain and no SDK globals.
type sdkContext struct{ context.Context }

func (sdkContext) Value(any) any { return nil }

func validModel(m api.ModelBindingDraft, secret []byte) error {
	u, err := url.Parse(m.Endpoint)
	if m.Protocol != common.ChatProtocol {
		return common.Fault("PROTOCOL_NOT_ASSEMBLED")
	}
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.Fragment != "" || u.RawQuery != "" || m.ModelID == "" || m.ProviderID == "" || len(secret) == 0 {
		return common.Fault("MODEL_DRAFT_INCOMPLETE")
	}
	return nil
}

func (*Driver) Identity() common.ProtocolIdentity {
	return common.ProtocolIdentity{Protocol: common.ChatProtocol, EngineVersion: common.EngineVersion}
}
func (*Driver) ValidateState(ctx context.Context, _ common.StateView, state []byte) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if len(state) != 0 {
		return common.Fault("CHECKPOINT_INVALID")
	}
	return nil
}
func (d *Driver) Generate(ctx context.Context, g common.Generation) (common.TurnResult, error) {
	message, err := d.generate(ctx, g.Model, g.View.Messages, g.Tools, g.Credential, g.Attempts, g.LogicalCallID, g.EmitText)
	return common.TurnResult{Message: message}, err
}

func (d *Driver) generate(parent context.Context, m api.ModelBindingDraft, messages []*schema.Message, tools []*schema.ToolInfo, secret []byte, attempts api.ModelAttempts, logical string, sink func(string) error) (*schema.Message, error) {
	if err := validModel(m, secret); err != nil {
		return nil, err
	}
	if attempts == nil {
		return nil, common.Fault("MODEL_ATTEMPTS_REQUIRED")
	}
	ctx, cancel, finish, err := d.begin(parent, common.RequestTimeout)
	if err != nil {
		return nil, err
	}
	defer finish()
	state := &requestState{attempts: attempts, logical: logical, cancel: cancel}
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) { return state.send(req, d.transport, m) }), CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	bound := common.MaxOutputTokens
	model, err := ext.NewChatModel(sdkContext{ctx}, &ext.ChatModelConfig{APIKey: string(secret), BaseURL: m.Endpoint, Model: m.ModelID, HTTPClient: client, MaxCompletionTokens: &bound})
	if err != nil {
		return nil, common.Fault("MODEL_CONFIG_INVALID")
	}
	var stream *schema.StreamReader[*schema.Message]
	if len(tools) > 0 {
		toolModel, e := model.WithTools(tools)
		if e != nil {
			return nil, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		stream, err = toolModel.Stream(sdkContext{ctx}, messages)
	} else {
		stream, err = model.Stream(sdkContext{ctx}, messages)
	}
	var chunks []*schema.Message
	firstErr := err
	// The fixed fork's sendRequestStream error-status path reads the body
	// synchronously but does not close it (client.go:182-194). No producer was
	// started by ACL in this path, so this caller must finish that real Close.
	if err != nil && state.body != nil {
		_ = state.body.Close()
	}
	if err == nil {
		// Fixed ACL chat_model.go (SHA 403786db...) closes its writer as the
		// final defer action, after stream.Close and a possible panic error.
		// Only this exact channel-close EOF acknowledges producer cleanup.
		// Cancellation/errors still drain it; reader.Close cannot supply ACK.
		for {
			chunk, recvErr := stream.Recv()
			if recvErr == io.EOF {
				break
			}
			if recvErr != nil {
				if firstErr == nil {
					firstErr = recvErr
				}
				cancel()
				continue
			}
			if chunk == nil {
				continue
			}
			if ctx.Err() != nil {
				if firstErr == nil {
					firstErr = ctx.Err()
				}
				cancel()
				continue
			}
			chunks = append(chunks, chunk)
			if chunk.Content != "" && firstErr == nil && sink != nil {
				if sendErr := sendDelta(sink, chunk.Content); sendErr != nil {
					firstErr = sendErr
					cancel()
				}
			}
		}
		stream.Close()
	}
	if state.body != nil {
		<-state.body.closed
	}
	if settleErr := state.settle(); settleErr != nil {
		d.retainSettlement(state)
		return nil, common.Fault("MODEL_SETTLEMENT_FAILED")
	}
	if firstErr != nil {
		if state.admissionErr != nil {
			return nil, state.admissionErr
		}
		if state.body != nil && state.body.problem != "" {
			return nil, common.Fault(state.body.problem)
		}
		if f, ok := firstErr.(*api.Fault); ok && common.SafeReason(f.Reason) {
			return nil, f
		}
		return nil, common.Fault("MODEL_STREAM_FAILED")
	}
	if state.httpStatus < 200 || state.httpStatus >= 300 {
		return nil, common.Fault("MODEL_STREAM_FAILED")
	}
	if ctx.Err() != nil {
		return nil, common.Fault("MODEL_CANCELED")
	}
	if state.body == nil || state.body.problem != "" || !state.body.done || state.body.finish == "" {
		return nil, common.Fault("MODEL_STREAM_INCOMPLETE")
	}
	message, err := schema.ConcatMessages(chunks)
	if err != nil || message == nil {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	if state.body.finish != "stop" && state.body.finish != "tool_calls" {
		reason := "MODEL_FINISH_UNKNOWN"
		switch state.body.finish {
		case "length":
			reason = "MODEL_OUTPUT_TRUNCATED"
		case "content_filter":
			reason = "MODEL_CONTENT_FILTERED"
		}
		return nil, common.Fault(reason)
	}
	if state.body.refusal {
		return nil, common.Fault("MODEL_REFUSED")
	}
	if len(message.Content) > common.MaxTextBytes {
		return nil, common.Fault("MODEL_TEXT_LIMIT")
	}
	if (state.body.finish == "tool_calls") != (len(message.ToolCalls) > 0) {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	return message, nil
}

// At most one local worker retains failed settlements. It owns no HTTP and
// cannot reopen admission. Its wait-group hold outlives Stop and is released
// only when each original immutable observation commits to the real ledger.
func (d *Driver) retainSettlement(s *requestState) {
	d.mu.Lock()
	d.settlements[s.reservation.ID] = s
	if !d.settling {
		d.settling = true
		d.wg.Add(1)
		go d.retrySettlements()
	}
	d.mu.Unlock()
	select {
	case d.settleWake <- struct{}{}:
	default:
	}
}

func (d *Driver) PendingSettlements() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.settlements)
}

func (d *Driver) retrySettlements() {
	defer d.wg.Done()
	for {
		d.mu.Lock()
		if len(d.settlements) == 0 {
			d.settling = false
			d.mu.Unlock()
			return
		}
		pending := make([]*requestState, 0, len(d.settlements))
		for _, s := range d.settlements {
			pending = append(pending, s)
		}
		d.mu.Unlock()
		for _, s := range pending {
			ctx, cancel := context.WithTimeout(context.Background(), common.CleanupTimeout)
			_, err := s.attempts.Settle(ctx, s.reservation, s.observation())
			cancel()
			if err == nil {
				d.mu.Lock()
				delete(d.settlements, s.reservation.ID)
				d.mu.Unlock()
			}
		}
		select {
		case <-d.settleWake:
		case <-time.After(250 * time.Millisecond):
		}
	}
}

func sendDelta(sink func(string) error, text string) (err error) {
	defer func() {
		if recover() != nil {
			err = common.Fault("MODEL_STREAM_FAILED")
		}
	}()
	return sink(text)
}

type requestState struct {
	attempts     api.ModelAttempts
	logical      string
	reservation  api.AttemptReservation
	dispatched   bool
	sent         bool
	cancel       context.CancelFunc
	body         *observedBody
	admissionErr error
	httpStatus   int
}

func (s *requestState) send(req *http.Request, transport http.RoundTripper, m api.ModelBindingDraft) (*http.Response, error) {
	if s.sent {
		return nil, common.Fault("MODEL_HIDDEN_RETRY")
	}
	s.sent = true
	if req.Method != http.MethodPost || req.URL.String() != strings.TrimRight(m.Endpoint, "/")+"/chat/completions" {
		return nil, common.Fault("MODEL_DESTINATION_CHANGED")
	}
	body, err := io.ReadAll(io.LimitReader(req.Body, common.MaxRequestBytes+1))
	_ = req.Body.Close()
	if err != nil || len(body) > common.MaxRequestBytes {
		return nil, common.Fault("MODEL_REQUEST_LIMIT")
	}
	var wire map[string]json.RawMessage
	if json.Unmarshal(body, &wire) != nil {
		return nil, common.Fault("MODEL_REQUEST_INVALID")
	}
	wire["n"] = json.RawMessage("1")
	body, err = json.Marshal(wire)
	if err != nil || len(body) > common.MaxRequestBytes {
		return nil, common.Fault("MODEL_REQUEST_LIMIT")
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.GetBody = nil
	s.reservation, err = s.attempts.Reserve(req.Context(), api.AttemptRequest{LogicalCallID: s.logical, InputEstimate: strconv.Itoa(len(body)), OutputBound: strconv.Itoa(common.MaxOutputTokens)})
	if err != nil {
		if f, ok := err.(*api.Fault); ok && common.SafeReason(f.Reason) {
			s.admissionErr = f
		}
		return nil, err
	}
	var response *http.Response
	err = s.attempts.Dispatch(req.Context(), s.reservation, func(c context.Context) error {
		s.dispatched = true
		var e error
		response, e = transport.RoundTrip(req.WithContext(c))
		return e
	})
	if !s.dispatched && err != nil {
		if f, ok := err.(*api.Fault); ok && common.SafeReason(f.Reason) {
			s.admissionErr = f
		}
	}
	if !s.dispatched {
		clean, cancel := context.WithTimeout(context.Background(), common.CleanupTimeout)
		defer cancel()
		if abortErr := s.attempts.AbortUnsent(clean, s.reservation); abortErr != nil {
			return nil, abortErr
		}
	}
	if response != nil && response.Body != nil {
		s.httpStatus = response.StatusCode
		s.body = newObservedBody(response.Body, s.cancel)
		response.Body = s.body
	}
	return response, err
}

func (s *requestState) settle() error {
	if !s.dispatched {
		return nil
	}
	o := s.observation()
	ctx, cancel := context.WithTimeout(context.Background(), common.CleanupTimeout)
	defer cancel()
	delay := 25 * time.Millisecond
	for {
		_, err := s.attempts.Settle(ctx, s.reservation, o)
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return err
		case <-time.After(delay):
		}
		if delay < 250*time.Millisecond {
			delay *= 2
			if delay > 250*time.Millisecond {
				delay = 250 * time.Millisecond
			}
		}
	}
}

func (s *requestState) observation() api.AttemptObservation {
	o := api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}
	if s.body != nil {
		o = s.body.observation()
		o.ProducerEnded = true
	}
	return o
}

func (d *Driver) Probe(parent context.Context, m api.ModelBindingDraft, secret []byte) ([]string, error) {
	if err := validModel(m, secret); err != nil {
		return nil, err
	}
	if strings.ContainsAny(m.ModelID, "/\\?#%") || m.ModelID == "." || m.ModelID == ".." {
		return nil, common.Fault("MODEL_ID_INVALID")
	}
	ctx, _, finish, err := d.begin(parent, 10*time.Second)
	if err != nil {
		return nil, err
	}
	defer finish()
	transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.Method != http.MethodGet || req.URL.String() != strings.TrimRight(m.Endpoint, "/")+"/models/"+url.PathEscape(m.ModelID) {
			return nil, common.Fault("MODEL_DESTINATION_CHANGED")
		}
		response, e := d.transport.RoundTrip(req)
		if response != nil && response.Body != nil {
			response.Body = &limitedBody{ReadCloser: response.Body, remaining: 64 << 10}
		}
		return response, e
	})
	config := fork.DefaultConfig(string(secret))
	config.BaseURL = m.Endpoint
	config.HTTPClient = &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	model, err := fork.NewClientWithConfig(config).GetModel(ctx, m.ModelID)
	if err != nil || model.ID != m.ModelID {
		return nil, common.Fault("MODEL_PROBE_FAILED")
	}
	return []string{}, nil
}

type limitedBody struct {
	io.ReadCloser
	remaining int64
}

func (b *limitedBody) Read(p []byte) (int, error) {
	if b.remaining < 0 {
		return 0, errors.New("response size limit")
	}
	if int64(len(p)) > b.remaining+1 {
		p = p[:b.remaining+1]
	}
	n, err := b.ReadCloser.Read(p)
	b.remaining -= int64(n)
	if b.remaining < 0 {
		return n, errors.New("response size limit")
	}
	return n, err
}

var _ common.Driver = (*Driver)(nil)
var _ api.ModelProbePort = (*Driver)(nil)
