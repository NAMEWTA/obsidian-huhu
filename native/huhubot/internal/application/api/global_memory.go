package api

import (
	"context"
	"encoding/json"
	"time"
)

// GlobalMemoryToolDraft contains only model-proposed action data. The model
// cannot supply creator identity, source closure, grants or a user decision.
type GlobalMemoryToolDraft struct {
	Operation        string      `json:"operation"`
	TargetItemID     string      `json:"targetItemId,omitempty"`
	Scope            MemoryScope `json:"scope"`
	Text             string      `json:"text,omitempty"`
	ExpectedRevision string      `json:"expectedRevision"`
}

// GlobalMemoryToolProposal is the model-visible, body-free proposal handle.
// The owner reads the complete fixed preview through memory.get/list.
type GlobalMemoryToolProposal struct {
	ID          string `json:"id"`
	Revision    string `json:"revision"`
	PreviewHash string `json:"previewHash"`
	ExpiresAt   string `json:"expiresAt"`
	State       string `json:"state"`
}

// GlobalMemoryToolProposer is the only global-memory capability given to the
// model tool Broker. The separate GlobalMemoryAPI owns ResolveGlobal.
type GlobalMemoryToolProposer interface {
	ProposeFromTool(context.Context, ToolExecution, string, GlobalMemoryToolDraft) (GlobalMemoryToolProposal, error)
}

func validMemoryExpiry(s string) bool {
	if !memoryText(s, 64, true) {
		return false
	}
	_, err := time.Parse(time.RFC3339Nano, s)
	return err == nil
}

// ValidateGlobalMemoryToolCall is the second, typed gate after a strict model
// JSON decoder. Current Run, claim, pinned tools and sources require DB checks.
func ValidateGlobalMemoryToolCall(c ToolCall) error {
	bad := Invalid("INVALID_GLOBAL_MEMORY_TOOL_CALL")
	if c.Name != "memory.proposeGlobal" || !memoryText(c.ID, 256, true) || c.GlobalMemory == nil ||
		c.TaskQuery != nil || c.TaskList != nil || c.Target != (EffectTarget{}) || c.Content != "" ||
		c.Discover != nil || c.Delegate != nil || c.Message != nil || c.Reply != nil ||
		c.Cancel != nil || c.Proposal != nil {
		return bad
	}
	d := c.GlobalMemory
	if !ValidMemoryScope(d.Scope) || !memoryDecimal(d.ExpectedRevision) {
		return bad
	}
	switch d.Operation {
	case "create":
		if d.TargetItemID != "" || !memoryText(d.Text, MemoryTextBytes, true) {
			return bad
		}
	case "update":
		if !memoryOpaque(d.TargetItemID) || !memoryText(d.Text, MemoryTextBytes, true) {
			return bad
		}
	case "delete":
		if !memoryOpaque(d.TargetItemID) || d.Text != "" {
			return bad
		}
	default:
		return bad
	}
	b, err := json.Marshal(d)
	if err != nil || len(b) > MemoryObjectBytes {
		return bad
	}
	return nil
}

// GlobalMemoryToolProposalFrom removes the fixed body before a result can
// enter a tool transcript or checkpoint. It accepts only a pending preview.
func GlobalMemoryToolProposalFrom(v MemoryProposal) (GlobalMemoryToolProposal, error) {
	if err := ValidateMemoryResult("memory.proposeGlobal", v); err != nil {
		return GlobalMemoryToolProposal{}, err
	}
	return GlobalMemoryToolProposal{ID: v.ID, Revision: v.Revision, PreviewHash: v.PreviewHash, ExpiresAt: v.ExpiresAt, State: v.State}, nil
}

func validGlobalMemoryToolProposal(v GlobalMemoryToolProposal) bool {
	return memoryOpaque(v.ID) && memoryDecimal(v.Revision) && memoryHash(v.PreviewHash) && validMemoryExpiry(v.ExpiresAt) && v.State == "pending"
}

// ValidateGlobalMemoryToolResult rejects a mixed effect/approval/collaboration
// result before the safe proposal handle is sent back to a model.
func ValidateGlobalMemoryToolResult(v ToolResult) error {
	if v.Status != "proposed" || v.GlobalMemoryProposal == nil || !validGlobalMemoryToolProposal(*v.GlobalMemoryProposal) ||
		len(v.Children) != 0 || v.Tasks != nil || v.EffectID != "" || v.SuspensionToken != "" || v.Reason != "" ||
		v.Receipt != nil || v.Directory != nil || v.Delegation != nil || v.Message != nil || v.Proposal != nil || v.ResumeInbox != nil {
		return Invalid("INVALID_GLOBAL_MEMORY_TOOL_RESULT")
	}
	return nil
}
