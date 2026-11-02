package usage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"strconv"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/policy"
)

type AttemptBinding struct {
	Purpose, AccountID, JobID, JobGeneration string
}

// MaintenanceEligibilityInTx is a read-only projection. It never creates an
// account or reservation; the real next request still needs Reserve/Dispatch.
func (s *Store) MaintenanceEligibilityInTx(ctx context.Context, tx *sql.Tx, profileID string) (string, error) {
	if e := s.admissionOpen(); e != nil {
		return "", e
	}
	settings, e := s.BudgetInTx(ctx, tx, profileID)
	if e != nil {
		return "", e
	}
	maintenance, ok := policy.Quantity(settings.Policy.MaintenanceTokenLimit)
	if !ok || maintenance == 0 {
		return "BUDGET_NOT_CONFIGURED", nil
	}
	if settings.Policy.Paused {
		return "BUDGET_PAUSED", nil
	}
	profileLimit, ok := policy.Quantity(settings.Policy.ProfileTokenLimit)
	if !ok || profileLimit == 0 {
		return "PROFILE_BUDGET_NOT_CONFIGURED", nil
	}
	for _, account := range []struct {
		id    string
		limit int64
	}{{"maintenance:" + profileID, maintenance}, {"profile:" + profileID, profileLimit}} {
		var actualProfile string
		var configured, paused int
		var limit, charged, reserved, requests, requestLimit int64
		e := tx.QueryRowContext(ctx, "SELECT profile_id,configured,paused,token_limit,charged_tokens,reserved_tokens,charged_requests,request_limit FROM model_budget_accounts WHERE account_id=?", account.id).Scan(&actualProfile, &configured, &paused, &limit, &charged, &reserved, &requests, &requestLimit)
		if errors.Is(e, sql.ErrNoRows) {
			continue
		}
		if e != nil {
			return "", e
		}
		if actualProfile != profileID || limit < 0 || charged < 0 || reserved < 0 || requests < 0 || requestLimit < 0 {
			return "", fail("CONFLICT", "BUDGET_POLICY_INVALID")
		}
		if configured == 0 || paused != 0 {
			return "BUDGET_PAUSED", nil
		}
		if account.limit < limit {
			limit = account.limit
		}
		if charged >= limit || reserved >= limit-charged || requests >= requestLimit {
			return "MODEL_BUDGET_EXHAUSTED", nil
		}
	}
	return "", nil
}

// ReadAttemptBindingInTx reads the actual job relation, not a caller's purpose.
// Missing Memory schema is an error, never a fallback to a chat/root account.
func (s *Store) ReadAttemptBindingInTx(ctx context.Context, tx *sql.Tx, x api.ToolExecution) (AttemptBinding, error) {
	run, in, e := s.current(ctx, tx, x, false)
	if e != nil {
		return AttemptBinding{}, e
	}
	return s.readAttemptBindingForRunInTx(ctx, tx, x, run, in)
}

// The caller has just read this exact Run through current in the same Tx.
// This is immutable binding data only; every Reserve/Dispatch reads it again.
func (s *Store) readAttemptBindingForRunInTx(ctx context.Context, tx *sql.Tx, x api.ToolExecution, run api.Run, in api.RunAccessInput) (AttemptBinding, error) {
	var out AttemptBinding
	var e error
	var parent, budgetRoot, taskConfig string
	if e = tx.QueryRowContext(ctx, "SELECT parent_run_id,budget_root_run_id,task_config_id FROM execution_runs WHERE run_id=?", run.ID).Scan(&parent, &budgetRoot, &taskConfig); e != nil {
		return out, e
	}
	var profile, principal, kind, subject, jobSettings, settings, admission, commit, jobConfig string
	var enabled int
	e = tx.QueryRowContext(ctx, "SELECT j.job_id,CAST(j.generation AS TEXT),CAST(j.settings_revision AS TEXT),j.task_config_id,j.admission,j.commit_state,COALESCE(n.profile_id,''),COALESCE(n.principal_id,''),COALESCE(n.kind,''),COALESCE(n.subject_id,''),COALESCE(CAST(n.settings_revision AS TEXT),''),COALESCE(n.enabled,-1) FROM memory_jobs j LEFT JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE j.run_id=?", run.ID).Scan(&out.JobID, &out.JobGeneration, &jobSettings, &jobConfig, &admission, &commit, &profile, &principal, &kind, &subject, &settings, &enabled)
	if errors.Is(e, sql.ErrNoRows) {
		if budgetRoot == "" {
			budgetRoot = run.RootRunID
		}
		if budgetRoot == "" {
			budgetRoot = run.ID
		}
		out.Purpose, out.AccountID = "main", "root:"+budgetRoot
		if parent != "" {
			out.Purpose = "child"
		}
		var questions int
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM collaboration_messages WHERE to_run_id=? AND kind='question'", run.ID).Scan(&questions); e != nil {
			return AttemptBinding{}, e
		}
		if questions > 0 {
			out.Purpose = "question"
		}
		return out, nil
	}
	if e != nil {
		return AttemptBinding{}, e
	}
	// A job row with a broken namespace link is not "no maintenance job" and
	// cannot fall back to a root account or a filterable control-state denial.
	if profile == "" || principal == "" || kind == "" || subject == "" || settings == "" || enabled < 0 {
		return AttemptBinding{}, fail("CONFLICT", "MEMORY_STATE_INVALID")
	}
	for _, value := range []string{out.JobGeneration, jobSettings, settings} {
		n, e := strconv.ParseInt(value, 10, 64)
		if e != nil || n <= 0 || strconv.FormatInt(n, 10) != value {
			return AttemptBinding{}, fail("CONFLICT", "MEMORY_STATE_INVALID")
		}
	}
	if profile != in.ProfileID || principal != x.Identity.PrincipalID() || kind != "agent" || subject != run.AgentID {
		return AttemptBinding{}, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if enabled == 0 {
		return AttemptBinding{}, api.Denied("MEMORY_AUTO_DISABLED")
	}
	if admission != "bound" || commit != "pending" || jobSettings != settings {
		return AttemptBinding{}, api.Denied("MEMORY_JOB_CHANGED")
	}
	if out.JobID == "" || parent != "" || run.RootRunID != run.ID || taskConfig == "" || jobConfig != taskConfig || x.Config.ID != taskConfig {
		return AttemptBinding{}, fail("CONFLICT", "MEMORY_STATE_INVALID")
	}
	var raw string
	if e := tx.QueryRowContext(ctx, "SELECT c.config_json FROM task_config_snapshots c JOIN task_config_pins p ON p.snapshot_id=c.snapshot_id WHERE p.run_id=? AND c.snapshot_id=? AND c.profile_id=? AND c.principal_id=? AND c.subject_id=? AND c.state IN('active','retained')", run.ID, taskConfig, profile, principal, subject).Scan(&raw); e != nil {
		return AttemptBinding{}, e
	}
	var config api.TaskConfigSnapshot
	if json.Unmarshal([]byte(raw), &config) != nil || config.Kind != "agent" || !reflect.DeepEqual(config, x.Config) {
		return AttemptBinding{}, fail("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if e := s.access.CheckInTx(ctx, tx, x.Identity, in, []string{"read", "send", "summarize", "memory"}); e != nil {
		return AttemptBinding{}, e
	}
	out.Purpose, out.AccountID = "maintenance", "maintenance:"+profile
	return out, nil
}
