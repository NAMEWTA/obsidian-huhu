package hap

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

var memoryMethods = []string{"memory.list", "memory.get", "memory.pin", "memory.correct", "memory.forget", "memory.setAutoMaintenance"}
var globalMemoryMethods = []string{"memory.proposeGlobal", "memory.resolveGlobal"}

func (r *Router) availableMethods() []string {
	out := r.methods()
	if r.App.Memory != nil {
		out = append(out, memoryMethods...)
	}
	if r.ownerGlobal != nil {
		out = append(out, globalMemoryMethods...)
	}
	return out
}

func memoryHandle[P any, R any](ctx context.Context, e wire.Envelope, id api.RequestIdentity, run func(context.Context, api.RequestIdentity, P) (R, error)) Response {
	if !id.Valid() {
		return FromError(e.ID, api.Denied("IDENTITY_REQUIRED"))
	}
	if err := api.ValidateMemoryJSON(e.Params); err != nil {
		return FromError(e.ID, err)
	}
	p, err := wire.DecodeParams[P](e.Params)
	if err != nil {
		return FromError(e.ID, api.Invalid("INVALID_MEMORY_PARAMS"))
	}
	if err = api.ValidateMemoryRequest(e.Method, p); err != nil {
		return FromError(e.ID, err)
	}
	value, err := run(ctx, id, p)
	if err != nil {
		return FromError(e.ID, err)
	}
	if api.ValidateMemoryResult(e.Method, value) != nil {
		return Failure(e.ID, -32603, "CONFLICT", "INVALID_APPLICATION_RESULT", false)
	}
	return Response{JSONRPC: "2.0", ID: e.ID, Result: value, DeliverySubjects: memorySubjects(value)}
}
func (r *Router) memory(ctx context.Context, e wire.Envelope) (Response, bool) {
	if e.Method == "memory.proposeGlobal" || e.Method == "memory.resolveGlobal" {
		if r.ownerGlobal == nil {
			return Failure(e.ID, -32601, "CAPABILITY_DENIED", "METHOD_NOT_AVAILABLE", false), true
		}
		if e.Method == "memory.proposeGlobal" {
			return memoryHandle(ctx, e, r.Identity, r.ownerGlobal.ProposeGlobal), true
		}
		return memoryHandle(ctx, e, r.Identity, r.ownerGlobal.ResolveGlobal), true
	}
	m := r.App.Memory
	if m == nil {
		return Response{}, false
	}
	switch e.Method {
	case "memory.list":
		return memoryHandle(ctx, e, r.Identity, m.List), true
	case "memory.get":
		return memoryHandle(ctx, e, r.Identity, m.Get), true
	case "memory.pin":
		return memoryHandle(ctx, e, r.Identity, m.Pin), true
	case "memory.correct":
		return memoryHandle(ctx, e, r.Identity, m.Correct), true
	case "memory.forget":
		return memoryHandle(ctx, e, r.Identity, m.Forget), true
	case "memory.setAutoMaintenance":
		return memoryHandle(ctx, e, r.Identity, m.SetAutoMaintenance), true
	}
	return Response{}, false
}

// Subjects express the required physical-fence contract. Default Core does not
// assemble memory; enabling it later also requires T04's actual readers.
func memorySubjects(value any) []api.DeliverySubject {
	out := []api.DeliverySubject{}
	var add func(api.MemoryObject)
	add = func(o api.MemoryObject) {
		if o.Item != nil && o.Item.Body != nil {
			out = append(out, api.DeliverySubject{Kind: "memory_revision", ID: o.Item.RevisionID})
		}
		if o.Candidate != nil && o.Candidate.Body != nil {
			out = append(out, api.DeliverySubject{Kind: "memory_candidate", ID: o.Candidate.ID})
		}
		if o.Proposal != nil && o.Proposal.Body != nil {
			out = append(out, api.DeliverySubject{Kind: "memory_proposal", ID: o.Proposal.ID})
		}
		if o.Context != nil {
			for _, v := range o.Context.Entries {
				if v.State == "readable" && (v.Text != nil || len(v.SourceRefs) > 0) {
					out = append(out, api.DeliverySubject{Kind: "context_entry", ID: v.ID})
				}
			}
		}
	}
	switch v := value.(type) {
	case api.MemoryPage:
		for _, o := range v.Items {
			add(o)
		}
	case api.MemoryObject:
		add(v)
	case api.MemoryItem:
		add(api.MemoryObject{Kind: "item", Item: &v})
	case api.MemoryProposal:
		add(api.MemoryObject{Kind: "proposal", Proposal: &v})
	}
	return out
}
