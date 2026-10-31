package collaboration

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"sync/atomic"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	recoveryguard "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/recovery"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/usage"
	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	delegate "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/collaboration/delegate"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type Store struct {
	stopping atomic.Bool
	base     *base.Store
	config   *assistant.Store
	runs     *execution.Store
	access   *grants.Store
	policy   *usage.Store
	context  api.ContextAccess
	wake     func()
	cancel   func(string)
	canceler SubtreeCanceler
}

func New(b *base.Store, c *assistant.Store, r *execution.Store, a *grants.Store, p *usage.Store) *Store {
	return &Store{base: b, config: c, runs: r, access: a, policy: p}
}
func (s *Store) SetWake(w func()) { s.wake = w }
func (s *Store) StopAdmission()   { s.stopping.Store(true) }
func (s *Store) admissionOpen() error {
	if s.stopping.Load() {
		return api.Denied("SERVICE_STOPPING")
	}
	return nil
}
func (s *Store) SetCancel(c func(string))       { s.cancel = c }
func (s *Store) SetContext(c api.ContextAccess) { s.context = c }
func (s *Store) Budget(ctx context.Context, id api.RequestIdentity, q api.BudgetQuery) (api.BudgetSettings, error) {
	return s.policy.Budget(ctx, id, q)
}
func (s *Store) ConfigureBudget(ctx context.Context, id api.RequestIdentity, c api.BudgetConfigure) (api.BudgetSettings, error) {
	if _, ok := delegate.Execution(ctx); ok {
		return api.BudgetSettings{}, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	return s.policy.ConfigureBudget(ctx, id, c)
}
func (s *Store) ConfigurationHash(ctx context.Context, id api.RequestIdentity, q api.TaskConfigHashQuery) (api.TaskConfigHashResult, error) {
	var out api.TaskConfigHashResult
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if !id.Valid() {
			return api.Denied("IDENTITY_REQUIRED")
		}
		if _, e := s.config.ReadAgentInTx(ctx, tx, q.ProfileID, q.Config.SponsorAgentID); e != nil {
			return e
		}
		out.ConfigurationHash = api.CanonicalTaskConfigHash(q.Config)
		return nil
	})
	return out, e
}

type SubtreeCanceler interface {
	CancelSubtreeInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string) ([]string, error)
}

func (s *Store) SetCanceler(c SubtreeCanceler) { s.canceler = c }
func fail(kind, reason string) error           { return &api.Fault{Kind: kind, Reason: reason} }
func encode(v any) string {
	b, _ := json.Marshal(v)
	if string(b) == "null" {
		return "[]"
	}
	return string(b)
}
func hashText(s string) string {
	h := sha256.Sum256([]byte(s))
	return "sha256:" + hex.EncodeToString(h[:])
}
func has(v []string, id string) bool {
	for _, x := range v {
		if x == id {
			return true
		}
	}
	return false
}

type actor struct {
	run                    api.Run
	input                  api.RunAccessInput
	agent                  api.Agent
	claim, thread, sponsor string
	derived                []api.DerivedInput
}

func (s *Store) actorInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, runID string, active bool) (actor, error) {
	var a actor
	r, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
	if e != nil {
		return a, e
	}
	a.run = r
	a.input = in
	if active {
		if e = s.admissionOpen(); e != nil {
			return a, e
		}
		if e = recoveryguard.CheckInTx(ctx, tx, r.ID); e != nil {
			return a, e
		}
	}
	var pin sql.NullString
	var config, derived string
	var closed int
	if e = tx.QueryRowContext(ctx, "SELECT claim_token,work_thread_id,pin_token,task_config_id,derived_json,admission_closed FROM execution_runs WHERE run_id=?", r.ID).Scan(&a.claim, &a.thread, &pin, &config, &derived, &closed); e != nil {
		return a, e
	}
	if json.Unmarshal([]byte(derived), &a.derived) != nil {
		return a, fail("CONFLICT", "LINEAGE_STATE_INVALID")
	}
	if active && (closed != 0 || a.claim == "" || (r.Status != "running" && r.Status != "preparing")) {
		return a, api.Denied("PARENT_ADMISSION_CLOSED")
	}
	if bound, ok := delegate.Execution(ctx); ok {
		if bound.Run.ID != runID || bound.ClaimToken != a.claim || bound.Identity.PrincipalID() != id.PrincipalID() || bound.Access.ProfileID != profile {
			return a, api.Denied("TOOL_EXECUTION_CHANGED")
		}
	}
	if config != "" {
		snap, x := s.config.ReadTaskInTx(ctx, tx, r.ID, config)
		if x != nil {
			return a, x
		}
		a.agent = snap.Agent
		a.sponsor = snap.SponsorAgentID
	} else if pin.Valid {
		snap, x := s.config.ReadPinInTx(ctx, tx, pin.String)
		if x != nil {
			return a, x
		}
		a.agent = snap.Agent
	} else if active {
		return a, api.Denied("RUN_CONFIG_NOT_PINNED")
	}
	if a.sponsor == "" {
		a.sponsor = a.agent.ID
	}
	if s.access == nil {
		return a, api.Denied("ACCESS_NOT_ASSEMBLED")
	}
	ops := []string{"read"}
	if active {
		ops = []string{"read", "send"}
	}
	if e = s.access.CheckInTx(ctx, tx, id, in, ops); e != nil {
		return a, e
	}
	return a, nil
}

func (s *Store) Discover(ctx context.Context, id api.RequestIdentity, q api.DiscoverQuery) (api.DirectoryPage, error) {
	out := api.DirectoryPage{Items: []api.DirectoryEntry{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		p, e := conv.Metadata(ctx, tx, q.ProfileID)
		if e != nil {
			return e
		}
		if !id.Valid() {
			return api.Denied("IDENTITY_REQUIRED")
		}
		var allowed []string
		if q.RunID != "" {
			a, e := s.actorInTx(ctx, tx, id, q.ProfileID, q.RunID, true)
			if e != nil {
				return e
			}
			allowed = a.agent.AllowedCollaborationTargets
		}
		limit, e := conv.Limit(q.Limit)
		if e != nil {
			return e
		}
		after := ""
		if q.Cursor != "" {
			raw, e := base64.RawURLEncoding.DecodeString(q.Cursor)
			if e != nil {
				return api.Invalid("INVALID_DIRECTORY_CURSOR")
			}
			var c struct{ After, Revision, Principal, Run string }
			if json.Unmarshal(raw, &c) != nil || c.Principal != id.PrincipalID() || c.Run != q.RunID {
				return api.Invalid("INVALID_DIRECTORY_CURSOR")
			}
			if c.Revision != p.Revision {
				return fail("CURSOR_EXPIRED", "DIRECTORY_CHANGED")
			}
			after = c.After
		}
		rows, e := tx.QueryContext(ctx, "SELECT agent_id FROM agents WHERE agent_id>? ORDER BY agent_id", after)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var v string
			if e = rows.Scan(&v); e != nil {
				rows.Close()
				return e
			}
			if q.RunID == "" || has(allowed, v) {
				ids = append(ids, v)
				if len(ids) > limit {
					break
				}
			}
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		more := len(ids) > limit
		if more {
			ids = ids[:limit]
		}
		for _, v := range ids {
			a, e := s.config.ReadAgentInTx(ctx, tx, q.ProfileID, v)
			if e != nil {
				return e
			}
			tools := append([]string{}, a.AllowedTools...)
			out.Items = append(out.Items, api.DirectoryEntry{ID: a.ID, Revision: a.Revision, Name: a.Name, Description: a.Description, Available: a.Enabled && a.Model != nil, AllowedTools: tools})
		}
		if more {
			out.NextCursor = base64.RawURLEncoding.EncodeToString([]byte(encode(struct{ After, Revision, Principal, Run string }{ids[len(ids)-1], p.Revision, id.PrincipalID(), q.RunID})))
		}
		return nil
	})
	return out, e
}

func (s *Store) Delegate(ctx context.Context, id api.RequestIdentity, c api.DelegateCommand) (api.Delegation, error) {
	var out api.Delegation
	if e := commands.Validate(id, c.CommandMeta, false); e != nil {
		return out, e
	}
	verified := map[string]string{}
	if len(c.Context.Excerpts) > 0 {
		var parent api.RunAccessInput
		if e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
			a, e := s.actorInTx(ctx, tx, id, c.ProfileID, c.RunID, true)
			parent = a.input
			return e
		}); e != nil {
			return out, e
		}
		if s.context == nil {
			return out, api.Denied("CONTEXT_NOT_ASSEMBLED")
		}
		prepared, e := s.context.PrepareContext(ctx, id, parent)
		if e != nil {
			return out, e
		}
		for _, v := range prepared.Sources {
			verified[encode(v.Source)] = v.Text
		}
	}
	err := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		var e error
		out, e = s.admitInTx(ctx, tx, id, c, verified, false)
		return e
	})
	if err == nil && s.wake != nil {
		s.wake()
	}
	return out, err
}

func (s *Store) admitInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, c api.DelegateCommand, verified map[string]string, question bool) (api.Delegation, error) {
	var out api.Delegation
	err := func() error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.delegate", hash, &out)
		if e != nil {
			return e
		}
		if found {
			_, e := s.readTaskInTx(ctx, tx, id, c.ProfileID, out.ID)
			return e
		}
		a, e := s.actorInTx(ctx, tx, id, c.ProfileID, c.RunID, true)
		if e != nil {
			return e
		}
		if c.Context.ParentRunID != "" && c.Context.ParentRunID != a.run.ID {
			return api.Denied("PARENT_SCOPE_MISMATCH")
		}
		if _, tool := delegate.Execution(ctx); !tool && c.ExpectedRevision != "" && c.ExpectedRevision != a.run.Revision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if c.Target.Kind == "existing" && !has(a.agent.AllowedCollaborationTargets, c.Target.AgentID) {
			return api.Denied("COLLABORATION_TARGET_DENIED")
		}
		if c.Target.Kind == "temporary" && !has(a.agent.AllowedTools, "agents.delegate") {
			return api.Denied("COLLABORATION_TARGET_DENIED")
		}
		if c.Target.Kind == "temporary" {
			for _, tool := range c.Target.Draft.AllowedTools {
				if !has(a.agent.AllowedTools, tool) {
					return api.Denied("TEMPORARY_CAPABILITY_DENIED")
				}
			}
			for _, target := range c.Target.Draft.AllowedCollaborationTargets {
				if !has(a.agent.AllowedCollaborationTargets, target) {
					return api.Denied("COLLABORATION_TARGET_DENIED")
				}
			}
		}
		if s.policy == nil {
			return api.Denied("POLICY_NOT_CONFIGURED")
		}
		if e = s.policy.AdmitInTx(ctx, tx, a.run.ID, a.run.RootRunID, question); e != nil {
			return e
		}
		input := a.input
		input.TaskID = api.NewID("run:")
		// A model-authored task is derived from all actual parent inputs, even if
		// the proposed envelope omits references. Explicit sources may only narrow.
		for _, source := range c.Context.SourceRefs {
			found := false
			for _, actual := range a.input.Sources {
				if access.EqualSource(source, actual) {
					found = true
				}
			}
			if !found {
				return api.Denied("PARENT_SCOPE_EXCEEDED")
			}
		}
		for _, scope := range c.Context.SourceScopes {
			found := false
			for _, actual := range a.input.Scopes {
				if reflect.DeepEqual(scope, actual) {
					found = true
				}
			}
			if !found {
				return api.Denied("PARENT_SCOPE_EXCEEDED")
			}
		}
		derived := append([]api.DerivedInput{}, a.derived...)
		task := c.Task
		for _, messageID := range c.Context.MessageIDs {
			var text, raw, namespace string
			public, e := groupaccess.PublicMessageVisibleInTx(ctx, tx, id, a.input, messageID)
			if e != nil {
				return e
			}
			if a.thread == a.run.SessionID || public {
				e = tx.QueryRowContext(ctx, "SELECT text,source_json,session_id FROM conversation_messages WHERE message_id=? AND session_id=?", messageID, a.run.SessionID).Scan(&text, &raw, &namespace)
			} else {
				e = tx.QueryRowContext(ctx, "SELECT text,source_json,work_thread_id FROM collaboration_messages WHERE message_id=? AND work_thread_id=? AND principal_id=?", messageID, a.thread, id.PrincipalID()).Scan(&text, &raw, &namespace)
			}
			if errors.Is(e, sql.ErrNoRows) {
				return api.Denied("CONTEXT_MESSAGE_NOT_VISIBLE")
			}
			if e != nil {
				return e
			}
			var sources []api.SourceSnapshot
			if json.Unmarshal([]byte(raw), &sources) != nil {
				return fail("CONFLICT", "MESSAGE_CONTEXT_INVALID")
			}
			check := input
			check.ParentScope = &api.AccessScope{Sources: a.input.Sources, Scopes: a.input.Scopes, GrantIDs: a.input.GrantIDs}
			check.Sources = sources
			if !access.InParent(check) {
				return api.Denied("PARENT_SCOPE_EXCEEDED")
			}
			derived = append(derived, api.DerivedInput{Kind: "message", ID: messageID, Revision: "1", Hash: hashText(text), Namespace: namespace, WorkThreadID: namespace})
			task += "\n\n" + text
		}
		for _, excerpt := range c.Context.Excerpts {
			body, ok := verified[encode(excerpt.SourceRef)]
			if !ok || excerpt.Text == "" || !strings.Contains(body, excerpt.Text) {
				return api.Denied("CONTEXT_EXCERPT_NOT_VERIFIED")
			}
			task += "\n\n" + excerpt.Text
		}
		delegationID := api.NewID("delegation:")
		// Raw task/requirements already passed their original admission budget.
		// Verified context has its separate materialized-task bound; loading the
		// requirements must not tighten that accepted two-stage contract.
		if !api.ValidDelegationInput(api.DelegationInput{DelegationID: delegationID, Task: task, Constraints: c.Constraints, ExpectedOutput: c.ExpectedOutput}) || len(derived) > 128 {
			return fail("RESOURCE_LIMIT", "DELEGATION_CONTEXT_LIMIT")
		}
		thread := api.NewID("thread:")
		var temporary *api.TaskConfigDraft
		if c.Target.Kind == "temporary" {
			temporary = &api.TaskConfigDraft{SponsorAgentID: a.sponsor, Draft: *c.Target.Draft}
		}
		child, e := s.runs.NewChildInTx(ctx, tx, id, execution.ChildAdmission{ParentRunID: a.run.ID, ParentClaimToken: a.claim, ChildRunID: input.TaskID, WorkThreadID: thread, Task: task, TargetAgentID: c.Target.AgentID, Temporary: temporary, Access: input, Derived: derived})
		if e != nil {
			return e
		}
		out = api.Delegation{ID: delegationID, Revision: "1", ParentRunID: a.run.ID, ChildRunID: child.ID, RootRunID: child.RootRunID, RequesterAgentID: a.agent.ID, ExecutorAgentID: child.AgentID, WorkThreadID: thread, TargetAgentID: c.Target.AgentID, Status: child.Status}
		now := time.Now().UTC().Format(api.TimestampLayout)
		if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_threads VALUES(?,?,?,?,?,?)", thread, out.RootRunID, a.run.SessionID, id.PrincipalID(), child.AgentID, now); e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_delegations(delegation_id,root_run_id,parent_run_id,child_run_id,work_thread_id,requester_agent_id,executor_agent_id,target_agent_id,principal_id,intent_id,input_hash,constraints_json,expected_output,context_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", out.ID, out.RootRunID, out.ParentRunID, out.ChildRunID, thread, out.RequesterAgentID, out.ExecutorAgentID, out.TargetAgentID, id.PrincipalID(), c.IdempotencyKey, hash, encode(c.Constraints), c.ExpectedOutput, encode(c.Context), now); e != nil {
			return e
		}
		for _, v := range derived {
			if _, e = tx.ExecContext(ctx, "INSERT INTO collaboration_lineage VALUES(?,?,?,?,?,?,?) ON CONFLICT(output_run_id,input_kind,input_id) DO NOTHING", child.ID, v.Kind, v.ID, v.Revision, v.Hash, v.Namespace, v.WorkThreadID); e != nil {
				return e
			}
		}
		if e = execution.AddEventInTx(ctx, tx, a.run.ID, "delegation.accepted", map[string]string{"delegationId": out.ID, "childRunId": child.ID}); e != nil {
			return e
		}
		if e = conv.Bump(ctx, tx); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.delegate", hash, a.agent.ID, out)
	}()
	return out, err
}

func (s *Store) readTaskInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, task string, metadataOnly ...bool) (api.Delegation, error) {
	return s.readTaskWithConsumptionInTx(ctx, tx, id, profile, task, true, metadataOnly...)
}

// A page candidate must pass the same current read authorization as a returned
// task. It is not a model input until it fits the final page. Both selection
// and consumption remain inside the caller's single transaction.
func (s *Store) readTaskWithConsumptionInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, task string, consume bool, metadataOnly ...bool) (api.Delegation, error) {
	var out api.Delegation
	var principal string
	e := tx.QueryRowContext(ctx, "SELECT d.delegation_id,CAST(d.revision AS TEXT),d.parent_run_id,d.child_run_id,d.root_run_id,d.requester_agent_id,d.executor_agent_id,d.work_thread_id,d.target_agent_id,r.status,d.principal_id FROM collaboration_delegations d JOIN execution_runs r ON r.run_id=d.child_run_id WHERE delegation_id=?", task).Scan(&out.ID, &out.Revision, &out.ParentRunID, &out.ChildRunID, &out.RootRunID, &out.RequesterAgentID, &out.ExecutorAgentID, &out.WorkThreadID, &out.TargetAgentID, &out.Status, &principal)
	if errors.Is(e, sql.ErrNoRows) {
		return out, fail("NOT_FOUND", "TASK_NOT_FOUND")
	}
	if e != nil {
		return out, e
	}
	if principal != id.PrincipalID() {
		return out, api.Denied("TASK_READ_DENIED")
	}
	var requesterRole string
	if e = tx.QueryRowContext(ctx, "SELECT execution_role FROM execution_runs WHERE run_id=?", out.ParentRunID).Scan(&requesterRole); e != nil {
		return out, e
	}
	out.RequesterKind = "agent"
	if requesterRole == "orchestration" {
		out.RequesterKind = "user"
	}
	if bound, ok := delegate.Execution(ctx); ok {
		if e = s.admissionOpen(); e != nil {
			return out, e
		}
		if e = recoveryguard.CheckInTx(ctx, tx, bound.Run.ID); e != nil {
			return out, e
		}
		root := bound.Run.RootRunID
		if root == "" {
			root = bound.Run.ID
		}
		if out.RootRunID != root {
			return out, api.Denied("TASK_SCOPE_MISMATCH")
		}
	}
	_, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: out.ChildRunID})
	if e != nil {
		return out, e
	}
	if len(metadataOnly) > 0 && metadataOnly[0] {
		return out, nil
	}
	if e = s.access.CheckInTx(ctx, tx, id, in, []string{"read"}); e != nil {
		return out, e
	}
	if bound, ok := delegate.Execution(ctx); ok {
		_, current, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: bound.Run.ID})
		if e != nil {
			return out, e
		}
		current.Sources = in.Sources
		current.Scopes = in.Scopes
		current.GrantIDs, e = s.access.SelectInTx(ctx, tx, id, current, "", []string{"read", "send", "deliver"})
		if e != nil {
			return out, e
		}
		if e = s.access.CheckInTx(ctx, tx, id, current, []string{"read", "send", "deliver"}); e != nil {
			return out, e
		}
	}
	var status, reason, text, derived, usage string
	var unresolved, partial bool
	e = tx.QueryRowContext(ctx, "SELECT d.status,d.reason,d.text,d.derived_json,r.usage_json,r.effects_unresolved,d.partial FROM collaboration_result_deliveries d JOIN execution_runs r ON r.run_id=d.child_run_id WHERE d.child_run_id=?", out.ChildRunID).Scan(&status, &reason, &text, &derived, &usage, &unresolved, &partial)
	if e == nil {
		d := []api.DerivedInput{}
		if json.Unmarshal([]byte(derived), &d) != nil {
			return out, fail("CONFLICT", "LINEAGE_STATE_INVALID")
		}
		out.Result = &api.TaskOutcome{RunID: out.ChildRunID, Status: status, Text: text, Reason: reason, Partial: partial, Derived: d, EffectsUnresolved: unresolved}
		if usage != "" {
			out.Result.Usage = &api.RunUsage{}
			if json.Unmarshal([]byte(usage), out.Result.Usage) != nil {
				return out, fail("CONFLICT", "RUN_USAGE_INVALID")
			}
		}
	} else if !errors.Is(e, sql.ErrNoRows) {
		return out, e
	}
	if bound, ok := delegate.Execution(ctx); consume && ok && out.Result != nil && out.Result.Text != "" {
		caller, e := s.policy.CurrentConsumerInTx(ctx, tx, bound)
		if e != nil {
			return out, e
		}
		{
			origin := access.HistoryReadInput(in, in.Sources)
			refs := append([]api.DerivedInput{}, out.Result.Derived...)
			var revision, thread string
			if e = tx.QueryRowContext(ctx, "SELECT CAST(revision AS TEXT),work_thread_id FROM execution_runs WHERE run_id=?", out.ChildRunID).Scan(&revision, &thread); e != nil {
				return out, e
			}
			refs = append(refs, api.DerivedInput{Kind: "task_result", ID: out.ChildRunID, Revision: revision, Hash: hashText(out.Result.Text), Namespace: thread, WorkThreadID: thread})
			if e = s.access.ConsumePrivateInTx(ctx, tx, id, caller, origin, refs); e != nil {
				return out, e
			}
		}
	}
	return out, nil
}
func (s *Store) GetTask(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Delegation, error) {
	var out api.Delegation
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error { var e error; out, e = s.readTaskInTx(ctx, tx, id, q.ProfileID, q.ID); return e })
	return out, e
}
func (s *Store) ListTasks(ctx context.Context, id api.RequestIdentity, q api.DelegationQuery) (api.DelegationPage, error) {
	out := api.DelegationPage{Items: []api.Delegation{}}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		r, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: q.RunID})
		if e != nil {
			return e
		}
		limit, e := conv.Limit(q.Limit)
		if e != nil {
			return e
		}
		after := ""
		if q.Cursor != "" {
			b, e := base64.RawURLEncoding.DecodeString(q.Cursor)
			if e != nil {
				return api.Invalid("INVALID_TASK_CURSOR")
			}
			var c struct{ After, Root, Principal string }
			if json.Unmarshal(b, &c) != nil || c.Root != r.RootRunID || c.Principal != id.PrincipalID() {
				return api.Invalid("INVALID_TASK_CURSOR")
			}
			after = c.After
		}
		rows, e := tx.QueryContext(ctx, "SELECT delegation_id FROM collaboration_delegations WHERE root_run_id=? AND principal_id=? AND delegation_id>? ORDER BY delegation_id LIMIT ?", r.RootRunID, id.PrincipalID(), after, limit+1)
		if e != nil {
			return e
		}
		ids := []string{}
		for rows.Next() {
			var v string
			if e = rows.Scan(&v); e != nil {
				rows.Close()
				return e
			}
			ids = append(ids, v)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		more := len(ids) > limit
		if more {
			ids = ids[:limit]
		}
		for _, v := range ids {
			task, e := s.readTaskWithConsumptionInTx(ctx, tx, id, q.ProfileID, v, false)
			if e != nil {
				return e
			}
			candidate := append(out.Items, task)
			if len(encode(api.DelegationPage{Items: candidate}))+1024 > 524288 {
				if len(out.Items) == 0 {
					return fail("RESOURCE_LIMIT", "TASK_PAGE_TOO_LARGE")
				}
				more = true
				break
			}
			out.Items = candidate
		}
		// Only bodies actually included in this page expand the bound model's
		// durable provenance. A later authorization/SQL failure rolls all of
		// these unions back with the page; omitted lookahead never consumes.
		if _, bound := delegate.Execution(ctx); bound {
			for _, task := range out.Items {
				if task.Result != nil && task.Result.Text != "" {
					if _, e := s.readTaskInTx(ctx, tx, id, q.ProfileID, task.ID); e != nil {
						return e
					}
				}
			}
		}
		if more {
			out.NextCursor = base64.RawURLEncoding.EncodeToString([]byte(encode(struct{ After, Root, Principal string }{out.Items[len(out.Items)-1].ID, r.RootRunID, id.PrincipalID()})))
		}
		return nil
	})
	return out, e
}

func (s *Store) ProposeCreate(ctx context.Context, id api.RequestIdentity, c api.CreateProposal) (api.AgentProposal, error) {
	var out api.AgentProposal
	if e := commands.Validate(id, c.CommandMeta, false); e != nil {
		return out, e
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.proposeCreate", hash, &out)
		if e != nil || found {
			return e
		}
		a, e := s.actorInTx(ctx, tx, id, c.ProfileID, c.RunID, true)
		if e != nil {
			return e
		}
		out = api.AgentProposal{ProposalID: api.NewID("proposal:"), Draft: c.Draft, PreviewHash: hashText(encode(c.Draft)), Revision: "1"}
		_, e = tx.ExecContext(ctx, "INSERT INTO collaboration_proposals(proposal_id,profile_id,principal_id,run_id,draft_json,preview_hash,state,expires_at,created_at) VALUES(?,?,?,?,?,?,'pending',?,?)", out.ProposalID, c.ProfileID, id.PrincipalID(), a.run.ID, encode(c.Draft), out.PreviewHash, time.Now().Add(15*time.Minute).UTC().Format(api.TimestampLayout), time.Now().UTC().Format(api.TimestampLayout))
		if e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.proposeCreate", hash, a.agent.ID, out)
	})
	return out, e
}
func (s *Store) ConfirmProposal(ctx context.Context, id api.RequestIdentity, c api.ConfirmProposal) (api.Agent, error) {
	var out api.Agent
	if _, ok := delegate.Execution(ctx); ok {
		return out, api.Denied("USER_CONFIRMATION_REQUIRED")
	}
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return out, e
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.confirmProposal", hash, &out)
		if e != nil || found {
			return e
		}
		body, e := s.pendingProposalInTx(ctx, tx, id, c)
		if e != nil {
			return e
		}

		var draft api.AgentDraft
		if json.Unmarshal([]byte(body), &draft) != nil {
			return fail("CONFLICT", "PROPOSAL_STATE_INVALID")
		}
		out, e = s.config.CreateInTx(ctx, tx, id, api.AgentCreate{CommandMeta: c.CommandMeta, Draft: draft}, hash)
		if e != nil {
			return e
		}
		if _, e = tx.ExecContext(ctx, "UPDATE collaboration_proposals SET state='confirmed',agent_id=?,revision=revision+1 WHERE proposal_id=?", out.ID, c.ProposalID); e != nil {
			return e
		}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.confirmProposal", hash, out.ID, out)
	})
	return out, e
}

var _ api.CollaborationAPI = (*Store)(nil)
