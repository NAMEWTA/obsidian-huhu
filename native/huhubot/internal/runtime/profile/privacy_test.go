package profile

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestEnsurePrivateLeavesUnixWorldModeDenied(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip()
	}
	dir := filepath.Join(t.TempDir(), "broad")
	if err := os.Mkdir(dir, 0o777); err != nil {
		t.Fatal(err)
	}
	if err := EnsurePrivate(dir); err == nil {
		t.Fatal("expected private-storage denial")
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0o077 == 0 {
		t.Fatal("EnsurePrivate tightened a directory it does not claim")
	}
}

func TestEnsurePrivateClaimsCurrentWindowsOwner(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip()
	}
	dir := filepath.Join(t.TempDir(), "owned")
	if err := os.Mkdir(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := EnsurePrivate(dir); err != nil {
		t.Fatal(err)
	}
	if err := PermissionsArePrivate(dir); err != nil {
		t.Fatal(err)
	}
}

func TestPublicationDropsTemporaryHardlink(t *testing.T) {
	dir := t.TempDir()
	// profile.sqlite3 does not fit 8.3. On a Windows volume that still
	// generates short names, that alias must not be reported as a hard link.
	name := filepath.Join(dir, "profile.sqlite3")
	f, isNew, unlock, err := openLockedDatabase(name)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	defer unlock()
	if !isNew {
		t.Fatal("expected a new database")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != "profile.sqlite3" {
		got := make([]string, len(entries))
		for i, entry := range entries {
			got[i] = entry.Name()
		}
		t.Fatalf("temporary publication name still exists: %v", got)
	}
	if err = verifySingleLink(f); err != nil {
		t.Fatal(err)
	}
	alias := filepath.Join(dir, "alias.db")
	if err = os.Link(name, alias); err != nil {
		t.Fatal(err)
	}
	err = verifySingleLink(f)
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Reason != "PROFILE_DB_HARDLINK_UNSAFE" {
		t.Fatal(err)
	}
	if err = os.Remove(alias); err != nil {
		t.Fatal(err)
	}
	if err = verifySingleLink(f); err != nil {
		t.Fatal(err)
	}
}

func TestLockDatabaseRejectsSecondOpen(t *testing.T) {
	f, err := os.CreateTemp(t.TempDir(), "profile-lock")
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	unlock, err := lockDatabase(f)
	if err != nil {
		t.Fatal(err)
	}
	defer unlock()
	g, err := os.OpenFile(f.Name(), os.O_RDWR, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer g.Close()
	_, err = lockDatabase(g)
	var fault *api.Fault
	if !errors.As(err, &fault) || fault.Kind != "INSTANCE_CONFLICT" || fault.Reason != "PROFILE_ALREADY_OPEN" {
		t.Fatal(err)
	}
}
