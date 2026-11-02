package recovery

import (
	"context"
	"database/sql"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	state "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/recovery"
)

func (s *Store) currentInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, snap snapshot) error {
	var unresolved int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects e JOIN execution_runs r ON r.run_id=e.run_id WHERE (r.root_run_id=? OR r.run_id=?) AND e.state IN('dispatching','unknown_outcome')", snap.status.RootRunID, snap.status.RootRunID).Scan(&unresolved); e != nil {
		return e
	}
	if unresolved != 0 {
		return fault("RECOVERY_BLOCKED", "EFFECT_RECONCILIATION_REQUIRED")
	}
	for _, v := range snap.items {
		if v.Run.Role == "orchestration" {
			continue
		}
		if s.checker == nil {
			return fault("RECOVERY_BLOCKED", "ACCESS_NOT_ASSEMBLED")
		}
		if e := s.checker.CheckInTx(ctx, tx, id, v.Access, []string{"read", "send"}); e != nil {
			return e
		}
		if v.Config.Agent.Model != nil && v.Config.Agent.Model.CredentialRef != "" {
			var available int
			if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM credential_metadata WHERE credential_ref=? AND profile_id=? AND state='available' AND deleting=0", v.Config.Agent.Model.CredentialRef, v.Access.ProfileID).Scan(&available); e != nil {
				return e
			}
			if available != 1 {
				return fault("MODEL_UNAVAILABLE", "CREDENTIAL_MISSING")
			}
		}
	}
	return nil
}

func (s *Store) Get(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.RecoveryStatus, error) {
	var before snapshot
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; before, e = s.captureInTx(ctx, tx, id, q); return e })
	if e != nil {
		return api.RecoveryStatus{}, e
	}
	if before.status.State == "none" || before.status.State == "resuming" {
		return before.status, nil
	}
	inspectionErr := s.inspect(ctx, id, before)
	if inspectionErr != nil {
		if _, known := refusal(inspectionErr); !known {
			return api.RecoveryStatus{}, inspectionErr
		}
	}
	var out api.RecoveryStatus
	e = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		after, e := s.captureInTx(ctx, tx, id, q)
		if e != nil {
			return e
		}
		if after.status.Generation != before.status.Generation || after.revision != before.revision {
			return fault("CONFLICT", "RECOVERY_TREE_CHANGED")
		}
		if inspectionErr == nil {
			inspectionErr = s.currentInTx(ctx, tx, id, after)
		}
		reason := ""
		next := "ready"
		if inspectionErr != nil {
			var known bool
			reason, known = refusal(inspectionErr)
			if !known {
				return inspectionErr
			}
			next = "blocked"
		}
		if after.status.TreeRevision != "" && (after.status.TreeRevision != after.revision || after.status.State != next || after.status.Reason != reason) {
			after.status.Generation, e = increment(after.status.Generation)
			if e != nil {
				return e
			}
		}
		after.status.State = next
		after.status.Reason = reason
		after.status.TreeRevision = after.revision
		after.status.CheckedAt = time.Now().UTC().Format(api.TimestampLayout)
		_, e = tx.ExecContext(ctx, "UPDATE execution_recovery_trees SET generation=?,state=?,tree_revision=?,affected_run_ids_json=?,reason=?,checked_at=? WHERE root_run_id=?", after.status.Generation, next, after.revision, encoded(after.status.AffectedRunIDs), reason, after.status.CheckedAt, after.status.RootRunID)
		out = after.status
		return e
	})
	return out, e
}

// Resume performs the same outside-transaction inspection again. A previously
// published ready response is evidence to compare, never permission to execute.
func (s *Store) Resume(ctx context.Context, id api.RequestIdentity, c api.RunResume) (api.RunReceipt, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.RunReceipt{}, e
	}
	if c.ID == "" || !commands.Positive(c.RecoveryGeneration) {
		return api.RunReceipt{}, api.Invalid("INVALID_RECOVERY_COMMAND")
	}
	q := api.IDQuery{ProfileID: c.ProfileID, ID: c.ID}
	hash := commands.Hash(c)
	var before snapshot
	var out api.RunReceipt
	replay := false
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		var e error
		replay, e = conv.Receipt(ctx, tx, id, c.CommandMeta, "runs.resume", hash, &out)
		if replay || e != nil {
			return e
		}
		before, e = s.captureInTx(ctx, tx, id, q)
		if e != nil {
			return e
		}
		return checkResume(before, c)
	})
	if e != nil || replay {
		return out, e
	}
	if e = s.inspect(ctx, id, before); e != nil {
		return api.RunReceipt{}, e
	}
	e = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "runs.resume", hash, &out)
		if found || e != nil {
			return e
		}
		after, e := s.captureInTx(ctx, tx, id, q)
		if e != nil {
			return e
		}
		if e = checkResume(after, c); e != nil {
			return e
		}
		if after.revision != before.revision || after.status.Generation != before.status.Generation {
			return fault("CONFLICT", "RECOVERY_TREE_CHANGED")
		}
		if e = s.currentInTx(ctx, tx, id, after); e != nil {
			return e
		}
		for _, run := range after.interrupted {
			var status string
			if e = tx.QueryRowContext(ctx, "SELECT status FROM execution_runs WHERE run_id=?", run).Scan(&status); e != nil {
				return e
			}
			if state.Terminal(status) {
				continue
			}
			if e = s.runs.ResumeInTx(ctx, tx, id, c.ProfileID, run); e != nil {
				return e
			}
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_recovery_trees SET state='resuming',reason='' WHERE root_run_id=? AND generation=?", after.status.RootRunID, after.status.Generation); e != nil {
			return e
		}
		r, _, e := execution.ReadInTx(ctx, tx, id, q)
		if e != nil {
			return e
		}
		out = api.RunReceipt{Receipt: api.Receipt{CommandID: c.CommandID, ReceiptID: api.NewID("receipt:"), Revision: r.Revision}, RunID: r.ID, Status: r.Status}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "runs.resume", hash, r.AgentID, out)
	})
	return out, e
}

func checkResume(s snapshot, c api.RunResume) error {
	if s.status.Revision != c.ExpectedRevision {
		return fault("CONFLICT", "REVISION_CONFLICT")
	}
	if s.status.State != "ready" {
		return fault("RECOVERY_BLOCKED", "RECOVERY_NOT_READY")
	}
	if s.status.Generation != c.RecoveryGeneration {
		return fault("CONFLICT", "RECOVERY_GENERATION_CONFLICT")
	}
	if s.revision != s.status.TreeRevision {
		return fault("CONFLICT", "RECOVERY_TREE_CHANGED")
	}
	if c.ID != s.status.RootRunID && !contains(s.status.AffectedRunIDs, c.ID) {
		return fault("RECOVERY_BLOCKED", "RECOVERY_SCOPE_MISMATCH")
	}
	return nil
}

var _ api.RecoveryAPI = (*Store)(nil)
