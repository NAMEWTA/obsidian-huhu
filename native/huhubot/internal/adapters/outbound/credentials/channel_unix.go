//go:build linux || darwin

package credentials

import (
	"io"
	"os"

	"golang.org/x/sys/unix"
)

// OpenManagedChannel takes ownership of inherited fd3/fd4 only after the CLI
// validates --managed. Duplicates are non-inheritable and pollable, so closing
// them interrupts idle, partial-frame and slow-consumer I/O during shutdown.
func OpenManagedChannel() (io.ReadCloser, io.WriteCloser, error) {
	files := make([]*os.File, 0, 2)
	for i, fd := range []int{3, 4} {
		var st unix.Stat_t
		flags, e := unix.FcntlInt(uintptr(fd), unix.F_GETFL, 0)
		if err := unix.Fstat(fd, &st); err != nil || e != nil || (st.Mode&unix.S_IFMT != unix.S_IFIFO && st.Mode&unix.S_IFMT != unix.S_IFSOCK) || i == 0 && flags&unix.O_ACCMODE == unix.O_WRONLY || i == 1 && flags&unix.O_ACCMODE == unix.O_RDONLY {
			for _, f := range files {
				_ = f.Close()
			}
			return nil, nil, errProtocol
		}
		dup, err := unix.Dup(fd)
		if err != nil {
			for _, f := range files {
				_ = f.Close()
			}
			return nil, nil, errProtocol
		}
		unix.CloseOnExec(dup)
		if err = unix.SetNonblock(dup, true); err != nil {
			_ = unix.Close(dup)
			for _, f := range files {
				_ = f.Close()
			}
			return nil, nil, errProtocol
		}
		f := os.NewFile(uintptr(dup), "huhu-private-credential")
		if f == nil {
			_ = unix.Close(dup)
			for _, f := range files {
				_ = f.Close()
			}
			return nil, nil, errProtocol
		}
		files = append(files, f)
	}
	_ = unix.Close(3)
	_ = unix.Close(4)
	return files[0], files[1], nil
}
