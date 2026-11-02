package responses

import (
	"encoding/json"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/cloudwego/eino/schema"
)

func arrayField(object map[string]json.RawMessage, key string, required bool) ([]json.RawMessage, bool) {
	raw, present := object[key]
	if !present {
		return nil, !required
	}
	var values []json.RawMessage
	if len(raw) == 0 || raw[0] != '[' || json.Unmarshal(raw, &values) != nil {
		return nil, false
	}
	return values, true
}

func optionalEnum(object map[string]json.RawMessage, key string, nullable bool, values ...string) bool {
	raw, present := object[key]
	if !present || nullable && string(raw) == "null" {
		return true
	}
	value, ok := stringField(object, key)
	if !ok {
		return false
	}
	for _, allowed := range values {
		if value == allowed {
			return true
		}
	}
	return false
}

// Caller is execution context, not opaque metadata. Only the direct flat
// function namespace actually advertised by this driver may invoke HUHU tools.
func directFunction(item map[string]json.RawMessage) bool {
	if !optionalEnum(item, "namespace", false, "") {
		return false
	}
	raw, present := item["caller"]
	if !present || string(raw) == "null" {
		return true
	}
	caller, err := readObject(raw, common.MaxEventBytes)
	kind, ok := stringField(caller, "type")
	return err == nil && onlyKeys(caller, "type") && ok && kind == "direct"
}

func textPart(raw json.RawMessage, kind string) (string, error) {
	part, err := readObject(raw, common.MaxEventBytes)
	typeName, typeOK := stringField(part, "type")
	text, textOK := stringField(part, "text")
	keys := []string{"type", "text"}
	if kind == "output_text" {
		keys = append(keys, "annotations", "logprobs")
	}
	if err != nil || !typeOK || typeName != kind || !textOK || !onlyKeys(part, keys...) {
		return "", common.Fault("MODEL_STREAM_INVALID")
	}
	for _, key := range []string{"annotations", "logprobs"} {
		if _, ok := arrayField(part, key, false); !ok {
			return "", common.Fault("MODEL_STREAM_INVALID")
		}
	}
	return text, nil
}

func validateItem(raw json.RawMessage, final bool) (map[string]json.RawMessage, error) {
	status := "in_progress"
	if final {
		status = "completed"
	}
	return validateItemStatus(raw, final, status)
}

func validateItemStatus(raw json.RawMessage, final bool, status string) (map[string]json.RawMessage, error) {
	item, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		return nil, err
	}
	id, idOK := stringField(item, "id")
	kind, kindOK := stringField(item, "type")
	if !idOK || id == "" || !kindOK {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	switch kind {
	case "message":
		role, roleOK := stringField(item, "role")
		actual, statusOK := stringField(item, "status")
		parts, partsOK := arrayField(item, "content", true)
		if !onlyKeys(item, "id", "type", "role", "status", "content", "phase") || !roleOK || role != "assistant" || !statusOK || actual != status || !partsOK || !optionalEnum(item, "phase", true, "commentary", "final_answer") || !final && len(parts) != 0 {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
		for _, part := range parts {
			if _, err := textPart(part, "output_text"); err != nil {
				return nil, err
			}
		}
	case "function_call":
		callID, callOK := stringField(item, "call_id")
		name, nameOK := stringField(item, "name")
		arguments, argsOK := stringField(item, "arguments")
		if !onlyKeys(item, "id", "type", "call_id", "name", "arguments", "status", "caller", "namespace") || !callOK || callID == "" || !nameOK || name == "" || !argsOK || len(arguments) > common.MaxArgumentBytes || !optionalEnum(item, "status", false, status) || !directFunction(item) || !final && arguments != "" {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
	case "reasoning":
		if !onlyKeys(item, "id", "type", "summary", "content", "encrypted_content", "status") || !optionalEnum(item, "status", false, status) {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
		if encrypted, present := item["encrypted_content"]; present && string(encrypted) != "null" {
			if _, ok := stringField(item, "encrypted_content"); !ok {
				return nil, common.Fault("MODEL_STREAM_INVALID")
			}
		}
		for _, field := range []struct {
			key, kind string
			required  bool
		}{{"summary", "summary_text", true}, {"content", "reasoning_text", false}} {
			parts, ok := arrayField(item, field.key, field.required)
			if !ok || !final && len(parts) != 0 {
				return nil, common.Fault("MODEL_STREAM_INVALID")
			}
			for _, part := range parts {
				if _, err := textPart(part, field.kind); err != nil {
					return nil, err
				}
			}
		}
	default:
		// Hosted/program/custom execution has no registered HUHU authority.
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	return item, nil
}

func projectItems(items []savedItem) (*schema.Message, error) {
	if len(items) == 0 || len(items) > 2048 {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	var text strings.Builder
	var calls []schema.ToolCall
	ids, callIDs := map[string]bool{}, map[string]bool{}
	for i, saved := range items {
		item, err := validateItem(json.RawMessage(saved.Raw), true)
		if err != nil || saved.OutputIndex != i {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
		id, _ := stringField(item, "id")
		kind, _ := stringField(item, "type")
		if ids[id] {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
		ids[id] = true
		switch kind {
		case "message":
			parts, _ := arrayField(item, "content", true)
			for _, part := range parts {
				value, _ := textPart(part, "output_text")
				if text.Len()+len(value) > common.MaxTextBytes {
					return nil, common.Fault("MODEL_TEXT_LIMIT")
				}
				text.WriteString(value)
			}
		case "function_call":
			callID, _ := stringField(item, "call_id")
			name, _ := stringField(item, "name")
			arguments, _ := stringField(item, "arguments")
			if callIDs[callID] || len(calls) >= common.MaxToolCalls {
				return nil, common.Fault("TOOL_CALL_ID_INVALID")
			}
			callIDs[callID] = true
			index := len(calls)
			calls = append(calls, schema.ToolCall{Index: &index, ID: callID, Type: "function", Function: schema.FunctionCall{Name: name, Arguments: arguments}})
		}
	}
	return schema.AssistantMessage(text.String(), calls), nil
}
