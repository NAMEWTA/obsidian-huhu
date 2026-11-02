package responses

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
	Turn, MessageIndex   int
	ResponseID, Terminal string
	Items                []savedItem
}

type savedItem struct {
	OutputIndex int
	Raw         string
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
	if view.Initial < 1 || view.Initial > len(view.Messages) || len(view.Messages) > 2048 || view.Turns < 0 || view.Turns > common.MaxTurns {
		return common.Fault("CHECKPOINT_INVALID")
	}
	for _, message := range view.Messages[:view.Initial] {
		if message == nil || !utf8.ValidString(message.Content) || len(message.Content) > common.MaxRequestBytes || len(message.ToolCalls) != 0 || message.ToolCallID != "" || (message.Role != schema.System && message.Role != schema.User && message.Role != schema.Assistant) {
			return common.Fault("CHECKPOINT_INVALID")
		}
	}
	last := view.Messages[view.Initial-1]
	if last.Role != schema.User || last.Content != view.Intent {
		return common.Fault("CHECKPOINT_INVALID")
	}
	if view.Turns == 0 {
		if len(raw) != 0 || len(view.Messages) != view.Initial {
			return common.Fault("CHECKPOINT_INVALID")
		}
		return nil
	}
	if len(raw) == 0 {
		return common.Fault("CHECKPOINT_INVALID")
	}
	state, err := decodeState(raw)
	if err != nil || len(state.Rounds) != view.Turns {
		return common.Fault("CHECKPOINT_INVALID")
	}
	position := view.Initial
	ids := map[string]bool{}
	callIDs := map[string]bool{}
	for i, round := range state.Rounds {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if round.Turn != i+1 || round.MessageIndex != position || position >= len(view.Messages) || round.Terminal != "completed" || round.ResponseID == "" || ids[round.ResponseID] {
			return common.Fault("CHECKPOINT_INVALID")
		}
		ids[round.ResponseID] = true
		message, err := projectItems(round.Items)
		if err != nil || !reflect.DeepEqual(message, view.Messages[position]) {
			return common.Fault("CHECKPOINT_INVALID")
		}
		position++
		for _, call := range message.ToolCalls {
			if callIDs[call.ID] {
				return common.Fault("CHECKPOINT_INVALID")
			}
			callIDs[call.ID] = true
			if position >= len(view.Messages) || view.Messages[position] == nil || view.Messages[position].Role != schema.Tool {
				if i != len(state.Rounds)-1 {
					return common.Fault("CHECKPOINT_INVALID")
				}
				// The last round can stop between calls at an approval gate.
				continue
			}
			if !validToolResult(view.Messages[position], call) {
				return common.Fault("CHECKPOINT_INVALID")
			}
			position++
		}
		if len(message.ToolCalls) == 0 && i != len(state.Rounds)-1 {
			return common.Fault("CHECKPOINT_INVALID")
		}
	}
	if position != len(view.Messages) {
		return common.Fault("CHECKPOINT_INVALID")
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
	// Collaboration tools also return their durable task/message status. That
	// value stays common-owned; only suspension/unknown effect control states
	// are forbidden from masquerading as a result sent back to the model.
	return ok && status != "" && status != "approval_required" && status != "unknown_outcome"
}
