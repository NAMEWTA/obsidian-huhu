package contextaccess

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"unicode/utf16"
	"unicode/utf8"

	grantsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Repository interface {
	Check(context.Context, api.RequestIdentity, api.RunAccessInput, []string) error
}
type Service struct {
	repo Repository
	host api.HostReadAPI
}

func New(repo Repository, host api.HostReadAPI) *Service { return &Service{repo, host} }
func sourceIdentity(resource, workspace, client, view, connection, lease, epoch, revision, hash string) bool {
	if !grantsapp.Opaque(resource) || !grantsapp.Opaque(workspace) || !grantsapp.Opaque(client) || !grantsapp.Opaque(view) || !grantsapp.Opaque(connection) || !grantsapp.Opaque(lease) || !grantsapp.Positive(epoch) || !grantsapp.Positive(revision) || !strings.HasPrefix(hash, "sha256:") || len(hash) != 71 {
		return false
	}
	raw, e := hex.DecodeString(hash[7:])
	return e == nil && len(raw) == 32 && strings.ToLower(hash) == hash
}
func ValidSource(s api.SourceSnapshot) bool {
	if (s.Kind != "note" && s.Kind != "selection") || !sourceIdentity(s.ResourceID, s.WorkspaceID, s.OriginClientID, s.OriginViewID, s.HostConnectionID, s.HostLeaseID, s.HostLeaseEpoch, s.Revision, s.Hash) || s.ScopeResourceIDs == nil || len(s.ScopeResourceIDs) > 32 {
		return false
	}
	seen := map[string]bool{}
	for _, id := range s.ScopeResourceIDs {
		if !grantsapp.Opaque(id) || seen[id] {
			return false
		}
		seen[id] = true
	}
	return s.Kind == "note" && s.Range == nil || s.Kind == "selection" && s.Range != nil && s.Range.Start >= 0 && s.Range.End > s.Range.Start
}
func ValidScope(s api.SourceScope) bool {
	return (s.Kind == "folder" || s.Kind == "vault") && sourceIdentity(s.ResourceID, s.WorkspaceID, s.OriginClientID, s.OriginViewID, s.HostConnectionID, s.HostLeaseID, s.HostLeaseEpoch, s.Revision, s.Hash)
}
func EqualSource(a, b api.SourceSnapshot) bool { return reflect.DeepEqual(a, b) }
func ScopeIncludes(scope api.SourceScope, source api.SourceSnapshot) bool {
	if scope.WorkspaceID != source.WorkspaceID || scope.HostConnectionID != source.HostConnectionID || scope.HostLeaseID != source.HostLeaseID || scope.HostLeaseEpoch != source.HostLeaseEpoch {
		return false
	}
	for _, id := range source.ScopeResourceIDs {
		if id == scope.ResourceID {
			return true
		}
	}
	return false
}
func InParent(in api.RunAccessInput) bool {
	if in.ParentScope == nil {
		return true
	}
	for _, source := range in.Sources {
		found := false
		for _, p := range in.ParentScope.Sources {
			if EqualSource(source, p) {
				found = true
			}
		}
		for _, p := range in.ParentScope.Scopes {
			if ScopeIncludes(p, source) {
				found = true
			}
		}
		if !found {
			return false
		}
	}
	for _, scope := range in.Scopes {
		found := false
		for _, p := range in.ParentScope.Scopes {
			if reflect.DeepEqual(scope, p) {
				found = true
			}
		}
		if !found {
			return false
		}
	}
	return true
}
func Validate(in api.RunAccessInput) error {
	if in.ProfileID == "" || !grantsapp.Opaque(in.SessionID) || !grantsapp.Opaque(in.TaskID) || len(in.Sources)+len(in.Scopes) > 32 || len(in.GrantIDs) > 64 {
		return api.Invalid("INVALID_ACCESS_INPUT")
	}
	if len(in.Sources)+len(in.Scopes) > 0 && !grantsapp.ValidRecipient(in.Recipient) {
		return api.Denied("RECIPIENT_NOT_CONFIGURED")
	}
	seen := map[string]bool{}
	for _, source := range in.Sources {
		if !ValidSource(source) || seen[source.ResourceID] {
			return api.Invalid("INVALID_SOURCE_SNAPSHOT")
		}
		seen[source.ResourceID] = true
	}
	for _, scope := range in.Scopes {
		if !ValidScope(scope) || seen[scope.ResourceID] {
			return api.Invalid("INVALID_SOURCE_SCOPE")
		}
		seen[scope.ResourceID] = true
	}
	for _, id := range in.GrantIDs {
		if !grantsapp.Opaque(id) {
			return api.Invalid("INVALID_GRANT")
		}
	}
	if parent := in.ParentScope; parent != nil {
		if len(parent.Sources)+len(parent.Scopes) > 32 || len(parent.GrantIDs) > 64 {
			return api.Invalid("INVALID_PARENT_SCOPE")
		}
		for _, source := range parent.Sources {
			if !ValidSource(source) {
				return api.Invalid("INVALID_PARENT_SCOPE")
			}
		}
		for _, scope := range parent.Scopes {
			if !ValidScope(scope) {
				return api.Invalid("INVALID_PARENT_SCOPE")
			}
		}
	}
	if !InParent(in) {
		return api.Denied("PARENT_SCOPE_EXCEEDED")
	}
	return nil
}
func (s *Service) AuthorizeAdmission(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput) error {
	if e := s.repo.Check(ctx, id, in, []string{"read", "send"}); e != nil {
		return e
	}
	return s.lease(ctx, in)
}
func (s *Service) AuthorizeRead(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput) error {
	return s.repo.Check(ctx, id, in, []string{"read"})
}
func (s *Service) lease(ctx context.Context, in api.RunAccessInput) error {
	if len(in.Sources)+len(in.Scopes) == 0 {
		return nil
	}
	if s.host == nil {
		return &api.Fault{Kind: "HOST_UNAVAILABLE", Reason: "HOST_OFFLINE"}
	}
	l, e := s.host.CurrentLease(ctx)
	if e != nil {
		return e
	}
	for _, source := range in.Sources {
		if source.WorkspaceID != l.WorkspaceID || source.HostConnectionID != l.HostConnectionID || source.HostLeaseID != l.LeaseID || source.HostLeaseEpoch != l.LeaseEpoch {
			return api.Denied("HOST_LEASE_MISMATCH")
		}
	}
	for _, scope := range in.Scopes {
		if scope.WorkspaceID != l.WorkspaceID || scope.HostConnectionID != l.HostConnectionID || scope.HostLeaseID != l.LeaseID || scope.HostLeaseEpoch != l.LeaseEpoch {
			return api.Denied("HOST_LEASE_MISMATCH")
		}
	}
	return nil
}
func (s *Service) PrepareContext(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput) (api.PreparedContext, error) {
	out := api.PreparedContext{Sources: []api.PreparedSource{}}
	if e := s.AuthorizeAdmission(ctx, id, in); e != nil {
		return api.PreparedContext{}, e
	}
	if e := s.lease(ctx, in); e != nil {
		return api.PreparedContext{}, e
	}
	total := 0
	for _, source := range in.Sources {
		if e := s.AuthorizeAdmission(ctx, id, in); e != nil {
			return api.PreparedContext{}, e
		}
		if e := s.lease(ctx, in); e != nil {
			return api.PreparedContext{}, e
		}
		result, e := s.host.Read(ctx, api.HostReadRequest{LeaseID: source.HostLeaseID, HostConnectionID: source.HostConnectionID, LeaseEpoch: source.HostLeaseEpoch, WorkspaceID: source.WorkspaceID, Source: source, MaxBytes: 65536})
		if e != nil {
			return api.PreparedContext{}, e
		}
		if e = s.AuthorizeAdmission(ctx, id, in); e != nil {
			return api.PreparedContext{}, e
		}
		if e = s.lease(ctx, in); e != nil {
			return api.PreparedContext{}, e
		}
		total += len(result.Text)
		if total > 256*1024 {
			return api.PreparedContext{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "CONTEXT_TOO_LARGE"}
		}
		out.Sources = append(out.Sources, api.PreparedSource{Source: result.Source, Text: result.Text})
	}
	if e := s.AuthorizeAdmission(ctx, id, in); e != nil {
		return api.PreparedContext{}, e
	}
	return out, nil
}
func (s *Service) FilterHistory(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput, records []api.ContextRecord) ([]api.ContextRecord, error) {
	base := in
	base.Sources = nil
	base.Scopes = nil
	if e := s.AuthorizeRead(ctx, id, base); e != nil {
		return nil, e
	}
	if len(records) > 100 {
		return nil, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "HISTORY_PAGE_TOO_LARGE"}
	}
	out := []api.ContextRecord{}
	for _, record := range records {
		check := HistoryReadInput(in, record.Sources)
		if e := s.AuthorizeRead(ctx, id, check); e != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			var failure *api.Fault
			if errors.As(e, &failure) && (failure.Kind == "CAPABILITY_DENIED" || failure.Kind == "SOURCE_CHANGED" || failure.Kind == "NOT_FOUND" && failure.Reason == "GRANT_NOT_FOUND") {
				continue
			}
			return nil, e
		}
		out = append(out, record)
	}
	return out, nil
}

// HistoryReadInput narrows a stored Run context to a particular message's
// persisted provenance. Other inherited scopes cannot revoke unrelated text.
func HistoryReadInput(in api.RunAccessInput, sources []api.SourceSnapshot) api.RunAccessInput {
	allScopes := in.Scopes
	in.Sources = sources
	in.Scopes = nil
	for _, scope := range allScopes {
		for _, source := range sources {
			if ScopeIncludes(scope, source) {
				in.Scopes = append(in.Scopes, scope)
				break
			}
		}
	}
	return in
}

// FilterModelHistory uses the current Run recipient and the stored provenance
// grants for each record. A user's history visibility is not model send consent.
func (s *Service) FilterModelHistory(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput, records []api.ContextRecord) ([]api.ContextRecord, error) {
	base := in
	base.Sources = nil
	base.Scopes = nil
	if e := s.AuthorizeRead(ctx, id, base); e != nil {
		return nil, e
	}
	if len(records) > 100 {
		return nil, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "HISTORY_PAGE_TOO_LARGE"}
	}
	out := []api.ContextRecord{}
	for _, record := range records {
		check := in
		check.Sources = record.Sources
		check.GrantIDs = record.GrantIDs
		check.Scopes = record.Scopes
		if e := s.repo.Check(ctx, id, check, []string{"read", "send"}); e != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			var failure *api.Fault
			if errors.As(e, &failure) && (failure.Kind == "CAPABILITY_DENIED" || failure.Kind == "SOURCE_CHANGED" || failure.Kind == "NOT_FOUND" && failure.Reason == "GRANT_NOT_FOUND") {
				continue
			}
			return nil, e
		}
		if e := s.lease(ctx, check); e != nil {
			var failure *api.Fault
			if errors.As(e, &failure) && (failure.Kind == "CAPABILITY_DENIED" || failure.Kind == "HOST_UNAVAILABLE") {
				continue
			}
			return nil, e
		}
		out = append(out, record)
	}
	return out, nil
}
func (s *Service) Search(ctx context.Context, id api.RequestIdentity, in api.RunAccessInput, query string, limit int, cursor ...string) (api.HostSearchResult, error) {
	if strings.TrimSpace(query) == "" || utf8.RuneCountInString(query) > 256 || limit < 1 || limit > 20 || len(cursor) > 1 || len(cursor) == 1 && (cursor[0] == "" || len(cursor[0]) > 512) {
		return api.HostSearchResult{}, api.Invalid("INVALID_SOURCE_SEARCH")
	}
	ops := []string{"read", "search", "send"}
	if e := s.repo.Check(ctx, id, in, ops); e != nil {
		return api.HostSearchResult{}, e
	}
	if len(in.Sources)+len(in.Scopes) == 0 {
		return api.HostSearchResult{}, api.Denied("SOURCE_NOT_GRANTED")
	}
	if e := s.lease(ctx, in); e != nil {
		return api.HostSearchResult{}, e
	}
	l, e := s.host.CurrentLease(ctx)
	if e != nil {
		return api.HostSearchResult{}, e
	}
	next := ""
	if len(cursor) == 1 {
		next = cursor[0]
	}
	result, e := s.host.Search(ctx, api.HostSearchRequest{LeaseID: l.LeaseID, HostConnectionID: l.HostConnectionID, LeaseEpoch: l.LeaseEpoch, WorkspaceID: l.WorkspaceID, Sources: append([]api.SourceSnapshot{}, in.Sources...), Scopes: append([]api.SourceScope{}, in.Scopes...), Query: query, Limit: limit, MaxBytes: 65536, Cursor: next})
	if e != nil {
		return api.HostSearchResult{}, e
	}
	if e = s.repo.Check(ctx, id, in, ops); e != nil {
		return api.HostSearchResult{}, e
	}
	if e = s.lease(ctx, in); e != nil {
		return api.HostSearchResult{}, e
	}
	verified := make(map[string]api.HostReadResult)
	for _, match := range result.Matches {
		check := in
		check.Sources = []api.SourceSnapshot{match.Source}
		if e = s.repo.Check(ctx, id, check, ops); e != nil {
			return api.HostSearchResult{}, e
		}
		if e = s.lease(ctx, check); e != nil {
			return api.HostSearchResult{}, e
		}
		identity, _ := json.Marshal(match.Source)
		content, known := verified[string(identity)]
		if !known {
			var readErr error
			content, readErr = s.host.Read(ctx, api.HostReadRequest{LeaseID: match.Source.HostLeaseID, HostConnectionID: match.Source.HostConnectionID, LeaseEpoch: match.Source.HostLeaseEpoch, WorkspaceID: match.Source.WorkspaceID, Source: match.Source, MaxBytes: 65536})
			if readErr != nil {
				return api.HostSearchResult{}, readErr
			}
			verified[string(identity)] = content
		}
		if e = s.repo.Check(ctx, id, check, ops); e != nil {
			return api.HostSearchResult{}, e
		}
		if e = s.lease(ctx, check); e != nil {
			return api.HostSearchResult{}, e
		}
		units := utf16.Encode([]rune(content.Text))
		start, end := match.Range.Start, match.Range.End
		if match.Source.Range != nil {
			start -= match.Source.Range.Start
			end -= match.Source.Range.Start
		}
		if start < 0 || end <= start || end > len(units) ||
			start > 0 && units[start] >= 0xDC00 && units[start] <= 0xDFFF && units[start-1] >= 0xD800 && units[start-1] <= 0xDBFF ||
			end < len(units) && units[end] >= 0xDC00 && units[end] <= 0xDFFF && units[end-1] >= 0xD800 && units[end-1] <= 0xDBFF ||
			string(utf16.Decode(units[start:end])) != match.Text {
			return api.HostSearchResult{}, &api.Fault{Kind: "SOURCE_CHANGED", Reason: "SOURCE_EXCERPT_CHANGED"}
		}
	}
	if e = s.repo.Check(ctx, id, in, ops); e != nil {
		return api.HostSearchResult{}, e
	}
	if e = s.lease(ctx, in); e != nil {
		return api.HostSearchResult{}, e
	}
	return result, nil
}
