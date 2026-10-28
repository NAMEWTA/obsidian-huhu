//go:build windows

package credentials

import (
	"io"
	"os"
	"unsafe"

	"golang.org/x/sys/windows"
)

type startupInfo struct {
	Cb                                                                 uint32
	Reserved, Desktop, Title                                           *uint16
	X, Y, XSize, YSize, XCountChars, YCountChars, FillAttribute, Flags uint32
	ShowWindow, Reserved2Length                                        uint16
	Reserved2                                                          *byte
	StdInput, StdOutput, StdError                                      windows.Handle
}

func OpenManagedChannel() (io.ReadCloser, io.WriteCloser, error) {
	var info startupInfo
	info.Cb = uint32(unsafe.Sizeof(info))
	windows.NewLazySystemDLL("kernel32.dll").NewProc("GetStartupInfoW").Call(uintptr(unsafe.Pointer(&info)))
	if info.Reserved2 == nil || info.Reserved2Length < 4 {
		return nil, nil, errProtocol
	}
	handles, err := parseCRTTable(unsafe.Slice(info.Reserved2, int(info.Reserved2Length)), int(unsafe.Sizeof(uintptr(0))))
	if err != nil {
		return nil, nil, errProtocol
	}
	current := windows.CurrentProcess()
	copies := make([]windows.Handle, 0, 2)
	for _, raw := range handles {
		source := windows.Handle(raw)
		kind, e := windows.GetFileType(source)
		if e != nil || kind != windows.FILE_TYPE_PIPE {
			for _, h := range copies {
				_ = windows.CloseHandle(h)
			}
			return nil, nil, errProtocol
		}
		var target windows.Handle
		if e = windows.DuplicateHandle(current, source, current, &target, 0, false, windows.DUPLICATE_SAME_ACCESS); e != nil {
			for _, h := range copies {
				_ = windows.CloseHandle(h)
			}
			return nil, nil, errProtocol
		}
		if e = windows.SetHandleInformation(target, windows.HANDLE_FLAG_INHERIT, 0); e != nil {
			_ = windows.CloseHandle(target)
			for _, h := range copies {
				_ = windows.CloseHandle(h)
			}
			return nil, nil, errProtocol
		}
		copies = append(copies, target)
	}
	r := os.NewFile(uintptr(copies[0]), "huhu-private-request")
	w := os.NewFile(uintptr(copies[1]), "huhu-private-receipt")
	if r == nil || w == nil {
		for _, h := range copies {
			_ = windows.CloseHandle(h)
		}
		return nil, nil, errProtocol
	}
	for _, raw := range handles {
		_ = windows.CloseHandle(windows.Handle(raw))
	}
	return r, w, nil
}
