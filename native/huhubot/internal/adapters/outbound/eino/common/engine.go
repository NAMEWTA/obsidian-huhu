// Package common keeps the bounded model/tool loop behind HUHU's Engine port.
package common

import (
	"context"
	"encoding/json"
	"reflect"
	"strconv"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

const (
	EngineVersion      = "huhu-eino-0.9.22-chat-bridge-v1"
	ChatProtocol       = "openai-chat-completions"
	MaxOutputTokens    = 4096
	MaxTurns           = 20
	MaxRequestBytes    = 1 << 20
	MaxResponseBytes   = 4 << 20
	MaxLineBytes       = 256 << 10
	MaxEventBytes      = 512 << 10
	MaxToolCalls       = 32
	MaxArgumentBytes   = 128 << 10
	MaxResultBytes     = 256 << 10
	MaxTextBytes       = 128 << 10
	MaxCheckpointBytes = 1 << 20
	RequestTimeout     = 45 * time.Second
	IdleTimeout        = 15 * time.Second
	CleanupTimeout     = 3 * time.Second
)

// CredentialResolver is Profile-bound by bootstrap. The caller clears its copy;
// the adapter cannot register/delete credentials or select another Profile.
type CredentialResolver func(context.Context, string) ([]byte, api.CredentialStatus, error)

type Engine struct {
	driver   *Registry
	resolve  CredentialResolver
	mu       sync.Mutex
	stopping bool
	next     uint64
	active   map[uint64]context.CancelFunc
	wg       sync.WaitGroup
	done     chan struct{}
}

// NewEngine consumes a successful immutable Registry and a Profile resolver.
// Stop closes admission; Done includes driver/Probe and settlement drain. Close
// only releases idle transport resources after Done, never replacing that wait.
func NewEngine(driver *Registry, resolve CredentialResolver) *Engine {
	return &Engine{driver: driver, resolve: resolve, active: map[uint64]context.CancelFunc{}, done: make(chan struct{})}
}

func Fault(reason string) error { return &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: reason} }

func (e *Engine) begin(parent context.Context) (context.Context, func(), error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.stopping {
		return nil, nil, api.Denied("SERVICE_STOPPING")
	}
	ctx, cancel := context.WithTimeout(parent, 2*time.Minute)
	e.next++
	id := e.next
	e.active[id] = cancel
	e.wg.Add(1)
	return ctx, func() { cancel(); e.mu.Lock(); delete(e.active, id); e.mu.Unlock(); e.wg.Done() }, nil
}

func (e *Engine) Stop() {
	e.mu.Lock()
	if e.stopping {
		e.mu.Unlock()
		return
	}
	e.stopping = true
	for _, cancel := range e.active {
		cancel()
	}
	e.driver.Stop()
	e.mu.Unlock()
	go func() { e.wg.Wait(); <-e.driver.Done(); close(e.done) }()
}
func (e *Engine) Done() <-chan struct{} { return e.done }
func (e *Engine) Close() error {
	select {
	case <-e.done:
		return e.driver.Close()
	default:
		return Fault("MODEL_PRODUCER_NOT_ENDED")
	}
}

func validInput(in api.EngineInput) bool {
	if in.Delegation != nil && (!api.ValidDelegationInput(*in.Delegation) || in.Delegation.DelegationID != in.Lineage.DelegationID) {
		return false
	}
	if in.Lineage.DelegationID != "" && in.Delegation == nil {
		return false
	}
	return in.RunID != "" && in.Config.ID != "" && in.Config.ID == in.Lineage.ConfigSnapshotID && in.Config.SubjectID == in.Agent.ID && reflect.DeepEqual(in.Agent, in.Config.Agent) && in.Attempts != nil
}

func initialMessages(in api.EngineInput, bound boundInput) []*schema.Message {
	out := []*schema.Message{}
	if in.Agent.Persona != "" {
		out = append(out, schema.SystemMessage(in.Agent.Persona))
	}
	for _, h := range in.History {
		if h.Role == "user" {
			out = append(out, schema.UserMessage(h.Text))
		} else if h.Role == "assistant" {
			out = append(out, schema.AssistantMessage(h.Text, nil))
		}
	}
	for _, s := range in.Context.Sources {
		out = append(out, schema.UserMessage("Attached source:\n"+s.Text))
	}
	for _, m := range in.Messages {
		if m.Text == in.Intent {
			m.Text = ""
		} // the accepted current task is appended once below.
		message, _ := json.Marshal(m)
		out = append(out, schema.UserMessage("Explicit task message (data):\n"+string(message)))
	}
	if in.Delegation != nil {
		// Task is already the current Intent. Requirements and durable reply
		// identity are separate, so that task text is still sent exactly once.
		requirements, _ := json.Marshal(struct {
			DelegationID   string   `json:"delegationId"`
			Constraints    []string `json:"constraints"`
			ExpectedOutput string   `json:"expectedOutput"`
		}{in.Delegation.DelegationID, in.Delegation.Constraints, in.Delegation.ExpectedOutput})
		out = append(out, schema.UserMessage("Accepted task requirements (data):\n"+string(requirements)))
	}
	out = bound.appendMessages(out)
	out = append(out, schema.UserMessage(in.Intent))
	return out
}

func (e *Engine) Run(parent context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	ctx, done, err := e.begin(parent)
	if err != nil {
		return api.EngineResult{}, err
	}
	defer done()
	if !validInput(in) {
		return api.EngineResult{}, Fault("ENGINE_INPUT_INVALID")
	}
	if in.Agent.Model == nil {
		return api.EngineResult{}, Fault("MODEL_DRAFT_INCOMPLETE")
	}
	if !e.driver.SupportsProtocol(in.Agent.Model.Protocol) {
		return api.EngineResult{}, Fault("ADAPTER_NOT_ASSEMBLED")
	}
	bound, err := prepareInput(in)
	if err != nil {
		return api.EngineResult{}, err
	}
	id, _ := e.driver.Identity(in.Agent.Model.Protocol)
	r, err := executionTools(in.Agent.AllowedTools, id, bound)
	if err != nil {
		return api.EngineResult{}, Fault("MODEL_TOOL_SCHEMA_INVALID")
	}
	return e.runState(ctx, in, r, newState(in, r, id, bound), sink)
}

func (e *Engine) Resume(parent context.Context, resume api.EngineResumeInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	ctx, done, err := e.begin(parent)
	if err != nil {
		return api.EngineResult{}, err
	}
	defer done()
	in := resume.Input
	if !validInput(in) || in.Agent.Model == nil || in.Checkpoints == nil || !e.driver.SupportsProtocol(in.Agent.Model.Protocol) || resume.CheckpointRef != resume.Checkpoint.Ref {
		return api.EngineResult{}, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	bound, err := prepareInput(in)
	if err != nil {
		return api.EngineResult{}, Fault("CHECKPOINT_INVALID")
	}
	id, _ := e.driver.Identity(in.Agent.Model.Protocol)
	r, err := executionTools(in.Agent.AllowedTools, id, bound)
	if err != nil {
		return api.EngineResult{}, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	reader, err := in.Checkpoints.Open(ctx, resume.Checkpoint)
	if err != nil {
		return api.EngineResult{}, Fault("CHECKPOINT_INVALID")
	}
	s, readErr := readState(ctx, reader, api.Run{ID: in.RunID, SessionID: in.SessionID}, in.Config, in.Intent, in.Memory, in.ShortTerm, r, e.driver)
	closeErr := reader.Close()
	if readErr != nil || closeErr != nil {
		return api.EngineResult{}, Fault("CHECKPOINT_INVALID")
	}
	if err = s.applyDecision(resume.Decision); err != nil {
		return failState(s, err)
	}
	return e.runState(ctx, in, r, s, sink)
}

func (e *Engine) runState(ctx context.Context, in api.EngineInput, r registry, s *executionState, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	entry, err := e.driver.driverFor(in.Agent.Model.Protocol)
	if err != nil {
		return failState(s, err)
	}
	for {
		if err := entry.driver.ValidateState(ctx, s.view(in.Intent), s.protocolState); err != nil {
			return failState(s, err)
		}
		if ctx.Err() != nil {
			return failState(s, Fault("MODEL_CANCELED"))
		}
		for s.Next < len(s.Batch) {
			if in.Tools == nil {
				return failState(s, Fault("TOOL_NOT_ASSEMBLED"))
			}
			c := &s.Batch[s.Next]
			call, err := r.decode(c.Wire, c.ID, c.Arguments)
			if err != nil {
				return failState(s, err)
			}
			result, err := in.Tools.Invoke(ctx, call)
			if err != nil {
				return failState(s, err)
			}
			if result.Status == "approval_required" {
				if c.Canonical != "note.write" || result.EffectID == "" || result.SuspensionToken == "" {
					return failState(s, Fault("TOOL_RESULT_INVALID"))
				}
				s.Pending = &pendingCall{Kind: "approval", Indices: []int{s.Next}, EffectID: result.EffectID, Token: result.SuspensionToken}
				return s.suspend(ctx, in)
			}
			if result.Status == "unknown_outcome" {
				return failState(s, Fault("EFFECT_RECONCILIATION_REQUIRED"))
			}
			message, err := toolMessage(c.ID, c.Wire, result)
			if err != nil {
				return failState(s, err)
			}
			c.Result = &result
			s.Messages = append(s.Messages, message)
			s.Next++
		}
		if len(s.Batch) > 0 {
			if wait := s.waitGroup(); wait != nil {
				s.Pending = wait
				return s.suspend(ctx, in)
			}
			s.Batch = nil
			s.Next = 0
		}
		if s.Turns >= MaxTurns {
			return failState(s, Fault("MODEL_TURN_LIMIT"))
		}
		if e.resolve == nil {
			return failState(s, Fault("CREDENTIAL_MISSING"))
		}
		secret, status, err := e.resolve(ctx, in.Agent.Model.CredentialRef)
		if err != nil || status.State != "available" || len(secret) == 0 {
			clear(secret)
			return failState(s, Fault("CREDENTIAL_MISSING"))
		}
		// Maintenance output stays in this private turn buffer. In particular,
		// failState, CPs and user event sinks never receive candidate JSON.
		turnText := ""
		generation := Generation{Model: in.Agent.Model.ModelBindingDraft, View: s.view(in.Intent), Tools: r.infos, PriorState: append([]byte(nil), s.protocolState...), Credential: secret, Attempts: in.Attempts, LogicalCallID: "turn:" + strconv.Itoa(s.Turns+1), EmitText: func(delta string) error {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			if s.maintenance {
				if !utf8.ValidString(delta) || len(turnText)+len(delta) > MaxTextBytes {
					return Fault("MEMORY_CANDIDATE_INVALID")
				}
				turnText += delta
				return nil
			}
			if !utf8.ValidString(delta) || len(s.Text)+len(delta) > MaxTextBytes {
				return Fault("MODEL_TEXT_LIMIT")
			}
			turnText += delta
			s.Text += delta
			for sink != nil && delta != "" {
				n := len(delta)
				if n > 65536 {
					n = 65536
					for n > 0 && !utf8.RuneStart(delta[n]) {
						n--
					}
				}
				if err := sink(api.EngineEvent{Type: "text.delta", Text: delta[:n]}); err != nil {
					return err
				}
				delta = delta[n:]
			}
			return nil
		}}
		turn, err := entry.driver.Generate(ctx, generation)
		clear(secret)
		if err != nil {
			return failState(s, err)
		}
		message := turn.Message
		if len(turn.ProtocolState) > MaxCheckpointBytes {
			return failState(s, Fault("CHECKPOINT_SIZE_LIMIT"))
		}
		if message == nil || message.Role != schema.Assistant || message.ToolCallID != "" || message.ToolName != "" || !utf8.ValidString(message.Content) || message.Content != turnText || !utf8.Valid(turn.ProtocolState) {
			return failState(s, Fault("MODEL_STREAM_INVALID"))
		}
		if s.maintenance && len(message.ToolCalls) != 0 {
			return failState(s, Fault("MEMORY_CANDIDATE_INVALID"))
		}
		if len(message.ToolCalls) > MaxToolCalls {
			return failState(s, Fault("TOOL_BATCH_LIMIT"))
		}
		seen := map[string]bool{}
		for _, m := range s.Messages {
			for _, c := range m.ToolCalls {
				seen[c.ID] = true
			}
		}
		batch := make([]savedCall, 0, len(message.ToolCalls))
		// Validate the complete batch before the first broker invocation.
		for i, c := range message.ToolCalls {
			if c.Index == nil || *c.Index != i || c.Type != "function" {
				return failState(s, Fault("TOOL_CALL_ID_INVALID"))
			}
			call, err := r.decode(c.Function.Name, c.ID, c.Function.Arguments)
			if err != nil {
				return failState(s, err)
			}
			if seen[c.ID] {
				return failState(s, Fault("TOOL_CALL_ID_INVALID"))
			}
			seen[c.ID] = true
			batch = append(batch, savedCall{ID: c.ID, Wire: c.Function.Name, Canonical: call.Name, Arguments: c.Function.Arguments})
		}
		candidate := append(append([]*schema.Message(nil), s.Messages...), message)
		state := append([]byte(nil), turn.ProtocolState...)
		if err := entry.driver.ValidateState(ctx, StateView{Messages: candidate, Initial: s.Initial, Turns: s.Turns + 1, Intent: in.Intent}, state); err != nil {
			return failState(s, err)
		}
		s.Messages, s.protocolState = candidate, state
		s.Turns++
		if len(message.ToolCalls) == 0 {
			if s.maintenance {
				candidates, err := parseMemoryCandidates([]byte(turnText), s.memoryTargets)
				if err != nil {
					return failState(s, err)
				}
				return api.EngineResult{Status: "finished", MemoryCandidates: candidates}, nil
			}
			return api.EngineResult{Status: "finished", Text: s.Text}, nil
		}
		s.Batch = batch
		s.Next = 0
	}
}

// Only fixed adapter faults or explicitly enumerated application admission
// reasons reach public Run state. SDK/provider error strings never do.
func failState(s *executionState, err error) (api.EngineResult, error) {
	r := api.EngineResult{Text: s.Text, Partial: s.Text != ""}
	if s.maintenance {
		r.Text, r.Partial = "", false
	}
	if f, ok := err.(*api.Fault); ok && SafeReason(f.Reason) {
		r.Status = "failed"
		r.Reason = f.Reason
		return r, nil
	}
	return r, err
}

func SafeReason(reason string) bool {
	switch reason {
	case "BUDGET_NOT_CONFIGURED", "PROFILE_BUDGET_NOT_CONFIGURED", "BUDGET_PAUSED", "MODEL_BUDGET_EXHAUSTED", "MODEL_ATTEMPT_NOT_ACTIVE", "EFFECT_ADMISSION_CLOSED", "RECIPIENT_CHANGED", "RECIPIENT_NOT_CONFIGURED", "RUN_CONFIG_NOT_PINNED", "TASK_ADMISSION_CLOSED", "ACCESS_NOT_ASSEMBLED", "SERVICE_STOPPING", "GRANT_REVOKED", "GRANT_EXPIRED", "GRANT_NOT_FOUND", "GRANT_STATE_INVALID", "GRANT_SUBJECT_MISMATCH", "OPERATION_NOT_GRANTED", "RECIPIENT_NOT_GRANTED", "SESSION_SCOPE_MISMATCH", "SOURCE_NOT_GRANTED", "TASK_SCOPE_MISMATCH", "WORKSPACE_MISMATCH", "GROUP_MEMBER_REMOVED", "GROUP_MEMBER_GENERATION_CHANGED", "REQUEST_ALREADY_CANCELED", "CREDENTIAL_MISSING",
		"MODEL_STREAM_FAILED", "MODEL_STREAM_INCOMPLETE", "MODEL_STREAM_INVALID", "MODEL_CANCELED", "MODEL_SETTLEMENT_FAILED", "MODEL_OUTPUT_TRUNCATED", "MODEL_CONTENT_FILTERED", "MODEL_FINISH_UNKNOWN", "MODEL_REFUSED", "MODEL_TEXT_LIMIT", "MODEL_TURN_LIMIT", "MODEL_RESPONSE_LIMIT", "MODEL_LINE_LIMIT", "MODEL_EVENT_LIMIT", "MODEL_CHOICE_INVALID", "MODEL_CONFIG_INVALID", "MODEL_TOOL_SCHEMA_INVALID", "MODEL_REQUEST_LIMIT", "MODEL_REQUEST_INVALID", "MODEL_DESTINATION_CHANGED", "MODEL_HIDDEN_RETRY",
		"TOOL_NOT_ASSEMBLED", "TOOL_NOT_SUPPORTED", "TOOL_ARGUMENT_INVALID", "TOOL_BATCH_LIMIT", "TOOL_CALL_ID_INVALID", "TOOL_RESULT_INVALID", "TOOL_RESULT_LIMIT", "EFFECT_RECONCILIATION_REQUIRED", "CHECKPOINT_INVALID", "CHECKPOINT_INCOMPATIBLE", "CHECKPOINT_NOT_ASSEMBLED", "CHECKPOINT_SIZE_LIMIT", "CHECKPOINT_PUBLICATION_FAILED":
		return true
	case "MEMORY_CANDIDATE_INVALID", "MEMORY_INPUT_INVALID", "CONTEXT_INPUT_STATE_INVALID":
		return true
	}
	return false
}

var _ api.Engine = (*Engine)(nil)
var _ api.EngineCheckpointInspector = (*Engine)(nil)
