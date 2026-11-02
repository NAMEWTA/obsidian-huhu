package performance_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	runtimeprofile "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"github.com/ncruces/go-sqlite3"
)

// Fixture lifecycle and public API helpers adapted from ../private-memory/fixture_test.go.
var scaleOwner = api.NewConnectionIdentity("dependency-scale", "owner", true)

type scaleEngine func(context.Context, api.EngineInput) (api.EngineResult, error)

func (f scaleEngine) Run(ctx context.Context, input api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return f(ctx, input)
}
func (f scaleEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("unexpected Resume in private-memory fixture")
}

type scaleFixture struct {
	t                               *testing.T
	core                            *bootstrap.Core
	root, directory, profile, epoch string
}

func newScaleFixture(t *testing.T, engine api.Engine, paused bool) *scaleFixture {
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
	f := &scaleFixture{t: t, core: core, root: root, directory: directory}
	t.Cleanup(func() {
		_ = core.RequestStop()
		// TempDir cleanup runs after this callback: retain ownership until the
		// Core actually finishes, even when an observer deadline would expire.
		if err := core.WaitClosed(context.Background()); err != nil {
			t.Error("actual Core did not close", err)
		}
	})
	status, err := core.API.Service.Status(context.Background(), scaleOwner)
	if err != nil {
		t.Fatal(err)
	}
	f.profile, f.epoch = status.Profile.ProfileID, status.Profile.CommandEpoch
	return f
}
func (f *scaleFixture) meta(key, revision string) api.CommandMeta {
	return api.CommandMeta{ProfileID: f.profile, CommandEpoch: f.epoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
}
func (f *scaleFixture) next(revision string) api.CommandMeta {
	return f.meta(api.NewID("memory-test:"), revision)
}
func scaleHash(text string) string {
	sum := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(sum[:])
}
func scaleReason(err error, reason string) bool {
	var fault *api.Fault
	return errors.As(err, &fault) && fault.Reason == reason
}

func (f *scaleFixture) agent(name string, configured bool) api.Agent {
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
	a, err := f.core.API.Assistant.Create(context.Background(), scaleOwner, api.AgentCreate{CommandMeta: f.next(""), Draft: draft})
	if err != nil {
		f.t.Fatal(err)
	}
	return a
}
func scaleNamespace(a api.Agent) api.MemoryNamespace {
	return api.MemoryNamespace{Kind: "agent", ID: a.ID}
}
func (f *scaleFixture) page(ns api.MemoryNamespace, kind string) api.MemoryPage {
	f.t.Helper()
	page, err := f.core.API.Memory.List(context.Background(), scaleOwner, api.MemoryQuery{ProfileID: f.profile, Namespace: ns, Kind: kind, Limit: 50})
	if err != nil {
		f.t.Fatal(err)
	}
	return page
}
func (f *scaleFixture) add(ns api.MemoryNamespace, scope api.MemoryScope, text string) api.MemoryItem {
	f.t.Helper()
	page := f.page(ns, "item")
	item, err := f.core.API.Memory.Correct(context.Background(), scaleOwner, api.MemoryCorrect{CommandMeta: f.next(page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &scope, Text: text})
	if err != nil {
		f.t.Fatal(err)
	}
	return item
}
func (f *scaleFixture) item(ns api.MemoryNamespace, id string) api.MemoryItem {
	f.t.Helper()
	object, err := f.core.API.Memory.Get(context.Background(), scaleOwner, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "item", ID: id})
	if err != nil || object.Item == nil {
		f.t.Fatal("actual item", object, err)
	}
	return *object.Item
}
func (f *scaleFixture) session(agent api.Agent) api.Session {
	f.t.Helper()
	session, err := f.core.API.Conversation.CreateSession(context.Background(), scaleOwner, api.SessionCreate{CommandMeta: f.next(""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		f.t.Fatal(err)
	}
	return session
}
func (f *scaleFixture) start(session api.Session, intent string) api.RunReceipt {
	f.t.Helper()
	current, err := f.core.API.Conversation.GetSession(context.Background(), scaleOwner, api.IDQuery{ProfileID: f.profile, ID: session.ID})
	if err != nil {
		f.t.Fatal(err)
	}
	run, err := f.core.API.Conversation.StartRun(context.Background(), scaleOwner, api.RunStart{CommandMeta: f.next(current.Revision), SessionID: session.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		f.t.Fatal(err)
	}
	return run
}
func (f *scaleFixture) wait(runID string, wanted ...string) api.Run {
	f.t.Helper()
	// Liveness only. Seventy ordinary turns under go test ./... on a 3-core
	// intel runner can exceed 7s without changing the provenance assertions.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		run, err := f.core.API.Conversation.GetRun(ctx, scaleOwner, api.IDQuery{ProfileID: f.profile, ID: runID})
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
func scaleReceiveInput(t *testing.T, inputs <-chan api.EngineInput) api.EngineInput {
	t.Helper()
	select {
	case in := <-inputs:
		return in
	case <-time.After(30 * time.Second):
		t.Fatal("real Executor did not enter Engine")
		return api.EngineInput{}
	}
}
func (f *scaleFixture) budget(policy api.BudgetPolicy) {
	f.t.Helper()
	old, err := f.core.API.Collaboration.Budget(context.Background(), scaleOwner, api.BudgetQuery{ProfileID: f.profile})
	if err != nil {
		f.t.Fatal(err)
	}
	if _, err = f.core.API.Collaboration.ConfigureBudget(context.Background(), scaleOwner, api.BudgetConfigure{CommandMeta: f.next(old.Revision), Policy: policy}); err != nil {
		f.t.Fatal(err)
	}
}
func (f *scaleFixture) database() *sql.DB {
	f.t.Helper()
	db, err := sql.Open("sqlite3", scaleReadOnlyDSN(filepath.Join(f.directory, runtimeprofile.DatabaseName)))
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
func scaleCount(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var count int
	if err := db.QueryRowContext(context.Background(), query, args...).Scan(&count); err != nil {
		t.Fatal(query, err)
	}
	return count
}

// URI encoding follows base/store.go sqliteFileURL: the Wasm VFS needs an
// opaque drive path on Windows, while Unix uses file:///; reserved bytes must
// not become a query or fragment. Only this observation connection is read-only.
func scaleReadOnlyDSN(path string) string {
	slash := strings.ReplaceAll(path, `\`, "/")
	u := url.URL{Scheme: "file", Path: slash}
	if len(slash) >= 2 && slash[1] == ':' && ((slash[0] >= 'A' && slash[0] <= 'Z') || (slash[0] >= 'a' && slash[0] <= 'z')) {
		u = url.URL{Scheme: "file", Opaque: (&url.URL{Path: slash}).EscapedPath()}
	}
	q := u.Query()
	q.Set("mode", "ro")
	u.RawQuery = q.Encode()
	return u.String()
}

func TestDependencyScaleReadOnlyDSN(t *testing.T) {
	name := "profile # percent% space"
	if runtime.GOOS != "windows" {
		name += " question?"
	}
	directory := filepath.Join(t.TempDir(), name)
	if err := os.Mkdir(directory, 0700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(directory, "profile.sqlite3")
	writer, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = writer.Exec("CREATE TABLE probe(value TEXT); INSERT INTO probe VALUES('original')"); err != nil {
		writer.Close()
		t.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	reader, err := sql.Open("sqlite3", scaleReadOnlyDSN(path))
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	var value string
	if err = reader.QueryRow("SELECT value FROM probe").Scan(&value); err != nil || value != "original" {
		t.Fatalf("read exact special-character path: value=%q err=%v", value, err)
	}
	if _, err = reader.Exec("INSERT INTO probe VALUES('forbidden')"); !errors.Is(err, sqlite3.READONLY) {
		t.Fatalf("observer write error=%v, want SQLITE_READONLY", err)
	}
	if got := scaleCount(t, reader, "SELECT count(*) FROM probe"); got != 1 {
		t.Fatalf("readonly database changed: %d", got)
	}
}

func TestDependencyScaleReadOnlyDSNDriveEncoding(t *testing.T) {
	for path, want := range map[string]string{
		`C:\Users\Test User\profile#%.sqlite3`: "file:C:/Users/Test%20User/profile%23%25.sqlite3?mode=ro",
		"D:/data space/profile#.sqlite3":       "file:D:/data%20space/profile%23.sqlite3?mode=ro",
		"/tmp/profile #?%.sqlite3":             "file:///tmp/profile%20%23%3F%25.sqlite3?mode=ro",
	} {
		if got := scaleReadOnlyDSN(path); got != want {
			t.Errorf("%q => %q, want %q", path, got, want)
		}
	}
}
