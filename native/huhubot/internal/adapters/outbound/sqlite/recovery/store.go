package recovery

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"sync/atomic"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type AccessChecker interface {
	CheckInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, []string) error
}

type MemoryRecovery interface {
	RecoveryWatermarkInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (string, error)
}

type Store struct {
	stopping  atomic.Bool
	base      *base.Store
	runs      *execution.Store
	checker   AccessChecker
	current   api.ContextAccess
	inspector api.RecoveryInspector
	memory    MemoryRecovery
}

func (s *Store) SetMemory(r MemoryRecovery) { s.memory = r }

func New(b *base.Store, r *execution.Store, a AccessChecker, current api.ContextAccess, inspector api.RecoveryInspector) *Store {
	return &Store{base: b, runs: r, checker: a, current: current, inspector: inspector}
}

func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func encoded(v any) string            { b, _ := json.Marshal(v); return string(b) }
func (s *Store) CheckInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	if s.stopping.Load() {
		return api.Denied("SERVICE_STOPPING")
	}
	return CheckInTx(ctx, tx, runID)
}
func (s *Store) StopAdmission() { s.stopping.Store(true) }

// ReadRecoveryStatus is a metadata projection for runs.get. It deliberately
// performs no checkpoint I/O and cannot advance eligibility generations.
func (s *Store) ReadRecoveryStatus(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.RecoveryStatus, error) {
	var out snapshot
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; out, e = s.statusInTx(ctx, tx, id, q); return e })
	return out.status, e
}
func (s *Store) ReadRecoveryStatusInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (api.RecoveryStatus, error) {
	out, e := s.statusInTx(ctx, tx, id, q)
	return out.status, e
}

// ResetRuntimeInTx is called only after the original exclusive Profile lock has
// proved that the preceding process and its producers no longer exist.
func (s *Store) ResetRuntimeInTx(ctx context.Context, tx *sql.Tx) error {
	_, e := tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state=CASE WHEN EXISTS(SELECT 1 FROM purge_previews WHERE state='failed') OR EXISTS(SELECT 1 FROM session_deletions WHERE state='pending') THEN 'stopping' ELSE 'open' END WHERE singleton=1")
	return e
}

func (s *Store) Stop(ctx context.Context) error {
	s.StopAdmission()
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state='stopping' WHERE singleton=1")
		return e
	})
}

// InspectPending publishes startup eligibility before the original Executor
// starts scanning. It uses owner metadata identities and never claims work.
func (s *Store) InspectPending(ctx context.Context) error {
	rows, e := s.base.Database().QueryContext(ctx, "SELECT t.root_run_id,r.principal_id,c.profile_id FROM execution_recovery_trees t JOIN execution_runs r ON r.run_id=t.root_run_id JOIN conversation_sessions c ON c.session_id=r.session_id WHERE t.state IN('checking','ready','blocked') ORDER BY t.root_run_id")
	if e != nil {
		return e
	}
	type pending struct{ root, principal, profile string }
	all := []pending{}
	for rows.Next() {
		var p pending
		if e = rows.Scan(&p.root, &p.principal, &p.profile); e != nil {
			rows.Close()
			return e
		}
		all = append(all, p)
	}
	e = rows.Err()
	ce := rows.Close()
	if e != nil {
		return e
	}
	if ce != nil {
		return ce
	}
	for _, p := range all {
		if _, e = s.Get(ctx, api.NewConnectionIdentity("recovery-inspection:"+p.root, p.principal, false), api.IDQuery{ProfileID: p.profile, ID: p.root}); e != nil {
			return e
		}
	}
	return nil
}

// MarkInterruptedTreesInTx preserves the actual interrupted subset and closes
// every nonterminal participant in each affected causal tree. A sibling need
// not itself have been claimed to be behind this recovery barrier.
func (s *Store) MarkInterruptedTreesInTx(ctx context.Context, tx *sql.Tx, ids []string) error {
	roots := map[string][]string{}
	for _, run := range ids {
		var root string
		if e := tx.QueryRowContext(ctx, "SELECT COALESCE(NULLIF(root_run_id,''),run_id) FROM execution_runs WHERE run_id=?", run).Scan(&root); e != nil {
			return e
		}
		roots[root] = append(roots[root], run)
	}
	for root, interrupted := range roots {
		rows, e := tx.QueryContext(ctx, "SELECT run_id FROM execution_runs WHERE (root_run_id=? OR run_id=?) AND status NOT IN('succeeded','failed','canceled') ORDER BY run_id", root, root)
		if e != nil {
			return e
		}
		affected := []string{}
		for rows.Next() {
			var run string
			if e = rows.Scan(&run); e != nil {
				rows.Close()
				return e
			}
			affected = append(affected, run)
		}
		e = rows.Err()
		ce := rows.Close()
		if e != nil {
			return e
		}
		if ce != nil {
			return ce
		}
		if len(affected) == 0 || len(affected) > 33 {
			return fault("CONFLICT", "RECOVERY_TREE_INVALID")
		}
		// Earlier unrecovered interruptions remain real positions even if this
		// process only interrupted another participant of the same tree.
		var old string
		e = tx.QueryRowContext(ctx, "SELECT interrupted_run_ids_json FROM execution_recovery_trees WHERE root_run_id=?", root).Scan(&old)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		if e == nil {
			var previous []string
			if json.Unmarshal([]byte(old), &previous) != nil {
				return fault("CONFLICT", "RECOVERY_STATE_INVALID")
			}
			interrupted = unique(append(previous, interrupted...))
		}
		result, e := tx.ExecContext(ctx, "INSERT INTO execution_recovery_trees(root_run_id,generation,state,affected_run_ids_json,interrupted_run_ids_json) VALUES(?,1,'checking',?,?) ON CONFLICT(root_run_id) DO UPDATE SET generation=generation+1,state='checking',tree_revision='',affected_run_ids_json=excluded.affected_run_ids_json,interrupted_run_ids_json=excluded.interrupted_run_ids_json,reason='',checked_at='' WHERE generation<9223372036854775807", root, encoded(affected), encoded(unique(interrupted)))
		if e != nil {
			return e
		}
		if n, e := result.RowsAffected(); e != nil {
			return e
		} else if n != 1 {
			return fault("RESOURCE_LIMIT", "RECOVERY_GENERATION_EXHAUSTED")
		}
	}
	return nil
}

func unique(v []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, x := range v {
		if !seen[x] {
			seen[x] = true
			out = append(out, x)
		}
	}
	return out
}

type snapshot struct {
	status                  api.RecoveryStatus
	interrupted             []string
	items                   []api.RecoveryInspection
	revision                string
	priorState, priorReason string
	inspectionError         error
}

// statusInTx is owner metadata, so losing a source/Group right does not hide the
// reason that recovery is blocked. Actual source/body access remains separate.
func (s *Store) statusInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (snapshot, error) {
	var out snapshot
	r, _, e := execution.ReadInTx(ctx, tx, id, q)
	if e != nil {
		return out, e
	}
	root := r.RootRunID
	if root == "" {
		root = r.ID
	}
	out.status = api.RecoveryStatus{RunID: r.ID, RootRunID: root, Revision: r.Revision, State: "none", Generation: "0", AffectedRunIDs: []string{}}
	var affected, interrupted string
	e = tx.QueryRowContext(ctx, "SELECT CAST(generation AS TEXT),state,tree_revision,affected_run_ids_json,interrupted_run_ids_json,reason,checked_at FROM execution_recovery_trees WHERE root_run_id=?", root).Scan(&out.status.Generation, &out.status.State, &out.status.TreeRevision, &affected, &interrupted, &out.status.Reason, &out.status.CheckedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return out, nil
	}
	if e != nil {
		return out, e
	}
	if json.Unmarshal([]byte(affected), &out.status.AffectedRunIDs) != nil || json.Unmarshal([]byte(interrupted), &out.interrupted) != nil || len(out.status.AffectedRunIDs) > 33 || len(out.interrupted) > 33 {
		return out, fault("CONFLICT", "RECOVERY_STATE_INVALID")
	}
	out.priorState, out.priorReason = out.status.State, out.status.Reason
	return out, nil
}

func increment(v string) (string, error) {
	n, e := strconv.ParseInt(v, 10, 64)
	if e != nil || n <= 0 || n == 9223372036854775807 {
		return "", fault("RESOURCE_LIMIT", "RECOVERY_GENERATION_EXHAUSTED")
	}
	return strconv.FormatInt(n+1, 10), nil
}
