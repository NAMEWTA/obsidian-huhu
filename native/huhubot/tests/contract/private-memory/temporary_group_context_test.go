package privatememory_test

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func memoryGroupSession(t *testing.T, f *memoryFixture, id string) api.Session {
	t.Helper()
	v, err := f.core.API.Conversation.GetSession(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: id})
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func memoryGroupMembers(t *testing.T, f *memoryFixture, sessionID string, members []string, history api.GroupHistoryScope) api.Session {
	t.Helper()
	current := memoryGroupSession(t, f, sessionID)
	v, err := f.core.API.Groups.UpdateMembers(context.Background(), owner, api.SessionMembersUpdate{CommandMeta: f.next(current.Revision), ID: current.ID, MemberIDs: members, HistoryScope: history})
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func memoryGroupSend(t *testing.T, f *memoryFixture, sessionID, text, target string) api.RunReceipt {
	t.Helper()
	current := memoryGroupSession(t, f, sessionID)
	run, err := f.core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{CommandMeta: f.next(current.Revision), SessionID: current.ID, Intent: text, SourceRefs: []api.SourceSnapshot{}, TargetAgentIDs: []string{target}})
	if err != nil {
		t.Fatal(err)
	}
	return run
}

func TestTemporaryContextUsesOnlyItsCurrentSponsorsPublicGroupAudience(t *testing.T) {
	for _, scenario := range []string{"already-joined", "prejoin-none", "prejoin-range", "external-existing", "removed-and-rejoined"} {
		t.Run(scenario, func(t *testing.T) {
			inputs := make(chan api.EngineInput, 1)
			release := make(chan struct{})
			var releaseOnce sync.Once
			var sponsorID, outsideID string
			engine := memoryEngine(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
				switch in.Intent {
				case "seed sponsor private thread":
					_, err := in.Tools.Invoke(ctx, api.ToolCall{ID: "private-thread", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: sponsorID}, Task: "SPONSOR_OTHER_THREAD", Constraints: []string{}}})
					return api.EngineResult{Status: "finished", Text: "SPONSOR_PRIVATE_CHAT"}, err
				case "SPONSOR_OTHER_THREAD":
					return api.EngineResult{Status: "finished", Text: "SPONSOR_OTHER_THREAD_RESULT"}, nil
				case "delegate public history":
					draft := api.AgentDraft{Name: "bounded temporary", Persona: "independent temporary", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}, Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}
					target := api.DelegationTarget{Kind: "temporary", Draft: &draft}
					if scenario == "external-existing" {
						target = api.DelegationTarget{Kind: "existing", AgentID: outsideID}
					}
					_, err := in.Tools.Invoke(ctx, api.ToolCall{ID: "public-history-helper", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: target, Task: "read authorized group history", Constraints: []string{}}})
					return api.EngineResult{Status: "finished", Text: "sponsor done"}, err
				case "read authorized group history":
					inputs <- in
					select {
					case <-release:
						return api.EngineResult{Status: "finished", Text: "helper done"}, nil
					case <-ctx.Done():
						return api.EngineResult{}, ctx.Err()
					}
				default:
					return api.EngineResult{Status: "finished", Text: "PUBLIC_SENTINEL_153"}, nil
				}
			})
			f := newMemoryFixture(t, engine, false)
			t.Cleanup(func() { releaseOnce.Do(func() { close(release) }) })
			coordinator := f.agent("group coordinator without model", false)
			sponsor := f.agent("group sponsor", true)
			publisher := f.agent("other group publisher", true)
			outside := f.agent("outside existing helper", true)
			sponsorID, outsideID = sponsor.ID, outside.ID
			sponsor, err := f.core.API.Assistant.Update(context.Background(), owner, api.AgentUpdate{CommandMeta: f.next(sponsor.Revision), ID: sponsor.ID, Draft: api.AgentDraft{Name: sponsor.Name, Persona: sponsor.Persona, Model: &sponsor.Model.ModelBindingDraft, AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: []string{sponsor.ID, outside.ID}}})
			if err != nil {
				t.Fatal(err)
			}
			privateSession := f.session(sponsor)
			f.add(namespaceFor(sponsor), api.MemoryScope{Kind: "session", ID: privateSession.ID}, "SPONSOR_PRIVATE_LONG_TERM")
			private := f.start(privateSession, "seed sponsor private thread")
			f.wait(private.RunID, "succeeded")
			members := []string{coordinator.ID, publisher.ID}
			prejoin := scenario == "prejoin-none" || scenario == "prejoin-range"
			if !prejoin {
				members = append(members, sponsor.ID)
			}
			group, err := f.core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{CommandMeta: f.next(""), Kind: "group", Title: "bounded public group", MemberIDs: members, CoordinatorID: coordinator.ID})
			if err != nil {
				t.Fatal(err)
			}
			firstTarget := sponsor.ID
			if prejoin {
				firstTarget = publisher.ID
			}
			first := memoryGroupSend(t, f, group.ID, "establish public history", firstTarget)
			f.wait(first.RunID, "succeeded")
			db := f.database()
			var publicID, publicSeq string
			if err := db.QueryRow("SELECT m.message_id,CAST(m.seq AS TEXT) FROM group_publications p JOIN conversation_messages m ON m.message_id=p.message_id JOIN execution_runs r ON r.run_id=p.child_run_id WHERE r.root_run_id=?", first.RunID).Scan(&publicID, &publicSeq); err != nil {
				t.Fatal("first public message was not actually published", err)
			}
			if prejoin {
				scope := api.GroupHistoryScope{Kind: "none"}
				if scenario == "prejoin-range" {
					scope = api.GroupHistoryScope{Kind: "range", AfterSeq: "0", ThroughSeq: publicSeq}
				}
				memoryGroupMembers(t, f, group.ID, []string{coordinator.ID, publisher.ID, sponsor.ID}, scope)
			}
			// This is visible to the sponsor on the next group turn, but it is
			// never an implicit private-memory body for the delegated subject.
			f.add(namespaceFor(sponsor), api.MemoryScope{Kind: "profile"}, "SPONSOR_PRIVATE_PROFILE")
			second := memoryGroupSend(t, f, group.ID, "delegate public history", sponsor.ID)
			in := receiveInput(t, inputs)
			if in.ShortTerm == nil || in.Lineage.Group == nil || in.ShortTerm.Namespace.SubjectID != in.Agent.ID || in.ShortTerm.Namespace.WorkThreadID != in.Lineage.WorkThreadID || in.ShortTerm.Namespace.WorkThreadID == privateSession.ID || in.ShortTerm.Namespace.SessionID != group.ID || len(in.History) != 0 || len(in.Messages) != 0 {
				t.Fatal("helper context did not retain its actual subject/session/thread")
			}
			if scenario != "external-existing" && (in.Config.Kind != "temporary" || in.Config.SponsorAgentID != sponsor.ID || in.ShortTerm.Namespace.SubjectKind != "temporary") {
				t.Fatal("test did not exercise a real temporary sponsor binding")
			}
			bound := false
			for _, member := range in.Lineage.Group.Members {
				bound = bound || member.AgentID == sponsor.ID
			}
			if !bound {
				t.Fatal("actual group binding does not contain the initiating sponsor")
			}
			found := false
			all := in.Intent
			for _, entry := range in.ShortTerm.Entries {
				all += "\n" + entry.Text
				if entry.Ref.ID == publicID && strings.Contains(entry.Text, "PUBLIC_SENTINEL_153") {
					found = true
				}
			}
			if in.Memory != nil {
				for _, entry := range in.Memory.Entries {
					all += "\n" + entry.Text
				}
			}
			wanted := scenario != "prejoin-none" && scenario != "external-existing"
			if found != wanted {
				t.Fatal("actual public history selection differs from the bound audience", found, wanted)
			}
			for _, private := range []string{"SPONSOR_PRIVATE_CHAT", "SPONSOR_OTHER_THREAD", "SPONSOR_PRIVATE_LONG_TERM", "SPONSOR_PRIVATE_PROFILE"} {
				if strings.Contains(all, private) {
					t.Fatal("helper inherited sponsor private context")
				}
			}
			if scenario == "removed-and-rejoined" {
				a := openMemoryAdapters(t, f)
				check := func(reason string) {
					t.Helper()
					err := a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
						value, err := a.memory.ReadContextInTx(context.Background(), tx, owner, in.RunID)
						if value != nil {
							return fmt.Errorf("removed/rejoined audience returned a sealed body")
						}
						return err
					})
					if !memoryReason(err, reason) {
						t.Fatal("old temporary context ignored current member generation", err)
					}
				}
				memoryGroupMembers(t, f, group.ID, []string{coordinator.ID, publisher.ID}, api.GroupHistoryScope{Kind: "none"})
				check("GROUP_MEMBER_REMOVED")
				releaseOnce.Do(func() { close(release) })
				// Current group qualification deliberately denies public GetRun for
				// this old binding too. Observe completion without reading a body.
				observe := func() {
					for _, label := range []struct{ name, id string }{{"helper", in.RunID}, {"sponsor", in.Lineage.ParentRunID}, {"root", second.RunID}} {
						var status, reason string
						var claimed, closed, slot int
						if err := db.QueryRow("SELECT status,reason,CASE WHEN claim_token='' THEN 0 ELSE 1 END,task_admission_closed,child_slot FROM execution_runs WHERE run_id=?", label.id).Scan(&status, &reason, &claimed, &closed, &slot); err != nil {
							t.Fatal(err)
						}
						t.Logf("body-free cancellation observation: %s status=%s reason=%s claimed=%d closed=%d slot=%d", label.name, status, reason, claimed, closed, slot)
					}
					t.Logf("historical wait edges=%d; schedulable parents=%d", sqlCount(t, db, "SELECT count(*) FROM collaboration_wait_edges"), sqlCount(t, db, "SELECT count(*) FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.state='waiting' AND r.status='waiting_children' AND r.task_admission_closed=0"))
				}
				waitCtx, cancel := context.WithTimeout(context.Background(), 7*time.Second)
				defer cancel()
				ticker := time.NewTicker(5 * time.Millisecond)
				defer ticker.Stop()
				for {
					var count int
					if err := db.QueryRowContext(waitCtx, "SELECT count(*) FROM execution_runs WHERE (run_id=? AND status='canceled' AND task_admission_closed=1) OR (run_id=? AND status IN('succeeded','failed','canceled'))", in.RunID, second.RunID).Scan(&count); err != nil {
						observe()
						t.Fatal(err)
					}
					if count == 2 {
						break
					}
					select {
					case <-waitCtx.Done():
						observe()
						t.Fatal("removed audience child/root did not reach their required terminal states")
					case <-ticker.C:
					}
				}
				observe()
				// The ordinary terminal barrier also fixes the session revision
				// before rejoining; a racing root finalize may legitimately win CAS.
				memoryGroupMembers(t, f, group.ID, []string{coordinator.ID, publisher.ID, sponsor.ID}, api.GroupHistoryScope{Kind: "none"})
				check("GROUP_MEMBER_GENERATION_CHANGED")
				if err := f.core.RequestStop(); err != nil {
					t.Fatal(err)
				}
				closeCtx, closeCancel := context.WithTimeout(context.Background(), 6*time.Second)
				defer closeCancel()
				if err := f.core.WaitClosed(closeCtx); err != nil {
					t.Fatal(err)
				}
				assertAliasResourcesReleased(t, f)
				if sqlCount(t, db, "SELECT count(*) FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.state='waiting' AND r.status='waiting_children' AND r.task_admission_closed=0") != 0 {
					t.Fatal("removed audience retained a schedulable parent")
				}
			} else {
				releaseOnce.Do(func() { close(release) })
				f.wait(in.RunID, "succeeded")
				f.wait(second.RunID, "succeeded")
			}
			if sqlCount(t, db, "SELECT count(*) FROM model_attempts") != 0 {
				t.Fatal("extractive public selection started a model attempt")
			}
		})
	}
}
