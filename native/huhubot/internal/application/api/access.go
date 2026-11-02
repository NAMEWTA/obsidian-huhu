package api

import "context"

type SourceRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}
type SourceSnapshot struct {
	ResourceID       string       `json:"resourceId"`
	Kind             string       `json:"kind"`
	WorkspaceID      string       `json:"workspaceId"`
	OriginClientID   string       `json:"originClientId"`
	OriginViewID     string       `json:"originViewId"`
	HostConnectionID string       `json:"hostConnectionId"`
	HostLeaseID      string       `json:"hostLeaseId"`
	HostLeaseEpoch   string       `json:"hostLeaseEpoch"`
	Revision         string       `json:"revision"`
	Hash             string       `json:"hash"`
	ScopeResourceIDs []string     `json:"scopeResourceIds"`
	Title            string       `json:"title,omitempty"`
	Range            *SourceRange `json:"range,omitempty"`
}
type SourceScope struct {
	ResourceID       string `json:"resourceId"`
	Kind             string `json:"kind"`
	WorkspaceID      string `json:"workspaceId"`
	OriginClientID   string `json:"originClientId"`
	OriginViewID     string `json:"originViewId"`
	HostConnectionID string `json:"hostConnectionId"`
	HostLeaseID      string `json:"hostLeaseId"`
	HostLeaseEpoch   string `json:"hostLeaseEpoch"`
	Revision         string `json:"revision"`
	Hash             string `json:"hash"`
	Title            string `json:"title,omitempty"`
}
type GrantRecipient struct {
	SubjectKind          string `json:"subjectKind,omitempty"`
	SponsorAgentID       string `json:"sponsorAgentId,omitempty"`
	ConfigurationHash    string `json:"configurationHash,omitempty"`
	AgentID              string `json:"agentId"`
	ModelBindingRevision string `json:"modelBindingRevision"`
	ProviderID           string `json:"providerId"`
	ModelID              string `json:"modelId"`
	Protocol             string `json:"protocol"`
	Endpoint             string `json:"endpoint"`
}
type Grant struct {
	ID           string           `json:"id"`
	Revision     string           `json:"revision"`
	WorkspaceID  string           `json:"workspaceId"`
	Scope        string           `json:"scope"`
	ResourceID   string           `json:"resourceId"`
	RecipientIDs []string         `json:"recipientIds"`
	Recipients   []GrantRecipient `json:"recipients"`
	Operations   []string         `json:"operations"`
	SessionID    string           `json:"sessionId,omitempty"`
	TaskID       string           `json:"taskId,omitempty"`
	State        string           `json:"state"`
	ExpiresAt    string           `json:"expiresAt,omitempty"`
}
type GrantCreate struct {
	CommandMeta
	WorkspaceID string           `json:"workspaceId"`
	Scope       string           `json:"scope"`
	ResourceID  string           `json:"resourceId"`
	Recipients  []GrantRecipient `json:"recipients"`
	Operations  []string         `json:"operations"`
	SessionID   string           `json:"sessionId,omitempty"`
	TaskID      string           `json:"taskId,omitempty"`
	ExpiresAt   string           `json:"expiresAt,omitempty"`
}
type GrantRevoke struct {
	CommandMeta
	ID string `json:"id"`
}
type GrantPage struct {
	Items      []Grant `json:"items"`
	NextCursor string  `json:"nextCursor,omitempty"`
}
type GrantsAPI interface {
	Create(context.Context, RequestIdentity, GrantCreate) (Grant, error)
	List(context.Context, RequestIdentity, PageQuery) (GrantPage, error)
	Revoke(context.Context, RequestIdentity, GrantRevoke) (Receipt, error)
}
type HostReadRequest struct {
	LeaseID          string         `json:"leaseId"`
	HostConnectionID string         `json:"hostConnectionId"`
	LeaseEpoch       string         `json:"leaseEpoch"`
	WorkspaceID      string         `json:"workspaceId"`
	Source           SourceSnapshot `json:"source"`
	MaxBytes         int            `json:"maxBytes"`
}
type HostReadResult struct {
	Source    SourceSnapshot `json:"source"`
	Text      string         `json:"text"`
	Format    string         `json:"format"`
	Truncated bool           `json:"truncated"`
}
type HostSearchRequest struct {
	LeaseID          string           `json:"leaseId"`
	HostConnectionID string           `json:"hostConnectionId"`
	LeaseEpoch       string           `json:"leaseEpoch"`
	WorkspaceID      string           `json:"workspaceId"`
	Sources          []SourceSnapshot `json:"sources"`
	Scopes           []SourceScope    `json:"scopes"`
	Query            string           `json:"query"`
	Limit            int              `json:"limit"`
	MaxBytes         int              `json:"maxBytes"`
	Cursor           string           `json:"cursor,omitempty"`
}
type HostSearchMatch struct {
	Source SourceSnapshot `json:"source"`
	Text   string         `json:"text"`
	Range  SourceRange    `json:"range"`
}
type HostSearchResult struct {
	Matches    []HostSearchMatch `json:"matches"`
	Truncated  bool              `json:"truncated"`
	NextCursor string            `json:"nextCursor,omitempty"`
}
type HostReadRemote interface {
	Read(context.Context, HostReadRequest) (HostReadResult, error)
	Search(context.Context, HostSearchRequest) (HostSearchResult, error)
}
type HostReadAPI interface {
	HostReadRemote
	CurrentLease(context.Context) (HostLease, error)
}

// ParentScope is absent only for a user root intention. A nonnil empty scope
// grants no sources; it must be built from persisted parent facts, not JSON.
type AccessScope struct {
	Sources  []SourceSnapshot
	Scopes   []SourceScope
	GrantIDs []string
}
type RunAccessInput struct {
	// PublishedMessageID is verified against persistent publication facts by the read adapter.
	PublishedMessageID           string
	Group                        *GroupBinding
	ProfileID, SessionID, TaskID string
	Recipient                    GrantRecipient
	Sources                      []SourceSnapshot
	Scopes                       []SourceScope
	GrantIDs                     []string
	ParentScope                  *AccessScope
}
type PreparedSource struct {
	Source SourceSnapshot
	Text   string
}
type PreparedContext struct{ Sources []PreparedSource }
type ContextRecord struct {
	ID, Text string
	Sources  []SourceSnapshot
	Scopes   []SourceScope
	GrantIDs []string
}
type ContextAccess interface {
	AuthorizeAdmission(context.Context, RequestIdentity, RunAccessInput) error
	PrepareContext(context.Context, RequestIdentity, RunAccessInput) (PreparedContext, error)
	AuthorizeRead(context.Context, RequestIdentity, RunAccessInput) error
	FilterHistory(context.Context, RequestIdentity, RunAccessInput, []ContextRecord) ([]ContextRecord, error)
	FilterModelHistory(context.Context, RequestIdentity, RunAccessInput, []ContextRecord) ([]ContextRecord, error)
	Search(context.Context, RequestIdentity, RunAccessInput, string, int, ...string) (HostSearchResult, error)
}
