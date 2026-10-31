// Package context selects deterministic excerpts from already qualified,
// bounded original records. It performs no model, Host or database operation.
package context

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Candidate struct {
	Entry    api.ShortTermEntry
	Original string
}

func hash(text string) string {
	h := sha256.Sum256([]byte(text))
	return "sha256:" + hex.EncodeToString(h[:])
}
func limit() error { return &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "CONTEXT_INPUT_LIMIT"} }

// Select receives mandatory inbox in original order, and history newest first.
// IDs remain empty until the same-transaction Seal assigns durable entry IDs.
func Select(namespace api.ContextNamespace, intent string, inbox, history []Candidate, windowLimited bool) (api.ShortTermInput, error) {
	out := api.ShortTermInput{Version: "1", Namespace: namespace, IntentHash: hash(intent), Entries: []api.ShortTermEntry{}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1", WindowLimited: windowLimited}}
	mandatory := []api.ShortTermEntry{}
	seen := map[string]bool{}
	inboxBytes := 0
	for _, candidate := range inbox {
		e := candidate.Entry
		e.ID = ""
		e.Use = "inbox"
		e.Text = candidate.Original
		e.TextHash = hash(e.Text)
		e.Representation = "full"
		e.Spans = []api.ContextTextSpan{{Start: 0, End: len(e.Text)}}
		if !utf8.ValidString(candidate.Original) || len(candidate.Original) > 131072 {
			return out, limit()
		}
		inboxBytes += len(candidate.Original)
		if e.Message == nil {
			return out, api.Invalid("CONTEXT_INPUT_STATE_INVALID")
		}
		message := *e.Message
		message.Text = ""
		e.Message = &message
		if candidate.Original == intent {
			e.Text = ""
			e.TextHash = hash("")
			e.Representation = "intent_alias"
			e.Spans = []api.ContextTextSpan{}
		}
		key := e.OriginKind + "\x00" + e.Ref.ID + "\x00" + e.Ref.Revision
		if seen[key] {
			return out, api.Invalid("CONTEXT_INPUT_STATE_INVALID")
		}
		seen[key] = true
		if err := api.ValidateShortTermOriginal(e, candidate.Original, intent); err != nil {
			return out, err
		}
		mandatory = append(mandatory, e)
	}
	if len(mandatory) > 100 || inboxBytes > 262144 {
		return out, limit()
	}
	optional := []api.ShortTermEntry{}
	recent, working, recentBytes, workingBytes := 0, 0, 0, 0
	for _, candidate := range history {
		e := candidate.Entry
		key := e.OriginKind + "\x00" + e.Ref.ID + "\x00" + e.Ref.Revision
		if seen[key] {
			continue
		}
		seen[key] = true
		if !utf8.ValidString(candidate.Original) || len(candidate.Original) > 131072 {
			return out, api.Invalid("CONTEXT_INPUT_STATE_INVALID")
		}
		e.ID = ""
		e.Message = nil
		e.Text = candidate.Original
		e.TextHash = hash(e.Text)
		e.Representation = "full"
		e.Spans = []api.ContextTextSpan{{Start: 0, End: len(e.Text)}}
		if len(e.Text) <= 8192 && recent < 8 && recentBytes+len(e.Text) <= 65536 {
			e.Use = "recent"
			recent++
			recentBytes += len(e.Text)
		} else {
			if working >= 32 {
				out.Usage.OmittedAuthorized++
				continue
			}
			e.Use = "working_summary"
			sourceBytes := len(e.Text)
			if len(e.Text) > 1024 {
				e = excerpt(e, candidate.Original)
				sourceBytes = e.Spans[0].End + len(candidate.Original) - e.Spans[1].Start
			}
			if workingBytes+sourceBytes > 32768 {
				out.Usage.OmittedAuthorized++
				continue
			}
			working++
			workingBytes += sourceBytes
		}
		if err := api.ValidateShortTermOriginal(e, candidate.Original, intent); err != nil {
			return out, err
		}
		optional = append(optional, e)
	}
	for i := len(optional) - 1; i >= 0; i-- {
		out.Entries = append(out.Entries, optional[i])
	}
	out.Entries = append(out.Entries, mandatory...)
	Recount(&out)
	if len(out.Entries) > 128 {
		return out, limit()
	}
	encoded, err := json.Marshal(out)
	if err != nil || len(encoded)+len(api.ShortTermMarker) > 393216 {
		return out, limit()
	}
	return out, nil
}
func excerpt(e api.ShortTermEntry, original string) api.ShortTermEntry {
	budget := min(1024, len(original)-len(api.ShortTermOmission)-1)
	head := min(512, budget/2)
	tail := min(512, budget-head)
	for head > 0 && !utf8.RuneStart(original[head]) {
		head--
	}
	start := len(original) - tail
	for start < len(original) && !utf8.RuneStart(original[start]) {
		start++
	}
	e.Spans = []api.ContextTextSpan{{Start: 0, End: head}, {Start: start, End: len(original)}}
	e.Text = original[:head] + api.ShortTermOmission + original[start:]
	e.TextHash = hash(e.Text)
	e.Representation = "excerpt"
	return e
}
func Recount(v *api.ShortTermInput) {
	v.Usage.Selected = len(v.Entries)
	v.Usage.Excerpted = 0
	for _, e := range v.Entries {
		if e.Representation == "excerpt" {
			v.Usage.Excerpted++
		}
	}
}

// Fragments have byte offsets in the rendered entry. They do not change the
// original provenance spans or content hash, including for empty intent_alias.
func Fragments(text string) []api.ContextTextSpan {
	if text == "" {
		return []api.ContextTextSpan{{Start: 0, End: 0}}
	}
	out := []api.ContextTextSpan{}
	for start := 0; start < len(text); {
		end := min(start+4096, len(text))
		for end < len(text) && !utf8.RuneStart(text[end]) {
			end--
		}
		out = append(out, api.ContextTextSpan{Start: start, End: end})
		start = end
	}
	return out
}
