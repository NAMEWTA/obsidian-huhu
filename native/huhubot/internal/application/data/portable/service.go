package portable

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sync"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// ArtifactStore is the application boundary for package bytes. The concrete
// implementation owns the filesystem and package encoding; the service only
// deals in opaque ArtifactRefs.
type ArtifactStore interface {
	Put(context.Context, Package) (ArtifactRef, error)
	Get(context.Context, ArtifactRef) (Package, error)
}

// Repository combines the profile snapshot reader and the transactional
// import sink. SQL and wire types remain in the adapter implementing it.
type Repository interface {
	Snapshot(context.Context, api.RequestIdentity, string, ExportRequest) (Selection, error)
	Target(context.Context, string) (Target, error)
	Sink
}

// PrincipalSink is an optional refinement used by adapters that need the
// caller principal when materializing user-scoped sessions. Implementations
// that do not expose it still support profile-scoped agents and memories.
type PrincipalSink interface {
	BeginForPrincipal(context.Context, string, string) (Transaction, error)
}

// PrincipalTarget is the optional read-side refinement for conflict previews.
// It keeps another principal's sessions and private memory namespaces out of
// the preview while preserving the simpler Repository contract for fakes.
type PrincipalTarget interface {
	TargetForPrincipal(context.Context, string, string) (Target, error)
}

type principalSink struct {
	sink      PrincipalSink
	principal string
}

func (s principalSink) Begin(ctx context.Context, profile string) (Transaction, error) {
	return s.sink.BeginForPrincipal(ctx, profile, s.principal)
}

type previewRecord struct {
	profile  string
	artifact ArtifactRef
	preview  Preview
}

type idempotencyRecord struct {
	hash         string
	export       *ExportResult
	importResult *ImportResult
}

// Service is the concrete application implementation of portable.API. A
// preview token is single-use and bound to both the profile and package hash;
// the process-local map deliberately avoids introducing another durable table
// until the preview lifecycle has an independent schema owner.
type Service struct {
	profile api.ProfileReader
	store   ArtifactStore
	repo    Repository

	mu          sync.Mutex
	previews    map[string]previewRecord
	idempotency map[string]idempotencyRecord
}

func NewService(profile api.ProfileReader, store ArtifactStore, repo Repository) *Service {
	return &Service{profile: profile, store: store, repo: repo, previews: map[string]previewRecord{}, idempotency: map[string]idempotencyRecord{}}
}

var _ API = (*Service)(nil)

func (s *Service) metadata(ctx context.Context, identity api.RequestIdentity, profileID, epoch, revision string) (api.ProfileMetadata, error) {
	if !identity.Valid() {
		return api.ProfileMetadata{}, api.Denied("IDENTITY_REQUIRED")
	}
	if profileID == "" {
		return api.ProfileMetadata{}, api.Invalid("PROFILE_REQUIRED")
	}
	if s.profile == nil {
		return api.ProfileMetadata{}, api.Denied("PORTABLE_UNAVAILABLE")
	}
	p, err := s.profile.ReadMetadata(ctx)
	if err != nil {
		return p, err
	}
	if p.ProfileID != profileID {
		return p, api.Denied("PROFILE_MISMATCH")
	}
	if epoch != "" && p.CommandEpoch != epoch {
		return p, &api.Fault{Kind: "CONFLICT", Reason: "COMMAND_EPOCH_CONFLICT"}
	}
	if revision != "" && p.Revision != revision {
		return p, &api.Fault{Kind: "CONFLICT", Reason: "REVISION_CONFLICT"}
	}
	return p, nil
}

func (s *Service) Export(ctx context.Context, identity api.RequestIdentity, req ExportRequest) (ExportResult, error) {
	if s.store == nil || s.repo == nil {
		return ExportResult{}, api.Denied("PORTABLE_UNAVAILABLE")
	}
	_, err := s.metadata(ctx, identity, req.ProfileID, req.CommandEpoch, req.ExpectedRevision)
	if err != nil {
		return ExportResult{}, err
	}
	key, hash := idempotencyKey(identity, "portable.export", req.IdempotencyKey, req)
	if key != "" {
		if result, found, lookupErr := s.lookupIdempotency(key, hash); lookupErr != nil {
			return ExportResult{}, lookupErr
		} else if found && result.export != nil {
			return *result.export, nil
		}
	}
	selection, err := s.repo.Snapshot(ctx, identity, req.ProfileID, req)
	if err != nil {
		return ExportResult{}, err
	}
	pkg, err := Build(selection)
	if err != nil {
		return ExportResult{}, err
	}
	ref, err := s.store.Put(ctx, pkg)
	if err != nil {
		return ExportResult{}, err
	}
	if key != "" {
		s.saveIdempotency(key, idempotencyRecord{hash: hash, export: &ExportResult{Artifact: ref}})
	}
	return ExportResult{Artifact: ref}, nil
}

func (s *Service) ImportPreview(ctx context.Context, identity api.RequestIdentity, req ImportPreviewRequest) (ImportPreviewResult, error) {
	if s.store == nil || s.repo == nil {
		return ImportPreviewResult{}, api.Denied("PORTABLE_UNAVAILABLE")
	}
	if req.Artifact.ArtifactID == "" {
		return ImportPreviewResult{}, api.Invalid("ARTIFACT_REQUIRED")
	}
	_, err := s.metadata(ctx, identity, req.ProfileID, "", "")
	if err != nil {
		return ImportPreviewResult{}, err
	}
	pkg, err := s.store.Get(ctx, req.Artifact)
	if err != nil {
		return ImportPreviewResult{}, err
	}
	var target Target
	if principalTarget, ok := s.repo.(PrincipalTarget); ok {
		target, err = principalTarget.TargetForPrincipal(ctx, req.ProfileID, identity.PrincipalID())
	} else {
		target, err = s.repo.Target(ctx, req.ProfileID)
	}
	if err != nil {
		return ImportPreviewResult{}, err
	}
	preview, err := PreviewImport(pkg, target)
	if err != nil {
		return ImportPreviewResult{}, err
	}
	token := api.NewID("portable-preview:")
	s.mu.Lock()
	s.previews[token] = previewRecord{profile: req.ProfileID, artifact: req.Artifact, preview: preview}
	s.mu.Unlock()
	conflicts := make([]ImportConflict, 0, len(preview.Conflicts))
	for _, c := range preview.Conflicts {
		revision, hash := packageEntryMetadata(pkg, c.ImportedID)
		conflicts = append(conflicts, ImportConflict{ID: c.ImportedID, Revision: revision, Hash: hash})
	}
	return ImportPreviewResult{Token: token, Conflicts: conflicts}, nil
}

func validateResolutions(preview Preview, resolutions []ImportResolution) error {
	seen := make(map[string]string, len(resolutions))
	for _, r := range resolutions {
		if r.ID == "" || (r.Action != "copy" && r.Action != "replace" && r.Action != "skip" && r.Action != "keep") {
			return api.Invalid("INVALID_IMPORT_RESOLUTION")
		}
		if _, ok := seen[r.ID]; ok {
			return api.Invalid("DUPLICATE_IMPORT_RESOLUTION")
		}
		if r.Action == "keep" {
			r.Action = "skip"
		}
		seen[r.ID] = r.Action
	}
	for _, c := range preview.Conflicts {
		if _, ok := seen[c.ImportedID]; !ok {
			return api.Invalid("IMPORT_RESOLUTION_REQUIRED")
		}
	}
	return nil
}

func (s *Service) Import(ctx context.Context, identity api.RequestIdentity, req ImportRequest) (ImportResult, error) {
	if s.store == nil || s.repo == nil {
		return ImportResult{}, api.Denied("PORTABLE_UNAVAILABLE")
	}
	if req.PreviewToken == "" {
		return ImportResult{}, api.Invalid("PREVIEW_TOKEN_REQUIRED")
	}
	key, hash := idempotencyKey(identity, "portable.import", req.IdempotencyKey, req)
	if key != "" {
		if result, found, lookupErr := s.lookupIdempotency(key, hash); lookupErr != nil {
			return ImportResult{}, lookupErr
		} else if found && result.importResult != nil {
			return *result.importResult, nil
		}
	}
	_, err := s.metadata(ctx, identity, req.ProfileID, req.CommandEpoch, req.ExpectedRevision)
	if err != nil {
		return ImportResult{}, err
	}
	s.mu.Lock()
	record, ok := s.previews[req.PreviewToken]
	s.mu.Unlock()
	if !ok {
		return ImportResult{}, &api.Fault{Kind: "CONFLICT", Reason: "PREVIEW_TOKEN_INVALID"}
	}
	if record.profile != req.ProfileID {
		return ImportResult{}, api.Denied("PROFILE_MISMATCH")
	}
	if err := validateResolutions(record.preview, req.Resolutions); err != nil {
		return ImportResult{}, err
	}
	pkg, err := s.store.Get(ctx, record.artifact)
	if err != nil {
		return ImportResult{}, err
	}
	if pkg.PackageHash != record.preview.PackageHash {
		return ImportResult{}, errors.New("portable: artifact changed after preview")
	}
	// Consume only after the caller supplied valid resolutions and the
	// immutable artifact still matches the preview. Invalid retries should be
	// able to correct their resolution without requesting a new preview.
	s.mu.Lock()
	if _, stillPending := s.previews[req.PreviewToken]; !stillPending {
		s.mu.Unlock()
		return ImportResult{}, &api.Fault{Kind: "CONFLICT", Reason: "PREVIEW_TOKEN_INVALID"}
	}
	delete(s.previews, req.PreviewToken)
	s.mu.Unlock()
	var sink Sink = s.repo
	if principal, ok := s.repo.(PrincipalSink); ok {
		sink = principalSink{sink: principal, principal: identity.PrincipalID()}
	}
	receipt, err := Import(ctx, ImportPlan{Package: pkg, Preview: record.preview, Resolutions: req.Resolutions, Confirm: true}, sink)
	if err != nil {
		return ImportResult{}, err
	}
	current, readErr := s.profile.ReadMetadata(ctx)
	if readErr != nil {
		return ImportResult{}, readErr
	}
	result := ImportResult{CommandID: req.CommandID, ReceiptID: receipt.ReceiptID, Revision: current.Revision}
	if key != "" {
		s.saveIdempotency(key, idempotencyRecord{hash: hash, importResult: &result})
	}
	return result, nil
}

func idempotencyKey(identity api.RequestIdentity, method, provided string, input any) (string, string) {
	if provided == "" {
		return "", ""
	}
	b, _ := json.Marshal(input)
	digest := sha256.Sum256(b)
	return identity.ConnectionID() + "\x00" + identity.PrincipalID() + "\x00" + method + "\x00" + provided, "sha256:" + hex.EncodeToString(digest[:])
}

func (s *Service) lookupIdempotency(key, hash string) (idempotencyRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.idempotency[key]
	if !ok {
		return idempotencyRecord{}, false, nil
	}
	if record.hash != hash {
		return idempotencyRecord{}, false, &api.Fault{Kind: "IDEMPOTENCY_CONFLICT", Reason: "IDEMPOTENCY_INPUT_MISMATCH"}
	}
	return record, true, nil
}

func (s *Service) saveIdempotency(key string, record idempotencyRecord) {
	s.mu.Lock()
	s.idempotency[key] = record
	s.mu.Unlock()
}

func packageEntryMetadata(p Package, id string) (string, string) {
	for _, a := range p.Agents {
		if a.ID == id {
			return a.Revision, manifestHash(p, "agent", id)
		}
	}
	for _, s := range p.Sessions {
		if s.ID == id {
			return "", manifestHash(p, "session", id)
		}
	}
	for _, m := range p.Memories {
		if m.ID == id {
			return "", manifestHash(p, "memory", id)
		}
	}
	return "", ""
}

func manifestHash(p Package, kind, id string) string {
	for _, entry := range p.Manifest {
		if entry.Kind == kind && entry.ID == id {
			return entry.Hash
		}
	}
	return ""
}
