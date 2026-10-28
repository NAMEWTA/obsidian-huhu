package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/mailbox"
	"reflect"
	"sort"
	"strconv"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	contextaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	selection "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/context"
)

type runContext struct {
	Run                                                api.Run
	Access                                             api.RunAccessInput
	Namespace                                          namespace
	Intent, UserMessage, Thread, Policy, Claim, Config string
	Derived                                            []api.DerivedInput
	ExplicitSources                                    []api.SourceSnapshot
	ExplicitScopes                                     []api.SourceScope
}

func (s *Store) runContext(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, runID string) (runContext, error) {
	var out runContext
	var profile, principal, derived, sources, scopes string
	err := tx.QueryRowContext(ctx, "SELECT s.profile_id,r.principal_id,r.intent,r.user_message_id,r.work_thread_id,r.context_policy_version,r.claim_token,r.task_config_id,r.derived_json,r.source_json,r.scope_json FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id=?", runID).Scan(&profile, &principal, &out.Intent, &out.UserMessage, &out.Thread, &out.Policy, &out.Claim, &out.Config, &derived, &sources, &scopes)
	if err != nil {
		return out, missing(err, "RUN_NOT_FOUND")
	}
	if !id.Valid() || principal != id.PrincipalID() {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	out.Run, out.Access, err = execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: runID})
	if err != nil {
		return out, err
	}
	kind := out.Access.Recipient.SubjectKind
	if kind == "" {
		kind = "agent"
	}
	if kind != "agent" && kind != "temporary" {
		return out, invalidState()
	}
	out.Namespace, err = s.readNamespace(ctx, tx, id, profile, api.MemoryNamespace{Kind: kind, ID: out.Run.AgentID})
	if err != nil {
		return out, err
	}
	out.Derived, err = decodeRefs(derived)
	if err != nil {
		return out, err
	}
	if json.Unmarshal([]byte(sources), &out.ExplicitSources) != nil || out.ExplicitSources == nil || json.Unmarshal([]byte(scopes), &out.ExplicitScopes) != nil || out.ExplicitScopes == nil {
		return out, invalidState()
	}
	return out, nil
}
func (s *Store) activeContext(ctx context.Context, tx *sql.Tx, e api.ToolExecution) (runContext, error) {
	if err := s.admissionOpen(ctx); err != nil {
		return runContext{}, err
	}
	r, err := s.runContext(ctx, tx, e.Identity, e.Run.ID)
	if err != nil {
		return r, err
	}
	if r.Claim == "" || r.Claim != e.ClaimToken || r.Run.AgentID != e.Agent.ID || r.Run.Status != "preparing" && r.Run.Status != "running" {
		return r, api.Denied("RUN_CLAIM_CHANGED")
	}
	if r.Config != "" && r.Config != e.Config.ID {
		return r, invalidState()
	}
	return r, nil
}
func runScope(r runContext) api.MemoryScope {
	if r.Thread == r.Run.SessionID {
		return api.MemoryScope{Kind: "session", ID: r.Run.SessionID}
	}
	return api.MemoryScope{Kind: "work_thread", ID: r.Thread}
}

func accessUnion(base, extra api.RunAccessInput) (api.RunAccessInput, error) {
	out := base
	out.Sources = union(base.Sources, extra.Sources)
	out.Scopes = union(base.Scopes, extra.Scopes)
	out.GrantIDs = union(base.GrantIDs, extra.GrantIDs)
	var err error
	out.Group, err = groupaccess.UnionBinding(base.Group, extra.Group)
	if err != nil {
		return out, err
	}
	if len(out.Sources)+len(out.Scopes) > 32 || len(out.GrantIDs) > 64 {
		return out, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	if out.ParentScope != nil && !contextaccess.InParent(out) {
		return out, api.Denied("PARENT_SCOPE_EXCEEDED")
	}
	return out, contextaccess.Validate(out)
}
func (s *Store) sourceAccess(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, source sourceRecord, ops []string) (api.RunAccessInput, error) {
	check := r.Access
	check.Sources = source.Sources
	check.Scopes = source.Scopes
	var err error
	if source.Published == "" && source.Group != nil {
		check.Group, err = groupaccess.UnionBinding(check.Group, source.Group)
		if err != nil {
			return check, err
		}
	}
	check.GrantIDs, err = s.access.SelectInTx(ctx, tx, id, check, "", ops)
	if err != nil {
		return check, err
	}
	if err = s.access.CheckInTx(ctx, tx, id, check, ops); err != nil {
		return check, err
	}
	kind := "message"
	if source.Ref.Kind == "task_result" {
		kind = "run"
	}
	if err = s.qualify(ctx, tx, id, r.Namespace.Profile, r.Run.ID, grants.MemorySubject{Kind: kind, ID: source.Ref.ID}, ops); err != nil {
		return check, err
	}
	return check, nil
}

func (s *Store) PlanInTx(ctx context.Context, tx *sql.Tx, e api.ToolExecution) (execution.InitialContextPlan, error) {
	out := execution.InitialContextPlan{}
	r, err := s.activeContext(ctx, tx, e)
	if err != nil {
		return out, err
	}
	out.Access, err = accessUnion(r.Access, e.Access)
	if err != nil {
		return out, err
	}
	out.Derived, err = mergeRefs(r.Derived, e.Lineage.Derived)
	if err != nil {
		return out, err
	}
	var sealed int
	if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_run_contexts WHERE run_id=?", r.Run.ID).Scan(&sealed); err != nil {
		return out, err
	}
	if sealed > 0 {
		out.ShortTerm, err = s.ReadContextInTx(ctx, tx, e.Identity, r.Run.ID)
		if err != nil {
			return out, err
		}
		out.Memory, err = s.ReadInputInTx(ctx, tx, e.Identity, r.Run.ID)
		if err != nil {
			return out, err
		}
		out.Watermark = planWatermark(out, r)
		return out, nil
	}
	var maintenance bool
	if err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM memory_jobs WHERE run_id=?)", r.Run.ID).Scan(&maintenance); err != nil {
		return out, err
	}
	if maintenance {
		out.Memory, err = s.ReadInputInTx(ctx, tx, e.Identity, r.Run.ID)
		if err != nil {
			return out, err
		}
		if out.Memory == nil {
			return out, invalidState()
		}
		out.Watermark = planWatermark(out, r)
		return out, nil
	}
	if r.Policy != "extractive-v1" {
		return out, invalidState()
	}
	inbox, history, accessByRef, limited, err := s.contextCandidates(ctx, tx, e.Identity, r)
	if err != nil {
		return out, err
	}
	selected, err := selection.Select(api.ContextNamespace{SubjectKind: r.Namespace.Public.Kind, SubjectID: r.Namespace.Public.ID, SessionID: r.Run.SessionID, WorkThreadID: r.Thread}, r.Intent, inbox, history, limited)
	if err != nil {
		return out, err
	}
	kept := []api.ShortTermEntry{}
	for _, entry := range selected.Entries {
		refAccess := accessByRef[refKey(entry.Ref)]
		next, mergeErr := accessUnion(out.Access, refAccess)
		refs := []api.DerivedInput{entry.Ref}
		graph, graphErr := loadGraph(ctx, tx, []ownerKey{{"message", entry.Ref.ID}})
		if graphErr != nil {
			return out, graphErr
		}
		ancestors, graphErr := closure(graph, ownerKey{"message", entry.Ref.ID})
		if graphErr != nil {
			return out, graphErr
		}
		refs, graphErr = mergeRefs(refs, ancestors)
		if graphErr != nil {
			mergeErr = graphErr
		}
		var derived []api.DerivedInput
		if mergeErr == nil {
			derived, mergeErr = mergeRefs(out.Derived, refs)
		}
		if mergeErr != nil {
			var f *api.Fault
			if entry.Use != "inbox" && errors.As(mergeErr, &f) && f.Kind == "RESOURCE_LIMIT" {
				selected.Usage.OmittedAuthorized++
				continue
			}
			return out, mergeErr
		}
		out.Access, out.Derived = next, derived
		kept = append(kept, entry)
	}
	selected.Entries = kept
	selection.Recount(&selected)
	out.ShortTerm = &selected
	out.Memory, out.Access, out.Derived, err = s.recall(ctx, tx, e.Identity, r, out.Access, out.Derived)
	if err != nil {
		return out, err
	}
	out.Watermark = planWatermark(out, r)
	return out, nil
}

func planWatermark(plan execution.InitialContextPlan, r runContext) string {
	short := bodyFreeShort(plan.ShortTerm)
	memory := bodyFreeMemory(plan.Memory)
	return digest(encode(struct {
		Version, Run, Claim, IntentHash string
		Short                           *api.ShortTermInput
		Memory                          *api.ExecutionMemoryInput
		Access                          api.RunAccessInput
		Derived                         []api.DerivedInput
	}{"context-plan-v1", r.Run.ID, r.Claim, digest(r.Intent), short, memory, plan.Access, plan.Derived}))
}

func (s *Store) contextCandidates(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext) ([]selection.Candidate, []selection.Candidate, map[ownerKey]api.RunAccessInput, bool, error) {
	inbox, history := []selection.Candidate{}, []selection.Candidate{}
	access := map[ownerKey]api.RunAccessInput{}
	rows, err := tx.QueryContext(ctx, "SELECT message_id,from_agent_id,to_agent_id,created_at,kind,status,delegation_id,question_id,work_thread_id FROM collaboration_messages WHERE "+mailbox.InboxWhere+" ORDER BY created_at,message_id LIMIT 101", mailbox.InboxArgs(id.PrincipalID(), r.Run)...)
	if err != nil {
		return nil, nil, nil, false, err
	}
	messages := []api.AgentMessage{}
	refs := []api.DerivedInput{}
	for rows.Next() {
		var m api.AgentMessage
		if err = rows.Scan(&m.ID, &m.FromAgentID, &m.ToAgentID, &m.CreatedAt, &m.Kind, &m.Status, &m.DelegationID, &m.QuestionID, &m.WorkThreadID); err != nil {
			rows.Close()
			return nil, nil, nil, false, err
		}
		messages = append(messages, m)
		refs = append(refs, api.DerivedInput{Kind: "message", ID: m.ID})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, nil, false, err
	}
	if len(messages) > 100 {
		return nil, nil, nil, false, fault("RESOURCE_LIMIT", "CONTEXT_INPUT_LIMIT")
	}
	metadata, err := sourceMetadata(ctx, tx, id, r.Namespace.Profile, refs)
	if err != nil {
		return nil, nil, nil, false, err
	}
	bytes := 0
	for _, ref := range refs {
		m, ok := metadata[refKey(ref)]
		if !ok {
			return nil, nil, nil, false, invalidState()
		}
		bytes += m.BodyBytes
		if m.BodyBytes > 131072 || bytes > 262144 {
			return nil, nil, nil, false, fault("RESOURCE_LIMIT", "CONTEXT_INPUT_LIMIT")
		}
		a, e := s.sourceAccess(ctx, tx, id, r, m, []string{"read", "send"})
		if e != nil {
			return nil, nil, nil, false, e
		}
		access[refKey(ref)] = a
	}
	bodies, err := sourceRecords(ctx, tx, id, r.Namespace.Profile, refs)
	if err != nil {
		return nil, nil, nil, false, err
	}
	for _, message := range messages {
		source := bodies[ownerKey{"message", message.ID}]
		m := message
		inbox = append(inbox, selection.Candidate{Original: source.Text, Entry: api.ShortTermEntry{OriginKind: source.OriginKind, Ref: source.Ref, Role: "data", Message: &m, Partial: source.Partial}})
	}
	groupAudience := false
	audience := r.Access.Recipient.AgentID
	if r.Namespace.Public.Kind == "temporary" {
		// Only the pinned sponsor's actual group binding grants public history.
		// The temporary subject and private thread remain its own namespace.
		audience = r.Access.Recipient.SponsorAgentID
	}
	if r.Access.Group != nil {
		for _, member := range r.Access.Group.Members {
			if member.AgentID == audience {
				groupAudience = true
			}
		}
	}
	var query string
	args := []any{}
	if r.Thread == r.Run.SessionID || groupAudience {
		query = "SELECT m.message_id FROM conversation_messages m WHERE m.session_id=? AND m.message_id<>? AND (m.role='user' OR m.agent_id=?) ORDER BY m.seq DESC,m.message_id DESC LIMIT 60"
		args = []any{r.Run.SessionID, r.UserMessage, r.Run.AgentID}
		if groupAudience {
			query = "SELECT m.message_id FROM conversation_messages m WHERE m.session_id=? AND m.message_id<>? AND (m.role='user' OR EXISTS(SELECT 1 FROM group_publications p WHERE p.message_id=m.message_id)) ORDER BY m.seq DESC,m.message_id DESC LIMIT 60"
			args = []any{r.Run.SessionID, r.UserMessage}
		}
	} else {
		query = "SELECT message_id FROM collaboration_messages WHERE work_thread_id=? AND principal_id=? AND (from_agent_id=? OR to_agent_id=?) ORDER BY created_at DESC,message_id DESC LIMIT 60"
		args = []any{r.Thread, id.PrincipalID(), r.Run.AgentID, r.Run.AgentID}
	}
	rows, err = tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, nil, false, err
	}
	optional := []api.DerivedInput{}
	for rows.Next() {
		var value string
		if err = rows.Scan(&value); err != nil {
			rows.Close()
			return nil, nil, nil, false, err
		}
		optional = append(optional, api.DerivedInput{Kind: "message", ID: value})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, nil, false, err
	}
	limited := len(optional) == 60
	metadata, err = sourceMetadata(ctx, tx, id, r.Namespace.Profile, optional)
	if err != nil {
		return nil, nil, nil, false, err
	}
	readBytes := 0
	qualified := []api.DerivedInput{}
	for _, ref := range optional {
		source, ok := metadata[refKey(ref)]
		if !ok {
			return nil, nil, nil, false, invalidState()
		}
		if groupAudience {
			visible, e := groupaccess.PublicMessageVisibleInTx(ctx, tx, id, r.Access, ref.ID)
			if e != nil {
				if safeUnavailable(e) {
					continue
				}
				return nil, nil, nil, false, e
			}
			if !visible {
				continue
			}
		}
		a, e := s.sourceAccess(ctx, tx, id, r, source, []string{"read", "send"})
		if e != nil {
			if safeUnavailable(e) {
				continue
			}
			return nil, nil, nil, false, e
		}
		if source.BodyBytes == 0 {
			continue
		}
		if source.BodyBytes > 131072 {
			limited = true
			continue
		}
		if readBytes+source.BodyBytes > 524288 {
			limited = true
			break
		}
		readBytes += source.BodyBytes
		qualified = append(qualified, ref)
		access[refKey(ref)] = a
	}
	bodies, err = sourceRecords(ctx, tx, id, r.Namespace.Profile, qualified)
	if err != nil {
		return nil, nil, nil, false, err
	}
	for _, ref := range qualified {
		source := bodies[refKey(ref)]
		role := source.Role
		if role != "user" && role != "assistant" {
			role = "data"
		}
		history = append(history, selection.Candidate{Original: source.Text, Entry: api.ShortTermEntry{OriginKind: source.OriginKind, Ref: source.Ref, Role: role, Partial: source.Partial}})
	}
	return inbox, history, access, limited, nil
}

func (s *Store) recall(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, access api.RunAccessInput, derived []api.DerivedInput) (*api.ExecutionMemoryInput, api.RunAccessInput, []api.DerivedInput, error) {
	type candidate struct {
		ns     namespace
		id     string
		pinned bool
	}
	candidates := []candidate{}
	namespaces := []namespace{}
	if r.Namespace.ID != "" {
		namespaces = append(namespaces, r.Namespace)
	}
	global, err := globalNamespace(ctx, tx, s, id, r.Namespace.Profile)
	if err != nil {
		return nil, access, derived, err
	}
	if global.ID != "" {
		namespaces = append(namespaces, global)
	}
	for _, n := range namespaces {
		rows, e := tx.QueryContext(ctx, "SELECT item_id,pinned FROM memory_items WHERE namespace_id=? AND state='active' AND (scope_kind='profile' OR (scope_kind='session' AND scope_id=?) OR (scope_kind='work_thread' AND scope_id=?))", n.ID, r.Run.SessionID, r.Thread)
		if e != nil {
			return nil, access, derived, e
		}
		for rows.Next() {
			var item string
			var pinned bool
			if e = rows.Scan(&item, &pinned); e != nil {
				rows.Close()
				return nil, access, derived, e
			}
			candidates = append(candidates, candidate{ns: n, id: item, pinned: pinned})
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, access, derived, e
		}
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].pinned != candidates[j].pinned {
			return candidates[i].pinned
		}
		return candidates[i].id < candidates[j].id
	})
	if len(candidates) > 20 {
		candidates = candidates[:20]
	}
	input := &api.ExecutionMemoryInput{Version: "1", Mode: "recall", Namespace: r.Namespace.Public, Entries: []api.MemoryInputEntry{}, Targets: []api.MemoryTarget{}}
	bytes := 0
	for _, candidate := range candidates {
		item, e := itemMetadata(ctx, tx, candidate.ns, candidate.id)
		if e != nil {
			return nil, access, derived, e
		}
		facts, e := s.ReadFactsInTx(ctx, tx, id, r.Namespace.Profile, []grants.MemorySubject{{Kind: "memory_revision", ID: item.RevisionID}})
		if e != nil {
			if safeUnavailable(e) {
				continue
			}
			return nil, access, derived, e
		}
		next := access
		allowed := true
		for _, req := range facts.Requirements {
			if _, e = s.access.CheckMemoryInTx(ctx, tx, id, r.Namespace.Profile, r.Run.ID, req, []string{"read", "send"}); e != nil {
				if safeUnavailable(e) {
					allowed = false
					break
				}
				return nil, access, derived, e
			}
			for _, w := range req.Witnesses {
				a, e := s.sourceAccess(ctx, tx, id, r, sourceRecord{Ref: w.Ref, OriginRunID: w.OriginRunID, Published: w.PublishedMessageID, Sources: w.Sources, Scopes: w.Scopes, Grants: w.GrantIDs, Group: w.Group}, []string{"read", "send"})
				if e != nil {
					return nil, access, derived, e
				}
				next, e = accessUnion(next, a)
				if e != nil {
					allowed = false
					break
				}
			}
		}
		if !allowed {
			continue
		}
		item.Body, e = revisionBody(ctx, tx, item.RevisionID)
		if e != nil {
			return nil, access, derived, e
		}
		if bytes+len(item.Body.Text) > 131072 {
			continue
		}
		ref := revisionRef(candidate.ns, item)
		refs, e := mergeRefs(item.Body.Derived, []api.DerivedInput{ref})
		if e != nil {
			return nil, access, derived, e
		}
		newDerived, e := mergeRefs(derived, refs)
		if e != nil {
			var f *api.Fault
			if errors.As(e, &f) && f.Kind == "RESOURCE_LIMIT" {
				continue
			}
			return nil, access, derived, e
		}
		bytes += len(item.Body.Text)
		input.Entries = append(input.Entries, api.MemoryInputEntry{Ref: ref, Role: "memory", Text: item.Body.Text})
		access, derived = next, newDerived
	}
	if len(input.Entries) == 0 {
		return nil, access, derived, nil
	}
	input.BindingDigest, err = api.CanonicalMemoryInputBinding(*input)
	return input, access, derived, err
}

func samePlanInputs(a, b execution.InitialContextPlan) bool {
	return reflect.DeepEqual(a.Access, b.Access) && reflect.DeepEqual(a.Derived, b.Derived)
}
func decimal(v int64) string { return strconv.FormatInt(v, 10) }
