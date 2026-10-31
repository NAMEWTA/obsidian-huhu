package groups_test

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	memorystore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestPublishedMemoryAncestorsKeepRealNamespaceWithoutPrivateLibraryInheritance(t *testing.T) {
	entered := make(chan api.EngineInput, 1)
	afterRemove := make(chan struct{})
	afterForget := make(chan struct{})
	firstDispatch := make(chan error, 1)
	heldBeforeForget := make(chan struct{}, 1)
	finished := make(chan error, 1)
	var removeOnce, forgetOnce sync.Once
	var callbacks atomic.Int32
	engine := engineFunc(func(call context.Context, in api.EngineInput) (api.EngineResult, error) {
		if in.Agent.Name == "B" {
			if in.Memory == nil || len(in.Memory.Entries) != 1 || in.Memory.Entries[0].Text != "PRIVATE_B_LIBRARY" {
				return api.EngineResult{}, fmt.Errorf("B did not actually recall its own library")
			}
			return api.EngineResult{Status: "finished", Text: "published: " + in.Memory.Entries[0].Text}, nil
		}
		check := func() error {
			if in.Agent.Name != "C" || in.ShortTerm == nil {
				return fmt.Errorf("unexpected model or missing real context")
			}
			found := false
			for _, entry := range in.ShortTerm.Entries {
				found = found || strings.Contains(entry.Text, "published: PRIVATE_B_LIBRARY")
			}
			if !found {
				return fmt.Errorf("legal public history was lost across ancestor namespaces")
			}
			for _, member := range in.Lineage.Group.Members {
				if member.AgentID != in.Agent.ID {
					return fmt.Errorf("public author was treated as a private contributor")
				}
			}
			entered <- in
			select {
			case <-afterRemove:
			case <-call.Done():
				return call.Err()
			}
			first, e := in.Attempts.Reserve(call, api.AttemptRequest{LogicalCallID: "published-after-author-remove", InputEstimate: "1", OutputBound: "6"})
			if e == nil {
				e = in.Attempts.Dispatch(call, first, func(context.Context) error { callbacks.Add(1); return nil })
			}
			if e == nil {
				_, e = in.Attempts.Settle(context.Background(), first, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true})
			}
			firstDispatch <- e
			if e != nil {
				return e
			}
			next, e := in.Attempts.Reserve(call, api.AttemptRequest{LogicalCallID: "published-before-forget", InputEstimate: "1", OutputBound: "6"})
			if e != nil {
				return e
			}
			// Reserve rechecks access. Forget must not overlap that check:
			// the pre-forget reservation is held, then Forget runs, then
			// Dispatch has to observe MEMORY_FORGOTTEN.
			heldBeforeForget <- struct{}{}
			select {
			case <-afterForget:
			case <-call.Done():
				return call.Err()
			}
			e = in.Attempts.Dispatch(call, next, func(context.Context) error { callbacks.Add(1); return nil })
			if !reason(e, "MEMORY_FORGOTTEN") {
				return fmt.Errorf("published Memory ancestor not rechecked: %v", e)
			}
			return in.Attempts.AbortUnsent(context.Background(), next)
		}()
		finished <- check
		return api.EngineResult{Status: "failed", Reason: "MEMORY_FORGOTTEN"}, check
	})
	core, loc := open(t, bootstrap.Options{Engine: engine})
	t.Cleanup(func() { removeOnce.Do(func() { close(afterRemove) }); forgetOnce.Do(func() { close(afterForget) }) })
	a := agent(t, core, "A-no-model", false)
	b := agent(t, core, "B", true)
	c := agent(t, core, "C", true)
	ns := api.MemoryNamespace{Kind: "agent", ID: b.ID}
	profileID := meta(t, core, "profile", "").ProfileID
	page, e := core.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: profileID, Namespace: ns})
	if e != nil {
		t.Fatal(e)
	}
	item, e := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{CommandMeta: meta(t, core, "add-B-memory", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "PRIVATE_B_LIBRARY"})
	if e != nil {
		t.Fatal(e)
	}
	settings, e := core.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: profileID})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = core.API.Collaboration.ConfigureBudget(ctx, owner, api.BudgetConfigure{CommandMeta: meta(t, core, "configure", settings.Revision), Policy: api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "100", MaintenanceTokenLimit: "0"}}); e != nil {
		t.Fatal(e)
	}
	session := group(t, core, a, b, c)
	first, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, core, "B-publish", session.Revision), SessionID: session.ID, Intent: "B publishes once", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{b.ID}})
	if e != nil {
		t.Fatal(e)
	}
	if r := wait(t, core, first.RunID); r.Status != "succeeded" {
		t.Fatal("B publication failed", r)
	}
	session, e = core.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: profileID, ID: session.ID})
	if e != nil {
		t.Fatal(e)
	}
	second, e := core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, core, "C-read-public", session.Revision), SessionID: session.ID, Intent: "C reads the public thread", SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{c.ID}})
	if e != nil {
		t.Fatal(e)
	}
	var consumer api.EngineInput
	select {
	case consumer = <-entered:
	case e := <-finished:
		t.Fatal(e)
	case <-time.After(8 * time.Second):
		t.Fatal("C did not consume legal published context")
	}
	// Directly reading B's private item is a different operation from consuming
	// the already-authorized public message that has B's immutable ancestor.
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(loc, "profile.sqlite3")})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	facts := memorystore.New(db, nil, checks, nil)
	checks.SetMemory(facts)
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		f, e := facts.ReadFactsInTx(ctx, tx, owner, profileID, []grantsstore.MemorySubject{{Kind: "memory_revision", ID: item.RevisionID}})
		if e != nil {
			return e
		}
		if len(f.Requirements) == 0 {
			return fmt.Errorf("actual private memory facts absent")
		}
		for _, req := range f.Requirements {
			_, e = checks.CheckMemoryInTx(ctx, tx, owner, profileID, consumer.RunID, req, []string{"read", "send"})
			if !reason(e, "MEMORY_NAMESPACE_DENIED") {
				return fmt.Errorf("C inherited B private library: %v", e)
			}
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	session, e = core.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: profileID, ID: session.ID})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = core.API.Groups.UpdateMembers(ctx, owner, api.SessionMembersUpdate{CommandMeta: meta(t, core, "remove-B", session.Revision), ID: session.ID, MemberIDs: []string{a.ID, c.ID}, HistoryScope: api.GroupHistoryScope{Kind: "none"}}); e != nil {
		t.Fatal(e)
	}
	removeOnce.Do(func() { close(afterRemove) })
	select {
	case e := <-firstDispatch:
		if e != nil {
			t.Fatal("legal public history depended on removed author", e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("C did not dispatch after author removal")
	}
	select {
	case <-heldBeforeForget:
	case e := <-finished:
		t.Fatal(e)
	case <-time.After(5 * time.Second):
		t.Fatal("C did not hold the pre-forget attempt")
	}
	if _, e = core.API.Memory.Forget(ctx, owner, api.MemoryForget{CommandMeta: meta(t, core, "forget-B", item.Revision), Namespace: ns, ID: item.ID}); e != nil {
		t.Fatal(e)
	}
	forgetOnce.Do(func() { close(afterForget) })
	select {
	case e := <-finished:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("C did not finish")
	}
	root := wait(t, core, second.RunID)
	// A pure orchestration root completes its status-only aggregation. Its
	// child failure is the existing partial-failure reason, not a failed root.
	if root.Status != "succeeded" || root.Role != "orchestration" || root.Reason != "CHILD_PARTIAL_FAILURE" || root.AgentID != "" || root.Group == nil || len(root.Group.Members) != 0 {
		t.Fatal("root did not project the status-only partial result", root)
	}
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		var status, failure, parent, deliveredStatus, deliveredReason, text, publication string
		var partial bool
		var message sql.NullString
		if e := tx.QueryRowContext(ctx, "SELECT r.status,r.reason,r.parent_run_id,d.status,d.reason,d.text,d.partial,p.status,p.message_id FROM execution_runs r JOIN collaboration_result_deliveries d ON d.child_run_id=r.run_id AND d.parent_run_id=r.parent_run_id JOIN group_publications p ON p.child_run_id=r.run_id WHERE r.run_id=?", consumer.RunID).Scan(&status, &failure, &parent, &deliveredStatus, &deliveredReason, &text, &partial, &publication, &message); e != nil {
			return e
		}
		if status != "failed" || failure != "MEMORY_FORGOTTEN" || parent != root.ID || deliveredStatus != status || deliveredReason != failure || text != "" || partial || publication != "failed" || message.Valid {
			return fmt.Errorf("C outcome was not the actual body-free Memory failure: status=%s reason=%s parent=%s delivery=%s/%s textBytes=%d partial=%t publication=%s hasMessage=%t", status, failure, parent, deliveredStatus, deliveredReason, len(text), partial, publication, message.Valid)
		}
		// Run exposes the aggregate reason; the durable child set establishes
		// the exact children and partial-failure facts behind that projection.
		var children, incomplete int
		if e := tx.QueryRowContext(ctx, "SELECT count(*),COALESCE(sum(CASE WHEN r.status IN('failed','canceled') OR d.partial=1 OR r.effects_unresolved=1 THEN 1 ELSE 0 END),0) FROM execution_runs r JOIN collaboration_result_deliveries d ON d.child_run_id=r.run_id WHERE r.parent_run_id=?", root.ID).Scan(&children, &incomplete); e != nil {
			return e
		}
		if children != 1 || incomplete != 1 {
			return fmt.Errorf("root child/partial projection changed: children=%d incomplete=%d", children, incomplete)
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	if callbacks.Load() != 1 {
		t.Fatal("forgotten ancestor produced an extra callback", callbacks.Load())
	}
	history, e := core.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: profileID, Limit: 100}, SessionID: session.ID})
	if e != nil {
		t.Fatal(e)
	}
	if len(history.Items) != 2 {
		t.Fatal("independent user messages were hidden or old published body survived", history)
	}
	for _, message := range history.Items {
		if message.Role != "user" {
			t.Fatal("forgotten public descendant retained body", message)
		}
	}
}
