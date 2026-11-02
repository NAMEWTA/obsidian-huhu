package chat_test

import (
	"context"
	"encoding/json"
	"errors"
	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistantapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestRealSQLiteFullRollsBackFinalizationAndReopenKeepsUnknownUsage(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	handle, e := profile.Acquire(root, locator)
	if e != nil {
		t.Fatal(e)
	}
	defer handle.Close()
	store, e := base.Open(ctx, handle)
	if e != nil {
		t.Fatal(e)
	}
	defer store.Close()
	configs := assistantstore.New(store)
	executions := executionstore.New(store, configs, nil)
	assistants, e := assistantapp.New(ctx, configs, assistantapp.Options{})
	if e != nil {
		t.Fatal(e)
	}
	conversation := directapp.New(executions, nil, nil)
	metadata, e := store.ReadMetadata(ctx)
	if e != nil {
		t.Fatal(e)
	}
	bots, e := assistants.List(ctx, owner, api.PageQuery{ProfileID: metadata.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	m := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: revision}
	}
	session, e := conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: m("session", ""), Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	receipt, e := conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: m("run", session.Revision), SessionID: session.ID, Intent: "persist intent", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	work, e := executions.Claim(ctx)
	if e != nil || work == nil {
		t.Fatal(work, e)
	}
	if e = executions.MarkRunning(ctx, *work); e != nil {
		t.Fatal(e)
	}
	var pages int
	if e = store.Database().QueryRow("PRAGMA page_count").Scan(&pages); e != nil {
		t.Fatal(e)
	}
	var maximum int
	if e = store.Database().QueryRow("PRAGMA max_page_count=" + itoa(pages)).Scan(&maximum); e != nil {
		t.Fatal(e)
	}
	e = executions.Finalize(ctx, *work, api.EngineResult{Status: "finished", Text: strings.Repeat("new result ", 11000), Usage: api.RunUsage{InputTokens: "7"}})
	if e == nil || !strings.Contains(strings.ToLower(e.Error()), "full") {
		t.Fatalf("expected actual SQLITE_FULL: %v", e)
	}
	t.Logf("actual finalization failure: %v", e)
	if n := count(t, store.Database(), "SELECT count(*) FROM conversation_messages"); n != 1 {
		t.Fatal("partial message commit", n)
	}
	if n := count(t, store.Database(), "SELECT count(*) FROM config_snapshot_pins"); n != 1 {
		t.Fatal("failed finalization released pin", n)
	}
	if n := count(t, store.Database(), "SELECT count(*) FROM execution_events"); n != 3 {
		t.Fatal("partial final event", n)
	}
	run, e := conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: metadata.ProfileID, ID: receipt.RunID})
	if e != nil || run.Status != "running" || run.Usage != nil {
		t.Fatal("fabricated terminal/usage", run, e)
	}
	if e = store.Close(); e != nil {
		t.Fatal(e)
	}
	if e = handle.Close(); e != nil {
		t.Fatal(e)
	}
	reopened, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	run = waitRun(t, reopened, receipt.RunID, "interrupted")
	if run.Usage != nil {
		t.Fatal("recovery invented zero usage", run)
	}
	_, e = reopened.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: api.CommandMeta{CommandID: "new", IdempotencyKey: "new", ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: state(t, reopened, session.ID).Revision}, SessionID: session.ID, Intent: "new intent", SourceRefs: []api.SourceSnapshot{}})
	expect(t, e, "SESSION_BUSY")
}
func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	var out [20]byte
	i := len(out)
	for v > 0 {
		i--
		out[i] = byte('0' + v%10)
		v /= 10
	}
	return string(out[i:])
}

func TestCommitAfterIntentBeforeWakeReopenScansAcceptedExactlyOnce(t *testing.T) {
	c, root, locator := withEngine(t, nil, true)
	s := session(t, c)
	m := meta(t, c, "run", s.Revision)
	receipt, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: m, SessionID: s.ID, Intent: "committed before wake", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	run, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: m.ProfileID, ID: receipt.RunID})
	if e != nil || run.Status != "accepted" {
		t.Fatal("test did not stop before claim", run, e)
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	calls := make(chan string, 4)
	engine := fakeEngine{func(_ context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		calls <- i.RunID
		return api.EngineResult{Status: "finished", Text: "recovered"}, nil
	}}
	other, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: engine})
	if e != nil {
		t.Fatal(e)
	}
	defer other.Close()
	waitRun(t, other, receipt.RunID, "succeeded")
	if n := len(calls); n != 1 {
		t.Fatal("accepted scan lost/duplicated", n)
	}
}

// This helper intentionally exits without closing SQLite or the Profile.
func TestCommittedIntentExitChild(t *testing.T) {
	root := os.Getenv("HUHU_CHAT_COMMIT_EXIT_ROOT")
	if root == "" {
		t.Skip("subprocess only")
	}
	handle, e := profile.Acquire(root, filepath.Join(root, "one"))
	if e != nil {
		t.Fatal(e)
	}
	store, e := base.Open(ctx, handle)
	if e != nil {
		t.Fatal(e)
	}
	configs := assistantstore.New(store)
	assistants, e := assistantapp.New(ctx, configs, assistantapp.Options{})
	if e != nil {
		t.Fatal(e)
	}
	metadata, e := store.ReadMetadata(ctx)
	if e != nil {
		t.Fatal(e)
	}
	bots, e := assistants.List(ctx, owner, api.PageQuery{ProfileID: metadata.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	meta := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: revision}
	}
	executions := executionstore.New(store, configs, nil)
	conversation := directapp.New(executions, nil, func() {
		// The transaction committed; this callback exits before delivering any wake.
		var runID, sessionID string
		if e := store.Database().QueryRow("SELECT run_id,session_id FROM execution_runs WHERE status='accepted'").Scan(&runID, &sessionID); e != nil {
			panic(e)
		}
		data, _ := json.Marshal(map[string]string{"runId": runID, "sessionId": sessionID, "profileId": metadata.ProfileID, "commandEpoch": metadata.CommandEpoch})
		f, e := os.OpenFile(filepath.Join(root, "committed.json"), os.O_CREATE|os.O_WRONLY, 0600)
		if e != nil {
			panic(e)
		}
		if _, e = f.Write(data); e != nil {
			panic(e)
		}
		if e = f.Sync(); e != nil {
			panic(e)
		}
		if e = f.Close(); e != nil {
			panic(e)
		}
		os.Exit(23)
	})
	session, e := conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("run", session.Revision), SessionID: session.ID, Intent: "child committed before wake", SourceRefs: []api.SourceSnapshot{}})
	t.Fatalf("child did not exit at commit/wake boundary: %v", e)
}

func TestIndependentProcessCommitExitBeforeWakeScansOnce(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	childCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	child := exec.CommandContext(childCtx, os.Args[0], "-test.run=^TestCommittedIntentExitChild$", "-test.count=1")
	child.Env = append(os.Environ(), "HUHU_CHAT_COMMIT_EXIT_ROOT="+root)
	output, e := child.CombinedOutput() // Run/Wait reaps the actual child.
	var exit *exec.ExitError
	if !errors.As(e, &exit) || exit.ExitCode() != 23 || childCtx.Err() != nil {
		t.Fatalf("unexpected child exit: %v, timeout=%v, output=%s", e, childCtx.Err(), output)
	}
	data, e := os.ReadFile(filepath.Join(root, "committed.json"))
	if e != nil {
		t.Fatal(e)
	}
	var proof map[string]string
	if e = json.Unmarshal(data, &proof); e != nil {
		t.Fatal(e)
	}
	calls := make(chan string, 4)
	engine := fakeEngine{func(_ context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		calls <- in.RunID
		return api.EngineResult{Status: "finished", Text: "recovered after actual process exit"}, nil
	}}
	reopened, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	waitRun(t, reopened, proof["runId"], "succeeded")
	time.Sleep(220 * time.Millisecond)
	if len(calls) != 1 {
		t.Fatalf("accepted scan executions=%d", len(calls))
	}
	db := inspect(t, filepath.Join(root, "one"))
	if n := count(t, db, "SELECT count(*) FROM execution_runs"); n != 1 {
		t.Fatal("duplicate Run", n)
	}
	if n := count(t, db, "SELECT count(*) FROM conversation_messages"); n != 2 {
		t.Fatal("lost/duplicate visible message", n)
	}
	if n := count(t, db, "SELECT count(*) FROM config_snapshot_pins"); n != 0 {
		t.Fatal("retained terminal pin", n)
	}
	replay, e := reopened.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: api.CommandMeta{CommandID: "later-attempt", IdempotencyKey: "run", ProfileID: proof["profileId"], CommandEpoch: proof["commandEpoch"], ExpectedRevision: "1"}, SessionID: proof["sessionId"], Intent: "child committed before wake", SourceRefs: []api.SourceSnapshot{}})
	if e != nil || replay.RunID != proof["runId"] {
		t.Fatal("committed receipt not recovered", replay, e)
	}
	t.Logf("child exited23 before wake, Wait completed; WAL reopened and scanner executed exactly once: %s", proof["runId"])
}
