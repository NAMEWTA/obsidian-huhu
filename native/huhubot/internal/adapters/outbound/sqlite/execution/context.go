package execution

import (
	"context"
	"database/sql"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	executorapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/executor"
	"github.com/ncruces/go-sqlite3"
	"reflect"
)

// InitialContextPlan is adapter-only trusted state. Plan is read-only; Seal must
// recheck the same chosen facts after external Host authorization. It may not
// introduce a new source. The outer unique MarkRunning transaction owns commit.
type InitialContextPlan struct {
	ShortTerm *api.ShortTermInput
	Memory    *api.ExecutionMemoryInput
	Access    api.RunAccessInput
	Derived   []api.DerivedInput
	Watermark string
}
type InitialContextHooks interface {
	PlanInTx(context.Context, *sql.Tx, api.ToolExecution) (InitialContextPlan, error)
	SealInTx(context.Context, *sql.Tx, api.ToolExecution, InitialContextPlan) (InitialContextPlan, error)
	ReadContextInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (*api.ShortTermInput, error)
}

type ContextUsageReader interface {
	ContextUsageInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string) (*api.ContextUsage, error)
}

// InitialContextRuntime belongs to the original Store. Core injects its existing ContextAccess once. The Store uses
// only AuthorizeAdmission after Tx A has CLOSED and before beginning Tx B;
// Host/network calls are forbidden inside Plan/Seal. PrepareAndMarkRunning
// stays the sole production preparation/commit mechanism.
type InitialContextRuntime interface {
	SetContextAccess(api.ContextAccess)
	PrepareAndMarkRunning(context.Context, executorapp.Work) (executorapp.Work, error)
}

func (s *Store) SetContextAccess(a api.ContextAccess) { s.contextAccess = a }

func contextExecution(w executorapp.Work) api.ToolExecution {
	return api.ToolExecution{Identity: w.Identity, Run: w.Run, ClaimToken: w.ClaimToken, Access: w.Access, Config: w.Input.Config, Agent: w.Input.Agent, Lineage: w.Input.Lineage}
}

func (s *Store) currentContextWorkInTx(ctx context.Context, tx *sql.Tx, w executorapp.Work) (executorapp.Work, error) {
	if s.stopping.Load() {
		return w, api.Denied("SERVICE_STOPPING")
	}
	r, access, principal, _, e := readRun(ctx, tx, w.Run.ID)
	if e != nil {
		return w, e
	}
	var token string
	if e = tx.QueryRowContext(ctx, "SELECT claim_token FROM execution_runs WHERE run_id=?", r.ID).Scan(&token); e != nil {
		return w, e
	}
	if r.Status != "preparing" || token != w.ClaimToken || principal != w.Identity.PrincipalID() {
		return w, api.Invalid("RUN_CLAIM_CHANGED")
	}
	if s.recovery != nil {
		if e = s.recovery.CheckInTx(ctx, tx, r.ID); e != nil {
			return w, e
		}
	}
	w.Run, w.Access = r, access
	w.Input.Lineage.Group = access.Group
	return w, nil
}

// The two transactions never hold the Profile connection while asking the
// current Host/lease gate. A changed plan or a rolled-back stale WAL snapshot
// must start again from the persisted Run and a new Host decision.
func (s *Store) PrepareAndMarkRunning(ctx context.Context, w executorapp.Work) (executorapp.Work, error) {
	if w.ContextPolicy == "" && !w.Maintenance {
		return w, s.MarkRunning(ctx, w)
	}
	if s.memory == nil {
		return w, api.Invalid("MEMORY_NOT_ASSEMBLED")
	}
	original := w
	busySnapshot := false
	for attempt := 0; attempt < 2; attempt++ {
		planned := original
		var plan InitialContextPlan
		e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
			var e error
			planned, e = s.currentContextWorkInTx(ctx, tx, planned)
			if e != nil {
				return e
			}
			if planned.Maintenance || planned.Continuation != nil {
				plan.Access, plan.Derived = planned.Access, planned.Input.Lineage.Derived
				plan.Memory, e = s.memory.ReadInputInTx(ctx, tx, planned.Identity, planned.Run.ID)
				if e != nil {
					return e
				}
				if !planned.Maintenance {
					plan.ShortTerm, e = s.memory.ReadContextInTx(ctx, tx, planned.Identity, planned.Run.ID)
				}
				return e
			}
			plan, e = s.memory.PlanInTx(ctx, tx, contextExecution(planned))
			return e
		})
		if e != nil {
			return original, e
		}
		if !planned.Maintenance && plan.ShortTerm == nil {
			return original, api.Invalid("CONTEXT_INPUT_STATE_INVALID")
		}
		if planned.Maintenance && (plan.Memory == nil || plan.Memory.Mode != "maintenance" || plan.ShortTerm != nil) {
			return original, api.Invalid("MEMORY_INPUT_STATE_INVALID")
		}
		if s.contextAccess == nil {
			return original, api.Denied("ACCESS_NOT_ASSEMBLED")
		}
		if e = s.contextAccess.AuthorizeAdmission(ctx, planned.Identity, plan.Access); e != nil {
			return original, e
		}
		committed := planned
		sealWorkFailed := false
		e = s.Base.WithinTx(ctx, func(tx *sql.Tx) (callbackErr error) {
			defer func() { sealWorkFailed = callbackErr != nil }()
			fresh, err := s.currentContextWorkInTx(ctx, tx, planned)
			if err != nil {
				return err
			}
			sealed := plan
			if !planned.Maintenance && planned.Continuation == nil {
				sealed, err = s.memory.SealInTx(ctx, tx, contextExecution(fresh), plan)
				if err != nil {
					return err
				}
				if !reflect.DeepEqual(sealed.Access, plan.Access) || !reflect.DeepEqual(sealed.Derived, plan.Derived) {
					return api.Invalid("CONTEXT_PLAN_CHANGED")
				}
			} else {
				actual, err := s.memory.ReadInputInTx(ctx, tx, planned.Identity, planned.Run.ID)
				if err != nil {
					return err
				}
				var st *api.ShortTermInput
				if !planned.Maintenance {
					st, err = s.memory.ReadContextInTx(ctx, tx, planned.Identity, planned.Run.ID)
					if err != nil {
						return err
					}
				}
				if !reflect.DeepEqual(actual, plan.Memory) || !reflect.DeepEqual(st, plan.ShortTerm) || !reflect.DeepEqual(fresh.Access, plan.Access) {
					return &api.Fault{Kind: "CONFLICT", Reason: "CONTEXT_PLAN_CHANGED"}
				}
			}
			if !planned.Maintenance && sealed.ShortTerm == nil {
				return api.Invalid("CONTEXT_INPUT_STATE_INVALID")
			}
			if sealed.ShortTerm != nil {
				if _, err = api.CanonicalShortTermBinding(*sealed.ShortTerm); err != nil {
					return err
				}
			}
			if sealed.Memory != nil {
				if _, err = api.CanonicalMemoryInputBinding(*sealed.Memory); err != nil {
					return err
				}
			}
			fresh.Access = sealed.Access
			fresh.Input.Lineage.Derived = sealed.Derived
			fresh.Input.Lineage.Group = sealed.Access.Group
			fresh.Input.Memory, fresh.Input.ShortTerm = sealed.Memory, sealed.ShortTerm
			fresh.Input.History = nil
			fresh.Input.Messages = nil
			if err = s.markRunningInTx(ctx, tx, fresh); err != nil {
				return err
			}
			if fresh.Input.ShortTerm != nil {
				usage := fresh.Input.ShortTerm.Usage
				fresh.Run.ContextUsage = &usage
			}
			committed = fresh
			return nil
		})
		if e == nil {
			return committed, nil
		}
		if ctx.Err() != nil {
			return original, ctx.Err()
		}
		// Only a callback failure proves that WithinTx rolled back. A commit
		// failure does not prove whether the write became durable.
		if sealWorkFailed && snapshotBusyOnly(e) {
			if s.stopping.Load() {
				return original, api.Denied("SERVICE_STOPPING")
			}
			busySnapshot = true
			continue
		}
		var fault *api.Fault
		if !errors.As(e, &fault) || fault.Reason != "CONTEXT_PLAN_CHANGED" {
			return original, e
		}
		if s.stopping.Load() {
			return original, api.Denied("SERVICE_STOPPING")
		}
		busySnapshot = false
	}
	if busySnapshot {
		return original, &api.Fault{Kind: "CONFLICT", Reason: "CONTEXT_SNAPSHOT_BUSY"}
	}
	return original, &api.Fault{Kind: "CONFLICT", Reason: "CONTEXT_PLAN_CHANGED"}
}

// The driver wraps a single extended code in some query paths. A joined error
// with another failure is not evidence that retrying the whole transaction is safe.
func snapshotBusyOnly(err error) bool {
	switch v := err.(type) {
	case sqlite3.ExtendedErrorCode:
		return v == sqlite3.BUSY_SNAPSHOT
	case *sqlite3.Error:
		return v.ExtendedCode() == sqlite3.BUSY_SNAPSHOT
	case interface{ Unwrap() []error }:
		children := v.Unwrap()
		return len(children) == 1 && snapshotBusyOnly(children[0])
	case interface{ Unwrap() error }:
		return snapshotBusyOnly(v.Unwrap())
	default:
		return false
	}
}
