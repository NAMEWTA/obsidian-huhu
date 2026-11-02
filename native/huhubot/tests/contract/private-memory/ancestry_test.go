package privatememory_test

import (
	"context"
	"fmt"
	"strconv"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// The ordinary add/get path first proves the actual owner and healthy records.
// Only the Memory-owned durable metadata is then corrupted deliberately; this
// is not a substitute writer for legitimate provenance propagation.
func TestPrivateMemoryRejectsBrokenCompleteAncestryWithoutReturningBody(t *testing.T) {
	for _, corruption := range []string{"bad-json", "null-json", "missing-relation", "missing-ancestor", "cycle", "contradictory-identity"} {
		t.Run(corruption, func(t *testing.T) {
			f := newMemoryFixture(t, nil, true)
			ns := namespaceFor(f.agent("complete ancestry", false))
			one := f.add(ns, api.MemoryScope{Kind: "profile"}, "qualified leaf one")
			two := f.add(ns, api.MemoryScope{Kind: "profile"}, "qualified leaf two")
			db := f.database()
			oneRef, twoRef := memoryRef(t, db, f, one), memoryRef(t, db, f, two)
			if f.item(ns, one.ID).Body.Text != one.Body.Text {
				t.Fatal("healthy public baseline did not round trip")
			}
			switch corruption {
			case "bad-json":
				mustMemorySQL(t, db, "UPDATE memory_revisions SET derived_json='{' WHERE revision_id=?", one.RevisionID)
			case "null-json":
				mustMemorySQL(t, db, "UPDATE memory_revisions SET derived_json='null' WHERE revision_id=?", one.RevisionID)
			case "missing-relation":
				mustMemorySQL(t, db, "UPDATE memory_revisions SET derived_json=? WHERE revision_id=?", memoryJSON(t, []api.DerivedInput{twoRef}), one.RevisionID)
			case "missing-ancestor":
				twoRef.ID = "memory-revision:missing-durable-ancestor"
				setControlledAncestry(t, db, one, []api.DerivedInput{twoRef})
			case "cycle":
				setControlledAncestry(t, db, one, []api.DerivedInput{twoRef})
				setControlledAncestry(t, db, two, []api.DerivedInput{oneRef})
			case "contradictory-identity":
				other := twoRef
				other.Revision = "2"
				other.Hash = testHash("cannot overwrite an existing immutable identity")
				setControlledAncestry(t, db, one, []api.DerivedInput{twoRef, other})
			}
			object, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "item", ID: one.ID})
			if !memoryReason(err, "MEMORY_STATE_INVALID") || object.Item != nil && object.Item.Body != nil {
				t.Fatal("incomplete/cyclic provenance became a readable success", corruption, object, err)
			}
			if sqlCount(t, db, "SELECT count(*) FROM memory_revisions") != 2 || sqlCount(t, db, "SELECT count(*) FROM memory_revision_bodies") != 2 {
				t.Fatal("read repair silently rewrote immutable records")
			}
		})
	}
}

func TestPrivateMemoryCompleteConsumptionClosureHasAnExact128ReferenceBoundary(t *testing.T) {
	f := newMemoryFixture(t, nil, true)
	ns := namespaceFor(f.agent("bounded complete ancestry", false))
	first := f.page(ns, "item")
	revision, err := strconv.Atoi(first.NamespaceRevision)
	if err != nil {
		t.Fatal(err)
	}
	items := make([]api.MemoryItem, 129)
	for i := range items {
		items[i], err = f.core.API.Memory.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.next(strconv.Itoa(revision + i)), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: fmt.Sprintf("separately owned input %03d", i)})
		if err != nil {
			t.Fatal("actual add failed before closure fixture", i, err)
		}
	}
	db := f.database()
	refs := make([]api.DerivedInput, 128)
	for i := range refs {
		refs[i] = memoryRef(t, db, f, items[i+1])
	}
	// Consuming the requested head also consumes that immutable head's own
	// identity. 127 ancestors plus this head is the full 128-reference input.
	setControlledAncestry(t, db, items[0], refs[:127])
	actual := f.item(ns, items[0].ID)
	if actual.Body == nil || len(actual.Body.Derived) != 127 {
		t.Fatal("legal complete boundary was truncated or refused", actual)
	}
	setControlledAncestry(t, db, items[0], refs)
	object, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "item", ID: items[0].ID})
	if !memoryReason(err, "MEMORY_PROVENANCE_LIMIT") || object.Item != nil && object.Item.Body != nil {
		t.Fatal("129-reference consumption silently truncated ancestry", object, err)
	}
	if sqlCount(t, db, "SELECT count(*) FROM memory_dependencies WHERE owner_kind='memory_revision' AND owner_id=? AND relation='origin'", items[0].RevisionID) != 128 {
		t.Fatal("overflow was hidden by deleting provenance")
	}
}
