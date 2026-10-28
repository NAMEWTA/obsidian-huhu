//go:build !linux && !darwin && !windows

package profile

import (
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"os"
)

func verifyPrivate(string, os.FileInfo, bool) error {
	return api.Denied("UNSUPPORTED_OS_PRIVATE_STORAGE")
}
func lockDatabase(*os.File) (func() error, error) {
	return nil, api.Denied("UNSUPPORTED_OS_INSTANCE_LOCK")
}

func protectNew(string, bool) error { return nil }

func verifySingleLink(*os.File) error { return api.Denied("UNSUPPORTED_OS_INSTANCE_LOCK") }
