package chat_test

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	usagestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistantapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// Only the inbox read is a fault seam. Claim, policy/finalization, configuration
// pins, events and Session occupancy use their production adapters and one UoW.
type faultyClaimInbox struct {
	*usagestore.Store
	rejected string
	read     func(context.Context, *sql.Tx) error
	commitFK bool
}

func (f *faultyClaimInbox) MessagesInTx(c context.Context, tx *sql.Tx, run string) ([]api.AgentMessage, error) {
	if run == f.rejected {
		return nil, f.read(c, tx)
	}
	return []api.AgentMessage{}, nil
}

func (f *faultyClaimInbox) FinalizeInTx(c context.Context, tx *sql.Tx, run string, result *api.EngineResult) error {
	if e := f.Store.FinalizeInTx(c, tx, run, result); e != nil {
		return e
	}
	if f.commitFK && run == f.rejected {
		// Deferred FK checks allow all terminal writes to run, then force the
		// transaction's actual Commit to fail rather than a statement failure.
		_, e := tx.ExecContext(c, "INSERT INTO claim_fault_child(parent_id) VALUES('missing-parent')")
		return e
	}
	return nil
}

type claimFailureFixture struct {
	db           *base.Store
	runs         *executionstore.Store
	conversation *directapp.Service
	inbox        *faultyClaimInbox
	bad, healthy api.RunReceipt
	profile      string
}

func newClaimFailureFixture(t *testing.T) claimFailureFixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	handle, e := profile.Acquire(root, filepath.Join(root, "one"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = handle.Close() })
	db, e := base.Open(ctx, handle)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	configs := assistantstore.New(db)
	access := grantsstore.New(db)
	runs := executionstore.New(db, configs, nil)
	policy := usagestore.New(db, access, api.ExecutionLimits{}, api.BudgetPolicy{})
	policy.SetTerminalCleanup(runs.ReleaseTerminalPinsInTx)
	inbox := &faultyClaimInbox{Store: policy}
	runs.SetTreeControl(inbox)
	configs.SetUsageReader(runs)
	assistants, e := assistantapp.New(ctx, configs, assistantapp.Options{Usage: runs})
	if e != nil {
		t.Fatal(e)
	}
	metadata, e := db.ReadMetadata(ctx)
	if e != nil {
		t.Fatal(e)
	}
	bots, e := assistants.List(ctx, owner, api.PageQuery{ProfileID: metadata.ProfileID})
	if e != nil || len(bots.Items) == 0 {
		t.Fatal(bots, e)
	}
	conversation := directapp.New(runs, nil, nil)
	command := func(key, revision string) api.CommandMeta {
		return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: revision}
	}
	start := func(key string) api.RunReceipt {
		session, e := conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: command(key+"-session", ""), Kind: "direct", MemberIDs: []string{bots.Items[0].ID}})
		if e != nil {
			t.Fatal(e)
		}
		run, e := conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: command(key+"-run", session.Revision), SessionID: session.ID, Intent: key, SourceRefs: []api.SourceSnapshot{}})
		if e != nil {
			t.Fatal(e)
		}
		return run
	}
	bad, healthy := start("rejected"), start("healthy")
	inbox.rejected = bad.RunID
	return claimFailureFixture{db: db, runs: runs, conversation: conversation, inbox: inbox, bad: bad, healthy: healthy, profile: metadata.ProfileID}
}

func (f claimFailureFixture) count(t *testing.T, statement string, args ...any) int {
	t.Helper()
	var n int
	if e := f.db.Database().QueryRowContext(ctx, statement, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}

func (f claimFailureFixture) assertUncommitted(t *testing.T) {
	t.Helper()
	for _, receipt := range []api.RunReceipt{f.bad, f.healthy} {
		run, e := f.conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: receipt.RunID})
		if e != nil || run.Status != "accepted" || run.Revision != "1" || run.Reason != "" {
			t.Fatal("failed Claim left a false durable transition", run, e)
		}
	}
	if f.count(t, "SELECT count(*) FROM config_snapshot_pins") != 2 || f.count(t, "SELECT count(*) FROM conversation_sessions WHERE active_run_id IS NOT NULL") != 2 || f.count(t, "SELECT count(*) FROM execution_events WHERE event_type<>'accepted'") != 0 || f.count(t, "SELECT COALESCE(sum(child_slot),0) FROM execution_runs") != 0 {
		t.Fatal("claim error committed events, release or occupancy")
	}
}

func TestClaimInboxRefusalFinalizationIsAtomicAndUnknownErrorsRollback(t *testing.T) {
	for _, refusal := range []*api.Fault{
		{Kind: "CAPABILITY_DENIED", Reason: "GRANT_REVOKED"},
		{Kind: "CAPABILITY_DENIED", Reason: "GROUP_MEMBER_REMOVED"},
		{Kind: "CAPABILITY_DENIED", Reason: "GROUP_MEMBER_GENERATION_CHANGED"},
		{Kind: "CAPABILITY_DENIED", Reason: "PARENT_SCOPE_EXCEEDED"},
		{Kind: "RESOURCE_LIMIT", Reason: "THREAD_CONTEXT_LIMIT"},
		{Kind: "RESOURCE_LIMIT", Reason: "THREAD_PROVENANCE_LIMIT"},
	} {
		t.Run(refusal.Reason, func(t *testing.T) {
			f := newClaimFailureFixture(t)
			f.inbox.read = func(context.Context, *sql.Tx) error { return refusal }
			work, e := f.runs.Claim(ctx)
			if e != nil || work == nil || work.Run.ID != f.healthy.RunID {
				t.Fatal("known rejection blocked the next accepted root", work, e)
			}
			run, e := f.conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.profile, ID: f.bad.RunID})
			if e != nil || run.Status != "failed" || run.Reason != refusal.Reason || run.Usage != nil {
				t.Fatal("missing explicit body-free durable failure", run, e)
			}
			if f.count(t, "SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='failed'", f.bad.RunID) != 1 || f.count(t, "SELECT count(*) FROM config_snapshot_pins") != 1 || f.count(t, "SELECT count(*) FROM conversation_sessions WHERE active_run_id=?", f.bad.RunID) != 0 || f.count(t, "SELECT count(*) FROM conversation_messages WHERE run_id=? AND role='assistant'", f.bad.RunID) != 0 || f.count(t, "SELECT count(*) FROM model_attempts") != 0 {
				t.Fatal("rejected inbox retained occupancy or manufactured model output/usage")
			}
		})
	}
	for _, scenario := range []string{"unknown-denial", "group-binding-mismatch", "bad-json", "missing-relation", "io", "sql-query", "canceled", "terminal-statement", "commit"} {
		t.Run(scenario, func(t *testing.T) {
			f := newClaimFailureFixture(t)
			failure := errors.New("injected inbox I/O failure")
			var want error = failure
			callContext, cancel := context.WithCancel(ctx)
			defer cancel()
			switch scenario {
			case "unknown-denial":
				want = api.Denied("UNCLASSIFIED_PERMISSION_FAILURE")
			case "group-binding-mismatch":
				want = api.Denied("GROUP_BINDING_CHANGED")
			case "bad-json":
				want = &api.Fault{Kind: "CONFLICT", Reason: "MESSAGE_CONTEXT_INVALID"}
			case "missing-relation":
				want = &api.Fault{Kind: "NOT_FOUND", Reason: "GRANT_NOT_FOUND"}
			case "terminal-statement":
				if _, e := f.db.Database().ExecContext(ctx, "CREATE TRIGGER claim_terminal_failure BEFORE INSERT ON execution_events WHEN NEW.event_type='failed' BEGIN SELECT RAISE(ABORT,'injected terminal statement failure'); END"); e != nil {
					t.Fatal(e)
				}
			case "commit":
				if _, e := f.db.Database().ExecContext(ctx, "CREATE TABLE claim_fault_parent(id TEXT PRIMARY KEY); CREATE TABLE claim_fault_child(id INTEGER PRIMARY KEY,parent_id TEXT REFERENCES claim_fault_parent(id) DEFERRABLE INITIALLY DEFERRED)"); e != nil {
					t.Fatal(e)
				}
				f.inbox.commitFK = true
			}
			f.inbox.read = func(c context.Context, tx *sql.Tx) error {
				switch scenario {
				case "sql-query":
					var value string
					return tx.QueryRowContext(c, "SELECT value FROM deliberately_missing_claim_inbox").Scan(&value)
				case "canceled":
					cancel()
					return c.Err()
				case "terminal-statement", "commit":
					return api.Denied("GRANT_REVOKED")
				default:
					return want
				}
			}
			work, e := f.runs.Claim(callContext)
			if e == nil || work != nil {
				t.Fatal("failed read/transaction produced executable work", work, e)
			}
			if scenario == "sql-query" || scenario == "terminal-statement" || scenario == "commit" {
				var typed *api.Fault
				if errors.As(e, &typed) || (scenario == "commit" && !strings.Contains(strings.ToLower(e.Error()), "foreign key")) {
					t.Fatal("SQL failure was replaced with a business outcome", e)
				}
			} else if scenario == "canceled" {
				if !errors.Is(e, context.Canceled) {
					t.Fatal(e)
				}
			} else if !errors.Is(e, want) {
				t.Fatal("original typed/I/O error was swallowed", e, want)
			}
			f.assertUncommitted(t)
		})
	}
}
