package effects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"

	execution "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
)

type RecoveryGuard interface {
	CheckInTx(context.Context, *sql.Tx, string) error
}

func (s *Store) StopAdmission()              { s.stopping.Store(true) }
func (s *Store) SetRecovery(g RecoveryGuard) { s.recovery = g }

func (s *Store) InspectCheckpointReference(ctx context.Context, q api.RecoveryInspection) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if q.Position.Continuation == nil {
			return fail("RECOVERY_BLOCKED", "CHECKPOINT_MISSING")
		}
		a := q.Position.Continuation.Checkpoint
		var profile, raw, principal string
		if e := tx.QueryRowContext(ctx, "SELECT profile_id FROM profile_metadata WHERE singleton=1").Scan(&profile); e != nil {
			return e
		}
		if profile != q.Access.ProfileID {
			return api.Denied("PROFILE_MISMATCH")
		}
		if e := tx.QueryRowContext(ctx, "SELECT principal_id FROM execution_runs WHERE run_id=?", q.Run.ID).Scan(&principal); e != nil {
			return e
		}
		_, _, e := execution.ReadInTx(ctx, tx, api.NewConnectionIdentity("recovery-inspection", principal, false), api.IDQuery{ProfileID: profile, ID: q.Run.ID})
		if e != nil {
			return e
		}
		if e = tx.QueryRowContext(ctx, "SELECT artifact_json FROM execution_checkpoints WHERE ref=? AND run_id=?", a.Ref, q.Run.ID).Scan(&raw); e != nil {
			if errors.Is(e, sql.ErrNoRows) {
				return fail("RECOVERY_BLOCKED", "CHECKPOINT_NOT_PUBLISHED")
			}
			return e
		}
		var actual api.CheckpointArtifact
		if json.Unmarshal([]byte(raw), &actual) != nil || actual != a {
			return fail("RECOVERY_BLOCKED", "CHECKPOINT_STATE_INVALID")
		}
		return nil
	})
}
func (s *Store) LegacyPositionInTx(ctx context.Context, tx *sql.Tx, runID string) (api.ExecutionPosition, error) {
	var p api.ExecutionPosition
	var c api.RunContinuation
	var raw, state string
	e := tx.QueryRowContext(ctx, "SELECT c.approval_id,c.effect_id,c.decision,CAST(c.generation AS TEXT),p.artifact_json,c.state FROM execution_continuations c JOIN execution_checkpoints p ON p.ref=c.checkpoint_ref WHERE c.run_id=? AND c.state IN('claimed','completed','blocked')", runID).Scan(&c.ApprovalID, &c.EffectID, &c.Decision, &c.Generation, &raw, &state)
	if errors.Is(e, sql.ErrNoRows) {
		return p, nil
	}
	if e != nil {
		return p, e
	}
	if json.Unmarshal([]byte(raw), &c.Checkpoint) != nil {
		return p, fail("RECOVERY_BLOCKED", "CHECKPOINT_STATE_INVALID")
	}
	p.Phase = "continuation"
	p.Continuation = &c
	if state == "completed" {
		var call string
		if e = tx.QueryRowContext(ctx, "SELECT tool_call_id FROM execution_effects WHERE effect_id=? AND run_id=?", c.EffectID, runID).Scan(&call); e != nil {
			return p, e
		}
		effect, _, e := loadEffect(ctx, tx, runID, call)
		if e != nil {
			return p, e
		}
		d := api.ToolResult{Status: "denied", EffectID: effect.ID, Reason: effect.Reason}
		if effect.State == "committed" || effect.State == "reconciled" {
			d.Status = "completed"
			d.Receipt = effect.Receipt
		}
		if effect.State == "unknown_outcome" || effect.State == "dispatching" {
			d.Reason = "EFFECT_REQUIRES_RECONCILIATION"
		}
		if c.Decision != "approved" {
			d = api.ToolResult{Status: "denied", EffectID: c.EffectID, Reason: "APPROVAL_REJECTED"}
			if c.Decision == "expired" {
				d.Reason = "APPROVAL_EXPIRED"
			}
		}
		p.Phase = "resume"
		p.Decision = &d
	}
	return p, nil
}
func (s *Store) RebindContinuationInTx(ctx context.Context, tx *sql.Tx, runID, claim string, p api.ExecutionPosition) error {
	if p.Continuation == nil {
		return fail("RECOVERY_BLOCKED", "CHECKPOINT_MISSING")
	}
	var c api.RunContinuation
	var raw, state string
	e := tx.QueryRowContext(ctx, "SELECT approval_id,effect_id,decision,CAST(generation AS TEXT),state FROM execution_continuations WHERE run_id=? AND effect_id=?", runID, p.Continuation.EffectID).Scan(&c.ApprovalID, &c.EffectID, &c.Decision, &c.Generation, &state)
	if e != nil {
		return e
	}
	if e = tx.QueryRowContext(ctx, "SELECT artifact_json FROM execution_checkpoints WHERE ref=? AND run_id=?", p.Continuation.Checkpoint.Ref, runID).Scan(&raw); e != nil {
		return e
	}
	if json.Unmarshal([]byte(raw), &c.Checkpoint) != nil || !reflect.DeepEqual(c, *p.Continuation) {
		return fail("RECOVERY_BLOCKED", "CHECKPOINT_STATE_INVALID")
	}
	if p.Phase == "resume" {
		if state != "completed" {
			return fail("RECOVERY_BLOCKED", "CONTINUATION_STATE_INVALID")
		}
		return nil
	}
	if state != "claimed" && state != "blocked" {
		return fail("RECOVERY_BLOCKED", "CONTINUATION_STATE_INVALID")
	}
	_, e = tx.ExecContext(ctx, "UPDATE execution_continuations SET state='claimed',claim_token=? WHERE effect_id=?", claim, c.EffectID)
	return e
}

// ReadInspectionEffect never grants a dispatch claim. It only exposes the
// existing continuation's trusted target to the pure recovery preflight.
func (s *Store) ReadInspectionEffect(ctx context.Context, q api.RecoveryInspection) (broker.Effect, error) {
	var out broker.Effect
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		c := q.Position.Continuation
		if c == nil {
			return fail("RECOVERY_BLOCKED", "CHECKPOINT_MISSING")
		}
		var call string
		if e := tx.QueryRowContext(ctx, "SELECT e.tool_call_id FROM execution_effects e JOIN execution_continuations c ON c.effect_id=e.effect_id WHERE c.run_id=? AND c.effect_id=? AND c.approval_id=? AND c.generation=? AND c.decision=?", q.Run.ID, c.EffectID, c.ApprovalID, c.Generation, c.Decision).Scan(&call); e != nil {
			return e
		}
		var e error
		out, _, e = loadEffect(ctx, tx, q.Run.ID, call)
		return e
	})
	return out, e
}
