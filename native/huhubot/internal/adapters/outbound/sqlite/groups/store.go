package groups

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/conversation/group"
)

type Policy interface {
	EnsureRootInTx(context.Context, *sql.Tx, string) error
	AdmitInTx(context.Context, *sql.Tx, string, string, bool) error
}
type Access interface {
	CheckInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, []string) error
	WithReadFence(context.Context, func(context.Context) error) error
}
type Canceler interface {
	CancelSubtreeInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string) ([]string, error)
}
type Control interface{ CancelRun(string) }
type Store struct {
	base     *base.Store
	runs     *execution.Store
	config   *assistant.Store
	policy   Policy
	access   Access
	canceler Canceler
	control  Control
}

func New(b *base.Store, runs *execution.Store, config *assistant.Store, policy Policy, access Access) *Store {
	return &Store{base: b, runs: runs, config: config, policy: policy, access: access}
}
func (s *Store) SetCanceler(c Canceler) { s.canceler = c }
func (s *Store) SetControl(c Control)   { s.control = c }
func fault(kind, reason string) error   { return &api.Fault{Kind: kind, Reason: reason} }
func encode(v any) string               { b, _ := json.Marshal(v); return string(b) }
func (s *Store) enabled(ctx context.Context, tx *sql.Tx, profile, agent string) error {
	a, e := s.config.ReadAgentInTx(ctx, tx, profile, agent)
	if e != nil {
		return e
	}
	if !a.Enabled {
		return fault("CONFLICT", "AGENT_DISABLED")
	}
	return nil
}
func (s *Store) CreateSession(ctx context.Context, id api.RequestIdentity, c api.SessionCreate, hash string) (api.Session, error) {
	var out api.Session
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "sessions.create", hash, &out)
		if e != nil || found {
			return e
		}
		for _, a := range c.MemberIDs {
			if e = s.enabled(ctx, tx, c.ProfileID, a); e != nil {
				return e
			}
		}
		out = api.Session{ID: api.NewID("session:"), Revision: "1", Kind: "group", Title: c.Title, MemberIDs: append([]string{}, c.MemberIDs...), CoordinatorID: c.CoordinatorID, WorkspaceID: c.WorkspaceID}
		if _, e = tx.ExecContext(ctx, "INSERT INTO conversation_sessions(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,coordinator_id) VALUES(?,?,?,'group',?,?,1,0,?)", out.ID, c.ProfileID, id.PrincipalID(), c.Title, c.WorkspaceID, c.CoordinatorID); e != nil {
			return e
		}
		for _, a := range c.MemberIDs {
			if _, e = tx.ExecContext(ctx, "INSERT INTO conversation_members(session_id,agent_id,incarnation) VALUES(?,?,?)", out.ID, a, "1"); e != nil {
				return e
			}
		}
		out, e = conv.ReadSession(ctx, tx, id, c.ProfileID, out.ID)
		if e != nil {
			return e
		}
		if e = bumpUsage(ctx, tx); e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "sessions.create", hash, "", out)
	})
	return out, err
}
func member(ctx context.Context, tx *sql.Tx, session, agent string) (api.GroupMemberIdentity, error) {
	out := api.GroupMemberIdentity{AgentID: agent}
	e := tx.QueryRowContext(ctx, "SELECT incarnation,CAST(history_revision AS TEXT) FROM conversation_members WHERE session_id=? AND agent_id=? AND active=1", session, agent).Scan(&out.Incarnation, &out.HistoryRevision)
	if errors.Is(e, sql.ErrNoRows) {
		e = api.Denied("GROUP_MEMBER_REMOVED")
	}
	return out, e
}
func (s *Store) StartRun(ctx context.Context, id api.RequestIdentity, c api.RunStart, hash string) (api.RunReceipt, error) {
	var out api.RunReceipt
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "runs.start", hash, &out)
		if e != nil || found {
			return e
		}
		session, e := conv.ReadSession(ctx, tx, id, c.ProfileID, c.SessionID)
		if e != nil {
			return e
		}
		if session.Kind != "group" {
			return api.Invalid("GROUP_SESSION_REQUIRED")
		}
		targets, reason := domain.Targets(session.MemberIDs, session.CoordinatorID, c.TargetAgentIDs)
		if reason != "" {
			return api.Invalid(reason)
		}
		bindings := make([]api.GroupMemberIdentity, 0, len(targets))
		for _, a := range targets {
			if e = s.enabled(ctx, tx, c.ProfileID, a); e != nil {
				return e
			}
			m, e := member(ctx, tx, session.ID, a)
			if e != nil {
				return e
			}
			bindings = append(bindings, m)
		}
		c.TargetAgentIDs = targets
		root, e := s.runs.NewGroupRootInTx(ctx, tx, id, c)
		if e != nil {
			return e
		}
		targetRuns := []string{}
		for _, m := range bindings {
			if e = s.policy.AdmitInTx(ctx, tx, root.ID, root.ID, false); e != nil {
				return e
			}
			runID, thread, delegationID := api.NewID("run:"), api.NewID("thread:"), api.NewID("delegation:")
			binding := &api.GroupBinding{SessionID: session.ID, Members: []api.GroupMemberIdentity{m}}
			in := api.RunAccessInput{ProfileID: c.ProfileID, SessionID: session.ID, TaskID: runID, Sources: c.SourceRefs, Scopes: c.SourceScopes, GrantIDs: c.GrantIDs, Group: binding}
			child, e := s.runs.NewChildInTx(ctx, tx, id, execution.ChildAdmission{UserBatch: true, Group: binding, ParentRunID: root.ID, ChildRunID: runID, WorkThreadID: thread, Task: c.Intent, TargetAgentID: m.AgentID, Access: in, Derived: []api.DerivedInput{}})
			if e != nil {
				return e
			}
			targetRuns = append(targetRuns, child.ID)
			now := time.Now().UTC().Format(time.RFC3339Nano)
			if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_threads VALUES(?,?,?,?,?,?)", thread, root.ID, session.ID, id.PrincipalID(), child.AgentID, now); e != nil {
				return e
			}
			if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_delegations(delegation_id,root_run_id,parent_run_id,child_run_id,work_thread_id,requester_agent_id,executor_agent_id,target_agent_id,principal_id,intent_id,input_hash,constraints_json,expected_output,context_json,created_at) VALUES(?,?,?,?,?,'',?,?,?,?,?,'[]','','{}',?)", delegationID, root.ID, root.ID, child.ID, thread, child.AgentID, m.AgentID, id.PrincipalID(), c.IdempotencyKey+":"+m.AgentID, hash, now); e != nil {
				return e
			}
			if e = execution.AddEventInTx(ctx, tx, root.ID, "delegation.accepted", map[string]string{"delegationId": delegationID, "childRunId": child.ID}); e != nil {
				return e
			}
		}
		out = api.RunReceipt{TargetRunIDs: targetRuns, Receipt: api.Receipt{CommandID: c.CommandID, ReceiptID: api.NewID("receipt:"), Revision: "1"}, RunID: root.ID, Status: root.Status}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "runs.start", hash, "", out)
	})
	return out, err
}
func validateHistory(ctx context.Context, tx *sql.Tx, session string, scope api.GroupHistoryScope) error {
	if scope.Kind == "none" {
		if scope.AfterSeq != "" || scope.ThroughSeq != "" {
			return api.Invalid("INVALID_GROUP_HISTORY_SCOPE")
		}
		return nil
	}
	after, e := strconv.ParseInt(scope.AfterSeq, 10, 64)
	if e != nil || after < 0 || strconv.FormatInt(after, 10) != scope.AfterSeq {
		return api.Invalid("INVALID_GROUP_HISTORY_SCOPE")
	}
	through, e := strconv.ParseInt(scope.ThroughSeq, 10, 64)
	if scope.Kind != "range" || e != nil || through <= after || strconv.FormatInt(through, 10) != scope.ThroughSeq {
		return api.Invalid("INVALID_GROUP_HISTORY_SCOPE")
	}
	for _, seq := range []int64{after, through} {
		if seq == 0 {
			continue
		}
		var n int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM conversation_messages WHERE session_id=? AND seq=?", session, seq).Scan(&n); e != nil {
			return e
		}
		if n != 1 {
			return api.Invalid("GROUP_HISTORY_BOUNDARY_NOT_FOUND")
		}
	}
	return nil
}
func (s *Store) SetCoordinator(ctx context.Context, id api.RequestIdentity, c api.SessionCoordinatorUpdate, hash string) (api.Session, error) {
	var out api.Session
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "sessions.setCoordinator", hash, &out)
		if e != nil || found {
			return e
		}
		out, e = conv.ReadSession(ctx, tx, id, c.ProfileID, c.ID)
		if e != nil {
			return e
		}
		if out.Kind != "group" {
			return api.Invalid("GROUP_SESSION_REQUIRED")
		}
		if out.Revision != c.ExpectedRevision {
			return fault("CONFLICT", "REVISION_CONFLICT")
		}
		var active sql.NullString
		if e = tx.QueryRowContext(ctx, "SELECT active_run_id FROM conversation_sessions WHERE session_id=?", c.ID).Scan(&active); e != nil {
			return e
		}
		if active.Valid {
			return fault("SESSION_BUSY", "SESSION_BUSY")
		}
		if _, e = member(ctx, tx, c.ID, c.CoordinatorID); e != nil {
			return e
		}
		if e = s.enabled(ctx, tx, c.ProfileID, c.CoordinatorID); e != nil {
			return e
		}
		r, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET coordinator_id=?,revision=revision+1 WHERE session_id=? AND revision=? AND revision<9223372036854775807", c.CoordinatorID, c.ID, c.ExpectedRevision)
		if e != nil {
			return e
		}
		n, e := r.RowsAffected()
		if e != nil {
			return e
		}
		if n != 1 {
			return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
		}
		out, e = conv.ReadSession(ctx, tx, id, c.ProfileID, c.ID)
		if e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "sessions.setCoordinator", hash, "", out)
	})
	return out, err
}
