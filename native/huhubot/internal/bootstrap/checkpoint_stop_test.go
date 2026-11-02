package bootstrap

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
	"time"
)

// RequestStop must not stop maintenance before recovery.Stop's final write.
func TestStopKeepsMaintenanceAliveWhilePinnedReaderBlocksFinalWrite(t *testing.T) {
	c, root, dir := stopProofCore(t)
	reader, err := sql.Open("sqlite3", filepath.Join(dir, "profile.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	pinned, err := reader.BeginTx(context.Background(), &sql.TxOptions{ReadOnly: true})
	if err != nil {
		t.Fatal(err)
	}
	defer pinned.Rollback()
	var n int
	if err = pinned.QueryRow("SELECT count(*) FROM profile_metadata").Scan(&n); err != nil {
		t.Fatal(err)
	}
	if err = c.store.WithinTx(context.Background(), func(tx *sql.Tx) error {
		_, e := tx.Exec("CREATE TABLE stop_bulk(payload BLOB); INSERT INTO stop_bulk VALUES(zeroblob(5000000))")
		return e
	}); err != nil {
		t.Fatal(err)
	}
	if err = c.RequestStop(); err != nil {
		t.Fatal(err)
	}
	observer, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	facts, err := c.WaitStopped(observer)
	cancel()
	if !errors.Is(err, context.DeadlineExceeded) || !facts.Requested || facts.ProfileReleased || facts.Finished {
		t.Fatal(facts, err)
	}
	if c.store.MaintenanceStatus().Attempts == 0 {
		t.Fatal("maintenance stopped before final write")
	}
	other, err := Open(context.Background(), root, dir)
	if other != nil {
		_ = other.Close()
		t.Fatal("profile released behind pending stop")
	}
	if err == nil {
		t.Fatal("profile lock absent")
	}
	if err = pinned.Rollback(); err != nil {
		t.Fatal(err)
	}
	observer, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	facts, err = c.WaitStopped(observer)
	if err != nil || !facts.ExecutionDrained || !facts.PersistenceComplete || !facts.ProfileReleased || !facts.Finished {
		t.Fatal("owner deadlock after reader release", facts, err)
	}
}
