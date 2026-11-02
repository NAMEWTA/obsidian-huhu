package privatememory_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	executionstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func capacityDependencies(t *testing.T, db *sql.DB, kind, id string) []api.DerivedInput {
	t.Helper()
	rows, err := db.Query("SELECT ancestor_kind,ancestor_id,ancestor_revision,content_hash,namespace,work_thread_id FROM memory_dependencies WHERE owner_kind=? AND owner_id=? AND relation!='audit' ORDER BY ancestor_kind,ancestor_id", kind, id)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	refs := []api.DerivedInput{}
	for rows.Next() {
		var ref api.DerivedInput
		if err := rows.Scan(&ref.Kind, &ref.ID, &ref.Revision, &ref.Hash, &ref.Namespace, &ref.WorkThreadID); err != nil {
			t.Fatal(err)
		}
		refs = append(refs, ref)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	return refs
}

func capacityHistory(t *testing.T, c *bootstrap.Core, profileID, sessionID string) map[string]api.VisibleMessage {
	t.Helper()
	seen := map[string]api.VisibleMessage{}
	q := api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: profileID, Limit: 50}, SessionID: sessionID}
	for pages := 0; ; pages++ {
		page, err := c.API.Conversation.History(context.Background(), owner, q)
		if err != nil {
			t.Fatal("actual public history failed", err)
		}
		for _, message := range page.Items {
			if _, duplicate := seen[message.ID]; duplicate {
				t.Fatal("history repeated a message")
			}
			seen[message.ID] = message
		}
		if page.NextCursor == "" {
			return seen
		}
		if pages >= 8 || page.NextCursor == q.Cursor {
			t.Fatal("history cursor did not advance within this fixture")
		}
		q.Cursor = page.NextCursor
	}
}

func TestCompletedChatKeepsFullProvenanceWhenMaintenanceCannotFit(t *testing.T) {
	for _, withMemory := range []bool{false, true} {
		t.Run(fmt.Sprintf("memory=%t", withMemory), func(t *testing.T) {
			inputs := make(chan api.EngineInput, 1)
			var db *sql.DB
			var calls, dispatched, pinned atomic.Int32
			engine := memoryEngine(func(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
				if in.Memory != nil && in.Memory.Mode == "maintenance" {
					return api.EngineResult{}, errors.New("zero maintenance budget dispatched a model")
				}
				var pins int
				if err := db.QueryRowContext(ctx, "SELECT count(*) FROM config_snapshot_pins WHERE token=(SELECT pin_token FROM execution_runs WHERE run_id=?)", in.RunID).Scan(&pins); err != nil {
					return api.EngineResult{}, err
				}
				if pins != 1 {
					return api.EngineResult{}, errors.New("ordinary model had no actual configuration pin")
				}
				pinned.Add(1)
				attempt, err := in.Attempts.Reserve(ctx, api.AttemptRequest{LogicalCallID: "controlled-ordinary", InputEstimate: "1", OutputBound: "1"})
				if err != nil {
					return api.EngineResult{}, err
				}
				// Exercise the real budget writer without making a Provider request.
				if err = in.Attempts.Dispatch(ctx, attempt, func(context.Context) error { dispatched.Add(1); return nil }); err != nil {
					return api.EngineResult{}, err
				}
				if _, err = in.Attempts.Settle(ctx, attempt, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true}); err != nil {
					return api.EngineResult{}, err
				}
				calls.Add(1)
				inputs <- in
				return api.EngineResult{Status: "finished", Text: "ordinary response " + in.Intent}, nil
			})
			f := newMemoryFixture(t, engine, false)
			db = f.database()
			f.budget(api.BudgetPolicy{RootTokenLimit: "1000", ProfileTokenLimit: "10000", MaintenanceTokenLimit: "0"})
			agent := f.agent("configured history capacity", true)
			session := f.session(agent)
			var private api.MemoryItem
			if withMemory {
				private = f.add(namespaceFor(agent), api.MemoryScope{Kind: "profile"}, "current private ancestor")
			}
			var saturatedRun, saturatedOutput, saturatedJob string
			var saturatedRefs []api.DerivedInput
			for round := 1; round <= 70; round++ {
				receipt := f.start(session, fmt.Sprintf("ordinary turn %d", round))
				run := f.wait(receipt.RunID, "succeeded")
				in := receiveInput(t, inputs)
				if in.RunID != run.ID || in.ShortTerm == nil || run.Usage == nil || run.Usage.Knowledge != "known" || run.Usage.InputTokens != "1" || run.Usage.OutputTokens != "1" {
					t.Fatal("ordinary completion lost its actual input or settled accounting")
				}
				var raw, outputID, jobID, admission, commit, reason string
				if err := db.QueryRow("SELECT r.derived_json,m.message_id,j.job_id,j.admission,j.commit_state,j.reason FROM execution_runs r JOIN conversation_messages m ON m.run_id=r.run_id AND m.role='assistant' JOIN memory_completion_outbox o ON o.source_run_id=r.run_id JOIN memory_jobs j ON j.completion_id=o.completion_id WHERE r.run_id=?", run.ID).Scan(&raw, &outputID, &jobID, &admission, &commit, &reason); err != nil {
					t.Fatal("accepted output/outbox/job did not commit together", err)
				}
				var refs []api.DerivedInput
				if json.Unmarshal([]byte(raw), &refs) != nil || len(refs) > 128 || !reflect.DeepEqual(refs, in.Lineage.Derived) || !reflect.DeepEqual(refs, capacityDependencies(t, db, "message", outputID)) {
					t.Fatal("output truncated or changed the complete consumed provenance")
				}
				if !withMemory && (round == 64 && len(refs) != 127 || round == 65 && len(refs) != 128) {
					t.Fatal("original 151 boundary was not exercised", round, len(refs))
				}
				if len(refs) == 128 {
					if admission != "blocked" || commit != "discarded" || reason != "MEMORY_PROVENANCE_LIMIT" || !reflect.DeepEqual(refs, capacityDependencies(t, db, "job", jobID)) {
						t.Fatal("maintenance capacity refusal lost its consumed origins or safe result")
					}
					if sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE job_id=? AND (run_id IS NOT NULL OR task_config_id!='' OR input_json!='' OR input_digest!='')", jobID) != 0 {
						t.Fatal("rejected 129-reference candidate was represented as a bound input")
					}
					if saturatedRun == "" {
						saturatedRun, saturatedOutput, saturatedJob, saturatedRefs = run.ID, outputID, jobID, refs
					}
				}
				if round > 65 && in.ShortTerm.Usage.OmittedAuthorized == 0 {
					t.Fatal("next round did not account for whole optional items over provenance capacity")
				}
				for _, entry := range in.ShortTerm.Entries {
					if saturatedOutput != "" && entry.Ref.ID == saturatedOutput {
						t.Fatal("next round selected a 129-reference candidate by dropping an ancestor")
					}
				}
				if sqlCount(t, db, "SELECT count(*) FROM conversation_sessions WHERE session_id=? AND active_run_id IS NOT NULL", session.ID) != 0 || sqlCount(t, db, "SELECT count(*) FROM conversation_messages WHERE run_id=? AND role='assistant'", run.ID) != 1 {
					t.Fatal("successful chat retained an active run or duplicated its output")
				}
			}
			if saturatedRun == "" || len(saturatedRefs) != 128 || sqlCount(t, db, "SELECT count(*) FROM execution_runs") != 70 || sqlCount(t, db, "SELECT count(*) FROM memory_completion_outbox") != 70 {
				t.Fatal("fixture did not finish seventy actual ordinary runs")
			}
			if sqlCount(t, db, "SELECT count(*) FROM command_receipts WHERE method='runs.start'") != 70 {
				t.Fatal("ordinary run receipts were lost or duplicated")
			}
			history := capacityHistory(t, f.core, f.profile, session.ID)
			if message, ok := history[saturatedOutput]; !ok || message.Text == "" || len(history) != 140 {
				t.Fatal("complete legal output cannot be read through public history")
			}
			var rootRef api.DerivedInput
			if err := db.QueryRow("SELECT o.source_kind,o.source_id,o.source_revision,o.source_hash,o.source_namespace,o.source_work_thread_id FROM memory_completion_outbox o JOIN memory_jobs j ON j.completion_id=o.completion_id WHERE j.job_id=?", saturatedJob).Scan(&rootRef.Kind, &rootRef.ID, &rootRef.Revision, &rootRef.Hash, &rootRef.Namespace, &rootRef.WorkThreadID); err != nil || rootRef != (api.DerivedInput{Kind: "message", ID: saturatedOutput, Revision: "1", Hash: testHash(history[saturatedOutput].Text), Namespace: session.ID, WorkThreadID: session.ID}) {
				t.Fatal("rejected job lost the exact additional source identity", err)
			}
			object, err := f.core.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: namespaceFor(agent), Kind: "job", ID: saturatedJob})
			if err != nil || object.Job == nil || object.Job.Admission != "blocked" || object.Job.Commit != "discarded" || object.Job.Reason != "MEMORY_PROVENANCE_LIMIT" || object.Job.Run != nil {
				t.Fatal("capacity refusal is not observable through the real API", err)
			}
			a := openMemoryAdapters(t, f)
			checkFacts := func() error {
				return a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
					facts, err := a.memory.ReadFactsInTx(context.Background(), tx, owner, f.profile, []grantsstore.MemorySubject{{Kind: "message", ID: saturatedOutput}})
					if err != nil {
						return err
					}
					if len(facts.Dependencies) != 1 || !reflect.DeepEqual(facts.Dependencies[0].Derived, saturatedRefs) {
						return errors.New("ReadFacts lost the legal 128-reference output closure")
					}
					_, err = a.memory.ReadAdmissionInTx(context.Background(), tx, owner, saturatedJob)
					if !memoryReason(err, "MEMORY_JOB_CHANGED") {
						return errors.New("terminal refused job became admissible")
					}
					cursor := executionstore.MemoryScanCursor{}
					for {
						page, err := a.memory.AdmissionPageInTx(context.Background(), tx, cursor)
						if err != nil {
							return err
						}
						for _, id := range page.JobIDs {
							if id == saturatedJob {
								return errors.New("terminal refused job returned to the scheduler")
							}
						}
						if page.Next == (executionstore.MemoryScanCursor{}) {
							return nil
						}
						cursor = page.Next
					}
				})
			}
			if err := checkFacts(); err != nil {
				t.Fatal(err)
			}
			if withMemory {
				if _, err := f.core.API.Memory.Forget(context.Background(), owner, api.MemoryForget{CommandMeta: f.next(private.Revision), Namespace: private.Namespace, ID: private.ID}); err != nil {
					t.Fatal(err)
				}
				if err := checkFacts(); !memoryReason(err, "MEMORY_FORGOTTEN") {
					t.Fatal("complete saturated output stopped propagating current forget", err)
				}
				if _, present := capacityHistory(t, f.core, f.profile, session.ID)[saturatedOutput]; present {
					t.Fatal("public history retained an output from a forgotten ancestor")
				}
				next := f.start(session, "independent next turn after forget")
				f.wait(next.RunID, "succeeded")
				in := receiveInput(t, inputs)
				for _, ref := range in.Lineage.Derived {
					if ref.Kind == "memory_revision" && ref.ID == private.RevisionID {
						t.Fatal("next round restored the forgotten ancestor")
					}
				}
			}
			if pinned.Load() != calls.Load() || dispatched.Load() != calls.Load() || sqlCount(t, db, "SELECT count(*) FROM model_attempts WHERE state='settled' AND knowledge='known' AND charged_tokens=2 AND producer_ended=1") != int(calls.Load()) || sqlCount(t, db, "SELECT count(*) FROM model_attempts WHERE purpose='maintenance'") != 0 || sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE run_id IS NOT NULL") != 0 {
				t.Fatal("ordinary settled costs or zero maintenance dispatch changed")
			}
			if sqlCount(t, db, "SELECT count(*) FROM memory_candidates") != 0 || sqlCount(t, db, "SELECT count(*) FROM memory_revisions WHERE creator_kind='agent'") != 0 || sqlCount(t, db, "SELECT count(*) FROM model_budget_accounts WHERE reserved_tokens<>0") != 0 {
				t.Fatal("unadmitted maintenance produced a private write or retained a reservation")
			}
			for _, query := range []string{"SELECT count(*) FROM config_snapshot_pins", "SELECT count(*) FROM task_config_pins", "SELECT count(*) FROM execution_runs WHERE child_slot<>0"} {
				if sqlCount(t, db, query) != 0 {
					t.Fatal("accepted ordinary work retained a real pin or slot", query)
				}
			}
			if err := f.core.RequestStop(); err != nil {
				t.Fatal(err)
			}
			stop, cancel := context.WithTimeout(context.Background(), 6*time.Second)
			defer cancel()
			if err := f.core.WaitClosed(stop); err != nil {
				t.Fatal(err)
			}
			if !withMemory {
				// Unknown SQL still escapes this hook and rolls back the whole UoW.
				// The actual accepted source is reused; deletions and trigger are
				// temporary mutations within the failing transaction, never fixtures
				// presented as a new successful output.
				err := a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
					for _, query := range []string{"DELETE FROM memory_dependencies WHERE owner_kind='job' AND owner_id=?", "DELETE FROM memory_jobs WHERE job_id=?"} {
						if _, err := tx.Exec(query, saturatedJob); err != nil {
							return err
						}
					}
					if _, err := tx.Exec("DELETE FROM memory_completion_outbox WHERE source_run_id=?", saturatedRun); err != nil {
						return err
					}
					if _, err := tx.Exec("CREATE TRIGGER capacity_job_sql_fault BEFORE INSERT ON memory_jobs BEGIN SELECT RAISE(ABORT,'controlled capacity job SQL failure'); END"); err != nil {
						return err
					}
					return a.memory.RecordCompletionInTx(context.Background(), tx, executionstore.MemoryCompletion{RunID: saturatedRun, MessageID: saturatedOutput})
				})
				if err == nil || !strings.Contains(err.Error(), "controlled capacity job SQL failure") || sqlCount(t, db, "SELECT count(*) FROM memory_completion_outbox") != 70 || sqlCount(t, db, "SELECT count(*) FROM memory_jobs WHERE job_id=?", saturatedJob) != 1 {
					t.Fatal("unknown SQL was swallowed or left a partial completion", err)
				}
				err = a.base.WithinTx(context.Background(), func(tx *sql.Tx) error {
					if _, err := tx.Exec("UPDATE execution_runs SET derived_json='not-json' WHERE run_id=?", saturatedRun); err != nil {
						return err
					}
					return a.memory.RecordCompletionInTx(context.Background(), tx, executionstore.MemoryCompletion{RunID: saturatedRun, MessageID: saturatedOutput})
				})
				if !memoryReason(err, "MEMORY_STATE_INVALID") || !reflect.DeepEqual(capacityDependencies(t, db, "message", saturatedOutput), saturatedRefs) {
					t.Fatal("invalid source state was treated as a safe capacity refusal", err)
				}
			}
			reopened, err := bootstrap.OpenWithOptions(context.Background(), f.root, f.directory, bootstrap.Options{Engine: engine, ExecutorPaused: true})
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := reopened.Close(); err != nil {
					t.Error(err)
				}
			})
			object, err = reopened.API.Memory.Get(context.Background(), owner, api.MemoryGet{ProfileID: f.profile, Namespace: namespaceFor(agent), Kind: "job", ID: saturatedJob})
			if err != nil || object.Job == nil || object.Job.Commit != "discarded" || object.Job.Run != nil || object.Job.Reason != "MEMORY_PROVENANCE_LIMIT" {
				t.Fatal("reopen changed the terminal no-Run refusal", err)
			}
			t.Logf("ordinary calls=%d; full output ancestors=128; maintenance dispatch=0; no bound rejected job; actual pins released", calls.Load())
		})
	}
}
