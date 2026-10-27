package chat_test

import (
	"context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"os"
	"path/filepath"
	"testing"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("chat-test", "owner", true)

func open(t *testing.T) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	locator := filepath.Join(root, "one")
	c, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = c.Close() })
	if c.API.Conversation == nil {
		t.Fatal("T03 Conversation facade not assembled")
	}
	return c, root, locator
}
func meta(t *testing.T, c *bootstrap.Core, key, rev string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: rev}
}
func TestDirectSessionPersistsWithoutCallingModel(t *testing.T) {
	c, root, locator := open(t)
	m := meta(t, c, "session", "")
	bots, e := c.API.Assistant.List(ctx, owner, api.PageQuery{ProfileID: m.ProfileID})
	if e != nil {
		t.Fatal(e)
	}
	command := api.SessionCreate{CommandMeta: m, Kind: "direct", Title: "test", MemberIDs: []string{bots.Items[0].ID}}
	session, e := c.API.Conversation.CreateSession(ctx, owner, command)
	if e != nil || session.ID == "" || len(session.MemberIDs) != 1 {
		t.Fatal(session, e)
	}
	replay, e := c.API.Conversation.CreateSession(ctx, owner, command)
	if e != nil || replay.ID != session.ID {
		t.Fatal("session replay", replay, e)
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	other, e := bootstrap.Open(ctx, root, locator)
	if e != nil {
		t.Fatal(e)
	}
	defer other.Close()
	got, e := other.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: m.ProfileID, ID: session.ID})
	if e != nil || got.ID != session.ID || got.Revision != session.Revision {
		t.Fatal("session reopen", got, e)
	}
	history, e := other.API.Conversation.History(ctx, owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: m.ProfileID}, SessionID: session.ID})
	if e != nil || len(history.Items) != 0 {
		t.Fatal("navigation invoked model", history, e)
	}
}
