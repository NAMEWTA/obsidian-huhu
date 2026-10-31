package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	maintenanceapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/maintenance"
)

type maintenanceJob struct {
	ID, SourceRun, Generation, Settings, RunID, Config, Admission, Commit, Reason string
	Input, Digest                                                                 string
	Namespace                                                                     namespace
	Source                                                                        api.DerivedInput
	Scope                                                                         api.MemoryScope
}

var _ execution.MemoryHooks = (*Store)(nil)
var _ api.MemoryAPI = (*Store)(nil)
var _ grants.MemoryFactsReader = (*Store)(nil)

func (s *Store) job(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, jobID string) (maintenanceJob, error) {
	var j maintenanceJob
	var run sql.NullString
	var profile, principal, kind, subject, namespaceID string
	err := tx.QueryRowContext(ctx, "SELECT j.job_id,j.source_run_id,CAST(j.generation AS TEXT),CAST(j.settings_revision AS TEXT),j.run_id,j.task_config_id,j.admission,j.commit_state,j.reason,j.input_json,j.input_digest,n.profile_id,n.principal_id,n.kind,n.subject_id,n.namespace_id,o.source_kind,o.source_id,o.source_revision,o.source_hash,o.source_namespace,o.source_work_thread_id,o.scope_kind,o.scope_id FROM memory_jobs j JOIN memory_namespaces n ON n.namespace_id=j.namespace_id JOIN memory_completion_outbox o ON o.completion_id=j.completion_id AND o.namespace_id=j.namespace_id AND o.source_run_id=j.source_run_id WHERE j.job_id=?", jobID).Scan(&j.ID, &j.SourceRun, &j.Generation, &j.Settings, &run, &j.Config, &j.Admission, &j.Commit, &j.Reason, &j.Input, &j.Digest, &profile, &principal, &kind, &subject, &namespaceID, &j.Source.Kind, &j.Source.ID, &j.Source.Revision, &j.Source.Hash, &j.Source.Namespace, &j.Source.WorkThreadID, &j.Scope.Kind, &j.Scope.ID)
	if err != nil {
		return j, missing(err, "MEMORY_JOB_NOT_FOUND")
	}
	if !id.Valid() || id.PrincipalID() != principal {
		return j, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	j.RunID = run.String
	j.Namespace, err = s.readNamespace(ctx, tx, id, profile, api.MemoryNamespace{Kind: kind, ID: subject})
	if err != nil {
		return j, err
	}
	if j.Namespace.ID != namespaceID || kind != "agent" || !validRef(j.Source) || !api.ValidMemoryScope(j.Scope) {
		return j, invalidState()
	}
	return j, nil
}

func (s *Store) AdmissionPageInTx(ctx context.Context, tx *sql.Tx, after execution.MemoryScanCursor) (execution.MemoryAdmissionPage, error) {
	out := execution.MemoryAdmissionPage{JobIDs: []string{}}
	if err := s.admissionOpen(ctx); err != nil {
		return out, err
	}
	if (after.CreatedAt == "") != (after.ID == "") {
		return out, api.Invalid("MEMORY_ADMISSION_PAGE_INVALID")
	}
	rows, err := tx.QueryContext(ctx, "SELECT job_id,created_at FROM memory_jobs WHERE run_id IS NULL AND admission IN('pending','blocked') AND commit_state='pending' AND (created_at>? OR (created_at=? AND job_id>?)) ORDER BY created_at,job_id LIMIT 32", after.CreatedAt, after.CreatedAt, after.ID)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var key, created string
		if err = rows.Scan(&key, &created); err != nil {
			rows.Close()
			return out, err
		}
		out.JobIDs = append(out.JobIDs, key)
		out.Next = execution.MemoryScanCursor{CreatedAt: created, ID: key}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	if len(out.JobIDs) < 32 {
		out.Next = execution.MemoryScanCursor{}
	}
	return out, nil
}

// sourceForAdmission checks current read authority before it fetches a body.
// It does not grant send/summarize/memory to a not-yet-created execution.
func (s *Store) sourceForAdmission(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, j maintenanceJob) (runContext, sourceRecord, error) {
	r, err := s.runContext(ctx, tx, id, j.SourceRun)
	if err != nil {
		return r, sourceRecord{}, err
	}
	if !terminal(r.Run.Status) || r.Run.AgentID != j.Namespace.Public.ID || r.Namespace.ID != j.Namespace.ID {
		return r, sourceRecord{}, invalidState()
	}
	metadata, err := sourceMetadata(ctx, tx, id, j.Namespace.Profile, []api.DerivedInput{j.Source})
	if err != nil {
		return r, sourceRecord{}, err
	}
	source, ok := metadata[refKey(j.Source)]
	if !ok || source.OriginRunID != j.SourceRun || !sourceMatches(j.Source, source) {
		return r, sourceRecord{}, inputInvalid()
	}
	read := r.Access
	read.Sources, read.Scopes, read.GrantIDs, read.Group, read.PublishedMessageID = source.Sources, source.Scopes, source.Grants, source.Group, source.Published
	if _, err = s.access.ReadDeadlineInTx(ctx, tx, id, read); err != nil {
		return r, sourceRecord{}, err
	}
	if source.BodyBytes == 0 || source.BodyBytes > 131072 {
		return r, sourceRecord{}, fault("RESOURCE_LIMIT", "MEMORY_INPUT_LIMIT")
	}
	bodies, err := sourceRecords(ctx, tx, id, j.Namespace.Profile, []api.DerivedInput{j.Source})
	if err != nil {
		return r, sourceRecord{}, err
	}
	source, ok = bodies[refKey(j.Source)]
	if !ok || !sourceMatches(j.Source, source) {
		return r, sourceRecord{}, inputInvalid()
	}
	return r, source, nil
}

func (s *Store) ReadAdmissionInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, jobID string) (execution.MaintenanceAdmission, error) {
	out := execution.MaintenanceAdmission{}
	if err := s.admissionOpen(ctx); err != nil {
		return out, err
	}
	j, err := s.job(ctx, tx, id, jobID)
	if err != nil {
		return out, err
	}
	if j.RunID != "" || j.Admission == "bound" || j.Commit != "pending" {
		return out, api.Denied("MEMORY_JOB_CHANGED")
	}
	settings, err := s.settings(ctx, tx, j.Namespace)
	if err != nil {
		return out, err
	}
	if !settings.Eligible {
		return out, api.Denied(settings.Reason)
	}
	r, source, err := s.sourceForAdmission(ctx, tx, id, j)
	if err != nil {
		return out, err
	}
	refs, err := s.actualDerived(ctx, tx, id, j.Namespace.Profile, r.Run.ID)
	if err != nil {
		return out, err
	}
	refs, err = mergeRefs(refs, []api.DerivedInput{j.Source})
	if err != nil {
		return out, err
	}
	rules, err := rulesForOrigins(ctx, tx, j.Namespace.ID, refs)
	if err != nil {
		return out, err
	}
	for _, rule := range rules {
		if rule.Kind == "deny_automatic" {
			return out, api.Denied("MEMORY_FORGOTTEN")
		}
	}
	out = execution.MaintenanceAdmission{JobID: j.ID, Generation: j.Generation, ProfileID: j.Namespace.Profile, PrincipalID: j.Namespace.Principal, AgentID: j.Namespace.Public.ID, SourceRunID: j.SourceRun, SessionID: r.Run.SessionID, Intent: maintenanceapp.Intent}
	out.Access = r.Access
	out.Access.ParentScope = nil
	out.Access.PublishedMessageID = ""
	out.Access.Sources = append([]api.SourceSnapshot{}, source.Sources...)
	out.Access.Scopes = append([]api.SourceScope{}, source.Scopes...)
	out.Access.GrantIDs = append([]string{}, source.Grants...)
	if source.Published != "" {
		out.Access.Group = nil
	}
	// This is a provisional pure admission value. The original Run writer pins
	// the current model, replaces TaskID/recipient, and selects all four ops after
	// BindRun in this same transaction. No body is dispatched from this method.
	out.Input = api.ExecutionMemoryInput{Version: "1", Mode: "maintenance", Namespace: j.Namespace.Public, JobID: j.ID, JobGeneration: j.Generation, SettingsRevision: settings.Revision, Entries: []api.MemoryInputEntry{{Ref: j.Source, Role: "assistant", Text: source.Text}}, Targets: []api.MemoryTarget{}}
	rows, err := tx.QueryContext(ctx, "SELECT item_id FROM memory_items WHERE namespace_id=? AND state='active' AND scope_kind=? AND scope_id=? ORDER BY pinned DESC,item_id LIMIT 32", j.Namespace.ID, j.Scope.Kind, j.Scope.ID)
	if err != nil {
		return out, err
	}
	ids := []string{}
	for rows.Next() {
		var value string
		if err = rows.Scan(&value); err != nil {
			rows.Close()
			return out, err
		}
		ids = append(ids, value)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	bytes := len(source.Text)
	for _, itemID := range ids {
		item, e := s.readItem(ctx, tx, id, j.Namespace, itemID)
		if e != nil {
			if safeUnavailable(e) {
				continue
			}
			return out, e
		}
		if item.Body == nil {
			continue
		}
		if bytes+len(item.Body.Text) > 131072 {
			continue
		}
		itemRef := revisionRef(j.Namespace, item)
		nextRefs, e := mergeRefs(refs, append(append([]api.DerivedInput{}, item.Body.Derived...), itemRef))
		if e != nil {
			var f *api.Fault
			if errors.As(e, &f) && f.Kind == "RESOURCE_LIMIT" {
				continue
			}
			return out, e
		}
		facts, e := s.ReadFactsInTx(ctx, tx, id, j.Namespace.Profile, []grants.MemorySubject{{Kind: "memory_revision", ID: item.RevisionID}})
		if e != nil {
			return out, e
		}
		next := out.Access
		for _, req := range facts.Requirements {
			for _, w := range req.Witnesses {
				extra := next
				extra.Sources = w.Sources
				extra.Scopes = w.Scopes
				extra.GrantIDs = w.GrantIDs
				extra.Group = w.Group
				if w.PublishedMessageID != "" {
					extra.Group = nil
				}
				next, e = accessUnion(next, extra)
				if e != nil {
					break
				}
			}
			if e != nil {
				break
			}
		}
		if e != nil {
			var f *api.Fault
			if errors.As(e, &f) && f.Kind == "RESOURCE_LIMIT" {
				continue
			}
			return out, e
		}
		bytes += len(item.Body.Text)
		refs = nextRefs
		out.Access = next
		out.Input.Entries = append(out.Input.Entries, api.MemoryInputEntry{Ref: itemRef, Role: "memory", Text: item.Body.Text})
		out.Input.Targets = append(out.Input.Targets, api.MemoryTarget{ItemID: item.ID, Revision: item.Revision, RevisionID: item.RevisionID, Pinned: item.Pinned})
	}
	out.Input.BindingDigest, err = api.CanonicalMemoryInputBinding(out.Input)
	out.Access.TaskID = ""
	return out, err
}

func (s *Store) BindRunInTx(ctx context.Context, tx *sql.Tx, jobID, runID, configID string) error {
	if err := s.admissionOpen(ctx); err != nil {
		return err
	}
	var principal string
	if err := tx.QueryRowContext(ctx, "SELECT principal_id FROM execution_runs WHERE run_id=?", runID).Scan(&principal); err != nil {
		return err
	}
	id := api.NewConnectionIdentity("memory-bind:"+runID, principal, false)
	j, err := s.job(ctx, tx, id, jobID)
	if err != nil {
		return err
	}
	if j.RunID != "" {
		if j.RunID == runID && j.Config == configID && j.Admission == "bound" {
			return nil
		}
		return api.Denied("MEMORY_JOB_CHANGED")
	}
	admission, err := s.ReadAdmissionInTx(ctx, tx, id, jobID)
	if err != nil {
		return err
	}
	r, err := s.runContext(ctx, tx, id, runID)
	if err != nil {
		return err
	}
	var root, budget, parent, role, admissionKind, configRaw string
	var pins int
	err = tx.QueryRowContext(ctx, "SELECT r.root_run_id,r.budget_root_run_id,r.parent_run_id,r.execution_role,r.admission_kind,c.config_json,(SELECT count(*) FROM task_config_pins p WHERE p.run_id=r.run_id AND p.snapshot_id=c.snapshot_id) FROM execution_runs r JOIN task_config_snapshots c ON c.snapshot_id=r.task_config_id WHERE r.run_id=? AND c.profile_id=? AND c.principal_id=?", runID, j.Namespace.Profile, principal).Scan(&root, &budget, &parent, &role, &admissionKind, &configRaw, &pins)
	if err != nil {
		return err
	}
	var config api.TaskConfigSnapshot
	if json.Unmarshal([]byte(configRaw), &config) != nil || config.ID != configID || config.SubjectID != j.Namespace.Public.ID || config.Kind != "agent" || config.Agent.ID != j.Namespace.Public.ID || r.Config != configID || root != runID || budget != runID || parent != "" || role != "execution" || admissionKind != "model" || r.Run.Status != "accepted" || r.Thread == r.Run.SessionID || r.Thread == j.Source.WorkThreadID || pins != 1 || r.Namespace.ID != j.Namespace.ID || r.Intent != admission.Intent {
		return invalidState()
	}
	input := admission.Input
	if err = changed(tx.ExecContext(ctx, "UPDATE memory_jobs SET run_id=?,task_config_id=?,settings_revision=?,admission='bound',reason='',input_json=?,input_digest=?,revision=revision+1 WHERE job_id=? AND run_id IS NULL AND generation=? AND commit_state='pending' AND revision<9223372036854775807", runID, configID, input.SettingsRevision, encode(bodyFreeMemory(&input)), input.BindingDigest, jobID, j.Generation)); err != nil {
		return err
	}
	refs := []api.DerivedInput{}
	for _, entry := range input.Entries {
		refs = append(refs, entry.Ref)
	}
	graph, err := loadGraph(ctx, tx, []ownerKey{{"job", jobID}})
	if err != nil {
		return err
	}
	ancestors, err := closure(graph, ownerKey{"job", jobID})
	if err != nil {
		return err
	}
	refs, err = mergeRefs(refs, ancestors)
	if err != nil {
		return err
	}
	for _, entry := range input.Entries {
		if entry.Ref.Kind == "memory_revision" {
			body, err := revisionBody(ctx, tx, entry.Ref.ID)
			if err != nil {
				return err
			}
			refs, err = mergeRefs(refs, body.Derived)
			if err != nil {
				return err
			}
		}
	}
	if err = insertDependencies(ctx, tx, "job", jobID, "effective", refs); err != nil {
		return err
	}
	if err = insertDependencies(ctx, tx, "run", runID, "effective", refs); err != nil {
		return err
	}
	return bump(ctx, tx, j.Namespace.ID, false)
}
