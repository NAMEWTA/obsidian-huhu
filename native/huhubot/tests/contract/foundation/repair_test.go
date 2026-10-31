package foundation_test

import (
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	inbound "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestCrashWALChild(t *testing.T) {
	if os.Getenv("HUHU_CRASH_WAL_CHILD") != "1" {
		return
	}
	root, dir := os.Getenv("HUHU_CRASH_ROOT"), os.Getenv("HUHU_CRASH_DIR")
	core, err := bootstrap.Open(context.Background(), root, dir)
	if err != nil {
		t.Fatal(err)
	}
	defer core.Close()
	db, err := sql.Open("sqlite3", filepath.Join(dir, profile.DatabaseName))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err = db.Exec("PRAGMA wal_autocheckpoint=0; UPDATE profile_metadata SET revision=2"); err != nil {
		t.Fatal(err)
	}
	if got := status(t, core).Profile.Revision; got != "2" {
		t.Fatal(got)
	}
	fmt.Println("WAL_COMMITTED_2")
	// Parent SIGKILLs this child; no defer/checkpoint can discard the crash window.
	select {}
}
func TestCrashWALHardlinkCannotReadStaleState(t *testing.T) {
	root := privateRoot(t)
	dir := filepath.Join(root, "one")
	child := exec.Command(os.Args[0], "-test.run=^TestCrashWALChild$")
	child.Env = append(os.Environ(), "HUHU_CRASH_WAL_CHILD=1", "HUHU_CRASH_ROOT="+root, "HUHU_CRASH_DIR="+dir)
	stdout, err := child.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	var stderr bytes.Buffer
	child.Stderr = &stderr
	if err = child.Start(); err != nil {
		t.Fatal(err)
	}
	reaped := false
	defer func() {
		if !reaped {
			_ = child.Process.Kill()
			_ = child.Wait()
		}
	}()
	ready := make(chan string, 1)
	go func() { line, _ := bufio.NewReader(stdout).ReadString('\n'); ready <- line }()
	select {
	case line := <-ready:
		if line != "WAL_COMMITTED_2\n" {
			t.Fatalf("child: %s %s", line, stderr.String())
		}
	case <-time.After(5 * time.Second):
		t.Fatal("WAL child not ready")
	}
	alias := filepath.Join(root, "alias")
	if err = os.Mkdir(alias, 0700); err != nil {
		t.Fatal(err)
	}
	if err = os.Link(filepath.Join(dir, profile.DatabaseName), filepath.Join(alias, profile.DatabaseName)); err != nil {
		t.Fatal(err)
	}
	if err = child.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	_ = child.Wait()
	reaped = true
	before := map[string][]byte{}
	for _, name := range []string{profile.DatabaseName, profile.DatabaseName + "-wal", profile.DatabaseName + "-shm"} {
		before[name], err = os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
	}
	if len(before[profile.DatabaseName+"-wal"]) == 0 {
		t.Fatal("fixture has no crash WAL")
	}
	for _, locator := range []string{alias, dir} {
		c, e := bootstrap.Open(context.Background(), root, locator)
		if c != nil {
			_ = c.Close()
		}
		var f *api.Fault
		if !errors.As(e, &f) || f.Reason != "PROFILE_DB_HARDLINK_UNSAFE" {
			t.Fatalf("hardlink must be rejected before SQLite; %s got %v", locator, e)
		}
	}
	for name, want := range before {
		got, e := os.ReadFile(filepath.Join(dir, name))
		if e != nil || !bytes.Equal(got, want) {
			t.Fatalf("refusal changed crash data %s: %v", name, e)
		}
	}
	// Removing only the disposable alias restores a unique locator. Do not delete
	// or checkpoint a sidecar to make the persisted revision test pass.
	if err = os.Remove(filepath.Join(alias, profile.DatabaseName)); err != nil {
		t.Fatal(err)
	}
	c, err := bootstrap.Open(context.Background(), root, dir)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if got := status(t, c).Profile.Revision; got != "2" {
		t.Fatalf("lost committed WAL revision: %s", got)
	}
}
func TestRealStdoutBackpressureEOFReleasesProfile(t *testing.T) {
	dir := t.TempDir()
	binary := filepath.Join(dir, "huhubot")
	if runtime.GOOS == "windows" {
		binary += ".exe"
	}
	build := exec.Command("go", "build", "-o", binary, "./cmd/huhubot")
	build.Dir = "../../.."
	if out, e := build.CombinedOutput(); e != nil {
		t.Fatalf("build: %s %v", out, e)
	}
	state := filepath.Join(dir, "state")
	home, local := filepath.Join(dir, "home"), filepath.Join(dir, "local")
	locator := filepath.Join(state, "huhu", "huhubot", "profiles", "one")
	switch runtime.GOOS {
	case "windows":
		locator = filepath.Join(local, "HUHU", "huhubot", "profiles", "one")
	case "darwin":
		locator = filepath.Join(home, "Library", "Application Support", "HUHU", "huhubot", "profiles", "one")
	}
	cmd := exec.Command(binary, "--stdio", "--managed", "--profile", locator)
	cmd.Env = append(os.Environ(), "XDG_STATE_HOME="+state, "HOME="+home, "USERPROFILE="+home, "LOCALAPPDATA="+local)
	input, e := cmd.StdinPipe()
	if e != nil {
		t.Fatal(e)
	}
	output, e := cmd.StdoutPipe()
	if e != nil {
		t.Fatal(e)
	}
	defer output.Close()
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if e = cmd.Start(); e != nil {
		t.Fatal(e)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	finished := false
	defer func() {
		if !finished {
			_ = cmd.Process.Kill()
			<-done
		}
	}()
	var frames bytes.Buffer
	for n := 0; n < 900; n++ {
		if e = wire.WriteFrame(&frames, request(fmt.Sprintf("c:%d", n), "service.health", nil)); e != nil {
			t.Fatal(e)
		}
	}
	wrote := make(chan error, 1)
	go func() { _, err := input.Write(frames.Bytes()); _ = input.Close(); wrote <- err }()
	// stdout is deliberately never consumed. The Runner itself must terminate.
	select {
	case <-done:
		finished = true
	case <-time.After(3 * time.Second):
		t.Fatal("Runner still alive with stdout blocked after parent input EOF")
	}
	select {
	case <-wrote:
	case <-time.After(time.Second):
		t.Fatal("parent writer not released")
	}
	c, e := bootstrap.Open(context.Background(), filepath.Dir(locator), locator)
	if e != nil {
		t.Fatalf("DB lock remained after self-exit: %v stderr=%s", e, stderr.String())
	}
	_ = c.Close()
}
func TestSchemaExactHelloKeysRejectBeforeReady(t *testing.T) {
	c, _, _ := running(t, true)
	bad := json.RawMessage(`{"ProtocolVersion":"0.1","Client":{"Name":"case-probe","Version":"1"}}`)
	send(t, c, request("c:bad-case", "protocol.hello", bad))
	if got := receive(t, c)[0]; got.Error == nil || got.Error.Data.Kind != "INVALID_ARGUMENT" {
		t.Fatalf("schema-forbidden keys accepted: %#v", got)
	}
	send(t, c, request("c:still-gated", "service.health", nil))
	if got := receive(t, c)[0]; got.Error == nil || got.Error.Data.Reason != "HELLO_REQUIRED" {
		t.Fatal("invalid hello entered ready")
	}
	hello(t, c)
}

type invalidProfileReader struct{}

func (invalidProfileReader) ReadMetadata(context.Context) (api.ProfileMetadata, error) {
	return api.ProfileMetadata{ProfileID: "profile:synthetic", CommandEpoch: "1", Revision: "1", CreatedAt: "2026-02-30T00:00:00Z"}, nil
}
func TestInvalidApplicationHelloResultCannotEnterReady(t *testing.T) {
	host := api.NewHostService()
	app := &api.Facade{Service: api.NewService(invalidProfileReader{}, host), Host: host}
	router := inbound.New(app, api.NewConnectionIdentity("strict-result", "user", true))
	id := "c:hello"
	response := router.Dispatch(context.Background(), wire.Envelope{JSONRPC: "2.0", ID: &id, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"strict","version":"1"}}`)}, nil)
	if response.Error == nil || response.Error.Data.Reason != "INVALID_APPLICATION_RESULT" || router.Ready() {
		t.Fatal("invalid application DTO completed hello")
	}
}
