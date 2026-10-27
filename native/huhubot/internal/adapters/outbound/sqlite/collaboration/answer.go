package collaboration

import (
	"context"
	"database/sql"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// answerInTx answers a particular durable question. It never creates another
// model Run, reverses a terminal state or treats delivery as task completion.
func (s *Store) answerInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c api.MessageCommand) (api.AgentMessage, error) {
	var out api.AgentMessage
	if c.QuestionID == "" {
		return out, api.Invalid("QUESTION_ID_REQUIRED")
	}
	var from, to, root, delegation, thread, questionState, originalAgent string
	e := tx.QueryRowContext(ctx, "SELECT from_run_id,to_run_id,root_run_id,delegation_id,work_thread_id,status,from_agent_id FROM collaboration_messages WHERE message_id=? AND kind='question' AND principal_id=?", c.QuestionID, id.PrincipalID()).Scan(&to, &from, &root, &delegation, &thread, &questionState, &originalAgent)
	if e != nil {
		return out, e
	}
	if from != c.RunID || c.TargetAgentID != originalAgent || c.DelegationID != "" && c.DelegationID != delegation {
		return out, api.Denied("QUESTION_SCOPE_MISMATCH")
	}
	if questionState != "delivered" {
		return out, fail("CONFLICT", "QUESTION_ALREADY_ANSWERED")
	}
	sender, e := s.actorInTx(ctx, tx, id, c.ProfileID, from, true)
	if e != nil {
		return out, e
	}
	if e = checkReplySources(c.SourceRefs, sender.input.Sources); e != nil {
		return out, e
	}
	target, input, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: c.ProfileID, ID: to})
	if e != nil {
		return out, e
	}
	if target.Status == "succeeded" || target.Status == "failed" || target.Status == "canceled" {
		return out, api.Denied("QUESTION_TARGET_TERMINAL")
	}
	input.Sources = sender.input.Sources
	input.Scopes = sender.input.Scopes
	input.GrantIDs, e = s.access.SelectInTx(ctx, tx, id, input, "", []string{"read", "send", "deliver"})
	if e != nil {
		return out, e
	}
	if e = s.access.CheckInTx(ctx, tx, id, input, []string{"read", "send", "deliver"}); e != nil {
		return out, e
	}
	out = api.AgentMessage{ID: api.NewID("agent-message:"), FromAgentID: sender.agent.ID, ToAgentID: target.AgentID, Text: c.Text, Kind: "reply", Status: "answered", DelegationID: delegation, QuestionID: c.QuestionID, WorkThreadID: thread, CreatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	_, e = tx.ExecContext(ctx, "INSERT INTO collaboration_messages(message_id,root_run_id,from_run_id,to_run_id,work_thread_id,from_agent_id,to_agent_id,principal_id,delegation_id,question_id,kind,status,text,source_json,derived_json,intent_id,input_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'reply','answered',?,?,?,?,?,?)", out.ID, root, from, to, thread, out.FromAgentID, out.ToAgentID, id.PrincipalID(), delegation, c.QuestionID, c.Text, encode(sender.input.Sources), encode(sender.derived), c.IdempotencyKey, hashText(c.Text), out.CreatedAt)
	if e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "UPDATE collaboration_messages SET status='answered',revision=revision+1 WHERE message_id=? AND status='delivered'", c.QuestionID); e != nil {
		return out, e
	}
	if _, e = tx.ExecContext(ctx, "DELETE FROM collaboration_wait_edges WHERE reason_id=?", c.QuestionID); e != nil {
		return out, e
	}
	if e = groupaccess.CaptureMessageInTx(ctx, tx, out.ID); e != nil {
		return out, e
	}
	return out, execution.AddEventInTx(ctx, tx, to, "message.answered", map[string]string{"messageId": out.ID, "questionId": c.QuestionID})
}
