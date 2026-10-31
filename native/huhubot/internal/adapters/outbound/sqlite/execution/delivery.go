package execution

import (
	"context"
	"database/sql"
	"strings"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// deliveryRow appends only the Session authorization facts to the common Run
// scanner; recipient, effective context and usage use the exact single-read
// decoder and error handling.
type deliveryRow struct {
	rows      *sql.Rows
	principal *string
	member    *bool
}

func (r deliveryRow) Scan(dest ...any) error {
	return r.rows.Scan(append(dest, r.principal, r.member)...)
}

// ReadAccessBatchInTx is adapter-only and never carries a cache outside tx.
// Its access facts match ReadInTx for each requested Run, including Session
// membership existence and both persisted ownership checks. It reads no Host or
// grant data; the consumer must still check exact message provenance and current
// read qualifications in this same transaction before issuing a delivery permit.
func ReadAccessBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID string, runIDs []string) (map[string]api.RunAccessInput, error) {
	if len(runIDs) == 0 || len(runIDs) > 800 {
		return nil, api.Invalid("INVALID_DELIVERY_RUNS")
	}
	args := make([]any, len(runIDs))
	requested := make(map[string]bool, len(runIDs))
	for i, key := range runIDs {
		if key == "" || requested[key] {
			return nil, api.Invalid("INVALID_DELIVERY_RUNS")
		}
		requested[key] = true
		args[i] = key
	}
	if _, e := conv.Metadata(ctx, tx, profileID); e != nil {
		return nil, e
	}
	// Keep the shared decoder and all access facts without fetching the
	// public Run-only limits projection for each row of a delivery batch.
	query := "SELECT " + runAccessColumns + ",'',s.principal_id,EXISTS(SELECT 1 FROM conversation_members m WHERE m.session_id=s.session_id) FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id IN (" + strings.TrimSuffix(strings.Repeat("?,", len(runIDs)), ",") + ")"
	rows, e := tx.QueryContext(ctx, query, args...)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := make(map[string]api.RunAccessInput, len(runIDs))
	limitsCache := map[string]api.ExecutionLimits{}
	for rows.Next() {
		var sessionPrincipal string
		var member bool
		r, in, principal, _, e := scanRun(deliveryRow{rows, &sessionPrincipal, &member}, limitsCache)
		if e != nil {
			return nil, e
		}
		// Preserve the single reader's ordering: Run owner first, followed by
		// ReadSession's membership existence, Profile and Session owner checks.
		if principal != id.PrincipalID() {
			return nil, api.Denied("SESSION_READ_DENIED")
		}
		if !member {
			return nil, conv.Fault("NOT_FOUND", "SESSION_NOT_FOUND")
		}
		if in.ProfileID != profileID {
			return nil, api.Denied("PROFILE_MISMATCH")
		}
		if sessionPrincipal != id.PrincipalID() {
			return nil, api.Denied("SESSION_READ_DENIED")
		}
		out[r.ID] = in
	}
	if e = rows.Err(); e != nil {
		return nil, e
	}
	if len(out) != len(runIDs) {
		return nil, conv.Fault("NOT_FOUND", "RUN_NOT_FOUND")
	}
	return out, nil
}
