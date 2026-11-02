package collaborationpolicy_test

import (
	"context"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestPublicBudgetChangeAfterReserveFencesActualDispatchAndPreservesSettlement(t *testing.T) {
	for _, change := range []string{"lower", "pause", "inflight"} {
		t.Run(change, func(t *testing.T) {
			reserved := make(chan struct{})
			release := make(chan struct{})
			result := make(chan error, 1)
			var callbacks atomic.Int32
			eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
				check := func() error {
					r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "main", InputEstimate: "10", OutputBound: "70"})
					if e != nil {
						return e
					}
					if change == "inflight" {
						if e = i.Attempts.Dispatch(c, r, func(context.Context) error {
							callbacks.Add(1)
							close(reserved)
							select {
							case <-release:
								return nil
							case <-c.Done():
								return c.Err()
							}
						}); e != nil {
							return e
						}
						if _, e = i.Attempts.Settle(context.Background(), r, api.AttemptObservation{Knowledge: "unknown", ProducerEnded: true}); e != nil {
							return e
						}
					} else {
						close(reserved)
						select {
						case <-release:
						case <-c.Done():
							return c.Err()
						}
						e = i.Attempts.Dispatch(c, r, func(context.Context) error { callbacks.Add(1); return nil })
						expected := "MODEL_BUDGET_EXHAUSTED"
						if change == "pause" {
							expected = "BUDGET_PAUSED"
						}
						if !isReason(e, expected) {
							return fmt.Errorf("post-reserve policy fence: %v", e)
						}
						if e = i.Attempts.AbortUnsent(context.Background(), r); e != nil {
							return e
						}
						if e = i.Attempts.AbortUnsent(context.Background(), r); e != nil {
							return e
						}
					}
					return nil
				}()
				result <- check
				if check != nil {
					return api.EngineResult{}, check
				}
				return api.EngineResult{Status: "finished", Text: "done"}, nil
			})
			c, _, _ := open(t, eng)
			a := agent(t, c)
			configure(t, c, api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "100", MaintenanceTokenLimit: "0"})
			r := run(t, c, a, change)
			select {
			case <-reserved:
			case <-time.After(5 * time.Second):
				t.Fatal("not reserved")
			}
			configure(t, c, api.BudgetPolicy{RootTokenLimit: "1", ProfileTokenLimit: "1", MaintenanceTokenLimit: "0", Paused: change != "lower"})
			close(release)
			select {
			case e := <-result:
				if e != nil {
					t.Fatal(e)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("dispatch did not return")
			}
			wait(t, c, r.RunID, "succeeded")
			expectedCallbacks := int32(0)
			expectedCharge := "0"
			if change == "inflight" {
				expectedCallbacks = 1
				expectedCharge = "80"
			}
			if callbacks.Load() != expectedCallbacks {
				t.Fatalf("actual callback=%d", callbacks.Load())
			}
			b, e := c.API.Collaboration.Budget(ctx, owner, api.BudgetQuery{ProfileID: meta(t, c, "q", "").ProfileID, RunID: r.RunID})
			if e != nil || b.ReservedTokens != "0" || b.ChargedTokens != expectedCharge {
				t.Fatalf("reservation/refund/unknown %#v %v", b, e)
			}
		})
	}
}

func TestTwoRootsCompeteForFinalProfileAllowanceAtActualDispatch(t *testing.T) {
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	results := make(chan error, 2)
	var callbacks atomic.Int32
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		entered <- struct{}{}
		select {
		case <-release:
		case <-c.Done():
			return api.EngineResult{}, c.Err()
		}
		r, e := i.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "request", Purpose: "main", InputEstimate: "10", OutputBound: "70"})
		if isReason(e, "MODEL_BUDGET_EXHAUSTED") {
			results <- nil
			return api.EngineResult{Status: "finished", Text: "explicit budget denial"}, nil
		}
		if e == nil {
			e = i.Attempts.Dispatch(c, r, func(context.Context) error { callbacks.Add(1); return nil })
		}
		if e == nil {
			_, e = i.Attempts.Settle(c, r, api.AttemptObservation{Knowledge: "known", InputTokens: "10", OutputTokens: "70", ProducerEnded: true})
		}
		results <- e
		return api.EngineResult{Status: "finished", Text: "done"}, e
	})
	c, _, _ := open(t, eng)
	a := agent(t, c)
	configure(t, c, api.BudgetPolicy{RootTokenLimit: "100", ProfileTokenLimit: "100", MaintenanceTokenLimit: "0"})
	roots := []api.RunReceipt{run(t, c, a, "root-1"), run(t, c, a, "root-2")}
	for range roots {
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("root not independently scheduled")
		}
	}
	close(release)
	for _, r := range roots {
		select {
		case e := <-results:
			if e != nil {
				t.Fatal(e)
			}
		case <-time.After(5 * time.Second):
			t.Fatal("quota competition hung")
		}
		wait(t, c, r.RunID, "succeeded")
	}
	if callbacks.Load() != 1 {
		t.Fatalf("last Profile allowance dispatched %d", callbacks.Load())
	}
}
