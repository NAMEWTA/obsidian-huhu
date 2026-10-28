package delegation_test

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func proposalRouter(t *testing.T, c *bootstrap.Core, id api.RequestIdentity) *hap.Router {
	t.Helper()
	r := hap.New(c.API, id)
	request := "c:hello"
	response := r.Dispatch(ctx, wire.Envelope{ID: &request, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"proposals-test","version":"1"}}`)}, nil)
	if response.Error != nil {
		t.Fatal(response.Error)
	}
	return r
}
func proposalRequest(t *testing.T, r *hap.Router, method string, params any) hap.Response {
	t.Helper()
	data, err := json.Marshal(params)
	if err != nil {
		t.Fatal(err)
	}
	id := api.NewID("c:proposal:")
	return r.Dispatch(ctx, wire.Envelope{ID: &id, Method: method, Params: data}, nil)
}
func TestPendingAgentProposalPageAndRejectionAreActualHAPOperations(t *testing.T) {
	created := make(chan []api.AgentProposal, 1)
	eng := engineFunc(func(call context.Context, in api.EngineInput) (api.EngineResult, error) {
		out := []api.AgentProposal{}
		for n := 0; n < 3; n++ {
			value, err := in.Tools.Invoke(call, api.ToolCall{ID: fmt.Sprint("proposal", n), Name: "agents.proposeCreate", Proposal: &api.CreateProposal{Draft: api.AgentDraft{Name: fmt.Sprint("candidate", n), Persona: "proposed private persona"}}})
			if err != nil {
				return api.EngineResult{}, err
			}
			out = append(out, *value.Proposal)
		}
		created <- out
		return api.EngineResult{Status: "finished", Text: "proposed only"}, nil
	})
	c, _, _ := open(t, bootstrap.Options{Engine: eng})
	a := agent(t, c, "proposer", nil)
	run := start(t, c, session(t, c, a), "propose three")
	select {
	case <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("no proposals")
	}
	wait(t, c, run.RunID, "succeeded")
	router := proposalRouter(t, c, owner)
	profile := meta(t, c, "query", "").ProfileID
	response := proposalRequest(t, router, "collaboration.proposals", map[string]any{"profileId": profile, "runId": run.RunID, "limit": 1})
	if response.Error != nil {
		t.Fatal("pending model proposals cannot reach the user", response.Error)
	}
	var page struct {
		Items      []api.AgentProposal `json:"items"`
		NextCursor string              `json:"nextCursor"`
	}
	data, _ := json.Marshal(response.Result)
	if json.Unmarshal(data, &page) != nil || len(page.Items) != 1 || page.NextCursor == "" {
		t.Fatal("proposal page missing", string(data))
	}
	selected := page.Items[0]
	cursor := page.NextCursor
	second := proposalRequest(t, router, "collaboration.proposals", map[string]any{"profileId": profile, "runId": run.RunID, "limit": 1, "cursor": cursor})
	if second.Error != nil {
		t.Fatal(second.Error)
	}
	data, _ = json.Marshal(second.Result)
	if json.Unmarshal(data, &page) != nil || len(page.Items) != 1 || page.Items[0].ProposalID == selected.ProposalID {
		t.Fatal("cursor did not advance", string(data))
	}
	foreign := proposalRouter(t, c, api.NewConnectionIdentity("other-proposal-client", "other-user", false))
	other := proposalRequest(t, foreign, "collaboration.proposals", map[string]any{"profileId": profile, "limit": 50})
	if other.Error != nil {
		t.Fatal(other.Error)
	}
	data, _ = json.Marshal(other.Result)
	if json.Unmarshal(data, &page) != nil || len(page.Items) != 0 {
		t.Fatal("proposal crossed principal", string(data))
	}
	command := map[string]any{"profileId": profile, "commandEpoch": meta(t, c, "epoch", "").CommandEpoch, "commandId": "reject", "idempotencyKey": "reject", "expectedRevision": selected.Revision, "proposalId": selected.ProposalID, "previewHash": selected.PreviewHash}
	bad := map[string]any{}
	for key, value := range command {
		bad[key] = value
	}
	bad["previewHash"] = "sha256:" + strings.Repeat("0", 64)
	wrong := proposalRequest(t, router, "collaboration.rejectProposal", bad)
	if wrong.Error == nil || wrong.Error.Data.Reason != "PROPOSAL_CHANGED" {
		t.Fatal("unreviewed rejection accepted", wrong.Error)
	}
	denied := proposalRequest(t, foreign, "collaboration.rejectProposal", command)
	if denied.Error == nil || denied.Error.Data.Reason != "PROPOSAL_READ_DENIED" {
		t.Fatal("foreign principal rejected owner proposal", denied.Error)
	}
	rejected := proposalRequest(t, router, "collaboration.rejectProposal", command)
	if rejected.Error != nil {
		t.Fatal("cannot persist user rejection", rejected.Error)
	}
	command["commandId"] = "reject-retry"
	again := proposalRequest(t, router, "collaboration.rejectProposal", command)
	if again.Error != nil {
		t.Fatal(again.Error)
	}
	firstJSON, _ := json.Marshal(rejected.Result)
	againJSON, _ := json.Marshal(again.Result)
	if string(firstJSON) != string(againJSON) {
		t.Fatal("rejection not idempotent", string(firstJSON), string(againJSON))
	}
	remaining := proposalRequest(t, router, "collaboration.proposals", map[string]any{"profileId": profile, "runId": run.RunID, "limit": 50})
	if remaining.Error != nil {
		t.Fatal(remaining.Error)
	}
	data, _ = json.Marshal(remaining.Result)
	if json.Unmarshal(data, &page) != nil || len(page.Items) != 2 {
		t.Fatal("rejected proposal remained pending", string(data))
	}
	command["idempotencyKey"] = "confirm-after-reject"
	confirmed := proposalRequest(t, router, "collaboration.confirmProposal", command)
	if confirmed.Error == nil {
		t.Fatal("rejected proposal created a persistent Bot")
	}
}

func TestProposalPageFiltersCurrentSourceRevocation(t *testing.T) {
	created := make(chan struct{}, 1)
	eng := engineFunc(func(call context.Context, in api.EngineInput) (api.EngineResult, error) {
		if _, err := in.Tools.Invoke(call, api.ToolCall{ID: "restricted-proposal", Name: "agents.proposeCreate", Proposal: &api.CreateProposal{Draft: api.AgentDraft{Name: "source-derived", Persona: "PRIVATE_SOURCE_DERIVED_PERSONA"}}}); err != nil {
			return api.EngineResult{}, err
		}
		created <- struct{}{}
		return api.EngineResult{Status: "finished", Text: "proposal only"}, nil
	})
	c, _, _ := open(t, bootstrap.Options{Engine: eng})
	source, _ := attach(t, c)
	a := agent(t, c, "source-proposer", nil)
	consent := grant(t, c, source, recipient(a))
	s := session(t, c, a)
	run, err := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "source-proposal-run", s.Revision), SessionID: s.ID, Intent: "make a proposal", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{consent.ID}})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-created:
	case <-time.After(5 * time.Second):
		t.Fatal("no source-bound proposal")
	}
	wait(t, c, run.RunID, "succeeded")
	profile := meta(t, c, "read", "").ProfileID
	page, err := c.API.Collaboration.Proposals(ctx, owner, api.DiscoverQuery{PageQuery: api.PageQuery{ProfileID: profile, Limit: 50}})
	if err != nil || len(page.Items) != 1 {
		t.Fatal("authorized proposal unavailable", page, err)
	}
	if _, err = c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, c, "revoke-proposal-source", consent.Revision), ID: consent.ID}); err != nil {
		t.Fatal(err)
	}
	page, err = c.API.Collaboration.Proposals(ctx, owner, api.DiscoverQuery{PageQuery: api.PageQuery{ProfileID: profile, Limit: 50}})
	if err != nil || len(page.Items) != 0 {
		t.Fatal("proposal body bypassed revoked source", page, err)
	}
}
