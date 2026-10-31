package purge

import (
	"context"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/guard"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/purge"
)

type PreviewRequest struct {
	ProfileID string
	Selection domain.Selection
	TTL       time.Duration
}

type ExecuteRequest struct {
	ProfileID        string
	Token            string
	AllowUnknown     bool
	RetainMemoryIDs  []string
	CommandEpoch     string
	ExpectedRevision string
}

type Result struct {
	ProfileID      string
	CommandEpoch   uint64
	Revision       uint64
	Purged         bool
	RetainedPinned bool
	RetainedGlobal bool
}

type Repository interface {
	Preview(context.Context, PreviewRequest) (domain.Plan, error)
	Execute(context.Context, ExecuteRequest) (Result, error)
}

type Cleaner interface {
	Clean(context.Context, string, []api.CredentialMetadata) error
}
type CleanupRepository interface {
	BeginCleanup(context.Context, ExecuteRequest) ([]api.CredentialMetadata, error)
	CleanupPending(context.Context) (bool, error)
}
type Service struct {
	gate    *guard.Gate
	repo    Repository
	cleaner Cleaner
}

func New(repo Repository, gates ...*guard.Gate) *Service {
	g := guard.New()
	if len(gates) > 0 && gates[0] != nil {
		g = gates[0]
	}
	return &Service{repo: repo, gate: g}
}
func (s *Service) SetCleaner(cleaner Cleaner) { s.cleaner = cleaner }
func (s *Service) Preview(ctx context.Context, req PreviewRequest) (domain.Plan, error) {
	return s.repo.Preview(ctx, req)
}
func (s *Service) Execute(ctx context.Context, req ExecuteRequest) (out Result, err error) {
	if len(req.RetainMemoryIDs) > 0 {
		return out, api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
	}
	err = s.gate.Run(ctx, func(ctx context.Context) error { var e error; out, e = s.execute(ctx, req); return e })
	return
}
func (s *Service) execute(ctx context.Context, req ExecuteRequest) (Result, error) {
	if s.cleaner != nil {
		repo, ok := s.repo.(CleanupRepository)
		if !ok {
			return Result{}, api.Denied("PROFILE_CLEANUP_UNAVAILABLE")
		}
		refs, err := repo.BeginCleanup(ctx, req)
		if err != nil {
			return Result{}, err
		}
		if err = s.cleaner.Clean(ctx, req.ProfileID, refs); err != nil {
			return Result{}, &api.Fault{Kind: "CONFLICT", Reason: "PROFILE_CLEANUP_FAILED", Retryable: true}
		}
	}
	return s.repo.Execute(ctx, req)
}
func (a *API) Restricted(ctx context.Context) (bool, error) {
	if repo, ok := a.service.repo.(CleanupRepository); ok {
		return repo.CleanupPending(ctx)
	}
	return false, nil
}

// API is the profile lifecycle facade. It keeps wire/application DTOs out of the
// SQLite adapter and only advertises the HAP methods when this service is wired.
type API struct {
	service     *Service
	afterDelete func()
}

func NewAPI(service *Service) *API { return &API{service: service} }

// SetAfterDelete installs the lifecycle hook used by the bootstrap owner to
// stop admission after a committed Profile identity rotation. The callback is
// deliberately composition-only and never comes from a wire request.
func (a *API) SetAfterDelete(callback func()) { a.afterDelete = callback }

func (a *API) DeletePreview(ctx context.Context, id api.RequestIdentity, req api.ProfileDeletePreviewRequest) (api.DeletionPreview, error) {
	if !id.Valid() {
		return api.DeletionPreview{}, api.Denied("UNAUTHENTICATED")
	}
	plan, err := a.service.Preview(ctx, PreviewRequest{ProfileID: req.ProfileID})
	if err != nil {
		return api.DeletionPreview{}, err
	}
	categories := []api.DeletionCategory{{Kind: "profile", Count: 1, Retained: false}}
	if plan.UnknownEffects > 0 {
		categories = append(categories, api.DeletionCategory{Kind: "unknown-effects", Count: plan.UnknownEffects, Retained: false, Reason: "EFFECT_RECONCILIATION_REQUIRED"})
	}
	return api.DeletionPreview{Token: plan.Token, Revision: strconv.FormatUint(plan.Revision, 10), ExpiresAt: plan.ExpiresAt.UTC().Format(api.TimestampLayout), Categories: categories}, nil
}

func (a *API) Delete(ctx context.Context, id api.RequestIdentity, cmd api.ProfileDeleteCommand) (api.Receipt, error) {
	if !id.Valid() {
		return api.Receipt{}, api.Denied("UNAUTHENTICATED")
	}
	result, err := a.service.Execute(ctx, ExecuteRequest{ProfileID: cmd.ProfileID, Token: cmd.PreviewToken, RetainMemoryIDs: cmd.RetainMemoryIDs, CommandEpoch: cmd.CommandEpoch, ExpectedRevision: cmd.ExpectedRevision})
	if err != nil {
		return api.Receipt{}, err
	}
	if a.afterDelete != nil {
		a.afterDelete()
	}
	return api.Receipt{CommandID: cmd.CommandID, ReceiptID: api.NewID("receipt:"), Revision: strconv.FormatUint(result.Revision, 10)}, nil
}
