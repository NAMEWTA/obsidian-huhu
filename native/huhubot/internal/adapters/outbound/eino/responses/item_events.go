package responses

import (
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
)

func (item *outputItem) complete(raw json.RawMessage) error {
	value, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		return err
	}
	status, _ := stringField(value, "status")
	incomplete := status == "incomplete"
	if !incomplete {
		status = "completed"
	}
	final, err := validateItemStatus(raw, true, status)
	if err != nil {
		return err
	}
	id, _ := stringField(final, "id")
	kind, _ := stringField(final, "type")
	if id != item.id || kind != item.kind {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	switch kind {
	case "function_call":
		callID, _ := stringField(final, "call_id")
		name, _ := stringField(final, "name")
		arguments, _ := stringField(final, "arguments")
		if !incomplete && !item.argumentsDone || callID != item.callID || name != item.name || arguments != item.arguments {
			return common.Fault("MODEL_STREAM_INVALID")
		}
	case "message":
		if err := completedParts(final, "content", "output_text", item.parts, true, !incomplete); err != nil {
			return err
		}
	case "reasoning":
		// Some models expose only the final reasoning item. When deltas are
		// present they must match it; when absent the full final raw item wins.
		if err := completedParts(final, "summary", "summary_text", item.summaries, len(item.summaries) > 0, !incomplete); err != nil {
			return err
		}
		if err := completedParts(final, "content", "reasoning_text", item.reasoning, len(item.reasoning) > 0, !incomplete); err != nil {
			return err
		}
	}
	// An incomplete item can precede a real failed/incomplete terminal. Keep
	// its shape for accounting, but never admit it to a completed projection.
	item.done, item.incomplete, item.raw = true, incomplete, string(raw)
	return nil
}

func completedParts(item map[string]json.RawMessage, field, kind string, parts []*contentPart, compare, requireDone bool) error {
	if !compare {
		return nil
	}
	final, ok := arrayField(item, field, true)
	if !ok || len(final) != len(parts) {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	for i, part := range parts {
		text, err := textPart(final[i], kind)
		if err != nil || requireDone && (!part.done || part.incomplete) || text != part.text {
			return common.Fault("MODEL_STREAM_INVALID")
		}
	}
	return nil
}

func (item *outputItem) functionEvent(kind string, event map[string]json.RawMessage) error {
	if item.argumentsDone {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	switch kind {
	case "response.function_call_arguments.delta":
		delta, ok := stringField(event, "delta")
		if !ok {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		if len(item.arguments)+len(delta) > common.MaxArgumentBytes {
			return common.Fault("TOOL_ARGUMENT_INVALID")
		}
		item.arguments += delta
	case "response.function_call_arguments.done":
		name, nameOK := stringField(event, "name")
		arguments, argsOK := stringField(event, "arguments")
		if !nameOK || name != item.name || !argsOK || arguments != item.arguments {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		item.argumentsDone = true
	default:
		return common.Fault("MODEL_STREAM_INVALID")
	}
	return nil
}

func (item *outputItem) reasoningEvent(kind string, event map[string]json.RawMessage) error {
	if kind == "response.reasoning_text.delta" || kind == "response.reasoning_text.done" {
		index, ok := indexField(event, "content_index")
		if !ok || index > len(item.reasoning) || len(item.reasoning) >= 2048 {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		if index == len(item.reasoning) {
			item.reasoning = append(item.reasoning, &contentPart{})
		}
		part := item.reasoning[index]
		if part.done {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		if kind == "response.reasoning_text.delta" {
			return appendPrivateText(part, event)
		}
		text, ok := stringField(event, "text")
		if !ok || text != part.text {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		part.textDone, part.done = true, true
		return nil
	}
	index, ok := indexField(event, "summary_index")
	if !ok {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if kind == "response.reasoning_summary_part.added" {
		text, err := textPart(event["part"], "summary_text")
		if err != nil || text != "" || index != len(item.summaries) || len(item.summaries) >= 2048 {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		item.summaries = append(item.summaries, &contentPart{})
		return nil
	}
	if index >= len(item.summaries) || item.summaries[index].done {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	part := item.summaries[index]
	switch kind {
	case "response.reasoning_summary_text.delta":
		if part.textDone {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		return appendPrivateText(part, event)
	case "response.reasoning_summary_text.done":
		text, ok := stringField(event, "text")
		if !ok || part.textDone || text != part.text {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		part.textDone = true
	case "response.reasoning_summary_part.done":
		text, err := textPart(event["part"], "summary_text")
		status, _ := stringField(event, "status")
		incomplete := status == "incomplete"
		if err != nil || !incomplete && !part.textDone || text != part.text || !optionalEnum(event, "status", false, "incomplete") {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		part.done, part.incomplete = true, incomplete
	default:
		return common.Fault("MODEL_STREAM_INVALID")
	}
	return nil
}

func appendPrivateText(part *contentPart, event map[string]json.RawMessage) error {
	delta, ok := stringField(event, "delta")
	if !ok || len(part.text)+len(delta) > common.MaxEventBytes {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	part.text += delta
	return nil
}
