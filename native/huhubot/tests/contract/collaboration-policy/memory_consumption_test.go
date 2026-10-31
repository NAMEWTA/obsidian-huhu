package collaborationpolicy_test

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func memoryPage(t *testing.T, c *bootstrap.Core, ns api.MemoryNamespace) api.MemoryPage {
	t.Helper()
	page, e := c.API.Memory.List(ctx, owner, api.MemoryQuery{ProfileID: meta(t, c, "memory-page", "").ProfileID, Namespace: ns, Kind: "item"})
	if e != nil {
		t.Fatal(e)
	}
	return page
}

func memoryAgent(t *testing.T, c *bootstrap.Core, endpoint string) api.Agent {
	t.Helper()
	profileID := meta(t, c, "memory-agent-profile", "").ProfileID
	ref := "credential:88888888888888888888888888888888"
	if _, e := c.Credentials.Register(ctx, profileID, ref, "session-memory", []byte("CONTROLLED_MEMORY_POLICY_KEY")); e != nil {
		t.Fatal(e)
	}
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("memory-agent:"), ""), Draft: api.AgentDraft{Name: "Memory policy", Persona: "controlled", Model: &api.ModelBindingDraft{ModelID: "controlled", ProviderID: "loopback", Protocol: "openai-chat-completions", Endpoint: endpoint, CredentialRef: ref}}})
	if e != nil {
		t.Fatal(e)
	}
	return a
}

func TestActualRecalledMemoryForgetFencesSourceFreeRunAndDispatch(t *testing.T) {
	reserved := make(chan struct{})
	release := make(chan struct{})
	result := make(chan error, 1)
	var once sync.Once
	var callbacks atomic.Int32
	engine := engineFunc(func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		check := func() error {
			if in.Memory == nil || in.Memory.Mode != "recall" || len(in.Memory.Entries) != 1 || in.Memory.Entries[0].Text != "PRIVATE_RECALLED_BODY" {
				return fmt.Errorf("actual recall missing: %#v", in.Memory)
			}
			r, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "after-recall", InputEstimate: "1", OutputBound: "6"})
			if e != nil {
				return e
			}
			close(reserved)
			select {
			case <-release:
			case <-c.Done():
				return c.Err()
			}
			e = in.Attempts.Dispatch(c, r, func(context.Context) error { callbacks.Add(1); return nil })
			if !isReason(e, "MEMORY_FORGOTTEN") {
				return fmt.Errorf("forgotten recall reached Dispatch: %v", e)
			}
			if e = in.Attempts.AbortUnsent(context.Background(), r); e != nil {
				return e
			}
			return in.Attempts.AbortUnsent(context.Background(), r)
		}()
		result <- check
		return api.EngineResult{Status: "failed", Reason: "MEMORY_FORGOTTEN"}, check
	})
	core, _, _ := open(t, engine)
	t.Cleanup(func() { once.Do(func() { close(release) }) })
	a := memoryAgent(t, core, "http://127.0.0.1:1")
	ns := api.MemoryNamespace{Kind: "agent", ID: a.ID}
	configure(t, core, api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "100", MaintenanceTokenLimit: "0"})
	page := memoryPage(t, core, ns)
	item, e := core.API.Memory.Correct(ctx, owner, api.MemoryCorrect{CommandMeta: meta(t, core, "recall-add", page.NamespaceRevision), Namespace: ns, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: "PRIVATE_RECALLED_BODY"})
	if e != nil {
		t.Fatal(e)
	}
	receipt := run(t, core, a, "INDEPENDENT_USER_TEXT")
	select {
	case <-reserved:
	case e := <-result:
		t.Fatal("Engine did not reserve", e)
	case <-time.After(8 * time.Second):
		t.Fatal("actual recall/Reserve did not arrive")
	}
	contextView, e := core.API.Memory.Get(ctx, owner, api.MemoryGet{ProfileID: meta(t, core, "context", "").ProfileID, Namespace: ns, Kind: "context", ID: receipt.RunID})
	if e != nil || contextView.Context == nil {
		t.Fatal("actual context view", contextView, e)
	}
	var recalledEntry, intentEntry string
	for _, entry := range contextView.Context.Entries {
		if entry.Kind == "memory_recall" {
			recalledEntry = entry.ID
		}
		if entry.Kind == "intent" {
			intentEntry = entry.ID
		}
	}
	if recalledEntry == "" || intentEntry == "" {
		t.Fatal("actual sealed entries missing", contextView)
	}
	subjects := []api.DeliverySubject{{Kind: "run", ID: receipt.RunID}, {Kind: "memory_revision", ID: item.RevisionID}, {Kind: "context_entry", ID: recalledEntry}}
	delivered := false
	if e = core.API.Events.WithDelivery(ctx, owner, subjects, func(context.Context) error { delivered = true; return nil }); e != nil || !delivered {
		t.Fatal("valid source-free Memory fence", e)
	}
	if _, e = core.API.Memory.Forget(ctx, owner, api.MemoryForget{CommandMeta: meta(t, core, "recall-forget", item.Revision), Namespace: ns, ID: item.ID}); e != nil {
		t.Fatal(e)
	}
	for _, subject := range subjects {
		delivered = false
		e = core.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{subject}, func(context.Context) error { delivered = true; return nil })
		if !isReason(e, "MEMORY_FORGOTTEN") || delivered {
			t.Fatal("source-free old body passed physical fence", subject, e, delivered)
		}
	}
	delivered = false
	if e = core.API.Events.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "context_entry", ID: intentEntry}}, func(context.Context) error { delivered = true; return nil }); e != nil || !delivered {
		t.Fatal("independent intent inherited whole Run dependency", e)
	}
	once.Do(func() { close(release) })
	select {
	case e := <-result:
		if e != nil {
			t.Fatal(e)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Dispatch did not end")
	}
	r := wait(t, core, receipt.RunID, "failed")
	if r.Reason != "MEMORY_FORGOTTEN" || callbacks.Load() != 0 {
		t.Fatal("revoked body was accepted", r, callbacks.Load())
	}
	history, e := core.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: meta(t, core, "history", "").ProfileID}, SessionID: r.SessionID})
	if e != nil || len(history.Items) != 1 || history.Items[0].Role != "user" || history.Items[0].Text != "INDEPENDENT_USER_TEXT" {
		t.Fatal("independent user text inherited model Memory", history, e)
	}
}

// All jobs, independent Runs and pins below are created by the public completion
// consumer. SQL only observes account/attempt identities; it creates no job.
func TestActualMaintenanceAttemptsKeepSummaryRetryInTrustedFamily(t *testing.T) {
	for _, mode := range []string{"family", "pause-before-dispatch", "auto-before-dispatch", "settings-before-dispatch", "unknown-after-auto-off"} {
		t.Run(mode, func(t *testing.T) {
			entered := make(chan api.EngineInput, 1)
			release := make(chan struct{})
			result := make(chan error, 1)
			var once sync.Once
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				io.Copy(io.Discard, r.Body)
				r.Body.Close()
				w.WriteHeader(http.StatusOK)
			}))
			defer server.Close()
			engine := engineFunc(func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
				if in.Memory == nil || in.Memory.Mode != "maintenance" {
					return api.EngineResult{Status: "finished", Text: "ACTUAL_COMPLETION_FOR_MAINTENANCE"}, nil
				}
				check := func() error {
					if _, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "fake-main", Purpose: "main", InputEstimate: "1", OutputBound: "6"}); !isReason(e, "ATTEMPT_PURPOSE_MISMATCH") {
						return fmt.Errorf("maintenance borrowed root purpose: %v", e)
					}
					if _, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "fake-account", AccountID: "root:" + in.RunID, InputEstimate: "1", OutputBound: "6"}); !isReason(e, "BUDGET_ACCOUNT_MISMATCH") {
						return fmt.Errorf("maintenance borrowed root account: %v", e)
					}
					first, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "summary", Purpose: "summary", InputEstimate: "1", OutputBound: "6"})
					if e != nil {
						return e
					}
					dispatch := func(res api.AttemptReservation) error {
						return in.Attempts.Dispatch(c, res, func(call context.Context) error {
							if mode == "unknown-after-auto-off" {
								entered <- in
								select {
								case <-release:
								case <-call.Done():
									return call.Err()
								}
							}
							req, e := http.NewRequestWithContext(call, http.MethodPost, server.URL, nil)
							if e != nil {
								return e
							}
							response, e := http.DefaultClient.Do(req)
							if e != nil {
								return e
							}
							_, e = io.Copy(io.Discard, response.Body)
							response.Body.Close()
							return e
						})
					}
					if mode == "pause-before-dispatch" || mode == "auto-before-dispatch" || mode == "settings-before-dispatch" {
						entered <- in
						select {
						case <-release:
						case <-c.Done():
							return c.Err()
						}
						e = dispatch(first)
						want := "BUDGET_PAUSED"
						if mode == "auto-before-dispatch" {
							want = "MEMORY_AUTO_DISABLED"
						}
						if mode == "settings-before-dispatch" {
							want = "MEMORY_JOB_CHANGED"
						}
						if !isReason(e, want) {
							return fmt.Errorf("current maintenance gate wanted %s: %v", want, e)
						}
						if e = in.Attempts.AbortUnsent(context.Background(), first); e != nil {
							return e
						}
						return in.Attempts.AbortUnsent(context.Background(), first)
					}
					if mode == "family" {
						entered <- in
					}
					if e = dispatch(first); e != nil {
						return e
					}
					if _, e = in.Attempts.Settle(context.Background(), first, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
						return e
					}
					if mode == "family" {
						second, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "retry", Purpose: "retry", RetryOfAttemptID: first.ID, InputEstimate: "1", OutputBound: "6"})
						if e != nil {
							return e
						}
						if e = dispatch(second); e != nil {
							return e
						}
						_, e = in.Attempts.Settle(context.Background(), second, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true})
						return e
					}
					return nil
				}()
				result <- check
				return api.EngineResult{Status: "failed", Reason: "CONTROLLED_MAINTENANCE_END"}, check
			})
			core, _, locator := open(t, engine)
			t.Cleanup(func() { once.Do(func() { close(release) }) })
			a := memoryAgent(t, core, server.URL)
			ns := api.MemoryNamespace{Kind: "agent", ID: a.ID}
			policy := api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "100", MaintenanceTokenLimit: "40"}
			configure(t, core, policy)
			source := run(t, core, a, "source completion")
			wait(t, core, source.RunID, "succeeded")
			var maintenance api.EngineInput
			select {
			case maintenance = <-entered:
			case e := <-result:
				t.Fatal("maintenance failed before bound reservation", e)
			case <-time.After(10 * time.Second):
				t.Fatal("actual independent maintenance Run did not enter")
			}
			if maintenance.RunID == source.RunID || maintenance.Lineage.ParentRunID != "" || maintenance.Config.ID == "" || maintenance.Memory.JobID == "" {
				t.Fatal("maintenance was not a real independent bound Run", maintenance)
			}
			if mode == "pause-before-dispatch" {
				policy.Paused = true
				configure(t, core, policy)
			}
			if mode == "auto-before-dispatch" || mode == "settings-before-dispatch" || mode == "unknown-after-auto-off" {
				settings := memoryPage(t, core, ns).Settings
				if settings == nil {
					t.Fatal("settings missing")
				}
				if _, e := core.API.Memory.SetAutoMaintenance(ctx, owner, api.MemorySetAuto{CommandMeta: meta(t, core, "maintenance-auto-off", settings.Revision), Namespace: ns, Enabled: mode == "settings-before-dispatch"}); e != nil {
					t.Fatal(e)
				}
			}
			once.Do(func() { close(release) })
			select {
			case e := <-result:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("maintenance attempt did not settle/abort")
			}
			wait(t, core, maintenance.RunID, "failed")
			db, e := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(locator, "profile.sqlite3")})
			if e != nil {
				t.Fatal(e)
			}
			defer db.Close()
			expectedRequests := 1
			expectedCharge := int64(7)
			if mode == "family" {
				expectedRequests = 2
				expectedCharge = 14
			}
			if mode == "pause-before-dispatch" || mode == "auto-before-dispatch" || mode == "settings-before-dispatch" {
				expectedRequests = 0
				expectedCharge = 0
			}
			if requests.Load() != int32(expectedRequests) {
				t.Fatal("actual HTTP request count", requests.Load(), expectedRequests)
			}
			if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
				var charged, reserved int64
				var account string
				if e := tx.QueryRowContext(ctx, "SELECT account_id,charged_tokens,reserved_tokens FROM model_budget_accounts WHERE account_id=?", "maintenance:"+meta(t, core, "profile", "").ProfileID).Scan(&account, &charged, &reserved); e != nil {
					return e
				}
				if charged != expectedCharge || reserved != 0 {
					return fmt.Errorf("maintenance charge/refund changed: %d/%d", charged, reserved)
				}
				var wrong int
				if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM model_attempts WHERE run_id=? AND account_id<>?", maintenance.RunID, account).Scan(&wrong); e != nil {
					return e
				}
				if wrong != 0 {
					return fmt.Errorf("summary/retry left maintenance family")
				}
				return nil
			}); e != nil {
				t.Fatal(e)
			}
		})
	}
}

func TestMaintenanceRetryCannotBorrowSettledAttemptFromAnotherJob(t *testing.T) {
	type outcome struct {
		runID, attemptID string
		err              error
	}
	finished := make(chan outcome, 2)
	firstAttempt := make(chan string, 1)
	var jobs, requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		_, _ = io.Copy(io.Discard, r.Body)
		_ = r.Body.Close()
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	engine := engineFunc(func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		if in.Memory == nil || in.Memory.Mode != "maintenance" {
			return api.EngineResult{Status: "finished", Text: "ACTUAL_SOURCE_COMPLETION"}, nil
		}
		n := jobs.Add(1)
		attemptID, check := func() (string, error) {
			if n == 2 {
				prior := <-firstAttempt
				if _, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "cross-job-retry", Purpose: "retry", RetryOfAttemptID: prior, InputEstimate: "1", OutputBound: "6"}); !isReason(e, "INVALID_RETRY_ATTEMPT") {
					return "", fmt.Errorf("another maintenance Run supplied a valid retry: %v", e)
				}
			}
			r, e := in.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "own-job-summary", Purpose: "summary", InputEstimate: "1", OutputBound: "6"})
			if e != nil {
				return "", e
			}
			e = in.Attempts.Dispatch(c, r, func(call context.Context) error {
				req, e := http.NewRequestWithContext(call, http.MethodPost, server.URL, nil)
				if e != nil {
					return e
				}
				response, e := server.Client().Do(req)
				if e != nil {
					return e
				}
				_, e = io.Copy(io.Discard, response.Body)
				closeErr := response.Body.Close()
				if e != nil {
					return e
				}
				return closeErr
			})
			if e != nil {
				return "", e
			}
			if _, e = in.Attempts.Settle(context.Background(), r, api.AttemptObservation{Knowledge: "known", InputTokens: "1", OutputTokens: "1", ProducerEnded: true}); e != nil {
				return "", e
			}
			return r.ID, nil
		}()
		if n == 1 && check == nil {
			firstAttempt <- attemptID
		}
		finished <- outcome{runID: in.RunID, attemptID: attemptID, err: check}
		return api.EngineResult{Status: "failed", Reason: "CONTROLLED_MAINTENANCE_END"}, check
	})
	core, _, locator := open(t, engine)
	a := memoryAgent(t, core, server.URL)
	configure(t, core, api.BudgetPolicy{RootTokenLimit: "0", ProfileTokenLimit: "40", MaintenanceTokenLimit: "40"})
	maintenanceRuns := []string{}
	for i := range 2 {
		source := run(t, core, a, fmt.Sprintf("independent source completion %d", i))
		wait(t, core, source.RunID, "succeeded")
		select {
		case result := <-finished:
			if result.err != nil || result.attemptID == "" || result.runID == source.RunID {
				t.Fatal("maintenance attempt failed or reused its source Run", result)
			}
			maintenanceRuns = append(maintenanceRuns, result.runID)
			wait(t, core, result.runID, "failed")
		case <-time.After(10 * time.Second):
			t.Fatal("bound maintenance job did not execute")
		}
	}
	if maintenanceRuns[0] == maintenanceRuns[1] || requests.Load() != 2 || jobs.Load() != 2 {
		t.Fatal("maintenance jobs or HTTP effects were not independent", maintenanceRuns, requests.Load(), jobs.Load())
	}
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(locator, "profile.sqlite3")})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		var attempts, borrowed, charged, reserved int
		profileID := meta(t, core, "profile", "").ProfileID
		if e := tx.QueryRowContext(ctx, "SELECT count(*),COALESCE(sum(CASE WHEN account_id<>? OR retry_of_attempt_id<>'' THEN 1 ELSE 0 END),0) FROM model_attempts WHERE run_id IN (?,?)", "maintenance:"+profileID, maintenanceRuns[0], maintenanceRuns[1]).Scan(&attempts, &borrowed); e != nil {
			return e
		}
		if e := tx.QueryRowContext(ctx, "SELECT charged_tokens,reserved_tokens FROM model_budget_accounts WHERE account_id=?", "maintenance:"+profileID).Scan(&charged, &reserved); e != nil {
			return e
		}
		if attempts != 2 || borrowed != 0 || charged != 4 || reserved != 0 {
			return fmt.Errorf("cross-job retry affected ledger: attempts=%d borrowed=%d charged=%d reserved=%d", attempts, borrowed, charged, reserved)
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
}
