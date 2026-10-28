package collaboration

import (
	"context"
	"database/sql"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

func (s *Store) CancelTask(ctx context.Context, id api.RequestIdentity, c api.TaskCancel) (api.Delegation, error) {
	var out api.Delegation
	var canceled []string
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return out, e
	}
	if c.Scope != "" && c.Scope != "subtree" {
		return out, api.Invalid("INVALID_CANCEL_SCOPE")
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.cancelTask", hash, &out)
		if e != nil {
			return e
		}
		if found {
			_, e = s.readTaskInTx(ctx, tx, id, c.ProfileID, c.ID, true)
			return e
		}
		out, e = s.readTaskInTx(ctx, tx, id, c.ProfileID, c.ID, true)
		if e != nil {
			return e
		}
		if out.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if s.canceler == nil {
			return api.Denied("CANCEL_NOT_ASSEMBLED")
		}
		canceled, e = s.canceler.CancelSubtreeInTx(ctx, tx, id, c.ProfileID, out.ChildRunID)
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE collaboration_delegations SET revision=revision+1 WHERE delegation_id=?", out.ID); e != nil {
			return e
		}
		out, e = s.readTaskInTx(ctx, tx, id, c.ProfileID, c.ID, true)
		if e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.cancelTask", hash, out.ExecutorAgentID, out)
	})
	if e == nil && s.cancel != nil {
		for _, runID := range canceled {
			s.cancel(runID)
		}
	}
	return out, e
}
