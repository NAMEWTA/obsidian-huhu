package privatememory_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type aliasQuestionEngine struct {
	target   string
	input    chan api.EngineInput
	question chan api.AgentMessage
	release  chan struct{}
	once     sync.Once
	resumed  chan struct{}
	resumes  atomic.Int32
}

func (e *aliasQuestionEngine) Run(ctx context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	if in.Intent == "root asks" {
		v, err := in.Tools.Invoke(ctx, api.ToolCall{ID: "alias-question", Name: "agents.message", Message: &api.MessageCommand{TargetAgentID: e.target, Kind: "question", Text: "exact question", SourceRefs: []api.SourceSnapshot{}}})
		if err != nil {
			return api.EngineResult{}, err
		}
		e.question <- *v.Message
		cp, err := in.Checkpoints.Publish(ctx, strings.NewReader("alias-root-checkpoint"))
		if err != nil {
			return api.EngineResult{}, err
		}
		return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "question", WaitForIDs: []string{v.Message.QuestionID}, Checkpoint: cp}}, nil
	}
	e.input <- in
	select {
	case <-e.release:
		return api.EngineResult{Status: "finished", Text: "question worker finished"}, nil
	case <-ctx.Done():
		return api.EngineResult{}, ctx.Err()
	}
}
func (e *aliasQuestionEngine) Resume(ctx context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	r, err := in.Input.Checkpoints.Open(ctx, in.Checkpoint)
	if err != nil {
		return api.EngineResult{}, err
	}
	body, readErr := io.ReadAll(r)
	closeErr := r.Close()
	if readErr != nil || closeErr != nil || string(body) != "alias-root-checkpoint" || len(in.Decision.Children) != 1 || in.Decision.Children[0].Text != "actual answer" {
		return api.EngineResult{}, fmt.Errorf("original checkpoint/answer changed")
	}
	if e.resumes.Add(1) == 1 {
		close(e.resumed)
	}
	return api.EngineResult{Status: "finished", Text: "answer consumed"}, nil
}

func aliasQuestionFixture(t *testing.T, recall bool) (*memoryFixture, *aliasQuestionEngine, api.RunReceipt, api.EngineInput, api.AgentMessage, api.MemoryItem) {
	t.Helper()
	e := &aliasQuestionEngine{input: make(chan api.EngineInput, 1), question: make(chan api.AgentMessage, 1), release: make(chan struct{}), resumed: make(chan struct{})}
	f := newMemoryFixture(t, e, false)
	t.Cleanup(func() { e.once.Do(func() { close(e.release) }) })
	create := func(name string, targets []string) api.Agent {
		a, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.next(""), Draft: api.AgentDraft{Name: name, Persona: "controlled alias reader", AllowedTools: []string{"agents.message"}, AllowedCollaborationTargets: targets, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
		if err != nil {
			t.Fatal(err)
		}
		return a
	}
	b := create("alias recipient", nil)
	e.target = b.ID
	a := create("alias sender", []string{b.ID})
	var item api.MemoryItem
	if recall {
		item = f.add(namespaceFor(b), api.MemoryScope{Kind: "profile"}, "current private input")
	}
	root := f.start(f.session(a), "root asks")
	in := receiveInput(t, e.input)
	q := <-e.question
	f.wait(root.RunID, "waiting_children")
	if in.Intent != q.Text || in.ShortTerm == nil || in.RunID == root.RunID {
		t.Fatal("real question did not create its own sealed input", in)
	}
	return f, e, root, in, q, item
}

func assertAliasResourcesReleased(t *testing.T, f *memoryFixture) {
	t.Helper()
	db := f.database()
	for _, query := range []string{"SELECT count(*) FROM execution_runs WHERE child_slot<>0", "SELECT count(*) FROM task_config_pins", "SELECT count(*) FROM config_snapshot_pins"} {
		if sqlCount(t, db, query) != 0 {
			t.Fatal("terminal alias tree retained a slot or pin", query)
		}
	}
}

func TestIntentAliasContextRestoresBeforeAnswerAndRejectsCorruptSpans(t *testing.T) {
	f, e, root, in, q, _ := aliasQuestionFixture(t, false)
	var alias api.ShortTermEntry
	for _, entry := range in.ShortTerm.Entries {
		if entry.Ref.ID == q.ID {
			alias = entry
		}
	}
	if alias.Representation != "intent_alias" || alias.Spans == nil || len(alias.Spans) != 0 || alias.Text != "" || alias.Ref.Hash != testHash(q.Text) || alias.Ref.Revision != "1" {
		t.Fatal("actual immutable alias lost its original identity", alias)
	}
	db := f.database()
	var status string
	var revision int
	if err := db.QueryRow("SELECT status,revision FROM collaboration_messages WHERE message_id=?", q.ID).Scan(&status, &revision); err != nil || status != "delivered" || revision != 1 {
		t.Fatal("control was already answered before alias restoration", status, revision, err)
	}
	object, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: namespaceFor(in.Agent), Kind: "context", ID: in.RunID, Limit: 50})
	if err != nil || object.Context == nil {
		t.Fatal("public alias context failed before any answer/revision update", object, err)
	}
	found := false
	for _, view := range object.Context.Entries {
		if view.ID == alias.ID {
			found = view.State == "readable" && view.Text != nil && *view.Text == "" && view.Source != nil && *view.Source == alias.Ref && len(view.SourceSpans) == 0
		}
	}
	if !found {
		t.Fatal("public view omitted the readable empty alias", object)
	}
	a := openMemoryAdapters(t, f)
	for _, variant := range []string{"omitted-view-empty-sql", "explicit-empty-view", "nonempty-sql-span", "nil-model-spans", "different-manifest-thread", "changed-source-body", "foreign-principal"} {
		t.Run(variant, func(t *testing.T) {
			tx, err := a.base.Database().BeginTx(context.Background(), nil)
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback()
			exec := func(query string, args ...any) {
				if _, err := tx.Exec(query, args...); err != nil {
					t.Fatal(err)
				}
			}
			id := owner
			switch variant {
			case "explicit-empty-view":
				var raw string
				if err := tx.QueryRow("SELECT metadata_json FROM memory_context_entries WHERE entry_id=?", alias.ID).Scan(&raw); err != nil {
					t.Fatal(err)
				}
				var metadata map[string]any
				if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
					t.Fatal(err)
				}
				metadata["View"].(map[string]any)["sourceSpans"] = []api.ContextTextSpan{}
				exec("UPDATE memory_context_entries SET metadata_json=? WHERE entry_id=?", memoryJSON(t, metadata), alias.ID)
			case "nonempty-sql-span":
				exec("UPDATE memory_context_entries SET spans_json=? WHERE entry_id=?", `[{"start":0,"end":1}]`, alias.ID)
			case "nil-model-spans", "different-manifest-thread":
				var raw string
				var value api.ShortTermInput
				if err := tx.QueryRow("SELECT short_term_json FROM memory_run_contexts WHERE run_id=?", in.RunID).Scan(&raw); err != nil || json.Unmarshal([]byte(raw), &value) != nil {
					t.Fatal("missing actual manifest", err)
				}
				if variant == "different-manifest-thread" {
					value.Namespace.WorkThreadID = "thread:another"
				} else {
					for i := range value.Entries {
						if value.Entries[i].ID == alias.ID {
							value.Entries[i].Spans = nil
						}
					}
				}
				exec("UPDATE memory_run_contexts SET short_term_json=? WHERE run_id=?", memoryJSON(t, value), in.RunID)
			case "changed-source-body":
				exec("UPDATE collaboration_messages SET text='different body' WHERE message_id=?", q.ID)
			case "foreign-principal":
				id = api.NewConnectionIdentity("alias-other", "another-owner", true)
			}
			actual, err := a.memory.ReadContextInTx(context.Background(), tx, id, in.RunID)
			if variant == "omitted-view-empty-sql" || variant == "explicit-empty-view" {
				if err != nil || !reflect.DeepEqual(actual, in.ShortTerm) {
					t.Fatal("legal optional projection changed immutable model input", actual, err)
				}
				return
			}
			wanted := "MEMORY_INPUT_STATE_INVALID"
			if variant == "foreign-principal" {
				wanted = "MEMORY_NAMESPACE_DENIED"
			}
			if actual != nil || !memoryReason(err, wanted) {
				t.Fatal("corrupt/currently unauthorized source became a readable input", actual, err)
			}
		})
	}
	// All deliberately corrupted variants rolled back. The real answer and
	// the original checkpoint must still complete the same public tree.
	d, err := f.core.API.Collaboration.GetTask(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: q.DelegationID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Messages.Reply(context.Background(), owner, api.ReplyCommand{CommandMeta: f.next(d.Revision), DelegationID: d.ID, QuestionID: q.QuestionID, Text: "actual answer", SourceRefs: []api.SourceSnapshot{}}); err != nil {
		t.Fatal(err)
	}
	waitMemorySignal(t, e.resumed, "original question checkpoint Resume")
	e.once.Do(func() { close(e.release) })
	f.wait(in.RunID, "succeeded")
	f.wait(root.RunID, "succeeded")
	if e.resumes.Load() != 1 {
		t.Fatal("duplicate question Resume", e.resumes.Load())
	}
	assertAliasResourcesReleased(t, f)
	if sqlCount(t, db, "SELECT count(*) FROM collaboration_wait_edges") != 0 {
		t.Fatal("answered tree retained a wait edge")
	}
}

func TestIntentAliasRestoreRechecksForgottenCurrentMemory(t *testing.T) {
	f, e, root, in, _, item := aliasQuestionFixture(t, true)
	if in.Memory == nil || len(in.Memory.Entries) != 1 || in.Memory.Entries[0].Ref.ID != item.RevisionID {
		t.Fatal("qualification control did not consume actual memory", in.Memory)
	}
	a := openMemoryAdapters(t, f)
	if _, err := f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(item.Revision), Namespace: item.Namespace, ID: item.ID}); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"short-term", "memory"} {
		t.Run(kind, func(t *testing.T) {
			err := a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
				if kind == "short-term" {
					value, err := a.memory.ReadContextInTx(context.Background(), tx, owner, in.RunID)
					if value != nil {
						t.Fatal("forgotten ancestry returned model context")
					}
					return err
				}
				value, err := a.memory.ReadInputInTx(context.Background(), tx, owner, in.RunID)
				if value != nil {
					t.Fatal("forgotten head returned model memory")
				}
				return err
			})
			if !memoryReason(err, "MEMORY_FORGOTTEN") {
				t.Fatal("restoration ignored current forget", err)
			}
		})
	}
	run, err := f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: root.RunID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Approvals.Cancel(context.Background(), owner, api.RunCancel{CommandMeta: f.next(run.Revision), ID: root.RunID}); err != nil {
		t.Fatal(err)
	}
	e.once.Do(func() { close(e.release) })
	f.wait(in.RunID, "canceled")
	f.wait(root.RunID, "canceled")
	if e.resumes.Load() != 0 {
		t.Fatal("forgotten/canceled tree resumed a model")
	}
	// Cancellation closes admission before producers necessarily finish. Join
	// the real Core before checking the terminal resource barrier.
	if err := f.core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	closeCtx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	if err := f.core.WaitClosed(closeCtx); err != nil {
		t.Fatal(err)
	}
	assertAliasResourcesReleased(t, f)
	db := a.base.Database()
	if sqlCount(t, db, "SELECT count(*) FROM execution_runs") != 2 || sqlCount(t, db, "SELECT count(*) FROM execution_runs WHERE status!='canceled' OR task_admission_closed!=1") != 0 {
		t.Fatal("canceled question tree retained an open/nonterminal Run")
	}
	// Closed historical edges are not scheduled by nextReadyParentInTx. They
	// are retained facts, unlike active waits on a waiting_children Run.
	active := sqlCount(t, db, "SELECT count(*) FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.state='waiting' AND r.status='waiting_children' AND r.task_admission_closed=0")
	if active != 0 {
		t.Fatal("canceled question tree retained a schedulable parent", active)
	}
	if sqlCount(t, db, "SELECT count(*) FROM collaboration_wait_edges e LEFT JOIN execution_runs f ON f.run_id=e.from_run_id LEFT JOIN execution_runs t ON t.run_id=e.to_run_id WHERE f.run_id IS NULL OR t.run_id IS NULL OR f.status!='canceled' OR t.status!='canceled' OR f.task_admission_closed!=1 OR t.task_admission_closed!=1") != 0 {
		t.Fatal("remaining wait edge escaped the closed canceled tree")
	}
	t.Logf("closed canceled historical wait edges=%d; schedulable parents=%d; slots/pins=0; actual Core closed", sqlCount(t, db, "SELECT count(*) FROM collaboration_wait_edges"), active)
}
