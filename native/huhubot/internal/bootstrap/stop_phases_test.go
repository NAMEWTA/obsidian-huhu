package bootstrap

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"io"
	"net"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func stopProofCore(t *testing.T) (*Core, string, string) {
	t.Helper()
	root := t.TempDir()
	if err := os.Chmod(root, 0700); err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(root, "profile")
	c, err := OpenWithOptions(context.Background(), root, dir, Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = c.Close() })
	return c, root, dir
}

func TestStopDeadlineRetainsProfileThroughSlowActualWALSync(t *testing.T) {
	c, root, dir := stopProofCore(t)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	var syncs atomic.Int32
	c.walSync = func(f *os.File) error {
		syncs.Add(1)
		if f.Name() != filepath.Join(dir, "profile.sqlite3-wal") {
			t.Errorf("not actual WAL: %s", f.Name())
		}
		if info, err := f.Stat(); err != nil || info.Size() == 0 {
			t.Errorf("no actual committed WAL: %v", err)
		}
		close(entered)
		<-release
		return f.Sync()
	}
	t.Cleanup(func() { once.Do(func() { close(release) }); _ = c.Close() })
	var calls sync.WaitGroup
	for i := 0; i < 8; i++ {
		calls.Add(1)
		go func() { defer calls.Done(); _ = c.RequestStop() }()
	}
	calls.Wait()
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("WAL sync not reached")
	}
	bounded, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	facts, err := c.WaitStopped(bounded)
	if !errors.Is(err, context.DeadlineExceeded) || !facts.Requested || !facts.ExecutionDrained || facts.PersistenceComplete || facts.ProfileReleased || facts.Finished {
		t.Fatalf("deadline lost actual phase: %+v %v", facts, err)
	}
	closed := make(chan error, 1)
	go func() { closed <- c.Close() }()
	// The regression specifically crosses the removed three-second Core budget.
	timer := time.NewTimer(3100 * time.Millisecond)
	defer timer.Stop()
	select {
	case err := <-closed:
		t.Fatalf("Close abandoned actual sync: %v", err)
	case <-timer.C:
	}
	other, err := Open(context.Background(), root, dir)
	if other != nil {
		_ = other.Close()
		t.Fatal("Profile released before sync")
	}
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Kind != "INSTANCE_CONFLICT" {
		t.Fatalf("wrong lock result: %v", err)
	}
	once.Do(func() { close(release) })
	select {
	case err := <-closed:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("cleanup did not complete")
	}
	facts, err = c.WaitStopped(bounded) // Already-expired observer still sees completed cleanup.
	if err != nil || !facts.PersistenceComplete || !facts.ProfileReleased || !facts.Finished || len(facts.Failures) != 0 {
		t.Fatalf("final facts: %+v %v", facts, err)
	}
	if syncs.Load() != 1 {
		t.Fatalf("sync count %d", syncs.Load())
	}
	reopened, err := Open(context.Background(), root, dir)
	if err != nil {
		t.Fatal(err)
	}
	if err := reopened.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestStopSyncFailureDoesNotClaimPersistence(t *testing.T) {
	c, _, _ := stopProofCore(t)
	failure := errors.New("private-path-must-not-leak")
	c.walSync = func(*os.File) error { return failure }
	_ = c.RequestStop()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	facts, err := c.WaitStopped(ctx)
	if !errors.Is(err, failure) || !facts.Requested || !facts.ExecutionDrained || facts.PersistenceComplete || !facts.ProfileReleased || !facts.Finished {
		t.Fatalf("false completion: %+v %v", facts, err)
	}
	if len(facts.Failures) != 1 || facts.Failures[0] != "PERSISTENCE_CLOSE_FAILED" {
		t.Fatalf("unclassified or sensitive error: %+v", facts)
	}
	facts.Failures[0] = "mutated"
	if c.StopStatus().Failures[0] != "PERSISTENCE_CLOSE_FAILED" {
		t.Fatal("observer mutated owner state")
	}
}

func TestShutdownCanObserveAgainAfterDeadlineAndDatabaseClose(t *testing.T) {
	c, _, _ := stopProofCore(t)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	c.walSync = func(f *os.File) error { close(entered); <-release; return f.Sync() }
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(10 * time.Second))
	server := stdio.New(conn, conn, c.API, api.NewConnectionIdentity("stop-wire", "owner", true))
	done := make(chan error, 1)
	go func() { done <- server.Run(context.Background()) }()
	t.Cleanup(func() {
		once.Do(func() { close(release) })
		_ = client.Close()
		server.Close()
		_ = c.Close()
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Error("server leaked")
		}
	})
	exchange := func(id, method string, params any) wire.Envelope {
		t.Helper()
		if err := wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params}); err != nil {
			t.Fatal(err)
		}
		replies, _, err := wire.ReadFrame(client)
		if err != nil {
			t.Fatal(err)
		}
		if len(replies) != 1 {
			t.Fatal("unexpected replies", replies)
		}
		return replies[0]
	}
	hello := exchange("c:hello", "protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "stop", "version": "1"}})
	if hello.Error != nil {
		t.Fatal(hello.Error)
	}
	stop := exchange("c:first", "service.shutdown", map[string]any{"waitMs": 20})
	if stop.Error != nil {
		t.Fatal(stop.Error)
	}
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("sync not entered")
	}
	var facts api.StopStatus
	if err := json.Unmarshal(stop.Result, &facts); err != nil {
		t.Fatal(err)
	}
	if !facts.Requested || facts.Finished || facts.ProfileReleased {
		t.Fatalf("early ack %+v", facts)
	}
	rejected := exchange("c:business", "service.health", map[string]any{})
	if rejected.Error == nil || rejected.Error.Data.Reason != "SERVICE_STOPPING" {
		t.Fatalf("business admitted: %+v", rejected)
	}
	stop = exchange("c:again", "service.shutdown", map[string]any{"waitMs": 0})
	if stop.Error != nil {
		t.Fatal("first ACK closed observation", stop.Error)
	}
	once.Do(func() { close(release) })
	wait, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := c.WaitClosed(wait); err != nil {
		t.Fatal(err)
	}
	// This final observation runs after SQLite closed: it must not use Profile guards.
	stop = exchange("c:final", "service.shutdown", map[string]any{"waitMs": 0})
	if stop.Error != nil {
		t.Fatal("final observation accessed closed DB", stop.Error)
	}
	if err := json.Unmarshal(stop.Result, &facts); err != nil {
		t.Fatal(err)
	}
	if !facts.PersistenceComplete || !facts.ProfileReleased || !facts.Finished {
		t.Fatalf("final ack %+v", facts)
	}
	if _, _, err := wire.ReadFrame(client); !errors.Is(err, io.EOF) {
		t.Fatalf("final ACK did not close transport: %v", err)
	}
}

// A handler may have computed its result while another handler finishes writing.
// This barrier models that ordering without delaying the transport writer itself.
type heldStopReply struct {
	api.ServiceAPI
	first            atomic.Bool
	entered, release chan struct{}
}

func (s *heldStopReply) MarkStopping() { s.ServiceAPI.(interface{ MarkStopping() }).MarkStopping() }
func (s *heldStopReply) Shutdown(ctx context.Context, id api.RequestIdentity) (api.StopStatus, error) {
	facts, err := s.ServiceAPI.Shutdown(ctx, id)
	if s.first.CompareAndSwap(false, true) {
		close(s.entered)
		<-s.release
	}
	return facts, err
}

func TestFinalStopReplyDoesNotDropAnotherInflightReply(t *testing.T) {
	c, _, _ := stopProofCore(t)
	held := &heldStopReply{ServiceAPI: c.API.Service, entered: make(chan struct{}), release: make(chan struct{})}
	c.API.Service = held
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(5 * time.Second))
	server := stdio.New(conn, conn, c.API, api.NewConnectionIdentity("overlap", "owner", true))
	done := make(chan error, 1)
	go func() { done <- server.Run(context.Background()) }()
	var release sync.Once
	t.Cleanup(func() {
		release.Do(func() { close(held.release) })
		_ = client.Close()
		server.Close()
		_ = c.Close()
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Error("server leaked")
		}
	})
	send := func(id, method string, params any) {
		t.Helper()
		if err := wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params}); err != nil {
			t.Fatal(err)
		}
	}
	read := func() wire.Envelope {
		t.Helper()
		replies, _, err := wire.ReadFrame(client)
		if err != nil {
			t.Fatalf("in-flight reply dropped: %v", err)
		}
		return replies[0]
	}
	send("c:hello", "protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "overlap", "version": "1"}})
	if reply := read(); reply.Error != nil {
		t.Fatal(reply.Error)
	}
	send("c:first", "service.shutdown", map[string]any{"waitMs": 1000})
	select {
	case <-held.entered:
	case <-time.After(time.Second):
		t.Fatal("first stop not reached")
	}
	send("c:second", "service.shutdown", map[string]any{"waitMs": 1000})
	if reply := read(); reply.Error != nil || reply.ID == nil || *reply.ID != "c:second" {
		t.Fatal("wrong second reply", reply)
	}
	_ = client.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
	if _, err := client.Read(make([]byte, 1)); err == nil {
		t.Fatal("unexpected response before barrier release")
	} else {
		var timeout net.Error
		if !errors.As(err, &timeout) || !timeout.Timeout() {
			t.Fatalf("in-flight reply dropped before barrier release: %v", err)
		}
	}
	_ = client.SetReadDeadline(time.Now().Add(5 * time.Second))
	release.Do(func() { close(held.release) })
	if reply := read(); reply.Error != nil || reply.ID == nil || *reply.ID != "c:first" {
		t.Fatal("wrong delayed reply", reply)
	}
	if _, _, err := wire.ReadFrame(client); !errors.Is(err, io.EOF) {
		t.Fatalf("did not close after both replies: %v", err)
	}
}
