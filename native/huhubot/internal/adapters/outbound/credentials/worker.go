package credentials

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var workerReasons = []string{"", "CREDENTIAL_MISSING", "PROTECTION_UNAVAILABLE", "PROTECTION_LOCKED", "PROTECTION_DENIED", "PROVIDER_FAILED", "OPERATION_TIMEOUT"}

type supervisor struct {
	executable string
	command    func(context.Context, string, ...string) *exec.Cmd
}
type boundedBuffer struct {
	bytes.Buffer
	limit int
}

func (b *boundedBuffer) Write(p []byte) (int, error) {
	if len(p) > b.limit-b.Len() {
		return 0, errProtocol
	}
	return b.Buffer.Write(p)
}
func workerEnvironment(env []string) []string {
	allowed := map[string]bool{"HOME": true, "USERPROFILE": true, "LOCALAPPDATA": true, "APPDATA": true, "XDG_STATE_HOME": true, "XDG_CONFIG_HOME": true, "XDG_DATA_HOME": true, "XDG_RUNTIME_DIR": true, "DBUS_SESSION_BUS_ADDRESS": true, "TMPDIR": true, "TEMP": true, "TMP": true, "SYSTEMROOT": true, "WINDIR": true, "LANG": true, "LC_ALL": true, "TZ": true}
	out := []string{}
	for _, v := range env {
		k, _, ok := strings.Cut(v, "=")
		if ok && allowed[strings.ToUpper(k)] {
			out = append(out, v)
		}
	}
	return out
}
func (s *supervisor) execute(ctx context.Context, op byte, profile, ref string, secret []byte) ([]byte, string) {
	if ctx.Err() != nil {
		return nil, contextReason(ctx)
	}
	m := metadata{RequestID: "request:00000000000000000000000000000000", ProfileID: profile, CredentialRef: ref}
	if op == 1 {
		m.StoragePreference = "protected"
	}
	meta, err := json.Marshal(m)
	if err != nil {
		return nil, "PROVIDER_FAILED"
	}
	frame := make([]byte, 8+len(meta)+len(secret))
	defer wipe(frame)
	binary.BigEndian.PutUint32(frame, uint32(len(frame)-4))
	frame[4] = 1
	frame[5] = op
	binary.BigEndian.PutUint16(frame[6:], uint16(len(meta)))
	copy(frame[8:], meta)
	copy(frame[8+len(meta):], secret)
	command := s.command
	if command == nil {
		command = exec.CommandContext
	}
	cmd := command(ctx, s.executable, "--credential-worker=stdio-v1")
	cmd.Env = workerEnvironment(os.Environ())
	cmd.Dir = filepath.Dir(s.executable)
	cmd.Stdin = bytes.NewReader(frame)
	out := &boundedBuffer{limit: MaxSecretBytes + 8}
	stderr := &boundedBuffer{limit: 4096}
	defer func() { wipe(out.Bytes()); wipe(stderr.Bytes()) }()
	cmd.Stdout = out
	cmd.Stderr = stderr
	cmd.WaitDelay = 100 * time.Millisecond
	// Assign the job only after Start. Closing it before Wait would kill a
	// successful worker when KILL_ON_JOB_CLOSE is set.
	afterStart := configureWorkerProcess(cmd)
	if err = cmd.Start(); err != nil {
		if ctx.Err() != nil {
			return nil, contextReason(ctx)
		}
		return nil, "PROVIDER_FAILED"
	}
	release := afterStart()
	err = cmd.Wait()
	release()
	if err != nil {
		if ctx.Err() != nil {
			return nil, contextReason(ctx)
		}
		return nil, "PROVIDER_FAILED"
	}
	p := out.Bytes()
	if len(p) < 8 || binary.BigEndian.Uint32(p) != uint32(len(p)-4) || p[4] != 1 || int(p[5]) >= len(workerReasons) || binary.BigEndian.Uint16(p[6:]) != uint16(len(p)-8) {
		return nil, "PROVIDER_FAILED"
	}
	reason := workerReasons[p[5]]
	if reason != "" {
		if len(p) != 8 {
			return nil, "PROVIDER_FAILED"
		}
		return nil, reason
	}
	if op != 3 && len(p) != 8 || op == 3 && (len(p) == 8 || len(p)-8 > MaxSecretBytes) {
		return nil, "PROVIDER_FAILED"
	}
	return append([]byte(nil), p[8:]...), ""
}

// RunWorker handles one bounded private stdin frame and exits. The CLI must
// dispatch this fixed mode before opening a Profile, DB, HAP or user listener.
func RunWorker(parent context.Context, r io.Reader, w io.Writer) error {
	return runWorker(parent, r, w, osCredential)
}
func runWorker(parent context.Context, r io.Reader, w io.Writer, backend func(context.Context, byte, string, string, []byte) ([]byte, string)) error {
	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()
	q, err := readRequest(r)
	if err != nil {
		return errProtocol
	}
	defer wipe(q.secret)
	if q.op == 0 {
		return errProtocol
	}
	var tail [1]byte
	if n, e := r.Read(tail[:]); n != 0 || !errors.Is(e, io.EOF) {
		return errProtocol
	}
	secret, reason := backend(ctx, q.op, q.meta.ProfileID, q.meta.CredentialRef, q.secret)
	defer wipe(secret)
	code := byte(5)
	for i, v := range workerReasons {
		if v == reason {
			code = byte(i)
			break
		}
	}
	if reason != "" {
		wipe(secret)
		secret = nil
	}
	if len(secret) > MaxSecretBytes {
		return errProtocol
	}
	frame := make([]byte, 8+len(secret))
	defer wipe(frame)
	binary.BigEndian.PutUint32(frame, uint32(len(frame)-4))
	frame[4] = 1
	frame[5] = code
	binary.BigEndian.PutUint16(frame[6:], uint16(len(secret)))
	copy(frame[8:], secret)
	_, err = io.Copy(w, bytes.NewReader(frame))
	return err
}

func namespace(profile, ref string) (string, string) { return "huhu.bot.v1." + profile, ref }
