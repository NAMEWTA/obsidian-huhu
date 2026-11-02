//go:build windows

package base

import (
	"encoding/binary"
	"os"

	"golang.org/x/sys/windows"
)

// FILE_STANDARD_INFO.AllocationSize is disk allocation, distinct from EOF.
// Layout/source: https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info
// x/sys exposes the Win32 call; no external implementation is copied.
func storageAllocatedBytes(path string) (int64, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	var info [24]byte
	err = windows.GetFileInformationByHandleEx(windows.Handle(f.Fd()), windows.FileStandardInfo, &info[0], uint32(len(info)))
	return int64(binary.LittleEndian.Uint64(info[:8])), err
}
