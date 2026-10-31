package base

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

type BackupBlob struct {
	Path     string                 `json:"path"`
	Size     int64                  `json:"size"`
	SHA256   string                 `json:"sha256"`
	Artifact api.CheckpointArtifact `json:"artifact"`
}

// CompleteBackup runs before migration and before any executor or collector.
// Its snapshot is immutable. All referenced artifacts must be independently
// copied, verified and synced before returning; live references are insufficient.
type CompleteBackup func(context.Context, *sql.DB, string) ([]BackupBlob, error)
type BackupManifest struct {
	Format        string `json:"format"`
	SchemaVersion int    `json:"schemaVersion"`
	ApplicationID int    `json:"applicationId"`
	ProfileID     string `json:"profileId"`
	CommandEpoch  string `json:"commandEpoch"`
	Database      struct {
		Path   string `json:"path"`
		Size   int64  `json:"size"`
		SHA256 string `json:"sha256"`
	} `json:"database"`
	Blobs []BackupBlob `json:"blobs"`
}

func syncDirectory(path string) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	d, e := os.Open(path)
	if e != nil {
		return e
	}
	defer d.Close()
	return d.Sync()
}
func backup(ctx context.Context, db *sql.DB, h *profile.Handle, version int, complete CompleteBackup) error {
	dir, e := os.MkdirTemp(filepath.Dir(h.DatabasePath), fmt.Sprintf(".migration-v%d-", version))
	if e != nil {
		return e
	}
	path := filepath.Join(dir, "profile.sqlite3")
	// VACUUM INTO takes a filename. The Wasm build has no Windows VFS, so a
	// drive path must be the same opaque file:C:/ form that opens the live database.
	target := path
	if runtime.GOOS == "windows" {
		file := sqliteFileURL(path)
		target = file.String()
	}
	if _, e = db.ExecContext(ctx, "VACUUM INTO '"+strings.ReplaceAll(target, "'", "''")+"'"); e != nil {
		return e
	}
	if e = os.Chmod(path, 0600); e != nil {
		return e
	}
	f, e := os.OpenFile(path, os.O_RDWR, 0)
	if e != nil {
		return e
	}
	e = f.Sync()
	ce := f.Close()
	if e != nil {
		return e
	}
	if ce != nil {
		return ce
	}
	u := sqliteFileURL(path)
	q := u.Query()
	q.Set("mode", "ro")
	q.Set("immutable", "1")
	u.RawQuery = q.Encode()
	snapshot, e := sql.Open("sqlite3", u.String())
	if e != nil {
		return e
	}
	snapshot.SetMaxOpenConns(1)
	closed := false
	defer func() {
		if !closed {
			_ = snapshot.Close()
		}
	}()
	var m BackupManifest
	m.Format = "huhu-migration-recovery-v1"
	m.SchemaVersion = version
	m.Blobs = []BackupBlob{}
	if e = snapshot.QueryRowContext(ctx, "PRAGMA application_id").Scan(&m.ApplicationID); e != nil {
		return e
	}
	if e = snapshot.QueryRowContext(ctx, "SELECT profile_id,CAST(command_epoch AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&m.ProfileID, &m.CommandEpoch); e != nil {
		return e
	}
	if complete != nil {
		m.Blobs, e = complete(ctx, snapshot, dir)
		if e != nil {
			return e
		}
	} else {
		var exists, count int
		if e = snapshot.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_schema WHERE type='table' AND name='execution_checkpoints'").Scan(&exists); e != nil {
			return e
		}
		if exists != 0 {
			if e = snapshot.QueryRowContext(ctx, "SELECT count(*) FROM execution_checkpoints").Scan(&count); e != nil {
				return e
			}
			if count != 0 {
				return failure("CONFLICT", "PROFILE_BACKUP_INCOMPLETE")
			}
		}
	}
	if e = snapshot.Close(); e != nil {
		return e
	}
	closed = true
	f, e = os.Open(path)
	if e != nil {
		return e
	}
	hash := sha256.New()
	m.Database.Size, e = io.Copy(hash, f)
	ce = f.Close()
	if e != nil {
		return e
	}
	if ce != nil {
		return ce
	}
	m.Database.Path = "profile.sqlite3"
	m.Database.SHA256 = "sha256:" + hex.EncodeToString(hash.Sum(nil))
	if ctx.Err() != nil {
		return ctx.Err()
	}
	encoded, e := json.Marshal(m)
	if e != nil {
		return e
	}
	mf, e := os.OpenFile(filepath.Join(dir, ".manifest-pending"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if e != nil {
		return e
	}
	_, e = mf.Write(encoded)
	if e == nil {
		e = mf.Sync()
	}
	ce = mf.Close()
	if e != nil {
		return e
	}
	if ce != nil {
		return ce
	}
	if e = syncDirectory(filepath.Join(dir, "checkpoints")); e != nil && !os.IsNotExist(e) {
		return e
	}
	if e = os.Rename(filepath.Join(dir, ".manifest-pending"), filepath.Join(dir, "manifest.json")); e != nil {
		return e
	}
	if e = syncDirectory(dir); e != nil {
		return e
	}
	return syncDirectory(filepath.Dir(dir))
}
