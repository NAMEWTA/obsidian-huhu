package groups_test

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestFailedUnacceptedDraftIsNotAPublicGroupReply(t *testing.T) {
	for _, partial := range []bool{false, true} {
		t.Run(map[bool]string{false: "unaccepted", true: "accepted-partial"}[partial], func(t *testing.T) {
			eng := engineFunc(func(context.Context, api.EngineInput) (api.EngineResult, error) {
				return api.EngineResult{Status: "failed", Text: "FAILED_DRAFT", Partial: partial, Reason: "CONTROLLED_FAILURE"}, nil
			})
			c, loc := open(t, bootstrap.Options{Engine: eng})
			a := agent(t, c, "A", false)
			b := agent(t, c, "B", true)
			s := group(t, c, a, b)
			root := send(t, c, s, "failing member", b.ID)
			wait(t, c, root.RunID)
			db := database(t, loc)
			expected := 0
			if partial {
				expected = 1
			}
			if n := count(t, db, "SELECT count(*) FROM conversation_messages WHERE text='FAILED_DRAFT'"); n != expected {
				t.Fatalf("public draft=%d expected=%d", n, expected)
			}
			if n := count(t, db, "SELECT count(*) FROM group_publications WHERE status='failed'"); n != 1 {
				t.Fatal("stable failed disposition missing")
			}
		})
	}
}
func TestMissingDeliverRejectsWholeBatchBeforeAnyModelOrReceipt(t *testing.T) {
	var calls atomic.Int32
	eng := engineFunc(func(context.Context, api.EngineInput) (api.EngineResult, error) {
		calls.Add(1)
		return api.EngineResult{Status: "finished", Text: "MUST_NOT_PUBLISH"}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	source, host := attach(t, c)
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	s := group(t, c, a, b)
	g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, "no-deliver-grant", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Operations: []string{"read", "send"}, Recipients: []api.GrantRecipient{recipient(b)}})
	if e != nil {
		t.Fatal(e)
	}
	_, e = c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "missing-deliver", s.Revision), SessionID: s.ID, Intent: "source result", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}, TargetAgentIDs: []string{b.ID}})
	if e == nil {
		t.Error("batch without publication permission was accepted")
	}
	db := database(t, loc)
	if count(t, db, "SELECT count(*) FROM execution_runs") != 0 || count(t, db, "SELECT count(*) FROM conversation_messages") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 || count(t, db, "SELECT count(*) FROM command_receipts WHERE method='runs.start'") != 0 || calls.Load() != 0 {
		t.Error("refused publication left accepted work or receipt")
	}
	host.mu.Lock()
	defer host.mu.Unlock()
	if host.reads != 0 {
		t.Error("unaccepted batch read source body")
	}
}
func TestPublicationDeliverRevocationTerminatesBodyFreeInsteadOfLeavingRunning(t *testing.T) {
	entered := make(chan struct{}, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		entered <- struct{}{}
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "PUBLISH_AFTER_DELIVER_REVOKE"}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	source, _ := attach(t, c)
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	s := group(t, c, a, b)
	makeGrant := func(key string, ops []string) api.Grant {
		g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, key, ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Operations: ops, Recipients: []api.GrantRecipient{recipient(b)}})
		if e != nil {
			t.Fatal(e)
		}
		return g
	}
	read := makeGrant("read-send", []string{"read", "send"})
	deliver := makeGrant("deliver-only", []string{"deliver"})
	root, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "deliver-race", s.Revision), SessionID: s.ID, Intent: "publish source", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{read.ID, deliver.ID}, TargetAgentIDs: []string{b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-entered:
	case <-time.After(2 * time.Second):
		t.Fatal("actual member not started")
	}
	revoke(t, c, deliver)
	once.Do(func() { close(release) })
	r := wait(t, c, root.RunID)
	db := database(t, loc)
	if r.Reason != "CHILD_PARTIAL_FAILURE" || count(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status='failed'", root.RunID) != 1 || count(t, db, "SELECT count(*) FROM conversation_messages WHERE text='PUBLISH_AFTER_DELIVER_REVOKE'") != 0 || count(t, db, "SELECT count(*) FROM collaboration_result_deliveries WHERE parent_run_id=? AND text=''", root.RunID) != 1 {
		t.Fatalf("publication guard did not terminate body-free: %#v", r)
	}
}
