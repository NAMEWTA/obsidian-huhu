package broker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	domain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/effect"
	"io"
	"reflect"
	"sync"
	"time"
)

var Descriptor = api.ToolDescriptor{Name: "note.write", Capability: "note.write", CapabilityVersion: "1", ImplementationVersion: "1", PolicyVersion: "1"}
var GlobalMemoryDescriptor = api.ToolDescriptor{Name: "memory.proposeGlobal", Capability: "memory.proposeGlobal", CapabilityVersion: "1", ImplementationVersion: "1", PolicyVersion: "1"}

type Options struct {
	Now              func() time.Time
	ApprovalLifetime time.Duration
	EngineVersion    string
	// The pure resolver receives only the trusted pinned model protocol.
	EngineVersionForProtocol func(string) (string, error)
}
type Service struct {
	inspectionMu       sync.Mutex
	inspectionStopping bool
	inspectionWG       sync.WaitGroup
	inspectionDone     chan struct{}
	inspectionStopOnce sync.Once
	inspector          api.EngineCheckpointInspector
	repo               Repository
	blobs              Blobs
	host               api.HostAPI
	access             api.ContextAccess
	target             api.NoteWritePort
	options            Options
	collaboration      api.CollaborationTools
	globalMemory       api.GlobalMemoryToolProposer
	attempts           api.AttemptBinder
	waits              api.ExecutionWaitPublisher
}

func New(repo Repository, blobs Blobs, host api.HostAPI, access api.ContextAccess, target api.NoteWritePort, o Options) *Service {
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.ApprovalLifetime <= 0 || o.ApprovalLifetime > 24*time.Hour {
		o.ApprovalLifetime = 10 * time.Minute
	}
	if o.EngineVersion == "" {
		o.EngineVersion = "huhu-engine-v1"
	}
	return &Service{inspectionDone: make(chan struct{}), repo: repo, blobs: blobs, host: host, access: access, target: target, options: o}
}
func hash(v any) string {
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return "sha256:" + hex.EncodeToString(h[:])
}
func ContentHash(s string) string {
	h := sha256.Sum256([]byte(s))
	return "sha256:" + hex.EncodeToString(h[:])
}
func fault(kind, reason string) error { return &api.Fault{Kind: kind, Reason: reason} }
func allowed(a api.Agent, tool string) bool {
	for _, name := range a.AllowedTools {
		if name == tool {
			return true
		}
	}
	return false
}
func sameLease(a, b api.HostLease) bool {
	return a.LeaseID == b.LeaseID && a.HostConnectionID == b.HostConnectionID && a.LeaseEpoch == b.LeaseEpoch && a.WorkspaceID == b.WorkspaceID
}

func (s *Service) metadataForAgent(agent api.Agent) (api.CheckpointMetadata, error) {
	version := s.options.EngineVersion
	if resolve := s.options.EngineVersionForProtocol; resolve != nil {
		if agent.Model == nil || agent.Model.Protocol == "" {
			return api.CheckpointMetadata{}, fault("MODEL_UNAVAILABLE", "MODEL_DRAFT_INCOMPLETE")
		}
		var err error
		version, err = resolve(agent.Model.Protocol)
		if err != nil {
			return api.CheckpointMetadata{}, err
		}
	}
	if version == "" {
		return api.CheckpointMetadata{}, fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
	}
	return api.CheckpointMetadata{EngineVersion: version, FormatVersion: "1", DefinitionDigest: definitionDigest(agent)}, nil
}

func unavailableCheckpointIdentity(err error) bool {
	var f *api.Fault
	return errors.As(err, &f) && f.Kind == "MODEL_UNAVAILABLE" && (f.Reason == "MODEL_DRAFT_INCOMPLETE" || f.Reason == "ADAPTER_NOT_ASSEMBLED")
}
func hasCapability(l api.HostLease) bool {
	for _, v := range l.Capabilities {
		if v == Descriptor.Capability {
			return true
		}
	}
	return false
}

type bound struct {
	service   *Service
	execution api.ToolExecution
	metadata  api.CheckpointMetadata
	mu        sync.Mutex
	closed    bool
	releases  []func()
	readers   []io.ReadCloser
}

func (s *Service) Bind(ctx context.Context, x api.ToolExecution) (api.ToolSession, error) {
	if !x.Identity.Valid() || x.Run.ID == "" || x.ClaimToken == "" || x.Access.TaskID != x.Run.ID || x.Agent.ID != x.Run.AgentID {
		return api.ToolSession{}, api.Denied("TOOL_CONTEXT_INVALID")
	}
	metadata, metadataErr := s.metadataForAgent(x.Agent)
	if metadataErr != nil && !unavailableCheckpointIdentity(metadataErr) {
		return api.ToolSession{}, metadataErr
	}
	b := &bound{service: s, execution: x, metadata: metadata}
	var attempts api.ModelAttempts
	if s.attempts != nil {
		var err error
		attempts, err = s.attempts.BindAttempts(ctx, x)
		if err != nil {
			return api.ToolSession{}, err
		}
	}
	session := api.ToolSession{Tools: b, Attempts: attempts, Close: b.Close}
	if metadataErr == nil {
		session.Checkpoints = b
	}
	return session, nil
}
func (b *bound) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return nil
	}
	b.closed = true
	for _, r := range b.readers {
		_ = r.Close()
	}
	for _, release := range b.releases {
		release()
	}
	b.readers = nil
	b.releases = nil
	return nil
}
func (b *bound) Metadata() api.CheckpointMetadata { return b.metadata }
func (b *bound) Publish(ctx context.Context, r io.Reader) (api.CheckpointArtifact, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return api.CheckpointArtifact{}, api.Denied("TOOL_SESSION_CLOSED")
	}
	if b.metadata.EngineVersion == "" {
		return api.CheckpointArtifact{}, fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
	}
	a, release, e := b.service.blobs.Publish(ctx, b.execution.Run.ID, b.execution.ClaimToken, b.metadata, r)
	if e == nil {
		b.releases = append(b.releases, release)
	}
	return a, e
}
func (b *bound) Open(ctx context.Context, a api.CheckpointArtifact) (io.ReadCloser, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed || b.metadata.EngineVersion == "" || a.RunID != b.execution.Run.ID || a.Metadata != b.metadata {
		return nil, fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
	}
	used, e := b.service.repo.Referenced(ctx, a.Ref)
	if e != nil {
		return nil, e
	}
	if !used {
		return nil, fault("RECOVERY_BLOCKED", "CHECKPOINT_UNPUBLISHED")
	}
	r, e := b.service.blobs.Open(ctx, a)
	if e == nil {
		b.readers = append(b.readers, r)
	}
	return r, e
}
func (b *bound) Invoke(ctx context.Context, c api.ToolCall) (api.ToolResult, error) {
	b.mu.Lock()
	closed := b.closed
	b.mu.Unlock()
	if closed {
		return api.ToolResult{}, api.Denied("TOOL_SESSION_CLOSED")
	}
	s := b.service
	x := b.execution
	// This bound port is the common model-tool capability gate. Target access
	// and payload validation below cannot grant a tool absent from the pinned
	// configuration. User-facing application APIs retain their own authority.
	if !allowed(x.Agent, c.Name) {
		if c.Name == Descriptor.Name {
			return api.ToolResult{Status: "denied", Reason: "TOOL_NOT_ALLOWED"}, nil
		}
		return api.ToolResult{}, api.Denied("TOOL_NOT_ALLOWED")
	}
	if c.Name == GlobalMemoryDescriptor.Name {
		if err := api.ValidateGlobalMemoryToolCall(c); err != nil {
			return api.ToolResult{Status: "denied", Reason: "INVALID_TOOL_CALL"}, nil
		}
		if s.globalMemory == nil {
			return api.ToolResult{Status: "denied", Reason: "GLOBAL_MEMORY_NOT_ASSEMBLED"}, nil
		}
		proposal, err := s.globalMemory.ProposeFromTool(ctx, x, c.ID, *c.GlobalMemory)
		if err != nil {
			return api.ToolResult{}, err
		}
		result := api.ToolResult{Status: "proposed", GlobalMemoryProposal: &proposal}
		if err = api.ValidateGlobalMemoryToolResult(result); err != nil {
			return api.ToolResult{}, err
		}
		return result, nil
	}
	if c.Name != "note.write" {
		if s.collaboration == nil {
			return api.ToolResult{}, api.Denied("COLLABORATION_NOT_ASSEMBLED")
		}
		return s.collaboration.InvokeTool(ctx, x, c)
	}
	if !domain.Validate(domain.Call{ID: c.ID, Name: c.Name, Content: c.Content, Target: domain.Target{WorkspaceID: c.Target.WorkspaceID, ResourceID: c.Target.ResourceID, Operation: c.Target.Operation, BaseRevision: c.Target.BaseRevision}}) {
		return api.ToolResult{Status: "denied", Reason: "INVALID_TOOL_CALL"}, nil
	}
	if e := s.access.AuthorizeAdmission(ctx, x.Identity, x.Access); e != nil {
		return api.ToolResult{}, e
	}
	intentHash := hash(struct {
		Call api.ToolCall
		Tool api.ToolDescriptor
	}{c, Descriptor})
	if existing, found, e := s.repo.Find(ctx, x, c, intentHash); e != nil {
		return api.ToolResult{}, e
	} else if found {
		return toolResult(existing), nil
	}
	if s.target == nil {
		return api.ToolResult{Status: "denied", Reason: "NOTE_WRITE_NOT_ASSEMBLED"}, nil
	}
	preview, e := s.target.Preview(ctx, c.Target, c.Content)
	if e != nil {
		return api.ToolResult{}, e
	}
	current, e := s.host.CurrentLease(ctx)
	if e != nil {
		return api.ToolResult{}, e
	}
	if !sameLease(preview.Lease, current) || !hasCapability(current) || preview.Target.WorkspaceID != current.WorkspaceID || preview.Target != c.Target || preview.Tool != Descriptor || preview.ContentHash != ContentHash(c.Content) {
		return api.ToolResult{}, api.Denied("TARGET_PREVIEW_MISMATCH")
	}
	p := api.ApprovalPreview{Binding: preview.Binding, Target: preview.Target, Tool: preview.Tool, ParametersHash: hash(c), Diff: preview.Diff, Content: c.Content, SourceRefs: append([]api.SourceSnapshot{}, x.Access.Sources...)}
	if len(p.Diff) > 131072 {
		return api.ToolResult{}, fault("RESOURCE_LIMIT", "PREVIEW_TOO_LARGE")
	}
	p.PreviewHash = hash(p)
	if encoded, _ := json.Marshal(p); len(encoded) > 524288 {
		return api.ToolResult{}, fault("RESOURCE_LIMIT", "PREVIEW_TOO_LARGE")
	}
	effect, e := s.repo.Reserve(ctx, x, c, p, current, intentHash)
	if e != nil {
		var fault *api.Fault
		if errors.As(e, &fault) && fault.Kind == "CAPABILITY_DENIED" {
			return api.ToolResult{Status: "denied", Reason: fault.Reason}, nil
		}
		return api.ToolResult{}, e
	}
	return toolResult(effect), nil
}
func (s *Service) PublishSuspension(ctx context.Context, x api.ToolExecution, p api.EngineSuspension) error {
	if (p.Kind == "" && p.Token == "") || p.Checkpoint.RunID != x.Run.ID || p.Checkpoint.AttemptID != x.ClaimToken {
		return fault("RECOVERY_BLOCKED", "INVALID_ENGINE_SUSPENSION")
	}
	expected, e := s.metadataForAgent(x.Agent)
	if e != nil {
		if unavailableCheckpointIdentity(e) {
			return fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
		}
		return e
	}
	if !reflect.DeepEqual(p.Checkpoint.Metadata, expected) {
		return fault("RECOVERY_BLOCKED", "CHECKPOINT_INCOMPATIBLE")
	}
	if e := s.blobs.Verify(ctx, p.Checkpoint); e != nil {
		return e
	}
	if p.Kind != "" {
		if (p.Kind != "children" && p.Kind != "question") || len(p.WaitForIDs) == 0 || len(p.WaitForIDs) > 32 || s.waits == nil {
			return api.Invalid("INVALID_EXECUTION_WAIT")
		}
		return s.waits.PublishWait(ctx, x, p)
	}
	return s.repo.Publish(ctx, x, p.Token, p.Checkpoint, s.options.Now().Add(s.options.ApprovalLifetime))
}
func (s *Service) Continue(ctx context.Context, x api.ToolExecution, c api.RunContinuation) (api.ToolResult, error) {
	effect, e := s.repo.ContinuationEffect(ctx, x, c)
	if e != nil {
		return api.ToolResult{}, e
	}
	if e = s.blobs.Verify(ctx, c.Checkpoint); e != nil {
		return api.ToolResult{}, e
	}
	result := api.ToolResult{Status: "denied", EffectID: effect.ID, Reason: "APPROVAL_" + map[string]string{"rejected": "REJECTED", "expired": "EXPIRED"}[c.Decision]}
	if c.Decision == "approved" && (effect.State == "committed" || effect.State == "reconciled" || effect.State == "failed_no_effect" || effect.State == "rejected") {
		result = toolResult(effect)
		if e = s.repo.CompleteContinuation(ctx, x, c); e != nil {
			return api.ToolResult{}, e
		}
		return result, nil
	}
	if c.Decision == "approved" {
		if e = s.access.AuthorizeAdmission(ctx, x.Identity, x.Access); e != nil {
			return api.ToolResult{}, e
		}
		current, err := s.host.CurrentLease(ctx)
		if err != nil {
			return api.ToolResult{}, err
		}
		if s.target == nil || !sameLease(effect.Lease, current) || !hasCapability(current) || effect.Preview.Tool != Descriptor {
			e = api.Denied("TOOL_CAPABILITY_CHANGED")
		} else {
			e = s.target.Check(ctx, effect.Preview, current)
			if e == nil {
				latest, err := s.host.CurrentLease(ctx)
				if err != nil {
					e = err
				} else if !sameLease(effect.Lease, latest) || !hasCapability(latest) {
					e = api.Denied("TOOL_CAPABILITY_CHANGED")
				}
			}
		}
		if e != nil {
			reason := "TARGET_OR_CAPABILITY_CHANGED"
			var detail *api.Fault
			if errors.As(e, &detail) {
				switch detail.Reason {
				case "UNSAVED_EDITOR_CHANGES", "SOURCE_CHANGED", "NOTE_TARGET_EXISTS":
					reason = detail.Reason
				}
			}
			if save := s.repo.CompleteEffect(ctx, x, effect.ID, "failed_no_effect", reason, nil); save != nil {
				return api.ToolResult{}, save
			}
			result.Reason = reason
		} else {
			result, e = s.dispatch(ctx, x, effect, current)
			if e != nil {
				return api.ToolResult{}, e
			}

		}
	}
	if e = s.repo.CompleteContinuation(ctx, x, c); e != nil {
		return api.ToolResult{}, e
	}
	return result, nil
}
func (s *Service) Collect(ctx context.Context) (int, error) {
	return s.blobs.Collect(ctx, s.repo.Referenced)
}

var _ api.ExecutionTooling = (*Service)(nil)

func definitionDigest(a api.Agent) string {
	draft := api.AgentDraft{Name: a.Name, Description: a.Description, Persona: a.Persona, AllowedTools: a.AllowedTools, AllowedCollaborationTargets: a.AllowedCollaborationTargets}
	if a.Model != nil {
		model := a.Model.ModelBindingDraft
		draft.Model = &model
	}
	if !allowed(a, GlobalMemoryDescriptor.Capability) {
		// Preserve the legacy checkpoint digest byte-for-byte for agents that
		// cannot call the new model tool.
		return hash(struct {
			ID, PersonaRevision, ModelRevision string
			Draft                              api.AgentDraft
			Tool                               api.ToolDescriptor
		}{a.ID, a.PersonaRevision, a.ModelBindingRevision, draft, Descriptor})
	}
	tools := []api.ToolDescriptor{Descriptor, GlobalMemoryDescriptor}
	return hash(struct {
		ID, PersonaRevision, ModelRevision string
		Draft                              api.AgentDraft
		Tools                              []api.ToolDescriptor
	}{a.ID, a.PersonaRevision, a.ModelBindingRevision, draft, tools})
}

func toolResult(effect Effect) api.ToolResult {
	switch effect.State {
	case "committed", "reconciled":
		return api.ToolResult{Status: "completed", EffectID: effect.ID, Receipt: effect.Receipt}
	case "rejected", "failed_no_effect":
		return api.ToolResult{Status: "denied", EffectID: effect.ID, Reason: effect.Reason}
	case "prepared", "awaiting_approval":
		return api.ToolResult{Status: "approval_required", EffectID: effect.ID, SuspensionToken: effect.Token}
	default:
		return api.ToolResult{Status: "denied", EffectID: effect.ID, Reason: "EFFECT_REQUIRES_RECONCILIATION"}
	}
}

func (s *Service) dispatch(ctx context.Context, x api.ToolExecution, effect Effect, current api.HostLease) (api.ToolResult, error) {
	result := api.ToolResult{Status: "denied", EffectID: effect.ID}
	if e := s.repo.ClaimDispatch(ctx, x, effect); e != nil {
		var fault *api.Fault
		if errors.As(e, &fault) && fault.Kind == "APPROVAL_EXPIRED" {
			if save := s.repo.CompleteEffect(ctx, x, effect.ID, "failed_no_effect", "APPROVAL_EXPIRED", nil); save != nil {
				return result, save
			}
			result.Reason = "APPROVAL_EXPIRED"
			return result, nil
		}
		return result, e
	}
	dispatch := api.EffectDispatch{EffectID: effect.ID, RunID: x.Run.ID, ApprovalID: effect.ApprovalID, ApprovalRevision: effect.ApprovalRevision, ExpiresAt: effect.ExpiresAt, ProfileID: effect.ProfileID, CommandEpoch: effect.CommandEpoch, Target: effect.Preview.Target, Tool: effect.Preview.Tool, Content: effect.Preview.Content, Preview: effect.Preview, Lease: current}
	command := api.HostInvokeCommand{ProfileID: dispatch.ProfileID, CommandEpoch: dispatch.CommandEpoch, EffectID: dispatch.EffectID, RunID: dispatch.RunID, ApprovalID: dispatch.ApprovalID, ApprovalRevision: dispatch.ApprovalRevision, ExpiresAt: dispatch.ExpiresAt, Content: dispatch.Content, Preview: dispatch.Preview}
	dispatch.Fingerprint = api.EffectFingerprint(command)
	receipt, err := s.target.Invoke(ctx, dispatch)
	state, reason := "unknown_outcome", "HOST_OUTCOME_UNKNOWN"
	if err == nil && receipt.EffectID == effect.ID && receipt.Status == "committed" && receipt.ReceiptID != "" && (effect.Preview.Binding == nil || receipt.Fingerprint == dispatch.Fingerprint) {
		state, reason = "committed", ""
		result.Status = "completed"
		result.Receipt = &receipt
	} else if err == nil && receipt.EffectID == effect.ID && receipt.Status == "failed_no_effect" {
		state, reason = "failed_no_effect", "HOST_REJECTED"
		result.Reason = reason
	} else {
		result.Status = "unknown_outcome"
		result.Reason = reason
	}
	var evidence *api.HostReceipt
	// A failed reverse call has no authenticated receipt. In particular its Go
	// zero value must not become a durable receipt with an empty status.
	if err == nil && receipt.EffectID == effect.ID && (effect.Preview.Binding == nil || receipt.Fingerprint == dispatch.Fingerprint) {
		switch receipt.Status {
		case "committed", "reconciled", "failed_no_effect", "unknown_outcome", "rejected":
			evidence = &receipt
		}
	}
	if e := s.repo.CompleteEffect(context.Background(), x, effect.ID, state, reason, evidence); e != nil {
		return api.ToolResult{}, e
	}
	return result, nil
}

func (s *Service) SetCollaboration(c api.CollaborationTools)        { s.collaboration = c }
func (s *Service) SetGlobalProposer(p api.GlobalMemoryToolProposer) { s.globalMemory = p }
func (s *Service) SetAttempts(a api.AttemptBinder)                  { s.attempts = a }

func (s *Service) SetWaitPublisher(w api.ExecutionWaitPublisher) { s.waits = w }
