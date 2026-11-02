//go:build linux

package assistant_test

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/godbus/dbus/v5"
)

const busRoot = dbus.ObjectPath("/org/freedesktop/secrets")
const busCollection = dbus.ObjectPath("/org/freedesktop/secrets/collection/login")
const busItem = dbus.ObjectPath("/org/freedesktop/secrets/collection/login/item1")
const busPrompt = dbus.ObjectPath("/org/freedesktop/secrets/prompt/test")
const busSession = dbus.ObjectPath("/org/freedesktop/secrets/session/test")
const busSentinel = "HUHU_ISOLATED_DBUS_CREDENTIAL_SENTINEL_8921"

type testBusSecret struct {
	Session           dbus.ObjectPath
	Parameters, Value []byte
	ContentType       string
}
type busState struct {
	Stored                    bool
	Creates, Deletes, Prompts int
}
type testSecretService struct {
	conn       *dbus.Conn
	ctx        context.Context
	mode, file string
	mu         sync.Mutex
	value      []byte
	state      busState
	pending    string
	unlockPath dbus.ObjectPath
}

func (s *testSecretService) save() {
	s.state.Stored = len(s.value) > 0
	p, _ := json.Marshal(s.state)
	if os.WriteFile(s.file, p, 0600) != nil {
		os.Exit(92)
	}
}
func (s *testSecretService) OpenSession(_ string, _ dbus.Variant) (dbus.Variant, dbus.ObjectPath, *dbus.Error) {
	return dbus.MakeVariant(""), busSession, nil
}
func (s *testSecretService) Get(_ string, _ string) (dbus.Variant, *dbus.Error) {
	return dbus.MakeVariant([]dbus.ObjectPath{busCollection}), nil
}
func (s *testSecretService) Unlock(paths []dbus.ObjectPath) ([]dbus.ObjectPath, dbus.ObjectPath, *dbus.Error) {
	if s.mode == "locked" {
		return []dbus.ObjectPath{}, "/", nil
	}
	if s.mode == "unlock-cancel" || s.mode == "unlock-success" {
		s.mu.Lock()
		s.pending = "unlock"
		s.unlockPath = paths[0]
		s.mu.Unlock()
		return []dbus.ObjectPath{}, busPrompt, nil
	}
	return paths, "/", nil
}
func (s *testSecretService) CreateItem(_ map[string]dbus.Variant, secret testBusSecret, _ bool) (dbus.ObjectPath, dbus.ObjectPath, *dbus.Error) {
	s.mu.Lock()
	s.state.Creates++
	if s.mode == "denied-create" {
		s.save()
		s.mu.Unlock()
		return "/", "/", dbus.NewError("org.freedesktop.DBus.Error.AccessDenied", []any{"denied"})
	}
	if s.mode == "cancel-create" || s.mode == "spoof-cancel" {
		s.pending = "create"
		s.save()
		s.mu.Unlock()
		return "/", busPrompt, nil
	}
	s.value = append([]byte(nil), secret.Value...)
	s.save()
	if s.mode == "prompt-success" {
		s.pending = "create"
		s.mu.Unlock()
		return "/", busPrompt, nil
	}
	s.mu.Unlock()
	if s.mode == "unknown-create" {
		<-s.ctx.Done()
		return "/", "/", dbus.NewError("org.freedesktop.DBus.Error.NoReply", nil)
	}
	if s.mode == "disconnect-create" {
		_ = s.conn.Close()
		return "/", "/", dbus.NewError("org.freedesktop.DBus.Error.Disconnected", nil)
	}
	return busItem, "/", nil
}
func (s *testSecretService) SearchItems(_ map[string]string) ([]dbus.ObjectPath, *dbus.Error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.value) == 0 {
		return []dbus.ObjectPath{}, nil
	}
	return []dbus.ObjectPath{busItem}, nil
}
func (s *testSecretService) GetSecret(session dbus.ObjectPath) (testBusSecret, *dbus.Error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return testBusSecret{session, []byte{}, append([]byte(nil), s.value...), "application/octet-stream"}, nil
}
func (s *testSecretService) Delete() (dbus.ObjectPath, *dbus.Error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state.Deletes++
	if s.mode == "denied-delete" {
		s.save()
		return "/", dbus.NewError("org.freedesktop.DBus.Error.AccessDenied", []any{"denied"})
	}
	if s.mode == "cancel-delete" || s.mode == "prompt-success" {
		s.pending = "delete"
		s.save()
		return busPrompt, nil
	}
	for i := range s.value {
		s.value[i] = 0
	}
	s.value = nil
	s.save()
	return "/", nil
}
func (s *testSecretService) Prompt(_ string) *dbus.Error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state.Prompts++
	dismissed := s.mode == "cancel-create" || s.mode == "cancel-delete" || s.mode == "spoof-cancel" || s.mode == "unlock-cancel"
	result := dbus.MakeVariant(dbus.ObjectPath("/"))
	if !dismissed {
		switch s.pending {
		case "create":
			result = dbus.MakeVariant(busItem)
		case "delete":
			for i := range s.value {
				s.value[i] = 0
			}
			s.value = nil
		case "unlock":
			result = dbus.MakeVariant([]dbus.ObjectPath{s.unlockPath})
		}
	}
	if s.mode == "spoof-cancel" {
		// Correct member from a wrong object, then correct object from another
		// unique sender, must not override the real dismissal emitted below.
		_ = s.conn.Emit("/org/freedesktop/secrets/prompt/wrong", "org.freedesktop.Secret.Prompt.Completed", false, dbus.MakeVariant(busItem))
		attacker, e := dbus.Connect(os.Getenv("DBUS_SESSION_BUS_ADDRESS"))
		if e != nil {
			os.Exit(93)
		}
		_ = attacker.Emit(busPrompt, "org.freedesktop.Secret.Prompt.Completed", false, dbus.MakeVariant(busItem))
		_ = attacker.Close()
	}
	s.save()
	// Emit before the method reply: a client subscribing after Prompt loses it.
	if s.conn.Emit(busPrompt, "org.freedesktop.Secret.Prompt.Completed", dismissed, result) != nil {
		os.Exit(94)
	}
	return nil
}
func (s *testSecretService) Close() *dbus.Error { return nil }

func TestCredentialSecretServiceProcess(t *testing.T) {
	index := -1
	for i, arg := range os.Args {
		if arg == "--secret-service-test" {
			index = i
			break
		}
	}
	if index < 0 {
		return
	}
	if index+3 >= len(os.Args) {
		os.Exit(90)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	conn, err := dbus.Connect(os.Args[index+2])
	if err != nil {
		os.Exit(91)
	}
	defer conn.Close()
	s := &testSecretService{conn: conn, ctx: ctx, mode: os.Args[index+1], file: os.Args[index+3]}
	s.save()
	for _, v := range []struct {
		path  dbus.ObjectPath
		iface string
	}{{busRoot, "org.freedesktop.Secret.Service"}, {busRoot, "org.freedesktop.DBus.Properties"}, {busCollection, "org.freedesktop.Secret.Collection"}, {busItem, "org.freedesktop.Secret.Item"}, {busPrompt, "org.freedesktop.Secret.Prompt"}, {busSession, "org.freedesktop.Secret.Session"}} {
		if conn.Export(s, v.path, v.iface) != nil {
			os.Exit(95)
		}
	}
	name, e := conn.RequestName("org.freedesktop.secrets", dbus.NameFlagDoNotQueue)
	if e != nil || name != dbus.RequestNameReplyPrimaryOwner {
		os.Exit(96)
	}
	fmt.Println("READY")
	<-ctx.Done()
	_ = conn.Close()
	os.Exit(0)
}

type busProcess struct {
	cmd    *exec.Cmd
	lines  *bufio.Scanner
	done   chan error
	stderr bytes.Buffer
}

func startBusProcess(t *testing.T, cmd *exec.Cmd) *busProcess {
	t.Helper()
	p := &busProcess{cmd: cmd, done: make(chan error, 1)}
	out, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	cmd.Stderr = &p.stderr
	p.lines = bufio.NewScanner(out)
	if err = cmd.Start(); err != nil {
		t.Fatal(err)
	}
	go func() { p.done <- cmd.Wait(); close(p.done) }()
	t.Cleanup(func() {
		_ = cmd.Process.Signal(syscall.SIGTERM)
		var waitErr error
		select {
		case waitErr = <-p.done:
		case <-time.After(3 * time.Second):
			t.Error("isolated service did not stop after SIGTERM")
			_ = cmd.Process.Kill()
			select {
			case waitErr = <-p.done:
			case <-time.After(2 * time.Second):
				t.Error("isolated service process not reaped")
				return
			}
		}
		if waitErr != nil {
			exit, ok := waitErr.(*exec.ExitError)
			if !ok || !exit.Sys().(syscall.WaitStatus).Signaled() || exit.Sys().(syscall.WaitStatus).Signal() != syscall.SIGTERM {
				t.Errorf("isolated service failed: %v", waitErr)
			}
		}
		if p.stderr.Len() != 0 {
			if bytes.Contains(p.stderr.Bytes(), []byte(busSentinel)) {
				t.Error("isolated service diagnostics contained a synthetic credential")
			} else {
				t.Errorf("isolated service %s emitted diagnostics: %.2000s", filepath.Base(cmd.Path), p.stderr.Bytes())
			}
		}
	})
	return p
}
func (p *busProcess) line(t *testing.T) string {
	t.Helper()
	ch := make(chan string, 1)
	go func() {
		if p.lines.Scan() {
			ch <- p.lines.Text()
		} else {
			ch <- ""
		}
	}()
	select {
	case line := <-ch:
		if line == "" {
			t.Fatal("isolated service failed readiness")
		}
		return line
	case <-time.After(5 * time.Second):
		t.Fatal("isolated service readiness timeout")
	}
	return ""
}

const busClientJS = `
const {launchManagedBotSession}=require(process.argv[2]);
const path=require('node:path'), fs=require('node:fs/promises'), cp=require('node:child_process');
(async()=>{
 const root=process.argv[4], mode=process.argv[5], state=path.join(root,'state');
 const session=await launchManagedBotSession({binary:process.argv[3],cwd:root,profileDir:path.join(state,'huhu/huhubot/profiles/one'),environment:{HOME:root,XDG_STATE_HOME:state,DBUS_SESSION_BUS_ADDRESS:process.env.DBUS_SESSION_BUS_ADDRESS}},{name:'isolated-dbus-contract',version:'1'});
 try {
  const input=Buffer.from('HUHU_ISOLATED_DBUS_CREDENTIAL_SENTINEL_8921');
  const registered=await session.credentials.register(input,'protected');
  let result=registered;
  if(['success','prompt-success','unlock-success','cancel-delete','denied-delete'].includes(mode)) result=await session.credentials.delete(registered.credentialRef);
  const database=path.join(state,'huhu/huhubot/profiles/one/profile.sqlite3');
  const catalog=JSON.parse(cp.execFileSync('python3',['-c','import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); print(json.dumps(c.execute("select mode,state,reason,deleting from credential_metadata").fetchall())); c.close()',database],{encoding:'utf8'}));
  const checked=await session.credentials.status(registered.credentialRef);
  const hap=JSON.stringify(await session.client.service.status({}));
  if(hap.includes('HUHU_ISOLATED_DBUS_CREDENTIAL_SENTINEL_8921')) throw new Error('HAP credential leak');
  console.log(JSON.stringify({registered,result,checked,catalog,cleared:input.every(x=>x===0)}));
 } finally {session.close();await session.exited;}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
`

func TestCredentialActualSecretServiceOutcomes(t *testing.T) {
	for _, tool := range []string{"dbus-daemon", "node", "pnpm", "python3"} {
		if _, err := exec.LookPath(tool); err != nil {
			t.Fatalf("isolated Secret Service contract requires %s: %v", tool, err)
		}
	}
	binary := credentialBinary(t)
	buildRoot := t.TempDir()
	bundle := filepath.Join(buildRoot, "managed.cjs")
	script := filepath.Join(buildRoot, "client.cjs")
	if err := os.WriteFile(script, []byte(busClientJS), 0600); err != nil {
		t.Fatal(err)
	}
	repo := filepath.Join("..", "..", "..", "..", "..")
	buildCtx, buildCancel := context.WithTimeout(context.Background(), time.Minute)
	defer buildCancel()
	build := exec.CommandContext(buildCtx, "pnpm", "exec", "esbuild", "src/modules/huhubot/platform/desktop/transport/managed.ts", "--bundle", "--platform=node", "--format=cjs", "--outfile="+bundle)
	build.Dir = repo
	if output, err := build.CombinedOutput(); err != nil {
		t.Fatalf("actual TS transport bundle failed: %v %s", err, output)
	}
	for _, mode := range []string{"cancel-create", "cancel-delete", "success", "prompt-success", "denied-create", "denied-delete", "unlock-cancel", "unlock-success", "locked", "unknown-create", "disconnect-create", "spoof-cancel"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			busDir, err := os.MkdirTemp("", "huhu-bus-")
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := os.RemoveAll(busDir); err != nil {
					t.Error(err)
				}
			})
			socket := filepath.Join(busDir, "socket")
			if len(socket) > 100 {
				t.Fatal("isolated D-Bus socket path exceeds Unix path budget")
			}
			// No servicedir, standard_session_servicedirs, servicehelper or includes:
			// losing the fake owner cannot activate a host credential service.
			config := `<busconfig><type>session</type><listen>unix:path=` + dbus.EscapeBusAddressValue(socket) + `</listen><auth>EXTERNAL</auth><policy context="default"><allow user="*"/><allow own="*"/><allow send_destination="*"/><allow receive_sender="*"/></policy></busconfig>`
			configPath := filepath.Join(busDir, "bus.conf")
			if err = os.WriteFile(configPath, []byte(config), 0600); err != nil {
				t.Fatal(err)
			}
			busCmd := exec.Command("dbus-daemon", "--config-file="+configPath, "--nofork", "--nopidfile", "--print-address=1")
			busCmd.Env = []string{"HOME=" + filepath.Join(busDir, "home"), "XDG_DATA_HOME=" + filepath.Join(busDir, "data"), "XDG_CONFIG_HOME=" + filepath.Join(busDir, "config"), "XDG_RUNTIME_DIR=" + filepath.Join(busDir, "run")}
			bus := startBusProcess(t, busCmd)
			address := bus.line(t)
			inspect, err := dbus.Connect(address)
			if err != nil {
				t.Fatal(err)
			}
			var activatable []string
			if err = inspect.BusObject().Call("org.freedesktop.DBus.ListActivatableNames", 0).Store(&activatable); err != nil {
				_ = inspect.Close()
				t.Fatal(err)
			}
			for _, name := range activatable {
				if name != "org.freedesktop.DBus" {
					_ = inspect.Close()
					t.Fatalf("isolated bus permits service activation: %s", name)
				}
			}
			var ignored dbus.Variant
			err = inspect.Object("org.freedesktop.secrets", busRoot).Call("org.freedesktop.DBus.Properties.Get", 0, "org.freedesktop.Secret.Service", "Collections").Store(&ignored)
			dbusErr, ok := err.(dbus.Error)
			if !ok || dbusErr.Name != "org.freedesktop.DBus.Error.ServiceUnknown" && dbusErr.Name != "org.freedesktop.DBus.Error.NameHasNoOwner" {
				_ = inspect.Close()
				t.Fatalf("offline fake owner did not fail closed: %v", err)
			}
			_ = inspect.Close()
			t.Logf("isolated bus offline owner: %s, activatable=%v, unique-private-socket=true", dbusErr.Name, activatable)
			stateFile := filepath.Join(root, "service-state.json")
			fakeCmd := exec.Command(os.Args[0], "-test.run=^TestCredentialSecretServiceProcess$", "--", "--secret-service-test", mode, address, stateFile)
			fakeCmd.Env = append(os.Environ(), "DBUS_SESSION_BUS_ADDRESS="+address)
			fake := startBusProcess(t, fakeCmd)
			if fake.line(t) != "READY" {
				t.Fatal("Secret Service not ready")
			}
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			client := exec.CommandContext(ctx, "node", script, bundle, binary, root, mode)
			client.Env = append(os.Environ(), "DBUS_SESSION_BUS_ADDRESS="+address)
			var out, stderr bytes.Buffer
			client.Stdout = &out
			client.Stderr = &stderr
			if err := client.Run(); err != nil {
				t.Fatalf("actual TS/Runner/worker chain failed: %v %s", err, stderr.Bytes())
			}
			if client.ProcessState == nil || ctx.Err() != nil || stderr.Len() != 0 || bytes.Contains(out.Bytes(), []byte(busSentinel)) {
				t.Fatal("client not reaped or emitted credential")
			}
			children, err := os.ReadFile(fmt.Sprintf("/proc/%d/task/%d/children", bus.cmd.Process.Pid, bus.cmd.Process.Pid))
			if err != nil || len(bytes.TrimSpace(children)) != 0 {
				t.Fatal("isolated bus spawned an activation process")
			}
			if mode == "disconnect-create" {
				observer, e := dbus.Connect(address)
				if e != nil {
					t.Fatal(e)
				}
				var owner string
				e = observer.BusObject().Call("org.freedesktop.DBus.GetNameOwner", 0, "org.freedesktop.secrets").Store(&owner)
				missing, ok := e.(dbus.Error)
				if !ok || missing.Name != "org.freedesktop.DBus.Error.NameHasNoOwner" {
					_ = observer.Close()
					t.Fatal("disconnected fake owner was replaced")
				}
				e = observer.Object("org.freedesktop.secrets", busRoot).Call("org.freedesktop.DBus.Properties.Get", 0, "org.freedesktop.Secret.Service", "Collections").Store(&ignored)
				missing, ok = e.(dbus.Error)
				_ = observer.Close()
				if !ok || missing.Name != "org.freedesktop.DBus.Error.ServiceUnknown" {
					t.Fatalf("offline fake activated a replacement: %v", e)
				}
				t.Log("disconnected fake: NameHasNoOwner, ServiceUnknown, activation-processes=0")
			}
			var result struct {
				Registered, Result, Checked struct{ Mode, State, Reason string }
				Catalog                     [][]any
				Cleared                     bool
			}
			if err := json.Unmarshal(out.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if !result.Cleared || len(result.Catalog) != 1 {
				t.Fatal("caller buffer or durable catalog missing")
			}
			p, err := os.ReadFile(stateFile)
			if err != nil {
				t.Fatal(err)
			}
			var actual busState
			if json.Unmarshal(p, &actual) != nil {
				t.Fatal("service state malformed")
			}
			wantState, wantReason, wantStored := "failed", "PROTECTION_DENIED", false
			switch mode {
			case "cancel-delete", "denied-delete":
				wantStored = true
			case "success", "prompt-success", "unlock-success":
				wantState = "missing"
				wantReason = "CREDENTIAL_DELETED"
			case "locked":
				wantReason = "PROTECTION_LOCKED"
			case "unknown-create", "disconnect-create":
				wantState = "unknown"
				wantReason = ""
				wantStored = true
			}
			if result.Result.State != wantState || wantReason != "" && result.Result.Reason != wantReason || result.Result.Mode != "protected" {
				t.Fatalf("unsafe operation receipt: %#v", result.Result)
			}
			row := result.Catalog[0]
			if len(row) != 4 || row[0] != "protected" || row[1] != wantState || wantReason != "" && row[2] != wantReason || row[3] != float64(0) {
				t.Fatalf("wrong catalog BEFORE status: %#v", row)
			}
			if actual.Stored != wantStored {
				t.Fatalf("receipt disagreed with actual service storage: %#v", actual)
			}
			wantCreates, wantDeletes := 1, 0
			if mode == "locked" || mode == "unlock-cancel" {
				wantCreates = 0
			}
			if mode == "success" || mode == "prompt-success" || mode == "unlock-success" || mode == "cancel-delete" || mode == "denied-delete" {
				wantDeletes = 1
			}
			if actual.Creates != wantCreates || actual.Deletes != wantDeletes {
				t.Fatalf("operation retried or bypassed expected service boundary: %#v", actual)
			}
			if wantStored && mode != "disconnect-create" && result.Checked.State != "available" {
				t.Fatalf("same-ref status did not find retained secret: %#v", result.Checked)
			}
			if !wantStored && mode != "locked" && mode != "unlock-cancel" && result.Checked.State != "missing" {
				t.Fatalf("same-ref status unexpectedly available: %#v", result.Checked)
			}
			if strings.Contains(mode, "cancel") && actual.Prompts == 0 {
				t.Fatal("fixture did not emit a real prompt signal")
			}
			if mode == "success" || mode == "prompt-success" || mode == "unlock-success" {
				if result.Registered.State != "available" || actual.Creates != 1 || actual.Deletes != 1 {
					t.Fatal("success control did not really write/delete")
				}
			}
			if err = filepath.WalkDir(filepath.Join(root, "state"), func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if !d.IsDir() {
					p, err := os.ReadFile(path)
					if err != nil {
						return err
					}
					if bytes.Contains(p, []byte(busSentinel)) {
						return fmt.Errorf("credential persisted outside OS boundary")
					}
				}
				return nil
			}); err != nil {
				t.Fatal(err)
			}
			t.Logf("actual TS/Runner/worker/D-Bus %s: result=%s/%s, catalog-before-status=%s, service-stored=%t, status=%s, caller-cleared=%t, client-waited=true", mode, result.Result.State, result.Result.Reason, row[1], actual.Stored, result.Checked.State, result.Cleared)
		})
	}
}
