package privatememory_test

import (
	"fmt"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	selection "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/context"
)

func selectionCandidate(id, text string) selection.Candidate {
	return selection.Candidate{Original: text, Entry: api.ShortTermEntry{OriginKind: "conversation_message", Ref: api.DerivedInput{Kind: "message", ID: id, Revision: "1", Hash: testHash(text), Namespace: "session:qualified", WorkThreadID: "session:qualified"}, Role: "assistant"}}
}

func TestShortTermSelectionRetainsUTF8OriginalSpansAndWholeMessageLimits(t *testing.T) {
	namespace := api.ContextNamespace{SubjectKind: "agent", SubjectID: "agent:qualified", SessionID: "session:qualified", WorkThreadID: "session:qualified"}
	for _, size := range []int{1025, 1030, 1040, 6000} {
		t.Run(fmt.Sprintf("original-%d-bytes", size), func(t *testing.T) {
			history := []selection.Candidate{}
			originals := map[string]string{}
			for i := range 60 {
				text := fmt.Sprintf("recent %d", i)
				if i >= 8 {
					text = strings.Repeat("界", size/3) + strings.Repeat("x", size%3)
				}
				id := fmt.Sprintf("message:%02d", i)
				history = append(history, selectionCandidate(id, text))
				originals[id] = text
			}
			out, err := selection.Select(namespace, "independent current intent", nil, history, true)
			if err != nil {
				t.Fatal(err)
			}
			if out.Usage.Selected != 40 || out.Usage.Excerpted != 32 || out.Usage.OmittedAuthorized != 20 || !out.Usage.WindowLimited {
				t.Fatal("whole-message admission or omission accounting", out.Usage)
			}
			if out.Entries[0].Ref.ID != "message:39" || out.Entries[len(out.Entries)-1].Ref.ID != "message:00" {
				t.Fatal("older selected records were not before newer ones")
			}
			originalBytes := 0
			for i, entry := range out.Entries {
				original := originals[entry.Ref.ID]
				if entry.Ref.Hash != testHash(original) || entry.TextHash != testHash(entry.Text) || !utf8.ValidString(entry.Text) || entry.Message != nil {
					t.Fatal("rendered text replaced original provenance", entry)
				}
				if entry.Representation == "excerpt" {
					if len(entry.Spans) != 2 || entry.Spans[0].Start != 0 || entry.Spans[1].End != len(original) || entry.Spans[0].End > 512 || len(original)-entry.Spans[1].Start > 512 || len(entry.Text) >= len(original) {
						t.Fatal("excerpt was not bounded and actually shorter", len(original), entry)
					}
					want := original[:entry.Spans[0].End] + api.ShortTermOmission + original[entry.Spans[1].Start:]
					if entry.Text != want || !utf8.ValidString(original[:entry.Spans[0].End]) || !utf8.ValidString(original[entry.Spans[1].Start:]) {
						t.Fatal("excerpt cannot be reconstructed from exact UTF8 spans", entry)
					}
					originalBytes += entry.Spans[0].End + len(original) - entry.Spans[1].Start
				} else if entry.Use != "recent" || entry.Text != original {
					t.Fatal("recent whole body changed", entry)
				}
				if err = api.ValidateShortTermOriginal(entry, original, "independent current intent"); err != nil {
					t.Fatal(err)
				}
				out.Entries[i].ID = fmt.Sprintf("entry:%d", i)
			}
			if originalBytes > 32768 {
				t.Fatal("original-span budget exceeded", originalBytes)
			}
			if _, err = api.CanonicalShortTermBinding(out); err != nil {
				t.Fatal("selection cannot be sealed by the sole canonical contract", err)
			}
		})
	}
}

func TestShortTermMandatoryInboxAliasAndIdentityDedupDoNotDropIndependentBodies(t *testing.T) {
	namespace := api.ContextNamespace{SubjectKind: "temporary", SubjectID: "temporary:one", SessionID: "session:qualified", WorkThreadID: "thread:one"}
	intent := "exact accepted child intention"
	inbox := selectionCandidate("message:inbox", intent)
	inbox.Entry.OriginKind = "thread_message"
	inbox.Entry.Role = "data"
	inbox.Entry.Ref.Namespace = "thread:one"
	inbox.Entry.Ref.WorkThreadID = "thread:one"
	inbox.Entry.Message = &api.AgentMessage{ID: inbox.Entry.Ref.ID, Text: "must not duplicate the body", WorkThreadID: "thread:one"}
	first := selectionCandidate("message:same-hash-a", "identical words, independent messages")
	second := selectionCandidate("message:same-hash-b", first.Original)
	out, err := selection.Select(namespace, intent, []selection.Candidate{inbox}, []selection.Candidate{first, second, first}, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.Entries) != 3 || out.Entries[0].Ref.ID != second.Entry.Ref.ID || out.Entries[1].Ref.ID != first.Entry.Ref.ID {
		t.Fatal("dedup used body hash or lost distinct origins", out.Entries)
	}
	alias := out.Entries[2]
	if alias.Use != "inbox" || alias.Representation != "intent_alias" || alias.Text != "" || len(alias.Spans) != 0 || alias.Ref.Hash != testHash(intent) || alias.Message == nil || alias.Message.Text != "" {
		t.Fatal("mandatory inbox was dropped or intent duplicated", alias)
	}
	if inbox.Entry.Message.Text != "must not duplicate the body" {
		t.Fatal("selector mutated caller-owned inbox")
	}
	if _, err = selection.Select(namespace, intent, []selection.Candidate{inbox, inbox}, nil, false); !memoryReason(err, "CONTEXT_INPUT_STATE_INVALID") {
		t.Fatal("duplicate mandatory identity accepted", err)
	}
	oversized := []selection.Candidate{}
	for i := range 101 {
		entry := inbox
		entry.Entry.Ref.ID = fmt.Sprintf("message:mandatory:%d", i)
		message := *inbox.Entry.Message
		message.ID = entry.Entry.Ref.ID
		entry.Entry.Message = &message
		oversized = append(oversized, entry)
	}
	if _, err = selection.Select(namespace, intent, oversized, nil, false); !memoryReason(err, "CONTEXT_INPUT_LIMIT") {
		t.Fatal("mandatory inbox was silently truncated", err)
	}
}
