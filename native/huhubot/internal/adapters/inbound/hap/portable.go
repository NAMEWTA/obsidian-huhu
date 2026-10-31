package hap

import (
	"context"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type portableArtifact struct {
	ArtifactID string `json:"artifactId"`
	MediaType  string `json:"mediaType"`
	Size       string `json:"size"`
}
type portableExportResult struct {
	Artifact portableArtifact `json:"artifact"`
}
type portableConflict struct {
	ID          string `json:"id"`
	Revision    string `json:"revision"`
	Hash        string `json:"hash"`
	Kind        string `json:"kind"`
	ExistingID  string `json:"existingId"`
	Reason      string `json:"reason"`
	NeedsReview bool   `json:"needsReview"`
}
type portableMapping struct {
	Kind string `json:"kind"`
	From string `json:"from"`
	To   string `json:"to"`
}
type portablePreviewResult struct {
	Token       string             `json:"token"`
	MappingMode string             `json:"mappingMode"`
	Mappings    []portableMapping  `json:"mappings"`
	Conflicts   []portableConflict `json:"conflicts"`
}
type portableImportResult struct {
	CommandID string `json:"commandId"`
	ReceiptID string `json:"receiptId"`
	Revision  string `json:"revision"`
}

func (r *Router) portableHandle(ctx context.Context, e wire.Envelope) (Response, bool) {
	if r.portable == nil {
		return Response{}, false
	}
	var result any
	var err error
	switch e.Method {
	case "portable.stage":
		stage, ok := r.portable.(portable.StageAPI)
		if !ok {
			return Failure(e.ID, -32601, "CAPABILITY_DENIED", "METHOD_NOT_AVAILABLE", false), true
		}
		return handle(ctx, e, r.Identity, stage.Stage), true
	case "portable.export":
		p, decodeErr := wire.DecodeParams[wire.ContractPortableExportParams](e.Params)
		if decodeErr != nil {
			return FromError(e.ID, decodeErr), true
		}
		v, callErr := r.portable.Export(ctx, r.Identity, portable.ExportRequest{
			CommandID: p.CommandId, IdempotencyKey: p.IdempotencyKey, ProfileID: p.ProfileId,
			CommandEpoch: p.CommandEpoch, ExpectedRevision: optionalString(p.ExpectedRevision),
			AgentIDs: p.AgentIds, MemoryIDs: p.MemoryIds, SessionIDs: p.SessionIds,
		})
		err, result = callErr, portableExportResult{Artifact: portableArtifact{ArtifactID: v.Artifact.ArtifactID, MediaType: v.Artifact.MediaType, Size: v.Artifact.Size}}
	case "portable.importPreview":
		p, decodeErr := wire.DecodeParams[wire.ContractPortableImportPreviewParams](e.Params)
		if decodeErr != nil {
			return FromError(e.ID, decodeErr), true
		}
		v, callErr := r.portable.ImportPreview(ctx, r.Identity, portable.ImportPreviewRequest{ProfileID: p.ProfileId, Artifact: portable.ArtifactRef{ArtifactID: p.Artifact.ArtifactId, MediaType: p.Artifact.MediaType, Size: p.Artifact.Size}})
		if callErr == nil {
			callErr = portable.ValidatePreviewBudget(v)
		}
		if callErr != nil {
			return FromError(e.ID, callErr), true
		}
		conflicts := make([]portableConflict, 0, len(v.Conflicts))
		for _, c := range v.Conflicts {
			conflicts = append(conflicts, portableConflict{ID: c.ID, Revision: c.Revision, Hash: c.Hash, Kind: c.Kind, ExistingID: c.ExistingID, Reason: c.Reason, NeedsReview: c.NeedsReview})
		}
		mappings := make([]portableMapping, 0, len(v.Mappings))
		for _, m := range v.Mappings {
			mappings = append(mappings, portableMapping{Kind: m.Kind, From: m.From, To: m.To})
		}
		err, result = callErr, portablePreviewResult{Token: v.Token, MappingMode: v.MappingMode, Mappings: mappings, Conflicts: conflicts}
	case "portable.import":
		p, decodeErr := wire.DecodeParams[wire.ContractPortableImportParams](e.Params)
		if decodeErr != nil {
			return FromError(e.ID, decodeErr), true
		}
		resolutions := make([]portable.ImportResolution, 0, len(p.Resolutions))
		for _, v := range p.Resolutions {
			resolutions = append(resolutions, portable.ImportResolution{ID: v.Id, Action: v.Action})
		}
		v, callErr := r.portable.Import(ctx, r.Identity, portable.ImportRequest{
			CommandID: p.CommandId, IdempotencyKey: p.IdempotencyKey, ProfileID: p.ProfileId,
			CommandEpoch: p.CommandEpoch, ExpectedRevision: optionalString(p.ExpectedRevision),
			PreviewToken: p.PreviewToken, Resolutions: resolutions,
		})
		err, result = callErr, portableImportResult{CommandID: v.CommandID, ReceiptID: v.ReceiptID, Revision: v.Revision}
	default:
		return Response{}, false
	}
	if err != nil {
		return FromError(e.ID, err), true
	}
	return Response{JSONRPC: "2.0", ID: e.ID, Result: result}, true
}

func optionalString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
