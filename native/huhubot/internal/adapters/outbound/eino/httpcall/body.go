package httpcall

import (
	"bytes"
	"context"
	"io"
	"sync"
	"time"
	"unicode/utf8"
)

type observedBody struct {
	body              io.ReadCloser
	ctx               context.Context
	cancel            context.CancelFunc
	limits            Limits
	sse               bool
	observe           func(SSEEvent) error
	closed            chan struct{}
	once              sync.Once
	closeErr          error
	total, eventBytes int
	line, data        []byte
	event             string
	hasData           bool
	problem           string
	utf8Tail, ready   []byte
	readErr           error
}

func newObservedBody(body io.ReadCloser, ctx context.Context, cancel context.CancelFunc, limits Limits, sse bool, observe func(SSEEvent) error) *observedBody {
	return &observedBody{body: body, ctx: ctx, cancel: cancel, limits: limits, sse: sse, observe: observe, closed: make(chan struct{})}
}

func (b *observedBody) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if b.problem != "" {
		return 0, fault(b.problem)
	}
	for len(b.ready) == 0 && b.readErr == nil {
		if b.ctx.Err() != nil {
			return 0, fault("MODEL_CANCELED")
		}
		var raw [4096]byte
		idleDone := make(chan struct{})
		timer := time.AfterFunc(b.limits.IdleTimeout, func() { b.cancel(); close(idleDone) })
		n, err := b.body.Read(raw[:])
		if !timer.Stop() {
			<-idleDone
		}
		b.total += n
		if b.total > b.limits.ResponseBytes {
			b.problem = "MODEL_RESPONSE_LIMIT"
		}
		data := append(append([]byte(nil), b.utf8Tail...), raw[:n]...)
		valid := 0
		for valid < len(data) && utf8.FullRune(data[valid:]) {
			r, size := utf8.DecodeRune(data[valid:])
			if r == utf8.RuneError && size == 1 {
				b.problem = "MODEL_STREAM_INVALID"
				break
			}
			valid += size
		}
		if err != nil && valid != len(data) {
			b.problem = "MODEL_STREAM_INVALID"
		}
		if b.problem != "" {
			b.cancel()
			return 0, fault(b.problem)
		}
		b.ready = append(b.ready[:0], data[:valid]...)
		b.utf8Tail = append(b.utf8Tail[:0], data[valid:]...)
		if b.sse {
			for _, v := range b.ready {
				b.line = append(b.line, v)
				if len(b.line) > b.limits.LineBytes {
					b.problem = "MODEL_LINE_LIMIT"
					break
				}
				if v == '\n' {
					b.observeLine(bytes.TrimSuffix(b.line[:len(b.line)-1], []byte{'\r'}))
					b.line = b.line[:0]
				}
				if b.problem != "" {
					break
				}
			}
		}
		if err != nil {
			if b.sse {
				if len(b.line) > 0 {
					b.observeLine(bytes.TrimSuffix(b.line, []byte{'\r'}))
					b.line = b.line[:0]
				}
				b.dispatchEvent()
			}
			b.readErr = err
		}
		if b.problem != "" {
			b.cancel()
			return 0, fault(b.problem)
		}
		if n == 0 && err == nil {
			return 0, nil
		}
	}
	n := copy(p, b.ready)
	b.ready = b.ready[n:]
	if len(b.ready) == 0 {
		return n, b.readErr
	}
	return n, nil
}

func (b *observedBody) observeLine(line []byte) {
	if len(line) == 0 {
		b.dispatchEvent()
		return
	}
	b.eventBytes += len(line) + 1
	if b.eventBytes > b.limits.EventBytes {
		b.problem = "MODEL_EVENT_LIMIT"
		return
	}
	if line[0] == ':' {
		return
	}
	field, value, ok := bytes.Cut(line, []byte{':'})
	if !ok {
		value = nil
	}
	value = bytes.TrimPrefix(value, []byte{' '})
	switch string(field) {
	case "event":
		b.event = string(value)
	case "data":
		if b.hasData {
			b.data = append(b.data, '\n')
		}
		b.data = append(b.data, value...)
		b.hasData = true
	}
}
func observeSafely(observe func(SSEEvent) error, event SSEEvent) (err error) {
	defer func() {
		if recover() != nil {
			err = fault("MODEL_STREAM_INVALID")
		}
	}()
	if observe == nil || observe(event) != nil {
		return fault("MODEL_STREAM_INVALID")
	}
	return nil
}
func (b *observedBody) dispatchEvent() {
	if b.problem == "" && b.hasData && observeSafely(b.observe, SSEEvent{Event: b.event, Data: b.data}) != nil {
		b.problem = "MODEL_STREAM_INVALID"
	}
	b.event, b.hasData, b.eventBytes = "", false, 0
	b.data = b.data[:0]
}
func (b *observedBody) Close() error {
	b.once.Do(func() {
		defer close(b.closed)
		defer func() {
			if recover() != nil {
				b.closeErr = fault("MODEL_STREAM_FAILED")
			}
		}()
		b.closeErr = b.body.Close()
	})
	return b.closeErr
}
