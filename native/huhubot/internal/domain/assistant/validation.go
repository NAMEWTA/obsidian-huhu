// Package assistant holds configuration invariants without storage or transport.
package assistant

import (
	"net/url"
	"strings"
	"unicode/utf8"
)

type Draft struct {
	Name, Description, Persona                string
	AllowedTools, AllowedCollaborationTargets []string
	Model                                     *Model
}
type Model struct {
	ModelID, ProviderID, Endpoint, Protocol, CredentialRef string
	Capabilities                                           []string
}

func ValidateDraft(d Draft) string {
	if !utf8.ValidString(d.Name) || !utf8.ValidString(d.Description) || !utf8.ValidString(d.Persona) || strings.TrimSpace(d.Name) == "" || utf8.RuneCountInString(d.Name) > 128 || len(d.Description) > 8192 || len(d.Persona) > 131072 {
		return "INVALID_AGENT_DRAFT"
	}
	if len(d.AllowedTools) > 128 || len(d.AllowedCollaborationTargets) > 128 {
		return "INVALID_AGENT_PERMISSIONS"
	}
	for _, list := range [][]string{d.AllowedTools, d.AllowedCollaborationTargets} {
		seen := map[string]bool{}
		for _, v := range list {
			if v == "" || len(v) > 256 || seen[v] {
				return "INVALID_AGENT_PERMISSIONS"
			}
			seen[v] = true
		}
	}
	if d.Model != nil {
		return ValidateModel(*d.Model)
	}
	return ""
}
func ValidateModel(m Model) string {
	// Empty fields are a saved draft, never an excuse to infer an ambient model.
	for _, v := range m.Capabilities {
		if v == "" || len(v) > 256 {
			return "INVALID_MODEL_CAPABILITIES"
		}
	}
	if len(m.ModelID) > 256 || len(m.ProviderID) > 128 || len(m.Endpoint) > 2048 || len(m.Capabilities) > 64 {
		return "INVALID_MODEL_DRAFT"
	}
	switch m.Protocol {
	case "openai-chat-completions", "openai-responses", "anthropic-messages":
	default:
		return "INVALID_MODEL_PROTOCOL"
	}
	if m.Endpoint != "" {
		u, e := url.Parse(m.Endpoint)
		if e != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") || u.User != nil || u.Fragment != "" || u.RawQuery != "" {
			return "INVALID_MODEL_ENDPOINT"
		}
	}
	if m.CredentialRef != "" && !ValidCredentialRef(m.CredentialRef) {
		return "CREDENTIAL_REF_INVALID"
	}
	return ""
}
func ValidCredentialRef(s string) bool {
	if len(s) != 43 || !strings.HasPrefix(s, "credential:") {
		return false
	}
	for _, c := range s[11:] {
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}
