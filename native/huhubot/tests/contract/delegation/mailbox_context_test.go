package delegation_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestRootScopedUnassociatedNotifyReachesActualShortTermOnlyInItsTree(t *testing.T) {
	var target string
	childInputs := make(chan api.EngineInput, 1)
	otherInputs := make(chan api.EngineInput, 1)
	eng := engineFunc(func(call context.Context, in api.EngineInput) (api.EngineResult, error) {
		switch in.Intent {
		case "notify then delegate":
			if _, err := in.Tools.Invoke(call, api.ToolCall{ID: "mailbox", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "notify", Text: "ROOT_ONLY_MAILBOX_MESSAGE", SourceRefs: []api.SourceSnapshot{}}}); err != nil {
				return api.EngineResult{}, err
			}
			_, err := in.Tools.Invoke(call, api.ToolCall{ID: "delegate", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "receive root mailbox", Constraints: []string{}}})
			return api.EngineResult{Status: "finished", Text: "sent"}, err
		case "receive root mailbox":
			childInputs <- in
		case "other tree":
			otherInputs <- in
		}
		return api.EngineResult{Status: "finished", Text: "done"}, nil
	})
	c, _, _ := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "mailbox-recipient", nil)
	target = b.ID
	a := agent(t, c, "mailbox-sender", []string{b.ID})
	root := start(t, c, session(t, c, a), "notify then delegate")
	var child api.EngineInput
	select {
	case child = <-childInputs:
	case <-time.After(5 * time.Second):
		t.Fatal("recipient engine never started")
	}
	if child.ShortTerm == nil {
		t.Fatal("test did not reach default memory context")
	}
	found := false
	for _, entry := range child.ShortTerm.Entries {
		if entry.Use == "inbox" && strings.Contains(entry.Text, "ROOT_ONLY_MAILBOX_MESSAGE") {
			found = true
		}
	}
	if !found {
		t.Fatal("durably delivered notification missing from actual model ShortTerm", child.ShortTerm)
	}
	wait(t, c, root.RunID, "succeeded")
	other := start(t, c, session(t, c, b), "other tree")
	var unrelated api.EngineInput
	select {
	case unrelated = <-otherInputs:
	case <-time.After(5 * time.Second):
		t.Fatal("unrelated engine never started")
	}
	if unrelated.ShortTerm == nil {
		t.Fatal("unrelated memory context missing")
	}
	for _, entry := range unrelated.ShortTerm.Entries {
		if strings.Contains(entry.Text, "ROOT_ONLY_MAILBOX_MESSAGE") {
			t.Fatal("mailbox notification crossed causal tree", entry)
		}
	}
	wait(t, c, other.RunID, "succeeded")
}
