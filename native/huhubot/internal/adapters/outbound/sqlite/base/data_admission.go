package base

import (
	"context"
	"database/sql"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// CheckDataAdmission runs in the mutation/read's existing transaction. A
// pending physical erasure cannot be bypassed by another inbound adapter.
func CheckDataAdmission(ctx context.Context, q interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}) error {
	var pending int
	if err := q.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM purge_previews WHERE state='failed')+(SELECT count(*) FROM session_deletions WHERE state='pending')").Scan(&pending); err != nil {
		return err
	}
	if pending != 0 {
		return &api.Fault{Kind: "CONFLICT", Reason: "PROFILE_CLEANUP_PENDING"}
	}
	return nil
}

func (s *Store) ReadCleanup(ctx context.Context, id api.RequestIdentity) (out *api.CleanupStatus, err error) {
	if !id.Valid() {
		return nil, api.Denied("IDENTITY_REQUIRED")
	}
	err = s.WithinTx(ctx, func(tx *sql.Tx) error {
		current := api.CleanupStatus{SessionIDs: []string{}}
		var count int
		if e := tx.QueryRowContext(ctx, "SELECT count(*) FROM purge_previews p JOIN profile_metadata m ON m.profile_id=p.profile_id WHERE p.state='failed'").Scan(&count); e != nil {
			return e
		}
		current.Profile = count > 0
		rows, e := tx.QueryContext(ctx, "SELECT d.session_id FROM session_deletions d JOIN profile_metadata m ON m.profile_id=d.profile_id WHERE d.principal_id=? AND d.state='pending' ORDER BY d.session_id", id.PrincipalID())
		if e != nil {
			return e
		}
		for rows.Next() {
			var session string
			if e = rows.Scan(&session); e != nil {
				rows.Close()
				return e
			}
			current.SessionIDs = append(current.SessionIDs, session)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if current.Profile || len(current.SessionIDs) > 0 {
			out = &current
		}
		return nil
	})
	return
}
