//go:build linux || darwin

package profile

import (
	"errors"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"golang.org/x/sys/unix"
	"os"
	"syscall"
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
func lockDatabase(f *os.File) (func() error, error) {
	if err := unix.Flock(int(f.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		if errors.Is(err, unix.EWOULDBLOCK) || errors.Is(err, unix.EAGAIN) {
			return nil, &api.Fault{Kind: "INSTANCE_CONFLICT", Reason: "PROFILE_ALREADY_OPEN"}
		}
		return nil, fmt.Errorf("profile instance lock unavailable")
	}
	return func() error { return unix.Flock(int(f.Fd()), unix.LOCK_UN) }, nil
}

func protectNew(string, bool) error { return nil }

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
