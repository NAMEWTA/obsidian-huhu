package credentials

import (
	"bytes"
	"context"
	"encoding/base64"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// This executable fixture replaces only the OS credential boundary. It never
// calls a real Secret Service, Keychain or Credential Manager.
func TestCredentialProcessFixture(t *testing.T) {
	index := -1
	for i, arg := range os.Args {
		if arg == "--credential-test" {
			index = i
			break
		}
	}
	if index < 0 {
		return
	}
	if index+2 >= len(os.Args) {
		os.Exit(90)
	}
	mode, marker := os.Args[index+1], os.Args[index+2]
	for _, v := range append(append([]string{}, os.Args...), os.Environ()...) {
		if strings.Contains(v, sentinel) {
			os.Exit(91)
		}
	}
	if strings.HasPrefix(mode, "security-") {
		if mode == "security-early" {
			_ = os.Stdin.Close()
			_, _ = os.Stderr.Write([]byte(sentinel))
			os.Exit(13)
		}
		input, e := io.ReadAll(io.LimitReader(os.Stdin, 8192))
		if e != nil {
			os.Exit(92)
		}
		defer wipe(input)
		if mode == "security-hang" {
			if e = os.WriteFile(marker, []byte("ready"), 0600); e != nil {
				os.Exit(93)
			}
			for {
				time.Sleep(time.Hour)
			}
		}
		if len(input) > 4096 {
			os.Exit(94)
		}
		for _, arg := range os.Args {
			if arg == "find-generic-password" {
				_, _ = io.WriteString(os.Stdout, securityEncoding+base64.StdEncoding.EncodeToString([]byte(sentinel))+"\n")
			}
		}
		os.Exit(0)
	}
	err := runWorker(context.Background(), os.Stdin, os.Stdout, func(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
		if profile != "profile:test" || ref != testRef {
			os.Exit(95)
		}
		if op == 1 && string(secret) != sentinel {
			os.Exit(96)
		}
		if mode == "hang" {
			if e := os.WriteFile(marker, []byte("ready"), 0600); e != nil {
				os.Exit(97)
			}
			for {
				time.Sleep(time.Hour)
			}
		}
		if mode == "crash" {
			os.Exit(13)
		}
		if op == 3 {
			return []byte(sentinel), ""
		}
		return nil, ""
	})
	if err != nil {
		os.Exit(98)
	}
	os.Exit(0)
}
func fixtureCommand(mode, marker string, capture **exec.Cmd) func(context.Context, string, ...string) *exec.Cmd {
	return func(ctx context.Context, _ string, args ...string) *exec.Cmd {
		argv := []string{"-test.run=^TestCredentialProcessFixture$", "--", "--credential-test", mode, marker}
		argv = append(argv, args...)
		cmd := exec.CommandContext(ctx, os.Args[0], argv...)
		if capture != nil {
			*capture = cmd
		}
		return cmd
	}
}
func waitFixtureReady(t *testing.T, marker string, done chan string) {
	t.Helper()
	timer := time.NewTimer(5 * time.Second)
	defer timer.Stop()
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-timer.C:
			t.Fatal("isolated worker fixture was not ready")
		case reason := <-done:
			done <- reason
			t.Fatalf("isolated worker exited before readiness: %s", reason)
		case <-ticker.C:
			if p, e := os.ReadFile(marker); e == nil && string(p) == "ready" {
				return
			}
		}
	}
}
func TestSupervisorUsesPrivatePipeAndFiltersAmbientCredentials(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", sentinel)
	t.Setenv("ANTHROPIC_API_KEY", sentinel)
	s := &supervisor{executable: os.Args[0], command: fixtureCommand("success", "", nil)}
	for _, op := range []byte{1, 3, 2} {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		var input []byte
		if op == 1 {
			input = []byte(sentinel)
		}
		got, reason := s.execute(ctx, op, "profile:test", testRef, input)
		cancel()
		if reason != "" {
			t.Fatal(reason)
		}
		if op == 3 && string(got) != sentinel {
			t.Fatal("private worker result lost raw secret")
		}
		if op != 3 && len(got) != 0 {
			t.Fatal("non-resolve worker emitted secret")
		}
		wipe(got)
	}
	env := workerEnvironment([]string{"OPENAI_API_KEY=" + sentinel, "PATH=/untrusted", "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/test", "XDG_RUNTIME_DIR=/run/test", "SystemRoot=C:\\Windows"})
	if len(env) != 3 {
		t.Fatal("environment allowlist drift")
	}
	for _, v := range env {
		if strings.Contains(v, sentinel) {
			t.Fatal("credential environment inherited")
		}
	}
}
func TestSupervisorCancelsAndReapsAnActuallyBlockedWorker(t *testing.T) {
	marker := filepath.Join(t.TempDir(), "ready")
	ctx, cancel := context.WithCancel(context.Background())
	var cmd *exec.Cmd
	s := &supervisor{executable: os.Args[0], command: fixtureCommand("hang", marker, &cmd)}
	done := make(chan string, 1)
	received := false
	t.Cleanup(func() {
		cancel()
		if !received {
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Error("worker cleanup did not finish")
			}
		}
	})
	go func() { _, reason := s.execute(ctx, 1, "profile:test", testRef, []byte(sentinel)); done <- reason }()
	waitFixtureReady(t, marker, done)
	cancel()
	select {
	case reason := <-done:
		received = true
		if reason != "REQUEST_CANCELED" {
			t.Fatal(reason)
		}
	case <-time.After(time.Second):
		t.Fatal("worker survived cancellation")
	}
	if cmd == nil || cmd.ProcessState == nil {
		t.Fatal("worker was killed without being waited")
	}
}
func TestSupervisorDeadlineKillsAndWaitsForBlockedWorker(t *testing.T) {
	marker := filepath.Join(t.TempDir(), "ready")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	var cmd *exec.Cmd
	s := &supervisor{executable: os.Args[0], command: fixtureCommand("hang", marker, &cmd)}
	done := make(chan string, 1)
	received := false
	t.Cleanup(func() {
		cancel()
		if !received {
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Error("deadline worker cleanup incomplete")
			}
		}
	})
	go func() { _, reason := s.execute(ctx, 1, "profile:test", testRef, []byte(sentinel)); done <- reason }()
	waitFixtureReady(t, marker, done)
	select {
	case reason := <-done:
		received = true
		if reason != "OPERATION_TIMEOUT" {
			t.Fatal(reason)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("worker survived deadline")
	}
	if cmd == nil || cmd.ProcessState == nil {
		t.Fatal("deadline killed worker without wait")
	}
}
func TestSupervisorCrashProducesUnknownWriteAndSafeReceipt(t *testing.T) {
	f := newCredentialFixture(t)
	s := &supervisor{executable: os.Args[0], command: func(ctx context.Context, _ string, args ...string) *exec.Cmd {
		return fixtureCommand("crash", "", nil)(ctx, "", args...)
	}}
	// The fixture expects its own isolated identity. Replace only that namespace
	// in this external-boundary harness, keeping the real provider/catalog path.
	f.p.backend = func(ctx context.Context, op byte, _, _ string, secret []byte) ([]byte, string) {
		return s.execute(ctx, op, "profile:test", testRef, secret)
	}
	st, e := f.r.Register(context.Background(), f.profileID, testRef, "protected", []byte(sentinel))
	if e == nil || st.State != "unknown" || st.Reason != "PROVIDER_FAILED" {
		t.Fatal(st, e)
	}
	m, e := f.catalog.Lookup(context.Background(), f.profileID, testRef)
	if e != nil || m.Status.State != "unknown" {
		t.Fatal("lost unknown outcome", m, e)
	}
}
func TestWorkerRejectsHelloAndTrailingBytesBeforeOSAccess(t *testing.T) {
	hello := requestFrame(0, `{"requestId":"request:0123456789abcdef0123456789abcdef","profileId":"profile:test"}`, nil)
	for _, p := range [][]byte{hello, append(requestFrame(3, `{"requestId":"request:0123456789abcdef0123456789abcdef","profileId":"profile:test","credentialRef":"credential:0123456789abcdef0123456789abcdef"}`, nil), 1)} {
		var out bytes.Buffer
		if err := RunWorker(context.Background(), bytes.NewReader(p), &out); err == nil || out.Len() != 0 {
			t.Fatal("malformed worker input reached provider or emitted response")
		}
	}
}
func TestSecurityChecksInputBoundBeforeStartingAnyProcess(t *testing.T) {
	started := false
	s := securityBackend{path: "/usr/bin/security", command: func(context.Context, string, ...string) *exec.Cmd { started = true; return nil }}
	_, reason := s.execute(context.Background(), 1, "profile:test", testRef, bytes.Repeat([]byte{'s'}, MaxSecretBytes+1))
	if reason != "PROVIDER_FAILED" || started {
		t.Fatal("oversized security input acquired a process")
	}
}
func TestSecurityPrivateStdinAndBoundedRead(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", sentinel)
	s := securityBackend{path: "/usr/bin/security", command: fixtureCommand("security-success", "", nil)}
	for _, op := range []byte{1, 3, 2} {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		var input []byte
		if op == 1 {
			input = []byte(sentinel)
		}
		out, reason := s.execute(ctx, op, "profile:test", testRef, input)
		cancel()
		if reason != "" {
			t.Fatal(reason)
		}
		if op == 3 && string(out) != sentinel {
			t.Fatal("security decoding changed raw secret")
		}
		wipe(out)
	}
}
func TestSecurityCancelsAndReapsActuallyBlockedProgram(t *testing.T) {
	marker := filepath.Join(t.TempDir(), "ready")
	ctx, cancel := context.WithCancel(context.Background())
	var cmd *exec.Cmd
	s := securityBackend{path: "/usr/bin/security", command: fixtureCommand("security-hang", marker, &cmd)}
	done := make(chan string, 1)
	received := false
	t.Cleanup(func() {
		cancel()
		if !received {
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Error("security cleanup did not finish")
			}
		}
	})
	go func() { _, reason := s.execute(ctx, 1, "profile:test", testRef, []byte(sentinel)); done <- reason }()
	waitFixtureReady(t, marker, done)
	cancel()
	select {
	case reason := <-done:
		received = true
		if reason != "REQUEST_CANCELED" {
			t.Fatal(reason)
		}
	case <-time.After(time.Second):
		t.Fatal("security process survived cancellation")
	}
	if cmd == nil || cmd.ProcessState == nil {
		t.Fatal("security program not reaped")
	}
}
func TestSecurityFailedExitIsSanitizedAndReaped(t *testing.T) {
	var cmd *exec.Cmd
	s := securityBackend{path: "/usr/bin/security", command: fixtureCommand("security-early", "", &cmd)}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, reason := s.execute(ctx, 1, "profile:test", testRef, []byte(sentinel))
	if reason != "PROVIDER_FAILED" || cmd.ProcessState == nil {
		t.Fatal("unexpected security exit claimed a known write outcome", reason)
	}
}
