package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type namespace struct {
	ID, Profile, Principal         string
	Public                         api.MemoryNamespace
	Catalog, Settings, Suppression int64
	Enabled                        bool
}

func (s *Store) readNamespace(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, n api.MemoryNamespace) (namespace, error) {
	principal := id.PrincipalID()
	if n.Kind == "global" {
		principal = "global:" + profile
	}
	out := namespace{Profile: profile, Principal: principal, Public: n, Catalog: 1, Settings: 1, Suppression: 1, Enabled: n.Kind == "agent"}
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	if !api.ValidMemoryNamespace(n) {
		return out, api.Invalid("INVALID_MEMORY_PARAMS")
	}
	if _, err := conv.Metadata(ctx, tx, profile); err != nil {
		return out, err
	}
	switch n.Kind {
	case "agent":
		if _, err := s.config.ReadAgentInTx(ctx, tx, profile, n.ID); err != nil {
			return out, err
		}
	case "temporary":
		var raw string
		err := tx.QueryRowContext(ctx, "SELECT config_json FROM task_config_snapshots WHERE profile_id=? AND principal_id=? AND subject_id=? ORDER BY created_at,snapshot_id LIMIT 1", profile, id.PrincipalID(), n.ID).Scan(&raw)
		if errors.Is(err, sql.ErrNoRows) {
			return out, api.Denied("MEMORY_NAMESPACE_DENIED")
		}
		if err != nil {
			return out, err
		}
		var config api.TaskConfigSnapshot
		if json.Unmarshal([]byte(raw), &config) != nil || config.Kind != "temporary" || config.SubjectID != n.ID {
			return out, invalidState()
		}
	case "global":
		if n.ID != profile {
			return out, api.Denied("MEMORY_NAMESPACE_DENIED")
		}
	default:
		return out, api.Denied("METHOD_NOT_AVAILABLE")
	}
	err := tx.QueryRowContext(ctx, "SELECT namespace_id,catalog_revision,settings_revision,suppression_revision,enabled FROM memory_namespaces WHERE profile_id=? AND principal_id=? AND kind=? AND subject_id=?", profile, principal, n.Kind, n.ID).Scan(&out.ID, &out.Catalog, &out.Settings, &out.Suppression, &out.Enabled)
	if errors.Is(err, sql.ErrNoRows) {
		return out, nil
	}
	if err == nil && (out.Catalog < 1 || out.Settings < 1 || out.Suppression < 1) {
		err = invalidState()
	}
	return out, err
}
func materialize(ctx context.Context, tx *sql.Tx, n *namespace) error {
	if n.ID != "" {
		return nil
	}
	n.ID = api.NewID("memory-namespace:")
	_, err := tx.ExecContext(ctx, "INSERT INTO memory_namespaces(namespace_id,profile_id,principal_id,kind,subject_id,enabled) VALUES(?,?,?,?,?,?)", n.ID, n.Profile, n.Principal, n.Public.Kind, n.Public.ID, n.Enabled)
	return err
}
func bump(ctx context.Context, tx *sql.Tx, namespaceID string, suppression bool) error {
	query := "UPDATE memory_namespaces SET catalog_revision=catalog_revision+1 WHERE namespace_id=? AND catalog_revision<9223372036854775807"
	if suppression {
		query = "UPDATE memory_namespaces SET catalog_revision=catalog_revision+1,suppression_revision=suppression_revision+1 WHERE namespace_id=? AND catalog_revision<9223372036854775807 AND suppression_revision<9223372036854775807"
	}
	if err := changed(tx.ExecContext(ctx, query, namespaceID)); err != nil {
		return err
	}
	if err := changed(tx.ExecContext(ctx, "UPDATE assistant_usage_clock SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807")); err != nil {
		return err
	}
	return conv.Bump(ctx, tx)
}
func (s *Store) settings(ctx context.Context, tx *sql.Tx, n namespace) (api.MemorySettings, error) {
	out := api.MemorySettings{Namespace: n.Public, Revision: strconv.FormatInt(n.Settings, 10), Enabled: n.Enabled}
	if n.Public.Kind != "agent" {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if !n.Enabled {
		out.Reason = "MEMORY_AUTO_DISABLED"
		return out, nil
	}
	reason, err := s.eligibility.MaintenanceEligibilityInTx(ctx, tx, n.Profile)
	if err != nil {
		return out, err
	}
	if reason != "" {
		out.Reason = reason
		return out, nil
	}
	agent, err := s.config.ReadAgentInTx(ctx, tx, n.Profile, n.Public.ID)
	if err != nil {
		return out, err
	}
	switch {
	case !agent.Enabled:
		out.Reason = "AGENT_DISABLED"
	case agent.Model == nil:
		out.Reason = "MODEL_DRAFT_INCOMPLETE"
	case agent.Model.CredentialStatus.State != "available":
		out.Reason = "CREDENTIAL_MISSING"
	default:
		out.Eligible = true
	}
	return out, nil
}

func (s *Store) scope(ctx context.Context, tx *sql.Tx, n namespace, scope api.MemoryScope) error {
	if !api.ValidMemoryScope(scope) {
		return api.Invalid("INVALID_MEMORY_PARAMS")
	}
	if scope.Kind == "profile" {
		if n.Public.Kind == "temporary" {
			return api.Denied("MEMORY_SCOPE_MISMATCH")
		}
		return nil
	}
	var valid int
	if scope.Kind == "session" {
		if n.Public.Kind == "temporary" {
			return api.Denied("MEMORY_SCOPE_MISMATCH")
		}
		query := "SELECT count(*) FROM conversation_sessions s WHERE s.profile_id=? AND s.session_id=?"
		args := []any{n.Profile, scope.ID}
		if n.Public.Kind != "global" {
			query = "SELECT count(*) FROM conversation_sessions s JOIN conversation_members m ON m.session_id=s.session_id WHERE s.profile_id=? AND s.principal_id=? AND s.session_id=? AND m.agent_id=? AND m.active=1"
			args = []any{n.Profile, n.Principal, scope.ID, n.Public.ID}
		}
		err := tx.QueryRowContext(ctx, query, args...).Scan(&valid)
		if err != nil {
			return err
		}
	} else {
		query := "SELECT count(*) FROM collaboration_threads t JOIN conversation_sessions s ON s.session_id=t.visible_session_id WHERE s.profile_id=? AND t.thread_id=?"
		args := []any{n.Profile, scope.ID}
		if n.Public.Kind != "global" {
			query = "SELECT count(*) FROM collaboration_threads t JOIN conversation_sessions s ON s.session_id=t.visible_session_id WHERE s.profile_id=? AND t.principal_id=? AND t.thread_id=? AND t.subject_id=?"
			args = []any{n.Profile, n.Principal, scope.ID, n.Public.ID}
		}
		err := tx.QueryRowContext(ctx, query, args...).Scan(&valid)
		if err != nil {
			return err
		}
		if valid == 0 && n.Public.Kind == "agent" {
			err = tx.QueryRowContext(ctx, "SELECT count(*) FROM conversation_sessions s JOIN conversation_members m ON m.session_id=s.session_id WHERE s.profile_id=? AND s.principal_id=? AND s.session_id=? AND s.kind='direct' AND m.agent_id=? AND m.active=1", n.Profile, n.Principal, scope.ID, n.Public.ID).Scan(&valid)
			if err != nil {
				return err
			}
		}
	}
	if valid != 1 {
		return api.Denied("MEMORY_SCOPE_MISMATCH")
	}
	return nil
}

func mutableID(ctx context.Context, tx *sql.Tx, id string) error {
	var contextEntry bool
	err := tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM memory_context_entries WHERE entry_id=?) OR EXISTS(SELECT 1 FROM execution_runs WHERE run_id=?)", id, id).Scan(&contextEntry)
	if err != nil {
		return err
	}
	if contextEntry {
		return api.Denied("CONTEXT_READ_ONLY")
	}
	return nil
}
