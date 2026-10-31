package privatememory_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type memoryEngine func(context.Context, api.EngineInput) (api.EngineResult, error)

func (f memoryEngine) Run(ctx context.Context, input api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(ctx, input)
}
func (f memoryEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("unexpected Resume in private-memory fixture")
}

type memoryFixture struct {
	t                               *testing.T
	core                            *bootstrap.Core
	root, directory, profile, epoch string
}

func newMemoryFixture(t *testing.T, engine api.Engine, paused bool) *memoryFixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	directory := filepath.Join(root, "one")
	core, err := bootstrap.OpenWithOptions(context.Background(), root, directory, bootstrap.Options{Engine: engine, ExecutorPaused: paused})
	if err != nil {
		t.Fatal(err)
	}
	f := &memoryFixture{t: t, core: core, root: root, directory: directory}
	t.Cleanup(func() {
		_ = core.RequestStop()
		ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
		defer cancel()
		if err := core.WaitClosed(ctx); err != nil {
			t.Error("actual Core did not close", err)
		}
	})
	status, err := core.API.Service.Status(context.Background(), owner)
	if err != nil {
		t.Fatal(err)
	}
	f.profile, f.epoch = status.Profile.ProfileID, status.Profile.CommandEpoch
	return f
}
func (f *memoryFixture) meta(key, revision string) api.CommandMeta {
	return api.CommandMeta{ProfileID: f.profile, CommandEpoch: f.epoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
}
func (f *memoryFixture) next(revision string) api.CommandMeta {
	return f.meta(api.NewID("memory-test:"), revision)
}
func testHash(text string) string {
	sum := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(sum[:])
}
func memoryReason(err error, reason string) bool {
	var fault *api.Fault
	return errors.As(err, &fault) && fault.Reason == reason
}

func (f *memoryFixture) agent(name string, configured bool) api.Agent {
	f.t.Helper()
	draft := api.AgentDraft{Name: name, Persona: "Controlled private-memory contract"}
	if configured {
		sum := sha256.Sum256([]byte(name))
		ref := "credential:" + hex.EncodeToString(sum[:16])
		if _, err := f.core.Credentials.Register(context.Background(), f.profile, ref, "session-memory", []byte("CONTROLLED_LOCAL_MEMORY_KEY")); err != nil {
			f.t.Fatal(err)
		}
		draft.Model = &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "loopback", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1/v1", CredentialRef: ref}
	}
	a, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.next(""), Draft: draft})
	if err != nil {
		f.t.Fatal(err)
	}
	return a
}
func namespaceFor(a api.Agent) api.MemoryNamespace {
	return api.MemoryNamespace{Kind: "agent", ID: a.ID}
}
func (f *memoryFixture) page(ns api.MemoryNamespace, kind string) api.MemoryPage {
	f.t.Helper()
	page, err := f.core.API.Memory.List(context.Background(), owner, api.MemoryQuery{ProfileID: f.profile, Namespace: ns, Kind: kind, Limit: 50})
	if err != nil {
		f.t.Fatal(err)
	}
	return page
}
func (f *memoryFixture) add(ns api.MemoryNamespace, scope api.MemoryScope, text string) api.MemoryItem {
	f.t.Helper()
	page := f.page(ns, "item")
	item, err := f.core.API.Memory.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.next(page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &scope, Text: text})
	if err != nil {
		f.t.Fatal(err)
	}
	return item
}
func (f *memoryFixture) item(ns api.MemoryNamespace, id string) api.MemoryItem {
	f.t.Helper()
	object, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "item", ID: id})
	if err != nil || object.Item == nil {
		f.t.Fatal("actual item", object, err)
	}
	return *object.Item
}
func (f *memoryFixture) session(agent api.Agent) api.Session {
	f.t.Helper()
	session, err := f.core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{CommandMeta: f.next(""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		f.t.Fatal(err)
	}
	return session
}
func (f *memoryFixture) start(session api.Session, intent string) api.RunReceipt {
	f.t.Helper()
	current, err := f.core.API.Conversation.GetSession(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: session.ID})
	if err != nil {
		f.t.Fatal(err)
	}
	run, err := f.core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{CommandMeta: f.next(current.Revision), SessionID: session.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		f.t.Fatal(err)
	}
	return run
}
func (f *memoryFixture) wait(runID string, wanted ...string) api.Run {
	f.t.Helper()
	// Liveness only. Seventy ordinary turns under go test ./... on a 3-core
	// intel runner can exceed 7s without changing the provenance assertions.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		run, err := f.core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: runID})
		if err != nil {
			f.t.Fatal(err)
		}
		for _, status := range wanted {
			if run.Status == status {
				return run
			}
		}
		if run.Status == "succeeded" || run.Status == "failed" || run.Status == "canceled" {
			f.t.Fatalf("unexpected terminal %+v; wanted %v", run, wanted)
		}
		select {
		case <-ctx.Done():
			f.t.Fatalf("Run did not finish: %+v", run)
		case <-ticker.C:
		}
	}
}
func receiveInput(t *testing.T, inputs <-chan api.EngineInput) api.EngineInput {
	t.Helper()
	select {
	case in := <-inputs:
		return in
	case <-time.After(30 * time.Second):
		t.Fatal("real Executor did not enter Engine")
		return api.EngineInput{}
	}
}
func (f *memoryFixture) budget(policy api.BudgetPolicy) {
	f.t.Helper()
	old, err := f.core.API.Collaboration.Budget(context.Background(), owner, api.BudgetQuery{ProfileID: f.profile})
	if err != nil {
		f.t.Fatal(err)
	}
	if _, err = f.core.API.Collaboration.ConfigureBudget(context.Background(), owner, api.BudgetConfigure{CommandMeta: f.next(old.Revision), Policy: policy}); err != nil {
		f.t.Fatal(err)
	}
}
func (f *memoryFixture) database() *sql.DB {
	f.t.Helper()
	db, err := sql.Open("sqlite3", filepath.Join(f.directory, profile.DatabaseName))
	if err != nil {
		f.t.Fatal(err)
	}
	f.t.Cleanup(func() {
		if err := db.Close(); err != nil {
			f.t.Error(err)
		}
	})
	return db
}
func sqlCount(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var count int
	if err := db.QueryRowContext(context.Background(), query, args...).Scan(&count); err != nil {
		t.Fatal(query, err)
	}
	return count
}
