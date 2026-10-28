package hap_test

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type memoryResultProfile struct{}

func (memoryResultProfile) ReadMetadata(context.Context) (api.ProfileMetadata, error) {
	return api.ProfileMetadata{ProfileID: "profile", CommandEpoch: "1", Revision: "1", CreatedAt: "2026-01-01T00:00:00Z"}, nil
}

type memoryResultAPI struct {
	api.MemoryAPI
	object   api.MemoryObject
	settings api.MemorySettings
	calls    int
}

func (m *memoryResultAPI) Get(context.Context, api.RequestIdentity, api.MemoryGet) (api.MemoryObject, error) {
	m.calls++
	return m.object, nil
}
func (m *memoryResultAPI) SetAutoMaintenance(context.Context, api.RequestIdentity, api.MemorySetAuto) (api.MemorySettings, error) {
	m.calls++
	return m.settings, nil
}

func memoryResultSource() api.SourceSnapshot {
	return api.SourceSnapshot{
		Kind: "note", ResourceID: strings.Repeat("中", 170) + "ab", WorkspaceID: "workspace",
		OriginClientID: "client", OriginViewID: "view", HostConnectionID: "connection",
		HostLeaseID: "lease", HostLeaseEpoch: "9223372036854775807", Revision: "9223372036854775807",
		Hash: "sha256:" + strings.Repeat("0", 64), ScopeResourceIDs: []string{"scope"}, Title: "普通 Unicode 🌿",
	}
}
func memoryResultObject() api.MemoryObject {
	text := "valid memory"
	return api.MemoryObject{Kind: "item", Item: &api.MemoryItem{
		ID: "item", Revision: "1", RevisionID: "revision", Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"},
		Scope: api.MemoryScope{Kind: "profile"}, State: "active", Body: &api.MemoryBody{
			Text: text, Hash: fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(text))), Provenance: "user", CreatorKind: "user",
			SourceRefs: []api.SourceSnapshot{memoryResultSource()}, SourceScopes: []api.SourceScope{}, Derived: []api.DerivedInput{},
		},
	}}
}
func memoryResultRouter(t *testing.T, m *memoryResultAPI) *hap.Router {
	t.Helper()
	host := api.NewHostService()
	r := hap.New(&api.Facade{Memory: m, Service: api.NewService(memoryResultProfile{}, host), Host: host}, api.NewConnectionIdentity("memory-result-test", "user", false))
	id := "hello"
	hello := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"memory-result-test","version":"1"}}`)}, nil)
	if hello.Error != nil || !r.Ready() {
		t.Fatalf("hello: %+v", hello.Error)
	}
	return r
}
func dispatchMemoryGet(t *testing.T, object api.MemoryObject) bool {
	t.Helper()
	m := &memoryResultAPI{object: object}
	r := memoryResultRouter(t, m)
	id := "get"
	result := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.get", Params: json.RawMessage(`{"profileId":"profile","namespace":{"kind":"agent","id":"agent"},"kind":"item","id":"item"}`)}, nil)
	if m.calls != 1 {
		t.Fatalf("actual MemoryAPI calls = %d", m.calls)
	}
	if result.Error != nil && result.Error.Data.Reason != "INVALID_APPLICATION_RESULT" {
		t.Fatalf("unexpected Router error: %+v", result.Error)
	}
	return result.Error == nil
}

func TestMemoryResultRouterOptionalFieldsAndContext(t *testing.T) {
	badUTF8 := string([]byte{0xff})
	scope := api.MemoryScope{Kind: "session", ID: "session"}
	baseCandidate := func() api.MemoryObject {
		return api.MemoryObject{Kind: "candidate", Candidate: &api.MemoryCandidate{
			ID: "candidate", Revision: "1", Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"},
			Scope: scope, JobID: "job", State: "blocked", Operation: "create", Reason: "可重试 🌿", Body: nil,
		}}
	}
	baseJob := func() api.MemoryObject {
		return api.MemoryObject{Kind: "job", Job: &api.MemoryJob{
			ID: "job", Revision: "1", Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"},
			SourceRunID: "run", Admission: "bound", Commit: "committed", Reason: "完成 🌿",
			Run: &api.MemoryJobRun{ID: "run", Status: "succeeded", Reason: "完成 🌿", Usage: &api.RunUsage{Knowledge: "known", InputTokens: "0", OutputTokens: "0"}},
		}}
	}
	baseContext := func() api.MemoryObject {
		return api.MemoryObject{Kind: "context", Context: &api.ExecutionContextView{
			RunID: "run", RunRevision: "1", ManifestRevision: "1", State: "sealed", Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"}, Scope: scope,
			Reason: "普通 🌿", Entries: []api.ExecutionContextEntryView{{
				ID: "entry", Kind: "attachment", Representation: "metadata", State: "readable", Revision: "1",
				CreatorKind: "user", PreparationKind: "explicit", Scope: scope, Reason: "普通 🌿", SourceRefs: []api.SourceSnapshot{memoryResultSource()},
			}},
		}}
	}
	cases := []struct {
		name  string
		make  func() api.MemoryObject
		edit  func(*api.MemoryObject)
		valid bool
	}{
		{"candidate_reason_unicode", baseCandidate, func(*api.MemoryObject) {}, true},
		{"candidate_reason_utf8", baseCandidate, func(o *api.MemoryObject) { o.Candidate.Reason = badUTF8 }, false},
		{"candidate_optional_target_id_utf8", baseCandidate, func(o *api.MemoryObject) { o.Candidate.TargetItemID = badUTF8 }, false},
		{"job_zero_usage", baseJob, func(*api.MemoryObject) {}, true},
		{"job_max_usage", baseJob, func(o *api.MemoryObject) { o.Job.Run.Usage.InputTokens = "9223372036854775807" }, true},
		{"job_optional_empty_usage", baseJob, func(o *api.MemoryObject) {
			o.Job.Run.Usage.InputTokens = ""
			o.Job.Run.Usage.OutputTokens = ""
			o.Job.Run.Usage.Knowledge = ""
		}, true},
		{"job_reason_utf8", baseJob, func(o *api.MemoryObject) { o.Job.Reason = badUTF8 }, false},
		{"run_reason_utf8", baseJob, func(o *api.MemoryObject) { o.Job.Run.Reason = badUTF8 }, false},
		{"run_status_utf8", baseJob, func(o *api.MemoryObject) { o.Job.Run.Status = badUTF8 }, false},
		{"run_usage_overflow", baseJob, func(o *api.MemoryObject) { o.Job.Run.Usage.InputTokens = "9223372036854775808" }, false},
		{"run_usage_utf8", baseJob, func(o *api.MemoryObject) { o.Job.Run.Usage.OutputTokens = badUTF8 }, false},
		{"context_unicode", baseContext, func(*api.MemoryObject) {}, true},
		{"context_view_reason_utf8", baseContext, func(o *api.MemoryObject) { o.Context.Reason = badUTF8 }, false},
		{"context_entry_reason_utf8", baseContext, func(o *api.MemoryObject) { o.Context.Entries[0].Reason = badUTF8 }, false},
		{"context_source_ref_overflow", baseContext, func(o *api.MemoryObject) { o.Context.Entries[0].SourceRefs[0].Revision = "9223372036854775808" }, false},
		{"context_source_ref_utf8", baseContext, func(o *api.MemoryObject) { o.Context.Entries[0].SourceRefs[0].Title = badUTF8 }, false},
		{"context_optional_metadata_utf8", baseContext, func(o *api.MemoryObject) { o.Context.Entries[0].Provenance = badUTF8 }, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			o := tc.make()
			tc.edit(&o)
			if got := dispatchMemoryGet(t, o); got != tc.valid {
				t.Errorf("Router accepted=%t, want %t", got, tc.valid)
			}
		})
	}
	m := &memoryResultAPI{settings: api.MemorySettings{Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"}, Revision: "1", Enabled: true, Eligible: true, Reason: badUTF8}}
	r := memoryResultRouter(t, m)
	id := "settings"
	result := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.setAutoMaintenance", Params: json.RawMessage(`{"profileId":"profile","commandId":"command","idempotencyKey":"key","commandEpoch":"1","expectedRevision":"1","namespace":{"kind":"agent","id":"agent"},"enabled":true}`)}, nil)
	if m.calls != 1 || result.Error == nil || result.Error.Data.Reason != "INVALID_APPLICATION_RESULT" {
		t.Errorf("eligible settings reason reached=%d accepted=%t", m.calls, result.Error == nil)
	}
	m.settings.Reason = "eligible 🌿"
	r = memoryResultRouter(t, m)
	result = r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.setAutoMaintenance", Params: json.RawMessage(`{"profileId":"profile","commandId":"command","idempotencyKey":"key","commandEpoch":"1","expectedRevision":"1","namespace":{"kind":"agent","id":"agent"},"enabled":true}`)}, nil)
	if m.calls != 2 || result.Error != nil {
		t.Errorf("valid eligible settings reached=%d error=%v", m.calls, result.Error)
	}
}

func TestMemoryResultRouterRejectsInvalidTypedSourceBeforeEncoding(t *testing.T) {
	badUTF8 := string([]byte{0xff})
	cases := []struct {
		name  string
		edit  func(*api.MemoryObject)
		valid bool
	}{
		{"512_byte_multibyte_id_and_max_decimal", func(*api.MemoryObject) {}, true},
		{"513_byte_resource_id", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].ResourceID += "c" }, false},
		{"invalid_resource_id_utf8", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].ResourceID = badUTF8 }, false},
		{"invalid_optional_title_utf8", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].Title = badUTF8 }, false},
		{"revision_overflow", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].Revision = "9223372036854775808" }, false},
		{"lease_epoch_overflow", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].HostLeaseEpoch = "9223372036854775808" }, false},
		{"scope_resource_id_513_bytes", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].ScopeResourceIDs[0] = strings.Repeat("x", 513) }, false},
		{"scope_resource_id_utf8", func(o *api.MemoryObject) { o.Item.Body.SourceRefs[0].ScopeResourceIDs[0] = badUTF8 }, false},
		{"source_scope_revision_overflow", func(o *api.MemoryObject) {
			s := o.Item.Body.SourceRefs[0]
			o.Item.Body.SourceScopes = []api.SourceScope{{Kind: "folder", ResourceID: "folder", WorkspaceID: s.WorkspaceID, OriginClientID: s.OriginClientID, OriginViewID: s.OriginViewID, HostConnectionID: s.HostConnectionID, HostLeaseID: s.HostLeaseID, HostLeaseEpoch: s.HostLeaseEpoch, Revision: "9223372036854775808", Hash: s.Hash}}
		}, false},
		{"source_scope_max_decimal", func(o *api.MemoryObject) {
			s := o.Item.Body.SourceRefs[0]
			o.Item.Body.SourceScopes = []api.SourceScope{{Kind: "folder", ResourceID: "folder", WorkspaceID: s.WorkspaceID, OriginClientID: s.OriginClientID, OriginViewID: s.OriginViewID, HostConnectionID: s.HostConnectionID, HostLeaseID: s.HostLeaseID, HostLeaseEpoch: s.HostLeaseEpoch, Revision: s.Revision, Hash: s.Hash, Title: "普通 🌿"}}
		}, true},
		{"source_scope_title_utf8", func(o *api.MemoryObject) {
			s := o.Item.Body.SourceRefs[0]
			o.Item.Body.SourceScopes = []api.SourceScope{{Kind: "vault", ResourceID: "vault", WorkspaceID: s.WorkspaceID, OriginClientID: s.OriginClientID, OriginViewID: s.OriginViewID, HostConnectionID: s.HostConnectionID, HostLeaseID: s.HostLeaseID, HostLeaseEpoch: s.HostLeaseEpoch, Revision: s.Revision, Hash: s.Hash, Title: badUTF8}}
		}, false},
		{"optional_job_id_512", func(o *api.MemoryObject) { o.Item.Body.JobID = strings.Repeat("x", 512) }, true},
		{"optional_job_id_513", func(o *api.MemoryObject) { o.Item.Body.JobID = strings.Repeat("x", 513) }, false},
		{"optional_job_id_utf8", func(o *api.MemoryObject) { o.Item.Body.JobID = badUTF8 }, false},
		{"optional_creator_agent_id_512", func(o *api.MemoryObject) { o.Item.Body.CreatorAgentID = strings.Repeat("x", 512) }, true},
		{"optional_creator_agent_id_513", func(o *api.MemoryObject) { o.Item.Body.CreatorAgentID = strings.Repeat("x", 513) }, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			o := memoryResultObject()
			tc.edit(&o)
			if got := dispatchMemoryGet(t, o); got != tc.valid {
				t.Errorf("Router accepted=%t, want %t", got, tc.valid)
			}
		})
	}
}

func TestMemoryContextResultUsesWholePageBudget(t *testing.T) {
	scope := api.MemoryScope{Kind: "session", ID: "session"}
	s := memoryResultSource()
	s.Title = strings.Repeat("x", 248000)
	o := api.MemoryObject{Kind: "context", Context: &api.ExecutionContextView{
		RunID: "run", RunRevision: "1", ManifestRevision: "1", State: "sealed",
		Namespace: api.MemoryNamespace{Kind: "agent", ID: "agent"}, Scope: scope,
		Entries: []api.ExecutionContextEntryView{{
			ID: "entry", Kind: "attachment", Representation: "metadata", State: "readable", Revision: "1",
			CreatorKind: "user", PreparationKind: "explicit", Scope: scope, SourceRefs: []api.SourceSnapshot{s},
		}},
	}}
	encoded, err := json.Marshal(o)
	if err != nil || len(encoded) <= api.MemoryObjectBytes || len(encoded) >= api.MemoryPageBytes {
		t.Fatalf("context page size = %d, encode error = %v", len(encoded), err)
	}
	t.Logf("valid context page bytes=%d", len(encoded))
	if !dispatchMemoryGet(t, o) {
		t.Fatalf("legal %d-byte context page rejected", len(encoded))
	}
	o.Context.Entries[0].SourceRefs[0].Title = strings.Repeat("x", 263000)
	if dispatchMemoryGet(t, o) {
		t.Fatal("context page above whole-page budget accepted")
	}
}
