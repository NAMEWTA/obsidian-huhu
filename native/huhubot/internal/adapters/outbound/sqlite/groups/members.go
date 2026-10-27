package groups

import (
	"context"
	"database/sql"
	"encoding/json"
	"strconv"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func (s *Store) UpdateMembers(ctx context.Context, id api.RequestIdentity, c api.SessionMembersUpdate, hash string) (api.Session, error) {
	var out api.Session
	canceled := []string{}
	err := s.access.WithReadFence(ctx, func(permit context.Context) error {
		return s.base.WithinTx(permit, func(tx *sql.Tx) error {
			if _, e := conv.Epoch(permit, tx, c.CommandMeta); e != nil {
				return e
			}
			found, e := conv.Receipt(permit, tx, id, c.CommandMeta, "sessions.updateMembers", hash, &out)
			if e != nil || found {
				return e
			}
			out, e = conv.ReadSession(permit, tx, id, c.ProfileID, c.ID)
			if e != nil {
				return e
			}
			if out.Kind != "group" {
				return api.Invalid("GROUP_SESSION_REQUIRED")
			}
			if out.Revision != c.ExpectedRevision {
				return fault("CONFLICT", "REVISION_CONFLICT")
			}
			wanted := map[string]bool{}
			for _, a := range c.MemberIDs {
				wanted[a] = true
			}
			if !wanted[out.CoordinatorID] {
				return api.Invalid("GROUP_COORDINATOR_NOT_MEMBER")
			}
			if e = validateHistory(permit, tx, c.ID, c.HistoryScope); e != nil {
				return e
			}
			var head int64
			if e = tx.QueryRowContext(permit, "SELECT message_seq FROM conversation_sessions WHERE session_id=?", c.ID).Scan(&head); e != nil {
				return e
			}
			if head == 1<<63-1 {
				return fault("RESOURCE_LIMIT", "MESSAGE_SEQUENCE_EXHAUSTED")
			}
			current := map[string]bool{}
			for _, a := range out.MemberIDs {
				current[a] = true
			}
			for _, a := range c.MemberIDs {
				if current[a] {
					continue
				}
				if e = s.enabled(permit, tx, c.ProfileID, a); e != nil {
					return e
				}
				r, e := tx.ExecContext(permit, "INSERT INTO conversation_members(session_id,agent_id,active,incarnation,history_revision,history_json,join_seq) VALUES(?,?,1,?,1,?,?) ON CONFLICT(session_id,agent_id) DO UPDATE SET active=1,incarnation=CAST(CAST(conversation_members.incarnation AS INTEGER)+1 AS TEXT),history_revision=conversation_members.history_revision+1,history_json=excluded.history_json,join_seq=excluded.join_seq WHERE conversation_members.history_revision<9223372036854775807 AND CAST(conversation_members.incarnation AS INTEGER)<9223372036854775807", c.ID, a, "1", encode(c.HistoryScope), head+1)
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
			}
			removed := map[string]string{}
			for _, a := range out.MemberIDs {
				if wanted[a] {
					continue
				}
				m, e := member(permit, tx, c.ID, a)
				if e != nil {
					return e
				}
				removed[a] = m.Incarnation
				if _, e = tx.ExecContext(permit, "UPDATE conversation_members SET active=0 WHERE session_id=? AND agent_id=? AND incarnation=?", c.ID, a, m.Incarnation); e != nil {
					return e
				}
			}
			if len(removed) > 0 {
				rows, e := tx.QueryContext(permit, "SELECT run_id,parent_run_id,group_binding_json FROM execution_runs WHERE session_id=? AND group_binding_json<>'null' AND status NOT IN('succeeded','failed','canceled')", c.ID)
				if e != nil {
					return e
				}
				type pending struct{ id, parent string }
				selected := []pending{}
				seen := map[string]bool{}
				for rows.Next() {
					var run, parent, raw string
					if e = rows.Scan(&run, &parent, &raw); e != nil {
						rows.Close()
						return e
					}
					var b api.GroupBinding
					if json.Unmarshal([]byte(raw), &b) != nil || b.SessionID != c.ID {
						rows.Close()
						return fault("CONFLICT", "GROUP_BINDING_INVALID")
					}
					for _, m := range b.Members {
						if inc, ok := removed[m.AgentID]; ok && inc == m.Incarnation {
							selected = append(selected, pending{run, parent})
							seen[run] = true
							break
						}
					}
				}
				e = rows.Err()
				rows.Close()
				if e != nil {
					return e
				}
				if len(selected) > 0 && (s.canceler == nil || s.control == nil) {
					return api.Denied("GROUP_CANCEL_NOT_ASSEMBLED")
				}
				for _, p := range selected {
					if seen[p.parent] {
						continue
					}
					ids, e := s.canceler.CancelSubtreeInTx(permit, tx, id, c.ProfileID, p.id)
					if e != nil {
						return e
					}
					canceled = append(canceled, ids...)
				}
			}
			r, e := tx.ExecContext(permit, "UPDATE conversation_sessions SET revision=revision+1 WHERE session_id=? AND revision=? AND revision<9223372036854775807", c.ID, c.ExpectedRevision)
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
			out, e = conv.ReadSession(permit, tx, id, c.ProfileID, c.ID)
			if e != nil {
				return e
			}
			if e = bumpUsage(permit, tx); e != nil {
				return e
			}
			if e = conv.Bump(permit, tx); e != nil {
				return e
			}
			return conv.SaveReceipt(permit, tx, id, c.CommandMeta, "sessions.updateMembers", hash, "", out)
		})
	})
	if err == nil {
		for _, run := range canceled {
			s.control.CancelRun(run)
		}
	}
	return out, err
}

func historyContains(scope api.GroupHistoryScope, joined, seq int64) bool {
	if seq >= joined {
		return true
	}
	if scope.Kind != "range" {
		return false
	}
	after, e := strconv.ParseInt(scope.AfterSeq, 10, 64)
	if e != nil {
		return false
	}
	through, e := strconv.ParseInt(scope.ThroughSeq, 10, 64)
	return e == nil && seq > after && seq <= through
}
