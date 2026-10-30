package execution

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	runstate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/run"
	"strconv"
	"strings"
)

func (s *Store) Recover(ctx context.Context) error {
	return s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if s.recovery != nil {
			if e := s.recovery.ResetRuntimeInTx(ctx, tx); e != nil {
				return e
			}
		}
		rows, e := tx.QueryContext(ctx, "SELECT run_id FROM execution_runs WHERE status IN('preparing','running','recovering')")
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var id string
			if e = rows.Scan(&id); e != nil {
				_ = rows.Close()
				return e
			}
			ids = append(ids, id)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		for _, id := range ids {
			if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET status='interrupted',revision=revision+1,claim_token='',reason='PROCESS_INTERRUPTED' WHERE run_id=? AND status IN('preparing','running','recovering')", id); e != nil {
				return e
			}
			if e = AddEventInTx(ctx, tx, id, "interrupted", map[string]string{"reason": "PROCESS_INTERRUPTED"}); e != nil {
				return e
			}
		}
		if s.recovery != nil {
			if e := s.recovery.MarkInterruptedTreesInTx(ctx, tx, ids); e != nil {
				return e
			}
		}
		if recoverer, ok := s.tree.(interface {
			RecoverAttemptsInTx(context.Context, *sql.Tx) error
		}); ok {
			return recoverer.RecoverAttemptsInTx(ctx, tx)
		}
		return nil
	})
}

// A cursor is process-local scheduling state, never recovery or permission
// evidence. It advances only after the transaction commits successfully.
type claimCursor struct{ createdAt, runID string }

func (s *Store) Claim(ctx context.Context) (*executorapp.Work, error) {
	if s.stopping.Load() {
		return nil, nil
	}
	// Keep cursor publication and its SQL transaction in the same serialized
	// Claim operation, while allowing canceled callers to leave the queue.
	select {
	case s.claimGate <- struct{}{}:
		defer func() { <-s.claimGate }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	var work *executorapp.Work
	nextClaim, nextApproval := s.claimAfter, s.approvalAfter
	nextParent := s.parentAfter
	nextMemory := s.memoryAfter
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if s.stopping.Load() {
			return nil
		}
		if s.control != nil {
			if e := s.control.ExpireInTx(ctx, tx); e != nil {
				return e
			}
		}
		rows, e := tx.QueryContext(ctx, "SELECT created_at,run_id FROM execution_runs WHERE status IN('accepted','recovering') AND (created_at>? OR (created_at=? AND run_id>?)) ORDER BY created_at,run_id LIMIT 128", nextClaim.createdAt, nextClaim.createdAt, nextClaim.runID)
		if e != nil {
			return e
		}
		candidates := []claimCursor{}
		for rows.Next() {
			var key claimCursor
			if e = rows.Scan(&key.createdAt, &key.runID); e != nil {
				break
			}
			candidates = append(candidates, key)
		}
		if e == nil {
			e = rows.Err()
		}
		ce := rows.Close()
		if e != nil {
			return e
		}
		if ce != nil {
			return ce
		}
		for _, key := range candidates {
			nextClaim = key
			if s.recovery != nil {
				if gateErr := s.recovery.CheckInTx(ctx, tx, key.runID); gateErr != nil {
					if recoveryRefusal(gateErr) {
						continue
					}
					return gateErr
				}
			}
			allowed := true
			if s.tree != nil {
				allowed, e = s.tree.ClaimInTx(ctx, tx, key.runID)
				if e != nil {
					return e
				}
			}
			if allowed {
				work, e = s.claimInTx(ctx, tx, key.runID, nil)
				if e != nil {
					return e
				}
				if work != nil {
					return nil
				}
				// A known inbox refusal was atomically finalized. Continue the
				// remaining page; an unknown error instead rolls everything back.
			}
		}
		if len(candidates) < 128 {
			nextClaim = claimCursor{}
		}
		if s.control != nil {
			ids, e := s.control.ReadyInTx(ctx, tx, nextApproval)
			if e != nil {
				return e
			}
			for _, id := range ids {
				nextApproval = id
				if s.recovery != nil {
					if e = s.recovery.CheckInTx(ctx, tx, id); e != nil {
						if recoveryRefusal(e) {
							continue
						}
						return e
					}
				}
				if s.tree != nil {
					allowed, e := s.tree.ClaimInTx(ctx, tx, id)
					if e != nil {
						return e
					}
					if !allowed {
						continue
					}
				}
				work, e = s.claimInTx(ctx, tx, id, nil)
				if e != nil {
					return e
				}
				if work != nil {
					return nil
				}
			}
			if len(ids) < 128 {
				nextApproval = ""
			}
		}
		if s.tree == nil {
			work, nextMemory, e = s.claimMemoryInTx(ctx, tx, nextMemory)
			return e
		}
		ready, e := s.tree.ReadyParentInTx(ctx, tx, nextParent)
		if e != nil {
			return e
		}
		nextParent = ready.Next
		id := ready.RunID
		if id == "" {
			work, nextMemory, e = s.claimMemoryInTx(ctx, tx, nextMemory)
			return e
		}
		allowed, e := s.tree.ClaimInTx(ctx, tx, id)
		if e != nil {
			return e
		}
		if !allowed {
			// ReadyParent may already have reserved its slot and consumed its
			// durable result in this transaction. A concurrent stop latch must
			// roll back that selection instead of committing a stranded parent.
			return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
		}
		work, e = s.claimInTx(ctx, tx, id, ready.Result)
		return e
	})
	if e != nil {
		return nil, e
	}
	s.claimAfter, s.approvalAfter = nextClaim, nextApproval
	s.parentAfter = nextParent
	s.memoryAfter = nextMemory
	return work, nil
}

func (s *Store) claimInTx(ctx context.Context, tx *sql.Tx, id string, completed *api.EngineResult) (*executorapp.Work, error) {
	r, input, principal, _, e := readRun(ctx, tx, id)
	if e != nil {
		return nil, e
	}
	var position api.ExecutionPosition
	recovering := r.Status == "recovering"
	if recovering {
		inspected, err := s.ReadRecoveryInTx(ctx, tx, api.NewConnectionIdentity("recovery-claim", principal, false), api.IDQuery{ProfileID: input.ProfileID, ID: id})
		if err != nil {
			return nil, err
		}
		position = inspected.Position
		completed = position.CompletedResult
	}
	if r.Role == "orchestration" && (completed == nil || completed.Status == "resume_children") {
		return nil, api.Invalid("ORCHESTRATION_STATE_INVALID")
	}
	cfg, lineage, e := s.ReadExecutionConfigInTx(ctx, tx, id)
	if e != nil {
		return nil, e
	}
	token := api.NewID("claim:")
	result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET status='preparing',revision=revision+1,claim_token=? WHERE run_id=? AND status IN('accepted','recovering','waiting_approval','waiting_children') AND revision=?", token, id, r.Revision)
	if e != nil {
		return nil, e
	}
	n, e := result.RowsAffected()
	if e != nil {
		return nil, e
	}
	if n != 1 {
		return nil, nil
	}
	r.Status = "preparing"
	r.Revision = next(r.Revision)
	work := &executorapp.Work{Run: r, ClaimToken: token, Access: input, Identity: api.NewConnectionIdentity("executor:"+id, principal, false), Input: api.EngineInput{RunID: id, SessionID: r.SessionID, Agent: cfg.Agent, Config: cfg, Lineage: lineage}}
	if completed != nil && completed.Status == "resume_children" {
		if completed.Suspension == nil {
			return nil, api.Invalid("INVALID_EXECUTION_WAIT")
		}
		work.Continuation = &api.RunContinuation{Kind: completed.Suspension.Kind, Checkpoint: completed.Suspension.Checkpoint, Children: completed.Children}
		completed = nil
	}
	work.CompletedResult = completed
	if recovering {
		work.Continuation = position.Continuation
		work.RecoveryDecision = position.Decision
		if work.Continuation != nil && work.Continuation.Kind == "" {
			if rebind, ok := s.control.(interface {
				RebindContinuationInTx(context.Context, *sql.Tx, string, string, api.ExecutionPosition) error
			}); ok {
				if e = rebind.RebindContinuationInTx(ctx, tx, id, token, position); e != nil {
					return nil, e
				}
			} else {
				return nil, api.Invalid("RECOVERY_CONTINUATION_NOT_ASSEMBLED")
			}
		}
	}
	if s.control != nil && !recovering && completed == nil && work.Continuation == nil {
		work.Continuation, e = s.control.ClaimInTx(ctx, tx, id, token)
		if e != nil {
			return nil, e
		}
	}
	if e = tx.QueryRowContext(ctx, "SELECT intent,user_message_id FROM execution_runs WHERE run_id=?", id).Scan(&work.Input.Intent, &work.UserMessageID); e != nil {
		return nil, e
	}
	if s.memory != nil && r.Role != "orchestration" {
		if e = tx.QueryRowContext(ctx, "SELECT context_policy_version FROM execution_runs WHERE run_id=?", id).Scan(&work.ContextPolicy); e != nil {
			return nil, e
		}
		work.Input.Memory, e = s.memory.ReadInputInTx(ctx, tx, work.Identity, id)
		if e != nil {
			if refusal := memoryCurrentRejection(e); refusal != nil {
				return nil, s.finalizeInTx(ctx, tx, *work, api.EngineResult{Status: "failed", Reason: refusal.Reason}, true)
			}
			return nil, e
		}
		work.Maintenance = work.Input.Memory != nil && work.Input.Memory.Mode == "maintenance"
		if work.Continuation != nil && work.ContextPolicy != "" {
			work.Input.ShortTerm, e = s.memory.ReadContextInTx(ctx, tx, work.Identity, id)
			if e != nil {
				if refusal := memoryCurrentRejection(e); refusal != nil {
					return nil, s.finalizeInTx(ctx, tx, *work, api.EngineResult{Status: "failed", Reason: refusal.Reason}, true)
				}
				return nil, e
			}
			if work.Input.ShortTerm == nil {
				return nil, api.Invalid("CONTEXT_INPUT_STATE_INVALID")
			}
		}
	}
	if reader, ok := s.tree.(interface {
		DelegationInputInTx(context.Context, *sql.Tx, string) (*api.DelegationInput, error)
	}); ok && !work.Maintenance {
		work.Input.Delegation, e = reader.DelegationInputInTx(ctx, tx, id)
		if e != nil {
			return nil, e
		}
	} else if work.Input.Lineage.DelegationID != "" {
		return nil, api.Invalid("DELEGATION_INPUT_NOT_ASSEMBLED")
	}

	if reader, ok := s.tree.(interface {
		MessagesInTx(context.Context, *sql.Tx, string) ([]api.AgentMessage, error)
	}); ok && !work.Maintenance && work.RecoveryDecision == nil {
		messages, e := reader.MessagesInTx(ctx, tx, id)
		if e != nil {
			if refusal := claimMessageRejection(e); refusal != nil {
				return nil, s.finalizeInTx(ctx, tx, *work, api.EngineResult{Status: "failed", Reason: refusal.Reason}, true)
			}
			return nil, e
		}
		work.Input.Messages = messages
		if work.Continuation != nil {
			work.InboxCandidates = append([]api.AgentMessage(nil), messages...)
		}
		if len(messages) > 0 {
			// Inbox consumption can persist exact source/member contributors.
			// Re-read those same-transaction facts before exposing any text to
			// the Engine or binding its actual HTTP/Host capabilities.
			fresh, access, owner, _, readErr := readRun(ctx, tx, id)
			if readErr != nil {
				return nil, readErr
			}
			if owner != principal {
				return nil, api.Denied("SESSION_READ_DENIED")
			}
			work.Run = fresh
			work.Access = access
			work.Input.Lineage.Group = access.Group
			var derived string
			if readErr = tx.QueryRowContext(ctx, "SELECT derived_json FROM execution_runs WHERE run_id=?", id).Scan(&derived); readErr != nil {
				return nil, readErr
			}
			if json.Unmarshal([]byte(derived), &work.Input.Lineage.Derived) != nil {
				return nil, api.Invalid("RUN_CONTEXT_INVALID")
			}
		}
		for _, m := range messages {
			h := sha256.Sum256([]byte(m.Text))
			work.Input.Lineage.Derived = append(work.Input.Lineage.Derived, api.DerivedInput{Kind: "message", ID: m.ID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(h[:]), Namespace: m.WorkThreadID, WorkThreadID: m.WorkThreadID})
		}
	}
	position = api.ExecutionPosition{Phase: "run", Continuation: work.Continuation, Decision: work.RecoveryDecision, CompletedResult: work.CompletedResult}
	if work.Continuation != nil {
		position.Phase = "continuation"
		if work.RecoveryDecision != nil {
			position.Phase = "resume"
		}
	} else if work.CompletedResult != nil {
		position.Phase = "application"
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET execution_position_json=? WHERE run_id=? AND claim_token=?", jsonArray(position), id, token); e != nil {
		return nil, e
	}
	if e := AddEventInTx(ctx, tx, id, "preparing", map[string]string{"status": "preparing"}); e != nil {
		return nil, e
	}
	return work, nil
}

// Only predictable current inbox refusals may consume an accepted task. A
// malformed persisted value, lost relationship, SQL/I/O failure or unknown
// typed error must keep the original transaction failure and cannot be skipped.
func claimMessageRejection(err error) *api.Fault {
	var f *api.Fault
	if !errors.As(err, &f) {
		return nil
	}
	if f.Kind == "CAPABILITY_DENIED" {
		switch f.Reason {
		case "GROUP_MEMBER_REMOVED", "GROUP_MEMBER_GENERATION_CHANGED", "GRANT_REVOKED", "GRANT_EXPIRED", "SOURCE_NOT_GRANTED", "OPERATION_NOT_GRANTED", "RECIPIENT_NOT_GRANTED", "PARENT_SCOPE_EXCEEDED", "PARENT_SCOPE_CHANGED", "TEMPORARY_RECIPIENT_NOT_GRANTED":
			return f
		}
	}
	if f.Kind == "RESOURCE_LIMIT" && (f.Reason == "THREAD_MESSAGE_LIMIT" || f.Reason == "THREAD_CONTEXT_LIMIT" || f.Reason == "THREAD_PROVENANCE_LIMIT") {
		return f
	}
	return nil
}

func (s *Store) MarkRunning(ctx context.Context, w executorapp.Work) error {
	return s.Base.WithinTx(ctx, func(tx *sql.Tx) error { return s.markRunningInTx(ctx, tx, w) })
}
func (s *Store) markRunningInTx(ctx context.Context, tx *sql.Tx, w executorapp.Work) error {
	if s.stopping.Load() {
		return api.Denied("SERVICE_STOPPING")
	}
	if w.ContextPolicy != "" {
		result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET group_binding_json=? WHERE run_id=? AND status='preparing' AND claim_token=?", groupJSON(w.Access.Group), w.Run.ID, w.ClaimToken)
		if e != nil {
			return e
		}
		n, e := result.RowsAffected()
		if e != nil {
			return e
		}
		if n != 1 {
			return api.Invalid("RUN_CLAIM_CHANGED")
		}
	}

	if s.recovery != nil {
		if e := s.recovery.CheckInTx(ctx, tx, w.Run.ID); e != nil {
			return e
		}
	}
	if s.access != nil {
		if e := s.access.CheckInTx(ctx, tx, w.Identity, w.Access, []string{"read", "send"}); e != nil {
			return e
		}
	}
	r, e := tx.ExecContext(ctx, "UPDATE execution_runs SET status='running',revision=revision+1,effective_source_json=?,effective_scope_json=?,effective_grants_json=? WHERE run_id=? AND status='preparing' AND claim_token=?", jsonArray(w.Access.Sources), jsonArray(w.Access.Scopes), jsonArray(w.Access.GrantIDs), w.Run.ID, w.ClaimToken)
	if e != nil {
		return e
	}
	n, _ := r.RowsAffected()
	if n != 1 {
		return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
	}
	lineage := w.Input.Lineage.Derived
	if len(lineage) > 128 {
		return api.Invalid("RUN_LINEAGE_LIMIT")
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET derived_json=? WHERE run_id=?", jsonArray(lineage), w.Run.ID); e != nil {
		return e
	}
	for _, ref := range lineage {
		if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_lineage VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING", w.Run.ID, ref.Kind, ref.ID, ref.Revision, ref.Hash, ref.Namespace, ref.WorkThreadID); e != nil {
			return e
		}
	}

	return AddEventInTx(ctx, tx, w.Run.ID, "running", map[string]string{"status": "running"})
}
func (s *Store) AppendEvent(ctx context.Context, w executorapp.Work, event api.EngineEvent) error {
	if len(event.Text) > 65536 || len(event.Type) > 128 || event.Type == "" {
		return api.Invalid("INVALID_ENGINE_EVENT")
	}
	// Durable lifecycle and effect facts are owned by their transactions, never
	// by a streamed engine observation. A model adapter cannot forge a projection
	// state or an approval/receipt before its corresponding durable fact exists.
	switch event.Type {
	case "accepted", "preparing", "running", "waiting_approval", "waiting_children", "recovering", "canceling", "succeeded", "failed", "canceled", "interrupted", "blocked":
		return api.Invalid("RESERVED_ENGINE_EVENT")
	}
	if strings.HasPrefix(event.Type, "approval.") || strings.HasPrefix(event.Type, "effect.") || strings.HasPrefix(event.Type, "run.") {
		return api.Invalid("RESERVED_ENGINE_EVENT")
	}
	if event.Type == "text-delta" {
		event.Type = "text.delta"
	}
	return s.Base.WithinObservationTx(ctx, func(tx *sql.Tx) error {
		if s.recovery != nil {
			if e := s.recovery.CheckInTx(ctx, tx, w.Run.ID); e != nil {
				return e
			}
		}
		var state, token string
		if e := tx.QueryRowContext(ctx, "SELECT status,claim_token FROM execution_runs WHERE run_id=?", w.Run.ID).Scan(&state, &token); e != nil {
			return e
		}
		if state != "running" || token != w.ClaimToken {
			return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
		}
		if w.Access.Group != nil || w.ContextPolicy != "" || w.Maintenance {
			fresh, in, principal, _, e := readRun(ctx, tx, w.Run.ID)
			if e != nil {
				return e
			}
			if principal != w.Identity.PrincipalID() {
				return api.Denied("SESSION_READ_DENIED")
			}
			w.Run = fresh
			w.Access = in
		}
		if s.access != nil {
			if e := s.access.CheckInTx(ctx, tx, w.Identity, w.Access, []string{"read", "send"}); e != nil {
				return e
			}
		}
		return AddEventInTx(ctx, tx, w.Run.ID, event.Type, map[string]string{"text": event.Text})
	})
}
func validUsage(v string) bool {
	n, e := strconv.ParseInt(v, 10, 64)
	return e == nil && n >= 0 && strconv.FormatInt(n, 10) == v
}
func validKnowledge(value string) bool {
	return value == "" || value == "known" || value == "estimate" || value == "unknown"
}
func normalizeUsage(u api.RunUsage) api.RunUsage {
	if !validKnowledge(u.Knowledge) {
		u.Knowledge = "unknown"
	}
	if u.InputTokens != "" && !validUsage(u.InputTokens) {
		u.InputTokens = ""
	}
	if u.OutputTokens != "" && !validUsage(u.OutputTokens) {
		u.OutputTokens = ""
	}
	if u.Knowledge == "known" && (u.InputTokens == "" || u.OutputTokens == "") {
		u.Knowledge = "unknown"
	}
	if u.Knowledge == "estimate" {
		u.Estimated = true
	}
	return u
}
func (s *Store) Finalize(ctx context.Context, w executorapp.Work, result api.EngineResult) error {
	return s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		return s.finalizeInTx(ctx, tx, w, result, false)
	})
}

// finalizeInTx is shared by completed producers and a rejected claimed inbox.
// rejectedMessage is only set after classifying a current message refusal; that
// path supplies a body-free failure instead of requiring the refused permission
// a second time. All lifecycle, ledger and release writes remain identical.
func (s *Store) finalizeInTx(ctx context.Context, tx *sql.Tx, w executorapp.Work, result api.EngineResult, rejectedMessage bool) error {
	if (!w.Maintenance && result.MemoryCandidates != nil) || (w.Maintenance && result.Text != "") {
		result = api.EngineResult{Status: "failed", Reason: "INVALID_ENGINE_RESULT"}
	}
	state, ok := runstate.ResultState(result.Status)
	if !ok || len(result.Text) > 131072 || len(result.Reason) > 128 || result.Status == "suspended" {
		result = api.EngineResult{Status: "failed", Reason: "INVALID_ENGINE_RESULT"}
		state = "failed"
	}
	// Missing or malformed counters remain unknown; a measured zero is "0".
	result.Usage = normalizeUsage(result.Usage)
	var measured *api.RunUsage
	if result.Usage.InputTokens != "" || result.Usage.OutputTokens != "" || result.Usage.Knowledge != "" {
		copyUsage := result.Usage
		measured = &copyUsage
	}

	var oldState, token string
	if e := tx.QueryRowContext(ctx, "SELECT status,claim_token FROM execution_runs WHERE run_id=?", w.Run.ID).Scan(&oldState, &token); e != nil {
		return e
	}
	if token != w.ClaimToken || (oldState != "preparing" && oldState != "running") {
		return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
	}
	if w.Access.Group != nil || w.ContextPolicy != "" || w.Maintenance {
		// Tools may synchronously consume a private result during this Engine
		// invocation. Its effective authorization/provenance is a persisted
		// fact, not the immutable launch-time ToolExecution value.
		fresh, in, principal, _, e := readRun(ctx, tx, w.Run.ID)
		if e != nil {
			return e
		}
		if principal != w.Identity.PrincipalID() {
			return api.Denied("SESSION_READ_DENIED")
		}
		w.Run = fresh
		w.Access = in
		w.Input.Lineage.Group = in.Group
	}
	if s.access != nil && !rejectedMessage && w.Run.Role != "orchestration" {
		if e := s.access.CheckInTx(ctx, tx, w.Identity, w.Access, []string{"read", "send"}); e != nil {
			var fault *api.Fault
			if !errors.As(e, &fault) || (fault.Kind != "CAPABILITY_DENIED" && fault.Kind != "MODEL_UNAVAILABLE" && fault.Kind != "HOST_UNAVAILABLE" && fault.Kind != "SOURCE_CHANGED") {
				return e
			}
			result.Status = "failed"
			result.Reason = "ACCESS_REVOKED"
			if refusal := memoryCurrentRejection(e); refusal != nil {
				result.Reason = refusal.Reason
			}
			result.Text = ""
			result.Partial = false
			state = "failed"
		}
	}

	if s.groupPublisher != nil && w.Access.Group != nil {
		if e := s.groupPublisher.CheckResultInTx(ctx, tx, w.Run.ID, &result); e != nil {
			return e
		}
	}
	if s.control != nil {
		unresolved, e := s.control.FinalizeInTx(ctx, tx, w.Run.ID)
		if e != nil {
			return e
		}
		if unresolved {
			if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET effects_unresolved=1 WHERE run_id=?", w.Run.ID); e != nil {
				return e
			}
			if state == "succeeded" {
				state = "failed"
				result.Status = "failed"
				result.Reason = "EFFECTS_UNRESOLVED"
				result.Partial = result.Text != ""
			}
		}
	}
	if s.tree != nil {
		if e := s.tree.FinalizeInTx(ctx, tx, w.Run.ID, &result); e != nil {
			return e
		}
	}
	if s.memory != nil && w.Maintenance && result.Status == "finished" {
		candidates := api.MemoryCandidateSet{Items: []api.MemoryCandidateDraft{}}
		if result.MemoryCandidates != nil {
			candidates = *result.MemoryCandidates
		}
		if _, e := tx.ExecContext(ctx, "SAVEPOINT memory_commit"); e != nil {
			return e
		}
		if _, e := s.memory.CommitInTx(ctx, tx, contextExecution(w), candidates); e != nil {
			if !memoryCommitRefusal(e) {
				return e
			}
			if _, rollbackErr := tx.ExecContext(ctx, "ROLLBACK TO memory_commit"); rollbackErr != nil {
				return rollbackErr
			}
			var f *api.Fault
			_ = errors.As(e, &f)
			result = api.EngineResult{Status: "failed", Reason: f.Reason, Usage: result.Usage}
			state = "failed"
		}
		if _, e := tx.ExecContext(ctx, "RELEASE memory_commit"); e != nil {
			return e
		}
	}
	if result.Status == "waiting_children" {
		state = "waiting_children"
	} else {
		var valid bool
		state, valid = runstate.ResultState(result.Status)
		if !valid {
			return api.Invalid("INVALID_FINAL_STATE")
		}
	}
	if s.groupPublisher != nil && w.Access.Group != nil && result.Status != "waiting_children" {
		if e := s.groupPublisher.PublishInTx(ctx, tx, w.Run.ID, &result); e != nil {
			return e
		}
	}
	measured = nil
	result.Usage = normalizeUsage(result.Usage)
	if result.Usage.InputTokens != "" || result.Usage.OutputTokens != "" || result.Usage.Knowledge != "" {
		value := result.Usage
		measured = &value
	}
	messageID := ""
	if !w.Maintenance && w.Run.Role != "orchestration" && w.Run.ParentRunID == "" && w.Input.Lineage.WorkThreadID == w.Run.SessionID && (result.Status == "finished" || result.Partial && result.Text != "") {
		var e error
		messageID, e = conv.MessageInTx(ctx, tx, w.Run.SessionID, w.Run.ID, "assistant", result.Text, w.Run.AgentID, w.Access.Sources, result.Partial, "")
		if e != nil {
			return e
		}
	}

	usage := []byte{}
	if measured != nil {
		usage, _ = json.Marshal(measured)
	}
	if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET status=?,revision=revision+1,reason=?,usage_json=?,checkpoint_ref=? WHERE run_id=? AND claim_token=?", state, result.Reason, string(usage), result.CheckpointRef, w.Run.ID, w.ClaimToken); e != nil {
		return e
	}
	if s.memory != nil && !w.Maintenance && w.Run.Role != "orchestration" && result.Text != "" && state != "waiting_children" && (messageID != "" || result.Status == "finished" || result.Partial) {
		outputID := messageID
		if outputID == "" {
			outputID = w.Run.ID
		}
		if e := s.memory.RecordOutputInTx(ctx, tx, contextExecution(w), outputID); e != nil {
			return e
		}
		if e := s.memory.RecordCompletionInTx(ctx, tx, MemoryCompletion{RunID: w.Run.ID, MessageID: messageID}); e != nil {
			return e
		}
	}
	if e := AddEventInTx(ctx, tx, w.Run.ID, state, map[string]any{"status": state, "reason": result.Reason, "messageId": messageID, "usage": measured}); e != nil {
		return e
	}
	if runstate.Terminal(state) {
		if _, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET active_run_id=NULL,revision=revision+1 WHERE session_id=? AND active_run_id=?", w.Run.SessionID, w.Run.ID); e != nil {
			return e
		}
		if e := s.ReleaseTerminalPinsInTx(ctx, tx, w.Run.ID); e != nil {
			return e
		}
	}
	return conv.Bump(ctx, tx)
}

var _ executorapp.Repository = (*Store)(nil)

func (s *Store) Block(ctx context.Context, w executorapp.Work, reason string) error {
	return s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET status='blocked',revision=revision+1,reason=?,claim_token='',admission_closed=1 WHERE run_id=? AND claim_token=? AND status IN('preparing','running')", reason, w.Run.ID, w.ClaimToken)
		if e != nil {
			return e
		}
		n, _ := result.RowsAffected()
		if n != 1 {
			return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
		}
		if s.control != nil {
			if e = s.control.BlockInTx(ctx, tx, w.Run.ID); e != nil {
				return e
			}
		}
		return AddEventInTx(ctx, tx, w.Run.ID, "blocked", map[string]string{"status": "blocked", "reason": reason})
	})
}
