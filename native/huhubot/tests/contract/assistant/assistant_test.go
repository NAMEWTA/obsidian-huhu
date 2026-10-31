package assistant_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("test", "owner", true)

func open(t *testing.T) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = c.Close() })
	if c.API.Assistant == nil {
		t.Fatal("T02 Assistant facade not assembled")
	}
	return c, root, locator
}
func meta(t *testing.T, c *bootstrap.Core, key, revision string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: revision}
}
func fault(t *testing.T, e error, reason string) {
	t.Helper()
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != reason {
		t.Fatalf("want %s, got %v", reason, e)
	}
}

// fakeRun is a real configuration consumer: execution reads only its admitted
// immutable snapshot, while later starts ask the same production port for head.
type fakeRun struct {
	config api.ConfigSnapshot
	port   api.AgentConfigPort
}

func startFakeRun(t *testing.T, port api.AgentConfigPort, profileID, agentID string) fakeRun {
	t.Helper()
	snapshot, e := port.AcquireSnapshot(ctx, owner, profileID, agentID)
	if e != nil {
		t.Fatal(e)
	}
	return fakeRun{snapshot, port}
}
func (r fakeRun) execute() string { return r.config.Agent.Persona }
func (r fakeRun) finish(t *testing.T) {
	t.Helper()
	if e := r.port.ReleaseSnapshot(ctx, r.config.Token); e != nil {
		t.Fatal(e)
	}
}
func TestPersistentBotsCASReplayAndPinnedRunSnapshots(t *testing.T) {
	c, root, locator := open(t)
	s, _ := c.API.Service.Status(ctx, owner)
	page, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: s.Profile.ProfileID})
	if e != nil || len(page.Items) != 1 || !page.Items[0].IsDefault {
		t.Fatalf("default: %#v %v", page, e)
	}
	draft := api.AgentDraft{Name: "same", Description: "description", Persona: "old persona"}
	create := api.AgentCreate{CommandMeta: meta(t, c, "create", ""), Draft: draft}
	a, e := c.API.Assistant.Create(ctx, owner, create)
	if e != nil {
		t.Fatal(e)
	}
	again, e := c.API.Assistant.Create(ctx, owner, create)
	if e != nil || again.ID != a.ID {
		t.Fatalf("replay: %#v %v", again, e)
	}
	create.Draft.Persona = "different"
	_, e = c.API.Assistant.Create(ctx, owner, create)
	fault(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
	create.CommandMeta = meta(t, c, "same-name", "")
	b, e := c.API.Assistant.Create(ctx, owner, create)
	if e != nil || a.ID == b.ID {
		t.Fatal("duplicate name", e)
	}
	oldRun := startFakeRun(t, c.API.Assistant, s.Profile.ProfileID, a.ID)
	pinned := oldRun.config
	draft.Persona = "new persona"
	var wg sync.WaitGroup
	out := make(chan error, 2)
	for _, key := range []string{"u1", "u2"} {
		m := meta(t, c, key, a.Revision)
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: m, ID: a.ID, Draft: draft})
			out <- e
		}()
	}
	wg.Wait()
	close(out)
	wins, conflicts := 0, 0
	for e := range out {
		if e == nil {
			wins++
		} else {
			fault(t, e, "REVISION_CONFLICT")
			conflicts++
		}
	}
	if wins != 1 || conflicts != 1 {
		t.Fatalf("CAS %d %d", wins, conflicts)
	}
	newRun := startFakeRun(t, c.API.Assistant, s.Profile.ProfileID, a.ID)
	newer := newRun.config
	if e != nil || oldRun.execute() != "old persona" || newRun.execute() != "new persona" || pinned.Agent.PersonaRevision == newer.Agent.PersonaRevision {
		t.Fatal("immutable run snapshots", e)
	}
	oldRun.finish(t)
	newRun.finish(t)
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	c2, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	defer c2.Close()
	got, e := c2.API.Assistant.Get(ctx, owner, api.IDQuery{ProfileID: s.Profile.ProfileID, ID: a.ID})
	if e != nil || got.ID != a.ID || got.Persona != "new persona" {
		t.Fatalf("reopen %#v %v", got, e)
	}
	p2, e := c2.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: s.Profile.ProfileID})
	if e != nil || len(p2.Items) != 3 || p2.Items[0].ID == "" {
		t.Fatal("stable directory", e)
	}
}

func TestGroupMembershipIsARealDeletionReference(t *testing.T) {
	c, _, _ := open(t)
	b, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "group-b", ""), Draft: api.AgentDraft{Name: "B", Persona: "B"}})
	if e != nil {
		t.Fatal(e)
	}
	page, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: meta(t, c, "lookup", "").ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	var a string
	for _, item := range page.Items {
		if item.IsDefault {
			a = item.ID
		}
	}
	if a == "" {
		t.Fatal("default coordinator missing")
	}
	group, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "group-create", ""), Kind: "group", Title: "deletion references", MemberIDs: []string{a, b.ID}, CoordinatorID: a})
	if e != nil {
		t.Fatal(e)
	}
	b, e = c.API.Assistant.Disable(ctx, owner, api.AgentDisable{CommandMeta: meta(t, c, "disable-b", b.Revision), ID: b.ID})
	if e != nil {
		t.Fatal(e)
	}
	preview, e := c.API.Assistant.DeletePreview(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "p", "").ProfileID, ID: b.ID})
	if e != nil {
		t.Fatal(e)
	}
	found := false
	for _, category := range preview.Categories {
		if category.Kind == "groups" && category.Reason == "CONTEXT_NOT_ASSEMBLED" {
			t.Fatal("group usage still unassembled")
		}
		if category.Kind == "group-memberships" {
			found = category.Count == 1 && category.Retained
		}
	}
	if !found {
		t.Fatalf("missing real group reference: %#v", preview)
	}
	_, e = c.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta(t, c, "delete-in-group", b.Revision), ID: b.ID, PreviewToken: preview.Token})
	fault(t, e, "AGENT_IN_USE")
	if c.API.Groups == nil {
		t.Fatal("groups not assembled")
	}
	_, e = c.API.Groups.UpdateMembers(ctx, owner, api.SessionMembersUpdate{CommandMeta: meta(t, c, "remove-b", group.Revision), ID: group.ID, MemberIDs: []string{a}, HistoryScope: api.GroupHistoryScope{Kind: "none"}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta(t, c, "stale-delete", b.Revision), ID: b.ID, PreviewToken: preview.Token})
	fault(t, e, "DELETION_PREVIEW_STALE")
	fresh, e := c.API.Assistant.DeletePreview(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "p2", "").ProfileID, ID: b.ID})
	if e != nil {
		t.Fatal(e)
	}
	for _, category := range fresh.Categories {
		if category.Kind == "group-memberships" && category.Count != 0 {
			t.Fatal("inactive membership still blocks", fresh)
		}
	}
	if _, e = c.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta(t, c, "fresh-delete", b.Revision), ID: b.ID, PreviewToken: fresh.Token}); e != nil {
		t.Fatal(e)
	}
}
