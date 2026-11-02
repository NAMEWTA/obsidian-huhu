package recovery_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type sourceHost struct {
	reads atomic.Int32
	text  string
}

func (h *sourceHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("READ_ONLY")
}
func (h *sourceHost) Read(_ context.Context, r api.HostReadRequest) (api.HostReadResult, error) {
	h.reads.Add(1)
	return api.HostReadResult{Source: r.Source, Text: h.text, Format: "text/markdown"}, nil
}
func (h *sourceHost) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}
func attach(t *testing.T, c *bootstrap.Core) (api.SourceSnapshot, *sourceHost) {
	t.Helper()
	h := &sourceHost{text: "甲😀\noriginal captured source"}
	// Match a real reconnect's new trusted connection identity, while keeping
	// the same principal/workspace and captured resource/content as the control.
	l, e := c.API.Host.Attach(ctx, api.NewConnectionIdentity(api.NewID("host-connection:"), "owner", true), api.HostAttachCommand{WorkspaceID: "workspace:recovery", Capabilities: []string{"note.read", "note.search"}}, h)
	if e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256([]byte(h.text))
	return api.SourceSnapshot{ResourceID: "source:recovery", Kind: "note", WorkspaceID: l.WorkspaceID, OriginClientID: "client:recovery", OriginViewID: "view:captured", HostConnectionID: l.HostConnectionID, HostLeaseID: l.LeaseID, HostLeaseEpoch: l.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}, h
}
func recipient(a api.Agent) api.GrantRecipient {
	return api.GrantRecipient{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision, ProviderID: a.Model.ProviderID, ModelID: a.Model.ModelID, Protocol: a.Model.Protocol, Endpoint: a.Model.Endpoint}
}

func TestRealSourceCheckpointReopenWithNewHostLeaseBlocksWithoutRebindingOrReading(t *testing.T) {
	var target string
	entered := make(chan struct{}, 1)
	var initialReads atomic.Int32
	first := engine{run: func(c context.Context, i api.EngineInput) (api.EngineResult, error) {
		if i.Intent == "source-parent" {
			if len(i.Context.Sources) != 1 {
				return api.EngineResult{}, fmt.Errorf("missing source input")
			}
			initialReads.Add(1)
			v, e := i.Tools.Invoke(c, api.ToolCall{ID: "child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: "source-free-child", Constraints: []string{}}})
			if e != nil {
				return api.EngineResult{}, e
			}
			cp, e := i.Checkpoints.Publish(c, strings.NewReader("source-parent-private-cp"))
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Kind: "children", WaitForIDs: []string{v.Delegation.ChildRunID}, Checkpoint: cp}}, e
		}
		return api.EngineResult{Status: "finished", Text: "child fact"}, nil
	}, resume: func(c context.Context, _ api.EngineResumeInput) (api.EngineResult, error) {
		entered <- struct{}{}
		<-c.Done()
		return api.EngineResult{}, c.Err()
	}}
	c, root, loc := fresh(t, bootstrap.Options{Engine: first})
	b := agent(t, c, "child", nil)
	target = b.ID
	a := agent(t, c, "source parent", []string{b.ID})
	s := session(t, c, a)
	source, host := attach(t, c)
	g, e := c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, c, "source-grant", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Operations: []string{"read", "send", "delegate", "deliver"}, Recipients: []api.GrantRecipient{recipient(a), recipient(b)}})
	if e != nil {
		t.Fatal(e)
	}
	r, e := c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, c, "source-start", s.Revision), SessionID: s.ID, Intent: "source-parent", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{g.ID}})
	if e != nil {
		t.Fatal(e)
	}
	select {
	case <-entered:
	case <-time.After(6 * time.Second):
		t.Fatalf("actual source CP Resume not entered: %#v", get(t, c, r.RunID))
	}
	if initialReads.Load() != 1 || host.reads.Load() < 1 {
		t.Fatal("first Engine did not consume actual source")
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	var resumed, called, dispatches atomic.Int32
	next := engine{inspect: func(c context.Context, i api.CheckpointInspection) error {
		b, e := io.ReadAll(i.Reader)
		if e != nil {
			return e
		}
		if string(b) != "source-parent-private-cp" {
			return fmt.Errorf("bad CP")
		}
		return nil
	}, run: func(context.Context, api.EngineInput) (api.EngineResult, error) {
		called.Add(1)
		return api.EngineResult{}, fmt.Errorf("must not run")
	}, resume: func(c context.Context, i api.EngineResumeInput) (api.EngineResult, error) {
		resumed.Add(1)
		reservation, e := i.Input.Attempts.Reserve(c, api.AttemptRequest{LogicalCallID: "must-not-send", Purpose: "main", InputEstimate: "1", OutputBound: "1"})
		if e == nil {
			e = i.Input.Attempts.Dispatch(c, reservation, func(context.Context) error { dispatches.Add(1); return nil })
		}
		return api.EngineResult{}, e
	}}
	final := open(t, root, loc, bootstrap.Options{Engine: next})
	newSource, newHost := attach(t, final)
	if newSource.HostLeaseID == source.HostLeaseID || newSource.HostConnectionID == source.HostConnectionID {
		t.Fatal("fixture reused old Host identity")
	}
	qualification := inspect(t, final, r.RunID)
	if qualification.State != "blocked" || qualification.Reason != "HOST_LEASE_MISMATCH" {
		t.Fatalf("stale source silently rebound: %#v", qualification)
	}
	if _, e = final.API.Recovery.Resume(ctx, owner, api.RunResume{CommandMeta: meta(t, final, "old-source-resume", qualification.Revision), ID: r.RunID, RecoveryGeneration: qualification.Generation}); !reason(e, "RECOVERY_NOT_READY") {
		t.Fatalf("blocked old source accepted: %v", e)
	}
	if resumed.Load() != 0 || called.Load() != 0 || dispatches.Load() != 0 || newHost.reads.Load() != 0 || get(t, final, r.RunID).Status != "interrupted" {
		t.Fatal("invalid identity resumed/read/sent")
	}
	t.Log("actual old-source Resume interrupted; new Host lease cannot authorize old snapshot: blocked HOST_LEASE_MISMATCH, Engine/HostRead/Dispatch0")
}
