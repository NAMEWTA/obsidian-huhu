package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

var collaborationMethods = []string{"collaboration.configurationHash", "collaboration.budget", "collaboration.configureBudget", "collaboration.discover", "collaboration.delegate", "collaboration.get", "collaboration.list", "collaboration.cancel", "collaboration.proposeCreate", "collaboration.proposals", "collaboration.confirmProposal", "collaboration.rejectProposal"}

func (r *Router) collaboration(ctx context.Context, e wire.Envelope) (Response, bool) {
	var response Response
	c := r.App.Collaboration
	if c != nil {
		switch e.Method {
		case "collaboration.configurationHash":
			return handle(ctx, e, r.Identity, c.ConfigurationHash), true
		case "collaboration.budget":
			return handle(ctx, e, r.Identity, c.Budget), true
		case "collaboration.configureBudget":
			return handle(ctx, e, r.Identity, c.ConfigureBudget), true
		case "collaboration.discover":
			return handle(ctx, e, r.Identity, c.Discover), true
		case "collaboration.delegate":
			response = handle(ctx, e, r.Identity, c.Delegate)
		case "collaboration.get":
			response = handle(ctx, e, r.Identity, c.GetTask)
		case "collaboration.list":
			response = handle(ctx, e, r.Identity, c.ListTasks)
		case "collaboration.cancel":
			response = handle(ctx, e, r.Identity, c.CancelTask)
		case "collaboration.proposeCreate":
			return handle(ctx, e, r.Identity, c.ProposeCreate), true
		case "collaboration.proposals":
			response = handle(ctx, e, r.Identity, c.Proposals)
		case "collaboration.rejectProposal":
			return handle(ctx, e, r.Identity, c.RejectProposal), true
		case "collaboration.confirmProposal":
			return handle(ctx, e, r.Identity, c.ConfirmProposal), true
		}
	}
	if response.JSONRPC != "" {
		switch v := response.Result.(type) {
		case api.AgentProposalPage:
			response.DeliverySubjects = v.DeliverySubjects
		case api.Delegation:
			if v.Result != nil && v.Result.Text != "" {
				response.DeliverySubjects = []api.DeliverySubject{{Kind: "run", ID: v.ChildRunID}}
			}
		case api.DelegationPage:
			for _, d := range v.Items {
				if d.Result != nil && d.Result.Text != "" {
					response.DeliverySubjects = append(response.DeliverySubjects, api.DeliverySubject{Kind: "run", ID: d.ChildRunID})
				}
			}
		}
		return response, true
	}
	if r.App.Messages != nil {
		switch e.Method {
		case "collaboration.message":
			return handle(ctx, e, r.Identity, r.App.Messages.Send), true
		case "collaboration.reply":
			return handle(ctx, e, r.Identity, r.App.Messages.Reply), true
		}
	}
	if r.App.Effects != nil {
		switch e.Method {
		case "effects.get":
			return handle(ctx, e, r.Identity, r.App.Effects.Get), true
		case "effects.reconcile":
			return handle(ctx, e, r.Identity, r.App.Effects.Reconcile), true
		}
	}
	return Response{}, false
}
