package portable

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestBothPortableEntrypointsUseStoreAdmission(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	b, err := base.Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	s := New(b)
	metadata, err := b.ReadMetadata(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// A real portable commit releases its owned connection and advances revision.
	tx, err := s.Begin(ctx, metadata.ProfileID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = b.ReadMetadata(ctx); err != nil {
		t.Fatal(err)
	}
	reader, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	pinned, err := reader.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		t.Fatal(err)
	}
	defer pinned.Rollback()
	var n int
	if err = pinned.QueryRow("SELECT count(*) FROM profile_metadata").Scan(&n); err != nil {
		t.Fatal(err)
	}
	if err = b.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := tx.Exec("CREATE TABLE bulk(payload BLOB); INSERT INTO bulk VALUES(zeroblob(5000000))")
		return e
	}); err != nil {
		t.Fatal(err)
	}
	before, err := os.Stat(path + "-wal")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range []string{"BeginForPrincipal", "BeginImport"} {
		t.Run(entry, func(t *testing.T) {
			wait, cancel := context.WithTimeout(ctx, 80*time.Millisecond)
			defer cancel()
			if entry == "BeginForPrincipal" {
				tx, err = s.BeginForPrincipal(wait, metadata.ProfileID, "principal")
			} else {
				tx, err = s.BeginImport(wait, api.NewConnectionIdentity("conn", "principal", true), contract.ImportRequest{ProfileID: metadata.ProfileID}, contract.Target{})
			}
			if tx != nil {
				_ = tx.Rollback(ctx)
				t.Fatal("portable bypassed high water")
			}
			if err == nil || wait.Err() == nil {
				t.Fatalf("not admission wait: %v", err)
			}
		})
	}
	after, err := os.Stat(path + "-wal")
	if err != nil || after.Size() != before.Size() {
		t.Fatal("blocked portable grew WAL", err)
	}
	if err = pinned.Rollback(); err != nil {
		t.Fatal(err)
	}
	wait, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	tx, err = s.Begin(wait, metadata.ProfileID)
	if err != nil {
		t.Fatal(err)
	}
	if err = tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	// A rejected import must return its lease, too.
	if _, err = s.BeginImport(wait, api.NewConnectionIdentity("conn", "principal", true), contract.ImportRequest{ProfileID: metadata.ProfileID}, contract.Target{}); err == nil {
		t.Fatal("stale import accepted")
	}
	if err = b.WithinTx(wait, func(*sql.Tx) error { return nil }); err != nil {
		t.Fatal("import leaked lease", err)
	}
}
