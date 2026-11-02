package usage

import (
	"context"
	"database/sql"
	"encoding/json"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/mailbox"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// MessagesInTx is consumed by the original Executor after claim. Only this
// execution's durable inbox and root-scoped notifications are selected; an
// Agent ID alone is never a namespace and notifications never create a Run.
func (s *Store) MessagesInTx(ctx context.Context, tx *sql.Tx, runID string) ([]api.AgentMessage, error) {
	items, err := s.readMessagesInTx(ctx, tx, runID, nil)
	if err != nil {
		return nil, err
	}
	out := make([]api.AgentMessage, 0, len(items))
	for _, item := range items {
		out = append(out, item.Message)
	}
	return out, nil
}

// ResumeMessagesInTx rechecks only Claim's frozen message IDs. A later inbox
// arrival cannot enter an already selected resume decision or its provenance.
func (s *Store) ResumeMessagesInTx(ctx context.Context, tx *sql.Tx, runID string, ids []string) ([]api.ResumeInboxItem, error) {
	if len(ids) == 0 {
		return []api.ResumeInboxItem{}, nil
	}
	if len(ids) > api.ResumeInboxMaxMessages {
		return nil, fail("RESOURCE_LIMIT", "THREAD_MESSAGE_LIMIT")
	}
	seen := map[string]bool{}
	for _, id := range ids {
		if id == "" || seen[id] {
			return nil, fail("CONFLICT", "RESUME_INBOX_INVALID")
		}
		seen[id] = true
	}
	return s.readMessagesInTx(ctx, tx, runID, ids)
}

func (s *Store) readMessagesInTx(ctx context.Context, tx *sql.Tx, runID string, selected []string) ([]api.ResumeInboxItem, error) {
	var principal, profile string
	if e := tx.QueryRowContext(ctx, "SELECT r.principal_id,s.profile_id FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", runID).Scan(&principal, &profile); e != nil {
		return nil, e
	}
	id := api.NewConnectionIdentity("executor:"+runID, principal, false)
	run, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
	if e != nil {
		return nil, e
	}
	query := "SELECT message_id,from_agent_id,to_agent_id,text,created_at,kind,status,delegation_id,question_id,work_thread_id,source_json FROM collaboration_messages WHERE " + mailbox.InboxWhere
	args := mailbox.InboxArgs(principal, run)
	if selected != nil {
		query += " AND message_id IN (" + strings.TrimSuffix(strings.Repeat("?,", len(selected)), ",") + ")"
		for _, id := range selected {
			args = append(args, id)
		}
	}
	query += " ORDER BY created_at,message_id LIMIT 101"
	rows, e := tx.QueryContext(ctx, query, args...)
	if e != nil {
		return nil, e
	}
	type item struct {
		message api.AgentMessage
		sources []api.SourceSnapshot
	}
	all := []item{}
	for rows.Next() {
		var v item
		var raw string
		m := &v.message
		if e = rows.Scan(&m.ID, &m.FromAgentID, &m.ToAgentID, &m.Text, &m.CreatedAt, &m.Kind, &m.Status, &m.DelegationID, &m.QuestionID, &m.WorkThreadID, &raw); e != nil {
			rows.Close()
			return nil, e
		}
		if json.Unmarshal([]byte(raw), &v.sources) != nil {
			rows.Close()
			return nil, fail("CONFLICT", "MESSAGE_CONTEXT_INVALID")
		}
		all = append(all, v)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, e
	}
	if len(all) > 100 {
		return nil, fail("RESOURCE_LIMIT", "THREAD_MESSAGE_LIMIT")
	}
	if selected != nil && len(all) != len(selected) {
		return nil, fail("CONFLICT", "RESUME_INBOX_CHANGED")
	}
	out := []api.ResumeInboxItem{}
	total := 0
	for _, v := range all {
		if v.message.Text != "" {
			origin, derived, e := s.access.PrivateMessageInTx(ctx, tx, id, profile, v.message.ID)
			if e != nil {
				return nil, e
			}
			if e = s.access.ConsumePrivateInTx(ctx, tx, id, in, origin, derived, grantsstore.MemorySubject{Kind: "message", ID: v.message.ID}); e != nil {
				return nil, e
			}
			_, in, e = execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
			if e != nil {
				return nil, e
			}
		}
		check := access.HistoryReadInput(in, v.sources)
		if in.ParentScope != nil && !access.InParent(check) {
			return nil, api.Denied("PARENT_SCOPE_EXCEEDED")
		}
		if e = s.access.CheckInTx(ctx, tx, id, check, []string{"read", "send"}); e != nil {
			return nil, e
		}
		total += len(v.message.Text)
		if total > 256*1024 {
			return nil, fail("RESOURCE_LIMIT", "THREAD_CONTEXT_LIMIT")
		}
		out = append(out, api.ResumeInboxItem{Message: v.message, Ref: api.DerivedInput{Kind: "message", ID: v.message.ID, Revision: "1", Hash: hashBody(v.message.Text), Namespace: v.message.WorkThreadID, WorkThreadID: v.message.WorkThreadID}})
	}
	return out, nil
}
