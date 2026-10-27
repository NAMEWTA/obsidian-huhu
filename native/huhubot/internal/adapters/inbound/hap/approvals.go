package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func (r *Router) approvals(ctx context.Context, e wire.Envelope) (Response, bool) {
	a := r.App.Approvals
	if a == nil {
		return Response{}, false
	}
	var response Response
	switch e.Method {
	case "approvals.list":
		response = handle(ctx, e, r.Identity, a.List)
	case "approvals.get":
		response = handle(ctx, e, r.Identity, a.Get)
	case "approvals.resolve":
		response = handle(ctx, e, r.Identity, a.Resolve)
	case "runs.cancel":
		response = handle(ctx, e, r.Identity, a.Cancel)
	default:
		return Response{}, false
	}
	if response.Error == nil {
		switch value := response.Result.(type) {
		case api.Approval:
			response.DeliverySubjects = []api.DeliverySubject{{Kind: "run", ID: value.RunID}}
		case api.ApprovalPage:
			for _, a := range value.Items {
				response.DeliverySubjects = append(response.DeliverySubjects, api.DeliverySubject{Kind: "run", ID: a.RunID})
			}
		}
	}
	return response, true
}
