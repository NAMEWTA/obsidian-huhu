package private

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// Service has no separate scheduler or persistence. The repository commits
// before an eligible auto-maintenance change can wake the existing Executor.
type Service struct {
	repo api.MemoryAPI
	wake func()
}

func New(repo api.MemoryAPI, wake func()) *Service { return &Service{repo: repo, wake: wake} }

func request(id api.RequestIdentity, method string, value any) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	return api.ValidateMemoryRequest(method, value)
}
func (s *Service) List(ctx context.Context, id api.RequestIdentity, q api.MemoryQuery) (api.MemoryPage, error) {
	if q.Kind == "" {
		q.Kind = "item"
	}
	if err := request(id, "memory.list", q); err != nil {
		return api.MemoryPage{}, err
	}
	return s.repo.List(ctx, id, q)
}
func (s *Service) Get(ctx context.Context, id api.RequestIdentity, q api.MemoryGet) (api.MemoryObject, error) {
	if q.Kind == "" {
		q.Kind = "item"
	}
	if err := request(id, "memory.get", q); err != nil {
		return api.MemoryObject{}, err
	}
	return s.repo.Get(ctx, id, q)
}
func (s *Service) Pin(ctx context.Context, id api.RequestIdentity, q api.MemoryPin) (api.MemoryItem, error) {
	if err := request(id, "memory.pin", q); err != nil {
		return api.MemoryItem{}, err
	}
	return s.repo.Pin(ctx, id, q)
}
func (s *Service) Correct(ctx context.Context, id api.RequestIdentity, q api.MemoryCorrect) (api.MemoryItem, error) {
	if err := request(id, "memory.correct", q); err != nil {
		return api.MemoryItem{}, err
	}
	return s.repo.Correct(ctx, id, q)
}
func (s *Service) Forget(ctx context.Context, id api.RequestIdentity, q api.MemoryForget) (api.MemoryItem, error) {
	if err := request(id, "memory.forget", q); err != nil {
		return api.MemoryItem{}, err
	}
	return s.repo.Forget(ctx, id, q)
}
func (s *Service) SetAutoMaintenance(ctx context.Context, id api.RequestIdentity, q api.MemorySetAuto) (api.MemorySettings, error) {
	if err := request(id, "memory.setAutoMaintenance", q); err != nil {
		return api.MemorySettings{}, err
	}
	out, err := s.repo.SetAutoMaintenance(ctx, id, q)
	if err == nil && out.Enabled && out.Eligible && s.wake != nil {
		s.wake()
	}
	return out, err
}
