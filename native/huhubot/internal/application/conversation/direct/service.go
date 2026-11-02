package direct

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/conversation/direct"
	"reflect"
	"strings"
	"unicode/utf8"
)

type Service struct {
	repo          Repository
	access        api.ContextAccess
	wake          func()
	groups        api.GroupsAPI
	groupHistory  GroupHistoryPort
	memoryHistory HistoryMemoryPort
}

func (s *Service) SetMemoryHistory(p HistoryMemoryPort) { s.memoryHistory = p }

func New(repo Repository, access api.ContextAccess, wake func()) *Service {
	return &Service{repo: repo, access: access, wake: wake}
}
func (s *Service) SetGroups(groups api.GroupsAPI, history GroupHistoryPort) {
	s.groups = groups
	s.groupHistory = history
}
func (s *Service) CreateSession(ctx context.Context, id api.RequestIdentity, c api.SessionCreate) (api.Session, error) {
	if e := commands.Validate(id, c.CommandMeta, false); e != nil {
		return api.Session{}, e
	}
	if c.Kind == "group" {
		if s.groups == nil {
			return api.Session{}, api.Denied("GROUPS_NOT_ASSEMBLED")
		}
		return s.groups.CreateSession(ctx, id, c)
	}
	if reason := domain.Validate(c.Kind, c.Title, c.MemberIDs); reason != "" {
		return api.Session{}, api.Invalid(reason)
	}
	if c.CoordinatorID != "" {
		return api.Session{}, api.Invalid("DIRECT_COORDINATOR_NOT_ALLOWED")
	}
	return s.repo.CreateSession(ctx, id, c, commands.Hash(c))
}
func (s *Service) ListSessions(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.SessionPage, error) {
	if !id.Valid() {
		return api.SessionPage{}, api.Denied("IDENTITY_REQUIRED")
	}
	return s.repo.ListSessions(ctx, id, q)
}
func (s *Service) GetSession(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Session, error) {
	if !id.Valid() {
		return api.Session{}, api.Denied("IDENTITY_REQUIRED")
	}
	return s.repo.GetSession(ctx, id, q)
}
func (s *Service) History(ctx context.Context, id api.RequestIdentity, q api.HistoryQuery) (api.MessagePage, error) {
	if !id.Valid() {
		return api.MessagePage{}, api.Denied("IDENTITY_REQUIRED")
	}
	p, e := s.repo.History(ctx, id, q)
	if e != nil {
		return p.Page, e
	}
	if s.memoryHistory != nil {
		p.Page.Items, _, e = s.memoryHistory.ReadHistoryMemory(ctx, id, q.ProfileID, "", p.Page.Items)
		if e != nil {
			return api.MessagePage{}, e
		}
	}
	visible := make([]api.VisibleMessage, 0, len(p.Page.Items))
	for _, m := range p.Page.Items {
		if len(m.SourceRefs) == 0 {
			visible = append(visible, m)
			continue
		}
		if s.access == nil {
			continue
		}
		input := p.Access[m.ID]
		input.PublishedMessageID = m.ID
		records, e := s.access.FilterHistory(ctx, id, input, []api.ContextRecord{{ID: m.ID, Text: m.Text, Sources: m.SourceRefs}})
		if e != nil {
			return api.MessagePage{}, e
		}
		if len(records) > 0 {
			m.Text = records[0].Text
			visible = append(visible, m)
		}
	}
	if s.groupHistory != nil {
		visible, e = s.groupHistory.FilterAttachments(ctx, id, q.ProfileID, visible)
		if e != nil {
			return api.MessagePage{}, e
		}
	} else {
		for i := range visible {
			visible[i].Attachments = nil
		}
	}
	p.Page.DeliverySubjects = nil
	for _, message := range visible {
		p.Page.DeliverySubjects = append(p.Page.DeliverySubjects, api.DeliverySubject{Kind: "message", ID: message.ID, Attachments: message.Attachments})
	}
	p.Page.Items = visible
	return p.Page, nil
}
func (s *Service) Archive(ctx context.Context, id api.RequestIdentity, c api.SessionArchive) (api.Session, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.Session{}, e
	}
	if c.ID == "" {
		return api.Session{}, api.Invalid("SESSION_ID_REQUIRED")
	}
	return s.repo.Archive(ctx, id, c, commands.Hash(c))
}
func (s *Service) StartRun(ctx context.Context, id api.RequestIdentity, c api.RunStart) (api.RunReceipt, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.RunReceipt{}, e
	}
	encoded, e := json.Marshal(c)
	if e != nil || len(encoded) > 262144 || len(c.Intent) > 131072 {
		return api.RunReceipt{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "INTENT_TOO_LARGE"}
	}
	if c.SessionID == "" || strings.TrimSpace(c.Intent) == "" || !utf8.ValidString(c.Intent) || len(c.SourceRefs)+len(c.SourceScopes) > 32 || len(c.GrantIDs) > 32 {
		return api.RunReceipt{}, api.Invalid("INVALID_RUN_INTENT")
	}
	if c.SourceRefs == nil {
		c.SourceRefs = []api.SourceSnapshot{}
	}
	session, e := s.repo.GetSession(ctx, id, api.IDQuery{ProfileID: c.ProfileID, ID: c.SessionID})
	if e != nil {
		return api.RunReceipt{}, e
	}
	if session.Kind == "group" {
		if s.groups == nil {
			return api.RunReceipt{}, api.Denied("GROUPS_NOT_ASSEMBLED")
		}
		r, e := s.groups.StartRun(ctx, id, c)
		if e == nil && s.wake != nil {
			s.wake()
		}
		return r, e
	}
	r, e := s.repo.StartRun(ctx, id, c, commands.Hash(c))
	if e == nil && s.wake != nil {
		s.wake()
	}
	return r, e
}
func (s *Service) GetRun(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Run, error) {
	if !id.Valid() {
		return api.Run{}, api.Denied("IDENTITY_REQUIRED")
	}
	r, input, e := s.repo.GetRun(ctx, id, q)
	if e != nil {
		return r, e
	}
	if input.Group != nil || len(input.Sources) > 0 || len(input.Scopes) > 0 {
		if s.access == nil {
			return api.Run{}, api.Denied("ACCESS_NOT_ASSEMBLED")
		}
		if e = s.access.AuthorizeRead(ctx, id, input); e != nil {
			return api.Run{}, e
		}
	}
	return r, nil
}

var _ api.ConversationAPI = (*Service)(nil)

func (s *Service) ModelHistory(ctx context.Context, id api.RequestIdentity, q api.HistoryQuery, current api.RunAccessInput) (api.ModelHistory, error) {
	out := api.ModelHistory{Messages: []api.VisibleMessage{}}
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	var page HistoryPage
	var e error
	if current.Group != nil {
		if s.groupHistory == nil {
			return out, api.Denied("GROUPS_NOT_ASSEMBLED")
		}
		page, e = s.groupHistory.ModelHistoryPage(ctx, id, q, current)
	} else {
		page, e = s.repo.History(ctx, id, q)
	}
	if e != nil {
		return out, e
	}
	closures := map[string][]api.DerivedInput{}
	if s.memoryHistory != nil {
		page.Page.Items, closures, e = s.memoryHistory.ReadHistoryMemory(ctx, id, q.ProfileID, current.TaskID, page.Page.Items)
		if e != nil {
			return out, e
		}
	}
	sourceSeen, scopeSeen, grantSeen := map[string]bool{}, map[string]bool{}, map[string]bool{}
	sourceKey := func(v api.SourceSnapshot) string { return v.ResourceID + "\x00" + v.Hash + "\x00" + v.HostLeaseID }
	scopeKey := func(v api.SourceScope) string { return v.ResourceID + "\x00" + v.Hash + "\x00" + v.HostLeaseID }
	for _, v := range current.Sources {
		sourceSeen[sourceKey(v)] = true
	}
	for _, v := range current.Scopes {
		scopeSeen[scopeKey(v)] = true
	}
	for _, v := range current.GrantIDs {
		grantSeen[v] = true
	}
	selectedRefs := map[string][]api.DerivedInput{}
	// Qualification is read-only. Commit provenance only for whole messages
	// that survive both source and Memory ancestry budgets.
	for i := len(page.Page.Items) - 1; i >= 0; i-- {
		m := page.Page.Items[i]
		m.Attachments = nil
		r := api.ContextRecord{ID: m.ID, Text: m.Text}
		if len(m.SourceRefs) > 0 {
			if s.access == nil {
				continue
			}
			input := page.Access[m.ID]
			allowed, err := s.access.FilterModelHistory(ctx, id, current, []api.ContextRecord{{ID: m.ID, Text: m.Text, Sources: m.SourceRefs, Scopes: input.Scopes, GrantIDs: input.GrantIDs}})
			if err != nil {
				return out, err
			}
			if len(allowed) == 0 {
				continue
			}
			r = allowed[0]
		}
		newSources, newScopes, newGrants := map[string]bool{}, map[string]bool{}, map[string]bool{}
		for _, v := range r.Sources {
			key := sourceKey(v)
			if !sourceSeen[key] {
				newSources[key] = true
			}
		}
		for _, v := range r.Scopes {
			key := scopeKey(v)
			if !scopeSeen[key] {
				newScopes[key] = true
			}
		}
		for _, v := range r.GrantIDs {
			if !grantSeen[v] {
				newGrants[v] = true
			}
		}
		if len(sourceSeen)+len(scopeSeen)+len(newSources)+len(newScopes) > 32 || len(grantSeen)+len(newGrants) > 32 {
			continue
		}
		refs := append([]api.DerivedInput{}, closures[m.ID]...)
		h := sha256.Sum256([]byte(r.Text))
		refs = append(refs, api.DerivedInput{Kind: "message", ID: m.ID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(h[:]), Namespace: q.SessionID, WorkThreadID: q.SessionID})
		next, err := mergeHistoryDerived(out.Derived, refs)
		if err != nil {
			return out, err
		}
		if len(next) > 128 {
			continue
		}
		out.Derived = next
		selectedRefs[m.ID] = refs
		m.Text = r.Text
		if len(m.SourceRefs) > 0 {
			m.SourceRefs = r.Sources
		}
		out.Messages = append(out.Messages, m)
		for _, v := range r.Sources {
			key := sourceKey(v)
			if !sourceSeen[key] {
				sourceSeen[key] = true
				out.Sources = append(out.Sources, v)
			}
		}
		for _, v := range r.Scopes {
			key := scopeKey(v)
			if !scopeSeen[key] {
				scopeSeen[key] = true
				out.Scopes = append(out.Scopes, v)
			}
		}
		for _, v := range r.GrantIDs {
			if !grantSeen[v] {
				grantSeen[v] = true
				out.GrantIDs = append(out.GrantIDs, v)
			}
		}
	}
	for i, j := 0, len(out.Messages)-1; i < j; i, j = i+1, j-1 {
		out.Messages[i], out.Messages[j] = out.Messages[j], out.Messages[i]
	}
	out.Derived = nil
	for _, m := range out.Messages {
		out.Derived, e = mergeHistoryDerived(out.Derived, selectedRefs[m.ID])
		if e != nil {
			return out, e
		}
	}
	return out, nil
}

func mergeHistoryDerived(a, b []api.DerivedInput) ([]api.DerivedInput, error) {
	out := make([]api.DerivedInput, 0, len(a)+len(b))
	seen := map[string]api.DerivedInput{}
	for _, group := range [][]api.DerivedInput{a, b} {
		for _, ref := range group {
			key := ref.Kind + "\x00" + ref.ID
			if old, ok := seen[key]; ok {
				if !reflect.DeepEqual(old, ref) {
					return nil, &api.Fault{Kind: "CONFLICT", Reason: "HISTORY_PROVENANCE_INVALID"}
				}
				continue
			}
			seen[key] = ref
			out = append(out, ref)
		}
	}
	return out, nil
}
