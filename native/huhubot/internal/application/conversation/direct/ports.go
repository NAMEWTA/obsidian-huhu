package direct

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type HistoryPage struct {
	Page   api.MessagePage
	Access map[string]api.RunAccessInput
}
type Repository interface {
	CreateSession(context.Context, api.RequestIdentity, api.SessionCreate, string) (api.Session, error)
	ListSessions(context.Context, api.RequestIdentity, api.PageQuery) (api.SessionPage, error)
	GetSession(context.Context, api.RequestIdentity, api.IDQuery) (api.Session, error)
	History(context.Context, api.RequestIdentity, api.HistoryQuery) (HistoryPage, error)
	Archive(context.Context, api.RequestIdentity, api.SessionArchive, string) (api.Session, error)
	StartRun(context.Context, api.RequestIdentity, api.RunStart, string) (api.RunReceipt, error)
	GetRun(context.Context, api.RequestIdentity, api.IDQuery) (api.Run, api.RunAccessInput, error)
}

// GroupHistoryPort applies current member incarnation and explicit pre-join
// history bounds before the shared model provenance filter is used.
type GroupHistoryPort interface {
	FilterAttachments(context.Context, api.RequestIdentity, string, []api.VisibleMessage) ([]api.VisibleMessage, error)
	ModelHistoryPage(context.Context, api.RequestIdentity, api.HistoryQuery, api.RunAccessInput) (HistoryPage, error)
}

// HistoryMemoryPort qualifies a page without committing any consumption. Only
// messages retained by the final source/provenance budget become model input.
type HistoryMemoryPort interface {
	ReadHistoryMemory(context.Context, api.RequestIdentity, string, string, []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error)
}
