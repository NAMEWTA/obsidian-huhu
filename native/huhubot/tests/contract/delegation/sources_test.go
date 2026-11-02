package delegation_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type sourceHost struct {
	mu    sync.Mutex
	calls map[string]int
	text  string
}

func (h *sourceHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) Read(_ context.Context, r api.HostReadRequest) (api.HostReadResult, error) {
	h.mu.Lock()
	h.calls[r.Source.ResourceID]++
	h.mu.Unlock()
	return api.HostReadResult{Source: r.Source, Text: h.text, Format: "text/markdown"}, nil
}
func (h *sourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}
func attach(t *testing.T, c *bootstrap.Core) (api.SourceSnapshot, *sourceHost) {
	t.Helper()
	h := &sourceHost{calls: map[string]int{}, text: "甲😀\nsource body"}
	l, e := c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read", "note.search"}}, h)
	if e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256([]byte(h.text))
	return api.SourceSnapshot{ResourceID: "resource:one", Kind: "note", WorkspaceID: l.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: l.HostConnectionID, HostLeaseID: l.LeaseID, HostLeaseEpoch: l.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}, h
}
func recipient(a api.Agent) api.GrantRecipient {
	r := api.GrantRecipient{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision}
	if a.Model != nil {
		r.ProviderID = a.Model.ProviderID
		r.ModelID = a.Model.ModelID
		r.Protocol = a.Model.Protocol
		r.Endpoint = a.Model.Endpoint
	}
	return r
}
func grant(t *testing.T, c *bootstrap.Core, source api.SourceSnapshot, r api.GrantRecipient) api.Grant {
	t.Helper()
	g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, api.NewID("grant:"), ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{r}, Operations: []string{"read", "send", "delegate", "deliver"}})
	if e != nil {
		t.Fatal(e)
	}
	return g
}
func template(t *testing.T, c *bootstrap.Core, sponsor string, d api.AgentDraft) api.GrantRecipient {
	t.Helper()
	h, e := c.API.Collaboration.ConfigurationHash(ctx, owner, api.TaskConfigHashQuery{ProfileID: meta(t, c, "q", "").ProfileID, Config: api.TaskConfigDraft{SponsorAgentID: sponsor, Draft: d}})
	if e != nil {
		t.Fatal(e)
	}
	return api.GrantRecipient{AgentID: sponsor, ModelBindingRevision: "1", ProviderID: d.Model.ProviderID, ModelID: d.Model.ModelID, Protocol: d.Model.Protocol, Endpoint: d.Model.Endpoint, SubjectKind: "temporary", SponsorAgentID: sponsor, ConfigurationHash: h.ConfigurationHash}
}

func TestPublicTypedTemporaryGrantNestedSubjectsAndCurrentRevocation(t *testing.T) {
	var bID string
	var drafts []api.AgentDraft
	var childEntered sync.Once
	entered := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	defer releaseOnce.Do(func() { close(release) })
	created := make(chan []api.Delegation, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if len(i.Context.Sources) != 1 || i.Context.Sources[0].Text != "甲😀\nsource body" {
			return api.EngineResult{}, fmt.Errorf("actual context missing: %#v", i.Context)
		}
		switch i.Intent {
		case "root typed":
			v, e := i.Tools.Invoke(c, api.ToolCall{ID: "temp-one", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "temporary", Draft: &drafts[0]}, Task: "temp one", Constraints: []string{}, Context: api.ContextEnvelope{MessageIDs: []string{}, SourceRefs: []api.SourceSnapshot{}, Excerpts: []api.ContextExcerpt{}}}})
			if e != nil {
				t.Logf("root typed delegate rejected: %v", e)
				return api.EngineResult{}, e
			}
			created <- []api.Delegation{*v.Delegation}
			return api.EngineResult{Status: "finished", Text: "parent derived"}, nil
		case "temp one":
			if !strings.HasPrefix(i.Agent.ID, "temporary:") || i.Config.SponsorAgentID == i.Agent.ID {
				return api.EngineResult{}, fmt.Errorf("temporary sponsor identity: %#v", i.Config)
			}
			for n, target := range []api.DelegationTarget{{Kind: "temporary", Draft: &drafts[1]}, {Kind: "existing", AgentID: bID}} {
				task := "temp two"
				if n == 1 {
					task = "existing from temp"
				}
				if _, e := i.Tools.Invoke(c, api.ToolCall{ID: fmt.Sprint("nested", n), Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: target, Task: task, Constraints: []string{}, Context: api.ContextEnvelope{MessageIDs: []string{}, SourceRefs: []api.SourceSnapshot{}, Excerpts: []api.ContextExcerpt{}}}}); e != nil {
					return api.EngineResult{}, e
				}
			}
			return api.EngineResult{Status: "finished", Text: "temporary derived"}, nil
		case "temp two":
			childEntered.Do(func() { close(entered) })
			select {
			case <-release:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
			return api.EngineResult{Status: "finished", Text: "nested derived body"}, nil
		case "existing from temp":
			return api.EngineResult{Status: "finished", Text: "existing derived body"}, nil
		}
		return api.EngineResult{}, fmt.Errorf("unexpected %q", i.Intent)
	})
	c, _, locator := open(t, bootstrap.Options{Engine: eng})
	source, h := attach(t, c)
	b := agent(t, c, "target", nil)
	bID = b.ID
	a := agent(t, c, "sponsor", []string{b.ID})
	drafts = []api.AgentDraft{{Name: "temp one", Persona: "private temp", AllowedTools: a.AllowedTools, AllowedCollaborationTargets: []string{b.ID}, Model: &api.ModelBindingDraft{ModelID: "new model", ProviderID: "new provider", Endpoint: "http://127.0.0.1:3", Protocol: "openai-responses", Capabilities: []string{"text"}}}, {Name: "temp two", Persona: "nested private", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ModelID: "nested model", ProviderID: "nested provider", Endpoint: "http://127.0.0.1:4", Protocol: "anthropic-messages", Capabilities: []string{"text"}}}}
	parentGrant := grant(t, c, source, recipient(a))
	grant(t, c, source, recipient(b))
	g1 := grant(t, c, source, template(t, c, a.ID, drafts[0]))
	grant(t, c, source, template(t, c, a.ID, drafts[1]))
	s := session(t, c, a)
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "typed-start", s.Revision), SessionID: s.ID, Intent: "root typed", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{parentGrant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-created:
	case <-time.After(5 * time.Second):
		v, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "q", "").ProfileID, ID: r.RunID})
		t.Fatalf("typed child not admitted; Run=%#v err=%v", v, e)
	}
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("nested temp failed before model")
	}
	db := database(t, locator)
	if count(t, db, "SELECT count(*) FROM agents") != 3 {
		t.Fatal("temporary became durable identity")
	}
	if count(t, db, "SELECT count(*) FROM access_delegation_grants WHERE configuration_hash<>''") < 2 {
		t.Fatal("no durable typed mapping proof")
	}
	if _, e = c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, c, "revoke-temp", g1.Revision), ID: g1.ID}); e != nil {
		t.Fatal(e)
	}
	releaseOnce.Do(func() { close(release) })
	rootState := wait(t, c, r.RunID, "succeeded")
	if rootState.Reason != "CHILD_PARTIAL_FAILURE" {
		t.Fatalf("missing structured child failure: %#v", rootState)
	}
	list, e := c.API.Collaboration.ListTasks(ctx, owner, api.DelegationQuery{PageQuery: api.PageQuery{ProfileID: meta(t, c, "q", "").ProfileID}, RunID: r.RunID})
	if e == nil {
		for _, task := range list.Items {
			if task.Result != nil && task.Result.Text != "" {
				t.Fatal("revoked derived result returned")
			}
		}
	}
	h.mu.Lock()
	third := h.calls["resource:third"]
	h.mu.Unlock()
	if third != 0 {
		t.Fatal("third source read")
	}
}

func TestTemporarySourceGrantDoesNotAuthorizeChangedConfigurationOrOldSponsorIdentity(t *testing.T) {
	for _, variant := range []string{"old-grant", "persona", "endpoint", "credential", "sponsor", "hash"} {
		t.Run(variant, func(t *testing.T) {
			entered := make(chan struct{})
			release := make(chan struct{})
			var once sync.Once
			defer once.Do(func() { close(release) })
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				if i.Intent == "root" {
					close(entered)
					select {
					case <-release:
					case <-c.Done():
						return api.EngineResult{}, c.Err()
					}
				}
				return api.EngineResult{Status: "finished", Text: "result"}, nil
			})
			c, _, loc := open(t, bootstrap.Options{Engine: eng})
			source, _ := attach(t, c)
			b := agent(t, c, "other sponsor", nil)
			a := agent(t, c, "A", []string{b.ID})
			g := grant(t, c, source, recipient(a))
			profile := meta(t, c, "q", "").ProfileID
			refs := []string{"credential:11111111111111111111111111111111", "credential:22222222222222222222222222222222"}
			for _, ref := range refs {
				if _, e := c.Credentials.Register(ctx, profile, ref, "session-memory", []byte("controlled-secret")); e != nil {
					t.Fatal(e)
				}
			}
			base := api.AgentDraft{Name: "temporary", Persona: "actual", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ProviderID: "controlled", ModelID: "model", Protocol: "openai-responses", Endpoint: "http://127.0.0.1:9", CredentialRef: refs[0], Capabilities: []string{"text"}}}
			proposed := base
			model := *base.Model
			proposed.Model = &model
			if variant != "old-grant" {
				sponsor := a.ID
				if variant == "sponsor" {
					sponsor = b.ID
				}
				r := template(t, c, sponsor, base)
				if variant == "hash" {
					r.ConfigurationHash = "sha256:" + strings.Repeat("0", 64)
				}
				grant(t, c, source, r)
			}
			switch variant {
			case "persona":
				proposed.Persona = "changed"
			case "endpoint":
				proposed.Model.Endpoint = "http://127.0.0.1:10"
			case "credential":
				proposed.Model.CredentialRef = refs[1]
			}
			s := session(t, c, a)
			root, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "start", s.Revision), SessionID: s.ID, Intent: "root", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}})
			if e != nil {
				t.Fatal(e)
			}
			select {
			case <-entered:
			case <-time.After(5 * time.Second):
				t.Fatal("source parent not running")
			}
			if _, e = c.API.Collaboration.Delegate(ctx, owner, api.DelegateCommand{CommandMeta: meta(t, c, "bad-template", ""), RunID: root.RunID, Target: api.DelegationTarget{Kind: "temporary", Draft: &proposed}, Task: "must not dispatch", Constraints: []string{}}); !reason(e, "RECIPIENT_NOT_GRANTED") {
				t.Fatalf("typed proof mismatch %s: %v", variant, e)
			}
			if count(t, database(t, loc), "SELECT count(*) FROM task_config_snapshots") != 0 || count(t, database(t, loc), "SELECT count(*) FROM execution_runs WHERE parent_run_id<>''") != 0 {
				t.Fatal("failed proof partially admitted child")
			}
			once.Do(func() { close(release) })
			wait(t, c, root.RunID, "succeeded")
		})
	}
}
