package execution

import (
	"context"
	"database/sql"
	"errors"
	"reflect"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
)

type MemoryScanCursor struct{ CreatedAt, ID string }
type MemoryAdmissionPage struct {
	JobIDs []string
	Next   MemoryScanCursor
}
type MemoryCompletion struct{ RunID, MessageID string }
type MaintenanceAdmission struct {
	JobID, Generation, ProfileID, PrincipalID, AgentID string
	SourceRunID, SessionID, Intent                     string
	Access                                             api.RunAccessInput
	Input                                              api.ExecutionMemoryInput
}
type MemoryCommit struct{ AppliedRevisionIDs, CandidateIDs []string }

// MemoryHooks shares the original execution transaction and Run writer.
// All callbacks share the caller's short transaction and must perform no I/O
// to a model, Provider or Host. Plan/Seal replaces the old PrepareInTx proposal.
type MemoryHooks interface {
	InitialContextHooks
	RecordCompletionInTx(context.Context, *sql.Tx, MemoryCompletion) error
	AdmissionPageInTx(context.Context, *sql.Tx, MemoryScanCursor) (MemoryAdmissionPage, error)
	ReadAdmissionInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (MaintenanceAdmission, error)
	BindRunInTx(context.Context, *sql.Tx, string, string, string) error
	ReadInputInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (*api.ExecutionMemoryInput, error)
	CommitInTx(context.Context, *sql.Tx, api.ToolExecution, api.MemoryCandidateSet) (MemoryCommit, error)
	RecordOutputInTx(context.Context, *sql.Tx, api.ToolExecution, string) error
}

type MaintenanceRunWriter interface {
	NewMaintenanceInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (api.Run, error)
}

type MaintenanceAccessDeriver interface {
	DeriveMaintenanceInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput) (api.RunAccessInput, error)
}

func (s *Store) NewMaintenanceInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, jobID string) (api.Run, error) {
	var out api.Run
	if s.stopping.Load() {
		return out, api.Denied("SERVICE_STOPPING")
	}
	if s.memory == nil {
		return out, api.Invalid("MEMORY_NOT_ASSEMBLED")
	}
	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, ""); e != nil {
			return out, e
		}
	}
	admission, e := s.memory.ReadAdmissionInTx(ctx, tx, id, jobID)
	if e != nil {
		return out, e
	}
	if admission.JobID != jobID || admission.PrincipalID != id.PrincipalID() || admission.AgentID == "" || admission.SessionID == "" || admission.Input.Mode != "maintenance" || admission.Input.JobID != jobID || admission.Input.JobGeneration != admission.Generation {
		return out, api.Invalid("MEMORY_INPUT_STATE_INVALID")
	}
	if _, e = conv.ReadSession(ctx, tx, id, admission.ProfileID, admission.SessionID); e != nil {
		return out, e
	}
	var active int
	if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_jobs j JOIN execution_runs r ON r.run_id=j.run_id WHERE r.status NOT IN('succeeded','failed','canceled') OR EXISTS(SELECT 1 FROM model_attempts a WHERE a.run_id=r.run_id AND a.state='dispatched' AND a.producer_ended=0)").Scan(&active); e != nil {
		return out, e
	}
	if active != 0 {
		return out, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "MEMORY_MAINTENANCE_BUSY"}
	}
	if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs WHERE status NOT IN('succeeded','failed','canceled')").Scan(&active); e != nil {
		return out, e
	}
	if active >= 128 {
		return out, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "RUN_QUEUE_LIMIT"}
	}
	runID, threadID := api.NewID("run:"), api.NewID("thread:")
	cfg, pin, e := s.config.PinTaskInTx(ctx, tx, id, admission.ProfileID, admission.AgentID, runID, admission.AgentID, nil)
	if e != nil {
		return out, e
	}
	in := admission.Access
	in.ProfileID, in.SessionID, in.TaskID = admission.ProfileID, admission.SessionID, runID
	in.Recipient = recipient(cfg.Agent)
	in.ParentScope = nil
	derived := []api.DerivedInput{}
	seen := map[string]api.DerivedInput{}
	for _, entry := range admission.Input.Entries {
		key := entry.Ref.Kind + "\x00" + entry.Ref.ID
		if old, ok := seen[key]; ok {
			if !reflect.DeepEqual(old, entry.Ref) {
				return out, api.Invalid("MEMORY_INPUT_STATE_INVALID")
			}
			continue
		}
		seen[key] = entry.Ref
		derived = append(derived, entry.Ref)
	}
	if len(derived) > 128 {
		return out, api.Invalid("MEMORY_PROVENANCE_LIMIT")
	}
	var legacy any
	if pin != "" {
		legacy = pin
	}
	now := time.Now().UTC().Format(api.TimestampLayout)
	_, e = tx.ExecContext(ctx, `INSERT INTO execution_runs(run_id,session_id,principal_id,user_message_id,recipient_json,agent_id,persona_revision,model_revision,pin_token,status,revision,intent,source_json,scope_json,grants_json,effective_source_json,effective_scope_json,effective_grants_json,retry_of_run_id,claim_token,reason,usage_json,checkpoint_ref,event_seq,created_at,root_run_id,parent_run_id,work_thread_id,task_config_id,derived_json,budget_root_run_id) VALUES(?,?,?,'',?,?,?,?,?,'accepted',1,?,?,?,?,?,?,?,'','','','','',1,?,?,'',?,?,?,?)`, runID, in.SessionID, id.PrincipalID(), jsonArray(in.Recipient), cfg.Agent.ID, cfg.Agent.PersonaRevision, cfg.Agent.ModelBindingRevision, legacy, admission.Intent, jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), now, runID, threadID, cfg.ID, jsonArray(derived), runID)
	if e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET group_binding_json=? WHERE run_id=?", groupJSON(in.Group), runID); e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO task_config_pins VALUES(?,?,?)", api.NewID("pin:"), cfg.ID, runID); e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_threads VALUES(?,?,?,?,?,?)", threadID, runID, in.SessionID, id.PrincipalID(), cfg.SubjectID, now); e != nil {
		return out, e
	}
	if s.access == nil {
		return out, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	if e = s.memory.BindRunInTx(ctx, tx, jobID, runID, cfg.ID); e != nil {
		return out, e
	}
	deriver, ok := s.access.(MaintenanceAccessDeriver)
	if !ok {
		return out, api.Denied("MAINTENANCE_ACCESS_NOT_ASSEMBLED")
	}
	in, e = deriver.DeriveMaintenanceInTx(ctx, tx, id, in)
	if e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET source_json=?,scope_json=?,grants_json=?,effective_source_json=?,effective_scope_json=?,effective_grants_json=? WHERE run_id=?", jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), jsonArray(in.Sources), jsonArray(in.Scopes), jsonArray(in.GrantIDs), runID); e != nil {
		return out, e
	}
	if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read", "send", "summarize", "memory"}); e != nil {
		return out, e
	}
	if root, ok := s.tree.(interface {
		EnsureRootInTx(context.Context, *sql.Tx, string) error
	}); ok {
		if e = root.EnsureRootInTx(ctx, tx, runID); e != nil {
			return out, e
		}
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO execution_events VALUES(?,1,'accepted',?,?)", runID, now, jsonArray(map[string]string{"jobId": jobID})); e != nil {
		return out, e
	}
	out, _, _, _, e = readRun(ctx, tx, runID)
	return out, e
}

func memoryAdmissionRefusal(e error) bool {
	if memoryCommitRefusal(e) {
		return true
	}
	var f *api.Fault
	if !errors.As(e, &f) {
		return false
	}
	if f.Kind == "CAPABILITY_DENIED" {
		switch f.Reason {
		case "MEMORY_AUTO_DISABLED", "MEMORY_JOB_CHANGED", "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH", "MEMORY_REVISION_INACTIVE", "MEMORY_FORGOTTEN", "AGENT_DISABLED", "MODEL_DRAFT_INCOMPLETE", "CREDENTIAL_MISSING":
			return true
		}
	}
	if f.Kind == "RESOURCE_LIMIT" {
		switch f.Reason {
		case "MEMORY_MAINTENANCE_BUSY", "MODEL_BUDGET_EXHAUSTED", "MEMORY_PROVENANCE_LIMIT", "MEMORY_INPUT_LIMIT", "RUN_QUEUE_LIMIT":
			return true
		}
	}
	if f.Kind == "MODEL_UNAVAILABLE" && (f.Reason == "MODEL_DRAFT_INCOMPLETE" || f.Reason == "CREDENTIAL_MISSING") {
		return true
	}
	if f.Kind == "CONFLICT" && f.Reason == "AGENT_DISABLED" {
		return true
	}
	switch f.Reason {
	case "BUDGET_NOT_CONFIGURED", "PROFILE_BUDGET_NOT_CONFIGURED", "BUDGET_PAUSED":
		return f.Kind == "CAPABILITY_DENIED" || f.Kind == "RESOURCE_LIMIT" || f.Kind == "CONFLICT"
	}
	return false
}

func memoryCommitRefusal(e error) bool {
	var f *api.Fault
	if !errors.As(e, &f) {
		return false
	}
	if f.Kind == "INVALID_ARGUMENT" && f.Reason == "MEMORY_CANDIDATE_INVALID" {
		return true
	}
	if f.Kind == "CAPABILITY_DENIED" {
		switch f.Reason {
		case "MEMORY_AUTO_DISABLED", "MEMORY_JOB_CHANGED", "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH", "MEMORY_REVISION_INACTIVE", "MEMORY_FORGOTTEN", "GRANT_REVOKED", "GRANT_EXPIRED", "SOURCE_NOT_GRANTED", "OPERATION_NOT_GRANTED", "RECIPIENT_NOT_GRANTED", "GROUP_MEMBER_REMOVED", "GROUP_MEMBER_GENERATION_CHANGED":
			return true
		}
	}
	return f.Kind == "RESOURCE_LIMIT" && f.Reason == "MEMORY_PROVENANCE_LIMIT"
}

func memoryCurrentRejection(e error) *api.Fault {
	var f *api.Fault
	if !errors.As(e, &f) {
		return nil
	}
	if f.Kind == "CAPABILITY_DENIED" {
		switch f.Reason {
		case "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH", "MEMORY_REVISION_INACTIVE", "MEMORY_FORGOTTEN":
			return f
		}
	}
	if f.Kind == "RESOURCE_LIMIT" && f.Reason == "MEMORY_PROVENANCE_LIMIT" {
		return f
	}
	return nil
}

func (s *Store) claimMemoryInTx(ctx context.Context, tx *sql.Tx, after MemoryScanCursor) (*executorapp.Work, MemoryScanCursor, error) {
	if s.memory == nil {
		return nil, after, nil
	}
	page, e := s.memory.AdmissionPageInTx(ctx, tx, after)
	if e != nil {
		return nil, after, e
	}
	if len(page.JobIDs) > 32 {
		return nil, after, api.Invalid("MEMORY_ADMISSION_PAGE_INVALID")
	}
	for _, job := range page.JobIDs {
		var created, principal string
		if e = tx.QueryRowContext(ctx, "SELECT j.created_at,n.principal_id FROM memory_jobs j JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE j.job_id=?", job).Scan(&created, &principal); e != nil {
			return nil, after, e
		}
		after = MemoryScanCursor{CreatedAt: created, ID: job}
		id := api.NewConnectionIdentity("memory-admission:"+job, principal, false)
		if _, e = tx.ExecContext(ctx, "SAVEPOINT memory_admission"); e != nil {
			return nil, after, e
		}
		r, e := s.NewMaintenanceInTx(ctx, tx, id, job)
		if e != nil {
			if !memoryAdmissionRefusal(e) {
				return nil, after, e
			}
			if _, rollbackErr := tx.ExecContext(ctx, "ROLLBACK TO memory_admission"); rollbackErr != nil {
				return nil, after, rollbackErr
			}
			if _, releaseErr := tx.ExecContext(ctx, "RELEASE memory_admission"); releaseErr != nil {
				return nil, after, releaseErr
			}
			continue
		}
		if _, e = tx.ExecContext(ctx, "RELEASE memory_admission"); e != nil {
			return nil, after, e
		}
		if s.tree != nil {
			allowed, e := s.tree.ClaimInTx(ctx, tx, r.ID)
			if e != nil {
				return nil, after, e
			}
			if !allowed {
				return nil, after, api.Invalid("RUN_CLAIM_CHANGED")
			}
		}
		work, e := s.claimInTx(ctx, tx, r.ID, nil)
		return work, after, e
	}
	return nil, page.Next, nil
}
