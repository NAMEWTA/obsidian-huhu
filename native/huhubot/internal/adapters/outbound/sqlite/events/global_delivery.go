package events

import (
	"context"
	"database/sql"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// GlobalProposalDeliveryReader owns the pending proposal's owner, expiry,
// fixed preview/target and complete current source qualification. It must use
// this transaction, without acquiring another fence or opening another Tx.
// Success returns a nonzero deadline including the proposal's own expiry.
type GlobalProposalDeliveryReader interface {
	ReadProposalDeadlineBatchInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error)
}

// SetGlobalProposalReader is a startup composition operation.
func (s *Store) SetGlobalProposalReader(reader GlobalProposalDeliveryReader) {
	s.proposals = reader
}

func (s *Store) proposalDeadlineInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (time.Time, error) {
	if s.proposals == nil {
		return time.Time{}, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	until, err := s.proposals.ReadProposalDeadlineBatchInTx(ctx, tx, id, profile, ids)
	if err != nil {
		return time.Time{}, err
	}
	if until.IsZero() {
		return time.Time{}, fail("CONFLICT", "MEMORY_STATE_INVALID")
	}
	return until, nil
}
