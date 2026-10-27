package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

var assistantMethods = []string{"agents.create", "agents.list", "agents.get", "agents.update", "agents.disable", "agents.deletePreview", "agents.delete", "models.list", "models.test", "models.bind"}
var profileMethods = []string{"profile.deletePreview", "profile.delete"}

func (r *Router) methods() []string {
	methods := append([]string(nil), ImplementedMethods...)
	if r.App.Assistant != nil {
		methods = append(methods, assistantMethods...)
	}
	if r.App.Profile != nil {
		methods = append(methods, profileMethods...)
	}
	if r.App.Conversation != nil {
		methods = append(methods, conversationMethods...)
	}
	if r.App.Recovery != nil {
		methods = append(methods, recoveryMethods...)
	}
	if r.App.Groups != nil {
		methods = append(methods, groupMethods...)
	}
	if r.App.Grants != nil {
		methods = append(methods, grantsMethods...)
	}
	if r.App.Events != nil {
		methods = append(methods, "runs.subscribe")
	}
	if r.App.Approvals != nil {
		methods = append(methods, "approvals.list", "approvals.get", "approvals.resolve", "runs.cancel")
	}
	if r.App.Collaboration != nil {
		methods = append(methods, collaborationMethods...)
	}
	if r.App.Messages != nil {
		methods = append(methods, "collaboration.message", "collaboration.reply")
	}
	if r.App.Effects != nil {
		methods = append(methods, "effects.get", "effects.reconcile")
	}
	if r.portable != nil {
		methods = append(methods, "portable.export", "portable.importPreview", "portable.import")
	}
	return methods
}
func handle[P any, R any](ctx context.Context, e wire.Envelope, id api.RequestIdentity, run func(context.Context, api.RequestIdentity, P) (R, error)) Response {
	p, err := wire.DecodeParams[P](e.Params)
	if err != nil {
		return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS"))
	}
	v, err := run(ctx, id, p)
	if err != nil {
		return FromError(e.ID, err)
	}
	return Response{JSONRPC: "2.0", ID: e.ID, Result: v}
}
func (r *Router) assistant(ctx context.Context, e wire.Envelope) (Response, bool) {
	a := r.App.Assistant
	if a == nil {
		return Response{}, false
	}
	switch e.Method {
	case "agents.create":
		return handle(ctx, e, r.Identity, a.Create), true
	case "agents.list":
		return handle(ctx, e, r.Identity, a.List), true
	case "agents.get":
		return handle(ctx, e, r.Identity, a.Get), true
	case "agents.update":
		return handle(ctx, e, r.Identity, a.Update), true
	case "agents.disable":
		return handle(ctx, e, r.Identity, a.Disable), true
	case "agents.deletePreview":
		return handle(ctx, e, r.Identity, a.DeletePreview), true
	case "agents.delete":
		return handle(ctx, e, r.Identity, a.Delete), true
	case "models.list":
		return handle(ctx, e, r.Identity, a.ListModels), true
	case "models.test":
		return handle(ctx, e, r.Identity, a.TestModel), true
	case "models.bind":
		return handle(ctx, e, r.Identity, a.BindModel), true
	}
	return Response{}, false
}
