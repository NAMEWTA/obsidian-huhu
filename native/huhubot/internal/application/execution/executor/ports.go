package executor

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Work struct {
	ContextPolicy             string
	Maintenance               bool
	RecoveryDecision          *api.ToolResult
	InboxCandidates           []api.AgentMessage
	Run                       api.Run
	ClaimToken, UserMessageID string
	Input                     api.EngineInput
	Access                    api.RunAccessInput
	Identity                  api.RequestIdentity
	Continuation              *api.RunContinuation
	CompletedResult           *api.EngineResult
}
type InitialContextRuntime interface {
	PrepareAndMarkRunning(context.Context, Work) (Work, error)
}
type Repository interface {
	Recover(context.Context) error
	Claim(context.Context) (*Work, error)
	MarkRunning(context.Context, Work) error
	Block(context.Context, Work, string) error
	AppendEvent(context.Context, Work, api.EngineEvent) error
	Finalize(context.Context, Work, api.EngineResult) error
	ProducerEnded(context.Context, Work) error
}
