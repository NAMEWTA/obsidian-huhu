package write

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"regexp"
	"strconv"
)

type Bridge struct {
	host    api.HostAPI
	profile api.ProfileReader
}

func New(host api.HostAPI, profile api.ProfileReader) *Bridge { return &Bridge{host, profile} }
func authority(p api.ProfileMetadata, l api.HostLease) api.HostWriteAuthority {
	return api.HostWriteAuthority{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, LeaseID: l.LeaseID, WorkspaceID: l.WorkspaceID, HostConnectionID: l.HostConnectionID, LeaseEpoch: l.LeaseEpoch}
}
func equalLease(a, b api.HostLease) bool {
	return a.LeaseID == b.LeaseID && a.WorkspaceID == b.WorkspaceID && a.HostConnectionID == b.HostConnectionID && a.LeaseEpoch == b.LeaseEpoch
}

var digest = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)

func positive(s string) bool {
	n, e := strconv.ParseInt(s, 10, 64)
	return e == nil && n > 0 && strconv.FormatInt(n, 10) == s
}
func validate(p api.ApprovalPreview, meta api.ProfileMetadata, l api.HostLease) error {
	b := p.Binding
	if b == nil || b.ProfileID != meta.ProfileID || b.CommandEpoch != meta.CommandEpoch || b.WorkspaceID != l.WorkspaceID || b.LeaseID != l.LeaseID || b.HostConnectionID != l.HostConnectionID || b.LeaseEpoch != l.LeaseEpoch || b.TargetResourceID != p.Target.ResourceID || p.Target.WorkspaceID != l.WorkspaceID || p.Tool != broker.Descriptor || b.CapabilityVersion != p.Tool.CapabilityVersion || b.ImplementationVersion != p.Tool.ImplementationVersion || b.PolicyVersion != p.Tool.PolicyVersion || b.DeviceID == "" || b.OriginClientID == "" || b.OriginViewID == "" || b.PreparationID == "" || !positive(b.TargetVersion) || !digest.MatchString(b.BaseHash) || !digest.MatchString(b.ContentHash) || b.ContentHash != broker.ContentHash(p.Content) {
		return api.Denied("NOTE_BINDING_MISMATCH")
	}
	return nil
}
func (b *Bridge) Preview(ctx context.Context, t api.EffectTarget, content string) (api.NoteTargetPreview, error) {
	if len([]byte(content)) > 65536 {
		return api.NoteTargetPreview{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "NOTE_SIZE_LIMIT"}
	}
	p, e := b.profile.ReadMetadata(ctx)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	lease, e := b.host.CurrentLease(ctx)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	q := api.HostPrepareWriteRequest{HostWriteAuthority: authority(p, lease), Target: t, Content: content, Tool: broker.Descriptor}
	preview, e := b.host.PrepareWrite(ctx, q)
	if e != nil {
		return preview, e
	}
	current, e := b.host.CurrentLease(ctx)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	if !equalLease(lease, current) || !equalLease(preview.Lease, lease) || preview.Target != t || preview.Tool != broker.Descriptor || preview.ContentHash != broker.ContentHash(content) || len(preview.Diff) > 131072 {
		return api.NoteTargetPreview{}, api.Denied("NOTE_BINDING_MISMATCH")
	}
	e = validate(api.ApprovalPreview{Binding: preview.Binding, Target: preview.Target, Tool: preview.Tool, Content: content}, p, lease)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	return preview, nil
}
func (b *Bridge) Check(ctx context.Context, p api.ApprovalPreview, l api.HostLease) error {
	meta, e := b.profile.ReadMetadata(ctx)
	if e != nil {
		return e
	}
	if e = validate(p, meta, l); e != nil {
		return e
	}
	result, e := b.host.CheckWrite(ctx, api.HostCheckWriteRequest{HostWriteAuthority: authority(meta, l), Preview: p})
	if e != nil {
		return e
	}
	if !result.Valid {
		return api.Denied("NOTE_BINDING_MISMATCH")
	}
	return nil
}
func Command(e api.EffectDispatch) api.HostInvokeCommand {
	return api.HostInvokeCommand{ProfileID: e.ProfileID, CommandEpoch: e.CommandEpoch, LeaseID: e.Lease.LeaseID, WorkspaceID: e.Lease.WorkspaceID, HostConnectionID: e.Lease.HostConnectionID, LeaseEpoch: e.Lease.LeaseEpoch, Capability: e.Tool.Capability, EffectID: e.EffectID, Resource: api.HostResource{ResourceID: e.Target.ResourceID, Revision: e.Target.BaseRevision}, ExpectedRevision: e.Target.BaseRevision, Content: e.Content, Preview: e.Preview, RunID: e.RunID, ApprovalID: e.ApprovalID, ApprovalRevision: e.ApprovalRevision, ExpiresAt: e.ExpiresAt, Fingerprint: e.Fingerprint}
}
func (b *Bridge) Invoke(ctx context.Context, e api.EffectDispatch) (api.HostReceipt, error) {
	meta, err := b.profile.ReadMetadata(ctx)
	if err != nil {
		return api.HostReceipt{}, err
	}
	if meta.ProfileID != e.ProfileID || meta.CommandEpoch != e.CommandEpoch {
		return api.HostReceipt{}, api.Denied("NOTE_PROFILE_MISMATCH")
	}
	if err = validate(e.Preview, meta, e.Lease); err != nil {
		return api.HostReceipt{}, err
	}
	command := Command(e)
	expected := api.EffectFingerprint(command)
	if e.Fingerprint == "" || e.Fingerprint != expected {
		return api.HostReceipt{}, api.Denied("EFFECT_FINGERPRINT_MISMATCH")
	}
	receipt, err := b.host.Invoke(ctx, command)
	if err != nil {
		return receipt, err
	}
	if receipt.EffectID != e.EffectID || receipt.Fingerprint != expected {
		return api.HostReceipt{}, api.Denied("NOTE_RECEIPT_INVALID")
	}
	return receipt, nil
}

var _ api.NoteWritePort = (*Bridge)(nil)
