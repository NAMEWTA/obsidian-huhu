package chat_test

import (
	"context"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	readbridge "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/hostbridge/read"
	assistantstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	contextapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	assistantapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type afterPrepared struct {
	api.ContextAccess
	after func()
}

func (a afterPrepared) PrepareContext(c context.Context, id api.RequestIdentity, in api.RunAccessInput) (api.PreparedContext, error) {
	p, e := a.ContextAccess.PrepareContext(c, id, in)
	if e == nil {
		a.after()
	}
	return p, e
}

type beforeRunning struct {
	executorapp.Repository
	before func()
}

func (r beforeRunning) MarkRunning(c context.Context, w executorapp.Work) error {
	r.before()
	return r.Repository.MarkRunning(c, w)
}

func TestSendRevokedAtFinalAdmissionWindowsFailsAndReleases(t *testing.T) {
	for _, window := range []string{"after-prepare", "after-admission-before-mark-running"} {
		t.Run(window, func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "profiles")
			if e := os.Mkdir(root, 0700); e != nil {
				t.Fatal(e)
			}
			handle, e := profile.Acquire(root, filepath.Join(root, "one"))
			if e != nil {
				t.Fatal(e)
			}
			defer handle.Close()
			db, e := base.Open(ctx, handle)
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			configs := assistantstore.New(db)
			accessStore := grantsstore.New(db)
			host := api.NewHostService()
			access := contextapp.New(accessStore, readbridge.New(host))
			grants := grantsapp.New(accessStore, time.Now)
			executions := executionstore.New(db, configs, accessStore)
			configs.SetUsageReader(executions)
			assistants, e := assistantapp.New(ctx, configs, assistantapp.Options{Usage: executions})
			if e != nil {
				t.Fatal(e)
			}
			metadata, e := db.ReadMetadata(ctx)
			if e != nil {
				t.Fatal(e)
			}
			command := func(key, revision string) api.CommandMeta {
				return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: revision}
			}
			model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://test.invalid/v1", Capabilities: []string{"text"}}
			agent, e := assistants.Create(ctx, owner, api.AgentCreate{CommandMeta: command("agent", ""), Draft: api.AgentDraft{Name: "test", Model: &model}})
			if e != nil {
				t.Fatal(e)
			}
			conversation := directapp.New(executions, access, nil)
			session, e := conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: command("session", ""), Kind: "direct", MemberIDs: []string{agent.ID}, WorkspaceID: "workspace:source"})
			if e != nil {
				t.Fatal(e)
			}
			lease, e := host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:source", Capabilities: []string{"note.read"}}, &sourceHost{text: "PRIVATE_BODY"})
			if e != nil {
				t.Fatal(e)
			}
			source := api.SourceSnapshot{ResourceID: "source:one", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: sourceHash("PRIVATE_BODY"), ScopeResourceIDs: []string{}}
			recipient := api.GrantRecipient{AgentID: agent.ID, ModelBindingRevision: agent.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
			createGrant := func(key, op string) api.Grant {
				g, e := grants.Create(ctx, owner, api.GrantCreate{CommandMeta: command(key, ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{op}, SessionID: session.ID})
				if e != nil {
					t.Fatal(e)
				}
				return g
			}
			read, send := createGrant("read", "read"), createGrant("send", "send")
			receipt, e := conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: command("run", session.Revision), SessionID: session.ID, Intent: "intent", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{read.ID, send.ID}})
			if e != nil {
				t.Fatal(e)
			}
			var revokeCalls atomic.Int32
			revoke := func() {
				if revokeCalls.Add(1) != 1 {
					t.Error("unexpected repeated boundary")
				}
				_, e := grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: command("revoke-send", send.Revision), ID: send.ID})
				if e != nil {
					t.Error(e)
				}
			}
			var accessPort api.ContextAccess = access
			var repo executorapp.Repository = executions
			if window == "after-prepare" {
				accessPort = afterPrepared{access, revoke}
			} else {
				repo = beforeRunning{executions, revoke}
			}
			var engineCalls atomic.Int32
			engine := fakeEngine{func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
				engineCalls.Add(1)
				return api.EngineResult{Status: "finished", Text: "MUST_NOT_SAVE"}, nil
			}}
			executor, e := executorapp.New(ctx, repo, engine, accessPort, conversation)
			if e != nil {
				t.Fatal(e)
			}
			defer executor.Close()
			executor.Start()
			deadline := time.Now().Add(3 * time.Second)
			for {
				run, e := conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: metadata.ProfileID, ID: receipt.RunID})
				if e != nil {
					t.Fatal(e)
				}
				if run.Status == "failed" {
					if run.Reason != "ACCESS_REVOKED" {
						t.Fatal(run)
					}
					break
				}
				if time.Now().After(deadline) {
					t.Fatal("Run stuck", run)
				}
				time.Sleep(10 * time.Millisecond)
			}
			if engineCalls.Load() != 0 || revokeCalls.Load() != 1 {
				t.Fatal("effect crossed revoked send gate", engineCalls.Load(), revokeCalls.Load())
			}
			if n := count(t, db.Database(), "SELECT count(*) FROM conversation_messages"); n != 1 {
				t.Fatal("saved revoked text", n)
			}
			if n := count(t, db.Database(), "SELECT count(*) FROM config_snapshot_pins"); n != 0 {
				t.Fatal("pin leaked", n)
			}
			if n := count(t, db.Database(), "SELECT count(*) FROM conversation_sessions WHERE active_run_id IS NOT NULL"); n != 0 {
				t.Fatal("session stuck", n)
			}
			if n := count(t, db.Database(), "SELECT count(*) FROM execution_events WHERE event_type='running'"); n != 0 {
				t.Fatal("fabricated running", n)
			}
			t.Logf("%s: committed send revocation, Engine=0, failed terminal/message/event/release atomic", window)
		})
	}
}
