package delegate

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistant "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/delegation"
)

// Repository commits collaboration facts through the original Run unit of work.
// No SQL, Host I/O or second execution queue is exposed to application callers.
type Repository interface{ api.CollaborationAPI }
type Service struct{ repo Repository }

func New(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) Budget(ctx context.Context, id api.RequestIdentity, q api.BudgetQuery) (api.BudgetSettings, error) {
	return s.repo.Budget(ctx, id, q)
}
func (s *Service) ConfigureBudget(ctx context.Context, id api.RequestIdentity, c api.BudgetConfigure) (api.BudgetSettings, error) {
	if _, ok := Execution(ctx); ok {
		return api.BudgetSettings{}, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	return s.repo.ConfigureBudget(ctx, id, c)
}
func (s *Service) ConfigurationHash(ctx context.Context, id api.RequestIdentity, q api.TaskConfigHashQuery) (api.TaskConfigHashResult, error) {
	if !id.Valid() || q.ProfileID == "" {
		return api.TaskConfigHashResult{}, api.Denied("IDENTITY_REQUIRED")
	}
	if q.Config.SponsorAgentID == "" {
		return api.TaskConfigHashResult{}, api.Invalid("SPONSOR_REQUIRED")
	}
	if e := assistant.ValidateDraft(q.Config.Draft); e != nil {
		return api.TaskConfigHashResult{}, e
	}
	return s.repo.ConfigurationHash(ctx, id, q)
}

type executionKey struct{}

func BindExecution(ctx context.Context, e api.ToolExecution) context.Context {
	return context.WithValue(ctx, executionKey{}, e)
}
func Execution(ctx context.Context) (api.ToolExecution, bool) {
	e, ok := ctx.Value(executionKey{}).(api.ToolExecution)
	return e, ok
}
func (s *Service) Discover(ctx context.Context, id api.RequestIdentity, q api.DiscoverQuery) (api.DirectoryPage, error) {
	if !id.Valid() || q.ProfileID == "" {
		return api.DirectoryPage{}, api.Denied("IDENTITY_REQUIRED")
	}
	if q.Limit < 0 || q.Limit > 100 || len(q.Cursor) > 512 {
		return api.DirectoryPage{}, api.Invalid("INVALID_DIRECTORY_QUERY")
	}
	return s.repo.Discover(ctx, id, q)
}
func (s *Service) Delegate(ctx context.Context, id api.RequestIdentity, c api.DelegateCommand) (api.Delegation, error) {
	if !domain.Task(c.Task, c.ExpectedOutput, c.Constraints) || len(c.Context.MessageIDs) > 32 || len(c.Context.Excerpts) > 32 || len(c.Context.SourceRefs)+len(c.Context.SourceScopes) > 32 || len(c.Context.GrantIDs) > 64 {
		return api.Delegation{}, api.Invalid("INVALID_DELEGATION")
	}
	if c.Target.Kind != "existing" && c.Target.Kind != "temporary" || c.Target.Kind == "existing" && (c.Target.AgentID == "" || c.Target.Draft != nil) || c.Target.Kind == "temporary" && (c.Target.Draft == nil || c.Target.AgentID != "") {
		return api.Delegation{}, api.Invalid("INVALID_DELEGATION_TARGET")
	}
	return s.repo.Delegate(ctx, id, c)
}
func (s *Service) GetTask(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Delegation, error) {
	return s.repo.GetTask(ctx, id, q)
}
func (s *Service) ListTasks(ctx context.Context, id api.RequestIdentity, q api.DelegationQuery) (api.DelegationPage, error) {
	if q.Limit < 0 || q.Limit > 100 || len(q.Cursor) > 512 {
		return api.DelegationPage{}, api.Invalid("INVALID_TASK_QUERY")
	}
	return s.repo.ListTasks(ctx, id, q)
}
func (s *Service) CancelTask(ctx context.Context, id api.RequestIdentity, c api.TaskCancel) (api.Delegation, error) {
	return s.repo.CancelTask(ctx, id, c)
}
func (s *Service) ProposeCreate(ctx context.Context, id api.RequestIdentity, c api.CreateProposal) (api.AgentProposal, error) {
	if e := assistant.ValidateDraft(c.Draft); e != nil {
		return api.AgentProposal{}, e
	}
	return s.repo.ProposeCreate(ctx, id, c)
}
func (s *Service) ConfirmProposal(ctx context.Context, id api.RequestIdentity, c api.ConfirmProposal) (api.Agent, error) {
	if _, ok := Execution(ctx); ok {
		return api.Agent{}, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	return s.repo.ConfirmProposal(ctx, id, c)
}
func (s *Service) Proposals(ctx context.Context, id api.RequestIdentity, q api.DiscoverQuery) (api.AgentProposalPage, error) {
	if !id.Valid() || q.ProfileID == "" {
		return api.AgentProposalPage{}, api.Denied("IDENTITY_REQUIRED")
	}
	if _, bound := Execution(ctx); bound {
		return api.AgentProposalPage{}, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	if q.Limit < 0 || q.Limit > 100 || len(q.Cursor) > 2048 || len(q.RunID) > 512 {
		return api.AgentProposalPage{}, api.Invalid("INVALID_PROPOSAL_QUERY")
	}
	return s.repo.Proposals(ctx, id, q)
}
func (s *Service) RejectProposal(ctx context.Context, id api.RequestIdentity, q api.ConfirmProposal) (api.Receipt, error) {
	if _, bound := Execution(ctx); bound {
		return api.Receipt{}, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	return s.repo.RejectProposal(ctx, id, q)
}

var _ api.CollaborationAPI = (*Service)(nil)
