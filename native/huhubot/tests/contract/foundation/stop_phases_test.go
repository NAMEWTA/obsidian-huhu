package foundation_test

import (
	"context"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"io"
	"net"
	"path/filepath"
	"testing"
	"time"
)

func TestShutdownReturnsCompletedFacts(t *testing.T) {
	client, _, _ := running(t, true)
	hello(t, client)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	shutdownWire(t, ctx, client)
}

// Profile deletion requests stop during an admitted command. Hold that same
// ordering here without racing an external stop against the hello reply.
type stopOnHealthService struct {
	api.ServiceAPI
	core *bootstrap.Core
}

func (s *stopOnHealthService) MarkStopping() {
	s.ServiceAPI.(interface{ MarkStopping() }).MarkStopping()
}
func (s *stopOnHealthService) Health(ctx context.Context, id api.RequestIdentity) error {
	_ = s.core.RequestStop()
	return s.ServiceAPI.Health(ctx, id)
}
func TestStopWithoutShutdownObservationClosesAfterReply(t *testing.T) {
	root := privateRoot(t)
	core, err := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	core.API.Service = &stopOnHealthService{ServiceAPI: core.API.Service, core: core}
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(5 * time.Second))
	server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("stop-command", "owner", true))
	done := make(chan error, 1)
	go func() { done <- server.Run(context.Background()) }()
	t.Cleanup(func() {
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
	send(t, client, request("c:stopping", "service.health", map[string]any{}))
	reply := receive(t, client)[0]
	if reply.Error == nil || reply.Error.Data.Reason != "SERVICE_STOPPING" {
		t.Fatal("admission reopened", reply)
	}
	_ = client.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
	if _, err := client.Read(make([]byte, 1)); !errors.Is(err, io.EOF) {
		t.Fatalf("unobserved stop kept transport: %v", err)
	}
}
