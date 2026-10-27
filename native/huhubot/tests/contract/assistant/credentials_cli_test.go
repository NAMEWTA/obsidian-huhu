package assistant_test

import (
	"bytes"
	"context"
	"encoding/binary"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func credentialBinary(t *testing.T) string {
	t.Helper()
	binary := filepath.Join(t.TempDir(), "huhubot")
	if runtime.GOOS == "windows" {
		binary += ".exe"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "go", "build", "-mod=readonly", "-o", binary, "./cmd/huhubot")
	cmd.Dir = filepath.Join("..", "..", "..")
	cmd.Env = append(os.Environ(), "GOTOOLCHAIN=go1.26.10", "CGO_ENABLED=0")
	if p, e := cmd.CombinedOutput(); e != nil {
		t.Fatalf("credential runner build: %v %s", e, p)
	}
	return binary
}
func TestCredentialCLIRejectsUnmanagedAndMalformedWorkerWithoutSecrets(t *testing.T) {
	binary := credentialBinary(t)
	const sentinel = "HUHU-PRIVATE-CLI-SENTINEL-9417"
	for _, args := range [][]string{{"--stdio", "--profile", filepath.Join(t.TempDir(), "never-created"), "--credential-channel=stdio-v1"}, {"--credential-worker=stdio-v1", "--managed"}, {"--credential-worker=stdio-v1"}} {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		cmd := exec.CommandContext(ctx, binary, args...)
		cmd.Stdin = bytes.NewReader([]byte(sentinel))
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		e := cmd.Run()
		contextErr := ctx.Err()
		cancel()
		if e == nil || cmd.ProcessState == nil || contextErr != nil {
			t.Fatalf("unsafe CLI accepted or did not reap: %v", e)
		}
		if stdout.Len() != 0 || bytes.Contains(stderr.Bytes(), []byte(sentinel)) {
			t.Fatal("unsafe CLI output exposed input")
		}
	}
}

func TestCredentialWorkerExitsWithoutParentSupervisor(t *testing.T) {
	binaryPath := credentialBinary(t)
	for _, kind := range []string{"partial-frame", "complete-frame-without-eof"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			home := filepath.Join(root, "home")
			if err := os.Mkdir(home, 0700); err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
			cmd := exec.CommandContext(ctx, binaryPath, "--credential-worker=stdio-v1")
			cmd.Env = []string{"HOME=" + home, "USERPROFILE=" + home, "XDG_STATE_HOME=" + filepath.Join(root, "state"), "LOCALAPPDATA=" + filepath.Join(root, "local")}
			if v := os.Getenv("SystemRoot"); v != "" {
				cmd.Env = append(cmd.Env, "SystemRoot="+v)
			}
			stdin, err := cmd.StdinPipe()
			if err != nil {
				cancel()
				t.Fatal(err)
			}
			var stdout, stderr bytes.Buffer
			cmd.Stdout, cmd.Stderr = &stdout, &stderr
			if err = cmd.Start(); err != nil {
				cancel()
				_ = stdin.Close()
				t.Fatal(err)
			}
			started := time.Now()
			done := make(chan error, 1)
			waited := false
			go func() { done <- cmd.Wait() }()
			t.Cleanup(func() {
				cancel()
				_ = stdin.Close()
				if !waited {
					select {
					case <-done:
					case <-time.After(2 * time.Second):
						t.Error("standalone worker was not reaped")
					}
				}
			})
			input := []byte{0}
			if kind == "complete-frame-without-eof" {
				metadata := []byte(`{"requestId":"request:0123456789abcdef0123456789abcdef","profileId":"profile:test","credentialRef":"credential:0123456789abcdef0123456789abcdef","storagePreference":"protected"}`)
				secret := []byte("HUHU-STANDALONE-WORKER-SENTINEL-7183")
				input = make([]byte, 8+len(metadata)+len(secret))
				binary.BigEndian.PutUint32(input, uint32(len(input)-4))
				input[4] = 1
				input[5] = 1
				binary.BigEndian.PutUint16(input[6:], uint16(len(metadata)))
				copy(input[8:], metadata)
				copy(input[8+len(metadata):], secret)
			}
			if _, err = stdin.Write(input); err != nil {
				t.Fatal(err)
			}
			// Keep stdin open deliberately. Both inputs stop before any OS lookup;
			// there is no Provider supervisor in this actual CLI process path.
			timer := time.NewTimer(4 * time.Second)
			defer timer.Stop()
			forced := false
			select {
			case err = <-done:
				waited = true
			case <-timer.C:
				forced = true
				t.Error("standalone credential worker exceeded independent 4s bound")
				cancel()
				select {
				case err = <-done:
					waited = true
				case <-time.After(2 * time.Second):
					t.Fatal("test could not reap unbounded worker")
				}
			}
			if !forced && (err == nil || cmd.ProcessState == nil || cmd.ProcessState.ExitCode() != 1 || ctx.Err() != nil) {
				t.Fatalf("worker did not exit independently with status 1: %v", err)
			}
			if !forced && time.Since(started) < 2800*time.Millisecond {
				t.Fatal("worker exited before the independent deadline path")
			}
			if stdout.Len() != 0 || stderr.Len() != 0 {
				t.Fatal("standalone worker emitted input, secret or diagnostics")
			}
			entries, err := os.ReadDir(root)
			if err != nil || len(entries) != 1 || entries[0].Name() != "home" {
				t.Fatal("worker created Profile or runtime data outside standalone mode")
			}
			children, err := os.ReadDir(home)
			if err != nil || len(children) != 0 {
				t.Fatal("worker created Profile data in HOME")
			}
			t.Logf("standalone %s: elapsed=%s, forced-by-test=%t, waited=%t, stdout=%d stderr=%d", kind, time.Since(started), forced, waited, stdout.Len(), stderr.Len())
		})
	}
}
