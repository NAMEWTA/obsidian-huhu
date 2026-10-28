//go:build linux

package events_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type permitObserved struct {
	api.EventsAPI
	entered  chan time.Time
	returned chan error
	once     sync.Once
}

func (o *permitObserved) WithDelivery(ctx context.Context, id api.RequestIdentity, subjects []api.DeliverySubject, fn func(context.Context) error) error {
	e := o.EventsAPI.WithDelivery(ctx, id, subjects, func(permit context.Context) error {
		until, _ := permit.Deadline()
		o.once.Do(func() { o.entered <- until })
		return fn(permit)
	})
	o.returned <- e
	return e
}

func TestActualOSPipeStopsBeforeExpiredPermitReturnsAndRevokeCommits(t *testing.T) {
	f := open(t)
	expiry := time.Now().Add(2 * time.Second)
	grant := f.sourceRun(t, expiry.UTC().Format(time.RFC3339Nano))
	f.append(t, "delta", strings.Repeat("PRIVATE_STREAM_", 4681))
	observed := &permitObserved{EventsAPI: f.c.API.Events, entered: make(chan time.Time, 1), returned: make(chan error, 1)}
	f.c.API.Events = observed
	inputRead, inputWrite := io.Pipe()
	outputRead, outputWrite, e := os.Pipe()
	if e != nil {
		t.Fatal(e)
	}
	transport := stdio.New(inputRead, outputWrite, f.c.API, owner)
	finished := make(chan error, 1)
	go func() { finished <- transport.Run(ctx) }()
	waited := false
	t.Cleanup(func() {
		_ = inputWrite.Close()
		transport.Close()
		if !waited {
			select {
			case <-finished:
			case <-time.After(2 * time.Second):
				t.Error("real-pipe server did not Wait")
			}
		}
		_ = outputRead.Close()
		_ = outputWrite.Close()
	})
	if e = outputRead.SetReadDeadline(time.Now().Add(4 * time.Second)); e != nil {
		t.Fatal(e)
	}
	sendRequest := func(id, method string, params any) {
		t.Helper()
		if e := wire.WriteFrame(inputWrite, map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params}); e != nil {
			t.Fatal(e)
		}
	}
	sendRequest("c:hello", "protocol.hello", wire.HelloParams{ProtocolVersion: "0.1", Client: wire.ClientInfo{Name: "real-pipe", Version: "1"}})
	frames, _, e := wire.ReadFrame(outputRead)
	if e != nil || len(frames) != 1 || frames[0].Error != nil {
		t.Fatal(frames, e)
	}
	if wait := time.Until(expiry) - 120*time.Millisecond; wait > 0 {
		timer := time.NewTimer(wait)
		<-timer.C
	}
	q := f.tail("2")
	q.MaxBytes = 524288
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil {
		t.Fatal(e)
	}
	var wholeFrame bytes.Buffer
	if e = wire.WriteFrame(&wholeFrame, map[string]any{"jsonrpc": "2.0", "id": "c:slow", "result": page}); e != nil {
		t.Fatal(e)
	}
	sendRequest("c:slow", "runs.subscribe", q)
	select {
	case until := <-observed.entered:
		if until.After(expiry) || time.Until(until) > 250*time.Millisecond {
			t.Fatal("permit outlived Grant", until, expiry)
		}
	case <-time.After(time.Second):
		t.Fatal("protected writer did not acquire actual permit")
	}
	// Do not read: the real OS output pipe must fill and its physical Write must
	// terminate at expiry, before the revocation fence can be returned.
	select {
	case e = <-observed.returned:
		if !errors.Is(e, context.DeadlineExceeded) && !errors.Is(e, os.ErrDeadlineExceeded) {
			t.Fatalf("expected expired I/O permit, got %v", e)
		}
	case <-time.After(time.Second):
		t.Fatal("physical output Write did not stop")
	}
	f.revoke(t, grant)
	select {
	case <-finished:
		waited = true
	case <-time.After(time.Second):
		t.Fatal("pipe timeout did not close session")
	}
	if e = outputRead.SetReadDeadline(time.Now().Add(80 * time.Millisecond)); e != nil {
		t.Fatal(e)
	}
	drained := 0
	buffer := make([]byte, 4096)
	for {
		n, readErr := outputRead.Read(buffer)
		drained += n
		if readErr != nil {
			if !errors.Is(readErr, os.ErrDeadlineExceeded) {
				t.Fatal(readErr)
			}
			break
		}
		if drained >= wholeFrame.Len() {
			t.Fatal("background write continued after permit/revocation", drained)
		}
	}
	if drained == 0 || drained >= wholeFrame.Len() {
		t.Fatal("not a bounded, physically interrupted pipe write", drained)
	}
	if e = outputRead.SetReadDeadline(time.Now().Add(30 * time.Millisecond)); e != nil {
		t.Fatal(e)
	}
	n, readErr := outputRead.Read(buffer)
	if n != 0 || !errors.Is(readErr, os.ErrDeadlineExceeded) {
		t.Fatal("old bytes continued after draining pre-expiry pipe buffer", n, readErr)
	}
	t.Logf("actual inherited-style os.Pipe: permit expired; physical writer returned; revoke committed before drain; buffered=%d (<full frame), then no additional bytes; session Wait completed", drained)
}
