package groups

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// PublicMessageVisibleInTx is an explicit selection boundary. External helpers
// do not get an automatic transcript, but may carry a message explicitly chosen
// under the initiating member's still-current group history authorization.
func PublicMessageVisibleInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, message string) (bool, error) {
	if in.Group == nil {
		return false, nil
	}
	if e := CheckInTx(ctx, tx, id, in, false, nil); e != nil {
		return false, e
	}
	var seq int64
	var role string
	var public bool
	e := tx.QueryRowContext(ctx, "SELECT m.seq,m.role,EXISTS(SELECT 1 FROM group_publications p WHERE p.message_id=m.message_id) FROM conversation_messages m WHERE m.message_id=? AND m.session_id=?", message, in.Group.SessionID).Scan(&seq, &role, &public)
	if errors.Is(e, sql.ErrNoRows) {
		return false, nil
	}
	if e != nil {
		return false, e
	}
	if role != "user" && !public {
		return false, fault("CONFLICT", "GROUP_PUBLICATION_NOT_FOUND")
	}
	audience := in.Recipient.AgentID
	if in.Recipient.SubjectKind == "temporary" {
		audience = in.Recipient.SponsorAgentID
	}
	var bound *api.GroupMemberIdentity
	for _, m := range in.Group.Members {
		if m.AgentID == audience {
			copy := m
			bound = &copy
		}
	}
	if bound == nil && len(in.Group.Members) > 0 {
		copy := in.Group.Members[0]
		bound = &copy
	}
	if bound == nil {
		return false, api.Denied("GROUP_CONTEXT_REQUIRED")
	}
	var joined int64
	var raw string
	if e = tx.QueryRowContext(ctx, "SELECT join_seq,history_json FROM conversation_members WHERE session_id=? AND agent_id=? AND active=1 AND incarnation=? AND history_revision=?", in.Group.SessionID, bound.AgentID, bound.Incarnation, bound.HistoryRevision).Scan(&joined, &raw); e != nil {
		return false, e
	}
	var scope api.GroupHistoryScope
	if json.Unmarshal([]byte(raw), &scope) != nil {
		return false, fault("CONFLICT", "GROUP_HISTORY_INVALID")
	}
	if !historyContains(scope, joined, seq) {
		return false, api.Denied("CONTEXT_MESSAGE_NOT_VISIBLE")
	}
	return true, nil
}
