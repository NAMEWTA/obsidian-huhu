package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type sourceRecord struct {
	Ref                api.DerivedInput
	Text, Role         string
	Partial            bool
	OriginKind         string
	OriginRunID        string
	Published          string
	Profile, Principal string
	Sources            []api.SourceSnapshot
	Scopes             []api.SourceScope
	Grants             []string
	Group              *api.GroupBinding
	Derived            []api.DerivedInput
	BodyBytes          int
}

func (s sourceRecord) witness() grants.MemoryWitness {
	return grants.MemoryWitness{Ref: s.Ref, OriginRunID: s.OriginRunID, PublishedMessageID: s.Published, Sources: s.Sources, Scopes: s.Scopes, GrantIDs: s.Grants, Group: s.Group}
}
func placeholders(count int) string { return strings.TrimSuffix(strings.Repeat("?,", count), ",") }

// Source bodies are only read after selection has established an owned source
// namespace. Facts callers use the same bounded batch, not one query per item.
func sourceRecords(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, refs []api.DerivedInput) (map[ownerKey]sourceRecord, error) {
	return readSources(ctx, tx, id, profile, refs, true)
}
func sourceMetadata(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, refs []api.DerivedInput) (map[ownerKey]sourceRecord, error) {
	return readSources(ctx, tx, id, profile, refs, false)
}
func readSources(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, refs []api.DerivedInput, bodies bool) (map[ownerKey]sourceRecord, error) {
	out := map[ownerKey]sourceRecord{}
	for _, kind := range []string{"message", "task_result"} {
		ids := []string{}
		seen := map[string]bool{}
		for _, ref := range refs {
			if ref.Kind == kind && !seen[ref.ID] {
				seen[ref.ID] = true
				ids = append(ids, ref.ID)
			}
		}
		for start := 0; start < len(ids); start += 256 {
			end := min(start+256, len(ids))
			args := []any{}
			for _, key := range ids[start:end] {
				args = append(args, key)
			}
			in := placeholders(len(args))
			queries := []string{}
			if kind == "message" {
				queries = append(queries,
					"SELECT m.message_id,m.text,m.role,m.partial,'conversation_message',m.run_id,CASE WHEN p.message_id IS NULL THEN '' ELSE m.message_id END,s.profile_id,s.principal_id,m.session_id,m.session_id,'1',m.source_json,r.effective_scope_json,r.effective_grants_json,r.group_binding_json,'[]',length(CAST(m.text AS BLOB)) FROM conversation_messages m JOIN execution_runs r ON r.run_id=m.run_id JOIN conversation_sessions s ON s.session_id=m.session_id LEFT JOIN group_publications p ON p.message_id=m.message_id WHERE m.message_id IN("+in+")",
					"SELECT m.message_id,m.text,'data',0,'thread_message',m.from_run_id,'',s.profile_id,m.principal_id,m.work_thread_id,m.work_thread_id,'1',m.source_json,r.effective_scope_json,r.effective_grants_json,m.group_binding_json,m.derived_json,length(CAST(m.text AS BLOB)) FROM collaboration_messages m JOIN execution_runs r ON r.run_id=m.from_run_id JOIN conversation_sessions s ON s.session_id=r.session_id WHERE m.message_id IN("+in+")")
			} else {
				queries = append(queries, "SELECT d.child_run_id,d.text,'assistant',d.partial,'task_result',d.child_run_id,'',s.profile_id,r.principal_id,r.work_thread_id,r.work_thread_id,CAST(r.revision AS TEXT),d.source_json,d.scope_json,d.grants_json,r.group_binding_json,d.derived_json,length(CAST(d.text AS BLOB)) FROM collaboration_result_deliveries d JOIN execution_runs r ON r.run_id=d.child_run_id JOIN conversation_sessions s ON s.session_id=r.session_id WHERE d.child_run_id IN("+in+")")
			}
			for _, query := range queries {
				if !bodies {
					query = strings.ReplaceAll(strings.ReplaceAll(query, ",m.text,", ",'',"), ",d.text,", ",'',")
				}
				rows, err := tx.QueryContext(ctx, query, args...)
				if err != nil {
					return nil, err
				}
				for rows.Next() {
					var source sourceRecord
					var sources, scopes, grantIDs, group, derived string
					source.Ref.Kind = kind
					if err = rows.Scan(&source.Ref.ID, &source.Text, &source.Role, &source.Partial, &source.OriginKind, &source.OriginRunID, &source.Published, &source.Profile, &source.Principal, &source.Ref.Namespace, &source.Ref.WorkThreadID, &source.Ref.Revision, &sources, &scopes, &grantIDs, &group, &derived, &source.BodyBytes); err != nil {
						rows.Close()
						return nil, err
					}
					if source.Profile != profile || source.Principal != id.PrincipalID() {
						rows.Close()
						return nil, api.Denied("MEMORY_NAMESPACE_DENIED")
					}
					if json.Unmarshal([]byte(sources), &source.Sources) != nil || source.Sources == nil || json.Unmarshal([]byte(scopes), &source.Scopes) != nil || source.Scopes == nil || json.Unmarshal([]byte(grantIDs), &source.Grants) != nil || source.Grants == nil || json.Unmarshal([]byte(group), &source.Group) != nil || !utf8.ValidString(source.Text) {
						rows.Close()
						return nil, invalidState()
					}
					source.Derived, err = decodeRefs(derived)
					if err != nil {
						rows.Close()
						return nil, err
					}
					source.Ref.Hash = digest(source.Text)
					if !bodies {
						for _, ref := range refs {
							if ref.Kind == kind && ref.ID == source.Ref.ID {
								source.Ref.Hash = ref.Hash
								break
							}
						}
					}
					key := refKey(source.Ref)
					if _, exists := out[key]; exists {
						rows.Close()
						return nil, invalidState()
					}
					out[key] = source
				}
				err = rows.Err()
				rows.Close()
				if err != nil {
					return nil, err
				}
			}
		}
	}
	return out, nil
}

func sourceMatches(expected api.DerivedInput, actual sourceRecord) bool {
	// A task result's immutable body is identified by its actual Run and hash.
	// Existing T11 refs can carry a later Run CAS (delivery/reconciliation is not
	// a new body); never substitute a different namespace, owner or body hash.
	if expected.Kind == "task_result" {
		return validRef(expected) && expected.ID == actual.Ref.ID && expected.Hash == actual.Ref.Hash && expected.Namespace == actual.Ref.Namespace && expected.WorkThreadID == actual.Ref.WorkThreadID
	}
	return expected == actual.Ref
}
