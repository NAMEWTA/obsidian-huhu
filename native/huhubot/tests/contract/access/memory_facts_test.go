package access_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// This controls only the new adapter reader boundary. It is not a T14 Store,
// Memory table implementation, planner or end-to-end maintenance assertion.
type memoryFactsReader struct {
	facts grantsstore.MemoryFacts
	err   error
	calls int
}

// The fake replaces only the Memory Store's facts read; the Grant, source,
// recipient, deadline and SQLite checks below are the real adapter path.
type sharedAncestorFactsReader struct {
	witness grantsstore.MemoryWitness
	agentID string
	session string
	calls   int
}

func (r *sharedAncestorFactsReader) ReadFactsInTx(_ context.Context, _ *sql.Tx, _ api.RequestIdentity, _ string, subjects []grantsstore.MemorySubject) (grantsstore.MemoryFacts, error) {
	r.calls++
	facts := grantsstore.MemoryFacts{Requirements: make([]grantsstore.MemoryRequirement, 0, len(subjects))}
	for _, subject := range subjects {
		facts.Requirements = append(facts.Requirements, grantsstore.MemoryRequirement{
			Subject: subject, Namespace: api.MemoryNamespace{Kind: "agent", ID: r.agentID}, Scope: api.MemoryScope{Kind: "session", ID: r.session},
			RevisionIDs: []string{subject.ID}, Witnesses: []grantsstore.MemoryWitness{r.witness},
		})
	}
	return facts, nil
}

func (r *memoryFactsReader) ReadFactsInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []grantsstore.MemorySubject) (grantsstore.MemoryFacts, error) {
	r.calls++
	return r.facts, r.err
}

func TestMemoryFactsUseCurrentGrantTargetAndIndependentReaderErrors(t *testing.T) {
	f := open(t)
	source := f.source("source:memory-witness", "ACTUAL_MEMORY_SOURCE")
	grant := f.grant(t, source, "memory-witness-grant")
	run, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("memory-witness-run", "1"), SessionID: f.session, Intent: "ACTUAL_MEMORY_SOURCE", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	var messageID string
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(ctx, "SELECT user_message_id FROM execution_runs WHERE run_id=?", run.RunID).Scan(&messageID)
	}); e != nil {
		t.Fatal(e)
	}
	req := grantsstore.MemoryRequirement{
		Subject:   grantsstore.MemorySubject{Kind: "memory_revision", ID: "memory-revision:controlled"},
		Namespace: api.MemoryNamespace{Kind: "agent", ID: f.agent.ID}, Scope: api.MemoryScope{Kind: "session", ID: f.session},
		RevisionIDs: []string{"memory-revision:controlled"},
		Witnesses:   []grantsstore.MemoryWitness{{Ref: api.DerivedInput{Kind: "message", ID: messageID, Revision: "1", Hash: source.Hash, Namespace: f.session, WorkThreadID: f.session}, OriginRunID: run.RunID, Sources: []api.SourceSnapshot{source}, Scopes: []api.SourceScope{}, GrantIDs: []string{grant.ID}}},
	}
	reader := &memoryFactsReader{}
	checks.SetMemory(reader)
	check := func(requirement grantsstore.MemoryRequirement, target string, ops []string) error {
		t.Helper()
		reader.facts = grantsstore.MemoryFacts{Requirements: []grantsstore.MemoryRequirement{requirement}, Watermark: "controlled-current-facts"}
		before := reader.calls
		return db.WithinTx(ctx, func(tx *sql.Tx) error {
			until, e := checks.CheckMemoryInTx(ctx, tx, owner, f.profile, target, requirement, ops)
			if reader.calls > before+1 {
				t.Fatalf("Memory authorization recursed into its reader: %d calls", reader.calls-before)
			}
			if e == nil && (!time.Now().Before(until) || time.Until(until) > 250*time.Millisecond) {
				t.Fatal("invalid current read deadline", until)
			}
			return e
		})
	}
	if e := check(req, "", []string{"read"}); e != nil {
		t.Fatal("historical UI read", e)
	}
	if e := check(req, run.RunID, []string{"read", "send", "summarize", "memory"}); e != nil {
		t.Fatal("same exact target", e)
	}
	if reader.calls != 2 {
		t.Fatal("valid Memory authorization bypassed the current reader", reader.calls)
	}
	bad := req
	bad.Namespace = api.MemoryNamespace{Kind: "agent", ID: "agent:other"}
	requireFault(t, check(bad, run.RunID, []string{"read", "send"}), "MEMORY_NAMESPACE_DENIED")
	bad = req
	bad.Namespace = api.MemoryNamespace{Kind: "temporary", ID: f.agent.ID}
	requireFault(t, check(bad, run.RunID, []string{"read", "send"}), "MEMORY_NAMESPACE_DENIED")
	bad = req
	bad.Scope = api.MemoryScope{Kind: "work_thread", ID: "thread:other"}
	requireFault(t, check(bad, run.RunID, []string{"read", "send"}), "MEMORY_SCOPE_MISMATCH")
	requireFault(t, check(req, "", []string{"read", "send"}), "MEMORY_SCOPE_MISMATCH")
	reader.err = api.Denied("MEMORY_FORGOTTEN")
	requireFault(t, check(req, "", []string{"read"}), "MEMORY_FORGOTTEN")
	unknown := errors.New("controlled reader I/O failure")
	reader.err = unknown
	if e := check(req, "", []string{"read"}); !errors.Is(e, unknown) {
		t.Fatal("unknown reader failure was swallowed", e)
	}
	reader.err = nil
	if _, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("memory-witness-revoke", grant.Revision), ID: grant.ID}); e != nil {
		t.Fatal(e)
	}
	requireFault(t, check(req, "", []string{"read"}), "GRANT_REVOKED")
	checks.SetMemory(nil)
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := checks.CheckMemoryInTx(ctx, tx, owner, f.profile, "", req, []string{"read"})
		requireFault(t, e, "ACCESS_NOT_ASSEMBLED")
		return nil
	}); e != nil {
		t.Fatal(e)
	}
}

func TestEightHundredMemorySubjectsShareAncestorBatchAndRecheckCurrentGrant(t *testing.T) {
	f := open(t)
	source := f.source("source:memory-batch", "SHARED_ANCESTOR_SOURCE")
	grant := f.grant(t, source, "memory-batch-grant")
	run, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("memory-batch-run", "1"), SessionID: f.session, Intent: "SHARED_ANCESTOR_SOURCE", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	var messageID string
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(ctx, "SELECT user_message_id FROM execution_runs WHERE run_id=?", run.RunID).Scan(&messageID)
	}); e != nil {
		t.Fatal(e)
	}
	reader := &sharedAncestorFactsReader{
		witness: grantsstore.MemoryWitness{Ref: api.DerivedInput{Kind: "message", ID: messageID, Revision: "1", Hash: source.Hash, Namespace: f.session, WorkThreadID: f.session}, OriginRunID: run.RunID, Sources: []api.SourceSnapshot{source}, Scopes: []api.SourceScope{}, GrantIDs: []string{grant.ID}},
		agentID: f.agent.ID, session: f.session,
	}
	checks := grantsstore.New(db)
	checks.SetMemory(reader)
	subjects := make([]grantsstore.MemorySubject, 800)
	for i := range subjects {
		subjects[i] = grantsstore.MemorySubject{Kind: "memory_revision", ID: fmt.Sprintf("memory-revision:batch-%03d", i)}
	}
	started := time.Now()
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		until, e := checks.ReadMemoryDeadlineBatchInTx(ctx, tx, owner, f.profile, subjects)
		if e == nil && (!time.Now().Before(until) || time.Until(until) > 250*time.Millisecond) {
			t.Fatal("batch returned an invalid physical deadline", until)
		}
		return e
	}); e != nil {
		t.Fatal(e)
	}
	if elapsed := time.Since(started); elapsed >= 250*time.Millisecond || reader.calls != 1 {
		t.Fatal("800 shared-ancestor subjects exceeded one delivery lifetime or repeated facts reads", elapsed, reader.calls)
	}
	if _, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("memory-batch-revoke", grant.Revision), ID: grant.ID}); e != nil {
		t.Fatal(e)
	}
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, denied := checks.ReadMemoryDeadlineBatchInTx(ctx, tx, owner, f.profile, subjects)
		requireFault(t, denied, "GRANT_REVOKED")
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	if reader.calls != 2 {
		t.Fatal("revoked ancestor used cached batch permission", reader.calls)
	}
}
