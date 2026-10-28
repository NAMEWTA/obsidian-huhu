package memory

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func (s *Store) readCandidate(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, n namespace, candidateID string) (api.MemoryCandidate, error) {
	out := api.MemoryCandidate{Namespace: n.Public}
	var actual string
	err := tx.QueryRowContext(ctx, "SELECT candidate_id,namespace_id,CAST(revision AS TEXT),scope_kind,scope_id,job_id,state,operation,target_item_id,CASE WHEN target_revision=0 THEN '' ELSE CAST(target_revision AS TEXT) END,reason FROM memory_candidates WHERE candidate_id=?", candidateID).Scan(&out.ID, &actual, &out.Revision, &out.Scope.Kind, &out.Scope.ID, &out.JobID, &out.State, &out.Operation, &out.TargetItemID, &out.TargetRevision, &out.Reason)
	if err != nil {
		return out, missing(err, "MEMORY_CANDIDATE_NOT_FOUND")
	}
	if actual != n.ID {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if out.State == "blocked" || out.State == "superseded" {
		return out, nil
	}
	if err = s.qualify(ctx, tx, id, n.Profile, "", grants.MemorySubject{Kind: "memory_candidate", ID: out.ID}, []string{"read"}); err != nil {
		if !safeUnavailable(err) {
			return out, err
		}
		out.State = "blocked"
		if f, ok := err.(*api.Fault); ok {
			out.Reason = f.Reason
		}
		return out, nil
	}
	var body api.MemoryBody
	var sources, scopes, derived string
	err = tx.QueryRowContext(ctx, "SELECT b.text,c.content_hash,c.provenance,c.creator_kind,c.creator_agent_id,c.source_json,c.scope_json,c.derived_json FROM memory_candidates c JOIN memory_candidate_bodies b ON b.candidate_id=c.candidate_id WHERE c.candidate_id=?", out.ID).Scan(&body.Text, &body.Hash, &body.Provenance, &body.CreatorKind, &body.CreatorAgentID, &sources, &scopes, &derived)
	if err != nil {
		return out, err
	}
	body.JobID = out.JobID
	if json.Unmarshal([]byte(sources), &body.SourceRefs) != nil || body.SourceRefs == nil || json.Unmarshal([]byte(scopes), &body.SourceScopes) != nil || body.SourceScopes == nil || json.Unmarshal([]byte(derived), &body.Derived) != nil || body.Derived == nil || body.Hash != digest(body.Text) {
		return out, invalidState()
	}
	out.Body = &body
	if api.ValidateMemoryResult("memory.get", api.MemoryObject{Kind: "candidate", Candidate: &out}) != nil {
		return out, invalidState()
	}
	return out, nil
}

func readJob(ctx context.Context, tx *sql.Tx, n namespace, jobID string) (api.MemoryJob, error) {
	out := api.MemoryJob{Namespace: n.Public}
	var actual string
	var run sql.NullString
	err := tx.QueryRowContext(ctx, "SELECT job_id,namespace_id,CAST(revision AS TEXT),source_run_id,admission,commit_state,reason,run_id FROM memory_jobs WHERE job_id=?", jobID).Scan(&out.ID, &actual, &out.Revision, &out.SourceRunID, &out.Admission, &out.Commit, &out.Reason, &run)
	if err != nil {
		return out, missing(err, "MEMORY_JOB_NOT_FOUND")
	}
	if actual != n.ID {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if run.Valid {
		out.Run = &api.MemoryJobRun{ID: run.String}
		var raw, profile, principal string
		err = tx.QueryRowContext(ctx, "SELECT r.status,r.reason,r.usage_json,s.profile_id,r.principal_id FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", run.String).Scan(&out.Run.Status, &out.Run.Reason, &raw, &profile, &principal)
		if err != nil {
			return out, err
		}
		if profile != n.Profile || principal != n.Principal {
			return out, invalidState()
		}
		if raw != "" {
			out.Run.Usage = &api.RunUsage{}
			if json.Unmarshal([]byte(raw), out.Run.Usage) != nil {
				return out, invalidState()
			}
		}
	}
	return out, nil
}
