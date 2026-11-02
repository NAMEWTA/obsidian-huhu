package delegation_test

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestActualChildClaimsRespectRootFourProfileEightAndQueuedWorkDoesNotConsumeSlots(t *testing.T) {
	var target string
	entered := make(chan string, 32)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var active, maxActive atomic.Int32
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if strings.HasPrefix(i.Intent, "root-") {
			for n := 0; n < 6; n++ {
				if _, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: fmt.Sprintf("child-%s-%d", i.Intent, n), Constraints: []string{}}}); e != nil {
					return api.EngineResult{}, e
				}
			}
			return api.EngineResult{Status: "finished", Text: "root"}, nil
		}
		n := active.Add(1)
		defer active.Add(-1)
		for {
			m := maxActive.Load()
			if n <= m || maxActive.CompareAndSwap(m, n) {
				break
			}
		}
		entered <- i.RunID
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "child"}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	target = b.ID
	a := agent(t, c, "A", []string{b.ID})
	roots := []api.RunReceipt{}
	for n := 0; n < 3; n++ {
		roots = append(roots, start(t, c, session(t, c, a), fmt.Sprint("root-", n)))
	}
	for n := 0; n < 8; n++ {
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("profile capacity not filled")
		}
	}
	db := database(t, loc)
	deadline := time.Now().Add(5 * time.Second)
	for count(t, db, "SELECT count(*) FROM collaboration_delegations") != 18 {
		if time.Now().After(deadline) {
			t.Fatal("roots blocked before queue admission")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if got := count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot=1"); got != 8 {
		t.Fatalf("claimed slots=%d", got)
	}
	if got := count(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id<>'' AND status='accepted' AND child_slot=0"); got != 10 {
		t.Fatalf("queued slots=%d", got)
	}
	for _, r := range roots {
		if n := count(t, db, "SELECT count(*) FROM execution_runs WHERE root_run_id=? AND child_slot=1", r.RunID); n > 4 {
			t.Fatalf("root concurrency %d", n)
		}
	}
	once.Do(func() { close(release) })
	for _, r := range roots {
		wait(t, c, r.RunID, "succeeded")
	}
	if maxActive.Load() != 8 || count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 {
		t.Fatalf("producer lifecycle max=%d", maxActive.Load())
	}
	if count(t, db, "SELECT count(*) FROM execution_runs") != 21 {
		t.Fatal("parent join performed extra model work")
	}
}

func TestPersistentDepthTotalChildrenAndQuestionWakeBounds(t *testing.T) {
	for _, which := range []string{"depth", "count", "wakes"} {
		t.Run(which, func(t *testing.T) {
			var target string
			checked := make(chan error, 1)
			var rootModels atomic.Int32
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if which == "depth" {
					depth, _ := strconv.Atoi(strings.TrimPrefix(i.Intent, "depth-"))
					_, e := i.Tools.Invoke(c, api.ToolCall{ID: "next", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: fmt.Sprint("depth-", depth+1), Constraints: []string{}}})
					if depth == 3 {
						if !reason(e, "DELEGATION_DEPTH_LIMIT") {
							checked <- fmt.Errorf("depth fourth accepted: %v", e)
						} else {
							checked <- nil
						}
					} else if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "finished", Text: "layer"}, nil
				}
				if i.Intent != "root" {
					return api.EngineResult{Status: "finished", Text: "child"}, nil
				}
				rootModels.Add(1)
				max := 32
				expected := "DELEGATION_COUNT_LIMIT"
				if which == "wakes" {
					max = 8
					expected = "MESSAGE_WAKE_LIMIT"
				}
				for n := 0; n <= max; n++ {
					var e error
					if which == "wakes" {
						_, e = i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "question", Text: fmt.Sprint("question-", n), SourceRefs: []api.SourceSnapshot{}}})
					} else {
						_, e = i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: fmt.Sprint("child-", n), Constraints: []string{}}})
					}
					if n == max {
						if !reason(e, expected) {
							checked <- fmt.Errorf("limit %s: %v", which, e)
						} else {
							checked <- nil
						}
					} else if e != nil {
						return api.EngineResult{}, e
					}
				}
				return api.EngineResult{Status: "finished", Text: "root"}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self-target", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Description: b.Description, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
			if e != nil {
				t.Fatal(e)
			}
			a := agent(t, c, "A", []string{b.ID})
			text := "root"
			if which == "depth" {
				text = "depth-0"
			}
			r := start(t, c, session(t, c, a), text)
			// Liveness only. Thirty-two child delegations under a parallel
			// `go test ./...` on a shared runner can pass 5s before the
			// limit call returns. The persisted-count assertion below stays.
			select {
			case e := <-checked:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(30 * time.Second):
				t.Fatal("limit not exercised")
			}
			wait(t, c, r.RunID, "succeeded")
			expected := map[string]int{"depth": 3, "count": 32, "wakes": 8}[which]
			db := database(t, loc)
			if n := count(t, db, "SELECT count(*) FROM collaboration_delegations"); n != expected {
				t.Fatalf("persisted count=%d", n)
			}
			if which == "depth" && count(t, db, "SELECT count(DISTINCT work_thread_id) FROM execution_runs WHERE agent_id=?", b.ID) != 3 {
				t.Fatal("same Bot isolated threads incorrectly blocked")
			}
		})
	}
}
