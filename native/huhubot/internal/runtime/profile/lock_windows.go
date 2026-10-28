//go:build windows

package profile

import (
	"errors"
	"fmt"
	"os"
	"unsafe"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"golang.org/x/sys/windows"
)

func currentSID() (*windows.SID, error) {
	u, err := windows.GetCurrentProcessToken().GetTokenUser()
	if err != nil {
		return nil, err
	}
	return u.User.Sid.Copy()
}
func protectNew(path string, isDir bool) error {
	sid, err := currentSID()
	if err != nil {
		return err
	}
	flags := ""
	if isDir {
		flags = "OICI"
	}
	descriptor, err := windows.SecurityDescriptorFromString("D:P(A;" + flags + ";FA;;;" + sid.String() + ")")
	if err != nil {
		return err
	}
	dacl, _, err := descriptor.DACL()
	if err != nil {
		return err
	}
	return windows.SetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, dacl, nil)
}
func verifyPrivate(path string, _ os.FileInfo, _ bool) error {
	sid, err := currentSID()
	if err != nil {
		return api.Denied("PROFILE_OWNER_UNAVAILABLE")
	}
	sd, err := windows.GetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION|windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		return api.Denied("PROFILE_ACL_UNAVAILABLE")
	}
	owner, _, err := sd.Owner()
	if err != nil || !owner.Equals(sid) {
		return api.Denied("PROFILE_OWNER_MISMATCH")
	}
	dacl, _, err := sd.DACL()
	if err != nil || dacl == nil {
		return api.Denied("PROFILE_PERMISSIONS_NOT_PRIVATE")
	}
	// Require every access-allow entry to name the current user. Unknown ACE types
	// are conservatively rejected; ACL mutation is limited to newly created objects.
	for i := uint32(0); i < uint32(dacl.AceCount); i++ {
		var ace *windows.ACCESS_ALLOWED_ACE
		if windows.GetAce(dacl, i, &ace) != nil || ace.Header.AceType != windows.ACCESS_ALLOWED_ACE_TYPE {
			return api.Denied("PROFILE_PERMISSIONS_NOT_PRIVATE")
		}
		aceSID := (*windows.SID)(unsafe.Pointer(&ace.SidStart))
		if !aceSID.Equals(sid) {
			return api.Denied("PROFILE_PERMISSIONS_NOT_PRIVATE")
		}
	}
	if dacl.AceCount == 0 {
		return api.Denied("PROFILE_PERMISSIONS_NOT_PRIVATE")
	}
	return nil
}
func lockDatabase(f *os.File) (func() error, error) {
	var info windows.ByHandleFileInformation
	if err := windows.GetFileInformationByHandle(windows.Handle(f.Fd()), &info); err != nil {
		return nil, err
	}
	sid, err := currentSID()
	if err != nil {
		return nil, err
	}
	// A global per-user kernel mutex uses real volume/file identity, so different
	// path spellings, symlinks, hardlinks and user sessions share one lifetime lock.
	name, err := windows.UTF16PtrFromString(fmt.Sprintf("Global\\HUHU-profile-%s-%08x-%08x%08x", sid.String(), info.VolumeSerialNumber, info.FileIndexHigh, info.FileIndexLow))
	if err != nil {
		return nil, err
	}
	sd, err := windows.SecurityDescriptorFromString("D:P(A;;GA;;;" + sid.String() + ")")
	if err != nil {
		return nil, err
	}
	sa := windows.SecurityAttributes{Length: uint32(unsafe.Sizeof(windows.SecurityAttributes{})), SecurityDescriptor: sd}
	mutex, err := windows.CreateMutex(&sa, false, name)
	if errors.Is(err, windows.ERROR_ALREADY_EXISTS) {
		_ = windows.CloseHandle(mutex)
		return nil, &api.Fault{Kind: "INSTANCE_CONFLICT", Reason: "PROFILE_ALREADY_OPEN"}
	}
	if err != nil {
		return nil, api.Denied("PROFILE_INSTANCE_LOCK_UNAVAILABLE")
	}
	// The mutex remains unowned: only its named-object lifetime is used, so
	// creation and shutdown have no OS-thread affinity requirement.
	return func() error { return windows.CloseHandle(mutex) }, nil
}

func verifySingleLink(f *os.File) error {
	var info windows.ByHandleFileInformation
	if err := windows.GetFileInformationByHandle(windows.Handle(f.Fd()), &info); err != nil {
		return err
	}
	if info.NumberOfLinks != 1 {
		return api.Denied("PROFILE_DB_HARDLINK_UNSAFE")
	}
	return nil
}
