package execution

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// GroupPublisher checks the current member before any result ledger write, then
// publishes only the direct member's terminal result in the same transaction.
type GroupPublisher interface {
	CheckResultInTx(context.Context, *sql.Tx, string, *api.EngineResult) error
	PublishInTx(context.Context, *sql.Tx, string, *api.EngineResult) error
}

func (s *Store) SetGroupPublisher(p GroupPublisher) { s.groupPublisher = p }

// NewGroupRootInTx creates an application orchestration intent. It has no Agent
// configuration, model recipient or model claim. The caller validates all group
// targets and writes their user-batch edges and receipt in this same UoW.
func (s *Store) NewGroupRootInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c api.RunStart) (api.Run, error) {
	if s.stopping.Load() {
		return api.Run{}, api.Denied("SERVICE_STOPPING")
	}
	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, ""); e != nil {
			return api.Run{}, e
		}
	}
	var out api.Run
	session, e := conv.ReadSession(ctx, tx, id, c.ProfileID, c.SessionID)
	if e != nil {
		return out, e
	}
	if session.Kind != "group" {
		return out, api.Invalid("GROUP_SESSION_REQUIRED")
	}
	var active sql.NullString
	if e = tx.QueryRowContext(ctx, "SELECT active_run_id FROM conversation_sessions WHERE session_id=?", session.ID).Scan(&active); e != nil {
		return out, e
	}
	if active.Valid {
		return out, conv.Fault("SESSION_BUSY", "SESSION_BUSY")
	}
	if session.Archived {
		return out, conv.Fault("CONFLICT", "SESSION_ARCHIVED")
	}
	if session.Revision != c.ExpectedRevision {
		return out, conv.Fault("CONFLICT", "REVISION_CONFLICT")
	}
	if c.WorkspaceID != "" && session.WorkspaceID != "" && c.WorkspaceID != session.WorkspaceID {
		return out, api.Denied("WORKSPACE_MISMATCH")
	}
	var queued int
	if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled')").Scan(&queued); e != nil {
		return out, e
	}
	if queued+len(c.TargetAgentIDs)+1 > 128 {
		return out, conv.Fault("RESOURCE_LIMIT", "RUN_QUEUE_LIMIT")
	}
	if c.SupersedesMessageID != "" {
		var role string
		if e = tx.QueryRowContext(ctx, "SELECT role FROM conversation_messages WHERE session_id=? AND message_id=?", session.ID, c.SupersedesMessageID).Scan(&role); e != nil || role != "user" {
			return out, api.Invalid("SUPERSEDED_MESSAGE_INVALID")
		}
	}
	if c.RetryOfRunID != "" {
		var oldSession string
		if e = tx.QueryRowContext(ctx, "SELECT session_id FROM execution_runs WHERE run_id=?", c.RetryOfRunID).Scan(&oldSession); e != nil || oldSession != session.ID {
			return out, api.Invalid("RETRY_RUN_INVALID")
		}
	}
	runID := api.NewID("run:")
	// The user's own text is not model-derived source content. Attachments are
	// retained on every actual target Run, with that target's exact recipient.
	user, e := conv.MessageInTx(ctx, tx, session.ID, runID, "user", c.Intent, "", nil, false, c.SupersedesMessageID)
	if e != nil {
		return out, e
	}
	if len(c.SourceRefs)+len(c.SourceScopes) > 0 {
		attachments := api.MessageAttachments{SourceRefs: append([]api.SourceSnapshot{}, c.SourceRefs...), SourceScopes: append([]api.SourceScope{}, c.SourceScopes...)}
		if _, e = tx.ExecContext(ctx, "UPDATE conversation_messages SET attachments_json=? WHERE message_id=?", jsonArray(attachments), user); e != nil {
			return out, e
		}
	}
	group := api.GroupBinding{SessionID: session.ID, Members: []api.GroupMemberIdentity{}}
	binding, _ := json.Marshal(group)
	_, e = tx.ExecContext(ctx, `INSERT INTO execution_runs(run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at,root_run_id,parent_run_id,work_thread_id,budget_root_run_id,execution_role,admission_kind,group_binding_json) VALUES(?,?,?,?,'{}','',0,0,'waiting_children',1,?,'[]','[]','[]','[]','[]','[]',?,'','CHILDREN_ACTIVE','','',1,?,?,'',?,?,'orchestration','user_root',?)`, runID, session.ID, id.PrincipalID(), user, c.Intent, c.RetryOfRunID, time.Now().UTC().Format(time.RFC3339Nano), runID, session.ID, runID, string(binding))
	if e != nil {
		return out, e
	}
	if rootPolicy, ok := s.tree.(interface {
		EnsureRootInTx(context.Context, *sql.Tx, string) error
	}); ok {
		if e = rootPolicy.EnsureRootInTx(ctx, tx, runID); e != nil {
			return out, e
		}
	}
	if c.RetryOfRunID != "" {
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET budget_root_run_id=(SELECT CASE WHEN budget_root_run_id='' THEN root_run_id ELSE budget_root_run_id END FROM execution_runs WHERE run_id=?) WHERE run_id=?", c.RetryOfRunID, runID); e != nil {
			return out, e
		}
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO execution_events VALUES(?,1,'accepted',?,?)", runID, time.Now().UTC().Format(time.RFC3339Nano), jsonArray(map[string]string{"userMessageId": user})); e != nil {
		return out, e
	}
	if e = AddEventInTx(ctx, tx, runID, "waiting_children", map[string]string{"status": "waiting_children"}); e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_parent_results(run_id,result_json,state) VALUES(?,?,'waiting')", runID, jsonArray(api.EngineResult{Status: "finished"})); e != nil {
		return out, e
	}
	r, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET active_run_id=?,revision=revision+1 WHERE session_id=? AND revision=? AND active_run_id IS NULL AND revision<9223372036854775807", runID, session.ID, c.ExpectedRevision)
	if e != nil {
		return out, e
	}
	n, e := r.RowsAffected()
	if e != nil {
		return out, e
	}
	if n != 1 {
		return out, conv.Fault("CONFLICT", "REVISION_CONFLICT")
	}
	out, _, _, _, e = readRun(ctx, tx, runID)
	return out, e
}

func groupJSON(group *api.GroupBinding) string { b, _ := json.Marshal(group); return string(b) }
