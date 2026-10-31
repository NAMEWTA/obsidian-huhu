package privatememory_test

import (
	"context"
	"reflect"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestPrivateMemoryConcurrentCASAndOldReceiptCannotResurrectBody(t *testing.T) {
	f := newMemoryFixture(t, nil, true)
	a := f.agent("CAS owner", false)
	ns := namespaceFor(a)
	scope := api.MemoryScope{Kind: "profile"}
	add := api.MemoryCorrect{CommandMeta: f.meta("independent-add", "1"), Namespace: ns, Action: "add", Scope: &scope, Text: "original private fact"}
	item, err := f.core.API.Memory.Correct(context.Background(), owner, add)
	if err != nil {
		t.Fatal(err)
	}
	replayed, err := f.core.API.Memory.Correct(context.Background(), owner, add)
	if err != nil || !reflect.DeepEqual(replayed, item) {
		t.Fatal("receipt was not before stale catalog CAS", replayed, err)
	}
	db := f.database()
	if sqlCount(t, db, "SELECT count(*) FROM memory_revisions WHERE item_id=?", item.ID) != 1 {
		t.Fatal("receipt executed add twice")
	}
	changed := add
	changed.Text = "same key changed input"
	if _, err = f.core.API.Memory.Correct(context.Background(), owner, changed); !memoryReason(err, "IDEMPOTENCY_INPUT_MISMATCH") {
		t.Fatal("changed receipt payload accepted", err)
	}
	stale := add
	stale.CommandEpoch = "999999"
	if _, err = f.core.API.Memory.Correct(context.Background(), owner, stale); !memoryReason(err, "COMMAND_EPOCH_CONFLICT") {
		t.Fatal("receipt bypassed epoch", err)
	}
	type outcome struct {
		item api.MemoryItem
		err  error
	}
	results := make(chan outcome, 2)
	start := make(chan struct{})
	for _, text := range []string{"first competing revision", "second competing revision"} {
		command := api.MemoryCorrect{CommandMeta: f.next(item.Revision), Namespace: ns, Action: "correct", ID: item.ID, Text: text}
		go func() {
			<-start
			next, err := f.core.API.Memory.Correct(context.Background(), owner, command)
			results <- outcome{next, err}
		}()
	}
	close(start)
	wins, conflicts := 0, 0
	var current api.MemoryItem
	for range 2 {
		out := <-results
		if out.err == nil {
			wins++
			current = out.item
		} else if memoryReason(out.err, "REVISION_CONFLICT") {
			conflicts++
		} else {
			t.Fatal("CAS produced another failure", out.err)
		}
	}
	if wins != 1 || conflicts != 1 || current.Revision != "2" || current.RevisionID == item.RevisionID || sqlCount(t, db, "SELECT count(*) FROM memory_revisions WHERE item_id=?", item.ID) != 2 {
		t.Fatal("CAS wrote both candidates", wins, conflicts, current)
	}
	if _, err = f.core.API.Memory.Correct(context.Background(), owner, add); !memoryReason(err, "MEMORY_REVISION_INACTIVE") {
		t.Fatal("old body returned from a stored add receipt", err)
	}
	pin := api.MemoryPin{CommandMeta: f.meta("pin-current", current.Revision), Namespace: ns, ID: current.ID, Pinned: true}
	pinned, err := f.core.API.Memory.Pin(context.Background(), owner, pin)
	if err != nil {
		t.Fatal(err)
	}
	if pinned.RevisionID != current.RevisionID || pinned.Body.Hash != current.Body.Hash || pinned.Revision == current.Revision || !pinned.Pinned {
		t.Fatal("pin manufactured a semantic revision", pinned)
	}
	if repeated, err := f.core.API.Memory.Pin(context.Background(), owner, pin); err != nil || !reflect.DeepEqual(repeated, pinned) {
		t.Fatal("pin receipt re-executed", repeated, err)
	}
	forget := api.MemoryForget{CommandMeta: f.meta("forget", pinned.Revision), Namespace: ns, ID: pinned.ID}
	forgotten, err := f.core.API.Memory.Forget(context.Background(), owner, forget)
	if err != nil {
		t.Fatal(err)
	}
	if forgotten.State != "forgotten" || forgotten.Body != nil || forgotten.RevisionID != "" || sqlCount(t, db, "SELECT count(*) FROM memory_index WHERE item_id=?", item.ID) != 0 {
		t.Fatal("forgotten item exposed old body/index", forgotten)
	}
	for _, replay := range []func() error{func() error { _, e := f.core.API.Memory.Correct(context.Background(), owner, add); return e }, func() error { _, e := f.core.API.Memory.Pin(context.Background(), owner, pin); return e }} {
		if err := replay(); !memoryReason(err, "MEMORY_FORGOTTEN") {
			t.Fatal("body-bearing receipt ignored current forget", err)
		}
	}
	if repeated, err := f.core.API.Memory.Forget(context.Background(), owner, forget); err != nil || !reflect.DeepEqual(repeated, forgotten) {
		t.Fatal("safe forget receipt did not replay", repeated, err)
	}
	if sqlCount(t, db, "SELECT count(*) FROM memory_suppressions WHERE protected_item_id=? AND rule_kind='deny_automatic'", item.ID) < 2 {
		t.Fatal("stable origins were not suppressed")
	}
	// Explicit user add is a new independent intention; it does not clear the
	// old origin's suppression and does not revive the old ID or revision.
	newItem := f.add(ns, scope, item.Body.Text)
	if newItem.ID == item.ID || newItem.RevisionID == item.RevisionID || newItem.Body.Provenance != "user" || len(newItem.Body.Derived) != 0 {
		t.Fatal("independent user add inherited forgotten identity", newItem)
	}
	if sqlCount(t, db, "SELECT count(*) FROM memory_suppressions WHERE protected_item_id=? AND rule_kind='deny_automatic'", item.ID) < 2 {
		t.Fatal("new independent intent erased old suppression")
	}
	other := api.NewConnectionIdentity("other-principal", "other", true)
	if _, err = f.core.API.Memory.Get(context.Background(), other, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "item", ID: newItem.ID}); !memoryReason(err, "MEMORY_NAMESPACE_DENIED") {
		t.Fatal("another principal read private item", err)
	}
}

func TestPrivateMemoryCursorBindsQueryScopeAndCurrentRevision(t *testing.T) {
	f := newMemoryFixture(t, nil, true)
	a := f.agent("page owner", false)
	ns := namespaceFor(a)
	scope := api.MemoryScope{Kind: "profile"}
	for _, text := range []string{"alpha first", "alpha second", "alpha third"} {
		f.add(ns, scope, text)
	}
	query := api.MemoryQuery{ProfileID: f.profile, Namespace: ns, Kind: "item", Query: "alpha", Limit: 1}
	page, err := f.core.API.Memory.List(context.Background(), owner, query)
	if err != nil || len(page.Items) != 1 || page.NextCursor == "" {
		t.Fatal("bounded first page", page, err)
	}
	query.Cursor = page.NextCursor
	wrong := query
	wrong.Query = "other"
	if _, err = f.core.API.Memory.List(context.Background(), owner, wrong); !memoryReason(err, "MEMORY_CHANGED") {
		t.Fatal("cursor query binding missing", err)
	}
	item := page.Items[0].Item
	if item == nil {
		t.Fatal("actual item missing")
	}
	if _, err = f.core.API.Memory.Pin(context.Background(), owner, api.MemoryPin{CommandMeta: f.next(item.Revision), Namespace: ns, ID: item.ID, Pinned: true}); err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Memory.List(context.Background(), owner, query); !memoryReason(err, "MEMORY_CHANGED") {
		t.Fatal("stale catalog cursor read through mutation", err)
	}
	// A matching search cannot expose the forgotten text, even though physical
	// erasure is intentionally a later maintenance ticket.
	current := f.item(ns, item.ID)
	if _, err = f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(current.Revision), Namespace: ns, ID: current.ID}); err != nil {
		t.Fatal(err)
	}
	search, err := f.core.API.Memory.List(context.Background(), owner, api.MemoryQuery{ProfileID: f.profile, Namespace: ns, Kind: "item", Query: current.Body.Text, Limit: 50})
	if err != nil {
		t.Fatal(err)
	}
	for _, object := range search.Items {
		if object.Item != nil && object.Item.ID == item.ID && object.Item.Body != nil {
			t.Fatal("search returned forgotten body", object)
		}
	}
	if strings.Contains(page.NextCursor, current.Body.Text) {
		t.Fatal("cursor encoded private body")
	}
}
