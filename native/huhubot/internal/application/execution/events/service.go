// Package events reads the durable Run log; timers are only polling optimizations.
package events

import (
	"context"
	"strconv"
	"sync"
	"time"

	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

const DefaultLimit = 64
const MaxLimit = 128
const DefaultPageBytes = 65536
const MaxPageBytes = 524288
const MaxSnapshotBytes = 524288
const MaxPendingTextBytes = 262144
const RetainedTerminalEvents = 256
const PollInterval = 50 * time.Millisecond
const MaxWaiters = 128
const MaxDeliveryRuns = 800 // Eight batch items, each with at most 100 message/approval Runs.

type Repository interface {
	Tail(context.Context, api.RequestIdentity, api.EventTailQuery) (api.EventPage, error)
	Snapshot(context.Context, api.RequestIdentity, api.IDQuery) (api.EventCursorRecovery, error)
	WithDelivery(context.Context, api.RequestIdentity, []api.DeliverySubject, func(context.Context) error) error
}
type Service struct {
	repo    Repository
	mu      sync.Mutex
	waiting map[string]bool
}

func New(repo Repository) *Service { return &Service{repo: repo, waiting: make(map[string]bool)} }
func Sequence(v string) (int64, error) {
	n, e := strconv.ParseInt(v, 10, 64)
	if e != nil || n < 0 || strconv.FormatInt(n, 10) != v {
		return 0, api.Invalid("INVALID_EVENT_CURSOR")
	}
	return n, nil
}
func valid(id api.RequestIdentity, profile, run string) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	if profile == "" || !grantsapp.Opaque(run) {
		return api.Invalid("INVALID_EVENT_QUERY")
	}
	return nil
}
func (s *Service) Tail(ctx context.Context, id api.RequestIdentity, q api.EventTailQuery) (api.EventPage, error) {
	if e := valid(id, q.ProfileID, q.RunID); e != nil {
		return api.EventPage{}, e
	}
	if q.AfterSeq == "" {
		q.AfterSeq = "0"
	}
	if _, e := Sequence(q.AfterSeq); e != nil {
		return api.EventPage{}, e
	}
	if q.Limit == 0 {
		q.Limit = DefaultLimit
	}
	if q.MaxBytes == 0 {
		q.MaxBytes = DefaultPageBytes
	}
	if q.Limit < 1 || q.Limit > MaxLimit || q.MaxBytes < 1024 || q.MaxBytes > MaxPageBytes || q.WaitMillis < 0 || q.WaitMillis > 1000 {
		return api.EventPage{}, api.Invalid("INVALID_EVENT_BUDGET")
	}
	if q.WaitMillis > 0 {
		key := id.ConnectionID() + "\x00" + id.PrincipalID() + "\x00" + q.RunID
		s.mu.Lock()
		if s.waiting[key] || len(s.waiting) >= MaxWaiters {
			s.mu.Unlock()
			return api.EventPage{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "EVENT_WAITER_LIMIT", Retryable: true}
		}
		s.waiting[key] = true
		s.mu.Unlock()
		defer func() { s.mu.Lock(); delete(s.waiting, key); s.mu.Unlock() }()
	}
	until := time.Now().Add(time.Duration(q.WaitMillis) * time.Millisecond)
	for {
		page, e := s.repo.Tail(ctx, id, q)
		if e != nil {
			return api.EventPage{}, e
		}
		if len(page.Events) > 0 || !time.Now().Before(until) {
			return page, nil
		}
		delay := time.Until(until)
		if delay > PollInterval {
			delay = PollInterval
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return api.EventPage{}, ctx.Err()
		case <-timer.C:
		}
	}
}
func (s *Service) Snapshot(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.EventCursorRecovery, error) {
	if e := valid(id, q.ProfileID, q.ID); e != nil {
		return api.EventCursorRecovery{}, e
	}
	return s.repo.Snapshot(ctx, id, q)
}
func (s *Service) WithDelivery(ctx context.Context, id api.RequestIdentity, subjects []api.DeliverySubject, fn func(context.Context) error) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	if len(subjects) == 0 || len(subjects) > MaxDeliveryRuns || fn == nil {
		return api.Invalid("INVALID_EVENT_DELIVERY")
	}
	seen := map[string]bool{}
	for _, subject := range subjects {
		key := subject.Kind + "\x00" + subject.ID
		validKind := subject.Kind == "run" || subject.Kind == "message" || subject.Kind == "memory_revision" || subject.Kind == "memory_candidate" || subject.Kind == "context_entry" || subject.Kind == "memory_proposal"
		if !validKind || !grantsapp.Opaque(subject.ID) || seen[key] {
			return api.Invalid("INVALID_EVENT_DELIVERY")
		}
		seen[key] = true
	}
	return s.repo.WithDelivery(ctx, id, subjects, fn)
}

var _ api.EventsAPI = (*Service)(nil)
