package api

import (
	"context"
	"testing"
	"time"
)

type renewalRemote struct{}

func (renewalRemote) Invoke(context.Context, HostInvokeCommand) (HostReceipt, error) {
	return HostReceipt{}, nil
}
func (renewalRemote) QueryReceipt(context.Context, HostReceiptQuery) (HostReceipt, error) {
	return HostReceipt{}, nil
}

func TestHostRenewalPreservesLiveAuthorityAndRejectsEscalation(t *testing.T) {
	h := NewHostService()
	now := time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC)
	h.now = func() time.Time { return now }
	owner := NewConnectionIdentity("one", "owner", true)
	command := HostAttachCommand{WorkspaceID: "vault", Capabilities: []string{"note.read"}}
	first, err := h.Attach(context.Background(), owner, command, renewalRemote{})
	if err != nil { t.Fatal(err) }
	now = now.Add(4 * time.Minute)
	command.RenewLeaseID = first.LeaseID
	next, err := h.Attach(context.Background(), owner, command, renewalRemote{})
	if err != nil || next.LeaseID != first.LeaseID || next.LeaseEpoch != first.LeaseEpoch || !parseTime(next.ExpiresAt).After(parseTime(first.ExpiresAt)) {
		t.Fatalf("renewal invalidated live sources: %#v -> %#v: %v", first, next, err)
	}
	if _, err = h.Attach(context.Background(), NewConnectionIdentity("other", "owner", true), command, renewalRemote{}); err == nil { t.Fatal("another connection renewed the lease") }
	command.Capabilities = append(command.Capabilities, "note.write")
	if _, err = h.Attach(context.Background(), owner, command, renewalRemote{}); err == nil { t.Fatal("renewal expanded authority") }
	command.Capabilities = []string{"note.read"}
	now = now.Add(6 * time.Minute)
	if _, err = h.Attach(context.Background(), owner, command, renewalRemote{}); err == nil { t.Fatal("expired source authority was revived") }
}
