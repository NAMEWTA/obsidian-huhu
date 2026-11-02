package anthropic

import (
	"encoding/json"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/httpcall"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

const maxBlocks = 2048

type contentBlock struct {
	fields                                map[string]json.RawMessage
	kind, text, thinking, signature       string
	arguments                             string
	hasJSONDelta, hasSignatureDelta, done bool
}

type streamState struct {
	messageID, reason, emitted     string
	started, messageDelta, stopped bool
	providerError                  bool
	stopSequence                   *string
	blocks                         []*contentBlock
	emit                           func(string) error
	usage                          usageState
	observation                    api.AttemptObservation
	wireError                      error
}

func newStreamState(emit func(string) error) *streamState {
	return &streamState{emit: emit, observation: api.AttemptObservation{Knowledge: "unknown"}}
}

func (s *streamState) observe(event httpcall.SSEEvent) (err error) {
	defer func() {
		if err != nil {
			s.wireError = err
		}
	}()
	invalid := func() error { return common.Fault("MODEL_STREAM_INVALID") }
	object, err := readObject(event.Data, common.MaxEventBytes)
	if err != nil {
		return err
	}
	kind, ok := stringField(object, "type")
	if !ok || event.Event != kind {
		return invalid()
	}
	if kind == "ping" {
		if !onlyKeys(object, "type") {
			return invalid()
		}
		return nil
	}
	if s.stopped {
		return invalid()
	}
	if kind == "error" {
		if !onlyKeys(object, "type", "error") {
			return invalid()
		}
		failure, err := readObject(object["error"], common.MaxEventBytes)
		typeName, typeOK := stringField(failure, "type")
		_, messageOK := stringField(failure, "message")
		if err != nil || !onlyKeys(failure, "type", "message") || !typeOK || typeName == "" || !messageOK {
			return invalid()
		}
		// An explicit provider failure is a terminal observation, separate
		// from malformed raw input. Never expose its message or return it as
		// an observer error (which correctly taints untrusted wire usage).
		s.stopped, s.providerError = true, true
		if s.started && s.messageDelta && s.allBlocksStopped() {
			s.observation = s.usage.observation()
		}
		return nil
	}
	if kind == "message_start" {
		if s.started || !onlyKeys(object, "type", "message") {
			return invalid()
		}
		message, err := readObject(object["message"], common.MaxEventBytes)
		if err != nil || !onlyKeys(message, "id", "type", "role", "model", "content", "stop_reason", "stop_sequence", "usage", "container", "stop_details") {
			return invalid()
		}
		id, idOK := stringField(message, "id")
		model, modelOK := stringField(message, "model")
		typeName, typeOK := stringField(message, "type")
		role, roleOK := stringField(message, "role")
		var content []json.RawMessage
		if !idOK || id == "" || !modelOK || model == "" || !typeOK || typeName != "message" || !roleOK || role != "assistant" || string(message["content"]) == "null" || json.Unmarshal(message["content"], &content) != nil || len(content) != 0 || string(message["stop_reason"]) != "null" || !absentOrNull(message, "stop_sequence") || !absentOrNull(message, "container") || !absentOrNull(message, "stop_details") {
			return invalid()
		}
		s.started, s.messageID = true, id
		s.usage.update(message["usage"], false)
		return nil
	}
	if !s.started {
		return invalid()
	}
	switch kind {
	case "message_delta":
		if !onlyKeys(object, "type", "delta", "usage") || !s.allBlocksStopped() {
			return invalid()
		}
		delta, err := readObject(object["delta"], common.MaxEventBytes)
		if err != nil || !onlyKeys(delta, "stop_reason", "stop_sequence", "container", "stop_details") || !absentOrNull(delta, "container") {
			return invalid()
		}
		if !absentOrNull(delta, "stop_reason") {
			reason, ok := stringField(delta, "stop_reason")
			if !ok || reason == "" || (s.reason != "" && s.reason != reason) {
				return invalid()
			}
			s.reason = reason
		}
		if !absentOrNull(delta, "stop_sequence") {
			value, ok := stringField(delta, "stop_sequence")
			if !ok || s.reason != "stop_sequence" || (s.stopSequence != nil && *s.stopSequence != value) {
				return invalid()
			}
			s.stopSequence = &value
		} else if string(delta["stop_sequence"]) == "null" && s.stopSequence != nil {
			return invalid()
		}
		if !absentOrNull(delta, "stop_details") {
			if s.reason != "refusal" || !validRefusalDetails(delta["stop_details"]) {
				return invalid()
			}
		}
		s.messageDelta = true
		s.usage.update(object["usage"], true)
		return nil
	case "message_stop":
		if !onlyKeys(object, "type") || !s.messageDelta || s.reason == "" || !s.allBlocksStopped() || (s.reason == "stop_sequence") != (s.stopSequence != nil) {
			return invalid()
		}
		s.stopped = true
		s.observation = s.usage.observation()
		return nil
	}
	if s.messageDelta {
		return invalid()
	}
	index, ok := indexField(object, "index")
	if !ok {
		return invalid()
	}
	if kind == "content_block_start" {
		if !onlyKeys(object, "type", "index", "content_block") || index != len(s.blocks) || index >= maxBlocks {
			return invalid()
		}
		fields, err := validateBlock(object["content_block"], false)
		if err != nil {
			return err
		}
		kind, _ := stringField(fields, "type")
		text, _ := stringField(fields, "text")
		thinking, _ := stringField(fields, "thinking")
		signature, _ := stringField(fields, "signature")
		s.blocks = append(s.blocks, &contentBlock{fields: fields, kind: kind, text: text, thinking: thinking, signature: signature})
		return s.flushText()
	}
	if index >= len(s.blocks) || s.blocks[index].done {
		return invalid()
	}
	block := s.blocks[index]
	switch kind {
	case "content_block_delta":
		if !onlyKeys(object, "type", "index", "delta") {
			return invalid()
		}
		if err := block.applyDelta(object["delta"]); err != nil {
			return err
		}
		return s.flushText()
	case "content_block_stop":
		if !onlyKeys(object, "type", "index") {
			return invalid()
		}
		block.done = true
		switch block.kind {
		case "text":
			block.fields["text"], _ = json.Marshal(block.text)
		case "thinking":
			block.fields["thinking"], _ = json.Marshal(block.thinking)
			if _, present := block.fields["signature"]; present || block.hasSignatureDelta {
				block.fields["signature"], _ = json.Marshal(block.signature)
			}
		case "tool_use":
			if block.hasJSONDelta {
				block.fields["input"] = json.RawMessage(block.arguments)
			}
		}
		return s.flushText()
	default:
		return invalid()
	}
}

func validRefusalDetails(raw []byte) bool {
	details, err := readObject(raw, common.MaxEventBytes)
	kind, kindOK := stringField(details, "type")
	category, categoryOK := stringField(details, "category")
	if err != nil || !onlyKeys(details, "type", "category", "explanation") || !kindOK || kind != "refusal" || !categoryOK {
		return false
	}
	switch category {
	case "cyber", "bio", "frontier_llm", "reasoning_extraction":
	default:
		return false
	}
	if explanation, exists := details["explanation"]; !exists {
		return false
	} else if string(explanation) != "null" {
		if _, ok := stringField(details, "explanation"); !ok {
			return false
		}
	}
	return true
}

func (b *contentBlock) applyDelta(raw []byte) error {
	invalid := func() error { return common.Fault("MODEL_STREAM_INVALID") }
	delta, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		return err
	}
	kind, ok := stringField(delta, "type")
	if !ok {
		return invalid()
	}
	appendValue := func(key string, target *string, limit int) error {
		value, ok := stringField(delta, key)
		if !ok || !onlyKeys(delta, "type", key) {
			return invalid()
		}
		if len(*target)+len(value) > limit {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		*target += value
		return nil
	}
	switch kind {
	case "text_delta":
		if b.kind != "text" {
			return invalid()
		}
		return appendValue("text", &b.text, common.MaxTextBytes)
	case "thinking_delta":
		if b.kind != "thinking" || b.hasSignatureDelta {
			return invalid()
		}
		return appendValue("thinking", &b.thinking, common.MaxResponseBytes)
	case "signature_delta":
		if b.kind != "thinking" {
			return invalid()
		}
		b.hasSignatureDelta = true
		return appendValue("signature", &b.signature, common.MaxResponseBytes)
	case "input_json_delta":
		if b.kind != "tool_use" {
			return invalid()
		}
		value, ok := stringField(delta, "partial_json")
		if !ok || !onlyKeys(delta, "type", "partial_json") {
			return invalid()
		}
		if value == "" {
			return nil
		}
		if !b.hasJSONDelta {
			input, err := readObject(b.fields["input"], common.MaxArgumentBytes)
			if err != nil || len(input) != 0 {
				return invalid()
			}
			b.hasJSONDelta = true
		}
		if len(b.arguments)+len(value) > common.MaxArgumentBytes {
			return invalid()
		}
		b.arguments += value
		return nil
	default:
		return invalid()
	}
}

func validateBlock(raw []byte, complete bool) (map[string]json.RawMessage, error) {
	invalid := func() (map[string]json.RawMessage, error) { return nil, common.Fault("MODEL_STREAM_INVALID") }
	object, err := readObject(raw, common.MaxResponseBytes)
	if err != nil {
		return nil, err
	}
	kind, ok := stringField(object, "type")
	if !ok {
		return invalid()
	}
	switch kind {
	case "text":
		return validateTextBlock(raw)
	case "thinking":
		if !onlyKeys(object, "type", "thinking", "signature") {
			return invalid()
		}
		if _, ok := stringField(object, "thinking"); !ok {
			return invalid()
		}
		signature, signatureOK := stringField(object, "signature")
		_, present := object["signature"]
		if (present && !signatureOK) || (complete && (!signatureOK || signature == "")) {
			return invalid()
		}
	case "redacted_thinking":
		data, ok := stringField(object, "data")
		if !onlyKeys(object, "type", "data") || !ok || data == "" {
			return invalid()
		}
	case "tool_use":
		id, idOK := stringField(object, "id")
		name, nameOK := stringField(object, "name")
		if !onlyKeys(object, "type", "id", "name", "input", "caller") || !idOK || id == "" || len(id) > 256 || !nameOK || name == "" {
			return invalid()
		}
		if _, err := readObject(object["input"], common.MaxArgumentBytes); err != nil {
			return invalid()
		}
		if rawCaller, present := object["caller"]; present {
			caller, err := readObject(rawCaller, common.MaxEventBytes)
			callerType, ok := stringField(caller, "type")
			if err != nil || !onlyKeys(caller, "type") || !ok || callerType != "direct" {
				return invalid()
			}
		}
	default:
		return invalid()
	}
	return object, nil
}

func validateTextBlock(raw []byte) (map[string]json.RawMessage, error) {
	object, err := readObject(raw, common.MaxResponseBytes)
	kind, kindOK := stringField(object, "type")
	text, textOK := stringField(object, "text")
	if err != nil || !onlyKeys(object, "type", "text", "citations") || !kindOK || kind != "text" || !textOK || len(text) > common.MaxTextBytes {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	if value, ok := object["citations"]; ok && string(value) != "null" {
		var citations []json.RawMessage
		if json.Unmarshal(value, &citations) != nil || len(citations) != 0 {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
	}
	return object, nil
}

func (s *streamState) allBlocksStopped() bool {
	for _, block := range s.blocks {
		if !block.done {
			return false
		}
	}
	return true
}

func (s *streamState) flushText() error {
	var text strings.Builder
	for _, block := range s.blocks {
		if block.kind == "text" {
			text.WriteString(block.text)
		}
		if text.Len() > common.MaxTextBytes {
			return common.Fault("MODEL_TEXT_LIMIT")
		}
		if !block.done {
			break
		}
	}
	current := text.String()
	if !strings.HasPrefix(current, s.emitted) {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if len(current) > len(s.emitted) && s.emit != nil {
		if err := s.emit(current[len(s.emitted):]); err != nil {
			return err
		}
	}
	s.emitted = current
	return nil
}

func (s *streamState) finish() (*schema.Message, savedRound, error) {
	round := savedRound{MessageID: s.messageID, StopReason: s.reason, StopSequence: s.stopSequence}
	if s.providerError {
		return nil, round, common.Fault("MODEL_STREAM_FAILED")
	}
	if !s.started || !s.stopped || !s.allBlocksStopped() {
		return nil, round, common.Fault("MODEL_STREAM_INCOMPLETE")
	}
	switch s.reason {
	case "end_turn", "tool_use", "stop_sequence":
	case "max_tokens":
		return nil, round, common.Fault("MODEL_OUTPUT_TRUNCATED")
	case "refusal":
		return nil, round, common.Fault("MODEL_REFUSED")
	default:
		return nil, round, common.Fault("MODEL_FINISH_UNKNOWN")
	}
	for index, block := range s.blocks {
		raw, err := json.Marshal(block.fields)
		if err != nil {
			return nil, round, common.Fault("MODEL_STREAM_INVALID")
		}
		round.Blocks = append(round.Blocks, savedBlock{Index: index, Raw: string(raw)})
	}
	message, err := projectBlocks(round.Blocks)
	if err != nil || message.Content != s.emitted {
		return nil, round, common.Fault("MODEL_STREAM_INVALID")
	}
	if (s.reason == "tool_use") != (len(message.ToolCalls) > 0) {
		return nil, round, common.Fault("MODEL_STREAM_INVALID")
	}
	return message, round, nil
}

func projectBlocks(blocks []savedBlock) (*schema.Message, error) {
	if len(blocks) > maxBlocks {
		return nil, common.Fault("MODEL_STREAM_INVALID")
	}
	var text strings.Builder
	var calls []schema.ToolCall
	ids := map[string]bool{}
	for i, block := range blocks {
		if block.Index != i {
			return nil, common.Fault("MODEL_STREAM_INVALID")
		}
		fields, err := validateBlock([]byte(block.Raw), true)
		if err != nil {
			return nil, err
		}
		kind, _ := stringField(fields, "type")
		switch kind {
		case "text":
			value, _ := stringField(fields, "text")
			text.WriteString(value)
			if text.Len() > common.MaxTextBytes {
				return nil, common.Fault("MODEL_TEXT_LIMIT")
			}
		case "tool_use":
			id, _ := stringField(fields, "id")
			name, _ := stringField(fields, "name")
			if ids[id] || len(calls) >= common.MaxToolCalls {
				return nil, common.Fault("TOOL_CALL_ID_INVALID")
			}
			ids[id] = true
			index := len(calls)
			calls = append(calls, schema.ToolCall{Index: &index, ID: id, Type: "function", Function: schema.FunctionCall{Name: name, Arguments: string(fields["input"])}})
		}
	}
	return schema.AssistantMessage(text.String(), calls), nil
}
