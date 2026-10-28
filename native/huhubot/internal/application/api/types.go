// Package api is the entrance-neutral application contract. It only uses the standard library.
package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

type Fault struct {
	Kind, Reason string
	Retryable    bool
	Details      *EventCursorRecovery
}

func (e *Fault) Error() string    { return e.Kind + ": " + e.Reason }
func Denied(reason string) error  { return &Fault{Kind: "CAPABILITY_DENIED", Reason: reason} }
func Invalid(reason string) error { return &Fault{Kind: "INVALID_ARGUMENT", Reason: reason} }
func NewID(prefix string) string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Errorf("secure identity unavailable: %w", err))
	}
	return prefix + hex.EncodeToString(b[:])
}

// RequestIdentity is established by the transport constructor, never decoded from payload.
// managed means a child stdio connection whose parent owns this Runner lifecycle.
type RequestIdentity struct {
	connectionID, principalID string
	managed                   bool
}

func NewConnectionIdentity(connectionID, principalID string, managed bool) RequestIdentity {
	return RequestIdentity{connectionID, principalID, managed}
}
func (i RequestIdentity) ConnectionID() string { return i.connectionID }
func (i RequestIdentity) PrincipalID() string  { return i.principalID }
func (i RequestIdentity) ManagedOwner() bool {
	return i.managed && i.connectionID != "" && i.principalID != ""
}
func (i RequestIdentity) Valid() bool { return i.connectionID != "" && i.principalID != "" }

type ProfileMetadata struct{ ProfileID, CommandEpoch, Revision, CreatedAt string }
type ProfileReader interface {
	ReadMetadata(context.Context) (ProfileMetadata, error)
}
type CleanupStatus struct {
	Profile    bool     `json:"profile"`
	SessionIDs []string `json:"sessionIds"`
}
type ServiceStatus struct {
	Cleanup      *CleanupStatus
	State        string
	Profile      ProfileMetadata
	HostAttached bool
}
type Diagnostics struct {
	ActiveConnections int
	HostAttached      bool
}
type ServiceAPI interface {
	Health(context.Context, RequestIdentity) error
	Status(context.Context, RequestIdentity) (ServiceStatus, error)
	Diagnostics(context.Context, RequestIdentity) (Diagnostics, error)
	Shutdown(context.Context, RequestIdentity) error
	Stopping() bool
}
type HostAttachCommand struct {
	WorkspaceID  string
	Capabilities []string
	RenewLeaseID string
}
type HostLease struct {
	LeaseID          string   `json:"leaseId"`
	WorkspaceID      string   `json:"workspaceId"`
	HostConnectionID string   `json:"hostConnectionId"`
	LeaseEpoch       string   `json:"leaseEpoch"`
	Capabilities     []string `json:"capabilities"`
	ExpiresAt        string   `json:"expiresAt"`
}
type HostResource struct {
	ResourceID string `json:"resourceId"`
	Revision   string `json:"revision,omitempty"`
}
type HostInvokeCommand struct {
	ProfileID        string          `json:"profileId"`
	CommandEpoch     string          `json:"commandEpoch"`
	LeaseID          string          `json:"leaseId"`
	HostConnectionID string          `json:"hostConnectionId"`
	LeaseEpoch       string          `json:"leaseEpoch"`
	WorkspaceID      string          `json:"workspaceId"`
	Capability       string          `json:"capability"`
	EffectID         string          `json:"effectId"`
	Resource         HostResource    `json:"resource"`
	ExpectedRevision string          `json:"expectedRevision,omitempty"`
	Content          string          `json:"content"`
	Preview          ApprovalPreview `json:"preview"`
	RunID            string          `json:"runId"`
	ApprovalID       string          `json:"approvalId"`
	ApprovalRevision string          `json:"approvalRevision"`
	ExpiresAt        string          `json:"expiresAt"`
	Fingerprint      string          `json:"fingerprint"`
}
type HostReceiptQuery struct {
	ProfileID        string          `json:"profileId"`
	CommandEpoch     string          `json:"commandEpoch"`
	LeaseID          string          `json:"leaseId"`
	HostConnectionID string          `json:"hostConnectionId"`
	LeaseEpoch       string          `json:"leaseEpoch"`
	WorkspaceID      string          `json:"workspaceId"`
	EffectID         string          `json:"effectId"`
	Fingerprint      string          `json:"fingerprint"`
	Preview          ApprovalPreview `json:"preview"`
}
type HostReceipt struct {
	EffectID    string `json:"effectId"`
	Status      string `json:"status"`
	Revision    string `json:"revision,omitempty"`
	ReceiptID   string `json:"receiptId,omitempty"`
	Fingerprint string `json:"fingerprint,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

// HostRemote is a consumer port. Wire DTOs and transport state stay in adapters.
type HostRemote interface {
	Invoke(context.Context, HostInvokeCommand) (HostReceipt, error)
	QueryReceipt(context.Context, HostReceiptQuery) (HostReceipt, error)
}
type HostAPI interface {
	HostReadAPI
	HostWriteAPI
	Attach(context.Context, RequestIdentity, HostAttachCommand, HostRemote) (HostLease, error)
	Detach(context.Context, RequestIdentity, string) error
	Disconnect(RequestIdentity)
	Attached() bool
	Invoke(context.Context, HostInvokeCommand) (HostReceipt, error)
	QueryReceipt(context.Context, HostReceiptQuery) (HostReceipt, error)
}

// Facade composes narrow services; it neither owns SQL nor provider state.
type Facade struct {
	Memory        MemoryAPI
	GlobalMemory  GlobalMemoryAPI
	Recovery      RecoveryAPI
	Groups        GroupsAPI
	Service       ServiceAPI
	Host          HostAPI
	Assistant     AssistantAPI
	Grants        GrantsAPI
	Context       ContextAccess
	Conversation  ConversationAPI
	Events        EventsAPI
	Approvals     ApprovalsAPI
	Collaboration CollaborationAPI
	Messages      MessagesAPI
	Effects       EffectsAPI
	Profile       ProfileAPI
	Data          SessionDataAPI
}
