package credentials

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"os"
	"os/exec"
	"strings"
	"time"
)

const securityEncoding = "huhu-base64-v1:"

type securityBackend struct {
	path    string
	command func(context.Context, string, ...string) *exec.Cmd
}

func securityQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'" }
func (s securityBackend) execute(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
	if invalidIdentity(profile, ref) != nil || len(secret) > MaxSecretBytes {
		return nil, "PROVIDER_FAILED"
	}
	service, user := namespace(profile, ref)
	var args []string
	var input []byte
	switch op {
	case 1:
		if len(secret) == 0 {
			return nil, "PROVIDER_FAILED"
		}
		input = []byte("add-generic-password -U -s " + securityQuote(service) + " -a " + securityQuote(user) + " -w " + securityEncoding)
		input = base64.StdEncoding.AppendEncode(input, secret)
		input = append(input, '\n')
		defer wipe(input)
		// security's interactive parser has a 4096-byte command bound. Validate
		// the complete escaped command before acquiring any process or pipe.
		if len(input) > 4096 {
			return nil, "PROVIDER_FAILED"
		}
		args = []string{"-i"}
	case 2:
		args = []string{"delete-generic-password", "-s", service, "-a", user}
	case 3:
		args = []string{"find-generic-password", "-s", service, "-wa", user}
	default:
		return nil, "PROVIDER_FAILED"
	}
	if ctx.Err() != nil {
		return nil, contextReason(ctx)
	}
	command := s.command
	if command == nil {
		command = exec.CommandContext
	}
	cmd := command(ctx, s.path, args...)
	cmd.Env = workerEnvironment(cmd.Environ())
	cmd.Stdin = bytes.NewReader(input)
	cmd.WaitDelay = 100 * time.Millisecond
	out := &boundedBuffer{limit: 4096}
	stderr := &boundedBuffer{limit: 4096}
	defer func() { wipe(out.Bytes()); wipe(stderr.Bytes()) }()
	cmd.Stdout = out
	cmd.Stderr = stderr
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, contextReason(ctx)
		}
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			switch exit.ExitCode() {
			case 44:
				return nil, "CREDENTIAL_MISSING"
			case 36:
				return nil, "PROTECTION_LOCKED"
			case 51, 128:
				return nil, "PROTECTION_DENIED"
			}
		}
		if errors.Is(err, os.ErrNotExist) {
			return nil, "PROTECTION_UNAVAILABLE"
		}
		if errors.Is(err, os.ErrPermission) {
			return nil, "PROTECTION_DENIED"
		}
		return nil, "PROVIDER_FAILED"
	}
	if op != 3 {
		return nil, ""
	}
	p := bytes.TrimSpace(out.Bytes())
	if !bytes.HasPrefix(p, []byte(securityEncoding)) {
		return nil, "PROVIDER_FAILED"
	}
	decoded, err := base64.StdEncoding.Strict().DecodeString(string(p[len(securityEncoding):]))
	if err != nil || len(decoded) == 0 || len(decoded) > MaxSecretBytes {
		wipe(decoded)
		return nil, "PROVIDER_FAILED"
	}
	return decoded, ""
}
