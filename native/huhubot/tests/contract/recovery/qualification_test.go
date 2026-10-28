package recovery_test

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func oldIDs(t *testing.T) (string, string) {
	t.Helper()
	b, e := os.ReadFile("testdata/schema8/inflight-resume-entered.json")
	if e != nil {
		t.Fatal(e)
	}
	var old struct{ RootRunID, ModelRunID string }
	if e = json.Unmarshal(b, &old); e != nil {
		t.Fatal(e)
	}
	return old.RootRunID, old.ModelRunID
}
func validOldCheckpoint(_ context.Context, i api.CheckpointInspection) error {
	b, e := io.ReadAll(i.Reader)
	if e != nil {
		return e
	}
	var cp struct {
		Fixture, Phase string
		Version        int
	}
	if json.Unmarshal(b, &cp) != nil || cp.Fixture != "lead-v8-complete-cp" || cp.Phase != "children" || cp.Version != 1 {
		return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "CONTROLLED_CHECKPOINT_SEMANTICS"}
	}
	return nil
}
func resumeCommand(t *testing.T, c *bootstrap.Core, s api.RecoveryStatus, key string) api.RunResume {
	return api.RunResume{CommandMeta: meta(t, c, key, s.Revision), ID: s.RunID, RecoveryGeneration: s.Generation}
}

func TestReadyDoesNotAuthorizeCorruptCheckpointOrStaleGenerationAndResumeReceiptRollsBackAtomically(t *testing.T) {
	for _, which := range []string{"cp-after-ready", "generation", "receipt-statement", "inspection-statement"} {
		t.Run(which, func(t *testing.T) {
			root, loc := fixture(t, "inflight")
			_, run := oldIDs(t)
			c := open(t, root, loc, bootstrap.Options{ExecutorPaused: true, Engine: engine{inspect: validOldCheckpoint}})
			s := inspect(t, c, run)
			if s.State != "ready" {
				t.Fatal(s)
			}
			command := resumeCommand(t, c, s, "same-original-resume")
			d := db(t, loc)
			switch which {
			case "cp-after-ready", "generation":
				entries, e := os.ReadDir(filepath.Join(loc, "checkpoints"))
				if e != nil || len(entries) != 1 {
					t.Fatal(e)
				}
				p := filepath.Join(loc, "checkpoints", entries[0].Name())
				original, e := os.ReadFile(p)
				if e != nil {
					t.Fatal(e)
				}
				broken := append([]byte{}, original...)
				broken[len(broken)-1] ^= 1
				if e = os.WriteFile(p, broken, 0600); e != nil {
					t.Fatal(e)
				}
				if _, e = c.API.Recovery.Resume(ctx, owner, command); !reason(e, "CHECKPOINT_INVALID") {
					t.Fatalf("ready allowed changed CP: %v", e)
				}
				if which == "generation" {
					bad := inspect(t, c, run)
					if bad.State != "blocked" || bad.Generation == s.Generation {
						t.Fatal("invalidated inspection kept original generation")
					}
					if e = os.WriteFile(p, original, 0600); e != nil {
						t.Fatal(e)
					}
					now := inspect(t, c, run)
					if now.State != "ready" || now.Generation == s.Generation {
						t.Fatal(now)
					}
					if _, e = c.API.Recovery.Resume(ctx, owner, command); !reason(e, "RECOVERY_GENERATION_CONFLICT") {
						t.Fatalf("stale recovery generation accepted: %v", e)
					}
				}
			case "receipt-statement":
				if _, e := d.Exec("CREATE TRIGGER reject_resume_receipt BEFORE INSERT ON command_receipts WHEN NEW.method='runs.resume' BEGIN SELECT RAISE(ABORT,'controlled receipt failure'); END"); e != nil {
					t.Fatal(e)
				}
				before := oldRows(t, d, nil)
				if _, e := c.API.Recovery.Resume(ctx, owner, command); e == nil || !strings.Contains(e.Error(), "controlled receipt failure") {
					t.Fatalf("receipt SQL was swallowed: %v", e)
				}
				if !reflect.DeepEqual(before, oldRows(t, d, columns(before))) {
					t.Fatal("receipt fault committed recovery gate/Run/event/usage/pin")
				}
				if _, e := d.Exec("DROP TRIGGER reject_resume_receipt"); e != nil {
					t.Fatal(e)
				}
				if _, e := c.API.Recovery.Resume(ctx, owner, command); e != nil {
					t.Fatal(e)
				}
				return
			case "inspection-statement":
				if _, e := d.Exec("CREATE TRIGGER reject_recovery_publish BEFORE UPDATE ON execution_recovery_trees BEGIN SELECT RAISE(ABORT,'controlled inspection failure'); END"); e != nil {
					t.Fatal(e)
				}
				before := oldRows(t, d, nil)
				if _, e := c.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: command.ProfileID, ID: run}); e == nil || !strings.Contains(e.Error(), "controlled inspection failure") {
					t.Fatalf("inspection SQL hidden as blocked/success: %v", e)
				}
				if !reflect.DeepEqual(before, oldRows(t, d, columns(before))) {
					t.Fatal("failed eligibility publication changed durable facts")
				}
			}
			if get(t, c, run).Status != "interrupted" || count(t, d, "SELECT count(*) FROM command_receipts WHERE method='runs.resume'") != 0 || count(t, d, "SELECT count(*) FROM collaboration_result_deliveries") != 1 {
				t.Fatal("rejected resume changed original tree")
			}
		})
	}
}

func TestConcurrentDifferentResumeKeysReleaseOriginalTreeOnlyOnce(t *testing.T) {
	root, loc := fixture(t, "inflight")
	_, run := oldIDs(t)
	c := open(t, root, loc, bootstrap.Options{ExecutorPaused: true, Engine: engine{inspect: validOldCheckpoint}})
	s := inspect(t, c, run)
	commands := []api.RunResume{resumeCommand(t, c, s, "resume-one"), resumeCommand(t, c, s, "resume-two")}
	start := make(chan struct{})
	out := make(chan error, 2)
	var wg sync.WaitGroup
	for _, command := range commands {
		wg.Add(1)
		go func(command api.RunResume) {
			defer wg.Done()
			<-start
			_, e := c.API.Recovery.Resume(ctx, owner, command)
			out <- e
		}(command)
	}
	close(start)
	wg.Wait()
	close(out)
	success := 0
	for e := range out {
		if e == nil {
			success++
		} else if !reason(e, "REVISION_CONFLICT") && !reason(e, "RECOVERY_NOT_READY") && !reason(e, "RECOVERY_TREE_CHANGED") {
			t.Fatalf("wrong loser error: %v", e)
		}
	}
	d := db(t, loc)
	if success != 1 || count(t, d, "SELECT count(*) FROM command_receipts WHERE method='runs.resume'") != 1 || count(t, d, "SELECT count(*) FROM execution_events WHERE event_type='recovering'") != 1 || count(t, d, "SELECT count(*) FROM execution_runs WHERE status='recovering'") != 1 {
		t.Fatal("concurrent resume duplicated release/Run/event/receipt")
	}
}

func TestReadyTreeRevisionIgnoresUnrelatedPrivateMemory(t *testing.T) {
	root, loc := fixture(t, "inflight")
	_, runID := oldIDs(t)
	core := open(t, root, loc, bootstrap.Options{ExecutorPaused: true, Engine: engine{inspect: validOldCheckpoint}})
	unrelated := agent(t, core, "unrelated-memory", nil)
	namespace := api.MemoryNamespace{Kind: "agent", ID: unrelated.ID}
	profileID := readyProfile(t, core)
	before := inspect(t, core, runID)
	if before.State != "ready" || before.TreeRevision == "" {
		t.Fatal("original interrupted tree is not ready", before)
	}
	page, err := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: profileID, Namespace: namespace, Kind: "item"})
	if err != nil {
		t.Fatal(err)
	}
	scope := api.MemoryScope{Kind: "profile"}
	item, err := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{
		CommandMeta: meta(t, core, "unrelated-memory-add", page.NamespaceRevision), Namespace: namespace,
		Action: "add", Scope: &scope, Text: "private fact outside the interrupted tree",
	})
	if err != nil {
		t.Fatal(err)
	}
	afterAdd := inspect(t, core, runID)
	if afterAdd.State != "ready" || afterAdd.TreeRevision != before.TreeRevision || afterAdd.Generation != before.Generation {
		t.Fatal("unrelated memory addition invalidated recovery tree", before, afterAdd)
	}
	_, err = core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{
		CommandMeta: meta(t, core, "unrelated-memory-correct", item.Revision), Namespace: namespace,
		Action: "correct", ID: item.ID, Text: "updated private fact outside the interrupted tree",
	})
	if err != nil {
		t.Fatal(err)
	}
	afterCorrect := inspect(t, core, runID)
	if afterCorrect.State != "ready" || afterCorrect.TreeRevision != before.TreeRevision || afterCorrect.Generation != before.Generation {
		t.Fatal("unrelated memory correction invalidated recovery tree", before, afterCorrect)
	}
}

func TestMembershipMutationDuringOutsideCheckpointInspectionInvalidatesWholeTreePublication(t *testing.T) {
	root, loc := fixture(t, "inflight")
	rootID, run := oldIDs(t)
	var armed atomic.Bool
	entered := make(chan struct{}, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engine{inspect: func(c context.Context, i api.CheckpointInspection) error {
		if armed.Load() {
			entered <- struct{}{}
			select {
			case <-release:
			case <-c.Done():
				return c.Err()
			}
		}
		return validOldCheckpoint(c, i)
	}}
	c := open(t, root, loc, bootstrap.Options{ExecutorPaused: true, Engine: eng})
	s := inspect(t, c, run)
	profileID := readyProfile(t, c)
	armed.Store(true)
	done := make(chan error, 1)
	go func() { _, e := c.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: profileID, ID: run}); done <- e }()
	<-entered
	session, e := c.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: readyProfile(t, c), ID: get(t, c, rootID).SessionID})
	if e != nil {
		t.Fatal(e)
	}
	// The real current proof contains B+C. Remove C, even though its terminal
	// result was previously consumed: old private contributions stay binding.
	keep := []string{}
	for _, member := range session.GroupMembers {
		if member.AgentID == get(t, c, run).AgentID || member.AgentID == session.CoordinatorID {
			keep = append(keep, member.AgentID)
		}
	}
	if len(keep) != 2 {
		t.Fatal("fixture member identification")
	}
	if _, e = c.API.Groups.UpdateMembers(ctx, owner, api.SessionMembersUpdate{CommandMeta: meta(t, c, "remove-contributor", session.Revision), ID: session.ID, MemberIDs: keep, HistoryScope: api.GroupHistoryScope{Kind: "none"}}); e != nil {
		t.Fatal(e)
	}
	once.Do(func() { close(release) })
	if e = <-done; !reason(e, "RECOVERY_TREE_CHANGED") {
		t.Fatalf("inspection published stale tree: %v", e)
	}
	if _, e = c.API.Recovery.Resume(ctx, owner, resumeCommand(t, c, s, "stale-membership")); e == nil {
		t.Fatal("stale member qualification resumed old work")
	}
	if count(t, db(t, loc), "SELECT count(*) FROM command_receipts WHERE method='runs.resume'") != 0 {
		t.Fatal("stale inspection left release receipt")
	}
}
