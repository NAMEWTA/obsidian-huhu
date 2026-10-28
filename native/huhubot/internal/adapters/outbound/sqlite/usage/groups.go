package usage

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// An orchestration root combines application status, never member text or a
// fictitious coordinator model context. Each direct member publishes separately.
func (s *Store) readyGroupInTx(ctx context.Context, tx *sql.Tx, run string) (string, *api.EngineResult, error) {
	value, e := s.groupResultInTx(ctx, tx, run)
	if e != nil {
		return "", nil, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE collaboration_parent_results SET state='claimed' WHERE run_id=? AND state='waiting'", run); e != nil {
		return "", nil, e
	}
	if _, e = tx.ExecContext(ctx, "DELETE FROM collaboration_wait_edges WHERE from_run_id=?", run); e != nil {
		return "", nil, e
	}
	return run, &value, nil
}

// groupResultInTx is the same status-only projection for normal completion and
// legacy recovery inspection. Reading it does not claim or consume anything.
func (s *Store) groupResultInTx(ctx context.Context, tx *sql.Tx, run string) (api.EngineResult, error) {
	result := api.EngineResult{Status: "finished", Children: []api.TaskOutcome{}}
	rows, e := tx.QueryContext(ctx, "SELECT r.run_id,r.status,r.reason,r.effects_unresolved,r.usage_json,COALESCE(d.partial,0) FROM execution_runs r LEFT JOIN collaboration_result_deliveries d ON d.child_run_id=r.run_id LEFT JOIN group_publications p ON p.child_run_id=r.run_id WHERE r.parent_run_id=? ORDER BY COALESCE(p.public_seq,9223372036854775807),r.created_at,r.run_id", run)
	if e != nil {
		return result, e
	}
	for rows.Next() {
		var child api.TaskOutcome
		var usage string
		if e = rows.Scan(&child.RunID, &child.Status, &child.Reason, &child.EffectsUnresolved, &usage, &child.Partial); e != nil {
			rows.Close()
			return result, e
		}
		if !terminal(child.Status) {
			rows.Close()
			return result, fail("CONFLICT", "GROUP_CHILD_NOT_TERMINAL")
		}
		if usage != "" {
			child.Usage = &api.RunUsage{}
			if json.Unmarshal([]byte(usage), child.Usage) != nil {
				rows.Close()
				return result, fail("CONFLICT", "RUN_USAGE_INVALID")
			}
		}
		if child.Status != "succeeded" || child.Partial || child.EffectsUnresolved {
			result.Partial = true
			result.Reason = "CHILD_PARTIAL_FAILURE"
		}
		result.Children = append(result.Children, child)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return result, e
	}
	if len(result.Children) == 0 || len(result.Children) > 32 {
		return result, fail("CONFLICT", "GROUP_CHILDREN_INVALID")
	}
	return result, nil
}

// CurrentConsumerInTx validates an actual bound reader without confusing the
// effect continuation gate with task cancellation or granting a new model call.
func (s *Store) CurrentConsumerInTx(ctx context.Context, tx *sql.Tx, x api.ToolExecution) (api.RunAccessInput, error) {
	_, in, e := s.current(ctx, tx, x, false)
	return in, e
}
