// Memory contracts are entrance-neutral. No service is assembled by these DTOs.
package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"unicode/utf8"
)

// Proposed in application/api/memory.go; context from stdlib.
type MemoryNamespace struct {
	Kind string `json:"kind"` // agent | temporary | global
	ID   string `json:"id"`   // actual agentID | actual temporary subjectID | ProfileID
}
type MemoryScope struct {
	Kind string `json:"kind"`         // profile | session | work_thread
	ID   string `json:"id,omitempty"` // absent for profile, required otherwise
}
type MemorySettings struct {
	Namespace MemoryNamespace `json:"namespace"`
	Revision  string          `json:"revision"` // settings CAS, not catalog CAS
	Enabled   bool            `json:"enabled"`  // default true for agent namespace
	Eligible  bool            `json:"eligible"` // current ability to admit new maintenance, no reservation
	Reason    string          `json:"reason,omitempty"`
}
type MemoryBody struct {
	Text           string           `json:"text"`
	Hash           string           `json:"hash"`
	Provenance     string           `json:"provenance"`  // observation | inference | user
	CreatorKind    string           `json:"creatorKind"` // user | agent | temporary
	CreatorAgentID string           `json:"creatorAgentId,omitempty"`
	JobID          string           `json:"jobId,omitempty"`
	SourceRefs     []SourceSnapshot `json:"sourceRefs"`
	SourceScopes   []SourceScope    `json:"sourceScopes"`
	Derived        []DerivedInput   `json:"derived"`
}
type MemoryItem struct {
	ID         string          `json:"id"`
	Revision   string          `json:"revision"`             // mutable item/head CAS
	RevisionID string          `json:"revisionId,omitempty"` // independent immutable revision object
	Namespace  MemoryNamespace `json:"namespace"`
	Scope      MemoryScope     `json:"scope"`
	State      string          `json:"state"` // active | forgotten
	Pinned     bool            `json:"pinned"`
	Body       *MemoryBody     `json:"body,omitempty"`
}
type MemoryCandidate struct {
	ID             string          `json:"id"`
	Revision       string          `json:"revision"`
	Namespace      MemoryNamespace `json:"namespace"`
	Scope          MemoryScope     `json:"scope"`
	JobID          string          `json:"jobId"`
	State          string          `json:"state"`     // pending | applied | superseded | blocked
	Operation      string          `json:"operation"` // create | correct
	TargetItemID   string          `json:"targetItemId,omitempty"`
	TargetRevision string          `json:"targetRevision,omitempty"`
	Reason         string          `json:"reason,omitempty"` // e.g. MEMORY_PINNED_CONFLICT
	Body           *MemoryBody     `json:"body,omitempty"`
}
type MemoryJobRun struct {
	ID     string    `json:"id"`
	Status string    `json:"status"` // projected actual Run, never stored job execution state
	Reason string    `json:"reason,omitempty"`
	Usage  *RunUsage `json:"usage,omitempty"`
}
type MemoryJob struct {
	ID          string          `json:"id"`
	Revision    string          `json:"revision"`
	Namespace   MemoryNamespace `json:"namespace"`
	SourceRunID string          `json:"sourceRunId"`
	Admission   string          `json:"admission"` // pending | bound | blocked
	Commit      string          `json:"commit"`    // pending | committed | candidate | discarded
	Reason      string          `json:"reason,omitempty"`
	Run         *MemoryJobRun   `json:"run,omitempty"`
}
type MemoryProposal struct { // T15 only, fixed preview; not recallable
	ID             string      `json:"id"`
	Revision       string      `json:"revision"`
	Operation      string      `json:"operation"` // create | update | delete
	TargetItemID   string      `json:"targetItemId,omitempty"`
	TargetRevision string      `json:"targetRevision,omitempty"`
	Scope          MemoryScope `json:"scope"`
	Body           *MemoryBody `json:"body,omitempty"`
	PreviewHash    string      `json:"previewHash"`
	ExpiresAt      string      `json:"expiresAt"`
	State          string      `json:"state"` // pending | accepted | rejected | expired | conflicted
}
type MemoryObject struct {
	Context   *ExecutionContextView `json:"context,omitempty"`
	Kind      string                `json:"kind"` // item | candidate | job | settings | proposal
	Item      *MemoryItem           `json:"item,omitempty"`
	Candidate *MemoryCandidate      `json:"candidate,omitempty"`
	Job       *MemoryJob            `json:"job,omitempty"`
	Settings  *MemorySettings       `json:"settings,omitempty"`
	Proposal  *MemoryProposal       `json:"proposal,omitempty"`
}
type MemoryQuery struct {
	ProfileID string          `json:"profileId"`
	Namespace MemoryNamespace `json:"namespace"`
	Kind      string          `json:"kind"` // item | candidate | job | proposal; default item
	Scope     *MemoryScope    `json:"scope,omitempty"`
	Query     string          `json:"query,omitempty"`
	Limit     int             `json:"limit,omitempty"`
	Cursor    string          `json:"cursor,omitempty"`
}
type MemoryGet struct {
	Cursor    string          `json:"cursor,omitempty"`
	Limit     int             `json:"limit,omitempty"`
	ProfileID string          `json:"profileId"`
	Namespace MemoryNamespace `json:"namespace"`
	Kind      string          `json:"kind"`
	ID        string          `json:"id,omitempty"` // absent only for settings
}
type MemoryPage struct {
	NamespaceRevision string            `json:"namespaceRevision"` // catalog CAS for private add
	Settings          *MemorySettings   `json:"settings,omitempty"`
	Items             []MemoryObject    `json:"items"`
	NextCursor        string            `json:"nextCursor,omitempty"`
	DeliverySubjects  []DeliverySubject `json:"-"`
}
type MemoryPin struct {
	CommandMeta
	Namespace MemoryNamespace `json:"namespace"`
	ID        string          `json:"id"`
	Pinned    bool            `json:"pinned"`
}
type MemoryCorrect struct {
	CommandMeta
	Namespace         MemoryNamespace `json:"namespace"`
	Action            string          `json:"action"` // add | correct | apply_candidate
	ID                string          `json:"id,omitempty"`
	Scope             *MemoryScope    `json:"scope,omitempty"`
	Text              string          `json:"text,omitempty"`
	CandidateID       string          `json:"candidateId,omitempty"`
	CandidateRevision string          `json:"candidateRevision,omitempty"`
}
type MemoryForget struct {
	CommandMeta
	Namespace MemoryNamespace `json:"namespace"`
	ID        string          `json:"id"`
}
type MemorySetAuto struct {
	CommandMeta
	Namespace MemoryNamespace `json:"namespace"`
	Enabled   bool            `json:"enabled"`
}
type MemoryReferenceSelection struct {
	Kind     string `json:"kind"` // message | task_result | memory_revision
	ID       string `json:"id"`
	Revision string `json:"revision"`
}
type MemoryGlobalProposal struct {
	CommandMeta
	Operation    string                     `json:"operation"` // create | update | delete
	TargetItemID string                     `json:"targetItemId,omitempty"`
	Scope        MemoryScope                `json:"scope"`
	Text         string                     `json:"text,omitempty"`
	Sources      []MemoryReferenceSelection `json:"sources"`
}
type MemoryResolve struct {
	CommandMeta
	ID          string `json:"id"`
	Decision    string `json:"decision"` // approve | reject
	PreviewHash string `json:"previewHash"`
}
type MemoryAPI interface { // T14 six real methods
	List(context.Context, RequestIdentity, MemoryQuery) (MemoryPage, error)
	Get(context.Context, RequestIdentity, MemoryGet) (MemoryObject, error)
	Pin(context.Context, RequestIdentity, MemoryPin) (MemoryItem, error)
	Correct(context.Context, RequestIdentity, MemoryCorrect) (MemoryItem, error)
	Forget(context.Context, RequestIdentity, MemoryForget) (MemoryItem, error)
	SetAutoMaintenance(context.Context, RequestIdentity, MemorySetAuto) (MemorySettings, error)
}
type GlobalMemoryAPI interface { // T15 two methods, nil/unimplemented during T14
	ProposeGlobal(context.Context, RequestIdentity, MemoryGlobalProposal) (MemoryProposal, error)
	ResolveGlobal(context.Context, RequestIdentity, MemoryResolve) (Receipt, error)
}

type MemoryInputEntry struct {
	Ref  DerivedInput // DB stable message/task_result/memory_revision identity+hash; immutable revision object uses Revision="1"
	Role string       // user | assistant | memory; DB classification
	Text string
}
type MemoryTarget struct {
	ItemID, Revision, RevisionID string
	Pinned                       bool
}
type ExecutionMemoryInput struct {
	Version                                string // "1"
	Mode                                   string // recall | maintenance
	Namespace                              MemoryNamespace
	JobID, JobGeneration, SettingsRevision string // maintenance only
	Entries                                []MemoryInputEntry
	Targets                                []MemoryTarget // maintenance only; exact current target heads
	BindingDigest                          string
}
type MemoryCandidateDraft struct {
	Operation    string // create | correct
	TargetItemID string // only a server-supplied Targets entry for correct
	Text         string
	Provenance   string // observation | inference; never user/global/pinned
}
type MemoryCandidateSet struct{ Items []MemoryCandidateDraft }

// Validation is independent of JSON Schema: all text limits below are UTF-8
// bytes, including aggregate provenance and encoded response budgets.
const MemoryTextBytes = 65536
const MemoryPageBytes = 262144
const MemoryObjectBytes = 245760

func memoryOpaque(s string) bool {
	return len(s) > 0 && len(s) <= 512 && utf8.ValidString(s) && strings.TrimSpace(s) != ""
}
func memoryDecimal(s string) bool {
	if len(s) == 0 || s[0] < '1' || s[0] > '9' || len(s) > 19 || len(s) == 19 && s > "9223372036854775807" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
func memoryHash(s string) bool {
	if len(s) != 71 || !strings.HasPrefix(s, "sha256:") {
		return false
	}
	b, e := hex.DecodeString(s[7:])
	return e == nil && len(b) == 32 && strings.ToLower(s) == s
}
func memoryText(s string, max int, required bool) bool {
	return utf8.ValidString(s) && len(s) <= max && (!required || strings.TrimSpace(s) != "")
}
func ValidMemoryNamespace(n MemoryNamespace) bool {
	return (n.Kind == "agent" || n.Kind == "temporary" || n.Kind == "global") && memoryOpaque(n.ID)
}
func ValidMemoryScope(s MemoryScope) bool {
	return s.Kind == "profile" && s.ID == "" || (s.Kind == "session" || s.Kind == "work_thread") && memoryOpaque(s.ID)
}
func validMemoryRef(r DerivedInput) bool {
	return (r.Kind == "message" || r.Kind == "task_result" || r.Kind == "memory_revision") && memoryOpaque(r.ID) && memoryDecimal(r.Revision) && memoryHash(r.Hash) && memoryOpaque(r.Namespace) && memoryOpaque(r.WorkThreadID)
}
func validMemoryCommand(c CommandMeta) bool {
	return memoryOpaque(c.ProfileID) && memoryText(c.CommandID, 128, true) && memoryText(c.IdempotencyKey, 128, true) && memoryDecimal(c.CommandEpoch) && memoryDecimal(c.ExpectedRevision)
}
func memoryQueryKind(k string) bool {
	return k == "item" || k == "candidate" || k == "job" || k == "proposal" || k == "context"
}
func memoryReadOnly(n MemoryNamespace) error {
	if n.Kind == "global" {
		return Denied("GLOBAL_CONFIRMATION_REQUIRED")
	}
	return nil
}

func ValidateMemoryRequest(method string, value any) error {
	bad := Invalid("INVALID_MEMORY_PARAMS")
	switch q := value.(type) {
	case MemoryQuery:
		if method != "memory.list" || !memoryOpaque(q.ProfileID) || !ValidMemoryNamespace(q.Namespace) || q.Namespace.Kind == "global" && q.Namespace.ID != q.ProfileID || !memoryQueryKind(q.Kind) || q.Limit < 0 || q.Limit > 50 || !memoryText(q.Cursor, 2048, false) || !memoryText(q.Query, 1024, false) || q.Scope != nil && !ValidMemoryScope(*q.Scope) {
			return bad
		}
		if q.Kind == "context" && (q.Namespace.Kind == "global" || q.Scope == nil || q.Scope.Kind == "profile" || q.Query != "") {
			return bad
		}
	case MemoryGet:
		if method != "memory.get" || !memoryOpaque(q.ProfileID) || !ValidMemoryNamespace(q.Namespace) || q.Namespace.Kind == "global" && q.Namespace.ID != q.ProfileID || (!memoryQueryKind(q.Kind) && q.Kind != "settings") || q.Kind != "settings" && !memoryOpaque(q.ID) || q.Kind == "settings" && q.ID != "" {
			return bad
		}
		if q.Kind == "context" {
			if q.Namespace.Kind == "global" || q.Limit < 0 || q.Limit > 50 || !memoryText(q.Cursor, 2048, false) {
				return bad
			}
		} else if q.Cursor != "" || q.Limit != 0 {
			return bad
		}
	case MemoryPin:
		if method != "memory.pin" || !validMemoryCommand(q.CommandMeta) || !ValidMemoryNamespace(q.Namespace) || !memoryOpaque(q.ID) {
			return bad
		}
		return memoryReadOnly(q.Namespace)
	case MemoryForget:
		if method != "memory.forget" || !validMemoryCommand(q.CommandMeta) || !ValidMemoryNamespace(q.Namespace) || !memoryOpaque(q.ID) {
			return bad
		}
		return memoryReadOnly(q.Namespace)
	case MemoryCorrect:
		if method != "memory.correct" || !validMemoryCommand(q.CommandMeta) || !ValidMemoryNamespace(q.Namespace) {
			return bad
		}
		if e := memoryReadOnly(q.Namespace); e != nil {
			return e
		}
		switch q.Action {
		case "add":
			if q.ID != "" || q.CandidateID != "" || q.CandidateRevision != "" || q.Scope == nil || !ValidMemoryScope(*q.Scope) || !memoryText(q.Text, MemoryTextBytes, true) {
				return bad
			}
		case "correct":
			if !memoryOpaque(q.ID) || q.CandidateID != "" || q.CandidateRevision != "" || q.Scope != nil || !memoryText(q.Text, MemoryTextBytes, true) {
				return bad
			}
		case "apply_candidate":
			if !memoryOpaque(q.ID) || !memoryOpaque(q.CandidateID) || !memoryDecimal(q.CandidateRevision) || q.Text != "" || q.Scope != nil {
				return bad
			}
		default:
			return bad
		}
	case MemorySetAuto:
		if method != "memory.setAutoMaintenance" || !validMemoryCommand(q.CommandMeta) || q.Namespace.Kind != "agent" || !ValidMemoryNamespace(q.Namespace) {
			return bad
		}
	case MemoryGlobalProposal:
		if method != "memory.proposeGlobal" || !validMemoryCommand(q.CommandMeta) || !ValidMemoryScope(q.Scope) || q.Sources == nil || len(q.Sources) > 128 {
			return bad
		}
		if q.Operation == "create" {
			if q.TargetItemID != "" {
				return bad
			}
		} else if q.Operation == "update" || q.Operation == "delete" {
			if !memoryOpaque(q.TargetItemID) {
				return bad
			}
		} else {
			return bad
		}
		if q.Operation == "delete" {
			if q.Text != "" {
				return bad
			}
		} else if !memoryText(q.Text, MemoryTextBytes, true) {
			return bad
		}
		for _, v := range q.Sources {
			if (v.Kind != "message" && v.Kind != "task_result" && v.Kind != "memory_revision") || !memoryOpaque(v.ID) || !memoryDecimal(v.Revision) {
				return bad
			}
		}
	case MemoryResolve:
		if method != "memory.resolveGlobal" || !validMemoryCommand(q.CommandMeta) || !memoryOpaque(q.ID) || !memoryHash(q.PreviewHash) || (q.Decision != "approve" && q.Decision != "reject") {
			return bad
		}
	default:
		return bad
	}
	b, e := json.Marshal(value)
	if e != nil || len(b) > MemoryObjectBytes {
		return bad
	}
	return nil
}

func validateMemoryBody(b *MemoryBody) bool {
	if b == nil || !memoryText(b.Text, MemoryTextBytes, true) || b.Hash != contextHash(b.Text) || (b.Provenance != "observation" && b.Provenance != "inference" && b.Provenance != "user") || (b.CreatorKind != "user" && b.CreatorKind != "agent" && b.CreatorKind != "temporary") || b.CreatorKind != "user" && !memoryOpaque(b.CreatorAgentID) || !validMemoryOptionalID(b.CreatorAgentID) || !validMemoryOptionalID(b.JobID) || b.CreatorKind == "user" && b.Provenance != "user" || b.Provenance == "user" && b.CreatorKind != "user" || b.SourceRefs == nil || b.SourceScopes == nil || b.Derived == nil || len(b.SourceRefs)+len(b.SourceScopes) > 32 || len(b.Derived) > 128 || !validMemorySources(b.SourceRefs, b.SourceScopes) {
		return false
	}
	for _, d := range b.Derived {
		if !validMemoryRef(d) {
			return false
		}
	}
	return true
}
func validateMemoryItem(v MemoryItem) bool {
	if !memoryOpaque(v.ID) || !memoryDecimal(v.Revision) || !ValidMemoryNamespace(v.Namespace) || !ValidMemoryScope(v.Scope) {
		return false
	}
	if v.State == "forgotten" {
		return v.Body == nil && v.RevisionID == ""
	}
	return v.State == "active" && memoryOpaque(v.RevisionID) && validateMemoryBody(v.Body)
}
func validateMemorySettings(v MemorySettings) bool {
	return ValidMemoryNamespace(v.Namespace) && v.Namespace.Kind == "agent" && memoryDecimal(v.Revision) && utf8.ValidString(v.Reason) && (v.Eligible || memoryText(v.Reason, 512, true))
}
func validMemoryProposal(v MemoryProposal) bool {
	if !memoryOpaque(v.ID) || !memoryDecimal(v.Revision) || !ValidMemoryScope(v.Scope) || !memoryHash(v.PreviewHash) || !validMemoryExpiry(v.ExpiresAt) {
		return false
	}
	switch v.Operation {
	case "create":
		if v.TargetItemID != "" || v.TargetRevision != "" {
			return false
		}
	case "update", "delete":
		if !memoryOpaque(v.TargetItemID) || !memoryDecimal(v.TargetRevision) {
			return false
		}
	default:
		return false
	}
	switch v.State {
	case "pending":
		if v.Operation == "delete" && v.Body == nil {
			return true // owner may preview only target metadata after source revocation
		}
		if !validateMemoryBody(v.Body) || v.Body.JobID != "" || v.Body.CreatorKind == "user" && v.Body.CreatorAgentID != "" || v.Body.CreatorKind != "user" && len(v.Body.Derived) == 0 {
			return false
		}
	case "accepted", "rejected", "expired", "conflicted":
		if v.Body != nil {
			return false
		}
	default:
		return false
	}
	return true
}
func validMemoryResolveReceipt(v Receipt) bool {
	return memoryText(v.CommandID, 128, true) && memoryOpaque(v.ReceiptID) && memoryDecimal(v.Revision)
}
func validateMemoryObject(o MemoryObject) bool {
	n := 0
	for _, v := range []bool{o.Item != nil, o.Candidate != nil, o.Job != nil, o.Settings != nil, o.Proposal != nil, o.Context != nil} {
		if v {
			n++
		}
	}
	if n != 1 {
		return false
	}
	switch o.Kind {
	case "item":
		return o.Item != nil && validateMemoryItem(*o.Item)
	case "settings":
		return o.Settings != nil && validateMemorySettings(*o.Settings)
	case "context":
		return o.Context != nil && ValidateExecutionContextView(*o.Context) == nil
	case "candidate":
		v := o.Candidate
		if v == nil || !memoryOpaque(v.ID) || !memoryDecimal(v.Revision) || !ValidMemoryNamespace(v.Namespace) || !ValidMemoryScope(v.Scope) || !memoryOpaque(v.JobID) || !utf8.ValidString(v.Reason) || !validMemoryOptionalID(v.TargetItemID) || (v.State != "pending" && v.State != "applied" && v.State != "superseded" && v.State != "blocked") || (v.Operation != "create" && v.Operation != "correct") {
			return false
		}
		if v.Operation == "correct" && (!memoryOpaque(v.TargetItemID) || !memoryDecimal(v.TargetRevision)) {
			return false
		}
		if v.Operation == "create" && (v.TargetItemID != "" || v.TargetRevision != "") {
			return false
		}
		if v.State == "pending" || v.State == "applied" {
			return validateMemoryBody(v.Body)
		}
		return v.Body == nil
	case "job":
		v := o.Job
		return v != nil && memoryOpaque(v.ID) && memoryDecimal(v.Revision) && ValidMemoryNamespace(v.Namespace) && memoryOpaque(v.SourceRunID) && utf8.ValidString(v.Reason) && (v.Admission == "pending" || v.Admission == "bound" || v.Admission == "blocked") && (v.Commit == "pending" || v.Commit == "committed" || v.Commit == "candidate" || v.Commit == "discarded") && (v.Run == nil || memoryOpaque(v.Run.ID) && utf8.ValidString(v.Run.Status) && utf8.ValidString(v.Run.Reason) && validMemoryRunUsage(v.Run.Usage)) && (v.Admission != "bound" || v.Run != nil)
	case "proposal":
		return o.Proposal != nil && validMemoryProposal(*o.Proposal)
	}
	return false
}

// ValidateMemoryResult checks typed application output before any body reaches HAP.
func ValidateMemoryResult(method string, value any) error {
	valid := false
	max := MemoryObjectBytes
	switch v := value.(type) {
	case MemoryPage:
		max = MemoryPageBytes
		valid = method == "memory.list" && memoryDecimal(v.NamespaceRevision) && v.Items != nil && len(v.Items) <= 50 && memoryText(v.NextCursor, 2048, false) && (v.Settings == nil || validateMemorySettings(*v.Settings))
		proposalPage := len(v.Items) > 0 && v.Items[0].Kind == "proposal"
		if proposalPage && v.Settings != nil {
			valid = false
		}
		for _, o := range v.Items {
			b, _ := json.Marshal(o)
			valid = valid && len(b) <= MemoryObjectBytes && validateMemoryObject(o) && (o.Context == nil || len(o.Context.Entries) == 0) && (!proposalPage || o.Kind == "proposal") && (proposalPage || o.Kind != "proposal")
		}
	case MemoryObject:
		valid = method == "memory.get" && validateMemoryObject(v)
		if v.Kind == "context" {
			max = MemoryPageBytes
		}
	case MemoryItem:
		valid = (method == "memory.pin" || method == "memory.correct" || method == "memory.forget") && validateMemoryItem(v)
		if method == "memory.forget" {
			valid = valid && v.State == "forgotten"
		}
	case MemorySettings:
		valid = method == "memory.setAutoMaintenance" && validateMemorySettings(v)
	case MemoryProposal:
		valid = method == "memory.proposeGlobal" && v.State == "pending" && validMemoryProposal(v)
	case Receipt:
		valid = method == "memory.resolveGlobal" && validMemoryResolveReceipt(v)
	}
	b, e := json.Marshal(value)
	if !valid || e != nil || len(b) > max {
		return Invalid("INVALID_MEMORY_RESULT")
	}
	return nil
}

// CanonicalMemoryInputBinding checks only supplied pure values. Current database
// ownership, revision/head, permissions and suppression remain the Store's duty.
func CanonicalMemoryInputBinding(v ExecutionMemoryInput) (string, error) {
	return canonicalMemoryInputBinding(v, false)
}

// CanonicalMemoryInputManifestBinding validates metadata with every entry Text
// empty and computes the same binding as the complete input. It does not verify
// original bodies or grant access. Callers must compare the persisted binding,
// check current facts, hydrate bodies, then use CanonicalMemoryInputBinding.
func CanonicalMemoryInputManifestBinding(v ExecutionMemoryInput) (string, error) {
	return canonicalMemoryInputBinding(v, true)
}

func canonicalMemoryInputBinding(v ExecutionMemoryInput, manifest bool) (string, error) {
	if v.Version != "1" || !ValidMemoryNamespace(v.Namespace) || (v.Mode != "recall" && v.Mode != "maintenance") || len(v.Entries) > 20 && v.Mode == "recall" || len(v.Entries) > 128 || len(v.Targets) > 32 {
		return "", Invalid("MEMORY_INPUT_INVALID")
	}
	if v.Mode == "maintenance" {
		if v.Namespace.Kind != "agent" || !memoryOpaque(v.JobID) || !memoryDecimal(v.JobGeneration) || !memoryDecimal(v.SettingsRevision) {
			return "", Invalid("MEMORY_INPUT_INVALID")
		}
	} else if v.JobID != "" || v.JobGeneration != "" || v.SettingsRevision != "" || len(v.Targets) > 0 {
		return "", Invalid("MEMORY_INPUT_INVALID")
	}
	type refRole struct {
		Ref  DerivedInput
		Role string
	}
	entries := make([]refRole, 0, len(v.Entries))
	seen := map[string]bool{}
	total := 0
	for _, e := range v.Entries {
		key := e.Ref.Kind + "\x00" + e.Ref.ID
		if !validMemoryRef(e.Ref) || (e.Role != "user" && e.Role != "assistant" && e.Role != "memory") || seen[key] {
			return "", Invalid("MEMORY_INPUT_INVALID")
		}
		if manifest {
			if e.Text != "" {
				return "", Invalid("MEMORY_INPUT_INVALID")
			}
		} else if e.Ref.Hash != contextHash(e.Text) || !utf8.ValidString(e.Text) {
			return "", Invalid("MEMORY_INPUT_INVALID")
		}
		seen[key] = true
		total += len(e.Text)
		entries = append(entries, refRole{e.Ref, e.Role})
	}
	if total > 131072 {
		return "", Invalid("MEMORY_INPUT_INVALID")
	}
	targets := append([]MemoryTarget{}, v.Targets...)
	sort.Slice(targets, func(i, j int) bool { return targets[i].ItemID < targets[j].ItemID })
	for i, t := range targets {
		if !memoryOpaque(t.ItemID) || !memoryDecimal(t.Revision) || !memoryOpaque(t.RevisionID) || i > 0 && targets[i-1].ItemID == t.ItemID {
			return "", Invalid("MEMORY_INPUT_INVALID")
		}
	}
	b, _ := json.Marshal(struct {
		Version, Mode                          string
		Namespace                              MemoryNamespace
		JobID, JobGeneration, SettingsRevision string
		Entries                                []refRole
		Targets                                []MemoryTarget
	}{v.Version, v.Mode, v.Namespace, v.JobID, v.JobGeneration, v.SettingsRevision, entries, targets})
	return contextHash(string(b)), nil
}

// ValidateMemoryJSON rejects non-scalar escaped Unicode before encoding/json can
// replace a lone surrogate. It does not replace the strict versioned schema.
func ValidateMemoryJSON(raw []byte) error {
	// The transport frame is bounded; semantic budgets use decoded Go JSON below.
	if !utf8.Valid(raw) || len(raw) > 1<<20 {
		return Invalid("INVALID_MEMORY_PARAMS")
	}
	quoted := false
	for i := 0; i < len(raw); i++ {
		if raw[i] == '"' {
			quoted = !quoted
			continue
		}
		if !quoted || raw[i] != '\\' {
			continue
		}
		i++
		if i >= len(raw) {
			return Invalid("INVALID_MEMORY_PARAMS")
		}
		if raw[i] != 'u' {
			continue
		}
		if i+4 >= len(raw) {
			return Invalid("INVALID_MEMORY_PARAMS")
		}
		b, e := hex.DecodeString(string(raw[i+1 : i+5]))
		if e != nil {
			return Invalid("INVALID_MEMORY_PARAMS")
		}
		n := int(b[0])<<8 | int(b[1])
		i += 4
		if n >= 0xDC00 && n <= 0xDFFF {
			return Invalid("INVALID_MEMORY_PARAMS")
		}
		if n >= 0xD800 && n <= 0xDBFF {
			if i+6 >= len(raw) || raw[i+1] != '\\' || raw[i+2] != 'u' {
				return Invalid("INVALID_MEMORY_PARAMS")
			}
			b, e = hex.DecodeString(string(raw[i+3 : i+7]))
			if e != nil {
				return Invalid("INVALID_MEMORY_PARAMS")
			}
			n = int(b[0])<<8 | int(b[1])
			if n < 0xDC00 || n > 0xDFFF {
				return Invalid("INVALID_MEMORY_PARAMS")
			}
			i += 6
		}
	}
	return nil
}
