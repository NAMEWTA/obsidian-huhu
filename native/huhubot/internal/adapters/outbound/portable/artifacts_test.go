package portable

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
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
	info, err := os.Stat(filepath.Join(root, artifactDirectory))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0077 != 0 {
		t.Fatalf("artifact directory is too broad: %o", info.Mode().Perm())
	}
	if _, err := store.Get(context.Background(), contract.ArtifactRef{ArtifactID: "../profile.db"}); err == nil {
		t.Fatal("path traversal artifact id accepted")
	}
}
