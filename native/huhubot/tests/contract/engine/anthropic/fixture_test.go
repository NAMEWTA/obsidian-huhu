package anthropic_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	broker "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var anthropicOwner = api.NewConnectionIdentity("anthropic-contract", "owner", true)

type anthropicFixture struct {
	core                                    *bootstrap.Core
	profile, epoch, session, agent, locator string
	sequence                                int
}

type fixtureHost struct{}

func (fixtureHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("USE_NOTE_PORT")
}
func (fixtureHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("USE_NOTE_PORT")
}

type fixtureWriter struct {
	host   api.HostAPI
	writes atomic.Int32
}

func (w *fixtureWriter) Preview(ctx context.Context, target api.EffectTarget, content string) (api.NoteTargetPreview, error) {
	lease, err := w.host.CurrentLease(ctx)
	digest := sha256.Sum256([]byte(content))
	return api.NoteTargetPreview{Target: target, Tool: broker.Descriptor, ContentHash: "sha256:" + hex.EncodeToString(digest[:]), Diff: "synthetic diff", Lease: lease}, err
}
func (*fixtureWriter) Check(context.Context, api.ApprovalPreview, api.HostLease) error { return nil }
func (w *fixtureWriter) Invoke(_ context.Context, dispatch api.EffectDispatch) (api.HostReceipt, error) {
	w.writes.Add(1)
	return api.HostReceipt{EffectID: dispatch.EffectID, Status: "committed", ReceiptID: "receipt:anthropic", Revision: "2"}, nil
}

func newAnthropicFixture(t *testing.T, endpoint string, options bootstrap.Options, allowed []string) *anthropicFixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	f := &anthropicFixture{locator: filepath.Join(root, "one")}
	if options.Budget.RootTokenLimit == "" && options.Budget.ProfileTokenLimit == "" {
		options.Budget = api.BudgetPolicy{RootTokenLimit: "1000000", ProfileTokenLimit: "10000000"}
	}
	var err error
	f.core, err = bootstrap.OpenWithOptions(context.Background(), root, f.locator, options)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { closeCore(t, f.core) })
	status, err := f.core.API.Service.Status(context.Background(), anthropicOwner)
	if err != nil {
		t.Fatal(err)
	}
	f.profile, f.epoch = status.Profile.ProfileID, status.Profile.CommandEpoch
	workspace := ""
	if writer, ok := options.NoteWriter.(*fixtureWriter); ok && writer != nil {
		writer.host = f.core.API.Host
		workspace = "workspace:anthropic"
		if _, err := f.core.API.Host.Attach(context.Background(), anthropicOwner, api.HostAttachCommand{WorkspaceID: workspace, Capabilities: []string{"note.write"}}, fixtureHost{}); err != nil {
			t.Fatal(err)
		}
	}
	ref := "credential:11111111111111111111111111111111"
	if _, err := f.core.Credentials.Register(context.Background(), f.profile, ref, "session-memory", []byte("synthetic-anthropic-key")); err != nil {
		t.Fatal(err)
	}
	agent, err := f.core.API.Assistant.Create(context.Background(), anthropicOwner, api.AgentCreate{CommandMeta: f.meta(""), Draft: api.AgentDraft{
		Name: "Anthropic", Persona: `Keep literal {"sample":{"x":1}}.`, AllowedTools: allowed,
		Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "anthropic-messages", Endpoint: endpoint, ModelID: "fixture-model", CredentialRef: ref},
	}})
	if err != nil {
		t.Fatal(err)
	}
	f.agent = agent.ID
	session, err := f.core.API.Conversation.CreateSession(context.Background(), anthropicOwner, api.SessionCreate{CommandMeta: f.meta(""), Kind: "direct", Title: "Anthropic", MemberIDs: []string{agent.ID}, WorkspaceID: workspace})
	if err != nil {
		t.Fatal(err)
	}
	f.session = session.ID
	return f
}

func closeCore(t *testing.T, core *bootstrap.Core) {
	t.Helper()
	if err := core.RequestStop(); err != nil {
		t.Error(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := core.WaitClosed(ctx); err != nil {
		t.Error("core failed to drain", err)
	}
}
func (f *anthropicFixture) meta(revision string) api.CommandMeta {
	f.sequence++
	key := fmt.Sprintf("anthropic-fixture:%d", f.sequence)
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: f.profile, CommandEpoch: f.epoch, ExpectedRevision: revision}
}
func (f *anthropicFixture) start(t *testing.T) string {
	t.Helper()
	session, err := f.core.API.Conversation.GetSession(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: f.session})
	if err != nil {
		t.Fatal(err)
	}
	run, err := f.core.API.Conversation.StartRun(context.Background(), anthropicOwner, api.RunStart{CommandMeta: f.meta(session.Revision), SessionID: f.session, Intent: "one intention", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	return run.RunID
}
func (f *anthropicFixture) terminal(t *testing.T, run string) api.Run {
	return waitForTerminal(t, f.core, anthropicOwner, f.profile, run)
}
func (f *anthropicFixture) approval(t *testing.T, run string) api.Approval {
	t.Helper()
	deadline := time.NewTimer(8 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		page, err := f.core.API.Approvals.List(context.Background(), anthropicOwner, api.PageQuery{ProfileID: f.profile})
		if err != nil {
			t.Fatal(err)
		}
		for _, a := range page.Items {
			if a.RunID == run && a.Status == "pending" {
				return a
			}
		}
		current, err := f.core.API.Conversation.GetRun(context.Background(), anthropicOwner, api.IDQuery{ProfileID: f.profile, ID: run})
		if err != nil {
			t.Fatal(err)
		}
		if current.Status == "succeeded" || current.Status == "failed" || current.Status == "canceled" {
			t.Fatalf("mixed Anthropic batch must suspend for approval, got %#v", current)
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("no approval", current)
		}
	}
}
func (f *anthropicFixture) decide(t *testing.T, a api.Approval, decision string) {
	t.Helper()
	_, err := f.core.API.Approvals.Resolve(context.Background(), anthropicOwner, api.ApprovalResolve{CommandMeta: f.meta(a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: decision, PreviewHash: a.Preview.PreviewHash})
	if err != nil {
		t.Fatal(err)
	}
}
