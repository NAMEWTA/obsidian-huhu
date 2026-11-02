package foundation_test

import (
	"context"
	"errors"
	"io"
	"net"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type delayedStopReply struct {
	api.ServiceAPI
	first            atomic.Bool
	entered, release chan struct{}
}

func (s *delayedStopReply) MarkStopping() { s.ServiceAPI.(interface{ MarkStopping() }).MarkStopping() }
func (s *delayedStopReply) Shutdown(ctx context.Context, id api.RequestIdentity) (api.StopStatus, error) {
	facts, err := s.ServiceAPI.Shutdown(ctx, id)
	if s.first.CompareAndSwap(false, true) {
		close(s.entered)
		<-s.release
	}
	return facts, err
}

func TestHelloShutdownBatchWaitsForEarlierStopReply(t *testing.T) {
	root := privateRoot(t)
	core, err := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	held := &delayedStopReply{ServiceAPI: core.API.Service, entered: make(chan struct{}), release: make(chan struct{})}
	core.API.Service = held
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(5 * time.Second))
	server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("batch-stop", "owner", true))
	done := make(chan error, 1)
	go func() { done <- server.Run(context.Background()) }()
	var release sync.Once
	t.Cleanup(func() {
		release.Do(func() { close(held.release) })
		_ = client.Close()
		server.Close()
		_ = core.Close()
		select {
		case <-done:
		case <-time.After(time.Second):
			t.Error("server leaked")
		}
	})
	hello(t, client)
	send(t, client, request("c:held", "service.shutdown", map[string]any{"waitMs": 1000}))
	select {
	case <-held.entered:
	case <-time.After(time.Second):
		t.Fatal("held stop not entered")
	}
	send(t, client, []any{
		request("c:hello-again", "protocol.hello", wire.HelloParams{ProtocolVersion: "0.1", Client: wire.ClientInfo{Name: "batch", Version: "1"}}),
		request("c:batch-stop", "service.shutdown", map[string]any{"waitMs": 1000}),
	})
	replies := receive(t, client)
	if len(replies) != 2 || replies[0].Error == nil || replies[1].Error != nil {
		t.Fatalf("bad batch replies: %+v", replies)
	}
	_ = client.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
	if _, err = client.Read(make([]byte, 1)); err == nil {
		t.Fatal("unexpected held reply")
	} else {
		var timeout net.Error
		if !errors.As(err, &timeout) || !timeout.Timeout() {
			t.Fatalf("batch dropped admitted reply: %v", err)
		}
	}
	_ = client.SetReadDeadline(time.Now().Add(5 * time.Second))
	release.Do(func() { close(held.release) })
	reply := receive(t, client)[0]
	if reply.ID == nil || *reply.ID != "c:held" || reply.Error != nil {
		t.Fatal("held response lost", reply)
	}
	if _, _, err = wire.ReadFrame(client); !errors.Is(err, io.EOF) {
		t.Fatalf("expected clean EOF: %v", err)
	}
}
