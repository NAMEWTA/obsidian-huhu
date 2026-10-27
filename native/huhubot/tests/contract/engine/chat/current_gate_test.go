package chat_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type afterTool struct {
	api.ToolInvoker
	entered chan struct{}
	release <-chan struct{}
}

func (b afterTool) Invoke(ctx context.Context, c api.ToolCall) (api.ToolResult, error) {
	r, err := b.ToolInvoker.Invoke(ctx, c)
	close(b.entered)
	<-b.release
	return r, err
}

type afterReserve struct {
	api.ModelAttempts
	entered chan struct{}
	release <-chan struct{}
}

func (b afterReserve) Reserve(ctx context.Context, q api.AttemptRequest) (api.AttemptReservation, error) {
	r, err := b.ModelAttempts.Reserve(ctx, q)
	close(b.entered)
	<-b.release
	return r, err
}

func TestCancellationAfterReserveAbortsOnlyUnsentAttempt(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { requests.Add(1) }))
	t.Cleanup(server.Close)
	f, engine, _ := capturedFixture(t, server.URL+"/v1", nil, nil)
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	engine.prepare = func(in api.EngineInput) api.EngineInput {
		in.Attempts = afterReserve{ModelAttempts: in.Attempts, entered: entered, release: release}
		return in
	}
	run := f.start(t).RunID
	waitSignal(t, entered)
	cancelRun(t, f, run)
	unblock()
	r := f.terminal(t, run)
	engine.Stop()
	waitSignal(t, engine.Done())
	var state string
	var ended, charged int
	if err := fixtureDB(t, f).QueryRow("SELECT state,producer_ended,charged_tokens FROM model_attempts WHERE run_id=?", run).Scan(&state, &ended, &charged); err != nil {
		t.Fatal(err)
	}
	if r.Status != "canceled" || requests.Load() != 0 || state != "aborted" || ended != 1 || charged != 0 {
		t.Fatal(r, requests.Load(), state, ended, charged)
	}
}

func TestRevokedGrantAfterToolBlocksNextActualHTTP(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		toolTurn(w, []map[string]any{{"index": 0, "id": "read-before-revoke", "type": "function", "function": map[string]any{"name": "agents_discover", "arguments": "{}"}}})
	}))
	t.Cleanup(server.Close)
	f, engine, _ := capturedFixture(t, server.URL+"/v1", []string{"agents.discover"}, nil)
	lease, err := f.core.API.Host.Attach(context.Background(), owner, api.HostAttachCommand{WorkspaceID: "workspace:scope", Capabilities: []string{"note.read"}}, noHost{})
	if err != nil {
		t.Fatal(err)
	}
	a, err := f.core.API.Assistant.Get(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil {
		t.Fatal(err)
	}
	recipient := api.GrantRecipient{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision, ProviderID: a.Model.ProviderID, ModelID: a.Model.ModelID, Protocol: a.Model.Protocol, Endpoint: a.Model.Endpoint}
	scope := api.SourceScope{ResourceID: "scope:folder", Kind: "folder", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:fixture", OriginViewID: "view:fixture", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + strings.Repeat("0", 64)}
	grant, err := f.core.API.Grants.Create(context.Background(), owner, api.GrantCreate{CommandMeta: f.meta(""), WorkspaceID: lease.WorkspaceID, Scope: "folder", ResourceID: scope.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{"read", "send"}})
	if err != nil {
		t.Fatal(err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	engine.prepare = func(in api.EngineInput) api.EngineInput {
		in.Tools = afterTool{ToolInvoker: in.Tools, entered: entered, release: release}
		return in
	}
	session, err := f.core.API.Conversation.GetSession(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: f.session})
	if err != nil {
		t.Fatal(err)
	}
	r, err := f.core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{CommandMeta: f.meta(session.Revision), SessionID: f.session, Intent: "scope-only admission", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{scope}, GrantIDs: []string{grant.ID}})
	if err != nil {
		t.Fatal(err)
	}
	waitSignal(t, entered)
	if _, err = f.core.API.Grants.Revoke(context.Background(), owner, api.GrantRevoke{CommandMeta: f.meta(grant.Revision), ID: grant.ID}); err != nil {
		t.Fatal(err)
	}
	unblock()
	if _, err = f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: r.RunID}); err == nil {
		t.Fatal("revoked public read remained authorized")
	}
	db := fixtureDB(t, f)
	deadline := time.NewTimer(5 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		var status, reason string
		if err := db.QueryRow("SELECT status,reason FROM execution_runs WHERE run_id=?", r.RunID).Scan(&status, &reason); err != nil {
			t.Fatal(err)
		}
		if status == "failed" {
			if reason != "ACCESS_REVOKED" || requests.Load() != 1 { // application finalization redacts revoked source results.
				t.Fatal(status, reason, requests.Load())
			}
			break
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("revoked execution did not terminate", status, reason)
		}
	}
	var attempts int
	if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", r.RunID).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if attempts != 1 {
		t.Fatal("revoked next turn reserved/dispatched", attempts)
	}
}

func TestRemovedGroupMemberWithoutSourceBodyCannotSendNextHTTP(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		toolTurn(w, []map[string]any{{"index": 0, "id": "group-read", "type": "function", "function": map[string]any{"name": "tasks_list", "arguments": "{}"}}})
	}))
	t.Cleanup(server.Close)
	f, engine, _ := capturedFixture(t, server.URL+"/v1", []string{"tasks.list"}, nil)
	coordinator, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.meta(""), Draft: api.AgentDraft{Name: "nonmodel coordinator", Persona: "no model"}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := f.core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{CommandMeta: f.meta(""), Kind: "group", Title: "membership fence", MemberIDs: []string{f.agent, coordinator.ID}, CoordinatorID: coordinator.ID})
	if err != nil {
		t.Fatal(err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	engine.prepare = func(in api.EngineInput) api.EngineInput {
		in.Tools = afterTool{ToolInvoker: in.Tools, entered: entered, release: release}
		return in
	}
	receipt, err := f.core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{CommandMeta: f.meta(session.Revision), SessionID: session.ID, Intent: "no source body", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{f.agent}})
	if err != nil {
		t.Fatal(err)
	}
	if len(receipt.TargetRunIDs) != 1 {
		t.Fatal(receipt)
	}
	waitSignal(t, entered)
	session, err = f.core.API.Conversation.GetSession(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.core.API.Groups.UpdateMembers(context.Background(), owner, api.SessionMembersUpdate{CommandMeta: f.meta(session.Revision), ID: session.ID, MemberIDs: []string{coordinator.ID}, HistoryScope: api.GroupHistoryScope{Kind: "none"}}); err != nil {
		t.Fatal(err)
	}
	unblock()
	db := fixtureDB(t, f)
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	deadline := time.NewTimer(5 * time.Second)
	defer deadline.Stop()
	for {
		var state string
		if err := db.QueryRow("SELECT status FROM execution_runs WHERE run_id=?", receipt.TargetRunIDs[0]).Scan(&state); err != nil {
			t.Fatal(err)
		}
		if state == "failed" || state == "canceled" {
			break
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("removed member still running", state)
		}
	}
	var attempts int
	if err := db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=?", receipt.TargetRunIDs[0]).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if requests.Load() != 1 || attempts != 1 {
		t.Fatal("member removal reused an old permit", requests.Load(), attempts)
	}
}
