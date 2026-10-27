package grants_test

import (
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/grants"
)

func TestGrantRequiresCurrentSubjectScopeAndRecipientIntersection(t *testing.T) {
	now := time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC)
	recipient := grants.Recipient{AgentID: "agent:a", ModelBindingRevision: "7", ProviderID: "provider", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://model.invalid/v1"}
	g := grants.Grant{PrincipalID: "user:a", WorkspaceID: "workspace:a", SessionID: "session:a", TaskID: "task:a", State: "active", Scope: grants.ResourceScope{Kind: "source", ResourceID: "resource:chosen"}, Operations: []string{"read"}, Recipients: []grants.Recipient{recipient}, ExpiresAt: now.Add(time.Minute)}
	r := grants.Request{PrincipalID: g.PrincipalID, WorkspaceID: g.WorkspaceID, SessionID: g.SessionID, TaskID: g.TaskID, Operation: "read", Recipient: recipient, Scopes: []grants.ResourceScope{g.Scope}}
	if reason := grants.Authorize(g, r, now); reason != "" {
		t.Fatal(reason)
	}
	for _, test := range []struct {
		name, want string
		change     func(*grants.Grant, *grants.Request)
	}{
		{"scope", "SOURCE_NOT_GRANTED", func(_ *grants.Grant, r *grants.Request) {
			r.Scopes = []grants.ResourceScope{{Kind: "source", ResourceID: "resource:third"}}
		}},
		{"workspace", "WORKSPACE_MISMATCH", func(_ *grants.Grant, r *grants.Request) { r.WorkspaceID = "workspace:b" }},
		{"principal", "GRANT_SUBJECT_MISMATCH", func(_ *grants.Grant, r *grants.Request) { r.PrincipalID = "user:b" }},
		{"revoked", "GRANT_REVOKED", func(g *grants.Grant, _ *grants.Request) { g.State = "revoked" }},
		{"expired", "GRANT_EXPIRED", func(g *grants.Grant, _ *grants.Request) { g.ExpiresAt = now }},
		{"session", "SESSION_SCOPE_MISMATCH", func(_ *grants.Grant, r *grants.Request) { r.SessionID = "session:b" }},
		{"task", "TASK_SCOPE_MISMATCH", func(_ *grants.Grant, r *grants.Request) { r.TaskID = "task:b" }},
		{"operation", "OPERATION_NOT_GRANTED", func(_ *grants.Grant, r *grants.Request) { r.Operation = "send" }},
		{"agent", "RECIPIENT_NOT_GRANTED", func(_ *grants.Grant, r *grants.Request) { r.Recipient.AgentID = "agent:more-powerful" }},
		{"endpoint", "RECIPIENT_NOT_GRANTED", func(_ *grants.Grant, r *grants.Request) { r.Recipient.Endpoint = "https://other.invalid/v1" }},
		{"model-revision", "RECIPIENT_NOT_GRANTED", func(_ *grants.Grant, r *grants.Request) { r.Recipient.ModelBindingRevision = "8" }},
	} {
		t.Run(test.name, func(t *testing.T) {
			cg, cr := g, r
			test.change(&cg, &cr)
			if got := grants.Authorize(cg, cr, now); got != test.want {
				t.Fatalf("got %q, want %q", got, test.want)
			}
		})
	}
}
