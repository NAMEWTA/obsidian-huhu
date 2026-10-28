package common

import (
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestGlobalMemoryToolRegistryKeepsOwnerResolveOutOfModelSchema(t *testing.T) {
	r, err := newRegistry([]string{"memory.proposeGlobal"}, "fixture")
	if err != nil {
		t.Fatal(err)
	}
	if len(r.infos) != 1 || r.infos[0].Name != "memory_proposeGlobal" {
		t.Fatalf("unexpected model tools: %#v", r.infos)
	}
	call, err := r.decode("memory_proposeGlobal", "call:global", `{"operation":"create","scope":{"kind":"profile"},"text":"fact","expectedRevision":"1"}`)
	if err != nil {
		t.Fatal(err)
	}
	if call.Name != "memory.proposeGlobal" || call.GlobalMemory == nil || call.GlobalMemory.Text != "fact" {
		t.Fatalf("unexpected decoded call: %#v", call)
	}
	if _, err = r.decode("memory_resolveGlobal", "call:resolve", `{}`); err == nil {
		t.Fatal("owner-only resolve unexpectedly entered model registry")
	}
	if _, err = r.decode("memory_proposeGlobal", "call:bad", `{"operation":"create","scope":{"kind":"profile"},"text":"fact","expectedRevision":"1","owner":"x"}`); err == nil {
		t.Fatal("unknown model argument was accepted")
	}
}

func TestGlobalMemoryToolMessageProjectsOnlyOpaqueHandle(t *testing.T) {
	proposal := &api.GlobalMemoryToolProposal{ID: "proposal:one", Revision: "1", PreviewHash: "sha256:" + strings.Repeat("a", 64), ExpiresAt: "2027-01-01T00:00:00Z", State: "pending"}
	message, err := toolMessage("call:global", "memory_proposeGlobal", api.ToolResult{Status: "proposed", GlobalMemoryProposal: proposal})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(message.Content, "text") || strings.Contains(message.Content, "sourceRefs") {
		t.Fatalf("model tool output leaked fixed preview data: %s", message.Content)
	}
	if !strings.Contains(message.Content, "proposal:one") || !strings.Contains(message.Content, "previewHash") {
		t.Fatalf("opaque proposal handle missing: %s", message.Content)
	}
}
