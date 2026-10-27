package anthropic

import (
	"bytes"
	"context"
	"encoding/json"
	"reflect"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/cloudwego/eino/schema"
)

type protocolState struct {
	Format string
	Rounds []savedRound
}

type savedRound struct {
	Turn, MessageIndex    int
	MessageID, StopReason string
	StopSequence          *string `json:",omitempty"`
	Blocks                []savedBlock
}

// Raw preserves the classified start fields and reconstructed final values.
// Anthropic does not send an authoritative full block at content_block_stop.
type savedBlock struct {
	Index int
	Raw   string
}

func decodeState(raw []byte) (protocolState, error) {
	if len(raw) == 0 {
		return protocolState{Format: StateFormat}, nil
	}
	var state protocolState
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if common.StrictJSON(raw, common.MaxCheckpointBytes) != nil || decoder.Decode(&state) != nil || state.Format != StateFormat || len(state.Rounds) == 0 || len(state.Rounds) > common.MaxTurns {
		return state, common.Fault("CHECKPOINT_INVALID")
	}
	return state, nil
}

func appendRound(raw []byte, round savedRound) ([]byte, error) {
	state, err := decodeState(raw)
	if err != nil {
		return nil, err
	}
	state.Rounds = append(state.Rounds, round)
	encoded, err := json.Marshal(state)
	if err != nil || len(encoded) > common.MaxCheckpointBytes {
		return nil, common.Fault("CHECKPOINT_SIZE_LIMIT")
	}
	return encoded, nil
}

func (*Driver) ValidateState(ctx context.Context, view common.StateView, raw []byte) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	invalid := func() error { return common.Fault("CHECKPOINT_INVALID") }
	if view.Initial < 1 || view.Initial > len(view.Messages) || len(view.Messages) > 2048 || view.Turns < 0 || view.Turns > common.MaxTurns {
		return invalid()
	}
	for _, message := range view.Messages[:view.Initial] {
		if message == nil || !utf8.ValidString(message.Content) || len(message.Content) > common.MaxRequestBytes || len(message.ToolCalls) != 0 || message.ToolCallID != "" || (message.Role != schema.System && message.Role != schema.User && message.Role != schema.Assistant) {
			return invalid()
		}
	}
	last := view.Messages[view.Initial-1]
	if last.Role != schema.User || last.Content != view.Intent {
		return invalid()
	}
	if view.Turns == 0 {
		if len(raw) != 0 || len(view.Messages) != view.Initial {
			return invalid()
		}
		return nil
	}
	if len(raw) == 0 {
		return invalid()
	}
	state, err := decodeState(raw)
	if err != nil || len(state.Rounds) != view.Turns {
		return invalid()
	}
	position := view.Initial
	ids := map[string]bool{}
	callIDs := map[string]bool{}
	for i, round := range state.Rounds {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if round.Turn != i+1 || round.MessageIndex != position || position >= len(view.Messages) || (round.StopReason != "end_turn" && round.StopReason != "tool_use" && round.StopReason != "stop_sequence") || round.MessageID == "" || ids[round.MessageID] || (round.StopReason == "stop_sequence") != (round.StopSequence != nil) {
			return invalid()
		}
		ids[round.MessageID] = true
		message, err := projectBlocks(round.Blocks)
		if err != nil || !reflect.DeepEqual(message, view.Messages[position]) {
			return invalid()
		}
		if (round.StopReason == "tool_use") != (len(message.ToolCalls) > 0) {
			return invalid()
		}
		position++
		for _, call := range message.ToolCalls {
			if callIDs[call.ID] {
				return invalid()
			}
			callIDs[call.ID] = true
			if position >= len(view.Messages) || view.Messages[position] == nil || view.Messages[position].Role != schema.Tool {
				if i != len(state.Rounds)-1 {
					return invalid()
				}
				// Only the last batch may be suspended before its remaining
				// decisions. No missing result is invented or sent to Provider.
				continue
			}
			if !validToolResult(view.Messages[position], call) {
				return invalid()
			}
			position++
		}
		if len(message.ToolCalls) == 0 && i != len(state.Rounds)-1 {
			return invalid()
		}
	}
	if position != len(view.Messages) {
		return invalid()
	}
	return nil
}

func validToolResult(message *schema.Message, call schema.ToolCall) bool {
	if message == nil || message.Role != schema.Tool || message.ToolCallID != call.ID || message.ToolName != call.Function.Name || len(message.ToolCalls) != 0 || !utf8.ValidString(message.Content) {
		return false
	}
	object, err := readObject([]byte(message.Content), common.MaxResultBytes)
	if err != nil || !onlyKeys(object, "status", "effectId", "reason", "receipt", "directory", "delegation", "tasks", "message", "children", "proposal", "resumeInbox") {
		return false
	}
	if raw, ok := object["resumeInbox"]; ok && common.ValidateResumeInboxJSON(raw) != nil {
		return false
	}
	status, ok := stringField(object, "status")
	return ok && status != "" && status != "approval_required" && status != "unknown_outcome"
}
