package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	maintenanceapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/maintenance"
)

type originRule struct{ Kind, Item string }

func rulesForOrigins(ctx context.Context, tx *sql.Tx, namespaceID string, refs []api.DerivedInput) ([]originRule, error) {
	out := []originRule{}
	if len(refs) == 0 {
		return out, nil
	}
	predicates, args := []string{}, []any{namespaceID}
	for _, ref := range refs {
		predicates = append(predicates, "(origin_kind=? AND origin_stable_id=?)")
		args = append(args, ref.Kind, ref.ID)
	}
	rows, err := tx.QueryContext(ctx, "SELECT DISTINCT rule_kind,protected_item_id FROM memory_suppressions WHERE namespace_id=? AND ("+joinOr(predicates)+") ORDER BY rule_kind,protected_item_id", args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var rule originRule
		if err = rows.Scan(&rule.Kind, &rule.Item); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, rule)
	}
	err = rows.Err()
	rows.Close()
	return out, err
}
func joinOr(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += " OR "
		}
		out += p
	}
	return out
}

type preparedCandidate struct {
	Draft    api.MemoryCandidateDraft
	Body     api.MemoryBody
	Target   *api.MemoryItem
	Expected api.MemoryTarget
	Reason   string
}

// candidateBody consumes the complete actual closure. The named correction's
// old head is audit, with its full restricted origins retained. A source that
// indirectly points back to that head cannot be laundered into an independent
// correction by deleting the direct reference.
func candidateBody(ctx context.Context, tx *sql.Tx, r runContext, j maintenanceJob, draft api.MemoryCandidateDraft, refs []api.DerivedInput, target *api.MemoryItem) (api.MemoryBody, error) {
	body := api.MemoryBody{Text: draft.Text, Hash: digest(draft.Text), Provenance: draft.Provenance, CreatorKind: "agent", CreatorAgentID: j.Namespace.Public.ID, JobID: j.ID, SourceRefs: append([]api.SourceSnapshot{}, r.Access.Sources...), SourceScopes: append([]api.SourceScope{}, r.Access.Scopes...), Derived: append([]api.DerivedInput{}, refs...)}
	if target != nil {
		key := ownerKey{"memory_revision", target.RevisionID}
		roots := []ownerKey{}
		for _, ref := range refs {
			if refKey(ref) != key {
				roots = append(roots, dependencyOwner(ref))
			}
		}
		if len(roots) > 0 {
			graph, err := loadGraph(ctx, tx, roots)
			if err != nil {
				return body, err
			}
			for _, root := range roots {
				ancestors, err := closure(graph, root)
				if err != nil {
					return body, err
				}
				for _, ancestor := range ancestors {
					if refKey(ancestor) == key {
						return body, invalidState()
					}
				}
			}
		}
		body.Derived = []api.DerivedInput{}
		for _, ref := range refs {
			if refKey(ref) != key {
				body.Derived = append(body.Derived, ref)
			}
		}
		var err error
		body, err = mergeBodies(body, *target.Body)
		if err != nil {
			return body, err
		}
	}
	if len(body.SourceRefs)+len(body.SourceScopes) > 32 {
		return body, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	return body, nil
}

func (s *Store) CommitInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution, set api.MemoryCandidateSet) (execution.MemoryCommit, error) {
	out := execution.MemoryCommit{AppliedRevisionIDs: []string{}, CandidateIDs: []string{}}
	r, err := s.activeContext(ctx, tx, e)
	if err != nil {
		return out, err
	}
	var jobID string
	if err = tx.QueryRowContext(ctx, "SELECT job_id FROM memory_jobs WHERE run_id=?", r.Run.ID).Scan(&jobID); err != nil {
		return out, missing(err, "MEMORY_JOB_NOT_FOUND")
	}
	j, err := s.job(ctx, tx, e.Identity, jobID)
	if err != nil {
		return out, err
	}
	if j.RunID != r.Run.ID || j.Config != r.Config || j.Admission != "bound" || j.Namespace.ID != r.Namespace.ID {
		return out, invalidState()
	}
	if j.Commit != "pending" {
		return out, api.Denied("MEMORY_JOB_CHANGED")
	}
	if !j.Namespace.Enabled {
		return out, api.Denied("MEMORY_AUTO_DISABLED")
	}
	if j.Settings != decimal(j.Namespace.Settings) {
		return out, api.Denied("MEMORY_JOB_CHANGED")
	}
	var persisted api.ExecutionMemoryInput
	if json.Unmarshal([]byte(j.Input), &persisted) != nil || persisted.JobID != j.ID || persisted.JobGeneration != j.Generation || persisted.SettingsRevision != j.Settings {
		return out, inputInvalid()
	}
	if err = maintenanceapp.ValidateCandidates(set, persisted.Targets); err != nil {
		return out, err
	}
	input, err := s.ReadInputInTx(ctx, tx, e.Identity, r.Run.ID)
	if err != nil {
		return out, err
	}
	if input == nil || input.Mode != "maintenance" || input.JobID != j.ID || input.BindingDigest != j.Digest {
		return out, inputInvalid()
	}
	if err = s.access.CheckInTx(ctx, tx, e.Identity, r.Access, []string{"read", "send", "summarize", "memory"}); err != nil {
		return out, err
	}
	refs, err := s.actualDerived(ctx, tx, e.Identity, j.Namespace.Profile, r.Run.ID)
	if err != nil {
		return out, err
	}
	originRefs, err := s.actualDerived(ctx, tx, e.Identity, j.Namespace.Profile, j.SourceRun)
	if err != nil {
		return out, err
	}
	originRefs, err = mergeRefs(originRefs, []api.DerivedInput{j.Source})
	if err != nil {
		return out, err
	}
	rules, err := rulesForOrigins(ctx, tx, j.Namespace.ID, originRefs)
	if err != nil {
		return out, err
	}
	protected := map[string]bool{}
	for _, rule := range rules {
		if rule.Kind == "deny_automatic" {
			return out, api.Denied("MEMORY_FORGOTTEN")
		}
		if rule.Kind == "protect_item" {
			protected[rule.Item] = true
		}
	}
	meta, err := sourceMetadata(ctx, tx, e.Identity, j.Namespace.Profile, []api.DerivedInput{j.Source})
	if err != nil {
		return out, err
	}
	source, ok := meta[refKey(j.Source)]
	if !ok {
		return out, inputInvalid()
	}
	targets := map[string]api.MemoryTarget{}
	for _, target := range input.Targets {
		targets[target.ItemID] = target
	}
	prepared := []preparedCandidate{}
	for _, draft := range set.Items {
		if source.Partial && draft.Provenance == "observation" {
			return out, api.Invalid("MEMORY_CANDIDATE_INVALID")
		}
		action := preparedCandidate{Draft: draft}
		targetID := draft.TargetItemID
		if draft.Operation == "create" && len(protected) > 0 {
			if len(protected) != 1 {
				return out, api.Denied("MEMORY_REVISION_INACTIVE")
			}
			for key := range protected {
				targetID = key
			}
			action.Draft.Operation = "correct"
			action.Draft.TargetItemID = targetID
			action.Reason = "MEMORY_USER_PROTECTED"
		}
		if targetID != "" {
			item, err := s.readItem(ctx, tx, e.Identity, j.Namespace, targetID)
			if err != nil {
				return out, err
			}
			if item.State != "active" || item.Body == nil {
				return out, api.Denied("MEMORY_FORGOTTEN")
			}
			if item.Scope != j.Scope {
				return out, api.Denied("MEMORY_SCOPE_MISMATCH")
			}
			action.Target = &item
			action.Expected = targets[targetID]
			if action.Expected.ItemID == "" {
				action.Expected = api.MemoryTarget{ItemID: item.ID, Revision: item.Revision, RevisionID: item.RevisionID, Pinned: item.Pinned}
			}
			switch {
			case item.Pinned:
				action.Reason = "MEMORY_PINNED_CONFLICT"
			case item.Body.CreatorKind == "user" || item.Body.Provenance == "user" || protected[item.ID]:
				action.Reason = "MEMORY_USER_PROTECTED"
			case item.Revision != action.Expected.Revision || item.RevisionID != action.Expected.RevisionID:
				action.Reason = "MEMORY_TARGET_CHANGED"
			}
		}
		action.Body, err = candidateBody(ctx, tx, r, j, action.Draft, refs, action.Target)
		if err != nil {
			return out, err
		}
		// Check public object bounds before any head changes. A successfully
		// stored object must always have a complete, encodable management view.
		preview := api.MemoryItem{ID: "memory-preview", Revision: "1", RevisionID: "memory-revision-preview", Namespace: j.Namespace.Public, Scope: j.Scope, State: "active", Body: &action.Body}
		if api.ValidateMemoryResult("memory.correct", preview) != nil {
			return out, api.Invalid("MEMORY_CANDIDATE_INVALID")
		}
		prepared = append(prepared, action)
	}
	for i, action := range prepared {
		if action.Reason != "" {
			id, err := storeCandidate(ctx, tx, j, i, action)
			if err != nil {
				return out, err
			}
			out.CandidateIDs = append(out.CandidateIDs, id)
			continue
		}
		var item api.MemoryItem
		if action.Target == nil {
			item, err = newItem(ctx, tx, j.Namespace, j.Scope, action.Body)
		} else {
			item, err = replaceItem(ctx, tx, j.Namespace, *action.Target, action.Body)
		}
		if err != nil {
			return out, err
		}
		out.AppliedRevisionIDs = append(out.AppliedRevisionIDs, item.RevisionID)
	}
	state := "committed"
	if len(out.CandidateIDs) > 0 {
		state = "candidate"
	}
	if err = changed(tx.ExecContext(ctx, "UPDATE memory_jobs SET commit_state=?,reason='',revision=revision+1 WHERE job_id=? AND generation=? AND settings_revision=? AND run_id=? AND commit_state='pending' AND revision<9223372036854775807", state, j.ID, j.Generation, j.Settings, r.Run.ID)); err != nil {
		return out, err
	}
	if err = bump(ctx, tx, j.Namespace.ID, false); err != nil {
		return out, err
	}
	return out, nil
}

func storeCandidate(ctx context.Context, tx *sql.Tx, j maintenanceJob, ordinal int, p preparedCandidate) (string, error) {
	id := api.NewID("memory-candidate:")
	targetRevision := "0"
	if p.Target != nil {
		targetRevision = p.Expected.Revision
	}
	_, err := tx.ExecContext(ctx, "INSERT INTO memory_candidates(candidate_id,namespace_id,job_id,ordinal,generation,scope_kind,scope_id,operation,target_item_id,target_revision,target_revision_id,target_pinned,reason,content_hash,provenance,creator_kind,creator_agent_id,source_json,scope_json,derived_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id, j.Namespace.ID, j.ID, ordinal, j.Generation, j.Scope.Kind, j.Scope.ID, p.Draft.Operation, p.Draft.TargetItemID, targetRevision, p.Expected.RevisionID, p.Expected.Pinned, p.Reason, p.Body.Hash, p.Body.Provenance, p.Body.CreatorKind, p.Body.CreatorAgentID, encode(p.Body.SourceRefs), encode(p.Body.SourceScopes), encode(p.Body.Derived), time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return "", err
	}
	if _, err = tx.ExecContext(ctx, "INSERT INTO memory_candidate_bodies(candidate_id,text) VALUES(?,?)", id, p.Body.Text); err != nil {
		return "", err
	}
	if err = insertDependencies(ctx, tx, "memory_candidate", id, "origin", p.Body.Derived); err != nil {
		return "", err
	}
	if p.Target != nil {
		if err = insertDependencies(ctx, tx, "memory_candidate", id, "audit", []api.DerivedInput{revisionRef(j.Namespace, *p.Target)}); err != nil {
			return "", err
		}
	}
	return id, nil
}
