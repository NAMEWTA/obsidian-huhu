package groups_test

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread(t *testing.T) {
	var target string
	entered := make(chan struct{})
	sealed := make(chan string, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var runs, resumes atomic.Int32
	var supplements [2]api.AgentMessage
	seen := make(chan error, 1)
	eng := resumeEngine{
		run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
			runs.Add(1)
			if i.Intent == "nested wait" {
				close(entered)
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				return api.EngineResult{Status: "finished", Text: "nested result"}, nil
			}
			if i.ShortTerm == nil || i.ShortTerm.BindingDigest == "" {
				return api.EngineResult{}, api.Invalid("SEALED_PREFIX_MISSING")
			}
			sealed <- i.ShortTerm.BindingDigest
			d, e := i.Tools.Invoke(c, api.ToolCall{ID: "nested", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "nested wait", Constraints: []string{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			cp, e := i.Checkpoints.Publish(c, bytes.NewBufferString("actual-group-wait"))
			if e != nil {
				return api.EngineResult{}, e
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{d.Delegation.ChildRunID}, Checkpoint: cp}}, nil
		}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
			resumes.Add(1)
			r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
			if e != nil {
				return api.EngineResult{}, e
			}
			body, e := io.ReadAll(r)
			ce := r.Close()
			if e != nil || ce != nil || string(body) != "actual-group-wait" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "nested result" {
				e = fmt.Errorf("checkpoint/outcome mismatch: %v %v %#v", e, ce, i.Decision)
			}
			if supplements[0].Text != "USER_SUPPLEMENT" || supplements[1].Text != "USER_SUPPLEMENT" || supplements[0].FromAgentID != "" || supplements[1].FromAgentID != "" || supplements[0].ID == supplements[1].ID {
				e = fmt.Errorf("actual user supplement identities changed: %#v", supplements)
			} else if inboxErr := requiredResumeMessages(i, supplements[:]...); inboxErr != nil {
				e = fmt.Errorf("actual resumed thread lost user supplements: %w", inboxErr)
			}
			if e == nil {
				select {
				case original := <-sealed:
					if i.Input.ShortTerm.BindingDigest != original {
						e = fmt.Errorf("sealed short-term prefix changed on resume")
					}
				default:
					e = fmt.Errorf("sealed short-term prefix was not recorded")
				}
			}
			seen <- e
			return api.EngineResult{Status: "finished", Text: "accepted supplemented result"}, e
		}}
	c, loc := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "A", false)
	b := agent(t, c, "B", true)
	d := agent(t, c, "C", true)
	target = d.ID
	b = allow(t, c, b, []string{"agents.delegate"}, []string{d.ID})
	s := group(t, c, a, b, d)
	root := send(t, c, s, "wait with user", b.ID)
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("nested actual producer absent")
	}
	db := database(t, loc)
	var delegation string
	deadline := time.Now().Add(3 * time.Second)
	for {
		if count(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status='waiting_children'", root.RunID) == 1 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("member did not wait")
		}
		time.Sleep(time.Millisecond)
	}
	if e := db.QueryRow("SELECT delegation_id FROM collaboration_delegations WHERE parent_run_id=?", root.RunID).Scan(&delegation); e != nil {
		t.Fatal(e)
	}
	task, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: delegation})
	if e != nil {
		t.Fatal(e)
	}
	command := api.ReplyCommand{CommandMeta: meta(t, c, "user-supplement", task.Revision), DelegationID: task.ID, Text: "USER_SUPPLEMENT", SourceRefs: []api.SourceSnapshot{}}
	first, e := c.API.Messages.Reply(ctx, owner, command)
	if e != nil {
		t.Fatalf("owned waiting group user reply rejected: %v", e)
	}
	supplements[0] = first
	command.CommandID = "new-transport-id"
	again, e := c.API.Messages.Reply(ctx, owner, command)
	if e != nil || again.ID != first.ID {
		t.Fatalf("reply receipt mismatch: %#v %v", again, e)
	}
	current, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: task.ID})
	if e != nil {
		t.Fatal(e)
	}
	secondCommand := api.ReplyCommand{CommandMeta: meta(t, c, "second-user-supplement", current.Revision), DelegationID: task.ID, Text: "USER_SUPPLEMENT", SourceRefs: []api.SourceSnapshot{}}
	second, e := c.API.Messages.Reply(ctx, owner, secondCommand)
	if e != nil || second.ID == first.ID {
		t.Fatalf("same-body distinct user supplement rejected or merged: %#v %v", second, e)
	}
	supplements[1] = second
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE root_run_id=?", root.RunID) != 3 {
		t.Fatal("supplement created extra Run")
	}
	once.Do(func() { close(release) })
	if r := wait(t, c, root.RunID); r.Status != "succeeded" {
		t.Fatalf("root %#v", r)
	}
	select {
	case e := <-seen:
		if e != nil {
			t.Fatal(e)
		}
	default:
		t.Fatal("same CP Resume absent")
	}
	if runs.Load() != 2 || resumes.Load() != 1 || count(t, db, "SELECT count(*) FROM collaboration_messages WHERE text='USER_SUPPLEMENT'") != 2 {
		t.Fatalf("extra model/message work run=%d resume=%d", runs.Load(), resumes.Load())
	}
	if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
		t.Fatal("terminal slots/pins retained")
	}
}
