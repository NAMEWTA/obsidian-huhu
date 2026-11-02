package api

import (
	"encoding/json"
	"strings"
	"testing"
)

func globalPreviewFixture() MemoryProposal {
	text := "A confirmed global fact must retain its source boundary."
	return MemoryProposal{
		ID:          "proposal:one",
		Revision:    "1",
		Operation:   "create",
		Scope:       MemoryScope{Kind: "profile"},
		Body:        &MemoryBody{Text: text, Hash: contextHash(text), Provenance: "user", CreatorKind: "user", SourceRefs: []SourceSnapshot{}, SourceScopes: []SourceScope{}, Derived: []DerivedInput{}},
		PreviewHash: contextHash("fixed global preview"),
		ExpiresAt:   "2027-01-02T03:04:05Z",
		State:       "pending",
	}
}

func TestGlobalMemoryPublicResultsAcceptFixedPreviewAndBodyFreeTerminal(t *testing.T) {
	preview := globalPreviewFixture()
	if err := ValidateMemoryResult("memory.proposeGlobal", preview); err != nil {
		t.Fatal("valid proposal rejected", err)
	}
	object := MemoryObject{Kind: "proposal", Proposal: &preview}
	if err := ValidateMemoryResult("memory.get", object); err != nil {
		t.Fatal("proposal owner read rejected", err)
	}
	page := MemoryPage{NamespaceRevision: "4", Items: []MemoryObject{object}}
	if err := ValidateMemoryResult("memory.list", page); err != nil {
		t.Fatal("proposal page rejected", err)
	}
	for _, state := range []string{"accepted", "rejected", "expired", "conflicted"} {
		terminal := preview
		terminal.State, terminal.Body, terminal.Revision = state, nil, "2"
		if err := ValidateMemoryResult("memory.get", MemoryObject{Kind: "proposal", Proposal: &terminal}); err != nil {
			t.Fatal("body-free terminal rejected", state, err)
		}
	}
	if err := ValidateMemoryResult("memory.resolveGlobal", Receipt{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "2"}); err != nil {
		t.Fatal("valid resolve receipt rejected", err)
	}
}

func TestGlobalMemoryPublicResultsRejectUnsafePreviewBeforeDelivery(t *testing.T) {
	base := globalPreviewFixture()
	cases := []struct {
		name   string
		mutate func(*MemoryProposal)
	}{
		{"pending-body-omitted", func(v *MemoryProposal) { v.Body = nil }},
		{"terminal-retains-body", func(v *MemoryProposal) { v.State = "rejected" }},
		{"forged-content-hash", func(v *MemoryProposal) { v.Body.Hash = contextHash("other text") }},
		{"invalid-utf8", func(v *MemoryProposal) { v.Body.Text = string([]byte{0xff}) }},
		{"invalid-expiry", func(v *MemoryProposal) { v.ExpiresAt = "not-a-time" }},
		{"create-target-injected", func(v *MemoryProposal) { v.TargetItemID, v.TargetRevision = "item:one", "1" }},
		{"revision-overflow", func(v *MemoryProposal) { v.Revision = "9223372036854775808" }},
		{"oversized-preview", func(v *MemoryProposal) {
			v.Body.Text = strings.Repeat("x", MemoryTextBytes+1)
			v.Body.Hash = contextHash(v.Body.Text)
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			v := base
			body := *base.Body
			v.Body = &body
			tc.mutate(&v)
			if err := ValidateMemoryResult("memory.proposeGlobal", v); err == nil {
				t.Fatal("unsafe proposal passed application output gate")
			}
		})
	}
	if err := ValidateMemoryResult("memory.resolveGlobal", Receipt{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "0"}); err == nil {
		t.Fatal("invalid resolve receipt passed application output gate")
	}
}

func TestGlobalMemoryOwnerDeleteCanPreviewOnlyCurrentTargetMetadata(t *testing.T) {
	proposal := globalPreviewFixture()
	proposal.Operation = "delete"
	proposal.TargetItemID = "item:source-revoked"
	proposal.TargetRevision = "7"
	proposal.Body = nil
	if err := ValidateMemoryResult("memory.proposeGlobal", proposal); err != nil {
		t.Fatal("owner cannot preview a delete without exposing revoked source body", err)
	}
	object := MemoryObject{Kind: "proposal", Proposal: &proposal}
	if err := ValidateMemoryResult("memory.get", object); err != nil {
		t.Fatal("metadata-only pending delete owner read rejected", err)
	}
	if err := ValidateMemoryResult("memory.list", MemoryPage{NamespaceRevision: "8", Items: []MemoryObject{object}}); err != nil {
		t.Fatal("metadata-only pending delete page rejected", err)
	}
	for _, operation := range []string{"create", "update"} {
		withoutBody := proposal
		withoutBody.Operation = operation
		if operation == "create" {
			withoutBody.TargetItemID, withoutBody.TargetRevision = "", ""
		}
		if err := ValidateMemoryResult("memory.proposeGlobal", withoutBody); err == nil {
			t.Fatal(operation, "lost pending-body requirement")
		}
	}
}

func TestGlobalMemoryToolCapabilityKeepsActionSeparateFromOwnerDecision(t *testing.T) {
	call := ToolCall{ID: "call:one", Name: "memory.proposeGlobal", GlobalMemory: &GlobalMemoryToolDraft{
		Operation: "create", Scope: MemoryScope{Kind: "profile"}, Text: "A proposed fact", ExpectedRevision: "1",
	}}
	if err := ValidateGlobalMemoryToolCall(call); err != nil {
		t.Fatal("valid model proposal draft rejected", err)
	}
	for _, tc := range []struct {
		name   string
		mutate func(*ToolCall)
	}{
		{"mixed-owner-proposal", func(c *ToolCall) { c.Proposal = &CreateProposal{} }},
		{"effect-injection", func(c *ToolCall) { c.Target.ResourceID = "note:one" }},
		{"no-catalog-cas", func(c *ToolCall) { c.GlobalMemory.ExpectedRevision = "0" }},
		{"unscoped", func(c *ToolCall) { c.GlobalMemory.Scope.Kind = "other" }},
		{"blank-content", func(c *ToolCall) { c.GlobalMemory.Text = " " }},
		{"forged-resolve-tool", func(c *ToolCall) { c.Name = "memory.resolveGlobal" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			v := call
			draft := *call.GlobalMemory
			v.GlobalMemory = &draft
			tc.mutate(&v)
			if ValidateGlobalMemoryToolCall(v) == nil {
				t.Fatal("invalid model tool call crossed typed capability gate")
			}
		})
	}
	for _, operation := range []string{"update", "delete"} {
		v := call
		draft := *call.GlobalMemory
		v.GlobalMemory = &draft
		v.GlobalMemory.Operation, v.GlobalMemory.TargetItemID = operation, "item:one"
		if operation == "delete" {
			v.GlobalMemory.Text = ""
		}
		if err := ValidateGlobalMemoryToolCall(v); err != nil {
			t.Fatal("valid", operation, "draft rejected", err)
		}
	}

	preview := globalPreviewFixture()
	handle, err := GlobalMemoryToolProposalFrom(preview)
	if err != nil {
		t.Fatal(err)
	}
	result := ToolResult{Status: "proposed", GlobalMemoryProposal: &handle}
	if err := ValidateGlobalMemoryToolResult(result); err != nil {
		t.Fatal("safe model result rejected", err)
	}
	b, err := json.Marshal(result)
	if err != nil || strings.Contains(string(b), preview.Body.Text) || strings.Contains(string(b), "sourceRefs") || strings.Contains(string(b), "derived") {
		t.Fatal("model result leaked fixed body or provenance", string(b), err)
	}
	result.EffectID = "effect:forged"
	if ValidateGlobalMemoryToolResult(result) == nil {
		t.Fatal("mixed effect/proposal result accepted")
	}
}
