package execution

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
)

type RecoveryGuard interface {
	CheckInTx(context.Context, *sql.Tx, string) error
	ResetRuntimeInTx(context.Context, *sql.Tx) error
	MarkInterruptedTreesInTx(context.Context, *sql.Tx, []string) error
}

func (s *Store) StopAdmission()              { s.stopping.Store(true) }
func (s *Store) SetRecovery(g RecoveryGuard) { s.recovery = g }

// ReadRecoveryInTx shares the original owner, Session, configuration-pin and
// effective-provenance readers. It neither consumes a continuation nor claims.
func (s *Store) ReadRecoveryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.IDQuery) (api.RecoveryInspection, error) {
	var out api.RecoveryInspection
	var e error
	out.Run, out.Access, e = ReadInTx(ctx, tx, id, q)
	if e != nil {
		return out, e
	}
	out.Config, _, e = s.ReadExecutionConfigInTx(ctx, tx, q.ID)
	if e != nil {
		return out, e
	}
	var raw string
	if e = tx.QueryRowContext(ctx, "SELECT intent,execution_position_json FROM execution_runs WHERE run_id=?", q.ID).Scan(&out.Intent, &raw); e != nil {
		return out, e
	}
	if s.memory != nil && out.Run.Role != "orchestration" {
		out.Memory, e = s.memory.ReadInputInTx(ctx, tx, id, q.ID)
		if e != nil {
			return out, e
		}
		out.ShortTerm, e = s.memory.ReadContextInTx(ctx, tx, id, q.ID)
		if e != nil {
			return out, e
		}
		var policy string
		if e = tx.QueryRowContext(ctx, "SELECT context_policy_version FROM execution_runs WHERE run_id=?", q.ID).Scan(&policy); e != nil {
			return out, e
		}
		if policy != "" && policy != "extractive-v1" {
			return out, conv.Fault("CONFLICT", "CONTEXT_INPUT_STATE_INVALID")
		}
		if policy != "" && out.ShortTerm == nil && out.Run.Status != "accepted" && out.Run.Status != "preparing" {
			return out, conv.Fault("RECOVERY_BLOCKED", "CONTEXT_INPUT_STATE_INVALID")
		}
	}
	if raw != "" {
		if json.Unmarshal([]byte(raw), &out.Position) != nil {
			return out, conv.Fault("CONFLICT", "RECOVERY_POSITION_INVALID")
		}
		// Continue and the program-position write are distinct commits. If
		// Continue committed but the following position write failed, derive
		// its already-completed decision from the original effect facts. No
		// continuation is reset, consumed twice or dispatched again.
		if out.Position.Phase == "continuation" && out.Position.Continuation != nil && out.Position.Continuation.Kind == "" {
			if legacy, ok := s.control.(interface {
				LegacyPositionInTx(context.Context, *sql.Tx, string) (api.ExecutionPosition, error)
			}); ok {
				actual, e := legacy.LegacyPositionInTx(ctx, tx, q.ID)
				if e != nil {
					return out, e
				}
				if actual.Phase == "resume" {
					if !reflect.DeepEqual(actual.Continuation, out.Position.Continuation) {
						return out, conv.Fault("CONFLICT", "RECOVERY_POSITION_INVALID")
					}
					out.Position = actual
				}
			}
		}
		return out, nil
	}
	if legacy, ok := s.control.(interface {
		LegacyPositionInTx(context.Context, *sql.Tx, string) (api.ExecutionPosition, error)
	}); ok {
		out.Position, e = legacy.LegacyPositionInTx(ctx, tx, q.ID)
		if e != nil {
			return out, e
		}
	}
	if out.Position.Phase == "" {
		if legacy, ok := s.tree.(interface {
			LegacyPositionInTx(context.Context, *sql.Tx, string) (api.ExecutionPosition, error)
		}); ok {
			out.Position, e = legacy.LegacyPositionInTx(ctx, tx, q.ID)
			if e != nil {
				return out, e
			}
		}
	}
	if out.Position.Phase == "" {
		out.Position.Phase = "run"
	}
	return out, nil
}

// ResumeInTx only reopens the selected program position. It preserves all
// original ledgers and identities; the next Claim allocates a fresh token.
func (s *Store) ResumeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, runID string) error {
	inspected, e := s.ReadRecoveryInTx(ctx, tx, id, api.IDQuery{ProfileID: profileID, ID: runID})
	if e != nil {
		return e
	}
	switch inspected.Run.Status {
	case "interrupted", "blocked":
	default:
		return conv.Fault("CONFLICT", "RUN_NOT_INTERRUPTED")
	}
	raw, e := json.Marshal(inspected.Position)
	if e != nil {
		return e
	}
	result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET status='recovering',revision=revision+1,reason='',claim_token='',execution_position_json=? WHERE run_id=? AND revision=? AND status IN('interrupted','blocked')", string(raw), runID, inspected.Run.Revision)
	if e != nil {
		return e
	}
	n, e := result.RowsAffected()
	if e != nil {
		return e
	}
	if n != 1 {
		return conv.Fault("CONFLICT", "REVISION_CONFLICT")
	}
	return AddEventInTx(ctx, tx, runID, "recovering", map[string]string{"status": "recovering"})
}

// SaveResume freezes both the original continuation result and its qualified
// inbox before the Engine can observe either. On recovery the saved decision is
// replayed exactly; later inbox rows are never added to that position.
func (s *Store) SaveResume(ctx context.Context, w executorapp.Work, decision api.ToolResult) (api.ToolResult, error) {
	if w.Continuation == nil {
		return decision, api.Invalid("RECOVERY_POSITION_INVALID")
	}
	err := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if s.recovery != nil {
			if e := s.recovery.CheckInTx(ctx, tx, w.Run.ID); e != nil {
				return e
			}
		}
		var status, claim, principal string
		if e := tx.QueryRowContext(ctx, "SELECT status,claim_token,principal_id FROM execution_runs WHERE run_id=?", w.Run.ID).Scan(&status, &claim, &principal); e != nil {
			return e
		}
		if status != "running" || claim != w.ClaimToken || principal != w.Identity.PrincipalID() {
			return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
		}
		if w.RecoveryDecision != nil {
			if !reflect.DeepEqual(decision, *w.RecoveryDecision) {
				return api.Invalid("RESUME_INBOX_INVALID")
			}
			if e := api.ValidateResumeInbox(decision.ResumeInbox); e != nil {
				return e
			}
			if e := s.recheckResumeInboxInTx(ctx, tx, w.Run.ID, decision.ResumeInbox); e != nil {
				return e
			}
		} else {
			if decision.ResumeInbox != nil {
				return api.Invalid("RESUME_INBOX_INVALID")
			}
			packet, e := s.buildResumeInboxInTx(ctx, tx, w, decision)
			if e != nil {
				return e
			}
			decision.ResumeInbox = packet
		}
		p := api.ExecutionPosition{Phase: "resume", Continuation: w.Continuation, Decision: &decision}
		result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET execution_position_json=? WHERE run_id=? AND claim_token=? AND status='running'", jsonArray(p), w.Run.ID, w.ClaimToken)
		if e != nil {
			return e
		}
		n, e := result.RowsAffected()
		if e != nil {
			return e
		}
		if n != 1 {
			return conv.Fault("CONFLICT", "RUN_CLAIM_CHANGED")
		}
		return nil
	})
	return decision, err
}

type resumeMessageReader interface {
	ResumeMessagesInTx(context.Context, *sql.Tx, string, []string) ([]api.ResumeInboxItem, error)
}

func (s *Store) qualifiedResumeMessagesInTx(ctx context.Context, tx *sql.Tx, runID string, ids []string) ([]api.ResumeInboxItem, error) {
	if len(ids) == 0 {
		return []api.ResumeInboxItem{}, nil
	}
	reader, ok := s.tree.(resumeMessageReader)
	if !ok {
		return nil, api.Invalid("RESUME_INBOX_NOT_ASSEMBLED")
	}
	return reader.ResumeMessagesInTx(ctx, tx, runID, ids)
}

func (s *Store) recheckResumeInboxInTx(ctx context.Context, tx *sql.Tx, runID string, packet *api.ResumeInbox) error {
	if packet == nil {
		return nil
	}
	ids := make([]string, 0, len(packet.Messages)+len(packet.AnswerReceipts))
	want := make(map[string]api.ResumeInboxItem, cap(ids))
	for _, item := range packet.Messages {
		ids = append(ids, item.Ref.ID)
		want[item.Ref.ID] = item
	}
	answers := make(map[string]string, len(packet.AnswerReceipts))
	for _, answer := range packet.AnswerReceipts {
		ids = append(ids, answer.Ref.ID)
		want[answer.Ref.ID] = api.ResumeInboxItem{Ref: answer.Ref}
		answers[answer.Ref.ID] = answer.QuestionID
	}
	current, err := s.qualifiedResumeMessagesInTx(ctx, tx, runID, ids)
	if err != nil {
		return err
	}
	if len(current) != len(ids) {
		return api.Invalid("RESUME_INBOX_CHANGED")
	}
	for _, item := range current {
		expected, ok := want[item.Ref.ID]
		if !ok || item.Ref != expected.Ref {
			return api.Invalid("RESUME_INBOX_CHANGED")
		}
		if question, ok := answers[item.Ref.ID]; ok {
			if item.Message.Kind != "reply" || item.Message.Status != "answered" || item.Message.QuestionID != question {
				return api.Invalid("RESUME_INBOX_CHANGED")
			}
		} else if !sameClaimedMessageBody(expected.Message, item.Message) {
			return api.Invalid("RESUME_INBOX_CHANGED")
		}
	}
	return nil
}

func (s *Store) buildResumeInboxInTx(ctx context.Context, tx *sql.Tx, w executorapp.Work, decision api.ToolResult) (*api.ResumeInbox, error) {
	ids := make([]string, 0, len(w.InboxCandidates))
	claimed := make(map[string]api.AgentMessage, len(w.InboxCandidates))
	for _, candidate := range w.InboxCandidates {
		if candidate.ID == "" || claimed[candidate.ID].ID != "" {
			return nil, api.Invalid("RESUME_INBOX_INVALID")
		}
		ids = append(ids, candidate.ID)
		claimed[candidate.ID] = candidate
	}
	current, err := s.qualifiedResumeMessagesInTx(ctx, tx, w.Run.ID, ids)
	if err != nil {
		return nil, err
	}
	if len(current) != len(ids) {
		return nil, api.Invalid("RESUME_INBOX_CHANGED")
	}
	byID := make(map[string]api.ResumeInboxItem, len(current))
	for _, item := range current {
		old, ok := claimed[item.Message.ID]
		if !ok || !sameClaimedMessageBody(old, item.Message) {
			return nil, api.Invalid("RESUME_INBOX_CHANGED")
		}
		byID[item.Message.ID] = item
	}
	packet := &api.ResumeInbox{}
	answered := map[string]bool{}
	if w.Continuation.Kind == "question" {
		var raw string
		if err := tx.QueryRowContext(ctx, "SELECT checkpoint_json FROM collaboration_parent_results WHERE run_id=?", w.Run.ID).Scan(&raw); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, api.Invalid("RESUME_INBOX_CHANGED")
			}
			return nil, err
		}
		var suspension api.EngineSuspension
		if json.Unmarshal([]byte(raw), &suspension) != nil || suspension.Kind != "question" || !reflect.DeepEqual(suspension.Checkpoint, w.Continuation.Checkpoint) || len(suspension.WaitForIDs) == 0 || len(suspension.WaitForIDs) != len(decision.Children) || !reflect.DeepEqual(decision.Children, w.Continuation.Children) {
			return nil, api.Invalid("RESUME_INBOX_INVALID")
		}
		for j, questionID := range suspension.WaitForIDs {
			var answerID, answerText, thread, metadataRevision, fromRun string
			err := tx.QueryRowContext(ctx, "SELECT a.message_id,a.text,a.work_thread_id,CAST(a.revision AS TEXT),a.from_run_id FROM collaboration_messages q JOIN collaboration_messages a ON a.question_id=q.message_id AND a.kind='reply' AND a.status='answered' WHERE q.message_id=? AND q.from_run_id=? ORDER BY a.created_at,a.message_id LIMIT 1", questionID, w.Run.ID).Scan(&answerID, &answerText, &thread, &metadataRevision, &fromRun)
			if errors.Is(err, sql.ErrNoRows) {
				if decision.Children[j].Status != "succeeded" {
					continue
				}
				return nil, api.Invalid("RESUME_INBOX_CHANGED")
			}
			if err != nil {
				return nil, err
			}
			child := decision.Children[j]
			item, ok := byID[answerID]
			if !ok || child.Status != "succeeded" || child.Text != answerText || child.RunID != fromRun || item.Message.Text != answerText || item.Message.WorkThreadID != thread || item.Message.Kind != "reply" || item.Message.Status != "answered" || item.Message.QuestionID != questionID {
				return nil, api.Invalid("RESUME_INBOX_INVALID")
			}
			metadataRef := item.Ref
			metadataRef.Revision = metadataRevision
			matches := 0
			for _, ref := range child.Derived {
				if ref.Kind == "message" && ref.ID == answerID {
					if ref != metadataRef {
						return nil, api.Invalid("RESUME_INBOX_INVALID")
					}
					matches++
				}
			}
			if matches != 1 || answered[answerID] {
				return nil, api.Invalid("RESUME_INBOX_INVALID")
			}
			answered[answerID] = true
			packet.AnswerReceipts = append(packet.AnswerReceipts, api.AnswerReceipt{QuestionID: questionID, Ref: item.Ref})
		}
	}
	if w.Input.ShortTerm != nil {
		for _, entry := range w.Input.ShortTerm.Entries {
			if entry.Use != "inbox" {
				continue
			}
			if item, ok := byID[entry.Ref.ID]; ok {
				if item.Ref != entry.Ref {
					return nil, api.Invalid("RESUME_INBOX_CHANGED")
				}
				answered[item.Ref.ID] = true
			}
		}
	}
	for _, item := range current {
		if !answered[item.Ref.ID] {
			packet.Messages = append(packet.Messages, item)
		}
	}
	if len(packet.Messages)+len(packet.AnswerReceipts) == 0 {
		return nil, nil
	}
	if err := api.ValidateResumeInbox(packet); err != nil {
		return nil, err
	}
	return packet, nil
}

func sameClaimedMessageBody(a, b api.AgentMessage) bool {
	return a.ID == b.ID && a.FromAgentID == b.FromAgentID && a.ToAgentID == b.ToAgentID && a.Text == b.Text && a.CreatedAt == b.CreatedAt && a.Kind == b.Kind && a.DelegationID == b.DelegationID && a.QuestionID == b.QuestionID && a.WorkThreadID == b.WorkThreadID
}
func recoveryRefusal(e error) bool {
	var f *api.Fault
	return errors.As(e, &f) && f.Kind == "CAPABILITY_DENIED" && (f.Reason == "RECOVERY_REQUIRED" || f.Reason == "SERVICE_STOPPING")
}
