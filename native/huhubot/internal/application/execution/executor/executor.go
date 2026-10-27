package executor

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"reflect"
	"sync"
	"time"
)

// WorkerCapacity bounds local executor goroutines. Durable child and HTTP
// limits are enforced separately by their policy transactions.
const WorkerCapacity = 16

type UnavailableEngine struct{}

func (UnavailableEngine) Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}
}
func (UnavailableEngine) Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error) {
	return api.EngineResult{}, &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}
}

type Executor struct {
	repo         Repository
	engine       api.Engine
	access       api.ContextAccess
	conversation api.ConversationAPI
	ctx          context.Context
	cancel       context.CancelFunc
	wake         chan struct{}
	slots        chan struct{}
	done         chan struct{}
	drained      chan struct{}
	wg           sync.WaitGroup
	once         sync.Once
	startOnce    sync.Once
	tooling      api.ExecutionTooling
	runningMu    sync.Mutex
	running      map[string]activeRun
}
type activeRun struct {
	claim  string
	cancel context.CancelFunc
}

func New(ctx context.Context, repo Repository, engine api.Engine, access api.ContextAccess, conversation api.ConversationAPI, tooling ...api.ExecutionTooling) (*Executor, error) {
	if e := repo.Recover(ctx); e != nil {
		return nil, e
	}
	if engine == nil {
		engine = UnavailableEngine{}
	}
	run, cancel := context.WithCancel(context.Background())
	var tools api.ExecutionTooling
	if len(tooling) > 0 {
		tools = tooling[0]
	}
	return &Executor{tooling: tools, running: map[string]activeRun{}, repo: repo, engine: engine, access: access, conversation: conversation, ctx: run, cancel: cancel, wake: make(chan struct{}, 1), slots: make(chan struct{}, WorkerCapacity), done: make(chan struct{}), drained: make(chan struct{})}, nil
}
func (e *Executor) Wake() {
	select {
	case e.wake <- struct{}{}:
	default:
	}
}
func (e *Executor) Start() {
	e.startOnce.Do(func() { go func() { e.scan(); e.wg.Wait(); close(e.drained) }() })
}
func (e *Executor) scan() {
	defer close(e.done)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		for e.ctx.Err() == nil {
			select {
			case e.slots <- struct{}{}:
			default:
				goto wait
			}
			work, err := e.repo.Claim(e.ctx)
			if err != nil || work == nil {
				<-e.slots
				break
			}
			e.wg.Add(1)
			go func(w Work) { defer e.wg.Done(); defer func() { <-e.slots; e.Wake() }(); e.execute(w) }(*work)
		}
	wait:
		select {
		case <-e.ctx.Done():
			return
		case <-e.wake:
		case <-ticker.C:
		}
	}
}
func (e *Executor) execute(w Work) {
	ctx, cancel := context.WithTimeout(e.ctx, 2*time.Minute)
	defer cancel()
	defer func() { _ = e.repo.ProducerEnded(context.Background(), w); e.Wake() }()
	e.runningMu.Lock()
	e.running[w.Run.ID] = activeRun{w.ClaimToken, cancel}
	e.runningMu.Unlock()
	defer func() {
		e.runningMu.Lock()
		if current, ok := e.running[w.Run.ID]; ok && current.claim == w.ClaimToken {
			delete(e.running, w.Run.ID)
		}
		e.runningMu.Unlock()
	}()
	fail := func(reason string) {
		if e.ctx.Err() == nil {
			_ = e.repo.Finalize(context.Background(), w, api.EngineResult{Status: "failed", Reason: reason})
		}
	}
	defer func() {
		if recover() != nil {
			fail("ENGINE_PANIC")
		}
	}()
	if w.CompletedResult != nil {
		_ = e.repo.Finalize(context.Background(), w, *w.CompletedResult)
		return
	}
	if e.access == nil && (len(w.Access.Sources)+len(w.Access.Scopes) > 0) {
		fail("ACCESS_NOT_ASSEMBLED")
		return
	}
	if e.access != nil && !w.Maintenance {
		prepared, err := e.access.PrepareContext(ctx, w.Identity, w.Access)
		if err != nil {
			fail("CONTEXT_UNAVAILABLE")
			return
		}
		w.Input.Context = prepared
	}
	var history api.ModelHistory
	var err error
	if w.ContextPolicy == "" && !w.Maintenance && (w.Access.Group != nil || w.Run.ParentRunID == "" && w.Input.Lineage.WorkThreadID == w.Run.SessionID) {
		history, err = e.conversation.ModelHistory(ctx, w.Identity, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: w.Access.ProfileID, Limit: 20}, SessionID: w.Run.SessionID}, w.Access)
		if err != nil {
			fail("HISTORY_UNAVAILABLE")
			return
		}
	}
	w.Input.Lineage.Derived = append(w.Input.Lineage.Derived, history.Derived...)
	if w.UserMessageID != "" {
		h := sha256.Sum256([]byte(w.Input.Intent))
		w.Input.Lineage.Derived = append(w.Input.Lineage.Derived, api.DerivedInput{Kind: "message", ID: w.UserMessageID, Revision: "1", Hash: "sha256:" + hex.EncodeToString(h[:]), Namespace: w.Run.SessionID, WorkThreadID: w.Run.SessionID})
	}
	seenDerived := map[string]api.DerivedInput{}
	uniqueDerived := []api.DerivedInput{}
	for _, ref := range w.Input.Lineage.Derived {
		key := ref.Kind + "\x00" + ref.ID
		if old, found := seenDerived[key]; found {
			if !reflect.DeepEqual(old, ref) {
				fail("RUN_LINEAGE_CONFLICT")
				return
			}
		} else {
			seenDerived[key] = ref
			uniqueDerived = append(uniqueDerived, ref)
		}
	}
	w.Input.Lineage.Derived = uniqueDerived

	for _, m := range history.Messages {
		if m.ID != w.UserMessageID {
			w.Input.History = append(w.Input.History, m)
		}
	}
	sourceSeen := map[string]bool{}
	for _, v := range w.Access.Sources {
		sourceSeen[v.ResourceID+"\x00"+v.Hash+"\x00"+v.HostLeaseID] = true
	}
	for _, v := range history.Sources {
		key := v.ResourceID + "\x00" + v.Hash + "\x00" + v.HostLeaseID
		if !sourceSeen[key] {
			sourceSeen[key] = true
			w.Access.Sources = append(w.Access.Sources, v)
		}
	}
	scopeSeen := map[string]bool{}
	for _, v := range w.Access.Scopes {
		scopeSeen[v.ResourceID+"\x00"+v.Hash+"\x00"+v.HostLeaseID] = true
	}
	for _, v := range history.Scopes {
		key := v.ResourceID + "\x00" + v.Hash + "\x00" + v.HostLeaseID
		if !scopeSeen[key] {
			scopeSeen[key] = true
			w.Access.Scopes = append(w.Access.Scopes, v)
		}
	}
	grantSeen := map[string]bool{}
	for _, v := range w.Access.GrantIDs {
		grantSeen[v] = true
	}
	for _, v := range history.GrantIDs {
		if !grantSeen[v] {
			grantSeen[v] = true
			w.Access.GrantIDs = append(w.Access.GrantIDs, v)
		}
	}
	if e.ctx.Err() != nil {
		return
	}
	if runtime, ok := e.repo.(InitialContextRuntime); ok && (w.ContextPolicy != "" || w.Maintenance) {
		w, err = runtime.PrepareAndMarkRunning(ctx, w)
	} else {
		if w.ContextPolicy != "" || w.Maintenance {
			fail("CONTEXT_NOT_ASSEMBLED")
			return
		}
		if e.access != nil {
			err = e.access.AuthorizeAdmission(ctx, w.Identity, w.Access)
		}
		if err == nil {
			err = e.repo.MarkRunning(ctx, w)
		}
	}
	if err != nil {
		var fault *api.Fault
		if errors.As(err, &fault) && (fault.Kind == "CAPABILITY_DENIED" || fault.Kind == "MODEL_UNAVAILABLE" || fault.Kind == "HOST_UNAVAILABLE" || fault.Kind == "SOURCE_CHANGED") {
			fail("ACCESS_REVOKED")
		} else if fault != nil && (fault.Reason == "CONTEXT_PLAN_CHANGED" || fault.Kind == "CONFLICT" && fault.Reason == "CONTEXT_SNAPSHOT_BUSY") {
			fail(fault.Reason)
		}
		return
	}
	execution := api.ToolExecution{Lineage: w.Input.Lineage, Config: w.Input.Config, Identity: w.Identity, Run: w.Run, Access: w.Access, ClaimToken: w.ClaimToken, Agent: w.Input.Agent}
	var session api.ToolSession
	if e.tooling != nil {
		session, err = e.tooling.Bind(ctx, execution)
		if err != nil {
			fail("TOOL_BINDING_FAILED")
			return
		}
		if session.Close != nil {
			defer session.Close()
		}
		if !w.Maintenance {
			w.Input.Tools = session.Tools
		}
		w.Input.Checkpoints = session.Checkpoints
		w.Input.Attempts = session.Attempts
	}
	sink := func(event api.EngineEvent) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return e.repo.AppendEvent(ctx, w, event)
	}
	var result api.EngineResult
	if w.Continuation != nil {
		if e.tooling == nil || session.Checkpoints == nil || session.Checkpoints.Metadata() != w.Continuation.Checkpoint.Metadata {
			_ = e.repo.Block(context.Background(), w, "CHECKPOINT_INCOMPATIBLE")
			return
		}
		var decision api.ToolResult
		if w.RecoveryDecision != nil {
			decision = *w.RecoveryDecision
		} else if w.Continuation.Kind != "" {
			if w.Continuation.Kind != "children" && w.Continuation.Kind != "question" {
				_ = e.repo.Block(context.Background(), w, "CHECKPOINT_INCOMPATIBLE")
				return
			}
			reader, readErr := session.Checkpoints.Open(ctx, w.Continuation.Checkpoint)
			if readErr != nil {
				_ = e.repo.Block(context.Background(), w, "CHECKPOINT_INVALID")
				return
			}
			_ = reader.Close()
			decision = api.ToolResult{Status: "completed", Children: w.Continuation.Children}
		} else {
			var resumeErr error
			decision, resumeErr = e.tooling.Continue(ctx, execution, *w.Continuation)
			if resumeErr != nil {
				var fault *api.Fault
				if errors.As(resumeErr, &fault) && fault.Kind == "RECOVERY_BLOCKED" {
					_ = e.repo.Block(context.Background(), w, "CHECKPOINT_INVALID")
					return
				}
				fail("CONTINUATION_FAILED")
				return
			}
		}
		if saver, ok := e.repo.(interface {
			SaveResume(context.Context, Work, api.ToolResult) (api.ToolResult, error)
		}); ok {
			if decision, err = saver.SaveResume(ctx, w, decision); err != nil {
				var fault *api.Fault
				if errors.As(err, &fault) {
					if fault.Kind == "CAPABILITY_DENIED" || fault.Kind == "MODEL_UNAVAILABLE" || fault.Kind == "HOST_UNAVAILABLE" || fault.Kind == "SOURCE_CHANGED" || fault.Kind == "NOT_FOUND" && fault.Reason == "GRANT_NOT_FOUND" {
						fail("ACCESS_REVOKED")
					} else if fault.Kind == "INVALID_ARGUMENT" && (fault.Reason == "RESUME_INBOX_INVALID" || fault.Reason == "RESUME_INBOX_CHANGED" || fault.Reason == "RESUME_INBOX_NOT_ASSEMBLED") || fault.Kind == "CONFLICT" && (fault.Reason == "RESUME_INBOX_INVALID" || fault.Reason == "RESUME_INBOX_CHANGED") || fault.Kind == "RESOURCE_LIMIT" && fault.Reason == "RESUME_INBOX_LIMIT" {
						fail(fault.Reason)
					}
				}
				return
			}
		}
		// A continuation reads its original sealed prefix from the checkpoint.
		// Qualified later messages travel only in the persisted decision.
		w.Input.Messages = nil
		result, err = e.engine.Resume(ctx, api.EngineResumeInput{Input: w.Input, CheckpointRef: w.Continuation.Checkpoint.Ref, Checkpoint: w.Continuation.Checkpoint, Decision: decision}, sink)
	} else {
		result, err = e.engine.Run(ctx, w.Input, sink)
	}
	if e.ctx.Err() != nil {
		return
	}
	if err != nil {
		reason := "MODEL_EXECUTION_FAILED"
		if fault, ok := err.(*api.Fault); ok {
			switch fault.Reason {
			case "ADAPTER_NOT_ASSEMBLED", "CREDENTIAL_MISSING", "MODEL_DRAFT_INCOMPLETE", "MEMORY_INPUT_INVALID", "CONTEXT_INPUT_STATE_INVALID", "MEMORY_CANDIDATE_INVALID", "UNSAVED_EDITOR_CHANGES", "SOURCE_CHANGED", "NOTE_TARGET_EXISTS", "NOTE_TARGET_INVALID", "NOTE_BINDING_MISMATCH", "NOTE_PROFILE_MISMATCH", "NOTE_SIZE_LIMIT", "NOTE_WRITE_NOT_ASSEMBLED":
				reason = fault.Reason
			}
		}
		result = api.EngineResult{Status: "failed", Reason: reason, Text: result.Text, Partial: result.Partial, Usage: result.Usage}
	}
	if result.Status == "suspended" {
		if e.tooling == nil || result.Suspension == nil {
			fail("INVALID_ENGINE_SUSPENSION")
			return
		}
		if err = e.tooling.PublishSuspension(ctx, execution, *result.Suspension); err != nil {
			fail("CHECKPOINT_PUBLICATION_FAILED")
		}
		return
	}
	_ = e.repo.Finalize(context.Background(), w, result)
}

// Close requests cancellation and reports a bounded wait. Done closes only
// after every actual worker has ended; a timeout is never a resource release.
func (e *Executor) Stop()                 { e.once.Do(func() { e.cancel(); e.Start() }) }
func (e *Executor) Done() <-chan struct{} { return e.drained }
func (e *Executor) Close() error {
	e.Stop()
	select {
	case <-e.drained:
		return nil
	case <-time.After(3 * time.Second):
		return &api.Fault{Kind: "RECOVERY_BLOCKED", Reason: "EXECUTOR_STOP_TIMEOUT"}
	}
}

// CancelRun only cancels the in-memory worker after its durable barrier commits.
func (e *Executor) CancelRun(run string) {
	e.runningMu.Lock()
	active, ok := e.running[run]
	e.runningMu.Unlock()
	if ok {
		active.cancel()
	}
}
