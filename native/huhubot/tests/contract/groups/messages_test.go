package groups_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestPrivateAgentMessageCurrentQualificationIsConsumedBeforeEngineAndDispatch(t *testing.T) {
	for _, phase := range []string{"legal", "remove-queued", "remove-after-consume"} {
		t.Run(phase, func(t *testing.T) {
			var bID, cID string
			sent := make(chan api.AgentMessage, 1)
			received := make(chan api.EngineInput, 1)
			releaseC, releaseB := make(chan struct{}), make(chan struct{})
			var cOnce, bOnce sync.Once
			defer cOnce.Do(func() { close(releaseC) })
			defer bOnce.Do(func() { close(releaseB) })
			var bCalls, callbacks, healthyCalls atomic.Int32
			errs := make(chan error, 2)
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "healthy" {
					healthyCalls.Add(1)
					return api.EngineResult{Status: "finished", Text: "healthy unrelated"}, nil
				}
				if i.Agent.ID == cID {
					listed, e := i.Tools.Invoke(c, api.ToolCall{ID: "find-b", Name: "tasks.list", TaskList: &api.DelegationQuery{PageQuery: api.PageQuery{Limit: 100}}})
					if e != nil {
						errs <- e
						return api.EngineResult{}, e
					}
					var target string
					for _, task := range listed.Tasks.Items {
						if task.TargetAgentID == bID {
							target = task.ID
						}
					}
					if target == "" {
						e := fmt.Errorf("actual user-batch B task missing")
						errs <- e
						return api.EngineResult{}, e
					}
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "private-question", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: bID, DelegationID: target, Kind: "question", Text: "PRIVATE_C_MESSAGE", SourceRefs: []api.SourceSnapshot{}}})
					if e != nil {
						errs <- e
						return api.EngineResult{}, e
					}
					sent <- *v.Message
					select {
					case <-releaseC:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
					return api.EngineResult{Status: "finished", Text: "C_LEGIT_PUBLIC"}, nil
				}
				if i.Agent.ID != bID {
					return api.EngineResult{}, fmt.Errorf("unexpected model %s", i.Agent.ID)
				}
				bCalls.Add(1)
				entry, inboxErr := requiredInbox(i, "PRIVATE_C_MESSAGE")
				if inboxErr != nil || entry.Message.Kind != "question" {
					e := fmt.Errorf("actual private inbox=%#v %v", entry, inboxErr)
					errs <- e
					return api.EngineResult{}, e
				}
				if i.Lineage.Group == nil || len(i.Lineage.Group.Members) != 2 {
					e := fmt.Errorf("private inbox proof not refreshed: %#v", i.Lineage.Group)
					errs <- e
					return api.EngineResult{}, e
				}
				found := false
				for _, d := range i.Lineage.Derived {
					if d.Kind == "message" && d.ID == entry.Ref.ID {
						found = true
					}
				}
				if !found {
					e := fmt.Errorf("actual private message ID absent from lineage")
					errs <- e
					return api.EngineResult{}, e
				}
				reservation, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "after-private-message", InputEstimate: "1", OutputBound: "2"})
				if e != nil {
					errs <- e
					return api.EngineResult{}, e
				}
				received <- i
				<-releaseB
				e = i.Attempts.Dispatch(context.Background(), reservation, func(context.Context) error { callbacks.Add(1); return nil })
				if e != nil {
					if e = i.Attempts.AbortUnsent(context.Background(), reservation); e != nil {
						return api.EngineResult{}, e
					}
				} else {
					if _, e = i.Attempts.Settle(context.Background(), reservation, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true}); e != nil {
						return api.EngineResult{}, e
					}
				}
				return api.EngineResult{Status: "finished", Text: "PRIVATE_C_MESSAGE"}, nil
			})
			options := bootstrap.Options{Engine: eng, ExecutionLimits: api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 1, ProfileChildren: 8, MaxWakes: 8}, Budget: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "1000", MaintenanceTokenLimit: "0"}}
			c, loc := open(t, options)
			a := agent(t, c, "A", true)
			b := agent(t, c, "B", true)
			d := agent(t, c, "C", true)
			bID, cID = b.ID, d.ID
			d = allow(t, c, d, []string{"tasks.list", "agents.message"}, []string{b.ID})
			s := group(t, c, a, b, d)
			db := database(t, loc)
			root := send(t, c, s, "message batch", d.ID, b.ID)
			var message api.AgentMessage
			select {
			case message = <-sent:
			case e := <-errs:
				t.Fatal(e)
			case <-time.After(2 * time.Second):
				t.Fatal("actual C message not sent")
			}
			if n := count(t, db, "SELECT count(*) FROM execution_runs WHERE agent_id=? AND status='accepted' AND child_slot=0", b.ID); n != 1 {
				t.Fatal("B was not queued behind actual C producer")
			}
			if n := count(t, db, "SELECT json_array_length(group_binding_json,'$.members') FROM collaboration_messages WHERE message_id=?", message.ID); n != 1 {
				t.Fatal("sending-time proof was not captured")
			}
			if phase == "remove-queued" {
				update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
			}
			cOnce.Do(func() { close(releaseC) })
			if phase != "remove-queued" {
				select {
				case <-received:
				case e := <-errs:
					t.Fatal(e)
				case <-time.After(2 * time.Second):
					t.Fatal("B did not consume actual private inbox")
				}
				if phase == "remove-after-consume" {
					update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
				}
			}
			bOnce.Do(func() { close(releaseB) })
			rootState := wait(t, c, root.RunID)
			direct, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "healthy-session", ""), Kind: "direct", Title: "unrelated", MemberIDs: []string{a.ID}})
			if e != nil {
				t.Fatal(e)
			}
			healthy := send(t, c, direct, "healthy")
			if r := wait(t, c, healthy.RunID); r.Status != "succeeded" || healthyCalls.Load() != 1 {
				t.Fatalf("unrelated queue poisoned: %#v", r)
			}
			if phase == "remove-queued" {
				if bCalls.Load() != 0 || count(t, db, "SELECT count(*) FROM execution_runs WHERE agent_id=? AND status='failed' AND reason='GROUP_MEMBER_REMOVED'", b.ID) != 1 || count(t, db, "SELECT count(*) FROM collaboration_result_deliveries WHERE text='' AND status='failed'") < 1 {
					t.Fatal("revoked private inbox was not atomically rejected before Engine")
				}
			} else if bCalls.Load() != 1 {
				t.Fatal("B model call count", bCalls.Load())
			}
			expected := int32(0)
			if phase == "legal" {
				expected = 1
			}
			if callbacks.Load() != expected {
				t.Fatalf("callbacks=%d expected=%d", callbacks.Load(), expected)
			}
			if phase != "legal" && count(t, db, "SELECT count(*) FROM conversation_messages WHERE text='PRIVATE_C_MESSAGE'") != 0 {
				t.Fatal("revoked private message was published")
			}
			if phase == "remove-after-consume" {
				p := history(t, c, s.ID)
				haveC := false
				for _, m := range p.Items {
					if m.Text == "C_LEGIT_PUBLIC" {
						haveC = true
					}
				}
				if !haveC {
					t.Fatal("already legal public transcript erased after author removal")
				}
			}
			if phase != "legal" && rootState.Reason != "CHILD_PARTIAL_FAILURE" {
				t.Fatalf("root lost stopped child fact: %#v", rootState)
			}
			if e = c.Close(); e != nil {
				t.Fatal(e)
			}
			if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
				t.Fatal("physical producers were not accounted for")
			}
		})
	}
}
