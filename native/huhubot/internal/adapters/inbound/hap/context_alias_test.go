package hap_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func contextAliasResult() api.MemoryObject {
	text := ""
	scope := api.MemoryScope{Kind: "work_thread", ID: "thread"}
	return api.MemoryObject{Kind: "context", Context: &api.ExecutionContextView{
		RunID: "run", RunRevision: "1", ManifestRevision: "1", State: "sealed",
		Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"}, Scope: scope,
		Entries: []api.ExecutionContextEntryView{{
			ID: "entry", Kind: "inbox", Representation: "intent_alias", State: "readable", Revision: "1", Scope: scope,
			Text: &text, ContentHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			Source:       &api.DerivedInput{Kind: "message", ID: "message", Revision: "1", Hash: memoryResultSource().Hash, Namespace: "agent:agent", WorkThreadID: "thread"},
			DisplaySlice: &api.ContextTextSpan{Start: 0, End: 0}, PartCount: 1, CreatorKind: "user", PreparationKind: "selected",
		}},
	}}
}

func TestContextAliasTypedWireAndRouterContract(t *testing.T) {
	cases := []struct {
		name            string
		edit            func(*api.MemoryObject)
		valid           bool
		wireValid       bool
		typedMustReject bool
	}{
		{"empty_alias", func(*api.MemoryObject) {}, true, true, false},
		{"nonempty_alias", func(o *api.MemoryObject) {
			text := "duplicate"
			o.Context.Entries[0].Text = &text
			o.Context.Entries[0].DisplaySlice.End = len(text)
		}, false, false, false},
		{"empty_nonalias", func(o *api.MemoryObject) { o.Context.Entries[0].Representation = "full" }, false, false, false},
		{"missing_text", func(o *api.MemoryObject) { o.Context.Entries[0].Text = nil }, false, false, true},
		// The wire schema cannot compare a byte length; the typed output gate must reject it.
		{"bad_slice", func(o *api.MemoryObject) { o.Context.Entries[0].DisplaySlice.End = 1 }, false, true, true},
		{"bad_part_count", func(o *api.MemoryObject) { o.Context.Entries[0].PartCount = 0 }, false, false, true},
		{"bad_hash", func(o *api.MemoryObject) { o.Context.Entries[0].ContentHash = "invalid" }, false, false, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			object := contextAliasResult()
			tc.edit(&object)
			typedErr := api.ValidateMemoryResult("memory.get", object)
			if tc.valid && typedErr != nil || tc.typedMustReject && typedErr == nil {
				t.Fatalf("typed result validation: %v", typedErr)
			}
			raw, err := json.Marshal(object)
			if err != nil {
				t.Fatal(err)
			}
			wireErr := wire.ValidateMethod("memory.get", "result", raw)
			if (wireErr == nil) != tc.wireValid {
				t.Fatalf("wire validation: %v", wireErr)
			}
			m := &memoryResultAPI{object: object}
			router := memoryResultRouter(t, m)
			id := "context"
			result := router.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.get", Params: json.RawMessage(`{"profileId":"profile","namespace":{"kind":"agent","id":"agent"},"kind":"context","id":"run"}`)}, nil)
			if m.calls != 1 || (result.Error == nil) != tc.valid {
				t.Fatalf("actual calls=%d error=%+v", m.calls, result.Error)
			}
			if result.Error != nil && result.Error.Data.Reason != "INVALID_APPLICATION_RESULT" {
				t.Fatalf("unexpected safe error: %+v", result.Error)
			}
			t.Logf("typedAccepted=%t wireAccepted=%t routerAccepted=%t", typedErr == nil, wireErr == nil, result.Error == nil)
		})
	}
}

func TestSharedMethodWireFixturesIncludeEmptyContextAlias(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "..", "..", "..", "..", "contracts", "hap", "v0.1", "fixtures", "methods.json"))
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Cases []struct {
			Name, Method, Part string
			Value              json.RawMessage
			Valid              bool
		}
	}
	if err := json.Unmarshal(raw, &corpus); err != nil {
		t.Fatal(err)
	}
	aliasSeen := false
	for _, fixture := range corpus.Cases {
		if fixture.Name == "memory-context-empty-intent-alias" {
			aliasSeen = true
		}
		if got := wire.ValidateMethod(fixture.Method, fixture.Part, fixture.Value) == nil; got != fixture.Valid {
			t.Errorf("%s accepted=%t want=%t", fixture.Name, got, fixture.Valid)
		}
	}
	if !aliasSeen {
		t.Fatal("empty alias positive missing from generated corpus")
	}
	t.Logf("validated %d generated method fixtures", len(corpus.Cases))
}
