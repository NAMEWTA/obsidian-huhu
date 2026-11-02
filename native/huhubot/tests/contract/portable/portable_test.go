package portable_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	file "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/portable"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

func sample() app.Package {
	p, err := app.Build(app.Selection{
		SourceProfile: "profile:source",
		Agents:        []app.Agent{{ID: "agent:old", Name: "Writer", Persona: "write", ModelID: "gpt", ProviderID: "openai", Endpoint: "https://example.invalid", Protocol: "openai-chat-completions", Revision: "2", PersonaRevision: "2", ModelRevision: "1", Enabled: true}},
		Sessions:      []app.Session{{ID: "session:old", Kind: "group", Title: "Project", MemberIDs: []string{"agent:old"}, CoordinatorID: "agent:old", Messages: []app.Message{{ID: "message:old", Role: "user", Text: "hello", CreatedAt: "2026-01-01T00:00:00Z", AgentID: "agent:old"}}}},
		Memories:      []app.Memory{{ID: "memory:old", NamespaceKind: "agent", NamespaceID: "agent:old", ScopeKind: "profile", State: "active", Text: "remember this", Provenance: "user", SourceRefs: []app.Source{{Kind: "message", ID: "message:old", Revision: "1", Hash: "sha256:source"}}}},
	})
	if err != nil {
		panic(err)
	}
	return p
}

func TestPackageSealsAndExcludesRuntimeSecrets(t *testing.T) {
	p := sample()
	b, err := json.Marshal(p)
	if err != nil {
		t.Fatal(err)
	}
	lower := strings.ToLower(string(b))
	for _, forbidden := range []string{"credentialref", "credential_ref", "grantids", "approvalid", "checkpoint", "queue", "lease"} {
		if strings.Contains(lower, forbidden) {
			t.Fatalf("portable package contains forbidden field %q: %s", forbidden, b)
		}
	}
	if err := app.Validate(p); err != nil {
		t.Fatal(err)
	}
	p.Agents[0].Name = "tampered"
	if err := app.Validate(p); err == nil {
		t.Fatal("tampered package accepted")
	}
}

func TestPreviewMapsIDsAndRequiresRegrant(t *testing.T) {
	p := sample()
	preview, err := app.PreviewImport(p, app.Target{ProfileID: "profile:new", Agents: []app.TargetAgent{{ID: "agent:existing", Name: "Writer"}}})
	if err != nil {
		t.Fatal(err)
	}
	if !preview.NeedsConfirm || preview.PackageHash != p.PackageHash {
		t.Fatalf("bad preview: %+v", preview)
	}
	if len(preview.Mappings) != 3 || len(preview.Regrants) != 1 || len(preview.Conflicts) != 1 {
		t.Fatalf("preview did not expose mappings/conflicts/regrant: %+v", preview)
	}
}

type fakeSink struct{ tx *fakeTx }

func (s fakeSink) Begin(context.Context, string) (app.Transaction, error) { return s.tx, nil }

type fakeTx struct {
	agents                []app.Agent
	sessions              []app.Session
	memories              []app.Memory
	committed, rolledBack bool
	failAfter             int
	puts                  int
}

func (f *fakeTx) next() error {
	f.puts++
	if f.failAfter > 0 && f.puts >= f.failAfter {
		return errors.New("injected failure")
	}
	return nil
}
func (f *fakeTx) PutAgent(_ context.Context, a app.Agent) (string, error) {
	if e := f.next(); e != nil {
		return "", e
	}
	f.agents = append(f.agents, a)
	return a.ID, nil
}
func (f *fakeTx) PutSession(_ context.Context, s app.Session) (string, error) {
	if e := f.next(); e != nil {
		return "", e
	}
	f.sessions = append(f.sessions, s)
	return s.ID, nil
}
func (f *fakeTx) PutMemory(_ context.Context, m app.Memory) (string, error) {
	if e := f.next(); e != nil {
		return "", e
	}
	f.memories = append(f.memories, m)
	return m.ID, nil
}
func (f *fakeTx) Commit(context.Context) (string, error) {
	f.committed = true
	return "receipt:one", nil
}
func (f *fakeTx) Rollback(context.Context) error { f.rolledBack = true; return nil }

func TestImportNeedsExplicitConfirmationAndRollsBack(t *testing.T) {
	p := sample()
	preview, err := app.PreviewImport(p, app.Target{ProfileID: "profile:new"})
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeTx{failAfter: 2}
	if _, err = app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview}, fakeSink{f}); err == nil {
		t.Fatal("import without confirmation accepted")
	}
	if f.committed || f.rolledBack {
		t.Fatalf("unconfirmed import touched sink: %+v", f)
	}
	f = &fakeTx{failAfter: 2}
	if _, err = app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview, Confirm: true}, fakeSink{f}); err == nil {
		t.Fatal("injected failure accepted")
	}
	if f.committed || !f.rolledBack {
		t.Fatalf("failed import was not rolled back: %+v", f)
	}
	f = &fakeTx{}
	r, err := app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview, Confirm: true}, fakeSink{f})
	if err != nil {
		t.Fatal(err)
	}
	if !f.committed || f.rolledBack || len(r.AgentIDs) != 1 || len(r.SessionIDs) != 1 || len(r.MemoryIDs) != 1 {
		t.Fatalf("bad receipt/transaction: %+v %+v", r, f)
	}
}

func TestArchiveRoundTripAndNoOverwrite(t *testing.T) {
	p := sample()
	root := t.TempDir()
	path := filepath.Join(root, "export.json")
	if err := file.WriteFile(context.Background(), path, p); err != nil {
		t.Fatal(err)
	}
	got, err := file.ReadFile(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	if got.PackageHash != p.PackageHash {
		t.Fatalf("hash changed: %s != %s", got.PackageHash, p.PackageHash)
	}
	if err := file.WriteFile(context.Background(), path, p); err == nil {
		t.Fatal("export silently overwrote existing file")
	}
	if err := os.WriteFile(path, []byte(`{"format":"huhu-portable","version":1}`), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := file.ReadFile(context.Background(), path); err == nil {
		t.Fatal("truncated package accepted")
	}
}

func TestAmbiguousTargetsRequireCopyBeforeAnyImportWrite(t *testing.T) {
	p := sample()
	cases := []struct {
		kind, id string
		target   app.Target
	}{
		{"agent", p.Agents[0].ID, app.Target{ProfileID: "profile:new", Agents: []app.TargetAgent{{ID: "agent:a", Name: "Writer"}, {ID: "agent:b", Name: "Writer"}}}},
		{"session", p.Sessions[0].ID, app.Target{ProfileID: "profile:new", Sessions: []app.TargetSession{{ID: "session:a", Title: "Project"}, {ID: "session:b", Title: "Project"}}}},
		{"memory", p.Memories[0].ID, app.Target{ProfileID: "profile:new", Memories: []app.TargetMemory{{ID: "memory:a", NamespaceKind: p.Memories[0].NamespaceKind, NamespaceID: p.Memories[0].NamespaceID}, {ID: "memory:b", NamespaceKind: p.Memories[0].NamespaceKind, NamespaceID: p.Memories[0].NamespaceID}}}},
	}
	for _, test := range cases {
		t.Run(test.kind, func(t *testing.T) {
			preview, err := app.PreviewImport(p, test.target)
			if err != nil {
				t.Fatal(err)
			}
			for _, action := range []string{"keep", "skip", "replace"} {
				tx := &fakeTx{}
				_, err = app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview, Confirm: true, Resolutions: []app.ImportResolution{{ID: test.id, Action: action}}}, fakeSink{tx})
				var fault *api.Fault
				if !errors.As(err, &fault) || fault.Reason != "AMBIGUOUS_IMPORT_TARGET" || tx.puts != 0 || tx.committed {
					t.Fatal("ambiguous existing target reached writes", action, tx, err)
				}
			}
			tx := &fakeTx{}
			receipt, err := app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview, Confirm: true, Resolutions: []app.ImportResolution{{ID: test.id, Action: "copy"}}}, fakeSink{tx})
			if err != nil || !tx.committed {
				t.Fatal("safe copy was rejected", receipt, err)
			}
			for _, mapping := range preview.Mappings {
				if mapping.From != test.id {
					continue
				}
				ids := append(append(append([]string{}, receipt.AgentIDs...), receipt.SessionIDs...), receipt.MemoryIDs...)
				found := false
				for _, id := range ids {
					if id == mapping.To {
						found = true
					}
				}
				if !found {
					t.Fatal("copy ignored frozen candidate ID", mapping, receipt)
				}
			}
		})
	}
}

func TestSingleTargetResolutionUsesExistingOrFrozenCopyIdentity(t *testing.T) {
	p := sample()
	preview, err := app.PreviewImport(p, app.Target{ProfileID: "profile:new", Agents: []app.TargetAgent{{ID: "agent:existing", Name: "Writer"}}})
	if err != nil {
		t.Fatal(err)
	}
	candidate := ""
	for _, mapping := range preview.Mappings {
		if mapping.Kind == "agent" && mapping.From == p.Agents[0].ID {
			candidate = mapping.To
		}
	}
	if candidate == "" {
		t.Fatal("agent copy candidate absent")
	}
	for _, action := range []string{"keep", "replace", "copy"} {
		t.Run(action, func(t *testing.T) {
			tx := &fakeTx{}
			_, err := app.Import(context.Background(), app.ImportPlan{Package: p, Preview: preview, Confirm: true, Resolutions: []app.ImportResolution{{ID: p.Agents[0].ID, Action: action}}}, fakeSink{tx})
			if err != nil || !tx.committed {
				t.Fatal(err)
			}
			want := "agent:existing"
			if action == "copy" {
				want = candidate
			}
			if action == "keep" {
				if len(tx.agents) != 0 {
					t.Fatal("keep wrote existing Agent", tx.agents)
				}
			} else if len(tx.agents) != 1 || tx.agents[0].ID != want {
				t.Fatal("Agent resolution identity was misreported", want, tx.agents)
			}
			if len(tx.sessions) != 1 || tx.sessions[0].CoordinatorID != want || len(tx.sessions[0].MemberIDs) != 1 || tx.sessions[0].MemberIDs[0] != want || len(tx.memories) != 1 || tx.memories[0].NamespaceID != want {
				t.Fatal("dependent references did not follow the selected identity", want, tx.sessions, tx.memories)
			}
		})
	}
}
