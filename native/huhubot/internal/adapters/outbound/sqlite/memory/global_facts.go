package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"
	"sort"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// GlobalActor records the identity proven when a proposal was created. Claim
// tokens and live pins are deliberately absent: completing a Run must not make
// its pending proposal impossible for the owner to confirm.
type GlobalActor struct {
	Kind            string `json:"kind"`
	SubjectID       string `json:"subjectId,omitempty"`
	RunID           string `json:"runId,omitempty"`
	ToolCallID      string `json:"toolCallId,omitempty"`
	ConfigID        string `json:"configId,omitempty"`
	ConfigDigest    string `json:"configDigest,omitempty"`
	PersonaRevision string `json:"personaRevision,omitempty"`
	ModelRevision   string `json:"modelRevision,omitempty"`
}

type GlobalTarget struct {
	ItemID     string `json:"itemId"`
	Revision   string `json:"revision"`
	RevisionID string `json:"revisionId"`
	Hash       string `json:"hash"`
}

// FrozenGlobal is adapter-only persistent preview input, never a Grant or an
// approval capability. The proposal adapter owns its ID, expiry and state. It
// must bind all these fields into its preview hash and call Check/Apply in the
// same transaction as the actual owner decision and receipt.
type FrozenGlobal struct {
	Version         string              `json:"version"`
	ProfileID       string              `json:"profileId"`
	PrincipalID     string              `json:"principalId"`
	NamespaceID     string              `json:"namespaceId"`
	Operation       string              `json:"operation"`
	Scope           api.MemoryScope     `json:"scope"`
	CatalogRevision string              `json:"catalogRevision,omitempty"`
	Target          *GlobalTarget       `json:"target,omitempty"`
	Actor           GlobalActor         `json:"actor"` // owner | tool
	Body            *api.MemoryBody     `json:"body,omitempty"`
	Derived         []api.DerivedInput  `json:"derived"`
	SourceAccess    *api.RunAccessInput `json:"sourceAccess,omitempty"`
	SourceDigest    string              `json:"sourceDigest"`
	InputDigest     string              `json:"inputDigest"`
}

type GlobalFactTx interface {
	WithGlobalTx(context.Context, bool, func(context.Context, *sql.Tx) error) error
	PrepareOwnerGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, api.MemoryGlobalProposal) (FrozenGlobal, error)
	PrepareToolGlobalInTx(context.Context, *sql.Tx, api.ToolExecution, string, api.GlobalMemoryToolDraft) (FrozenGlobal, error)
	ApplyApprovedGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, FrozenGlobal) (api.MemoryItem, error)
	CheckGlobalPreviewInTx(context.Context, *sql.Tx, api.RequestIdentity, FrozenGlobal) (time.Time, error)
}

// ProposalReader is installed by the proposal adapter. It borrows this Store's
// existing read transaction and owns the proposal cursor/watermark, not 014's
// item catalog. It must recheck current preview qualification before any body.
type ProposalReader interface {
	GetProposalInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string) (api.MemoryProposal, error)
	ListProposalsInTx(context.Context, *sql.Tx, api.RequestIdentity, api.MemoryQuery) (api.MemoryPage, error)
}

func (s *Store) SetGlobalProposalReader(reader ProposalReader) {
	s.mu.Lock()
	s.globalProposals = reader
	s.mu.Unlock()
}

func (s *Store) globalProposalReader() ProposalReader {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.globalProposals
}

func (s *Store) WithGlobalTx(ctx context.Context, mutate bool, fn func(context.Context, *sql.Tx) error) error {
	return s.transaction(ctx, mutate, fn)
}

func globalNamespace(ctx context.Context, tx *sql.Tx, s *Store, id api.RequestIdentity, profile string) (namespace, error) {
	return s.readNamespace(ctx, tx, id, profile, api.MemoryNamespace{Kind: "global", ID: profile})
}

func globalInputDigest(v FrozenGlobal) string {
	v.InputDigest = ""
	b, _ := json.Marshal(v)
	return digest(string(b))
}

func globalSourceDigest(v []api.DerivedInput, a *api.RunAccessInput) string {
	copyRefs := append([]api.DerivedInput{}, v...)
	sort.Slice(copyRefs, func(i, j int) bool {
		return copyRefs[i].Kind+"\x00"+copyRefs[i].ID < copyRefs[j].Kind+"\x00"+copyRefs[j].ID
	})
	b, _ := json.Marshal(struct {
		Refs   []api.DerivedInput  `json:"refs"`
		Access *api.RunAccessInput `json:"access,omitempty"`
	}{copyRefs, a})
	return digest(string(b))
}

func appendSourceBody(body *api.MemoryBody, source sourceRecord) {
	for _, v := range source.Sources {
		if !containsSource(body.SourceRefs, v) {
			body.SourceRefs = append(body.SourceRefs, v)
		}
	}
	for _, v := range source.Scopes {
		if !containsScope(body.SourceScopes, v) {
			body.SourceScopes = append(body.SourceScopes, v)
		}
	}
}
func containsSource(all []api.SourceSnapshot, v api.SourceSnapshot) bool {
	for _, old := range all {
		if reflect.DeepEqual(old, v) {
			return true
		}
	}
	return false
}
func containsScope(all []api.SourceScope, v api.SourceScope) bool {
	for _, old := range all {
		if reflect.DeepEqual(old, v) {
			return true
		}
	}
	return false
}

func sourceSelectionRef(v api.MemoryReferenceSelection, actual sourceRecord) (api.DerivedInput, error) {
	if v.Revision == "" || v.Revision != actual.Ref.Revision {
		return api.DerivedInput{}, fault("CONFLICT", "SOURCE_CHANGED")
	}
	ref := actual.Ref
	if !validRef(ref) {
		return api.DerivedInput{}, invalidState()
	}
	return ref, nil
}

// resolveGlobalSelection converts the public source selector into the actual
// immutable identity before reading a body. A selector cannot supply a hash,
// namespace, grant or actor and therefore cannot wash an omitted source.
func (s *Store) resolveGlobalSelection(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, targetRun string, selection api.MemoryReferenceSelection, active *runContext) (api.DerivedInput, sourceRecord, error) {
	var empty sourceRecord
	switch selection.Kind {
	case "message", "task_result":
		meta, err := sourceMetadata(ctx, tx, id, profile, []api.DerivedInput{{Kind: selection.Kind, ID: selection.ID}})
		if err != nil {
			return api.DerivedInput{}, empty, err
		}
		source, ok := meta[ownerKey{selection.Kind, selection.ID}]
		if !ok {
			return api.DerivedInput{}, empty, api.Denied("SOURCE_CHANGED")
		}
		ref, err := sourceSelectionRef(selection, source)
		if err != nil {
			return api.DerivedInput{}, empty, err
		}
		if active != nil {
			if _, err = s.sourceAccess(ctx, tx, id, *active, source, []string{"read", "send"}); err != nil {
				return api.DerivedInput{}, empty, err
			}
		} else {
			if err = s.checkOriginSource(ctx, tx, id, profile, source); err != nil {
				return api.DerivedInput{}, empty, err
			}
		}
		source.Ref = ref
		return ref, source, nil
	case "memory_revision":
		facts, err := factMetadata(ctx, tx, id, profile, "memory_revision", []string{selection.ID})
		if err != nil {
			return api.DerivedInput{}, empty, err
		}
		m, ok := facts[selection.ID]
		if !ok || m.State != "active" || m.Head != selection.ID {
			return api.DerivedInput{}, empty, api.Denied("SOURCE_CHANGED")
		}
		thread := m.Scope.ID
		if thread == "" {
			thread = profile
		}
		ref := api.DerivedInput{Kind: "memory_revision", ID: selection.ID, Revision: "1", Hash: m.Hash, Namespace: m.Namespace.ID, WorkThreadID: thread}
		ops := []string{"read"}
		if targetRun != "" {
			ops = []string{"read", "send"}
		}
		if err = s.qualify(ctx, tx, id, profile, targetRun, grants.MemorySubject{Kind: "memory_revision", ID: selection.ID}, ops); err != nil {
			return api.DerivedInput{}, empty, err
		}
		if active != nil {
			// The facts/Grant check above is the root qualification. The Run's
			// own read/send closure is then checked by the caller's full plan.
		}
		return ref, sourceRecord{Ref: ref, Sources: []api.SourceSnapshot{}, Scopes: []api.SourceScope{}}, nil
	default:
		return api.DerivedInput{}, empty, api.Invalid("INVALID_MEMORY_PARAMS")
	}
}

func (s *Store) checkOriginSource(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, source sourceRecord) error {
	if source.OriginRunID == "" {
		return invalidState()
	}
	_, access, err := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: source.OriginRunID})
	if err != nil {
		return err
	}
	access.Sources, access.Scopes, access.GrantIDs, access.Group, access.PublishedMessageID = source.Sources, source.Scopes, source.Grants, source.Group, source.Published
	if err = s.access.CheckInTx(ctx, tx, id, access, []string{"read"}); err != nil {
		return err
	}
	_, err = s.access.ReadDeadlineInTx(ctx, tx, id, access)
	return err
}

func (s *Store) buildGlobalBody(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, text, creator string, refs []api.DerivedInput, records []sourceRecord) (api.MemoryBody, error) {
	body := api.MemoryBody{Text: text, Hash: digest(text), Provenance: "user", CreatorKind: "user", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}, Derived: refs}
	if creator != "user" {
		body.Provenance, body.CreatorKind = "observation", creator
	}
	for _, source := range records {
		appendSourceBody(&body, source)
	}
	if len(body.SourceRefs)+len(body.SourceScopes) > 32 || len(body.Derived) > 128 {
		return body, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	if api.ValidateMemoryResult("memory.correct", api.MemoryItem{ID: "global-preview", Revision: "1", RevisionID: "memory-revision:preview", Namespace: api.MemoryNamespace{Kind: "global", ID: profile}, Scope: api.MemoryScope{Kind: "profile"}, State: "active", Body: &body}) != nil {
		return body, invalidState()
	}
	return body, nil
}

func targetGlobal(ctx context.Context, tx *sql.Tx, s *Store, id api.RequestIdentity, n namespace, operation, itemID, expected string, targetRun string) (GlobalTarget, api.MemoryItem, error) {
	var target GlobalTarget
	var old api.MemoryItem
	if itemID == "" || operation == "create" {
		if operation == "create" && expected != decimal(n.Catalog) {
			return target, old, fault("CONFLICT", "REVISION_CONFLICT")
		}
		return target, old, nil
	}
	var err error
	old, err = itemMetadata(ctx, tx, n, itemID)
	if err != nil {
		return target, old, err
	}
	if old.State != "active" || old.Revision != expected || old.Scope.Kind == "" {
		return target, old, fault("CONFLICT", "REVISION_CONFLICT")
	}
	if err = s.scope(ctx, tx, n, old.Scope); err != nil {
		return target, old, err
	}
	if targetRun != "" {
		if err = s.qualify(ctx, tx, id, n.Profile, targetRun, grants.MemorySubject{Kind: "memory_revision", ID: old.RevisionID}, []string{"read", "send"}); err != nil {
			return target, old, err
		}
	}
	body, bodyErr := revisionBody(ctx, tx, old.RevisionID)
	if bodyErr == nil && body != nil {
		target.Hash = body.Hash
	}
	if target.Hash == "" {
		var hash string
		if err = tx.QueryRowContext(ctx, "SELECT content_hash FROM memory_revisions WHERE revision_id=?", old.RevisionID).Scan(&hash); err != nil {
			return target, old, err
		}
		target.Hash = hash
	}
	target = GlobalTarget{ItemID: old.ID, Revision: old.Revision, RevisionID: old.RevisionID, Hash: target.Hash}
	if operation == "delete" && bodyErr != nil { // body-free owner deletion is only metadata/CAS based.
		if targetRun != "" {
			return target, old, bodyErr
		}
	}
	return target, old, nil
}

func (s *Store) prepareGlobalSources(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, targetRun string, selections []api.MemoryReferenceSelection, active *runContext) ([]api.DerivedInput, []sourceRecord, error) {
	refs, records := []api.DerivedInput{}, []sourceRecord{}
	seen := map[ownerKey]bool{}
	for _, selection := range selections {
		ref, source, err := s.resolveGlobalSelection(ctx, tx, id, profile, targetRun, selection, active)
		if err != nil {
			return nil, nil, err
		}
		if seen[refKey(ref)] {
			return nil, nil, invalidState()
		}
		seen[refKey(ref)] = true
		refs = append(refs, ref)
		records = append(records, source)
	}
	merged, err := mergeRefs(nil, refs)
	return merged, records, err
}

func (s *Store) prepareToolSources(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, active api.ToolExecution) ([]api.DerivedInput, []sourceRecord, error) {
	refs, err := s.actualDerived(ctx, tx, id, r.Namespace.Profile, r.Run.ID)
	if err != nil {
		return nil, nil, err
	}
	records := []sourceRecord{}
	for _, ref := range refs {
		selection := api.MemoryReferenceSelection{Kind: ref.Kind, ID: ref.ID, Revision: ref.Revision}
		actual, source, e := s.resolveGlobalSelection(ctx, tx, id, r.Namespace.Profile, r.Run.ID, selection, &r)
		if e != nil {
			return nil, nil, e
		}
		if actual != ref {
			return nil, nil, fault("CONFLICT", "MEMORY_INPUT_STATE_INVALID")
		}
		records = append(records, source)
	}
	return refs, records, nil
}

func (s *Store) actorForTool(e api.ToolExecution) GlobalActor {
	kind := "tool"
	configDigest := digest(encode(e.Config.Agent))
	return GlobalActor{Kind: kind, SubjectID: e.Config.SubjectID, RunID: e.Run.ID, ConfigID: e.Config.ID, ConfigDigest: configDigest, PersonaRevision: e.Config.Agent.PersonaRevision, ModelRevision: e.Config.Agent.ModelBindingRevision}
}

func (s *Store) validateToolGate(ctx context.Context, tx *sql.Tx, e api.ToolExecution) (runContext, error) {
	r, err := s.activeContext(ctx, tx, e)
	if err != nil {
		return r, err
	}
	found := false
	for _, tool := range e.Config.Agent.AllowedTools {
		if tool == "memory.proposeGlobal" {
			found = true
			break
		}
	}
	if !found {
		return r, api.Denied("OPERATION_NOT_GRANTED")
	}
	var pin, task, agent, status string
	var persona, model int64
	err = tx.QueryRowContext(ctx, "SELECT COALESCE(pin_token,''),COALESCE(task_config_id,''),agent_id,status,persona_revision,model_revision FROM execution_runs WHERE run_id=?", e.Run.ID).Scan(&pin, &task, &agent, &status, &persona, &model)
	if err != nil {
		return r, err
	}
	if status != "preparing" && status != "running" || agent != e.Agent.ID || e.Config.ID == "" || e.Config.ID != task && e.Config.ID != pin {
		return r, api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	return r, nil
}

func (s *Store) PrepareOwnerGlobalInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.MemoryGlobalProposal) (FrozenGlobal, error) {
	var out FrozenGlobal
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	if err := api.ValidateMemoryRequest("memory.proposeGlobal", q); err != nil {
		return out, err
	}
	n, err := globalNamespace(ctx, tx, s, id, q.ProfileID)
	if err != nil {
		return out, err
	}
	if err = s.scope(ctx, tx, n, q.Scope); err != nil {
		return out, err
	}
	if err = materialize(ctx, tx, &n); err != nil {
		return out, err
	}
	refs, records, err := s.prepareGlobalSources(ctx, tx, id, q.ProfileID, "", q.Sources, nil)
	if err != nil {
		return out, err
	}
	if q.Operation == "delete" && len(q.Sources) == 0 {
		refs = []api.DerivedInput{}
	}
	target, old, err := targetGlobal(ctx, tx, s, id, n, q.Operation, q.TargetItemID, q.ExpectedRevision, "")
	if err != nil {
		return out, err
	}
	var body *api.MemoryBody
	if q.Operation != "delete" {
		value, e := s.buildGlobalBody(ctx, tx, id, q.ProfileID, q.Text, "user", refs, records)
		if e != nil {
			return out, e
		}
		if q.Operation == "update" {
			if old.Body == nil {
				old.Body, e = revisionBody(ctx, tx, old.RevisionID)
				if e != nil {
					return out, e
				}
			}
			value, e = mergeBodies(value, *old.Body)
			if e != nil {
				return out, e
			}
		}
		body = &value
	}
	out = FrozenGlobal{Version: "global-facts-v1", ProfileID: q.ProfileID, PrincipalID: id.PrincipalID(), NamespaceID: n.ID, Operation: q.Operation, Scope: q.Scope, CatalogRevision: decimal(n.Catalog), Target: nil, Actor: GlobalActor{Kind: "owner"}, Body: body, Derived: refs}
	if q.Operation != "create" {
		out.Target = &target
	}
	out.SourceDigest = globalSourceDigest(refs, nil)
	out.InputDigest = globalInputDigest(out)
	return out, nil
}

func (s *Store) PrepareToolGlobalInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution, callID string, d api.GlobalMemoryToolDraft) (FrozenGlobal, error) {
	var out FrozenGlobal
	if err := api.ValidateGlobalMemoryToolCall(api.ToolCall{ID: callID, Name: "memory.proposeGlobal", GlobalMemory: &d}); err != nil {
		return out, err
	}
	r, err := s.validateToolGate(ctx, tx, e)
	if err != nil {
		return out, err
	}
	refs, records, err := s.prepareToolSources(ctx, tx, e.Identity, r, e)
	if err != nil || len(refs) == 0 {
		if err == nil {
			err = api.Denied("SOURCE_NOT_GRANTED")
		}
		return out, err
	}
	n, err := globalNamespace(ctx, tx, s, e.Identity, r.Namespace.Profile)
	if err != nil {
		return out, err
	}
	if err = s.scope(ctx, tx, n, d.Scope); err != nil {
		return out, err
	}
	if err = materialize(ctx, tx, &n); err != nil {
		return out, err
	}
	target, old, err := targetGlobal(ctx, tx, s, e.Identity, n, d.Operation, d.TargetItemID, d.ExpectedRevision, e.Run.ID)
	if err != nil {
		return out, err
	}
	var body *api.MemoryBody
	if d.Operation != "delete" {
		creator := "agent"
		if e.Config.Kind == "temporary" {
			creator = "temporary"
		}
		value, e2 := s.buildGlobalBody(ctx, tx, e.Identity, r.Namespace.Profile, d.Text, creator, refs, records)
		if e2 != nil {
			return out, e2
		}
		value.CreatorAgentID = e.Config.Agent.ID
		// Run lineage is frozen in Actor; pending API previews keep the body
		// free of maintenance Job identity.
		value.JobID = ""
		if d.Operation == "update" {
			if old.Body == nil {
				old.Body, e2 = revisionBody(ctx, tx, old.RevisionID)
				if e2 != nil {
					return out, e2
				}
			}
			value, e2 = mergeBodies(value, *old.Body)
			if e2 != nil {
				return out, e2
			}
		}
		body = &value
	}
	out = FrozenGlobal{Version: "global-facts-v1", ProfileID: r.Namespace.Profile, PrincipalID: e.Identity.PrincipalID(), NamespaceID: n.ID, Operation: d.Operation, Scope: d.Scope, CatalogRevision: decimal(n.Catalog), Actor: s.actorForTool(e), Body: body, Derived: refs}
	if d.Operation != "create" {
		out.Target = &target
	}
	out.SourceAccess = &e.Access
	out.SourceDigest = globalSourceDigest(refs, out.SourceAccess)
	out.InputDigest = globalInputDigest(out)
	return out, nil
}

func (s *Store) checkFrozenSources(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, f FrozenGlobal, deleteBodyFree bool) (time.Time, error) {
	if deleteBodyFree && len(f.Derived) == 0 {
		return time.Now().Add(250 * time.Millisecond), nil
	}
	refs := append([]api.DerivedInput{}, f.Derived...)
	if f.Operation == "update" && f.Body != nil {
		var err error
		refs, err = mergeRefs(refs, f.Body.Derived)
		if err != nil {
			return time.Time{}, err
		}
	}
	until := time.Now().Add(250 * time.Millisecond)
	for _, ref := range refs {
		if ref.Kind == "memory_revision" {
			if err := s.qualify(ctx, tx, id, f.ProfileID, "", grants.MemorySubject{Kind: "memory_revision", ID: ref.ID}, []string{"read"}); err != nil {
				return time.Time{}, err
			}
			continue
		}
		meta, err := sourceMetadata(ctx, tx, id, f.ProfileID, []api.DerivedInput{ref})
		if err != nil {
			return time.Time{}, err
		}
		source, ok := meta[refKey(ref)]
		if !ok || !sourceMatches(ref, source) {
			return time.Time{}, api.Denied("SOURCE_CHANGED")
		}
		if err = s.checkOriginSource(ctx, tx, id, f.ProfileID, source); err != nil {
			return time.Time{}, err
		}
		_, access, err := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: f.ProfileID, ID: source.OriginRunID})
		if err == nil {
			access.Sources, access.Scopes, access.GrantIDs, access.Group, access.PublishedMessageID = source.Sources, source.Scopes, source.Grants, source.Group, source.Published
			deadline, e := s.access.ReadDeadlineInTx(ctx, tx, id, access)
			if e != nil {
				return time.Time{}, e
			}
			if deadline.Before(until) {
				until = deadline
			}
		}
	}
	return until, nil
}

func (s *Store) checkFrozenTarget(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, f FrozenGlobal) (namespace, api.MemoryItem, error) {
	n, err := globalNamespace(ctx, tx, s, id, f.ProfileID)
	if err != nil {
		return n, api.MemoryItem{}, err
	}
	if f.NamespaceID != "" && n.ID != f.NamespaceID {
		return n, api.MemoryItem{}, fault("CONFLICT", "MEMORY_CHANGED")
	}
	if err = s.scope(ctx, tx, n, f.Scope); err != nil {
		return n, api.MemoryItem{}, err
	}
	if f.Operation == "create" {
		if n.Catalog != parseDecimal(f.CatalogRevision) {
			return n, api.MemoryItem{}, fault("CONFLICT", "REVISION_CONFLICT")
		}
		return n, api.MemoryItem{}, nil
	}
	if f.Target == nil {
		return n, api.MemoryItem{}, invalidState()
	}
	item, err := itemMetadata(ctx, tx, n, f.Target.ItemID)
	if err != nil {
		return n, item, err
	}
	if item.State != "active" || item.Revision != f.Target.Revision || item.RevisionID != f.Target.RevisionID || item.Scope != f.Scope {
		return n, item, fault("CONFLICT", "REVISION_CONFLICT")
	}
	var hash string
	if err = tx.QueryRowContext(ctx, "SELECT content_hash FROM memory_revisions WHERE revision_id=?", item.RevisionID).Scan(&hash); err != nil {
		return n, item, err
	}
	if hash != f.Target.Hash {
		return n, item, fault("CONFLICT", "SOURCE_CHANGED")
	}
	return n, item, nil
}

func parseDecimal(raw string) int64 {
	var n int64
	for _, c := range raw {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + int64(c-'0')
	}
	return n
}

func (s *Store) CheckGlobalPreviewInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, f FrozenGlobal) (time.Time, error) {
	if !id.Valid() || f.Version != "global-facts-v1" || f.InputDigest == "" || f.InputDigest != globalInputDigest(f) || f.SourceDigest != globalSourceDigest(f.Derived, f.SourceAccess) {
		return time.Time{}, fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	if f.Actor.Kind == "owner" && f.PrincipalID != id.PrincipalID() {
		return time.Time{}, api.Denied("IDENTITY_REQUIRED")
	}
	if f.Actor.Kind != "owner" {
		var principal, agent, task, pin, status string
		var persona, model int64
		err := tx.QueryRowContext(ctx, "SELECT s.principal_id,r.agent_id,COALESCE(r.task_config_id,''),COALESCE(r.pin_token,''),r.status,r.persona_revision,r.model_revision FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=? AND s.profile_id=?", f.Actor.RunID, f.ProfileID).Scan(&principal, &agent, &task, &pin, &status, &persona, &model)
		if err != nil {
			return time.Time{}, err
		}
		if task != "" {
			var raw string
			if task != f.Actor.ConfigID {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
			err = tx.QueryRowContext(ctx, "SELECT config_json FROM task_config_snapshots WHERE snapshot_id=? AND profile_id=? AND principal_id=? AND subject_id=?", task, f.ProfileID, f.PrincipalID, f.Actor.SubjectID).Scan(&raw)
			if err != nil {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
			var snapshot api.TaskConfigSnapshot
			if json.Unmarshal([]byte(raw), &snapshot) != nil || snapshot.ID != task || digest(encode(snapshot.Agent)) != f.Actor.ConfigDigest {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
		} else if pin != "" {
			if pin != f.Actor.ConfigID {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
			// A live normal-agent pin has no task_config JSON. The assistant
			// adapter owns its snapshot decoder; use it only while the pin is
			// present. Once released, historical Run revisions remain sufficient.
			type pinnedConfigReader interface {
				ReadPinInTx(context.Context, *sql.Tx, string) (api.ConfigSnapshot, error)
			}
			reader, ok := s.config.(pinnedConfigReader)
			if !ok {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
			snapshot, e := reader.ReadPinInTx(ctx, tx, pin)
			if e != nil || digest(encode(snapshot.Agent)) != f.Actor.ConfigDigest {
				return time.Time{}, api.Denied("RECIPIENT_CHANGED")
			}
		}
		configMismatch := task != "" && task != f.Actor.ConfigID
		if pin != "" && pin != f.Actor.ConfigID && task == "" {
			configMismatch = true
		}
		// Normal completion releases the live pin; in that case the durable
		// actor revisions remain the confirmation identity and no pin is needed.
		if principal != f.PrincipalID || agent != f.Actor.SubjectID || configMismatch || decimal(persona) != f.Actor.PersonaRevision || decimal(model) != f.Actor.ModelRevision {
			return time.Time{}, api.Denied("RECIPIENT_CHANGED")
		}
	}
	if f.SourceAccess != nil {
		// Tool previews retain the exact consumed Run closure. Re-check it in
		// this transaction before any source/body qualification; a released
		// claim may be absent, but revoked recipient/Grant/source coverage must
		// invalidate the frozen preview.
		if err := s.access.CheckInTx(ctx, tx, id, *f.SourceAccess, []string{"read", "send"}); err != nil {
			return time.Time{}, err
		}
	}
	_, _, err := s.checkFrozenTarget(ctx, tx, id, f)
	if err != nil {
		return time.Time{}, err
	}
	return s.checkFrozenSources(ctx, tx, id, f, f.Operation == "delete" && f.Body == nil)
}

func (s *Store) ApplyApprovedGlobalInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, f FrozenGlobal) (api.MemoryItem, error) {
	var out api.MemoryItem
	if err := s.admissionOpen(ctx); err != nil {
		return out, err
	}
	if f.Actor.Kind == "owner" && f.PrincipalID != id.PrincipalID() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	n, old, err := s.checkFrozenTarget(ctx, tx, id, f)
	if err != nil {
		return out, err
	}
	if _, err = s.CheckGlobalPreviewInTx(ctx, tx, id, f); err != nil {
		return out, err
	}
	switch f.Operation {
	case "create":
		if f.Body == nil {
			return out, invalidState()
		}
		out, err = newItem(ctx, tx, n, f.Scope, *f.Body)
	case "update":
		if f.Body == nil {
			return out, invalidState()
		}
		out, err = replaceItem(ctx, tx, n, old, *f.Body)
	case "delete":
		// Metadata-only delete still protects the actual old closure. Reading
		// its bytes is internal SQL state, never a user-facing qualification.
		old.Body, err = revisionBody(ctx, tx, old.RevisionID)
		if err == nil {
			err = protect(ctx, tx, n, old, "deny_automatic", f.InputDigest)
		}
		if err == nil {
			err = changed(tx.ExecContext(ctx, "UPDATE memory_items SET state='forgotten',revision=revision+1 WHERE item_id=? AND revision=? AND state='active'", old.ID, old.Revision))
		}
		if err == nil {
			_, err = tx.ExecContext(ctx, "DELETE FROM memory_index WHERE item_id=?", old.ID)
		}
		if err == nil {
			err = bump(ctx, tx, n.ID, true)
		}
		if err == nil {
			out, err = itemMetadata(ctx, tx, n, old.ID)
		}
	default:
		return out, api.Invalid("INVALID_MEMORY_PARAMS")
	}
	return out, err
}
