package api

import "context"

// TaskConfigSnapshot belongs to one execution identity, including temporary
// subjects. Sponsor is attribution, never an inherited permission or namespace.
type TaskConfigDraft struct {
	SponsorAgentID string     `json:"sponsorAgentId"`
	Draft          AgentDraft `json:"draft"`
}
type TaskConfigSnapshot struct {
	ID             string `json:"id"`
	SubjectID      string `json:"subjectId"`
	Kind           string `json:"kind"`
	SponsorAgentID string `json:"sponsorAgentId,omitempty"`
	Agent          Agent  `json:"agent"`
}
type DerivedInput struct {
	Kind         string `json:"kind"`
	ID           string `json:"id"`
	Revision     string `json:"revision"`
	Hash         string `json:"hash"`
	Namespace    string `json:"namespace"`
	WorkThreadID string `json:"workThreadId"`
}
type ExecutionLineage struct {
	Group                                                    *GroupBinding
	BudgetRootRunID                                          string
	DelegationID                                             string
	RootRunID, ParentRunID, WorkThreadID, ConfigSnapshotID   string
	SubjectID, SubjectKind, SponsorAgentID, CancelGeneration string
	Derived                                                  []DerivedInput
}
type ContextEnvelope struct {
	MessageIDs   []string         `json:"messageIds"`
	SourceRefs   []SourceSnapshot `json:"sourceRefs"`
	Excerpts     []ContextExcerpt `json:"excerpts"`
	ParentRunID  string           `json:"parentRunId,omitempty"`
	GrantIDs     []string         `json:"grantIds,omitempty"`
	SourceScopes []SourceScope    `json:"sourceScopes,omitempty"`
}
type ContextExcerpt struct {
	Text      string         `json:"text"`
	SourceRef SourceSnapshot `json:"sourceRef"`
}
type DelegationTarget struct {
	Kind    string      `json:"kind"`
	AgentID string      `json:"agentId,omitempty"`
	Draft   *AgentDraft `json:"draft,omitempty"`
}
type DelegateCommand struct {
	CommandMeta
	RunID          string           `json:"runId"`
	Target         DelegationTarget `json:"target"`
	Task           string           `json:"task"`
	Constraints    []string         `json:"constraints"`
	ExpectedOutput string           `json:"expectedOutput"`
	Context        ContextEnvelope  `json:"context"`
}
type Delegation struct {
	RequesterKind    string       `json:"requesterKind,omitempty"`
	Result           *TaskOutcome `json:"result,omitempty"`
	ID               string       `json:"id"`
	Revision         string       `json:"revision"`
	ParentRunID      string       `json:"parentRunId"`
	ChildRunID       string       `json:"childRunId"`
	RootRunID        string       `json:"rootRunId"`
	RequesterAgentID string       `json:"requesterAgentId"`
	ExecutorAgentID  string       `json:"executorAgentId"`
	WorkThreadID     string       `json:"workThreadId"`
	TargetAgentID    string       `json:"targetAgentId,omitempty"`
	Status           string       `json:"status"`
}
type TaskOutcome struct {
	RunID             string         `json:"runId"`
	Status            string         `json:"status"`
	Text              string         `json:"text"`
	Reason            string         `json:"reason,omitempty"`
	Partial           bool           `json:"partial"`
	EffectsUnresolved bool           `json:"effectsUnresolved"`
	Usage             *RunUsage      `json:"usage,omitempty"`
	Derived           []DerivedInput `json:"derived"`
}
type DirectoryEntry struct {
	Revision     string   `json:"revision"`
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Available    bool     `json:"available"`
	AllowedTools []string `json:"allowedTools"`
}
type DiscoverQuery struct {
	PageQuery
	RunID string `json:"runId,omitempty"`
}
type DirectoryPage struct {
	Items      []DirectoryEntry `json:"items"`
	NextCursor string           `json:"nextCursor,omitempty"`
}
type DelegationQuery struct {
	PageQuery
	RunID string `json:"runId"`
}
type DelegationPage struct {
	Items      []Delegation `json:"items"`
	NextCursor string       `json:"nextCursor,omitempty"`
}
type TaskCancel struct {
	CommandMeta
	ID    string `json:"id"`
	Scope string `json:"scope,omitempty"`
}
type CreateProposal struct {
	CommandMeta
	RunID string     `json:"runId"`
	Draft AgentDraft `json:"draft"`
}
type AgentProposal struct {
	Revision    string     `json:"revision"`
	PreviewHash string     `json:"previewHash"`
	ProposalID  string     `json:"proposalId"`
	Draft       AgentDraft `json:"draft"`
}
type AgentProposalPage struct {
	Items            []AgentProposal   `json:"items"`
	NextCursor       string            `json:"nextCursor,omitempty"`
	DeliverySubjects []DeliverySubject `json:"-"`
}
type ConfirmProposal struct {
	CommandMeta
	ProposalID  string `json:"proposalId"`
	PreviewHash string `json:"previewHash"`
}
type AgentMessage struct {
	ID           string `json:"id"`
	FromAgentID  string `json:"fromAgentId"`
	ToAgentID    string `json:"toAgentId"`
	Text         string `json:"text"`
	CreatedAt    string `json:"createdAt"`
	Kind         string `json:"kind"`
	Status       string `json:"status"`
	DelegationID string `json:"delegationId,omitempty"`
	QuestionID   string `json:"questionId,omitempty"`
	WorkThreadID string `json:"workThreadId"`
}
type MessageCommand struct {
	QuestionID string `json:"questionId,omitempty"`
	CommandMeta
	RunID         string           `json:"runId"`
	TargetAgentID string           `json:"targetAgentId"`
	Kind          string           `json:"kind"`
	Text          string           `json:"text"`
	SourceRefs    []SourceSnapshot `json:"sourceRefs"`
	DelegationID  string           `json:"delegationId,omitempty"`
	MessageIDs    []string         `json:"messageIds,omitempty"`
}
type ReplyCommand struct {
	CommandMeta
	DelegationID string           `json:"delegationId"`
	QuestionID   string           `json:"questionId,omitempty"`
	Text         string           `json:"text"`
	SourceRefs   []SourceSnapshot `json:"sourceRefs"`
}
type TaskConfigHashQuery struct {
	ProfileID string          `json:"profileId"`
	Config    TaskConfigDraft `json:"config"`
}
type TaskConfigHashResult struct {
	ConfigurationHash string `json:"configurationHash"`
}
type CollaborationAPI interface {
	Budget(context.Context, RequestIdentity, BudgetQuery) (BudgetSettings, error)
	ConfigureBudget(context.Context, RequestIdentity, BudgetConfigure) (BudgetSettings, error)
	ConfigurationHash(context.Context, RequestIdentity, TaskConfigHashQuery) (TaskConfigHashResult, error)
	Discover(context.Context, RequestIdentity, DiscoverQuery) (DirectoryPage, error)
	Delegate(context.Context, RequestIdentity, DelegateCommand) (Delegation, error)
	GetTask(context.Context, RequestIdentity, IDQuery) (Delegation, error)
	ListTasks(context.Context, RequestIdentity, DelegationQuery) (DelegationPage, error)
	CancelTask(context.Context, RequestIdentity, TaskCancel) (Delegation, error)
	ProposeCreate(context.Context, RequestIdentity, CreateProposal) (AgentProposal, error)
	Proposals(context.Context, RequestIdentity, DiscoverQuery) (AgentProposalPage, error)
	ConfirmProposal(context.Context, RequestIdentity, ConfirmProposal) (Agent, error)
	RejectProposal(context.Context, RequestIdentity, ConfirmProposal) (Receipt, error)
}
type MessagesAPI interface {
	Send(context.Context, RequestIdentity, MessageCommand) (AgentMessage, error)
	Reply(context.Context, RequestIdentity, ReplyCommand) (AgentMessage, error)
}

// CollaborationTools receives only execution facts bound by the Executor.
type CollaborationTools interface {
	InvokeTool(context.Context, ToolExecution, ToolCall) (ToolResult, error)
}
