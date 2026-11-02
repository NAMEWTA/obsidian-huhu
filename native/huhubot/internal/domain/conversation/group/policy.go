package group

import (
	"strings"
	"unicode/utf8"
)

const MaxMembers = 100
const MaxTargets = 32

func Members(ids []string) string {
	if len(ids) < 1 || len(ids) > MaxMembers {
		return "INVALID_GROUP_MEMBERS"
	}
	seen := map[string]bool{}
	for _, id := range ids {
		if id == "" || len(id) > 256 || !utf8.ValidString(id) || seen[id] {
			return "INVALID_GROUP_MEMBERS"
		}
		seen[id] = true
	}
	return ""
}
func Create(title string, ids []string, coordinator string) string {
	if !utf8.ValidString(title) || strings.TrimSpace(title) == "" || len(title) > 512 {
		return "INVALID_SESSION_TITLE"
	}
	if r := Members(ids); r != "" {
		return r
	}
	for _, id := range ids {
		if id == coordinator {
			return ""
		}
	}
	return "GROUP_COORDINATOR_NOT_MEMBER"
}
func Targets(members []string, coordinator string, requested []string) ([]string, string) {
	if len(requested) == 0 {
		return []string{coordinator}, ""
	}
	if len(requested) > MaxTargets {
		return nil, "INVALID_GROUP_TARGETS"
	}
	present := map[string]bool{}
	for _, id := range members {
		present[id] = true
	}
	seen := map[string]bool{}
	for _, id := range requested {
		if id == "" || seen[id] {
			return nil, "INVALID_GROUP_TARGETS"
		}
		if !present[id] {
			return nil, "GROUP_TARGET_NOT_MEMBER"
		}
		seen[id] = true
	}
	return append([]string{}, requested...), ""
}
