//go:build linux || darwin

package stdio

import (
	"golang.org/x/sys/unix"
	"io"
	"os"
	"time"
)

// Inherited stdout is normally non-pollable. Give the writer an owned,
// non-inheritable pollable duplicate so deadlines physically interrupt Write.
func prepareOutput(output io.WriteCloser) (io.WriteCloser, error) {
	file, ok := output.(*os.File)
	if !ok {
		return output, nil
	}
	var stat unix.Stat_t
	if e := unix.Fstat(int(file.Fd()), &stat); e != nil {
		return nil, e
	}
	if stat.Mode&unix.S_IFMT != unix.S_IFIFO && stat.Mode&unix.S_IFMT != unix.S_IFSOCK {
		return output, nil
	}
	fd, e := unix.Dup(int(file.Fd()))
	if e != nil {
		return nil, e
	}
	unix.CloseOnExec(fd)
	if e = unix.SetNonblock(fd, true); e != nil {
		_ = unix.Close(fd)
		return nil, e
	}
	copy := os.NewFile(uintptr(fd), "huhu-hap-output")
	if copy == nil {
		_ = unix.Close(fd)
		return nil, os.ErrInvalid
	}
	if e = copy.SetWriteDeadline(time.Time{}); e != nil {
		_ = copy.Close()
		return nil, e
	}
	return copy, nil
}
