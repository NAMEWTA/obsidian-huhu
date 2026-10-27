package purge

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/purge"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/purge"
)

type Store struct {
	base *base.Store
	now  func() time.Time
}

func New(b *base.Store) *Store { return &Store{base: b, now: time.Now} }

func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }

type metadata struct {
	profile         string
	epoch, revision uint64
}

func readMetadata(ctx context.Context, tx *sql.Tx) (metadata, error) {
	var out metadata
	var epoch, revision string
	if err := tx.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&out.profile, &epoch, &revision); err != nil {
		return out, err
	}
	var err error
	out.epoch, err = strconv.ParseUint(epoch, 10, 64)
	if err != nil {
		return out, err
	}
	out.revision, err = strconv.ParseUint(revision, 10, 64)
	if err != nil {
		return out, err
	}
	return out, nil
}
func tableExists(ctx context.Context, tx *sql.Tx, name string) (bool, error) {
	var n int
	err := tx.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_schema WHERE type='table' AND name=?", name).Scan(&n)
	return n == 1, err
}

func (s *Store) Preview(ctx context.Context, req app.PreviewRequest) (domain.Plan, error) {
	if req.ProfileID == "" {
		return domain.Plan{}, fault("INVALID_ARGUMENT", "PROFILE_REQUIRED")
	}
	ttl := req.TTL
	if ttl <= 0 || ttl > 30*time.Minute {
		ttl = 10 * time.Minute
	}
	var out domain.Plan
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		// Retained memory namespaces are rehomed when the Profile identity is
		// rotated below. Defer FK checks until the parent metadata row is updated
		// in the same transaction; no external work happens while this is set.
		if _, e := tx.ExecContext(ctx, "PRAGMA defer_foreign_keys=ON"); e != nil {
			return e
		}
		m, err := readMetadata(ctx, tx)
		if err != nil {
			return err
		}
		if m.profile != req.ProfileID {
			return fault("CAPABILITY_DENIED", "PROFILE_MISMATCH")
		}
		var unknown int
		if ok, e := tableExists(ctx, tx, "execution_effects"); e != nil {
			return e
		} else if ok {
			if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE state IN('dispatching','unknown_outcome')").Scan(&unknown); e != nil {
				return e
			}
		}
		out = domain.Plan{Token: domain.NewToken(), ProfileID: m.profile, CommandEpoch: m.epoch, Revision: m.revision, NextEpoch: m.epoch + 1, NextProfileID: api.NewID("profile:"), Selection: req.Selection, UnknownEffects: unknown, ExpiresAt: s.now().UTC().Add(ttl)}
		ok, e := tableExists(ctx, tx, "purge_previews")
		if e != nil {
			return e
		}
		if !ok {
			return fault("CONFLICT", "PURGE_SCHEMA_UNAVAILABLE")
		}
		_, err = tx.ExecContext(ctx, "INSERT INTO purge_previews(token,profile_id,command_epoch,revision,selection_json,unknown_effects,expires_at,state,created_at) VALUES(?,?,?,?,?,?,?,?,?)", out.Token, out.ProfileID, m.epoch, m.revision, string(mustJSON(req.Selection)), unknown, out.ExpiresAt.Format(time.RFC3339Nano), "pending", s.now().UTC().Format(time.RFC3339Nano))
		return err
	})
	return out, err
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }

func (s *Store) Execute(ctx context.Context, req app.ExecuteRequest) (app.Result, error) {
	if req.ProfileID == "" || req.Token == "" {
		return app.Result{}, fault("INVALID_ARGUMENT", "PURGE_TOKEN_REQUIRED")
	}
	var out app.Result
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := tx.ExecContext(ctx, "PRAGMA defer_foreign_keys=ON"); e != nil {
			return e
		}
		m, err := readMetadata(ctx, tx)
		if err != nil {
			return err
		}
		if m.profile != req.ProfileID {
			return fault("CAPABILITY_DENIED", "PROFILE_MISMATCH")
		}
		if req.CommandEpoch != "" && req.CommandEpoch != strconv.FormatUint(m.epoch, 10) {
			return fault("CONFLICT", "COMMAND_EPOCH_MISMATCH")
		}
		if req.ExpectedRevision != "" && req.ExpectedRevision != strconv.FormatUint(m.revision, 10) {
			return fault("CONFLICT", "REVISION_MISMATCH")
		}
		var epoch, revision, unknown int64
		var selectionJSON, expires, state string
		err = tx.QueryRowContext(ctx, "SELECT command_epoch,revision,unknown_effects,selection_json,expires_at,state FROM purge_previews WHERE token=? AND profile_id=?", req.Token, req.ProfileID).Scan(&epoch, &revision, &unknown, &selectionJSON, &expires, &state)
		if errors.Is(err, sql.ErrNoRows) {
			return fault("NOT_FOUND", "PURGE_PREVIEW_NOT_FOUND")
		}
		if err != nil {
			return err
		}
		if state != "pending" {
			return fault("CONFLICT", "PURGE_PREVIEW_CONSUMED")
		}
		if s.now().After(parseTime(expires)) {
			_, _ = tx.ExecContext(ctx, "UPDATE purge_previews SET state='expired' WHERE token=?", req.Token)
			return fault("CONFLICT", "PURGE_PREVIEW_EXPIRED")
		}
		if uint64(epoch) != m.epoch || uint64(revision) != m.revision {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		if unknown > 0 && !req.AllowUnknown {
			return fault("CONFLICT", "EFFECT_RECONCILIATION_REQUIRED")
		}
		var sel domain.Selection
		if err = json.Unmarshal([]byte(selectionJSON), &sel); err != nil {
			return fault("CONFLICT", "PURGE_PREVIEW_INVALID")
		}
		// Retention choices are part of the destructive command and are applied
		// only after the preview token, profile identity and revision fence have
		// all been checked above.
		sel.RetainMemoryIDs = append([]string(nil), req.RetainMemoryIDs...)
		if err = purgeRows(ctx, tx, sel); err != nil {
			return err
		}
		newID := api.NewID("profile:")
		// Retained namespaces belong to the new Profile identity. Move them in
		// the same transaction before the metadata CAS so foreign keys cannot
		// observe a stale owner reference.
		if ok, e := tableExists(ctx, tx, "memory_namespaces"); e != nil {
			return e
		} else if ok {
			if _, e = tx.ExecContext(ctx, "UPDATE memory_namespaces SET profile_id=? WHERE profile_id=?", newID, req.ProfileID); e != nil {
				return e
			}
		}
		if ok, e := tableExists(ctx, tx, "model_budget_policy"); e != nil {
			return e
		} else if ok {
			if _, e = tx.ExecContext(ctx, "UPDATE model_budget_policy SET profile_id=? WHERE profile_id=?", newID, req.ProfileID); e != nil {
				return e
			}
		}
		if _, err = tx.ExecContext(ctx, "UPDATE profile_metadata SET profile_id=?,command_epoch=?,revision=? WHERE singleton=1 AND profile_id=? AND command_epoch=? AND revision=?", newID, m.epoch+1, m.revision+1, req.ProfileID, m.epoch, m.revision); err != nil {
			return err
		}
		rows, _ := tx.ExecContext(ctx, "UPDATE purge_previews SET state='executed' WHERE token=? AND state='pending'", req.Token)
		n, _ := rows.RowsAffected()
		if n != 1 {
			return fault("CONFLICT", "PURGE_PREVIEW_CHANGED")
		}
		out = app.Result{ProfileID: newID, CommandEpoch: m.epoch + 1, Revision: m.revision + 1, Purged: true, RetainedPinned: sel.KeepPinned, RetainedGlobal: sel.KeepGlobal}
		return nil
	})
	return out, err
}

func parseTime(v string) time.Time { t, _ := time.Parse(time.RFC3339Nano, v); return t }

func purgeRows(ctx context.Context, tx *sql.Tx, sel domain.Selection) error {
	// Delete descendants before their referenced parents. Every table is checked
	// because migrations are intentionally additive and older Profiles may lack
	// some slices. A clear never silently depends on a particular migration set.
	// Contexts, jobs and proposals are derived work and are never retained.
	for _, name := range []string{"memory_context_entries", "memory_run_contexts", "memory_dependencies", "memory_candidate_bodies", "memory_candidates", "memory_jobs", "memory_completion_outbox", "memory_global_proposals"} {
		if ok, err := tableExists(ctx, tx, name); err != nil {
			return err
		} else if ok {
			if _, err := tx.ExecContext(ctx, "DELETE FROM "+name); err != nil {
				return err
			}
		}
	}
	if ok, err := tableExists(ctx, tx, "memory_items"); err != nil {
		return err
	} else if ok {
		keep := "SELECT item_id FROM memory_items WHERE pinned=1"
		if sel.KeepGlobal {
			keep += " UNION SELECT item_id FROM memory_items WHERE namespace_id IN (SELECT namespace_id FROM memory_namespaces WHERE kind='global')"
		}
		keepArgs := make([]any, 0, len(sel.RetainMemoryIDs))
		if len(sel.RetainMemoryIDs) > 0 {
			placeholders := make([]string, len(sel.RetainMemoryIDs))
			for i, id := range sel.RetainMemoryIDs {
				keepArgs = append(keepArgs, id)
				placeholders[i] = "?"
			}
			keep += " UNION SELECT item_id FROM memory_items WHERE item_id IN (" + strings.Join(placeholders, ",") + ")"
		}
		// Delete dependent facts first, retaining only the explicitly selected
		// pinned/global items and their complete revision history.
		for _, q := range []string{
			"DELETE FROM memory_suppressions WHERE protected_item_id NOT IN (" + keep + ")",
			"DELETE FROM memory_index WHERE item_id NOT IN (" + keep + ")",
			"DELETE FROM memory_revision_bodies WHERE revision_id IN (SELECT revision_id FROM memory_revisions WHERE item_id NOT IN (" + keep + "))",
			"DELETE FROM memory_revisions WHERE item_id NOT IN (" + keep + ")",
			"DELETE FROM memory_items WHERE item_id NOT IN (" + keep + ")",
		} {
			if _, err := tx.ExecContext(ctx, q, keepArgs...); err != nil {
				return err
			}
		}
		if !sel.KeepGlobal {
			// If no global selection was made, all remaining global namespaces are
			// removed along with empty agent namespaces.
			if _, err := tx.ExecContext(ctx, "DELETE FROM memory_namespaces WHERE namespace_id NOT IN (SELECT namespace_id FROM memory_items)"); err != nil {
				return err
			}
		} else if _, err := tx.ExecContext(ctx, "DELETE FROM memory_namespaces WHERE namespace_id NOT IN (SELECT namespace_id FROM memory_items) AND kind<>'global'"); err != nil {
			return err
		}
	}
	tables := []string{
		"group_publications", "conversation_messages", "conversation_members", "conversation_sessions",
		"collaboration_result_deliveries", "collaboration_parent_results", "collaboration_wait_edges", "collaboration_messages", "collaboration_lineage", "access_delegation_grants", "collaboration_delegations", "collaboration_threads", "collaboration_proposals", "collaboration_policy_roots",
		"task_config_pins", "task_config_snapshots", "model_attempts", "model_budget_accounts", "model_budget_policy",
		"execution_continuations", "access_approvals", "execution_effects", "execution_checkpoints", "execution_events", "execution_recovery_trees", "execution_runs",
		"access_grants", "command_receipts", "agent_deletion_previews", "config_snapshot_pins", "model_binding_revisions", "persona_revisions", "agents", "credential_metadata",
	}
	for _, name := range tables {
		if ok, err := tableExists(ctx, tx, name); err != nil {
			return err
		} else if !ok {
			continue
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+name); err != nil {
			return err
		}
	}
	return nil
}

var _ app.Repository = (*Store)(nil)
