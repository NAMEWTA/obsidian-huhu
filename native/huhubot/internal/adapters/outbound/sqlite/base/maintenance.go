package base

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"os"
	"sync"
	"time"
)

const admissionCapacity = 32
const maintenanceRetry = 100 * time.Millisecond

// A single owner uses the same sole pooled connection as writers. See SQLite's
// checkpoint/long-reader rules: https://www.sqlite.org/wal.html#concurrency and
// https://www.sqlite.org/c3ref/wal_checkpoint_v2.html . No caller owns its lifetime.
type maintenance struct {
	mu              sync.Mutex
	wake            chan struct{}
	changed         chan struct{}
	stop            chan struct{}
	done            chan struct{}
	slots           chan struct{}
	closing         bool
	active          sync.WaitGroup
	closeOnce       sync.Once
	closeErr        error
	admissionCtx    context.Context
	cancelAdmission context.CancelFunc
	eraseRequested  uint64
	eraseCompleted  uint64
	attempts        uint64
	lastErr         error
	// Immutable once started; only isolated base tests supply a held/failing call.
	checkpoint func(*sql.Conn) error
}

// MaintenanceStatus observes the current Store only. Erasure debt is not a
// persistent crash-recovery record; purge's durable cleanup journal is separate.
type MaintenanceStatus struct {
	Attempts       uint64
	ErasurePending bool
	LastError      error
}

func (s *Store) MaintenanceStatus() MaintenanceStatus {
	m := &s.maintenance
	m.mu.Lock()
	defer m.mu.Unlock()
	return MaintenanceStatus{m.attempts, m.eraseRequested != m.eraseCompleted, m.lastErr}
}
func (s *Store) startMaintenance() {
	m := &s.maintenance
	m.wake = make(chan struct{}, 1)
	m.changed = make(chan struct{})
	m.stop = make(chan struct{})
	m.done = make(chan struct{})
	m.slots = make(chan struct{}, admissionCapacity)
	m.admissionCtx, m.cancelAdmission = context.WithCancel(context.Background())
	go s.maintain()
}
func (s *Store) signalMaintenance() {
	select {
	case s.maintenance.wake <- struct{}{}:
	default:
	}
}
func (s *Store) walLarge() (bool, error) {
	info, err := os.Stat(s.walPath)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return info.Size() >= walRestartBytes, nil
}
func (s *Store) register() error {
	m := &s.maintenance
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.closing {
		return sql.ErrConnDone
	}
	select {
	case m.slots <- struct{}{}:
	default:
		return failure("CONFLICT", "PROFILE_WRITE_ADMISSION_BUSY")
	}
	m.active.Add(1)
	return nil
}
func (s *Store) release() { <-s.maintenance.slots; s.maintenance.active.Done() }
func (s *Store) admittedConn(ctx context.Context) (*sql.Conn, error) {
	m := &s.maintenance
	wait, cancel := context.WithCancel(ctx)
	stop := context.AfterFunc(m.admissionCtx, cancel)
	defer stop()
	defer cancel()
	for {
		if err := wait.Err(); err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			return nil, sql.ErrConnDone
		}
		conn, err := s.db.Conn(wait)
		if err != nil {
			return nil, err
		}
		m.mu.Lock()
		changed := m.changed
		m.mu.Unlock()
		large, err := s.walLarge()
		if err == nil && !large {
			return conn, nil
		}
		_ = conn.Close()
		if err != nil {
			return nil, err
		}
		// Never hold the only connection while waiting for its maintenance owner.
		s.signalMaintenance()
		select {
		case <-changed:
		case <-wait.Done():
		}
	}
}

// Transaction is an adapter-only owned lease. End it through these methods,
// never through the embedded SQL handle, so admission and durability are released.
type Transaction struct {
	*sql.Tx
	conn           *sql.Conn
	store          *Store
	durable, erase bool
	once           sync.Once
	result         error
}

func (s *Store) BeginTransaction(ctx context.Context) (*Transaction, error) {
	return s.beginTransaction(ctx, false, false)
}
func (s *Store) beginTransaction(ctx context.Context, durable, erase bool) (*Transaction, error) {
	if err := s.register(); err != nil {
		return nil, err
	}
	conn, err := s.admittedConn(ctx)
	if err != nil {
		s.release()
		return nil, err
	}
	cleanup := func() { _ = conn.Close(); s.release() }
	if err = ctx.Err(); err != nil {
		cleanup()
		return nil, err
	}
	if durable {
		if _, err = conn.ExecContext(context.WithoutCancel(ctx), "PRAGMA synchronous=FULL"); err != nil {
			_ = conn.Raw(func(any) error { return driver.ErrBadConn })
			cleanup()
			return nil, err
		}
	}
	tx, err := conn.BeginTx(context.WithoutCancel(ctx), nil)
	if err != nil {
		if durable {
			restoreNormal(conn)
		}
		cleanup()
		return nil, err
	}
	return &Transaction{Tx: tx, conn: conn, store: s, durable: durable, erase: erase}, nil
}
func restoreNormal(conn *sql.Conn) {
	if _, err := conn.ExecContext(context.Background(), "PRAGMA synchronous=NORMAL"); err != nil {
		_ = conn.Raw(func(any) error { return driver.ErrBadConn })
	}
}
func (t *Transaction) end(commit bool) error {
	ran := false
	t.once.Do(func() {
		ran = true
		if commit {
			t.result = t.Tx.Commit()
		} else {
			t.result = t.Tx.Rollback()
		}
		if commit && t.result == nil && t.erase {
			m := &t.store.maintenance
			m.mu.Lock()
			m.eraseRequested++
			m.mu.Unlock()
		}
		if t.durable {
			restoreNormal(t.conn)
		}
		_ = t.conn.Close()
		if commit && t.result == nil {
			t.store.signalMaintenance()
		}
		t.store.release()
	})
	if !ran {
		return sql.ErrTxDone
	}
	return t.result
}
func (t *Transaction) Commit() error   { return t.end(true) }
func (t *Transaction) Rollback() error { return t.end(false) }

func truncateWAL(conn *sql.Conn) error {
	var busy, frames, checkpointed int
	err := conn.QueryRowContext(context.Background(), "PRAGMA wal_checkpoint(TRUNCATE)").Scan(&busy, &frames, &checkpointed)
	if err != nil {
		return err
	}
	if busy != 0 || frames != 0 || checkpointed != 0 {
		return failure("CONFLICT", "PROFILE_DB_CLEANUP_PENDING")
	}
	return nil
}
func (s *Store) checkpoint() error {
	m := &s.maintenance
	conn, err := s.db.Conn(context.Background())
	m.mu.Lock()
	generation := m.eraseRequested
	m.mu.Unlock()
	if err == nil {
		if m.checkpoint != nil {
			err = m.checkpoint(conn)
		} else {
			err = truncateWAL(conn)
		}
		_ = conn.Close()
	}
	m.mu.Lock()
	m.attempts++
	m.lastErr = err
	if err == nil {
		m.eraseCompleted = generation
	}
	close(m.changed)
	m.changed = make(chan struct{})
	m.mu.Unlock()
	return err
}
func (s *Store) maintain() {
	m := &s.maintenance
	defer close(m.done)
	timer := time.NewTimer(time.Hour)
	if !timer.Stop() {
		<-timer.C
	}
	defer timer.Stop()
	var retry <-chan time.Time
	for {
		select {
		case <-m.stop:
			return
		case <-m.wake:
			if retry != nil {
				continue
			} // Notifications cannot bypass the owned busy retry timer.
		case <-retry:
		}
		retry = nil
		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
		m.mu.Lock()
		pending := m.eraseRequested != m.eraseCompleted
		m.mu.Unlock()
		large, err := s.walLarge()
		if pending || large || err != nil {
			if s.checkpoint() != nil {
				timer.Reset(maintenanceRetry)
				retry = timer.C
			}
		}
	}
}
func (s *Store) closeMaintenance(syncFile func(*os.File) error) error {
	m := &s.maintenance
	m.closeOnce.Do(func() {
		m.mu.Lock()
		m.closing = true
		m.cancelAdmission()
		m.mu.Unlock()
		m.active.Wait()
		close(m.stop)
		<-m.done
		m.mu.Lock()
		pending := m.eraseRequested != m.eraseCompleted
		m.mu.Unlock()
		var eraseErr error
		if pending {
			eraseErr = s.checkpoint()
		}
		var syncErr error
		if syncFile == nil {
			syncErr = syncWAL(s.walPath)
		} else {
			syncErr = syncWALFile(s.walPath, syncFile)
		}
		m.closeErr = errors.Join(eraseErr, syncErr, s.db.Close())
	})
	return m.closeErr
}
