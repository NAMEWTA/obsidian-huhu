//go:build linux

package credentials

import (
	"context"
	"errors"
	"os"
	"path/filepath"

	"github.com/godbus/dbus/v5"
)

func osCredential(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
	if ctx.Err() != nil {
		return nil, "OPERATION_TIMEOUT"
	}
	if invalidIdentity(profile, ref) != nil {
		return nil, "PROVIDER_FAILED"
	}
	// Do not let godbus's automatic discovery spawn dbus-launch through PATH.
	// Only an explicit session locator or the existing XDG bus socket is used.
	if address := os.Getenv("DBUS_SESSION_BUS_ADDRESS"); address == "" || address == "autolaunch:" {
		runtimeDir := os.Getenv("XDG_RUNTIME_DIR")
		bus := filepath.Join(runtimeDir, "bus")
		info, err := os.Lstat(bus)
		if !filepath.IsAbs(runtimeDir) || err != nil || info.Mode()&os.ModeSocket == 0 {
			return nil, "PROTECTION_UNAVAILABLE"
		}
		if os.Setenv("DBUS_SESSION_BUS_ADDRESS", "unix:path="+dbus.EscapeBusAddressValue(bus)) != nil {
			return nil, "PROTECTION_UNAVAILABLE"
		}
	}
	value, err := secretServiceCredential(ctx, op, profile, ref, secret)
	if err == nil {
		return value, ""
	}
	if ctx.Err() != nil {
		return nil, contextReason(ctx)
	}
	if errors.Is(err, errCredentialMissing) {
		return nil, "CREDENTIAL_MISSING"
	}
	if errors.Is(err, errPromptDismissed) {
		return nil, "PROTECTION_DENIED"
	}
	if errors.Is(err, errNoProtection) {
		return nil, "PROTECTION_UNAVAILABLE"
	}
	var d dbus.Error
	var pointer *dbus.Error
	name := ""
	if errors.As(err, &d) {
		name = d.Name
	} else if errors.As(err, &pointer) {
		name = pointer.Name
	}
	if name != "" {
		switch name {
		case "org.freedesktop.Secret.Error.IsLocked":
			return nil, "PROTECTION_LOCKED"
		case "org.freedesktop.DBus.Error.AccessDenied", "org.freedesktop.Secret.Error.Denied", "org.freedesktop.Secret.Error.Cancelled":
			return nil, "PROTECTION_DENIED"
		case "org.freedesktop.DBus.Error.ServiceUnknown", "org.freedesktop.DBus.Error.NameHasNoOwner", "org.freedesktop.DBus.Error.NoServer":
			return nil, "PROTECTION_UNAVAILABLE"
		case "org.freedesktop.DBus.Error.NoReply", "org.freedesktop.DBus.Error.Timeout", "org.freedesktop.DBus.Error.Disconnected":
			return nil, "OPERATION_TIMEOUT"
		}
	}
	if errors.Is(err, os.ErrPermission) {
		return nil, "PROTECTION_DENIED"
	}
	if errors.Is(err, os.ErrNotExist) {
		return nil, "PROTECTION_UNAVAILABLE"
	}
	return nil, "PROVIDER_FAILED"
}
