package chat_test

import (
	"context"
	"database/sql"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

type fakeEngine struct {
	run func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error)
}

func (f fakeEngine) Run(c context.Context, i api.EngineInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
	return f.run(c, i, s)
}
func (fakeEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, api.Invalid("TEST_RESUME_NOT_REQUESTED")
}
func withEngine(t *testing.T, engine api.Engine, paused bool) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: engine, ExecutorPaused: paused})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = c.Close() })
	return c, root, locator
}
func session(t *testing.T, c *bootstrap.Core) api.Session {
	t.Helper()
	m := meta(t, c, "session", "")
	p, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: m.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: m, Kind: "direct", Title: "run", MemberIDs: []string{p.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func state(t *testing.T, c *bootstrap.Core, sessionID string) api.Session {
	t.Helper()
	s, e := c.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: sessionID})
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func waitRun(t *testing.T, c *bootstrap.Core, id, expected string) api.Run {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: id})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == expected {
			return r
		}
		if time.Now().After(deadline) {
			t.Fatalf("run %s expected %s: %#v", id, expected, r)
		}
		time.Sleep(10 * time.Millisecond)
	}
}
func expect(t *testing.T, e error, reason string) {
	t.Helper()
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != reason {
		t.Fatalf("expected %s got %v", reason, e)
	}
}
func inspect(t *testing.T, locator string) *sql.DB {
	t.Helper()
	db, e := sql.Open("sqlite3", filepath.Join(locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}
func count(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var n int
	if e := db.QueryRow(query, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func TestAtomicRunAdmissionBusyAndReceiptFromTwoEntrances(t *testing.T) {
	started := make(chan api.EngineInput, 4)
	gate := make(chan struct{})
	var once sync.Once
	engine := fakeEngine{func(c context.Context, i api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
		started <- i
		select {
		case <-gate:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		if e := sink(api.EngineEvent{Type: "text-delta", Text: "partial"}); e != nil {
			return api.EngineResult{}, e
		}
		return api.EngineResult{Status: "finished", Text: "answer"}, nil
	}}
	c, _, locator := withEngine(t, engine, false)
	t.Cleanup(func() { once.Do(func() { close(gate) }) })
	s := session(t, c)
	cmd := api.RunStart{CommandMeta: meta(t, c, "same-intent", s.Revision), SessionID: s.ID, Intent: "same text", SourceRefs: []api.SourceSnapshot{}}
	type outcome struct {
		r api.RunReceipt
		e error
	}
	results := make(chan outcome, 2)
	for _, connection := range []string{"entrance-a", "entrance-b"} {
		go func(connection string) {
			identity := api.NewConnectionIdentity(connection, "owner", false)
			copyCmd := cmd
			copyCmd.CommandID = connection
			r, e := c.API.Conversation.StartRun(ctx, identity, copyCmd)
			results <- outcome{r, e}
		}(connection)
	}
	first, second := <-results, <-results
	if first.e != nil || second.e != nil || first.r.RunID != second.r.RunID {
		t.Fatal("same-key concurrent", first, second)
	}
	select {
	case <-started:
	case <-time.After(3 * time.Second):
		t.Fatal("executor did not scan")
	}
	replay, e := c.API.Conversation.StartRun(ctx, owner, cmd)
	if e != nil || replay.RunID != first.r.RunID {
		t.Fatal("old receipt checked after busy", replay, e)
	}
	changed := cmd
	changed.Intent = "different"
	_, e = c.API.Conversation.StartRun(ctx, owner, changed)
	expect(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
	fresh := cmd
	fresh.CommandMeta = meta(t, c, "new-intent", state(t, c, s.ID).Revision)
	_, e = c.API.Conversation.StartRun(ctx, owner, fresh)
	expect(t, e, "SESSION_BUSY")
	db := inspect(t, locator)
	if n := count(t, db, "SELECT count(*) FROM config_snapshot_pins"); n != 1 {
		t.Fatal("busy/replay leaked pin", n)
	}
	if n := count(t, db, "SELECT count(*) FROM conversation_messages"); n != 1 {
		t.Fatal("duplicated user intent", n)
	}
	once.Do(func() { close(gate) })
	waitRun(t, c, first.r.RunID, "succeeded")
	fresh.ExpectedRevision = state(t, c, s.ID).Revision
	other, e := c.API.Conversation.StartRun(ctx, owner, fresh)
	if e != nil || other.RunID == first.r.RunID {
		t.Fatal("same-body new key swallowed", other, e)
	}
	waitRun(t, c, other.RunID, "succeeded")
	history, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: cmd.ProfileID}, SessionID: s.ID})
	if e != nil || len(history.Items) != 4 {
		t.Fatal("persistent transcript", history, e)
	}
	if n := count(t, db, "SELECT count(*) FROM config_snapshot_pins"); n != 0 {
		t.Fatal("terminal pin retained", n)
	}
	if n := count(t, db, "SELECT count(*) FROM execution_runs"); n != 2 {
		t.Fatal("wrong run count", n)
	}
	for _, runID := range []string{first.r.RunID, other.RunID} {
		if n := count(t, db, "SELECT min(seq) FROM execution_events WHERE run_id=?", runID); n != 1 {
			t.Fatal("seq not scoped", n)
		}
		if n := count(t, db, "SELECT max(seq)-count(*) FROM execution_events WHERE run_id=?", runID); n != 0 {
			t.Fatal("event gap", n)
		}
	}
}
func TestUsagePreservesUnknownKnownPartialEstimateAndMeasuredZero(t *testing.T) {
	cases := []struct {
		name  string
		usage api.RunUsage
		want  *api.RunUsage
	}{{"missing", api.RunUsage{}, nil}, {"input-known", api.RunUsage{InputTokens: "12"}, &api.RunUsage{InputTokens: "12"}}, {"output-estimated", api.RunUsage{OutputTokens: "9", Estimated: true}, &api.RunUsage{OutputTokens: "9", Estimated: true}}, {"real-zero", api.RunUsage{InputTokens: "0", OutputTokens: "0"}, &api.RunUsage{InputTokens: "0", OutputTokens: "0"}}, {"invalid", api.RunUsage{InputTokens: "-1", OutputTokens: "5"}, &api.RunUsage{OutputTokens: "5"}}, {"invalid-knowledge", api.RunUsage{InputTokens: "3", Knowledge: "invented"}, &api.RunUsage{InputTokens: "3", Knowledge: "unknown"}}, {"partial-not-known", api.RunUsage{InputTokens: "0", Knowledge: "known"}, &api.RunUsage{InputTokens: "0", Knowledge: "unknown"}}}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			engine := fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				return api.EngineResult{Status: "finished", Text: "done", Usage: test.usage}, nil
			}}
			c, root, locator := withEngine(t, engine, false)
			s := session(t, c)
			m := meta(t, c, "run", s.Revision)
			r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: m, SessionID: s.ID, Intent: "test", SourceRefs: []api.SourceSnapshot{}})
			if e != nil {
				t.Fatal(e)
			}
			got := waitRun(t, c, r.RunID, "succeeded")
			if (got.Usage == nil) != (test.want == nil) || got.Usage != nil && *got.Usage != *test.want {
				t.Fatalf("usage %#v want %#v", got.Usage, test.want)
			}
			if e = c.Close(); e != nil {
				t.Fatal(e)
			}
			reopen, e := bootstrap.Open(ctx, root, locator)
			if e != nil {
				t.Fatal(e)
			}
			defer reopen.Close()
			got = waitRun(t, reopen, r.RunID, "succeeded")
			if (got.Usage == nil) != (test.want == nil) || got.Usage != nil && *got.Usage != *test.want {
				t.Fatalf("reopen usage %#v want %#v", got.Usage, test.want)
			}
		})
	}
}
