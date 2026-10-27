// Package recovery owns the durable recovery-tree and process admission fences.
// It shares the Profile transaction with the original executor and ledgers.
package recovery

import (
	"context"
	"database/sql"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// CheckInTx must run in the caller's actual mutation/claim transaction. A ready
// inspection is deliberately still a closed gate: only the user's successful
// runs.resume transaction changes it to resuming. An empty run checks only the
// process fence, as needed before a new root exists.
func CheckInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	var runtime string
	if e := tx.QueryRowContext(ctx, "SELECT state FROM execution_recovery_runtime WHERE singleton=1").Scan(&runtime); e != nil {
		return e
	}
	if runtime != "open" {
		if runtime == "stopping" {
			return api.Denied("SERVICE_STOPPING")
		}
		return &api.Fault{Kind: "CONFLICT", Reason: "RECOVERY_RUNTIME_INVALID"}
	}
	if runID == "" {
		return nil
	}
	var root string
	if e := tx.QueryRowContext(ctx, "SELECT COALESCE(NULLIF(root_run_id,''),run_id) FROM execution_runs WHERE run_id=?", runID).Scan(&root); e != nil {
		return e
	}
	var state string
	e := tx.QueryRowContext(ctx, "SELECT state FROM execution_recovery_trees WHERE root_run_id=?", root).Scan(&state)
	if errors.Is(e, sql.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	switch state {
	case "resuming":
		return nil
	case "checking", "ready", "blocked":
		return api.Denied("RECOVERY_REQUIRED")
	default:
		return &api.Fault{Kind: "CONFLICT", Reason: "RECOVERY_STATE_INVALID"}
	}
}
