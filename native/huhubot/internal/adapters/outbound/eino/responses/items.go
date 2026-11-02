package responses

import (
	"bytes"
	"encoding/json"
	"math"
	"reflect"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/httpcall"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
	sdk "github.com/openai/openai-go/v3/responses"
)

type contentPart struct {
	text       string
	textDone   bool
	done       bool
	incomplete bool
}

type outputItem struct {
	id, kind, callID, name, arguments string
	argumentsDone                     bool
	parts                             []*contentPart
	summaries                         []*contentPart
	reasoning                         []*contentPart
	raw                               string
	done                              bool
	incomplete                        bool
}

type streamState struct {
	model, responseID, terminal, reason string
	responseModel                       string
	sequence                            int
	started, progressed                 bool
	wireTerminal, wireDone              bool
	wireError                           error
	items                               []*outputItem
	emitted                             string
	emit                                func(string) error
	observation                         api.AttemptObservation
}

func newStreamState(model string, emit func(string) error) *streamState {
	return &streamState{model: model, emit: emit, sequence: -1, observation: api.AttemptObservation{Knowledge: "unknown"}}
}

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

func equivalentJSON(a, b []byte) bool {
	decode := func(raw []byte) (any, error) {
		decoder := json.NewDecoder(bytes.NewReader(raw))
		decoder.UseNumber()
		var value any
		err := decoder.Decode(&value)
		return value, err
	}
	x, errX := decode(a)
	y, errY := decode(b)
	return errX == nil && errY == nil && reflect.DeepEqual(x, y)
}

func (s *streamState) observe(event httpcall.SSEEvent) error {
	fail := func(reason string) error {
		s.wireError = common.Fault(reason)
		return s.wireError
	}
	if bytes.Equal(event.Data, []byte("[DONE]")) {
		if !s.wireTerminal || s.wireDone {
			return fail("MODEL_STREAM_INVALID")
		}
		s.wireDone = true
		return nil
	}
	object, err := readObject(event.Data, common.MaxEventBytes)
	if err != nil {
		return fail("MODEL_STREAM_INVALID")
	}
	kind, ok := stringField(object, "type")
	if !ok || (event.Event != "" && event.Event != kind) {
		return fail("MODEL_STREAM_INVALID")
	}
	if kind == "ping" {
		return nil
	}
	if s.wireTerminal || s.wireDone {
		return fail("MODEL_STREAM_INVALID")
	}
	switch kind {
	case "response.created", "response.in_progress", "response.output_item.added", "response.output_item.done",
		"response.content_part.added", "response.content_part.done", "response.output_text.delta", "response.output_text.done",
		"response.function_call_arguments.delta", "response.function_call_arguments.done",
		"response.reasoning_summary_part.added", "response.reasoning_summary_part.done",
		"response.reasoning_summary_text.delta", "response.reasoning_summary_text.done",
		"response.reasoning_text.delta", "response.reasoning_text.done":
		return nil
	case "response.completed", "response.failed", "response.incomplete", "error":
		s.wireTerminal = true
		return nil
	default:
		return fail("MODEL_STREAM_INVALID")
	}
}

func (s *streamState) consume(event sdk.ResponseStreamEventUnion) error {
	object, err := readObject([]byte(event.RawJSON()), common.MaxEventBytes)
	if err != nil {
		return err
	}
	kind, ok := stringField(object, "type")
	if !ok || kind != event.Type {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if kind == "ping" {
		return nil
	}
	sequence, ok := indexField(object, "sequence_number")
	if !ok || sequence <= s.sequence || s.terminal != "" {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	s.sequence = sequence
	switch kind {
	case "error":
		_, codeOK := stringField(object, "code")
		_, messageOK := stringField(object, "message")
		_, paramOK := stringField(object, "param")
		if !codeOK || !messageOK || !paramOK || !onlyKeys(object, "type", "sequence_number", "code", "message", "param") {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		return common.Fault("MODEL_STREAM_FAILED")
	case "response.created", "response.in_progress":
		response, err := readObject(object["response"], common.MaxEventBytes)
		if err != nil {
			return err
		}
		id, idOK := stringField(response, "id")
		model, modelOK := stringField(response, "model")
		status, statusOK := stringField(response, "status")
		var items []json.RawMessage
		if !idOK || id == "" || !modelOK || model == "" || !statusOK || status != "in_progress" || json.Unmarshal(response["output"], &items) != nil || len(items) != 0 {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		if kind == "response.created" {
			if s.started {
				return common.Fault("MODEL_STREAM_INVALID")
			}
			s.started, s.responseID, s.responseModel = true, id, model
		} else {
			if !s.started || s.progressed || id != s.responseID || model != s.responseModel {
				return common.Fault("MODEL_STREAM_INVALID")
			}
			s.progressed = true
		}
		return nil
	case "response.completed", "response.failed", "response.incomplete":
		return s.endResponse(kind, object["response"])
	}
	if !s.started {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	index, ok := indexField(object, "output_index")
	if !ok {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if kind == "response.output_item.added" {
		if index != len(s.items) || len(s.items) >= 2048 {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		item, err := validateItem(object["item"], false)
		if err != nil {
			return err
		}
		id, _ := stringField(item, "id")
		kind, _ := stringField(item, "type")
		callID, _ := stringField(item, "call_id")
		name, _ := stringField(item, "name")
		for _, prior := range s.items {
			if prior.id == id {
				return common.Fault("MODEL_STREAM_INVALID")
			}
		}
		s.items = append(s.items, &outputItem{id: id, kind: kind, callID: callID, name: name})
		return nil
	}
	if index >= len(s.items) || s.items[index].done {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	item := s.items[index]
	if kind == "response.output_item.done" {
		if err := item.complete(object["item"]); err != nil {
			return err
		}
		return s.flushText()
	}
	itemID, ok := stringField(object, "item_id")
	if !ok || itemID != item.id {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if item.kind == "function_call" {
		return item.functionEvent(kind, object)
	}
	if item.kind == "reasoning" {
		return item.reasoningEvent(kind, object)
	}
	contentIndex, indexOK := indexField(object, "content_index")
	if !ok || itemID != item.id || !indexOK {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if kind == "response.content_part.added" {
		part, err := readObject(object["part"], common.MaxEventBytes)
		typeName, typeOK := stringField(part, "type")
		text, textOK := stringField(part, "text")
		if err != nil || contentIndex != len(item.parts) || !typeOK || typeName != "output_text" || !textOK || text != "" {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		item.parts = append(item.parts, &contentPart{})
		return nil
	}
	if contentIndex >= len(item.parts) || item.parts[contentIndex].done {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	part := item.parts[contentIndex]
	switch kind {
	case "response.output_text.delta":
		delta, ok := stringField(object, "delta")
		if !ok || part.textDone || len(part.text)+len(delta) > common.MaxTextBytes {
			return common.Fault("MODEL_TEXT_LIMIT")
		}
		part.text += delta
		return s.flushText()
	case "response.output_text.done":
		text, ok := stringField(object, "text")
		if !ok || part.textDone || text != part.text {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		part.textDone = true
	case "response.content_part.done":
		final, err := readObject(object["part"], common.MaxEventBytes)
		typeName, typeOK := stringField(final, "type")
		text, textOK := stringField(final, "text")
		if err != nil || !part.textDone || !typeOK || typeName != "output_text" || !textOK || text != part.text {
			return common.Fault("MODEL_STREAM_INVALID")
		}
		part.done = true
	default:
		return common.Fault("MODEL_STREAM_INVALID")
	}
	return s.flushText()
}

// Text can arrive interleaved across items. Only release the contiguous message
// prefix; function/reasoning items do not occupy a public text position.
func (s *streamState) flushText() error {
	var prefix strings.Builder
	for _, item := range s.items {
		if item.kind != "message" {
			continue
		}
		for _, part := range item.parts {
			prefix.WriteString(part.text)
			if !part.done {
				break
			}
		}
		if !item.done || item.incomplete {
			break
		}
	}
	value := prefix.String()
	if len(value) > common.MaxTextBytes {
		return common.Fault("MODEL_TEXT_LIMIT")
	}
	if !strings.HasPrefix(value, s.emitted) {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	delta := value[len(s.emitted):]
	s.emitted = value
	if s.emit != nil && delta != "" {
		return s.emit(delta)
	}
	return nil
}

func (s *streamState) endResponse(kind string, raw json.RawMessage) error {
	response, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		return err
	}
	id, idOK := stringField(response, "id")
	model, modelOK := stringField(response, "model")
	status, statusOK := stringField(response, "status")
	if !s.started || !idOK || id != s.responseID || !modelOK || model != s.responseModel || !statusOK || kind != "response."+status {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	if status != "completed" {
		s.observation = responseUsage(response["usage"])
		s.terminal = status
		if status == "incomplete" {
			details, _ := readObject(response["incomplete_details"], common.MaxEventBytes)
			s.reason, _ = stringField(details, "reason")
		}
		return nil
	}
	var items []json.RawMessage
	if json.Unmarshal(response["output"], &items) != nil || len(items) != len(s.items) || len(items) == 0 {
		return common.Fault("MODEL_STREAM_INVALID")
	}
	for i, item := range s.items {
		if !item.done || item.incomplete || !equivalentJSON(items[i], []byte(item.raw)) {
			return common.Fault("MODEL_STREAM_INVALID")
		}
	}
	s.observation = responseUsage(response["usage"])
	s.terminal = status
	return nil
}

func (s *streamState) finish() (*schema.Message, savedRound, error) {
	round := savedRound{ResponseID: s.responseID, Terminal: s.terminal}
	if s.terminal != "completed" {
		reason := "MODEL_STREAM_INCOMPLETE"
		if s.terminal == "failed" {
			reason = "MODEL_STREAM_FAILED"
		} else if s.reason == "max_output_tokens" {
			reason = "MODEL_OUTPUT_TRUNCATED"
		} else if s.reason == "content_filter" {
			reason = "MODEL_CONTENT_FILTERED"
		}
		return nil, round, common.Fault(reason)
	}
	for i, item := range s.items {
		round.Items = append(round.Items, savedItem{OutputIndex: i, Raw: item.raw})
	}
	message, err := projectItems(round.Items)
	if err != nil || message.Content != s.emitted {
		return nil, round, common.Fault("MODEL_STREAM_INVALID")
	}
	return message, round, nil
}

func responseUsage(raw json.RawMessage) api.AttemptObservation {
	unknown := api.AttemptObservation{Knowledge: "unknown"}
	object, err := readObject(raw, common.MaxEventBytes)
	if err != nil {
		return unknown
	}
	read := func(key string) (int64, bool) {
		var value int64
		raw, ok := object[key]
		if !ok || string(raw) == "null" || json.Unmarshal(raw, &value) != nil || value < 0 {
			return 0, false
		}
		return value, true
	}
	input, inputOK := read("input_tokens")
	output, outputOK := read("output_tokens")
	if !inputOK || !outputOK || input > math.MaxInt64-output {
		return unknown
	}
	if _, present := object["total_tokens"]; present {
		total, ok := read("total_tokens")
		if !ok || total != input+output {
			return unknown
		}
	}
	return api.AttemptObservation{Knowledge: "known", InputTokens: strconv.FormatInt(input, 10), OutputTokens: strconv.FormatInt(output, 10)}
}
