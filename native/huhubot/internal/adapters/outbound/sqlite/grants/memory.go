package grants

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	contextaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// These are adapter facts, never request DTOs. The reader owns all Memory
// namespace/head/suppression/ancestor checks and must not call this Store back.
type MemorySubject struct{ Kind, ID string }
type MemoryWitness struct {
	Ref                             api.DerivedInput
	OriginRunID, PublishedMessageID string
	Sources                         []api.SourceSnapshot
	Scopes                          []api.SourceScope
	GrantIDs                        []string
	Group                           *api.GroupBinding
}
type MemoryRequirement struct {
	Subject     MemorySubject
	Namespace   api.MemoryNamespace
	Scope       api.MemoryScope
	RevisionIDs []string
	Witnesses   []MemoryWitness
}
type MemoryFacts struct {
	Requirements []MemoryRequirement
	Watermark    string
	Dependencies []MemoryDependency
}
type MemoryDependency struct {
	Subject MemorySubject
	Derived []api.DerivedInput
}
type MemoryFactsReader interface {
	ReadFactsInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []MemorySubject) (MemoryFacts, error)
}

// SetMemory is a startup composition operation, like SetGroups.
func (s *Store) SetMemory(reader MemoryFactsReader) { s.memory = reader }

func memorySubjectValid(v MemorySubject) bool {
	if !grantsapp.Opaque(v.ID) {
		return false
	}
	switch v.Kind {
	case "run", "message", "memory_revision", "memory_candidate", "context_entry":
		return true
	}
	return false
}

// CheckMemoryInTx re-reads the exact supplied requirement in the caller's Tx.
// targetRunID must come from its existing current ToolExecution/claim gate.
// Empty target is restricted to trusted owner UI read; this API grants no
// model claim and performs no Host, Provider or nested transaction operation.
func (s *Store) CheckMemoryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, targetRunID string, req MemoryRequirement, ops []string) (time.Time, error) {
	if !id.Valid() {
		return time.Time{}, api.Denied("IDENTITY_REQUIRED")
	}
	if _, e := metadata(ctx, tx, profileID); e != nil {
		return time.Time{}, e
	}
	if s.memory == nil {
		return time.Time{}, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	if !memorySubjectValid(req.Subject) || !api.ValidMemoryNamespace(req.Namespace) || !api.ValidMemoryScope(req.Scope) || len(ops) == 0 {
		return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if targetRunID == "" && (len(ops) != 1 || ops[0] != "read") {
		return time.Time{}, api.Denied("MEMORY_SCOPE_MISMATCH")
	}
	if req.Namespace.Kind == "global" && req.Namespace.ID != profileID {
		return time.Time{}, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if len(req.RevisionIDs) > 128 || len(req.Witnesses) > 128 {
		return time.Time{}, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	facts, e := s.memory.ReadFactsInTx(ctx, tx, id, profileID, []MemorySubject{req.Subject})
	if e != nil {
		return time.Time{}, e
	}
	found := 0
	for _, actual := range facts.Requirements {
		if reflect.DeepEqual(actual, req) {
			found++
		}
	}
	if found != 1 {
		return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	global, e := confirmedGlobalSubject(facts, req.Subject, profileID)
	if e != nil {
		return time.Time{}, e
	}
	if global {
		// The facts reader has already checked the root's active head/body and
		// complete graph. Its own ID belongs to exactly one real global group;
		// a private subject merely containing a global ancestor does not qualify.
		ctx = context.WithValue(ctx, globalMemorySubject{}, req.Subject)
		until := time.Now().Add(DeliveryLifetime)
		for _, actual := range facts.Requirements {
			if actual.Subject != req.Subject {
				continue
			}
			if !api.ValidMemoryNamespace(actual.Namespace) || !api.ValidMemoryScope(actual.Scope) || len(actual.RevisionIDs) > 128 || len(actual.Witnesses) > 128 {
				return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			deadline, e := s.checkMemoryRequirementInTx(ctx, tx, id, profileID, targetRunID, actual, ops)
			if e != nil {
				return time.Time{}, e
			}
			if deadline.Before(until) {
				until = deadline
			}
		}
		return until, nil
	}
	return s.checkMemoryRequirementInTx(ctx, tx, id, profileID, targetRunID, req, ops)
}

type globalMemorySubject struct{}

func confirmedGlobalSubject(facts MemoryFacts, subject MemorySubject, profile string) (bool, error) {
	if subject.Kind != "memory_revision" {
		return false, nil
	}
	count, global := 0, false
	for _, req := range facts.Requirements {
		if req.Subject != subject {
			continue
		}
		for _, revision := range req.RevisionIDs {
			if revision != subject.ID {
				continue
			}
			count++
			global = req.Namespace.Kind == "global" && req.Namespace.ID == profile
		}
	}
	if count != 1 {
		return false, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	return global, nil
}

// CheckConsumedMemoryInTx is for an actual private/public body reader, before
// returning that body. It keeps the subject's real ancestor namespaces and
// checks the existing durable relationship to the consuming Run.
func (s *Store) CheckConsumedMemoryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, target string, subject MemorySubject, ops []string) (time.Time, error) {
	_, until, e := s.consumedMemoryInTx(ctx, tx, id, profile, target, subject, ops)
	return until, e
}

func (s *Store) ReadConsumedMemoryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, target string, subject MemorySubject, ops []string) ([]api.DerivedInput, time.Time, error) {
	return s.consumedMemoryInTx(ctx, tx, id, profile, target, subject, ops)
}

// ReadHistoryMemory is an application-private page qualification port. It is
// deliberately pure: the caller merges the returned closure only for messages
// actually retained by its final model/provenance budget. Merely inspecting the
// next page must not mutate a model Run or its future Dispatch qualifications.
func (s *Store) ReadHistoryMemory(ctx context.Context, id api.RequestIdentity, profile, target string, items []api.VisibleMessage) ([]api.VisibleMessage, map[string][]api.DerivedInput, error) {
	allowed := []api.VisibleMessage{}
	derived := map[string][]api.DerivedInput{}
	if !id.Valid() {
		return nil, nil, api.Denied("IDENTITY_REQUIRED")
	}
	if len(items) > 100 {
		return nil, nil, fault("RESOURCE_LIMIT", "HISTORY_PAGE_TOO_LARGE")
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := metadata(ctx, tx, profile); e != nil {
			return e
		}
		if len(items) == 0 {
			return nil
		}
		var consumer api.RunAccessInput
		if target != "" {
			r, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: target})
			if e != nil {
				return e
			}
			if r.Role == "orchestration" {
				return api.Denied("MEMORY_SCOPE_MISMATCH")
			}
			consumer = in
			if e = s.checkSourcesInTx(ctx, tx, id, in, []string{"read", "send"}, true, nil); e != nil {
				return e
			}
		}
		subjects := []MemorySubject{}
		seen := map[string]bool{}
		args := []any{profile, id.PrincipalID()}
		for _, item := range items {
			if seen[item.ID] || !grantsapp.Opaque(item.ID) {
				return fault("CONFLICT", "MESSAGE_CONTEXT_INVALID")
			}
			seen[item.ID] = true
			subjects = append(subjects, MemorySubject{Kind: "message", ID: item.ID})
			args = append(args, item.ID)
		}
		rows, e := tx.QueryContext(ctx, "SELECT m.message_id FROM conversation_messages m JOIN conversation_sessions s ON s.session_id=m.session_id WHERE s.profile_id=? AND s.principal_id=? AND m.message_id IN("+strings.TrimSuffix(strings.Repeat("?,", len(items)), ",")+")", args...)
		if e != nil {
			return e
		}
		count := 0
		for rows.Next() {
			var key string
			if e = rows.Scan(&key); e != nil {
				rows.Close()
				return e
			}
			count++
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if count != len(items) {
			return api.Denied("MESSAGE_READ_DENIED")
		}
		facts, unavailable, e := s.readHistoryFactsInTx(ctx, tx, id, profile, subjects)
		if e != nil {
			return e
		}
		currentCtx, e := memoryBatchRows(ctx, tx, id, profile, facts)
		if e != nil {
			return e
		}
		ops := []string{"read"}
		if target != "" {
			ops = []string{"read", "send"}
		}
		for _, item := range items {
			if unavailable[item.ID] {
				continue
			}
			subject := MemorySubject{Kind: "message", ID: item.ID}
			var refusal error
			if target != "" {
				refusal = s.memorySubjectReadableInTx(currentCtx, tx, id, consumer, subject)
			}
			for _, req := range facts.Requirements {
				if req.Subject != subject {
					continue
				}
				if _, e := s.checkMemoryRequirementInTx(currentCtx, tx, id, profile, target, req, ops); e != nil {
					refusal = e
					break
				}
			}
			if refusal != nil {
				var f *api.Fault
				if errors.As(refusal, &f) && (f.Kind == "CAPABILITY_DENIED" || f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
					continue
				}
				return refusal
			}
			refs := []api.DerivedInput{}
			for _, dependency := range facts.Dependencies {
				if dependency.Subject == subject {
					refs, e = mergeMemoryDerived(refs, dependency.Derived)
					if e != nil {
						return e
					}
				}
			}
			allowed = append(allowed, item)
			derived[item.ID] = refs
		}
		return nil
	})
	if e != nil {
		return nil, nil, e
	}
	return allowed, derived, nil
}

// A revoked ancestor can make the domain's all-or-error Facts reader reject a
// batch. Bisect only those known availability denials in the same Tx, so one
// old body does not hide independent user messages. The normal page is one
// batch. SQL, invalid JSON, cycles and unknown faults are never filtered.
func (s *Store) readHistoryFactsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, subjects []MemorySubject) (MemoryFacts, map[string]bool, error) {
	combined := MemoryFacts{Requirements: []MemoryRequirement{}, Dependencies: []MemoryDependency{}}
	unavailable := map[string]bool{}
	var read func([]MemorySubject) error
	read = func(batch []MemorySubject) error {
		facts, e := s.readMemoryFactsInTx(ctx, tx, id, profile, batch)
		if e == nil {
			combined.Requirements = append(combined.Requirements, facts.Requirements...)
			combined.Dependencies = append(combined.Dependencies, facts.Dependencies...)
			return nil
		}
		var f *api.Fault
		safe := errors.As(e, &f) && f.Kind == "CAPABILITY_DENIED"
		if safe {
			switch f.Reason {
			case "MEMORY_FORGOTTEN", "MEMORY_REVISION_INACTIVE", "MEMORY_NAMESPACE_DENIED", "MEMORY_SCOPE_MISMATCH":
			default:
				safe = false
			}
		}
		if !safe {
			return e
		}
		if len(batch) == 1 {
			unavailable[batch[0].ID] = true
			return nil
		}
		middle := len(batch) / 2
		if e = read(batch[:middle]); e != nil {
			return e
		}
		return read(batch[middle:])
	}
	if len(subjects) > 0 {
		if e := read(subjects); e != nil {
			return MemoryFacts{}, nil, e
		}
	}
	return combined, unavailable, nil
}

func (s *Store) consumedMemoryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, target string, subject MemorySubject, ops []string) ([]api.DerivedInput, time.Time, error) {
	if !id.Valid() {
		return nil, time.Time{}, api.Denied("IDENTITY_REQUIRED")
	}
	if !memorySubjectValid(subject) || len(ops) == 0 {
		return nil, time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	facts, e := s.readMemoryFactsInTx(ctx, tx, id, profile, []MemorySubject{subject})
	if e != nil {
		return nil, time.Time{}, e
	}
	until := time.Now().Add(DeliveryLifetime)
	for _, req := range facts.Requirements {
		if req.Subject != subject {
			return nil, time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
		deadline, e := s.checkMemoryRequirementInTx(ctx, tx, id, profile, target, req, ops)
		if e != nil {
			return nil, time.Time{}, e
		}
		if deadline.Before(until) {
			until = deadline
		}
	}
	derived := []api.DerivedInput{}
	seen := false
	for _, dependency := range facts.Dependencies {
		if dependency.Subject != subject || seen {
			return nil, time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
		seen = true
		derived, e = mergeMemoryDerived(derived, dependency.Derived)
		if e != nil {
			return nil, time.Time{}, e
		}
	}
	return derived, until, nil
}

func mergeMemoryDerived(a, b []api.DerivedInput) ([]api.DerivedInput, error) {
	out := []api.DerivedInput{}
	seen := map[string]api.DerivedInput{}
	for _, values := range [][]api.DerivedInput{a, b} {
		for _, ref := range values {
			key := ref.Kind + "\x00" + ref.ID
			if previous, ok := seen[key]; ok {
				if previous != ref {
					return nil, fault("CONFLICT", "LINEAGE_STATE_INVALID")
				}
				continue
			}
			revision, e := strconv.ParseInt(ref.Revision, 10, 64)
			hash, hashErr := hex.DecodeString(strings.TrimPrefix(ref.Hash, "sha256:"))
			if ref.ID == "" || len(ref.ID) > 512 || ref.Namespace == "" || ref.WorkThreadID == "" || e != nil || revision < 1 || strconv.FormatInt(revision, 10) != ref.Revision || len(ref.Hash) != 71 || !strings.HasPrefix(ref.Hash, "sha256:") || strings.ToLower(ref.Hash) != ref.Hash || hashErr != nil || len(hash) != 32 || ref.Kind != "message" && ref.Kind != "task_result" && ref.Kind != "memory_revision" {
				return nil, fault("CONFLICT", "LINEAGE_STATE_INVALID")
			}
			seen[key] = ref
			out = append(out, ref)
		}
	}
	if len(out) > 128 {
		return nil, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	return out, nil
}

// Requirements passed here come only from the reader in this exact Tx. Public
// callers must use CheckMemoryInTx so no caller-provided requirement is proof.
func (s *Store) checkMemoryRequirementInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, targetRunID string, req MemoryRequirement, ops []string) (time.Time, error) {
	ctx = context.WithValue(ctx, memorySourcesOnly{}, true)
	until := time.Now().Add(DeliveryLifetime)
	var target api.RunAccessInput
	if targetRunID != "" {
		r, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profileID, ID: targetRunID})
		if e != nil {
			return time.Time{}, e
		}
		target = in
		temporary := strings.HasPrefix(r.AgentID, "temporary:")
		direct := req.Subject.Kind == "memory_revision" || req.Subject.Kind == "memory_candidate"
		globalRoot, _ := ctx.Value(globalMemorySubject{}).(MemorySubject)
		inheritedGlobal := globalRoot == req.Subject
		if direct && (req.Namespace.Kind == "global" && req.Namespace.ID != profileID || !inheritedGlobal && (req.Namespace.Kind == "agent" && (temporary || req.Namespace.ID != r.AgentID) || req.Namespace.Kind == "temporary" && (!temporary || req.Namespace.ID != r.AgentID))) {
			return time.Time{}, api.Denied("MEMORY_NAMESPACE_DENIED")
		}
		var thread string
		if e := tx.QueryRowContext(ctx, "SELECT work_thread_id FROM execution_runs WHERE run_id=?", r.ID).Scan(&thread); e != nil {
			return time.Time{}, e
		}
		if direct && (req.Scope.Kind == "session" && req.Scope.ID != r.SessionID || req.Scope.Kind == "work_thread" && req.Scope.ID != thread) {
			allowed, e := s.maintenanceMemoryScopeInTx(ctx, tx, id, target, req, ops)
			if e != nil {
				return time.Time{}, e
			}
			if !allowed {
				return time.Time{}, api.Denied("MEMORY_SCOPE_MISMATCH")
			}
		}
		if !direct {
			if e := s.memorySubjectReadableInTx(ctx, tx, id, target, req.Subject); e != nil {
				return time.Time{}, e
			}
		}
		if e := s.checkSourcesInTx(ctx, tx, id, target, ops, true, nil); e != nil {
			return time.Time{}, e
		}
	}
	for _, witness := range req.Witnesses {
		if witness.Ref == (api.DerivedInput{}) {
			var n int
			if req.Subject.Kind != "context_entry" {
				return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_context_entries WHERE entry_id=? AND run_id=? AND kind='attachment' AND origin_kind='attachment' AND representation='metadata'", req.Subject.ID, witness.OriginRunID).Scan(&n); e != nil {
				return time.Time{}, e
			}
			if n != 1 {
				return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
		}
		origin, e := memoryOriginInTx(ctx, tx, id, profileID, witness.OriginRunID)
		if e != nil {
			return time.Time{}, e
		}
		for _, source := range witness.Sources {
			present := false
			for _, stored := range origin.Sources {
				present = present || reflect.DeepEqual(source, stored)
			}
			if !present {
				return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
		}
		for _, scope := range witness.Scopes {
			present := false
			for _, stored := range origin.Scopes {
				present = present || reflect.DeepEqual(scope, stored)
			}
			if !present {
				return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
		}
		if !groupaccess.BindingContains(origin.Group, witness.Group) {
			return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
		origin.Sources, origin.Scopes, origin.GrantIDs = witness.Sources, witness.Scopes, witness.GrantIDs
		origin.Group, origin.PublishedMessageID = witness.Group, witness.PublishedMessageID
		var sourceFacts *readFacts
		if cached, _ := ctx.Value(memoryAuthorizationRows{}).(*memoryRows); cached != nil {
			sourceFacts = cached.sources
		}
		deadline, e := s.readSourcesDeadlineInTx(ctx, tx, id, origin, true, sourceFacts)
		if e != nil {
			return time.Time{}, e
		}
		if deadline.Before(until) {
			until = deadline
		}
		if targetRunID == "" {
			continue
		}
		check := target
		check.Sources, check.Scopes = witness.Sources, witness.Scopes
		// A publication permits historical author reading, not inheriting that
		// author's member identity into a new model's private qualifications.
		if witness.PublishedMessageID == "" && witness.Group != nil {
			check.Group, e = groupaccess.UnionBinding(check.Group, witness.Group)
			if e != nil {
				return time.Time{}, e
			}
		}
		check.GrantIDs, e = s.SelectInTx(ctx, tx, id, check, "", ops)
		if e != nil {
			return time.Time{}, e
		}
		if e = contextaccess.Validate(check); e != nil {
			return time.Time{}, e
		}
		preview, e := loadReadFacts(ctx, tx, id, profileID, []api.RunAccessInput{check})
		if e != nil {
			return time.Time{}, e
		}
		if e = s.checkSourcesInTx(ctx, tx, id, check, ops, true, preview); e != nil {
			return time.Time{}, e
		}
		deadline, e = s.readSourcesDeadlineInTx(ctx, tx, id, check, true, preview)
		if e != nil {
			return time.Time{}, e
		}
		if deadline.Before(until) {
			until = deadline
		}
	}
	return until, nil
}

type memorySourcesOnly struct{}
type maintenanceOriginRead struct{}
type memoryAuthorizationRows struct{}
type memoryRows struct {
	origins map[string]api.RunAccessInput
	sources *readFacts
}

// A maintenance Run has a genuinely independent thread. Its fixed correction
// targets may still be scoped to the source completion's old thread. Only the
// real bound manifest can prove that narrow exception; a normal model read
// keeps the exact thread gate above.
func (s *Store) maintenanceMemoryScopeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, req MemoryRequirement, ops []string) (bool, error) {
	var job, generation, settings, raw, binding, scope, scopeID, sourceThread string
	e := tx.QueryRowContext(ctx, `SELECT j.job_id,CAST(j.generation AS TEXT),CAST(j.settings_revision AS TEXT),j.input_json,j.input_digest,o.scope_kind,o.scope_id,r.work_thread_id FROM memory_jobs j JOIN memory_completion_outbox o ON o.completion_id=j.completion_id AND o.source_run_id=j.source_run_id AND o.namespace_id=j.namespace_id JOIN execution_runs r ON r.run_id=j.source_run_id WHERE j.run_id=? AND j.admission='bound'`, in.TaskID).Scan(&job, &generation, &settings, &raw, &binding, &scope, &scopeID, &sourceThread)
	if errors.Is(e, sql.ErrNoRows) {
		return false, nil
	}
	if e != nil {
		return false, e
	}
	if _, e = s.maintenanceGrantsInTx(ctx, tx, id, in, ops); e != nil {
		return false, e
	}
	if scope != "work_thread" || scopeID != sourceThread || req.Scope != (api.MemoryScope{Kind: scope, ID: scopeID}) {
		return false, nil
	}
	if e = api.ValidateMemoryJSON([]byte(raw)); e != nil {
		return false, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
	}
	var input api.ExecutionMemoryInput
	decoder := json.NewDecoder(bytes.NewReader([]byte(raw)))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil {
		return false, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
	}
	var trailing any
	if decoder.Decode(&trailing) != io.EOF {
		return false, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
	}
	computed, e := api.CanonicalMemoryInputManifestBinding(input)
	if e != nil || computed != binding || input.BindingDigest != binding || input.Mode != "maintenance" || input.JobID != job || input.JobGeneration != generation || input.SettingsRevision != settings || input.Namespace != req.Namespace {
		return false, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
	}
	for _, target := range input.Targets {
		if target.RevisionID != req.Subject.ID {
			continue
		}
		var count int
		e = tx.QueryRowContext(ctx, `SELECT count(*) FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE i.item_id=? AND i.head_revision_id=? AND i.revision=? AND i.state='active' AND i.scope_kind=? AND i.scope_id=? AND n.profile_id=? AND n.principal_id=? AND n.kind=? AND n.subject_id=?`, target.ItemID, target.RevisionID, target.Revision, scope, scopeID, in.ProfileID, id.PrincipalID(), req.Namespace.Kind, req.Namespace.ID).Scan(&count)
		if e != nil {
			return false, e
		}
		return count == 1, nil
	}
	return false, nil
}

// DeriveMaintenanceInTx runs only after the execution owner inserted the real
// independent Run/pin and the Memory owner bound its job in this same Tx.
// The returned Grant set is persisted by that original Run writer.
func (s *Store) DeriveMaintenanceInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput) (api.RunAccessInput, error) {
	var n int
	if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_jobs WHERE run_id=? AND admission='bound'", in.TaskID).Scan(&n); e != nil {
		return in, e
	}
	if n != 1 {
		return in, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	var e error
	in.GrantIDs, e = s.SelectInTx(ctx, tx, id, in, "", []string{"read", "send", "summarize", "memory"})
	if e != nil {
		return in, e
	}
	// The writer saves this exact selection before its final CheckInTx, whose
	// Memory gate re-reads the real target Run. No speculative row is authorized.
	return in, s.checkSourcesInTx(ctx, tx, id, in, []string{"read", "send", "summarize", "memory"}, false, nil)
}

func memoryOriginInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, run string) (api.RunAccessInput, error) {
	if cached, _ := ctx.Value(memoryAuthorizationRows{}).(*memoryRows); cached != nil {
		in, ok := cached.origins[run]
		if !ok {
			return in, fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
		return in, nil
	}
	_, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: run})
	return in, e
}

// Batch only immutable rows from this Tx. Each witness still re-runs current
// membership, policy.Authorize(now), parent and coverage/expiry selection.
func memoryBatchRows(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, facts MemoryFacts) (context.Context, error) {
	rows := &memoryRows{origins: map[string]api.RunAccessInput{}}
	ids := []string{}
	seen := map[string]bool{}
	for _, req := range facts.Requirements {
		for _, w := range req.Witnesses {
			if !seen[w.OriginRunID] {
				seen[w.OriginRunID] = true
				ids = append(ids, w.OriginRunID)
			}
		}
	}
	if len(ids) == 0 {
		return ctx, nil
	}
	for start := 0; start < len(ids); start += 800 {
		end := min(start+800, len(ids))
		batch, e := execution.ReadAccessBatchInTx(ctx, tx, id, profile, ids[start:end])
		if e != nil {
			return ctx, e
		}
		for key, in := range batch {
			rows.origins[key] = in
		}
	}
	inputs := []api.RunAccessInput{}
	seenInputs := map[string]bool{}
	for _, req := range facts.Requirements {
		for _, w := range req.Witnesses {
			in, ok := rows.origins[w.OriginRunID]
			if !ok {
				return ctx, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			in.Sources, in.Scopes, in.GrantIDs, in.Group, in.PublishedMessageID = w.Sources, w.Scopes, w.GrantIDs, w.Group, w.PublishedMessageID
			raw, _ := json.Marshal(in)
			if !seenInputs[string(raw)] {
				seenInputs[string(raw)] = true
				inputs = append(inputs, in)
			}
		}
	}
	var e error
	rows.sources, e = loadReadFacts(ctx, tx, id, profile, inputs)
	if e != nil {
		return ctx, e
	}
	return context.WithValue(ctx, memoryAuthorizationRows{}, rows), nil
}

// Only a real job bound to this independent Run/configuration can carry an
// original task restriction. The source Run is re-read and authorized now;
// this local mapping never changes a Grant or invents a parent edge.
func (s *Store) maintenanceGrantsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string, batch ...*readFacts) (map[string]bool, error) {
	if origin, _ := ctx.Value(maintenanceOriginRead{}).(bool); origin {
		return nil, nil
	}
	if len(batch) > 0 && batch[0] != nil && batch[0].memoryRunSet[in.TaskID] && !batch[0].memoryRuns[in.TaskID] {
		return nil, nil
	}
	var source, profile, principal, kind, subject, config, runConfig, parent, root, session, recipient, admission, commit string
	var generation, settings, currentSettings int64
	var enabled, completion int
	e := tx.QueryRowContext(ctx, `SELECT j.source_run_id,COALESCE(n.profile_id,''),COALESCE(n.principal_id,''),COALESCE(n.kind,''),COALESCE(n.subject_id,''),j.task_config_id,r.task_config_id,r.parent_run_id,r.root_run_id,r.session_id,r.recipient_json,j.admission,j.commit_state,j.generation,j.settings_revision,COALESCE(n.settings_revision,0),COALESCE(n.enabled,-1),EXISTS(SELECT 1 FROM memory_completion_outbox o WHERE o.completion_id=j.completion_id AND o.namespace_id=j.namespace_id AND o.source_run_id=j.source_run_id) FROM memory_jobs j LEFT JOIN memory_namespaces n ON n.namespace_id=j.namespace_id JOIN execution_runs r ON r.run_id=j.run_id WHERE j.run_id=?`, in.TaskID).Scan(&source, &profile, &principal, &kind, &subject, &config, &runConfig, &parent, &root, &session, &recipient, &admission, &commit, &generation, &settings, &currentSettings, &enabled, &completion)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	if completion != 1 || profile == "" || principal == "" || kind == "" || subject == "" || enabled < 0 {
		return nil, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if profile != in.ProfileID || principal != id.PrincipalID() || kind != "agent" || subject != in.Recipient.AgentID || session != in.SessionID {
		return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if source == "" || source == in.TaskID || config == "" || config != runConfig || parent != "" || root != in.TaskID || generation < 1 || settings < 1 || currentSettings < 1 {
		return nil, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	var actual api.GrantRecipient
	if json.Unmarshal([]byte(recipient), &actual) != nil || !reflect.DeepEqual(actual, in.Recipient) {
		return nil, api.Denied("RECIPIENT_CHANGED")
	}
	write := false
	for _, op := range ops {
		if op != "read" {
			write = true
		}
	}
	if write && (enabled == 0) {
		return nil, api.Denied("MEMORY_AUTO_DISABLED")
	}
	if admission != "bound" || write && (commit != "pending" || settings != currentSettings) {
		return nil, api.Denied("MEMORY_JOB_CHANGED")
	}
	var pinned int
	if e := tx.QueryRowContext(ctx, `SELECT count(*) FROM task_config_pins p JOIN task_config_snapshots c ON c.snapshot_id=p.snapshot_id WHERE p.run_id=? AND c.snapshot_id=? AND c.profile_id=? AND c.principal_id=? AND c.subject_id=? AND c.state IN('active','retained')`, in.TaskID, config, profile, principal, subject).Scan(&pinned); e != nil {
		return nil, e
	}
	if write && pinned != 1 {
		return nil, api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	_, origin, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: source})
	if e != nil {
		return nil, e
	}
	if origin.SessionID != in.SessionID || origin.Recipient.AgentID != subject {
		return nil, api.Denied("MEMORY_SCOPE_MISMATCH")
	}
	// Exact stored completion material may be narrowed per returned body, never
	// enlarged to unrelated current Run sources or a differently scoped Grant.
	check := in
	check.ParentScope = &api.AccessScope{Sources: origin.Sources, Scopes: origin.Scopes, GrantIDs: origin.GrantIDs}
	if !contextaccess.InParent(check) {
		return nil, api.Denied("MEMORY_SCOPE_MISMATCH")
	}
	originCtx := context.WithValue(ctx, maintenanceOriginRead{}, true)
	originCtx = context.WithValue(originCtx, memorySourcesOnly{}, true)
	if e = s.checkSourcesInTx(originCtx, tx, id, origin, []string{"read"}, true, nil); e != nil {
		return nil, e
	}
	allowed := map[string]bool{}
	// A user may explicitly grant maintenance operations after the source
	// completed. Its exact source task scope is still the real durable job edge,
	// even when the original model needed a different read/send-only Grant.
	rows, e := tx.QueryContext(ctx, "SELECT grant_id FROM access_grants WHERE profile_id=? AND principal_id=? AND task_id=?", profile, principal, source)
	if e != nil {
		return nil, e
	}
	for rows.Next() {
		var key string
		if e = rows.Scan(&key); e != nil {
			rows.Close()
			return nil, e
		}
		allowed[key] = true
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, e
	}
	for _, key := range origin.GrantIDs {
		g, e := read(ctx, tx, profile, principal, key)
		if e != nil {
			return nil, e
		}
		if g.TaskID == "" {
			continue
		}
		mapped := g.TaskID == source
		if !mapped {
			var n int
			if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM access_delegation_grants WHERE child_run_id=? AND grant_id=?", source, key).Scan(&n); e != nil {
				return nil, e
			}
			mapped = n == 1
		}
		if mapped {
			allowed[key] = true
		}
	}
	return allowed, nil
}

// A returned private result/inbox/public message carries the original namespace
// of its Memory ancestors. It is not a new direct read of that private library.
// The actual subject edge, rather than a namespace relabel, permits this path.
func (s *Store) memorySubjectReadableInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, target api.RunAccessInput, subject MemorySubject) error {
	if subject.Kind == "run" && subject.ID == target.TaskID {
		return nil
	}
	var allowed int
	switch subject.Kind {
	case "context_entry":
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_context_entries WHERE entry_id=? AND run_id=?", subject.ID, target.TaskID).Scan(&allowed); e != nil {
			return e
		}
	case "run":
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM collaboration_delegations d JOIN execution_runs r ON r.run_id=? WHERE d.child_run_id=? AND d.root_run_id=r.root_run_id AND d.principal_id=?", target.TaskID, subject.ID, id.PrincipalID()).Scan(&allowed); e != nil {
			return e
		}
	case "message":
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM collaboration_messages m JOIN execution_runs r ON r.run_id=? WHERE m.message_id=? AND m.principal_id=? AND m.root_run_id=r.root_run_id", target.TaskID, subject.ID, id.PrincipalID()).Scan(&allowed); e != nil {
			return e
		}
		if allowed == 0 {
			var run, role, session string
			e := tx.QueryRowContext(ctx, "SELECT run_id,role,session_id FROM conversation_messages WHERE message_id=?", subject.ID).Scan(&run, &role, &session)
			if !errors.Is(e, sql.ErrNoRows) && e != nil {
				return e
			}
			if e == nil && session == target.SessionID {
				if target.Group != nil {
					visible, e := groupaccess.PublicMessageVisibleInTx(ctx, tx, id, target, subject.ID)
					if e != nil {
						return e
					}
					if visible {
						allowed = 1
					}
				} else {
					var agent string
					if e := tx.QueryRowContext(ctx, "SELECT agent_id FROM execution_runs WHERE run_id=?", run).Scan(&agent); e != nil {
						return e
					}
					if role == "user" || agent == target.Recipient.AgentID {
						allowed = 1
					}
				}
			}
		}
	default:
		return fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if allowed != 1 {
		return api.Denied("MEMORY_SCOPE_MISMATCH")
	}
	return nil
}

func memoryInputSubject(in api.RunAccessInput) MemorySubject {
	if in.PublishedMessageID != "" {
		return MemorySubject{Kind: "message", ID: in.PublishedMessageID}
	}
	return MemorySubject{Kind: "run", ID: in.TaskID}
}

// This hook is reached even for source-free Runs and reads their *current*
// persisted dependencies. No EngineInput.Memory=nil or stale Access can erase
// a body consumed later in the same claim.
func (s *Store) checkInputMemoryInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, ops []string, facts *MemoryFacts) (time.Time, error) {
	until := time.Now().Add(DeliveryLifetime)
	if bypass, _ := ctx.Value(memorySourcesOnly{}).(bool); bypass {
		return until, nil
	}
	subject := memoryInputSubject(in)
	if !memorySubjectValid(subject) {
		return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if facts == nil {
		loaded, e := s.readMemoryFactsInTx(ctx, tx, id, in.ProfileID, []MemorySubject{subject})
		if e != nil {
			return time.Time{}, e
		}
		facts = &loaded
	}
	target := in.TaskID
	readOnly := true
	for _, op := range ops {
		if op != "read" {
			readOnly = false
		}
	}
	if readOnly {
		target = ""
	}
	for _, req := range facts.Requirements {
		if req.Subject != subject {
			continue
		}
		deadline, e := s.checkMemoryRequirementInTx(ctx, tx, id, in.ProfileID, target, req, ops)
		if e != nil {
			return time.Time{}, e
		}
		if deadline.Before(until) {
			until = deadline
		}
	}
	return until, nil
}

func (s *Store) readMemoryFactsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, subjects []MemorySubject) (MemoryFacts, error) {
	if s.memory != nil {
		facts, e := s.memory.ReadFactsInTx(ctx, tx, id, profile, subjects)
		if e != nil {
			return MemoryFacts{}, e
		}
		requested := map[MemorySubject]bool{}
		for _, subject := range subjects {
			if !memorySubjectValid(subject) {
				return MemoryFacts{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			requested[subject] = true
		}
		for _, req := range facts.Requirements {
			if !requested[req.Subject] || !api.ValidMemoryNamespace(req.Namespace) || !api.ValidMemoryScope(req.Scope) || len(req.RevisionIDs) > 128 || len(req.Witnesses) > 128 {
				return MemoryFacts{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
		}
		seen := map[MemorySubject]bool{}
		for _, dependency := range facts.Dependencies {
			if !requested[dependency.Subject] || seen[dependency.Subject] {
				return MemoryFacts{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			seen[dependency.Subject] = true
			if _, e := mergeMemoryDerived(nil, dependency.Derived); e != nil {
				return MemoryFacts{}, e
			}
		}
		return facts, nil
	}
	// A Store used without the Memory reader may retain the old source-only
	// behavior only when the real dependency tables prove there is no Memory
	// body to protect. A missing table or malformed lineage is never swallowed.
	for _, subject := range subjects {
		if subject.Kind != "run" && subject.Kind != "message" {
			return MemoryFacts{}, api.Denied("ACCESS_NOT_ASSEMBLED")
		}
		var n int
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_dependencies WHERE owner_kind=? AND owner_id=? AND relation!='audit'", subject.Kind, subject.ID).Scan(&n); e != nil {
			return MemoryFacts{}, e
		}
		if n > 0 {
			return MemoryFacts{}, api.Denied("ACCESS_NOT_ASSEMBLED")
		}
		if subject.Kind == "run" {
			var raw string
			e := tx.QueryRowContext(ctx, "SELECT derived_json FROM execution_runs WHERE run_id=?", subject.ID).Scan(&raw)
			if errors.Is(e, sql.ErrNoRows) {
				continue
			}
			if e != nil {
				return MemoryFacts{}, e
			}
			var refs []api.DerivedInput
			if json.Unmarshal([]byte(raw), &refs) != nil || refs == nil {
				return MemoryFacts{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
			}
			// Derived messages may themselves have a Memory ancestor. The reader
			// is required for a nonempty closure; do not guess from its first kind.
			for _, ref := range refs {
				if ref.Kind == "memory_revision" {
					return MemoryFacts{}, api.Denied("ACCESS_NOT_ASSEMBLED")
				}
				var n int
				if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_dependencies WHERE owner_kind=? AND owner_id=? AND relation!='audit'", ref.Kind, ref.ID).Scan(&n); e != nil {
					return MemoryFacts{}, e
				}
				if n > 0 {
					return MemoryFacts{}, api.Denied("ACCESS_NOT_ASSEMBLED")
				}
			}
		}
	}
	return MemoryFacts{Requirements: []MemoryRequirement{}}, nil
}
