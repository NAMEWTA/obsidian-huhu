package foundation_test

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type drainEngine struct {
	entered chan struct{}
	release chan struct{}
}

func (e *drainEngine) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	close(e.entered)
	<-e.release
	return api.EngineResult{Status: "finished", Text: "late producer"}, nil
}
func (e *drainEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	panic("unexpected resume")
}
func TestCloseTimeoutKeepsProfileAndDatabaseUntilActualProducerEnds(t *testing.T) {
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	eng := &drainEngine{entered: make(chan struct{}), release: make(chan struct{})}
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: eng})
	if e != nil {
		t.Fatal(e)
	}
	released := false
	defer func() {
		if !released {
			close(eng.release)
		}
		_ = c.RequestStop()
		_ = c.WaitClosed(ctx)
	}()
	id := api.NewConnectionIdentity("lifecycle", "owner", true)
	status, e := c.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	m := func(k, rev string) api.CommandMeta {
		return api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: k, IdempotencyKey: k, ExpectedRevision: rev}
	}
	bots, e := c.API.Assistant.List(ctx, id, api.PageQuery{ProfileID: status.Profile.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	session, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: m("session", ""), Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	accepted, e := c.API.Conversation.StartRun(ctx, id, api.RunStart{CommandMeta: m("start", session.Revision), SessionID: session.ID, Intent: "hold actual producer", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-eng.entered:
	case <-time.After(3 * time.Second):
		t.Fatal("Engine not entered")
	}
	started := time.Now()
	e = c.Close()
	var fault *api.Fault
	if !errors.As(e, &fault) || fault.Reason != "EXECUTOR_STOP_TIMEOUT" {
		t.Fatalf("expected bounded pending close: %v", e)
	}
	if time.Since(started) < 3*time.Second {
		t.Fatal("reported drained too early")
	}
	select {
	case <-c.Done():
		t.Fatal("cleanup released while producer alive")
	default:
	}
	other, e := bootstrap.Open(ctx, root, locator)
	if e == nil {
		_ = other.Close()
		t.Fatal("second writer acquired live producer Profile")
	}
	if !errors.As(e, &fault) || fault.Kind != "INSTANCE_CONFLICT" {
		t.Fatal("wrong live-lock result", e)
	}
	// Existing owned reads still prove that the database is open. Admission has
	// closed durably even though neither the Engine nor its Profile was released.
	if _, e = c.API.Recovery.Get(ctx, id, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: accepted.RunID}); e != nil {
		t.Fatal("live database prematurely closed", e)
	}
	_, e = c.API.Conversation.StartRun(ctx, id, api.RunStart{CommandMeta: m("stop-reject", session.Revision), SessionID: session.ID, Intent: "must reject", SourceRefs: []api.SourceSnapshot{}})
	if !errors.As(e, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("new admission while draining", e)
	}
	close(eng.release)
	released = true
	bounded, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if e = c.WaitClosed(bounded); e != nil {
		t.Fatal(e)
	}
	if e = c.Close(); e != nil {
		t.Fatal("idempotent completed close", e)
	}
	reopened, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	got, e := reopened.API.Recovery.Get(ctx, id, api.IDQuery{ProfileID: status.Profile.ProfileID, ID: accepted.RunID})
	if e != nil || got.State != "blocked" || got.Reason != "CHECKPOINT_MISSING" {
		t.Fatal("interrupted producer without CP must block", got, e)
	}
}

func TestStopTransactionFailureKeepsAdmissionClosedAndRetriesBeforeCleanup(t *testing.T) {
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	defer func() { _, _ = db.Exec("DROP TRIGGER IF EXISTS reject_stop"); _ = c.Close(); _ = c.WaitClosed(ctx) }()
	id := api.NewConnectionIdentity("stop-fault", "owner", true)
	status, e := c.API.Service.Status(ctx, id)
	if e != nil {
		t.Fatal(e)
	}
	bots, e := c.API.Assistant.List(ctx, id, api.PageQuery{ProfileID: status.Profile.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	meta := api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: "session", IdempotencyKey: "session"}
	session, e := c.API.Conversation.CreateSession(ctx, id, api.SessionCreate{CommandMeta: meta, Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = db.Exec("CREATE TRIGGER reject_stop BEFORE UPDATE ON execution_recovery_runtime BEGIN SELECT RAISE(ABORT,'fixture_stop_failure'); END"); e != nil {
		t.Fatal(e)
	}
	if _, e = db.Exec("UPDATE execution_recovery_runtime SET state='stopping'"); e == nil {
		t.Fatal("fault injection did not actually reject Stop")
	}
	if e = c.RequestStop(); e != nil {
		t.Fatal(e)
	}
	bounded, cancel := context.WithTimeout(ctx, 150*time.Millisecond)
	defer cancel()
	if e = c.WaitClosed(bounded); !errors.Is(e, context.DeadlineExceeded) {
		t.Fatal("failed durable Stop released resources", e)
	}
	var runtime string
	if e = db.QueryRow("SELECT state FROM execution_recovery_runtime WHERE singleton=1").Scan(&runtime); e != nil || runtime != "open" {
		t.Fatal("failure did not retain old durable gate", runtime, e)
	}
	meta.CommandID = "new"
	meta.IdempotencyKey = "new"
	meta.ExpectedRevision = session.Revision
	_, e = c.API.Conversation.StartRun(ctx, id, api.RunStart{CommandMeta: meta, SessionID: session.ID, Intent: "must not enter failed stop window", SourceRefs: []api.SourceSnapshot{}})
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != "SERVICE_STOPPING" {
		t.Fatal("in-memory gate missing", e)
	}
	other, e := bootstrap.Open(ctx, root, locator)
	if e == nil {
		_ = other.Close()
		t.Fatal("failed Stop released Profile")
	}
	if _, e = db.Exec("DROP TRIGGER reject_stop"); e != nil {
		t.Fatal(e)
	}
	bounded2, cancel2 := context.WithTimeout(ctx, 2*time.Second)
	defer cancel2()
	if e = c.WaitClosed(bounded2); e != nil {
		t.Fatal("Stop was not retried", e)
	}
	if e = db.QueryRow("SELECT state FROM execution_recovery_runtime WHERE singleton=1").Scan(&runtime); e != nil || runtime != "stopping" {
		t.Fatal("cleanup preceded durable barrier", runtime, e)
	}
}
