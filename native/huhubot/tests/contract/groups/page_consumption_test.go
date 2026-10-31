package groups_test

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

// This regression derives the omitted target from admission minus actual page
// contents. It always removes that target after the fix, when no phantom exists.
func TestTaskListBytePageConsumesOnlyReturnedBodiesAndNextPageCreatesRealDependency(t *testing.T) {
	for _, phase := range []string{"remove-omitted", "remove-returned", "read-next-remove-omitted", "count-limit-remove-omitted"} {
		t.Run(phase, func(t *testing.T) {
			var targets []string
			created := make(chan []api.Delegation, 1)
			allowRead := make(chan struct{})
			pages := make(chan api.DelegationPage, 2)
			next := make(chan bool, 1)
			reserved := make(chan struct{}, 1)
			release := make(chan struct{})
			errs := make(chan error, 2)
			var readOnce, releaseOnce sync.Once
			var callbacks atomic.Int32
			pageLimit := 100
			if phase == "count-limit-remove-omitted" {
				pageLimit = 3
			}
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if strings.HasPrefix(i.Intent, "page-child") {
					return api.EngineResult{Status: "finished", Text: strings.Repeat("x", 131072)}, nil
				}
				run := func() (api.EngineResult, error) {
					ds := []api.Delegation{}
					for n, target := range targets {
						v, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint("make-", n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: fmt.Sprint("page-child", n), Constraints: []string{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						ds = append(ds, *v.Delegation)
					}
					created <- ds
					<-allowRead
					first, e := i.Tools.Invoke(c, api.ToolCall{ID: "page-1", Name: "tasks.list", TaskList: &api.DelegationQuery{PageQuery: api.PageQuery{Limit: pageLimit}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					pages <- *first.Tasks
					if <-next {
						second, e := i.Tools.Invoke(c, api.ToolCall{ID: "page-2", Name: "tasks.list", TaskList: &api.DelegationQuery{PageQuery: api.PageQuery{Limit: 100, Cursor: first.Tasks.NextCursor}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						pages <- *second.Tasks
					}
					r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "after-pages", InputEstimate: "1", OutputBound: "2"})
					if e != nil {
						return api.EngineResult{}, e
					}
					reserved <- struct{}{}
					<-release
					e = i.Attempts.Dispatch(context.Background(), r, func(context.Context) error { callbacks.Add(1); return nil })
					if e != nil {
						e = i.Attempts.AbortUnsent(context.Background(), r)
					} else {
						_, e = i.Attempts.Settle(context.Background(), r, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true})
					}
					return api.EngineResult{Status: "finished", Text: "only returned pages consumed"}, e
				}
				r, e := run()
				if e != nil {
					errs <- e
				}
				return r, e
			})
			c, loc := open(t, bootstrap.Options{Engine: eng, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}})
			t.Cleanup(func() {
				readOnce.Do(func() { close(allowRead) })
				select {
				case next <- false:
				default:
				}
				releaseOnce.Do(func() { close(release) })
			})
			a := agent(t, c, "A", false)
			b := agent(t, c, "B", true)
			members := []api.Agent{b}
			for n := range 4 {
				m := agent(t, c, fmt.Sprint("member-", n), true)
				members = append(members, m)
				targets = append(targets, m.ID)
			}
			b = allow(t, c, b, []string{"agents.delegate", "tasks.list"}, targets)
			members[0] = b
			s := group(t, c, a, members...)
			root := send(t, c, s, "page-consumer", b.ID)
			db := database(t, loc)
			receivePage := func() api.DelegationPage {
				t.Helper()
				select {
				case p := <-pages:
					return p
				case e := <-errs:
					t.Fatal(e)
				case <-time.After(5 * time.Second):
					t.Fatal("actual page absent")
				}
				return api.DelegationPage{}
			}
			var admitted []api.Delegation
			select {
			case admitted = <-created:
			case e := <-errs:
				t.Fatal(e)
			case <-time.After(5 * time.Second):
				t.Fatal("actual child admission absent")
			}
			parent := admitted[0].ParentRunID
			for _, d := range admitted {
				until := time.Now().Add(5 * time.Second)
				for {
					v, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "read", "").ProfileID, ID: d.ID})
					if e != nil {
						t.Fatal(e)
					}
					if v.Result != nil {
						if len(v.Result.Text) != 131072 {
							t.Fatal("body boundary changed")
						}
						break
					}
					if time.Now().After(until) {
						t.Fatal("private result absent")
					}
					time.Sleep(time.Millisecond)
				}
			}
			before := count(t, db, "SELECT revision FROM execution_runs WHERE run_id=?", parent)
			if n := count(t, db, "SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?", parent); n != 1 {
				t.Fatal("user GetTask consumed model provenance")
			}
			readOnce.Do(func() { close(allowRead) })
			first := receivePage()
			raw, e := json.Marshal(first)
			if e != nil || len(raw)+1024 > 524288 || first.NextCursor == "" {
				t.Fatalf("byte page not exercised bytes=%d cursor=%q err=%v", len(raw), first.NextCursor, e)
			}
			returned := map[string]api.Delegation{}
			seen := map[string]bool{}
			for _, d := range first.Items {
				seen[d.ID] = true
				if d.Result != nil && d.Result.Text != "" {
					returned[d.ID] = d
				}
			}
			missing := []api.Delegation{}
			for _, d := range admitted {
				if _, ok := returned[d.ID]; !ok {
					missing = append(missing, d)
				}
			}
			if (pageLimit == 100 && (len(returned) != 3 || len(missing) != 1)) || (pageLimit == 3 && (len(first.Items) != 3 || len(missing) < 1)) {
				t.Fatalf("actual returned/admitted difference invalid: returned=%d omitted=%d", len(returned), len(missing))
			}
			firstPrivateCount := len(returned)
			omitted := missing[0]
			removed := omitted.ExecutorAgentID
			if phase == "remove-returned" {
				for _, d := range returned {
					removed = d.ExecutorAgentID
					break
				}
			}
			var proof api.GroupBinding
			var encoded string
			if e = db.QueryRow("SELECT group_binding_json FROM execution_runs WHERE run_id=?", parent).Scan(&encoded); e != nil {
				t.Fatal(e)
			}
			if e = json.Unmarshal([]byte(encoded), &proof); e != nil {
				t.Fatal(e)
			}
			if len(proof.Members) != 1+len(returned) {
				t.Errorf("first page consumed an undisclosed member: proof=%s", encoded)
			}
			if count(t, db, "SELECT count(*) FROM execution_runs r,json_each(r.derived_json) d WHERE r.run_id=? AND json_extract(d.value,'$.kind')='task_result' AND json_extract(d.value,'$.id')=?", parent, omitted.ChildRunID) != 0 {
				t.Error("omitted result has false derived provenance")
			}
			if count(t, db, "SELECT revision FROM execution_runs WHERE run_id=?", parent) != before+len(returned) {
				t.Error("omitted candidate changed Run revision")
			}
			next <- phase == "read-next-remove-omitted"
			if phase == "read-next-remove-omitted" {
				second := receivePage()
				if second.NextCursor != "" {
					t.Fatal("unexpected third page")
				}
				for _, d := range second.Items {
					if seen[d.ID] {
						t.Fatal("page duplicated task")
					}
					seen[d.ID] = true
					if d.Result != nil && d.Result.Text != "" {
						returned[d.ID] = d
					}
				}
				if len(returned) != 4 || len(seen) != 5 {
					t.Fatalf("pages omitted work: returned=%d total=%d", len(returned), len(seen))
				}
				if count(t, db, "SELECT json_array_length(group_binding_json,'$.members') FROM execution_runs WHERE run_id=?", parent) != 5 {
					t.Fatal("next page omitted actual contributor")
				}
			}
			select {
			case <-reserved:
			case e := <-errs:
				t.Fatal(e)
			case <-time.After(5 * time.Second):
				t.Fatal("actual reservation absent")
			}
			ids := []string{a.ID, b.ID}
			for _, id := range targets {
				if id != removed {
					ids = append(ids, id)
				}
			}
			update(t, c, getSession(t, c, s.ID), ids, api.GroupHistoryScope{Kind: "none"})
			if (phase == "remove-omitted" || phase == "count-limit-remove-omitted") && count(t, db, "SELECT count(*) FROM execution_runs WHERE run_id=? AND status='running'", parent) != 1 {
				t.Error("removing actually unreturned member canceled running consumer")
			}
			releaseOnce.Do(func() { close(release) })
			wait(t, c, root.RunID)
			if e = c.Close(); e != nil {
				t.Fatal(e)
			}
			want := int32(0)
			if phase == "remove-omitted" || phase == "count-limit-remove-omitted" {
				want = 1
			}
			if callbacks.Load() != want {
				t.Errorf("actual Dispatch=%d want=%d", callbacks.Load(), want)
			}
			if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
				t.Fatal("stopped producers retained slot/pin")
			}
			t.Logf("phase=%s pageBytes=%d admitted=4 returnedPrivate=%d omitted=%s/%s actuallyRemoved=%s actualDispatch=%d slots=0 pins=0", phase, len(raw), firstPrivateCount, omitted.ID, omitted.ExecutorAgentID, removed, callbacks.Load())
		})
	}
}
