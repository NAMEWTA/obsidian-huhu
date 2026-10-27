package foundation_test

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

// Unlike net.Pipe, an inherited OS stdin may be a non-pollable pipe. This test
// keeps the parent end open while shutdown must independently terminate.
func TestRealRunnerShutdownWithParentPipeOpenAndEOFReopen(t *testing.T) {
	dir := t.TempDir()
	binary := filepath.Join(dir, "huhubot")
	if runtime.GOOS == "windows" {
		binary += ".exe"
	}
	build := exec.Command("go", "build", "-o", binary, "./cmd/huhubot")
	build.Dir = "../../.."
	build.Env = append(os.Environ(), "CGO_ENABLED=0")
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build: %s %v", out, err)
	}
	state := filepath.Join(dir, "state")
	home := filepath.Join(dir, "home")
	local := filepath.Join(dir, "local")
	var locator string
	switch runtime.GOOS {
	case "windows":
		locator = filepath.Join(local, "HUHU", "huhubot", "profiles", "one")
	case "darwin":
		locator = filepath.Join(home, "Library", "Application Support", "HUHU", "huhubot", "profiles", "one")
	default:
		locator = filepath.Join(state, "huhu", "huhubot", "profiles", "one")
	}
	var original wire.ProfileMetadata
	for iteration := 0; iteration < 2; iteration++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		cmd := exec.CommandContext(ctx, binary, "--stdio", "--managed", "--profile", locator)
		cmd.Env = append(os.Environ(), "XDG_STATE_HOME="+state, "HOME="+home, "LOCALAPPDATA="+local, "USERPROFILE="+home)
		stdin, err := cmd.StdinPipe()
		if err != nil {
			t.Fatal(err)
		}
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			t.Fatal(err)
		}
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err = cmd.Start(); err != nil {
			t.Fatal(err)
		}
		var waitOnce sync.Once
		var waitErr error
		wait := func() error { waitOnce.Do(func() { waitErr = cmd.Wait() }); return waitErr }
		// Register immediately after Start: a fatal hello/read assertion must
		// still stop and reap the actual child, under the original deadline.
		t.Cleanup(func() { _ = stdin.Close(); cancel(); _ = wait() })
		readwrite := struct {
			io.Reader
			io.Writer
		}{stdout, stdin}
		h := hello(t, readwrite)
		if iteration == 0 {
			original = h.Profile
			_ = stdin.Close()
		} else {
			if h.Profile != original {
				t.Fatal("Runner persistent metadata changed")
			}
			send(t, stdin, request("c:shutdown", "service.shutdown", nil))
			if e := receive(t, stdout)[0]; e.Error != nil {
				t.Fatal(e.Error)
			}
		}
		err = wait()
		_ = stdin.Close()
		cancel()
		if err != nil {
			t.Fatalf("Runner failed to exit with pipe retained: %v %s", err, stderr.String())
		}
		if stderr.Len() != 0 {
			t.Fatalf("normal startup/exit stderr: %q", stderr.String())
		}
	}
}
