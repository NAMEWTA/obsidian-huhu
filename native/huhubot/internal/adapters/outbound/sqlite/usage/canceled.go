package usage

import (
	"context"
	"database/sql"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
)

// CanceledInTx is called by the sole effects cancellation writer, after the
// durable Run barrier in this same transaction. It records an outcome only;
// actual producer slots, charged reservations and configuration pins retain
// their original lifecycles until those producers have really ended.
func (s *Store) CanceledInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	var parent, status, reason string
	if e := tx.QueryRowContext(ctx, "SELECT parent_run_id,status,reason FROM execution_runs WHERE run_id=?", runID).Scan(&parent, &status, &reason); e != nil {
		return e
	}
	if status != "canceled" {
		return fail("CONFLICT", "TASK_NOT_CANCELED")
	}
	if u, e := s.UsageInTx(ctx, tx, runID); e != nil {
		return e
	} else if u != nil {
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET usage_json=? WHERE run_id=?", encode(u), runID); e != nil {
			return e
		}
	}
	if parent == "" {
		e := tx.QueryRowContext(ctx, "SELECT parent_run_id FROM collaboration_delegations WHERE child_run_id=?", runID).Scan(&parent)
		if errors.Is(e, sql.ErrNoRows) {
			return nil
		}
		if e != nil {
			return e
		}
	}
	result, e := tx.ExecContext(ctx, "INSERT INTO collaboration_result_deliveries(child_run_id,parent_run_id,status,reason,text,source_json,scope_json,grants_json,derived_json) VALUES(?,?,'canceled',?,'','[]','[]','[]','[]') ON CONFLICT(child_run_id) DO NOTHING", runID, parent, reason)
	if e != nil {
		return e
	}
	n, e := result.RowsAffected()
	if e != nil || n == 0 {
		return e
	}
	return execution.AddEventInTx(ctx, tx, parent, "delegation.completed", map[string]string{"childRunId": runID, "status": "canceled", "reason": reason})
}
