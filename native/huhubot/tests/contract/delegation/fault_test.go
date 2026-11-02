package delegation_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestAdmissionCommitFailureRollsBackChildThreadPinCounterAndReceipt(t *testing.T) {
	entered := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" {
			close(entered)
			select {
			case <-release:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
		}
		return api.EngineResult{Status: "finished", Text: "actual result"}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	a := agent(t, c, "A", []string{b.ID})
	r := start(t, c, session(t, c, a), "root")
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("parent not active")
	}
	db := database(t, loc)
	if _, e := db.Exec("CREATE TRIGGER fail_delegation BEFORE INSERT ON collaboration_delegations BEGIN SELECT RAISE(ABORT,'controlled commit-boundary fault'); END"); e != nil {
		t.Fatal(e)
	}
	command := api.DelegateCommand{CommandMeta: meta(t, c, "one-intent", ""), RunID: r.RunID, Target: api.DelegationTarget{Kind: "existing", AgentID: b.ID}, Task: "child", Constraints: []string{}}
	if _, e := c.API.Collaboration.Delegate(ctx, owner, command); e == nil {
		t.Fatal("fault did not occur")
	}
	for _, q := range []string{"SELECT count(*) FROM collaboration_delegations", "SELECT count(*) FROM collaboration_threads", "SELECT count(*) FROM task_config_snapshots", "SELECT count(*) FROM task_config_pins", "SELECT COALESCE(sum(child_count),0) FROM collaboration_policy_roots", "SELECT count(*) FROM command_receipts WHERE idempotency_key='one-intent'", "SELECT count(*) FROM execution_runs WHERE parent_run_id<>''"} {
		if n := count(t, db, q); n != 0 {
			t.Fatalf("partial admission %s=%d", q, n)
		}
	}
	if _, e := db.Exec("DROP TRIGGER fail_delegation"); e != nil {
		t.Fatal(e)
	}
	one, e := c.API.Collaboration.Delegate(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	command.CommandID = "transport-retry"
	two, e := c.API.Collaboration.Delegate(ctx, owner, command)
	if e != nil || two.ChildRunID != one.ChildRunID {
		t.Fatalf("same intent not recovered %#v %v", two, e)
	}
	once.Do(func() { close(release) })
	wait(t, c, r.RunID, "succeeded")
	if count(t, db, "SELECT count(*) FROM collaboration_delegations") != 1 || count(t, db, "SELECT child_count FROM collaboration_policy_roots") != 1 {
		t.Fatal("retry duplicated cumulative admission")
	}
}
