package access_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("connection:one", "owner", true)
var second = api.NewConnectionIdentity("connection:two", "owner", false)

type testHost struct {
	mu            sync.Mutex
	texts         map[string]string
	calls         map[string]int
	entered       chan struct{}
	release       chan struct{}
	corrupt       bool
	transform     func(*api.HostReadResult)
	searchResult  api.HostSearchResult
	searchCalls   int
	searchRequest api.HostSearchRequest
}

func (h *testHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY_HOST")
}
func (h *testHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY_HOST")
}
func (h *testHost) Read(c context.Context, r api.HostReadRequest) (api.HostReadResult, error) {
	h.mu.Lock()
	h.calls[r.Source.ResourceID]++
	text := h.texts[r.Source.ResourceID]
	entered, release, corrupt := h.entered, h.release, h.corrupt
	h.mu.Unlock()
	if entered != nil {
		select {
		case entered <- struct{}{}:
		default:
		}
		select {
		case <-release:
		case <-c.Done():
			return api.HostReadResult{}, c.Err()
		}
	}
	if corrupt {
		text += "CORRUPTED"
	}
	out := api.HostReadResult{Source: r.Source, Text: text, Format: "text/markdown"}
	if h.transform != nil {
		h.transform(&out)
	}
	return out, nil
}
func (h *testHost) Search(_ context.Context, request api.HostSearchRequest) (api.HostSearchResult, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.searchCalls++
	h.searchRequest = request
	return h.searchResult, nil
}
func (h *testHost) count(id string) int { h.mu.Lock(); defer h.mu.Unlock(); return h.calls[id] }

type fixture struct {
	c              *bootstrap.Core
	host           *testHost
	profile, epoch string
	agent          api.Agent
	recipient      api.GrantRecipient
	lease          api.HostLease
	database       string
	session        string
}

func open(t *testing.T) *fixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	c, e := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
	})
	if c.API.Grants == nil || c.API.Context == nil {
		t.Fatal("T05 Grants/Context facade not assembled")
	}
	status, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	f := &fixture{c: c, profile: status.Profile.ProfileID, epoch: status.Profile.CommandEpoch, database: filepath.Join(root, "one", "profile.sqlite3"), host: &testHost{texts: map[string]string{}, calls: map[string]int{}}}
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://model.invalid/v1", Capabilities: []string{"text"}}
	f.agent, e = c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: f.meta("agent", ""), Draft: api.AgentDraft{Name: "Access fixture", Model: &model}})
	if e != nil {
		t.Fatal(e)
	}
	f.recipient = api.GrantRecipient{AgentID: f.agent.ID, ModelBindingRevision: f.agent.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
	session, e := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("session", ""), Kind: "direct", Title: "Access", MemberIDs: []string{f.agent.ID}, WorkspaceID: "workspace:one"})
	if e != nil {
		t.Fatal(e)
	}
	f.session = session.ID
	f.lease, e = c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read", "note.search"}}, f.host)
	if e != nil {
		t.Fatal(e)
	}
	return f
}
func (f *fixture) meta(key, rev string) api.CommandMeta {
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: f.profile, CommandEpoch: f.epoch, ExpectedRevision: rev}
}
func (f *fixture) source(id, text string) api.SourceSnapshot {
	f.host.mu.Lock()
	f.host.texts[id] = text
	f.host.mu.Unlock()
	sum := sha256.Sum256([]byte(text))
	return api.SourceSnapshot{ResourceID: id, Kind: "note", WorkspaceID: f.lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: f.lease.HostConnectionID, HostLeaseID: f.lease.LeaseID, HostLeaseEpoch: f.lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}
}
func (f *fixture) grant(t *testing.T, source api.SourceSnapshot, key string) api.Grant {
	t.Helper()
	g, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta(key, ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "search", "send", "summarize", "memory", "delegate", "deliver"}, SessionID: f.session})
	if e != nil {
		t.Fatal(e)
	}
	return g
}
func (f *fixture) input(sources []api.SourceSnapshot, grants ...api.Grant) api.RunAccessInput {
	ids := []string{}
	for _, g := range grants {
		ids = append(ids, g.ID)
	}
	return api.RunAccessInput{ProfileID: f.profile, SessionID: f.session, TaskID: "task:one", Recipient: f.recipient, Sources: sources, GrantIDs: ids}
}
func requireFault(t *testing.T, e error, reason string) {
	t.Helper()
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != reason {
		t.Fatalf("want %s, got %v", reason, e)
	}
}

func TestAccessFacadePersistsGrantAndOnlyReadsExplicitSources(t *testing.T) {
	f := open(t)
	one := f.source("source:one", "PRIVATE_ONE")
	two := f.source("source:two", "PRIVATE_TWO")
	third := f.source("source:third", "PRIVATE_THIRD")
	g1, g2 := f.grant(t, one, "grant-one"), f.grant(t, two, "grant-two")
	in := f.input([]api.SourceSnapshot{one, two}, g1, g2)
	for _, identity := range []api.RequestIdentity{owner, second} {
		out, e := f.c.API.Context.PrepareContext(ctx, identity, in)
		if e != nil || len(out.Sources) != 2 || out.Sources[0].Text != "PRIVATE_ONE" || out.Sources[1].Text != "PRIVATE_TWO" {
			t.Fatalf("explicit context: %#v %v", out, e)
		}
	}
	in.Sources = append(in.Sources, third)
	out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "SOURCE_NOT_GRANTED")
	if len(out.Sources) != 0 || f.host.count(third.ResourceID) != 0 || f.host.count(one.ResourceID) != 2 || f.host.count(two.ResourceID) != 2 {
		t.Fatal("unauthorized context reached Host or outbound prepared text")
	}
	page, e := f.c.API.Grants.List(ctx, second, api.PageQuery{ProfileID: f.profile})
	if e != nil || len(page.Items) != 2 {
		t.Fatalf("persistent common facade: %#v %v", page, e)
	}
}

func TestGrantCommandsUseSharedReceiptsCASAndSubject(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	command := api.GrantCreate{CommandMeta: f.meta("same-intent", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "send"}}
	var wg sync.WaitGroup
	results := make(chan api.Grant, 8)
	errs := make(chan error, 8)
	for range 8 {
		wg.Add(1)
		go func() { defer wg.Done(); g, e := f.c.API.Grants.Create(ctx, owner, command); results <- g; errs <- e }()
	}
	wg.Wait()
	close(results)
	close(errs)
	for e := range errs {
		if e != nil {
			t.Fatal(e)
		}
	}
	id := ""
	for g := range results {
		if id == "" {
			id = g.ID
		}
		if g.ID != id {
			t.Fatal("same intent created multiple grants")
		}
	}
	altered := command
	altered.ResourceID = "source:other"
	_, e := f.c.API.Grants.Create(ctx, owner, altered)
	requireFault(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
	foreign := api.NewConnectionIdentity("foreign", "different-user", false)
	page, e := f.c.API.Grants.List(ctx, foreign, api.PageQuery{ProfileID: f.profile})
	if e != nil || len(page.Items) != 0 {
		t.Fatal("foreign grant disclosed", e)
	}
	receipt := make(chan api.Receipt, 2)
	revokeErrors := make(chan error, 2)
	for _, key := range []string{"revoke-a", "revoke-b"} {
		wg.Add(1)
		go func(key string) {
			defer wg.Done()
			r, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta(key, "1"), ID: id})
			receipt <- r
			revokeErrors <- e
		}(key)
	}
	wg.Wait()
	close(receipt)
	close(revokeErrors)
	wins := 0
	for e := range revokeErrors {
		if e == nil {
			wins++
		} else {
			requireFault(t, e, "REVISION_CONFLICT")
		}
	}
	if wins != 1 {
		t.Fatal("CAS did not choose one winner")
	}
	var winner api.Receipt
	for r := range receipt {
		if r.ReceiptID != "" {
			winner = r
		}
	}
	again, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta(winner.CommandID, "1"), ID: id})
	if e != nil || again != winner {
		t.Fatalf("revoke replay %#v %v", again, e)
	}
	replay, e := f.c.API.Grants.Create(ctx, owner, command)
	if e != nil || replay.ID != id || replay.State != "revoked" {
		t.Fatalf("old create receipt revived grant %#v %v", replay, e)
	}
}

func TestGrantRetriesRecoverOriginalResultsAcrossAttemptIDs(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	create := api.GrantCreate{CommandMeta: f.meta("review-create-intent", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read"}}
	original, e := f.c.API.Grants.Create(ctx, owner, create)
	if e != nil {
		t.Fatal(e)
	}
	db, e := sql.Open("sqlite3", f.database)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := db.Close(); e != nil {
			t.Error(e)
		}
	})
	type durableState struct {
		profileRevision, grantClock, grants, receipts int
		grantRevision, state                          string
	}
	persisted := func() durableState {
		t.Helper()
		var out durableState
		e := db.QueryRowContext(ctx, `SELECT p.revision,c.revision,
			(SELECT count(*) FROM access_grants),(SELECT count(*) FROM command_receipts),
			CAST(g.revision AS TEXT),g.state
			FROM profile_metadata p CROSS JOIN access_grants_clock c CROSS JOIN access_grants g
			WHERE p.singleton=1 AND c.singleton=1 AND g.grant_id=?`, original.ID).Scan(&out.profileRevision, &out.grantClock, &out.grants, &out.receipts, &out.grantRevision, &out.state)
		if e != nil {
			t.Fatal(e)
		}
		return out
	}
	created := persisted()
	for _, attempt := range []string{create.CommandID, "review-second-attempt"} {
		retry := create
		retry.CommandID = attempt
		again, e := f.c.API.Grants.Create(ctx, owner, retry)
		if e != nil || again.ID != original.ID || again.Revision != "1" || again.State != "active" {
			t.Errorf("create attempt %q did not recover original grant: %#v %v", attempt, again, e)
		}
	}
	for name, change := range map[string]func(*api.GrantCreate){
		"workspace": func(c *api.GrantCreate) { c.WorkspaceID = "workspace:other" },
		"scope":     func(c *api.GrantCreate) { c.Scope = "folder" },
		"resource":  func(c *api.GrantCreate) { c.ResourceID = "source:other" },
		"recipient": func(c *api.GrantCreate) {
			c.Recipients = []api.GrantRecipient{f.recipient}
			c.Recipients[0].Endpoint = "https://other.invalid/v1"
		},
		"operations":       func(c *api.GrantCreate) { c.Operations = []string{"read", "send"} },
		"session":          func(c *api.GrantCreate) { c.SessionID = "session:other" },
		"task":             func(c *api.GrantCreate) { c.TaskID = "task:other" },
		"expiry":           func(c *api.GrantCreate) { c.ExpiresAt = "2100-01-01T00:00:00Z" },
		"expectedRevision": func(c *api.GrantCreate) { c.ExpectedRevision = "1" },
	} {
		t.Run("create-different-"+name, func(t *testing.T) {
			changed := create
			changed.CommandID = "different-create-" + name
			change(&changed)
			_, e := f.c.API.Grants.Create(ctx, owner, changed)
			requireFault(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
		})
	}
	if after := persisted(); after != created {
		t.Fatalf("create retries changed durable state: before=%+v after=%+v", created, after)
	}
	revoke := api.GrantRevoke{CommandMeta: f.meta("review-revoke-intent", original.Revision), ID: original.ID}
	receipt, e := f.c.API.Grants.Revoke(ctx, owner, revoke)
	if e != nil {
		t.Fatal(e)
	}
	revoked := persisted()
	if revoked.grants != 1 || revoked.receipts != created.receipts+1 || revoked.grantRevision != "2" || revoked.state != "revoked" || revoked.profileRevision != created.profileRevision+1 || revoked.grantClock != created.grantClock+1 {
		t.Fatalf("revoke did not persist exactly one mutation: before=%+v after=%+v", created, revoked)
	}
	for _, attempt := range []string{revoke.CommandID, "review-second-revoke-attempt"} {
		retry := revoke
		retry.CommandID = attempt
		again, e := f.c.API.Grants.Revoke(ctx, owner, retry)
		if e != nil || again != receipt {
			t.Errorf("revoke attempt %q did not recover original receipt: %#v %v", attempt, again, e)
		}
	}
	changedRevoke := revoke
	changedRevoke.CommandID = "different-revoke-resource"
	changedRevoke.ID = "grant:other"
	_, e = f.c.API.Grants.Revoke(ctx, owner, changedRevoke)
	requireFault(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
	changedRevoke = revoke
	changedRevoke.CommandID = "different-revoke-revision"
	changedRevoke.ExpectedRevision = "2"
	_, e = f.c.API.Grants.Revoke(ctx, owner, changedRevoke)
	requireFault(t, e, "IDEMPOTENCY_INPUT_MISMATCH")
	_, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("new-revoke-intent", "1"), ID: original.ID})
	requireFault(t, e, "REVISION_CONFLICT")
	for _, attempt := range []string{create.CommandID, "review-create-after-revoke"} {
		retry := create
		retry.CommandID = attempt
		again, e := f.c.API.Grants.Create(ctx, owner, retry)
		if e != nil || again.ID != original.ID || again.State != "revoked" || again.Revision != "2" {
			t.Errorf("old create attempt %q revived or lost revoked grant: %#v %v", attempt, again, e)
		}
	}
	wrongProfileCreate, wrongProfileRevoke := create, revoke
	wrongProfileCreate.ProfileID, wrongProfileRevoke.ProfileID = "profile:other", "profile:other"
	_, e = f.c.API.Grants.Create(ctx, owner, wrongProfileCreate)
	requireFault(t, e, "PROFILE_MISMATCH")
	_, e = f.c.API.Grants.Revoke(ctx, owner, wrongProfileRevoke)
	requireFault(t, e, "PROFILE_MISMATCH")
	if after := persisted(); after != revoked {
		t.Fatalf("replays/negative controls changed durable state: before=%+v after=%+v", revoked, after)
	}
	if _, e := db.ExecContext(ctx, "UPDATE profile_metadata SET command_epoch=command_epoch+1 WHERE singleton=1"); e != nil {
		t.Fatal(e)
	}
	for _, attempt := range []string{create.CommandID, "old-epoch-create-attempt"} {
		retry := create
		retry.CommandID = attempt
		_, e = f.c.API.Grants.Create(ctx, owner, retry)
		requireFault(t, e, "COMMAND_EPOCH_CONFLICT")
	}
	for _, attempt := range []string{revoke.CommandID, "old-epoch-revoke-attempt"} {
		retry := revoke
		retry.CommandID = attempt
		_, e = f.c.API.Grants.Revoke(ctx, owner, retry)
		requireFault(t, e, "COMMAND_EPOCH_CONFLICT")
	}
	if after := persisted(); after != revoked {
		t.Fatalf("old epoch replay changed durable state: before=%+v after=%+v", revoked, after)
	}
	t.Log("Facade/SQLite: retries retained original IDs and receipt, one grant revoked once, no additional receipts or revision increments; business/profile/epoch/CAS controls retained")
}

func TestRevocationDuringHostReadDropsAllTextAndHistoryProvenance(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE_NEVER_RELEASE_AFTER_REVOKE")
	g := f.grant(t, source, "grant")
	in := f.input([]api.SourceSnapshot{source}, g)
	history := []api.ContextRecord{{ID: "derived", Text: "DERIVED_PRIVATE", Sources: []api.SourceSnapshot{source}}, {ID: "public", Text: "ordinary user message"}}
	before, e := f.c.API.Context.FilterHistory(ctx, owner, in, history)
	if e != nil || len(before) != 2 {
		t.Fatal("authorized history unavailable", e)
	}
	f.host.entered = make(chan struct{}, 1)
	f.host.release = make(chan struct{})
	released := false
	t.Cleanup(func() {
		if !released {
			close(f.host.release)
		}
	})
	type result struct {
		out api.PreparedContext
		e   error
	}
	done := make(chan result, 1)
	go func() { out, e := f.c.API.Context.PrepareContext(ctx, owner, in); done <- result{out, e} }()
	await(t, f.host.entered)
	if _, e = f.c.API.Grants.Revoke(ctx, second, api.GrantRevoke{CommandMeta: f.meta("revoke", "1"), ID: g.ID}); e != nil {
		t.Fatal(e)
	}
	close(f.host.release)
	released = true
	r := await(t, done)
	requireFault(t, r.e, "GRANT_REVOKED")
	if len(r.out.Sources) != 0 {
		t.Fatal("late private text escaped revocation")
	}
	after, e := f.c.API.Context.FilterHistory(ctx, owner, in, history)
	if e != nil || len(after) != 1 || after[0].ID != "public" || after[0].Text == "DERIVED_PRIVATE" {
		t.Fatalf("revoked derived text retained %#v %v", after, e)
	}
	if _, e = f.c.API.Context.Search(ctx, owner, in, "PRIVATE", 10); e == nil {
		t.Fatal("revoked search accepted")
	}
}

func TestHostLeaseReplacementOfflineAndForgedPathsFailBeforeReads(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	g := f.grant(t, source, "grant")
	in := f.input([]api.SourceSnapshot{source}, g)
	f.host.entered = make(chan struct{}, 1)
	f.host.release = make(chan struct{})
	released := false
	t.Cleanup(func() {
		if !released {
			close(f.host.release)
		}
	})
	done := make(chan error, 1)
	go func() {
		out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
		if len(out.Sources) != 0 {
			done <- errors.New("old lease returned text")
			return
		}
		done <- e
	}()
	await(t, f.host.entered)
	replacement, e := f.c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: source.WorkspaceID, Capabilities: []string{"note.read", "note.search"}}, f.host)
	if e != nil {
		t.Fatal(e)
	}
	close(f.host.release)
	released = true
	requireFault(t, await(t, done), "HOST_LEASE_MISMATCH")
	if _, e = f.c.API.Context.PrepareContext(ctx, owner, in); e == nil {
		t.Fatal("old lease reused")
	}
	if f.host.count(source.ResourceID) != 1 {
		t.Fatal("stale lease reached Host")
	}
	in.Sources[0].ResourceID = "/tmp/private-absolute-path"
	_, e = f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "INVALID_SOURCE_SNAPSHOT")
	in.Sources[0] = source
	if e = f.c.API.Host.Detach(ctx, owner, replacement.LeaseID); e != nil {
		t.Fatal(e)
	}
	out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "HOST_OFFLINE")
	if len(out.Sources) != 0 || f.host.count(source.ResourceID) != 1 {
		t.Fatal("offline Host fell back or released text")
	}
}

func TestParentScopeAndConfiguredRecipientCannotBeExpanded(t *testing.T) {
	f := open(t)
	one := f.source("source:one", "PRIVATE_ONE")
	two := f.source("source:two", "PRIVATE_TWO")
	g1, g2 := f.grant(t, one, "grant-one"), f.grant(t, two, "grant-two")
	in := f.input([]api.SourceSnapshot{one, two}, g1, g2)
	in.ParentScope = &api.AccessScope{Sources: []api.SourceSnapshot{one}, GrantIDs: []string{g1.ID}}
	_, e := f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "PARENT_SCOPE_EXCEEDED")
	if f.host.count(one.ResourceID)+f.host.count(two.ResourceID) != 0 {
		t.Fatal("parent narrowing checked after Host access")
	}
	in.Sources = []api.SourceSnapshot{one}
	in.ParentScope = &api.AccessScope{}
	_, e = f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "PARENT_SCOPE_EXCEEDED")
	in.ParentScope = nil
	in.Recipient.Endpoint = "https://other.invalid/v1"
	_, e = f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "RECIPIENT_CHANGED")
	in.Recipient = f.recipient
	in.Sources[0].WorkspaceID = "workspace:other"
	_, e = f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "WORKSPACE_MISMATCH")
	if f.host.count(one.ResourceID)+f.host.count(two.ResourceID) != 0 {
		t.Fatal("rejected intersection read content")
	}
}

func TestHostReceiptHashMismatchCannotEnterPreparedContext(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	g := f.grant(t, source, "grant")
	f.host.corrupt = true
	out, e := f.c.API.Context.PrepareContext(ctx, owner, f.input([]api.SourceSnapshot{source}, g))
	requireFault(t, e, "SOURCE_SNAPSHOT_CHANGED")
	if len(out.Sources) != 0 {
		t.Fatal("changed receipt leaked text")
	}
}

func TestHostReadSnapshotAndByteBoundsAreValidatedAtProductFacade(t *testing.T) {
	for _, test := range []struct {
		name, reason string
		change       func(*api.HostReadResult)
	}{
		{"different-resource", "SOURCE_SNAPSHOT_CHANGED", func(r *api.HostReadResult) { r.Source.ResourceID = "source:third" }},
		{"different-revision", "SOURCE_SNAPSHOT_CHANGED", func(r *api.HostReadResult) { r.Source.Revision = "2" }},
		{"different-hash", "SOURCE_SNAPSHOT_CHANGED", func(r *api.HostReadResult) { r.Source.Hash = "sha256:" + string(make([]byte, 64)) }},
		{"different-scope", "SOURCE_SNAPSHOT_CHANGED", func(r *api.HostReadResult) { r.Source.ScopeResourceIDs = []string{"scope:forged"} }},
		{"truncated", "SOURCE_TOO_LARGE", func(r *api.HostReadResult) { r.Truncated = true }},
		{"over-limit", "SOURCE_TOO_LARGE", func(r *api.HostReadResult) { r.Text = string(make([]byte, 65537)) }},
	} {
		t.Run(test.name, func(t *testing.T) {
			f := open(t)
			source := f.source("source:one", "PRIVATE")
			g := f.grant(t, source, "grant")
			f.host.transform = test.change
			out, e := f.c.API.Context.PrepareContext(ctx, owner, f.input([]api.SourceSnapshot{source}, g))
			requireFault(t, e, test.reason)
			if len(out.Sources) != 0 {
				t.Fatal("invalid Host receipt leaked prepared text")
			}
		})
	}
}

func TestInvalidPersistedGrantReturnsHistoryErrorInsteadOfEmptySuccess(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	g := f.grant(t, source, "grant")
	in := f.input([]api.SourceSnapshot{source}, g)
	db, e := sql.Open("sqlite3", f.database)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	if _, e = db.ExecContext(ctx, "UPDATE access_grants SET expires_at='not-a-time' WHERE grant_id=?", g.ID); e != nil {
		t.Fatal(e)
	}
	out, e := f.c.API.Context.FilterHistory(ctx, owner, in, []api.ContextRecord{{ID: "derived", Text: "PRIVATE", Sources: []api.SourceSnapshot{source}}})
	requireFault(t, e, "GRANT_STATE_INVALID")
	if out != nil {
		t.Fatal("database state error disguised as empty history success")
	}
}

func TestRevokedParentGrantCannotBorrowSeparateTargetGrant(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	parent := f.grant(t, source, "parent-grant")
	target := f.grant(t, source, "target-grant")
	in := f.input([]api.SourceSnapshot{source}, target)
	in.ParentScope = &api.AccessScope{Sources: []api.SourceSnapshot{source}, GrantIDs: []string{parent.ID}}
	if _, e := f.c.API.Context.PrepareContext(ctx, owner, in); e != nil {
		t.Fatal(e)
	}
	if _, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("revoke-parent", "1"), ID: parent.ID}); e != nil {
		t.Fatal(e)
	}
	out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
	requireFault(t, e, "GRANT_REVOKED")
	if len(out.Sources) != 0 || f.host.count(source.ResourceID) != 1 {
		t.Fatal("child borrowed target grant after parent revoked")
	}
}

func await[T any](t *testing.T, ch <-chan T) T {
	t.Helper()
	timer := time.NewTimer(5 * time.Second)
	defer timer.Stop()
	select {
	case value := <-ch:
		return value
	case <-timer.C:
		t.Fatal("bounded access fixture did not complete")
		var zero T
		return zero
	}
}

func TestDisabledAdmittedRunRetainsPinnedSourceAndReadableHistory(t *testing.T) {
	f := open(t)
	source := f.source("source:one", "PRIVATE")
	g := f.grant(t, source, "grant")
	receipt, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("start", "1"), SessionID: f.session, Intent: "work", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.c.API.Assistant.Disable(ctx, owner, api.AgentDisable{CommandMeta: f.meta("disable", f.agent.Revision), ID: f.agent.ID}); e != nil {
		t.Fatal(e)
	}
	in := f.input([]api.SourceSnapshot{source}, g)
	in.TaskID = receipt.RunID
	out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
	if e != nil || len(out.Sources) != 1 {
		t.Fatalf("admitted disabled run lost fixed pin %#v %v", out, e)
	}
	history, e := f.c.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile}, SessionID: f.session})
	if e != nil || len(history.Items) != 1 || history.Items[0].Text != "work" {
		t.Fatalf("disabled Bot history hidden %#v %v", history, e)
	}
	in.TaskID = "task:new-intent"
	requireFault(t, f.c.API.Context.AuthorizeAdmission(ctx, owner, in), "AGENT_DISABLED")
}

func TestSearchVerifiesUTF16ExcerptAndDeduplicatesSnapshotReads(t *testing.T) {
	f := open(t)
	source := f.source("source:selection", "前中😀后")
	source.Kind = "selection"
	source.Range = &api.SourceRange{Start: 10, End: 15}
	g := f.grant(t, source, "grant")
	f.host.searchResult = api.HostSearchResult{Matches: []api.HostSearchMatch{{Source: source, Text: "中😀", Range: api.SourceRange{Start: 11, End: 14}}, {Source: source, Text: "后", Range: api.SourceRange{Start: 14, End: 15}}}}
	out, e := f.c.API.Context.Search(ctx, owner, f.input([]api.SourceSnapshot{source}, g), "中", 10)
	if e != nil || len(out.Matches) != 2 || f.host.count(source.ResourceID) != 1 || f.host.searchCalls != 1 {
		t.Fatalf("search exact UTF16 validation/dedup %#v %v", out, e)
	}
}

func TestSearchRejectsUnverifiableExcerptScopeRangeAndOversize(t *testing.T) {
	for _, test := range []struct {
		name, reason string
		mutate       func(*fixture, *api.SourceSnapshot, *api.HostSearchMatch)
	}{
		{"foreign-resource", "SOURCE_NOT_GRANTED", func(_ *fixture, _ *api.SourceSnapshot, m *api.HostSearchMatch) { m.Source.ResourceID = "source:third" }},
		{"false-scope-membership", "SOURCE_NOT_GRANTED", func(_ *fixture, _ *api.SourceSnapshot, m *api.HostSearchMatch) {
			m.Source.ResourceID = "source:third"
			m.Source.ScopeResourceIDs = []string{"scope:invented"}
		}},
		{"wrong-revision", "SOURCE_NOT_GRANTED", func(_ *fixture, _ *api.SourceSnapshot, m *api.HostSearchMatch) { m.Source.Revision = "2" }},
		{"wrong-excerpt", "SOURCE_EXCERPT_CHANGED", func(_ *fixture, _ *api.SourceSnapshot, m *api.HostSearchMatch) { m.Text = "WRONG" }},
		{"wrong-length", "SOURCE_SNAPSHOT_CHANGED", func(_ *fixture, _ *api.SourceSnapshot, m *api.HostSearchMatch) { m.Range.End++ }},
		{"surrogate-split", "SOURCE_EXCERPT_CHANGED", func(f *fixture, s *api.SourceSnapshot, m *api.HostSearchMatch) {
			*s = f.source("source:one", "😀A")
			m.Source = *s
			m.Text = "�"
			m.Range = api.SourceRange{Start: 0, End: 1}
		}},
		{"large-source", "SOURCE_TOO_LARGE", func(f *fixture, s *api.SourceSnapshot, m *api.HostSearchMatch) {
			*s = f.source("source:one", string(make([]byte, 65537)))
			m.Source = *s
			m.Text = string(make([]byte, 5))
		}},
	} {
		t.Run(test.name, func(t *testing.T) {
			f := open(t)
			source := f.source("source:one", "MATCH and context")
			match := api.HostSearchMatch{Source: source, Text: "MATCH", Range: api.SourceRange{Start: 0, End: 5}}
			test.mutate(f, &source, &match)
			g := f.grant(t, source, "grant")
			f.host.searchResult = api.HostSearchResult{Matches: []api.HostSearchMatch{match}}
			out, e := f.c.API.Context.Search(ctx, owner, f.input([]api.SourceSnapshot{source}, g), "MATCH", 10)
			requireFault(t, e, test.reason)
			if len(out.Matches) != 0 || f.host.count("source:third") != 0 {
				t.Fatal("invalid search receipt escaped or read unauthorized content")
			}
		})
	}
}

func TestRevokedOrExpiredParentCannotBorrowMorePrivilegedBotGrant(t *testing.T) {
	for _, state := range []string{"revoked", "expired"} {
		t.Run(state, func(t *testing.T) {
			f := open(t)
			one := f.source("source:one", "PRIVATE_ONE")
			two := f.source("source:two", "PRIVATE_TWO")
			parent := f.grant(t, one, "parent")
			model := f.agent.Model.ModelBindingDraft
			other, e := f.c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: f.meta("other-bot", ""), Draft: api.AgentDraft{Name: "More privileged", Model: &model}})
			if e != nil {
				t.Fatal(e)
			}
			target := api.GrantRecipient{AgentID: other.ID, ModelBindingRevision: other.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
			var grants []api.Grant
			for i, source := range []api.SourceSnapshot{one, two} {
				g, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta(fmt.Sprintf("target-grant-%d", i), ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{target}, Operations: []string{"read", "send"}, SessionID: f.session})
				if e != nil {
					t.Fatal(e)
				}
				grants = append(grants, g)
			}
			in := f.input([]api.SourceSnapshot{one}, grants...)
			in.Recipient = target
			in.ParentScope = &api.AccessScope{Sources: []api.SourceSnapshot{one}, GrantIDs: []string{parent.ID}}
			if _, e = f.c.API.Context.PrepareContext(ctx, owner, in); e != nil {
				t.Fatal(e)
			}
			reason := "GRANT_REVOKED"
			if state == "revoked" {
				_, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("revoke-parent", "1"), ID: parent.ID})
				if e != nil {
					t.Fatal(e)
				}
			} else {
				db, e := sql.Open("sqlite3", f.database)
				if e != nil {
					t.Fatal(e)
				}
				_, e = db.ExecContext(ctx, "UPDATE access_grants SET expires_at='2000-01-01T00:00:00Z' WHERE grant_id=?", parent.ID)
				closeErr := db.Close()
				if e != nil || closeErr != nil {
					t.Fatal(e, closeErr)
				}
				reason = "GRANT_EXPIRED"
			}
			out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
			requireFault(t, e, reason)
			if len(out.Sources) != 0 || f.host.count(one.ResourceID) != 1 || f.host.count(two.ResourceID) != 0 {
				t.Fatal("target Bot independently renewed parent authority")
			}
		})
	}
}

func TestGrantPaginationAndReopenKeepCurrentRevocation(t *testing.T) {
	f := open(t)
	one, two := f.source("source:one", "ONE"), f.source("source:two", "TWO")
	g1 := f.grant(t, one, "one")
	f.grant(t, two, "two")
	page, e := f.c.API.Grants.List(ctx, owner, api.PageQuery{ProfileID: f.profile, Limit: 1})
	if e != nil || len(page.Items) != 1 || page.NextCursor == "" {
		t.Fatal("bounded grant page", e)
	}
	if _, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("revoke", "1"), ID: g1.ID}); e != nil {
		t.Fatal(e)
	}
	_, e = f.c.API.Grants.List(ctx, owner, api.PageQuery{ProfileID: f.profile, Limit: 1, Cursor: page.NextCursor})
	requireFault(t, e, "GRANT_CURSOR_STALE")
	if e = f.c.Close(); e != nil {
		t.Fatal(e)
	}
	profiles := filepath.Dir(filepath.Dir(f.database))
	core, e := bootstrap.OpenWithOptions(ctx, profiles, filepath.Dir(f.database), bootstrap.Options{ExecutorPaused: true})
	if e != nil {
		t.Fatal(e)
	}
	defer core.Close()
	after, e := core.API.Grants.List(ctx, second, api.PageQuery{ProfileID: f.profile})
	if e != nil || len(after.Items) != 2 {
		t.Fatal("persistent grants missing", e)
	}
	found := false
	for _, g := range after.Items {
		if g.ID == g1.ID {
			found = g.State == "revoked" && g.Revision == "2"
		}
	}
	if !found {
		t.Fatal("revocation disappeared after restart")
	}
}

func TestFolderAndVaultScopesRequireExplicitGrantAndNeverAutoRead(t *testing.T) {
	for _, kind := range []string{"folder", "vault"} {
		t.Run(kind, func(t *testing.T) {
			f := open(t)
			source := f.source("source:chosen", "MATCH")
			source.ScopeResourceIDs = []string{"scope:chosen"}
			scope := api.SourceScope{ResourceID: "scope:chosen", Kind: kind, WorkspaceID: source.WorkspaceID, OriginClientID: source.OriginClientID, OriginViewID: source.OriginViewID, HostConnectionID: source.HostConnectionID, HostLeaseID: source.HostLeaseID, HostLeaseEpoch: source.HostLeaseEpoch, Revision: "1", Hash: source.Hash}
			g, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta("scope-grant", ""), WorkspaceID: source.WorkspaceID, Scope: kind, ResourceID: scope.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "send", "search"}})
			if e != nil {
				t.Fatal(e)
			}
			in := f.input(nil, g)
			in.Scopes = []api.SourceScope{scope}
			prepared, e := f.c.API.Context.PrepareContext(ctx, owner, in)
			if e != nil || len(prepared.Sources) != 0 || f.host.count(source.ResourceID) != 0 {
				t.Fatal("scope triggered implicit full read", e)
			}
			in.Sources = []api.SourceSnapshot{source}
			out, e := f.c.API.Context.PrepareContext(ctx, owner, in)
			if e != nil || len(out.Sources) != 1 {
				t.Fatalf("captured opaque membership not authorized %#v %v", out, e)
			}
			in.Scopes = nil
			_, e = f.c.API.Context.PrepareContext(ctx, owner, in)
			requireFault(t, e, "SOURCE_NOT_GRANTED")
			if f.host.count(source.ResourceID) != 1 {
				t.Fatal("client-supplied ancestor alone was treated as scope authority")
			}
			in.Sources = nil
			in.Scopes = []api.SourceScope{scope}
			f.host.searchResult = api.HostSearchResult{Matches: []api.HostSearchMatch{{Source: source, Text: "MATCH", Range: api.SourceRange{Start: 0, End: 5}}}}
			result, e := f.c.API.Context.Search(ctx, owner, in, "MATCH", 1)
			if e != nil || len(result.Matches) != 1 || len(f.host.searchRequest.Scopes) != 1 || len(f.host.searchRequest.Sources) != 0 || f.host.count(source.ResourceID) != 2 {
				t.Fatalf("finite authorized scope search %#v %v", result, e)
			}
		})
	}
}

func TestHistoryReadKeepsOnlyScopesRelatedToMessageProvenance(t *testing.T) {
	f := open(t)
	one, two := f.source("source:one", "ONE"), f.source("source:two", "TWO")
	one.ScopeResourceIDs = []string{"scope:one"}
	two.ScopeResourceIDs = []string{"scope:two"}
	scope := func(source api.SourceSnapshot, id string) api.SourceScope {
		return api.SourceScope{ResourceID: id, Kind: "folder", WorkspaceID: source.WorkspaceID, OriginClientID: source.OriginClientID, OriginViewID: source.OriginViewID, HostConnectionID: source.HostConnectionID, HostLeaseID: source.HostLeaseID, HostLeaseEpoch: source.HostLeaseEpoch, Revision: "1", Hash: source.Hash}
	}
	grant := func(source api.SourceSnapshot, key string) api.Grant {
		t.Helper()
		g, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta(key, ""), WorkspaceID: source.WorkspaceID, Scope: "folder", ResourceID: source.ScopeResourceIDs[0], Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "send"}})
		if e != nil {
			t.Fatal(e)
		}
		return g
	}
	first, second := grant(one, "first-scope"), grant(two, "second-scope")
	input := f.input([]api.SourceSnapshot{one, two}, first, second)
	input.Scopes = []api.SourceScope{scope(one, "scope:one"), scope(two, "scope:two")}
	record := api.ContextRecord{ID: "first-message", Text: "ONE_DERIVED", Sources: []api.SourceSnapshot{one}}
	_, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("revoke-second-scope", second.Revision), ID: second.ID})
	if e != nil {
		t.Fatal(e)
	}
	visible, e := f.c.API.Context.FilterHistory(ctx, owner, input, []api.ContextRecord{record, {ID: "plain", Text: "plain user text"}})
	if e != nil || len(visible) != 2 || visible[0].Text != "ONE_DERIVED" {
		t.Fatalf("unrelated inherited scope revoked valid message: %#v %v", visible, e)
	}
	_, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("revoke-first-scope", first.Revision), ID: first.ID})
	if e != nil {
		t.Fatal(e)
	}
	visible, e = f.c.API.Context.FilterHistory(ctx, owner, input, []api.ContextRecord{record, {ID: "plain", Text: "plain user text"}})
	if e != nil || len(visible) != 1 || visible[0].ID != "plain" {
		t.Fatalf("current message scope no longer enforced: %#v %v", visible, e)
	}
}
