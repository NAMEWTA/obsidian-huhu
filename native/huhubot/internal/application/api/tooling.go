package api

import (
	"context"
	"io"
)

// ToolCall contains proposed action data only. Identity, claim, recipient, source
// scope and tool versions are bound by the application before exposing Tools.
type ToolCall struct {
	TaskQuery *IDQuery
	TaskList  *DelegationQuery
	ID, Name  string
	Target    EffectTarget
	Content   string
	Discover  *DiscoverQuery
	Delegate  *DelegateCommand
	Message   *MessageCommand
	Reply     *ReplyCommand
	Cancel    *TaskCancel
	Proposal  *CreateProposal
	// GlobalMemory is model action data only. Its actor, sources and command
	// identity are established by the bound application service.
	GlobalMemory *GlobalMemoryToolDraft `json:"globalMemory,omitempty"`
}
type ToolResult struct {
	Children                                  []TaskOutcome
	Tasks                                     *DelegationPage
	Status, EffectID, SuspensionToken, Reason string
	Receipt                                   *HostReceipt
	Directory                                 *DirectoryPage
	Delegation                                *Delegation
	Message                                   *AgentMessage
	Proposal                                  *AgentProposal
	GlobalMemoryProposal                      *GlobalMemoryToolProposal `json:"globalMemoryProposal,omitempty"`
	// ResumeInbox is trusted, internal continuation input. It is frozen with
	// the original decision before Engine.Resume and omitted from old results.
	ResumeInbox *ResumeInbox `json:"resumeInbox,omitempty"`
}
type ToolInvoker interface {
	Invoke(context.Context, ToolCall) (ToolResult, error)
}
type CheckpointMetadata struct{ EngineVersion, FormatVersion, DefinitionDigest string }
type CheckpointArtifact struct {
	Ref, Digest      string
	Size             int64
	RunID, AttemptID string
	Metadata         CheckpointMetadata
}
type CheckpointAccess interface {
	Metadata() CheckpointMetadata
	Publish(context.Context, io.Reader) (CheckpointArtifact, error)
	Open(context.Context, CheckpointArtifact) (io.ReadCloser, error)
}
type EngineSuspension struct {
	Kind       string
	WaitForIDs []string
	Token      string
	Checkpoint CheckpointArtifact
}
type ToolExecution struct {
	Identity   RequestIdentity
	Run        Run
	Access     RunAccessInput
	ClaimToken string
	Agent      Agent
	Lineage    ExecutionLineage
	Config     TaskConfigSnapshot
}
type ToolSession struct {
	Attempts    ModelAttempts
	Tools       ToolInvoker
	Checkpoints CheckpointAccess
	Close       func() error
}
type RunContinuation struct {
	Kind                                       string
	Children                                   []TaskOutcome
	ApprovalID, EffectID, Decision, Generation string
	Checkpoint                                 CheckpointArtifact
}
type ExecutionTooling interface {
	Bind(context.Context, ToolExecution) (ToolSession, error)
	PublishSuspension(context.Context, ToolExecution, EngineSuspension) error
	Continue(context.Context, ToolExecution, RunContinuation) (ToolResult, error)
}

// NoteWritePort is an infrastructure boundary. Preview/Check/Invoke run outside
// SQL; the Host must recheck its real target immediately before changing it.
type NoteWritePort interface {
	Preview(context.Context, EffectTarget, string) (NoteTargetPreview, error)
	Check(context.Context, ApprovalPreview, HostLease) error
	Invoke(context.Context, EffectDispatch) (HostReceipt, error)
}
type EffectDispatch struct {
	EffectID, RunID, ApprovalID, ApprovalRevision, ExpiresAt, ProfileID, CommandEpoch string
	Target                                                                            EffectTarget
	Tool                                                                              ToolDescriptor
	Content                                                                           string
	Lease                                                                             HostLease
	Preview                                                                           ApprovalPreview
	Fingerprint                                                                       string
}

// Preview is produced by a trusted target adapter after resolving the opaque
// target, reading its actual base revision and hashing the exact proposed body.
// Model-supplied versions are expectations, never authority for these values.
type NoteTargetPreview struct {
	Target      EffectTarget      `json:"target"`
	Tool        ToolDescriptor    `json:"tool"`
	ContentHash string            `json:"contentHash"`
	Diff        string            `json:"diff"`
	Lease       HostLease         `json:"lease"`
	Binding     *NoteWriteBinding `json:"binding,omitempty"`
}

type ExecutionWaitPublisher interface {
	PublishWait(context.Context, ToolExecution, EngineSuspension) error
}
