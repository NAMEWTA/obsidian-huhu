package common

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// The private wire schema is deliberately case-sensitive. DisallowUnknownFields
// on Go structs alone would still accept case aliases and null scalar values.
// No model field can set provenance to user or choose an owner/source/account.
func parseMemoryCandidates(raw []byte, targets []api.MemoryTarget) (*api.MemoryCandidateSet, error) {
	bad := Fault("MEMORY_CANDIDATE_INVALID")
	if len(raw) > MaxTextBytes || api.ValidateMemoryJSON(raw) != nil || StrictJSON(raw, MaxTextBytes) != nil {
		return nil, bad
	}
	var root map[string]json.RawMessage
	if json.Unmarshal(raw, &root) != nil || len(root) != 1 || root["items"] == nil || bytes.Equal(bytes.TrimSpace(root["items"]), []byte("null")) {
		return nil, bad
	}
	var items []json.RawMessage
	if json.Unmarshal(root["items"], &items) != nil || items == nil || len(items) > 32 {
		return nil, bad
	}
	allowed := make(map[string]bool, len(targets))
	for _, t := range targets {
		allowed[t.ItemID] = true
	}
	result := &api.MemoryCandidateSet{Items: make([]api.MemoryCandidateDraft, 0, len(items))}
	corrected := map[string]bool{}
	seen := map[api.MemoryCandidateDraft]bool{}
	for _, rawItem := range items {
		var fields map[string]json.RawMessage
		if json.Unmarshal(rawItem, &fields) != nil || len(fields) < 3 || len(fields) > 4 {
			return nil, bad
		}
		for key, value := range fields {
			if (key != "operation" && key != "targetItemId" && key != "text" && key != "provenance") || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
				return nil, bad
			}
		}
		var candidate api.MemoryCandidateDraft
		if json.Unmarshal(fields["operation"], &candidate.Operation) != nil || json.Unmarshal(fields["text"], &candidate.Text) != nil || json.Unmarshal(fields["provenance"], &candidate.Provenance) != nil || len(candidate.Text) > api.MemoryTextBytes || strings.TrimSpace(candidate.Text) == "" || (candidate.Provenance != "observation" && candidate.Provenance != "inference") {
			return nil, bad
		}
		switch candidate.Operation {
		case "create":
			if _, exists := fields["targetItemId"]; exists {
				return nil, bad
			}
		case "correct":
			if json.Unmarshal(fields["targetItemId"], &candidate.TargetItemID) != nil || !allowed[candidate.TargetItemID] || corrected[candidate.TargetItemID] {
				return nil, bad
			}
			corrected[candidate.TargetItemID] = true
		default:
			return nil, bad
		}
		if seen[candidate] {
			return nil, bad
		}
		seen[candidate] = true
		result.Items = append(result.Items, candidate)
	}
	return result, nil
}
