package effects

import (
	"context"
	"database/sql"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type WaitPolicy interface {
	PublishWaitInTx(context.Context, *sql.Tx, api.ToolExecution, api.EngineSuspension) error
}

func (s *Store) SetWaitPolicy(policy WaitPolicy) { s.waits = policy }
func (s *Store) PublishWait(ctx context.Context, x api.ToolExecution, p api.EngineSuspension) error {
	if s.waits == nil {
		return api.Denied("WAIT_POLICY_NOT_ASSEMBLED")
	}
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		in, e := s.check(ctx, tx, x)
		if e != nil {
			return e
		}
		if s.guard != nil {
			if e = s.guard.CheckInTx(ctx, tx, x.Identity, in, []string{"read", "send"}); e != nil {
				return e
			}
		}
		if p.Checkpoint.RunID != x.Run.ID || p.Checkpoint.AttemptID != x.ClaimToken {
			return api.Denied("CHECKPOINT_OWNERSHIP_MISMATCH")
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO execution_checkpoints VALUES(?,?,?)", p.Checkpoint.Ref, x.Run.ID, encoded(p.Checkpoint)); e != nil {
			return e
		}
		return s.waits.PublishWaitInTx(ctx, tx, x, p)
	})
}
