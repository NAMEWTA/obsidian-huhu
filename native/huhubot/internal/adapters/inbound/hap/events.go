package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func (r *Router) events(ctx context.Context, e wire.Envelope) (Response, bool) {
	if r.App.Events == nil || e.Method != "runs.subscribe" {
		return Response{}, false
	}
	q, err := wire.DecodeParams[api.EventTailQuery](e.Params)
	if err != nil {
		return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS")), true
	}
	page, err := r.App.Events.Tail(ctx, r.Identity, q)
	response := Response{JSONRPC: "2.0", ID: e.ID, Result: page}
	if err != nil {
		response = FromError(e.ID, err)
	}
	if response.Error == nil || len(response.Error.Data.Details) > 0 {
		response.DeliverySubjects = []api.DeliverySubject{{Kind: "run", ID: q.RunID}}
	}
	return response, true
}
