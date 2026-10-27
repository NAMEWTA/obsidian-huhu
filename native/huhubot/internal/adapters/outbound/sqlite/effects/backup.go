package effects

import (
	"context"
	"database/sql"
	"encoding/json"
	blob "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"os"
	"path/filepath"
	"strings"
)

// CompleteMigrationBackup reads only the old, immutable DB snapshot. Every
// registry entry remains a recovery dependency, including terminal approvals.
func CompleteMigrationBackup(ctx context.Context, db *sql.DB, blobs *blob.Store, dir string) ([]base.BackupBlob, error) {
	out := []base.BackupBlob{}
	var exists int
	if e := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_schema WHERE type='table' AND name='execution_checkpoints'").Scan(&exists); e != nil {
		return nil, e
	}
	if exists == 0 {
		return out, nil
	}
	rows, e := db.QueryContext(ctx, "PRAGMA foreign_key_check")
	if e != nil {
		return nil, e
	}
	bad := rows.Next()
	e = rows.Err()
	ce := rows.Close()
	if e != nil {
		return nil, e
	}
	if ce != nil {
		return nil, ce
	}
	if bad {
		return nil, fail("CONFLICT", "CHECKPOINT_ASSOCIATION_INVALID")
	}
	rows, e = db.QueryContext(ctx, "SELECT c.ref,c.run_id,c.artifact_json,r.run_id FROM execution_checkpoints c LEFT JOIN execution_runs r ON r.run_id=c.run_id ORDER BY c.ref")
	if e != nil {
		return nil, e
	}
	artifacts := []api.CheckpointArtifact{}
	for rows.Next() {
		var ref, run, body string
		var owner sql.NullString
		if e = rows.Scan(&ref, &run, &body, &owner); e != nil {
			break
		}
		var a api.CheckpointArtifact
		if e = json.Unmarshal([]byte(body), &a); e != nil {
			break
		}
		if !owner.Valid || a.Ref != ref || a.RunID != run {
			e = fail("CONFLICT", "CHECKPOINT_ASSOCIATION_INVALID")
			break
		}
		artifacts = append(artifacts, a)
	}
	if e == nil {
		e = rows.Err()
	}
	ce = rows.Close()
	if e != nil {
		return nil, e
	}
	if ce != nil {
		return nil, ce
	}
	if e = os.Mkdir(filepath.Join(dir, "checkpoints"), 0700); e != nil {
		return nil, e
	}
	for _, a := range artifacts {
		relative := "checkpoints/" + strings.TrimPrefix(a.Ref, "cp:") + ".cp"
		size, hash, e := blobs.CopyEnvelope(ctx, a, filepath.Join(dir, filepath.FromSlash(relative)))
		if e != nil {
			return nil, e
		}
		out = append(out, base.BackupBlob{Path: relative, Size: size, SHA256: hash, Artifact: a})
	}
	return out, nil
}
