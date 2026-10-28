package credentials

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"io"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type receipt struct {
	Version       int    `json:"version"`
	RequestID     string `json:"requestId"`
	ProfileID     string `json:"profileId"`
	CredentialRef string `json:"credentialRef"`
	Mode          string `json:"mode"`
	State         string `json:"state"`
	Reason        string `json:"reason,omitempty"`
}
type channel struct {
	r        io.ReadCloser
	w        io.WriteCloser
	once     sync.Once
	writeMu  sync.Mutex
	activeMu sync.Mutex
	active   map[string]bool
	slots    chan struct{}
	wg       sync.WaitGroup
	cancel   context.CancelFunc
}

func (c *channel) close() { c.once.Do(func() { c.cancel(); _ = c.r.Close(); _ = c.w.Close() }) }
func (c *channel) read() (request, error) {
	var first [1]byte
	if _, err := io.ReadFull(c.r, first[:]); err != nil {
		if err == io.EOF {
			return request{}, io.EOF
		}
		return request{}, errProtocol
	}
	timer := time.AfterFunc(RequestTimeout, c.close)
	defer timer.Stop()
	return readRequest(io.MultiReader(bytes.NewReader(first[:]), c.r))
}
func (c *channel) write(q request, s api.CredentialStatus) error {
	if s.Mode != "protected" && s.Mode != "session-memory" && s.Mode != "none" {
		s = failure("none", "PROVIDER_FAILED")
	}
	if s.State != "available" && s.State != "missing" && s.State != "failed" && s.State != "unknown" {
		s = failure(s.Mode, "PROVIDER_FAILED")
	}
	if s.Reason != "" && !safeReason(s.Reason) {
		s = failure(s.Mode, "PROVIDER_FAILED")
	}
	if s.State == "available" {
		s.Reason = ""
	}
	p, err := json.Marshal(receipt{1, q.meta.RequestID, q.meta.ProfileID, q.meta.CredentialRef, s.Mode, s.State, s.Reason})
	if err != nil {
		return errProtocol
	}
	frame := make([]byte, 4+len(p))
	binary.BigEndian.PutUint32(frame, uint32(len(p)))
	copy(frame[4:], p)
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	_, err = io.Copy(c.w, bytes.NewReader(frame))
	return err
}

// ServeChannel owns both private pipes until return. Its caller must establish
// managed ownership before opening them. Malformed frames close the channel;
// there is no get-secret operation and no HAP routing on these descriptors.
func ServeChannel(parent context.Context, r io.ReadCloser, w io.WriteCloser, profile string, registration api.CredentialRegistration) error {
	if !validProfile(profile) || registration == nil {
		_ = r.Close()
		_ = w.Close()
		return errProtocol
	}
	ctx, cancel := context.WithCancel(parent)
	c := &channel{r: r, w: w, cancel: cancel, active: map[string]bool{}, slots: make(chan struct{}, MaxInFlight)}
	stop := context.AfterFunc(ctx, c.close)
	defer func() { c.close(); stop(); c.wg.Wait() }()
	ready := false
	for {
		q, err := c.read()
		if err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			return errProtocol
		}
		if q.meta.ProfileID != profile || !ready && q.op != 0 || ready && q.op == 0 {
			wipe(q.secret)
			return errProtocol
		}
		c.activeMu.Lock()
		duplicate := c.active[q.meta.RequestID]
		if !duplicate {
			c.active[q.meta.RequestID] = true
		}
		c.activeMu.Unlock()
		if duplicate {
			wipe(q.secret)
			return errProtocol
		}
		if q.op == 0 {
			ready = true
			timer := time.AfterFunc(RequestTimeout, c.close)
			err = c.write(q, status("none", "available", ""))
			timer.Stop()
			c.activeMu.Lock()
			delete(c.active, q.meta.RequestID)
			c.activeMu.Unlock()
			if err != nil {
				return errProtocol
			}
			continue
		}
		select {
		case c.slots <- struct{}{}:
		default:
			wipe(q.secret)
			return errProtocol
		}
		c.wg.Add(1)
		go func(q request) {
			defer c.wg.Done()
			defer func() {
				wipe(q.secret)
				<-c.slots
				c.activeMu.Lock()
				delete(c.active, q.meta.RequestID)
				c.activeMu.Unlock()
			}()
			opCtx, done := context.WithTimeout(ctx, RequestTimeout)
			defer done()
			stop := context.AfterFunc(opCtx, c.close)
			defer stop()
			var s api.CredentialStatus
			switch q.op {
			case 1:
				s, _ = registration.Register(opCtx, profile, q.meta.CredentialRef, q.meta.StoragePreference, q.secret)
			case 2:
				s, _ = registration.Delete(opCtx, profile, q.meta.CredentialRef)
			case 3:
				s, _ = registration.Status(opCtx, profile, q.meta.CredentialRef)
			}
			if c.write(q, s) != nil {
				c.close()
			}
		}(q)
	}
}
