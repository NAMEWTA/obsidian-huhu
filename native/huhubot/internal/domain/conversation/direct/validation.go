package direct

import (
	"strings"
	"unicode/utf8"
)

func Validate(kind, title string, members []string) string {
	if kind != "direct" {
		return "SESSION_KIND_NOT_ASSEMBLED"
	}
	if !utf8.ValidString(title) || utf8.RuneCountInString(title) > 256 {
		return "INVALID_SESSION_TITLE"
	}
	if len(members) != 1 || strings.TrimSpace(members[0]) == "" {
		return "DIRECT_AGENT_REQUIRED"
	}
	return ""
}
