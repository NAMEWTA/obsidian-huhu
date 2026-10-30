package base

import (
	"bytes"
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"github.com/ncruces/go-sqlite3"
	_ "github.com/ncruces/go-sqlite3/driver"
)

// A commit must return while another connection holds a snapshot, and Close
// must return after a dirty WAL that is larger than SQLite's default
// autocheckpoint. Both used to run inside the single Profile connection and
// on Windows could outlive the 3s stop and the request deadlines.
func TestCommitAndCloseDoNotCheckpointTheProfile(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if e := os.WriteFile(path, nil, 0600); e != nil {
		t.Fatal(e)
	}
	s, e := Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if e != nil {
		t.Fatal(e)
	}
	var checkpoint int
	if e = s.Database().QueryRowContext(ctx, "PRAGMA wal_autocheckpoint").Scan(&checkpoint); e != nil || checkpoint != 0 {
		t.Fatalf("wal_autocheckpoint=%d %v, want 0", checkpoint, e)
	}
	conn, e := s.Database().Conn(ctx)
	if e != nil {
		t.Fatal(e)
	}
	e = conn.Raw(func(driverConn any) error {
		raw := driverConn.(interface{ Raw() *sqlite3.Conn }).Raw()
		on, err := raw.Config(sqlite3.DBCONFIG_NO_CKPT_ON_CLOSE)
		if err != nil {
			return err
		}
		if !on {
			t.Fatal("checkpoint-on-close is still enabled")
		}
		return nil
	})
	if e != nil {
		t.Fatal(e)
	}
	if e = conn.Close(); e != nil {
		t.Fatal(e)
	}
	if info, err := os.Stat(path + "-wal"); err != nil {
		t.Fatal(err)
	} else {
		t.Logf("wal after open: %d bytes", info.Size())
	}

	reader, e := sql.Open("sqlite3", "file:"+path+"?_pragma=busy_timeout(500)")
	if e != nil {
		t.Fatal(e)
	}
	defer reader.Close()
	readTx, e := reader.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if e != nil {
		t.Fatal(e)
	}
	defer readTx.Rollback()
	var n int
	if e = readTx.QueryRowContext(ctx, "SELECT count(*) FROM profile_metadata").Scan(&n); e != nil || n != 1 {
		t.Fatal(n, e)
	}

	started := time.Now()
	if e = s.WithinTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1")
		return err
	}); e != nil {
		t.Fatal(e)
	}
	if elapsed := time.Since(started); elapsed > time.Second {
		t.Fatalf("commit while a snapshot was pinned took %s", elapsed)
	}

	payload := bytes.Repeat([]byte("x"), 3500)
	started = time.Now()
	if e = s.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "CREATE TABLE wal_bulk(n INTEGER PRIMARY KEY, b BLOB)"); err != nil {
			return err
		}
		for i := range 1100 {
			if _, err := tx.ExecContext(ctx, "INSERT INTO wal_bulk(n, b) VALUES(?, ?)", i, payload); err != nil {
				return err
			}
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	if elapsed := time.Since(started); elapsed > 20*time.Second {
		t.Fatalf("bulk commit while a snapshot was pinned took %s", elapsed)
	}
	if e = readTx.Rollback(); e != nil {
		t.Fatal(e)
	}
	if e = reader.Close(); e != nil {
		t.Fatal(e)
	}
	if info, err := os.Stat(path + "-wal"); err != nil {
		t.Fatal(err)
	} else if info.Size() < 1000*4096 {
		t.Fatalf("wal = %d bytes, want a dirty file past the default 1000-page checkpoint", info.Size())
	} else {
		t.Logf("wal before close: %d bytes", info.Size())
	}

	started = time.Now()
	if e = s.Close(); e != nil {
		t.Fatal(e)
	}
	if elapsed := time.Since(started); elapsed > 2*time.Second {
		t.Fatalf("Close flushed the dirty WAL and took %s", elapsed)
	}
}

// Close flushes the WAL before the handle goes away, so a clean shutdown keeps
// every commit across power loss (ADR-027) without running a checkpoint.
func TestCloseFlushesTheWALWithoutCheckpointing(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if e := os.WriteFile(path, nil, 0600); e != nil {
		t.Fatal(e)
	}
	s, e := Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if e != nil {
		t.Fatal(e)
	}
	if e = s.WithinTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "UPDATE profile_metadata SET revision=revision+1 WHERE singleton=1")
		return err
	}); e != nil {
		t.Fatal(e)
	}
	before, e := os.Stat(path + "-wal")
	if e != nil || before.Size() == 0 {
		t.Fatal("commit did not reach the WAL", e)
	}
	original := syncWAL
	defer func() { syncWAL = original }()
	var synced []string
	syncWAL = func(p string) error {
		// The Profile handle is still open: the flush precedes Close.
		if err := s.Database().PingContext(ctx); err != nil {
			t.Error("WAL flushed after the Profile handle closed", err)
		}
		synced = append(synced, p)
		return original(p)
	}
	if e = s.Close(); e != nil {
		t.Fatal(e)
	}
	if len(synced) != 1 || synced[0] != path+"-wal" {
		t.Fatalf("Close flushed %v, want exactly the Profile WAL", synced)
	}
	after, e := os.Stat(path + "-wal")
	if e != nil || after.Size() < before.Size() {
		t.Fatalf("Close checkpointed or truncated the WAL: %v -> %v %v", before.Size(), after, e)
	}
}
