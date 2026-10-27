// Package global gives owner commands and model tools distinct object capabilities.
package global

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// Repository is implemented by the one SQLite proposal adapter. It owns no
// Memory fact writer and delegates fact changes into Memory's transaction.
type Repository interface {
	ProposeOwner(context.Context, api.RequestIdentity, api.MemoryGlobalProposal) (api.MemoryProposal, error)
	ResolveOwner(context.Context, api.RequestIdentity, api.MemoryResolve) (api.Receipt, error)
	ProposeTool(context.Context, api.ToolExecution, string, api.GlobalMemoryToolDraft) (api.GlobalMemoryToolProposal, error)
}

type OwnerCommands struct{ repo Repository }
type ToolProposer struct{ repo Repository }

func NewOwnerCommands(repo Repository) *OwnerCommands { return &OwnerCommands{repo: repo} }
func NewToolProposer(repo Repository) *ToolProposer   { return &ToolProposer{repo: repo} }

func (s *OwnerCommands) ProposeGlobal(ctx context.Context, id api.RequestIdentity, q api.MemoryGlobalProposal) (api.MemoryProposal, error) {
	if !id.Valid() {
		return api.MemoryProposal{}, api.Denied("IDENTITY_REQUIRED")
	}
	if err := api.ValidateMemoryRequest("memory.proposeGlobal", q); err != nil {
		return api.MemoryProposal{}, err
	}
	if s == nil || s.repo == nil {
		return api.MemoryProposal{}, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	v, err := s.repo.ProposeOwner(ctx, id, q)
	if err == nil {
		err = api.ValidateMemoryResult("memory.proposeGlobal", v)
	}
	return v, err
}

func (s *OwnerCommands) ResolveGlobal(ctx context.Context, id api.RequestIdentity, q api.MemoryResolve) (api.Receipt, error) {
	if !id.Valid() {
		return api.Receipt{}, api.Denied("IDENTITY_REQUIRED")
	}
	if err := api.ValidateMemoryRequest("memory.resolveGlobal", q); err != nil {
		return api.Receipt{}, err
	}
	if s == nil || s.repo == nil {
		return api.Receipt{}, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	v, err := s.repo.ResolveOwner(ctx, id, q)
	if err == nil {
		err = api.ValidateMemoryResult("memory.resolveGlobal", v)
	}
	return v, err
}

func (s *ToolProposer) ProposeFromTool(ctx context.Context, x api.ToolExecution, callID string, draft api.GlobalMemoryToolDraft) (api.GlobalMemoryToolProposal, error) {
	if err := api.ValidateGlobalMemoryToolCall(api.ToolCall{ID: callID, Name: "memory.proposeGlobal", GlobalMemory: &draft}); err != nil {
		return api.GlobalMemoryToolProposal{}, err
	}
	if s == nil || s.repo == nil {
		return api.GlobalMemoryToolProposal{}, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	v, err := s.repo.ProposeTool(ctx, x, callID, draft)
	if err == nil {
		err = api.ValidateGlobalMemoryToolResult(api.ToolResult{Status: "proposed", GlobalMemoryProposal: &v})
	}
	return v, err
}

var _ api.GlobalMemoryAPI = (*OwnerCommands)(nil)
var _ api.GlobalMemoryToolProposer = (*ToolProposer)(nil)
