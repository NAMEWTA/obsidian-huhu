package delegation_test

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestParentResultDeduplicatesSharedHistoryAndTerminatesOversizedResult(t *testing.T) {
	for _, oversize := range []bool{false, true} {
		t.Run(fmt.Sprint(oversize), func(t *testing.T) {
			var target string
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "root" {
					n := 32
					if oversize {
						n = 4
					}
					for x := 0; x < n; x++ {
						if _, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint(x), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "child", Constraints: []string{}}}); e != nil {
							return api.EngineResult{}, e
						}
					}
					return api.EngineResult{Status: "finished", Text: "root"}, nil
				}
				text := "small body"
				if i.Intent == "child" && oversize {
					text = strings.Repeat("x", 40000)
				}
				return api.EngineResult{Status: "finished", Text: text}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			b := agent(t, c, "B", nil)
			target = b.ID
			a := agent(t, c, "A", []string{b.ID})
			s := session(t, c, a)
			for n := 0; n < 2; n++ {
				r := start(t, c, s, "history")
				wait(t, c, r.RunID, "succeeded")
				var e error
				s, e = c.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: s.ID})
				if e != nil {
					t.Fatal(e)
				}
			}
			r := start(t, c, s, "root")
			status := "succeeded"
			if oversize {
				status = "failed"
			}
			final := wait(t, c, r.RunID, status)
			if oversize && final.Reason != "RESULT_CONTEXT_LIMIT" {
				t.Fatalf("oversize did not terminate safely %#v", final)
			}
			db := database(t, loc)
			if count(t, db, "SELECT count(*) FROM collaboration_parent_results WHERE state='claimed'") != 1 {
				t.Fatal("parent result not durably consumed")
			}
			if !oversize {
				if n := count(t, db, "SELECT count(*) FROM collaboration_lineage WHERE output_run_id=?", r.RunID); n < 32 || n > 128 {
					t.Fatalf("shared facts not deduplicated %d", n)
				}
			}
		})
	}
}
