package groups

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"strconv"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// MemberFacts contains current rows from this SQL transaction, never cached
// permission decisions. Batch inputs must be the execution owner's DB values.
type MemberFacts struct {
	members      map[string]currentMember
	publications map[string]string
}
type currentMember struct {
	identity api.GroupMemberIdentity
	active   bool
}

func memberKey(session, agent string) string { return session + "\x00" + agent }
func LoadMemberFactsInTx(ctx context.Context, tx *sql.Tx, inputs []api.RunAccessInput) (*MemberFacts, error) {
	out := &MemberFacts{members: map[string]currentMember{}, publications: map[string]string{}}
	sessions, messages := []string{}, []string{}
	seenS, seenM := map[string]bool{}, map[string]bool{}
	for _, in := range inputs {
		if in.Group == nil {
			continue
		}
		if !seenS[in.Group.SessionID] {
			seenS[in.Group.SessionID] = true
			sessions = append(sessions, in.Group.SessionID)
		}
		if in.PublishedMessageID != "" && !seenM[in.PublishedMessageID] {
			seenM[in.PublishedMessageID] = true
			messages = append(messages, in.PublishedMessageID)
		}
	}
	for start := 0; start < len(sessions); start += 256 {
		end := min(start+256, len(sessions))
		args := []any{}
		for _, v := range sessions[start:end] {
			args = append(args, v)
		}
		rows, e := tx.QueryContext(ctx, "SELECT session_id,agent_id,incarnation,CAST(history_revision AS TEXT),active FROM conversation_members WHERE session_id IN("+strings.TrimSuffix(strings.Repeat("?,", end-start), ",")+")", args...)
		if e != nil {
			return nil, e
		}
		for rows.Next() {
			var session string
			var m currentMember
			if e = rows.Scan(&session, &m.identity.AgentID, &m.identity.Incarnation, &m.identity.HistoryRevision, &m.active); e != nil {
				rows.Close()
				return nil, e
			}
			out.members[memberKey(session, m.identity.AgentID)] = m
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
	}
	for start := 0; start < len(messages); start += 256 {
		end := min(start+256, len(messages))
		args := []any{}
		for _, v := range messages[start:end] {
			args = append(args, v)
		}
		rows, e := tx.QueryContext(ctx, "SELECT message_id,child_run_id FROM group_publications WHERE message_id IN("+strings.TrimSuffix(strings.Repeat("?,", end-start), ",")+")", args...)
		if e != nil {
			return nil, e
		}
		for rows.Next() {
			var message, run string
			if e = rows.Scan(&message, &run); e != nil {
				rows.Close()
				return nil, e
			}
			out.publications[message] = run
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
	}
	return out, nil
}
func validBinding(b *api.GroupBinding) bool {
	if b == nil || b.SessionID == "" || b.Members == nil || len(b.Members) > 100 {
		return false
	}
	seen := map[string]bool{}
	for _, m := range b.Members {
		if m.AgentID == "" || !positive(m.Incarnation) || !positive(m.HistoryRevision) || seen[m.AgentID] {
			return false
		}
		seen[m.AgentID] = true
	}
	return true
}

// CheckInTx also runs for source-free input. Only a persisted public message
// can waive the author's current membership for the owning user's history;
// callers must still perform its exact current source read authorization.
func CheckInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, in api.RunAccessInput, readOnly bool, facts *MemberFacts) error {
	b := in.Group
	if facts == nil {
		var raw, session, profile, principal, role, kind string
		e := tx.QueryRowContext(ctx, "SELECT r.group_binding_json,r.session_id,s.profile_id,r.principal_id,r.execution_role,s.kind FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", in.TaskID).Scan(&raw, &session, &profile, &principal, &role, &kind)
		if errors.Is(e, sql.ErrNoRows) && b == nil {
			return nil
		}
		if e != nil {
			return e
		}
		if profile != in.ProfileID || principal != id.PrincipalID() || session != in.SessionID {
			return api.Denied("RUN_SCOPE_MISMATCH")
		}
		var actual *api.GroupBinding
		if json.Unmarshal([]byte(raw), &actual) != nil {
			return fault("CONFLICT", "GROUP_BINDING_INVALID")
		}
		if !BindingContains(actual, b) || kind == "group" && actual == nil {
			return api.Denied("GROUP_BINDING_CHANGED")
		}
		if actual == nil {
			return nil
		}
		b = actual
		if !validBinding(b) || len(b.Members) == 0 && role != "orchestration" {
			return fault("CONFLICT", "GROUP_BINDING_INVALID")
		}
		var e2 error
		facts, e2 = LoadMemberFactsInTx(ctx, tx, []api.RunAccessInput{{Group: b, PublishedMessageID: in.PublishedMessageID}})
		if e2 != nil {
			return e2
		}
	}
	if b == nil {
		return nil
	}
	if !validBinding(b) || b.SessionID != in.SessionID {
		return fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	if in.PublishedMessageID != "" {
		if !readOnly {
			return api.Denied("GROUP_PUBLICATION_READ_ONLY")
		}
		if facts.publications[in.PublishedMessageID] == in.TaskID {
			return nil
		}
		// The root's source-free user message is separately owned by this Session.
		if len(b.Members) != 0 {
			return api.Denied("GROUP_PUBLICATION_NOT_FOUND")
		}
	}
	for _, bound := range b.Members {
		current, ok := facts.members[memberKey(b.SessionID, bound.AgentID)]
		if !ok || !current.active {
			return api.Denied("GROUP_MEMBER_REMOVED")
		}
		if current.identity != bound {
			return api.Denied("GROUP_MEMBER_GENERATION_CHANGED")
		}
	}
	return nil
}
func DeriveBindingInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, parent, child api.RunAccessInput) (*api.GroupBinding, error) {
	if parent.Group == nil {
		return nil, nil
	}
	if e := CheckInTx(ctx, tx, id, parent, false, nil); e != nil {
		return nil, e
	}
	out := &api.GroupBinding{SessionID: parent.Group.SessionID, Members: append([]api.GroupMemberIdentity{}, parent.Group.Members...)}
	if child.Recipient.SubjectKind != "temporary" {
		var inc, rev string
		var active bool
		e := tx.QueryRowContext(ctx, "SELECT incarnation,CAST(history_revision AS TEXT),active FROM conversation_members WHERE session_id=? AND agent_id=?", out.SessionID, child.Recipient.AgentID).Scan(&inc, &rev, &active)
		if e != nil && !errors.Is(e, sql.ErrNoRows) {
			return nil, e
		}
		if e == nil {
			if !active {
				return nil, api.Denied("GROUP_MEMBER_REMOVED")
			}
			m := api.GroupMemberIdentity{AgentID: child.Recipient.AgentID, Incarnation: inc, HistoryRevision: rev}
			found := false
			for _, old := range out.Members {
				if old.AgentID == m.AgentID {
					if old != m {
						return nil, api.Denied("GROUP_MEMBER_GENERATION_CHANGED")
					}
					found = true
				}
			}
			if !found {
				out.Members = append(out.Members, m)
			}
		}
	}
	if !validBinding(out) {
		return nil, api.Denied("GROUP_BINDING_LIMIT")
	}
	if e := PersistBindingInTx(ctx, tx, child.TaskID, out); e != nil {
		return nil, e
	}
	return out, nil
}

func positive(v string) bool {
	n, e := strconv.ParseInt(v, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == v
}

// UnionBinding preserves exact current identities. A conflicting old incarnation
// is a refusal, never an invitation to replace it with the current generation.
func UnionBinding(a, b *api.GroupBinding) (*api.GroupBinding, error) {
	if b == nil {
		return a, nil
	}
	if !validBinding(b) {
		return nil, fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	if a == nil {
		return nil, api.Denied("GROUP_SCOPE_MISMATCH")
	}
	if !validBinding(a) || a.SessionID != b.SessionID {
		return nil, api.Denied("GROUP_SCOPE_MISMATCH")
	}
	out := &api.GroupBinding{SessionID: a.SessionID, Members: append([]api.GroupMemberIdentity{}, a.Members...)}
	for _, m := range b.Members {
		found := false
		for _, old := range out.Members {
			if old.AgentID == m.AgentID {
				if old != m {
					return nil, api.Denied("GROUP_MEMBER_GENERATION_CHANGED")
				}
				found = true
			}
		}
		if !found {
			out.Members = append(out.Members, m)
		}
	}
	if !validBinding(out) {
		return nil, api.Denied("GROUP_BINDING_LIMIT")
	}
	return out, nil
}

// CheckMembersInTx consumes only a binding read from a durable private message
// or result, not a wire-supplied identity. Ownership is checked by that reader.
func CheckMembersInTx(ctx context.Context, tx *sql.Tx, b *api.GroupBinding) error {
	if b == nil {
		return nil
	}
	if !validBinding(b) {
		return fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	facts, e := LoadMemberFactsInTx(ctx, tx, []api.RunAccessInput{{Group: b}})
	if e != nil {
		return e
	}
	for _, m := range b.Members {
		current, ok := facts.members[memberKey(b.SessionID, m.AgentID)]
		if !ok || !current.active {
			return api.Denied("GROUP_MEMBER_REMOVED")
		}
		if current.identity != m {
			return api.Denied("GROUP_MEMBER_GENERATION_CHANGED")
		}
	}
	return nil
}
func PersistBindingInTx(ctx context.Context, tx *sql.Tx, run string, b *api.GroupBinding) error {
	var raw string
	if e := tx.QueryRowContext(ctx, "SELECT group_binding_json FROM execution_runs WHERE run_id=?", run).Scan(&raw); e != nil {
		return e
	}
	var old *api.GroupBinding
	if json.Unmarshal([]byte(raw), &old) != nil {
		return fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	if reflect.DeepEqual(old, b) {
		return nil
	}
	r, e := tx.ExecContext(ctx, "UPDATE execution_runs SET group_binding_json=?,revision=revision+1 WHERE run_id=? AND revision<9223372036854775807", encode(b), run)
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

func BindingContains(full, subset *api.GroupBinding) bool {
	if full == nil || subset == nil {
		return full == nil && subset == nil
	}
	if !validBinding(full) || !validBinding(subset) || full.SessionID != subset.SessionID {
		return false
	}
	for _, m := range subset.Members {
		found := false
		for _, actual := range full.Members {
			if actual == m {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
func CaptureMessageInTx(ctx context.Context, tx *sql.Tx, message string) error {
	_, e := tx.ExecContext(ctx, "UPDATE collaboration_messages SET group_binding_json=(SELECT group_binding_json FROM execution_runs r WHERE r.run_id=collaboration_messages.from_run_id) WHERE message_id=?", message)
	return e
}
