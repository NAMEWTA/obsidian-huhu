package assistant_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	store "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestCommandScopesCASReplayTTLAndImmutableModelRevisions(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	h, e := profile.Acquire(root, filepath.Join(root, "one"))
	if e != nil {
		t.Fatal(e)
	}
	defer h.Close()
	db, e := base.Open(ctx, h)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	clock := time.Now().UTC()
	service, e := app.New(ctx, store.New(db), app.Options{Now: func() time.Time { return clock }})
	if e != nil {
		t.Fatal(e)
	}
	p, e := db.ReadMetadata(ctx)
	if e != nil {
		t.Fatal(e)
	}
	m := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, ExpectedRevision: rev}
	}
	created := api.AgentCreate{CommandMeta: m("scoped", ""), Draft: api.AgentDraft{Name: "test", Persona: "v1"}}
	a, e := service.Create(ctx, owner, created)
	if e != nil {
		t.Fatal(e)
	}
	second := api.NewConnectionIdentity("second", "other-owner", false)
	other, e := service.Create(ctx, second, created)
	if e != nil || other.ID == a.ID {
		t.Fatal("principal receipt scope", e)
	}
	bad := created
	bad.ProfileID = "profile:other"
	_, e = service.Create(ctx, owner, bad)
	fault(t, e, "PROFILE_MISMATCH")
	changed := api.AgentUpdate{CommandMeta: m("update", a.Revision), ID: a.ID, Draft: api.AgentDraft{Name: "test", Persona: "v2"}}
	a2, e := service.Update(ctx, owner, changed)
	if e != nil {
		t.Fatal(e)
	}
	replay, e := service.Update(ctx, owner, changed)
	if e != nil || replay.Revision != a2.Revision {
		t.Fatal("CAS replay performed twice", e)
	}
	changed.CommandID = "new-intent"
	changed.IdempotencyKey = "new-intent"
	_, e = service.Update(ctx, owner, changed)
	fault(t, e, "REVISION_CONFLICT")
	model := api.ModelBindingDraft{ModelID: "m1", ProviderID: "p", Protocol: "openai-responses", Capabilities: []string{}}
	a2, e = service.BindModel(ctx, owner, api.ModelBind{CommandMeta: m("model1", a2.Revision), AgentID: a.ID, Model: model})
	if e != nil {
		t.Fatal(e)
	}
	pinned, e := service.AcquireSnapshot(ctx, owner, p.ProfileID, a.ID)
	if e != nil {
		t.Fatal(e)
	}
	// Unbind then rebind cannot reuse a pinned binding revision.
	a2, e = service.Update(ctx, owner, api.AgentUpdate{CommandMeta: m("unbind", a2.Revision), ID: a.ID, Draft: api.AgentDraft{Name: "test", Persona: "v3"}})
	if e != nil {
		t.Fatal(e)
	}
	model.ModelID = "m2"
	a2, e = service.BindModel(ctx, owner, api.ModelBind{CommandMeta: m("model2", a2.Revision), AgentID: a.ID, Model: model})
	if e != nil || a2.ModelBindingRevision == pinned.Agent.ModelBindingRevision || pinned.Agent.Model.ModelID != "m1" {
		t.Fatal("binding revision reused", e)
	}
	if e = service.ReleaseSnapshot(ctx, pinned.Token); e != nil {
		t.Fatal(e)
	}
	a2, e = service.Disable(ctx, owner, api.AgentDisable{CommandMeta: m("disable", a2.Revision), ID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	preview, e := service.DeletePreview(ctx, owner, api.IDQuery{ProfileID: p.ProfileID, ID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	clock = clock.Add(5 * time.Minute)
	_, e = service.Delete(ctx, owner, api.AgentDelete{CommandMeta: m("delete", a2.Revision), ID: a.ID, PreviewToken: preview.Token})
	fault(t, e, "DELETION_PREVIEW_EXPIRED")
	preview, e = service.DeletePreview(ctx, owner, api.IDQuery{ProfileID: p.ProfileID, ID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	a2, e = service.Update(ctx, owner, api.AgentUpdate{CommandMeta: m("disabled-edit", a2.Revision), ID: a.ID, Draft: api.AgentDraft{Name: "test", Persona: "changed while disabled"}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = service.Delete(ctx, owner, api.AgentDelete{CommandMeta: m("delete-after-edit", a2.Revision), ID: a.ID, PreviewToken: preview.Token})
	fault(t, e, "DELETION_PREVIEW_STALE")

	first, e := service.List(ctx, owner, api.PageQuery{ProfileID: p.ProfileID, Limit: 1})
	if e != nil || first.NextCursor == "" {
		t.Fatal("pagination", e)
	}
	_, e = service.Create(ctx, owner, api.AgentCreate{CommandMeta: m("cursor-change", ""), Draft: api.AgentDraft{Name: "more"}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = service.List(ctx, owner, api.PageQuery{ProfileID: p.ProfileID, Cursor: first.NextCursor})
	fault(t, e, "DIRECTORY_CHANGED")
}
