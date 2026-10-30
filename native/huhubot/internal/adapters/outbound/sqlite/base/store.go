// Package base contains the concrete SQLite lifecycle and minimal Profile UoW.
package base

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/migrations"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	_ "github.com/ncruces/go-sqlite3/driver"
	"net/url"
	"os"
	"strings"
	"time"
)

type Store struct{ db *sql.DB }

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
	db, err := sql.Open("sqlite3", sqliteDSN(h.DatabasePath))
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
	if _, err = db.ExecContext(ctx, "PRAGMA synchronous=FULL"); err != nil {
		return nil, failure("CONFLICT", "PROFILE_DURABILITY_UNAVAILABLE")
	}
	s := &Store{db: db}
	if _, err = s.ReadMetadata(ctx); err != nil {
		return nil, err
	}
	ok = true
	return s, nil
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
// The caller context bounds waiting for the shared connection and every
// statement, but it is deliberately not the transaction context: database/sql
// discards the connection of a transaction whose context ends (Tx.awaitDone).
// With one pooled connection that closes the Profile's last SQLite handle,
// which runs a full WAL checkpoint plus fsync while every other caller waits;
// on Windows runners that stalled shutdown past its bound. Ending through the
// deferred Rollback instead returns the healthy connection to the pool.
func (s *Store) WithinTx(ctx context.Context, work func(*sql.Tx) error) error {
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
	// A commit that returned nil is durable. Preferring ctx.Err() here reported
	// success as CATALOG_UNAVAILABLE when the caller deadline elapsed during commit.
	if err = tx.Commit(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	return nil
}
