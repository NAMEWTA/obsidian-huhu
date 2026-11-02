package memory

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

const maintenanceRule = "private-memory-v1"

func terminal(status string) bool {
	return status == "succeeded" || status == "failed" || status == "canceled"
}

func (s *Store) actualDerived(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string) ([]api.DerivedInput, error) {
	facts, err := s.ReadFactsInTx(ctx, tx, id, profile, []grants.MemorySubject{{Kind: "run", ID: runID}})
	if err != nil {
		return nil, err
	}
	if len(facts.Dependencies) != 1 || facts.Dependencies[0].Subject != (grants.MemorySubject{Kind: "run", ID: runID}) {
		return nil, invalidState()
	}
	return mergeRefs(nil, facts.Dependencies[0].Derived)
}

// RecordOutputInTx runs after the original writers accepted the exact output.
// It adds only dependency facts, including the real public group copy when one
// exists. It cannot create a publication, a message or a Run state transition.
func (s *Store) RecordOutputInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution, outputID string) error {
	r, err := s.runContext(ctx, tx, e.Identity, e.Run.ID)
	if err != nil {
		return err
	}
	if !terminal(r.Run.Status) || r.Claim == "" || r.Claim != e.ClaimToken || r.Run.AgentID != e.Agent.ID || r.Run.Role == "orchestration" {
		return api.Denied("RUN_CLAIM_CHANGED")
	}
	refs, err := s.actualDerived(ctx, tx, e.Identity, r.Namespace.Profile, r.Run.ID)
	if err != nil {
		return err
	}
	outputs := []api.DerivedInput{}
	if outputID == r.Run.ID {
		outputs = append(outputs, api.DerivedInput{Kind: "task_result", ID: outputID})
	} else {
		outputs = append(outputs, api.DerivedInput{Kind: "message", ID: outputID})
	}
	var published string
	err = tx.QueryRowContext(ctx, "SELECT message_id FROM group_publications WHERE child_run_id=?", r.Run.ID).Scan(&published)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if published != "" && published != outputID {
		outputs = append(outputs, api.DerivedInput{Kind: "message", ID: published})
	}
	bodies, err := sourceRecords(ctx, tx, e.Identity, r.Namespace.Profile, outputs)
	if err != nil {
		return err
	}
	for _, output := range outputs {
		source, ok := bodies[refKey(output)]
		if !ok || source.OriginRunID != r.Run.ID || source.Text == "" {
			return invalidState()
		}
		kind := "message"
		if output.Kind == "task_result" {
			kind = "private_result"
		}
		if err = insertDependencies(ctx, tx, kind, output.ID, "effective", refs); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) RecordCompletionInTx(ctx context.Context, tx *sql.Tx, completion execution.MemoryCompletion) error {
	var principal string
	if err := tx.QueryRowContext(ctx, "SELECT principal_id FROM execution_runs WHERE run_id=?", completion.RunID).Scan(&principal); err != nil {
		return err
	}
	id := api.NewConnectionIdentity("memory-completion:"+completion.RunID, principal, false)
	r, err := s.runContext(ctx, tx, id, completion.RunID)
	if err != nil {
		return err
	}
	if !terminal(r.Run.Status) {
		return invalidState()
	}
	if r.Namespace.Public.Kind != "agent" || r.Run.Role == "orchestration" {
		return nil
	}
	var maintenance bool
	if err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM memory_jobs WHERE run_id=?)", r.Run.ID).Scan(&maintenance); err != nil {
		return err
	}
	if maintenance {
		return nil
	}
	ref := api.DerivedInput{Kind: "task_result", ID: r.Run.ID}
	if completion.MessageID != "" {
		ref = api.DerivedInput{Kind: "message", ID: completion.MessageID}
	}
	var published string
	err = tx.QueryRowContext(ctx, "SELECT message_id FROM group_publications WHERE child_run_id=?", r.Run.ID).Scan(&published)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if published != "" {
		ref = api.DerivedInput{Kind: "message", ID: published}
	}
	bodies, err := sourceRecords(ctx, tx, id, r.Namespace.Profile, []api.DerivedInput{ref})
	if err != nil {
		return err
	}
	source, ok := bodies[refKey(ref)]
	if !ok || source.OriginRunID != r.Run.ID {
		return invalidState()
	}
	if source.Text == "" {
		return nil
	}
	consumed, err := s.actualDerived(ctx, tx, id, r.Namespace.Profile, r.Run.ID)
	if err != nil {
		return err
	}
	refs, err := mergeRefs(consumed, []api.DerivedInput{source.Ref})
	admission, commit, refusal := "pending", "pending", ""
	if err != nil {
		var f *api.Fault
		if !errors.As(err, &f) || f.Kind != "RESOURCE_LIMIT" || f.Reason != "MEMORY_PROVENANCE_LIMIT" {
			return err
		}
		// The completed output retains every consumed ancestor. Its own exact
		// identity is kept in the outbox; a 129-reference maintenance input is
		// not admissible and is never sealed, bound or scheduled. Preserve the
		// consumed origin facts on this terminal, body-free refusal as well.
		refs = consumed
		admission, commit, refusal = "blocked", "discarded", f.Reason
	}
	scope, err := completionScope(ctx, tx, r, source, refs)
	if err != nil {
		return err
	}
	if err = materialize(ctx, tx, &r.Namespace); err != nil {
		return err
	}
	var existing string
	err = tx.QueryRowContext(ctx, "SELECT completion_id FROM memory_completion_outbox WHERE namespace_id=? AND source_kind=? AND source_id=? AND rule_version=?", r.Namespace.ID, source.Ref.Kind, source.Ref.ID, maintenanceRule).Scan(&existing)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	now, completionID, jobID := time.Now().UTC().Format(api.TimestampLayout), api.NewID("memory-completion:"), api.NewID("memory-job:")
	if _, err = tx.ExecContext(ctx, "INSERT INTO memory_completion_outbox(completion_id,namespace_id,source_run_id,source_kind,source_id,source_revision,source_hash,source_namespace,source_work_thread_id,scope_kind,scope_id,rule_version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", completionID, r.Namespace.ID, r.Run.ID, source.Ref.Kind, source.Ref.ID, source.Ref.Revision, source.Ref.Hash, source.Ref.Namespace, source.Ref.WorkThreadID, scope.Kind, scope.ID, maintenanceRule, now); err != nil {
		return err
	}
	// Eligibility is only a projection. A closed budget or missing model never
	// rolls back an already accepted conversation and never starts a request.
	settings, err := s.settings(ctx, tx, r.Namespace)
	if err != nil {
		return err
	}
	reason := settings.Reason
	if refusal != "" {
		reason = refusal
	}
	if _, err = tx.ExecContext(ctx, "INSERT INTO memory_jobs(job_id,namespace_id,completion_id,source_run_id,settings_revision,admission,commit_state,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)", jobID, r.Namespace.ID, completionID, r.Run.ID, r.Namespace.Settings, admission, commit, reason, now); err != nil {
		return err
	}
	if err = insertDependencies(ctx, tx, "job", jobID, "origin", refs); err != nil {
		return err
	}
	return bump(ctx, tx, r.Namespace.ID, false)
}

// A scope is derived from persisted source restrictions, never from model
// output. An unsplittable private result remains in its originating thread.
func completionScope(ctx context.Context, tx *sql.Tx, r runContext, source sourceRecord, refs []api.DerivedInput) (api.MemoryScope, error) {
	scope := api.MemoryScope{Kind: "profile"}
	if source.Ref.Kind == "task_result" {
		return api.MemoryScope{Kind: "work_thread", ID: source.Ref.WorkThreadID}, nil
	}
	if source.Published != "" || source.Group != nil {
		scope = api.MemoryScope{Kind: "session", ID: r.Run.SessionID}
	}
	if len(source.Grants) > 0 {
		args := []any{}
		for _, id := range source.Grants {
			args = append(args, id)
		}
		rows, err := tx.QueryContext(ctx, "SELECT task_id,session_id FROM access_grants WHERE grant_id IN("+placeholders(len(args))+")", args...)
		if err != nil {
			return scope, err
		}
		for rows.Next() {
			var task, session string
			if err = rows.Scan(&task, &session); err != nil {
				rows.Close()
				return scope, err
			}
			if task != "" {
				scope = api.MemoryScope{Kind: "work_thread", ID: r.Thread}
			} else if session != "" && scope.Kind == "profile" {
				scope = api.MemoryScope{Kind: "session", ID: r.Run.SessionID}
			}
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return scope, err
		}
	}
	ids := []any{}
	for _, ref := range refs {
		if ref.Kind == "memory_revision" {
			ids = append(ids, ref.ID)
		}
	}
	if len(ids) > 0 {
		rows, err := tx.QueryContext(ctx, "SELECT i.scope_kind,i.scope_id FROM memory_revisions v JOIN memory_items i ON i.item_id=v.item_id WHERE v.revision_id IN("+placeholders(len(ids))+")", ids...)
		if err != nil {
			return scope, err
		}
		for rows.Next() {
			var kind, value string
			if err = rows.Scan(&kind, &value); err != nil {
				rows.Close()
				return scope, err
			}
			if kind == "work_thread" {
				scope = api.MemoryScope{Kind: "work_thread", ID: r.Thread}
			} else if kind == "session" && scope.Kind == "profile" {
				scope = api.MemoryScope{Kind: "session", ID: r.Run.SessionID}
			}
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return scope, err
		}
	}
	return scope, nil
}
