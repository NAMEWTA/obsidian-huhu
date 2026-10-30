package collaboration

import (
	"context"
	"database/sql"
	"reflect"
	"time"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

func (s *Store) AddWaitInTx(ctx context.Context, tx *sql.Tx, from, to, reason string) error {
	return usage.AddWaitInTx(ctx, tx, from, to, reason)
}

func (s *Store) Send(ctx context.Context, id api.RequestIdentity, c api.MessageCommand) (api.AgentMessage, error) {
	var out api.AgentMessage
	if e := commands.Validate(id, c.CommandMeta, false); e != nil {
		return out, e
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.message", hash, &out)
		if e != nil {
			return e
		}
		if found {
			return s.checkMessageInTx(ctx, tx, id, c.ProfileID, out.ID)
		}
		if c.Kind == "reply" {
			var e error
			out, e = s.answerInTx(ctx, tx, id, c)
			if e != nil {
				return e
			}
			return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.message", hash, out.FromAgentID, out)
		}
		a, e := s.actorInTx(ctx, tx, id, c.ProfileID, c.RunID, true)
		if e != nil {
			return e
		}
		if !has(a.agent.AllowedCollaborationTargets, c.TargetAgentID) {
			return api.Denied("COLLABORATION_TARGET_DENIED")
		}
		target, e := s.config.ReadAgentInTx(ctx, tx, c.ProfileID, c.TargetAgentID)
		if e != nil {
			return e
		}
		if !target.Enabled {
			return fail("CONFLICT", "AGENT_DISABLED")
		}
		if target.Model == nil && len(a.input.Sources) > 0 {
			return fail("MODEL_UNAVAILABLE", "RECIPIENT_NOT_CONFIGURED")
		}
		flow := a.input
		flow.Recipient = api.GrantRecipient{AgentID: target.ID, ModelBindingRevision: target.ModelBindingRevision}
		if target.Model != nil {
			flow.Recipient.ProviderID = target.Model.ProviderID
			flow.Recipient.ModelID = target.Model.ModelID
			flow.Recipient.Protocol = target.Model.Protocol
			flow.Recipient.Endpoint = target.Model.Endpoint
		}
		if _, e = s.access.SelectInTx(ctx, tx, id, flow, a.run.ID, []string{"read", "send", "deliver"}); e != nil {
			return e
		}
		for _, proposed := range c.SourceRefs {
			found := false
			for _, actual := range a.input.Sources {
				if reflect.DeepEqual(proposed, actual) {
					found = true
				}
			}
			if !found {
				return api.Denied("PARENT_SCOPE_EXCEEDED")
			}
		}
		toRun := ""
		thread := "mailbox:" + target.ID
		delegationID := c.DelegationID
		if c.Kind == "question" || c.Kind == "notify" && c.DelegationID != "" {
			if c.DelegationID == "" {
				dc := api.DelegateCommand{CommandMeta: c.CommandMeta, RunID: c.RunID, Target: api.DelegationTarget{Kind: "existing", AgentID: target.ID}, Task: c.Text, Constraints: []string{}, Context: api.ContextEnvelope{SourceRefs: c.SourceRefs, MessageIDs: c.MessageIDs, Excerpts: []api.ContextExcerpt{}}}
				dc.IdempotencyKey = "question:" + c.IdempotencyKey
				if len(dc.IdempotencyKey) > 128 {
					dc.IdempotencyKey = hash
				}
				d, e := s.admitInTx(ctx, tx, id, dc, nil, true)
				if e != nil {
					return e
				}
				toRun = d.ChildRunID
				thread = d.WorkThreadID
				delegationID = d.ID
			} else {
				d, e := s.readTaskInTx(ctx, tx, id, c.ProfileID, c.DelegationID)
				if e != nil {
					return e
				}
				if d.RootRunID != a.run.RootRunID {
					return api.Denied("MESSAGE_SCOPE_MISMATCH")
				}
				if d.TargetAgentID == target.ID {
					toRun = d.ChildRunID
					thread = d.WorkThreadID
				} else if d.RequesterAgentID == target.ID {
					toRun = d.ParentRunID
					thread = a.run.SessionID
				} else {
					return api.Denied("MESSAGE_TARGET_MISMATCH")
				}
				if c.Kind == "question" {
					if e = s.policy.WakeInTx(ctx, tx, a.run.RootRunID); e != nil {
						return e
					}
				}
			}
		}
		if c.Kind == "notify" && toRun != "" {
			receiver, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: c.ProfileID, ID: toRun})
			if e != nil {
				return e
			}
			if receiver.AgentID != target.ID || receiver.RootRunID != a.run.RootRunID {
				return api.Denied("MESSAGE_TARGET_MISMATCH")
			}
			if e = s.checkReplyTargetInTx(ctx, tx, id, c.ProfileID, toRun, a); e != nil {
				return e
			}
			if e = tx.QueryRowContext(ctx, "SELECT work_thread_id FROM execution_runs WHERE run_id=?", toRun).Scan(&thread); e != nil {
				return e
			}
		}
		out = api.AgentMessage{ID: api.NewID("agent-message:"), FromAgentID: a.agent.ID, ToAgentID: target.ID, Text: c.Text, CreatedAt: time.Now().UTC().Format(api.TimestampLayout), Kind: c.Kind, Status: "delivered", DelegationID: delegationID, WorkThreadID: thread}
		if c.Kind == "question" {
			out.QuestionID = out.ID
			if e = s.AddWaitInTx(ctx, tx, a.run.ID, toRun, out.ID); e != nil {
				return e
			}
		}
		// A notification is a delivery record only. No Run, claim or model permit
		// is created for it. Its body retains all actual sender provenance.
		if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_messages(message_id,root_run_id,from_run_id,to_run_id,work_thread_id,from_agent_id,to_agent_id,principal_id,delegation_id,question_id,kind,status,text,source_json,derived_json,intent_id,input_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", out.ID, a.run.RootRunID, a.run.ID, toRun, thread, a.agent.ID, target.ID, id.PrincipalID(), delegationID, out.QuestionID, c.Kind, out.Status, c.Text, encode(a.input.Sources), encode(a.derived), c.IdempotencyKey, hash, out.CreatedAt); e != nil {
			return e
		}
		if e = groupaccess.CaptureMessageInTx(ctx, tx, out.ID); e != nil {
			return e
		}
		if e = execution.AddEventInTx(ctx, tx, a.run.ID, "message.delivered", map[string]string{"messageId": out.ID, "kind": out.Kind}); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.message", hash, a.agent.ID, out)
	})
	if e == nil && c.Kind == "question" && s.wake != nil {
		s.wake()
	}
	return out, e
}

func (s *Store) Reply(ctx context.Context, id api.RequestIdentity, c api.ReplyCommand) (api.AgentMessage, error) {
	var out api.AgentMessage
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return out, e
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.reply", hash, &out)
		if e != nil {
			return e
		}
		if found {
			return s.checkMessageInTx(ctx, tx, id, c.ProfileID, out.ID)
		}
		d, e := s.readTaskInTx(ctx, tx, id, c.ProfileID, c.DelegationID)
		if e != nil {
			return e
		}
		if d.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if terminalTask(d.Status) && c.QuestionID == "" {
			out, e = s.followupInTx(ctx, tx, id, c, d)
			if e != nil {
				return e
			}
			return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.reply", hash, d.RequesterAgentID, out)
		}
		var sender actor
		var targetRun, fromRun, fromAgent, toAgent, thread string
		if c.QuestionID != "" {
			var questionState string
			if e = tx.QueryRowContext(ctx, "SELECT from_run_id,to_run_id,from_agent_id,to_agent_id,work_thread_id,status FROM collaboration_messages WHERE message_id=? AND kind='question' AND delegation_id=? AND principal_id=?", c.QuestionID, d.ID, id.PrincipalID()).Scan(&targetRun, &fromRun, &toAgent, &fromAgent, &thread, &questionState); e != nil {
				return e
			}
			if questionState != "delivered" {
				return fail("CONFLICT", "QUESTION_ALREADY_ANSWERED")
			}
			sender, e = s.replySenderInTx(ctx, tx, id, c.ProfileID, fromRun)
			if e != nil {
				return e
			}
		} else {
			fromRun = d.ParentRunID
			targetRun = d.ChildRunID
			fromAgent = d.RequesterAgentID
			toAgent = d.ExecutorAgentID
			thread = d.WorkThreadID
			var userBatch bool
			sender, userBatch, e = s.groupUserReplySenderInTx(ctx, tx, id, c.ProfileID, d)
			if e == nil && !userBatch {
				sender, e = s.replySenderInTx(ctx, tx, id, c.ProfileID, fromRun)
			}
			if e != nil {
				return e
			}
			if userBatch {
				fromRun, fromAgent = sender.run.ID, ""
			}
		}
		if d.Status == "succeeded" || d.Status == "failed" || d.Status == "canceled" {
			return fail("CONFLICT", "TASK_FOLLOWUP_REQUIRED")
		}
		if e = checkReplySources(c.SourceRefs, sender.input.Sources); e != nil {
			return e
		}
		if e = s.checkReplyTargetInTx(ctx, tx, id, c.ProfileID, targetRun, sender); e != nil {
			return e
		}
		out = api.AgentMessage{ID: api.NewID("agent-message:"), FromAgentID: fromAgent, ToAgentID: toAgent, Text: c.Text, CreatedAt: time.Now().UTC().Format(api.TimestampLayout), Kind: "reply", Status: "delivered", DelegationID: d.ID, QuestionID: c.QuestionID, WorkThreadID: thread}
		if c.QuestionID != "" {
			out.Status = "answered"
			if _, e = tx.ExecContext(ctx, "UPDATE collaboration_messages SET status='answered',revision=revision+1 WHERE message_id=? AND status='delivered'", c.QuestionID); e != nil {
				return e
			}
			if _, e = tx.ExecContext(ctx, "DELETE FROM collaboration_wait_edges WHERE reason_id=?", c.QuestionID); e != nil {
				return e
			}
		}
		_, e = tx.ExecContext(ctx, "INSERT INTO collaboration_messages(message_id,root_run_id,from_run_id,to_run_id,work_thread_id,from_agent_id,to_agent_id,principal_id,delegation_id,question_id,kind,status,text,source_json,derived_json,intent_id,input_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'reply',?,?,?,?,?,?,?)", out.ID, d.RootRunID, fromRun, targetRun, thread, fromAgent, toAgent, id.PrincipalID(), d.ID, c.QuestionID, out.Status, c.Text, encode(sender.input.Sources), encode(sender.derived), c.IdempotencyKey, hash, out.CreatedAt)
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE collaboration_delegations SET revision=revision+1 WHERE delegation_id=?", d.ID); e != nil {
			return e
		}
		if e = groupaccess.CaptureMessageInTx(ctx, tx, out.ID); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.reply", hash, fromAgent, out)
	})
	if e == nil && s.wake != nil {
		s.wake()
	}
	return out, e
}

var _ api.MessagesAPI = (*Store)(nil)

func terminalTask(status string) bool {
	return status == "succeeded" || status == "failed" || status == "canceled"
}
