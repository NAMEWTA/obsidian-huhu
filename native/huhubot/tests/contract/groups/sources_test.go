package groups_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type sourceHost struct {
	mu         sync.Mutex
	reads      int
	text       string
	beforeRead func(context.Context, int) error
}

func (h *sourceHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) Read(ctx context.Context, r api.HostReadRequest) (api.HostReadResult, error) {
	h.mu.Lock()
	h.reads++
	count, before := h.reads, h.beforeRead
	h.mu.Unlock()
	if before != nil {
		if err := before(ctx, count); err != nil {
			return api.HostReadResult{}, err
		}
	}
	return api.HostReadResult{Source: r.Source, Text: h.text, Format: "text/markdown"}, nil
}
func (h *sourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}
func attach(t *testing.T, c *bootstrap.Core) (api.SourceSnapshot, *sourceHost) {
	t.Helper()
	h := &sourceHost{text: "甲😀\nselected source"}
	lease, e := c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:groups", Capabilities: []string{"note.read", "note.search"}}, h)
	if e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256([]byte(h.text))
	return api.SourceSnapshot{ResourceID: "source:groups", Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:groups", OriginViewID: "view:captured", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}, h
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
func grant(t *testing.T, c *bootstrap.Core, source api.SourceSnapshot, recipients ...api.GrantRecipient) api.Grant {
	t.Helper()
	g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, api.NewID("grant:"), ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Operations: []string{"read", "send", "delegate", "deliver"}, Recipients: recipients})
	if e != nil {
		t.Fatal(e)
	}
	return g
}
func revoke(t *testing.T, c *bootstrap.Core, g api.Grant) {
	t.Helper()
	if _, e := c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, c, api.NewID("revoke:"), g.Revision), ID: g.ID}); e != nil {
		t.Fatal(e)
	}
}

// Every derived message must match the actual authorized public History.
// The original user intent remains a unique stable fact even when a member
// legally reads another member's already-published reply before its own Run.
func checkPublicSourceLineage(i api.EngineInput) error {
	expected := map[string]api.DerivedInput{}
	rootMessages := 0
	if i.ShortTerm == nil || len(i.Context.Sources) != 1 {
		return fmt.Errorf("missing sealed group context or source: %#v", i.ShortTerm)
	}
	for _, entry := range i.ShortTerm.Entries {
		if entry.Use != "recent" && entry.Use != "working_summary" {
			continue
		}
		if entry.Ref.Kind != "message" || entry.Ref.ID == "" || entry.Ref.Namespace != i.SessionID || entry.Ref.WorkThreadID != i.SessionID || entry.OriginKind != "conversation_message" || entry.Message != nil || entry.Representation != "full" {
			return fmt.Errorf("foreign public history entry: %#v", entry)
		}
		if entry.Role == "user" {
			if entry.Text != i.Intent {
				return fmt.Errorf("original user identity changed: %#v", entry)
			}
			rootMessages++
		} else if entry.Role != "assistant" || entry.Text != "SOURCE_DERIVED_RESULT" {
			return fmt.Errorf("unexpected public history: %#v", entry)
		}
		sum := sha256.Sum256([]byte(entry.Text))
		if _, exists := expected[entry.Ref.ID]; exists {
			return fmt.Errorf("duplicate public message: %s", entry.Ref.ID)
		}
		expected[entry.Ref.ID] = api.DerivedInput{Kind: "message", ID: entry.Ref.ID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), Namespace: i.SessionID, WorkThreadID: i.SessionID}
	}
	if rootMessages != 1 || len(expected) != len(i.Lineage.Derived) {
		return fmt.Errorf("missing original user lineage: %#v", i.Lineage)
	}
	seen := map[string]bool{}
	for _, ref := range i.Lineage.Derived {
		want, exists := expected[ref.ID]
		if !exists || seen[ref.ID] || ref != want {
			return fmt.Errorf("message lineage mismatch: got=%#v want=%#v", ref, want)
		}
		seen[ref.ID] = true
	}
	return nil
}

func TestOnlyTargetSourceGrantsAuthorizeAtomicBatchAndAttachmentLabelsAreFenced(t *testing.T) {
	for _, order := range []string{"both-history", "late-history"} {
		t.Run(order, func(t *testing.T) { targetSourceBatch(t, order) })
	}
}

func targetSourceBatch(t *testing.T, order string) {
	var mu sync.Mutex
	calls := map[string]int{}
	histories := []int{}
	bothEntered, releaseRead := make(chan struct{}), make(chan struct{})
	var bothOnce, releaseOnce sync.Once
	eng := engineFunc(func(ctx context.Context, i api.EngineInput) (api.EngineResult, error) {
		mu.Lock()
		calls[i.Agent.ID]++
		selected := 0
		if i.ShortTerm != nil {
			for _, entry := range i.ShortTerm.Entries {
				if entry.Use == "recent" || entry.Use == "working_summary" {
					selected++
				}
			}
		}
		histories = append(histories, selected)
		if len(histories) == 2 {
			bothOnce.Do(func() { close(bothEntered) })
		}
		mu.Unlock()
		if len(i.Context.Sources) != 1 || i.Context.Sources[0].Text != "甲😀\nselected source" {
			return api.EngineResult{}, fmt.Errorf("actual source not prepared: %#v", i.Context)
		}
		if err := checkPublicSourceLineage(i); err != nil {
			return api.EngineResult{}, err
		}
		if order == "both-history" {
			select {
			case <-bothEntered:
			case <-ctx.Done():
				return api.EngineResult{}, ctx.Err()
			}
		}
		return api.EngineResult{Status: "finished", Text: "SOURCE_DERIVED_RESULT"}, nil
	})
	c, loc := open(t, bootstrap.Options{Engine: eng})
	// Cleanup releases fixture barriers before Core.Close waits for producers.
	t.Cleanup(func() { releaseOnce.Do(func() { close(releaseRead) }); bothOnce.Do(func() { close(bothEntered) }) })
	source, host := attach(t, c)
	host.mu.Lock()
	host.beforeRead = func(ctx context.Context, read int) error {
		if order == "late-history" && read == 2 {
			select {
			case <-releaseRead:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		return nil
	}
	host.mu.Unlock()
	a := agent(t, c, "A-no-model", false)
	b := agent(t, c, "B", true)
	d := agent(t, c, "C", true)
	s := group(t, c, a, b, d)
	gb := grant(t, c, source, recipient(b))
	db := database(t, loc)
	command := api.RunStart{CommandMeta: meta(t, c, "source-batch", s.Revision), SessionID: s.ID, Intent: "user original text", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{gb.ID}, TargetAgentIDs: []string{b.ID, d.ID}}
	if _, e := c.API.Conversation.StartRun(ctx, owner, command); e == nil {
		t.Fatal("missing C Grant accepted")
	}
	if count(t, db, "SELECT count(*) FROM execution_runs") != 0 || count(t, db, "SELECT count(*) FROM conversation_messages") != 0 || count(t, db, "SELECT count(*) FROM task_config_pins") != 0 || count(t, db, "SELECT count(*) FROM command_receipts WHERE method='runs.start'") != 0 {
		t.Fatal("invalid last target left partial admission")
	}
	host.mu.Lock()
	reads := host.reads
	host.mu.Unlock()
	if reads != 0 {
		t.Fatal("failed batch read Host")
	}
	gc := grant(t, c, source, recipient(d))
	command.GrantIDs = append(command.GrantIDs, gc.ID)
	root, e := c.API.Conversation.StartRun(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	if order == "late-history" {
		// A real committed publication, rather than Engine entry, makes the
		// first member's legal public history visible to the held second read.
		bounded, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		for {
			var published int
			if err := db.QueryRowContext(bounded, "SELECT count(*) FROM group_publications WHERE session_id=? AND message_id IS NOT NULL", s.ID).Scan(&published); err != nil {
				t.Fatal(err)
			}
			if published == 1 {
				break
			}
			timer := time.NewTimer(5 * time.Millisecond)
			select {
			case <-bounded.Done():
				timer.Stop()
				t.Fatal("first member never published")
			case <-timer.C:
			}
		}
		releaseOnce.Do(func() { close(releaseRead) })
	}
	if r := wait(t, c, root.RunID); r.Status != "succeeded" {
		t.Fatalf("root=%#v", r)
	}
	if len(root.TargetRunIDs) != 2 {
		t.Fatal("missing actual target Runs", root)
	}
	for _, runID := range root.TargetRunIDs {
		r, err := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: command.ProfileID, ID: runID})
		if err != nil || r.Status != "succeeded" {
			t.Fatal("actual child failed", r, err)
		}
	}
	mu.Lock()
	if order == "both-history" && (len(histories) != 2 || histories[0] != 1 || histories[1] != 1) || order == "late-history" && (len(histories) != 2 || histories[0] != 1 || histories[1] != 2) {
		t.Fatal("controlled history order not observed", order, histories)
	}
	t.Logf("%s: actual Engine history lengths=%v; both child Runs succeeded", order, histories)
	if calls[a.ID] != 0 || calls[b.ID] != 1 || calls[d.ID] != 1 {
		t.Fatal(calls)
	}
	mu.Unlock()
	p := history(t, c, s.ID)
	if len(p.Items) != 3 || p.Items[0].Text != "user original text" || p.Items[0].RunID != root.RunID || len(p.Items[0].SourceRefs) != 0 || p.Items[0].Attachments == nil || len(p.Items[0].Attachments.SourceRefs) != 1 || p.Items[0].Attachments.SourceRefs[0].OriginViewID != source.OriginViewID {
		t.Fatalf("attachment capture/public text lost: %#v", p)
	}
	publicAgents := map[string]bool{}
	publicRuns := map[string]bool{root.TargetRunIDs[0]: true, root.TargetRunIDs[1]: true}
	for _, message := range p.Items[1:] {
		if message.Role != "assistant" || message.AgentID == a.ID || message.AgentID == "" || !publicRuns[message.RunID] || message.Text != "SOURCE_DERIVED_RESULT" || len(message.SourceRefs) != 1 || !reflect.DeepEqual(message.SourceRefs[0], source) || publicAgents[message.AgentID] {
			t.Fatalf("public contributor/source identity changed: %#v", message)
		}
		publicAgents[message.AgentID] = true
	}
	if !publicAgents[b.ID] || !publicAgents[d.ID] {
		t.Fatalf("missing actual public contributors: %v", publicAgents)
	}
	subject := api.DeliverySubject{Kind: "message", ID: p.Items[0].ID, Attachments: p.Items[0].Attachments}
	revoke(t, c, gb)
	if now := history(t, c, s.ID); now.Items[0].Attachments == nil {
		t.Fatal("C's current exact proof should retain label")
	}
	revoke(t, c, gc)
	delivered := false
	e = c.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{subject}, func(context.Context) error { delivered = true; return nil })
	if e == nil || delivered {
		t.Fatalf("queued attachment crossed revoke: %v", e)
	}
	clean := history(t, c, s.ID)
	if len(clean.Items) != 1 || clean.Items[0].Text != "user original text" || clean.Items[0].Attachments != nil {
		t.Fatalf("revoked labels hid user's own text or leaked derived body: %#v", clean)
	}
	delivered = false
	e = c.API.Events.WithDelivery(ctx, owner, clean.DeliverySubjects, func(context.Context) error { delivered = true; return nil })
	if e != nil || !delivered {
		t.Fatalf("safe label-free original text cannot be sent: %v", e)
	}
}
