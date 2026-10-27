package grants

import "time"

type Recipient struct {
	AgentID, ModelBindingRevision, ProviderID, ModelID, Protocol, Endpoint string
	SubjectKind, SponsorAgentID, ConfigurationHash                         string
}
type ResourceScope struct{ Kind, ResourceID string }
type Grant struct {
	PrincipalID, WorkspaceID, SessionID, TaskID, State string
	Scope                                              ResourceScope
	Operations                                         []string
	Recipients                                         []Recipient
	ExpiresAt                                          time.Time
}
type Request struct {
	PrincipalID, WorkspaceID, SessionID, TaskID, Operation string
	Recipient                                              Recipient
	Scopes                                                 []ResourceScope
}

// Authorize checks one persisted grant against a current consumer. Scopes must
// come from captured Host scope identities; a path prefix never proves inclusion.
func Authorize(g Grant, r Request, now time.Time) string {
	if r.PrincipalID == "" || g.PrincipalID != r.PrincipalID {
		return "GRANT_SUBJECT_MISMATCH"
	}
	if g.WorkspaceID == "" || g.WorkspaceID != r.WorkspaceID {
		return "WORKSPACE_MISMATCH"
	}
	if g.State != "active" {
		return "GRANT_REVOKED"
	}
	if !g.ExpiresAt.IsZero() && !now.Before(g.ExpiresAt) {
		return "GRANT_EXPIRED"
	}
	if g.SessionID != "" && g.SessionID != r.SessionID {
		return "SESSION_SCOPE_MISMATCH"
	}
	if g.TaskID != "" && g.TaskID != r.TaskID {
		return "TASK_SCOPE_MISMATCH"
	}
	found := false
	for _, scope := range r.Scopes {
		if scope == g.Scope && scope.ResourceID != "" {
			found = true
		}
	}
	if !found {
		return "SOURCE_NOT_GRANTED"
	}
	found = false
	for _, operation := range g.Operations {
		if operation != "" && operation == r.Operation {
			found = true
		}
	}
	if !found {
		return "OPERATION_NOT_GRANTED"
	}
	for _, recipient := range g.Recipients {
		if recipient == r.Recipient && recipient.AgentID != "" && recipient.Endpoint != "" {
			return ""
		}
	}
	return "RECIPIENT_NOT_GRANTED"
}
