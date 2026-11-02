package approval_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	brokerapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	_ "github.com/ncruces/go-sqlite3/driver"
)

var ctx = context.Background()
var owner = api.NewConnectionIdentity("approval-test", "owner", true)

type engine struct {
	run    func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error)
	resume func(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error)
}

func (e engine) Run(c context.Context, i api.EngineInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, i, s)
}
func (e engine) Resume(c context.Context, i api.EngineResumeInput, s func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.resume(c, i, s)
}

type host struct{}

func (host) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("FIXTURE_USE_NOTE_PORT")
}
func (host) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("FIXTURE_USE_NOTE_PORT")
}

type writer struct {
	mu            sync.Mutex
	host          api.HostAPI
	revision      string
	calls         int
	checkEntered  chan struct{}
	checkRelease  chan struct{}
	checkErr      error
	invokeEntered chan struct{}
	invokeRelease chan struct{}
	unknown       bool
}

func (w *writer) Preview(c context.Context, target api.EffectTarget, text string) (api.NoteTargetPreview, error) {
	w.mu.Lock()
	revision := w.revision
	w.mu.Unlock()
	if target.BaseRevision != revision {
		return api.NoteTargetPreview{}, &api.Fault{Kind: "SOURCE_CHANGED", Reason: "SOURCE_CHANGED"}
	}
	lease, e := w.host.CurrentLease(c)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	h := sha256.Sum256([]byte(text))
	return api.NoteTargetPreview{Target: api.EffectTarget{WorkspaceID: target.WorkspaceID, ResourceID: target.ResourceID, Operation: target.Operation, BaseRevision: revision}, Tool: brokerapp.Descriptor, Diff: "old -> " + text, ContentHash: "sha256:" + hex.EncodeToString(h[:]), Lease: lease}, nil
}
func (w *writer) Check(c context.Context, p api.ApprovalPreview, _ api.HostLease) error {
	if w.checkEntered != nil {
		select {
		case w.checkEntered <- struct{}{}:
		default:
		}
		select {
		case <-w.checkRelease:
		case <-c.Done():
			return c.Err()
		}
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.checkErr != nil {
		return w.checkErr
	}
	if p.Target.BaseRevision != w.revision {
		return &api.Fault{Kind: "SOURCE_CHANGED", Reason: "SOURCE_CHANGED"}
	}
	return nil
}
func (w *writer) Invoke(_ context.Context, e api.EffectDispatch) (api.HostReceipt, error) {
	if w.invokeEntered != nil {
		close(w.invokeEntered)
		<-w.invokeRelease
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	w.calls++
	if w.unknown {
		return api.HostReceipt{}, errors.New("fixture transport lost after dispatch")
	}
	w.revision = "2"
	return api.HostReceipt{EffectID: e.EffectID, Status: "committed", Revision: "2", ReceiptID: "receipt:host"}, nil
}
func (w *writer) count() int { w.mu.Lock(); defer w.mu.Unlock(); return w.calls }

type fixture struct {
	core          *bootstrap.Core
	root, locator string
	writer        *writer
	session       api.Session
	agent         api.Agent
	command       api.RunStart
}

func open(t *testing.T, e api.Engine, lifetime time.Duration) *fixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	locator := filepath.Join(root, "one")
	w := &writer{revision: "1"}
	c, err := bootstrap.OpenWithOptions(ctx, root, locator, bootstrap.Options{Engine: e, NoteWriter: w, ApprovalLifetime: lifetime})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := c.Close(); err != nil {
			t.Error(err)
		}
	})
	w.host = c.API.Host
	_, err = c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.write"}}, host{})
	if err != nil {
		t.Fatal(err)
	}
	a, err := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "agent", ""), Draft: api.AgentDraft{Name: "writer", Persona: "fixture", AllowedTools: []string{"note.write"}}})
	if err != nil {
		t.Fatal(err)
	}
	session, err := c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, c, "session", ""), Kind: "direct", MemberIDs: []string{a.ID}, WorkspaceID: "workspace:one"})
	if err != nil {
		t.Fatal(err)
	}
	return &fixture{core: c, root: root, locator: locator, writer: w, agent: a, session: session, command: api.RunStart{CommandMeta: meta(t, c, "run", session.Revision), SessionID: session.ID, Intent: "write", SourceRefs: []api.SourceSnapshot{}}}
}
func meta(t *testing.T, c *bootstrap.Core, key, revision string) api.CommandMeta {
	t.Helper()
	s, e := c.API.Service.Status(ctx, owner)
	if e != nil {
		t.Fatal(e)
	}
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: s.Profile.ProfileID, CommandEpoch: s.Profile.CommandEpoch, ExpectedRevision: revision}
}
func target() api.EffectTarget {
	return api.EffectTarget{WorkspaceID: "workspace:one", ResourceID: "note:one", Operation: "update", BaseRevision: "1"}
}
func suspend(c context.Context, in api.EngineInput) (api.EngineResult, error) {
	r, e := in.Tools.Invoke(c, api.ToolCall{ID: "call:first", Name: "note.write", Target: target(), Content: "new"})
	if e != nil {
		return api.EngineResult{}, e
	}
	if r.Status != "approval_required" {
		return api.EngineResult{}, api.Invalid("FIXTURE_EXPECTED_APPROVAL")
	}
	a, e := in.Checkpoints.Publish(c, bytes.NewBufferString("private-engine-state"))
	if e != nil {
		return api.EngineResult{}, e
	}
	return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: r.SuspensionToken, Checkpoint: a}}, nil
}
func waitApproval(t *testing.T, f *fixture) api.Approval {
	t.Helper()
	until := time.Now().Add(3 * time.Second)
	for {
		page, e := f.core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: f.command.ProfileID})
		if e != nil {
			t.Fatal(e)
		}
		if len(page.Items) == 1 {
			return page.Items[0]
		}
		if time.Now().After(until) {
			// Failure-only evidence: the previous GetRun of a placeholder id always printed an empty Run.
			t.Fatalf("approval not published within 3s; runs: %s\n%s", f.runStates(), projectStacks())
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func waitRun(t *testing.T, f *fixture, id, status string) api.Run {
	t.Helper()
	return waitRunWithin(t, f, id, status, 3*time.Second)
}
func waitRunWithin(t *testing.T, f *fixture, id, status string, budget time.Duration) api.Run {
	t.Helper()
	until := time.Now().Add(budget)
	for {
		r, e := f.core.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: id})
		if e != nil {
			t.Fatal(e)
		}
		if r.Status == status {
			return r
		}
		if time.Now().After(until) {
			t.Fatalf("expected %s got %#v", status, r)
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func db(t *testing.T, f *fixture) *sql.DB {
	t.Helper()
	d, e := sql.Open("sqlite3", filepath.Join(f.locator, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _ = d.Close() })
	return d
}
func count(t *testing.T, d *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if e := d.QueryRow(q, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func expect(t *testing.T, e error, reason string) {
	t.Helper()
	var f *api.Fault
	if !errors.As(e, &f) || f.Reason != reason {
		t.Fatalf("want %s got %v", reason, e)
	}
}

func TestPublicApprovalDecisionResumesSameRunAndReleasesOnce(t *testing.T) {
	for _, decision := range []string{"approve", "reject", "expired"} {
		t.Run(decision, func(t *testing.T) {
			resumed := make(chan api.EngineResumeInput, 2)
			engine := engine{run: func(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				return suspend(c, i)
			}, resume: func(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				r, e := i.Input.Checkpoints.Open(c, i.Checkpoint)
				if e != nil {
					return api.EngineResult{}, e
				}
				b, e := io.ReadAll(r)
				_ = r.Close()
				if e != nil || string(b) != "private-engine-state" {
					return api.EngineResult{}, api.Invalid("FIXTURE_BAD_CP")
				}
				resumed <- i
				return api.EngineResult{Status: "finished", Text: "decision " + i.Decision.Status}, nil
			}}
			lifetime := time.Minute
			settle := 3 * time.Second
			if decision == "expired" {
				// Longer than waitApproval's 3s poll, so a busy runner still
				// observes waiting_approval before the real lifetime elapses.
				lifetime = 8 * time.Second
				settle = lifetime + 5*time.Second
			}
			f := open(t, engine, lifetime)
			receipt, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
			if e != nil {
				t.Fatal(e)
			}
			a := waitApproval(t, f)
			waitRun(t, f, receipt.RunID, "waiting_approval")
			d := db(t, f)
			if count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 1 || count(t, d, "SELECT count(*) FROM access_approvals") != 1 || count(t, d, "SELECT count(*) FROM execution_checkpoints") != 1 {
				t.Fatal("half publication or lost pin")
			}
			if f.writer.count() != 0 {
				t.Fatal("effect before approval")
			}
			if decision != "expired" {
				resolve := api.ApprovalResolve{CommandMeta: meta(t, f.core, "resolve", a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: decision, PreviewHash: a.Preview.PreviewHash}
				out, e := f.core.API.Approvals.Resolve(ctx, owner, resolve)
				if e != nil {
					t.Fatal(e)
				}
				resolve.CommandID = "new-attempt"
				again, e := f.core.API.Approvals.Resolve(ctx, owner, resolve)
				if e != nil || again.ID != out.ID || again.Status != out.Status {
					t.Fatal("decision intent replay", again, e)
				}
			}
			run := waitRunWithin(t, f, receipt.RunID, "succeeded", settle)
			select {
			case in := <-resumed:
				if in.Input.RunID != receipt.RunID || in.Decision.EffectID != a.EffectID {
					t.Fatal("resume changed identity", in)
				}
			case <-time.After(time.Second):
				t.Fatal("no Resume consumer")
			}
			want := 0
			if decision == "approve" {
				want = 1
			}
			if f.writer.count() != want {
				t.Fatal("unexpected Host calls", f.writer.count())
			}
			if run.EffectsUnresolved || count(t, d, "SELECT count(*) FROM config_snapshot_pins") != 0 || count(t, d, "SELECT count(*) FROM conversation_sessions WHERE active_run_id IS NOT NULL") != 0 {
				t.Fatal("terminal release", run)
			}
			if count(t, d, "SELECT count(*) FROM execution_continuations WHERE state='completed'") != 1 {
				t.Fatal("continuation not consumed")
			}
		})
	}
}

func TestResumedSameToolCallReturnsOriginalEffectReceipt(t *testing.T) {
	var receiptEffect string
	engine := engine{run: func(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, i)
	}, resume: func(c context.Context, i api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		result, e := i.Input.Tools.Invoke(c, api.ToolCall{ID: "call:first", Name: "note.write", Target: target(), Content: "new"})
		if e != nil {
			return api.EngineResult{}, e
		}
		if result.Status != "completed" || result.EffectID != i.Decision.EffectID || result.Receipt == nil {
			return api.EngineResult{}, api.Invalid("FIXTURE_EFFECT_ID_CHANGED")
		}
		receiptEffect = result.EffectID
		return api.EngineResult{Status: "finished", Text: "reused trusted receipt"}, nil
	}}
	f := open(t, engine, time.Minute)
	run, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	a := waitApproval(t, f)
	_, e = f.core.API.Approvals.Resolve(ctx, owner, api.ApprovalResolve{CommandMeta: meta(t, f.core, "approve", a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: "approve", PreviewHash: a.Preview.PreviewHash})
	if e != nil {
		t.Fatal(e)
	}
	waitRun(t, f, run.RunID, "succeeded")
	if receiptEffect != a.EffectID || f.writer.count() != 1 {
		t.Fatal("resumed effect repeated or changed", receiptEffect, f.writer.count())
	}
}

// All future protocol adapters receive this same pure HUHU tooling surface.
// This proves the shared Broker contract, not a real Provider/SDK integration.
func TestThreeProtocolBindingsShareBrokerAndNewIntentGetsNewEffect(t *testing.T) {
	for _, protocol := range []string{"openai-chat-completions", "openai-responses", "anthropic-messages"} {
		t.Run(protocol, func(t *testing.T) {
			engine := engine{run: func(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
				if in.Agent.Model == nil || in.Agent.Model.Protocol != protocol {
					return api.EngineResult{}, api.Invalid("FIXTURE_PROTOCOL_CHANGED")
				}
				first, e := in.Tools.Invoke(c, api.ToolCall{ID: "call:first", Name: "note.write", Target: target(), Content: "new"})
				if e != nil {
					return api.EngineResult{}, e
				}
				_, e = in.Tools.Invoke(c, api.ToolCall{ID: "call:first", Name: "note.write", Target: target(), Content: "changed"})
				var fault *api.Fault
				if !errors.As(e, &fault) || fault.Kind != "IDEMPOTENCY_CONFLICT" {
					return api.EngineResult{}, api.Invalid("FIXTURE_MUTATED_INTENT_ACCEPTED")
				}
				a, e := in.Checkpoints.Publish(c, bytes.NewBufferString("shared protocol CP"))
				if e != nil {
					return api.EngineResult{}, e
				}
				return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: first.SuspensionToken, Checkpoint: a}}, nil
			}, resume: finished}
			f := open(t, engine, time.Minute)
			_, e := f.core.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, f.core, "model", f.agent.Revision), AgentID: f.agent.ID, Model: api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: protocol, Endpoint: "https://model.invalid", Capabilities: []string{"text"}}})
			if e != nil {
				t.Fatal(e)
			}
			var previous string
			for n, key := range []string{"first-intent", "second-intent"} {
				s, e := f.core.API.Conversation.GetSession(ctx, owner, api.IDQuery{ProfileID: f.command.ProfileID, ID: f.session.ID})
				if e != nil {
					t.Fatal(e)
				}
				command := f.command
				command.CommandMeta = meta(t, f.core, key, s.Revision)
				r, e := f.core.API.Conversation.StartRun(ctx, owner, command)
				if e != nil {
					t.Fatal(e)
				}
				waitRun(t, f, r.RunID, "waiting_approval")
				page, e := f.core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: f.command.ProfileID, Limit: 100})
				if e != nil {
					t.Fatal(e)
				}
				var a api.Approval
				for _, item := range page.Items {
					if item.RunID == r.RunID {
						a = item
					}
				}
				if a.ID == "" || a.EffectID == previous {
					t.Fatal("new intent reused old effect", a)
				}
				previous = a.EffectID
				resolve := api.ApprovalResolve{CommandMeta: meta(t, f.core, key+"-reject", a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: "reject", PreviewHash: a.Preview.PreviewHash}
				if _, e = f.core.API.Approvals.Resolve(ctx, owner, resolve); e != nil {
					t.Fatal(e)
				}
				waitRun(t, f, r.RunID, "succeeded")
				if count(t, db(t, f), "SELECT count(*) FROM execution_effects") != n+1 {
					t.Fatal("unexpected effect identity count")
				}
			}
			if f.writer.count() != 0 {
				t.Fatal("rejected protocol fixture wrote Host")
			}
		})
	}
}

func (host) Read(_ context.Context, q api.HostReadRequest) (api.HostReadResult, error) {
	return api.HostReadResult{Source: q.Source, Text: "SOURCE", Format: "text/markdown"}, nil
}
func (host) Search(context.Context, api.HostSearchRequest) (api.HostSearchResult, error) {
	return api.HostSearchResult{Matches: []api.HostSearchMatch{}}, nil
}
func TestApprovalPaginationContinuesPastRevokedPrefix(t *testing.T) {
	engine := engine{run: func(c context.Context, i api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
		return suspend(c, i)
	}, resume: func(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		return api.EngineResult{Status: "finished"}, nil
	}}
	f := open(t, engine, time.Minute)
	lease, e := f.core.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: "workspace:one", Capabilities: []string{"note.read", "note.write"}}, host{})
	if e != nil {
		t.Fatal(e)
	}
	model := api.ModelBindingDraft{ProviderID: "fixture", ModelID: "model", Protocol: "openai-responses", Endpoint: "https://model.invalid", Capabilities: []string{"text"}}
	a, e := f.core.API.Assistant.BindModel(ctx, owner, api.ModelBind{CommandMeta: meta(t, f.core, "model", f.agent.Revision), AgentID: f.agent.ID, Model: model})
	if e != nil {
		t.Fatal(e)
	}
	grants := map[string]api.Grant{}
	for _, key := range []string{"one", "two", "three", "four"} {
		session, e := f.core.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: meta(t, f.core, "session-"+key, ""), Kind: "direct", MemberIDs: []string{a.ID}, WorkspaceID: "workspace:one"})
		if e != nil {
			t.Fatal(e)
		}
		sum := sha256.Sum256([]byte("SOURCE"))
		source := api.SourceSnapshot{ResourceID: "source:" + key, Kind: "note", WorkspaceID: lease.WorkspaceID, OriginClientID: "client:one", OriginViewID: "view:one", HostConnectionID: lease.HostConnectionID, HostLeaseID: lease.LeaseID, HostLeaseEpoch: lease.LeaseEpoch, Revision: "1", Hash: "sha256:" + hex.EncodeToString(sum[:]), ScopeResourceIDs: []string{}}
		grant, e := f.core.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: meta(t, f.core, "grant-"+key, ""), WorkspaceID: lease.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{{AgentID: a.ID, ModelBindingRevision: a.ModelBindingRevision, ProviderID: model.ProviderID, ModelID: model.ModelID, Protocol: model.Protocol, Endpoint: model.Endpoint}}, Operations: []string{"read", "send"}})
		if e != nil {
			t.Fatal(e)
		}
		run, e := f.core.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: meta(t, f.core, "run-"+key, session.Revision), SessionID: session.ID, Intent: key, SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
		if e != nil {
			t.Fatal(e)
		}
		waitRun(t, f, run.RunID, "waiting_approval")
		grants[run.RunID] = grant
	}
	page, e := f.core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: f.command.ProfileID, Limit: 100})
	if e != nil || len(page.Items) != 4 {
		t.Fatal(page, e)
	}
	wanted := page.Items[3].ID
	for i, a := range page.Items[:3] {
		g := grants[a.RunID]
		_, e = f.core.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: meta(t, f.core, "revoke-"+string(rune('a'+i)), g.Revision), ID: g.ID})
		if e != nil {
			t.Fatal(e)
		}
	}
	cursor := ""
	visible := []api.Approval{}
	for n := 0; n < 8; n++ {
		page, e = f.core.API.Approvals.List(ctx, owner, api.PageQuery{ProfileID: f.command.ProfileID, Limit: 1, Cursor: cursor})
		if e != nil {
			t.Fatal(e)
		}
		visible = append(visible, page.Items...)
		if page.NextCursor == "" {
			break
		}
		if page.NextCursor == cursor {
			t.Fatal("cursor did not advance")
		}
		cursor = page.NextCursor
	}
	if len(visible) != 1 || visible[0].ID != wanted {
		t.Fatalf("readable approval behind revoked prefix became unreachable: %#v", visible)
	}
}

// runStates reads each Run's status and last event through a separate read-only
// handle, so it reports even when the Core's only connection is held.
func (f *fixture) runStates() string {
	db, e := sql.Open("sqlite3", "file:"+filepath.ToSlash(filepath.Join(f.locator, "profile.sqlite3"))+"?mode=ro&_pragma=busy_timeout(500)")
	if e != nil {
		return e.Error()
	}
	defer func() { _ = db.Close() }()
	rows, e := db.Query("SELECT r.run_id, r.status, COALESCE((SELECT event_type FROM execution_events v WHERE v.run_id=r.run_id ORDER BY seq DESC LIMIT 1),'') FROM execution_runs r ORDER BY r.rowid")
	if e != nil {
		return e.Error()
	}
	defer func() { _ = rows.Close() }()
	var out bytes.Buffer
	for rows.Next() {
		var id, status, last string
		if e = rows.Scan(&id, &status, &last); e != nil {
			return e.Error()
		}
		fmt.Fprintf(&out, "%s=%s(last %s) ", id, status, last)
	}
	if e = rows.Err(); e != nil {
		out.WriteString(e.Error())
	}
	return out.String()
}

// projectStacks keeps only goroutines with this module's frames, bounded.
func projectStacks() string {
	buf := make([]byte, 8<<20)
	buf = buf[:runtime.Stack(buf, true)]
	var out bytes.Buffer
	for _, g := range bytes.Split(buf, []byte("\n\n")) {
		if bytes.Contains(g, []byte("obsidian-huhu/native/huhubot/internal")) && out.Len() < 256<<10 {
			out.Write(g)
			out.WriteString("\n\n")
		}
	}
	return out.String()
}
