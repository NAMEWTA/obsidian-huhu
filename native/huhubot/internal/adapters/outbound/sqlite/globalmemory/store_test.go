package globalmemory

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/memory"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type resolveFacts struct {
	base    *base.Store
	err     error
	check   int
	prepare memory.FrozenGlobal
}

func (f *resolveFacts) WithGlobalTx(ctx context.Context, _ bool, fn func(context.Context, *sql.Tx) error) error {
	return f.base.WithinTx(ctx, func(tx *sql.Tx) error { return fn(ctx, tx) })
}

func (f *resolveFacts) PrepareOwnerGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, api.MemoryGlobalProposal) (memory.FrozenGlobal, error) {
	return f.prepare, nil
}

func (*resolveFacts) PrepareToolGlobalInTx(context.Context, *sql.Tx, api.ToolExecution, string, api.GlobalMemoryToolDraft) (memory.FrozenGlobal, error) {
	return memory.FrozenGlobal{}, errors.New("not used")
}

func (f *resolveFacts) CheckGlobalPreviewInTx(context.Context, *sql.Tx, api.RequestIdentity, memory.FrozenGlobal) (time.Time, error) {
	f.check++
	if f.err != nil {
		return time.Time{}, f.err
	}
	return time.Now().Add(time.Second), nil
}

func (*resolveFacts) ApplyApprovedGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, memory.FrozenGlobal) (api.MemoryItem, error) {
	return api.MemoryItem{}, errors.New("not used")
}

func TestResolveOwnerPersistsTerminalPreviewFailures(t *testing.T) {
	tests := []struct {
		name         string
		expired      bool
		successful   bool
		checkErr     error
		wantState    string
		wantRevision string
	}{
		{name: "expired", expired: true, wantState: "expired", wantRevision: "2"},
		{name: "qualification conflict", checkErr: api.Denied("SOURCE_CHANGED"), wantState: "conflicted", wantRevision: "2"},
		{name: "unknown failure rolls back", checkErr: errors.New("controlled database failure"), wantState: "pending", wantRevision: "1"},
		{name: "reject", successful: true, wantState: "rejected", wantRevision: "2"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			root := t.TempDir()
			if err := os.Chmod(root, 0700); err != nil {
				t.Fatal(err)
			}
			locator := filepath.Join(root, "one")
			h, err := profile.Acquire(root, locator)
			if err != nil {
				t.Fatal(err)
			}
			b, err := base.Open(ctx, h)
			if err != nil {
				_ = h.Close()
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := b.Close(); err != nil {
					t.Error(err)
				}
				if err := h.Close(); err != nil {
					t.Error(err)
				}
			})

			var profileID, epoch string
			if err := b.WithinTx(ctx, func(tx *sql.Tx) error {
				if err := tx.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&profileID, &epoch); err != nil {
					return err
				}
				_, err := tx.ExecContext(ctx, "INSERT INTO memory_namespaces(namespace_id,profile_id,principal_id,kind,subject_id,enabled) VALUES(?,?,?,?,?,0)", "global:"+profileID, profileID, "global:"+profileID, "global", profileID)
				return err
			}); err != nil {
				t.Fatal(err)
			}

			fixedNow := time.Date(2027, time.January, 2, 3, 4, 5, 0, time.UTC)
			bodyHash := sha256.Sum256([]byte("fixed fact"))
			facts := &resolveFacts{base: b, err: tt.checkErr, prepare: memory.FrozenGlobal{
				Version:         "global-facts-v1",
				ProfileID:       profileID,
				PrincipalID:     "owner",
				NamespaceID:     "global:" + profileID,
				Operation:       "create",
				Scope:           api.MemoryScope{Kind: "profile"},
				CatalogRevision: "1",
				Actor:           memory.GlobalActor{Kind: "owner"},
				Body: &api.MemoryBody{
					Text:         "fixed fact",
					Hash:         "sha256:" + fmt.Sprintf("%x", bodyHash[:]),
					Provenance:   "user",
					CreatorKind:  "user",
					SourceRefs:   []api.SourceSnapshot{},
					SourceScopes: []api.SourceScope{},
					Derived:      []api.DerivedInput{},
				},
				Derived:      []api.DerivedInput{},
				SourceDigest: "sha256:" + fmt.Sprintf("%064x", 0),
				InputDigest:  "sha256:" + fmt.Sprintf("%064x", 1),
			}}
			store := New(b, facts, func() time.Time { return fixedNow })
			owner := api.NewConnectionIdentity("connection:owner", "owner", true)
			meta := api.CommandMeta{ProfileID: profileID, CommandEpoch: epoch, CommandID: "command:propose", IdempotencyKey: "idempotency:propose", ExpectedRevision: "1"}
			q := api.MemoryGlobalProposal{CommandMeta: meta, Operation: "create", Scope: api.MemoryScope{Kind: "profile"}, Text: "fixed fact", Sources: []api.MemoryReferenceSelection{}}
			// The fake preparation seam supplies the preview without making this
			// test depend on source/run setup; ProposeOwner still exercises the
			// real proposal row, receipt and profile-revision transaction.
			proposal, err := store.ProposeOwner(ctx, owner, q)
			if err != nil {
				t.Fatal("propose", err)
			}
			if tt.expired {
				if _, err = b.Database().ExecContext(ctx, "UPDATE memory_global_proposals SET expires_at=? WHERE proposal_id=?", fixedNow.Add(-time.Second).Format(time.RFC3339Nano), proposal.ID); err != nil {
					t.Fatal("expire", err)
				}
			}
			resolve := api.MemoryResolve{CommandMeta: api.CommandMeta{ProfileID: profileID, CommandEpoch: epoch, CommandID: "command:resolve", IdempotencyKey: "idempotency:resolve", ExpectedRevision: proposal.Revision}, ID: proposal.ID, Decision: "reject", PreviewHash: proposal.PreviewHash}
			_, err = store.ResolveOwner(ctx, owner, resolve)
			if tt.successful {
				if err != nil {
					t.Fatal("reject resolve", err)
				}
			} else if tt.checkErr == nil && !tt.expired {
				t.Fatal("resolve unexpectedly succeeded")
			}
			if tt.expired {
				var faultErr *api.Fault
				if !errors.As(err, &faultErr) || faultErr.Reason != "GLOBAL_PROPOSAL_EXPIRED" {
					t.Fatalf("expired resolve error: %v", err)
				}
			} else if tt.checkErr != nil && !errors.Is(err, tt.checkErr) && err.Error() != tt.checkErr.Error() {
				t.Fatalf("resolve error: %v", err)
			}
			var state, revision string
			if err = b.WithinTx(ctx, func(tx *sql.Tx) error {
				return tx.QueryRowContext(ctx, "SELECT state,CAST(revision AS TEXT) FROM memory_global_proposals WHERE proposal_id=?", proposal.ID).Scan(&state, &revision)
			}); err != nil {
				t.Fatal("read state", err)
			}
			if state != tt.wantState || revision != tt.wantRevision {
				t.Fatalf("state after resolve: got %s/%s, want %s/%s", state, revision, tt.wantState, tt.wantRevision)
			}
			if tt.wantState != "pending" {
				var terminal api.MemoryProposal
				if err = b.WithinTx(ctx, func(tx *sql.Tx) error {
					var e error
					terminal, e = store.GetProposalInTx(ctx, tx, owner, profileID, proposal.ID)
					return e
				}); err != nil {
					t.Fatal("read terminal proposal", err)
				}
				if terminal.State != tt.wantState || terminal.Revision != tt.wantRevision || terminal.Body != nil {
					t.Fatalf("terminal proposal was not a body-free coherent snapshot: %#v", terminal)
				}
			}
		})
	}
}
