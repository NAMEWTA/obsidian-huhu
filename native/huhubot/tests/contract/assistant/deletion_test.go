package assistant_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type usage struct {
	mu    sync.Mutex
	value api.AgentUsage
}

func (u *usage) SnapshotUsage(context.Context, string) (api.AgentUsage, error) {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.value, nil
}
func (u *usage) set(v api.AgentUsage) { u.mu.Lock(); defer u.mu.Unlock(); u.value = v }
func TestDisableDeletePreviewUsageAndErasedReceiptEpoch(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	u := &usage{value: api.AgentUsage{RevisionToken: "u1", ActiveRunIDs: []string{"run:active"}, GroupIDs: []string{"group:1"}, MemoryIDs: []string{"memory:1"}}}
	c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Usage: u})
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	create := api.AgentCreate{CommandMeta: meta(t, c, "create", ""), Draft: api.AgentDraft{Name: "target", Persona: "ERASE_PERSONA_BODY_019"}}
	a, e := c.API.Assistant.Create(ctx, owner, create)
	if e != nil {
		t.Fatal(e)
	}
	snap, e := c.API.Assistant.AcquireSnapshot(ctx, owner, create.ProfileID, a.ID)
	if e != nil {
		t.Fatal(e)
	}
	a, e = c.API.Assistant.Disable(ctx, owner, api.AgentDisable{CommandMeta: meta(t, c, "disable", a.Revision), ID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Assistant.AcquireSnapshot(ctx, owner, create.ProfileID, a.ID)
	fault(t, e, "AGENT_DISABLED")
	q := api.IDQuery{ProfileID: create.ProfileID, ID: a.ID}
	p, e := c.API.Assistant.DeletePreview(ctx, owner, q)
	if e != nil {
		t.Fatal(e)
	}
	del := api.AgentDelete{CommandMeta: meta(t, c, "delete", a.Revision), ID: a.ID, PreviewToken: p.Token}
	_, e = c.API.Assistant.Delete(ctx, owner, del)
	fault(t, e, "AGENT_IN_USE")
	u.set(api.AgentUsage{RevisionToken: "u2"})
	_, e = c.API.Assistant.Delete(ctx, owner, del)
	fault(t, e, "DELETION_PREVIEW_STALE")
	p, e = c.API.Assistant.DeletePreview(ctx, owner, q)
	if e != nil {
		t.Fatal(e)
	}
	del.PreviewToken = p.Token
	_, e = c.API.Assistant.Delete(ctx, owner, del)
	fault(t, e, "AGENT_IN_USE")
	if e = c.API.Assistant.ReleaseSnapshot(ctx, snap.Token); e != nil {
		t.Fatal(e)
	}
	// A released pin also changes the usage snapshot, requiring a new preview.
	_, e = c.API.Assistant.Delete(ctx, owner, del)
	fault(t, e, "DELETION_PREVIEW_STALE")
	p, e = c.API.Assistant.DeletePreview(ctx, owner, q)
	if e != nil {
		t.Fatal(e)
	}
	del.PreviewToken = p.Token
	receipt, e := c.API.Assistant.Delete(ctx, owner, del)
	if e != nil || receipt.ReceiptID == "" {
		t.Fatal(receipt, e)
	}
	_, e = c.API.Assistant.Get(ctx, owner, q)
	fault(t, e, "AGENT_NOT_FOUND")
	_, e = c.API.Assistant.Create(ctx, owner, create)
	fault(t, e, "COMMAND_EPOCH_CONFLICT")
	list, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: create.ProfileID})
	if e != nil || len(list.Items) != 1 || !list.Items[0].IsDefault {
		t.Fatal("deleted another Bot", e)
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	files, e := filepath.Glob(filepath.Join(root, "one", "profile.sqlite3*"))
	if e != nil {
		t.Fatal(e)
	}
	for _, path := range files {
		b, e := os.ReadFile(path)
		if e != nil {
			t.Fatal(e)
		}
		if bytes.Contains(b, []byte("ERASE_PERSONA_BODY_019")) {
			t.Fatal("deleted persona remains in live SQLite/receipt/WAL", path)
		}
	}
}
