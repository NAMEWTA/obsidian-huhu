package api

import "context"

func (h *HostService) CurrentLease(context.Context) (HostLease, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.remote == nil || !h.now().Before(parseTime(h.lease.ExpiresAt)) {
		return HostLease{}, &Fault{Kind: "HOST_UNAVAILABLE", Reason: "HOST_OFFLINE", Retryable: true}
	}
	return cloneLease(h.lease), nil
}
func (h *HostService) readRemote(ctx context.Context, lease, connection, epoch, workspace, capability string) (HostReadRemote, error) {
	current, e := h.CurrentLease(ctx)
	if e != nil {
		return nil, e
	}
	if current.HostConnectionID != connection || current.LeaseEpoch != epoch {
		return nil, Denied("HOST_LEASE_MISMATCH")
	}
	remote, e := h.acquire(lease, workspace, capability)
	if e != nil {
		return nil, e
	}
	reader, ok := remote.(HostReadRemote)
	if !ok {
		return nil, Denied("HOST_CAPABILITY_NOT_ASSEMBLED")
	}
	return reader, nil
}
func (h *HostService) Read(ctx context.Context, q HostReadRequest) (HostReadResult, error) {
	var out HostReadResult
	if q.MaxBytes < 1 || q.MaxBytes > 65536 {
		return out, Invalid("INVALID_HOST_READ_LIMIT")
	}
	remote, e := h.readRemote(ctx, q.LeaseID, q.HostConnectionID, q.LeaseEpoch, q.WorkspaceID, "note.read")
	if e != nil {
		return out, e
	}
	out, e = remote.Read(ctx, q)
	if e != nil {
		return out, e
	}
	if _, e = h.readRemote(ctx, q.LeaseID, q.HostConnectionID, q.LeaseEpoch, q.WorkspaceID, "note.read"); e != nil {
		return HostReadResult{}, e
	}
	return out, nil
}
func (h *HostService) Search(ctx context.Context, q HostSearchRequest) (HostSearchResult, error) {
	var out HostSearchResult
	if q.Limit < 1 || q.Limit > 20 || q.MaxBytes < 1 || q.MaxBytes > 65536 || q.Query == "" || len(q.Query) > 1024 || len(q.Sources)+len(q.Scopes) == 0 || len(q.Sources)+len(q.Scopes) > 32 {
		return out, Invalid("INVALID_HOST_SEARCH_LIMIT")
	}
	remote, e := h.readRemote(ctx, q.LeaseID, q.HostConnectionID, q.LeaseEpoch, q.WorkspaceID, "note.search")
	if e != nil {
		return out, e
	}
	out, e = remote.Search(ctx, q)
	if e != nil {
		return out, e
	}
	if _, e = h.readRemote(ctx, q.LeaseID, q.HostConnectionID, q.LeaseEpoch, q.WorkspaceID, "note.search"); e != nil {
		return HostSearchResult{}, e
	}
	return out, nil
}
