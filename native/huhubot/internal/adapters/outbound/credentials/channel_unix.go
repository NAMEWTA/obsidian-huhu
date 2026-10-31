//go:build linux || darwin

package credentials

import (
	"errors"
	"io"
	"os"
	"syscall"
	"time"

	"golang.org/x/sys/unix"
)

// OpenManagedChannel takes ownership of inherited fd3/fd4 only after the CLI
// validates --managed. Duplicates are non-inheritable and pollable, so closing
// them interrupts idle, partial-frame and slow-consumer I/O during shutdown.
func OpenManagedChannel() (io.ReadCloser, io.WriteCloser, error) {
	files := make([]*os.File, 0, 2)
	raw := make([]int, 0, 2)
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
		raw = append(raw, dup)
	}
	// The poller is what lets Close interrupt an idle read. If it rejected the
	// fifo, leave the descriptor blocking: a nonblocking read would return
	// EAGAIN, and that must not be treated as a rejected channel.
	for i, file := range files {
		if err := ensureWaiting(file, raw[i], i == 0); err != nil {
			for _, open := range files {
				_ = open.Close()
			}
			return nil, nil, errProtocol
		}
	}
	_ = unix.Close(3)
	_ = unix.Close(4)
	return files[0], files[1], nil
}

func ensureWaiting(file *os.File, fd int, read bool) error {
	var err error
	if read {
		err = file.SetReadDeadline(time.Time{})
	} else {
		err = file.SetWriteDeadline(time.Time{})
	}
	if err == nil {
		return nil
	}
	return unix.SetNonblock(fd, false)
}

func wouldBlock(err error) bool {
	return errors.Is(err, errWouldBlock) || errors.Is(err, syscall.EAGAIN) || errors.Is(err, syscall.EWOULDBLOCK) || errors.Is(err, syscall.EINTR)
}

func waitFile(r io.Reader) error {
	file, ok := r.(*os.File)
	if !ok {
		return errNotFile
	}
	raw, err := file.SyscallConn()
	if err != nil {
		return err
	}
	var perr error
	if err = raw.Control(func(fd uintptr) {
		_, perr = unix.Poll([]unix.PollFd{{Fd: int32(fd), Events: unix.POLLIN | unix.POLLHUP}}, 200)
	}); err != nil {
		return err
	}
	if perr != nil && perr != unix.EINTR {
		return perr
	}
	return nil
}
