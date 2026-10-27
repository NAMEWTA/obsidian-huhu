package purge

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/purge"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/execution/purge"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func openStore(t *testing.T) (*Store, *base.Store, func()) {
	t.Helper()
	ctx := context.Background()
	root := t.TempDir()
	if err := os.Chmod(root, 0700); err != nil {
		t.Fatal(err)
	}
	h, err := profile.Acquire(root, filepath.Join(root, "profile"))
	if err != nil {
		t.Fatal(err)
	}
	b, err := base.Open(ctx, h)
	if err != nil {
		_ = h.Close()
		t.Fatal(err)
	}
	if _, err = b.Database().ExecContext(ctx, `CREATE TABLE IF NOT EXISTS purge_previews (
 token TEXT PRIMARY KEY, profile_id TEXT NOT NULL, command_epoch INTEGER NOT NULL,
 revision INTEGER NOT NULL, selection_json TEXT NOT NULL, unknown_effects INTEGER NOT NULL,
 expires_at TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL)`); err != nil {
		b.Close()
		h.Close()
		t.Fatal(err)
	}
	s := New(b)
	now := time.Date(2027, time.January, 2, 3, 4, 5, 0, time.UTC)
	s.now = func() time.Time { return now }
	cleanup := func() { _ = b.Close(); _ = h.Close() }
	return s, b, cleanup
}

func profileMeta(t *testing.T, b *base.Store) (string, uint64, uint64) {
	t.Helper()
	var id, epoch, rev string
	if err := b.Database().QueryRow("SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&id, &epoch, &rev); err != nil {
		t.Fatal(err)
	}
	var e, r uint64
	_, _ = fmt.Sscan(epoch, &e)
	_, _ = fmt.Sscan(rev, &r)
	return id, e, r
}

func TestPreviewExecuteClearsProfileAndBumpsIdentity(t *testing.T) {
	s, b, cleanup := openStore(t)
	defer cleanup()
	ctx := context.Background()
	id, epoch, rev := profileMeta(t, b)
	if _, err := b.Database().ExecContext(ctx, "INSERT INTO agents(agent_id,revision,persona_revision,model_revision,enabled,is_default) VALUES('agent:test',1,1,0,1,1)"); err != nil {
		t.Fatal(err)
	}
	plan, err := s.Preview(ctx, app.PreviewRequest{ProfileID: id, Selection: purge.Selection{}})
	if err != nil {
		t.Fatal(err)
	}
	if plan.CommandEpoch != epoch || plan.Revision != rev || plan.NextProfileID == id {
		t.Fatalf("bad plan: %#v", plan)
	}
	res, err := s.Execute(ctx, app.ExecuteRequest{ProfileID: id, Token: plan.Token})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Purged || res.ProfileID == id || res.CommandEpoch != epoch+1 || res.Revision != rev+1 {
		t.Fatalf("bad result: %#v", res)
	}
	var gotID, gotEpoch string
	if err = b.Database().QueryRow("SELECT profile_id,CAST(command_epoch AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&gotID, &gotEpoch); err != nil {
		t.Fatal(err)
	}
	if gotID != res.ProfileID || gotEpoch != "2" {
		t.Fatalf("metadata not replaced: %s/%s", gotID, gotEpoch)
	}
	var count int
	if err = b.Database().QueryRow("SELECT count(*) FROM agents").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("agents survived purge: %d", count)
	}
	var state string
	if err = b.Database().QueryRow("SELECT state FROM purge_previews WHERE token=?", plan.Token).Scan(&state); err != nil {
		t.Fatal(err)
	}
	if state != "executed" {
		t.Fatalf("preview state %s", state)
	}
}

func TestPreviewExpiryDoesNotMutateProfile(t *testing.T) {
	s, b, cleanup := openStore(t)
	defer cleanup()
	ctx := context.Background()
	id, epoch, rev := profileMeta(t, b)
	plan, err := s.Preview(ctx, app.PreviewRequest{ProfileID: id, TTL: time.Nanosecond})
	if err != nil {
		t.Fatal(err)
	}
	s.now = func() time.Time { return plan.ExpiresAt.Add(time.Second) }
	_, err = s.Execute(ctx, app.ExecuteRequest{ProfileID: id, Token: plan.Token})
	var f *api.Fault
	if !errors.As(err, &f) || f.Reason != "PURGE_PREVIEW_EXPIRED" {
		t.Fatalf("got %v", err)
	}
	var gotID, gotEpoch, gotRev string
	if err = b.Database().QueryRow("SELECT profile_id,CAST(command_epoch AS TEXT),CAST(revision AS TEXT) FROM profile_metadata WHERE singleton=1").Scan(&gotID, &gotEpoch, &gotRev); err != nil {
		t.Fatal(err)
	}
	if gotID != id || gotEpoch != "1" || gotRev != "1" || epoch != 1 || rev != 1 {
		t.Fatalf("metadata changed: %s/%s/%s", gotID, gotEpoch, gotRev)
	}
}

func TestKeepGlobalMovesNamespaceToNewProfile(t *testing.T) {
	s, b, cleanup := openStore(t)
	defer cleanup()
	ctx := context.Background()
	id, _, _ := profileMeta(t, b)
	if _, err := b.Database().ExecContext(ctx, "INSERT INTO memory_namespaces(namespace_id,profile_id,principal_id,kind,subject_id,enabled) VALUES(?,?,?,?,?,0)", "global:test", id, "global:test", "global", id); err != nil {
		t.Fatal(err)
	}
	plan, err := s.Preview(ctx, app.PreviewRequest{ProfileID: id, Selection: purge.Selection{KeepGlobal: true}})
	if err != nil {
		t.Fatal(err)
	}
	res, err := s.Execute(ctx, app.ExecuteRequest{ProfileID: id, Token: plan.Token})
	if err != nil {
		t.Fatal(err)
	}
	var owner string
	if err = b.Database().QueryRow("SELECT profile_id FROM memory_namespaces WHERE namespace_id='global:test'").Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if owner != res.ProfileID {
		t.Fatalf("global namespace owner %q, want %q", owner, res.ProfileID)
	}
}
