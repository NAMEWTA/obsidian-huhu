package sessions

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/guard"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	"sync"
)

type Repository interface {
	Preview(context.Context, api.RequestIdentity, api.IDQuery) (api.DeletionPreview, error)
	Delete(context.Context, api.RequestIdentity, api.SessionDelete) (api.Receipt, error)
	Complete(context.Context, api.RequestIdentity, string) error
	Sources(context.Context, api.RequestIdentity, string) ([]string, error)
	Pending(context.Context) ([]PendingDeletion, error)
}
type Cleaner interface {
	Session(context.Context, string, []string) error
}
type Service struct {
	gate    *guard.Gate
	mu      sync.Mutex
	repo    Repository
	cleaner Cleaner
}

func New(repo Repository, cleaner Cleaner, gates ...*guard.Gate) *Service {
	g := guard.New()
	if len(gates) > 0 && gates[0] != nil {
		g = gates[0]
	}
	return &Service{repo: repo, cleaner: cleaner, gate: g}
}
func (s *Service) DeletePreview(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.DeletionPreview, error) {
	if !id.Valid() {
		return api.DeletionPreview{}, api.Denied("IDENTITY_REQUIRED")
	}
	if q.ProfileID == "" || q.ID == "" {
		return api.DeletionPreview{}, api.Invalid("SESSION_REQUIRED")
	}
	return s.repo.Preview(ctx, id, q)
}
func (s *Service) Delete(ctx context.Context, id api.RequestIdentity, q api.SessionDelete) (out api.Receipt, err error) {
	err = s.gate.Run(ctx, func(ctx context.Context) error { var e error; out, e = s.delete(ctx, id, q); return e })
	return
}
func (s *Service) delete(ctx context.Context, id api.RequestIdentity, q api.SessionDelete) (api.Receipt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := commands.Validate(id, q.CommandMeta, false); err != nil {
		return api.Receipt{}, err
	}
	if q.ID == "" || q.PreviewToken == "" {
		return api.Receipt{}, api.Invalid("SESSION_REQUIRED")
	}
	out, err := s.repo.Delete(ctx, id, q)
	if err != nil {
		return out, err
	}
	if s.cleaner == nil {
		return api.Receipt{}, api.Denied("SESSION_CLEANUP_UNAVAILABLE")
	}
	sources, err := s.repo.Sources(ctx, id, q.PreviewToken)
	if err != nil {
		return api.Receipt{}, err
	}
	if err = s.cleaner.Session(ctx, q.ID, sources); err != nil {
		return api.Receipt{}, &api.Fault{Kind: "CONFLICT", Reason: "SESSION_CLEANUP_FAILED", Retryable: true}
	}
	if err = s.repo.Complete(ctx, id, q.PreviewToken); err != nil {
		return api.Receipt{}, err
	}
	return out, nil
}

// PendingDeletion is a body-free recovery job for an already committed delete.
type PendingDeletion struct{ Token, PrincipalID, SessionID string }

func (s *Service) Recover(ctx context.Context) error { return s.gate.Run(ctx, s.recover) }
func (s *Service) recover(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	pending, err := s.repo.Pending(ctx)
	if err != nil {
		return err
	}
	for _, job := range pending {
		id := api.NewConnectionIdentity("session-cleanup-recovery", job.PrincipalID, false)
		sources, err := s.repo.Sources(ctx, id, job.Token)
		if err != nil {
			return err
		}
		if err = s.cleaner.Session(ctx, job.SessionID, sources); err != nil {
			return err
		}
		if err = s.repo.Complete(ctx, id, job.Token); err != nil {
			return err
		}
	}
	return nil
}
