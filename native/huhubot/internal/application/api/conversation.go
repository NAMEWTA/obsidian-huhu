package api

import "context"

type Session struct {
	GroupMembers  []GroupMember `json:"groupMembers,omitempty"`
	ID            string        `json:"id"`
	Revision      string        `json:"revision"`
	Kind          string        `json:"kind"`
	Title         string        `json:"title"`
	MemberIDs     []string      `json:"memberIds"`
	CoordinatorID string        `json:"coordinatorId,omitempty"`
	Archived      bool          `json:"archived"`
	WorkspaceID   string        `json:"workspaceId,omitempty"`
}
type SessionCreate struct {
	CommandMeta
	Kind          string   `json:"kind"`
	Title         string   `json:"title"`
	MemberIDs     []string `json:"memberIds"`
	CoordinatorID string   `json:"coordinatorId,omitempty"`
	WorkspaceID   string   `json:"workspaceId,omitempty"`
}
type SessionArchive struct {
	CommandMeta
	ID string `json:"id"`
}
type SessionPage struct {
	Items      []Session `json:"items"`
	NextCursor string    `json:"nextCursor,omitempty"`
}
type HistoryQuery struct {
	PageQuery
	SessionID string `json:"sessionId"`
}

// MessageAttachments preserve the user's submitted labels and capture identity.
// They contain no source body and confer no model access permission.
type MessageAttachments struct {
	SourceRefs   []SourceSnapshot `json:"sourceRefs"`
	SourceScopes []SourceScope    `json:"sourceScopes"`
}
type VisibleMessage struct {
	Attachments         *MessageAttachments `json:"attachments,omitempty"`
	Seq                 string              `json:"seq,omitempty"`
	RunID               string              `json:"runId,omitempty"`
	ID                  string              `json:"id"`
	SessionID           string              `json:"sessionId"`
	Role                string              `json:"role"`
	Text                string              `json:"text"`
	CreatedAt           string              `json:"createdAt"`
	AgentID             string              `json:"agentId,omitempty"`
	SourceRefs          []SourceSnapshot    `json:"sourceRefs"`
	Partial             bool                `json:"partial,omitempty"`
	SupersedesMessageID string              `json:"supersedesMessageId,omitempty"`
}
type MessagePage struct {
	Items            []VisibleMessage  `json:"items"`
	NextCursor       string            `json:"nextCursor,omitempty"`
	DeliverySubjects []DeliverySubject `json:"-"`
}
type ModelHistory struct {
	Derived  []DerivedInput
	Messages []VisibleMessage
	Sources  []SourceSnapshot
	Scopes   []SourceScope
	GrantIDs []string
}
type RunUsage struct {
	Knowledge    string `json:"knowledge,omitempty"`
	InputTokens  string `json:"inputTokens,omitempty"`
	OutputTokens string `json:"outputTokens,omitempty"`
	Estimated    bool   `json:"estimated"`
}
type Run struct {
	ContextUsage         *ContextUsage    `json:"contextUsage,omitempty"`
	Recovery             *RecoveryStatus  `json:"recovery,omitempty"`
	Role                 string           `json:"role,omitempty"`
	Group                *GroupBinding    `json:"group,omitempty"`
	Limits               *ExecutionLimits `json:"limits,omitempty"`
	BudgetRootRunID      string           `json:"budgetRootRunId,omitempty"`
	ID                   string           `json:"id"`
	SessionID            string           `json:"sessionId"`
	Status               string           `json:"status"`
	Revision             string           `json:"revision"`
	AgentID              string           `json:"agentId"`
	PersonaRevision      string           `json:"personaRevision"`
	ModelBindingRevision string           `json:"modelBindingRevision"`
	ParentRunID          string           `json:"parentRunId,omitempty"`
	RootRunID            string           `json:"rootRunId,omitempty"`
	RetryOfRunID         string           `json:"retryOfRunId,omitempty"`
	EffectsUnresolved    bool             `json:"effectsUnresolved,omitempty"`
	Reason               string           `json:"reason,omitempty"`
	Usage                *RunUsage        `json:"usage,omitempty"`
}
type RunStart struct {
	CommandMeta
	SessionID           string           `json:"sessionId"`
	Intent              string           `json:"intent"`
	SourceRefs          []SourceSnapshot `json:"sourceRefs"`
	SourceScopes        []SourceScope    `json:"sourceScopes,omitempty"`
	GrantIDs            []string         `json:"grantIds,omitempty"`
	SupersedesMessageID string           `json:"supersedesMessageId,omitempty"`
	TargetAgentIDs      []string         `json:"targetAgentIds,omitempty"`
	WorkspaceID         string           `json:"workspaceId,omitempty"`
	OriginClientID      string           `json:"originClientId,omitempty"`
	OriginViewID        string           `json:"originViewId,omitempty"`
	HostConnectionID    string           `json:"hostConnectionId,omitempty"`
	HostLeaseEpoch      string           `json:"hostLeaseEpoch,omitempty"`
	RetryOfRunID        string           `json:"retryOfRunId,omitempty"`
}
type RunReceipt struct {
	TargetRunIDs []string `json:"targetRunIds,omitempty"`
	Receipt
	RunID  string `json:"runId"`
	Status string `json:"status"`
}
type ConversationAPI interface {
	CreateSession(context.Context, RequestIdentity, SessionCreate) (Session, error)
	ListSessions(context.Context, RequestIdentity, PageQuery) (SessionPage, error)
	GetSession(context.Context, RequestIdentity, IDQuery) (Session, error)
	History(context.Context, RequestIdentity, HistoryQuery) (MessagePage, error)
	ModelHistory(context.Context, RequestIdentity, HistoryQuery, RunAccessInput) (ModelHistory, error)
	Archive(context.Context, RequestIdentity, SessionArchive) (Session, error)
	StartRun(context.Context, RequestIdentity, RunStart) (RunReceipt, error)
	GetRun(context.Context, RequestIdentity, IDQuery) (Run, error)
}

// Engine messages are HUHU values, never SDK events or public CP bytes.
type EngineInput struct {
	Memory                   *ExecutionMemoryInput `json:"Memory,omitempty"`
	ShortTerm                *ShortTermInput       `json:"ShortTerm,omitempty"`
	Messages                 []AgentMessage
	Delegation               *DelegationInput
	RunID, SessionID, Intent string
	Agent                    Agent
	History                  []VisibleMessage
	Context                  PreparedContext
	Tools                    ToolInvoker
	Checkpoints              CheckpointAccess
	Attempts                 ModelAttempts
	Config                   TaskConfigSnapshot
	Lineage                  ExecutionLineage
}
type EngineResumeInput struct {
	Input         EngineInput
	CheckpointRef string
	Checkpoint    CheckpointArtifact
	Decision      ToolResult
}
type EngineEvent struct{ Type, Text string }
type EngineResult struct {
	MemoryCandidates     *MemoryCandidateSet `json:"MemoryCandidates,omitempty"`
	Status, Text, Reason string
	Partial              bool
	Usage                RunUsage
	CheckpointRef        string
	Suspension           *EngineSuspension
	Children             []TaskOutcome
}
type Engine interface {
	Run(context.Context, EngineInput, func(EngineEvent) error) (EngineResult, error)
	Resume(context.Context, EngineResumeInput, func(EngineEvent) error) (EngineResult, error)
}

// SessionDataAPI owns destructive previews and body deletion. Unknown effects
// retain only metadata needed for receipt reconciliation, never executable CPs.
type SessionDelete struct {
	CommandMeta
	ID              string   `json:"id,omitempty"`
	PreviewToken    string   `json:"previewToken"`
	RetainMemoryIDs []string `json:"retainMemoryIds,omitempty"`
}
type SessionDataAPI interface {
	DeletePreview(context.Context, RequestIdentity, IDQuery) (DeletionPreview, error)
	Delete(context.Context, RequestIdentity, SessionDelete) (Receipt, error)
}
