package common

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"reflect"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

type savedCall struct {
	ID, Wire, Canonical, Arguments string
	Result                         *api.ToolResult
}
type pendingCall struct {
	Kind            string
	Indices         []int
	WaitForIDs      []string
	EffectID, Token string
}

// legacyState is the exact Chat v1 JSON DTO. Never add fields or tags.
type legacyState struct {
	Format, Engine, Protocol                             string
	RunID, SessionID, ConfigID, ConfigDigest, ToolDigest string
	Turns, Next, Initial                                 int
	Text                                                 string
	Messages                                             []*schema.Message
	Batch                                                []savedCall
	Pending                                              *pendingCall
}

type executionState struct {
	legacyState
	protocolState  []byte
	maintenance    bool // trusted input only; never a legacy DTO field
	memoryTargets  []api.MemoryTarget
	presentedInbox presentedInbox // derived from trusted prefix and validated tool messages
}

type protocolStateV2 struct {
	legacyState
	ProtocolState string
}

func (s *executionState) view(intent string) StateView {
	return StateView{Messages: s.Messages, Initial: s.Initial, Turns: s.Turns, Intent: intent}
}

func configDigest(config api.TaskConfigSnapshot) string {
	// Credential availability is live provider metadata, not a pinned model
	// revision. Reopen/lock transitions must not alter the immutable identity.
	if config.Agent.Model != nil {
		model := *config.Agent.Model
		model.CredentialStatus = api.CredentialStatus{}
		config.Agent.Model = &model
	}
	encoded, _ := json.Marshal(config)
	hash := sha256.Sum256(encoded)
	return "sha256:" + hex.EncodeToString(hash[:])
}
func newState(in api.EngineInput, r registry, identity ProtocolIdentity, bound boundInput) *executionState {
	messages := initialMessages(in, bound)
	format := "huhu-model-state-v1"
	if identity.Protocol != ChatProtocol {
		format = "huhu-model-state-v2"
	}
	return &executionState{legacyState: legacyState{Format: format, Engine: identity.EngineVersion, Protocol: in.Agent.Model.Protocol, RunID: in.RunID, SessionID: in.SessionID, ConfigID: in.Config.ID, ConfigDigest: configDigest(in.Config), ToolDigest: r.digest, Messages: messages, Initial: len(messages)}, maintenance: bound.maintenance, memoryTargets: bound.targets}
}

func readState(ctx context.Context, reader io.Reader, run api.Run, config api.TaskConfigSnapshot, intent string, memory *api.ExecutionMemoryInput, shortTerm *api.ShortTermInput, r registry, drivers *Registry) (*executionState, error) {
	if reader == nil || ctx.Err() != nil {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	data, err := io.ReadAll(io.LimitReader(reader, MaxCheckpointBytes+1))
	if err != nil || StrictJSON(data, MaxCheckpointBytes) != nil {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	if config.Agent.Model == nil {
		return nil, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	bound, err := bindInput(run, config, intent, memory, shortTerm)
	if err != nil {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	entry, err := drivers.driverFor(config.Agent.Model.Protocol)
	if err != nil {
		return nil, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	var s executionState
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	format := "huhu-model-state-v1"
	if entry.identity.Protocol == ChatProtocol {
		if d.Decode(&s.legacyState) != nil {
			return nil, Fault("CHECKPOINT_INVALID")
		}
	} else {
		format = "huhu-model-state-v2"
		var v2 protocolStateV2
		if d.Decode(&v2) != nil || v2.ProtocolState == "" {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		s.legacyState, s.protocolState = v2.legacyState, []byte(v2.ProtocolState)
	}
	if s.Format != format || s.Engine != entry.identity.EngineVersion || s.Protocol != config.Agent.Model.Protocol || s.RunID != run.ID || s.SessionID != run.SessionID || s.ConfigID != config.ID || s.ConfigDigest != configDigest(config) || s.ToolDigest != r.digest || s.Turns < 1 || s.Turns > MaxTurns || len(s.Text) > MaxTextBytes || len(s.Messages) == 0 || len(s.Messages) > 2048 || len(s.Batch) == 0 || len(s.Batch) > MaxToolCalls || s.Pending == nil || s.Next < 0 || s.Next > len(s.Batch) {
		return nil, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	if err := s.validateTranscript(config, intent, r); err != nil {
		return nil, err
	}
	if err := s.validateBoundPrefix(config, intent, bound); err != nil {
		return nil, err
	}
	s.maintenance = bound.maintenance
	s.memoryTargets = bound.targets
	seen := map[string]bool{}
	for i, c := range s.Batch {
		call, err := r.decode(c.Wire, c.ID, c.Arguments)
		if err != nil || call.Name != c.Canonical || seen[c.ID] || (i < s.Next && c.Result == nil) || (i >= s.Next && c.Result != nil) {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		seen[c.ID] = true
	}
	p := s.Pending
	if len(p.Indices) == 0 || len(p.Indices) > MaxToolCalls {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	indices := map[int]bool{}
	for _, i := range p.Indices {
		if i < 0 || i >= len(s.Batch) || indices[i] {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		indices[i] = true
	}
	switch p.Kind {
	case "approval":
		if len(p.Indices) != 1 || p.Indices[0] != s.Next || p.EffectID == "" || p.Token == "" || len(p.WaitForIDs) != 0 || s.Batch[s.Next].Canonical != "note.write" {
			return nil, Fault("CHECKPOINT_INVALID")
		}
	case "children", "question":
		if s.Next != len(s.Batch) || len(p.Indices) != len(p.WaitForIDs) || p.EffectID != "" || p.Token != "" {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		ids := map[string]bool{}
		for j, i := range p.Indices {
			result := s.Batch[i].Result
			if result == nil || p.WaitForIDs[j] == "" || ids[p.WaitForIDs[j]] {
				return nil, Fault("CHECKPOINT_INVALID")
			}
			ids[p.WaitForIDs[j]] = true
			if p.Kind == "children" && (result.Delegation == nil || result.Status != "accepted" || result.Delegation.ChildRunID != p.WaitForIDs[j]) {
				return nil, Fault("CHECKPOINT_INVALID")
			}
			if p.Kind == "question" && (result.Message == nil || result.Status != "delivered" || result.Message.Kind != "question" || result.Message.ID != p.WaitForIDs[j]) {
				return nil, Fault("CHECKPOINT_INVALID")
			}
		}
	default:
		return nil, Fault("CHECKPOINT_INVALID")
	}
	var assistant *schema.Message
	counts := map[string]int{}
	for _, message := range s.Messages {
		if message == nil {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		switch message.Role {
		case schema.System, schema.User, schema.Assistant, schema.Tool:
		default:
			return nil, Fault("CHECKPOINT_INVALID")
		}
		if message.Role == schema.Assistant && len(message.ToolCalls) > 0 {
			assistant = message
		}
		if message.Role == schema.Tool && seen[message.ToolCallID] {
			counts[message.ToolCallID]++
			for _, c := range s.Batch {
				if c.ID == message.ToolCallID && c.Result != nil {
					want, e := toolMessage(c.ID, c.Wire, *c.Result)
					if e != nil || !reflect.DeepEqual(want, message) {
						return nil, Fault("CHECKPOINT_INVALID")
					}
				}
			}
		}
	}
	if assistant == nil || len(assistant.ToolCalls) != len(s.Batch) {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	for i, c := range s.Batch {
		original := assistant.ToolCalls[i]
		if original.ID != c.ID || original.Function.Name != c.Wire || original.Function.Arguments != c.Arguments {
			return nil, Fault("CHECKPOINT_INVALID")
		}
		want := 0
		if c.Result != nil {
			want = 1
		}
		if counts[c.ID] != want {
			return nil, Fault("CHECKPOINT_INVALID")
		}
	}
	if err := entry.driver.ValidateState(ctx, s.view(intent), s.protocolState); err != nil {
		return nil, Fault("CHECKPOINT_INVALID")
	}
	if err := s.readPresentedInbox(shortTerm, intent); err != nil {
		return nil, err
	}
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	return &s, nil
}

func (s *executionState) validateBoundPrefix(config api.TaskConfigSnapshot, intent string, bound boundInput) error {
	index := s.Initial - 1 // Intent is independently checked by validateTranscript.
	for _, content := range []string{bound.memory, bound.shortTerm} {
		if content == "" {
			continue
		}
		index--
		if index < 0 || !reflect.DeepEqual(s.Messages[index], schema.UserMessage(content)) {
			return Fault("CHECKPOINT_INVALID")
		}
	}
	if bound.maintenance {
		want := []*schema.Message{}
		if config.Agent.Persona != "" {
			want = append(want, schema.SystemMessage(config.Agent.Persona))
		}
		want = bound.appendMessages(want)
		want = append(want, schema.UserMessage(intent))
		if !reflect.DeepEqual(s.Messages[:s.Initial], want) {
			return Fault("CHECKPOINT_INVALID")
		}
	}
	return nil
}

// A pending CP is a complete program position: initial filtered input is a
// fixed prefix, then only assistant batches and their ordered tool results.
// An outer hash cannot make a dangling result or injected later user valid.
func (s *executionState) validateTranscript(config api.TaskConfigSnapshot, intent string, r registry) error {
	if s.Initial < 1 || s.Initial >= len(s.Messages) {
		return Fault("CHECKPOINT_INVALID")
	}
	seen := map[string]bool{}
	pending := []schema.ToolCall{}
	text := ""
	turns := 0
	for i, m := range s.Messages {
		if m == nil || !utf8.ValidString(m.Content) {
			return Fault("CHECKPOINT_INVALID")
		}
		if i < s.Initial {
			if len(m.ToolCalls) > 0 || m.ToolCallID != "" || (m.Role != schema.System && m.Role != schema.User && m.Role != schema.Assistant) {
				return Fault("CHECKPOINT_INVALID")
			}
			if m.Role == schema.System && (i != 0 || m.Content != config.Agent.Persona) {
				return Fault("CHECKPOINT_INVALID")
			}
			continue
		}
		switch m.Role {
		case schema.Assistant:
			if len(pending) > 0 || len(m.ToolCalls) == 0 || len(m.ToolCalls) > MaxToolCalls {
				return Fault("CHECKPOINT_INVALID")
			}
			turns++
			text += m.Content
			for j, c := range m.ToolCalls {
				if c.Index == nil || *c.Index != j || seen[c.ID] {
					return Fault("CHECKPOINT_INVALID")
				}
				if _, err := r.decode(c.Function.Name, c.ID, c.Function.Arguments); err != nil {
					return Fault("CHECKPOINT_INVALID")
				}
				seen[c.ID] = true
			}
			pending = append(pending, m.ToolCalls...)
		case schema.Tool:
			if len(pending) == 0 || m.ToolCallID != pending[0].ID || m.ToolName != pending[0].Function.Name || len(m.ToolCalls) > 0 || StrictJSON([]byte(m.Content), MaxResultBytes) != nil {
				return Fault("CHECKPOINT_INVALID")
			}
			pending = pending[1:]
		default:
			return Fault("CHECKPOINT_INVALID")
		}
	}
	if config.Agent.Persona != "" && (s.Messages[0].Role != schema.System || s.Messages[0].Content != config.Agent.Persona) {
		return Fault("CHECKPOINT_INVALID")
	}
	// Intent comes from the accepted Run, independently of this artifact. The
	// filtered historical prefix has no independent frozen-body baseline here.
	if s.Messages[s.Initial-1].Role != schema.User || s.Messages[s.Initial-1].Content != intent || turns != s.Turns || text != s.Text || len(pending) != len(s.Batch)-s.Next {
		return Fault("CHECKPOINT_INVALID")
	}
	for i, c := range pending {
		if c.ID != s.Batch[s.Next+i].ID {
			return Fault("CHECKPOINT_INVALID")
		}
	}
	return nil
}

func (e *Engine) InspectCheckpoint(ctx context.Context, q api.CheckpointInspection) error {
	if q.Config.Agent.Model == nil {
		return Fault("CHECKPOINT_INCOMPATIBLE")
	}
	identity, err := e.driver.Identity(q.Config.Agent.Model.Protocol)
	if err != nil || q.Checkpoint.RunID != q.Run.ID || q.Checkpoint.Metadata.EngineVersion != identity.EngineVersion || q.Checkpoint.Metadata.FormatVersion != "1" {
		return Fault("CHECKPOINT_INCOMPATIBLE")
	}
	bound, err := bindInput(q.Run, q.Config, q.Intent, q.Memory, q.ShortTerm)
	if err != nil {
		return Fault("CHECKPOINT_INVALID")
	}
	r, err := executionTools(q.Config.Agent.AllowedTools, identity, bound)
	if err != nil {
		return Fault("CHECKPOINT_INCOMPATIBLE")
	}
	s, err := readState(ctx, q.Reader, q.Run, q.Config, q.Intent, q.Memory, q.ShortTerm, r, e.driver)
	if err != nil {
		return err
	}

	position := q.Position
	if position.Continuation == nil {
		return Fault("CHECKPOINT_INVALID")
	}
	if s.Pending.Kind == "approval" {
		if position.Continuation.Kind != "" || position.Continuation.EffectID != s.Pending.EffectID {
			return Fault("CHECKPOINT_INVALID")
		}
	} else if position.Continuation.Kind != s.Pending.Kind {
		return Fault("CHECKPOINT_INVALID")
	}
	if position.Phase == "resume" {
		if position.Decision == nil {
			return Fault("CHECKPOINT_INVALID")
		}
		return s.applyDecision(*position.Decision)
	}
	return nil
}

func (s *executionState) applyDecision(decision api.ToolResult) error {
	p := s.Pending
	if p == nil {
		return Fault("CHECKPOINT_INVALID")
	}
	packet, err := s.filterResumeInbox(decision)
	if err != nil {
		return err
	}
	decision.ResumeInbox = packet
	if p.Kind == "approval" {
		if decision.EffectID != p.EffectID || (decision.Status != "completed" && decision.Status != "denied") {
			return Fault("EFFECT_RECONCILIATION_REQUIRED")
		}
		i := p.Indices[0]
		message, err := toolMessage(s.Batch[i].ID, s.Batch[i].Wire, decision)
		if err != nil {
			return err
		}
		s.Batch[i].Result = &decision
		s.Messages = append(s.Messages, message)
		s.Next = i + 1
	} else {
		if decision.Status != "completed" || len(decision.Children) != len(p.WaitForIDs) {
			return Fault("CHECKPOINT_INVALID")
		}
		for j, index := range p.Indices {
			var child api.TaskOutcome
			if p.Kind == "question" {
				child = decision.Children[j]
			} else {
				found := 0
				for _, c := range decision.Children {
					if c.RunID == p.WaitForIDs[j] {
						child = c
						found++
					}
				}
				if found != 1 {
					return Fault("CHECKPOINT_INVALID")
				}
			}
			result := api.ToolResult{Status: "completed", Children: []api.TaskOutcome{child}}
			if j == 0 {
				result.ResumeInbox = packet
			}
			message, err := toolMessage(s.Batch[index].ID, s.Batch[index].Wire, result)
			if err != nil {
				return err
			}
			s.Batch[index].Result = &result
			for i, m := range s.Messages {
				if m.Role == schema.Tool && m.ToolCallID == s.Batch[index].ID {
					s.Messages[i] = message
				}
			}
		}
	}
	s.Pending = nil
	return nil
}

func (s *executionState) waitGroup() *pendingCall {
	for _, kind := range []string{"children", "question"} {
		p := &pendingCall{Kind: kind}
		for i, c := range s.Batch {
			if c.Result == nil {
				continue
			}
			id := ""
			if kind == "children" && c.Result.Status == "accepted" && c.Result.Delegation != nil {
				id = c.Result.Delegation.ChildRunID
			}
			if kind == "question" && c.Result.Status == "delivered" && c.Result.Message != nil && c.Result.Message.Kind == "question" {
				id = c.Result.Message.ID
			}
			if id != "" {
				p.Indices = append(p.Indices, i)
				p.WaitForIDs = append(p.WaitForIDs, id)
			}
		}
		if len(p.Indices) > 0 {
			return p
		}
	}
	return nil
}

func (s *executionState) suspend(ctx context.Context, in api.EngineInput) (api.EngineResult, error) {
	if in.Checkpoints == nil || s.Pending == nil {
		return api.EngineResult{}, Fault("CHECKPOINT_NOT_ASSEMBLED")
	}
	var data []byte
	var err error
	if s.Protocol == ChatProtocol {
		data, err = json.Marshal(s.legacyState)
	} else {
		if len(s.protocolState) == 0 {
			return api.EngineResult{}, Fault("CHECKPOINT_INVALID")
		}
		data, err = json.Marshal(protocolStateV2{legacyState: s.legacyState, ProtocolState: string(s.protocolState)})
	}
	if err != nil || len(data) > MaxCheckpointBytes {
		return api.EngineResult{}, Fault("CHECKPOINT_SIZE_LIMIT")
	}
	artifact, err := in.Checkpoints.Publish(ctx, bytes.NewReader(data))
	if err != nil {
		return api.EngineResult{}, Fault("CHECKPOINT_PUBLICATION_FAILED")
	}
	if artifact.Ref == "" || artifact.RunID != in.RunID || artifact.Metadata.EngineVersion != s.Engine {
		return api.EngineResult{}, Fault("CHECKPOINT_INCOMPATIBLE")
	}
	suspension := &api.EngineSuspension{Token: s.Pending.Token, Checkpoint: artifact}
	if s.Pending.Kind != "approval" {
		suspension.Kind = s.Pending.Kind
		suspension.WaitForIDs = append([]string(nil), s.Pending.WaitForIDs...)
	}
	return api.EngineResult{Status: "suspended", Text: s.Text, CheckpointRef: artifact.Ref, Suspension: suspension}, nil
}
