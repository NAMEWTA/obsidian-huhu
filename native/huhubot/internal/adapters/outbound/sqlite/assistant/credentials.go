package assistant

import (
	"context"
	"database/sql"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/assistant"
)

// StartSession runs once at Runner composition, before any provider worker.
// A prior process cannot still own a deletion guard after the Profile lock moved.
func (s *Store) StartSession(ctx context.Context) error {
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := tx.ExecContext(ctx, "UPDATE credential_metadata SET deleting=0,state='unknown',reason='OPERATION_TIMEOUT' WHERE deleting=1"); e != nil {
			return e
		}
		_, e := tx.ExecContext(ctx, "UPDATE credential_metadata SET state='missing',reason='SESSION_CLOSED' WHERE mode='session-memory'")
		return e
	})
}
func credential(ctx context.Context, q queryer, profileID, ref string) (api.CredentialMetadata, error) {
	m := api.CredentialMetadata{ProfileID: profileID, CredentialRef: ref}
	p, e := metadata(ctx, q)
	if e != nil {
		return m, e
	}
	if e = profileCheck(p, profileID); e != nil {
		return m, e
	}
	var cleaning int
	if e = q.QueryRowContext(ctx, "SELECT count(*) FROM purge_previews WHERE profile_id=? AND state='failed'", profileID).Scan(&cleaning); e != nil {
		return m, e
	}
	if cleaning > 0 {
		return m, fail("CONFLICT", "PROFILE_CLEANUP_PENDING")
	}
	var owner string
	var deleting int
	e = q.QueryRowContext(ctx, "SELECT profile_id,mode,state,reason,deleting FROM credential_metadata WHERE credential_ref=?", ref).Scan(&owner, &m.Status.Mode, &m.Status.State, &m.Status.Reason, &deleting)
	if errors.Is(e, sql.ErrNoRows) {
		return m, fail("NOT_FOUND", "CREDENTIAL_MISSING")
	}
	if e != nil {
		return m, e
	}
	if owner != profileID {
		return m, api.Denied("PROFILE_MISMATCH")
	}
	if deleting != 0 {
		return m, fail("CONFLICT", "CREDENTIAL_IN_USE")
	}
	return m, nil
}
func (s *Store) Reserve(ctx context.Context, profileID, ref, mode string) error {
	if !domain.ValidCredentialRef(ref) {
		return api.Invalid("CREDENTIAL_REF_INVALID")
	}
	if mode != "protected" && mode != "session-memory" {
		return api.Invalid("REGISTRATION_FAILED")
	}
	// Durability barrier (ADR-027): the catalog row is flushed before the
	// secret reaches the OS store, so no stored secret is left unreferenced.
	return s.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, profileID); e != nil {
			return e
		}
		var cleaning int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM purge_previews WHERE profile_id=? AND state='failed'", profileID).Scan(&cleaning); e != nil {
			return e
		}
		if cleaning > 0 {
			return fail("CONFLICT", "PROFILE_CLEANUP_PENDING")
		}
		var count int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM credential_metadata WHERE credential_ref=?", ref).Scan(&count); e != nil {
			return e
		}
		if count > 0 {
			return fail("CONFLICT", "CREDENTIAL_REF_REUSED")
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO credential_metadata VALUES(?,?,?,'unknown','REGISTRATION_FAILED',0)", ref, profileID, mode)
		return e
	})
}
func (s *Store) Lookup(ctx context.Context, profileID, ref string) (api.CredentialMetadata, error) {
	var m api.CredentialMetadata
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; m, e = credential(ctx, tx, profileID, ref); return e })
	return m, e
}
func validStatus(st api.CredentialStatus) bool {
	return (st.Mode == "protected" || st.Mode == "session-memory") && (st.State == "available" || st.State == "missing" || st.State == "failed" || st.State == "unknown")
}
func (s *Store) Update(ctx context.Context, profileID, ref string, st api.CredentialStatus) error {
	if !validStatus(st) {
		return api.Invalid("REGISTRATION_FAILED")
	}
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		m, e := credential(ctx, tx, profileID, ref)
		if e != nil {
			return e
		}
		if st.Mode != m.Status.Mode {
			return api.Invalid("REGISTRATION_FAILED")
		}
		_, e = tx.ExecContext(ctx, "UPDATE credential_metadata SET state=?,reason=? WHERE credential_ref=?", st.State, st.Reason, ref)
		return e
	})
}
func (s *Store) BeginDelete(ctx context.Context, profileID, ref string) (api.CredentialMetadata, error) {
	var m api.CredentialMetadata
	// Durability barrier (ADR-027): deleting=1 is flushed before the OS delete.
	e := s.base.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		var e error
		m, e = credential(ctx, tx, profileID, ref)
		if e != nil {
			return e
		}
		var uses int
		if e = tx.QueryRowContext(ctx, "SELECT (SELECT count(*) FROM model_binding_revisions WHERE credential_ref=?) + (SELECT count(*) FROM task_config_snapshots c WHERE c.profile_id=? AND c.credential_ref=? AND (c.state IN('active','retained') OR EXISTS(SELECT 1 FROM task_config_pins p WHERE p.snapshot_id=c.snapshot_id)))", ref, profileID, ref).Scan(&uses); e != nil {
			return e
		}
		if uses > 0 {
			return fail("CONFLICT", "CREDENTIAL_IN_USE")
		}
		_, e = tx.ExecContext(ctx, "UPDATE credential_metadata SET deleting=1 WHERE credential_ref=?", ref)
		return e
	})
	return m, e
}
func (s *Store) FinishDelete(ctx context.Context, profileID, ref string, st api.CredentialStatus) error {
	if !validStatus(st) {
		return api.Invalid("REGISTRATION_FAILED")
	}
	return s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := metadata(ctx, tx)
		if e != nil {
			return e
		}
		if e = profileCheck(p, profileID); e != nil {
			return e
		}
		r, e := tx.ExecContext(ctx, "UPDATE credential_metadata SET state=?,reason=?,deleting=0 WHERE profile_id=? AND credential_ref=? AND mode=? AND deleting=1", st.State, st.Reason, profileID, ref, st.Mode)
		if e != nil {
			return e
		}
		n, e := r.RowsAffected()
		if e == nil && n != 1 {
			return fail("CONFLICT", "CREDENTIAL_IN_USE")
		}
		return e
	})
}

var _ api.CredentialCatalog = (*Store)(nil)
