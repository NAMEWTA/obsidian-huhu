package foundation_test

import (
	"context"
	"net"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type batchMemoryProof struct{ contractMemory }

func (m *batchMemoryProof) Get(ctx context.Context, id api.RequestIdentity, q api.MemoryGet) (api.MemoryObject, error) {
	o, e := m.contractMemory.Get(ctx, id, q)
	if o.Item != nil {
		o.Item.RevisionID = "proof:shared"
	}
	if o.Context != nil {
		for i := range o.Context.Entries {
			o.Context.Entries[i].ID = "proof:shared"
		}
	}
	return o, e
}

type memoryDeliveryFence struct {
	api.EventsAPI
	seen    chan []api.DeliverySubject
	revoked bool
}

func (f memoryDeliveryFence) WithDelivery(ctx context.Context, _ api.RequestIdentity, subjects []api.DeliverySubject, write func(context.Context) error) error {
	f.seen <- subjects
	for _, s := range subjects {
		if f.revoked && s.Kind == "context_entry" {
			return api.Denied("MEMORY_FORGOTTEN")
		}
	}
	return write(ctx)
}

// This isolates the existing transport's Kind+ID union. Actual SQL/current
// namespace authorization is covered by the Memory/Facts integration tests.
func TestStdioMemoryAndContextProofsDoNotCollapseIntoRunOrMessage(t *testing.T) {
	for _, revoked := range []bool{false, true} {
		t.Run(map[bool]string{false: "current", true: "revoked"}[revoked], func(t *testing.T) {
			root := privateRoot(t)
			core, e := bootstrap.OpenWithOptions(context.Background(), root, filepath.Join(root, "one"), bootstrap.Options{ExecutorPaused: true})
			if e != nil {
				t.Fatal(e)
			}
			t.Cleanup(func() { memoryRuntimeStop(t, core) })
			memory := &batchMemoryProof{}
			core.API.Memory = memory
			page := batchLabelPage(nil)
			page.Items[0].ID = "proof:shared"
			page.DeliverySubjects[0].ID = "proof:shared"
			core.API.Conversation = batchLabelHistory{ConversationAPI: core.API.Conversation, pages: map[string]api.MessagePage{"same": page}}
			seen := make(chan []api.DeliverySubject, 1)
			core.API.Events = memoryDeliveryFence{EventsAPI: core.API.Events, seen: seen, revoked: revoked}
			client, conn := net.Pipe()
			_ = client.SetDeadline(time.Now().Add(6 * time.Second))
			server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("memory-batch", "owner", false))
			done := make(chan error, 1)
			go func() { done <- server.Run(context.Background()) }()
			t.Cleanup(func() {
				_ = client.Close()
				server.Close()
				select {
				case <-done:
				case <-time.After(3 * time.Second):
					t.Error("stdio did not actually stop")
				}
			})
			hello(t, client)
			ns := map[string]string{"kind": "agent", "id": "agent:a"}
			send(t, client, []any{
				request("c:history", "sessions.history", map[string]any{"profileId": "profile:one", "sessionId": "session:one", "cursor": "same"}),
				request("c:item", "memory.get", map[string]any{"profileId": "profile:one", "namespace": ns, "kind": "item", "id": "item:1"}),
				request("c:context", "memory.get", map[string]any{"profileId": "profile:one", "namespace": ns, "kind": "context", "id": "run:1"}),
				request("c:context-again", "memory.get", map[string]any{"profileId": "profile:one", "namespace": ns, "kind": "context", "id": "run:1"}),
			})
			responses := receive(t, client)
			select {
			case subjects := <-seen:
				kinds := map[string]bool{}
				for _, s := range subjects {
					if s.ID != "proof:shared" || s.Kind == "run" {
						t.Fatal("proof identity changed", s)
					}
					kinds[s.Kind] = true
				}
				if len(subjects) != 3 || !kinds["message"] || !kinds["memory_revision"] || !kinds["context_entry"] {
					t.Fatal("Kind+ID union lost a real protected body", subjects)
				}
			case <-time.After(time.Second):
				t.Fatal("physical writer skipped memory proof")
			}
			if len(responses) != 4 {
				t.Fatal("batch response lost", len(responses))
			}
			for _, r := range responses {
				if revoked {
					if r.Error == nil || r.Error.Data.Reason != "MEMORY_FORGOTTEN" || len(r.Result) != 0 {
						t.Fatal("revoked queued body survived", r)
					}
				} else if r.Error != nil {
					t.Fatal(r.Error)
				}
			}
		})
	}
}
