package assistant

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"time"
)

type Mutation struct {
	Kind                               string
	Identity                           api.RequestIdentity
	Meta                               api.CommandMeta
	ID                                 string
	Draft                              api.AgentDraft
	Model                              *api.ModelBindingDraft
	PreviewToken, UsageHash, InputHash string
	Now                                time.Time
}
type MutationResult struct {
	Agent   api.Agent
	Receipt api.Receipt
}

// ModelProbeProtocols declares local adapter support without making a request.
// A successful metadata probe does not establish generation/tool capabilities.
type ModelProbeProtocols interface {
	SupportsProtocol(string) bool
}

// Repository owns a short atomic epoch/receipt/CAS/config transaction. None of
// its callbacks can call a provider, Host, model, or other context.
type Repository interface {
	EnsureDefault(context.Context) error
	Mutate(context.Context, Mutation) (MutationResult, error)
	Get(context.Context, api.IDQuery) (api.Agent, error)
	List(context.Context, api.PageQuery) (api.AgentPage, error)
	Preview(context.Context, api.RequestIdentity, api.IDQuery, string, []api.DeletionCategory, time.Time) (api.DeletionPreview, error)
	Acquire(context.Context, string, string) (api.ConfigSnapshot, error)
	Release(context.Context, string) error
}
