package chat_test

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	recoverystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/recovery"
	usagestore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	contextapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type observedContextRepository struct {
	*executionstore.Store
	returned chan error
}

type changedPlanMemory struct {
	*memorystore.Store
	changeCount int32
	sealCalls   atomic.Int32
}

func (m *changedPlanMemory) SealInTx(c context.Context, tx *sql.Tx, e api.ToolExecution, plan executionstore.InitialContextPlan) (executionstore.InitialContextPlan, error) {
	if m.sealCalls.Add(1) <= m.changeCount {
		return plan, &api.Fault{Kind: "CONFLICT", Reason: "CONTEXT_PLAN_CHANGED"}
	}
	return m.Store.SealInTx(c, tx, e, plan)
}

type countedHostAdmission struct {
	api.ContextAccess
	calls atomic.Int32
}

func (a *countedHostAdmission) AuthorizeAdmission(c context.Context, id api.RequestIdentity, in api.RunAccessInput) error {
	a.calls.Add(1)
	return a.ContextAccess.AuthorizeAdmission(c, id, in)
}

func (r observedContextRepository) PrepareAndMarkRunning(c context.Context, w executorapp.Work) (executorapp.Work, error) {
	w, e := r.Store.PrepareAndMarkRunning(c, w)
	r.returned <- e
	return w, e
}

func TestMemorySealAndOriginalMarkRunningRollbackInOneTransaction(t *testing.T) {
	var calls atomic.Int32
	engine := fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		calls.Add(1)
		return api.EngineResult{Status: "finished", Text: "must not execute"}, nil
	}}
	core, root, loc := withEngine(t, engine, true)
	s := session(t, core)
	r, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, core, "atomic-seal", s.Revision), SessionID: s.ID, Intent: "original accepted request", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	if e = core.Close(); e != nil {
		t.Fatal(e)
	}
	<-core.Done()
	h, e := profile.Acquire(root, loc)
	if e != nil {
		t.Fatal(e)
	}
	b, e := base.Open(ctx, h)
	if e != nil {
		_ = h.Close()
		t.Fatal(e)
	}
	catalog := assistantstore.New(b)
	access := grantsstore.New(b)
	contextAccess := contextapp.New(access, nil)
	runs := executionstore.New(b, catalog, access)
	policy := usagestore.New(b, access, api.ExecutionLimits{}, api.BudgetPolicy{})
	memory := memorystore.New(b, catalog, access, policy)
	access.SetMemory(memory)
	runs.SetMemory(memory)
	runs.SetContextAccess(contextAccess)
	runs.SetTreeControl(policy)
	runs.SetRecovery(recoverystore.New(b, runs, access, contextAccess, nil))
	returned := make(chan error, 1)
	repo := observedContextRepository{Store: runs, returned: returned}
	conversation := directapp.New(runs, contextAccess, func() {})
	executor, e := executorapp.New(ctx, repo, engine, contextAccess, conversation, nil)
	if e != nil {
		memory.StopAdmission()
		<-memory.Done()
		_ = b.Close()
		_ = h.Close()
		t.Fatal(e)
	}
	t.Cleanup(func() {
		executor.Stop()
		<-executor.Done()
		memory.StopAdmission()
		<-memory.Done()
		if e := b.Close(); e != nil {
			t.Error(e)
		}
		if e := h.Close(); e != nil {
			t.Error(e)
		}
	})
	if _, e = b.Database().ExecContext(ctx, "CREATE TRIGGER fail_context_mark BEFORE UPDATE OF status ON execution_runs WHEN NEW.status='running' BEGIN SELECT RAISE(ABORT,'seal transaction fault'); END"); e != nil {
		t.Fatal(e)
	}
	executor.Start()
	select {
	case e = <-returned:
		if e == nil || !strings.Contains(e.Error(), "seal transaction fault") {
			t.Fatal("actual shared mark transaction was not reached", e)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("real context preparation did not return")
	}
	var manifests, entries, running, preparing int
	for query, slot := range map[string]*int{"SELECT count(*) FROM memory_run_contexts WHERE run_id=?": &manifests, "SELECT count(*) FROM memory_context_entries WHERE run_id=?": &entries, "SELECT count(*) FROM execution_runs WHERE run_id=? AND status='running'": &running, "SELECT count(*) FROM execution_runs WHERE run_id=? AND status='preparing'": &preparing} {
		if e = b.Database().QueryRowContext(ctx, query, r.RunID).Scan(slot); e != nil {
			t.Fatal(e)
		}
	}
	if manifests != 0 || entries != 0 || running != 0 || preparing != 1 || calls.Load() != 0 {
		t.Fatal("Seal leaked a separate commit or executed Engine", manifests, entries, running, preparing, calls.Load())
	}
	t.Log("actual Memory Seal reached the original mark writer; injected mark failure rolled both back, Engine0")
}

func TestMemoryPrepareReplansOnceAcrossExternalAdmissionAndRejectsSecondChange(t *testing.T) {
	for _, changes := range []int32{1, 2} {
		t.Run(map[int32]string{1: "one_replan", 2: "second_change_rejected"}[changes], func(t *testing.T) {
			var engineCalls atomic.Int32
			entered, releaseEngine := make(chan struct{}, 1), make(chan struct{})
			var releaseOnce sync.Once
			release := func() { releaseOnce.Do(func() { close(releaseEngine) }) }
			t.Cleanup(release)
			engine := fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				engineCalls.Add(1)
				entered <- struct{}{}
				<-releaseEngine
				return api.EngineResult{Status: "finished", Text: "accepted"}, nil
			}}
			core, root, loc := withEngine(t, engine, true)
			s := session(t, core)
			profileID := meta(t, core, "query", "").ProfileID
			r, err := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, core, "plan-change", s.Revision), SessionID: s.ID, Intent: "one accepted intent", SourceRefs: []api.SourceSnapshot{}})
			if err != nil {
				t.Fatal(err)
			}
			if err = core.Close(); err != nil {
				t.Fatal(err)
			}
			h, err := profile.Acquire(root, loc)
			if err != nil {
				t.Fatal(err)
			}
			b, err := base.Open(ctx, h)
			if err != nil {
				_ = h.Close()
				t.Fatal(err)
			}
			catalog := assistantstore.New(b)
			access := grantsstore.New(b)
			gate := &countedHostAdmission{ContextAccess: contextapp.New(access, nil)}
			runs := executionstore.New(b, catalog, access)
			policy := usagestore.New(b, access, api.ExecutionLimits{}, api.BudgetPolicy{})
			memory := memorystore.New(b, catalog, access, policy)
			changed := &changedPlanMemory{Store: memory, changeCount: changes}
			access.SetMemory(memory)
			runs.SetMemory(changed)
			runs.SetContextAccess(gate)
			runs.SetTreeControl(policy)
			runs.SetRecovery(recoverystore.New(b, runs, access, gate, nil))
			returned := make(chan error, 1)
			repo := observedContextRepository{Store: runs, returned: returned}
			conversation := directapp.New(runs, gate, func() {})
			executor, err := executorapp.New(ctx, repo, engine, gate, conversation, nil)
			if err != nil {
				memory.StopAdmission()
				<-memory.Done()
				_ = b.Close()
				_ = h.Close()
				t.Fatal(err)
			}
			t.Cleanup(func() {
				release()
				executor.Stop()
				<-executor.Done()
				memory.StopAdmission()
				<-memory.Done()
				if err := b.Close(); err != nil {
					t.Error(err)
				}
				if err := h.Close(); err != nil {
					t.Error(err)
				}
			})
			executor.Start()
			select {
			case err = <-returned:
			case <-time.After(6 * time.Second):
				t.Fatal("actual Plan/Seal did not return")
			}
			if gate.calls.Load() != 2 || changed.sealCalls.Load() != 2 {
				t.Fatal("bounded replan missed original Host gate or Seal", gate.calls.Load(), changed.sealCalls.Load())
			}
			var manifests int
			if e := b.Database().QueryRowContext(ctx, "SELECT count(*) FROM memory_run_contexts WHERE run_id=?", r.RunID).Scan(&manifests); e != nil {
				t.Fatal(e)
			}
			if changes == 2 {
				var fault *api.Fault
				if !errors.As(err, &fault) || fault.Reason != "CONTEXT_PLAN_CHANGED" || manifests != 0 || engineCalls.Load() != 0 {
					t.Fatal("second plan change published or executed", err, manifests, engineCalls.Load())
				}
			} else {
				if err != nil || manifests != 1 {
					t.Fatal("one replan failed to seal", err, manifests)
				}
				select {
				case <-entered:
				case <-time.After(6 * time.Second):
					t.Fatal("Engine did not receive the sealed context")
				}
				if _, err = b.Database().ExecContext(ctx, "DELETE FROM memory_context_entries WHERE run_id=?", r.RunID); err != nil {
					t.Fatal(err)
				}
				if _, err = b.Database().ExecContext(ctx, "DELETE FROM memory_run_contexts WHERE run_id=?", r.RunID); err != nil {
					t.Fatal(err)
				}
				visible, _, readErr := runs.GetRun(ctx, owner, api.IDQuery{ProfileID: profileID, ID: r.RunID})
				if readErr != nil || visible.ID != r.RunID || visible.ContextUsage != nil {
					t.Fatal("safe Run metadata depended on removed body manifest", visible, readErr)
				}
				err = b.WithinTx(ctx, func(tx *sql.Tx) error {
					_, readErr := runs.ReadRecoveryInTx(ctx, tx, owner, api.IDQuery{ProfileID: profileID, ID: r.RunID})
					return readErr
				})
				var fault *api.Fault
				if !errors.As(err, &fault) || fault.Reason != "CONTEXT_INPUT_STATE_INVALID" {
					t.Fatal("new-policy Recovery silently treated missing manifest as legacy", err)
				}
				executor.Stop()
				release()
				<-executor.Done()
			}
		})
	}
}
