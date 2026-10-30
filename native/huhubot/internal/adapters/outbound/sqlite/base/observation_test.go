package base

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// An observation commit skips only its own WAL fsync; every other unit of work
// on the single Profile connection, including one that follows a failed
// observation, still runs with synchronous=FULL (2).
func TestObservationTxRelaxesOnlyItsOwnCommit(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if e := os.WriteFile(path, nil, 0600); e != nil {
		t.Fatal(e)
	}
	s, e := Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if e != nil {
		t.Fatal(e)
	}
	defer s.Close()
	level := func(tx *sql.Tx) int {
		var v int
		if e := tx.QueryRowContext(ctx, "PRAGMA synchronous").Scan(&v); e != nil {
			t.Fatal(e)
		}
		return v
	}
	ordinary := func() {
		if e := s.WithinTx(ctx, func(tx *sql.Tx) error {
			if v := level(tx); v != 2 {
				t.Fatalf("ordinary unit of work synchronous=%d, want FULL", v)
			}
			return nil
		}); e != nil {
			t.Fatal(e)
		}
	}
	ordinary()
	if e := s.WithinObservationTx(ctx, func(tx *sql.Tx) error {
		if v := level(tx); v != 1 {
			t.Fatalf("observation synchronous=%d, want NORMAL", v)
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	ordinary()
	failed := errors.New("observation failed")
	if e := s.WithinObservationTx(ctx, func(*sql.Tx) error { return failed }); !errors.Is(e, failed) {
		t.Fatal(e)
	}
	ordinary()
}
