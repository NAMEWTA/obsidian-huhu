package chat_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func TestHAPEOFDoesNotCancelCommittedExecution(t *testing.T) {
	entered := make(chan struct{}, 1)
	canceled := make(chan struct{}, 1)
	gate := make(chan struct{})
	var once sync.Once
	engine := fakeEngine{func(c context.Context, _ api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		entered <- struct{}{}
		select {
		case <-gate:
			return api.EngineResult{Status: "finished", Text: "survived client EOF"}, nil
		case <-c.Done():
			canceled <- struct{}{}
			return api.EngineResult{}, c.Err()
		}
	}}
	core, _, _ := withEngine(t, engine, false)
	defer once.Do(func() { close(gate) })
	s := session(t, core)
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(3 * time.Second))
	defer client.Close()
	server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("ephemeral-hap", "owner", false))
	done := make(chan error, 1)
	go func() { done <- server.Run(ctx) }()
	defer server.Close()
	call := func(id, method string, params any) wire.Envelope {
		t.Helper()
		e := wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": id, "method": method, "params": params})
		if e != nil {
			t.Fatal(e)
		}
		frames, _, e := wire.ReadFrame(client)
		if e != nil || len(frames) != 1 {
			t.Fatal(frames, e)
		}
		if frames[0].Error != nil {
			t.Fatal(frames[0].Error)
		}
		return frames[0]
	}
	call("c:hello", "protocol.hello", wire.HelloParams{ProtocolVersion: "0.1", Client: wire.ClientInfo{Name: "EOF test", Version: "1"}})
	response := call("c:run", "runs.start", api.RunStart{CommandMeta: meta(t, core, "stdio-run", s.Revision), SessionID: s.ID, Intent: "committed through HAP", SourceRefs: []api.SourceSnapshot{}})
	var receipt api.RunReceipt
	if e := json.Unmarshal(response.Result, &receipt); e != nil {
		t.Fatal(e)
	}
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("Engine not entered")
	}
	_ = client.Close()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("EOF did not stop transport")
	}
	select {
	case <-canceled:
		t.Fatal("client EOF canceled accepted intent")
	default:
	}
	once.Do(func() { close(gate) })
	waitRun(t, core, receipt.RunID, "succeeded")
}

func TestExecutorConcurrencyIsBoundedAndQueuedIntentStillScanned(t *testing.T) {
	entered := make(chan string, executorapp.WorkerCapacity+1)
	gate := make(chan struct{})
	var once sync.Once
	engine := fakeEngine{func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		entered <- in.RunID
		select {
		case <-gate:
			return api.EngineResult{Status: "finished", Text: "done"}, nil
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
	}}
	c, _, _ := withEngine(t, engine, false)
	defer once.Do(func() { close(gate) })
	receipts := []api.RunReceipt{}
	for i := 0; i <= executorapp.WorkerCapacity; i++ {
		key := fmt.Sprintf("worker-%d", i)
		m := meta(t, c, "q", "")
		bots, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: m.ProfileID})
		if e != nil {
			t.Fatal(e)
		}
		s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "session-"+key, ""), Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
		if e != nil {
			t.Fatal(e)
		}
		r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "run-"+key, s.Revision), SessionID: s.ID, Intent: key, SourceRefs: []api.SourceSnapshot{}})
		if e != nil {
			t.Fatal(e)
		}
		receipts = append(receipts, r)
		if i < executorapp.WorkerCapacity {
			select {
			case <-entered:
			case <-time.After(3 * time.Second):
				t.Fatal("worker not started")
			}
		}
	}
	time.Sleep(120 * time.Millisecond)
	if len(entered) != 0 {
		t.Fatal("worker exceeded local implementation concurrency bound")
	}
	waitRun(t, c, receipts[executorapp.WorkerCapacity].RunID, "accepted")
	once.Do(func() { close(gate) })
	for _, r := range receipts {
		waitRun(t, c, r.RunID, "succeeded")
	}
	if len(entered) != 1 {
		t.Fatal("queued accepted intent not scanned exactly once", len(entered))
	}
}
