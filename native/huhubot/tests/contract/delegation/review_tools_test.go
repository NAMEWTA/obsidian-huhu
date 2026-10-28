package delegation_test

import (
	"context"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"testing"
	"time"
)

func TestPinnedToolAllowlistGuardsActualCollaborationEffects(t *testing.T) {
	for _, allow := range []bool{true, false} {
		t.Run(fmt.Sprint("allowed=", allow), func(t *testing.T) {
			var target string
			results := make(chan [2]error, 1)
			entered := make(chan string, 1)
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "caller" {
					t.Logf("actual pinned AllowedTools=%v AllowedTargets=%v", i.Agent.AllowedTools, i.Agent.AllowedCollaborationTargets)
					_, de := i.Tools.Invoke(c, api.ToolCall{ID: "delegate", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "unauthorized-child", Constraints: []string{}}})
					_, me := i.Tools.Invoke(c, api.ToolCall{ID: "notify", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "notify", Text: "unauthorized-notify", SourceRefs: []api.SourceSnapshot{}}})
					results <- [2]error{de, me}
				} else {
					entered <- i.RunID
				}
				return api.EngineResult{Status: "finished", Text: "done"}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			allowed := []string{}
			if allow {
				allowed = []string{"agents.delegate", "agents.message"}
			}
			a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "caller-agent", ""), Draft: api.AgentDraft{Name: "A", Persona: "plain", AllowedTools: allowed, AllowedCollaborationTargets: []string{b.ID}, Model: &b.Model.ModelBindingDraft}})
			if e != nil {
				t.Fatal(e)
			}
			root := start(t, c, session(t, c, a), "caller")
			var errs [2]error
			select {
			case errs = <-results:
			case <-time.After(2 * time.Second):
				t.Fatal("actual tool consumer not entered")
			}
			wait(t, c, root.RunID, "succeeded")
			d := database(t, loc)
			children := count(t, d, "SELECT count(*) FROM collaboration_delegations WHERE parent_run_id=?", root.RunID)
			messages := count(t, d, "SELECT count(*) FROM collaboration_messages WHERE from_run_id=? AND kind='notify'", root.RunID)
			t.Logf("Invoke errors delegate=%v notify=%v; persisted children=%d notifyMessages=%d actual child Engine calls=%d", errs[0], errs[1], children, messages, len(entered))
			if allow {
				if errs[0] != nil || errs[1] != nil || children != 1 || messages != 1 {
					t.Fatal("authorized control failed")
				}
			} else if errs[0] == nil || errs[1] == nil || children != 0 || messages != 0 {
				t.Error("Broker accepted collaboration tools absent from pinned AllowedTools and committed their effects")
			}
		})
	}
}
