// Package stdio implements duplex HAP with independent response correlation.
package stdio

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"reflect"
	"sync"
	"sync/atomic"
	"time"

	inbound "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	portabledomain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

const MaxInFlight = 32
const RemoteTimeout = 30 * time.Second

// All response paths share this one writer budget, including pre-hello errors.
const WriteTimeout = time.Second
const MaxQueuedFrames = 32
const MaxQueuedBytes = 2 * (wire.MaxFrameBytes + 4)

type writeJob struct {
	frame   []byte
	done    chan error
	replies []inbound.Response
	batch   bool
}

type reply struct {
	env wire.Envelope
	err error
}
type lateCall struct {
	method, fingerprint string
	expires             time.Time
}
type Server struct {
	abandoned    map[string]lateCall
	input        io.ReadCloser
	output       io.WriteCloser
	router       *inbound.Router
	writeMu      sync.Mutex
	writeQueue   chan writeJob
	queuedBytes  int
	queuedFrames int
	pendingMu    sync.Mutex
	pending      map[string]chan reply
	activeMu     sync.Mutex
	active       map[string]bool
	closed       chan struct{}
	once         sync.Once
	workers      sync.WaitGroup
	inflight     atomic.Int32 // dispatched workers whose reply is not yet written
	slots        chan struct{}
	initErr      error
}

func New(input io.ReadCloser, output io.WriteCloser, app *api.Facade, id api.RequestIdentity) *Server {
	return newWithRouter(input, output, inbound.New(app, id))
}

// NewOwner is the local stdio user-command entrance for both ordinary and
// managed connections. The owner port is never derived from request JSON.
func NewOwner(input io.ReadCloser, output io.WriteCloser, app *api.Facade, id api.RequestIdentity, owner api.GlobalMemoryAPI) *Server {
	return newWithRouter(input, output, inbound.NewOwner(app, id, owner))
}

// NewOwnerWithPortable is the managed local entrance with the concrete
// profile/artifact interchange service. The capability is assembled by Core,
// never selected from request payloads.
func NewOwnerWithPortable(input io.ReadCloser, output io.WriteCloser, app *api.Facade, id api.RequestIdentity, owner api.GlobalMemoryAPI, portable portabledomain.API) *Server {
	return newWithRouter(input, output, inbound.NewOwnerWithPortable(app, id, owner, portable))
}

func newWithRouter(input io.ReadCloser, output io.WriteCloser, router *inbound.Router) *Server {
	s := &Server{input: input, output: output, router: router, pending: make(map[string]chan reply), abandoned: make(map[string]lateCall), active: make(map[string]bool), closed: make(chan struct{}), slots: make(chan struct{}, MaxInFlight), writeQueue: make(chan writeJob, MaxQueuedFrames)}
	prepared, e := prepareOutput(output)
	if e != nil {
		s.initErr = e
	} else {
		s.output = prepared
	}
	go s.writer()
	return s
}
func (s *Server) Close() {
	s.once.Do(func() {
		close(s.closed)
		// Inherited non-pollable OS pipes may block even Close behind an active
		// syscall. Lifecycle never waits on that descriptor; process exit closes
		// the kernel handles, while normal pollable transports close immediately.
		go func() { _ = s.input.Close() }()
		go func() { _ = s.output.Close() }()
		s.router.App.Host.Disconnect(s.router.Identity)
		s.pendingMu.Lock()
		for id, c := range s.pending {
			delete(s.pending, id)
			c <- reply{err: io.EOF}
		}
		s.abandoned = make(map[string]lateCall)
		s.pendingMu.Unlock()
	})
}
func (s *Server) write(p any) error {
	var encoded bytes.Buffer
	if err := wire.WriteFrame(&encoded, p); err != nil {
		return err
	}
	job := writeJob{frame: encoded.Bytes(), done: make(chan error, 1)}
	switch v := p.(type) {
	case inbound.Response:
		job.replies = []inbound.Response{v}
	case []inbound.Response:
		job.replies = v
		job.batch = true
	}
	s.writeMu.Lock()
	select {
	case <-s.closed:
		s.writeMu.Unlock()
		return io.EOF
	default:
	}
	if s.queuedBytes+len(job.frame) > MaxQueuedBytes || s.queuedFrames >= MaxQueuedFrames {
		s.writeMu.Unlock()
		s.Close()
		return &wire.ProtocolError{Reason: "STREAM_SLOW_CONSUMER"}
	}
	select {
	case s.writeQueue <- job:
		s.queuedBytes += len(job.frame)
		s.queuedFrames++
		s.writeMu.Unlock()
	default:
		s.writeMu.Unlock()
		s.Close()
		return &wire.ProtocolError{Reason: "STREAM_SLOW_CONSUMER"}
	}
	timer := time.NewTimer(WriteTimeout)
	defer timer.Stop()
	select {
	case err := <-job.done:
		return err
	case <-s.closed:
		return io.EOF
	case <-timer.C:
		s.Close()
		return &wire.ProtocolError{Reason: "STREAM_SLOW_CONSUMER"}
	}
}
func (s *Server) writer() {
	for {
		var job writeJob
		select {
		case <-s.closed:
			return
		case job = <-s.writeQueue:
		}
		select {
		case <-s.closed:
			return
		default:
		}
		err := s.deliver(job)
		s.writeMu.Lock()
		s.queuedBytes -= len(job.frame)
		s.queuedFrames--
		s.writeMu.Unlock()
		job.done <- err
		if err != nil {
			s.Close()
			return
		}
	}
}

// writePhysical returns only after the underlying write has stopped.
func (s *Server) writePhysical(ctx context.Context, frame []byte, protected bool) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if writer, ok := s.output.(interface {
		WriteContext(context.Context, []byte) (int, error)
	}); ok {
		n, e := writer.WriteContext(ctx, frame)
		if e == nil && n != len(frame) {
			return io.ErrShortWrite
		}
		return e
	}
	if writer, ok := s.output.(interface{ SetWriteDeadline(time.Time) error }); ok {
		deadline, _ := ctx.Deadline()
		if e := writer.SetWriteDeadline(deadline); e == nil {
			deadlineDone := make(chan struct{})
			stop := context.AfterFunc(ctx, func() { defer close(deadlineDone); _ = writer.SetWriteDeadline(time.Now()) })
			n, e := s.output.Write(frame)
			if !stop() {
				<-deadlineDone
			}
			_ = writer.SetWriteDeadline(time.Time{})
			if ctx.Err() != nil {
				return ctx.Err()
			}
			if e == nil && n != len(frame) {
				return io.ErrShortWrite
			}
			return e
		}
	}
	if protected {
		return api.Denied("DELIVERY_TRANSPORT_UNSUPPORTED")
	}
	_, e := io.Copy(s.output, bytes.NewReader(frame))
	return e
}
func (s *Server) deliver(job writeJob) error {
	ctx, cancel := context.WithTimeout(context.Background(), WriteTimeout)
	defer cancel()
	subjects, mergeErr := mergeDeliverySubjects(job.replies)
	if len(subjects) == 0 && mergeErr == nil {
		return s.writePhysical(ctx, job.frame, false)
	}
	if s.router.App.Events == nil {
		return api.Denied("DELIVERY_NOT_ASSEMBLED")
	}
	wrote := false
	err := mergeErr
	if err == nil {
		err = s.router.App.Events.WithDelivery(ctx, s.router.Identity, subjects, func(permit context.Context) error { wrote = true; return s.writePhysical(permit, job.frame, true) })
	}
	if err == nil || wrote {
		return err
	} // A partial frame requires connection close, never a replacement frame.
	// Revocation while queued discards every sensitive batch item before encoding.
	safe := append([]inbound.Response(nil), job.replies...)
	for i, r := range safe {
		if len(r.DeliverySubjects) > 0 {
			safe[i] = inbound.FromError(r.ID, err)
		}
	}
	var payload any = safe[0]
	if job.batch {
		payload = safe
	}
	var encoded bytes.Buffer
	if e := wire.WriteFrame(&encoded, payload); e != nil {
		return e
	}
	return s.writePhysical(ctx, encoded.Bytes(), false)
}

// Every copy of a message in a batch contributes its actually encoded label
// proof. A nil first copy cannot discard labels present in a later response.
func mergeDeliverySubjects(replies []inbound.Response) ([]api.DeliverySubject, error) {
	out := []api.DeliverySubject{}
	seen := map[string]int{}
	for _, reply := range replies {
		for _, subject := range reply.DeliverySubjects {
			key := subject.Kind + "\x00" + subject.ID
			index, found := seen[key]
			if !found {
				index = len(out)
				seen[key] = index
				out = append(out, api.DeliverySubject{Kind: subject.Kind, ID: subject.ID})
			}
			if subject.Attachments == nil {
				continue
			}
			if out[index].Attachments == nil {
				out[index].Attachments = &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}}
			}
			merged := out[index].Attachments
			for _, source := range subject.Attachments.SourceRefs {
				duplicate := false
				for _, old := range merged.SourceRefs {
					if reflect.DeepEqual(old, source) {
						duplicate = true
						break
					}
				}
				if !duplicate {
					merged.SourceRefs = append(merged.SourceRefs, source)
				}
			}
			for _, scope := range subject.Attachments.SourceScopes {
				duplicate := false
				for _, old := range merged.SourceScopes {
					if reflect.DeepEqual(old, scope) {
						duplicate = true
						break
					}
				}
				if !duplicate {
					merged.SourceScopes = append(merged.SourceScopes, scope)
				}
			}
			if len(merged.SourceRefs)+len(merged.SourceScopes) > 32 {
				return nil, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "GROUP_ATTACHMENT_LIMIT"}
			}
		}
	}
	return out, nil
}

func (s *Server) protocolError(reason string) error {
	// Never echo untrusted bytes. One bounded, static error frame precedes close.
	done := make(chan struct{})
	go func() { _ = s.write(inbound.Failure(nil, -32700, "INVALID_ARGUMENT", reason, false)); close(done) }()
	select {
	case <-done:
	case <-time.After(time.Second):
	}
	s.Close()
	return &wire.ProtocolError{Reason: reason}
}
func (s *Server) Run(ctx context.Context) error {
	if s.initErr != nil {
		s.Close()
		return s.initErr
	}
	if tracker, ok := s.router.App.Service.(interface {
		Connect()
		Disconnect()
	}); ok {
		tracker.Connect()
		defer tracker.Disconnect()
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	defer s.Close()
	stopWatcher := make(chan struct{})
	defer close(stopWatcher)
	go func() {
		select {
		case <-ctx.Done():
			s.Close()
		case <-stopWatcher:
		}
	}()
	defer func() { cancel(); s.Close(); s.workers.Wait() }()
	type decoded struct {
		entries []wire.Envelope
		batch   bool
		err     error
	}
	frames := make(chan decoded)
	// A synchronous read on inherited stdin is not guaranteed to wake when a
	// different goroutine closes the descriptor. Lifecycle selection remains on
	// the main loop; the OS releases an outstanding read when the process exits.
	go func() {
		for {
			entries, batch, err := wire.ReadFrame(s.input)
			select {
			case frames <- decoded{entries, batch, err}:
			case <-s.closed:
				return
			}
			if err != nil {
				return
			}
		}
	}()
	for {
		var next decoded
		select {
		case next = <-frames:
		case <-s.closed:
			return nil
		case <-ctx.Done():
			return nil
		}
		entries, batch, err := next.entries, next.batch, next.err
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			select {
			case <-s.closed:
				return nil
			default:
			}
			var p *wire.ProtocolError
			if errors.As(err, &p) {
				return s.protocolError(p.Reason)
			}
			return s.protocolError("TRANSPORT_READ_FAILED")
		}
		// Responses are delivered directly by the reader, never queued behind handlers.
		requests := make([]wire.Envelope, 0, len(entries))
		for _, e := range entries {
			if e.Method == "" {
				if e.ID == nil || !wire.ValidID(*e.ID, "s:") {
					return s.protocolError("INVALID_RESPONSE_DIRECTION")
				}
				s.pendingMu.Lock()
				ch, ok := s.pending[*e.ID]
				if ok {
					delete(s.pending, *e.ID)
				}
				late, knownLate := s.abandoned[*e.ID]
				if knownLate {
					delete(s.abandoned, *e.ID)
				}
				s.pendingMu.Unlock()
				if !ok {
					if !knownLate || !time.Now().Before(late.expires) {
						return s.protocolError("UNEXPECTED_RESPONSE")
					}
					if e.Error == nil {
						if wire.ValidateMethod(late.method, "result", e.Result) != nil {
							return s.protocolError("INVALID_HOST_RESULT")
						}
						if late.fingerprint != "" {
							var receipt api.HostReceipt
							if json.Unmarshal(e.Result, &receipt) != nil || receipt.Fingerprint != late.fingerprint {
								return s.protocolError("INVALID_HOST_RECEIPT")
							}
						}
					}
					continue
				}
				ch <- reply{env: e}
				continue
			}
			if e.ID == nil {
				continue
			} // Notifications cannot establish hello, execute a write, or shut down.
			if !wire.ValidID(*e.ID, "c:") {
				return s.protocolError("INVALID_REQUEST_DIRECTION")
			}
			s.activeMu.Lock()
			duplicate := s.active[*e.ID]
			if !duplicate {
				s.active[*e.ID] = true
			}
			s.activeMu.Unlock()
			if duplicate {
				return s.protocolError("DUPLICATE_REQUEST_ID")
			}
			requests = append(requests, e)
		}
		if len(requests) == 0 {
			continue
		}
		// hello gating happens in read order, so a pre-hello business request cannot race hello.
		if !s.router.Ready() || containsHello(requests) {
			replies := make([]inbound.Response, 0, len(requests))
			for _, e := range requests {
				replies = append(replies, s.router.Dispatch(ctx, e, s))
				s.releaseID(e)
			}
			var payload any = replies[0]
			if batch {
				payload = replies
			}
			if err = s.write(payload); err != nil {
				return err
			}
			if s.router.App.Service.Stopping() {
				return nil
			}
			continue
		}
		select {
		case s.slots <- struct{}{}:
		default:
			replies := make([]inbound.Response, 0, len(requests))
			for _, e := range requests {
				replies = append(replies, inbound.Failure(e.ID, -32000, "RESOURCE_LIMIT", "IN_FLIGHT_LIMIT", true))
				s.releaseID(e)
			}
			var payload any = replies[0]
			if batch {
				payload = replies
			}
			if err = s.write(payload); err != nil {
				return err
			}
			continue
		}
		s.workers.Add(1)
		s.inflight.Add(1)
		go func(reqs []wire.Envelope, isBatch bool) {
			defer s.workers.Done()
			defer func() { <-s.slots }()
			replies := make([]inbound.Response, 0, len(reqs))
			for _, e := range reqs {
				replies = append(replies, s.router.Dispatch(ctx, e, s))
				s.releaseID(e)
			}
			var payload any = replies[0]
			if isBatch {
				payload = replies
			}
			written := s.write(payload) == nil
			// An earlier reply can finish after service.shutdown was admitted. Closing
			// then would drop the shutdown acknowledgement still being written. While
			// stopping, only the shutdown request or the last in-flight reply closes.
			last := s.inflight.Add(-1) == 0
			if !written || s.router.App.Service.Stopping() && (last || containsShutdown(reqs)) {
				s.Close()
			}
		}(requests, batch)
	}
}
func containsShutdown(es []wire.Envelope) bool {
	for _, e := range es {
		if e.Method == "service.shutdown" {
			return true
		}
	}
	return false
}
func containsHello(es []wire.Envelope) bool {
	for _, e := range es {
		if e.Method == "protocol.hello" {
			return true
		}
	}
	return false
}
func (s *Server) releaseID(e wire.Envelope) {
	s.activeMu.Lock()
	delete(s.active, *e.ID)
	s.activeMu.Unlock()
}
func (s *Server) call(ctx context.Context, method string, params any) (wire.Envelope, error) {
	var empty wire.Envelope
	ctx, cancel := context.WithTimeout(ctx, RemoteTimeout)
	defer cancel()
	if ctx.Err() != nil {
		return empty, ctx.Err()
	}
	id := "s:" + api.NewID("")
	payload, e := json.Marshal(params)
	if e == nil {
		e = wire.ValidateMethod(method, "params", payload)
	}
	if e != nil {
		return empty, e
	}
	c := make(chan reply, 1)
	s.pendingMu.Lock()
	for key, late := range s.abandoned {
		if !time.Now().Before(late.expires) {
			delete(s.abandoned, key)
		}
	}
	if len(s.pending) >= MaxInFlight || len(s.abandoned) >= MaxInFlight {
		s.pendingMu.Unlock()
		return empty, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "HOST_PENDING_LIMIT", Retryable: true}
	}
	select {
	case <-s.closed:
		s.pendingMu.Unlock()
		return empty, io.EOF
	default:
	}
	s.pending[id] = c
	s.pendingMu.Unlock()
	defer func() { s.pendingMu.Lock(); delete(s.pending, id); s.pendingMu.Unlock() }()
	// Enqueue/write completes before a cancellation control can be enqueued, so
	// even cancellation during the first write cannot overtake its own request.
	if e = s.write(wire.Envelope{JSONRPC: "2.0", ID: &id, Method: method, Params: payload}); e != nil {
		return empty, e
	}
	consume := func(r reply) (wire.Envelope, error) {
		if r.err != nil {
			return empty, r.err
		}
		if r.env.Error != nil {
			return empty, s.hostError(method, r.env.Error)
		}
		return r.env, nil
	}
	select {
	case r := <-c:
		return consume(r)
	default:
	}
	select {
	case r := <-c:
		return consume(r)
	case <-s.closed:
		return empty, io.EOF
	case <-ctx.Done():
		s.pendingMu.Lock()
		_, pending := s.pending[id]
		if pending {
			delete(s.pending, id)
			var request struct {
				Fingerprint string `json:"fingerprint"`
			}
			_ = json.Unmarshal(payload, &request)
			s.abandoned[id] = lateCall{method: method, fingerprint: request.Fingerprint, expires: time.Now().Add(RemoteTimeout)}
		}
		s.pendingMu.Unlock()
		if !pending {
			select {
			case r := <-c:
				return consume(r)
			case <-s.closed:
				return empty, io.EOF
			}
		}
		control, _ := json.Marshal(struct {
			RequestID string `json:"requestId"`
		}{id})
		if e = s.write(wire.Envelope{JSONRPC: "2.0", Method: "$/cancelRequest", Params: control}); e != nil {
			return empty, e
		}
		return empty, ctx.Err()
	}
}
func (s *Server) hostError(method string, e *wire.RPCError) error {
	reason, kind := "HOST_REJECTED", "CAPABILITY_DENIED"
	allowed := map[string]string{
		"SOURCE_CHANGED": "SOURCE_CHANGED", "HOST_OFFLINE": "HOST_UNAVAILABLE", "HOST_LEASE_MISMATCH": "HOST_UNAVAILABLE",
		"SOURCE_SNAPSHOT_INVALID": "CAPABILITY_DENIED", "SOURCE_SCOPE_INVALID": "CAPABILITY_DENIED", "SOURCE_SCOPE_MISMATCH": "CAPABILITY_DENIED", "SOURCE_CURSOR_INVALID": "CAPABILITY_DENIED",
		"SOURCE_REQUEST_ABORTED": "HOST_UNAVAILABLE", "SOURCE_LEASE_UNAVAILABLE": "HOST_UNAVAILABLE", "SOURCE_CACHE_LIMIT": "RESOURCE_LIMIT", "SOURCE_SIZE_LIMIT": "RESOURCE_LIMIT", "SOURCE_TASK_LIMIT": "RESOURCE_LIMIT", "SOURCE_CURSOR_LIMIT": "RESOURCE_LIMIT",
		"NOTE_TARGET_INVALID": "CAPABILITY_DENIED", "NOTE_BINDING_MISMATCH": "CAPABILITY_DENIED", "NOTE_PROFILE_MISMATCH": "CAPABILITY_DENIED", "NOTE_RECEIPT_INVALID": "CAPABILITY_DENIED", "EFFECT_FINGERPRINT_MISMATCH": "CAPABILITY_DENIED",
		"NOTE_TARGET_EXISTS": "CONFLICT", "UNSAVED_EDITOR_CHANGES": "UNSAVED_EDITOR_CHANGES", "HOST_REQUEST_ABORTED": "HOST_UNAVAILABLE", "NOTE_TASK_LIMIT": "RESOURCE_LIMIT", "NOTE_SIZE_LIMIT": "RESOURCE_LIMIT", "RECEIPT_WRITE_FAILED": "CONFLICT",
	}
	if k, ok := allowed[e.Data.Reason]; ok {
		reason, kind = e.Data.Reason, k
	}
	return &api.Fault{Kind: kind, Reason: reason, Retryable: e.Data.Retryable}
}

func (s *Server) Read(ctx context.Context, q api.HostReadRequest) (api.HostReadResult, error) {
	e, err := s.call(ctx, "host.read", q)
	if err != nil {
		return api.HostReadResult{}, err
	}
	if wire.ValidateMethod("host.read", "result", e.Result) != nil {
		return api.HostReadResult{}, api.Invalid("INVALID_HOST_RESULT")
	}
	return wire.DecodeParams[api.HostReadResult](e.Result)
}
func (s *Server) Search(ctx context.Context, q api.HostSearchRequest) (api.HostSearchResult, error) {
	e, err := s.call(ctx, "host.search", q)
	if err != nil {
		return api.HostSearchResult{}, err
	}
	if wire.ValidateMethod("host.search", "result", e.Result) != nil {
		return api.HostSearchResult{}, api.Invalid("INVALID_HOST_RESULT")
	}
	return wire.DecodeParams[api.HostSearchResult](e.Result)
}
func (s *Server) PrepareWrite(ctx context.Context, q api.HostPrepareWriteRequest) (api.NoteTargetPreview, error) {
	e, err := s.call(ctx, "host.prepareWrite", q)
	if err != nil {
		return api.NoteTargetPreview{}, err
	}
	if wire.ValidateMethod("host.prepareWrite", "result", e.Result) != nil {
		return api.NoteTargetPreview{}, api.Invalid("INVALID_HOST_RESULT")
	}
	return wire.DecodeParams[api.NoteTargetPreview](e.Result)
}
func (s *Server) CheckWrite(ctx context.Context, q api.HostCheckWriteRequest) (api.HostCheckWriteResult, error) {
	e, err := s.call(ctx, "host.checkWrite", q)
	if err != nil {
		return api.HostCheckWriteResult{}, err
	}
	if wire.ValidateMethod("host.checkWrite", "result", e.Result) != nil {
		return api.HostCheckWriteResult{}, api.Invalid("INVALID_HOST_RESULT")
	}
	return wire.DecodeParams[api.HostCheckWriteResult](e.Result)
}
func (s *Server) Invoke(ctx context.Context, c api.HostInvokeCommand) (api.HostReceipt, error) {
	e, err := s.call(ctx, "host.invoke", c)
	if err != nil {
		return api.HostReceipt{}, err
	}
	return decodeReceipt("host.invoke", e.Result, c.EffectID, c.Fingerprint)
}
func (s *Server) QueryReceipt(ctx context.Context, c api.HostReceiptQuery) (api.HostReceipt, error) {
	e, err := s.call(ctx, "host.queryReceipt", c)
	if err != nil {
		return api.HostReceipt{}, err
	}
	return decodeReceipt("host.queryReceipt", e.Result, c.EffectID, c.Fingerprint)
}
func decodeReceipt(method string, p json.RawMessage, effect, fingerprint string) (api.HostReceipt, error) {
	if wire.ValidateMethod(method, "result", p) != nil {
		return api.HostReceipt{}, api.Invalid("INVALID_HOST_RECEIPT")
	}
	r, e := wire.DecodeParams[api.HostReceipt](p)
	if e != nil || r.EffectID != effect || r.Fingerprint != fingerprint || !wire.ValidDecimalOrEmpty(r.Revision) {
		return api.HostReceipt{}, api.Invalid("INVALID_HOST_RECEIPT")
	}
	return r, nil
}
