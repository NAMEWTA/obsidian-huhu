//go:build linux

package profile

import (
	"errors"
	"fmt"
	"os"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"golang.org/x/sys/unix"
)

func lockDatabase(f *os.File) (func() error, error) {
	if err := unix.Flock(int(f.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		if errors.Is(err, unix.EWOULDBLOCK) || errors.Is(err, unix.EAGAIN) {
			return nil, &api.Fault{Kind: "INSTANCE_CONFLICT", Reason: "PROFILE_ALREADY_OPEN"}
		}
		return nil, fmt.Errorf("profile instance lock unavailable")
	}
	return func() error { return unix.Flock(int(f.Fd()), unix.LOCK_UN) }, nil
}
