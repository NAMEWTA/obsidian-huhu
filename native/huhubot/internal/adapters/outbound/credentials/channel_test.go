package credentials

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"testing"
	"time"
)

func channelFixture(t *testing.T, f *credentialFixture) (net.Conn, chan error) {
	t.Helper()
	server, client := net.Pipe()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- ServeChannel(ctx, server, server, f.profileID, f.r) }()
	t.Cleanup(func() {
		cancel()
		_ = client.Close()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			t.Error("private channel did not finish cleanup")
		}
	})
	if err := client.SetDeadline(time.Now().Add(6 * time.Second)); err != nil {
		t.Fatal(err)
	}
	return client, done
}
func sendPrivate(t *testing.T, c net.Conn, op byte, profile, ref, mode string, index int, secret []byte) {
	t.Helper()
	m := metadata{RequestID: fmt.Sprintf("request:%032x", index), ProfileID: profile, CredentialRef: ref, StoragePreference: mode}
	p, e := json.Marshal(m)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = c.Write(requestFrame(op, string(p), secret)); e != nil {
		t.Fatal(e)
	}
}
func readReceipt(t *testing.T, c net.Conn) receipt {
	t.Helper()
	var h [4]byte
	if _, e := io.ReadFull(c, h[:]); e != nil {
		t.Fatal(e)
	}
	n := int(binary.BigEndian.Uint32(h[:]))
	if n == 0 || n > 2048 {
		t.Fatal("unsafe receipt size")
	}
	p := make([]byte, n)
	if _, e := io.ReadFull(c, p); e != nil {
		t.Fatal(e)
	}
	if bytes.Contains(p, []byte(sentinel)) {
		t.Fatal("receipt leaked secret")
	}
	var r receipt
	if e := json.Unmarshal(p, &r); e != nil {
		t.Fatal(e)
	}
	return r
}
func helloPrivate(t *testing.T, c net.Conn, profile string) {
	t.Helper()
	sendPrivate(t, c, 0, profile, "", "", 0, nil)
	r := readReceipt(t, c)
	if r.Mode != "none" || r.State != "available" || r.CredentialRef != "" || r.Reason != "" {
		t.Fatal(r)
	}
}

type onceBlock struct {
	io.ReadCloser
	n int
}

func (o *onceBlock) Read(p []byte) (int, error) {
	if o.n == 0 {
		o.n++
		return 0, errWouldBlock
	}
	return o.ReadCloser.Read(p)
}

func TestPrivateChannelWaitsThroughTransientRead(t *testing.T) {
	f := newCredentialFixture(t)
	server, client := net.Pipe()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- ServeChannel(ctx, &onceBlock{ReadCloser: server}, server, f.profileID, f.r) }()
	t.Cleanup(func() {
		cancel()
		_ = client.Close()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			t.Error("private channel did not finish cleanup")
		}
	})
	if err := client.SetDeadline(time.Now().Add(6 * time.Second)); err != nil {
		t.Fatal(err)
	}
	helloPrivate(t, client, f.profileID)
}

func TestPrivateChannelRegistrationStatusDeleteAndEOF(t *testing.T) {
	f := newCredentialFixture(t)
	c, done := channelFixture(t, f)
	helloPrivate(t, c, f.profileID)
	for i, op := range []byte{1, 3, 2, 3} {
		mode := ""
		var secret []byte
		if op == 1 {
			mode = "session-memory"
			secret = []byte(sentinel)
		}
		sendPrivate(t, c, op, f.profileID, testRef, mode, i+1, secret)
		r := readReceipt(t, c)
		want := "available"
		if i >= 2 {
			want = "missing"
		}
		if r.State != want || r.Mode != "session-memory" || r.CredentialRef != testRef {
			t.Fatal(r)
		}
	}
	_ = c.Close()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
		done <- err
	case <-time.After(time.Second):
		t.Fatal("EOF did not stop private channel")
	}
}
func TestPrivateChannelRejectsProfilePreHelloAndDuplicateHello(t *testing.T) {
	for _, kind := range []string{"profile", "prehello", "duplicatehello"} {
		t.Run(kind, func(t *testing.T) {
			f := newCredentialFixture(t)
			c, done := channelFixture(t, f)
			switch kind {
			case "profile":
				sendPrivate(t, c, 0, "profile:other", "", "", 0, nil)
			case "prehello":
				sendPrivate(t, c, 3, f.profileID, testRef, "", 1, nil)
			case "duplicatehello":
				helloPrivate(t, c, f.profileID)
				sendPrivate(t, c, 0, f.profileID, "", "", 2, nil)
			}
			select {
			case err := <-done:
				if err == nil {
					t.Fatal("unsafe private request was accepted")
				}
				done <- err
			case <-time.After(time.Second):
				t.Fatal("unsafe private request did not close")
			}
		})
	}
}
func TestPrivateChannelPartialFrameAndSlowConsumerAreBounded(t *testing.T) {
	for _, kind := range []string{"partial", "slowconsumer"} {
		t.Run(kind, func(t *testing.T) {
			f := newCredentialFixture(t)
			c, done := channelFixture(t, f)
			start := time.Now()
			if kind == "partial" {
				if _, e := c.Write([]byte{0}); e != nil {
					t.Fatal(e)
				}
			} else {
				sendPrivate(t, c, 0, f.profileID, "", "", 0, nil)
			}
			select {
			case err := <-done:
				done <- err
			case <-time.After(4500 * time.Millisecond):
				t.Fatal("half frame or slow writer hung")
			}
			if time.Since(start) < RequestTimeout-100*time.Millisecond {
				t.Fatal("fixture did not reach timeout path")
			}
		})
	}
}
func TestPrivateChannelClosesAtNinthInFlightAndWaitsForWorkers(t *testing.T) {
	f := newCredentialFixture(t)
	entered := make(chan struct{}, MaxInFlight)
	f.p.backend = func(ctx context.Context, _ byte, _, _ string, _ []byte) ([]byte, string) {
		entered <- struct{}{}
		<-ctx.Done()
		return nil, contextReason(ctx)
	}
	c, done := channelFixture(t, f)
	helloPrivate(t, c, f.profileID)
	for i := 1; i <= MaxInFlight; i++ {
		sendPrivate(t, c, 1, f.profileID, fmt.Sprintf("credential:%032x", i), "protected", i, []byte(sentinel))
		// Reach the real backend before admitting the next catalog mutation.
		select {
		case <-entered:
		case <-time.After(time.Second):
			t.Fatal("worker fixture not ready")
		}
	}
	sendPrivate(t, c, 3, f.profileID, testRef, "", MaxInFlight+1, nil)
	// Liveness only. The ninth request is still rejected; reaping the eight
	// blocked workers can miss a 1s slice when this package shares a runner.
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("ninth in-flight accepted")
		}
		done <- err
	case <-time.After(5 * time.Second):
		t.Fatal("channel did not cancel/reap active operations")
	}
}
