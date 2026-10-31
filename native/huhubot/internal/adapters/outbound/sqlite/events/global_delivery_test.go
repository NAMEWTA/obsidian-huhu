package events

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/events"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type proposalDeadlineFunc func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error)

func (f proposalDeadlineFunc) ReadProposalDeadlineBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (time.Time, error) {
	return f(ctx, tx, id, profile, ids)
}

type proposalDeliveryFixture struct {
	base    *base.Store
	access  *grants.Store
	store   *Store
	owner   api.RequestIdentity
	profile string
}

func proposalFixture(t *testing.T) proposalDeliveryFixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	h, err := profile.Acquire(root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := h.Close(); err != nil {
			t.Error(err)
		}
	})
	db, err := base.Open(context.Background(), h)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	m, err := db.ReadMetadata(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	access := grants.New(db)
	return proposalDeliveryFixture{base: db, access: access, store: New(db, access), owner: api.NewConnectionIdentity("connection:proposal", "owner", false), profile: m.ProfileID}
}

// The controlled reader replaces only 015 qualification. SQLite, the shared
// Grant mutation fence, application validation and writer deadline are real.
func TestProposalDeliveryUsesCurrentTxAndClosesSQLBeforeWriter(t *testing.T) {
	f := proposalFixture(t)
	ids := []string{"proposal:first", "proposal:second"}
	var checked *sql.Tx
	var deadline time.Time
	f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, got []string) (time.Time, error) {
		if !reflect.DeepEqual(got, ids) || id.PrincipalID() != f.owner.PrincipalID() || profile != f.profile {
			return time.Time{}, api.Denied("MEMORY_NAMESPACE_DENIED")
		}
		var actual string
		if err := tx.QueryRowContext(ctx, "SELECT profile_id FROM profile_metadata WHERE singleton=1").Scan(&actual); err != nil {
			return time.Time{}, err
		}
		if actual != profile {
			return time.Time{}, api.Denied("PROFILE_MISMATCH")
		}
		checked = tx
		deadline = time.Now().Add(100 * time.Millisecond)
		return deadline, nil
	}))
	writes := 0
	err := app.New(f.store).WithDelivery(context.Background(), f.owner, []api.DeliverySubject{{Kind: "memory_proposal", ID: ids[0]}, {Kind: "memory_proposal", ID: ids[1]}}, func(ctx context.Context) error {
		if got, ok := ctx.Deadline(); !ok || !got.Equal(deadline) {
			return errors.New("proposal deadline did not bound writer")
		}
		// The base has one connection: this cannot succeed while the Tx is open.
		if _, err := f.base.ReadMetadata(ctx); err != nil {
			return err
		}
		if err := checked.QueryRowContext(ctx, "SELECT 1").Scan(new(int)); !errors.Is(err, sql.ErrTxDone) {
			return errors.New("proposal SQL transaction remained open during writer")
		}
		writes++
		return nil
	})
	if err != nil || writes != 1 {
		t.Fatal("pending proposal did not reach writer after current qualification", writes, err)
	}
}

func TestQueuedProposalRechecksAfterMutationFence(t *testing.T) {
	for _, reason := range []string{"GRANT_REVOKED", "MEMORY_PROPOSAL_NOT_PENDING", "MEMORY_PROPOSAL_EXPIRED"} {
		t.Run(reason, func(t *testing.T) {
			f := proposalFixture(t)
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			var stateMu sync.Mutex
			var refusal error
			var calls atomic.Int32
			f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error) {
				calls.Add(1)
				stateMu.Lock()
				defer stateMu.Unlock()
				return time.Now().Add(time.Second), refusal
			}))
			subjects := []api.DeliverySubject{{Kind: "memory_proposal", ID: "proposal:queued"}}
			if err := f.store.WithDelivery(ctx, f.owner, subjects, func(context.Context) error { return nil }); err != nil {
				t.Fatal("pending preview qualification", err)
			}
			held, release := make(chan struct{}), make(chan struct{})
			var once sync.Once
			holderDone, deliveryDone := make(chan struct{}), make(chan struct{})
			holderResult, deliveryResult := make(chan error, 1), make(chan error, 1)
			deliveryLaunched := false
			t.Cleanup(func() {
				cancel()
				once.Do(func() { close(release) })
				workers := []chan struct{}{holderDone}
				if deliveryLaunched {
					workers = append(workers, deliveryDone)
				}
				for _, done := range workers {
					select {
					case <-done:
					case <-time.After(time.Second):
						t.Error("proposal gate worker did not return")
					}
				}
			})
			go func() {
				defer close(holderDone)
				holderResult <- f.access.WithReadFence(ctx, func(permit context.Context) error {
					close(held)
					select {
					case <-release:
						return nil
					case <-permit.Done():
						return permit.Err()
					}
				})
			}()
			select {
			case <-held:
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			}
			started := make(chan struct{})
			var writes atomic.Int32
			deliveryLaunched = true
			go func() {
				defer close(deliveryDone)
				close(started)
				deliveryResult <- f.store.WithDelivery(ctx, f.owner, subjects, func(context.Context) error { writes.Add(1); return nil })
			}()
			<-started
			if calls.Load() != 1 {
				t.Fatal("queued proposal bypassed mutation fence")
			}
			stateMu.Lock()
			refusal = api.Denied(reason)
			stateMu.Unlock()
			once.Do(func() { close(release) })
			if err := <-holderResult; err != nil {
				t.Fatal(err)
			}
			err := <-deliveryResult
			var fault *api.Fault
			if !errors.As(err, &fault) || fault.Reason != reason || writes.Load() != 0 || calls.Load() != 2 {
				t.Fatal("stale queued proposal reached physical writer", writes.Load(), calls.Load(), err)
			}
		})
	}
}

func TestProposalDeliveryRefusalsNeverInvokeWriter(t *testing.T) {
	for _, scenario := range []string{"missing-reader", "zero-deadline", "reader-error", "reader-stopping", "unknown-kind", "duplicate", "canceled"} {
		t.Run(scenario, func(t *testing.T) {
			f := proposalFixture(t)
			ctx := context.Background()
			subjects := []api.DeliverySubject{{Kind: "memory_proposal", ID: "proposal:invalid"}}
			readerErr := errors.New("controlled proposal reader I/O failure")
			f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error) {
				if scenario == "reader-error" {
					return time.Time{}, readerErr
				}
				if scenario == "reader-stopping" {
					return time.Time{}, &api.Fault{Kind: "CONFLICT", Reason: "SERVICE_STOPPING"}
				}
				if scenario == "zero-deadline" {
					return time.Time{}, nil
				}
				return time.Now().Add(time.Second), nil
			}))
			switch scenario {
			case "missing-reader":
				f.store.SetGlobalProposalReader(nil)
			case "unknown-kind":
				subjects[0].Kind = "proposal"
			case "duplicate":
				subjects = append(subjects, subjects[0])
			case "canceled":
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel()
			}
			writes := 0
			err := app.New(f.store).WithDelivery(ctx, f.owner, subjects, func(context.Context) error { writes++; return nil })
			if err == nil || writes != 0 || scenario == "reader-error" && !errors.Is(err, readerErr) {
				t.Fatal("invalid proposal delivery reached writer or changed unknown error", writes, err)
			}
			if scenario == "canceled" {
				if !errors.Is(err, context.Canceled) {
					t.Fatal("canceled delivery changed", err)
				}
			} else if scenario != "reader-error" {
				want := map[string]string{"missing-reader": "ACCESS_NOT_ASSEMBLED", "zero-deadline": "MEMORY_STATE_INVALID", "reader-stopping": "SERVICE_STOPPING", "unknown-kind": "INVALID_EVENT_DELIVERY", "duplicate": "INVALID_EVENT_DELIVERY"}[scenario]
				var fault *api.Fault
				if !errors.As(err, &fault) || fault.Reason != want {
					t.Fatal("proposal refusal changed", want, err)
				}
			}
		})
	}
}

func TestProposalWriterDeadlineAndCanceledReaderReleaseFence(t *testing.T) {
	f := proposalFixture(t)
	subjects := []api.DeliverySubject{{Kind: "memory_proposal", ID: "proposal:deadline"}}
	var until time.Time
	f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error) {
		until = time.Now().Add(30 * time.Millisecond)
		return until, nil
	}))
	err := f.store.WithDelivery(context.Background(), f.owner, subjects, func(ctx context.Context) error {
		if got, _ := ctx.Deadline(); !got.Equal(until) {
			return errors.New("short proposal expiry lost")
		}
		<-ctx.Done()
		return ctx.Err()
	})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal("proposal expiry did not stop writer", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(ctx context.Context, _ *sql.Tx, _ api.RequestIdentity, _ string, _ []string) (time.Time, error) {
		cancel()
		<-ctx.Done()
		return time.Time{}, ctx.Err()
	}))
	err = f.store.WithDelivery(ctx, f.owner, subjects, func(context.Context) error { return errors.New("canceled qualification reached writer") })
	if !errors.Is(err, context.Canceled) {
		t.Fatal("reader cancellation changed", err)
	}
	f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error) {
		return time.Now().Add(time.Second), nil
	}))
	if err = f.store.WithDelivery(context.Background(), f.owner, subjects, func(ctx context.Context) error {
		deadline, ok := ctx.Deadline()
		if !ok || time.Until(deadline) > grants.DeliveryLifetime {
			return errors.New("global delivery permit lost")
		}
		return nil
	}); err != nil {
		t.Fatal("deadline or cancel leaked the delivery fence", err)
	}
}

func TestProposalFamilyUsesTheExistingEightHundredSubjectBudget(t *testing.T) {
	f := proposalFixture(t)
	calls, writes := 0, 0
	f.store.SetGlobalProposalReader(proposalDeadlineFunc(func(_ context.Context, _ *sql.Tx, _ api.RequestIdentity, _ string, ids []string) (time.Time, error) {
		calls++
		if len(ids) != app.MaxDeliveryRuns {
			return time.Time{}, errors.New("proposal batch was truncated")
		}
		return time.Now().Add(time.Second), nil
	}))
	subjects := make([]api.DeliverySubject, app.MaxDeliveryRuns)
	for i := range subjects {
		subjects[i] = api.DeliverySubject{Kind: "memory_proposal", ID: "proposal:budget-" + strconv.Itoa(i)}
	}
	service := app.New(f.store)
	write := func(context.Context) error { writes++; return nil }
	if err := service.WithDelivery(context.Background(), f.owner, subjects, write); err != nil || calls != 1 || writes != 1 {
		t.Fatal("legal proposal subject budget", calls, writes, err)
	}
	subjects = append(subjects, api.DeliverySubject{Kind: "memory_proposal", ID: "proposal:overflow"})
	if err := service.WithDelivery(context.Background(), f.owner, subjects, write); err == nil || calls != 1 || writes != 1 {
		t.Fatal("proposal family escaped the shared subject budget", calls, writes, err)
	}
}
