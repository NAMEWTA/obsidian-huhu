package effects

import (
	"context"
	"database/sql"
	"errors"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

func (s *Store) loadReconciliationInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.EffectQuery) (api.EffectView, api.EffectDispatch, error) {
	var v api.EffectView
	var d api.EffectDispatch
	var runID, call string
	e := tx.QueryRowContext(ctx, "SELECT run_id,tool_call_id FROM execution_effects WHERE effect_id=?", q.ID).Scan(&runID, &call)
	if errors.Is(e, sql.ErrNoRows) {
		return v, d, fail("NOT_FOUND", "EFFECT_NOT_FOUND")
	}
	if e != nil {
		return v, d, e
	}
	// EffectView is body-free owner metadata. The owner may still inspect or
	// reconcile an already dispatched effect after its model's membership or
	// source grant was revoked. ReadInTx retains the real Profile, Run and
	// Session ownership checks; Preview stays internal to QueryReceipt.
	run, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: runID})
	if e != nil {
		return v, d, e
	}
	effect, _, e := loadEffect(ctx, tx, runID, call)
	if e != nil {
		return v, d, e
	}
	v = api.EffectView{ID: effect.ID, RunID: runID, Revision: run.Revision, Status: effect.State, Reason: effect.Reason, Receipt: effect.Receipt}
	d = api.EffectDispatch{EffectID: effect.ID, RunID: runID, ProfileID: effect.ProfileID, CommandEpoch: effect.CommandEpoch, ApprovalID: effect.ApprovalID, ApprovalRevision: effect.ApprovalRevision, ExpiresAt: effect.ExpiresAt, Target: effect.Preview.Target, Tool: effect.Preview.Tool, Content: effect.Preview.Content, Preview: effect.Preview, Lease: effect.Lease}
	return v, d, nil
}
func (s *Store) LoadEffect(ctx context.Context, id api.RequestIdentity, q api.EffectQuery) (api.EffectView, api.EffectDispatch, error) {
	var v api.EffectView
	var d api.EffectDispatch
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; v, d, e = s.loadReconciliationInTx(ctx, tx, id, q); return e })
	return v, d, e
}
func (s *Store) SaveReconciliation(ctx context.Context, id api.RequestIdentity, c api.EffectReconcile, state, reason string, receipt *api.HostReceipt) (api.EffectView, error) {
	var out api.EffectView
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "effects.reconcile", commands.Hash(c), &out)
		if e != nil {
			return e
		}
		if found {
			_, _, e = s.loadReconciliationInTx(ctx, tx, id, api.EffectQuery{ProfileID: c.ProfileID, ID: c.ID})
			return e
		}
		old, _, e := s.loadReconciliationInTx(ctx, tx, id, api.EffectQuery{ProfileID: c.ProfileID, ID: c.ID})
		if e != nil {
			return e
		}
		if old.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if state != "committed" && state != "reconciled" && state != "unknown_outcome" && state != "failed_no_effect" && state != "rejected" {
			return api.Invalid("INVALID_EFFECT_RESULT")
		}
		if (old.Status == "committed" || old.Status == "reconciled" || old.Status == "rejected" || old.Status == "failed_no_effect") && state != old.Status {
			return fail("CONFLICT", "EFFECT_STATE_CHANGED")
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_effects SET state=?,reason=?,receipt_json=? WHERE effect_id=?", state, reason, receiptBody(receipt), c.ID); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET revision=revision+1,effects_unresolved=EXISTS(SELECT 1 FROM execution_effects WHERE run_id=? AND state IN('dispatching','unknown_outcome')) WHERE run_id=?", old.RunID, old.RunID); e != nil {
			return e
		}
		if e = execution.AddEventInTx(ctx, tx, old.RunID, "effect."+state, map[string]string{"effectId": c.ID, "status": state, "reason": reason}); e != nil {
			return e
		}
		cleanup := execution.New(s.base, s.config, nil)
		if e = cleanup.ReleaseTerminalPinsInTx(ctx, tx, old.RunID); e != nil {
			return e
		}

		out, _, e = s.loadReconciliationInTx(ctx, tx, id, api.EffectQuery{ProfileID: c.ProfileID, ID: c.ID})
		if e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "effects.reconcile", commands.Hash(c), "", out)
	})
	return out, e
}

func (s *Store) FindReconciliation(ctx context.Context, id api.RequestIdentity, c api.EffectReconcile) (api.EffectView, bool, error) {
	var out api.EffectView
	var found bool
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		var e error
		found, e = conv.Receipt(ctx, tx, id, c.CommandMeta, "effects.reconcile", commands.Hash(c), &out)
		if e != nil {
			return e
		}
		if found {
			_, _, e = s.loadReconciliationInTx(ctx, tx, id, api.EffectQuery{ProfileID: c.ProfileID, ID: c.ID})
		}
		return e
	})
	return out, found, e
}

func receiptBody(r *api.HostReceipt) string {
	if r == nil {
		return ""
	}
	return encoded(r)
}
