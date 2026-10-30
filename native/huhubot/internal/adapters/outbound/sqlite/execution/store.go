package execution

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	"strconv"
	"sync/atomic"
	"time"
)

type AccessGuard interface {
	AuthorizeInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput) error
	CheckInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, []string) error
}
type Store struct {
	stopping atomic.Bool
	*conv.Store
	claimGate      chan struct{}
	claimAfter     claimCursor
	approvalAfter  string
	parentAfter    ParentCursor
	memoryAfter    MemoryScanCursor
	memory         MemoryHooks
	memoryUsage    assistantstore.UsageReader
	contextAccess  api.ContextAccess
	config         *assistantstore.Store
	access         AccessGuard
	control        Control
	tree           TreeControl
	groupPublisher GroupPublisher
	recovery       RecoveryGuard
}

func (s *Store) SetMemory(h MemoryHooks)                     { s.memory = h }
func (s *Store) SetMemoryUsage(r assistantstore.UsageReader) { s.memoryUsage = r }

func New(base *base.Store, config *assistantstore.Store, access AccessGuard) *Store {
	return &Store{Store: conv.New(base), config: config, access: access, claimGate: make(chan struct{}, 1)}
}
func recipient(a api.Agent) api.GrantRecipient {
	r := api.GrantRecipient{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision}
	if a.Model != nil {
		r.ProviderID = a.Model.ProviderID
		r.ModelID = a.Model.ModelID
		r.Protocol = a.Model.Protocol
		r.Endpoint = a.Model.Endpoint
	}
	return r
}
func jsonArray(v any) string {
	b, _ := json.Marshal(v)
	if string(b) == "null" {
		return "[]"
	}
	return string(b)
}
func (s *Store) StartRun(ctx context.Context, id api.RequestIdentity, c api.RunStart, hash string) (api.RunReceipt, error) {
	var out api.RunReceipt
	if s.stopping.Load() {
		return out, api.Denied("SERVICE_STOPPING")
	}
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if s.stopping.Load() {
			return api.Denied("SERVICE_STOPPING")
		}
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "runs.start", hash, &out)
		if e != nil {
			return e
		}
		if found {
			_, e = conv.ReadSession(ctx, tx, id, c.ProfileID, c.SessionID)
			return e
		}
		if s.recovery != nil {
			if e := s.recovery.CheckInTx(ctx, tx, ""); e != nil {
				return e
			}
		}
		session, e := conv.ReadSession(ctx, tx, id, c.ProfileID, c.SessionID)
		if e != nil {
			return e
		}
		var active sql.NullString
		if e = tx.QueryRowContext(ctx, "SELECT active_run_id FROM conversation_sessions WHERE session_id=?", session.ID).Scan(&active); e != nil {
			return e
		}
		if active.Valid {
			return conv.Fault("SESSION_BUSY", "SESSION_BUSY")
		}
		if session.Archived {
			return conv.Fault("CONFLICT", "SESSION_ARCHIVED")
		}
		if session.Revision != c.ExpectedRevision {
			return conv.Fault("CONFLICT", "REVISION_CONFLICT")
		}
		if c.WorkspaceID != "" && session.WorkspaceID != "" && session.WorkspaceID != c.WorkspaceID {
			return api.Denied("WORKSPACE_MISMATCH")
		}
		if len(c.TargetAgentIDs) > 0 && (len(c.TargetAgentIDs) != 1 || c.TargetAgentIDs[0] != session.MemberIDs[0]) {
			return api.Denied("DIRECT_TARGET_MISMATCH")
		}
		var queued int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled')").Scan(&queued); e != nil {
			return e
		}
		if queued >= 128 {
			return conv.Fault("RESOURCE_LIMIT", "RUN_QUEUE_LIMIT")
		}
		if c.SupersedesMessageID != "" {
			var role string
			if e = tx.QueryRowContext(ctx, "SELECT role FROM conversation_messages WHERE session_id=? AND message_id=?", session.ID, c.SupersedesMessageID).Scan(&role); e != nil || role != "user" {
				return api.Invalid("SUPERSEDED_MESSAGE_INVALID")
			}
		}
		if c.RetryOfRunID != "" {
			var parent string
			if e = tx.QueryRowContext(ctx, "SELECT session_id FROM execution_runs WHERE run_id=?", c.RetryOfRunID).Scan(&parent); e != nil || parent != session.ID {
				return api.Invalid("RETRY_RUN_INVALID")
			}
		}
		snap, e := s.config.PinInTx(ctx, tx, c.ProfileID, session.MemberIDs[0])
		if e != nil {
			return e
		}
		runID := api.NewID("run:")
		input := api.RunAccessInput{ProfileID: c.ProfileID, SessionID: session.ID, TaskID: runID, Recipient: recipient(snap.Agent), Sources: c.SourceRefs, Scopes: c.SourceScopes, GrantIDs: c.GrantIDs}
		userMessage, e := conv.MessageInTx(ctx, tx, session.ID, runID, "user", c.Intent, "", c.SourceRefs, false, c.SupersedesMessageID)
		if e != nil {
			return e
		}
		recipientJSON, _ := json.Marshal(input.Recipient)
		_, e = tx.ExecContext(ctx, "INSERT INTO execution_runs(run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,pin_token,status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at) VALUES(?,?,?,?,?,?,?,?,?,'accepted',1,?,?,?,?,?,?,?,?,'','','','',1,?)", runID, session.ID, id.PrincipalID(), userMessage, string(recipientJSON), snap.Agent.ID, snap.Agent.PersonaRevision, snap.Agent.ModelBindingRevision, snap.Token, c.Intent, jsonArray(c.SourceRefs), jsonArray(c.SourceScopes), jsonArray(c.GrantIDs), jsonArray(c.SourceRefs), jsonArray(c.SourceScopes), jsonArray(c.GrantIDs), c.RetryOfRunID, time.Now().UTC().Format(api.TimestampLayout))
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET root_run_id=run_id,budget_root_run_id=run_id,work_thread_id=session_id WHERE run_id=?", runID); e != nil {
			return e
		}
		if s.memory != nil {
			if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET context_policy_version='extractive-v1' WHERE run_id=?", runID); e != nil {
				return e
			}
		}
		if rootPolicy, ok := s.tree.(interface {
			EnsureRootInTx(context.Context, *sql.Tx, string) error
		}); ok {
			if e = rootPolicy.EnsureRootInTx(ctx, tx, runID); e != nil {
				return e
			}
		}
		if c.RetryOfRunID != "" {
			var budget string
			if e = tx.QueryRowContext(ctx, "SELECT CASE WHEN budget_root_run_id='' THEN root_run_id ELSE budget_root_run_id END FROM execution_runs WHERE run_id=?", c.RetryOfRunID).Scan(&budget); e != nil {
				return e
			}
			if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET budget_root_run_id=? WHERE run_id=?", budget, runID); e != nil {
				return e
			}
		}
		if s.access == nil && (len(c.SourceRefs)+len(c.SourceScopes) > 0) {
			return api.Denied("ACCESS_NOT_ASSEMBLED")
		}
		if s.access != nil {
			if e = s.access.AuthorizeInTx(ctx, tx, id, input); e != nil {
				return e
			}
		}
		result, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET active_run_id=?,revision=revision+1 WHERE session_id=? AND active_run_id IS NULL AND revision=? AND revision<9223372036854775807", runID, session.ID, c.ExpectedRevision)
		if e != nil {
			return e
		}
		n, _ := result.RowsAffected()
		if n != 1 {
			return conv.Fault("CONFLICT", "REVISION_CONFLICT")
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO execution_events VALUES(?,1,'accepted',?,?)", runID, time.Now().UTC().Format(api.TimestampLayout), "{\"userMessageId\":\""+userMessage+"\"}"); e != nil {
			return e
		}
		out = api.RunReceipt{Receipt: api.Receipt{CommandID: c.CommandID, ReceiptID: api.NewID("receipt:"), Revision: "1"}, RunID: runID, Status: "accepted"}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "runs.start", hash, snap.Agent.ID, out)
	})
	return out, e
}

const runAccessColumns = "r.run_id,r.session_id,r.status,CAST(r.revision AS TEXT),r.agent_id,CAST(r.persona_revision AS TEXT),CAST(r.model_revision AS TEXT),r.reason,r.usage_json,r.principal_id,r.pin_token,r.recipient_json,r.effective_source_json,r.effective_scope_json,r.effective_grants_json,s.profile_id,r.retry_of_run_id,r.effects_unresolved,r.root_run_id,r.parent_run_id,r.work_thread_id,r.task_config_id,r.parent_scope_json,r.derived_json,r.budget_root_run_id,r.execution_role,r.group_binding_json"

// Run-only limits are not needed by access delivery; public Run reads still
// project and validate the immutable root policy with the shared scanner.
const runColumns = runAccessColumns + ",COALESCE((SELECT p.policy_json FROM collaboration_policy_roots p WHERE p.root_run_id=CASE WHEN r.root_run_id='' THEN r.run_id ELSE r.root_run_id END),'')"

type runScanner interface{ Scan(...any) error }

func readRun(ctx context.Context, tx *sql.Tx, id string) (api.Run, api.RunAccessInput, string, string, error) {
	return scanRun(tx.QueryRowContext(ctx, "SELECT "+runColumns+" FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", id))
}
func scanRun(row runScanner, limitCaches ...map[string]api.ExecutionLimits) (api.Run, api.RunAccessInput, string, string, error) {
	var r api.Run
	var input api.RunAccessInput
	var principal, pin, recipientJSON, sources, scopes, grants, usage string
	var nullable sql.NullString
	var thread, config, parentScope, derived, limitsJSON, groupJSON string
	e := row.Scan(&r.ID, &r.SessionID, &r.Status, &r.Revision, &r.AgentID, &r.PersonaRevision, &r.ModelBindingRevision, &r.Reason, &usage, &principal, &nullable, &recipientJSON, &sources, &scopes, &grants, &input.ProfileID, &r.RetryOfRunID, &r.EffectsUnresolved, &r.RootRunID, &r.ParentRunID, &thread, &config, &parentScope, &derived, &r.BudgetRootRunID, &r.Role, &groupJSON, &limitsJSON)
	if errors.Is(e, sql.ErrNoRows) {
		return r, input, "", "", conv.Fault("NOT_FOUND", "RUN_NOT_FOUND")
	}
	if e != nil {
		return r, input, "", "", e
	}
	if limitsJSON != "" {
		var limits api.ExecutionLimits
		found := false
		if len(limitCaches) > 0 {
			limits, found = limitCaches[0][limitsJSON]
		}
		if !found {
			if json.Unmarshal([]byte(limitsJSON), &limits) != nil || !api.ValidExecutionLimits(limits) {
				return r, input, "", "", conv.Fault("CONFLICT", "POLICY_STATE_INVALID")
			}
			if len(limitCaches) > 0 {
				limitCaches[0][limitsJSON] = limits
			}
		}
		r.Limits = &limits
	}
	if nullable.Valid {
		pin = nullable.String
	}
	if r.RootRunID == "" {
		r.RootRunID = r.ID
	}
	if json.Unmarshal([]byte(groupJSON), &input.Group) != nil {
		return r, input, "", "", conv.Fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	r.Group = input.Group
	input.SessionID = r.SessionID
	input.TaskID = r.ID
	if json.Unmarshal([]byte(recipientJSON), &input.Recipient) != nil || json.Unmarshal([]byte(sources), &input.Sources) != nil || json.Unmarshal([]byte(scopes), &input.Scopes) != nil || json.Unmarshal([]byte(grants), &input.GrantIDs) != nil {
		return r, input, "", "", conv.Fault("CONFLICT", "RUN_CONTEXT_INVALID")
	}
	if json.Unmarshal([]byte(parentScope), &input.ParentScope) != nil {
		return r, input, "", "", conv.Fault("CONFLICT", "RUN_CONTEXT_INVALID")
	}
	if usage != "" {
		r.Usage = &api.RunUsage{}
		if json.Unmarshal([]byte(usage), r.Usage) != nil {
			return r, input, "", "", conv.Fault("CONFLICT", "RUN_USAGE_INVALID")
		}
	}
	return r, input, principal, pin, nil
}
func (s *Store) GetRun(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Run, api.RunAccessInput, error) {
	var r api.Run
	var input api.RunAccessInput
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Metadata(ctx, tx, q.ProfileID); e != nil {
			return e
		}
		var e error
		var principal string
		r, input, principal, _, e = readRun(ctx, tx, q.ID)
		if e != nil {
			return e
		}
		if principal != id.PrincipalID() {
			return api.Denied("SESSION_READ_DENIED")
		}
		_, e = conv.ReadSession(ctx, tx, id, q.ProfileID, r.SessionID)
		if e != nil {
			return e
		}
		if reader, ok := s.recovery.(interface {
			ReadRecoveryStatusInTx(context.Context, *sql.Tx, api.RequestIdentity, api.IDQuery) (api.RecoveryStatus, error)
		}); ok {
			status, e := reader.ReadRecoveryStatusInTx(ctx, tx, id, q)
			if e != nil {
				return e
			}
			if status.State != "none" {
				r.Recovery = &status
			}
		}
		if reader, ok := s.memory.(ContextUsageReader); ok && r.Role != "orchestration" {
			r.ContextUsage, e = reader.ContextUsageInTx(ctx, tx, id, q.ProfileID, r.ID)
			if e != nil {
				return e
			}
		}
		return nil
	})
	return r, input, e
}
func (s *Store) SnapshotUsageInTx(ctx context.Context, tx *sql.Tx, agent string) (api.AgentUsage, error) {
	u := api.AgentUsage{Unassembled: []string{"memory"}}
	var revision, clock string
	if e := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&revision); e != nil {
		return u, e
	}
	if e := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM assistant_usage_clock WHERE singleton=1").Scan(&clock); e != nil {
		return u, e
	}
	u.RevisionToken = "conversation:" + revision + ":" + clock
	rows, e := tx.QueryContext(ctx, "SELECT run_id FROM execution_runs WHERE agent_id=? AND (status NOT IN('succeeded','failed','canceled') OR effects_unresolved=1 OR EXISTS(SELECT 1 FROM model_attempts m WHERE m.run_id=execution_runs.run_id AND m.state='dispatched' AND m.producer_ended=0)) ORDER BY run_id", agent)
	if e != nil {
		return u, e
	}
	for rows.Next() {
		var v string
		if e = rows.Scan(&v); e != nil {
			_ = rows.Close()
			return u, e
		}
		u.ActiveRunIDs = append(u.ActiveRunIDs, v)
	}
	e = rows.Err()
	_ = rows.Close()
	if e != nil {
		return u, e
	}
	rows, e = tx.QueryContext(ctx, "SELECT m.session_id,s.kind FROM conversation_members m JOIN conversation_sessions s ON s.session_id=m.session_id WHERE m.agent_id=? AND m.active=1 ORDER BY m.session_id", agent)
	if e != nil {
		return u, e
	}
	for rows.Next() {
		var v, kind string
		if e = rows.Scan(&v, &kind); e != nil {
			_ = rows.Close()
			return u, e
		}
		if kind == "group" {
			u.GroupIDs = append(u.GroupIDs, v)
		} else {
			u.SessionIDs = append(u.SessionIDs, v)
		}
	}
	e = rows.Err()
	_ = rows.Close()
	if e != nil {
		return u, e
	}
	if s.memoryUsage != nil {
		m, err := s.memoryUsage.SnapshotUsageInTx(ctx, tx, agent)
		if err != nil {
			return u, err
		}
		if m.RevisionToken == "" {
			return u, conv.Fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
		u.MemoryIDs = append([]string{}, m.MemoryIDs...)
		u.Unassembled = append([]string{}, m.Unassembled...)
		b, err := json.Marshal([]string{"agent-usage-v1", u.RevisionToken, m.RevisionToken})
		if err != nil {
			return u, err
		}
		digest := sha256.Sum256(b)
		u.RevisionToken = "sha256:" + hex.EncodeToString(digest[:])
	}
	return u, nil
}
func (s *Store) SnapshotUsage(ctx context.Context, agent string) (api.AgentUsage, error) {
	var u api.AgentUsage
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; u, e = s.SnapshotUsageInTx(ctx, tx, agent); return e })
	return u, e
}
func AddEventInTx(ctx context.Context, tx *sql.Tx, runID, eventType string, body any) error {
	b, e := json.Marshal(body)
	if e != nil {
		return e
	}
	var seq int64
	if e = tx.QueryRowContext(ctx, "UPDATE execution_runs SET event_seq=event_seq+1 WHERE run_id=? AND event_seq<9223372036854775807 RETURNING event_seq", runID).Scan(&seq); e != nil {
		return e
	}
	_, e = tx.ExecContext(ctx, "INSERT INTO execution_events VALUES(?,?,?,?,?)", runID, seq, eventType, time.Now().UTC().Format(api.TimestampLayout), string(b))
	return e
}
func next(v string) string { n, _ := strconv.ParseInt(v, 10, 64); return strconv.FormatInt(n+1, 10) }

var _ directapp.Repository = (*Store)(nil)

// ReadInTx is the sole adapter-level Run/current ownership projection. Callers
// reuse the existing transaction and then apply their current read policy.
func ReadInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (api.Run, api.RunAccessInput, error) {
	var r api.Run
	var input api.RunAccessInput
	if _, e := conv.Metadata(ctx, tx, q.ProfileID); e != nil {
		return r, input, e
	}
	r, input, principal, _, e := readRun(ctx, tx, q.ID)
	if e != nil {
		return r, input, e
	}
	if principal != id.PrincipalID() {
		return api.Run{}, api.RunAccessInput{}, api.Denied("SESSION_READ_DENIED")
	}
	_, e = conv.ReadSession(ctx, tx, id, q.ProfileID, r.SessionID)
	return r, input, e
}

// Control is adapter-only: approvals and Run execution share this UoW without
// introducing SQL into the application port or a second execution database.
type Control interface {
	ExpireInTx(context.Context, *sql.Tx) error
	ReadyInTx(context.Context, *sql.Tx, string) ([]string, error)
	ClaimInTx(context.Context, *sql.Tx, string, string) (*api.RunContinuation, error)
	FinalizeInTx(context.Context, *sql.Tx, string) (bool, error)
	BlockInTx(context.Context, *sql.Tx, string) error
}

func (s *Store) SetControl(c Control) { s.control = c }
