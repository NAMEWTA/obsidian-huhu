package events_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type observedEvents struct {
	api.EventsAPI
	loaded chan struct{}
	once   sync.Once
	wait   func() error
}

func (o *observedEvents) Tail(ctx context.Context, id api.RequestIdentity, q api.EventTailQuery) (api.EventPage, error) {
	p, e := o.EventsAPI.Tail(ctx, id, q)
	o.once.Do(func() { close(o.loaded) })
	return p, e
}

type blockedOutput struct {
	net.Conn
	writes  atomic.Int32
	blocked chan struct{}
}

func (o *blockedOutput) Write(p []byte) (int, error) {
	if o.writes.Add(1) == 2 {
		close(o.blocked)
	}
	return o.Conn.Write(p)
}
func send(t *testing.T, c net.Conn, id, method string, params any) {
	t.Helper()
	if e := wire.WriteFrame(c, map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params}); e != nil {
		t.Fatal(e)
	}
}
func receive(t *testing.T, c net.Conn) wire.Envelope {
	t.Helper()
	frames, _, e := wire.ReadFrame(c)
	if e != nil || len(frames) != 1 {
		t.Fatal("read frame", frames, e)
	}
	return frames[0]
}
func pendingServer(t *testing.T, f *fixture) (net.Conn, *observedEvents) {
	t.Helper()
	observed := &observedEvents{EventsAPI: f.c.API.Events, loaded: make(chan struct{})}
	f.c.API.Events = observed
	client, server := net.Pipe()
	if e := client.SetDeadline(time.Now().Add(3 * time.Second)); e != nil {
		t.Fatal(e)
	}
	output := &blockedOutput{Conn: server, blocked: make(chan struct{})}
	transport := stdio.New(server, output, f.c.API, owner)
	finished := make(chan error, 1)
	go func() { finished <- transport.Run(ctx) }()
	observed.wait = join(t, finished)
	t.Cleanup(func() {
		_ = client.Close()
		transport.Close()
		if e := observed.wait(); e != nil {
			t.Error(e)
		}
	})
	send(t, client, "c:hello", "protocol.hello", wire.HelloParams{ProtocolVersion: "0.1", Client: wire.ClientInfo{Name: "events", Version: "1"}})
	if r := receive(t, client); r.Error != nil {
		t.Fatal(r.Error)
	}
	send(t, client, "c:block", "service.health", map[string]any{})
	select {
	case <-output.blocked:
	case <-time.After(time.Second):
		t.Fatal("writer did not block on real stream")
	}
	return client, observed
}

func TestActualSlowConsumerDisconnectsAtBoundedQueuedBytes(t *testing.T) {
	f := open(t)
	for range 7 {
		f.append(t, "delta", strings.Repeat("x", 65536))
	}
	client, observed := pendingServer(t, f)
	q := f.tail("1")
	q.Limit = 8
	q.MaxBytes = 524288
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil {
		t.Fatal(e)
	}
	encoded, e := json.Marshal(page)
	if e != nil || len(encoded)*5 <= stdio.MaxQueuedBytes {
		t.Fatal("fixture did not exceed byte budget", len(encoded), e)
	}
	start := time.Now()
	for i := range 8 {
		e = wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": fmt.Sprintf("c:overload-%d", i), "method": "runs.subscribe", "params": q})
		if e != nil {
			break
		}
	}
	if e = observed.wait(); e != nil {
		t.Fatal(e)
	}
	if elapsed := time.Since(start); elapsed >= stdio.WriteTimeout {
		t.Fatal("byte overload relied on the later physical timeout", elapsed)
	}
	t.Logf("blocked real writer; five encoded pages exceed %d queue bytes, fewer than32 frame slots; server closed and workers Wait before1s physical timeout", stdio.MaxQueuedBytes)
}

func TestActualWriterDiscardsQueuedBodyAndCursorSnapshotAfterRevocation(t *testing.T) {
	for _, snapshot := range []bool{false, true} {
		name := "page"
		if snapshot {
			name = "expired-cursor-snapshot"
		}
		t.Run(name, func(t *testing.T) {
			f := open(t)
			g := f.sourceRun(t, "")
			after := "1"
			if snapshot {
				for range 270 {
					f.append(t, "delta", "DERIVED_PRIVATE")
				}
				if _, e := f.db.Exec("UPDATE execution_runs SET status='failed' WHERE run_id=?", f.run.RunID); e != nil {
					t.Fatal(e)
				}
				after = "0"
			}
			client, observed := pendingServer(t, f)
			send(t, client, "c:queued", "runs.subscribe", f.tail(after))
			select {
			case <-observed.loaded:
			case <-time.After(time.Second):
				t.Fatal("event query did not finish while writer blocked")
			}
			f.revoke(t, g)
			if r := receive(t, client); r.ID == nil || *r.ID != "c:block" || r.Error != nil {
				t.Fatal("blocking response", r)
			}
			r := receive(t, client)
			if r.ID == nil || *r.ID != "c:queued" || r.Error == nil || r.Error.Data.Kind != "CAPABILITY_DENIED" || len(r.Result) != 0 || len(r.Error.Data.Details) != 0 {
				b, _ := json.Marshal(r)
				t.Fatalf("queued private content crossed revocation: %s", b)
			}
		})
	}
}

func TestActualWriterDiscardsQueuedBodyAtExpiryWithoutMutation(t *testing.T) {
	f := open(t)
	expiry := time.Now().Add(450 * time.Millisecond)
	_ = f.sourceRun(t, expiry.UTC().Format(time.RFC3339Nano))
	client, observed := pendingServer(t, f)
	send(t, client, "c:queued", "runs.subscribe", f.tail("1"))
	select {
	case <-observed.loaded:
	case <-time.After(time.Second):
		t.Fatal("query did not complete")
	}
	if wait := time.Until(expiry); wait > 0 {
		timer := time.NewTimer(wait)
		<-timer.C
	}
	if r := receive(t, client); r.Error != nil {
		t.Fatal(r.Error)
	}
	r := receive(t, client)
	if r.Error == nil || r.Error.Data.Kind != "CAPABILITY_DENIED" || len(r.Result) != 0 {
		t.Fatal("queued body ignored expiry", r)
	}
}
