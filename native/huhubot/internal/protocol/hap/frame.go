// Package hap owns wire DTOs and bounded JSON framing. Application never imports it.
package hap

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"
)

const ProtocolVersion = "0.1"

var BuildVersion = "0.1.0-dev"

const SchemaVersion = 1
const MaxFrameBytes = 1048576
const MaxBatchItems = 8
const MaxIdentifierBytes = 128
const JSONKind byte = 1

type ErrorData struct {
	Kind          string          `json:"kind"`
	Reason        string          `json:"reason"`
	Retryable     bool            `json:"retryable"`
	CorrelationID string          `json:"correlationId"`
	Details       json.RawMessage `json:"details,omitempty"`
}
type RPCError struct {
	Code    int       `json:"code"`
	Message string    `json:"message"`
	Data    ErrorData `json:"data"`
}
type Envelope struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      *string         `json:"id,omitempty"`
	Method  string          `json:"method,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *RPCError       `json:"error,omitempty"`
}
type ProtocolError struct{ Reason string }

func (e *ProtocolError) Error() string { return "HAP: " + e.Reason }

var errorKinds = map[string]bool{"INVALID_ARGUMENT": true, "NOT_FOUND": true, "CONFLICT": true, "SESSION_BUSY": true, "RUN_TERMINAL": true, "IDEMPOTENCY_CONFLICT": true, "CAPABILITY_DENIED": true, "APPROVAL_EXPIRED": true, "HOST_UNAVAILABLE": true, "SOURCE_CHANGED": true, "UNSAVED_EDITOR_CHANGES": true, "MODEL_UNAVAILABLE": true, "RESOURCE_LIMIT": true, "UNKNOWN_EFFECT": true, "RECOVERY_BLOCKED": true, "INSTANCE_CONFLICT": true, "PROTOCOL_INCOMPATIBLE": true, "CURSOR_EXPIRED": true, "STREAM_SLOW_CONSUMER": true}

func invalid(reason string) error { return &ProtocolError{Reason: reason} }

// ReadFrame does not allocate an untrusted body until the prefix passes the cap.
// A clean boundary EOF is the sole non-protocol-error EOF.
func ReadFrame(r io.Reader) ([]Envelope, bool, error) {
	var prefix [4]byte
	n, err := io.ReadFull(r, prefix[:])
	if err != nil {
		if n == 0 && errors.Is(err, io.EOF) {
			return nil, false, io.EOF
		}
		return nil, false, invalid("TRUNCATED_FRAME")
	}
	size := binary.BigEndian.Uint32(prefix[:])
	if size < 1 {
		return nil, false, invalid("FRAME_EMPTY")
	}
	if size > MaxFrameBytes {
		return nil, false, invalid("FRAME_TOO_LARGE")
	}
	body := make([]byte, int(size))
	if _, err = io.ReadFull(r, body); err != nil {
		return nil, false, invalid("TRUNCATED_FRAME")
	}
	if body[0] != JSONKind {
		return nil, false, invalid("UNKNOWN_KIND")
	}
	if !utf8.Valid(body[1:]) {
		return nil, false, invalid("INVALID_UTF8")
	}
	return DecodePayload(body[1:])
}
func DecodePayload(payload []byte) ([]Envelope, bool, error) {
	p := bytes.TrimSpace(payload)
	if len(p) == 0 || !json.Valid(p) {
		return nil, false, invalid("INVALID_JSON")
	}
	batch := p[0] == '['
	var entries []json.RawMessage
	if batch {
		if err := json.Unmarshal(p, &entries); err != nil {
			return nil, false, invalid("INVALID_ENVELOPE")
		}
		if len(entries) < 1 || len(entries) > MaxBatchItems {
			return nil, false, invalid("BATCH_LIMIT")
		}
	} else {
		entries = []json.RawMessage{p}
	}
	result := make([]Envelope, 0, len(entries))
	for _, entry := range entries {
		e, err := decodeEnvelope(entry)
		if err != nil {
			return nil, false, err
		}
		result = append(result, e)
	}
	return result, batch, nil
}
func decodeEnvelope(p []byte) (Envelope, error) {
	var e Envelope
	if len(p) == 0 || p[0] != '{' {
		return e, invalid("INVALID_ENVELOPE")
	}
	decoder := json.NewDecoder(bytes.NewReader(p))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&e); err != nil {
		return e, invalid("INVALID_ENVELOPE")
	}
	if e.JSONRPC != "2.0" {
		return e, invalid("INVALID_ENVELOPE")
	}

	var keys map[string]json.RawMessage
	if err := json.Unmarshal(p, &keys); err != nil {
		return e, invalid("INVALID_ENVELOPE")
	}
	if e.ID != nil && (!ValidID(*e.ID, "c:") && !ValidID(*e.ID, "s:")) {
		return e, invalid("INVALID_ID")
	}
	_, hasID := keys["id"]
	_, hasResult := keys["result"]
	_, hasError := keys["error"]
	_, hasMethod := keys["method"]
	_, hasParams := keys["params"]
	if hasMethod {
		if len(e.Method) == 0 || len(e.Method) > MaxIdentifierBytes || hasResult || hasError || (hasID && e.ID == nil) {
			return e, invalid("INVALID_ENVELOPE")
		}
		if hasParams && (len(e.Params) == 0 || bytes.TrimSpace(e.Params)[0] != '{') {
			return e, invalid("INVALID_PARAMS")
		}
	} else {
		if !hasID || hasParams || hasResult == hasError || (hasError && (e.Error == nil || e.Error.Data.Kind == "" || e.Error.Data.Reason == "" || e.Error.Data.CorrelationID == "")) {
			return e, invalid("INVALID_ENVELOPE")
		}
		if hasError {
			if !errorKinds[e.Error.Data.Kind] {
				return e, invalid("INVALID_ERROR")
			}
			var shape struct {
				Code    *int    `json:"code"`
				Message *string `json:"message"`
				Data    struct {
					Retryable *bool `json:"retryable"`
				} `json:"data"`
			}
			if json.Unmarshal(keys["error"], &shape) != nil || shape.Code == nil || shape.Message == nil || shape.Data.Retryable == nil {
				return e, invalid("INVALID_ERROR")
			}
		}
		// id:null is reserved for errors which cannot identify the malformed request.
		if e.ID == nil && !hasError {
			return e, invalid("INVALID_ID")
		}
	}
	if ValidateEnvelope(p) != nil {
		return e, invalid("INVALID_ENVELOPE")
	}
	return e, nil
}
func ValidID(id, prefix string) bool {
	return strings.HasPrefix(id, prefix) && len(id) > len(prefix) && len(id) <= MaxIdentifierBytes
}
func WriteFrame(w io.Writer, payload any) error {
	p, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if len(p)+1 > MaxFrameBytes {
		return invalid("FRAME_TOO_LARGE")
	}
	b := make([]byte, len(p)+5)
	binary.BigEndian.PutUint32(b, uint32(len(p)+1))
	b[4] = JSONKind
	copy(b[5:], p)
	n, err := io.Copy(w, bytes.NewReader(b))
	if err == nil && n != int64(len(b)) {
		return io.ErrShortWrite
	}
	return err
}
func DecodeParams[T any](p json.RawMessage) (T, error) {
	var out T
	if len(p) == 0 {
		p = []byte(`{}`)
	}
	d := json.NewDecoder(bytes.NewReader(p))
	d.DisallowUnknownFields()
	if err := d.Decode(&out); err != nil {
		return out, fmt.Errorf("invalid parameters")
	}
	return out, nil
}

func ValidDecimalOrEmpty(s string) bool {
	if s == "" {
		return true
	}
	if len(s) > 1 && s[0] == '0' {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
