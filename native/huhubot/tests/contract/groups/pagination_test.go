package groups_test

import (
	"encoding/json"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"testing"
)

func TestHundredMemberGroupSessionsPageWithinWireBudgetWithoutOmissions(t *testing.T) {
	c, _ := open(t, bootstrap.Options{ExecutorPaused: true})
	members := make([]api.Agent, 100)
	for i := range members {
		members[i] = agent(t, c, fmt.Sprintf("member-%03d", i), false)
	}
	expected := map[string]bool{}
	for range 32 {
		s := group(t, c, members[0], members[1:]...)
		expected[s.ID] = true
	}
	cursor := ""
	pages := 0
	seen := map[string]bool{}
	for {
		page, e := c.API.Conversation.ListSessions(ctx, owner, api.PageQuery{ProfileID: meta(t, c, "read", "").ProfileID, Limit: 100, Cursor: cursor})
		if e != nil {
			t.Fatal(e)
		}
		raw, e := json.Marshal(page)
		if e != nil || len(raw) > 524288 {
			t.Fatalf("oversized public page %d %v", len(raw), e)
		}
		pages++
		for _, s := range page.Items {
			if seen[s.ID] || !expected[s.ID] || len(s.GroupMembers) != 100 {
				t.Fatalf("invalid duplicate/session %#v", s)
			}
			seen[s.ID] = true
		}
		if page.NextCursor == "" {
			break
		}
		if page.NextCursor == cursor || pages > 32 {
			t.Fatal("cursor made no progress")
		}
		cursor = page.NextCursor
	}
	if len(seen) != 32 || pages < 2 {
		t.Fatalf("page budget not exercised: pages=%d unique=%d", pages, len(seen))
	}
	t.Logf("100 actual members ×32 owned groups, pages=%d, unique=%d; each JSON page<=524288 bytes", pages, len(seen))
}
