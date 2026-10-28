package credentials

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

const MaxInFlight = 8
const RequestTimeout = 3 * time.Second
const defaultWorkerTimeout = 2500 * time.Millisecond

// Options binds the provider to the existing Profile catalog and current binary.
// Executable, when supplied, must identify this running executable, never PATH.
type Options struct {
	Executable    string
	WorkerTimeout time.Duration
	Catalog       api.CredentialCatalog
}

// Provider owns session buffers and bounded workers. Resolve returns a caller-owned
// copy; the consumer must wipe it after use. Close cancels, reaps, then wipes.
type Provider struct {
	catalog api.CredentialCatalog
	backend func(context.Context, byte, string, string, []byte) ([]byte, string)
	ctx     context.Context
	cancel  context.CancelFunc
	mu      sync.Mutex
	writeMu sync.RWMutex
	closed  bool
	memory  map[string][]byte
	wg      sync.WaitGroup
	slots   chan struct{}
	timeout time.Duration
}

func NewProvider(o Options) (*Provider, error) {
	if o.Catalog == nil {
		return nil, api.Invalid("CATALOG_UNAVAILABLE")
	}
	self, err := os.Executable()
	if err != nil {
		return nil, api.Denied("PROTECTION_UNAVAILABLE")
	}
	if o.Executable == "" {
		o.Executable = self
	}
	a, e1 := os.Stat(self)
	b, e2 := os.Stat(o.Executable)
	if !filepath.IsAbs(o.Executable) || e1 != nil || e2 != nil || !b.Mode().IsRegular() || !os.SameFile(a, b) {
		return nil, api.Denied("PROTECTION_UNAVAILABLE")
	}
	if o.WorkerTimeout <= 0 || o.WorkerTimeout > defaultWorkerTimeout {
		o.WorkerTimeout = defaultWorkerTimeout
	}
	ctx, cancel := context.WithCancel(context.Background())
	p := &Provider{catalog: o.Catalog, ctx: ctx, cancel: cancel, memory: map[string][]byte{}, slots: make(chan struct{}, MaxInFlight), timeout: o.WorkerTimeout}
	p.backend = (&supervisor{executable: o.Executable}).execute
	return p, nil
}
func (p *Provider) enter(parent context.Context) (context.Context, func(), error) {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return nil, nil, api.Denied("SESSION_CLOSED")
	}
	p.wg.Add(1)
	p.mu.Unlock()
	ctx, cancel := context.WithTimeout(parent, p.timeout)
	stop := context.AfterFunc(p.ctx, cancel)
	finish := func() { stop(); cancel(); p.wg.Done() }
	select {
	case p.slots <- struct{}{}:
		return ctx, func() { <-p.slots; finish() }, nil
	case <-ctx.Done():
		finish()
		return nil, nil, api.Denied(contextReason(ctx))
	}
}
func identityKey(profile, ref string) string { return profile + "\x00" + ref }
func invalidIdentity(profile, ref string) error {
	if !validProfile(profile) {
		return api.Invalid("PROFILE_MISMATCH")
	}
	if !validID(ref, "credential:") {
		return api.Invalid("CREDENTIAL_REF_INVALID")
	}
	return nil
}
func status(mode, state, reason string) api.CredentialStatus {
	return api.CredentialStatus{Mode: mode, State: state, Reason: reason}
}
func failure(mode, reason string) api.CredentialStatus {
	state := "failed"
	if reason == "CREDENTIAL_MISSING" || reason == "CREDENTIAL_DELETED" {
		state = "missing"
	}
	if reason == "OPERATION_TIMEOUT" || reason == "REQUEST_CANCELED" {
		state = "unknown"
	}
	return status(mode, state, reason)
}
func effectFailure(mode, reason string) api.CredentialStatus {
	s := failure(mode, reason)
	if reason == "PROVIDER_FAILED" {
		s.State = "unknown"
	}
	return s
}
func contextReason(ctx context.Context) string {
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return "OPERATION_TIMEOUT"
	}
	return "REQUEST_CANCELED"
}
func faultReason(err error) string {
	if errors.Is(err, context.DeadlineExceeded) {
		return "OPERATION_TIMEOUT"
	}
	if errors.Is(err, context.Canceled) {
		return "REQUEST_CANCELED"
	}
	var f *api.Fault
	if errors.As(err, &f) && safeReason(f.Reason) {
		return f.Reason
	}
	return "CATALOG_UNAVAILABLE"
}
func safeReason(s string) bool {
	switch s {
	case "CREDENTIAL_MISSING", "CREDENTIAL_DELETED", "PROTECTION_UNAVAILABLE", "PROTECTION_LOCKED", "PROTECTION_DENIED", "PROVIDER_FAILED", "OPERATION_TIMEOUT", "CREDENTIAL_IN_USE", "CREDENTIAL_REF_REUSED", "CREDENTIAL_REF_INVALID", "PROFILE_MISMATCH", "REGISTRATION_FAILED", "CATALOG_UNAVAILABLE", "SESSION_CLOSED", "IN_FLIGHT_LIMIT", "REQUEST_CANCELED":
		return true
	}
	return false
}

func (p *Provider) Put(parent context.Context, profile, ref, mode string, secret []byte) (api.CredentialStatus, error) {
	p.writeMu.RLock()
	defer p.writeMu.RUnlock()
	if err := invalidIdentity(profile, ref); err != nil {
		return failure(mode, faultReason(err)), err
	}
	if (mode != "protected" && mode != "session-memory") || len(secret) == 0 || len(secret) > MaxSecretBytes {
		return failure(mode, "REGISTRATION_FAILED"), api.Invalid("REGISTRATION_FAILED")
	}
	ctx, done, err := p.enter(parent)
	if err != nil {
		return failure(mode, faultReason(err)), err
	}
	defer done()
	m, err := p.metadata(ctx, profile, ref)
	if err != nil {
		return failure(mode, faultReason(err)), err
	}
	if m.Status.Mode != mode {
		return failure(mode, "REGISTRATION_FAILED"), api.Invalid("REGISTRATION_FAILED")
	}
	if mode == "session-memory" {
		p.mu.Lock()
		defer p.mu.Unlock()
		if p.closed || ctx.Err() != nil {
			return failure(mode, "SESSION_CLOSED"), api.Denied("SESSION_CLOSED")
		}
		key := identityKey(profile, ref)
		wipe(p.memory[key])
		p.memory[key] = append([]byte(nil), secret...)
		return status(mode, "available", ""), nil
	}
	_, reason := p.backend(ctx, 1, profile, ref, secret)
	if reason != "" {
		return effectFailure(mode, reason), api.Denied(reason)
	}
	return status(mode, "available", ""), nil
}
func (p *Provider) metadata(ctx context.Context, profile, ref string) (api.CredentialMetadata, error) {
	if err := invalidIdentity(profile, ref); err != nil {
		return api.CredentialMetadata{}, err
	}
	m, err := p.catalog.Lookup(ctx, profile, ref)
	if err != nil {
		return m, &api.Fault{Kind: "CAPABILITY_DENIED", Reason: faultReason(err)}
	}
	if m.ProfileID != profile || m.CredentialRef != ref {
		return m, api.Denied("PROFILE_MISMATCH")
	}
	if m.Status.Mode != "protected" && m.Status.Mode != "session-memory" {
		return m, api.Denied("CREDENTIAL_MISSING")
	}
	return m, nil
}
func (p *Provider) Resolve(parent context.Context, profile, ref string) ([]byte, api.CredentialStatus, error) {
	ctx, done, err := p.enter(parent)
	if err != nil {
		return nil, failure("none", faultReason(err)), err
	}
	defer done()
	m, err := p.metadata(ctx, profile, ref)
	if err != nil {
		return nil, failure("none", faultReason(err)), err
	}
	mode := m.Status.Mode
	if mode == "session-memory" {
		p.mu.Lock()
		defer p.mu.Unlock()
		secret := p.memory[identityKey(profile, ref)]
		if len(secret) == 0 {
			return nil, failure(mode, "CREDENTIAL_MISSING"), api.Denied("CREDENTIAL_MISSING")
		}
		return append([]byte(nil), secret...), status(mode, "available", ""), nil
	}
	secret, reason := p.backend(ctx, 3, profile, ref, nil)
	if reason != "" {
		wipe(secret)
		return nil, failure(mode, reason), api.Denied(reason)
	}
	if len(secret) == 0 || len(secret) > MaxSecretBytes {
		wipe(secret)
		return nil, failure(mode, "PROVIDER_FAILED"), api.Denied("PROVIDER_FAILED")
	}
	return secret, status(mode, "available", ""), nil
}
func (p *Provider) Status(ctx context.Context, profile, ref string) (api.CredentialStatus, error) {
	secret, s, err := p.Resolve(ctx, profile, ref)
	wipe(secret)
	return s, err
}
func (p *Provider) Delete(parent context.Context, profile, ref string) (api.CredentialStatus, error) {
	mode, guarded := parent.Value(deleteModeKey{}).(string)
	if !guarded {
		return NewRegistration(p, p.catalog).Delete(parent, profile, ref)
	}
	p.writeMu.RLock()
	defer p.writeMu.RUnlock()
	ctx, done, err := p.enter(parent)
	if err != nil {
		return failure(mode, faultReason(err)), err
	}
	defer done()
	// BeginDelete holds the catalog's deletion guard. A regular Lookup may reject
	// that guard, so the registration passes the guarded mode through this context.
	if mode == "" {
		m, e := p.metadata(ctx, profile, ref)
		if e != nil {
			return failure("none", faultReason(e)), e
		}
		mode = m.Status.Mode
	}
	if err = invalidIdentity(profile, ref); err != nil {
		return failure(mode, faultReason(err)), err
	}
	if mode == "session-memory" {
		p.mu.Lock()
		key := identityKey(profile, ref)
		wipe(p.memory[key])
		delete(p.memory, key)
		p.mu.Unlock()
		return status(mode, "missing", "CREDENTIAL_DELETED"), nil
	}
	_, reason := p.backend(ctx, 2, profile, ref, nil)
	if reason != "" && reason != "CREDENTIAL_MISSING" {
		return effectFailure(mode, reason), api.Denied(reason)
	}
	return status(mode, "missing", "CREDENTIAL_DELETED"), nil
}

type deleteModeKey struct{}

func (p *Provider) Close() error {
	p.mu.Lock()
	if !p.closed {
		p.closed = true
		p.cancel()
	}
	p.mu.Unlock()
	p.wg.Wait()
	p.mu.Lock()
	defer p.mu.Unlock()
	for k, v := range p.memory {
		wipe(v)
		delete(p.memory, k)
	}
	return nil
}

type registration struct {
	provider api.CredentialProvider
	catalog  api.CredentialCatalog
}

// NewRegistration binds private registration to durable ownership/reuse and
// deletion guards. OS calls run outside catalog transactions; secrets never enter it.
func NewRegistration(p api.CredentialProvider, c api.CredentialCatalog) api.CredentialRegistration {
	return &registration{p, c}
}
func (r *registration) Register(ctx context.Context, profile, ref, mode string, secret []byte) (api.CredentialStatus, error) {
	if err := invalidIdentity(profile, ref); err != nil {
		return failure(mode, faultReason(err)), err
	}
	if (mode != "protected" && mode != "session-memory") || len(secret) == 0 || len(secret) > MaxSecretBytes {
		return failure(mode, "REGISTRATION_FAILED"), api.Invalid("REGISTRATION_FAILED")
	}
	if err := r.catalog.Reserve(ctx, profile, ref, mode); err != nil {
		return failure(mode, faultReason(err)), api.Denied(faultReason(err))
	}
	s, err := r.provider.Put(ctx, profile, ref, mode, secret)
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 200*time.Millisecond)
	defer cancel()
	if e := r.catalog.Update(cleanup, profile, ref, s); e != nil {
		return status(mode, "unknown", "CATALOG_UNAVAILABLE"), api.Denied("CATALOG_UNAVAILABLE")
	}
	return s, err
}
func (r *registration) Status(ctx context.Context, profile, ref string) (api.CredentialStatus, error) {
	s, err := r.provider.Status(ctx, profile, ref)
	if s.Mode != "none" {
		if e := r.catalog.Update(ctx, profile, ref, s); e != nil {
			return status(s.Mode, "unknown", "CATALOG_UNAVAILABLE"), api.Denied("CATALOG_UNAVAILABLE")
		}
	}
	return s, err
}
func (r *registration) Delete(ctx context.Context, profile, ref string) (api.CredentialStatus, error) {
	m, err := r.catalog.BeginDelete(ctx, profile, ref)
	if err != nil {
		return failure("none", faultReason(err)), api.Denied(faultReason(err))
	}
	if m.ProfileID != profile || m.CredentialRef != ref {
		return failure("none", "PROFILE_MISMATCH"), api.Denied("PROFILE_MISMATCH")
	}
	s, err := r.provider.Delete(context.WithValue(ctx, deleteModeKey{}, m.Status.Mode), profile, ref)
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 200*time.Millisecond)
	defer cancel()
	if e := r.catalog.FinishDelete(cleanup, profile, ref, s); e != nil {
		return status(m.Status.Mode, "unknown", "CATALOG_UNAVAILABLE"), api.Denied("CATALOG_UNAVAILABLE")
	}
	return s, err
}

// EraseProfile is composition-only, after the durable Profile cleanup fence.
// Catalog rows are deliberately retained until all external erasures succeed.
func (p *Provider) EraseProfile(parent context.Context, profile string, refs []api.CredentialMetadata) error {
	p.writeMu.Lock()
	defer p.writeMu.Unlock()
	for _, m := range refs {
		if m.ProfileID != profile {
			return api.Denied("PROFILE_MISMATCH")
		}
		if err := invalidIdentity(profile, m.CredentialRef); err != nil {
			return err
		}
		ctx, done, err := p.enter(parent)
		if err != nil {
			return err
		}
		if m.Status.Mode == "session-memory" {
			p.mu.Lock()
			key := identityKey(profile, m.CredentialRef)
			wipe(p.memory[key])
			delete(p.memory, key)
			p.mu.Unlock()
			done()
			continue
		}
		if m.Status.Mode != "protected" {
			done()
			return api.Denied("REGISTRATION_FAILED")
		}
		_, reason := p.backend(ctx, 2, profile, m.CredentialRef, nil)
		done()
		if reason != "" && reason != "CREDENTIAL_MISSING" {
			return api.Denied(reason)
		}
	}
	return nil
}
