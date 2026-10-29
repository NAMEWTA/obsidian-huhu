// Package portable is the file adapter for the application portable contract.
// The format is a single canonical JSON document with a sealed SHA-256 hash;
// it is intentionally boring so it can be inspected and migrated safely.
package portable

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	contract "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

const maxArchiveBytes = contract.MaxPackageBytes

func Encode(p contract.Package) ([]byte, error) {
	if err := contract.Validate(p); err != nil {
		return nil, err
	}
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	if len(b) > maxArchiveBytes {
		return nil, fmt.Errorf("portable: archive exceeds size limit")
	}
	return b, nil
}

func Decode(data []byte) (contract.Package, error) {
	if len(data) == 0 || len(data) > maxArchiveBytes {
		return contract.Package{}, fmt.Errorf("portable: archive size invalid")
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	var p contract.Package
	if err := dec.Decode(&p); err != nil {
		return contract.Package{}, fmt.Errorf("portable: invalid archive: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return contract.Package{}, fmt.Errorf("portable: trailing data")
	}
	if err := contract.Validate(p); err != nil {
		return contract.Package{}, err
	}
	return p, nil
}

func WriteFile(ctx context.Context, path string, p contract.Package) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if path == "" || filepath.Base(path) == "." || filepath.Base(path) == ".." || strings.ContainsRune(filepath.Base(path), '\x00') {
		return errors.New("portable: invalid export path")
	}
	b, err := Encode(p)
	if err != nil {
		return err
	}
	if info, e := os.Lstat(path); e == nil {
		if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			return errors.New("portable: export target invalid")
		}
		return errors.New("portable: export target exists")
	} else if !errors.Is(e, os.ErrNotExist) {
		return e
	}
	dir := filepath.Dir(path)
	if err = os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".huhu-portable-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0600); err == nil {
		_, err = tmp.Write(b)
	}
	if err == nil {
		err = tmp.Sync()
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	if err = ctx.Err(); err != nil {
		return err
	}
	if err = os.Link(tmpName, path); err != nil {
		return fmt.Errorf("portable: publish export: %w", err)
	}
	// A Windows directory handle rejects FlushFileBuffers with Access Denied.
	// File bytes are already synced; the link is the publication. Backup and
	// the artifact store skip this directory flush for the same reason.
	if runtime.GOOS != "windows" {
		if d, e := os.Open(dir); e == nil {
			err = d.Sync()
			_ = d.Close()
		}
	}
	return err
}

func ReadFile(ctx context.Context, path string) (contract.Package, error) {
	if err := ctx.Err(); err != nil {
		return contract.Package{}, err
	}
	if path == "" {
		return contract.Package{}, errors.New("portable: invalid import path")
	}
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode()&os.ModeSymlink != 0 {
		return contract.Package{}, errors.New("portable: import target invalid")
	}
	if info.Size() <= 0 || info.Size() > maxArchiveBytes {
		return contract.Package{}, errors.New("portable: archive size invalid")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return contract.Package{}, err
	}
	return Decode(b)
}
