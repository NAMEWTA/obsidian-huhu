package collaboration

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type proposalCursor struct{ Profile, Principal, Run, Epoch, After string }

func (s *Store) Proposals(ctx context.Context, id api.RequestIdentity, q api.DiscoverQuery) (out api.AgentProposalPage, err error) {
	out.Items = []api.AgentProposal{}
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	if _, bound := delegate.Execution(ctx); bound {
		return out, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	err = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		profile, e := conv.Metadata(ctx, tx, q.ProfileID)
		if e != nil {
			return e
		}
		limit, e := conv.Limit(q.Limit)
		if e != nil {
			return e
		}
		cursor := proposalCursor{Profile: q.ProfileID, Principal: id.PrincipalID(), Run: q.RunID, Epoch: profile.CommandEpoch}
		if q.Cursor != "" {
			data, e := base64.RawURLEncoding.DecodeString(q.Cursor)
			if e != nil || len(data) > 2048 {
				return api.Invalid("INVALID_CURSOR")
			}
			var saved proposalCursor
			if json.Unmarshal(data, &saved) != nil {
				return api.Invalid("INVALID_CURSOR")
			}
			after := saved.After
			saved.After = ""
			if saved != cursor {
				return fail("CURSOR_EXPIRED", "PROPOSAL_QUERY_CHANGED")
			}
			cursor.After = after
		}
		if q.RunID != "" {
			_, access, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: q.RunID})
			if e != nil {
				return e
			}
			if e = s.access.CheckInTx(ctx, tx, id, access, []string{"read"}); e != nil {
				return e
			}
		}
		query := "SELECT proposal_id,CAST(revision AS TEXT),draft_json,preview_hash,run_id,expires_at FROM collaboration_proposals WHERE profile_id=? AND principal_id=? AND state='pending' AND proposal_id>?"
		args := []any{q.ProfileID, id.PrincipalID(), cursor.After}
		if q.RunID != "" {
			query += " AND run_id=?"
			args = append(args, q.RunID)
		}
		query += " ORDER BY proposal_id LIMIT ?"
		args = append(args, limit+1)
		rows, e := tx.QueryContext(ctx, query, args...)
		if e != nil {
			return e
		}
		type row struct {
			proposal          api.AgentProposal
			body, run, expiry string
		}
		all := []row{}
		for rows.Next() {
			var r row
			if e = rows.Scan(&r.proposal.ProposalID, &r.proposal.Revision, &r.body, &r.proposal.PreviewHash, &r.run, &r.expiry); e != nil {
				rows.Close()
				return e
			}
			all = append(all, r)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		more := len(all) > limit
		if more {
			all = all[:limit]
		}
		for _, item := range all {
			expiry, e := time.Parse(time.RFC3339Nano, item.expiry)
			if e != nil {
				return fail("CONFLICT", "PROPOSAL_STATE_INVALID")
			}
			if !time.Now().Before(expiry) {
				cursor.After = item.proposal.ProposalID
				continue
			}
			e = s.proposalOriginInTx(ctx, tx, id, q.ProfileID, item.run)
			if e != nil {
				var f *api.Fault
				if errors.As(e, &f) && (f.Kind == "CAPABILITY_DENIED" || f.Kind == "NOT_FOUND" || f.Kind == "SOURCE_CHANGED") {
					cursor.After = item.proposal.ProposalID
					continue
				}
				return e
			}
			if json.Unmarshal([]byte(item.body), &item.proposal.Draft) != nil || hashText(item.body) != item.proposal.PreviewHash {
				return fail("CONFLICT", "PROPOSAL_STATE_INVALID")
			}
			candidate := append(append([]api.AgentProposal{}, out.Items...), item.proposal)
			if len(encode(candidate))+4096 > 524288 {
				if len(out.Items) == 0 {
					return fail("RESOURCE_LIMIT", "PROPOSAL_PAGE_TOO_LARGE")
				}
				more = true
				break
			}
			out.Items = candidate
			out.DeliverySubjects = append(out.DeliverySubjects, api.DeliverySubject{Kind: "run", ID: item.run})
			cursor.After = item.proposal.ProposalID
		}
		if more {
			out.NextCursor = base64.RawURLEncoding.EncodeToString([]byte(encode(cursor)))
		}
		return nil
	})
	return
}
func (s *Store) RejectProposal(ctx context.Context, id api.RequestIdentity, q api.ConfirmProposal) (out api.Receipt, err error) {
	if _, bound := delegate.Execution(ctx); bound {
		return out, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	if err = commands.Validate(id, q.CommandMeta, true); err != nil {
		return out, err
	}
	err = s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, q.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(q)
		found, e := conv.Receipt(ctx, tx, id, q.CommandMeta, "collaboration.rejectProposal", hash, &out)
		if e != nil || found {
			return e
		}
		_, e = s.pendingProposalInTx(ctx, tx, id, q)
		if e != nil {
			return e
		}

		if _, e = tx.ExecContext(ctx, "UPDATE collaboration_proposals SET state='rejected',revision=revision+1 WHERE proposal_id=?", q.ProposalID); e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		out = api.Receipt{CommandID: q.CommandID, ReceiptID: api.NewID("receipt:"), Revision: nextProposalRevision(q.ExpectedRevision)}
		return conv.SaveReceipt(ctx, tx, id, q.CommandMeta, "collaboration.rejectProposal", hash, "", out)
	})
	return
}
func nextProposalRevision(revision string) string {
	n, _ := strconv.ParseInt(revision, 10, 64)
	return strconv.FormatInt(n+1, 10)
}

func (s *Store) pendingProposalInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, q api.ConfirmProposal) (string, error) {
	var body, preview, state, expiry, principal, revision, origin string
	err := tx.QueryRowContext(ctx, "SELECT draft_json,preview_hash,state,expires_at,principal_id,CAST(revision AS TEXT),run_id FROM collaboration_proposals WHERE proposal_id=? AND profile_id=?", q.ProposalID, q.ProfileID).Scan(&body, &preview, &state, &expiry, &principal, &revision, &origin)
	if errors.Is(err, sql.ErrNoRows) {
		return "", fail("NOT_FOUND", "PROPOSAL_NOT_FOUND")
	}
	if err != nil {
		return "", err
	}
	if principal != id.PrincipalID() {
		return "", api.Denied("PROPOSAL_READ_DENIED")
	}
	until, err := time.Parse(time.RFC3339Nano, expiry)
	if err != nil || hashText(body) != preview {
		return "", fail("CONFLICT", "PROPOSAL_STATE_INVALID")
	}
	if state != "pending" || revision != q.ExpectedRevision || preview != q.PreviewHash || !time.Now().Before(until) {
		return "", fail("CONFLICT", "PROPOSAL_CHANGED")
	}
	if err = s.proposalOriginInTx(ctx, tx, id, q.ProfileID, origin); err != nil {
		return "", err
	}
	return body, nil
}
func (s *Store) proposalOriginInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, origin string) error {
	_, access, err := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: origin})
	if err != nil {
		return err
	}
	return s.access.CheckInTx(ctx, tx, id, access, []string{"read"})
}
