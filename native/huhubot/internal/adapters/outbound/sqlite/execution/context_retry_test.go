package execution

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"github.com/ncruces/go-sqlite3"
)

type snapshotContextMemory struct {
	MemoryHooks
	writer         *sql.DB
	conflicts      int
	plans          []int
	seals          int
	snapshotErrors []error
	afterConflict  func()
}

func (m *snapshotContextMemory) PlanInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution) (InitialContextPlan, error) {
	var revision int
	if err := tx.QueryRowContext(ctx, "SELECT revision FROM profile_metadata WHERE singleton=1").Scan(&revision); err != nil {
		return InitialContextPlan{}, err
	}
	m.plans = append(m.plans, revision)
	h := sha256.Sum256([]byte("intent"))
	st := &api.ShortTermInput{
		Version:    "1",
		Namespace:  api.ContextNamespace{SubjectKind: "agent", SubjectID: "agent:snapshot", SessionID: e.Run.SessionID, WorkThreadID: "thread:snapshot"},
		IntentHash: "sha256:" + hex.EncodeToString(h[:]),
		Entries:    []api.ShortTermEntry{},
		Usage:      api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 0},
	}
	digest, err := api.CanonicalShortTermBinding(*st)
	if err != nil {
		return InitialContextPlan{}, err
	}
	st.BindingDigest = digest
	return InitialContextPlan{ShortTerm: st, Access: e.Access, Derived: e.Lineage.Derived}, nil
}

func (m *snapshotContextMemory) SealInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution, plan InitialContextPlan) (InitialContextPlan, error) {
	m.seals++
	if m.seals <= m.conflicts {
		// Tx B has already read execution_runs. A different connection commits a
		// write while that read snapshot remains open, then Seal tries to write.
		if _, err := m.writer.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1"); err != nil {
			return InitialContextPlan{}, err
		}
	}
	_, err := tx.ExecContext(ctx, "UPDATE execution_runs SET reason=reason WHERE run_id=?", e.Run.ID)
	if err != nil {
		m.snapshotErrors = append(m.snapshotErrors, err)
		if m.afterConflict != nil {
			m.afterConflict()
		}
		return InitialContextPlan{}, err
	}
	return plan, nil
}

type snapshotContextAccess struct {
	api.ContextAccess
	authorizations int
	denyOn         int
}

func (a *snapshotContextAccess) AuthorizeAdmission(context.Context, api.RequestIdentity, api.RunAccessInput) error {
	a.authorizations++
	if a.authorizations == a.denyOn {
		return api.Denied("SOURCE_CHANGED")
	}
	return nil
}
func (*snapshotContextAccess) PrepareContext(context.Context, api.RequestIdentity, api.RunAccessInput) (api.PreparedContext, error) {
	return api.PreparedContext{}, nil
}

type oneClaimRepository struct {
	*Store
	work    executorapp.Work
	claimed bool
}

func (*oneClaimRepository) Recover(context.Context) error { return nil }
func (r *oneClaimRepository) Claim(context.Context) (*executorapp.Work, error) {
	if r.claimed {
		return nil, nil
	}
	r.claimed = true
	w := r.work
	return &w, nil
}

func snapshotContextFixture(t *testing.T) (*Store, *sql.DB, executorapp.Work) {
	t.Helper()
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	h, err := profile.Acquire(root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = h.Close() })
	b, err := base.Open(ctx, h)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.Close() })
	var profileID string
	if err := b.Database().QueryRowContext(ctx, "SELECT profile_id FROM profile_metadata WHERE singleton=1").Scan(&profileID); err != nil {
		t.Fatal(err)
	}
	id := api.NewConnectionIdentity("connection:snapshot", "owner:snapshot", true)
	if _, err := b.Database().ExecContext(ctx, `INSERT INTO conversation_sessions(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,active_run_id) VALUES('session:snapshot',?,?,'direct','','',1,0,'run:snapshot')`, profileID, id.PrincipalID()); err != nil {
		t.Fatal(err)
	}
	if _, err := b.Database().ExecContext(ctx, `INSERT INTO execution_runs(
		run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,
		status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,
		effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at,
		root_run_id,work_thread_id,budget_root_run_id,context_policy_version
	) VALUES('run:snapshot','session:snapshot',?,'','{}','agent:snapshot',1,1,
		'preparing',2,'intent','[]','[]','[]','[]','[]',
		'[]','','claim:snapshot','','','',1,'2026-10-27T00:00:00Z',
		'run:snapshot','thread:snapshot','run:snapshot','extractive-v1')`, id.PrincipalID()); err != nil {
		t.Fatal(err)
	}
	writer, err := sql.Open("sqlite3", h.DatabasePath)
	if err != nil {
		t.Fatal(err)
	}
	writer.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = writer.Close() })
	w := executorapp.Work{ContextPolicy: "extractive-v1", Identity: id, Run: api.Run{ID: "run:snapshot", SessionID: "session:snapshot"}, ClaimToken: "claim:snapshot", Input: api.EngineInput{Intent: "intent"}}
	s := New(b, assistant.New(b), nil)
	return s, writer, w
}

func TestPrepareAndMarkRunningRetriesRealBusySnapshotFromFreshPlan(t *testing.T) {
	store, writer, work := snapshotContextFixture(t)
	memory := &snapshotContextMemory{writer: writer, conflicts: 1}
	access := &snapshotContextAccess{}
	store.SetMemory(memory)
	store.SetContextAccess(access)
	got, err := store.PrepareAndMarkRunning(context.Background(), work)
	if err != nil {
		t.Fatal(err)
	}
	if len(memory.snapshotErrors) != 1 || !errors.Is(memory.snapshotErrors[0], sqlite3.BUSY_SNAPSHOT) || len(memory.plans) != 2 || memory.plans[1] != memory.plans[0]+1 || memory.seals != 2 || access.authorizations != 2 {
		t.Fatalf("retry did not replan and reauthorize after actual 517: plans=%v seals=%d authorizations=%d errors=%v", memory.plans, memory.seals, access.authorizations, memory.snapshotErrors)
	}
	var state, token string
	if err := store.Base.Database().QueryRow("SELECT status,claim_token FROM execution_runs WHERE run_id=?", work.Run.ID).Scan(&state, &token); err != nil {
		t.Fatal(err)
	}
	if state != "running" || token != work.ClaimToken || got.Run.ID != work.Run.ID || got.Input.ShortTerm == nil {
		t.Fatalf("successful retry did not commit the current claim: state=%q token=%q work=%#v", state, token, got)
	}
}

func TestCanceledBusySnapshotDoesNotStartAnotherPlan(t *testing.T) {
	store, writer, work := snapshotContextFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	memory := &snapshotContextMemory{writer: writer, conflicts: 1, afterConflict: cancel}
	access := &snapshotContextAccess{}
	store.SetMemory(memory)
	store.SetContextAccess(access)
	_, err := store.PrepareAndMarkRunning(ctx, work)
	if !errors.Is(err, context.Canceled) || len(memory.snapshotErrors) != 1 || !errors.Is(memory.snapshotErrors[0], sqlite3.BUSY_SNAPSHOT) || len(memory.plans) != 1 || access.authorizations != 1 {
		t.Fatalf("canceled snapshot started another plan: err=%v plans=%v authorizations=%d snapshotErrors=%v", err, memory.plans, access.authorizations, memory.snapshotErrors)
	}
}

func TestBusySnapshotRetryHonorsCurrentHostDenial(t *testing.T) {
	store, writer, work := snapshotContextFixture(t)
	memory := &snapshotContextMemory{writer: writer, conflicts: 1}
	access := &snapshotContextAccess{denyOn: 2}
	store.SetMemory(memory)
	store.SetContextAccess(access)
	repo := &oneClaimRepository{Store: store, work: work}
	executor, err := executorapp.New(context.Background(), repo, nil, access, nil)
	if err != nil {
		t.Fatal(err)
	}
	executor.Start()
	executor.Wake()
	t.Cleanup(func() { _ = executor.Close() })
	deadline := time.Now().Add(8 * time.Second)
	var state, reason string
	for {
		if err := store.Base.Database().QueryRow("SELECT status,reason FROM execution_runs WHERE run_id=?", work.Run.ID).Scan(&state, &reason); err != nil {
			t.Fatal(err)
		}
		if state == "failed" {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("changed Host qualification stranded claimed Run: state=%q reason=%q", state, reason)
		}
		time.Sleep(5 * time.Millisecond)
	}
	if err := executor.Close(); err != nil {
		t.Fatal(err)
	}
	if reason != "ACCESS_REVOKED" || len(memory.snapshotErrors) != 1 || !errors.Is(memory.snapshotErrors[0], sqlite3.BUSY_SNAPSHOT) || len(memory.plans) != 2 || memory.seals != 1 || access.authorizations != 2 {
		t.Fatalf("retry bypassed current Host denial: reason=%q plans=%v seals=%d authorizations=%d errors=%v", reason, memory.plans, memory.seals, access.authorizations, memory.snapshotErrors)
	}
}

func TestExecutorSettlesRealBusySnapshotExhaustionWithoutStartingEngine(t *testing.T) {
	store, writer, work := snapshotContextFixture(t)
	memory := &snapshotContextMemory{writer: writer, conflicts: 2}
	access := &snapshotContextAccess{}
	store.SetMemory(memory)
	store.SetContextAccess(access)
	repo := &oneClaimRepository{Store: store, work: work}
	executor, err := executorapp.New(context.Background(), repo, nil, access, nil)
	if err != nil {
		t.Fatal(err)
	}
	executor.Start()
	executor.Wake()
	t.Cleanup(func() { _ = executor.Close() })
	deadline := time.Now().Add(8 * time.Second)
	var state, reason string
	for {
		if err := store.Base.Database().QueryRow("SELECT status,reason FROM execution_runs WHERE run_id=?", work.Run.ID).Scan(&state, &reason); err != nil {
			t.Fatal(err)
		}
		if state == "failed" {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("snapshot exhaustion stranded claimed Run: state=%q reason=%q", state, reason)
		}
		time.Sleep(5 * time.Millisecond)
	}
	if err := executor.Close(); err != nil {
		t.Fatal(err)
	}
	var active, pins, slots int
	if err := store.Base.Database().QueryRow("SELECT count(*) FROM conversation_sessions WHERE active_run_id=?", work.Run.ID).Scan(&active); err != nil {
		t.Fatal(err)
	}
	if err := store.Base.Database().QueryRow("SELECT count(*) FROM task_config_pins WHERE run_id=?", work.Run.ID).Scan(&pins); err != nil {
		t.Fatal(err)
	}
	if err := store.Base.Database().QueryRow("SELECT child_slot FROM execution_runs WHERE run_id=?", work.Run.ID).Scan(&slots); err != nil {
		t.Fatal(err)
	}
	if reason != "CONTEXT_SNAPSHOT_BUSY" || active != 0 || pins != 0 || slots != 0 || len(memory.snapshotErrors) != 2 || !errors.Is(memory.snapshotErrors[0], sqlite3.BUSY_SNAPSHOT) || !errors.Is(memory.snapshotErrors[1], sqlite3.BUSY_SNAPSHOT) || len(memory.plans) != 2 || memory.plans[1] != memory.plans[0]+1 || access.authorizations != 2 {
		t.Fatalf("exhaustion did not settle after actual 517: reason=%q active=%d pins=%d slots=%d plans=%v authorizations=%d errors=%v", reason, active, pins, slots, memory.plans, access.authorizations, memory.snapshotErrors)
	}
}
