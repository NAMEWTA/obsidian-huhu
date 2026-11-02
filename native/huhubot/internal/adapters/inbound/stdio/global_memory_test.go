package stdio_test

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type globalProfileStub struct{}

func (globalProfileStub) ReadMetadata(context.Context) (api.ProfileMetadata, error) {
	return api.ProfileMetadata{ProfileID: "profile", CommandEpoch: "1", Revision: "1", CreatedAt: "2026-01-01T00:00:00Z"}, nil
}

type globalOwnerPortStub struct{ proposal api.MemoryProposal }

func (s globalOwnerPortStub) ProposeGlobal(context.Context, api.RequestIdentity, api.MemoryGlobalProposal) (api.MemoryProposal, error) {
	return s.proposal, nil
}
func (globalOwnerPortStub) ResolveGlobal(context.Context, api.RequestIdentity, api.MemoryResolve) (api.Receipt, error) {
	return api.Receipt{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "2"}, nil
}

type globalDeliveryStub struct {
	api.EventsAPI
	seen chan []api.DeliverySubject
}

func (s globalDeliveryStub) WithDelivery(ctx context.Context, _ api.RequestIdentity, subjects []api.DeliverySubject, write func(context.Context) error) error {
	s.seen <- subjects
	return write(ctx)
}

func TestLocalOwnerStdioPhysicallyFencesGlobalPreviewForBothConnectionModes(t *testing.T) {
	for _, managed := range []bool{false, true} {
		t.Run(fmt.Sprint("managed=", managed), func(t *testing.T) {
			body := "sensitive global preview"
			proposal := api.MemoryProposal{ID: "proposal:one", Revision: "1", Operation: "create", Scope: api.MemoryScope{Kind: "profile"}, Body: &api.MemoryBody{
				Text: body, Hash: fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(body))), Provenance: "user", CreatorKind: "user", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}, Derived: []api.DerivedInput{},
			}, PreviewHash: fmt.Sprintf("sha256:%x", sha256.Sum256([]byte("preview"))), ExpiresAt: "2027-01-01T00:00:00Z", State: "pending"}
			owner := globalOwnerPortStub{proposal: proposal}
			host := api.NewHostService()
			seen := make(chan []api.DeliverySubject, 1)
			app := &api.Facade{Service: api.NewService(globalProfileStub{}, host), Host: host, GlobalMemory: owner, Events: globalDeliveryStub{seen: seen}}
			client, serverConn := net.Pipe()
			_ = client.SetDeadline(time.Now().Add(5 * time.Second))
			server := stdio.NewOwner(serverConn, serverConn, app, api.NewConnectionIdentity("local-owner", "principal", managed), owner)
			done := make(chan error, 1)
			go func() { done <- server.Run(context.Background()) }()
			t.Cleanup(func() {
				_ = client.Close()
				server.Close()
				select {
				case <-done:
				case <-time.After(3 * time.Second):
					t.Error("owner stdio did not stop")
				}
			})
			if err := wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": "c:hello", "method": "protocol.hello", "params": map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "stdio-global-test", "version": "1"}}}); err != nil {
				t.Fatal(err)
			}
			if reply, _, err := wire.ReadFrame(client); err != nil || len(reply) != 1 || reply[0].Error != nil {
				t.Fatalf("hello failed: replies=%+v err=%v", reply, err)
			}
			params := map[string]any{"commandId": "command:one", "idempotencyKey": "key:one", "profileId": "profile", "commandEpoch": "1", "expectedRevision": "1", "operation": "create", "scope": map[string]any{"kind": "profile"}, "text": "sensitive global preview", "sources": []any{}}
			if err := wire.WriteFrame(client, map[string]any{"jsonrpc": "2.0", "id": "c:propose", "method": "memory.proposeGlobal", "params": params}); err != nil {
				t.Fatal(err)
			}
			replies, _, err := wire.ReadFrame(client)
			if err != nil || len(replies) != 1 || replies[0].Error != nil {
				t.Fatalf("owner propose failed: replies=%+v err=%v", replies, err)
			}
			var got api.MemoryProposal
			if err := json.Unmarshal(replies[0].Result, &got); err != nil || got.ID != proposal.ID || got.Body == nil || got.Body.Text != body {
				t.Fatalf("physical response not complete fixed preview: %+v err=%v", got, err)
			}
			select {
			case subjects := <-seen:
				if len(subjects) != 1 || subjects[0] != (api.DeliverySubject{Kind: "memory_proposal", ID: proposal.ID}) {
					t.Fatalf("proposal body bypassed physical subject: %+v", subjects)
				}
			default:
				t.Fatal("proposal body physically written without delivery reader")
			}
		})
	}
}
