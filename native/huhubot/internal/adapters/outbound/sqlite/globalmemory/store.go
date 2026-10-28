// Package globalmemory persists fixed global-memory proposals. Confirmed facts
// are written only through the Memory-owned GlobalFactTx port.
package globalmemory

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type Store struct {
	base  *base.Store
	facts memory.GlobalFactTx
	now   func() time.Time
}

func New(b *base.Store, facts memory.GlobalFactTx, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{base: b, facts: facts, now: now}
}

func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func digest(v any) string {
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return "sha256:" + hex.EncodeToString(h[:])
}
func proposalHash(f memory.FrozenGlobal, expires string) string {
	return digest(struct {
		Frozen  memory.FrozenGlobal
		Expires string
	}{f, expires})
}

func proposalFromFrozen(id, revision, expires, state, preview string, f memory.FrozenGlobal) api.MemoryProposal {
	var body *api.MemoryBody
	if f.Body != nil {
		copy := *f.Body
		copy.SourceRefs = append([]api.SourceSnapshot(nil), f.Body.SourceRefs...)
		copy.SourceScopes = append([]api.SourceScope(nil), f.Body.SourceScopes...)
		copy.Derived = append([]api.DerivedInput(nil), f.Body.Derived...)
		body = &copy
	}
	return api.MemoryProposal{ID: id, Revision: revision, Operation: f.Operation, TargetItemID: targetID(f), TargetRevision: targetRevision(f), Scope: f.Scope, Body: body, PreviewHash: preview, ExpiresAt: expires, State: state}
}
func targetID(f memory.FrozenGlobal) string {
	if f.Target == nil {
		return ""
	}
	return f.Target.ItemID
}
func targetRevision(f memory.FrozenGlobal) string {
	if f.Target == nil {
		return ""
	}
	return f.Target.Revision
}

func commandHash(v any, frozen memory.FrozenGlobal) string {
	return commands.Hash(struct {
		Value  any
		Frozen memory.FrozenGlobal
	}{v, frozen})
}

func (s *Store) insert(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, meta api.CommandMeta, method, hash string, f memory.FrozenGlobal, proposal api.MemoryProposal) error {
	frozen, err := json.Marshal(f)
	if err != nil {
		return err
	}
	preview, err := json.Marshal(proposal)
	if err != nil {
		return err
	}
	catalog := int64(1)
	if f.CatalogRevision != "" {
		catalog, err = strconv.ParseInt(f.CatalogRevision, 10, 64)
		if err != nil || catalog < 1 {
			return fault("CONFLICT", "MEMORY_STATE_INVALID")
		}
	}
	namespace := f.NamespaceID
	if namespace == "" {
		return fault("CONFLICT", "MEMORY_STATE_INVALID")
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO memory_global_proposals
 (proposal_id,profile_id,principal_id,namespace_id,actor_kind,actor_run_id,actor_subject_id,operation,target_item_id,target_revision,target_revision_id,target_body_hash,catalog_revision,scope_kind,scope_id,frozen_json,preview_json,preview_hash,expires_at,state,revision,decided_receipt_key,created_at)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		proposal.ID, meta.ProfileID, id.PrincipalID(), namespace, f.Actor.Kind, f.Actor.RunID, f.Actor.SubjectID, f.Operation, targetID(f), targetRevisionInt(f), targetRevisionID(f), targetHash(f), catalog, f.Scope.Kind, f.Scope.ID, string(frozen), string(preview), proposal.PreviewHash, proposal.ExpiresAt, proposal.State, 1, "", s.now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return err
	}
	if err = conv.Bump(ctx, tx); err != nil {
		return err
	}
	return conv.SaveReceipt(ctx, tx, id, meta, method, hash, actorReceipt(f), proposal)
}
func targetRevisionInt(f memory.FrozenGlobal) int64 {
	if f.Target == nil {
		return 0
	}
	v, _ := strconv.ParseInt(f.Target.Revision, 10, 64)
	return v
}
func targetRevisionID(f memory.FrozenGlobal) string {
	if f.Target == nil {
		return ""
	}
	return f.Target.RevisionID
}
func targetHash(f memory.FrozenGlobal) string {
	if f.Target == nil {
		return ""
	}
	return f.Target.Hash
}
func actorReceipt(f memory.FrozenGlobal) string {
	if f.Actor.SubjectID != "" {
		return f.Actor.SubjectID
	}
	return f.Actor.Kind
}

func (s *Store) saveTerminalPreview(ctx context.Context, tx *sql.Tx, proposalID, currentRevision, state, expires, previewHash, receiptKey string, frozen memory.FrozenGlobal) error {
	nextRevision := strconv.FormatInt(parseRevision(currentRevision)+1, 10)
	preview, err := json.Marshal(proposalFromFrozen(proposalID, nextRevision, expires, state, previewHash, frozen))
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `UPDATE memory_global_proposals
 SET state=?,revision=?,preview_json=?,decided_receipt_key=?
 WHERE proposal_id=? AND state='pending' AND revision=?`, state, nextRevision, string(preview), receiptKey, proposalID, currentRevision)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return fault("CONFLICT", "GLOBAL_PROPOSAL_CHANGED")
	}
	return nil
}

func (s *Store) ProposeOwner(ctx context.Context, id api.RequestIdentity, q api.MemoryGlobalProposal) (api.MemoryProposal, error) {
	var out api.MemoryProposal
	if s == nil || s.base == nil || s.facts == nil {
		return out, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	if err := api.ValidateMemoryRequest("memory.proposeGlobal", q); err != nil {
		return out, err
	}
	return out, s.facts.WithGlobalTx(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, q.CommandMeta); err != nil {
			return err
		}
		f, err := s.facts.PrepareOwnerGlobalInTx(ctx, tx, id, q)
		if err != nil {
			return err
		}
		hash := commandHash(q, f)
		found, err := conv.Receipt(ctx, tx, id, q.CommandMeta, "memory.proposeGlobal", hash, &out)
		if err != nil || found {
			return err
		}
		expires := s.now().UTC().Add(10 * time.Minute).Format(time.RFC3339Nano)
		proposal := proposalFromFrozen(api.NewID("proposal:"), "1", expires, "pending", proposalHash(f, expires), f)
		out = proposal
		return s.insert(ctx, tx, id, q.CommandMeta, "memory.proposeGlobal", hash, f, proposal)
	})
}

func (s *Store) ProposeTool(ctx context.Context, x api.ToolExecution, callID string, draft api.GlobalMemoryToolDraft) (api.GlobalMemoryToolProposal, error) {
	var out api.GlobalMemoryToolProposal
	if s == nil || s.base == nil || s.facts == nil {
		return out, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	if err := api.ValidateGlobalMemoryToolCall(api.ToolCall{ID: callID, Name: "memory.proposeGlobal", GlobalMemory: &draft}); err != nil {
		return out, err
	}
	return out, s.facts.WithGlobalTx(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		f, err := s.facts.PrepareToolGlobalInTx(ctx, tx, x, callID, draft)
		if err != nil {
			return err
		}
		profile, e := conv.Metadata(ctx, tx, f.ProfileID)
		if e != nil {
			return e
		}
		meta := api.CommandMeta{CommandID: callID, IdempotencyKey: "tool:" + callID, ProfileID: f.ProfileID, CommandEpoch: profile.CommandEpoch}
		hash := commandHash(struct {
			Draft api.GlobalMemoryToolDraft
			Actor memory.GlobalActor
		}{draft, f.Actor}, f)
		var proposal api.MemoryProposal
		found, err := conv.Receipt(ctx, tx, idFromTool(x), meta, "memory.proposeGlobal.tool", hash, &proposal)
		if err != nil || found {
			if err == nil && found {
				out, err = api.GlobalMemoryToolProposalFrom(proposal)
			}
			return err
		}
		expires := s.now().UTC().Add(10 * time.Minute).Format(time.RFC3339Nano)
		proposal = proposalFromFrozen(api.NewID("proposal:"), "1", expires, "pending", proposalHash(f, expires), f)
		if err = s.insert(ctx, tx, idFromTool(x), meta, "memory.proposeGlobal.tool", hash, f, proposal); err != nil {
			return err
		}
		out, err = api.GlobalMemoryToolProposalFrom(proposal)
		return err
	})
}

func idFromTool(x api.ToolExecution) api.RequestIdentity { return x.Identity }

func (s *Store) ResolveOwner(ctx context.Context, id api.RequestIdentity, q api.MemoryResolve) (api.Receipt, error) {
	var out api.Receipt
	var decisionErr error
	if s == nil || s.base == nil || s.facts == nil {
		return out, api.Denied("GLOBAL_MEMORY_NOT_ASSEMBLED")
	}
	if err := api.ValidateMemoryRequest("memory.resolveGlobal", q); err != nil {
		return out, err
	}
	err := s.facts.WithGlobalTx(ctx, true, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := conv.Epoch(ctx, tx, q.CommandMeta); err != nil {
			return err
		}
		var oldHash, state, revision, frozenJSON, previewJSON, expires string
		err := tx.QueryRowContext(ctx, "SELECT preview_hash,state,CAST(revision AS TEXT),frozen_json,preview_json,expires_at FROM memory_global_proposals WHERE proposal_id=? AND profile_id=? AND principal_id=?", q.ID, q.ProfileID, id.PrincipalID()).Scan(&oldHash, &state, &revision, &frozenJSON, &previewJSON, &expires)
		if errors.Is(err, sql.ErrNoRows) {
			return fault("NOT_FOUND", "GLOBAL_PROPOSAL_NOT_FOUND")
		}
		if err != nil {
			return err
		}
		var frozen memory.FrozenGlobal
		if json.Unmarshal([]byte(frozenJSON), &frozen) != nil || frozen.InputDigest == "" {
			return fault("CONFLICT", "GLOBAL_PROPOSAL_INVALID")
		}
		hash := commandHash(q, frozen)
		found, err := conv.Receipt(ctx, tx, id, q.CommandMeta, "memory.resolveGlobal", hash, &out)
		if err != nil || found {
			return err
		}
		if state != "pending" || revision != q.ExpectedRevision || q.PreviewHash != oldHash || previewJSON == "" {
			return fault("CONFLICT", "GLOBAL_PROPOSAL_CHANGED")
		}
		if expiry, e := time.Parse(time.RFC3339Nano, expires); e != nil || !s.now().Before(expiry) {
			if err = s.saveTerminalPreview(ctx, tx, q.ID, revision, "expired", expires, oldHash, "", frozen); err != nil {
				return err
			}
			if err = conv.Bump(ctx, tx); err != nil {
				return err
			}
			decisionErr = fault("CONFLICT", "GLOBAL_PROPOSAL_EXPIRED")
			return nil
		}
		if _, err = s.facts.CheckGlobalPreviewInTx(ctx, tx, id, frozen); err != nil {
			var faultErr *api.Fault
			if !errors.As(err, &faultErr) {
				return err
			}
			if err = s.saveTerminalPreview(ctx, tx, q.ID, revision, "conflicted", expires, oldHash, "", frozen); err != nil {
				return err
			}
			if err = conv.Bump(ctx, tx); err != nil {
				return err
			}
			decisionErr = faultErr
			return nil
		}
		if q.Decision == "approve" {
			if _, err = s.facts.ApplyApprovedGlobalInTx(ctx, tx, id, frozen); err != nil {
				return err
			}
		}
		state = q.Decision
		if state == "approve" {
			state = "accepted"
		} else {
			state = "rejected"
		}
		out = api.Receipt{CommandID: q.CommandID, ReceiptID: api.NewID("receipt:"), Revision: strconv.FormatInt(parseRevision(revision)+1, 10)}
		if err = s.saveTerminalPreview(ctx, tx, q.ID, revision, state, expires, oldHash, out.ReceiptID, frozen); err != nil {
			return err
		}
		if err = conv.Bump(ctx, tx); err != nil {
			return err
		}
		return conv.SaveReceipt(ctx, tx, id, q.CommandMeta, "memory.resolveGlobal", hash, frozen.Actor.SubjectID, out)
	})
	if err == nil && decisionErr != nil {
		err = decisionErr
	}
	return out, err
}

func parseRevision(v string) int64 { n, _ := strconv.ParseInt(v, 10, 64); return n }

func (s *Store) readProposal(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, proposalID string) (api.MemoryProposal, memory.FrozenGlobal, string, error) {
	var out api.MemoryProposal
	var f memory.FrozenGlobal
	var revision, frozenJSON, previewJSON, previewHash, expires, state string
	err := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT),frozen_json,preview_json,preview_hash,expires_at,state FROM memory_global_proposals WHERE proposal_id=? AND profile_id=? AND principal_id=?", proposalID, profile, id.PrincipalID()).Scan(&revision, &frozenJSON, &previewJSON, &previewHash, &expires, &state)
	if errors.Is(err, sql.ErrNoRows) {
		return out, f, "", fault("NOT_FOUND", "GLOBAL_PROPOSAL_NOT_FOUND")
	}
	if err != nil {
		return out, f, "", err
	}
	if json.Unmarshal([]byte(frozenJSON), &f) != nil || json.Unmarshal([]byte(previewJSON), &out) != nil || out.ID != proposalID || out.PreviewHash != previewHash || out.ExpiresAt != expires || out.Revision != revision || out.State != state {
		return out, f, "", fault("CONFLICT", "GLOBAL_PROPOSAL_INVALID")
	}
	if state == "pending" {
		if _, err = s.facts.CheckGlobalPreviewInTx(ctx, tx, id, f); err != nil {
			return out, f, "", err
		}
	} else {
		// The persisted preview is retained for CAS/audit, but terminal reads
		// are body-free so rejected, expired, conflicted and accepted proposals
		// cannot re-enter recall or physical delivery as current facts.
		out.Body = nil
	}
	return out, f, revision, nil
}

func (s *Store) GetProposalInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, proposalID string) (api.MemoryProposal, error) {
	proposal, _, _, err := s.readProposal(ctx, tx, id, profile, proposalID)
	return proposal, err
}

func (s *Store) ListProposalsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.MemoryQuery) (api.MemoryPage, error) {
	limit := q.Limit
	if limit == 0 {
		limit = 20
	}
	if limit < 1 || limit > 50 {
		return api.MemoryPage{}, api.Invalid("INVALID_MEMORY_PARAMS")
	}
	if q.Namespace.Kind != "global" || q.Namespace.ID != q.ProfileID {
		return api.MemoryPage{}, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	if _, err := conv.Metadata(ctx, tx, q.ProfileID); err != nil {
		return api.MemoryPage{}, err
	}
	page := api.MemoryPage{NamespaceRevision: "1", Items: []api.MemoryObject{}}
	var profileRevision string
	if err := tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&profileRevision); err != nil {
		return page, err
	}
	page.NamespaceRevision = profileRevision
	rows, err := tx.QueryContext(ctx, "SELECT proposal_id FROM memory_global_proposals WHERE profile_id=? AND principal_id=? AND proposal_id>? ORDER BY proposal_id LIMIT ?", q.ProfileID, id.PrincipalID(), q.Cursor, limit+1)
	if err != nil {
		return page, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var proposalID string
		if err = rows.Scan(&proposalID); err != nil {
			return page, err
		}
		ids = append(ids, proposalID)
	}
	if err = rows.Err(); err != nil {
		return page, err
	}
	if len(ids) > limit {
		page.NextCursor = ids[limit-1]
		ids = ids[:limit]
	}
	for _, proposalID := range ids {
		proposal, err := s.GetProposalInTx(ctx, tx, id, q.ProfileID, proposalID)
		if err != nil {
			var f *api.Fault
			if errors.As(err, &f) && (f.Kind == "CAPABILITY_DENIED" || f.Kind == "NOT_FOUND") {
				continue
			}
			return page, err
		}
		page.Items = append(page.Items, api.MemoryObject{Kind: "proposal", Proposal: &proposal})
	}
	return page, nil
}

func (s *Store) ReadProposalDeadlineBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (time.Time, error) {
	if len(ids) == 0 || len(ids) > 800 {
		return time.Time{}, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	seen := map[string]bool{}
	deadline := time.Time{}
	for _, proposalID := range ids {
		if proposalID == "" || seen[proposalID] {
			return time.Time{}, api.Invalid("INVALID_EVENT_DELIVERY")
		}
		seen[proposalID] = true
		proposal, _, _, err := s.readProposal(ctx, tx, id, profile, proposalID)
		if err != nil {
			return time.Time{}, err
		}
		if proposal.State != "pending" || proposal.Body == nil {
			return time.Time{}, fault("CONFLICT", "MEMORY_PROPOSAL_NOT_PENDING")
		}
		expires, err := time.Parse(time.RFC3339Nano, proposal.ExpiresAt)
		if err != nil || !s.now().Before(expires) {
			return time.Time{}, fault("CONFLICT", "MEMORY_PROPOSAL_EXPIRED")
		}
		if deadline.IsZero() || expires.Before(deadline) {
			deadline = expires
		}
	}
	return deadline, nil
}
