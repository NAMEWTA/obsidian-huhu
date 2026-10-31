package effects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	execution "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/approvals"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"strconv"
	"time"
)

func readApproval(ctx context.Context, tx *sql.Tx, id string) (api.Approval, string, error) {
	var a api.Approval
	var principal, preview string
	e := tx.QueryRowContext(ctx, "SELECT a.approval_id,CAST(a.revision AS TEXT),a.run_id,a.effect_id,a.expires_at,a.status,a.principal_id,e.preview_json FROM access_approvals a JOIN execution_effects e ON e.effect_id=a.effect_id WHERE a.approval_id=?", id).Scan(&a.ID, &a.Revision, &a.RunID, &a.EffectID, &a.ExpiresAt, &a.Status, &principal, &preview)
	if errors.Is(e, sql.ErrNoRows) {
		return a, "", fail("NOT_FOUND", "APPROVAL_NOT_FOUND")
	}
	if e != nil {
		return a, "", e
	}
	if json.Unmarshal([]byte(preview), &a.Preview) != nil {
		return a, "", fail("CONFLICT", "APPROVAL_STATE_INVALID")
	}
	return a, principal, nil
}
func (s *Store) readable(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, run string) error {
	_, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: run})
	if e != nil {
		return e
	}
	if s.guard != nil {
		return s.guard.CheckInTx(ctx, tx, id, in, []string{"read"})
	}
	return nil
}
func (s *Store) Get(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Approval, error) {
	var a api.Approval
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		var principal string
		var e error
		a, principal, e = readApproval(ctx, tx, q.ID)
		if e != nil {
			return e
		}
		if principal != id.PrincipalID() {
			return api.Denied("APPROVAL_PRINCIPAL_MISMATCH")
		}
		return s.readable(ctx, tx, id, q.ProfileID, a.RunID)
	})
	return a, e
}
func (s *Store) List(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.ApprovalPage, error) {
	out := api.ApprovalPage{Items: []api.Approval{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Metadata(ctx, tx, q.ProfileID); e != nil {
			return e
		}
		limit, e := conv.Limit(q.Limit)
		if e != nil {
			return e
		}
		rows, e := tx.QueryContext(ctx, "SELECT approval_id FROM access_approvals WHERE principal_id=? AND approval_id>? ORDER BY approval_id LIMIT ?", id.PrincipalID(), q.Cursor, limit+1)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var v string
			if e = rows.Scan(&v); e != nil {
				_ = rows.Close()
				return e
			}
			ids = append(ids, v)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		budget := 0
		previous := q.Cursor
		for i, key := range ids {
			if i == limit {
				out.NextCursor = previous
				break
			}
			a, _, e := readApproval(ctx, tx, key)
			if e != nil {
				return e
			}
			if e = s.readable(ctx, tx, id, q.ProfileID, a.RunID); e != nil {
				var f *api.Fault
				if errors.As(e, &f) && f.Kind == "CAPABILITY_DENIED" {
					previous = key
					continue
				}
				return e
			}
			b, _ := json.Marshal(a)
			if len(b) > 524288 && len(out.Items) == 0 {
				return fail("RESOURCE_LIMIT", "APPROVAL_PREVIEW_TOO_LARGE")
			}
			if budget+len(b) > 524288 {
				out.NextCursor = previous
				break
			}
			budget += len(b)
			out.Items = append(out.Items, a)
			previous = key
		}
		return nil
	})
	return out, e
}
func decide(ctx context.Context, tx *sql.Tx, a api.Approval, status string) error {
	if _, e := tx.ExecContext(ctx, "UPDATE access_approvals SET status=?,revision=revision+1 WHERE approval_id=? AND status='pending'", status, a.ID); e != nil {
		return e
	}
	effectState, reason := "rejected", "APPROVAL_"+status
	if status == "approved" {
		effectState, reason = "prepared", ""
	}
	if _, e := tx.ExecContext(ctx, "UPDATE execution_effects SET state=?,reason=? WHERE effect_id=? AND state='awaiting_approval'", effectState, reason, a.EffectID); e != nil {
		return e
	}
	if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET resume_generation=resume_generation+1,revision=revision+1 WHERE run_id=?", a.RunID); e != nil {
		return e
	}
	if _, e := tx.ExecContext(ctx, "INSERT INTO execution_continuations(effect_id,approval_id,run_id,decision,generation,state,checkpoint_ref) SELECT effect_id,approval_id,run_id,?,(SELECT resume_generation FROM execution_runs WHERE run_id=a.run_id),'pending',checkpoint_ref FROM access_approvals a WHERE approval_id=?", status, a.ID); e != nil {
		return e
	}
	return execution.AddEventInTx(ctx, tx, a.RunID, "approval."+status, map[string]string{"approvalId": a.ID, "effectId": a.EffectID, "status": status})
}
func (s *Store) Resolve(ctx context.Context, id api.RequestIdentity, c api.ApprovalResolve, hash string, now time.Time) (api.Approval, error) {
	var out api.Approval
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "approvals.resolve", hash, &out)
		if e != nil {
			return e
		}
		if found {
			return s.readable(ctx, tx, id, c.ProfileID, out.RunID)
		}
		a, principal, e := readApproval(ctx, tx, c.ID)
		if e != nil {
			return e
		}
		if principal != id.PrincipalID() {
			return api.Denied("APPROVAL_PRINCIPAL_MISMATCH")
		}
		if e = s.readable(ctx, tx, id, c.ProfileID, a.RunID); e != nil {
			return e
		}
		if a.Status != "pending" || a.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "APPROVAL_REVISION_CONFLICT")
		}
		if c.EffectID != a.EffectID || c.PreviewHash != a.Preview.PreviewHash {
			return fail("CONFLICT", "APPROVAL_PREVIEW_CHANGED")
		}
		var state string
		var cancel int
		if e = tx.QueryRowContext(ctx, "SELECT status,cancel_epoch FROM execution_runs WHERE run_id=?", a.RunID).Scan(&state, &cancel); e != nil {
			return e
		}
		if state != "waiting_approval" || cancel != 0 {
			return fail("CONFLICT", "RUN_NOT_WAITING_APPROVAL")
		}
		expires, e := time.Parse(time.RFC3339Nano, a.ExpiresAt)
		if e != nil {
			return e
		}
		status := "approved"
		if c.Decision == "reject" {
			status = "rejected"
		}
		if !now.Before(expires) {
			status = "expired"
		}
		if e = decide(ctx, tx, a, status); e != nil {
			return e
		}
		out, _, e = readApproval(ctx, tx, a.ID)
		if e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "approvals.resolve", hash, "", out)
	})
	return out, e
}
func (s *Store) Cancel(ctx context.Context, id api.RequestIdentity, c api.RunCancel, hash string) (api.RunReceipt, error) {
	var out api.RunReceipt
	var canceled []string
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "runs.cancel", hash, &out)
		if e != nil {
			return e
		}
		if found {
			return nil
		}
		r, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: c.ProfileID, ID: c.ID})
		if e != nil {
			return e
		}
		if r.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if r.Status == "succeeded" || r.Status == "failed" || r.Status == "canceled" {
			return fail("RUN_TERMINAL", "RUN_TERMINAL")
		}
		if canceled, e = s.CancelSubtreeInTx(ctx, tx, id, c.ProfileID, r.ID); e != nil {
			return e
		}
		revision, _ := strconv.ParseInt(r.Revision, 10, 64)
		out = api.RunReceipt{Receipt: api.Receipt{CommandID: c.CommandID, ReceiptID: api.NewID("receipt:"), Revision: strconv.FormatInt(revision+1, 10)}, RunID: r.ID, Status: "canceled"}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "runs.cancel", hash, r.AgentID, out)
	})
	if e == nil && s.cancelRun != nil {
		for _, runID := range canceled {
			s.cancelRun(runID)
		}
	}
	return out, e
}

var _ app.Repository = (*Store)(nil)

// CancelSubtreeInTx closes descendant admission in the same serialized UoW as
// all durable cancellation facts. Context cancellation happens only after commit.
func (s *Store) CancelSubtreeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, runID string) ([]string, error) {
	if _, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profileID, ID: runID}); e != nil {
		return nil, e
	}
	rows, e := tx.QueryContext(ctx, "WITH RECURSIVE tree(run_id) AS (SELECT run_id FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id FROM execution_runs r JOIN tree t ON r.parent_run_id=t.run_id) SELECT run_id FROM tree LIMIT 34", runID)
	if e != nil {
		return nil, e
	}
	ids := []string{}
	for rows.Next() {
		var key string
		if e = rows.Scan(&key); e != nil {
			break
		}
		ids = append(ids, key)
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
	if len(ids) > 33 {
		return nil, fail("RESOURCE_LIMIT", "CALL_TREE_LIMIT")
	}
	affected := []string{}
	for _, key := range ids {
		r, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profileID, ID: key})
		if e != nil {
			return nil, e
		}
		if r.Status == "succeeded" || r.Status == "failed" || r.Status == "canceled" {
			continue
		}
		if e = s.cancelOneInTx(ctx, tx, r); e != nil {
			return nil, e
		}
		affected = append(affected, key)
	}
	return affected, nil
}
func (s *Store) cancelOneInTx(ctx context.Context, tx *sql.Tx, r api.Run) error {
	var e error
	if _, e = tx.ExecContext(ctx, "UPDATE execution_effects SET state=CASE WHEN state='dispatching' THEN 'unknown_outcome' ELSE 'rejected' END,reason='RUN_CANCELED' WHERE run_id=? AND state IN('prepared','awaiting_approval','dispatching')", r.ID); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE access_approvals SET status='canceled',revision=revision+1 WHERE run_id=? AND status='pending'", r.ID); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_continuations SET state='canceled' WHERE run_id=? AND state IN('pending','claimed')", r.ID); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET status='canceled',revision=revision+1,cancel_epoch=cancel_epoch+1,admission_closed=1,task_admission_closed=1,claim_token='',reason='RUN_CANCELED',effects_unresolved=EXISTS(SELECT 1 FROM execution_effects WHERE run_id=? AND state='unknown_outcome') WHERE run_id=?", r.ID, r.ID); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE conversation_sessions SET active_run_id=NULL,revision=revision+1 WHERE session_id=? AND active_run_id=?", r.SessionID, r.ID); e != nil {
		return e
	}
	var pin sql.NullString
	var unresolved, active int
	if e = tx.QueryRowContext(ctx, "SELECT pin_token,effects_unresolved FROM execution_runs WHERE run_id=?", r.ID).Scan(&pin, &unresolved); e != nil {
		return e
	}
	if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM model_attempts WHERE run_id=? AND state='dispatched' AND producer_ended=0", r.ID).Scan(&active); e != nil {
		return e
	}
	retain := unresolved != 0 || active != 0 || r.Status == "running" || r.Status == "preparing"
	if pin.Valid && !retain {
		if e = s.config.ReleaseInTx(ctx, tx, pin.String); e != nil {
			return e
		}
	}
	if e = s.config.ReleaseTaskInTx(ctx, tx, r.ID, retain); e != nil {
		return e
	}

	if e = execution.AddEventInTx(ctx, tx, r.ID, "canceled", map[string]string{"status": "canceled", "reason": "RUN_CANCELED"}); e != nil {
		return e
	}
	// The tree policy owns the one durable task-result ledger. Observe the
	// already-canceled Run in this transaction; do not synthesize a successful
	// Finalize or release an outstanding physical producer here.
	if outcomes, ok := s.waits.(interface {
		CanceledInTx(context.Context, *sql.Tx, string) error
	}); ok {
		return outcomes.CanceledInTx(ctx, tx, r.ID)
	}
	if r.ParentRunID != "" {
		return api.Denied("TASK_RESULT_NOT_ASSEMBLED")
	}
	return nil
}
