package effects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"time"
)

func (s *Store) ExpireInTx(ctx context.Context, tx *sql.Tx) error {
	rows, e := tx.QueryContext(ctx, "SELECT a.approval_id,a.expires_at FROM access_approvals a JOIN execution_runs r ON r.run_id=a.run_id WHERE a.status='pending' AND r.status='waiting_approval' AND r.cancel_epoch=0 ORDER BY a.expires_at LIMIT 32")
	if e != nil {
		return e
	}
	ids := []string{}
	now := time.Now()
	for rows.Next() {
		var id, expiry string
		if e = rows.Scan(&id, &expiry); e != nil {
			_ = rows.Close()
			return e
		}
		deadline, err := time.Parse(time.RFC3339Nano, expiry)
		if err != nil {
			_ = rows.Close()
			return err
		}
		if !now.Before(deadline) {
			ids = append(ids, id)
		}
	}
	e = rows.Err()
	_ = rows.Close()
	if e != nil {
		return e
	}
	for _, id := range ids {
		a, _, e := readApproval(ctx, tx, id)
		if e != nil {
			return e
		}
		if e = decide(ctx, tx, a, "expired"); e != nil {
			return e
		}
	}
	return nil
}

// ReadyInTx returns one bounded keyset page, without claiming a continuation or
// a child slot. Its sole consumer is execution.Claim, which checks each current
// recovery/slot gate before consuming the selected continuation in this tx.
func (s *Store) ReadyInTx(ctx context.Context, tx *sql.Tx, after string) ([]string, error) {
	rows, e := tx.QueryContext(ctx, "SELECT c.run_id FROM execution_continuations c JOIN execution_runs r ON r.run_id=c.run_id WHERE c.state='pending' AND r.status='waiting_approval' AND r.cancel_epoch=0 AND c.run_id>? ORDER BY c.run_id LIMIT 128", after)
	if e != nil {
		return nil, e
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if e = rows.Scan(&id); e != nil {
			break
		}
		ids = append(ids, id)
	}
	if e == nil {
		e = rows.Err()
	}
	ce := rows.Close()
	if e != nil {
		return nil, e
	}
	if ce != nil {
		return nil, ce
	}
	return ids, nil
}
func (s *Store) ClaimInTx(ctx context.Context, tx *sql.Tx, run, claim string) (*api.RunContinuation, error) {
	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, run); e != nil {
			return nil, e
		}
	}
	var c api.RunContinuation
	var artifact string
	e := tx.QueryRowContext(ctx, "SELECT c.approval_id,c.effect_id,c.decision,CAST(c.generation AS TEXT),p.artifact_json FROM execution_continuations c JOIN execution_checkpoints p ON p.ref=c.checkpoint_ref WHERE c.run_id=? AND c.state='pending'", run).Scan(&c.ApprovalID, &c.EffectID, &c.Decision, &c.Generation, &artifact)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	if json.Unmarshal([]byte(artifact), &c.Checkpoint) != nil {
		return nil, fail("RECOVERY_BLOCKED", "CHECKPOINT_STATE_INVALID")
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_continuations SET state='claimed',claim_token=? WHERE effect_id=? AND state='pending'", claim, c.EffectID); e != nil {
		return nil, e
	}
	return &c, nil
}
func (s *Store) FinalizeInTx(ctx context.Context, tx *sql.Tx, run string) (bool, error) {
	// A prepared effect which never acquired dispatch is known not to have run.
	if _, e := tx.ExecContext(ctx, "UPDATE execution_effects SET state='failed_no_effect',reason='RUN_FINISHED_BEFORE_DISPATCH' WHERE run_id=? AND state='prepared'", run); e != nil {
		return false, e
	}
	if _, e := tx.ExecContext(ctx, "UPDATE execution_continuations SET state='completed' WHERE run_id=? AND state='claimed'", run); e != nil {
		return false, e
	}
	var n int
	e := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE run_id=? AND state IN('dispatching','unknown_outcome','awaiting_approval')", run).Scan(&n)
	return n > 0, e
}

func (s *Store) BlockInTx(ctx context.Context, tx *sql.Tx, run string) error {
	_, e := tx.ExecContext(ctx, "UPDATE execution_continuations SET state='blocked' WHERE run_id=? AND state='claimed'", run)
	return e
}
