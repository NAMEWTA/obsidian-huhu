package broker

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"io"
	"time"
)

type Effect struct {
	RunID, ProfileID, CommandEpoch, ApprovalID, ApprovalRevision, ExpiresAt string
	ID, Token, State, Reason                                                string
	Preview                                                                 api.ApprovalPreview
	Lease                                                                   api.HostLease
	Receipt                                                                 *api.HostReceipt
}
type Repository interface {
	Find(context.Context, api.ToolExecution, api.ToolCall, string) (Effect, bool, error)
	Reserve(context.Context, api.ToolExecution, api.ToolCall, api.ApprovalPreview, api.HostLease, string) (Effect, error)
	Publish(context.Context, api.ToolExecution, string, api.CheckpointArtifact, time.Time) error
	ContinuationEffect(context.Context, api.ToolExecution, api.RunContinuation) (Effect, error)
	ClaimDispatch(context.Context, api.ToolExecution, Effect) error
	CompleteEffect(context.Context, api.ToolExecution, string, string, string, *api.HostReceipt) error
	CompleteContinuation(context.Context, api.ToolExecution, api.RunContinuation) error
	Referenced(context.Context, string) (bool, error)
}
type Blobs interface {
	Publish(context.Context, string, string, api.CheckpointMetadata, io.Reader) (api.CheckpointArtifact, func(), error)
	Verify(context.Context, api.CheckpointArtifact) error
	Open(context.Context, api.CheckpointArtifact) (io.ReadCloser, error)
	Collect(context.Context, func(context.Context, string) (bool, error)) (int, error)
}
