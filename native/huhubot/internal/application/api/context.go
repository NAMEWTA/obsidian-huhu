// Short-term manifests contain HUHU values, not SDK state or database handles.
package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"unicode/utf8"
)

type ContextNamespace struct {
	SubjectKind, SubjectID, SessionID, WorkThreadID string
}
type ContextTextSpan struct {
	Start int `json:"start"`
	End   int `json:"end"`
} // 原正文UTF8字节，半开区间
// Message仅为inbox的固定原元数据，Text必须空；正文只在Text/Intent里出现。
type ShortTermEntry struct {
	ID             string        // seal时服务器分配的不可复用entryID
	OriginKind     string        // conversation_message | thread_message
	Ref            DerivedInput  // 原完整正文hash/稳定body revision，不是摘录hash
	Use            string        // inbox | recent | working_summary
	Role           string        // user | assistant | data
	Representation string        // full | excerpt | intent_alias
	Message        *AgentMessage // inbox required，others nil
	Partial        bool
	Spans          []ContextTextSpan
	Text, TextHash string // 实际片段/拼接结果及sha256(Text)
}
type ContextUsage struct {
	PolicyVersion     string `json:"policyVersion"`
	Selected          int    `json:"selected"`
	Excerpted         int    `json:"excerpted"`
	OmittedAuthorized int    `json:"omittedAuthorized"`
	WindowLimited     bool   `json:"windowLimited"`
}
type ShortTermInput struct {
	Version       string // "1" / policy extractive-v1
	Namespace     ContextNamespace
	IntentHash    string           // sha256(accepted execution_runs.intent)
	Entries       []ShortTermEntry // 最终真实模型顺序
	Usage         ContextUsage
	BindingDigest string
}

// Proposed additions to api/memory.go, not new method family.
type ExecutionContextEntryView struct {
	ID              string            `json:"id"`             // actual context-entry ID
	Kind            string            `json:"kind"`           // intent | inbox | recent | working_summary | memory_recall | attachment
	Representation  string            `json:"representation"` // full | excerpt | intent_alias | metadata
	State           string            `json:"state"`          // readable | redacted
	Text            *string           `json:"text,omitempty"` // absent iff redacted or attachment metadata
	Source          *DerivedInput     `json:"source,omitempty"`
	SourceRefs      []SourceSnapshot  `json:"sourceRefs,omitempty"` // only currently readable labels
	Revision        string            `json:"revision"`             // immutable entry/body revision, not tree CAS
	Reason          string            `json:"reason,omitempty"`
	ContentHash     string            `json:"contentHash,omitempty"` // 整条实际rendered Text的hash
	SourceSpans     []ContextTextSpan `json:"sourceSpans,omitempty"`
	DisplaySlice    *ContextTextSpan  `json:"displaySlice,omitempty"` // rendered Text的UTF8偏移
	PartIndex       int               `json:"partIndex,omitempty"`
	PartCount       int               `json:"partCount,omitempty"`
	CreatorKind     string            `json:"creatorKind,omitempty"`     // user | agent | temporary
	PreparationKind string            `json:"preparationKind,omitempty"` // explicit | selected | automatic_extractive | memory_recall
	Provenance      string            `json:"provenance,omitempty"`      // memory原observation/inference/user，不改写
	Scope           MemoryScope       `json:"scope"`
	Partial         bool              `json:"partial,omitempty"`
}
type ExecutionContextView struct {
	RunID            string                      `json:"runId"`
	RunRevision      string                      `json:"runRevision"`
	ManifestRevision string                      `json:"manifestRevision,omitempty"` // "1" when sealed
	State            string                      `json:"state"`                      // pending | sealed | redacted | legacy_untracked
	Reason           string                      `json:"reason,omitempty"`
	Namespace        MemoryNamespace             `json:"namespace"`
	Scope            MemoryScope                 `json:"scope"`
	Usage            *ContextUsage               `json:"usage,omitempty"`
	Entries          []ExecutionContextEntryView `json:"entries"`
	NextCursor       string                      `json:"nextCursor,omitempty"`
}

const ShortTermMarker = "HUHU short-term context v1\n"
const ShortTermOmission = "[… omitted …]"

func contextHash(text string) string {
	h := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(h[:])
}
func validContextNamespace(n ContextNamespace) bool {
	return (n.SubjectKind == "agent" || n.SubjectKind == "temporary") && memoryOpaque(n.SubjectID) && memoryOpaque(n.SessionID) && memoryOpaque(n.WorkThreadID)
}

// CanonicalShortTermBinding validates only supplied values. An excerpt's
// source/hash/UTF8 offsets must additionally be checked by the database reader
// with ValidateShortTermOriginal; this helper never claims to read that source.
func CanonicalShortTermBinding(v ShortTermInput) (string, error) {
	bad := Invalid("CONTEXT_INPUT_STATE_INVALID")
	if v.Version != "1" || !validContextNamespace(v.Namespace) || !memoryHash(v.IntentHash) || v.Entries == nil || len(v.Entries) > 128 || v.Usage.PolicyVersion != "extractive-v1" || v.Usage.Selected != len(v.Entries) || v.Usage.Excerpted < 0 || v.Usage.OmittedAuthorized < 0 || v.Usage.OmittedAuthorized > 60 {
		return "", bad
	}
	entries := append([]ShortTermEntry{}, v.Entries...)
	seen := map[string]bool{}
	ids := map[string]bool{}
	recent, working, inbox, excerpted, rb, wb, ib := 0, 0, 0, 0, 0, 0, 0
	for i, e := range entries {
		key := e.OriginKind + "\x00" + e.Ref.ID + "\x00" + e.Ref.Revision
		if !memoryOpaque(e.ID) || ids[e.ID] || seen[key] || !validMemoryRef(e.Ref) || e.Ref.Kind != "message" || (e.OriginKind != "conversation_message" && e.OriginKind != "thread_message") || (e.Role != "user" && e.Role != "assistant" && e.Role != "data") || !utf8.ValidString(e.Text) || e.TextHash != contextHash(e.Text) || e.Spans == nil {
			return "", bad
		}
		seen[key] = true
		ids[e.ID] = true
		if e.Use == "inbox" {
			inbox++
			ib += len(e.Text)
			if e.Message == nil || e.Message.Text != "" || e.Message.ID != e.Ref.ID || e.Message.WorkThreadID != e.Ref.WorkThreadID {
				return "", bad
			}
		} else if e.Use == "recent" {
			recent++
			rb += len(e.Text)
			if len(e.Text) > 8192 || e.Message != nil || e.Representation != "full" {
				return "", bad
			}
		} else if e.Use == "working_summary" {
			working++
			if e.Message != nil {
				return "", bad
			}
		} else {
			return "", bad
		}
		switch e.Representation {
		case "full":
			if len(e.Spans) != 1 || e.Spans[0].Start != 0 || e.Spans[0].End != len(e.Text) || e.Ref.Hash != e.TextHash || e.Use == "working_summary" && len(e.Text) > 1024 {
				return "", bad
			}
		case "excerpt":
			excerpted++
			if e.Use != "working_summary" || len(e.Spans) != 2 || e.Spans[0].Start != 0 || len(e.Text) > 1024+len(ShortTermOmission) {
				return "", bad
			}
			sum := 0
			for j, s := range e.Spans {
				if s.Start < 0 || s.End <= s.Start || s.End-s.Start > 512 || s.End > 131072 || j > 0 && e.Spans[j-1].End >= s.Start {
					return "", bad
				}
				sum += s.End - s.Start
			}
			if len(e.Spans) == 2 {
				sum += len(ShortTermOmission)
			}
			if sum != len(e.Text) {
				return "", bad
			}
		case "intent_alias":
			if e.Use != "inbox" || e.Text != "" || len(e.Spans) != 0 || e.Ref.Hash != v.IntentHash {
				return "", bad
			}
		default:
			return "", bad
		}
		if e.Use == "working_summary" {
			// Source bytes exclude the display omission marker; rendered bytes
			// remain independently bounded by RenderShortTermInput.
			for _, span := range e.Spans {
				wb += span.End - span.Start
			}
		}
		entries[i].Text = "" // only actual TextHash goes into the binding, not a duplicate body
	}
	if recent > 8 || working > 32 || inbox > 100 || rb > 65536 || wb > 32768 || ib > 262144 || v.Usage.Excerpted != excerpted {
		return "", bad
	}
	value := struct {
		Version    string
		Namespace  ContextNamespace
		IntentHash string
		Entries    []ShortTermEntry
		Usage      ContextUsage
	}{v.Version, v.Namespace, v.IntentHash, entries, v.Usage}
	b, e := json.Marshal(value)
	if e != nil || len(b) > 262144 {
		return "", bad
	}
	return contextHash(string(b)), nil
}

// ValidateShortTermOriginal is the explicit pure second half. Only the actual
// source reader can supply original and acceptedIntent from trusted storage.
func ValidateShortTermOriginal(e ShortTermEntry, original, acceptedIntent string) error {
	bad := Invalid("CONTEXT_INPUT_STATE_INVALID")
	if !utf8.ValidString(original) || len(original) > 131072 || contextHash(original) != e.Ref.Hash {
		return bad
	}
	if e.Representation == "intent_alias" {
		if original != acceptedIntent || e.Text != "" || len(e.Spans) != 0 {
			return bad
		}
		return nil
	}
	if e.Representation != "full" && e.Representation != "excerpt" {
		return bad
	}
	if e.Representation == "full" && e.Use == "working_summary" && len(original) > 1024 {
		return bad
	}
	if e.Representation == "excerpt" {
		// Actual source length and UTF8 boundaries are not known to the
		// structural binding helper: the real reader must verify them here.
		if e.Use != "working_summary" || len(original) <= 1024 || len(e.Text) >= len(original) || len(e.Spans) != 2 || e.Spans[0].Start != 0 || e.Spans[1].End != len(original) {
			return bad
		}
		for _, span := range e.Spans {
			if span.End-span.Start > 512 {
				return bad
			}
		}
	}
	parts := []string{}
	for i, s := range e.Spans {
		if s.Start < 0 || s.End <= s.Start || s.End > len(original) || i > 0 && e.Spans[i-1].End >= s.Start || !utf8.ValidString(original[:s.Start]) || !utf8.ValidString(original[:s.End]) {
			return bad
		}
		parts = append(parts, original[s.Start:s.End])
	}
	actual := strings.Join(parts, ShortTermOmission)
	if actual != e.Text || e.TextHash != contextHash(actual) || e.Representation == "full" && actual != original {
		return bad
	}
	return nil
}
func RenderShortTermInput(v ShortTermInput) (string, error) {
	digest, e := CanonicalShortTermBinding(v)
	if e != nil {
		return "", e
	}
	if v.BindingDigest != "" && v.BindingDigest != digest {
		return "", Invalid("CONTEXT_INPUT_STATE_INVALID")
	}
	v.BindingDigest = digest
	b, e := json.Marshal(v)
	if e != nil || len(b)+len(ShortTermMarker) > 393216 {
		return "", Invalid("CONTEXT_INPUT_LIMIT")
	}
	return ShortTermMarker + string(b), nil
}
func ValidateExecutionContextView(v ExecutionContextView) error {
	bad := Invalid("CONTEXT_INPUT_STATE_INVALID")
	if !memoryOpaque(v.RunID) || !memoryDecimal(v.RunRevision) || !ValidMemoryNamespace(v.Namespace) || v.Namespace.Kind == "global" || !ValidMemoryScope(v.Scope) || v.Scope.Kind == "profile" || v.Entries == nil || len(v.Entries) > 50 || !memoryText(v.NextCursor, 2048, false) || !utf8.ValidString(v.Reason) || v.Usage != nil && (!utf8.ValidString(v.Usage.PolicyVersion) || v.Usage.Selected < 0 || v.Usage.Excerpted < 0 || v.Usage.OmittedAuthorized < 0) {
		return bad
	}
	if v.State == "pending" || v.State == "legacy_untracked" {
		if v.ManifestRevision != "" || len(v.Entries) > 0 || v.Reason == "" {
			return bad
		}
		return nil
	}
	if (v.State != "sealed" && v.State != "redacted") || v.ManifestRevision != "1" {
		return bad
	}
	for _, e := range v.Entries {
		if !memoryOpaque(e.ID) || !memoryDecimal(e.Revision) || !ValidMemoryScope(e.Scope) || !utf8.ValidString(e.Reason) || !utf8.ValidString(e.ContentHash) || !utf8.ValidString(e.CreatorKind) || !utf8.ValidString(e.PreparationKind) || !utf8.ValidString(e.Provenance) || !validMemorySources(e.SourceRefs, nil) || (e.Kind != "intent" && e.Kind != "inbox" && e.Kind != "recent" && e.Kind != "working_summary" && e.Kind != "memory_recall" && e.Kind != "attachment") || (e.Representation != "full" && e.Representation != "excerpt" && e.Representation != "intent_alias" && e.Representation != "metadata") {
			return bad
		}
		if e.State == "redacted" {
			if e.Reason == "" {
				return bad
			}
			if e.Text != nil || e.Source != nil || len(e.SourceRefs) > 0 || e.ContentHash != "" || len(e.SourceSpans) > 0 || e.DisplaySlice != nil || e.PartIndex != 0 || e.PartCount != 0 {
				return bad
			}
			continue
		}
		if e.State != "readable" || (e.CreatorKind != "user" && e.CreatorKind != "agent" && e.CreatorKind != "temporary") || (e.PreparationKind != "explicit" && e.PreparationKind != "selected" && e.PreparationKind != "automatic_extractive" && e.PreparationKind != "memory_recall") {
			return bad
		}
		if e.Source != nil && !validMemoryRef(*e.Source) {
			return bad
		}
		if e.Kind == "attachment" {
			if e.Text != nil || e.Representation != "metadata" {
				return bad
			}
			continue
		}
		if e.Text == nil || !memoryText(*e.Text, 4096, false) || !memoryHash(e.ContentHash) || e.PartCount < 1 || e.PartIndex < 0 || e.PartIndex >= e.PartCount || e.DisplaySlice == nil || e.DisplaySlice.Start < 0 || e.DisplaySlice.End-e.DisplaySlice.Start != len(*e.Text) {
			return bad
		}
	}
	return nil
}
