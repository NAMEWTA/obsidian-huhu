package delegation_test

import (
	"context"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestTerminalTaskReplyCreatesNewPrivateRunAndKeepsOriginalBudgetAccount(t *testing.T) {
	for _, kind := range []string{"existing", "temporary"} {
		t.Run(kind, func(t *testing.T) {
			var target string
			created := make(chan api.Delegation, 1)
			checks := make(chan error, 2)
			var callbacks atomic.Int32
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "parent" {
					proposed := api.DelegationTarget{Kind: kind, AgentID: target}
					if kind == "temporary" {
						proposed = api.DelegationTarget{Kind: kind, Draft: &api.AgentDraft{Name: "temporary", Persona: "private", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ProviderID: "controlled", ModelID: "temporary-model", Protocol: "anthropic-messages", Endpoint: "http://127.0.0.1:2", Capabilities: []string{"text"}}}}
					}
					d, e := i.Tools.Invoke(c, api.ToolCall{ID: "delegate", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: proposed, Task: "first task", Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					created <- *d.Delegation
					return api.EngineResult{Status: "finished", Text: "parent"}, nil
				}
				check := func() error {
					purpose := "child"
					if i.Intent == "follow-up task" {
						purpose = "main"
						if i.Lineage.ParentRunID != "" || i.Lineage.RootRunID != i.RunID {
							return fmt.Errorf("reopened old tree: %#v", i.Lineage)
						}
						if _, e := requiredInbox(i, "follow-up task"); e != nil {
							return fmt.Errorf("reply not actual input: %w", e)
						}
					}
					r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "actual-request", Purpose: purpose, InputEstimate: "1", OutputBound: "3"})
					if e != nil {
						return e
					}
					if r.RootRunID != i.Lineage.BudgetRootRunID {
						return fmt.Errorf("wrong budget owner %#v %#v", r, i.Lineage)
					}
					if e = i.Attempts.Dispatch(c, r, func(context.Context) error { callbacks.Add(1); return nil }); e != nil {
						return e
					}
					_, e = i.Attempts.Settle(c, r, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "3", ProducerEnded: true})
					return e
				}()
				checks <- check
				if check != nil {
					return api.EngineResult{}, check
				}
				return api.EngineResult{Status: "finished", Text: i.Intent + " result"}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			a := agent(t, c, "A", []string{b.ID})
			_, e := c.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, c, "budget", "1"), Policy: api.BudgetPolicy{RootTokenLimit: "8", ProfileTokenLimit: "8", MaintenanceTokenLimit: "0"}})
			if e != nil {
				t.Fatal(e)
			}
			root := start(t, c, session(t, c, a), "parent")
			var d api.Delegation
			select {
			case d = <-created:
			case <-time.After(5 * time.Second):
				t.Fatal("no delegated task")
			}
			first := wait(t, c, d.ChildRunID, "succeeded")
			wait(t, c, root.RunID, "succeeded")
			d, e = c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: d.ID})
			if e != nil {
				t.Fatal(e)
			}
			command := api.ReplyCommand{CommandMeta: meta(t, c, "new-user-intent", d.Revision), DelegationID: d.ID, Text: "follow-up task"}
			message, e := c.API.Messages.Reply(ctx, owner, command)
			if e != nil {
				t.Fatal(e)
			}
			replay := command
			replay.CommandID = "new-transport-attempt"
			again, e := c.API.Messages.Reply(ctx, owner, replay)
			if e != nil || again.ID != message.ID {
				t.Fatalf("reply replay %#v %v", again, e)
			}
			next, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: command.ProfileID, ID: message.DelegationID})
			if e != nil {
				t.Fatal(e)
			}
			last := wait(t, c, next.ChildRunID, "succeeded")
			if last.ID == first.ID || last.RootRunID != last.ID || last.ParentRunID != "" || last.BudgetRootRunID != root.RunID || next.WorkThreadID != d.WorkThreadID {
				t.Fatalf("followup relation %#v %#v", last, next)
			}
			if kind == "temporary" && last.AgentID == first.AgentID {
				t.Fatal("temporary identity reused")
			}
			for n := 0; n < 2; n++ {
				select {
				case e := <-checks:
					if e != nil {
						t.Fatal(e)
					}
				case <-time.After(5 * time.Second):
					t.Fatal("attempt not consumed")
				}
			}
			if callbacks.Load() != 2 {
				t.Fatalf("actual callbacks %d", callbacks.Load())
			}
			budget, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: command.ProfileID, RunID: last.ID})
			if e != nil || budget.RootRunID != root.RunID || budget.ChargedTokens != "8" || budget.ReservedTokens != "0" {
				t.Fatalf("inherited account %#v %v", budget, e)
			}
			if count(t, database(t, loc), "SELECT count(*) FROM model_budget_accounts WHERE account_id LIKE 'root:%'") != 1 {
				t.Fatal("new uncharged root allowance")
			}
			wait(t, c, first.ID, "succeeded")
			wait(t, c, root.RunID, "succeeded")
		})
	}
}

func TestSourcedTerminalTemporaryReplyUsesCurrentTypedProofAndAncestorRevocation(t *testing.T) {
	var draft api.AgentDraft
	created := make(chan api.Delegation, 1)
	var models atomic.Int32
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		models.Add(1)
		if len(i.Context.Sources) != 1 || i.Context.Sources[0].Text != "甲😀\nsource body" {
			return api.EngineResult{}, fmt.Errorf("lost actual source %#v", i.Context)
		}
		if i.Intent == "parent" {
			d, e := i.Tools.Invoke(c, api.ToolCall{ID: "temp", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "temporary", Draft: &draft}, Task: "first", Constraints: []string{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			created <- *d.Delegation
		}
		return api.EngineResult{Status: "finished", Text: i.Intent + " result"}, nil
	})
	c, root, loc := open(t, bootstrap.Options{Engine: eng})
	source, _ := attach(t, c)
	a := agent(t, c, "A", nil)
	draft = api.AgentDraft{Name: "ephemeral", Persona: "actual", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ProviderID: "temporary-provider", ModelID: "temporary-model", Protocol: "openai-responses", Endpoint: "http://127.0.0.1:9", Capabilities: []string{"text"}}}
	g := grant(t, c, source, recipient(a))
	grant(t, c, source, template(t, c, a.ID, draft))
	s := session(t, c, a)
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "start-source", s.Revision), SessionID: s.ID, Intent: "parent", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}})
	if e != nil {
		t.Fatal(e)
	}
	var d api.Delegation
	select {
	case d = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("source temporary not created")
	}
	wait(t, c, r.RunID, "succeeded")
	d, e = c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: d.ID})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = c.API.Messages.Reply(ctx, owner, api.ReplyCommand{CommandMeta: meta(t, c, "foreign-terminal", d.Revision), DelegationID: d.ID, Text: "must not start", SourceRefs: []api.SourceSnapshot{thirdSource(source)}}); !reason(e, "PARENT_SCOPE_EXCEEDED") {
		t.Fatalf("terminal user discarded proposed source: %v", e)
	}
	if count(t, database(t, loc), "SELECT count(*) FROM execution_runs") != 2 {
		t.Fatal("foreign terminal source created work")
	}
	m, e := c.API.Messages.Reply(ctx, owner, api.ReplyCommand{CommandMeta: meta(t, c, "follow-source", d.Revision), DelegationID: d.ID, Text: "follow"})
	if e != nil {
		t.Fatal(e)
	}
	next, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: m.DelegationID})
	if e != nil {
		t.Fatal(e)
	}
	wait(t, c, next.ChildRunID, "succeeded")
	before := models.Load()
	if before != 3 {
		t.Fatalf("actual source models=%d", before)
	}
	if _, e = c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, c, "revoke-ancestor", g.Revision), ID: g.ID}); e != nil {
		t.Fatal(e)
	}
	if _, e = c.API.Messages.Reply(ctx, owner, api.ReplyCommand{CommandMeta: meta(t, c, "revoked-follow", next.Revision), DelegationID: next.ID, Text: "blocked follow"}); e == nil {
		t.Fatal("terminal reply renewed revoked ancestor authority")
	}
	if models.Load() != before {
		t.Fatal("revoked followup reached model")
	}
	profile := meta(t, c, "q", "").ProfileID
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	reopened, e := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	if _, e = reopened.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: profile, ID: next.ID}); e == nil {
		t.Fatal("reopen lost current ancestor revocation")
	}
}
