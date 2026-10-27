package delegation_test

import (
	"context"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestPersistentAgentProposalRequiresUserCASHashAndAtomicConfirmation(t *testing.T) {
	proposed := make(chan api.AgentProposal, 1)
	eng := engineFunc(func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		v, e := i.Tools.Invoke(c, api.ToolCall{ID: "proposal", Name: "agents.proposeCreate", Proposal: &api.CreateProposal{Draft: api.AgentDraft{Name: "proposed", Persona: "user must confirm", AllowedTools: []string{}, AllowedCollaborationTargets: []string{}}}})
		if e != nil {
			return api.EngineResult{}, e
		}
		if _, e = i.Tools.Invoke(c, api.ToolCall{ID: "confirm", Name: "agents.confirmProposal", Proposal: &api.CreateProposal{}}); e == nil {
			return api.EngineResult{}, api.Invalid("MODEL_CONFIRMED_PROPOSAL")
		}
		proposed <- *v.Proposal
		return api.EngineResult{Status: "finished", Text: "proposal only"}, nil
	})
	c, _, loc := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "A", nil)
	r := start(t, c, session(t, c, a), "propose")
	var p api.AgentProposal
	select {
	case p = <-proposed:
	case <-time.After(5 * time.Second):
		t.Fatal("no proposal")
	}
	wait(t, c, r.RunID, "succeeded")
	db := database(t, loc)
	before := count(t, db, "SELECT count(*) FROM agents")
	command := api.ConfirmProposal{CommandMeta: meta(t, c, "confirm", p.Revision), ProposalID: p.ProposalID, PreviewHash: "sha256:wrong"}
	if _, e := c.API.Collaboration.ConfirmProposal(ctx, owner, command); !reason(e, "PROPOSAL_CHANGED") {
		t.Fatalf("bad preview allowed: %v", e)
	}
	command.PreviewHash = p.PreviewHash
	if _, e := db.Exec("CREATE TRIGGER fail_confirm BEFORE UPDATE OF state ON collaboration_proposals BEGIN SELECT RAISE(ABORT,'controlled confirmation fault'); END"); e != nil {
		t.Fatal(e)
	}
	if _, e := c.API.Collaboration.ConfirmProposal(ctx, owner, command); e == nil {
		t.Fatal("confirmation fault ignored")
	}
	if count(t, db, "SELECT count(*) FROM agents") != before || count(t, db, "SELECT count(*) FROM collaboration_proposals WHERE state='pending'") != 1 {
		t.Fatal("half-created persistent Bot")
	}
	if _, e := db.Exec("DROP TRIGGER fail_confirm"); e != nil {
		t.Fatal(e)
	}
	one, e := c.API.Collaboration.ConfirmProposal(ctx, owner, command)
	if e != nil {
		t.Fatal(e)
	}
	command.CommandID = "retry"
	two, e := c.API.Collaboration.ConfirmProposal(ctx, owner, command)
	if e != nil || one.ID != two.ID {
		t.Fatalf("confirm replay %#v %v", two, e)
	}
	if count(t, db, "SELECT count(*) FROM agents") != before+1 || count(t, db, "SELECT count(*) FROM collaboration_proposals WHERE state='confirmed'") != 1 {
		t.Fatal("proposal confirmation not exactly once")
	}
}
