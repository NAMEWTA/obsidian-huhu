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
	if err = enableOwnershipPrivileges(); err != nil {
		return err
	}
	flags := ""
	if isDir {
		flags = "OICI"
	}
	// Elevated tokens create objects owned by the token's default owner
	// (often BUILTIN\Administrators), not TokenUser. Privacy requires the
	// current user to own the object and to be the only allow ACE.
	descriptor, err := windows.SecurityDescriptorFromString("O:" + sid.String() + "D:P(A;" + flags + ";FA;;;" + sid.String() + ")")
	if err != nil {
		return err
	}
	owner, _, err := descriptor.Owner()
	if err != nil || owner == nil {
		return fmt.Errorf("profile owner unavailable")
	}
	dacl, _, err := descriptor.DACL()
	if err != nil {
		return err
	}
	if err = windows.SetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION, owner, nil, nil, nil); err != nil {
		return err
	}
	return windows.SetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, dacl, nil)
}

// claimable is true only for the current user or the token default owner.
// Another user's object stays denied; this process does not take it over.
func claimable(path string) bool {
	user, err := currentSID()
	if err != nil {
		return false
	}
	sd, err := windows.GetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION)
	if err != nil {
		return false
	}
	owner, _, err := sd.Owner()
	if err != nil || owner == nil {
		return false
	}
	if owner.Equals(user) {
		return true
	}
	def, err := tokenDefaultOwner()
	if err != nil || def == nil {
		return false
	}
	return owner.Equals(def)
}

type windowsTokenOwner struct {
	Owner *windows.SID
}

func tokenDefaultOwner() (*windows.SID, error) {
	token := windows.GetCurrentProcessToken()
	n := uint32(256)
	for {
		buf := make([]byte, n)
		err := windows.GetTokenInformation(token, uint32(windows.TokenOwner), &buf[0], uint32(len(buf)), &n)
		if err == nil {
			owner := (*windowsTokenOwner)(unsafe.Pointer(&buf[0])).Owner
			if owner == nil {
				return nil, fmt.Errorf("token owner unavailable")
			}
			return owner.Copy()
		}
		if err != windows.ERROR_INSUFFICIENT_BUFFER || n <= uint32(len(buf)) {
			return nil, err
		}
	}
}

func enableOwnershipPrivileges() error {
	var token windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_ADJUST_PRIVILEGES|windows.TOKEN_QUERY, &token); err != nil {
		return err
	}
	defer token.Close()
	for _, name := range []string{"SeTakeOwnershipPrivilege", "SeRestorePrivilege"} {
		var tp windows.Tokenprivileges
		tp.PrivilegeCount = 1
		ptr, err := windows.UTF16PtrFromString(name)
		if err != nil {
			return err
		}
		if err = windows.LookupPrivilegeValue(nil, ptr, &tp.Privileges[0].Luid); err != nil {
			return err
		}
		tp.Privileges[0].Attributes = windows.SE_PRIVILEGE_ENABLED
		if err = windows.AdjustTokenPrivileges(token, false, &tp, 0, nil, nil); err != nil && !errors.Is(err, windows.ERROR_NOT_ALL_ASSIGNED) {
			return err
		}
	}
	return nil
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
