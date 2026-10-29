package events_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("events:test", "owner", true)

func join(t *testing.T, finished <-chan error) func() error {
	t.Helper()
	var once sync.Once
	var result error
	joined := func() error {
		once.Do(func() {
			select {
			case result = <-finished:
			case <-time.After(3 * time.Second):
				result = errors.New("fixture worker did not complete")
			}
		})
		return result
	}
	t.Cleanup(func() {
		if e := joined(); e != nil && !errors.Is(e, context.Canceled) {
			t.Error(e)
		}
	})
	return joined
}

type fixture struct {
	c                             *bootstrap.Core
	db                            *sql.DB
	root, locator, profile, epoch string
	run                           api.RunReceipt
	session                       api.Session
	executorPaused                bool
}

func open(t *testing.T) *fixture { return openWithOptions(t, bootstrap.Options{ExecutorPaused: true}) }
func openWithOptions(t *testing.T, options bootstrap.Options) *fixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.OpenWithOptions(ctx, root, locator, options)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
	})
	if c.API.Events == nil {
		t.Fatal("T04 Events facade is not assembled")
	}
	status, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	f := &fixture{c: c, root: root, locator: locator, profile: status.Profile.ProfileID, epoch: status.Profile.CommandEpoch, executorPaused: options.ExecutorPaused}
	f.db, e = sql.Open("sqlite3", "file:"+filepath.ToSlash(filepath.Join(locator, "profile.sqlite3"))+"?_pragma=busy_timeout(500)")
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := f.db.Close(); e != nil {
			t.Error(e)
		}
	})
	agents, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: f.profile})
	if e != nil {
		t.Fatal(e)
	}
	f.session, e = c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("session", ""), Kind: "direct", Title: "Events", MemberIDs: []string{agents.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	f.run, e = c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("start", f.session.Revision), SessionID: f.session.ID, Intent: "public intent", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	return f
}
func (f *fixture) meta(key, rev string) api.CommandMeta {
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: f.profile, CommandEpoch: f.epoch, ExpectedRevision: rev}
}
func (f *fixture) tail(after string) api.EventTailQuery {
	return api.EventTailQuery{ProfileID: f.profile, RunID: f.run.RunID, AfterSeq: after}
}
func (f *fixture) append(t *testing.T, kind, text string) {
	t.Helper()
	tx, e := f.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	defer tx.Rollback()
	if e = executionstore.AddEventInTx(ctx, tx, f.run.RunID, kind, map[string]string{"text": text}); e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
}
func fault(t *testing.T, e error, reason string) *api.Fault {
	t.Helper()
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != reason {
		t.Fatalf("want %s, got %v", reason, e)
	}
	return f
}

func TestDurableTailUsesDeliveredCursorAndBoundedPages(t *testing.T) {
	f := open(t)
	for range 4 {
		f.append(t, "delta", strings.Repeat("甲😀", 200))
	}
	q := f.tail("0")
	q.Limit = 2
	q.MaxBytes = 4096
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || len(page.Events) != 2 || page.NextSeq != "2" || page.HeadSeq != "5" || !page.HasMore {
		t.Fatalf("first page %#v %v", page, e)
	}
	b, e := json.Marshal(page)
	if e != nil || len(b) > q.MaxBytes {
		t.Fatalf("page byte bound %d %v", len(b), e)
	}
	again, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || again.SubscriptionID != page.SubscriptionID || again.Events[1].Seq != "2" {
		t.Fatalf("repeat %#v %v", again, e)
	}
	q.AfterSeq = page.NextSeq
	page, e = f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || page.Events[0].Seq != "3" || page.NextSeq != "4" || !page.HasMore {
		t.Fatalf("next page %#v %v", page, e)
	}
	q.AfterSeq = page.NextSeq
	page, e = f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || len(page.Events) != 1 || page.NextSeq != "5" || page.HasMore {
		t.Fatalf("last page %#v %v", page, e)
	}
	_, e = f.c.API.Events.Tail(ctx, owner, f.tail("6"))
	fault(t, e, "EVENT_CURSOR_AHEAD")
	q = f.tail("1")
	q.MaxBytes = 1024
	_, e = f.c.API.Events.Tail(ctx, owner, q)
	fault(t, e, "EVENT_PAGE_TOO_SMALL")
}

func TestTailPollsDatabaseWithoutWakeAndCancellationDoesNotCancelRun(t *testing.T) {
	f := open(t)
	q := f.tail("1")
	q.WaitMillis = 1000
	waiting := make(chan api.EventPage, 1)
	errs := make(chan error, 1)
	work, stop := context.WithCancel(ctx)
	defer stop()
	wait := join(t, errs)
	go func() { p, e := f.c.API.Events.Tail(work, owner, q); waiting <- p; errs <- e }()
	f.append(t, "delta", "new committed fact without wake")
	select {
	case p := <-waiting:
		if e := wait(); e != nil || p.NextSeq != "2" || p.Events[0].Text != "new committed fact without wake" {
			t.Fatal(p, e)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("lost DB fact at wait boundary")
	}
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	_, e := f.c.API.Events.Tail(canceled, owner, f.tail("2"))
	if !errors.Is(e, context.Canceled) {
		t.Fatal(e)
	}
	run, e := f.c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	if e != nil || run.Status != "accepted" {
		t.Fatal("read cancellation canceled Run", run, e)
	}
	f.append(t, "reconciled", "terminal-independent ledger fact")
	p, e := f.c.API.Events.Tail(ctx, owner, f.tail("2"))
	if e != nil || p.Events[0].Type != "reconciled" || p.NextSeq != "3" {
		t.Fatal(p, e)
	}
}

func TestSnapshotSequenceAndTextComeFromTheSameTransaction(t *testing.T) {
	f := open(t)
	finished := make(chan error, 1)
	wait := join(t, finished)
	go func() {
		for range 24 {
			tx, e := f.db.BeginTx(ctx, nil)
			if e != nil {
				finished <- e
				return
			}
			e = executionstore.AddEventInTx(ctx, tx, f.run.RunID, "delta", map[string]string{"text": "x"})
			if e != nil {
				_ = tx.Rollback()
				finished <- e
				return
			}
			if e = tx.Commit(); e != nil {
				finished <- e
				return
			}
		}
		finished <- nil
	}()
	for range 24 {
		snapshot, e := f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
		if e != nil {
			t.Fatal(e)
		}
		n, e := strconv.Atoi(snapshot.SnapshotSeq)
		if e != nil || len(snapshot.Snapshot.PendingText) != n-1 {
			t.Fatalf("torn snapshot seq=%s text=%q err=%v", snapshot.SnapshotSeq, snapshot.Snapshot.PendingText, e)
		}
	}
	if e := wait(); e != nil {
		t.Fatal(e)
	}
}

func TestCursorRecoveryCompactsOnlyReconstructibleTerminalPrefix(t *testing.T) {
	f := open(t)
	for range 270 {
		f.append(t, "delta", "x")
	}
	snap, e := f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	if e != nil || len(snap.Snapshot.PendingText) != 270 {
		t.Fatal(snap, e)
	}
	var count int
	if e = f.db.QueryRow("SELECT count(*) FROM execution_events WHERE run_id=?", f.run.RunID).Scan(&count); e != nil || count != 271 {
		t.Fatal("active text was compacted", count, e)
	}
	tx, e := f.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	defer tx.Rollback()
	if _, e = tx.Exec("UPDATE execution_runs SET status='failed',reason='FIXTURE_TERMINAL',revision=revision+1 WHERE run_id=?", f.run.RunID); e != nil {
		t.Fatal(e)
	}
	if e = executionstore.AddEventInTx(ctx, tx, f.run.RunID, "failed", map[string]string{"status": "failed", "reason": "FIXTURE_TERMINAL"}); e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
	_, e = f.c.API.Events.Tail(ctx, owner, f.tail("0"))
	expired := fault(t, e, "EVENT_CURSOR_EXPIRED")
	if expired.Kind != "CURSOR_EXPIRED" || expired.Details == nil || expired.Details.RunID != f.run.RunID || expired.Details.SnapshotSeq != "272" || expired.Details.Snapshot.Run.Status != "failed" || expired.Details.Snapshot.PendingText != "" || len(expired.Details.Snapshot.Messages) != 1 {
		t.Fatal("invalid recovery", expired)
	}
	if e = f.db.QueryRow("SELECT count(*) FROM execution_events WHERE run_id=?", f.run.RunID).Scan(&count); e != nil || count != 256 {
		t.Fatal("terminal retention not committed", count, e)
	}
	f.append(t, "reconciled", "late fact")
	page, e := f.c.API.Events.Tail(ctx, owner, f.tail(expired.Details.SnapshotSeq))
	if e != nil || page.NextSeq != "273" || page.Events[0].Type != "reconciled" {
		t.Fatal(page, e)
	}
	_, e = f.c.API.Events.Tail(ctx, owner, f.tail("0"))
	recovery := fault(t, e, "EVENT_CURSOR_EXPIRED").Details
	if recovery == nil || recovery.SnapshotSeq != "273" || len(recovery.Snapshot.Events) != 1 || recovery.Snapshot.Events[0].Seq != "273" || recovery.Snapshot.Events[0].Type != "reconciled" {
		t.Fatalf("old cursor recovery skipped a late ledger fact after compaction: %#v", recovery)
	}
}

func TestEventCursorValidationOwnershipAndGapAreExplicit(t *testing.T) {
	f := open(t)
	for _, after := range []string{"-1", "01", "1.0", "9223372036854775808"} {
		_, e := f.c.API.Events.Tail(ctx, owner, f.tail(after))
		fault(t, e, "INVALID_EVENT_CURSOR")
	}
	foreign := api.NewConnectionIdentity("events:foreign", "someone-else", false)
	_, e := f.c.API.Events.Tail(ctx, foreign, f.tail("0"))
	fault(t, e, "SESSION_READ_DENIED")
	_, e = f.c.API.Events.Snapshot(ctx, foreign, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	fault(t, e, "SESSION_READ_DENIED")
	q := f.tail("0")
	q.ProfileID = "profile:other"
	_, e = f.c.API.Events.Tail(ctx, owner, q)
	fault(t, e, "PROFILE_MISMATCH")
	f.append(t, "delta", "first")
	f.append(t, "delta", "second")
	if _, e = f.db.Exec("DELETE FROM execution_events WHERE run_id=? AND seq=2", f.run.RunID); e != nil {
		t.Fatal(e)
	}
	_, e = f.c.API.Events.Tail(ctx, owner, f.tail("1"))
	fault(t, e, "EVENT_LOG_GAP")
}

func TestPageAccountsForJSONEscapingAndSnapshotRejectsOversize(t *testing.T) {
	f := open(t)
	f.append(t, "delta", strings.Repeat("\x01", 65536))
	q := f.tail("1")
	q.MaxBytes = 524288
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || len(page.Events) != 1 || len(page.Events[0].Text) != 65536 {
		t.Fatal("legal encoded event not readable", len(page.Events), e)
	}
	encoded, e := json.Marshal(page)
	if e != nil || len(encoded) > q.MaxBytes || len(encoded) < 262144 {
		t.Fatal("escaping was not budgeted", len(encoded), e)
	}
	for range 4 {
		f.append(t, "delta", strings.Repeat("x", 65536))
	}
	_, e = f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	fault(t, e, "EVENT_SNAPSHOT_LIMIT")
	var count int
	if e = f.db.QueryRow("SELECT count(*) FROM execution_events WHERE run_id=?", f.run.RunID).Scan(&count); e != nil || count != 6 {
		t.Fatal("active overflow removed facts", count, e)
	}
}

func TestRunSequencesStayIndependentAboveJavaScriptIntegerRangeAndSurviveReopen(t *testing.T) {
	f := open(t)
	const before = "9007199254740992"
	// Translate the fixture's retained suffix together with its head. Merely
	// moving the head would create a real middle gap, unrelated to precision.
	tx, e := f.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	defer tx.Rollback()
	if _, e = tx.Exec("UPDATE execution_events SET seq=? WHERE run_id=? AND seq=1", before, f.run.RunID); e != nil {
		t.Fatal(e)
	}
	if _, e = tx.Exec("UPDATE execution_runs SET event_seq=? WHERE run_id=?", before, f.run.RunID); e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
	f.append(t, "delta", "large seq")
	page, e := f.c.API.Events.Tail(ctx, owner, f.tail(before))
	if e != nil || page.NextSeq != "9007199254740993" || page.HeadSeq != page.NextSeq || page.Events[0].Seq != page.NextSeq {
		t.Fatal("sequence rounded", page, e)
	}
	if e = f.c.Close(); e != nil {
		t.Fatal(e)
	}
	other, e := bootstrap.OpenWithOptions(ctx, f.root, f.locator, bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	defer other.Close()
	page, e = other.API.Events.Tail(ctx, owner, f.tail(before))
	if e != nil || page.NextSeq != "9007199254740993" {
		t.Fatal("reopen lost durable cursor", page, e)
	}
	agents, e := other.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: f.profile})
	if e != nil {
		t.Fatal(e)
	}
	session, e := other.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("other-session", ""), Kind: "direct", Title: "Independent", MemberIDs: []string{agents.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	run, e := other.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("other-run", session.Revision), SessionID: session.ID, Intent: "another run", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	q := f.tail("0")
	q.RunID = run.RunID
	page, e = other.API.Events.Tail(ctx, owner, q)
	if e != nil || page.NextSeq != "1" || page.Events[0].RunID != run.RunID {
		t.Fatal("cross Run seq compared", page, e)
	}
}

func TestTerminalLedgerFactsAreNotCompactedOrAppendedToBody(t *testing.T) {
	f := open(t)
	f.append(t, "approval.pending", "PREVIEW_IS_NOT_BODY")
	snapshot, e := f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	if e != nil || snapshot.Snapshot.PendingText != "" {
		t.Fatal(snapshot, e)
	}
	for range 270 {
		f.append(t, "delta", "x")
	}
	if _, e = f.db.Exec("UPDATE execution_runs SET status='failed' WHERE run_id=?", f.run.RunID); e != nil {
		t.Fatal(e)
	}
	q := f.tail("0")
	q.Limit = 1
	page, e := f.c.API.Events.Tail(ctx, owner, q)
	if e != nil || page.NextSeq != "1" {
		t.Fatal("ledger run was expired", page, e)
	}
	var first int
	if e = f.db.QueryRow("SELECT MIN(seq) FROM execution_events WHERE run_id=?", f.run.RunID).Scan(&first); e != nil || first != 1 {
		t.Fatal("ledger facts lost", first, e)
	}
}

func TestTerminalCompactionCannotHideAMiddleLogGap(t *testing.T) {
	f := open(t)
	for range 270 {
		f.append(t, "delta", "x")
	}
	if _, e := f.db.Exec("DELETE FROM execution_events WHERE run_id=? AND seq=2", f.run.RunID); e != nil {
		t.Fatal(e)
	}
	if _, e := f.db.Exec("UPDATE execution_runs SET status='failed' WHERE run_id=?", f.run.RunID); e != nil {
		t.Fatal(e)
	}
	_, e := f.c.API.Events.Tail(ctx, owner, f.tail("0"))
	fault(t, e, "EVENT_LOG_GAP")
	var first, count int
	if e = f.db.QueryRow("SELECT MIN(seq),count(*) FROM execution_events WHERE run_id=?", f.run.RunID).Scan(&first, &count); e != nil || first != 1 || count != 270 {
		t.Fatal("corrupt prefix was discarded", first, count, e)
	}
}

func TestCursorSnapshotPreservesEachDurableMessageSourceAndRejectsBadFacts(t *testing.T) {
	f := openWithOptions(t, bootstrap.Options{Engine: &eventEngine{release: make(chan struct{})}})
	grant := f.sourceRun(t, "")
	f.waitTerminal(t, f.run.RunID)
	checkMessages := func(snapshot api.EventCursorRecovery) {
		t.Helper()
		history, e := f.c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile, Limit: 100}, SessionID: f.session.ID})
		if e != nil {
			t.Fatal(e)
		}
		byID := map[string]api.VisibleMessage{}
		for _, message := range history.Items {
			byID[message.ID] = message
		}
		for _, message := range snapshot.Snapshot.Messages {
			var encoded string
			if e := f.db.QueryRow("SELECT source_json FROM conversation_messages WHERE message_id=?", message.ID).Scan(&encoded); e != nil {
				t.Fatal(e)
			}
			var stored []api.SourceSnapshot
			if e := json.Unmarshal([]byte(encoded), &stored); e != nil {
				t.Fatal(e)
			}
			if !reflect.DeepEqual(stored, message.SourceRefs) || !reflect.DeepEqual(byID[message.ID].SourceRefs, message.SourceRefs) {
				t.Fatal("same message has different SQL/History/snapshot provenance", message.ID, stored, byID[message.ID].SourceRefs, message.SourceRefs)
			}
		}
	}
	initial, e := f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.run.RunID})
	if e != nil {
		t.Fatal(e)
	}
	checkMessages(initial)
	for _, message := range initial.Snapshot.Messages {
		if len(message.SourceRefs) != 1 {
			t.Fatal("explicit source normal control lost provenance")
		}
	}
	session, e := f.c.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.session.ID})
	if e != nil {
		t.Fatal(e)
	}
	run, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("inherited-compact", session.Revision), SessionID: session.ID, Intent: "compact", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	// Liveness only, same budget as waitTerminal. Windows and Intel runners
	// under go test ./... can block GetRun for longer than 6s. The 250ms
	// history gate in this package is unchanged.
	f.waitTerminal(t, run.RunID)
	_, e = f.c.API.Events.Tail(ctx, owner, api.EventTailQuery{ProfileID: f.profile, RunID: run.RunID, AfterSeq: "0"})
	var expired *api.Fault
	if !errors.As(e, &expired) || expired.Kind != "CURSOR_EXPIRED" || expired.Details == nil || expired.Details.SnapshotSeq != "274" {
		t.Fatal("not the actual compressed cursor path", e)
	}
	checkMessages(*expired.Details)
	var userID string
	for _, message := range expired.Details.Snapshot.Messages {
		if message.Role == "user" {
			userID = message.ID
			if len(message.SourceRefs) != 0 {
				t.Fatal("inherited Run source was added to explicit empty user intent")
			}
		} else if len(message.SourceRefs) != 1 {
			t.Fatal("assistant lost actual derived provenance")
		}
	}
	if userID == "" {
		t.Fatal("snapshot omitted user message")
	}
	unknown := initial.Snapshot.Messages[0].SourceRefs[0]
	unknown.ResourceID = "source:unknown"
	unknownJSON, _ := json.Marshal([]api.SourceSnapshot{unknown})
	duplicateJSON, _ := json.Marshal([]api.SourceSnapshot{initial.Snapshot.Messages[0].SourceRefs[0], initial.Snapshot.Messages[0].SourceRefs[0]})
	for _, bad := range []string{"null", "{", string(unknownJSON), string(duplicateJSON)} {
		if _, e := f.db.Exec("UPDATE conversation_messages SET source_json=? WHERE message_id=?", bad, userID); e != nil {
			t.Fatal(e)
		}
		_, e := f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: run.RunID})
		fault(t, e, "MESSAGE_CONTEXT_INVALID")
		if _, e := f.db.Exec("UPDATE conversation_messages SET source_json='[]' WHERE message_id=?", userID); e != nil {
			t.Fatal(e)
		}
	}
	f.revoke(t, grant)
	_, e = f.c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: run.RunID})
	if e == nil {
		t.Fatal("whole-Run source read gate was weakened by empty user provenance")
	}
	t.Log("real270-event CURSOR_EXPIRED seq274: SQL/History/every snapshot message sources equal; user[] and assistant derived source preserved; bad/unknown/duplicate provenance and whole-Run revoke rejected")
}
