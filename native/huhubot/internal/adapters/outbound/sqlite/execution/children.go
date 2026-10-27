package execution

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	"time"
)

type ChildAdmission struct {
	UserBatch                                                                    bool
	Group                                                                        *api.GroupBinding
	ReplyRoot                                                                    bool
	RetryOfRunID                                                                 string
	ParentRunID, ParentClaimToken, ChildRunID, WorkThreadID, Task, TargetAgentID string
	Temporary                                                                    *api.TaskConfigDraft
	Access                                                                       api.RunAccessInput
	Derived                                                                      []api.DerivedInput
}
type ChildAccessDeriver interface {
	DeriveChildInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, api.RunAccessInput) (api.RunAccessInput, error)
}

// NewChildInTx is the sole Run/config writer for delegation. The caller owns
// policy counters, task/lineage/receipt and this helper in the same transaction.
func (s *Store) NewChildInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c ChildAdmission) (api.Run, error) {
	if s.stopping.Load() {
		return api.Run{}, api.Denied("SERVICE_STOPPING")
	}
	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, c.ParentRunID); e != nil {
			return api.Run{}, e
		}
	}
	var out api.Run
	parent, parentAccess, e := ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: c.Access.ProfileID, ID: c.ParentRunID})
	if e != nil {
		return out, e
	}
	var claim, budgetRoot, oldConfig, oldThread string
	var closed, cancel, taskClosed int
	if e = tx.QueryRowContext(ctx, "SELECT claim_token,admission_closed,cancel_epoch,task_admission_closed,budget_root_run_id,task_config_id,work_thread_id FROM execution_runs WHERE run_id=?", parent.ID).Scan(&claim, &closed, &cancel, &taskClosed, &budgetRoot, &oldConfig, &oldThread); e != nil {
		return out, e
	}
	if budgetRoot == "" {
		budgetRoot = parent.RootRunID
	}
	if c.ChildRunID == "" || c.WorkThreadID == "" || c.Task == "" {
		return out, api.Invalid("INVALID_CHILD_ADMISSION")
	}
	var snap api.TaskConfigSnapshot
	var pin string
	rootID, parentID := parent.RootRunID, parent.ID
	if c.ReplyRoot {
		if c.ParentClaimToken != "" || c.RetryOfRunID != parent.ID || c.WorkThreadID != oldThread || oldConfig == "" || c.TargetAgentID != "" || c.Temporary != nil || (parent.Status != "succeeded" && parent.Status != "failed" && parent.Status != "canceled") {
			return out, api.Denied("INVALID_TASK_REPLY")
		}
		snap, e = s.config.CloneTaskInTx(ctx, tx, id, c.Access.ProfileID, oldConfig)
		if e != nil {
			return out, e
		}
		rootID, parentID = c.ChildRunID, ""
	} else {
		if c.UserBatch {
			if parent.Role != "orchestration" || parent.Status != "waiting_children" || closed != 0 || taskClosed != 0 || cancel != 0 || c.ParentClaimToken != "" || c.Temporary != nil || c.TargetAgentID == "" || c.Group == nil || c.Group.SessionID != parent.SessionID || len(c.Group.Members) != 1 || c.Group.Members[0].AgentID != c.TargetAgentID {
				return out, api.Denied("INVALID_USER_BATCH_EDGE")
			}
			var parentIntent, userMessage string
			if e = tx.QueryRowContext(ctx, "SELECT intent,user_message_id FROM execution_runs WHERE run_id=?", parent.ID).Scan(&parentIntent, &userMessage); e != nil {
				return out, e
			}
			if c.Task != parentIntent || userMessage == "" {
				return out, api.Denied("INVALID_USER_BATCH_INTENT")
			}
			digest := sha256.Sum256([]byte(parentIntent))
			c.Derived = []api.DerivedInput{{Kind: "message", ID: userMessage, Revision: "1", Hash: "sha256:" + hex.EncodeToString(digest[:]), Namespace: parent.SessionID, WorkThreadID: parent.SessionID}}
			m := c.Group.Members[0]
			var inc, history string
			if e = tx.QueryRowContext(ctx, "SELECT CAST(incarnation AS TEXT),CAST(history_revision AS TEXT) FROM conversation_members WHERE session_id=? AND agent_id=? AND active=1", parent.SessionID, c.TargetAgentID).Scan(&inc, &history); e != nil {
				if e == sql.ErrNoRows {
					return out, api.Denied("GROUP_MEMBER_REMOVED")
				}
				return out, e
			}
			if m.Incarnation != inc || m.HistoryRevision != history {
				return out, api.Denied("GROUP_MEMBER_GENERATION_CHANGED")
			}
		} else {
			if (parent.Status != "running" && parent.Status != "preparing") || closed != 0 || taskClosed != 0 || cancel != 0 || c.ParentClaimToken == "" || claim != c.ParentClaimToken {
				return out, api.Denied("PARENT_ADMISSION_CLOSED")
			}
		}
		if (c.Temporary == nil) == (c.TargetAgentID == "") {
			return out, api.Invalid("INVALID_CHILD_ADMISSION")
		}
		subject := c.TargetAgentID
		if c.Temporary != nil {
			subject = api.NewID("temporary:")
		}
		snap, pin, e = s.config.PinTaskInTx(ctx, tx, id, c.Access.ProfileID, subject, c.ChildRunID, c.TargetAgentID, c.Temporary)
		if e != nil {
			return out, e
		}
	}

	in := c.Access
	in.Group = parentAccess.Group
	if c.UserBatch {
		in.Group = c.Group
	}
	in.SessionID = parent.SessionID
	in.TaskID = c.ChildRunID
	in.Recipient = recipient(snap.Agent)
	if snap.Kind == "temporary" {
		in.Recipient.SubjectKind = "temporary"
		in.Recipient.SponsorAgentID = snap.SponsorAgentID
		draft := api.AgentDraft{Name: snap.Agent.Name, Description: snap.Agent.Description, Persona: snap.Agent.Persona, AllowedTools: snap.Agent.AllowedTools, AllowedCollaborationTargets: snap.Agent.AllowedCollaborationTargets}
		if snap.Agent.Model != nil {
			model := snap.Agent.Model.ModelBindingDraft
			draft.Model = &model
		}
		in.Recipient.ConfigurationHash = api.CanonicalTaskConfigHash(api.TaskConfigDraft{SponsorAgentID: snap.SponsorAgentID, Draft: draft})
	}
	if c.UserBatch {
		in.ParentScope = nil
	} else {
		in.ParentScope = &api.AccessScope{Sources: append([]api.SourceSnapshot{}, parentAccess.Sources...), Scopes: append([]api.SourceScope{}, parentAccess.Scopes...), GrantIDs: append([]string{}, parentAccess.GrantIDs...)}
	}
	var legacy any
	if pin != "" {
		legacy = pin
	}
	parentScope, _ := json.Marshal(in.ParentScope)
	derived, _ := json.Marshal(c.Derived)
	_, e = tx.ExecContext(ctx, "INSERT INTO execution_runs(run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,pin_token,status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at,root_run_id,parent_run_id,work_thread_id,task_config_id,parent_scope_json,derived_json) VALUES(?,?,?,'',?,?,?,?,?,'accepted',1,?,?,?,?,?,?,?,'','','','','',1,?,?,?,?,?,?,?)", c.ChildRunID, parent.SessionID, id.PrincipalID(), jsonArray(in.Recipient), snap.Agent.ID, snap.Agent.PersonaRevision, snap.Agent.ModelBindingRevision, legacy, c.Task, jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), time.Now().UTC().Format(time.RFC3339Nano), rootID, parentID, c.WorkThreadID, snap.ID, string(parentScope), string(derived))
	if e != nil {
		return out, e
	}
	admission := "model"
	if c.UserBatch {
		admission = "user_batch"
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET budget_root_run_id=?,retry_of_run_id=?,group_binding_json=?,admission_kind=? WHERE run_id=?", budgetRoot, c.RetryOfRunID, groupJSON(in.Group), admission, c.ChildRunID); e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO task_config_pins VALUES(?,?,?)", api.NewID("task-pin:"), snap.ID, c.ChildRunID); e != nil {
		return out, e
	}
	if rootPolicy, ok := s.tree.(interface {
		EnsureRootInTx(context.Context, *sql.Tx, string) error
	}); ok {
		if e = rootPolicy.EnsureRootInTx(ctx, tx, rootID); e != nil {
			return out, e
		}
	}
	if deriver, ok := s.access.(ChildAccessDeriver); ok && !c.UserBatch {
		in, e = deriver.DeriveChildInTx(ctx, tx, id, parentAccess, in)
		if e != nil {
			return out, e
		}
	} else if !c.UserBatch && len(in.Sources)+len(in.Scopes) > 0 {
		return out, api.Denied("CHILD_ACCESS_NOT_ASSEMBLED")
	}
	if s.access == nil && len(in.Sources)+len(in.Scopes) > 0 {
		return out, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	if s.access != nil {
		if c.UserBatch {
			e = s.access.CheckInTx(ctx, tx, id, in, []string{"read", "send", "deliver"})
		} else {
			e = s.access.AuthorizeInTx(ctx, tx, id, in)
		}
		if e != nil {
			return out, e
		}
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET recipient_json=?,source_json=?,scope_json=?,grants_json=?,effective_source_json=?,effective_scope_json=?,effective_grants_json=?,parent_scope_json=?,group_binding_json=? WHERE run_id=?", jsonArray(in.Recipient), jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), string(parentScope), groupJSON(in.Group), c.ChildRunID); e != nil {
		return out, e
	}
	if s.memory != nil {
		if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET context_policy_version='extractive-v1' WHERE run_id=?", c.ChildRunID); e != nil {
			return out, e
		}
	}
	// A new Run starts at head 1 and must own that accepted event. Appending
	// would advance the head to 2 without ever creating the required seq 1.
	if _, e = tx.ExecContext(ctx, "INSERT INTO execution_events VALUES(?,1,'accepted',?,?)", c.ChildRunID, time.Now().UTC().Format(time.RFC3339Nano), jsonArray(map[string]string{"parentRunId": parentID, "rootRunId": rootID})); e != nil {
		return out, e
	}
	out, _, _, _, e = readRun(ctx, tx, c.ChildRunID)
	return out, e
}

// ParentCursor is adapter-only scheduling state, never permission evidence.
type ParentCursor struct{ CreatedAt, RunID string }

// ParentReady carries one selected result and the bounded scan's actual
// progress. A zero Next restarts at the beginning after a short exhausted page.
// The outer Claim owns cursor publication after its SQL transaction commits.
type ParentReady struct {
	RunID  string
	Result *api.EngineResult
	Next   ParentCursor
}

// TreeControl is adapter-only. All callbacks share this transaction; none may
// wait for a model, Host or another execution while holding the SQL connection.
type TreeControl interface {
	ClaimInTx(context.Context, *sql.Tx, string) (bool, error)
	ProducerEndedInTx(context.Context, *sql.Tx, string) error
	FinalizeInTx(context.Context, *sql.Tx, string, *api.EngineResult) error
	ReadyParentInTx(context.Context, *sql.Tx, ParentCursor) (ParentReady, error)
}

func (s *Store) SetTreeControl(control TreeControl) { s.tree = control }

func (s *Store) ProducerEnded(ctx context.Context, w executorapp.Work) error {
	return s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if s.tree != nil {
			if e := s.tree.ProducerEndedInTx(ctx, tx, w.Run.ID); e != nil {
				return e
			}
		}
		return s.ReleaseTerminalPinsInTx(ctx, tx, w.Run.ID)
	})
}

// ReleaseTerminalPinsInTx is also called after the last real HTTP producer
// settles. Engine completion alone does not prove that producer has stopped.
func (s *Store) ReleaseTerminalPinsInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	var status string
	var unresolved, active int
	var pin sql.NullString
	if e := tx.QueryRowContext(ctx, "SELECT status,effects_unresolved,pin_token FROM execution_runs WHERE run_id=?", runID).Scan(&status, &unresolved, &pin); e != nil {
		return e
	}
	if status != "canceled" && status != "failed" && status != "succeeded" {
		return nil
	}
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM model_attempts WHERE run_id=? AND state='dispatched' AND producer_ended=0", runID).Scan(&active); e != nil {
		return e
	}
	retain := unresolved != 0 || active != 0
	if pin.Valid && !retain {
		if e := s.config.ReleaseInTx(ctx, tx, pin.String); e != nil {
			return e
		}
	}
	return s.config.ReleaseTaskInTx(ctx, tx, runID, retain)
}

func (s *Store) ReadExecutionConfigInTx(ctx context.Context, tx *sql.Tx, runID string) (api.TaskConfigSnapshot, api.ExecutionLineage, error) {
	var cfg api.TaskConfigSnapshot
	var lineage api.ExecutionLineage
	var config, thread, root, parent, derived, cancel, budgetRoot, role, group string
	var pin sql.NullString
	e := tx.QueryRowContext(ctx, "SELECT task_config_id,work_thread_id,root_run_id,parent_run_id,derived_json,CAST(cancel_epoch AS TEXT),pin_token,budget_root_run_id,execution_role,group_binding_json FROM execution_runs WHERE run_id=?", runID).Scan(&config, &thread, &root, &parent, &derived, &cancel, &pin, &budgetRoot, &role, &group)
	if e != nil {
		return cfg, lineage, e
	}
	if json.Unmarshal([]byte(group), &lineage.Group) != nil {
		return cfg, lineage, api.Invalid("GROUP_BINDING_INVALID")
	}
	if role == "orchestration" {
		if config != "" || pin.Valid || parent != "" || lineage.Group == nil || len(lineage.Group.Members) != 0 {
			return cfg, lineage, api.Invalid("ORCHESTRATION_STATE_INVALID")
		}
	} else if config != "" {
		cfg, e = s.config.ReadTaskInTx(ctx, tx, runID, config)
	} else {
		var snap api.ConfigSnapshot
		snap, e = s.config.ReadPinInTx(ctx, tx, pin.String)
		cfg = api.TaskConfigSnapshot{ID: snap.Token, Kind: "agent", SubjectID: snap.Agent.ID, Agent: snap.Agent}
	}
	if e != nil {
		return cfg, lineage, e
	}
	if json.Unmarshal([]byte(derived), &lineage.Derived) != nil {
		return cfg, lineage, api.Invalid("RUN_CONTEXT_INVALID")
	}
	lineage.BudgetRootRunID = budgetRoot
	lineage.RootRunID = root
	lineage.ParentRunID = parent
	lineage.WorkThreadID = thread
	lineage.ConfigSnapshotID = cfg.ID
	lineage.SubjectID = cfg.SubjectID
	lineage.SubjectKind = cfg.Kind
	lineage.SponsorAgentID = cfg.SponsorAgentID
	lineage.CancelGeneration = cancel
	var delegation string
	e = tx.QueryRowContext(ctx, "SELECT delegation_id FROM collaboration_delegations WHERE child_run_id=?", runID).Scan(&delegation)
	if e != nil && e != sql.ErrNoRows {
		return cfg, lineage, e
	}
	lineage.DelegationID = delegation
	return cfg, lineage, nil
}
