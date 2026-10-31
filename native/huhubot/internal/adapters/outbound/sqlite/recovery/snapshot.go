package recovery

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	state "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/recovery"
)

func (s *Store) captureInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (snapshot, error) {
	out, e := s.statusInTx(ctx, tx, id, q)
	if e != nil || out.status.State == "none" || out.status.State == "resuming" {
		return out, e
	}
	if e = s.runtimeOpenInTx(ctx, tx); e != nil {
		return out, e
	}
	rows, e := tx.QueryContext(ctx, "SELECT run_id,status FROM execution_runs WHERE root_run_id=? OR run_id=? ORDER BY run_id", out.status.RootRunID, out.status.RootRunID)
	if e != nil {
		return out, e
	}
	type member struct{ id, status string }
	all := []member{}
	for rows.Next() {
		var m member
		if e = rows.Scan(&m.id, &m.status); e != nil {
			rows.Close()
			return out, e
		}
		all = append(all, m)
	}
	e = rows.Err()
	ce := rows.Close()
	if e != nil {
		return out, e
	}
	if ce != nil {
		return out, ce
	}
	if len(all) == 0 || len(all) > 33 {
		return out, fault("CONFLICT", "RECOVERY_TREE_INVALID")
	}
	seen := map[string]bool{}
	currentAffected := []string{}
	for _, m := range all {
		seen[m.id] = true
		if state.Terminal(m.status) {
			continue
		}
		currentAffected = append(currentAffected, m.id)
		inspection, e := s.runs.ReadRecoveryInTx(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: m.id})
		if e != nil {
			var f *api.Fault
			if !errors.As(e, &f) || (f.Kind != "RECOVERY_BLOCKED" && !memoryRefusal(f)) {
				return out, e
			}
			out.inspectionError = e
		}
		out.items = append(out.items, inspection)
	}
	for _, run := range append(append([]string{}, out.status.AffectedRunIDs...), out.interrupted...) {
		if !seen[run] {
			return out, fault("CONFLICT", "RECOVERY_TREE_CHANGED")
		}
	}
	out.status.AffectedRunIDs = currentAffected
	if out.revision, e = watermarkInTx(ctx, tx, out.status.RootRunID); e != nil {
		return out, e
	}
	if s.memory != nil {
		ids := make([]string, 0, len(all))
		for _, m := range all {
			ids = append(ids, m.id)
		}
		memory, e := s.memory.RecoveryWatermarkInTx(ctx, tx, id, q.ProfileID, ids)
		if e != nil {
			return out, e
		}
		if memory == "" {
			return out, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
		}
		encoded, e := json.Marshal([]string{"recovery-memory-v1", out.revision, memory})
		if e != nil {
			return out, e
		}
		digest := sha256.Sum256(encoded)
		out.revision = "sha256:" + hex.EncodeToString(digest[:])
	}
	return out, nil
}

func memoryRefusal(f *api.Fault) bool {
	if f.Kind != "CAPABILITY_DENIED" {
		return false
	}
	switch f.Reason {
	case "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH", "MEMORY_REVISION_INACTIVE", "MEMORY_FORGOTTEN":
		return true
	}
	return false
}

func (s *Store) runtimeOpenInTx(ctx context.Context, tx *sql.Tx) error {
	if s.stopping.Load() {
		return api.Denied("SERVICE_STOPPING")
	}
	var v string
	if e := tx.QueryRowContext(ctx, "SELECT state FROM execution_recovery_runtime WHERE singleton=1").Scan(&v); e != nil {
		return e
	}
	if v != "open" {
		return api.Denied("SERVICE_STOPPING")
	}
	return nil
}

// Every row is read from this one transaction. The digest is opaque metadata;
// no body, secret, checkpoint payload or database path crosses the wire.
func watermarkInTx(ctx context.Context, tx *sql.Tx, root string) (string, error) {
	queries := []string{
		"SELECT profile_id,command_epoch FROM profile_metadata ORDER BY singleton",
		"SELECT * FROM access_grants_clock ORDER BY singleton",
		"SELECT * FROM execution_runs WHERE root_run_id=? OR run_id=? ORDER BY run_id",
		"SELECT s.* FROM conversation_sessions s WHERE s.session_id IN(SELECT session_id FROM execution_runs WHERE root_run_id=? OR run_id=?) ORDER BY s.session_id",
		"SELECT m.* FROM conversation_members m WHERE m.session_id IN(SELECT session_id FROM execution_runs WHERE root_run_id=? OR run_id=?) ORDER BY m.session_id,m.agent_id",
		"SELECT c.* FROM task_config_snapshots c WHERE c.snapshot_id IN(SELECT task_config_id FROM execution_runs WHERE root_run_id=? OR run_id=?) ORDER BY c.snapshot_id",
		"SELECT c.* FROM config_snapshot_pins c WHERE c.token IN(SELECT pin_token FROM execution_runs WHERE root_run_id=? OR run_id=?) ORDER BY c.token",
		"SELECT c.* FROM task_config_pins c JOIN execution_runs r ON r.run_id=c.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY c.run_id",
		"SELECT a.* FROM agents a WHERE a.agent_id IN(SELECT agent_id FROM execution_runs WHERE root_run_id=? OR run_id=?) ORDER BY a.agent_id",
		"SELECT c.* FROM credential_metadata c WHERE c.credential_ref IN(SELECT credential_ref FROM task_config_snapshots WHERE snapshot_id IN(SELECT task_config_id FROM execution_runs WHERE root_run_id=? OR run_id=?)) ORDER BY c.credential_ref",
		"SELECT c.* FROM execution_checkpoints c JOIN execution_runs r ON r.run_id=c.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY c.run_id,c.ref",
		"SELECT c.* FROM execution_continuations c JOIN execution_runs r ON r.run_id=c.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY c.run_id,c.generation",
		"SELECT a.* FROM access_approvals a JOIN execution_runs r ON r.run_id=a.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY a.approval_id",
		"SELECT e.* FROM execution_effects e JOIN execution_runs r ON r.run_id=e.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY e.effect_id",
		"SELECT a.* FROM model_attempts a JOIN execution_runs r ON r.run_id=a.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY a.attempt_id",
		"SELECT p.* FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY p.run_id",
		"SELECT d.* FROM collaboration_result_deliveries d JOIN execution_runs r ON r.run_id=d.parent_run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY d.child_run_id",
		"SELECT d.* FROM collaboration_delegations d WHERE d.root_run_id=? OR d.child_run_id=? ORDER BY d.delegation_id",
		"SELECT m.* FROM collaboration_messages m WHERE m.root_run_id=? OR m.from_run_id=? ORDER BY m.message_id",
		"SELECT e.* FROM collaboration_wait_edges e JOIN execution_runs r ON r.run_id=e.from_run_id WHERE r.root_run_id=? OR r.run_id=? ORDER BY e.from_run_id,e.to_run_id,e.reason_id",
		"SELECT p.* FROM collaboration_policy_roots p WHERE p.root_run_id=? OR p.root_run_id=? ORDER BY p.root_run_id",
		"SELECT * FROM model_budget_policy ORDER BY singleton",
	}
	h := sha256.New()
	for i, q := range queries {
		args := []any{root, root}
		if i == 0 || i == 1 || i == len(queries)-1 {
			args = nil
		}
		rows, e := tx.QueryContext(ctx, q, args...)
		if e != nil {
			return "", e
		}
		cols, e := rows.Columns()
		if e != nil {
			rows.Close()
			return "", e
		}
		if e = json.NewEncoder(h).Encode(struct {
			Query   int
			Columns []string
		}{i, cols}); e != nil {
			rows.Close()
			return "", e
		}
		for rows.Next() {
			v := make([]any, len(cols))
			ptr := make([]any, len(cols))
			for j := range v {
				ptr[j] = &v[j]
			}
			if e = rows.Scan(ptr...); e != nil {
				rows.Close()
				return "", e
			}
			if e = json.NewEncoder(h).Encode(v); e != nil {
				rows.Close()
				return "", e
			}
		}
		e = rows.Err()
		ce := rows.Close()
		if e != nil {
			return "", e
		}
		if ce != nil {
			return "", ce
		}
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil)), nil
}

func (s *Store) inspect(ctx context.Context, id api.RequestIdentity, snap snapshot) error {
	if snap.inspectionError != nil {
		return snap.inspectionError
	}
	if len(snap.items) == 0 {
		return fault("RECOVERY_BLOCKED", "RECOVERY_TREE_TERMINATED")
	}
	for _, v := range snap.items {
		if contains(snap.interrupted, v.Run.ID) {
			if s.inspector == nil {
				return fault("RECOVERY_BLOCKED", "CHECKPOINT_INSPECTOR_UNAVAILABLE")
			}
			if e := s.inspector.InspectRecovery(ctx, v); e != nil {
				return e
			}
		}
		if v.Run.Role != "orchestration" {
			if s.current == nil {
				return fault("RECOVERY_BLOCKED", "ACCESS_NOT_ASSEMBLED")
			}
			if e := s.current.AuthorizeAdmission(ctx, id, v.Access); e != nil {
				return e
			}
		}
	}
	return nil
}

func contains(v []string, key string) bool {
	for _, x := range v {
		if x == key {
			return true
		}
	}
	return false
}

// Known eligibility refusals are safe metadata. SQL/IO, malformed durable facts
// and unknown errors must retain their original failure/rollback semantics.
func refusal(e error) (string, bool) {
	var f *api.Fault
	if !errors.As(e, &f) {
		return "", false
	}
	switch f.Kind {
	case "RECOVERY_BLOCKED", "CAPABILITY_DENIED", "HOST_UNAVAILABLE", "MODEL_UNAVAILABLE":
		return f.Reason, true
	}
	return "", false
}
