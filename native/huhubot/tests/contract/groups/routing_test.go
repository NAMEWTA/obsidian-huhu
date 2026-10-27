package groups_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func getSession(t *testing.T, c *bootstrap.Core, id string) api.Session {
	t.Helper()
	s, e := c.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: id})
	if e != nil {
		t.Fatal(e)
	}
	return s
}
func send(t *testing.T, c *bootstrap.Core, s api.Session, text string, targets ...string) api.RunReceipt {
	t.Helper()
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, api.NewID("send:"), s.Revision), SessionID: s.ID, Intent: text, SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: targets})
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func history(t *testing.T, c *bootstrap.Core, s string) api.MessagePage {
	t.Helper()
	p, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 100}, SessionID: s})
	if e != nil {
		t.Fatal(e)
	}
	return p
}
func update(t *testing.T, c *bootstrap.Core, s api.Session, ids []string, scope api.GroupHistoryScope) api.Session {
	t.Helper()
	out, e := c.API.Groups.UpdateMembers(ctx, owner, api.SessionMembersUpdate{CommandMeta: meta(t, c, api.NewID("members:"), s.Revision), ID: s.ID, MemberIDs: ids, HistoryScope: scope})
	if e != nil {
		t.Fatal(e)
	}
	return out
}

func TestGroupTargetsAreAtomicIdempotentAndDoNotCreateAnotherBusyRoot(t *testing.T) {
	entered := make(chan string, 4)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		entered <- i.Agent.ID
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "published"}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "A", true)
	b := agent(t, c, "B", true)
	outside := agent(t, c, "outside", true)
	s := group(t, c, a, b)
	db := database(t, loc)
	for _, targets := range [][]string{{b.ID, outside.ID}, {b.ID, b.ID}, {"agent:unknown"}} {
		_, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, api.NewID("bad:"), s.Revision), SessionID: s.ID, Intent: "invalid", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: targets})
		if e == nil || count(t, db, "SELECT count(*) FROM execution_runs") != 0 || count(t, db, "SELECT count(*) FROM conversation_messages") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
			t.Fatalf("invalid batch committed: targets=%v error=%v", targets, e)
		}
	}
	command := api.RunStart{CommandMeta: meta(t, c, "valid", s.Revision), SessionID: s.ID, Intent: "hold", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{b.ID}}
	r, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	select {
	case actual := <-entered:
		if actual != b.ID {
			t.Fatal(actual)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("member not entered")
	}
	command.CommandID = "new-transport-attempt"
	again, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil || again.RunID != r.RunID {
		t.Fatalf("same intent replay: %#v %v", again, e)
	}
	busy := command
	busy.CommandID = "busy"
	busy.IdempotencyKey = "busy"
	busy.ExpectedRevision = getSession(t, c, s.ID).Revision
	if _, e = c.API.Conversation.StartRun(ctx, owner, busy); !reason(e, "SESSION_BUSY") {
		t.Fatalf("busy=%v", e)
	}
	if _, e = c.API.Groups.SetCoordinator(ctx, owner, api.SessionCoordinatorUpdate{CommandMeta: meta(t, c, "coordinator-busy", busy.ExpectedRevision), ID: s.ID, CoordinatorID: b.ID}); !reason(e, "SESSION_BUSY") {
		t.Fatalf("active coordinator CAS=%v", e)
	}
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id='' ") != 1 || count(t, db, "SELECT count(*) FROM conversation_messages WHERE role='user'") != 1 {
		t.Fatal("replay/busy added intent")
	}
	once.Do(func() { close(release) })
	if r := wait(t, c, r.RunID); r.Status != "succeeded" {
		t.Fatal(r)
	}
	current := getSession(t, c, s.ID)
	changed, e := c.API.Groups.SetCoordinator(ctx, owner, api.SessionCoordinatorUpdate{CommandMeta: meta(t, c, "coordinator", current.Revision), ID: s.ID, CoordinatorID: b.ID})
	if e != nil || changed.CoordinatorID != b.ID {
		t.Fatalf("coordinator=%#v %v", changed, e)
	}
	fresh := send(t, c, changed, "default coordinator")
	if r := wait(t, c, fresh.RunID); r.Status != "succeeded" {
		t.Fatal(r)
	}
	select {
	case actual := <-entered:
		if actual != b.ID {
			t.Fatal("no-mention did not use coordinator")
		}
	case <-time.After(time.Second):
		t.Fatal("default not entered")
	}
}

func TestGroupPublicationSequenceUsesActualCompletionAndDoesNotDuplicateModelWork(t *testing.T) {
	var bID, cID string
	entered := make(chan string, 2)
	releaseB, releaseC := make(chan struct{}), make(chan struct{})
	var bOnce, cOnce sync.Once
	defer bOnce.Do(func() { close(releaseB) })
	defer cOnce.Do(func() { close(releaseC) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		entered <- i.Agent.ID
		gate := releaseB
		if i.Agent.ID == cID {
			gate = releaseC
		}
		select {
		case <-gate:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		return api.EngineResult{Status: "finished", Text: "result " + i.Agent.ID}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	d := agent(t, c, "C", true)
	bID, cID = b.ID, d.ID
	s := group(t, c, a, b, d)
	db := database(t, loc)
	command := api.RunStart{CommandMeta: meta(t, c, "parallel", s.Revision), SessionID: s.ID, Intent: "parallel", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{bID, cID}}
	r, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	for n := 0; n < 2; n++ {
		select {
		case <-entered:
		case <-time.After(2 * time.Second):
			t.Fatal("member not started")
		}
	}
	cOnce.Do(func() { close(releaseC) })
	until := time.Now().Add(2 * time.Second)
	for count(t, db, "SELECT count(*) FROM group_publications p JOIN execution_runs r ON r.run_id=p.child_run_id WHERE r.agent_id=? AND p.message_id IS NOT NULL", cID) == 0 {
		if time.Now().After(until) {
			t.Fatal("C did not publish")
		}
		time.Sleep(2 * time.Millisecond)
	}
	bOnce.Do(func() { close(releaseB) })
	if r := wait(t, c, r.RunID); r.Status != "succeeded" {
		t.Fatal(r)
	}
	p := history(t, c, s.ID)
	if len(p.Items) != 3 || p.Items[0].Seq != "1" || p.Items[1].Seq != "2" || p.Items[2].Seq != "3" || p.Items[1].AgentID != cID || p.Items[2].AgentID != bID {
		t.Fatalf("authority order=%#v", p.Items)
	}
	if len(r.TargetRunIDs) != 2 || p.Items[1].RunID == p.Items[2].RunID {
		t.Fatal("real child references missing")
	}
	command.CommandID = "reconnect-replay"
	again, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil || again.RunID != r.RunID || count(t, db, "SELECT count(*) FROM group_publications") != 2 || count(t, db, "SELECT count(*) FROM conversation_messages") != 3 {
		t.Fatalf("replay publication/work duplicated: %#v %v", again, e)
	}
	small, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 1}, SessionID: s.ID})
	if e != nil || len(small.Items) != 1 || small.Items[0].Seq != "3" || small.NextCursor == "" {
		t.Fatalf("first history page %#v %v", small, e)
	}
	next, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 1, Cursor: small.NextCursor}, SessionID: s.ID})
	if e != nil || len(next.Items) != 1 || next.Items[0].Seq != "2" {
		t.Fatalf("next history page %#v %v", next, e)
	}
}

func TestMemberHistoryNoneAndBoundedRangeNeverIncludePrivateThreads(t *testing.T) {
	var mu sync.Mutex
	observed := map[string][]string{}
	eng := engineFunc(func(_ context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.ShortTerm == nil {
			return api.EngineResult{}, fmt.Errorf("missing sealed group context for %q", i.Intent)
		}
		mu.Lock()
		observed[i.Intent] = []string{}
		for _, entry := range i.ShortTerm.Entries {
			if entry.Use != "recent" && entry.Use != "working_summary" {
				continue
			}
			if entry.Ref.Kind != "message" || entry.Ref.Namespace != i.SessionID || entry.OriginKind != "conversation_message" || entry.Representation != "full" || entry.Text == "" {
				mu.Unlock()
				return api.EngineResult{}, fmt.Errorf("invalid public history entry: %#v", entry)
			}
			observed[i.Intent] = append(observed[i.Intent], entry.Text)
		}
		mu.Unlock()
		return api.EngineResult{Status: "finished", Text: "reply:" + i.Intent}, nil
	})
	c, _ := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "A", true)
	b := agent(t, c, "B", true)
	private, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "private", ""), Kind: "direct", Title: "private", MemberIDs: []string{b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	wait(t, c, send(t, c, private, "B_PRIVATE").RunID)
	s := group(t, c, a)
	wait(t, c, send(t, c, s, "old public").RunID)
	s = update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
	first := s.GroupMembers[1].Incarnation
	wait(t, c, send(t, c, s, "none-new", b.ID).RunID)
	s = update(t, c, getSession(t, c, s.ID), []string{a.ID}, api.GroupHistoryScope{Kind: "none"})
	s = update(t, c, s, []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "range", AfterSeq: "0", ThroughSeq: "2"})
	var inc string
	for _, m := range s.GroupMembers {
		if m.AgentID == b.ID {
			inc = m.Incarnation
		}
	}
	if inc == first {
		t.Fatal("rejoining revived old incarnation")
	}
	wait(t, c, send(t, c, s, "range-new", b.ID).RunID)
	mu.Lock()
	defer mu.Unlock()
	for _, body := range observed["none-new"] {
		if body != "none-new" {
			t.Fatalf("none history leaked %q", body)
		}
	}
	haveOld := false
	for _, body := range observed["range-new"] {
		if body == "old public" {
			haveOld = true
		}
		if body == "B_PRIVATE" || body == "reply:B_PRIVATE" || body == "none-new" || body == "reply:none-new" {
			t.Fatalf("wrong namespace/range: %q", body)
		}
	}
	if !haveOld {
		t.Fatalf("explicit range absent: %v", observed)
	}
	t.Logf("actual model histories: %s", fmt.Sprint(observed))
}
