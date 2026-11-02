package privatememory_test

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestActualContextIsolationExcerptsAndFragmentPagination(t *testing.T) {
	inputs := make(chan api.EngineInput, 8)
	f := newMemoryFixture(t, memoryEngine(func(_ context.Context, in api.EngineInput) (api.EngineResult, error) {
		inputs <- in
		return api.EngineResult{Status: "finished", Text: "accepted private output"}, nil
	}), false)
	a, b := f.agent("A private context", false), f.agent("B private context", false)
	nsA, nsB := namespaceFor(a), namespaceFor(b)
	a1, a2, bs := f.session(a), f.session(a), f.session(b)
	profileMemory := f.add(nsA, api.MemoryScope{Kind: "profile"}, "A_PRIVATE_PROFILE")
	f.add(nsA, api.MemoryScope{Kind: "session", ID: a1.ID}, "A_FIRST_SESSION_MEMORY")
	f.add(nsA, api.MemoryScope{Kind: "session", ID: a2.ID}, "A_OTHER_SESSION_MEMORY_MUST_NOT_LEAK")
	f.add(nsB, api.MemoryScope{Kind: "profile"}, "B_PRIVATE_MEMORY_MUST_NOT_LEAK")
	prior := "A1_PRIOR_HEAD_" + strings.Repeat("界", 3000) + "_A1_PRIOR_TAIL"
	first := f.start(a1, prior)
	f.wait(first.RunID, "succeeded")
	receiveInput(t, inputs)
	otherA := f.start(a2, "A_OTHER_SESSION_HISTORY_MUST_NOT_LEAK")
	f.wait(otherA.RunID, "succeeded")
	receiveInput(t, inputs)
	otherB := f.start(bs, "B_PRIVATE_HISTORY_MUST_NOT_LEAK")
	f.wait(otherB.RunID, "succeeded")
	receiveInput(t, inputs)
	intent := "A1_CURRENT_HEAD_" + strings.Repeat("é👩‍💻", 900) + "_A1_CURRENT_TAIL"
	current := f.start(a1, intent)
	f.wait(current.RunID, "succeeded")
	in := receiveInput(t, inputs)
	if in.RunID != current.RunID || in.Intent != intent || in.ShortTerm == nil || in.Memory == nil || len(in.History) != 0 || len(in.Messages) != 0 {
		t.Fatal("actual initial context was not sealed", in)
	}
	if in.ShortTerm.Namespace.SubjectID != a.ID || in.ShortTerm.Namespace.SessionID != a1.ID || in.ShortTerm.Namespace.WorkThreadID != a1.ID {
		t.Fatal("context namespace broadened", in.ShortTerm.Namespace)
	}
	all := intent
	foundExcerpt := false
	for _, entry := range in.ShortTerm.Entries {
		all += "\n" + entry.Text
		if entry.Ref.Hash == testHash(prior) {
			foundExcerpt = true
			if entry.Representation != "excerpt" || entry.Use != "working_summary" || len(entry.Spans) != 2 || entry.Text != prior[:entry.Spans[0].End]+api.ShortTermOmission+prior[entry.Spans[1].Start:] || entry.TextHash == entry.Ref.Hash {
				t.Fatal("actual DB original was not excerpted with independent hash", entry)
			}
			if err := api.ValidateShortTermOriginal(entry, prior, intent); err != nil {
				t.Fatal(err)
			}
		}
	}
	if !foundExcerpt {
		t.Fatal("prior long accepted input absent from actual selection")
	}
	for _, entry := range in.Memory.Entries {
		all += "\n" + entry.Text
	}
	for _, forbidden := range []string{"A_OTHER_SESSION_MEMORY_MUST_NOT_LEAK", "A_OTHER_SESSION_HISTORY_MUST_NOT_LEAK", "B_PRIVATE_MEMORY_MUST_NOT_LEAK", "B_PRIVATE_HISTORY_MUST_NOT_LEAK"} {
		if strings.Contains(all, forbidden) {
			t.Fatal("actual model input leaked another namespace/session", forbidden)
		}
	}
	if !strings.Contains(all, "A_PRIVATE_PROFILE") || !strings.Contains(all, "A_FIRST_SESSION_MEMORY") {
		t.Fatal("valid own scopes were omitted")
	}
	query := api.MemoryGet{ProfileID: f.profile, Namespace: nsA, Kind: "context", ID: current.RunID, Limit: 1}
	parts := map[string][]api.ExecutionContextEntryView{}
	seenCursors := map[string]bool{}
	pageCount := 0
	for {
		view, err := f.core.API.Memory.Get(context.Background(), owner, query)
		if err != nil || view.Context == nil {
			t.Fatal("actual context page", view, err)
		}
		if view.Context.State != "sealed" || len(view.Context.Entries) != 1 {
			t.Fatal("bounded sealed page", view)
		}
		entry := view.Context.Entries[0]
		if entry.Text == nil || entry.DisplaySlice == nil || len(*entry.Text) > 4096 || !utf8.ValidString(*entry.Text) {
			t.Fatal("invalid UTF8 display fragment", entry)
		}
		parts[entry.ID] = append(parts[entry.ID], entry)
		pageCount++
		if pageCount == 1 {
			// An unrelated namespace mutation must not expire an immutable entry
			// cursor whose own referenced facts have not changed.
			f.add(nsB, api.MemoryScope{Kind: "profile"}, "unrelated B follow-up")
		}
		if view.Context.NextCursor == "" {
			break
		}
		if seenCursors[view.Context.NextCursor] || pageCount > 32 {
			t.Fatal("context cursor loop", view.Context.NextCursor)
		}
		seenCursors[view.Context.NextCursor] = true
		query.Cursor = view.Context.NextCursor
	}
	intentParts := 0
	for _, fragments := range parts {
		text := ""
		head := fragments[0]
		for i, part := range fragments {
			if part.PartIndex != i || part.PartCount != len(fragments) || part.ContentHash != head.ContentHash || !reflect.DeepEqual(part.SourceSpans, head.SourceSpans) || part.DisplaySlice.Start != len(text) {
				t.Fatal("fragment identity/hash/original spans changed across pages", fragments)
			}
			text += *part.Text
			if part.DisplaySlice.End != len(text) {
				t.Fatal("fragment byte offsets do not reconstruct text", part)
			}
		}
		if testHash(text) != head.ContentHash {
			t.Fatal("whole rendered body hash differs", head)
		}
		if head.Kind == "intent" {
			intentParts = len(fragments)
			if text != intent {
				t.Fatal("intent body was shortened or duplicated")
			}
		}
	}
	if intentParts < 3 {
		t.Fatal("test did not exercise multi-page UTF8 intent", intentParts)
	}
	query.Cursor = ""
	page, err := f.core.API.Memory.Get(context.Background(), owner, query)
	if err != nil || page.Context == nil || page.Context.NextCursor == "" {
		t.Fatal(page, err)
	}
	if _, err = f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(profileMemory.Revision), Namespace: nsA, ID: profileMemory.ID}); err != nil {
		t.Fatal(err)
	}
	query.Cursor = page.Context.NextCursor
	if _, err = f.core.API.Memory.Get(context.Background(), owner, query); !memoryReason(err, "CONTEXT_CHANGED") {
		t.Fatal("old entry cursor ignored changed ancestry", err)
	}
	query.Cursor = ""
	query.Limit = 50
	fresh, err := f.core.API.Memory.Get(context.Background(), owner, query)
	if err != nil || fresh.Context == nil || fresh.Context.State != "redacted" {
		t.Fatal("current context did not redact forgotten input", fresh, err)
	}
	redacted, readableIntent := 0, false
	for _, entry := range fresh.Context.Entries {
		if entry.State == "redacted" {
			redacted++
			if entry.Text != nil || entry.Source != nil || len(entry.SourceRefs) > 0 || entry.ContentHash != "" || entry.CreatorKind != "" || len(entry.SourceSpans) > 0 {
				t.Fatal("redacted metadata leaked source/body", entry)
			}
		}
		if entry.Kind == "intent" && entry.Text != nil {
			readableIntent = true
		}
	}
	if redacted == 0 || !readableIntent {
		t.Fatal("redaction removed independent user intent", fresh)
	}
	list, err := f.core.API.Memory.List(context.Background(), owner, api.MemoryQuery{ProfileID: f.profile, Namespace: nsA, Kind: "context", Scope: &api.MemoryScope{Kind: "session", ID: a1.ID}, Limit: 50})
	if err != nil || len(list.Items) != 2 {
		t.Fatal("actual context summaries crossed session boundary", list, err)
	}
	for _, object := range list.Items {
		if object.Context == nil || len(object.Context.Entries) != 0 || object.Context.RunID != first.RunID && object.Context.RunID != current.RunID {
			t.Fatal("context list fabricated or exposed body", object)
		}
	}
}
