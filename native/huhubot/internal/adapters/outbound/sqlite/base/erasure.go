package base

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// EraseWAL checkpoints zeroed database pages and truncates the old WAL frames.
// secure_delete alone only changes the latest page versions. A reader may pin
// an older WAL snapshot, in which case physical erasure must remain pending.
func (s *Store) EraseWAL(ctx context.Context) error {
	if err := s.register(); err != nil {
		return err
	}
	defer s.release()
	m := &s.maintenance
	m.mu.Lock()
	m.eraseRequested++
	generation := m.eraseRequested
	attempt := m.attempts
	changed := m.changed
	m.mu.Unlock()
	s.signalMaintenance()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-changed:
		}
		m.mu.Lock()
		complete := m.eraseCompleted >= generation
		tried := m.attempts > attempt
		changed = m.changed
		m.mu.Unlock()
		if complete {
			return nil
		}
		if tried {
			return &api.Fault{Kind: "CONFLICT", Reason: "PROFILE_DB_CLEANUP_PENDING", Retryable: true}
		}
	}
}
