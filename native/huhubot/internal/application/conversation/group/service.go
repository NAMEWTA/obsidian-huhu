package group

import (
	"context"
	"encoding/json"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/conversation/group"
)

type Repository interface {
	CreateSession(context.Context, api.RequestIdentity, api.SessionCreate, string) (api.Session, error)
	UpdateMembers(context.Context, api.RequestIdentity, api.SessionMembersUpdate, string) (api.Session, error)
	SetCoordinator(context.Context, api.RequestIdentity, api.SessionCoordinatorUpdate, string) (api.Session, error)
	StartRun(context.Context, api.RequestIdentity, api.RunStart, string) (api.RunReceipt, error)
}
type Service struct {
	repo Repository
	wake func()
}

func New(repo Repository, wake func()) *Service { return &Service{repo, wake} }
func (s *Service) CreateSession(ctx context.Context, id api.RequestIdentity, c api.SessionCreate) (api.Session, error) {
	if e := commands.Validate(id, c.CommandMeta, false); e != nil {
		return api.Session{}, e
	}
	if c.Kind != "group" {
		return api.Session{}, api.Invalid("GROUP_SESSION_REQUIRED")
	}
	if c.CoordinatorID == "" && len(c.MemberIDs) > 0 {
		c.CoordinatorID = c.MemberIDs[0]
	}
	if reason := domain.Create(c.Title, c.MemberIDs, c.CoordinatorID); reason != "" {
		return api.Session{}, api.Invalid(reason)
	}
	return s.repo.CreateSession(ctx, id, c, commands.Hash(c))
}
func (s *Service) UpdateMembers(ctx context.Context, id api.RequestIdentity, c api.SessionMembersUpdate) (api.Session, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.Session{}, e
	}
	if reason := domain.Members(c.MemberIDs); reason != "" {
		return api.Session{}, api.Invalid(reason)
	}
	if c.ID == "" || c.HistoryScope.Kind != "none" && c.HistoryScope.Kind != "range" {
		return api.Session{}, api.Invalid("INVALID_GROUP_HISTORY_SCOPE")
	}
	return s.repo.UpdateMembers(ctx, id, c, commands.Hash(c))
}
func (s *Service) SetCoordinator(ctx context.Context, id api.RequestIdentity, c api.SessionCoordinatorUpdate) (api.Session, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.Session{}, e
	}
	if c.ID == "" || c.CoordinatorID == "" {
		return api.Session{}, api.Invalid("GROUP_COORDINATOR_REQUIRED")
	}
	return s.repo.SetCoordinator(ctx, id, c, commands.Hash(c))
}
func (s *Service) StartRun(ctx context.Context, id api.RequestIdentity, c api.RunStart) (api.RunReceipt, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.RunReceipt{}, e
	}
	b, e := json.Marshal(c)
	if e != nil || len(b) > 262144 || len(c.Intent) > 131072 {
		return api.RunReceipt{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "INTENT_TOO_LARGE"}
	}
	if c.SessionID == "" || strings.TrimSpace(c.Intent) == "" || !utf8.ValidString(c.Intent) || len(c.SourceRefs)+len(c.SourceScopes) > 32 || len(c.GrantIDs) > 32 {
		return api.RunReceipt{}, api.Invalid("INVALID_RUN_INTENT")
	}
	if c.SourceRefs == nil {
		c.SourceRefs = []api.SourceSnapshot{}
	}
	out, e := s.repo.StartRun(ctx, id, c, commands.Hash(c))
	if e == nil && s.wake != nil {
		s.wake()
	}
	return out, e
}

var _ api.GroupsAPI = (*Service)(nil)
