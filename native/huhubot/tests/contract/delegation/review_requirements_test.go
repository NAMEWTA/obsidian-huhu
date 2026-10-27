package delegation_test

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"sync"
	"testing"
	"time"
)

func TestAcceptedDelegationRequirementsReachActualChildEngine(t *testing.T) {
	for _, kind := range []string{"existing", "temporary"} {
		t.Run(kind, func(t *testing.T) {
			entered := make(chan struct{})
			release := make(chan struct{})
			observed := make(chan api.EngineInput, 1)
			var once sync.Once
			defer once.Do(func() { close(release) })
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "parent" {
					close(entered)
					select {
					case <-release:
					case <-c.Done():
					}
				} else {
					observed <- i
				}
				return api.EngineResult{Status: "finished", Text: "done"}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			a := agent(t, c, "A", []string{b.ID})
			root := start(t, c, session(t, c, a), "parent")
			select {
			case <-entered:
			case <-time.After(time.Second):
				t.Fatal("parent not running")
			}
			target := api.DelegationTarget{Kind: kind, AgentID: b.ID}
			if kind == "temporary" {
				target.AgentID = ""
				target.Draft = &api.AgentDraft{Name: "Temp", Persona: "plain", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &b.Model.ModelBindingDraft}
			}
			const constraint = "REVIEWER_CONSTRAINT_76_ONLY_USE_APPROVED_RECORDS"
			const expected = "REVIEWER_EXPECTED_93_RETURN_CSV_THREE_COLUMNS"
			child, e := c.API.Collaboration.Delegate(ctx, owner, api.DelegateCommand{CommandMeta: meta(t, c, "delegate-requirements", ""), RunID: root.RunID, Target: target, Task: "summarize records", Constraints: []string{constraint}, ExpectedOutput: expected, Context: api.ContextEnvelope{}})
			if e != nil {
				t.Fatal(e)
			}
			select {
			case input := <-observed:
				var storedConstraints, storedExpected string
				if e = database(t, loc).QueryRow("SELECT constraints_json,expected_output FROM collaboration_delegations WHERE delegation_id=?", child.ID).Scan(&storedConstraints, &storedExpected); e != nil {
					t.Fatal(e)
				}
				t.Logf("durable constraints=%s expected=%s", storedConstraints, storedExpected)
				if input.Intent != "summarize records" || input.Delegation == nil || input.Delegation.DelegationID != child.ID || input.Delegation.Task != input.Intent || len(input.Delegation.Constraints) != 1 || input.Delegation.Constraints[0] != constraint || input.Delegation.ExpectedOutput != expected {
					t.Fatalf("exact accepted requirements missing from actual Engine input: %#v", input.Delegation)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("child Engine not invoked")
			}
			once.Do(func() { close(release) })
		})
	}
}
