package anthropic

import (
	"encoding/json"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
)

func readObject(raw []byte, limit int) (map[string]json.RawMessage, error) {
	var object map[string]json.RawMessage
	if common.StrictJSON(raw, limit) != nil || json.Unmarshal(raw, &object) != nil || object == nil {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	return object, nil
}

func onlyKeys(object map[string]json.RawMessage, keys ...string) bool {
	for key := range object {
		found := false
		for _, allowed := range keys {
			found = found || key == allowed
		}
		if !found {
			return false
		}
	}
	return true
}

func stringField(object map[string]json.RawMessage, key string) (string, bool) {
	raw, ok := object[key]
	var value string
	if !ok || len(raw) == 0 || raw[0] != '"' || json.Unmarshal(raw, &value) != nil || !utf8.ValidString(value) {
		return "", false
	}
	return value, true
}

func indexField(object map[string]json.RawMessage, key string) (int, bool) {
	var value int
	raw, ok := object[key]
	if !ok || string(raw) == "null" || json.Unmarshal(raw, &value) != nil || value < 0 {
		return 0, false
	}
	return value, true
}

func absentOrNull(object map[string]json.RawMessage, key string) bool {
	raw, ok := object[key]
	return !ok || string(raw) == "null"
}
