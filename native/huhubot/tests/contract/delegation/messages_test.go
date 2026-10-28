package delegation_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestNotifyDoesNotWakeQuestionReplyHasDurableIdentityAndRealWaitCycle(t *testing.T) {
	var aID, bID string
	answers := make(chan error, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "question root" {
			notify := api.ToolCall{ID: "notify", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: bID, Kind: "notify", Text: "notification", SourceRefs: []api.SourceSnapshot{}}}
			one, e := i.Tools.Invoke(c, notify)
			if e != nil {
				return api.EngineResult{}, e
			}
			two, e := i.Tools.Invoke(c, notify)
			if e != nil || one.Message.ID != two.Message.ID {
				return api.EngineResult{}, fmt.Errorf("notification replay %v", e)
			}
			page, e := i.Tools.Invoke(c, api.ToolCall{ID: "tasks-before", Name: "tasks.list", TaskList: &api.DelegationQuery{}})
			if e != nil || page.Tasks == nil || len(page.Tasks.Items) != 0 {
				return api.EngineResult{}, fmt.Errorf("notify woke work: %#v %v", page, e)
			}
			q, e := i.Tools.Invoke(c, api.ToolCall{ID: "question", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: bID, Kind: "question", Text: "actual question", SourceRefs: []api.SourceSnapshot{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			if q.Message.Status != "delivered" || q.Message.QuestionID == "" || q.Message.DelegationID == "" {
				return api.EngineResult{}, fmt.Errorf("question identity %#v", q.Message)
			}
			return api.EngineResult{Status: "finished", Text: "parent"}, nil
		}
		if i.Intent == "actual question" {
			check := func() error {
				entries, e := requiredInboxes(i, "actual question", "notification")
				entry := entries["actual question"]
				if e != nil || entry.Message.Kind != "question" || entry.Message.QuestionID == "" {
					return fmt.Errorf("actual thread question missing: %#v %v", entry, e)
				}
				q := *entry.Message
				v, e := i.Tools.Invoke(c, api.ToolCall{ID: "get", Name: "tasks.get", TaskQuery: &api.IDQuery{ID: q.DelegationID}})
				if e != nil || v.Delegation == nil || v.Delegation.ChildRunID != i.RunID {
					return fmt.Errorf("durable tool task lookup %#v %v", v, e)
				}
				if _, e = i.Tools.Invoke(c, api.ToolCall{ID: "cycle", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: aID, DelegationID: q.DelegationID, Kind: "question", Text: "wait back on actual parent", SourceRefs: []api.SourceSnapshot{}}}); !reason(e, "COLLABORATION_WAIT_CYCLE") {
					return fmt.Errorf("actual wait cycle %v", e)
				}
				answer := api.ToolCall{ID: "answer", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: aID, Kind: "reply", Text: "actual answer", DelegationID: q.DelegationID, QuestionID: q.QuestionID, SourceRefs: []api.SourceSnapshot{}}}
				one, e := i.Tools.Invoke(c, answer)
				if e != nil {
					return e
				}
				two, e := i.Tools.Invoke(c, answer)
				if e != nil || one.Message.ID != two.Message.ID || one.Message.Status != "answered" {
					return fmt.Errorf("answer receipt %#v %v", two, e)
				}
				return nil
			}()
			answers <- check
			if check != nil {
				return api.EngineResult{}, check
			}
			return api.EngineResult{Status: "finished", Text: "actual answer"}, nil
		}
		return api.EngineResult{}, fmt.Errorf("unexpected %q", i.Intent)
	})
	c, _, locator := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "B", nil)
	bID = b.ID
	a := agent(t, c, "A", []string{b.ID})
	aID = a.ID
	_, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "allow-b-a", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Description: b.Description, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{a.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	r := start(t, c, session(t, c, a), "question root")
	select {
	case e := <-answers:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("question consumer never answered")
	}
	wait(t, c, r.RunID, "succeeded")
	db := database(t, locator)
	if count(t, db, "SELECT count(*) FROM collaboration_messages WHERE kind='notify'") != 1 || count(t, db, "SELECT count(*) FROM collaboration_messages WHERE kind='question' AND status='answered'") != 1 || count(t, db, "SELECT count(*) FROM collaboration_messages WHERE kind='reply' AND status='answered'") != 1 {
		t.Fatal("delivery/answer identities not durable")
	}
	if count(t, db, "SELECT count(*) FROM collaboration_delegations") != 1 || count(t, db, "SELECT count(*) FROM execution_runs") != 2 {
		t.Fatal("notify/reply/cycle created extra work")
	}
	if count(t, db, "SELECT count(*) FROM collaboration_wait_edges") != 0 {
		t.Fatal("answered wait retained")
	}
}

func TestReviewAssociatedNotifyHasActualRecipientInbox(t *testing.T) {
	var target string
	release := make(chan struct{})
	defer close(release)
	result := make(chan struct {
		child, message string
		err            error
	}, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent != "notify-parent" {
			select { case <-release: case <-c.Done(): return api.EngineResult{}, c.Err() }
			return api.EngineResult{Status: "finished", Text: "child"}, nil
		}
		d, e := i.Tools.Invoke(c, api.ToolCall{ID: "delegate-notify-child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "notify-child", Constraints: []string{}}})
		if e != nil {
			result <- struct {
				child, message string
				err            error
			}{err: e}
			return api.EngineResult{}, e
		}
		m, e := i.Tools.Invoke(c, api.ToolCall{ID: "associated-notify", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, DelegationID: d.Delegation.ID, Kind: "notify", Text: "important-update", SourceRefs: []api.SourceSnapshot{}}})
		id := ""
		if m.Message != nil {
			id = m.Message.ID
		}
		result <- struct {
			child, message string
			err            error
		}{d.Delegation.ChildRunID, id, e}
		return api.EngineResult{Status: "finished", Text: "parent"}, e
	})
	c, _, locator := open(t, bootstrap.Options{Engine: eng})
	b := agent(t, c, "notify-B", nil)
	target = b.ID
	a := agent(t, c, "notify-A", []string{b.ID})
	start(t, c, session(t, c, a), "notify-parent")
	select {
	case r := <-result:
		if r.err != nil {
			t.Fatal(r.err)
		}
		db := database(t, locator)
		var toRun, thread, status string
		if e := db.QueryRow("SELECT to_run_id,work_thread_id,status FROM collaboration_messages WHERE message_id=?", r.message).Scan(&toRun, &thread, &status); e != nil {
			t.Fatal(e)
		}
		if toRun != r.child {
			t.Fatalf("notify acknowledged status=%s but to_run_id=%q, thread=%q; intended existing recipient Run=%q can never select it with WHERE to_run_id=?", status, toRun, thread, r.child)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("sender did not complete")
	}
}
