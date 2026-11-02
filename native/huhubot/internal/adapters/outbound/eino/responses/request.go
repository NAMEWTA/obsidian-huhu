package responses

import (
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/cloudwego/eino/schema"
	"github.com/openai/openai-go/v3/packages/param"
	sdk "github.com/openai/openai-go/v3/responses"
	"github.com/openai/openai-go/v3/shared"
)

func buildRequest(generation common.Generation) (sdk.ResponseNewParams, error) {
	request := sdk.ResponseNewParams{
		Model: shared.ResponsesModel(generation.Model.ModelID),
		Store: param.NewOpt(false), Background: param.NewOpt(false),
		MaxOutputTokens: param.NewOpt(int64(common.MaxOutputTokens)),
		Truncation:      "disabled", Include: []sdk.ResponseIncludable{"reasoning.encrypted_content"},
	}
	input := sdk.ResponseInputParam{}
	for _, message := range generation.View.Messages[:generation.View.Initial] {
		raw, err := json.Marshal(map[string]any{"role": message.Role, "content": message.Content})
		if err != nil {
			return request, common.Fault("MODEL_REQUEST_INVALID")
		}
		input = append(input, param.Override[sdk.ResponseInputItemUnionParam](json.RawMessage(raw)))
	}
	state, err := decodeState(generation.PriorState)
	if err != nil {
		return request, err
	}
	for _, round := range state.Rounds {
		for _, item := range round.Items {
			input = append(input, param.Override[sdk.ResponseInputItemUnionParam](json.RawMessage(item.Raw)))
		}
		message := generation.View.Messages[round.MessageIndex]
		for i, call := range message.ToolCalls {
			position := round.MessageIndex + 1 + i
			if position >= len(generation.View.Messages) || generation.View.Messages[position].Role != schema.Tool || !validToolResult(generation.View.Messages[position], call) {
				return request, common.Fault("CHECKPOINT_INVALID")
			}
			// Common owns the durable decision and strips control tokens. Only
			// its ordered tool message is translated to a provider result.
			raw, err := json.Marshal(map[string]any{"type": "function_call_output", "call_id": call.ID, "output": generation.View.Messages[position].Content})
			if err != nil {
				return request, common.Fault("MODEL_REQUEST_INVALID")
			}
			input = append(input, param.Override[sdk.ResponseInputItemUnionParam](json.RawMessage(raw)))
		}
	}
	request.Input.OfInputItemList = input
	names := map[string]bool{}
	for _, tool := range generation.Tools {
		if tool == nil || tool.Name == "" || names[tool.Name] || tool.ParamsOneOf == nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		names[tool.Name] = true
		schema, err := tool.ToJSONSchema()
		if err != nil || schema == nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		encoded, err := json.Marshal(schema)
		var parameters map[string]any
		if err != nil || json.Unmarshal(encoded, &parameters) != nil || parameters == nil {
			return request, common.Fault("MODEL_TOOL_SCHEMA_INVALID")
		}
		request.Tools = append(request.Tools, sdk.ToolUnionParam{OfFunction: &sdk.FunctionToolParam{
			Name: tool.Name, Description: param.NewOpt(tool.Desc), Parameters: parameters, Strict: param.NewOpt(false),
		}})
	}
	return request, nil
}

func validateRequest(raw []byte, model string) error {
	object, err := readObject(raw, common.MaxRequestBytes)
	if err != nil || !onlyKeys(object, "model", "input", "tools", "max_output_tokens", "store", "background", "stream", "include", "truncation") {
		return common.Fault("MODEL_REQUEST_INVALID")
	}
	var actualModel, truncation string
	var stream, store, background bool
	var bound int
	var include []string
	var input []json.RawMessage
	if json.Unmarshal(object["model"], &actualModel) != nil || actualModel != model ||
		json.Unmarshal(object["truncation"], &truncation) != nil || truncation != "disabled" ||
		string(object["stream"]) != "true" || json.Unmarshal(object["stream"], &stream) != nil || !stream ||
		string(object["store"]) != "false" || json.Unmarshal(object["store"], &store) != nil || store ||
		string(object["background"]) != "false" || json.Unmarshal(object["background"], &background) != nil || background ||
		json.Unmarshal(object["max_output_tokens"], &bound) != nil || bound != common.MaxOutputTokens ||
		json.Unmarshal(object["include"], &include) != nil || len(include) != 1 || include[0] != "reasoning.encrypted_content" ||
		json.Unmarshal(object["input"], &input) != nil || len(input) == 0 {
		return common.Fault("MODEL_REQUEST_INVALID")
	}
	return nil
}
