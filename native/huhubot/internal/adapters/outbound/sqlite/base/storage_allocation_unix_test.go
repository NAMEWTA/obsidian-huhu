//go:build linux || darwin

package base

import (
	"os"
	"syscall"
)

func storageAllocatedBytes(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Sys().(*syscall.Stat_t).Blocks * 512, nil
}
