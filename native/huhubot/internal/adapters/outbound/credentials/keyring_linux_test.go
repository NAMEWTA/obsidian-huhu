//go:build linux

package credentials

import (
	"context"
	"testing"
)

func TestLinuxMissingSessionBusFailsBeforeProtectedLookup(t *testing.T) {
	t.Setenv("DBUS_SESSION_BUS_ADDRESS", "")
	t.Setenv("XDG_RUNTIME_DIR", t.TempDir())
	secret, reason := osCredential(context.Background(), 3, "profile:test", testRef, nil)
	if len(secret) != 0 || reason != "PROTECTION_UNAVAILABLE" {
		t.Fatal("absent session bus did not fail closed", reason)
	}
}
