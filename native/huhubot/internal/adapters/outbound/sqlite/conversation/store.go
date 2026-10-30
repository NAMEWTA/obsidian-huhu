package conversation

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	directapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/conversation/direct"
	"strconv"
	"time"
)

type Store struct{ Base *base.Store }

func New(base *base.Store) *Store     { return &Store{base} }
func Fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func Metadata(ctx context.Context, tx *sql.Tx, profileID string) (api.ProfileMetadata, error) {
	var p api.ProfileMetadata
	e := tx.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT),created_at FROM profile_metadata WHERE singleton=1").Scan(&p.ProfileID, &p.CommandEpoch, &p.Revision, &p.CreatedAt)
	if e == nil && p.ProfileID != profileID {
		e = api.Denied("PROFILE_MISMATCH")
	}
	return p, e
}
func Epoch(ctx context.Context, tx *sql.Tx, m api.CommandMeta) (api.ProfileMetadata, error) {
	p, e := Metadata(ctx, tx, m.ProfileID)
	if e == nil && p.CommandEpoch != m.CommandEpoch {
		e = Fault("CONFLICT", "COMMAND_EPOCH_CONFLICT")
	}
	if e == nil {
		e = base.CheckDataAdmission(ctx, tx)
	}
	return p, e
}
func Receipt(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, m api.CommandMeta, method, hash string, out any) (bool, error) {
	var oldHash, body string
	e := tx.QueryRowContext(ctx, "SELECT input_hash,result_json FROM command_receipts WHERE profile_id=? AND principal_id=? AND method=? AND idempotency_key=?", m.ProfileID, id.PrincipalID(), method, m.IdempotencyKey).Scan(&oldHash, &body)
	if errors.Is(e, sql.ErrNoRows) {
		return false, nil
	}
	if e != nil {
		return false, e
	}
	if oldHash != hash {
		return true, Fault("IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_INPUT_MISMATCH")
	}
	return true, json.Unmarshal([]byte(body), out)
}
func SaveReceipt(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, m api.CommandMeta, method, hash, agent string, out any) error {
	b, e := json.Marshal(out)
	if e != nil {
		return e
	}
	_, e = tx.ExecContext(ctx, "INSERT INTO command_receipts VALUES(?,?,?,?,?,?,?)", m.ProfileID, id.PrincipalID(), method, m.IdempotencyKey, hash, agent, string(b))
	return e
}
func Bump(ctx context.Context, tx *sql.Tx) error {
	r, e := tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1 AND revision<9223372036854775807")
	if e != nil {
		return e
	}
	n, e := r.RowsAffected()
	if e == nil && n != 1 {
		return Fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	return e
}
func ReadSession(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profileID, sessionID string) (api.Session, error) {
	var s api.Session
	var profile, principal string
	e := tx.QueryRowContext(ctx, "SELECT session_id,profile_id,principal_id,CAST(revision AS TEXT),kind,title,workspace_id,archived,coordinator_id FROM conversation_sessions WHERE session_id=?", sessionID).Scan(&s.ID, &profile, &principal, &s.Revision, &s.Kind, &s.Title, &s.WorkspaceID, &s.Archived, &s.CoordinatorID)
	if errors.Is(e, sql.ErrNoRows) {
		return s, Fault("NOT_FOUND", "SESSION_NOT_FOUND")
	}
	if e != nil {
		return s, e
	}
	if profile != profileID {
		return s, api.Denied("PROFILE_MISMATCH")
	}
	if principal != id.PrincipalID() {
		return s, api.Denied("SESSION_READ_DENIED")
	}
	rows, e := tx.QueryContext(ctx, "SELECT agent_id,CAST(incarnation AS TEXT),CAST(history_revision AS TEXT),history_json FROM conversation_members WHERE session_id=? AND active=1 ORDER BY agent_id", sessionID)
	if e != nil {
		return s, e
	}
	defer rows.Close()
	s.MemberIDs = []string{}
	for rows.Next() {
		var m api.GroupMember
		var history string
		if e = rows.Scan(&m.AgentID, &m.Incarnation, &m.HistoryRevision, &history); e != nil {
			return s, e
		}
		s.MemberIDs = append(s.MemberIDs, m.AgentID)
		if s.Kind == "group" {
			if json.Unmarshal([]byte(history), &m.HistoryScope) != nil {
				return s, Fault("CONFLICT", "GROUP_HISTORY_INVALID")
			}
			s.GroupMembers = append(s.GroupMembers, m)
		}
	}
	if e = rows.Err(); e != nil {
		return s, e
	}
	if len(s.MemberIDs) == 0 {
		return s, Fault("NOT_FOUND", "SESSION_NOT_FOUND")
	}
	return s, nil
}
func (s *Store) CreateSession(ctx context.Context, id api.RequestIdentity, c api.SessionCreate, hash string) (api.Session, error) {
	var out api.Session
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := Receipt(ctx, tx, id, c.CommandMeta, "sessions.create", hash, &out)
		if e != nil || found {
			return e
		}
		var enabled bool
		if e = tx.QueryRowContext(ctx, "SELECT enabled FROM agents WHERE agent_id=?", c.MemberIDs[0]).Scan(&enabled); errors.Is(e, sql.ErrNoRows) {
			return Fault("NOT_FOUND", "AGENT_NOT_FOUND")
		}
		if e != nil {
			return e
		}
		if !enabled {
			return Fault("CONFLICT", "AGENT_DISABLED")
		}
		out = api.Session{ID: api.NewID("session:"), Revision: "1", Kind: "direct", Title: c.Title, MemberIDs: append([]string(nil), c.MemberIDs...), WorkspaceID: c.WorkspaceID}
		if _, e = tx.ExecContext(ctx, "INSERT INTO conversation_sessions(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived) VALUES(?,?,?,'direct',?,?,1,0)", out.ID, c.ProfileID, id.PrincipalID(), c.Title, c.WorkspaceID); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO conversation_members(session_id,agent_id) VALUES(?,?)", out.ID, c.MemberIDs[0]); e != nil {
			return e
		}
		if e = Bump(ctx, tx); e != nil {
			return e
		}
		return SaveReceipt(ctx, tx, id, c.CommandMeta, "sessions.create", hash, c.MemberIDs[0], out)
	})
	return out, e
}
func (s *Store) GetSession(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Session, error) {
	var out api.Session
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := Metadata(ctx, tx, q.ProfileID); e != nil {
			return e
		}
		var e error
		out, e = ReadSession(ctx, tx, id, q.ProfileID, q.ID)
		return e
	})
	return out, e
}

type Cursor struct{ After, Revision, SessionID string }

func EncodeCursor(c Cursor) string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}
func DecodeCursor(v string) (Cursor, error) {
	var c Cursor
	b, e := base64.RawURLEncoding.DecodeString(v)
	if e != nil || json.Unmarshal(b, &c) != nil {
		return c, api.Invalid("INVALID_CURSOR")
	}
	return c, nil
}
func Limit(limit int) (int, error) {
	if limit == 0 {
		return 30, nil
	}
	if limit < 1 || limit > 100 {
		return 0, api.Invalid("INVALID_PAGE_LIMIT")
	}
	return limit, nil
}
func (s *Store) ListSessions(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.SessionPage, error) {
	out := api.SessionPage{Items: []api.Session{}}
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := Metadata(ctx, tx, q.ProfileID)
		if e != nil {
			return e
		}
		limit, e := Limit(q.Limit)
		if e != nil {
			return e
		}
		cur := Cursor{}
		if q.Cursor != "" {
			cur, e = DecodeCursor(q.Cursor)
			if e != nil {
				return e
			}
			if cur.Revision != p.Revision {
				return Fault("CURSOR_EXPIRED", "SESSIONS_CHANGED")
			}
		}
		rows, e := tx.QueryContext(ctx, "SELECT session_id FROM conversation_sessions WHERE profile_id=? AND principal_id=? AND body_deleted=0 AND session_id>? ORDER BY session_id LIMIT ?", q.ProfileID, id.PrincipalID(), cur.After, limit+1)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var v string
			if e = rows.Scan(&v); e != nil {
				_ = rows.Close()
				return e
			}
			ids = append(ids, v)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		if len(ids) > limit {
			ids = ids[:limit]
			out.NextCursor = EncodeCursor(Cursor{After: ids[len(ids)-1], Revision: p.Revision})
		}
		budget := 0
		for _, v := range ids {
			item, e := ReadSession(ctx, tx, id, q.ProfileID, v)
			if e != nil {
				return e
			}
			encoded, e := json.Marshal(item)
			if e != nil {
				return e
			}
			if len(encoded) > 524288 {
				return Fault("RESOURCE_LIMIT", "SESSION_TOO_LARGE")
			}
			if len(out.Items) > 0 && budget+len(encoded) > 524288 {
				out.NextCursor = EncodeCursor(Cursor{After: out.Items[len(out.Items)-1].ID, Revision: p.Revision})
				break
			}
			budget += len(encoded)
			out.Items = append(out.Items, item)
		}
		return nil
	})
	return out, e
}
func (s *Store) Archive(ctx context.Context, id api.RequestIdentity, c api.SessionArchive, hash string) (api.Session, error) {
	var out api.Session
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		found, e := Receipt(ctx, tx, id, c.CommandMeta, "sessions.archive", hash, &out)
		if e != nil || found {
			return e
		}
		out, e = ReadSession(ctx, tx, id, c.ProfileID, c.ID)
		if e != nil {
			return e
		}
		if out.Revision != c.ExpectedRevision {
			return Fault("CONFLICT", "REVISION_CONFLICT")
		}
		var active sql.NullString
		if e = tx.QueryRowContext(ctx, "SELECT active_run_id FROM conversation_sessions WHERE session_id=?", c.ID).Scan(&active); e != nil {
			return e
		}
		if active.Valid {
			return Fault("SESSION_BUSY", "SESSION_BUSY")
		}
		r, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET archived=1,revision=revision+1 WHERE session_id=? AND revision<9223372036854775807", c.ID)
		if e != nil {
			return e
		}
		n, _ := r.RowsAffected()
		if n != 1 {
			return Fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
		}
		out, e = ReadSession(ctx, tx, id, c.ProfileID, c.ID)
		if e != nil {
			return e
		}
		if e = Bump(ctx, tx); e != nil {
			return e
		}
		return SaveReceipt(ctx, tx, id, c.CommandMeta, "sessions.archive", hash, out.MemberIDs[0], out)
	})
	return out, e
}
func MessageInTx(ctx context.Context, tx *sql.Tx, sessionID, runID, role, text, agent string, sources []api.SourceSnapshot, partial bool, supersedes string) (string, error) {
	id := api.NewID("message:")
	source, _ := json.Marshal(sources)
	if sources == nil {
		source = []byte("[]")
	}
	if _, e := tx.ExecContext(ctx, "UPDATE conversation_sessions SET message_seq=message_seq+1 WHERE session_id=? AND message_seq<9223372036854775807", sessionID); e != nil {
		return "", e
	}
	_, e := tx.ExecContext(ctx, "INSERT INTO conversation_messages(message_id,run_id,session_id,seq,role,text,created_at,agent_id,source_json,partial,supersedes_message_id) SELECT ?,?,session_id,message_seq,?,?,?,?,?,?,? FROM conversation_sessions WHERE session_id=?", id, runID, role, text, time.Now().UTC().Format(api.TimestampLayout), agent, string(source), partial, supersedes, sessionID)
	return id, e
}
func (s *Store) History(ctx context.Context, id api.RequestIdentity, q api.HistoryQuery) (directapp.HistoryPage, error) {
	out := directapp.HistoryPage{Page: api.MessagePage{Items: []api.VisibleMessage{}}, Access: map[string]api.RunAccessInput{}}
	e := s.Base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := Metadata(ctx, tx, q.ProfileID); e != nil {
			return e
		}
		if _, e := ReadSession(ctx, tx, id, q.ProfileID, q.SessionID); e != nil {
			return e
		}
		limit, e := Limit(q.Limit)
		if e != nil {
			return e
		}
		before := int64(9223372036854775807)
		if q.Cursor != "" {
			cur, e := DecodeCursor(q.Cursor)
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
		rows, e := tx.QueryContext(ctx, "SELECT message_id,seq,role,text,created_at,agent_id,source_json,partial,supersedes_message_id,run_id,attachments_json FROM conversation_messages WHERE session_id=? AND seq<? ORDER BY seq DESC LIMIT ?", q.SessionID, before, limit+1)
		if e != nil {
			return e
		}
		seqs := []int64{}
		items := []api.VisibleMessage{}
		budget := 0
		more := false
		for rows.Next() {
			var m api.VisibleMessage
			var seq int64
			var source, attachments string
			m.SessionID = q.SessionID
			if e = rows.Scan(&m.ID, &seq, &m.Role, &m.Text, &m.CreatedAt, &m.AgentID, &source, &m.Partial, &m.SupersedesMessageID, &m.RunID, &attachments); e != nil {
				_ = rows.Close()
				return e
			}
			m.Seq = strconv.FormatInt(seq, 10)
			if e = json.Unmarshal([]byte(source), &m.SourceRefs); e != nil {
				_ = rows.Close()
				return e
			}
			if json.Unmarshal([]byte(attachments), &m.Attachments) != nil {
				_ = rows.Close()
				return Fault("CONFLICT", "MESSAGE_ATTACHMENTS_INVALID")
			}
			encoded, _ := json.Marshal(m)
			if len(items) >= limit || (len(items) > 0 && budget+len(encoded) > 524288) {
				more = true
				break
			}
			items = append(items, m)
			seqs = append(seqs, seq)
			budget += len(encoded)
		}
		e = rows.Err()
		_ = rows.Close()
		if e != nil {
			return e
		}
		if more && len(items) > 0 {
			out.Page.NextCursor = EncodeCursor(Cursor{After: strconv.FormatInt(seqs[len(seqs)-1], 10), SessionID: q.SessionID})
		}
		for i := len(items) - 1; i >= 0; i-- {
			m := items[i]
			out.Page.Items = append(out.Page.Items, m)
			if len(m.SourceRefs) > 0 {
				var recipient, sources, scopes, grants, runID, group string
				e = tx.QueryRowContext(ctx, "SELECT r.recipient_json,r.effective_source_json,r.effective_scope_json,r.effective_grants_json,r.run_id,r.group_binding_json FROM execution_runs r JOIN conversation_messages m ON m.run_id=r.run_id WHERE m.session_id=? AND m.message_id=?", q.SessionID, m.ID).Scan(&recipient, &sources, &scopes, &grants, &runID, &group)
				if e != nil {
					return e
				}
				input := api.RunAccessInput{ProfileID: q.ProfileID, SessionID: q.SessionID, TaskID: runID}
				if json.Unmarshal([]byte(recipient), &input.Recipient) != nil || json.Unmarshal([]byte(sources), &input.Sources) != nil || json.Unmarshal([]byte(scopes), &input.Scopes) != nil || json.Unmarshal([]byte(grants), &input.GrantIDs) != nil || json.Unmarshal([]byte(group), &input.Group) != nil {
					return Fault("CONFLICT", "RUN_CONTEXT_INVALID")
				}
				out.Access[m.ID] = input
			}
		}
		return nil
	})
	return out, e
}
