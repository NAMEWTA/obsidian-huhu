//go:build linux || darwin

package profile

import (
	"os"
	"syscall"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func verifyPrivate(_ string, info os.FileInfo, _ bool) error {
	if info.Mode().Perm()&0077 != 0 {
		return api.Denied("PROFILE_PERMISSIONS_NOT_PRIVATE")
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok || stat.Uid != uint32(os.Geteuid()) {
		return api.Denied("PROFILE_OWNER_MISMATCH")
	}
	return nil
}
func protectNew(string, bool) error { return nil }

func createPublicationFile(dir string) (*os.File, error) {
	return os.CreateTemp(dir, ".profile-init-")
}

func retargetPublication(temp *os.File, _ string) (*os.File, error) {
	return temp, nil
}

// A Unix mode of 0777 is not claimable. Tightening it would hide a directory
// this process did not create as private storage.
func claimable(string) bool { return false }

func verifySingleLink(f *os.File) error {
	info, err := f.Stat()
	if err != nil {
		return err
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return api.Denied("PROFILE_DB_IDENTITY_UNAVAILABLE")
	}
	if stat.Nlink != 1 {
		return api.Denied("PROFILE_DB_HARDLINK_UNSAFE")
	}
	return nil
}
