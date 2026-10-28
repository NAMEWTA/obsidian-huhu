package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"
	"sort"
	"strconv"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type factMeta struct {
	Namespace                               namespace
	Scope                                   api.MemoryScope
	ID, ItemID, Hash, State, Head, Revision string
	Derived                                 []api.DerivedInput
	Body                                    bool
	Entry                                   *storedContextEntry
}

func factMetadata(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, kind string, ids []string) (map[string]factMeta, error) {
	out := map[string]factMeta{}
	for start := 0; start < len(ids); start += 256 {
		end := min(start+256, len(ids))
		args := []any{}
		for _, value := range ids[start:end] {
			args = append(args, value)
		}
		query := ""
		switch kind {
		case "memory_revision":
			query = "SELECT r.revision_id,i.item_id,r.content_hash,i.state,i.head_revision_id,CAST(i.revision AS TEXT),r.derived_json,EXISTS(SELECT 1 FROM memory_revision_bodies b WHERE b.revision_id=r.revision_id),i.scope_kind,i.scope_id,n.namespace_id,n.profile_id,n.principal_id,n.kind,n.subject_id,n.catalog_revision,n.settings_revision,n.suppression_revision,n.enabled FROM memory_revisions r JOIN memory_items i ON i.item_id=r.item_id JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE r.revision_id IN(" + placeholders(len(args)) + ")"
		case "memory_candidate":
			query = "SELECT c.candidate_id,c.target_item_id,c.content_hash,c.state,'',CAST(c.revision AS TEXT),c.derived_json,EXISTS(SELECT 1 FROM memory_candidate_bodies b WHERE b.candidate_id=c.candidate_id),c.scope_kind,c.scope_id,n.namespace_id,n.profile_id,n.principal_id,n.kind,n.subject_id,n.catalog_revision,n.settings_revision,n.suppression_revision,n.enabled FROM memory_candidates c JOIN memory_namespaces n ON n.namespace_id=c.namespace_id WHERE c.candidate_id IN(" + placeholders(len(args)) + ")"
		case "context_entry":
			query = "SELECT e.entry_id,'',e.source_hash,'active',r.run_id,CAST(c.manifest_revision AS TEXT),e.metadata_json,1,CASE WHEN r.work_thread_id=r.session_id THEN 'session' ELSE 'work_thread' END,CASE WHEN r.work_thread_id=r.session_id THEN r.session_id ELSE r.work_thread_id END,n.namespace_id,n.profile_id,n.principal_id,n.kind,n.subject_id,n.catalog_revision,n.settings_revision,n.suppression_revision,n.enabled FROM memory_context_entries e JOIN memory_run_contexts c ON c.run_id=e.run_id JOIN execution_runs r ON r.run_id=e.run_id JOIN memory_namespaces n ON n.namespace_id=c.namespace_id WHERE e.entry_id IN(" + placeholders(len(args)) + ") AND n.subject_id=r.agent_id"
		default:
			return nil, invalidState()
		}
		rows, err := tx.QueryContext(ctx, query, args...)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var m factMeta
			var raw string
			n := &m.Namespace
			if err = rows.Scan(&m.ID, &m.ItemID, &m.Hash, &m.State, &m.Head, &m.Revision, &raw, &m.Body, &m.Scope.Kind, &m.Scope.ID, &n.ID, &n.Profile, &n.Principal, &n.Public.Kind, &n.Public.ID, &n.Catalog, &n.Settings, &n.Suppression, &n.Enabled); err != nil {
				rows.Close()
				return nil, err
			}
			if n.Profile != profile || n.Principal != id.PrincipalID() {
				rows.Close()
				return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
			}
			if kind == "context_entry" {
				m.Derived = []api.DerivedInput{}
				m.Entry = &storedContextEntry{}
				if json.Unmarshal([]byte(raw), m.Entry) != nil || m.Entry.View.ID != m.ID || m.Entry.View.Text != nil || m.Entry.Ref != nil && m.Entry.Ref.Hash != m.Hash || m.Entry.Attachment != nil && (m.Entry.View.Kind != "attachment" || m.Entry.View.Representation != "metadata" || m.Entry.Attachment.TaskID != m.Head) {
					rows.Close()
					return nil, invalidState()
				}
			} else {
				m.Derived, err = decodeRefs(raw)
			}
			if err != nil {
				rows.Close()
				return nil, err
			}
			out[m.ID] = m
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
	}
	for _, value := range ids {
		if _, ok := out[value]; !ok {
			return nil, invalidState()
		}
	}
	return out, nil
}

// Current inherited inputs are read from the real Run/message lineage as well
// as Memory output relations. A caller cannot erase a late consumed dependency
// by supplying an old EngineInput with Memory=nil.
func effectiveFacts(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, subjects []grants.MemorySubject) (map[ownerKey][]api.DerivedInput, error) {
	out := map[ownerKey][]api.DerivedInput{}
	for _, kind := range []string{"run", "message"} {
		ids := []string{}
		for _, v := range subjects {
			if v.Kind == kind {
				ids = append(ids, v.ID)
			}
		}
		for start := 0; start < len(ids); start += 256 {
			end := min(start+256, len(ids))
			args := []any{}
			for _, v := range ids[start:end] {
				args = append(args, v)
			}
			query := "SELECT r.run_id,r.derived_json,s.profile_id,r.principal_id FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id WHERE r.run_id IN(" + placeholders(len(args)) + ")"
			if kind == "message" {
				query = "SELECT m.message_id,m.derived_json,s.profile_id,m.principal_id FROM collaboration_messages m JOIN execution_runs r ON r.run_id=m.from_run_id JOIN conversation_sessions s ON s.session_id=r.session_id WHERE m.message_id IN(" + placeholders(len(args)) + ")"
			}
			rows, err := tx.QueryContext(ctx, query, args...)
			if err != nil {
				return nil, err
			}
			for rows.Next() {
				var key, raw, p, principal string
				if err = rows.Scan(&key, &raw, &p, &principal); err != nil {
					rows.Close()
					return nil, err
				}
				if p != profile || principal != id.PrincipalID() {
					rows.Close()
					return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
				}
				refs, e := decodeRefs(raw)
				if e != nil {
					rows.Close()
					return nil, e
				}
				out[ownerKey{kind, key}] = refs
			}
			err = rows.Err()
			rows.Close()
			if err != nil {
				return nil, err
			}
			if kind != "run" {
				continue
			}
			rows, err = tx.QueryContext(ctx, "SELECT output_run_id,input_kind,input_id,revision,content_hash,namespace,work_thread_id FROM collaboration_lineage WHERE output_run_id IN("+placeholders(len(args))+")", args...)
			if err != nil {
				return nil, err
			}
			for rows.Next() {
				var run string
				var ref api.DerivedInput
				if err = rows.Scan(&run, &ref.Kind, &ref.ID, &ref.Revision, &ref.Hash, &ref.Namespace, &ref.WorkThreadID); err != nil {
					rows.Close()
					return nil, err
				}
				key := ownerKey{"run", run}
				out[key], err = mergeRefs(out[key], []api.DerivedInput{ref})
				if err != nil {
					rows.Close()
					return nil, err
				}
			}
			err = rows.Err()
			rows.Close()
			if err != nil {
				return nil, err
			}
		}
	}
	return out, nil
}

func (s *Store) ReadFactsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, subjects []grants.MemorySubject) (grants.MemoryFacts, error) {
	out := grants.MemoryFacts{Requirements: []grants.MemoryRequirement{}, Dependencies: []grants.MemoryDependency{}}
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	if len(subjects) > 800 {
		return out, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	if _, err := conv.Metadata(ctx, tx, profile); err != nil {
		return out, err
	}
	unique := []grants.MemorySubject{}
	seen := map[ownerKey]bool{}
	roots := []ownerKey{}
	for _, subject := range subjects {
		if subject.ID == "" || len(subject.ID) > 512 {
			return out, invalidState()
		}
		switch subject.Kind {
		case "run", "message", "memory_revision", "memory_candidate", "context_entry":
		default:
			return out, invalidState()
		}
		key := ownerKey{subject.Kind, subject.ID}
		if seen[key] {
			continue
		}
		seen[key] = true
		unique = append(unique, subject)
		roots = append(roots, key)
		if subject.Kind == "run" {
			roots = append(roots, ownerKey{"private_result", subject.ID})
		}
	}
	extra, err := effectiveFacts(ctx, tx, id, profile, unique)
	if err != nil {
		return out, err
	}
	for _, refs := range extra {
		for _, ref := range refs {
			roots = append(roots, dependencyOwner(ref))
		}
	}
	graph, err := loadGraph(ctx, tx, roots)
	if err != nil {
		return out, err
	}
	for key, refs := range extra {
		graph[key], err = mergeRefs(graph[key], refs)
		if err != nil {
			return out, err
		}
	}
	closures := map[ownerKey][]api.DerivedInput{}
	revisionIDs := map[string]bool{}
	candidateIDs := []string{}
	entryIDs := []string{}
	primitive := []api.DerivedInput{}
	for _, subject := range unique {
		key := ownerKey{subject.Kind, subject.ID}
		refs, e := closure(graph, key)
		if e != nil {
			return out, e
		}
		if subject.Kind == "run" {
			more, e := closure(graph, ownerKey{"private_result", subject.ID})
			if e != nil {
				return out, e
			}
			refs, e = mergeRefs(refs, more)
			if e != nil {
				return out, e
			}
		}
		closures[key] = refs
		needs := subject.Kind == "memory_revision" || subject.Kind == "memory_candidate" || subject.Kind == "context_entry"
		for _, ref := range refs {
			if ref.Kind == "memory_revision" {
				revisionIDs[ref.ID] = true
				needs = true
			}
		}
		if needs {
			for _, ref := range refs {
				if ref.Kind != "memory_revision" {
					primitive = append(primitive, ref)
				}
			}
		}
		switch subject.Kind {
		case "memory_revision":
			revisionIDs[subject.ID] = true
		case "memory_candidate":
			candidateIDs = append(candidateIDs, subject.ID)
		case "context_entry":
			entryIDs = append(entryIDs, subject.ID)
		}
	}
	ids := []string{}
	for value := range revisionIDs {
		ids = append(ids, value)
	}
	sort.Strings(ids)
	revisions, err := factMetadata(ctx, tx, id, profile, "memory_revision", ids)
	if err != nil {
		return out, err
	}
	candidates, err := factMetadata(ctx, tx, id, profile, "memory_candidate", candidateIDs)
	if err != nil {
		return out, err
	}
	entries, err := factMetadata(ctx, tx, id, profile, "context_entry", entryIDs)
	if err != nil {
		return out, err
	}
	for _, set := range []struct {
		kind   string
		values map[string]factMeta
	}{{"memory_revision", revisions}, {"memory_candidate", candidates}} {
		for key, meta := range set.values {
			stored, _ := mergeRefs(nil, graph[ownerKey{set.kind, key}])
			if !reflect.DeepEqual(stored, meta.Derived) {
				return out, invalidState()
			}
			if meta.State == "forgotten" {
				return out, api.Denied("MEMORY_FORGOTTEN")
			}
			if set.kind == "memory_revision" && meta.Head != key {
				return out, api.Denied("MEMORY_REVISION_INACTIVE")
			}
			if set.kind == "memory_candidate" && meta.State != "pending" && meta.State != "applied" {
				return out, api.Denied("MEMORY_REVISION_INACTIVE")
			}
			if !meta.Body {
				return out, invalidState()
			}
		}
	}
	for _, refs := range closures {
		for _, ref := range refs {
			if ref.Kind == "memory_revision" {
				m := revisions[ref.ID]
				thread := m.Scope.ID
				if thread == "" {
					thread = profile
				}
				if ref.Revision != "1" || ref.Hash != m.Hash || ref.Namespace != m.Namespace.ID || ref.WorkThreadID != thread {
					return out, invalidState()
				}
			}
		}
	}
	for _, subject := range unique {
		refs := closures[ownerKey{subject.Kind, subject.ID}]
		if subject.Kind == "memory_revision" {
			m := revisions[subject.ID]
			thread := m.Scope.ID
			if thread == "" {
				thread = profile
			}
			refs, err = mergeRefs(refs, []api.DerivedInput{{Kind: "memory_revision", ID: m.ID, Revision: "1", Hash: m.Hash, Namespace: m.Namespace.ID, WorkThreadID: thread}})
			if err != nil {
				return out, err
			}
		}
		out.Dependencies = append(out.Dependencies, grants.MemoryDependency{Subject: subject, Derived: refs})
	}
	sources, err := sourceMetadata(ctx, tx, id, profile, primitive)
	if err != nil {
		return out, err
	}
	for _, ref := range primitive {
		source, ok := sources[refKey(ref)]
		if !ok || source.BodyBytes == 0 || !sourceMatches(ref, source) {
			return out, invalidState()
		}
	}
	ruleIDs := []string{}
	for _, refs := range closures {
		for _, ref := range refs {
			ruleIDs = append(ruleIDs, ref.ID)
		}
	}
	for _, m := range revisions {
		ruleIDs = append(ruleIDs, m.ItemID)
	}
	for _, m := range candidates {
		ruleIDs = append(ruleIDs, m.ItemID)
	}
	rules, err := suppressionFacts(ctx, tx, id, profile, ruleIDs)
	if err != nil {
		return out, err
	}
	// Deterministic grouping preserves the actual owner of every ancestor;
	// delegated or published propagation is proven by T05, not relabeled here.
	watermarks := []string{}
	for _, subject := range unique {
		key := ownerKey{subject.Kind, subject.ID}
		refs := closures[key]
		groups := map[string]*grants.MemoryRequirement{}
		metas := []factMeta{}
		for _, ref := range refs {
			if ref.Kind == "memory_revision" {
				metas = append(metas, revisions[ref.ID])
			}
		}
		switch subject.Kind {
		case "memory_revision":
			metas = append(metas, revisions[subject.ID])
		case "memory_candidate":
			metas = append(metas, candidates[subject.ID])
		case "context_entry":
			metas = append(metas, entries[subject.ID])
		}
		for _, meta := range metas {
			group := meta.Namespace.ID + "\x00" + meta.Scope.Kind + "\x00" + meta.Scope.ID
			req := groups[group]
			if req == nil {
				req = &grants.MemoryRequirement{Subject: subject, Namespace: meta.Namespace.Public, Scope: meta.Scope, RevisionIDs: []string{}, Witnesses: []grants.MemoryWitness{}}
				groups[group] = req
			}
			if meta.Entry != nil && meta.Entry.Attachment != nil {
				a := meta.Entry.Attachment
				req.Witnesses = append(req.Witnesses, grants.MemoryWitness{OriginRunID: meta.Head, Sources: a.Sources, Scopes: a.Scopes, GrantIDs: a.GrantIDs, Group: a.Group})
			}
			if _, ok := revisions[meta.ID]; ok {
				req.RevisionIDs = union(req.RevisionIDs, []string{meta.ID})
			}
			watermarks = append(watermarks, encode(struct{ ID, Item, Hash, Head, State, Revision string }{meta.ID, meta.ItemID, meta.Hash, meta.Head, meta.State, meta.Revision}))
			matched, err := checkSuppression(meta, refs, rules)
			if err != nil {
				return out, err
			}
			watermarks = append(watermarks, matched...)
		}
		keys := []string{}
		for group := range groups {
			keys = append(keys, group)
		}
		sort.Strings(keys)
		for _, group := range keys {
			req := groups[group]
			sort.Strings(req.RevisionIDs)
			for _, ref := range refs {
				if ref.Kind != "memory_revision" {
					source := sources[refKey(ref)]
					source.Ref = ref
					req.Witnesses = append(req.Witnesses, source.witness())
				}
			}
			if len(req.RevisionIDs) > 128 || len(req.Witnesses) > 128 {
				return out, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
			}
			out.Requirements = append(out.Requirements, *req)
		}
	}
	sort.Strings(watermarks)
	out.Watermark = digest(encode(struct {
		Version      string
		Requirements []grants.MemoryRequirement
		State        []string
	}{"memory-facts-v1", out.Requirements, watermarks}))
	return out, nil
}

type suppressionRule struct {
	Namespace, Kind, ID, Rule, Item string
	Generation                      int64
}

func suppressionFacts(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (map[string][]suppressionRule, error) {
	out := map[string][]suppressionRule{}
	ids = union([]string{}, ids)
	for start := 0; start < len(ids); start += 256 {
		end := min(start+256, len(ids))
		args := []any{profile, id.PrincipalID()}
		for _, v := range ids[start:end] {
			args = append(args, v)
		}
		rows, err := tx.QueryContext(ctx, "SELECT s.namespace_id,s.origin_kind,s.origin_stable_id,s.rule_kind,s.protected_item_id,s.generation FROM memory_suppressions s JOIN memory_namespaces n ON n.namespace_id=s.namespace_id WHERE n.profile_id=? AND n.principal_id=? AND s.origin_stable_id IN("+placeholders(end-start)+") ORDER BY s.namespace_id,s.origin_kind,s.origin_stable_id,s.rule_kind", args...)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var r suppressionRule
			if err = rows.Scan(&r.Namespace, &r.Kind, &r.ID, &r.Rule, &r.Item, &r.Generation); err != nil {
				rows.Close()
				return nil, err
			}
			if r.Generation < 1 {
				rows.Close()
				return nil, invalidState()
			}
			key := r.Namespace + "\x00" + r.Kind + "\x00" + r.ID
			out[key] = append(out[key], r)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
	}
	return out, nil
}
func checkSuppression(meta factMeta, refs []api.DerivedInput, rules map[string][]suppressionRule) ([]string, error) {
	state := []string{}
	if meta.ItemID == "" {
		return state, nil
	}
	keys := []ownerKey{{"user_intent", meta.ItemID}}
	for _, ref := range refs {
		keys = append(keys, refKey(ref))
	}
	for _, key := range keys {
		for _, r := range rules[meta.Namespace.ID+"\x00"+key.Kind+"\x00"+key.ID] {
			state = append(state, encode(r))
			if r.Rule == "deny_automatic" {
				return nil, api.Denied("MEMORY_FORGOTTEN")
			}
			if r.Rule == "protect_item" && r.Item != meta.ItemID {
				return nil, api.Denied("MEMORY_REVISION_INACTIVE")
			}
		}
	}
	return state, nil
}

func (s *Store) SnapshotUsageInTx(ctx context.Context, tx *sql.Tx, agentID string) (api.AgentUsage, error) {
	out := api.AgentUsage{MemoryIDs: []string{}}
	rows, err := tx.QueryContext(ctx, "SELECT i.item_id,CAST(i.revision AS TEXT) FROM memory_items i JOIN memory_namespaces n ON n.namespace_id=i.namespace_id WHERE n.kind='agent' AND n.subject_id=? UNION ALL SELECT j.job_id,CAST(j.revision AS TEXT) FROM memory_jobs j JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE n.kind='agent' AND n.subject_id=? AND (j.commit_state='pending' OR j.admission='pending') UNION ALL SELECT c.candidate_id,CAST(c.revision AS TEXT) FROM memory_candidates c JOIN memory_namespaces n ON n.namespace_id=c.namespace_id WHERE n.kind='agent' AND n.subject_id=? AND c.state='pending' ORDER BY 1", agentID, agentID, agentID)
	if err != nil {
		return out, err
	}
	state := []string{}
	for rows.Next() {
		var id, revision string
		if err = rows.Scan(&id, &revision); err != nil {
			rows.Close()
			return out, err
		}
		out.MemoryIDs = append(out.MemoryIDs, id)
		state = append(state, id, revision)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	out.RevisionToken = digest(encode(struct {
		Version, Agent string
		State          []string
	}{"memory-usage-v1", agentID, state}))
	return out, nil
}

func (s *Store) RecoveryWatermarkInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, runIDs []string) (string, error) {
	if len(runIDs) > 33 {
		return "", fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	subjects := []grants.MemorySubject{}
	for _, run := range runIDs {
		subjects = append(subjects, grants.MemorySubject{Kind: "run", ID: run})
	}
	facts, err := s.ReadFactsInTx(ctx, tx, id, profile, subjects)
	if err != nil {
		return "", err
	}
	state := []string{facts.Watermark}
	if len(runIDs) == 0 {
		return digest(encode(state)), nil
	}
	args := []any{}
	for _, run := range runIDs {
		args = append(args, run)
	}
	rows, err := tx.QueryContext(ctx, "SELECT r.run_id,r.context_policy_version,COALESCE(c.short_term_digest,''),COALESCE(c.memory_digest,''),COALESCE(c.job_id,''),COALESCE(CAST(j.generation AS TEXT),''),COALESCE(CAST(j.settings_revision AS TEXT),''),COALESCE(j.commit_state,''),COALESCE(CAST(n.settings_revision AS TEXT),''),COALESCE(CAST(n.enabled AS TEXT),'') FROM execution_runs r LEFT JOIN memory_run_contexts c ON c.run_id=r.run_id LEFT JOIN memory_jobs j ON j.run_id=r.run_id LEFT JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE r.run_id IN("+placeholders(len(args))+") ORDER BY r.run_id", args...)
	if err != nil {
		return "", err
	}
	count := 0
	for rows.Next() {
		values := make([]string, 10)
		dest := make([]any, 10)
		for i := range values {
			dest[i] = &values[i]
		}
		if err = rows.Scan(dest...); err != nil {
			rows.Close()
			return "", err
		}
		state = append(state, encode(values))
		count++
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return "", err
	}
	if count != len(runIDs) {
		return "", invalidState()
	}
	state = append(state, strconv.Itoa(count))
	return digest(encode(state)), nil
}
