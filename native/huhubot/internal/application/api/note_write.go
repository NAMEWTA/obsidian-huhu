package api

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"hash"
)

type NoteWriteBinding struct {
	DeviceID              string `json:"deviceId"`
	ProfileID             string `json:"profileId"`
	CommandEpoch          string `json:"commandEpoch"`
	WorkspaceID           string `json:"workspaceId"`
	OriginClientID        string `json:"originClientId"`
	OriginViewID          string `json:"originViewId"`
	LeaseID               string `json:"leaseId"`
	HostConnectionID      string `json:"hostConnectionId"`
	LeaseEpoch            string `json:"leaseEpoch"`
	TargetResourceID      string `json:"targetResourceId"`
	PreparationID         string `json:"preparationId"`
	BaseHash              string `json:"baseHash"`
	ContentHash           string `json:"contentHash"`
	TargetVersion         string `json:"targetVersion"`
	CapabilityVersion     string `json:"capabilityVersion"`
	ImplementationVersion string `json:"implementationVersion"`
	PolicyVersion         string `json:"policyVersion"`
}
type HostWriteAuthority struct {
	ProfileID        string `json:"profileId"`
	CommandEpoch     string `json:"commandEpoch"`
	LeaseID          string `json:"leaseId"`
	HostConnectionID string `json:"hostConnectionId"`
	LeaseEpoch       string `json:"leaseEpoch"`
	WorkspaceID      string `json:"workspaceId"`
}
type HostPrepareWriteRequest struct {
	HostWriteAuthority
	Target  EffectTarget   `json:"target"`
	Tool    ToolDescriptor `json:"tool"`
	Content string         `json:"content"`
}
type HostCheckWriteRequest struct {
	HostWriteAuthority
	Preview ApprovalPreview `json:"preview"`
}
type HostCheckWriteResult struct {
	Valid bool `json:"valid"`
}
type HostWriteRemote interface {
	PrepareWrite(context.Context, HostPrepareWriteRequest) (NoteTargetPreview, error)
	CheckWrite(context.Context, HostCheckWriteRequest) (HostCheckWriteResult, error)
}
type HostWriteAPI interface{ HostWriteRemote }
type EffectQuery struct {
	ProfileID string `json:"profileId"`
	ID        string `json:"id"`
}
type EffectReconcile struct {
	CommandMeta
	ID string `json:"id"`
}
type EffectView struct {
	ID       string       `json:"id"`
	RunID    string       `json:"runId"`
	Revision string       `json:"revision"`
	Status   string       `json:"status"`
	Reason   string       `json:"reason,omitempty"`
	Receipt  *HostReceipt `json:"receipt,omitempty"`
}
type EffectsAPI interface {
	Get(context.Context, RequestIdentity, EffectQuery) (EffectView, error)
	Reconcile(context.Context, RequestIdentity, EffectReconcile) (EffectView, error)
}

func writeFingerprintField(h hash.Hash, v string) {
	var n [4]byte
	binary.BigEndian.PutUint32(n[:], uint32(len([]byte(v))))
	h.Write(n[:])
	h.Write([]byte(v))
}

// EffectFingerprint hashes length-prefixed UTF-8 fields in a fixed order.
// JSON object ordering, HTML escaping and JS UTF-16 length never affect it.
func EffectFingerprint(c HostInvokeCommand) string {
	b := c.Preview.Binding
	if b == nil {
		return ""
	}
	t := c.Preview.Target
	v := c.Preview.Tool
	fields := []string{"huhu-note-effect-v1", c.ProfileID, c.CommandEpoch, c.EffectID, c.RunID, c.ApprovalID, c.ApprovalRevision, c.ExpiresAt, t.WorkspaceID, t.ResourceID, t.Operation, t.BaseRevision, v.Name, v.Capability, v.CapabilityVersion, v.ImplementationVersion, v.PolicyVersion, b.DeviceID, b.OriginClientID, b.OriginViewID, b.LeaseID, b.HostConnectionID, b.LeaseEpoch, b.PreparationID, b.BaseHash, b.ContentHash, b.TargetVersion, c.Preview.ParametersHash, c.Preview.PreviewHash, c.Content}
	h := sha256.New()
	for _, f := range fields {
		writeFingerprintField(h, f)
	}
	return "sha256:" + hex.EncodeToString(h.Sum(nil))
}
