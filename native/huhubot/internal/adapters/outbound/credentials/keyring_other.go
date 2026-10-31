//go:build !linux && !darwin && !windows

package credentials

import "context"

func osCredential(context.Context, byte, string, string, []byte) ([]byte, string) {
	return nil, "PROTECTION_UNAVAILABLE"
}
