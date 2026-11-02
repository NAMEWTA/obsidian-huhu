//go:build windows

package profile

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

func createPublicationFile(dir string) (*os.File, error) {
	for range 10000 {
		var nonce [8]byte
		if _, err := rand.Read(nonce[:]); err != nil {
			return nil, err
		}
		name := filepath.Join(dir, ".profile-init-"+hex.EncodeToString(nonce[:]))
		path, err := windows.UTF16PtrFromString(name)
		if err != nil {
			return nil, err
		}
		// FILE_SHARE_DELETE lets publication remove this name while the handle
		// stays open. os.CreateTemp does not request that share mode.
		handle, err := windows.CreateFile(path, windows.GENERIC_READ|windows.GENERIC_WRITE, windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE, nil, windows.CREATE_NEW, windows.FILE_ATTRIBUTE_NORMAL, 0)
		if errors.Is(err, windows.ERROR_FILE_EXISTS) || errors.Is(err, windows.ERROR_ALREADY_EXISTS) {
			continue
		}
		if err != nil {
			return nil, err
		}
		if err = windows.SetHandleInformation(handle, windows.HANDLE_FLAG_INHERIT, 0); err != nil {
			_ = windows.CloseHandle(handle)
			_ = os.Remove(name)
			return nil, err
		}
		return os.NewFile(uintptr(handle), name), nil
	}
	return nil, fmt.Errorf("profile publication file unavailable")
}

// The publication handle is opened on the temporary name. That name is removed
// while the handle is still open, so later path queries must use the published
// path. The kernel mutex is independent of this handle.
func retargetPublication(temp *os.File, published string) (*os.File, error) {
	live, err := os.OpenFile(published, os.O_RDWR, 0)
	if err != nil {
		return nil, err
	}
	_ = temp.Close()
	return live, nil
}

// NTFS counts a generated 8.3 alias in NumberOfLinks. profile.sqlite3 does not
// fit 8.3, so a normal new file on a short-name volume reports 2 even though
// FindFirstFile shows one entry. A second real hard link makes that count 3
// or more when the alias exists, and leaves the opened name's short form
// unchanged when it does not. Link-name enumeration is not used here: the
// Windows runner rejected it for every new database
// (PROFILE_DB_IDENTITY_UNAVAILABLE) after the temporary name was removed.
func verifySingleLink(f *os.File) error {
	var info windows.ByHandleFileInformation
	if err := windows.GetFileInformationByHandle(windows.Handle(f.Fd()), &info); err != nil {
		return api.Denied("PROFILE_DB_IDENTITY_UNAVAILABLE")
	}
	switch info.NumberOfLinks {
	case 1:
		return nil
	case 2:
		if shortNameAccountsForExtraLink(f) {
			return nil
		}
	}
	return api.Denied("PROFILE_DB_HARDLINK_UNSAFE")
}

func shortNameAccountsForExtraLink(f *os.File) bool {
	long := f.Name()
	if _, err := os.Lstat(long); err != nil {
		return false
	}
	short, err := shortPath(long)
	if err != nil {
		return false
	}
	longBase := strings.ToLower(filepath.Base(long))
	shortBase := strings.ToLower(filepath.Base(short))
	return longBase != "" && shortBase != "" && longBase != shortBase
}

func shortPath(path string) (string, error) {
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return "", err
	}
	size := uint32(1024)
	for {
		buf := make([]uint16, size)
		n, err := windows.GetShortPathName(pathPtr, &buf[0], size)
		if err != nil {
			return "", err
		}
		// A short buffer returns the required size, including the null, and the
		// syscall wrapper reports no error because the result is non-zero.
		if n > 0 && n < size {
			return windows.UTF16ToString(buf[:n]), nil
		}
		if n <= size {
			return "", fmt.Errorf("profile short path unavailable")
		}
		size = n + 1
	}
}
