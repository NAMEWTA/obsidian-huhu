// Package recovery exposes inspection and explicit recovery of an existing Run.
package recovery

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type Service struct {
	repo api.RecoveryAPI
	wake func()
}

func New(repo api.RecoveryAPI, wake func()) *Service { return &Service{repo: repo, wake: wake} }

func (s *Service) Get(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.RecoveryStatus, error) {
	if !id.Valid() {
		return api.RecoveryStatus{}, api.Denied("IDENTITY_REQUIRED")
	}
	if q.ID == "" || q.ProfileID == "" {
		return api.RecoveryStatus{}, api.Invalid("INVALID_RECOVERY_QUERY")
	}
	return s.repo.Get(ctx, id, q)
}

func (s *Service) Resume(ctx context.Context, id api.RequestIdentity, c api.RunResume) (api.RunReceipt, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.RunReceipt{}, e
	}
	if c.ID == "" || !commands.Positive(c.RecoveryGeneration) {
		return api.RunReceipt{}, api.Invalid("INVALID_RECOVERY_COMMAND")
	}
	out, e := s.repo.Resume(ctx, id, c)
	if e == nil && s.wake != nil {
		s.wake()
	}
	return out, e
}

var _ api.RecoveryAPI = (*Service)(nil)
