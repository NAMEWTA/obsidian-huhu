package usage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// LegacyPositionInTx only reconstructs a v8 position which already consumed its
// parent-result row. It never changes waiting/claimed state, re-delivers child
// outcomes, grants a claim or performs a model/Host request. Future executions
// persist the exact decision before Resume instead of needing reconstruction.
func (s *Store) LegacyPositionInTx(ctx context.Context, tx *sql.Tx, runID string) (api.ExecutionPosition, error) {
	position := api.ExecutionPosition{Phase: "run"}
	var raw, checkpoint, parentState, role string
	e := tx.QueryRowContext(ctx, "SELECT p.result_json,p.checkpoint_json,p.state,r.execution_role FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.run_id=?", runID).Scan(&raw, &checkpoint, &parentState, &role)
	if errors.Is(e, sql.ErrNoRows) {
		return position, nil
	}
	if e != nil {
		return position, e
	}
	if parentState != "claimed" {
		return position, nil
	}
	var result api.EngineResult
	if json.Unmarshal([]byte(raw), &result) != nil {
		return position, fail("CONFLICT", "PARENT_RESULT_INVALID")
	}
	if role == "orchestration" {
		if checkpoint != "" {
			return position, fail("CONFLICT", "GROUP_ROOT_CHECKPOINT_INVALID")
		}
		result, e = s.groupResultInTx(ctx, tx, runID)
		if e != nil {
			return position, e
		}
		return api.ExecutionPosition{Phase: "application", CompletedResult: &result}, nil
	}
	var suspension *api.EngineSuspension
	if checkpoint != "" {
		suspension = &api.EngineSuspension{}
		if json.Unmarshal([]byte(checkpoint), suspension) != nil || (suspension.Kind != "children" && suspension.Kind != "question") || len(suspension.WaitForIDs) == 0 || len(suspension.WaitForIDs) > 32 || suspension.Checkpoint.RunID != runID {
			return position, fail("CONFLICT", "PARENT_WAIT_INVALID")
		}
	}
	children, e := s.legacyOutcomesInTx(ctx, tx, runID, suspension)
	if e != nil {
		return position, e
	}
	if suspension != nil {
		continuation := &api.RunContinuation{Kind: suspension.Kind, Checkpoint: suspension.Checkpoint, Children: children}
		decision := &api.ToolResult{Status: "completed", Children: children}
		return api.ExecutionPosition{Phase: "resume", Continuation: continuation, Decision: decision}, nil
	}
	result.Children = children
	for _, child := range children {
		if child.Text != "" {
			result.Text += "\n\n" + child.Text
		}
		if child.Partial || child.Status != "succeeded" || child.EffectsUnresolved {
			result.Partial = true
			result.Reason = "CHILD_PARTIAL_FAILURE"
		}
	}
	if len(result.Text) > 131072 {
		return position, fail("CONFLICT", "PARENT_RESULT_INVALID")
	}
	return api.ExecutionPosition{Phase: "application", CompletedResult: &result}, nil
}

func (s *Store) legacyOutcomesInTx(ctx context.Context, tx *sql.Tx, runID string, p *api.EngineSuspension) ([]api.TaskOutcome, error) {
	out := []api.TaskOutcome{}
	if p != nil && p.Kind == "question" {
		for _, question := range p.WaitForIDs {
			var child api.TaskOutcome
			var message, derived, thread, revision string
			e := tx.QueryRowContext(ctx, "SELECT a.message_id,a.text,a.derived_json,a.work_thread_id,CAST(a.revision AS TEXT),a.from_run_id FROM collaboration_messages q JOIN collaboration_messages a ON a.question_id=q.message_id AND a.kind='reply' AND a.status='answered' WHERE q.message_id=? AND q.from_run_id=? ORDER BY a.created_at,a.message_id LIMIT 1", question, runID).Scan(&message, &child.Text, &derived, &thread, &revision, &child.RunID)
			if errors.Is(e, sql.ErrNoRows) {
				child = api.TaskOutcome{RunID: question, Status: "failed", Reason: "QUESTION_UNANSWERED"}
			} else if e != nil {
				return nil, e
			} else {
				if json.Unmarshal([]byte(derived), &child.Derived) != nil {
					return nil, fail("CONFLICT", "CHILD_RESULT_INVALID")
				}
				child.Status = "succeeded"
				child.Derived = uniqueDerived(append(child.Derived, api.DerivedInput{Kind: "message", ID: message, Revision: revision, Hash: hashBody(child.Text), Namespace: thread, WorkThreadID: thread}))
			}
			out = append(out, child)
		}
		return out, nil
	}
	rows, e := tx.QueryContext(ctx, "SELECT d.child_run_id,d.status,d.reason,d.text,d.derived_json,r.effects_unresolved,d.partial,r.usage_json FROM collaboration_result_deliveries d JOIN execution_runs r ON r.run_id=d.child_run_id WHERE d.parent_run_id=? ORDER BY d.child_run_id", runID)
	if e != nil {
		return nil, e
	}
	for rows.Next() {
		var child api.TaskOutcome
		var derived, usage string
		if e = rows.Scan(&child.RunID, &child.Status, &child.Reason, &child.Text, &derived, &child.EffectsUnresolved, &child.Partial, &usage); e != nil {
			rows.Close()
			return nil, e
		}
		selected := p == nil
		if p != nil {
			for _, key := range p.WaitForIDs {
				if key == child.RunID {
					selected = true
				}
			}
		}
		if !selected {
			continue
		}
		if json.Unmarshal([]byte(derived), &child.Derived) != nil {
			rows.Close()
			return nil, fail("CONFLICT", "CHILD_RESULT_INVALID")
		}
		if usage != "" {
			child.Usage = &api.RunUsage{}
			if json.Unmarshal([]byte(usage), child.Usage) != nil {
				rows.Close()
				return nil, fail("CONFLICT", "RUN_USAGE_INVALID")
			}
		}
		if child.Text == "" {
			child.Derived = []api.DerivedInput{}
		}
		out = append(out, child)
	}
	e = rows.Err()
	ce := rows.Close()
	if e != nil {
		return nil, e
	}
	if ce != nil {
		return nil, ce
	}
	if p != nil && len(out) != len(p.WaitForIDs) {
		return nil, fail("CONFLICT", "CHILD_RESULT_INVALID")
	}
	return out, nil
}
