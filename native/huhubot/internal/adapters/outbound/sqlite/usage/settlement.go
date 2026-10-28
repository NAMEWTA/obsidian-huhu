package usage

import (
	"context"
	"database/sql"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
)

// A terminal orchestration result can precede an admitted HTTP producer's final
// usage. Refresh its projection without reopening the Run or charging it again.
func (s *Store) refreshSettledUsageInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	rows, err := tx.QueryContext(ctx, `WITH RECURSIVE ancestors(run_id,parent_run_id) AS (
		SELECT run_id,parent_run_id FROM execution_runs WHERE run_id=?
		UNION ALL SELECT r.run_id,r.parent_run_id FROM execution_runs r JOIN ancestors a ON r.run_id=a.parent_run_id
	) SELECT r.run_id,r.usage_json FROM execution_runs r JOIN ancestors a ON a.run_id=r.run_id WHERE r.status IN('succeeded','failed','canceled')`, runID)
	if err != nil {
		return err
	}
	type projection struct{ id, old string }
	var projections []projection
	for rows.Next() {
		var p projection
		if err = rows.Scan(&p.id, &p.old); err != nil {
			_ = rows.Close()
			return err
		}
		projections = append(projections, p)
	}
	err = rows.Err()
	_ = rows.Close()
	if err != nil {
		return err
	}
	for _, p := range projections {
		u, err := s.UsageInTx(ctx, tx, p.id)
		if err != nil {
			return err
		}
		if u == nil || encode(u) == p.old {
			continue
		}
		if _, err = tx.ExecContext(ctx, "UPDATE execution_runs SET usage_json=?,revision=revision+1 WHERE run_id=?", encode(u), p.id); err != nil {
			return err
		}
		if err = execution.AddEventInTx(ctx, tx, p.id, "usage.settled", map[string]any{"usage": u}); err != nil {
			return err
		}
	}
	return nil
}
