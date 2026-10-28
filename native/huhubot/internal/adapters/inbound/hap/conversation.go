package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

var conversationMethods = []string{"sessions.create", "sessions.list", "sessions.get", "sessions.history", "sessions.archive", "runs.start", "runs.get"}
var recoveryMethods = []string{"runs.recovery", "runs.resume"}
var groupMethods = []string{"sessions.updateMembers", "sessions.setCoordinator"}
var grantsMethods = []string{"grants.create", "grants.list", "grants.revoke"}

func (r *Router) conversation(ctx context.Context, e wire.Envelope) (Response, bool) {
	if r.App.Data != nil {
		switch e.Method {
		case "sessions.deletePreview":
			params, err := wire.DecodeParams[wire.ContractSessionsDeletePreviewParams](e.Params)
			if err != nil {
				return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS")), true
			}
			value, err := r.App.Data.DeletePreview(ctx, r.Identity, api.IDQuery{ProfileID: params.ProfileId, ID: params.Id})
			if err != nil {
				return FromError(e.ID, err), true
			}
			return Response{JSONRPC: "2.0", ID: e.ID, Result: value}, true
		case "sessions.delete":
			return handle(ctx, e, r.Identity, r.App.Data.Delete), true
		}
	}
	if r.App.Groups != nil {
		switch e.Method {
		case "sessions.updateMembers":
			return handle(ctx, e, r.Identity, r.App.Groups.UpdateMembers), true
		case "sessions.setCoordinator":
			return handle(ctx, e, r.Identity, r.App.Groups.SetCoordinator), true
		}
	}
	if r.App.Recovery != nil {
		switch e.Method {
		case "runs.recovery":
			return handle(ctx, e, r.Identity, r.App.Recovery.Get), true
		case "runs.resume":
			return handle(ctx, e, r.Identity, r.App.Recovery.Resume), true
		}
	}
	c := r.App.Conversation
	if c == nil {
		return Response{}, false
	}
	switch e.Method {
	case "sessions.create":
		return handle(ctx, e, r.Identity, c.CreateSession), true
	case "sessions.list":
		return handle(ctx, e, r.Identity, c.ListSessions), true
	case "sessions.get":
		return handle(ctx, e, r.Identity, c.GetSession), true
	case "sessions.history":
		response := handle(ctx, e, r.Identity, c.History)
		if page, ok := response.Result.(api.MessagePage); ok {
			response.DeliverySubjects = page.DeliverySubjects
		}
		return response, true
	case "sessions.archive":
		return handle(ctx, e, r.Identity, c.Archive), true
	case "runs.start":
		return handle(ctx, e, r.Identity, c.StartRun), true
	case "runs.get":
		return handle(ctx, e, r.Identity, c.GetRun), true
	}
	return Response{}, false
}
func (r *Router) grants(ctx context.Context, e wire.Envelope) (Response, bool) {
	g := r.App.Grants
	if g == nil {
		return Response{}, false
	}
	switch e.Method {
	case "grants.create":
		return handle(ctx, e, r.Identity, g.Create), true
	case "grants.list":
		return handle(ctx, e, r.Identity, g.List), true
	case "grants.revoke":
		return handle(ctx, e, r.Identity, g.Revoke), true
	}
	return Response{}, false
}
