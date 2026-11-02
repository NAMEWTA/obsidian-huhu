package foundation_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// These entrance-neutral seams isolate transport union from the separate real
// SQLite/current-Grant tests. The wire, batch router and physical writer are the
// production implementations; no message label is inferred from the request.
type batchLabelHistory struct {
	api.ConversationAPI
	pages map[string]api.MessagePage
}

func TestStdioBatchAttachmentUnionKeepsExactScopesAndRejectsOverflow(t *testing.T) {
	for _, overflow := range []bool{false, true} {
		t.Run(fmt.Sprint("overflow-", overflow), func(t *testing.T) {
			source := batchLabelSource("source:one")
			scope := api.SourceScope{ResourceID: "scope:folder", Kind: "folder", WorkspaceID: source.WorkspaceID, OriginClientID: source.OriginClientID, OriginViewID: source.OriginViewID, HostConnectionID: source.HostConnectionID, HostLeaseID: source.HostLeaseID, HostLeaseEpoch: "1", Revision: "1", Hash: source.Hash}
			first := &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{source}, SourceScopes: []api.SourceScope{scope}}
			// This is a different captured identity even though its opaque resource ID
			// is equal. Both actually encoded labels require qualification.
			secondSource := source
			secondSource.OriginViewID = "other-view"
			second := &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{secondSource}, SourceScopes: []api.SourceScope{scope}}
			if overflow {
				first = &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}}
				for i := range 32 {
					first.SourceRefs = append(first.SourceRefs, batchLabelSource(fmt.Sprint("source:", i)))
				}
				second = &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{scope}}
			}
			root := privateRoot(t)
			core, e := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
			if e != nil {
				t.Fatal(e)
			}
			defer core.Close()
			calls := make(chan []api.DeliverySubject, 1)
			core.API.Conversation = batchLabelHistory{ConversationAPI: core.API.Conversation, pages: map[string]api.MessagePage{"first": batchLabelPage(first), "second": batchLabelPage(second)}}
			core.API.Events = batchLabelFence{EventsAPI: core.API.Events, calls: calls}
			client, conn := net.Pipe()
			_ = client.SetDeadline(time.Now().Add(5 * time.Second))
			server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("batch", "owner", false))
			done := make(chan error, 1)
			go func() { done <- server.Run(context.Background()) }()
			defer func() {
				client.Close()
				server.Close()
				select {
				case <-done:
				case <-time.After(3 * time.Second):
					t.Error("stdio goroutine did not stop")
				}
			}()
			hello(t, client)
			send(t, client, []any{request("c:one", "sessions.history", map[string]any{"profileId": "p", "sessionId": "session:one", "cursor": "first"}), request("c:two", "sessions.history", map[string]any{"profileId": "p", "sessionId": "session:one", "cursor": "second"})})
			responses := receive(t, client)
			if overflow {
				select {
				case <-calls:
					t.Fatal("truncated overflowing proof reached writer")
				default:
				}
				for _, r := range responses {
					if r.Error == nil || r.Error.Data.Reason != "GROUP_ATTACHMENT_LIMIT" || len(r.Result) > 0 {
						t.Fatal("overflow was not body-free", r)
					}
				}
			} else {
				select {
				case subjects := <-calls:
					if len(subjects) != 1 || subjects[0].Attachments == nil || len(subjects[0].Attachments.SourceRefs) != 2 || len(subjects[0].Attachments.SourceScopes) != 1 {
						t.Fatalf("exact union lost: %#v", subjects)
					}
				case <-time.After(time.Second):
					t.Fatal("missing union fence")
				}
				for _, r := range responses {
					if r.Error != nil {
						t.Fatal(r.Error)
					}
				}
			}
		})
	}
}

func (h batchLabelHistory) History(_ context.Context, _ api.RequestIdentity, q api.HistoryQuery) (api.MessagePage, error) {
	return h.pages[q.Cursor], nil
}

type batchLabelFence struct {
	api.EventsAPI
	calls   chan []api.DeliverySubject
	revoked bool
}

func (f batchLabelFence) WithDelivery(ctx context.Context, _ api.RequestIdentity, subjects []api.DeliverySubject, write func(context.Context) error) error {
	f.calls <- subjects
	for _, subject := range subjects {
		if f.revoked && subject.Attachments != nil && len(subject.Attachments.SourceRefs)+len(subject.Attachments.SourceScopes) > 0 {
			return api.Denied("GROUP_ATTACHMENT_REVOKED")
		}
	}
	return write(ctx)
}
func batchLabelSource(id string) api.SourceSnapshot {
	return api.SourceSnapshot{ResourceID: id, Kind: "note", WorkspaceID: "vault", OriginClientID: "client", OriginViewID: "view", HostConnectionID: "connection", HostLeaseID: "lease", HostLeaseEpoch: "1", Revision: "1", Hash: "sha256:" + strings.Repeat("a", 64), ScopeResourceIDs: []string{}, Title: "sensitive-label"}
}
func batchLabelPage(labels *api.MessageAttachments) api.MessagePage {
	m := api.VisibleMessage{ID: "message:one", RunID: "run:one", Seq: "1", SessionID: "session:one", Role: "user", Text: "the user's own text", CreatedAt: "2026-10-25T00:00:00Z", SourceRefs: []api.SourceSnapshot{}, Attachments: labels}
	return api.MessagePage{Items: []api.VisibleMessage{m}, DeliverySubjects: []api.DeliverySubject{{Kind: "message", ID: m.ID, Attachments: labels}}}
}
func TestStdioBatchMergesEveryEncodedAttachmentProof(t *testing.T) {
	source := batchLabelSource("source:one")
	labels := &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{source}, SourceScopes: []api.SourceScope{}}
	for _, order := range [][]string{{"empty", "labels"}, {"labels", "empty"}, {"labels", "labels"}} {
		for _, revoked := range []bool{false, true} {
			name := strings.Join(order, "-")
			if revoked {
				name += "-revoked"
			}
			t.Run(name, func(t *testing.T) {
				root := privateRoot(t)
				core, e := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
				if e != nil {
					t.Fatal(e)
				}
				defer core.Close()
				calls := make(chan []api.DeliverySubject, 1)
				core.API.Conversation = batchLabelHistory{ConversationAPI: core.API.Conversation, pages: map[string]api.MessagePage{"empty": batchLabelPage(nil), "labels": batchLabelPage(labels)}}
				core.API.Events = batchLabelFence{EventsAPI: core.API.Events, calls: calls, revoked: revoked}
				client, conn := net.Pipe()
				_ = client.SetDeadline(time.Now().Add(5 * time.Second))
				server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("batch", "owner", false))
				done := make(chan error, 1)
				go func() { done <- server.Run(context.Background()) }()
				defer func() {
					client.Close()
					server.Close()
					select {
					case <-done:
					case <-time.After(3 * time.Second):
						t.Error("stdio process goroutine did not stop")
					}
				}()
				hello(t, client)
				send(t, client, []any{request("c:one", "sessions.history", map[string]any{"profileId": "profile:fixture", "sessionId": "session:one", "cursor": order[0]}), request("c:two", "sessions.history", map[string]any{"profileId": "profile:fixture", "sessionId": "session:one", "cursor": order[1]})})
				responses := receive(t, client)
				select {
				case subjects := <-calls:
					if len(subjects) != 1 || subjects[0].Attachments == nil || len(subjects[0].Attachments.SourceRefs) != 1 || subjects[0].Attachments.SourceRefs[0].OriginViewID != "view" {
						t.Fatalf("serialized proof lost: %#v", subjects)
					}
				case <-time.After(time.Second):
					t.Fatal("physical fence was not invoked")
				}
				if len(responses) != 2 {
					t.Fatal("batch result lost")
				}
				for _, r := range responses {
					if revoked {
						if r.Error == nil || r.Error.Data.Reason != "GROUP_ATTACHMENT_REVOKED" {
							t.Fatal("revoked labels physically delivered", r)
						}
						if len(r.Result) > 0 {
							t.Fatal("revoked result retained body")
						}
					} else {
						if r.Error != nil {
							t.Fatal(r.Error)
						}
						var page api.MessagePage
						if e = json.Unmarshal(r.Result, &page); e != nil || len(page.Items) != 1 {
							t.Fatal("bad page", e)
						}
					}
				}
			})
		}
	}
}

func TestGroupCapabilitiesFollowActualFacade(t *testing.T) {
	client, core, _ := running(t, false)
	core.API.Groups = nil
	h := hello(t, client)
	for _, method := range h.Capabilities {
		if method == "sessions.updateMembers" || method == "sessions.setCoordinator" {
			t.Fatal("advertised missing group consumer", method)
		}
	}
	send(t, client, request("c:missing-group", "sessions.updateMembers", map[string]any{}))
	reply := receive(t, client)[0]
	if reply.Error == nil || reply.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
		t.Fatal("missing consumer faked success", reply)
	}
}
