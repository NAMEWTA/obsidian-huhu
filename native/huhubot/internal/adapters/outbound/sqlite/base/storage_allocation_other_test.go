//go:build !windows && !linux && !darwin

package base

import "errors"

func storageAllocatedBytes(string) (int64, error) {
	return 0, errors.New("allocation measurement unsupported on this OS")
}
