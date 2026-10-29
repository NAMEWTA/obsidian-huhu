//go:build darwin

package profile

import (
	"errors"
	"fmt"
	"os"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"golang.org/x/sys/unix"
)

// Darwin implements flock(2) with fcntl byte-range locks. Those collide with
// the OFD locks SQLite places at 0x40000000, so PRAGMA quick_check then fails
// closed as PROFILE_DB_CORRUPT. A one-byte OFD lock at offset 0 is outside
// that range and stays with this open file description.
const fOfdSetlk = 90

func lockDatabase(f *os.File) (func() error, error) {
	if err := ofdLock(f, unix.F_WRLCK); err != nil {
		if errors.Is(err, unix.EAGAIN) || errors.Is(err, unix.EWOULDBLOCK) {
			return nil, &api.Fault{Kind: "INSTANCE_CONFLICT", Reason: "PROFILE_ALREADY_OPEN"}
		}
		return nil, fmt.Errorf("profile instance lock unavailable")
	}
	return func() error { return ofdLock(f, unix.F_UNLCK) }, nil
}

func ofdLock(f *os.File, kind int16) error {
	lk := unix.Flock_t{Start: 0, Len: 1, Type: kind, Whence: 0}
	for {
		err := unix.FcntlFlock(f.Fd(), fOfdSetlk, &lk)
		if err != unix.EINTR {
			return err
		}
	}
}
