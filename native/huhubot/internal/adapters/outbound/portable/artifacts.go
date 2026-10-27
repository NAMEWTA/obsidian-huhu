package portable

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

const (
	artifactMediaType = "application/vnd.huhu.portable+json"
	artifactDirectory = "portable/artifacts"
)

// ArtifactStore keeps package bytes below the profile directory. Artifact IDs
// are opaque to the application and resolve only to files created by this
// adapter; callers cannot provide an arbitrary path.
type ArtifactStore struct{ root string }

func NewArtifactStore(profileDirectory string) *ArtifactStore {
	return &ArtifactStore{root: filepath.Join(profileDirectory, artifactDirectory)}
}

var _ contract.ArtifactStore = (*ArtifactStore)(nil)

func (s *ArtifactStore) Put(ctx context.Context, p contract.Package) (contract.ArtifactRef, error) {
	if s == nil || s.root == "" {
		return contract.ArtifactRef{}, errors.New("portable: artifact store unavailable")
	}
	b, err := Encode(p)
	if err != nil {
		return contract.ArtifactRef{}, err
	}
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return contract.ArtifactRef{}, fmt.Errorf("portable: artifact id: %w", err)
	}
	id := "artifact:" + hex.EncodeToString(raw[:])
	path, err := s.path(id)
	if err != nil {
		return contract.ArtifactRef{}, err
	}
	if err := WriteFile(ctx, path, p); err != nil {
		return contract.ArtifactRef{}, err
	}
	return contract.ArtifactRef{ArtifactID: id, MediaType: artifactMediaType, Size: strconv.Itoa(len(b))}, nil
}

func (s *ArtifactStore) Get(ctx context.Context, ref contract.ArtifactRef) (contract.Package, error) {
	if s == nil || s.root == "" {
		return contract.Package{}, errors.New("portable: artifact store unavailable")
	}
	if ref.MediaType != "" && ref.MediaType != artifactMediaType {
		return contract.Package{}, errors.New("portable: artifact media type unsupported")
	}
	path, err := s.path(ref.ArtifactID)
	if err != nil {
		return contract.Package{}, err
	}
	p, err := ReadFile(ctx, path)
	if err != nil {
		return contract.Package{}, err
	}
	if ref.Size != "" {
		info, statErr := os.Stat(path)
		if statErr != nil || strconv.FormatInt(info.Size(), 10) != ref.Size {
			return contract.Package{}, errors.New("portable: artifact size mismatch")
		}
	}
	return p, nil
}

func (s *ArtifactStore) path(id string) (string, error) {
	if !strings.HasPrefix(id, "artifact:") || len(id) != len("artifact:")+32 {
		return "", errors.New("portable: invalid artifact id")
	}
	for _, r := range id[len("artifact:"):] {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f')) {
			return "", errors.New("portable: invalid artifact id")
		}
	}
	return filepath.Join(s.root, id[len("artifact:"):]+".json"), nil
}
