// Package portable is the SQLite adapter for the portable application port.
// It is the only layer in this feature that knows the profile schema.
package portable

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	appapi "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

type Store struct{ base *base.Store }

func New(b *base.Store) *Store { return &Store{base: b} }

var _ contract.Repository = (*Store)(nil)
var _ contract.PrincipalSink = (*Store)(nil)
var _ contract.PrincipalTarget = (*Store)(nil)

func fault(kind, reason string) error { return &appapi.Fault{Kind: kind, Reason: reason} }

func (s *Store) Snapshot(ctx context.Context, identity appapi.RequestIdentity, profileID string, req contract.ExportRequest) (contract.Selection, error) {
	if !identity.Valid() {
		return contract.Selection{}, appapi.Denied("IDENTITY_REQUIRED")
	}
	p, err := s.metadata(ctx, profileID)
	if err != nil {
		return contract.Selection{}, err
	}
	if p.ProfileID != profileID {
		return contract.Selection{}, appapi.Denied("PROFILE_MISMATCH")
	}
	out := contract.Selection{SourceProfile: profileID}
	agentIDs, err := s.agentIDs(ctx, req.AgentIDs)
	if err != nil {
		return out, err
	}
	for _, id := range agentIDs {
		a, e := s.agent(ctx, id)
		if e != nil {
			return out, e
		}
		out.Agents = append(out.Agents, a)
	}
	sessionIDs, err := s.sessionIDs(ctx, profileID, identity.PrincipalID(), req.SessionIDs)
	if err != nil {
		return out, err
	}
	for _, id := range sessionIDs {
		v, e := s.session(ctx, profileID, identity.PrincipalID(), id)
		if e != nil {
			return out, e
		}
		out.Sessions = append(out.Sessions, v)
	}
	memoryIDs, err := s.memoryIDs(ctx, profileID, identity.PrincipalID(), req.MemoryIDs)
	if err != nil {
		return out, err
	}
	for _, id := range memoryIDs {
		v, e := s.memory(ctx, profileID, identity.PrincipalID(), id)
		if e != nil {
			return out, e
		}
		out.Memories = append(out.Memories, v)
	}
	return out, nil
}

func (s *Store) Target(ctx context.Context, profileID string) (contract.Target, error) {
	return s.target(ctx, profileID, "")
}

func (s *Store) TargetForPrincipal(ctx context.Context, profileID, principal string) (contract.Target, error) {
	return s.target(ctx, profileID, principal)
}

func (s *Store) target(ctx context.Context, profileID, principal string) (contract.Target, error) {
	if _, err := s.metadata(ctx, profileID); err != nil {
		return contract.Target{}, err
	}
	out := contract.Target{ProfileID: profileID}
	rows, err := s.base.Database().QueryContext(ctx, "SELECT agent_id,CAST(revision AS TEXT),p.body FROM agents a JOIN persona_revisions p ON p.agent_id=a.agent_id AND p.revision=a.persona_revision ORDER BY agent_id")
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var id, rev, body string
		if err := rows.Scan(&id, &rev, &body); err != nil {
			rows.Close()
			return out, err
		}
		var d appapi.AgentDraft
		if err := json.Unmarshal([]byte(body), &d); err != nil {
			rows.Close()
			return out, fault("CONFLICT", "AGENT_STATE_INVALID")
		}
		out.Agents = append(out.Agents, contract.TargetAgent{ID: id, Name: d.Name, Revision: rev})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return out, err
	}
	rows.Close()
	query := "SELECT session_id,title,CAST(revision AS TEXT) FROM conversation_sessions WHERE profile_id=? ORDER BY session_id"
	args := []any{profileID}
	if principal != "" {
		query = "SELECT session_id,title,CAST(revision AS TEXT) FROM conversation_sessions WHERE profile_id=? AND principal_id=? ORDER BY session_id"
		args = append(args, principal)
	}
	rows, err = s.base.Database().QueryContext(ctx, query, args...)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var id, title, rev string
		if err := rows.Scan(&id, &title, &rev); err != nil {
			rows.Close()
			return out, err
		}
		out.Sessions = append(out.Sessions, contract.TargetSession{ID: id, Title: title, Revision: rev})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return out, err
	}
	rows.Close()
	query = "SELECT i.item_id,n.kind,n.subject_id,CAST(i.revision AS TEXT) FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE n.profile_id=? ORDER BY i.item_id"
	args = []any{profileID}
	if principal != "" {
		query = "SELECT i.item_id,n.kind,n.subject_id,CAST(i.revision AS TEXT) FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE n.profile_id=? AND (n.principal_id=? OR n.kind='global') ORDER BY i.item_id"
		args = append(args, principal)
	}
	rows, err = s.base.Database().QueryContext(ctx, query, args...)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var id, kind, namespaceID, rev string
		if err := rows.Scan(&id, &kind, &namespaceID, &rev); err != nil {
			rows.Close()
			return out, err
		}
		out.Memories = append(out.Memories, contract.TargetMemory{ID: id, NamespaceKind: kind, NamespaceID: namespaceID, Revision: rev})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return out, err
	}
	rows.Close()
	return out, nil
}

func (s *Store) metadata(ctx context.Context, profileID string) (appapi.ProfileMetadata, error) {
	var p appapi.ProfileMetadata
	err := s.base.Database().QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT),created_at FROM profile_metadata WHERE singleton=1").Scan(&p.ProfileID, &p.CommandEpoch, &p.Revision, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return p, fault("CONFLICT", "PROFILE_METADATA_UNAVAILABLE")
	}
	if err != nil {
		return p, err
	}
	if profileID != "" && p.ProfileID != profileID {
		return p, appapi.Denied("PROFILE_MISMATCH")
	}
	return p, nil
}

func (s *Store) agentIDs(ctx context.Context, ids []string) ([]string, error) {
	if len(ids) != 0 {
		return append([]string(nil), ids...), nil
	}
	return queryStrings(ctx, s.base.Database(), "SELECT agent_id FROM agents ORDER BY agent_id")
}

func (s *Store) sessionIDs(ctx context.Context, profile, principal string, ids []string) ([]string, error) {
	if len(ids) != 0 {
		return append([]string(nil), ids...), nil
	}
	return queryStrings(ctx, s.base.Database(), "SELECT session_id FROM conversation_sessions WHERE profile_id=? AND principal_id=? ORDER BY session_id", profile, principal)
}

func (s *Store) memoryIDs(ctx context.Context, profile, principal string, ids []string) ([]string, error) {
	if len(ids) != 0 {
		return append([]string(nil), ids...), nil
	}
	return queryStrings(ctx, s.base.Database(), "SELECT i.item_id FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE n.profile_id=? AND (n.principal_id=? OR n.kind='global') AND i.state='active' ORDER BY i.item_id", profile, principal)
}

func queryStrings(ctx context.Context, q interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}, query string, args ...any) ([]string, error) {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) agent(ctx context.Context, id string) (contract.Agent, error) {
	var out contract.Agent
	var body string
	if err := s.base.Database().QueryRowContext(ctx, "SELECT a.agent_id,CAST(a.revision AS TEXT),CAST(a.persona_revision AS TEXT),CAST(a.model_revision AS TEXT),a.enabled,a.is_default,p.body FROM agents a JOIN persona_revisions p ON p.agent_id=a.agent_id AND p.revision=a.persona_revision WHERE a.agent_id=?", id).Scan(&out.ID, &out.Revision, &out.PersonaRevision, &out.ModelRevision, &out.Enabled, &out.IsDefault, &body); errors.Is(err, sql.ErrNoRows) {
		return out, fault("NOT_FOUND", "AGENT_NOT_FOUND")
	} else if err != nil {
		return out, err
	}
	var d appapi.AgentDraft
	if err := json.Unmarshal([]byte(body), &d); err != nil {
		return out, fault("CONFLICT", "AGENT_STATE_INVALID")
	}
	out.Name, out.Description, out.Persona = d.Name, d.Description, d.Persona
	out.AllowedTools = append([]string(nil), d.AllowedTools...)
	out.AllowedCollaborationTargets = append([]string(nil), d.AllowedCollaborationTargets...)
	if out.ModelRevision != "0" {
		var modelBody string
		if err := s.base.Database().QueryRowContext(ctx, "SELECT body FROM model_binding_revisions WHERE agent_id=? AND revision=?", id, out.ModelRevision).Scan(&modelBody); err != nil {
			return out, err
		}
		var m appapi.ModelBindingDraft
		if err := json.Unmarshal([]byte(modelBody), &m); err != nil {
			return out, fault("CONFLICT", "AGENT_MODEL_STATE_INVALID")
		}
		out.ModelID, out.ProviderID, out.Endpoint, out.Protocol = m.ModelID, m.ProviderID, m.Endpoint, m.Protocol
		out.Capabilities = append([]string(nil), m.Capabilities...)
		if out.ModelID == "" || out.ProviderID == "" || out.Endpoint == "" || out.Protocol == "" {
			return out, fault("CAPABILITY_DENIED", "PORTABLE_MODEL_BINDING_UNSUPPORTED")
		}
	}
	return out, nil
}

func (s *Store) session(ctx context.Context, profile, principal, id string) (contract.Session, error) {
	var out contract.Session
	var archived bool
	if err := s.base.Database().QueryRowContext(ctx, "SELECT session_id,kind,title,workspace_id,archived,coordinator_id FROM conversation_sessions WHERE profile_id=? AND principal_id=? AND session_id=?", profile, principal, id).Scan(&out.ID, &out.Kind, &out.Title, &out.WorkspaceID, &archived, &out.CoordinatorID); errors.Is(err, sql.ErrNoRows) {
		return out, fault("NOT_FOUND", "SESSION_NOT_FOUND")
	} else if err != nil {
		return out, err
	}
	out.Archived = archived
	rows, err := s.base.Database().QueryContext(ctx, "SELECT agent_id FROM conversation_members WHERE session_id=? AND active=1 ORDER BY agent_id", id)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var agent string
		if err := rows.Scan(&agent); err != nil {
			rows.Close()
			return out, err
		}
		out.MemberIDs = append(out.MemberIDs, agent)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return out, err
	}
	rows.Close()
	rows, err = s.base.Database().QueryContext(ctx, "SELECT message_id,role,text,created_at,agent_id FROM conversation_messages WHERE session_id=? ORDER BY seq", id)
	if err != nil {
		return out, err
	}
	for rows.Next() {
		var m contract.Message
		if err := rows.Scan(&m.ID, &m.Role, &m.Text, &m.CreatedAt, &m.AgentID); err != nil {
			rows.Close()
			return out, err
		}
		out.Messages = append(out.Messages, m)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return out, err
	}
	rows.Close()
	return out, nil
}

func (s *Store) memory(ctx context.Context, profile, principal, id string) (contract.Memory, error) {
	var out contract.Memory
	var revisionID, body, sourceJSON string
	var pinned bool
	if err := s.base.Database().QueryRowContext(ctx, "SELECT i.item_id,n.kind,n.subject_id,i.scope_kind,i.scope_id,i.state,i.pinned,i.head_revision_id,b.text,r.provenance,r.source_json FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id JOIN memory_revisions r ON r.revision_id=i.head_revision_id JOIN memory_revision_bodies b ON b.revision_id=r.revision_id WHERE i.item_id=? AND n.profile_id=? AND (n.principal_id=? OR n.kind='global')", id, profile, principal).Scan(&out.ID, &out.NamespaceKind, &out.NamespaceID, &out.ScopeKind, &out.ScopeID, &out.State, &pinned, &revisionID, &body, &out.Provenance, &sourceJSON); errors.Is(err, sql.ErrNoRows) {
		return out, fault("NOT_FOUND", "MEMORY_NOT_FOUND")
	} else if err != nil {
		return out, err
	}
	out.Pinned = pinned
	var sources []appapi.SourceSnapshot
	if err := json.Unmarshal([]byte(sourceJSON), &sources); err != nil {
		return out, fault("CONFLICT", "MEMORY_SOURCE_STATE_INVALID")
	}
	// The portable contract carries source identity only as references. The
	// adapter intentionally drops host lease fields and never exports grants.
	for _, source := range sources {
		out.SourceRefs = append(out.SourceRefs, contract.Source{Kind: source.Kind, ID: source.ResourceID, Revision: source.Revision, Hash: source.Hash})
	}
	return out, nil
}

type transaction struct {
	tx        *sql.Tx
	profile   string
	principal string
	closed    bool
}

func (s *Store) Begin(ctx context.Context, profile string) (contract.Transaction, error) {
	return s.BeginForPrincipal(ctx, profile, "portable:"+profile)
}

func (s *Store) BeginForPrincipal(ctx context.Context, profile, principal string) (contract.Transaction, error) {
	if profile == "" || principal == "" {
		return nil, appapi.Invalid("PROFILE_REQUIRED")
	}
	p, err := s.metadata(ctx, profile)
	if err != nil {
		return nil, err
	}
	tx, err := s.base.Database().BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	if p.ProfileID != profile {
		_ = tx.Rollback()
		return nil, appapi.Denied("PROFILE_MISMATCH")
	}
	return &transaction{tx: tx, profile: profile, principal: principal}, nil
}

func (t *transaction) PutAgent(ctx context.Context, a contract.Agent) (string, error) {
	if t.closed || a.ID == "" {
		return "", fault("CONFLICT", "IMPORT_TRANSACTION_CLOSED")
	}
	var modelRevision int
	if a.ModelID != "" {
		if a.ProviderID == "" || a.Endpoint == "" || a.Protocol == "" {
			return "", fault("CAPABILITY_DENIED", "PORTABLE_MODEL_BINDING_UNSUPPORTED")
		}
		modelRevision = 1
	}
	d := appapi.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, AllowedTools: append([]string(nil), a.AllowedTools...), AllowedCollaborationTargets: append([]string(nil), a.AllowedCollaborationTargets...)}
	pb, err := json.Marshal(d)
	if err != nil {
		return "", err
	}
	var currentRevision, currentPersona, currentModel int
	lookupErr := t.tx.QueryRowContext(ctx, "SELECT revision,persona_revision,model_revision FROM agents WHERE agent_id=?", a.ID).Scan(&currentRevision, &currentPersona, &currentModel)
	if errors.Is(lookupErr, sql.ErrNoRows) {
		if _, err = t.tx.ExecContext(ctx, "INSERT INTO agents(agent_id,revision,persona_revision,model_revision,enabled,is_default) VALUES(?,1,1,?,?,0)", a.ID, modelRevision, a.Enabled); err != nil {
			return "", mapSQLiteConflict(err, "AGENT_IMPORT_FAILED")
		}
	} else if lookupErr != nil {
		return "", lookupErr
	} else {
		currentPersona++
		if modelRevision != 0 {
			currentModel++
		} else {
			currentModel = 0
		}
		if _, err = t.tx.ExecContext(ctx, "UPDATE agents SET revision=revision+1,persona_revision=?,model_revision=?,enabled=?,is_default=0 WHERE agent_id=?", currentPersona, currentModel, a.Enabled, a.ID); err != nil {
			return "", err
		}
	}
	personaRevision := 1
	if currentPersona > 0 {
		personaRevision = currentPersona
	}
	if _, err = t.tx.ExecContext(ctx, "INSERT INTO persona_revisions(agent_id,revision,body) VALUES(?,?,?)", a.ID, personaRevision, string(pb)); err != nil {
		return "", err
	}
	if modelRevision != 0 {
		bindingRevision := modelRevision
		if currentModel > 0 {
			bindingRevision = currentModel
		}
		mb, _ := json.Marshal(appapi.ModelBindingDraft{ModelID: a.ModelID, ProviderID: a.ProviderID, Endpoint: a.Endpoint, Protocol: a.Protocol, Capabilities: append([]string(nil), a.Capabilities...)})
		if _, err = t.tx.ExecContext(ctx, "INSERT INTO model_binding_revisions(agent_id,revision,body,credential_ref) VALUES(?,?,?,NULL)", a.ID, bindingRevision, string(mb)); err != nil {
			return "", err
		}
	}
	return a.ID, nil
}

func (t *transaction) PutSession(ctx context.Context, s contract.Session) (string, error) {
	if t.closed || s.ID == "" {
		return "", fault("CONFLICT", "IMPORT_TRANSACTION_CLOSED")
	}
	if s.Kind != "direct" && s.Kind != "group" {
		return "", appapi.Invalid("INVALID_SESSION_KIND")
	}
	if len(s.MemberIDs) == 0 {
		return "", fault("CONFLICT", "SESSION_MEMBER_REQUIRED")
	}
	var existing string
	lookupErr := t.tx.QueryRowContext(ctx, "SELECT session_id FROM conversation_sessions WHERE session_id=? AND profile_id=? AND principal_id=?", s.ID, t.profile, t.principal).Scan(&existing)
	if errors.Is(lookupErr, sql.ErrNoRows) {
		if _, err := t.tx.ExecContext(ctx, "INSERT INTO conversation_sessions(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,coordinator_id) VALUES(?,?,?,?,?,?,1,?,?)", s.ID, t.profile, t.principal, s.Kind, s.Title, s.WorkspaceID, s.Archived, s.CoordinatorID); err != nil {
			return "", mapSQLiteConflict(err, "SESSION_IMPORT_FAILED")
		}
	} else if lookupErr != nil {
		return "", lookupErr
	} else if _, err := t.tx.ExecContext(ctx, "UPDATE conversation_sessions SET title=?,workspace_id=?,archived=?,coordinator_id=?,revision=revision+1 WHERE session_id=?", s.Title, s.WorkspaceID, s.Archived, s.CoordinatorID, s.ID); err != nil {
		return "", err
	}
	for _, agent := range s.MemberIDs {
		if agent == "" {
			return "", fault("CONFLICT", "SESSION_AGENT_MAPPING_MISSING")
		}
		if _, err := t.tx.ExecContext(ctx, "INSERT INTO conversation_members(session_id,agent_id,active,incarnation,history_revision,history_json,join_seq) VALUES(?,?,1,'1',1,'{\"kind\":\"none\"}',1) ON CONFLICT(session_id,agent_id) DO UPDATE SET active=1", s.ID, agent); err != nil {
			return "", err
		}
	}
	for _, m := range s.Messages {
		if m.Role != "user" && m.Role != "assistant" && m.Role != "system" {
			return "", appapi.Invalid("INVALID_MESSAGE_ROLE")
		}
		var seq int
		if err := t.tx.QueryRowContext(ctx, "SELECT COALESCE(MAX(seq),0)+1 FROM conversation_messages WHERE session_id=?", s.ID).Scan(&seq); err != nil {
			return "", err
		}
		id := m.ID
		if id == "" {
			id = appapi.NewID("message:")
		}
		if m.CreatedAt == "" {
			m.CreatedAt = time.Now().UTC().Format(time.RFC3339Nano)
		}
		if _, err := t.tx.ExecContext(ctx, "INSERT INTO conversation_messages(message_id,run_id,session_id,seq,role,text,created_at,agent_id,source_json,partial,supersedes_message_id,attachments_json) VALUES(?,?,?, ?,?,?,?,?,'[]',0,'','null')", id, "portable:"+s.ID, s.ID, seq, m.Role, m.Text, m.CreatedAt, m.AgentID); err != nil {
			return "", err
		}
	}
	if _, err := t.tx.ExecContext(ctx, "UPDATE conversation_sessions SET message_seq=COALESCE((SELECT MAX(seq) FROM conversation_messages WHERE session_id=?),0) WHERE session_id=?", s.ID, s.ID); err != nil {
		return "", err
	}
	return s.ID, nil
}

func (t *transaction) PutMemory(ctx context.Context, m contract.Memory) (string, error) {
	if t.closed || m.ID == "" {
		return "", fault("CONFLICT", "IMPORT_TRANSACTION_CLOSED")
	}
	principal := t.principal
	if m.NamespaceKind == "global" {
		principal = "global:" + t.profile
	}
	var namespaceID string
	err := t.tx.QueryRowContext(ctx, "SELECT namespace_id FROM memory_namespaces WHERE profile_id=? AND principal_id=? AND kind=? AND subject_id=?", t.profile, principal, m.NamespaceKind, m.NamespaceID).Scan(&namespaceID)
	if errors.Is(err, sql.ErrNoRows) {
		namespaceID = appapi.NewID("memory-namespace:")
		enabled := 0
		if m.NamespaceKind == "agent" {
			enabled = 1
		}
		if _, err = t.tx.ExecContext(ctx, "INSERT INTO memory_namespaces(namespace_id,profile_id,principal_id,kind,subject_id,enabled) VALUES(?,?,?,?,?,?)", namespaceID, t.profile, principal, m.NamespaceKind, m.NamespaceID, enabled); err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}
	if m.State != "active" {
		return "", fault("CAPABILITY_DENIED", "PORTABLE_FORGOTTEN_MEMORY_UNSUPPORTED")
	}
	digest := sha256.Sum256([]byte(m.Text))
	hash := "sha256:" + hex.EncodeToString(digest[:])
	// Memory revisions use the canonical content hash. The SQL adapter keeps
	// this local to storage and does not expose the hash implementation.
	if len(hash) == 0 {
		return "", appapi.Invalid("MEMORY_TEXT_REQUIRED")
	}
	revisionID := appapi.NewID("memory-revision:")
	var currentNamespace string
	var currentRevision int64
	lookupErr := t.tx.QueryRowContext(ctx, "SELECT namespace_id,revision FROM memory_items WHERE item_id=?", m.ID).Scan(&currentNamespace, &currentRevision)
	if errors.Is(lookupErr, sql.ErrNoRows) {
		if _, err = t.tx.ExecContext(ctx, "INSERT INTO memory_items(item_id,namespace_id,scope_kind,scope_id,state,pinned,head_revision_id,revision) VALUES(?,?,?,?, 'active',?,?,1)", m.ID, namespaceID, m.ScopeKind, m.ScopeID, m.Pinned, revisionID); err != nil {
			return "", mapSQLiteConflict(err, "MEMORY_IMPORT_FAILED")
		}
	} else if lookupErr != nil {
		return "", lookupErr
	} else {
		if currentNamespace != namespaceID {
			return "", fault("CONFLICT", "MEMORY_NAMESPACE_CONFLICT")
		}
		if _, err = t.tx.ExecContext(ctx, "UPDATE memory_items SET scope_kind=?,scope_id=?,state='active',pinned=?,head_revision_id=?,revision=? WHERE item_id=?", m.ScopeKind, m.ScopeID, m.Pinned, revisionID, currentRevision+1, m.ID); err != nil {
			return "", err
		}
	}
	sources := make([]appapi.SourceSnapshot, 0, len(m.SourceRefs))
	for _, source := range m.SourceRefs {
		sources = append(sources, appapi.SourceSnapshot{Kind: source.Kind, ResourceID: source.ID, Revision: source.Revision, Hash: source.Hash})
	}
	sourceJSON, _ := json.Marshal(sources)
	if sourceJSON == nil {
		sourceJSON = []byte("[]")
	}
	// Portable provenance is intentionally restricted to the stable enum.
	if m.Provenance != "observation" && m.Provenance != "inference" && m.Provenance != "user" {
		return "", appapi.Invalid("INVALID_MEMORY_PROVENANCE")
	}
	ordinal := int64(1)
	if !errors.Is(lookupErr, sql.ErrNoRows) {
		if err = t.tx.QueryRowContext(ctx, "SELECT ordinal+1 FROM memory_revisions WHERE item_id=? ORDER BY ordinal DESC LIMIT 1", m.ID).Scan(&ordinal); err != nil {
			return "", err
		}
	}
	if _, err = t.tx.ExecContext(ctx, "INSERT INTO memory_revisions(revision_id,item_id,ordinal,content_hash,provenance,creator_kind,creator_agent_id,job_id,source_json,scope_json,derived_json,created_at) VALUES(?,?,?, ?,?,'user','','',?,'[]','[]',?)", revisionID, m.ID, ordinal, hash, m.Provenance, string(sourceJSON), time.Now().UTC().Format(time.RFC3339Nano)); err != nil {
		return "", err
	}
	if _, err = t.tx.ExecContext(ctx, "INSERT INTO memory_revision_bodies(revision_id,text) VALUES(?,?)", revisionID, m.Text); err != nil {
		return "", err
	}
	validity := int64(1)
	if !errors.Is(lookupErr, sql.ErrNoRows) {
		validity = currentRevision + 1
	}
	if _, err = t.tx.ExecContext(ctx, "INSERT INTO memory_index(item_id,revision_id,validity_revision) VALUES(?,?,?) ON CONFLICT(item_id) DO UPDATE SET revision_id=excluded.revision_id,validity_revision=excluded.validity_revision", m.ID, revisionID, validity); err != nil {
		return "", err
	}
	return m.ID, nil
}

func (t *transaction) Commit(ctx context.Context) (string, error) {
	if t.closed {
		return "", fault("CONFLICT", "IMPORT_TRANSACTION_CLOSED")
	}
	if _, err := t.tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807"); err != nil {
		_ = t.tx.Rollback()
		t.closed = true
		return "", err
	}
	if err := t.tx.Commit(); err != nil {
		t.closed = true
		return "", err
	}
	t.closed = true
	return appapi.NewID("portable-receipt:"), nil
}

func (t *transaction) Rollback(_ context.Context) error {
	if t.closed {
		return nil
	}
	t.closed = true
	return t.tx.Rollback()
}

func mapSQLiteConflict(err error, reason string) error {
	if err == nil {
		return nil
	}
	if strings.Contains(strings.ToLower(err.Error()), "unique") {
		return fault("CONFLICT", reason)
	}
	return err
}
