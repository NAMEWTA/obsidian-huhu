package grants

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	groupaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/groups"
	contextaccess "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"reflect"
)

type attachmentChecker interface {
	CheckAttachmentsInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string, api.MessageAttachments) error
}

func (s *Store) SetGroups(checker attachmentChecker) { s.attachments = checker }
func (s *Store) CheckAttachmentsInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, message string, expected api.MessageAttachments) error {
	if len(expected.SourceRefs)+len(expected.SourceScopes) == 0 {
		return nil
	}
	if s.attachments == nil {
		return api.Denied("GROUP_ATTACHMENTS_NOT_ASSEMBLED")
	}
	return s.attachments.CheckAttachmentsInTx(ctx, tx, id, profile, message, expected)
}

// PrivateMessageInTx reads the sending-time member proof, not the sender's later
// effective context. It must remain a subset of the immutable-growing Run proof.
func (s *Store) PrivateMessageInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, message string) (api.RunAccessInput, []api.DerivedInput, error) {
	var run, rawGroup, rawSources, rawDerived, principal string
	e := tx.QueryRowContext(ctx, "SELECT from_run_id,group_binding_json,source_json,derived_json,principal_id FROM collaboration_messages WHERE message_id=?", message).Scan(&run, &rawGroup, &rawSources, &rawDerived, &principal)
	if e != nil {
		return api.RunAccessInput{}, nil, e
	}
	if principal != id.PrincipalID() {
		return api.RunAccessInput{}, nil, api.Denied("MESSAGE_READ_DENIED")
	}
	_, in, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: profile, ID: run})
	if e != nil {
		return in, nil, e
	}
	var sources []api.SourceSnapshot
	var group *api.GroupBinding
	var derived []api.DerivedInput
	if json.Unmarshal([]byte(rawSources), &sources) != nil || json.Unmarshal([]byte(rawGroup), &group) != nil || json.Unmarshal([]byte(rawDerived), &derived) != nil {
		return in, nil, fault("CONFLICT", "MESSAGE_CONTEXT_INVALID")
	}
	if !groupaccess.BindingContains(in.Group, group) {
		return in, nil, fault("CONFLICT", "GROUP_BINDING_INVALID")
	}
	in = contextaccess.HistoryReadInput(in, sources)
	in.Group = group
	facts, e := loadReadFacts(ctx, tx, id, profile, []api.RunAccessInput{in})
	if e != nil {
		return in, nil, e
	}
	if e = s.checkSourcesInTx(ctx, tx, id, in, []string{"read"}, true, facts); e != nil {
		return in, nil, e
	}
	if _, e = s.CheckConsumedMemoryInTx(ctx, tx, id, profile, "", MemorySubject{Kind: "message", ID: message}, []string{"read"}); e != nil {
		return in, nil, e
	}
	return in, derived, nil
}

// ConsumePrivateInTx is only called with owned rows loaded by the private
// result/message readers. Every permission is checked before its effective
// provenance and member qualifications are committed to the consumer Run.
func (s *Store) ConsumePrivateInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, consumer, origin api.RunAccessInput, derived []api.DerivedInput, subjects ...MemorySubject) error {
	subject := MemorySubject{Kind: "run", ID: origin.TaskID}
	if len(subjects) > 0 {
		subject = subjects[0]
	}
	closure, _, e := s.consumedMemoryInTx(ctx, tx, id, consumer.ProfileID, consumer.TaskID, subject, []string{"read", "send"})
	if e != nil {
		return e
	}
	derived, e = mergeMemoryDerived(derived, closure)
	if e != nil {
		return e
	}
	next := consumer
	if origin.Group != nil {
		var e error
		next.Group, e = groupaccess.UnionBinding(consumer.Group, origin.Group)
		if e != nil {
			return e
		}
	}
	next.Sources = append([]api.SourceSnapshot{}, consumer.Sources...)
	next.Scopes = append([]api.SourceScope{}, consumer.Scopes...)
	for _, source := range origin.Sources {
		found := false
		for _, old := range next.Sources {
			if reflect.DeepEqual(old, source) {
				found = true
			}
			if old.ResourceID == source.ResourceID && !reflect.DeepEqual(old, source) {
				return fault("RESOURCE_LIMIT", "THREAD_PROVENANCE_LIMIT")
			}
		}
		if !found {
			next.Sources = append(next.Sources, source)
		}
	}
	for _, scope := range origin.Scopes {
		found := false
		for _, old := range next.Scopes {
			if reflect.DeepEqual(old, scope) {
				found = true
			}
			if old.ResourceID == scope.ResourceID && !reflect.DeepEqual(old, scope) {
				return fault("RESOURCE_LIMIT", "THREAD_PROVENANCE_LIMIT")
			}
		}
		if !found {
			next.Scopes = append(next.Scopes, scope)
		}
	}
	var raw, parent string
	if e := tx.QueryRowContext(ctx, "SELECT derived_json,parent_run_id FROM execution_runs WHERE run_id=?", consumer.TaskID).Scan(&raw, &parent); e != nil {
		return e
	}
	var lineage []api.DerivedInput
	if json.Unmarshal([]byte(raw), &lineage) != nil {
		return fault("CONFLICT", "LINEAGE_STATE_INVALID")
	}
	for _, d := range derived {
		found := false
		for _, old := range lineage {
			if old.Kind == d.Kind && old.ID == d.ID && old != d {
				return fault("CONFLICT", "LINEAGE_STATE_INVALID")
			}
			if old == d {
				found = true
			}
		}
		if !found {
			lineage = append(lineage, d)
		}
	}
	if len(next.Sources)+len(next.Scopes) > 32 || len(lineage) > 128 {
		return fault("RESOURCE_LIMIT", "THREAD_PROVENANCE_LIMIT")
	}
	if !contextaccess.InParent(next) {
		return api.Denied("PARENT_SCOPE_EXCEEDED")
	}
	grants, e := s.SelectInTx(ctx, tx, id, next, parent, []string{"read", "send"})
	if e != nil {
		return e
	}
	next.GrantIDs = grants
	if len(grants) > 64 {
		return fault("RESOURCE_LIMIT", "THREAD_PROVENANCE_LIMIT")
	}
	facts, e := loadReadFacts(ctx, tx, id, next.ProfileID, []api.RunAccessInput{next})
	if e != nil {
		return e
	}
	if e = s.checkInTx(ctx, tx, id, next, []string{"read", "send"}, true, facts); e != nil {
		return e
	}
	if reflect.DeepEqual(next, consumer) && raw == encodeGroupValue(lineage) {
		return nil
	}
	result, e := tx.ExecContext(ctx, "UPDATE execution_runs SET effective_source_json=?,effective_scope_json=?,effective_grants_json=?,group_binding_json=?,derived_json=?,revision=revision+1 WHERE run_id=? AND revision<9223372036854775807", encodeGroupValue(next.Sources), encodeGroupValue(next.Scopes), encodeGroupValue(next.GrantIDs), encodeGroupValue(next.Group), encodeGroupValue(lineage), consumer.TaskID)
	if e != nil {
		return e
	}
	n, e := result.RowsAffected()
	if e != nil {
		return e
	}
	if n != 1 {
		return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	for _, d := range lineage {
		if _, e := tx.ExecContext(ctx, "INSERT INTO collaboration_lineage VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING", consumer.TaskID, d.Kind, d.ID, d.Revision, d.Hash, d.Namespace, d.WorkThreadID); e != nil {
			return e
		}
	}
	return nil
}
func encodeGroupValue(v any) string { b, _ := json.Marshal(v); return string(b) }
