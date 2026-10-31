package assistant_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	store "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestPinnedCredentialReferenceAndAtomicDeletionGuard(t *testing.T) {
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
	catalog := store.New(db)
	service, e := app.New(ctx, catalog, app.Options{})
	if e != nil {
		t.Fatal(e)
	}
	p, _ := db.ReadMetadata(ctx)
	ref := "credential:abcdef0123456789abcdef0123456789"
	if e = catalog.Reserve(ctx, p.ProfileID, ref, "protected"); e != nil {
		t.Fatal(e)
	}
	if e = catalog.Update(ctx, p.ProfileID, ref, api.CredentialStatus{Mode: "protected", State: "unknown", Reason: "OPERATION_TIMEOUT"}); e != nil {
		t.Fatal(e)
	}
	m := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, ExpectedRevision: rev}
	}
	model := api.ModelBindingDraft{ModelID: "m", ProviderID: "p", Protocol: "openai-responses", Capabilities: []string{}, CredentialRef: ref}
	a, e := service.Create(ctx, owner, api.AgentCreate{CommandMeta: m("create", ""), Draft: api.AgentDraft{Name: "pinned", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	snapshot, e := service.AcquireSnapshot(ctx, owner, p.ProfileID, a.ID)
	if e != nil {
		t.Fatal(e)
	}
	a, e = service.Update(ctx, owner, api.AgentUpdate{CommandMeta: m("unbind", a.Revision), ID: a.ID, Draft: api.AgentDraft{Name: "pinned"}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = catalog.BeginDelete(ctx, p.ProfileID, ref)
	fault(t, e, "CREDENTIAL_IN_USE")
	if e = service.ReleaseSnapshot(ctx, snapshot.Token); e != nil {
		t.Fatal(e)
	}
	pending, e := catalog.BeginDelete(ctx, p.ProfileID, ref)
	if e != nil || pending.Status.State != "unknown" {
		t.Fatal("unknown registration reference lost", pending, e)
	}
	_, e = service.BindModel(ctx, owner, api.ModelBind{CommandMeta: m("racing-bind", a.Revision), AgentID: a.ID, Model: model})
	fault(t, e, "CREDENTIAL_IN_USE")
	if e = catalog.FinishDelete(ctx, p.ProfileID, ref, api.CredentialStatus{Mode: "protected", State: "missing", Reason: "CREDENTIAL_DELETED"}); e != nil {
		t.Fatal(e)
	}
	e = catalog.Reserve(ctx, p.ProfileID, ref, "protected")
	fault(t, e, "CREDENTIAL_REF_REUSED")
}
func TestLargeDirectoryPagesStayBoundedWithoutSkipping(t *testing.T) {
	c, _, _ := open(t)
	for i := 0; i < 8; i++ {
		_, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "large-"+string(rune('a'+i)), ""), Draft: api.AgentDraft{Name: "large", Persona: strings.Repeat("x", 131072)}})
		if e != nil {
			t.Fatal(e)
		}
	}
	q := api.PageQuery{ProfileID: meta(t, c, "query", "").ProfileID, Limit: 100}
	seen := map[string]bool{}
	pages := 0
	for {
		page, e := c.API.Assistant.List(ctx, owner, q)
		if e != nil {
			t.Fatal(e)
		}
		b, e := json.Marshal(page)
		if e != nil || len(b) > 524800 {
			t.Fatalf("unbounded result %d %v", len(b), e)
		}
		for _, a := range page.Items {
			if seen[a.ID] {
				t.Fatal("duplicate page entry", a.ID)
			}
			seen[a.ID] = true
		}
		pages++
		if page.NextCursor == "" {
			break
		}
		q.Cursor = page.NextCursor
	}
	if len(seen) != 9 || pages < 3 {
		t.Fatal("page skipped Bots", len(seen), pages)
	}
	_, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "escaped", ""), Draft: api.AgentDraft{Name: "escaped", Persona: strings.Repeat("\x00", 131072)}})
	fault(t, e, "AGENT_CONFIG_TOO_LARGE")
}
