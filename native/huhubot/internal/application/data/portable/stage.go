package portable

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

const StageChunkBytes = 256 * 1024
const stageSlots = 4
const stageTTL = 5 * time.Minute

type StageRequest struct {
	ProfileID    string `json:"profileId"`
	CommandEpoch string `json:"commandEpoch"`
	UploadID     string `json:"uploadId,omitempty"`
	Size         string `json:"size"`
	Offset       string `json:"offset"`
	DataBase64   string `json:"dataBase64"`
	Final        bool   `json:"final"`
}
type StageResult struct {
	UploadID   string       `json:"uploadId"`
	NextOffset string       `json:"nextOffset"`
	Artifact   *ArtifactRef `json:"artifact,omitempty"`
}
type StageAPI interface {
	Stage(context.Context, api.RequestIdentity, StageRequest) (StageResult, error)
}

// ArtifactStager keeps package parsing/encoding in the outbound artifact adapter.
type ArtifactStager interface {
	Stage(context.Context, []byte) (ArtifactRef, error)
}
type stagedUpload struct {
	profile, principal, connection, epoch string
	size, used                            int
	data                                  []byte
	expires                               time.Time
	artifact                              *ArtifactRef
	finalOffset, finalBytes               int
	finalHash                             [32]byte
}

func canonicalSize(text string, positive bool) (int, error) {
	value, err := strconv.ParseInt(text, 10, 64)
	if err != nil || value < 0 || value > MaxPackageBytes || strconv.FormatInt(value, 10) != text || positive && value == 0 {
		return 0, api.Invalid("PORTABLE_UPLOAD_SIZE_INVALID")
	}
	return int(value), nil
}
func (s *Service) dropUpload(id string) {
	u := s.uploads[id]
	if u == nil {
		return
	}
	if u.data != nil {
		clear(u.data)
		s.uploadBytes -= len(u.data)
	}
	delete(s.uploads, id)
}

// DiscardEphemeral is called by the cleanup owner while holding the shared
// data gate. Old imports/partials cannot survive a successful body erasure.
func (s *Service) DiscardEphemeral() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id := range s.uploads {
		s.dropUpload(id)
	}
	clear(s.previews)
	clear(s.idempotency)
}
func (s *Service) Stage(ctx context.Context, id api.RequestIdentity, q StageRequest) (out StageResult, err error) {
	err = s.gate.Run(ctx, func(ctx context.Context) error { var e error; out, e = s.stage(ctx, id, q); return e })
	return
}
func (s *Service) stage(ctx context.Context, id api.RequestIdentity, q StageRequest) (StageResult, error) {
	if err := s.admission(ctx, id, q.ProfileID); err != nil {
		return StageResult{}, err
	}
	epoch, e := strconv.ParseInt(q.CommandEpoch, 10, 64)
	if e != nil || epoch <= 0 || strconv.FormatInt(epoch, 10) != q.CommandEpoch {
		return StageResult{}, api.Invalid("INVALID_COMMAND_EPOCH")
	}
	if _, err := s.metadata(ctx, id, q.ProfileID, q.CommandEpoch, ""); err != nil {
		return StageResult{}, err
	}
	size, err := canonicalSize(q.Size, true)
	if err != nil {
		return StageResult{}, err
	}
	offset, err := canonicalSize(q.Offset, false)
	if err != nil {
		return StageResult{}, err
	}
	if len(q.DataBase64) > base64.StdEncoding.EncodedLen(StageChunkBytes) {
		return StageResult{}, api.Invalid("PORTABLE_UPLOAD_CHUNK_LIMIT")
	}
	chunk, err := base64.StdEncoding.Strict().DecodeString(q.DataBase64)
	if err != nil || len(chunk) > StageChunkBytes || base64.StdEncoding.EncodeToString(chunk) != q.DataBase64 {
		return StageResult{}, api.Invalid("PORTABLE_UPLOAD_CHUNK_INVALID")
	}
	defer clear(chunk)
	if !q.Final && len(chunk) == 0 {
		return StageResult{}, api.Invalid("PORTABLE_UPLOAD_CHUNK_EMPTY")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for key, u := range s.uploads {
		if !now.Before(u.expires) {
			s.dropUpload(key)
		}
	}
	uploadID := q.UploadID
	if uploadID == "" {
		if offset != 0 {
			return StageResult{}, api.Invalid("PORTABLE_UPLOAD_OFFSET_INVALID")
		}
		for key, u := range s.uploads {
			if u.artifact != nil {
				s.dropUpload(key)
			}
		}
		if len(s.uploads) >= stageSlots || s.uploadBytes+size > MaxPackageBytes {
			return StageResult{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "PORTABLE_UPLOAD_LIMIT"}
		}
		uploadID = api.NewID("upload:")
		s.uploads[uploadID] = &stagedUpload{profile: q.ProfileID, principal: id.PrincipalID(), connection: id.ConnectionID(), epoch: q.CommandEpoch, size: size, data: make([]byte, size), expires: now.Add(stageTTL)}
		s.uploadBytes += size
	}
	upload := s.uploads[uploadID]
	if upload == nil {
		return StageResult{}, &api.Fault{Kind: "NOT_FOUND", Reason: "PORTABLE_UPLOAD_NOT_FOUND"}
	}
	if upload.profile != q.ProfileID || upload.principal != id.PrincipalID() || upload.connection != id.ConnectionID() || upload.epoch != q.CommandEpoch || upload.size != size {
		return StageResult{}, api.Denied("PORTABLE_UPLOAD_OWNER_MISMATCH")
	}
	hash := sha256.Sum256(chunk)
	result := StageResult{UploadID: uploadID, NextOffset: strconv.Itoa(upload.used), Artifact: upload.artifact}
	if upload.artifact != nil {
		if q.Final && offset == upload.finalOffset && len(chunk) == upload.finalBytes && hash == upload.finalHash {
			return result, nil
		}
		return StageResult{}, &api.Fault{Kind: "IDEMPOTENCY_CONFLICT", Reason: "PORTABLE_UPLOAD_CHUNK_CHANGED"}
	}
	if offset > upload.used || offset+len(chunk) > upload.size {
		return StageResult{}, api.Invalid("PORTABLE_UPLOAD_OFFSET_INVALID")
	}
	if offset < upload.used {
		if offset+len(chunk) > upload.used || !bytes.Equal(upload.data[offset:offset+len(chunk)], chunk) {
			return StageResult{}, &api.Fault{Kind: "IDEMPOTENCY_CONFLICT", Reason: "PORTABLE_UPLOAD_CHUNK_CHANGED"}
		}
	} else {
		copy(upload.data[offset:], chunk)
		upload.used += len(chunk)
	}
	result.NextOffset = strconv.Itoa(upload.used)
	if !q.Final {
		return result, nil
	}
	if upload.used != upload.size || offset+len(chunk) != upload.size {
		return StageResult{}, api.Invalid("PORTABLE_UPLOAD_INCOMPLETE")
	}
	stager, ok := s.store.(ArtifactStager)
	if !ok {
		s.dropUpload(uploadID)
		return StageResult{}, api.Denied("PORTABLE_UPLOAD_UNAVAILABLE")
	}
	artifact, err := stager.Stage(ctx, upload.data[:upload.used])
	if err != nil {
		s.dropUpload(uploadID)
		return StageResult{}, err
	}
	clear(upload.data)
	s.uploadBytes -= len(upload.data)
	upload.data = nil
	upload.artifact = &artifact
	upload.finalOffset = offset
	upload.finalBytes = len(chunk)
	upload.finalHash = hash
	result.Artifact = &artifact
	return result, nil
}
