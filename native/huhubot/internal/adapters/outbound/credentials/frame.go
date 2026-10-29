// Package credentials owns protected OS storage and the managed private pipe.
package credentials

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"unicode/utf8"
)

const (
	MaxBodyBytes     = 16384
	MaxMetadataBytes = 2048
	MaxSecretBytes   = 2048
)

type metadata struct {
	RequestID         string `json:"requestId"`
	ProfileID         string `json:"profileId"`
	CredentialRef     string `json:"credentialRef,omitempty"`
	StoragePreference string `json:"storagePreference,omitempty"`
}
type request struct {
	op     byte
	meta   metadata
	secret []byte
}

var errProtocol = errors.New("CREDENTIAL_CHANNEL_REJECTED")

func readRequest(r io.Reader) (request, error) {
	var header [8]byte
	if err := readFullWaiting(r, header[:4]); err != nil {
		if errors.Is(err, io.EOF) {
			return request{}, io.EOF
		}
		return request{}, errProtocol
	}
	n := int(binary.BigEndian.Uint32(header[:4]))
	if n < 4 || n > MaxBodyBytes {
		return request{}, errProtocol
	}
	if err := readFullWaiting(r, header[4:]); err != nil {
		return request{}, errProtocol
	}
	ml := int(binary.BigEndian.Uint16(header[6:]))
	op := header[5]
	if header[4] != 1 || op > 3 || ml == 0 || ml > MaxMetadataBytes || ml > n-4 || n-4-ml > MaxSecretBytes {
		return request{}, errProtocol
	}
	body := make([]byte, n-4)
	if err := readFullWaiting(r, body); err != nil {
		wipe(body)
		return request{}, errProtocol
	}
	m, err := decodeMetadata(body[:ml], op)
	if err != nil || (op == 1 && len(body) == ml) || (op != 1 && len(body) != ml) {
		wipe(body)
		return request{}, errProtocol
	}
	return request{op: op, meta: m, secret: body[ml:]}, nil
}
func decodeMetadata(p []byte, op byte) (metadata, error) {
	var m metadata
	if !utf8.Valid(p) {
		return m, errProtocol
	}
	d := json.NewDecoder(bytes.NewReader(p))
	token, err := d.Token()
	if err != nil || token != json.Delim('{') {
		return m, errProtocol
	}
	seen := map[string]bool{}
	for d.More() {
		k, err := d.Token()
		if err != nil {
			return m, errProtocol
		}
		key, ok := k.(string)
		if !ok || seen[key] {
			return m, errProtocol
		}
		seen[key] = true
		v, err := d.Token()
		if err != nil {
			return m, errProtocol
		}
		s, ok := v.(string)
		if !ok {
			return m, errProtocol
		}
		switch key {
		case "requestId":
			m.RequestID = s
		case "profileId":
			m.ProfileID = s
		case "credentialRef":
			m.CredentialRef = s
		case "storagePreference":
			m.StoragePreference = s
		default:
			return m, errProtocol
		}
	}
	if tok, err := d.Token(); err != nil || tok != json.Delim('}') {
		return m, errProtocol
	}
	if _, err = d.Token(); err != io.EOF {
		return m, errProtocol
	}
	if !validID(m.RequestID, "request:") || !validProfile(m.ProfileID) {
		return m, errProtocol
	}
	if op == 0 {
		if len(seen) != 2 {
			return m, errProtocol
		}
		return m, nil
	}
	if !validID(m.CredentialRef, "credential:") {
		return m, errProtocol
	}
	if op == 1 {
		if len(seen) != 4 || (m.StoragePreference != "protected" && m.StoragePreference != "session-memory") {
			return m, errProtocol
		}
	} else if len(seen) != 3 {
		return m, errProtocol
	}
	return m, nil
}
func validID(s, prefix string) bool {
	if !strings.HasPrefix(s, prefix) || len(s) != len(prefix)+32 {
		return false
	}
	for _, c := range s[len(prefix):] {
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}
func validProfile(s string) bool {
	if len(s) == 0 || len(s) > 256 {
		return false
	}
	for _, c := range []byte(s) {
		if c < 33 || c > 126 {
			return false
		}
	}
	return true
}
func wipe(p []byte) {
	for i := range p {
		p[i] = 0
	}
}
