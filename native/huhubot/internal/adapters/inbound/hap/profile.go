package hap

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

// profileDeletePreviewResult deliberately mirrors the generated wire result
// without importing generated anonymous field types into the application API.
// Dispatch performs the final schema validation after JSON encoding.
type profileDeletePreviewResult struct {
	Token      string                         `json:"token"`
	Revision   string                         `json:"revision"`
	ExpiresAt  string                         `json:"expiresAt"`
	Categories []profileDeletePreviewCategory `json:"categories"`
}

type profileDeletePreviewCategory struct {
	Kind     string  `json:"kind"`
	Count    float64 `json:"count"`
	Retained bool    `json:"retained"`
	Reason   *string `json:"reason,omitempty"`
}

func (r *Router) profile(ctx context.Context, e wire.Envelope) (Response, bool) {
	p := r.App.Profile
	if p == nil {
		return Response{}, false
	}
	switch e.Method {
	case "profile.deletePreview":
		params, err := wire.DecodeParams[wire.ContractProfileDeletePreviewParams](e.Params)
		if err != nil {
			return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS")), true
		}
		value, err := p.DeletePreview(ctx, r.Identity, api.ProfileDeletePreviewRequest{ProfileID: params.ProfileId})
		if err != nil {
			return FromError(e.ID, err), true
		}
		categories := make([]profileDeletePreviewCategory, 0, len(value.Categories))
		for _, category := range value.Categories {
			var reason *string
			if category.Reason != "" {
				reason = &category.Reason
			}
			categories = append(categories, profileDeletePreviewCategory{Kind: category.Kind, Count: float64(category.Count), Retained: category.Retained, Reason: reason})
		}
		return Response{JSONRPC: "2.0", ID: e.ID, Result: profileDeletePreviewResult{Token: value.Token, Revision: value.Revision, ExpiresAt: value.ExpiresAt, Categories: categories}}, true
	case "profile.delete":
		params, err := wire.DecodeParams[wire.ContractProfileDeleteParams](e.Params)
		if err != nil {
			return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS")), true
		}
		command := api.ProfileDeleteCommand{
			CommandMeta: api.CommandMeta{
				CommandID:      params.CommandId,
				IdempotencyKey: params.IdempotencyKey,
				ProfileID:      params.ProfileId,
				CommandEpoch:   params.CommandEpoch,
			},
			PreviewToken:    params.PreviewToken,
			RetainMemoryIDs: params.RetainMemoryIds,
		}
		if params.Id != nil {
			command.ID = *params.Id
		}
		if params.ExpectedRevision != nil {
			command.ExpectedRevision = *params.ExpectedRevision
		}
		value, err := p.Delete(ctx, r.Identity, command)
		if err != nil {
			return FromError(e.ID, err), true
		}
		return Response{JSONRPC: "2.0", ID: e.ID, Result: value}, true
	}
	return Response{}, false
}
