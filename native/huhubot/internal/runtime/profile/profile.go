// Package profile owns OS-local paths, permissions and the lifetime DB identity lock.
package profile

import (
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

const DatabaseName = "profile.sqlite3"

type Handle struct {
	Directory, DatabasePath string
	New                     bool
	file                    *os.File
	unlock                  func() error
	once                    sync.Once
	closeErr                error
}

func DefaultRoot() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	switch runtime.GOOS {
	case "windows":
		root := os.Getenv("LOCALAPPDATA")
		if root == "" || !filepath.IsAbs(root) {
			return "", fmt.Errorf("local app data unavailable")
		}
		return filepath.Join(root, "HUHU", "huhubot", "profiles"), nil
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "HUHU", "huhubot", "profiles"), nil
	default:
		root := os.Getenv("XDG_STATE_HOME")
		if root == "" {
			root = filepath.Join(home, ".local", "state")
		}
		if !filepath.IsAbs(root) {
			return "", fmt.Errorf("state root must be absolute")
		}
		return filepath.Join(root, "huhu", "huhubot", "profiles"), nil
	}
}
func within(root, path string) bool {
	rel, err := filepath.Rel(root, path)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}
func privateDir(path string) error {
	if err := os.MkdirAll(path, 0700); err != nil {
		return err
	}
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("profile root is not a directory")
	}
	return ensurePrivate(path, info, true)
}

// PermissionsArePrivate reports whether path is already private to this user.
func PermissionsArePrivate(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	return verifyPrivate(path, info, info.IsDir())
}

// EnsurePrivate repairs a directory or file this process is allowed to claim,
// then checks the same privacy rule as profile acquisition.
func EnsurePrivate(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	return ensurePrivate(path, info, info.IsDir())
}

func ensurePrivate(path string, info os.FileInfo, isDir bool) error {
	err := verifyPrivate(path, info, isDir)
	if err == nil {
		return nil
	}
	if !claimable(path) {
		return err
	}
	if err = protectNew(path, isDir); err != nil {
		return err
	}
	info, err = os.Stat(path)
	if err != nil {
		return err
	}
	return verifyPrivate(path, info, isDir)
}

// Acquire accepts only a locator under an independently constructed managed root.
func Acquire(root, locator string) (*Handle, error) {
	if !filepath.IsAbs(root) || !filepath.IsAbs(locator) || !within(filepath.Clean(root), filepath.Clean(locator)) {
		return nil, api.Denied("PROFILE_OUTSIDE_MANAGED_ROOT")
	}
	if err := privateDir(root); err != nil {
		return nil, err
	}
	realRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		return nil, err
	}
	if err = validateExistingAncestor(realRoot, locator); err != nil {
		return nil, err
	}
	if err = privateDir(locator); err != nil {
		return nil, err
	}
	dir, err := filepath.EvalSymlinks(locator)
	if err != nil {
		return nil, err
	}
	if !within(realRoot, dir) {
		return nil, api.Denied("PROFILE_OUTSIDE_MANAGED_ROOT")
	}
	for p := dir; p != realRoot; p = filepath.Dir(p) {
		info, e := os.Stat(p)
		if e != nil {
			return nil, e
		}
		if e = ensurePrivate(p, info, true); e != nil {
			return nil, e
		}
	}
	name := filepath.Join(dir, DatabaseName)
	f, isNew, unlock, err := openLockedDatabase(name)
	if err != nil {
		return nil, err
	}
	ok := false
	defer func() {
		if !ok {
			_ = unlock()
			_ = f.Close()
		}
	}()
	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, api.Invalid("PROFILE_DB_NOT_REGULAR")
	}
	if err = ensurePrivate(name, info, false); err != nil {
		return nil, err
	}
	realDB, err := filepath.EvalSymlinks(name)
	if err != nil {
		return nil, err
	}
	if !within(realRoot, realDB) {
		return nil, api.Denied("PROFILE_DB_OUTSIDE_MANAGED_ROOT")
	}
	// SQLite sidecars are named by path. An inode lock alone cannot make two
	// hardlink locators share WAL/SHM; refuse before SQLite can observe old pages.
	if err = verifySingleLink(f); err != nil {
		return nil, err
	}
	actual, err := os.Stat(realDB)
	if err != nil || !os.SameFile(info, actual) {
		return nil, api.Denied("PROFILE_DB_IDENTITY_CHANGED")
	}
	ok = true
	return &Handle{Directory: dir, DatabasePath: realDB, New: isNew, file: f, unlock: unlock}, nil
}
func (h *Handle) Close() error {
	h.once.Do(func() {
		if h.unlock != nil {
			h.closeErr = h.unlock()
		}
		if err := h.file.Close(); h.closeErr == nil {
			h.closeErr = err
		}
	})
	return h.closeErr
}

// A new inode is privately locked before atomic publication. This avoids a second
// process observing a newly created, not-yet-locked empty database as corrupt.
func openLockedDatabase(name string) (*os.File, bool, func() error, error) {
	if f, err := os.OpenFile(name, os.O_RDWR, 0); err == nil {
		u, e := lockDatabase(f)
		if e != nil {
			_ = f.Close()
			return nil, false, nil, e
		}
		return f, false, u, nil
	} else if !os.IsNotExist(err) {
		return nil, false, nil, err
	}
	temp, err := createPublicationFile(filepath.Dir(name))
	if err != nil {
		return nil, false, nil, err
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	if err = protectNew(tempName, false); err != nil {
		_ = temp.Close()
		return nil, false, nil, err
	}
	unlock, err := lockDatabase(temp)
	if err != nil {
		_ = temp.Close()
		return nil, false, nil, err
	}
	if err = os.Link(tempName, name); err == nil {
		// The temporary name is a second hard link until it is removed. Windows
		// refuses DeleteFile on a handle opened without FILE_SHARE_DELETE, and
		// a discarded Remove error leaves NumberOfLinks at 2. The returned
		// handle is then the published path; the removed temporary name cannot
		// answer a later path query.
		if err = os.Remove(tempName); err != nil {
			_ = unlock()
			_ = temp.Close()
			_ = os.Remove(name)
			return nil, false, nil, err
		}
		published, err := retargetPublication(temp, name)
		if err != nil {
			_ = unlock()
			_ = temp.Close()
			_ = os.Remove(name)
			return nil, false, nil, err
		}
		return published, true, unlock, nil
	}
	_ = unlock()
	_ = temp.Close()
	if os.IsExist(err) {
		f, e := os.OpenFile(name, os.O_RDWR, 0)
		if e != nil {
			return nil, false, nil, e
		}
		u, e := lockDatabase(f)
		if e != nil {
			_ = f.Close()
			return nil, false, nil, e
		}
		return f, false, u, nil
	}
	return nil, false, nil, err
}

// Validate before MkdirAll: a symlinked ancestor must not cause external writes
// merely because the final directory does not exist yet.
func validateExistingAncestor(realRoot, locator string) error {
	ancestor := locator
	for {
		_, err := os.Lstat(ancestor)
		if err == nil {
			break
		}
		if !os.IsNotExist(err) {
			return err
		}
		parent := filepath.Dir(ancestor)
		if parent == ancestor {
			return api.Denied("PROFILE_OUTSIDE_MANAGED_ROOT")
		}
		ancestor = parent
	}
	resolved, err := filepath.EvalSymlinks(ancestor)
	if err != nil {
		return err
	}
	if !within(realRoot, resolved) {
		return api.Denied("PROFILE_OUTSIDE_MANAGED_ROOT")
	}
	return nil
}
