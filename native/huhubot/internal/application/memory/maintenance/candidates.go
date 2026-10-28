package maintenance

import (
	"encoding/json"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// ValidateCandidates validates the whole set before the adapter writes any
// revision. Targets are supplied by the persisted admission, never the model.
func ValidateCandidates(set api.MemoryCandidateSet, targets []api.MemoryTarget) error {
	if set.Items == nil || len(set.Items) > 32 {
		return api.Invalid("MEMORY_CANDIDATE_INVALID")
	}
	raw, err := json.Marshal(set)
	if err != nil || len(raw) > 131072 {
		return api.Invalid("MEMORY_CANDIDATE_INVALID")
	}
	allowed, seen := map[string]bool{}, map[string]bool{}
	for _, target := range targets {
		allowed[target.ItemID] = true
	}
	for _, item := range set.Items {
		if !utf8.ValidString(item.Text) || strings.TrimSpace(item.Text) == "" || len(item.Text) > api.MemoryTextBytes || item.Provenance != "observation" && item.Provenance != "inference" {
			return api.Invalid("MEMORY_CANDIDATE_INVALID")
		}
		switch item.Operation {
		case "create":
			if item.TargetItemID != "" {
				return api.Invalid("MEMORY_CANDIDATE_INVALID")
			}
		case "correct":
			if !allowed[item.TargetItemID] || seen[item.TargetItemID] {
				return api.Invalid("MEMORY_CANDIDATE_INVALID")
			}
			seen[item.TargetItemID] = true
		default:
			return api.Invalid("MEMORY_CANDIDATE_INVALID")
		}
	}
	return nil
}
