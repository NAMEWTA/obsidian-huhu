package approvals

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/access/approval"
	"time"
)

type Repository interface {
	List(context.Context, api.RequestIdentity, api.PageQuery) (api.ApprovalPage, error)
	Get(context.Context, api.RequestIdentity, api.IDQuery) (api.Approval, error)
	Resolve(context.Context, api.RequestIdentity, api.ApprovalResolve, string, time.Time) (api.Approval, error)
	Cancel(context.Context, api.RequestIdentity, api.RunCancel, string) (api.RunReceipt, error)
}
type Service struct {
	repo   Repository
	now    func() time.Time
	wake   func()
	cancel func(string)
}

func New(repo Repository, now func() time.Time, wake func(), cancel func(string)) *Service {
	if now == nil {
		now = time.Now
	}
	return &Service{repo, now, wake, cancel}
}
func (s *Service) List(c context.Context, id api.RequestIdentity, q api.PageQuery) (api.ApprovalPage, error) {
	if !id.Valid() {
		return api.ApprovalPage{}, api.Denied("IDENTITY_REQUIRED")
	}
	return s.repo.List(c, id, q)
}
func (s *Service) Get(c context.Context, id api.RequestIdentity, q api.IDQuery) (api.Approval, error) {
	if !id.Valid() {
		return api.Approval{}, api.Denied("IDENTITY_REQUIRED")
	}
	return s.repo.Get(c, id, q)
}
func (s *Service) Resolve(c context.Context, id api.RequestIdentity, q api.ApprovalResolve) (api.Approval, error) {
	if e := commands.Validate(id, q.CommandMeta, true); e != nil {
		return api.Approval{}, e
	}
	if q.ID == "" || q.EffectID == "" || q.PreviewHash == "" || !domain.ValidDecision(q.Decision) {
		return api.Approval{}, api.Invalid("INVALID_APPROVAL_DECISION")
	}
	out, e := s.repo.Resolve(c, id, q, commands.Hash(q), s.now())
	if e == nil && s.wake != nil {
		s.wake()
	}
	return out, e
}
func (s *Service) Cancel(c context.Context, id api.RequestIdentity, q api.RunCancel) (api.RunReceipt, error) {
	if e := commands.Validate(id, q.CommandMeta, true); e != nil {
		return api.RunReceipt{}, e
	}
	if q.ID == "" {
		return api.RunReceipt{}, api.Invalid("RUN_ID_REQUIRED")
	}
	out, e := s.repo.Cancel(c, id, q, commands.Hash(q))
	if e == nil {
		if s.cancel != nil {
			s.cancel(q.ID)
		}
		if s.wake != nil {
			s.wake()
		}
	}
	return out, e
}

var _ api.ApprovalsAPI = (*Service)(nil)
