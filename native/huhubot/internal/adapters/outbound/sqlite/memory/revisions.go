package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func itemMetadata(ctx context.Context, tx *sql.Tx, n namespace, id string) (api.MemoryItem, error) {
	out := api.MemoryItem{Namespace: n.Public}
	var actualNamespace string
	err := tx.QueryRowContext(ctx, "SELECT item_id,namespace_id,scope_kind,scope_id,state,pinned,head_revision_id,CAST(revision AS TEXT) FROM memory_items WHERE item_id=?", id).Scan(&out.ID, &actualNamespace, &out.Scope.Kind, &out.Scope.ID, &out.State, &out.Pinned, &out.RevisionID, &out.Revision)
	if err != nil {
		return out, missing(err, "MEMORY_NOT_FOUND")
	}
	if actualNamespace != n.ID {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if out.State == "forgotten" {
		out.RevisionID = ""
	}
	return out, nil
}
func revisionBody(ctx context.Context, tx *sql.Tx, revision string) (*api.MemoryBody, error) {
	var b api.MemoryBody
	var sources, scopes, derived string
	err := tx.QueryRowContext(ctx, "SELECT b.text,r.content_hash,r.provenance,r.creator_kind,r.creator_agent_id,r.job_id,r.source_json,r.scope_json,r.derived_json FROM memory_revisions r JOIN memory_revision_bodies b ON b.revision_id=r.revision_id WHERE r.revision_id=?", revision).Scan(&b.Text, &b.Hash, &b.Provenance, &b.CreatorKind, &b.CreatorAgentID, &b.JobID, &sources, &scopes, &derived)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, invalidState()
	}
	if err != nil {
		return nil, err
	}
	if json.Unmarshal([]byte(sources), &b.SourceRefs) != nil || b.SourceRefs == nil || json.Unmarshal([]byte(scopes), &b.SourceScopes) != nil || b.SourceScopes == nil || json.Unmarshal([]byte(derived), &b.Derived) != nil || b.Derived == nil || b.Hash != digest(b.Text) {
		return nil, invalidState()
	}
	return &b, nil
}

func (s *Store) qualify(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, targetRun string, subject grants.MemorySubject, ops []string) error {
	facts, err := s.ReadFactsInTx(ctx, tx, id, profile, []grants.MemorySubject{subject})
	if err != nil {
		return err
	}
	for _, requirement := range facts.Requirements {
		if _, err = s.access.CheckMemoryInTx(ctx, tx, id, profile, targetRun, requirement, ops); err != nil {
			return err
		}
	}
	return nil
}
func (s *Store) readItem(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, n namespace, itemID string) (api.MemoryItem, error) {
	out, err := itemMetadata(ctx, tx, n, itemID)
	if err != nil || out.State == "forgotten" {
		return out, err
	}
	if err = s.qualify(ctx, tx, id, n.Profile, "", grants.MemorySubject{Kind: "memory_revision", ID: out.RevisionID}, []string{"read"}); err != nil {
		return out, err
	}
	out.Body, err = revisionBody(ctx, tx, out.RevisionID)
	if err == nil && api.ValidateMemoryResult("memory.get", api.MemoryObject{Kind: "item", Item: &out}) != nil {
		err = invalidState()
	}
	return out, err
}
func (s *Store) receiptItem(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, out api.MemoryItem) error {
	if out.Body == nil {
		return nil
	}
	return s.qualify(ctx, tx, id, profile, "", grants.MemorySubject{Kind: "memory_revision", ID: out.RevisionID}, []string{"read"})
}

func revisionRef(n namespace, item api.MemoryItem) api.DerivedInput {
	thread := item.Scope.ID
	if thread == "" {
		thread = n.Profile
	}
	return api.DerivedInput{Kind: "memory_revision", ID: item.RevisionID, Revision: "1", Hash: item.Body.Hash, Namespace: n.ID, WorkThreadID: thread}
}
func insertDependencies(ctx context.Context, tx *sql.Tx, kind, owner, relation string, refs []api.DerivedInput) error {
	canonical, err := mergeRefs(nil, refs)
	if err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, "SELECT ancestor_kind,ancestor_id,ancestor_revision,content_hash,namespace,work_thread_id FROM memory_dependencies WHERE owner_kind=? AND owner_id=? AND relation=?", kind, owner, relation)
	if err != nil {
		return err
	}
	existing := map[ownerKey]api.DerivedInput{}
	for rows.Next() {
		var ref api.DerivedInput
		if err = rows.Scan(&ref.Kind, &ref.ID, &ref.Revision, &ref.Hash, &ref.Namespace, &ref.WorkThreadID); err != nil {
			rows.Close()
			return err
		}
		if !validRef(ref) {
			rows.Close()
			return invalidState()
		}
		if previous, ok := existing[refKey(ref)]; ok && previous != ref {
			rows.Close()
			return invalidState()
		}
		existing[refKey(ref)] = ref
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, ref := range canonical {
		if previous, ok := existing[refKey(ref)]; ok {
			if previous != ref {
				return invalidState()
			}
			continue
		}
		if _, err := tx.ExecContext(ctx, "INSERT INTO memory_dependencies(owner_kind,owner_id,ancestor_kind,ancestor_id,ancestor_revision,content_hash,namespace,work_thread_id,relation) VALUES(?,?,?,?,?,?,?,?,?)", kind, owner, ref.Kind, ref.ID, ref.Revision, ref.Hash, ref.Namespace, ref.WorkThreadID, relation); err != nil {
			return err
		}
	}
	return nil
}

func insertRevision(ctx context.Context, tx *sql.Tx, n namespace, item api.MemoryItem, ordinal int64) error {
	if item.Body == nil || api.ValidateMemoryResult("memory.correct", item) != nil {
		return invalidState()
	}
	b := item.Body
	if _, err := tx.ExecContext(ctx, "INSERT INTO memory_revisions(revision_id,item_id,ordinal,content_hash,provenance,creator_kind,creator_agent_id,job_id,source_json,scope_json,derived_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", item.RevisionID, item.ID, ordinal, b.Hash, b.Provenance, b.CreatorKind, b.CreatorAgentID, b.JobID, encode(b.SourceRefs), encode(b.SourceScopes), encode(b.Derived), time.Now().UTC().Format(api.TimestampLayout)); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO memory_revision_bodies(revision_id,text) VALUES(?,?)", item.RevisionID, b.Text); err != nil {
		return err
	}
	if err := insertDependencies(ctx, tx, "memory_revision", item.RevisionID, "origin", b.Derived); err != nil {
		return err
	}
	revision, err := strconv.ParseInt(item.Revision, 10, 64)
	if err != nil {
		return invalidState()
	}
	_, err = tx.ExecContext(ctx, "INSERT INTO memory_index(item_id,revision_id,validity_revision) VALUES(?,?,?) ON CONFLICT(item_id) DO UPDATE SET revision_id=excluded.revision_id,validity_revision=excluded.validity_revision", item.ID, item.RevisionID, revision)
	return err
}

func newItem(ctx context.Context, tx *sql.Tx, n namespace, scope api.MemoryScope, body api.MemoryBody) (api.MemoryItem, error) {
	out := api.MemoryItem{ID: api.NewID("memory-item:"), Revision: "1", RevisionID: api.NewID("memory-revision:"), Namespace: n.Public, Scope: scope, State: "active", Body: &body}
	_, err := tx.ExecContext(ctx, "INSERT INTO memory_items(item_id,namespace_id,scope_kind,scope_id,state,head_revision_id) VALUES(?,?,?,?,'active',?)", out.ID, n.ID, scope.Kind, scope.ID, out.RevisionID)
	if err == nil {
		err = insertRevision(ctx, tx, n, out, 1)
	}
	return out, err
}
func replaceItem(ctx context.Context, tx *sql.Tx, n namespace, old api.MemoryItem, body api.MemoryBody) (api.MemoryItem, error) {
	out := old
	var ordinal int64
	if err := tx.QueryRowContext(ctx, "SELECT max(ordinal) FROM memory_revisions WHERE item_id=?", old.ID).Scan(&ordinal); err != nil {
		return out, err
	}
	if ordinal == 9223372036854775807 {
		return out, fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	revision, err := strconv.ParseInt(old.Revision, 10, 64)
	if err != nil {
		return out, invalidState()
	}
	if revision == 9223372036854775807 {
		return out, fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	out.Body, out.RevisionID, out.Revision = &body, api.NewID("memory-revision:"), strconv.FormatInt(revision+1, 10)
	if err = changed(tx.ExecContext(ctx, "UPDATE memory_items SET head_revision_id=?,revision=revision+1 WHERE item_id=? AND revision=? AND revision<9223372036854775807 AND state='active'", out.RevisionID, old.ID, old.Revision)); err != nil {
		return out, err
	}
	if err = insertRevision(ctx, tx, n, out, ordinal+1); err != nil {
		return out, err
	}
	err = insertDependencies(ctx, tx, "memory_revision", out.RevisionID, "audit", []api.DerivedInput{revisionRef(n, old)})
	return out, err
}
