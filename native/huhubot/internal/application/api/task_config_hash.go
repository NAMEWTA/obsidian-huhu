package api

import (
	"crypto/sha256"
	"encoding/hex"
	"strconv"
)

// CanonicalTaskConfigHash v1 uses u32be UTF-8 byte length followed by bytes for
// each field in order. Omitted optional lists equal empty lists; order is kept.
// Omitted model has a distinct presence marker. No endpoint normalization or
// ambient defaults are used; opaque credential references are included as data.
func CanonicalTaskConfigHash(d TaskConfigDraft) string {
	fields := []string{"huhu-task-config-v1", d.SponsorAgentID, d.Draft.Name, d.Draft.Description, d.Draft.Persona}
	list := func(values []string) {
		fields = append(fields, strconv.Itoa(len(values)))
		fields = append(fields, values...)
	}
	list(d.Draft.AllowedTools)
	list(d.Draft.AllowedCollaborationTargets)
	if d.Draft.Model == nil {
		fields = append(fields, "0")
	} else {
		m := d.Draft.Model
		fields = append(fields, "1", m.ModelID, m.ProviderID, m.Protocol, m.Endpoint, m.CredentialRef)
		list(m.Capabilities)
	}
	h := sha256.New()
	for _, v := range fields {
		writeFingerprintField(h, v)
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil))
}
