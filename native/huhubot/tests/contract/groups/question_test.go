package groups_test

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestAnsweredPrivateQuestionChecksCurrentContributorBeforeCheckpointResume(t *testing.T) {
	for _, removed := range []bool{false, true} {
		t.Run(fmt.Sprintf("removed=%v", removed), func(t *testing.T) {
			var target string
			answered := make(chan struct{})
			release := make(chan struct{})
			var once sync.Once
			defer once.Do(func() { close(release) })
			resumed := make(chan api.EngineResumeInput, 1)
			errs := make(chan error, 2)
			eng := resumeEngine{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "question member" {
					q, e := i.Tools.Invoke(c, api.ToolCall{ID: "question", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "question", Text: "private question", SourceRefs: []api.SourceSnapshot{}}})
					if e != nil {
						errs <- e
						return api.EngineResult{}, e
					}
					cp, e := i.Checkpoints.Publish(c, bytes.NewBufferString("question-complete-cp"))
					if e != nil {
						errs <- e
						return api.EngineResult{}, e
					}
					<-release
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "question", WaitForIDs: []string{q.Message.QuestionID}, Checkpoint: cp}}, nil
				}
				entry, inboxErr := requiredInbox(i, "private question")
				if inboxErr != nil || entry.Message.Kind != "question" || entry.Message.QuestionID == "" {
					return api.EngineResult{}, fmt.Errorf("question inbox %#v %v", entry, inboxErr)
				}
				q := *entry.Message
				_, e := i.Tools.Invoke(c, api.ToolCall{ID: "answer", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: q.FromAgentID, Kind: "reply", QuestionID: q.QuestionID, DelegationID: q.DelegationID, Text: "PRIVATE_C_ANSWER", SourceRefs: []api.SourceSnapshot{}}})
				if e != nil {
					errs <- e
					return api.EngineResult{}, e
				}
				close(answered)
				return api.EngineResult{Status: "finished", Text: "private separate completion"}, nil
			}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
				if e != nil {
					return api.EngineResult{}, e
				}
				b, e := io.ReadAll(r)
				ce := r.Close()
				if e != nil || ce != nil || string(b) != "question-complete-cp" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "PRIVATE_C_ANSWER" || i.Input.Lineage.Group == nil || len(i.Input.Lineage.Group.Members) != 2 {
					return api.EngineResult{}, fmt.Errorf("question CP/provenance mismatch %#v", i)
				}
				resumed <- i
				return api.EngineResult{Status: "finished", Text: "accepted private answer"}, nil
			}}
			c, loc := open(t, bootstrap.Options{Engine: eng})
			a := agent(t, c, "A", false)
			b := agent(t, c, "B", true)
			d := agent(t, c, "C", true)
			target = d.ID
			b = allow(t, c, b, []string{"agents.message"}, []string{d.ID})
			d = allow(t, c, d, []string{"agents.message"}, []string{b.ID})
			s := group(t, c, a, b, d)
			root := send(t, c, s, "question member", b.ID)
			select {
			case <-answered:
			case e := <-errs:
				t.Fatal(e)
			case <-time.After(3 * time.Second):
				t.Fatal("actual answer absent")
			}
			if removed {
				update(t, c, getSession(t, c, s.ID), []string{a.ID, b.ID}, api.GroupHistoryScope{Kind: "none"})
			}
			once.Do(func() { close(release) })
			terminal := wait(t, c, root.RunID)
			db := database(t, loc)
			if removed {
				select {
				case <-resumed:
					t.Fatal("revoked private answer reached Resume")
				default:
				}
				if terminal.Reason != "CHILD_PARTIAL_FAILURE" || count(t, db, "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status='failed' AND reason='GROUP_MEMBER_REMOVED'", root.RunID) != 1 {
					var states string
					_ = db.QueryRow("SELECT group_concat(status||':'||reason) FROM execution_runs WHERE root_run_id=?", root.RunID).Scan(&states)
					t.Fatalf("revoked answer not body-free terminal: %#v states=%s", terminal, states)
				}
				if count(t, db, "SELECT count(*) FROM conversation_messages WHERE session_id=? AND role='assistant'", s.ID) != 0 {
					t.Fatal("revoked answer published")
				}
			} else {
				select {
				case <-resumed:
				default:
					t.Fatal("legitimate same-CP Resume absent")
				}
				if terminal.Status != "succeeded" {
					t.Fatalf("root %#v", terminal)
				}
			}
			if e := c.Close(); e != nil {
				t.Fatal(e)
			}
			if count(t, db, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 {
				t.Fatal("question producer pins/slots retained")
			}
		})
	}
}
