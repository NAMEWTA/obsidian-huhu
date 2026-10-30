// Package base contains the concrete SQLite lifecycle and minimal Profile UoW.
package base

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"github.com/ncruces/go-sqlite3"
	sqlitedriver "github.com/ncruces/go-sqlite3/driver"
	"net/url"
	"os"
	"strings"
	"time"
)

type Store struct {
	db      *sql.DB
	walPath string
}

// walRestartBytes is the dirty WAL size at which a commit, after it has
// released its write lock, tries a truncating checkpoint. The checkpoint is
// not inside the transaction, so the Windows VFS uses the busy timeout
// instead of an infinite pending-lock wait. 256KiB stays under the request
// deadlines on a slow volume; smaller frames such as a deletion canary stay
// in the WAL until EraseWAL.
const walRestartBytes int64 = 256 * 1024

// sqliteDSN builds a file URI SQLite will open on every supported OS.
// url.URL treats a Windows drive path as a host (file://C:/...), and a raw
// backslash is percent-encoded, so the driver never reaches the database.
// This module's SQLite is the Wasm build, which is not compiled with
// SQLITE_OS_WIN, so file:///C:/... stays "/C:/..." and misses the drive.
// The opaque form file:C:/... is the path the VFS opens. Unix stays file:///.
func sqliteFileURL(path string) url.URL {
	slash := strings.ReplaceAll(path, `\`, "/")
	if len(slash) >= 2 && slash[1] == ':' && ((slash[0] >= 'A' && slash[0] <= 'Z') || (slash[0] >= 'a' && slash[0] <= 'z')) {
		return url.URL{Scheme: "file", Opaque: (&url.URL{Path: slash}).EscapedPath()}
	}
	return url.URL{Scheme: "file", Path: slash}
}

func sqliteDSN(path string) string {
	u := sqliteFileURL(path)
	q := u.Query()
	q.Add("_pragma", "busy_timeout(150)")
	q.Add("_pragma", "foreign_keys(1)")
	u.RawQuery = q.Encode()
	return u.String()
}

func failure(kind, reason string) error                           { return &api.Fault{Kind: kind, Reason: reason} }
func Open(ctx context.Context, h *profile.Handle) (*Store, error) { return OpenWithBackup(ctx, h, nil) }
func OpenWithBackup(ctx context.Context, h *profile.Handle, complete CompleteBackup) (*Store, error) {
	info, err := os.Stat(h.DatabasePath)
	if err != nil {
		return nil, failure("CONFLICT", "PROFILE_DB_UNREADABLE")
	}
	if !h.New && info.Size() == 0 {
		return nil, failure("CONFLICT", "PROFILE_DB_EMPTY")
	}
	db, err := openProfileDB(sqliteDSN(h.DatabasePath))
	if err != nil {
		return nil, failure("CONFLICT", "PROFILE_DB_OPEN_FAILED")
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	ok := false
	defer func() {
		if !ok {
			_ = db.Close()
		}
	}()
	var check string
	// Ping does not validate a corrupt database in this driver.
	if err = db.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&check); err != nil || check != "ok" {
		return nil, failure("CONFLICT", "PROFILE_DB_CORRUPT")
	}
	var version, appID, tables int
	if err = db.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DB_CORRUPT")
	}
	if err = db.QueryRowContext(ctx, "PRAGMA application_id").Scan(&appID); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DB_CORRUPT")
	}
	if version > migrations.CurrentVersion || version < 0 || (appID != 0 && appID != migrations.ApplicationID) {
		return nil, failure("PROTOCOL_INCOMPATIBLE", "PROFILE_SCHEMA_INCOMPATIBLE")
	}
	if err = db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").Scan(&tables); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DB_CORRUPT")
	}
	if version == 0 && (!h.New || tables != 0 || appID != 0) {
		return nil, failure("PROTOCOL_INCOMPATIBLE", "PROFILE_SCHEMA_UNRECOGNIZED")
	}
	if version > 0 && appID != migrations.ApplicationID {
		return nil, failure("PROTOCOL_INCOMPATIBLE", "PROFILE_SCHEMA_INCOMPATIBLE")
	}
	if len(migrations.Ordered) != migrations.CurrentVersion {
		return nil, failure("CONFLICT", "PROFILE_MIGRATION_REGISTRY_INVALID")
	}
	if version < migrations.CurrentVersion {
		if version > 0 {
			if e := backup(ctx, db, h, version, complete); e != nil {
				return nil, failure("CONFLICT", "PROFILE_BACKUP_FAILED")
			}
		}
		// A table rebuild follows SQLite's generalized ALTER TABLE protocol.
		// The Profile lock and complete recovery set already exist, and no
		// executor or collector has started. The setting is connection-local.
		conn, e := db.Conn(ctx)
		if e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}
		defer conn.Close()
		rebuild := false
		for _, m := range migrations.Ordered {
			if m.Version > version && m.RebuildForeignKeys {
				rebuild = true
			}
		}
		restore := rebuild
		defer func() {
			if restore {
				cleanup, cancel := context.WithTimeout(context.Background(), time.Second)
				defer cancel()
				_, _ = conn.ExecContext(cleanup, "PRAGMA foreign_keys=ON")
			}
		}()
		if rebuild {
			if _, e = conn.ExecContext(ctx, "PRAGMA foreign_keys=OFF"); e != nil {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
			}
			var enabled int
			if e = conn.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&enabled); e != nil || enabled != 0 {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
			}
		}
		tx, e := conn.BeginTx(ctx, nil)
		if e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}
		defer tx.Rollback()
		for i, m := range migrations.Ordered {
			if m.Version != i+1 {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_REGISTRY_INVALID")
			}
			if m.Version <= version {
				continue
			}
			if _, e = tx.ExecContext(ctx, m.SQL); e != nil {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
			}
			if m.Version == 1 {
				_, e = tx.ExecContext(ctx, "INSERT INTO profile_metadata(singleton,profile_id,command_epoch,revision,created_at) VALUES(1,?,1,1,?)", api.NewID("profile:"), time.Now().UTC().Format(time.RFC3339Nano))
				if e != nil {
					return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
				}
			}
		}
		// Validate the entire graph, including references originating in old
		// tables. Enforcement being temporarily off cannot admit an orphan.
		rows, e := tx.QueryContext(ctx, "PRAGMA foreign_key_check")
		if e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}
		violated := rows.Next()
		readErr := rows.Err()
		closeErr := rows.Close()
		if violated || readErr != nil || closeErr != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FOREIGN_KEY_FAILED")
		}
		if _, e = tx.ExecContext(ctx, fmt.Sprintf("PRAGMA application_id=%d; PRAGMA user_version=%d", migrations.ApplicationID, migrations.CurrentVersion)); e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}
		if e = tx.Commit(); e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}
		if rebuild {
			if _, e = conn.ExecContext(ctx, "PRAGMA foreign_keys=ON"); e != nil {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
			}
			var enabled int
			if e = conn.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&enabled); e != nil || enabled != 1 {
				return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
			}
			restore = false
		}
		// Release the dedicated connection before normal Store initialization.
		if e = conn.Close(); e != nil {
			return nil, failure("CONFLICT", "PROFILE_MIGRATION_FAILED")
		}

	}
	if _, err = db.ExecContext(ctx, "PRAGMA secure_delete=ON"); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DURABILITY_UNAVAILABLE")
	}

	var journal string
	if err = db.QueryRowContext(ctx, "PRAGMA journal_mode=WAL").Scan(&journal); err != nil || journal != "wal" {
		return nil, failure("CONFLICT", "PROFILE_WAL_UNAVAILABLE")
	}
	// WAL + NORMAL (ADR-027): every commit is atomic, ordered and survives a
	// process crash; it is not fsynced on its own. A power failure can lose only
	// a suffix of recent commits, never reorder or tear them. Commits that
	// precede an external action use WithinDurableTx, which makes them and every
	// earlier frame durable before that action starts.
	if _, err = db.ExecContext(ctx, "PRAGMA synchronous=NORMAL"); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DURABILITY_UNAVAILABLE")
	}
	// SQLite's default autocheckpoint (1000 pages) runs inside COMMIT. On
	// Windows the VFS upgrades a RESERVED connection to PENDING with an
	// infinite LockFileEx, ignoring busy_timeout. A second connection's
	// snapshot pins that commit until the caller gives up: Close reports
	// EXECUTOR_STOP_TIMEOUT, and GetRun or a HAP request dies on its own
	// deadline. The same flush on the last sqlite3_close occupies the 3s
	// stop. Checkpointing stays off both paths. The WAL remains for crash
	// replay (ADR-027); EraseWAL still truncates when a deletion must drop
	// private frames. Once the WAL file passes walRestartBytes, the next
	// commit restarts it only after the write lock is released.
	if _, err = db.ExecContext(ctx, "PRAGMA wal_autocheckpoint=0"); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DURABILITY_UNAVAILABLE")
	}
	s := &Store{db: db, walPath: h.DatabasePath + "-wal"}
	if _, err = s.ReadMetadata(ctx); err != nil {
		return nil, err
	}
	ok = true
	return s, nil
}

// openProfileDB turns checkpoint-on-close off for every pooled connection.
// sqlite3_close of the last handle otherwise flushes the whole dirty WAL on
// the caller that is already inside the 3s stop budget.
func openProfileDB(dsn string) (*sql.DB, error) {
	return sqlitedriver.Open(dsn, func(c *sqlite3.Conn) error {
		if _, err := c.Config(sqlite3.DBCONFIG_NO_CKPT_ON_CLOSE, true); err != nil {
			return err
		}
		if err := c.WALAutoCheckpoint(0); err != nil {
			return err
		}
		// journal_mode=WAL persists in the file. synchronous does not. A handle
		// discarded after ErrBadConn must not fall back to FULL, which fsyncs
		// every commit. A brand-new file is still a rollback journal at this
		// point; leaving that synchronous at the default keeps the migration
		// commit durable.
		stmt, _, err := c.Prepare(`PRAGMA journal_mode`)
		if err != nil {
			return err
		}
		defer stmt.Close()
		if stmt.Step() && stmt.ColumnText(0) == "wal" {
			return c.Exec(`PRAGMA synchronous=NORMAL`)
		}
		return nil
	})
}
func (s *Store) ReadMetadata(ctx context.Context) (api.ProfileMetadata, error) {
	var p api.ProfileMetadata
	err := s.db.QueryRowContext(ctx, "SELECT profile_id, CAST(command_epoch AS TEXT), CAST(revision AS TEXT), created_at FROM profile_metadata WHERE singleton=1").Scan(&p.ProfileID, &p.CommandEpoch, &p.Revision, &p.CreatedAt)
	if ctx.Err() != nil {
		return p, ctx.Err()
	}
	if err != nil {
		return p, failure("CONFLICT", "PROFILE_METADATA_UNAVAILABLE")
	}
	return p, nil
}
func (s *Store) Close() error { return s.db.Close() }

// Database is an adapter-only composition seam. Application ports never return
// SQL handles; all contexts share this same bounded connection and Profile.
func (s *Store) Database() *sql.DB { return s.db }

// WithinTx performs a short SQL unit of work. Callers must not perform network,
// Host, model or human waits inside the callback.
//
// The Profile runs WAL with synchronous=NORMAL: the commit is atomic, ordered
// and crash-safe, but a power failure may lose it together with the commits
// that followed it (ADR-027). A commit whose result an external, non-idempotent
// action relies on must use WithinDurableTx instead.
//
// The caller context bounds waiting for the shared connection and every
// statement, but it is deliberately not the transaction context: database/sql
// discards the connection of a transaction whose context ends (Tx.awaitDone).
// With one pooled connection that drops the Profile's last SQLite handle
// while every other caller waits. Ending through the deferred Rollback
// instead returns the healthy connection to the pool. Checkpoint-on-close is
// disabled separately so that discard is not also a full WAL flush.
func (s *Store) WithinTx(ctx context.Context, work func(*sql.Tx) error) error {
	return s.withinTx(ctx, false, work)
}

// WithinDurableTx is WithinTx whose commit is a durability barrier: it runs
// with synchronous=FULL, so the commit returns only after the WAL is flushed.
// A WAL flush covers the whole file, so every earlier NORMAL commit becomes
// durable too. Use it for the commit that immediately precedes an external,
// non-idempotent action (a model request, a Host effect, a credential store
// write or delete, a Profile cleanup), so that after a power failure the
// ledger never forgets an action that may have happened. The level is
// restored to NORMAL before the connection returns to the pool; a connection
// that cannot be restored is discarded.
func (s *Store) WithinDurableTx(ctx context.Context, work func(*sql.Tx) error) error {
	return s.withinTx(ctx, true, work)
}

func (s *Store) withinTx(ctx context.Context, durable bool, work func(*sql.Tx) error) error {
	conn, err := s.db.Conn(ctx)
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	defer func() { _ = conn.Close() }()
	if err = ctx.Err(); err != nil {
		return err
	}
	if durable {
		if _, err = conn.ExecContext(context.WithoutCancel(ctx), "PRAGMA synchronous=FULL"); err != nil {
			_ = conn.Raw(func(any) error { return driver.ErrBadConn })
			return err
		}
		// Runs after the transaction ends and before the connection returns to
		// the pool. A connection that cannot be restored to NORMAL is discarded
		// so the pool's level stays the documented default.
		defer func() {
			if _, e := conn.ExecContext(context.WithoutCancel(ctx), "PRAGMA synchronous=NORMAL"); e != nil {
				_ = conn.Raw(func(any) error { return driver.ErrBadConn })
			}
		}()
	}
	tx, err := conn.BeginTx(context.WithoutCancel(ctx), nil)
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err = work(tx); err != nil {
		return err
	}
	// A commit that returned nil has happened (and is flushed for
	// WithinDurableTx). Preferring ctx.Err() here reported success as
	// CATALOG_UNAVAILABLE when the caller deadline elapsed during commit.
	if err = tx.Commit(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	s.restartWALIfLarge(conn)
	return nil
}

// restartWALIfLarge runs only after COMMIT, when this connection is no longer
// RESERVED. A pinned reader makes TRUNCATE return within busy_timeout; the
// commit itself has already succeeded.
func (s *Store) restartWALIfLarge(conn *sql.Conn) {
	info, err := os.Stat(s.walPath)
	if err != nil || info.Size() < walRestartBytes {
		return
	}
	_, _ = conn.ExecContext(context.Background(), "PRAGMA wal_checkpoint(TRUNCATE)")
}
