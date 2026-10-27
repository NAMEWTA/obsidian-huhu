package privatememory_test

import (
	"context"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type maintenanceCall struct {
	input  api.EngineInput
	result chan api.EngineResult
}

func maintenanceFixture(t *testing.T) (*memoryFixture, api.Agent, <-chan maintenanceCall, *atomic.Int32) {
	t.Helper()
	entered := make(chan maintenanceCall, 8)
	ordinary := &atomic.Int32{}
	f := newMemoryFixture(t, memoryEngine(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
		if in.Memory == nil || in.Memory.Mode != "maintenance" {
			ordinary.Add(1)
			return api.EngineResult{Status: "finished", Text: "accepted independent output: " + in.Intent}, nil
		}
		call := maintenanceCall{input: in, result: make(chan api.EngineResult, 1)}
		entered <- call
		select {
		case result := <-call.result:
			return result, nil
		case <-ctx.Done():
			return api.EngineResult{}, ctx.Err()
		}
	}), false)
	a := f.agent("maintenance source owner", true)
	f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"})
	return f, a, entered, ordinary
}
func nextMaintenance(t *testing.T, entered <-chan maintenanceCall) maintenanceCall {
	t.Helper()
	select {
	case call := <-entered:
		if call.input.Memory == nil || call.input.Memory.Mode != "maintenance" || call.input.Config.ID == "" || call.input.Lineage.ParentRunID != "" || call.input.Lineage.RootRunID != call.input.RunID {
			t.Fatal("not a real independently pinned maintenance Run", call.input)
		}
		return call
	case <-time.After(7 * time.Second):
		t.Fatal("public completion did not admit maintenance")
		return maintenanceCall{}
	}
}
func candidateResult(items ...api.MemoryCandidateDraft) api.EngineResult {
	return api.EngineResult{Status: "finished", MemoryCandidates: &api.MemoryCandidateSet{Items: append([]api.MemoryCandidateDraft{}, items...)}}
}

// Only the Engine result is controlled. Completions, jobs, input manifests,
// independent pins and transactions all come through the default Core. This
// test does not make a model request or claim SDK/accounting coverage.
func TestMaintenanceCommitRevalidatesWholeBatchAndLateUserChanges(t *testing.T) {
	for _, mode := range []string{"automatic-correct", "pin-conflict", "manual-correction", "forget", "auto-off", "invalid-second-candidate", "empty-set"} {
		t.Run(mode, func(t *testing.T) {
			f, a, entered, ordinary := maintenanceFixture(t)
			ns := namespaceFor(a)
			// Both accepted sources predate all memory. The later correction has
			// a real independent source, not a model output already derived from
			// the target head (which would create an indirect self-cycle).
			for _, intent := range []string{"first independent source", "second independent source"} {
				receipt := f.start(f.session(a), intent)
				f.wait(receipt.RunID, "succeeded")
			}
			db := f.database()
			if sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE run_id IS NULL") != 2 || sqlCount(t, db, "SELECT count(*) FROM model_attempts") != 0 {
				t.Fatal("zero maintenance budget still admitted a Run or request")
			}
			f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100"})
			first := nextMaintenance(t, entered)
			if len(first.input.Memory.Targets) != 0 {
				t.Fatal("first job fabricated a target")
			}
			first.result <- candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "automatically derived base", Provenance: "inference"})
			f.wait(first.input.RunID, "succeeded")
			page := f.page(ns, "item")
			if len(page.Items) != 1 || page.Items[0].Item == nil {
				t.Fatal("first actual automatic commit did not create one item", page)
			}
			original := *page.Items[0].Item
			if original.Body == nil || original.Body.CreatorKind != "agent" || original.Body.JobID != first.input.Memory.JobID || original.Body.Provenance != "inference" || len(original.Body.Derived) == 0 {
				t.Fatal("automatic provenance was not server generated", original)
			}
			second := nextMaintenance(t, entered)
			if len(second.input.Memory.Targets) != 1 || second.input.Memory.Targets[0].ItemID != original.ID || second.input.Memory.Targets[0].RevisionID != original.RevisionID {
				t.Fatal("actual target head was not frozen", second.input.Memory)
			}
			wanted := candidateResult(api.MemoryCandidateDraft{Operation: "correct", TargetItemID: original.ID, Text: "automatic replacement", Provenance: "inference"})
			var manual api.MemoryItem
			var err error
			switch mode {
			case "pin-conflict":
				manual, err = f.core.API.Memory.Pin(context.Background(), owner, api.MemoryPin{CommandMeta: f.next(original.Revision), Namespace: ns, ID: original.ID, Pinned: true})
			case "manual-correction":
				manual, err = f.core.API.Memory.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.next(original.Revision), Namespace: ns, Action: "correct", ID: original.ID, Text: "explicit human correction, unpinned"})
			case "forget":
				manual, err = f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(original.Revision), Namespace: ns, ID: original.ID})
			case "auto-off":
				settings := f.page(ns, "item").Settings
				if settings == nil {
					t.Fatal("settings missing")
				}
				_, err = f.core.API.Memory.SetAutoMaintenance(context.Background(), owner, api.MemorySetAuto{CommandMeta: f.next(settings.Revision), Namespace: ns, Enabled: false})
			case "invalid-second-candidate":
				wanted = candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "first must roll back too", Provenance: "inference"}, api.MemoryCandidateDraft{Operation: "correct", TargetItemID: "memory-item:never-admitted", Text: "forged target", Provenance: "inference"})
			case "empty-set":
				wanted = candidateResult()
			}
			if err != nil {
				t.Fatal("public interleaving failed", err)
			}
			second.result <- wanted
			success := mode == "automatic-correct" || mode == "pin-conflict" || mode == "empty-set"
			status := "failed"
			if success {
				status = "succeeded"
			}
			run := f.wait(second.input.RunID, status)
			current := f.item(ns, original.ID)
			if mode == "automatic-correct" {
				if current.RevisionID == original.RevisionID || current.Body == nil || current.Body.Text != "automatic replacement" || current.Body.CreatorKind != "agent" {
					t.Fatal("valid current automatic correction not committed", current, run)
				}
				if sqlCount(t, db, "SELECT count(*) FROM memory_dependencies WHERE owner_kind='memory_revision' AND owner_id=? AND ancestor_id=? AND relation='audit'", current.RevisionID, original.RevisionID) != 1 || sqlCount(t, db, "SELECT count(*) FROM memory_dependencies WHERE owner_kind='memory_revision' AND owner_id=? AND ancestor_id=? AND relation!='audit'", current.RevisionID, original.RevisionID) != 0 {
					t.Fatal("old head remained an active self-ancestor")
				}
			} else if mode == "pin-conflict" {
				if !current.Pinned || current.RevisionID != original.RevisionID || current.Revision != manual.Revision {
					t.Fatal("automatic callback overwrote user pin/head", current)
				}
				candidates := f.page(ns, "candidate")
				if len(candidates.Items) != 1 || candidates.Items[0].Candidate == nil {
					t.Fatal("pin conflict did not preserve one readable candidate", candidates)
				}
				candidate := candidates.Items[0].Candidate
				if candidate.State != "pending" || candidate.Reason != "MEMORY_PINNED_CONFLICT" || candidate.Body == nil || candidate.Body.Text != "automatic replacement" || candidate.TargetItemID != current.ID {
					t.Fatal("candidate lost actual decision/target/body", candidate)
				}
				applied, err := f.core.API.Memory.Correct(context.Background(), owner, api.MemoryCorrect{CommandMeta: f.next(current.Revision), Namespace: ns, Action: "apply_candidate", ID: current.ID, CandidateID: candidate.ID, CandidateRevision: candidate.Revision})
				if err != nil || !applied.Pinned || applied.Body == nil || applied.Body.Text != "automatic replacement" {
					t.Fatal("explicit candidate selection did not retain pin", applied, err)
				}
			} else if mode == "manual-correction" {
				if current.RevisionID != manual.RevisionID || current.Pinned || current.Body.Text != "explicit human correction, unpinned" || sqlCount(t, db, "SELECT count(*) FROM memory_suppressions WHERE protected_item_id=? AND rule_kind='protect_item'", current.ID) == 0 {
					t.Fatal("unpinned human head was replaced", current)
				}
			} else if mode == "forget" {
				if current.State != "forgotten" || current.Body != nil || current.RevisionID != "" {
					t.Fatal("late maintenance revived forgotten body", current)
				}
			} else if current.RevisionID != original.RevisionID || current.Body.Text != original.Body.Text {
				t.Fatal("rejected/empty batch changed head", mode, current)
			}
			if !success && sqlCount(t, db, "SELECT count(*) FROM memory_candidates WHERE job_id=?", second.input.Memory.JobID) != 0 {
				t.Fatal("invalid current ancestry escaped through candidate fallback")
			}
			if mode == "invalid-second-candidate" && (run.Reason != "MEMORY_CANDIDATE_INVALID" || sqlCount(t, db, "SELECT count(*) FROM memory_items") != 1) {
				t.Fatal("whole batch was not validated before first write", run)
			}
			if sqlCount(t, db, "SELECT count(*) FROM memory_completion_outbox") != 2 || sqlCount(t, db, "SELECT count(*) FROM memory_jobs") != 2 || ordinary.Load() != 2 || sqlCount(t, db, "SELECT count(*) FROM model_attempts") != 0 {
				t.Fatal("maintenance recursively spawned work or fabricated HTTP accounting")
			}
			job, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: ns, Kind: "job", ID: second.input.Memory.JobID})
			if err != nil || job.Job == nil || job.Job.Run == nil || job.Job.Run.ID != second.input.RunID || job.Job.Run.Status != status {
				t.Fatal("job did not project original real Run", job, err)
			}
			if success && job.Job.Commit != "committed" && job.Job.Commit != "candidate" {
				t.Fatal("successful result has no atomic memory outcome", job)
			}
		})
	}
}

func TestForgottenOriginDoesNotBlockIndependentNewCompletionOrExplicitAdd(t *testing.T) {
	f, a, entered, _ := maintenanceFixture(t)
	ns := namespaceFor(a)
	firstSource := f.start(f.session(a), "same words are not origin identity")
	f.wait(firstSource.RunID, "succeeded")
	f.budget(api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "100"})
	first := nextMaintenance(t, entered)
	first.result <- candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "same generated words", Provenance: "inference"})
	f.wait(first.input.RunID, "succeeded")
	page := f.page(ns, "item")
	if len(page.Items) != 1 || page.Items[0].Item == nil {
		t.Fatal(page)
	}
	old := *page.Items[0].Item
	if _, err := f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(old.Revision), Namespace: ns, ID: old.ID}); err != nil {
		t.Fatal(err)
	}
	newSource := f.start(f.session(a), "same words are not origin identity")
	f.wait(newSource.RunID, "succeeded")
	second := nextMaintenance(t, entered)
	if second.input.Memory.JobID == first.input.Memory.JobID || second.input.Memory.Entries[0].Ref.ID == first.input.Memory.Entries[0].Ref.ID {
		t.Fatal("new real completion reused old stable source")
	}
	for _, entry := range second.input.Memory.Entries {
		if entry.Ref.ID == old.RevisionID {
			t.Fatal("forgotten head was admitted to new maintenance")
		}
	}
	second.result <- candidateResult(api.MemoryCandidateDraft{Operation: "create", Text: "same generated words", Provenance: "inference"})
	f.wait(second.input.RunID, "succeeded")
	page = f.page(ns, "item")
	active := []api.MemoryItem{}
	for _, object := range page.Items {
		if object.Item != nil && object.Item.State == "active" {
			active = append(active, *object.Item)
		}
	}
	if len(active) != 1 || active[0].ID == old.ID || active[0].RevisionID == old.RevisionID || active[0].Body.Text != old.Body.Text {
		t.Fatal("independent origin was suppressed by body/hash instead of identity", page)
	}
	db := f.database()
	if sqlCount(t, db, "SELECT count(*) FROM memory_suppressions WHERE protected_item_id=? AND rule_kind='deny_automatic'", old.ID) < 2 {
		t.Fatal("successful independent origin removed old suppression")
	}
	explicit := f.add(ns, api.MemoryScope{Kind: "profile"}, "same generated words")
	if explicit.Body.Provenance != "user" || len(explicit.Body.Derived) != 0 {
		t.Fatal("explicit user intention was treated as automatic revival", explicit)
	}
	settings := f.page(ns, "item").Settings
	if settings == nil {
		t.Fatal("settings missing")
	}
	if _, err := f.core.API.Memory.SetAutoMaintenance(context.Background(), owner, api.MemorySetAuto{CommandMeta: f.next(settings.Revision), Namespace: ns, Enabled: false}); err != nil {
		t.Fatal(err)
	}
	select {
	case extra := <-entered:
		t.Fatal("maintenance input unexpectedly looped", fmt.Sprint(extra.input.RunID))
	default:
	}
}
