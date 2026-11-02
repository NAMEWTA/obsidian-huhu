// Package store publishes immutable, private HUHU checkpoint envelopes.
package store

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"strings"
	"sync"
)

const MaxCheckpointBytes = 1048576

var refPattern = regexp.MustCompile(`^cp:[0-9a-f]{32}$`)
var digestPattern = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)

type Store struct {
	directory string
	mu        sync.Mutex
	held      map[string]int
}
type envelope struct {
	Format   string
	Artifact api.CheckpointArtifact
}

func fail(reason string) error { return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: reason} }
func New(profileDirectory string) (*Store, error) {
	directory := filepath.Join(profileDirectory, "checkpoints")
	info, e := os.Lstat(directory)
	if e == nil && (!info.IsDir() || info.Mode()&os.ModeSymlink != 0) {
		return nil, fail("CHECKPOINT_ROOT_INVALID")
	}
	if e != nil && !errors.Is(e, os.ErrNotExist) {
		return nil, e
	}
	if errors.Is(e, os.ErrNotExist) {
		if e = os.Mkdir(directory, 0700); e != nil {
			return nil, e
		}
	}
	// A newly opened Store runs under the exclusive Profile lock; no publisher
	// can own a temporary file left by a previous crashed process.
	entries, e := os.ReadDir(directory)
	if e != nil {
		return nil, e
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".publishing-") {
			if e = os.Remove(filepath.Join(directory, entry.Name())); e != nil {
				return nil, e
			}
		}
	}
	return &Store{directory: directory, held: map[string]int{}}, nil
}
func valid(a api.CheckpointArtifact) bool {
	return refPattern.MatchString(a.Ref) && digestPattern.MatchString(a.Digest) && a.Size > 0 && a.Size <= MaxCheckpointBytes && a.RunID != "" && a.AttemptID != "" && a.Metadata.FormatVersion == "1" && len(a.Metadata.EngineVersion) > 0 && len(a.Metadata.EngineVersion) <= 64 && digestPattern.MatchString(a.Metadata.DefinitionDigest)
}
func (s *Store) path(ref string) (string, error) {
	if !refPattern.MatchString(ref) {
		return "", fail("CHECKPOINT_REF_INVALID")
	}
	return filepath.Join(s.directory, strings.TrimPrefix(ref, "cp:")+".cp"), nil
}
func (s *Store) Publish(ctx context.Context, run, attempt string, metadata api.CheckpointMetadata, r io.Reader) (api.CheckpointArtifact, func(), error) {
	var empty api.CheckpointArtifact
	if ctx.Err() != nil {
		return empty, nil, ctx.Err()
	}
	if r == nil {
		return empty, nil, fail("CHECKPOINT_EMPTY")
	}
	payload, e := io.ReadAll(io.LimitReader(r, MaxCheckpointBytes+1))
	if e != nil {
		return empty, nil, e
	}
	digest := sha256.Sum256(payload)
	a := api.CheckpointArtifact{Ref: api.NewID("cp:"), Digest: "sha256:" + hex.EncodeToString(digest[:]), Size: int64(len(payload)), RunID: run, AttemptID: attempt, Metadata: metadata}
	if !valid(a) {
		return empty, nil, fail("CHECKPOINT_FORMAT_INVALID")
	}
	s.mu.Lock()
	s.held[a.Ref]++
	s.mu.Unlock()
	release := s.releaser(a.Ref)
	success := false
	defer func() {
		if !success {
			release()
		}
	}()
	f, e := os.CreateTemp(s.directory, ".publishing-")
	if e != nil {
		return empty, nil, e
	}
	temporary := f.Name()
	defer os.Remove(temporary)
	defer f.Close()
	header, _ := json.Marshal(envelope{Format: "huhu-checkpoint-v1", Artifact: a})
	var encoded bytes.Buffer
	encoded.WriteString("HUHUCP1\n")
	_ = binary.Write(&encoded, binary.BigEndian, uint32(len(header)))
	encoded.Write(header)
	encoded.Write(payload)
	if _, e = f.Write(encoded.Bytes()); e != nil {
		return empty, nil, e
	}
	if e = f.Sync(); e != nil {
		return empty, nil, e
	}
	if e = f.Close(); e != nil {
		return empty, nil, e
	}
	if ctx.Err() != nil {
		return empty, nil, ctx.Err()
	}
	target, _ := s.path(a.Ref)
	// Link is an atomic no-replace publication on the supported local filesystems.
	if e = os.Link(temporary, target); e != nil {
		return empty, nil, e
	}
	if runtime.GOOS != "windows" {
		directory, e := os.Open(s.directory)
		if e != nil {
			return empty, nil, e
		}
		e = directory.Sync()
		_ = directory.Close()
		if e != nil {
			return empty, nil, e
		}
	}
	success = true
	return a, release, nil
}
func (s *Store) releaser(ref string) func() {
	var once sync.Once
	return func() {
		once.Do(func() {
			s.mu.Lock()
			s.held[ref]--
			if s.held[ref] == 0 {
				delete(s.held, ref)
			}
			s.mu.Unlock()
		})
	}
}
func (s *Store) read(ctx context.Context, a api.CheckpointArtifact) ([]byte, error) {
	if !valid(a) {
		return nil, fail("CHECKPOINT_FORMAT_INVALID")
	}
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	path, _ := s.path(a.Ref)
	info, e := os.Lstat(path)
	if e != nil || !info.Mode().IsRegular() {
		return nil, fail("CHECKPOINT_UNAVAILABLE")
	}
	f, e := os.Open(path)
	if e != nil {
		return nil, fail("CHECKPOINT_UNAVAILABLE")
	}
	defer f.Close()
	encoded, e := io.ReadAll(io.LimitReader(f, MaxCheckpointBytes+16385))
	if e != nil {
		return nil, e
	}
	return verifyEncoded(a, encoded)
}
func verifyEncoded(a api.CheckpointArtifact, encoded []byte) ([]byte, error) {
	if len(encoded) < 12 || string(encoded[:8]) != "HUHUCP1\n" {
		return nil, fail("CHECKPOINT_CORRUPT")
	}
	size := int(binary.BigEndian.Uint32(encoded[8:12]))
	if size <= 0 || size > 16384 || 12+size > len(encoded) {
		return nil, fail("CHECKPOINT_CORRUPT")
	}
	var header envelope
	decoder := json.NewDecoder(bytes.NewReader(encoded[12 : 12+size]))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&header) != nil || header.Format != "huhu-checkpoint-v1" || !reflect.DeepEqual(header.Artifact, a) {
		return nil, fail("CHECKPOINT_INCOMPATIBLE")
	}
	payload := encoded[12+size:]
	hash := sha256.Sum256(payload)
	if int64(len(payload)) != a.Size || "sha256:"+hex.EncodeToString(hash[:]) != a.Digest {
		return nil, fail("CHECKPOINT_CORRUPT")
	}
	return payload, nil
}
func (s *Store) Verify(ctx context.Context, a api.CheckpointArtifact) error {
	_, e := s.read(ctx, a)
	return e
}

type reader struct {
	*bytes.Reader
	release func()
}

func (r *reader) Close() error { r.release(); return nil }
func (s *Store) Open(ctx context.Context, a api.CheckpointArtifact) (io.ReadCloser, error) {
	s.mu.Lock()
	s.held[a.Ref]++
	s.mu.Unlock()
	release := s.releaser(a.Ref)
	payload, e := s.read(ctx, a)
	if e != nil {
		release()
		return nil, e
	}
	return &reader{bytes.NewReader(payload), release}, nil
}
func (s *Store) Collect(ctx context.Context, referenced func(context.Context, string) (bool, error)) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entries, e := os.ReadDir(s.directory)
	if e != nil {
		return 0, e
	}
	removed := 0
	for _, entry := range entries {
		if ctx.Err() != nil {
			return removed, ctx.Err()
		}
		name := entry.Name()
		if strings.HasPrefix(name, ".publishing-") {
			continue
		}
		if !strings.HasSuffix(name, ".cp") {
			continue
		}
		ref := "cp:" + strings.TrimSuffix(name, ".cp")
		if !refPattern.MatchString(ref) || s.held[ref] > 0 {
			continue
		}
		used, e := referenced(ctx, ref)
		if e != nil {
			return removed, e
		}
		if !used {
			if e = os.Remove(filepath.Join(s.directory, name)); e != nil {
				return removed, e
			}
			removed++
		}
	}
	return removed, nil
}

// CopyEnvelope preserves the complete HUHUCP1 file, not Open's payload view.
// The copied bytes are verified against the exact persisted Artifact before
// publication. A recovery set never depends on a live hard link or GC reference.
func (s *Store) CopyEnvelope(ctx context.Context, a api.CheckpointArtifact, destination string) (int64, string, error) {
	if !valid(a) {
		return 0, "", fail("CHECKPOINT_FORMAT_INVALID")
	}
	path, _ := s.path(a.Ref)
	info, e := os.Lstat(path)
	if e != nil || !info.Mode().IsRegular() {
		return 0, "", fail("CHECKPOINT_UNAVAILABLE")
	}
	f, e := os.Open(path)
	if e != nil {
		return 0, "", e
	}
	encoded, e := io.ReadAll(io.LimitReader(f, MaxCheckpointBytes+16385))
	ce := f.Close()
	if e != nil {
		return 0, "", e
	}
	if ce != nil {
		return 0, "", ce
	}
	if _, e = verifyEncoded(a, encoded); e != nil {
		return 0, "", e
	}
	if ctx.Err() != nil {
		return 0, "", ctx.Err()
	}
	out, e := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if e != nil {
		return 0, "", e
	}
	_, e = out.Write(encoded)
	if e == nil {
		e = out.Sync()
	}
	ce = out.Close()
	if e != nil {
		return 0, "", e
	}
	if ce != nil {
		return 0, "", ce
	}
	digest := sha256.Sum256(encoded)
	return int64(len(encoded)), "sha256:" + hex.EncodeToString(digest[:]), nil
}

// ReadOnlySource validates the old live root without collecting or creating any
// file. Migration copies must precede even startup orphan cleanup.
func ReadOnlySource(profileDirectory string) (*Store, error) {
	directory := filepath.Join(profileDirectory, "checkpoints")
	info, e := os.Lstat(directory)
	if e != nil && !errors.Is(e, os.ErrNotExist) {
		return nil, e
	}
	if e == nil && (!info.IsDir() || info.Mode()&os.ModeSymlink != 0) {
		return nil, fail("CHECKPOINT_ROOT_INVALID")
	}
	return &Store{directory: directory, held: map[string]int{}}, nil
}
