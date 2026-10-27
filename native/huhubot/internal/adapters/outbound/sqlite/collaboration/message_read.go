package collaboration

import (
	"context"
	"database/sql"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
)

func (s *Store) checkMessageInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, messageID string) error {
	var from, root, raw string
	if e := tx.QueryRowContext(ctx, "SELECT from_run_id,root_run_id,source_json FROM collaboration_messages WHERE message_id=? AND principal_id=?", messageID, id.PrincipalID()).Scan(&from, &root, &raw); e != nil {
		return e
	}
	if bound, ok := delegate.Execution(ctx); ok {
		currentRoot := bound.Run.RootRunID
		if currentRoot == "" {
			currentRoot = bound.Run.ID
		}
		if currentRoot != root {
			return api.Denied("MESSAGE_SCOPE_MISMATCH")
		}
	}
	_, _, e := s.access.PrivateMessageInTx(ctx, tx, id, profile, messageID)
	return e
}
