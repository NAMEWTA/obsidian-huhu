package foundation_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"io"
	"net"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

// The caller's original deadline bounds every observation and the child process.
func observeShutdown(ctx context.Context, call func(int) (wire.ShutdownResult, error)) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		deadline, ok := ctx.Deadline()
		if !ok {
			return fmt.Errorf("shutdown observer requires caller deadline")
		}
		waitMs := min(1000, max(0, int(time.Until(deadline).Milliseconds())))
		facts, err := call(waitMs)
		if err != nil {
			return err
		}
		if !facts.Requested {
			return fmt.Errorf("stop not requested: %+v", facts)
		}
		if !facts.Finished {
			continue
		}
		if !facts.ExecutionDrained || !facts.PersistenceComplete || !facts.ProfileReleased || len(facts.Failures) != 0 {
			return fmt.Errorf("failed stop: %+v", facts)
		}
		return nil
	}
}

func shutdownWire(t *testing.T, ctx context.Context, stream io.ReadWriter) {
	t.Helper()
	sequence := 0
	err := observeShutdown(ctx, func(waitMs int) (wire.ShutdownResult, error) {
		sequence++
		id := fmt.Sprintf("c:stop-observe-%d", sequence)
		send(t, stream, request(id, "service.shutdown", map[string]any{"waitMs": waitMs}))
		replies := receive(t, stream)
		var facts wire.ShutdownResult
		if len(replies) != 1 || replies[0].ID == nil || *replies[0].ID != id || replies[0].Error != nil {
			return facts, fmt.Errorf("bad stop reply: %+v", replies)
		}
		err := json.Unmarshal(replies[0].Result, &facts)
		return facts, err
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestShutdownObserverContinuesAfterIncompleteReply(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	second := make(chan struct{})
	release := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		calls := 0
		done <- observeShutdown(ctx, func(waitMs int) (wire.ShutdownResult, error) {
			calls++
			if calls == 1 {
				return wire.ShutdownResult{Requested: true}, nil
			}
			close(second)
			select {
			case <-release:
			case <-ctx.Done():
				return wire.ShutdownResult{}, ctx.Err()
			}
			return wire.ShutdownResult{Requested: true, ExecutionDrained: true, PersistenceComplete: true, ProfileReleased: true, Finished: true}, nil
		})
	}()
	select {
	case err := <-done:
		t.Fatalf("returned before final facts: %v", err)
	case <-second:
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

// A real producer holds Core cleanup, so the first wire facts cannot be final.
// Only a second observation releases that producer; one-shot callers fail.
func TestShutdownObserverWaitsForRealProbeCleanup(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	root := privateRoot(t)
	probe := &heldMetadataProbe{entered: make(chan struct{}), release: make(chan struct{})}
	core, err := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "observer"), bootstrap.Options{Probe: probe})
	if err != nil {
		t.Fatal(err)
	}
	var once sync.Once
	release := func() { once.Do(func() { close(probe.release) }) }
	t.Cleanup(func() {
		release()
		if err := core.Close(); err != nil {
			t.Error(err)
		}
	})
	id := api.NewConnectionIdentity("observer", "owner", true)
	status, err := core.API.Service.Status(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	const ref = "credential:22222222222222222222222222222222"
	if _, err := core.Credentials.Register(ctx, status.Profile.ProfileID, ref, "session-memory", []byte("synthetic-probe")); err != nil {
		t.Fatal(err)
	}
	command := api.ModelTest{ProfileID: status.Profile.ProfileID, Model: api.ModelBindingDraft{Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/unused", ProviderID: "controlled", ModelID: "held", CredentialRef: ref, Capabilities: []string{}}}
	probeDone := make(chan struct{})
	go func() { defer close(probeDone); _, _ = core.API.Assistant.TestModel(ctx, id, command) }()
	t.Cleanup(func() {
		release()
		select {
		case <-probeDone:
		case <-time.After(time.Second):
			t.Error("probe did not join")
		}
	})
	select {
	case <-probe.entered:
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	client, conn := net.Pipe()
	deadline, _ := ctx.Deadline()
	_ = client.SetDeadline(deadline)
	server := stdio.New(conn, conn, core.API, id)
	serverDone := make(chan error, 1)
	go func() { serverDone <- server.Run(ctx) }()
	t.Cleanup(func() {
		_ = client.Close()
		server.Close()
		select {
		case <-serverDone:
		case <-time.After(time.Second):
			t.Error("server did not join")
		}
	})
	hello(t, client)
	calls := 0
	err = observeShutdown(ctx, func(waitMs int) (wire.ShutdownResult, error) {
		calls++
		if calls == 1 {
			waitMs = 0
		} else {
			release()
		}
		send(t, client, request(fmt.Sprintf("c:real-stop-%d", calls), "service.shutdown", map[string]any{"waitMs": waitMs}))
		reply := receive(t, client)[0]
		var facts wire.ShutdownResult
		if reply.Error != nil {
			return facts, fmt.Errorf("shutdown: %+v", reply.Error)
		}
		if err := json.Unmarshal(reply.Result, &facts); err != nil {
			return facts, err
		}
		if calls == 1 && (!facts.Requested || facts.Finished || facts.ExecutionDrained || facts.PersistenceComplete || facts.ProfileReleased) {
			return facts, fmt.Errorf("held producer falsely complete: %+v", facts)
		}
		return facts, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if calls < 2 {
		t.Fatal("did not observe again")
	}
	if _, _, err := wire.ReadFrame(client); !errors.Is(err, io.EOF) {
		t.Fatalf("expected clean EOF: %v", err)
	}
}
