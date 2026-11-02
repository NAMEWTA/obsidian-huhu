package messages

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	validation "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/delegation"
)

type Repository interface{ api.MessagesAPI }
type Service struct{ repo Repository }

func New(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) Send(ctx context.Context, id api.RequestIdentity, c api.MessageCommand) (api.AgentMessage, error) {
	if c.Kind != "notify" && c.Kind != "question" && c.Kind != "reply" || !validation.Text(c.Text, 65536, true) || len(c.SourceRefs) > 32 || len(c.MessageIDs) > 32 {
		return api.AgentMessage{}, api.Invalid("INVALID_AGENT_MESSAGE")
	}
	return s.repo.Send(ctx, id, c)
}
func (s *Service) Reply(ctx context.Context, id api.RequestIdentity, c api.ReplyCommand) (api.AgentMessage, error) {
	if !validation.Text(c.Text, 65536, true) || len(c.SourceRefs) > 32 {
		return api.AgentMessage{}, api.Invalid("INVALID_TASK_REPLY")
	}
	return s.repo.Reply(ctx, id, c)
}

var _ api.MessagesAPI = (*Service)(nil)
