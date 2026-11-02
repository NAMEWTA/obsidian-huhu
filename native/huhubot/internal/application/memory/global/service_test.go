package global

import (
	"context"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type fakeRepository struct {
	ownerCalls int
	toolCalls  int
}

func (*fakeRepository) ProposeOwner(context.Context, api.RequestIdentity, api.MemoryGlobalProposal) (api.MemoryProposal, error) {
	return api.MemoryProposal{}, api.Denied("TEST_OWNER_NOT_ASSEMBLED")
}
func (r *fakeRepository) ResolveOwner(context.Context, api.RequestIdentity, api.MemoryResolve) (api.Receipt, error) {
	r.ownerCalls++
	return api.Receipt{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "2"}, nil
}
func (r *fakeRepository) ProposeTool(context.Context, api.ToolExecution, string, api.GlobalMemoryToolDraft) (api.GlobalMemoryToolProposal, error) {
	r.toolCalls++
	return api.GlobalMemoryToolProposal{ID: "proposal:one", Revision: "1", PreviewHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", ExpiresAt: "2027-01-01T00:00:00Z", State: "pending"}, nil
}

func TestToolWrapperHasNoResolveCapability(t *testing.T) {
	repo := &fakeRepository{}
	tool := NewToolProposer(repo)
	if _, ok := any(tool).(api.GlobalMemoryAPI); ok {
		t.Fatal("model tool object exposes owner ResolveGlobal")
	}
	owner := NewOwnerCommands(repo)
	if _, ok := any(owner).(api.GlobalMemoryToolProposer); ok {
		t.Fatal("owner object unexpectedly became a model tool")
	}
	draft := api.GlobalMemoryToolDraft{Operation: "create", Scope: api.MemoryScope{Kind: "profile"}, Text: "fact", ExpectedRevision: "1"}
	if _, err := tool.ProposeFromTool(context.Background(), api.ToolExecution{}, "call:one", draft); err != nil || repo.toolCalls != 1 || repo.ownerCalls != 0 {
		t.Fatalf("narrow tool route failed: calls=%d owner=%d err=%v", repo.toolCalls, repo.ownerCalls, err)
	}
	if _, err := tool.ProposeFromTool(context.Background(), api.ToolExecution{}, "call:two", api.GlobalMemoryToolDraft{Operation: "delete", Scope: api.MemoryScope{Kind: "profile"}, ExpectedRevision: "1"}); err == nil || repo.toolCalls != 1 {
		t.Fatal("invalid tool draft reached proposal repository")
	}
}
