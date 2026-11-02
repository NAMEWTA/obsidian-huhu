//go:build linux || darwin

package assistant_test

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestCredentialActualCLIPrivateEOFAndPartialFrameCloseRunner(t *testing.T) {
	binary := credentialBinary(t)
	for _, kind := range []string{"eof", "partial", "oversize"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			home := filepath.Join(root, "home")
			state := filepath.Join(root, "state")
			if e := os.Mkdir(home, 0700); e != nil {
				t.Fatal(e)
			}
			profiles := filepath.Join(state, "huhu", "huhubot", "profiles")
			if runtime.GOOS == "darwin" {
				profiles = filepath.Join(home, "Library", "Application Support", "HUHU", "huhubot", "profiles")
			}
			stdinR, stdinW, e := os.Pipe()
			if e != nil {
				t.Fatal(e)
			}
			requestR, requestW, e := os.Pipe()
			if e != nil {
				t.Fatal(e)
			}
			receiptR, receiptW, e := os.Pipe()
			if e != nil {
				t.Fatal(e)
			}
			for _, f := range []*os.File{stdinR, stdinW, requestR, requestW, receiptR, receiptW} {
				t.Cleanup(func() { _ = f.Close() })
			}
			ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, binary, "--stdio", "--managed", "--profile", filepath.Join(profiles, "one"), "--credential-channel=stdio-v1")
			cmd.Env = []string{"HOME=" + home, "XDG_STATE_HOME=" + state}
			cmd.Stdin = stdinR
			cmd.ExtraFiles = []*os.File{requestR, receiptW}
			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr
			if e = cmd.Start(); e != nil {
				t.Fatal(e)
			}
			_ = stdinR.Close()
			_ = requestR.Close()
			_ = receiptW.Close()
			done := make(chan error, 1)
			received := false
			go func() { done <- cmd.Wait() }()
			t.Cleanup(func() {
				cancel()
				if !received {
					select {
					case <-done:
					case <-time.After(2 * time.Second):
						t.Error("actual Runner not reaped")
					}
				}
			})
			switch kind {
			case "eof":
				_ = requestW.Close()
			case "partial":
				_, e = requestW.Write([]byte{0})
			case "oversize":
				_, e = requestW.Write([]byte{0, 1, 0, 0})
			}
			if e != nil {
				t.Fatal(e)
			}
			select {
			case e = <-done:
				received = true
				if e != nil {
					t.Fatalf("private closure caused Runner failure: %v %s", e, stderr.Bytes())
				}
			case <-time.After(6 * time.Second):
				t.Fatal("private pipe did not stop Runner")
			}
			if ctx.Err() != nil || cmd.ProcessState == nil || stdout.Len() != 0 || stderr.Len() != 0 {
				t.Fatalf("Runner did not close cleanly: %s", stderr.Bytes())
			}
		})
	}
}
