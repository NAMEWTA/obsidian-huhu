package base

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func maintenanceStore(t *testing.T, checkpoint func(*sql.Conn) error) *Store {
	t.Helper()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	s, err := openWithMaintenance(context.Background(), &profile.Handle{DatabasePath: path, New: true}, nil, checkpoint)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}
func awaitMaintenance(t *testing.T, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for !condition() {
		if time.Now().After(deadline) {
			t.Fatal("maintenance condition timed out")
		}
		time.Sleep(time.Millisecond)
	}
}

func TestCommittedResultPrecedesHeldMaintenanceAndCloseJoinsIt(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	var unblock sync.Once
	defer unblock.Do(func() { close(release) })
	var calls atomic.Int32
	s := maintenanceStore(t, func(conn *sql.Conn) error {
		if calls.Add(1) == 1 {
			close(entered)
			<-release
		}
		return truncateWAL(conn)
	})
	committed := make(chan error, 1)
	var work atomic.Int32
	go func() {
		committed <- s.WithinErasingTx(context.Background(), func(tx *sql.Tx) error {
			work.Add(1)
			_, err := tx.Exec("UPDATE profile_metadata SET revision=revision+1")
			return err
		})
	}()
	select {
	case err := <-committed:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("commit waits for maintenance")
	}
	<-entered
	// Hundreds of notifications occupy one slot, never create additional workers.
	for range 500 {
		s.signalMaintenance()
	}
	if len(s.maintenance.wake) != 1 {
		t.Fatal("wake not coalesced")
	}
	closed := make(chan error, 1)
	var synced atomic.Bool
	go func() { closed <- s.CloseWithSync(func(f *os.File) error { synced.Store(true); return f.Sync() }) }()
	awaitMaintenance(t, func() bool { s.maintenance.mu.Lock(); defer s.maintenance.mu.Unlock(); return s.maintenance.closing })
	if err := s.WithinTx(context.Background(), func(*sql.Tx) error { t.Error("closed admission ran"); return nil }); err == nil {
		t.Fatal("admitted during close")
	}
	select {
	case <-closed:
		t.Fatal("close escaped maintenance")
	default:
	}
	if synced.Load() {
		t.Fatal("sync preceded maintenance join")
	}
	unblock.Do(func() { close(release) })
	if err := <-closed; err != nil {
		t.Fatal(err)
	}
	if work.Load() != 1 || !synced.Load() {
		t.Fatal("replay or missing sync")
	}
}

func TestErasureFailureRetainedWithoutChangingCommitAndCloseStillSyncs(t *testing.T) {
	ioErr := errors.New("checkpoint I/O probe")
	s := maintenanceStore(t, func(*sql.Conn) error { return ioErr })
	work := 0
	if err := s.WithinErasingTx(context.Background(), func(tx *sql.Tx) error {
		work++
		_, e := tx.Exec("UPDATE profile_metadata SET revision=revision+1")
		return e
	}); err != nil {
		t.Fatal(err)
	}
	awaitMaintenance(t, func() bool { return s.MaintenanceStatus().Attempts > 0 })
	status := s.MaintenanceStatus()
	if !status.ErasurePending || !errors.Is(status.LastError, ioErr) || work != 1 {
		t.Fatal(status, work)
	}
	syncErr := errors.New("sync probe")
	synced := false
	err := s.CloseWithSync(func(*os.File) error { synced = true; return syncErr })
	if !synced || !errors.Is(err, ioErr) || !errors.Is(err, syncErr) {
		t.Fatal(err, synced)
	}
	if s.Database().Ping() == nil {
		t.Fatal("sync failure skipped db close")
	}
	if !s.MaintenanceStatus().ErasurePending {
		t.Fatal("failed debt swallowed")
	}
	if !errors.Is(s.Close(), ioErr) {
		t.Fatal("second close erased failure")
	}
}

func TestAdmissionQueueIsBoundedAndCloseReleasesWaiters(t *testing.T) {
	s := maintenanceStore(t, nil)
	tx, err := s.BeginTransaction(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	waiters := make(chan error, admissionCapacity-1)
	for range admissionCapacity - 1 {
		go func() {
			tx, e := s.BeginTransaction(context.Background())
			if e == nil {
				_ = tx.Rollback()
			}
			waiters <- e
		}()
	}
	awaitMaintenance(t, func() bool { return len(s.maintenance.slots) == admissionCapacity })
	if _, err = s.BeginTransaction(context.Background()); err == nil {
		t.Fatal("unbounded admission")
	}
	closed := make(chan error, 1)
	go func() { closed <- s.Close() }()
	for range admissionCapacity - 1 {
		if err = <-waiters; err == nil {
			t.Fatal("waiting work escaped close")
		}
	}
	select {
	case <-closed:
		t.Fatal("close did not join active transaction")
	default:
	}
	if err = tx.Rollback(); err != nil {
		t.Fatal(err)
	}
	if err = <-closed; err != nil {
		t.Fatal(err)
	}
}

func TestCanceledErasureObserverDoesNotCancelMaintenanceOwner(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	s := maintenanceStore(t, func(conn *sql.Conn) error { close(entered); <-release; return truncateWAL(conn) })
	observer, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { result <- s.EraseWAL(observer) }()
	<-entered
	cancel()
	if err := <-result; !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	if !s.MaintenanceStatus().ErasurePending {
		t.Fatal("observer erased obligation")
	}
	once.Do(func() { close(release) })
	awaitMaintenance(t, func() bool { return !s.MaintenanceStatus().ErasurePending })
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
}
