package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func bodyFreeShort(v *api.ShortTermInput) *api.ShortTermInput {
	if v == nil {
		return nil
	}
	out := *v
	out.Entries = append([]api.ShortTermEntry{}, v.Entries...)
	for i := range out.Entries {
		out.Entries[i].Text = ""
		if out.Entries[i].Message != nil {
			m := *out.Entries[i].Message
			m.Text = ""
			out.Entries[i].Message = &m
		}
	}
	return &out
}
func bodyFreeMemory(v *api.ExecutionMemoryInput) *api.ExecutionMemoryInput {
	if v == nil {
		return nil
	}
	out := *v
	out.Entries = append([]api.MemoryInputEntry{}, v.Entries...)
	out.Targets = append([]api.MemoryTarget{}, v.Targets...)
	for i := range out.Entries {
		out.Entries[i].Text = ""
	}
	return &out
}
func inputInvalid() error { return fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID") }

func (s *Store) hydrateMemory(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, v api.ExecutionMemoryInput, expected string) (*api.ExecutionMemoryInput, error) {
	manifest, err := api.CanonicalMemoryInputManifestBinding(v)
	if err != nil || manifest != expected || v.BindingDigest != expected {
		return nil, inputInvalid()
	}
	if v.Namespace != r.Namespace.Public {
		return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	ops := []string{"read", "send"}
	if v.Mode == "maintenance" {
		var job, generation, settings, actualSettings, admission, commit string
		var enabled bool
		err := tx.QueryRowContext(ctx, "SELECT j.job_id,CAST(j.generation AS TEXT),CAST(j.settings_revision AS TEXT),CAST(n.settings_revision AS TEXT),n.enabled,j.admission,j.commit_state FROM memory_jobs j JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE j.run_id=? AND j.namespace_id=?", r.Run.ID, r.Namespace.ID).Scan(&job, &generation, &settings, &actualSettings, &enabled, &admission, &commit)
		if err != nil {
			return nil, err
		}
		if !enabled {
			return nil, api.Denied("MEMORY_AUTO_DISABLED")
		}
		if job != v.JobID || generation != v.JobGeneration || settings != v.SettingsRevision || settings != actualSettings || admission != "bound" {
			return nil, api.Denied("MEMORY_JOB_CHANGED")
		}
		if r.Run.Status != "succeeded" && r.Run.Status != "failed" && r.Run.Status != "canceled" && commit != "pending" {
			return nil, api.Denied("MEMORY_JOB_CHANGED")
		}
		ops = []string{"read", "send", "summarize", "memory"}
	} else if v.Mode != "recall" {
		return nil, inputInvalid()
	}
	primitive := []api.DerivedInput{}
	for _, entry := range v.Entries {
		if entry.Text != "" {
			return nil, inputInvalid()
		}
		if entry.Ref.Kind != "memory_revision" {
			primitive = append(primitive, entry.Ref)
		}
	}
	metadata, err := sourceMetadata(ctx, tx, id, r.Namespace.Profile, primitive)
	if err != nil {
		return nil, err
	}
	for _, ref := range primitive {
		source, ok := metadata[refKey(ref)]
		if !ok || !sourceMatches(ref, source) {
			return nil, inputInvalid()
		}
		if _, err = s.sourceAccess(ctx, tx, id, r, source, ops); err != nil {
			return nil, err
		}
	}
	bodies, err := sourceRecords(ctx, tx, id, r.Namespace.Profile, primitive)
	if err != nil {
		return nil, err
	}
	for i, entry := range v.Entries {
		if entry.Ref.Kind == "memory_revision" {
			if err = s.qualify(ctx, tx, id, r.Namespace.Profile, r.Run.ID, grants.MemorySubject{Kind: "memory_revision", ID: entry.Ref.ID}, ops); err != nil {
				return nil, err
			}
			facts, e := factMetadata(ctx, tx, id, r.Namespace.Profile, "memory_revision", []string{entry.Ref.ID})
			if e != nil {
				return nil, e
			}
			meta, ok := facts[entry.Ref.ID]
			thread := meta.Scope.ID
			if thread == "" {
				thread = r.Namespace.Profile
			}
			if !ok || meta.State != "active" || meta.Head != entry.Ref.ID || meta.Namespace.ID != entry.Ref.Namespace || entry.Ref.WorkThreadID != thread {
				return nil, inputInvalid()
			}
			body, e := revisionBody(ctx, tx, entry.Ref.ID)
			if e != nil {
				return nil, e
			}
			if body.Hash != entry.Ref.Hash {
				return nil, inputInvalid()
			}
			v.Entries[i].Text = body.Text
		} else {
			source, ok := bodies[refKey(entry.Ref)]
			if !ok || !sourceMatches(entry.Ref, source) {
				return nil, inputInvalid()
			}
			v.Entries[i].Text = source.Text
		}
	}
	digest, err := api.CanonicalMemoryInputBinding(v)
	if err != nil || digest != expected || v.BindingDigest != expected {
		return nil, inputInvalid()
	}
	return &v, nil
}

func (s *Store) ReadInputInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, runID string) (*api.ExecutionMemoryInput, error) {
	r, err := s.runContext(ctx, tx, id, runID)
	if err != nil {
		return nil, err
	}
	var raw, binding string
	err = tx.QueryRowContext(ctx, "SELECT memory_json,memory_digest FROM memory_run_contexts WHERE run_id=?", runID).Scan(&raw, &binding)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, "SELECT input_json,input_digest FROM memory_jobs WHERE run_id=? AND admission='bound'", runID).Scan(&raw, &binding)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
	}
	if err != nil {
		return nil, err
	}
	if raw == "" {
		if binding != "" {
			return nil, inputInvalid()
		}
		return nil, nil
	}
	var value api.ExecutionMemoryInput
	if json.Unmarshal([]byte(raw), &value) != nil {
		return nil, inputInvalid()
	}
	return s.hydrateMemory(ctx, tx, id, r, value, binding)
}

func (s *Store) ReadContextInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, runID string) (*api.ShortTermInput, error) {
	r, err := s.runContext(ctx, tx, id, runID)
	if err != nil {
		return nil, err
	}
	var raw, binding, job string
	err = tx.QueryRowContext(ctx, "SELECT short_term_json,short_term_digest,job_id FROM memory_run_contexts WHERE run_id=?", runID).Scan(&raw, &binding, &job)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if raw == "" {
		if binding != "" || job == "" {
			return nil, inputInvalid()
		}
		return nil, nil
	}
	var value api.ShortTermInput
	if json.Unmarshal([]byte(raw), &value) != nil || value.Entries == nil {
		return nil, inputInvalid()
	}
	if value.Namespace != (api.ContextNamespace{SubjectKind: r.Namespace.Public.Kind, SubjectID: r.Namespace.Public.ID, SessionID: r.Run.SessionID, WorkThreadID: r.Thread}) || value.IntentHash != digest(r.Intent) {
		return nil, inputInvalid()
	}
	refs := []api.DerivedInput{}
	for _, entry := range value.Entries {
		if entry.Text != "" || entry.ID == "" {
			return nil, inputInvalid()
		}
		refs = append(refs, entry.Ref)
	}
	metadata, err := sourceMetadata(ctx, tx, id, r.Namespace.Profile, refs)
	if err != nil {
		return nil, err
	}
	for _, ref := range refs {
		source, ok := metadata[refKey(ref)]
		if !ok || !sourceMatches(ref, source) {
			return nil, inputInvalid()
		}
		if _, err = s.sourceAccess(ctx, tx, id, r, source, []string{"read", "send"}); err != nil {
			return nil, err
		}
	}
	bodies, err := sourceRecords(ctx, tx, id, r.Namespace.Profile, refs)
	if err != nil {
		return nil, err
	}
	stored, err := readContextEntries(ctx, tx, runID)
	if err != nil {
		return nil, err
	}
	byID := map[string]storedContextEntry{}
	for _, entry := range stored {
		byID[entry.View.ID] = entry
	}
	for i, entry := range value.Entries {
		actual, ok := byID[entry.ID]
		if !ok || actual.Short == nil || !reflect.DeepEqual(*actual.Short, entry) {
			return nil, inputInvalid()
		}
		source, ok := bodies[refKey(entry.Ref)]
		if !ok || !sourceMatches(entry.Ref, source) || source.OriginKind != entry.OriginKind {
			return nil, inputInvalid()
		}
		text, e := renderSpans(source.Text, entry.Representation, entry.Spans)
		if e != nil {
			return nil, e
		}
		entry.Text = text
		if e = api.ValidateShortTermOriginal(entry, source.Text, r.Intent); e != nil {
			return nil, inputInvalid()
		}
		value.Entries[i] = entry
	}
	actual, err := api.CanonicalShortTermBinding(value)
	if err != nil || actual != binding || value.BindingDigest != binding {
		return nil, inputInvalid()
	}
	if _, err = api.RenderShortTermInput(value); err != nil {
		return nil, inputInvalid()
	}
	return &value, nil
}

// ContextUsageInTx projects safe stored counters without hydrating source
// bodies. A terminal Run remains inspectable after its input becomes redacted.
func (s *Store) ContextUsageInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string) (*api.ContextUsage, error) {
	var actualProfile, principal, raw string
	err := tx.QueryRowContext(ctx, "SELECT s.profile_id,r.principal_id,COALESCE(c.short_term_json,'') FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id LEFT JOIN memory_run_contexts c ON c.run_id=r.run_id WHERE r.run_id=?", runID).Scan(&actualProfile, &principal, &raw)
	if err != nil {
		return nil, err
	}
	if actualProfile != profile || principal != id.PrincipalID() {
		return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if raw == "" {
		return nil, nil
	}
	var value api.ShortTermInput
	if json.Unmarshal([]byte(raw), &value) != nil || value.Usage.PolicyVersion != "extractive-v1" || value.Usage.Selected != len(value.Entries) {
		return nil, inputInvalid()
	}
	return &value.Usage, nil
}

func (s *Store) SealInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution, plan execution.InitialContextPlan) (execution.InitialContextPlan, error) {
	r, err := s.activeContext(ctx, tx, e)
	if err != nil {
		return plan, err
	}
	if plan.Watermark == "" || plan.Watermark != planWatermark(plan, r) {
		return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
	}
	var existing int
	if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_run_contexts WHERE run_id=?", r.Run.ID).Scan(&existing); err != nil {
		return plan, err
	}
	if existing > 0 {
		plan.ShortTerm, err = s.ReadContextInTx(ctx, tx, e.Identity, r.Run.ID)
		if err != nil {
			return plan, err
		}
		plan.Memory, err = s.ReadInputInTx(ctx, tx, e.Identity, r.Run.ID)
		return plan, err
	}
	fullAccess, err := accessUnion(plan.Access, r.Access)
	if err != nil {
		return plan, err
	}
	fullDerived, err := mergeRefs(plan.Derived, r.Derived)
	if err != nil {
		return plan, err
	}
	fullDerived, err = mergeRefs(fullDerived, e.Lineage.Derived)
	if err != nil {
		return plan, err
	}
	if !reflect.DeepEqual(fullAccess, plan.Access) || !reflect.DeepEqual(fullDerived, plan.Derived) {
		return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
	}
	if err = s.access.CheckInTx(ctx, tx, e.Identity, plan.Access, []string{"read", "send"}); err != nil {
		return plan, err
	}
	if plan.ShortTerm != nil {
		refs := []api.DerivedInput{}
		for _, entry := range plan.ShortTerm.Entries {
			if entry.ID != "" {
				return plan, inputInvalid()
			}
			refs = append(refs, entry.Ref)
		}
		metadata, err := sourceMetadata(ctx, tx, e.Identity, r.Namespace.Profile, refs)
		if err != nil {
			return plan, err
		}
		for _, ref := range refs {
			source, ok := metadata[refKey(ref)]
			if !ok || !sourceMatches(ref, source) {
				return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
			}
			a, err := s.sourceAccess(ctx, tx, e.Identity, r, source, []string{"read", "send"})
			if err != nil {
				return plan, err
			}
			merged, err := accessUnion(plan.Access, a)
			if err != nil {
				return plan, err
			}
			if !reflect.DeepEqual(merged, plan.Access) {
				return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
			}
		}
		bodies, err := sourceRecords(ctx, tx, e.Identity, r.Namespace.Profile, refs)
		if err != nil {
			return plan, err
		}
		selected := *plan.ShortTerm
		selected.Entries = append([]api.ShortTermEntry{}, selected.Entries...)
		for i, entry := range selected.Entries {
			source, ok := bodies[refKey(entry.Ref)]
			if !ok || !sourceMatches(entry.Ref, source) || api.ValidateShortTermOriginal(entry, source.Text, r.Intent) != nil {
				return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
			}
			selected.Entries[i].ID = api.NewID("context-entry:")
		}
		selected.BindingDigest, err = api.CanonicalShortTermBinding(selected)
		if err != nil {
			return plan, err
		}
		if _, err = api.RenderShortTermInput(selected); err != nil {
			return plan, err
		}
		plan.ShortTerm = &selected
	}
	if plan.Memory != nil {
		restored, err := s.hydrateMemory(ctx, tx, e.Identity, r, *bodyFreeMemory(plan.Memory), plan.Memory.BindingDigest)
		if err != nil {
			return plan, err
		}
		if !reflect.DeepEqual(restored, plan.Memory) {
			return plan, fault("CONFLICT", "CONTEXT_PLAN_CHANGED")
		}
	}
	if plan.ShortTerm == nil && (plan.Memory == nil || plan.Memory.Mode != "maintenance") {
		return plan, inputInvalid()
	}
	if err = materialize(ctx, tx, &r.Namespace); err != nil {
		return plan, err
	}
	shortJSON, shortHash, memoryJSON, memoryHash, job := "", "", "", "", ""
	if plan.ShortTerm != nil {
		shortJSON = encode(bodyFreeShort(plan.ShortTerm))
		shortHash = plan.ShortTerm.BindingDigest
	}
	if plan.Memory != nil {
		memoryJSON = encode(bodyFreeMemory(plan.Memory))
		memoryHash = plan.Memory.BindingDigest
		job = plan.Memory.JobID
	}
	if _, err = tx.ExecContext(ctx, "INSERT INTO memory_run_contexts(run_id,namespace_id,policy_version,sealed,short_term_json,short_term_digest,memory_json,memory_digest,job_id,created_at) VALUES(?,?,?,1,?,?,?,?,?,?)", r.Run.ID, r.Namespace.ID, r.Policy, shortJSON, shortHash, memoryJSON, memoryHash, job, time.Now().UTC().Format(api.TimestampLayout)); err != nil {
		return plan, err
	}
	if err = s.sealEntries(ctx, tx, e.Identity, r, plan); err != nil {
		return plan, err
	}
	if err = insertDependencies(ctx, tx, "run", r.Run.ID, "effective", plan.Derived); err != nil {
		return plan, err
	}
	if err = bump(ctx, tx, r.Namespace.ID, false); err != nil {
		return plan, err
	}
	return plan, nil
}
