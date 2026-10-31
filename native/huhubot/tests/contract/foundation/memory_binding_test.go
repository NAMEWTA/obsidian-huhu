package foundation_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestMemoryCanonicalBindingsAndOriginalSpanResponsibility(t *testing.T) {
	raw, e := os.ReadFile(filepath.Join("..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "memory-bindings.json"))
	if e != nil {
		t.Fatal(e)
	}
	var f struct {
		Cases []struct {
			Name             string
			Memory           api.ExecutionMemoryInput
			MemoryBinding    string
			ShortTerm        api.ShortTermInput
			ShortTermBinding string
			Original         string
		}
	}
	if e = json.Unmarshal(raw, &f); e != nil {
		t.Fatal(e)
	}
	for _, c := range f.Cases {
		t.Run(c.Name, func(t *testing.T) {
			got, e := api.CanonicalMemoryInputBinding(c.Memory)
			if e != nil || got != c.MemoryBinding {
				t.Fatal("memory independent golden", got, c.MemoryBinding, e)
			}
			short, e := api.CanonicalShortTermBinding(c.ShortTerm)
			if e != nil || short != c.ShortTermBinding {
				t.Fatal("short independent golden", short, c.ShortTermBinding, e)
			}
			if e = api.ValidateShortTermOriginal(c.ShortTerm.Entries[0], c.Original, "当前意图"); e != nil {
				t.Fatal(e)
			}
			if e = api.ValidateShortTermOriginal(c.ShortTerm.Entries[0], c.Original+"篡改", "当前意图"); e == nil {
				t.Fatal("pure reader validation accepted a different original")
			}
			tooMany := c.ShortTerm
			tooMany.Usage.OmittedAuthorized = 61
			if _, err := api.CanonicalShortTermBinding(tooMany); err == nil {
				t.Fatal("unbounded omitted count")
			}
			c.ShortTerm.BindingDigest = short
			rendered, e := api.RenderShortTermInput(c.ShortTerm)
			if e != nil || !strings.HasPrefix(rendered, api.ShortTermMarker) {
				t.Fatal(rendered, e)
			}
			c.ShortTerm.Entries[0].Text += "altered"
			if _, e = api.CanonicalShortTermBinding(c.ShortTerm); e == nil {
				t.Fatal("text changed without its actual hash")
			}
		})
	}
	original := "甲" + strings.Repeat("乙", 400) + "丙"
	text := "甲" + api.ShortTermOmission + "丙"
	entry := api.ShortTermEntry{ID: "entry:1", OriginKind: "conversation_message", Ref: api.DerivedInput{Kind: "message", ID: "message:1", Revision: "1", Hash: memoryDigest(original), Namespace: "session:1", WorkThreadID: "session:1"}, Use: "working_summary", Role: "user", Representation: "excerpt", Spans: []api.ContextTextSpan{{Start: 0, End: 3}, {Start: len(original) - 3, End: len(original)}}, Text: text, TextHash: memoryDigest(text)}
	input := api.ShortTermInput{Version: "1", Namespace: api.ContextNamespace{SubjectKind: "agent", SubjectID: "agent:a", SessionID: "session:1", WorkThreadID: "session:1"}, IntentHash: memoryDigest("intent"), Entries: []api.ShortTermEntry{entry}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 1, Excerpted: 1}}
	if _, e = api.CanonicalShortTermBinding(input); e != nil {
		t.Fatal(e)
	}
	if e = api.ValidateShortTermOriginal(entry, original, "intent"); e != nil {
		t.Fatal(e)
	}
	entry.Spans = append([]api.ContextTextSpan{}, entry.Spans...)
	entry.Spans[0].End = 2
	entry.Text = "x"
	entry.TextHash = memoryDigest("x")
	if e = api.ValidateShortTermOriginal(entry, original, "intent"); e == nil {
		t.Fatal("UTF8 byte boundary/source verification skipped")
	}
	// A structurally consistent excerpt from a wrong source needs the actual reader.
	entry = input.Entries[0]
	entry.Ref.Hash = memoryDigest("different")
	input.Entries[0] = entry
	if _, e = api.CanonicalShortTermBinding(input); e != nil {
		t.Fatal("pure helper must not pretend to know stored original", e)
	}
	if e = api.ValidateShortTermOriginal(entry, original, "intent"); e == nil {
		t.Fatal("Store's mandatory source check lost")
	}
}

func TestMemoryNilFieldsPreserveLegacySerializedValues(t *testing.T) {
	for _, v := range []any{api.EngineResult{}, api.RecoveryInspection{}} {
		raw, e := json.Marshal(v)
		if e != nil {
			t.Fatal(e)
		}
		if strings.Contains(string(raw), "MemoryCandidates") || strings.Contains(string(raw), "ShortTerm") || strings.Contains(string(raw), `"Memory"`) {
			t.Fatal("nil new input changed old serialized shape", string(raw))
		}
	}
}

func TestShortTermWorkingSummaryCountsOriginalBytesAndVerifiesHeadTail(t *testing.T) {
	original := strings.Repeat("a", 512) + strings.Repeat("middle", 16) + strings.Repeat("b", 512)
	text := original[:512] + api.ShortTermOmission + original[len(original)-512:]
	input := api.ShortTermInput{Version: "1", Namespace: api.ContextNamespace{SubjectKind: "agent", SubjectID: "agent:a", SessionID: "session:1", WorkThreadID: "session:1"}, IntentHash: memoryDigest("intent"), Entries: []api.ShortTermEntry{}, Usage: api.ContextUsage{PolicyVersion: "extractive-v1", Selected: 32, Excerpted: 32}}
	for i := 0; i < 32; i++ {
		id := string(rune('A' + i))
		e := api.ShortTermEntry{ID: "entry:" + id, OriginKind: "conversation_message", Ref: api.DerivedInput{Kind: "message", ID: "message:" + id, Revision: "1", Hash: memoryDigest(original), Namespace: "session:1", WorkThreadID: "session:1"}, Use: "working_summary", Role: "user", Representation: "excerpt", Spans: []api.ContextTextSpan{{Start: 0, End: 512}, {Start: len(original) - 512, End: len(original)}}, Text: text, TextHash: memoryDigest(text)}
		input.Entries = append(input.Entries, e)
	}
	if _, e := api.CanonicalShortTermBinding(input); e != nil {
		t.Error("32768 original bytes plus omission markers must be legal", e)
	}
	for _, e := range input.Entries {
		if err := api.ValidateShortTermOriginal(e, original, "intent"); err != nil {
			t.Fatal("actual source reader exact head/tail", err)
		}
	}
	e := input.Entries[0]
	e.Spans = append([]api.ContextTextSpan{}, e.Spans...)
	e.Spans[0].Start = 1
	e.Spans[0].End = 513
	e.Text = original[1:513] + api.ShortTermOmission + original[len(original)-512:]
	e.TextHash = memoryDigest(e.Text)
	if err := api.ValidateShortTermOriginal(e, original, "intent"); err == nil {
		t.Error("source reader accepted non-head excerpt")
	}
	e = input.Entries[0]
	e.Spans = append([]api.ContextTextSpan{}, e.Spans...)
	e.Spans[0].End = 513
	e.Spans[1].Start = len(original) - 511
	e.Text = original[:513] + api.ShortTermOmission + original[len(original)-511:]
	e.TextHash = memoryDigest(e.Text)
	one := input
	one.Entries = []api.ShortTermEntry{e}
	one.Usage.Selected = 1
	one.Usage.Excerpted = 1
	if _, err := api.CanonicalShortTermBinding(one); err == nil {
		t.Error("structure accepted a 513-byte source span")
	}
	e = input.Entries[0]
	e.Representation = "full"
	e.Text = original
	e.TextHash = memoryDigest(original)
	e.Spans = []api.ContextTextSpan{{Start: 0, End: len(original)}}
	one.Entries = []api.ShortTermEntry{e}
	one.Usage.Excerpted = 0
	if _, err := api.CanonicalShortTermBinding(one); err == nil {
		t.Error("working full representation over1024 bytes")
	}
}
