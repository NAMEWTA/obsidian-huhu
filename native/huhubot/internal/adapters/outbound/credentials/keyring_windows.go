//go:build windows

package credentials

import (
	"context"
	"errors"
	"syscall"

	"github.com/zalando/go-keyring"
)

func osCredential(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
	if ctx.Err() != nil {
		return nil, "OPERATION_TIMEOUT"
	}
	if invalidIdentity(profile, ref) != nil {
		return nil, "PROVIDER_FAILED"
	}
	service, user := namespace(profile, ref)
	var value string
	var err error
	switch op {
	case 1:
		err = keyring.Set(service, user, string(secret))
	case 2:
		err = keyring.Delete(service, user)
	case 3:
		value, err = keyring.Get(service, user)
	default:
		return nil, "PROVIDER_FAILED"
	}
	if err == nil {
		return []byte(value), ""
	}
	if errors.Is(err, keyring.ErrNotFound) {
		return nil, "CREDENTIAL_MISSING"
	}
	if errors.Is(err, syscall.ERROR_ACCESS_DENIED) {
		return nil, "PROTECTION_DENIED"
	}
	return nil, "PROVIDER_FAILED"
}
