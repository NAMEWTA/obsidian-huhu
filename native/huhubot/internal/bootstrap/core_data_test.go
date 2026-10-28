package bootstrap

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	purgestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/purge"
	purgeapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/purge"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	file "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/portable"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func dataProofCore(t *testing.T) (*Core, string, api.RequestIdentity, api.ProfileMetadata) {
	t.Helper()
	ctx := context.Background()
	root := t.TempDir()
	if e := os.Chmod(root, 0700); e != nil {
		t.Fatal(e)
	}
	dir := filepath.Join(root, "profile")
	c, e := OpenWithOptions(ctx, root, dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		_ = c.RequestStop()
		x, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		if e := c.WaitClosed(x); e != nil {
			t.Error(e)
		}
	})
	id := api.NewConnectionIdentity("proof", "user", true)
	status, e := c.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	return c, dir, id, status.Profile
}
func TestPortableMemoryExportPreservesBody(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	a, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer", Persona: "source persona"}})
	if e != nil {
		t.Fatal(e)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: a.ID}
	page, e := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
	if e != nil {
		t.Fatal(e)
	}
	item, e := c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("memory", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "must survive export"})
	if e != nil {
		t.Fatal(e)
	}
	exported, e := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID, MemoryIDs: []string{item.ID}, AgentIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	pkg, e := file.NewArtifactStore(dir).Get(ctx, exported.Artifact)
	if e != nil {
		t.Fatal(e)
	}
	if len(pkg.Memories) != 1 || pkg.Memories[0].Text != "must survive export" {
		t.Fatalf("real exported memory lost text: %+v", pkg.Memories)
	}
}
func TestProfileClearDeletesManagedArtifacts(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	exported, e := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	preview, e := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "clear", IdempotencyKey: "clear", ExpectedRevision: preview.Revision}, PreviewToken: preview.Token})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = file.NewArtifactStore(dir).Get(ctx, exported.Artifact); e == nil {
		t.Fatal("profile clear reported success but managed portable artifact is still readable")
	}
}
func TestProfileClearBlocksActiveRuns(t *testing.T) {
	c, _, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	ref := "credential:01234567890123456789012345678901"
	if _, e := c.Credentials.Register(ctx, p.ProfileID, ref, "session-memory", []byte("controlled-key")); e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer", Persona: "source persona", Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "loopback", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/v1", CredentialRef: ref}}})
	if e != nil {
		t.Fatal(e)
	}
	session, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Conversation.StartRun(ctx, id, api.RunStart{CommandMeta: meta("run", session.Revision), SessionID: session.ID, Intent: "work"})
	if e != nil {
		t.Fatal(e)
	}
	other, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("other-session", ""), Kind: "direct", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	otherPreview, e := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: other.ID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: meta("erase-other", otherPreview.Revision), ID: other.ID, PreviewToken: otherPreview.Token})
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != "PROFILE_HAS_ACTIVE_RUNS" {
		t.Fatal("session cleanup could interrupt an unrelated active producer", e)
	}
	status, e := c.API.Service.Status(ctx, id)
	if e != nil || status.Cleanup != nil {
		t.Fatal("rejected cleanup closed active admission", status, e)
	}
	preview, e := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if e != nil {
		return
	}
	_, e = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: meta("clear", preview.Revision), PreviewToken: preview.Token})
	if e == nil {
		t.Fatal("profile clear accepted while a durable queued Run is still active")
	}
}

func TestSessionBodyDeletionUsesActualApplicationAndRejectsReplay(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	ref := "credential:11234567890123456789012345678901"
	if _, e := c.Credentials.Register(ctx, p.ProfileID, ref, "session-memory", []byte("controlled-key")); e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer", Persona: "source persona", Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "loopback", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/v1", CredentialRef: ref}}})
	if e != nil {
		t.Fatal(e)
	}
	session, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	start := api.RunStart{CommandMeta: meta("run", session.Revision), SessionID: session.ID, Intent: "erase my private body"}
	run, e := c.API.Conversation.StartRun(ctx, id, start)
	if e != nil {
		t.Fatal(e)
	}
	c.executor.Start()
	deadline := time.After(5 * time.Second)
	for {
		r, e := c.API.Conversation.GetRun(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: run.RunID})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == "succeeded" {
			break
		}
		select {
		case <-deadline:
			t.Fatal("run never finished", r)
		case <-time.After(time.Millisecond):
		}
	}
	artifact, e := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID, SessionIDs: []string{session.ID}})
	if e != nil {
		t.Fatal(e)
	}
	preview, e := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: meta("delete", preview.Revision), ID: session.ID, PreviewToken: preview.Token}); e != nil {
		t.Fatal(e)
	}
	page, e := c.API.Conversation.ListSessions(ctx, id, api.PageQuery{ProfileID: p.ProfileID, Limit: 50})
	if e != nil {
		t.Fatal(e)
	}
	for _, v := range page.Items {
		if v.ID == session.ID {
			t.Fatal("deleted session still listed")
		}
	}
	if _, e = c.API.Conversation.StartRun(ctx, id, start); e == nil {
		t.Fatal("old command revived deleted body")
	}
	if _, e = file.NewArtifactStore(dir).Get(ctx, artifact.Artifact); e == nil {
		t.Fatal("managed export retained deleted session body")
	}
}

type failedProfileCleaner struct{}

func (failedProfileCleaner) Clean(context.Context, string, []api.CredentialMetadata) error {
	return errors.New("controlled filesystem failure")
}
func TestFailedProfileCleanupStaysRestrictedAcrossRestartAndRetries(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	exported, err := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID})
	if err != nil {
		t.Fatal(err)
	}
	service := purgeapp.New(purgestore.New(c.store))
	service.SetCleaner(failedProfileCleaner{})
	controlled := purgeapp.NewAPI(service)
	preview, err := controlled.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if err != nil {
		t.Fatal(err)
	}
	command := api.ProfileDeleteCommand{CommandMeta: api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "failed-clean", IdempotencyKey: "failed-clean", ExpectedRevision: preview.Revision}, PreviewToken: preview.Token}
	if _, err = controlled.Delete(ctx, id, command); err == nil {
		t.Fatal("external cleanup failure reported success")
	}
	pending, err := controlled.Restricted(ctx)
	if err != nil || !pending {
		t.Fatal("cleanup lost durable restricted state", pending, err)
	}
	if _, err = c.Credentials.Register(ctx, p.ProfileID, "credential:31234567890123456789012345678901", "session-memory", []byte("late-secret")); err == nil {
		t.Fatal("credential registration crossed pending profile cleanup fence")
	}
	if err = c.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := OpenWithOptions(ctx, filepath.Dir(dir), dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	if _, err = reopened.API.Profile.Delete(ctx, id, command); err != nil {
		t.Fatal("original cleanup could not be retried after restart", err)
	}
	if _, err = file.NewArtifactStore(dir).Get(ctx, exported.Artifact); err == nil {
		t.Fatal("retry retained managed source")
	}
}

func TestPortableImportRejectsChangedTargetAndPersistsReceipt(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer", Persona: "original"}})
	if err != nil {
		t.Fatal(err)
	}
	artifact, err := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID, AgentIDs: []string{agent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	preview, err := c.Portable.ImportPreview(ctx, id, app.ImportPreviewRequest{ProfileID: p.ProfileID, Artifact: artifact.Artifact})
	if err != nil {
		t.Fatal(err)
	}
	_, err = c.API.Assistant.Update(ctx, id, api.AgentUpdate{CommandMeta: meta("edit", agent.Revision), ID: agent.ID, Draft: api.AgentDraft{Name: "Writer", Persona: "new content after preview"}})
	if err != nil {
		t.Fatal(err)
	}
	status, err := c.API.Service.Status(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	request := app.ImportRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "import-stale", IdempotencyKey: "import-stale", ExpectedRevision: status.Profile.Revision, PreviewToken: preview.Token, Resolutions: []app.ImportResolution{{ID: agent.ID, Action: "replace"}}}
	if _, err = c.Portable.Import(ctx, id, request); err == nil {
		t.Fatal("old preview replaced an unreviewed target revision")
	}
	preview, err = c.Portable.ImportPreview(ctx, id, app.ImportPreviewRequest{ProfileID: p.ProfileID, Artifact: artifact.Artifact})
	if err != nil {
		t.Fatal(err)
	}
	request.CommandID = "import-fresh"
	request.IdempotencyKey = "import-fresh"
	request.PreviewToken = preview.Token
	request.Resolutions[0].Action = "copy"
	imported, err := c.Portable.Import(ctx, id, request)
	if err != nil {
		t.Fatal(err)
	}
	if err = c.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := OpenWithOptions(ctx, filepath.Dir(dir), dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	request.CommandID = "another-transport-attempt"
	retried, err := reopened.Portable.Import(ctx, id, request)
	if err != nil || retried.ReceiptID != imported.ReceiptID {
		t.Fatal("committed import receipt did not survive process restart", retried, err)
	}
}

func TestProfileClearDoesNotSilentlyRetainPinnedMemory(t *testing.T) {
	c, _, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer"}})
	if err != nil {
		t.Fatal(err)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
	page, err := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
	if err != nil {
		t.Fatal(err)
	}
	item, err := c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("add", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "private pinned body"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = c.API.Memory.Pin(ctx, id, api.MemoryPin{CommandMeta: meta("pin", item.Revision), Namespace: ns, ID: item.ID, Pinned: true}); err != nil {
		t.Fatal(err)
	}
	preview, err := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: meta("clear", preview.Revision), PreviewToken: preview.Token}); err != nil {
		t.Fatal(err)
	}
	// Storage inspection is necessary here: an orphan body may no longer have a
	// UI owner but must still be physically absent after a promised full clear.
	db, err := sql.Open("sqlite3", "file:"+c.profile.DatabasePath+"?mode=ro")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var remaining int
	if err = db.QueryRowContext(ctx, "SELECT count(*) FROM memory_revision_bodies").Scan(&remaining); err != nil {
		t.Fatal(err)
	}
	if remaining != 0 {
		t.Fatal("profile clear retained unselected pinned plaintext", remaining)
	}
}

func TestSessionDeletionMakesSelectedPinnedMemoryIndependent(t *testing.T) {
	c, _, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "writer"}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
	page, err := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
	if err != nil {
		t.Fatal(err)
	}
	item, err := c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("add", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "session", ID: session.ID}, Text: "keep only this chosen fact"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = c.API.Memory.Pin(ctx, id, api.MemoryPin{CommandMeta: meta("pin", item.Revision), Namespace: ns, ID: item.ID, Pinned: true}); err != nil {
		t.Fatal(err)
	}
	preview, err := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	listed := false
	for _, category := range preview.Categories {
		if category.Kind == "memory:"+item.ID {
			listed = true
		}
	}
	if !listed {
		t.Fatal("pinned retention not listed")
	}
	if _, err = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: meta("delete", preview.Revision), ID: session.ID, PreviewToken: preview.Token, RetainMemoryIDs: []string{item.ID}}); err != nil {
		t.Fatal(err)
	}
	object, err := c.API.Memory.Get(ctx, id, api.MemoryGet{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", ID: item.ID})
	if err != nil || object.Item == nil || object.Item.Body == nil {
		t.Fatal("selected fact lost", object, err)
	}
	if object.Item.Scope.Kind != "profile" || object.Item.Body.Text != "keep only this chosen fact" || len(object.Item.Body.Derived) != 0 {
		t.Fatal("retained fact still depends on deleted body", object)
	}
}

func TestImportReplacingGroupDoesNotKeepRemovedMember(t *testing.T) { proveGroupReplacement(t, false) }
func TestImportReplacingGroupRejectsActiveRun(t *testing.T)         { proveGroupReplacement(t, true) }
func proveGroupReplacement(t *testing.T, active bool) {
	t.Helper()
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(k, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: k, IdempotencyKey: k, ExpectedRevision: rev}
	}
	draft := api.AgentDraft{Name: "memberA"}
	if active {
		ref := "credential:01234567890123456789012345678901"
		if _, e := c.Credentials.Register(ctx, p.ProfileID, ref, "session-memory", []byte("controlled-key")); e != nil {
			t.Fatal(e)
		}
		draft.Model = &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "loopback", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/v1", CredentialRef: ref}
	}
	a, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("a", ""), Draft: draft})
	if e != nil {
		t.Fatal(e)
	}
	b, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("b", ""), Draft: api.AgentDraft{Name: "memberB"}})
	if e != nil {
		t.Fatal(e)
	}
	g, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("g", ""), Kind: "group", Title: "group-collision", MemberIDs: []string{a.ID, b.ID}, CoordinatorID: a.ID})
	if e != nil {
		t.Fatal(e)
	}
	pkg, e := app.Build(app.Selection{SourceProfile: "source-profile", Agents: []app.Agent{{ID: "source-A", Name: "memberA", Revision: "1", PersonaRevision: "1", ModelRevision: "0", Enabled: true}}, Sessions: []app.Session{{ID: "source-group", Kind: "group", Title: "group-collision", MemberIDs: []string{"source-A"}, CoordinatorID: "source-A"}}})
	if e != nil {
		t.Fatal(e)
	}
	ref, e := file.NewArtifactStore(dir).Put(ctx, pkg)
	if e != nil {
		t.Fatal(e)
	}
	if active {
		if _, e = c.API.Conversation.StartRun(ctx, id, api.RunStart{CommandMeta: meta("run", g.Revision), SessionID: g.ID, TargetAgentIDs: []string{a.ID}, Intent: "keep working"}); e != nil {
			t.Fatal(e)
		}
	}
	pr, e := c.Portable.ImportPreview(ctx, id, app.ImportPreviewRequest{ProfileID: p.ProfileID, Artifact: ref})
	if e != nil {
		t.Fatal(e)
	}
	status, e := c.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.Portable.Import(ctx, id, app.ImportRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "import-group", IdempotencyKey: "import-group", ExpectedRevision: status.Profile.Revision, PreviewToken: pr.Token, Resolutions: []app.ImportResolution{{ID: "source-A", Action: "skip"}, {ID: "source-group", Action: "replace"}}})
	if active {
		var f *api.Fault
		if !errors.As(e, &f) || f.Reason != "SESSION_HAS_ACTIVE_RUNS" {
			t.Fatal("import bypassed active-run configuration barrier", e)
		}
		unchanged, err := c.API.Conversation.GetSession(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: g.ID})
		if err != nil || len(unchanged.MemberIDs) != 2 {
			t.Fatal("rejected import mutated active group", unchanged, err)
		}
		return
	}
	if e != nil {
		t.Fatal(e)
	}
	actual, e := c.API.Conversation.GetSession(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: g.ID})
	if e != nil {
		t.Fatal(e)
	}
	if len(actual.GroupMembers) != 1 || actual.GroupMembers[0].Incarnation == g.GroupMembers[0].Incarnation {
		t.Fatal("replacement retained old membership generation", actual.GroupMembers)
	}
	if len(actual.MemberIDs) != 1 || actual.MemberIDs[0] != a.ID {
		t.Fatalf("replace import kept members absent from approved replacement: got=%v wanted=[%s] removed=%s", actual.MemberIDs, a.ID, b.ID)
	}
}

func TestFailedSessionCleanupBlocksReadbackAndCanRetryOriginalToken(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "writer"}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
	page, err := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
	if err != nil {
		t.Fatal(err)
	}
	item, err := c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("fact", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "session", ID: session.ID}, Text: "retain after cleanup restart without reselecting"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = c.API.Memory.Pin(ctx, id, api.MemoryPin{CommandMeta: meta("pin", item.Revision), Namespace: ns, ID: item.ID, Pinned: true}); err != nil {
		t.Fatal(err)
	}
	artifact, err := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID, SessionIDs: []string{session.ID}})
	if err != nil {
		t.Fatal(err)
	}
	preview, err := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	checkpointRoot := filepath.Join(dir, "checkpoints")
	if err = os.RemoveAll(checkpointRoot); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(checkpointRoot, []byte("controlled cleanup obstruction"), 0600); err != nil {
		t.Fatal(err)
	}
	command := api.SessionDelete{CommandMeta: meta("delete", preview.Revision), ID: session.ID, PreviewToken: preview.Token, RetainMemoryIDs: []string{item.ID}}
	if _, err = c.API.Data.Delete(ctx, id, command); err == nil {
		t.Fatal("physical cleanup failure reported success")
	}
	pending, err := c.API.Profile.(interface {
		Restricted(context.Context) (bool, error)
	}).Restricted(ctx)
	if err != nil || !pending {
		t.Fatal("session cleanup failure lost restricted state", pending, err)
	}
	if _, err = c.Portable.ImportPreview(ctx, id, app.ImportPreviewRequest{ProfileID: p.ProfileID, Artifact: artifact.Artifact}); err == nil {
		t.Fatal("old artifact could be read back while deletion was incomplete")
	}
	status, err := c.API.Service.Status(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if status.Cleanup == nil || status.Cleanup.Profile || len(status.Cleanup.SessionIDs) != 1 || status.Cleanup.SessionIDs[0] != session.ID {
		t.Fatal("cleanup status lost the body-free retry target", status.Cleanup)
	}
	router := dataRouter(t, c, id)
	for _, method := range []string{"service.status", "profile.status"} {
		response := dataRequest(t, router, method, map[string]any{})
		if response.Error != nil {
			t.Fatal("restricted recovery status unavailable", response.Error)
		}
		data, _ := json.Marshal(response.Result)
		var wireStatus wire.StatusResult
		if json.Unmarshal(data, &wireStatus) != nil || wireStatus.Cleanup == nil || len(wireStatus.Cleanup.SessionIDs) != 1 || wireStatus.Cleanup.SessionIDs[0] != session.ID {
			t.Fatal("wire cleanup target absent", string(data))
		}
	}
	attach := dataRequest(t, router, "host.attach", map[string]any{"workspaceId": "vault", "capabilities": []string{"note.read"}})
	if attach.Error == nil || attach.Error.Data.Reason != "PROFILE_CLEANUP_PENDING" {
		t.Fatal("restricted mode admitted Host", attach.Error)
	}
	newer := meta("mutate-during-cleanup", agent.Revision)
	newer.CommandEpoch = status.Profile.CommandEpoch
	if _, err = c.API.Assistant.Update(ctx, id, api.AgentUpdate{CommandMeta: newer, ID: agent.ID, Draft: api.AgentDraft{Name: "must not be changed during cleanup"}}); err == nil {
		t.Fatal("business mutation crossed cleanup admission fence")
	}
	if err = os.Remove(checkpointRoot); err != nil {
		t.Fatal(err)
	}
	if err = os.Mkdir(checkpointRoot, 0700); err != nil {
		t.Fatal(err)
	}
	recovered, err := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
	if err != nil || recovered.Token != preview.Token {
		t.Fatal("cleanup lost original retry token", recovered, err)
	}
	command.RetainMemoryIDs = nil // The committed job owns the original retention choice.
	command.CommandID = "retry-cleanup"
	command.IdempotencyKey = "retry-cleanup"
	command.CommandEpoch = status.Profile.CommandEpoch
	command.ExpectedRevision = recovered.Revision
	if _, err = c.API.Data.Delete(ctx, id, command); err != nil {
		t.Fatal("original token cleanup retry failed", err)
	}
	if _, err = file.NewArtifactStore(dir).Get(ctx, artifact.Artifact); err == nil {
		t.Fatal("retry retained deleted managed artifact")
	}
	pending, err = c.API.Profile.(interface {
		Restricted(context.Context) (bool, error)
	}).Restricted(ctx)
	if err != nil || pending {
		t.Fatal("successful cleanup did not release restriction", pending, err)
	}
	status, err = c.API.Service.Status(ctx, id)
	if err != nil || status.Cleanup != nil {
		t.Fatal("completed cleanup still advertised recovery", status.Cleanup, err)
	}
	retained, err := c.API.Memory.Get(ctx, id, api.MemoryGet{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", ID: item.ID})
	if err != nil || retained.Item == nil || retained.Item.Body == nil || retained.Item.Scope.Kind != "profile" {
		t.Fatal("pending retry changed committed retention", retained, err)
	}
}

type blockedArtifactStore struct {
	base             *file.ArtifactStore
	started, release chan struct{}
	once             sync.Once
}

func (s *blockedArtifactStore) Get(ctx context.Context, ref app.ArtifactRef) (app.Package, error) {
	return s.base.Get(ctx, ref)
}
func (s *blockedArtifactStore) Put(ctx context.Context, pkg app.Package) (app.ArtifactRef, error) {
	s.once.Do(func() { close(s.started) })
	select {
	case <-s.release:
	case <-ctx.Done():
		return app.ArtifactRef{}, ctx.Err()
	}
	return s.base.Put(ctx, pkg)
}
func TestPendingArtifactPublicationCannotCrossSessionErasure(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	if err := os.Chmod(root, 0700); err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(root, "profile")
	artifacts := &blockedArtifactStore{base: file.NewArtifactStore(dir), started: make(chan struct{}), release: make(chan struct{})}
	c, err := OpenWithOptions(ctx, root, dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true, Artifacts: artifacts})
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	defer func() {
		select {
		case <-artifacts.release:
		default:
			close(artifacts.release)
		}
	}()
	id := api.NewConnectionIdentity("artifact-race", "owner", true)
	status, err := c.API.Service.Status(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	p := status.Profile
	meta := func(key, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
	}
	agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "writer"}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	preview, err := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	type exported struct {
		result app.ExportResult
		err    error
	}
	result := make(chan exported, 1)
	go func() {
		v, e := c.Portable.Export(ctx, id, app.ExportRequest{ProfileID: p.ProfileID, SessionIDs: []string{session.ID}})
		result <- exported{v, e}
	}()
	select {
	case <-artifacts.started:
	case <-time.After(time.Second):
		t.Fatal("artifact publication did not reach controlled boundary")
	}
	timed, cancel := context.WithTimeout(ctx, 30*time.Millisecond)
	defer cancel()
	command := api.SessionDelete{CommandMeta: meta("delete", preview.Revision), ID: session.ID, PreviewToken: preview.Token}
	if _, err = c.API.Data.Delete(timed, id, command); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal("erasure did not wait for the already accepted artifact producer", err)
	}
	close(artifacts.release)
	completed := <-result
	if completed.err != nil {
		t.Fatal(completed.err)
	}
	if _, err = c.API.Data.Delete(ctx, id, command); err != nil {
		t.Fatal(err)
	}
	if _, err = artifacts.base.Get(ctx, completed.result.Artifact); err == nil {
		t.Fatal("old artifact publisher recreated a package after body erasure")
	}
}

func TestChunkedPortableStageIsBoundedOwnedAndStrictBeforePublication(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	stage := c.Portable.(app.StageAPI)
	pkg, err := app.Build(app.Selection{SourceProfile: "source:upload", Agents: []app.Agent{{ID: "source:agent", Name: "uploaded", Revision: "1", PersonaRevision: "1", ModelRevision: "0", Enabled: true}}})
	if err != nil {
		t.Fatal(err)
	}
	payload, err := file.Encode(pkg)
	if err != nil {
		t.Fatal(err)
	}
	split := len(payload) / 2
	first := app.StageRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, Size: strconv.Itoa(len(payload)), Offset: "0", DataBase64: base64.StdEncoding.EncodeToString(payload[:split])}
	partial, err := stage.Stage(ctx, id, first)
	if err != nil || partial.Artifact != nil || partial.NextOffset != strconv.Itoa(split) {
		t.Fatal("partial upload was published", partial, err)
	}
	retry := first
	retry.UploadID = partial.UploadID
	again, err := stage.Stage(ctx, id, retry)
	if err != nil || again.NextOffset != partial.NextOffset {
		t.Fatal("exact chunk retry failed", again, err)
	}
	changed := retry
	changed.DataBase64 = base64.StdEncoding.EncodeToString([]byte("changed"))
	if _, err = stage.Stage(ctx, id, changed); err == nil {
		t.Fatal("changed duplicate offset was accepted")
	}
	if _, err = stage.Stage(ctx, api.NewConnectionIdentity("foreign-upload", "other-user", false), retry); err == nil {
		t.Fatal("upload crossed principal/connection")
	}
	last := app.StageRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, UploadID: partial.UploadID, Size: first.Size, Offset: partial.NextOffset, DataBase64: base64.StdEncoding.EncodeToString(payload[split:]), Final: true}
	complete, err := stage.Stage(ctx, id, last)
	if err != nil || complete.Artifact == nil {
		t.Fatal("valid archive did not publish", complete, err)
	}
	retried, err := stage.Stage(ctx, id, last)
	if err != nil || retried.Artifact == nil || retried.Artifact.ArtifactID != complete.Artifact.ArtifactID {
		t.Fatal("final duplicate published twice", retried, err)
	}
	decoded, err := file.NewArtifactStore(dir).Get(ctx, *complete.Artifact)
	if err != nil || decoded.PackageHash != pkg.PackageHash {
		t.Fatal("staged artifact changed", decoded, err)
	}
	bad := app.StageRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, Size: "3", Offset: "0", DataBase64: base64.StdEncoding.EncodeToString([]byte("bad")), Final: true}
	if _, err = stage.Stage(ctx, id, bad); err == nil {
		t.Fatal("unsealed archive became an artifact")
	}
	reserve := app.StageRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, Size: strconv.Itoa(app.MaxPackageBytes), Offset: "0", DataBase64: "eA=="}
	if _, err = stage.Stage(ctx, id, reserve); err != nil {
		t.Fatal(err)
	}
	reserve.Size = "1"
	if _, err = stage.Stage(ctx, id, reserve); err == nil {
		t.Fatal("uploads exceeded the aggregate sixteen MiB reserve")
	}
}

func TestSessionDeletionErasesSQLiteWALBody(t *testing.T) {
	c, _, id, p := dataProofCore(t)
	ctx := context.Background()
	if _, e := c.store.Database().ExecContext(ctx, "PRAGMA wal_autocheckpoint=0"); e != nil {
		t.Fatal(e)
	}
	meta := func(k, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: k, IdempotencyKey: k, ExpectedRevision: rev}
	}
	a, e := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "Writer"}})
	if e != nil {
		t.Fatal(e)
	}
	s, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{a.ID}})
	if e != nil {
		t.Fatal(e)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: a.ID}
	page, e := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
	if e != nil {
		t.Fatal(e)
	}
	canary := []byte("SESSION_ERASURE_CANARY_82b76f94d1_PRIVATE_TEXT")
	_, e = c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("memory", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "session", ID: s.ID}, Text: string(canary)})
	if e != nil {
		t.Fatal(e)
	}
	before, e := os.ReadFile(c.profile.DatabasePath + "-wal")
	if e != nil {
		t.Fatal(e)
	}
	if !bytes.Contains(before, canary) {
		t.Fatal("control canary not present in WAL before deletion")
	}
	preview, e := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: s.ID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: meta("delete", preview.Revision), ID: s.ID, PreviewToken: preview.Token})
	if e != nil {
		t.Fatal(e)
	}
	after, e := os.ReadFile(c.profile.DatabasePath + "-wal")
	if e != nil && !os.IsNotExist(e) {
		t.Fatal(e)
	}
	if bytes.Contains(after, canary) {
		t.Fatal("successful Session body deletion left old private body readable in the managed SQLite WAL")
	}
}

func dataRequest(t *testing.T, r *hap.Router, method string, params any) hap.Response {
	t.Helper()
	payload, err := json.Marshal(params)
	if err != nil {
		t.Fatal(err)
	}
	requestID := api.NewID("c:data:")
	return r.Dispatch(context.Background(), wire.Envelope{ID: &requestID, Method: method, Params: payload}, nil)
}
func dataRouter(t *testing.T, c *Core, id api.RequestIdentity) *hap.Router {
	t.Helper()
	r := hap.NewWithPortable(c.API, id, c.Portable)
	response := dataRequest(t, r, "protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "data-proof", "version": "1"}})
	if response.Error != nil {
		t.Fatal(response.Error)
	}
	return r
}

func TestProfileClearRejectsRetentionAtAPIAndStoreBoundary(t *testing.T) {
	c, _, id, p := dataProofCore(t)
	ctx := context.Background()
	preview, err := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if err != nil {
		t.Fatal(err)
	}
	meta := api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "clear", IdempotencyKey: "clear", ExpectedRevision: preview.Revision}
	_, err = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: meta, PreviewToken: preview.Token, RetainMemoryIDs: []string{"memory:retain"}})
	assertProfileRetentionRejected(t, err)
	repo := purgestore.New(c.store)
	request := purgeapp.ExecuteRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, ExpectedRevision: preview.Revision, Token: preview.Token, RetainMemoryIDs: []string{"memory:retain"}}
	_, err = repo.Execute(ctx, request)
	assertProfileRetentionRejected(t, err)
	_, err = repo.BeginCleanup(ctx, request)
	assertProfileRetentionRejected(t, err)
	status, err := c.API.Service.Status(ctx, id)
	if err != nil || status.Profile != p || status.Cleanup != nil {
		t.Fatal("rejected retention changed profile", status, err)
	}
}
func assertProfileRetentionRejected(t *testing.T, err error) {
	t.Helper()
	var f *api.Fault
	if !errors.As(err, &f) || f.Reason != "PROFILE_RETENTION_NOT_SUPPORTED" {
		t.Fatal("unsupported full-clear retention was accepted", err)
	}
}

func TestPortableStagePublishesThroughActualHAP(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	router := dataRouter(t, c, id)
	pkg, err := app.Build(app.Selection{SourceProfile: "source:wire", Agents: []app.Agent{{ID: "source:agent", Name: "wire upload", Revision: "1", PersonaRevision: "1", ModelRevision: "0", Enabled: true}}})
	if err != nil {
		t.Fatal(err)
	}
	payload, err := file.Encode(pkg)
	if err != nil {
		t.Fatal(err)
	}
	response := dataRequest(t, router, "portable.stage", app.StageRequest{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, Size: strconv.Itoa(len(payload)), Offset: "0", DataBase64: base64.StdEncoding.EncodeToString(payload), Final: true})
	if response.Error != nil {
		t.Fatal("actual HAP upload failed", response.Error)
	}
	data, _ := json.Marshal(response.Result)
	var staged app.StageResult
	if json.Unmarshal(data, &staged) != nil || staged.Artifact == nil || staged.NextOffset != strconv.Itoa(len(payload)) {
		t.Fatal("wire upload omitted sealed artifact", string(data))
	}
	actual, err := file.NewArtifactStore(dir).Get(context.Background(), *staged.Artifact)
	if err != nil || actual.PackageHash != pkg.PackageHash {
		t.Fatal("wire staged different archive", actual, err)
	}
}

func TestPhysicalErasureWaitsForWALReadersAndRetries(t *testing.T) {
	for _, scope := range []string{"session", "profile"} {
		t.Run(scope, func(t *testing.T) {
			c, _, id, p := dataProofCore(t)
			ctx := context.Background()
			if _, err := c.store.Database().ExecContext(ctx, "PRAGMA wal_autocheckpoint=0"); err != nil {
				t.Fatal(err)
			}
			meta := func(key, rev string) api.CommandMeta {
				return api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: rev}
			}
			agent, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "writer"}})
			if err != nil {
				t.Fatal(err)
			}
			session, err := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
			if err != nil {
				t.Fatal(err)
			}
			ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
			page, err := c.API.Memory.List(ctx, id, api.MemoryQuery{ProfileID: p.ProfileID, Namespace: ns, Kind: "item", Limit: 50})
			if err != nil {
				t.Fatal(err)
			}
			canary := []byte("WAL_SNAPSHOT_ERASURE_BARRIER_f356_private_" + scope)
			_, err = c.API.Memory.Correct(ctx, id, api.MemoryCorrect{CommandMeta: meta("body", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "session", ID: session.ID}, Text: string(canary)})
			if err != nil {
				t.Fatal(err)
			}
			reader, err := sql.Open("sqlite3", "file:"+c.profile.DatabasePath+"?mode=ro")
			if err != nil {
				t.Fatal(err)
			}
			defer reader.Close()
			readTx, err := reader.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
			if err != nil {
				t.Fatal(err)
			}
			defer readTx.Rollback()
			var count int
			if err = readTx.QueryRowContext(ctx, "SELECT count(*) FROM memory_revision_bodies").Scan(&count); err != nil || count == 0 {
				t.Fatal("reader did not pin private snapshot", count, err)
			}
			var preview api.DeletionPreview
			if scope == "session" {
				preview, err = c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
			} else {
				preview, err = c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
			}
			if err != nil {
				t.Fatal(err)
			}
			if scope == "session" {
				_, err = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: meta("erase", preview.Revision), ID: session.ID, PreviewToken: preview.Token})
			} else {
				_, err = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: meta("erase", preview.Revision), PreviewToken: preview.Token})
			}
			var fault *api.Fault
			if !errors.As(err, &fault) || fault.Reason != "PROFILE_DB_CLEANUP_PENDING" {
				t.Fatal("busy WAL erasure was acknowledged", err)
			}
			status, err := c.API.Service.Status(ctx, id)
			if err != nil || status.Cleanup == nil || status.Cleanup.Profile != (scope == "profile") {
				t.Fatal("physical cleanup lost durable recovery marker", status, err)
			}
			router := dataRouter(t, c, id)
			response := dataRequest(t, router, "service.status", map[string]any{})
			if response.Error != nil {
				t.Fatal("restricted cleanup HAP recovery unavailable", response.Error)
			}
			before, err := os.ReadFile(c.profile.DatabasePath + "-wal")
			if err != nil || !bytes.Contains(before, canary) {
				t.Fatal("pinned WAL control was absent", err)
			}
			if err = readTx.Rollback(); err != nil {
				t.Fatal(err)
			}
			if scope == "session" {
				fresh, e := c.API.Data.DeletePreview(ctx, id, api.IDQuery{ProfileID: p.ProfileID, ID: session.ID})
				if e != nil {
					t.Fatal(e)
				}
				command := meta("retry", fresh.Revision)
				command.CommandEpoch = status.Profile.CommandEpoch
				_, err = c.API.Data.Delete(ctx, id, api.SessionDelete{CommandMeta: command, ID: session.ID, PreviewToken: fresh.Token})
			} else {
				// The SQL phase has committed but the previous WAL was busy. A
				// restart must expose recovery without seeding old business state.
				dir := filepath.Dir(c.profile.DatabasePath)
				if err = c.Close(); err != nil {
					t.Fatal(err)
				}
				c, err = OpenWithOptions(ctx, filepath.Dir(dir), dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true})
				if err != nil {
					t.Fatal(err)
				}
				defer c.Close()
				dataRouter(t, c, id)
				var policies, agents int
				if err = c.store.Database().QueryRowContext(ctx, "SELECT (SELECT count(*) FROM model_budget_policy),(SELECT count(*) FROM agents)").Scan(&policies, &agents); err != nil || policies != 0 || agents != 0 {
					t.Fatal("restart repopulated erased Profile before cleanup completed", policies, agents, err)
				}
				fresh, e := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
				if e != nil {
					t.Fatal(e)
				}
				if fresh.Token != preview.Token {
					t.Fatal("profile retry lost original token", fresh)
				}
				_, err = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: meta("retry", fresh.Revision), PreviewToken: fresh.Token})
			}
			if err != nil {
				t.Fatal("physical erasure retry failed", err)
			}
			for _, name := range []string{c.profile.DatabasePath, c.profile.DatabasePath + "-wal"} {
				data, e := os.ReadFile(name)
				if e != nil && !os.IsNotExist(e) {
					t.Fatal(e)
				}
				if bytes.Contains(data, canary) {
					t.Fatal("successful physical erasure left plaintext", name)
				}
			}
		})
	}
}

func TestFreshProfileAfterClearCanHandshake(t *testing.T) {
	c, dir, id, p := dataProofCore(t)
	ctx := context.Background()
	oldBudget, e := c.API.Collaboration.Budget(ctx, id, api.BudgetQuery{ProfileID: p.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Collaboration.ConfigureBudget(ctx, id, api.BudgetConfigure{CommandMeta: api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "old-budget", IdempotencyKey: "old-budget", ExpectedRevision: oldBudget.Revision}, Policy: api.BudgetPolicy{RootTokenLimit: "10000", ProfileTokenLimit: "50000", MaintenanceTokenLimit: "3000", Paused: false}})
	if e != nil {
		t.Fatal(e)
	}
	preview, e := c.API.Profile.DeletePreview(ctx, id, api.ProfileDeletePreviewRequest{ProfileID: p.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Profile.Delete(ctx, id, api.ProfileDeleteCommand{CommandMeta: api.CommandMeta{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, CommandID: "erase", IdempotencyKey: "erase", ExpectedRevision: preview.Revision}, PreviewToken: preview.Token})
	if e != nil {
		t.Fatal(e)
	}
	if e = c.WaitClosed(ctx); e != nil {
		t.Fatal(e)
	}
	reopened, e := OpenWithOptions(ctx, filepath.Dir(dir), dir, Options{Engine: portableAssemblyEngine{}, ExecutorPaused: true, Budget: api.BudgetPolicy{RootTokenLimit: "20000", ProfileTokenLimit: "90000", MaintenanceTokenLimit: "4000", Paused: false}})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	status, e := reopened.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	if status.Profile.ProfileID == p.ProfileID {
		t.Fatal("profile identity did not rotate")
	}
	newBudget, e := reopened.API.Collaboration.Budget(ctx, id, api.BudgetQuery{ProfileID: status.Profile.ProfileID})
	if e != nil {
		t.Fatalf("fresh cleared Profile cannot provide mandatory hello policy: %v", e)
	}
	if !newBudget.Policy.Paused || newBudget.Policy.RootTokenLimit != "0" || newBudget.Policy.ProfileTokenLimit != "0" || newBudget.Policy.MaintenanceTokenLimit != "0" || newBudget.Revision != "1" {
		t.Fatal("cleared Profile inherited spending authority", newBudget)
	}
	dataRouter(t, reopened, id)
}

func TestPortablePreviewShowsFrozenCopyMappingAndAllExistingTargets(t *testing.T) {
	c, dir, id, profile := dataProofCore(t)
	ctx := context.Background()
	meta := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{ProfileID: profile.ProfileID, CommandEpoch: profile.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
	}
	first, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("first", ""), Draft: api.AgentDraft{Name: "same-name", Persona: "first original"}})
	if err != nil {
		t.Fatal(err)
	}
	second, err := c.API.Assistant.Create(ctx, id, api.AgentCreate{CommandMeta: meta("second", ""), Draft: api.AgentDraft{Name: "same-name", Persona: "second original"}})
	if err != nil {
		t.Fatal(err)
	}
	pkg, err := app.Build(app.Selection{SourceProfile: "source:preview", Agents: []app.Agent{{ID: "source-agent", Name: "same-name", Persona: "incoming persona", Revision: "1", PersonaRevision: "1", ModelRevision: "0", Enabled: true}}})
	if err != nil {
		t.Fatal(err)
	}
	artifact, err := file.NewArtifactStore(dir).Put(ctx, pkg)
	if err != nil {
		t.Fatal(err)
	}
	router := dataRouter(t, c, id)
	response := dataRequest(t, router, "portable.importPreview", map[string]any{"profileId": profile.ProfileID, "artifact": artifact})
	if response.Error != nil {
		t.Fatal(response.Error)
	}
	data, _ := json.Marshal(response.Result)
	var preview struct {
		Token       string                            `json:"token"`
		MappingMode string                            `json:"mappingMode"`
		Mappings    []struct{ Kind, From, To string } `json:"mappings"`
		Conflicts   []struct {
			ID, Revision, Hash, Kind, ExistingID, Reason string
			NeedsReview                                  bool
		} `json:"conflicts"`
	}
	if err = json.Unmarshal(data, &preview); err != nil {
		t.Fatal(err)
	}
	if preview.Token == "" || preview.MappingMode != "copy-candidate" || len(preview.Mappings) != 1 || preview.Mappings[0].From != "source-agent" || preview.Mappings[0].Kind != "agent" || preview.Mappings[0].To == "" {
		t.Fatal("wire preview omitted copy candidate mapping", string(data))
	}
	if len(preview.Conflicts) != 2 {
		t.Fatal("wire preview hid ambiguous existing targets", string(data))
	}
	targets := map[string]bool{first.ID: true, second.ID: true}
	for _, conflict := range preview.Conflicts {
		if conflict.ID != "source-agent" || conflict.Kind != "agent" || !targets[conflict.ExistingID] || conflict.Reason != "NAME_CONFLICT" || !conflict.NeedsReview || conflict.Revision != "1" || conflict.Hash == "" {
			t.Fatal("wire conflict lost target identity", string(data))
		}
		delete(targets, conflict.ExistingID)
	}
	if len(targets) != 0 {
		t.Fatal("wire preview duplicated a target", string(data))
	}
	status, err := c.API.Service.Status(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{"keep", "replace"} {
		command := map[string]any{"profileId": profile.ProfileID, "commandEpoch": profile.CommandEpoch, "commandId": action, "idempotencyKey": action, "expectedRevision": status.Profile.Revision, "previewToken": preview.Token, "resolutions": []map[string]string{{"id": "source-agent", "action": action}}}
		rejected := dataRequest(t, router, "portable.import", command)
		if rejected.Error == nil || rejected.Error.Data.Reason != "AMBIGUOUS_IMPORT_TARGET" {
			t.Fatal("ambiguous target silently accepted", action, rejected.Error)
		}
	}
	copied := dataRequest(t, router, "portable.import", map[string]any{"profileId": profile.ProfileID, "commandEpoch": profile.CommandEpoch, "commandId": "copy", "idempotencyKey": "copy", "expectedRevision": status.Profile.Revision, "previewToken": preview.Token, "resolutions": []map[string]string{{"id": "source-agent", "action": "copy"}}})
	if copied.Error != nil {
		t.Fatal("fixed preview could not proceed with copy", copied.Error)
	}
	copy, err := c.API.Assistant.Get(ctx, id, api.IDQuery{ProfileID: profile.ProfileID, ID: preview.Mappings[0].To})
	if err != nil || copy.Persona != "incoming persona" {
		t.Fatal("copy did not use frozen candidate ID", copy, err)
	}
	for _, original := range []api.Agent{first, second} {
		actual, e := c.API.Assistant.Get(ctx, id, api.IDQuery{ProfileID: profile.ProfileID, ID: original.ID})
		if e != nil || actual.Persona != original.Persona || actual.Revision != original.Revision {
			t.Fatal("ambiguous preview overwrote existing target", actual, e)
		}
	}
}
