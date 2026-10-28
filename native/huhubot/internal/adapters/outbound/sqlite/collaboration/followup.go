package collaboration

import (
	"context"
	"database/sql"
	"encoding/json"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
)

// followupInTx always creates new work. A user's terminal-thread reply is a
// private new root with the old budget owner; a model must instead delegate
// from its actual live claim and remains inside that caller's policy tree.
func (s *Store) followupInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c api.ReplyCommand, old api.Delegation) (api.AgentMessage, error) {
	var out api.AgentMessage
	previous, input, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: c.ProfileID, ID: old.ChildRunID})
	if e != nil {
		return out, e
	}
	var snapshotJSON, derivedJSON string
	if e = tx.QueryRowContext(ctx, "SELECT c.config_json,r.derived_json FROM execution_runs r JOIN task_config_snapshots c ON c.snapshot_id=r.task_config_id WHERE r.run_id=?", previous.ID).Scan(&snapshotJSON, &derivedJSON); e != nil {
		return out, e
	}
	var cfg api.TaskConfigSnapshot
	var derived []api.DerivedInput
	if json.Unmarshal([]byte(snapshotJSON), &cfg) != nil || json.Unmarshal([]byte(derivedJSON), &derived) != nil {
		return out, fail("CONFLICT", "TASK_CONFIG_INVALID")
	}
	childID := api.NewID("run:")
	from, fromAgent := previous.ID, old.RequesterAgentID
	admission := execution.ChildAdmission{ReplyRoot: true, RetryOfRunID: previous.ID, ParentRunID: previous.ID, ChildRunID: childID, WorkThreadID: old.WorkThreadID, Task: c.Text, Access: input, Derived: derived}
	if bound, model := delegate.Execution(ctx); model {
		a, e := s.actorInTx(ctx, tx, id, c.ProfileID, bound.Run.ID, true)
		if e != nil {
			return out, e
		}
		if cfg.Kind == "temporary" {
			if !has(a.agent.AllowedTools, "agents.delegate") || cfg.SponsorAgentID != a.sponsor {
				return out, api.Denied("COLLABORATION_TARGET_DENIED")
			}
			draft := api.AgentDraft{Name: cfg.Agent.Name, Description: cfg.Agent.Description, Persona: cfg.Agent.Persona, AllowedTools: cfg.Agent.AllowedTools, AllowedCollaborationTargets: cfg.Agent.AllowedCollaborationTargets}
			if cfg.Agent.Model != nil {
				m := cfg.Agent.Model.ModelBindingDraft
				draft.Model = &m
			}
			for _, v := range draft.AllowedTools {
				if !has(a.agent.AllowedTools, v) {
					return out, api.Denied("TEMPORARY_CAPABILITY_DENIED")
				}
			}
			for _, v := range draft.AllowedCollaborationTargets {
				if !has(a.agent.AllowedCollaborationTargets, v) {
					return out, api.Denied("COLLABORATION_TARGET_DENIED")
				}
			}
			admission.Temporary = &api.TaskConfigDraft{SponsorAgentID: a.sponsor, Draft: draft}
		} else {
			if !has(a.agent.AllowedCollaborationTargets, cfg.Agent.ID) {
				return out, api.Denied("COLLABORATION_TARGET_DENIED")
			}
			admission.TargetAgentID = cfg.Agent.ID
		}
		if e = s.policy.AdmitInTx(ctx, tx, a.run.ID, a.run.RootRunID, false); e != nil {
			return out, e
		}
		admission.ReplyRoot = false
		admission.ParentRunID = a.run.ID
		admission.ParentClaimToken = a.claim
		admission.Access = a.input
		admission.Derived = append(append([]api.DerivedInput{}, a.derived...), derived...)
		from, fromAgent = a.run.ID, a.agent.ID
	}
	if e = checkReplySources(c.SourceRefs, admission.Access.Sources); e != nil {
		return out, e
	}
	child, e := s.runs.NewChildInTx(ctx, tx, id, admission)
	if e != nil {
		return out, e
	}
	d := api.Delegation{ID: api.NewID("delegation:"), Revision: "1", ParentRunID: from, ChildRunID: child.ID, RootRunID: child.RootRunID, RequesterAgentID: fromAgent, ExecutorAgentID: child.AgentID, WorkThreadID: old.WorkThreadID, TargetAgentID: old.TargetAgentID, Status: child.Status}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_delegations(delegation_id,root_run_id,parent_run_id,child_run_id,work_thread_id,requester_agent_id,executor_agent_id,target_agent_id,principal_id,intent_id,input_hash,constraints_json,expected_output,context_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'[]','','{}',?)", d.ID, d.RootRunID, d.ParentRunID, d.ChildRunID, d.WorkThreadID, d.RequesterAgentID, d.ExecutorAgentID, d.TargetAgentID, id.PrincipalID(), c.IdempotencyKey, hashText(c.Text), now); e != nil {
		return out, e
	}
	for _, v := range admission.Derived {
		if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_lineage VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING", child.ID, v.Kind, v.ID, v.Revision, v.Hash, v.Namespace, v.WorkThreadID); e != nil {
			return out, e
		}
	}
	out = api.AgentMessage{ID: api.NewID("agent-message:"), FromAgentID: fromAgent, ToAgentID: child.AgentID, Text: c.Text, CreatedAt: now, Kind: "reply", Status: "delivered", DelegationID: d.ID, WorkThreadID: old.WorkThreadID}
	_, e = tx.ExecContext(ctx, "INSERT INTO collaboration_messages(message_id,root_run_id,from_run_id,to_run_id,work_thread_id,from_agent_id,to_agent_id,principal_id,delegation_id,question_id,kind,status,text,source_json,derived_json,intent_id,input_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,'','reply','delivered',?,?,?,?,?,?)", out.ID, child.RootRunID, from, child.ID, old.WorkThreadID, fromAgent, child.AgentID, id.PrincipalID(), d.ID, c.Text, encode(admission.Access.Sources), encode(admission.Derived), c.IdempotencyKey, hashText(c.Text), now)
	if e != nil {
		return out, e
	}
	if e = groupaccess.CaptureMessageInTx(ctx, tx, out.ID); e != nil {
		return out, e
	}
	return out, execution.AddEventInTx(ctx, tx, child.ID, "task.followup", map[string]string{"previousRunId": previous.ID, "delegationId": d.ID})
}
