package assistant

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/assistant"
)

type Service struct {
	mu           sync.Mutex
	repo         Repository
	usage        api.AgentUsagePort
	credentials  api.CredentialProvider
	probe        api.ModelProbePort
	now          func() time.Time
	probeMu      sync.Mutex
	probeStopped bool
	probeCalls   map[*probeCall]struct{}
	probeWG      sync.WaitGroup
	probeDone    chan struct{}
}

type probeCall struct{ cancel context.CancelFunc }
type Options struct {
	Usage       api.AgentUsagePort
	Credentials api.CredentialProvider
	Probe       api.ModelProbePort
	Now         func() time.Time
}

func New(ctx context.Context, repo Repository, o Options) (*Service, error) {
	if e := repo.EnsureDefault(ctx); e != nil {
		return nil, e
	}
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.Usage == nil {
		o.Usage = UnassembledUsage{}
	}
	return &Service{repo: repo, usage: o.Usage, credentials: o.Credentials, probe: o.Probe, now: o.Now, probeCalls: make(map[*probeCall]struct{}), probeDone: make(chan struct{})}, nil
}

// StopProbes closes admission before canceling every already admitted call.
// Core must wait for ProbeDone before closing the resolver or Profile store.
func (s *Service) StopProbes() {
	s.probeMu.Lock()
	if s.probeStopped {
		s.probeMu.Unlock()
		return
	}
	s.probeStopped = true
	for call := range s.probeCalls {
		call.cancel()
	}
	s.probeMu.Unlock()
	go func() {
		s.probeWG.Wait()
		close(s.probeDone)
	}()
}

func (s *Service) ProbeDone() <-chan struct{} { return s.probeDone }

func (s *Service) beginProbe(parent context.Context) (context.Context, func(), error) {
	ctx, cancel := context.WithCancel(parent)
	call := &probeCall{cancel: cancel}
	s.probeMu.Lock()
	if s.probeStopped {
		s.probeMu.Unlock()
		cancel()
		return nil, nil, api.Denied("SERVICE_STOPPING")
	}
	s.probeCalls[call] = struct{}{}
	s.probeWG.Add(1)
	s.probeMu.Unlock()
	return ctx, func() {
		cancel()
		s.probeMu.Lock()
		delete(s.probeCalls, call)
		s.probeMu.Unlock()
		s.probeWG.Done()
	}, nil
}

// UnassembledUsage is explicit discovery of absent contexts, not an assertion
// that installed Run/session/memory contexts contain no references.
type UnassembledUsage struct{}

func (UnassembledUsage) SnapshotUsage(context.Context, string) (api.AgentUsage, error) {
	return api.AgentUsage{RevisionToken: "unassembled:v1", Unassembled: []string{"runs", "sessions", "groups", "memory"}}, nil
}
func identity(id api.RequestIdentity) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	return nil
}
func positive(s string) bool {
	n, e := strconv.ParseInt(s, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == s
}
func command(id api.RequestIdentity, m api.CommandMeta, cas bool) error {
	if e := identity(id); e != nil {
		return e
	}
	if m.CommandID == "" || len(m.CommandID) > 128 || m.IdempotencyKey == "" || len(m.IdempotencyKey) > 128 || m.ProfileID == "" || !positive(m.CommandEpoch) || (cas && !positive(m.ExpectedRevision)) {
		return api.Invalid("INVALID_COMMAND_META")
	}
	return nil
}
func hash(v any) string {
	b, _ := json.Marshal(v)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
func draft(d api.AgentDraft) error {
	encoded, e := json.Marshal(d)
	if e != nil || len(encoded) > 256*1024 {
		return &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "AGENT_CONFIG_TOO_LARGE"}
	}
	v := domain.Draft{Name: d.Name, Description: d.Description, Persona: d.Persona, AllowedTools: d.AllowedTools, AllowedCollaborationTargets: d.AllowedCollaborationTargets}
	if d.Model != nil {
		m := model(*d.Model)
		v.Model = &m
	}
	if reason := domain.ValidateDraft(v); reason != "" {
		return api.Invalid(reason)
	}
	return nil
}
func model(m api.ModelBindingDraft) domain.Model {
	return domain.Model{ModelID: m.ModelID, ProviderID: m.ProviderID, Endpoint: m.Endpoint, Protocol: m.Protocol, CredentialRef: m.CredentialRef, Capabilities: m.Capabilities}
}
func validateModel(m api.ModelBindingDraft) error {
	encoded, e := json.Marshal(m)
	if e != nil || len(encoded) > 64*1024 {
		return &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "MODEL_CONFIG_TOO_LARGE"}
	}
	if reason := domain.ValidateModel(model(m)); reason != "" {
		return api.Invalid(reason)
	}
	return nil
}
func (s *Service) decorate(ctx context.Context, profile string, a api.Agent) api.Agent {
	if a.Model != nil && a.Model.CredentialRef != "" && s.credentials != nil {
		st, _ := s.credentials.Status(ctx, profile, a.Model.CredentialRef)
		if (st.Mode == "protected" || st.Mode == "session-memory" || st.Mode == "none") && (st.State == "available" || st.State == "missing" || st.State == "failed" || st.State == "unknown") {
			a.Model.CredentialStatus = st
		} else {
			a.Model.CredentialStatus = api.CredentialStatus{Mode: a.Model.CredentialStatus.Mode, State: "unknown", Reason: "PROVIDER_FAILED"}
		}
	}
	return a
}
func (s *Service) Create(ctx context.Context, id api.RequestIdentity, c api.AgentCreate) (api.Agent, error) {
	if e := command(id, c.CommandMeta, false); e != nil {
		return api.Agent{}, e
	}
	if e := draft(c.Draft); e != nil {
		return api.Agent{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, e := s.repo.Mutate(ctx, Mutation{Kind: "agents.create", Identity: id, Meta: c.CommandMeta, Draft: c.Draft, InputHash: hash(c), Now: s.now()})
	if e == nil {
		r.Agent = s.decorate(ctx, c.ProfileID, r.Agent)
	}
	return r.Agent, e
}
func (s *Service) Get(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.Agent, error) {
	if e := identity(id); e != nil {
		return api.Agent{}, e
	}
	if q.ID == "" {
		return api.Agent{}, api.Invalid("AGENT_ID_REQUIRED")
	}
	a, e := s.repo.Get(ctx, q)
	if e == nil {
		a = s.decorate(ctx, q.ProfileID, a)
	}
	return a, e
}
func (s *Service) List(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.AgentPage, error) {
	if e := identity(id); e != nil {
		return api.AgentPage{}, e
	}
	p, e := s.repo.List(ctx, q)
	if e == nil {
		for i := range p.Items {
			p.Items[i] = s.decorate(ctx, q.ProfileID, p.Items[i])
		}
	}
	return p, e
}
func (s *Service) Update(ctx context.Context, id api.RequestIdentity, c api.AgentUpdate) (api.Agent, error) {
	if e := command(id, c.CommandMeta, true); e != nil {
		return api.Agent{}, e
	}
	if c.ID == "" {
		return api.Agent{}, api.Invalid("AGENT_ID_REQUIRED")
	}
	if e := draft(c.Draft); e != nil {
		return api.Agent{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, e := s.repo.Mutate(ctx, Mutation{Kind: "agents.update", Identity: id, Meta: c.CommandMeta, ID: c.ID, Draft: c.Draft, InputHash: hash(c), Now: s.now()})
	if e == nil {
		r.Agent = s.decorate(ctx, c.ProfileID, r.Agent)
	}
	return r.Agent, e
}
func (s *Service) Disable(ctx context.Context, id api.RequestIdentity, c api.AgentDisable) (api.Agent, error) {
	if e := command(id, c.CommandMeta, true); e != nil {
		return api.Agent{}, e
	}
	if c.ID == "" {
		return api.Agent{}, api.Invalid("AGENT_ID_REQUIRED")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, e := s.repo.Mutate(ctx, Mutation{Kind: "agents.disable", Identity: id, Meta: c.CommandMeta, ID: c.ID, InputHash: hash(c), Now: s.now()})
	if e == nil {
		r.Agent = s.decorate(ctx, c.ProfileID, r.Agent)
	}
	return r.Agent, e
}
func (s *Service) usageSnapshot(ctx context.Context, id string) (api.AgentUsage, string, []api.DeletionCategory, error) {
	u, e := s.usage.SnapshotUsage(ctx, id)
	if e != nil {
		return u, "", nil, e
	}
	if u.RevisionToken == "" {
		return u, "", nil, &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "USAGE_SNAPSHOT_UNAVAILABLE"}
	}
	u.ActiveRunIDs = append([]string(nil), u.ActiveRunIDs...)
	u.GroupIDs = append([]string(nil), u.GroupIDs...)
	u.MemoryIDs = append([]string(nil), u.MemoryIDs...)
	u.Unassembled = append([]string(nil), u.Unassembled...)
	u.SessionIDs = append([]string(nil), u.SessionIDs...)
	sort.Strings(u.ActiveRunIDs)
	sort.Strings(u.GroupIDs)
	sort.Strings(u.MemoryIDs)
	sort.Strings(u.Unassembled)
	sort.Strings(u.SessionIDs)
	cats := []api.DeletionCategory{{Kind: "related-sessions", Count: len(u.SessionIDs), Retained: true, Reason: "HISTORY_RETAINED"}, {Kind: "active-runs", Count: len(u.ActiveRunIDs), Retained: len(u.ActiveRunIDs) > 0}, {Kind: "group-memberships", Count: len(u.GroupIDs), Retained: len(u.GroupIDs) > 0}, {Kind: "private-memory", Count: len(u.MemoryIDs), Retained: len(u.MemoryIDs) > 0}}
	for _, kind := range u.Unassembled {
		cats = append(cats, api.DeletionCategory{Kind: kind, Count: 0, Retained: false, Reason: "CONTEXT_NOT_ASSEMBLED"})
	}
	return u, hash(u), cats, nil
}
func (s *Service) DeletePreview(ctx context.Context, id api.RequestIdentity, q api.IDQuery) (api.DeletionPreview, error) {
	if e := identity(id); e != nil {
		return api.DeletionPreview{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, digest, categories, e := s.usageSnapshot(ctx, q.ID)
	if e != nil {
		return api.DeletionPreview{}, e
	}
	return s.repo.Preview(ctx, id, q, digest, categories, s.now())
}
func (s *Service) Delete(ctx context.Context, id api.RequestIdentity, c api.AgentDelete) (api.Receipt, error) {
	if e := command(id, c.CommandMeta, true); e != nil {
		return api.Receipt{}, e
	}
	if c.ID == "" || c.PreviewToken == "" {
		return api.Receipt{}, api.Invalid("INVALID_AGENT_DELETE")
	}
	if len(c.RetainMemoryIDs) > 0 {
		return api.Receipt{}, &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "MEMORY_CONTEXT_NOT_ASSEMBLED"}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	u, digest, _, e := s.usageSnapshot(ctx, c.ID)
	if e != nil {
		return api.Receipt{}, e
	}
	if len(u.ActiveRunIDs)+len(u.GroupIDs)+len(u.MemoryIDs) > 0 {
		return api.Receipt{}, &api.Fault{Kind: "CONFLICT", Reason: "AGENT_IN_USE"}
	}
	r, e := s.repo.Mutate(ctx, Mutation{Kind: "agents.delete", Identity: id, Meta: c.CommandMeta, ID: c.ID, PreviewToken: c.PreviewToken, UsageHash: digest, InputHash: hash(c), Now: s.now()})
	return r.Receipt, e
}
func (s *Service) BindModel(ctx context.Context, id api.RequestIdentity, c api.ModelBind) (api.Agent, error) {
	if e := command(id, c.CommandMeta, true); e != nil {
		return api.Agent{}, e
	}
	if c.AgentID == "" {
		return api.Agent{}, api.Invalid("AGENT_ID_REQUIRED")
	}
	if e := validateModel(c.Model); e != nil {
		return api.Agent{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, e := s.repo.Mutate(ctx, Mutation{Kind: "models.bind", Identity: id, Meta: c.CommandMeta, ID: c.AgentID, Model: &c.Model, InputHash: hash(c), Now: s.now()})
	if e == nil {
		r.Agent = s.decorate(ctx, c.ProfileID, r.Agent)
	}
	return r.Agent, e
}
func (s *Service) ListModels(ctx context.Context, id api.RequestIdentity, q api.PageQuery) (api.ModelPage, error) {
	page, e := s.List(ctx, id, q)
	out := api.ModelPage{Items: []api.ModelInfo{}, NextCursor: page.NextCursor}
	if e != nil {
		return out, e
	}
	for _, a := range page.Items {
		if a.Model != nil {
			protocols, declared := s.probe.(ModelProbeProtocols)
			available := declared && protocols.SupportsProtocol(a.Model.Protocol) && a.Model.CredentialStatus.State == "available"
			out.Items = append(out.Items, api.ModelInfo{ModelBinding: *a.Model, Available: available})
		}
	}
	return out, nil
}
func (s *Service) TestModel(ctx context.Context, id api.RequestIdentity, c api.ModelTest) (api.ModelTestResult, error) {
	var out api.ModelTestResult
	if e := identity(id); e != nil {
		return out, e
	}
	if e := validateModel(c.Model); e != nil {
		return out, e
	}
	ctx, finished, e := s.beginProbe(ctx)
	if e != nil {
		return out, e
	}
	defer finished()
	if _, e := s.repo.List(ctx, api.PageQuery{ProfileID: c.ProfileID, Limit: 1}); e != nil {
		return out, e
	}
	if s.probe == nil {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}
	}
	if protocols, declared := s.probe.(ModelProbeProtocols); declared && !protocols.SupportsProtocol(c.Model.Protocol) {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}
	}
	if c.Model.ModelID == "" || c.Model.ProviderID == "" || c.Model.Endpoint == "" {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "MODEL_DRAFT_INCOMPLETE"}
	}
	if c.Model.CredentialRef == "" || s.credentials == nil {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "CREDENTIAL_MISSING"}
	}
	secret, st, e := s.credentials.Resolve(ctx, c.ProfileID, c.Model.CredentialRef)
	defer func() { clear(secret) }()
	if e != nil || st.State != "available" {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "CREDENTIAL_MISSING"}
	}
	caps, e := s.probe.Probe(ctx, c.Model, secret)
	if e != nil {
		return out, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "MODEL_PROBE_FAILED"}
	}
	if caps == nil {
		caps = []string{}
	}
	return api.ModelTestResult{Available: true, Capabilities: caps, CredentialStatus: st}, nil
}
func (s *Service) AcquireSnapshot(ctx context.Context, id api.RequestIdentity, profileID, agentID string) (api.ConfigSnapshot, error) {
	if e := identity(id); e != nil {
		return api.ConfigSnapshot{}, e
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.repo.Acquire(ctx, profileID, agentID)
}
func (s *Service) ReleaseSnapshot(ctx context.Context, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.repo.Release(ctx, token)
}

var _ api.AssistantAPI = (*Service)(nil)

// UsageDigest is shared by the read projection and the final adapter transaction.
func UsageDigest(u api.AgentUsage) string {
	u.ActiveRunIDs = append([]string(nil), u.ActiveRunIDs...)
	u.GroupIDs = append([]string(nil), u.GroupIDs...)
	u.MemoryIDs = append([]string(nil), u.MemoryIDs...)
	u.Unassembled = append([]string(nil), u.Unassembled...)
	u.SessionIDs = append([]string(nil), u.SessionIDs...)
	sort.Strings(u.ActiveRunIDs)
	sort.Strings(u.GroupIDs)
	sort.Strings(u.MemoryIDs)
	sort.Strings(u.Unassembled)
	sort.Strings(u.SessionIDs)
	return hash(u)
}

// ValidateDraft is shared by application-controlled temporary configuration
// admission; it applies the same limits as persistent Agent configuration.
func ValidateDraft(d api.AgentDraft) error { return draft(d) }
func ValidateCreate(id api.RequestIdentity, c api.AgentCreate) error {
	if e := command(id, c.CommandMeta, false); e != nil {
		return e
	}
	return draft(c.Draft)
}
