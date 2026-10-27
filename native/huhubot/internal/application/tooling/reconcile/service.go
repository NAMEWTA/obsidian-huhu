package reconcile

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type Repository interface {
	FindReconciliation(context.Context, api.RequestIdentity, api.EffectReconcile) (api.EffectView, bool, error)
	LoadEffect(context.Context, api.RequestIdentity, api.EffectQuery) (api.EffectView, api.EffectDispatch, error)
	SaveReconciliation(context.Context, api.RequestIdentity, api.EffectReconcile, string, string, *api.HostReceipt) (api.EffectView, error)
}
type Service struct {
	repo    Repository
	host    api.HostAPI
	profile api.ProfileReader
}

func New(repo Repository, host api.HostAPI, profile api.ProfileReader) *Service {
	return &Service{repo, host, profile}
}
func (s *Service) Get(ctx context.Context, id api.RequestIdentity, q api.EffectQuery) (api.EffectView, error) {
	if !id.Valid() || q.ProfileID == "" || q.ID == "" {
		return api.EffectView{}, api.Invalid("INVALID_EFFECT_QUERY")
	}
	v, _, e := s.repo.LoadEffect(ctx, id, q)
	return v, e
}
func (s *Service) Reconcile(ctx context.Context, id api.RequestIdentity, c api.EffectReconcile) (api.EffectView, error) {
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return api.EffectView{}, e
	}
	if old, found, e := s.repo.FindReconciliation(ctx, id, c); e != nil {
		return api.EffectView{}, e
	} else if found {
		return old, nil
	}
	v, proof, e := s.repo.LoadEffect(ctx, id, api.EffectQuery{ProfileID: c.ProfileID, ID: c.ID})
	if e != nil {
		return v, e
	}
	if v.Revision != c.ExpectedRevision {
		return api.EffectView{}, &api.Fault{Kind: "CONFLICT", Reason: "REVISION_CONFLICT"}
	}
	if v.Status == "committed" || v.Status == "reconciled" || v.Status == "failed_no_effect" || v.Status == "rejected" {
		return s.repo.SaveReconciliation(ctx, id, c, v.Status, v.Reason, v.Receipt)
	}
	if v.Status != "unknown_outcome" && v.Status != "dispatching" {
		return v, &api.Fault{Kind: "CONFLICT", Reason: "EFFECT_NOT_RECONCILABLE"}
	}
	if proof.Preview.Binding == nil {
		return v, api.Denied("NOTE_BINDING_MISMATCH")
	}
	lease, e := s.host.CurrentLease(ctx)
	if e != nil {
		return v, e
	}
	meta, e := s.profile.ReadMetadata(ctx)
	if e != nil {
		return v, e
	}
	command := api.HostInvokeCommand{ProfileID: proof.ProfileID, CommandEpoch: proof.CommandEpoch, EffectID: proof.EffectID, RunID: proof.RunID, ApprovalID: proof.ApprovalID, ApprovalRevision: proof.ApprovalRevision, ExpiresAt: proof.ExpiresAt, Content: proof.Content, Preview: proof.Preview}
	fingerprint := api.EffectFingerprint(command)
	receipt, e := s.host.QueryReceipt(ctx, api.HostReceiptQuery{ProfileID: meta.ProfileID, CommandEpoch: meta.CommandEpoch, LeaseID: lease.LeaseID, HostConnectionID: lease.HostConnectionID, LeaseEpoch: lease.LeaseEpoch, WorkspaceID: lease.WorkspaceID, EffectID: proof.EffectID, Fingerprint: fingerprint, Preview: proof.Preview})
	if e != nil {
		return v, e
	}
	if receipt.EffectID != c.ID || receipt.Fingerprint != fingerprint {
		return v, api.Denied("NOTE_RECEIPT_INVALID")
	}
	state, reason := "unknown_outcome", "HOST_OUTCOME_UNKNOWN"
	switch receipt.Status {
	case "committed":
		if receipt.ReceiptID != "" {
			state, reason = "committed", ""
		}
	case "reconciled":
		state, reason = "reconciled", "POSTCONDITION_MATCHED"
	case "failed_no_effect":
		state, reason = "failed_no_effect", receipt.Reason
	}
	return s.repo.SaveReconciliation(ctx, id, c, state, reason, &receipt)
}

var _ api.EffectsAPI = (*Service)(nil)
