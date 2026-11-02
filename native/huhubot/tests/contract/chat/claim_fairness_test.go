package chat_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type fairnessEngine struct {
	run func(context.Context, api.EngineInput) (api.EngineResult, error)
}

func (e fairnessEngine) Run(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, in)
}
func (fairnessEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("unexpected checkpoint resume")
}

func fairnessOpen(t *testing.T, root, loc string, o bootstrap.Options) *bootstrap.Core {
	t.Helper()
	c, err := bootstrap.OpenWithOptions(ctx, root, loc, o)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := c.Close(); err != nil {
			t.Error(err)
		}
		bounded, cancel := context.WithTimeout(ctx, 6*time.Second)
		defer cancel()
		if err := c.WaitClosed(bounded); err != nil {
			t.Error("Core cleanup did not finish", err)
		}
	})
	return c
}

func fairnessRun(t *testing.T, c *bootstrap.Core, id string) api.Run {
	t.Helper()
	r, err := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "get", "").ProfileID, ID: id})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func fairnessWait(t *testing.T, c *bootstrap.Core, id, state string) bool {
	t.Helper()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	bounded, cancel := context.WithTimeout(ctx, 6*time.Second)
	defer cancel()
	for {
		r, err := c.API.Conversation.GetRun(bounded, owner, api.IDQuery{ProfileID: meta(t, c, "wait", "").ProfileID, ID: id})
		if err != nil {
			return false
		}
		if r.Status == state {
			return true
		}
		select {
		case <-bounded.Done():
			return false
		case <-ticker.C:
		}
	}
}

func TestClaimPassesClosedRecoveryPagesWithoutChangingOtherTrees(t *testing.T) {
	for _, trees := range []int{4, 6} {
		t.Run(fmt.Sprintf("%d_trees", trees), func(t *testing.T) {
			var publish func()
			// Register first so publication runs after every Core/DB/temp cleanup.
			// A cleanup failure must not publish an otherwise passing fixture.
			t.Cleanup(func() {
				if publish != nil && !t.Failed() {
					publish()
				}
			})
			root := filepath.Join(t.TempDir(), "profiles")
			if err := os.Mkdir(root, 0700); err != nil {
				t.Fatal(err)
			}
			loc := filepath.Join(root, "one")
			// Five real producers fix the sixth tree's unclaimed state independently
			// of the bug: its children cannot acquire the Profile's five slots.
			limits := api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 1, ProfileChildren: 5, MaxWakes: 8}
			var roots []string
			if claimFairnessRace {
				if os.Getenv("HUHU_GENERATE_CLAIM_FIXTURES") != "" {
					t.Fatal("generate fixtures only in ordinary mode")
				}
				roots = fairnessLoadFixture(t, loc, trees, limits)
			} else {
				roots = fairnessConstructProfile(t, root, loc, trees, limits)
				if os.Getenv("HUHU_GENERATE_CLAIM_FIXTURES") == "1" {
					publish = fairnessStageFixture(t, loc, roots, trees, limits)
				}
			}
			db, err := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := db.Close(); err != nil {
					t.Error(err)
				}
			})
			count := func(query string, args ...any) int {
				t.Helper()
				var n int
				if err := db.QueryRow(query, args...).Scan(&n); err != nil {
					t.Fatal(err)
				}
				return n
			}
			wantAccepted := 31 * trees
			if trees == 6 {
				wantAccepted++
			}
			if n := count("SELECT count(*) FROM execution_runs WHERE status='accepted'"); n != wantAccepted {
				t.Fatal("setup did not create the actual original accepted queue", n, wantAccepted)
			}
			paused := fairnessOpen(t, root, loc, bootstrap.Options{ExecutorPaused: true, ExecutionLimits: limits})
			selected := roots[len(roots)-1]
			if trees == 4 {
				var leaf string
				if err := db.QueryRow("SELECT run_id FROM execution_runs WHERE root_run_id=? AND status='interrupted'", selected).Scan(&leaf); err != nil {
					t.Fatal(err)
				}
				lr := fairnessRun(t, paused, leaf)
				if _, err := paused.API.Approvals.Cancel(ctx, owner, api.RunCancel{CommandMeta: meta(t, paused, "cancel-leaf", lr.Revision), ID: leaf}); err != nil {
					t.Fatal(err)
				}
				q, err := paused.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: meta(t, paused, "inspect", "").ProfileID, ID: selected})
				if err != nil || q.State != "ready" {
					t.Fatal("normal four-tree recovery control not ready", q, err)
				}
				if _, err := paused.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: meta(t, paused, "resume-tree", q.Revision), ID: selected, RecoveryGeneration: q.Generation}); err != nil {
					t.Fatal(err)
				}
			} else {
				q, err := paused.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: meta(t, paused, "inspect", "").ProfileID, ID: selected})
				if err != nil || q.State != "none" {
					t.Fatal("never-claimed sixth tree must not need resume", q, err)
				}
			}
			if err := paused.Close(); err != nil {
				t.Fatal(err)
			}
			// Pin the exact original eligible identities before any final worker
			// starts. Only their new durable success can refresh the stall clock.
			originalIDs := map[string]bool{}
			rows, err := db.Query("SELECT run_id FROM execution_runs WHERE root_run_id=? AND status='accepted'", selected)
			if err != nil {
				t.Fatal(err)
			}
			for rows.Next() {
				var id string
				if err = rows.Scan(&id); err != nil {
					_ = rows.Close()
					t.Fatal(err)
				}
				originalIDs[id] = true
			}
			readErr := rows.Err()
			closeErr := rows.Close()
			if readErr != nil || closeErr != nil {
				t.Fatal(readErr, closeErr)
			}
			want := 32
			if trees == 4 {
				want = 31
			}
			if len(originalIDs) != want {
				t.Fatal("wrong original eligible Run identities", len(originalIDs), want)
			}
			var mu sync.Mutex
			calls := map[string]int{}
			leaked := 0
			finalEngine := fairnessEngine{run: func(_ context.Context, in api.EngineInput) (api.EngineResult, error) {
				mu.Lock()
				defer mu.Unlock()
				if in.Lineage.RootRunID != selected {
					leaked++
					return api.EngineResult{}, fmt.Errorf("closed tree crossed recovery gate")
				}
				calls[in.RunID]++
				return api.EngineResult{Status: "finished", Text: "FRESH"}, nil
			}}
			final := fairnessOpen(t, root, loc, bootstrap.Options{Engine: finalEngine, ExecutionLimits: limits})
			if !fairnessWaitOriginalProgress(t, final, db, selected, originalIDs) {
				mu.Lock()
				actual := len(calls)
				mu.Unlock()
				t.Errorf("original tree did not finish within bounded durable-progress observation: state=%s distinct Engine runs=%d", fairnessRun(t, final, selected).Status, actual)
				if trees == 6 {
					// The old-code red retains the reviewer's single-variable control:
					// cancel only a different front tree; never resume the target.
					r := fairnessRun(t, final, roots[0])
					if _, err := final.API.Approvals.Cancel(ctx, owner, api.RunCancel{CommandMeta: meta(t, final, "cancel-front", r.Revision), ID: r.ID}); err != nil {
						t.Fatal(err)
					}
					if !fairnessWaitOriginalProgress(t, final, db, selected, originalIDs) {
						t.Fatal("front-tree cancel control did not release original target")
					}
					t.Log("old-source control: only canceling an unrelated front tree let the same 32 children finish")
				}
			}
			mu.Lock()
			if len(calls) != want || leaked != 0 {
				t.Error("wrong actual consumers", len(calls), want, leaked)
			}
			for id, n := range calls {
				if n != 1 {
					t.Error("original child executed more than once", id, n)
				}
			}
			mu.Unlock()
			if trees == 6 && !t.Failed() {
				if n := count("SELECT count(*) FROM execution_recovery_trees WHERE state='blocked'"); n != 5 {
					t.Fatal("changed unrelated recovery trees", n)
				}
				if n := count("SELECT count(*) FROM execution_runs WHERE status='accepted'"); n != 155 {
					t.Fatal("closed accepted children changed", n)
				}
			}
			if n := count("SELECT count(*) FROM execution_runs"); n != trees*33 {
				t.Fatal("recovery created new Run identities", n)
			}
			if n := count("SELECT COALESCE(sum(child_slot),0) FROM execution_runs"); n != 0 {
				t.Fatal("finished work or stopped producers retained child slots", n)
			}
			if n := count("SELECT count(*) FROM task_config_pins p JOIN execution_runs r ON r.run_id=p.run_id WHERE r.root_run_id=?", selected); n != 0 {
				t.Fatal("target original task pins not released", n)
			}
			if err := final.Close(); err != nil {
				t.Fatal(err)
			}
			<-final.Done()
			t.Logf("public %d-tree control: original target children=%d; all Core Done, no unrelated Engine", trees, want)
		})
	}
}

// Six seconds bounds an actual lack of progress, not the completion time of
// 31/32 serialized children under instrumentation. Polls, Engine entry, changed
// parent status, and repeated terminal rows never refresh this deadline.
func fairnessWaitOriginalProgress(t *testing.T, c *bootstrap.Core, db *sql.DB, root string, original map[string]bool) bool {
	t.Helper()
	profileID := meta(t, c, "progress", "").ProfileID
	absolute, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	succeeded := map[string]bool{}
	args := []any{root}
	for id := range original {
		args = append(args, id)
	}
	query := "SELECT run_id,status FROM execution_runs WHERE root_run_id=? AND run_id IN(" + strings.TrimSuffix(strings.Repeat("?,", len(original)), ",") + ")"
	stalledAt := time.Now().Add(6 * time.Second)
	for {
		check, stopCheck := context.WithDeadline(absolute, stalledAt)
		rows, e := db.QueryContext(check, query, args...)
		if e != nil {
			stopCheck()
			t.Log("original Run progress query failed", e)
			return false
		}
		changed := false
		currentRows, currentSuccesses := 0, 0
		var observationErr error
		for rows.Next() {
			var id, state string
			if observationErr = rows.Scan(&id, &state); observationErr != nil {
				break
			}
			currentRows++
			if state == "succeeded" {
				currentSuccesses++
			}
			if !original[id] {
				observationErr = fmt.Errorf("unexpected Run identity in original tree: %s", id)
				break
			}
			if state == "failed" || state == "canceled" {
				observationErr = fmt.Errorf("original eligible Run %s terminated as %s", id, state)
				break
			}
			if state == "succeeded" && !succeeded[id] {
				succeeded[id] = true
				changed = true
			}
		}
		if observationErr == nil {
			observationErr = rows.Err()
		}
		closeErr := rows.Close()
		if observationErr != nil || closeErr != nil {
			stopCheck()
			t.Log("original Run observation failed", observationErr, closeErr)
			return false
		}
		stopCheck()
		if currentRows != len(original) {
			t.Log("original Run row missing", currentRows, len(original))
			return false
		}
		if changed {
			stalledAt = time.Now().Add(6 * time.Second)
			t.Logf("actual original durable successes %d/%d", len(succeeded), len(original))
		}
		rootCheck, stopRoot := context.WithDeadline(absolute, stalledAt)
		current, e := c.API.Conversation.GetRun(rootCheck, owner, api.IDQuery{ProfileID: profileID, ID: root})
		stopRoot()
		if e != nil {
			t.Log("original root observation failed", e)
			return false
		}
		if current.Status == "succeeded" && currentSuccesses == len(original) {
			return true
		}
		// The parent can commit after the child-row read. Re-read current
		// original rows before asserting completeness; old successes only drive
		// the stall clock, never the final success predicate.
		if current.Status == "failed" || current.Status == "canceled" {
			t.Log("original root terminated unexpectedly", current.Status, current.Reason)
			return false
		}
		wait, stopWait := context.WithDeadline(absolute, stalledAt)
		select {
		case <-wait.Done():
			stopWait()
			t.Logf("original success progress stopped: completed=%d/%d err=%v", len(succeeded), len(original), wait.Err())
			return false
		case <-ticker.C:
			stopWait()
		}
	}
}

// Construction remains a full public-API test in ordinary mode. The immutable
// output is captured only after the actual Executor and producers have drained.
func fairnessConstructProfile(t *testing.T, root, loc string, trees int, limits api.ExecutionLimits) []string {
	t.Helper()
	initial := fairnessOpen(t, root, loc, bootstrap.Options{ExecutorPaused: true, ExecutionLimits: limits})
	worker, err := initial.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, initial, "worker", ""), Draft: api.AgentDraft{Name: "worker"}})
	if err != nil {
		t.Fatal(err)
	}
	parent, err := initial.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, initial, "parent", ""), Draft: api.AgentDraft{Name: "parent", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{worker.ID}}})
	if err != nil {
		t.Fatal(err)
	}
	roots := []string{}
	for n := range trees {
		s, err := initial.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, initial, fmt.Sprintf("session-%d", n), ""), Kind: "direct", MemberIDs: []string{parent.ID}})
		if err != nil {
			t.Fatal(err)
		}
		r, err := initial.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, initial, fmt.Sprintf("root-%d", n), s.Revision), SessionID: s.ID, Intent: fmt.Sprintf("queue-root-%d", n), SourceRefs: []api.SourceSnapshot{}})
		if err != nil {
			t.Fatal(err)
		}
		roots = append(roots, r.RunID)
	}
	if err := initial.Close(); err != nil {
		t.Fatal(err)
	}
	permits := make([]chan struct{}, trees)
	held := make([]chan string, trees)
	built := make([]chan struct{}, trees)
	rootIndex := map[string]int{}
	for n, id := range roots {
		permits[n], held[n], rootIndex[id] = make(chan struct{}), make(chan string, 1), n
		built[n] = make(chan struct{})
	}
	setup := fairnessEngine{run: func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		if strings.HasPrefix(in.Intent, "queue-root-") {
			n, err := strconv.Atoi(strings.TrimPrefix(in.Intent, "queue-root-"))
			if err != nil {
				return api.EngineResult{}, err
			}
			select {
			case <-permits[n]:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
			for j := range 32 {
				_, err := in.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprintf("delegate-%d", j), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: worker.ID}, Task: fmt.Sprintf("queue-child-%d", j), Constraints: []string{}}})
				if err != nil {
					return api.EngineResult{}, err
				}
			}
			close(built[n])
			return api.EngineResult{Status: "finished", Text: "parent-result"}, nil
		}
		select {
		case held[rootIndex[in.Lineage.RootRunID]] <- in.RunID:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		<-c.Done()
		return api.EngineResult{}, c.Err()
	}}
	active := fairnessOpen(t, root, loc, bootstrap.Options{Engine: setup, ExecutionLimits: limits})
	for n, id := range roots {
		close(permits[n])
		// Setup's 32 real admissions are not the target fairness timer.
		// Wait for their committed completion before observing the parent
		// result through the original six-second status bound.
		select {
		case <-built[n]:
		case <-time.After(30 * time.Second):
			t.Fatal("setup did not finish its 32 public child admissions", n)
		}
		if !fairnessWait(t, active, id, "waiting_children") {
			t.Fatal("parent never committed its original application result", fairnessRun(t, active, id))
		}
		if n < 5 {
			select {
			case <-held[n]:
			case <-time.After(6 * time.Second):
				t.Fatal("real child producer did not enter", n)
			}
		}
	}
	if err := active.Close(); err != nil {
		t.Fatal(err)
	}
	<-active.Done()
	return roots
}
