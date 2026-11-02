package delegation_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func sourceAgents(t *testing.T, c *bootstrap.Core) (api.Agent, api.Agent, api.SourceSnapshot, api.Grant, *sourceHost) {
	t.Helper()
	source, h := attach(t, c)
	b := agent(t, c, "B", nil)
	b, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "self", b.Revision), ID: b.ID, Draft: api.AgentDraft{Name: b.Name, Persona: b.Persona, Model: &b.Model.ModelBindingDraft, AllowedTools: b.AllowedTools, AllowedCollaborationTargets: []string{b.ID}}})
	if e != nil {
		t.Fatal(e)
	}
	a := agent(t, c, "A", []string{b.ID})
	g := grant(t, c, source, recipient(a))
	grant(t, c, source, recipient(b))
	return a, b, source, g, h
}
func startSource(t *testing.T, c *bootstrap.Core, a api.Agent, source api.SourceSnapshot, g api.Grant) api.RunReceipt {
	t.Helper()
	s := session(t, c, a)
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "source-start", s.Revision), SessionID: s.ID, Intent: "root", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}})
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func thirdSource(source api.SourceSnapshot) api.SourceSnapshot {
	source.ResourceID = "resource:third"
	return source
}

func TestTaskReplySourceBoundaryAndWaitingUserSupplementReachActualResume(t *testing.T) {
	for _, caller := range []string{"active-user", "active-model", "waiting-user"} {
		t.Run(caller, func(t *testing.T) {
			var target string
			created := make(chan api.Delegation, 1)
			tools := make(chan api.ToolInvoker, 1)
			sealed := make(chan string, 1)
			rootRelease, leafRelease := make(chan struct{}), make(chan struct{})
			var rootOnce, leafOnce sync.Once
			defer func() { rootOnce.Do(func() { close(rootRelease) }); leafOnce.Do(func() { close(leafRelease) }) }()
			consumed := make(chan error, 1)
			var supplement api.AgentMessage
			var models, resumes atomic.Int32
			eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				models.Add(1)
				switch i.Intent {
				case "root":
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "B", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "B", Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					created <- *v.Delegation
					tools <- i.Tools
					select {
					case <-rootRelease:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
					return api.EngineResult{Status: "finished", Text: "root"}, nil
				case "B":
					if i.ShortTerm == nil || i.ShortTerm.BindingDigest == "" {
						return api.EngineResult{}, api.Invalid("SEALED_PREFIX_MISSING")
					}
					sealed <- i.ShortTerm.BindingDigest
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "leaf", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "leaf", Constraints: []string{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("B-state"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
				default:
					select {
					case <-leafRelease:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
					return api.EngineResult{Status: "finished", Text: "leaf"}, nil
				}
			}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				resumes.Add(1)
				check := func() error {
					r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
					if e != nil {
						return e
					}
					body, e := io.ReadAll(r)
					closeErr := r.Close()
					if e != nil || closeErr != nil || string(body) != "B-state" || len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "leaf" {
						return fmt.Errorf("same checkpoint/leaf outcome missing: body=%q decision=%#v read=%v close=%v", body, i.Decision, e, closeErr)
					}
					if supplement.Text != "actual supplement" || len(i.Input.Context.Sources) != 1 {
						return fmt.Errorf("supplement body/source missing: %#v %#v", supplement, i.Input.Context.Sources)
					}
					if err := requiredResumeMessages(i, supplement); err != nil {
						return fmt.Errorf("supplement not actually consumed in resume decision: %w", err)
					}
					original := ""
					select {
					case original = <-sealed:
					default:
						return fmt.Errorf("sealed short-term prefix was not recorded")
					}
					if i.Input.ShortTerm.BindingDigest != original {
						return fmt.Errorf("sealed short-term prefix changed on resume")
					}
					return nil
				}()
				consumed <- check
				return api.EngineResult{Status: "finished", Text: "B resumed"}, check
			}}
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			a, b, source, g, h := sourceAgents(t, c)
			target = b.ID
			r := startSource(t, c, a, source, g)
			var d api.Delegation
			var bound api.ToolInvoker
			select {
			case d = <-created:
			case <-time.After(5 * time.Second):
				t.Fatal("no child")
			}
			select {
			case bound = <-tools:
			case <-time.After(5 * time.Second):
				t.Fatal("no actual tools")
			}
			wait(t, c, d.ChildRunID, "waiting_children")
			invoke := func(command api.ReplyCommand, key string) (api.AgentMessage, error) {
				if caller == "active-model" {
					v, e := bound.Invoke(ctx, api.ToolCall{ID: key, Name: "tasks.reply", Reply: &command})
					if v.Message == nil {
						return api.AgentMessage{}, e
					}
					return *v.Message, e
				}
				return c.API.Messages.Reply(ctx, owner, command)
			}
			db := database(t, loc)
			foreign := func() {
				t.Helper()
				current, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: gProfile(t, c), ID: d.ID})
				if e != nil {
					t.Fatal(e)
				}
				before := count(t, db, "SELECT count(*) FROM collaboration_messages")
				_, e = invoke(api.ReplyCommand{CommandMeta: meta(t, c, "foreign", current.Revision), DelegationID: d.ID, Text: "must not deliver", SourceRefs: []api.SourceSnapshot{thirdSource(source)}}, "foreign")
				if !reason(e, "PARENT_SCOPE_EXCEEDED") {
					t.Fatalf("explicit foreign source was discarded: %v", e)
				}
				if count(t, db, "SELECT count(*) FROM collaboration_messages") != before || count(t, db, "SELECT count(*) FROM execution_runs") != 3 {
					t.Fatal("rejected supplement changed durable work")
				}
			}
			if caller != "waiting-user" {
				foreign()
			} else {
				rootOnce.Do(func() { close(rootRelease) })
				wait(t, c, r.RunID, "waiting_children")
			}
			command := api.ReplyCommand{CommandMeta: meta(t, c, "legal", d.Revision), DelegationID: d.ID, Text: "actual supplement", SourceRefs: []api.SourceSnapshot{source}}
			if caller == "active-user" {
				// Omitting labels must not strip the sender's actual provenance.
				command.SourceRefs = []api.SourceSnapshot{}
			}
			m, e := invoke(command, "legal")
			if e != nil {
				t.Fatalf("legitimate waiting/user supplement rejected: %v", e)
			}
			supplement = m
			command.CommandID = "transport-retry"
			again, e := invoke(command, "legal")
			if e != nil || again.ID != m.ID {
				t.Fatalf("supplement replay %#v %v", again, e)
			}
			if caller == "waiting-user" {
				foreign()
			} else {
				rootOnce.Do(func() { close(rootRelease) })
				wait(t, c, r.RunID, "waiting_children")
			}
			if caller == "active-model" {
				stale := command
				stale.CommandMeta = meta(t, c, "stale-claim", "2")
				stale.Text = "new action from ended claim"
				if _, e = invoke(stale, "stale-claim"); e == nil {
					t.Fatal("ended model claim performed another supplement")
				}
			}
			var raw string
			if e = db.QueryRow("SELECT source_json FROM collaboration_messages WHERE message_id=?", m.ID).Scan(&raw); e != nil || !strings.Contains(raw, source.ResourceID) {
				t.Fatalf("actual source provenance lost %s %v", raw, e)
			}
			leafOnce.Do(func() { close(leafRelease) })
			select {
			case e := <-consumed:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("supplement stayed only in SQL")
			}
			wait(t, c, r.RunID, "succeeded")
			if models.Load() != 3 || resumes.Load() != 1 {
				t.Fatalf("supplement created extra model work %d/%d", models.Load(), resumes.Load())
			}
			h.mu.Lock()
			third := h.calls["resource:third"]
			h.mu.Unlock()
			if third != 0 {
				t.Fatal("foreign source was read")
			}
		})
	}
}
func gProfile(t *testing.T, c *bootstrap.Core) string {
	t.Helper()
	return meta(t, c, "q", "").ProfileID
}

func TestModelTerminalReplyChecksActualAdmissionSourcesBeforeNewRun(t *testing.T) {
	var target string
	created := make(chan api.Delegation, 1)
	tools := make(chan api.ToolInvoker, 1)
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "root" {
			v, e := i.Tools.Invoke(c, api.ToolCall{ID: "first", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "first", Constraints: []string{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			created <- *v.Delegation
			tools <- i.Tools
			select {
			case <-release:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
		}
		if len(i.Context.Sources) != 1 {
			return api.EngineResult{}, api.Invalid("SOURCE_NOT_CONSUMED")
		}
		return api.EngineResult{Status: "finished", Text: i.Intent}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	a, b, source, g, _ := sourceAgents(t, c)
	target = b.ID
	root := startSource(t, c, a, source, g)
	var d api.Delegation
	var bound api.ToolInvoker
	select {
	case d = <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("no child")
	}
	bound = <-tools
	wait(t, c, d.ChildRunID, "succeeded")
	command := api.ReplyCommand{CommandMeta: meta(t, c, "model-follow", d.Revision), DelegationID: d.ID, Text: "model follow", SourceRefs: []api.SourceSnapshot{thirdSource(source)}}
	if _, e := bound.Invoke(ctx, api.ToolCall{ID: "bad-follow", Name: "tasks.reply", Reply: &command}); !reason(e, "PARENT_SCOPE_EXCEEDED") {
		t.Fatalf("terminal model ignored foreign provenance: %v", e)
	}
	if count(t, database(t, loc), "SELECT count(*) FROM execution_runs") != 2 {
		t.Fatal("foreign terminal input created work")
	}
	command.SourceRefs = []api.SourceSnapshot{source}
	one, e := bound.Invoke(ctx, api.ToolCall{ID: "good-follow", Name: "tasks.reply", Reply: &command})
	if e != nil {
		t.Fatal(e)
	}
	two, e := bound.Invoke(ctx, api.ToolCall{ID: "good-follow", Name: "tasks.reply", Reply: &command})
	if e != nil || one.Message.ID != two.Message.ID {
		t.Fatalf("terminal model replay %v", e)
	}
	next, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: gProfile(t, c), ID: one.Message.DelegationID})
	if e != nil {
		t.Fatal(e)
	}
	wait(t, c, next.ChildRunID, "succeeded")
	once.Do(func() { close(release) })
	wait(t, c, root.RunID, "succeeded")
}

func TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer(t *testing.T) {
	for _, caller := range []string{"active-model", "waiting-user", "canceled-user", "agent-message-empty", "agent-message-subset"} {
		t.Run(caller, func(t *testing.T) {
			agentMessage := strings.HasPrefix(caller, "agent-message-")
			activeModel := caller == "active-model" || agentMessage
			var target string
			qmade := make(chan api.AgentMessage, 1)
			tools := make(chan api.ToolInvoker, 1)
			release := make(chan struct{})
			var once sync.Once
			defer once.Do(func() { close(release) })
			consumed := make(chan struct {
				err         error
				replyID     string
				replyThread string
			}, 1)
			var models, resumes atomic.Int32
			eng := resumable{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				models.Add(1)
				if i.Intent == "root" {
					v, e := i.Tools.Invoke(c, api.ToolCall{ID: "q", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: target, Kind: "question", Text: "question", SourceRefs: []api.SourceSnapshot{}}})
					if e != nil {
						return api.EngineResult{}, e
					}
					qmade <- *v.Message
					cp, e := i.Checkpoints.Publish(c, strings.NewReader("root-question"))
					if e != nil {
						return api.EngineResult{}, e
					}
					return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "question", WaitForIDs: []string{v.Message.QuestionID}, Checkpoint: cp}}, nil
				}
				if i.Intent == "question" {
					tools <- i.Tools
					if !activeModel {
						v, e := i.Tools.Invoke(c, api.ToolCall{ID: "leaf", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "leaf", Constraints: []string{}}})
						if e != nil {
							return api.EngineResult{}, e
						}
						cp, e := i.Checkpoints.Publish(c, strings.NewReader("B-wait"))
						if e != nil {
							return api.EngineResult{}, e
						}
						return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, nil
					}
				}
				select {
				case <-release:
				case <-c.Done():
					return api.EngineResult{}, c.Err()
				}
				return api.EngineResult{Status: "finished", Text: "child"}, nil
			}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
				resumes.Add(1)
				if i.Input.Intent == "root" {
					replyID := ""
					replyThread := ""
					bodyHash := sha256.Sum256([]byte("actual answer"))
					wantHash := "sha256:" + hex.EncodeToString(bodyHash[:])
					check := func() error {
						if len(i.Decision.Children) != 1 || i.Decision.Children[0].Text != "actual answer" {
							return fmt.Errorf("answer not consumed %#v", i.Decision)
						}
						if len(i.Input.Context.Sources) != 1 {
							return fmt.Errorf("reply source qualification missing")
						}
						// The answered question is the fixed continuation Decision,
						// not a new entry spliced into the sealed initial prefix.
						for _, ref := range i.Decision.Children[0].Derived {
							if ref.Kind == "message" && ref.ID != "" && ref.Revision == "1" && ref.Hash == wantHash && ref.Namespace != "" && ref.WorkThreadID == ref.Namespace {
								replyID = ref.ID
								replyThread = ref.WorkThreadID
								return nil
							}
						}
						return fmt.Errorf("answered message absent from continuation provenance: %#v", i.Decision.Children[0].Derived)
					}()
					consumed <- struct {
						err         error
						replyID     string
						replyThread string
					}{check, replyID, replyThread}
					return api.EngineResult{Status: "finished", Text: "root answer"}, check
				}
				return api.EngineResult{Status: "finished", Text: "B resumed"}, nil
			}}
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			if caller == "waiting-user" {
				defer func() {
					if !t.Failed() {
						return
					}
					db := database(t, loc)
					rows, err := db.Query("SELECT run_id,parent_run_id,status,revision,reason FROM execution_runs ORDER BY created_at,run_id")
					if err != nil {
						t.Logf("run diagnostic query: %v", err)
						return
					}
					defer rows.Close()
					for rows.Next() {
						var id, parent, status, reason string
						var revision int
						if err := rows.Scan(&id, &parent, &status, &revision, &reason); err != nil {
							t.Logf("run diagnostic scan: %v", err)
							return
						}
						t.Logf("run diagnostic: id=%s parent=%s status=%s revision=%d reason=%s", id, parent, status, revision, reason)
					}
					parents, err := db.Query("SELECT p.run_id,p.state,r.task_admission_closed,r.status FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id ORDER BY p.run_id")
					if err != nil {
						t.Logf("parent diagnostic query: %v", err)
						return
					}
					defer parents.Close()
					for parents.Next() {
						var id, state, status string
						var closed int
						if err := parents.Scan(&id, &state, &closed, &status); err != nil {
							t.Logf("parent diagnostic scan: %v", err)
							return
						}
						t.Logf("parent diagnostic: id=%s state=%s closed=%d status=%s", id, state, closed, status)
					}
				}()
			}
			a, b, source, g, _ := sourceAgents(t, c)
			target = b.ID
			root := startSource(t, c, a, source, g)
			var q api.AgentMessage
			select {
			case q = <-qmade:
			case <-time.After(5 * time.Second):
				t.Fatal("no question")
			}
			bound := <-tools
			wait(t, c, root.RunID, "waiting_children")
			d, e := c.API.Collaboration.GetTask(ctx, owner, api.IDQuery{ProfileID: gProfile(t, c), ID: q.DelegationID})
			if e != nil {
				t.Fatal(e)
			}
			wanted := "running"
			if !activeModel {
				wanted = "waiting_children"
			}
			wait(t, c, d.ChildRunID, wanted)
			invoke := func(command api.ReplyCommand, key string) (api.AgentMessage, error) {
				if activeModel {
					call := api.ToolCall{ID: key, Name: "tasks.reply", Reply: &command}
					if agentMessage {
						call = api.ToolCall{ID: key, Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: q.FromAgentID, Kind: "reply", Text: command.Text, QuestionID: command.QuestionID, DelegationID: command.DelegationID, SourceRefs: command.SourceRefs}}
					}
					v, e := bound.Invoke(ctx, call)
					if v.Message == nil {
						return api.AgentMessage{}, e
					}
					return *v.Message, e
				}
				return c.API.Messages.Reply(ctx, owner, command)
			}
			command := api.ReplyCommand{CommandMeta: meta(t, c, "answer", d.Revision), DelegationID: d.ID, QuestionID: q.QuestionID, Text: "actual answer", SourceRefs: []api.SourceSnapshot{source}}
			if activeModel {
				bad := command
				bad.IdempotencyKey = "foreign-answer"
				bad.CommandID = "foreign-answer"
				bad.SourceRefs = []api.SourceSnapshot{thirdSource(source)}
				db := database(t, loc)
				beforeMessages := count(t, db, "SELECT count(*) FROM collaboration_messages")
				beforeEdges := count(t, db, "SELECT count(*) FROM collaboration_wait_edges")
				beforeReceipts := count(t, db, "SELECT count(*) FROM command_receipts")
				if _, e = invoke(bad, "foreign-answer"); !reason(e, "PARENT_SCOPE_EXCEEDED") {
					t.Fatalf("question ignored foreign source: %v", e)
				}
				var state string
				if e = db.QueryRow("SELECT status FROM collaboration_messages WHERE message_id=?", q.ID).Scan(&state); e != nil || state != "delivered" {
					t.Fatalf("rejected answer changed question %s %v", state, e)
				}
				if count(t, db, "SELECT count(*) FROM collaboration_messages") != beforeMessages || count(t, db, "SELECT count(*) FROM collaboration_wait_edges") != beforeEdges || count(t, db, "SELECT count(*) FROM command_receipts") != beforeReceipts || count(t, db, "SELECT count(*) FROM execution_runs") != 2 {
					t.Fatal("rejected answer changed message/wait edge/receipt/Run")
				}
			}
			if caller == "canceled-user" {
				r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: gProfile(t, c), ID: root.RunID})
				if e != nil {
					t.Fatal(e)
				}
				if _, e = c.API.Approvals.Cancel(ctx, owner, api.RunCancel{CommandMeta: meta(t, c, "cancel", r.Revision), ID: r.ID}); e != nil {
					t.Fatal(e)
				}
				if _, e = invoke(command, "answer"); e == nil {
					t.Fatal("answer revived canceled sender/target")
				}
				if count(t, database(t, loc), "SELECT count(*) FROM collaboration_messages WHERE kind='reply'") != 0 {
					t.Fatal("canceled answer persisted")
				}
				wait(t, c, root.RunID, "canceled")
				return
			}
			if caller == "agent-message-empty" {
				command.SourceRefs = []api.SourceSnapshot{}
			}
			one, e := invoke(command, "answer")
			if e != nil {
				t.Fatalf("waiting user answer rejected: %v", e)
			}
			command.CommandID = "transport-retry"
			two, e := invoke(command, "answer")
			if e != nil || one.ID != two.ID {
				t.Fatalf("answer replay %v", e)
			}
			var actualSources string
			if e = database(t, loc).QueryRow("SELECT source_json FROM collaboration_messages WHERE message_id=?", one.ID).Scan(&actualSources); e != nil || !strings.Contains(actualSources, source.ResourceID) {
				t.Fatalf("answer lost actual provenance %s %v", actualSources, e)
			}
			select {
			case observed := <-consumed:
				if observed.err != nil || observed.replyID != one.ID || observed.replyThread != one.WorkThreadID {
					t.Fatalf("actual answer Decision mismatch: %#v want=%s", observed, one.ID)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("answer never reached actual Engine.Resume")
			}
			once.Do(func() { close(release) })
			wait(t, c, root.RunID, "succeeded")
			expected := int32(1)
			if caller == "waiting-user" {
				expected = 2
			}
			if resumes.Load() != expected {
				t.Fatalf("extra resume %d", resumes.Load())
			}
			if agentMessage && (models.Load() != 2 || count(t, database(t, loc), "SELECT count(*) FROM execution_runs") != 2) {
				t.Fatal("answer created extra model Run")
			}
		})
	}
}
