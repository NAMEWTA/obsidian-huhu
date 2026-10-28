package base

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// EraseWAL checkpoints zeroed database pages and truncates the old WAL frames.
// secure_delete alone only changes the latest page versions. A reader may pin
// an older WAL snapshot, in which case physical erasure must remain pending.
func (s *Store) EraseWAL(ctx context.Context) error {
	var busy, frames, checkpointed int
	if err := s.db.QueryRowContext(ctx, "PRAGMA wal_checkpoint(TRUNCATE)").Scan(&busy, &frames, &checkpointed); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return &api.Fault{Kind: "CONFLICT", Reason: "PROFILE_DB_CLEANUP_PENDING", Retryable: true}
	}
	if busy != 0 || frames != 0 || checkpointed != 0 {
		return &api.Fault{Kind: "CONFLICT", Reason: "PROFILE_DB_CLEANUP_PENDING", Retryable: true}
	}
	return nil
}
