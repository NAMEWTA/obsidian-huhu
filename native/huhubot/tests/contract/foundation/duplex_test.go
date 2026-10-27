package foundation_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"os"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"path/filepath"
)

func request(id, method string, params any) map[string]any {
	e := map[string]any{"jsonrpc": "2.0", "method": method}
	if id != "" {
		e["id"] = id
	}
	if params != nil {
		e["params"] = params
	}
	return e
}
func receive(t *testing.T, r io.Reader) []wire.Envelope {
	t.Helper()
	es, _, err := wire.ReadFrame(r)
	if err != nil {
		t.Fatal(err)
	}
	return es
}
func send(t *testing.T, w io.Writer, e any) {
	t.Helper()
	if err := wire.WriteFrame(w, e); err != nil {
		t.Fatal(err)
	}
}
func hello(t *testing.T, c io.ReadWriter) wire.HelloResult {
	t.Helper()
	send(t, c, request("c:hello", "protocol.hello", wire.HelloParams{ProtocolVersion: "0.1", Client: wire.ClientInfo{Name: "contract", Version: "1"}}))
	e := receive(t, c)[0]
	if e.Error != nil {
		t.Fatal(e.Error)
	}
	var h wire.HelloResult
	if err := json.Unmarshal(e.Result, &h); err != nil {
		t.Fatal(err)
	}
	if h.ProtocolVersion != "0.1" || h.SchemaVersion != 1 || h.Limits.MaxFrameBytes != 1048576 || h.Limits.MaxBatchItems != 8 {
		t.Fatalf("hello constants %#v", h)
	}
	recovery, resume := false, false
	for _, method := range h.Capabilities {
		recovery = recovery || method == "runs.recovery"
		resume = resume || method == "runs.resume"
	}
	if recovery != resume {
		t.Fatal("partial recovery capability without its consumer", h.Capabilities)
	}
	return h
}
func running(t *testing.T, managed bool) (net.Conn, *bootstrap.Core, <-chan error) {
	t.Helper()
	root := privateRoot(t)
	core, err := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	client, conn := net.Pipe()
	_ = client.SetDeadline(time.Now().Add(5 * time.Second))
	server := stdio.New(conn, conn, core.API, api.NewConnectionIdentity("stdio", "user", managed))
	done := make(chan error, 1)
	go func() { done <- server.Run(context.Background()) }()
	t.Cleanup(func() {
		_ = client.Close()
		server.Close()
		select {
		case <-done:
		case <-time.After(3 * time.Second):
			t.Error("server did not terminate")
		}
		_ = core.Close()
	})
	return client, core, done
}
func TestHelloGateNotificationsSchemaAndOwner(t *testing.T) {
	c, core, _ := running(t, false)
	send(t, c, request("", "service.shutdown", nil))
	send(t, c, request("c:before", "service.health", nil))
	e := receive(t, c)[0]
	if e.Error == nil || e.Error.Data.Reason != "HELLO_REQUIRED" {
		t.Fatalf("gate: %#v", e)
	}
	hello(t, c)
	for _, method := range []string{"service.shutdown", "host.attach"} {
		p := any(map[string]any{})
		if method == "host.attach" {
			p = wire.HostAttachParams{WorkspaceID: "vault:1", Capabilities: []string{"vault.read"}}
		}
		send(t, c, request("c:"+method, method, p))
		e = receive(t, c)[0]
		if e.Error == nil || e.Error.Data.Kind != "CAPABILITY_DENIED" {
			t.Fatalf("ordinary connection gained ownership: %#v", e)
		}
	}
	if core.API.Service.Stopping() || core.API.Host.Attached() {
		t.Fatal("unauthorized side effect")
	}
	send(t, c, request("c:spoof", "service.shutdown", map[string]any{"owner": true}))
	if e = receive(t, c)[0]; e.Error == nil || e.Error.Data.Kind != "INVALID_ARGUMENT" {
		t.Fatal("accepted payload identity")
	}
	send(t, c, request("c:unavailable", "sessions.deletePreview", map[string]any{"profileId": "profile:x", "id": "session:missing"}))
	if e = receive(t, c)[0]; e.Error == nil || e.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
		t.Fatal("unimplemented method faked success")
	}
	send(t, c, []any{request("c:batch1", "service.health", nil), request("c:batch2", "profile.status", nil)})
	es := receive(t, c)
	if len(es) != 2 || es[0].Error != nil || es[1].Error != nil {
		t.Fatal("batch failed")
	}
}
func TestReverseHostResponsesDoNotBlockReader(t *testing.T) {
	c, core, _ := running(t, true)
	h := hello(t, c)
	send(t, c, request("c:attach", "host.attach", wire.HostAttachParams{WorkspaceID: "vault:one", Capabilities: []string{"note.write"}}))
	e := receive(t, c)[0]
	if e.Error != nil {
		t.Fatal(e.Error)
	}
	var lease wire.HostLease
	if err := json.Unmarshal(e.Result, &lease); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	done := make(chan error, 1)
	command := fullHostCommand(t, h.Profile, lease)
	go func() {
		r, err := core.API.Host.Invoke(ctx, command)
		if err == nil && (r.EffectID != "effect:one" || r.Status != "committed") {
			err = errors.New("wrong receipt")
		}
		done <- err
	}()
	reverse := receive(t, c)[0]
	if reverse.Method != "host.invoke" || reverse.ID == nil || !wire.ValidID(*reverse.ID, "s:") {
		t.Fatalf("bad reverse request %#v", reverse)
	}
	// The same reader services unrelated inbound requests while a reverse call waits.
	send(t, c, request("c:during", "service.health", nil))
	health := receive(t, c)[0]
	if health.ID == nil || *health.ID != "c:during" || health.Error != nil {
		t.Fatalf("reader blocked %#v", health)
	}
	send(t, c, map[string]any{"jsonrpc": "2.0", "id": *reverse.ID, "result": api.HostReceipt{EffectID: "effect:one", Status: "committed", ReceiptID: "receipt:one", Fingerprint: command.Fingerprint}})
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	go func() {
		r, err := core.API.Host.QueryReceipt(ctx, api.HostReceiptQuery{ProfileID: command.ProfileID, CommandEpoch: command.CommandEpoch, LeaseID: lease.LeaseID, HostConnectionID: lease.HostConnectionID, LeaseEpoch: lease.LeaseEpoch, WorkspaceID: lease.WorkspaceID, EffectID: "effect:one", Preview: command.Preview, Fingerprint: command.Fingerprint})
		if err == nil && r.Status != "committed" {
			err = errors.New("receipt query failed")
		}
		done <- err
	}()
	reverse = receive(t, c)[0]
	if reverse.Method != "host.queryReceipt" {
		t.Fatal(reverse.Method)
	}
	send(t, c, map[string]any{"jsonrpc": "2.0", "id": *reverse.ID, "result": api.HostReceipt{EffectID: "effect:one", Status: "committed", Fingerprint: command.Fingerprint}})
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	send(t, c, request("c:detach", "host.detach", wire.HostDetachParams{LeaseID: lease.LeaseID}))
	if receive(t, c)[0].Error != nil {
		t.Fatal("detach failed")
	}
	if _, err := core.API.Host.Invoke(ctx, api.HostInvokeCommand{LeaseID: lease.LeaseID, WorkspaceID: lease.WorkspaceID, Capability: "note.write", EffectID: "effect:two", Resource: api.HostResource{ResourceID: "note:one"}}); err == nil {
		t.Fatal("offline Host invoked")
	}
}
func TestProtocolFaultsEmitSanitizedErrorThenClose(t *testing.T) {
	cases := map[string][]byte{"zero": {0, 0, 0, 0}, "half-prefix": {0, 0}, "half-body": {0, 0, 0, 8, 1, 123}, "kind": frame([]byte(`{}`), 2), "utf8": frame([]byte{0xff}, 1), "json": frame([]byte(`{"private":"never-echo"`), 1), "oversize": {0, 16, 0, 1}, "direction": frame([]byte(`{"jsonrpc":"2.0","id":"s:wrong","method":"service.health"}`), 1)}
	for name, raw := range cases {
		t.Run(name, func(t *testing.T) {
			root := privateRoot(t)
			core, err := bootstrap.Open(context.Background(), root, filepath.Join(root, "one"))
			if err != nil {
				t.Fatal(err)
			}
			defer core.Close()
			input, writeInput, err := os.Pipe()
			if err != nil {
				t.Fatal(err)
			}
			output, writeOutput, err := os.Pipe()
			if err != nil {
				t.Fatal(err)
			}
			defer output.Close()
			server := stdio.New(input, writeOutput, core.API, api.NewConnectionIdentity("fault", "user", true))
			done := make(chan error, 1)
			go func() { done <- server.Run(context.Background()) }()
			if _, err = writeInput.Write(raw); err != nil {
				t.Fatal(err)
			}
			_ = writeInput.Close()
			read := make(chan []wire.Envelope, 1)
			readErr := make(chan error, 1)
			go func() {
				es, _, err := wire.ReadFrame(output)
				if err != nil {
					readErr <- err
				} else {
					read <- es
				}
			}()
			select {
			case es := <-read:
				if len(es) != 1 || es[0].ID != nil || es[0].Error == nil || es[0].Error.Data.Kind != "INVALID_ARGUMENT" {
					t.Fatalf("bad protocol error %#v", es)
				}
			case err := <-readErr:
				t.Fatal(err)
			case <-time.After(3 * time.Second):
				server.Close()
				t.Fatal("protocol fault hung")
			}
			select {
			case err := <-done:
				if err == nil {
					t.Fatal("fault claimed clean exit")
				}
			case <-time.After(3 * time.Second):
				server.Close()
				t.Fatal("server did not close")
			}
		})
	}
}
func TestManagedShutdownAndCleanEOF(t *testing.T) {
	c, core, _ := running(t, true)
	hello(t, c)
	send(t, c, request("c:shutdown", "service.shutdown", nil))
	es := receive(t, c)
	if es[0].Error != nil {
		t.Fatal(es[0].Error)
	}
	if !core.API.Service.Stopping() {
		t.Fatal("shutdown not accepted")
	}
	_ = c.SetReadDeadline(time.Now().Add(time.Second))
	if _, _, err := wire.ReadFrame(c); err == nil {
		t.Fatal("shutdown left transport open")
	}
}

func fullHostCommand(t *testing.T, profile wire.ProfileMetadata, lease wire.HostLease) api.HostInvokeCommand {
	t.Helper()
	b, e := os.ReadFile("../../../../../contracts/hap/v0.1/fixtures/effect-fingerprint.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixture struct {
		Cases []struct{ Command api.HostInvokeCommand }
	}
	if e = json.Unmarshal(b, &fixture); e != nil {
		t.Fatal(e)
	}
	c := fixture.Cases[0].Command
	c.ProfileID = profile.ProfileID
	c.CommandEpoch = profile.CommandEpoch
	c.LeaseID = lease.LeaseID
	c.HostConnectionID = lease.HostConnectionID
	c.LeaseEpoch = lease.LeaseEpoch
	c.WorkspaceID = lease.WorkspaceID
	c.Preview.Target.WorkspaceID = lease.WorkspaceID
	proof := c.Preview.Binding
	proof.ProfileID = c.ProfileID
	proof.CommandEpoch = c.CommandEpoch
	proof.WorkspaceID = c.WorkspaceID
	proof.LeaseID = c.LeaseID
	proof.HostConnectionID = c.HostConnectionID
	proof.LeaseEpoch = c.LeaseEpoch
	c.Fingerprint = api.EffectFingerprint(c)
	return c
}

func TestRecoveryCapabilitiesFollowActualFacade(t *testing.T) {
	for _, assembled := range []bool{false, true} {
		t.Run(map[bool]string{false: "absent", true: "assembled"}[assembled], func(t *testing.T) {
			client, core, _ := running(t, false)
			if !assembled {
				core.API.Recovery = nil
			}
			result := hello(t, client)
			found := map[string]bool{}
			for _, method := range result.Capabilities {
				found[method] = true
			}
			for _, method := range []string{"runs.recovery", "runs.resume"} {
				if found[method] != assembled {
					t.Fatal("recovery capability did not follow actual facade", method, assembled)
				}
			}
			send(t, client, request("c:recovery-consumer", "runs.recovery", map[string]any{"profileId": result.Profile.ProfileID, "id": "run:missing"}))
			reply := receive(t, client)[0]
			if reply.Error == nil {
				t.Fatal("missing Run unexpectedly succeeded")
			}
			if !assembled && reply.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
				t.Fatal("advertised absent consumer", reply.Error)
			}
			if assembled && reply.Error.Data.Reason != "RUN_NOT_FOUND" {
				t.Fatal("actual recovery consumer not reached", reply.Error)
			}
		})
	}
}
