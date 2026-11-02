package portable

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestArtifactStoreRoundTripIsOpaqueAndPrivate(t *testing.T) {
	root := t.TempDir()
	store := NewArtifactStore(root)
	pkg, err := contract.Build(contract.Selection{SourceProfile: "profile:test"})
	if err != nil {
		t.Fatal(err)
	}
	ref, err := store.Put(context.Background(), pkg)
	if err != nil {
		t.Fatal(err)
	}
	if ref.ArtifactID == "" || ref.MediaType == "" || ref.Size == "" {
		t.Fatalf("incomplete opaque reference: %+v", ref)
	}
	got, err := store.Get(context.Background(), ref)
	if err != nil {
		t.Fatal(err)
	}
	if got.PackageHash != pkg.PackageHash || got.SourceProfile != pkg.SourceProfile {
		t.Fatalf("round trip mismatch: got=%+v want=%+v", got, pkg)
	}
	if err := profile.PermissionsArePrivate(filepath.Join(root, filepath.FromSlash(artifactDirectory))); err != nil {
		t.Fatalf("artifact directory is not private: %v", err)
	}
	if _, err := store.Get(context.Background(), contract.ArtifactRef{ArtifactID: "../profile.db"}); err == nil {
		t.Fatal("path traversal artifact id accepted")
	}
}

func TestArtifactStoreRejectsSymlinkedAncestors(t *testing.T) {
	for _, component := range []string{"portable", "artifacts"} {
		t.Run(component, func(t *testing.T) {
			profile, external := t.TempDir(), t.TempDir()
			if component == "artifacts" {
				if err := os.Mkdir(filepath.Join(profile, "portable"), 0700); err != nil {
					t.Fatal(err)
				}
			}
			link := filepath.Join(profile, "portable")
			if component == "artifacts" {
				link = filepath.Join(link, "artifacts")
			}
			if err := os.Symlink(external, link); err != nil {
				t.Skip("symlink unavailable", err)
			}
			pkg, err := contract.Build(contract.Selection{SourceProfile: "profile:symlink"})
			if err != nil {
				t.Fatal(err)
			}
			if _, err = NewArtifactStore(profile).Put(context.Background(), pkg); err == nil {
				t.Fatal("managed artifact escaped through ancestor symlink")
			}
			files, err := os.ReadDir(external)
			if err != nil || len(files) != 0 {
				t.Fatal("untrusted ancestor caused external writes", files, err)
			}
			other := NewArtifactStore(t.TempDir())
			ref, err := other.Put(context.Background(), pkg)
			if err != nil {
				t.Fatal(err)
			}
			path, err := other.path(ref.ArtifactID)
			if err != nil {
				t.Fatal(err)
			}
			bytes, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			if err = os.WriteFile(filepath.Join(external, filepath.Base(path)), bytes, 0600); err != nil {
				t.Fatal(err)
			}
			if component == "portable" {
				if err = os.Mkdir(filepath.Join(external, "artifacts"), 0700); err != nil {
					t.Fatal(err)
				}
				if err = os.WriteFile(filepath.Join(external, "artifacts", filepath.Base(path)), bytes, 0600); err != nil {
					t.Fatal(err)
				}
			}
			if _, err = NewArtifactStore(profile).Get(context.Background(), ref); err == nil {
				t.Fatal("managed artifact read escaped through ancestor symlink")
			}
		})
	}
}
