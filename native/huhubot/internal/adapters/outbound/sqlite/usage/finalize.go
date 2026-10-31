package usage

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"reflect"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func (s *Store) FinalizeInTx(ctx context.Context, tx *sql.Tx, runID string, result *api.EngineResult) error {
	// Engine.Run/Resume has actually returned before this hook. Publish its
	// stopped child slot atomically with the terminal outcome, so a completed
	// parent cannot become visible before its stopped children are accounted for.
	// Dispatched HTTP producers retain their slot until their own settlement.
	if e := s.ProducerEndedInTx(ctx, tx, runID); e != nil {
		return e
	}
	var producers int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM model_attempts WHERE run_id=? AND state='dispatched' AND producer_ended=0", runID).Scan(&producers); e != nil {
		return e
	}
	if producers > 0 {
		result.Status = "failed"
		result.Reason = "MODEL_PRODUCER_UNSETTLED"
		result.Usage = api.RunUsage{Knowledge: "unknown", Estimated: true}
		result.Text = ""
		result.Partial = false
	}
	var root, parent, principal, profile, thread, derived, sources, scopes, grantIDs string
	if e := tx.QueryRowContext(ctx, "SELECT r.root_run_id,r.parent_run_id,r.principal_id,s.profile_id,r.work_thread_id,r.derived_json,r.effective_source_json,r.effective_scope_json,r.effective_grants_json FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", runID).Scan(&root, &parent, &principal, &profile, &thread, &derived, &sources, &scopes, &grantIDs); e != nil {
		return e
	}
	// Parent completeness is an application fact. A resumed model's plain
	// 'finished' result cannot erase a canceled/partial descendant's outcome.
	var incomplete int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs c LEFT JOIN collaboration_result_deliveries d ON d.child_run_id=c.run_id WHERE c.parent_run_id=? AND (c.status IN('failed','canceled') OR COALESCE(d.partial,0)=1 OR c.effects_unresolved=1)", runID).Scan(&incomplete); e != nil {
		return e
	}
	if result.Status == "finished" && incomplete > 0 {
		result.Partial = true
		result.Reason = "CHILD_PARTIAL_FAILURE"
	}
	var active, unresolved int
	if e := tx.QueryRowContext(ctx, "WITH RECURSIVE children(run_id) AS (SELECT run_id FROM execution_runs WHERE parent_run_id=? UNION ALL SELECT r.run_id FROM execution_runs r JOIN children c ON r.parent_run_id=c.run_id) SELECT count(*) FROM children c JOIN execution_runs r ON r.run_id=c.run_id WHERE r.status NOT IN('succeeded','failed','canceled')", runID).Scan(&active); e != nil {
		return e
	}
	if result.Status == "finished" && active > 0 {
		if _, e := tx.ExecContext(ctx, "INSERT INTO collaboration_parent_results(run_id,result_json,state) VALUES(?,?,'waiting') ON CONFLICT(run_id) DO UPDATE SET result_json=excluded.result_json,checkpoint_json='',state='waiting',generation=generation+1", runID, encode(result)); e != nil {
			return e
		}
		result.Status = "waiting_children"
		result.Reason = "CHILDREN_ACTIVE"
		return nil
	}
	if e := tx.QueryRowContext(ctx, "WITH RECURSIVE tree(run_id) AS (SELECT run_id FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id FROM execution_runs r JOIN tree t ON r.parent_run_id=t.run_id) SELECT count(*) FROM execution_effects e JOIN tree t ON t.run_id=e.run_id WHERE e.state IN('dispatching','unknown_outcome')", runID).Scan(&unresolved); e != nil {
		return e
	}
	var descendantProducers int
	if e := tx.QueryRowContext(ctx, "WITH RECURSIVE tree(run_id) AS (SELECT run_id FROM execution_runs WHERE run_id=? UNION ALL SELECT r.run_id FROM execution_runs r JOIN tree t ON r.parent_run_id=t.run_id) SELECT count(*) FROM model_attempts a JOIN tree t ON t.run_id=a.run_id WHERE a.state='dispatched' AND a.producer_ended=0", runID).Scan(&descendantProducers); e != nil {
		return e
	}
	if descendantProducers > 0 && result.Status == "finished" {
		result.Status = "failed"
		result.Reason = "DESCENDANT_MODEL_PRODUCER_UNSETTLED"
		result.Partial = result.Text != ""
	}
	if unresolved > 0 && result.Status == "finished" {
		result.Status = "failed"
		result.Reason = "DESCENDANT_EFFECTS_UNRESOLVED"
		result.Partial = result.Text != ""
		if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET effects_unresolved=1 WHERE run_id=?", runID); e != nil {
			return e
		}
	}
	if u, e := s.UsageInTx(ctx, tx, runID); e != nil {
		return e
	} else if u != nil {
		result.Usage = *u
	}
	if parent == "" {
		e := tx.QueryRowContext(ctx, "SELECT parent_run_id FROM collaboration_delegations WHERE child_run_id=?", runID).Scan(&parent)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			return e
		}
	}
	if parent != "" && result.Status != "waiting_children" {
		status := result.Status
		if status == "finished" {
			status = "succeeded"
		}
		if _, e := tx.ExecContext(ctx, "INSERT INTO collaboration_result_deliveries(child_run_id,parent_run_id,status,partial,reason,text,source_json,scope_json,grants_json,derived_json) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(child_run_id) DO NOTHING", runID, parent, status, result.Partial, result.Reason, result.Text, sources, scopes, grantIDs, derived); e != nil {
			return e
		}
		if e := execution.AddEventInTx(ctx, tx, parent, "delegation.completed", map[string]string{"childRunId": runID, "status": status, "reason": result.Reason}); e != nil {
			return e
		}
	}
	return nil
}

func (s *Store) ReadyParentInTx(ctx context.Context, tx *sql.Tx, after execution.ParentCursor) (execution.ParentReady, error) {
	wait, next, e := s.nextReadyParentInTx(ctx, tx, after)
	out := execution.ParentReady{Next: next}
	if e != nil || wait == nil {
		return out, e
	}
	out.RunID, out.Result, e = s.consumeReadyParentInTx(ctx, tx, wait)
	return out, e
}

func (s *Store) consumeReadyParentInTx(ctx context.Context, tx *sql.Tx, wait *parentWait) (string, *api.EngineResult, error) {
	runID, raw, principal, profile := wait.run, wait.raw, wait.principal, wait.profile
	var result api.EngineResult
	if json.Unmarshal([]byte(raw), &result) != nil {
		return "", nil, fail("CONFLICT", "PARENT_RESULT_INVALID")
	}
	id := api.NewConnectionIdentity("executor:"+runID, principal, false)
	parentRun, input, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
	if e != nil {
		return "", nil, e
	}
	if parentRun.Role == "orchestration" {
		if wait.p != nil {
			return "", nil, fail("CONFLICT", "GROUP_ROOT_CHECKPOINT_INVALID")
		}
		return s.readyGroupInTx(ctx, tx, runID)
	}
	rows, e := tx.QueryContext(ctx, "SELECT d.child_run_id,d.status,d.reason,d.text,d.source_json,d.scope_json,d.derived_json,CAST(r.revision AS TEXT),r.work_thread_id,r.effects_unresolved,d.partial,r.usage_json FROM collaboration_result_deliveries d JOIN execution_runs r ON r.run_id=d.child_run_id WHERE d.parent_run_id=? ORDER BY d.child_run_id", runID)
	if e != nil {
		return "", nil, e
	}
	type delivery struct {
		outcome          api.TaskOutcome
		sources          []api.SourceSnapshot
		scopes           []api.SourceScope
		thread, revision string
		origin           *api.RunAccessInput
		memorySubject    grantsstore.MemorySubject
	}
	deliveries := []delivery{}
	for rows.Next() {
		var d delivery
		var sourceRaw, scopeRaw, derived, usage string
		if e = rows.Scan(&d.outcome.RunID, &d.outcome.Status, &d.outcome.Reason, &d.outcome.Text, &sourceRaw, &scopeRaw, &derived, &d.revision, &d.thread, &d.outcome.EffectsUnresolved, &d.outcome.Partial, &usage); e != nil {
			rows.Close()
			return "", nil, e
		}
		if json.Unmarshal([]byte(sourceRaw), &d.sources) != nil || json.Unmarshal([]byte(scopeRaw), &d.scopes) != nil || json.Unmarshal([]byte(derived), &d.outcome.Derived) != nil {
			rows.Close()
			return "", nil, fail("CONFLICT", "CHILD_RESULT_INVALID")
		}
		d.memorySubject = grantsstore.MemorySubject{Kind: "run", ID: d.outcome.RunID}
		if usage != "" {
			d.outcome.Usage = &api.RunUsage{}
			if json.Unmarshal([]byte(usage), d.outcome.Usage) != nil {
				rows.Close()
				return "", nil, fail("CONFLICT", "RUN_USAGE_INVALID")
			}
		}
		deliveries = append(deliveries, d)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return "", nil, e
	}
	var deliveryAccessErr error
	if wait.p != nil {
		result.Status = "resume_children"
		result.Suspension = wait.p
		selected := map[string]bool{}
		for _, key := range wait.p.WaitForIDs {
			selected[key] = true
		}
		filtered := deliveries[:0]
		if wait.p.Kind == "children" {
			for _, d := range deliveries {
				if selected[d.outcome.RunID] {
					filtered = append(filtered, d)
				}
			}
		} else {
			for _, key := range wait.p.WaitForIDs {
				var d delivery
				var rawSources, rawDerived, answerID string
				err := tx.QueryRowContext(ctx, "SELECT a.message_id,a.text,a.source_json,a.derived_json,a.work_thread_id,CAST(a.revision AS TEXT),a.from_run_id FROM collaboration_messages q JOIN collaboration_messages a ON a.question_id=q.message_id AND a.kind='reply' AND a.status='answered' WHERE q.message_id=? AND q.from_run_id=? ORDER BY a.created_at,a.message_id LIMIT 1", key, runID).Scan(&answerID, &d.outcome.Text, &rawSources, &rawDerived, &d.thread, &d.revision, &d.outcome.RunID)
				if errors.Is(err, sql.ErrNoRows) {
					d.outcome = api.TaskOutcome{RunID: key, Status: "failed", Reason: "QUESTION_UNANSWERED"}
				} else if err != nil {
					return "", nil, err
				} else {
					if json.Unmarshal([]byte(rawSources), &d.sources) != nil || json.Unmarshal([]byte(rawDerived), &d.outcome.Derived) != nil {
						return "", nil, fail("CONFLICT", "CHILD_RESULT_INVALID")
					}
					d.outcome.Status = "succeeded"
					d.memorySubject = grantsstore.MemorySubject{Kind: "message", ID: answerID}
					// A reply is a new durable input, not the target's task completion.
					d.outcome.Derived = append(d.outcome.Derived, api.DerivedInput{Kind: "message", ID: answerID, Revision: d.revision, Hash: hashBody(d.outcome.Text), Namespace: d.thread, WorkThreadID: d.thread})
					fromInput, privateDerived, x := s.access.PrivateMessageInTx(ctx, tx, id, profile, answerID)
					if x != nil {
						var f *api.Fault
						if !errors.As(x, &f) || f.Kind != "CAPABILITY_DENIED" && !(f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
							return "", nil, x
						}
						// An answered question is still private input. Losing its
						// current qualification must terminalize the waiter through
						// the existing body-free path, not poison the claim queue.
						deliveryAccessErr = x
						d.outcome.Text = ""
					}
					d.origin = &fromInput
					d.scopes = fromInput.Scopes
					d.outcome.Derived = uniqueDerived(append(d.outcome.Derived, privateDerived...))
				}
				filtered = append(filtered, d)
			}
		}
		deliveries = filtered
	}
	// A body-free outcome contributes status only. Its failed input scope is
	// not a new body to send and cannot suppress the parent's independent result.
	for i := range deliveries {
		if deliveries[i].outcome.Text == "" {
			deliveries[i].sources = nil
			deliveries[i].scopes = nil
			deliveries[i].outcome.Derived = []api.DerivedInput{}
		}
	}
	for i := range deliveries {
		d := &deliveries[i]
		if d.outcome.Text == "" {
			continue
		}
		var origin api.RunAccessInput
		var x error
		if d.origin != nil {
			origin = *d.origin
		} else {
			_, origin, x = execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: d.outcome.RunID})
			if x != nil {
				return "", nil, x
			}
			origin = access.HistoryReadInput(origin, d.sources)
			if x = s.access.CheckInTx(ctx, tx, id, origin, []string{"read"}); x != nil {
				deliveryAccessErr = x
				break
			}
		}
		if origin.Group != nil {
			input.Group, x = groupaccess.UnionBinding(input.Group, origin.Group)
			if x != nil {
				deliveryAccessErr = x
				break
			}
		}
		closure, _, x := s.access.ReadConsumedMemoryInTx(ctx, tx, id, profile, runID, d.memorySubject, []string{"read", "send", "deliver"})
		if x != nil {
			deliveryAccessErr = x
			break
		}
		d.outcome.Derived = uniqueDerived(append(d.outcome.Derived, closure...))
	}
	for _, d := range deliveries {
		for _, source := range d.sources {
			found := false
			for _, old := range input.Sources {
				if reflect.DeepEqual(old, source) {
					found = true
				}
			}
			if !found {
				input.Sources = append(input.Sources, source)
			}
		}
		for _, scope := range d.scopes {
			found := false
			for _, old := range input.Scopes {
				if reflect.DeepEqual(old, scope) {
					found = true
				}
			}
			if !found {
				input.Scopes = append(input.Scopes, scope)
			}
		}
		if len(input.Sources)+len(input.Scopes) > 32 {
			return failedParentInTx(ctx, tx, runID, "RESULT_PROVENANCE_LIMIT")
		}
	}
	if deliveryAccessErr == nil && input.Group != nil {
		if e = groupaccess.PersistBindingInTx(ctx, tx, runID, input.Group); e != nil {
			return "", nil, e
		}
	}
	if deliveryAccessErr != nil {
		e = deliveryAccessErr
	} else {
		input.GrantIDs, e = s.access.SelectInTx(ctx, tx, id, input, "", []string{"read", "send", "deliver"})
	}
	if e == nil {
		e = s.access.CheckInTx(ctx, tx, id, input, []string{"read", "send", "deliver"})
	}
	if e != nil {
		var f *api.Fault
		if !errors.As(e, &f) || f.Kind != "CAPABILITY_DENIED" && !(f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
			return "", nil, e
		}
		result.Status = "failed"
		result.Text = ""
		result.Partial = false
		result.Reason = "CHILD_RESULT_ACCESS_REVOKED"
		result.Children = nil
	} else {
		var derivedJSON, thread string
		if e = tx.QueryRowContext(ctx, "SELECT derived_json,work_thread_id FROM execution_runs WHERE run_id=?", runID).Scan(&derivedJSON, &thread); e != nil {
			return "", nil, e
		}
		var lineage []api.DerivedInput
		if json.Unmarshal([]byte(derivedJSON), &lineage) != nil {
			return "", nil, fail("CONFLICT", "LINEAGE_STATE_INVALID")
		}
		for _, d := range deliveries {
			o := d.outcome
			result.Children = append(result.Children, o)
			if o.Partial || o.Status != "succeeded" || o.EffectsUnresolved {
				result.Partial = true
				result.Reason = "CHILD_PARTIAL_FAILURE"
			}
			if o.Text != "" {
				if wait.p == nil {
					result.Text += "\n\n" + o.Text
				}
				h := sha256.Sum256([]byte(o.Text))
				ref := api.DerivedInput{Kind: "task_result", ID: o.RunID, Revision: d.revision, Hash: "sha256:" + hex.EncodeToString(h[:]), Namespace: d.thread, WorkThreadID: d.thread}
				lineage = uniqueDerived(append(lineage, o.Derived...))
				// Question replies already carry the real answer message ref. An
				// answer from a still-running sender is not its task completion.
				if d.memorySubject.Kind == "run" {
					lineage = uniqueDerived(append(lineage, ref))
				}
			}
		}
		if len(lineage) > 128 {
			return failedParentInTx(ctx, tx, runID, "RESULT_LINEAGE_LIMIT")
		}
		byID := map[string]api.DerivedInput{}
		for _, ref := range lineage {
			key := ref.Kind + "\x00" + ref.ID
			if previous, ok := byID[key]; ok && previous != ref {
				return "", nil, fail("CONFLICT", "LINEAGE_STATE_INVALID")
			}
			byID[key] = ref
		}
		if len(result.Text) > 131072 {
			return failedParentInTx(ctx, tx, runID, "RESULT_CONTEXT_LIMIT")
		}
		changed, x := tx.ExecContext(ctx, "UPDATE execution_runs SET effective_source_json=?,effective_scope_json=?,effective_grants_json=?,derived_json=?,revision=revision+1 WHERE run_id=? AND revision<9223372036854775807", encode(input.Sources), encode(input.Scopes), encode(input.GrantIDs), encode(lineage), runID)
		if x != nil {
			return "", nil, x
		}
		n, x := changed.RowsAffected()
		if x != nil {
			return "", nil, x
		}
		if n != 1 {
			return "", nil, fail("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
		}
		for _, ref := range lineage {
			if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_lineage VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING", runID, ref.Kind, ref.ID, ref.Revision, ref.Hash, ref.Namespace, ref.WorkThreadID); e != nil {
				return "", nil, e
			}
		}
	}
	if _, e = tx.ExecContext(ctx, "DELETE FROM collaboration_wait_edges WHERE from_run_id=?", runID); e != nil {
		return "", nil, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE collaboration_parent_results SET state='claimed' WHERE run_id=? AND state='waiting'", runID); e != nil {
		return "", nil, e
	}
	return runID, &result, nil
}

func hashBody(body string) string {
	h := sha256.Sum256([]byte(body))
	return "sha256:" + hex.EncodeToString(h[:])
}

func uniqueDerived(in []api.DerivedInput) []api.DerivedInput {
	out := make([]api.DerivedInput, 0, len(in))
	seen := map[api.DerivedInput]bool{}
	for _, v := range in {
		if !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

// A background completion cannot leave a waiting parent polling the same
// oversized result forever. Keep each child fact and fail the parent safely.
func failedParentInTx(ctx context.Context, tx *sql.Tx, run, reason string) (string, *api.EngineResult, error) {
	if _, e := tx.ExecContext(ctx, "DELETE FROM collaboration_wait_edges WHERE from_run_id=?", run); e != nil {
		return "", nil, e
	}
	if _, e := tx.ExecContext(ctx, "UPDATE collaboration_parent_results SET state='claimed' WHERE run_id=? AND state='waiting'", run); e != nil {
		return "", nil, e
	}
	return run, &api.EngineResult{Status: "failed", Reason: reason}, nil
}
