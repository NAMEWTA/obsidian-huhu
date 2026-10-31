package events_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type readHost struct{}

func (readHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY_HOST")
}
func (readHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY_HOST")
}
func (readHost) Read(_ context.Context, q api.HostReadRequest) (api.HostReadResult, error) {
	return api.HostReadResult{Source: q.Source, Text: "PRIVATE_SOURCE", Format: "text/markdown"}, nil
}
func (readHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{}, api.Denied("NO_SEARCH_FIXTURE")
}
func (f *fixture) sourceRun(t *testing.T, expiry string) api.Grant {
	t.Helper()
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://fixture.invalid/v1", Capabilities: []string{"text"}}
	agent, e := f.c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: f.meta("configured-agent", ""), Draft: api.AgentDraft{Name: "Event source", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	lease, e := f.c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:events", Capabilities: []string{"note.read", "note.search"}}, readHost{})
	if e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256([]byte("PRIVATE_SOURCE"))
	source := api.SourceSnapshot{ResourceID: "source:private", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}
	recipient := api.GrantRecipient{AgentID: agent.ID, ModelBindingRevision: agent.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
	grant, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta("source-grant", ""), WorkspaceID: lease.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{"read", "send"}, ExpiresAt: expiry})
	if e != nil {
		t.Fatal(e)
	}
	f.session, e = f.c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("source-session", ""), Kind: "direct", Title: "Source events", MemberIDs: []string{agent.ID}, WorkspaceID: lease.WorkspaceID})
	if e != nil {
		t.Fatal(e)
	}
	f.run, e = f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("source-run", f.session.Revision), SessionID: f.session.ID, Intent: "private", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	// The independent fixture connection must not write synthetic events while
	// the active executor is advancing this Run in its own read/write transaction.
	if !f.executorPaused {
		f.waitTerminal(t, f.run.RunID)
	}
	f.append(t, "delta", "DERIVED_PRIVATE")
	return grant
}
func (f *fixture) revoke(t *testing.T, g api.Grant) {
	t.Helper()
	_, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("source-revoke", g.Revision), ID: g.ID})
	if e != nil {
		t.Fatal(e)
	}
}

func TestQueuedBodyIsReauthorizedAtActualDelivery(t *testing.T) {
	f := open(t)
	grant := f.sourceRun(t, "")
	page, e := f.c.API.Events.Tail(ctx, owner, f.tail("1"))
	if e != nil || page.Events[0].Text != "DERIVED_PRIVATE" {
		t.Fatal(page, e)
	}
	f.revoke(t, grant)
	delivered := false
	e = f.c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "run", ID: f.run.RunID}}, func(context.Context) error { delivered = true; return nil })
	if e == nil || delivered {
		t.Fatal("queued old authorization reached writer", e)
	}
	_, e = f.c.API.Events.Tail(ctx, owner, f.tail("0"))
	if e == nil {
		t.Fatal("tail ignored revocation")
	}
	_, e = f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	if e == nil {
		t.Fatal("snapshot bypassed revocation")
	}
}

func TestWaitRechecksExpiryWithoutGrantClockChange(t *testing.T) {
	f := open(t)
	expiry := time.Now().Add(400 * time.Millisecond)
	_ = f.sourceRun(t, expiry.UTC().Format(time.RFC3339Nano))
	var before, after int
	if e := f.db.QueryRow("SELECT revision FROM access_grants_clock WHERE singleton=1").Scan(&before); e != nil {
		t.Fatal(e)
	}
	q := f.tail("2")
	q.WaitMillis = 1000
	start := time.Now()
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e == nil || len(page.Events) != 0 || time.Since(start) > 900*time.Millisecond {
		t.Fatal("waiting tail ignored wall-clock expiry", page, e, time.Since(start))
	}
	if e = f.db.QueryRow("SELECT revision FROM access_grants_clock WHERE singleton=1").Scan(&after); e != nil || before != after {
		t.Fatal("expiry incorrectly depended on clock change", before, after, e)
	}
	called := false
	e = f.c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "run", ID: f.run.RunID}}, func(context.Context) error { called = true; return nil })
	if e == nil || called {
		t.Fatal("expired queued body reached writer", e)
	}
}

func TestDeliveryFenceOrdersRevocationAfterPhysicalCompletionWithoutHoldingSQL(t *testing.T) {
	f := open(t)
	grant := f.sourceRun(t, "")
	entered, release := make(chan struct{}), make(chan struct{})
	released := false
	defer func() {
		if !released {
			close(release)
		}
	}()
	delivered := make(chan error, 1)
	completed := join(t, delivered)
	go func() {
		delivered <- f.c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "run", ID: f.run.RunID}}, func(permit context.Context) error {
			close(entered)
			// The same single application SQL connection must remain available during I/O.
			_, e := f.c.API.Service.Status(permit, owner)
			if e != nil {
				return e
			}
			select {
			case <-release:
				return nil
			case <-permit.Done():
				return permit.Err()
			}
		})
	}()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("delivery did not enter")
	}
	revoke := api.GrantRevoke{CommandMeta: f.meta("ordered-revoke", grant.Revision), ID: grant.ID}
	competing, cancel := context.WithTimeout(ctx, 50*time.Millisecond)
	_, e := f.c.API.Grants.Revoke(competing, owner, revoke)
	cancel()
	if !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal("revoke did not wait behind the active physical delivery", e)
	}
	var grantState string
	if e = f.db.QueryRow("SELECT state FROM access_grants WHERE grant_id=?", grant.ID).Scan(&grantState); e != nil || grantState != "active" {
		t.Fatal("revoke committed before physical delivery completed", grantState, e)
	}
	close(release)
	released = true
	if e = completed(); e != nil {
		t.Fatal(e)
	}
	if _, e = f.c.API.Grants.Revoke(ctx, owner, revoke); e != nil {
		t.Fatal(e)
	}
	if e := f.c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "run", ID: f.run.RunID}}, func(context.Context) error { t.Error("postcommit old body delivered"); return nil }); e == nil {
		t.Fatal("postcommit permit granted")
	}
}

func TestPermitExpiresAndReleasesGateBeforeLaterRevocation(t *testing.T) {
	f := open(t)
	grant := f.sourceRun(t, "")
	start := time.Now()
	e := f.c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "run", ID: f.run.RunID}}, func(permit context.Context) error { <-permit.Done(); return permit.Err() })
	if !errors.Is(e, context.DeadlineExceeded) || time.Since(start) > 750*time.Millisecond {
		t.Fatal("unbounded permit", e, time.Since(start))
	}
	f.revoke(t, grant)
}
