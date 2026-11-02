package api

import (
	"context"
	"io"
)

// RecoveryStatus is owner-readable metadata. Revision is the target Run CAS;
// TreeRevision identifies the inspected tree and is never a Run revision.
type RecoveryStatus struct {
	RunID          string   `json:"runId"`
	RootRunID      string   `json:"rootRunId"`
	Revision       string   `json:"revision"`
	State          string   `json:"state"`
	Generation     string   `json:"generation"`
	TreeRevision   string   `json:"treeRevision,omitempty"`
	AffectedRunIDs []string `json:"affectedRunIds"`
	Reason         string   `json:"reason,omitempty"`
	CheckedAt      string   `json:"checkedAt,omitempty"`
}
type RunResume struct {
	CommandMeta
	ID                 string `json:"id"`
	RecoveryGeneration string `json:"recoveryGeneration"`
}
type RecoveryAPI interface {
	Get(context.Context, RequestIdentity, IDQuery) (RecoveryStatus, error)
	Resume(context.Context, RequestIdentity, RunResume) (RunReceipt, error)
}

// ExecutionPosition is an internal durable program position, not an SDK or
// public checkpoint representation. A persisted resume decision is immutable:
// re-entry must not repeat the approval dispatch or consume child results again.
type ExecutionPosition struct {
	Phase           string
	Continuation    *RunContinuation
	Decision        *ToolResult
	CompletedResult *EngineResult
}
type RecoveryInspection struct {
	Memory    *ExecutionMemoryInput `json:"Memory,omitempty"`
	ShortTerm *ShortTermInput       `json:"ShortTerm,omitempty"`
	Run       Run
	Intent    string
	Access    RunAccessInput
	Config    TaskConfigSnapshot
	Position  ExecutionPosition
}
type RecoveryInspector interface {
	InspectRecovery(context.Context, RecoveryInspection) error
}

// EngineCheckpointInspector is pure: it reads the complete private CP payload
// and validates compatibility without model, tool, provider or Host requests.
// The caller owns and closes Reader; the payload never crosses the public API.
type CheckpointInspection struct {
	Memory     *ExecutionMemoryInput `json:"Memory,omitempty"`
	ShortTerm  *ShortTermInput       `json:"ShortTerm,omitempty"`
	Run        Run
	Intent     string
	Config     TaskConfigSnapshot
	Position   ExecutionPosition
	Checkpoint CheckpointArtifact
	Reader     io.Reader
}
type EngineCheckpointInspector interface {
	InspectCheckpoint(context.Context, CheckpointInspection) error
}
