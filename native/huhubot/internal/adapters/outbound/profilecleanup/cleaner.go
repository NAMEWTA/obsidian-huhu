// Package profilecleanup owns physical removal below the locked Profile root.
package profilecleanup

import (
	"context"
	"errors"
	portablefile "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/portable"
	portableapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	"os"
	"path/filepath"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type SecretEraser interface {
	EraseProfile(context.Context, string, []api.CredentialMetadata) error
}
type Cleaner struct {
	directory string
	secrets   SecretEraser
	collect   func(context.Context) error
	discard   func()
}

func New(directory string, secrets SecretEraser) *Cleaner {
	return &Cleaner{directory: directory, secrets: secrets}
}
func (c *Cleaner) Clean(ctx context.Context, profile string, refs []api.CredentialMetadata) error {
	if c.discard != nil {
		c.discard()
	}
	if c.secrets == nil {
		return api.Denied("PROFILE_CLEANUP_UNAVAILABLE")
	}
	if err := c.secrets.EraseProfile(ctx, profile, refs); err != nil {
		return err
	}
	return c.Files(ctx)
}

// Files removes only HUHU-owned entries, never a caller-provided path. RemoveAll
// unlinks symlinks rather than following them outside the private Profile root.
func (c *Cleaner) Files(ctx context.Context) error {
	root, err := os.OpenRoot(c.directory)
	if err != nil {
		return err
	}
	defer root.Close()
	entries, err := os.ReadDir(c.directory)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if err = ctx.Err(); err != nil {
			return err
		}
		name := entry.Name()
		if name == "portable" || name == "checkpoints" || name == "logs" || name == "backups" || strings.HasPrefix(name, ".migration-v") {
			if err = root.RemoveAll(name); err != nil {
				return err
			}
		}
	}
	return nil
}

func (c *Cleaner) SetCollector(fn func(context.Context) error) { c.collect = fn }
func (c *Cleaner) Session(ctx context.Context, session string, sources []string) error {
	if c.discard != nil {
		c.discard()
	}
	root, err := os.OpenRoot(c.directory)
	if err != nil {
		return err
	}
	defer root.Close()
	entries, err := os.ReadDir(c.directory)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".migration-v") {
			if err = root.RemoveAll(entry.Name()); err != nil {
				return err
			}
		}
	}
	for _, relative := range []string{"portable", filepath.Join("portable", "artifacts"), "checkpoints"} {
		info, e := os.Lstat(filepath.Join(c.directory, relative))
		if os.IsNotExist(e) {
			continue
		}
		if e != nil {
			return e
		}
		if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
			return errors.New("profilecleanup: managed directory invalid")
		}
	}
	directory := filepath.Join(c.directory, "portable", "artifacts")
	entries, err = os.ReadDir(directory)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	removed := map[string]bool{session: true}
	for _, id := range sources {
		removed[id] = true
	}
	for _, entry := range entries {
		if err = ctx.Err(); err != nil {
			return err
		}
		path := filepath.Join(directory, entry.Name())
		pkg, e := portablefile.NewArtifactStore(c.directory).Get(ctx, portableapp.ArtifactRef{ArtifactID: "artifact:" + strings.TrimSuffix(entry.Name(), ".json")})
		if e != nil {
			relative, e := filepath.Rel(c.directory, path)
			if e != nil {
				return e
			}
			if err = root.Remove(relative); err != nil {
				return err
			}
			continue
		}
		affected := false
		for _, v := range pkg.Sessions {
			if removed[v.ID] {
				affected = true
			}
			for _, m := range v.Messages {
				if removed[m.ID] {
					affected = true
				}
			}
		}
		for _, v := range pkg.Memories {
			if removed[v.ScopeID] || removed[v.ID] {
				affected = true
			}
			for _, ref := range v.SourceRefs {
				if removed[ref.ID] {
					affected = true
				}
			}
		}
		if affected {
			relative, e := filepath.Rel(c.directory, path)
			if e != nil {
				return e
			}
			if err = root.Remove(relative); err != nil {
				return err
			}
		}
	}
	if c.collect != nil {
		return c.collect(ctx)
	}
	return nil
}

func (c *Cleaner) SetDiscard(fn func()) { c.discard = fn }
