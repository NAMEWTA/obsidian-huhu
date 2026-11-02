package common

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

const (
	ResponsesProtocol      = "openai-responses"
	ResponsesEngineVersion = "huhu-openai-go-3.44.0-responses-bridge-v1"
	ResponsesStateFormat   = "huhu-openai-responses-state-v1"
	AnthropicProtocol      = "anthropic-messages"
	AnthropicEngineVersion = "huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1"
	AnthropicStateFormat   = "huhu-anthropic-messages-state-v1"
)

type ProtocolIdentity struct {
	Protocol, EngineVersion, StateFormat string
}

// StateView and all nested messages are borrowed and immutable for the call.
// Intent comes independently from the accepted Run, never from its checkpoint.
type StateView struct {
	Messages []*schema.Message
	Initial  int
	Turns    int
	Intent   string
}

type Generation struct {
	Model         api.ModelBindingDraft
	View          StateView
	Tools         []*schema.ToolInfo
	PriorState    []byte
	Credential    []byte
	Attempts      api.ModelAttempts
	LogicalCallID string
	EmitText      func(string) error
}

type TurnResult struct {
	Message       *schema.Message
	ProtocolState []byte
}

// ProtocolDriver owns all real producers, probes and settlement it starts.
// ValidateState is bounded local work: no credentials, tools, SQL or network.
type ProtocolDriver interface {
	Identity() ProtocolIdentity
	Generate(context.Context, Generation) (TurnResult, error)
	ValidateState(context.Context, StateView, []byte) error
	Probe(context.Context, api.ModelBindingDraft, []byte) ([]string, error)
	Stop()
	Done() <-chan struct{}
	Close() error
}

type Driver = ProtocolDriver
