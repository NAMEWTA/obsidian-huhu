// Package memory stores private memory and the immutable context actually
// consumed by a Run. It owns no Run writer, model scheduler or credential.
package memory

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Config interface {
	ReadAgentInTx(context.Context, *sql.Tx, string, string) (api.Agent, error)
}
type Access interface {
	CheckInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, []string) error
	SelectInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, string, []string) ([]string, error)
	CheckMemoryInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string, grants.MemoryRequirement, []string) (time.Time, error)
	ReadDeadlineInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput) (time.Time, error)
	WithReadFence(context.Context, func(context.Context) error) error
}
type Eligibility interface {
	MaintenanceEligibilityInTx(context.Context, *sql.Tx, string) (string, error)
}

type Store struct {
	base            *base.Store
	config          Config
	access          Access
	eligibility     Eligibility
	globalProposals ProposalReader
	mu              sync.Mutex
	stopping        bool
	nextCall        uint64
	calls           map[uint64]context.CancelFunc
	done            chan struct{}
	doneClosed      bool
}

// New only holds already-owned ports. It does not touch a database or start work.
func New(b *base.Store, config Config, access Access, eligibility Eligibility) *Store {
	return &Store{base: b, config: config, access: access, eligibility: eligibility, calls: make(map[uint64]context.CancelFunc), done: make(chan struct{})}
}

func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func invalidState() error             { return fault("CONFLICT", "MEMORY_STATE_INVALID") }
func digest(v string) string {
	h := sha256.Sum256([]byte(v))
	return "sha256:" + hex.EncodeToString(h[:])
}
func encode(v any) string { b, _ := json.Marshal(v); return string(b) }
func changed(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	return nil
}
func missing(err error, reason string) error {
	if errors.Is(err, sql.ErrNoRows) {
		return fault("NOT_FOUND", reason)
	}
	return err
}

func (s *Store) admissionOpen(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stopping {
		return fault("CONFLICT", "SERVICE_STOPPING")
	}
	return nil
}

func (s *Store) enter(ctx context.Context) (context.Context, func(), error) {
	s.mu.Lock()
	if s.stopping {
		s.mu.Unlock()
		return nil, nil, fault("CONFLICT", "SERVICE_STOPPING")
	}
	call, cancel := context.WithCancel(ctx)
	s.nextCall++
	id := s.nextCall
	s.calls[id] = cancel
	s.mu.Unlock()
	return call, func() {
		cancel()
		s.mu.Lock()
		delete(s.calls, id)
		s.finishLocked()
		s.mu.Unlock()
	}, nil
}
func (s *Store) finishLocked() {
	if s.stopping && len(s.calls) == 0 && !s.doneClosed {
		s.doneClosed = true
		close(s.done)
	}
}
func (s *Store) StopAdmission() {
	s.mu.Lock()
	s.stopping = true
	cancels := make([]context.CancelFunc, 0, len(s.calls))
	for _, cancel := range s.calls {
		cancels = append(cancels, cancel)
	}
	s.finishLocked()
	s.mu.Unlock()
	for _, cancel := range cancels {
		cancel()
	}
}
func (s *Store) Done() <-chan struct{} { return s.done }

func (s *Store) transaction(ctx context.Context, mutate bool, fn func(context.Context, *sql.Tx) error) error {
	call, finish, err := s.enter(ctx)
	if err != nil {
		return err
	}
	defer finish()
	run := func(current context.Context) error {
		return s.base.WithinTx(current, func(tx *sql.Tx) error {
			if err := s.admissionOpen(current); err != nil {
				return err
			}
			return fn(current, tx)
		})
	}
	if mutate {
		return s.access.WithReadFence(call, run)
	}
	return run(call)
}
