package access_test

import (
	"path/filepath"
	"testing"

	portablefile "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/portable"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	portableapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
)

func TestPortableExportCannotBypassRevokedHistory(t *testing.T) {
	f := open(t)
	source := f.source("source:portable-revoked", "PRIVATE_PORTABLE_SOURCE")
	grant := f.grant(t, source, "portable-grant")
	if _, err := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("portable-run", "1"), SessionID: f.session, Intent: "private question", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}}); err != nil {
		t.Fatal(err)
	}
	artifact, err := f.c.Portable.Export(ctx, owner, portableapp.ExportRequest{ProfileID: f.profile, SessionIDs: []string{f.session}})
	if err != nil {
		t.Fatal(err)
	}
	files := portablefile.NewArtifactStore(filepath.Dir(f.database))
	before, err := files.Get(ctx, artifact.Artifact)
	if err != nil || len(before.Sessions) != 1 || len(before.Sessions[0].Messages) != 1 {
		t.Fatal("authorized export missing", before, err)
	}
	if _, err = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("portable-revoke", grant.Revision), ID: grant.ID}); err != nil {
		t.Fatal(err)
	}
	artifact, err = f.c.Portable.Export(ctx, owner, portableapp.ExportRequest{ProfileID: f.profile, SessionIDs: []string{f.session}})
	if err != nil {
		t.Fatal(err)
	}
	after, err := files.Get(ctx, artifact.Artifact)
	if err != nil {
		t.Fatal(err)
	}
	if len(after.Sessions) != 1 || len(after.Sessions[0].Messages) != 0 {
		t.Fatal("export bypassed current read grant", after.Sessions)
	}
}
