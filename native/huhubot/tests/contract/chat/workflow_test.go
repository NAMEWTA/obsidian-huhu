package chat_test

import (
	"context"
	"encoding/json"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestImmutableConfigurationHistoryEditRetryArchiveAndUsage(t *testing.T) {
	inputs := make(chan api.EngineInput, 4)
	gate := make(chan struct{})
	var closeOnce sync.Once
	var calls atomic.Int32
	engine := fakeEngine{func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		n := calls.Add(1)
		inputs <- in
		if n == 1 {
			select {
			case <-gate:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
		}
		return api.EngineResult{Status: "finished", Text: "answer"}, nil
	}}
	c, root, locator := withEngine(t, engine, false)
	defer closeOnce.Do(func() { close(gate) })
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "old-model", Protocol: "openai-responses", Endpoint: "https://old.invalid", Capabilities: []string{"text"}}
	agent, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "agent", ""), Draft: api.AgentDraft{Name: "test", Persona: "old persona", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	s, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if e != nil {
		t.Fatal(e)
	}
	first, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "first", s.Revision), SessionID: s.ID, Intent: "original", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	input := <-inputs
	if input.Agent.Persona != "old persona" || input.Agent.Model.ModelID != "old-model" {
		t.Fatal("first snapshot", input.Agent)
	}
	preview, e := c.API.Assistant.DeletePreview(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: agent.ID})
	if e != nil {
		t.Fatal(e)
	}
	categories := map[string]api.DeletionCategory{}
	for _, category := range preview.Categories {
		categories[category.Kind] = category
	}
	if categories["active-runs"].Count != 1 || categories["related-sessions"].Count != 1 {
		t.Fatal("real usage not assembled", preview)
	}
	_, e = c.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta(t, c, "delete-running", agent.Revision), ID: agent.ID, PreviewToken: preview.Token})
	expect(t, e, "AGENT_IN_USE")
	model.ModelID = "new-model"
	model.Endpoint = "https://new.invalid"
	updated, e := c.API.Assistant.Update(ctx, owner, api.AgentUpdate{CommandMeta: meta(t, c, "update", agent.Revision), ID: agent.ID, Draft: api.AgentDraft{Name: "test", Persona: "new persona", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	db := inspect(t, locator)
	if n := count(t, db, "SELECT count(*) FROM persona_revisions WHERE agent_id=? AND revision=?", agent.ID, agent.PersonaRevision); n != 1 {
		t.Fatal("pinned persona removed", n)
	}
	if input.Agent.Persona != "old persona" || input.Agent.Model.ModelID != "old-model" {
		t.Fatal("snapshot mutated")
	}
	closeOnce.Do(func() { close(gate) })
	waitRun(t, c, first.RunID, "succeeded")
	history, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 1}, SessionID: s.ID})
	if e != nil || len(history.Items) != 1 || history.NextCursor == "" {
		t.Fatal("history first page", history, e)
	}
	next, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID, Limit: 1, Cursor: history.NextCursor}, SessionID: s.ID})
	if e != nil || len(next.Items) != 1 || next.Items[0].Role != "user" {
		t.Fatal("history prior page", next, e)
	}
	edit, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "edited", state(t, c, s.ID).Revision), SessionID: s.ID, Intent: "edited", SourceRefs: []api.SourceSnapshot{}, SupersedesMessageID: next.Items[0].ID, RetryOfRunID: first.RunID})
	if e != nil {
		t.Fatal(e)
	}
	input = <-inputs
	if input.Agent.Persona != "new persona" || input.Agent.Model.ModelID != "new-model" {
		t.Fatal("next snapshot did not use current revision", input.Agent)
	}
	run := waitRun(t, c, edit.RunID, "succeeded")
	if run.PersonaRevision != updated.PersonaRevision || run.RetryOfRunID != first.RunID || run.RootRunID != edit.RunID {
		t.Fatal("run references", run)
	}
	archived, e := c.API.Conversation.Archive(ctx, owner, api.SessionArchive{CommandMeta: meta(t, c, "archive", state(t, c, s.ID).Revision), ID: s.ID})
	if e != nil || !archived.Archived {
		t.Fatal(archived, e)
	}
	_, e = c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "archived-send", archived.Revision), SessionID: s.ID, Intent: "no", SourceRefs: []api.SourceSnapshot{}})
	expect(t, e, "SESSION_ARCHIVED")
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	reopened, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: engine})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	run = waitRun(t, reopened, edit.RunID, "succeeded")
	if run.RetryOfRunID != first.RunID {
		t.Fatal("retry not durable", run)
	}
	all, e := reopened.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, reopened, "q", "").ProfileID}, SessionID: s.ID})
	if e != nil || len(all.Items) != 4 || all.Items[2].SupersedesMessageID != next.Items[0].ID {
		t.Fatal("edit changed old fact", all, e)
	}
	if calls.Load() != 2 {
		t.Fatal("navigation/archive/reopen called model", calls.Load())
	}
}

func TestAdmissionRollbackAfterFirstEventFailurePreservesKeyAndPin(t *testing.T) {
	c, _, locator := withEngine(t, nil, true)
	s := session(t, c)
	db := inspect(t, locator)
	_, e := db.Exec("CREATE TRIGGER fail_accepted_event BEFORE INSERT ON execution_events BEGIN SELECT RAISE(ABORT,'injected event commit failure'); END")
	if e != nil {
		t.Fatal(e)
	}
	cmd := api.RunStart{CommandMeta: meta(t, c, "same-key", s.Revision), SessionID: s.ID, Intent: "draft preserved", SourceRefs: []api.SourceSnapshot{}}
	_, e = c.API.Conversation.StartRun(ctx, owner, cmd)
	if e == nil {
		t.Fatal("failed transaction reported saved")
	}
	for _, table := range []string{"execution_runs", "execution_events", "conversation_messages", "config_snapshot_pins"} {
		if n := count(t, db, "SELECT count(*) FROM "+table); n != 0 {
			t.Fatal("rollback leaked", table, n)
		}
	}
	if n := count(t, db, "SELECT count(*) FROM command_receipts WHERE method='runs.start'"); n != 0 {
		t.Fatal("failed command retained receipt", n)
	}
	if got := state(t, c, s.ID); got.Revision != s.Revision {
		t.Fatal("failed admission changed session", got)
	}
	if _, e = db.Exec("DROP TRIGGER fail_accepted_event"); e != nil {
		t.Fatal(e)
	}
	receipt, e := c.API.Conversation.StartRun(ctx, owner, cmd)
	if e != nil || receipt.RunID == "" {
		t.Fatal("original key could not be retried after rollback", receipt, e)
	}
}

func TestFailedPartialResultAndProductionUnavailableRemainHonest(t *testing.T) {
	for _, partial := range []bool{false, true} {
		t.Run(map[bool]string{false: "none", true: "partial"}[partial], func(t *testing.T) {
			engine := fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				return api.EngineResult{Status: "failed", Text: "partial answer", Partial: partial, Reason: "PROVIDER_STOPPED"}, nil
			}}
			c, _, _ := withEngine(t, engine, false)
			s := session(t, c)
			receipt, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "run", s.Revision), SessionID: s.ID, Intent: "hi", SourceRefs: []api.SourceSnapshot{}})
			if e != nil {
				t.Fatal(e)
			}
			waitRun(t, c, receipt.RunID, "failed")
			p, e := c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID}, SessionID: s.ID})
			if e != nil {
				t.Fatal(e)
			}
			want := 1
			if partial {
				want = 2
			}
			if len(p.Items) != want || (partial && !p.Items[1].Partial) {
				t.Fatal("fabricated/lost partial text", p)
			}
		})
	}
	// The default production Engine is assembled; this seed has no model draft.
	c, _, locator := withEngine(t, nil, false)
	s := session(t, c)
	receipt, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "run", s.Revision), SessionID: s.ID, Intent: "hi", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	run := waitRun(t, c, receipt.RunID, "failed")
	if run.Reason != "MODEL_DRAFT_INCOMPLETE" || run.Usage != nil {
		b, _ := json.Marshal(run)
		t.Fatal(string(b))
	}
	if n := count(t, inspect(t, locator), "SELECT count(*) FROM model_attempts WHERE run_id=?", run.ID); n != 0 {
		t.Fatal("missing model configuration created a model attempt", n)
	}
}

func TestCloseDuringRunningKeepsInterruptedFactAndNoAutomaticReplay(t *testing.T) {
	entered := make(chan struct{}, 1)
	returned := make(chan struct{}, 1)
	engine := fakeEngine{func(c context.Context, _ api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		entered <- struct{}{}
		<-c.Done()
		returned <- struct{}{}
		return api.EngineResult{}, c.Err()
	}}
	c, root, locator := withEngine(t, engine, false)
	s := session(t, c)
	receipt, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "run", s.Revision), SessionID: s.ID, Intent: "hi", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		t.Fatal("Engine not called")
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	select {
	case <-returned:
	default:
		t.Fatal("Engine worker not joined")
	}
	var replay atomic.Int32
	reopened, e := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		replay.Add(1)
		return api.EngineResult{Status: "finished", Text: "must not"}, nil
	}}})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	run := waitRun(t, reopened, receipt.RunID, "interrupted")
	if run.Reason != "PROCESS_INTERRUPTED" || run.Usage != nil {
		t.Fatal(run)
	}
	time.Sleep(120 * time.Millisecond)
	if replay.Load() != 0 {
		t.Fatal("automatically replayed paid intent")
	}
	_, e = reopened.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, reopened, "new", state(t, reopened, s.ID).Revision), SessionID: s.ID, Intent: "new", SourceRefs: []api.SourceSnapshot{}})
	expect(t, e, "SESSION_BUSY")
}
