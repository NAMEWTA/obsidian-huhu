package access_test

import (
	"database/sql"
	"errors"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// Facts are controlled at the Memory adapter boundary; Runs, pins, sources,
// recipients and Grant mutation are real. This is not an 015 confirmation test.
func TestGlobalRootKeepsPrivateAncestorAndCurrentReceivingProviderQualification(t *testing.T) {
	f := open(t)
	source := f.source("source:global-ancestor", "GLOBAL_ANCESTOR_SOURCE")
	model := api.ModelBindingDraft{ProviderID: "origin", ModelID: "origin-model", Protocol: "openai-responses", Endpoint: "https://origin.invalid/v1", Capabilities: []string{"text"}}
	b, err := f.c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: f.meta("global-origin-agent", ""), Draft: api.AgentDraft{Name: "Origin B", Model: &model}})
	if err != nil {
		t.Fatal(err)
	}
	recipient := api.GrantRecipient{AgentID: b.ID, ModelBindingRevision: b.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}
	originGrant, err := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta("global-origin-grant", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{recipient}, Operations: []string{"read", "send"}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := f.c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("global-origin-session", ""), Kind: "direct", Title: "Origin B", MemberIDs: []string{b.ID}, WorkspaceID: source.WorkspaceID})
	if err != nil {
		t.Fatal(err)
	}
	origin, err := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("global-origin-run", session.Revision), SessionID: session.ID, Intent: "GLOBAL_ANCESTOR_SOURCE", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{originGrant.ID}})
	if err != nil {
		t.Fatal(err)
	}
	target, err := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("global-target-run", "1"), SessionID: f.session, Intent: "independent A intent", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	db, err := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var message string
	if err = db.WithinTx(ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(ctx, "SELECT user_message_id FROM execution_runs WHERE run_id=?", origin.RunID).Scan(&message)
	}); err != nil {
		t.Fatal(err)
	}
	subject := grantsstore.MemorySubject{Kind: "memory_revision", ID: "memory-revision:global-root"}
	root := grantsstore.MemoryRequirement{Subject: subject, Namespace: api.MemoryNamespace{Kind: "global", ID: f.profile}, Scope: api.MemoryScope{Kind: "profile"}, RevisionIDs: []string{subject.ID}}
	ancestor := grantsstore.MemoryRequirement{Subject: subject, Namespace: api.MemoryNamespace{Kind: "agent", ID: b.ID}, Scope: api.MemoryScope{Kind: "profile"}, RevisionIDs: []string{"memory-revision:private-b"}, Witnesses: []grantsstore.MemoryWitness{{Ref: api.DerivedInput{Kind: "message", ID: message, Revision: "1", Hash: source.Hash, Namespace: session.ID, WorkThreadID: session.ID}, OriginRunID: origin.RunID, Sources: []api.SourceSnapshot{source}, Scopes: []api.SourceScope{}, GrantIDs: []string{originGrant.ID}}}}
	reader := &memoryFactsReader{facts: grantsstore.MemoryFacts{Requirements: []grantsstore.MemoryRequirement{root, ancestor}, Watermark: "controlled-complete-current-global-facts"}}
	checks := grantsstore.New(db)
	checks.SetMemory(reader)
	check := func(req grantsstore.MemoryRequirement) error {
		return db.WithinTx(ctx, func(tx *sql.Tx) error {
			_, err := checks.CheckMemoryInTx(ctx, tx, owner, f.profile, target.RunID, req, []string{"read", "send"})
			return err
		})
	}
	// The global label does not grant a new Provider the origin's source access.
	requireFault(t, check(root), "RECIPIENT_NOT_GRANTED")
	if _, err = f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta("global-target-grant", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "send"}, SessionID: f.session}); err != nil {
		t.Fatal(err)
	}
	if err = check(root); err != nil {
		t.Fatal("confirmed global head's complete ancestor chain", err)
	}
	if err = check(ancestor); err != nil {
		t.Fatal("real private ancestor was incorrectly relabeled as a direct private read", err)
	}
	for _, kind := range []string{"session", "work_thread"} {
		scopedRoot := root
		scopedRoot.Scope = api.MemoryScope{Kind: kind, ID: f.session}
		reader.facts.Requirements = []grantsstore.MemoryRequirement{scopedRoot, ancestor}
		if err = check(scopedRoot); err != nil {
			t.Fatal("legal scoped global head", kind, err)
		}
	}
	private := ancestor
	private.Subject = grantsstore.MemorySubject{Kind: "memory_revision", ID: ancestor.RevisionIDs[0]}
	reader.facts.Requirements = []grantsstore.MemoryRequirement{private}
	requireFault(t, check(private), "MEMORY_NAMESPACE_DENIED")
	// A global ancestor is insufficient when the requested subject is private.
	privateRoot := root
	privateRoot.Namespace = api.MemoryNamespace{Kind: "agent", ID: f.agent.ID}
	globalAncestor := root
	globalAncestor.RevisionIDs = []string{"memory-revision:global-ancestor"}
	reader.facts.Requirements = []grantsstore.MemoryRequirement{privateRoot, globalAncestor, ancestor}
	requireFault(t, check(ancestor), "MEMORY_NAMESPACE_DENIED")
	// Even validating the root alone must check every actual ancestor's scope.
	wrongScope := ancestor
	wrongScope.Scope = api.MemoryScope{Kind: "work_thread", ID: "thread:unrelated"}
	reader.facts.Requirements = []grantsstore.MemoryRequirement{root, wrongScope}
	requireFault(t, check(root), "MEMORY_SCOPE_MISMATCH")
	contradictory := ancestor
	contradictory.RevisionIDs = []string{subject.ID}
	reader.facts.Requirements = []grantsstore.MemoryRequirement{root, contradictory}
	requireFault(t, check(root), "MEMORY_STATE_INVALID")
	wrongProfile := root
	wrongProfile.Namespace.ID = "profile:other"
	reader.facts.Requirements = []grantsstore.MemoryRequirement{wrongProfile, ancestor}
	requireFault(t, check(wrongProfile), "MEMORY_NAMESPACE_DENIED")
	missingRoot := root
	missingRoot.RevisionIDs = []string{"memory-revision:unrelated"}
	reader.facts.Requirements = []grantsstore.MemoryRequirement{missingRoot, ancestor}
	requireFault(t, check(missingRoot), "MEMORY_STATE_INVALID")
	reader.facts.Requirements = []grantsstore.MemoryRequirement{root, ancestor}
	unknown := errors.New("controlled Memory reader I/O failure")
	reader.err = unknown
	if err = check(root); !errors.Is(err, unknown) {
		t.Fatal("unknown reader error changed", err)
	}
	reader.err = nil
	if _, err = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("global-origin-revoke", originGrant.Revision), ID: originGrant.ID}); err != nil {
		t.Fatal(err)
	}
	requireFault(t, check(root), "GRANT_REVOKED")
}
