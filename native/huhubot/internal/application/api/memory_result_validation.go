package api

import "unicode/utf8"

func validMemoryOptionalID(s string) bool {
	return s == "" || memoryOpaque(s)
}

func validMemoryOptionalDecimal(s string) bool {
	return s == "" || s == "0" || memoryDecimal(s)
}

func validMemorySourceFields(resourceID, workspaceID, originClientID, originViewID, hostConnectionID, hostLeaseID, hostLeaseEpoch, revision, hash, title string) bool {
	return memoryOpaque(resourceID) && memoryOpaque(workspaceID) && memoryOpaque(originClientID) && memoryOpaque(originViewID) &&
		memoryOpaque(hostConnectionID) && memoryOpaque(hostLeaseID) && memoryDecimal(hostLeaseEpoch) && memoryDecimal(revision) &&
		memoryHash(hash) && utf8.ValidString(title)
}

func validMemorySourceSnapshot(s SourceSnapshot) bool {
	if (s.Kind != "note" && s.Kind != "selection") || !validMemorySourceFields(s.ResourceID, s.WorkspaceID, s.OriginClientID, s.OriginViewID, s.HostConnectionID, s.HostLeaseID, s.HostLeaseEpoch, s.Revision, s.Hash, s.Title) || s.ScopeResourceIDs == nil || len(s.ScopeResourceIDs) > 32 {
		return false
	}
	seen := make(map[string]bool, len(s.ScopeResourceIDs))
	for _, id := range s.ScopeResourceIDs {
		if !memoryOpaque(id) || seen[id] {
			return false
		}
		seen[id] = true
	}
	if s.Kind == "selection" && s.Range == nil {
		return false
	}
	if s.Kind == "note" && s.Range != nil {
		return false
	}
	return s.Range == nil || s.Range.Start >= 0 && s.Range.End > s.Range.Start && s.Range.End <= 1048576
}

func validMemorySourceScope(s SourceScope) bool {
	return (s.Kind == "folder" || s.Kind == "vault") && validMemorySourceFields(s.ResourceID, s.WorkspaceID, s.OriginClientID, s.OriginViewID, s.HostConnectionID, s.HostLeaseID, s.HostLeaseEpoch, s.Revision, s.Hash, s.Title)
}

func validMemorySources(refs []SourceSnapshot, scopes []SourceScope) bool {
	if len(refs)+len(scopes) > 32 {
		return false
	}
	for _, ref := range refs {
		if !validMemorySourceSnapshot(ref) {
			return false
		}
	}
	for _, scope := range scopes {
		if !validMemorySourceScope(scope) {
			return false
		}
	}
	return true
}

func validMemoryRunUsage(u *RunUsage) bool {
	if u == nil {
		return true
	}
	return (u.Knowledge == "" || u.Knowledge == "unknown" || u.Knowledge == "known" || u.Knowledge == "estimate") &&
		validMemoryOptionalDecimal(u.InputTokens) && validMemoryOptionalDecimal(u.OutputTokens)
}
