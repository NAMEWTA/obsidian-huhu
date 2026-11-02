package usage

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/policy"
)

// AddWaitInTx uses actual Run identities, including independent threads of the
// same Agent. Edges are transactional facts, not model-authored promises.
func AddWaitInTx(ctx context.Context, tx *sql.Tx, from, to, reason string) error {
	rows, e := tx.QueryContext(ctx, "SELECT from_run_id,to_run_id FROM collaboration_wait_edges")
	if e != nil {
		return e
	}
	graph := map[string][]string{}
	for rows.Next() {
		var a, b string
		if e = rows.Scan(&a, &b); e != nil {
			rows.Close()
			return e
		}
		graph[a] = append(graph[a], b)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return e
	}
	if policy.WouldCycle(graph, from, to) {
		return fail("RESOURCE_LIMIT", "COLLABORATION_WAIT_CYCLE")
	}
	_, e = tx.ExecContext(ctx, "INSERT INTO collaboration_wait_edges VALUES(?,?,?) ON CONFLICT DO NOTHING", from, to, reason)
	return e
}

func (s *Store) PublishWaitInTx(ctx context.Context, tx *sql.Tx, x api.ToolExecution, p api.EngineSuspension) error {
	r, _, e := s.current(ctx, tx, x, false)
	if e != nil {
		return e
	}
	if (p.Kind != "children" && p.Kind != "question") || len(p.WaitForIDs) == 0 || len(p.WaitForIDs) > 32 {
		return api.Invalid("INVALID_EXECUTION_WAIT")
	}
	seen := map[string]bool{}
	for _, key := range p.WaitForIDs {
		if key == "" || seen[key] {
			return api.Invalid("INVALID_EXECUTION_WAIT")
		}
		seen[key] = true
		var target, status string
		if p.Kind == "children" {
			e = tx.QueryRowContext(ctx, "SELECT run_id,status FROM execution_runs WHERE run_id=? AND parent_run_id=? AND principal_id=?", key, r.ID, x.Identity.PrincipalID()).Scan(&target, &status)
		} else {
			e = tx.QueryRowContext(ctx, "SELECT m.to_run_id,CASE WHEN m.status='answered' THEN 'succeeded' ELSE t.status END FROM collaboration_messages m JOIN execution_runs t ON t.run_id=m.to_run_id WHERE m.message_id=? AND m.kind='question' AND m.from_run_id=? AND m.principal_id=? AND m.root_run_id=?", key, r.ID, x.Identity.PrincipalID(), r.RootRunID).Scan(&target, &status)
		}
		if e == sql.ErrNoRows {
			return api.Denied("WAIT_RELATION_MISMATCH")
		}
		if e != nil {
			return e
		}
		// Completion can race checkpoint publication. A completed relationship is
		// already ready; no edge is necessary and its durable result is still read.
		if !terminal(status) {
			if e = AddWaitInTx(ctx, tx, r.ID, target, key); e != nil {
				return e
			}
		}
	}
	if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_parent_results(run_id,result_json,checkpoint_json,state) VALUES(?,?,?,'waiting') ON CONFLICT(run_id) DO UPDATE SET result_json=excluded.result_json,checkpoint_json=excluded.checkpoint_json,state='waiting',generation=generation+1", r.ID, encode(api.EngineResult{Status: "finished"}), encode(p)); e != nil {
		return e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE execution_runs SET status='waiting_children',revision=revision+1,claim_token='',reason=? WHERE run_id=?", "WAITING_"+p.Kind, r.ID); e != nil {
		return e
	}
	// Publication is called only after Engine.Run/Resume has returned. Any
	// separately dispatched HTTP producer still keeps its slot until settlement.
	if e = s.ProducerEndedInTx(ctx, tx, r.ID); e != nil {
		return e
	}
	return execution.AddEventInTx(ctx, tx, r.ID, "waiting_children", map[string]string{"status": "waiting_children", "reason": "WAITING_" + p.Kind})
}

// waitReadyInTx only reads relationships validated at publication, and checks
// them again after restart. SQL rows are closed before any nested authorization.
func waitReadyInTx(ctx context.Context, tx *sql.Tx, run string, p *api.EngineSuspension) (bool, error) {
	if p == nil {
		var n int
		e := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status NOT IN('succeeded','failed','canceled')", run).Scan(&n)
		return n == 0, e
	}
	if len(p.WaitForIDs) == 0 || len(p.WaitForIDs) > 32 || (p.Kind != "children" && p.Kind != "question") {
		return false, fail("CONFLICT", "PARENT_WAIT_INVALID")
	}
	for _, key := range p.WaitForIDs {
		var status string
		var e error
		if p.Kind == "children" {
			e = tx.QueryRowContext(ctx, "SELECT status FROM execution_runs WHERE run_id=? AND parent_run_id=?", key, run).Scan(&status)
		} else {
			e = tx.QueryRowContext(ctx, "SELECT CASE WHEN m.status='answered' THEN 'succeeded' ELSE r.status END FROM collaboration_messages m JOIN execution_runs r ON r.run_id=m.to_run_id WHERE m.message_id=? AND m.from_run_id=? AND m.kind='question'", key, run).Scan(&status)
		}
		if e != nil {
			return false, e
		}
		if !terminal(status) {
			return false, nil
		}
	}
	return true, nil
}

type parentWait struct {
	run, raw, principal, profile string
	p                            *api.EngineSuspension
	cursor                       execution.ParentCursor
}

func (s *Store) nextReadyParentInTx(ctx context.Context, tx *sql.Tx, after execution.ParentCursor) (*parentWait, execution.ParentCursor, error) {
	rows, e := tx.QueryContext(ctx, "SELECT p.run_id,p.result_json,r.principal_id,s.profile_id,p.checkpoint_json,r.created_at FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id JOIN conversation_sessions s ON s.session_id=r.session_id WHERE p.state='waiting' AND r.status='waiting_children' AND r.task_admission_closed=0 AND NOT EXISTS(SELECT 1 FROM model_attempts a WHERE a.run_id=r.run_id AND a.state='dispatched' AND a.producer_ended=0) AND (r.created_at>? OR (r.created_at=? AND r.run_id>?)) ORDER BY r.created_at,r.run_id LIMIT 128", after.CreatedAt, after.CreatedAt, after.RunID)
	if e != nil {
		return nil, execution.ParentCursor{}, e
	}
	all := []parentWait{}
	for rows.Next() {
		var v parentWait
		var cp string
		if e = rows.Scan(&v.run, &v.raw, &v.principal, &v.profile, &cp, &v.cursor.CreatedAt); e != nil {
			rows.Close()
			return nil, execution.ParentCursor{}, e
		}
		v.cursor.RunID = v.run
		if cp != "" {
			v.p = &api.EngineSuspension{}
			if json.Unmarshal([]byte(cp), v.p) != nil {
				rows.Close()
				return nil, execution.ParentCursor{}, fail("CONFLICT", "PARENT_WAIT_INVALID")
			}
		}
		all = append(all, v)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, execution.ParentCursor{}, e
	}
	var next execution.ParentCursor
	for i := range all {
		next = all[i].cursor
		ready, e := waitReadyInTx(ctx, tx, all[i].run, all[i].p)
		if e != nil {
			return nil, execution.ParentCursor{}, e
		}
		if ready {
			allowed, e := s.ClaimInTx(ctx, tx, all[i].run)
			if e != nil {
				return nil, execution.ParentCursor{}, e
			}
			if allowed {
				return &all[i], next, nil
			}
		}
	}
	// Only the enclosing Claim commit publishes this progress. Exhausting a
	// short page rewinds the next scan so earlier waiters can become eligible.
	if len(all) < 128 {
		next = execution.ParentCursor{}
	}
	return nil, next, nil
}
