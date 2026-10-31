package approval_test

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestReadyContinuationPassesAnotherRootsOccupiedChildSlot(t *testing.T) {
	type children struct {
		root, note, held string
		index            int
	}
	created := make(chan children, 2)
	entered := make(chan int, 2)
	resumed := make(chan string, 4)
	releases := [2]chan struct{}{make(chan struct{}), make(chan struct{})}
	var once [2]sync.Once
	var mu sync.Mutex
	resumeCounts := map[string]int{}
	var workerID string
	eng := engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		if strings.HasPrefix(in.Intent, "parent-") {
			n, err := strconv.Atoi(strings.TrimPrefix(in.Intent, "parent-"))
			if err != nil {
				return api.EngineResult{}, err
			}
			ids := []string{}
			for j, task := range []string{"note", fmt.Sprintf("held-%d", n)} {
				r, err := in.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprintf("delegate-%d", j), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: workerID}, Task: task, Constraints: []string{}}})
				if err != nil {
					return api.EngineResult{}, err
				}
				if r.Delegation == nil {
					return api.EngineResult{}, fmt.Errorf("missing real child admission")
				}
				ids = append(ids, r.Delegation.ChildRunID)
			}
			created <- children{in.RunID, ids[0], ids[1], n}
			return api.EngineResult{Status: "finished", Text: "parent"}, nil
		}
		if in.Intent == "note" {
			return suspend(c, in)
		}
		n, err := strconv.Atoi(strings.TrimPrefix(in.Intent, "held-"))
		if err != nil {
			return api.EngineResult{}, err
		}
		entered <- n
		select {
		case <-releases[n]:
			return api.EngineResult{Status: "finished", Text: "released"}, nil
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
	}, resume: func(c context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		if in.Decision.Status != "denied" || in.Decision.Reason != "APPROVAL_REJECTED" {
			return api.EngineResult{}, fmt.Errorf("changed original rejection decision: %#v", in.Decision)
		}
		r, err := in.Input.Checkpoints.Open(c, in.Checkpoint)
		if err != nil {
			return api.EngineResult{}, err
		}
		b, readErr := io.ReadAll(r)
		closeErr := r.Close()
		if readErr != nil || closeErr != nil || string(b) != "private-engine-state" {
			return api.EngineResult{}, fmt.Errorf("original checkpoint lost: %v/%v", readErr, closeErr)
		}
		mu.Lock()
		resumeCounts[in.Input.RunID]++
		mu.Unlock()
		resumed <- in.Input.RunID
		return api.EngineResult{Status: "finished", Text: "denied original effect"}, nil
	}}
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	w := &writer{revision: "1"}
	c, err := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: eng, NoteWriter: w, ApprovalLifetime: time.Minute, ExecutionLimits: api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 1, ProfileChildren: 8, MaxWakes: 8}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := c.Close(); err != nil {
			t.Error(err)
		}
		bounded, cancel := context.WithTimeout(ctx, 6*time.Second)
		defer cancel()
		if err := c.WaitClosed(bounded); err != nil {
			t.Error(err)
		}
	})
	t.Cleanup(func() {
		for n := range releases {
			once[n].Do(func() { close(releases[n]) })
		}
	})
	w.host = c.API.Host
	if _, err := c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.write"}}, host{}); err != nil {
		t.Fatal(err)
	}
	worker, err := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "worker", ""), Draft: api.AgentDraft{Name: "worker", AllowedTools: []string{"note.write"}}})
	if err != nil {
		t.Fatal(err)
	}
	workerID = worker.ID
	parent, err := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "parent", ""), Draft: api.AgentDraft{Name: "parent", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{worker.ID}}})
	if err != nil {
		t.Fatal(err)
	}
	for n := range 2 {
		s, err := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, fmt.Sprintf("session-%d", n), ""), Kind: "direct", MemberIDs: []string{parent.ID}, WorkspaceID: "workspace:one"})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, fmt.Sprintf("run-%d", n), s.Revision), SessionID: s.ID, Intent: fmt.Sprintf("parent-%d", n), SourceRefs: []api.SourceSnapshot{}}); err != nil {
			t.Fatal(err)
		}
	}
	all := []children{}
	for range 2 {
		select {
		case item := <-created:
			all = append(all, item)
		case <-time.After(6 * time.Second):
			t.Fatal("actual delegation absent")
		}
		select {
		case <-entered:
		case <-time.After(6 * time.Second):
			t.Fatal("real held child did not acquire slot")
		}
	}
	sort.Slice(all, func(i, j int) bool { return all[i].note < all[j].note })
	blocked, eligible := all[0], all[1]
	f := &fixture{core: c, root: root, locator: filepath.Join(root, "one"), writer: w, command: api.RunStart{CommandMeta: meta(t, c, "query", "")}}
	once[eligible.index].Do(func() { close(releases[eligible.index]) })
	waitRun(t, f, eligible.held, "succeeded")
	waitRun(t, f, blocked.held, "running")
	page, err := c.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: f.command.ProfileID})
	if err != nil || len(page.Items) != 2 {
		t.Fatal("two actual pending checkpoints required", page, err)
	}
	byRun := map[string]api.Approval{}
	for _, a := range page.Items {
		byRun[a.RunID] = a
	}
	for _, item := range []children{blocked, eligible} {
		a := byRun[item.note]
		if a.ID == "" {
			t.Fatal("approval did not belong to original child", item.note)
		}
		if _, err := c.API.Approvals.Resolve(ctx, owner, api.ApprovalResolve{CommandMeta: meta(t, c, "reject-"+a.ID, a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: "reject", PreviewHash: a.Preview.PreviewHash}); err != nil {
			t.Fatal(err)
		}
	}
	select {
	case id := <-resumed:
		if id != eligible.note {
			t.Fatal("occupied root slot was bypassed", id)
		}
	case <-time.After(3 * time.Second):
		t.Error("first continuation's occupied root slot starved the other root's original checkpoint")
		// Old-source single-variable control only frees the different root's
		// real producer. Both original continuation identities remain unchanged.
		once[blocked.index].Do(func() { close(releases[blocked.index]) })
		waitRun(t, f, eligible.note, "succeeded")
	}
	if !t.Failed() {
		waitRun(t, f, blocked.note, "waiting_approval")
	}
	once[blocked.index].Do(func() { close(releases[blocked.index]) })
	for _, item := range all {
		waitRun(t, f, item.note, "succeeded")
		waitRun(t, f, item.root, "succeeded")
	}
	mu.Lock()
	if len(resumeCounts) != 2 || resumeCounts[blocked.note] != 1 || resumeCounts[eligible.note] != 1 {
		t.Error("original checkpoints not consumed once", resumeCounts)
	}
	mu.Unlock()
	d := db(t, f)
	if count(t, d, "SELECT count(*) FROM execution_continuations WHERE state='completed'") != 2 || count(t, d, "SELECT COALESCE(sum(child_slot),0) FROM execution_runs") != 0 || count(t, d, "SELECT count(*) FROM task_config_pins") != 0 || w.count() != 0 {
		t.Fatal("slot/pin/decision or rejected effect ownership changed")
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	<-c.Done()
	t.Log("two public rejected approvals, real CP/Resume each once; held first root does not block other root; zero Host writes; Core Done")
}
