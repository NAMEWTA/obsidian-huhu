package usage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	recoveryguard "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/recovery"
	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/policy"
)

type Store struct {
	stopping        atomic.Bool
	base            *base.Store
	access          *grants.Store
	limits          api.ExecutionLimits
	budget          api.BudgetPolicy
	terminalCleanup func(context.Context, *sql.Tx, string) error
}

func New(b *base.Store, a *grants.Store, l api.ExecutionLimits, p api.BudgetPolicy) *Store {
	if l == (api.ExecutionLimits{}) {
		l = api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 4, ProfileChildren: 8, MaxWakes: 8}
	}
	if p.RootTokenLimit == "" {
		p.RootTokenLimit = "0"
	}
	if p.ProfileTokenLimit == "" {
		p.ProfileTokenLimit = "0"
	}
	if p.MaintenanceTokenLimit == "" {
		p.MaintenanceTokenLimit = "0"
	}
	return &Store{base: b, access: a, limits: l, budget: p}
}
func (s *Store) SetTerminalCleanup(f func(context.Context, *sql.Tx, string) error) {
	s.terminalCleanup = f
}
func (s *Store) StopAdmission() { s.stopping.Store(true) }
func (s *Store) admissionOpen() error {
	if s.stopping.Load() {
		return api.Denied("SERVICE_STOPPING")
	}
	return nil
}
func (s *Store) cleanupInTx(ctx context.Context, tx *sql.Tx, run string) error {
	if s.terminalCleanup != nil {
		return s.terminalCleanup(ctx, tx, run)
	}
	return nil
}
func fail(kind, reason string) error         { return &api.Fault{Kind: kind, Reason: reason} }
func encode(v any) string                    { b, _ := json.Marshal(v); return string(b) }
func terminal(s string) bool                 { return s == "succeeded" || s == "failed" || s == "canceled" }
func (s *Store) Limits() api.ExecutionLimits { return s.limits }
func (s *Store) EnsureRootInTx(ctx context.Context, tx *sql.Tx, root string) error {
	_, e := tx.ExecContext(ctx, "INSERT INTO collaboration_policy_roots(root_run_id,policy_json) VALUES(?,?) ON CONFLICT(root_run_id) DO NOTHING", root, encode(s.limits))
	return e
}
func (s *Store) rootLimitsInTx(ctx context.Context, tx *sql.Tx, root string) (api.ExecutionLimits, error) {
	var l api.ExecutionLimits
	var raw string
	if e := tx.QueryRowContext(ctx, "SELECT policy_json FROM collaboration_policy_roots WHERE root_run_id=?", root).Scan(&raw); e != nil {
		return l, e
	}
	if json.Unmarshal([]byte(raw), &l) != nil || !api.ValidExecutionLimits(l) {
		return l, fail("CONFLICT", "POLICY_STATE_INVALID")
	}
	return l, nil
}
func (s *Store) AdmitInTx(ctx context.Context, tx *sql.Tx, parent, root string, question bool) error {
	if e := s.admissionOpen(); e != nil {
		return e
	}
	if e := recoveryguard.CheckInTx(ctx, tx, parent); e != nil {
		return e
	}
	if e := s.EnsureRootInTx(ctx, tx, root); e != nil {
		return e
	}
	var depth, closed int
	if e := tx.QueryRowContext(ctx, "WITH RECURSIVE ancestors(run_id,parent_run_id,admission_closed,depth) AS (SELECT run_id,parent_run_id,admission_closed,0 FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id,r.parent_run_id,r.admission_closed,a.depth+1 FROM execution_runs r JOIN ancestors a ON r.run_id=a.parent_run_id WHERE a.depth<33) SELECT count(*)-1,COALESCE(max(admission_closed),1) FROM ancestors", parent).Scan(&depth, &closed); e != nil {
		return e
	}
	var children, wakes int
	var raw string
	if e := tx.QueryRowContext(ctx, "SELECT policy_json,child_count,wake_count FROM collaboration_policy_roots WHERE root_run_id=?", root).Scan(&raw, &children, &wakes); e != nil {
		return e
	}
	var l api.ExecutionLimits
	if json.Unmarshal([]byte(raw), &l) != nil {
		return fail("CONFLICT", "POLICY_STATE_INVALID")
	}
	reason := policy.Admit(policy.Limits{Depth: l.MaxDepth, Children: l.MaxChildren, RootActive: l.RootChildren, ProfileActive: l.ProfileChildren, Wakeups: l.MaxWakes}, depth, children, closed != 0)
	if reason != "" {
		return fail("RESOURCE_LIMIT", reason)
	}
	if question && wakes >= l.MaxWakes {
		return fail("RESOURCE_LIMIT", "MESSAGE_WAKE_LIMIT")
	}
	_, e := tx.ExecContext(ctx, "UPDATE collaboration_policy_roots SET child_count=child_count+1,wake_count=wake_count+? WHERE root_run_id=?", boolInt(question), root)
	return e
}
func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (s *Store) WakeInTx(ctx context.Context, tx *sql.Tx, root string) error {
	if e := s.admissionOpen(); e != nil {
		return e
	}
	if e := recoveryguard.CheckInTx(ctx, tx, root); e != nil {
		return e
	}
	if e := s.EnsureRootInTx(ctx, tx, root); e != nil {
		return e
	}
	l, e := s.rootLimitsInTx(ctx, tx, root)
	if e != nil {
		return e
	}
	r, e := tx.ExecContext(ctx, "UPDATE collaboration_policy_roots SET wake_count=wake_count+1 WHERE root_run_id=? AND wake_count<?", root, l.MaxWakes)
	if e != nil {
		return e
	}
	n, _ := r.RowsAffected()
	if n != 1 {
		return fail("RESOURCE_LIMIT", "MESSAGE_WAKE_LIMIT")
	}
	return nil
}
func (s *Store) ClaimInTx(ctx context.Context, tx *sql.Tx, runID string) (bool, error) {
	if s.stopping.Load() {
		return false, nil
	}
	if e := recoveryguard.CheckInTx(ctx, tx, runID); e != nil {
		var f *api.Fault
		if errors.As(e, &f) && (f.Reason == "RECOVERY_REQUIRED" || f.Reason == "SERVICE_STOPPING") {
			return false, nil
		}
		return false, e
	}
	var root, parent, status string
	var closed, slot int
	if e := tx.QueryRowContext(ctx, "SELECT root_run_id,parent_run_id,status,task_admission_closed,child_slot FROM execution_runs WHERE run_id=?", runID).Scan(&root, &parent, &status, &closed, &slot); e != nil {
		return false, e
	}
	if root == "" {
		root = runID
	}
	if closed != 0 || terminal(status) {
		return false, nil
	}
	var ancestorClosed int
	if e := tx.QueryRowContext(ctx, "WITH RECURSIVE a(run_id,parent_run_id,admission_closed) AS (SELECT run_id,parent_run_id,CASE WHEN status IN('interrupted','blocked','failed','canceled') THEN 1 ELSE task_admission_closed END FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id,r.parent_run_id,CASE WHEN r.status IN('interrupted','blocked','failed','canceled') THEN 1 ELSE r.task_admission_closed END FROM execution_runs r JOIN a ON r.run_id=a.parent_run_id) SELECT COALESCE(max(admission_closed),1) FROM a", runID).Scan(&ancestorClosed); e != nil {
		return false, e
	}
	if ancestorClosed != 0 {
		return false, nil
	}
	if e := s.EnsureRootInTx(ctx, tx, root); e != nil {
		return false, e
	}
	if parent == "" || slot != 0 {
		return true, nil
	}
	var rootN, profileN int
	if e := tx.QueryRowContext(ctx, "SELECT COALESCE(sum(CASE WHEN root_run_id=? THEN child_slot ELSE 0 END),0),COALESCE(sum(child_slot),0) FROM execution_runs", root).Scan(&rootN, &profileN); e != nil {
		return false, e
	}
	l, e := s.rootLimitsInTx(ctx, tx, root)
	if e != nil {
		return false, e
	}
	if !policy.Claim(policy.Limits{RootActive: l.RootChildren, ProfileActive: l.ProfileChildren}, rootN, profileN) {
		return false, nil
	}
	_, e = tx.ExecContext(ctx, "UPDATE execution_runs SET child_slot=1 WHERE run_id=?", runID)
	return e == nil, e
}
func (s *Store) ProducerEndedInTx(ctx context.Context, tx *sql.Tx, runID string) error {
	_, e := tx.ExecContext(ctx, "UPDATE execution_runs SET child_slot=0 WHERE run_id=? AND NOT EXISTS(SELECT 1 FROM model_attempts WHERE run_id=? AND state='dispatched' AND producer_ended=0)", runID, runID)
	if e != nil {
		return e
	}
	return s.cleanupInTx(ctx, tx, runID)
}

type bound struct {
	s                *Store
	e                api.ToolExecution
	purpose, account string
	binding          AttemptBinding
}

func (s *Store) BindAttempts(ctx context.Context, e api.ToolExecution) (api.ModelAttempts, error) {
	b := &bound{s: s, e: e}
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		r, in, x := s.current(ctx, tx, e, false)
		if x != nil {
			return x
		}
		b.binding, x = s.readAttemptBindingForRunInTx(ctx, tx, e, r, in)
		b.purpose, b.account = b.binding.Purpose, b.binding.AccountID
		return x
	})
	if err != nil {
		return nil, err
	}
	return b, nil
}
func (s *Store) current(ctx context.Context, tx *sql.Tx, e api.ToolExecution, strict ...bool) (api.Run, api.RunAccessInput, error) {
	if err := s.admissionOpen(); err != nil {
		return api.Run{}, api.RunAccessInput{}, err
	}
	r, in, err := execution.ReadInTx(ctx, tx, e.Identity, api.IDQuery{ProfileID: e.Access.ProfileID, ID: e.Run.ID})
	if err != nil {
		return r, in, err
	}
	if err = recoveryguard.CheckInTx(ctx, tx, r.ID); err != nil {
		return r, in, err
	}
	var claim string
	var closed, epoch, effectClosed int64
	if err = tx.QueryRowContext(ctx, "SELECT claim_token,task_admission_closed,cancel_epoch,admission_closed FROM execution_runs WHERE run_id=?", r.ID).Scan(&claim, &closed, &epoch, &effectClosed); err != nil {
		return r, in, err
	}
	modelStrict := len(strict) == 0 || strict[0]
	if claim == "" || claim != e.ClaimToken || closed != 0 || (r.Status != "running" && (modelStrict || r.Status != "preparing")) {
		return r, in, api.Denied("MODEL_ATTEMPT_NOT_ACTIVE")
	}
	if modelStrict && effectClosed != 0 {
		return r, in, api.Denied("EFFECT_ADMISSION_CLOSED")
	}
	if !reflect.DeepEqual(in.Recipient, e.Access.Recipient) {
		return r, in, api.Denied("RECIPIENT_CHANGED")
	}
	if modelStrict && !grantsapp.ValidRecipient(in.Recipient) {
		return r, in, api.Denied("RECIPIENT_NOT_CONFIGURED")
	}
	var pinned int
	if err = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM config_snapshot_pins p JOIN execution_runs r ON r.pin_token=p.token WHERE r.run_id=? AND p.agent_id=r.agent_id AND p.model_revision=r.model_revision AND p.persona_revision=r.persona_revision)+(SELECT count(*) FROM task_config_pins p JOIN task_config_snapshots c ON c.snapshot_id=p.snapshot_id JOIN execution_runs r ON r.run_id=p.run_id WHERE r.run_id=? AND c.snapshot_id=r.task_config_id AND c.state IN('active','retained'))", r.ID, r.ID).Scan(&pinned); err != nil {
		return r, in, err
	}
	if pinned == 0 {
		return r, in, api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	var n int
	if err = tx.QueryRowContext(ctx, "WITH RECURSIVE a(run_id,parent_run_id,admission_closed) AS (SELECT run_id,parent_run_id,task_admission_closed FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id,r.parent_run_id,r.task_admission_closed FROM execution_runs r JOIN a ON r.run_id=a.parent_run_id) SELECT COALESCE(max(admission_closed),1) FROM a", r.ID).Scan(&n); err != nil {
		return r, in, err
	}
	if n != 0 {
		return r, in, api.Denied("TASK_ADMISSION_CLOSED")
	}
	if s.access == nil {
		return r, in, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	err = s.access.CheckInTx(ctx, tx, e.Identity, in, []string{"read", "send"})
	return r, in, err
}

func (s *Store) accountInTx(ctx context.Context, tx *sql.Tx, profile, root, purpose string) (string, error) {
	settings, e := s.BudgetInTx(ctx, tx, profile)
	if e != nil {
		return "", e
	}
	budget := settings.Policy
	limit := budget.RootTokenLimit
	account := "root:" + root
	if purpose == "maintenance" {
		limit = budget.MaintenanceTokenLimit
		account = "maintenance:" + profile
	}
	n, ok := policy.Quantity(limit)
	if !ok || n == 0 {
		return "", fail("RESOURCE_LIMIT", "BUDGET_NOT_CONFIGURED")
	}
	if budget.Paused {
		return "", fail("RESOURCE_LIMIT", "BUDGET_PAUSED")
	}
	profileN, ok := policy.Quantity(budget.ProfileTokenLimit)
	if !ok || profileN == 0 {
		return "", fail("RESOURCE_LIMIT", "PROFILE_BUDGET_NOT_CONFIGURED")
	}
	accountRoot := root
	if purpose == "maintenance" {
		accountRoot = ""
	}
	for _, a := range []struct {
		id, root, purpose string
		limit             int64
	}{{account, accountRoot, purpose, n}, {"profile:" + profile, "", "profile", profileN}} {
		if _, e := tx.ExecContext(ctx, "INSERT INTO model_budget_accounts(account_id,profile_id,root_run_id,purpose,configured,paused,token_limit,request_limit) VALUES(?,?,?,?,1,0,?,9223372036854775807) ON CONFLICT(account_id) DO NOTHING", a.id, profile, a.root, a.purpose, a.limit); e != nil {
			return "", e
		}
	}
	return account, nil
}
func (b *bound) Reserve(ctx context.Context, q api.AttemptRequest) (api.AttemptReservation, error) {
	var out api.AttemptReservation
	if q.Purpose == "" {
		q.Purpose = b.purpose
	}
	// Summary/retry are subpurposes of the persisted account family. A caller
	// cannot turn either a chat binding or a maintenance job into the other.
	if q.Purpose != b.purpose && q.Purpose != "summary" && q.Purpose != "retry" {
		return out, api.Denied("ATTEMPT_PURPOSE_MISMATCH")
	}
	if q.AccountID != "" && q.AccountID != b.account {
		return out, api.Denied("BUDGET_ACCOUNT_MISMATCH")
	}
	in, ok := policy.Quantity(q.InputEstimate)
	if !ok {
		return out, api.Invalid("INVALID_ATTEMPT_ESTIMATE")
	}
	output, ok := policy.Quantity(q.OutputBound)
	if !ok || output == 0 {
		return out, api.Invalid("INVALID_ATTEMPT_BOUND")
	}
	amount, ok := policy.Sum(in, output)
	if !ok || amount == 0 {
		return out, api.Invalid("INVALID_ATTEMPT_BOUND")
	}
	if q.LogicalCallID == "" || len(q.LogicalCallID) > 256 {
		return out, api.Invalid("INVALID_LOGICAL_CALL")
	}
	switch q.Purpose {
	case "main", "child", "question", "summary", "retry", "maintenance":
	default:
		return out, api.Invalid("INVALID_ATTEMPT_PURPOSE")
	}
	err := b.s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		r, access, e := b.s.current(ctx, tx, b.e)
		if e != nil {
			return e
		}
		binding, e := b.s.readAttemptBindingForRunInTx(ctx, tx, b.e, r, access)
		if e != nil {
			return e
		}
		if binding != b.binding {
			return api.Denied("MEMORY_JOB_CHANGED")
		}
		root := r.RootRunID
		if root == "" {
			root = r.ID
		}
		var budgetRoot string
		if e = tx.QueryRowContext(ctx, "SELECT budget_root_run_id FROM execution_runs WHERE run_id=?", r.ID).Scan(&budgetRoot); e != nil {
			return e
		}
		if budgetRoot != "" {
			root = budgetRoot
		}
		hash := commands.Hash(q)
		var existingHash string
		e = tx.QueryRowContext(ctx, "SELECT attempt_id,run_id,root_run_id,CAST(revision AS TEXT),request_hash FROM model_attempts WHERE run_id=? AND claim_token=? AND logical_call_id=?", r.ID, b.e.ClaimToken, q.LogicalCallID).Scan(&out.ID, &out.RunID, &out.RootRunID, &out.Revision, &existingHash)
		if e == nil {
			if hash != existingHash {
				return fail("CONFLICT", "ATTEMPT_INPUT_CONFLICT")
			}
			return nil
		}
		if !errors.Is(e, sql.ErrNoRows) {
			return e
		}
		account, e := b.s.accountInTx(ctx, tx, access.ProfileID, root, b.purpose)
		if e != nil {
			return e
		}
		if q.AccountID != "" && q.AccountID != account {
			return api.Denied("BUDGET_ACCOUNT_MISMATCH")
		}
		if q.RetryOfAttemptID != "" {
			var retryRoot, state, retryRun, retryClaim, retryAccount string
			if e = tx.QueryRowContext(ctx, "SELECT root_run_id,state,run_id,claim_token,account_id FROM model_attempts WHERE attempt_id=?", q.RetryOfAttemptID).Scan(&retryRoot, &state, &retryRun, &retryClaim, &retryAccount); e != nil || retryRoot != root || state != "settled" || retryRun != r.ID || retryClaim != b.e.ClaimToken || retryAccount != account {
				return api.Invalid("INVALID_RETRY_ATTEMPT")
			}
		}
		for _, a := range []string{account, "profile:" + access.ProfileID} {
			res, e := tx.ExecContext(ctx, "UPDATE model_budget_accounts SET reserved_tokens=reserved_tokens+?,revision=revision+1 WHERE account_id=? AND configured=1 AND paused=0 AND token_limit-charged_tokens-reserved_tokens>=? AND charged_requests<request_limit", amount, a, amount)
			if e != nil {
				return e
			}
			n, _ := res.RowsAffected()
			if n != 1 {
				return fail("RESOURCE_LIMIT", "MODEL_BUDGET_EXHAUSTED")
			}
		}
		var cancel int64
		if e = tx.QueryRowContext(ctx, "SELECT cancel_epoch FROM execution_runs WHERE run_id=?", r.ID).Scan(&cancel); e != nil {
			return e
		}
		out = api.AttemptReservation{ID: api.NewID("attempt:"), RunID: r.ID, RootRunID: root, Revision: "1"}
		_, e = tx.ExecContext(ctx, "INSERT INTO model_attempts(attempt_id,run_id,root_run_id,account_id,logical_call_id,request_hash,retry_of_attempt_id,purpose,claim_token,cancel_epoch,config_json,recipient_json,provenance_json,reserved_tokens,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'reserved',?)", out.ID, r.ID, root, account, q.LogicalCallID, hash, q.RetryOfAttemptID, q.Purpose, b.e.ClaimToken, cancel, encode(b.e.Config), encode(access.Recipient), encode(access), amount, time.Now().UTC().Format(time.RFC3339Nano))
		return e
	})
	return out, err
}
func (b *bound) Dispatch(ctx context.Context, res api.AttemptReservation, fn func(context.Context) error) error {
	if fn == nil {
		return api.Invalid("ATTEMPT_DISPATCH_REQUIRED")
	}
	// Durability barrier (ADR-027): the dispatched attempt and its charge are
	// flushed before the request can leave, so a power failure cannot forget an
	// outbound model call that may have been sent.
	err := b.s.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		r, in, e := b.s.current(ctx, tx, b.e)
		if e != nil {
			return e
		}
		binding, e := b.s.readAttemptBindingForRunInTx(ctx, tx, b.e, r, in)
		if e != nil {
			return e
		}
		if binding != b.binding {
			return api.Denied("MEMORY_JOB_CHANGED")
		}
		settings, e := b.s.BudgetInTx(ctx, tx, in.ProfileID)
		if e != nil {
			return e
		}
		if settings.Policy.Paused {
			return fail("RESOURCE_LIMIT", "BUDGET_PAUSED")
		}
		var state, account, claim, recipient string
		var cancel, runCancel int64
		if e = tx.QueryRowContext(ctx, "SELECT state,account_id,claim_token,cancel_epoch,recipient_json FROM model_attempts WHERE attempt_id=? AND run_id=? AND root_run_id=?", res.ID, b.e.Run.ID, res.RootRunID).Scan(&state, &account, &claim, &cancel, &recipient); e != nil {
			return e
		}
		if state != "reserved" || claim != b.e.ClaimToken || recipient != encode(in.Recipient) {
			return fail("CONFLICT", "ATTEMPT_ALREADY_DISPATCHED")
		}
		if account != b.account || res.RunID != b.e.Run.ID {
			return api.Denied("BUDGET_ACCOUNT_MISMATCH")
		}
		if e = tx.QueryRowContext(ctx, "SELECT cancel_epoch FROM execution_runs WHERE run_id=?", b.e.Run.ID).Scan(&runCancel); e != nil {
			return e
		}
		if cancel != runCancel {
			return api.Denied("TASK_ADMISSION_CLOSED")
		}
		for _, a := range []string{account, "profile:" + in.ProfileID} {
			var enabled, paused int
			var limit, charged, reserved int64
			if e = tx.QueryRowContext(ctx, "SELECT configured,paused,token_limit,charged_tokens,reserved_tokens FROM model_budget_accounts WHERE account_id=?", a).Scan(&enabled, &paused, &limit, &charged, &reserved); e != nil {
				return e
			}
			if enabled == 0 || paused != 0 {
				return fail("RESOURCE_LIMIT", "BUDGET_PAUSED")
			}
			if charged > limit || reserved > limit-charged {
				return fail("RESOURCE_LIMIT", "MODEL_BUDGET_EXHAUSTED")
			}
			if _, e = tx.ExecContext(ctx, "UPDATE model_budget_accounts SET charged_requests=charged_requests+1,revision=revision+1 WHERE account_id=?", a); e != nil {
				return e
			}
		}
		_, e = tx.ExecContext(ctx, "UPDATE model_attempts SET state='dispatched',revision=revision+1 WHERE attempt_id=?", res.ID)
		return e
	})
	if err != nil {
		return err
	}
	// This committed transition is the outbound linearization point. A subtree
	// cancel after it drains an admitted in-flight attempt; it never refunds it.
	return fn(ctx)
}
func (b *bound) Settle(ctx context.Context, res api.AttemptReservation, o api.AttemptObservation) (api.AttemptReceipt, error) {
	var out api.AttemptReceipt
	if !o.ProducerEnded {
		return out, api.Invalid("MODEL_PRODUCER_NOT_ENDED")
	}
	if o.Knowledge != "known" && o.Knowledge != "estimate" && o.Knowledge != "unknown" {
		return out, api.Invalid("INVALID_USAGE_KNOWLEDGE")
	}
	var measured int64
	if o.Knowledge == "unknown" {
		for _, v := range []string{o.InputTokens, o.OutputTokens} {
			if v != "" {
				if _, ok := policy.Quantity(v); !ok {
					return out, api.Invalid("INVALID_MODEL_USAGE")
				}
			}
		}
	}
	if o.Knowledge != "unknown" {
		a, ok := policy.Quantity(o.InputTokens)
		if !ok {
			return out, api.Invalid("INVALID_MODEL_USAGE")
		}
		z, ok := policy.Quantity(o.OutputTokens)
		if !ok {
			return out, api.Invalid("INVALID_MODEL_USAGE")
		}
		measured, ok = policy.Sum(a, z)
		if !ok {
			return out, api.Invalid("INVALID_MODEL_USAGE")
		}
	}
	err := b.s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		var account, state, oldHash string
		var reserved int64
		if e := tx.QueryRowContext(ctx, "SELECT account_id,state,reserved_tokens,settlement_hash,knowledge,input_tokens,output_tokens FROM model_attempts WHERE attempt_id=? AND run_id=? AND claim_token=?", res.ID, b.e.Run.ID, b.e.ClaimToken).Scan(&account, &state, &reserved, &oldHash, &out.Knowledge, &out.InputTokens, &out.OutputTokens); e != nil {
			return e
		}
		hash := commands.Hash(o)
		out.ID = res.ID
		out.State = "settled"
		if state == "settled" {
			if oldHash != hash {
				return fail("CONFLICT", "ATTEMPT_SETTLEMENT_CONFLICT")
			}
			return nil
		}
		if state != "dispatched" {
			return fail("CONFLICT", "ATTEMPT_NOT_DISPATCHED")
		}
		charge := measured
		if o.Knowledge == "unknown" || o.Knowledge == "estimate" && charge < reserved {
			charge = reserved
		}
		if charge == 0 && o.Knowledge != "known" {
			charge = reserved
		}
		for _, a := range []string{account, "profile:" + b.e.Access.ProfileID} {
			var charged int64
			if e := tx.QueryRowContext(ctx, "SELECT charged_tokens FROM model_budget_accounts WHERE account_id=?", a).Scan(&charged); e != nil {
				return e
			}
			if _, ok := policy.Sum(charged, charge); !ok {
				return api.Invalid("INVALID_MODEL_USAGE")
			}
			if _, e := tx.ExecContext(ctx, "UPDATE model_budget_accounts SET reserved_tokens=reserved_tokens-?,charged_tokens=charged_tokens+?,revision=revision+1 WHERE account_id=?", reserved, charge, a); e != nil {
				return e
			}
		}
		if _, e := tx.ExecContext(ctx, "UPDATE model_attempts SET state='settled',knowledge=?,input_tokens=?,output_tokens=?,charged_tokens=?,producer_ended=1,settlement_hash=?,revision=revision+1 WHERE attempt_id=?", o.Knowledge, o.InputTokens, o.OutputTokens, charge, hash, res.ID); e != nil {
			return e
		}
		out.Knowledge = o.Knowledge
		out.InputTokens = o.InputTokens
		out.OutputTokens = o.OutputTokens
		// Settlement alone does not end an active Engine execution. A late
		// producer does release a stopped/terminal child's scheduler slot.
		if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET child_slot=0 WHERE run_id=? AND status NOT IN('running','preparing') AND NOT EXISTS(SELECT 1 FROM model_attempts WHERE run_id=? AND state='dispatched' AND producer_ended=0)", b.e.Run.ID, b.e.Run.ID); e != nil {
			return e
		}
		if e := b.s.refreshSettledUsageInTx(ctx, tx, b.e.Run.ID); e != nil {
			return e
		}
		return b.s.cleanupInTx(ctx, tx, b.e.Run.ID)
	})
	return out, err
}
func (b *bound) AbortUnsent(ctx context.Context, res api.AttemptReservation) error {
	return b.s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		var state, account string
		var amount int64
		if e := tx.QueryRowContext(ctx, "SELECT state,account_id,reserved_tokens FROM model_attempts WHERE attempt_id=? AND run_id=? AND claim_token=?", res.ID, b.e.Run.ID, b.e.ClaimToken).Scan(&state, &account, &amount); e != nil {
			return e
		}
		if state == "aborted" {
			return nil
		}
		if state != "reserved" {
			return fail("CONFLICT", "ATTEMPT_ALREADY_DISPATCHED")
		}
		for _, a := range []string{account, "profile:" + b.e.Access.ProfileID} {
			if _, e := tx.ExecContext(ctx, "UPDATE model_budget_accounts SET reserved_tokens=reserved_tokens-?,revision=revision+1 WHERE account_id=?", amount, a); e != nil {
				return e
			}
		}
		_, e := tx.ExecContext(ctx, "UPDATE model_attempts SET state='aborted',producer_ended=1,revision=revision+1 WHERE attempt_id=?", res.ID)
		return e
	})
}

func (s *Store) UsageInTx(ctx context.Context, tx *sql.Tx, runID string) (*api.RunUsage, error) {
	var role string
	if e := tx.QueryRowContext(ctx, "SELECT execution_role FROM execution_runs WHERE run_id=?", runID).Scan(&role); e != nil {
		return nil, e
	}
	query := "SELECT knowledge,input_tokens,output_tokens FROM model_attempts WHERE run_id=? AND state IN('dispatched','settled')"
	if role == "orchestration" {
		query = "WITH RECURSIVE tree(run_id) AS (SELECT run_id FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id FROM execution_runs r JOIN tree t ON r.parent_run_id=t.run_id) SELECT a.knowledge,a.input_tokens,a.output_tokens FROM model_attempts a JOIN tree t ON t.run_id=a.run_id WHERE a.state IN('dispatched','settled')"
	}
	rows, e := tx.QueryContext(ctx, query, runID)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	var count int
	known := true
	knowledge := "known"
	var input, output int64
	for rows.Next() {
		var k, a, z string
		if e = rows.Scan(&k, &a, &z); e != nil {
			return nil, e
		}
		count++
		x, ok := policy.Quantity(a)
		y, ok2 := policy.Quantity(z)
		if k != "known" || !ok || !ok2 {
			known = false
			if k == "unknown" || k == "" || !ok || !ok2 {
				knowledge = "unknown"
			} else if knowledge != "unknown" {
				knowledge = "estimate"
			}
			if !ok || !ok2 {
				continue
			}
		}
		var good bool
		input, good = policy.Sum(input, x)
		if !good {
			return nil, api.Invalid("MODEL_USAGE_OVERFLOW")
		}
		output, good = policy.Sum(output, y)
		if !good {
			return nil, api.Invalid("MODEL_USAGE_OVERFLOW")
		}
	}
	if e = rows.Err(); e != nil {
		return nil, e
	}
	if count == 0 {
		return nil, nil
	}
	u := &api.RunUsage{Estimated: !known, Knowledge: knowledge}
	if knowledge != "unknown" {
		u.InputTokens = strconv.FormatInt(input, 10)
		u.OutputTokens = strconv.FormatInt(output, 10)
	}
	return u, nil
}

var _ api.AttemptBinder = (*Store)(nil)
