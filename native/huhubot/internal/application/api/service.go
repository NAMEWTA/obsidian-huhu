package api

import (
	"context"
	"slices"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"
)

type Service struct {
	profiles    ProfileReader
	host        HostAPI
	stopping    atomic.Bool
	connections atomic.Int32
	stopHook    func() error
}

func NewService(profiles ProfileReader, host HostAPI) *Service {
	return &Service{profiles: profiles, host: host}
}
func (s *Service) Connect()    { s.connections.Add(1) }
func (s *Service) Disconnect() { s.connections.Add(-1) }
func (s *Service) Health(ctx context.Context, i RequestIdentity) error {
	_, err := s.Status(ctx, i)
	return err
}
func (s *Service) Status(ctx context.Context, i RequestIdentity) (ServiceStatus, error) {
	if !i.Valid() {
		return ServiceStatus{}, Denied("UNAUTHENTICATED")
	}
	if s.stopping.Load() {
		return ServiceStatus{}, &Fault{Kind: "CONFLICT", Reason: "SERVICE_STOPPING"}
	}
	p, err := s.profiles.ReadMetadata(ctx)
	if err != nil {
		return ServiceStatus{}, err
	}
	out := ServiceStatus{State: "ready", Profile: p, HostAttached: s.host.Attached()}
	if reader, ok := s.profiles.(interface {
		ReadCleanup(context.Context, RequestIdentity) (*CleanupStatus, error)
	}); ok {
		out.Cleanup, err = reader.ReadCleanup(ctx, i)
		if err != nil {
			return ServiceStatus{}, err
		}
	}
	return out, nil
}
func (s *Service) Diagnostics(ctx context.Context, i RequestIdentity) (Diagnostics, error) {
	if err := s.Health(ctx, i); err != nil {
		return Diagnostics{}, err
	}
	return Diagnostics{int(s.connections.Load()), s.host.Attached()}, nil
}
func (s *Service) SetShutdownHook(h func() error) { s.stopHook = h }
func (s *Service) Shutdown(_ context.Context, i RequestIdentity) error {
	if !i.ManagedOwner() {
		return Denied("MANAGED_OWNER_REQUIRED")
	}
	if s.stopHook != nil {
		if e := s.stopHook(); e != nil {
			return e
		}
	}
	s.stopping.Store(true)
	return nil
}
func (s *Service) MarkStopping()  { s.stopping.Store(true) }
func (s *Service) Stopping() bool { return s.stopping.Load() }

// HostService owns one managed lease. No filesystem adapter or offline fallback exists.
type HostService struct {
	mu     sync.Mutex
	lease  HostLease
	epoch  uint64
	owner  string
	remote HostRemote
	now    func() time.Time
}

func NewHostService() *HostService { return &HostService{now: time.Now} }
func (h *HostService) Attach(_ context.Context, i RequestIdentity, c HostAttachCommand, r HostRemote) (HostLease, error) {
	if !i.ManagedOwner() {
		return HostLease{}, Denied("MANAGED_HOST_REQUIRED")
	}
	if c.WorkspaceID == "" || utf8.RuneCountInString(c.WorkspaceID) > 128 || len(c.Capabilities) == 0 || len(c.Capabilities) > 32 || r == nil {
		return HostLease{}, Invalid("INVALID_HOST_LEASE")
	}
	seen := make(map[string]bool)
	for _, v := range c.Capabilities {
		if v == "" || utf8.RuneCountInString(v) > 128 || seen[v] {
			return HostLease{}, Invalid("INVALID_HOST_CAPABILITIES")
		}
		seen[v] = true
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if c.RenewLeaseID != "" {
		if h.remote == nil || h.owner != i.ConnectionID() || h.lease.LeaseID != c.RenewLeaseID ||
			h.lease.WorkspaceID != c.WorkspaceID || !slices.Equal(h.lease.Capabilities, c.Capabilities) || !h.now().Before(parseTime(h.lease.ExpiresAt)) {
			return HostLease{}, Denied("HOST_LEASE_CHANGED")
		}
		h.lease.ExpiresAt = h.now().UTC().Add(5 * time.Minute).Format(time.RFC3339Nano)
		return cloneLease(h.lease), nil
	}
	if h.remote != nil && h.owner != i.ConnectionID() && h.now().Before(parseTime(h.lease.ExpiresAt)) {
		return HostLease{}, &Fault{Kind: "CONFLICT", Reason: "HOST_ALREADY_ATTACHED"}
	}
	if h.epoch == ^uint64(0) {
		return HostLease{}, &Fault{Kind: "RESOURCE_LIMIT", Reason: "HOST_EPOCH_EXHAUSTED"}
	}
	h.epoch++
	h.lease = HostLease{HostConnectionID: i.ConnectionID(), LeaseEpoch: strconv.FormatUint(h.epoch, 10), LeaseID: NewID("lease:"), WorkspaceID: c.WorkspaceID, Capabilities: append([]string(nil), c.Capabilities...), ExpiresAt: h.now().UTC().Add(5 * time.Minute).Format(time.RFC3339Nano)}
	h.owner = i.ConnectionID()
	h.remote = r
	return cloneLease(h.lease), nil
}
func parseTime(s string) time.Time { t, _ := time.Parse(time.RFC3339Nano, s); return t }
func cloneLease(l HostLease) HostLease {
	l.Capabilities = append([]string(nil), l.Capabilities...)
	return l
}
func (h *HostService) Detach(_ context.Context, i RequestIdentity, leaseID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if !i.ManagedOwner() || h.owner != i.ConnectionID() {
		return Denied("MANAGED_HOST_REQUIRED")
	}
	if leaseID != h.lease.LeaseID {
		return &Fault{Kind: "CONFLICT", Reason: "HOST_LEASE_CHANGED"}
	}
	h.remote = nil
	h.lease = HostLease{}
	h.owner = ""
	return nil
}
func (h *HostService) Disconnect(i RequestIdentity) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.owner == i.ConnectionID() {
		h.remote = nil
		h.lease = HostLease{}
		h.owner = ""
	}
}
func (h *HostService) Attached() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.remote != nil && h.now().Before(parseTime(h.lease.ExpiresAt))
}
func (h *HostService) acquire(lease, workspace, capability string) (HostRemote, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.remote == nil || !h.now().Before(parseTime(h.lease.ExpiresAt)) {
		return nil, &Fault{Kind: "HOST_UNAVAILABLE", Reason: "HOST_OFFLINE", Retryable: true}
	}
	if lease != h.lease.LeaseID || workspace != h.lease.WorkspaceID {
		return nil, Denied("HOST_LEASE_MISMATCH")
	}
	if capability != "" {
		allowed := false
		for _, c := range h.lease.Capabilities {
			if c == capability {
				allowed = true
			}
		}
		if !allowed {
			return nil, Denied("HOST_CAPABILITY_NOT_LEASED")
		}
	}
	return h.remote, nil
}
func (h *HostService) Invoke(ctx context.Context, c HostInvokeCommand) (HostReceipt, error) {
	if c.EffectID == "" || c.Resource.ResourceID == "" || c.Capability == "" {
		return HostReceipt{}, Invalid("INVALID_HOST_INVOCATION")
	}
	r, err := h.acquire(c.LeaseID, c.WorkspaceID, c.Capability)
	if err != nil {
		return HostReceipt{}, err
	}
	return r.Invoke(ctx, c)
}
func (h *HostService) QueryReceipt(ctx context.Context, c HostReceiptQuery) (HostReceipt, error) {
	if c.EffectID == "" {
		return HostReceipt{}, Invalid("INVALID_RECEIPT_QUERY")
	}
	r, err := h.acquire(c.LeaseID, c.WorkspaceID, "")
	if err != nil {
		return HostReceipt{}, err
	}
	return r.QueryReceipt(ctx, c)
}

func (h *HostService) PrepareWrite(ctx context.Context, c HostPrepareWriteRequest) (NoteTargetPreview, error) {
	remote, e := h.acquire(c.LeaseID, c.WorkspaceID, "note.write")
	if e != nil {
		return NoteTargetPreview{}, e
	}
	writer, ok := remote.(HostWriteRemote)
	if !ok {
		return NoteTargetPreview{}, Denied("NOTE_WRITE_NOT_ASSEMBLED")
	}
	return writer.PrepareWrite(ctx, c)
}
func (h *HostService) CheckWrite(ctx context.Context, c HostCheckWriteRequest) (HostCheckWriteResult, error) {
	remote, e := h.acquire(c.LeaseID, c.WorkspaceID, "note.write")
	if e != nil {
		return HostCheckWriteResult{}, e
	}
	writer, ok := remote.(HostWriteRemote)
	if !ok {
		return HostCheckWriteResult{}, Denied("NOTE_WRITE_NOT_ASSEMBLED")
	}
	return writer.CheckWrite(ctx, c)
}
