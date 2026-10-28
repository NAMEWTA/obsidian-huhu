package foundation_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type memoryRuntimeEngine struct {
	run func(context.Context, api.EngineInput) (api.EngineResult, error)
}

func (e memoryRuntimeEngine) Run(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, i)
}
func (memoryRuntimeEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, fmt.Errorf("unexpected Resume")
}

func memoryRuntimeStop(t *testing.T, c *bootstrap.Core) {
	t.Helper()
	_ = c.RequestStop()
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	if e := c.WaitClosed(ctx); e != nil {
		t.Error(e)
	}
}
func memoryRuntimeMeta(t *testing.T, c *bootstrap.Core, id api.RequestIdentity, key, revision string) api.CommandMeta {
	t.Helper()
	status, e := c.API.Service.Status(context.Background(), id)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: key, IdempotencyKey: key, ExpectedRevision: revision}
}
func memoryRuntimeWait(t *testing.T, c *bootstrap.Core, id api.RequestIdentity, runID, want string) api.Run {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	for {
		r, e := c.API.Conversation.GetRun(ctx, id, api.IDQuery{ProfileID: memoryRuntimeMeta(t, c, id, "read", "").ProfileID, ID: runID})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == want {
			return r
		}
		if r.Status == "failed" || r.Status == "canceled" {
			t.Fatal("unexpected terminal", r)
		}
		select {
		case <-ctx.Done():
			t.Fatal("Run did not reach target", r)
		case <-time.After(5 * time.Millisecond):
		}
	}
}

func TestDefaultMemoryRuntimeSealsActualContextAndComposesAgentUsage(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("memory-runtime", "owner", true)
	inputs := make(chan api.EngineInput, 4)
	engine := memoryRuntimeEngine{run: func(_ context.Context, in api.EngineInput) (api.EngineResult, error) {
		inputs <- in
		return api.EngineResult{Status: "finished", Text: "accepted output"}, nil
	}}
	root := privateRoot(t)
	core, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { memoryRuntimeStop(t, core) })
	meta := func(key, rev string) api.CommandMeta { return memoryRuntimeMeta(t, core, owner, key, rev) }
	agent, e := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta("agent", ""), Draft: api.AgentDraft{Name: "context owner", Persona: "fixed persona"}})
	if e != nil {
		t.Fatal(e)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
	page, e := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: meta("q", "").ProfileID, Namespace: ns, Kind: "item"})
	if e != nil {
		t.Fatal(e)
	}
	if page.Settings == nil || !page.Settings.Enabled || page.Settings.Eligible || page.Settings.Reason != "BUDGET_NOT_CONFIGURED" {
		t.Fatal("default enabled is distinct from actual quota", page)
	}
	scope := api.MemoryScope{Kind: "profile"}
	item, e := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{CommandMeta: meta("remember", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &scope, Text: "private stable fact"})
	if e != nil {
		t.Fatal(e)
	}
	session, e := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if e != nil {
		t.Fatal(e)
	}
	start := func(key, intent string) api.RunReceipt {
		t.Helper()
		s, e := core.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: meta("q", "").ProfileID, ID: session.ID})
		if e != nil {
			t.Fatal(e)
		}
		r, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(key, s.Revision), SessionID: s.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}})
		if e != nil {
			t.Fatal(e)
		}
		return r
	}
	first := start("first", "first accepted intent")
	memoryRuntimeWait(t, core, owner, first.RunID, "succeeded")
	second := start("second", "second accepted intent")
	run := memoryRuntimeWait(t, core, owner, second.RunID, "succeeded")
	var captured api.EngineInput
	for i := 0; i < 2; i++ {
		select {
		case in := <-inputs:
			if in.RunID == second.RunID {
				captured = in
			}
		case <-time.After(time.Second):
			t.Fatal("missing actual Engine input")
		}
	}
	if captured.ShortTerm == nil || captured.Memory == nil || captured.Memory.Mode != "recall" || captured.Intent != "second accepted intent" || len(captured.History) != 0 || len(captured.Messages) != 0 {
		t.Fatal("new input did not replace the legacy concatenation", captured)
	}
	if _, e = api.CanonicalShortTermBinding(*captured.ShortTerm); e != nil {
		t.Fatal(e)
	}
	foundMemory, foundPrior := false, false
	for _, v := range captured.Memory.Entries {
		if v.Ref.ID == item.RevisionID && v.Text == "private stable fact" {
			foundMemory = true
		}
	}
	for _, v := range captured.ShortTerm.Entries {
		if v.Text == "first accepted intent" {
			foundPrior = true
		}
		if v.Text == captured.Intent && v.Representation != "intent_alias" {
			t.Fatal("accepted intent duplicated", v)
		}
	}
	if !foundMemory || !foundPrior || run.ContextUsage == nil || run.ContextUsage.PolicyVersion != "extractive-v1" {
		t.Fatal("actual recall/history/usage missing", foundMemory, foundPrior, run)
	}
	view, e := core.API.Memory.Get(ctx, owner, api.MemoryGet{ProfileID: meta("q", "").ProfileID, Namespace: ns, Kind: "context", ID: second.RunID, Limit: 50})
	if e != nil || view.Context == nil || view.Context.State != "sealed" || view.Context.Usage == nil {
		t.Fatal("actual sealed context not publicly projected", view, e)
	}
	preview, e := core.API.Assistant.DeletePreview(ctx, owner, api.IDQuery{ProfileID: meta("q", "").ProfileID, ID: agent.ID})
	if e != nil {
		t.Fatal(e)
	}
	foundUsage := false
	for _, category := range preview.Categories {
		if category.Kind == "memory" && category.Reason == "CONTEXT_NOT_ASSEMBLED" {
			t.Fatal("real reader left unassembled", preview)
		}
		if category.Kind == "private-memory" && category.Count > 0 {
			foundUsage = true
		}
	}
	if !foundUsage {
		t.Fatal("same-Tx Memory usage missing", preview)
	}
	_, e = core.API.Assistant.Delete(ctx, owner, api.AgentDelete{CommandMeta: meta("delete", agent.Revision), ID: agent.ID, PreviewToken: preview.Token})
	var fault *api.Fault
	if !errors.As(e, &fault) || fault.Reason != "AGENT_IN_USE" {
		t.Fatal("deletion ignored real memory references", e)
	}
	db, e := sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	for query, want := range map[string]int{"PRAGMA user_version": migrations.CurrentVersion, "SELECT count(*) FROM memory_run_contexts": 2, "SELECT count(*) FROM memory_completion_outbox": 2, "SELECT count(*) FROM model_attempts": 0} {
		var got int
		if e = db.QueryRowContext(ctx, query).Scan(&got); e != nil || got != want {
			t.Fatal(query, got, want, e)
		}
	}
	t.Log("real Core/SQLite sealed two ordinary inputs; original context, recall and deletion usage agree; maintenance quota0 made zero attempts")
}

func TestOrdinaryMemoryCandidatesFailWithoutPublishingOrCreatingJobs(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("memory-invalid", "owner", true)
	engine := memoryRuntimeEngine{run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
		return api.EngineResult{Status: "finished", Text: "must never publish", MemoryCandidates: &api.MemoryCandidateSet{Items: []api.MemoryCandidateDraft{{Operation: "create", Text: "invalid route", Provenance: "inference"}}}}, nil
	}}
	root := privateRoot(t)
	core, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { memoryRuntimeStop(t, core) })
	meta := func(key, rev string) api.CommandMeta { return memoryRuntimeMeta(t, core, owner, key, rev) }
	agents, e := core.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: meta("q", "").ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	s, e := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agents.Items[0].ID}})
	if e != nil {
		t.Fatal(e)
	}
	r, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("run", s.Revision), SessionID: s.ID, Intent: "valid user text", SourceRefs: []api.SourceSnapshot{}})
	if e != nil {
		t.Fatal(e)
	}
	finished := memoryRuntimeWait(t, core, owner, r.RunID, "failed")
	if finished.Reason != "INVALID_ENGINE_RESULT" {
		t.Fatal(finished)
	}
	history, e := core.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta("q", "").ProfileID}, SessionID: s.ID})
	if e != nil || len(history.Items) != 1 || history.Items[0].Role != "user" || strings.Contains(history.Items[0].Text, "must never publish") {
		t.Fatal("invalid candidate route leaked body", history, e)
	}
	db, e := sql.Open("sqlite3", filepath.Join(root, "one", "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = db.Close() })
	for _, table := range []string{"memory_items", "memory_candidates", "memory_jobs", "memory_completion_outbox"} {
		var got int
		if e = db.QueryRowContext(ctx, "SELECT count(*) FROM "+table).Scan(&got); e != nil || got != 0 {
			t.Fatal("invalid result mutated memory", table, got, e)
		}
	}
}

func TestCoreStopClosesMemoryAdmissionAndWaitsForActualRunBeforeProfileRelease(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("memory-drain", "owner", true)
	entered, held := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	release := func() { releaseOnce.Do(func() { close(held) }) }
	engine := memoryRuntimeEngine{run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
		close(entered)
		<-held // actual producer return, even after its context is canceled
		return api.EngineResult{Status: "finished", Text: "late output"}, nil
	}}
	root := privateRoot(t)
	loc := filepath.Join(root, "one")
	core, err := bootstrap.OpenWithOptions(ctx, root, loc, bootstrap.Options{Engine: engine})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { release(); memoryRuntimeStop(t, core) })
	meta := func(key, rev string) api.CommandMeta { return memoryRuntimeMeta(t, core, owner, key, rev) }
	agents, err := core.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: meta("q", "").ProfileID})
	if err != nil || len(agents.Items) == 0 {
		t.Fatal("default agent missing", err)
	}
	ns := api.MemoryNamespace{Kind: "agent", ID: agents.Items[0].ID}
	profile := meta("q", "")
	page, err := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: profile.ProfileID, Namespace: ns, Kind: "item"})
	if err != nil {
		t.Fatal(err)
	}
	session, err := core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta("session", ""), Kind: "direct", MemberIDs: []string{agents.Items[0].ID}})
	if err != nil {
		t.Fatal(err)
	}
	_, err = core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta("run", session.Revision), SessionID: session.ID, Intent: "accepted before shutdown", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-entered:
	case <-time.After(6 * time.Second):
		t.Fatal("actual Executor did not enter Engine")
	}
	if err = core.RequestStop(); err != nil {
		t.Fatal(err)
	}
	_, err = core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: profile.ProfileID, Namespace: ns, Kind: "item"})
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("captured memory read crossed synchronous close", err)
	}
	_, err = core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{
		CommandMeta: api.CommandMeta{ProfileID: profile.ProfileID, CommandEpoch: profile.CommandEpoch, CommandID: "late", IdempotencyKey: "late", ExpectedRevision: page.NamespaceRevision},
		Namespace:   ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "late write",
	})
	if !errors.As(err, &fault) || fault.Reason != "SERVICE_STOPPING" {
		t.Fatal("captured memory write crossed synchronous close", err)
	}
	short, cancel := context.WithTimeout(ctx, 80*time.Millisecond)
	defer cancel()
	if err = core.WaitClosed(short); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal("Core released held Engine before actual return", err)
	}
	other, err := bootstrap.Open(ctx, root, loc)
	if err == nil {
		_ = other.Close()
		t.Fatal("second writer acquired Profile while held Engine still active")
	}
	if !errors.As(err, &fault) || fault.Kind != "INSTANCE_CONFLICT" {
		t.Fatal("unexpected second writer result", err)
	}
	release()
	bounded, done := context.WithTimeout(ctx, 6*time.Second)
	defer done()
	if err = core.WaitClosed(bounded); err != nil {
		t.Fatal(err)
	}
	reopened, err := bootstrap.Open(ctx, root, loc)
	if err != nil {
		t.Fatal("Profile remained locked after actual drain", err)
	}
	if err = reopened.Close(); err != nil {
		t.Fatal(err)
	}
	<-reopened.Done()
}

func TestDefaultCoreAdvertisesAndRoutesOnlyAssembledPrivateMemoryMethods(t *testing.T) {
	ctx := context.Background()
	owner := api.NewConnectionIdentity("memory-hap", "owner", true)
	root := privateRoot(t)
	core, err := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { memoryRuntimeStop(t, core) })
	router := hap.New(core.API, owner)
	request := func(method string, params any) hap.Response {
		t.Helper()
		raw, e := json.Marshal(params)
		if e != nil {
			t.Fatal(e)
		}
		id := api.NewID("request:")
		return router.Dispatch(ctx, wire.Envelope{ID: &id, Method: method, Params: raw}, nil)
	}
	hello := request("protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]string{"name": "memory-hap", "version": "1"}})
	if hello.Error != nil || !router.Ready() {
		t.Fatal("default Core hello failed", hello.Error)
	}
	var advertised struct {
		Capabilities []string `json:"capabilities"`
	}
	encoded, err := json.Marshal(hello.Result)
	if err != nil || json.Unmarshal(encoded, &advertised) != nil {
		t.Fatal("hello capabilities invalid", err)
	}
	capabilities := map[string]bool{}
	for _, method := range advertised.Capabilities {
		capabilities[method] = true
	}
	for _, method := range []string{"memory.list", "memory.get", "memory.pin", "memory.correct", "memory.forget", "memory.setAutoMaintenance"} {
		if !capabilities[method] {
			t.Fatal("assembled private Memory method missing from hello", method)
		}
	}
	for _, method := range []string{"memory.proposeGlobal", "memory.resolveGlobal"} {
		if capabilities[method] {
			t.Fatal("unassembled global Memory method advertised", method)
		}
	}
	meta := func(key, rev string) api.CommandMeta { return memoryRuntimeMeta(t, core, owner, key, rev) }
	agents, err := core.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: meta("q", "").ProfileID})
	if err != nil || len(agents.Items) == 0 {
		t.Fatal("default agent missing", err)
	}
	namespace := api.MemoryNamespace{Kind: "agent", ID: agents.Items[0].ID}
	query := api.MemoryQuery{ProfileID: meta("q", "").ProfileID, Namespace: namespace, Kind: "item"}
	listed := request("memory.list", query)
	page, ok := listed.Result.(api.MemoryPage)
	if listed.Error != nil || !ok || page.Settings == nil {
		t.Fatal("default memory.list unavailable", listed.Error, listed.Result)
	}
	scope := api.MemoryScope{Kind: "profile"}
	added := request("memory.correct", api.MemoryCorrect{CommandMeta: meta("add", page.NamespaceRevision), Namespace: namespace, Action: "add", Scope: &scope, Text: "private HAP memory"})
	item, ok := added.Result.(api.MemoryItem)
	if added.Error != nil || !ok || item.ID == "" {
		t.Fatal("default memory.correct unavailable", added.Error, added.Result)
	}
	got := request("memory.get", api.MemoryGet{ProfileID: query.ProfileID, Namespace: namespace, Kind: "item", ID: item.ID})
	if value, ok := got.Result.(api.MemoryObject); got.Error != nil || !ok || value.Item == nil || value.Item.ID != item.ID {
		t.Fatal("default memory.get unavailable", got.Error, got.Result)
	}
	pinned := request("memory.pin", api.MemoryPin{CommandMeta: meta("pin", item.Revision), Namespace: namespace, ID: item.ID, Pinned: false})
	item, ok = pinned.Result.(api.MemoryItem)
	if pinned.Error != nil || !ok || item.ID == "" {
		t.Fatal("default memory.pin unavailable", pinned.Error, pinned.Result)
	}
	forgotten := request("memory.forget", api.MemoryForget{CommandMeta: meta("forget", item.Revision), Namespace: namespace, ID: item.ID})
	if value, ok := forgotten.Result.(api.MemoryItem); forgotten.Error != nil || !ok || value.State != "forgotten" {
		t.Fatal("default memory.forget unavailable", forgotten.Error, forgotten.Result)
	}
	settings := request("memory.setAutoMaintenance", api.MemorySetAuto{CommandMeta: meta("auto", page.Settings.Revision), Namespace: namespace, Enabled: false})
	if value, ok := settings.Result.(api.MemorySettings); settings.Error != nil || !ok || value.Enabled {
		t.Fatal("default memory.setAutoMaintenance unavailable", settings.Error, settings.Result)
	}
	for _, method := range []string{"memory.proposeGlobal", "memory.resolveGlobal"} {
		response := request(method, map[string]any{})
		if response.Error == nil || response.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
			t.Fatal("unassembled global Memory method accepted", method, response.Error)
		}
	}
}
