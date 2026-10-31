package groups_test

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestTaskPageOversizeAndLaterAuthorizationOrDecodeFailureLeaveNoConsumption(t *testing.T) {
	for _, phase := range []string{"first-too-large", "later-invalid-result", "later-auth-denied"} {
		t.Run(phase, func(t *testing.T) {
			var targets []string
			made := make(chan []api.Delegation, 1)
			read := make(chan struct{})
			observed := make(chan error, 1)
			release := make(chan struct{})
			var readOnce, releaseOnce sync.Once
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if strings.HasPrefix(i.Intent, "failure-child") {
					body := "valid private child"
					if phase == "first-too-large" {
						body = strings.Repeat("\x00", 131072)
					}
					return api.EngineResult{Status: "finished", Text: body}, nil
				}
				children := []api.Delegation{}
				for n, target := range targets {
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint("make-", n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: fmt.Sprint("failure-child", n), Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					children = append(children, *v.Delegation)
				}
				made <- children
				<-read
				var resultErr error
				cursor := ""
				for n := 0; n < 3; n++ {
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint("page-", n), Name: "tasks.list", TaskList: &api.DelegationQuery{PageQuery: api.PageQuery{Limit: 100, Cursor: cursor}}})
					if e != nil {
						resultErr = e
						break
					}
					if phase != "first-too-large" || v.Tasks.NextCursor == "" {
						break
					}
					cursor = v.Tasks.NextCursor
				}
				observed <- resultErr
				<-release
				return api.EngineResult{Status: "finished", Text: "no private failure result used"}, nil
			})
			c, loc := open(t, bootstrap.Options{Engine: eng})
			t.Cleanup(func() { readOnce.Do(func() { close(read) }); releaseOnce.Do(func() { close(release) }) })
			a := agent(t, c, "A", false)
			b := agent(t, c, "B", true)
			cc := agent(t, c, "C", true)
			d := agent(t, c, "D", true)
			targets = []string{cc.ID, d.ID}
			b = allow(t, c, b, []string{"agents.delegate", "tasks.list"}, targets)
			s := group(t, c, a, b, cc, d)
			root := send(t, c, s, "failure parent", b.ID)
			db := database(t, loc)
			var children []api.Delegation
			select {
			case children = <-made:
			case <-time.After(5 * time.Second):
				t.Fatal("admission absent")
			}
			for _, child := range children {
				until := time.Now().Add(5 * time.Second)
				for {
					v, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "read", "").ProfileID, ID: child.ID})
					if e != nil {
						t.Fatal(e)
					}
					if v.Result != nil {
						break
					}
					if time.Now().After(until) {
						t.Fatal("private result absent")
					}
					time.Sleep(time.Millisecond)
				}
			}
			sort.Slice(children, func(i, j int) bool { return children[i].ID < children[j].ID })
			last := children[1]
			parent := children[0].ParentRunID
			var original string
			if phase == "later-invalid-result" {
				if e := db.QueryRow("SELECT derived_json FROM collaboration_result_deliveries WHERE child_run_id=?", last.ChildRunID).Scan(&original); e != nil {
					t.Fatal(e)
				}
				if _, e := db.Exec("UPDATE collaboration_result_deliveries SET derived_json='{' WHERE child_run_id=?", last.ChildRunID); e != nil {
					t.Fatal(e)
				}
			}
			if phase == "later-auth-denied" {
				ids := []string{a.ID, b.ID}
				for _, id := range targets {
					if id != last.ExecutorAgentID {
						ids = append(ids, id)
					}
				}
				update(t, c, getSession(t, c, s.ID), ids, api.GroupHistoryScope{Kind: "none"})
			}
			query := "SELECT group_binding_json||'|'||derived_json||'|'||effective_source_json||'|'||effective_scope_json||'|'||effective_grants_json||'|'||revision FROM execution_runs WHERE run_id=?"
			var before, after string
			if e := db.QueryRow(query, parent).Scan(&before); e != nil {
				t.Fatal(e)
			}
			readOnce.Do(func() { close(read) })
			var e error
			select {
			case e = <-observed:
			case <-time.After(5 * time.Second):
				t.Fatal("failing actual tool did not return")
			}
			want := map[string]string{"first-too-large": "TASK_PAGE_TOO_LARGE", "later-invalid-result": "LINEAGE_STATE_INVALID", "later-auth-denied": "GROUP_MEMBER_REMOVED"}[phase]
			if !reason(e, want) {
				t.Fatalf("wrong original failure: %v want=%s", e, want)
			}
			if e := db.QueryRow(query, parent).Scan(&after); e != nil {
				t.Fatal(e)
			}
			if before != after {
				t.Fatalf("failed page partially consumed\nbefore=%s\nafter=%s", before, after)
			}
			if phase == "later-invalid-result" {
				if _, e := db.Exec("UPDATE collaboration_result_deliveries SET derived_json=? WHERE child_run_id=?", original, last.ChildRunID); e != nil {
					t.Fatal(e)
				}
			}
			releaseOnce.Do(func() { close(release) })
			wait(t, c, root.RunID)
			if e := c.Close(); e != nil {
				t.Fatal(e)
			}
			if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
				t.Fatal("failure cleanup retained slot/pin")
			}
			t.Logf("phase=%s originalError=%v persisted proof/source/scope/grants/derived/revision identical; slots0 pins0", phase, e)
		})
	}
}
