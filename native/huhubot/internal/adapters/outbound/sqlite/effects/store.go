package effects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	assistant "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	execution "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"sync/atomic"
	"time"
)

type Guard interface {
	CheckInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, []string) error
}
type Store struct {
	stopping  atomic.Bool
	recovery  RecoveryGuard
	waits     WaitPolicy
	cancelRun func(string)
	base      *base.Store
	config    *assistant.Store
	guard     Guard
}

func New(b *base.Store, c *assistant.Store, g Guard) *Store {
	return &Store{base: b, config: c, guard: g}
}
func fail(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func encoded(v any) string           { b, _ := json.Marshal(v); return string(b) }
func (s *Store) check(ctx context.Context, tx *sql.Tx, x api.ToolExecution) (api.RunAccessInput, error) {
	if s.stopping.Load() {
		return api.RunAccessInput{}, api.Denied("SERVICE_STOPPING")
	}
	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, x.Run.ID); e != nil {
			return api.RunAccessInput{}, e
		}
	}
	_, in, e := execution.ReadInTx(ctx, tx, x.Identity, api.IDQuery{ProfileID: x.Access.ProfileID, ID: x.Run.ID})
	if e != nil {
		return in, e
	}
	var status, claim string
	var canceled int64
	if e = tx.QueryRowContext(ctx, "SELECT status,claim_token,cancel_epoch FROM execution_runs WHERE run_id=?", x.Run.ID).Scan(&status, &claim, &canceled); e != nil {
		return in, e
	}
	if (status != "preparing" && status != "running") || claim != x.ClaimToken || canceled != 0 {
		return in, fail("CONFLICT", "RUN_CLAIM_CHANGED")
	}
	return in, nil
}
func loadEffect(ctx context.Context, tx *sql.Tx, run, call string) (broker.Effect, string, error) {
	var out broker.Effect
	var preview, lease, receipt, hash string
	e := tx.QueryRowContext(ctx, "SELECT effect_id,suspension_token,state,reason,preview_json,lease_json,receipt_json,input_hash,run_id,command_epoch,(SELECT profile_id FROM profile_metadata WHERE singleton=1),COALESCE((SELECT approval_id FROM access_approvals a WHERE a.effect_id=execution_effects.effect_id),''),COALESCE((SELECT CAST(revision AS TEXT) FROM access_approvals a WHERE a.effect_id=execution_effects.effect_id),''),COALESCE((SELECT expires_at FROM access_approvals a WHERE a.effect_id=execution_effects.effect_id),'') FROM execution_effects WHERE run_id=? AND tool_call_id=?", run, call).Scan(&out.ID, &out.Token, &out.State, &out.Reason, &preview, &lease, &receipt, &hash, &out.RunID, &out.CommandEpoch, &out.ProfileID, &out.ApprovalID, &out.ApprovalRevision, &out.ExpiresAt)
	if e != nil {
		return out, "", e
	}
	if json.Unmarshal([]byte(preview), &out.Preview) != nil || json.Unmarshal([]byte(lease), &out.Lease) != nil {
		return out, "", fail("CONFLICT", "EFFECT_STATE_INVALID")
	}
	if receipt != "" {
		var saved *api.HostReceipt
		if json.Unmarshal([]byte(receipt), &saved) != nil {
			return out, "", fail("CONFLICT", "EFFECT_STATE_INVALID")
		}
		// Schema5 could store a zero-value receipt after an unsuccessful Host
		// call. It contains no evidence; read it as absent, without changing
		// the effect's unknown outcome or inventing a completion identity.
		if saved != nil && *saved != (api.HostReceipt{}) {
			if saved.EffectID != out.ID {
				return out, "", fail("CONFLICT", "EFFECT_STATE_INVALID")
			}
			switch saved.Status {
			case "committed", "reconciled", "failed_no_effect", "unknown_outcome", "rejected":
				out.Receipt = saved
			default:
				return out, "", fail("CONFLICT", "EFFECT_STATE_INVALID")
			}
		}
	}
	return out, hash, nil
}
func (s *Store) Reserve(ctx context.Context, x api.ToolExecution, c api.ToolCall, p api.ApprovalPreview, l api.HostLease, hash string) (broker.Effect, error) {
	var out broker.Effect
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		in, e := s.check(ctx, tx, x)
		if e != nil {
			return e
		}
		old, oldHash, e := loadEffect(ctx, tx, x.Run.ID, c.ID)
		if e == nil {
			if oldHash != hash {
				return fail("IDEMPOTENCY_CONFLICT", "TOOL_INPUT_MISMATCH")
			}
			out = old
			return nil
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		if s.guard != nil {
			if e = s.guard.CheckInTx(ctx, tx, x.Identity, in, []string{"read", "send"}); e != nil {
				return e
			}
		}
		var closed, count int
		if e = tx.QueryRowContext(ctx, "SELECT admission_closed FROM execution_runs WHERE run_id=?", x.Run.ID).Scan(&closed); e != nil {
			return e
		}
		if closed != 0 {
			return fail("CAPABILITY_DENIED", "EFFECT_ADMISSION_CLOSED")
		}
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE run_id=?", x.Run.ID).Scan(&count); e != nil {
			return e
		}
		if count >= 64 {
			return fail("RESOURCE_LIMIT", "EFFECT_LIMIT")
		}
		var epoch string
		if e = tx.QueryRowContext(ctx, "SELECT CAST(command_epoch AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&epoch); e != nil {
			return e
		}
		out = broker.Effect{ID: api.NewID("effect:"), Token: api.NewID("suspend:"), State: "prepared", Preview: p, Lease: l}
		if _, e = tx.ExecContext(ctx, "INSERT INTO execution_effects(effect_id,run_id,tool_call_id,principal_id,command_epoch,input_hash,suspension_token,preview_json,lease_json,state) VALUES(?,?,?,?,?,?,?,?,?,'prepared')", out.ID, x.Run.ID, c.ID, x.Identity.PrincipalID(), epoch, hash, out.Token, encoded(p), encoded(l)); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET admission_closed=1 WHERE run_id=?", x.Run.ID); e != nil {
			return e
		}
		return execution.AddEventInTx(ctx, tx, x.Run.ID, "effect.prepared", map[string]string{"effectId": out.ID, "status": "prepared"})
	})
	return out, e
}
func (s *Store) Publish(ctx context.Context, x api.ToolExecution, token string, a api.CheckpointArtifact, expires time.Time) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := s.check(ctx, tx, x)
		if e != nil {
			return e
		}
		var effectID, state string
		if e = tx.QueryRowContext(ctx, "SELECT effect_id,state FROM execution_effects WHERE run_id=? AND suspension_token=?", x.Run.ID, token).Scan(&effectID, &state); e != nil || state != "prepared" {
			return fail("CONFLICT", "SUSPENSION_NOT_PREPARED")
		}
		if a.RunID != x.Run.ID || a.AttemptID != x.ClaimToken {
			return fail("RECOVERY_BLOCKED", "CHECKPOINT_OWNERSHIP_MISMATCH")
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO execution_checkpoints VALUES(?,?,?)", a.Ref, x.Run.ID, encoded(a)); e != nil {
			return e
		}
		id := api.NewID("approval:")
		if _, e = tx.ExecContext(ctx, "INSERT INTO access_approvals VALUES(?,?,?,?,1,?,'pending',?)", id, effectID, x.Run.ID, x.Identity.PrincipalID(), expires.UTC().Format(api.TimestampLayout), a.Ref); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_effects SET state='awaiting_approval' WHERE effect_id=?", effectID); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET status='waiting_approval',revision=revision+1,claim_token='',checkpoint_ref=? WHERE run_id=?", a.Ref, x.Run.ID); e != nil {
			return e
		}
		if e = execution.AddEventInTx(ctx, tx, x.Run.ID, "approval.pending", map[string]string{"approvalId": id, "effectId": effectID, "status": "pending"}); e != nil {
			return e
		}
		return execution.AddEventInTx(ctx, tx, x.Run.ID, "waiting_approval", map[string]string{"status": "waiting_approval"})
	})
}
func (s *Store) Referenced(ctx context.Context, ref string) (bool, error) {
	var n int
	e := s.base.Database().QueryRowContext(ctx, "SELECT count(*) FROM execution_checkpoints WHERE ref=?", ref).Scan(&n)
	return n > 0, e
}
func (s *Store) ContinuationEffect(ctx context.Context, x api.ToolExecution, c api.RunContinuation) (broker.Effect, error) {
	var out broker.Effect
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := s.check(ctx, tx, x); e != nil {
			return e
		}
		var call, state, claim string
		if e := tx.QueryRowContext(ctx, "SELECT e.tool_call_id,c.state,c.claim_token FROM execution_effects e JOIN execution_continuations c ON c.effect_id=e.effect_id WHERE c.run_id=? AND c.effect_id=? AND c.approval_id=? AND CAST(c.generation AS TEXT)=?", x.Run.ID, c.EffectID, c.ApprovalID, c.Generation).Scan(&call, &state, &claim); e != nil {
			return e
		}
		if state != "claimed" || claim != x.ClaimToken {
			return fail("CONFLICT", "CONTINUATION_CLAIM_CHANGED")
		}
		var e error
		out, _, e = loadEffect(ctx, tx, x.Run.ID, call)
		return e
	})
	return out, e
}

// ClaimDispatch is the durability barrier (ADR-027) before a Host effect: the
// dispatching state is flushed before the Host may act, so after a power
// failure recovery still sees the effect as unresolved (dispatching or
// unknown_outcome) and never re-dispatches it as if it had not happened.
func (s *Store) ClaimDispatch(ctx context.Context, x api.ToolExecution, effect broker.Effect) error {
	return s.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		in, e := s.check(ctx, tx, x)
		if e != nil {
			return e
		}
		if s.guard != nil {
			if e = s.guard.CheckInTx(ctx, tx, x.Identity, in, []string{"read", "send"}); e != nil {
				return e
			}
		}
		var status, preview string
		var expiration string
		if e = tx.QueryRowContext(ctx, "SELECT a.status,a.expires_at,e.preview_json FROM access_approvals a JOIN execution_effects e ON a.effect_id=e.effect_id WHERE e.effect_id=? AND e.run_id=? AND e.state='prepared'", effect.ID, x.Run.ID).Scan(&status, &expiration, &preview); e != nil {
			return fail("CONFLICT", "EFFECT_NOT_DISPATCHABLE")
		}
		if status != "approved" || preview != encoded(effect.Preview) {
			return fail("CAPABILITY_DENIED", "APPROVAL_BINDING_CHANGED")
		}
		deadline, parseErr := time.Parse(time.RFC3339Nano, expiration)
		if parseErr != nil {
			return parseErr
		}
		if !time.Now().Before(deadline) {
			return fail("APPROVAL_EXPIRED", "APPROVAL_EXPIRED")
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_effects SET state='dispatching' WHERE effect_id=? AND state='prepared'", effect.ID); e != nil {
			return e
		}
		return execution.AddEventInTx(ctx, tx, x.Run.ID, "effect.dispatching", map[string]string{"effectId": effect.ID, "status": "dispatching"})
	})
}
func (s *Store) CompleteEffect(ctx context.Context, x api.ToolExecution, id, state, reason string, receipt *api.HostReceipt) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if state != "committed" && state != "failed_no_effect" && state != "unknown_outcome" {
			return api.Invalid("INVALID_EFFECT_RESULT")
		}
		var old string
		if e := tx.QueryRowContext(ctx, "SELECT state FROM execution_effects WHERE effect_id=? AND run_id=?", id, x.Run.ID).Scan(&old); e != nil {
			return e
		}
		if old == "committed" || old == "reconciled" {
			return nil
		}
		if state == "committed" && old != "dispatching" && old != "unknown_outcome" {
			return fail("CONFLICT", "EFFECT_STATE_CHANGED")
		}
		unknownSettlement := state == "unknown_outcome" && (old == "dispatching" || old == "unknown_outcome")
		if unknownSettlement {
			// This records an already-admitted producer's uncertainty. Stopping,
			// cancellation or revocation must block new dispatch, not suppress
			// its actual outcome. Keep the original owner and claim binding.
			var principal, claim string
			if e := tx.QueryRowContext(ctx, "SELECT principal_id,claim_token FROM execution_runs WHERE run_id=?", x.Run.ID).Scan(&principal, &claim); e != nil {
				return e
			}
			if !x.Identity.Valid() || principal != x.Identity.PrincipalID() || claim != x.ClaimToken {
				return fail("CONFLICT", "RUN_CLAIM_CHANGED")
			}
		}
		if state != "committed" && !unknownSettlement && !(state == "failed_no_effect" && (old == "dispatching" || old == "unknown_outcome") && receipt != nil && receipt.EffectID == id && receipt.Status == "failed_no_effect") {
			if _, e := s.check(ctx, tx, x); e != nil {
				return e
			}
		}
		body := ""
		if receipt != nil {
			body = encoded(receipt)
		}
		if _, e := tx.ExecContext(ctx, "UPDATE execution_effects SET state=?,reason=?,receipt_json=? WHERE effect_id=?", state, reason, body, id); e != nil {
			return e
		}
		if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET effects_unresolved=EXISTS(SELECT 1 FROM execution_effects WHERE run_id=? AND state IN('dispatching','unknown_outcome')) WHERE run_id=?", x.Run.ID, x.Run.ID); e != nil {
			return e
		}
		return execution.AddEventInTx(ctx, tx, x.Run.ID, "effect."+state, map[string]string{"effectId": id, "status": state, "reason": reason})
	})
}
func (s *Store) CompleteContinuation(ctx context.Context, x api.ToolExecution, c api.RunContinuation) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := s.check(ctx, tx, x); e != nil {
			return e
		}
		var state string
		if e := tx.QueryRowContext(ctx, "SELECT state FROM execution_effects WHERE effect_id=?", c.EffectID).Scan(&state); e != nil {
			return e
		}
		if _, e := tx.ExecContext(ctx, "UPDATE execution_continuations SET state='completed' WHERE effect_id=? AND claim_token=? AND state='claimed'", c.EffectID, x.ClaimToken); e != nil {
			return e
		}
		if state != "dispatching" && state != "unknown_outcome" {
			_, e := tx.ExecContext(ctx, "UPDATE execution_runs SET admission_closed=0 WHERE run_id=?", x.Run.ID)
			return e
		}
		return nil
	})
}

var _ broker.Repository = (*Store)(nil)
var _ = conv.Fault

func (s *Store) Find(ctx context.Context, x api.ToolExecution, c api.ToolCall, hash string) (broker.Effect, bool, error) {
	var out broker.Effect
	found := false
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := s.check(ctx, tx, x); e != nil {
			return e
		}
		old, oldHash, e := loadEffect(ctx, tx, x.Run.ID, c.ID)
		if errors.Is(e, sql.ErrNoRows) {
			return nil
		}
		if e != nil {
			return e
		}
		if oldHash != hash {
			return fail("IDEMPOTENCY_CONFLICT", "TOOL_INPUT_MISMATCH")
		}
		out = old
		found = true
		return nil
	})
	return out, found, e
}

func (s *Store) SetCancelCallback(cancel func(string)) { s.cancelRun = cancel }
