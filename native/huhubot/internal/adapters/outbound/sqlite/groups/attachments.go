package groups

import (
	"context"
	"database/sql"
	"reflect"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func containsSource(items []api.SourceSnapshot, item api.SourceSnapshot) bool {
	for _, v := range items {
		if reflect.DeepEqual(v, item) {
			return true
		}
	}
	return false
}
func containsScope(items []api.SourceScope, item api.SourceScope) bool {
	for _, v := range items {
		if reflect.DeepEqual(v, item) {
			return true
		}
	}
	return false
}
func attachmentsSubset(a, b api.MessageAttachments) bool {
	for _, s := range a.SourceRefs {
		if !containsSource(b.SourceRefs, s) {
			return false
		}
	}
	for _, s := range a.SourceScopes {
		if !containsScope(b.SourceScopes, s) {
			return false
		}
	}
	return true
}
func (s *Store) CheckAttachmentsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, message string, expected api.MessageAttachments) error {
	current, e := s.filterAttachmentsInTx(ctx, tx, id, profile, message, expected)
	if e != nil {
		return e
	}
	if current == nil || !attachmentsSubset(expected, *current) {
		return api.Denied("GROUP_ATTACHMENT_REVOKED")
	}
	return nil
}
func bumpUsage(ctx context.Context, tx *sql.Tx) error {
	r, e := tx.ExecContext(ctx, "UPDATE assistant_usage_clock SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807")
	if e != nil {
		return e
	}
	n, e := r.RowsAffected()
	if e != nil {
		return e
	}
	if n != 1 {
		return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	return nil
}
