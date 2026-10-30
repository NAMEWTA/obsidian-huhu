package purge

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
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
	if req.Selection.KeepPinned || req.Selection.KeepGlobal || len(req.Selection.RetainMemoryIDs) > 0 {
		return domain.Plan{}, api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
	}
	req.Selection.DataErased = false
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
		var pendingToken, pendingSelection string
		pendingErr := tx.QueryRowContext(ctx, "SELECT token,selection_json FROM purge_previews WHERE profile_id=? AND state='failed' ORDER BY created_at LIMIT 1", req.ProfileID).Scan(&pendingToken, &pendingSelection)
		if pendingErr == nil {
			var selection domain.Selection
			if json.Unmarshal([]byte(pendingSelection), &selection) != nil {
				return fault("CONFLICT", "PURGE_PREVIEW_INVALID")
			}
			selection.MemoryFence, err = memoryFence(ctx, tx)
			if err != nil {
				return err
			}
			out = domain.Plan{Token: pendingToken, ProfileID: m.profile, CommandEpoch: m.epoch, Revision: m.revision, NextEpoch: m.epoch + 1, Selection: selection, ExpiresAt: s.now().UTC().Add(ttl)}
			_, e := tx.ExecContext(ctx, "UPDATE purge_previews SET expires_at=?,command_epoch=?,revision=?,selection_json=? WHERE token=?", out.ExpiresAt.Format(time.RFC3339Nano), m.epoch, m.revision, string(mustJSON(selection)), pendingToken)
			return e
		}
		if !errors.Is(pendingErr, sql.ErrNoRows) {
			return pendingErr
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
		out.Selection.MemoryFence, err = memoryFence(ctx, tx)
		if err != nil {
			return err
		}
		ok, e := tableExists(ctx, tx, "purge_previews")
		if e != nil {
			return e
		}
		if !ok {
			return fault("CONFLICT", "PURGE_SCHEMA_UNAVAILABLE")
		}
		_, err = tx.ExecContext(ctx, "INSERT INTO purge_previews(token,profile_id,command_epoch,revision,selection_json,unknown_effects,expires_at,state,created_at) VALUES(?,?,?,?,?,?,?,?,?)", out.Token, out.ProfileID, m.epoch, m.revision, string(mustJSON(out.Selection)), unknown, out.ExpiresAt.Format(time.RFC3339Nano), "pending", s.now().UTC().Format(time.RFC3339Nano))
		return err
	})
	return out, err
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }

func (s *Store) Execute(ctx context.Context, req app.ExecuteRequest) (app.Result, error) {
	if len(req.RetainMemoryIDs) > 0 {
		return app.Result{}, api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
	}
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
		if state != "pending" && state != "failed" {
			return fault("CONFLICT", "PURGE_PREVIEW_CONSUMED")
		}
		if state == "pending" && s.now().After(parseTime(expires)) {
			_, _ = tx.ExecContext(ctx, "UPDATE purge_previews SET state='expired' WHERE token=?", req.Token)
			return fault("CONFLICT", "PURGE_PREVIEW_EXPIRED")
		}
		if uint64(epoch) != m.epoch || uint64(revision) != m.revision {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		var active int
		if err = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled'))+(SELECT count(*) FROM model_attempts WHERE producer_ended=0)").Scan(&active); err != nil {
			return err
		}
		if active != 0 {
			return fault("CONFLICT", "PROFILE_HAS_ACTIVE_RUNS")
		}
		if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE state IN('dispatching','unknown_outcome')").Scan(&unknown); err != nil {
			return err
		}
		if unknown > 0 {
			return fault("CONFLICT", "EFFECT_RECONCILIATION_REQUIRED")
		}
		var sel domain.Selection
		if err = json.Unmarshal([]byte(selectionJSON), &sel); err != nil {
			return fault("CONFLICT", "PURGE_PREVIEW_INVALID")
		}
		if sel.KeepPinned || sel.KeepGlobal || len(sel.RetainMemoryIDs) > 0 {
			return api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
		}
		if !sel.DataErased {
			currentFence, e := memoryFence(ctx, tx)
			if e != nil {
				return e
			}
			if sel.MemoryFence != "" && sel.MemoryFence != currentFence {
				return fault("CONFLICT", "PURGE_PREVIEW_STALE")
			}
			if err = purgeRows(ctx, tx, sel); err != nil {
				return err
			}
			sel.DataErased = true
			sel.MemoryFence, err = memoryFence(ctx, tx)
			if err != nil {
				return err
			}
		}
		// Keep the original Profile and token restricted until the old WAL has
		// been truncated. A checkpoint failure can then resume without rotating
		// identity twice or reopening access to leftover physical bytes.
		if _, err = tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state='stopping' WHERE singleton=1"); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, "UPDATE purge_previews SET selection_json=?,state='failed' WHERE token=?", string(mustJSON(sel)), req.Token)
		return err
	})
	if err != nil {
		return out, err
	}
	if err = s.base.EraseWAL(ctx); err != nil {
		return out, err
	}
	err = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		m, e := readMetadata(ctx, tx)
		if e != nil {
			return e
		}
		if m.profile != req.ProfileID || req.CommandEpoch != "" && req.CommandEpoch != strconv.FormatUint(m.epoch, 10) || req.ExpectedRevision != "" && req.ExpectedRevision != strconv.FormatUint(m.revision, 10) {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		var selection, state string
		if e = tx.QueryRowContext(ctx, "SELECT selection_json,state FROM purge_previews WHERE token=? AND profile_id=?", req.Token, req.ProfileID).Scan(&selection, &state); e != nil {
			return e
		}
		var sel domain.Selection
		if json.Unmarshal([]byte(selection), &sel) != nil || !sel.DataErased || state != "failed" {
			return fault("CONFLICT", "PURGE_PREVIEW_CHANGED")
		}
		newID := api.NewID("profile:")
		if _, e = tx.ExecContext(ctx, "UPDATE profile_metadata SET profile_id=?,command_epoch=?,revision=? WHERE singleton=1 AND profile_id=? AND command_epoch=? AND revision=?", newID, m.epoch+1, m.revision+1, req.ProfileID, m.epoch, m.revision); e != nil {
			return e
		}
		// A cleared Profile starts with an explicit unconfigured, paused policy.
		// Keep it in the rotation transaction: constructor defaults or a missing
		// row must neither inherit the old spending limits nor break hello.
		policy := api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "0", MaintenanceTokenLimit: "0", Paused: true}
		if _, e = tx.ExecContext(ctx, "INSERT INTO model_budget_policy(singleton,profile_id,policy_json,revision) VALUES(1,?,?,1)", newID, string(mustJSON(policy))); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE purge_previews SET state='executed' WHERE token=? AND state='failed'", req.Token); e != nil {
			return e
		}
		out = app.Result{ProfileID: newID, CommandEpoch: m.epoch + 1, Revision: m.revision + 1, Purged: true}
		return nil
	})
	return out, err
}

func (s *Store) CleanupPending(ctx context.Context) (bool, error) {
	var n int
	err := s.base.Database().QueryRowContext(ctx, "SELECT (SELECT count(*) FROM purge_previews WHERE state='failed')+(SELECT count(*) FROM session_deletions WHERE state='pending')").Scan(&n)
	return n > 0, err
}

// BeginCleanup durably closes model admission before filesystem/keyring work.
// A failed cleanup keeps its original preview and can only be retried.
func (s *Store) BeginCleanup(ctx context.Context, req app.ExecuteRequest) (refs []api.CredentialMetadata, err error) {
	if len(req.RetainMemoryIDs) > 0 {
		return nil, api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
	}
	// Durability barrier (ADR-027): the failed/stopping cleanup fence is flushed
	// before any external erasure starts.
	err = s.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		m, e := readMetadata(ctx, tx)
		if e != nil {
			return e
		}
		if m.profile != req.ProfileID {
			return api.Denied("PROFILE_MISMATCH")
		}
		if req.CommandEpoch != strconv.FormatUint(m.epoch, 10) {
			return fault("CONFLICT", "COMMAND_EPOCH_MISMATCH")
		}
		var epoch, revision int64
		var state, expires, selection string
		e = tx.QueryRowContext(ctx, "SELECT command_epoch,revision,state,expires_at,selection_json FROM purge_previews WHERE token=? AND profile_id=?", req.Token, req.ProfileID).Scan(&epoch, &revision, &state, &expires, &selection)
		if e != nil {
			return e
		}
		if state != "pending" && state != "failed" {
			return fault("CONFLICT", "PURGE_PREVIEW_CONSUMED")
		}
		if state == "pending" && s.now().After(parseTime(expires)) {
			return fault("CONFLICT", "PURGE_PREVIEW_EXPIRED")
		}
		if uint64(epoch) != m.epoch || uint64(revision) != m.revision || req.ExpectedRevision != "" && req.ExpectedRevision != strconv.FormatUint(m.revision, 10) {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		var raw map[string]json.RawMessage
		if json.Unmarshal([]byte(selection), &raw) != nil || raw["sessionId"] != nil {
			return fault("CONFLICT", "PURGE_PREVIEW_KIND_MISMATCH")
		}
		var selected domain.Selection
		if json.Unmarshal([]byte(selection), &selected) != nil {
			return fault("CONFLICT", "PURGE_PREVIEW_INVALID")
		}
		if selected.KeepPinned || selected.KeepGlobal || len(selected.RetainMemoryIDs) > 0 {
			return api.Invalid("PROFILE_RETENTION_NOT_SUPPORTED")
		}
		currentFence, e := memoryFence(ctx, tx)
		if e != nil {
			return e
		}
		if !selected.DataErased && selected.MemoryFence != "" && selected.MemoryFence != currentFence {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		seen := map[string]bool{}
		for _, item := range req.RetainMemoryIDs {
			if seen[item] {
				return api.Invalid("INVALID_MEMORY_RETENTION")
			}
			seen[item] = true
			var count int
			if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE i.item_id=? AND (i.pinned=1 OR n.kind='global')", item).Scan(&count); e != nil {
				return e
			}
			if count != 1 {
				return api.Invalid("INVALID_MEMORY_RETENTION")
			}
		}
		var active, unknown int
		if e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled'))+(SELECT count(*) FROM model_attempts WHERE producer_ended=0)").Scan(&active); e != nil {
			return e
		}
		if active > 0 {
			return fault("CONFLICT", "PROFILE_HAS_ACTIVE_RUNS")
		}
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE state IN('dispatching','unknown_outcome')").Scan(&unknown); e != nil {
			return e
		}
		if unknown > 0 {
			return fault("CONFLICT", "EFFECT_RECONCILIATION_REQUIRED")
		}
		rows, e := tx.QueryContext(ctx, "SELECT credential_ref,mode,state,reason FROM credential_metadata WHERE profile_id=?", req.ProfileID)
		if e != nil {
			return e
		}
		for rows.Next() {
			m := api.CredentialMetadata{ProfileID: req.ProfileID}
			if e = rows.Scan(&m.CredentialRef, &m.Status.Mode, &m.Status.State, &m.Status.Reason); e != nil {
				rows.Close()
				return e
			}
			refs = append(refs, m)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state='stopping' WHERE singleton=1"); e != nil {
			return e
		}
		_, e = tx.ExecContext(ctx, "UPDATE purge_previews SET state='failed' WHERE token=?", req.Token)
		return e
	})
	return
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
		keep := "SELECT item_id FROM memory_items WHERE 0"
		if sel.KeepPinned {
			keep += " UNION SELECT item_id FROM memory_items WHERE pinned=1"
		}
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
		"session_deletions", "group_publications", "conversation_messages", "conversation_members", "conversation_sessions",
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

func memoryFence(ctx context.Context, tx *sql.Tx) (string, error) {
	rows, err := tx.QueryContext(ctx, "SELECT namespace_id,catalog_revision,settings_revision,suppression_revision FROM memory_namespaces ORDER BY namespace_id")
	if err != nil {
		return "", err
	}
	defer rows.Close()
	all := []any{}
	for rows.Next() {
		var id string
		var catalog, settings, suppression int64
		if err = rows.Scan(&id, &catalog, &settings, &suppression); err != nil {
			return "", err
		}
		all = append(all, []any{id, catalog, settings, suppression})
	}
	if err = rows.Err(); err != nil {
		return "", err
	}
	data, _ := json.Marshal(all)
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}
