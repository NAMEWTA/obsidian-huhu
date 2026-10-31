package chat_test

import (
	"context"
	"crypto/sha256"
	"fmt"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type sourceHost struct{ text string }

func (*sourceHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (*sourceHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) Read(_ context.Context, q api.HostReadRequest) (api.HostReadResult, error) {
	return api.HostReadResult{Source: q.Source, Text: h.text, Format: "text/markdown"}, nil
}
func (*sourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}

type sourceFixture struct {
	c             *bootstrap.Core
	root, locator string
	session       api.Session
	agent         api.Agent
	source        api.SourceSnapshot
	read, send    api.Grant
	inputs        chan api.EngineInput
}

func sourceConversation(t *testing.T) *sourceFixture {
	t.Helper()
	inputs := make(chan api.EngineInput, 8)
	engine := fakeEngine{func(_ context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		inputs <- in
		return api.EngineResult{Status: "finished", Text: "DERIVED_PRIVATE_" + in.Intent}, nil
	}}
	c, root, locator := withEngine(t, engine, false)
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://first.invalid/v1", Capabilities: []string{"text"}}
	agent, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "source-agent", ""), Draft: api.AgentDraft{Name: "source", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	session, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "source-session", ""), Kind: "direct", MemberIDs: []string{agent.ID}, WorkspaceID: "workspace:source"})
	if e != nil {
		t.Fatal(e)
	}
	lease, e := c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:source", Capabilities: []string{"note.read", "note.search"}}, &sourceHost{text: "PRIVATE_BODY"})
	if e != nil {
		t.Fatal(e)
	}
	source := api.SourceSnapshot{ResourceID: "source:one", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: sourceHash("PRIVATE_BODY"), ScopeResourceIDs: []string{}}
	recipient := api.GrantRecipient{AgentID: agent.ID, ModelBindingRevision: agent.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
	grant := func(key, operation string) api.Grant {
		g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, key, ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{operation}, SessionID: session.ID})
		if e != nil {
			t.Fatal(e)
		}
		return g
	}
	return &sourceFixture{c: c, root: root, locator: locator, session: session, agent: agent, source: source, read: grant("read", "read"), send: grant("send", "send"), inputs: inputs}
}
func (f *sourceFixture) start(t *testing.T, intent string, attach bool) api.RunReceipt {
	t.Helper()
	command := api.RunStart{CommandMeta: meta(t, f.c, intent, state(t, f.c, f.session.ID).Revision), SessionID: f.session.ID, Intent: intent, SourceRefs: []api.SourceSnapshot{}}
	if attach {
		command.SourceRefs = []api.SourceSnapshot{f.source}
		command.GrantIDs = []string{f.read.ID, f.send.ID}
	}
	receipt, e := f.c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	waitRun(t, f.c, receipt.RunID, "succeeded")
	return receipt
}
func (f *sourceFixture) history(t *testing.T) api.MessagePage {
	t.Helper()
	p, e := f.c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, f.c, "q", "").ProfileID}, SessionID: f.session.ID})
	if e != nil {
		t.Fatal(e)
	}
	return p
}
func (f *sourceFixture) revoke(t *testing.T, g api.Grant, key string) {
	t.Helper()
	_, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, f.c, key, g.Revision), ID: g.ID})
	if e != nil {
		t.Fatal(e)
	}
}

func TestModelHistoryRequiresCurrentSendAndRecipient(t *testing.T) {
	for _, mode := range []string{"send-revoked", "endpoint-changed"} {
		t.Run(mode, func(t *testing.T) {
			f := sourceConversation(t)
			f.start(t, "first", true)
			<-f.inputs
			if mode == "send-revoked" {
				f.revoke(t, f.send, "revoke-send")
			} else {
				model := f.agent.Model.ModelBindingDraft
				model.Endpoint = "https://second.invalid/v1"
				_, e := f.c.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, f.c, "new-endpoint", f.agent.Revision), AgentID: f.agent.ID, Model: model})
				if e != nil {
					t.Fatal(e)
				}
			}
			if p := f.history(t); len(p.Items) != 2 {
				t.Fatal("user lost read history", p)
			}
			f.start(t, "second", false)
			input := <-f.inputs
			if input.ShortTerm == nil || len(input.ShortTerm.Entries) != 0 || len(input.History) != 0 || len(input.Messages) != 0 || len(input.Context.Sources) != 0 {
				t.Fatalf("old source text sent without current recipient consent: %#v", input)
			}
			if _, e := api.CanonicalShortTermBinding(*input.ShortTerm); e != nil {
				t.Fatal("revoked short-term input lost its binding", e)
			}
			t.Logf("%s: user read history retained; second actual Engine received zero old messages", mode)
		})
	}
}
func TestLegalHistoryInheritanceRetainsDerivedProvenanceAfterReopen(t *testing.T) {
	f := sourceConversation(t)
	f.start(t, "first", true)
	<-f.inputs
	second := f.start(t, "second", false)
	in := <-f.inputs
	if in.ShortTerm == nil || len(in.ShortTerm.Entries) != 2 || len(in.History) != 0 || len(in.Messages) != 0 || len(in.Context.Sources) != 0 {
		t.Fatalf("legal source short-term input omitted or duplicated: %#v", in)
	}
	if _, e := api.CanonicalShortTermBinding(*in.ShortTerm); e != nil {
		t.Fatal("legal short-term input lost its binding", e)
	}
	p := f.history(t)
	if len(p.Items) != 4 || len(p.Items[3].SourceRefs) != 1 || p.Items[3].SourceRefs[0].ResourceID != f.source.ResourceID {
		t.Fatalf("derived message lost provenance: %#v", p)
	}
	for i, want := range p.Items[:2] {
		entry := in.ShortTerm.Entries[i]
		if entry.Use != "recent" || entry.Representation != "full" || entry.Text != want.Text || entry.Role != want.Role || entry.Ref.Kind != "message" || entry.Ref.ID != want.ID || entry.Ref.Hash != sourceHash(want.Text) {
			t.Fatal("legal original history was not sealed with exact provenance", i, entry, want)
		}
	}
	db := inspect(t, f.locator)
	if n := count(t, db, "SELECT json_array_length(effective_source_json) FROM execution_runs WHERE run_id=?", second.RunID); n != 1 {
		t.Fatal("effective sources not persistent", n)
	}
	f.revoke(t, f.read, "revoke-read")
	p = f.history(t)
	if len(p.Items) != 1 || p.Items[0].Text != "second" {
		t.Fatalf("derived text escaped current read revocation: %#v", p)
	}
	if e := f.c.Close(); e != nil {
		t.Fatal(e)
	}
	other, e := bootstrap.Open(ctx, f.root, f.locator)
	if e != nil {
		t.Fatal(e)
	}
	defer other.Close()
	f.c = other
	p = f.history(t)
	if len(p.Items) != 1 || p.Items[0].Text != "second" {
		t.Fatalf("reopen lost provenance/revocation: %#v", p)
	}
}

func sourceHash(text string) string { return fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(text))) }
