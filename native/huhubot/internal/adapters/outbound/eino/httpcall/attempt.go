package httpcall

import (
	"bytes"
	"context"
	"io"
	"mime"
	"net/http"
	"strconv"
	"time"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func validateSafely(validate func([]byte) error, body []byte) (err error) {
	defer func() {
		if recover() != nil {
			err = fault("MODEL_REQUEST_INVALID")
		}
	}()
	if validate(append([]byte(nil), body...)) != nil {
		return fault("MODEL_REQUEST_INVALID")
	}
	return nil
}

func (s *callState) send(req *http.Request) (*http.Response, error) {
	s.mu.Lock()
	if s.sent {
		s.mu.Unlock()
		return nil, fault("MODEL_HIDDEN_RETRY")
	}
	s.sent = true
	s.mu.Unlock()
	method := http.MethodPost
	if s.probe {
		method = http.MethodGet
	}
	if req.Method != method || req.URL.String() != s.spec.URL {
		return nil, fault("MODEL_DESTINATION_CHANGED")
	}
	if s.ctx.Err() != nil {
		return nil, fault("MODEL_CANCELED")
	}
	if s.probe {
		if req.Body != nil && req.Body != http.NoBody {
			return nil, fault("MODEL_REQUEST_INVALID")
		}
	} else {
		if req.Body == nil {
			return nil, fault("MODEL_REQUEST_INVALID")
		}
		body, err := io.ReadAll(io.LimitReader(req.Body, int64(s.limits.RequestBytes)+1))
		closeErr := req.Body.Close()
		if err != nil || closeErr != nil || len(body) > s.limits.RequestBytes {
			return nil, fault("MODEL_REQUEST_LIMIT")
		}
		if !utf8.Valid(body) || validateSafely(s.spec.ValidateBody, body) != nil {
			return nil, fault("MODEL_REQUEST_INVALID")
		}
		req.Body = io.NopCloser(bytes.NewReader(body))
		req.ContentLength, req.GetBody = int64(len(body)), nil
		reservation, err := s.spec.Attempts.Reserve(s.ctx, api.AttemptRequest{LogicalCallID: s.spec.LogicalCallID, InputEstimate: strconv.Itoa(len(body)), OutputBound: strconv.Itoa(s.spec.OutputBound)})
		if err != nil {
			s.recordAdmission(err)
			return nil, err
		}
		s.mu.Lock()
		s.reservation = reservation
		s.mu.Unlock()
	}
	var response *http.Response
	var err error
	send := func(ctx context.Context) error {
		s.mu.Lock()
		s.dispatched = true
		s.mu.Unlock()
		response, err = s.runtime.transport.RoundTrip(req.WithContext(ctx))
		// Track the original body before SDK Do can hide or replace it, even
		// when transport returns an error or cancellation wins after return.
		if response != nil && response.Body != nil {
			mediaType, _, _ := mime.ParseMediaType(response.Header.Get("Content-Type"))
			body := newObservedBody(response.Body, s.ctx, s.cancel, s.limits, !s.probe && mediaType == "text/event-stream", s.spec.ObserveEvent)
			watchDone := make(chan struct{})
			s.mu.Lock()
			s.body, s.watchDone, s.status = body, watchDone, response.StatusCode
			s.mu.Unlock()
			response.Body = body
			go func() {
				defer close(watchDone)
				select {
				case <-s.ctx.Done():
					_ = body.Close()
				case <-body.closed:
				}
			}()
		}
		return err
	}
	if s.probe {
		err = send(s.ctx)
	} else {
		err = s.spec.Attempts.Dispatch(s.ctx, s.reservation, send)
		s.mu.Lock()
		dispatched := s.dispatched
		s.mu.Unlock()
		if !dispatched && err != nil {
			s.recordAdmission(err)
		}
	}
	return response, err
}

func (s *callState) recordAdmission(err error) {
	// Only actual application Fault values can be inspected by the driver.
	// Public propagation still uses common.SafeReason's explicit allowlist.
	if f, ok := err.(*api.Fault); ok {
		s.mu.Lock()
		s.admissionErr = f
		s.mu.Unlock()
	}
}

func (s *callState) commit() error {
	if s.probe || s.reservation.ID == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), s.limits.CleanupTimeout)
	defer cancel()
	if !s.dispatched {
		return s.spec.Attempts.AbortUnsent(ctx, s.reservation)
	}
	_, err := s.spec.Attempts.Settle(ctx, s.reservation, s.observation)
	return err
}

func (r *Runtime) retain(s *callState) {
	r.mu.Lock()
	r.pending[s.id] = s
	if !r.worker {
		r.worker = true
		// The current Call already holds wg above zero, even during Stop.
		r.wg.Add(1)
		go r.retrySettlements()
	}
	r.mu.Unlock()
	select {
	case r.wake <- struct{}{}:
	default:
	}
}

func (r *Runtime) retrySettlements() {
	defer r.wg.Done()
	for {
		r.mu.Lock()
		if len(r.pending) == 0 {
			r.worker = false
			r.mu.Unlock()
			return
		}
		pending := make([]*callState, 0, len(r.pending))
		for _, s := range r.pending {
			pending = append(pending, s)
		}
		r.mu.Unlock()
		for _, s := range pending {
			if s.commit() == nil {
				<-s.finished
				s.release()
			}
		}
		timer := time.NewTimer(250 * time.Millisecond)
		select {
		case <-r.wake:
			if !timer.Stop() {
				<-timer.C
			}
		case <-timer.C:
		}
	}
}
