package credentials

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"

	sqlassistant "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

const testRef = "credential:0123456789abcdef0123456789abcdef"
const sentinel = "HUHU-CREDENTIAL-SENTINEL-DO-NOT-PERSIST-7452"

type credentialFixture struct {
	p               *Provider
	r               api.CredentialRegistration
	catalog         *sqlassistant.Store
	db              *base.Store
	profileID, root string
}

func newCredentialFixture(t *testing.T) *credentialFixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	h, err := profile.Acquire(root, filepath.Join(root, "one"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := h.Close(); err != nil {
			t.Error(err)
		}
	})
	db, err := base.Open(context.Background(), h)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	m, err := db.ReadMetadata(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	catalog := sqlassistant.New(db)
	p, err := NewProvider(Options{Catalog: catalog})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := p.Close(); err != nil {
			t.Error(err)
		}
	})
	return &credentialFixture{p, NewRegistration(p, catalog), catalog, db, m.ProfileID, root}
}
func TestDirectProviderDeleteHonorsModelReferences(t *testing.T) {
	f := newCredentialFixture(t)
	ctx := context.Background()
	s, err := f.r.Register(ctx, f.profileID, testRef, "session-memory", []byte(sentinel))
	if err != nil || s.State != "available" {
		t.Fatal(s, err)
	}
	service, err := app.New(ctx, f.catalog, app.Options{Credentials: f.p})
	if err != nil {
		t.Fatal(err)
	}
	_, err = service.Create(ctx, api.NewConnectionIdentity("test", "owner", true), api.AgentCreate{CommandMeta: api.CommandMeta{CommandID: "command:test", IdempotencyKey: "key:test", ProfileID: f.profileID, CommandEpoch: "1"}, Draft: api.AgentDraft{Name: "test", Model: &api.ModelBindingDraft{ProviderID: "test", Endpoint: "https://example.test", ModelID: "test", Protocol: "openai-chat-completions", CredentialRef: testRef, Capabilities: []string{}}}})
	if err != nil {
		t.Fatal(err)
	}
	s, err = f.p.Delete(ctx, f.profileID, testRef)
	if err == nil || s.Reason != "CREDENTIAL_IN_USE" {
		t.Fatalf("referenced credential deleted: %#v %v", s, err)
	}
	got, s, err := f.p.Resolve(ctx, f.profileID, testRef)
	defer wipe(got)
	if err != nil || !bytes.Equal(got, []byte(sentinel)) || s.State != "available" {
		t.Fatal("reference guard lost secret", s, err)
	}
}

func TestSessionMemoryIsCopiedWipedAndMissingAfterReopen(t *testing.T) {
	f := newCredentialFixture(t)
	ctx := context.Background()
	input := []byte(sentinel)
	if s, e := f.r.Register(ctx, f.profileID, testRef, "session-memory", input); e != nil || s.Mode != "session-memory" || s.State != "available" {
		t.Fatal(s, e)
	}
	wipe(input)
	got, s, e := f.p.Resolve(ctx, f.profileID, testRef)
	if e != nil || string(got) != sentinel {
		t.Fatal("caller input changed stored credential", s, e)
	}
	wipe(got)
	if _, e := f.r.Register(ctx, f.profileID, testRef, "session-memory", []byte("replacement")); e == nil {
		t.Fatal("credentialRef reused")
	}
	owned := f.p.memory[identityKey(f.profileID, testRef)]
	if e = f.p.Close(); e != nil {
		t.Fatal(e)
	}
	if !bytes.Equal(owned, make([]byte, len(owned))) {
		t.Fatal("owned buffer not wiped")
	}
	if _, s, e = f.p.Resolve(ctx, f.profileID, testRef); e == nil || s.Reason != "SESSION_CLOSED" {
		t.Fatal("closed provider accepted resolution", s, e)
	}
	reopened, e := NewProvider(Options{Catalog: f.catalog})
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	reopened.backend = func(context.Context, byte, string, string, []byte) ([]byte, string) {
		t.Error("session-memory attempted protected service")
		return nil, "PROVIDER_FAILED"
	}
	if _, s, e = reopened.Resolve(ctx, f.profileID, testRef); e == nil || s.State != "missing" || s.Mode != "session-memory" {
		t.Fatal("memory survived provider restart", s, e)
	}
	if _, s, e = reopened.Resolve(ctx, "profile:other", testRef); e == nil || s.Reason != "PROFILE_MISMATCH" {
		t.Fatal("cross-Profile credential resolved", s, e)
	}
	if e = f.db.Close(); e != nil {
		t.Fatal(e)
	}
	if e = filepath.WalkDir(f.root, func(path string, d os.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if !d.IsDir() {
			p, e := os.ReadFile(path)
			if e != nil {
				return e
			}
			if bytes.Contains(p, []byte(sentinel)) {
				t.Error("secret persisted outside OS provider")
			}
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
}

func TestProtectedFailureAndSameRefStatusReconcile(t *testing.T) {
	for _, reason := range []string{"", "CREDENTIAL_MISSING", "PROTECTION_LOCKED", "PROTECTION_DENIED", "PROTECTION_UNAVAILABLE", "OPERATION_TIMEOUT"} {
		t.Run(reason, func(t *testing.T) {
			f := newCredentialFixture(t)
			ctx := context.Background()
			var mu sync.Mutex
			var stored []byte
			f.p.backend = func(ctx context.Context, op byte, profile, ref string, input []byte) ([]byte, string) {
				mu.Lock()
				defer mu.Unlock()
				if op == 1 {
					if reason == "" || reason == "OPERATION_TIMEOUT" {
						stored = append([]byte(nil), input...)
					}
					return nil, reason
				}
				if op == 3 {
					if len(stored) == 0 {
						return nil, "CREDENTIAL_MISSING"
					}
					return append([]byte(nil), stored...), ""
				}
				wipe(stored)
				stored = nil
				return nil, ""
			}
			s, e := f.r.Register(ctx, f.profileID, testRef, "protected", []byte(sentinel))
			if reason == "" {
				if e != nil || s.State != "available" {
					t.Fatal(s, e)
				}
			} else if e == nil || s.Reason != reason {
				t.Fatal(s, e)
			}
			if reason == "OPERATION_TIMEOUT" {
				if s.State != "unknown" {
					t.Fatal("write timeout claimed known failure", s)
				}
				m, e := f.catalog.Lookup(ctx, f.profileID, testRef)
				if e != nil || m.Status.State != "unknown" {
					t.Fatal("unknown not persisted", m, e)
				}
			}
			if reason == "" || reason == "OPERATION_TIMEOUT" {
				s, e = f.r.Status(ctx, f.profileID, testRef)
				if e != nil || s.State != "available" || s.Mode != "protected" {
					t.Fatal("same-ref reconciliation failed", s, e)
				}
				s, e = f.r.Delete(ctx, f.profileID, testRef)
				if e != nil || s.State != "missing" || s.Reason != "CREDENTIAL_DELETED" {
					t.Fatal(s, e)
				}
			}
			mu.Lock()
			wipe(stored)
			mu.Unlock()
		})
	}
}

func TestProtectedWorkerFailureCannotClaimWriteDidNotCommit(t *testing.T) {
	f := newCredentialFixture(t)
	f.p.backend = func(context.Context, byte, string, string, []byte) ([]byte, string) { return nil, "PROVIDER_FAILED" }
	s, e := f.r.Register(context.Background(), f.profileID, testRef, "protected", []byte(sentinel))
	if e == nil || s.State != "unknown" || s.Reason != "PROVIDER_FAILED" {
		t.Fatalf("lost worker response falsely claimed failed write: %#v %v", s, e)
	}
}
func TestClosedProviderDeleteReleasesCatalogGuard(t *testing.T) {
	f := newCredentialFixture(t)
	ctx := context.Background()
	if _, err := f.r.Register(ctx, f.profileID, testRef, "session-memory", []byte(sentinel)); err != nil {
		t.Fatal(err)
	}
	if err := f.p.Close(); err != nil {
		t.Fatal(err)
	}
	s, err := f.r.Delete(ctx, f.profileID, testRef)
	if err == nil || s.Mode != "session-memory" || s.Reason != "SESSION_CLOSED" {
		t.Fatal(s, err)
	}
	m, err := f.catalog.Lookup(ctx, f.profileID, testRef)
	if err != nil || m.Status.Reason != "SESSION_CLOSED" {
		t.Fatal("failed delete left permanent in-use guard", m, err)
	}
}
