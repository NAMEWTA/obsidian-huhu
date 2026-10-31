package delegation_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestEveryCollaborationToolUsesActualPinnedCapabilitiesForExistingAndTemporary(t *testing.T) {
	for _, kind := range []string{"existing", "temporary"} {
		t.Run(kind, func(t *testing.T) {
			var target string
			entered := make(chan api.EngineInput, 1)
			release := make(chan struct{})
			result := make(chan error, 1)
			var once sync.Once
			defer once.Do(func() { close(release) })
			var calls atomic.Int32
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				calls.Add(1)
				if i.Intent == "root" {
					d := api.DelegationTarget{Kind: "existing", AgentID: target}
					if kind == "temporary" {
						d = api.DelegationTarget{Kind: "temporary", Draft: &api.AgentDraft{Name: "Temporary limited", Persona: "isolated", AllowedTools: []string{}, AllowedCollaborationTargets: []string{target}, Model: &i.Agent.Model.ModelBindingDraft}}
					}
					_, e := i.Tools.Invoke(c, api.ToolCall{ID: "caller", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: d, Task: "caller", Constraints: []string{}}})
					return api.EngineResult{Status: "finished", Text: "root"}, e
				}
				if i.Intent != "caller" {
					return api.EngineResult{}, fmt.Errorf("unauthorized child entered")
				}
				entered <- i
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				check := func() error {
					for _, call := range []api.ToolCall{
						{ID: "discover", Name: "agents.discover", Discover: &api.DiscoverQuery{PageQuery: api.PageQuery{Limit: 1}}},
						{ID: "delegate", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "forbidden", Constraints: []string{}}},
						{ID: "notify", Name: "agents.message", Message: &api.MessageCommand{Kind: "notify", TargetAgentID: target, Text: "forbidden"}},
						{ID: "get", Name: "tasks.get", TaskQuery: &api.IDQuery{ID: i.Lineage.DelegationID}},
						{ID: "list", Name: "tasks.list", TaskList: &api.DelegationQuery{PageQuery: api.PageQuery{Limit: 10}}},
						{ID: "reply", Name: "tasks.reply", Reply: &api.ReplyCommand{CommandMeta: api.CommandMeta{ExpectedRevision: "1"}, DelegationID: i.Lineage.DelegationID, Text: "forbidden"}},
						{ID: "proposal", Name: "agents.proposeCreate", Proposal: &api.CreateProposal{Draft: api.AgentDraft{Name: "forbidden proposal", Persona: "plain"}}},
						{ID: "cancel", Name: "tasks.cancel", Cancel: &api.TaskCancel{CommandMeta: api.CommandMeta{ExpectedRevision: "1"}, ID: i.Lineage.DelegationID}},
					} {
						if _, e := i.Tools.Invoke(c, call); !reason(e, "TOOL_NOT_ALLOWED") {
							return fmt.Errorf("%s did not reject pinned capability: %v", call.Name, e)
						}
					}
					return nil
				}()
				result <- check
				return api.EngineResult{Status: "finished", Text: "caller"}, check
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "restrict", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: []string{}, AllowedCollaborationTargets: []string{b.ID}}})
			if e != nil {
				t.Fatal(e)
			}
			a := agent(t, c, "A", []string{b.ID})
			root := start(t, c, session(t, c, a), "root")
			var actual api.EngineInput
			select {
			case actual = <-entered:
			case <-time.After(5 * time.Second):
				t.Fatal("caller not running")
			}
			if len(actual.Agent.AllowedTools) != 0 || actual.Config.Kind != map[string]string{"existing": "agent", "temporary": "temporary"}[kind] {
				t.Fatal("wrong pinned caller")
			}
			// Editing the directory head cannot enlarge an accepted existing task, and
			// a temporary task cannot borrow its sponsor's broader pinned capabilities.
			if kind == "existing" {
				_, e = c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "expand", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
				if e != nil {
					t.Fatal(e)
				}
			}
			db := database(t, loc)
			beforeReceipts := count(t, db, "SELECT count(*) FROM command_receipts")
			once.Do(func() { close(release) })
			select {
			case e := <-result:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("gateway stalled")
			}
			wait(t, c, root.RunID, "succeeded")
			if calls.Load() != 2 || count(t, db, "SELECT count(*) FROM collaboration_delegations") != 1 || count(t, db, "SELECT count(*) FROM collaboration_messages") != 0 || count(t, db, "SELECT count(*) FROM collaboration_proposals") != 0 || count(t, db, "SELECT count(*) FROM command_receipts") != beforeReceipts {
				t.Fatal("denied tool committed work/message/proposal/receipt")
			}
		})
	}
}
