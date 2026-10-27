//go:build darwin

package credentials

import "context"

func osCredential(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
	return (securityBackend{path: "/usr/bin/security"}).execute(ctx, op, profile, ref, secret)
}
