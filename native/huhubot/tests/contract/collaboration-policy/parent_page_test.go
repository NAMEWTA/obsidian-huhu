package collaborationpolicy_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	brokerapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type parentPageHost struct{}

func (parentPageHost) Invoke(context.Context, api.HostInvokeCommand) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("DIAGNOSIS_NO_HOST_WRITE")
}
func (parentPageHost) QueryReceipt(context.Context, api.HostReceiptQuery) (api.HostReceipt, error) {
	return api.HostReceipt{}, api.Denied("DIAGNOSIS_NO_HOST_QUERY")
}

type parentPageWriter struct {
	host  api.HostAPI
	calls atomic.Int32
}

func (w *parentPageWriter) Preview(c context.Context, target api.EffectTarget, text string) (api.NoteTargetPreview, error) {
	lease, e := w.host.CurrentLease(c)
	if e != nil {
		return api.NoteTargetPreview{}, e
	}
	h := sha256.Sum256([]byte(text))
	return api.NoteTargetPreview{Target: target, Tool: brokerapp.Descriptor, Diff: "diagnostic proposal", ContentHash: "sha256:" + hex.EncodeToString(h[:]), Lease: lease}, nil
}
func (*parentPageWriter) Check(context.Context, api.ApprovalPreview, api.HostLease) error {
	return nil
}
func (w *parentPageWriter) Invoke(context.Context, api.EffectDispatch) (api.HostReceipt, error) {
	w.calls.Add(1)
	return api.HostReceipt{}, api.Denied("DIAGNOSIS_UNEXPECTED_DISPATCH")
}

// All Run, parent-result and approval facts below are produced through public
// APIs, the same Executor and real complete checkpoint publication. SQL only
// observes those facts. No Run or parent state is injected.
func TestWaitingParentBeyondOnePageReclaimsReadyResultAndRevisitsEarlierWaiters(t *testing.T) {
	const rootsN = 128
	const workspace = "workspace:parent-page"
	limits := api.ExecutionLimits{MaxDepth: 3, MaxChildren: 32, RootChildren: 4, ProfileChildren: 8, MaxWakes: 8}
	c, root, loc := parentPageFresh(t, bootstrap.Options{ExecutorPaused: true, ExecutionLimits: limits})
	leafAgent, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "create-leaf", ""), Draft: api.AgentDraft{Name: "diagnostic approval leaf", Persona: "controlled", AllowedTools: []string{"note.write"}, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
	if e != nil {
		t.Fatal(e)
	}
	b := parentPageAgent(t, c, "diagnostic nested parent", []string{leafAgent.ID})
	a := parentPageAgent(t, c, "diagnostic root", []string{b.ID, leafAgent.ID})
	roots := make([]string, 0, rootsN)
	for n := 0; n < rootsN; n++ {
		intent := fmt.Sprintf("front-root-%03d", n)
		if n == rootsN-1 {
			intent = "target-root"
		}
		roots = append(roots, run(t, c, a, intent).RunID)
	}
	d := parentPageDB(t, loc)
	if parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE status='accepted'") != rootsN || parentPageCount(t, d, "SELECT count(*) FROM execution_runs") != rootsN {
		t.Fatal("not exactly 128 publicly admitted roots before descendants")
	}
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	<-c.Done()
	t.Logf("PREPARED paused public roots=%d; no queue override, root/profile slots=4/8, depth=3, cumulative children=32", rootsN)

	w := &parentPageWriter{}
	startGate := make(chan struct{})
	var startOnce sync.Once
	targetParent := make(chan string, 1)
	targetLeaf := make(chan string, 1)
	errors := make(chan error, 300)
	var runCalls, resumeCalls atomic.Int32
	eng := parentPageEngine{run: func(cc context.Context, in api.EngineInput) (out api.EngineResult, err error) {
		runCalls.Add(1)
		defer func() {
			if err != nil {
				select {
				case errors <- fmt.Errorf("%s: %w", in.Intent, err):
				default:
				}
			}
		}()
		select {
		case <-startGate:
		case <-cc.Done():
			return api.EngineResult{}, cc.Err()
		}
		delegate := func(target, task string) (api.Delegation, error) {
			v, e := in.Tools.Invoke(cc, api.ToolCall{ID: "delegate-unique-child", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: target}, Task: task, Constraints: []string{}}})
			if e != nil {
				return api.Delegation{}, e
			}
			if v.Delegation == nil {
				return api.Delegation{}, fmt.Errorf("missing actual delegation")
			}
			return *v.Delegation, nil
		}
		switch {
		case strings.HasPrefix(in.Intent, "front-root-"):
			_, err = delegate(leafAgent.ID, "approval-leaf")
			return api.EngineResult{Status: "finished", Text: "FRONT_RESULT"}, err
		case in.Intent == "target-root":
			var v api.Delegation
			v, err = delegate(b.ID, "target-parent")
			if err == nil {
				targetParent <- v.ChildRunID
			}
			return api.EngineResult{Status: "finished", Text: "TARGET_ROOT_RESULT"}, err
		case in.Intent == "target-parent":
			var v api.Delegation
			v, err = delegate(leafAgent.ID, "target-approval-leaf")
			if err == nil {
				targetLeaf <- v.ChildRunID
			}
			return api.EngineResult{Status: "finished", Text: "TARGET_PARENT_RESULT"}, err
		case in.Intent == "approval-leaf" || in.Intent == "target-approval-leaf":
			v, e := in.Tools.Invoke(cc, api.ToolCall{ID: "pending-note", Name: "note.write", Target: api.EffectTarget{WorkspaceID: workspace, ResourceID: "note:" + in.RunID, Operation: "update", BaseRevision: "1"}, Content: "diagnostic proposal"})
			if e != nil {
				return api.EngineResult{}, e
			}
			if v.Status != "approval_required" {
				return api.EngineResult{}, fmt.Errorf("expected real approval, got %s", v.Status)
			}
			cp, e := in.Checkpoints.Publish(cc, strings.NewReader("parent-page complete controlled checkpoint"))
			if e != nil {
				return api.EngineResult{}, e
			}
			return api.EngineResult{Status: "suspended", Suspension: &api.EngineSuspension{Token: v.SuspensionToken, Checkpoint: cp}}, nil
		default:
			return api.EngineResult{}, fmt.Errorf("unexpected Engine input %q", in.Intent)
		}
	}, resume: func(context.Context, api.EngineResumeInput) (api.EngineResult, error) {
		resumeCalls.Add(1)
		return api.EngineResult{}, fmt.Errorf("no approval was resolved; Resume is unexpected")
	}}
	c = parentPageOpen(t, root, loc, bootstrap.Options{Engine: eng, NoteWriter: w, ApprovalLifetime: time.Hour, ExecutionLimits: limits})
	t.Cleanup(func() { startOnce.Do(func() { close(startGate) }) })
	w.host = c.API.Host
	if _, e = c.API.Host.Attach(ctx, owner, api.HostAttachCommand{WorkspaceID: workspace, Capabilities: []string{"note.write"}}, parentPageHost{}); e != nil {
		t.Fatal(e)
	}
	// This batch builds 128 real checkpoints; its setup budget is shared across
	// all readiness phases, independently of the result/rewind assertions below.
	setupCtx, setupCancel := context.WithTimeout(ctx, 90*time.Second)
	defer setupCancel()
	startOnce.Do(func() { close(startGate) })

	var parentID, leafID string
	select {
	case parentID = <-targetParent:
	case <-setupCtx.Done():
		t.Fatal("target parent was not publicly delegated")
	}
	select {
	case leafID = <-targetLeaf:
	case <-setupCtx.Done():
		t.Fatal("target leaf was not publicly delegated")
	}
	for {
		select {
		case err := <-errors:
			t.Fatalf("construction failed: %v", err)
		default:
		}
		parents := parentPageCount(t, d, "SELECT count(*) FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.state='waiting' AND r.status='waiting_children'")
		pending := parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE status='waiting_approval'")
		slots := parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0")
		if parents == 129 && pending == 128 && slots == 0 {
			break
		}
		if setupCtx.Err() != nil {
			t.Fatalf("preconditions not reached: parents=%d pending=%d slots=%d calls=%d", parents, pending, slots, runCalls.Load())
		}
		time.Sleep(25 * time.Millisecond)
	}
	if parentPageCount(t, d, "SELECT count(*) FROM execution_runs") != 257 || runCalls.Load() != 257 || resumeCalls.Load() != 0 || w.calls.Load() != 0 || parentPageCount(t, d, "SELECT count(*) FROM access_approvals WHERE status='pending'") != 128 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE status IN('accepted','preparing','running')") != 0 {
		t.Fatal("construction bypassed real lifecycle or unexpectedly dispatched/resumed")
	}
	var rank int
	if e = d.QueryRow("SELECT count(*) FROM collaboration_parent_results p JOIN execution_runs r ON r.run_id=p.run_id WHERE p.state='waiting' AND r.status='waiting_children' AND (r.created_at<(SELECT created_at FROM execution_runs WHERE run_id=?) OR (r.created_at=(SELECT created_at FROM execution_runs WHERE run_id=?) AND r.run_id<=?))", parentID, parentID, parentID).Scan(&rank); e != nil {
		t.Fatal(e)
	}
	if rank != 129 {
		t.Fatalf("target must be exactly beyond first parent page, rank=%d", rank)
	}
	var soonest string
	if e = d.QueryRow("SELECT min(expires_at) FROM access_approvals WHERE status='pending'").Scan(&soonest); e != nil {
		t.Fatal(e)
	}
	expires, e := time.Parse(time.RFC3339Nano, soonest)
	if e != nil || time.Until(expires) < 30*time.Minute {
		t.Fatalf("approval lifetime could contaminate observation: %s %v", soonest, e)
	}
	t.Logf("ACTUAL READY-TO-TRIGGER: Run257/Engine257; waiting parents129; pending approval128; child slots0; target rank129; earliest approval=%s; targetRoot=%s targetParent=%s targetLeaf=%s", soonest, roots[127], parentID, leafID)

	cancelPublic := func(runID, key string) {
		r := parentPageGet(t, c, runID)
		if _, e := c.API.Approvals.Cancel(ctx, owner, api.RunCancel{CommandMeta: meta(t, c, key, r.Revision), ID: runID}); e != nil {
			t.Fatal(e)
		}
	}
	cancelPublic(leafID, "cancel-only-target-leaf")
	if r := parentPageGet(t, c, leafID); r.Status != "canceled" {
		t.Fatalf("target leaf not actually canceled: %#v", r)
	}
	if parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE parent_run_id=? AND status NOT IN('succeeded','failed','canceled')", parentID) != 0 || parentPageCount(t, d, "SELECT count(*) FROM collaboration_result_deliveries WHERE child_run_id=? AND parent_run_id=? AND status='canceled' AND text=''", leafID, parentID) != 1 {
		t.Fatal("target parent lacks actual body-free terminal child result")
	}
	parentResult := wait(t, c, parentID, "succeeded")
	wait(t, c, roots[127], "succeeded")
	var raw string
	if e = d.QueryRow("SELECT result_json FROM collaboration_parent_results WHERE run_id=? AND state='claimed'", parentID).Scan(&raw); e != nil {
		t.Fatal(e)
	}
	var original api.EngineResult
	if e = json.Unmarshal([]byte(raw), &original); e != nil || original.Text != "TARGET_PARENT_RESULT" {
		t.Fatalf("original application result changed: %s %v", raw, e)
	}
	if parentResult.Reason != "CHILD_PARTIAL_FAILURE" || parentPageCount(t, d, "SELECT count(*) FROM collaboration_result_deliveries WHERE child_run_id=? AND parent_run_id=? AND status='succeeded' AND partial=1 AND text='TARGET_PARENT_RESULT'", parentID, roots[127]) != 1 || parentPageCount(t, d, "SELECT count(*) FROM execution_events WHERE run_id=? AND event_type='delegation.completed'", roots[127]) != 1 {
		t.Fatal("control lost structured partial outcome or duplicated result")
	}
	if parentPageCount(t, d, "SELECT count(*) FROM task_config_pins WHERE run_id IN(?,?)", parentID, leafID) != 0 {
		t.Fatal("terminal target kept its task config pin")
	}
	if runCalls.Load() != 257 || resumeCalls.Load() != 0 || w.calls.Load() != 0 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || parentPageCount(t, d, "SELECT count(*) FROM access_approvals WHERE status='expired'") != 0 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE status='waiting_approval'") != 127 {
		t.Fatal("control used an extra model/expiry or failed terminal slot cleanup")
	}
	t.Logf("READY BEYOND FIRST PAGE: only target leaf canceled; original target parent/root succeeded; Engine257 unchanged, Resume0, Invoke0, unique partial result; remaining pending127; slots0; original result/Run identity preserved")

	if parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE parent_run_id='' AND status='waiting_children'") != 127 {
		t.Fatal("fairness completed or canceled unrelated front roots")
	}
	// A later pass must wrap back to an earlier key when its real child becomes
	// terminal; scan progress is not a permanent exclusion or cached permission.
	var firstLeaf string
	if e = d.QueryRow("SELECT run_id FROM execution_runs WHERE parent_run_id=?", roots[0]).Scan(&firstLeaf); e != nil {
		t.Fatal(e)
	}
	cancelPublic(firstLeaf, "cancel-earliest-leaf-after-wrap")
	wait(t, c, roots[0], "succeeded")
	if runCalls.Load() != 257 || resumeCalls.Load() != 0 || w.calls.Load() != 0 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE status='waiting_approval'") != 126 || parentPageCount(t, d, "SELECT count(*) FROM collaboration_result_deliveries WHERE child_run_id=? AND status='canceled' AND text=''", firstLeaf) != 1 {
		t.Fatal("rewind lost original result/slot or executed a waiting approval")
	}
	t.Log("REWIND: earlier parent also completed after only its original leaf was canceled; no extra Engine/Invoke")
	if e = c.Close(); e != nil {
		t.Fatal(e)
	}
	<-c.Done()
	t.Log("FINAL CLEANUP: all actual Engine producers returned, Core.Close/Done complete; no unresolved dispatch")
}

func TestClosedRecoveryParentDoesNotHideLaterNewReadyParent(t *testing.T) {
	var leafAgentID string
	delegated := make(chan string, 1)
	entered := make(chan struct{}, 1)
	first := parentPageEngine{run: func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		if in.Intent == "interrupted-leaf" {
			entered <- struct{}{}
			<-c.Done()
			return api.EngineResult{}, c.Err()
		}
		if in.Intent != "closed-parent" {
			return api.EngineResult{}, fmt.Errorf("unexpected original input %s", in.Intent)
		}
		v, e := in.Tools.Invoke(c, api.ToolCall{ID: "delegate-before-interruption", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: leafAgentID}, Task: "interrupted-leaf", Constraints: []string{}}})
		if e != nil {
			return api.EngineResult{}, e
		}
		delegated <- v.Delegation.ChildRunID
		return api.EngineResult{Status: "finished", Text: "ORIGINAL_CLOSED_PARENT"}, nil
	}}
	c, root, loc := parentPageFresh(t, bootstrap.Options{Engine: first})
	leaf := parentPageAgent(t, c, "recovery leaf", nil)
	leafAgentID = leaf.ID
	parent := parentPageAgent(t, c, "recovery parent", []string{leaf.ID})
	old := run(t, c, parent, "closed-parent")
	var childID string
	select {
	case childID = <-delegated:
	case <-time.After(5 * time.Second):
		t.Fatal("original child was not publicly delegated")
	}
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("original child never actually ran")
	}
	wait(t, c, old.RunID, "waiting_children")
	if e := c.Close(); e != nil {
		t.Fatal(e)
	}
	<-c.Done()
	c = parentPageOpen(t, root, loc, bootstrap.Options{ExecutorPaused: true})
	child := parentPageGet(t, c, childID)
	if child.Status != "interrupted" {
		t.Fatalf("not a real interrupted tree: %#v", child)
	}
	if _, e := c.API.Approvals.Cancel(ctx, owner, api.RunCancel{CommandMeta: meta(t, c, "cancel-original-interrupted-leaf", child.Revision), ID: childID}); e != nil {
		t.Fatal(e)
	}
	status, e := c.API.Recovery.Get(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "inspect-closed", "").ProfileID, ID: old.RunID})
	if e != nil || status.State == "none" || status.State == "resuming" {
		t.Fatalf("tree was not durably recovery fenced: %#v %v", status, e)
	}
	if e := c.Close(); e != nil {
		t.Fatal(e)
	}
	<-c.Done()
	var callbacks atomic.Int32
	newLeafRelease := make(chan struct{})
	var releaseOnce sync.Once
	healthy := parentPageEngine{run: func(c context.Context, in api.EngineInput) (api.EngineResult, error) {
		callbacks.Add(1)
		if in.Intent == "new-leaf" {
			select {
			case <-newLeafRelease:
			case <-c.Done():
				return api.EngineResult{}, c.Err()
			}
			return api.EngineResult{Status: "finished", Text: "NEW_LEAF"}, nil
		}
		if in.Intent != "new-parent" {
			return api.EngineResult{}, fmt.Errorf("recovery-fenced old work executed: %s", in.Intent)
		}
		if _, e := in.Tools.Invoke(c, api.ToolCall{ID: "new-delegation", Name: "agents.delegate", Delegate: &api.DelegateCommand{Target: api.DelegationTarget{Kind: "existing", AgentID: leafAgentID}, Task: "new-leaf", Constraints: []string{}}}); e != nil {
			return api.EngineResult{}, e
		}
		return api.EngineResult{Status: "finished", Text: "NEW_PARENT"}, nil
	}}
	c = parentPageOpen(t, root, loc, bootstrap.Options{Engine: healthy})
	t.Cleanup(func() { releaseOnce.Do(func() { close(newLeafRelease) }) })
	current := run(t, c, parent, "new-parent")
	wait(t, c, current.RunID, "waiting_children")
	releaseOnce.Do(func() { close(newLeafRelease) })
	wait(t, c, current.RunID, "succeeded")
	d := parentPageDB(t, loc)
	if parentPageGet(t, c, old.RunID).Status != "waiting_children" || callbacks.Load() != 2 || parentPageCount(t, d, "SELECT count(*) FROM collaboration_parent_results WHERE run_id=? AND state='waiting'", old.RunID) != 1 || parentPageCount(t, d, "SELECT count(*) FROM execution_runs WHERE child_slot<>0") != 0 {
		t.Fatal("new ready parent hid or reopened a recovery-fenced original result")
	}
	if parentPageCount(t, d, "SELECT count(*) FROM collaboration_result_deliveries WHERE child_run_id=? AND parent_run_id=? AND status='canceled' AND text=''", childID, old.RunID) != 1 {
		t.Fatal("original canceled result identity was changed or consumed twice")
	}
	t.Log("same Executor left the ready old parent fenced and completed a newly admitted parent with its original result")
}

type parentPageEngine struct {
	run    func(context.Context, api.EngineInput) (api.EngineResult, error)
	resume func(context.Context, api.EngineResumeInput) (api.EngineResult, error)
}

func (e parentPageEngine) Run(c context.Context, in api.EngineInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	return e.run(c, in)
}
func (e parentPageEngine) Resume(c context.Context, in api.EngineResumeInput, _ func(api.EngineEvent) error) (api.EngineResult, error) {
	if e.resume == nil {
		return api.EngineResult{}, fmt.Errorf("unexpected Engine.Resume")
	}
	return e.resume(c, in)
}
func parentPageOpen(t *testing.T, root, loc string, o bootstrap.Options) *bootstrap.Core {
	t.Helper()
	c, e := bootstrap.OpenWithOptions(ctx, root, loc, o)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := c.Close(); e != nil {
			t.Error(e)
		}
		<-c.Done()
	})
	return c
}
func parentPageFresh(t *testing.T, o bootstrap.Options) (*bootstrap.Core, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if e := os.Mkdir(root, 0700); e != nil {
		t.Fatal(e)
	}
	loc := filepath.Join(root, "one")
	return parentPageOpen(t, root, loc, o), root, loc
}
func parentPageAgent(t *testing.T, c *bootstrap.Core, name string, targets []string) api.Agent {
	t.Helper()
	a, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, api.NewID("agent:"), ""), Draft: api.AgentDraft{Name: name, Persona: "controlled", AllowedTools: []string{"agents.delegate"}, AllowedCollaborationTargets: targets, Model: &api.ModelBindingDraft{ModelID: "fake", ProviderID: "controlled", Protocol: "openai-chat-completions", Endpoint: "http://127.0.0.1:1", Capabilities: []string{"text"}}}})
	if e != nil {
		t.Fatal(e)
	}
	return a
}
func parentPageDB(t *testing.T, loc string) *sql.DB {
	t.Helper()
	d, e := sql.Open("sqlite3", filepath.Join(loc, "profile.sqlite3"))
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := d.Close(); e != nil {
			t.Error(e)
		}
	})
	return d
}
func parentPageCount(t *testing.T, d *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if e := d.QueryRow(q, args...).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}
func parentPageGet(t *testing.T, c *bootstrap.Core, id string) api.Run {
	t.Helper()
	r, e := c.API.Conversation.GetRun(ctx, owner, api.IDQuery{ProfileID: meta(t, c, "query", "").ProfileID, ID: id})
	if e != nil {
		t.Fatal(e)
	}
	return r
}
