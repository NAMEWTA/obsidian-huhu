package purge

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	sessionapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/sessions"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/purge"
)

type Sessions struct{ store *Store }

func NewSessions(s *Store) *Sessions { return &Sessions{s} }

type sessionPlan struct {
	SessionID       string         `json:"sessionId"`
	Principal       string         `json:"principal"`
	SessionRevision string         `json:"sessionRevision"`
	Nodes           []node         `json:"nodes"`
	Memory          []memoryChoice `json:"memory"`
}
type node struct{ Kind, ID string }
type memoryChoice struct {
	ID, Revision string
	Retainable   bool
}

func plan(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (out sessionPlan, unknown int, err error) {
	session, e := conv.ReadSession(ctx, tx, id, q.ProfileID, q.ID)
	if e != nil {
		return out, 0, e
	}
	out = sessionPlan{SessionID: q.ID, Principal: id.PrincipalID(), SessionRevision: session.Revision, Nodes: []node{}, Memory: []memoryChoice{}}
	rows, e := tx.QueryContext(ctx, `WITH RECURSIVE doomed(kind,id) AS (
 SELECT 'message',message_id FROM conversation_messages WHERE session_id=?
 UNION SELECT 'run',run_id FROM execution_runs WHERE session_id=?
 UNION SELECT 'memory_revision',r.revision_id FROM memory_revisions r JOIN memory_items i ON i.item_id=r.item_id WHERE (i.scope_kind='session' AND i.scope_id=?) OR (i.scope_kind='work_thread' AND i.scope_id IN(SELECT work_thread_id FROM execution_runs WHERE session_id=?))
 UNION SELECT CASE WHEN d.owner_kind='private_result' THEN 'task_result' ELSE d.owner_kind END,d.owner_id FROM memory_dependencies d JOIN doomed a ON d.ancestor_kind=a.kind AND d.ancestor_id=a.id WHERE d.relation!='audit'
 UNION SELECT 'message',m.message_id FROM conversation_messages m JOIN doomed a ON a.kind='run' AND m.run_id=a.id
 UNION SELECT 'task_result',r.run_id FROM execution_runs r JOIN doomed a ON a.kind='run' AND r.run_id=a.id
 UNION SELECT 'run',e.run_id FROM memory_context_entries e JOIN doomed a ON a.kind='context_entry' AND e.entry_id=a.id
 UNION SELECT 'run',j.source_run_id FROM memory_jobs j JOIN doomed a ON a.kind='job' AND j.job_id=a.id
 ) SELECT kind,id FROM doomed ORDER BY kind,id`, q.ID, q.ID, q.ID, q.ID)
	if e != nil {
		return out, 0, e
	}
	for rows.Next() {
		var n node
		if e = rows.Scan(&n.Kind, &n.ID); e != nil {
			rows.Close()
			return out, 0, e
		}
		out.Nodes = append(out.Nodes, n)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return out, 0, e
	}
	if len(out.Nodes) > 32768 {
		return out, 0, fault("RESOURCE_LIMIT", "SESSION_DELETION_TOO_LARGE")
	}
	seen := map[string]bool{}
	for _, n := range out.Nodes {
		if n.Kind == "run" {
			var active int
			e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM execution_runs WHERE run_id=? AND status NOT IN('succeeded','failed','canceled'))+(SELECT count(*) FROM model_attempts WHERE run_id=? AND producer_ended=0)", n.ID, n.ID).Scan(&active)
			if e != nil {
				return out, 0, e
			}
			if active > 0 {
				return out, 0, fault("CONFLICT", "SESSION_HAS_ACTIVE_RUNS")
			}
			var count int
			if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_effects WHERE run_id=? AND state IN('dispatching','unknown_outcome')", n.ID).Scan(&count); e != nil {
				return out, 0, e
			}
			unknown += count
		}
		if n.Kind == "memory_revision" {
			var m memoryChoice
			var pinned bool
			var kind string
			e = tx.QueryRowContext(ctx, "SELECT i.item_id,CAST(i.revision AS TEXT),i.pinned,n.kind FROM memory_revisions r JOIN memory_items i ON i.item_id=r.item_id JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE r.revision_id=?", n.ID).Scan(&m.ID, &m.Revision, &pinned, &kind)
			if errors.Is(e, sql.ErrNoRows) {
				continue
			}
			if e != nil {
				return out, 0, e
			}
			if !seen[m.ID] {
				m.Retainable = pinned || kind == "global"
				out.Memory = append(out.Memory, m)
				seen[m.ID] = true
			}
		}
	}
	sort.Slice(out.Memory, func(i, j int) bool { return out.Memory[i].ID < out.Memory[j].ID })
	return out, unknown, nil
}
func (s *Sessions) Preview(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (out api.DeletionPreview, err error) {
	err = s.store.base.WithinTx(ctx, func(tx *sql.Tx) error {
		m, e := conv.Metadata(ctx, tx, q.ProfileID)
		if e != nil {
			return e
		}
		var pendingToken string
		pendingErr := tx.QueryRowContext(ctx, "SELECT token FROM session_deletions WHERE profile_id=? AND principal_id=? AND session_id=? AND state='pending'", q.ProfileID, id.PrincipalID(), q.ID).Scan(&pendingToken)
		if pendingErr == nil {
			out = api.DeletionPreview{Token: pendingToken, Revision: m.Revision, ExpiresAt: s.store.now().UTC().Add(10 * time.Minute).Format(api.TimestampLayout), Categories: []api.DeletionCategory{{Kind: "session-cleanup", Count: 1, Retained: true, Reason: "SESSION_CLEANUP_REQUIRED"}}}
			return nil
		}
		if !errors.Is(pendingErr, sql.ErrNoRows) {
			return pendingErr
		}

		p, unknown, e := plan(ctx, tx, id, q)
		if e != nil {
			return e
		}
		out = api.DeletionPreview{Token: purge.NewToken(), Revision: p.SessionRevision, ExpiresAt: s.store.now().UTC().Add(10 * time.Minute).Format(api.TimestampLayout), Categories: []api.DeletionCategory{{Kind: "session-body", Count: 1}}}
		if unknown > 0 {
			out.Categories = append(out.Categories, api.DeletionCategory{Kind: "unknown-effects", Count: unknown, Retained: true, Reason: "EFFECT_RECONCILIATION_REQUIRED"})
		}
		for _, item := range p.Memory {
			if item.Retainable {
				out.Categories = append(out.Categories, api.DeletionCategory{Kind: "memory:" + item.ID, Count: 1, Reason: "OPTIONAL_RETENTION"})
			}
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO purge_previews(token,profile_id,command_epoch,revision,selection_json,unknown_effects,expires_at,state,created_at) VALUES(?,?,?,?,?,?,?,'pending',?)", out.Token, q.ProfileID, m.CommandEpoch, m.Revision, string(mustJSON(p)), unknown, out.ExpiresAt, s.store.now().UTC().Format(api.TimestampLayout))
		return e
	})
	return
}

// Delete is the durability barrier (ADR-027) before external Session cleanup.
func (s *Sessions) Delete(ctx context.Context, id api.RequestIdentity, q api.SessionDelete) (out api.Receipt, err error) {
	err = s.store.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		var saved, savedState, savedHash, savedRetention string
		e := tx.QueryRowContext(ctx, "SELECT receipt_json,state,request_hash,retention_json FROM session_deletions WHERE token=? AND profile_id=? AND principal_id=? AND session_id=?", q.PreviewToken, q.ProfileID, id.PrincipalID(), q.ID).Scan(&saved, &savedState, &savedHash, &savedRetention)
		if e == nil {
			if savedState == "pending" {
				if len(q.RetainMemoryIDs) > 0 && savedRetention != retentionKey(q.RetainMemoryIDs) {
					return fault("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_INPUT_MISMATCH")
				}
			} else if savedHash != commands.Hash(q) {
				return fault("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_INPUT_MISMATCH")
			}
			if savedState == "complete" {
				if _, e = conv.Epoch(ctx, tx, q.CommandMeta); e != nil {
					return e
				}
			}
			return json.Unmarshal([]byte(saved), &out)
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		m, e := conv.Epoch(ctx, tx, q.CommandMeta)
		if e != nil {
			return e
		}
		// Physical erasure closes Profile admission. Never interrupt an
		// unrelated paid producer while taking that fence.
		var active int
		if e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled'))+(SELECT count(*) FROM model_attempts WHERE producer_ended=0)").Scan(&active); e != nil {
			return e
		}
		if active > 0 {
			return fault("CONFLICT", "PROFILE_HAS_ACTIVE_RUNS")
		}
		var selection, expires, state string
		var epoch, revision string
		e = tx.QueryRowContext(ctx, "SELECT selection_json,expires_at,state,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM purge_previews WHERE token=? AND profile_id=?", q.PreviewToken, q.ProfileID).Scan(&selection, &expires, &state, &epoch, &revision)
		if e != nil {
			return e
		}
		var old sessionPlan
		if json.Unmarshal([]byte(selection), &old) != nil || old.SessionID != q.ID || old.Principal != id.PrincipalID() {
			return api.Denied("PURGE_PREVIEW_OWNER_MISMATCH")
		}
		if state != "pending" || s.store.now().After(parseTime(expires)) {
			return fault("CONFLICT", "PURGE_PREVIEW_EXPIRED")
		}
		if epoch != m.CommandEpoch || revision != m.Revision {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		current, unknown, e := plan(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: q.ID})
		if e != nil {
			return e
		}
		if !reflect.DeepEqual(old, current) || q.ExpectedRevision != "" && q.ExpectedRevision != current.SessionRevision {
			return fault("CONFLICT", "PURGE_PREVIEW_STALE")
		}
		keep := map[string]bool{}
		for _, item := range q.RetainMemoryIDs {
			found := false
			for _, choice := range current.Memory {
				if choice.ID == item && choice.Retainable {
					found = true
				}
			}
			if !found || keep[item] {
				return api.Invalid("INVALID_MEMORY_RETENTION")
			}
			keep[item] = true
		}
		if _, e = tx.ExecContext(ctx, "PRAGMA defer_foreign_keys=ON"); e != nil {
			return e
		}
		if e = eraseSession(ctx, tx, current, keep, unknown > 0); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "DELETE FROM command_receipts"); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE profile_metadata SET command_epoch=command_epoch+1,revision=revision+1 WHERE singleton=1 AND command_epoch<9223372036854775807 AND revision<9223372036854775807"); e != nil {
			return e
		}
		out = api.Receipt{CommandID: q.CommandID, ReceiptID: api.NewID("receipt:"), Revision: strconv.FormatInt(mustInt(m.Revision)+1, 10)}
		if _, e = tx.ExecContext(ctx, "INSERT INTO session_deletions(token,profile_id,principal_id,session_id,request_hash,retention_json,receipt_json,source_ids_json,state) VALUES(?,?,?,?,?,?,?,?,'pending')", q.PreviewToken, q.ProfileID, id.PrincipalID(), q.ID, commands.Hash(q), retentionKey(q.RetainMemoryIDs), string(mustJSON(out)), string(mustJSON(current.Nodes))); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state='stopping' WHERE singleton=1"); e != nil {
			return e
		}
		_, e = tx.ExecContext(ctx, "UPDATE purge_previews SET state='executed' WHERE token=?", q.PreviewToken)
		return e
	})
	return
}
func mustInt(v string) int64 { n, _ := strconv.ParseInt(v, 10, 64); return n }
func (s *Sessions) Complete(ctx context.Context, id api.RequestIdentity, token string) error {
	// Keep the durable job pending until old plaintext WAL frames are gone.
	if err := s.store.base.EraseWAL(ctx); err != nil {
		return err
	}
	return s.store.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "UPDATE session_deletions SET state='complete' WHERE token=? AND principal_id=?", token, id.PrincipalID()); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, "UPDATE execution_recovery_runtime SET state='open' WHERE singleton=1 AND NOT EXISTS(SELECT 1 FROM session_deletions WHERE state='pending') AND NOT EXISTS(SELECT 1 FROM purge_previews WHERE state='failed')")
		return err
	})
}
func eraseSession(ctx context.Context, tx *sql.Tx, p sessionPlan, keep map[string]bool, unknown bool) error {
	runs := []string{}
	messages := []string{}
	for _, n := range p.Nodes {
		if n.Kind == "run" {
			runs = append(runs, n.ID)
		}
		if n.Kind == "message" {
			messages = append(messages, n.ID)
		}
	}
	exec := func(query string, args ...any) error { _, e := tx.ExecContext(ctx, query, args...); return e }
	// The retained item becomes independent user content. All old revisions and
	// lineage are erased, so selecting it cannot keep the deleted source alive.
	for _, m := range p.Memory {
		if keep[m.ID] {
			if e := exec("UPDATE memory_items SET scope_kind='profile',scope_id='',revision=revision+1 WHERE item_id=?", m.ID); e != nil {
				return e
			}
			if e := exec("DELETE FROM memory_revision_bodies WHERE revision_id IN(SELECT revision_id FROM memory_revisions WHERE item_id=? AND revision_id<>(SELECT head_revision_id FROM memory_items WHERE item_id=?))", m.ID, m.ID); e != nil {
				return e
			}
			if e := exec("UPDATE memory_revisions SET source_json='[]',scope_json='[]',derived_json='[]',creator_kind='user',creator_agent_id='',job_id='' WHERE item_id=?", m.ID); e != nil {
				return e
			}
			if e := exec("UPDATE memory_index SET validity_revision=(SELECT revision FROM memory_items WHERE item_id=?) WHERE item_id=?", m.ID, m.ID); e != nil {
				return e
			}
			if e := exec("DELETE FROM memory_dependencies WHERE owner_kind='memory_revision' AND owner_id IN(SELECT revision_id FROM memory_revisions WHERE item_id=?)", m.ID); e != nil {
				return e
			}
		} else {
			for _, query := range []string{"DELETE FROM memory_revision_bodies WHERE revision_id IN(SELECT revision_id FROM memory_revisions WHERE item_id=?)", "DELETE FROM memory_index WHERE item_id=?", "UPDATE memory_revisions SET source_json='[]',scope_json='[]',derived_json='[]',job_id='' WHERE item_id=?", "UPDATE memory_items SET state='forgotten',revision=revision+1 WHERE item_id=?"} {
				if e := exec(query, m.ID); e != nil {
					return e
				}
			}
		}
	}
	for _, run := range runs {
		if e := scrubEffects(ctx, tx, run); e != nil {
			return e
		}
		if e := exec("UPDATE memory_namespaces SET catalog_revision=catalog_revision+1,suppression_revision=suppression_revision+1 WHERE namespace_id IN(SELECT namespace_id FROM memory_run_contexts WHERE run_id=?)", run); e != nil {
			return e
		}
		for _, query := range []string{
			"DELETE FROM memory_context_entries WHERE run_id=?", "DELETE FROM memory_run_contexts WHERE run_id=?",
			"DELETE FROM memory_candidate_bodies WHERE candidate_id IN(SELECT candidate_id FROM memory_candidates WHERE job_id IN(SELECT job_id FROM memory_jobs WHERE source_run_id=? OR run_id=?))",
			"DELETE FROM memory_candidates WHERE job_id IN(SELECT job_id FROM memory_jobs WHERE source_run_id=? OR run_id=?)",
			"DELETE FROM memory_jobs WHERE source_run_id=? OR run_id=?", "DELETE FROM memory_completion_outbox WHERE source_run_id=?",
			"DELETE FROM memory_global_proposals WHERE actor_run_id=?",
			"DELETE FROM execution_continuations WHERE run_id=?", "DELETE FROM access_approvals WHERE run_id=?", "DELETE FROM execution_checkpoints WHERE run_id=?",
			"DELETE FROM group_publications WHERE child_run_id=?",
			"DELETE FROM collaboration_result_deliveries WHERE child_run_id=? OR parent_run_id=?", "DELETE FROM collaboration_parent_results WHERE run_id=?",
			"DELETE FROM collaboration_wait_edges WHERE from_run_id=? OR to_run_id=?", "DELETE FROM collaboration_messages WHERE from_run_id=? OR to_run_id=? OR root_run_id=?",
			"DELETE FROM collaboration_lineage WHERE output_run_id=?", "DELETE FROM access_delegation_grants WHERE child_run_id=? OR parent_task_id=?",
			"DELETE FROM collaboration_delegations WHERE child_run_id=? OR parent_run_id=? OR root_run_id=?", "DELETE FROM collaboration_threads WHERE root_run_id=?", "DELETE FROM collaboration_proposals WHERE run_id=?", "DELETE FROM collaboration_policy_roots WHERE root_run_id=?",
			"DELETE FROM task_config_pins WHERE run_id=?", "DELETE FROM model_attempts WHERE run_id=?", "DELETE FROM execution_recovery_trees WHERE root_run_id=?", "DELETE FROM execution_events WHERE run_id=?",
		} {
			args := make([]any, strings.Count(query, "?"))
			for i := range args {
				args[i] = run
			}
			if e := exec(query, args...); e != nil {
				return e
			}
		}
		if unknown {
			if e := exec("UPDATE execution_runs SET intent='',source_json='[]',scope_json='[]',grants_json='[]',effective_source_json='[]',effective_scope_json='[]',effective_grants_json='[]',parent_scope_json='null',derived_json='[]',execution_position_json='',checkpoint_ref='',claim_token='',pin_token=NULL,task_config_id='',admission_closed=1,task_admission_closed=1,reason='BODY_DELETED',revision=revision+1 WHERE run_id=?", run); e != nil {
				return e
			}
		} else {
			if e := exec("DELETE FROM execution_runs WHERE run_id=?", run); e != nil {
				return e
			}
		}
	}
	for _, message := range messages {
		if e := exec("DELETE FROM group_publications WHERE message_id=?", message); e != nil {
			return e
		}
		if e := exec("DELETE FROM conversation_messages WHERE message_id=?", message); e != nil {
			return e
		}
	}
	for _, n := range p.Nodes {
		if e := exec("DELETE FROM memory_dependencies WHERE (owner_kind=? AND owner_id=?) OR (ancestor_kind=? AND ancestor_id=?)", n.Kind, n.ID, n.Kind, n.ID); e != nil {
			return e
		}
	}
	if e := exec("DELETE FROM task_config_snapshots WHERE snapshot_id NOT IN(SELECT snapshot_id FROM task_config_pins) AND snapshot_id NOT IN(SELECT task_config_id FROM execution_runs WHERE task_config_id!='')"); e != nil {
		return e
	}
	if e := exec("DELETE FROM config_snapshot_pins WHERE token NOT IN(SELECT pin_token FROM execution_runs WHERE pin_token IS NOT NULL)"); e != nil {
		return e
	}
	if e := exec("DELETE FROM model_budget_accounts WHERE root_run_id NOT IN(SELECT run_id FROM execution_runs) AND account_id NOT IN(SELECT account_id FROM model_attempts)"); e != nil {
		return e
	}
	if e := exec("DELETE FROM memory_global_proposals WHERE scope_kind='session' AND scope_id=?", p.SessionID); e != nil {
		return e
	}
	if e := exec("DELETE FROM access_grants WHERE session_id=?", p.SessionID); e != nil {
		return e
	}
	if unknown {
		return exec("UPDATE conversation_sessions SET title='',workspace_id='',archived=1,body_deleted=1,active_run_id=NULL,revision=revision+1 WHERE session_id=?", p.SessionID)
	}
	if e := exec("DELETE FROM conversation_members WHERE session_id=?", p.SessionID); e != nil {
		return e
	}
	return exec("DELETE FROM conversation_sessions WHERE session_id=?", p.SessionID)
}
func scrubEffects(ctx context.Context, tx *sql.Tx, run string) error {
	rows, err := tx.QueryContext(ctx, "SELECT effect_id,command_epoch,preview_json,reconciliation_fingerprint FROM execution_effects WHERE run_id=? AND state IN('dispatching','unknown_outcome')", run)
	if err != nil {
		return err
	}
	type proof struct{ id, epoch, raw, fingerprint string }
	all := []proof{}
	for rows.Next() {
		var p proof
		if err = rows.Scan(&p.id, &p.epoch, &p.raw, &p.fingerprint); err != nil {
			rows.Close()
			return err
		}
		all = append(all, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, p := range all {
		var preview api.ApprovalPreview
		if json.Unmarshal([]byte(p.raw), &preview) != nil {
			return fault("CONFLICT", "EFFECT_STATE_INVALID")
		}
		var profile string
		if err = tx.QueryRowContext(ctx, "SELECT profile_id FROM profile_metadata WHERE singleton=1").Scan(&profile); err != nil {
			return err
		}
		var approval, revision, expires string
		_ = tx.QueryRowContext(ctx, "SELECT approval_id,CAST(revision AS TEXT),expires_at FROM access_approvals WHERE effect_id=?", p.id).Scan(&approval, &revision, &expires)
		fingerprint := p.fingerprint
		if fingerprint == "" {
			fingerprint = api.EffectFingerprint(api.HostInvokeCommand{ProfileID: profile, CommandEpoch: p.epoch, RunID: run, EffectID: p.id, ApprovalID: approval, ApprovalRevision: revision, ExpiresAt: expires, Preview: preview, Content: preview.Content})
		}
		preview.Content = ""
		preview.Diff = ""
		preview.SourceRefs = []api.SourceSnapshot{}
		if _, err = tx.ExecContext(ctx, "UPDATE execution_effects SET preview_json=?,reconciliation_fingerprint=? WHERE effect_id=?", string(mustJSON(preview)), fingerprint, p.id); err != nil {
			return err
		}
	}
	_, err = tx.ExecContext(ctx, "DELETE FROM execution_effects WHERE run_id=? AND state NOT IN('dispatching','unknown_outcome')", run)
	return err
}

func (s *Sessions) Sources(ctx context.Context, id api.RequestIdentity, token string) ([]string, error) {
	var raw string
	err := s.store.base.Database().QueryRowContext(ctx, "SELECT source_ids_json FROM session_deletions WHERE token=? AND principal_id=?", token, id.PrincipalID()).Scan(&raw)
	if err != nil {
		return nil, err
	}
	var nodes []node
	if json.Unmarshal([]byte(raw), &nodes) != nil {
		return nil, fault("CONFLICT", "SESSION_DELETION_STATE_INVALID")
	}
	out := make([]string, 0, len(nodes))
	for _, n := range nodes {
		out = append(out, n.ID)
	}
	return out, nil
}

func (s *Sessions) Pending(ctx context.Context) ([]sessionapp.PendingDeletion, error) {
	rows, err := s.store.base.Database().QueryContext(ctx, "SELECT token,principal_id,session_id FROM session_deletions WHERE state='pending' ORDER BY token")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []sessionapp.PendingDeletion{}
	for rows.Next() {
		var job sessionapp.PendingDeletion
		if err = rows.Scan(&job.Token, &job.PrincipalID, &job.SessionID); err != nil {
			return nil, err
		}
		out = append(out, job)
	}
	return out, rows.Err()
}

func retentionKey(ids []string) string {
	values := append([]string{}, ids...)
	sort.Strings(values)
	return string(mustJSON(values))
}
