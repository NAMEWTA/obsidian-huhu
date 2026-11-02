package foundation_test

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func privateRoot(t *testing.T) string {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	return root
}
func status(t *testing.T, c *bootstrap.Core) api.ServiceStatus {
	t.Helper()
	s, err := c.API.Service.Status(context.Background(), api.NewConnectionIdentity("fake", "user", false))
	if err != nil {
		t.Fatal(err)
	}
	return s
}
func TestRealProfileReopenAndTwoEntranceConsumers(t *testing.T) {
	root := privateRoot(t)
	dir := filepath.Join(root, "one")
	c, err := bootstrap.Open(context.Background(), root, dir)
	if err != nil {
		t.Fatal(err)
	}
	first := status(t, c)
	for _, id := range []api.RequestIdentity{api.NewConnectionIdentity("stdio", "owner", true), api.NewConnectionIdentity("fake-second", "web-user", false)} {
		s, e := c.API.Service.Status(context.Background(), id)
		if e != nil || s.Profile != first.Profile {
			t.Fatalf("facade divergence: %#v %v", s, e)
		}
	}
	if first.Profile.ProfileID == "" || first.Profile.CommandEpoch != "1" || first.Profile.Revision != "1" {
		t.Fatalf("metadata: %#v", first)
	}
	if _, err = time.Parse(time.RFC3339Nano, first.Profile.CreatedAt); err != nil {
		t.Fatal(err)
	}
	if err = c.Close(); err != nil {
		t.Fatal(err)
	}
	c, err = bootstrap.Open(context.Background(), root, dir)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if got := status(t, c).Profile; got != first.Profile {
		t.Fatalf("persistent identity changed: %#v != %#v", got, first.Profile)
	}
	for _, path := range []string{dir, filepath.Join(dir, profile.DatabaseName)} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if runtime.GOOS != "windows" && info.Mode().Perm()&0077 != 0 {
			t.Fatal("not private", path)
		}
	}
}
func TestProfileRejectsCorruptEmptyAndFutureWithoutOverwrite(t *testing.T) {
	for _, mode := range []string{"corrupt", "empty", "future"} {
		t.Run(mode, func(t *testing.T) {
			root := privateRoot(t)
			dir := filepath.Join(root, "one")
			if err := os.Mkdir(dir, 0700); err != nil {
				t.Fatal(err)
			}
			dbpath := filepath.Join(dir, profile.DatabaseName)
			if mode == "future" {
				c, e := bootstrap.Open(context.Background(), root, dir)
				if e != nil {
					t.Fatal(e)
				}
				if e = c.Close(); e != nil {
					t.Fatal(e)
				}
				db, e := sql.Open("sqlite3", dbpath)
				if e != nil {
					t.Fatal(e)
				}
				if _, e = db.Exec("PRAGMA user_version=999"); e != nil {
					t.Fatal(e)
				}
				_ = db.Close()
			} else {
				data := []byte("private invalid database content")
				if mode == "empty" {
					data = nil
				}
				if e := os.WriteFile(dbpath, data, 0600); e != nil {
					t.Fatal(e)
				}
			}
			before, e := os.ReadFile(dbpath)
			if e != nil {
				t.Fatal(e)
			}
			c, e := bootstrap.Open(context.Background(), root, dir)
			if c != nil {
				_ = c.Close()
			}
			if e == nil {
				t.Fatal("opened invalid database")
			}
			var fault *api.Fault
			if !errors.As(e, &fault) {
				t.Fatalf("untyped error %v", e)
			}
			if mode == "future" && fault.Kind != "PROTOCOL_INCOMPATIBLE" {
				t.Fatal(fault)
			}
			after, e := os.ReadFile(dbpath)
			if e != nil {
				t.Fatal(e)
			}
			if !bytes.Equal(before, after) {
				t.Fatal("bad database was overwritten")
			}
		})
	}
}
func TestProfileRejectsOutsideAndInsecureRoots(t *testing.T) {
	root := privateRoot(t)
	if h, e := profile.Acquire(root, t.TempDir()); e == nil {
		h.Close()
		t.Fatal("accepted external root")
	}
	if runtime.GOOS != "windows" {
		if e := os.Chmod(root, 0755); e != nil {
			t.Fatal(e)
		}
		if h, e := profile.Acquire(root, filepath.Join(root, "one")); e == nil {
			h.Close()
			t.Fatal("accepted public root")
		}
	}
}

// A separate OS process opens the production bootstrap. It must never reach SQLite while locked.
func TestProfileLockChild(t *testing.T) {
	if os.Getenv("HUHU_LOCK_CHILD") != "1" {
		return
	}
	root := os.Getenv("HUHU_LOCK_ROOT")
	dir := os.Getenv("HUHU_LOCK_DIR")
	c, e := bootstrap.Open(context.Background(), root, dir)
	if c != nil {
		_ = c.Close()
	}
	var f *api.Fault
	if !errors.As(e, &f) || f.Kind != "INSTANCE_CONFLICT" {
		t.Fatalf("expected INSTANCE_CONFLICT, got %v", e)
	}
}
func TestRealTwoProcessIdentityAliases(t *testing.T) {
	root := privateRoot(t)
	dir := filepath.Join(root, "one")
	c, e := bootstrap.Open(context.Background(), root, dir)
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	original := status(t, c).Profile
	aliases := []string{dir}
	symbolic := filepath.Join(root, "symbolic")
	if e = os.Symlink(dir, symbolic); e != nil {
		t.Fatal(e)
	}
	aliases = append(aliases, symbolic)
	hard := filepath.Join(root, "hard")
	if e = os.Mkdir(hard, 0700); e != nil {
		t.Fatal(e)
	}
	if e = os.Link(filepath.Join(dir, profile.DatabaseName), filepath.Join(hard, profile.DatabaseName)); e != nil {
		t.Fatal(e)
	}
	aliases = append(aliases, hard)
	for _, alias := range aliases {
		cmd := exec.Command(os.Args[0], "-test.run=^TestProfileLockChild$", "-test.v")
		cmd.Env = append(os.Environ(), "HUHU_LOCK_CHILD=1", "HUHU_LOCK_ROOT="+root, "HUHU_LOCK_DIR="+alias)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("child %s: %s %v", alias, out, err)
		}
	}
	if status(t, c).Profile != original {
		t.Fatal("first instance overwritten")
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	// A live alias is rejected after lock release; deleting only this disposable
	// hardlink allows the uniquely named original DB to recover its own sidecars.
	if e = os.Remove(filepath.Join(hard, profile.DatabaseName)); e != nil {
		t.Fatal(e)
	}
	c, e = bootstrap.Open(context.Background(), root, dir)
	if e != nil {
		t.Fatal("lock not released", e)
	}
	defer c.Close()
}

func TestOutsideAncestorHasNoFilesystemSideEffect(t *testing.T) {
	root := privateRoot(t)
	outside := t.TempDir()
	link := filepath.Join(root, "escape")
	if err := os.Symlink(outside, link); err != nil {
		t.Fatal(err)
	}
	h, err := profile.Acquire(root, filepath.Join(link, "must-not-exist"))
	if h != nil {
		_ = h.Close()
	}
	if err == nil {
		t.Fatal("accepted escaping ancestor")
	}
	if _, err = os.Stat(filepath.Join(outside, "must-not-exist")); !os.IsNotExist(err) {
		t.Fatal("created a directory outside managed root", err)
	}
}
