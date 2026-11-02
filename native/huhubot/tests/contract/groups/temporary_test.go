package groups_test

import (
	"context"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestNestedTemporaryGroupWorkUsesActualMemberAncestorAndCurrentDispatchFence(t *testing.T) {
	for _, existing := range []bool{false, true} {
		for _, removed := range []bool{false, true} {
			t.Run(fmt.Sprintf("existing=%v/remove=%v", existing, removed), func(t *testing.T) {
				var target string
				ready := make(chan api.EngineInput, 1)
				release := make(chan struct{})
				var once sync.Once
				defer once.Do(func() { close(release) })
				var callbacks, calls atomic.Int32
				eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
					calls.Add(1)
					if i.Lineage.Group == nil || len(i.Lineage.Group.Members) < 1 {
						return api.EngineResult{}, fmt.Errorf("actual ancestor binding missing")
					}
					if i.Intent == "nested group" || i.Intent == "first temporary" {
						draft := api.AgentDraft{Name: "temporary-one", Persona: "separate", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{target}, Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}
						next := api.DelegationTarget{Kind: "temporary", Draft: &draft}
						task := "first temporary"
						if i.Intent == "first temporary" {
							task = "leaf"
							if existing {
								next = api.DelegationTarget{Kind: "existing", AgentID: target}
							} else {
								draft.Name = "temporary-two"
								draft.AllowedTools = []string{}
								draft.AllowedCollaborationTargets = []string{}
							}
						}
						_, e := i.Tools.Invoke(c, api.ToolCall{ID: "next", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: next, Task: task, Constraints: []string{}}})
						return api.EngineResult{Status: "finished", Text: "parent application result"}, e
					}
					reservation, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "nested-leaf", InputEstimate: "1", OutputBound: "2"})
					if e != nil {
						return api.EngineResult{}, e
					}
					ready <- i
					<-release
					e = i.Attempts.Dispatch(context.Background(), reservation, func(context.Context) error { callbacks.Add(1); return nil })
					if e != nil {
						e = i.Attempts.AbortUnsent(context.Background(), reservation)
					} else {
						_, e = i.Attempts.Settle(context.Background(), reservation, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true})
					}
					return api.EngineResult{Status: "finished", Text: "leaf result"}, e
				})
				c, loc := open(t, bootstrap.Options{Engine: eng, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}})
				a := agent(t, c, "A", false)
				b := agent(t, c, "B", true)
				d := agent(t, c, "C", true)
				target = d.ID
				b = allow(t, c, b, []string{"agents.delegate"}, []string{target})
				s := group(t, c, a, b, d)
				root := send(t, c, s, "nested group", b.ID)
				var leaf api.EngineInput
				select {
				case leaf = <-ready:
				case <-time.After(3 * time.Second):
					t.Fatal("actual nested temporary leaf not reached")
				}
				if existing && leaf.Agent.ID != d.ID || !existing && !strings.HasPrefix(leaf.Agent.ID, "temporary:") {
					t.Fatalf("actual leaf identity %#v", leaf.Agent)
				}
				found := false
				for _, m := range leaf.Lineage.Group.Members {
					if m.AgentID == b.ID && m.Incarnation == "1" {
						found = true
					}
				}
				if !found {
					t.Fatal("leaf replaced actual initiating member with temporary subject")
				}
				if !existing && (leaf.Config.SponsorAgentID != b.ID || len(leaf.Lineage.Group.Members) != 1) {
					t.Fatalf("temporary sponsor/member chain %#v %#v", leaf.Config, leaf.Lineage.Group)
				}
				if removed {
					update(t, c, getSession(t, c, s.ID), []string{a.ID, d.ID}, api.GroupHistoryScope{Kind: "none"})
				}
				once.Do(func() { close(release) })
				wait(t, c, root.RunID)
				want := int32(1)
				if removed {
					want = 0
				}
				if callbacks.Load() != want || calls.Load() != 3 {
					t.Fatalf("actual nested Dispatch/calls=%d/%d", callbacks.Load(), calls.Load())
				}
				if e := c.Close(); e != nil {
					t.Fatal(e)
				}
				db := database(t, loc)
				if count(t, db, "SELECT count(*) FROM agents") != 4 {
					t.Fatal("temporary created persistent agents")
				}
				if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
					t.Fatal("nested terminal pin/slot retained")
				}
			})
		}
	}
}
