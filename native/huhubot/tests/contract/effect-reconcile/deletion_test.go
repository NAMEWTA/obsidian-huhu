package effectreconcile_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestDeleteBodyRetainsOnlyReconciliationAndNeverReplaysWrite(t *testing.T) {
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	c, err := bootstrap.OpenWithOptions(ctx, root, filepath.Join(root, "one"), bootstrap.Options{Engine: engine{}})
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	h := &host{queryStatus: "committed"}
	h.lease, err = c.API.Host.Attach(ctx, identity, api.HostAttachCommand{WorkspaceID: "vault", Capabilities: []string{"note.write"}}, h)
	if err != nil {
		t.Fatal(err)
	}
	agent, err := c.API.Assistant.Create(ctx, identity, api.AgentCreate{CommandMeta: meta(t, c, "agent", ""), Draft: api.AgentDraft{Name: "writer", Persona: "literal", AllowedTools: []string{"note.write"}}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := c.API.Conversation.CreateSession(ctx, identity, api.SessionCreate{CommandMeta: meta(t, c, "session", ""), Kind: "direct", MemberIDs: []string{agent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	receipt, err := c.API.Conversation.StartRun(ctx, identity, api.RunStart{CommandMeta: meta(t, c, "run", session.Revision), SessionID: session.ID, Intent: "sensitive conversation", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	var approval api.Approval
	await(t, func() bool {
		page, e := c.API.Approvals.List(ctx, identity, api.PageQuery{ProfileID: receiptProfile(t, c)})
		if e != nil {
			t.Fatal(e)
		}
		if len(page.Items) == 0 {
			return false
		}
		approval = page.Items[0]
		return true
	})
	_, err = c.API.Approvals.Resolve(ctx, identity, api.ApprovalResolve{CommandMeta: meta(t, c, "approve", approval.Revision), ID: approval.ID, EffectID: approval.EffectID, Decision: "approve", PreviewHash: approval.Preview.PreviewHash})
	if err != nil {
		t.Fatal(err)
	}
	await(t, func() bool {
		r, e := c.API.Conversation.GetRun(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: receipt.RunID})
		return e == nil && r.Status == "failed"
	})
	preview, err := c.API.Data.DeletePreview(ctx, identity, api.IDQuery{ProfileID: receiptProfile(t, c), ID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	retained := false
	for _, category := range preview.Categories {
		if category.Kind == "unknown-effects" && category.Retained {
			retained = true
		}
	}
	if !retained {
		t.Fatal("unknown retention missing from preview")
	}
	_, err = c.API.Data.Delete(ctx, identity, api.SessionDelete{CommandMeta: meta(t, c, "delete", preview.Revision), ID: session.ID, PreviewToken: preview.Token})
	if err != nil {
		t.Fatal(err)
	}
	history, err := c.API.Conversation.History(ctx, identity, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: receiptProfile(t, c), Limit: 50}, SessionID: session.ID})
	if err != nil {
		t.Fatal(err)
	}
	if len(history.Items) != 0 {
		t.Fatal("body still visible", history)
	}
	view, err := c.API.Effects.Get(ctx, identity, api.EffectQuery{ProfileID: receiptProfile(t, c), ID: approval.EffectID})
	if err != nil {
		t.Fatal(err)
	}
	reconciled, err := c.API.Effects.Reconcile(ctx, identity, api.EffectReconcile{CommandMeta: meta(t, c, "reconcile", view.Revision), ID: approval.EffectID})
	if err != nil || reconciled.Status != "committed" {
		t.Fatal("deleted body lost reconciliation", reconciled, err)
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.writes != 1 || h.queries != 1 {
		t.Fatal("body deletion replayed a physical write", h.writes, h.queries)
	}
}
