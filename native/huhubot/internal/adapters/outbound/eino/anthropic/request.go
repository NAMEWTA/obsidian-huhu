package anthropic

import (
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	sdk "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/packages/param"
	"github.com/cloudwego/eino/schema"
)

func buildRequest(generation common.Generation) (sdk.MessageNewParams, error) {
	request := sdk.MessageNewParams{Model: sdk.Model(generation.Model.ModelID), MaxTokens: common.MaxOutputTokens}
	for _, message := range generation.View.Messages[:generation.View.Initial] {
		if message.Role == schema.System {
			request.System = append(request.System, sdk.TextBlockParam{Text: message.Content})
			continue
		}
		request.Messages = append(request.Messages, sdk.MessageParam{
			Role: sdk.MessageParamRole(message.Role), Content: []sdk.ContentBlockParamUnion{sdk.NewTextBlock(message.Content)},
		})
	}
	state, err := decodeState(generation.PriorState)
	if err != nil {
		return request, err
	}
	for _, round := range state.Rounds {
		message := sdk.NewAssistantMessage()
		for _, block := range round.Blocks {
			message.Content = append(message.Content, param.Override[sdk.ContentBlockParamUnion](json.RawMessage(block.Raw)))
		}
		request.Messages = append(request.Messages, message)
		calls := generation.View.Messages[round.MessageIndex].ToolCalls
		if len(calls) == 0 {
			continue
		}
		results := sdk.NewUserMessage()
		for i, call := range calls {
			position := round.MessageIndex + 1 + i
			if position >= len(generation.View.Messages) || !validToolResult(generation.View.Messages[position], call) {
				return request, common.Fault("CHECKPOINT_INVALID")
			}
			message := generation.View.Messages[position]
			clean, _ := readObject([]byte(message.Content), common.MaxResultBytes)
			status, _ := stringField(clean, "status")
			// A queried task's canceled/failed status describes the task. Only
			// the broker's denied result denotes failure of this invocation.
			raw, err := json.Marshal(map[string]any{"type": "tool_result", "tool_use_id": call.ID, "content": message.Content, "is_error": status == "denied"})
			if err != nil {
				return request, common.Fault("MODEL_REQUEST_INVALID")
			}
			results.Content = append(results.Content, param.Override[sdk.ContentBlockParamUnion](json.RawMessage(raw)))
		}
		request.Messages = append(request.Messages, results)
	}
	names := map[string]bool{}
	for _, tool := range generation.Tools {
		if tool == nil || tool.Name == "" || names[tool.Name] || tool.ParamsOneOf == nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		names[tool.Name] = true
		definition, err := tool.ToJSONSchema()
		if err != nil || definition == nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		raw, err := json.Marshal(map[string]any{"name": tool.Name, "description": tool.Desc, "input_schema": definition})
		if err != nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		request.Tools = append(request.Tools, param.Override[sdk.ToolUnionParam](json.RawMessage(raw)))
	}
	return request, nil
}

func validateRequest(raw []byte, model string) error {
	object, err := readObject(raw, common.MaxRequestBytes)
	if err != nil || !onlyKeys(object, "model", "messages", "system", "tools", "max_tokens", "stream") {
		return common.Fault("MODEL_REQUEST_INVALID")
	}
	actual, ok := stringField(object, "model")
	bound, boundOK := indexField(object, "max_tokens")
	var messages []json.RawMessage
	if !ok || actual != model || !boundOK || bound != common.MaxOutputTokens || string(object["stream"]) != "true" || json.Unmarshal(object["messages"], &messages) != nil || len(messages) == 0 {
		return common.Fault("MODEL_REQUEST_INVALID")
	}
	return nil
}
