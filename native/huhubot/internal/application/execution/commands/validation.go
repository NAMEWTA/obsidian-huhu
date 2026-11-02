package commands

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"strconv"
)

func Positive(v string) bool {
	n, e := strconv.ParseInt(v, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == v
}
func Validate(id api.RequestIdentity, m api.CommandMeta, cas bool) error {
	if !id.Valid() {
		return api.Denied("IDENTITY_REQUIRED")
	}
	if m.ProfileID == "" || m.CommandID == "" || len(m.CommandID) > 128 || m.IdempotencyKey == "" || len(m.IdempotencyKey) > 128 || !Positive(m.CommandEpoch) || (cas && !Positive(m.ExpectedRevision)) {
		return api.Invalid("INVALID_COMMAND_META")
	}
	return nil
}

// Transport command IDs identify attempts; the persisted intent key is separate.
func Hash(v any) string {
	b, _ := json.Marshal(v)
	var obj map[string]json.RawMessage
	_ = json.Unmarshal(b, &obj)
	delete(obj, "commandId")
	b, _ = json.Marshal(obj)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
