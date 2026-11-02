package base

import (
	"context"
	"database/sql"
	"errors"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

// ADR-027: the Profile runs WAL with synchronous=NORMAL (1). Only a durable
// barrier commit runs with FULL (2); every unit of work before and after it,
// including one that follows a failed barrier, is back at NORMAL.
func TestDurableTxRaisesOnlyItsOwnCommit(t *testing.T) {
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
	var journal string
	if e = s.Database().QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journal); e != nil || journal != "wal" {
		t.Fatalf("journal_mode=%q %v, want wal", journal, e)
	}
	level := func(tx *sql.Tx) int {
		var v int
		if e := tx.QueryRowContext(ctx, "PRAGMA synchronous").Scan(&v); e != nil {
			t.Fatal(e)
		}
		return v
	}
	ordinary := func() {
		if e := s.WithinTx(ctx, func(tx *sql.Tx) error {
			if v := level(tx); v != 1 {
				t.Fatalf("ordinary unit of work synchronous=%d, want NORMAL", v)
			}
			_, e := tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision WHERE singleton=1")
			return e
		}); e != nil {
			t.Fatal(e)
		}
	}
	ordinary()
	if e := s.WithinDurableTx(ctx, func(tx *sql.Tx) error {
		if v := level(tx); v != 2 {
			t.Fatalf("durable barrier synchronous=%d, want FULL", v)
		}
		_, e := tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision WHERE singleton=1")
		return e
	}); e != nil {
		t.Fatal(e)
	}
	ordinary()
	failed := errors.New("barrier failed")
	if e := s.WithinDurableTx(ctx, func(*sql.Tx) error { return failed }); !errors.Is(e, failed) {
		t.Fatal(e)
	}
	ordinary()
}

// Every commit that immediately precedes an external, non-idempotent action is
// a durability barrier, so a power failure can never make the ledger forget an
// action that may already have happened (ADR-027). The listed functions must
// open their transaction with WithinDurableTx and never with WithinTx.
func TestExternalActionCommitsAreDurableBarriers(t *testing.T) {
	sites := map[string][]string{
		"../usage/store.go":           {"bound.Dispatch"},                     // model request
		"../effects/store.go":         {"Store.ClaimDispatch"},                // Host effect
		"../assistant/credentials.go": {"Store.Reserve", "Store.BeginDelete"}, // OS credential store write/delete
		"../purge/store.go":           {"Store.BeginCleanup"},                 // Profile external erasure
		"../purge/sessions.go":        {"Sessions.Delete"},                    // Session external cleanup
	}
	for file, funcs := range sites {
		f, e := parser.ParseFile(token.NewFileSet(), file, nil, 0)
		if e != nil {
			t.Fatal(e)
		}
		for _, want := range funcs {
			found := false
			for _, d := range f.Decls {
				fn, ok := d.(*ast.FuncDecl)
				if !ok || fn.Recv == nil || len(fn.Recv.List) != 1 {
					continue
				}
				recv := fn.Recv.List[0].Type
				if star, ok := recv.(*ast.StarExpr); ok {
					recv = star.X
				}
				if id, ok := recv.(*ast.Ident); !ok || id.Name+"."+fn.Name.Name != want {
					continue
				}
				found = true
				durable, ordinary := 0, 0
				ast.Inspect(fn.Body, func(n ast.Node) bool {
					if sel, ok := n.(*ast.SelectorExpr); ok {
						switch sel.Sel.Name {
						case "WithinDurableTx":
							durable++
						case "WithinTx", "withinTx":
							ordinary++
						}
					}
					return true
				})
				if durable != 1 || ordinary != 0 {
					t.Errorf("%s %s: WithinDurableTx=%d WithinTx=%d, want one durable barrier", strings.TrimPrefix(file, "../"), want, durable, ordinary)
				}
			}
			if !found {
				t.Errorf("%s: %s not found", file, want)
			}
		}
	}
}
