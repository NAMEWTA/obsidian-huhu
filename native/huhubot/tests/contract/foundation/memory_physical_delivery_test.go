package foundation_test

import (
	"bytes"
	"context"
	"errors"
	"net"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// The observer delegates every call to the default Core Memory API. It records
// the actual object returned to the stdio router before the write gate opens.
type physicalMemoryObserver struct {
	api.MemoryAPI
	observed chan api.MemoryObject
}

func (o physicalMemoryObserver) Get(ctx context.Context, id api.RequestIdentity, q api.MemoryGet) (api.MemoryObject, error) {
	object, err := o.MemoryAPI.Get(ctx, id, q)
	if err == nil {
		o.observed <- object
	}
	return object, err
}

// Waiting happens before the real EventsAPI acquires the SQL read fence. Once
// released, the original EventsAPI alone decides current eligibility and writes.
type physicalMemoryDeliveryBarrier struct {
	api.EventsAPI
	reached chan []api.DeliverySubject
	release <-chan struct{}
	results chan error
}

func (b physicalMemoryDeliveryBarrier) WithDelivery(ctx context.Context, id api.RequestIdentity, subjects []api.DeliverySubject, write func(context.Context) error) error {
	copyOfSubjects := append([]api.DeliverySubject(nil), subjects...)
	select {
	case b.reached <- copyOfSubjects:
	case <-ctx.Done():
		return ctx.Err()
	}
	select {
	case <-b.release:
	case <-ctx.Done():
		return ctx.Err()
	}
	err := b.EventsAPI.WithDelivery(ctx, id, subjects, write)
	b.results <- err
	return err
}

func TestPhysicalStdioMemoryDeliveryRechecksRealSQLAfterForget(t *testing.T) {
	const fact = "private physical delivery sentinel"
	for _, forget := range []bool{false, true} {
		name := "current"
		if forget {
			name = "forgotten"
		}
		t.Run(name, func(t *testing.T) {
			ctx := context.Background()
			owner := api.NewConnectionIdentity("physical-memory-delivery", "owner", true)
			root := privateRoot(t)
			core, err := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: memoryRuntimeEngine{run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
				return api.EngineResult{Status: "finished", Text: "completed"}, nil
			}}})
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { memoryRuntimeStop(t, core) })
			meta := func(key, revision string) api.CommandMeta { return memoryRuntimeMeta(t, core, owner, key, revision) }
			agent, err := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "physical delivery owner", Persona: "fixed persona"}})
			if err != nil {
				t.Fatal(err)
			}
			ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
			catalog, err := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: meta("read", "").ProfileID, Namespace: ns, Kind: "item"})
			if err != nil {
				t.Fatal(err)
			}
			scope := api.MemoryScope{Kind: "profile"}
			item, err := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{CommandMeta: meta("add", catalog.NamespaceRevision), Namespace: ns, Action: "add", Scope: &scope, Text: fact})
			if err != nil || item.Body == nil || item.Body.Text != fact {
				t.Fatal("real private item was not written", item, err)
			}
			session, err := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
			if err != nil {
				t.Fatal(err)
			}
			run, err := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("run", session.Revision), SessionID: session.ID, Intent: "recall the current private fact", SourceRefs: []api.SourceSnapshot{}})
			if err != nil {
				t.Fatal(err)
			}
			memoryRuntimeWait(t, core, owner, run.RunID, "succeeded")
			profileID := meta("read-context", "").ProfileID
			contextObject, err := core.API.Memory.Get(ctx, owner, api.MemoryGet{ProfileID: profileID, Namespace: ns, Kind: "context", ID: run.RunID, Limit: 50})
			if err != nil || contextObject.Context == nil || contextObject.Context.State != "sealed" {
				t.Fatal("real sealed context unavailable", contextObject, err)
			}
			entryID := ""
			for _, entry := range contextObject.Context.Entries {
				if entry.Kind == "memory_recall" && entry.Text != nil && *entry.Text == fact && entry.Source != nil && entry.Source.ID == item.RevisionID {
					entryID = entry.ID
				}
			}
			if entryID == "" {
				t.Fatal("real sealed context did not recall the private revision", contextObject.Context)
			}
			forgetMeta := meta("forget", item.Revision)
			observed := make(chan api.MemoryObject, 2)
			actualMemory := core.API.Memory
			core.API.Memory = physicalMemoryObserver{MemoryAPI: actualMemory, observed: observed}
			reached := make(chan []api.DeliverySubject, 1)
			release := make(chan struct{})
			var releaseOnce sync.Once
			unblock := func() { releaseOnce.Do(func() { close(release) }) }
			results := make(chan error, 1)
			core.API.Events = physicalMemoryDeliveryBarrier{EventsAPI: core.API.Events, reached: reached, release: release, results: results}
			client, serverConn := net.Pipe()
			if err := client.SetDeadline(time.Now().Add(6 * time.Second)); err != nil {
				t.Fatal(err)
			}
			server := stdio.New(serverConn, serverConn, core.API, owner)
			done := make(chan error, 1)
			go func() { done <- server.Run(context.Background()) }()
			t.Cleanup(func() {
				unblock()
				_ = client.Close()
				server.Close()
				select {
				case <-done:
				case <-time.After(3 * time.Second):
					t.Error("stdio server did not stop")
				}
			})
			hello(t, client)
			wireNamespace := map[string]string{"kind": ns.Kind, "id": ns.ID}
			send(t, client, []any{
				request("c:item", "memory.get", map[string]any{"profileId": profileID, "namespace": wireNamespace, "kind": "item", "id": item.ID}),
				request("c:context", "memory.get", map[string]any{"profileId": profileID, "namespace": wireNamespace, "kind": "context", "id": run.RunID, "limit": 50}),
			})
			var subjects []api.DeliverySubject
			select {
			case subjects = <-reached:
			case <-time.After(time.Second):
				t.Fatal("real stdio write did not reach delivery gate")
			}
			if len(subjects) < 2 {
				t.Fatal("expected actual item and context proof", subjects)
			}
			proofs := map[string]bool{}
			for _, subject := range subjects {
				proofs[subject.Kind+":"+subject.ID] = true
			}
			if !proofs["memory_revision:"+item.RevisionID] || !proofs["context_entry:"+entryID] {
				t.Fatal("real Kind+ID subjects lost", subjects)
			}
			seenItem, seenContext := false, false
			for range 2 {
				select {
				case object := <-observed:
					if object.Item != nil && object.Item.Body != nil && object.Item.Body.Text == fact && object.Item.RevisionID == item.RevisionID {
						seenItem = true
					}
					if object.Context != nil {
						for _, entry := range object.Context.Entries {
							if entry.ID == entryID && entry.Text != nil && *entry.Text == fact {
								seenContext = true
							}
						}
					}
				case <-time.After(time.Second):
					t.Fatal("old body was not returned before the physical gate")
				}
			}
			if !seenItem || !seenContext {
				t.Fatal("old response lacked both protected bodies", seenItem, seenContext)
			}
			if forget {
				forgotten, err := actualMemory.Forget(ctx, owner, api.MemoryForget{CommandMeta: forgetMeta, Namespace: ns, ID: item.ID})
				if err != nil || forgotten.State != "forgotten" || forgotten.Body != nil {
					t.Fatal("public Forget did not commit before physical write", forgotten, err)
				}
			}
			unblock()
			responses := receive(t, client)
			if len(responses) != 2 {
				t.Fatal("batch response count", len(responses))
			}
			select {
			case gateErr := <-results:
				if forget {
					var fault *api.Fault
					if !errors.As(gateErr, &fault) || fault.Reason != "MEMORY_FORGOTTEN" && fault.Reason != "MEMORY_REVISION_INACTIVE" {
						t.Fatal("real SQL gate did not reject forgotten body", gateErr)
					}
				} else if gateErr != nil {
					t.Fatal("current real SQL gate rejected body", gateErr)
				}
			case <-time.After(time.Second):
				t.Fatal("real SQL gate did not return")
			}
			for _, response := range responses {
				if forget {
					if response.Error == nil || len(response.Result) != 0 || bytes.Contains(response.Result, []byte(fact)) {
						t.Fatal("forgotten body escaped in stdio frame", response)
					}
				} else if response.Error != nil || !bytes.Contains(response.Result, []byte(fact)) {
					t.Fatal("current body did not cross physical stdio", response)
				}
			}
		})
	}
}
