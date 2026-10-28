package portable

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

const (
	artifactMediaType = "application/vnd.huhu.portable+json"
	artifactDirectory = "portable/artifacts"
)

// ArtifactStore keeps package bytes below the profile directory. Artifact IDs
// are opaque to the application and resolve only to files created by this
// adapter; callers cannot provide an arbitrary path.
type ArtifactStore struct {
	root    string
	profile string
}

func NewArtifactStore(profileDirectory string) *ArtifactStore {
	return &ArtifactStore{root: filepath.Join(profileDirectory, artifactDirectory), profile: profileDirectory}
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
	directory, err := s.openRoot(true)
	if err != nil {
		return contract.ArtifactRef{}, err
	}
	defer directory.Close()
	name := filepath.Base(path)
	temporary := ".publishing-" + name
	f, err := directory.OpenFile(temporary, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return contract.ArtifactRef{}, err
	}
	defer directory.Remove(temporary)
	if _, err = f.Write(b); err == nil {
		err = f.Sync()
	}
	if ce := f.Close(); err == nil {
		err = ce
	}
	if err != nil {
		return contract.ArtifactRef{}, err
	}
	if err = ctx.Err(); err != nil {
		return contract.ArtifactRef{}, err
	}
	if err = directory.Link(temporary, name); err != nil {
		return contract.ArtifactRef{}, err
	}
	if runtime.GOOS != "windows" {
		d, e := directory.Open(".")
		if e != nil {
			return contract.ArtifactRef{}, e
		}
		err = d.Sync()
		_ = d.Close()
		if err != nil {
			return contract.ArtifactRef{}, err
		}
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
	directory, err := s.openRoot(false)
	if err != nil {
		return contract.Package{}, err
	}
	defer directory.Close()
	name := filepath.Base(path)
	info, err := directory.Lstat(name)
	if err != nil || !info.Mode().IsRegular() || info.Mode()&os.ModeSymlink != 0 {
		return contract.Package{}, errors.New("portable: artifact target invalid")
	}
	if info.Size() <= 0 || info.Size() > contract.MaxPackageBytes {
		return contract.Package{}, errors.New("portable: artifact size invalid")
	}
	f, err := directory.Open(name)
	if err != nil {
		return contract.Package{}, err
	}
	data, err := io.ReadAll(io.LimitReader(f, contract.MaxPackageBytes+1))
	closeErr := f.Close()
	if err != nil {
		return contract.Package{}, err
	}
	if closeErr != nil {
		return contract.Package{}, closeErr
	}
	if err = ctx.Err(); err != nil {
		return contract.Package{}, err
	}
	p, err := Decode(data)
	if err != nil {
		return contract.Package{}, err
	}
	if ref.Size != "" && strconv.Itoa(len(data)) != ref.Size {
		return contract.Package{}, errors.New("portable: artifact size mismatch")
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

// The rooted descriptor prevents an ancestor replacement from redirecting I/O
// outside this Profile even after the explicit no-symlink checks.
func (s *ArtifactStore) openRoot(create bool) (*os.Root, error) {
	info, err := os.Lstat(s.profile)
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return nil, errors.New("portable: profile directory invalid")
	}
	root, err := os.OpenRoot(s.profile)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	for _, name := range []string{"portable", artifactDirectory} {
		info, err = root.Lstat(name)
		if os.IsNotExist(err) && create {
			err = root.Mkdir(name, 0700)
			if err != nil && !os.IsExist(err) {
				return nil, err
			}
			info, err = root.Lstat(name)
		}
		if err != nil {
			return nil, err
		}
		if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
			return nil, errors.New("portable: managed directory invalid")
		}
	}
	return root.OpenRoot(artifactDirectory)
}

// Stage validates the complete archive before it can become a managed artifact.
func (s *ArtifactStore) Stage(ctx context.Context, data []byte) (contract.ArtifactRef, error) {
	pkg, err := Decode(data)
	if err != nil {
		return contract.ArtifactRef{}, api.Invalid("PORTABLE_ARCHIVE_INVALID")
	}
	return s.Put(ctx, pkg)
}
