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

type emittingEngine func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error)

func (e emittingEngine) Run(c context.Context, i api.EngineInput, f func(api.EngineEvent) error) (api.EngineResult, error) {
	return e(c, i, f)
}
func (e emittingEngine) Resume(c context.Context, i api.EngineResumeInput, f func(api.EngineEvent) error) (api.EngineResult, error) {
	return e(c, i.Input, f)
}

func TestSourceFreeRemovalFencesQueuedBodyAndRejoinDoesNotReviveOldWork(t *testing.T) {
	entered := make(chan string, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var callbacks, healthy atomic.Int32
	eng := emittingEngine(func(c context.Context, i api.EngineInput, emit func(api.EngineEvent) error) (api.EngineResult, error) {
		if i.Intent != "held member" {
			healthy.Add(1)
			return api.EngineResult{Status: "finished", Text: "LEGIT_PUBLIC"}, nil
		}
		if e := emit(api.EngineEvent{Type: "text.delta", Text: "UNPUBLISHED_MEMBER_BODY"}); e != nil {
			return api.EngineResult{}, e
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "held-before-dispatch", InputEstimate: "1", OutputBound: "2"})
		if e != nil {
			return api.EngineResult{}, e
		}
		entered <- i.RunID
		<-release
		e = i.Attempts.Dispatch(context.Background(), r, func(context.Context) error { callbacks.Add(1); return nil })
		if e != nil {
			if e = i.Attempts.AbortUnsent(context.Background(), r); e != nil {
				return api.EngineResult{}, e
			}
		} else {
			_, e = i.Attempts.Settle(context.Background(), r, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true})
		}
		return api.EngineResult{Status: "finished", Text: "UNPUBLISHED_MEMBER_BODY"}, e
	})
	c, loc := open(t, bootstrap.Options{Engine: eng, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}})
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	s := group(t, c, a, b)
	prior := send(t, c, s, "published", b.ID)
	wait(t, c, prior.RunID)
	s = getSession(t, c, s.ID)
	held := send(t, c, s, "held member", b.ID)
	var child string
	select {
	case child = <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("actual source-free producer absent")
	}
	p := meta(t, c, "read", "").ProfileID
	page, e := c.API.Events.Tail(ctx, owner, api.EventTailQuery{ProfileID: p, RunID: child, AfterSeq: "0", Limit: 64, MaxBytes: 65536})
	if e != nil {
		t.Fatal(e)
	}
	found := false
	for _, v := range page.Events {
		found = found || v.Text == "UNPUBLISHED_MEMBER_BODY"
	}
	if !found {
		t.Fatal("prepared body page absent")
	}
	snapshot, e := c.API.Events.Snapshot(ctx, owner, api.IDQuery{ProfileID: p, ID: child})
	if e != nil || snapshot.Snapshot.PendingText != "UNPUBLISHED_MEMBER_BODY" {
		t.Fatalf("prepared snapshot %#v %v", snapshot, e)
	}
	old, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: p, ID: child})
	if e != nil {
		t.Fatal(e)
	}
	update(t, c, getSession(t, c, s.ID), []string{a.ID}, api.GroupHistoryScope{Kind: "none"})
	for _, subjects := range [][]api.DeliverySubject{{{Kind: "run", ID: child}}, {{Kind: "run", ID: old.ID}}} {
		delivered := false
		e = c.API.Events.WithDelivery(ctx, owner, subjects, func(context.Context) error { delivered = true; return nil })
		if e == nil || delivered {
			t.Fatal("queued source-free body/snapshot crossed removed member fence")
		}
	}
	if _, e = c.API.Events.Tail(ctx, owner, api.EventTailQuery{ProfileID: p, RunID: child, AfterSeq: page.NextSeq}); e == nil {
		t.Fatal("removed member tail permitted")
	}
	other := group(t, c, a, b)
	r := send(t, c, other, "other group", b.ID)
	wait(t, c, r.RunID)
	direct, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "private", ""), Kind: "direct", Title: "private", MemberIDs: []string{b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	r = send(t, c, direct, "private remains")
	wait(t, c, r.RunID)
	if healthy.Load() != 3 {
		t.Fatalf("unrelated same-agent work affected: %d", healthy.Load())
	}
	history, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: p, Limit: 100}, SessionID: s.ID})
	if e != nil {
		t.Fatal(e)
	}
	var published api.VisibleMessage
	for _, m := range history.Items {
		if m.Text == "LEGIT_PUBLIC" {
			published = m
		}
	}
	if published.ID == "" {
		t.Fatal("legally published history was removed with author")
	}
	if e = c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "message", ID: published.ID}}, func(context.Context) error { return nil }); e != nil {
		t.Fatalf("public history author was treated as private contributor: %v", e)
	}
	once.Do(func() { close(release) })
	wait(t, c, held.RunID)
	if callbacks.Load() != 0 {
		t.Fatal("removed member reached actual Dispatch")
	}
	update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
	current := getSession(t, c, s.ID)
	for _, m := range current.GroupMembers {
		if m.AgentID == b.ID && m.Incarnation != "2" {
			t.Fatalf("rejoin reused old incarnation: %#v", m)
		}
	}
	if _, e = c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: p, ID: child}); !reason(e, "GROUP_MEMBER_GENERATION_CHANGED") {
		t.Fatalf("old work revived after rejoin: %v", e)
	}
	fresh := send(t, c, current, "new incarnation", b.ID)
	if r := wait(t, c, fresh.RunID); r.Status != "succeeded" {
		t.Fatalf("new member work denied %#v", r)
	}
	db := database(t, loc)
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
		t.Fatal("ended producers retained slot/pin")
	}
	t.Logf("prepared tail=%s snapshot=%s; source-free actual Dispatch=%d; current member incarnation2; same Bot other group/private unaffected", page.NextSeq, snapshot.SnapshotSeq, callbacks.Load())
}
