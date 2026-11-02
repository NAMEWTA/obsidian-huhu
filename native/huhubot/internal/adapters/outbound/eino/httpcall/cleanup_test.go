package httpcall

import (
	"context"
	"io"
	"sync"
	"testing"
	"time"
)

type cancelOnRead struct {
	once   sync.Once
	cancel context.CancelFunc
	data   []byte
}

func (r *cancelOnRead) Read(p []byte) (int, error) {
	r.once.Do(func() { r.cancel() })
	if len(r.data) == 0 {
		return 0, io.EOF
	}
	n := copy(p, r.data)
	r.data = r.data[n:]
	return n, nil
}
func (r *cancelOnRead) Close() error { return nil }

func TestReadDropsChunkThatArrivesAfterCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	observed := 0
	body := newObservedBody(&cancelOnRead{cancel: cancel, data: []byte("data: {\"late\":true}\n\n")}, ctx, cancel, Limits{
		ResponseBytes: 1 << 20,
		LineBytes:     8 << 10,
		EventBytes:    8 << 10,
		IdleTimeout:   time.Second,
	}, true, func(SSEEvent) error {
		observed++
		return nil
	})
	buf := make([]byte, 64)
	if _, err := body.Read(buf); err == nil || observed != 0 {
		t.Fatalf("late chunk was parsed after cancel: err=%v observed=%d", err, observed)
	}
}
