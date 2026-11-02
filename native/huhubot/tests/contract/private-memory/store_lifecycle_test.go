package privatememory_test

import (
	"context"
	"database/sql"
	"errors"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type heldMemoryFence struct {
	memorystore.Access
	entered, canceled, release chan struct{}
}

func (f *heldMemoryFence) WithReadFence(ctx context.Context, _ func(context.Context) error) error {
	close(f.entered)
	<-ctx.Done()
	close(f.canceled)
	<-f.release // Actual port return, not a sleep or a context cancellation flag.
	return ctx.Err()
}

func waitMemorySignal(t *testing.T, signal <-chan struct{}, label string) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(3 * time.Second):
		t.Fatal("missing actual ACK:", label)
	}
}

func TestMemoryStopAdmissionCancelsCallsButDoneWaitsForTheirActualReturn(t *testing.T) {
	f := newMemoryFixture(t, nil, true)
	ns := namespaceFor(f.agent("Store lifecycle", false))
	a := openMemoryAdapters(t, f)
	fence := &heldMemoryFence{Access: a.access, entered: make(chan struct{}), canceled: make(chan struct{}), release: make(chan struct{})}
	s := memorystore.New(a.base, a.config, fence, a.policy)
	returned := make(chan error, 1)
	var release sync.Once
	t.Cleanup(func() {
		s.StopAdmission()
		release.Do(func() { close(fence.release) })
		waitMemorySignal(t, s.Done(), "Memory Store cleanup")
	})
	before := memoryDurableState(t, a.base.Database())
	go func() {
		_, err := s.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.meta("stopped-memory-write", "1"), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "cannot be committed after stop"})
		returned <- err
	}()
	waitMemorySignal(t, fence.entered, "mutation entered shared fence port")
	s.StopAdmission()
	waitMemorySignal(t, fence.canceled, "in-flight Memory context canceled")
	select {
	case <-s.Done():
		t.Fatal("Done preceded the active port's return")
	default:
	}
	if _, err := s.List(context.Background(), owner, api.MemoryQuery{ProfileID: f.profile, Namespace: ns, Kind: "item", Limit: 1}); !memoryReason(err, "SERVICE_STOPPING") {
		t.Fatal("new public read passed the closed admission gate", err)
	}
	if _, err := s.AdmissionPageInTx(context.Background(), nil, executionstore.MemoryScanCursor{}); !memoryReason(err, "SERVICE_STOPPING") {
		t.Fatal("new maintenance scan passed the closed admission gate", err)
	}
	s.StopAdmission()
	release.Do(func() { close(fence.release) })
	select {
	case err := <-returned:
		if !errors.Is(err, context.Canceled) {
			t.Fatal("actual active call did not report its cancellation", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Memory mutation did not return after port ACK")
	}
	waitMemorySignal(t, s.Done(), "Memory Done after actual caller return")
	if after := memoryDurableState(t, a.base.Database()); !reflect.DeepEqual(before, after) {
		t.Fatal("stopped call mutated Memory or accounting", before, after)
	}
}

func memoryWatermark(t *testing.T, a *memoryAdapters, f *memoryFixture, run string) (string, error) {
	t.Helper()
	var value string
	err := a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
		var err error
		value, err = a.memory.RecoveryWatermarkInTx(context.Background(), tx, owner, f.profile, []string{run})
		return err
	})
	if err == nil && (len(value) != 71 || !strings.HasPrefix(value, "sha256:")) {
		t.Fatal("watermark exposed data instead of an opaque bounded digest", value)
	}
	return value, err
}

func TestMemoryRecoveryWatermarkTracksOnlyThisTreesActualFacts(t *testing.T) {
	t.Run("ordinary-tree", func(t *testing.T) {
		entered := make(chan api.EngineInput, 1)
		release := make(chan struct{})
		var once sync.Once
		f := newMemoryFixture(t, memoryEngine(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
			entered <- in
			select {
			case <-release:
				return api.EngineResult{Status: "finished", Text: "result must respect current memory"}, nil
			case <-ctx.Done():
				return api.EngineResult{}, ctx.Err()
			}
		}), false)
		t.Cleanup(func() { once.Do(func() { close(release) }) })
		one, other := f.agent("watermark owner", false), f.agent("unrelated owner", false)
		ns := namespaceFor(one)
		item := f.add(ns, api.MemoryScope{Kind: "profile"}, "actual recalled source")
		run := f.start(f.session(one), "consume selected memory")
		in := receiveInput(t, entered)
		if in.RunID != run.RunID || in.Memory == nil || len(in.Memory.Entries) != 1 || in.Memory.Entries[0].Ref.ID != item.RevisionID {
			t.Fatal("watermark fixture did not actually consume the selected head", in)
		}
		a := openMemoryAdapters(t, f)
		first, err := memoryWatermark(t, a, f, run.RunID)
		if err != nil {
			t.Fatal(err)
		}
		unrelated := f.add(namespaceFor(other), api.MemoryScope{Kind: "profile"}, "independent catalog change")
		if _, err := f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(unrelated.Revision), Namespace: unrelated.Namespace, ID: unrelated.ID}); err != nil {
			t.Fatal(err)
		}
		second, err := memoryWatermark(t, a, f, run.RunID)
		if err != nil || first != second {
			t.Fatal("unrelated namespace invalidated this tree", first, second, err)
		}
		pinned, err := f.core.API.Memory.Pin(context.Background(), owner, api.MemoryPin{CommandMeta: f.next(item.Revision), Namespace: ns, ID: item.ID, Pinned: true})
		if err != nil {
			t.Fatal(err)
		}
		third, err := memoryWatermark(t, a, f, run.RunID)
		if err != nil || third == second {
			t.Fatal("related actual head CAS was absent from watermark", third, err)
		}
		if _, err := f.core.API.Memory.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.next(pinned.Revision), Namespace: ns, Action: "correct", ID: item.ID, Text: "new independently current head"}); err != nil {
			t.Fatal(err)
		}
		if value, err := memoryWatermark(t, a, f, run.RunID); value != "" || !memoryReason(err, "MEMORY_REVISION_INACTIVE") {
			t.Fatal("consumed old head was silently reselected during watermark capture", value, err)
		}
		once.Do(func() { close(release) })
		f.wait(run.RunID, "failed")
	})
	t.Run("maintenance-settings", func(t *testing.T) {
		f, agent, entered, _ := maintenanceFixture(t)
		source := f.start(f.session(agent), "actual maintenance source")
		f.wait(source.RunID, "succeeded")
		f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100"})
		call := nextMaintenance(t, entered)
		a := openMemoryAdapters(t, f)
		before, err := memoryWatermark(t, a, f, call.input.RunID)
		if err != nil {
			t.Fatal(err)
		}
		settings := f.page(namespaceFor(agent), "item").Settings
		if settings == nil {
			t.Fatal("actual namespace settings missing")
		}
		if _, err := f.core.API.Memory.SetAutoMaintenance(context.Background(), owner, api.MemorySetAuto{CommandMeta: f.next(settings.Revision), Namespace: settings.Namespace, Enabled: false}); err != nil {
			t.Fatal(err)
		}
		after, err := memoryWatermark(t, a, f, call.input.RunID)
		if err != nil || before == after {
			t.Fatal("maintenance settings/generation were absent from its tree watermark", before, after, err)
		}
		call.result <- candidateResult()
		f.wait(call.input.RunID, "failed")
	})
}
