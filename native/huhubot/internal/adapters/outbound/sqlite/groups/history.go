package groups

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	direct "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
)

func (s *Store) ModelHistoryPage(ctx context.Context, id api.RequestIdentity, q api.HistoryQuery, current api.RunAccessInput) (direct.HistoryPage, error) {
	out := direct.HistoryPage{Page: api.MessagePage{Items: []api.VisibleMessage{}}, Access: map[string]api.RunAccessInput{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.ReadSession(ctx, tx, id, q.ProfileID, q.SessionID); e != nil {
			return e
		}
		if current.Group == nil || current.Group.SessionID != q.SessionID || len(current.Group.Members) == 0 {
			return api.Denied("GROUP_CONTEXT_REQUIRED")
		}
		if e := CheckInTx(ctx, tx, id, current, false, nil); e != nil {
			return e
		}
		limit, e := conv.Limit(q.Limit)
		if e != nil {
			return e
		}
		before := int64(1<<63 - 1)
		if q.Cursor != "" {
			cur, e := conv.DecodeCursor(q.Cursor)
			if e != nil {
				return e
			}
			if cur.SessionID != q.SessionID {
				return api.Invalid("CURSOR_SESSION_MISMATCH")
			}
			before, e = strconv.ParseInt(cur.After, 10, 64)
			if e != nil || before < 1 {
				return api.Invalid("INVALID_CURSOR")
			}
		}
		predicate := ""
		args := []any{q.SessionID, before}
		audience := current.Recipient.AgentID
		if current.Recipient.SubjectKind == "temporary" {
			audience = current.Recipient.SponsorAgentID
		}
		var audienceMember *api.GroupMemberIdentity
		for _, m := range current.Group.Members {
			if m.AgentID == audience {
				copy := m
				audienceMember = &copy
			}
		}
		if audienceMember == nil {
			return nil
		}
		for _, m := range []api.GroupMemberIdentity{*audienceMember} {
			var joined int64
			var raw string
			if e = tx.QueryRowContext(ctx, "SELECT join_seq,history_json FROM conversation_members WHERE session_id=? AND agent_id=? AND active=1 AND incarnation=? AND history_revision=?", q.SessionID, m.AgentID, m.Incarnation, m.HistoryRevision).Scan(&joined, &raw); e != nil {
				return e
			}
			var scope api.GroupHistoryScope
			if json.Unmarshal([]byte(raw), &scope) != nil {
				return fault("CONFLICT", "GROUP_HISTORY_INVALID")
			}
			if scope.Kind == "none" {
				predicate += " AND seq>=?"
				args = append(args, joined)
			} else if scope.Kind == "range" {
				a, e := strconv.ParseInt(scope.AfterSeq, 10, 64)
				if e != nil {
					return fault("CONFLICT", "GROUP_HISTORY_INVALID")
				}
				b, e := strconv.ParseInt(scope.ThroughSeq, 10, 64)
				if e != nil || a < 0 || b <= a {
					return fault("CONFLICT", "GROUP_HISTORY_INVALID")
				}
				predicate += " AND (seq>=? OR (seq>? AND seq<=?))"
				args = append(args, joined, a, b)
			} else {
				return fault("CONFLICT", "GROUP_HISTORY_INVALID")
			}
		}
		args = append(args, limit+1)
		rows, e := tx.QueryContext(ctx, "SELECT message_id,run_id,session_id,CAST(seq AS TEXT),role,text,created_at,agent_id,source_json,partial,supersedes_message_id FROM conversation_messages WHERE session_id=? AND seq<?"+predicate+" ORDER BY seq DESC LIMIT ?", args...)
		if e != nil {
			return e
		}
		items := []api.VisibleMessage{}
		runs := []string{}
		seen := map[string]bool{}
		for rows.Next() {
			var m api.VisibleMessage
			var sources string
			if e = rows.Scan(&m.ID, &m.RunID, &m.SessionID, &m.Seq, &m.Role, &m.Text, &m.CreatedAt, &m.AgentID, &sources, &m.Partial, &m.SupersedesMessageID); e != nil {
				rows.Close()
				return e
			}
			if json.Unmarshal([]byte(sources), &m.SourceRefs) != nil || m.SourceRefs == nil {
				rows.Close()
				return fault("CONFLICT", "MESSAGE_CONTEXT_INVALID")
			}
			items = append(items, m)
			if !seen[m.RunID] {
				seen[m.RunID] = true
				runs = append(runs, m.RunID)
			}
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if len(items) > limit {
			items = items[:limit]
			out.Page.NextCursor = conv.EncodeCursor(conv.Cursor{After: items[len(items)-1].Seq, SessionID: q.SessionID})
		}
		access, e := execution.ReadAccessBatchInTx(ctx, tx, id, q.ProfileID, runs)
		if e != nil && len(runs) > 0 {
			return e
		}
		for i := len(items) - 1; i >= 0; i-- {
			m := items[i]
			in := access[m.RunID]
			if len(m.SourceRefs) > 0 {
				target := current
				target.Sources = m.SourceRefs
				target.Scopes = in.Scopes
				selecter, ok := s.access.(interface {
					SelectInTx(context.Context, *sql.Tx, api.RequestIdentity, api.RunAccessInput, string, []string) ([]string, error)
				})
				if !ok {
					return api.Denied("ACCESS_NOT_ASSEMBLED")
				}
				grants, e := selecter.SelectInTx(ctx, tx, id, target, "", []string{"read", "send"})
				if e != nil {
					var f *api.Fault
					if errors.As(e, &f) && f.Kind == "CAPABILITY_DENIED" {
						continue
					}
					return e
				}
				in.GrantIDs = grants
			}
			out.Page.Items = append(out.Page.Items, m)
			out.Access[m.ID] = in
		}
		return nil
	})
	return out, e
}

// FilterAttachments leaves the user's own text intact. Labels require a real
// child of that owned orchestration root and current read coverage; no Agent A
// or fabricated root recipient participates in this proof.
func (s *Store) FilterAttachments(ctx context.Context, id api.RequestIdentity, profile string, items []api.VisibleMessage) ([]api.VisibleMessage, error) {
	out := append([]api.VisibleMessage{}, items...)
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		for i := range out {
			m := &out[i]
			if m.Attachments == nil {
				continue
			}
			if m.Role != "user" {
				return fault("CONFLICT", "MESSAGE_ATTACHMENTS_INVALID")
			}
			selected, e := s.filterAttachmentsInTx(ctx, tx, id, profile, m.ID, *m.Attachments)
			if e != nil {
				return e
			}
			m.Attachments = selected
		}
		return nil
	})
	return out, e
}
func (s *Store) filterAttachmentsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, message string, labels api.MessageAttachments) (*api.MessageAttachments, error) {
	var root, session, raw string
	e := tx.QueryRowContext(ctx, "SELECT m.run_id,m.session_id,m.attachments_json FROM conversation_messages m JOIN execution_runs r ON r.run_id=m.run_id JOIN conversation_sessions s ON s.session_id=m.session_id WHERE m.message_id=? AND m.role='user' AND r.execution_role='orchestration' AND s.profile_id=? AND s.principal_id=?", message, profile, id.PrincipalID()).Scan(&root, &session, &raw)
	if e != nil {
		return nil, e
	}
	var actual *api.MessageAttachments
	if json.Unmarshal([]byte(raw), &actual) != nil || actual == nil {
		return nil, fault("CONFLICT", "MESSAGE_ATTACHMENTS_INVALID")
	}
	// Labels passed to the physical fence may be a filtered subset, never caller-
	// supplied new references. Compare full snapshot identity, including origin.
	if !attachmentsSubset(labels, *actual) {
		return nil, api.Denied("MESSAGE_ATTACHMENTS_CHANGED")
	}
	rows, e := tx.QueryContext(ctx, "SELECT run_id FROM execution_runs WHERE parent_run_id=? AND admission_kind='user_batch' AND session_id=?", root, session)
	if e != nil {
		return nil, e
	}
	runs := []string{}
	for rows.Next() {
		var run string
		if e = rows.Scan(&run); e != nil {
			rows.Close()
			return nil, e
		}
		runs = append(runs, run)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, e
	}
	access, e := execution.ReadAccessBatchInTx(ctx, tx, id, profile, runs)
	if e != nil {
		return nil, e
	}
	out := &api.MessageAttachments{SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}}
	for _, source := range labels.SourceRefs {
		for _, run := range runs {
			in := access[run]
			if !containsSource(in.Sources, source) {
				continue
			}
			in.Sources = []api.SourceSnapshot{source}
			in.Scopes = nil
			if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read"}); e == nil {
				out.SourceRefs = append(out.SourceRefs, source)
				break
			}
			var f *api.Fault
			if !errors.As(e, &f) || f.Kind != "CAPABILITY_DENIED" && !(f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
				return nil, e
			}
		}
	}
	for _, scope := range labels.SourceScopes {
		for _, run := range runs {
			in := access[run]
			if !containsScope(in.Scopes, scope) {
				continue
			}
			in.Sources = nil
			in.Scopes = []api.SourceScope{scope}
			if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read"}); e == nil {
				out.SourceScopes = append(out.SourceScopes, scope)
				break
			}
			var f *api.Fault
			if !errors.As(e, &f) || f.Kind != "CAPABILITY_DENIED" && !(f.Kind == "NOT_FOUND" && f.Reason == "GRANT_NOT_FOUND") {
				return nil, e
			}
		}
	}
	if len(out.SourceRefs)+len(out.SourceScopes) == 0 {
		return nil, nil
	}
	return out, nil
}
